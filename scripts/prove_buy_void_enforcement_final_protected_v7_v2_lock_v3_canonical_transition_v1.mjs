#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_PROTECTED_V3_CANONICAL_TRANSITION_V1";

const RANGE_HEAD="ee22c668ae2ac896b4b39a0690f65cc329a7717c";
const ACCEPTED_LOCK_HEAD="67ea723bd2abeb3894a0eb8f4b7a0044a141ed03";
const ACCEPTED_LOCK_TREE="f373912f46ec72b7743e83768e5b48ebb02d7ec0";
const ACCEPTED_CANDIDATE_HEAD="4af6cf87a555616e9c154da3676865194d795a6d";
const ACCEPTED_SET="bf158923831b21dd1e907c91cd4889afbe9fd8bce221e12b0fa1a2bb0896943d";
const PROTECTED_INVENTORY="297399d8c5cd975e5bf9f96adc291aebae13ce6a83c26ca5a039668c7b32b0f2";
const V3_RUN_BLOB="d7d7aede7fcd764a6182bd31f12338c5d3674ecb";
const RANGE_INDEX_BLOB="7df1f21c730b554c414c88c550a4475234485370";

const CENSUS_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_census_v5.mjs";
const CENSUS_PROOF_BLOB="e9783f70e2e25145897e0e594aacfd6d57f97bee";
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v3.mjs";
const CANDIDATE_PROOF_BLOB="b2cf2514e2a75c91446edbe4b56ed995fb0a8fc6";
const LOCK_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v3.mjs";
const LOCK_PROOF_BLOB="7f72073aad6aa5286a058fcd78ab824d73b0fcd7";
const HISTORICAL_LOCK_WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-lock-v3.yml";
const HISTORICAL_LOCK_WORKFLOW_BLOB="adc1fe44afb9ebc5b45916f35477a5176b1b8674";
const PRESERVATION_PROOF="scripts/prove_buy_void_enforcement_v3_historical_predecessor_preservation_v1.mjs";
const PRESERVATION_PROOF_BLOB="d5474b8584aca62814357ce9a29017b933d96450";
const CANDIDATE_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json";
const CANDIDATE_BLOB="092642b365976d3ea8d50682a1c7a8724455362b";
const LOCK_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const LOCK_BLOB="92054f19fed9e8c243eb23321dbcf53fc9227a99";

function run(command,args,{timeout=300000,allowFailure=false}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,
    encoding:null,
    stdio:["ignore","pipe","pipe"],
    timeout,
    maxBuffer:64*1024*1024,
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
    },
  });
  assert.equal(r.error,undefined,String(r.error||""));
  if(!allowFailure) assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args){
  return String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).stdout||"").trim();
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function sha256(bytes){ return crypto.createHash("sha256").update(bytes).digest("hex"); }
function readExact(relative,max=8*1024*1024){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(x=>!x||x==="."||x===".."),false,"unsafe_path:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  for(const k of ["dev","ino","size","mtimeMs","ctimeMs"]) assert.equal(after[k],before[k],"changed:"+relative+":"+k);
  return bytes;
}
function pinHead(relative,blob){
  const bytes=readExact(relative);
  assert.equal(gitBlob(bytes),blob,"visible_blob_drift:"+relative);
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"head_blob_drift:"+relative);
}
function pinAt(ref,relative,blob){
  assert.equal(git(["rev-parse",ref+":"+relative]),blob,"historical_blob_drift:"+relative);
}
function nodeJson(relative,args=[]){
  const r=run(process.execPath,[relative,...args],{timeout:300000});
  return {raw:Buffer.from(r.stdout||[]),json:JSON.parse(String(r.stdout||""))};
}
function verify(){
  const head=git(["rev-parse","HEAD"]);
  const tree=git(["rev-parse","HEAD^{tree}"]);
  git(["merge-base","--is-ancestor",RANGE_HEAD,"HEAD"]);
  git(["merge-base","--is-ancestor",ACCEPTED_LOCK_HEAD,"HEAD"]);
  assert.equal(git(["rev-parse",ACCEPTED_LOCK_HEAD+"^{tree}"]),ACCEPTED_LOCK_TREE,"accepted_lock_tree_drift");

  pinAt(ACCEPTED_LOCK_HEAD,HISTORICAL_LOCK_WORKFLOW,HISTORICAL_LOCK_WORKFLOW_BLOB);
  pinAt(ACCEPTED_LOCK_HEAD,LOCK_PROOF,LOCK_PROOF_BLOB);
  pinHead(LOCK_PROOF,LOCK_PROOF_BLOB);
  pinHead(CENSUS_PROOF,CENSUS_PROOF_BLOB);
  pinHead(CANDIDATE_PROOF,CANDIDATE_PROOF_BLOB);
  pinHead(PRESERVATION_PROOF,PRESERVATION_PROOF_BLOB);
  pinHead(CANDIDATE_FILE,CANDIDATE_BLOB);
  pinHead(LOCK_FILE,LOCK_BLOB);
  assert.equal(git(["rev-parse","HEAD:ops/run-void-node-live-v1.sh"]),V3_RUN_BLOB,"v3_run_blob_drift");
  assert.equal(git(["rev-parse","HEAD:src/index.ts"]),RANGE_INDEX_BLOB,"range_index_blob_drift");

  const census=nodeJson(CENSUS_PROOF).json;
  assert.equal(census.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CENSUS_V5");
  assert.equal(census.repository_head_sha,head);
  assert.equal(census.repository_tree_sha,tree);
  assert.equal(census.protected_tracked_source_inventory_canonical_sha256,PROTECTED_INVENTORY);
  assert.equal(census.protected_generation_delta_count,2);
  assert.equal(census.protected_generation_delta_exact,true);
  assert.equal(census.unchanged_protected_path_count,47);
  assert.equal(census.economic_and_build_source_drift_count,0);
  assert.equal(census.frozen_candidate_rederived,false);
  assert.equal(census.frozen_lock_rewritten,false);
  assert.equal(census.candidate_enforcement_identity_accepted,false);
  assert.equal(census.public_presale_activation,false);
  assert.equal(census.funds_movement,false);

  const currentCandidate=nodeJson(CANDIDATE_PROOF,["--derive"]);
  const candidate=currentCandidate.json;
  assert.equal(candidate.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3");
  assert.equal(candidate.candidate_enforcement_set_sha256,ACCEPTED_SET);
  assert.equal(candidate.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(candidate.protected_census_current_revalidation?.repository_head_sha,head);
  assert.equal(candidate.protected_census_current_revalidation?.repository_tree_sha,tree);
  assert.equal(candidate.protected_census_current_revalidation?.source_generation_successor_evidence_bound,true);
  assert.equal(candidate.complete_executable_closure_verified,true);
  assert.equal(candidate.candidate_enforcement_identity_accepted,false);
  assert.equal(candidate.public_presale_activation,false);
  assert.equal(candidate.funds_movement,false);

  const preservation=nodeJson(PRESERVATION_PROOF,["--receipt"]).json;
  assert.equal(preservation.marker,"VOID_BUY_VOID_ENFORCEMENT_V3_HISTORICAL_PREDECESSOR_PRESERVATION_V1");
  assert.equal(preservation.source_head,head);
  assert.equal(preservation.v1_candidate_and_lock_frozen,true);
  assert.equal(preservation.v2_candidate_and_lock_frozen,true);
  assert.equal(preservation.v4_census_proof_frozen,true);
  assert.equal(preservation.v5_census_successor_bound,true);
  assert.equal(preservation.v3_candidate_bound,true);
  assert.equal(preservation.v3_lock_bound,true);
  assert.equal(preservation.v3_candidate_enforcement_identity_accepted,true);
  assert.equal(preservation.historical_predecessor_rederivation_required,false);

  const acceptedCandidate=JSON.parse(readExact(CANDIDATE_FILE).toString("utf8"));
  const acceptedLock=JSON.parse(readExact(LOCK_FILE).toString("utf8"));
  assert.equal(acceptedCandidate.candidate_enforcement_set_sha256,ACCEPTED_SET);
  assert.equal(acceptedCandidate.current_enforcement_tracked_source_inventory_sha256,PROTECTED_INVENTORY);
  assert.equal(acceptedLock.candidate_head,ACCEPTED_CANDIDATE_HEAD);
  assert.equal(acceptedLock.candidate_evidence.candidate_enforcement_set_sha256,ACCEPTED_SET);
  assert.equal(acceptedLock.candidate_enforcement_identity_accepted,true);
  assert.equal(acceptedLock.deployed_artifact_generation_verified,false);
  assert.equal(acceptedLock.runtime_mount_authority,false);
  assert.equal(acceptedLock.production_source_finality_authority_ready,false);
  assert.equal(acceptedLock.public_presale_activation,false);
  assert.equal(acceptedLock.funds_movement,false);

  return Object.freeze({
    schema:"void_buy_void_protected_v3_canonical_transition_v1",
    marker:MARKER,
    version:1,
    repository:"6ZoSo9/void-node",
    repository_head_sha:head,
    repository_tree_sha:tree,
    range_head_ancestor:RANGE_HEAD,
    accepted_lock_head:ACCEPTED_LOCK_HEAD,
    accepted_lock_tree:ACCEPTED_LOCK_TREE,
    accepted_candidate_head:ACCEPTED_CANDIDATE_HEAD,
    accepted_candidate_git_blob_sha1:CANDIDATE_BLOB,
    accepted_lock_git_blob_sha1:LOCK_BLOB,
    accepted_enforcement_set_sha256:ACCEPTED_SET,
    current_protected_inventory_sha256:census.protected_tracked_source_inventory_canonical_sha256,
    current_census_id:census.census_id,
    current_candidate_sha256:sha256(currentCandidate.raw),
    current_candidate_enforcement_set_sha256:candidate.candidate_enforcement_set_sha256,
    current_candidate_matches_accepted_enforcement_set:
      candidate.candidate_enforcement_set_sha256===ACCEPTED_SET,
    accepted_lock_origin_preserved:true,
    accepted_historical_lock_proof_reexecuted_on_current_head:false,
    historical_predecessors_preserved:true,
    current_head_transition_verified:true,
    current_candidate_enforcement_identity_accepted:false,
    accepted_v3_lock_identity_preserved:true,
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
  for(const k of [
    "current_candidate_matches_accepted_enforcement_set",
    "accepted_lock_origin_preserved",
    "historical_predecessors_preserved",
    "current_head_transition_verified",
    "accepted_v3_lock_identity_preserved",
    "deployed_artifact_generation_verified",
    "runtime_mount_authority",
    "production_source_finality_authority_ready",
    "public_presale_activation",
    "funds_movement",
  ]) console.log(k+"="+String(r[k]));
}else{
  throw new Error("usage: [--self-test|--receipt]");
}
