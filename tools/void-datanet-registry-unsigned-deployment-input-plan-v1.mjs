#!/usr/bin/env node
import crypto from "node:crypto";
import {getCreateAddress,keccak256} from "ethers";

import {
  buildDatanetContentCommitmentDeploymentDataV1,
} from "./datanet-content-commitment-deployment-attestation-v1.mjs";
import {
  buildVoidDatanetActivationBoundResolutionPacketV1,
} from "./void-datanet-registry-deployer-activation-bound-observer-v1.mjs";

export const VOID_DATANET_REGISTRY_UNSIGNED_DEPLOYMENT_INPUT_PLAN_V1 =
  "VOID_DATANET_REGISTRY_UNSIGNED_DEPLOYMENT_INPUT_PLAN_V1";

const SHA256=/^[0-9a-f]{64}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const ZERO="0x0000000000000000000000000000000000000000";

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
function decimal(value){
  const raw=String(value??"");
  if(!/^(0|[1-9][0-9]{0,77})$/u.test(raw)) return null;
  try{return BigInt(raw);}catch{return null;}
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

export function validateVoidDatanetActivationBoundResolutionEvidenceV1(input){
  const packet=input?.resolution_packet;
  if(!packet||typeof packet!=="object"||Array.isArray(packet)){
    throw new Error("activation_bound_resolution_packet_invalid");
  }

  const rebuilt=buildVoidDatanetActivationBoundResolutionPacketV1({
    activation_plan:input?.activation_plan,
    activation_receipt:input?.activation_receipt,
    deployer_address:input?.deployer_address,
    publisher_address:input?.publisher_address,
    predecessor_address:input?.predecessor_address,
    compiled_identity:input?.compiled_identity,
    observer_result:packet.observer,
  });

  const packetBase=structuredClone(packet);
  for(const key of [
    "observed_at_utc",
    "observed_on_host",
    "observed_repo_head",
    "activation_plan_file_sha256",
    "activation_receipt_file_sha256",
  ]){
    delete packetBase[key];
  }
  if(canonicalJson(packetBase)!==canonicalJson(rebuilt)){
    throw new Error("activation_bound_resolution_packet_rebuild_mismatch");
  }

  if(
    packet.status!=="PRIVATE_SUCCESSOR_READ_ONLY_DEPLOYER_RESOLUTION_GREEN"||
    packet.decision!==
      "GREEN_READY_TO_BIND_EXACT_READ_ONLY_DEPLOYER_RESOLUTION_EVIDENCE"||
    packet.activation_height_continuity_verified!==true||
    packet.observer?.ready_for_source_evidence_binding!==true||
    packet.observer?.observation?.pending_transactions_present!==false||
    packet.observer?.observation?.predicted_registry_address_vacant!==true||
    packet.observer?.observation?.predicted_registry_address_nonce!=="0"||
    packet.observer?.observation?.predicted_registry_address_code!=="0x"||
    packet.observer?.observation?.exact_creation_data_bound!==true||
    packet.observer?.mutation_performed!==false||
    packet.observer?.credential_access_performed!==false||
    packet.observer?.wallet_access_performed!==false||
    packet.observer?.private_key_access_performed!==false||
    packet.observer?.transaction_construction_performed!==false||
    packet.observer?.transaction_signing_performed!==false||
    packet.observer?.transaction_submission_performed!==false||
    packet.observer?.transaction_broadcast_performed!==false||
    packet.observer?.deployment_performed!==false||
    packet.observer?.chain2050_mutation_performed!==false||
    packet.observer?.deployer_funding_performed!==false||
    packet.observer?.funds_action_performed!==false
  ){
    throw new Error("activation_bound_resolution_packet_contract_mismatch");
  }
  return packet;
}

export function buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1(input){
  const packet=validateVoidDatanetActivationBoundResolutionEvidenceV1(input);
  const observation=packet.observer.observation;

  const nonce=decimal(observation.pending_nonce);
  const latest=decimal(observation.latest_nonce);
  const balance=decimal(observation.deployer_balance_wei);
  if(
    nonce===null||
    latest===null||
    balance===null||
    nonce!==latest
  ){
    throw new Error("unsigned_deployment_input_nonce_or_balance_invalid");
  }

  const deployer=String(observation.deployer_address||"").toLowerCase();
  const publisher=String(observation.publisher_address||"").toLowerCase();
  const predecessor=String(observation.predecessor_address||"").toLowerCase();
  const predicted=String(
    observation.predicted_registry_contract_address||"",
  ).toLowerCase();

  if(
    !ADDRESS.test(deployer)||
    !ADDRESS.test(publisher)||
    predecessor!==ZERO||
    !ADDRESS.test(predicted)
  ){
    throw new Error("unsigned_deployment_input_address_invalid");
  }

  const derived=getCreateAddress({from:deployer,nonce}).toLowerCase();
  if(derived!==predicted){
    throw new Error("unsigned_deployment_predicted_address_mismatch");
  }

  const deploymentData=buildDatanetContentCommitmentDeploymentDataV1({
    compiled_identity:input.compiled_identity,
    publisher_address:publisher,
    predecessor_address:predecessor,
  });
  if(
    deploymentData.deployment_data_keccak256!==
      observation.constructor_deployment_data_keccak256
  ){
    throw new Error("unsigned_deployment_creation_data_mismatch");
  }

  const observationBlock=decimal(observation.observation_block_number);
  if(
    observationBlock===null||
    observationBlock<=0n||
    !HASH.test(String(observation.observation_block_hash||""))
  ){
    throw new Error("unsigned_deployment_observation_block_invalid");
  }

  const material={
    marker:VOID_DATANET_REGISTRY_UNSIGNED_DEPLOYMENT_INPUT_PLAN_V1,
    version:1,
    status:"UNSIGNED_DEPLOYMENT_INPUT_PLAN_READY_FEE_GAS_FUNDING_HOLD",
    chain_id:"2050",
    execution_epoch:2,
    compiled_identity:{
      identity_id:String(input.compiled_identity?.identity_id||""),
      contract_path:String(input.compiled_identity?.source?.contract_path||""),
      contract_name:String(input.compiled_identity?.source?.contract_name||""),
      contract_source_sha256:
        String(input.compiled_identity?.source?.contract_source_sha256||""),
      creation_bytecode_sha256:
        String(input.compiled_identity?.artifacts?.creation_bytecode_sha256||""),
    },
    activation_lineage:{
      activation_plan_id:packet.activation_plan_id,
      activation_receipt_id:packet.activation_receipt_id,
      activation_block_floor:packet.activation_block_floor,
      activation_height_continuity_verified:true,
    },
    resolution_lineage:{
      resolution_packet_id:packet.packet_id,
      observation_block_number:observation.observation_block_number,
      observation_block_hash:observation.observation_block_hash,
      rpc_url_fingerprint_sha256:packet.rpc_url_fingerprint_sha256,
      pending_nonce_revalidated:
        observation.pending_nonce_revalidated===true,
      observation_block_hash_revalidated:
        observation.observation_block_hash_revalidated===true,
    },
    deployment_inputs:{
      deployer_address:deployer,
      publisher_address:publisher,
      predecessor_address:predecessor,
      deployer_nonce:nonce.toString(10),
      deployer_balance_wei:balance.toString(10),
      predicted_registry_contract_address:predicted,
      predicted_registry_address_vacant:true,
      creation_data:deploymentData.deployment_data,
      creation_data_keccak256:deploymentData.deployment_data_keccak256,
      constructor_arguments:deploymentData.constructor_arguments,
      deployment_value_wei:"0",
    },
    unresolved:{
      gas_limit:null,
      gas_estimate_observed:false,
      max_fee_per_gas_wei:null,
      max_priority_fee_per_gas_wei:null,
      fee_envelope_observed:false,
      required_native_balance_wei:null,
      deployer_funding_sufficient:null,
      signable_transaction_materialized:false,
      exact_unsigned_transaction_hash:null,
    },
    authority:{
      source_plan_only:true,
      rpc_call:false,
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
    next_gate:
      "fresh_read_only_gas_estimate_fee_and_funding_envelope_resolution_before_signable_transaction_construction",
  };

  return Object.freeze({
    ...material,
    plan_id:
      "voiddrudp1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(plan){
  if(
    !plan||
    typeof plan!=="object"||
    Array.isArray(plan)||
    plan.marker!==VOID_DATANET_REGISTRY_UNSIGNED_DEPLOYMENT_INPUT_PLAN_V1||
    plan.version!==1||
    plan.status!=="UNSIGNED_DEPLOYMENT_INPUT_PLAN_READY_FEE_GAS_FUNDING_HOLD"||
    !/^voiddrudp1_[0-9a-f]{64}$/u.test(String(plan.plan_id||""))
  ){
    throw new Error("unsigned_deployment_input_plan_invalid");
  }
  const material=structuredClone(plan);
  const id=material.plan_id;
  delete material.plan_id;
  const expected=
    "voiddrudp1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expected){
    throw new Error("unsigned_deployment_input_plan_id_mismatch");
  }
  const deployer=String(plan.deployment_inputs?.deployer_address||"").toLowerCase();
  const publisher=String(plan.deployment_inputs?.publisher_address||"").toLowerCase();
  const predecessor=String(plan.deployment_inputs?.predecessor_address||"").toLowerCase();
  const predicted=String(
    plan.deployment_inputs?.predicted_registry_contract_address||"",
  ).toLowerCase();
  const nonce=decimal(plan.deployment_inputs?.deployer_nonce);
  const balance=decimal(plan.deployment_inputs?.deployer_balance_wei);
  const creationData=String(plan.deployment_inputs?.creation_data||"").toLowerCase();
  let derived="";
  try{
    if(nonce!==null&&ADDRESS.test(deployer)){
      derived=getCreateAddress({from:deployer,nonce}).toLowerCase();
    }
  }catch{
    derived="";
  }

  const expectedAuthority={
    source_plan_only:true,
    rpc_call:false,
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
  exactKeys(plan.authority,Object.keys(expectedAuthority),"unsigned_deployment_authority");
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(plan.authority[key]!==value){
      throw new Error("unsigned_deployment_authority_mismatch:"+key);
    }
  }

  const expectedUnresolved={
    gas_limit:null,
    gas_estimate_observed:false,
    max_fee_per_gas_wei:null,
    max_priority_fee_per_gas_wei:null,
    fee_envelope_observed:false,
    required_native_balance_wei:null,
    deployer_funding_sufficient:null,
    signable_transaction_materialized:false,
    exact_unsigned_transaction_hash:null,
  };
  exactKeys(plan.unresolved,Object.keys(expectedUnresolved),"unsigned_deployment_unresolved");
  for(const [key,value] of Object.entries(expectedUnresolved)){
    if(plan.unresolved[key]!==value){
      throw new Error("unsigned_deployment_unresolved_mismatch:"+key);
    }
  }

  if(
    plan.chain_id!=="2050"||
    plan.execution_epoch!==2||
    plan.compiled_identity?.identity_id!=="voiddccci1_81d496b90721265d126a12e331432c10ca5403cc650fe634adce92b15c6afed6"||
    plan.compiled_identity?.contract_path!=="contracts/mainnet/DatanetContentCommitmentRegistryV1.sol"||
    plan.compiled_identity?.contract_name!=="DatanetContentCommitmentRegistryV1"||
    !SHA256.test(String(plan.compiled_identity?.contract_source_sha256||""))||
    !SHA256.test(String(plan.compiled_identity?.creation_bytecode_sha256||""))||
    plan.activation_lineage?.activation_height_continuity_verified!==true||
    plan.resolution_lineage?.pending_nonce_revalidated!==true||
    plan.resolution_lineage?.observation_block_hash_revalidated!==true||
    !HASH.test(String(plan.resolution_lineage?.observation_block_hash||""))||
    decimal(plan.resolution_lineage?.observation_block_number)===null||
    predecessor!==ZERO||
    plan.deployment_inputs?.predicted_registry_address_vacant!==true||
    !ADDRESS.test(deployer)||
    !ADDRESS.test(publisher)||
    !ADDRESS.test(predicted)||
    nonce===null||
    balance===null||
    derived!==predicted||
    !/^0x(?:[0-9a-f]{2})+$/u.test(creationData)||
    !HASH.test(String(plan.deployment_inputs?.creation_data_keccak256||""))||
    keccak256(creationData)!==plan.deployment_inputs.creation_data_keccak256||
    !/^0x(?:[0-9a-f]{2})+$/u.test(
      String(plan.deployment_inputs?.constructor_arguments||""),
    )||
    plan.deployment_inputs?.deployment_value_wei!=="0"||
    plan.unresolved?.gas_limit!==null||
    plan.unresolved?.gas_estimate_observed!==false||
    plan.unresolved?.max_fee_per_gas_wei!==null||
    plan.unresolved?.max_priority_fee_per_gas_wei!==null||
    plan.unresolved?.fee_envelope_observed!==false||
    plan.unresolved?.required_native_balance_wei!==null||
    plan.unresolved?.deployer_funding_sufficient!==null||
    plan.unresolved?.signable_transaction_materialized!==false||
    plan.unresolved?.exact_unsigned_transaction_hash!==null||
    plan.authority?.source_plan_only!==true||
    plan.authority?.rpc_call!==false||
    plan.authority?.credential_access!==false||
    plan.authority?.wallet_access!==false||
    plan.authority?.private_key_access!==false||
    plan.authority?.deployer_funding!==false||
    plan.authority?.signable_transaction_construction!==false||
    plan.authority?.transaction_signing!==false||
    plan.authority?.transaction_submission!==false||
    plan.authority?.transaction_broadcast!==false||
    plan.authority?.deployment!==false||
    plan.authority?.chain2050_mutation!==false||
    plan.authority?.funds_movement!==false
  ){
    throw new Error("unsigned_deployment_input_plan_contract_mismatch");
  }
  return plan;
}
