#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VOID_PR_BASE_RECONCILIATION_AUDIT_V1,
  classifyPathCollisions,
  decideBaseReconciliation,
  normalizeRepositoryPath,
  parseNameStatusZ,
} from "../tools/void-pr-base-reconciliation-audit-v1.mjs";

const REPO = "6ZoSo9/void-node";
const HEAD = "a".repeat(40);
const BASE = "b".repeat(40);
const MERGE_BASE = "c".repeat(40);
const OTHER = "d".repeat(40);

function pr({ head = HEAD, base = BASE, headRepo = REPO, baseRepo = REPO } = {}) {
  return {
    number: 777,
    title: "fixture PR",
    html_url: "https://github.com/6ZoSo9/void-node/pull/777",
    state: "open",
    draft: true,
    merged: false,
    merged_at: null,
    head: {
      ref: "feat/fixture",
      sha: head,
      repo: { full_name: headRepo },
    },
    base: {
      ref: "main",
      sha: base,
      repo: { full_name: baseRepo },
    },
  };
}

function audit(overrides = {}) {
  return decideBaseReconciliation({
    repository: REPO,
    pull_request: pr(),
    expected_head: HEAD,
    expected_base: BASE,
    merge_base: MERGE_BASE,
    ahead_by: 2,
    behind_by: 3,
    feature_paths: ["src/feature.ts", "scripts/prove_feature.ts"],
    base_movement_paths: ["src/unrelated.ts", "docs/notes.md"],
    ...overrides,
  });
}

const safe = audit();
assert.equal(safe.marker, VOID_PR_BASE_RECONCILIATION_AUDIT_V1);
assert.equal(safe.decision, "SAFE_PATH_DISJOINT_RECONCILIATION_CANDIDATE");
assert.equal(safe.safe_path_disjoint_candidate, true);
assert.equal(safe.reconciliation_needed, true);
assert.equal(safe.exact_collision_paths.length, 0);
assert.equal(safe.structural_collisions.length, 0);
assert.deepEqual(safe.reasons, []);

const exact = audit({
  base_movement_paths: ["src/feature.ts"],
});
assert.equal(exact.decision, "HOLD_BASE_RECONCILIATION_AUDIT");
assert.deepEqual(exact.exact_collision_paths, ["src/feature.ts"]);
assert.deepEqual(exact.reasons, ["exact_path_collision"]);

const structural = audit({
  feature_paths: ["public/manifest"],
  base_movement_paths: ["public/manifest/current.json"],
});
assert.equal(structural.decision, "HOLD_BASE_RECONCILIATION_AUDIT");
assert.deepEqual(structural.reasons, ["structural_path_collision"]);
assert.deepEqual(structural.structural_collisions, [{
  feature_path: "public/manifest",
  base_path: "public/manifest/current.json",
}]);

const current = audit({
  merge_base: BASE,
  ahead_by: 2,
  behind_by: 0,
  feature_paths: ["src/feature.ts"],
  base_movement_paths: [],
});
assert.equal(current.decision, "CURRENT_WITH_BASE_NO_RECONCILIATION_NEEDED");
assert.equal(current.safe_or_current, true);
assert.equal(current.safe_path_disjoint_candidate, false);
assert.equal(current.reconciliation_needed, false);

const headMismatch = audit({ expected_head: OTHER });
assert.equal(headMismatch.decision, "HOLD_BASE_RECONCILIATION_AUDIT");
assert.deepEqual(headMismatch.reasons, ["head_sha_mismatch"]);

const baseMismatch = audit({ expected_base: OTHER });
assert.equal(baseMismatch.decision, "HOLD_BASE_RECONCILIATION_AUDIT");
assert.deepEqual(baseMismatch.reasons, ["base_sha_mismatch"]);

const noFeature = audit({
  ahead_by: 0,
  feature_paths: [],
});
assert.equal(noFeature.decision, "HOLD_BASE_RECONCILIATION_AUDIT");
assert.ok(noFeature.reasons.includes("no_feature_commits"));

const contradiction = audit({
  merge_base: BASE,
  behind_by: 2,
});
assert.equal(contradiction.decision, "HOLD_BASE_RECONCILIATION_AUDIT");
assert.ok(contradiction.reasons.includes("behind_count_merge_base_contradiction"));

assert.throws(
  () => audit({ pull_request: pr({ headRepo: "someone/fork" }) }),
  /cross_repository_pr_unsupported_v1/,
);

const collisionSet = classifyPathCollisions(
  ["src/a.ts", "src/foo"],
  ["src/a.ts", "src/foo/bar.ts", "src/b.ts"],
);
assert.deepEqual(collisionSet.exact_collision_paths, ["src/a.ts"]);
assert.deepEqual(collisionSet.structural_collisions, [{
  feature_path: "src/foo",
  base_path: "src/foo/bar.ts",
}]);

const parsed = parseNameStatusZ(Buffer.from(
  "M\0src/mode-only.ts\0" +
  "R100\0src/old.ts\0src/new.ts\0" +
  "C75\0docs/source.md\0docs/copy.md\0" +
  "A\0src/added.ts\0",
));
assert.deepEqual(parsed.touched_paths, [
  "docs/copy.md",
  "docs/source.md",
  "src/added.ts",
  "src/mode-only.ts",
  "src/new.ts",
  "src/old.ts",
]);
assert.deepEqual(parsed.records.map((row) => row.status), [
  "M",
  "R100",
  "C75",
  "A",
]);

assert.throws(
  () => parseNameStatusZ(Buffer.from("R100\0src/old.ts\0")),
  /git_name_status_rename_truncated/,
);
assert.throws(
  () => parseNameStatusZ(Buffer.from("M\0src/a.ts")),
  /git_name_status_not_nul_terminated/,
);
assert.throws(
  () => normalizeRepositoryPath(" src/bad.ts"),
  /repository_path_invalid/,
);
assert.throws(
  () => normalizeRepositoryPath("src/../bad.ts"),
  /repository_path_invalid/,
);

assert.deepEqual(safe.authority, {
  github_pr_metadata_read: true,
  local_git_read: true,
  network_fetch: false,
  remote_git_mutation: false,
  working_tree_mutation: false,
  local_git_ref_update: false,
  branch_create: false,
  branch_update: false,
  branch_delete: false,
  commit: false,
  push: false,
  pull_request_change: false,
  workflow_rerun: false,
  runtime_mutation: false,
  credential_material_read: false,
  wallet_or_signer: false,
  transaction: false,
  funds_moved: false,
});

console.log("VOID_PR_BASE_RECONCILIATION_AUDIT_V1_PROOF_GREEN");
console.log("disjoint_base_movement_safe=true");
console.log("exact_path_collision_hold=true");
console.log("structural_path_collision_hold=true");
console.log("rename_source_destination_tracked=true");
console.log("copy_source_destination_tracked=true");
console.log("mode_only_change_tracked=true");
console.log("expected_head_base_binding=true");
console.log("same_repository_only_v1=true");
console.log("network_fetch=false");
console.log("remote_git_mutation=false");
console.log("working_tree_mutation=false");
