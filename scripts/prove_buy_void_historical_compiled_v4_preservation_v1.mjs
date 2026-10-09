#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const FILES = Object.freeze({
  v3_manifest: [
    "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v3.json",
    "d6e97784c5d8be93713e733628c7d1ef746bb5c7",
  ],
  v4_candidate_script: [
    "scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v4_candidate.mjs",
    "1fb96f6c707dcbd8682a32b31ebdf5aa3ca56af4",
  ],
  v4_candidate_doc: [
    "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v4-candidate.md",
    "ddd7709e1c86ce5395968e5dc5b5014a065e22e6",
  ],
  v4_candidate_evidence: [
    "docs/architecture/buy-void-source-finality-compiled-artifact-v4-candidate-evidence-v1.json",
    "4a97da9816ca28bc107822a32cd7ada42bdf5540",
  ],
  v4_evidence_proof: [
    "scripts/prove_buy_void_source_finality_compiled_artifact_v4_evidence_v1.mjs",
    "44d8363463d74d1b3a6b8f05f7efa93e46b8f2dc",
  ],
  v4_evidence_doc: [
    "docs/architecture/buy-void-source-finality-compiled-artifact-v4-evidence-v1.md",
    "c2ed5ad015d2bf404d8b2f602ccbab6f227289fa",
  ],
  v4_locked_manifest: [
    "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v4.json",
    "a07f2e9b03958a58280c4d940fe49097a9413af5",
  ],
  v4_locked_proof: [
    "scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v4.mjs",
    "acd1225e7dcbb93d21bab4758728790223af16bf",
  ],
});

const V4_MARKER =
  "VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V4";
const V4_SOURCE_HEAD =
  "4423740a1bbcc1f08bed7b3ce83d18d8b2b5c92c";
const V4_GENERATION =
  "7e767d9e8977052220c60ab1e0e4c6411259aa3cfeadb7f073270ce4d2d7af06";
const V3_GENERATION =
  "0d36d26176a58cc24c2841c4363382749ccdcb2a93563989c27de36060354add";

function blob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function readPinned(path, expected) {
  const st = fs.lstatSync(path);
  assert.equal(st.isFile(), true, path + ":regular");
  assert.equal(st.isSymbolicLink(), false, path + ":symlink");
  assert.ok(st.size > 0 && st.size <= 2 * 1024 * 1024, path + ":size");
  const bytes = fs.readFileSync(path);
  assert.equal(bytes.length, st.size, path + ":stable_size");
  assert.equal(blob(bytes), expected, path + ":git_blob");
  return bytes;
}

const bytes = Object.create(null);
for (const [label, [path, expected]] of Object.entries(FILES)) {
  bytes[label] = readPinned(path, expected);
}

const v3 = JSON.parse(bytes.v3_manifest.toString("utf8"));
const candidate = JSON.parse(bytes.v4_candidate_evidence.toString("utf8"));
const locked = JSON.parse(bytes.v4_locked_manifest.toString("utf8"));

assert.equal(v3.version, 3);
assert.equal(
  v3.compiled_artifact_generation_sha256,
  V3_GENERATION,
);
assert.equal(v3.deployed_artifact_generation_verified, false);
assert.equal(v3.production_source_finality_authority_ready, false);

for (const value of [candidate, locked]) {
  assert.equal(value.marker, V4_MARKER);
  assert.equal(value.version, 4);
  assert.equal(value.source_stack_head, V4_SOURCE_HEAD);
  assert.equal(value.compiled_artifact_generation_sha256, V4_GENERATION);
  assert.equal(value.deployed_artifact_generation_verified, false);
  assert.equal(value.runtime_mount_authority, false);
  assert.equal(value.production_source_finality_authority_ready, false);
  assert.equal(value.predecessor?.manifest_git_blob_sha1, FILES.v3_manifest[1]);
  assert.equal(
    value.predecessor?.compiled_artifact_generation_sha256,
    V3_GENERATION,
  );
  assert.equal(value.artifact_count, 6);
  assert.equal(value.artifacts.length, 6);
}

assert.equal(candidate.compiled_artifact_generation_verified, false);
assert.equal(locked.compiled_artifact_generation_verified, true);
assert.deepEqual(candidate.artifacts, locked.artifacts);
assert.deepEqual(
  candidate.changed_artifact_paths,
  locked.changed_artifact_paths,
);
assert.deepEqual(
  candidate.predecessor_unchanged_artifact_paths,
  locked.predecessor_unchanged_artifact_paths,
);
assert.equal(
  candidate.reviewed_source_finality_v6_source_git_blob_sha1,
  locked.reviewed_source_finality_v6_source_git_blob_sha1,
);
assert.equal(
  candidate.verified_payment_v2_source_git_blob_sha1,
  locked.verified_payment_v2_source_git_blob_sha1,
);

const historicalCandidateSource =
  bytes.v4_candidate_script.toString("utf8");
assert.match(
  historicalCandidateSource,
  /const SOURCE_STACK_HEAD =\s*\n\s*"4423740a1bbcc1f08bed7b3ce83d18d8b2b5c92c"/u,
);
assert.match(
  historicalCandidateSource,
  /const EXPECTED_V6_SOURCE_GIT_BLOB_SHA1 =\s*\n\s*"7266c03d8874207ed3fda0f814d0a7a53d429c25"/u,
);

console.log("VOID_BUY_VOID_HISTORICAL_COMPILED_V4_PRESERVATION_V1_GREEN");
console.log("historical_v3_manifest_blob_preserved=true");
console.log("historical_v4_candidate_script_blob_preserved=true");
console.log("historical_v4_candidate_doc_blob_preserved=true");
console.log("historical_v4_candidate_evidence_blob_preserved=true");
console.log("historical_v4_locked_manifest_blob_preserved=true");
console.log("historical_v4_candidate_and_lock_generation_equal=true");
console.log("historical_v4_candidate_acceptance=false");
console.log("historical_v4_locked_acceptance=true");
console.log("historical_v4_deployed_artifact_generation_verified=false");
console.log("historical_v4_runtime_mount_authority=false");
console.log("historical_v4_production_source_finality_authority_ready=false");
console.log("historical_v4_rederived_against_current_source=false");
console.log("funds_moved=false");
