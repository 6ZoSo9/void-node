#!/usr/bin/env node
import crypto from "node:crypto";
import {types as utilTypes} from "node:util";

import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2,
} from "./apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs";
import {
  VOID_APOLLYON_TRAINING_START_CONSUMPTION_RECORD_KEYS_V1,
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
    derived_consumption_leaf_bound:true,
    caller_supplied_store_path_supported:false,
    caller_supplied_consumption_directory_supported:false,
    protected_store_origin_required:true,
    protected_store_origin_proven:false,
    current_store_generation_revalidation_required:true,
    current_store_generation_revalidation_performed:false,
    store_generation_record_reread_required:true,
    store_generation_record_reread_performed:false,
    generation_lineage_revalidation_required:true,
    generation_lineage_revalidation_performed:false,
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
    fixed_root_visible_generation_revalidation_required:true,
    fixed_root_visible_generation_revalidation_performed:false,
    fixed_consumption_directory_visible_generation_revalidation_required:true,
    fixed_consumption_directory_visible_generation_revalidation_performed:false,
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
  "66b76ea9201f870672c0bc1c3df207b3c95cf68a";
export const STORE_SERVICE_CANDIDATE_BLOB_SHA1 =
  "87019ae1245a2054407dd47835b0b7a891d4d9a2";
export const PARENT_CONSUMPTION_CONTRACT_BLOB_SHA1 =
  "42d7d5d4ab75bfd4fc145f63c2a0432f9bcf9bd3";
export const FIXED_CLAIM_STATE_ROOT =
  "/var/lib/void-apollyon-attempt-claim-v2";
export const FIXED_TRAINING_START_CONSUMPTION_DIRECTORY =
  "/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1";

function fail(code){throw new Error(code);}
function canonical(value){return canonicalApollyonClaimContractJsonV1(value);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function plainObject(value,code){
  if(!value||typeof value!=="object"||utilTypes.isProxy(value)||Array.isArray(value)){
    fail(code);
  }
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  return value;
}
function captureEnvelope(input){
  const code="apollyon_training_start_store_revalidation_request_v1_input_invalid";
  const value=plainObject(input,code);
  const own=Reflect.ownKeys(value);
  if(own.length!==1||own[0]!=="consumption_record")fail(code);
  const descriptor=Object.getOwnPropertyDescriptor(value,"consumption_record");
  if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))fail(code);
  return descriptor.value;
}
function captureConsumptionRecord(input){
  const code=
    "apollyon_training_start_store_revalidation_request_v1_consumption_record_input_invalid";
  const value=plainObject(input,code);
  const expected=VOID_APOLLYON_TRAINING_START_CONSUMPTION_RECORD_KEYS_V1;
  const own=Reflect.ownKeys(value);
  if(own.length!==expected.length||own.some((key)=>typeof key!=="string"))fail(code);
  const allowed=new Set(expected);
  const snapshot={};
  for(const key of own){
    if(!allowed.has(key))fail(code);
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))fail(code);
    const item=descriptor.value;
    if(typeof item==="string"){
      if(item.length<1||item.length>256)fail(code);
    }else if(typeof item==="boolean"){
      // accepted primitive; exact semantic value is checked by #3333
    }else if(typeof item==="number"){
      if(!Number.isSafeInteger(item))fail(code);
    }else{
      fail(code);
    }
    snapshot[key]=item;
  }
  for(const key of expected)if(!Object.hasOwn(snapshot,key))fail(code);
  return snapshot;
}
const CONSUMPTION_SLOT_ID=
  /^apollyon_training_start_slot_v1:([0-9a-f]{64})$/u;
function consumptionSlotLeaf(record){
  const match=CONSUMPTION_SLOT_ID.exec(record.training_start_consumption_slot_id);
  if(!match){
    fail("apollyon_training_start_store_revalidation_request_v1_slot_invalid");
  }
  return "training-start-consumption-v1-"+match[1]+".json";
}
export function qualifyApollyonTrainingStartStoreRevalidationRequestV1(input){
  const consumptionRecordInput=captureEnvelope(input);
  const consumptionRecordSnapshot=
    captureConsumptionRecord(consumptionRecordInput);
  const record=validateApollyonTrainingStartConsumptionRecordV1(
    consumptionRecordSnapshot,
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
    training_start_consumption_slot_leaf:consumptionSlotLeaf(record),
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
    store_generation_record_reread_required:true,
    store_generation_record_reread_performed:false,
    generation_lineage_revalidation_required:true,
    generation_lineage_revalidation_performed:false,
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
    fixed_root_visible_generation_revalidation_required:true,
    fixed_root_visible_generation_revalidation_performed:false,
    fixed_consumption_directory_visible_generation_revalidation_required:true,
    fixed_consumption_directory_visible_generation_revalidation_performed:false,
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
