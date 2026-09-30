#!/usr/bin/env node
import crypto from "node:crypto";
import {Transaction} from "ethers";

import {
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1,
} from "./void-datanet-registry-unsigned-transaction-candidate-v1.mjs";
import {
  validateVoidDatanetRegistryExactSigningRequestV1,
} from "./void-datanet-registry-exact-signing-request-v1.mjs";
import {
  validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1,
} from "./void-datanet-registry-single-transaction-signing-authorization-v1.mjs";
import {
  validateVoidDatanetRegistrySignedTransactionV1,
} from "./void-datanet-registry-consumed-authorization-signing-v1.mjs";

export const VOID_DATANET_REGISTRY_SIGNED_TRANSACTION_VERIFICATION_V1 =
  "VOID_DATANET_REGISTRY_SIGNED_TRANSACTION_VERIFICATION_V1";
export const VOID_DATANET_REGISTRY_BROADCAST_AUTHORIZATION_REQUEST_V1 =
  "VOID_DATANET_REGISTRY_BROADCAST_AUTHORIZATION_REQUEST_V1";

const SIGNED_ID=/^voiddrstx1_[0-9a-f]{64}$/u;
const REQUEST_ID=/^voiddrsr1_[0-9a-f]{64}$/u;
const AUTH_ID=/^voiddrsa1_[0-9a-f]{64}$/u;
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

export function requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1(
  input,
){
  const signedId=String(input?.signed_transaction_id||"");
  const signedHash=String(input?.signed_transaction_hash||"").toLowerCase();
  const candidateId=String(input?.candidate_id||"");
  const fingerprint=String(input?.transaction_fingerprint_sha256||"");
  if(
    !SIGNED_ID.test(signedId)||
    !HASH.test(signedHash)||
    !CANDIDATE_ID.test(candidateId)||
    !SHA256.test(fingerprint)
  ){
    throw new Error("registry_broadcast_confirmation_input_invalid");
  }
  return [
    "authorizeDatanetRegistryDeploymentBroadcastV1",
    signedId,
    signedHash,
    candidateId,
    fingerprint,
  ].join(":");
}

export function verifyVoidDatanetRegistrySignedTransactionAgainstLineageV1(
  input,
){
  const candidate=validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
    input?.unsigned_transaction_candidate,
    input?.candidate_evidence,
  );
  const request=validateVoidDatanetRegistryExactSigningRequestV1(
    input?.signing_request,
    input?.signing_request_evidence,
  );
  const authorization=
    validateVoidDatanetRegistrySingleTransactionSigningAuthorizationV1(
      input?.signing_authorization,
      {
        signing_request:request,
        signing_request_evidence:input?.signing_request_evidence,
      },
    );
  const signed=validateVoidDatanetRegistrySignedTransactionV1(
    input?.signed_transaction,
  );

  if(
    signed.candidate_id!==candidate.candidate_id||
    signed.signing_request_id!==request.signing_request_id||
    signed.signing_authorization_id!==authorization.signing_authorization_id||
    signed.final_signing_review_id!==authorization.final_signing_review_id||
    signed.transaction_fingerprint_sha256!==
      candidate.transaction_fingerprint_sha256||
    signed.transaction_fingerprint_sha256!==
      authorization.transaction_fingerprint_sha256||
    signed.unsigned_transaction_hash!==
      candidate.transaction.unsigned_transaction_hash||
    signed.unsigned_transaction_hash!==
      authorization.transaction_summary.unsigned_transaction_hash||
    signed.deployer_address!==candidate.transaction.from_address||
    signed.deployer_address!==authorization.transaction_summary.from_address
  ){
    throw new Error("registry_signed_verification_lineage_mismatch");
  }

  const parsed=Transaction.from(signed.signed_serialized_transaction);
  const tx=candidate.transaction;
  if(
    parsed.type!==2||
    parsed.chainId!==2050n||
    parsed.from?.toLowerCase()!==tx.from_address||
    parsed.to!==null||
    parsed.nonce!==Number(tx.nonce)||
    parsed.value!==0n||
    parsed.gasLimit!==BigInt(tx.gas_limit)||
    parsed.maxFeePerGas!==BigInt(tx.max_fee_per_gas_wei)||
    parsed.maxPriorityFeePerGas!==BigInt(tx.max_priority_fee_per_gas_wei)||
    parsed.data.toLowerCase()!==tx.data||
    parsed.hash?.toLowerCase()!==signed.signed_transaction_hash||
    parsed.unsignedHash.toLowerCase()!==signed.unsigned_transaction_hash
  ){
    throw new Error("registry_signed_verification_exact_transaction_mismatch");
  }

  const signedBytes=Buffer.from(
    signed.signed_serialized_transaction.slice(2),
    "hex",
  );
  const signedSha=sha256(signedBytes);
  if(signedSha!==signed.signed_serialized_transaction_sha256){
    throw new Error("registry_signed_verification_serialized_sha_mismatch");
  }

  const summary={
    transaction_type:2,
    chain_id:"2050",
    nonce:String(tx.nonce),
    from_address:tx.from_address,
    to_address:null,
    value_wei:"0",
    gas_limit:String(tx.gas_limit),
    max_fee_per_gas_wei:String(tx.max_fee_per_gas_wei),
    max_priority_fee_per_gas_wei:String(tx.max_priority_fee_per_gas_wei),
    predicted_contract_address:tx.predicted_contract_address,
    data_sha256:tx.data_sha256,
    data_keccak256:tx.data_keccak256,
    unsigned_transaction_hash:tx.unsigned_transaction_hash,
    signed_transaction_hash:signed.signed_transaction_hash,
    signed_serialized_transaction_sha256:signedSha,
  };
  if(
    !DECIMAL.test(summary.nonce)||
    !DECIMAL.test(summary.gas_limit)||
    !DECIMAL.test(summary.max_fee_per_gas_wei)||
    !DECIMAL.test(summary.max_priority_fee_per_gas_wei)||
    !ADDRESS.test(summary.from_address)||
    !ADDRESS.test(summary.predicted_contract_address)||
    !HASH.test(summary.unsigned_transaction_hash)||
    !HASH.test(summary.signed_transaction_hash)||
    !SHA256.test(summary.data_sha256)||
    !HASH.test(summary.data_keccak256)||
    !SHA256.test(summary.signed_serialized_transaction_sha256)
  ){
    throw new Error("registry_signed_verification_summary_invalid");
  }

  const material={
    marker:VOID_DATANET_REGISTRY_SIGNED_TRANSACTION_VERIFICATION_V1,
    version:1,
    status:"SIGNED_REGISTRY_TRANSACTION_VERIFIED_BROADCAST_AUTHORIZATION_HOLD",
    signed_transaction_id:signed.signed_transaction_id,
    candidate_id:candidate.candidate_id,
    signing_request_id:request.signing_request_id,
    signing_authorization_id:authorization.signing_authorization_id,
    consumption_record_id:signed.consumption_record_id,
    signing_operation_id:signed.signing_operation_id,
    signing_claim_id:signed.signing_claim_id,
    final_signing_review_id:signed.final_signing_review_id,
    transaction_fingerprint_sha256:candidate.transaction_fingerprint_sha256,
    deployer_address:signed.deployer_address,
    signed_at_utc:signed.signed_at_utc,
    transaction_summary:summary,
    verification:{
      signed_transaction_content_id_rederived:true,
      signer_recovered_from_signed_transaction:true,
      exact_unsigned_candidate_bound:true,
      exact_signing_request_bound:true,
      exact_signing_authorization_bound:true,
      exact_transaction_fields_match_candidate:true,
      exact_signed_hash_match:true,
      signed_serialized_sha256_match:true,
      signed_transaction_bytes_not_copied_into_verification:true,
    },
    authority:{
      verification_only:true,
      credential_access:false,
      private_key_access:false,
      signer_access:false,
      transaction_signing:false,
      signed_transaction_bytes_output:false,
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
    next_gate:
      "exact_registry_broadcast_authorization_request_v1",
  };
  return Object.freeze({
    ...material,
    signed_transaction_verification_id:
      "voiddrstv1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistrySignedTransactionVerificationV1(
  value,
  evidence,
){
  if(
    !value||
    value.marker!==VOID_DATANET_REGISTRY_SIGNED_TRANSACTION_VERIFICATION_V1||
    value.version!==1||
    value.status!==
      "SIGNED_REGISTRY_TRANSACTION_VERIFIED_BROADCAST_AUTHORIZATION_HOLD"||
    !/^voiddrstv1_[0-9a-f]{64}$/u.test(
      String(value.signed_transaction_verification_id||""),
    )||
    value.next_gate!=="exact_registry_broadcast_authorization_request_v1"
  ){
    throw new Error("registry_signed_verification_contract_invalid");
  }

  const material=structuredClone(value);
  const id=material.signed_transaction_verification_id;
  delete material.signed_transaction_verification_id;
  if(id!=="voiddrstv1_"+sha256(Buffer.from(canonicalJson(material)))){
    throw new Error("registry_signed_verification_id_mismatch");
  }

  const expectedVerification={
    signed_transaction_content_id_rederived:true,
    signer_recovered_from_signed_transaction:true,
    exact_unsigned_candidate_bound:true,
    exact_signing_request_bound:true,
    exact_signing_authorization_bound:true,
    exact_transaction_fields_match_candidate:true,
    exact_signed_hash_match:true,
    signed_serialized_sha256_match:true,
    signed_transaction_bytes_not_copied_into_verification:true,
  };
  exactKeys(
    value.verification,
    Object.keys(expectedVerification),
    "registry_signed_verification_facts",
  );
  for(const [key,expected] of Object.entries(expectedVerification)){
    if(value.verification[key]!==expected){
      throw new Error("registry_signed_verification_fact_mismatch:"+key);
    }
  }

  const expectedAuthority={
    verification_only:true,
    credential_access:false,
    private_key_access:false,
    signer_access:false,
    transaction_signing:false,
    signed_transaction_bytes_output:false,
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
    value.authority,
    Object.keys(expectedAuthority),
    "registry_signed_verification_authority",
  );
  for(const [key,expected] of Object.entries(expectedAuthority)){
    if(value.authority[key]!==expected){
      throw new Error("registry_signed_verification_authority_mismatch:"+key);
    }
  }

  const rebuilt=verifyVoidDatanetRegistrySignedTransactionAgainstLineageV1(
    evidence,
  );
  if(canonicalJson(rebuilt)!==canonicalJson(value)){
    throw new Error("registry_signed_verification_evidence_rebuild_mismatch");
  }
  return value;
}

export function buildVoidDatanetRegistryBroadcastAuthorizationRequestV1(input){
  const verification=
    validateVoidDatanetRegistrySignedTransactionVerificationV1(
      input?.signed_transaction_verification,
      input?.verification_evidence,
    );

  const requiredConfirmation=
    requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1({
      signed_transaction_id:verification.signed_transaction_id,
      signed_transaction_hash:
        verification.transaction_summary.signed_transaction_hash,
      candidate_id:verification.candidate_id,
      transaction_fingerprint_sha256:
        verification.transaction_fingerprint_sha256,
    });

  const material={
    marker:VOID_DATANET_REGISTRY_BROADCAST_AUTHORIZATION_REQUEST_V1,
    version:1,
    status:
      "HOLD_PENDING_EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION",
    signed_transaction_verification_id:
      verification.signed_transaction_verification_id,
    signed_transaction_id:verification.signed_transaction_id,
    candidate_id:verification.candidate_id,
    signing_request_id:verification.signing_request_id,
    signing_authorization_id:verification.signing_authorization_id,
    consumption_record_id:verification.consumption_record_id,
    signing_operation_id:verification.signing_operation_id,
    transaction_fingerprint_sha256:
      verification.transaction_fingerprint_sha256,
    deployer_address:verification.deployer_address,
    signed_at_utc:verification.signed_at_utc,
    transaction_summary:verification.transaction_summary,
    required_confirmation:requiredConfirmation,
    scope:{
      exact_single_transaction:true,
      exact_signed_transaction_only:true,
      one_submission_attempt_only:true,
      exact_contract_creation_consequence_requires_later_authorization:true,
      exact_gas_fee_spend_requires_later_authorization:true,
      additional_value_transfer_authorized:false,
      replacement_transaction_authorized:false,
      automatic_retry:false,
    },
    authority:{
      request_only:true,
      signed_transaction_bytes_output:false,
      credential_access:false,
      private_key_access:false,
      broadcaster_access:false,
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
      automatic_retry:false,
    },
    broadcast_authorized:false,
    broadcast_performed:false,
    next_gate:
      "explicit_exact_registry_single_transaction_broadcast_authorization_v1",
  };

  return Object.freeze({
    ...material,
    broadcast_authorization_request_id:
      "voiddrbar1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistryBroadcastAuthorizationRequestV1(
  request,
  evidence,
){
  if(
    !request||
    request.marker!==VOID_DATANET_REGISTRY_BROADCAST_AUTHORIZATION_REQUEST_V1||
    request.version!==1||
    request.status!==
      "HOLD_PENDING_EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION"||
    !/^voiddrbar1_[0-9a-f]{64}$/u.test(
      String(request.broadcast_authorization_request_id||""),
    )||
    request.broadcast_authorized!==false||
    request.broadcast_performed!==false||
    request.next_gate!==
      "explicit_exact_registry_single_transaction_broadcast_authorization_v1"
  ){
    throw new Error("registry_broadcast_request_contract_invalid");
  }
  const material=structuredClone(request);
  const id=material.broadcast_authorization_request_id;
  delete material.broadcast_authorization_request_id;
  if(id!=="voiddrbar1_"+sha256(Buffer.from(canonicalJson(material)))){
    throw new Error("registry_broadcast_request_id_mismatch");
  }

  const expectedScope={
    exact_single_transaction:true,
    exact_signed_transaction_only:true,
    one_submission_attempt_only:true,
    exact_contract_creation_consequence_requires_later_authorization:true,
    exact_gas_fee_spend_requires_later_authorization:true,
    additional_value_transfer_authorized:false,
    replacement_transaction_authorized:false,
    automatic_retry:false,
  };
  exactKeys(
    request.scope,
    Object.keys(expectedScope),
    "registry_broadcast_request_scope",
  );
  for(const [key,expected] of Object.entries(expectedScope)){
    if(request.scope[key]!==expected){
      throw new Error("registry_broadcast_request_scope_mismatch:"+key);
    }
  }

  const expectedAuthority={
    request_only:true,
    signed_transaction_bytes_output:false,
    credential_access:false,
    private_key_access:false,
    broadcaster_access:false,
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
    automatic_retry:false,
  };
  exactKeys(
    request.authority,
    Object.keys(expectedAuthority),
    "registry_broadcast_request_authority",
  );
  for(const [key,expected] of Object.entries(expectedAuthority)){
    if(request.authority[key]!==expected){
      throw new Error("registry_broadcast_request_authority_mismatch:"+key);
    }
  }

  const verification=
    validateVoidDatanetRegistrySignedTransactionVerificationV1(
      evidence?.signed_transaction_verification,
      evidence?.verification_evidence,
    );
  const rebuilt=buildVoidDatanetRegistryBroadcastAuthorizationRequestV1({
    signed_transaction_verification:verification,
    verification_evidence:evidence?.verification_evidence,
  });
  if(canonicalJson(rebuilt)!==canonicalJson(request)){
    throw new Error("registry_broadcast_request_evidence_rebuild_mismatch");
  }
  return request;
}
