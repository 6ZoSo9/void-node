#!/usr/bin/env node
import crypto from "node:crypto";

import {
  EXPECTED_VALIDATORS_V1,
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,
} from "./void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";

export const VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_ACTIVATION_BINDING_V1 =
  "VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_ACTIVATION_BINDING_V1";

const ACTIVATION_RECEIPT_ID=/^voide2qactr1_[0-9a-f]{64}$/u;
const ACTIVATION_PLAN_ID=/^voide2qactp1_[0-9a-f]{64}$/u;
const PLAN_ID=/^voide2qprp1_[0-9a-f]{64}$/u;
const BUNDLE_SET_ID=/^voide2qbsv1_[0-9a-f]{64}$/u;
const START_ADMISSION_ID=/^voide2qsad1_[0-9a-f]{64}$/u;
const RPC_URL="http://127.0.0.1:18553/";

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
  const a=Object.keys(value).sort();
  const b=[...keys].sort();
  if(JSON.stringify(a)!==JSON.stringify(b)){
    throw new Error(label+"_keys_invalid");
  }
}
function quantity(value,label){
  const text=String(value??"");
  if(!/^(?:0|[1-9][0-9]*)$/u.test(text)) throw new Error(label+"_invalid");
  return BigInt(text);
}

export function validateVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1(
  receipt,
  activationPlanInput,
){
  const activationPlan=
    validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(
      activationPlanInput,
    );
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt)){
    throw new Error("activation_receipt_invalid");
  }
  const material=structuredClone(receipt);
  const observedId=String(material.activation_receipt_id||"");
  delete material.activation_receipt_id;
  const expectedId=
    "voide2qactr1_"+sha256(Buffer.from(canonicalJson(material)));
  if(
    observedId!==expectedId||
    !ACTIVATION_RECEIPT_ID.test(observedId)
  ){
    throw new Error("activation_receipt_id_mismatch");
  }

  if(
    receipt.marker!==
      "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_RECEIPT_V1"||
    receipt.version!==1||
    receipt.status!=="PRIVATE_QBFT_RUNTIME_ACTIVE_TRANSACTION_AND_MIGRATION_HOLD"||
    receipt.activation_plan_id!==activationPlan.activation_plan_id||
    receipt.plan_id!==activationPlan.plan_id||
    receipt.bundle_set_id!==activationPlan.bundle_set_id||
    receipt.start_admission_id!==activationPlan.start_admission_id||
    !ACTIVATION_PLAN_ID.test(String(receipt.activation_plan_id||""))||
    !PLAN_ID.test(String(receipt.plan_id||""))||
    !BUNDLE_SET_ID.test(String(receipt.bundle_set_id||""))||
    !START_ADMISSION_ID.test(String(receipt.start_admission_id||""))||
    receipt.chain_id!==2050||
    receipt.chain_id_hex!=="0x802"||
    receipt.execution_epoch!==2||
    receipt.consensus!=="QBFT"||
    receipt.validator_count!==3||
    receipt.required_quorum!==2||
    receipt.byzantine_fault_tolerance!==0||
    JSON.stringify(receipt.validators)!==JSON.stringify(EXPECTED_VALIDATORS_V1)||
    JSON.stringify(receipt.started_roles)!==
      JSON.stringify(["precision","nimo","xiphos"])||
    !Number.isFinite(Date.parse(String(receipt.activated_at_utc||"")))||
    receipt.next_gate!==
      "datanet_registry_deployer_live_nonce_balance_and_create_address_vacancy_observation_on_private_successor_rpc"
  ){
    throw new Error("activation_receipt_contract_mismatch");
  }

  const precisionOnly=quantity(
    receipt.observations?.precision_only_block_number,
    "precision_only_block_number",
  );
  const afterNimo=quantity(
    receipt.observations?.after_nimo_block_number,
    "after_nimo_block_number",
  );
  const afterXiphos=quantity(
    receipt.observations?.after_xiphos_block_number,
    "after_xiphos_block_number",
  );
  if(
    precisionOnly!==0n||
    afterNimo<1n||
    afterXiphos<=afterNimo||
    receipt.observations?.after_nimo_peer_count<1||
    receipt.observations?.after_xiphos_peer_count<2||
    receipt.observations?.chain_progression_proven!==true||
    receipt.observations?.exact_validator_set_proven!==true||
    receipt.observations?.two_of_three_quorum_proven!==true||
    receipt.observations?.all_three_validator_services_active!==true
  ){
    throw new Error("activation_receipt_observation_mismatch");
  }

  const expectedAuthority={
    systemd_reload:true,
    service_enable:false,
    service_start:true,
    service_stop_on_failure_only:true,
    docker_mutation:true,
    private_key_access:true,
    private_key_content_exported:false,
    private_key_stdout:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    authoritative_chain2050_write:true,
    validator_set_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
  };
  exactKeys(
    receipt.authority,
    Object.keys(expectedAuthority),
    "activation_receipt_authority",
  );
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(receipt.authority[key]!==value){
      throw new Error("activation_receipt_authority_mismatch:"+key);
    }
  }
  return Object.freeze({activationPlan,receipt});
}

export function buildDatanetRegistryDeployerResolutionActivationBindingV1(input){
  const validated=
    validateVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1(
      input?.activation_receipt,
      input?.activation_plan,
    );
  const material={
    marker:VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_ACTIVATION_BINDING_V1,
    version:1,
    status:"PRIVATE_SUCCESSOR_RPC_BOUND_READ_ONLY_DEPLOYER_OBSERVATION_READY",
    activation_receipt_id:validated.receipt.activation_receipt_id,
    activation_plan_id:validated.receipt.activation_plan_id,
    plan_id:validated.receipt.plan_id,
    bundle_set_id:validated.receipt.bundle_set_id,
    start_admission_id:validated.receipt.start_admission_id,
    activated_at_utc:validated.receipt.activated_at_utc,
    chain_id:2050,
    execution_epoch:2,
    consensus:"QBFT",
    validator_count:3,
    required_quorum:2,
    byzantine_fault_tolerance:0,
    exact_validator_set:EXPECTED_VALIDATORS_V1,
    activation_final_block_number:
      validated.receipt.observations.after_xiphos_block_number,
    activation_final_peer_count:
      validated.receipt.observations.after_xiphos_peer_count,
    rpc:{
      url:RPC_URL,
      url_fingerprint_sha256:sha256(RPC_URL),
      loopback_only:true,
      activation_role:"precision",
      live_validator_set_revalidation_required:true,
      read_only_methods:[
        "eth_chainId",
        "eth_blockNumber",
        "qbft_getValidatorsByBlockNumber",
        "eth_getBlockByNumber",
        "eth_getTransactionCount",
        "eth_getBalance",
        "eth_getCode",
      ],
    },
    authority:{
      source_binding_only:true,
      rpc_call:false,
      filesystem_secret_read:false,
      credential_access:false,
      wallet_access:false,
      private_key_access:false,
      deployer_funding:false,
      transaction_construction:false,
      transaction_signing:false,
      transaction_submission:false,
      transaction_broadcast:false,
      deployment:false,
      chain2050_mutation:false,
      validator_mutation:false,
      token_movement:false,
      funds_action:false,
      migration_authorized:false,
      public_activation_authorized:false,
    },
    next_gate:
      "live_read_only_deployer_nonce_balance_and_predicted_create_address_vacancy_observation",
  };
  return Object.freeze({
    ...material,
    binding_id:
      "voiddrab1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}
