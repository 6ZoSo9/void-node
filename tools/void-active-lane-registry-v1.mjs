#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export const REGISTRY_MARKER = "VOID_ACTIVE_LANE_COORDINATION_REGISTRY_V1";
export const POLICY_MARKER = "VOID_ACTIVE_LANE_RESERVATION_POLICY_V1";

function fail(message) {
  throw new Error(message);
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
    fail(`${command} ${args.join(" ")} failed (${result.status}): ${detail}`);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
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

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseWorktreePorcelain(raw) {
  const records = [];
  let current = null;
  for (const part of raw.split("\0")) {
    if (!part) {
      if (current) records.push(current);
      current = null;
      continue;
    }
    const separator = part.indexOf(" ");
    const key = separator === -1 ? part : part.slice(0, separator);
    const value = separator === -1 ? "" : part.slice(separator + 1);
    if (key === "worktree") {
      if (current) records.push(current);
      current = { path: value, detached: false, locked: false, prunable: false };
      continue;
    }
    if (!current) fail(`malformed worktree porcelain near ${part}`);
    if (key === "HEAD") current.head = value;
    else if (key === "branch") {
      current.branch_ref = value;
      current.branch = value.replace(/^refs\/heads\//, "");
    } else if (key === "detached") current.detached = true;
    else if (key === "locked") current.locked = value || true;
    else if (key === "prunable") current.prunable = value || true;
  }
  if (current) records.push(current);
  return records;
}

function parseRefs(raw, prefix) {
  const output = {};
  for (const line of raw.split("\n")) {
    if (!line) continue;
    const [ref, sha] = line.split("\t");
    if (!ref || !sha) fail(`malformed ref row: ${line}`);
    if (ref === "refs/remotes/origin/HEAD") continue;
    output[ref.replace(prefix, "")] = sha;
  }
  return output;
}

export function validatePolicy(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("reservation policy must be an object");
  }
  if (value.marker !== POLICY_MARKER || value.version !== 1) {
    fail("reservation policy marker/version mismatch");
  }
  if (
    typeof value.github_repository !== "string"
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.github_repository)
  ) {
    fail("reservation policy github_repository mismatch");
  }
  if (!Array.isArray(value.reserved_exact_branches)) {
    fail("reserved_exact_branches must be an array");
  }
  const exact = new Set();
  for (const item of value.reserved_exact_branches) {
    if (
      !item
      || typeof item !== "object"
      || typeof item.branch !== "string"
      || !item.branch
      || typeof item.reason !== "string"
      || !item.reason
    ) {
      fail("invalid exact reservation");
    }
    if (exact.has(item.branch)) fail(`duplicate exact reservation: ${item.branch}`);
    exact.add(item.branch);
  }
  if (!Array.isArray(value.reserved_families)) {
    fail("reserved_families must be an array");
  }
  const ids = new Set();
  for (const item of value.reserved_families) {
    if (
      !item
      || typeof item !== "object"
      || typeof item.id !== "string"
      || !item.id
      || typeof item.label !== "string"
      || !item.label
      || typeof item.pattern !== "string"
      || !item.pattern
    ) {
      fail("invalid family reservation");
    }
    if (ids.has(item.id)) fail(`duplicate family reservation: ${item.id}`);
    ids.add(item.id);
    try {
      new RegExp(item.pattern, "i");
    } catch (error) {
      fail(`invalid family regex ${item.id}: ${error.message}`);
    }
  }
  if (
    typeof value.runtime_evidence_pattern !== "string"
    || !value.runtime_evidence_pattern
  ) {
    fail("runtime_evidence_pattern missing");
  }
  new RegExp(value.runtime_evidence_pattern, "i");
  return value;
}

export function compilePolicy(value) {
  validatePolicy(value);
  return {
    ...value,
    exact_map: new Map(
      value.reserved_exact_branches.map((item) => [item.branch, item.reason]),
    ),
    families: value.reserved_families.map((item) => ({
      ...item,
      regex: new RegExp(item.pattern, "i"),
    })),
    runtime_regex: new RegExp(value.runtime_evidence_pattern, "i"),
  };
}

export function familyMatches(name, compiledPolicy) {
  return compiledPolicy.families
    .filter((family) => family.regex.test(name))
    .map((family) => ({ id: family.id, label: family.label }));
}

export function assessCandidate({
  branch,
  worktreePath,
  localBranches = {},
  originBranches = {},
  checkedOutBranches = new Set(),
  worktreePaths = new Set(),
  openPrBranches = new Map(),
  compiledPolicy,
  pathExists = false,
}) {
  if (typeof branch !== "string" || !branch) fail("candidate branch missing");
  if (typeof worktreePath !== "string" || !worktreePath) {
    fail("candidate worktree path missing");
  }
  const reasons = [];
  if (branch === "main") reasons.push("canonical_main_forbidden");
  if (Object.hasOwn(localBranches, branch)) reasons.push("local_branch_exists");
  if (Object.hasOwn(originBranches, branch)) reasons.push("origin_branch_exists");
  if (checkedOutBranches.has(branch)) reasons.push("branch_checked_out");
  if (openPrBranches.has(branch)) {
    reasons.push(`open_pr_exists:#${openPrBranches.get(branch).number}`);
  }
  if (worktreePaths.has(worktreePath) || pathExists) {
    reasons.push("worktree_path_exists");
  }
  if (compiledPolicy.exact_map.has(branch)) {
    reasons.push(`exact_reservation:${compiledPolicy.exact_map.get(branch)}`);
  }
  for (const family of familyMatches(branch, compiledPolicy)) {
    reasons.push(`reserved_family:${family.id}`);
  }
  return {
    branch,
    worktree_path: worktreePath,
    collision_free: reasons.length === 0,
    reasons: [...new Set(reasons)].sort(),
  };
}

function parseArgs(argv) {
  if (argv.length === 0 || argv.includes("--help")) {
    return { help: true };
  }
  const command = argv[0];
  const values = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) fail(`unexpected argument: ${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      values[key] = true;
    } else {
      values[key] = value;
      index += 1;
    }
  }
  return { command, ...values };
}

function processReferencesForPath(targetPath) {
  const references = [];
  let procEntries = [];
  try {
    procEntries = run("find", [
      "/proc",
      "-mindepth", "1",
      "-maxdepth", "1",
      "-type", "d",
      "-regex", "/proc/[0-9]+",
      "-printf", "%f\n",
    ], { check: false }).stdout.split("\n").filter(Boolean);
  } catch {
    return references;
  }
  const prefix = `${targetPath.replace(/\/+$/, "")}/`;
  for (const pid of procEntries) {
    for (const linkName of ["cwd", "root", "exe"]) {
      const link = `/proc/${pid}/${linkName}`;
      try {
        const resolved = realpathSync(link);
        if (resolved === targetPath || resolved.startsWith(prefix)) {
          references.push(`pid=${pid}:${linkName}=${resolved}`);
        }
      } catch {
        // Process exited or link is unreadable.
      }
    }
  }
  return references.sort();
}

function readPolicy(policyPath) {
  const bytes = readFileSync(policyPath);
  const parsed = JSON.parse(bytes.toString("utf8"));
  const compiled = compilePolicy(parsed);
  return {
    raw: parsed,
    compiled,
    sha256: sha256Bytes(bytes),
  };
}

function git(repoRoot, args, options = {}) {
  return run("git", ["-C", repoRoot, ...args], options);
}

function captureRepository({
  repoRoot,
  policyPath,
  candidateBranch,
  candidateWorktree,
  requireGithub,
}) {
  const resolvedRepo = resolve(repoRoot);
  const resolvedPolicy = resolve(policyPath);
  const { raw: policy, compiled, sha256: policySha256 } = readPolicy(resolvedPolicy);

  const head = git(resolvedRepo, ["rev-parse", "HEAD"]).stdout.trim();
  const originMain = git(resolvedRepo, ["rev-parse", "origin/main"]).stdout.trim();
  const currentBranch = git(
    resolvedRepo,
    ["branch", "--show-current"],
  ).stdout.trim();
  const mainStatus = git(
    resolvedRepo,
    ["status", "--porcelain=v1", "--untracked-files=all"],
  ).stdout;

  const worktrees = parseWorktreePorcelain(
    git(resolvedRepo, ["worktree", "list", "--porcelain", "-z"]).stdout,
  );
  const localBranches = parseRefs(
    git(
      resolvedRepo,
      ["for-each-ref", "--format=%(refname)%09%(objectname)", "refs/heads"],
    ).stdout,
    "refs/heads/",
  );
  const originBranches = parseRefs(
    git(
      resolvedRepo,
      [
        "for-each-ref",
        "--format=%(refname)%09%(objectname)",
        "refs/remotes/origin",
      ],
    ).stdout,
    "refs/remotes/origin/",
  );

  const gh = run(
    "gh",
    [
      "pr", "list",
      "--repo", policy.github_repository,
      "--state", "open",
      "--limit", "1000",
      "--json", "number,state,headRefName,headRefOid,title",
    ],
    { check: false },
  );
  let githubAvailable = gh.status === 0;
  let openPrs = [];
  if (githubAvailable) {
    openPrs = JSON.parse(gh.stdout);
    if (!Array.isArray(openPrs)) fail("malformed GitHub open PR response");
  } else if (requireGithub) {
    fail(`GitHub PR metadata unavailable: ${(gh.stderr || gh.stdout).trim()}`);
  }
  const openPrBranches = new Map(
    openPrs
      .filter((item) => typeof item.headRefName === "string")
      .map((item) => [item.headRefName, item]),
  );

  const classifications = [];
  for (const item of worktrees) {
    const branch = item.branch ?? "";
    const path = item.path;
    const status = git(
      path,
      ["status", "--porcelain=v1", "--untracked-files=all"],
      { check: false },
    );
    const dirty = status.status !== 0 || status.stdout.length > 0;
    const processReferences = processReferencesForPath(path);
    const identity = `${branch} ${path}`;
    const families = familyMatches(identity, compiled);
    const exactReason = branch ? compiled.exact_map.get(branch) : undefined;
    const runtimeEvidence = compiled.runtime_regex.test(identity);

    let classification = "REVIEW_CHECKED_OUT_CLEAN_UNRESERVED";
    const reasons = [];
    if (path === resolvedRepo) {
      classification = "PROTECT_CANONICAL_MAIN";
      reasons.push("canonical_main");
    } else if (dirty) {
      classification = "ACTIVE_DIRTY_OR_UNREADABLE";
      reasons.push("dirty_or_unreadable_worktree");
    } else if (processReferences.length > 0) {
      classification = "ACTIVE_PROCESS_REFERENCED";
      reasons.push("live_process_reference");
    } else if (exactReason) {
      classification = "RESERVED_EXACT_LANE";
      reasons.push(`exact:${exactReason}`);
    } else if (branch && openPrBranches.has(branch)) {
      classification = "ACTIVE_OPEN_PR";
      reasons.push(`open_pr:#${openPrBranches.get(branch).number}`);
    } else if (item.detached && runtimeEvidence) {
      classification = "RESERVED_DETACHED_RUNTIME_OR_EVIDENCE";
      reasons.push("detached_runtime_or_evidence");
    } else if (families.length > 0) {
      classification = "RESERVED_FAMILY_LANE";
      reasons.push(...families.map((family) => `family:${family.id}`));
    } else if (item.detached) {
      classification = "REVIEW_DETACHED_CLEAN";
      reasons.push("detached_clean");
    }
    if (runtimeEvidence) reasons.push("runtime_or_evidence_name");

    classifications.push({
      classification,
      branch,
      path,
      head: item.head ?? "",
      detached: Boolean(item.detached),
      dirty_or_unreadable: dirty,
      process_references: processReferences,
      reasons: [...new Set(reasons)].sort(),
    });
  }

  const checkedOutBranches = new Set(
    worktrees.filter((item) => item.branch).map((item) => item.branch),
  );
  const worktreePaths = new Set(worktrees.map((item) => item.path));
  const exactNotCheckedOut = policy.reserved_exact_branches
    .filter((item) => !checkedOutBranches.has(item.branch))
    .map((item) => ({
      classification: "RESERVED_EXACT_NOT_CHECKED_OUT",
      branch: item.branch,
      path: "",
      head:
        localBranches[item.branch]
        ?? originBranches[item.branch]
        ?? openPrBranches.get(item.branch)?.headRefOid
        ?? "",
      detached: false,
      dirty_or_unreadable: false,
      process_references: [],
      reasons: [
        `exact:${item.reason}`,
        `present_local=${String(Object.hasOwn(localBranches, item.branch))}`,
        `present_origin=${String(Object.hasOwn(originBranches, item.branch))}`,
        `present_open_pr=${String(openPrBranches.has(item.branch))}`,
      ],
    }));
  classifications.push(...exactNotCheckedOut);

  let candidate = null;
  if (candidateBranch || candidateWorktree) {
    if (!candidateBranch || !candidateWorktree) {
      fail("candidate branch and worktree must be supplied together");
    }
    candidate = assessCandidate({
      branch: candidateBranch,
      worktreePath: resolve(candidateWorktree),
      localBranches,
      originBranches,
      checkedOutBranches,
      worktreePaths,
      openPrBranches,
      compiledPolicy: compiled,
      pathExists: existsSync(resolve(candidateWorktree)),
    });
  }

  const counts = {};
  for (const item of classifications) {
    counts[item.classification] = (counts[item.classification] ?? 0) + 1;
  }

  return canonicalize({
    marker: REGISTRY_MARKER,
    version: 1,
    generated_at_utc: new Date().toISOString(),
    boundary: {
      read_only: true,
      fetch: false,
      checkout: false,
      reset: false,
      commit: false,
      push: false,
      branch_create: false,
      branch_delete: false,
      worktree_create: false,
      worktree_remove: false,
      pr_change: false,
      runtime_change: false,
      token_bytes_read: false,
    },
    repository: {
      path: resolvedRepo,
      head,
      origin_main: originMain,
      current_branch: currentBranch,
      main_clean: mainStatus.length === 0,
      head_matches_origin_main: head === originMain,
      registered_worktrees: worktrees.length,
      local_branches: Object.keys(localBranches).length,
      origin_branches: Object.keys(originBranches).length,
      open_prs: openPrs.length,
      github_metadata_available: githubAvailable,
    },
    policy: {
      path: resolvedPolicy,
      sha256: policySha256,
      exact_reservations: policy.reserved_exact_branches.length,
      family_reservations: policy.reserved_families.length,
    },
    classification_counts: counts,
    active_lanes: classifications,
    open_pull_requests: openPrs,
    candidate,
  });
}

function usage() {
  console.log([
    "VOID active-lane coordination registry V1",
    "",
    "Capture the current collision map:",
    "  node tools/void-active-lane-registry-v1.mjs capture \\",
    "    --repo-root . \\",
    "    --policy ops/coordination/active-lane-reservations-v1.json \\",
    "    --output /tmp/void-active-lanes.json \\",
    "    --require-github",
    "",
    "Check a proposed branch/worktree:",
    "  node tools/void-active-lane-registry-v1.mjs check \\",
    "    --repo-root . \\",
    "    --policy ops/coordination/active-lane-reservations-v1.json \\",
    "    --candidate-branch feat/example-v1 \\",
    "    --candidate-worktree \"$HOME/dev/void-node-example-v1\" \\",
    "    --output /tmp/void-lane-check.json \\",
    "    --require-github",
  ].join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!["capture", "check"].includes(args.command)) {
    fail("command must be capture or check");
  }
  const repoRoot = args.repo_root ?? process.cwd();
  const policyPath = args.policy
    ?? resolve(repoRoot, "ops/coordination/active-lane-reservations-v1.json");
  const outputPath = args.output;
  if (!outputPath) fail("--output is required");

  const registry = captureRepository({
    repoRoot,
    policyPath,
    candidateBranch: args.candidate_branch,
    candidateWorktree: args.candidate_worktree,
    requireGithub: Boolean(args.require_github),
  });
  if (args.command === "check" && !registry.candidate) {
    fail("check requires --candidate-branch and --candidate-worktree");
  }
  writeFileSync(outputPath, `${JSON.stringify(registry, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(`marker=${registry.marker}`);
  console.log(`repository_head=${registry.repository.head}`);
  console.log(`registered_worktrees=${registry.repository.registered_worktrees}`);
  console.log(`open_prs=${registry.repository.open_prs}`);
  if (registry.candidate) {
    console.log(`candidate_branch=${registry.candidate.branch}`);
    console.log(`candidate_worktree=${registry.candidate.worktree_path}`);
    console.log(`candidate_collision_free=${registry.candidate.collision_free}`);
    if (registry.candidate.reasons.length > 0) {
      console.log(`candidate_reasons=${registry.candidate.reasons.join(",")}`);
    }
  }
  console.log(`output=${resolve(outputPath)}`);
  console.log("mutation_performed=false");
  console.log("VOID_ACTIVE_LANE_COORDINATION_REGISTRY_V1_COMPLETE=true");

  if (
    args.command === "check"
    && registry.candidate
    && !registry.candidate.collision_free
  ) {
    process.exitCode = 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`HOLD: ${error.message}`);
    process.exitCode = 1;
  });
}
