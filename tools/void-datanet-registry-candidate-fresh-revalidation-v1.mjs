#!/usr/bin/env node
import crypto from "node:crypto";

import {
  PRIVATE_SUCCESSOR_RPC_V1,
} from "./void-datanet-registry-deployer-activation-bound-observer-v1.mjs";
import {
  buildVoidDatanetRegistryDeploymentFeeFundingPacketV1,
  observeVoidDatanetRegistryDeploymentFeeFundingV1,
} from "./void-datanet-registry-deployment-fee-funding-observer-v1.mjs";
import {
  validateVoidDatanetRegistryDeployerCredentialBindingV1,
} from "./void-datanet-registry-deployer-credential-binding-v1.mjs";
import {
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1,
} from "./void-datanet-registry-unsigned-transaction-candidate-v1.mjs";

export const VOID_DATANET_REGISTRY_CANDIDATE_FRESH_REVALIDATION_V1 =
  "VOID_DATANET_REGISTRY_CANDIDATE_FRESH_REVALIDATION_V1";
export const CANDIDATE_REVALIDATION_MAX_VALIDITY_SECONDS_V1=60;
export const CANDIDATE_REVALIDATION_MIN_REMAINING_SECONDS_V1=30;

const HASH=/^0x[0-9a-f]{64}$/u;
const CANDIDATE_ID=/^voiddrtxc1_[0-9a-f]{64}$/u;
const BINDING_ID=/^voiddrcb1_[0-9a-f]{64}$/u;
const FEE_PACKET_ID=/^voiddrff1_[0-9a-f]{64}$/u;
const RECEIPT_ID=/^voiddrcfr1_[0-9a-f]{64}$/u;

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
function held(reason,detail=undefined){
  return Object.freeze({
    ok:false,
    marker:VOID_DATANET_REGISTRY_CANDIDATE_FRESH_REVALIDATION_V1,
    version:1,
    status:"held",
    reason,
    read_only_rpc_revalidation_complete:false,
    credential_access_performed:false,
    private_key_access_performed:false,
    wallet_access_performed:false,
    deployer_funding_performed:false,
    transaction_construction_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_mutation_performed:false,
    funds_movement_performed:false,
    automatic_retry_allowed:false,
    ...(detail===undefined?{}:{detail}),
  });
}

export function validateVoidDatanetRegistryPriorCredentialBindingForCandidateV1(
  input,
){
  const candidate=validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
    input?.unsigned_transaction_candidate,
    input?.candidate_evidence,
  );
  const binding=validateVoidDatanetRegistryDeployerCredentialBindingV1(
    input?.prior_credential_binding,
    {
      deployer_selection:input?.deployer_selection,
      unsigned_transaction_candidate:candidate,
      candidate_evidence:input?.candidate_evidence,
    },
  );
  if(
    !CANDIDATE_ID.test(String(candidate.candidate_id||""))||
    !BINDING_ID.test(String(binding.credential_binding_id||""))||
    binding.candidate_id!==candidate.candidate_id||
    binding.unsigned_transaction_hash!==
      candidate.transaction.unsigned_transaction_hash||
    binding.transaction_fingerprint_sha256!==
      candidate.transaction_fingerprint_sha256||
    binding.deployer_address!==candidate.transaction.from_address||
    binding.signing_authorized!==false||
    binding.binding?.rebind_immediately_before_signing_required!==true||
    binding.authority?.transaction_signing_authorized!==false||
    binding.authority?.transaction_signing_performed!==false||
    binding.authority?.transaction_submission_authorized!==false||
    binding.authority?.transaction_broadcast_authorized!==false||
    binding.authority?.chain2050_write_authorized!==false||
    binding.authority?.funds_movement!==false
  ){
    throw new Error("candidate_revalidation_prior_binding_contract_mismatch");
  }
  return Object.freeze({candidate,binding});
}

export async function runVoidDatanetRegistryCandidateFreshRevalidationV1(input){
  let prior;
  try{
    prior=validateVoidDatanetRegistryPriorCredentialBindingForCandidateV1(input);
  }catch(error){
    return held("candidate_revalidation_prior_candidate_or_binding_invalid",{
      message:String(error?.message||error).slice(0,240),
    });
  }

  const candidate=prior.candidate;
  const candidateEvidence=input?.candidate_evidence;
  const deploymentPlan=candidateEvidence?.deployment_input_plan;
  const priorPreSign=candidateEvidence?.pre_sign_revalidation_receipt;
  if(!deploymentPlan||!priorPreSign){
    return held("candidate_revalidation_candidate_evidence_missing");
  }

  const observedAt=String(input?.observed_at_utc||"");
  const observedMs=Date.parse(observedAt);
  const candidateExpiryMs=Date.parse(String(candidate.valid_until_utc||""));
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(observedAt)||
    !Number.isFinite(observedMs)||
    !Number.isFinite(candidateExpiryMs)||
    observedMs>Date.now()+365*24*60*60*1000
  ){
    return held("candidate_revalidation_time_invalid");
  }
  if(candidateExpiryMs-observedMs<
    CANDIDATE_REVALIDATION_MIN_REMAINING_SECONDS_V1*1000){
    return held("candidate_revalidation_candidate_too_close_to_expiry");
  }

  const freshObserver=await observeVoidDatanetRegistryDeploymentFeeFundingV1({
    rpc_url:PRIVATE_SUCCESSOR_RPC_V1,
    activation_plan:input?.activation_plan,
    activation_receipt:input?.activation_receipt,
    resolution_packet:input?.resolution_packet,
    deployment_input_plan:deploymentPlan,
    deployer_address:input?.deployer_address,
    publisher_address:input?.publisher_address,
    predecessor_address:input?.predecessor_address,
    compiled_identity:input?.compiled_identity,
    transport:input?.transport,
  });
  if(freshObserver.ok!==true){
    return held("candidate_revalidation_fresh_observation_held",{
      observer_reason:String(freshObserver.reason||"unknown").slice(0,240),
      rpc_methods_used:freshObserver.rpc_methods_used||[],
    });
  }

  let freshPacket;
  try{
    freshPacket=buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
      deployment_input_plan:deploymentPlan,
      observer_result:freshObserver,
    });
  }catch(error){
    return held("candidate_revalidation_fresh_packet_invalid",{
      message:String(error?.message||error).slice(0,240),
    });
  }
  if(
    freshPacket.status!=="READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN"||
    freshPacket.decision?.fee_caps_sufficient!==true||
    freshPacket.decision?.deployer_balance_sufficient!==true||
    freshPacket.decision?.minimum_additional_funding_wei!=="0"
  ){
    return held("candidate_revalidation_fresh_fee_or_funding_not_green",{
      fresh_fee_funding_packet_id:freshPacket.packet_id,
    });
  }

  const tx=candidate.transaction;
  const obs=freshPacket.observation;
  let candidateNonce;
  let candidateGas;
  let candidateMaxFee;
  let candidatePriority;
  let freshGas;
  let freshBalance;
  let oldHead;
  let freshHead;
  try{
    candidateNonce=decimal(tx.nonce,"candidate_nonce");
    candidateGas=decimal(tx.gas_limit,"candidate_gas_limit");
    candidateMaxFee=decimal(tx.max_fee_per_gas_wei,"candidate_max_fee");
    candidatePriority=decimal(
      tx.max_priority_fee_per_gas_wei,
      "candidate_max_priority",
    );
    freshGas=decimal(obs.proposed_gas_limit,"fresh_proposed_gas_limit");
    freshBalance=decimal(obs.deployer_balance_wei,"fresh_deployer_balance");
    oldHead=decimal(
      priorPreSign.fresh_observation_block_number,
      "prior_pre_sign_block",
    );
    freshHead=decimal(obs.observation_block_number,"fresh_observation_block");
  }catch(error){
    return held("candidate_revalidation_numeric_input_invalid",{
      message:String(error?.message||error).slice(0,200),
    });
  }

  const candidateMaxCost=candidateGas*candidateMaxFee;
  if(
    freshHead<oldHead||
    obs.deployer_pending_nonce!==candidateNonce.toString(10)||
    obs.predicted_registry_contract_address!==
      tx.predicted_contract_address||
    obs.predicted_registry_address_vacant!==true||
    obs.creation_data_keccak256!==tx.data_keccak256||
    obs.activation_height_continuity_verified!==true||
    obs.pending_nonce_revalidated!==true||
    obs.observation_block_hash_revalidated!==true||
    candidateGas<freshGas||
    candidateMaxFee!==decimal(
      obs.max_fee_per_gas_wei,
      "fresh_max_fee_per_gas",
    )||
    candidatePriority!==decimal(
      obs.max_priority_fee_per_gas_wei,
      "fresh_max_priority_fee_per_gas",
    )||
    freshBalance<candidateMaxCost
  ){
    return held("candidate_revalidation_live_candidate_mismatch",{
      fresh_fee_funding_packet_id:freshPacket.packet_id,
    });
  }

  const validUntilMs=Math.min(
    candidateExpiryMs,
    observedMs+CANDIDATE_REVALIDATION_MAX_VALIDITY_SECONDS_V1*1000,
  );
  const material={
    marker:VOID_DATANET_REGISTRY_CANDIDATE_FRESH_REVALIDATION_V1,
    version:1,
    status:"FRESH_CANDIDATE_STATE_GREEN_CREDENTIAL_REBIND_REQUIRED",
    observed_at_utc:observedAt,
    valid_until_utc:new Date(validUntilMs).toISOString(),
    maximum_validity_seconds:CANDIDATE_REVALIDATION_MAX_VALIDITY_SECONDS_V1,
    candidate_id:candidate.candidate_id,
    unsigned_transaction_hash:tx.unsigned_transaction_hash,
    transaction_fingerprint_sha256:
      candidate.transaction_fingerprint_sha256,
    prior_credential_binding_id:prior.binding.credential_binding_id,
    deployment_input_plan_id:candidate.deployment_input_plan_id,
    fresh_fee_funding_packet_id:freshPacket.packet_id,
    fresh_observation_block_number:obs.observation_block_number,
    fresh_observation_block_hash:obs.observation_block_hash,
    continuity:{
      fresh_observation_not_older_than_candidate_pre_sign:true,
      deployer_pending_nonce_exact:true,
      predicted_contract_address_exact:true,
      predicted_contract_address_vacant:true,
      creation_data_identity_exact:true,
      activation_height_continuity_verified:true,
      candidate_gas_limit_still_sufficient:true,
      candidate_fee_caps_exact:true,
      deployer_balance_covers_candidate_maximum_gas_cost:true,
      candidate_maximum_gas_cost_wei:candidateMaxCost.toString(10),
      prior_credential_binding_lineage_only:true,
      fresh_credential_rebinding_required:true,
    },
    authority:{
      read_only_rpc_revalidation:true,
      prior_credential_binding_lineage_read:true,
      credential_access:false,
      private_key_access:false,
      wallet_access:false,
      deployer_funding:false,
      transaction_construction:false,
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
      "fresh_nimo_deployer_credential_identity_rebinding_then_separate_single_transaction_signing_authorization",
  };
  const receipt=Object.freeze({
    ...material,
    candidate_revalidation_id:
      "voiddrcfr1_"+sha256(Buffer.from(canonicalJson(material))),
    rpc_methods_used:[...freshObserver.rpc_methods_used],
    credential_access_performed:false,
    private_key_access_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    chain2050_mutation_performed:false,
    funds_movement_performed:false,
  });
  return Object.freeze({
    ok:true,
    receipt,
    fresh_fee_funding_packet:freshPacket,
  });
}

export function validateVoidDatanetRegistryCandidateFreshRevalidationV1(
  receipt,
){
  if(
    !receipt||
    typeof receipt!=="object"||
    Array.isArray(receipt)||
    receipt.marker!==VOID_DATANET_REGISTRY_CANDIDATE_FRESH_REVALIDATION_V1||
    receipt.version!==1||
    receipt.status!=="FRESH_CANDIDATE_STATE_GREEN_CREDENTIAL_REBIND_REQUIRED"||
    !RECEIPT_ID.test(String(receipt.candidate_revalidation_id||""))||
    !CANDIDATE_ID.test(String(receipt.candidate_id||""))||
    !BINDING_ID.test(String(receipt.prior_credential_binding_id||""))||
    !FEE_PACKET_ID.test(String(receipt.fresh_fee_funding_packet_id||""))||
    !HASH.test(String(receipt.unsigned_transaction_hash||""))||
    receipt.signing_authorized!==false||
    receipt.maximum_validity_seconds!==
      CANDIDATE_REVALIDATION_MAX_VALIDITY_SECONDS_V1||
    receipt.next_gate!==
      "fresh_nimo_deployer_credential_identity_rebinding_then_separate_single_transaction_signing_authorization"
  ){
    throw new Error("candidate_fresh_revalidation_contract_invalid");
  }

  const observed=Date.parse(String(receipt.observed_at_utc||""));
  const valid=Date.parse(String(receipt.valid_until_utc||""));
  if(
    !Number.isFinite(observed)||
    !Number.isFinite(valid)||
    valid<=observed||
    valid-observed>
      CANDIDATE_REVALIDATION_MAX_VALIDITY_SECONDS_V1*1000
  ){
    throw new Error("candidate_fresh_revalidation_time_invalid");
  }

  const expectedContinuity={
    fresh_observation_not_older_than_candidate_pre_sign:true,
    deployer_pending_nonce_exact:true,
    predicted_contract_address_exact:true,
    predicted_contract_address_vacant:true,
    creation_data_identity_exact:true,
    activation_height_continuity_verified:true,
    candidate_gas_limit_still_sufficient:true,
    candidate_fee_caps_exact:true,
    deployer_balance_covers_candidate_maximum_gas_cost:true,
    candidate_maximum_gas_cost_wei:
      String(receipt.continuity?.candidate_maximum_gas_cost_wei||""),
    prior_credential_binding_lineage_only:true,
    fresh_credential_rebinding_required:true,
  };
  if(
    !/^[1-9][0-9]{0,77}$/u.test(
      expectedContinuity.candidate_maximum_gas_cost_wei,
    )
  ){
    throw new Error("candidate_fresh_revalidation_cost_invalid");
  }
  exactKeys(
    receipt.continuity,
    Object.keys(expectedContinuity),
    "candidate_fresh_revalidation_continuity",
  );
  for(const [key,value] of Object.entries(expectedContinuity)){
    if(receipt.continuity[key]!==value){
      throw new Error("candidate_fresh_revalidation_continuity_mismatch:"+key);
    }
  }

  const expectedAuthority={
    read_only_rpc_revalidation:true,
    prior_credential_binding_lineage_read:true,
    credential_access:false,
    private_key_access:false,
    wallet_access:false,
    deployer_funding:false,
    transaction_construction:false,
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
    receipt.authority,
    Object.keys(expectedAuthority),
    "candidate_fresh_revalidation_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(receipt.authority[key]!==value){
      throw new Error("candidate_fresh_revalidation_authority_mismatch:"+key);
    }
  }

  const expectedMethods=[
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getTransactionCount",
    "eth_getBalance",
    "eth_getTransactionCount",
    "eth_getCode",
    "eth_estimateGas",
    "eth_maxPriorityFeePerGas",
    "eth_getTransactionCount",
    "eth_getBlockByNumber",
  ];
  if(JSON.stringify(receipt.rpc_methods_used)!==JSON.stringify(expectedMethods)){
    throw new Error("candidate_fresh_revalidation_rpc_methods_mismatch");
  }
  if(
    receipt.credential_access_performed!==false||
    receipt.private_key_access_performed!==false||
    receipt.transaction_signing_performed!==false||
    receipt.transaction_submission_performed!==false||
    receipt.transaction_broadcast_performed!==false||
    receipt.chain2050_mutation_performed!==false||
    receipt.funds_movement_performed!==false
  ){
    throw new Error("candidate_fresh_revalidation_execution_boundary_mismatch");
  }

  const material=structuredClone(receipt);
  const id=material.candidate_revalidation_id;
  for(const key of [
    "candidate_revalidation_id",
    "rpc_methods_used",
    "credential_access_performed",
    "private_key_access_performed",
    "transaction_signing_performed",
    "transaction_submission_performed",
    "transaction_broadcast_performed",
    "chain2050_mutation_performed",
    "funds_movement_performed",
  ]){
    delete material[key];
  }
  const expectedId=
    "voiddrcfr1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expectedId){
    throw new Error("candidate_fresh_revalidation_id_mismatch");
  }
  return receipt;
}
