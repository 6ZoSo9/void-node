#!/usr/bin/env node
import crypto from "node:crypto";

import {
  requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1,
  validateVoidDatanetRegistryBroadcastAuthorizationRequestV1,
} from "./void-datanet-registry-signed-verification-broadcast-request-v1.mjs";

export const VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION_V1 =
  "VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION_V1";

const MAX_WINDOW_MS=300_000;
const REQUEST_ID=/^voiddrbar1_[0-9a-f]{64}$/u;
const AUTH_ID=/^voiddrba1_[0-9a-f]{64}$/u;
const SIGNED_ID=/^voiddrstx1_[0-9a-f]{64}$/u;
const CANDIDATE_ID=/^voiddrtxc1_[0-9a-f]{64}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const DECIMAL=/^(0|[1-9][0-9]{0,77})$/u;

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
function canonicalJson(value){
  return JSON.stringify(canonical(value));
}
function exactKeys(value,keys,label){
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error(label+"_invalid");
  }
  const actual=Object.keys(value).sort();
  const expected=[...keys].sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected)){
    throw new Error(label+"_keys_invalid");
  }
}
function canonicalUtc(value,label){
  const raw=String(value||"");
  const ms=Date.parse(raw);
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(raw)||
    !Number.isFinite(ms)||
    new Date(ms).toISOString()!==raw
  ){
    throw new Error(label+"_invalid");
  }
  return {raw,ms};
}

export function buildVoidDatanetRegistrySingleTransactionBroadcastAuthorizationV1(
  input,
){
  const request=validateVoidDatanetRegistryBroadcastAuthorizationRequestV1(
    input?.broadcast_request,
    input?.broadcast_request_evidence,
  );
  const requiredConfirmation=
    requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1({
      signed_transaction_id:request.signed_transaction_id,
      signed_transaction_hash:
        request.transaction_summary?.signed_transaction_hash,
      candidate_id:request.candidate_id,
      transaction_fingerprint_sha256:
        request.transaction_fingerprint_sha256,
    });
  if(request.required_confirmation!==requiredConfirmation){
    throw new Error("registry_broadcast_authorization_request_confirmation_mismatch");
  }
  if(input?.confirmation!==requiredConfirmation){
    throw new Error("registry_broadcast_authorization_confirmation_required");
  }

  const authorized=canonicalUtc(
    input?.authorized_at_utc,
    "registry_broadcast_authorization_authorized_at",
  );
  const expires=canonicalUtc(
    input?.valid_until_utc,
    "registry_broadcast_authorization_valid_until",
  );
  if(
    expires.ms<=authorized.ms||
    expires.ms-authorized.ms>MAX_WINDOW_MS
  ){
    throw new Error("registry_broadcast_authorization_window_invalid");
  }

  if(
    !REQUEST_ID.test(String(request.broadcast_authorization_request_id||""))||
    !SIGNED_ID.test(String(request.signed_transaction_id||""))||
    !CANDIDATE_ID.test(String(request.candidate_id||""))||
    request.status!==
      "HOLD_PENDING_EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION"||
    request.broadcast_authorized!==false||
    request.broadcast_performed!==false||
    request.authority?.request_only!==true||
    request.authority?.transaction_submission!==false||
    request.authority?.transaction_broadcast_authorized!==false||
    request.authority?.transaction_broadcast_performed!==false||
    request.authority?.deployment_authorized!==false||
    request.authority?.chain2050_write_authorized!==false||
    request.authority?.funds_movement!==false||
    request.authority?.automatic_retry!==false
  ){
    throw new Error("registry_broadcast_authorization_request_contract_mismatch");
  }

  const tx=request.transaction_summary;
  if(
    tx?.transaction_type!==2||
    tx?.chain_id!=="2050"||
    !DECIMAL.test(String(tx?.nonce||""))||
    !ADDRESS.test(String(tx?.from_address||""))||
    tx?.to_address!==null||
    tx?.value_wei!=="0"||
    !DECIMAL.test(String(tx?.gas_limit||""))||
    !DECIMAL.test(String(tx?.max_fee_per_gas_wei||""))||
    !DECIMAL.test(String(tx?.max_priority_fee_per_gas_wei||""))||
    !ADDRESS.test(String(tx?.predicted_contract_address||""))||
    !SHA256.test(String(tx?.data_sha256||""))||
    !HASH.test(String(tx?.data_keccak256||""))||
    !HASH.test(String(tx?.unsigned_transaction_hash||""))||
    !HASH.test(String(tx?.signed_transaction_hash||""))||
    !SHA256.test(String(tx?.signed_serialized_transaction_sha256||""))
  ){
    throw new Error("registry_broadcast_authorization_transaction_shape_invalid");
  }

  const material={
    marker:VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION_V1,
    version:1,
    status:"EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZED_CONSUMPTION_HOLD",
    authorized_at_utc:authorized.raw,
    valid_until_utc:expires.raw,
    broadcast_authorization_request_id:
      request.broadcast_authorization_request_id,
    signed_transaction_verification_id:
      request.signed_transaction_verification_id,
    signed_transaction_id:request.signed_transaction_id,
    candidate_id:request.candidate_id,
    signing_request_id:request.signing_request_id,
    signing_authorization_id:request.signing_authorization_id,
    consumption_record_id:request.consumption_record_id,
    signing_operation_id:request.signing_operation_id,
    transaction_fingerprint_sha256:
      request.transaction_fingerprint_sha256,
    deployer_address:request.deployer_address,
    signed_at_utc:request.signed_at_utc,
    required_confirmation:requiredConfirmation,
    transaction_summary:request.transaction_summary,
    authorization_scope:{
      exact_single_transaction:true,
      exact_signed_transaction_only:true,
      exact_signed_transaction_hash:true,
      signing_lineage_bound:true,
      one_submission_attempt_only:true,
      single_use:true,
      fresh_prebroadcast_observation_required:true,
      durable_consumption_before_broadcaster_access_required:true,
      runtime_expiry_recheck_before_broadcast_required:true,
      exact_contract_creation_consequence_authorized:true,
      exact_gas_fee_spend_authorized:true,
      additional_value_transfer_authorized:false,
      replacement_transaction_authorized:false,
      automatic_retry:false,
    },
    authority:{
      operation_confirmation_verified:true,
      exact_signed_transaction_broadcast_authorized:true,
      source_authorization_artifact_only:true,
      signed_transaction_bytes_access:false,
      credential_access:false,
      private_key_access:false,
      broadcaster_access:false,
      transaction_submission_performed:false,
      transaction_broadcast_performed:false,
      deployment_performed:false,
      chain2050_write_performed:false,
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
      automatic_retry:false,
    },
    broadcast_authorized:true,
    broadcast_performed:false,
    next_gate:
      "fresh_prebroadcast_observation_then_durable_single_use_broadcast_authorization_consumption_v1",
  };
  return Object.freeze({
    ...material,
    broadcast_authorization_id:
      "voiddrba1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistrySingleTransactionBroadcastAuthorizationV1(
  authorization,
  evidence,
){
  if(
    !authorization||
    typeof authorization!=="object"||
    Array.isArray(authorization)||
    authorization.marker!==
      VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION_V1||
    authorization.version!==1||
    authorization.status!==
      "EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZED_CONSUMPTION_HOLD"||
    !AUTH_ID.test(String(authorization.broadcast_authorization_id||""))||
    authorization.broadcast_authorized!==true||
    authorization.broadcast_performed!==false||
    authorization.next_gate!==
      "fresh_prebroadcast_observation_then_durable_single_use_broadcast_authorization_consumption_v1"
  ){
    throw new Error("registry_broadcast_authorization_contract_invalid");
  }

  const material=structuredClone(authorization);
  const id=material.broadcast_authorization_id;
  delete material.broadcast_authorization_id;
  if(id!=="voiddrba1_"+sha256(Buffer.from(canonicalJson(material)))){
    throw new Error("registry_broadcast_authorization_id_mismatch");
  }

  const expectedScope={
    exact_single_transaction:true,
    exact_signed_transaction_only:true,
    exact_signed_transaction_hash:true,
    signing_lineage_bound:true,
    one_submission_attempt_only:true,
    single_use:true,
    fresh_prebroadcast_observation_required:true,
    durable_consumption_before_broadcaster_access_required:true,
    runtime_expiry_recheck_before_broadcast_required:true,
    exact_contract_creation_consequence_authorized:true,
    exact_gas_fee_spend_authorized:true,
    additional_value_transfer_authorized:false,
    replacement_transaction_authorized:false,
    automatic_retry:false,
  };
  exactKeys(
    authorization.authorization_scope,
    Object.keys(expectedScope),
    "registry_broadcast_authorization_scope",
  );
  for(const [key,value] of Object.entries(expectedScope)){
    if(authorization.authorization_scope[key]!==value){
      throw new Error("registry_broadcast_authorization_scope_mismatch:"+key);
    }
  }

  const expectedAuthority={
    operation_confirmation_verified:true,
    exact_signed_transaction_broadcast_authorized:true,
    source_authorization_artifact_only:true,
    signed_transaction_bytes_access:false,
    credential_access:false,
    private_key_access:false,
    broadcaster_access:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_write_performed:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
    automatic_retry:false,
  };
  exactKeys(
    authorization.authority,
    Object.keys(expectedAuthority),
    "registry_broadcast_authorization_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(authorization.authority[key]!==value){
      throw new Error("registry_broadcast_authorization_authority_mismatch:"+key);
    }
  }

  const authorized=canonicalUtc(
    authorization.authorized_at_utc,
    "registry_broadcast_authorization_authorized_at",
  );
  const expires=canonicalUtc(
    authorization.valid_until_utc,
    "registry_broadcast_authorization_valid_until",
  );
  if(
    expires.ms<=authorized.ms||
    expires.ms-authorized.ms>MAX_WINDOW_MS
  ){
    throw new Error("registry_broadcast_authorization_window_invalid");
  }

  let rebuilt;
  try{
    rebuilt=buildVoidDatanetRegistrySingleTransactionBroadcastAuthorizationV1({
      broadcast_request:evidence?.broadcast_request,
      broadcast_request_evidence:evidence?.broadcast_request_evidence,
      authorized_at_utc:authorization.authorized_at_utc,
      valid_until_utc:authorization.valid_until_utc,
      confirmation:authorization.required_confirmation,
    });
  }catch(error){
    throw new Error(
      "registry_broadcast_authorization_evidence_rebuild_failed:"+
      String(error?.message||error).slice(0,180),
    );
  }
  if(canonicalJson(rebuilt)!==canonicalJson(authorization)){
    throw new Error("registry_broadcast_authorization_evidence_rebuild_mismatch");
  }
  return authorization;
}
