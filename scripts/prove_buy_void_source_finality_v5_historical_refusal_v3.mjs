#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WORKFLOW_REL=".github/workflows/buy-void-source-finality-compiled-artifact-attestation-v5-candidate.yml";
const V5_REL="scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v5_candidate.mjs";
const V2_REFUSAL_REL="scripts/prove_buy_void_source_finality_v5_historical_refusal_v2.mjs";
const EQUIV_REL="scripts/prove_buy_void_source_finality_dependency_build_equivalence_v1.mjs";
const V1_PROFILE_REL="ops/security/reviewed-node-package-runtime-ethers-v1.json";
const V2_PROFILE_REL="ops/security/reviewed-node-package-runtime-ethers-v2.json";
const FROZEN_V5_BLOB="d63a2a2db2b4a80b200f065f6dbf973db31f3f2e";
const FROZEN_V2_REFUSAL_BLOB="ad7a635fb4688c1ce4baab11e11a219d8d1d9df9";
const HARDENED_EQUIV_BLOB="b0240d4ec7252dc23d143228f1181fc9605663bf";
const V1_PROFILE_BLOB="87b650e28366acfea3d140ea7778f41f57e5b0c3";
const V2_PROFILE_BLOB="a09f47596fdf66afef64e82200f23966664a7d2c";
const OLD_PACKAGE_BLOB="f28c3e9446c7623ef203da36a9642d046e5f34ee";
const OLD_LOCK_BLOB="b2671f0149f522b2489247016df0a5ec4bb72b8b";
const NEW_PACKAGE_BLOB="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const NEW_LOCK_BLOB="15b5c82ea36f13079a2f9e8863722f654eb3f201";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function fileBlob(relative){
  return gitBlob(fs.readFileSync(path.join(ROOT,...relative.split("/"))));
}

assert.equal(fileBlob("package.json"),NEW_PACKAGE_BLOB);
assert.equal(fileBlob("package-lock.json"),NEW_LOCK_BLOB);
assert.equal(fileBlob(V5_REL),FROZEN_V5_BLOB);
assert.equal(fileBlob(V2_REFUSAL_REL),FROZEN_V2_REFUSAL_BLOB);
assert.equal(fileBlob(EQUIV_REL),HARDENED_EQUIV_BLOB);
assert.equal(fileBlob(V1_PROFILE_REL),V1_PROFILE_BLOB);
assert.equal(fileBlob(V2_PROFILE_REL),V2_PROFILE_BLOB);
assert.notEqual(NEW_PACKAGE_BLOB,OLD_PACKAGE_BLOB);
assert.notEqual(NEW_LOCK_BLOB,OLD_LOCK_BLOB);

const result=spawnSync(
  process.execPath,
  [path.join(ROOT,...V5_REL.split("/")),"--derive"],
  {
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:30_000,
    maxBuffer:4*1024*1024,
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
    },
  },
);
assert.equal(result.error,undefined);
assert.notEqual(result.status,0,"frozen V5 unexpectedly accepted audited package generation");
assert.match(
  String(result.stdout||"")+"\n"+String(result.stderr||""),
  /build_input_blob_mismatch:package\.json/u,
);

const workflow=fs.readFileSync(path.join(ROOT,...WORKFLOW_REL.split("/")),"utf8");
for(const relative of [
  V5_REL,
  V2_REFUSAL_REL,
  "scripts/prove_buy_void_source_finality_v5_historical_refusal_v3.mjs",
  EQUIV_REL,
  V1_PROFILE_REL,
  V2_PROFILE_REL,
  "package.json",
  "package-lock.json",
]){
  assert.ok(
    workflow.includes(`- "${relative}"`),
    "V5 workflow trigger missing trust input: "+relative,
  );
}
for(const required of [
  OLD_PACKAGE_BLOB,
  OLD_LOCK_BLOB,
  NEW_PACKAGE_BLOB,
  NEW_LOCK_BLOB,
  "mode=historical",
  "mode=audited",
  "unsupported V5 dependency generation",
]){
  assert.equal(workflow.includes(required),true,required);
}

const receipt=Object.freeze({
  schema:"void_buy_void_source_finality_v5_historical_refusal_v3",
  version:3,
  repository:"6ZoSo9/void-node",
  predecessor_v2_refusal_git_blob_sha1:FROZEN_V2_REFUSAL_BLOB,
  historical_package_generation:Object.freeze({
    package_json_git_blob_sha1:OLD_PACKAGE_BLOB,
    package_lock_git_blob_sha1:OLD_LOCK_BLOB,
  }),
  audited_package_generation:Object.freeze({
    package_json_git_blob_sha1:NEW_PACKAGE_BLOB,
    package_lock_git_blob_sha1:NEW_LOCK_BLOB,
  }),
  frozen_v5_proof_git_blob_sha1:FROZEN_V5_BLOB,
  dependency_build_equivalence_proof_git_blob_sha1:HARDENED_EQUIV_BLOB,
  frozen_v1_profile_git_blob_sha1:V1_PROFILE_BLOB,
  reviewed_v2_profile_git_blob_sha1:V2_PROFILE_BLOB,
  frozen_v5_refuses_audited_package_generation:true,
  hardened_build_equivalence_prerequisite_present:true,
  historical_v2_refusal_preserved:true,
  compiled_artifact_generation_verified:false,
  deployed_artifact_generation_verified:false,
  runtime_mount_authority:false,
  production_source_finality_authority_ready:false,
  transaction_payment_presale_wc_void_funds_authority:false,
});
process.stdout.write(JSON.stringify(receipt,null,2)+"\n");
