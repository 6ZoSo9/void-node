#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_V7_V5_STAGE_TRUSTED_ADMISSION_PLAN_V2";
const PARENT="5ec1658836c2f7580cbbd27d9b49b5f3892b90ef";
const PARENT_TREE="681040be548b140e9a15d2c4c851ecba9e8623ed";
const PLAN="ops/security/buy-void-v7-v5-stage-trusted-admission-plan-v2.json";
const PLAN_BLOB="c7ff1128ff04f3ce5f995206af52f844564c6b39";
const EXPECTED_PLAN_ID="voidv7v5stageadmissionplan2_ab5bf952568a3633b494322dcef46f4ee8e15d20f8881c8bd9b6f787f414e2a5";
const SELF="scripts/prove_buy_void_v7_v5_stage_trusted_admission_plan_v2.mjs";
const DOC="docs/architecture/buy-void-v7-v5-stage-trusted-admission-plan-v2.md";
const WORKFLOW=".github/workflows/buy-void-v7-v5-stage-trusted-admission-plan-v2.yml";
const OWNED=Object.freeze([WORKFLOW,DOC,PLAN,SELF].sort());

const BOUND=Object.freeze([
  ["ops/precision/void_buy_void_v7_v5_source_stage_install_v1.py","b8b52649730cd1b1cf23ffc8c68878cef8ecfc5b"],
  ["ops/precision/void_buy_void_v7_v5_receipt_stage_install_v1.py","8a8da645c73216714fad1140c9981745fbb4a8de"],
  ["scripts/prove_buy_void_v7_v5_source_stage_install_v1.py","b3c939f12bb97b05f3d50a4a4836f945b1ecbe01"],
  ["scripts/prove_buy_void_v7_v5_receipt_stage_install_v1.py","8bdd918666492360e30fbd5d7a73f2655bddfc1b"],
  [".github/workflows/buy-void-v7-v5-source-receipt-stage-install-v1.yml","6ab14eacb8889bc0197240aba36935dda0b3b15c"],
  ["ops/security/buy-void-v7-v5-source-receipt-stage-plan-v1.json","fd63775747dae7b90a565686597d016a907bc313"],
  ["ops/security/buy-void-source-finality-v7-deployment-receipt-v5.json","eddd0b47263213ae8dd65ef72a5479c40ea6812e"],
]);

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
const sha256=s=>crypto.createHash("sha256").update(s,"utf8").digest("hex");
function canonical(v){
  if(v===null)return "null";
  if(typeof v==="string"||typeof v==="boolean")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function bind(relative,blob){
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"blob_drift:"+relative);
  return fs.readFileSync(path.join(ROOT,relative),"utf8");
}
function verifyScope(){
  git(["merge-base","--is-ancestor",PARENT,"HEAD"]);
  assert.equal(git(["merge-base",PARENT,"HEAD"]),PARENT);
  assert.equal(git(["rev-parse",PARENT+"^{tree}"]),PARENT_TREE);
  const rows=git(["diff","--name-status",PARENT,"HEAD","--"]).split(/\n/u).filter(Boolean);
  assert.equal(rows.length,4,"scope_count");
  const actual=rows.map(row=>{
    const m=row.match(/^M\t(.+)$/u);
    assert.ok(m,"scope_not_add_only:"+row);
    return m[1];
  }).sort();
  assert.deepEqual(actual,OWNED);
  git(["diff","--check",PARENT,"HEAD"]);
}

verifyScope();
const plan=JSON.parse(bind(PLAN,PLAN_BLOB));
for(const [relative,blob] of BOUND)bind(relative,blob);

const {plan_id,...body}=plan;
assert.equal(plan_id,EXPECTED_PLAN_ID);
assert.equal(plan_id,"voidv7v5stageadmissionplan2_"+sha256(canonical(body)));
assert.equal(body.source_parent,PARENT);
assert.equal(body.implementation_generation.commit,PARENT);
assert.equal(body.implementation_generation.tree,PARENT_TREE);
assert.equal(body.implementation_generation.focused_workflow_success,true);
assert.equal(body.implementation_generation.boundary_hardening.candidate_read_boundaries_nonblocking,true);
assert.equal(body.implementation_generation.boundary_hardening.copy_source_fifo_swap_nonblocking_verified,true);
assert.equal(body.implementation_generation.boundary_hardening.receipt_pre_import_isolation_required,true);
assert.equal(body.implementation_generation.boundary_hardening.hostile_sibling_import_poison_rejected,true);
assert.equal(body.implementation_generation.focused_workflow_run,39834113682);
assert.equal(body.implementation_generation.python312_job,120017760398);
assert.equal(body.implementation_generation.python313_job,120017760198);

assert.equal(body.canonical_stage_semantics.source_stage_root_mode,"0755");
assert.equal(body.canonical_stage_semantics.source_internal_stage,
  "/opt/.void-buy-void-v7-reviewed-v1.stage-v5.build-v1");
assert.equal(body.canonical_stage_semantics.receipt_stage_mode,"0444");
assert.equal(body.canonical_stage_semantics.v5_receipt_bytes,1136);

assert.equal(body.trusted_admission_precedent.predecessor_qualifier_source_stage_mode,"0555");
assert.equal(body.trusted_admission_precedent.predecessor_qualifier_source_internal_stage,
  "/opt/.void-buy-void-v7-reviewed-v1.stage-v5.tmp-v1");
assert.equal(body.trusted_admission_precedent.successor_must_not_reuse_those_stage_assumptions,true);

assert.equal(body.future_closed_tree.exact_source_commit,PARENT);
assert.equal(body.future_closed_tree.exact_source_tree,PARENT_TREE);
assert.equal(body.future_closed_tree.fixed_root,
  "/opt/void-v7-v5-source-receipt-stage-closed-tree-v2");
assert.equal(body.future_policy_contract.source_stage_root_mode,"0755");
assert.equal(body.future_policy_contract.source_internal_stage,
  "/opt/.void-buy-void-v7-reviewed-v1.stage-v5.build-v1");
assert.equal(body.launcher_request_surface.launcher_supplies_source_expected_head,PARENT);
assert.equal(body.launcher_request_surface.launcher_supplies_source_expected_tree,PARENT_TREE);
assert.equal(body.stage_pair_qualification_contract.source_stage_root_mode_required,"0755");
assert.equal(body.stage_pair_qualification_contract.source_internal_stage_path,
  "/opt/.void-buy-void-v7-reviewed-v1.stage-v5.build-v1");

for(const key of [
 "filesystem_path_arguments_forbidden","candidate_path_arguments_forbidden",
 "receipt_bytes_arguments_forbidden","source_generation_arguments_forbidden",
 "exchange_operations_forbidden","transition_journal_operations_forbidden",
 "consumer_fence_operations_forbidden","service_operations_forbidden",
])assert.equal(body.launcher_request_surface[key],true,key);

for(const key of [
 "source_stage_exact_v5_generation_required","receipt_stage_exact_v5_identity_required",
 "fixed_v4_source_unchanged_required","fixed_v4_receipt_unchanged_required",
 "reserved_predecessor_paths_absent_required","transition_journal_absent_during_staging_required",
 "consumer_fence_unchanged_during_staging_required",
])assert.equal(body.stage_pair_qualification_contract[key],true,key);
assert.equal(body.stage_pair_qualification_contract.pair_ready_output_grants_exchange_authority,false);
assert.equal(body.stage_pair_qualification_contract.pair_ready_output_grants_runtime_cutover_authority,false);

const source=fs.readFileSync(path.join(ROOT,"ops/precision/void_buy_void_v7_v5_source_stage_install_v1.py"),"utf8");
for(const token of [
 'TARGET_NAME = ".void-buy-void-v7-reviewed-v1.stage-v5"',
 'STAGE_NAME = ".void-buy-void-v7-reviewed-v1.stage-v5.build-v1"',
 'CONFIRM_TOKEN = "INSTALL_VOID_V7_V5_SOURCE_STAGE_V1_CREATE_ONLY"',
 '_verify_full_history_root(TARGET, 0, 0, 0o755)',
 '_verify_full_history_root(STAGE, 0, 0, 0o755)',
 'candidate_copy_descriptor_relative=true',
 'candidate_read_boundaries_nonblocking=true',
 'copy_source_fifo_swap_nonblocking=true',
 'trusted_root_launcher_required=true',
])assert.ok(source.includes(token),token);

const receipt=fs.readFileSync(path.join(ROOT,"ops/precision/void_buy_void_v7_v5_receipt_stage_install_v1.py"),"utf8");
for(const token of [
 'TARGET=pathlib.Path("/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5")',
 'TEMP_NAME=".deployment-receipt.json.stage-v5.build-v1"',
 'CONFIRM_TOKEN="INSTALL_VOID_V7_V5_RECEIPT_STAGE_V1_CREATE_ONLY"',
 'SOURCE_RECEIPT_BLOB="eddd0b47263213ae8dd65ef72a5479c40ea6812e"',
 'SOURCE_RECEIPT_SHA256="12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001"',
 'python_isolated_unoptimized_mode_required',
])assert.ok(receipt.includes(token),token);

for(const [key,val] of Object.entries(body.authority)){
  if(key==="plan_only")assert.equal(val,true,key);
  else assert.equal(val,false,key);
}
assert.equal(body.next_gate,
  "REVIEW_HARDENED_TRUSTED_ADMISSION_PLAN_V2_THEN_REBIND_STATIC_STAGE_ROOT_LAUNCHER_V2");

console.log(MARKER+"_PROOF_GREEN");
console.log("plan_id="+EXPECTED_PLAN_ID);
console.log("canonical_installer_generation_bound=true");
console.log("installer_python312_python313_green=true");
console.log("installer_boundary_hardening_bound=true");
console.log("source_stage_mode_0755_required=true");
console.log("source_internal_stage_build_v1_required=true");
console.log("predecessor_0555_tmp_v1_assumptions_rejected=true");
console.log("launcher_source_expected_generation_bound=true");
console.log("read_only_pair_qualifier_v2_required=true");
console.log("caller_path_authority=false");
console.log("root_execution_authorized=false");
console.log("source_stage_apply_authorized=false");
console.log("receipt_stage_apply_authorized=false");
console.log("fixed_source_exchange_authority=false");
console.log("fixed_receipt_exchange_authority=false");
console.log("service_mutation=false");
console.log("funds_movement=false");