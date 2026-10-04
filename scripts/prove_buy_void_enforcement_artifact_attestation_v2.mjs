#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  derive as deriveEnforcementCandidateV1,
  gitBlobSha1,
} from "./prove_buy_void_enforcement_artifact_attestation_v1.mjs";

export const VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2 =
  "VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH =
  "docs/architecture/buy-void-enforcement-artifact-attestation-v2.json";
const PREDECESSOR_PATH =
  "docs/architecture/buy-void-enforcement-artifact-attestation-v1.json";
const COMPILED_V3_PATH =
  "docs/architecture/buy-void-source-finality-compiled-artifact-attestation-v3.json";

const PREDECESSOR_BLOB =
  "b9d8a57f8a67f2e9180b15a608c178bc95bf84b5";
const PREDECESSOR_SET =
  "f21b4c486ee686f53cb03e858bdff01d4b56be205c819322813538d5273062fb";
const CURRENT_CANDIDATE_BYTES = 22575;
const CURRENT_CANDIDATE_SHA256 =
  "a3905213d6a77287673546491e6aed4a95d5e5a38d0c17f79af668384cc15c87";
const CURRENT_SET =
  "904c18f848832e5772346b5cbba23dbca257f5715f4263d3ffca533be28e1038";
const CURRENT_SOURCE_HEAD_LABEL =
  "26983cd89a30bcd09c52004c7f45bb968c470122";
const CURRENT_SOURCE_TREE_LABEL =
  "6061038e977622acafd8db70c937eb190743621f";
const COMPILED_V3_BLOB =
  "46267e9433ad8eb6250d4c831dfda2054fe918f4";
const COMPILED_V3_GENERATION =
  "b85a5c8a6a7685876452f21450b154351fc0601e367866b778c1be196bb2bee2";
const REVIEWED_V5_ROOT =
  "98dd5dcc6edea14a641ce687c76ec8f6ca521844a96560c7044adbe8d4dc5161";
const V5_ENTRY_SHA =
  "c55879a2d7e577c34067e5053e5342abd4d547fc4c1327723dee1d49eaea8010";
const VERIFIED_V2_SHA =
  "babf9920062c0faec9ae525ea7c7557a77c2c5d9164c065fb1b3a31e395a8701";
const SUCCESSOR_GENERATION =
  "0b0debdf4bd94b0082f2ef99182c29afcd324545d3bdbee034b7ce0a89e6eabb";

function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    assert.equal(Number.isSafeInteger(value), true, "non-canonical number");
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  assert.equal(
    value && typeof value === "object",
    true,
    "non-canonical value",
  );
  return "{" + Object.keys(value).sort().map(
    key => JSON.stringify(key) + ":" + canonical(value[key]),
  ).join(",") + "}";
}
function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function read(relativePath, max = 32 * 1024 * 1024) {
  const absolute = path.join(ROOT, relativePath);
  const stat = fs.lstatSync(absolute);
  assert.equal(stat.isFile() && !stat.isSymbolicLink(), true, relativePath);
  assert.equal(stat.size > 0 && stat.size <= max, true, relativePath);
  const bytes = fs.readFileSync(absolute);
  assert.equal(bytes.length, stat.size, "short read:" + relativePath);
  return bytes;
}
function artifact(manifest, artifactPath) {
  const record = manifest.artifacts.find(x => x.path === artifactPath);
  assert.ok(record, "missing artifact:" + artifactPath);
  return record;
}

export function deriveBuyVoidEnforcementArtifactAttestationV2() {
  const predecessorBytes = read(PREDECESSOR_PATH);
  assert.equal(gitBlobSha1(predecessorBytes), PREDECESSOR_BLOB);
  const predecessor = JSON.parse(predecessorBytes);
  assert.equal(
    predecessor.enforcement_artifact_set_sha256,
    PREDECESSOR_SET,
  );

  const candidate = deriveEnforcementCandidateV1(ROOT);
  const candidateBytes = Buffer.from(
    JSON.stringify(candidate, null, 2) + "\n",
    "utf8",
  );
  assert.equal(candidateBytes.length, CURRENT_CANDIDATE_BYTES);
  assert.equal(sha256(candidateBytes), CURRENT_CANDIDATE_SHA256);
  assert.equal(candidate.schema, "void_buy_void_enforcement_artifact_attestation_v1");
  assert.equal(candidate.version, 1);
  assert.equal(candidate.source_head, CURRENT_SOURCE_HEAD_LABEL);
  assert.equal(candidate.source_tree, CURRENT_SOURCE_TREE_LABEL);
  assert.equal(candidate.enforcement_artifact_set_sha256, CURRENT_SET);
  assert.notEqual(candidate.enforcement_artifact_set_sha256, PREDECESSOR_SET);

  const v3Bytes = read(COMPILED_V3_PATH);
  assert.equal(gitBlobSha1(v3Bytes), COMPILED_V3_BLOB);
  const v3 = JSON.parse(v3Bytes);
  assert.equal(
    v3.compiled_artifact_generation_sha256,
    COMPILED_V3_GENERATION,
  );
  assert.equal(
    v3.reviewed_source_generation.reviewed_source_files_sha256,
    REVIEWED_V5_ROOT,
  );
  assert.equal(
    artifact(v3, "dist/economic/buy_void_source_finality_generation_provenance_v5.js").sha256,
    V5_ENTRY_SHA,
  );
  assert.equal(
    artifact(v3, "dist/economic/buy_void_verified_payment_v2.js").sha256,
    VERIFIED_V2_SHA,
  );
  assert.equal(
    artifact(candidate, "dist/economic/buy_void_source_finality_generation_provenance_v5.js").sha256,
    V5_ENTRY_SHA,
  );
  assert.equal(
    artifact(candidate, "dist/economic/buy_void_verified_payment_v2.js").sha256,
    VERIFIED_V2_SHA,
  );

  const body = Object.freeze({
    schema: "void_buy_void_enforcement_artifact_attestation_v2",
    marker: VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2,
    version: 2,
    repository: "6ZoSo9/void-node",
    predecessor: Object.freeze({
      manifest_path: PREDECESSOR_PATH,
      manifest_git_blob_sha1: PREDECESSOR_BLOB,
      enforcement_artifact_set_sha256: PREDECESSOR_SET,
    }),
    current_derivation: Object.freeze({
      generator:
        "scripts/prove_buy_void_enforcement_artifact_attestation_v1.mjs --derive",
      candidate_schema:
        "void_buy_void_enforcement_artifact_attestation_v1",
      candidate_version: 1,
      candidate_json_bytes: CURRENT_CANDIDATE_BYTES,
      candidate_json_sha256: CURRENT_CANDIDATE_SHA256,
      enforcement_artifact_set_sha256: CURRENT_SET,
      candidate_source_head_label: CURRENT_SOURCE_HEAD_LABEL,
      candidate_source_tree_label: CURRENT_SOURCE_TREE_LABEL,
    }),
    compiled_source_finality: Object.freeze({
      manifest_path: COMPILED_V3_PATH,
      manifest_git_blob_sha1: COMPILED_V3_BLOB,
      compiled_artifact_generation_sha256: COMPILED_V3_GENERATION,
      reviewed_source_files_sha256: REVIEWED_V5_ROOT,
      entry_artifact_sha256: V5_ENTRY_SHA,
      verified_payment_v2_artifact_sha256: VERIFIED_V2_SHA,
    }),
    change_reason:
      "verified_payment_log_index_uint32_domain_and_reviewed_source_rollover_v5",
    predecessor_immutable: true,
    current_derivation_cross_node_identical: true,
    derivation_node_majors: Object.freeze([22, 24, 26]),
    production_source_finality_authority_ready: false,
    deployed_artifact_generation_verified: false,
    runtime_mount_authority: false,
    funds_movement_authority: false,
  });
  const successor = sha256(
    Buffer.from(canonical(body), "utf8"),
  );
  assert.equal(successor, SUCCESSOR_GENERATION);
  return Object.freeze({
    ...body,
    successor_enforcement_generation_sha256: successor,
  });
}

export function verifyBuyVoidEnforcementArtifactAttestationV2() {
  const expected = deriveBuyVoidEnforcementArtifactAttestationV2();
  const actualBytes = read(MANIFEST_PATH);
  const expectedBytes = Buffer.from(
    JSON.stringify(expected, null, 2) + "\n",
    "utf8",
  );
  assert.equal(actualBytes.equals(expectedBytes), true, "v2 manifest mismatch");
  return expected;
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--derive") {
  process.stdout.write(
    JSON.stringify(deriveBuyVoidEnforcementArtifactAttestationV2(), null, 2) +
      "\n",
  );
} else {
  assert.equal(args.length, 0, "invalid arguments");
  const result = verifyBuyVoidEnforcementArtifactAttestationV2();
  console.log(VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2 + "_GREEN");
  console.log(
    "successor_enforcement_generation_sha256=" +
      result.successor_enforcement_generation_sha256,
  );
  console.log(
    "current_enforcement_artifact_set_sha256=" +
      result.current_derivation.enforcement_artifact_set_sha256,
  );
  console.log("predecessor_immutable=true");
  console.log("production_source_finality_authority_ready=false");
  console.log("deployed_artifact_generation_verified=false");
  console.log("funds_movement_authority=false");
}
