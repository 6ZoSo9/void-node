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

export const VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V3 =
  "VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V3";

export const MANIFEST =
  "docs/architecture/buy-void-enforcement-artifact-attestation-v3.json";

const PREDECESSOR_MANIFEST =
  "docs/architecture/buy-void-enforcement-artifact-attestation-v2.json";
const PREDECESSOR_MANIFEST_GIT_BLOB_SHA1 =
  "66fbd9b41584868bce89f894d5d8a855e861c244";
const PREDECESSOR_ENFORCEMENT_SET_SHA256 =
  "5b35c2c4e1c9c7812ddbcb2f35ea5f309771e5343230331780b81323eb11cc30";
const CURRENT_ENFORCEMENT_SET_SHA256 =
  "7d6e000770a83a32e3c4706ac29f3474041a5376f2009c71e5ba00d04a1cdc3f";

const CHANGED_ARTIFACT =
  "dist/economic/buy_void_filesystem_bakery_lock_v1.js";
const CHANGED_INPUT =
  "src/economic/buy_void_filesystem_bakery_lock_v1.ts";

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
  return Object.freeze({
    removed: [...previous.keys()]
      .filter((key) => !current.has(key)).sort(),
    added: [...current.keys()]
      .filter((key) => !previous.has(key)).sort(),
    changed: [...previous.keys()]
      .filter(
        (key) =>
          current.has(key) &&
          canonical(previous.get(key)) !== canonical(current.get(key)),
      ).sort(),
    unchanged: [...previous.keys()]
      .filter(
        (key) =>
          current.has(key) &&
          canonical(previous.get(key)) === canonical(current.get(key)),
      ).sort(),
  });
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

export function deriveBuyVoidEnforcementArtifactAttestationV3(root = ROOT) {
  const predecessor = parseBoundJson(
    PREDECESSOR_MANIFEST,
    PREDECESSOR_MANIFEST_GIT_BLOB_SHA1,
  );
  assert.equal(
    predecessor.schema,
    "void_buy_void_enforcement_artifact_attestation_v2",
  );
  assert.equal(
    predecessor.marker,
    "VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2",
  );
  assert.equal(predecessor.version, 2);
  assert.equal(
    predecessor.enforcement_artifact_set_sha256,
    PREDECESSOR_ENFORCEMENT_SET_SHA256,
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
  assert.deepEqual(artifactDelta.removed, []);
  assert.deepEqual(artifactDelta.added, []);
  assert.deepEqual(artifactDelta.changed, [CHANGED_ARTIFACT]);
  assert.equal(artifactDelta.unchanged.length, 22);

  const inputDelta = recordDelta(
    predecessor.inputs,
    candidate.inputs,
  );
  assert.deepEqual(inputDelta.removed, []);
  assert.deepEqual(inputDelta.added, []);
  assert.deepEqual(inputDelta.changed, [CHANGED_INPUT]);
  assert.equal(inputDelta.unchanged.length, 29);

  return Object.freeze({
    schema: "void_buy_void_enforcement_artifact_attestation_v3",
    marker: VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V3,
    version: 3,
    repository: candidate.repository,
    predecessor: Object.freeze({
      schema: predecessor.schema,
      marker: predecessor.marker,
      manifest_path: PREDECESSOR_MANIFEST,
      manifest_git_blob_sha1: PREDECESSOR_MANIFEST_GIT_BLOB_SHA1,
      enforcement_artifact_set_sha256:
        PREDECESSOR_ENFORCEMENT_SET_SHA256,
    }),
    reviewed_source_generation:
      Object.freeze({ ...predecessor.reviewed_source_generation }),
    compiled_artifact_generation:
      Object.freeze({ ...predecessor.compiled_artifact_generation }),
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
  const expected = deriveBuyVoidEnforcementArtifactAttestationV3(root);
  const manifestBytes = read(ROOT, MANIFEST);
  const exact = Buffer.from(
    JSON.stringify(expected, null, 2) + "\n",
    "utf8",
  );
  assert.equal(
    manifestBytes.equals(exact),
    true,
    "enforcement V3 manifest mismatch",
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
        deriveBuyVoidEnforcementArtifactAttestationV3(),
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
      "VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V3_GREEN",
    );
    console.log(
      "enforcement_artifact_set_sha256=" +
        verified.expected.enforcement_artifact_set_sha256,
    );
    console.log("predecessor_v2_manifest_bound=true");
    console.log("bakery_lock_delta_exact=true");
    console.log("production_source_finality_authority_ready=false");
    console.log("deployed_artifact_generation_verified=false");
  }
}
