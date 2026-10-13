#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASELINE_COMMIT="0ac56eba7ec488fec94cfce89698a7febfedc0b6";
const OLD_PACKAGE_BLOB="f28c3e9446c7623ef203da36a9642d046e5f34ee";
const OLD_LOCK_BLOB="b2671f0149f522b2489247016df0a5ec4bb72b8b";
const NEW_PACKAGE_BLOB="14fbdf5717b07fd4c734f5da7a8e84ed59bee93f";
const NEW_LOCK_BLOB="15b5c82ea36f13079a2f9e8863722f654eb3f201";
const FROZEN_V1_PROOF_BLOB="62476d1d22d6b32ff14e7327ecaaa0f858033faa";
const COMPILED="dist/economic/buy_void_erc20_execution_composition_v1.js";
const SOURCE_PATHS=Object.freeze([
  "src/economic/buy_void_erc20_execution_composition_v1.ts",
  "tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
  "Dockerfile",
  "tsconfig.build.json",
  "scripts/copy_void_runtime_js_v1.mjs",
  "scripts/retire_saveblock_periodic_rewriters_v1.mjs",
  "scripts/prove_buy_void_enforcement_descriptor_relative_linux_v1.mjs",
  "scripts/prove_buy_void_reviewed_git_invocation_v1.mjs",
]);
const MAX_BYTES=16*1024*1024;

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

const baselineRoot=arg("--baseline");
const currentRoot=arg("--current");
const baselineReceiptPath=arg("--baseline-v1-receipt");
const currentHoldPath=arg("--current-v1-hold");

assert.equal(blob(baselineRoot,"package.json"),OLD_PACKAGE_BLOB);
assert.equal(blob(baselineRoot,"package-lock.json"),OLD_LOCK_BLOB);
assert.equal(blob(currentRoot,"package.json"),NEW_PACKAGE_BLOB);
assert.equal(blob(currentRoot,"package-lock.json"),NEW_LOCK_BLOB);
assert.equal(
  blob(baselineRoot,"scripts/prove_buy_void_compiled_saga_loader_inert_resolution_v1.mjs"),
  FROZEN_V1_PROOF_BLOB,
);
assert.equal(
  blob(currentRoot,"scripts/prove_buy_void_compiled_saga_loader_inert_resolution_v1.mjs"),
  FROZEN_V1_PROOF_BLOB,
);

const sourceInputs=[];
for(const relative of SOURCE_PATHS){
  const before=blob(baselineRoot,relative);
  const after=blob(currentRoot,relative);
  assert.equal(after,before,"source/build input unexpectedly changed: "+relative);
  sourceInputs.push(Object.freeze({path:relative,git_blob_sha1:after}));
}

const baselineReceipt=JSON.parse(fs.readFileSync(baselineReceiptPath,"utf8"));
assert.equal(
  baselineReceipt.schema,
  "void_buy_void_compiled_saga_loader_inert_resolution_v1",
);
assert.equal(baselineReceipt.extracted_compiled_factory_shape_verified,true);
assert.equal(baselineReceipt.exact_compiled_factory_executed_with_inert_tool,true);
assert.equal(baselineReceipt.real_saga_module_imported,false);
assert.equal(baselineReceipt.stopped_image_runtime_loader_qualified,false);
assert.equal(baselineReceipt.packaged_image_generation_accepted,false);
assert.equal(baselineReceipt.production_source_finality_authority_ready,false);
assert.equal(baselineReceipt.accepted_enforcement_v5,false);
assert.equal(baselineReceipt.presale_activation,false);
assert.equal(baselineReceipt.funds_moved,false);

const currentHold=fs.readFileSync(currentHoldPath,"utf8");
assert.match(currentHold,/source input identity drift: package-lock\.json/u);

const beforeCompiled=read(baselineRoot,COMPILED,2*1024*1024);
const afterCompiled=read(currentRoot,COMPILED,2*1024*1024);
assert.equal(
  Buffer.compare(afterCompiled,beforeCompiled),
  0,
  "compiled saga importer drift under audited dependency generation",
);
const compiledSha=sha256(afterCompiled);
assert.equal(afterCompiled.length,baselineReceipt.compiled_importer_bytes);
assert.equal(compiledSha,baselineReceipt.compiled_importer_sha256);

const receipt=Object.freeze({
  schema:"void_buy_void_compiled_saga_loader_dependency_equivalence_v2",
  version:2,
  repository:"6ZoSo9/void-node",
  historical_baseline_commit:BASELINE_COMMIT,
  historical_package_generation:Object.freeze({
    package_json_git_blob_sha1:OLD_PACKAGE_BLOB,
    package_lock_git_blob_sha1:OLD_LOCK_BLOB,
  }),
  audited_package_generation:Object.freeze({
    package_json_git_blob_sha1:NEW_PACKAGE_BLOB,
    package_lock_git_blob_sha1:NEW_LOCK_BLOB,
  }),
  frozen_v1_proof_git_blob_sha1:FROZEN_V1_PROOF_BLOB,
  source_build_inputs:Object.freeze(sourceInputs),
  historical_v1_positive:true,
  audited_generation_v1_refusal:true,
  compiled_importer_path:COMPILED,
  compiled_importer_bytes:afterCompiled.length,
  compiled_importer_sha256:compiledSha,
  compiled_factory_source_sha256:baselineReceipt.compiled_factory_source_sha256,
  compiled_importer_bytes_equal:true,
  extracted_compiled_factory_shape_verified:true,
  inert_loader_behavior_preserved:true,
  real_saga_module_imported:false,
  stopped_image_runtime_loader_qualified:false,
  packaged_image_generation_accepted:false,
  deployed_artifact_generation_verified:false,
  production_source_finality_authority_ready:false,
  accepted_enforcement_v5:false,
  presale_activation:false,
  wallet_signer_transaction_payment_funds_authority:false,
});
process.stdout.write(JSON.stringify(receipt,null,2)+"\n");
