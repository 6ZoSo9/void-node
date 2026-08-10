#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  classifyCandidate,
  SEVERITY_MARKER,
} from "../tools/void-coordination-decision-v2.mjs";

const policy = {
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
};

function registry(candidate) {
  return {
    marker: "VOID_ACTIVE_LANE_COORDINATION_REGISTRY_V1",
    version: 1,
    candidate: {
      branch: "feat/example-v1",
      reasons: [],
      planned_paths: [],
      path_collisions: [],
      ...candidate,
    },
  };
}

assert.equal(classifyCandidate(registry({}), policy).decision, "CLEAR");

const family = classifyCandidate(registry({
  reasons: ["reserved_family:first-contact"],
}), policy);
assert.equal(family.decision, "PROCEED_WITH_ADVISORY");
assert.equal(family.proceed_allowed, true);
assert.equal(family.exploration_allowed, true);

const nominalOverlap = classifyCandidate(registry({
  reasons: ["planned_path_overlap"],
  planned_paths: ["docs/public/example.md"],
  path_collisions: [{
    candidate_path: "docs/public/example.md",
    active_path: "docs/public/example.md",
    source: "open_pr",
    branch: "docs/other-v1",
    worktree_path: "",
    pr_number: 123,
  }],
}), policy);
assert.equal(nominalOverlap.decision, "PROCEED_WITH_ADVISORY");
assert.equal(nominalOverlap.advisory_path_collisions.length, 1);
assert.equal(nominalOverlap.hard_path_collisions.length, 0);

const exactBranch = classifyCandidate(registry({
  reasons: ["open_pr_exists:#999"],
}), policy);
assert.equal(exactBranch.decision, "HARD_STOP");
assert.equal(exactBranch.proceed_allowed, false);

const sensitiveOverlap = classifyCandidate(registry({
  branch: "fix/chain-safety-v1",
  reasons: ["planned_path_overlap"],
  planned_paths: ["src/chain/block.ts"],
  path_collisions: [{
    candidate_path: "src/chain/block.ts",
    active_path: "src/chain/block.ts",
    source: "open_pr",
    branch: "fix/other-v1",
    worktree_path: "",
    pr_number: 124,
  }],
}), policy);
assert.equal(sensitiveOverlap.decision, "HARD_STOP");
assert.ok(sensitiveOverlap.hard_reasons.includes("sensitive_path_overlap"));

const ordinaryIncomplete = classifyCandidate(registry({
  reasons: ["planned_path_metadata_incomplete"],
  planned_paths: ["docs/public/example.md"],
}), policy);
assert.equal(ordinaryIncomplete.decision, "PROCEED_WITH_ADVISORY");

const sensitiveIncomplete = classifyCandidate(registry({
  reasons: ["planned_path_metadata_incomplete"],
  planned_paths: ["contracts/VoidTreasury.sol"],
}), policy);
assert.equal(sensitiveIncomplete.decision, "HARD_STOP");

const sensitiveFamily = classifyCandidate(registry({
  branch: "fix/buy-void-receipt-v1",
  reasons: ["reserved_family:buy-void"],
}), policy);
assert.equal(sensitiveFamily.decision, "HARD_STOP");
assert.equal(sensitiveFamily.branch_sensitive, true);

console.log("clear_lane_green=true");
console.log("family_reservation_advisory_green=true");
console.log("nominal_overlap_advisory_green=true");
console.log("exact_branch_collision_hard_stop_green=true");
console.log("sensitive_overlap_hard_stop_green=true");
console.log("incomplete_metadata_risk_weighting_green=true");
console.log("priority_fallthrough_green=true");
console.log("exploration_permission_green=true");
console.log("VOID_COORDINATION_DECISION_V2_PROOF_GREEN=true");
