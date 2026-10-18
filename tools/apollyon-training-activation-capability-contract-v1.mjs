import crypto from "node:crypto";

export const VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_CONTRACT_V1 =
  "VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_CONTRACT_V1";
export const VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1 =
  "VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1";
export const VOID_APOLLYON_TRAINING_ACTIVATION_CONSUMPTION_V1 =
  "VOID_APOLLYON_TRAINING_ACTIVATION_CONSUMPTION_V1";

export const APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1 = Object.freeze({
  parent_head:"1fd4b17a7c2f9e3811f52ecf01f4087c1182dcae",
  durable_claim_store_contract_blob_sha1:
    "bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc",
  retired_v2_qualifier_blob_sha1:
    "5f67bb3ddcc7f130db4b90ad73f5450b109dbea4",
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
    capability_issuance_performed:false,
    protected_consumption_store_implemented:false,
    systemd_credential_transport_selected_as_candidate:true,
    systemd_credential_runtime_proven:false,
    service_activation_authorized:false,
    service_action:false,
    systemd_mutation:false,
    host_installation:false,
    filesystem_read:false,
    filesystem_write:false,
    network_access:false,
    durable_attempt_claim:false,
    training_start_consumption_performed:false,
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
const GIT40=/^[0-9a-f]{40}$/u;
const INVOCATION_ID=/^[0-9a-f]{32}$/u;
const CAPABILITY_ID=/^apollyon_training_activation_capability_v1:[0-9a-f]{64}$/u;
const CONSUMPTION_ID=/^apollyon_training_activation_consumption_v1:[0-9a-f]{64}$/u;
const CLAIM_ID=/^apollyon_attempt_claim_record_v2:[0-9a-f]{64}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const CUSTODY_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;
const TERMINAL_ID=/^apollyon_terminal_receipt_v2:[0-9a-f]{64}$/u;
const STORE_CONTRACT_ID=/^apollyon_claim_store_contract_v2:[0-9a-f]{64}$/u;
const STORE_POLICY_ID=/^apollyon_claim_store_policy_v2:[0-9a-f]{64}$/u;
const STORE_GENERATION_ID=/^apollyon_claim_store_generation_v2:[0-9a-f]{64}$/u;

const CAPABILITY_KEYS=Object.freeze([
  "activation_capability_id",
  "activation_secret_sha256",
  "authorization_id",
  "capability_replay_authorized",
  "credential_name",
  "custody_generation_id",
  "direct_systemd_start_without_capability_authorized",
  "durable_claim_record_id",
  "durable_claim_record_sha256",
  "expected_entrypoint_bytes",
  "expected_entrypoint_sha256",
  "expected_preentry_sha256",
  "expected_unit_git_blob_sha1",
  "marker",
  "next_gate",
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
  "training_start_consumption_required",
  "version",
]);

const CONSUMPTION_KEYS=Object.freeze([
  "activation_capability_id",
  "activation_generation_bound",
  "activation_secret_sha256",
  "boot_id_sha256",
  "caller_supplied_consumption_receipt_sufficient",
  "consumed_once",
  "consumption_id",
  "credential_name",
  "durable_claim_record_id",
  "marker",
  "next_gate",
  "observed_preentry_sha256",
  "protected_consumption_store_required",
  "replay_authorized",
  "status",
  "store_generation_id",
  "systemd_caller_identity_authoritative",
  "systemd_invocation_id",
  "target_host",
  "training_execution_authorized",
  "training_pid",
  "training_process_start_time_ticks",
  "training_release_authorized",
  "training_start_admission",
  "training_start_consumption_performed",
  "version",
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

export function hashApollyonTrainingActivationSecretV1(secret){
  if(!Buffer.isBuffer(secret)||secret.length!==32){
    fail("apollyon_training_activation_secret_invalid");
  }
  return sha256(secret);
}

function validateCapabilityMaterial(value){
  if(
    value.marker!==VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1||
    value.version!==1||
    value.status!=="training_activation_capability_issued_unconsumed"||
    value.target_host!=="Xiphos"||
    !HASH64.test(value.activation_secret_sha256)||
    !AUTH_ID.test(value.authorization_id)||
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
    value.systemd_credential_transport_required!==true||
    value.systemd_caller_identity_authoritative!==false||
    value.direct_systemd_start_without_capability_authorized!==false||
    value.capability_replay_authorized!==false||
    value.raw_capability_export_authorized!==false||
    value.training_start_consumption_required!==true||
    value.training_execution_authorized!==false||
    value.next_gate!=="apollyon_training_activation_capability_consumption_v1"
  )fail("apollyon_training_activation_capability_invalid");
}

export function qualifyApollyonTrainingActivationCapabilityV1(input){
  const value=clonePlain(input,"apollyon_training_activation_capability_invalid");
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
  const material=clonePlain(
    materialInput,
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

function validateConsumptionMaterial(capability,value){
  if(
    value.marker!==VOID_APOLLYON_TRAINING_ACTIVATION_CONSUMPTION_V1||
    value.version!==1||
    value.status!=="training_activation_capability_consumed_generation_bound"||
    value.target_host!=="Xiphos"||
    value.activation_capability_id!==capability.activation_capability_id||
    value.activation_secret_sha256!==capability.activation_secret_sha256||
    value.credential_name!==capability.credential_name||
    value.durable_claim_record_id!==capability.durable_claim_record_id||
    value.store_generation_id!==capability.store_generation_id||
    !HASH64.test(value.boot_id_sha256)||
    !INVOCATION_ID.test(value.systemd_invocation_id)||
    !Number.isSafeInteger(value.training_pid)||value.training_pid<=0||
    !Number.isSafeInteger(value.training_process_start_time_ticks)||
      value.training_process_start_time_ticks<=0||
    value.observed_preentry_sha256!==capability.expected_preentry_sha256||
    value.systemd_caller_identity_authoritative!==false||
    value.activation_generation_bound!==true||
    value.consumed_once!==true||
    value.replay_authorized!==false||
    value.protected_consumption_store_required!==true||
    value.caller_supplied_consumption_receipt_sufficient!==false||
    value.training_start_consumption_performed!==true||
    value.training_start_admission!==true||
    value.training_release_authorized!==false||
    value.training_execution_authorized!==false||
    value.next_gate!=="apollyon_training_start_release_v1"
  )fail("apollyon_training_activation_consumption_invalid");
}

export function qualifyApollyonTrainingActivationConsumptionV1(
  capabilityInput,
  consumptionInput,
){
  const capability=qualifyApollyonTrainingActivationCapabilityV1(capabilityInput);
  const value=clonePlain(
    consumptionInput,
    "apollyon_training_activation_consumption_invalid",
  );
  exactOwnKeys(value,CONSUMPTION_KEYS,"apollyon_training_activation_consumption_invalid");
  if(!CONSUMPTION_ID.test(value.consumption_id)){
    fail("apollyon_training_activation_consumption_id_invalid");
  }
  const material={...value};
  delete material.consumption_id;
  validateConsumptionMaterial(capability,material);
  if(
    value.consumption_id!==
    contentAddress("apollyon_training_activation_consumption_v1:",material)
  )fail("apollyon_training_activation_consumption_id_invalid");
  return deepFreeze(value);
}

export function buildApollyonTrainingActivationConsumptionV1(
  capabilityInput,
  materialInput,
){
  const capability=qualifyApollyonTrainingActivationCapabilityV1(capabilityInput);
  const material=clonePlain(
    materialInput,
    "apollyon_training_activation_consumption_invalid",
  );
  exactOwnKeys(
    material,
    CONSUMPTION_KEYS.filter((key)=>key!=="consumption_id"),
    "apollyon_training_activation_consumption_invalid",
  );
  validateConsumptionMaterial(capability,material);
  return qualifyApollyonTrainingActivationConsumptionV1(capability,{
    ...material,
    consumption_id:
      contentAddress("apollyon_training_activation_consumption_v1:",material),
  });
}
