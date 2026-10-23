import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {execFileSync} from "node:child_process";

const PLAN_PATH="ops/security/buy-void-v7-static-rename-noreplace-bridge-plan-v1.json";
const DOC_PATH="docs/architecture/buy-void-v7-static-rename-noreplace-bridge-plan-v1.md";
const BASE="1d8c8804d75fa12e1fa9fcfffe7bc93940fbd56c";
const PLAN_ID="voidv7staticrenamenoreplacebridge1_651336b0d39ca60917fc03f441e7be835f6064574a99583bd0af3f3608a13598";
const V5="ops/precision/void_buy_void_v7_protected_substrate_install_v5.py";
const V5_BLOB="632f3371ad3095e6a8fdf338b24c34431abe7d2c";
const LAUNCHER="ops/precision/void_buy_void_v7_protected_substrate_root_launcher_v2.c";
const LAUNCHER_BLOB="0aa8d3a990de662b8c3c9928d4c31452d8299ca7";

const REQUIRED=[
  "versioned_v6_installer_required_v5_unchanged",
  "v6_must_not_import_ctypes",
  "v6_must_not_use_cdll_dlopen_dlsym_or_dynamic_host_libc_for_rename",
  "statically_integrated_cpython_builtin_module_required",
  "builtin_module_must_not_be_extension_dso_or_path_import",
  "builtin_module_exposes_only_rename_noreplace_operation",
  "rename_operation_uses_syscall_sys_renameat2_directly",
  "rename_flags_exactly_rename_noreplace",
  "parent_fd_must_be_nonnegative_integer_and_fstat_directory",
  "source_and_target_parent_fd_must_be_the_same_retained_directory_fd",
  "old_and_new_names_must_be_python_str_ascii_single_leaf_1_to_255_bytes",
  "old_and_new_names_must_be_nonempty_no_nul_no_slash_not_dot_not_dotdot",
  "old_and_new_names_must_be_distinct",
  "no_fallback_to_os_rename_link_unlink_shell_external_binary_or_dynamic_loader",
  "bridge_returns_none_on_success_and_raises_oserror_with_kernel_errno_on_failure",
  "v6_wrapper_must_normalize_bridge_oserror_errno_to_existing_installerror_reason_shape",
  "existing_destination_file_symlink_or_directory_must_fail_without_replacement",
  "failed_no_replace_must_leave_source_and_existing_destination_generations_unchanged",
  "successful_publication_must_preserve_v5_publication_before_fsync_truth",
  "successful_publication_must_preserve_parent_fsync",
  "v5_failure_and_partial_publication_receipt_semantics_preserved",
  "v5_install_parent_descriptor_identity_and_generation_checks_preserved",
  "v5_source_replica_live_shallow_cross_binding_and_candidate_identity_contracts_preserved",
  "v6_plan_schema_prefix_and_confirmation_token_must_be_new",
  "v6_self_test_must_exercise_fresh_file_fresh_directory_and_existing_file_symlink_directory_rejections",
  "v6_self_test_must_exercise_invalid_fd_invalid_leaf_same_leaf_and_missing_source_rejections",
  "v6_self_test_must_verify_builtin_bridge_identity_without_ctypes",
  "runtime_proof_successor_must_bind_v6_and_builtin_bridge",
  "runtime_proof_successor_must_not_require_ctypes_or_libffi_for_rename_noreplace",
  "static_python_candidate_must_list_bridge_in_sys_builtin_module_names",
  "static_python_candidate_must_remain_et_exec_without_pt_interp_or_pt_dynamic",
  "immutable_snapshot_same_uid_resistance_gate_remains_separate_and_required",
  "persistent_host_content_seal_gate_remains_separate_and_required",
  "new_trusted_root_launcher_generation_required_because_launcher_v2_pins_v5",
  "installed_qualification_successor_must_bind_v6_source_generation",
  "source_ci_must_prove_semantic_delta_allowlist_from_v5_to_v6",
  "direct_syscall_bridge_requires_x86_64_linux_sys_renameat2_compile_time_binding",
  "unsupported_kernel_or_syscall_must_hold_without_fallback",
  "implementation_requires_distinct_independent_review",
  "host_install_and_v6_apply_require_separate_lifecycle_authorization",
];

function canonical(value){
  if(Array.isArray(value)) return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"){
    return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonical(value[k])).join(",")+"}";
  }
  return JSON.stringify(value);
}
function sha256(raw){return crypto.createHash("sha256").update(raw).digest("hex");}
function git(...args){
  return execFileSync("/usr/bin/git",["-c","safe.directory=*","-C",".",...args],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    env:{
      PATH:"/usr/bin:/bin", HOME:"/nonexistent", LANG:"C", LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1", GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null", GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0", GIT_NO_REPLACE_OBJECTS:"1",
      GIT_NO_LAZY_FETCH:"1", GIT_ALLOW_PROTOCOL:"",
    },
  }).trim();
}

const plan=JSON.parse(fs.readFileSync(PLAN_PATH,"utf8"));
const {plan_id,...withoutId}=plan;
assert.equal(plan_id,PLAN_ID);
assert.equal("voidv7staticrenamenoreplacebridge1_"+sha256(canonical(withoutId)),PLAN_ID);
assert.equal(plan.schema,"VOID_BUY_VOID_V7_STATIC_RENAME_NOREPLACE_BRIDGE_PLAN_V1");
assert.equal(plan.repository,"6ZoSo9/void-node");
assert.equal(plan.base_main,BASE);
assert.equal(git("merge-base",BASE,"HEAD"),BASE);

for(const [path,expected] of [[V5,V5_BLOB],[LAUNCHER,LAUNCHER_BLOB]]){
  assert.equal(git("rev-parse","HEAD:"+path),expected,"tree_binding_drift:"+path);
  assert.equal(git("hash-object","--no-filters","--",path),expected,"visible_binding_drift:"+path);
}

const v5=fs.readFileSync(V5,"utf8");
assert.match(v5,/^import ctypes$/m);
assert.ok(v5.includes('RENAME_NOREPLACE = 1'));
assert.ok(v5.includes('ctypes.CDLL(None, use_errno=True)'));
assert.ok(v5.includes('getattr(libc, "renameat2", None)'));
assert.ok(v5.includes('getattr(ctypes.CDLL(None), "renameat2", None)'));

const launcher=fs.readFileSync(LAUNCHER,"utf8");
for(const needle of [
  "ET_EXEC",
  "PT_INTERP",
  "PT_DYNAMIC",
  "python3.12-static",
  "dynamic_python_runtime_forbidden",
]) assert.ok(launcher.includes(needle),needle);

assert.equal(plan.landed_v5.git_blob,V5_BLOB);
assert.equal(plan.landed_v5.observed_contract.ctypes_import,true);
assert.equal(plan.landed_v5.observed_contract.cdll_none_renameat2_lookup,true);
assert.equal(plan.landed_v5.observed_contract.rename_noreplace_flag,1);
assert.equal(plan.landed_launcher_v2.git_blob,LAUNCHER_BLOB);
assert.equal(plan.landed_launcher_v2.static_et_exec_required,true);
assert.equal(plan.landed_launcher_v2.pt_interp_forbidden,true);
assert.equal(plan.landed_launcher_v2.pt_dynamic_forbidden,true);

assert.equal(plan.precision_feasibility_evidence.dlsym_renameat2_resolved,false);
assert.equal(plan.precision_feasibility_evidence.disposition,"STATIC_PYTHON_V5_RENAMEAT2_COMPAT_HOLD");
assert.equal(plan.precision_feasibility_evidence.evidence_authority,"operator_receipt_not_release_authority");

assert.deepEqual(plan.future_requirements,REQUIRED);
assert.equal(new Set(plan.future_requirements).size,REQUIRED.length);

assert.equal(plan.authority.plan_only,true);
for(const key of [
  "v6_implementation_authorized",
  "builtin_bridge_implementation_authorized",
  "runtime_candidate_execution_authorized",
  "root_execution",
  "package_installation",
  "protected_filesystem_mutation",
  "persistent_seal_installation",
  "fsverity_enablement",
  "protected_v6_apply",
  "service_or_systemd_mutation",
  "credential_or_key_access",
  "signing",
  "rpc_or_transaction",
  "payment_acceptance",
  "public_presale_activation",
  "wc_activation",
  "treasury_or_liquidity_action",
  "funds_movement",
]) assert.equal(plan.authority[key],false,key);

assert.equal(
  plan.next_gate,
  "DISTINCTLY_REVIEW_STATIC_RENAME_NOREPLACE_BRIDGE_PLAN_BEFORE_V6_IMPLEMENTATION",
);

const doc=fs.readFileSync(DOC_PATH,"utf8");
for(const needle of [
  "V5 remains unchanged.",
  "SYS_renameat2",
  "RENAME_NOREPLACE",
  "non-negative integer `parent_fd`",
  "1–255 bytes",
  "old_leaf != new_leaf",
  "raise `OSError` carrying the kernel errno",
  "InstallError(\"rename_noreplace_failed:<errno>\")",
  "sys.builtin_module_names",
  "no longer require `ctypes` or `libffi`",
  "immutable-snapshot same-UID resistance gate",
  "persistent host content-seal gate",
  "DISTINCTLY_REVIEW_STATIC_RENAME_NOREPLACE_BRIDGE_PLAN_BEFORE_V6_IMPLEMENTATION",
]) assert.ok(doc.includes(needle),needle);

console.log("VOID_BUY_VOID_V7_STATIC_RENAME_NOREPLACE_BRIDGE_PLAN_V1_PROOF_GREEN");
console.log("plan_id="+PLAN_ID);
console.log("base_main="+BASE);
console.log("v5_blob="+V5_BLOB);
console.log("launcher_v2_blob="+LAUNCHER_BLOB);
console.log("future_requirement_count="+REQUIRED.length);
console.log("precision_feasibility_evidence_authority=diagnostic_only");
console.log("v6_implementation_authorized=false");
console.log("runtime_candidate_execution_authorized=false");
console.log("protected_filesystem_mutation=false");
console.log("protected_v6_apply=false");
console.log("funds_movement=false");
