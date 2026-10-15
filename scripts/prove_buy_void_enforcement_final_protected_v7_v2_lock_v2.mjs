#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE_HEAD="1d138dcb3ac61f156fe8eb0fff27341fe97c04f9";
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v2.mjs";
const CANDIDATE_PROOF_BLOB="5cb990d0ef680f80292bed5f6b28c11d4ee1ffed";
const CANDIDATE_FILE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json";
const WORKFLOW=".github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v2.yml";
const LOCK_DOC="docs/architecture/buy-void-enforcement-final-protected-v7-v2-lock-v2.md";
const SELF="scripts/prove_buy_void_enforcement_final_protected_v7_v2_lock_v2.mjs";
const CANDIDATE_BYTES=16342;
const CANDIDATE_SHA256="092a97373013d32dda610df7363587fa3a669f33248a37420b07541d12d892bb";
const CANDIDATE_BLOB="4e23ecbb64eb26c14f5ab15af85eb86d59c3a718";
const CANDIDATE_SET="05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852";
const CANDIDATE_WORKFLOW_RUN=38654613151;
const CANDIDATE_ARTIFACTS=Object.freeze({
  22:11936242797,
  24:11935634883,
  26:11936605015,
});
const CENSUS_ID="voidbefv7c4_9c8fa20632d3cfb431c0d13229153d19f076613720c7402e5374eab1f833401d";
const CENSUS_JSON_SHA256="c9d910cd461b87c6b4722ada7505ceffe9a8d3c266387f3d9bbebddaf8f586f8";
const PROTECTED_INVENTORY_SHA256="224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2";
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
  LOCK,SELF,LOCK_DOC,CANDIDATE_FILE,
]);

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

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
function run(command,args,{timeout=300000}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:null,stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:32*1024*1024,
    env:{
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
function git(args){
  return String(run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],
    {timeout:30000}).stdout||"").trim();
}
function verifyBranchDelta(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_PROOF]),CANDIDATE_PROOF_BLOB,
    "candidate_proof_blob_drift");
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
  assert.equal(c.schema,"void_buy_void_enforcement_final_protected_v7_v2_candidate_v2");
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V2");
  assert.equal(c.version,2);
  assert.equal(c.repository,"6ZoSo9/void-node");
  assert.equal(c.protected_census_evidence?.census_id,CENSUS_ID);
  assert.equal(c.protected_census_evidence?.census_json_sha256,CENSUS_JSON_SHA256);
  assert.equal(
    c.protected_census_evidence?.protected_tracked_source_inventory_canonical_sha256,
    PROTECTED_INVENTORY_SHA256,
  );
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
function candidateBytes(){
  const loader=pathToFileURL(
    path.join(ROOT,"node_modules/tsx/dist/loader.mjs"),
  ).href;
  const result=run(process.execPath,[
    "--import",loader,path.join(ROOT,CANDIDATE_PROOF),"--derive",
  ]);
  const bytes=Buffer.from(result.stdout||Buffer.alloc(0));
  assert.equal(bytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(bytes),CANDIDATE_SHA256,"candidate_sha256");
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB,"candidate_git_blob");
  validateCandidate(JSON.parse(bytes.toString("utf8")));
  const committed=readExact(CANDIDATE_FILE,64*1024);
  assert.ok(committed.equals(bytes),"committed_candidate_not_exact_hosted_derivation");
  assert.equal(gitBlob(committed),CANDIDATE_BLOB);
  return bytes;
}
function expectedLock(){
  return {
    schema:"void_buy_void_enforcement_final_protected_v7_v2_lock_v2",
    marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2",
    version:2,
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
      census_id:CENSUS_ID,
      census_json_sha256:CENSUS_JSON_SHA256,
      protected_tracked_source_inventory_canonical_sha256:
        PROTECTED_INVENTORY_SHA256,
    },
    audited_package_runtime:{
      profile_id:PROFILE_ID,
      packages_aggregate_sha256:PACKAGE_AGGREGATE,
      profile_canonical_sha256:PROFILE_CANONICAL,
    },
    dependency_provider:{
      provider_closure_sha256:PROVIDER_CLOSURE,
      provider_closure_semantic_sha256:PROVIDER_SEMANTIC,
    },
    v7_executable_delta_candidate_generation_sha256:V7_DELTA,
    current_enforcement_tracked_source_inventory_sha256:
      PROTECTED_INVENTORY_SHA256,
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
  candidateBytes();
  const expected=Buffer.from(JSON.stringify(expectedLock(),null,2)+"\n","utf8");
  const actual=readExact(LOCK,64*1024);
  assert.ok(actual.equals(expected),"locked_manifest_not_exact");
  return expected;
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify());
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const bytes=verify();
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2_GREEN");
  console.log("candidate_json_sha256="+CANDIDATE_SHA256);
  console.log("candidate_git_blob_sha1="+CANDIDATE_BLOB);
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("protected_census_id="+CENSUS_ID);
  console.log("lock_json_sha256="+sha256(bytes));
  console.log("complete_executable_closure_verified=true");
  console.log("current_enforcement_tracked_source_inventory_verified=true");
  console.log("candidate_enforcement_identity_accepted=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw Error("usage: proof [--self-test|--derive]");
}
