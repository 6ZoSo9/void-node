#!/usr/bin/env node
import crypto from "node:crypto";

import {
  PRIVATE_SUCCESSOR_RPC_V1,
} from "./void-datanet-registry-deployer-activation-bound-observer-v1.mjs";
import {
  buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
  validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
} from "./void-datanet-registry-unsigned-deployment-input-plan-v1.mjs";
import {
  buildVoidDatanetRegistryDeploymentFeeFundingPacketV1,
  observeVoidDatanetRegistryDeploymentFeeFundingV1,
} from "./void-datanet-registry-deployment-fee-funding-observer-v1.mjs";

export const VOID_DATANET_REGISTRY_DEPLOYMENT_PRE_SIGN_REVALIDATION_V1 =
  "VOID_DATANET_REGISTRY_DEPLOYMENT_PRE_SIGN_REVALIDATION_V1";
export const PRE_SIGN_VALIDITY_SECONDS_V1=120;

const SHA40=/^[0-9a-f]{40}$/u;
const FEE_PACKET_ID=/^voiddrff1_[0-9a-f]{64}$/u;
const PLAN_ID=/^voiddrudp1_[0-9a-f]{64}$/u;

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
function decimal(value){
  const raw=String(value??"");
  if(!/^(0|[1-9][0-9]{0,77})$/u.test(raw)) return null;
  try{return BigInt(raw);}catch{return null;}
}

export function validateVoidDatanetRegistryFeeFundingPrecisionEvidenceV1(
  input,
){
  const deploymentPlan=
    validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(
      input?.deployment_input_plan,
    );
  const result=input?.fee_funding_result;
  if(!result||typeof result!=="object"||Array.isArray(result)){
    throw new Error("pre_sign_fee_funding_result_invalid");
  }
  if(
    result.marker!=="VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_PRECISION_V1"||
    result.version!==1||
    result.status!=="READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN"||
    result.observed_on_host!=="zoso-Precision-Tower-7810"||
    !SHA40.test(String(result.observed_repo_head||""))||
    !Number.isFinite(Date.parse(String(result.observed_at_utc||"")))||
    !result.observer||
    !result.packet
  ){
    throw new Error("pre_sign_fee_funding_precision_contract_mismatch");
  }

  const expectedAuthority={
    rpc_call:true,
    filesystem_secret_read:false,
    credential_access:false,
    wallet_access:false,
    private_key_access:false,
    deployer_funding:false,
    signable_transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    deployment:false,
    chain2050_mutation:false,
    funds_movement:false,
    automatic_retry:false,
  };
  exactKeys(
    result.authority,
    Object.keys(expectedAuthority),
    "pre_sign_fee_funding_precision_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(result.authority[key]!==value){
      throw new Error("pre_sign_fee_funding_precision_authority_mismatch:"+key);
    }
  }

  const rebuilt=buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
    deployment_input_plan:deploymentPlan,
    observer_result:result.observer,
  });
  if(canonicalJson(rebuilt)!==canonicalJson(result.packet)){
    throw new Error("pre_sign_prior_fee_funding_packet_rebuild_mismatch");
  }
  if(
    !FEE_PACKET_ID.test(String(rebuilt.packet_id||""))||
    rebuilt.status!=="READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN"||
    rebuilt.deployment_input_plan_id!==deploymentPlan.plan_id||
    rebuilt.decision?.fee_caps_sufficient!==true||
    rebuilt.decision?.deployer_balance_sufficient!==true||
    rebuilt.decision?.minimum_additional_funding_wei!=="0"||
    rebuilt.decision?.signable_transaction_construction_authorized!==false||
    rebuilt.decision?.deployer_funding_authorized!==false||
    rebuilt.decision?.transaction_signing_authorized!==false||
    rebuilt.decision?.transaction_broadcast_authorized!==false||
    rebuilt.decision?.deployment_authorized!==false||
    rebuilt.decision?.chain2050_write_authorized!==false
  ){
    throw new Error("pre_sign_prior_fee_funding_packet_not_green");
  }

  return Object.freeze({
    deployment_plan:deploymentPlan,
    precision_result:result,
    prior_packet:rebuilt,
  });
}

function held(reason,prior,detail=undefined){
  return Object.freeze({
    ok:false,
    marker:VOID_DATANET_REGISTRY_DEPLOYMENT_PRE_SIGN_REVALIDATION_V1,
    version:1,
    status:"held",
    reason,
    deployment_input_plan_id:prior?.deployment_plan?.plan_id??null,
    prior_fee_funding_packet_id:prior?.prior_packet?.packet_id??null,
    fresh_fee_funding_packet_id:null,
    read_only_rpc_revalidation_complete:false,
    signable_transaction_materialized:false,
    signable_transaction_construction_authorized:false,
    credential_access_performed:false,
    wallet_access_performed:false,
    private_key_access_performed:false,
    deployer_funding_performed:false,
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

export async function runVoidDatanetRegistryDeploymentPreSignRevalidationV1(
  input,
){
  let prior;
  try{
    prior=validateVoidDatanetRegistryFeeFundingPrecisionEvidenceV1(input);
  }catch(error){
    return held("pre_sign_prior_fee_funding_evidence_invalid",null,{
      message:String(error?.message||error).slice(0,240),
    });
  }

  let rebuiltDeploymentPlan;
  try{
    rebuiltDeploymentPlan=buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1({
      activation_plan:input?.activation_plan,
      activation_receipt:input?.activation_receipt,
      resolution_packet:input?.resolution_packet,
      deployer_address:input?.deployer_address,
      publisher_address:input?.publisher_address,
      predecessor_address:input?.predecessor_address,
      compiled_identity:input?.compiled_identity,
    });
  }catch(error){
    return held("pre_sign_deployment_lineage_rebuild_failed",prior,{
      message:String(error?.message||error).slice(0,240),
    });
  }
  if(canonicalJson(rebuiltDeploymentPlan)!==canonicalJson(prior.deployment_plan)){
    return held("pre_sign_deployment_input_plan_rebuild_mismatch",prior);
  }

  const freshObserver=await observeVoidDatanetRegistryDeploymentFeeFundingV1({
    rpc_url:PRIVATE_SUCCESSOR_RPC_V1,
    activation_plan:input.activation_plan,
    activation_receipt:input.activation_receipt,
    resolution_packet:input.resolution_packet,
    deployment_input_plan:prior.deployment_plan,
    deployer_address:input.deployer_address,
    publisher_address:input.publisher_address,
    predecessor_address:input.predecessor_address,
    compiled_identity:input.compiled_identity,
    transport:input.transport,
  });
  if(freshObserver.ok!==true){
    return held("pre_sign_fresh_fee_funding_observation_held",prior,{
      observer_reason:String(freshObserver.reason||"unknown").slice(0,240),
      rpc_methods_used:freshObserver.rpc_methods_used||[],
    });
  }

  let freshPacket;
  try{
    freshPacket=buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
      deployment_input_plan:prior.deployment_plan,
      observer_result:freshObserver,
    });
  }catch(error){
    return held("pre_sign_fresh_fee_funding_packet_invalid",prior,{
      message:String(error?.message||error).slice(0,240),
    });
  }

  if(
    freshPacket.status!=="READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN"||
    freshPacket.decision?.fee_caps_sufficient!==true||
    freshPacket.decision?.deployer_balance_sufficient!==true||
    freshPacket.decision?.minimum_additional_funding_wei!=="0"
  ){
    return held("pre_sign_fresh_fee_or_funding_not_green",prior,{
      fresh_fee_funding_packet_id:freshPacket.packet_id,
    });
  }

  const oldObs=prior.prior_packet.observation;
  const freshObs=freshPacket.observation;
  const oldHead=decimal(oldObs.observation_block_number);
  const freshHead=decimal(freshObs.observation_block_number);
  if(
    oldHead===null||
    freshHead===null||
    freshHead<oldHead||
    freshObs.deployer_pending_nonce!==oldObs.deployer_pending_nonce||
    freshObs.predicted_registry_contract_address!==
      oldObs.predicted_registry_contract_address||
    freshObs.predicted_registry_address_vacant!==true||
    freshObs.creation_data_keccak256!==oldObs.creation_data_keccak256||
    freshObs.activation_height_continuity_verified!==true||
    freshObs.pending_nonce_revalidated!==true||
    freshObs.observation_block_hash_revalidated!==true
  ){
    return held("pre_sign_fresh_continuity_mismatch",prior,{
      fresh_fee_funding_packet_id:freshPacket.packet_id,
    });
  }

  const observedAt=String(input?.observed_at_utc||"");
  const observedMs=Date.parse(observedAt);
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(observedAt)||
    !Number.isFinite(observedMs)
  ){
    return held("pre_sign_observed_at_invalid",prior);
  }
  const validUntil=new Date(
    observedMs+PRE_SIGN_VALIDITY_SECONDS_V1*1000,
  ).toISOString();

  const material={
    marker:VOID_DATANET_REGISTRY_DEPLOYMENT_PRE_SIGN_REVALIDATION_V1,
    version:1,
    status:
      "FRESH_READ_ONLY_PRE_SIGN_REVALIDATION_GREEN_TRANSACTION_CONSTRUCTION_HOLD",
    observed_at_utc:observedAt,
    valid_until_utc:validUntil,
    freshness_seconds:PRE_SIGN_VALIDITY_SECONDS_V1,
    deployment_input_plan_id:prior.deployment_plan.plan_id,
    activation_plan_id:prior.deployment_plan.activation_lineage.activation_plan_id,
    activation_receipt_id:
      prior.deployment_plan.activation_lineage.activation_receipt_id,
    resolution_packet_id:
      prior.deployment_plan.resolution_lineage.resolution_packet_id,
    prior_fee_funding_packet_id:prior.prior_packet.packet_id,
    fresh_fee_funding_packet_id:freshPacket.packet_id,
    continuity:{
      fresh_observation_block_not_older:true,
      deployer_pending_nonce_stable:true,
      predicted_registry_address_stable:true,
      predicted_registry_address_vacant:true,
      creation_data_identity_stable:true,
      activation_height_continuity_verified:true,
      fresh_fee_caps_sufficient:true,
      fresh_deployer_balance_sufficient:true,
      minimum_additional_funding_wei:"0",
    },
    authority:{
      read_only_rpc_revalidation:true,
      filesystem_secret_read:false,
      credential_access:false,
      wallet_access:false,
      private_key_access:false,
      deployer_funding:false,
      signable_transaction_materialized:false,
      signable_transaction_construction:false,
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
    next_gate:
      "separate_explicit_source_gate_for_exact_signable_transaction_construction_bound_to_unexpired_pre_sign_receipt",
  };

  return Object.freeze({
    ok:true,
    ...material,
    pre_sign_revalidation_id:
      "voiddrpsr1_"+sha256(Buffer.from(canonicalJson(material))),
    fresh_fee_funding_packet:freshPacket,
    rpc_methods_used:freshObserver.rpc_methods_used,
    credential_access_performed:false,
    wallet_access_performed:false,
    private_key_access_performed:false,
    deployer_funding_performed:false,
    signable_transaction_constructed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_mutation_performed:false,
    funds_movement_performed:false,
    automatic_retry_allowed:false,
  });
}

export function validateVoidDatanetRegistryDeploymentPreSignRevalidationV1(
  receipt,
){
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt)){
    throw new Error("pre_sign_revalidation_invalid");
  }
  if(
    receipt.ok!==true||
    receipt.marker!==VOID_DATANET_REGISTRY_DEPLOYMENT_PRE_SIGN_REVALIDATION_V1||
    receipt.version!==1||
    receipt.status!==
      "FRESH_READ_ONLY_PRE_SIGN_REVALIDATION_GREEN_TRANSACTION_CONSTRUCTION_HOLD"||
    !PLAN_ID.test(String(receipt.deployment_input_plan_id||""))||
    !FEE_PACKET_ID.test(String(receipt.prior_fee_funding_packet_id||""))||
    !FEE_PACKET_ID.test(String(receipt.fresh_fee_funding_packet_id||""))||
    receipt.freshness_seconds!==PRE_SIGN_VALIDITY_SECONDS_V1||
    !Number.isFinite(Date.parse(String(receipt.observed_at_utc||"")))||
    !Number.isFinite(Date.parse(String(receipt.valid_until_utc||"")))||
    Date.parse(receipt.valid_until_utc)-Date.parse(receipt.observed_at_utc)!==
      PRE_SIGN_VALIDITY_SECONDS_V1*1000
  ){
    throw new Error("pre_sign_revalidation_contract_mismatch");
  }

  const expectedContinuity={
    fresh_observation_block_not_older:true,
    deployer_pending_nonce_stable:true,
    predicted_registry_address_stable:true,
    predicted_registry_address_vacant:true,
    creation_data_identity_stable:true,
    activation_height_continuity_verified:true,
    fresh_fee_caps_sufficient:true,
    fresh_deployer_balance_sufficient:true,
    minimum_additional_funding_wei:"0",
  };
  exactKeys(
    receipt.continuity,
    Object.keys(expectedContinuity),
    "pre_sign_continuity",
  );
  for(const [key,value] of Object.entries(expectedContinuity)){
    if(receipt.continuity[key]!==value){
      throw new Error("pre_sign_continuity_mismatch:"+key);
    }
  }

  const expectedAuthority={
    read_only_rpc_revalidation:true,
    filesystem_secret_read:false,
    credential_access:false,
    wallet_access:false,
    private_key_access:false,
    deployer_funding:false,
    signable_transaction_materialized:false,
    signable_transaction_construction:false,
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
    "pre_sign_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(receipt.authority[key]!==value){
      throw new Error("pre_sign_authority_mismatch:"+key);
    }
  }

  const material=structuredClone(receipt);
  const id=String(material.pre_sign_revalidation_id||"");
  for(const key of [
    "pre_sign_revalidation_id",
    "fresh_fee_funding_packet",
    "rpc_methods_used",
    "credential_access_performed",
    "wallet_access_performed",
    "private_key_access_performed",
    "deployer_funding_performed",
    "signable_transaction_constructed",
    "transaction_signing_performed",
    "transaction_submission_performed",
    "transaction_broadcast_performed",
    "deployment_performed",
    "chain2050_mutation_performed",
    "funds_movement_performed",
    "automatic_retry_allowed",
  ]){
    delete material[key];
  }
  const expected=
    "voiddrpsr1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expected||!/^voiddrpsr1_[0-9a-f]{64}$/u.test(id)){
    throw new Error("pre_sign_revalidation_id_mismatch");
  }
  if(
    receipt.credential_access_performed!==false||
    receipt.wallet_access_performed!==false||
    receipt.private_key_access_performed!==false||
    receipt.deployer_funding_performed!==false||
    receipt.signable_transaction_constructed!==false||
    receipt.transaction_signing_performed!==false||
    receipt.transaction_submission_performed!==false||
    receipt.transaction_broadcast_performed!==false||
    receipt.deployment_performed!==false||
    receipt.chain2050_mutation_performed!==false||
    receipt.funds_movement_performed!==false||
    receipt.automatic_retry_allowed!==false
  ){
    throw new Error("pre_sign_revalidation_execution_boundary_mismatch");
  }
  if(
    receipt.fresh_fee_funding_packet?.packet_id!==
      receipt.fresh_fee_funding_packet_id||
    receipt.fresh_fee_funding_packet?.status!==
      "READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN"
  ){
    throw new Error("pre_sign_fresh_packet_binding_mismatch");
  }
  return receipt;
}
