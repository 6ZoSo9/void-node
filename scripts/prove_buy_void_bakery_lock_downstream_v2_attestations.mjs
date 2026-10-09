#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CUSTODY_CANDIDATE =
  "scripts/prove_buy_void_allocation_custody_witness_runtime_bundle_v2_candidate.mjs";
const CUSTODY_CANDIDATE_BLOB =
  "f2ae443062d5d87670c5fab9aaf2e2fb1caa6510";
const CUSTODY_CANDIDATE_SHA256 =
  "6647673c5c23cb8c90a89acaf31dee85da1cea546ab377dec127bf7217252141";
const CUSTODY_MANIFEST =
  "docs/architecture/buy-void-allocation-custody-witness-runtime-bundle-v2-attestation.json";

const NATIVE_CANDIDATE =
  "scripts/prove_coupled_native_gas_reconciliation_custody_source_binding_v2_candidate.mjs";
const NATIVE_CANDIDATE_BLOB =
  "6e9e55bba6ba371c721562b664fe16cfdcfae138";
const NATIVE_CANDIDATE_SHA256 =
  "9842d29130e2cd0ff7b1597ca2f20b721dc069440f21cf38d24f228e99a454e3";
const NATIVE_MANIFEST =
  "docs/architecture/coupled-native-gas-reconciliation-custody-source-binding-v2-attestation.json";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath));
}

function derive(scriptPath, expectedBlob, expectedEvidenceSha) {
  const scriptBytes = read(scriptPath);
  assert.equal(
    gitBlobSha1(scriptBytes),
    expectedBlob,
    "candidate script Git blob mismatch: " + scriptPath,
  );

  const run = spawnSync(
    process.execPath,
    [path.join(ROOT, scriptPath), "--derive"],
    {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
    },
  );
  assert.equal(
    run.status,
    0,
    "candidate derivation failed: " + scriptPath + "\n" + run.stderr,
  );
  const bytes = Buffer.from(run.stdout, "utf8");
  assert.equal(
    sha256(bytes),
    expectedEvidenceSha,
    "candidate evidence bytes changed: " + scriptPath,
  );
  return JSON.parse(run.stdout);
}

function exactCommitted(relativePath, expected) {
  const committed = read(relativePath);
  const exact = Buffer.from(JSON.stringify(expected, null, 2) + "\n", "utf8");
  assert.equal(
    committed.equals(exact),
    true,
    "locked V2 attestation bytes mismatch: " + relativePath,
  );
}

const custodyCandidate = derive(
  CUSTODY_CANDIDATE,
  CUSTODY_CANDIDATE_BLOB,
  CUSTODY_CANDIDATE_SHA256,
);
assert.equal(
  custodyCandidate.marker,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_V2_CANDIDATE",
);
assert.equal(custodyCandidate.candidate_manifest_accepted, false);
assert.equal(custodyCandidate.predecessor_manifest_accepted, false);
assert.deepEqual(
  custodyCandidate.changed_runtime_paths,
  ["dist/economic/buy_void_filesystem_bakery_lock_v1.js"],
);
assert.equal(
  custodyCandidate.candidate_runtime_bundle_manifest_id,
  "voidwfb2_7d7573c8a105473997c0fb7442842ec58f010cebab0c9497c86bd9dcb62c248f",
);
assert.equal(
  custodyCandidate.candidate_runtime_bundle_manifest_sha256,
  "sha256:ec3b126d0c4c406d60f2bce01d08d463a0e06553e2980bc2812e5e487a42ad0d",
);
assert.equal(
  custodyCandidate.candidate_bakery_lock_sha256,
  "sha256:47e80dfffa0cd1fd97169f9d63e836c9dbf52461aaafafdf10499b5cf91fd3ca",
);
assert.equal(custodyCandidate.runtime_bundle_files.length, 8);
assert.equal(custodyCandidate.runtime_edge_count, 11);
assert.equal(custodyCandidate.dynamic_import_count, 0);
assert.equal(custodyCandidate.require_call_count, 0);
for (const key of [
  "live_nimo_installed",
  "runtime_integration",
  "protected_high_water_custody_proven",
  "production_gate_ready",
  "funds_movement",
]) {
  assert.equal(custodyCandidate[key], false, key);
}

const custodyAttestation = {
  schema:
    "void_buy_void_allocation_custody_witness_runtime_bundle_v2_attestation_v1",
  marker:
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_V2_ATTESTATION",
  version: 1,
  repository: "6ZoSo9/void-node",
  candidate: {
    script_path: CUSTODY_CANDIDATE,
    script_git_blob_sha1: CUSTODY_CANDIDATE_BLOB,
    evidence_sha256: CUSTODY_CANDIDATE_SHA256,
    source_stack_head: custodyCandidate.source_stack_head,
  },
  predecessor: {
    manifest_id:
      custodyCandidate.predecessor.runtime_bundle_manifest_id,
    manifest_sha256:
      custodyCandidate.predecessor.runtime_bundle_manifest_sha256,
    bakery_lock_sha256:
      custodyCandidate.predecessor.bakery_lock_sha256,
  },
  accepted_v2: {
    manifest_id:
      custodyCandidate.candidate_runtime_bundle_manifest_id,
    manifest_sha256:
      custodyCandidate.candidate_runtime_bundle_manifest_sha256,
    bakery_lock_source_git_blob_sha1:
      custodyCandidate.bakery_lock_source_git_blob_sha1,
    bakery_lock_artifact_sha256:
      custodyCandidate.candidate_bakery_lock_sha256,
    changed_runtime_paths: custodyCandidate.changed_runtime_paths,
    runtime_file_count: custodyCandidate.runtime_bundle_files.length,
    runtime_edge_count: custodyCandidate.runtime_edge_count,
    dynamic_import_count: custodyCandidate.dynamic_import_count,
    require_call_count: custodyCandidate.require_call_count,
    runtime_bundle_manifest_accepted: true,
  },
  live_nimo_installed: false,
  runtime_integration: false,
  protected_high_water_custody_proven: false,
  production_gate_ready: false,
  funds_movement: false,
};
exactCommitted(CUSTODY_MANIFEST, custodyAttestation);

const nativeCandidate = derive(
  NATIVE_CANDIDATE,
  NATIVE_CANDIDATE_BLOB,
  NATIVE_CANDIDATE_SHA256,
);
assert.equal(
  nativeCandidate.marker,
  "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V2_CANDIDATE",
);
assert.equal(nativeCandidate.candidate_manifest_accepted, false);
assert.deepEqual(
  nativeCandidate.changed_source_paths,
  ["src/economic/buy_void_filesystem_bakery_lock_v1.ts"],
);
assert.equal(nativeCandidate.reviewed_source_count, 21);
assert.equal(
  nativeCandidate.candidate_reviewed_source_manifest_sha256,
  "4e3c83de580ee12803ce122f0df34194d3594c4dd49eee56a9fa8184b4353144",
);
assert.equal(
  nativeCandidate.candidate_bakery_lock_git_blob_sha1,
  "9bd47abb857368d928c0ca289766cdf3571629ba",
);
for (const key of [
  "deployed_artifact_generation_verified",
  "trusted_collector_proven",
  "live_host_qualification_performed",
  "runtime_integration",
  "payment_acceptance",
  "production_gate_ready",
  "funds_movement",
]) {
  assert.equal(nativeCandidate[key], false, key);
}

const nativeAttestation = {
  schema:
    "void_coupled_native_gas_reconciliation_custody_source_binding_v2_attestation_v1",
  marker:
    "VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_SOURCE_BINDING_V2_ATTESTATION",
  version: 1,
  repository: "6ZoSo9/void-node",
  candidate: {
    script_path: NATIVE_CANDIDATE,
    script_git_blob_sha1: NATIVE_CANDIDATE_BLOB,
    evidence_sha256: NATIVE_CANDIDATE_SHA256,
    source_stack_head: nativeCandidate.source_stack_head,
  },
  predecessor: {
    reviewed_source_manifest_sha256:
      nativeCandidate.predecessor_reviewed_source_manifest_sha256,
    bakery_lock_git_blob_sha1:
      nativeCandidate.predecessor_bakery_lock_git_blob_sha1,
  },
  accepted_v2: {
    reviewed_source_manifest_sha256:
      nativeCandidate.candidate_reviewed_source_manifest_sha256,
    bakery_lock_git_blob_sha1:
      nativeCandidate.candidate_bakery_lock_git_blob_sha1,
    changed_source_paths: nativeCandidate.changed_source_paths,
    reviewed_source_count: nativeCandidate.reviewed_source_count,
    source_manifest_accepted: true,
  },
  deployed_artifact_generation_verified: false,
  trusted_collector_proven: false,
  live_host_qualification_performed: false,
  runtime_integration: false,
  payment_acceptance: false,
  production_gate_ready: false,
  funds_movement: false,
};
exactCommitted(NATIVE_MANIFEST, nativeAttestation);

console.log("VOID_BUY_VOID_BAKERY_LOCK_DOWNSTREAM_V2_ATTESTATIONS_GREEN");
console.log(
  "custody_runtime_bundle_manifest_id=" +
    custodyAttestation.accepted_v2.manifest_id,
);
console.log(
  "custody_runtime_bundle_manifest_sha256=" +
    custodyAttestation.accepted_v2.manifest_sha256,
);
console.log(
  "native_gas_reviewed_source_manifest_sha256=" +
    nativeAttestation.accepted_v2.reviewed_source_manifest_sha256,
);
console.log("live_nimo_installed=false");
console.log("runtime_integration=false");
console.log("payment_acceptance=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
