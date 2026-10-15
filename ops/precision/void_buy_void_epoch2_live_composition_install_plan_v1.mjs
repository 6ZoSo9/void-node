#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_INSTALL_PLAN_V1";
export const LOCK_REL =
  "ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v2.json";
export const LOCK_BLOB =
  "83968ee655824e44d8e2c2eb243c2136b2dbe0e9";
export const LOCK_ID =
  "voide2nativecandlock2_0d824d2f5a367b3f15e37b8ee80d2a6a16e647db06400a38bd9866e4baf310c2";
export const RUNNER_REL =
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs";
export const RUNNER_BLOB =
  "92e8c8696ea7e2bb81b6ef089db8baa657188935";
export const RUNNER_SHA256 =
  "2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73";
export const RUNNER_BYTES = 30103;
export const NATIVE_SHA256 =
  "78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589";
export const NATIVE_BYTES = 726976;

export const INSTALL_ROOT =
  "/opt/void-buy-void-epoch2-live-composition-v2";
export const FIXED_NATIVE =
  INSTALL_ROOT + "/void_buy_void_epoch2_live_composition_native_preentry_v1";
export const FIXED_RUNNER =
  INSTALL_ROOT + "/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs";
export const FIXED_POLICY = INSTALL_ROOT + "/policy-v1.conf";
export const FIXED_NODE = "/usr/bin/node";
export const POLICY_SCHEMA =
  "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const GIT="/usr/bin/git";
const SHA40=/^[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;

function fail(reason){
  const error=new Error(reason);
  error.code=reason;
  throw error;
}

export function canonical(value){
  if(value===null)return "null";
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value))fail("noncanonical_number");
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(!value||typeof value!=="object")fail("noncanonical_value");
  return "{"+Object.keys(value).sort()
    .map((key)=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
}

export function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

function cleanGitEnv(){
  return {
    PATH:"/usr/bin:/bin",
    HOME:String(process.env.HOME||""),
    LANG:"C",
    LC_ALL:"C",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
  };
}

function git(args){
  const out=execFileSync(GIT,[
    "-C",ROOT,
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    ...args,
  ],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:15_000,
    maxBuffer:512*1024,
    env:cleanGitEnv(),
  });
  return out.trim();
}

function sameIdentity(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode&&a.nlink===b.nlink&&a.size===b.size&&
    a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs;
}

export function readPinnedRegular(absolute,{expectedBytes=null,rootOwned=false,executable=false}={}){
  if(!path.isAbsolute(absolute)||path.normalize(absolute)!==absolute){
    fail("path_not_canonical_absolute");
  }
  const before=fs.lstatSync(absolute,{bigint:true});
  if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1n){
    fail("pinned_file_metadata_invalid");
  }
  if(expectedBytes!==null&&before.size!==BigInt(expectedBytes)){
    fail("pinned_file_size_invalid");
  }
  if(rootOwned&&before.uid!==0n)fail("pinned_file_root_owner_required");
  if(rootOwned&&(before.mode&0o022n)!==0n)fail("pinned_file_mutable_mode");
  if(executable&&(before.mode&0o111n)===0n)fail("pinned_file_executable_required");
  const noFollow=fs.constants.O_NOFOLLOW;
  if(!Number.isInteger(noFollow)||noFollow===0)fail("nofollow_unavailable");
  const fd=fs.openSync(absolute,fs.constants.O_RDONLY|noFollow);
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    if(!sameIdentity(before,opened))fail("pinned_file_changed_before_read");
    const bytes=Buffer.alloc(Number(opened.size));
    let offset=0;
    while(offset<bytes.length){
      const count=fs.readSync(fd,bytes,offset,bytes.length-offset,null);
      if(!Number.isSafeInteger(count)||count<=0)fail("pinned_file_short_read");
      offset+=count;
    }
    if(fs.readSync(fd,Buffer.alloc(1),0,1,null)!==0)fail("pinned_file_grew");
    const after=fs.fstatSync(fd,{bigint:true});
    const visible=fs.lstatSync(absolute,{bigint:true});
    if(!sameIdentity(opened,after)||!sameIdentity(after,visible)){
      fail("pinned_file_changed_after_read");
    }
    return Object.freeze({
      bytes,
      size:Number(opened.size),
      sha256:sha256(bytes),
      dev:String(opened.dev),
      ino:String(opened.ino),
      uid:Number(opened.uid),
      gid:Number(opened.gid),
      mode:Number(opened.mode&0o7777n),
    });
  }finally{
    fs.closeSync(fd);
  }
}

export function acceptedLock(root=ROOT){
  const absolute=path.join(root,LOCK_REL);
  const bytes=fs.readFileSync(absolute);
  if(gitBlobSha1(bytes)!==LOCK_BLOB)fail("accepted_lock_blob_mismatch");
  let lock;
  try{lock=JSON.parse(bytes);}catch{fail("accepted_lock_json_invalid");}
  for(const [key,want] of Object.entries({
    marker:"VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V2",
    version:2,
    lock_id:LOCK_ID,
    candidate_accepted:true,
    native_binary_identity_accepted:true,
    runner_identity_accepted:true,
    native_binary_sha256:NATIVE_SHA256,
    native_binary_bytes:NATIVE_BYTES,
    runner_sha256:RUNNER_SHA256,
    runner_bytes:RUNNER_BYTES,
    install_authorized:false,
    live_execution_authorized:false,
    credential_access:false,
    private_key_access:false,
    transaction:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    funds_movement:false,
  })){
    if(lock[key]!==want)fail("accepted_lock_field_mismatch:"+key);
  }
  return Object.freeze(lock);
}

export function inspectNativeCandidate(absolute){
  const info=readPinnedRegular(absolute,{expectedBytes:NATIVE_BYTES});
  if(info.sha256!==NATIVE_SHA256)fail("native_candidate_sha256_mismatch");
  return info;
}

export function inspectRunner(root=ROOT){
  const absolute=path.join(root,RUNNER_REL);
  const info=readPinnedRegular(absolute,{expectedBytes:RUNNER_BYTES});
  if(info.sha256!==RUNNER_SHA256)fail("runner_sha256_mismatch");
  const bytes=info.bytes;
  if(gitBlobSha1(bytes)!==RUNNER_BLOB)fail("runner_git_blob_mismatch");
  return info;
}

export function inspectTrustedNode(absolute=FIXED_NODE){
  if(absolute!==FIXED_NODE)fail("node_fixed_path_required");
  const info=readPinnedRegular(absolute,{rootOwned:true,executable:true});
  if(!HEX64.test(info.sha256)||info.size<1)fail("node_identity_invalid");
  return info;
}

export function buildPolicy({expectedHead,nodeSha256,nodeBytes}){
  if(!SHA40.test(expectedHead))fail("expected_head_invalid");
  if(!HEX64.test(nodeSha256)||!Number.isSafeInteger(nodeBytes)||nodeBytes<=0){
    fail("node_policy_identity_invalid");
  }
  return [
    "schema="+POLICY_SCHEMA,
    "expected_head="+expectedHead,
    "runner_sha256="+RUNNER_SHA256,
    "runner_bytes="+String(RUNNER_BYTES),
    "node_sha256="+nodeSha256,
    "node_bytes="+String(nodeBytes),
    "",
  ].join("\n");
}

export function buildInstallPlan({expectedHead,native,node}){
  if(!SHA40.test(expectedHead))fail("expected_head_invalid");
  if(native.sha256!==NATIVE_SHA256||native.size!==NATIVE_BYTES){
    fail("native_plan_identity_invalid");
  }
  if(!node||!HEX64.test(node.sha256)||!Number.isSafeInteger(node.size)||node.size<=0){
    fail("node_plan_identity_invalid");
  }
  const policy=buildPolicy({
    expectedHead,
    nodeSha256:node.sha256,
    nodeBytes:node.size,
  });
  const body={
    marker:MARKER,
    version:1,
    expected_repository_head:expectedHead,
    accepted_lock_id:LOCK_ID,
    accepted_lock_git_blob_sha1:LOCK_BLOB,
    install_root:INSTALL_ROOT,
    native_target:FIXED_NATIVE,
    native_sha256:NATIVE_SHA256,
    native_bytes:NATIVE_BYTES,
    native_mode:"0555",
    runner_target:FIXED_RUNNER,
    runner_git_blob_sha1:RUNNER_BLOB,
    runner_sha256:RUNNER_SHA256,
    runner_bytes:RUNNER_BYTES,
    runner_mode:"0444",
    policy_target:FIXED_POLICY,
    policy_schema:POLICY_SCHEMA,
    policy_sha256:sha256(Buffer.from(policy,"utf8")),
    policy_bytes:Buffer.byteLength(policy,"utf8"),
    policy_mode:"0444",
    node_path:FIXED_NODE,
    node_sha256:node.sha256,
    node_bytes:node.size,
    native_candidate_dev:String(native.dev??""),
    native_candidate_ino:String(native.ino??""),
    plan_only:true,
    root_required:false,
    filesystem_write:false,
    protected_install_authorized:false,
    protected_install_performed:false,
    live_execution_authorized:false,
    credential_access:false,
    private_key_access:false,
    signing:false,
    transaction:false,
    rpc_call:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    funds_movement:false,
  };
  return Object.freeze({
    ...body,
    plan_id:"voide2installplan1_"+sha256(Buffer.from(canonical(body),"utf8")),
    policy_text:policy,
  });
}

export function requireCurrentMain(){
  const head=git(["rev-parse","--verify","HEAD"]);
  if(!SHA40.test(head))fail("repository_head_invalid");
  if(git(["branch","--show-current"])!=="main")fail("repository_branch_not_main");
  if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
    fail("repository_not_clean");
  }
  if(git(["rev-parse","HEAD:"+LOCK_REL])!==LOCK_BLOB){
    fail("repository_lock_blob_mismatch");
  }
  if(git(["rev-parse","HEAD:"+RUNNER_REL])!==RUNNER_BLOB){
    fail("repository_runner_blob_mismatch");
  }
  return head;
}

function selfTest(){
  acceptedLock(ROOT);
  const native={
    sha256:NATIVE_SHA256,
    size:NATIVE_BYTES,
    dev:"1",
    ino:"2",
  };
  const node={
    sha256:"a".repeat(64),
    size:123456,
  };
  const head="b".repeat(40);
  const plan=buildInstallPlan({expectedHead:head,native,node});
  if(!/^voide2installplan1_[0-9a-f]{64}$/u.test(plan.plan_id)){
    fail("self_test_plan_id_invalid");
  }
  if(!plan.policy_text.includes("expected_head="+head+"\n")||
     !plan.policy_text.includes("runner_sha256="+RUNNER_SHA256+"\n")||
     !plan.policy_text.includes("node_sha256="+"a".repeat(64)+"\n")){
    fail("self_test_policy_invalid");
  }
  if(plan.protected_install_authorized!==false||
     plan.filesystem_write!==false||
     plan.live_execution_authorized!==false||
     plan.funds_movement!==false){
    fail("self_test_authority_invalid");
  }
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("accepted_lock_bound=true");
  console.log("native_candidate_identity_bound=true");
  console.log("runner_identity_bound=true");
  console.log("current_main_required_for_production_plan=true");
  console.log("fixed_root_node_identity_bound=true");
  console.log("policy_content_addressed=true");
  console.log("plan_content_addressed=true");
  console.log("filesystem_write=false");
  console.log("protected_install_authorized=false");
  console.log("live_execution_authorized=false");
  console.log("credential_access=false");
  console.log("transaction=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}

function runPlan(nativePath){
  if(typeof process.geteuid==="function"&&process.geteuid()===0){
    fail("plan_must_run_unprivileged");
  }
  acceptedLock(ROOT);
  const expectedHead=requireCurrentMain();
  inspectRunner(ROOT);
  const native=inspectNativeCandidate(nativePath);
  const node=inspectTrustedNode(FIXED_NODE);
  const plan=buildInstallPlan({expectedHead,native,node});
  console.log(JSON.stringify(plan,null,2));
}

function main(){
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==="--self-test"){
    selfTest();
    return;
  }
  if(args.length===3&&args[0]==="--plan"&&args[1]==="--native-candidate"){
    const candidate=path.resolve(args[2]);
    if(candidate!==args[2])fail("native_candidate_path_must_be_absolute_normalized");
    runPlan(candidate);
    return;
  }
  fail("usage: --self-test | --plan --native-candidate /absolute/path");
}

const direct=process.argv[1]&&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
  try{main();}
  catch(error){
    console.error(JSON.stringify({
      marker:MARKER+"_HOLD",
      status:"HOLD",
      reason:String(error?.code||error?.message||"unknown")
        .replace(/[^A-Za-z0-9_.:-]+/gu,"_").slice(0,200),
      filesystem_write:false,
      protected_install_authorized:false,
      live_execution_authorized:false,
      credential_access:false,
      transaction:false,
      public_presale_activation:false,
      funds_movement:false,
    },null,2));
    process.exitCode=2;
  }
}
