#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ROOT,
  canonical,
  derive as deriveEnforcementV1,
  falsifiers,
  gitBlobSha1,
  proveCompiledGate,
  read,
  verify as verifyEnforcementV1,
} from "./prove_buy_void_enforcement_artifact_attestation_v1.mjs";

export const VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2 =
  "VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2";

export const MANIFEST =
  "docs/architecture/buy-void-enforcement-artifact-attestation-v2.json";

const PREDECESSOR_MANIFEST =
  "docs/architecture/buy-void-enforcement-artifact-attestation-v1.json";
const PREDECESSOR_MANIFEST_GIT_BLOB_SHA1 =
  "b9d8a57f8a67f2e9180b15a608c178bc95bf84b5";
const PREDECESSOR_ENFORCEMENT_SET_SHA256 =
  "f21b4c486ee686f53cb03e858bdff01d4b56be205c819322813538d5273062fb";

const COMPILED_V3_MANIFEST =
  "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v3.json";
const COMPILED_V3_MANIFEST_GIT_BLOB_SHA1 =
  "d6e97784c5d8be93713e733628c7d1ef746bb5c7";
const COMPILED_V3_GENERATION_SHA256 =
  "0d36d26176a58cc24c2841c4363382749ccdcb2a93563989c27de36060354add";
const REVIEWED_SOURCE_V5_SHA256 =
  "554eecb2254ecfeb7495314b019247f4a3a7b317a6431e54b78fe95cb675d14e";
const CURRENT_ENFORCEMENT_SET_SHA256 =
  "5b35c2c4e1c9c7812ddbcb2f35ea5f309771e5343230331780b81323eb11cc30";

const EXPECTED_REMOVED_ARTIFACTS = Object.freeze([
  "dist/economic/buy_void_source_finality_generation_provenance_v4.js",
]);
const EXPECTED_ADDED_ARTIFACTS = Object.freeze([
  "dist/economic/buy_void_source_finality_generation_provenance_v5.js",
]);
const EXPECTED_CHANGED_ARTIFACTS = Object.freeze([
  "dist/economic/buy_void_source_finality_execution_preflight_v1.js",
  "dist/economic/buy_void_verified_payment_v2.js",
]);

const EXPECTED_REMOVED_INPUTS = Object.freeze([
  "src/economic/buy_void_source_finality_generation_provenance_v4.ts",
]);
const EXPECTED_ADDED_INPUTS = Object.freeze([
  "src/economic/buy_void_source_finality_generation_provenance_v5.ts",
]);
const EXPECTED_CHANGED_INPUTS = Object.freeze([
  "src/economic/buy_void_source_finality_execution_preflight_v1.ts",
  "src/economic/buy_void_verified_payment_v2.ts",
]);

function parseBoundJson(relativePath, expectedBlob) {
  const bytes = read(ROOT, relativePath);
  assert.equal(
    gitBlobSha1(bytes),
    expectedBlob,
    "bound manifest Git blob mismatch: " + relativePath,
  );
  return JSON.parse(bytes.toString("utf8"));
}

function byPath(records) {
  return new Map(records.map((record) => [record.path, record]));
}

function recordDelta(previousRecords, currentRecords) {
  const previous = byPath(previousRecords);
  const current = byPath(currentRecords);
  const removed = [...previous.keys()]
    .filter((key) => !current.has(key))
    .sort();
  const added = [...current.keys()]
    .filter((key) => !previous.has(key))
    .sort();
  const changed = [...previous.keys()]
    .filter(
      (key) =>
        current.has(key) &&
        canonical(previous.get(key)) !== canonical(current.get(key)),
    )
    .sort();
  const unchanged = [...previous.keys()]
    .filter(
      (key) =>
        current.has(key) &&
        canonical(previous.get(key)) === canonical(current.get(key)),
    )
    .sort();
  return Object.freeze({ removed, added, changed, unchanged });
}

function assertExactDelta(actual, expectedRemoved, expectedAdded, expectedChanged) {
  assert.deepEqual(actual.removed, [...expectedRemoved].sort());
  assert.deepEqual(actual.added, [...expectedAdded].sort());
  assert.deepEqual(actual.changed, [...expectedChanged].sort());
}

function currentCandidateFromManifest(manifest) {
  return Object.freeze({
    schema: "void_buy_void_enforcement_artifact_attestation_v1",
    version: 1,
    repository: manifest.repository,
    source_head: manifest.source_head,
    source_tree: manifest.source_tree,
    entry_artifact: manifest.entry_artifact,
    artifacts: manifest.artifacts,
    inputs: manifest.inputs,
    source_artifact_mapping: manifest.source_artifact_mapping,
    compiler: manifest.compiler,
    absent_build_inputs: manifest.absent_build_inputs,
    build_command: manifest.build_command,
    derivation_node_majors: manifest.derivation_node_majors,
    external_dependency_boundary: manifest.external_dependency_boundary,
    production_source_finality_authority_ready:
      manifest.production_source_finality_authority_ready,
    deployed_artifact_generation_verified:
      manifest.deployed_artifact_generation_verified,
    enforcement_artifact_set_sha256:
      manifest.enforcement_artifact_set_sha256,
  });
}

export function deriveBuyVoidEnforcementArtifactAttestationV2(root = ROOT) {
  const predecessor = parseBoundJson(
    PREDECESSOR_MANIFEST,
    PREDECESSOR_MANIFEST_GIT_BLOB_SHA1,
  );
  assert.equal(
    predecessor.schema,
    "void_buy_void_enforcement_artifact_attestation_v1",
  );
  assert.equal(predecessor.version, 1);
  assert.equal(
    predecessor.enforcement_artifact_set_sha256,
    PREDECESSOR_ENFORCEMENT_SET_SHA256,
  );

  const compiledV3 = parseBoundJson(
    COMPILED_V3_MANIFEST,
    COMPILED_V3_MANIFEST_GIT_BLOB_SHA1,
  );
  assert.equal(
    compiledV3.marker,
    "VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V3",
  );
  assert.equal(
    compiledV3.compiled_artifact_generation_sha256,
    COMPILED_V3_GENERATION_SHA256,
  );
  assert.equal(
    compiledV3.reviewed_source_generation?.reviewed_source_files_sha256,
    REVIEWED_SOURCE_V5_SHA256,
  );

  const candidate = deriveEnforcementV1(root);
  assert.equal(
    candidate.enforcement_artifact_set_sha256,
    CURRENT_ENFORCEMENT_SET_SHA256,
  );

  const artifactDelta = recordDelta(
    predecessor.artifacts,
    candidate.artifacts,
  );
  assertExactDelta(
    artifactDelta,
    EXPECTED_REMOVED_ARTIFACTS,
    EXPECTED_ADDED_ARTIFACTS,
    EXPECTED_CHANGED_ARTIFACTS,
  );
  assert.equal(artifactDelta.unchanged.length, 20);

  const inputDelta = recordDelta(
    predecessor.inputs,
    candidate.inputs,
  );
  assertExactDelta(
    inputDelta,
    EXPECTED_REMOVED_INPUTS,
    EXPECTED_ADDED_INPUTS,
    EXPECTED_CHANGED_INPUTS,
  );
  assert.equal(inputDelta.unchanged.length, 27);

  const compiledByPath = byPath(compiledV3.artifacts);
  const currentByPath = byPath(candidate.artifacts);
  for (const [artifactPath, expected] of compiledByPath) {
    const observed = currentByPath.get(artifactPath);
    assert.ok(observed, "compiled V3 artifact absent from enforcement closure: " + artifactPath);
    assert.equal(observed.bytes, expected.bytes);
    assert.equal(observed.sha256, expected.sha256);
  }

  const sourceByPath = byPath(candidate.inputs);
  assert.equal(
    sourceByPath.get("src/economic/buy_void_verified_payment_v2.ts")?.git_blob_sha1,
    compiledV3.verified_payment_v2_source_git_blob_sha1,
  );
  assert.equal(
    sourceByPath.get(
      "src/economic/buy_void_source_finality_generation_provenance_v5.ts",
    )?.git_blob_sha1,
    "0804a50b87c089e2d03bbca716641d7211e6a8bc",
  );

  return Object.freeze({
    schema: "void_buy_void_enforcement_artifact_attestation_v2",
    marker: VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2,
    version: 2,
    repository: candidate.repository,
    predecessor: Object.freeze({
      schema: predecessor.schema,
      manifest_path: PREDECESSOR_MANIFEST,
      manifest_git_blob_sha1: PREDECESSOR_MANIFEST_GIT_BLOB_SHA1,
      enforcement_artifact_set_sha256:
        PREDECESSOR_ENFORCEMENT_SET_SHA256,
    }),
    reviewed_source_generation: Object.freeze({
      marker:
        "VOID_BUY_VOID_SOURCE_FINALITY_GENERATION_PROVENANCE_V5",
      source_stack_head: compiledV3.source_stack_head,
      reviewed_source_files_sha256: REVIEWED_SOURCE_V5_SHA256,
    }),
    compiled_artifact_generation: Object.freeze({
      marker:
        "VOID_BUY_VOID_SOURCE_FINALITY_COMPILED_ARTIFACT_ATTESTATION_V3",
      manifest_path: COMPILED_V3_MANIFEST,
      manifest_git_blob_sha1: COMPILED_V3_MANIFEST_GIT_BLOB_SHA1,
      compiled_artifact_generation_sha256:
        COMPILED_V3_GENERATION_SHA256,
    }),
    source_head: candidate.source_head,
    source_tree: candidate.source_tree,
    entry_artifact: candidate.entry_artifact,
    artifacts: candidate.artifacts,
    inputs: candidate.inputs,
    source_artifact_mapping: candidate.source_artifact_mapping,
    compiler: candidate.compiler,
    absent_build_inputs: candidate.absent_build_inputs,
    build_command: candidate.build_command,
    derivation_node_majors: candidate.derivation_node_majors,
    external_dependency_boundary:
      candidate.external_dependency_boundary,
    predecessor_delta: Object.freeze({
      removed_artifact_paths: artifactDelta.removed,
      added_artifact_paths: artifactDelta.added,
      changed_artifact_paths: artifactDelta.changed,
      unchanged_artifact_count: artifactDelta.unchanged.length,
      removed_input_paths: inputDelta.removed,
      added_input_paths: inputDelta.added,
      changed_input_paths: inputDelta.changed,
      unchanged_input_count: inputDelta.unchanged.length,
    }),
    enforcement_artifact_set_sha256:
      candidate.enforcement_artifact_set_sha256,
    production_source_finality_authority_ready: false,
    deployed_artifact_generation_verified: false,
  });
}

function verifyCommitted(root = ROOT) {
  const expected = deriveBuyVoidEnforcementArtifactAttestationV2(root);
  const manifestBytes = read(ROOT, MANIFEST);
  const exact = Buffer.from(
    JSON.stringify(expected, null, 2) + "\n",
    "utf8",
  );
  assert.equal(
    manifestBytes.equals(exact),
    true,
    "enforcement V2 manifest mismatch",
  );
  const parsed = JSON.parse(manifestBytes.toString("utf8"));
  const candidate = currentCandidateFromManifest(parsed);
  verifyEnforcementV1(root, candidate);
  return Object.freeze({ expected: parsed, candidate });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--derive") {
    process.stdout.write(
      JSON.stringify(
        deriveBuyVoidEnforcementArtifactAttestationV2(),
        null,
        2,
      ) + "\n",
    );
  } else {
    assert.ok(
      args.length === 0 ||
        (args.length === 2 && args[0] === "--packaged-root"),
      "invalid arguments",
    );
    const target =
      args.length === 2 ? path.resolve(args[1]) : ROOT;
    const verified = verifyCommitted(target);
    await proveCompiledGate(target);
    falsifiers(verified.candidate);
    console.log(
      "VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2_GREEN",
    );
    console.log(
      "enforcement_artifact_set_sha256=" +
        verified.expected.enforcement_artifact_set_sha256,
    );
    console.log(
      "compiled_artifact_generation_sha256=" +
        verified.expected.compiled_artifact_generation
          .compiled_artifact_generation_sha256,
    );
    console.log("predecessor_v1_manifest_bound=true");
    console.log("predecessor_delta_exact=true");
    console.log("production_source_finality_authority_ready=false");
    console.log("deployed_artifact_generation_verified=false");
  }
}
