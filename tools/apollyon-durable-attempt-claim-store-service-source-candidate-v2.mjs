#!/usr/bin/env node
import crypto from "node:crypto";
import {
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_DANGEROUS_ENVIRONMENT_NAMES_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SUCCESS_RESPONSE_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_FAILURE_RESPONSE_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_PUBLISHER_LEAST_AUTHORITY_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_CONTINUITY_RECEIPT_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_SYSTEMD_REQUIREMENTS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SOCKET_REQUIREMENTS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_LEAST_AUTHORITY_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2,
  qualifyApollyonDurableAttemptClaimStorePolicyV2,
} from "./apollyon-durable-attempt-claim-store-contract-v2.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_CANDIDATE_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_CANDIDATE_V2";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_CANDIDATE_AUTHORITY_V2 =
  Object.freeze({
    source_only_candidate:true,
    exact_parent_store_policy_required:true,
    exact_parent_host_plan_source_required:true,
    fixed_identity_names_bound:true,
    fixed_paths_bound:true,
    host_plan_receipt_required_for_numeric_identity_binding:true,
    host_plan_receipt_content_address_reverification_required:true,
    caller_supplied_host_plan_sufficient:false,
    live_host_plan_reexecution_required_before_provisioning:true,
    live_process_credential_exclusion_required:true,
    host_pid_namespace_external_lease_required:true,
    host_user_namespace_external_lease_required:true,
    host_root_user_namespace_binding_required:true,
    numeric_host_identity_binding_performed:false,
    service_implementation_present:false,
    publisher_implementation_present:false,
    service_unit_implementation_present:false,
    socket_listener_implementation_present:false,
    durable_store_writer_implementation_present:false,
    training_start_consumer_implementation_present:false,
    host_installation:false,
    filesystem_read:false,
    filesystem_write:false,
    account_mutation:false,
    group_mutation:false,
    systemd_mutation:false,
    service_action:false,
    socket_action:false,
    network_access:false,
    credential_access:false,
    private_key_access:false,
    signing:false,
    wallet_access:false,
    transaction:false,
    funds_movement:false,
    durable_attempt_claim:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution:false,
    candidate_weight_mutation:false,
  });

const PARENT_STORE_CONTRACT_HEAD="9475035552881f34658a7c8f3a6b336199fda159";
const PARENT_STORE_CONTRACT_BLOB_SHA1="bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc";
const PARENT_HOST_PLAN_HEAD="30edd98609877c15be44d26b46916cf8c5d1f174";
const PARENT_HOST_PLANNER_BLOB_SHA1="9e2a716e43e4a9815f9e8f2c67c0d3e322f8b64d";
const EXPECTED_STORE_POLICY_ID=
  "apollyon_claim_store_policy_v2:"+
  "e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137";

const FIXED_IDENTITIES=Object.freeze({
  claim_service_user:"voidapollyonclaim",
  claim_service_group:"voidapollyonclaim",
  claim_publisher_user:"voidapollyonclaimpub",
  claim_publisher_group:"voidapollyonclaimpub",
  claim_ipc_group:"voidapollyonclaimipc",
});

const FIXED_PATHS=Object.freeze({
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
    if(!Number.isSafeInteger(value))fail("apollyon_claim_service_candidate_noncanonical_number");
    return value;
  }
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort())out[key]=canonicalize(value[key]);
    return out;
  }
  fail("apollyon_claim_service_candidate_noncanonical_value");
}
export function canonicalApollyonClaimStoreServiceSourceCandidateV2(value){
  return JSON.stringify(canonicalize(value));
}
function deepFreeze(value){
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const child of Object.values(value))deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function cloned(value){return structuredClone(value);}

export function qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2(){
  const policy=qualifyApollyonDurableAttemptClaimStorePolicyV2();
  if(policy.store_policy_id!==EXPECTED_STORE_POLICY_ID){
    fail("apollyon_claim_service_candidate_store_policy_mismatch");
  }
  const hostPlanReceiptRequirements=deepFreeze({
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_HOST_PLAN_V2",
    version:2,
    status:"xiphos_claim_store_preinstall_plan_ready",
    target_host:"Xiphos",
    parent_head:PARENT_STORE_CONTRACT_HEAD,
    parent_contract_blob_sha1:PARENT_STORE_CONTRACT_BLOB_SHA1,
    store_policy_id:EXPECTED_STORE_POLICY_ID,
    fixed_names:FIXED_IDENTITIES,
    fixed_paths:FIXED_PATHS,
    plan_id_pattern:"^apollyon_claim_store_host_plan_v2:[0-9a-f]{64}$",
    plan_id_content_address_reverification_required:true,
    caller_supplied_host_plan_sufficient:false,
    live_host_plan_reexecution_required_before_provisioning:true,
    machine_id_revalidation_required_before_provisioning:true,
    local_identity_files_revalidation_required_before_provisioning:true,
    trusted_parent_directories_revalidation_required_before_provisioning:true,
    selected_candidate_keys:Object.freeze([
      "claim_service_uid","claim_publisher_uid",
      "claim_service_gid","claim_publisher_gid","claim_ipc_gid",
    ]),
    selected_candidate_values_positive_safe_integers_required:true,
    selected_candidate_values_pairwise_distinct_required:true,
    selected_candidate_values_within_system_id_ranges_required:true,
    selected_candidate_values_absent_from_current_local_identity_rows_required:true,
    selected_candidate_values_absent_from_live_process_credentials_required:true,
    live_process_identity_authority_required:true,
    live_process_identity_authority_profile:
      "reviewed_root_host_pid_user_namespace_procfs_v2",
    root_execution_verified_required:true,
    host_pid_namespace_external_lease_required:true,
    host_user_namespace_external_lease_required:true,
    pid1_namespace_matches_self_required:true,
    pid1_user_namespace_matches_self_required:true,
    procfs_hidepid_absent_required:true,
    complete_process_visibility_required:true,
    all_four_uid_slots_consumed_required:true,
    all_four_gid_slots_consumed_required:true,
    supplementary_groups_consumed_required:true,
    initial_and_final_process_census_required:true,
    candidate_slots_clear_in_final_process_census_required:true,
    source_generation_source_head:PARENT_HOST_PLAN_HEAD,
    source_generation_parent_head:PARENT_STORE_CONTRACT_HEAD,
    source_generation_planner_blob_sha1:PARENT_HOST_PLANNER_BLOB_SHA1,
    source_generation_parent_contract_blob_sha1:PARENT_STORE_CONTRACT_BLOB_SHA1,
    source_generation_authenticated_required:true,
    source_generation_isolated_python_startup_proven_required:true,
    reviewed_source_head_external_lease_required:true,
    target_names_absent_required:true,
    target_paths_absent_required:true,
    candidate_slots_selected_in_plan_required:true,
    candidate_slots_globally_distinct_required:true,
    candidate_slots_revalidation_required_before_provisioning:true,
    candidate_slots_live_process_recensus_required_before_provisioning:true,
    candidate_slots_host_user_namespace_recensus_required_before_provisioning:true,
    candidate_slots_provisioning_ready_required:false,
    claim_identity_provisioned_required:false,
    publisher_identity_provisioned_required:false,
    claim_ipc_group_provisioned_required:false,
    claim_root_created_required:false,
    claim_socket_parent_created_required:false,
    claim_service_source_installed_required:false,
    claim_publisher_source_installed_required:false,
    claim_service_unit_installed_required:false,
    claim_service_started_required:false,
    protected_claim_store_proven_required:false,
    durable_attempt_claim_performed_required:false,
    training_execution_performed_required:false,
    next_gate:"apollyon_durable_attempt_claim_store_service_source_candidate_v2",
  });

  const requirements=deepFreeze({
    dangerous_environment_names:cloned(
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_DANGEROUS_ENVIRONMENT_NAMES_V2
    ),
    service_systemd:cloned(
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_SYSTEMD_REQUIREMENTS_V2
    ),
    socket:cloned(VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SOCKET_REQUIREMENTS_V2),
    store:cloned(VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2),
    service_least_authority_keys:cloned(
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_LEAST_AUTHORITY_KEYS_V2
    ),
    publisher_least_authority_keys:cloned(
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_PUBLISHER_LEAST_AUTHORITY_KEYS_V2
    ),
    request_keys:cloned(VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_KEYS_V2),
    claim_record_keys:cloned(VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_KEYS_V2),
    success_response_keys:cloned(
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SUCCESS_RESPONSE_KEYS_V2
    ),
    failure_response_keys:cloned(
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_FAILURE_RESPONSE_KEYS_V2
    ),
    store_generation_record_keys:cloned(
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2
    ),
    continuity_receipt_keys:cloned(
      VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_CONTINUITY_RECEIPT_KEYS_V2
    ),
  });

  const material={
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_CANDIDATE_V2,
    version:2,
    status:"claim_store_service_source_boundary_defined_unimplemented",
    target_host:"Xiphos",
    parent_store_contract_head:PARENT_STORE_CONTRACT_HEAD,
    parent_store_contract_blob_sha1:PARENT_STORE_CONTRACT_BLOB_SHA1,
    parent_host_plan_head:PARENT_HOST_PLAN_HEAD,
    parent_host_planner_blob_sha1:PARENT_HOST_PLANNER_BLOB_SHA1,
    store_policy_id:policy.store_policy_id,
    fixed_identities:FIXED_IDENTITIES,
    fixed_paths:FIXED_PATHS,
    numeric_host_identities:null,
    host_plan_receipt_required_for_numeric_identity_binding:true,
    host_plan_receipt_consumed:false,
    host_plan_receipt_content_address_reverification_required:true,
    caller_supplied_host_plan_sufficient:false,
    live_host_plan_reexecution_required_before_provisioning:true,
    host_plan_receipt_requirements:hostPlanReceiptRequirements,
    service_role:"dedicated_nonroot_claim_store_service",
    publisher_role:"distinct_nonroot_request_publisher_without_claim_root_write",
    training_start_admission_role:"separate_one_time_consumption_gate_after_durable_claim",
    requirements,
    service_implementation_present:false,
    publisher_implementation_present:false,
    host_installation_performed:false,
    protected_store_qualification_performed:false,
    durable_attempt_claim_performed:false,
    training_start_consumption_performed:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    next_gate:"apollyon_durable_attempt_claim_store_service_source_implementation_v2",
    authority:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_CANDIDATE_AUTHORITY_V2,
  };
  const idMaterial=structuredClone(material);
  const candidate_id="apollyon_claim_store_service_source_candidate_v2:"+
    sha256(Buffer.from(canonicalApollyonClaimStoreServiceSourceCandidateV2(idMaterial),"utf8"));
  return deepFreeze({...material,candidate_id});
}
