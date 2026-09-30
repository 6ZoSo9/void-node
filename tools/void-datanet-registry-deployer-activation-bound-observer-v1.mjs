#!/usr/bin/env node
import crypto from "node:crypto";

import {
  buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,
} from "./void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";

export const VOID_DATANET_REGISTRY_DEPLOYER_ACTIVATION_BOUND_OBSERVER_V1 =
  "VOID_DATANET_REGISTRY_DEPLOYER_ACTIVATION_BOUND_OBSERVER_V1";
export const PRIVATE_SUCCESSOR_RPC_V1="http://127.0.0.1:18553/";

const SHA256=/^[0-9a-f]{64}$/u;
const ACTIVATION_RECEIPT_ID=/^voide2qactr1_[0-9a-f]{64}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const ZERO="0x0000000000000000000000000000000000000000";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value) {
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  throw new Error("unsupported_canonical_value");
}
function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}

export function validateVoidEconomicEpoch2PrivateActivationReceiptForDatanetV1(
  activationPlan,
  receipt,
) {
  const plan=validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(
    activationPlan,
  );
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt)) {
    throw new Error("activation_receipt_invalid");
  }
  if(!ACTIVATION_RECEIPT_ID.test(String(receipt.activation_receipt_id||""))) {
    throw new Error("activation_receipt_id_shape_invalid");
  }

  const rebuilt=buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1({
    activation_plan:plan,
    activated_at_utc:receipt.activated_at_utc,
    observed:{
      validators:receipt.validators,
      precision_only_block_number:
        receipt.observations?.precision_only_block_number,
      after_nimo_block_number:
        receipt.observations?.after_nimo_block_number,
      after_nimo_peer_count:
        receipt.observations?.after_nimo_peer_count,
      after_xiphos_block_number:
        receipt.observations?.after_xiphos_block_number,
      after_xiphos_peer_count:
        receipt.observations?.after_xiphos_peer_count,
      chain_id_hex:receipt.chain_id_hex,
      started_roles:receipt.started_roles,
    },
  });
  if(canonicalJson(rebuilt)!==canonicalJson(receipt)) {
    throw new Error("activation_receipt_rebuild_mismatch");
  }
  if(
    receipt.status!=="PRIVATE_QBFT_RUNTIME_ACTIVE_TRANSACTION_AND_MIGRATION_HOLD"||
    receipt.chain_id!==2050||
    receipt.chain_id_hex!=="0x802"||
    receipt.execution_epoch!==2||
    receipt.consensus!=="QBFT"||
    receipt.validator_count!==3||
    receipt.required_quorum!==2||
    receipt.byzantine_fault_tolerance!==0||
    receipt.observations?.two_of_three_quorum_proven!==true||
    receipt.observations?.all_three_validator_services_active!==true||
    receipt.authority?.authoritative_chain2050_write!==true||
    receipt.authority?.transaction_construction!==false||
    receipt.authority?.transaction_signing!==false||
    receipt.authority?.transaction_submission!==false||
    receipt.authority?.transaction_broadcast!==false||
    receipt.authority?.token_movement!==false||
    receipt.authority?.funds_movement!==false||
    receipt.authority?.migration_authorized!==false||
    receipt.authority?.public_activation_authorized!==false
  ) {
    throw new Error("activation_receipt_contract_mismatch");
  }
  return Object.freeze({activation_plan:plan,activation_receipt:receipt});
}

export function buildVoidDatanetActivationBoundDeployerObserverInputV1(input) {
  const validated=
    validateVoidEconomicEpoch2PrivateActivationReceiptForDatanetV1(
      input?.activation_plan,
      input?.activation_receipt,
    );
  const deployer=String(input?.deployer_address||"").toLowerCase();
  const publisher=String(input?.publisher_address||"").toLowerCase();
  if(
    !ADDRESS.test(deployer)||
    !ADDRESS.test(publisher)||
    deployer===publisher||
    deployer===ZERO||
    publisher===ZERO||
    input?.predecessor_address!==ZERO
  ) {
    throw new Error("datanet_activation_bound_address_input_invalid");
  }
  if(!input?.compiled_identity||typeof input.compiled_identity!=="object") {
    throw new Error("datanet_activation_bound_compiled_identity_invalid");
  }

  return Object.freeze({
    marker:VOID_DATANET_REGISTRY_DEPLOYER_ACTIVATION_BOUND_OBSERVER_V1,
    version:1,
    status:"PRIVATE_SUCCESSOR_ACTIVE_READ_ONLY_DEPLOYER_OBSERVATION_READY",
    activation_plan_id:
      validated.activation_plan.activation_plan_id,
    activation_receipt_id:
      validated.activation_receipt.activation_receipt_id,
    activation_receipt:validated.activation_receipt,
    plan_id:validated.activation_receipt.plan_id,
    bundle_set_id:validated.activation_receipt.bundle_set_id,
    rpc_url:PRIVATE_SUCCESSOR_RPC_V1,
    rpc_url_fingerprint_sha256:sha256(PRIVATE_SUCCESSOR_RPC_V1),
    deployer_address:deployer,
    publisher_address:publisher,
    predecessor_address:ZERO,
    compiled_identity:input.compiled_identity,
    authority:{
      activation_lineage_read:true,
      loopback_rpc_read:true,
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
      funds_action:false,
      migration_authorized:false,
      public_activation_authorized:false,
      automatic_retry:false,
    },
    next_gate:
      "perform_single_read_only_deployer_nonce_balance_and_predicted_create_address_vacancy_observation",
  });
}

export function buildVoidDatanetActivationBoundResolutionPacketV1(input) {
  const binding=buildVoidDatanetActivationBoundDeployerObserverInputV1(input);
  const observer=input?.observer_result;
  if(!observer||typeof observer!=="object"||Array.isArray(observer)) {
    throw new Error("datanet_activation_bound_observer_result_invalid");
  }
  const expectedMethods=[
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getTransactionCount",
    "eth_getTransactionCount",
    "eth_getBalance",
    "eth_getTransactionCount",
    "eth_getCode",
    "eth_getTransactionCount",
    "eth_getBlockByNumber",
  ];
  if(
    observer.marker!=="VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_V1"||
    observer.version!==1||
    observer.ok!==true||
    observer.read_only_observation_complete!==true||
    observer.rpc_call_performed!==true||
    JSON.stringify(observer.rpc_methods_used)!==JSON.stringify(expectedMethods)||
    observer.mutation_performed!==false||
    observer.credential_access_performed!==false||
    observer.wallet_access_performed!==false||
    observer.private_key_access_performed!==false||
    observer.transaction_construction_performed!==false||
    observer.transaction_signing_performed!==false||
    observer.transaction_submission_performed!==false||
    observer.transaction_broadcast_performed!==false||
    observer.deployment_performed!==false||
    observer.chain2050_mutation_performed!==false||
    observer.deployer_funding_performed!==false||
    observer.funds_action_performed!==false||
    observer.automatic_retry_allowed!==false||
    observer.observation?.chain_id!=="2050"||
    observer.observation?.deployer_address!==binding.deployer_address||
    observer.observation?.publisher_address!==binding.publisher_address||
    observer.observation?.predecessor_address!==binding.predecessor_address||
    observer.observation?.rpc_url_fingerprint_sha256!==
      binding.rpc_url_fingerprint_sha256
  ) {
    throw new Error("datanet_activation_bound_observer_result_contract_mismatch");
  }

  const activationBlockFloor=BigInt(
    String(binding.activation_receipt.observations.after_xiphos_block_number),
  );
  const observedHead=BigInt(
    String(observer.observation.observation_block_number),
  );
  if(observedHead<activationBlockFloor) {
    throw new Error("datanet_activation_bound_observation_head_below_activation");
  }

  const green=observer.ready_for_source_evidence_binding===true;
  const material={
    marker:VOID_DATANET_REGISTRY_DEPLOYER_ACTIVATION_BOUND_OBSERVER_V1,
    version:1,
    status:green
      ?"PRIVATE_SUCCESSOR_READ_ONLY_DEPLOYER_RESOLUTION_GREEN"
      :"PRIVATE_SUCCESSOR_READ_ONLY_DEPLOYER_RESOLUTION_HOLD",
    activation_plan_id:binding.activation_plan_id,
    activation_receipt_id:binding.activation_receipt_id,
    activation_block_floor:activationBlockFloor.toString(10),
    observation_block_number:observedHead.toString(10),
    activation_height_continuity_verified:true,
    plan_id:binding.plan_id,
    bundle_set_id:binding.bundle_set_id,
    rpc_url_fingerprint_sha256:binding.rpc_url_fingerprint_sha256,
    deployer_address:binding.deployer_address,
    publisher_address:binding.publisher_address,
    predecessor_address:binding.predecessor_address,
    observer,
    authority:binding.authority,
    decision:green
      ?"GREEN_READY_TO_BIND_EXACT_READ_ONLY_DEPLOYER_RESOLUTION_EVIDENCE"
      :"HOLD_DEPLOYER_PENDING_STATE_OR_PREDICTED_ADDRESS_OCCUPANCY",
    next_gate:green
      ?"bind_activation_lineage_and_exact_deployer_resolution_into_source_only_unsigned_registry_deployment_plan"
      :"resolve_observed_pending_or_address_occupancy_without_transaction_authority",
  };
  return Object.freeze({
    ...material,
    packet_id:
      "voiddrrab1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}
