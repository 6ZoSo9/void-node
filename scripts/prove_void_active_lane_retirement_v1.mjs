#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  RETIREMENT_MARKER,
  applyRetirement,
  confirmationToken,
  parseArgs,
  parseWorktreePorcelain,
  planRetirement,
  validateCandidate,
} from "../tools/void-active-lane-retirement-v1.mjs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (options.check !== false && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${
        (result.stderr || result.stdout || "").trim()
      }`,
    );
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function git(repo, args, options = {}) {
  return run("git", ["-C", repo, ...args], options);
}

function head(repo) {
  return git(repo, ["rev-parse", "HEAD"]).stdout.trim();
}

function createCandidate({ repo, origin, root, name, merge = true, push = true }) {
  const worktree = join(root, `${name.replaceAll("/", "-")}-worktree`);
  git(repo, ["worktree", "add", "-b", name, worktree, "main"]);
  writeFileSync(join(worktree, "candidate.txt"), `${name}\n`);
  git(worktree, ["add", "candidate.txt"]);
  git(worktree, ["commit", "-m", `candidate ${name}`]);
  const candidateHead = head(worktree);
  if (merge) {
    git(repo, ["merge", "--ff-only", name]);
    git(repo, ["push", "origin", "main"]);
  }
  if (push) {
    git(repo, ["push", "origin", `${name}:${name}`]);
  }
  return { worktree, candidateHead };
}

assert.equal(RETIREMENT_MARKER, "VOID_ACTIVE_LANE_RETIREMENT_V1");
assert.equal(
  confirmationToken(
    "feat/example-v1",
    "0123456789012345678901234567890123456789",
  ),
  "RETIRE_VOID_LANE:feat/example-v1:0123456789012345678901234567890123456789",
);
assert.deepEqual(
  parseArgs([
    "plan",
    "--repo-root",
    "/tmp/repo",
    "--branch",
    "feat/example-v1",
    "--worktree",
    "/tmp/worktree",
    "--archive-dir",
    "/tmp/archive",
    "--output",
    "/tmp/output.json",
    "--require-github",
  ]),
  {
    command: "plan",
    repo_root: "/tmp/repo",
    branch: "feat/example-v1",
    worktree: "/tmp/worktree",
    archive_dir: "/tmp/archive",
    output: "/tmp/output.json",
    require_github: true,
  },
);

const root = mkdtempSync(join(tmpdir(), "void-lane-retirement-proof-"));
const repo = join(root, "repo");
const origin = join(root, "origin.git");

try {
  run("git", ["init", "--bare", origin]);
  run("git", ["init", repo]);
  git(repo, ["config", "user.name", "VOID Proof"]);
  git(repo, ["config", "user.email", "proof@example.invalid"]);
  writeFileSync(join(repo, "README.md"), "proof\n");
  git(repo, ["add", "README.md"]);
  git(repo, ["commit", "-m", "proof base"]);
  git(repo, ["branch", "-M", "main"]);
  git(repo, ["remote", "add", "origin", origin]);
  git(repo, ["push", "-u", "origin", "main"]);

  assert.throws(
    () => validateCandidate({
      repoRoot: repo,
      branch: "main",
      worktreePath: join(root, "main-worktree"),
      archiveDir: join(root, "main-archive"),
      outputPath: join(root, "main-output.json"),
    }),
    /main is forbidden/,
  );
  assert.throws(
    () => validateCandidate({
      repoRoot: repo,
      branch: "feat/example-v1",
      worktreePath: join(repo, "nested"),
      archiveDir: join(root, "nested-archive"),
      outputPath: join(root, "nested-output.json"),
    }),
    /outside the canonical repository/,
  );

  const candidate = createCandidate({
    repo,
    origin,
    root,
    name: "feat/retire-proof-v1",
  });
  writeFileSync(join(repo, "main-after.txt"), "main advanced\n");
  git(repo, ["add", "main-after.txt"]);
  git(repo, ["commit", "-m", "advance main after candidate"]);
  git(repo, ["push", "origin", "main"]);

  const beforePlanRefs = git(
    repo,
    ["for-each-ref", "--format=%(refname)%09%(objectname)", "refs/heads"],
  ).stdout;
  const beforePlanWorktrees = git(
    repo,
    ["worktree", "list", "--porcelain", "-z"],
  ).stdout;

  const planPath = join(root, "plan.json");
  const archiveDir = join(root, "archive");
  const plan = planRetirement({
    repoRoot: repo,
    branch: "feat/retire-proof-v1",
    worktreePath: candidate.worktree,
    archiveDir,
    outputPath: planPath,
    requireGithub: false,
  });
  assert.equal(plan.marker, RETIREMENT_MARKER);
  assert.equal(plan.command, "plan");
  assert.equal(plan.ready, true);
  assert.deepEqual(plan.reasons, []);
  assert.equal(plan.mutation_performed, false);
  assert.equal(
    plan.confirmation,
    confirmationToken("feat/retire-proof-v1", candidate.candidateHead),
  );
  assert.equal(existsSync(archiveDir), false);
  assert.equal(
    git(
      repo,
      ["for-each-ref", "--format=%(refname)%09%(objectname)", "refs/heads"],
    ).stdout,
    beforePlanRefs,
  );
  assert.equal(
    git(repo, ["worktree", "list", "--porcelain", "-z"]).stdout,
    beforePlanWorktrees,
  );

  const wrongArchive = join(root, "wrong-archive");
  const wrongOutput = join(root, "wrong-output.json");
  assert.throws(
    () => applyRetirement({
      repoRoot: repo,
      branch: "feat/retire-proof-v1",
      worktreePath: candidate.worktree,
      archiveDir: wrongArchive,
      outputPath: wrongOutput,
      confirmation: "WRONG",
      requireGithub: false,
    }),
    /explicit confirmation required/,
  );
  assert.equal(existsSync(wrongArchive), false);
  assert.equal(existsSync(candidate.worktree), true);
  assert.equal(
    git(
      repo,
      ["show-ref", "--verify", "--quiet", "refs/heads/feat/retire-proof-v1"],
      { check: false },
    ).status,
    0,
  );

  writeFileSync(join(candidate.worktree, "dirty.txt"), "dirty\n");
  const dirtyPlan = planRetirement({
    repoRoot: repo,
    branch: "feat/retire-proof-v1",
    worktreePath: candidate.worktree,
    archiveDir: join(root, "dirty-archive"),
    outputPath: join(root, "dirty-plan.json"),
    requireGithub: false,
  });
  assert.equal(dirtyPlan.ready, false);
  assert.ok(dirtyPlan.reasons.includes("worktree_dirty"));
  rmSync(join(candidate.worktree, "dirty.txt"));

  git(repo, [
    "push",
    "--force",
    "origin",
    "main:refs/heads/feat/retire-proof-v1",
  ]);
  const mismatchPlan = planRetirement({
    repoRoot: repo,
    branch: "feat/retire-proof-v1",
    worktreePath: candidate.worktree,
    archiveDir: join(root, "mismatch-archive"),
    outputPath: join(root, "mismatch-plan.json"),
    requireGithub: false,
  });
  assert.equal(mismatchPlan.ready, false);
  assert.ok(mismatchPlan.reasons.includes("remote_branch_head_mismatch"));
  git(repo, [
    "push",
    "--force",
    "origin",
    "feat/retire-proof-v1:refs/heads/feat/retire-proof-v1",
  ]);

  const unmerged = createCandidate({
    repo,
    origin,
    root,
    name: "feat/unmerged-proof-v1",
    merge: false,
    push: false,
  });
  const unmergedPlan = planRetirement({
    repoRoot: repo,
    branch: "feat/unmerged-proof-v1",
    worktreePath: unmerged.worktree,
    archiveDir: join(root, "unmerged-archive"),
    outputPath: join(root, "unmerged-plan.json"),
    requireGithub: false,
  });
  assert.equal(unmergedPlan.ready, false);
  assert.ok(
    unmergedPlan.reasons.includes(
      "branch_head_not_ancestor_of_live_origin_main",
    ),
  );
  git(repo, ["worktree", "remove", unmerged.worktree]);
  git(repo, ["branch", "-D", "feat/unmerged-proof-v1"]);

  const receiptPath = join(root, "retirement-receipt.json");
  const receipt = applyRetirement({
    repoRoot: repo,
    branch: "feat/retire-proof-v1",
    worktreePath: candidate.worktree,
    archiveDir,
    outputPath: receiptPath,
    confirmation: confirmationToken(
      "feat/retire-proof-v1",
      candidate.candidateHead,
    ),
    requireGithub: false,
  });
  assert.equal(receipt.retired, true);
  assert.equal(receipt.completed.archive_created, true);
  assert.equal(receipt.completed.remote_branch_deleted, true);
  assert.equal(receipt.completed.remote_branch_delete_performed, true);
  assert.equal(receipt.completed.worktree_removed, true);
  assert.equal(receipt.completed.local_branch_deleted, true);
  assert.equal(existsSync(candidate.worktree), false);
  assert.equal(
    git(
      repo,
      ["show-ref", "--verify", "--quiet", "refs/heads/feat/retire-proof-v1"],
      { check: false },
    ).status,
    1,
  );
  assert.equal(
    git(
      repo,
      ["ls-remote", "--heads", "origin", "refs/heads/feat/retire-proof-v1"],
    ).stdout.trim(),
    "",
  );
  assert.equal(
    git(
      repo,
      ["bundle", "verify", join(archiveDir, "active-lane-source-v1.bundle")],
      { check: false },
    ).status,
    0,
  );
  assert.deepEqual(JSON.parse(readFileSync(receiptPath, "utf8")), receipt);

  const partial = createCandidate({
    repo,
    origin,
    root,
    name: "feat/partial-proof-v1",
  });
  const partialArchive = join(root, "partial-archive");
  const partialOutput = join(root, "partial-output.json");
  assert.throws(
    () => applyRetirement({
      repoRoot: repo,
      branch: "feat/partial-proof-v1",
      worktreePath: partial.worktree,
      archiveDir: partialArchive,
      outputPath: partialOutput,
      confirmation: confirmationToken(
        "feat/partial-proof-v1",
        partial.candidateHead,
      ),
      requireGithub: false,
      hooks: {
        afterRemoteDelete() {
          throw new Error("forced partial retirement proof failure");
        },
      },
    }),
    /forced partial retirement proof failure/,
  );
  const failure = JSON.parse(readFileSync(partialOutput, "utf8"));
  assert.equal(failure.retired, false);
  assert.equal(failure.mutation_performed, true);
  assert.equal(failure.completed.archive_created, true);
  assert.equal(failure.completed.remote_branch_deleted, true);
  assert.equal(failure.completed.remote_branch_delete_performed, true);
  assert.equal(failure.completed.worktree_removed, false);
  assert.equal(existsSync(partial.worktree), true);
  assert.equal(
    git(
      repo,
      ["ls-remote", "--heads", "origin", "refs/heads/feat/partial-proof-v1"],
    ).stdout.trim(),
    "",
  );
  assert.equal(
    existsSync(
      join(partialArchive, "retirement-failure-receipt-v1.json"),
    ),
    true,
  );

  git(repo, ["worktree", "remove", partial.worktree]);
  git(repo, ["branch", "-D", "feat/partial-proof-v1"]);

  const parsed = parseWorktreePorcelain(
    git(repo, ["worktree", "list", "--porcelain", "-z"]).stdout,
  );
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].branch, "main");

  console.log("argument_parser_green=true");
  console.log("candidate_validation_green=true");
  console.log("read_only_plan_green=true");
  console.log("exact_head_confirmation_green=true");
  console.log("dirty_worktree_refusal_green=true");
  console.log("unmerged_head_refusal_green=true");
  console.log("remote_branch_mismatch_refusal_green=true");
  console.log("archive_before_retirement_green=true");
  console.log("remote_worktree_local_cleanup_green=true");
  console.log("post_retirement_verification_green=true");
  console.log("partial_failure_receipt_green=true");
  console.log("canonical_main_unchanged_green=true");
  console.log("VOID_ACTIVE_LANE_RETIREMENT_V1_PROOF_GREEN=true");
} finally {
  rmSync(root, { recursive: true, force: true });
}
