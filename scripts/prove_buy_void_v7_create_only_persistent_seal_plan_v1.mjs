import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import os from "node:os";
import path from "node:path";

const PLAN_PATH="ops/security/buy-void-v7-create-only-persistent-seal-plan-v1.json";
const PLAN_ID="voidv7createonlysealplan1_80486c8e43751493d1480ebdf8be63a26195e465e96f3e1d29b1d7b4765773cc";
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
  "bootstrap_write_phase_must_remain_single_process_while_any_destination_writable_descriptor_is_live",
  "bootstrap_write_phase_must_begin_and_remain_single_threaded_while_any_destination_write_authority_exists",
  "preexisting_secondary_threads_must_be_absent_before_first_destination_writable_descriptor_or_mapping",
  "thread_pthread_clone3_and_equivalent_thread_creation_forbidden_while_any_destination_write_authority_exists",
  "io_uring_posix_aio_linux_aio_and_equivalent_asynchronous_destination_writes_forbidden",
  "publication_requires_no_inflight_kernel_retained_destination_write_request",
  "fork_clone_vfork_posix_spawn_and_helper_process_creation_forbidden_while_any_destination_writable_descriptor_is_live",
  "destination_writable_descriptor_inheritance_or_duplication_into_another_process_forbidden",
  "scm_rights_or_other_fd_passing_of_destination_writable_descriptors_forbidden",
  "uid_or_gid_drop_forbidden_while_any_destination_writable_descriptor_is_live",
  "installer_own_fd_table_census_is_not_sufficient_cross_process_containment_evidence",
  "forked_child_retained_destination_writable_fd_adversary_must_hold_before_publication",
  "installer_must_prove_its_own_fd_table_contains_no_writable_descriptor_to_staged_trusted_inodes_before_publication",
  "destination_inode_must_never_be_mapped_map_shared_with_prot_write",
  "writable_shared_mapping_of_destination_inode_must_never_be_inherited_by_descendant",
  "process_creation_forbidden_while_any_destination_writable_shared_mapping_exists",
  "destination_shared_writable_mapping_must_not_be_transferred_or_recreated_before_publication",
  "closed_destination_fd_and_read_only_mode_do_not_prove_absence_of_retained_writable_shared_mapping",
  "forked_child_retained_shared_writable_mapping_adversary_must_hold_before_publication",
  "trusted_files_must_be_reopened_read_only_nofollow_nonblocking_after_write_fd_close",
  "read_only_reopen_must_revalidate_dev_ino_owner_mode_nlink_size_and_sha256",
  "accepted_destination_size_and_sha256_must_equal_pre_copy_pinned_source_size_and_sha256_before_publication",
  "stage_tree_must_have_no_group_or_world_writable_ancestor_or_leaf",
  "ordinary_runtime_uid_must_have_no_write_authority_to_stage_or_final_tree",
  "same_uid_process_must_not_be_able_to_obtain_destination_write_descriptor_before_publication",
  "same_uid_source_stale_write_descriptor_adversary_required",
  "same_uid_source_mutation_after_authentication_must_not_produce_accepted_destination_bytes_different_from_pre_copy_pinned_size_and_sha256",
  "same_uid_post_publication_write_open_must_fail",
  "same_uid_retained_destination_write_descriptor_must_be_proven_impossible_by_fresh_inode_creation_and_private_stage",
  "publication_must_move_the_complete_closed_tree_with_same_filesystem_atomic_noreplace_semantics",
  "publication_must_use_kernel_atomic_noreplace_without_check_then_rename_authority",
  "publication_must_not_replace_or merge_with_existing_final_tree",
  "retained_final_parent_must_be_fsynced_after_publication",
  "crash_after_publish_before_parent_fsync_must_recover_by_revalidation_then_parent_fsync",
  "failure_before_publication_must_leave_only_root_private_non_authoritative_stage",
  "idempotent_existing_final_acceptance_requires_exact_receipt_inode_metadata_and_all_file_hashes",
  "mismatched_existing_final_tree_must_hold_without_repair_in_place",
  "durable_install_receipt_must_bind_installer_generation_source_generation_root_inode_and_every_trusted_payload_file_identity_excluding_receipt_self_hash",
  "install_receipt_inode_owner_mode_nlink_size_and_schema_must_be_verified_separately_without_self_hash_cycle",
  "every_published_trusted_payload_file_and_receipt_must_have_nlink_exactly_one",
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
  "host_capability_and_install_execution_require_separate_explicit_authorization",
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

function proveRetainedAuthorityControls(){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v7-seal-plan-"));
  try{
    const py=`import mmap, os, sys
root=sys.argv[1]
fd_path=os.path.join(root,"fd-adversary.bin")
fd=os.open(fd_path, os.O_RDWR|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC, 0o600)
os.write(fd,b"GOOD")
r,w=os.pipe(); pid=os.fork()
if pid==0:
    try:
        os.close(w); os.read(r,1); os.lseek(fd,0,os.SEEK_SET); os.write(fd,b"EDIT"); os.fsync(fd); os._exit(0)
    except BaseException: os._exit(7)
os.close(r); os.chmod(fd_path,0o400); os.close(fd); os.write(w,b"x"); os.close(w)
_,status=os.waitpid(pid,0)
assert os.waitstatus_to_exitcode(status)==0
assert open(fd_path,"rb").read()==b"EDIT"
print("child_retained_fd_wrote_after_parent_close=true")
map_path=os.path.join(root,"mmap-adversary.bin")
mfd=os.open(map_path, os.O_RDWR|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC, 0o600)
os.write(mfd,b"GOOD")
mm=mmap.mmap(mfd,4,flags=mmap.MAP_SHARED,prot=mmap.PROT_READ|mmap.PROT_WRITE)
r,w=os.pipe(); pid=os.fork()
if pid==0:
    try:
        os.close(w); os.read(r,1); mm[:]=b"EDIT"; mm.flush(); os._exit(0)
    except BaseException: os._exit(8)
os.close(r); os.chmod(map_path,0o400); os.close(mfd); os.write(w,b"x"); os.close(w)
_,status=os.waitpid(pid,0)
assert os.waitstatus_to_exitcode(status)==0
assert open(map_path,"rb").read()==b"EDIT"
mm.close()
print("child_retained_shared_mapping_wrote_after_fd_close=true")`;
    const out=execFileSync("/usr/bin/python3",["-I","-B","-c",py,temp],{
      encoding:"utf8",stdio:["ignore","pipe","pipe"],
      env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C"},timeout:5000,
    });
    assert.match(out,/^child_retained_fd_wrote_after_parent_close=true$/mu);
    assert.match(out,/^child_retained_shared_mapping_wrote_after_fd_close=true$/mu);
  }finally{ fs.rmSync(temp,{recursive:true,force:true}); }
}
proveRetainedAuthorityControls();
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
assert.equal(plan.threat_model.preexisting_secondary_thread_race,true);
assert.equal(plan.threat_model.kernel_retained_async_destination_write,true);
assert.equal(plan.candidate_alternative.name,"CREATE_ONLY_CLOSED_TREE_V1");
assert.equal(plan.candidate_alternative.kernel_cryptographic_verified_reads,false);
assert.equal(plan.candidate_alternative.single_process_write_phase_required,true);
assert.equal(plan.candidate_alternative.single_threaded_write_phase_required,true);
assert.equal(plan.candidate_alternative.asynchronous_destination_io_forbidden,true);
assert.equal(plan.candidate_alternative.destination_io_quiescence_before_publication_required,true);
assert.equal(plan.candidate_alternative.destination_write_fd_inheritance_or_transfer_forbidden,true);
assert.equal(plan.candidate_alternative.writable_shared_destination_mapping_forbidden,true);
assert.equal(plan.candidate_alternative.installer_own_fd_table_census_sufficient,false);
assert.deepEqual(plan.future_requirements,REQUIRED);
assert.equal(new Set(REQUIRED).size,REQUIRED.length);

for(const required of [
  "every_trusted_destination_inode_must_be_created_fresh_with_o_creat_o_excl_o_nofollow_o_cloexec",
  "all_destination_writable_descriptors_must_be_closed_before_publication",
  "accepted_destination_size_and_sha256_must_equal_pre_copy_pinned_source_size_and_sha256_before_publication",
  "same_uid_retained_destination_write_descriptor_must_be_proven_impossible_by_fresh_inode_creation_and_private_stage",
  "publication_must_move_the_complete_closed_tree_with_same_filesystem_atomic_noreplace_semantics",
  "publication_must_use_kernel_atomic_noreplace_without_check_then_rename_authority",
  "install_receipt_inode_owner_mode_nlink_size_and_schema_must_be_verified_separately_without_self_hash_cycle",
  "every_published_trusted_payload_file_and_receipt_must_have_nlink_exactly_one",
  "fs_immutable_fl_must_not_be_accepted_as_retained_handle_seal",
  "read_only_bind_mount_must_not_be_accepted_as_retained_handle_seal",
  "new_launcher_generation_required_for_alternative_seal_mode",
  "distinct_static_bootstrap_installer_required",
  "bootstrap_write_phase_must_begin_and_remain_single_threaded_while_any_destination_write_authority_exists",
  "preexisting_secondary_threads_must_be_absent_before_first_destination_writable_descriptor_or_mapping",
  "thread_pthread_clone3_and_equivalent_thread_creation_forbidden_while_any_destination_write_authority_exists",
  "io_uring_posix_aio_linux_aio_and_equivalent_asynchronous_destination_writes_forbidden",
  "publication_requires_no_inflight_kernel_retained_destination_write_request",
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
console.log("pinned_source_identity_must_equal_accepted_destination=true");
console.log("kernel_atomic_noreplace_required=true");
console.log("receipt_self_hash_cycle_forbidden=true");
console.log("published_payload_and_receipt_nlink_one_required=true");
console.log("single_process_destination_write_phase_required=true");
console.log("single_threaded_destination_write_phase_required=true");
console.log("preexisting_secondary_threads_forbidden=true");
console.log("async_destination_io_forbidden=true");
console.log("destination_io_quiescence_before_publication_required=true");
console.log("destination_write_fd_inheritance_or_transfer_forbidden=true");
console.log("scm_rights_destination_fd_passing_forbidden=true");
console.log("uid_drop_with_destination_write_fd_forbidden=true");
console.log("writable_shared_destination_mapping_forbidden=true");
console.log("installer_own_fd_table_census_sufficient=false");
console.log("retained_child_fd_adversary_demonstrated=true");
console.log("retained_child_shared_mapping_adversary_demonstrated=true");
console.log("new_launcher_generation_authorized=false");
console.log("bootstrap_installer_implementation_authorized=false");
console.log("host_capability_probe_authorized=false");
console.log("root_execution=false");
console.log("protected_filesystem_mutation=false");
console.log("launcher_install=false");
console.log("protected_v5_apply=false");
console.log("funds_movement=false");
