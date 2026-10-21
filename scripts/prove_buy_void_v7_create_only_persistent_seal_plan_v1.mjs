import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {execFileSync} from "node:child_process";

const PLAN_PATH="ops/security/buy-void-v7-create-only-persistent-seal-plan-v1.json";
const PLAN_ID="voidv7createonlysealplan1_792de040abebf3e158a6a591cd74478dc2ab3ba21a396b504a542af08594022c";
const SOURCE_BASE="0d93be0a7ae1395449a386d4fbe14bb680f51c3f";
const LAUNCHER="ops/precision/void_buy_void_v7_protected_substrate_root_launcher_v2.c";
const LAUNCHER_PROOF="scripts/prove_buy_void_v7_protected_substrate_root_launcher_v2.py";
const LAUNCHER_DOC="docs/operators/buy-void-v7-protected-substrate-root-launcher-v2.md";
const LAUNCHER_WORKFLOW=".github/workflows/buy-void-v7-protected-substrate-root-launcher-v2.yml";
const V5="ops/precision/void_buy_void_v7_protected_substrate_install_v5.py";
const QUALIFIER="ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v4.py";
const EXPECTED=Object.freeze({
  launcher:"0aa8d3a990de662b8c3c9928d4c31452d8299ca7",
  launcher_proof:"1c3503a9fe504559e22cdab9a2d423414be137dc",
  launcher_doc:"234074e8b9b635b35feddf460f1113a4520c59bd",
  launcher_workflow:"ac632f3236b5ddd6951cc3bdf4b4ed785795caf1",
  v5:"632f3371ad3095e6a8fdf338b24c34431abe7d2c",
  qualifier:"69b1ff028487a139470671cf0afb8937a299897d",
});
const REQUIRED=[
  "existing_launcher_v2_must_remain_unchanged",
  "new_launcher_generation_required_for_alternative_seal_mode",
  "distinct_static_bootstrap_installer_required",
  "final_launcher_root_must_be_absent_or_exact_prior_trusted_generation",
  "private_staging_root_must_be_created_under_retained_root_owned_parent",
  "private_staging_root_must_be_root_root_mode_0700_until_publication",
  "every_trusted_destination_inode_must_be_created_fresh_with_o_creat_o_excl_o_nofollow_o_cloexec",
  "preexisting_destination_inode_must_never_be_chowned_chmodded_adopted_or_overwritten",
  "source_inode_must_never_be_renamed_or_hardlinked_into_trusted_destination",
  "source_bytes_must_be_read_from_retained_nofollow_nonblocking_regular_file_descriptors",
  "source_size_and_sha256_must_be_exactly_pinned_before_copy",
  "destination_write_must_be_descriptor_relative_and_exact_length",
  "destination_file_must_be_fsynced_before_final_metadata",
  "destination_owner_must_be_root_root",
  "destination_final_mode_must_match_closed_policy",
  "destination_file_must_be_fsynced_after_final_metadata",
  "all_destination_writable_descriptors_must_be_closed_before_publication",
  "installer_must_prove_its_own_fd_table_contains_no_writable_descriptor_to_staged_trusted_inodes_before_publication",
  "trusted_files_must_be_reopened_read_only_nofollow_nonblocking_after_write_fd_close",
  "read_only_reopen_must_revalidate_dev_ino_owner_mode_nlink_size_and_sha256",
  "stage_tree_must_have_no_group_or_world_writable_ancestor_or_leaf",
  "ordinary_runtime_uid_must_have_no_write_authority_to_stage_or_final_tree",
  "same_uid_process_must_not_be_able_to_obtain_destination_write_descriptor_before_publication",
  "same_uid_source_stale_write_descriptor_adversary_required",
  "same_uid_source_mutation_after_authentication_must_not_change_copied_destination_bytes",
  "same_uid_post_publication_write_open_must_fail",
  "same_uid_retained_destination_write_descriptor_must_be_proven_impossible_by_fresh_inode_creation_and_private_stage",
  "publication_must_move_the_complete_closed_tree_with_same_filesystem_atomic_noreplace_semantics",
  "publication_must_not_replace_or merge_with_existing_final_tree",
  "retained_final_parent_must_be_fsynced_after_publication",
  "crash_after_publish_before_parent_fsync_must_recover_by_revalidation_then_parent_fsync",
  "failure_before_publication_must_leave_only_root_private_non_authoritative_stage",
  "idempotent_existing_final_acceptance_requires_exact_receipt_inode_metadata_and_all_file_hashes",
  "mismatched_existing_final_tree_must_hold_without_repair_in_place",
  "durable_install_receipt_must_bind_installer_generation_source_generation_root_inode_and_every_trusted_file_identity",
  "launcher_entry_must_reverify_receipt_bound_inodes_and_hashes_with_retained_descriptors",
  "launcher_entry_must_terminally_revalidate_visible_path_generation_before_exec",
  "launcher_v3_policy_must_select_exactly_one_reviewed_seal_mode",
  "fsverity_mode_may_remain_supported_where_kernel_capability_exists",
  "create_only_provenance_mode_must_not_claim_kernel_cryptographic_verified_reads",
  "fs_immutable_fl_must_not_be_accepted_as_retained_handle_seal",
  "read_only_bind_mount_must_not_be_accepted_as_retained_handle_seal",
  "ordinary_permission_chmod_or_chown_of_preexisting_inode_must_not_be_accepted_as_retained_handle_seal",
  "plain_hash_then_exec_on_pathname_backed_inode_must_not_be_accepted_as_retained_handle_seal",
  "bootstrap_installer_first_entry_trust_remains_separate_gate",
  "arbitrary_malicious_root_after_install_is_outside_this_alternative_seal_threat_model",
  "same_uid_and_unprivileged_retained_handle_adversary_is_inside_threat_model",
  "host_capability_and_install_execution_require_separate_explicit_authorization"
];

function canonical(v){
  if(Array.isArray(v)) return "["+v.map(canonical).join(",")+"]";
  if(v&&typeof v==="object"){
    return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
  }
  return JSON.stringify(v);
}
function sha256(s){return crypto.createHash("sha256").update(s).digest("hex");}
function git(...args){
  return execFileSync("/usr/bin/git",["-c","safe.directory=*","-C",".",...args],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_NO_LAZY_FETCH:"1",GIT_ALLOW_PROTOCOL:"",
    },
  }).trim();
}

const plan=JSON.parse(fs.readFileSync(PLAN_PATH,"utf8"));
const {plan_id,...withoutId}=plan;
assert.equal(plan_id,PLAN_ID);
assert.equal("voidv7createonlysealplan1_"+sha256(canonical(withoutId)),PLAN_ID);
assert.equal(plan.schema,"VOID_BUY_VOID_V7_CREATE_ONLY_PERSISTENT_SEAL_PLAN_V1");
assert.equal(plan.repository,"6ZoSo9/void-node");
assert.equal(plan.base_main,SOURCE_BASE);
assert.equal(git("merge-base",SOURCE_BASE,"HEAD"),SOURCE_BASE);

for(const [path,expected] of [
  [LAUNCHER,EXPECTED.launcher],
  [LAUNCHER_PROOF,EXPECTED.launcher_proof],
  [LAUNCHER_DOC,EXPECTED.launcher_doc],
  [LAUNCHER_WORKFLOW,EXPECTED.launcher_workflow],
  [V5,EXPECTED.v5],
  [QUALIFIER,EXPECTED.qualifier],
]){
  assert.equal(git("rev-parse","HEAD:"+path),expected,"source_tree_binding_drift:"+path);
  assert.equal(git("hash-object","--no-filters","--",path),expected,"source_visible_binding_drift:"+path);
}

assert.equal(plan.launcher_v2.source_blob,EXPECTED.launcher);
assert.equal(plan.launcher_v2.proof_blob,EXPECTED.launcher_proof);
assert.equal(plan.launcher_v2.doc_blob,EXPECTED.launcher_doc);
assert.equal(plan.launcher_v2.workflow_blob,EXPECTED.launcher_workflow);
assert.equal(plan.launcher_v2.fsverity_required,true);
assert.equal(plan.launcher_v2.alternative_seal_accepted,false);
assert.equal(plan.observed_host_hold.fs_ioc_measure_verity_result,"ENOTSUP");
assert.equal(plan.observed_host_hold.fsverity_host_readiness_established,false);
assert.equal(plan.candidate_alternative.name,"CREATE_ONLY_CLOSED_TREE_V1");
assert.equal(plan.candidate_alternative.kernel_cryptographic_verified_reads,false);
assert.deepEqual(plan.future_requirements,REQUIRED);
assert.equal(new Set(REQUIRED).size,REQUIRED.length);

for(const required of [
  "every_trusted_destination_inode_must_be_created_fresh_with_o_creat_o_excl_o_nofollow_o_cloexec",
  "all_destination_writable_descriptors_must_be_closed_before_publication",
  "same_uid_retained_destination_write_descriptor_must_be_proven_impossible_by_fresh_inode_creation_and_private_stage",
  "publication_must_move_the_complete_closed_tree_with_same_filesystem_atomic_noreplace_semantics",
  "fs_immutable_fl_must_not_be_accepted_as_retained_handle_seal",
  "read_only_bind_mount_must_not_be_accepted_as_retained_handle_seal",
  "new_launcher_generation_required_for_alternative_seal_mode",
  "distinct_static_bootstrap_installer_required",
]) assert.ok(REQUIRED.includes(required),required);

for(const key of [
  "launcher_v2_modified","new_launcher_generation_authorized",
  "bootstrap_installer_implementation_authorized","host_capability_probe_authorized",
  "root_execution","protected_filesystem_mutation","fsverity_enablement",
  "launcher_install","protected_v5_apply","service_mutation","credential_access",
  "signing","rpc_or_transaction","payment_acceptance","public_presale_activation",
  "wc_activation","treasury_or_liquidity_action","funds_movement",
]) assert.equal(plan.authority[key],false,key);
assert.equal(plan.authority.plan_only,true);
assert.equal(plan.next_gate,
  "DISTINCT_REVIEW_OF_ALTERNATIVE_SEAL_PLAN_BEFORE_NEW_LAUNCHER_OR_BOOTSTRAP_IMPLEMENTATION");

const launcherText=fs.readFileSync(LAUNCHER,"utf8");
for(const needle of [
  "fsverity_sha256_kernel_seal_required=true",
  "launcher_self_fsverity_required=true",
  "launcher_policy_fsverity_required=true",
  "installer_fsverity_required=true",
  "python_fsverity_required=true",
  "stdlib_zip_fsverity_required=true",
]) assert.ok(launcherText.includes(needle),needle);

console.log("VOID_BUY_VOID_V7_CREATE_ONLY_PERSISTENT_SEAL_PLAN_V1_PROOF_GREEN");
console.log("plan_id="+PLAN_ID);
console.log("future_requirement_count="+REQUIRED.length);
console.log("existing_launcher_v2_unchanged=true");
console.log("launcher_v2_alternative_seal_accepted=false");
console.log("fs_immutable_fl_accepted=false");
console.log("candidate_alternative_kernel_verified_reads=false");
console.log("new_launcher_generation_authorized=false");
console.log("bootstrap_installer_implementation_authorized=false");
console.log("host_capability_probe_authorized=false");
console.log("root_execution=false");
console.log("protected_filesystem_mutation=false");
console.log("launcher_install=false");
console.log("protected_v5_apply=false");
console.log("funds_movement=false");
