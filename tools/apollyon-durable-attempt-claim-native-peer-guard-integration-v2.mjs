#!/usr/bin/env node
import crypto from "node:crypto";
import {
  qualifyApollyonDurableAttemptClaimRevalidationHandoffV2,
} from "./apollyon-durable-attempt-claim-revalidation-handoff-v2.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_INTEGRATION_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_INTEGRATION_V2";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_INTEGRATION_AUTHORITY_V2 =
  Object.freeze({
    source_only_contract:true,
    exact_parent_handoff_required:true,
    exact_native_peer_guard_source_required:true,
    native_peer_guard_runtime_integration_present:false,
    cross_uid_host_qualification_required:true,
    cross_uid_host_qualification_performed:false,
    direct_parent_lineage_required:true,
    interpreted_body_source_identity_still_required:true,
    service_publisher_revalidator_implementation_present:false,
    host_installation:false,
    filesystem_read:false,
    filesystem_write:false,
    account_mutation:false,
    group_mutation:false,
    systemd_mutation:false,
    service_action:false,
    socket_action:false,
    network_access:false,
    claim_store_mutation:false,
    durable_attempt_claim:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution:false,
    candidate_weight_mutation:false,
    private_key_access:false,
    signing:false,
    wallet_access:false,
    transaction:false,
    funds_movement:false,
  });

export const PARENT_HANDOFF_BLOB_SHA1 =
  "fab2b7699121b58010a5ed96ec50a47dd441726f";
export const NATIVE_PEER_GUARD_BLOB_SHA1 =
  "97639e6d2bc2f67281a4d7b3af5bfa2b59c5df51";
export const NATIVE_PEER_GUARD_PROOF_BLOB_SHA1 =
  "866c9dcac8f85de936ee537617ddf9b2904439f9";

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonicalize(value){
  if(value===null||typeof value==="string"||typeof value==="boolean")return value;
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value))throw new Error("apollyon_claim_peer_integration_v2_noncanonical_number");
    return value;
  }
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort())out[key]=canonicalize(value[key]);
    return out;
  }
  throw new Error("apollyon_claim_peer_integration_v2_noncanonical_value");
}
export function canonicalApollyonDurableAttemptClaimNativePeerGuardIntegrationV2(value){
  return JSON.stringify(canonicalize(value));
}
function deepFreeze(value){
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const child of Object.values(value))deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function requireTrue(value,keys,code){
  for(const key of keys)if(value?.[key]!==true)throw new Error(code);
}
function requireFalse(value,keys,code){
  for(const key of keys)if(value?.[key]!==false)throw new Error(code);
}

export function qualifyApollyonDurableAttemptClaimNativePeerGuardIntegrationV2(){
  const handoff=qualifyApollyonDurableAttemptClaimRevalidationHandoffV2();
  if(
    handoff.marker!=="VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REVALIDATION_HANDOFF_V2"||
    handoff.version!==2||
    handoff.status!=="privileged_revalidation_handoff_source_contract_defined_unimplemented"||
    handoff.target_host!=="Xiphos"||
    typeof handoff.handoff_contract_id!=="string"||
    !/^apollyon_claim_revalidation_handoff_v2:[0-9a-f]{64}$/u.test(handoff.handoff_contract_id)
  )throw new Error("apollyon_claim_peer_integration_v2_parent_handoff_invalid");
  requireTrue(handoff.future_host_qualification,[
    "kernel_so_peercred_supported_on_xiphos_must_be_proven",
    "pidfd_open_and_liveness_supported_on_xiphos_must_be_proven",
    "cross_uid_process_generation_source_identity_mechanism_must_be_proven",
    "exec_sensitive_source_identity_revalidation_must_be_proven",
    "direct_parent_lineage_observation_must_be_proven",
    "challenge_protocol_runtime_behavior_must_be_proven",
    "stream_response_half_close_eof_behavior_must_be_proven",
    "this_source_contract_is_not_host_proof",
  ],"apollyon_claim_peer_integration_v2_parent_host_requirements_invalid");
  requireFalse(handoff,[
    "implementation_present",
    "host_qualification_performed",
    "kernel_peer_authentication_performed",
    "pidfd_generation_revalidation_performed",
    "privileged_revalidation_performed",
    "challenge_exchange_performed",
    "claim_store_mutation_performed",
    "durable_attempt_claim_performed",
    "attempt_claim_authorized",
    "attempt_claimed",
    "training_execution_authorized",
    "training_execution_performed",
    "candidate_weight_mutation_performed",
  ],"apollyon_claim_peer_integration_v2_parent_authority_invalid");

  const material={
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_INTEGRATION_V2,
    version:2,
    status:"native_peer_guard_integration_source_contract_defined_unimplemented",
    target_host:"Xiphos",
    parent_handoff_blob_sha1:PARENT_HANDOFF_BLOB_SHA1,
    parent_handoff_contract_id:handoff.handoff_contract_id,
    native_peer_guard_blob_sha1:NATIVE_PEER_GUARD_BLOB_SHA1,
    native_peer_guard_proof_blob_sha1:NATIVE_PEER_GUARD_PROOF_BLOB_SHA1,
    store_policy_id:handoff.store_policy_id,
    fixed_identities:structuredClone(handoff.fixed_identities),
    fixed_paths:structuredClone(handoff.fixed_paths),
    native_candidate_boundary:{
      self_test_only_required:true,
      live_mode_present:false,
      same_uid_ephemeral_self_test_only:true,
      real_af_unix_so_peercred_primitive_required:true,
      retained_pidfd_live_state_primitive_required:true,
      retained_pidfd_exit_state_primitive_required:true,
      proc_start_ticks_generation_primitive_required:true,
      executable_inode_relation_primitive_required:true,
      exec_in_place_inode_drift_detection_primitive_required:true,
      exact_64_byte_response_frame_primitive_required:true,
      write_half_close_eof_primitive_required:true,
      extra_byte_rejection_primitive_required:true,
      short_eof_rejection_primitive_required:true,
      delayed_extra_rejection_primitive_required:true,
      exact_prefix_before_no_eof_timeout_primitive_required:true,
      held_open_no_eof_timeout_primitive_required:true,
      read_half_ack_after_peer_eof_primitive_required:true,
      cross_uid_host_qualification_performed:false,
      interpreted_body_source_identity_proven:false,
    },
    integration_requirements:{
      same_fixed_claim_socket_required:true,
      privileged_revalidator_and_publisher_roles_required:true,
      root_control_carries_claim_body:false,
      publisher_only_claim_body_role:true,
      service_so_peercred_before_body_read_required:true,
      publisher_authenticates_service_before_body_send_required:true,
      revalidator_and_publisher_pidfds_retained_required:true,
      revalidator_and_publisher_start_ticks_bound_required:true,
      direct_publisher_ppid_to_revalidator_required:true,
      direct_ppid_lineage_native_candidate_proven:false,
      cross_uid_generation_and_source_observation_required:true,
      cross_uid_generation_and_source_observation_proven:false,
      native_executable_inode_identity_required:true,
      interpreted_runtime_cmdline_and_script_identity_required:true,
      interpreted_runtime_cmdline_and_script_identity_proven:false,
      source_identity_rechecked_before_body_read_required:true,
      source_identity_rechecked_before_store_mutation_required:true,
      source_identity_rechecked_before_success_ack_required:true,
      pidfd_liveness_rechecked_before_body_read_required:true,
      pidfd_liveness_rechecked_before_store_mutation_required:true,
      pidfd_liveness_rechecked_before_success_ack_required:true,
      request_bytes_from_private_root_to_publisher_pipe_only_required:true,
      publisher_request_reconstruction_forbidden:true,
      exact_parent_challenge_layout_required:true,
      challenge_content_validation_required:true,
      exact_64_byte_response_and_eof_required:true,
      response_read_half_open_for_ack_required:true,
      provenance_session_exactly_one_publisher_request_required:true,
      provenance_session_reuse_forbidden:true,
      no_store_mutation_before_fresh_challenge_success_required:true,
      parent_local_prepublication_checks_remain_required:true,
      provenance_loss_after_possible_mutation_must_not_return_success_required:true,
    },
    future_implementation_gate:{
      claim_service_source_implementation_required:true,
      privileged_revalidator_source_implementation_required:true,
      publisher_source_implementation_required:true,
      fixed_paths_and_numeric_ids_from_fresh_host_plan_required:true,
      native_peer_guard_integration_required:true,
      installed_first_entry_and_source_custody_qualification_required:true,
      cross_uid_kernel_host_qualification_required:true,
      current_handoff_requirements_must_not_be_weakened:true,
    },
    implementation_present:false,
    native_peer_guard_runtime_integration_present:false,
    host_qualification_performed:false,
    cross_uid_host_qualification_performed:false,
    kernel_peer_authentication_performed:false,
    direct_parent_lineage_proven:false,
    interpreted_body_source_identity_proven:false,
    claim_store_mutation_performed:false,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    next_gate:"apollyon_durable_attempt_claim_store_service_source_implementation_v2",
    authority:
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_INTEGRATION_AUTHORITY_V2,
  };
  const integration_contract_id="apollyon_claim_peer_integration_v2:"+
    sha256(Buffer.from(
      canonicalApollyonDurableAttemptClaimNativePeerGuardIntegrationV2(material),
      "utf8",
    ));
  return deepFreeze({...material,integration_contract_id});
}
