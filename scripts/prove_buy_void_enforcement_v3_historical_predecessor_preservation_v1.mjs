#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_ENFORCEMENT_V3_HISTORICAL_PREDECESSOR_PRESERVATION_V1";
const V3_SET="bf158923831b21dd1e907c91cd4889afbe9fd8bce221e12b0fa1a2bb0896943d";
const V3_RUN_BLOB="d7d7aede7fcd764a6182bd31f12338c5d3674ecb";

const PINS=Object.freeze({
  "scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v1.mjs":
    "d1cb550cf8f05692ca83114281cc35b2a6fe0cf1",
  "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v1.json":
    "6b2958bdb4dbb38354d5a4b41e5b4d1e919b6794",
  "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v1.json":
    "ff98ab6b3aaceea9c6ab921e8642a32a0fba79af",
  "scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v1.mjs":
    "43074f083317a54520587ef70eaf3400255f3482",
  "scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v2.mjs":
    "5cb990d0ef680f80292bed5f6b28c11d4ee1ffed",
  "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json":
    "4e23ecbb64eb26c14f5ab15af85eb86d59c3a718",
  "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json":
    "589845615654da8b688764377b34296267ac0063",
  "scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v2.mjs":
    "9428c0adb10d624593c7882a9e483f33baa9f292",
  "scripts/prove_buy_void_enforcement_final_v7_artifact_census_v4.mjs":
    "f0e1334da67309c1aeb98a2fa19e5ff77424955f",
  "scripts/prove_buy_void_enforcement_final_protected_v7_v2_census_v5.mjs":
    "e9783f70e2e25145897e0e594aacfd6d57f97bee",
  "scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v3.mjs":
    "b2cf2514e2a75c91446edbe4b56ed995fb0a8fc6",
  "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json":
    "092642b365976d3ea8d50682a1c7a8724455362b",
  "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json":
    "92054f19fed9e8c243eb23321dbcf53fc9227a99",
});

function git(...args){
  return execFileSync("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
  }).trim();
}
function pin(pathname,blob){
  assert.equal(git("rev-parse","HEAD:"+pathname),blob,"blob_drift:"+pathname);
}
function parse(pathname){
  return JSON.parse(fs.readFileSync(path.join(ROOT,pathname),"utf8"));
}
function verify(){
  for(const [pathname,blob] of Object.entries(PINS))pin(pathname,blob);
  assert.equal(git("rev-parse","HEAD:ops/run-void-node-live-v1.sh"),V3_RUN_BLOB,
    "v3_run_script_generation_mismatch");

  const v1c=parse("ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v1.json");
  const v1l=parse("ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v1.json");
  const v2c=parse("ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json");
  const v2l=parse("ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json");
  const v3c=parse("ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json");
  const v3l=parse("ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json");

  assert.equal(v1c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V1");
  assert.equal(v1c.candidate_enforcement_identity_accepted,false);
  assert.equal(v1l.candidate_enforcement_identity_accepted,true);
  assert.equal(v2c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V2");
  assert.equal(v2c.candidate_enforcement_identity_accepted,false);
  assert.equal(v2l.candidate_enforcement_identity_accepted,true);
  assert.equal(v3c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3");
  assert.equal(v3c.candidate_enforcement_set_sha256,V3_SET);
  assert.equal(v3c.candidate_enforcement_identity_accepted,false);
  assert.equal(v3c.protected_census_evidence.census_id,
    "voidbefv7c5_15bb0ac8cfebf0f70b20442dd80bb84ea4bef4e0b50eefff71363237a0bf6c47");
  const run=v3c.current_enforcement_tracked_source_inventory_v1
    .find(row=>row.path==="ops/run-void-node-live-v1.sh");
  assert.equal(run?.git_blob_sha1,V3_RUN_BLOB);
  assert.equal(v3l.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3");
  assert.equal(v3l.candidate_evidence.candidate_enforcement_set_sha256,V3_SET);
  assert.equal(v3l.candidate_enforcement_identity_accepted,true);

  for(const value of [v1c,v1l,v2c,v2l,v3c,v3l]){
    assert.equal(value.public_presale_activation,false);
    assert.equal(value.funds_movement,false);
  }
  assert.equal(v3l.deployed_artifact_generation_verified,false);
  assert.equal(v3l.runtime_mount_authority,false);
  assert.equal(v3l.production_source_finality_authority_ready,false);

  return Object.freeze({
    schema:"void_buy_void_enforcement_v3_historical_predecessor_preservation_v1",
    marker:MARKER,
    version:1,
    repository:"6ZoSo9/void-node",
    source_head:git("rev-parse","HEAD"),
    current_generation:"protected_v7_v2_v3",
    current_run_script_git_blob_sha1:V3_RUN_BLOB,
    v1_candidate_and_lock_frozen:true,
    v2_candidate_and_lock_frozen:true,
    v4_census_proof_frozen:true,
    v5_census_successor_bound:true,
    v3_candidate_bound:true,
    v3_candidate_enforcement_set_sha256:V3_SET,
    v3_lock_bound:true,
    v3_candidate_enforcement_identity_accepted:true,
    historical_predecessor_rederivation_required:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  });
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--receipt"){
  process.stdout.write(JSON.stringify(verify(),null,2)+"\n");
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const r=verify();
  console.log(MARKER+"_GREEN");
  for(const key of [
    "v1_candidate_and_lock_frozen","v2_candidate_and_lock_frozen",
    "v4_census_proof_frozen","v5_census_successor_bound","v3_candidate_bound",
    "v3_lock_bound","v3_candidate_enforcement_identity_accepted",
    "historical_predecessor_rederivation_required",
    "deployed_artifact_generation_verified","runtime_mount_authority",
    "production_source_finality_authority_ready","public_presale_activation",
    "funds_movement"
  ]) console.log(key+"="+String(r[key]));
}else{
  throw new Error("usage: preservation [--self-test|--receipt]");
}
