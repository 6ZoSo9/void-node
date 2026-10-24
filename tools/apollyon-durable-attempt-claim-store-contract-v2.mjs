#!/usr/bin/env node
import crypto from "node:crypto";
import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2,
} from "./apollyon-live-source-session-terminal-receipt-v2.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_V2";
export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_POLICY_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_POLICY_V2";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_DANGEROUS_ENVIRONMENT_NAMES_V2 =
  Object.freeze([
    "GCONV_PATH","LD_AUDIT","LD_LIBRARY_PATH","LD_PRELOAD",
    "NODE_OPTIONS","NODE_PATH","OPENSSL_CONF",
  ]);

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_KEYS_V2 =
  Object.freeze([
    "claim_record",
    "marker",
    "method",
    "store_contract_id",
    "store_policy_id",
    "version",
  ]);

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_KEYS_V2 =
  Object.freeze([
    "attempt_limit",
    "authorization_id",
    "automatic_retry_authorized",
    "canonical_main",
    "canonical_tree",
    "claim_record_id",
    "corpus_sha256",
    "custody_generation_id",
    "custody_record_sha256",
    "marker",
    "operator_public_key_raw_sha256",
    "parent_adapter_sha256",
    "request_sha256",
    "status",
    "store_contract_id",
    "store_generation_id",
    "store_policy_id",
    "terminal_receipt_id",
    "terminal_runner_receipt_sha256",
    "version",
  ]);

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SUCCESS_RESPONSE_KEYS_V2 =
  Object.freeze([
    "authorization_id",
    "claim_record_id",
    "claim_record_sha256",
    "custody_generation_id",
    "durability_proven",
    "final_visible_record_revalidated",
    "marker",
    "outcome",
    "publish_request_sha256",
    "status",
    "store_contract_id",
    "store_generation_id",
    "store_policy_id",
    "terminal_receipt_id",
    "training_start_admission",
    "training_start_consumption_performed",
    "training_start_consumption_required",
    "next_gate",
    "version",
  ]);

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_FAILURE_RESPONSE_KEYS_V2 =
  Object.freeze([
    "authorization_id",
    "durability_proven",
    "marker",
    "publish_request_sha256",
    "reason",
    "status",
    "store_contract_id",
    "store_generation_id",
    "store_policy_id",
    "terminal_receipt_id",
    "training_start_admission",
    "version",
  ]);

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_PUBLISHER_LEAST_AUTHORITY_KEYS_V2 =
  Object.freeze([
    "cap_ambient",
    "cap_bounding",
    "cap_effective",
    "cap_inheritable",
    "cap_permitted",
    "claim_gid",
    "claim_ipc_gid",
    "dangerous_environment_names_present",
    "loader_environment_clean",
    "claim_root_rename_unlink_denied",
    "claim_root_write_denied",
    "claim_service_control_denied",
    "claim_uid",
    "custody_gid",
    "custody_service_control_denied",
    "custody_uid",
    "interactive_operator_gid",
    "interactive_operator_uid",
    "no_new_privileges",
    "private_key_access_denied",
    "public_runtime_gid",
    "public_runtime_uid",
    "publisher_gid",
    "publisher_process_exclusive",
    "publisher_source_identity_reviewed",
    "publisher_uid",
    "signing_denied",
    "supplementary_gids",
    "training_gid",
    "training_service_control_denied",
    "training_uid",
    "wallet_access_denied",
  ]);

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2 =
  Object.freeze([
    "claim_history_count",
    "claim_history_sha256",
    "continuity_receipt_id",
    "generation_lineage_count",
    "generation_lineage_sha256",
    "genesis",
    "marker",
    "predecessor_store_generation_id",
    "root_identity_sha256",
    "status",
    "store_generation_id",
    "store_generation_record_id",
    "store_policy_id",
    "version",
  ]);

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_CONTINUITY_RECEIPT_KEYS_V2 =
  Object.freeze([
    "claim_set_order",
    "continuity_receipt_id",
    "fresh_authorization_id",
    "generation_lineage_order",
    "genesis",
    "marker",
    "new_generation_lineage_count",
    "new_generation_lineage_sha256",
    "new_root_identity_sha256",
    "new_store_generation_id",
    "old_root_identity_sha256",
    "old_store_generation_id",
    "prior_generation_lineage_count",
    "prior_generation_lineage_sha256",
    "predecessor_generation_record_id",
    "prior_claim_count",
    "prior_claim_set_sha256",
    "status",
    "store_policy_id",
    "version",
  ]);

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_SYSTEMD_REQUIREMENTS_V2 =
  Object.freeze({
    system_manager_required:true,
    fragment_path_versioned_fixed_required:true,
    drop_in_paths_empty_required:true,
    need_daemon_reload_no_required:true,
    exact_user_group_required:true,
    exact_supplementary_groups_claim_ipc_only_required:true,
    unset_environment_exact:
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_DANGEROUS_ENVIRONMENT_NAMES_V2,
    environment_directives_empty_required:true,
    environment_files_empty_required:true,
    pass_environment_empty_required:true,
    umask:"0077",
    private_tmp_required:true,
    private_devices_required:true,
    protect_system:"strict",
    protect_home_required:true,
    protect_kernel_tunables_required:true,
    protect_kernel_modules_required:true,
    protect_kernel_logs_required:true,
    protect_control_groups_required:true,
    lock_personality_required:true,
    restrict_suid_sgid_required:true,
    restrict_realtime_required:true,
    no_new_privileges_required:true,
    capability_bounding_set_empty_required:true,
    ambient_capabilities_empty_required:true,
    restrict_address_families_exact:Object.freeze(["AF_UNIX"]),
    read_write_target_roles_exact:Object.freeze(["claim_state_root","claim_socket_parent"]),
    no_extra_read_write_paths_required:true,
    home_system_project_write_forbidden:true,
    temporary_filesystems_read_only_required:true,
    complete_exec_arrays_exact_reviewed_required:true,
    unexpected_exec_commands_forbidden:true,
  });

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SOCKET_REQUIREMENTS_V2 =
  Object.freeze({
    socket_path_versioned_fixed_before_install_required:true,
    socket_parent_path_versioned_fixed_before_install_required:true,
    socket_parent_direct_non_symlink_required:true,
    socket_parent_retained_ancestor_custody_required:true,
    socket_parent_exact_owner_group_mode_required:true,
    socket_parent_owner_role:"claim_service",
    socket_parent_group_role:"claim_ipc",
    socket_parent_mode:"0750",
    socket_parent_unauthorized_rename_unlink_denied_required:true,
    socket_type_af_unix_required:true,
    socket_owner_role:"claim_service",
    socket_group_role:"claim_ipc",
    socket_mode:"0660",
    socket_link_count_exact_before_install_required:true,
    socket_exact_owner_group_mode_link_count_required:true,
    socket_publication_create_only_no_overwrite_required:true,
    socket_existing_path_liveness_classification_required:true,
    socket_live_listener_unlink_forbidden_required:true,
    socket_stale_cleanup_exact_identity_metadata_required:true,
    socket_changed_generation_cleanup_rejected_required:true,
    socket_claim_uid_process_exclusivity_before_cleanup_required:true,
    socket_cleanup_owner_exact_reviewed_required:true,
    socket_two_cycle_restart_qualification_required:true,
    socket_crash_stale_recovery_qualification_required:true,
    client_server_peer_credentials_required:true,
    client_exact_server_uid_gid_pid_required:true,
    client_server_pid_start_ticks_required:true,
    client_server_executable_source_identity_required:true,
    client_server_auth_before_request_body_required:true,
    socket_inode_stable_across_request_response_required:true,
    server_process_generation_stable_across_request_response_required:true,
    server_restart_mid_request_rejected_required:true,
  });

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_LEAST_AUTHORITY_KEYS_V2 =
  Object.freeze([
    "cap_ambient",
    "cap_bounding",
    "cap_effective",
    "cap_inheritable",
    "cap_permitted",
    "claim_gid",
    "claim_ipc_gid",
    "claim_uid",
    "dangerous_environment_names_present",
    "loader_environment_clean",
    "supplementary_gids",
    "custody_gid",
    "custody_uid",
    "interactive_operator_gid",
    "interactive_operator_uid",
    "no_new_privileges",
    "public_runtime_gid",
    "public_runtime_uid",
    "training_gid",
    "training_uid",
  ]);

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2 =
  Object.freeze({
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
    claim_service_loader_environment_clean_required:true,
    claim_service_unset_environment_exact_required:true,
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
    store_generation_record_exact_keys:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
    store_generation_record_content_addressed_id_required:true,
    store_generation_record_bind_store_policy_id_required:true,
    migration_continuity_receipt_exact_schema_required:true,
    migration_continuity_receipt_bind_store_policy_id_required:true,
    migration_continuity_receipt_exact_keys:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_CONTINUITY_RECEIPT_KEYS_V2,
    migration_old_new_generation_cross_binding_required:true,
    migration_old_new_generation_distinct_required:true,
    migration_old_new_root_identity_cross_binding_required:true,
    migration_old_new_root_identity_distinct_required:true,
    migration_continuity_binds_predecessor_generation_record_id_required:true,
    migration_complete_prior_claim_count_required:true,
    migration_complete_prior_claim_set_sha256_required:true,
    migration_generation_lineage_commitment_required:true,
    migration_generation_lineage_order:"store_generation_id_lexicographic",
    migration_prior_generation_lineage_count_required:true,
    migration_prior_generation_lineage_sha256_required:true,
    migration_new_generation_lineage_exact_extension_required:true,
    migration_every_prior_claim_generation_in_declared_lineage_shape_required:true,
    migration_protected_lineage_origin_authentication_required:true,
    migration_protected_lineage_origin_proven_by_source_contract:false,
    migration_host_qualification_required_for_lineage_authority:true,
    migration_claim_set_order:"claim_record_id_lexicographic",
    migration_every_prior_claim_exact_schema_and_hash_required:true,
    migration_authorization_ids_unique_across_complete_history_required:true,
    new_store_generation_commits_continuity_receipt_required:true,
    fresh_authorization_binds_new_generation_and_prior_history_digest_required:true,
    genesis_zero_history_shape_distinct_from_migration_required:true,
    migration_publish_then_reread_durability_required:true,
    migration_missing_extra_mutated_history_permanent_hold_required:true,
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
    claim_publisher_loader_environment_clean_required:true,
    claim_publisher_numeric_identity_separation_required:true,
    claim_publisher_supplementary_groups_closed_required:true,
    claim_publisher_claim_ipc_membership_exact_required:true,
    claim_publisher_process_exclusivity_revalidation_required:true,
    claim_publisher_source_identity_revalidation_required:true,
    claim_publisher_direct_claim_root_write_denied_required:true,
    claim_publisher_direct_claim_root_rename_unlink_denied_required:true,
    claim_publisher_claim_service_control_denied_required:true,
    claim_publisher_training_service_control_denied_required:true,
    claim_publisher_custody_service_control_denied_required:true,
    claim_publisher_private_key_wallet_signing_authority_forbidden:true,
    privileged_read_only_revalidation_must_be_separate_gate_required:true,
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
    claim_response_marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RESPONSE_V2",
    claim_response_version:2,
    claim_success_response_exact_schema_required:true,
    claim_success_response_exact_keys:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SUCCESS_RESPONSE_KEYS_V2,
    claim_success_response_unknown_keys_rejected_required:true,
    claim_success_response_status:"durable_claim_success_v2",
    claim_success_response_outcomes:Object.freeze(["created_durable","recovered_existing_exact_durable"]),
    claim_failure_response_exact_schema_required:true,
    claim_failure_response_exact_keys:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_FAILURE_RESPONSE_KEYS_V2,
    claim_failure_response_unknown_keys_rejected_required:true,
    claim_failure_response_statuses:Object.freeze(["rejected","duplicate","indeterminate"]),
    claim_publish_request_sha256_canonical_exact_request_required:true,
    claim_success_bind_publish_request_sha256_required:true,
    claim_success_bind_claim_record_id_sha256_required:true,
    claim_success_bind_store_generation_required:true,
    claim_success_bind_terminal_receipt_authorization_custody_required:true,
    claim_success_ack_only_after_file_fsync_required:true,
    claim_success_ack_only_after_directory_fsync_required:true,
    claim_success_ack_only_after_final_visible_record_revalidation_required:true,
    indeterminate_publication_must_not_return_success_required:true,
    exact_existing_record_recovery_distinct_from_new_create_required:true,
    different_existing_claim_is_duplicate_rejection_required:true,
    claim_success_is_not_training_start_admission_required:true,
    separate_one_time_training_start_consumption_required:true,
    training_start_consumption_create_once_required:true,
    training_start_consumption_binds_claim_record_authorization_custody_store_generation_and_trainer_generation_required:true,
    training_start_recovery_distinguishes_unconsumed_vs_consumed_required:true,
    replayed_claim_success_after_start_consumption_rejected_required:true,
    socket_close_or_generic_ok_never_training_admission_required:true,
    claim_service_max_concurrent_connections:16,
    claim_service_socket_backlog_bound_required:true,
    claim_service_systemd_sandbox_exact_required:true,
    claim_service_systemd_requirements:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_SYSTEMD_REQUIREMENTS_V2,
    claim_service_exact_writable_target_roles_required:true,
    claim_service_no_extra_writable_paths_required:true,
    claim_service_loaded_fragment_dropin_reload_exec_closure_required:true,
    claim_socket_namespace_exact_required:true,
    claim_socket_requirements:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SOCKET_REQUIREMENTS_V2,
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
    claim_record_exact_keys:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_KEYS_V2,
    claim_record_unknown_keys_rejected_required:true,
    claim_record_marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_V2",
    claim_record_version:2,
    claim_record_status:"durable_candidate_training_attempt_claim_record_v2",
    claim_record_content_addressed_id_required:true,
    claim_record_bind_store_contract_id_required:true,
    claim_record_bind_store_policy_id_required:true,
    claim_record_automatic_retry_authorized_literal_false_required:true,
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
    final_visible_claim_record_metadata_bytes_revalidation_required:true,
    success_ack_after_durable_revalidation_required:true,
    crash_recovery_exact_state_classification_required:true,
    duplicate_claim_rejected_required:true,
    claim_must_be_durable_before_training_start:true,
    attempt_limit:1,
    automatic_retry_authorized:false,
    broker_execution_ledger_reuse_allowed:false,
    historical_v1_consumption_store_sufficient:false,
  });

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_AUTHORITY_V2 =
  Object.freeze({
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
    filesystem_read:false,
    filesystem_write:false,
    network_access:false,
    service_action:false,
    operator_private_key_access:false,
    production_signing:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
    repository_merge:false,
  });

const TERMINAL_RECEIPT_V2_BLOB_SHA1="974a383f4904b6b223a2143d5f7a19322f3d1f66";
const CANONICALIZER_V1_BLOB_SHA1="f97fafb0148527ae3a954e2752faef8c7fc9e88e";
const HASH64=/^[0-9a-f]{64}$/u;
const GIT40=/^[0-9a-f]{40}$/u;
const TERMINAL_ID=/^apollyon_terminal_receipt_v2:[0-9a-f]{64}$/u;
const LIVE_BINDING_ID=/^apollyon_live_binding_v2:[0-9a-f]{64}$/u;
const CLAIM_ID=/^apollyon_claim_contract_v2:[0-9a-f]{64}$/u;
const PRECLAIM_ID=/^apollyon_preclaim_v2:[0-9a-f]{64}$/u;
const LIVE_V2_ID=/^apollyon_custody_live_v2:[0-9a-f]{64}$/u;
const ISOLATION_ID=/^apollyon_training_isolation_live_v1:[0-9a-f]{64}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const GENERATION_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;
const STORE_CONTRACT_ID=/^apollyon_claim_store_contract_v2:[0-9a-f]{64}$/u;
const STORE_POLICY_ID=/^apollyon_claim_store_policy_v2:[0-9a-f]{64}$/u;
const STORE_GENERATION_ID=/^apollyon_claim_store_generation_v2:[0-9a-f]{64}$/u;
const CLAIM_RECORD_ID=/^apollyon_attempt_claim_record_v2:[0-9a-f]{64}$/u;
const CONTINUITY_RECEIPT_ID=/^apollyon_claim_store_continuity_v2:[0-9a-f]{64}$/u;
const STORE_GENERATION_RECORD_ID=/^apollyon_claim_store_generation_record_v2:[0-9a-f]{64}$/u;

function fail(code){throw new Error(code);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function canonical(value){return canonicalApollyonClaimContractJsonV1(value);}
function exactKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index])){
    fail(code);
  }
}
function requireFalse(value,keys,code){
  for(const key of keys)if(value[key]!==false)fail(code);
}
function requireTrue(value,keys,code){
  for(const key of keys)if(value[key]!==true)fail(code);
}

export function qualifyApollyonDurableAttemptClaimServiceLeastAuthorityV2(input){
  let value;
  try{
    value=structuredClone(input);
  }catch{
    fail("apollyon_claim_service_least_authority_v2_input_invalid");
  }
  exactKeys(
    value,
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_LEAST_AUTHORITY_KEYS_V2,
    "apollyon_claim_service_least_authority_v2_input_invalid",
  );
  for(const key of [
    "claim_uid","claim_gid","claim_ipc_gid","training_uid","training_gid",
    "custody_uid","custody_gid","public_runtime_uid","public_runtime_gid",
    "interactive_operator_uid","interactive_operator_gid",
  ]){
    if(!Number.isSafeInteger(value[key])||value[key]<0||value[key]>65533){
      fail("apollyon_claim_service_least_authority_v2_numeric_identity_invalid");
    }
  }
  if(value.claim_uid===0){
    fail("apollyon_claim_service_least_authority_v2_root_uid_forbidden");
  }
  if(value.claim_gid===0){
    fail("apollyon_claim_service_least_authority_v2_root_gid_forbidden");
  }
  if(value.claim_ipc_gid===0){
    fail("apollyon_claim_service_least_authority_v2_root_ipc_gid_forbidden");
  }
  if(
    !Array.isArray(value.supplementary_gids)||
    value.supplementary_gids.length!==1||
    value.supplementary_gids[0]!==value.claim_ipc_gid||
    value.claim_ipc_gid===value.claim_gid
  ){
    fail("apollyon_claim_service_least_authority_v2_supplementary_groups_invalid");
  }
  for(const [label,observed] of [
    ["training_uid",value.training_uid],
    ["custody_uid",value.custody_uid],
    ["public_runtime_uid",value.public_runtime_uid],
    ["interactive_operator_uid",value.interactive_operator_uid],
  ]){
    if(value.claim_uid===observed){
      fail("apollyon_claim_service_least_authority_v2_uid_collision:"+label);
    }
  }
  for(const [label,observed] of [
    ["training_gid",value.training_gid],
    ["custody_gid",value.custody_gid],
    ["public_runtime_gid",value.public_runtime_gid],
    ["interactive_operator_gid",value.interactive_operator_gid],
  ]){
    if(value.claim_gid===observed){
      fail("apollyon_claim_service_least_authority_v2_gid_collision:"+label);
    }
    if(value.claim_ipc_gid===observed){
      fail("apollyon_claim_service_least_authority_v2_claim_ipc_gid_collision:"+label);
    }
  }
  if(
    value.loader_environment_clean!==true||
    !Array.isArray(value.dangerous_environment_names_present)||
    value.dangerous_environment_names_present.length!==0
  ){
    fail("apollyon_claim_service_least_authority_v2_loader_environment_invalid");
  }
  if(value.no_new_privileges!==true){
    fail("apollyon_claim_service_least_authority_v2_no_new_privileges_required");
  }
  for(const key of [
    "cap_inheritable","cap_permitted","cap_effective","cap_bounding","cap_ambient",
  ]){
    if(value[key]!=="0000000000000000"){
      fail("apollyon_claim_service_least_authority_v2_capabilities_not_empty:"+key);
    }
  }
  return Object.freeze({
    qualified:true,
    claim_uid:value.claim_uid,
    claim_gid:value.claim_gid,
    non_root_identity:true,
    numeric_identity_separation_verified:true,
    no_new_privileges:true,
    all_capability_sets_empty:true,
    supplementary_groups_closed:true,
    claim_ipc_membership_exact:true,
    loader_environment_clean:true,
    host_installation_performed:false,
    durable_attempt_claim_performed:false,
    training_execution_performed:false,
  });
}


export function qualifyApollyonDurableAttemptClaimPublisherLeastAuthorityV2(input){
  let value;
  try{
    value=structuredClone(input);
  }catch{
    fail("apollyon_claim_publisher_least_authority_v2_input_invalid");
  }
  exactKeys(
    value,
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_PUBLISHER_LEAST_AUTHORITY_KEYS_V2,
    "apollyon_claim_publisher_least_authority_v2_input_invalid",
  );
  for(const key of [
    "publisher_uid","publisher_gid","claim_uid","claim_gid","claim_ipc_gid",
    "training_uid","training_gid","custody_uid","custody_gid",
    "public_runtime_uid","public_runtime_gid",
    "interactive_operator_uid","interactive_operator_gid",
  ]){
    if(!Number.isSafeInteger(value[key])||value[key]<0||value[key]>65533){
      fail("apollyon_claim_publisher_least_authority_v2_numeric_identity_invalid");
    }
  }
  if(value.publisher_uid===0||value.publisher_gid===0||value.claim_ipc_gid===0){
    fail("apollyon_claim_publisher_least_authority_v2_root_identity_forbidden");
  }
  if(
    !Array.isArray(value.supplementary_gids)||
    value.supplementary_gids.length!==1||
    value.supplementary_gids[0]!==value.claim_ipc_gid||
    !Number.isSafeInteger(value.claim_ipc_gid)||value.claim_ipc_gid<1||value.claim_ipc_gid>65533
  ){
    fail("apollyon_claim_publisher_least_authority_v2_supplementary_groups_invalid");
  }
  for(const [label,observed] of [
    ["claim_uid",value.claim_uid],["training_uid",value.training_uid],
    ["custody_uid",value.custody_uid],["public_runtime_uid",value.public_runtime_uid],
    ["interactive_operator_uid",value.interactive_operator_uid],
  ]){
    if(value.publisher_uid===observed){
      fail("apollyon_claim_publisher_least_authority_v2_uid_collision:"+label);
    }
  }
  for(const [label,observed] of [
    ["claim_gid",value.claim_gid],["training_gid",value.training_gid],
    ["custody_gid",value.custody_gid],["public_runtime_gid",value.public_runtime_gid],
    ["interactive_operator_gid",value.interactive_operator_gid],
  ]){
    if(value.publisher_gid===observed){
      fail("apollyon_claim_publisher_least_authority_v2_gid_collision:"+label);
    }
    if(value.claim_ipc_gid===observed||value.claim_ipc_gid===value.publisher_gid){
      fail("apollyon_claim_publisher_least_authority_v2_claim_ipc_gid_collision:"+label);
    }
  }
  if(
    value.loader_environment_clean!==true||
    !Array.isArray(value.dangerous_environment_names_present)||
    value.dangerous_environment_names_present.length!==0
  ){
    fail("apollyon_claim_publisher_least_authority_v2_loader_environment_invalid");
  }
  if(value.no_new_privileges!==true){
    fail("apollyon_claim_publisher_least_authority_v2_no_new_privileges_required");
  }
  for(const key of [
    "cap_inheritable","cap_permitted","cap_effective","cap_bounding","cap_ambient",
  ]){
    if(value[key]!=="0000000000000000"){
      fail("apollyon_claim_publisher_least_authority_v2_capabilities_not_empty:"+key);
    }
  }
  for(const key of [
    "claim_root_write_denied","claim_root_rename_unlink_denied",
    "claim_service_control_denied","training_service_control_denied",
    "custody_service_control_denied","private_key_access_denied","wallet_access_denied",
    "signing_denied","publisher_process_exclusive","publisher_source_identity_reviewed",
  ]){
    if(value[key]!==true){
      fail("apollyon_claim_publisher_least_authority_v2_denial_or_identity_unproven:"+key);
    }
  }
  return Object.freeze({
    qualified:true,
    publisher_uid:value.publisher_uid,
    publisher_gid:value.publisher_gid,
    non_root_identity:true,
    numeric_identity_separation_verified:true,
    no_new_privileges:true,
    all_capability_sets_empty:true,
    loader_environment_clean:true,
    direct_claim_store_mutation_denied:true,
    broad_privileged_authority_denied:true,
    host_installation_performed:false,
    durable_attempt_claim_performed:false,
    training_execution_performed:false,
  });
}

const TERMINAL_KEYS=[
  "attempt_claim_authorized","attempt_claimed","authority","authorization_id",
  "binding_v2_blob_sha1","boot_id_sha256","candidate_weight_mutation_performed",
  "canonical_main","canonical_tree","claim_contract_id","consumed_directory_identity_sha256",
  "corpus_sha256","current_host_revalidation_required","current_v2_live_qualification_id",
  "custody_generation_id","custody_record_sha256","durable_attempt_claim_performed",
  "durable_attempt_claim_required","inner_live_binding_alone_sufficient_for_executor",
  "installed_isolation_qualification_id","live_binding_id","live_host_observation_performed",
  "live_service_source_identity_proven","loader_environment_clean","marker","next_gate",
  "operator_public_key_raw_sha256","parent_adapter_sha256","preclaim_id",
  "protected_runner_origin_proven","protected_runner_origin_required",
  "request_sha256","revalidation_identity_hashes_carried","runner_v2_blob_sha1",
  "same_live_custody_session_binding_proven","service_process_identity_sha256",
  "socket_identity_sha256","state_root_identity_sha256","status",
  "target_host","terminal_receipt_id","terminal_runner_receipt_digest_carried",
  "terminal_runner_receipt_sha256","terminal_shutdown_authority_proven",
  "terminal_shutdown_evidence_shape_qualified","training_execution_authorized",
  "training_execution_performed","training_generation_absent_after","training_pid",
  "training_process_start_time_ticks","training_service_exact_dormant_after","version",
];


function validateApollyonDurableAttemptClaimRecordShapeOnlyV2(record){
  exactKeys(
    record,
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_KEYS_V2,
    "apollyon_claim_record_v2_schema_invalid",
  );
  if(
    record.marker!=="VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_V2"||
    record.version!==2||
    record.status!=="durable_candidate_training_attempt_claim_record_v2"||
    !STORE_CONTRACT_ID.test(record.store_contract_id)||
    !STORE_POLICY_ID.test(record.store_policy_id)||
    !STORE_GENERATION_ID.test(record.store_generation_id)||
    !TERMINAL_ID.test(record.terminal_receipt_id)||
    !HASH64.test(record.terminal_runner_receipt_sha256)||
    !AUTH_ID.test(record.authorization_id)||
    !GENERATION_ID.test(record.custody_generation_id)||
    !HASH64.test(record.custody_record_sha256)||
    !HASH64.test(record.request_sha256)||
    !GIT40.test(record.canonical_main)||!GIT40.test(record.canonical_tree)||
    !HASH64.test(record.corpus_sha256)||!HASH64.test(record.parent_adapter_sha256)||
    !HASH64.test(record.operator_public_key_raw_sha256)||
    record.attempt_limit!==1||
    record.automatic_retry_authorized!==false||
    !CLAIM_RECORD_ID.test(record.claim_record_id)
  ){
    fail("apollyon_claim_record_v2_schema_invalid");
  }
  const material=structuredClone(record);
  delete material.claim_record_id;
  const expected="apollyon_attempt_claim_record_v2:"+
    sha256(Buffer.from(canonical(material),"utf8"));
  if(record.claim_record_id!==expected){
    fail("apollyon_claim_record_v2_id_invalid");
  }
  return Object.freeze(structuredClone(record));
}

export function qualifyApollyonDurableAttemptClaimRecordShapeV2(input){
  let snapshot;
  try{
    snapshot=structuredClone(input);
  }catch{
    fail("apollyon_claim_record_v2_input_invalid");
  }
  exactKeys(
    snapshot,
    ["claim_record","store_contract_id","store_generation_id","store_policy_id","terminal_receipt"],
    "apollyon_claim_record_v2_input_invalid",
  );
  if(!STORE_CONTRACT_ID.test(snapshot.store_contract_id)||
     !STORE_POLICY_ID.test(snapshot.store_policy_id)||
     !STORE_GENERATION_ID.test(snapshot.store_generation_id)){
    fail("apollyon_claim_record_v2_input_invalid");
  }
  const terminal=validateTerminalReceipt(snapshot.terminal_receipt);
  const derivedStore=
    qualifyApollyonDurableAttemptClaimStoreContractV2({
      terminal_receipt:snapshot.terminal_receipt,
    });
  if(snapshot.store_contract_id!==derivedStore.store_contract_id){
    fail("apollyon_claim_record_v2_store_contract_derivation_invalid");
  }
  if(snapshot.store_policy_id!==derivedStore.store_policy_id){
    fail("apollyon_claim_record_v2_store_policy_derivation_invalid");
  }
  const record=validateApollyonDurableAttemptClaimRecordShapeOnlyV2(
    snapshot.claim_record,
  );
  for(const [key,expected] of [
    ["store_contract_id",snapshot.store_contract_id],
    ["store_policy_id",snapshot.store_policy_id],
    ["store_generation_id",snapshot.store_generation_id],
    ["terminal_receipt_id",terminal.terminal_receipt_id],
    ["terminal_runner_receipt_sha256",terminal.terminal_runner_receipt_sha256],
    ["authorization_id",terminal.authorization_id],
    ["custody_generation_id",terminal.custody_generation_id],
    ["custody_record_sha256",terminal.custody_record_sha256],
    ["request_sha256",terminal.request_sha256],
    ["canonical_main",terminal.canonical_main],
    ["canonical_tree",terminal.canonical_tree],
    ["corpus_sha256",terminal.corpus_sha256],
    ["parent_adapter_sha256",terminal.parent_adapter_sha256],
    ["operator_public_key_raw_sha256",terminal.operator_public_key_raw_sha256],
  ]){
    if(record[key]!==expected){
      fail("apollyon_claim_record_v2_cross_binding_invalid:"+key);
    }
  }
  return record;
}

export function qualifyApollyonDurableAttemptClaimSuccessResponseShapeV2(input){
  let snapshot;
  try{
    snapshot=structuredClone(input);
  }catch{
    fail("apollyon_claim_success_response_v2_input_invalid");
  }
  exactKeys(
    snapshot,
    ["claim_record","publish_request_sha256","success_response"],
    "apollyon_claim_success_response_v2_input_invalid",
  );
  const record=validateApollyonDurableAttemptClaimRecordShapeOnlyV2(
    snapshot.claim_record,
  );
  if(!HASH64.test(snapshot.publish_request_sha256)){
    fail("apollyon_claim_success_response_v2_input_invalid");
  }
  const value=snapshot.success_response;
  exactKeys(
    value,
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SUCCESS_RESPONSE_KEYS_V2,
    "apollyon_claim_success_response_v2_schema_invalid",
  );
  if(
    value.marker!=="VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RESPONSE_V2"||
    value.version!==2||
    value.status!=="durable_claim_success_v2"||
    !["created_durable","recovered_existing_exact_durable"].includes(value.outcome)||
    value.store_contract_id!==record.store_contract_id||
    value.store_policy_id!==record.store_policy_id||
    value.store_generation_id!==record.store_generation_id||
    value.terminal_receipt_id!==record.terminal_receipt_id||
    value.authorization_id!==record.authorization_id||
    value.custody_generation_id!==record.custody_generation_id||
    value.claim_record_id!==record.claim_record_id||
    value.claim_record_sha256!==
      sha256(Buffer.from(canonical(record)+"\n","utf8"))||
    value.publish_request_sha256!==snapshot.publish_request_sha256||
    value.durability_proven!==true||
    value.final_visible_record_revalidated!==true||
    value.training_start_admission!==false||
    value.training_start_consumption_required!==true||
    value.training_start_consumption_performed!==false||
    value.next_gate!=="apollyon_training_start_consumption_v1"
  ){
    fail("apollyon_claim_success_response_v2_schema_invalid");
  }
  return Object.freeze(structuredClone(value));
}

export function qualifyApollyonDurableAttemptClaimFailureResponseShapeV2(input){
  let snapshot;
  try{
    snapshot=structuredClone(input);
  }catch{
    fail("apollyon_claim_failure_response_v2_input_invalid");
  }
  exactKeys(
    snapshot,
    [
      "authorization_id","failure_response","publish_request_sha256",
      "store_contract_id","store_generation_id","store_policy_id","terminal_receipt_id",
    ],
    "apollyon_claim_failure_response_v2_input_invalid",
  );
  if(
    !AUTH_ID.test(snapshot.authorization_id)||
    !HASH64.test(snapshot.publish_request_sha256)||
    !STORE_CONTRACT_ID.test(snapshot.store_contract_id)||
    !STORE_POLICY_ID.test(snapshot.store_policy_id)||
    !STORE_GENERATION_ID.test(snapshot.store_generation_id)||
    !TERMINAL_ID.test(snapshot.terminal_receipt_id)
  ){
    fail("apollyon_claim_failure_response_v2_input_invalid");
  }
  const value=snapshot.failure_response;
  exactKeys(
    value,
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_FAILURE_RESPONSE_KEYS_V2,
    "apollyon_claim_failure_response_v2_schema_invalid",
  );
  if(
    value.marker!=="VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RESPONSE_V2"||
    value.version!==2||
    !["rejected","duplicate","indeterminate"].includes(value.status)||
    typeof value.reason!=="string"||
    !/^[a-z0-9_.:-]{1,120}$/u.test(value.reason)||
    value.store_contract_id!==snapshot.store_contract_id||
    value.store_policy_id!==snapshot.store_policy_id||
    value.store_generation_id!==snapshot.store_generation_id||
    value.terminal_receipt_id!==snapshot.terminal_receipt_id||
    value.authorization_id!==snapshot.authorization_id||
    value.publish_request_sha256!==snapshot.publish_request_sha256||
    value.durability_proven!==false||
    value.training_start_admission!==false
  ){
    fail("apollyon_claim_failure_response_v2_schema_invalid");
  }
  return Object.freeze(structuredClone(value));
}

function validateApollyonDurableAttemptClaimStoreGenerationRecordV2(value){
  exactKeys(
    value,
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
    "apollyon_claim_store_generation_record_v2_invalid",
  );
  const reviewedPolicyId=
    qualifyApollyonDurableAttemptClaimStorePolicyV2().store_policy_id;
  if(
    value.marker!=="VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_V2"||
    value.store_policy_id!==reviewedPolicyId||
    value.version!==2||
    value.status!=="durable_attempt_claim_store_generation_v2"||
    !STORE_POLICY_ID.test(value.store_policy_id)||
    !STORE_GENERATION_ID.test(value.store_generation_id)||
    !HASH64.test(value.root_identity_sha256)||
    typeof value.genesis!=="boolean"||
    !Number.isSafeInteger(value.claim_history_count)||value.claim_history_count<0||
    !HASH64.test(value.claim_history_sha256)||
    !Number.isSafeInteger(value.generation_lineage_count)||value.generation_lineage_count<1||
    !HASH64.test(value.generation_lineage_sha256)||
    !CONTINUITY_RECEIPT_ID.test(value.continuity_receipt_id)||
    !STORE_GENERATION_RECORD_ID.test(value.store_generation_record_id)
  ){
    fail("apollyon_claim_store_generation_record_v2_invalid");
  }
  if(value.genesis){
    if(value.predecessor_store_generation_id!==null){
      fail("apollyon_claim_store_generation_record_v2_invalid");
    }
  }else if(!STORE_GENERATION_ID.test(value.predecessor_store_generation_id)){
    fail("apollyon_claim_store_generation_record_v2_invalid");
  }
  const material=structuredClone(value);
  delete material.store_generation_record_id;
  const expected="apollyon_claim_store_generation_record_v2:"+
    sha256(Buffer.from(canonical(material),"utf8"));
  if(value.store_generation_record_id!==expected){
    fail("apollyon_claim_store_generation_record_v2_id_invalid");
  }
  return Object.freeze(structuredClone(value));
}

export function qualifyApollyonDurableAttemptClaimHistoryContinuityShapeV2(input){
  let snapshot;
  try{
    snapshot=structuredClone(input);
  }catch{
    fail("apollyon_claim_store_continuity_v2_input_invalid");
  }
  exactKeys(
    snapshot,
    ["continuity_receipt","predecessor_generation_record","prior_claim_records","prior_generation_ids"],
    "apollyon_claim_store_continuity_v2_input_invalid",
  );
  if(
    !Array.isArray(snapshot.prior_claim_records)||
    !Array.isArray(snapshot.prior_generation_ids)
  ){
    fail("apollyon_claim_store_continuity_v2_input_invalid");
  }
  const lineage=[...snapshot.prior_generation_ids];
  if(
    lineage.some(value=>!STORE_GENERATION_ID.test(value))||
    new Set(lineage).size!==lineage.length
  ){
    fail("apollyon_claim_store_continuity_v2_generation_lineage_invalid");
  }
  const sortedLineage=[...lineage].sort();
  const lineageSha=sha256(Buffer.from(canonical(sortedLineage),"utf8"));
  const records=snapshot.prior_claim_records.map(
    validateApollyonDurableAttemptClaimRecordShapeOnlyV2,
  );
  const sorted=[...records].sort((a,b)=>a.claim_record_id.localeCompare(b.claim_record_id));
  if(new Set(sorted.map(x=>x.claim_record_id)).size!==sorted.length){
    fail("apollyon_claim_store_continuity_v2_duplicate_claim_record");
  }
  if(new Set(sorted.map(x=>x.authorization_id)).size!==sorted.length){
    fail("apollyon_claim_store_continuity_v2_authorization_replay");
  }
  const historySha=sha256(Buffer.from(canonical(sorted),"utf8"));
  const receipt=snapshot.continuity_receipt;
  const reviewedPolicyId=
    qualifyApollyonDurableAttemptClaimStorePolicyV2().store_policy_id;
  exactKeys(
    receipt,
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_CONTINUITY_RECEIPT_KEYS_V2,
    "apollyon_claim_store_continuity_v2_receipt_invalid",
  );
  if(
    receipt.marker!=="VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTINUITY_V2"||
    receipt.version!==2||
    receipt.status!=="durable_attempt_claim_store_history_continuity_v2"||
    !STORE_POLICY_ID.test(receipt.store_policy_id)||
    receipt.store_policy_id!==reviewedPolicyId||
    !STORE_GENERATION_ID.test(receipt.new_store_generation_id)||
    !HASH64.test(receipt.new_root_identity_sha256)||
    typeof receipt.genesis!=="boolean"||
    receipt.claim_set_order!=="claim_record_id_lexicographic"||
    receipt.generation_lineage_order!=="store_generation_id_lexicographic"||
    receipt.prior_claim_count!==sorted.length||
    receipt.prior_claim_set_sha256!==historySha||
    receipt.prior_generation_lineage_count!==sortedLineage.length||
    receipt.prior_generation_lineage_sha256!==lineageSha||
    !Number.isSafeInteger(receipt.new_generation_lineage_count)||
    receipt.new_generation_lineage_count<1||
    !HASH64.test(receipt.new_generation_lineage_sha256)||
    !AUTH_ID.test(receipt.fresh_authorization_id)||
    !CONTINUITY_RECEIPT_ID.test(receipt.continuity_receipt_id)
  ){
    fail("apollyon_claim_store_continuity_v2_receipt_invalid");
  }
  if(sorted.some(record=>record.authorization_id===receipt.fresh_authorization_id)){
    fail("apollyon_claim_store_continuity_v2_fresh_authorization_reused");
  }
  if(sorted.some(record=>record.store_policy_id!==receipt.store_policy_id)){
    fail("apollyon_claim_store_continuity_v2_store_policy_mismatch");
  }
  const priorLineageSet=new Set(sortedLineage);
  const newLineage=[...sortedLineage,receipt.new_store_generation_id].sort();
  const newLineageSha=sha256(Buffer.from(canonical(newLineage),"utf8"));
  if(
    priorLineageSet.has(receipt.new_store_generation_id)||
    receipt.new_generation_lineage_count!==newLineage.length||
    receipt.new_generation_lineage_sha256!==newLineageSha
  ){
    fail("apollyon_claim_store_continuity_v2_new_generation_lineage_invalid");
  }
  if(sorted.some(record=>!priorLineageSet.has(record.store_generation_id))){
    fail("apollyon_claim_store_continuity_v2_record_generation_not_in_lineage");
  }
  if(receipt.genesis){
    if(
      receipt.old_store_generation_id!==null||
      receipt.old_root_identity_sha256!==null||
      receipt.predecessor_generation_record_id!==null||
      sorted.length!==0||
      sortedLineage.length!==0||
      receipt.prior_generation_lineage_count!==0||
      receipt.prior_generation_lineage_sha256!==sha256(Buffer.from(canonical([]),"utf8"))||
      snapshot.predecessor_generation_record!==null
    ){
      fail("apollyon_claim_store_continuity_v2_genesis_invalid");
    }
  }else{
    if(
      !STORE_GENERATION_ID.test(receipt.old_store_generation_id)||
      !HASH64.test(receipt.old_root_identity_sha256)||
      !STORE_GENERATION_RECORD_ID.test(receipt.predecessor_generation_record_id)||
      snapshot.predecessor_generation_record===null||
      receipt.old_store_generation_id===receipt.new_store_generation_id||
      receipt.old_root_identity_sha256===receipt.new_root_identity_sha256
    ){
      fail("apollyon_claim_store_continuity_v2_migration_invalid");
    }
    const predecessor=validateApollyonDurableAttemptClaimStoreGenerationRecordV2(
      snapshot.predecessor_generation_record,
    );
    if(
      predecessor.store_policy_id!==receipt.store_policy_id||
      predecessor.store_generation_id!==receipt.old_store_generation_id||
      predecessor.store_generation_record_id!==receipt.predecessor_generation_record_id||
      predecessor.root_identity_sha256!==receipt.old_root_identity_sha256||
      predecessor.claim_history_count!==sorted.length||
      predecessor.claim_history_sha256!==historySha||
      predecessor.generation_lineage_count!==sortedLineage.length||
      predecessor.generation_lineage_sha256!==lineageSha||
      !priorLineageSet.has(predecessor.store_generation_id)||
      (!predecessor.genesis&&
        !priorLineageSet.has(predecessor.predecessor_store_generation_id))
    ){
      fail("apollyon_claim_store_continuity_v2_predecessor_mismatch");
    }
  }
  const material=structuredClone(receipt);
  delete material.continuity_receipt_id;
  const expected="apollyon_claim_store_continuity_v2:"+
    sha256(Buffer.from(canonical(material),"utf8"));
  if(receipt.continuity_receipt_id!==expected){
    fail("apollyon_claim_store_continuity_v2_id_invalid");
  }
  return Object.freeze({
    lineage_shape_qualified:true,
    continuity_receipt:Object.freeze(structuredClone(receipt)),
    store_policy_id:receipt.store_policy_id,
    protected_generation_lineage_origin_required:true,
    protected_generation_lineage_origin_proven:false,
    host_qualification_required_for_lineage_authority:true,
    durable_attempt_claim_performed:false,
    training_execution_performed:false,
  });
}

function validateTerminalReceipt(value){
  exactKeys(value,TERMINAL_KEYS,"apollyon_claim_store_contract_v2_terminal_invalid");
  if(
    value.marker!=="VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_V2"||
    value.version!==2||
    value.status!=="live_source_session_terminal_shutdown_qualified_unclaimed"||
    value.target_host!=="Xiphos"||
    value.runner_v2_blob_sha1!=="8c2c92055ab05c074653cee971e095934b5cb85c"||
    value.binding_v2_blob_sha1!=="5ee36c89275c29b008094ad030b8664ed9d7b60b"||
    !TERMINAL_ID.test(value.terminal_receipt_id)||
    !LIVE_BINDING_ID.test(value.live_binding_id)||
    !CLAIM_ID.test(value.claim_contract_id)||
    !PRECLAIM_ID.test(value.preclaim_id)||
    !LIVE_V2_ID.test(value.current_v2_live_qualification_id)||
    !ISOLATION_ID.test(value.installed_isolation_qualification_id)||
    !AUTH_ID.test(value.authorization_id)||
    !GENERATION_ID.test(value.custody_generation_id)||
    !HASH64.test(value.custody_record_sha256)||
    !HASH64.test(value.request_sha256)||
    !GIT40.test(value.canonical_main)||!GIT40.test(value.canonical_tree)||
    !HASH64.test(value.corpus_sha256)||!HASH64.test(value.parent_adapter_sha256)||
    !HASH64.test(value.operator_public_key_raw_sha256)||
    !HASH64.test(value.state_root_identity_sha256)||
    !HASH64.test(value.consumed_directory_identity_sha256)||
    !HASH64.test(value.socket_identity_sha256)||
    !HASH64.test(value.service_process_identity_sha256)||
    !HASH64.test(value.terminal_runner_receipt_sha256)||
    !HASH64.test(value.boot_id_sha256)||
    !Number.isSafeInteger(value.training_pid)||value.training_pid<=0||
    typeof value.training_process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(value.training_process_start_time_ticks)||
    value.next_gate!=="durable_candidate_training_attempt_claim_executor_v2"
  )fail("apollyon_claim_store_contract_v2_terminal_invalid");

  requireTrue(value,[
    "loader_environment_clean","live_service_source_identity_proven",
    "same_live_custody_session_binding_proven",
    "terminal_shutdown_evidence_shape_qualified",
    "training_service_exact_dormant_after","training_generation_absent_after",
    "current_host_revalidation_required","revalidation_identity_hashes_carried",
    "terminal_runner_receipt_digest_carried","protected_runner_origin_required",
    "durable_attempt_claim_required",
  ],"apollyon_claim_store_contract_v2_terminal_invalid");
  requireFalse(value,[
    "terminal_shutdown_authority_proven",
    "inner_live_binding_alone_sufficient_for_executor",
    "protected_runner_origin_proven","live_host_observation_performed",
    "durable_attempt_claim_performed","attempt_claim_authorized","attempt_claimed",
    "training_execution_authorized","training_execution_performed",
    "candidate_weight_mutation_performed",
  ],"apollyon_claim_store_contract_v2_terminal_invalid");
  exactKeys(
    value.authority,
    Object.keys(VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2),
    "apollyon_claim_store_contract_v2_terminal_authority_invalid",
  );
  if(canonical(value.authority)!==
     canonical(VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2)){
    fail("apollyon_claim_store_contract_v2_terminal_authority_invalid");
  }

  const material=structuredClone(value);
  delete material.terminal_receipt_id;
  delete material.authority;
  const expected="apollyon_terminal_receipt_v2:"+
    sha256(Buffer.from(canonical(material),"utf8"));
  if(expected!==value.terminal_receipt_id){
    fail("apollyon_claim_store_contract_v2_terminal_id_invalid");
  }
  return Object.freeze(structuredClone(value));
}

export function qualifyApollyonDurableAttemptClaimStorePolicyV2(){
  const material={
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_POLICY_V2,
    version:2,
    requirements:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2,
  };
  return Object.freeze({
    ...material,
    store_policy_id:"apollyon_claim_store_policy_v2:"+
      sha256(Buffer.from(canonical(material),"utf8")),
  });
}

export function qualifyApollyonDurableAttemptClaimStoreContractV2(input){
  let snapshot;
  try{
    snapshot=structuredClone(input);
  }catch{
    fail("apollyon_claim_store_contract_v2_input_invalid");
  }
  exactKeys(snapshot,["terminal_receipt"],"apollyon_claim_store_contract_v2_input_invalid");
  const terminal=validateTerminalReceipt(snapshot.terminal_receipt);
  const policy=qualifyApollyonDurableAttemptClaimStorePolicyV2();

  const material={
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_V2,
    version:2,
    status:"protected_attempt_claim_store_requirements_defined_uninstalled",
    target_host:"Xiphos",
    terminal_receipt_v2_blob_sha1:TERMINAL_RECEIPT_V2_BLOB_SHA1,
    canonicalizer_v1_blob_sha1:CANONICALIZER_V1_BLOB_SHA1,
    store_policy_id:policy.store_policy_id,
    terminal_receipt_id:terminal.terminal_receipt_id,
    terminal_runner_receipt_sha256:terminal.terminal_runner_receipt_sha256,
    live_binding_id:terminal.live_binding_id,
    claim_contract_id:terminal.claim_contract_id,
    authorization_id:terminal.authorization_id,
    custody_generation_id:terminal.custody_generation_id,
    custody_record_sha256:terminal.custody_record_sha256,
    request_sha256:terminal.request_sha256,
    canonical_main:terminal.canonical_main,
    canonical_tree:terminal.canonical_tree,
    corpus_sha256:terminal.corpus_sha256,
    parent_adapter_sha256:terminal.parent_adapter_sha256,
    operator_public_key_raw_sha256:terminal.operator_public_key_raw_sha256,
    state_root_identity_sha256:terminal.state_root_identity_sha256,
    consumed_directory_identity_sha256:terminal.consumed_directory_identity_sha256,
    socket_identity_sha256:terminal.socket_identity_sha256,
    service_process_identity_sha256:terminal.service_process_identity_sha256,
    training_pid:terminal.training_pid,
    training_process_start_time_ticks:terminal.training_process_start_time_ticks,
    boot_id_sha256:terminal.boot_id_sha256,
    terminal_receipt_shape_bound:true,
    terminal_receipt_source_origin_proven:false,
    protected_runner_origin_required:true,
    protected_runner_origin_proven:false,
    current_host_revalidation_required:true,
    current_host_revalidation_performed:false,
    exact_v2_custody_record_revalidation_required:true,
    exact_v2_custody_record_revalidation_performed:false,
    exact_v2_custody_generation_revalidation_required:true,
    exact_v2_custody_generation_revalidation_performed:false,
    protected_claim_store_required:true,
    protected_claim_store_proven:false,
    claim_identity_bound:false,
    claim_root_bound:false,
    host_installation_performed:false,
    durable_attempt_claim_required:true,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    requirements:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2,
    next_gate:"apollyon_durable_attempt_claim_store_host_qualification_v2",
    executor_gate_after_host_qualification:
      "durable_candidate_training_attempt_claim_executor_v2",
  };
  return Object.freeze({
    ...material,
    store_contract_id:"apollyon_claim_store_contract_v2:"+
      sha256(Buffer.from(canonical(material),"utf8")),
    authority:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_AUTHORITY_V2,
  });
}
