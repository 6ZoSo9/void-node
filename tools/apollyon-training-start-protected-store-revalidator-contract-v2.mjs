import crypto from "node:crypto";
import {types as utilTypes} from "node:util";

import {
  qualifyApollyonTrainingStartStoreRevalidationRequestV1,
} from "./apollyon-training-start-store-revalidation-request-v1.mjs";

export const VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_CONTRACT_V2 =
  "VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_CONTRACT_V2";

export const APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2 =
  Object.freeze({
    head:"550020518c2e4d7392b42d79cb83a3aee99f8c1e",
    revalidation_request_blob_sha1:"079576db7f880872f2d4dea8e7759bd536161516",
    protected_writer_blob_sha1:"76f5a6bcbc9854a1133cd1324eb862cb50102c0e",
    directory_custody_source_blob_sha1:"ed6eb47c2f83b35b489d0e9034a4b87c2d10b9dd",
    reviewed_canonicalizer_v2_head:"4306d608fbf5b13a8e20b02d8d416b9f55726b8f",
    reviewed_canonicalizer_v2_blob_sha1:"6e8056287ae4ac8c73b9230679a6a4b570d8eac8",
  });

export const VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_AUTHORITY_V2 =
  Object.freeze({
    source_contract_only:true,
    public_candidate_only:true,
    candidate_is_bearer_authority:false,
    flat_primitive_content_address_required:true,
    candidate_frame_hash_json_independent:true,
    reviewed_canonicalizer_v2_required_for_future_host:true,
    reviewed_canonicalizer_v2_host_integration_proven:false,
    parent_revalidation_request_v1_host_realm_proven:false,
    candidate_material_derivation_host_realm_proven:false,
    fixture_terminal_root_policy_revalidation_source_bound:true,
    trusted_ancestor_custody_required:true,
    trusted_ancestor_custody_proven:false,
    root_and_consumption_access_acl_absence_required:true,
    root_and_consumption_default_acl_absence_required:true,
    root_and_consumption_acl_policy_revalidated:false,
    symlink_fifo_device_hardlink_rejection_required:true,
    record_regular_single_link_required:true,
    record_type_link_bounds_revalidated:false,
    record_bounded_canonical_eof_required:true,
    record_terminal_eof_revalidated:false,
    record_retained_visible_generation_required:true,
    terminal_receipt_reread_required:true,
    terminal_receipt_reread_performed:false,
    custody_record_reread_required:true,
    custody_record_reread_performed:false,
    publish_request_binding_revalidation_required:true,
    publish_request_binding_revalidation_performed:false,
    transaction_lease_fencing_required:true,
    transaction_lease_fencing_performed:false,
    lease_loss_maps_to_hold_required:true,
    indeterminate_close_maps_to_hold_required:true,
    automatic_retry_forbidden:true,
    fixture_custody_source_required:true,
    fixture_custody_receipt_authoritative:false,
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
    live_host_observation_performed:false,
    filesystem_read:false,
    filesystem_write:false,
    service_action:false,
    network_access:false,
    credential_access:false,
    private_key_access:false,
    signing:false,
    wallet_access:false,
    transaction:false,
    funds_movement:false,
    training_start_consumption_performed:false,
    trainer_release_authorized:false,
    trainer_release_performed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
  });

const MARKER =
  "VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_CANDIDATE_V2";
const STATUS="protected_store_revalidator_candidate_v2_unperformed";
const FIXED_ROOT="/var/lib/void-apollyon-attempt-claim-v2";
const FIXED_DIRECTORY=
  "/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1";
const NEXT_GATE=
  "apollyon_training_start_protected_store_revalidator_implementation_v2";
const ID_PREFIX="apollyon_training_start_protected_store_revalidator_v2:";

const HASH64=/^[0-9a-f]{64}$/u;
const GIT40=/^[0-9a-f]{40}$/u;
const STORE_POLICY_ID=/^apollyon_claim_store_policy_v2:[0-9a-f]{64}$/u;
const STORE_CONTRACT_ID=/^apollyon_claim_store_contract_v2:[0-9a-f]{64}$/u;
const STORE_GENERATION_ID=/^apollyon_claim_store_generation_v2:[0-9a-f]{64}$/u;
const TERMINAL_ID=/^apollyon_terminal_receipt_v2:[0-9a-f]{64}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const AUTH_SLOT_ID=/^apollyon_attempt_claim_auth_slot_v1:[0-9a-f]{64}$/u;
const AUTH_SLOT_RECORD_ID=
  /^apollyon_attempt_claim_auth_slot_record_v1:[0-9a-f]{64}$/u;
const CUSTODY_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;
const CLAIM_ID=/^apollyon_attempt_claim_record_v2:[0-9a-f]{64}$/u;
const CONSUMPTION_SLOT_ID=/^apollyon_training_start_slot_v1:[0-9a-f]{64}$/u;
const CONSUMPTION_ID=
  /^apollyon_training_start_consumption_v1:[0-9a-f]{64}$/u;
const TRAINER_GENERATION_ID=
  /^apollyon_pretraining_generation_v1:[0-9a-f]{64}$/u;
const REQUEST_ID=
  /^apollyon_training_store_revalidation_request_v1:[0-9a-f]{64}$/u;
const CANDIDATE_ID=
  /^apollyon_training_start_protected_store_revalidator_v2:[0-9a-f]{64}$/u;
const SLOT_LEAF=/^training-start-consumption-v1-[0-9a-f]{64}\.json$/u;

const TRUE_KEYS=Object.freeze([
  "source_contract_only",
  "flat_primitive_content_address_required",
  "candidate_frame_hash_json_independent",
  "reviewed_canonicalizer_v2_required_for_future_host",
  "fixture_terminal_root_policy_revalidation_source_bound",
  "trusted_ancestor_custody_required",
  "root_and_consumption_access_acl_absence_required",
  "root_and_consumption_default_acl_absence_required",
  "symlink_fifo_device_hardlink_rejection_required",
  "record_regular_single_link_required",
  "record_bounded_canonical_eof_required",
  "record_retained_visible_generation_required",
  "terminal_receipt_reread_required",
  "custody_record_reread_required",
  "publish_request_binding_revalidation_required",
  "transaction_lease_fencing_required",
  "lease_loss_maps_to_hold_required",
  "indeterminate_close_maps_to_hold_required",
  "automatic_retry_forbidden",
  "fixture_custody_source_required",
  "protected_store_origin_required",
  "current_store_generation_revalidation_required",
  "store_generation_record_reread_required",
  "generation_lineage_revalidation_required",
  "durable_claim_record_reread_required",
  "authorization_winner_reread_required",
  "consumption_slot_classification_required",
  "writer_directory_capability_from_fixed_root_required",
  "writer_directory_capability_exact_path_required",
  "fixed_root_visible_generation_revalidation_required",
  "fixed_consumption_directory_visible_generation_revalidation_required",
  "same_store_generation_through_writer_required",
  "protected_writer_invocation_required",
]);

const FALSE_KEYS=Object.freeze([
  "reviewed_canonicalizer_v2_host_integration_proven",
  "parent_revalidation_request_v1_host_realm_proven",
  "candidate_material_derivation_host_realm_proven",
  "trusted_ancestor_custody_proven",
  "root_and_consumption_acl_policy_revalidated",
  "record_type_link_bounds_revalidated",
  "record_terminal_eof_revalidated",
  "terminal_receipt_reread_performed",
  "custody_record_reread_performed",
  "publish_request_binding_revalidation_performed",
  "transaction_lease_fencing_performed",
  "fixture_custody_receipt_authoritative",
  "protected_store_origin_proven",
  "current_store_generation_revalidation_performed",
  "store_generation_record_reread_performed",
  "generation_lineage_revalidation_performed",
  "durable_claim_record_reread_performed",
  "authorization_winner_reread_performed",
  "consumption_slot_classification_performed",
  "writer_directory_capability_exact_path_proven",
  "writer_directory_capability_origin_proven",
  "fixed_root_visible_generation_revalidation_performed",
  "fixed_consumption_directory_visible_generation_revalidation_performed",
  "protected_writer_invocation_authorized",
  "live_host_observation_performed",
  "filesystem_read",
  "filesystem_write",
  "service_action",
  "network_access",
  "credential_access",
  "private_key_access",
  "signing",
  "wallet_access",
  "transaction",
  "funds_movement",
  "training_start_consumption_performed",
  "trainer_release_authorized",
  "trainer_release_performed",
  "training_execution_authorized",
  "training_execution_performed",
  "candidate_weight_mutation_performed",
]);

const MATERIAL_KEYS=Object.freeze([
  "marker","version","status","target_host",
  "parent_head","parent_revalidation_request_blob_sha1",
  "parent_protected_writer_blob_sha1","parent_directory_custody_source_blob_sha1",
  "reviewed_canonicalizer_v2_head","reviewed_canonicalizer_v2_blob_sha1",
  "revalidation_request_id",
  "fixed_claim_state_root","fixed_training_start_consumption_directory",
  "store_policy_id","store_contract_id","store_generation_id",
  "terminal_receipt_id","authorization_id","authorization_slot_id",
  "authorization_slot_record_id","custody_generation_id","custody_record_sha256",
  "claim_record_id","claim_record_sha256","publish_request_sha256",
  "training_start_consumption_slot_id","training_start_consumption_slot_leaf",
  "training_start_consumption_id","trainer_generation_id","trainer_boot_id_sha256",
  "trainer_pid","trainer_process_start_time_ticks","trainer_uid","trainer_gid",
  "trainer_source_identity_sha256",
  "source_contract_only","flat_primitive_content_address_required",
  "candidate_frame_hash_json_independent",
  "reviewed_canonicalizer_v2_required_for_future_host",
  "reviewed_canonicalizer_v2_host_integration_proven",
  "parent_revalidation_request_v1_host_realm_proven",
  "candidate_material_derivation_host_realm_proven",
  "fixture_terminal_root_policy_revalidation_source_bound",
  "trusted_ancestor_custody_required","trusted_ancestor_custody_proven",
  "root_and_consumption_access_acl_absence_required",
  "root_and_consumption_default_acl_absence_required",
  "root_and_consumption_acl_policy_revalidated",
  "symlink_fifo_device_hardlink_rejection_required",
  "record_regular_single_link_required","record_type_link_bounds_revalidated",
  "record_bounded_canonical_eof_required","record_terminal_eof_revalidated",
  "record_retained_visible_generation_required",
  "terminal_receipt_reread_required","terminal_receipt_reread_performed",
  "custody_record_reread_required","custody_record_reread_performed",
  "publish_request_binding_revalidation_required",
  "publish_request_binding_revalidation_performed",
  "transaction_lease_fencing_required","transaction_lease_fencing_performed",
  "lease_loss_maps_to_hold_required","indeterminate_close_maps_to_hold_required",
  "automatic_retry_forbidden",
  "fixture_custody_source_required","fixture_custody_receipt_authoritative",
  "protected_store_origin_required","protected_store_origin_proven",
  "current_store_generation_revalidation_required",
  "current_store_generation_revalidation_performed",
  "store_generation_record_reread_required",
  "store_generation_record_reread_performed",
  "generation_lineage_revalidation_required",
  "generation_lineage_revalidation_performed",
  "durable_claim_record_reread_required","durable_claim_record_reread_performed",
  "authorization_winner_reread_required","authorization_winner_reread_performed",
  "consumption_slot_classification_required",
  "consumption_slot_classification_performed",
  "writer_directory_capability_from_fixed_root_required",
  "writer_directory_capability_exact_path_required",
  "writer_directory_capability_exact_path_proven",
  "writer_directory_capability_origin_proven",
  "fixed_root_visible_generation_revalidation_required",
  "fixed_root_visible_generation_revalidation_performed",
  "fixed_consumption_directory_visible_generation_revalidation_required",
  "fixed_consumption_directory_visible_generation_revalidation_performed",
  "same_store_generation_through_writer_required",
  "protected_writer_invocation_required","protected_writer_invocation_authorized",
  "live_host_observation_performed","filesystem_read","filesystem_write",
  "service_action","network_access","credential_access","private_key_access",
  "signing","wallet_access","transaction","funds_movement",
  "training_start_consumption_performed","trainer_release_authorized",
  "trainer_release_performed","training_execution_authorized",
  "training_execution_performed","candidate_weight_mutation_performed",
  "next_gate",
]);
const FULL_KEYS=Object.freeze([...MATERIAL_KEYS,"revalidator_candidate_id"]);
function keyLookup(keys){
  const out=Object.create(null);
  for(let index=0;index<keys.length;index+=1)out[keys[index]]=true;
  return Object.freeze(out);
}
const MATERIAL_KEY_LOOKUP=keyLookup(MATERIAL_KEYS);
const FULL_KEY_LOOKUP=keyLookup(FULL_KEYS);

function fail(code){throw new Error(code);}
function sha256(raw){return APPLY(CREATE_HASH,crypto,["sha256"]).update(raw).digest("hex");}
const APPLY=Reflect.apply;
const REFLECT_OWN_KEYS=Reflect.ownKeys;
const GET_PROTOTYPE_OF=Object.getPrototypeOf;
const GET_OWN_PROPERTY_DESCRIPTOR=Object.getOwnPropertyDescriptor;
const HAS_OWN=Object.hasOwn;
const CREATE_NULL=Object.create;
const FREEZE=Object.freeze;
const OBJECT_PROTOTYPE=Object.prototype;
const ARRAY_IS_ARRAY=Array.isArray;
const IS_SAFE_INTEGER=Number.isSafeInteger;
const IS_PROXY=utilTypes.isProxy;
const PRIMITIVE_STRING=String;
const CREATE_HASH=crypto.createHash;
const BUFFER_CTOR=Buffer;
const BUFFER_FROM=Buffer.from;
const BUFFER_CONCAT=Buffer.concat;
const BUFFER_ALLOC=Buffer.alloc;
const WRITE_U32=Buffer.prototype.writeUInt32BE;
function bytes(text,encoding="utf8"){
  return APPLY(BUFFER_FROM,BUFFER_CTOR,[text,encoding]);
}
function u32(value){
  if(!IS_SAFE_INTEGER(value)||value<0||value>0xffffffff){
    fail("apollyon_training_start_protected_store_revalidator_v2_frame_length_invalid");
  }
  const out=APPLY(BUFFER_ALLOC,BUFFER_CTOR,[4]);
  APPLY(WRITE_U32,out,[value,0]);
  return out;
}
function primitivePayload(value){
  if(typeof value==="string"){
    const raw=bytes(value);
    return APPLY(BUFFER_CONCAT,BUFFER_CTOR,[[bytes("s","ascii"),u32(raw.length),raw]]);
  }
  if(typeof value==="boolean"){
    return bytes(value?"b1":"b0","ascii");
  }
  if(typeof value==="number"&&IS_SAFE_INTEGER(value)){
    const raw=bytes(PRIMITIVE_STRING(value),"ascii");
    return APPLY(BUFFER_CONCAT,BUFFER_CTOR,[[bytes("i","ascii"),u32(raw.length),raw]]);
  }
  fail("apollyon_training_start_protected_store_revalidator_v2_frame_value_invalid");
}
function frameRecord(value,withId){
  const snapshot=snapshotFlat(value,withId);
  const keys=withId?FULL_KEYS:MATERIAL_KEYS;
  const chunks=new Array(1+keys.length*4);
  chunks[0]=bytes("VOID_APOLLYON_PROTECTED_STORE_REVALIDATOR_V2_FRAME_1\0","ascii");
  let offset=1;
  for(let index=0;index<keys.length;index+=1){
    const key=keys[index];
    const keyBytes=bytes(key);
    const payload=primitivePayload(snapshot[key]);
    chunks[offset]=u32(keyBytes.length);
    chunks[offset+1]=keyBytes;
    chunks[offset+2]=u32(payload.length);
    chunks[offset+3]=payload;
    offset+=4;
  }
  return APPLY(BUFFER_CONCAT,BUFFER_CTOR,[chunks]);
}
function sameFlat(left,right,keys){
  for(let index=0;index<keys.length;index+=1){
    const key=keys[index];
    if(left[key]!==right[key])return false;
  }
  return true;
}

function snapshotFlat(input,withId){
  const code="apollyon_training_start_protected_store_revalidator_v2_candidate_schema_invalid";
  if(
    !input||typeof input!=="object"||IS_PROXY(input)||
    ARRAY_IS_ARRAY(input)
  )fail(code);
  const proto=GET_PROTOTYPE_OF(input);
  if(proto!==OBJECT_PROTOTYPE&&proto!==null)fail(code);
  const expected=withId?FULL_KEYS:MATERIAL_KEYS;
  const allowed=withId?FULL_KEY_LOOKUP:MATERIAL_KEY_LOOKUP;
  const own=REFLECT_OWN_KEYS(input);
  if(own.length!==expected.length)fail(code);
  const out=CREATE_NULL(null);
  for(let index=0;index<own.length;index+=1){
    const key=own[index];
    if(typeof key!=="string"||!HAS_OWN(allowed,key))fail(code);
    const descriptor=GET_OWN_PROPERTY_DESCRIPTOR(input,key);
    if(!descriptor?.enumerable||!HAS_OWN(descriptor,"value"))fail(code);
    const value=descriptor.value;
    if(typeof value==="string"){
      if(value.length<1||value.length>512)fail(code);
    }else if(typeof value==="boolean"){
      // exact semantic value is checked below
    }else if(typeof value==="number"){
      if(!IS_SAFE_INTEGER(value))fail(code);
    }else{
      fail(code);
    }
    out[key]=value;
  }
  for(let index=0;index<expected.length;index+=1){
    if(!HAS_OWN(out,expected[index]))fail(code);
  }
  return out;
}

function validateMaterial(value){
  const code="apollyon_training_start_protected_store_revalidator_v2_candidate_invalid";
  if(
    value.marker!==MARKER||value.version!==2||value.status!==STATUS||
    value.target_host!=="Xiphos"||
    value.parent_head!==
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2.head||
    value.parent_revalidation_request_blob_sha1!==
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2
        .revalidation_request_blob_sha1||
    value.parent_protected_writer_blob_sha1!==
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2
        .protected_writer_blob_sha1||
    value.parent_directory_custody_source_blob_sha1!==
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2
        .directory_custody_source_blob_sha1||
    value.reviewed_canonicalizer_v2_head!==
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2
        .reviewed_canonicalizer_v2_head||
    value.reviewed_canonicalizer_v2_blob_sha1!==
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2
        .reviewed_canonicalizer_v2_blob_sha1||
    value.fixed_claim_state_root!==FIXED_ROOT||
    value.fixed_training_start_consumption_directory!==FIXED_DIRECTORY||
    value.next_gate!==NEXT_GATE||
    !GIT40.test(value.parent_head)||
    !GIT40.test(value.parent_revalidation_request_blob_sha1)||
    !GIT40.test(value.parent_protected_writer_blob_sha1)||
    !GIT40.test(value.parent_directory_custody_source_blob_sha1)||
    !GIT40.test(value.reviewed_canonicalizer_v2_head)||
    !GIT40.test(value.reviewed_canonicalizer_v2_blob_sha1)||
    !REQUEST_ID.test(value.revalidation_request_id)||
    !STORE_POLICY_ID.test(value.store_policy_id)||
    !STORE_CONTRACT_ID.test(value.store_contract_id)||
    !STORE_GENERATION_ID.test(value.store_generation_id)||
    !TERMINAL_ID.test(value.terminal_receipt_id)||
    !AUTH_ID.test(value.authorization_id)||
    !AUTH_SLOT_ID.test(value.authorization_slot_id)||
    !AUTH_SLOT_RECORD_ID.test(value.authorization_slot_record_id)||
    !CUSTODY_ID.test(value.custody_generation_id)||
    !HASH64.test(value.custody_record_sha256)||
    !CLAIM_ID.test(value.claim_record_id)||
    !HASH64.test(value.claim_record_sha256)||
    !HASH64.test(value.publish_request_sha256)||
    !CONSUMPTION_SLOT_ID.test(value.training_start_consumption_slot_id)||
    !SLOT_LEAF.test(value.training_start_consumption_slot_leaf)||
    !CONSUMPTION_ID.test(value.training_start_consumption_id)||
    !TRAINER_GENERATION_ID.test(value.trainer_generation_id)||
    !HASH64.test(value.trainer_boot_id_sha256)||
    !IS_SAFE_INTEGER(value.trainer_pid)||value.trainer_pid<=1||
    typeof value.trainer_process_start_time_ticks!=="string"||
    !/^[1-9][0-9]{0,19}$/u.test(value.trainer_process_start_time_ticks)||
    !IS_SAFE_INTEGER(value.trainer_uid)||
      value.trainer_uid<=0||value.trainer_uid>65533||
    !IS_SAFE_INTEGER(value.trainer_gid)||
      value.trainer_gid<=0||value.trainer_gid>65533||
    !HASH64.test(value.trainer_source_identity_sha256)
  )fail(code);
  for(let index=0;index<TRUE_KEYS.length;index+=1){
    if(value[TRUE_KEYS[index]]!==true)fail(code);
  }
  for(let index=0;index<FALSE_KEYS.length;index+=1){
    if(value[FALSE_KEYS[index]]!==false)fail(code);
  }
}

function materialFromRequest(request){
  if(
    request.fixed_claim_state_root!==FIXED_ROOT||
    request.fixed_training_start_consumption_directory!==FIXED_DIRECTORY||
    request.protected_store_origin_proven!==false||
    request.current_store_generation_revalidation_performed!==false||
    request.authorization_winner_reread_performed!==false||
    request.writer_directory_capability_origin_proven!==false||
    request.protected_writer_invocation_authorized!==false||
    request.training_execution_authorized!==false||
    request.authority?.source_only_contract!==true||
    request.authority?.protected_store_origin_proven!==false||
    request.authority?.protected_writer_invocation_authorized!==false
  ){
    fail("apollyon_training_start_protected_store_revalidator_v2_parent_request_invalid");
  }
  return {
    marker:MARKER,
    version:2,
    status:STATUS,
    target_host:"Xiphos",
    parent_head:
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2.head,
    parent_revalidation_request_blob_sha1:
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2
        .revalidation_request_blob_sha1,
    parent_protected_writer_blob_sha1:
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2
        .protected_writer_blob_sha1,
    parent_directory_custody_source_blob_sha1:
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2
        .directory_custody_source_blob_sha1,
    reviewed_canonicalizer_v2_head:
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2
        .reviewed_canonicalizer_v2_head,
    reviewed_canonicalizer_v2_blob_sha1:
      APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2
        .reviewed_canonicalizer_v2_blob_sha1,
    revalidation_request_id:request.revalidation_request_id,
    fixed_claim_state_root:request.fixed_claim_state_root,
    fixed_training_start_consumption_directory:
      request.fixed_training_start_consumption_directory,
    store_policy_id:request.store_policy_id,
    store_contract_id:request.store_contract_id,
    store_generation_id:request.store_generation_id,
    terminal_receipt_id:request.terminal_receipt_id,
    authorization_id:request.authorization_id,
    authorization_slot_id:request.authorization_slot_id,
    authorization_slot_record_id:request.authorization_slot_record_id,
    custody_generation_id:request.custody_generation_id,
    custody_record_sha256:request.custody_record_sha256,
    claim_record_id:request.claim_record_id,
    claim_record_sha256:request.claim_record_sha256,
    publish_request_sha256:request.publish_request_sha256,
    training_start_consumption_slot_id:
      request.training_start_consumption_slot_id,
    training_start_consumption_slot_leaf:
      request.training_start_consumption_slot_leaf,
    training_start_consumption_id:request.training_start_consumption_id,
    trainer_generation_id:request.trainer_generation_id,
    trainer_boot_id_sha256:request.trainer_boot_id_sha256,
    trainer_pid:request.trainer_pid,
    trainer_process_start_time_ticks:request.trainer_process_start_time_ticks,
    trainer_uid:request.trainer_uid,
    trainer_gid:request.trainer_gid,
    trainer_source_identity_sha256:request.trainer_source_identity_sha256,
    source_contract_only:true,
    flat_primitive_content_address_required:true,
    candidate_frame_hash_json_independent:true,
    reviewed_canonicalizer_v2_required_for_future_host:true,
    reviewed_canonicalizer_v2_host_integration_proven:false,
    parent_revalidation_request_v1_host_realm_proven:false,
    candidate_material_derivation_host_realm_proven:false,
    fixture_terminal_root_policy_revalidation_source_bound:true,
    trusted_ancestor_custody_required:true,
    trusted_ancestor_custody_proven:false,
    root_and_consumption_access_acl_absence_required:true,
    root_and_consumption_default_acl_absence_required:true,
    root_and_consumption_acl_policy_revalidated:false,
    symlink_fifo_device_hardlink_rejection_required:true,
    record_regular_single_link_required:true,
    record_type_link_bounds_revalidated:false,
    record_bounded_canonical_eof_required:true,
    record_terminal_eof_revalidated:false,
    record_retained_visible_generation_required:true,
    terminal_receipt_reread_required:true,
    terminal_receipt_reread_performed:false,
    custody_record_reread_required:true,
    custody_record_reread_performed:false,
    publish_request_binding_revalidation_required:true,
    publish_request_binding_revalidation_performed:false,
    transaction_lease_fencing_required:true,
    transaction_lease_fencing_performed:false,
    lease_loss_maps_to_hold_required:true,
    indeterminate_close_maps_to_hold_required:true,
    automatic_retry_forbidden:true,
    fixture_custody_source_required:true,
    fixture_custody_receipt_authoritative:false,
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
    live_host_observation_performed:false,
    filesystem_read:false,
    filesystem_write:false,
    service_action:false,
    network_access:false,
    credential_access:false,
    private_key_access:false,
    signing:false,
    wallet_access:false,
    transaction:false,
    funds_movement:false,
    training_start_consumption_performed:false,
    trainer_release_authorized:false,
    trainer_release_performed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    next_gate:NEXT_GATE,
  };
}

export function buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(input){
  const request=qualifyApollyonTrainingStartStoreRevalidationRequestV1(input);
  const material=materialFromRequest(request);
  validateMaterial(material);
  return FREEZE({
    ...material,
    revalidator_candidate_id:
      ID_PREFIX+sha256(frameRecord(material,false)),
  });
}

export function qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(
  input,
){
  const value=snapshotFlat(input,true);
  if(!CANDIDATE_ID.test(value.revalidator_candidate_id)){
    fail("apollyon_training_start_protected_store_revalidator_v2_candidate_id_invalid");
  }
  const material={...value};
  delete material.revalidator_candidate_id;
  validateMaterial(material);
  const expected=ID_PREFIX+sha256(frameRecord(material,false));
  if(value.revalidator_candidate_id!==expected){
    fail("apollyon_training_start_protected_store_revalidator_v2_candidate_id_invalid");
  }
  return FREEZE({...value});
}

export function qualifyApollyonTrainingStartProtectedStoreRevalidatorAgainstRequestV2(
  requestInput,
  candidateInput,
){
  const candidate=
    qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(
      candidateInput,
    );
  const expected=
    buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(
      requestInput,
    );
  if(
    candidate.revalidator_candidate_id!==expected.revalidator_candidate_id||
    !sameFlat(candidate,expected,FULL_KEYS)
  ){
    fail("apollyon_training_start_protected_store_revalidator_v2_parent_request_mismatch");
  }
  return candidate;
}

export function encodeApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(
  input,
){
  const value=qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(input);
  return APPLY(BUFFER_FROM,BUFFER_CTOR,[frameRecord(value,true)]);
}

export const APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_MATERIAL_KEYS_V2 =
  MATERIAL_KEYS;
