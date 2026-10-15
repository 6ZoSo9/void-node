#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE_HEAD="ead116e22e1bb70b06a8b96ae727d1b1a911fd57";
const RESTACK_BASE="75cd1656bae6c8095bbbd2e1a9ebb7588b43484e";
const ACCEPTED_LOCK_HEAD="f7023746c9d427d8e8ed4d0df50873df6cdc494d";
const CANDIDATE_WORKFLOW=".github/workflows/buy-void-user-manager-query-elf-candidate-v1.yml";
const CANDIDATE_WORKFLOW_BLOB="5b21d57c00e5a4d97be1e79356b75e736de949d0";
const PREEXEC_SOURCE="ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c";
const QUERY_SOURCE="ops/precision/void_buy_void_user_manager_private_unit_query_v1.c";
const PEER_SOURCE="ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c";
const CANDIDATE_FILE="ops/security/buy-void-user-manager-query-elf-candidate-v1.json";
const LOCK_FILE="ops/security/buy-void-user-manager-query-elf-lock-v1.json";
const SELF="scripts/prove_void_buy_user_manager_query_elf_lock_v1.mjs";
const WORKFLOW=".github/workflows/buy-void-user-manager-query-elf-lock-v1.yml";
const DOC="docs/operators/buy-void-user-manager-query-elf-lock-v1.md";
const RESTACK_PATHS=Object.freeze([
  ".github/workflows/buy-void-authenticated-user-manager-unit-evidence-v3.yml",
  ".github/workflows/buy-void-user-manager-private-peer-guard-v1.yml",
  ".github/workflows/buy-void-user-manager-private-unit-query-preexec-v1.yml",
  ".github/workflows/buy-void-user-manager-query-elf-candidate-v1.yml",
  ".github/workflows/buy-void-user-manager-query-elf-lock-v1.yml",
  "docs/architecture/buy-void-authenticated-user-manager-unit-evidence-v3.md",
  "docs/architecture/buy-void-user-manager-private-peer-guard-v1.md",
  "docs/architecture/buy-void-user-manager-private-unit-query-preexec-v1.md",
  "docs/operators/buy-void-user-manager-query-elf-candidate-v1.md",
  "docs/operators/buy-void-user-manager-query-elf-lock-v1.md",
  "ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c",
  "ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c",
  "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c",
  "ops/security/buy-void-user-manager-query-elf-candidate-v1.json",
  "ops/security/buy-void-user-manager-query-elf-lock-v1.json",
  "scripts/prove_void_buy_allocation_custody_host_evidence_v3.mjs",
  SELF,
  "scripts/prove_void_buy_void_user_manager_private_peer_guard_v1.mjs",
  "scripts/prove_void_buy_void_user_manager_private_unit_query_preexec_v1.mjs",
  "tools/void-buy-allocation-custody-host-evidence-v3.mjs",
].sort());

const CANDIDATE=Object.freeze({
  marker:"VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_CANDIDATE_V1",
  version:1,
  preexec_source_git_blob_sha1:"f0fbfaae97df3294097a281100f06ada2ef157ff",
  query_source_git_blob_sha1:"ad49cd7f71c41e0f559a561b5a62a00cec60c215",
  peer_source_git_blob_sha1:"cab88f4642ab929d1f7a4d2f1511462a94ef34ca",
  preexec_binary_sha256:"8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11",
  preexec_binary_bytes:706504,
  preexec_static_no_interp:true,
  query_binary_sha256:"98fb0de18c7e2acc133db38f15036acc8345f503b2dd196cc07193523dd0a435",
  query_binary_bytes:34872,
  cc_sha256:"1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26",
  strip_sha256:"0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42",
  candidate_accepted:false,
  install_authorized:false,
  complete_host_evidence_collector:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
});
const CANDIDATE_BYTES=901;
const CANDIDATE_SHA256="a39ba5b63cba844f1fbb382041a59a51139e066c8b76ff10f59ac61455ae2776";
const CANDIDATE_BLOB="1ac068dab592afa923b51434e87bc13b01966246";
const LOCK_ID="voidbuyumqelflock1_0b0b791995f7a3346c3562387e211e9e2bb54ca6a050a964950e70a0e4cd1a16";

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
  assert.equal(path.isAbsolute(relative),false);
  assert.equal(relative.split("/").some(p=>!p||p==="."||p===".."),false);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"])assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  assert.equal(bytes.length,before.size);
  return bytes;
}
function run(command,args,{cwd=ROOT,env=null,timeout=120000}={}){
  const r=spawnSync(command,args,{
    cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,maxBuffer:16*1024*1024,
    env:env||{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return String(r.stdout||"");
}
function git(args){return run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{timeout:30000}).trim();}
function exactCandidateBytes(){
  const bytes=Buffer.from(JSON.stringify(CANDIDATE)+"\n","utf8");
  assert.equal(bytes.length,CANDIDATE_BYTES);
  assert.equal(sha256(bytes),CANDIDATE_SHA256);
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB);
  const committed=read(CANDIDATE_FILE,4096);
  assert.ok(committed.equals(bytes),"committed_candidate_bytes_mismatch");
  return bytes;
}
function expectedLock(){
  const body={
    schema:"void_buy_void_user_manager_query_elf_lock_v1",
    marker:"VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V1",
    version:1,
    repository:"6ZoSo9/void-node",
    candidate_head:CANDIDATE_HEAD,
    candidate_hosted_evidence:{
      workflow_run:38676947271,
      artifact_a:11946183568,
      artifact_b:11945674523,
      artifact_c:11946183573,
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
      preexec_source_git_blob_sha1:CANDIDATE.preexec_source_git_blob_sha1,
      query_source_git_blob_sha1:CANDIDATE.query_source_git_blob_sha1,
      peer_source_git_blob_sha1:CANDIDATE.peer_source_git_blob_sha1,
      preexec_binary_sha256:CANDIDATE.preexec_binary_sha256,
      preexec_binary_bytes:CANDIDATE.preexec_binary_bytes,
      preexec_static_no_interp:true,
      query_binary_sha256:CANDIDATE.query_binary_sha256,
      query_binary_bytes:CANDIDATE.query_binary_bytes,
      cc_sha256:CANDIDATE.cc_sha256,
      strip_sha256:CANDIDATE.strip_sha256,
    },
    candidate_accepted:true,
    install_authorized:false,
    protected_install_performed:false,
    complete_host_evidence_collector:false,
    production_host_evidence_authority:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
  };
  const id="voidbuyumqelflock1_"+sha256(Buffer.from(canonical(body),"utf8"));
  assert.equal(id,LOCK_ID);
  return Object.freeze({...body,lock_id:id});
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",RESTACK_BASE,"HEAD"]);
  git(["cat-file","-e",ACCEPTED_LOCK_HEAD+"^{commit}"]);
  const changed=git(["diff","--name-only",RESTACK_BASE,"HEAD","--"])
    .split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,RESTACK_PATHS,"restack_branch_scope_drift");
  for(const relative of RESTACK_PATHS){
    if(relative===SELF)continue;
    assert.equal(
      git(["rev-parse","HEAD:"+relative]),
      git(["rev-parse",ACCEPTED_LOCK_HEAD+":"+relative]),
      "accepted_restack_blob_drift:"+relative,
    );
  }
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_WORKFLOW]),CANDIDATE_WORKFLOW_BLOB);
  for(const [relative,expected] of [
    [PREEXEC_SOURCE,CANDIDATE.preexec_source_git_blob_sha1],
    [QUERY_SOURCE,CANDIDATE.query_source_git_blob_sha1],
    [PEER_SOURCE,CANDIDATE.peer_source_git_blob_sha1],
  ])assert.equal(git(["rev-parse","HEAD:"+relative]),expected,"source_blob_drift:"+relative);
}
function rederiveBinaries(){
  assert.equal(sha256(fs.readFileSync("/usr/bin/cc")),CANDIDATE.cc_sha256,"cc_identity_drift");
  assert.equal(sha256(fs.readFileSync("/usr/bin/strip")),CANDIDATE.strip_sha256,"strip_identity_drift");
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-umq-lock-"));
  try{
    const pre=path.join(tmp,"preexec");
    const query=path.join(tmp,"query");
    run("/usr/bin/cc",["-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
      "-static","-fno-pie","-no-pie","-Wl,--build-id=none","-o",pre,path.join(ROOT,PREEXEC_SOURCE)],
      {cwd:ROOT,env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",SOURCE_DATE_EPOCH:"0"}});
    run("/usr/bin/cc",["-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
      "-Wl,--build-id=none","-o",query,path.join(ROOT,QUERY_SOURCE),"-ldl"],
      {cwd:ROOT,env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",SOURCE_DATE_EPOCH:"0"}});
    run("/usr/bin/strip",["--strip-all",pre],{cwd:ROOT,env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}});
    run("/usr/bin/strip",["--strip-all",query],{cwd:ROOT,env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}});
    const pb=fs.readFileSync(pre),qb=fs.readFileSync(query);
    assert.equal(pb.length,CANDIDATE.preexec_binary_bytes);
    assert.equal(sha256(pb),CANDIDATE.preexec_binary_sha256);
    assert.equal(qb.length,CANDIDATE.query_binary_bytes);
    assert.equal(sha256(qb),CANDIDATE.query_binary_sha256);
    const ph=run("/usr/bin/readelf",["-l",pre],{cwd:ROOT,env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}});
    assert.equal(/\bINTERP\b/u.test(ph),false,"preexec_dynamic_interpreter_forbidden");
    const qout=run(query,["--self-test"],{
      cwd:ROOT,
      env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",
        VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1:"1"},
    });
    assert.match(qout,/VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V1_SELF_TEST_GREEN/u);
    return Object.freeze({preexec_sha256:sha256(pb),query_sha256:sha256(qb)});
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
function verify(){
  verifyBranch();
  exactCandidateBytes();
  const binaries=rederiveBinaries();
  const lock=expectedLock();
  const expected=Buffer.from(JSON.stringify(lock,null,2)+"\n","utf8");
  const actual=read(LOCK_FILE,8192);
  assert.ok(actual.equals(expected),"committed_lock_bytes_mismatch");
  const parsed=JSON.parse(actual);
  assert.equal(parsed.candidate_accepted,true);
  assert.equal(parsed.install_authorized,false);
  assert.equal(parsed.production_host_evidence_authority,false);
  return Object.freeze({lock,expected,binaries});
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify().expected);
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const v=verify();
  console.log("VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V1_GREEN");
  console.log("lock_id="+v.lock.lock_id);
  console.log("candidate_sha256="+CANDIDATE_SHA256);
  console.log("preexec_binary_sha256="+v.binaries.preexec_sha256);
  console.log("query_binary_sha256="+v.binaries.query_sha256);
  console.log("accepted_restack_blobs_verified=true");
  console.log("candidate_accepted=true");
  console.log("install_authorized=false");
  console.log("production_host_evidence_authority=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw new Error("usage: proof [--self-test|--derive]");
}
