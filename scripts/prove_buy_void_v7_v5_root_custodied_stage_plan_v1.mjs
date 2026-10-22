#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_V7_V5_ROOT_CUSTODIED_STAGE_PLAN_V1";
const PARENT="242aa1054e1c9ee36a06047ea350f92976870038";
const PLAN="ops/security/buy-void-v7-v5-root-custodied-stage-plan-v1.json";
const PLAN_BLOB="4863118468b350aca53f1a7b8c6ce227de803924";
const SELF="scripts/prove_buy_void_v7_v5_root_custodied_stage_plan_v1.mjs";
const DOC="docs/architecture/buy-void-v7-v5-root-custodied-stage-plan-v1.md";
const WORKFLOW=".github/workflows/buy-void-v7-v5-root-custodied-stage-plan-v1.yml";
const EXPECTED_PLAN_ID="voidv7stageplan1_4e3b2f22bb6466a5921c1eaa5f63dfc319d224c9e3854a2064979d50ae605f41";

const CANDIDATE_V5="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5.json";
const CANDIDATE_V5_BLOB="46e3774ca442cf593d25b6062ab5538d5ac43611";
const LOCK_V5="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json";
const LOCK_V5_BLOB="bc1b2f4095315861db7a257d4cc3c80a9f112530";
const EXCHANGE_PLAN="ops/security/buy-void-v7-protected-source-receipt-exchange-plan-v1.json";
const EXCHANGE_PLAN_BLOB="191a8015e438bc1cebf9fadfcbc23c68f0d2d4ad";
const EXCHANGE_PROOF="scripts/prove_buy_void_v7_protected_source_receipt_exchange_plan_v1.mjs";
const EXCHANGE_PROOF_BLOB="f3d1fdcd44a817dfffa35d59d7b7c2a3bc505912";
const RESEAL_BUILDER="ops/precision/void_v7_source_release_full_history_reseal_v2.py";
const RESEAL_BUILDER_BLOB="bb78c7d9f468baa20b580d052d934d9b97c05134";
const RESEAL_PROOF="scripts/prove_void_v7_source_release_full_history_reseal_v2.py";
const RESEAL_PROOF_BLOB="77c0e6eaa859f3f4d6df8a46da477e72a451c10c";
const RECEIPT_PROOF="scripts/prove_buy_void_source_finality_v7_deployment_receipt_candidate_v2.ts";
const RECEIPT_PROOF_BLOB="76a05cbcd1be72e2817f04b676b5a8c395a5bf0e";
const RECEIPT_WORKFLOW=".github/workflows/buy-void-source-finality-v7-deployment-receipt-candidate-v2.yml";
const RECEIPT_WORKFLOW_BLOB="98fdfd7b64d88f751c2d05f7cca6ef348de112aa";
const V4_INSTALLER="ops/precision/void_buy_void_v7_protected_substrate_install_v4.py";
const V4_INSTALLER_BLOB="6e187a9a6e782df13ecd423fc80c82b759a8f6db";

const EXPECTED_SCOPE=Object.freeze([WORKFLOW,DOC,PLAN,SELF].sort());
const decoder=new TextDecoder("utf-8",{fatal:true});

function git(args){
  return execFileSync("/usr/bin/git",[
    "--no-replace-objects",
    "-c","core.hooksPath=/dev/null",
    "-c","core.fsmonitor=false",
    "-C",ROOT,
    ...args,
  ],{
    encoding:"utf8",
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",GIT_ASKPASS:"/bin/false",
    },
  }).trim();
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes).digest("hex");
}
function sameGeneration(a,b,label){
  for(const key of ["dev","ino","uid","gid","mode","nlink","size","mtimeMs","ctimeMs"]){
    assert.equal(a[key],b[key],label+"_generation_changed:"+key);
  }
}
function readPinned(relative,expectedBlob,maxBytes=8*1024*1024){
  assert.equal(path.isAbsolute(relative),false);
  assert.equal(relative.split("/").some(x=>!x||x==="."||x===".."),false);
  assert.equal(git(["rev-parse","HEAD:"+relative]),expectedBlob,"tree_blob_drift:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1);
  assert.ok(before.size>0&&before.size<=maxBytes);
  const fd=fs.openSync(
    absolute,
    fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK,
  );
  try{
    const opened=fs.fstatSync(fd);
    sameGeneration(before,opened,relative);
    const bytes=Buffer.alloc(opened.size);
    let offset=0;
    while(offset<bytes.length){
      const got=fs.readSync(fd,bytes,offset,bytes.length-offset,null);
      assert.ok(got>0,"short_read:"+relative);
      offset+=got;
    }
    assert.equal(fs.readSync(fd,Buffer.alloc(1),0,1,null),0,"growth:"+relative);
    const after=fs.fstatSync(fd);
    const visible=fs.lstatSync(absolute);
    sameGeneration(opened,after,relative);
    sameGeneration(after,visible,relative);
    assert.equal(gitBlob(bytes),expectedBlob,"read_blob_drift:"+relative);
    return bytes;
  }finally{
    fs.closeSync(fd);
  }
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string"||typeof value==="boolean")return JSON.stringify(value);
  if(typeof value==="number"){
    assert.ok(Number.isSafeInteger(value));
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  assert.ok(value&&typeof value==="object"&&!Array.isArray(value));
  return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function verifyScope(){
  git(["merge-base","--is-ancestor",PARENT,"HEAD"]);
  assert.equal(git(["merge-base",PARENT,"HEAD"]),PARENT);
  const rows=git(["diff","--name-status",PARENT,"HEAD","--"]).split(/\n/u).filter(Boolean);
  assert.equal(rows.length,4,"scope_count");
  const actual=rows.map(row=>{
    const m=row.match(/^A\t(.+)$/u);
    assert.ok(m,"scope_not_add_only:"+row);
    return m[1];
  }).sort();
  assert.deepEqual(actual,EXPECTED_SCOPE);
  git(["diff","--check",PARENT,"HEAD"]);
}
function verifyPrerequisites(){
  const candidate=JSON.parse(decoder.decode(readPinned(CANDIDATE_V5,CANDIDATE_V5_BLOB,1024*1024)));
  const lock=JSON.parse(decoder.decode(readPinned(LOCK_V5,LOCK_V5_BLOB,1024*1024)));
  const exchange=JSON.parse(decoder.decode(readPinned(EXCHANGE_PLAN,EXCHANGE_PLAN_BLOB,1024*1024)));
  readPinned(EXCHANGE_PROOF,EXCHANGE_PROOF_BLOB);
  const reseal=decoder.decode(readPinned(RESEAL_BUILDER,RESEAL_BUILDER_BLOB));
  readPinned(RESEAL_PROOF,RESEAL_PROOF_BLOB);
  const receipt=decoder.decode(readPinned(RECEIPT_PROOF,RECEIPT_PROOF_BLOB));
  readPinned(RECEIPT_WORKFLOW,RECEIPT_WORKFLOW_BLOB);
  const v4=decoder.decode(readPinned(V4_INSTALLER,V4_INSTALLER_BLOB));

  assert.equal(candidate.candidate_enforcement_set_sha256,
    "e72f512b0006eef7cec7325f39c56823eb3c878d7f8452a08c717478b7c8ac45");
  assert.equal(candidate.candidate_enforcement_identity_accepted,false);
  assert.equal(lock.candidate_enforcement_identity_accepted,true);
  assert.equal(lock.deployed_artifact_generation_verified,false);
  assert.equal(lock.runtime_mount_authority,false);
  assert.equal(lock.production_source_finality_authority_ready,false);
  assert.equal(lock.public_presale_activation,false);
  assert.equal(lock.funds_movement,false);

  assert.equal(exchange.plan_id,
    "voidv7srcrecexchange1_ddc23a6acfe11a8ce0e486d6848c43f6eb0e0dd6942c8c3f1240bdd1cd7fc9d0");
  assert.equal(exchange.future_exchange_contract.durable_transition_journal_required,true);
  assert.equal(exchange.future_exchange_contract.exclusive_writer_consumer_fence_required,true);
  assert.equal(exchange.authority.transition_journal_write_authority,false);
  assert.equal(exchange.authority.recovery_execution_authority,false);

  for(const token of [
    'TARGET_HEAD = "be2fbe41aaba291d3f874b9de52bcb87336307f5"',
    'TARGET_TREE = "749877d2320ecee9d659720b32e4726a0c42d697"',
    '"79081038cf4f03c2971bdcb32c54daf6a87fbabf"',
    "EXPECTED_REACHABLE_COMMITS = 18357",
  ])assert.ok(reseal.includes(token),"reseal_identity_missing:"+token);

  for(const token of [
    'EXPECTED_RECEIPT_ID="voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37"',
    'EXPECTED_RECEIPT_SHA256="12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001"',
    "EXPECTED_RECEIPT_BYTES=1136",
  ])assert.ok(receipt.includes(token),"receipt_identity_missing:"+token);

  for(const token of [
    "PROTECTED_SOURCE_ROOT_MODE = 0o755",
    "RUNTIME_UID = 1000",
    "RUNTIME_GID = 1000",
    "RENAME_NOREPLACE = 1",
    "acl_aware_runtime_uid_nonwritability_required=true",
    "protected_source_root_mode_0755_required=true",
  ])assert.ok(v4.includes(token),"v4_stage_precedent_missing:"+token);
}
function verifyPlan(){
  const value=JSON.parse(decoder.decode(readPinned(PLAN,PLAN_BLOB,1024*1024)));
  const {plan_id,...body}=value;
  assert.equal(plan_id,EXPECTED_PLAN_ID);
  assert.equal(plan_id,"voidv7stageplan1_"+sha256(Buffer.from(canonical(body),"utf8")));
  assert.equal(body.source_parent,PARENT);
  assert.equal(body.source_stage_contract.stage_path,
    "/opt/.void-buy-void-v7-reviewed-v1.stage-v5");
  assert.equal(body.source_stage_contract.final_root_mode,"0755");
  assert.equal(body.source_stage_contract.runtime_uid_tree_nonwritable_required,true);
  assert.equal(body.source_stage_contract.candidate_source_commit,
    "be2fbe41aaba291d3f874b9de52bcb87336307f5");
  assert.equal(body.source_stage_contract.candidate_source_tree,
    "749877d2320ecee9d659720b32e4726a0c42d697");
  assert.equal(body.source_stage_contract.candidate_reachable_commits,18357);
  assert.equal(body.source_stage_contract.fixed_source_exchange_authority,false);
  assert.equal(body.receipt_stage_contract.stage_path,
    "/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5");
  assert.equal(body.receipt_stage_contract.receipt_id,
    "voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37");
  assert.equal(body.receipt_stage_contract.sha256,
    "12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001");
  assert.equal(body.receipt_stage_contract.bytes,1136);
  assert.equal(body.receipt_stage_contract.mode,"0444");
  assert.equal(body.receipt_stage_contract.fixed_receipt_exchange_authority,false);
  assert.equal(body.combined_stage_contract.partial_exact_stage_is_resumable,true);
  assert.equal(body.combined_stage_contract.mismatched_existing_stage_holds,true);
  assert.equal(body.combined_stage_contract.fixed_v4_pair_must_remain_exact,true);
  assert.equal(body.combined_stage_contract.no_exchange,true);
  assert.equal(body.combined_stage_contract.no_service_restart,true);
  assert.equal(body.combined_stage_contract.no_runtime_cutover,true);
  assert.equal(body.host_revalidation_contract.snapshot_census_is_not_exclusion,true);
  for(const [key,val] of Object.entries(body.authority)){
    if(key==="plan_only")assert.equal(val,true);
    else assert.equal(val,false,"authority_overclaim:"+key);
  }
  assert.equal(body.next_gate,"IMPLEMENT_V5_ROOT_CUSTODIED_STAGE_BUILDER_AFTER_PLAN_CI");
}

verifyScope();
verifyPrerequisites();
verifyPlan();
console.log(MARKER+"_PROOF_GREEN");
console.log("plan_id="+EXPECTED_PLAN_ID);
console.log("v5_lock_cross_node_green=true");
console.log("exchange_plan_durable_recovery_bound=true");
console.log("v5_full_history_reseal_bound=true");
console.log("v5_receipt_cross_node_identity_bound=true");
console.log("protected_source_root_mode_0755_bound=true");
console.log("runtime_uid_acl_nonwritability_bound=true");
console.log("source_stage_create_only=true");
console.log("receipt_stage_create_only=true");
console.log("partial_exact_stage_resumable=true");
console.log("mismatched_stage_holds=true");
console.log("fixed_v4_pair_must_remain_exact=true");
console.log("fresh_host_recensus_required=true");
console.log("host_read=false");
console.log("host_write=false");
console.log("root_execution=false");
console.log("protected_filesystem_mutation=false");
console.log("fixed_source_exchange=false");
console.log("fixed_receipt_exchange=false");
console.log("service_mutation=false");
console.log("runtime_cutover=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
