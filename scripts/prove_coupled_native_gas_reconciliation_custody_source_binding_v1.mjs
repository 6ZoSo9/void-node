#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1,
  testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1,
  inspectCoupledNativeGasReconciliationCustodySourceBindingV1,
} from "../tools/void-coupled-native-gas-reconciliation-custody-source-binding-v1.mjs";

const observed = () => ({
  repository_head_sha: "a".repeat(40),
  repository_tree_sha: "b".repeat(40),
  repository_origin: "https://github.com/6ZoSo9/void-node.git",
  worktree_clean: true,
  reviewed_base_is_ancestor: true,
  source_blobs:
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1
      .map((row) => ({ ...row })),
});

const baseline =
  testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1(observed());
assert.equal(baseline.ok, true);
if (!baseline.ok) throw new Error(baseline.reason);
assert.equal(
  baseline.marker,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1,
);
assert.equal(baseline.status, "SOURCE_GENERATION_BOUND_NOT_TRUSTED");
assert.equal(baseline.reviewed_source_count, 21);
assert.match(
  baseline.reviewed_source_manifest_sha256,
  /^[0-9a-f]{64}$/u,
);
assert.equal(
  baseline.reviewed_source_manifest_sha256,
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
);
assert.equal(baseline.writer_generation_binding_proven, true);
assert.equal(baseline.qualification_generation_binding_proven, true);
assert.equal(baseline.collector_generation_binding_proven, true);
assert.equal(baseline.deployed_artifact_generation_verified, false);
assert.equal(baseline.trusted_collector_proven, false);
assert.equal(baseline.bootstrap_receipt_external_trust_proven, false);
assert.equal(baseline.evidence_generation_monotonicity_proven, false);
assert.equal(baseline.verification_clock_authority_proven, false);
assert.equal(baseline.live_host_qualification_performed, false);
assert.equal(baseline.storage_bootstrap, false);
assert.equal(baseline.runtime_integration, false);
assert.equal(baseline.production_gate_ready, false);
assert.equal(baseline.funds_movement, false);
assert.match(baseline.source_binding_id, /^voidngrcsb1_[0-9a-f]{64}$/u);
assert.equal(
  baseline.source_generation_id,
  "voidngrcsg1_" +
    VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_MANIFEST_SHA256_V1,
);

const alternativeHead =
  testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1({
    ...observed(),
    repository_head_sha: "c".repeat(40),
  });
assert.equal(alternativeHead.ok, true);
if (!alternativeHead.ok) throw new Error(alternativeHead.reason);
assert.notEqual(alternativeHead.source_binding_id, baseline.source_binding_id);
assert.equal(alternativeHead.source_generation_id, baseline.source_generation_id);

for (let index = 0; index <
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_REVIEWED_SOURCE_V1.length;
  index += 1
) {
  const candidate = observed();
  candidate.source_blobs[index].git_blob_sha1 = "0".repeat(40);
  const held =
    testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1(candidate);
  assert.equal(held.ok, false, candidate.source_blobs[index].path);
  if (held.ok) throw new Error("expected source drift HOLD");
  assert.equal(
    held.reason,
    "source_binding_reviewed_source_drift:" +
      candidate.source_blobs[index].path,
  );
}

for (const [label, mutate, reason] of [
  [
    "dirty worktree",
    (input) => { input.worktree_clean = false; },
    "source_binding_worktree_not_clean",
  ],
  [
    "missing reviewed ancestry",
    (input) => { input.reviewed_base_is_ancestor = false; },
    "source_binding_reviewed_base_not_ancestor",
  ],
  [
    "wrong repository origin",
    (input) => { input.repository_origin = "https://example.com/void-node.git"; },
    "source_binding_repository_origin_invalid",
  ],
  [
    "bad head",
    (input) => { input.repository_head_sha = "nope"; },
    "source_binding_repository_identity_invalid",
  ],
  [
    "missing source record",
    (input) => { input.source_blobs.pop(); },
    "source_binding_source_blob_count_mismatch",
  ],
  [
    "duplicate source record",
    (input) => {
      input.source_blobs[1] = { ...input.source_blobs[0] };
    },
    "source_binding_source_blob_record_invalid",
  ],
]) {
  const candidate = observed();
  mutate(candidate);
  const held =
    testOnlyClassifyCoupledNativeGasReconciliationCustodySourceBindingV1(candidate);
  assert.equal(held.ok, false, label);
  if (held.ok) throw new Error("expected " + label + " HOLD");
  assert.equal(held.reason, reason, label);
  assert.equal(held.writer_generation_binding_proven, false, label);
  assert.equal(held.production_gate_ready, false, label);
}

for (const [key, value] of Object.entries(
  VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_AUTHORITY_V1,
)) {
  const trueKeys = new Set([
    "source_only_contract",
    "git_repository_identity_read",
    "subprocess_git_read",
    "filesystem_read",
    "clean_worktree_required",
    "reviewed_base_ancestry_required",
    "exact_reviewed_git_blobs_required",
    "reviewed_build_context_bound",
    "writer_generation_binding_proven_on_success",
    "qualification_generation_binding_proven_on_success",
    "collector_generation_binding_proven_on_success",
  ]);
  assert.equal(value, trueKeys.has(key), key);
}

const poison = {
  GIT_DIR: process.env.GIT_DIR,
  GIT_WORK_TREE: process.env.GIT_WORK_TREE,
  GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL,
  GIT_CONFIG_SYSTEM: process.env.GIT_CONFIG_SYSTEM,
  GIT_REPLACE_REF_BASE: process.env.GIT_REPLACE_REF_BASE,
};
try {
  process.env.GIT_DIR = "/tmp/void-fake-git-dir";
  process.env.GIT_WORK_TREE = "/tmp/void-fake-worktree";
  process.env.GIT_CONFIG_GLOBAL = "/tmp/void-fake-global";
  process.env.GIT_CONFIG_SYSTEM = "/tmp/void-fake-system";
  process.env.GIT_REPLACE_REF_BASE = "refs/replace/fake";

  const live = inspectCoupledNativeGasReconciliationCustodySourceBindingV1();
  assert.equal(live.ok, true);
  if (!live.ok) throw new Error(live.reason);
  assert.equal(live.writer_generation_binding_proven, true);
  assert.equal(live.trusted_collector_proven, false);
  assert.equal(live.live_host_qualification_performed, false);
  assert.equal(live.production_gate_ready, false);
} finally {
  for (const [key, value] of Object.entries(poison)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log(
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V1_GREEN",
);
console.log("reviewed_source_count=21");
console.log("exact_reviewed_git_blobs_required=true");
console.log("reviewed_base_ancestry_required=true");
console.log("clean_worktree_required=true");
console.log("ambient_git_overrides_ignored=true");
console.log("writer_generation_binding_proven=true");
console.log("qualification_generation_binding_proven=true");
console.log("collector_generation_binding_proven=true");
console.log("trusted_collector_proven=false");
console.log("bootstrap_receipt_external_trust_proven=false");
console.log("evidence_generation_monotonicity_proven=false");
console.log("verification_clock_authority_proven=false");
console.log("live_host_qualification_performed=false");
console.log("storage_bootstrap=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
