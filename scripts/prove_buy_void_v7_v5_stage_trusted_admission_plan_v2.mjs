#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_V7_V5_STAGE_TRUSTED_ADMISSION_PLAN_V2";
const PARENT="ea2193709dab86ea3eb3c2235d08e8a6858a23c6";
const PARENT_TREE="07c2dd960c047d56d0c017825e4e389bcdc99342";
const PLAN="ops/security/buy-void-v7-v5-stage-trusted-admission-plan-v2.json";
const PLAN_BLOB="5669b393a87c2bfd584375e5cff2ef3f3ffdf5d9";
const EXPECTED_PLAN_ID="voidv7v5stageadmissionplan2_b85c582a6da03b80396ac58734d6634961df70d0ec76a0bafc52931dbb13fdbf";
const SELF="scripts/prove_buy_void_v7_v5_stage_trusted_admission_plan_v2.mjs";
const DOC="docs/architecture/buy-void-v7-v5-stage-trusted-admission-plan-v2.md";
const WORKFLOW=".github/workflows/buy-void-v7-v5-stage-trusted-admission-plan-v2.yml";
const OWNED=Object.freeze([WORKFLOW,DOC,PLAN,SELF].sort());

const BOUND=Object.freeze([
  ["ops/precision/void_buy_void_v7_v5_source_stage_install_v1.py","d88a9548ea34b8209ed7dcd53732fd25dd1371bf"],
  ["ops/precision/void_buy_void_v7_v5_receipt_stage_install_v1.py","b462696826b4f90fdf5f4938cd5467e5711addab"],
  ["scripts/prove_buy_void_v7_v5_source_stage_install_v1.py","5b8e98eec6712efd4846a564f689161fb054338f"],
  ["scripts/prove_buy_void_v7_v5_receipt_stage_install_v1.py","7d968740c9e0c787c57bd493e5c51f5ed385eed1"],
  [".github/workflows/buy-void-v7-v5-source-receipt-stage-install-v1.yml","af1a9afad2a39b96ee4022ba1b36ebf7534c818b"],
  ["ops/security/buy-void-v7-v5-source-receipt-stage-plan-v1.json","1ce5de6d4ffa0a89ead32ca734d43f0da72fed59"],
  ["ops/security/buy-void-source-finality-v7-deployment-receipt-v5.json","933e81f5d695eba57b969bf7da0d565be5198073"],
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
    const m=row.match(/^A\t(.+)$/u);
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
assert.equal(body.implementation_generation.focused_workflow_run,40025337175);
assert.equal(body.implementation_generation.python312_job,120659997274);
assert.equal(body.implementation_generation.python313_job,120659997568);

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
 'trusted_root_launcher_required=true',
])assert.ok(source.includes(token),token);

const receipt=fs.readFileSync(path.join(ROOT,"ops/precision/void_buy_void_v7_v5_receipt_stage_install_v1.py"),"utf8");
for(const token of [
 'TARGET=pathlib.Path("/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5")',
 'TEMP_NAME=".deployment-receipt.json.stage-v5.build-v1"',
 'CONFIRM_TOKEN="INSTALL_VOID_V7_V5_RECEIPT_STAGE_V1_CREATE_ONLY"',
 'SOURCE_RECEIPT_BLOB="933e81f5d695eba57b969bf7da0d565be5198073"',
 'SOURCE_RECEIPT_SHA256="2990e9bdef4793cc02f1dc0d502c1854f321f40202774e1e94939be9248efba6"',
])assert.ok(receipt.includes(token),token);

for(const [key,val] of Object.entries(body.authority)){
  if(key==="plan_only")assert.equal(val,true,key);
  else assert.equal(val,false,key);
}
assert.equal(body.next_gate,
  "REVIEW_TRUSTED_ADMISSION_PLAN_V2_THEN_IMPLEMENT_STATIC_STAGE_ROOT_LAUNCHER_V2_AND_READ_ONLY_PAIR_QUALIFIER_V2");

console.log(MARKER+"_PROOF_GREEN");
console.log("plan_id="+EXPECTED_PLAN_ID);
console.log("canonical_installer_generation_bound=true");
console.log("installer_python312_python313_green=true");
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
