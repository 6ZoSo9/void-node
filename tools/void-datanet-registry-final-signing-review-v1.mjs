#!/usr/bin/env node
import crypto from "node:crypto";

import {
  validateVoidDatanetRegistryCandidateFreshRevalidationV1,
} from "./void-datanet-registry-candidate-fresh-revalidation-v1.mjs";
import {
  validateVoidDatanetRegistryDeployerCredentialBindingV1,
} from "./void-datanet-registry-deployer-credential-binding-v1.mjs";
import {
  validateVoidDatanetRegistryFreshFeeFundingPacketV1,
} from "./void-datanet-registry-transaction-construction-admission-v1.mjs";
import {
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1,
} from "./void-datanet-registry-unsigned-transaction-candidate-v1.mjs";

export const VOID_DATANET_REGISTRY_FINAL_SIGNING_REVIEW_V1 =
  "VOID_DATANET_REGISTRY_FINAL_SIGNING_REVIEW_V1";

const REVIEW_ID=/^voiddrfsr1_[0-9a-f]{64}$/u;
const CANDIDATE_ID=/^voiddrtxc1_[0-9a-f]{64}$/u;
const REVALIDATION_ID=/^voiddrcfr1_[0-9a-f]{64}$/u;
const BINDING_ID=/^voiddrcb1_[0-9a-f]{64}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;

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
  if(
    JSON.stringify(Object.keys(value).sort())!==
      JSON.stringify([...keys].sort())
  ){
    throw new Error(label+"_keys_invalid");
  }
}
function decimal(value,label){
  const raw=String(value??"");
  if(!/^(0|[1-9][0-9]{0,77})$/u.test(raw)){
    throw new Error(label+"_invalid");
  }
  return BigInt(raw);
}

export function validateVoidDatanetRegistryCandidateRevalidationEvidenceV1(
  input,
){
  const candidate=validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
    input?.unsigned_transaction_candidate,
    input?.candidate_evidence,
  );
  const priorBinding=validateVoidDatanetRegistryDeployerCredentialBindingV1(
    input?.prior_credential_binding,
    {
      deployer_selection:input?.deployer_selection,
      unsigned_transaction_candidate:candidate,
      candidate_evidence:input?.candidate_evidence,
    },
  );
  const receipt=validateVoidDatanetRegistryCandidateFreshRevalidationV1(
    input?.candidate_revalidation_receipt,
  );
  const deploymentPlan=input?.candidate_evidence?.deployment_input_plan;
  const fee=validateVoidDatanetRegistryFreshFeeFundingPacketV1(
    input?.fresh_fee_funding_packet,
    deploymentPlan,
  ).fee_packet;

  if(
    receipt.candidate_id!==candidate.candidate_id||
    receipt.unsigned_transaction_hash!==
      candidate.transaction.unsigned_transaction_hash||
    receipt.transaction_fingerprint_sha256!==
      candidate.transaction_fingerprint_sha256||
    receipt.prior_credential_binding_id!==priorBinding.credential_binding_id||
    receipt.fresh_fee_funding_packet_id!==fee.packet_id||
    receipt.fresh_observation_block_number!==
      fee.observation.observation_block_number||
    receipt.fresh_observation_block_hash!==
      fee.observation.observation_block_hash
  ){
    throw new Error("final_review_revalidation_binding_mismatch");
  }

  const tx=candidate.transaction;
  const obs=fee.observation;
  const candidateGas=decimal(tx.gas_limit,"candidate_gas_limit");
  const candidateMaxFee=decimal(tx.max_fee_per_gas_wei,"candidate_max_fee");
  const candidatePriority=decimal(
    tx.max_priority_fee_per_gas_wei,
    "candidate_priority_fee",
  );
  const freshGas=decimal(obs.proposed_gas_limit,"fresh_gas_limit");
  const freshBalance=decimal(obs.deployer_balance_wei,"fresh_balance");
  const candidateCost=candidateGas*candidateMaxFee;

  if(
    obs.deployer_pending_nonce!==tx.nonce||
    obs.predicted_registry_contract_address!==tx.predicted_contract_address||
    obs.predicted_registry_address_vacant!==true||
    obs.creation_data_keccak256!==tx.data_keccak256||
    obs.activation_height_continuity_verified!==true||
    obs.pending_nonce_revalidated!==true||
    obs.observation_block_hash_revalidated!==true||
    candidateGas<freshGas||
    candidateMaxFee!==decimal(obs.max_fee_per_gas_wei,"fresh_max_fee")||
    candidatePriority!==decimal(
      obs.max_priority_fee_per_gas_wei,
      "fresh_priority_fee",
    )||
    freshBalance<candidateCost||
    receipt.continuity?.candidate_maximum_gas_cost_wei!==
      candidateCost.toString(10)||
    receipt.continuity?.fresh_credential_rebinding_required!==true
  ){
    throw new Error("final_review_revalidation_live_state_mismatch");
  }

  return Object.freeze({
    candidate,
    prior_binding:priorBinding,
    revalidation:receipt,
    fresh_fee_packet:fee,
    candidate_maximum_gas_cost_wei:candidateCost.toString(10),
  });
}

export function buildVoidDatanetRegistryFinalSigningReviewV1(input){
  const validated=validateVoidDatanetRegistryCandidateRevalidationEvidenceV1(
    input,
  );
  const freshBinding=validateVoidDatanetRegistryDeployerCredentialBindingV1(
    input?.fresh_credential_binding,
    {
      deployer_selection:input?.deployer_selection,
      unsigned_transaction_candidate:validated.candidate,
      candidate_evidence:input?.candidate_evidence,
    },
  );

  if(
    freshBinding.credential_binding_id===
      validated.prior_binding.credential_binding_id||
    freshBinding.candidate_id!==validated.candidate.candidate_id||
    freshBinding.unsigned_transaction_hash!==
      validated.candidate.transaction.unsigned_transaction_hash||
    freshBinding.transaction_fingerprint_sha256!==
      validated.candidate.transaction_fingerprint_sha256||
    freshBinding.deployer_address!==
      validated.candidate.transaction.from_address||
    freshBinding.signing_authorized!==false||
    freshBinding.authority?.transaction_signing_authorized!==false||
    freshBinding.authority?.transaction_signing_performed!==false
  ){
    throw new Error("final_review_fresh_credential_binding_mismatch");
  }

  const revalidationObserved=Date.parse(
    validated.revalidation.observed_at_utc,
  );
  const revalidationExpiry=Date.parse(
    validated.revalidation.valid_until_utc,
  );
  const candidateExpiry=Date.parse(validated.candidate.valid_until_utc);
  const freshBoundAt=Date.parse(freshBinding.bound_at_utc);
  const evaluatedAt=String(input?.evaluated_at_utc||"");
  const evaluatedMs=Date.parse(evaluatedAt);

  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(
      evaluatedAt,
    )||
    !Number.isFinite(revalidationObserved)||
    !Number.isFinite(revalidationExpiry)||
    !Number.isFinite(candidateExpiry)||
    !Number.isFinite(freshBoundAt)||
    !Number.isFinite(evaluatedMs)||
    freshBoundAt<revalidationObserved||
    freshBoundAt>revalidationExpiry||
    freshBoundAt>candidateExpiry||
    evaluatedMs<freshBoundAt||
    evaluatedMs>revalidationExpiry||
    evaluatedMs>candidateExpiry
  ){
    throw new Error("final_review_freshness_or_order_invalid");
  }

  const validUntilMs=Math.min(revalidationExpiry,candidateExpiry);
  const material={
    marker:VOID_DATANET_REGISTRY_FINAL_SIGNING_REVIEW_V1,
    version:1,
    status:
      "FINAL_SIGNING_REVIEW_GREEN_SINGLE_TRANSACTION_AUTHORIZATION_REQUIRED",
    evaluated_at_utc:evaluatedAt,
    valid_until_utc:new Date(validUntilMs).toISOString(),
    candidate_id:validated.candidate.candidate_id,
    unsigned_transaction_hash:
      validated.candidate.transaction.unsigned_transaction_hash,
    transaction_fingerprint_sha256:
      validated.candidate.transaction_fingerprint_sha256,
    candidate_revalidation_id:
      validated.revalidation.candidate_revalidation_id,
    fresh_fee_funding_packet_id:
      validated.fresh_fee_packet.packet_id,
    prior_credential_binding_id:
      validated.prior_binding.credential_binding_id,
    fresh_credential_binding_id:
      freshBinding.credential_binding_id,
    deployer_address:validated.candidate.transaction.from_address,
    verification:{
      candidate_exact:true,
      candidate_still_unexpired:true,
      fresh_read_only_revalidation_exact:true,
      fresh_fee_packet_exact:true,
      fresh_live_state_still_matches_candidate:true,
      candidate_maximum_gas_cost_funded:true,
      prior_credential_binding_lineage_only:true,
      fresh_credential_binding_exact:true,
      fresh_credential_binding_after_revalidation:true,
      fresh_credential_binding_within_revalidation_window:true,
      fresh_binding_distinct_from_prior_binding:true,
      exact_unsigned_hash_bound:true,
      exact_transaction_fingerprint_bound:true,
      separate_signing_authorization_required:true,
    },
    authority:{
      review_artifact_only:true,
      rpc_call:false,
      credential_access:false,
      private_key_access:false,
      wallet_access:false,
      signer_object_exposed:false,
      deployer_funding:false,
      transaction_construction:false,
      transaction_signing_authorized:false,
      transaction_signing:false,
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
    next_gate:
      "separate_exact_single_transaction_signing_authorization_for_reviewed_registry_candidate",
  };

  return Object.freeze({
    ...material,
    final_signing_review_id:
      "voiddrfsr1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistryFinalSigningReviewV1(review){
  if(
    !review||
    typeof review!=="object"||
    Array.isArray(review)||
    review.marker!==VOID_DATANET_REGISTRY_FINAL_SIGNING_REVIEW_V1||
    review.version!==1||
    review.status!==
      "FINAL_SIGNING_REVIEW_GREEN_SINGLE_TRANSACTION_AUTHORIZATION_REQUIRED"||
    !REVIEW_ID.test(String(review.final_signing_review_id||""))||
    !CANDIDATE_ID.test(String(review.candidate_id||""))||
    !REVALIDATION_ID.test(String(review.candidate_revalidation_id||""))||
    !BINDING_ID.test(String(review.prior_credential_binding_id||""))||
    !BINDING_ID.test(String(review.fresh_credential_binding_id||""))||
    !HASH.test(String(review.unsigned_transaction_hash||""))||
    !SHA256.test(String(review.transaction_fingerprint_sha256||""))||
    review.signing_authorized!==false||
    review.next_gate!==
      "separate_exact_single_transaction_signing_authorization_for_reviewed_registry_candidate"
  ){
    throw new Error("final_signing_review_contract_invalid");
  }

  const evaluated=Date.parse(String(review.evaluated_at_utc||""));
  const valid=Date.parse(String(review.valid_until_utc||""));
  if(
    !Number.isFinite(evaluated)||
    !Number.isFinite(valid)||
    valid<=evaluated||
    valid-evaluated>60_000
  ){
    throw new Error("final_signing_review_time_invalid");
  }

  const expectedVerification={
    candidate_exact:true,
    candidate_still_unexpired:true,
    fresh_read_only_revalidation_exact:true,
    fresh_fee_packet_exact:true,
    fresh_live_state_still_matches_candidate:true,
    candidate_maximum_gas_cost_funded:true,
    prior_credential_binding_lineage_only:true,
    fresh_credential_binding_exact:true,
    fresh_credential_binding_after_revalidation:true,
    fresh_credential_binding_within_revalidation_window:true,
    fresh_binding_distinct_from_prior_binding:true,
    exact_unsigned_hash_bound:true,
    exact_transaction_fingerprint_bound:true,
    separate_signing_authorization_required:true,
  };
  exactKeys(
    review.verification,
    Object.keys(expectedVerification),
    "final_signing_review_verification",
  );
  for(const [key,value] of Object.entries(expectedVerification)){
    if(review.verification[key]!==value){
      throw new Error("final_signing_review_verification_mismatch:"+key);
    }
  }

  const expectedAuthority={
    review_artifact_only:true,
    rpc_call:false,
    credential_access:false,
    private_key_access:false,
    wallet_access:false,
    signer_object_exposed:false,
    deployer_funding:false,
    transaction_construction:false,
    transaction_signing_authorized:false,
    transaction_signing:false,
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
    review.authority,
    Object.keys(expectedAuthority),
    "final_signing_review_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(review.authority[key]!==value){
      throw new Error("final_signing_review_authority_mismatch:"+key);
    }
  }

  const material=structuredClone(review);
  const id=material.final_signing_review_id;
  delete material.final_signing_review_id;
  const expected="voiddrfsr1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expected){
    throw new Error("final_signing_review_id_mismatch");
  }
  return review;
}

export function validateVoidDatanetRegistryFinalSigningReviewEvidenceV1(
  review,
  evidence,
){
  validateVoidDatanetRegistryFinalSigningReviewV1(review);
  let rebuilt;
  try{
    rebuilt=buildVoidDatanetRegistryFinalSigningReviewV1({
      unsigned_transaction_candidate:evidence?.unsigned_transaction_candidate,
      candidate_evidence:evidence?.candidate_evidence,
      prior_credential_binding:evidence?.prior_credential_binding,
      candidate_revalidation_receipt:
        evidence?.candidate_revalidation_receipt,
      fresh_fee_funding_packet:evidence?.fresh_fee_funding_packet,
      fresh_credential_binding:evidence?.fresh_credential_binding,
      deployer_selection:evidence?.deployer_selection,
      evaluated_at_utc:review.evaluated_at_utc,
    });
  }catch(error){
    throw new Error(
      "final_signing_review_evidence_rebuild_failed:"+
      String(error?.message||error).slice(0,180),
    );
  }
  if(canonicalJson(rebuilt)!==canonicalJson(review)){
    throw new Error("final_signing_review_evidence_rebuild_mismatch");
  }
  return review;
}
