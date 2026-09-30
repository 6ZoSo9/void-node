#!/usr/bin/env node
import crypto from "node:crypto";

import {
  buildVoidDatanetRegistryDeploymentFeeFundingPacketV1,
  observeVoidDatanetRegistryDeploymentFeeFundingV1,
} from "./void-datanet-registry-deployment-fee-funding-observer-v1.mjs";
import {
  validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
} from "./void-datanet-registry-unsigned-deployment-input-plan-v1.mjs";

export const VOID_DATANET_REGISTRY_PRE_SIGN_REVALIDATION_V1 =
  "VOID_DATANET_REGISTRY_PRE_SIGN_REVALIDATION_V1";

const PACKET_ID=/^voiddrff1_[0-9a-f]{64}$/u;
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
  const observed=Object.keys(value).sort();
  const expected=[...keys].sort();
  if(JSON.stringify(observed)!==JSON.stringify(expected)){
    throw new Error(label+"_keys_invalid");
  }
}

export function validateVoidDatanetRegistryFeeFundingPacketForPreSignV1(
  packet,
  deploymentPlanInput,
){
  const deploymentPlan=
    validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(
      deploymentPlanInput,
    );
  if(!packet||typeof packet!=="object"||Array.isArray(packet)){
    throw new Error("pre_sign_fee_packet_invalid");
  }
  const material=structuredClone(packet);
  const id=String(material.packet_id||"");
  delete material.packet_id;
  const expected="voiddrff1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expected||!PACKET_ID.test(id)){
    throw new Error("pre_sign_fee_packet_id_mismatch");
  }
  if(
    packet.marker!=="VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_OBSERVER_V1"||
    packet.version!==1||
    packet.status!=="READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN"||
    packet.deployment_input_plan_id!==deploymentPlan.plan_id||
    packet.activation_plan_id!==deploymentPlan.activation_lineage.activation_plan_id||
    packet.activation_receipt_id!==deploymentPlan.activation_lineage.activation_receipt_id||
    packet.resolution_packet_id!==deploymentPlan.resolution_lineage.resolution_packet_id||
    packet.observation?.deployer_pending_nonce!==
      deploymentPlan.deployment_inputs.deployer_nonce||
    packet.observation?.predicted_registry_contract_address!==
      deploymentPlan.deployment_inputs.predicted_registry_contract_address||
    packet.observation?.creation_data_keccak256!==
      deploymentPlan.deployment_inputs.creation_data_keccak256||
    packet.observation?.fee_caps_sufficient_for_observation!==true||
    packet.observation?.deployer_funding_sufficient!==true||
    packet.decision?.gas_estimate_observed!==true||
    packet.decision?.gas_limit_120pct_derived!==true||
    packet.decision?.fee_caps_sufficient!==true||
    packet.decision?.deployer_balance_sufficient!==true||
    packet.decision?.minimum_additional_funding_wei!=="0"||
    packet.decision?.signable_transaction_construction_authorized!==false||
    packet.decision?.deployer_funding_authorized!==false||
    packet.decision?.transaction_signing_authorized!==false||
    packet.decision?.transaction_broadcast_authorized!==false||
    packet.decision?.deployment_authorized!==false||
    packet.decision?.chain2050_write_authorized!==false
  ){
    throw new Error("pre_sign_fee_packet_contract_mismatch");
  }

  const expectedAuthority={
    read_only_rpc:true,
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
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
    automatic_retry:false,
  };
  exactKeys(packet.authority,Object.keys(expectedAuthority),"pre_sign_fee_authority");
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(packet.authority[key]!==value){
      throw new Error("pre_sign_fee_authority_mismatch:"+key);
    }
  }
  return Object.freeze({deployment_plan:deploymentPlan,fee_packet:packet});
}

export async function runVoidDatanetRegistryPreSignRevalidationV1(input){
  const validated=validateVoidDatanetRegistryFeeFundingPacketForPreSignV1(
    input?.prior_fee_funding_packet,
    input?.deployment_input_plan,
  );
  const observedAt=String(input?.observed_at_utc||"");
  const observedMs=Date.parse(observedAt);
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(observedAt)||
    !Number.isFinite(observedMs)
  ){
    throw new Error("pre_sign_observed_at_invalid");
  }

  const observer=await observeVoidDatanetRegistryDeploymentFeeFundingV1({
    rpc_url:input?.rpc_url,
    activation_plan:input?.activation_plan,
    activation_receipt:input?.activation_receipt,
    resolution_packet:input?.resolution_packet,
    deployment_input_plan:validated.deployment_plan,
    deployer_address:input?.deployer_address,
    publisher_address:input?.publisher_address,
    predecessor_address:input?.predecessor_address,
    compiled_identity:input?.compiled_identity,
    transport:input?.transport,
  });
  if(
    observer.ok!==true||
    observer.status!=="read_only_fee_gas_funding_green"
  ){
    return Object.freeze({
      ok:false,
      marker:VOID_DATANET_REGISTRY_PRE_SIGN_REVALIDATION_V1,
      version:1,
      status:"FRESH_PRE_SIGN_REVALIDATION_HOLD",
      reason:"fresh_fee_gas_funding_observation_not_green",
      observer,
      signable_transaction_construction_authorized:false,
      transaction_signing_authorized:false,
      transaction_submission_authorized:false,
      transaction_broadcast_authorized:false,
      deployment_authorized:false,
      chain2050_write_authorized:false,
      funds_movement_authorized:false,
    });
  }

  const freshPacket=buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
    deployment_input_plan:validated.deployment_plan,
    observer_result:observer,
  });
  if(freshPacket.status!=="READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN"){
    throw new Error("pre_sign_fresh_fee_packet_not_green");
  }

  const priorHead=BigInt(
    validated.fee_packet.observation.observation_block_number,
  );
  const freshHead=BigInt(freshPacket.observation.observation_block_number);
  if(freshHead<priorHead){
    throw new Error("pre_sign_observation_head_regressed");
  }
  if(
    freshPacket.observation.deployer_pending_nonce!==
      validated.deployment_plan.deployment_inputs.deployer_nonce||
    freshPacket.observation.predicted_registry_contract_address!==
      validated.deployment_plan.deployment_inputs.predicted_registry_contract_address||
    freshPacket.observation.predicted_registry_address_vacant!==true||
    freshPacket.observation.creation_data_keccak256!==
      validated.deployment_plan.deployment_inputs.creation_data_keccak256
  ){
    throw new Error("pre_sign_identity_or_nonce_drift");
  }

  const validUntil=new Date(observedMs+5*60*1000).toISOString();
  const material={
    marker:VOID_DATANET_REGISTRY_PRE_SIGN_REVALIDATION_V1,
    version:1,
    status:"FRESH_PRE_SIGN_REVALIDATION_GREEN_SIGNABLE_PLAN_CONFIRMATION_REQUIRED",
    deployment_input_plan_id:validated.deployment_plan.plan_id,
    prior_fee_funding_packet_id:validated.fee_packet.packet_id,
    fresh_fee_funding_packet_id:freshPacket.packet_id,
    observed_at_utc:observedAt,
    valid_until_utc:validUntil,
    observation:{
      block_number:freshPacket.observation.observation_block_number,
      block_hash:freshPacket.observation.observation_block_hash,
      deployer_pending_nonce:
        freshPacket.observation.deployer_pending_nonce,
      deployer_balance_wei:
        freshPacket.observation.deployer_balance_wei,
      predicted_registry_contract_address:
        freshPacket.observation.predicted_registry_contract_address,
      predicted_registry_address_vacant:true,
      deployment_gas_estimate:
        freshPacket.observation.deployment_gas_estimate,
      proposed_gas_limit:
        freshPacket.observation.proposed_gas_limit,
      max_fee_per_gas_wei:
        freshPacket.observation.max_fee_per_gas_wei,
      max_priority_fee_per_gas_wei:
        freshPacket.observation.max_priority_fee_per_gas_wei,
      maximum_deployment_gas_cost_wei:
        freshPacket.observation.maximum_deployment_gas_cost_wei,
      creation_data_keccak256:
        freshPacket.observation.creation_data_keccak256,
      deployer_funding_sufficient:true,
      minimum_additional_funding_wei:"0",
    },
    verification:{
      prior_fee_funding_green:true,
      fresh_fee_funding_green:true,
      observation_head_not_regressed:true,
      pending_nonce_exact:true,
      predicted_create_address_exact:true,
      predicted_create_address_vacant:true,
      creation_data_keccak_exact:true,
      fee_caps_sufficient:true,
      deployer_balance_sufficient:true,
      five_minute_validity_window:true,
    },
    authority:{
      read_only_rpc:true,
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
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
      automatic_retry:false,
    },
    signable_transaction_construction_authorized:false,
    required_next_confirmation:
      "constructDatanetRegistryDeploymentTransactionV1",
    next_gate:
      "separate_source_only_signable_transaction_construction_bound_to_fresh_revalidation",
  };
  return Object.freeze({
    ok:true,
    ...material,
    revalidation_id:
      "voiddrpsr1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistryPreSignRevalidationV1(receipt){
  if(
    !receipt||
    typeof receipt!=="object"||
    Array.isArray(receipt)||
    receipt.ok!==true||
    receipt.marker!==VOID_DATANET_REGISTRY_PRE_SIGN_REVALIDATION_V1||
    receipt.version!==1||
    receipt.status!==
      "FRESH_PRE_SIGN_REVALIDATION_GREEN_SIGNABLE_PLAN_CONFIRMATION_REQUIRED"||
    !/^voiddrpsr1_[0-9a-f]{64}$/u.test(String(receipt.revalidation_id||""))
  ){
    throw new Error("pre_sign_revalidation_invalid");
  }
  const material=structuredClone(receipt);
  delete material.ok;
  const id=material.revalidation_id;
  delete material.revalidation_id;
  const expected=
    "voiddrpsr1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expected){
    throw new Error("pre_sign_revalidation_id_mismatch");
  }

  const observedMs=Date.parse(receipt.observed_at_utc);
  const validMs=Date.parse(receipt.valid_until_utc);
  const gasLimit=BigInt(String(receipt.observation?.proposed_gas_limit??"-1"));
  const maxFee=BigInt(String(receipt.observation?.max_fee_per_gas_wei??"-1"));
  const maximumCost=BigInt(
    String(receipt.observation?.maximum_deployment_gas_cost_wei??"-1"),
  );

  const expectedVerification={
    prior_fee_funding_green:true,
    fresh_fee_funding_green:true,
    observation_head_not_regressed:true,
    pending_nonce_exact:true,
    predicted_create_address_exact:true,
    predicted_create_address_vacant:true,
    creation_data_keccak_exact:true,
    fee_caps_sufficient:true,
    deployer_balance_sufficient:true,
    five_minute_validity_window:true,
  };
  exactKeys(
    receipt.verification,
    Object.keys(expectedVerification),
    "pre_sign_revalidation_verification",
  );
  for(const [key,value] of Object.entries(expectedVerification)){
    if(receipt.verification[key]!==value){
      throw new Error("pre_sign_revalidation_verification_mismatch:"+key);
    }
  }

  const expectedAuthority={
    read_only_rpc:true,
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
    "pre_sign_revalidation_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(receipt.authority[key]!==value){
      throw new Error("pre_sign_revalidation_authority_mismatch:"+key);
    }
  }

  if(
    !Number.isFinite(observedMs)||
    !Number.isFinite(validMs)||
    validMs-observedMs!==5*60*1000||
    !/^voiddrudp1_[0-9a-f]{64}$/u.test(
      String(receipt.deployment_input_plan_id||""),
    )||
    !/^voiddrff1_[0-9a-f]{64}$/u.test(
      String(receipt.prior_fee_funding_packet_id||""),
    )||
    !/^voiddrff1_[0-9a-f]{64}$/u.test(
      String(receipt.fresh_fee_funding_packet_id||""),
    )||
    !/^(0|[1-9][0-9]*)$/u.test(
      String(receipt.observation?.block_number??""),
    )||
    !/^0x[0-9a-f]{64}$/u.test(
      String(receipt.observation?.block_hash??""),
    )||
    !/^(0|[1-9][0-9]*)$/u.test(
      String(receipt.observation?.deployer_pending_nonce??""),
    )||
    !/^0x[0-9a-f]{40}$/u.test(
      String(receipt.observation?.predicted_registry_contract_address??""),
    )||
    !/^0x[0-9a-f]{64}$/u.test(
      String(receipt.observation?.creation_data_keccak256??""),
    )||
    receipt.observation?.max_fee_per_gas_wei!=="3000000000"||
    receipt.observation?.max_priority_fee_per_gas_wei!=="1000000000"||
    gasLimit<=0n||
    maxFee!==3000000000n||
    maximumCost!==gasLimit*maxFee||
    receipt.observation?.deployer_funding_sufficient!==true||
    receipt.observation?.minimum_additional_funding_wei!=="0"||
    receipt.signable_transaction_construction_authorized!==false||
    receipt.required_next_confirmation!==
      "constructDatanetRegistryDeploymentTransactionV1"
  ){
    throw new Error("pre_sign_revalidation_contract_mismatch");
  }
  return receipt;
}
