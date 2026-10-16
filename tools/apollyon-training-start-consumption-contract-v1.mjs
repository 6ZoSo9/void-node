#!/usr/bin/env node
import crypto from "node:crypto";
import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  qualifyApollyonDurableAttemptClaimStorePolicyV2,
  qualifyApollyonDurableAttemptClaimSuccessResponseShapeV2,
} from "./apollyon-durable-attempt-claim-store-contract-v2.mjs";

export const VOID_APOLLYON_TRAINING_START_CONSUMPTION_V1 =
  "VOID_APOLLYON_TRAINING_START_CONSUMPTION_V1";
export const VOID_APOLLYON_PRETRAINING_ADMISSION_GENERATION_V1 =
  "VOID_APOLLYON_PRETRAINING_ADMISSION_GENERATION_V1";

export const VOID_APOLLYON_TRAINING_START_CONSUMPTION_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract:true,
    exact_parent_store_contract_required:true,
    exact_accepted_store_policy_required:true,
    durable_claim_success_shape_required:true,
    durable_claim_success_is_bearer_training_authority:false,
    protected_claim_record_reread_required:true,
    protected_claim_record_origin_proven:false,
    current_store_generation_revalidation_required:true,
    current_store_generation_revalidation_performed:false,
    exact_inert_pretraining_generation_required:true,
    pretraining_generation_source_origin_proven:false,
    training_start_consumption_create_once_required:true,
    trainer_independent_consumption_slot_required:true,
    authorization_wide_consumption_slot_required:true,
    protected_namespace_keyed_by_consumption_slot_required:true,
    training_start_consumption_performed:false,
    existing_exact_consumption_reusable_admission:false,
    lost_ack_second_start_forbidden:true,
    automatic_retry_authorized:false,
    protected_consumption_store_required:true,
    protected_consumption_store_proven:false,
    recovery_classifier_protected_origin_proven:false,
    training_release_gate_required:true,
    bound_trainer_generation_revalidation_required_before_release:true,
    bound_trainer_generation_revalidation_performed:false,
    training_identity_policy_revalidation_required_before_release:true,
    training_identity_policy_revalidation_performed:false,
    bound_trainer_generation_loss_after_consumption_forfeits_attempt:true,
    training_release_performed:false,
    filesystem_read:false,
    filesystem_write:false,
    network_access:false,
    service_action:false,
    socket_action:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    operator_private_key_access:false,
    production_signing:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
  });

export const PARENT_STORE_CONTRACT_BLOB_SHA1 =
  "6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe";
export const CANONICALIZER_V1_BLOB_SHA1 =
  "f97fafb0148527ae3a954e2752faef8c7fc9e88e";

const HASH64=/^[0-9a-f]{64}$/u;
const STORE_CONTRACT_ID=/^apollyon_claim_store_contract_v2:[0-9a-f]{64}$/u;
const STORE_POLICY_ID=/^apollyon_claim_store_policy_v2:[0-9a-f]{64}$/u;
const STORE_GENERATION_ID=/^apollyon_claim_store_generation_v2:[0-9a-f]{64}$/u;
const TERMINAL_ID=/^apollyon_terminal_receipt_v2:[0-9a-f]{64}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const CUSTODY_GENERATION_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;
const CLAIM_RECORD_ID=/^apollyon_attempt_claim_record_v2:[0-9a-f]{64}$/u;
const TRAINER_GENERATION_ID=/^apollyon_pretraining_generation_v1:[0-9a-f]{64}$/u;
const CONSUMPTION_SLOT_ID=/^apollyon_training_start_slot_v1:[0-9a-f]{64}$/u;

const TRAINER_GENERATION_KEYS=Object.freeze([
  "admission_blocked",
  "automatic_retry_authorized",
  "boot_id_sha256",
  "candidate_weight_mutation_performed",
  "gid",
  "marker",
  "pid",
  "process_start_time_ticks",
  "source_identity_sha256",
  "trainer_generation_id",
  "training_execution_performed",
  "uid",
  "version",
]);
export const VOID_APOLLYON_TRAINING_START_CONSUMPTION_RECORD_KEYS_V1 =
  Object.freeze([
    "attempt_limit",
    "authorization_id",
    "automatic_retry_authorized",
    "claim_record_id",
    "claim_record_sha256",
    "custody_generation_id",
    "custody_record_sha256",
    "marker",
    "publish_request_sha256",
    "status",
    "store_contract_id",
    "store_generation_id",
    "store_policy_id",
    "terminal_receipt_id",
    "trainer_boot_id_sha256",
    "trainer_gid",
    "trainer_generation_id",
    "trainer_pid",
    "trainer_process_start_time_ticks",
    "trainer_source_identity_sha256",
    "trainer_uid",
    "training_start_consumption_id",
    "training_start_consumption_slot_id",
    "version",
  ]);

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
function trainingStartConsumptionSlotId(value){
  const material={
    marker:"VOID_APOLLYON_TRAINING_START_CONSUMPTION_SLOT_V1",
    version:1,
    authorization_id:value.authorization_id,
    custody_generation_id:value.custody_generation_id,
    custody_record_sha256:value.custody_record_sha256,
    attempt_limit:value.attempt_limit,
    automatic_retry_authorized:value.automatic_retry_authorized,
  };
  return "apollyon_training_start_slot_v1:"+
    sha256(Buffer.from(canonical(material),"utf8"));
}

export function validateApollyonPretrainingAdmissionGenerationV1(input){
  const value=clonePlain(input,"apollyon_training_start_v1_trainer_generation_invalid");
  exactOwnKeys(
    value,TRAINER_GENERATION_KEYS,
    "apollyon_training_start_v1_trainer_generation_invalid",
  );
  if(
    value.marker!==VOID_APOLLYON_PRETRAINING_ADMISSION_GENERATION_V1||
    value.version!==1||
    !HASH64.test(value.boot_id_sha256)||
    !Number.isSafeInteger(value.pid)||value.pid<=1||
    typeof value.process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(value.process_start_time_ticks)||
    !Number.isSafeInteger(value.uid)||value.uid<=0||value.uid>65533||
    !Number.isSafeInteger(value.gid)||value.gid<=0||value.gid>65533||
    !HASH64.test(value.source_identity_sha256)||
    value.admission_blocked!==true||
    value.training_execution_performed!==false||
    value.candidate_weight_mutation_performed!==false||
    value.automatic_retry_authorized!==false||
    !TRAINER_GENERATION_ID.test(value.trainer_generation_id)
  ){
    fail("apollyon_training_start_v1_trainer_generation_invalid");
  }
  const material=structuredClone(value);
  delete material.trainer_generation_id;
  const expected="apollyon_pretraining_generation_v1:"+
    sha256(Buffer.from(canonical(material),"utf8"));
  if(value.trainer_generation_id!==expected){
    fail("apollyon_training_start_v1_trainer_generation_id_invalid");
  }
  return Object.freeze(value);
}

export function validateApollyonTrainingStartConsumptionRecordV1(input){
  const value=clonePlain(input,"apollyon_training_start_v1_consumption_record_invalid");
  exactOwnKeys(
    value,VOID_APOLLYON_TRAINING_START_CONSUMPTION_RECORD_KEYS_V1,
    "apollyon_training_start_v1_consumption_record_invalid",
  );
  const reviewedPolicyId=qualifyApollyonDurableAttemptClaimStorePolicyV2().store_policy_id;
  if(
    value.marker!=="VOID_APOLLYON_TRAINING_START_CONSUMPTION_RECORD_V1"||
    value.version!==1||
    value.status!=="training_start_consumption_record_v1"||
    !STORE_POLICY_ID.test(value.store_policy_id)||
    value.store_policy_id!==reviewedPolicyId||
    !STORE_CONTRACT_ID.test(value.store_contract_id)||
    !STORE_GENERATION_ID.test(value.store_generation_id)||
    !TERMINAL_ID.test(value.terminal_receipt_id)||
    !AUTH_ID.test(value.authorization_id)||
    !CUSTODY_GENERATION_ID.test(value.custody_generation_id)||
    !HASH64.test(value.custody_record_sha256)||
    !CLAIM_RECORD_ID.test(value.claim_record_id)||
    !HASH64.test(value.claim_record_sha256)||
    !HASH64.test(value.publish_request_sha256)||
    !TRAINER_GENERATION_ID.test(value.trainer_generation_id)||
    !HASH64.test(value.trainer_boot_id_sha256)||
    !Number.isSafeInteger(value.trainer_pid)||value.trainer_pid<=1||
    typeof value.trainer_process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(value.trainer_process_start_time_ticks)||
    !Number.isSafeInteger(value.trainer_uid)||value.trainer_uid<=0||value.trainer_uid>65533||
    !Number.isSafeInteger(value.trainer_gid)||value.trainer_gid<=0||value.trainer_gid>65533||
    !HASH64.test(value.trainer_source_identity_sha256)||
    value.attempt_limit!==1||
    value.automatic_retry_authorized!==false||
    !CONSUMPTION_SLOT_ID.test(value.training_start_consumption_slot_id)||
    !/^apollyon_training_start_consumption_v1:[0-9a-f]{64}$/u.test(
      value.training_start_consumption_id
    )
  ){
    fail("apollyon_training_start_v1_consumption_record_invalid");
  }
  const expectedSlot=trainingStartConsumptionSlotId(value);
  if(value.training_start_consumption_slot_id!==expectedSlot){
    fail("apollyon_training_start_v1_consumption_slot_id_invalid");
  }
  const material=structuredClone(value);
  delete material.training_start_consumption_id;
  const expected="apollyon_training_start_consumption_v1:"+
    sha256(Buffer.from(canonical(material),"utf8"));
  if(value.training_start_consumption_id!==expected){
    fail("apollyon_training_start_v1_consumption_record_id_invalid");
  }
  return Object.freeze(value);
}

export function classifyApollyonTrainingStartConsumptionRecoveryV1(input){
  const snapshot=clonePlain(input,"apollyon_training_start_v1_recovery_input_invalid");
  exactOwnKeys(
    snapshot,[
      "expected_consumption_record",
      "observed_consumption_record",
      "training_start_consumption_slot_id",
    ],
    "apollyon_training_start_v1_recovery_input_invalid",
  );
  if(!CONSUMPTION_SLOT_ID.test(snapshot.training_start_consumption_slot_id)){
    fail("apollyon_training_start_v1_recovery_slot_invalid");
  }
  const expected=validateApollyonTrainingStartConsumptionRecordV1(
    snapshot.expected_consumption_record
  );
  if(expected.training_start_consumption_slot_id!==
     snapshot.training_start_consumption_slot_id){
    fail("apollyon_training_start_v1_expected_consumption_slot_mismatch");
  }
  if(snapshot.observed_consumption_record===null){
    return Object.freeze({
      status:"unconsumed_shape",
      create_once_publication_candidate:true,
      create_once_publication_authorized:false,
      existing_exact_consumption:false,
      training_start_admission:false,
      automatic_retry_authorized:false,
      protected_store_observation_performed:false,
    });
  }
  const observed=validateApollyonTrainingStartConsumptionRecordV1(
    snapshot.observed_consumption_record
  );
  if(observed.training_start_consumption_slot_id!==
     snapshot.training_start_consumption_slot_id){
    fail("apollyon_training_start_v1_observed_consumption_slot_mismatch");
  }
  if(canonical(observed)!==canonical(expected)){
    fail("apollyon_training_start_v1_existing_consumption_collision");
  }
  return Object.freeze({
    status:"already_consumed_shape",
    create_once_publication_candidate:false,
    create_once_publication_authorized:false,
    existing_exact_consumption:true,
    training_start_admission:false,
    automatic_retry_authorized:false,
    protected_store_observation_performed:false,
  });
}

export function qualifyApollyonTrainingStartConsumptionContractV1(input){
  const snapshot=clonePlain(input,"apollyon_training_start_v1_input_invalid");
  exactOwnKeys(
    snapshot,
    ["claim_record","publish_request_sha256","success_response","trainer_generation"],
    "apollyon_training_start_v1_input_invalid",
  );
  if(!HASH64.test(snapshot.publish_request_sha256)){
    fail("apollyon_training_start_v1_input_invalid");
  }

  const success=qualifyApollyonDurableAttemptClaimSuccessResponseShapeV2({
    claim_record:snapshot.claim_record,
    publish_request_sha256:snapshot.publish_request_sha256,
    success_response:snapshot.success_response,
  });
  const claim=clonePlain(
    snapshot.claim_record,
    "apollyon_training_start_v1_claim_record_invalid",
  );
  const trainer=validateApollyonPretrainingAdmissionGenerationV1(
    snapshot.trainer_generation,
  );
  const policy=qualifyApollyonDurableAttemptClaimStorePolicyV2();

  if(
    success.training_start_admission!==false||
    success.training_start_consumption_required!==true||
    success.training_start_consumption_performed!==false||
    success.next_gate!=="apollyon_training_start_consumption_v1"||
    claim.store_policy_id!==policy.store_policy_id||
    !STORE_POLICY_ID.test(claim.store_policy_id)||
    !STORE_CONTRACT_ID.test(claim.store_contract_id)||
    !STORE_GENERATION_ID.test(claim.store_generation_id)||
    !TERMINAL_ID.test(claim.terminal_receipt_id)||
    !AUTH_ID.test(claim.authorization_id)||
    !CUSTODY_GENERATION_ID.test(claim.custody_generation_id)||
    !HASH64.test(claim.custody_record_sha256)||
    !CLAIM_RECORD_ID.test(claim.claim_record_id)
  ){
    fail("apollyon_training_start_v1_claim_boundary_invalid");
  }

  const claimRecordSha256=sha256(Buffer.from(canonical(claim)+"\n","utf8"));
  const slotAuthority={
    authorization_id:claim.authorization_id,
    custody_generation_id:claim.custody_generation_id,
    custody_record_sha256:claim.custody_record_sha256,
    attempt_limit:1,
    automatic_retry_authorized:false,
  };
  const training_start_consumption_slot_id=
    trainingStartConsumptionSlotId(slotAuthority);
  const consumptionMaterial={
    marker:"VOID_APOLLYON_TRAINING_START_CONSUMPTION_RECORD_V1",
    version:1,
    status:"training_start_consumption_record_v1",
    store_policy_id:claim.store_policy_id,
    store_contract_id:claim.store_contract_id,
    store_generation_id:claim.store_generation_id,
    terminal_receipt_id:claim.terminal_receipt_id,
    authorization_id:claim.authorization_id,
    custody_generation_id:claim.custody_generation_id,
    custody_record_sha256:claim.custody_record_sha256,
    claim_record_id:claim.claim_record_id,
    claim_record_sha256:claimRecordSha256,
    publish_request_sha256:snapshot.publish_request_sha256,
    training_start_consumption_slot_id,
    trainer_generation_id:trainer.trainer_generation_id,
    trainer_boot_id_sha256:trainer.boot_id_sha256,
    trainer_pid:trainer.pid,
    trainer_process_start_time_ticks:trainer.process_start_time_ticks,
    trainer_uid:trainer.uid,
    trainer_gid:trainer.gid,
    trainer_source_identity_sha256:trainer.source_identity_sha256,
    attempt_limit:1,
    automatic_retry_authorized:false,
  };
  exactOwnKeys(
    consumptionMaterial,
    VOID_APOLLYON_TRAINING_START_CONSUMPTION_RECORD_KEYS_V1.filter(
      key=>key!=="training_start_consumption_id"
    ),
    "apollyon_training_start_v1_internal_record_invalid",
  );
  const training_start_consumption_id=
    "apollyon_training_start_consumption_v1:"+
    sha256(Buffer.from(canonical(consumptionMaterial),"utf8"));
  const consumption_record=validateApollyonTrainingStartConsumptionRecordV1({
    ...consumptionMaterial,
    training_start_consumption_id,
  });

  const material={
    marker:VOID_APOLLYON_TRAINING_START_CONSUMPTION_V1,
    version:1,
    status:"training_start_consumption_source_contract_qualified_unimplemented",
    parent_store_contract_blob_sha1:PARENT_STORE_CONTRACT_BLOB_SHA1,
    canonicalizer_v1_blob_sha1:CANONICALIZER_V1_BLOB_SHA1,
    store_policy_id:claim.store_policy_id,
    claim_record_id:claim.claim_record_id,
    claim_record_sha256:claimRecordSha256,
    publish_request_sha256:snapshot.publish_request_sha256,
    authorization_id:claim.authorization_id,
    custody_generation_id:claim.custody_generation_id,
    store_generation_id:claim.store_generation_id,
    terminal_receipt_id:claim.terminal_receipt_id,
    trainer_generation_id:trainer.trainer_generation_id,
    training_start_consumption_slot_id,
    consumption_record,
    durable_claim_success_shape_qualified:true,
    durable_claim_success_origin_proven:false,
    durable_claim_success_is_bearer_training_authority:false,
    protected_claim_record_reread_required:true,
    protected_claim_record_reread_performed:false,
    current_store_generation_revalidation_required:true,
    current_store_generation_revalidation_performed:false,
    pretraining_generation_shape_qualified:true,
    pretraining_generation_source_origin_proven:false,
    trainer_generation_must_remain_blocked_until_durable_consumption:true,
    training_start_consumption_create_once_required:true,
    trainer_independent_consumption_slot_qualified:true,
    authorization_wide_consumption_slot_qualified:true,
    protected_namespace_keyed_by_consumption_slot_required:true,
    training_start_consumption_performed:false,
    existing_exact_consumption_reusable_admission:false,
    lost_ack_second_start_forbidden:true,
    automatic_retry_authorized:false,
    protected_consumption_store_required:true,
    protected_consumption_store_proven:false,
    training_release_gate_required:true,
    bound_trainer_generation_revalidation_required_before_release:true,
    bound_trainer_generation_revalidation_performed:false,
    training_identity_policy_revalidation_required_before_release:true,
    training_identity_policy_revalidation_performed:false,
    bound_trainer_generation_loss_after_consumption_forfeits_attempt:true,
    training_release_performed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    next_gate:"apollyon_training_start_consumption_implementation_v1",
  };
  return Object.freeze({
    ...material,
    training_start_contract_id:"apollyon_training_start_contract_v1:"+
      sha256(Buffer.from(canonical(material),"utf8")),
    authority:VOID_APOLLYON_TRAINING_START_CONSUMPTION_AUTHORITY_V1,
  });
}
