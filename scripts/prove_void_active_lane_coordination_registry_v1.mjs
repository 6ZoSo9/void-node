#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  POLICY_MARKER,
  REGISTRY_MARKER,
  SEVERITY_MARKER,
  assessCandidate,
  canonicalJson,
  collectChangedPaths,
  compilePolicy,
  familyMatches,
  findPathCollisions,
  normalizeClaimPath,
  parseCandidatePathClaims,
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
    {
      id: "buy-void",
      label: "Buy VOID family",
      pattern: "buy-void",
    },
  ],
  coordination_severity: {
    marker: SEVERITY_MARKER,
    version: 2,
    default_overlap: "advisory",
    default_reservation: "advisory",
    hard_reason_prefixes: [
      "canonical_main_forbidden",
      "branch_checked_out",
      "local_branch_exists",
      "open_pr_exists:",
      "origin_branch_exists",
      "worktree_path_exists",
    ],
    sensitive_path_patterns: [
      "^contracts/",
      "^src/chain/",
      "^src/consensus/",
      "^src/node_core\\.ts$",
      "^ops/(?!coordination/)",
      "(^|[/._-])(?:private[-_]?chain2050|buy[-_]?void|treasury|wallet|signer|validator|consensus|work[-_]?credit|wc)([/._-]|$)",
    ],
    sensitive_branch_patterns: [
      "(^|[/._-])(?:private[-_]?chain2050|buy[-_]?void|treasury|wallet|signer|validator|consensus|work[-_]?credit|wc|deployment|restart)([/._-]|$)",
    ],
  },
  runtime_evidence_pattern:
    "(^|[/._-])(?:runtime|proof|canary|live|release)([/._-]|$)",
};

validatePolicy(policy);
const compiled = compilePolicy(policy);

const repositoryPolicy = JSON.parse(readFileSync(
  new URL("../ops/coordination/active-lane-reservations-v1.json", import.meta.url),
  "utf8",
));
validatePolicy(repositoryPolicy);
assert.equal(repositoryPolicy.reserved_exact_branches.length, 0);
assert.equal(repositoryPolicy.retired_exact_reservations.length, 10);
assert.deepEqual(
  repositoryPolicy.retired_exact_reservations
    .filter((item) => item.retired_reason.startsWith("merged_pr_"))
    .map((item) => item.retired_reason)
    .sort(),
  ["merged_pr_840", "merged_pr_841", "merged_pr_844"],
);

for (const safe of [
  "feat/void-operator-webhook-receiver-v1",
  "feat/buy-void-bounded-auto-fulfillment-orchestrator-v1",
  "feat/agent-paid-work-lifecycle-dry-run-executor-v1",
]) {
  const ids = familyMatches(safe, compiled).map((item) => item.id);
  assert.equal(ids.includes("tor"), false, `${safe} must not be classified as Tor`);
}
assert.deepEqual(
  familyMatches("ops/tor-stage1-v1", compiled).map((item) => item.id),
  ["tor"],
);
assert.deepEqual(
  familyMatches("feat/void-agent-mcp-bridge-v1", compiled).map((item) => item.id),
  ["mcp"],
);

assert.equal(normalizeClaimPath("./src/http/routes.ts"), "src/http/routes.ts");
assert.equal(normalizeClaimPath("docs/operations/"), "docs/operations/");
assert.throws(() => normalizeClaimPath("../secrets"), /invalid repository-relative/);
assert.throws(() => normalizeClaimPath("/etc/passwd"), /invalid repository-relative/);
assert.deepEqual(
  parseCandidatePathClaims([
    "# planned scope",
    "tools/new-guard.mjs",
    "docs/operations/",
    "tools/new-guard.mjs",
    "",
  ].join("\n")),
  ["docs/operations/", "tools/new-guard.mjs"],
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
  branch: "feat/void-active-lane-coordination-registry-v1",
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
assert.equal(safeCandidate.decision, "CLEAR");
assert.equal(safeCandidate.hard_stop, false);
assert.equal(safeCandidate.proceed_allowed, true);
assert.equal(safeCandidate.priority_fallthrough_allowed, true);
assert.equal(safeCandidate.exploration_allowed, true);
assert.deepEqual(safeCandidate.reasons, []);
assert.deepEqual(safeCandidate.planned_paths, []);
assert.deepEqual(safeCandidate.path_collisions, []);

const familyCandidate = assessCandidate({
  branch: "feat/void-agent-mcp-bridge-v1",
  worktreePath: "/repo-mcp",
  compiledPolicy: compiled,
});
assert.equal(familyCandidate.collision_free, false);
assert.equal(familyCandidate.decision, "PROCEED_WITH_ADVISORY");
assert.equal(familyCandidate.hard_stop, false);
assert.ok(familyCandidate.advisory_reasons.includes("reserved_family:mcp"));

const activePathClaims = [
  {
    path: "tools/void-active-lane-registry-v1.mjs",
    source: "worktree",
    branch: "fix/existing-v1",
    worktree_path: "/repo-existing",
    pr_number: null,
  },
  {
    path: "docs/operations/existing.md",
    source: "open_pr",
    branch: "docs/existing-v1",
    worktree_path: "",
    pr_number: 998,
  },
];
assert.equal(
  findPathCollisions(["src/http/new-route.ts"], activePathClaims).length,
  0,
);
assert.equal(
  findPathCollisions(["docs/operations/"], activePathClaims).length,
  1,
);

const pathCollision = assessCandidate({
  branch: "fix/path-overlap-v1",
  worktreePath: "/repo-path-overlap",
  compiledPolicy: compiled,
  candidatePaths: [
    "docs/operations/",
    "tools/void-active-lane-registry-v1.mjs",
  ],
  activePathClaims,
});
assert.equal(pathCollision.collision_free, false);
assert.equal(pathCollision.decision, "PROCEED_WITH_ADVISORY");
assert.equal(pathCollision.hard_stop, false);
assert.ok(pathCollision.reasons.includes("planned_path_overlap"));
assert.ok(pathCollision.advisory_reasons.includes("nominal_path_overlap"));
assert.equal(pathCollision.path_collisions.length, 2);
assert.equal(pathCollision.advisory_path_collisions.length, 2);
assert.equal(pathCollision.hard_path_collisions.length, 0);
assert.equal(pathCollision.path_metadata_complete, true);

const incompletePathMetadata = assessCandidate({
  branch: "fix/incomplete-path-metadata-v1",
  worktreePath: "/repo-incomplete-path-metadata",
  compiledPolicy: compiled,
  candidatePaths: ["src/http/new-route.ts"],
  activePathClaims: [],
  pathMetadataComplete: false,
});
assert.equal(incompletePathMetadata.collision_free, false);
assert.equal(incompletePathMetadata.decision, "PROCEED_WITH_ADVISORY");
assert.equal(incompletePathMetadata.hard_stop, false);
assert.ok(
  incompletePathMetadata.advisory_reasons.includes("planned_path_metadata_incomplete"),
);

const sensitiveOverlap = assessCandidate({
  branch: "fix/chain-safety-v1",
  worktreePath: "/repo-chain-safety",
  compiledPolicy: compiled,
  candidatePaths: ["src/chain/block.ts"],
  activePathClaims: [{
    path: "src/chain/block.ts",
    source: "open_pr",
    branch: "fix/other-chain-v1",
    worktree_path: "",
    pr_number: 124,
  }],
});
assert.equal(sensitiveOverlap.collision_free, false);
assert.equal(sensitiveOverlap.decision, "HARD_STOP");
assert.equal(sensitiveOverlap.hard_stop, true);
assert.equal(sensitiveOverlap.proceed_allowed, false);
assert.equal(sensitiveOverlap.priority_fallthrough_allowed, true);
assert.equal(sensitiveOverlap.exploration_allowed, true);
assert.ok(sensitiveOverlap.hard_reasons.includes("sensitive_path_overlap"));
assert.equal(sensitiveOverlap.hard_path_collisions.length, 1);

const sensitiveIncomplete = assessCandidate({
  branch: "fix/chain-incomplete-v1",
  worktreePath: "/repo-chain-incomplete",
  compiledPolicy: compiled,
  candidatePaths: ["contracts/VoidTreasury.sol"],
  pathMetadataComplete: false,
});
assert.equal(sensitiveIncomplete.decision, "HARD_STOP");
assert.equal(sensitiveIncomplete.proceed_allowed, false);
assert.equal(sensitiveIncomplete.priority_fallthrough_allowed, true);
assert.equal(sensitiveIncomplete.exploration_allowed, true);
assert.ok(
  sensitiveIncomplete.hard_reasons.includes("planned_path_metadata_incomplete"),
);

const sensitiveFamily = assessCandidate({
  branch: "fix/buy-void-receipt-v1",
  worktreePath: "/repo-buy-void",
  compiledPolicy: compiled,
});
assert.equal(sensitiveFamily.decision, "HARD_STOP");
assert.equal(sensitiveFamily.branch_sensitive, true);
assert.equal(sensitiveFamily.proceed_allowed, false);
assert.equal(sensitiveFamily.priority_fallthrough_allowed, true);
assert.equal(sensitiveFamily.exploration_allowed, true);
assert.ok(sensitiveFamily.hard_reasons.includes("reserved_family:buy-void"));

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
assert.equal(collisions.decision, "HARD_STOP");
assert.equal(collisions.hard_stop, true);
assert.equal(collisions.proceed_allowed, false);
assert.equal(collisions.priority_fallthrough_allowed, true);
assert.equal(collisions.exploration_allowed, true);
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
for (const expected of [
  "branch_checked_out",
  "local_branch_exists",
  "open_pr_exists:#999",
  "origin_branch_exists",
  "worktree_path_exists",
]) {
  assert.ok(collisions.hard_reasons.includes(expected), expected);
}
assert.ok(collisions.advisory_reasons.includes("exact_reservation:test reservation"));

assert.throws(
  () => validatePolicy({ ...policy, reserved_exact_branches: "untrusted" }),
  /reserved_exact_branches must be an array/,
);
assert.throws(
  () => compilePolicy({
    ...policy,
    coordination_severity: {
      ...policy.coordination_severity,
      sensitive_path_patterns: ["("],
    },
  }),
  /invalid sensitive_path_patterns regex/,
);

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

const repositoryTemp = mkdtempSync(join(tmpdir(), "void-active-lane-repository-proof-"));
try {
  execFileSync("git", ["init", "--quiet", repositoryTemp]);
  execFileSync("git", ["-C", repositoryTemp, "config", "user.name", "VOID Proof"]);
  execFileSync("git", ["-C", repositoryTemp, "config", "user.email", "void-proof@example.invalid"]);
  writeFileSync(join(repositoryTemp, "tracked.txt"), "base\n");
  execFileSync("git", ["-C", repositoryTemp, "add", "tracked.txt"]);
  execFileSync("git", ["-C", repositoryTemp, "commit", "--quiet", "-m", "base"]);
  execFileSync("git", [
    "-C", repositoryTemp, "update-ref", "refs/remotes/origin/main", "HEAD",
  ]);
  writeFileSync(join(repositoryTemp, "committed.txt"), "committed\n");
  execFileSync("git", ["-C", repositoryTemp, "add", "committed.txt"]);
  execFileSync("git", ["-C", repositoryTemp, "commit", "--quiet", "-m", "lane"]);
  writeFileSync(join(repositoryTemp, "tracked.txt"), "changed\n");
  writeFileSync(join(repositoryTemp, "staged.txt"), "staged\n");
  writeFileSync(join(repositoryTemp, "untracked.txt"), "untracked\n");
  execFileSync("git", ["-C", repositoryTemp, "add", "staged.txt"]);
  assert.deepEqual(collectChangedPaths(repositoryTemp), {
    complete: true,
    paths: ["committed.txt", "staged.txt", "tracked.txt", "untracked.txt"],
  });
} finally {
  rmSync(repositoryTemp, { recursive: true, force: true });
}

assert.equal(REGISTRY_MARKER, "VOID_ACTIVE_LANE_COORDINATION_REGISTRY_V1");
assert.equal(SEVERITY_MARKER, "VOID_COORDINATION_SEVERITY_V2");
console.log("token_aware_tor_regression_green=true");
console.log("candidate_collision_guard_green=true");
console.log("planned_path_overlap_guard_green=true");
console.log("nominal_overlap_advisory_green=true");
console.log("family_reservation_advisory_green=true");
console.log("sensitive_overlap_hard_stop_green=true");
console.log("candidate_local_red_fallthrough_green=true");
console.log("candidate_local_red_exploration_green=true");
console.log("untrustworthy_policy_hold_green=true");
console.log("retired_exact_reservation_audit_green=true");
console.log("incomplete_metadata_risk_weighting_green=true");
console.log("priority_fallthrough_green=true");
console.log("exploration_permission_green=true");
console.log("changed_path_enumeration_green=true");
console.log("worktree_porcelain_parser_green=true");
console.log("canonical_output_green=true");
console.log("VOID_ACTIVE_LANE_COORDINATION_REGISTRY_V1_PROOF_GREEN=true");
