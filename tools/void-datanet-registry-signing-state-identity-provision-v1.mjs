#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";

export const VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_V1 =
  "VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_V1";
export const VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1 =
  "VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1";
export const VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_CONFIRMATION_V1 =
  "provisionDatanetRegistrySigningStateIdentityV1";

const STORE_ID=/^voiddrssi1_[0-9a-f]{64}$/u;
const DECIMAL=/^(0|[1-9][0-9]{0,39})$/u;

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  throw new Error("unsupported_canonical_value");
}
export function voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(value){
  return JSON.stringify(canonical(value));
}
function exactKeys(value,expected,label){
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error(label+"_invalid");
  }
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(JSON.stringify(actual)!==JSON.stringify(wanted)){
    throw new Error(label+"_keys_invalid");
  }
}
function canonicalAbsolutePath(value){
  const raw=String(value||"");
  if(
    !raw||
    !path.isAbsolute(raw)||
    path.resolve(raw)!==raw||
    raw.includes("\0")||
    raw.includes("\n")||
    raw.includes("\r")
  ){
    throw new Error("signing_state_identity_path_invalid");
  }
  return raw;
}
function decimal(value,label,{allowZero=true}={}){
  const raw=String(value??"");
  if(!DECIMAL.test(raw)) throw new Error(label+"_invalid");
  const n=BigInt(raw);
  if(!allowZero&&n===0n) throw new Error(label+"_zero_forbidden");
  return raw;
}

export function buildVoidDatanetRegistrySigningStateIdentityV1(input){
  const realpath=canonicalAbsolutePath(input?.state_root_realpath);
  const dev=decimal(input?.state_root_dev,"signing_state_identity_dev");
  const ino=decimal(
    input?.state_root_ino,
    "signing_state_identity_ino",
    {allowZero:false},
  );
  const material={
    marker:VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_V1,
    version:1,
    state_root_realpath:realpath,
    state_root_dev:dev,
    state_root_ino:ino,
  };
  return Object.freeze({
    ...material,
    state_store_id:
      "voiddrssi1_"+
      sha256(Buffer.from(
        voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(material),
      )),
  });
}

export function validateVoidDatanetRegistrySigningStateIdentityV1(value){
  exactKeys(
    value,
    [
      "marker",
      "version",
      "state_root_realpath",
      "state_root_dev",
      "state_root_ino",
      "state_store_id",
    ],
    "signing_state_identity",
  );
  if(
    value.marker!==VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_V1||
    value.version!==1
  ){
    throw new Error("signing_state_identity_contract_mismatch");
  }
  const rebuilt=buildVoidDatanetRegistrySigningStateIdentityV1(value);
  if(
    !STORE_ID.test(String(value.state_store_id||""))||
    value.state_store_id!==rebuilt.state_store_id||
    voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(value)!==
      voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(rebuilt)
  ){
    throw new Error("signing_state_identity_id_mismatch");
  }
  return rebuilt;
}

export function buildVoidDatanetRegistrySigningStateIdentityProvisionReceiptV1(
  input,
){
  const identity=validateVoidDatanetRegistrySigningStateIdentityV1(
    input?.identity,
  );
  const observedRepoHead=String(input?.observed_repo_head||"");
  if(!/^[0-9a-f]{40}$/u.test(observedRepoHead)){
    throw new Error("signing_state_identity_repo_head_invalid");
  }
  const provisionedAt=String(input?.provisioned_at_utc||"");
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(
      provisionedAt,
    )||
    !Number.isFinite(Date.parse(provisionedAt))
  ){
    throw new Error("signing_state_identity_provisioned_at_invalid");
  }
  const identityFileSha=String(input?.identity_file_sha256||"");
  if(!/^[0-9a-f]{64}$/u.test(identityFileSha)){
    throw new Error("signing_state_identity_file_sha_invalid");
  }
  const material={
    marker:VOID_DATANET_REGISTRY_SIGNING_STATE_IDENTITY_PROVISION_V1,
    version:1,
    status:"SIGNING_STATE_GENERATION_IDENTITY_PROVISIONED_SIGNING_HOLD",
    state_store_id:identity.state_store_id,
    state_root_realpath_sha256:sha256(identity.state_root_realpath),
    state_root_dev:identity.state_root_dev,
    state_root_ino:identity.state_root_ino,
    identity_file_sha256:identityFileSha,
    observed_repo_head:observedRepoHead,
    provisioned_at_utc:provisionedAt,
    authority:{
      filesystem_identity_write:true,
      state_root_mutation:false,
      consumption_record_mutation:false,
      credential_access:false,
      private_key_access:false,
      signer_object_exposed:false,
      transaction_signing:false,
      signed_transaction_export:false,
      transaction_submission:false,
      transaction_broadcast:false,
      deployment:false,
      chain2050_mutation:false,
      funds_movement:false,
      automatic_retry:false,
    },
    next_gate:
      "durable_single_use_registry_signing_authorization_consumption_with_external_state_generation_identity",
  };
  return Object.freeze({
    ...material,
    provision_receipt_id:
      "voiddrssip1_"+
      sha256(Buffer.from(
        voidDatanetRegistrySigningStateIdentityCanonicalJsonV1(material),
      )),
  });
}
