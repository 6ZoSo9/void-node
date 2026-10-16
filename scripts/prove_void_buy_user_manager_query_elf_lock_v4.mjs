#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE_HEAD="12cec975bc560ebd90c430732261c1b98c4af1d2";
const SOURCE_PARENT="1f46c16d272f7eb1917719f1f0c17d7cf398819e";
const CANDIDATE_WORKFLOW=".github/workflows/buy-void-user-manager-query-elf-candidate-v4.yml";
const CANDIDATE_WORKFLOW_BLOB="abf4f67d2e99fb29906e21ba1c388df6cdc8c0ce";
const PREEXEC_SOURCE="ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c";
const QUERY_SOURCE="ops/precision/void_buy_void_user_manager_private_unit_query_v1.c";
const PEER_SOURCE="ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c";
const CANDIDATE_FILE="ops/security/buy-void-user-manager-query-elf-candidate-v4.json";
const LOCK_FILE="ops/security/buy-void-user-manager-query-elf-lock-v4.json";
const SELF="scripts/prove_void_buy_user_manager_query_elf_lock_v4.mjs";
const WORKFLOW=".github/workflows/buy-void-user-manager-query-elf-lock-v4.yml";
const DOC="docs/operators/buy-void-user-manager-query-elf-lock-v4.md";
const EXPECTED_DELTA=[CANDIDATE_FILE,LOCK_FILE,SELF,WORKFLOW,DOC].sort();

const CANDIDATE=Object.freeze({
  "marker": "VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_CANDIDATE_V4",
  "version": 4,
  "source_parent": "1f46c16d272f7eb1917719f1f0c17d7cf398819e",
  "peer_source_git_blob_sha1": "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
  "preexec_source_git_blob_sha1": "f0fbfaae97df3294097a281100f06ada2ef157ff",
  "query_source_git_blob_sha1": "6aefc385bcc4212d3c45e36871bfde0da3529baa",
  "preexec_binary_sha256": "8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11",
  "preexec_binary_bytes": 706504,
  "preexec_static_no_interp": true,
  "query_binary_sha256": "e8df6ed33ed798e2e3015f7c9a8a3548031049eb1867029e35e3e20953aeed56",
  "query_binary_bytes": 43064,
  "kernel_capability_binding_v3": true,
  "private_users_false_required": true,
  "configured_bounding_set_may_be_nonzero": true,
  "kernel_capability_state_rechecked": true,
  "cc_sha256": "1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26",
  "strip_sha256": "0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42",
  "historical_v1_v2_evidence_untouched": true,
  "candidate_accepted": false,
  "install_authorized": false,
  "live_query_authorized": false,
  "complete_host_evidence_collector": false,
  "payment_acceptance": false,
  "public_presale_activation": false,
  "funds_movement": false
});
const CANDIDATE_BYTES=1192;
const CANDIDATE_SHA256="8c0cdaa52e62c1ecccdbf6707264133cac46e44eac24a4f07214c7289b1394cf";
const CANDIDATE_BLOB="988542122028843b2848063dbbaf7a94c32d6cd4";
const PREDECESSOR_LOCK_BLOB="347951dbaa2d9bb5c31c8b718d9965ab3fdf7301";
const PREDECESSOR_LOCK_ID="voidbuyumqelflock2_fa3cd31d2ba07c17daeb0dcea725dc72ad461af0afc6e336079be25b34e2b89c";
const LOCK_ID="voidbuyumqelflock4_846047629dd2dd58f73f926d85cddde5b0a1510493d59a2d7ef778d235a70301";

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
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function read(relative,max=4*1024*1024){
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  return bytes;
}
function run(command,args,{cwd=ROOT,env=null,timeout=120000}={}){
  const result=spawnSync(command,args,{
    cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,maxBuffer:16*1024*1024,
    env:env||{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"
    },
  });
  assert.equal(result.error,undefined,String(result.error||""));
  assert.equal(result.status,0,String(result.stderr||result.stdout||""));
  return String(result.stdout||"");
}
function git(args){
  return run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).trim();
}
function exactCandidateBytes(){
  const bytes=Buffer.from(JSON.stringify(CANDIDATE)+"\n","utf8");
  assert.equal(bytes.length,CANDIDATE_BYTES);
  assert.equal(sha256(bytes),CANDIDATE_SHA256);
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB);
  assert.ok(read(CANDIDATE_FILE,4096).equals(bytes),"committed_candidate_bytes_mismatch");
}
function expectedLock(){
  const body={
  "schema": "void_buy_void_user_manager_query_elf_lock_v4",
  "marker": "VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V4",
  "version": 4,
  "repository": "6ZoSo9/void-node",
  "canonical_source_parent": "1f46c16d272f7eb1917719f1f0c17d7cf398819e",
  "candidate_head": "12cec975bc560ebd90c430732261c1b98c4af1d2",
  "candidate_hosted_evidence": {
    "workflow_run": 38749311537,
    "artifact_a": 11980875596,
    "artifact_b": 11979773954,
    "artifact_c": 11980940884,
    "cross_job_byte_identity_verified": true,
    "exact_stripped_pair_executed_before_hash": true
  },
  "candidate_evidence": {
    "path": "ops/security/buy-void-user-manager-query-elf-candidate-v4.json",
    "workflow_path": ".github/workflows/buy-void-user-manager-query-elf-candidate-v4.yml",
    "workflow_git_blob_sha1": "abf4f67d2e99fb29906e21ba1c388df6cdc8c0ce",
    "bytes": 1192,
    "sha256": "8c0cdaa52e62c1ecccdbf6707264133cac46e44eac24a4f07214c7289b1394cf",
    "git_blob_sha1": "988542122028843b2848063dbbaf7a94c32d6cd4",
    "peer_source_git_blob_sha1": "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
    "preexec_source_git_blob_sha1": "f0fbfaae97df3294097a281100f06ada2ef157ff",
    "query_source_git_blob_sha1": "6aefc385bcc4212d3c45e36871bfde0da3529baa",
    "preexec_binary_sha256": "8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11",
    "preexec_binary_bytes": 706504,
    "preexec_static_no_interp": true,
    "query_binary_sha256": "e8df6ed33ed798e2e3015f7c9a8a3548031049eb1867029e35e3e20953aeed56",
    "query_binary_bytes": 43064,
    "cc_sha256": "1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26",
    "strip_sha256": "0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42"
  },
  "predecessor_lock": {
    "path": "ops/security/buy-void-user-manager-query-elf-lock-v2.json",
    "git_blob_sha1": "347951dbaa2d9bb5c31c8b718d9965ab3fdf7301",
    "lock_id": "voidbuyumqelflock2_fa3cd31d2ba07c17daeb0dcea725dc72ad461af0afc6e336079be25b34e2b89c"
  },
  "manager_reexec_deserialize_argv_accepted": true,
  "kernel_capability_state_bound": true,
  "configured_kernel_bounding_set_equality_required": true,
  "private_users_false_required": true,
  "kernel_capability_state_rechecked": true,
  "historical_v1_v2_evidence_untouched": true,
  "candidate_accepted": true,
  "install_authorized": false,
  "live_query_authorized": false,
  "protected_install_performed": false,
  "complete_host_evidence_collector": false,
  "production_host_evidence_authority": false,
  "payment_acceptance": false,
  "public_presale_activation": false,
  "funds_movement": false
};
  const id="voidbuyumqelflock4_"+sha256(Buffer.from(canonical(body),"utf8"));
  assert.equal(id,LOCK_ID);
  return Object.freeze({...body,lock_id:id});
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  git(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"]);
  const changed=git(["diff","--name-only",CANDIDATE_HEAD,"HEAD","--"])
    .split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA,"lock_v4_branch_scope_drift");
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_WORKFLOW]),CANDIDATE_WORKFLOW_BLOB);
  for(const [relative,expected] of [
    [PREEXEC_SOURCE,CANDIDATE.preexec_source_git_blob_sha1],
    [QUERY_SOURCE,CANDIDATE.query_source_git_blob_sha1],
    [PEER_SOURCE,CANDIDATE.peer_source_git_blob_sha1],
  ]){
    assert.equal(git(["rev-parse","HEAD:"+relative]),expected,"source_blob_drift:"+relative);
  }
  assert.equal(
    git(["rev-parse","HEAD:ops/security/buy-void-user-manager-query-elf-lock-v2.json"]),
    PREDECESSOR_LOCK_BLOB,
  );
  const predecessor=JSON.parse(read("ops/security/buy-void-user-manager-query-elf-lock-v2.json",8192));
  assert.equal(predecessor.lock_id,PREDECESSOR_LOCK_ID);
  const workflowText=read(WORKFLOW,64*1024).toString("utf8");
  for(const relative of [
    PREEXEC_SOURCE,QUERY_SOURCE,PEER_SOURCE,CANDIDATE_WORKFLOW,CANDIDATE_FILE,
    "ops/security/buy-void-user-manager-query-elf-lock-v2.json",
    LOCK_FILE,SELF,DOC,WORKFLOW
  ]){
    const token='      - "'+relative+'"';
    assert.equal(workflowText.split(token).length-1,2,
      "workflow must trigger for PR and main push: "+relative);
  }
}
function rederiveBinaries(){
  assert.equal(sha256(fs.readFileSync("/usr/bin/cc")),CANDIDATE.cc_sha256,"cc_identity_drift");
  assert.equal(sha256(fs.readFileSync("/usr/bin/strip")),CANDIDATE.strip_sha256,"strip_identity_drift");
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-umq-lock-v4-"));
  try{
    const pre=path.join(tmp,"preexec");
    const query=path.join(tmp,"query");
    run("/usr/bin/cc",[
      "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
      "-static","-fno-pie","-no-pie","-Wl,--build-id=none","-o",pre,path.join(ROOT,PREEXEC_SOURCE)
    ],{env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",SOURCE_DATE_EPOCH:"0"}});
    run("/usr/bin/cc",[
      "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
      "-Wl,--build-id=none","-o",query,path.join(ROOT,QUERY_SOURCE),"-ldl"
    ],{env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",SOURCE_DATE_EPOCH:"0"}});
    run("/usr/bin/strip",["--strip-all",pre],{env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}});
    run("/usr/bin/strip",["--strip-all",query],{env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}});
    const pb=fs.readFileSync(pre),qb=fs.readFileSync(query);
    assert.equal(pb.length,CANDIDATE.preexec_binary_bytes);
    assert.equal(sha256(pb),CANDIDATE.preexec_binary_sha256);
    assert.equal(qb.length,CANDIDATE.query_binary_bytes);
    assert.equal(sha256(qb),CANDIDATE.query_binary_sha256);
    const ph=run("/usr/bin/readelf",["-l",pre],{env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}});
    assert.equal(/\bINTERP\b/u.test(ph),false,"preexec_dynamic_interpreter_forbidden");
    const qout=run(query,["--self-test"],{env:{
      PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",
      VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1:"1"
    }});
    assert.match(qout,/VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V1_SELF_TEST_GREEN/u);
    assert.match(qout,/kernel_no_new_privileges_required=true/u);
    assert.match(qout,/private_users_false_required=true/u);
    assert.match(qout,/nonbounding_process_capabilities_zero_required=true/u);
    assert.match(qout,/systemd_kernel_bounding_set_match_required=true/u);
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
  assert.ok(read(LOCK_FILE,8192).equals(expected),"committed_lock_bytes_mismatch");
  return {lock,expected,binaries};
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify().expected);
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const v=verify();
  console.log("VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V4_GREEN");
  console.log("lock_id="+v.lock.lock_id);
  console.log("candidate_sha256="+CANDIDATE_SHA256);
  console.log("preexec_binary_sha256="+v.binaries.preexec_sha256);
  console.log("query_binary_sha256="+v.binaries.query_sha256);
  console.log("manager_reexec_deserialize_argv_accepted=true");
  console.log("kernel_capability_state_bound=true");
  console.log("configured_kernel_bounding_set_equality_required=true");
  console.log("private_users_false_required=true");
  console.log("candidate_accepted=true");
  console.log("install_authorized=false");
  console.log("live_query_authorized=false");
  console.log("production_host_evidence_authority=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw new Error("usage: proof [--self-test|--derive]");
}
