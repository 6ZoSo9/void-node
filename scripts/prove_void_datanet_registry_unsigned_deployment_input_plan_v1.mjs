#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {getCreateAddress} from "ethers";

import {
  EXPECTED_VALIDATORS_V1,
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1,
  buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,
} from "../tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";
import {
  observeDatanetRegistryDeployerResolutionV1,
} from "../tools/datanet-content-commitment-registry-deployer-resolution-observer-v1.mjs";
import {
  PRIVATE_SUCCESSOR_RPC_V1,
  buildVoidDatanetActivationBoundDeployerObserverInputV1,
  buildVoidDatanetActivationBoundResolutionPacketV1,
} from "../tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs";
import {
  VOID_DATANET_REGISTRY_UNSIGNED_DEPLOYMENT_INPUT_PLAN_V1,
  buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
  validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
} from "../tools/void-datanet-registry-unsigned-deployment-input-plan-v1.mjs";

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(
    Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
  );
}
function withId(prefix,material,key){
  return {
    ...material,
    [key]:prefix+sha256(Buffer.from(JSON.stringify(canonical(material)))),
  };
}
function rehashPlan(value){
  const plan=structuredClone(value);
  delete plan.plan_id;
  return "voiddrudp1_"+sha256(Buffer.from(JSON.stringify(canonical(plan))));
}

const installRows=["precision","nimo","xiphos"].map((role,index)=>({
  role,
  hostname:[
    "zoso-Precision-Tower-7810",
    "Nimo",
    "Xiphos",
  ][index],
  install_receipt_id:"voide2qinst1_"+String(index+1).repeat(64),
  materialization_id:"voide2qmat1_"+String(index+4).repeat(64),
  installed_repo_head:"a".repeat(40),
  runtime_root:
    "/home/zoso/.local/share/void/epoch2-qbft-private-runtime-v1/"+role,
  unit_install_path:
    "/home/zoso/.config/systemd/user/void-economic-epoch2-qbft-validator-v1.service",
  systemd_unit_sha256:String(index+1).repeat(64),
  genesis_sha256:
    "6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941",
  static_nodes_sha256:String(index+7).repeat(64),
}));

const activationPlanMaterial={
  marker:VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1,
  version:1,
  status:"THREE_HOST_PRESTART_ADMISSION_BOUND_VALIDATOR_START_HOLD",
  plan_id:"voide2qprp1_"+"1".repeat(64),
  bundle_set_id:"voide2qbsv1_"+"2".repeat(64),
  plan_file_sha256:"3".repeat(64),
  start_admission_id:"voide2qsad1_"+"4".repeat(64),
  start_admission_evaluated_at_utc:"2030-01-01T00:04:00.000Z",
  start_admission_valid_until_utc:"2030-01-01T00:08:00.000Z",
  start_admission_observed_repo_head:"b".repeat(40),
  compiled_at_utc:"2030-01-01T00:04:30.000Z",
  chain:{
    chain_id:2050,
    chain_id_hex:"0x802",
    execution_epoch:2,
    consensus:"QBFT",
    validator_count:3,
    required_quorum:2,
    block_period_seconds:5,
    request_timeout_seconds:10,
    expected_validators:[...EXPECTED_VALIDATORS_V1],
  },
  rpc:{
    role:"precision",
    url:PRIVATE_SUCCESSOR_RPC_V1,
    allowed_observation_methods:[
      "eth_chainId",
      "eth_blockNumber",
      "net_peerCount",
      "qbft_getValidatorsByBlockNumber",
    ],
    transaction_methods_forbidden:true,
  },
  install_receipts:installRows,
  start_sequence:[
    {step:1,role:"precision",quorum_after_start:false,required_postcondition:"precision"},
    {step:2,role:"nimo",quorum_after_start:true,required_postcondition:"nimo"},
    {step:3,role:"xiphos",quorum_after_start:true,required_postcondition:"xiphos"},
  ],
  pre_start_revalidation:{
    exact_installed_hashes:true,
  },
  activation:{
    authorized:false,
    required_confirmation:"startPrivateEpoch2QbftSuccessorV1",
    daemon_reload_per_host:true,
    service_enable:false,
    service_start:true,
    service_restart:false,
    automatic_retry:false,
    rollback_stop_all_started_on_any_failure:true,
    first_possible_authoritative_block_production_step:2,
    third_validator_start_after_quorum_proof:true,
  },
  authority:{
    source_plan_only:true,
    runtime_filesystem_write:false,
    systemd_reload:false,
    service_enable:false,
    service_start:false,
    service_stop:false,
    docker_mutation:false,
    private_key_access:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    authoritative_chain2050_write:false,
    validator_set_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
  },
  next_gate:
    "explicit_activation_confirmation_then_final_live_revalidation_and_single_attempt_start_sequence",
};
const activationPlan=withId(
  "voide2qactp1_",
  activationPlanMaterial,
  "activation_plan_id",
);
assert.equal(
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(activationPlan),
  activationPlan,
);

const activationReceipt=
  buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1({
    activation_plan:activationPlan,
    activated_at_utc:"2030-01-01T00:05:00.000Z",
    observed:{
      validators:[...EXPECTED_VALIDATORS_V1],
      precision_only_block_number:"0",
      after_nimo_block_number:"1",
      after_nimo_peer_count:1,
      after_xiphos_block_number:"2",
      after_xiphos_peer_count:2,
      chain_id_hex:"0x802",
      started_roles:["precision","nimo","xiphos"],
    },
  });

const identity=JSON.parse(fs.readFileSync(
  "ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json",
  "utf8",
));
const publisher=JSON.parse(fs.readFileSync(
  "ops/mainnet0/datanet-content-commitment-publisher-selection-v1.json",
  "utf8",
));
const deployer=JSON.parse(fs.readFileSync(
  "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json",
  "utf8",
));
const predecessor="0x0000000000000000000000000000000000000000";

const binding=buildVoidDatanetActivationBoundDeployerObserverInputV1({
  activation_plan:activationPlan,
  activation_receipt:activationReceipt,
  deployer_address:deployer.deployer_address,
  publisher_address:publisher.publisher_address,
  predecessor_address:predecessor,
  compiled_identity:identity,
});

const nonce=0n;
const predicted=getCreateAddress({
  from:deployer.deployer_address,
  nonce,
}).toLowerCase();
const blockHash="0x"+"5".repeat(64);
const replies=[
  "0x802",
  "0x2",
  {number:"0x2",hash:blockHash},
  "0x0",
  "0x0",
  "0xde0b6b3a7640000",
  "0x0",
  "0x",
  "0x0",
  {number:"0x2",hash:blockHash},
];
let at=0;
const observer=await observeDatanetRegistryDeployerResolutionV1({
  rpc_url:binding.rpc_url,
  deployer_address:binding.deployer_address,
  publisher_address:binding.publisher_address,
  predecessor_address:binding.predecessor_address,
  compiled_identity:identity,
  request_timeout_ms:5000,
  max_response_bytes:65536,
  transport:async()=>replies[at++],
});
assert.equal(at,10);
assert.equal(observer.ready_for_source_evidence_binding,true);
assert.equal(observer.observation.predicted_registry_contract_address,predicted);

const resolutionPacket=buildVoidDatanetActivationBoundResolutionPacketV1({
  activation_plan:activationPlan,
  activation_receipt:activationReceipt,
  deployer_address:binding.deployer_address,
  publisher_address:binding.publisher_address,
  predecessor_address:binding.predecessor_address,
  compiled_identity:identity,
  observer_result:observer,
});
assert.equal(resolutionPacket.activation_height_continuity_verified,true);

const plan=buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1({
  activation_plan:activationPlan,
  activation_receipt:activationReceipt,
  resolution_packet:resolutionPacket,
  deployer_address:binding.deployer_address,
  publisher_address:binding.publisher_address,
  predecessor_address:binding.predecessor_address,
  compiled_identity:identity,
});
assert.equal(
  plan.marker,
  VOID_DATANET_REGISTRY_UNSIGNED_DEPLOYMENT_INPUT_PLAN_V1,
);
assert.equal(
  plan.status,
  "UNSIGNED_DEPLOYMENT_INPUT_PLAN_READY_FEE_GAS_FUNDING_HOLD",
);
assert.match(plan.plan_id,/^voiddrudp1_[0-9a-f]{64}$/u);
assert.equal(plan.chain_id,"2050");
assert.equal(plan.execution_epoch,2);
assert.equal(
  plan.compiled_identity.identity_id,
  identity.identity_id,
);
assert.equal(
  plan.compiled_identity.contract_source_sha256,
  identity.source.contract_source_sha256,
);
assert.equal(
  plan.compiled_identity.creation_bytecode_sha256,
  identity.artifacts.creation_bytecode_sha256,
);
assert.equal(
  plan.activation_lineage.activation_plan_id,
  activationPlan.activation_plan_id,
);
assert.equal(
  plan.activation_lineage.activation_receipt_id,
  activationReceipt.activation_receipt_id,
);
assert.equal(plan.activation_lineage.activation_block_floor,"2");
assert.equal(plan.resolution_lineage.observation_block_number,"2");
assert.equal(plan.resolution_lineage.pending_nonce_revalidated,true);
assert.equal(plan.resolution_lineage.observation_block_hash_revalidated,true);
assert.equal(plan.deployment_inputs.deployer_address,deployer.deployer_address);
assert.equal(plan.deployment_inputs.publisher_address,publisher.publisher_address);
assert.equal(plan.deployment_inputs.predecessor_address,predecessor);
assert.equal(plan.deployment_inputs.deployer_nonce,"0");
assert.equal(
  plan.deployment_inputs.deployer_balance_wei,
  "1000000000000000000",
);
assert.equal(
  plan.deployment_inputs.predicted_registry_contract_address,
  predicted,
);
assert.equal(plan.deployment_inputs.predicted_registry_address_vacant,true);
assert.equal(plan.deployment_inputs.deployment_value_wei,"0");
assert.equal(plan.unresolved.gas_limit,null);
assert.equal(plan.unresolved.gas_estimate_observed,false);
assert.equal(plan.unresolved.max_fee_per_gas_wei,null);
assert.equal(plan.unresolved.max_priority_fee_per_gas_wei,null);
assert.equal(plan.unresolved.fee_envelope_observed,false);
assert.equal(plan.unresolved.required_native_balance_wei,null);
assert.equal(plan.unresolved.deployer_funding_sufficient,null);
assert.equal(plan.unresolved.signable_transaction_materialized,false);
assert.equal(plan.unresolved.exact_unsigned_transaction_hash,null);
assert.equal(plan.authority.source_plan_only,true);
for(const [key,value] of Object.entries(plan.authority)){
  if(key==="source_plan_only") assert.equal(value,true,key);
  else assert.equal(value,false,key);
}
assert.equal(
  validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(plan),
  plan,
);

{
  const bad=structuredClone(plan);
  bad.deployment_inputs.predicted_registry_contract_address=
    "0x"+"1".repeat(40);
  bad.plan_id=rehashPlan(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(bad),
    /unsigned_deployment_input_plan_contract_mismatch/u,
  );
}
{
  const bad=structuredClone(plan);
  const original=bad.deployment_inputs.creation_data;
  const firstByte=original.slice(2,4)==="00"?"01":"00";
  bad.deployment_inputs.creation_data=
    "0x"+firstByte+original.slice(4);
  const {keccak256}=await import("ethers");
  bad.deployment_inputs.creation_data_keccak256=
    keccak256(bad.deployment_inputs.creation_data);
  bad.plan_id=rehashPlan(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(bad),
    /unsigned_deployment_input_plan_contract_mismatch/u,
  );
}
{
  const bad=structuredClone(plan);
  bad.authority.transaction_submission=true;
  bad.plan_id=rehashPlan(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(bad),
    /unsigned_deployment_authority_mismatch:transaction_submission/u,
  );
}
{
  const bad=structuredClone(plan);
  bad.unresolved.gas_limit="1000000";
  bad.plan_id=rehashPlan(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(bad),
    /unsigned_deployment_unresolved_mismatch:gas_limit/u,
  );
}

const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-unsigned-deployment-input-plan-v1.mjs",
  "utf8",
);
for(const required of [
  "resolution_packet_repo_head_not_ancestor",
  "signable_transaction_materialized=false",
  "gas_estimate_observed=false",
  "fee_envelope_observed=false",
  "rpc_call=false",
  "credential_access=false",
  "wallet_access=false",
  "private_key_access=false",
  "transaction_construction=false",
  "transaction_signing=false",
  "transaction_submission=false",
  "transaction_broadcast=false",
  "deployment=false",
  "chain2050_mutation=false",
  "funds_movement=false",
]){
  assert.ok(runner.includes(required),required);
}
for(const forbidden of [
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_feeHistory",
  "eth_maxPriorityFeePerGas",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "systemctl",
  "docker ",
  "ssh ",
  "SigningKey",
  "Wallet(",
  "privateKey",
  "sudo ",
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_UNSIGNED_DEPLOYMENT_INPUT_PLAN_V1_PROOF_GREEN");
console.log("activation_lineage_bound=true");
console.log("resolution_lineage_bound=true");
console.log("compiled_identity_bound=true");
console.log("create_address_rederived=true");
console.log("creation_bytecode_sha256_rederived=true");
console.log("constructor_arguments_revalidated=true");
console.log("gas_estimate_observed=false");
console.log("fee_envelope_observed=false");
console.log("signable_transaction_materialized=false");
console.log("rpc_call=false");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
