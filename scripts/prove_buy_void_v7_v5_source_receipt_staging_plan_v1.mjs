#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_V7_V5_SOURCE_RECEIPT_STAGING_PLAN_V1";
const PARENT="242aa1054e1c9ee36a06047ea350f92976870038";
const PLAN="ops/security/buy-void-v7-v5-source-receipt-staging-plan-v1.json";
const PLAN_BLOB="37c6f5bd5753f05e57dde3c95f9c2f89c0abdc4d";
const SELF="scripts/prove_buy_void_v7_v5_source_receipt_staging_plan_v1.mjs";
const DOC="docs/architecture/buy-void-v7-v5-source-receipt-staging-plan-v1.md";
const WORKFLOW=".github/workflows/buy-void-v7-v5-source-receipt-staging-plan-v1.yml";
const OWNED=Object.freeze([WORKFLOW,DOC,PLAN,SELF].sort());
const EXPECTED_PLAN_ID="voidv7v5stageplan1_f1a73d229fd78352758302cefd794bd07cfff77daaa02468c80125e378d41fa5";

const BOUND=Object.freeze([
  ["ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json","bc1b2f4095315861db7a257d4cc3c80a9f112530"],
  ["ops/security/buy-void-v7-protected-source-receipt-exchange-plan-v1.json","191a8015e438bc1cebf9fadfcbc23c68f0d2d4ad"],
  ["scripts/prove_buy_void_v7_protected_source_receipt_exchange_plan_v1.mjs","f3d1fdcd44a817dfffa35d59d7b7c2a3bc505912"],
  ["ops/precision/void_v7_source_release_full_history_reseal_v2.py","bb78c7d9f468baa20b580d052d934d9b97c05134"],
  ["scripts/prove_void_v7_source_release_full_history_reseal_v2.py","77c0e6eaa859f3f4d6df8a46da477e72a451c10c"],
  ["scripts/prove_buy_void_source_finality_v7_deployment_receipt_candidate_v2.ts","76a05cbcd1be72e2817f04b676b5a8c395a5bf0e"],
  [".github/workflows/buy-void-source-finality-v7-deployment-receipt-candidate-v2.yml","98fdfd7b64d88f751c2d05f7cca6ef348de112aa"],
]);

const MAX_BYTES=8*1024*1024;
const decoder=new TextDecoder("utf-8",{fatal:true});
const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+String(b.length)+"\0","utf8"))
  .update(b).digest("hex");

function canonical(v){
  if(v===null)return "null";
  if(typeof v==="string"||typeof v==="boolean")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function git(args){
  return execFileSync("/usr/bin/git",[
    "--no-replace-objects","-c","core.hooksPath=/dev/null",
    "-c","core.fsmonitor=false","-C",ROOT,...args,
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
function generation(st){
  return Object.freeze({
    dev:st.dev,ino:st.ino,uid:st.uid,gid:st.gid,mode:st.mode,nlink:st.nlink,
    size:st.size,mtimeMs:st.mtimeMs,ctimeMs:st.ctimeMs,
  });
}
function sameGeneration(a,b,label){
  for(const key of Object.keys(a))assert.equal(a[key],b[key],label+":"+key);
}
function readPinnedAt(file,expectedBlob,maxBytes=MAX_BYTES,hook=null){
  const before=fs.lstatSync(file);
  assert.ok(
    before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=maxBytes,
    "pinned_preopen_shape_invalid:"+file,
  );
  let fd=-1;
  try{
    fd=fs.openSync(
      file,
      fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK,
    );
    const opened=fs.fstatSync(fd);
    assert.ok(opened.isFile()&&opened.nlink===1,"pinned_open_shape_invalid:"+file);
    sameGeneration(generation(before),generation(opened),"pinned_open_generation_changed");
    const bytes=Buffer.alloc(opened.size);
    let off=0;
    while(off<bytes.length){
      const got=fs.readSync(fd,bytes,off,bytes.length-off,off);
      assert.ok(got>0,"pinned_short_read:"+file);
      off+=got;
    }
    if(hook)hook(file,fd);
    const extra=Buffer.alloc(1);
    assert.equal(fs.readSync(fd,extra,0,1,bytes.length),0,"pinned_growth_detected:"+file);
    const after=fs.fstatSync(fd);
    const visible=fs.lstatSync(file);
    assert.ok(visible.isFile()&&!visible.isSymbolicLink()&&visible.nlink===1);
    sameGeneration(generation(opened),generation(after),"pinned_fd_generation_changed");
    sameGeneration(generation(after),generation(visible),"pinned_visible_generation_changed");
    assert.equal(gitBlob(bytes),expectedBlob,"pinned_blob_mismatch:"+file);
    return bytes;
  }finally{
    if(fd>=0)fs.closeSync(fd);
  }
}
function readPinned(relative,expectedBlob,maxBytes=MAX_BYTES){
  assert.equal(path.isAbsolute(relative),false);
  assert.equal(relative.split("/").some(x=>!x||x==="."||x===".."),false);
  assert.equal(git(["rev-parse","HEAD:"+relative]),expectedBlob,"tree_blob_mismatch:"+relative);
  return readPinnedAt(path.join(ROOT,relative),expectedBlob,maxBytes);
}
function selfTestPinnedReader(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"void-v5-stage-plan-read-"));
  const file=path.join(dir,"bound");
  const backup=path.join(dir,"backup");
  const reviewed=Buffer.from("REVIEWED!","utf8");
  const attacker=Buffer.from("ATTACKER!","utf8");
  assert.equal(reviewed.length,attacker.length);
  try{
    fs.writeFileSync(file,reviewed,{mode:0o600});
    const expected=gitBlob(reviewed);
    assert.deepEqual(readPinnedAt(file,expected,1024),reviewed);
    assert.throws(()=>readPinnedAt(file,expected,4),/pinned_preopen_shape_invalid/);
    assert.throws(()=>readPinnedAt(file,expected,1024,(name)=>{
      fs.renameSync(name,backup);
      fs.writeFileSync(name,attacker,{mode:0o600});
    }),/pinned_fd_generation_changed|pinned_visible_generation_changed/);
    fs.rmSync(file,{force:true});fs.renameSync(backup,file);
    assert.throws(()=>readPinnedAt(file,expected,1024,(name)=>{
      fs.renameSync(name,backup);
      fs.symlinkSync(backup,name);
    }));
    fs.rmSync(file,{force:true});fs.renameSync(backup,file);
    assert.throws(()=>readPinnedAt(file,expected,1024,(name)=>{
      fs.appendFileSync(name,"X");
    }),/pinned_growth_detected|pinned_fd_generation_changed|pinned_visible_generation_changed/);
  }finally{
    fs.rmSync(dir,{recursive:true,force:true});
  }
}
function verifyScope(){
  git(["merge-base","--is-ancestor",PARENT,"HEAD"]);
  assert.equal(git(["merge-base",PARENT,"HEAD"]),PARENT);
  const rows=git(["diff","--name-status",PARENT,"HEAD","--"]).split(/\n/u).filter(Boolean);
  assert.equal(rows.length,4,"staging_plan_scope_count");
  const actual=rows.map(row=>{
    const m=row.match(/^A\t(.+)$/u);assert.ok(m,"staging_plan_scope_not_add_only:"+row);return m[1];
  }).sort();
  assert.deepEqual(actual,OWNED);
  git(["diff","--check",PARENT,"HEAD"]);
}
function verifyPlan(){
  const raw=readPinned(PLAN,PLAN_BLOB,1024*1024);
  const v=JSON.parse(decoder.decode(raw));
  const {plan_id,...body}=v;
  assert.equal(plan_id,EXPECTED_PLAN_ID);
  assert.equal(
    plan_id,
    "voidv7v5stageplan1_"+sha256(Buffer.from(canonical(body),"utf8")),
    "plan_content_address_mismatch",
  );
  assert.equal(body.source_parent,PARENT);
  assert.equal(body.target_generation.protected_source_commit,"be2fbe41aaba291d3f874b9de52bcb87336307f5");
  assert.equal(body.target_generation.protected_source_tree,"749877d2320ecee9d659720b32e4726a0c42d697");
  assert.equal(body.target_generation.reachable_commits,18357);
  assert.equal(body.source_provenance.focused_workflow_success,true);
  assert.equal(body.receipt_candidate.cross_node_success,true);
  assert.equal(body.receipt_candidate.receipt_id,
    "voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37");
  assert.equal(body.receipt_candidate.receipt_sha256,
    "12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001");
  assert.equal(body.receipt_candidate.receipt_bytes,1136);
  assert.equal(body.exchange_plan_dependency.durable_recovery_required,true);
  assert.equal(body.exchange_plan_dependency.exclusive_consumer_fence_required,true);
  assert.equal(
    body.exchange_plan_dependency.exact_head_focused_ci_required_before_exchange_implementation_acceptance,
    true,
  );
  assert.equal(body.observed_precision_host_census.source_same_filesystem,true);
  assert.equal(body.observed_precision_host_census.receipt_same_filesystem,true);
  assert.equal(body.observed_precision_host_census.source_stage_name_absent,true);
  assert.equal(body.observed_precision_host_census.receipt_stage_name_absent,true);
  assert.equal(body.observed_precision_host_census.host_census_must_be_rerun_immediately_before_any_stage_apply,true);
  assert.equal(body.stage_paths.source,"/opt/.void-buy-void-v7-reviewed-v1.stage-v5");
  assert.equal(body.stage_paths.receipt,
    "/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5");
  assert.equal(body.source_stage_contract.input_candidate_user_owned_untrusted,true);
  assert.equal(body.source_stage_contract.root_custodied_copy_required,true);
  assert.equal(body.source_stage_contract.create_or_exact_match_only,true);
  assert.equal(body.source_stage_contract.source_exchange_authority,false);
  assert.equal(body.receipt_stage_contract.create_or_exact_match_only,true);
  assert.equal(body.receipt_stage_contract.receipt_exchange_authority,false);
  assert.equal(body.staging_pair_contract.fixed_v4_pair_must_remain_unchanged_during_staging,true);
  assert.equal(body.staging_pair_contract.no_transition_journal_created_during_staging,true);
  assert.equal(body.staging_pair_contract.no_consumer_fence_mutation_during_staging,true);
  assert.equal(body.staging_pair_contract.pair_ready_only_when_both_stages_exact,true);
  assert.equal(body.staging_pair_contract.stage_pair_ready_does_not_equal_runtime_cutover_ready,true);
  for(const [key,value] of Object.entries(body.authority)){
    if(key==="plan_only")assert.equal(value,true);
    else assert.equal(value,false,"authority_overclaim:"+key);
  }
  assert.equal(body.next_gate,"IMPLEMENT_CREATE_ONLY_V5_SOURCE_AND_RECEIPT_STAGE_BUILDERS");
}
selfTestPinnedReader();
verifyScope();
for(const [relative,blob] of BOUND)readPinned(relative,blob);
verifyPlan();
console.log(MARKER+"_PROOF_GREEN");
console.log("plan_id="+EXPECTED_PLAN_ID);
console.log("descriptor_bound_source_reads=true");
console.log("equal_length_swap_rejected=true");
console.log("symlink_substitution_rejected=true");
console.log("growth_rejected=true");
console.log("v5_lock_bound=true");
console.log("v5_full_history_reseal_bound=true");
console.log("v5_receipt_cross_node_identity_bound=true");
console.log("precision_same_filesystem_census_recorded=true");
console.log("stage_names_recorded_absent=true");
console.log("root_stage_creation_authority=false");
console.log("fixed_source_exchange_authority=false");
console.log("fixed_receipt_exchange_authority=false");
console.log("service_mutation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
