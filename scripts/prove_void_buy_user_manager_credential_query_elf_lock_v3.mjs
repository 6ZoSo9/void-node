#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const BASE="33ee23d70bac9c7f315cd1ddf76204ea4580e260";
const SOURCE_PARENT="6d8d0725a36d7907e4620371952aa71fd64696df";
const CANDIDATE_HEAD="33ee23d70bac9c7f315cd1ddf76204ea4580e260";
const CANDIDATE_WORKFLOW=".github/workflows/buy-void-user-manager-credential-query-elf-candidate-v3.yml";
const PEER_SOURCE="ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c";
const QUERY_SOURCE="ops/precision/void_buy_void_user_manager_private_credential_unit_query_v3.c";
const QUERY_PROOF="scripts/prove_void_buy_user_manager_private_credential_unit_query_v3.mjs";
const PREEXEC_SOURCE="ops/precision/void_buy_void_user_manager_private_credential_unit_query_preexec_v1.c";
const PREEXEC_PROOF="scripts/prove_void_buy_void_user_manager_private_credential_unit_query_preexec_v1.mjs";
const CANDIDATE_FILE="ops/security/buy-void-user-manager-credential-query-elf-candidate-v3.json";
const LOCK_FILE="ops/security/buy-void-user-manager-credential-query-elf-lock-v3.json";
const SELF="scripts/prove_void_buy_user_manager_credential_query_elf_lock_v3.mjs";
const WORKFLOW=".github/workflows/buy-void-user-manager-credential-query-elf-lock-v3.yml";
const DOC="docs/operators/buy-void-user-manager-credential-query-elf-lock-v3.md";

const EXPECTED_SCOPE=[CANDIDATE_FILE,LOCK_FILE,SELF,WORKFLOW,DOC].sort();
const EXPECTED_BLOBS=Object.freeze({
  [PEER_SOURCE]:"d8b30ac499c3bb8a5d223dbc6be687dd175be611",
  [QUERY_SOURCE]:"0d0e9546aea6e7346f5b35559bcdd8e7788900fe",
  [QUERY_PROOF]:"f640e7fc19b33513360b2247ac1bdc705f848f4f",
  [PREEXEC_SOURCE]:"0ccd2d07a951389d85a9fc56ec892a774d9dd681",
  [PREEXEC_PROOF]:"58df08ca966f4629893c3885f1df37c837762520",
  [CANDIDATE_WORKFLOW]:"f83fdc9c43d4523275d6fe87a3f42bb8e7bf2242",
});

const CANDIDATE={
  marker:"VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_CANDIDATE_V3",
  version:3,
  source_parent:SOURCE_PARENT,
  v2_predecessor_lock_id:"voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54",
  peer_source_git_blob_sha1:"d8b30ac499c3bb8a5d223dbc6be687dd175be611",
  credential_query_source_git_blob_sha1:"0d0e9546aea6e7346f5b35559bcdd8e7788900fe",
  credential_query_proof_git_blob_sha1:"f640e7fc19b33513360b2247ac1bdc705f848f4f",
  credential_preexec_source_git_blob_sha1:"0ccd2d07a951389d85a9fc56ec892a774d9dd681",
  credential_preexec_proof_git_blob_sha1:"58df08ca966f4629893c3885f1df37c837762520",
  preexec_binary_sha256:"67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c",
  preexec_binary_bytes:706504,
  preexec_static_no_interp:true,
  query_binary_sha256:"d60e5719a4d785dbfaca90074ed3313ef9e0cae84c3f933af44d7faf84763923",
  query_binary_bytes:47160,
  max_dropin_paths:64,
  max_load_credentials:32,
  unique_credential_ids_required:true,
  exactly_one_epoch2_credential_required:true,
  unrelated_credentials_allowed:true,
  complete_credential_set_generation_stability_required:true,
  complete_dropin_set_sha256_emitted:true,
  complete_credential_set_sha256_emitted:true,
  cross_query_complete_set_binding_enabled:true,
  authenticated_private_manager_peer_required:true,
  retained_private_connection_required:true,
  credential_query_preexec_pair_execution_proven:true,
  credential_contents_read:false,
  cc_sha256:"1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26",
  strip_sha256:"0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42",
  candidate_accepted:false,
  replacement_authorized:false,
  live_query_authorized:false,
  complete_host_evidence_collector:false,
  production_host_evidence_authority:false,
  payment_acceptance:false,
  public_presale_activation:false,
  wc_void_market_activation:false,
  transaction:false,
  funds_movement:false,
};
const CANDIDATE_BYTES=1953;
const CANDIDATE_SHA256="41d7c91ac9ff66e28892a71839bef892b36719ff50b7e8f4a980f4426f786ac6";
const CANDIDATE_BLOB="f3a2a625d539543d1864fe8eb43cf85c6ce6d95f";
const LOCK_ID="voidbuyumqcredelflock3_cff58f9fa4093d55899cde3e79b8d9a550c6e3479e27c3bd7f17b04ead688763";

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function canonical(v){
  if(v===null)return "null";
  if(typeof v==="boolean")return v?"true":"false";
  if(typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object");
  return "{"+Object.keys(v).sort()
    .map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function read(relative,max=4*1024*1024){
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  return bytes;
}
function run(command,args,{cwd=ROOT,env=null,timeout=120000}={}){
  const r=spawnSync(command,args,{
    cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:16*1024*1024,
    env:env||{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
    },
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return String(r.stdout||"");
}
function git(args){
  return run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],
    {timeout:30000}).trim();
}
function exactCandidateBytes(){
  const bytes=Buffer.from(JSON.stringify(CANDIDATE)+"\n","utf8");
  assert.equal(bytes.length,CANDIDATE_BYTES);
  assert.equal(sha256(bytes),CANDIDATE_SHA256);
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB);
  assert.ok(read(CANDIDATE_FILE,16384).equals(bytes),"committed_candidate_bytes_mismatch");
  return bytes;
}
function expectedLock(){
  const body={
    schema:"void_buy_void_user_manager_credential_query_elf_lock_v3",
    marker:"VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V3",
    version:3,
    repository:"6ZoSo9/void-node",
    source_parent:SOURCE_PARENT,
    candidate_head:CANDIDATE_HEAD,
    candidate_hosted_evidence:{
      workflow_run:38850709119,
      artifact_a:12025225996,
      artifact_b:12025725090,
      artifact_c:12025660396,
      cross_job_byte_identity_verified:true,
      exact_stripped_pair_executed_before_hash:true,
    },
    candidate_evidence:{
      path:CANDIDATE_FILE,
      workflow_path:CANDIDATE_WORKFLOW,
      workflow_git_blob_sha1:EXPECTED_BLOBS[CANDIDATE_WORKFLOW],
      bytes:CANDIDATE_BYTES,
      sha256:CANDIDATE_SHA256,
      git_blob_sha1:CANDIDATE_BLOB,
      peer_source_git_blob_sha1:CANDIDATE.peer_source_git_blob_sha1,
      credential_query_source_git_blob_sha1:CANDIDATE.credential_query_source_git_blob_sha1,
      credential_query_proof_git_blob_sha1:CANDIDATE.credential_query_proof_git_blob_sha1,
      credential_preexec_source_git_blob_sha1:CANDIDATE.credential_preexec_source_git_blob_sha1,
      credential_preexec_proof_git_blob_sha1:CANDIDATE.credential_preexec_proof_git_blob_sha1,
      preexec_binary_sha256:CANDIDATE.preexec_binary_sha256,
      preexec_binary_bytes:CANDIDATE.preexec_binary_bytes,
      preexec_static_no_interp:true,
      query_binary_sha256:CANDIDATE.query_binary_sha256,
      query_binary_bytes:CANDIDATE.query_binary_bytes,
      max_dropin_paths:64,
      max_load_credentials:32,
      unique_credential_ids_required:true,
      exactly_one_epoch2_credential_required:true,
      unrelated_credentials_allowed:true,
      complete_credential_set_generation_stability_required:true,
      complete_dropin_set_sha256_emitted:true,
      complete_credential_set_sha256_emitted:true,
      cross_query_complete_set_binding_enabled:true,
      cc_sha256:CANDIDATE.cc_sha256,
      strip_sha256:CANDIDATE.strip_sha256,
    },
    v2_predecessor_lock_id:CANDIDATE.v2_predecessor_lock_id,
    authenticated_private_manager_peer_required:true,
    retained_private_connection_required:true,
    bounded_complete_dropin_set_required:true,
    bounded_complete_loadcredential_set_required:true,
    unique_credential_ids_required:true,
    exactly_one_epoch2_credential_required:true,
    unrelated_credentials_allowed:true,
    complete_credential_set_generation_stability_required:true,
    complete_dropin_set_sha256_emitted:true,
    complete_credential_set_sha256_emitted:true,
    cross_query_complete_set_binding_enabled:true,
    credential_query_preexec_pair_execution_proven:true,
    candidate_accepted:true,
    replacement_authorized:false,
    live_query_authorized:false,
    credential_contents_read:false,
    complete_host_evidence_collector:false,
    production_host_evidence_authority:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    transaction:false,
    funds_movement:false,
  };
  const id="voidbuyumqcredelflock3_"+
    sha256(Buffer.from(canonical(body),"utf8"));
  assert.equal(id,LOCK_ID);
  return Object.freeze({...body,lock_id:id});
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",BASE,"HEAD"]);
  const changed=git(["diff","--name-only",BASE,"HEAD","--"])
    .split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_SCOPE,"credential_query_v3_lock_scope_drift");
  for(const [relative,expected] of Object.entries(EXPECTED_BLOBS)){
    assert.equal(git(["rev-parse","HEAD:"+relative]),expected,
      "source_blob_drift:"+relative);
  }
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_FILE]),CANDIDATE_BLOB);
}
function rederiveBinaries(){
  assert.equal(sha256(fs.readFileSync("/usr/bin/cc")),CANDIDATE.cc_sha256,
    "cc_identity_drift");
  assert.equal(sha256(fs.readFileSync("/usr/bin/strip")),CANDIDATE.strip_sha256,
    "strip_identity_drift");
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-credential-query-lock-v3-"));
  try{
    const pre=path.join(tmp,"preexec");
    const query=path.join(tmp,"query");
    const buildEnv={
      PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",SOURCE_DATE_EPOCH:"0"
    };
    run("/usr/bin/cc",[
      "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
      "-static","-fno-pie","-no-pie","-Wl,--build-id=none",
      "-o",pre,path.join(ROOT,PREEXEC_SOURCE),
    ],{env:buildEnv});
    run("/usr/bin/cc",[
      "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
      "-Wl,--build-id=none","-o",query,path.join(ROOT,QUERY_SOURCE),"-ldl",
    ],{env:buildEnv});
    run("/usr/bin/strip",["--strip-all",pre],
      {env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}});
    run("/usr/bin/strip",["--strip-all",query],
      {env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}});
    const pb=fs.readFileSync(pre),qb=fs.readFileSync(query);
    assert.equal(pb.length,CANDIDATE.preexec_binary_bytes);
    assert.equal(sha256(pb),CANDIDATE.preexec_binary_sha256);
    assert.equal(qb.length,CANDIDATE.query_binary_bytes);
    assert.equal(sha256(qb),CANDIDATE.query_binary_sha256);
    const qout=run(query,["--self-test"],{env:{
      PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",
      VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1:"1",
    }});
    for(const line of [
      "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3_SELF_TEST_GREEN",
      "dropin_limit_64=true",
      "loadcredential_limit_32=true",
      "exactly_one_target_credential_match_required=true",
      "unrelated_credentials_allowed=true",
      "duplicate_credential_ids_rejected=true",
      "credential_set_generation_stability_required=true",
      "complete_dropin_set_sha256_emitted=true",
      "complete_credential_set_sha256_emitted=true",
      "sha256_known_vector_verified=true",
      "credential_contents_read=false",
    ]) assert.ok(qout.split("\n").includes(line),line);
    return {preexec_sha256:sha256(pb),query_sha256:sha256(qb)};
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
}
function verify(){
  verifyBranch();
  exactCandidateBytes();
  const binaries=rederiveBinaries();
  const lock=expectedLock();
  const expected=Buffer.from(JSON.stringify(lock,null,2)+"\n","utf8");
  assert.ok(read(LOCK_FILE,32768).equals(expected),"committed_lock_bytes_mismatch");
  return {lock,expected,binaries};
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify().expected);
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const v=verify();
  console.log("VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V3_GREEN");
  console.log("lock_id="+v.lock.lock_id);
  console.log("candidate_sha256="+CANDIDATE_SHA256);
  console.log("preexec_binary_sha256="+v.binaries.preexec_sha256);
  console.log("query_binary_sha256="+v.binaries.query_sha256);
  console.log("max_dropin_paths=64");
  console.log("max_load_credentials=32");
  console.log("unique_credential_ids_required=true");
  console.log("exactly_one_epoch2_credential_required=true");
  console.log("unrelated_credentials_allowed=true");
  console.log("complete_credential_set_generation_stability_required=true");
  console.log("complete_dropin_set_sha256_emitted=true");
  console.log("complete_credential_set_sha256_emitted=true");
  console.log("cross_query_complete_set_binding_enabled=true");
  console.log("candidate_accepted=true");
  console.log("replacement_authorized=false");
  console.log("live_query_authorized=false");
  console.log("credential_contents_read=false");
  console.log("production_host_evidence_authority=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("wc_void_market_activation=false");
  console.log("transaction=false");
  console.log("funds_movement=false");
}else{
  throw new Error("usage: proof [--self-test|--derive]");
}
