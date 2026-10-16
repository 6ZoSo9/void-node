#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE_HEAD="c40710aab6bbd86fccce2385c7dfb3f64d454e57";
const CANDIDATE_PROOF=
  "scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v3.mjs";
const CANDIDATE_PROOF_BLOB="b2cf2514e2a75c91446edbe4b56ed995fb0a8fc6";
const CANDIDATE_WORKFLOW=
  ".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v3.yml";
const CANDIDATE_WORKFLOW_BLOB="1df0471c76276965147feccca8496f4c234f42f8";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v3.mjs";
const DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v3.md";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-lock-v3.yml";

const CANDIDATE_BYTES=18142;
const CANDIDATE_SHA256=
  "163feaeb76d185c3bce1cf13e9189cacb3848eb3fc676882dfbd799d7959306b";
const CANDIDATE_BLOB="33188cccf898f5f8f785039415c083e9a69a66f6";
const CANDIDATE_SET=
  "e3430aee5444c8c45bea682d8bad8f7fc5b99d0eeaad002f4fd10b1a5201dd45";

const CANDIDATE_WORKFLOW_RUN=38846038425;
const CANDIDATE_ARTIFACTS=Object.freeze([
  Object.freeze({
    node:22,
    artifact_id:12022239687,
    artifact_name:
      "protected-v7-v2-candidate-v3-c40710aab6bbd86fccce2385c7dfb3f64d454e57-node-22",
    archive_digest:
      "sha256:c425259fda2b657b2c260519f1fbbdf70db9f91774e205fa05a777a7dcb02402",
  }),
  Object.freeze({
    node:24,
    artifact_id:12023296743,
    artifact_name:
      "protected-v7-v2-candidate-v3-c40710aab6bbd86fccce2385c7dfb3f64d454e57-node-24",
    archive_digest:
      "sha256:7a702241c2fec156f2811432b4e634cec06a6c8b22abb137bde4ee5e5ceee393",
  }),
  Object.freeze({
    node:26,
    artifact_id:12022978712,
    artifact_name:
      "protected-v7-v2-candidate-v3-c40710aab6bbd86fccce2385c7dfb3f64d454e57-node-26",
    archive_digest:
      "sha256:d3dd6e441d1884cac2a765a834a3eb5b0b5125026768247ef6e79a8ffc487df5",
  }),
]);

const HOSTED_CENSUS_ID=
  "voidbefv7c5_15bb0ac8cfebf0f70b20442dd80bb84ea4bef4e0b50eefff71363237a0bf6c47";
const HOSTED_CENSUS_SHA=
  "66f9a8e98cfa289117c58a661532b3fa6403f9c8d116c1c5c4462d66e1454057";
const HEAD_CENSUS_ID=
  "voidbefv7c5_e52c279da7b3bb5958aeeb3bd1b5fc64070163b35a87a275912a424ffdc79ce2";
const INVENTORY_SHA=
  "297399d8c5cd975e5bf9f96adc291aebae13ce6a83c26ca5a039668c7b32b0f2";
const PROFILE_ID=
  "voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac";
const PACKAGE_AGGREGATE=
  "77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6";
const PROFILE_CANONICAL=
  "3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757";
const PROVIDER_CLOSURE=
  "3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945";
const PROVIDER_SEMANTIC=
  "95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384";
const V7_DELTA=
  "5c5637207d5970d2ca793cf431726ff8d86db370b3e69e9ff1e5caa25d9b5224";
const PREDECESSOR_LOCK=
  "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const PREDECESSOR_LOCK_BLOB="589845615654da8b688764377b34296267ac0063";
const PREDECESSOR_SET=
  "05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852";

const EXPECTED_DELTA=Object.freeze([LOCK,SELF,DOC,WORKFLOW].sort());
const WORKFLOW_TRIGGER_PATHS=Object.freeze([
  LOCK,SELF,DOC,CANDIDATE_PROOF,CANDIDATE_WORKFLOW,
]);

const sha256=(b)=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=(b)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function readExact(relative,max=1024*1024){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some((part)=>!part||part==="."||part===".."),false,
    "unsafe_path:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  return bytes;
}

function run(command,args,{cwd=ROOT,timeout=300000,env=null}={}){
  const r=spawnSync(command,args,{
    cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:32*1024*1024,
    env:env||{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
    },
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}

function git(args,cwd=ROOT){
  return String(run("/usr/bin/git",["--no-replace-objects","-C",cwd,...args],
    {timeout:30000}).stdout||"").trim();
}

function verifyBranchDelta(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_PROOF]),CANDIDATE_PROOF_BLOB,
    "candidate_proof_blob_drift");
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_WORKFLOW]),CANDIDATE_WORKFLOW_BLOB,
    "candidate_workflow_blob_drift");
  assert.equal(git(["rev-parse","HEAD:"+PREDECESSOR_LOCK]),PREDECESSOR_LOCK_BLOB,
    "predecessor_lock_blob_drift");
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
  assert.equal(c.protected_census_parent,
    "d5ad8c401b67832919eeabd95f26bdae513e68fe");
  assert.equal(c.current_enforcement_parent,
    "6080389131c3cdb80fa9935b5ff80f4e40f09938");
  assert.equal(c.protected_census_evidence?.census_id,HOSTED_CENSUS_ID);
  assert.equal(c.protected_census_evidence?.census_json_sha256,HOSTED_CENSUS_SHA);
  assert.equal(
    c.protected_census_current_revalidation?.census_id,
    HEAD_CENSUS_ID,
  );
  assert.equal(
    c.protected_census_current_revalidation?.repository_head_sha,
    CANDIDATE_HEAD,
  );
  assert.equal(
    c.protected_census_current_revalidation
      ?.protected_tracked_source_inventory_canonical_sha256,
    INVENTORY_SHA,
  );
  assert.equal(c.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_v1?.length,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_verified,true);
  assert.equal(c.current_enforcement_tracked_source_inventory_sha256,INVENTORY_SHA);
  assert.equal(c.audited_package_runtime?.profile_id,PROFILE_ID);
  assert.equal(c.audited_package_runtime?.packages_aggregate_sha256,PACKAGE_AGGREGATE);
  assert.equal(c.audited_package_runtime?.profile_canonical_sha256,PROFILE_CANONICAL);
  assert.equal(c.dependency_provider?.provider_closure_sha256,PROVIDER_CLOSURE);
  assert.equal(c.dependency_provider?.provider_closure_semantic_sha256,PROVIDER_SEMANTIC);
  assert.equal(c.dependency_provider?.historical_lock_proof_reexecuted,false);
  assert.equal(c.dependency_provider?.current_content_semantics_requalified,true);
  assert.equal(c.dependency_provider?.provider_source_path_count,12);
  assert.equal(c.dependency_provider?.provider_artifact_identity_count,12);
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

function verifyCandidateBytes(bytes){
  assert.equal(bytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(bytes),CANDIDATE_SHA256,"candidate_sha256");
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB,"candidate_git_blob");
  return validateCandidate(JSON.parse(bytes.toString("utf8")));
}

function expectedLock(){
  return {
    schema:"void_buy_void_enforcement_final_protected_v7_v2_lock_v3",
    marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3",
    version:3,
    repository:"6ZoSo9/void-node",
    candidate_head:CANDIDATE_HEAD,
    candidate_hosted_evidence:{
      workflow_run:CANDIDATE_WORKFLOW_RUN,
      artifacts:CANDIDATE_ARTIFACTS,
      cross_node_byte_identity_verified:true,
      cross_process_derivation_byte_identity_verified:true,
      self_test_candidate_sha_matches_derive:true,
    },
    candidate_evidence:{
      derivation_proof_path:CANDIDATE_PROOF,
      derivation_proof_git_blob_sha1:CANDIDATE_PROOF_BLOB,
      derivation_workflow_path:CANDIDATE_WORKFLOW,
      derivation_workflow_git_blob_sha1:CANDIDATE_WORKFLOW_BLOB,
      bytes:CANDIDATE_BYTES,
      sha256:CANDIDATE_SHA256,
      git_blob_sha1:CANDIDATE_BLOB,
      candidate_enforcement_set_sha256:CANDIDATE_SET,
    },
    protected_census_evidence:{
      hosted_census_id:HOSTED_CENSUS_ID,
      hosted_census_json_sha256:HOSTED_CENSUS_SHA,
      candidate_head_revalidation_census_id:HEAD_CENSUS_ID,
      protected_tracked_source_inventory_canonical_sha256:INVENTORY_SHA,
      candidate_head_revalidation_bound:true,
    },
    predecessor_lock:{
      path:PREDECESSOR_LOCK,
      git_blob_sha1:PREDECESSOR_LOCK_BLOB,
      candidate_enforcement_set_sha256:PREDECESSOR_SET,
      candidate_enforcement_identity_accepted:true,
      historical_identity_preserved:true,
    },
    audited_package_runtime:{
      profile_id:PROFILE_ID,
      packages_aggregate_sha256:PACKAGE_AGGREGATE,
      profile_canonical_sha256:PROFILE_CANONICAL,
    },
    dependency_provider:{
      provider_closure_sha256:PROVIDER_CLOSURE,
      provider_closure_semantic_sha256:PROVIDER_SEMANTIC,
      historical_lock_proof_reexecuted:false,
      current_content_semantics_requalified:true,
      provider_source_path_count:12,
      provider_artifact_identity_count:12,
    },
    v7_executable_delta_candidate_generation_sha256:V7_DELTA,
    current_enforcement_tracked_source_inventory_sha256:INVENTORY_SHA,
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

function verifyLock(){
  verifyBranchDelta();
  verifyWorkflowTriggers();
  const expected=Buffer.from(JSON.stringify(expectedLock(),null,2)+"\n","utf8");
  const actual=readExact(LOCK,64*1024);
  assert.ok(actual.equals(expected),"locked_manifest_not_exact");
  return expected;
}

function verifyArtifactFile(file){
  const absolute=path.resolve(file);
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size===CANDIDATE_BYTES,"candidate_artifact_metadata_invalid");
  const bytes=fs.readFileSync(absolute),after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]){
    assert.equal(after[key],before[key],"candidate_artifact_changed:"+key);
  }
  verifyCandidateBytes(bytes);
  return bytes;
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verifyLock());
}else if(args.length===2&&args[0]==="--verify-candidate"){
  const bytes=verifyArtifactFile(args[1]);
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3_CANDIDATE_GREEN");
  console.log("candidate_json_sha256="+sha256(bytes));
  console.log("candidate_git_blob_sha1="+gitBlob(bytes));
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("candidate_enforcement_identity_accepted=false");
  console.log("funds_movement=false");
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const bytes=verifyLock();
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3_GREEN");
  console.log("candidate_json_sha256="+CANDIDATE_SHA256);
  console.log("candidate_git_blob_sha1="+CANDIDATE_BLOB);
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("protected_census_id="+HOSTED_CENSUS_ID);
  console.log("candidate_head_revalidation_census_id="+HEAD_CENSUS_ID);
  console.log("lock_json_sha256="+sha256(bytes));
  console.log("complete_executable_closure_verified=true");
  console.log("current_enforcement_tracked_source_inventory_verified=true");
  console.log("candidate_enforcement_identity_accepted=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw Error("usage: proof [--self-test|--derive|--verify-candidate <path>]");
}
