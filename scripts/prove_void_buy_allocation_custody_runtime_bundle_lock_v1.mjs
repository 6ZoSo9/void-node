#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  buildVoidBuyVoidCustodyRuntimeBundleCandidateV1,
  canonicalJsonV1,
  verifyVoidBuyVoidCustodyRuntimeBundleCandidateV1,
} from "../tools/void-buy-allocation-custody-runtime-bundle-candidate-v1.mjs";

const LOCK_PATH =
  "ops/security/buy-void-allocation-custody-runtime-bundle-lock-v1.json";
const EXPECTED_KEYS = [
  "candidate_bytes",
  "candidate_id",
  "candidate_sha256",
  "candidate_source_head",
  "compiled_runtime_file_count",
  "funds_movement",
  "hosted_three_node_workflow_run_id",
  "immutable_root_install",
  "lock_id",
  "marker",
  "node_binary_identity_verified",
  "payment_acceptance",
  "public_presale_activation",
  "recover_method_enabled",
  "request_root_selected",
  "reserve_method_enabled",
  "runtime_bundle_candidate_identity_accepted",
  "runtime_file_count",
  "runtime_integration",
  "schema",
  "service_restarted",
  "service_started",
  "service_unit_installed",
  "shared_directory_selected",
  "tracked_runtime_source_file_count",
  "typescript_version",
  "version",
].sort();

const bytes = fs.readFileSync(LOCK_PATH);
assert.equal(bytes[bytes.length - 1], 0x0a, "lock must end with newline");
const lock = JSON.parse(bytes.toString("utf8"));
assert.deepEqual(Object.keys(lock).sort(), EXPECTED_KEYS);

const { lock_id: observedLockId, ...body } = lock;
const expectedLockId =
  "voidbuycustodybundlelock1_" +
  crypto
    .createHash("sha256")
    .update(Buffer.from(canonicalJsonV1(body) + "\n", "utf8"))
    .digest("hex");
assert.equal(observedLockId, expectedLockId);
assert.equal(
  observedLockId,
  "voidbuycustodybundlelock1_07dab6cd3f2a507779daa79b5d2caf174ee6f59c2dd3b64be550b23f8bdc007f",
);

const candidate = buildVoidBuyVoidCustodyRuntimeBundleCandidateV1();
assert.equal(verifyVoidBuyVoidCustodyRuntimeBundleCandidateV1(candidate), true);
const candidateBytes = Buffer.from(canonicalJsonV1(candidate) + "\n", "utf8");
const candidateSha256 = crypto
  .createHash("sha256")
  .update(candidateBytes)
  .digest("hex");

assert.equal(
  lock.candidate_source_head,
  "b532e1e3214cee298ecbf25f15568b2ee9758399",
);
assert.equal(
  lock.candidate_id,
  "voidbuycustodybundle1_2339d565cc1c298a3f7ca9cae2ef163831288007bb32d9e7c37c01880aaee704",
);
assert.equal(
  lock.candidate_sha256,
  "5ee2b5e5fc25a7cec8313c7cb7c4cd8bb675e3652ab18dc614577a25376f2279",
);
assert.equal(lock.candidate_bytes, 9930);
assert.equal(lock.hosted_three_node_workflow_run_id, 38664821990);
assert.equal(candidate.candidate_id, lock.candidate_id);
assert.equal(candidateSha256, lock.candidate_sha256);
assert.equal(candidateBytes.length, lock.candidate_bytes);
assert.equal(candidate.runtime_files.length, lock.runtime_file_count);
assert.equal(
  candidate.runtime_files.filter(
    (record) => record.runtime_kind === "compiled_typescript",
  ).length,
  lock.compiled_runtime_file_count,
);
assert.equal(
  candidate.runtime_files.filter(
    (record) => record.runtime_kind === "tracked_source",
  ).length,
  lock.tracked_runtime_source_file_count,
);
assert.equal(candidate.compiler.typescript_version, lock.typescript_version);
assert.equal(candidate.candidate_accepted, false);
assert.equal(candidate.runtime_integration, false);
assert.equal(candidate.production_gate_ready, false);
assert.equal(candidate.public_presale_activation, false);
assert.equal(candidate.funds_movement, false);

assert.equal(lock.runtime_bundle_candidate_identity_accepted, true);
for (const key of [
  "immutable_root_install",
  "node_binary_identity_verified",
  "request_root_selected",
  "shared_directory_selected",
  "service_unit_installed",
  "service_started",
  "service_restarted",
  "runtime_integration",
  "reserve_method_enabled",
  "recover_method_enabled",
  "payment_acceptance",
  "public_presale_activation",
  "funds_movement",
]) {
  assert.equal(lock[key], false, key);
}

console.log("VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_LOCK_V1_GREEN");
console.log("candidate_source_head=" + lock.candidate_source_head);
console.log("candidate_id=" + lock.candidate_id);
console.log("candidate_sha256=" + lock.candidate_sha256);
console.log("candidate_bytes=" + lock.candidate_bytes);
console.log("runtime_bundle_candidate_identity_accepted=true");
console.log("immutable_root_install=false");
console.log("node_binary_identity_verified=false");
console.log("request_root_selected=false");
console.log("service_unit_installed=false");
console.log("runtime_integration=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
