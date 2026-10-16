#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const BASE="8c499003a6d0755f64be2b9e71b20ea694ac8770";
const SOURCE_PARENT="94e9c269041bf32872c3e97f4302314a9f70d2b7";
const CANDIDATE_HEAD="293da4c552a27de3b8fa548e1becebb9a76f0baa";
const CANDIDATE_WORKFLOW=".github/workflows/buy-void-user-manager-credential-query-elf-candidate-v2.yml";
const PEER_SOURCE="ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c";
const QUERY_SOURCE="ops/precision/void_buy_void_user_manager_private_credential_unit_query_v2.c";
const QUERY_PROOF="scripts/prove_void_buy_user_manager_private_credential_unit_query_v2.mjs";
const PREEXEC_SOURCE="ops/precision/void_buy_void_user_manager_private_credential_unit_query_preexec_v1.c";
const PREEXEC_PROOF="scripts/prove_void_buy_void_user_manager_private_credential_unit_query_preexec_v1.mjs";
const CANDIDATE_FILE="ops/security/buy-void-user-manager-credential-query-elf-candidate-v2.json";
const LOCK_FILE="ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json";
const SELF="scripts/prove_void_buy_user_manager_credential_query_elf_lock_v2.mjs";
const WORKFLOW=".github/workflows/buy-void-user-manager-credential-query-elf-lock-v2.yml";
const DOC="docs/operators/buy-void-user-manager-credential-query-elf-lock-v2.md";

const EXPECTED_SCOPE=[CANDIDATE_FILE,LOCK_FILE,SELF,WORKFLOW,DOC].sort();
const EXPECTED_BLOBS=Object.freeze({
  [PEER_SOURCE]:"d8b30ac499c3bb8a5d223dbc6be687dd175be611",
  [QUERY_SOURCE]:"39b292a6353cc36bcc07a5425ff2c736372a7c83",
  [QUERY_PROOF]:"ea9eec06a355aec3e4448196bc1dd38295de5ad1",
  [PREEXEC_SOURCE]:"0ccd2d07a951389d85a9fc56ec892a774d9dd681",
  [PREEXEC_PROOF]:"58df08ca966f4629893c3885f1df37c837762520",
  [CANDIDATE_WORKFLOW]:"891a8eee66976ed7ed145ad70d5d78674a96554c",
});

const CANDIDATE={
  "marker": "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_CANDIDATE_V2",
  "version": 2,
  "source_parent": "94e9c269041bf32872c3e97f4302314a9f70d2b7",
  "v1_predecessor_lock_id": "voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c",
  "peer_source_git_blob_sha1": "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
  "credential_query_source_git_blob_sha1": "39b292a6353cc36bcc07a5425ff2c736372a7c83",
  "credential_query_proof_git_blob_sha1": "ea9eec06a355aec3e4448196bc1dd38295de5ad1",
  "credential_preexec_source_git_blob_sha1": "0ccd2d07a951389d85a9fc56ec892a774d9dd681",
  "credential_preexec_proof_git_blob_sha1": "58df08ca966f4629893c3885f1df37c837762520",
  "preexec_binary_sha256": "67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c",
  "preexec_binary_bytes": 706504,
  "preexec_static_no_interp": true,
  "query_binary_sha256": "af02d006176db1a16eee52625751736c63af3bd1b250b46f81f200359fb48718",
  "query_binary_bytes": 47160,
  "max_dropin_paths": 64,
  "max_load_credentials": 32,
  "unique_credential_ids_required": true,
  "exactly_one_epoch2_credential_required": true,
  "unrelated_credentials_allowed": true,
  "complete_credential_set_generation_stability_required": true,
  "authenticated_private_manager_peer_required": true,
  "retained_private_connection_required": true,
  "credential_query_preexec_pair_execution_proven": true,
  "credential_contents_read": false,
  "cc_sha256": "1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26",
  "strip_sha256": "0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42",
  "candidate_accepted": false,
  "replacement_authorized": false,
  "live_query_authorized": false,
  "complete_host_evidence_collector": false,
  "production_host_evidence_authority": false,
  "payment_acceptance": false,
  "public_presale_activation": false,
  "transaction": false,
  "funds_movement": false
};
const CANDIDATE_BYTES=1783;
const CANDIDATE_SHA256="ae4e17d0c6874c35378a10cfd3803777d25acb0cbead25767ce3ab2734259949";
const CANDIDATE_BLOB="e193d74abbd7c55a792c6a82280a6a0382a8a719";
const LOCK_ID="voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54";

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
  "schema": "void_buy_void_user_manager_credential_query_elf_lock_v2",
  "marker": "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V2",
  "version": 2,
  "repository": "6ZoSo9/void-node",
  "source_parent": "94e9c269041bf32872c3e97f4302314a9f70d2b7",
  "candidate_head": "293da4c552a27de3b8fa548e1becebb9a76f0baa",
  "candidate_hosted_evidence": {
    "workflow_run": 38846795162,
    "artifact_a": 12023208599,
    "artifact_b": 12023039735,
    "artifact_c": 12022969763,
    "cross_job_byte_identity_verified": true,
    "exact_stripped_pair_executed_before_hash": true
  },
  "candidate_evidence": {
    "path": "ops/security/buy-void-user-manager-credential-query-elf-candidate-v2.json",
    "workflow_path": ".github/workflows/buy-void-user-manager-credential-query-elf-candidate-v2.yml",
    "workflow_git_blob_sha1": "891a8eee66976ed7ed145ad70d5d78674a96554c",
    "bytes": 1783,
    "sha256": "ae4e17d0c6874c35378a10cfd3803777d25acb0cbead25767ce3ab2734259949",
    "git_blob_sha1": "e193d74abbd7c55a792c6a82280a6a0382a8a719",
    "peer_source_git_blob_sha1": "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
    "credential_query_source_git_blob_sha1": "39b292a6353cc36bcc07a5425ff2c736372a7c83",
    "credential_query_proof_git_blob_sha1": "ea9eec06a355aec3e4448196bc1dd38295de5ad1",
    "credential_preexec_source_git_blob_sha1": "0ccd2d07a951389d85a9fc56ec892a774d9dd681",
    "credential_preexec_proof_git_blob_sha1": "58df08ca966f4629893c3885f1df37c837762520",
    "preexec_binary_sha256": "67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c",
    "preexec_binary_bytes": 706504,
    "preexec_static_no_interp": true,
    "query_binary_sha256": "af02d006176db1a16eee52625751736c63af3bd1b250b46f81f200359fb48718",
    "query_binary_bytes": 47160,
    "max_dropin_paths": 64,
    "max_load_credentials": 32,
    "unique_credential_ids_required": true,
    "exactly_one_epoch2_credential_required": true,
    "unrelated_credentials_allowed": true,
    "complete_credential_set_generation_stability_required": true,
    "cc_sha256": "1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26",
    "strip_sha256": "0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42"
  },
  "v1_predecessor_lock_id": "voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c",
  "authenticated_private_manager_peer_required": true,
  "retained_private_connection_required": true,
  "bounded_complete_dropin_set_required": true,
  "bounded_complete_loadcredential_set_required": true,
  "unique_credential_ids_required": true,
  "exactly_one_epoch2_credential_required": true,
  "unrelated_credentials_allowed": true,
  "complete_credential_set_generation_stability_required": true,
  "credential_query_preexec_pair_execution_proven": true,
  "candidate_accepted": true,
  "replacement_authorized": false,
  "live_query_authorized": false,
  "credential_contents_read": false,
  "complete_host_evidence_collector": false,
  "production_host_evidence_authority": false,
  "payment_acceptance": false,
  "public_presale_activation": false,
  "transaction": false,
  "funds_movement": false
};
  const id="voidbuyumqcredelflock2_"+
    sha256(Buffer.from(canonical(body),"utf8"));
  assert.equal(id,LOCK_ID);
  return Object.freeze({...body,lock_id:id});
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",BASE,"HEAD"]);
  const changed=git(["diff","--name-only",BASE,"HEAD","--"])
    .split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_SCOPE,"credential_query_v2_lock_scope_drift");
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
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-credential-query-lock-v2-"));
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
      "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V2_SELF_TEST_GREEN",
      "dropin_limit_64=true",
      "loadcredential_limit_32=true",
      "exactly_one_target_credential_match_required=true",
      "unrelated_credentials_allowed=true",
      "duplicate_credential_ids_rejected=true",
      "credential_set_generation_stability_required=true",
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
  assert.ok(read(LOCK_FILE,16384).equals(expected),"committed_lock_bytes_mismatch");
  return {lock,expected,binaries};
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify().expected);
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const v=verify();
  console.log("VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V2_GREEN");
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
  console.log("candidate_accepted=true");
  console.log("replacement_authorized=false");
  console.log("live_query_authorized=false");
  console.log("credential_contents_read=false");
  console.log("production_host_evidence_authority=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("transaction=false");
  console.log("funds_movement=false");
}else{
  throw new Error("usage: proof [--self-test|--derive]");
}
