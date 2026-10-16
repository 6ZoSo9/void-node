#!/usr/bin/env node
import crypto from "node:crypto";
import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2,
} from "./apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_V1 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_V1";

export const PARENT_SERVICE_CANDIDATE_BLOB_SHA1 =
  "d67ef39c4cd034844fb0862e180de46ed4cd0c88";
export const CANONICALIZER_V1_BLOB_SHA1 =
  "f97fafb0148527ae3a954e2752faef8c7fc9e88e";
export const ACCEPTED_STORE_POLICY_ID =
  "apollyon_claim_store_policy_v2:e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_REQUIREMENTS_V1 =
  Object.freeze({
    stable_store_policy_bound_required:true,
    authorization_slot_terminal_independent_required:true,
    authorization_slot_store_contract_independent_required:true,
    authorization_slot_store_generation_independent_required:true,
    authorization_slot_claim_record_independent_required:true,
    authorization_slot_publish_request_independent_required:true,
    attempt_limit_exactly_one_required:true,
    automatic_retry_forbidden:true,
    protected_namespace_create_once_by_authorization_slot_required:true,
    authorization_slot_record_exact_claim_binding_required:true,
    authorization_slot_record_bind_claim_record_id_required:true,
    authorization_slot_record_bind_claim_record_sha256_required:true,
    authorization_slot_record_bind_store_contract_id_required:true,
    authorization_slot_record_bind_store_generation_id_required:true,
    authorization_slot_record_bind_terminal_receipt_id_required:true,
    authorization_slot_record_bind_publish_request_sha256_required:true,
    authorization_slot_reservation_precedes_claim_success_required:true,
    authorization_slot_file_fsync_required:true,
    authorization_slot_directory_fsync_required:true,
    claim_record_durable_revalidation_after_slot_reservation_required:true,
    success_ack_after_slot_and_claim_durable_revalidation_required:true,
    exact_same_claim_slot_recovery_required:true,
    different_claim_in_occupied_slot_rejected_required:true,
    crash_after_slot_before_claim_recovers_only_exact_bound_claim_required:true,
    lost_ack_cannot_create_second_claim_required:true,
    concurrent_same_authorization_different_terminal_at_most_one_success_required:true,
    migration_preserves_authorization_slots_required:true,
    authorization_slot_identity_stable_across_store_generation_migration_required:true,
    migration_authorization_slot_set_continuity_required:true,
    training_start_consumption_must_revalidate_unique_authorization_claim_required:true,
  });

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract:true,
    exact_parent_service_candidate_required:true,
    stable_store_policy_required:true,
    protected_authorization_slot_store_required:true,
    protected_authorization_slot_store_proven:false,
    protected_claim_record_origin_required:true,
    protected_claim_record_origin_proven:false,
    store_generation_revalidation_required:true,
    store_generation_revalidation_performed:false,
    authorization_slot_publication_required:true,
    authorization_slot_publication_performed:false,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_start_admission:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    filesystem_read:false,
    filesystem_write:false,
    network_access:false,
    service_action:false,
    socket_action:false,
    operator_private_key_access:false,
    production_signing:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
  });

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_RECORD_KEYS_V1 =
  Object.freeze([
    "attempt_limit",
    "authorization_id",
    "authorization_slot_id",
    "authorization_slot_record_id",
    "automatic_retry_authorized",
    "claim_record_id",
    "claim_record_sha256",
    "marker",
    "publish_request_sha256",
    "status",
    "store_contract_id",
    "store_generation_id",
    "store_policy_id",
    "terminal_receipt_id",
    "version",
  ]);

const HASH64=/^[0-9a-f]{64}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const STORE_CONTRACT_ID=/^apollyon_claim_store_contract_v2:[0-9a-f]{64}$/u;
const STORE_GENERATION_ID=/^apollyon_claim_store_generation_v2:[0-9a-f]{64}$/u;
const CLAIM_RECORD_ID=/^apollyon_attempt_claim_record_v2:[0-9a-f]{64}$/u;
const TERMINAL_ID=/^apollyon_terminal_receipt_v2:[0-9a-f]{64}$/u;
const SLOT_ID=/^apollyon_attempt_claim_auth_slot_v1:[0-9a-f]{64}$/u;
const SLOT_RECORD_ID=/^apollyon_attempt_claim_auth_slot_record_v1:[0-9a-f]{64}$/u;

function fail(code){throw new Error(code);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function canonical(value){return canonicalApollyonClaimContractJsonV1(value);}
function exactOwnKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index])){
    fail(code);
  }
}
function clonePlain(value,code){
  let copy;
  try{copy=structuredClone(value);}catch{fail(code);}
  if(!copy||typeof copy!=="object"||Array.isArray(copy))fail(code);
  const proto=Object.getPrototypeOf(copy);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  return copy;
}
function validateStableAuthority(value){
  if(value.store_policy_id!==ACCEPTED_STORE_POLICY_ID||
     !AUTH_ID.test(value.authorization_id)||
     value.attempt_limit!==1||
     value.automatic_retry_authorized!==false){
    fail("apollyon_claim_auth_slot_v1_authority_invalid");
  }
}

export function deriveApollyonDurableAttemptClaimAuthorizationSlotIdV1(input){
  const value=clonePlain(input,"apollyon_claim_auth_slot_v1_id_input_invalid");
  exactOwnKeys(value,[
    "attempt_limit","authorization_id","automatic_retry_authorized","store_policy_id",
  ],"apollyon_claim_auth_slot_v1_id_input_invalid");
  validateStableAuthority(value);
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_ID_V1",
    version:1,
    store_policy_id:value.store_policy_id,
    authorization_id:value.authorization_id,
    attempt_limit:1,
    automatic_retry_authorized:false,
  };
  return "apollyon_attempt_claim_auth_slot_v1:"+
    sha256(Buffer.from(canonical(material),"utf8"));
}

export function qualifyApollyonDurableAttemptClaimAuthorizationSlotPolicyV1(){
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_POLICY_V1",
    version:1,
    store_policy_id:ACCEPTED_STORE_POLICY_ID,
    requirements:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_REQUIREMENTS_V1,
  };
  return Object.freeze({
    ...material,
    authorization_slot_policy_id:"apollyon_attempt_claim_auth_slot_policy_v1:"+
      sha256(Buffer.from(canonical(material),"utf8")),
  });
}

export function qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1(input){
  const value=clonePlain(input,"apollyon_claim_auth_slot_v1_record_input_invalid");
  exactOwnKeys(value,[
    "attempt_limit",
    "authorization_id",
    "automatic_retry_authorized",
    "claim_record_id",
    "claim_record_sha256",
    "publish_request_sha256",
    "store_contract_id",
    "store_generation_id",
    "store_policy_id",
    "terminal_receipt_id",
  ],"apollyon_claim_auth_slot_v1_record_input_invalid");
  validateStableAuthority(value);
  if(!CLAIM_RECORD_ID.test(value.claim_record_id)||
     !HASH64.test(value.claim_record_sha256)||
     !HASH64.test(value.publish_request_sha256)||
     !STORE_CONTRACT_ID.test(value.store_contract_id)||
     !STORE_GENERATION_ID.test(value.store_generation_id)||
     !TERMINAL_ID.test(value.terminal_receipt_id)){
    fail("apollyon_claim_auth_slot_v1_record_input_invalid");
  }

  const authorization_slot_id=
    deriveApollyonDurableAttemptClaimAuthorizationSlotIdV1({
      store_policy_id:value.store_policy_id,
      authorization_id:value.authorization_id,
      attempt_limit:1,
      automatic_retry_authorized:false,
    });
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_RECORD_V1",
    version:1,
    status:"authorization_slot_bound_to_exact_durable_claim_candidate",
    store_policy_id:value.store_policy_id,
    authorization_id:value.authorization_id,
    authorization_slot_id,
    store_contract_id:value.store_contract_id,
    store_generation_id:value.store_generation_id,
    terminal_receipt_id:value.terminal_receipt_id,
    claim_record_id:value.claim_record_id,
    claim_record_sha256:value.claim_record_sha256,
    publish_request_sha256:value.publish_request_sha256,
    attempt_limit:1,
    automatic_retry_authorized:false,
  };
  return Object.freeze({
    ...material,
    authorization_slot_record_id:
      "apollyon_attempt_claim_auth_slot_record_v1:"+
      sha256(Buffer.from(canonical(material),"utf8")),
  });
}

export function validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1(input){
  const value=clonePlain(input,"apollyon_claim_auth_slot_v1_record_invalid");
  exactOwnKeys(
    value,
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_RECORD_KEYS_V1,
    "apollyon_claim_auth_slot_v1_record_invalid",
  );
  if(value.marker!=="VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_RECORD_V1"||
     value.version!==1||
     value.status!=="authorization_slot_bound_to_exact_durable_claim_candidate"||
     !SLOT_ID.test(value.authorization_slot_id)||
     !SLOT_RECORD_ID.test(value.authorization_slot_record_id)){
    fail("apollyon_claim_auth_slot_v1_record_invalid");
  }
  const expected=qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1({
    store_policy_id:value.store_policy_id,
    authorization_id:value.authorization_id,
    store_contract_id:value.store_contract_id,
    store_generation_id:value.store_generation_id,
    terminal_receipt_id:value.terminal_receipt_id,
    claim_record_id:value.claim_record_id,
    claim_record_sha256:value.claim_record_sha256,
    publish_request_sha256:value.publish_request_sha256,
    attempt_limit:value.attempt_limit,
    automatic_retry_authorized:value.automatic_retry_authorized,
  });
  if(canonical(value)!==canonical(expected)){
    fail("apollyon_claim_auth_slot_v1_record_invalid");
  }
  return Object.freeze(value);
}

export function classifyApollyonDurableAttemptClaimAuthorizationSlotRecoveryV1(input){
  const value=clonePlain(input,"apollyon_claim_auth_slot_v1_recovery_input_invalid");
  exactOwnKeys(value,[
    "authorization_slot_id","expected_slot_record","observed_slot_record",
  ],"apollyon_claim_auth_slot_v1_recovery_input_invalid");
  if(!SLOT_ID.test(value.authorization_slot_id)){
    fail("apollyon_claim_auth_slot_v1_recovery_slot_invalid");
  }
  const expected=validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1(
    value.expected_slot_record,
  );
  if(expected.authorization_slot_id!==value.authorization_slot_id){
    fail("apollyon_claim_auth_slot_v1_recovery_expected_slot_mismatch");
  }
  if(value.observed_slot_record===null){
    return Object.freeze({
      status:"authorization_slot_unreserved_shape",
      reservation_candidate:true,
      reservation_authorized:false,
      protected_store_observation_performed:false,
      durable_claim_success_authorized:false,
      exact_same_claim_recovery:false,
      different_claim_collision:false,
    });
  }
  const observed=validateApollyonDurableAttemptClaimAuthorizationSlotRecordV1(
    value.observed_slot_record,
  );
  if(observed.authorization_slot_id!==value.authorization_slot_id){
    fail("apollyon_claim_auth_slot_v1_recovery_observed_slot_mismatch");
  }
  if(canonical(observed)!==canonical(expected)){
    fail("apollyon_claim_auth_slot_v1_existing_different_claim_collision");
  }
  return Object.freeze({
    status:"authorization_slot_exact_claim_already_reserved_shape",
    reservation_candidate:false,
    reservation_authorized:false,
    protected_store_observation_performed:false,
    durable_claim_success_authorized:false,
    exact_same_claim_recovery:true,
    different_claim_collision:false,
  });
}

export function qualifyApollyonDurableAttemptClaimAuthorizationSlotContractV1(){
  const candidate=qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2();
  if(candidate.store_policy_id!==ACCEPTED_STORE_POLICY_ID||
     candidate.service_implementation_present!==false||
     candidate.durable_attempt_claim_performed!==false||
     candidate.authority?.attempt_claim_authorized!==false||
     candidate.authority?.attempt_claimed!==false){
    fail("apollyon_claim_auth_slot_v1_parent_candidate_invalid");
  }
  const policy=qualifyApollyonDurableAttemptClaimAuthorizationSlotPolicyV1();
  const material={
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_V1,
    version:1,
    status:"atomic_authorization_claim_slot_source_contract_defined_unimplemented",
    parent_service_candidate_blob_sha1:PARENT_SERVICE_CANDIDATE_BLOB_SHA1,
    parent_service_candidate_id:candidate.candidate_id,
    store_policy_id:ACCEPTED_STORE_POLICY_ID,
    authorization_slot_policy_id:policy.authorization_slot_policy_id,
    requirements:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_REQUIREMENTS_V1,
    protected_authorization_slot_store_proven:false,
    authorization_slot_publication_performed:false,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_start_admission:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    next_gate:"apollyon_durable_attempt_claim_store_service_source_implementation_v2",
    authority:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_AUTHORITY_V1,
  };
  return Object.freeze({
    ...material,
    authorization_slot_contract_id:"apollyon_attempt_claim_auth_slot_contract_v1:"+
      sha256(Buffer.from(canonical(material),"utf8")),
  });
}
