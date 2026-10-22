#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_V7_V5_STAGE_TRUSTED_ADMISSION_PLAN_V1";
const PARENT="5489b50be1e5631a6958d78afeb290f9d1b444bb";
const PLAN="ops/security/buy-void-v7-v5-stage-trusted-admission-plan-v1.json";
const PLAN_BLOB="c070bcf061c57a066a7c037d768888f8838448e3";
const SELF="scripts/prove_buy_void_v7_v5_stage_trusted_admission_plan_v1.mjs";
const DOC="docs/architecture/buy-void-v7-v5-stage-trusted-admission-plan-v1.md";
const WORKFLOW=".github/workflows/buy-void-v7-v5-stage-trusted-admission-plan-v1.yml";
const OWNED=Object.freeze([WORKFLOW,DOC,PLAN,SELF].sort());
const EXPECTED_ID="voidv7v5stageadmissionplan1_55bfe3c9e93159cefc69cb946dbb85e504fc225a93d832a8d13b21547328c9b2";

const BOUND=Object.freeze([
  ["ops/precision/void_v7_v5_source_stage_install_v1.py","1f251a8489e0b2a69683d991785cb4f46fa6dff5"],
  ["ops/precision/void_v7_v5_receipt_stage_install_v1.py","d719de6e8c4974a9356577ee16a9e68fa02b7ca0"],
  ["scripts/prove_void_v7_v5_source_receipt_stage_builders_v1.py","bba7841a9dea7082b05f03fccf90c7a0eeb3949e"],
  ["ops/security/buy-void-v7-v5-source-receipt-staging-plan-v1.json","37c6f5bd5753f05e57dde3c95f9c2f89c0abdc4d"],
]);

const sha256=s=>crypto.createHash("sha256").update(s,"utf8").digest("hex");
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
    "--no-replace-objects","-c","core.hooksPath=/dev/null","-c","core.fsmonitor=false",
    "-C",ROOT,...args,
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
function pin(relative,blob){
  assert.equal(git(["rev-parse","HEAD:"+relative]),blob,"blob_drift:"+relative);
  return fs.readFileSync(path.join(ROOT,relative),"utf8");
}
function scope(){
  git(["merge-base","--is-ancestor",PARENT,"HEAD"]);
  assert.equal(git(["merge-base",PARENT,"HEAD"]),PARENT);
  const rows=git(["diff","--name-status",PARENT,"HEAD","--"]).split(/\n/u).filter(Boolean);
  assert.equal(rows.length,4);
  const actual=rows.map(row=>{
    const m=row.match(/^A\t(.+)$/u);assert.ok(m,row);return m[1];
  }).sort();
  assert.deepEqual(actual,OWNED);
  git(["diff","--check",PARENT,"HEAD"]);
}
scope();
for(const [relative,blob] of BOUND)pin(relative,blob);
const value=JSON.parse(pin(PLAN,PLAN_BLOB));
const {plan_id,...body}=value;
assert.equal(plan_id,EXPECTED_ID);
assert.equal(plan_id,"voidv7v5stageadmissionplan1_"+sha256(canonical(body)));

assert.equal(body.implementation_generation.commit,PARENT);
assert.equal(body.implementation_generation.tree,"3b12eed28fe11a2b20f95ef185f56bd5e37677a1");
assert.equal(body.implementation_generation.focused_workflow_run,39822339296);
assert.equal(body.implementation_generation.focused_workflow_success,true);
assert.equal(body.closed_tree_precedent.seal_mode,"CREATE_ONLY_CLOSED_TREE_V1");
assert.equal(body.closed_tree_precedent.model_reused_not_modified,true);

assert.equal(body.future_closed_tree.fixed_root,
  "/opt/void-v7-v5-source-receipt-stage-closed-tree-v1");
assert.equal(body.future_closed_tree.complete_source_snapshot_required,true);
assert.equal(body.future_closed_tree.static_python_descriptor_execution_required,true);
assert.equal(body.future_closed_tree.minimal_fixed_environment_required,true);
assert.equal(body.future_closed_tree.stdin_devnull_required,true);
assert.equal(body.future_closed_tree.caller_environment_authority,false);
assert.equal(body.future_closed_tree.caller_path_authority,false);

assert.deepEqual(body.launcher_request_surface.operations,[
  "source-stage-plan","source-stage-apply","receipt-stage-plan","receipt-stage-apply",
]);
assert.deepEqual(body.launcher_request_surface.source_stage_plan_caller_arguments,[]);
assert.deepEqual(body.launcher_request_surface.receipt_stage_plan_caller_arguments,[]);
assert.deepEqual(body.launcher_request_surface.source_stage_apply_caller_arguments,[
  "expected_plan_id","explicit_source_stage_confirmation",
]);
assert.deepEqual(body.launcher_request_surface.receipt_stage_apply_caller_arguments,[
  "expected_plan_id","explicit_receipt_stage_confirmation",
]);
for(const key of [
  "filesystem_path_arguments_forbidden",
  "candidate_path_arguments_forbidden",
  "receipt_bytes_arguments_forbidden",
  "source_generation_arguments_forbidden",
  "exchange_operations_forbidden",
  "transition_journal_operations_forbidden",
  "consumer_fence_operations_forbidden",
  "service_operations_forbidden",
])assert.equal(body.launcher_request_surface[key],true,key);

assert.equal(body.stage_pair_qualification_contract.separate_read_only_qualifier_required,true);
assert.equal(body.stage_pair_qualification_contract.fixed_paths_only,true);
assert.equal(body.stage_pair_qualification_contract.pair_ready_output_grants_exchange_authority,false);
assert.equal(body.stage_pair_qualification_contract.pair_ready_output_grants_runtime_cutover_authority,false);

assert.equal(body.manifest_cycle_contract.production_payload_manifest_external_to_launcher_required,true);
assert.equal(body.manifest_cycle_contract.separate_manifest_acceptance_required,true);
assert.equal(body.manifest_cycle_contract.separate_bootstrap_install_authorization_required,true);
assert.equal(body.manifest_cycle_contract.separate_root_execution_authorization_required,true);
assert.equal(body.manifest_cycle_contract.stage_apply_authorizations_separate_from_launcher_install,true);

for(const [key,val] of Object.entries(body.authority)){
  if(key==="plan_only")assert.equal(val,true);
  else assert.equal(val,false,"authority_overclaim:"+key);
}

assert.equal(
  body.closed_tree_precedent.persistent_seal_plan_git_blob_sha1,
  "9dde5523dca6ab240626430ce1c2b82f1cfe7f20",
);
assert.equal(
  body.closed_tree_precedent.closed_tree_acceptance_git_blob_sha1,
  "919db72903a5fcff59dec7635a4288f41d1753d9",
);
assert.equal(
  body.closed_tree_precedent.bootstrap_source_git_blob_sha1,
  "2a8397c85d698d168f2257ec801557281b73c04d",
);
assert.equal(
  body.closed_tree_precedent.predecessor_root_launcher_v2_git_blob_sha1,
  "19b89e92df6f640c017cb9f544ddbf094d69f6eb",
);
assert.equal(
  body.closed_tree_precedent.predecessor_root_launcher_v2_proof_git_blob_sha1,
  "be8012e94c1d5d8f51b0162eb009ef16d6e81aaf",
);
console.log("historical_closed_tree_identities_plan_bound=true");
console.log("upstream_builder_exact_head_workflow_success_verified=true");

console.log(MARKER+"_PROOF_GREEN");
console.log("plan_id="+EXPECTED_ID);
console.log("closed_tree_precedent_bound=true");
console.log("complete_source_snapshot_required=true");
console.log("static_python_descriptor_execution_required=true");
console.log("minimal_fixed_environment_required=true");
console.log("caller_path_authority=false");
console.log("caller_source_generation_authority=false");
console.log("exchange_operations_forbidden=true");
console.log("stage_pair_read_only_qualifier_required=true");
console.log("production_manifest_external_required=true");
console.log("launcher_source_implementation_authorized=false");
console.log("launcher_install_authorized=false");
console.log("root_execution_authorized=false");
console.log("source_stage_apply_authorized=false");
console.log("receipt_stage_apply_authorized=false");
console.log("service_mutation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");