#!/usr/bin/env node
import crypto from "node:crypto";
import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  validateApollyonTrainingStartConsumptionRecordV1,
} from "./apollyon-training-start-consumption-contract-v1.mjs";

export const VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_V1 =
  "VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_V1";

export const PARENT_TRAINING_START_CONTRACT_BLOB_SHA1 =
  "f4b5c984cc67de470df1af949723eeaefba0393f";
export const CANONICALIZER_V1_BLOB_SHA1 =
  "f97fafb0148527ae3a954e2752faef8c7fc9e88e";

export const VOID_APOLLYON_TRAINING_START_RELEASE_REQUIREMENTS_V1 =
  Object.freeze({
    blocked_native_first_entry_required:true,
    block_before_model_or_weight_instruction_required:true,
    retained_pidfd_required:true,
    process_start_ticks_required:true,
    reviewed_executable_source_identity_required:true,
    private_inherited_release_channel_required:true,
    release_channel_reconstructible_from_pid_path_or_token_forbidden:true,
    caller_supplied_pid_signal_or_token_release_forbidden:true,
    generic_filesystem_flag_release_forbidden:true,
    exact_release_frame_required:true,
    release_channel_eof_before_authorization_fail_closed:true,
    releaser_crash_before_authorization_fail_closed:true,
    exact_consumption_slot_durable_before_release_required:true,
    consumption_file_fsync_required:true,
    consumption_directory_fsync_required:true,
    final_visible_consumption_record_reread_required:true,
    same_trainer_generation_revalidation_immediately_before_release_required:true,
    exact_uid_gid_groups_nnp_caps_revalidation_required:true,
    trainer_consumption_store_write_rename_unlink_denied_required:true,
    trainer_self_release_forbidden:true,
    pid_reuse_rejected_required:true,
    second_trainer_generation_release_rejected_required:true,
    bound_generation_loss_forfeits_attempt_required:true,
    release_not_transferable_to_replacement_generation_required:true,
    automatic_retry_authorized:false,
  });

export const VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_KEYS_V1 =
  Object.freeze([
    "attempt_limit",
    "authority",
    "authorization_id",
    "automatic_retry_authorized",
    "blocked_native_first_entry_required",
    "bound_generation_loss_forfeits_attempt",
    "candidate_weight_mutation_performed",
    "claim_record_id",
    "claim_record_sha256",
    "consumption_durability_revalidation_performed",
    "consumption_durability_revalidation_required",
    "custody_generation_id",
    "custody_record_sha256",
    "live_trainer_generation_revalidation_performed",
    "live_trainer_generation_revalidation_required",
    "marker",
    "next_gate",
    "parent_training_start_contract_blob_sha1",
    "private_release_channel_origin_proven",
    "private_release_channel_required",
    "protected_consumption_record_origin_proven",
    "protected_consumption_record_origin_required",
    "publish_request_sha256",
    "release_binding_id",
    "release_not_transferable_to_replacement_generation",
    "release_policy_id",
    "status",
    "store_contract_id",
    "store_generation_id",
    "store_policy_id",
    "terminal_receipt_id",
    "trainer_boot_id_sha256",
    "trainer_generation_id",
    "trainer_gid",
    "trainer_pid",
    "trainer_process_start_time_ticks",
    "trainer_release_performed",
    "trainer_source_identity_sha256",
    "trainer_uid",
    "training_execution_authorized",
    "training_execution_performed",
    "training_identity_policy_revalidation_performed",
    "training_identity_policy_revalidation_required",
    "training_start_consumption_id",
    "training_start_consumption_slot_id",
    "version",
  ]);

export const VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract:true,
    exact_parent_consumption_record_required:true,
    release_policy_content_addressed:true,
    release_binding_content_addressed:true,
    protected_consumption_record_origin_required:true,
    protected_consumption_record_origin_proven:false,
    consumption_durability_revalidation_required:true,
    consumption_durability_revalidation_performed:false,
    live_trainer_generation_revalidation_required:true,
    live_trainer_generation_revalidation_performed:false,
    training_identity_policy_revalidation_required:true,
    training_identity_policy_revalidation_performed:false,
    private_release_channel_required:true,
    private_release_channel_origin_proven:false,
    trainer_release_performed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    automatic_retry_authorized:false,
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

const RELEASE_BINDING_ID=
  /^apollyon_training_start_release_binding_v1:[0-9a-f]{64}$/u;
const RELEASE_POLICY_ID=
  /^apollyon_training_start_release_policy_v1:[0-9a-f]{64}$/u;

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

function releasePolicyMaterial(){
  return {
    marker:"VOID_APOLLYON_TRAINING_START_RELEASE_POLICY_V1",
    version:1,
    parent_training_start_contract_blob_sha1:
      PARENT_TRAINING_START_CONTRACT_BLOB_SHA1,
    canonicalizer_v1_blob_sha1:CANONICALIZER_V1_BLOB_SHA1,
    requirements:VOID_APOLLYON_TRAINING_START_RELEASE_REQUIREMENTS_V1,
  };
}

export function qualifyApollyonTrainingStartReleasePolicyV1(){
  const material=releasePolicyMaterial();
  return Object.freeze({
    ...material,
    release_policy_id:"apollyon_training_start_release_policy_v1:"+
      sha256(Buffer.from(canonical(material),"utf8")),
  });
}

export function qualifyApollyonTrainingStartReleaseBindingV1(input){
  const snapshot=clonePlain(
    input,
    "apollyon_training_start_release_v1_input_invalid",
  );
  exactOwnKeys(
    snapshot,
    ["consumption_record"],
    "apollyon_training_start_release_v1_input_invalid",
  );
  const record=validateApollyonTrainingStartConsumptionRecordV1(
    snapshot.consumption_record,
  );
  const policy=qualifyApollyonTrainingStartReleasePolicyV1();
  if(!RELEASE_POLICY_ID.test(policy.release_policy_id)){
    fail("apollyon_training_start_release_v1_policy_id_invalid");
  }

  const material={
    marker:VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_V1,
    version:1,
    status:"training_start_release_binding_source_qualified_unimplemented",
    parent_training_start_contract_blob_sha1:
      PARENT_TRAINING_START_CONTRACT_BLOB_SHA1,
    release_policy_id:policy.release_policy_id,
    training_start_consumption_slot_id:
      record.training_start_consumption_slot_id,
    training_start_consumption_id:
      record.training_start_consumption_id,
    store_policy_id:record.store_policy_id,
    store_contract_id:record.store_contract_id,
    store_generation_id:record.store_generation_id,
    terminal_receipt_id:record.terminal_receipt_id,
    authorization_id:record.authorization_id,
    custody_generation_id:record.custody_generation_id,
    custody_record_sha256:record.custody_record_sha256,
    claim_record_id:record.claim_record_id,
    claim_record_sha256:record.claim_record_sha256,
    publish_request_sha256:record.publish_request_sha256,
    trainer_generation_id:record.trainer_generation_id,
    trainer_boot_id_sha256:record.trainer_boot_id_sha256,
    trainer_pid:record.trainer_pid,
    trainer_process_start_time_ticks:
      record.trainer_process_start_time_ticks,
    trainer_uid:record.trainer_uid,
    trainer_gid:record.trainer_gid,
    trainer_source_identity_sha256:
      record.trainer_source_identity_sha256,
    attempt_limit:record.attempt_limit,
    automatic_retry_authorized:false,
    protected_consumption_record_origin_required:true,
    protected_consumption_record_origin_proven:false,
    consumption_durability_revalidation_required:true,
    consumption_durability_revalidation_performed:false,
    blocked_native_first_entry_required:true,
    live_trainer_generation_revalidation_required:true,
    live_trainer_generation_revalidation_performed:false,
    training_identity_policy_revalidation_required:true,
    training_identity_policy_revalidation_performed:false,
    private_release_channel_required:true,
    private_release_channel_origin_proven:false,
    release_not_transferable_to_replacement_generation:true,
    bound_generation_loss_forfeits_attempt:true,
    trainer_release_performed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    next_gate:"apollyon_training_start_release_native_candidate_v1",
  };
  return Object.freeze({
    ...material,
    release_binding_id:"apollyon_training_start_release_binding_v1:"+
      sha256(Buffer.from(canonical(material),"utf8")),
    authority:VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_AUTHORITY_V1,
  });
}

export function validateApollyonTrainingStartReleaseBindingV1(input){
  const value=clonePlain(
    input,
    "apollyon_training_start_release_v1_binding_invalid",
  );
  exactOwnKeys(
    value,
    VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_KEYS_V1,
    "apollyon_training_start_release_v1_binding_invalid",
  );
  exactOwnKeys(
    value.authority,
    Object.keys(VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_AUTHORITY_V1),
    "apollyon_training_start_release_v1_authority_invalid",
  );
  const expected=qualifyApollyonTrainingStartReleaseBindingV1({
    consumption_record:{
      marker:"VOID_APOLLYON_TRAINING_START_CONSUMPTION_RECORD_V1",
      version:1,
      status:"training_start_consumption_record_v1",
      store_policy_id:value.store_policy_id,
      store_contract_id:value.store_contract_id,
      store_generation_id:value.store_generation_id,
      terminal_receipt_id:value.terminal_receipt_id,
      authorization_id:value.authorization_id,
      custody_generation_id:value.custody_generation_id,
      custody_record_sha256:value.custody_record_sha256,
      claim_record_id:value.claim_record_id,
      claim_record_sha256:value.claim_record_sha256,
      publish_request_sha256:value.publish_request_sha256,
      training_start_consumption_slot_id:
        value.training_start_consumption_slot_id,
      trainer_generation_id:value.trainer_generation_id,
      trainer_boot_id_sha256:value.trainer_boot_id_sha256,
      trainer_pid:value.trainer_pid,
      trainer_process_start_time_ticks:
        value.trainer_process_start_time_ticks,
      trainer_uid:value.trainer_uid,
      trainer_gid:value.trainer_gid,
      trainer_source_identity_sha256:
        value.trainer_source_identity_sha256,
      attempt_limit:value.attempt_limit,
      automatic_retry_authorized:value.automatic_retry_authorized,
      training_start_consumption_id:
        value.training_start_consumption_id,
    },
  });
  if(!RELEASE_BINDING_ID.test(value.release_binding_id)||
     canonical(value)!==canonical(expected)){
    fail("apollyon_training_start_release_v1_binding_invalid");
  }
  return Object.freeze(value);
}
