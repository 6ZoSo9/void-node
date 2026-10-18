#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V2";
const BASE_HEAD="d3e7404791622541a4567ddd506f27caba60cfea";
const ECONOMIC_TREE="71c67e62a2b21a98f3f5135ee6aa56e0ef97d262";

const CANDIDATE_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json";
const CANDIDATE_BLOB="4e23ecbb64eb26c14f5ab15af85eb86d59c3a718";
const CANDIDATE_BYTES=16342;
const CANDIDATE_SHA256="092a97373013d32dda610df7363587fa3a669f33248a37420b07541d12d892bb";
const CANDIDATE_SET="05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852";
const PROTECTED_INVENTORY="224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2";

const LOCK_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const LOCK_BLOB="589845615654da8b688764377b34296267ac0063";
const LOCK_SHA256="06af643df1a807a7d2c3582f6650967575d53874d5bf1277a0f1039bbad6ccd9";
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v2.mjs";
const CANDIDATE_PROOF_BLOB="5cb990d0ef680f80292bed5f6b28c11d4ee1ffed";

const PROVIDER_EVIDENCE="ops/security/buy-void-delivery-dependency-provider-closure-post2865-v1.json";
const PROVIDER_EVIDENCE_BLOB="b08c03912e0f66742f06f314bf5e1f5cad81f20f";
const PROVIDER_EVIDENCE_SHA256="6c2bfe62b0d669bc9794a13eb24d357026ca8f9f7c055af1bcc0c0893c94247b";
const PROVIDER_CANDIDATE_PROOF="scripts/prove_buy_void_delivery_dependency_provider_closure_v1.mjs";
const PROVIDER_CANDIDATE_PROOF_BLOB="bc9473b4fd79eae50f4e86ca24968d3328cdcf22";
const PROVIDER_CLOSURE_SHA256="3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945";
const PROVIDER_SEMANTIC_SHA256="95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384";

const PACKAGE_BLOBS=Object.freeze({
  "package.json":"14fbdf5717b07fd4c734f5da7a8e84ed59bee93f",
  "package-lock.json":"15b5c82ea36f13079a2f9e8863722f654eb3f201",
  "tsconfig.build.json":"d43e7f3fa03d20159f7b92aca4c8a56e738cd2fb",
});

const NONPROTECTED_ECONOMIC_DRIFT=Object.freeze([
  "src/economic/buy_void_public_request_under_launch_lock_v1.ts",
  "src/economic/buy_void_request_custody_read_policy_v1.ts",
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts",
]);

const PROVIDER_SOURCE_BLOBS=Object.freeze({
  "src/economic/buy_void_delivery_runtime_integration_v1.ts": "5b23824bf0a0f33b193e1cfc022fcfb5b898b022",
  "src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts": "2deaee8ae4e0fbd909b417eef96a76012174c668",
  "src/economic/buy_void_delivery_submission_guard_v1.ts": "f84ca60a37c77ae7691ec6970c59f123de4f73b7",
  "src/economic/buy_void_epoch2_fulfillment_access_list_v1.ts": "158cbf14fa2b566632c096a22e484b651cd44f6d",
  "src/economic/buy_void_erc20_chain2050_broadcaster_v1.ts": "08e8849e1736d20c0737e493853732970c0f31a5",
  "src/economic/buy_void_erc20_chain2050_total_deadline_transport_v1.ts": "05d9094f507ade72591f1e8c4983085c2259f949",
  "src/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.ts": "e5651535bde060c91e988beb324aa8e5621d2857",
  "src/economic/buy_void_erc20_delivery_dependency_injection_v1.ts": "d110159db9d20a8ce85391f4bdb154b9a6ddefde",
  "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts": "0999f773bdc4befb3e82676304f0d69f5cab42ef",
  "src/economic/buy_void_native_chain2050_broadcaster_v1.ts": "28b50301609c16838903ee49e62ba91cd4660e88",
  "src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts": "5fd9296d10d810b1976c159578f13cca5d1594fe",
  "src/economic/buy_void_runtime_integration_v1.ts": "00dad9a345dcbdc9d96bc0f61543f8d0db63e0ac"
});

const ARTIFACT_PATHS=Object.freeze([
  "dist/economic/buy_void_auto_fulfillment_v1.js",
  "dist/economic/buy_void_broadcast_outcome_journal_v1.js",
  "dist/economic/buy_void_confirmed_state_journal_v1.js",
  "dist/economic/buy_void_crash_consistent_saga_server_policy_v1.js",
  "dist/economic/buy_void_delivery_runtime_integration_v1.js",
  "dist/economic/buy_void_delivery_sign_broadcast_adapter_v1.js",
  "dist/economic/buy_void_delivery_submission_guard_v1.js",
  "dist/economic/buy_void_erc20_delivery_receipt_reconciler_v1.js",
  "dist/economic/buy_void_erc20_execution_composition_v1.js",
  "dist/economic/buy_void_erc20_transaction_preparation_planner_v1.js",
  "dist/economic/buy_void_execution_attempt_journal_v1.js",
  "dist/economic/buy_void_filesystem_bakery_lock_v1.js",
  "dist/economic/buy_void_fulfillment_confirmation_v1.js",
  "dist/economic/buy_void_fulfillment_journal_v1.js",
  "dist/economic/buy_void_inventory_reservation_journal_v1.js",
  "dist/economic/buy_void_payment_rpc_observer_v1.js",
  "dist/economic/buy_void_pipeline_coordinator_v1.js",
  "dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js",
  "dist/economic/buy_void_source_finality_authenticated_composition_v3.js",
  "dist/economic/buy_void_source_finality_authority_v2.js",
  "dist/economic/buy_void_source_finality_execution_preflight_v1.js",
  "dist/economic/buy_void_source_finality_generation_provenance_v6.js",
  "dist/economic/buy_void_verified_payment_v2.js",
  "dist/economic/buy_void_source_finality_generation_provenance_v7.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v1.js",
  "dist/economic/buy_void_source_finality_live_process_binding_v2.js",
  "dist/economic/buy_void_source_finality_provider_pair_binding_v1.js",
  "dist/economic/buy_void_ethereum_public_checkout_finality_gate_v1.js"
]);

const ENV=Object.freeze({
  PATH:"/usr/bin:/bin",
  HOME:"/nonexistent",
  LANG:"C",
  LC_ALL:"C",
  TZ:"UTC",
  NODE_ENV:"test",
  GIT_CONFIG_NOSYSTEM:"1",
  GIT_CONFIG_GLOBAL:"/dev/null",
  GIT_CONFIG_SYSTEM:"/dev/null",
  GIT_NO_REPLACE_OBJECTS:"1",
  GIT_OPTIONAL_LOCKS:"0",
  GIT_TERMINAL_PROMPT:"0",
  GIT_NO_LAZY_FETCH:"1",
  GIT_ALLOW_PROTOCOL:"",
});

const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob=(bytes)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
  .update(bytes)
  .digest("hex");

function canonical(value){
  if(value===null||typeof value==="boolean"||typeof value==="string")return JSON.stringify(value);
  if(typeof value==="number"){
    assert.equal(Number.isSafeInteger(value),true,"noncanonical_number");
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  assert.ok(value&&typeof value==="object","noncanonical_value");
  return "{"+Object.keys(value).sort().map(
    key=>JSON.stringify(key)+":"+canonical(value[key]),
  ).join(",")+"}";
}
function run(command,args,{timeout=300000}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout,
    maxBuffer:32*1024*1024,
    env:ENV,
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args){
  return String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();
}
function read(relative,max=4*1024*1024){
  assert.ok(!path.isAbsolute(relative)&&!relative.split("/").includes(".."),"unsafe_path:"+relative);
  const full=path.join(ROOT,relative);
  const before=fs.lstatSync(full);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(full);
  const after=fs.lstatSync(full);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs","nlink"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  return bytes;
}
function pin(relative,blob,max=4*1024*1024){
  const bytes=read(relative,max);
  assert.equal(gitBlob(bytes),blob,"git_blob_drift:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"head_blob_drift:"+relative);
  return bytes;
}
function treeMode(relative){
  const row=git(["ls-tree","HEAD","--",relative]);
  const match=row.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(match,"tree_entry_invalid:"+relative);
  assert.equal(match[3],relative,"tree_path_mismatch:"+relative);
  return match[1];
}
function sourcePath(artifact){
  return "src/economic/"+path.basename(artifact,".js")+".ts";
}
function verifyStatic(){
  assert.equal(process.platform,"linux","linux_required");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])),"node_major_not_reviewed");
  assert.equal(git(["status","--porcelain=v1","--untracked-files=all"]),"","worktree_not_clean");
  git(["merge-base","--is-ancestor",BASE_HEAD,"HEAD"]);
  assert.equal(git(["rev-parse","HEAD:src/economic"]),ECONOMIC_TREE,"economic_tree_drift");
  for(const [relative,blob] of Object.entries(PACKAGE_BLOBS)){
    assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"package_or_build_blob_drift:"+relative);
  }
  assert.equal(NONPROTECTED_ECONOMIC_DRIFT.length,3);
}
function verifyFrozenCandidate(){
  const candidateBytes=pin(CANDIDATE_FILE,CANDIDATE_BLOB,64*1024);
  assert.equal(candidateBytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(candidateBytes),CANDIDATE_SHA256,"candidate_sha256");
  const candidate=JSON.parse(candidateBytes.toString("utf8"));
  assert.equal(candidate.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V2");
  assert.equal(candidate.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(candidate.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(candidate.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(candidate.current_enforcement_tracked_source_inventory_v1.length,49);
  assert.equal(candidate.complete_executable_closure_verified,true);
  assert.equal(candidate.candidate_enforcement_identity_accepted,false);
  assert.equal(candidate.production_source_finality_authority_ready,false);
  assert.equal(candidate.public_presale_activation,false);
  assert.equal(candidate.funds_movement,false);

  const lockBytes=pin(LOCK_FILE,LOCK_BLOB,64*1024);
  assert.equal(sha256(lockBytes),LOCK_SHA256,"lock_sha256");
  const lock=JSON.parse(lockBytes.toString("utf8"));
  assert.equal(lock.candidate_evidence.git_blob_sha1,CANDIDATE_BLOB);
  assert.equal(lock.candidate_evidence.sha256,CANDIDATE_SHA256);
  assert.equal(lock.candidate_evidence.derivation_proof_git_blob_sha1,CANDIDATE_PROOF_BLOB);
  assert.equal(lock.candidate_evidence.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(lock.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(lock.candidate_enforcement_identity_accepted,true);
  assert.equal(lock.production_source_finality_authority_ready,false);
  assert.equal(lock.public_presale_activation,false);
  assert.equal(lock.funds_movement,false);
  pin(CANDIDATE_PROOF,CANDIDATE_PROOF_BLOB,256*1024);
  return {candidate,lock};
}
function verifyProtectedInventory(candidate){
  const rows=candidate.current_enforcement_tracked_source_inventory_v1;
  assert.equal(new Set(rows.map(row=>row.path)).size,49,"protected_path_duplicate");
  for(const row of rows){
    assert.equal(git(["rev-parse","HEAD:"+row.path]),row.git_blob_sha1,"protected_blob_drift:"+row.path);
    assert.equal(treeMode(row.path),row.git_mode,"protected_mode_drift:"+row.path);
  }
  assert.equal(
    sha256(Buffer.from(canonical(rows),"utf8")),
    PROTECTED_INVENTORY,
    "protected_inventory_digest_drift",
  );
}
function verifyBuiltCensus(candidate){
  const artifacts=ARTIFACT_PATHS.map(relative=>{
    const bytes=read(relative,2*1024*1024);
    return {path:relative,bytes:bytes.length,sha256:sha256(bytes)};
  });
  const sources=[...new Set(ARTIFACT_PATHS.map(sourcePath))].sort().map(relative=>{
    const bytes=read(relative,4*1024*1024);
    const blob=gitBlob(bytes);
    assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"source_head_blob_mismatch:"+relative);
    return {path:relative,bytes:bytes.length,git_blob_sha1:blob,sha256:sha256(bytes)};
  });
  assert.equal(artifacts.length,28,"artifact_count");
  assert.equal(sources.length,28,"source_count");
  assert.equal(
    sha256(Buffer.from(JSON.stringify(artifacts),"utf8")),
    candidate.hosted_census_evidence.artifact_inventory_sha256,
    "hosted_artifact_inventory_drift",
  );
  assert.equal(
    sha256(Buffer.from(JSON.stringify(sources),"utf8")),
    candidate.hosted_census_evidence.source_inventory_sha256,
    "hosted_source_inventory_drift",
  );
  assert.equal(
    sha256(Buffer.from(canonical(artifacts),"utf8")),
    candidate.current_inventory_evidence.canonical_artifact_inventory_sha256,
    "canonical_artifact_inventory_drift",
  );
  assert.equal(
    sha256(Buffer.from(canonical(sources),"utf8")),
    candidate.current_inventory_evidence.canonical_source_inventory_sha256,
    "canonical_source_inventory_drift",
  );
}
function providerSemantic(value){
  const copy=structuredClone(value);
  delete copy.repository_head_sha;
  delete copy.repository_tree_sha;
  delete copy.provider_closure_sha256;
  return copy;
}
function verifyProvider(){
  const evidenceBytes=pin(PROVIDER_EVIDENCE,PROVIDER_EVIDENCE_BLOB,128*1024);
  assert.equal(sha256(evidenceBytes),PROVIDER_EVIDENCE_SHA256,"provider_evidence_sha256");
  const provider=JSON.parse(evidenceBytes.toString("utf8"));
  assert.equal(provider.marker,"VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_V1");
  assert.equal(provider.provider_closure_sha256,PROVIDER_CLOSURE_SHA256);
  const body=structuredClone(provider);
  delete body.provider_closure_sha256;
  assert.equal(
    sha256(Buffer.from(canonical(body),"utf8")),
    PROVIDER_CLOSURE_SHA256,
    "provider_closure_digest_drift",
  );
  assert.equal(
    sha256(Buffer.from(canonical(providerSemantic(provider)),"utf8")),
    PROVIDER_SEMANTIC_SHA256,
    "provider_semantic_digest_drift",
  );
  assert.equal(provider.provider_static_module_closure_verified,true);
  assert.equal(provider.dynamic_module_loader_present,false);
  assert.equal(provider.provider_runtime_artifact_count,9);
  assert.deepEqual(provider.provider_third_party_packages,["ethers"]);

  pin(PROVIDER_CANDIDATE_PROOF,PROVIDER_CANDIDATE_PROOF_BLOB,256*1024);
  assert.deepEqual(provider.provider_source_paths,Object.keys(PROVIDER_SOURCE_BLOBS).sort(),"provider_source_path_set_drift");
  for(const [relative,blob] of Object.entries(PROVIDER_SOURCE_BLOBS)){
    assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"provider_source_blob_drift:"+relative);
  }

  const identities=[
    provider.server_runtime_identity,
    provider.delivery_consumer_identity,
    provider.delivery_adapter_identity,
    ...provider.provider_runtime_artifacts,
  ];
  const seen=new Set();
  for(const identity of identities){
    if(seen.has(identity.path))continue;
    seen.add(identity.path);
    const bytes=read(identity.path,2*1024*1024);
    assert.equal(bytes.length,identity.bytes,"provider_artifact_bytes_drift:"+identity.path);
    assert.equal(sha256(bytes),identity.sha256,"provider_artifact_sha256_drift:"+identity.path);
    assert.equal(gitBlob(bytes),identity.git_blob_sha1,"provider_artifact_git_blob_drift:"+identity.path);
  }
  return provider;
}
function verify(){
  verifyStatic();
  const {candidate}=verifyFrozenCandidate();
  verifyProtectedInventory(candidate);
  verifyBuiltCensus(candidate);
  const provider=verifyProvider();
  return Object.freeze({
    schema:"void_buy_void_repaired_v7_v2_current_generation_dispatch_v2",
    marker:MARKER,
    version:2,
    repository:"6ZoSo9/void-node",
    base_head:BASE_HEAD,
    current_head:git(["rev-parse","HEAD"]),
    current_economic_tree_sha1:ECONOMIC_TREE,
    current_economic_tree_identity_preserved:true,
    protected_path_count:49,
    protected_path_identity_preserved:true,
    frozen_candidate_json_sha256:CANDIDATE_SHA256,
    frozen_candidate_enforcement_set_sha256:CANDIDATE_SET,
    frozen_candidate_rederived_on_current_head:false,
    frozen_lock_identity_preserved:true,
    current_built_census_identity_matches_frozen_v4:true,
    nonprotected_economic_drift_paths:NONPROTECTED_ECONOMIC_DRIFT,
    nonprotected_economic_drift_count:3,
    provider_source_path_count:provider.provider_source_paths.length,
    provider_source_identity_preserved:true,
    provider_built_artifact_identity_preserved:true,
    provider_closure_semantic_sha256:PROVIDER_SEMANTIC_SHA256,
    historical_commit_objects_required:false,
    current_generation_integration_verified:true,
    candidate_enforcement_identity_accepted:true,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    source_freeze_accepted:false,
    customer_payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    signing:false,
    transaction:false,
    treasury_liquidity_action:false,
    funds_movement:false,
  });
}
function selfTest(){
  assert.equal(ARTIFACT_PATHS.length,28);
  assert.equal(new Set(ARTIFACT_PATHS).size,28);
  assert.equal(Object.keys(PROVIDER_SOURCE_BLOBS).length,12);
  assert.equal(new Set(Object.keys(PROVIDER_SOURCE_BLOBS)).size,12);
  assert.equal(NONPROTECTED_ECONOMIC_DRIFT.length,3);
  assert.equal(canonical({b:2,a:1}),'{"a":1,"b":2}');
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("historical_commit_objects_required=false");
  console.log("runtime_mutation=false");
  console.log("payment_acceptance=false");
  console.log("funds_movement=false");
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--self-test"){
  selfTest();
}else if(args.length===1&&args[0]==="--receipt"){
  process.stdout.write(JSON.stringify(verify(),null,2)+"\n");
}else{
  throw new Error("unsupported_mode");
}
