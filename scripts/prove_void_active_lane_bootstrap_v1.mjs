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
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  BOOTSTRAP_MARKER,
  REGISTRY_MARKER,
  applyBootstrap,
  confirmationToken,
  parseArgs,
  planBootstrap,
  validateCandidate,
} from "../tools/void-active-lane-bootstrap-v1.mjs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
  });
  if (result.error) throw result.error;
  if (options.check !== false && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${
        (result.stderr || result.stdout || "").trim()
      }`,
    );
  }
  return result;
}

function clearRegistry(branch, worktreePath) {
  return {
    marker: REGISTRY_MARKER,
    candidate: {
      branch,
      worktree_path: resolve(worktreePath),
      collision_free: true,
      reasons: [],
    },
  };
}

assert.equal(BOOTSTRAP_MARKER, "VOID_ACTIVE_LANE_BOOTSTRAP_V1");
assert.equal(
  confirmationToken("feat/example-v1"),
  "CREATE_VOID_LANE:feat/example-v1",
);
assert.deepEqual(
  parseArgs([
    "plan",
    "--repo-root", "/tmp/repo",
    "--branch", "feat/example-v1",
    "--worktree", "/tmp/worktree",
    "--output", "/tmp/output.json",
    "--require-github",
  ]),
  {
    command: "plan",
    repo_root: "/tmp/repo",
    branch: "feat/example-v1",
    worktree: "/tmp/worktree",
    output: "/tmp/output.json",
    require_github: true,
  },
);

const root = mkdtempSync(join(tmpdir(), "void-lane-bootstrap-proof-"));
const repo = join(root, "repo");
const bare = join(root, "origin.git");

try {
  run("git", ["init", "--bare", bare]);
  run("git", ["init", repo]);
  run("git", ["-C", repo, "config", "user.name", "VOID Proof"]);
  run("git", ["-C", repo, "config", "user.email", "proof@void.invalid"]);
  writeFileSync(join(repo, "README.md"), "proof\n");
  run("git", ["-C", repo, "add", "README.md"]);
  run("git", ["-C", repo, "commit", "-m", "proof base"]);
  run("git", ["-C", repo, "branch", "-M", "main"]);
  run("git", ["-C", repo, "remote", "add", "origin", bare]);
  run("git", ["-C", repo, "push", "-u", "origin", "main"]);

  validateCandidate({
    repoRoot: repo,
    branch: "feat/example-v1",
    worktreePath: join(root, "candidate"),
  });
  assert.throws(
    () => validateCandidate({
      repoRoot: repo,
      branch: "main",
      worktreePath: join(root, "candidate"),
    }),
    /main is forbidden/,
  );
  assert.throws(
    () => validateCandidate({
      repoRoot: repo,
      branch: "feat/example-v1",
      worktreePath: join(repo, "nested"),
    }),
    /outside the canonical repository/,
  );

  const planPath = join(root, "plan.json");
  const plan = planBootstrap({
    repoRoot: repo,
    branch: "feat/plan-proof-v1",
    worktreePath: join(root, "plan-worktree"),
    outputPath: planPath,
    requireGithub: false,
    registryCheck: ({ branch, worktreePath }) =>
      clearRegistry(branch, worktreePath),
    openPrCheck: () => [],
  });
  assert.equal(plan.marker, BOOTSTRAP_MARKER);
  assert.equal(plan.command, "plan");
  assert.equal(plan.collision_free, true);
  assert.equal(
    run("git", ["-C", repo, "branch", "--list"]).stdout.includes(
      "feat/plan-proof-v1",
    ),
    false,
  );
  assert.equal(existsSync(join(root, "plan-worktree")), false);

  const worktree = join(root, "lane");
  const receiptPath = join(root, "receipt.json");
  const receipt = applyBootstrap({
    repoRoot: repo,
    branch: "feat/proof-lane-v1",
    worktreePath: worktree,
    outputPath: receiptPath,
    confirmation: "CREATE_VOID_LANE:feat/proof-lane-v1",
    requireGithub: false,
    registryCheck: ({ branch, worktreePath }) =>
      clearRegistry(branch, worktreePath),
    openPrCheck: () => [],
  });
  assert.equal(receipt.applied, true);
  assert.equal(receipt.remote_branch_created, false);
  assert.equal(receipt.commit_created, false);
  assert.equal(receipt.push_performed, false);
  assert.equal(receipt.canonical_main_modified, false);
  assert.equal(
    run("git", ["-C", worktree, "branch", "--show-current"])
      .stdout.trim(),
    "feat/proof-lane-v1",
  );
  assert.equal(
    run("git", ["-C", worktree, "rev-parse", "HEAD"]).stdout.trim(),
    receipt.base_commit,
  );
  assert.deepEqual(
    JSON.parse(readFileSync(receiptPath, "utf8")),
    receipt,
  );

  const collisionPath = join(root, "collision");
  assert.throws(
    () => planBootstrap({
      repoRoot: repo,
      branch: "feat/collision-v1",
      worktreePath: collisionPath,
      outputPath: join(root, "collision.json"),
      requireGithub: false,
      registryCheck: ({ branch, worktreePath }) => ({
        marker: REGISTRY_MARKER,
        candidate: {
          branch,
          worktree_path: resolve(worktreePath),
          collision_free: false,
          reasons: ["exact_reservation:test"],
        },
      }),
      openPrCheck: () => [],
    }),
    (error) =>
      /candidate collision/.test(error.message)
      && error.exitCode === 2,
  );

  const rollbackPath = join(root, "rollback-lane");
  assert.throws(
    () => applyBootstrap({
      repoRoot: repo,
      branch: "feat/rollback-proof-v1",
      worktreePath: rollbackPath,
      outputPath: join(root, "rollback.json"),
      confirmation: "CREATE_VOID_LANE:feat/rollback-proof-v1",
      requireGithub: false,
      registryCheck: ({ branch, worktreePath }) =>
        clearRegistry(branch, worktreePath),
      openPrCheck: () => [],
      postCreateHook: () => {
        throw new Error("forced post-create proof failure");
      },
    }),
    /created lane was rolled back/,
  );
  assert.equal(existsSync(rollbackPath), false);
  assert.equal(
    run(
      "git",
      [
        "-C", repo, "show-ref", "--verify", "--quiet",
        "refs/heads/feat/rollback-proof-v1",
      ],
      { check: false },
    ).status,
    1,
  );

  assert.throws(
    () => applyBootstrap({
      repoRoot: repo,
      branch: "feat/confirmation-proof-v1",
      worktreePath: join(root, "confirmation-lane"),
      outputPath: join(root, "confirmation.json"),
      confirmation: "WRONG",
      requireGithub: false,
      registryCheck: ({ branch, worktreePath }) =>
        clearRegistry(branch, worktreePath),
      openPrCheck: () => [],
    }),
    /explicit confirmation required/,
  );

  console.log("argument_parser_green=true");
  console.log("candidate_validation_green=true");
  console.log("read_only_plan_green=true");
  console.log("branch_specific_confirmation_green=true");
  console.log("fresh_origin_main_base_green=true");
  console.log("apply_creation_and_receipt_green=true");
  console.log("collision_refusal_exit2_green=true");
  console.log("post_create_rollback_green=true");
  console.log("VOID_ACTIVE_LANE_BOOTSTRAP_V1_PROOF_GREEN=true");
} finally {
  rmSync(root, { recursive: true, force: true });
}
