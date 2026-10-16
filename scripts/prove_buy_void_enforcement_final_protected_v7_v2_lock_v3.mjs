#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE_HEAD="4af6cf87a555616e9c154da3676865194d795a6d";
const CANDIDATE_TREE="ef6fe9ec481bb3df9805905f8411bce3741af3a9";
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v3.mjs";
const CANDIDATE_PROOF_BLOB="b2cf2514e2a75c91446edbe4b56ed995fb0a8fc6";
const CANDIDATE_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-lock-v3.yml";
const LOCK_DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v3.md";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v3.mjs";

const CANDIDATE_BYTES=18142;
const CANDIDATE_SHA256="58a1d773523e025e6f66a9fe0f3098cd7951a60810da8cf0b2f16584bd100a45";
const CANDIDATE_BLOB="092642b365976d3ea8d50682a1c7a8724455362b";
const CANDIDATE_SET="bf158923831b21dd1e907c91cd4889afbe9fd8bce221e12b0fa1a2bb0896943d";
const CANDIDATE_WORKFLOW_RUN=38847166708;
const CANDIDATE_ARTIFACTS=Object.freeze({
  22:12023293940,
  24:12024125439,
  26:12023766523,
});
const CENSUS_ID="voidbefv7c5_15bb0ac8cfebf0f70b20442dd80bb84ea4bef4e0b50eefff71363237a0bf6c47";
const CENSUS_JSON_SHA256="66f9a8e98cfa289117c58a661532b3fa6403f9c8d116c1c5c4462d66e1454057";
const PROTECTED_INVENTORY_SHA256="297399d8c5cd975e5bf9f96adc291aebae13ce6a83c26ca5a039668c7b32b0f2";
const PROFILE_ID="voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac";
const PACKAGE_AGGREGATE="77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6";
const PROFILE_CANONICAL="3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757";
const PROVIDER_CLOSURE="3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945";
const PROVIDER_SEMANTIC="95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384";
const V7_DELTA="5c5637207d5970d2ca793cf431726ff8d86db370b3e69e9ff1e5caa25d9b5224";

const EXPECTED_DELTA=Object.freeze([
  WORKFLOW,LOCK_DOC,LOCK,SELF,CANDIDATE_FILE,
].sort());
const WORKFLOW_TRIGGER_PATHS=Object.freeze([
  CANDIDATE_FILE,LOCK,SELF,LOCK_DOC,
]);

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function run(command,args,{timeout=300000,cwd=ROOT,allowFailure=false}={}){
  const r=spawnSync(command,args,{
    cwd,encoding:null,stdio:["ignore","pipe","pipe"],timeout,maxBuffer:64*1024*1024,
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
    },
  });
  assert.equal(r.error,undefined,String(r.error||""));
  if(!allowFailure)assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args,cwd=ROOT){
  return String(run("/usr/bin/git",["--no-replace-objects","-C",cwd,...args],
    {timeout:30000,cwd}).stdout||"").trim();
}
function readExact(relative,max=1024*1024){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(part=>!part||part==="."||part===".."),false,
    "unsafe_path:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute),after=fs.lstatSync(absolute);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"])
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  return bytes;
}
function verifyBranchDelta(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  assert.equal(git(["rev-parse",CANDIDATE_HEAD+":"+CANDIDATE_PROOF]),
    CANDIDATE_PROOF_BLOB,"candidate_proof_blob_drift");
  assert.equal(git(["rev-parse",CANDIDATE_HEAD+"^{tree}"]),CANDIDATE_TREE,
    "candidate_tree_drift");
  const changed=git(["diff","--name-only",CANDIDATE_HEAD,"HEAD","--"])
    .split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA,"lock_branch_scope_drift");
}
function verifyWorkflowTriggers(){
  const source=readExact(WORKFLOW,256*1024).toString("utf8");
  for(const relative of WORKFLOW_TRIGGER_PATHS){
    const exact='      - "'+relative+'"';
    assert.equal(source.split(exact).length-1,2,
      "lock_workflow_trigger_dependency_count:"+relative);
  }
}
function validateCandidate(c){
  assert.equal(c.schema,"void_buy_void_enforcement_final_protected_v7_v2_candidate_v3");
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3");
  assert.equal(c.version,3);
  assert.equal(c.repository,"6ZoSo9/void-node");
  assert.equal(c.protected_census_evidence?.census_id,CENSUS_ID);
  assert.equal(c.protected_census_evidence?.census_json_sha256,CENSUS_JSON_SHA256);
  assert.equal(
    c.protected_census_evidence?.protected_tracked_source_inventory_canonical_sha256,
    PROTECTED_INVENTORY_SHA256,
  );
  assert.equal(c.protected_census_current_revalidation?.repository_head_sha,CANDIDATE_HEAD);
  assert.equal(c.protected_census_current_revalidation?.repository_tree_sha,CANDIDATE_TREE);
  assert.equal(c.protected_census_current_revalidation?.exact_candidate_head_revalidation,true);
  assert.equal(c.protected_census_current_revalidation?.source_generation_successor_evidence_bound,true);
  assert.equal(c.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_v1?.length,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_verified,true);
  assert.equal(c.current_enforcement_tracked_source_inventory_sha256,
    PROTECTED_INVENTORY_SHA256);
  assert.equal(c.audited_package_runtime?.profile_id,PROFILE_ID);
  assert.equal(c.audited_package_runtime?.packages_aggregate_sha256,PACKAGE_AGGREGATE);
  assert.equal(c.audited_package_runtime?.profile_canonical_sha256,PROFILE_CANONICAL);
  assert.equal(c.dependency_provider?.provider_closure_sha256,PROVIDER_CLOSURE);
  assert.equal(c.dependency_provider?.provider_closure_semantic_sha256,PROVIDER_SEMANTIC);
  assert.equal(c.dependency_provider?.historical_lock_proof_reexecuted,false);
  assert.equal(c.dependency_provider?.current_content_semantics_requalified,true);
  assert.equal(c.v7_executable_delta?.candidate_generation_sha256,V7_DELTA);
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  assert.equal(c.deployed_artifact_generation_verified,false);
  assert.equal(c.runtime_mount_authority,false);
  assert.equal(c.production_source_finality_authority_ready,false);
  assert.equal(c.public_presale_activation,false);
  assert.equal(c.funds_movement,false);
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  return c;
}
function removeWorktree(holder,wt){
  spawnSync("/usr/bin/git",["--no-replace-objects","-C",ROOT,
    "worktree","remove","--force",wt],{
      cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout:30000,
      env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
        GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
        GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
        GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
    });
  fs.rmSync(holder,{recursive:true,force:true});
}
function candidateBytes(){
  const holder=fs.mkdtempSync(path.join(os.tmpdir(),"void-v3-lock-"));
  const wt=path.join(holder,"candidate");
  let attached=false;
  try{
    run("/usr/bin/git",["--no-replace-objects","-C",ROOT,
      "worktree","add","--detach",wt,CANDIDATE_HEAD],{timeout:30000});
    attached=true;
    run("/bin/cp",["-al",path.join(ROOT,"node_modules"),path.join(wt,"node_modules")],
      {cwd:wt,timeout:120000});
    run("/bin/cp",["-al",path.join(ROOT,"dist"),path.join(wt,"dist")],
      {cwd:wt,timeout:120000});
    const result=run(process.execPath,[path.join(wt,CANDIDATE_PROOF),"--derive"],
      {cwd:wt,timeout:300000});
    const bytes=Buffer.from(result.stdout||Buffer.alloc(0));
    assert.equal(String(result.stderr||""),"","candidate_rederive_stderr");
    assert.equal(bytes.length,CANDIDATE_BYTES,"candidate_bytes");
    assert.equal(sha256(bytes),CANDIDATE_SHA256,"candidate_sha256");
    assert.equal(gitBlob(bytes),CANDIDATE_BLOB,"candidate_git_blob");
    validateCandidate(JSON.parse(bytes.toString("utf8")));
    const committed=readExact(CANDIDATE_FILE,64*1024);
    assert.ok(committed.equals(bytes),"committed_candidate_not_exact_hosted_derivation");
    assert.equal(gitBlob(committed),CANDIDATE_BLOB);
    return bytes;
  }finally{
    if(attached)removeWorktree(holder,wt);
    else fs.rmSync(holder,{recursive:true,force:true});
  }
}
function expectedLock(candidate){
  return {
    schema:"void_buy_void_enforcement_final_protected_v7_v2_lock_v3",
    marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3",
    version:3,
    repository:"6ZoSo9/void-node",
    candidate_head:CANDIDATE_HEAD,
    candidate_hosted_evidence:{
      workflow_run:CANDIDATE_WORKFLOW_RUN,
      node22_artifact_id:CANDIDATE_ARTIFACTS[22],
      node24_artifact_id:CANDIDATE_ARTIFACTS[24],
      node26_artifact_id:CANDIDATE_ARTIFACTS[26],
      cross_node_byte_identity_verified:true,
    },
    candidate_evidence:{
      path:CANDIDATE_FILE,
      derivation_proof_path:CANDIDATE_PROOF,
      derivation_proof_git_blob_sha1:CANDIDATE_PROOF_BLOB,
      bytes:CANDIDATE_BYTES,
      sha256:CANDIDATE_SHA256,
      git_blob_sha1:CANDIDATE_BLOB,
      candidate_enforcement_set_sha256:CANDIDATE_SET,
    },
    protected_census_evidence:{
      census_id:candidate.protected_census_evidence.census_id,
      census_json_sha256:candidate.protected_census_evidence.census_json_sha256,
      protected_tracked_source_inventory_canonical_sha256:
        candidate.protected_census_evidence.protected_tracked_source_inventory_canonical_sha256,
    },
    protected_census_current_revalidation:{
      census_id:candidate.protected_census_current_revalidation.census_id,
      repository_head_sha:candidate.protected_census_current_revalidation.repository_head_sha,
      repository_tree_sha:candidate.protected_census_current_revalidation.repository_tree_sha,
      protected_tracked_source_inventory_canonical_sha256:
        candidate.protected_census_current_revalidation.protected_tracked_source_inventory_canonical_sha256,
      source_generation_successor_evidence_bound:
        candidate.protected_census_current_revalidation.source_generation_successor_evidence_bound,
      exact_candidate_head_revalidation:
        candidate.protected_census_current_revalidation.exact_candidate_head_revalidation,
    },
    audited_package_runtime:{
      profile_id:candidate.audited_package_runtime.profile_id,
      packages_aggregate_sha256:candidate.audited_package_runtime.packages_aggregate_sha256,
      profile_canonical_sha256:candidate.audited_package_runtime.profile_canonical_sha256,
    },
    dependency_provider:{
      provider_closure_sha256:candidate.dependency_provider.provider_closure_sha256,
      provider_closure_semantic_sha256:
        candidate.dependency_provider.provider_closure_semantic_sha256,
      historical_lock_proof_reexecuted:
        candidate.dependency_provider.historical_lock_proof_reexecuted,
      current_content_semantics_requalified:
        candidate.dependency_provider.current_content_semantics_requalified,
    },
    v7_executable_delta_candidate_generation_sha256:
      candidate.v7_executable_delta.candidate_generation_sha256,
    current_enforcement_tracked_source_inventory_sha256:
      candidate.current_enforcement_tracked_source_inventory_sha256,
    complete_executable_closure_verified:true,
    current_enforcement_tracked_source_inventory_verified:true,
    candidate_enforcement_identity_accepted:true,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  };
}
function verify(){
  verifyBranchDelta();
  verifyWorkflowTriggers();
  const candidate=validateCandidate(JSON.parse(candidateBytes().toString("utf8")));
  const expected=Buffer.from(JSON.stringify(expectedLock(candidate),null,2)+"\n","utf8");
  const actual=readExact(LOCK,64*1024);
  assert.ok(actual.equals(expected),"locked_manifest_not_exact");
  return expected;
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify());
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const bytes=verify();
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3_GREEN");
  console.log("candidate_json_sha256="+CANDIDATE_SHA256);
  console.log("candidate_git_blob_sha1="+CANDIDATE_BLOB);
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("protected_census_id="+CENSUS_ID);
  console.log("provider_historical_lock_proof_reexecuted=false");
  console.log("provider_current_content_semantics_requalified=true");
  console.log("lock_json_sha256="+sha256(bytes));
  console.log("complete_executable_closure_verified=true");
  console.log("current_enforcement_tracked_source_inventory_verified=true");
  console.log("candidate_enforcement_identity_accepted=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("runtime_mount_authority=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw Error("usage: proof [--self-test|--derive]");
}
