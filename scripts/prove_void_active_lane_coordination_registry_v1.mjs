#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  POLICY_MARKER,
  REGISTRY_MARKER,
  assessCandidate,
  canonicalJson,
  compilePolicy,
  familyMatches,
  parseWorktreePorcelain,
  sha256Bytes,
  validatePolicy,
} from "../tools/void-active-lane-registry-v1.mjs";

const policy = {
  marker: POLICY_MARKER,
  version: 1,
  github_repository: "6ZoSo9/void-node",
  reserved_exact_branches: [
    { branch: "feat/reserved-v1", reason: "test reservation" },
  ],
  reserved_families: [
    {
      id: "tor",
      label: "Tor family",
      pattern: "(^|[/._-])tor([/._-]|$)",
    },
    {
      id: "mcp",
      label: "MCP family",
      pattern: "(^|[/._-])mcp([/._-]|$)",
    },
  ],
  runtime_evidence_pattern:
    "(^|[/._-])(?:runtime|proof|canary|live|release)([/._-]|$)",
};

validatePolicy(policy);
const compiled = compilePolicy(policy);

for (const safe of [
  "feat/void-operator-webhook-receiver-v1",
  "feat/buy-void-bounded-auto-fulfillment-orchestrator-v1",
  "feat/agent-paid-work-lifecycle-dry-run-executor-v1",
]) {
  assert.deepEqual(
    familyMatches(safe, compiled).map((item) => item.id),
    [],
    `${safe} must not be classified as Tor`,
  );
}
assert.deepEqual(
  familyMatches("ops/tor-stage1-v1", compiled).map((item) => item.id),
  ["tor"],
);
assert.deepEqual(
  familyMatches("feat/void-agent-mcp-bridge-v1", compiled).map((item) => item.id),
  ["mcp"],
);

const worktrees = parseWorktreePorcelain(
  [
    "worktree /repo",
    "HEAD aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "branch refs/heads/main",
    "",
    "worktree /repo-feature",
    "HEAD bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "branch refs/heads/feat/example-v1",
    "",
    "worktree /repo-detached",
    "HEAD cccccccccccccccccccccccccccccccccccccccc",
    "detached",
    "",
  ].join("\0"),
);
assert.equal(worktrees.length, 3);
assert.equal(worktrees[0].branch, "main");
assert.equal(worktrees[1].branch, "feat/example-v1");
assert.equal(worktrees[2].detached, true);

const safeCandidate = assessCandidate({
  branch: "ops/void-active-lane-coordination-registry-v1",
  worktreePath: "/repo-coordination",
  localBranches: {},
  originBranches: {},
  checkedOutBranches: new Set(),
  worktreePaths: new Set(),
  openPrBranches: new Map(),
  compiledPolicy: compiled,
  pathExists: false,
});
assert.equal(safeCandidate.collision_free, true);
assert.deepEqual(safeCandidate.reasons, []);

const collisions = assessCandidate({
  branch: "feat/reserved-v1",
  worktreePath: "/repo-existing",
  localBranches: { "feat/reserved-v1": "d".repeat(40) },
  originBranches: { "feat/reserved-v1": "d".repeat(40) },
  checkedOutBranches: new Set(["feat/reserved-v1"]),
  worktreePaths: new Set(["/repo-existing"]),
  openPrBranches: new Map([
    ["feat/reserved-v1", { number: 999 }],
  ]),
  compiledPolicy: compiled,
  pathExists: true,
});
assert.equal(collisions.collision_free, false);
for (const expected of [
  "branch_checked_out",
  "exact_reservation:test reservation",
  "local_branch_exists",
  "open_pr_exists:#999",
  "origin_branch_exists",
  "worktree_path_exists",
]) {
  assert.ok(collisions.reasons.includes(expected), expected);
}

const temp = mkdtempSync(join(tmpdir(), "void-active-lane-proof-"));
try {
  const a = join(temp, "a.json");
  const b = join(temp, "b.json");
  writeFileSync(a, `${canonicalJson({ z: 1, a: { y: 2, x: 3 } })}\n`);
  writeFileSync(b, `${canonicalJson({ a: { x: 3, y: 2 }, z: 1 })}\n`);
  assert.equal(
    sha256Bytes(Buffer.from(canonicalJson({ z: 1, a: { y: 2, x: 3 } }))),
    sha256Bytes(Buffer.from(canonicalJson({ a: { x: 3, y: 2 }, z: 1 }))),
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}

assert.equal(REGISTRY_MARKER, "VOID_ACTIVE_LANE_COORDINATION_REGISTRY_V1");
console.log("token_aware_tor_regression_green=true");
console.log("candidate_collision_guard_green=true");
console.log("worktree_porcelain_parser_green=true");
console.log("canonical_output_green=true");
console.log("VOID_ACTIVE_LANE_COORDINATION_REGISTRY_V1_PROOF_GREEN=true");
