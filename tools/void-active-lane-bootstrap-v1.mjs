#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, isAbsolute, relative, resolve } from "node:path";

export const BOOTSTRAP_MARKER = "VOID_ACTIVE_LANE_BOOTSTRAP_V1";
export const REGISTRY_MARKER =
  "VOID_ACTIVE_LANE_COORDINATION_REGISTRY_V1";

function fail(message, exitCode = 1) {
  const error = new Error(message);
  error.exitCode = exitCode;
  throw error;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    fail(`${command} failed to start: ${result.error.message}`);
  }
  if (options.check !== false && result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    fail(
      `${command} ${args.join(" ")} failed (${result.status}): ${detail}`,
    );
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function git(repoRoot, args, options = {}) {
  return run("git", ["-C", repoRoot, ...args], options);
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Value(value) {
  return createHash("sha256").update(value).digest("hex");
}

function refExists(repoRoot, ref) {
  return git(
    repoRoot,
    ["show-ref", "--verify", "--quiet", ref],
    { check: false },
  ).status === 0;
}

function liveRemoteBranch(repoRoot, branch) {
  const result = git(
    repoRoot,
    ["ls-remote", "--heads", "origin", `refs/heads/${branch}`],
    { check: false },
  );
  if (result.status !== 0) {
    fail(
      `unable to inspect live origin branch: ${
        (result.stderr || result.stdout).trim()
      }`,
    );
  }
  const lines = result.stdout.split("\n").filter(Boolean);
  if (lines.length === 0) return null;
  if (lines.length !== 1) {
    fail(`unexpected live origin branch record count: ${lines.length}`);
  }
  const [sha, ref] = lines[0].split("\t");
  if (
    !/^[0-9a-f]{40}$/.test(sha)
    || ref !== `refs/heads/${branch}`
  ) {
    fail("malformed live origin branch record");
  }
  return sha;
}

function liveOriginMain(repoRoot) {
  const result = git(
    repoRoot,
    ["ls-remote", "--heads", "origin", "refs/heads/main"],
    { check: false },
  );
  if (result.status !== 0) {
    fail(
      `unable to inspect live origin/main: ${
        (result.stderr || result.stdout).trim()
      }`,
    );
  }
  const lines = result.stdout.split("\n").filter(Boolean);
  if (lines.length !== 1) {
    fail(`live origin/main record count mismatch: ${lines.length}`);
  }
  const [sha, ref] = lines[0].split("\t");
  if (!/^[0-9a-f]{40}$/.test(sha) || ref !== "refs/heads/main") {
    fail("malformed live origin/main record");
  }
  return sha;
}

function currentMainState(repoRoot) {
  return {
    branch: git(repoRoot, ["branch", "--show-current"]).stdout.trim(),
    head: git(repoRoot, ["rev-parse", "HEAD"]).stdout.trim(),
    origin_main: git(
      repoRoot,
      ["rev-parse", "origin/main"],
    ).stdout.trim(),
    status: git(
      repoRoot,
      ["status", "--porcelain=v1", "--untracked-files=all"],
    ).stdout,
  };
}

function policyRepository(repoRoot) {
  const policyPath = resolve(
    repoRoot,
    "ops/coordination/active-lane-reservations-v1.json",
  );
  if (!existsSync(policyPath)) return null;
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  return typeof policy.github_repository === "string"
    ? policy.github_repository
    : null;
}

function openPrsForBranch(repoRoot, branch, requireGithub) {
  const githubRepository = policyRepository(repoRoot);
  if (!githubRepository) {
    if (requireGithub) {
      fail("reservation policy GitHub repository is unavailable");
    }
    return [];
  }
  const result = run(
    "gh",
    [
      "pr", "list",
      "--repo", githubRepository,
      "--state", "open",
      "--head", branch,
      "--limit", "100",
      "--json", "number,state,headRefName,headRefOid,title",
    ],
    { check: false },
  );
  if (result.status !== 0) {
    if (requireGithub) {
      fail(
        `GitHub PR metadata unavailable: ${
          (result.stderr || result.stdout).trim()
        }`,
      );
    }
    return [];
  }
  const value = JSON.parse(result.stdout);
  if (!Array.isArray(value)) {
    fail("malformed GitHub open PR response");
  }
  return value;
}

export function confirmationToken(branch) {
  return `CREATE_VOID_LANE:${branch}`;
}

export function parseArgs(argv) {
  if (argv.length === 0 || argv.includes("--help")) {
    return { help: true };
  }
  const command = argv[0];
  const values = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      fail(`unexpected argument: ${token}`);
    }
    const key = token.slice(2).replaceAll("-", "_");
    const following = argv[index + 1];
    if (following === undefined || following.startsWith("--")) {
      values[key] = true;
    } else {
      values[key] = following;
      index += 1;
    }
  }
  return { command, ...values };
}

export function validateCandidate({
  repoRoot,
  branch,
  worktreePath,
}) {
  if (typeof repoRoot !== "string" || !repoRoot) {
    fail("canonical repository path missing");
  }
  const resolvedRepo = realpathSync(repoRoot);
  if (typeof branch !== "string" || !branch) {
    fail("candidate branch missing");
  }
  const branchCheck = git(
    resolvedRepo,
    ["check-ref-format", "--branch", branch],
    { check: false },
  );
  if (branchCheck.status !== 0) {
    fail("candidate branch is not a valid Git branch");
  }
  if (branch === "main") fail("candidate branch main is forbidden");
  if (typeof worktreePath !== "string" || !worktreePath) {
    fail("candidate worktree path missing");
  }
  if (!isAbsolute(worktreePath)) {
    fail("candidate worktree path must be absolute");
  }
  const resolvedWorktree = resolve(worktreePath);
  const fromRepo = relative(resolvedRepo, resolvedWorktree);
  if (
    fromRepo === ""
    || (!fromRepo.startsWith("..") && !isAbsolute(fromRepo))
  ) {
    fail("candidate worktree must be outside the canonical repository");
  }
  return {
    repo_root: resolvedRepo,
    branch,
    worktree: resolvedWorktree,
  };
}

function defaultRegistryCheck({
  repoRoot,
  branch,
  worktreePath,
  outputPath,
  requireGithub,
}) {
  const registryTool = resolve(
    repoRoot,
    "tools/void-active-lane-registry-v1.mjs",
  );
  const policyPath = resolve(
    repoRoot,
    "ops/coordination/active-lane-reservations-v1.json",
  );
  if (!existsSync(registryTool)) {
    fail(`registry tool missing: ${registryTool}`);
  }
  if (!existsSync(policyPath)) {
    fail(`reservation policy missing: ${policyPath}`);
  }

  const args = [
    registryTool,
    "check",
    "--repo-root", repoRoot,
    "--policy", policyPath,
    "--candidate-branch", branch,
    "--candidate-worktree", worktreePath,
    "--output", outputPath,
  ];
  if (requireGithub) args.push("--require-github");

  const result = run("node", args, { check: false });
  if (![0, 2].includes(result.status)) {
    fail(
      `registry check failed (${result.status}): ${
        (result.stderr || result.stdout).trim()
      }`,
    );
  }
  const registry = JSON.parse(readFileSync(outputPath, "utf8"));
  if (registry.marker !== REGISTRY_MARKER) {
    fail("registry result marker mismatch");
  }
  return registry;
}

function assertRegistryDecision(registry, branch, worktreePath) {
  if (!registry || typeof registry !== "object") {
    fail("registry result must be an object");
  }
  const candidate = registry.candidate;
  if (!candidate || typeof candidate !== "object") {
    fail("registry result candidate missing");
  }
  if (candidate.branch !== branch) {
    fail("registry candidate branch mismatch");
  }
  if (candidate.worktree_path !== resolve(worktreePath)) {
    fail("registry candidate worktree mismatch");
  }
  if (candidate.collision_free !== true) {
    const reasons = Array.isArray(candidate.reasons)
      ? candidate.reasons.join(",")
      : "unknown";
    fail(`candidate collision: ${reasons}`, 2);
  }
}

function writeOutput(outputPath, value) {
  const resolved = resolve(outputPath);
  mkdirSync(dirname(resolved), {
    recursive: true,
    mode: 0o700,
  });
  writeFileSync(
    resolved,
    `${JSON.stringify(canonicalize(value), null, 2)}\n`,
    { mode: 0o600 },
  );
  return resolved;
}

function registryDigest(registryOutput, registry) {
  if (existsSync(registryOutput)) {
    return sha256Value(readFileSync(registryOutput));
  }
  return sha256Value(canonicalJson(registry));
}

export function planBootstrap({
  repoRoot,
  branch,
  worktreePath,
  outputPath,
  requireGithub,
  registryCheck = defaultRegistryCheck,
  openPrCheck = openPrsForBranch,
}) {
  const candidate = validateCandidate({
    repoRoot,
    branch,
    worktreePath,
  });
  const liveMain = liveOriginMain(candidate.repo_root);
  const registryOutput = `${resolve(outputPath)}.registry.json`;
  const registry = registryCheck({
    repoRoot: candidate.repo_root,
    branch,
    worktreePath: candidate.worktree,
    outputPath: registryOutput,
    requireGithub,
  });
  assertRegistryDecision(registry, branch, candidate.worktree);

  if (liveRemoteBranch(candidate.repo_root, branch) !== null) {
    fail("live origin branch exists", 2);
  }
  const openPrs = openPrCheck(
    candidate.repo_root,
    branch,
    requireGithub,
  );
  if (openPrs.length > 0) {
    fail(`open PR exists:#${openPrs[0].number}`, 2);
  }
  if (refExists(candidate.repo_root, `refs/heads/${branch}`)) {
    fail("local branch exists", 2);
  }
  if (existsSync(candidate.worktree)) {
    fail("worktree path exists", 2);
  }

  const plan = canonicalize({
    marker: BOOTSTRAP_MARKER,
    version: 1,
    command: "plan",
    generated_at_utc: new Date().toISOString(),
    repo_root: candidate.repo_root,
    branch,
    worktree: candidate.worktree,
    live_origin_main: liveMain,
    registry_result_sha256: registryDigest(
      registryOutput,
      registry,
    ),
    collision_free: true,
    reasons: [],
    confirmation_required: confirmationToken(branch),
    mutation_performed: false,
  });
  writeOutput(outputPath, plan);
  return plan;
}

export function applyBootstrap({
  repoRoot,
  branch,
  worktreePath,
  outputPath,
  confirmation,
  requireGithub,
  registryCheck = defaultRegistryCheck,
  openPrCheck = openPrsForBranch,
  postCreateHook = null,
}) {
  const candidate = validateCandidate({
    repoRoot,
    branch,
    worktreePath,
  });
  if (confirmation !== confirmationToken(branch)) {
    fail(
      `explicit confirmation required: ${confirmationToken(branch)}`,
    );
  }

  const before = currentMainState(candidate.repo_root);
  if (before.branch !== "main") {
    fail("canonical repository is not on main");
  }
  if (before.status.length > 0) {
    fail("canonical main worktree is dirty");
  }

  git(
    candidate.repo_root,
    [
      "fetch",
      "origin",
      "+refs/heads/main:refs/remotes/origin/main",
    ],
  );
  const fetched = currentMainState(candidate.repo_root);
  const baseCommit = fetched.origin_main;
  const liveMain = liveOriginMain(candidate.repo_root);
  if (baseCommit !== liveMain) {
    fail(
      `fetched origin/main is not live: fetched=${baseCommit} live=${liveMain}`,
    );
  }

  const registryOutput = `${resolve(outputPath)}.registry.json`;
  const registry = registryCheck({
    repoRoot: candidate.repo_root,
    branch,
    worktreePath: candidate.worktree,
    outputPath: registryOutput,
    requireGithub,
  });
  assertRegistryDecision(registry, branch, candidate.worktree);

  if (refExists(candidate.repo_root, `refs/heads/${branch}`)) {
    fail("local branch appeared after registry check", 2);
  }
  if (liveRemoteBranch(candidate.repo_root, branch) !== null) {
    fail("origin branch appeared after registry check", 2);
  }
  if (existsSync(candidate.worktree)) {
    fail("worktree path appeared after registry check", 2);
  }
  const openPrs = openPrCheck(
    candidate.repo_root,
    branch,
    requireGithub,
  );
  if (openPrs.length > 0) {
    fail(`open PR appeared:#${openPrs[0].number}`, 2);
  }

  let created = false;
  try {
    git(
      candidate.repo_root,
      [
        "worktree",
        "add",
        "-b",
        branch,
        candidate.worktree,
        "origin/main",
      ],
    );
    created = true;

    const worktreeBranch = git(
      candidate.worktree,
      ["branch", "--show-current"],
    ).stdout.trim();
    const worktreeHead = git(
      candidate.worktree,
      ["rev-parse", "HEAD"],
    ).stdout.trim();
    const worktreeStatus = git(
      candidate.worktree,
      ["status", "--porcelain=v1", "--untracked-files=all"],
    ).stdout;
    const localHead = git(
      candidate.repo_root,
      ["rev-parse", `refs/heads/${branch}`],
    ).stdout.trim();
    const afterMain = currentMainState(candidate.repo_root);

    if (worktreeBranch !== branch) {
      fail("created worktree branch mismatch");
    }
    if (worktreeHead !== baseCommit) {
      fail("created worktree head mismatch");
    }
    if (localHead !== baseCommit) {
      fail("created local branch head mismatch");
    }
    if (worktreeStatus.length > 0) {
      fail("created worktree is dirty");
    }
    if (afterMain.head !== before.head) {
      fail("canonical main HEAD changed during bootstrap");
    }
    if (afterMain.status.length > 0) {
      fail("canonical main became dirty during bootstrap");
    }
    if (liveRemoteBranch(candidate.repo_root, branch) !== null) {
      fail("origin branch was unexpectedly created");
    }

    if (typeof postCreateHook === "function") {
      postCreateHook({
        repoRoot: candidate.repo_root,
        branch,
        worktreePath: candidate.worktree,
        baseCommit,
      });
    }

    const receipt = canonicalize({
      marker: BOOTSTRAP_MARKER,
      version: 1,
      command: "apply",
      generated_at_utc: new Date().toISOString(),
      repo_root: candidate.repo_root,
      branch,
      worktree: candidate.worktree,
      base_commit: baseCommit,
      live_origin_main: liveMain,
      registry_result_sha256: registryDigest(
        registryOutput,
        registry,
      ),
      applied: true,
      worktree_created: true,
      local_branch_created: true,
      remote_branch_created: false,
      commit_created: false,
      push_performed: false,
      pull_request_created: false,
      canonical_main_modified: false,
      runtime_modified: false,
      service_restarted: false,
      deployment_performed: false,
      token_bytes_read: false,
    });
    writeOutput(outputPath, receipt);
    return receipt;
  } catch (error) {
    const rollbackErrors = [];
    if (created) {
      const worktreeRemoval = git(
        candidate.repo_root,
        ["worktree", "remove", "--force", candidate.worktree],
        { check: false },
      );
      if (worktreeRemoval.status !== 0) {
        rollbackErrors.push(
          `worktree_remove:${
            (worktreeRemoval.stderr || worktreeRemoval.stdout).trim()
          }`,
        );
      }
      if (refExists(candidate.repo_root, `refs/heads/${branch}`)) {
        const branchRemoval = git(
          candidate.repo_root,
          ["branch", "-D", branch],
          { check: false },
        );
        if (branchRemoval.status !== 0) {
          rollbackErrors.push(
            `branch_delete:${
              (branchRemoval.stderr || branchRemoval.stdout).trim()
            }`,
          );
        }
      }
    }
    if (rollbackErrors.length > 0) {
      fail(
        `bootstrap failed and rollback was incomplete: ${
          error.message
        }; ${rollbackErrors.join("|")}`,
      );
    }
    fail(
      `bootstrap failed; created lane was rolled back: ${
        error.message
      }`,
      error.exitCode ?? 1,
    );
  }
}

function usage() {
  console.log([
    "VOID active-lane bootstrap V1",
    "",
    "Plan:",
    "  node tools/void-active-lane-bootstrap-v1.mjs plan \\",
    "    --repo-root \"$HOME/dev/void-node\" \\",
    "    --branch feat/example-v1 \\",
    "    --worktree \"$HOME/dev/void-node-example-v1\" \\",
    "    --output \"$HOME/Downloads/void-example-plan.json\" \\",
    "    --require-github",
    "",
    "Apply:",
    "  node tools/void-active-lane-bootstrap-v1.mjs apply \\",
    "    --repo-root \"$HOME/dev/void-node\" \\",
    "    --branch feat/example-v1 \\",
    "    --worktree \"$HOME/dev/void-node-example-v1\" \\",
    "    --output \"$HOME/Downloads/void-example-receipt.json\" \\",
    "    --confirm \"CREATE_VOID_LANE:feat/example-v1\" \\",
    "    --require-github",
  ].join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!["plan", "apply"].includes(args.command)) {
    fail("command must be plan or apply");
  }
  if (!args.repo_root) fail("--repo-root is required");
  if (!args.branch) fail("--branch is required");
  if (!args.worktree) fail("--worktree is required");
  if (!args.output) fail("--output is required");

  const common = {
    repoRoot: args.repo_root,
    branch: args.branch,
    worktreePath: args.worktree,
    outputPath: args.output,
    requireGithub: Boolean(args.require_github),
  };
  const result = args.command === "plan"
    ? planBootstrap(common)
    : applyBootstrap({
      ...common,
      confirmation: args.confirm,
    });

  console.log(`marker=${result.marker}`);
  console.log(`command=${result.command}`);
  console.log(`branch=${result.branch}`);
  console.log(`worktree=${result.worktree}`);
  if (result.base_commit) {
    console.log(`base_commit=${result.base_commit}`);
  }
  console.log(`output=${resolve(args.output)}`);
  console.log(
    `mutation_performed=${String(args.command === "apply")}`,
  );
  console.log("VOID_ACTIVE_LANE_BOOTSTRAP_V1_COMPLETE=true");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`HOLD: ${error.message}`);
    process.exitCode = Number.isInteger(error.exitCode)
      ? error.exitCode
      : 1;
  });
}
