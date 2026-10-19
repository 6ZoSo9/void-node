import crypto from "node:crypto";
import {types as utilTypes} from "node:util";
import {
  qualifyApollyonTrainingActivationCapabilityV1,
} from "./apollyon-training-activation-capability-contract-v1.mjs";

export const VOID_APOLLYON_TRAINING_ACTIVATION_CREDENTIAL_TRANSPORT_CONTRACT_V1 =
  "VOID_APOLLYON_TRAINING_ACTIVATION_CREDENTIAL_TRANSPORT_CONTRACT_V1";

export const APOLLYON_ACTIVATION_TRANSPORT_PARENT_V1=Object.freeze({
  head:"d6670d8dd6185d034c9b07ef3a29390add63ee21",
  capability_contract_blob:"bcb47a4b105b89a459a4ea876b03f057450371c5",
  capability_credential_name:"apollyon-training-activation-v1",
  retired_activator_required:true,
});

export const APOLLYON_ACTIVATION_TRANSPORT_AUTHORITY_V1=Object.freeze({
  source_contract_only:true,
  activation_capability_external_validation_required:true,
  activation_capability_external_validation_performed:false,
  protected_authorization_slot_origin_required:true,
  protected_authorization_slot_origin_proven:false,
  protected_capability_issuance_required:true,
  protected_capability_issuance_performed:false,
  raw_secret_must_not_enter_public_receipt:true,
  bearer_secret_bytes:32,
  protected_credential_source_required:true,
  protected_credential_source_implemented:false,
  systemd_load_credential_candidate_only:true,
  systemd_runtime_transport_proven:false,
  credential_possession_proven:false,
  exact_invocation_generation_bound:false,
  direct_systemd_start_authorized:false,
  capability_replay_authorized:false,
  training_start_consumption_performed:false,
  trainer_release_authorized:false,
  training_execution_authorized:false,
  service_action:false,
  systemd_mutation:false,
  filesystem_read:false,
  filesystem_write:false,
  credential_access:false,
  network_access:false,
  key_or_signer_access:false,
  wallet_access:false,
  transaction:false,
  funds_movement:false,
});

const MARKER="VOID_APOLLYON_TRAINING_ACTIVATION_CREDENTIAL_TRANSPORT_CANDIDATE_V1";
const ID_PREFIX="apollyon_activation_credential_transport_v1:";
const HASH64=/^[0-9a-f]{64}$/u;
const GIT40=/^[0-9a-f]{40}$/u;
const CAPABILITY_ID=/^apollyon_training_activation_capability_v1:[0-9a-f]{64}$/u;
const SLOT_ID=/^apollyon_training_start_slot_v1:[0-9a-f]{64}$/u;
const CREDENTIAL_NAME="apollyon-training-activation-v1";
const STATUS="activation_credential_transport_candidate_unperformed";

const KEYS=Object.freeze([
  "activation_capability_external_validation_performed",
  "activation_capability_external_validation_required",
  "activation_capability_id",
  "activation_secret_sha256",
  "bearer_secret_bytes",
  "capability_replay_authorized",
  "credential_name",
  "credential_possession_proven",
  "direct_systemd_start_authorized",
  "exact_invocation_generation_bound",
  "filesystem_read",
  "filesystem_write",
  "host_credential_runtime_proven",
  "marker",
  "next_gate",
  "parent_capability_contract_blob_sha1",
  "parent_capability_contract_head",
  "protected_authorization_slot_origin_proven",
  "protected_authorization_slot_origin_required",
  "protected_capability_issuance_performed",
  "protected_capability_issuance_required",
  "protected_credential_source_implemented",
  "protected_credential_source_required",
  "raw_secret_in_public_receipt_authorized",
  "run_scoped_credential_required",
  "service_action",
  "shared_credential_reuse_authorized",
  "status",
  "systemd_credential_transport_candidate_only",
  "systemd_mutation",
  "target_host",
  "training_execution_authorized",
  "training_start_consumption_performed",
  "training_start_consumption_slot_id",
  "transaction",
  "version",
  "wallet_access",
  "funds_movement",
]);
const MATERIAL_KEYS=Object.freeze(KEYS);
const FULL_KEYS=Object.freeze([...KEYS,"transport_candidate_id"]);
const STRING_KEYS=new Set([
  "activation_capability_id","activation_secret_sha256","credential_name",
  "marker","next_gate","parent_capability_contract_blob_sha1",
  "parent_capability_contract_head","status","target_host",
  "training_start_consumption_slot_id","transport_candidate_id",
]);
const NUMBER_KEYS=new Set(["bearer_secret_bytes","version"]);
const TRUE_KEYS=new Set([
  "activation_capability_external_validation_required",
  "protected_authorization_slot_origin_required",
  "protected_capability_issuance_required",
  "protected_credential_source_required",
  "run_scoped_credential_required",
  "systemd_credential_transport_candidate_only",
]);
const FALSE_KEYS=new Set([
  "activation_capability_external_validation_performed",
  "capability_replay_authorized",
  "credential_possession_proven",
  "direct_systemd_start_authorized",
  "exact_invocation_generation_bound",
  "filesystem_read","filesystem_write","host_credential_runtime_proven",
  "protected_authorization_slot_origin_proven",
  "protected_capability_issuance_performed",
  "protected_credential_source_implemented",
  "raw_secret_in_public_receipt_authorized",
  "service_action","shared_credential_reuse_authorized",
  "systemd_mutation","training_execution_authorized",
  "training_start_consumption_performed",
  "transaction","wallet_access","funds_movement",
]);

function fail(reason){throw new Error(reason);}
function sha256(raw){return crypto.createHash("sha256").update(raw).digest("hex");}
function canonical(value){
  const sorted={};
  for(const key of Object.keys(value).sort()) sorted[key]=value[key];
  return JSON.stringify(sorted);
}

function safeFlatSnapshot(input,hasId){
  const error="apollyon_activation_credential_transport_schema_invalid";
  if(
    !input||typeof input!=="object"||utilTypes.isProxy(input)||
    Array.isArray(input)
  )fail(error);
  const proto=Object.getPrototypeOf(input);
  if(proto!==Object.prototype&&proto!==null)fail(error);
  const expected=hasId?FULL_KEYS:MATERIAL_KEYS;
  const own=Reflect.ownKeys(input);
  if(own.length!==expected.length)fail(error);
  const allowed=new Set(expected);
  const out=Object.create(null);
  for(const key of own){
    if(typeof key!=="string"||!allowed.has(key))fail(error);
    const descriptor=Object.getOwnPropertyDescriptor(input,key);
    if(!descriptor||!descriptor.enumerable||
       !Object.prototype.hasOwnProperty.call(descriptor,"value"))fail(error);
    const value=descriptor.value;
    if(STRING_KEYS.has(key)){
      if(typeof value!=="string"||value.length<1||value.length>256)fail(error);
    }else if(NUMBER_KEYS.has(key)){
      if(!Number.isSafeInteger(value))fail(error);
    }else if(typeof value!=="boolean")fail(error);
    out[key]=value;
  }
  for(const key of expected)if(!Object.prototype.hasOwnProperty.call(out,key))fail(error);
  return out;
}

function validateMaterial(value){
  const error="apollyon_activation_credential_transport_contract_invalid";
  if(
    value.marker!==MARKER||
    value.version!==1||
    value.status!==STATUS||
    value.target_host!=="Xiphos"||
    value.parent_capability_contract_head!==APOLLYON_ACTIVATION_TRANSPORT_PARENT_V1.head||
    value.parent_capability_contract_blob_sha1!==
      APOLLYON_ACTIVATION_TRANSPORT_PARENT_V1.capability_contract_blob||
    !CAPABILITY_ID.test(value.activation_capability_id)||
    !HASH64.test(value.activation_secret_sha256)||
    !SLOT_ID.test(value.training_start_consumption_slot_id)||
    value.credential_name!==CREDENTIAL_NAME||
    value.bearer_secret_bytes!==32||
    value.next_gate!=="apollyon_training_activation_credential_transport_host_qualification_v1"
  )fail(error);
  for(const key of TRUE_KEYS)if(value[key]!==true)fail(error);
  for(const key of FALSE_KEYS)if(value[key]!==false)fail(error);
  if(!GIT40.test(value.parent_capability_contract_head)||
     !GIT40.test(value.parent_capability_contract_blob_sha1))fail(error);
}

export function buildApollyonActivationCredentialTransportCandidateV1(input){
  const material=safeFlatSnapshot(input,false);
  validateMaterial(material);
  const id=ID_PREFIX+sha256(Buffer.from(canonical(material),"utf8"));
  return Object.freeze({...material,transport_candidate_id:id});
}

export function qualifyApollyonActivationCredentialTransportCandidateV1(input){
  const value=safeFlatSnapshot(input,true);
  const id=value.transport_candidate_id;
  if(!new RegExp("^"+ID_PREFIX+"[0-9a-f]{64}$","u").test(id)){
    fail("apollyon_activation_credential_transport_id_invalid");
  }
  const material={...value};
  delete material.transport_candidate_id;
  validateMaterial(material);
  if(id!==ID_PREFIX+sha256(Buffer.from(canonical(material),"utf8"))){
    fail("apollyon_activation_credential_transport_id_invalid");
  }
  return Object.freeze({...value});
}

/**
 * Bind two untrusted, publicly content-addressed candidate shapes.
 * This is mathematical/source-level candidate consistency ONLY: it proves
 * neither protected issuance nor bearer possession nor systemd transport.
 */
export function qualifyApollyonActivationTransportAgainstCapabilityV1(
  capabilityInput,transportInput,
){
  const capability=qualifyApollyonTrainingActivationCapabilityV1(capabilityInput);
  const transport=qualifyApollyonActivationCredentialTransportCandidateV1(transportInput);
  if(
    transport.activation_capability_id!==capability.activation_capability_id||
    transport.activation_secret_sha256!==capability.activation_secret_sha256||
    transport.training_start_consumption_slot_id!==
      capability.training_start_consumption_slot_id||
    transport.credential_name!==capability.credential_name
  ){
    fail("apollyon_activation_credential_transport_parent_candidate_mismatch");
  }
  return transport;
}

export const APOLLYON_ACTIVATION_TRANSPORT_MATERIAL_KEYS_V1=MATERIAL_KEYS;
