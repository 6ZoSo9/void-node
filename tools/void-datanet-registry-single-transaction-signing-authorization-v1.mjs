#!/usr/bin/env node
import crypto from "node:crypto";

import {
  VOID_DATANET_REGISTRY_SIGNING_AUTHORIZATION_CONFIRMATION_V1,
  validateVoidDatanetRegistryExactSigningRequestV1,
} from "./void-datanet-registry-exact-signing-request-v1.mjs";

export const VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1 =
  "VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1";

const AUTH_ID=/^voiddrsa1_[0-9a-f]{64}$/u;
const REQUEST_ID=/^voiddrsr1_[0-9a-f]{64}$/u;
const CANDIDATE_ID=/^voiddrtxc1_[0-9a-f]{64}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;

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

export function buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1(
  input,
){
  const request=validateVoidDatanetRegistryExactSigningRequestV1(
    input?.signing_request,
    input?.signing_request_evidence,
  );

  if(
    input?.confirmation!==
      VOID_DATANET_REGISTRY_SIGNING_AUTHORIZATION_CONFIRMATION_V1
  ){
    throw new Error("registry_signing_authorization_confirmation_required");
  }

  const authorized=canonicalUtc(
    input?.authorized_at_utc,
    "registry_signing_authorization_authorized_at",
  );
  const requested=canonicalUtc(
    request.requested_at_utc,
    "registry_signing_authorization_request_time",
  );
  const expires=canonicalUtc(
    request.valid_until_utc,
    "registry_signing_authorization_expiry",
  );

  if(
    authorized.ms<requested.ms||
    authorized.ms>=expires.ms
  ){
    throw new Error("registry_signing_authorization_time_invalid");
  }

  if(
    !REQUEST_ID.test(String(request.signing_request_id||""))||
    !CANDIDATE_ID.test(String(request.candidate_id||""))||
    request.status!==
      "HOLD_PENDING_EXACT_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION"||
    request.signing_authorized!==false||
    request.required_confirmation!==
      VOID_DATANET_REGISTRY_SIGNING_AUTHORIZATION_CONFIRMATION_V1||
    request.authority?.signing_authorized!==false||
    request.authority?.transaction_signing!==false||
    request.authority?.signed_transaction_export!==false||
    request.authority?.transaction_submission!==false||
    request.authority?.transaction_broadcast!==false||
    request.authority?.deployment!==false||
    request.authority?.chain2050_mutation!==false||
    request.authority?.funds_movement!==false
  ){
    throw new Error("registry_signing_authorization_request_contract_mismatch");
  }

  const tx=request.transaction_summary;
  if(
    tx?.transaction_type!==2||
    tx?.chain_id!=="2050"||
    !ADDRESS.test(String(tx?.from_address||""))||
    tx?.to_address!==null||
    tx?.value_wei!=="0"||
    !HASH.test(String(tx?.unsigned_transaction_hash||""))||
    !ADDRESS.test(String(tx?.predicted_contract_address||""))||
    !SHA256.test(String(tx?.unsigned_serialized_transaction_sha256||""))||
    !SHA256.test(String(tx?.data_sha256||""))||
    !HASH.test(String(tx?.data_keccak256||""))
  ){
    throw new Error("registry_signing_authorization_transaction_shape_invalid");
  }

  const material={
    marker:VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1,
    version:1,
    status:"EXACT_SINGLE_TRANSACTION_SIGNING_AUTHORIZED_BROADCAST_HOLD",
    authorized_at_utc:authorized.raw,
    valid_until_utc:expires.raw,
    signing_request_id:request.signing_request_id,
    candidate_id:request.candidate_id,
    final_signing_review_id:request.final_signing_review_id,
    candidate_revalidation_id:request.candidate_revalidation_id,
    fresh_credential_binding_id:request.fresh_credential_binding_id,
    transaction_fingerprint_sha256:
      request.transaction_fingerprint_sha256,
    transaction_summary:request.transaction_summary,
    authorization_scope:{
      exact_single_transaction:true,
      signing:true,
      signing_count_maximum:1,
      single_use:true,
      durable_consumption_before_signer_access_required:true,
      runtime_expiry_recheck_before_signer_access_required:true,
      request_rebuild_before_signer_access_required:true,
      candidate_revalidation_before_signer_access_required:false,
      transaction_broadcast:false,
      deployment:false,
      chain2050_write:false,
      funds_movement:false,
      automatic_retry:false,
    },
    authority:{
      operation_confirmation_verified:true,
      exact_transaction_signing_authorized:true,
      source_authorization_artifact_only:true,
      credential_access:false,
      private_key_access:false,
      wallet_access:false,
      signer_object_exposed:false,
      transaction_signing_performed:false,
      signed_transaction_export:false,
      transaction_submission:false,
      transaction_broadcast_authorized:false,
      transaction_broadcast_performed:false,
      deployment_authorized:false,
      deployment_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
      automatic_retry:false,
    },
    signing_authorized:true,
    signing_performed:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
    next_gate:
      "durable_single_use_authorization_consumption_before_exact_registry_transaction_signing_v1",
  };

  return Object.freeze({
    ...material,
    signing_authorization_id:
      "voiddrsa1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1(
  authorization,
  evidence,
){
  if(
    !authorization||
    typeof authorization!=="object"||
    Array.isArray(authorization)||
    authorization.marker!==
      VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1||
    authorization.version!==1||
    authorization.status!==
      "EXACT_SINGLE_TRANSACTION_SIGNING_AUTHORIZED_BROADCAST_HOLD"||
    !AUTH_ID.test(String(authorization.signing_authorization_id||""))||
    authorization.signing_authorized!==true||
    authorization.signing_performed!==false||
    authorization.transaction_broadcast_authorized!==false||
    authorization.transaction_broadcast_performed!==false||
    authorization.chain2050_write_authorized!==false||
    authorization.chain2050_write_performed!==false||
    authorization.next_gate!==
      "durable_single_use_authorization_consumption_before_exact_registry_transaction_signing_v1"
  ){
    throw new Error("registry_signing_authorization_contract_invalid");
  }

  const material=structuredClone(authorization);
  const id=material.signing_authorization_id;
  delete material.signing_authorization_id;
  const expected=
    "voiddrsa1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expected){
    throw new Error("registry_signing_authorization_id_mismatch");
  }

  const expectedScope={
    exact_single_transaction:true,
    signing:true,
    signing_count_maximum:1,
    single_use:true,
    durable_consumption_before_signer_access_required:true,
    runtime_expiry_recheck_before_signer_access_required:true,
    request_rebuild_before_signer_access_required:true,
    candidate_revalidation_before_signer_access_required:false,
    transaction_broadcast:false,
    deployment:false,
    chain2050_write:false,
    funds_movement:false,
    automatic_retry:false,
  };
  exactKeys(
    authorization.authorization_scope,
    Object.keys(expectedScope),
    "registry_signing_authorization_scope",
  );
  for(const [key,value] of Object.entries(expectedScope)){
    if(authorization.authorization_scope[key]!==value){
      throw new Error(
        "registry_signing_authorization_scope_mismatch:"+key,
      );
    }
  }

  const expectedAuthority={
    operation_confirmation_verified:true,
    exact_transaction_signing_authorized:true,
    source_authorization_artifact_only:true,
    credential_access:false,
    private_key_access:false,
    wallet_access:false,
    signer_object_exposed:false,
    transaction_signing_performed:false,
    signed_transaction_export:false,
    transaction_submission:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    deployment_authorized:false,
    deployment_performed:false,
    chain2050_write_authorized:false,
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
    "registry_signing_authorization_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(authorization.authority[key]!==value){
      throw new Error(
        "registry_signing_authorization_authority_mismatch:"+key,
      );
    }
  }

  const authorized=canonicalUtc(
    authorization.authorized_at_utc,
    "registry_signing_authorization_authorized_at",
  );
  const expires=canonicalUtc(
    authorization.valid_until_utc,
    "registry_signing_authorization_expiry",
  );
  if(expires.ms<=authorized.ms){
    throw new Error("registry_signing_authorization_time_invalid");
  }

  let rebuilt;
  try{
    rebuilt=buildVoidDatanetRegistrySingleTransactionSigningAuthorizationV1({
      signing_request:evidence?.signing_request,
      signing_request_evidence:evidence?.signing_request_evidence,
      authorized_at_utc:authorization.authorized_at_utc,
      confirmation:
        VOID_DATANET_REGISTRY_SIGNING_AUTHORIZATION_CONFIRMATION_V1,
    });
  }catch(error){
    throw new Error(
      "registry_signing_authorization_evidence_rebuild_failed:"+
      String(error?.message||error).slice(0,180),
    );
  }
  if(canonicalJson(rebuilt)!==canonicalJson(authorization)){
    throw new Error("registry_signing_authorization_evidence_rebuild_mismatch");
  }

  return authorization;
}
