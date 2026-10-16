#!/usr/bin/env node
import crypto from "node:crypto";

import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2,
} from "./apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs";
import {
  validateApollyonTrainingStartConsumptionRecordV1,
} from "./apollyon-training-start-consumption-contract-v1.mjs";

export const VOID_APOLLYON_TRAINING_START_STORE_REVALIDATION_REQUEST_V1 =
  "VOID_APOLLYON_TRAINING_START_STORE_REVALIDATION_REQUEST_V1";

export const VOID_APOLLYON_TRAINING_START_STORE_REVALIDATION_REQUEST_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract:true,
    exact_consumption_record_required:true,
    accepted_store_service_candidate_required:true,
    accepted_protected_writer_required:true,
    fixed_claim_state_root_bound:true,
    fixed_training_start_consumption_directory_bound:true,
    caller_supplied_store_path_supported:false,
    caller_supplied_consumption_directory_supported:false,
    protected_store_origin_required:true,
    protected_store_origin_proven:false,
    current_store_generation_revalidation_required:true,
    current_store_generation_revalidation_performed:false,
    durable_claim_record_reread_required:true,
    durable_claim_record_reread_performed:false,
    authorization_winner_reread_required:true,
    authorization_winner_reread_performed:false,
    consumption_slot_classification_required:true,
    consumption_slot_classification_performed:false,
    writer_directory_capability_from_fixed_root_required:true,
    writer_directory_capability_exact_path_required:true,
    writer_directory_capability_exact_path_proven:false,
    writer_directory_capability_origin_proven:false,
    same_store_generation_through_writer_required:true,
    protected_writer_invocation_required:true,
    protected_writer_invocation_authorized:false,
    training_start_consumption_performed:false,
    trainer_release_authorized:false,
    trainer_release_performed:false,
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

export const PARENT_PROTECTED_WRITER_BLOB_SHA1 =
  "a08927b7b16884a9bf0c28328047afdab49649ea";
export const STORE_SERVICE_CANDIDATE_BLOB_SHA1 =
  "d67ef39c4cd034844fb0862e180de46ed4cd0c88";
export const PARENT_CONSUMPTION_CONTRACT_BLOB_SHA1 =
  "4333df6c7918fe9efaada36cac765000eec7948f";
export const FIXED_CLAIM_STATE_ROOT =
  "/var/lib/void-apollyon-attempt-claim-v2";
export const FIXED_TRAINING_START_CONSUMPTION_DIRECTORY =
  "/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1";

function fail(code){throw new Error(code);}
function canonical(value){return canonicalApollyonClaimContractJsonV1(value);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function clonePlain(value,code){
  let copy;
  try{copy=structuredClone(value);}catch{fail(code);}
  if(!copy||typeof copy!=="object"||Array.isArray(copy))fail(code);
  const proto=Object.getPrototypeOf(copy);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  return copy;
}
function exactOwnKeys(value,expected,code){
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index])){
    fail(code);
  }
}

export function qualifyApollyonTrainingStartStoreRevalidationRequestV1(input){
  const snapshot=clonePlain(
    input,
    "apollyon_training_start_store_revalidation_request_v1_input_invalid",
  );
  exactOwnKeys(
    snapshot,
    ["consumption_record"],
    "apollyon_training_start_store_revalidation_request_v1_input_invalid",
  );
  const record=validateApollyonTrainingStartConsumptionRecordV1(
    snapshot.consumption_record,
  );
  const candidate=
    qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2();

  if(
    candidate.store_policy_id!==record.store_policy_id||
    candidate.fixed_paths?.claim_state_root!==FIXED_CLAIM_STATE_ROOT||
    candidate.service_implementation_present!==false||
    candidate.host_installation_performed!==false
  ){
    fail("apollyon_training_start_store_revalidation_request_v1_candidate_invalid");
  }

  const material={
    marker:VOID_APOLLYON_TRAINING_START_STORE_REVALIDATION_REQUEST_V1,
    version:1,
    status:"protected_store_revalidation_request_defined_unperformed",
    target_host:"Xiphos",

    parent_protected_writer_blob_sha1:PARENT_PROTECTED_WRITER_BLOB_SHA1,
    parent_consumption_contract_blob_sha1:
      PARENT_CONSUMPTION_CONTRACT_BLOB_SHA1,
    store_service_candidate_blob_sha1:STORE_SERVICE_CANDIDATE_BLOB_SHA1,
    store_service_candidate_id:candidate.candidate_id,

    fixed_claim_state_root:FIXED_CLAIM_STATE_ROOT,
    fixed_training_start_consumption_directory:
      FIXED_TRAINING_START_CONSUMPTION_DIRECTORY,
    store_policy_id:record.store_policy_id,
    store_contract_id:record.store_contract_id,
    store_generation_id:record.store_generation_id,

    terminal_receipt_id:record.terminal_receipt_id,
    authorization_id:record.authorization_id,
    authorization_slot_id:record.authorization_slot_id,
    authorization_slot_record_id:record.authorization_slot_record_id,
    custody_generation_id:record.custody_generation_id,
    custody_record_sha256:record.custody_record_sha256,

    claim_record_id:record.claim_record_id,
    claim_record_sha256:record.claim_record_sha256,
    publish_request_sha256:record.publish_request_sha256,

    training_start_consumption_slot_id:
      record.training_start_consumption_slot_id,
    training_start_consumption_id:record.training_start_consumption_id,

    trainer_generation_id:record.trainer_generation_id,
    trainer_boot_id_sha256:record.trainer_boot_id_sha256,
    trainer_pid:record.trainer_pid,
    trainer_process_start_time_ticks:record.trainer_process_start_time_ticks,
    trainer_uid:record.trainer_uid,
    trainer_gid:record.trainer_gid,
    trainer_source_identity_sha256:record.trainer_source_identity_sha256,

    protected_store_origin_required:true,
    protected_store_origin_proven:false,
    current_store_generation_revalidation_required:true,
    current_store_generation_revalidation_performed:false,
    durable_claim_record_reread_required:true,
    durable_claim_record_reread_performed:false,
    authorization_winner_reread_required:true,
    authorization_winner_reread_performed:false,
    consumption_slot_classification_required:true,
    consumption_slot_classification_performed:false,
    writer_directory_capability_from_fixed_root_required:true,
    writer_directory_capability_exact_path_required:true,
    writer_directory_capability_exact_path_proven:false,
    writer_directory_capability_origin_proven:false,
    same_store_generation_through_writer_required:true,
    protected_writer_invocation_required:true,
    protected_writer_invocation_authorized:false,
    training_start_consumption_performed:false,
    trainer_release_authorized:false,
    trainer_release_performed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,

    next_gate:"apollyon_training_start_protected_store_revalidator_v1",
  };

  return Object.freeze({
    ...material,
    revalidation_request_id:
      "apollyon_training_store_revalidation_request_v1:"+
      sha256(Buffer.from(canonical(material),"utf8")),
    authority:
      VOID_APOLLYON_TRAINING_START_STORE_REVALIDATION_REQUEST_AUTHORITY_V1,
  });
}
