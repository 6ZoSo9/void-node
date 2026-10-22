#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_BUY_VOID_V7_V5_SOURCE_RECEIPT_STAGE_PLAN_V1";
const PARENT="242aa1054e1c9ee36a06047ea350f92976870038";
const PLAN="ops/security/buy-void-v7-v5-source-receipt-stage-plan-v1.json";
const PLAN_BLOB="fd63775747dae7b90a565686597d016a907bc313";
const RECEIPT="ops/security/buy-void-source-finality-v7-deployment-receipt-v5.json";
const RECEIPT_BLOB="eddd0b47263213ae8dd65ef72a5479c40ea6812e";
const SELF="scripts/prove_buy_void_v7_v5_source_receipt_stage_plan_v1.mjs";
const DOC="docs/architecture/buy-void-v7-v5-source-receipt-stage-plan-v1.md";
const WORKFLOW=".github/workflows/buy-void-v7-v5-source-receipt-stage-plan-v1.yml";
const OWNED=Object.freeze([WORKFLOW,DOC,PLAN,RECEIPT,SELF].sort());

const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json";
const LOCK_BLOB="bc1b2f4095315861db7a257d4cc3c80a9f112530";
const CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5.json";
const CANDIDATE_BLOB="46e3774ca442cf593d25b6062ab5538d5ac43611";
const EXCHANGE_PLAN="ops/security/buy-void-v7-protected-source-receipt-exchange-plan-v1.json";
const EXCHANGE_PLAN_BLOB="191a8015e438bc1cebf9fadfcbc23c68f0d2d4ad";
const RESEAL_BUILDER="ops/precision/void_v7_source_release_full_history_reseal_v2.py";
const RESEAL_BUILDER_BLOB="bb78c7d9f468baa20b580d052d934d9b97c05134";
const RESEAL_PROOF="scripts/prove_void_v7_source_release_full_history_reseal_v2.py";
const RESEAL_PROOF_BLOB="77c0e6eaa859f3f4d6df8a46da477e72a451c10c";
const RECEIPT_PROOF="scripts/prove_buy_void_source_finality_v7_deployment_receipt_candidate_v2.ts";
const RECEIPT_PROOF_BLOB="76a05cbcd1be72e2817f04b676b5a8c395a5bf0e";
const RECEIPT_WORKFLOW=".github/workflows/buy-void-source-finality-v7-deployment-receipt-candidate-v2.yml";
const RECEIPT_WORKFLOW_BLOB="98fdfd7b64d88f751c2d05f7cca6ef348de112aa";

const EXPECTED_PLAN_ID="voidv7stageplan1_7054f1774a723c62d5ea0c527c69084e76e0c47372b7602349b08c49138fc203";
const EXPECTED_RECEIPT_ID="voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37";
const EXPECTED_RECEIPT_SHA256="12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001";
const EXPECTED_RECEIPT_BYTES=1136;

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
function canonical(v){
  if(v===null)return "null";
  if(typeof v==="string"||typeof v==="boolean")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
const sha256=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob=bytes=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
  .update(bytes).digest("hex");

function readBound(relative,blob,maxBytes=2*1024*1024){
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"tree_blob_drift:"+relative);
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
    for(const key of ["dev","ino","uid","gid","mode","nlink","size","mtimeMs","ctimeMs"]){
      assert.equal(opened[key],before[key],"generation_changed_pre_read:"+relative+":"+key);
    }
    const bytes=Buffer.alloc(opened.size);
    let offset=0;
    while(offset<bytes.length){
      const n=fs.readSync(fd,bytes,offset,bytes.length-offset,null);
      assert.ok(n>0,"short_read:"+relative);
      offset+=n;
    }
    assert.equal(fs.readSync(fd,Buffer.alloc(1),0,1,null),0,"growth_detected:"+relative);
    const after=fs.fstatSync(fd);
    const visible=fs.lstatSync(absolute);
    for(const key of ["dev","ino","uid","gid","mode","nlink","size","mtimeMs","ctimeMs"]){
      assert.equal(after[key],opened[key],"generation_changed_post_read:"+relative+":"+key);
      assert.equal(visible[key],after[key],"visible_generation_changed:"+relative+":"+key);
    }
    assert.equal(gitBlob(bytes),blob,"visible_blob_drift:"+relative);
    return bytes;
  }finally{fs.closeSync(fd);}
}
function verifyScope(){
  git(["merge-base","--is-ancestor",PARENT,"HEAD"]);
  assert.equal(git(["merge-base",PARENT,"HEAD"]),PARENT);
  const rows=git(["diff","--name-status",PARENT,"HEAD","--"]).split(/\n/u).filter(Boolean);
  assert.equal(rows.length,OWNED.length,"stage_plan_scope_count");
  const actual=rows.map(row=>{
    const m=row.match(/^A\t(.+)$/u);
    assert.ok(m,"stage_plan_scope_not_add_only:"+row);
    return m[1];
  }).sort();
  assert.deepEqual(actual,OWNED,"stage_plan_scope_paths");
  git(["diff","--check",PARENT,"HEAD"]);
  assert.equal(git(["status","--porcelain=v1","--untracked-files=all"]),"","checkout_not_clean");
}
function verifyReceipt(){
  const raw=readBound(RECEIPT,RECEIPT_BLOB,64*1024);
  assert.equal(raw.length,EXPECTED_RECEIPT_BYTES);
  assert.equal(sha256(raw),EXPECTED_RECEIPT_SHA256);
  const v=JSON.parse(raw.toString("utf8"));
  assert.equal(v.receipt_id,EXPECTED_RECEIPT_ID);
  assert.equal(v.process_source_commit,"be2fbe41aaba291d3f874b9de52bcb87336307f5");
  assert.equal(v.process_source_tree,"749877d2320ecee9d659720b32e4726a0c42d697");
  assert.equal(v.accepted_enforcement_set_sha256,"e72f512b0006eef7cec7325f39c56823eb3c878d7f8452a08c717478b7c8ac45");
  assert.equal(v.reviewed_source_files_sha256,"18d63ea70fc3a7a4d0ce3d427205717e2c72c40eb145fe677eb4ab6e869acb24");
  assert.equal(v.reviewed_source_file_count,"10");
  assert.equal(v.candidate_enforcement_identity_accepted,true);
  assert.equal(v.complete_executable_closure_verified,true);
  assert.equal(v.status,"DEPLOYED_SOURCE_FINALITY_GENERATION_ACCEPTED");
}
function verifyDependencies(){
  for(const [p,b] of [
    [LOCK,LOCK_BLOB],[CANDIDATE,CANDIDATE_BLOB],
    [EXCHANGE_PLAN,EXCHANGE_PLAN_BLOB],
    [RESEAL_BUILDER,RESEAL_BUILDER_BLOB],[RESEAL_PROOF,RESEAL_PROOF_BLOB],
    [RECEIPT_PROOF,RECEIPT_PROOF_BLOB],[RECEIPT_WORKFLOW,RECEIPT_WORKFLOW_BLOB],
  ])readBound(p,b,8*1024*1024);
  assert.equal(git(["rev-parse","be2fbe41aaba291d3f874b9de52bcb87336307f5^{tree}"]),
    "749877d2320ecee9d659720b32e4726a0c42d697");
  assert.equal(git(["rev-list","--parents","-n","1","be2fbe41aaba291d3f874b9de52bcb87336307f5"]),
    "be2fbe41aaba291d3f874b9de52bcb87336307f5 79081038cf4f03c2971bdcb32c54daf6a87fbabf");
}
function verifyPlan(){
  const raw=readBound(PLAN,PLAN_BLOB,1024*1024);
  const v=JSON.parse(raw.toString("utf8"));
  const {plan_id,...body}=v;
  assert.equal(plan_id,EXPECTED_PLAN_ID);
  assert.equal(plan_id,"voidv7stageplan1_"+sha256(Buffer.from(canonical(body),"utf8")));
  assert.equal(v.source_parent,PARENT);
  assert.equal(v.accepted_v5_enforcement.exact_head_green,true);
  assert.equal(v.exchange_plan.head,"dfa30a733fa21f4b806b4a8d559fa3e7ae0f147c");
  assert.equal(v.exchange_plan.plan_id,
    "voidv7srcrecexchange1_ddc23a6acfe11a8ce0e486d6848c43f6eb0e0dd6942c8c3f1240bdd1cd7fc9d0");
  assert.equal(v.exchange_plan.node22_success,true);
  assert.equal(v.exchange_plan.node24_success,true);
  assert.equal(v.exchange_plan.node26_success,true);
  assert.equal(v.source_provenance.exact_head_green,true);
  assert.equal(v.source_provenance.reachable_commits,18357);
  assert.equal(v.receipt_provenance.exact_head_green,true);
  assert.equal(v.receipt_provenance.truth_boundary,
    "candidate_bytes_only_not_installed_deployment");
  assert.equal(v.precision_host_census.read_only_green,true);
  assert.equal(v.precision_host_census.source_same_filesystem,true);
  assert.equal(v.precision_host_census.receipt_same_filesystem,true);
  assert.equal(v.precision_host_census.source_stage_absent,true);
  assert.equal(v.precision_host_census.receipt_stage_absent,true);

  assert.equal(v.source_stage_contract.target_path,
    "/opt/.void-buy-void-v7-reviewed-v1.stage-v5");
  assert.equal(v.source_stage_contract.target_root_mode,"0755");
  assert.equal(v.source_stage_contract.create_only,true);
  assert.equal(v.source_stage_contract.rename_noreplace_required,true);
  assert.equal(v.source_stage_contract.parent_fsync_required,true);
  assert.equal(v.source_stage_contract.stage_full_history_preserved,true);
  assert.equal(v.source_stage_contract.fixed_source_exchange_authority,false);

  assert.equal(v.receipt_stage_contract.target_path,
    "/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5");
  assert.equal(v.receipt_stage_contract.target_mode,"0444");
  assert.equal(v.receipt_stage_contract.target_nlink,1);
  assert.equal(v.receipt_stage_contract.create_only,true);
  assert.equal(v.receipt_stage_contract.rename_noreplace_required,true);
  assert.equal(v.receipt_stage_contract.parent_fsync_required,true);
  assert.equal(v.receipt_stage_contract.exact_receipt_id_required,EXPECTED_RECEIPT_ID);
  assert.equal(v.receipt_stage_contract.exact_receipt_sha256_required,EXPECTED_RECEIPT_SHA256);
  assert.equal(v.receipt_stage_contract.exact_receipt_bytes_required,EXPECTED_RECEIPT_BYTES);
  assert.equal(v.receipt_stage_contract.fixed_receipt_exchange_authority,false);

  assert.equal(v.stage_pair_qualification_contract.actual_installed_deployment_generation_verified,false);
  assert.equal(v.stage_pair_qualification_contract.fixed_v4_pair_must_remain_unchanged,true);
  assert.equal(v.stage_pair_qualification_contract.runtime_cutover_authority,false);

  for(const [key,value] of Object.entries(v.authority)){
    if(key==="plan_only")assert.equal(value,true);
    else assert.equal(value,false,"authority_overclaim:"+key);
  }
  assert.equal(v.next_gate,"IMPLEMENT_V5_SOURCE_AND_RECEIPT_CREATE_ONLY_STAGE_INSTALLERS");
}

verifyScope();
verifyDependencies();
verifyReceipt();
verifyPlan();
console.log(MARKER+"_PROOF_GREEN");
console.log("plan_id="+EXPECTED_PLAN_ID);
console.log("exact_v5_lock_green=true");
console.log("hardened_exchange_plan_green=true");
console.log("full_history_source_provenance_green=true");
console.log("receipt_cross_node_provenance_green=true");
console.log("receipt_repository_blob_bound=true");
console.log("precision_exchange_host_census_green=true");
console.log("source_stage_create_only=true");
console.log("receipt_stage_create_only=true");
console.log("stage_pair_exchange_authority=false");
console.log("actual_installed_deployment_generation_verified=false");
console.log("host_read=false");
console.log("host_write=false");
console.log("root_execution=false");
console.log("protected_filesystem_mutation=false");
console.log("service_mutation=false");
console.log("runtime_cutover_authority=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
