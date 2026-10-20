import crypto from "node:crypto";
import {types as utilTypes} from "node:util";

// Capture native typed-array internals before handling any caller-supplied
// Buffer. Unlike secret.length, the native byteLength getter cannot be
// shadowed on a Buffer instance or successfully invoked on Proxy wrappers.
const INTRINSIC_BYTE_LENGTH_GETTER=Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),"byteLength",
).get;
const INTRINSIC_REFLECT_APPLY=Reflect.apply;
const INTRINSIC_BUFFER_IS_BUFFER=Buffer.isBuffer;

export const VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_CONTRACT_V1 =
  "VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_CONTRACT_V1";
export const VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1 =
  "VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1";
export const VOID_APOLLYON_TRAINING_ACTIVATION_GENERATION_BINDING_V1 =
  "VOID_APOLLYON_TRAINING_ACTIVATION_GENERATION_BINDING_V1";

export const APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1 = Object.freeze({
  parent_head:"d00ca0141db62d752be7ddc6e7d9618e0475d897",
  training_start_consumption_contract_head:
    "bdadfcc6854d6f4e1804347e51b940e897a8da9f",
  training_start_consumption_contract_blob_sha1:
    "42d7d5d4ab75bfd4fc145f63c2a0432f9bcf9bd3",
  training_start_consumption_contract_in_parent_lineage:false,
  training_start_consumption_integration_required:true,
  retired_v2_qualifier_blob_sha1:
    "b57457435cc691ce576ef090e67ba323af254929",
  retired_fixed_launcher_source_blob_sha1:
    "352bd36f2b07091140b990de4170f708eb11fee6",
  training_unit_blob_sha1:
    "62fbabe1cf7ae0d940f5d96e19b06282f841267b",
  training_preentry_source_blob_sha1:
    "9503d19c8bc0b4f073ba117f6a547d339b7623d0",
  training_preentry_sha256:
    "6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47",
  training_entrypoint_bytes:17384,
  training_entrypoint_sha256:
    "7a1ec91b612998824e37aa0f8522a94d7ceffe9f4f21e0702fe0a0d5ca5bdd9a",
});

export const VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_AUTHORITY_V1 =
  Object.freeze({
    source_contract_only:true,
    activation_capability_issuance_performed:false,
    protected_capability_store_required:true,
    protected_capability_store_implemented:false,
    create_once_key_is_training_start_consumption_slot:true,
    external_training_start_consumption_contract_required:true,
    external_training_start_consumption_contract_in_parent_lineage:false,
    external_training_start_consumption_integration_required:true,
    external_training_start_consumption_validation_performed:false,
    authorization_slot_external_validation_required:true,
    training_start_slot_external_validation_required:true,
    systemd_credential_transport_selected_as_candidate:true,
    systemd_credential_runtime_proven:false,
    service_activation_authorized:false,
    service_action:false,
    systemd_mutation:false,
    host_installation:false,
    filesystem_read:false,
    filesystem_write:false,
    network_access:false,
    training_start_consumption_performed:false,
    training_start_admission:false,
    training_release_authorized:false,
    training_execution_authorized:false,
    training_execution:false,
    candidate_weight_mutation:false,
    credential_access:false,
    private_key_access:false,
    signing:false,
    wallet_access:false,
    transaction:false,
    funds_movement:false,
  });

const HASH64=/^[0-9a-f]{64}$/u;
const INVOCATION_ID=/^[0-9a-f]{32}$/u;
const CAPABILITY_ID=/^apollyon_training_activation_capability_v1:[0-9a-f]{64}$/u;
const BINDING_ID=/^apollyon_training_activation_binding_v1:[0-9a-f]{64}$/u;
const CLAIM_ID=/^apollyon_attempt_claim_record_v2:[0-9a-f]{64}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const AUTHORIZATION_SLOT_ID=/^apollyon_attempt_claim_auth_slot_v1:[0-9a-f]{64}$/u;
const AUTHORIZATION_SLOT_RECORD_ID=/^apollyon_attempt_claim_auth_slot_record_v1:[0-9a-f]{64}$/u;
const CONSUMPTION_SLOT_ID=/^apollyon_training_start_slot_v1:[0-9a-f]{64}$/u;
const TRAINER_GENERATION_ID=/^apollyon_pretraining_generation_v1:[0-9a-f]{64}$/u;
const CUSTODY_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;
const TERMINAL_ID=/^apollyon_terminal_receipt_v2:[0-9a-f]{64}$/u;
const STORE_CONTRACT_ID=/^apollyon_claim_store_contract_v2:[0-9a-f]{64}$/u;
const STORE_POLICY_ID=/^apollyon_claim_store_policy_v2:[0-9a-f]{64}$/u;
const STORE_GENERATION_ID=/^apollyon_claim_store_generation_v2:[0-9a-f]{64}$/u;

const CAPABILITY_KEYS=Object.freeze([
  "activation_capability_id",
  "activation_capability_issuance_performed",
  "activation_secret_sha256",
  "authorization_id",
  "authorization_slot_external_validation_required",
  "authorization_slot_id",
  "authorization_slot_record_id",
  "capability_replay_authorized",
  "create_once_key_must_equal_training_start_consumption_slot_id",
  "credential_name",
  "custody_generation_id",
  "direct_systemd_start_without_capability_authorized",
  "durable_claim_record_id",
  "durable_claim_record_sha256",
  "expected_entrypoint_bytes",
  "expected_entrypoint_sha256",
  "expected_preentry_sha256",
  "expected_unit_git_blob_sha1",
  "external_training_start_consumption_validation_performed",
  "marker",
  "next_gate",
  "protected_capability_store_required",
  "raw_capability_export_authorized",
  "status",
  "store_contract_id",
  "store_generation_id",
  "store_policy_id",
  "systemd_caller_identity_authoritative",
  "systemd_credential_transport_required",
  "target_host",
  "terminal_receipt_id",
  "training_execution_authorized",
  "training_start_consumption_contract_blob_sha1",
  "training_start_consumption_contract_head",
  "training_start_consumption_contract_in_parent_lineage",
  "training_start_consumption_integration_required",
  "training_start_consumption_slot_external_validation_required",
  "training_start_consumption_slot_id",
  "version",
]);

const BINDING_KEYS=Object.freeze([
  "activation_binding_id",
  "activation_capability_id",
  "activation_generation_binding_required",
  "activation_generation_bound",
  "activation_secret_possession_proof_required",
  "activation_secret_possession_proven",
  "activation_secret_sha256",
  "boot_id_sha256",
  "credential_name",
  "marker",
  "next_gate",
  "observed_preentry_sha256",
  "status",
  "systemd_caller_identity_authoritative",
  "systemd_invocation_generation_observation_performed",
  "systemd_invocation_id",
  "target_host",
  "trainer_generation_external_contract_validation_performed",
  "trainer_generation_external_contract_validation_required",
  "trainer_generation_id",
  "training_execution_authorized",
  "training_gid",
  "training_pid",
  "training_process_start_time_ticks",
  "training_release_authorized",
  "training_source_identity_sha256",
  "training_start_admission",
  "training_start_consumption_performed",
  "training_start_consumption_record_origin_proven",
  "training_start_consumption_record_required",
  "training_start_consumption_slot_id",
  "training_uid",
  "version",
]);

const CAPABILITY_STRING_KEYS=new Set([
  "activation_capability_id",
  "activation_secret_sha256",
  "authorization_id",
  "authorization_slot_id",
  "authorization_slot_record_id",
  "credential_name",
  "custody_generation_id",
  "durable_claim_record_id",
  "durable_claim_record_sha256",
  "expected_entrypoint_sha256",
  "expected_preentry_sha256",
  "expected_unit_git_blob_sha1",
  "marker",
  "next_gate",
  "status",
  "store_contract_id",
  "store_generation_id",
  "store_policy_id",
  "target_host",
  "terminal_receipt_id",
  "training_start_consumption_contract_blob_sha1",
  "training_start_consumption_contract_head",
  "training_start_consumption_slot_id",
]);
const CAPABILITY_NUMBER_KEYS=new Set([
  "expected_entrypoint_bytes",
  "version",
]);
const CAPABILITY_BOOLEAN_KEYS=new Set([
  "activation_capability_issuance_performed",
  "authorization_slot_external_validation_required",
  "capability_replay_authorized",
  "create_once_key_must_equal_training_start_consumption_slot_id",
  "direct_systemd_start_without_capability_authorized",
  "external_training_start_consumption_validation_performed",
  "protected_capability_store_required",
  "raw_capability_export_authorized",
  "systemd_caller_identity_authoritative",
  "systemd_credential_transport_required",
  "training_execution_authorized",
  "training_start_consumption_contract_in_parent_lineage",
  "training_start_consumption_integration_required",
  "training_start_consumption_slot_external_validation_required",
]);

const BINDING_STRING_KEYS=new Set([
  "activation_binding_id",
  "activation_capability_id",
  "activation_secret_sha256",
  "boot_id_sha256",
  "credential_name",
  "marker",
  "next_gate",
  "observed_preentry_sha256",
  "status",
  "systemd_invocation_id",
  "target_host",
  "trainer_generation_id",
  "training_process_start_time_ticks",
  "training_source_identity_sha256",
  "training_start_consumption_slot_id",
]);
const BINDING_NUMBER_KEYS=new Set([
  "training_gid",
  "training_pid",
  "training_uid",
  "version",
]);
const BINDING_BOOLEAN_KEYS=new Set([
  "activation_generation_binding_required",
  "activation_generation_bound",
  "activation_secret_possession_proof_required",
  "activation_secret_possession_proven",
  "systemd_caller_identity_authoritative",
  "systemd_invocation_generation_observation_performed",
  "trainer_generation_external_contract_validation_performed",
  "trainer_generation_external_contract_validation_required",
  "training_execution_authorized",
  "training_release_authorized",
  "training_start_admission",
  "training_start_consumption_performed",
  "training_start_consumption_record_origin_proven",
  "training_start_consumption_record_required",
]);

function fail(code){throw new Error(code);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function canonicalize(value){
  if(value===null||typeof value==="string"||typeof value==="boolean")return value;
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value))fail("apollyon_training_activation_noncanonical_number");
    return value;
  }
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort())out[key]=canonicalize(value[key]);
    return out;
  }
  fail("apollyon_training_activation_noncanonical_value");
}
export function canonicalApollyonTrainingActivationV1(value){
  return JSON.stringify(canonicalize(value));
}
function exactOwnKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const own=Reflect.ownKeys(value);
  if(own.length!==expected.length)fail(code);
  if(own.some((key)=>typeof key!=="string"))fail(code);
  const actual=[...own].sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index])){
    fail(code);
  }
}
function preflightPrimitiveObject(
  value,
  expectedKeys,
  stringKeys,
  numberKeys,
  booleanKeys,
  code,
){
  if(!value||typeof value!=="object")fail(code);
  if(utilTypes.isProxy(value))fail(code);
  if(Array.isArray(value))fail(code);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  exactOwnKeys(value,expectedKeys,code);

  const descriptors=Object.getOwnPropertyDescriptors(value);
  const snapshot={};
  for(const key of expectedKeys){
    const descriptor=descriptors[key];
    if(
      !descriptor||
      descriptor.enumerable!==true||
      !Object.prototype.hasOwnProperty.call(descriptor,"value")||
      typeof descriptor.get==="function"||
      typeof descriptor.set==="function"
    )fail(code);

    const item=descriptor.value;
    if(stringKeys.has(key)){
      const maxLength=key==="training_process_start_time_ticks"?20:256;
      if(typeof item!=="string"||item.length<1||item.length>maxLength)fail(code);
    }else if(numberKeys.has(key)){
      if(!Number.isSafeInteger(item))fail(code);
    }else if(booleanKeys.has(key)){
      if(typeof item!=="boolean")fail(code);
    }else{
      fail(code);
    }
    snapshot[key]=item;
  }
  return snapshot;
}
function preflightCapabilityInput(value,withId){
  const keys=withId
    ?CAPABILITY_KEYS
    :CAPABILITY_KEYS.filter((key)=>key!=="activation_capability_id");
  return preflightPrimitiveObject(
    value,keys,
    CAPABILITY_STRING_KEYS,CAPABILITY_NUMBER_KEYS,CAPABILITY_BOOLEAN_KEYS,
    "apollyon_training_activation_capability_invalid",
  );
}
function preflightBindingInput(value,withId){
  const keys=withId
    ?BINDING_KEYS
    :BINDING_KEYS.filter((key)=>key!=="activation_binding_id");
  const snapshot=preflightPrimitiveObject(
    value,keys,
    BINDING_STRING_KEYS,BINDING_NUMBER_KEYS,BINDING_BOOLEAN_KEYS,
    "apollyon_training_activation_binding_invalid",
  );
  preflightBindingStartTicks(snapshot);
  return snapshot;
}
function clonePlain(value,code){
  let copy;
  try{copy=structuredClone(value);}catch{fail(code);}
  if(!copy||typeof copy!=="object"||Array.isArray(copy))fail(code);
  const proto=Object.getPrototypeOf(copy);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  return copy;
}
function deepFreeze(value){
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const child of Object.values(value))deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
function contentAddress(prefix,value){
  return prefix+sha256(Buffer.from(canonicalApollyonTrainingActivationV1(value),"utf8"));
}
function preflightBindingStartTicks(input){
  const value=input?.training_process_start_time_ticks;
  if(typeof value!=="string"||value.length<1||value.length>20){
    fail("apollyon_training_activation_binding_invalid");
  }
}
function validPositiveU64Decimal(value){
  if(typeof value!=="string"||!/^[1-9][0-9]{0,19}$/u.test(value))return false;
  try{
    return BigInt(value)<=0xffffffffffffffffn;
  }catch{
    return false;
  }
}

export function hashApollyonTrainingActivationSecretV1(secret){
  let nativeByteLength;
  try{
    // Brand-check the internal typed-array slot BEFORE any object property
    // access. Genuine Buffers pass; Proxy/revoked Proxy wrappers fail here
    // without exercising user-supplied traps or shadowed length accessors.
    nativeByteLength=INTRINSIC_REFLECT_APPLY(
      INTRINSIC_BYTE_LENGTH_GETTER,secret,[],
    );
  }catch{
    fail("apollyon_training_activation_secret_invalid");
  }
  if(nativeByteLength!==32||!INTRINSIC_BUFFER_IS_BUFFER(secret)){
    fail("apollyon_training_activation_secret_invalid");
  }
  return sha256(secret);
}

function validateCapabilityMaterial(value){
  if(
    value.marker!==VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1||
    value.version!==1||
    value.status!=="training_activation_capability_candidate_unissued"||
    value.target_host!=="Xiphos"||
    !HASH64.test(value.activation_secret_sha256)||
    !AUTH_ID.test(value.authorization_id)||
    !AUTHORIZATION_SLOT_ID.test(value.authorization_slot_id)||
    !AUTHORIZATION_SLOT_RECORD_ID.test(value.authorization_slot_record_id)||
    !CONSUMPTION_SLOT_ID.test(value.training_start_consumption_slot_id)||
    !CUSTODY_ID.test(value.custody_generation_id)||
    !CLAIM_ID.test(value.durable_claim_record_id)||
    !HASH64.test(value.durable_claim_record_sha256)||
    !STORE_CONTRACT_ID.test(value.store_contract_id)||
    !STORE_POLICY_ID.test(value.store_policy_id)||
    !STORE_GENERATION_ID.test(value.store_generation_id)||
    !TERMINAL_ID.test(value.terminal_receipt_id)||
    value.credential_name!=="apollyon-training-activation-v1"||
    value.expected_unit_git_blob_sha1!==
      APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_unit_blob_sha1||
    value.expected_preentry_sha256!==
      APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_preentry_sha256||
    value.expected_entrypoint_sha256!==
      APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_entrypoint_sha256||
    value.expected_entrypoint_bytes!==
      APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_entrypoint_bytes||
    value.training_start_consumption_contract_head!==
      APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_start_consumption_contract_head||
    value.training_start_consumption_contract_blob_sha1!==
      APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_start_consumption_contract_blob_sha1||
    value.training_start_consumption_contract_in_parent_lineage!==false||
    value.training_start_consumption_integration_required!==true||
    value.external_training_start_consumption_validation_performed!==false||
    value.authorization_slot_external_validation_required!==true||
    value.training_start_consumption_slot_external_validation_required!==true||
    value.systemd_credential_transport_required!==true||
    value.systemd_caller_identity_authoritative!==false||
    value.direct_systemd_start_without_capability_authorized!==false||
    value.capability_replay_authorized!==false||
    value.raw_capability_export_authorized!==false||
    value.protected_capability_store_required!==true||
    value.create_once_key_must_equal_training_start_consumption_slot_id!==true||
    value.activation_capability_issuance_performed!==false||
    value.training_execution_authorized!==false||
    value.next_gate!=="apollyon_training_activation_capability_protected_issuance_v1"
  )fail("apollyon_training_activation_capability_invalid");
}

export function qualifyApollyonTrainingActivationCapabilityV1(input){
  const preflight=preflightCapabilityInput(input,true);
  const value=clonePlain(
    preflight,
    "apollyon_training_activation_capability_invalid",
  );
  exactOwnKeys(value,CAPABILITY_KEYS,"apollyon_training_activation_capability_invalid");
  if(!CAPABILITY_ID.test(value.activation_capability_id)){
    fail("apollyon_training_activation_capability_id_invalid");
  }
  const material={...value};
  delete material.activation_capability_id;
  validateCapabilityMaterial(material);
  if(
    value.activation_capability_id!==
    contentAddress("apollyon_training_activation_capability_v1:",material)
  )fail("apollyon_training_activation_capability_id_invalid");
  return deepFreeze(value);
}

export function buildApollyonTrainingActivationCapabilityV1(materialInput){
  const preflight=preflightCapabilityInput(materialInput,false);
  const material=clonePlain(
    preflight,
    "apollyon_training_activation_capability_invalid",
  );
  exactOwnKeys(
    material,
    CAPABILITY_KEYS.filter((key)=>key!=="activation_capability_id"),
    "apollyon_training_activation_capability_invalid",
  );
  validateCapabilityMaterial(material);
  return qualifyApollyonTrainingActivationCapabilityV1({
    ...material,
    activation_capability_id:
      contentAddress("apollyon_training_activation_capability_v1:",material),
  });
}

function validateBindingMaterial(capability,value){
  if(
    value.marker!==VOID_APOLLYON_TRAINING_ACTIVATION_GENERATION_BINDING_V1||
    value.version!==1||
    value.status!=="training_activation_capability_generation_binding_candidate"||
    value.target_host!=="Xiphos"||
    value.activation_capability_id!==capability.activation_capability_id||
    value.activation_secret_sha256!==capability.activation_secret_sha256||
    value.credential_name!==capability.credential_name||
    value.training_start_consumption_slot_id!==
      capability.training_start_consumption_slot_id||
    !HASH64.test(value.boot_id_sha256)||
    !INVOCATION_ID.test(value.systemd_invocation_id)||
    !Number.isSafeInteger(value.training_pid)||value.training_pid<=1||
    !validPositiveU64Decimal(value.training_process_start_time_ticks)||
    !Number.isSafeInteger(value.training_uid)||
      value.training_uid<=0||value.training_uid>65533||
    !Number.isSafeInteger(value.training_gid)||
      value.training_gid<=0||value.training_gid>65533||
    !HASH64.test(value.training_source_identity_sha256)||
    !TRAINER_GENERATION_ID.test(value.trainer_generation_id)||
    value.observed_preentry_sha256!==capability.expected_preentry_sha256||
    value.systemd_caller_identity_authoritative!==false||
    value.activation_generation_binding_required!==true||
    value.activation_generation_bound!==false||
    value.activation_secret_possession_proof_required!==true||
    value.activation_secret_possession_proven!==false||
    value.systemd_invocation_generation_observation_performed!==false||
    value.trainer_generation_external_contract_validation_required!==true||
    value.trainer_generation_external_contract_validation_performed!==false||
    value.training_start_consumption_record_required!==true||
    value.training_start_consumption_record_origin_proven!==false||
    value.training_start_consumption_performed!==false||
    value.training_start_admission!==false||
    value.training_release_authorized!==false||
    value.training_execution_authorized!==false||
    value.next_gate!=="apollyon_training_start_consumption_integration_v1"
  )fail("apollyon_training_activation_binding_invalid");
}

export function qualifyApollyonTrainingActivationGenerationBindingV1(
  capabilityInput,
  bindingInput,
){
  const preflight=preflightBindingInput(bindingInput,true);
  const capability=qualifyApollyonTrainingActivationCapabilityV1(capabilityInput);
  const value=clonePlain(
    preflight,
    "apollyon_training_activation_binding_invalid",
  );
  exactOwnKeys(value,BINDING_KEYS,"apollyon_training_activation_binding_invalid");
  if(!BINDING_ID.test(value.activation_binding_id)){
    fail("apollyon_training_activation_binding_id_invalid");
  }
  const material={...value};
  delete material.activation_binding_id;
  validateBindingMaterial(capability,material);
  if(
    value.activation_binding_id!==
    contentAddress("apollyon_training_activation_binding_v1:",material)
  )fail("apollyon_training_activation_binding_id_invalid");
  return deepFreeze(value);
}

export function buildApollyonTrainingActivationGenerationBindingV1(
  capabilityInput,
  materialInput,
){
  const preflight=preflightBindingInput(materialInput,false);
  const capability=qualifyApollyonTrainingActivationCapabilityV1(capabilityInput);
  const material=clonePlain(
    preflight,
    "apollyon_training_activation_binding_invalid",
  );
  exactOwnKeys(
    material,
    BINDING_KEYS.filter((key)=>key!=="activation_binding_id"),
    "apollyon_training_activation_binding_invalid",
  );
  validateBindingMaterial(capability,material);
  return qualifyApollyonTrainingActivationGenerationBindingV1(capability,{
    ...material,
    activation_binding_id:
      contentAddress("apollyon_training_activation_binding_v1:",material),
  });
}
