#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  canonicalApollyonClaimContractJsonV1,
} from "../tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2,
} from "../tools/apollyon-live-source-session-terminal-receipt-v2.mjs";
import {
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_CONTINUITY_RECEIPT_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_DANGEROUS_ENVIRONMENT_NAMES_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_FAILURE_RESPONSE_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_PUBLISHER_LEAST_AUTHORITY_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_LEAST_AUTHORITY_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_SYSTEMD_REQUIREMENTS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SOCKET_REQUIREMENTS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_AUTHORITY_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_POLICY_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SUCCESS_RESPONSE_KEYS_V2,
  qualifyApollyonDurableAttemptClaimFailureResponseShapeV2,
  qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2,
  qualifyApollyonDurableAttemptClaimPublisherLeastAuthorityV2,
  qualifyApollyonDurableAttemptClaimRecordShapeV2,
  qualifyApollyonDurableAttemptClaimServiceLeastAuthorityV2,
  qualifyApollyonDurableAttemptClaimStoreContractV2,
  qualifyApollyonDurableAttemptClaimStorePolicyV2,
  qualifyApollyonDurableAttemptClaimSuccessResponseShapeV2,
} from "../tools/apollyon-durable-attempt-claim-store-contract-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs":
    "974a383f4904b6b223a2143d5f7a19322f3d1f66",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
    "5ee36c89275c29b008094ad030b8664ed9d7b60b",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs":
    "bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

function terminalReceipt(){
  const material={
    marker:"VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_V2",
    version:2,
    status:"live_source_session_terminal_shutdown_qualified_unclaimed",
    target_host:"Xiphos",
    runner_v2_blob_sha1:"8c2c92055ab05c074653cee971e095934b5cb85c",
    binding_v2_blob_sha1:"5ee36c89275c29b008094ad030b8664ed9d7b60b",
    live_binding_id:"apollyon_live_binding_v2:"+"1".repeat(64),
    claim_contract_id:"apollyon_claim_contract_v2:"+"2".repeat(64),
    preclaim_id:"apollyon_preclaim_v2:"+"3".repeat(64),
    current_v2_live_qualification_id:"apollyon_custody_live_v2:"+"4".repeat(64),
    installed_isolation_qualification_id:"apollyon_training_isolation_live_v1:"+"5".repeat(64),
    authorization_id:"apollyon_authz_v1:"+"6".repeat(64),
    custody_generation_id:"apollyon_custody_generation_v1:"+"7".repeat(64),
    custody_record_sha256:"8".repeat(64),
    request_sha256:"9".repeat(64),
    canonical_main:"a".repeat(40),
    canonical_tree:"b".repeat(40),
    corpus_sha256:"c".repeat(64),
    parent_adapter_sha256:"d".repeat(64),
    operator_public_key_raw_sha256:"e".repeat(64),
    state_root_identity_sha256:"f".repeat(64),
    consumed_directory_identity_sha256:"1".repeat(64),
    socket_identity_sha256:"2".repeat(64),
    service_process_identity_sha256:"3".repeat(64),
    loader_environment_clean:true,
    live_service_source_identity_proven:true,
    same_live_custody_session_binding_proven:true,
    terminal_runner_receipt_sha256:"4".repeat(64),
    training_pid:4242,
    training_process_start_time_ticks:"123456",
    boot_id_sha256:"5".repeat(64),
    terminal_shutdown_evidence_shape_qualified:true,
    terminal_shutdown_authority_proven:false,
    training_service_exact_dormant_after:true,
    training_generation_absent_after:true,
    inner_live_binding_alone_sufficient_for_executor:false,
    current_host_revalidation_required:true,
    revalidation_identity_hashes_carried:true,
    terminal_runner_receipt_digest_carried:true,
    protected_runner_origin_required:true,
    protected_runner_origin_proven:false,
    live_host_observation_performed:false,
    durable_attempt_claim_required:true,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    next_gate:"durable_candidate_training_attempt_claim_executor_v2",
  };
  return {
    ...material,
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
    authority:structuredClone(
      VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2,
    ),
  };
}

const t=terminalReceipt();
const policy=qualifyApollyonDurableAttemptClaimStorePolicyV2();
assert.equal(policy.marker,VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_POLICY_V2);
assert.match(policy.store_policy_id,/^apollyon_claim_store_policy_v2:[0-9a-f]{64}$/u);
const result=qualifyApollyonDurableAttemptClaimStoreContractV2({
  terminal_receipt:t,
});
assert.equal(result.status,"protected_attempt_claim_store_requirements_defined_uninstalled");
assert.equal(result.store_policy_id,policy.store_policy_id);
assert.equal(result.terminal_receipt_id,t.terminal_receipt_id);
assert.equal(result.custody_generation_id,t.custody_generation_id);
assert.equal(result.custody_record_sha256,t.custody_record_sha256);
assert.equal(result.terminal_receipt_shape_bound,true);
assert.equal(result.terminal_receipt_source_origin_proven,false);
assert.equal(result.protected_runner_origin_required,true);
assert.equal(result.protected_runner_origin_proven,false);
assert.equal(result.current_host_revalidation_required,true);
assert.equal(result.current_host_revalidation_performed,false);
assert.equal(result.exact_v2_custody_record_revalidation_required,true);
assert.equal(result.exact_v2_custody_record_revalidation_performed,false);
assert.equal(result.exact_v2_custody_generation_revalidation_required,true);
assert.equal(result.exact_v2_custody_generation_revalidation_performed,false);
assert.equal(result.protected_claim_store_required,true);
assert.equal(result.protected_claim_store_proven,false);
assert.equal(result.claim_identity_bound,false);
assert.equal(result.claim_root_bound,false);
assert.equal(result.host_installation_performed,false);
assert.equal(result.durable_attempt_claim_performed,false);
assert.equal(result.attempt_claim_authorized,false);
assert.equal(result.attempt_claimed,false);
assert.equal(result.training_execution_authorized,false);
assert.equal(result.training_execution_performed,false);
assert.equal(result.candidate_weight_mutation_performed,false);
assert.equal(result.next_gate,"apollyon_durable_attempt_claim_store_host_qualification_v2");
assert.equal(
  result.executor_gate_after_host_qualification,
  "durable_candidate_training_attempt_claim_executor_v2",
);
assert.match(result.store_contract_id,/^apollyon_claim_store_contract_v2:[0-9a-f]{64}$/u);
assert.match(result.store_policy_id,/^apollyon_claim_store_policy_v2:[0-9a-f]{64}$/u);
{
  const alternate=terminalReceipt();
  const material=structuredClone(alternate);
  delete material.terminal_receipt_id;
  delete material.authority;
  material.authorization_id="apollyon_authz_v1:"+"f".repeat(64);
  material.custody_generation_id="apollyon_custody_generation_v1:"+"e".repeat(64);
  material.custody_record_sha256="d".repeat(64);
  material.request_sha256="c".repeat(64);
  const alt={
    ...material,
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
    authority:structuredClone(
      VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2,
    ),
  };
  const altResult=qualifyApollyonDurableAttemptClaimStoreContractV2({
    terminal_receipt:alt,
  });
  assert.equal(altResult.store_policy_id,result.store_policy_id);
  assert.notEqual(altResult.store_contract_id,result.store_contract_id);
}
assert.deepEqual(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_KEYS_V2,
  ["claim_record","marker","method","store_contract_id","store_policy_id","version"],
);

assert.deepEqual(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_KEYS_V2,
  [
    "attempt_limit","authorization_id","automatic_retry_authorized",
    "canonical_main","canonical_tree","claim_record_id","corpus_sha256",
    "custody_generation_id","custody_record_sha256","marker",
    "operator_public_key_raw_sha256","parent_adapter_sha256","request_sha256",
    "status","store_contract_id","store_generation_id","store_policy_id","terminal_receipt_id",
    "terminal_runner_receipt_sha256","version",
  ],
);
assert.deepEqual(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SUCCESS_RESPONSE_KEYS_V2,
  [
    "authorization_id","claim_record_id","claim_record_sha256","custody_generation_id",
    "durability_proven","final_visible_record_revalidated","marker","outcome",
    "publish_request_sha256","status","store_contract_id","store_generation_id",
    "store_policy_id","terminal_receipt_id","training_start_admission","training_start_consumption_performed",
    "training_start_consumption_required","next_gate","version",
  ],
);
assert.deepEqual(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_FAILURE_RESPONSE_KEYS_V2,
  [
    "authorization_id","durability_proven","marker","publish_request_sha256","reason",
    "status","store_contract_id","store_generation_id","store_policy_id","terminal_receipt_id",
    "training_start_admission","version",
  ],
);
assert.deepEqual(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
  [
    "claim_history_count","claim_history_sha256","continuity_receipt_id",
    "generation_lineage_count","generation_lineage_sha256","genesis",
    "marker","predecessor_store_generation_id","root_identity_sha256","status",
    "store_generation_id","store_generation_record_id","store_policy_id","version",
  ],
);
assert.deepEqual(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_CONTINUITY_RECEIPT_KEYS_V2,
  [
    "claim_set_order","continuity_receipt_id","fresh_authorization_id",
    "generation_lineage_order","genesis","marker",
    "new_generation_lineage_count","new_generation_lineage_sha256",
    "new_root_identity_sha256","new_store_generation_id",
    "old_root_identity_sha256","old_store_generation_id",
    "prior_generation_lineage_count","prior_generation_lineage_sha256",
    "predecessor_generation_record_id","prior_claim_count","prior_claim_set_sha256",
    "status","store_policy_id","version",
  ],
);
assert.equal(VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_SYSTEMD_REQUIREMENTS_V2.umask,"0077");
assert.equal(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_SYSTEMD_REQUIREMENTS_V2.protect_system,
  "strict",
);
assert.deepEqual(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_SYSTEMD_REQUIREMENTS_V2.restrict_address_families_exact,
  ["AF_UNIX"],
);
assert.deepEqual(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_SYSTEMD_REQUIREMENTS_V2.read_write_target_roles_exact,
  ["claim_state_root","claim_socket_parent"],
);
assert.equal(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SOCKET_REQUIREMENTS_V2.client_server_auth_before_request_body_required,
  true,
);

for(const [key,expected] of Object.entries({
  dedicated_claim_service_identity_required:true,
  claim_service_non_root_uid_required:true,
  claim_service_non_root_gid_required:true,
  claim_service_numeric_uid_distinct_from_training_required:true,
  claim_service_numeric_uid_distinct_from_custody_required:true,
  claim_service_numeric_uid_distinct_from_public_runtime_required:true,
  claim_service_numeric_uid_distinct_from_interactive_operator_required:true,
  claim_service_numeric_gid_distinct_from_training_required:true,
  claim_service_numeric_gid_distinct_from_custody_required:true,
  claim_service_numeric_gid_distinct_from_public_runtime_required:true,
  claim_service_numeric_gid_distinct_from_interactive_operator_required:true,
  claim_service_no_new_privileges_required:true,
  claim_service_inheritable_capabilities_empty_required:true,
  claim_service_permitted_capabilities_empty_required:true,
  claim_service_effective_capabilities_empty_required:true,
  claim_service_bounding_capabilities_empty_required:true,
  claim_service_ambient_capabilities_empty_required:true,
  claim_identity_distinct_from_training_required:true,
  claim_identity_distinct_from_custody_required:true,
  claim_identity_distinct_from_public_runtime_required:true,
  claim_identity_distinct_from_interactive_operator_required:true,
  claim_identity_supplementary_groups_closed_required:true,
  claim_uid_only_reviewed_service_required:true,
  claim_service_source_identity_required:true,
  non_claim_unprivileged_uid_write_denied_required:true,
  claim_service_training_state_write_denied_required:true,
  claim_service_custody_state_write_denied_required:true,
  claim_service_training_service_control_denied_required:true,
  claim_service_custody_service_control_denied_required:true,
  claim_service_delete_or_overwrite_api_forbidden:true,
  future_identity_must_be_versioned_and_fixed_before_install:true,
  future_claim_root_must_be_versioned_and_fixed_before_install:true,
  persistent_store_policy_identity_required:true,
  store_policy_id_terminal_independent_required:true,
  store_contract_id_per_admission_required:true,
  claim_store_generation_identity_required:true,
  claim_store_generation_create_once_required:true,
  same_path_replacement_must_be_new_generation_required:true,
  authorization_binding_to_claim_store_generation_required:true,
  old_terminal_receipt_reuse_across_store_generation_forbidden:true,
  new_store_generation_requires_fresh_authorization_required:true,
  cross_generation_authorization_replay_rejected_required:true,
  store_generation_change_blocks_claim_publication_until_requalified_required:true,
  prior_claim_history_continuity_required_for_store_migration:true,
  store_generation_record_exact_schema_required:true,
  store_generation_record_content_addressed_id_required:true,
  store_generation_record_bind_store_policy_id_required:true,
  migration_continuity_receipt_exact_schema_required:true,
  migration_continuity_receipt_bind_store_policy_id_required:true,
  migration_continuity_binds_predecessor_generation_record_id_required:true,
  migration_old_new_generation_cross_binding_required:true,
  migration_complete_prior_claim_count_required:true,
  migration_complete_prior_claim_set_sha256_required:true,
  migration_every_prior_claim_exact_schema_and_hash_required:true,
  fresh_authorization_binds_new_generation_and_prior_history_digest_required:true,
  genesis_zero_history_shape_distinct_from_migration_required:true,
  claim_store_generation_replacement_without_retained_history_is_permanent_hold_required:true,
  fresh_sovereign_rebootstrap_required_for_new_store_generation:true,
  protected_root_mode:"0700",
  immutable_claim_record_mode:"0600",
  final_claim_record_link_count:1,
  root_ancestor_custody_required:true,
  training_uid_write_denied_required:true,
  custody_uid_write_denied_required:true,
  training_uid_service_control_denied_required:true,
  custody_uid_service_control_denied_required:true,
  claim_service_af_unix_only_required:true,
  dedicated_claim_ipc_group_required:true,
  claim_ipc_group_exact_members_required:true,
  training_uid_claim_ipc_membership_forbidden:true,
  custody_uid_claim_ipc_membership_forbidden:true,
  public_runtime_claim_ipc_membership_forbidden:true,
  claim_request_caller_identity_must_be_versioned_and_fixed_before_install:true,
  dedicated_claim_publisher_identity_required:true,
  claim_publisher_non_root_uid_gid_required:true,
  claim_publisher_no_new_privileges_required:true,
  claim_publisher_all_capability_sets_empty_required:true,
  claim_publisher_numeric_identity_separation_required:true,
  claim_publisher_supplementary_groups_closed_required:true,
  claim_publisher_claim_ipc_membership_exact_required:true,
  claim_publisher_process_exclusivity_revalidation_required:true,
  claim_publisher_source_identity_revalidation_required:true,
  claim_publisher_direct_claim_root_write_denied_required:true,
  claim_publisher_direct_claim_root_rename_unlink_denied_required:true,
  claim_publisher_claim_service_control_denied_required:true,
  claim_request_kernel_peer_credentials_required:true,
  claim_request_no_caller_supplied_identity_trust:true,
  claim_request_exact_caller_uid_gid_required:true,
  claim_request_peer_pid_generation_revalidation_required:true,
  claim_request_caller_process_source_identity_required:true,
  claim_request_root_not_implicitly_authorized:true,
  claim_request_unauthorized_peer_rejected_before_body_read_required:true,
  claim_request_closed_method_set_required:true,
  claim_request_method:"publish_claim_v2",
  claim_request_exact_key_schema_required:true,
  claim_request_exact_keys:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_KEYS_V2,
  claim_request_unknown_keys_rejected_required:true,
  claim_request_canonical_encoding_required:true,
  claim_request_one_request_per_connection_required:true,
  claim_request_max_bytes:65536,
  claim_request_timeout_ms:5000,
  claim_response_max_bytes:65536,
  claim_service_max_concurrent_connections:16,
  claim_service_socket_backlog_bound_required:true,
  claim_service_systemd_sandbox_exact_required:true,
  claim_service_exact_writable_target_roles_required:true,
  claim_service_no_extra_writable_paths_required:true,
  claim_service_loaded_fragment_dropin_reload_exec_closure_required:true,
  claim_socket_namespace_exact_required:true,
  claim_client_authenticates_server_before_body_required:true,
  claim_client_server_process_and_socket_stability_required:true,
  claim_service_network_access_forbidden:true,
  claim_service_private_key_access_forbidden:true,
  claim_service_signing_forbidden:true,
  exact_terminal_receipt_revalidation_required:true,
  protected_runner_origin_proof_required:true,
  current_host_revalidation_required:true,
  complete_claim_boundary_revalidation_immediately_before_publication_required:true,
  claim_uid_process_exclusivity_revalidation_immediately_before_publication_required:true,
  claim_service_source_identity_revalidation_immediately_before_publication_required:true,
  claim_service_supplementary_groups_revalidation_immediately_before_publication_required:true,
  claim_service_effective_policy_revalidation_immediately_before_publication_required:true,
  claim_service_numeric_identity_revalidation_immediately_before_publication_required:true,
  claim_service_no_new_privileges_revalidation_immediately_before_publication_required:true,
  claim_service_capability_sets_revalidation_immediately_before_publication_required:true,
  claim_store_generation_revalidation_immediately_before_publication_required:true,
  claim_store_root_identity_revalidation_immediately_before_publication_required:true,
  claim_write_authority_revalidation_immediately_before_publication_required:true,
  claim_service_control_denials_revalidation_immediately_before_publication_required:true,
  training_service_exact_dormancy_revalidation_required:true,
  training_generation_absence_revalidation_required:true,
  custody_state_root_identity_revalidation_required:true,
  custody_consumed_directory_identity_revalidation_required:true,
  custody_socket_identity_revalidation_required:true,
  custody_service_process_identity_revalidation_required:true,
  exact_v2_custody_record_revalidation_required:true,
  exact_v2_custody_generation_revalidation_required:true,
  create_only_no_overwrite_claim_publication_required:true,
  canonical_claim_record_required:true,
  claim_record_exact_key_schema_required:true,
  claim_record_unknown_keys_rejected_required:true,
  claim_record_content_addressed_id_required:true,
  claim_record_automatic_retry_authorized_literal_false_required:true,
  claim_success_response_exact_schema_required:true,
  claim_success_response_unknown_keys_rejected_required:true,
  claim_failure_response_exact_schema_required:true,
  claim_failure_response_unknown_keys_rejected_required:true,
  claim_success_ack_only_after_file_fsync_required:true,
  claim_success_ack_only_after_directory_fsync_required:true,
  claim_success_ack_only_after_final_visible_record_revalidation_required:true,
  indeterminate_publication_must_not_return_success_required:true,
  claim_success_is_not_training_start_admission_required:true,
  separate_one_time_training_start_consumption_required:true,
  training_start_consumption_create_once_required:true,
  training_start_consumption_binds_claim_record_authorization_custody_store_generation_and_trainer_generation_required:true,
  training_start_recovery_distinguishes_unconsumed_vs_consumed_required:true,
  replayed_claim_success_after_start_consumption_rejected_required:true,
  socket_close_or_generic_ok_never_training_admission_required:true,
  claim_record_bind_store_generation_id_required:true,
  claim_record_bind_terminal_receipt_id_required:true,
  claim_record_bind_terminal_runner_receipt_sha256_required:true,
  claim_record_bind_authorization_id_required:true,
  claim_record_bind_custody_generation_id_required:true,
  claim_record_bind_custody_record_sha256_required:true,
  claim_record_bind_request_sha256_required:true,
  claim_record_bind_canonical_main_required:true,
  claim_record_bind_canonical_tree_required:true,
  claim_record_bind_corpus_sha256_required:true,
  claim_record_bind_parent_adapter_sha256_required:true,
  claim_record_bind_operator_public_key_raw_sha256_required:true,
  claim_record_bind_attempt_limit_required:true,
  claim_file_fsync_before_publication_required:true,
  claim_directory_fsync_after_publication_required:true,
  crash_recovery_exact_state_classification_required:true,
  duplicate_claim_rejected_required:true,
  claim_must_be_durable_before_training_start:true,
  attempt_limit:1,
  automatic_retry_authorized:false,
  broker_execution_ledger_reuse_allowed:false,
  historical_v1_consumption_store_sufficient:false,
  migration_every_prior_claim_generation_in_declared_lineage_shape_required:true,
  migration_protected_lineage_origin_authentication_required:true,
  migration_protected_lineage_origin_proven_by_source_contract:false,
  migration_host_qualification_required_for_lineage_authority:true,
})){
  assert.equal(VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2[key],expected,key);
}
for(const [key,expected] of Object.entries({
  source_only_store_contract:true,
  requirements_defined:true,
  terminal_receipt_shape_validation_only:true,
  terminal_receipt_source_origin_proven:false,
  claim_identity_bound:false,
  claim_root_bound:false,
  host_installation_performed:false,
  protected_claim_store_proven:false,
  protected_runner_origin_proven:false,
  protected_generation_lineage_origin_proven:false,
  current_host_revalidation_performed:false,
  custody_record_revalidation_performed:false,
  durable_attempt_claim_performed:false,
  attempt_claim_authorized:false,
  attempt_claimed:false,
  training_execution_authorized:false,
  training_execution_performed:false,
  candidate_weight_mutation_performed:false,
  filesystem_read:false,filesystem_write:false,network_access:false,service_action:false,
  operator_private_key_access:false,production_signing:false,wallet_access:false,
  transaction_signing:false,transaction_broadcast:false,funds_movement:false,
  repository_merge:false,
})){
  assert.equal(VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_AUTHORITY_V2[key],expected,key);
}

for(const mutate of [
  x=>{x.protected_runner_origin_proven=true;},
  x=>{x.terminal_shutdown_authority_proven=true;},
  x=>{x.current_host_revalidation_required=false;},
  x=>{x.durable_attempt_claim_performed=true;},
  x=>{x.attempt_claim_authorized=true;},
  x=>{x.attempt_claimed=true;},
  x=>{x.training_execution_performed=true;},
  x=>{x.training_process_start_time_ticks=123456;},
  x=>{x.custody_record_sha256="0".repeat(64);},
]){
  const bad=terminalReceipt();mutate(bad);
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimStoreContractV2({terminal_receipt:bad}),
    /terminal_invalid|terminal_id_invalid/u,
  );
}
{
  const bad=terminalReceipt();
  const authority={...bad.authority};
  Object.defineProperty(authority,"__proto__",{
    enumerable:true,configurable:true,writable:true,value:{polluted:true},
  });
  bad.authority=authority;
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimStoreContractV2({terminal_receipt:bad}),
    /terminal_authority_invalid/u,
  );
}
{
  const input={terminal_receipt:terminalReceipt()};
  const good=input.terminal_receipt;
  const bad={...good,custody_record_sha256:"0".repeat(64)};
  let reads=0;
  Object.defineProperty(input,"terminal_receipt",{
    enumerable:true,configurable:true,
    get(){reads+=1;return reads===1?good:bad;},
  });
  const accepted=qualifyApollyonDurableAttemptClaimStoreContractV2(input);
  assert.equal(reads,1);
  assert.equal(accepted.custody_record_sha256,good.custody_record_sha256);
}


assert.deepEqual(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_LEAST_AUTHORITY_KEYS_V2,
  [
    "cap_ambient","cap_bounding","cap_effective","cap_inheritable","cap_permitted",
    "claim_gid","claim_ipc_gid","claim_uid","dangerous_environment_names_present",
    "loader_environment_clean","supplementary_gids","custody_gid","custody_uid",
    "interactive_operator_gid","interactive_operator_uid","no_new_privileges",
    "public_runtime_gid","public_runtime_uid","training_gid","training_uid",
  ],
);

function leastAuthority(overrides={}){
  return {
    claim_uid:994,
    claim_gid:981,
    claim_ipc_gid:979,
    supplementary_gids:[979],
    loader_environment_clean:true,
    dangerous_environment_names_present:[],
    training_uid:995,
    training_gid:982,
    custody_uid:996,
    custody_gid:983,
    public_runtime_uid:997,
    public_runtime_gid:984,
    interactive_operator_uid:1000,
    interactive_operator_gid:1000,
    no_new_privileges:true,
    loader_environment_clean:true,
    dangerous_environment_names_present:[],
    cap_inheritable:"0000000000000000",
    cap_permitted:"0000000000000000",
    cap_effective:"0000000000000000",
    cap_bounding:"0000000000000000",
    cap_ambient:"0000000000000000",
    ...overrides,
  };
}
{
  const qualified=qualifyApollyonDurableAttemptClaimServiceLeastAuthorityV2(
    leastAuthority(),
  );
  assert.equal(qualified.qualified,true);
  assert.equal(qualified.non_root_identity,true);
  assert.equal(qualified.numeric_identity_separation_verified,true);
  assert.equal(qualified.no_new_privileges,true);
  assert.equal(qualified.all_capability_sets_empty,true);
  assert.equal(qualified.supplementary_groups_closed,true);
  assert.equal(qualified.claim_ipc_membership_exact,true);
  assert.equal(qualified.loader_environment_clean,true);
  assert.equal(qualified.host_installation_performed,false);
  assert.equal(qualified.durable_attempt_claim_performed,false);
  assert.equal(qualified.training_execution_performed,false);
}
for(const [label,overrides,pattern] of [
  ["root_uid",{claim_uid:0},/root_uid_forbidden/u],
  ["root_gid",{claim_gid:0},/root_gid_forbidden/u],
  ["root_ipc_gid",{claim_ipc_gid:0,supplementary_gids:[0]},/root_ipc_gid_forbidden/u],
  ["supplementary_extra",{supplementary_gids:[979,978]},/supplementary_groups_invalid/u],
  ["supplementary_wrong",{supplementary_gids:[978]},/supplementary_groups_invalid/u],
  ["supplementary_missing",{supplementary_gids:[]},/supplementary_groups_invalid/u],
  ["claim_ipc_primary_collision",{claim_ipc_gid:981,supplementary_gids:[981]},/supplementary_groups_invalid/u],
  ["loader_dirty",{loader_environment_clean:false},/loader_environment_invalid/u],
  ["dangerous_env",{dangerous_environment_names_present:["LD_PRELOAD"]},/loader_environment_invalid/u],
  ["training_uid_collision",{claim_uid:995},/uid_collision:training_uid/u],
  ["custody_uid_collision",{claim_uid:996},/uid_collision:custody_uid/u],
  ["public_runtime_uid_collision",{claim_uid:997},/uid_collision:public_runtime_uid/u],
  ["operator_uid_collision",{claim_uid:1000},/uid_collision:interactive_operator_uid/u],
  ["training_gid_collision",{claim_gid:982},/gid_collision:training_gid/u],
  ["custody_gid_collision",{claim_gid:983},/gid_collision:custody_gid/u],
  ["public_runtime_gid_collision",{claim_gid:984},/gid_collision:public_runtime_gid/u],
  ["operator_gid_collision",{claim_gid:1000},/gid_collision:interactive_operator_gid/u],
  ["nnp_false",{no_new_privileges:false},/no_new_privileges_required/u],
  ["cap_inheritable",{cap_inheritable:"0000000000000001"},/capabilities_not_empty:cap_inheritable/u],
  ["cap_permitted",{cap_permitted:"0000000000000001"},/capabilities_not_empty:cap_permitted/u],
  ["cap_effective",{cap_effective:"0000000000000001"},/capabilities_not_empty:cap_effective/u],
  ["cap_bounding",{cap_bounding:"0000000000000001"},/capabilities_not_empty:cap_bounding/u],
  ["cap_ambient",{cap_ambient:"0000000000000001"},/capabilities_not_empty:cap_ambient/u],
]){
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimServiceLeastAuthorityV2(
      leastAuthority(overrides),
    ),
    pattern,
    label,
  );
}


assert.deepEqual(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_PUBLISHER_LEAST_AUTHORITY_KEYS_V2,
  [
    "cap_ambient","cap_bounding","cap_effective","cap_inheritable","cap_permitted",
    "claim_gid","claim_ipc_gid","dangerous_environment_names_present","loader_environment_clean",
    "claim_root_rename_unlink_denied","claim_root_write_denied",
    "claim_service_control_denied","claim_uid","custody_gid",
    "custody_service_control_denied","custody_uid","interactive_operator_gid",
    "interactive_operator_uid","no_new_privileges","private_key_access_denied",
    "public_runtime_gid","public_runtime_uid","publisher_gid",
    "publisher_process_exclusive","publisher_source_identity_reviewed","publisher_uid",
    "signing_denied","supplementary_gids","training_gid","training_service_control_denied","training_uid",
    "wallet_access_denied",
  ],
);

function publisherAuthority(overrides={}){
  return {
    publisher_uid:993,publisher_gid:980,
    claim_uid:994,claim_gid:981,claim_ipc_gid:979,
    training_uid:995,training_gid:982,
    custody_uid:996,custody_gid:983,
    public_runtime_uid:997,public_runtime_gid:984,
    interactive_operator_uid:1000,interactive_operator_gid:1000,
    no_new_privileges:true,
    loader_environment_clean:true,
    dangerous_environment_names_present:[],
    cap_inheritable:"0000000000000000",
    cap_permitted:"0000000000000000",
    cap_effective:"0000000000000000",
    cap_bounding:"0000000000000000",
    cap_ambient:"0000000000000000",
    claim_root_write_denied:true,
    claim_root_rename_unlink_denied:true,
    claim_service_control_denied:true,
    training_service_control_denied:true,
    custody_service_control_denied:true,
    private_key_access_denied:true,
    wallet_access_denied:true,
    signing_denied:true,
    supplementary_gids:[979],
    publisher_process_exclusive:true,
    publisher_source_identity_reviewed:true,
    ...overrides,
  };
}
{
  const q=qualifyApollyonDurableAttemptClaimPublisherLeastAuthorityV2(
    publisherAuthority(),
  );
  assert.equal(q.qualified,true);
  assert.equal(q.non_root_identity,true);
  assert.equal(q.loader_environment_clean,true);
  assert.equal(q.direct_claim_store_mutation_denied,true);
  assert.equal(q.broad_privileged_authority_denied,true);
  assert.equal(q.durable_attempt_claim_performed,false);
}
for(const [label,overrides,pattern] of [
  ["root_uid",{publisher_uid:0},/root_identity_forbidden/u],
  ["root_gid",{publisher_gid:0},/root_identity_forbidden/u],
  ["claim_uid_collision",{publisher_uid:994},/uid_collision:claim_uid/u],
  ["operator_uid_collision",{publisher_uid:1000},/uid_collision:interactive_operator_uid/u],
  ["supplementary_extra",{supplementary_gids:[979,978]},/supplementary_groups_invalid/u],
  ["supplementary_wrong",{supplementary_gids:[978]},/supplementary_groups_invalid/u],
  ["claim_ipc_collision",{claim_ipc_gid:982,supplementary_gids:[982]},/claim_ipc_gid_collision/u],
  ["loader_dirty",{loader_environment_clean:false},/loader_environment_invalid/u],
  ["dangerous_env",{dangerous_environment_names_present:["NODE_OPTIONS"]},/loader_environment_invalid/u],
  ["cap_admin",{cap_effective:"0000000000200000"},/capabilities_not_empty:cap_effective/u],
  ["direct_write",{claim_root_write_denied:false},/denial_or_identity_unproven:claim_root_write_denied/u],
  ["rename_unlink",{claim_root_rename_unlink_denied:false},/denial_or_identity_unproven:claim_root_rename_unlink_denied/u],
  ["claim_control",{claim_service_control_denied:false},/denial_or_identity_unproven:claim_service_control_denied/u],
]){
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimPublisherLeastAuthorityV2(
      publisherAuthority(overrides),
    ),
    pattern,
    label,
  );
}

const STORE_GENERATION_ID="apollyon_claim_store_generation_v2:"+"a".repeat(64);
function claimRecord(overrides={}){
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_V2",
    version:2,
    status:"durable_candidate_training_attempt_claim_record_v2",
    store_contract_id:result.store_contract_id,
    store_policy_id:result.store_policy_id,
    store_generation_id:STORE_GENERATION_ID,
    terminal_receipt_id:t.terminal_receipt_id,
    terminal_runner_receipt_sha256:t.terminal_runner_receipt_sha256,
    authorization_id:t.authorization_id,
    custody_generation_id:t.custody_generation_id,
    custody_record_sha256:t.custody_record_sha256,
    request_sha256:t.request_sha256,
    canonical_main:t.canonical_main,
    canonical_tree:t.canonical_tree,
    corpus_sha256:t.corpus_sha256,
    parent_adapter_sha256:t.parent_adapter_sha256,
    operator_public_key_raw_sha256:t.operator_public_key_raw_sha256,
    attempt_limit:1,
    automatic_retry_authorized:false,
    ...overrides,
  };
  return {
    ...material,
    claim_record_id:"apollyon_attempt_claim_record_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
  };
}
{
  const record=claimRecord();
  const q=qualifyApollyonDurableAttemptClaimRecordShapeV2({
    claim_record:record,
    store_contract_id:result.store_contract_id,
    store_policy_id:result.store_policy_id,
    store_generation_id:STORE_GENERATION_ID,
    terminal_receipt:t,
  });
  assert.equal(q.claim_record_id,record.claim_record_id);
}
{
  const wrongStore="apollyon_claim_store_contract_v2:"+"0".repeat(64);
  const record=claimRecord({store_contract_id:wrongStore});
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimRecordShapeV2({
      claim_record:record,
      store_contract_id:wrongStore,
      store_policy_id:result.store_policy_id,
      store_generation_id:STORE_GENERATION_ID,
      terminal_receipt:t,
    }),
    /store_contract_derivation_invalid/u,
  );
}
{
  const wrongPolicy="apollyon_claim_store_policy_v2:"+"0".repeat(64);
  const record=claimRecord({store_policy_id:wrongPolicy});
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimRecordShapeV2({
      claim_record:record,
      store_contract_id:result.store_contract_id,
      store_policy_id:wrongPolicy,
      store_generation_id:STORE_GENERATION_ID,
      terminal_receipt:t,
    }),
    /store_policy_derivation_invalid/u,
  );
}
{
  const record=claimRecord();
  record.training_execution_authorized=true;
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimRecordShapeV2({
      claim_record:record,
      store_contract_id:result.store_contract_id,
      store_policy_id:result.store_policy_id,
      store_generation_id:STORE_GENERATION_ID,
      terminal_receipt:t,
    }),
    /schema_invalid/u,
  );
}
{
  const record=claimRecord({automatic_retry_authorized:true});
  const material={...record};delete material.claim_record_id;
  record.claim_record_id="apollyon_attempt_claim_record_v2:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8"));
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimRecordShapeV2({
      claim_record:record,
      store_contract_id:result.store_contract_id,
      store_policy_id:result.store_policy_id,
      store_generation_id:STORE_GENERATION_ID,
      terminal_receipt:t,
    }),
    /schema_invalid/u,
  );
}
{
  const record=claimRecord();
  const publishRequestSha="b".repeat(64);
  const response={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RESPONSE_V2",
    version:2,
    status:"durable_claim_success_v2",
    outcome:"created_durable",
    next_gate:"apollyon_training_start_consumption_v1",
    store_contract_id:record.store_contract_id,
    store_generation_id:record.store_generation_id,
    store_policy_id:record.store_policy_id,
    terminal_receipt_id:record.terminal_receipt_id,
    authorization_id:record.authorization_id,
    custody_generation_id:record.custody_generation_id,
    claim_record_id:record.claim_record_id,
    claim_record_sha256:sha256(Buffer.from(
      canonicalApollyonClaimContractJsonV1(record)+"\n","utf8",
    )),
    publish_request_sha256:publishRequestSha,
    durability_proven:true,
    final_visible_record_revalidated:true,
    training_start_admission:false,
    training_start_consumption_required:true,
    training_start_consumption_performed:false,
  };
  const q=qualifyApollyonDurableAttemptClaimSuccessResponseShapeV2({
    claim_record:record,
    publish_request_sha256:publishRequestSha,
    success_response:response,
  });
  assert.equal(q.outcome,"created_durable");
  assert.equal(q.training_start_admission,false);
  assert.equal(q.training_start_consumption_required,true);
  assert.equal(q.training_start_consumption_performed,false);
  assert.equal(q.next_gate,"apollyon_training_start_consumption_v1");
  for(const mutate of [
    x=>{x.durability_proven=false;},
    x=>{x.final_visible_record_revalidated=false;},
    x=>{x.claim_record_sha256="0".repeat(64);},
    x=>{x.store_generation_id="apollyon_claim_store_generation_v2:"+"0".repeat(64);},
    x=>{x.training_start_admission=true;},
    x=>{x.training_start_consumption_required=false;},
    x=>{x.training_start_consumption_performed=true;},
    x=>{x.next_gate="durable_candidate_training_attempt_claim_executor_v2";},
    x=>{x.unknown_authority=true;},
  ]){
    const bad={...response};mutate(bad);
    assert.throws(
      ()=>qualifyApollyonDurableAttemptClaimSuccessResponseShapeV2({
        claim_record:record,
        publish_request_sha256:publishRequestSha,
        success_response:bad,
      }),
      /schema_invalid/u,
    );
  }
}
{
  const publishRequestSha="c".repeat(64);
  const response={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RESPONSE_V2",
    version:2,
    status:"indeterminate",
    reason:"directory_fsync_indeterminate",
    store_contract_id:result.store_contract_id,
    store_generation_id:STORE_GENERATION_ID,
    store_policy_id:result.store_policy_id,
    terminal_receipt_id:t.terminal_receipt_id,
    authorization_id:t.authorization_id,
    publish_request_sha256:publishRequestSha,
    durability_proven:false,
    training_start_admission:false,
  };
  const q=qualifyApollyonDurableAttemptClaimFailureResponseShapeV2({
    authorization_id:t.authorization_id,
    failure_response:response,
    publish_request_sha256:publishRequestSha,
    store_contract_id:result.store_contract_id,
    store_generation_id:STORE_GENERATION_ID,
    store_policy_id:result.store_policy_id,
    terminal_receipt_id:t.terminal_receipt_id,
  });
  assert.equal(q.status,"indeterminate");
  assert.equal(q.training_start_admission,false);
  for(const mutate of [
    x=>{x.durability_proven=true;},
    x=>{x.training_start_admission=true;},
    x=>{x.status="ok";},
    x=>{x.unknown_authority=true;},
  ]){
    const bad={...response};mutate(bad);
    assert.throws(
      ()=>qualifyApollyonDurableAttemptClaimFailureResponseShapeV2({
        authorization_id:t.authorization_id,
        failure_response:bad,
        publish_request_sha256:publishRequestSha,
        store_contract_id:result.store_contract_id,
        store_generation_id:STORE_GENERATION_ID,
        store_policy_id:result.store_policy_id,
        terminal_receipt_id:t.terminal_receipt_id,
      }),
      /schema_invalid/u,
    );
  }
}

function oldClaimRecord(authDigit,requestDigit){
  return claimRecord({
    store_contract_id:"apollyon_claim_store_contract_v2:"+authDigit.repeat(64),
    store_policy_id:result.store_policy_id,
    authorization_id:"apollyon_authz_v1:"+authDigit.repeat(64),
    custody_generation_id:"apollyon_custody_generation_v1:"+authDigit.repeat(64),
    custody_record_sha256:authDigit.repeat(64),
    request_sha256:requestDigit.repeat(64),
  });
}
const PRIOR_RECORDS=[oldClaimRecord("1","2"),oldClaimRecord("3","4")];
assert.notEqual(PRIOR_RECORDS[0].store_contract_id,PRIOR_RECORDS[1].store_contract_id);
assert.equal(PRIOR_RECORDS[0].store_policy_id,result.store_policy_id);
assert.equal(PRIOR_RECORDS[1].store_policy_id,result.store_policy_id);
const PRIOR_SORTED=[...PRIOR_RECORDS].sort(
  (a,b)=>a.claim_record_id.localeCompare(b.claim_record_id),
);
const PRIOR_HISTORY_SHA=sha256(Buffer.from(
  canonicalApollyonClaimContractJsonV1(PRIOR_SORTED),"utf8",
));
const OLD_GENERATION_ID="apollyon_claim_store_generation_v2:"+"c".repeat(64);
const NEW_GENERATION_ID="apollyon_claim_store_generation_v2:"+"d".repeat(64);
const ROGUE_GENERATION_ID="apollyon_claim_store_generation_v2:"+"b".repeat(64);
const OLD_ROOT_SHA="e".repeat(64);
const NEW_ROOT_SHA="f".repeat(64);
const PRIOR_GENERATION_IDS=[STORE_GENERATION_ID,OLD_GENERATION_ID].sort();
const PRIOR_LINEAGE_SHA=sha256(Buffer.from(
  canonicalApollyonClaimContractJsonV1(PRIOR_GENERATION_IDS),"utf8",
));
const NEW_GENERATION_IDS=[...PRIOR_GENERATION_IDS,NEW_GENERATION_ID].sort();
const NEW_LINEAGE_SHA=sha256(Buffer.from(
  canonicalApollyonClaimContractJsonV1(NEW_GENERATION_IDS),"utf8",
));
const predecessorMaterial={
  marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_V2",
  version:2,
  status:"durable_attempt_claim_store_generation_v2",
  store_policy_id:result.store_policy_id,
  store_generation_id:OLD_GENERATION_ID,
  root_identity_sha256:OLD_ROOT_SHA,
  genesis:false,
  predecessor_store_generation_id:STORE_GENERATION_ID,
  claim_history_count:PRIOR_RECORDS.length,
  claim_history_sha256:PRIOR_HISTORY_SHA,
  generation_lineage_count:PRIOR_GENERATION_IDS.length,
  generation_lineage_sha256:PRIOR_LINEAGE_SHA,
  continuity_receipt_id:"apollyon_claim_store_continuity_v2:"+"5".repeat(64),
};
const predecessor={
  ...predecessorMaterial,
  store_generation_record_id:"apollyon_claim_store_generation_record_v2:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(predecessorMaterial),"utf8")),
};
function continuityReceipt(overrides={}){
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTINUITY_V2",
    version:2,
    status:"durable_attempt_claim_store_history_continuity_v2",
    store_policy_id:result.store_policy_id,
    genesis:false,
    old_store_generation_id:OLD_GENERATION_ID,
    new_store_generation_id:NEW_GENERATION_ID,
    old_root_identity_sha256:OLD_ROOT_SHA,
    new_root_identity_sha256:NEW_ROOT_SHA,
    predecessor_generation_record_id:predecessor.store_generation_record_id,
    prior_claim_count:PRIOR_RECORDS.length,
    prior_claim_set_sha256:PRIOR_HISTORY_SHA,
    claim_set_order:"claim_record_id_lexicographic",
    fresh_authorization_id:"apollyon_authz_v1:"+"6".repeat(64),
    generation_lineage_order:"store_generation_id_lexicographic",
    prior_generation_lineage_count:PRIOR_GENERATION_IDS.length,
    prior_generation_lineage_sha256:PRIOR_LINEAGE_SHA,
    new_generation_lineage_count:NEW_GENERATION_IDS.length,
    new_generation_lineage_sha256:NEW_LINEAGE_SHA,
    ...overrides,
  };
  return {
    ...material,
    continuity_receipt_id:"apollyon_claim_store_continuity_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
  };
}
{
  const q=qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
    continuity_receipt:continuityReceipt(),
    predecessor_generation_record:predecessor,
    prior_claim_records:PRIOR_RECORDS,
    prior_generation_ids:PRIOR_GENERATION_IDS,
  });
  assert.equal(q.lineage_shape_qualified,true);
  assert.equal(q.protected_generation_lineage_origin_required,true);
  assert.equal(q.protected_generation_lineage_origin_proven,false);
  assert.equal(q.host_qualification_required_for_lineage_authority,true);
  assert.equal(q.durable_attempt_claim_performed,false);
  assert.equal(q.training_execution_performed,false);
  assert.equal(q.continuity_receipt.prior_claim_count,2);
  assert.equal(q.continuity_receipt.prior_claim_set_sha256,PRIOR_HISTORY_SHA);
}
{
  const duplicateLineage=[...PRIOR_GENERATION_IDS,PRIOR_GENERATION_IDS[0]];
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:continuityReceipt(),
      predecessor_generation_record:predecessor,
      prior_claim_records:PRIOR_RECORDS,
      prior_generation_ids:duplicateLineage,
    }),
    /generation_lineage_invalid/u,
  );
}
{
  const rogue=oldClaimRecord("8","9");
  const rogueMaterial={...rogue,store_generation_id:ROGUE_GENERATION_ID};
  delete rogueMaterial.claim_record_id;
  const rogueRecord={
    ...rogueMaterial,
    claim_record_id:"apollyon_attempt_claim_record_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(rogueMaterial),"utf8")),
  };
  const rogueRecords=[PRIOR_RECORDS[0],rogueRecord].sort(
    (a,b)=>a.claim_record_id.localeCompare(b.claim_record_id),
  );
  const rogueHistorySha=sha256(Buffer.from(
    canonicalApollyonClaimContractJsonV1(rogueRecords),"utf8",
  ));
  const roguePredMaterial={
    ...predecessorMaterial,
    claim_history_count:rogueRecords.length,
    claim_history_sha256:rogueHistorySha,
  };
  const roguePredecessor={
    ...roguePredMaterial,
    store_generation_record_id:"apollyon_claim_store_generation_record_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(roguePredMaterial),"utf8")),
  };
  const rogueReceipt=continuityReceipt({
    predecessor_generation_record_id:roguePredecessor.store_generation_record_id,
    prior_claim_count:rogueRecords.length,
    prior_claim_set_sha256:rogueHistorySha,
  });
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:rogueReceipt,
      predecessor_generation_record:roguePredecessor,
      prior_claim_records:rogueRecords,
      prior_generation_ids:PRIOR_GENERATION_IDS,
    }),
    /record_generation_not_in_lineage/u,
  );
}
{
  const wrongPolicy="apollyon_claim_store_policy_v2:"+"0".repeat(64);
  const bad=oldClaimRecord("8","9");
  const badMaterial={...bad,store_policy_id:wrongPolicy};
  delete badMaterial.claim_record_id;
  const badRecord={
    ...badMaterial,
    claim_record_id:"apollyon_attempt_claim_record_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(badMaterial),"utf8")),
  };
  const records=[PRIOR_RECORDS[0],badRecord].sort(
    (a,b)=>a.claim_record_id.localeCompare(b.claim_record_id),
  );
  const historySha=sha256(Buffer.from(
    canonicalApollyonClaimContractJsonV1(records),"utf8",
  ));
  const predMaterial={
    ...predecessorMaterial,
    claim_history_count:records.length,
    claim_history_sha256:historySha,
  };
  const pred={
    ...predMaterial,
    store_generation_record_id:"apollyon_claim_store_generation_record_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(predMaterial),"utf8")),
  };
  const receipt=continuityReceipt({
    predecessor_generation_record_id:pred.store_generation_record_id,
    prior_claim_count:records.length,
    prior_claim_set_sha256:historySha,
  });
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:receipt,
      predecessor_generation_record:pred,
      prior_claim_records:records,
      prior_generation_ids:PRIOR_GENERATION_IDS,
    }),
    /store_policy_mismatch/u,
  );
}
{
  const wrongPolicy="apollyon_claim_store_policy_v2:"+"0".repeat(64);
  const badReceipt=continuityReceipt({store_policy_id:wrongPolicy});
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:badReceipt,
      predecessor_generation_record:predecessor,
      prior_claim_records:PRIOR_RECORDS,
      prior_generation_ids:PRIOR_GENERATION_IDS,
    }),
    /receipt_invalid/u,
  );
}
{
  const reusedNewLineage=[...PRIOR_GENERATION_IDS,NEW_GENERATION_ID].sort();
  const reusedLineageSha=sha256(Buffer.from(
    canonicalApollyonClaimContractJsonV1(reusedNewLineage),"utf8",
  ));
  const reusedPredMaterial={
    ...predecessorMaterial,
    generation_lineage_count:reusedNewLineage.length,
    generation_lineage_sha256:reusedLineageSha,
  };
  const reusedPredecessor={
    ...reusedPredMaterial,
    store_generation_record_id:"apollyon_claim_store_generation_record_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(reusedPredMaterial),"utf8")),
  };
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:continuityReceipt({
        predecessor_generation_record_id:reusedPredecessor.store_generation_record_id,
        prior_generation_lineage_count:reusedNewLineage.length,
        prior_generation_lineage_sha256:reusedLineageSha,
      }),
      predecessor_generation_record:reusedPredecessor,
      prior_claim_records:PRIOR_RECORDS,
      prior_generation_ids:reusedNewLineage,
    }),
    /new_generation_lineage_invalid/u,
  );
}
{
  const badPredecessor={...predecessor,store_generation_record_id:
    "apollyon_claim_store_generation_record_v2:"+"0".repeat(64)};
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:continuityReceipt(),
      predecessor_generation_record:badPredecessor,
      prior_claim_records:PRIOR_RECORDS,
      prior_generation_ids:PRIOR_GENERATION_IDS,
    }),
    /generation_record_v2_id_invalid|predecessor_mismatch/u,
  );
}
{
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:continuityReceipt(),
      predecessor_generation_record:predecessor,
      prior_claim_records:[PRIOR_RECORDS[0]],
      prior_generation_ids:PRIOR_GENERATION_IDS,
    }),
    /receipt_invalid|predecessor_mismatch/u,
  );
}
{
  const duplicateAuthorization=[
    oldClaimRecord("1","2"),
    oldClaimRecord("1","7"),
  ];
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:continuityReceipt(),
      predecessor_generation_record:predecessor,
      prior_claim_records:duplicateAuthorization,
      prior_generation_ids:PRIOR_GENERATION_IDS,
    }),
    /authorization_replay/u,
  );
}
{
  const reused=continuityReceipt({
    fresh_authorization_id:PRIOR_RECORDS[0].authorization_id,
  });
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:reused,
      predecessor_generation_record:predecessor,
      prior_claim_records:PRIOR_RECORDS,
      prior_generation_ids:PRIOR_GENERATION_IDS,
    }),
    /fresh_authorization_reused/u,
  );
}
{
  const sameGeneration=continuityReceipt({
    new_store_generation_id:OLD_GENERATION_ID,
  });
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:sameGeneration,
      predecessor_generation_record:predecessor,
      prior_claim_records:PRIOR_RECORDS,
      prior_generation_ids:PRIOR_GENERATION_IDS,
    }),
    /new_generation_lineage_invalid|migration_invalid/u,
  );
}
{
  const sameRoot=continuityReceipt({
    new_root_identity_sha256:OLD_ROOT_SHA,
  });
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:sameRoot,
      predecessor_generation_record:predecessor,
      prior_claim_records:PRIOR_RECORDS,
      prior_generation_ids:PRIOR_GENERATION_IDS,
    }),
    /migration_invalid/u,
  );
}
{
  const nonBoolean=continuityReceipt({genesis:0});
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:nonBoolean,
      predecessor_generation_record:predecessor,
      prior_claim_records:PRIOR_RECORDS,
      prior_generation_ids:PRIOR_GENERATION_IDS,
    }),
    /receipt_invalid/u,
  );
}
{
  const mutated={...PRIOR_RECORDS[0],request_sha256:"9".repeat(64)};
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:continuityReceipt(),
      predecessor_generation_record:predecessor,
      prior_claim_records:[mutated,PRIOR_RECORDS[1]],
      prior_generation_ids:PRIOR_GENERATION_IDS,
    }),
    /id_invalid/u,
  );
}
{
  const forged=continuityReceipt({
    genesis:true,
    old_store_generation_id:null,
    old_root_identity_sha256:null,
    predecessor_generation_record_id:null,
    prior_claim_count:0,
    prior_claim_set_sha256:sha256(Buffer.from(
      canonicalApollyonClaimContractJsonV1([]),"utf8",
    )),
    prior_generation_lineage_count:0,
    prior_generation_lineage_sha256:sha256(Buffer.from(
      canonicalApollyonClaimContractJsonV1([]),"utf8",
    )),
    new_generation_lineage_count:1,
    new_generation_lineage_sha256:sha256(Buffer.from(
      canonicalApollyonClaimContractJsonV1([NEW_GENERATION_ID]),"utf8",
    )),
  });
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2({
      continuity_receipt:forged,
      predecessor_generation_record:predecessor,
      prior_claim_records:[],
      prior_generation_ids:[],
    }),
    /genesis_invalid/u,
  );
}

const WORKFLOW=fs.readFileSync(
  path.join(ROOT,".github/workflows/apollyon-durable-attempt-claim-store-contract-v2.yml"),
  "utf8",
);
for(const required of [
  "pull_request:",
  "push:\n    branches: [main]",
  "workflow_dispatch:",
  "push)",
  "PUSH_BEFORE:",
  'test "$PUSH_BEFORE" != "0000000000000000000000000000000000000000"',
  'BASE="$PUSH_BEFORE"',
  '"tools/apollyon-live-source-session-terminal-receipt-v2.mjs"',
  '"tools/apollyon-live-custody-service-source-session-binding-v2.mjs"',
  '"tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs"',
]){
  assert.equal(WORKFLOW.includes(required),true,"workflow parity: "+required);
}

assert.deepEqual(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_DANGEROUS_ENVIRONMENT_NAMES_V2,
  ["GCONV_PATH","LD_AUDIT","LD_LIBRARY_PATH","LD_PRELOAD","NODE_OPTIONS","NODE_PATH","OPENSSL_CONF"],
);

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-durable-attempt-claim-store-contract-v2.mjs"),
  "utf8",
);
for(const required of [
  'status:"protected_attempt_claim_store_requirements_defined_uninstalled"',
  'claim_identity_bound:false','claim_root_bound:false',
  'protected_claim_store_proven:false','host_installation_performed:false',
  'terminal_receipt_shape_bound:true','terminal_receipt_source_origin_proven:false',
  'claim_must_be_durable_before_training_start:true',
  'claim_uid_only_reviewed_service_required:true',
  'claim_service_non_root_uid_required:true',
  'claim_service_non_root_gid_required:true',
  'claim_service_no_new_privileges_required:true',
  'claim_service_inheritable_capabilities_empty_required:true',
  'claim_service_permitted_capabilities_empty_required:true',
  'claim_service_effective_capabilities_empty_required:true',
  'claim_service_bounding_capabilities_empty_required:true',
  'claim_service_ambient_capabilities_empty_required:true',
  'claim_service_loader_environment_clean_required:true',
  'claim_service_unset_environment_exact_required:true',
  'claim_publisher_loader_environment_clean_required:true',
  'socket_publication_create_only_no_overwrite_required:true',
  'socket_existing_path_liveness_classification_required:true',
  'socket_live_listener_unlink_forbidden_required:true',
  'socket_changed_generation_cleanup_rejected_required:true',
  'socket_two_cycle_restart_qualification_required:true',
  'socket_crash_stale_recovery_qualification_required:true',
  'claim_success_is_not_training_start_admission_required:true',
  'separate_one_time_training_start_consumption_required:true',
  'training_start_consumption_create_once_required:true',
  'replayed_claim_success_after_start_consumption_rejected_required:true',
  'claim_service_numeric_identity_revalidation_immediately_before_publication_required:true',
  'claim_service_no_new_privileges_revalidation_immediately_before_publication_required:true',
  'claim_service_capability_sets_revalidation_immediately_before_publication_required:true',
  'claim_request_kernel_peer_credentials_required:true',
  'claim_request_exact_caller_uid_gid_required:true',
  'claim_request_unauthorized_peer_rejected_before_body_read_required:true',
  'claim_request_exact_key_schema_required:true',
  'claim_record_exact_key_schema_required:true',
  'claim_success_response_exact_schema_required:true',
  'claim_failure_response_exact_schema_required:true',
  'claim_publish_request_sha256_canonical_exact_request_required:true',
  'claim_success_ack_only_after_directory_fsync_required:true',
  'dedicated_claim_publisher_identity_required:true',
  'claim_publisher_supplementary_groups_closed_required:true',
  'claim_publisher_process_exclusivity_revalidation_required:true',
  'claim_service_systemd_sandbox_exact_required:true',
  'claim_socket_namespace_exact_required:true',
  'claim_client_authenticates_server_before_body_required:true',
  'persistent_store_policy_identity_required:true',
  'store_policy_id_terminal_independent_required:true',
  'store_contract_id_per_admission_required:true',
  'store_generation_record_content_addressed_id_required:true',
  'store_generation_record_bind_store_policy_id_required:true',
  'migration_continuity_receipt_exact_schema_required:true',
  'migration_continuity_receipt_bind_store_policy_id_required:true',
  'migration_continuity_binds_predecessor_generation_record_id_required:true',
  'migration_generation_lineage_commitment_required:true',
  'migration_prior_generation_lineage_sha256_required:true',
  'migration_new_generation_lineage_exact_extension_required:true',
  'migration_every_prior_claim_generation_in_declared_lineage_shape_required:true',
  'migration_protected_lineage_origin_authentication_required:true',
  'migration_protected_lineage_origin_proven_by_source_contract:false',
  'migration_host_qualification_required_for_lineage_authority:true',
  'migration_old_new_generation_distinct_required:true',
  'migration_old_new_root_identity_distinct_required:true',
  'migration_authorization_ids_unique_across_complete_history_required:true',
  'claim_request_method:"publish_claim_v2"',
  'claim_store_generation_identity_required:true',
  'same_path_replacement_must_be_new_generation_required:true',
  'authorization_binding_to_claim_store_generation_required:true',
  'old_terminal_receipt_reuse_across_store_generation_forbidden:true',
  'claim_record_bind_terminal_receipt_id_required:true',
  'claim_record_bind_request_sha256_required:true',
  'claim_record_bind_canonical_main_required:true',
  'claim_record_bind_canonical_tree_required:true',
  'claim_record_bind_corpus_sha256_required:true',
  'claim_record_bind_parent_adapter_sha256_required:true',
  'claim_record_bind_operator_public_key_raw_sha256_required:true',
  'claim_record_bind_store_generation_id_required:true',
  'complete_claim_boundary_revalidation_immediately_before_publication_required:true',
  'claim_uid_process_exclusivity_revalidation_immediately_before_publication_required:true',
  'claim_store_generation_revalidation_immediately_before_publication_required:true',
  'cross_generation_authorization_replay_rejected_required:true',
  'claim_store_generation_replacement_without_retained_history_is_permanent_hold_required:true',
  'broker_execution_ledger_reuse_allowed:false',
  'historical_v1_consumption_store_sufficient:false',
  'next_gate:"apollyon_durable_attempt_claim_store_host_qualification_v2"',
])assert.equal(source.includes(required),true,required);
for(const forbidden of [
  "node:fs","node:net","node:child_process","systemctl","writeFileSync(","appendFile",
  "mkdir","spawn(","fetch(","createPrivateKey","crypto.sign(",
  "durable_attempt_claim_performed:true","attempt_claim_authorized:true",
  "attempt_claimed:true","training_execution_authorized:true",
  "training_execution_performed:true","candidate_weight_mutation_performed:true",
  "filesystem_write:true","service_action:true","funds_movement:true",
])assert.equal(source.includes(forbidden),false,forbidden);

console.log("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_V2_PROOF_GREEN");
console.log("requirements_defined=true");
console.log("terminal_receipt_shape_bound=true");
console.log("terminal_receipt_source_origin_proven=false");
console.log("dedicated_claim_service_identity_required=true");
console.log("claim_service_non_root_uid_gid_required=true");
console.log("claim_service_no_new_privileges_required=true");
console.log("claim_service_all_capability_sets_empty_required=true");
console.log("claim_service_supplementary_groups_closed_required=true");
console.log("claim_service_loader_environment_clean_required=true");
console.log("claim_publisher_loader_environment_clean_required=true");
console.log("claim_service_numeric_identity_separation_required=true");
console.log("claim_service_least_authority_adversaries_rejected=true");
console.log("claim_uid_only_reviewed_service_required=true");
console.log("claim_request_kernel_peer_credentials_required=true");
console.log("claim_request_exact_caller_uid_gid_required=true");
console.log("claim_request_unauthorized_peer_rejected_before_body_read_required=true");
console.log("claim_request_exact_key_schema_required=true");
console.log("claim_record_exact_key_schema_required=true");
console.log("claim_success_response_exact_schema_required=true");
console.log("claim_failure_response_exact_schema_required=true");
console.log("claim_publish_request_sha256_canonical_exact_request_required=true");
console.log("claim_success_ack_after_durable_revalidation_required=true");
console.log("claim_success_is_not_training_start_admission_required=true");
console.log("separate_one_time_training_start_consumption_required=true");
console.log("claim_socket_restart_lifecycle_required=true");
console.log("dedicated_claim_publisher_identity_required=true");
console.log("claim_publisher_supplementary_groups_closed_required=true");
console.log("migration_fresh_authorization_reuse_rejected=true");
console.log("migration_genesis_boolean_required=true");
console.log("claim_service_systemd_sandbox_exact_required=true");
console.log("claim_socket_namespace_exact_required=true");
console.log("claim_client_server_authentication_required=true");
console.log("store_generation_record_content_addressed_id_required=true");
console.log("migration_continuity_receipt_exact_schema_required=true");
console.log("migration_continuity_binds_predecessor_generation_record_id_required=true");
console.log("migration_generation_lineage_commitment_required=true");
console.log("migration_every_prior_claim_generation_in_declared_lineage_shape_required=true");
console.log("migration_protected_lineage_origin_authentication_required=true");
console.log("migration_protected_lineage_origin_proven_by_source_contract=false");
console.log("migration_host_qualification_required_for_lineage_authority=true");
console.log("migration_old_new_generation_distinct_required=true");
console.log("migration_old_new_root_identity_distinct_required=true");
console.log("migration_authorization_ids_unique_across_complete_history_required=true");
console.log("persistent_store_policy_identity_required=true");
console.log("store_policy_id_terminal_independent_required=true");
console.log("store_contract_id_per_admission_required=true");
console.log("claim_store_generation_identity_required=true");
console.log("same_path_replacement_must_be_new_generation_required=true");
console.log("authorization_binding_to_claim_store_generation_required=true");
console.log("old_terminal_receipt_reuse_across_store_generation_forbidden=true");
console.log("claim_record_bind_terminal_receipt_id_required=true");
console.log("claim_record_bind_request_sha256_required=true");
console.log("claim_record_bind_canonical_main_required=true");
console.log("claim_record_bind_canonical_tree_required=true");
console.log("claim_record_bind_corpus_sha256_required=true");
console.log("claim_record_bind_parent_adapter_sha256_required=true");
console.log("claim_record_bind_operator_public_key_raw_sha256_required=true");
console.log("claim_record_bind_store_generation_id_required=true");
console.log("complete_claim_boundary_revalidation_immediately_before_publication_required=true");
console.log("claim_uid_process_exclusivity_revalidation_immediately_before_publication_required=true");
console.log("claim_store_generation_revalidation_immediately_before_publication_required=true");
console.log("cross_generation_authorization_replay_rejected_required=true");
console.log("claim_store_generation_replacement_without_retained_history_is_permanent_hold_required=true");
console.log("claim_identity_bound=false");
console.log("claim_root_bound=false");
console.log("protected_claim_store_proven=false");
console.log("current_host_revalidation_performed=false");
console.log("exact_v2_custody_record_revalidation_performed=false");
console.log("claim_must_be_durable_before_training_start=true");
console.log("broker_execution_ledger_reuse_allowed=false");
console.log("historical_v1_consumption_store_sufficient=false");
console.log("durable_attempt_claim_performed=false");
console.log("training_execution=false");
