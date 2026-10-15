#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const INTEGRATION_PARENT="af9646827b25e8103004f96525623ba248b41d2a";
const SELF="scripts/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v1.mjs";
const DOC="docs/architecture/buy-void-repaired-v7-v2-current-generation-dispatch-v1.md";
const FINAL_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml";
const HISTORICAL_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v1.yml";
const DELTA_WORKFLOW=".github/workflows/buy-void-source-finality-v7-executable-delta-candidate-v1.yml";
const EXPECTED_DELTA=Object.freeze([SELF,DOC,FINAL_WORKFLOW,HISTORICAL_WORKFLOW,DELTA_WORKFLOW].sort());

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
const MAIN_PRESERVED=Object.freeze({
  "scripts/prove_void_buy_coupled_launch_runtime_integration_current_v2.mjs":
    "59357584271c3effaaefb725d630593163b7a9e2",
  "scripts/prove_void_buy_coupled_launch_runtime_integration_generation_dispatch_v2.mjs":
    "7bc37b4ffcc2d3071bfcedfbeccc734161033b08",
});

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
function run(command,args,{timeout=300000}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:32*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args){
  return String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();
}
function read(relative,max=1024*1024){
  const p=path.join(ROOT,relative);
  const before=fs.lstatSync(p);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(p);
  const after=fs.lstatSync(p);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]) assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  return bytes;
}
function pin(relative,blob){
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"git_blob_drift:"+relative);
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",INTEGRATION_PARENT,"HEAD"]);
  const changed=git(["diff","--name-only",INTEGRATION_PARENT,"HEAD","--"]).split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA,"current_generation_dispatch_scope_drift");
  pin(CANDIDATE_PROOF,CANDIDATE_PROOF_BLOB);
  pin(LOCK_PROOF,LOCK_PROOF_BLOB);
  pin(V4_CENSUS_PROOF,V4_CENSUS_PROOF_BLOB);
  pin(CANDIDATE_FILE,CANDIDATE_BLOB);
  pin(LOCK_FILE,LOCK_BLOB);
  for(const [relative,blob] of Object.entries(MAIN_PRESERVED)) pin(relative,blob);
}
function verifyCandidate(){
  const loader=pathToFileURL(path.join(ROOT,"node_modules/tsx/dist/loader.mjs")).href;
  const derived=Buffer.from(run(process.execPath,[
    "--import",loader,path.join(ROOT,CANDIDATE_PROOF),"--derive",
  ]).stdout||Buffer.alloc(0));
  assert.equal(derived.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(derived),CANDIDATE_SHA256,"candidate_sha256");
  const committed=read(CANDIDATE_FILE,64*1024);
  assert.ok(committed.equals(derived),"candidate_committed_bytes_drift");
  const c=JSON.parse(committed.toString("utf8"));
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V2");
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(c.protected_census_evidence?.census_id,CENSUS_ID);
  assert.equal(c.protected_census_evidence?.census_json_sha256,CENSUS_SHA256);
  assert.equal(c.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  assert.equal(c.production_source_finality_authority_ready,false);
  assert.equal(c.public_presale_activation,false);
  assert.equal(c.funds_movement,false);
}
function verifyLock(){
  const l=JSON.parse(read(LOCK_FILE,64*1024).toString("utf8"));
  assert.equal(l.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2");
  assert.equal(l.version,2);
  assert.equal(l.candidate_head,"1d138dcb3ac61f156fe8eb0fff27341fe97c04f9");
  assert.equal(l.candidate_evidence?.path,CANDIDATE_FILE);
  assert.equal(l.candidate_evidence?.derivation_proof_git_blob_sha1,CANDIDATE_PROOF_BLOB);
  assert.equal(l.candidate_evidence?.bytes,CANDIDATE_BYTES);
  assert.equal(l.candidate_evidence?.sha256,CANDIDATE_SHA256);
  assert.equal(l.candidate_evidence?.git_blob_sha1,CANDIDATE_BLOB);
  assert.equal(l.candidate_evidence?.candidate_enforcement_set_sha256,CANDIDATE_SET);
  assert.equal(l.protected_census_evidence?.census_id,CENSUS_ID);
  assert.equal(l.protected_census_evidence?.census_json_sha256,CENSUS_SHA256);
  assert.equal(l.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(l.complete_executable_closure_verified,true);
  assert.equal(l.current_enforcement_tracked_source_inventory_verified,true);
  assert.equal(l.candidate_enforcement_identity_accepted,true);
  assert.equal(l.deployed_artifact_generation_verified,false);
  assert.equal(l.runtime_mount_authority,false);
  assert.equal(l.production_source_finality_authority_ready,false);
  assert.equal(l.public_presale_activation,false);
  assert.equal(l.funds_movement,false);
}
function verifyWorkflowDispatch(){
  const finalWorkflow=read(FINAL_WORKFLOW,256*1024).toString("utf8");
  const historicalWorkflow=read(HISTORICAL_WORKFLOW,256*1024).toString("utf8");
  const deltaWorkflow=read(DELTA_WORKFLOW,256*1024).toString("utf8");
  assert.match(finalWorkflow,/CURRENT_GENERATION_DISPATCH_V1/u);
  assert.match(historicalWorkflow,/HISTORICAL_V1_REFUSAL_CURRENT_V2_DISPATCH_V1/u);
  assert.match(finalWorkflow,/prove_buy_void_repaired_v7_v2_current_generation_dispatch_v1\.mjs/u);
  assert.match(deltaWorkflow,/CURRENT_V4_CENSUS_DISPATCH_V1/u);
  assert.match(deltaWorkflow,/prove_buy_void_enforcement_final_v7_artifact_census_v4\.mjs/u);
}
function verify(){
  verifyBranch();
  verifyCandidate();
  verifyLock();
  verifyWorkflowDispatch();
}
const args=process.argv.slice(2);
if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  verify();
  console.log("VOID_BUY_VOID_REPAIRED_V7_V2_CURRENT_GENERATION_DISPATCH_V1_GREEN");
  console.log("candidate_json_sha256="+CANDIDATE_SHA256);
  console.log("accepted_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("protected_census_id="+CENSUS_ID);
  console.log("frozen_lock_proof_preserved=true");
  console.log("current_v4_census_required=true");
  console.log("main_coupled_launch_successors_preserved=true");
  console.log("deployment_or_runtime_authority=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw Error("usage: proof [--self-test]");
}
