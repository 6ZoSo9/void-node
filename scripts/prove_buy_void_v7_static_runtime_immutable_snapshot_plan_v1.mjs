import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {execFileSync} from "node:child_process";

const PLAN_PATH="ops/security/buy-void-v7-static-runtime-immutable-snapshot-plan-v1.json";
const PLAN_ID="voidv7immutablesnapshot1_f259aabb2537a936f889a8256f4ac99493394cd340391e57f9609d389f0f6c15";
const PARENT_HEAD="4e43fd403996b6042aea58d810912dd87501bdce";
const PARENT_SOURCE="ops/precision/void_buy_void_v7_static_python_runtime_generation_proof_v1.py";
const PARENT_PROOF="scripts/prove_buy_void_v7_static_python_runtime_generation_proof_v1.py";
const PARENT_DOC="docs/operators/buy-void-v7-static-python-runtime-generation-proof-v1.md";
const PARENT_WORKFLOW=".github/workflows/buy-void-v7-static-python-runtime-generation-proof-v1.yml";
const V5="ops/precision/void_buy_void_v7_protected_substrate_install_v5.py";

const EXPECTED=Object.freeze({
  source:"54ca3a6d8cb2abe2941514f8025430c201d5e272",
  proof:"c20913cdb160e8fca0f366e45004a42ed0da86e7",
  doc:"25f7ff2a1d2b7084e10089590f1e5bee0cfb9ce6",
  workflow:"891c3b0cba04c9b97afb8539eeaeeb0e22db660e",
  v5:"632f3371ad3095e6a8fdf338b24c34431abe7d2c",
});

const REQUIRED=[
  "externally_supplied_python_exact_size_and_sha256_required",
  "externally_supplied_stdlib_exact_size_and_sha256_required",
  "python_execution_bytes_must_be_copied_to_sealable_anonymous_file_description",
  "stdlib_import_bytes_must_be_copied_to_sealable_anonymous_file_description",
  "python_snapshot_requires_f_seal_write_grow_shrink_seal",
  "stdlib_snapshot_requires_f_seal_write_grow_shrink_seal",
  "seal_set_must_be_verified_after_application",
  "pathname_backed_candidate_bytes_cannot_be_execution_authority",
  "python_exec_must_consume_the_exact_sealed_file_description",
  "stdlib_imports_must_consume_the_exact_sealed_file_description",
  "same_uid_sibling_mutation_adversary_required",
  "same_uid_sibling_write_truncate_and_replacement_must_not_change_executed_python_bytes",
  "same_uid_sibling_write_truncate_and_replacement_must_not_change_imported_stdlib_bytes",
  "parent_and_child_must_reverify_snapshot_digest_and_size_at_execution_boundary",
  "landlock_v3_filesystem_confinement_preserved",
  "seccomp_network_process_escape_denial_preserved",
  "no_new_privs_and_non_dumpable_execution_preserved",
  "python_isolated_safe_path_no_site_flags_preserved",
  "child_cpu_address_space_output_fd_and_process_limits_preserved",
  "exact_v5_self_test_from_sealed_source_descriptor_preserved",
  "ctypes_must_load_from_exact_sealed_stdlib_snapshot",
  "native_ctypes_must_remain_builtin",
  "renameat2_symbol_probe_preserved",
  "nonroot_identity_and_no_identity_transition_preserved",
  "candidate_runtime_receipt_must_bind_exact_python_stdlib_v5_and_parent_source_generation",
  "plan_ci_must_not_execute_external_candidate",
  "parent_independent_review_required_before_implementation_acceptance",
  "immutable_snapshot_implementation_requires_distinct_review",
  "persistent_host_content_seal_remains_separate_gate"
];

function canonical(value){
  if(Array.isArray(value)) return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"){
    return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
  }
  return JSON.stringify(value);
}
function sha256(text){
  return crypto.createHash("sha256").update(text).digest("hex");
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\\0","utf8"))
    .update(bytes).digest("hex");
}
function git(...args){
  return execFileSync("/usr/bin/git",["-c","safe.directory=*","-C",".",...args],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_NO_LAZY_FETCH:"1",
      GIT_ALLOW_PROTOCOL:"",
    },
  }).trim();
}

const plan=JSON.parse(fs.readFileSync(PLAN_PATH,"utf8"));
const {plan_id,...withoutId}=plan;
assert.equal(plan_id,PLAN_ID);
assert.equal("voidv7immutablesnapshot1_"+sha256(canonical(withoutId)),PLAN_ID);
assert.equal(plan.schema,"VOID_BUY_VOID_V7_STATIC_RUNTIME_IMMUTABLE_SNAPSHOT_PLAN_V1");
assert.equal(plan.repository,"6ZoSo9/void-node");
assert.equal(plan.base_parent_pr,3677);
assert.equal(plan.base_parent_head,PARENT_HEAD);
assert.equal(git("rev-parse","HEAD^"),PARENT_HEAD);

for(const [path,expected] of [
  [PARENT_SOURCE,EXPECTED.source],
  [PARENT_PROOF,EXPECTED.proof],
  [PARENT_DOC,EXPECTED.doc],
  [PARENT_WORKFLOW,EXPECTED.workflow],
  [V5,EXPECTED.v5],
]){
  assert.equal(gitBlob(fs.readFileSync(path)),expected,"source_binding_drift:"+path);
}

assert.equal(plan.parent_source_generation.runtime_proof_source_blob,EXPECTED.source);
assert.equal(plan.parent_source_generation.runtime_proof_proof_blob,EXPECTED.proof);
assert.equal(plan.parent_source_generation.runtime_proof_doc_blob,EXPECTED.doc);
assert.equal(plan.parent_source_generation.runtime_proof_workflow_blob,EXPECTED.workflow);
assert.equal(plan.parent_source_generation.independent_review_satisfied,false);
assert.equal(plan.landed_v5.git_blob,EXPECTED.v5);
assert.equal(plan.landed_v5.bytes,89416);
assert.equal(plan.landed_v5.sha256,"6a2c7de4fd55b2778cd7eb6c625d3b16cea068f9fbf9beb74adf2a04f433c14b");

assert.equal(plan.current_hold.reason,"candidate_execution_snapshot_not_same_uid_immutable");
assert.equal(plan.current_hold.candidate_execution,false);
assert.equal(plan.current_hold.runtime_closure_green,false);
assert.equal(plan.current_hold.persistent_content_seal_green,false);
assert.deepEqual(plan.future_requirements,REQUIRED);
assert.equal(new Set(plan.future_requirements).size,REQUIRED.length);

for(const key of [
  "candidate_execution_authorized",
  "implementation_authorized",
  "runtime_closure_acceptance_authorized",
  "root_execution",
  "protected_filesystem_mutation",
  "fsverity_enablement",
  "protected_host_install",
  "protected_v5_apply",
  "service_mutation",
  "credential_access",
  "signing",
  "rpc_or_transaction",
  "payment_acceptance",
  "public_presale_activation",
  "wc_activation",
  "treasury_or_liquidity_action",
  "funds_movement",
]) assert.equal(plan.authority[key],false,key);
assert.equal(plan.authority.plan_only,true);
assert.equal(
  plan.next_gate,
  "DISTINCTLY_REVIEW_PARENT_RUNTIME_PROOF_AND_THIS_PLAN_BEFORE_IMMUTABLE_SNAPSHOT_IMPLEMENTATION_V1",
);

const parentText=fs.readFileSync(PARENT_SOURCE,"utf8");
for(const needle of [
  "candidate_execution_snapshot_not_same_uid_immutable",
  "candidate_execution_sandbox_required=true",
  "landlock_v3_filesystem_confinement_required=true",
  "seccomp_network_process_escape_denial_required=true",
  "same_uid_immutable_runtime_snapshot_required=true",
]){
  assert.ok(parentText.includes(needle),needle);
}

console.log("VOID_BUY_VOID_V7_STATIC_RUNTIME_IMMUTABLE_SNAPSHOT_PLAN_V1_PROOF_GREEN");
console.log("plan_id="+PLAN_ID);
console.log("parent_head="+PARENT_HEAD);
console.log("future_requirement_count="+REQUIRED.length);
console.log("parent_independent_review_satisfied=false");
console.log("candidate_execution_authorized=false");
console.log("implementation_authorized=false");
console.log("runtime_closure_acceptance_authorized=false");
console.log("persistent_content_seal_green=false");
console.log("protected_host_install=false");
console.log("funds_movement=false");
