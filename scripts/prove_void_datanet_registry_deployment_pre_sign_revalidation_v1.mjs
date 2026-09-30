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
  PRE_SIGN_VALIDITY_SECONDS_V1,
  runVoidDatanetRegistryDeploymentPreSignRevalidationV1,
  validateVoidDatanetRegistryDeploymentPreSignRevalidationV1,
} from "../tools/void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs";

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
function rehashPreSign(value){
  const x=structuredClone(value);
  delete x.pre_sign_revalidation_id;
  for(const key of [
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
    delete x[key];
  }
  return "voiddrpsr1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
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
assert.equal(deployerObservation.ready_for_source_evidence_binding,true);

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

function feeReplies({
  head,
  hashDigit,
  balance="0xde0b6b3a7640000",
  pending="0x0",
  estimate="0xf4240",
  priority="0x0",
}={}){
  const headHex="0x"+BigInt(head).toString(16);
  const blockHash="0x"+String(hashDigit).repeat(64);
  return [
    "0x802",
    headHex,
    {number:headHex,hash:blockHash,baseFeePerGas:"0x0"},
    pending,
    balance,
    "0x0",
    "0x",
    estimate,
    priority,
    pending,
    {number:headHex,hash:blockHash,baseFeePerGas:"0x0"},
  ];
}
async function feeObservation(options){
  const replies=feeReplies(options);
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

const priorObserver=await feeObservation({head:3,hashDigit:"6"});
assert.equal(priorObserver.status,"read_only_fee_gas_funding_green");
const priorPacket=buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
  deployment_input_plan:deploymentPlan,
  observer_result:priorObserver,
});
const priorPrecisionResult={
  marker:"VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_PRECISION_V1",
  version:1,
  status:priorPacket.status,
  observed_at_utc:"2030-01-01T00:06:00.000Z",
  observed_on_host:"zoso-Precision-Tower-7810",
  observed_repo_head:"a".repeat(40),
  observer:priorObserver,
  packet:priorPacket,
  authority:{
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
  },
};

async function runFresh(options,observedAt="2030-01-01T00:06:30.000Z"){
  const replies=feeReplies(options);
  let at=0;
  const result=
    await runVoidDatanetRegistryDeploymentPreSignRevalidationV1({
      activation_plan:activationPlan,
      activation_receipt:activationReceipt,
      resolution_packet:resolutionPacket,
      deployment_input_plan:deploymentPlan,
      fee_funding_result:priorPrecisionResult,
      deployer_address:binding.deployer_address,
      publisher_address:binding.publisher_address,
      predecessor_address:binding.predecessor_address,
      compiled_identity:identity,
      observed_at_utc:observedAt,
      transport:async()=>replies[at++],
    });
  assert.equal(at,11);
  return result;
}

const green=await runFresh({
  head:4,
  hashDigit:"7",
  estimate:"0x100000",
});
assert.equal(green.ok,true);
assert.equal(
  green.receipt.status,
  "FRESH_READ_ONLY_PRE_SIGN_REVALIDATION_GREEN_TRANSACTION_CONSTRUCTION_HOLD",
);
assert.match(
  green.receipt.pre_sign_revalidation_id,
  /^voiddrpsr1_[0-9a-f]{64}$/u,
);
assert.equal(
  validateVoidDatanetRegistryDeploymentPreSignRevalidationV1(green.receipt),
  green.receipt,
);
assert.equal(green.receipt.freshness_seconds,PRE_SIGN_VALIDITY_SECONDS_V1);
assert.equal(
  Date.parse(green.receipt.valid_until_utc)-
    Date.parse(green.receipt.observed_at_utc),
  PRE_SIGN_VALIDITY_SECONDS_V1*1000,
);
assert.equal(green.receipt.deployment_input_plan_id,deploymentPlan.plan_id);
assert.equal(green.receipt.prior_fee_funding_packet_id,priorPacket.packet_id);
assert.equal(
  green.receipt.fresh_fee_funding_packet_id,
  green.fresh_fee_funding_packet.packet_id,
);
assert.equal(green.receipt.continuity.deployer_pending_nonce_stable,true);
assert.equal(green.receipt.continuity.predicted_registry_address_vacant,true);
assert.equal(green.receipt.continuity.fresh_fee_caps_sufficient,true);
assert.equal(green.receipt.continuity.fresh_deployer_balance_sufficient,true);
assert.equal(green.receipt.continuity.minimum_additional_funding_wei,"0");
assert.equal(green.receipt.authority.signable_transaction_materialized,false);
assert.equal(green.receipt.authority.signable_transaction_construction,false);
assert.equal(green.receipt.authority.transaction_signing,false);
assert.equal(green.receipt.authority.transaction_submission,false);
assert.equal(green.receipt.authority.transaction_broadcast,false);
assert.equal(green.receipt.authority.chain2050_mutation,false);
assert.equal(
  Object.hasOwn(green.receipt,"fresh_fee_funding_packet"),
  false,
);
assert.equal(
  green.fresh_fee_funding_packet.status,
  "READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN",
);

{
  const badPrior=structuredClone(priorPrecisionResult);
  badPrior.packet.observation.proposed_gas_limit="1";
  const replies=feeReplies({head:4,hashDigit:"7"});
  let at=0;
  const result=
    await runVoidDatanetRegistryDeploymentPreSignRevalidationV1({
      activation_plan:activationPlan,
      activation_receipt:activationReceipt,
      resolution_packet:resolutionPacket,
      deployment_input_plan:deploymentPlan,
      fee_funding_result:badPrior,
      deployer_address:binding.deployer_address,
      publisher_address:binding.publisher_address,
      predecessor_address:binding.predecessor_address,
      compiled_identity:identity,
      observed_at_utc:"2030-01-01T00:06:30.000Z",
      transport:async()=>replies[at++],
    });
  assert.equal(result.ok,false);
  assert.equal(result.reason,"pre_sign_prior_fee_funding_evidence_invalid");
  assert.equal(at,0);
}
{
  const held=await runFresh({
    head:4,
    hashDigit:"7",
    balance:"0x0",
  });
  assert.equal(held.ok,false);
  assert.equal(
    held.reason,
    "pre_sign_fresh_fee_or_funding_not_green",
  );
}
{
  const held=await runFresh({
    head:2,
    hashDigit:"7",
  });
  assert.equal(held.ok,false);
  assert.equal(held.reason,"pre_sign_fresh_continuity_mismatch");
}
{
  const replies=feeReplies({
    head:4,
    hashDigit:"7",
    pending:"0x1",
  });
  let at=0;
  const held=
    await runVoidDatanetRegistryDeploymentPreSignRevalidationV1({
      activation_plan:activationPlan,
      activation_receipt:activationReceipt,
      resolution_packet:resolutionPacket,
      deployment_input_plan:deploymentPlan,
      fee_funding_result:priorPrecisionResult,
      deployer_address:binding.deployer_address,
      publisher_address:binding.publisher_address,
      predecessor_address:binding.predecessor_address,
      compiled_identity:identity,
      observed_at_utc:"2030-01-01T00:06:30.000Z",
      transport:async()=>replies[at++],
    });
  assert.equal(held.ok,false);
  assert.equal(held.reason,"pre_sign_fresh_fee_funding_observation_held");
}
{
  const bad=structuredClone(green.receipt);
  bad.authority.transaction_signing=true;
  bad.pre_sign_revalidation_id=rehashPreSign(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryDeploymentPreSignRevalidationV1(bad),
    /pre_sign_authority_mismatch:transaction_signing/u,
  );
}
{
  const bad=structuredClone(green.receipt);
  bad.signable_transaction_constructed=true;
  bad.pre_sign_revalidation_id=rehashPreSign(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryDeploymentPreSignRevalidationV1(bad),
    /pre_sign_revalidation_execution_boundary_mismatch/u,
  );
}

const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs",
  "utf8",
);
for(const required of [
  "PRIOR_FEE_FUNDING_RESULT_JSON",
  "FRESH_FEE_PACKET_OUTPUT_JSON",
  "precision_private_qbft_service_not_active",
  "pre_sign_lineage_repo_head_not_ancestor",
  "signable_transaction_materialized=false",
  "signable_transaction_construction=false",
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

console.log("VOID_DATANET_REGISTRY_DEPLOYMENT_PRE_SIGN_REVALIDATION_V1_PROOF_GREEN");
console.log("prior_fee_packet_rebuilt=true");
console.log("second_independent_fee_observation=true");
console.log("fresh_observation_block_not_older=true");
console.log("deployer_pending_nonce_stable=true");
console.log("predicted_registry_address_vacant=true");
console.log("creation_data_identity_stable=true");
console.log("fresh_fee_caps_sufficient=true");
console.log("fresh_deployer_balance_sufficient=true");
console.log("pre_sign_validity_seconds=120");
console.log("detailed_fresh_fee_packet_separate=true");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("deployer_funding=false");
console.log("signable_transaction_materialized=false");
console.log("signable_transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
