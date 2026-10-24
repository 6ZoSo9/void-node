#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

const HISTORICAL_BASE="be959daf147a25f594ba705c6bead1e2e622b00e";
const HISTORICAL_HEAD="af9646827b25e8103004f96525623ba248b41d2a";
const HISTORICAL_MERGE_BASE="58c140232cb7bb7fd4f8d4680a413299c74fa57e";
const RESTACK_BASE="f894cc5cbdccab0265a9a2265df45efa07170c4a";
const RESTACK_HEAD="a350ff8673c77c685bb024576ed1e887bfe42ac7";
const PROTECTED_PARENT="16563121f8d6c2a1fa7cd2f99ca4be2f88aa3cca";
const PROVIDER_PARENT="bc510343c5c418a75154bedcc445cbf1251dc037";

const FROZEN_DISPATCH_V1="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v1.mjs";
const FROZEN_DISPATCH_V1_BLOB="4e123302d25dd0a83923032d2dc0f40c8937e77f";
const FROZEN_DOC_V1="docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v1.md";
const FROZEN_DOC_V1_BLOB="1244b91d26a51485cefadd962398c43a13c28f71";
const SELF="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v2.mjs";
const DOC="docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v2.md";
const FINAL_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml";
const HISTORICAL_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml";
const DELTA_WORKFLOW=".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml";
const V4_WORKFLOW=".github/workflows/buy-void-enforcement-final-v7-artifact-census-v4.yml";
const PROVIDER_WORKFLOW=".github/workflows/buy-void-delivery-dependency-provider-closure-post2865-lock-v1.yml";

const SUCCESSOR_MODIFIED=Object.freeze([
  FINAL_WORKFLOW,
  HISTORICAL_WORKFLOW,
  DELTA_WORKFLOW,
  V4_WORKFLOW,
  PROVIDER_WORKFLOW,
].sort());

const MAIN_PRESERVED=Object.freeze({
  "scripts/prove_void_buy_coupled_launch_runtime_integration_current_v2.mjs":
    "59357584271c3effaaefb725d630593163b7a9e2",
  "scripts/prove_void_buy_coupled_launch_runtime_integration_generation_dispatch_v2.mjs":
    "7bc37b4ffcc2d3071bfcedfbeccc734161033b08",
});

const NONPROTECTED_ECONOMIC_DRIFT=Object.freeze([
  "src/economic/buy_void_public_request_under_launch_lock_v1.ts",
  "src/economic/buy_void_request_custody_read_policy_v1.ts",
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts",
].sort());
const REVIEWED_RANGE_INDEX=Object.freeze({
  path:"src/index.ts",
  frozen_blob:"123ec1792a027f93d4c9030749a0e7e136a75a44",
  current_blob:"a09661797aa4295371c036be36d82995e5233269",
  mode:"100644",
});

const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v2.mjs";
const CANDIDATE_PROOF_BLOB="5cb990d0ef680f80292bed5f6b28c11d4ee1ffed";
const LOCK_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v2.mjs";
const LOCK_PROOF_BLOB="9428c0adb10d624593c7882a9e483f33baa9f292";
const V4_CENSUS_PROOF="scripts/prove_buy_void_enforcement_final_v7_artifact_census_v4.mjs";
const V4_CENSUS_PROOF_BLOB="f0e1334da67309c1aeb98a2fa19e5ff77424955f";
const CANDIDATE_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json";
const CANDIDATE_BLOB="4e23ecbb64eb26c14f5ab15af85eb86d59c3a718";
const CANDIDATE_BYTES=16342;
const CANDIDATE_SHA256="092a97373013d32dda610df7363587fa3a669f33248a37420b07541d12d892bb";
const CANDIDATE_SET="05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852";
const LOCK_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const LOCK_BLOB="589845615654da8b688764377b34296267ac0063";
const CENSUS_ID="voidbefv7c4_9c8fa20632d3cfb431c0d13229153d19f076613720c7402e5374eab1f833401d";
const CENSUS_SHA256="c9d910cd461b87c6b4722ada7505ceffe9a8d3c266387f3d9bbebddaf8f586f8";
const PROTECTED_INVENTORY="224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2";

const PROVIDER_EVIDENCE="ops/security/buy-void-delivery-dependency-provider-closure-post2865-v1.json";
const PROVIDER_EVIDENCE_BLOB="b08c03912e0f66742f06f314bf5e1f5cad81f20f";
const PROVIDER_CANDIDATE_PROOF="scripts/prove_buy_void_delivery_dependency_provider_closure_v1.mjs";
const PROVIDER_CANDIDATE_PROOF_BLOB="bc9473b4fd79eae50f4e86ca24968d3328cdcf22";

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
  "dist/economic/buy_void_ethereum_public_checkout_finality_gate_v1.js",
]);

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}

function run(command,args,{timeout=300000,allowFail=false}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
  });
  assert.equal(r.error,undefined,String(r.error||""));
  if(!allowFail)assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args){return String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();}
function names(a,b,...paths){
  return git(["diff","--name-only",a,b,"--",...paths]).split("\n").filter(Boolean).sort();
}
function read(relative,max=4*1024*1024){
  assert.ok(!path.isAbsolute(relative)&&!relative.split("/").includes(".."),"unsafe_path:"+relative);
  const p=path.join(ROOT,relative);
  const before=fs.lstatSync(p);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(p);
  const after=fs.lstatSync(p);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs","nlink"])assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  return bytes;
}
function pin(relative,blob,max=4*1024*1024){
  const bytes=read(relative,max);
  assert.equal(gitBlob(bytes),blob,"git_blob_drift:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"head_blob_drift:"+relative);
  return bytes;
}
function treeBlob(ref,relative){return git(["rev-parse",ref+":"+relative]);}
function treeMode(ref,relative){
  const row=git(["ls-tree",ref,"--",relative]);
  const m=row.match(/^(100644|100755) blob ([0-9a-f]{40})\t(.+)$/u);
  assert.ok(m,"tree_entry_invalid:"+ref+":"+relative);
  assert.equal(m[3],relative,"tree_path_mismatch:"+relative);
  return m[1];
}
function sourcePath(artifact){return "src/economic/"+path.basename(artifact,".js")+".ts";}

function verifyRestackScope(){
  git(["cat-file","-e",HISTORICAL_BASE+"^{commit}"]);
  git(["cat-file","-e",HISTORICAL_HEAD+"^{commit}"]);
  git(["cat-file","-e",HISTORICAL_MERGE_BASE+"^{commit}"]);
  git(["cat-file","-e",RESTACK_BASE+"^{commit}"]);
  git(["cat-file","-e",RESTACK_HEAD+"^{commit}"]);
  git(["merge-base","--is-ancestor",RESTACK_BASE,RESTACK_HEAD]);
  git(["merge-base","--is-ancestor",RESTACK_HEAD,"HEAD"]);
  assert.equal(
    git(["merge-base",HISTORICAL_BASE,HISTORICAL_HEAD]),
    HISTORICAL_MERGE_BASE,
    "historical_merge_base_drift",
  );

  const historical=names(HISTORICAL_MERGE_BASE,HISTORICAL_HEAD);
  const restacked=names(RESTACK_BASE,RESTACK_HEAD);
  assert.equal(historical.length,106,"historical_reconciliation_path_count");
  assert.equal(restacked.length,106,"accepted_restack_path_count");

  const expected=historical
    .filter(relative=>!Object.hasOwn(MAIN_PRESERVED,relative))
    .concat([FROZEN_DISPATCH_V1,FROZEN_DOC_V1])
    .sort();
  assert.deepEqual(restacked,expected,"accepted_restack_path_set_drift");

  for(const [relative,blob] of Object.entries(MAIN_PRESERVED)){
    assert.ok(historical.includes(relative),"historical_main_preserved_path_missing:"+relative);
    assert.ok(!restacked.includes(relative),"accepted_restack_main_preserved_path_reintroduced:"+relative);
    assert.equal(treeBlob(RESTACK_BASE,relative),blob,"restack_base_preserved_blob_drift:"+relative);
    assert.equal(treeBlob(RESTACK_HEAD,relative),blob,"accepted_restack_preserved_blob_drift:"+relative);
    assert.equal(treeBlob("HEAD",relative),blob,"current_head_preserved_blob_drift:"+relative);
  }

  assert.ok(
    restacked.includes(FROZEN_DISPATCH_V1)&&restacked.includes(FROZEN_DOC_V1),
    "dispatch_files_missing_from_accepted_restack_delta",
  );
  for(const relative of restacked){
    if(!historical.includes(relative))continue;
    if(SUCCESSOR_MODIFIED.includes(relative))continue;
    assert.equal(
      treeBlob(RESTACK_HEAD,relative),
      treeBlob(HISTORICAL_HEAD,relative),
      "restacked_historical_blob_drift:"+relative,
    );
    assert.equal(
      treeMode(RESTACK_HEAD,relative),
      treeMode(HISTORICAL_HEAD,relative),
      "restacked_historical_mode_drift:"+relative,
    );
  }
  for(const relative of SUCCESSOR_MODIFIED){
    assert.ok(
      historical.includes(relative)&&restacked.includes(relative),
      "successor_path_scope_missing:"+relative,
    );
    assert.notEqual(
      treeBlob(RESTACK_HEAD,relative),
      treeBlob(HISTORICAL_HEAD,relative),
      "successor_path_not_updated:"+relative,
    );
  }
}
function verifyFrozenEvidence(){
  pin(FROZEN_DISPATCH_V1,FROZEN_DISPATCH_V1_BLOB,256*1024);
  pin(FROZEN_DOC_V1,FROZEN_DOC_V1_BLOB,256*1024);
  pin(CANDIDATE_PROOF,CANDIDATE_PROOF_BLOB,256*1024);
  pin(LOCK_PROOF,LOCK_PROOF_BLOB,256*1024);
  pin(V4_CENSUS_PROOF,V4_CENSUS_PROOF_BLOB,256*1024);

  const candidateBytes=pin(CANDIDATE_FILE,CANDIDATE_BLOB,64*1024);
  assert.equal(candidateBytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(candidateBytes),CANDIDATE_SHA256,"candidate_sha256");
  const c=JSON.parse(candidateBytes.toString("utf8"));
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V2");
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(c.protected_census_evidence?.census_id,CENSUS_ID);
  assert.equal(c.protected_census_evidence?.census_json_sha256,CENSUS_SHA256);
  assert.equal(c.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(c.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_v1?.length,49);
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  assert.equal(c.production_source_finality_authority_ready,false);
  assert.equal(c.public_presale_activation,false);
  assert.equal(c.funds_movement,false);

  const lockBytes=pin(LOCK_FILE,LOCK_BLOB,64*1024);
  const l=JSON.parse(lockBytes.toString("utf8"));
  assert.equal(l.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2");
  assert.equal(l.candidate_evidence?.git_blob_sha1,CANDIDATE_BLOB);
  assert.equal(l.candidate_evidence?.sha256,CANDIDATE_SHA256);
  assert.equal(l.candidate_evidence?.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(l.protected_census_evidence?.census_id,CENSUS_ID);
  assert.equal(l.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(l.candidate_enforcement_identity_accepted,true);
  assert.equal(l.deployed_artifact_generation_verified,false);
  assert.equal(l.runtime_mount_authority,false);
  assert.equal(l.production_source_finality_authority_ready,false);
  assert.equal(l.public_presale_activation,false);
  assert.equal(l.funds_movement,false);
  return {candidate:c,lock:l};
}

function verifyProtectedCurrentIdentity(candidate){
  const rows=candidate.current_enforcement_tracked_source_inventory_v1;
  assert.equal(rows.length,49);
  const paths=rows.map(row=>row.path);
  assert.equal(new Set(paths).size,49,"protected_path_duplicate");
  let reviewedProtectedDriftCount=0;
  for(const row of rows){
    const actualBlob=treeBlob("HEAD",row.path);
    if(row.path===REVIEWED_RANGE_INDEX.path){
      assert.equal(row.git_blob_sha1,REVIEWED_RANGE_INDEX.frozen_blob,
        "frozen_range_index_identity_drift");
      assert.equal(treeBlob(RESTACK_BASE,row.path),REVIEWED_RANGE_INDEX.frozen_blob,
        "restack_base_range_index_identity_drift");
      assert.equal(actualBlob,REVIEWED_RANGE_INDEX.current_blob,
        "reviewed_range_index_successor_drift");
      reviewedProtectedDriftCount++;
    }else{
      assert.equal(actualBlob,row.git_blob_sha1,"protected_blob_drift:"+row.path);
    }
    assert.equal(treeMode("HEAD",row.path),row.git_mode,"protected_mode_drift:"+row.path);
  }
  assert.equal(reviewedProtectedDriftCount,1,"reviewed_protected_drift_count");
  assert.equal(
    sha256(Buffer.from(canonical(rows),"utf8")),
    candidate.current_enforcement_tracked_source_inventory_sha256,
    "frozen_protected_inventory_digest_drift",
  );

  const economicDrift=names(
    PROTECTED_PARENT,"HEAD",
    "src/economic","package.json","package-lock.json","tsconfig.build.json",
  );
  assert.deepEqual(economicDrift,NONPROTECTED_ECONOMIC_DRIFT,"unexpected_post_census_economic_drift");
  const protectedSet=new Set(paths);
  for(const relative of NONPROTECTED_ECONOMIC_DRIFT){
    assert.equal(protectedSet.has(relative),false,"allowed_drift_entered_protected_inventory:"+relative);
    assert.equal(
      treeBlob("HEAD",relative),
      treeBlob(RESTACK_BASE,relative),
      "reconciliation_modified_allowed_current_main_drift:"+relative,
    );
  }
  return {paths,reviewedProtectedDriftCount};
}

function verifyBuiltCensusIdentity(candidate){
  const artifacts=ARTIFACT_PATHS.map(relative=>{
    const b=read(relative,2*1024*1024);
    return {path:relative,bytes:b.length,sha256:sha256(b)};
  });
  const sources=[...new Set(ARTIFACT_PATHS.map(sourcePath))].sort().map(relative=>{
    const b=read(relative,4*1024*1024);
    const blob=gitBlob(b);
    assert.equal(treeBlob("HEAD",relative),blob,"census_source_head_mismatch:"+relative);
    return {path:relative,bytes:b.length,git_blob_sha1:blob,sha256:sha256(b)};
  });
  assert.equal(artifacts.length,28);
  assert.equal(sources.length,28);
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

function verifyProviderIdentity(){
  const evidenceBytes=pin(PROVIDER_EVIDENCE,PROVIDER_EVIDENCE_BLOB,128*1024);
  pin(PROVIDER_CANDIDATE_PROOF,PROVIDER_CANDIDATE_PROOF_BLOB,256*1024);
  const provider=JSON.parse(evidenceBytes.toString("utf8"));
  assert.equal(provider.marker,"VOID_BUY_VOID_DELIVERY_DEPENDENCY_PROVIDER_CLOSURE_V1");
  assert.equal(provider.repository_head_sha,PROVIDER_PARENT);
  assert.equal(provider.provider_closure_sha256,"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945");
  assert.equal(provider.provider_static_module_closure_verified,true);
  assert.equal(provider.dynamic_module_loader_present,false);

  const inputs=[
    ...provider.provider_source_paths,
    "package.json",
    "package-lock.json",
    "tsconfig.build.json",
    PROVIDER_CANDIDATE_PROOF,
  ];
  assert.deepEqual(names(PROVIDER_PARENT,"HEAD",...inputs),[],"provider_input_drift");

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
  }
  return provider;
}

function verifyWorkflowDispatch(){
  const rows=[
    [FINAL_WORKFLOW,"CURRENT_PROTECTED_INTEGRATION_DISPATCH_V2"],
    [HISTORICAL_WORKFLOW,"HISTORICAL_V1_REFUSAL_CURRENT_V2_DISPATCH_V2"],
    [DELTA_WORKFLOW,"CURRENT_PROTECTED_INTEGRATION_DISPATCH_V2"],
    [V4_WORKFLOW,"CURRENT_PROTECTED_INTEGRATION_DISPATCH_V2"],
    [PROVIDER_WORKFLOW,"CURRENT_PROTECTED_INTEGRATION_DISPATCH_V2"],
  ];
  for(const [relative,marker] of rows){
    const text=read(relative,256*1024).toString("utf8");
    assert.ok(text.includes(marker),"workflow_dispatch_marker_missing:"+relative);
    assert.ok(text.includes(SELF),"workflow_dispatch_proof_missing:"+relative);
  }
}

function verify(){
  verifyRestackScope();
  const frozen=verifyFrozenEvidence();
  const protectedIdentity=verifyProtectedCurrentIdentity(frozen.candidate);
  const protectedPaths=protectedIdentity.paths;
  verifyBuiltCensusIdentity(frozen.candidate);
  const provider=verifyProviderIdentity();
  verifyWorkflowDispatch();
  return Object.freeze({
    schema:"void_buy_void_repaired_v7_v2_current_generation_dispatch_v2",
    marker:"VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V2",
    version:2,
    repository:"6ZoSo9/void-node",
    historical_head:HISTORICAL_HEAD,
    restack_base:RESTACK_BASE,
    accepted_restack_head:RESTACK_HEAD,
    protected_parent:PROTECTED_PARENT,
    protected_path_count:protectedPaths.length,
    protected_path_identity_preserved:false,
    frozen_protected_inventory_preserved:true,
    reviewed_protected_drift_count:protectedIdentity.reviewedProtectedDriftCount,
    reviewed_range_index_predecessor_blob:REVIEWED_RANGE_INDEX.frozen_blob,
    reviewed_range_index_current_blob:REVIEWED_RANGE_INDEX.current_blob,
    reviewed_range_index_successor_bound:true,
    frozen_candidate_json_sha256:CANDIDATE_SHA256,
    frozen_candidate_enforcement_set_sha256:CANDIDATE_SET,
    frozen_candidate_rederived_on_current_head:false,
    frozen_lock_identity_preserved:true,
    frozen_v4_census_proof_preserved:true,
    current_built_census_identity_matches_frozen_v4:true,
    nonprotected_economic_drift_paths:NONPROTECTED_ECONOMIC_DRIFT,
    nonprotected_economic_drift_count:NONPROTECTED_ECONOMIC_DRIFT.length,
    nonprotected_economic_drift_preserved_from_restack_base:true,
    provider_source_path_count:provider.provider_source_paths.length,
    provider_source_identity_preserved:true,
    provider_built_artifact_identity_preserved:true,
    current_generation_integration_verified:true,
    candidate_enforcement_identity_accepted:true,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  });
}

const args=process.argv.slice(2);
if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const receipt=verify();
  console.log("VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V2_GREEN");
  console.log("protected_path_identity_preserved="+receipt.protected_path_identity_preserved);
  console.log("frozen_protected_inventory_preserved="+receipt.frozen_protected_inventory_preserved);
  console.log("reviewed_protected_drift_count="+receipt.reviewed_protected_drift_count);
  console.log("reviewed_range_index_successor_bound="+receipt.reviewed_range_index_successor_bound);
  console.log("protected_path_count="+receipt.protected_path_count);
  console.log("nonprotected_economic_drift_count="+receipt.nonprotected_economic_drift_count);
  console.log("provider_source_identity_preserved="+receipt.provider_source_identity_preserved);
  console.log("current_built_census_identity_matches_frozen_v4="+receipt.current_built_census_identity_matches_frozen_v4);
  console.log("frozen_candidate_rederived_on_current_head=false");
  console.log("current_generation_integration_verified=true");
  console.log("deployment_or_runtime_authority=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else if(args.length===1&&args[0]==="--receipt"){
  process.stdout.write(JSON.stringify(verify(),null,2)+"\n");
}else{
  throw new Error("usage: prove_buy_void_repaired_v7_v2_current_generation_dispatch_v2.mjs [--self-test|--receipt]");
}
