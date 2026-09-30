#!/usr/bin/env node
import crypto from "node:crypto";

import {
  validateVoidDatanetRegistryFinalSigningReviewEvidenceV1,
} from "./void-datanet-registry-final-signing-review-v1.mjs";
import {
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1,
} from "./void-datanet-registry-unsigned-transaction-candidate-v1.mjs";

export const VOID_DATANET_REGISTRY_EXACT_SIGNING_REQUEST_V1 =
  "VOID_DATANET_REGISTRY_EXACT_SIGNING_REQUEST_V1";
export const VOID_DATANET_REGISTRY_SIGNING_AUTHORIZATION_CONFIRMATION_V1 =
  "authorizeDatanetRegistryDeploymentSigningV1";

const REQUEST_ID=/^voiddrsr1_[0-9a-f]{64}$/u;
const CANDIDATE_ID=/^voiddrtxc1_[0-9a-f]{64}$/u;
const REVIEW_ID=/^voiddrfsr1_[0-9a-f]{64}$/u;
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
function sha256HexBytes(hex){
  const raw=String(hex||"").toLowerCase();
  if(!/^0x(?:[0-9a-f]{2})+$/u.test(raw)){
    throw new Error("signing_request_unsigned_serialized_transaction_invalid");
  }
  return sha256(Buffer.from(raw.slice(2),"hex"));
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

export function buildVoidDatanetRegistryExactSigningRequestV1(input){
  const candidate=validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
    input?.unsigned_transaction_candidate,
    input?.candidate_evidence,
  );
  const review=validateVoidDatanetRegistryFinalSigningReviewEvidenceV1(
    input?.final_signing_review,
    {
      unsigned_transaction_candidate:candidate,
      candidate_evidence:input?.candidate_evidence,
      prior_credential_binding:input?.prior_credential_binding,
      candidate_revalidation_receipt:input?.candidate_revalidation_receipt,
      fresh_fee_funding_packet:input?.fresh_fee_funding_packet,
      fresh_credential_binding:input?.fresh_credential_binding,
      deployer_selection:input?.deployer_selection,
    },
  );

  if(
    !CANDIDATE_ID.test(String(candidate.candidate_id||""))||
    !REVIEW_ID.test(String(review.final_signing_review_id||""))||
    review.candidate_id!==candidate.candidate_id||
    review.unsigned_transaction_hash!==
      candidate.transaction.unsigned_transaction_hash||
    review.transaction_fingerprint_sha256!==
      candidate.transaction_fingerprint_sha256||
    review.deployer_address!==candidate.transaction.from_address||
    review.signing_authorized!==false||
    review.authority?.transaction_signing_authorized!==false||
    review.authority?.transaction_signing!==false||
    candidate.signing_authorized!==false||
    candidate.authority?.transaction_signing!==false||
    candidate.authority?.transaction_submission!==false||
    candidate.authority?.transaction_broadcast!==false
  ){
    throw new Error("registry_signing_request_candidate_review_binding_mismatch");
  }

  const requestedAt=String(input?.requested_at_utc||"");
  const requestedMs=Date.parse(requestedAt);
  const reviewEvaluatedMs=Date.parse(String(review.evaluated_at_utc||""));
  const reviewExpiryMs=Date.parse(String(review.valid_until_utc||""));
  const candidateExpiryMs=Date.parse(String(candidate.valid_until_utc||""));
  if(
    !/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/u.test(requestedAt)||
    !Number.isFinite(requestedMs)||
    !Number.isFinite(reviewEvaluatedMs)||
    !Number.isFinite(reviewExpiryMs)||
    !Number.isFinite(candidateExpiryMs)||
    requestedMs<reviewEvaluatedMs||
    requestedMs>reviewExpiryMs||
    requestedMs>candidateExpiryMs
  ){
    throw new Error("registry_signing_request_time_invalid");
  }
  const validUntilMs=Math.min(reviewExpiryMs,candidateExpiryMs);
  if(validUntilMs<=requestedMs||validUntilMs-requestedMs>60_000){
    throw new Error("registry_signing_request_validity_window_invalid");
  }

  const tx=candidate.transaction;
  if(
    tx.transaction_type!==2||
    tx.chain_id!=="2050"||
    !ADDRESS.test(String(tx.from_address||""))||
    tx.to_address!==null||
    tx.value_wei!=="0"||
    !HASH.test(String(tx.unsigned_transaction_hash||""))||
    !ADDRESS.test(String(tx.predicted_contract_address||""))||
    !SHA256.test(String(tx.data_sha256||""))||
    !HASH.test(String(tx.data_keccak256||""))
  ){
    throw new Error("registry_signing_request_transaction_shape_invalid");
  }

  const transactionSummary={
    transaction_type:2,
    chain_id:"2050",
    nonce:String(tx.nonce),
    from_address:tx.from_address,
    to_address:null,
    value_wei:"0",
    gas_limit:String(tx.gas_limit),
    max_fee_per_gas_wei:String(tx.max_fee_per_gas_wei),
    max_priority_fee_per_gas_wei:String(tx.max_priority_fee_per_gas_wei),
    data_sha256:tx.data_sha256,
    data_keccak256:tx.data_keccak256,
    unsigned_serialized_transaction_sha256:
      sha256HexBytes(tx.unsigned_serialized_transaction),
    unsigned_transaction_hash:tx.unsigned_transaction_hash,
    predicted_contract_address:tx.predicted_contract_address,
  };

  const material={
    marker:VOID_DATANET_REGISTRY_EXACT_SIGNING_REQUEST_V1,
    version:1,
    status:"HOLD_PENDING_EXACT_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION",
    requested_at_utc:requestedAt,
    valid_until_utc:new Date(validUntilMs).toISOString(),
    candidate_id:candidate.candidate_id,
    final_signing_review_id:review.final_signing_review_id,
    candidate_revalidation_id:review.candidate_revalidation_id,
    fresh_credential_binding_id:review.fresh_credential_binding_id,
    transaction_fingerprint_sha256:
      candidate.transaction_fingerprint_sha256,
    transaction_summary:transactionSummary,
    verification:{
      candidate_exact:true,
      final_signing_review_exact:true,
      final_signing_review_unexpired:true,
      candidate_unexpired:true,
      exact_unsigned_transaction_hash_bound:true,
      exact_transaction_fingerprint_bound:true,
      exact_deployer_bound:true,
      fresh_candidate_revalidation_bound:true,
      fresh_deployer_credential_binding_bound:true,
      separate_operation_bound_signing_authorization_required:true,
      broadcast_remains_separate:true,
    },
    authority:{
      source_request_only:true,
      rpc_call:false,
      credential_access:false,
      private_key_access:false,
      wallet_access:false,
      signer_object_exposed:false,
      transaction_construction:false,
      signing_authorized:false,
      transaction_signing:false,
      signed_transaction_export:false,
      transaction_submission:false,
      transaction_broadcast:false,
      deployment:false,
      chain2050_mutation:false,
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
      automatic_retry:false,
    },
    signing_authorized:false,
    required_confirmation:
      VOID_DATANET_REGISTRY_SIGNING_AUTHORIZATION_CONFIRMATION_V1,
    next_gate:
      "separate_exact_operation_bound_signing_authorization_then_offline_nimo_sign_exact_candidate_only",
  };
  return Object.freeze({
    ...material,
    signing_request_id:
      "voiddrsr1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistryExactSigningRequestV1(
  request,
  evidence,
){
  if(
    !request||
    typeof request!=="object"||
    Array.isArray(request)||
    request.marker!==VOID_DATANET_REGISTRY_EXACT_SIGNING_REQUEST_V1||
    request.version!==1||
    request.status!==
      "HOLD_PENDING_EXACT_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION"||
    !REQUEST_ID.test(String(request.signing_request_id||""))||
    !CANDIDATE_ID.test(String(request.candidate_id||""))||
    !REVIEW_ID.test(String(request.final_signing_review_id||""))||
    !SHA256.test(String(request.transaction_fingerprint_sha256||""))||
    request.signing_authorized!==false||
    request.required_confirmation!==
      VOID_DATANET_REGISTRY_SIGNING_AUTHORIZATION_CONFIRMATION_V1||
    request.next_gate!==
      "separate_exact_operation_bound_signing_authorization_then_offline_nimo_sign_exact_candidate_only"
  ){
    throw new Error("registry_signing_request_contract_invalid");
  }

  const material=structuredClone(request);
  const id=material.signing_request_id;
  delete material.signing_request_id;
  const expected="voiddrsr1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expected){
    throw new Error("registry_signing_request_id_mismatch");
  }

  const expectedVerification={
    candidate_exact:true,
    final_signing_review_exact:true,
    final_signing_review_unexpired:true,
    candidate_unexpired:true,
    exact_unsigned_transaction_hash_bound:true,
    exact_transaction_fingerprint_bound:true,
    exact_deployer_bound:true,
    fresh_candidate_revalidation_bound:true,
    fresh_deployer_credential_binding_bound:true,
    separate_operation_bound_signing_authorization_required:true,
    broadcast_remains_separate:true,
  };
  exactKeys(
    request.verification,
    Object.keys(expectedVerification),
    "registry_signing_request_verification",
  );
  for(const [key,value] of Object.entries(expectedVerification)){
    if(request.verification[key]!==value){
      throw new Error("registry_signing_request_verification_mismatch:"+key);
    }
  }

  const expectedAuthority={
    source_request_only:true,
    rpc_call:false,
    credential_access:false,
    private_key_access:false,
    wallet_access:false,
    signer_object_exposed:false,
    transaction_construction:false,
    signing_authorized:false,
    transaction_signing:false,
    signed_transaction_export:false,
    transaction_submission:false,
    transaction_broadcast:false,
    deployment:false,
    chain2050_mutation:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
    automatic_retry:false,
  };
  exactKeys(
    request.authority,
    Object.keys(expectedAuthority),
    "registry_signing_request_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(request.authority[key]!==value){
      throw new Error("registry_signing_request_authority_mismatch:"+key);
    }
  }

  const requestedMs=Date.parse(String(request.requested_at_utc||""));
  const validMs=Date.parse(String(request.valid_until_utc||""));
  if(
    !Number.isFinite(requestedMs)||
    !Number.isFinite(validMs)||
    validMs<=requestedMs||
    validMs-requestedMs>60_000
  ){
    throw new Error("registry_signing_request_time_invalid");
  }

  let rebuilt;
  try{
    rebuilt=buildVoidDatanetRegistryExactSigningRequestV1({
      unsigned_transaction_candidate:evidence?.unsigned_transaction_candidate,
      candidate_evidence:evidence?.candidate_evidence,
      final_signing_review:evidence?.final_signing_review,
      prior_credential_binding:evidence?.prior_credential_binding,
      candidate_revalidation_receipt:
        evidence?.candidate_revalidation_receipt,
      fresh_fee_funding_packet:evidence?.fresh_fee_funding_packet,
      fresh_credential_binding:evidence?.fresh_credential_binding,
      deployer_selection:evidence?.deployer_selection,
      requested_at_utc:request.requested_at_utc,
    });
  }catch(error){
    throw new Error(
      "registry_signing_request_evidence_rebuild_failed:"+
      String(error?.message||error).slice(0,180),
    );
  }
  if(canonicalJson(rebuilt)!==canonicalJson(request)){
    throw new Error("registry_signing_request_evidence_rebuild_mismatch");
  }
  return request;
}
