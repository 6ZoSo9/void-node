#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  readReviewedNodePackageRuntimeProfileV1,
  verifyReviewedNodePackageRuntimeV1,
} from "../tools/void-reviewed-node-package-runtime-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WORKFLOW_REL=".github/workflows/void-reviewed-node-package-runtime-v1.yml";
const EXPECTED_TOOL_BLOB="6475c3f18ffe566cf5f448ca1de4795391a6efde";
const EXPECTED_V1_PROOF_BLOB="f715884ffccc1e50e49a30e1eadee409d08623c8";
const EXPECTED_V1_PROFILE_BLOB="87b650e28366acfea3d140ea7778f41f57e5b0c3";
const EXPECTED_PACKAGE_BLOB="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const EXPECTED_LOCK_BLOB="15b5c82ea36f13079a2f9e8863722f654eb3f201";
const HISTORICAL_PACKAGE_BLOB="f28c3e9446c7623ef203da36a9642d046e5f34ee";
const HISTORICAL_LOCK_BLOB="b2671f0149f522b2489247016df0a5ec4bb72b8b";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}
function fileBlob(relative){
  return gitBlob(fs.readFileSync(path.join(ROOT,...relative.split("/"))));
}

assert.equal(
  fileBlob("tools/void-reviewed-node-package-runtime-v1.mjs"),
  EXPECTED_TOOL_BLOB,
);
assert.equal(
  fileBlob("scripts/prove_void_reviewed_node_package_runtime_v1.mjs"),
  EXPECTED_V1_PROOF_BLOB,
);
assert.equal(
  fileBlob("ops/security/reviewed-node-package-runtime-ethers-v1.json"),
  EXPECTED_V1_PROFILE_BLOB,
);
assert.equal(fileBlob("package.json"),EXPECTED_PACKAGE_BLOB);
assert.equal(fileBlob("package-lock.json"),EXPECTED_LOCK_BLOB);
assert.notEqual(EXPECTED_PACKAGE_BLOB,HISTORICAL_PACKAGE_BLOB);
assert.notEqual(EXPECTED_LOCK_BLOB,HISTORICAL_LOCK_BLOB);

const frozen=readReviewedNodePackageRuntimeProfileV1({
  relativePath:"ops/security/reviewed-node-package-runtime-ethers-v1.json",
});
assert.equal(frozen.profile_source.git_blob_sha1,EXPECTED_V1_PROFILE_BLOB);
assert.equal(
  frozen.profile.package_json_source.git_blob_sha1,
  HISTORICAL_PACKAGE_BLOB,
);
assert.equal(
  frozen.profile.package_lock_source.git_blob_sha1,
  HISTORICAL_LOCK_BLOB,
);
assert.throws(
  ()=>verifyReviewedNodePackageRuntimeV1({profile:frozen.profile}),
  /reviewed_node_runtime_profile_mismatch/u,
);

const workflow=fs.readFileSync(path.join(ROOT,...WORKFLOW_REL.split("/")),"utf8");
for(const relative of [
  WORKFLOW_REL,
  "scripts/prove_void_reviewed_node_package_runtime_v1.mjs",
  "scripts/prove_void_reviewed_node_package_runtime_v1_historical_refusal_v2.mjs",
  "tools/void-reviewed-node-package-runtime-v1.mjs",
  "ops/security/reviewed-node-package-runtime-ethers-v1.json",
  "package.json",
  "package-lock.json",
]){
  const occurrences=workflow.split(`- "${relative}"`).length-1;
  assert.equal(
    occurrences,
    2,
    "V1 workflow PR/push trigger missing or duplicated: "+relative,
  );
}
for(const required of [
  HISTORICAL_PACKAGE_BLOB,
  HISTORICAL_LOCK_BLOB,
  EXPECTED_PACKAGE_BLOB,
  EXPECTED_LOCK_BLOB,
  "reviewed_node_runtime_v1_mode=historical_positive",
  "reviewed_node_runtime_v1_mode=historical_refusal",
  "unsupported reviewed Node package generation",
]){
  assert.equal(workflow.includes(required),true,required);
}

console.log("VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1_HISTORICAL_REFUSAL_V2_GREEN");
console.log("frozen_v1_bytes_unchanged=true");
console.log("frozen_v1_refuses_audited_package_generation=true");
console.log("historical_positive_mode_preserved=true");
console.log("unknown_package_generation_accepted=false");
console.log("runtime_chain_wallet_transaction_funds_authority=0");
