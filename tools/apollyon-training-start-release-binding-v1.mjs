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
  "60987b860fb7159d88f4f601b76878e7d8ccca92";
export const AUTHORIZATION_SLOT_V1_BLOB_SHA1 =
  "93582c324ca85aeff56eb61f82b32f1e4c18dfe9";
export const CANONICALIZER_V1_BLOB_SHA1 =
  "f97fafb0148527ae3a954e2752faef8c7fc9e88e";
export const RELEASE_FRAME_BYTES_V1 = 64;
export const RELEASE_FRAME_DOMAIN_SHA256_HEX_V1 =
  "c201c621cc904c2e9c0c2527322debc326736b7f5e2c731a1032d2f1d3cb2b16";

export const VOID_APOLLYON_TRAINING_START_RELEASE_REQUIREMENTS_V1 =
  Object.freeze({
    blocked_native_first_entry_required:true,
    block_before_model_or_weight_instruction_required:true,
    retained_pidfd_required:true,
    process_start_ticks_required:true,
    reviewed_executable_source_identity_required:true,
    private_inherited_release_channel_required:true,
    reviewed_releaser_generation_required:true,
    releaser_pidfd_retained_required:true,
    releaser_start_ticks_bound_required:true,
    releaser_source_identity_exact_required:true,
    releaser_uid_gid_groups_identity_required:true,
    releaser_live_through_authorized_frame_completion_required:true,
    trainer_direct_parent_releaser_lineage_required:true,
    trainer_inherits_release_read_end_only_required:true,
    trainer_release_write_end_absent_required:true,
    release_write_end_exclusive_to_reviewed_releaser_required:true,
    unrelated_duplicate_release_writer_fds_rejected_required:true,
    correct_frame_from_unreviewed_writer_is_authority:false,
    release_channel_reconstructible_from_pid_path_or_token_forbidden:true,
    caller_supplied_pid_signal_or_token_release_forbidden:true,
    generic_filesystem_flag_release_forbidden:true,
    exact_release_frame_required:true,
    release_frame_bytes:RELEASE_FRAME_BYTES_V1,
    release_frame_domain_sha256_hex:RELEASE_FRAME_DOMAIN_SHA256_HEX_V1,
    release_frame_binding_component_sha256_of_release_binding_id_utf8_required:true,
    release_frame_exact_read_then_eof_required:true,
    release_frame_bytes_are_not_bearer_authority:true,
    release_channel_eof_before_authorization_fail_closed:true,
    releaser_crash_before_authorization_fail_closed:true,
    exact_consumption_slot_durable_before_release_required:true,
    consumption_file_fsync_required:true,
    consumption_directory_fsync_required:true,
    final_visible_consumption_record_reread_required:true,
    unique_authorization_claim_slot_ids_preserved_required:true,
    unique_authorization_claim_slot_protected_origin_required:true,
    unique_authorization_claim_slot_revalidation_immediately_before_release_required:true,
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
    "authorization_slot_id",
    "authorization_slot_record_id",
    "automatic_retry_authorized",
    "blocked_native_first_entry_required",
    "bound_generation_loss_forfeits_attempt",
    "candidate_weight_mutation_performed",
    "claim_record_id",
    "claim_record_sha256",
    "consumption_durability_revalidation_performed",
    "consumption_durability_revalidation_required",
    "unique_authorization_claim_slot_protected_origin_required",
    "unique_authorization_claim_slot_protected_origin_proven",
    "unique_authorization_claim_slot_revalidation_required",
    "unique_authorization_claim_slot_revalidation_performed",
    "custody_generation_id",
    "custody_record_sha256",
    "live_trainer_generation_revalidation_performed",
    "live_trainer_generation_revalidation_required",
    "marker",
    "next_gate",
    "parent_training_start_contract_blob_sha1",
    "private_release_channel_origin_proven",
    "release_writer_exclusivity_proven",
    "release_writer_exclusivity_required",
    "releaser_generation_revalidation_performed",
    "releaser_generation_revalidation_required",
    "trainer_releaser_lineage_proven",
    "trainer_releaser_lineage_required",
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
    unique_authorization_claim_slot_required:true,
    unique_authorization_claim_slot_protected_origin_required:true,
    unique_authorization_claim_slot_protected_origin_proven:false,
    unique_authorization_claim_slot_revalidation_required:true,
    unique_authorization_claim_slot_revalidation_performed:false,
    live_trainer_generation_revalidation_required:true,
    live_trainer_generation_revalidation_performed:false,
    training_identity_policy_revalidation_required:true,
    training_identity_policy_revalidation_performed:false,
    private_release_channel_required:true,
    private_release_channel_origin_proven:false,
    releaser_generation_revalidation_required:true,
    releaser_generation_revalidation_performed:false,
    trainer_releaser_lineage_required:true,
    trainer_releaser_lineage_proven:false,
    release_writer_exclusivity_required:true,
    release_writer_exclusivity_proven:false,
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
const HASH64=/^[0-9a-f]{64}$/u;
const RELEASER_GENERATION_KEYS=Object.freeze([
  "gid",
  "marker",
  "pid",
  "pidfd_retained",
  "process_start_time_ticks",
  "source_identity_sha256",
  "supplementary_gids",
  "uid",
  "version",
]);
export const VOID_APOLLYON_TRAINING_START_RELEASE_CHANNEL_ORIGIN_SHAPE_KEYS_V1 =
  Object.freeze([
    "correct_release_frame_sha256",
    "release_binding",
    "release_write_end_exclusive_to_releaser",
    "releaser_generation",
    "releaser_live_through_frame_completion",
    "trainer_inherits_release_read_end_only",
    "trainer_observed_ppid",
    "trainer_release_write_end_absent",
    "unrelated_duplicate_writer_fds_absent",
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

function releasePolicyMaterial(){
  return {
    marker:"VOID_APOLLYON_TRAINING_START_RELEASE_POLICY_V1",
    version:1,
    parent_training_start_contract_blob_sha1:
      PARENT_TRAINING_START_CONTRACT_BLOB_SHA1,
    authorization_slot_v1_blob_sha1:AUTHORIZATION_SLOT_V1_BLOB_SHA1,
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
    authorization_slot_id:record.authorization_slot_id,
    authorization_slot_record_id:record.authorization_slot_record_id,
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
    unique_authorization_claim_slot_protected_origin_required:true,
    unique_authorization_claim_slot_protected_origin_proven:false,
    unique_authorization_claim_slot_revalidation_required:true,
    unique_authorization_claim_slot_revalidation_performed:false,
    blocked_native_first_entry_required:true,
    live_trainer_generation_revalidation_required:true,
    live_trainer_generation_revalidation_performed:false,
    training_identity_policy_revalidation_required:true,
    training_identity_policy_revalidation_performed:false,
    private_release_channel_required:true,
    private_release_channel_origin_proven:false,
    releaser_generation_revalidation_required:true,
    releaser_generation_revalidation_performed:false,
    trainer_releaser_lineage_required:true,
    trainer_releaser_lineage_proven:false,
    release_writer_exclusivity_required:true,
    release_writer_exclusivity_proven:false,
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

export function qualifyApollyonTrainingStartReleaseChannelOriginShapeV1(input){
  const snapshot=clonePlain(
    input,
    "apollyon_training_start_release_v1_channel_origin_shape_invalid",
  );
  exactOwnKeys(
    snapshot,
    VOID_APOLLYON_TRAINING_START_RELEASE_CHANNEL_ORIGIN_SHAPE_KEYS_V1,
    "apollyon_training_start_release_v1_channel_origin_shape_invalid",
  );
  const binding=validateApollyonTrainingStartReleaseBindingV1(
    snapshot.release_binding,
  );
  if(!HASH64.test(snapshot.correct_release_frame_sha256)){
    fail("apollyon_training_start_release_v1_channel_origin_frame_invalid");
  }
  const expectedFrame=apollyonTrainingStartReleaseFrameV1(binding);
  if(
    sha256(expectedFrame)!==snapshot.correct_release_frame_sha256
  ){
    fail("apollyon_training_start_release_v1_channel_origin_frame_invalid");
  }

  const releaser=clonePlain(
    snapshot.releaser_generation,
    "apollyon_training_start_release_v1_releaser_generation_invalid",
  );
  exactOwnKeys(
    releaser,
    RELEASER_GENERATION_KEYS,
    "apollyon_training_start_release_v1_releaser_generation_invalid",
  );
  if(
    releaser.marker!=="VOID_APOLLYON_TRAINING_START_RELEASER_GENERATION_V1"||
    releaser.version!==1||
    !Number.isSafeInteger(releaser.pid)||releaser.pid<=1||
    typeof releaser.process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(releaser.process_start_time_ticks)||
    !Number.isSafeInteger(releaser.uid)||releaser.uid<0||releaser.uid>65533||
    !Number.isSafeInteger(releaser.gid)||releaser.gid<0||releaser.gid>65533||
    !Array.isArray(releaser.supplementary_gids)||
    releaser.supplementary_gids.length>64||
    new Set(releaser.supplementary_gids).size!==releaser.supplementary_gids.length||
    releaser.supplementary_gids.some(
      gid=>!Number.isSafeInteger(gid)||gid<0||gid>65533
    )||
    !HASH64.test(releaser.source_identity_sha256)||
    releaser.pidfd_retained!==true||
    snapshot.trainer_observed_ppid!==releaser.pid||
    snapshot.trainer_inherits_release_read_end_only!==true||
    snapshot.trainer_release_write_end_absent!==true||
    snapshot.release_write_end_exclusive_to_releaser!==true||
    snapshot.unrelated_duplicate_writer_fds_absent!==true||
    snapshot.releaser_live_through_frame_completion!==true
  ){
    fail("apollyon_training_start_release_v1_channel_origin_shape_invalid");
  }

  return Object.freeze({
    status:"release_channel_origin_shape_qualified_not_authenticated",
    release_binding_id:binding.release_binding_id,
    correct_release_frame_shape_qualified:true,
    releaser_generation_shape_qualified:true,
    trainer_direct_parent_releaser_lineage_shape_qualified:true,
    trainer_read_end_only_shape_qualified:true,
    release_write_end_exclusivity_shape_qualified:true,
    private_release_channel_origin_proven:false,
    trainer_release_authorized:false,
    trainer_release_performed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
  });
}

export function apollyonTrainingStartReleaseFrameV1(input){
  const binding=validateApollyonTrainingStartReleaseBindingV1(input);
  const domain=Buffer.from(RELEASE_FRAME_DOMAIN_SHA256_HEX_V1,"hex");
  const bound=crypto.createHash("sha256")
    .update(Buffer.from(binding.release_binding_id,"utf8"))
    .digest();
  const frame=Buffer.concat([domain,bound]);
  if(frame.length!==RELEASE_FRAME_BYTES_V1){
    fail("apollyon_training_start_release_v1_frame_invalid");
  }
  return frame;
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
      authorization_slot_id:value.authorization_slot_id,
      authorization_slot_record_id:value.authorization_slot_record_id,
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
