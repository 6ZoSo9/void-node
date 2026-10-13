#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASELINE_COMMIT="68d9122fa557718882e36858906b960efa0acf3a";
const OLD_PACKAGE_BLOB="f28c3e9446c7623ef203da36a9642d046e5f34ee";
const OLD_LOCK_BLOB="b2671f0149f522b2489247016df0a5ec4bb72b8b";
const NEW_PACKAGE_BLOB="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const NEW_LOCK_BLOB="15b5c82ea36f13079a2f9e8863722f654eb3f201";
const FROZEN_V5_PROOF_BLOB="d63a2a2db2b4a80b200f065f6dbf973db31f3f2e";
const FROZEN_V1_PROFILE_BLOB="87b650e28366acfea3d140ea7778f41f57e5b0c3";
const V2_PROFILE_BLOB="a09f47596fdf66afef64e82200f23966664a7d2c";
const V2_PROFILE_ID="voidrnpr1_7cfd6b67e6c2bde498196fa8bc880031ea24f95942c194ee7e6f553054c08451";
const PACKAGES_AGGREGATE="5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73";
const MAX_BYTES=16*1024*1024;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WORKFLOW_REL=".github/workflows/buy-void-source-finality-dependency-build-equivalence-v1.yml";

const SOURCE_PATHS=Object.freeze([
  "src/economic/buy_void_source_finality_generation_provenance_v6.ts",
  "src/economic/buy_void_source_finality_authenticated_composition_v3.ts",
  "src/economic/buy_void_source_finality_authority_v2.ts",
  "src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts",
  "src/economic/buy_void_payment_rpc_observer_v1.ts",
  "src/economic/buy_void_verified_payment_v2.ts",
  "tsconfig.build.json",
  "scripts/copy_void_runtime_js_v1.mjs",
  "scripts/retire_saveblock_periodic_rewriters_v1.mjs",
]);
const TRIGGER_PATHS=Object.freeze([
  "package.json",
  "package-lock.json",
  "ops/security/reviewed-node-package-runtime-ethers-v1.json",
  "ops/security/reviewed-node-package-runtime-ethers-v2.json",
  "scripts/prove_void_reviewed_node_package_runtime_v2.mjs",
  "scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v5_candidate.mjs",
  "scripts/prove_buy_void_source_finality_dependency_build_equivalence_v1.mjs",
  ...SOURCE_PATHS,
  WORKFLOW_REL,
]);

const ARTIFACT_PATHS=Object.freeze([
  "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
  "dist/economic/buy_void_verified_payment_v2.js",
]);

function fail(message){ throw new Error(message); }
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function sha256(bytes){ return crypto.createHash("sha256").update(bytes).digest("hex"); }
function read(root,relative,maxBytes=MAX_BYTES){
  const absolute=path.join(root,...relative.split("/"));
  const st=fs.lstatSync(absolute);
  if(!st.isFile()||st.isSymbolicLink()||st.size<1||st.size>maxBytes){
    fail("invalid_file:"+relative);
  }
  const bytes=fs.readFileSync(absolute);
  if(bytes.length!==st.size) fail("short_read:"+relative);
  return bytes;
}
function blob(root,relative){ return gitBlob(read(root,relative)); }
function arg(name){
  const i=process.argv.indexOf(name);
  if(i<0||!process.argv[i+1]) fail("missing_argument:"+name);
  return path.resolve(process.argv[i+1]);
}

const baseline=arg("--baseline");
const current=arg("--current");
const baselineCandidatePath=arg("--baseline-v5-candidate");

const workflowText=fs.readFileSync(path.join(ROOT,...WORKFLOW_REL.split("/")),"utf8");
assert.equal(workflowText.includes("workflow_dispatch:"),false,"unsupported manual dispatch trigger present");
for(const relative of TRIGGER_PATHS){
  assert.ok(
    workflowText.includes(`- "${relative}"`),
    "workflow trigger missing reviewed dependency: "+relative,
  );
}

assert.equal(blob(baseline,"package.json"),OLD_PACKAGE_BLOB);
assert.equal(blob(baseline,"package-lock.json"),OLD_LOCK_BLOB);
assert.equal(blob(current,"package.json"),NEW_PACKAGE_BLOB);
assert.equal(blob(current,"package-lock.json"),NEW_LOCK_BLOB);
assert.equal(blob(baseline,"scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v5_candidate.mjs"),FROZEN_V5_PROOF_BLOB);
assert.equal(blob(current,"scripts/prove_buy_void_source_finality_compiled_artifact_attestation_v5_candidate.mjs"),FROZEN_V5_PROOF_BLOB);
assert.equal(blob(baseline,"ops/security/reviewed-node-package-runtime-ethers-v1.json"),FROZEN_V1_PROFILE_BLOB);
assert.equal(blob(current,"ops/security/reviewed-node-package-runtime-ethers-v1.json"),FROZEN_V1_PROFILE_BLOB);
assert.equal(blob(current,"ops/security/reviewed-node-package-runtime-ethers-v2.json"),V2_PROFILE_BLOB);

for(const relative of SOURCE_PATHS){
  assert.equal(
    blob(current,relative),
    blob(baseline,relative),
    "source/build input unexpectedly changed: "+relative,
  );
}

const v2=JSON.parse(read(current,"ops/security/reviewed-node-package-runtime-ethers-v2.json"));
assert.equal(v2.profile_id,V2_PROFILE_ID);
assert.equal(v2.package_json_source?.git_blob_sha1,NEW_PACKAGE_BLOB);
assert.equal(v2.package_lock_source?.git_blob_sha1,NEW_LOCK_BLOB);
assert.equal(v2.packages_aggregate_sha256,PACKAGES_AGGREGATE);
assert.equal(v2.package_count,9);

const baselineCandidate=JSON.parse(fs.readFileSync(baselineCandidatePath,"utf8"));
assert.equal(baselineCandidate.schema,"void_buy_void_source_finality_compiled_artifact_attestation_v5");
assert.equal(baselineCandidate.compiled_artifact_generation_verified,false);
assert.equal(baselineCandidate.deployed_artifact_generation_verified,false);
assert.equal(baselineCandidate.runtime_mount_authority,false);
assert.equal(baselineCandidate.production_source_finality_authority_ready,false);
assert.deepEqual(
  baselineCandidate.artifacts.map(row=>row.path),
  [...ARTIFACT_PATHS],
);

const artifacts=[];
for(const relative of ARTIFACT_PATHS){
  const before=read(baseline,relative);
  const after=read(current,relative);
  assert.equal(Buffer.compare(after,before),0,"compiled artifact drift: "+relative);
  const candidateRow=baselineCandidate.artifacts.find(row=>row.path===relative);
  assert.ok(candidateRow,"baseline V5 candidate missing artifact: "+relative);
  assert.equal(candidateRow.bytes,after.length,"baseline candidate byte count drift: "+relative);
  assert.equal(candidateRow.sha256,sha256(after),"baseline candidate digest drift: "+relative);
  artifacts.push(Object.freeze({
    path:relative,
    bytes:after.length,
    sha256:sha256(after),
  }));
}

const receipt=Object.freeze({
  schema:"void_buy_void_source_finality_dependency_build_equivalence_v1",
  version:1,
  repository:"6ZoSo9/void-node",
  baseline_commit:BASELINE_COMMIT,
  historical_package_generation:Object.freeze({
    package_json_git_blob_sha1:OLD_PACKAGE_BLOB,
    package_lock_git_blob_sha1:OLD_LOCK_BLOB,
  }),
  audited_package_generation:Object.freeze({
    package_json_git_blob_sha1:NEW_PACKAGE_BLOB,
    package_lock_git_blob_sha1:NEW_LOCK_BLOB,
    reviewed_package_profile_git_blob_sha1:V2_PROFILE_BLOB,
    reviewed_package_profile_id:V2_PROFILE_ID,
    installed_packages_aggregate_sha256:PACKAGES_AGGREGATE,
  }),
  frozen_v5_candidate_script_git_blob_sha1:FROZEN_V5_PROOF_BLOB,
  baseline_v5_candidate_generation:baselineCandidate.compiled_artifact_generation_sha256,
  source_and_build_semantics_unchanged:true,
  compiled_artifact_bytes_equal:true,
  artifacts:Object.freeze(artifacts),
  frozen_v5_refuses_audited_package_generation:true,
  compiled_artifact_generation_verified:false,
  deployed_artifact_generation_verified:false,
  production_source_finality_authority_ready:false,
  runtime_service_mutation:false,
  wallet_signer_transaction_payment_funds_authority:false,
});

process.stdout.write(JSON.stringify(receipt,null,2)+"\n");
