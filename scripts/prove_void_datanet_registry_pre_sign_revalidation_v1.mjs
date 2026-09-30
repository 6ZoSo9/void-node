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
  buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
} from "../tools/void-datanet-registry-unsigned-deployment-input-plan-v1.mjs";
import {
  buildVoidDatanetRegistryDeploymentFeeFundingPacketV1,
  observeVoidDatanetRegistryDeploymentFeeFundingV1,
} from "../tools/void-datanet-registry-deployment-fee-funding-observer-v1.mjs";
import {
  VOID_DATANET_REGISTRY_PRE_SIGN_REVALIDATION_V1,
  runVoidDatanetRegistryPreSignRevalidationV1,
  validateVoidDatanetRegistryPreSignRevalidationV1,
} from "../tools/void-datanet-registry-pre-sign-revalidation-v1.mjs";

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
function rehashRevalidation(value){
  const copy=structuredClone(value);
  delete copy.ok;
  delete copy.revalidation_id;
  return "voiddrpsr1_"+
    sha256(Buffer.from(JSON.stringify(canonical(copy))));
}

const activationMaterial={
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
  install_receipts:["precision","nimo","xiphos"].map((role,index)=>({
    role,
    hostname:["zoso-Precision-Tower-7810","Nimo","Xiphos"][index],
  })),
  start_sequence:[
    {step:1,role:"precision"},
    {step:2,role:"nimo"},
    {step:3,role:"xiphos"},
  ],
  pre_start_revalidation:{exact_installed_hashes:true},
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
  activationMaterial,
  "activation_plan_id",
);
validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(activationPlan);
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
const predicted=getCreateAddress({
  from:deployer.deployer_address,
  nonce:0n,
}).toLowerCase();

const resolutionBlockHash="0x"+"5".repeat(64);
const resolutionReplies=[
  "0x802",
  "0x2",
  {number:"0x2",hash:resolutionBlockHash},
  "0x0",
  "0x0",
  "0xde0b6b3a7640000",
  "0x0",
  "0x",
  "0x0",
  {number:"0x2",hash:resolutionBlockHash},
];
let resolutionAt=0;
const deployerObservation=await observeDatanetRegistryDeployerResolutionV1({
  rpc_url:binding.rpc_url,
  deployer_address:binding.deployer_address,
  publisher_address:binding.publisher_address,
  predecessor_address:binding.predecessor_address,
  compiled_identity:identity,
  transport:async()=>resolutionReplies[resolutionAt++],
});
assert.equal(resolutionAt,10);
const resolutionPacket=buildVoidDatanetActivationBoundResolutionPacketV1({
  activation_plan:activationPlan,
  activation_receipt:activationReceipt,
  deployer_address:binding.deployer_address,
  publisher_address:binding.publisher_address,
  predecessor_address:binding.predecessor_address,
  compiled_identity:identity,
  observer_result:deployerObservation,
});
const deploymentPlan=buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1({
  activation_plan:activationPlan,
  activation_receipt:activationReceipt,
  resolution_packet:resolutionPacket,
  deployer_address:binding.deployer_address,
  publisher_address:binding.publisher_address,
  predecessor_address:binding.predecessor_address,
  compiled_identity:identity,
});

function feeReplies(headHex,hash,balanceHex){
  return [
    "0x802",
    headHex,
    {number:headHex,hash,baseFeePerGas:"0x0"},
    "0x0",
    balanceHex,
    "0x0",
    "0x",
    "0xf4240",
    "0x0",
    "0x0",
    {number:headHex,hash,baseFeePerGas:"0x0"},
  ];
}
async function observeFee(headHex,hash,balanceHex){
  const replies=feeReplies(headHex,hash,balanceHex);
  let at=0;
  const result=await observeVoidDatanetRegistryDeploymentFeeFundingV1({
    rpc_url:PRIVATE_SUCCESSOR_RPC_V1,
    activation_plan:activationPlan,
    activation_receipt:activationReceipt,
    resolution_packet:resolutionPacket,
    deployment_input_plan:deploymentPlan,
    deployer_address:binding.deployer_address,
    publisher_address:binding.publisher_address,
    predecessor_address:binding.predecessor_address,
    compiled_identity:identity,
    transport:async()=>replies[at++],
  });
  assert.equal(at,11);
  return result;
}

const priorObserver=await observeFee(
  "0x3",
  "0x"+"6".repeat(64),
  "0xde0b6b3a7640000",
);
const priorPacket=buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
  deployment_input_plan:deploymentPlan,
  observer_result:priorObserver,
});
assert.equal(
  priorPacket.status,
  "READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN",
);

{
  const replies=feeReplies(
    "0x4",
    "0x"+"7".repeat(64),
    "0xde0b6b3a7640000",
  );
  let at=0;
  const receipt=await runVoidDatanetRegistryPreSignRevalidationV1({
    rpc_url:PRIVATE_SUCCESSOR_RPC_V1,
    activation_plan:activationPlan,
    activation_receipt:activationReceipt,
    resolution_packet:resolutionPacket,
    deployment_input_plan:deploymentPlan,
    prior_fee_funding_packet:priorPacket,
    deployer_address:binding.deployer_address,
    publisher_address:binding.publisher_address,
    predecessor_address:binding.predecessor_address,
    compiled_identity:identity,
    observed_at_utc:"2030-01-01T00:06:00.000Z",
    transport:async()=>replies[at++],
  });
  assert.equal(at,11);
  assert.equal(receipt.ok,true);
  assert.equal(receipt.marker,VOID_DATANET_REGISTRY_PRE_SIGN_REVALIDATION_V1);
  assert.equal(
    receipt.status,
    "FRESH_PRE_SIGN_REVALIDATION_GREEN_SIGNABLE_PLAN_CONFIRMATION_REQUIRED",
  );
  assert.match(receipt.revalidation_id,/^voiddrpsr1_[0-9a-f]{64}$/u);
  assert.equal(receipt.observed_at_utc,"2030-01-01T00:06:00.000Z");
  assert.equal(receipt.valid_until_utc,"2030-01-01T00:11:00.000Z");
  assert.equal(receipt.observation.block_number,"4");
  assert.equal(receipt.observation.deployer_pending_nonce,"0");
  assert.equal(
    receipt.observation.predicted_registry_contract_address,
    predicted,
  );
  assert.equal(receipt.observation.proposed_gas_limit,"1200000");
  assert.equal(receipt.observation.max_fee_per_gas_wei,"3000000000");
  assert.equal(
    receipt.observation.max_priority_fee_per_gas_wei,
    "1000000000",
  );
  assert.equal(
    receipt.observation.maximum_deployment_gas_cost_wei,
    "3600000000000000",
  );
  assert.equal(receipt.observation.minimum_additional_funding_wei,"0");
  assert.equal(receipt.signable_transaction_construction_authorized,false);
  assert.equal(
    receipt.required_next_confirmation,
    "constructDatanetRegistryDeploymentTransactionV1",
  );
  assert.equal(validateVoidDatanetRegistryPreSignRevalidationV1(receipt),receipt);

  const bad=structuredClone(receipt);
  bad.authority.transaction_submission=true;
  bad.revalidation_id=rehashRevalidation(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryPreSignRevalidationV1(bad),
    /pre_sign_revalidation_authority_mismatch:transaction_submission/u,
  );

  const badCost=structuredClone(receipt);
  badCost.observation.maximum_deployment_gas_cost_wei="1";
  badCost.revalidation_id=rehashRevalidation(badCost);
  assert.throws(
    ()=>validateVoidDatanetRegistryPreSignRevalidationV1(badCost),
    /pre_sign_revalidation_contract_mismatch/u,
  );
}

{
  const replies=feeReplies("0x4","0x"+"8".repeat(64),"0x0");
  let at=0;
  const held=await runVoidDatanetRegistryPreSignRevalidationV1({
    rpc_url:PRIVATE_SUCCESSOR_RPC_V1,
    activation_plan:activationPlan,
    activation_receipt:activationReceipt,
    resolution_packet:resolutionPacket,
    deployment_input_plan:deploymentPlan,
    prior_fee_funding_packet:priorPacket,
    deployer_address:binding.deployer_address,
    publisher_address:binding.publisher_address,
    predecessor_address:binding.predecessor_address,
    compiled_identity:identity,
    observed_at_utc:"2030-01-01T00:06:00.000Z",
    transport:async()=>replies[at++],
  });
  assert.equal(at,11);
  assert.equal(held.ok,false);
  assert.equal(held.status,"FRESH_PRE_SIGN_REVALIDATION_HOLD");
  assert.equal(
    held.signable_transaction_construction_authorized,
    false,
  );
  assert.equal(held.transaction_signing_authorized,false);
  assert.equal(held.transaction_broadcast_authorized,false);
  assert.equal(held.deployment_authorized,false);
  assert.equal(held.chain2050_write_authorized,false);
  assert.equal(held.funds_movement_authorized,false);
}

{
  const replies=feeReplies(
    "0x2",
    "0x"+"9".repeat(64),
    "0xde0b6b3a7640000",
  );
  let at=0;
  await assert.rejects(
    async()=>runVoidDatanetRegistryPreSignRevalidationV1({
      rpc_url:PRIVATE_SUCCESSOR_RPC_V1,
      activation_plan:activationPlan,
      activation_receipt:activationReceipt,
      resolution_packet:resolutionPacket,
      deployment_input_plan:deploymentPlan,
      prior_fee_funding_packet:priorPacket,
      deployer_address:binding.deployer_address,
      publisher_address:binding.publisher_address,
      predecessor_address:binding.predecessor_address,
      compiled_identity:identity,
      observed_at_utc:"2030-01-01T00:06:00.000Z",
      transport:async()=>replies[at++],
    }),
    /pre_sign_observation_head_regressed/u,
  );
  assert.equal(at,11);
}

const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-pre-sign-revalidation-v1.mjs",
  "utf8",
);
for(const required of [
  "precision_private_qbft_service_not_active",
  "signable_transaction_construction_authorized=false",
  "credential_access=false",
  "wallet_access=false",
  "private_key_access=false",
  "deployer_funding=false",
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
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "SigningKey",
  "Wallet(",
  "privateKey",
  "systemctl --user start",
  "systemctl --user restart",
  "docker run",
  "docker start",
  "ssh ",
  "sudo ",
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_PRE_SIGN_REVALIDATION_V1_PROOF_GREEN");
console.log("fresh_read_only_fee_observation_required=true");
console.log("five_minute_validity_window=true");
console.log("observation_head_not_regressed=true");
console.log("pending_nonce_exact=true");
console.log("predicted_create_address_vacant=true");
console.log("fee_caps_sufficient=true");
console.log("deployer_balance_sufficient=true");
console.log("signable_transaction_construction_authorized=false");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("deployer_funding=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
