#!/usr/bin/env node
import crypto from "node:crypto";
import {
  qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2,
} from "./apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs";
import {
  ACCEPTED_STORE_POLICY_ID,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_MARKER_V2,
} from "./apollyon-durable-attempt-claim-request-envelope-v2.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REVALIDATION_HANDOFF_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REVALIDATION_HANDOFF_V2";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REVALIDATION_HANDOFF_AUTHORITY_V2 =
  Object.freeze({
    source_only_contract:true,
    exact_parent_request_envelope_required:true,
    exact_parent_service_candidate_required:true,
    exact_parent_store_contract_required:true,
    reviewed_kernel_peer_pattern_reference_only:true,
    request_schema_unchanged:true,
    bearer_token_or_attestation_added:false,
    privileged_revalidator_implementation_present:false,
    publisher_implementation_present:false,
    service_implementation_present:false,
    kernel_peer_authentication_performed:false,
    pidfd_generation_revalidation_performed:false,
    privileged_current_host_revalidation_performed:false,
    terminal_receipt_revalidation_performed:false,
    custody_record_revalidation_performed:false,
    protected_runner_origin_proven:false,
    host_installation:false,
    filesystem_read:false,
    filesystem_write:false,
    account_mutation:false,
    group_mutation:false,
    systemd_mutation:false,
    service_action:false,
    socket_action:false,
    network_access:false,
    durable_attempt_claim:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution:false,
    candidate_weight_mutation:false,
    credential_access:false,
    private_key_access:false,
    signing:false,
    wallet_access:false,
    transaction:false,
    funds_movement:false,
  });

export const PARENT_REQUEST_ENVELOPE_BLOB_SHA1 =
  "498dec49189d1ceeda2702cf608d423a6fd1450b";
export const PARENT_SERVICE_CANDIDATE_BLOB_SHA1 =
  "bbd02403695eecca3f07fd54e382b44b0d9b14e7";
export const PARENT_STORE_CONTRACT_BLOB_SHA1 =
  "6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe";
export const REVIEWED_KERNEL_PEER_PATTERN_BLOB_SHA1 =
  "d8b30ac499c3bb8a5d223dbc6be687dd175be611";

const EXPECTED_FIXED_IDENTITIES=Object.freeze({
  claim_service_user:"voidapollyonclaim",
  claim_service_group:"voidapollyonclaim",
  claim_publisher_user:"voidapollyonclaimpub",
  claim_publisher_group:"voidapollyonclaimpub",
  claim_ipc_group:"voidapollyonclaimipc",
});
const EXPECTED_FIXED_PATHS=Object.freeze({
  claim_state_root:"/var/lib/void-apollyon-attempt-claim-v2",
  claim_socket_parent:"/run/void-apollyon-attempt-claim-v2",
  claim_socket:"/run/void-apollyon-attempt-claim-v2/claim.sock",
  claim_service_unit:"/etc/systemd/system/void-apollyon-attempt-claim-v2.service",
  claim_service_source_root:"/opt/void-apollyon-attempt-claim-v2-reviewed-v1",
  claim_publisher_source_root:"/opt/void-apollyon-attempt-claim-publisher-v2-reviewed-v1",
});

function fail(code){throw new Error(code);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function canonicalize(value){
  if(value===null||typeof value==="string"||typeof value==="boolean")return value;
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value))fail("apollyon_claim_handoff_v2_noncanonical_number");
    return value;
  }
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort())out[key]=canonicalize(value[key]);
    return out;
  }
  fail("apollyon_claim_handoff_v2_noncanonical_value");
}
export function canonicalApollyonDurableAttemptClaimRevalidationHandoffV2(value){
  return JSON.stringify(canonicalize(value));
}
function deepFreeze(value){
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const child of Object.values(value))deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function exactObject(value,expected,code){
  if(
    canonicalApollyonDurableAttemptClaimRevalidationHandoffV2(value)!==
    canonicalApollyonDurableAttemptClaimRevalidationHandoffV2(expected)
  )fail(code);
}

export function qualifyApollyonDurableAttemptClaimRevalidationHandoffV2(){
  const candidate=qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2();
  if(candidate.store_policy_id!==ACCEPTED_STORE_POLICY_ID){
    fail("apollyon_claim_handoff_v2_store_policy_mismatch");
  }
  exactObject(
    candidate.fixed_identities,EXPECTED_FIXED_IDENTITIES,
    "apollyon_claim_handoff_v2_fixed_identities_mismatch",
  );
  exactObject(
    candidate.fixed_paths,EXPECTED_FIXED_PATHS,
    "apollyon_claim_handoff_v2_fixed_paths_mismatch",
  );
  if(
    candidate.authority?.attempt_claim_authorized!==false||
    candidate.authority?.attempt_claimed!==false||
    candidate.authority?.training_execution_authorized!==false||
    candidate.authority?.training_execution!==false
  )fail("apollyon_claim_handoff_v2_parent_authority_invalid");

  const material={
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REVALIDATION_HANDOFF_V2,
    version:2,
    status:"privileged_revalidation_handoff_source_contract_defined_unimplemented",
    target_host:"Xiphos",
    parent_request_envelope_blob_sha1:PARENT_REQUEST_ENVELOPE_BLOB_SHA1,
    parent_service_candidate_blob_sha1:PARENT_SERVICE_CANDIDATE_BLOB_SHA1,
    parent_store_contract_blob_sha1:PARENT_STORE_CONTRACT_BLOB_SHA1,
    reviewed_kernel_peer_pattern_blob_sha1:REVIEWED_KERNEL_PEER_PATTERN_BLOB_SHA1,
    store_policy_id:ACCEPTED_STORE_POLICY_ID,
    fixed_identities:structuredClone(EXPECTED_FIXED_IDENTITIES),
    fixed_paths:structuredClone(EXPECTED_FIXED_PATHS),
    request_protocol:{
      request_marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_MARKER_V2,
      request_version:2,
      request_method:"publish_claim_v2",
      exact_six_key_request_preserved:true,
      canonical_utf8_single_lf_preserved:true,
      publish_request_sha256_preserved:true,
      request_schema_additional_provenance_fields_forbidden:true,
      bearer_attestation_or_token_forbidden:true,
      provenance_out_of_band_kernel_channel_required:true,
    },
    provenance_connections:{
      same_fixed_claim_socket_required:true,
      connection_roles:Object.freeze([
        "privileged_revalidator_control",
        "publisher_request",
      ]),
      privileged_revalidator_control_carries_claim_body:false,
      privileged_revalidator_control_can_publish_claim:false,
      publisher_request_is_only_claim_body_role:true,
      claim_service_so_peercred_before_any_request_body_required:true,
      publisher_authenticates_claim_service_before_request_body_required:true,
      claim_service_socket_and_process_stability_revalidation_required:true,
      revalidator_peer_uid:0,
      revalidator_peer_gid:0,
      revalidator_supplementary_groups_empty_required:true,
      revalidator_pidfd_retained_required:true,
      publisher_pidfd_retained_required:true,
      revalidator_start_ticks_bound_required:true,
      publisher_start_ticks_bound_required:true,
      revalidator_source_identity_exact_required:true,
      publisher_source_identity_exact_required:true,
      root_not_implicitly_authorized_to_publish:true,
      unauthorized_peer_rejected_before_body_read_required:true,
      source_identity_live_mechanism_host_qualification_required:true,
    },
    parent_child_lineage:{
      revalidator_must_spawn_publisher_directly:true,
      request_bytes_validated_before_publisher_spawn_required:true,
      publisher_request_bytes_must_come_only_from_revalidator_required:true,
      revalidator_to_publisher_private_inherited_descriptor_required:true,
      publisher_request_input_descriptor_number_fixed_before_install_required:true,
      publisher_request_from_argv_forbidden:true,
      publisher_request_from_environment_forbidden:true,
      publisher_request_from_stdin_forbidden:true,
      publisher_request_from_filesystem_forbidden:true,
      publisher_request_from_network_forbidden:true,
      publisher_forwards_exact_revalidator_validated_canonical_bytes_required:true,
      publisher_recanonicalization_or_request_reconstruction_forbidden:true,
      publisher_ppid_must_equal_authenticated_revalidator_pid:true,
      provenance_session_pairing_binds_both_pid_start_generations_required:true,
      publisher_uid_gid_from_fresh_host_plan_required:true,
      publisher_supplementary_groups_claim_ipc_only_required:true,
      publisher_no_new_privileges_required:true,
      publisher_all_capability_sets_empty_required:true,
      publisher_loader_environment_clean_required:true,
      publisher_process_exclusivity_required:true,
      revalidator_must_remain_live_through_success_ack:true,
      publisher_must_remain_live_through_request_response_required:true,
      both_process_generations_rechecked_before_body_read_required:true,
      both_process_generations_rechecked_before_store_mutation_required:true,
      both_process_generations_rechecked_before_success_ack_required:true,
    },
    privileged_revalidation:{
      exact_request_envelope_revalidation_before_publisher_spawn_required:true,
      exact_terminal_receipt_material_required:true,
      protected_runner_origin_revalidation_required:true,
      current_training_service_exact_dormancy_revalidation_required:true,
      prior_training_generation_absence_revalidation_required:true,
      current_custody_service_session_identity_revalidation_required:true,
      exact_custody_consumed_record_revalidation_required:true,
      authorization_id_cross_binding_required:true,
      custody_generation_id_cross_binding_required:true,
      custody_record_sha256_cross_binding_required:true,
      terminal_receipt_id_cross_binding_required:true,
      terminal_runner_receipt_sha256_cross_binding_required:true,
      request_source_tree_corpus_adapter_operator_cross_binding_required:true,
      initial_privileged_revalidation_before_control_connect_required:true,
      serialized_privileged_attestation_or_bearer_token_forbidden:true,
    },
    fresh_prepublication_challenge:{
      challenge_after_publisher_request_parse_required:true,
      challenge_before_any_store_mutation_required:true,
      service_generated_random_challenge_required:true,
      challenge_source_kernel_csprng_required:true,
      challenge_bytes:32,
      challenge_frame_exact_bytes:32,
      challenge_frame_raw_binary_required:true,
      challenge_unique_per_provenance_session_required:true,
      challenge_timeout_ms:5000,
      retained_authenticated_revalidator_connection_required:true,
      control_connection_bytes_before_challenge_forbidden:true,
      revalidator_reruns_all_privileged_checks_after_challenge_required:true,
      revalidator_revalidates_exact_same_retained_request_bytes_after_challenge_required:true,
      response_frame_exact_bytes:64,
      response_frame_layout:
        "challenge_32_bytes_then_publish_request_sha256_raw_32_bytes",
      publish_request_sha256_hex_decode_exact_32_bytes_required:true,
      response_echoes_exact_challenge_required:true,
      response_binds_publish_request_sha256_required:true,
      response_trailing_or_extra_bytes_forbidden:true,
      exactly_one_challenge_response_per_session_required:true,
      provenance_session_exactly_one_publisher_request_required:true,
      provenance_session_reuse_forbidden:true,
      publisher_connection_after_authenticated_control_required:true,
      stale_prechallenge_revalidation_not_sufficient:true,
      challenge_response_is_live_channel_evidence_not_bearer_credential:true,
      challenge_failure_or_timeout_rejects_without_store_mutation_required:true,
    },
    mutation_and_ack_boundary:{
      privileged_handoff_does_not_replace_claim_service_local_prepublication_revalidation:true,
      all_parent_store_contract_local_prepublication_checks_remain_required:true,
      request_digest_must_match_fresh_revalidator_response_required:true,
      provenance_connections_must_remain_live_before_store_mutation_required:true,
      provenance_generation_drift_before_mutation_rejects_required:true,
      provenance_loss_after_mutation_must_not_return_success_required:true,
      success_ack_only_after_existing_store_durability_proof_required:true,
      provenance_generations_rechecked_before_success_ack_required:true,
      root_control_connection_never_receives_claim_success_as_authority_required:true,
      durable_claim_success_remains_not_training_start_admission_required:true,
    },
    future_host_qualification:{
      exact_revalidator_source_path_and_blob_must_be_fixed_before_install:true,
      exact_publisher_source_path_and_blob_must_be_fixed_before_install:true,
      kernel_so_peercred_supported_on_xiphos_must_be_proven:true,
      pidfd_open_and_liveness_supported_on_xiphos_must_be_proven:true,
      cross_uid_process_generation_source_identity_mechanism_must_be_proven:true,
      direct_parent_lineage_observation_must_be_proven:true,
      challenge_protocol_runtime_behavior_must_be_proven:true,
      this_source_contract_is_not_host_proof:true,
    },
    implementation_present:false,
    host_qualification_performed:false,
    kernel_peer_authentication_performed:false,
    pidfd_generation_revalidation_performed:false,
    privileged_revalidation_performed:false,
    challenge_exchange_performed:false,
    claim_store_mutation_performed:false,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    next_gate:"apollyon_durable_attempt_claim_store_service_source_implementation_v2",
    authority:
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REVALIDATION_HANDOFF_AUTHORITY_V2,
  };
  const idMaterial=structuredClone(material);
  const handoff_contract_id="apollyon_claim_revalidation_handoff_v2:"+
    sha256(Buffer.from(
      canonicalApollyonDurableAttemptClaimRevalidationHandoffV2(idMaterial),
      "utf8",
    ));
  return deepFreeze({...material,handoff_contract_id});
}
