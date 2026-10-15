#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE_HEAD="d7ebb60ca1bc59f16972ffe3671dfaa44ffb7cdf";
const SOURCE_PARENT="0d635ccd9d07fd07bb086bef3202b8b67ec6e5f7";
const CORRECTION_BASE_HEAD="a248b2299b05a0445333b751b584c302eed66971";
const CANDIDATE_WORKFLOW=".github/workflows/buy-void-user-manager-query-elf-candidate-v6.yml";
const CANDIDATE_WORKFLOW_BLOB="fe914ecbf81fd6c42ad25e3b5ebf70b7623dbee4";
const PREEXEC_SOURCE="ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c";
const QUERY_SOURCE="ops/precision/void_buy_void_user_manager_private_unit_query_v1.c";
const PEER_SOURCE="ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c";
const CANDIDATE_FILE="ops/security/buy-void-user-manager-query-elf-candidate-v6.json";
const LOCK_FILE="ops/security/buy-void-user-manager-query-elf-lock-v6.json";
const PREDECESSOR_LOCK="ops/security/buy-void-user-manager-query-elf-lock-v4.json";
const SELF="scripts/prove_void_buy_user_manager_query_elf_lock_v6.mjs";
const WORKFLOW=".github/workflows/buy-void-user-manager-query-elf-lock-v6.yml";
const DOC="docs/operators/buy-void-user-manager-query-elf-lock-v6.md";
const EXPECTED_CORRECTION_DELTA=[LOCK_FILE,SELF,WORKFLOW,DOC].sort();

const CANDIDATE=Object.freeze({
  marker:"VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_CANDIDATE_V6",
  version:6,
  source_parent:SOURCE_PARENT,
  peer_source_git_blob_sha1:"d8b30ac499c3bb8a5d223dbc6be687dd175be611",
  preexec_source_git_blob_sha1:"f0fbfaae97df3294097a281100f06ada2ef157ff",
  query_source_git_blob_sha1:"fc1f640689b7da7278ff013669ef8a10cd8f6659",
  preexec_binary_sha256:"8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11",
  preexec_binary_bytes:706504,
  preexec_static_no_interp:true,
  query_binary_sha256:"e791944bfa025a510d3693093668d71a9d122de8c581a924a1b45b4331ab43a6",
  query_binary_bytes:43064,
  control_group_service_interface_required:true,
  kernel_cap_last_cap_projection_required:true,
  kernel_capability_binding_v3:true,
  private_users_false_required:true,
  configured_bounding_set_may_be_nonzero:true,
  kernel_capability_state_rechecked:true,
  cc_sha256:"1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26",
  strip_sha256:"0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42",
  predecessor_v5_hosted_evidence_frozen:true,
  candidate_accepted:false,
  install_authorized:false,
  live_query_authorized:false,
  complete_host_evidence_collector:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
});
const CANDIDATE_BYTES=1289;
const CANDIDATE_SHA256="d39409be8fbeb8a6237a5fd24acb6f19f00acfa2028f713679ad17e852627296";
const CANDIDATE_BLOB="a341112695b1abbc61e0b4d88db9675b4fa15d83";
const PREDECESSOR_LOCK_BLOB="55ceccf61d59a18809e74979afa518ed150d62a0";
const PREDECESSOR_LOCK_ID="voidbuyumqelflock4_846047629dd2dd58f73f926d85cddde5b0a1510493d59a2d7ef778d235a70301";
const LOCK_ID="voidbuyumqelflock6_cede427c177e309cf23364b9092f3cbba63be405ad6458cc0c8ef93bc09abd77";

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
  const r=spawnSync(command,args,{
    cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,maxBuffer:16*1024*1024,
    env:env||{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",
    },
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return String(r.stdout||"");
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
    schema:"void_buy_void_user_manager_query_elf_lock_v6",
    marker:"VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V6",
    version:6,
    repository:"6ZoSo9/void-node",
    canonical_source_parent:SOURCE_PARENT,
    candidate_head:CANDIDATE_HEAD,
    candidate_hosted_evidence:{
      workflow_run:38768570795,
      artifact_a:11990620937,
      artifact_b:11991015426,
      artifact_c:11990478684,
      cross_job_byte_identity_verified:true,
      exact_stripped_pair_executed_before_hash:true,
    },
    candidate_evidence:{
      path:CANDIDATE_FILE,
      workflow_path:CANDIDATE_WORKFLOW,
      workflow_git_blob_sha1:CANDIDATE_WORKFLOW_BLOB,
      bytes:CANDIDATE_BYTES,
      sha256:CANDIDATE_SHA256,
      git_blob_sha1:CANDIDATE_BLOB,
      peer_source_git_blob_sha1:CANDIDATE.peer_source_git_blob_sha1,
      preexec_source_git_blob_sha1:CANDIDATE.preexec_source_git_blob_sha1,
      query_source_git_blob_sha1:CANDIDATE.query_source_git_blob_sha1,
      preexec_binary_sha256:CANDIDATE.preexec_binary_sha256,
      preexec_binary_bytes:CANDIDATE.preexec_binary_bytes,
      preexec_static_no_interp:true,
      query_binary_sha256:CANDIDATE.query_binary_sha256,
      query_binary_bytes:CANDIDATE.query_binary_bytes,
      cc_sha256:CANDIDATE.cc_sha256,
      strip_sha256:CANDIDATE.strip_sha256,
    },
    predecessor_lock:{
      path:PREDECESSOR_LOCK,
      git_blob_sha1:PREDECESSOR_LOCK_BLOB,
      lock_id:PREDECESSOR_LOCK_ID,
    },
    superseded_v5_hosted_evidence:{
      source_git_blob_sha1:"ddca2c544ce14261dffb80a202c0a4ae2979ec1e",
      query_binary_sha256:"faaafc906433cd31b8e2069d187348c4467717de03d4f757d46e30b4f14b3aab",
      workflow_run:38759148727,
      artifact_a:11984123866,
      artifact_b:11984563387,
      artifact_c:11984857851,
      never_installed:true,
      superseded_by_v6_candidate_generation:true,
      superseded_by_live_v6:false,
    },
    manager_reexec_deserialize_argv_accepted:true,
    control_group_service_interface_required:true,
    kernel_cap_last_cap_projection_required:true,
    kernel_capability_state_bound:true,
    configured_kernel_bounding_set_projection_required:true,
    private_users_false_required:true,
    kernel_capability_state_rechecked:true,
    historical_v4_evidence_untouched:true,
    candidate_accepted:true,
    install_authorized:false,
    live_query_authorized:false,
    protected_install_performed:false,
    complete_host_evidence_collector:false,
    production_host_evidence_authority:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
  };
  const id="voidbuyumqelflock6_"+sha256(Buffer.from(canonical(body),"utf8"));
  assert.equal(id,LOCK_ID);
  return Object.freeze({...body,lock_id:id});
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  git(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"]);
  git(["merge-base","--is-ancestor",CORRECTION_BASE_HEAD,"HEAD"]);
  const changed=git(["diff","--name-only",CORRECTION_BASE_HEAD,"HEAD","--"])
    .split("\n").filter(Boolean).sort();
  assert.deepEqual(
    changed,
    EXPECTED_CORRECTION_DELTA,
    "lock_v6_truth_correction_scope_drift",
  );

  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_FILE]),CANDIDATE_BLOB);
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_WORKFLOW]),CANDIDATE_WORKFLOW_BLOB);
  for(const [relative,expected] of [
    [PREEXEC_SOURCE,CANDIDATE.preexec_source_git_blob_sha1],
    [QUERY_SOURCE,CANDIDATE.query_source_git_blob_sha1],
    [PEER_SOURCE,CANDIDATE.peer_source_git_blob_sha1],
  ]){
    assert.equal(git(["rev-parse","HEAD:"+relative]),expected,"source_blob_drift:"+relative);
  }
  assert.equal(git(["rev-parse","HEAD:"+PREDECESSOR_LOCK]),PREDECESSOR_LOCK_BLOB);
  const predecessor=JSON.parse(read(PREDECESSOR_LOCK,8192));
  assert.equal(predecessor.lock_id,PREDECESSOR_LOCK_ID);

  const source=read(QUERY_SOURCE,512*1024).toString("utf8");
  assert.ok(source.includes('#define KERNEL_CAP_LAST_CAP_PATH "/proc/sys/kernel/cap_last_cap"'));
  assert.ok(source.includes("obs->capability_bounding_set & supported_capability_mask"));
  assert.equal(source.includes("security->cap_bnd == obs->capability_bounding_set;"),false);
  assert.ok(source.includes('"org.freedesktop.systemd1.Service","ControlGroup"'));
  assert.equal(source.includes('"org.freedesktop.systemd1.Unit","ControlGroup"'),false);
}
function rederiveBinaries(){
  assert.equal(sha256(fs.readFileSync("/usr/bin/cc")),CANDIDATE.cc_sha256,"cc_identity_drift");
  assert.equal(sha256(fs.readFileSync("/usr/bin/strip")),CANDIDATE.strip_sha256,"strip_identity_drift");
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-umq-lock-v6-"));
  try{
    const pre=path.join(tmp,"preexec");
    const query=path.join(tmp,"query");
    run("/usr/bin/cc",[
      "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
      "-static","-fno-pie","-no-pie","-Wl,--build-id=none",
      "-o",pre,path.join(ROOT,PREEXEC_SOURCE),
    ],{env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",SOURCE_DATE_EPOCH:"0"}});
    run("/usr/bin/cc",[
      "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
      "-Wl,--build-id=none","-o",query,path.join(ROOT,QUERY_SOURCE),"-ldl",
    ],{env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",SOURCE_DATE_EPOCH:"0"}});
    run("/usr/bin/strip",["--strip-all",pre],{env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}});
    run("/usr/bin/strip",["--strip-all",query],{env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}});
    const pb=fs.readFileSync(pre),qb=fs.readFileSync(query);
    assert.equal(pb.length,CANDIDATE.preexec_binary_bytes);
    assert.equal(sha256(pb),CANDIDATE.preexec_binary_sha256);
    assert.equal(qb.length,CANDIDATE.query_binary_bytes);
    assert.equal(sha256(qb),CANDIDATE.query_binary_sha256);
    const qout=run(query,["--self-test"],{env:{
      PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",
      VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1:"1",
    }});
    assert.match(qout,/VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V1_SELF_TEST_GREEN/u);
    assert.match(qout,/kernel_cap_last_cap_projection_verified=true/u);
    assert.match(qout,/private_users_false_required=true/u);
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
  assert.ok(read(LOCK_FILE,16384).equals(expected),"committed_lock_bytes_mismatch");
  return {lock,expected,binaries};
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify().expected);
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const v=verify();
  console.log("VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V6_GREEN");
  console.log("lock_id="+v.lock.lock_id);
  console.log("candidate_sha256="+CANDIDATE_SHA256);
  console.log("preexec_binary_sha256="+v.binaries.preexec_sha256);
  console.log("query_binary_sha256="+v.binaries.query_sha256);
  console.log("control_group_service_interface_required=true");
  console.log("kernel_cap_last_cap_projection_required=true");
  console.log("configured_kernel_bounding_set_projection_required=true");
  console.log("manager_reexec_deserialize_argv_accepted=true");
  console.log("kernel_capability_state_bound=true");
  console.log("private_users_false_required=true");
  console.log("candidate_accepted=true");
  console.log("v5_superseded_by_v6_candidate_generation=true");
  console.log("superseded_by_live_v6=false");
  console.log("install_authorized=false");
  console.log("live_query_authorized=false");
  console.log("production_host_evidence_authority=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw new Error("usage: proof [--self-test|--derive]");
}
