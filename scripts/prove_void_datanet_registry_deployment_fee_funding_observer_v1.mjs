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
  GAS_LIMIT_MULTIPLIER_BPS_V1,
  MAX_FEE_PER_GAS_WEI_V1,
  MAX_PRIORITY_FEE_PER_GAS_WEI_V1,
  buildVoidDatanetRegistryDeploymentFeeFundingPacketV1,
  observeVoidDatanetRegistryDeploymentFeeFundingV1,
} from "../tools/void-datanet-registry-deployment-fee-funding-observer-v1.mjs";

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
    install_receipt_id:"voide2qinst1_"+String(index+1).repeat(64),
    materialization_id:"voide2qmat1_"+String(index+4).repeat(64),
    receipt_basis:"fresh_install",
    install_receipt_observed_at_utc:
      "2030-01-01T00:02:0"+String(index)+".000Z",
    install_receipt_observed_repo_head:
      ["c","d","e"][index].repeat(40),
    runtime_root:
      "/home/zoso/.local/share/void/epoch2-qbft-private-runtime-v1/"+role,
    unit_install_path:
      "/home/zoso/.config/systemd/user/void-economic-epoch2-qbft-validator-v1.service",
    systemd_unit_sha256:String(index+7).repeat(64),
    genesis_sha256:["a","b","c"][index].repeat(64),
    static_nodes_sha256:["d","e","f"][index].repeat(64),
    unit_file_state:"static",
    operator_user_unit_dir_direct_enablement_links_absent:true,
    indirect_activation_absence_proven:false,
  })),
  start_sequence:[
    {step:1,role:"precision"},
    {step:2,role:"nimo"},
    {step:3,role:"xiphos"},
  ],
  pre_start_revalidation:{
    exact_installed_hashes:true,
    exact_empty_data_directory:true,
    exact_plugin_sha256:true,
    exact_rootless_docker_identity:true,
    exact_tailnet_ipv4_binding:true,
    exact_nodekey_public_identity_required:true,
    nodekey_private_bytes_must_not_be_logged:true,
    unit_file_state_observation_required:true,
    operator_user_unit_dir_direct_enablement_links_absent_required:true,
    indirect_activation_absence_proven:false,
    service_inactive_required:true,
    unit_restart_no_required:true,
    p2p_port_vacant_required:true,
    precision_rpc_port_vacant_required:true,
    repo_main_clean_and_descendant_required:true,
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

const zeroFeeRuntime=JSON.parse(fs.readFileSync(
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-evidence-v1.json",
  "utf8",
));
assert.equal(
  zeroFeeRuntime.status,
  "BESU_RAW_TRANSACTION_EPOCH_DOMAIN_RUNTIME_GREEN",
);
assert.equal(zeroFeeRuntime.positive_case.transaction_type,"0x2");
assert.equal(zeroFeeRuntime.positive_case.chain_id,2050);
assert.equal(zeroFeeRuntime.positive_case.exact_marker_readback,true);
assert.equal(zeroFeeRuntime.positive_case.effective_gas_price_atoms,"0");
assert.equal(zeroFeeRuntime.positive_case.sender_native_balance_before_atoms,"0");
assert.equal(zeroFeeRuntime.positive_case.sender_native_balance_after_atoms,"0");

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

async function observeWithBalance(
  balanceHex,
  priorityHex="0x0",
  baseFeeHex="0x0",
){
  const blockHash="0x"+"6".repeat(64);
  const replies=[
    "0x802",
    "0x3",
    {number:"0x3",hash:blockHash,baseFeePerGas:baseFeeHex},
    "0x0",
    balanceHex,
    "0x0",
    "0x",
    "0xf4240",
    priorityHex,
    "0x0",
    {number:"0x3",hash:blockHash,baseFeePerGas:baseFeeHex},
  ];
  let at=0;
  const requests=[];
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
    transport:async(request)=>{
      requests.push(request);
      return replies[at++];
    },
  });
  assert.equal(at,11);
  assert.equal(requests[7].method,"eth_estimateGas");
  assert.deepEqual(
    requests[7].params[0].accessList,
    [{
      address:"0x0000000000000000000000000000000000002050",
      storageKeys:[
        "0xde7f074f5f127e9918248d0d3643786cb0a4de66256d2c40bb26beafa63c73b7",
      ],
    }],
  );
  return result;
}

const greenObserver=await observeWithBalance("0x0");
assert.equal(greenObserver.ok,true);
assert.equal(greenObserver.status,"read_only_fee_gas_funding_green");
assert.equal(greenObserver.observation.deployment_gas_estimate,"1000000");
assert.equal(greenObserver.observation.proposed_gas_limit,"1200000");
assert.equal(
  greenObserver.observation.gas_limit_multiplier_bps,
  GAS_LIMIT_MULTIPLIER_BPS_V1,
);
assert.equal(greenObserver.observation.base_fee_per_gas_wei,"0");
assert.equal(greenObserver.observation.observed_priority_fee_per_gas_wei,"0");
assert.equal(
  greenObserver.observation.max_fee_per_gas_wei,
  MAX_FEE_PER_GAS_WEI_V1,
);
assert.equal(
  greenObserver.observation.max_priority_fee_per_gas_wei,
  MAX_PRIORITY_FEE_PER_GAS_WEI_V1,
);
assert.equal(
  greenObserver.observation.maximum_deployment_gas_cost_wei,
  "0",
);
assert.equal(greenObserver.observation.minimum_additional_funding_wei,"0");
assert.equal(greenObserver.observation.deployer_funding_sufficient,true);

const greenPacket=buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
  deployment_input_plan:deploymentPlan,
  observer_result:greenObserver,
});
assert.equal(
  greenPacket.status,
  "READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN",
);
assert.match(greenPacket.packet_id,/^voiddrff1_[0-9a-f]{64}$/u);
assert.equal(greenPacket.decision.fee_caps_sufficient,true);
assert.equal(greenPacket.decision.deployer_balance_sufficient,true);
assert.equal(
  greenPacket.decision.signable_transaction_construction_authorized,
  false,
);
assert.equal(greenPacket.authority.deployer_funding,false);
assert.equal(greenPacket.authority.transaction_submission,false);
assert.equal(greenPacket.authority.chain2050_mutation,false);

const feeDriftObserver=await observeWithBalance("0x0","0x1");
assert.equal(feeDriftObserver.ok,true);
assert.equal(feeDriftObserver.status,"read_only_fee_gas_funding_hold");
assert.equal(feeDriftObserver.observation.minimum_additional_funding_wei,"0");
assert.equal(feeDriftObserver.observation.deployer_funding_sufficient,true);
assert.equal(
  feeDriftObserver.observation.fee_caps_sufficient_for_observation,
  false,
);
const feeDriftPacket=buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
  deployment_input_plan:deploymentPlan,
  observer_result:feeDriftObserver,
});
assert.equal(
  feeDriftPacket.status,
  "READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_HOLD",
);
assert.equal(feeDriftPacket.decision.fee_caps_sufficient,false);
assert.equal(feeDriftPacket.decision.deployer_balance_sufficient,true);
assert.equal(feeDriftPacket.decision.minimum_additional_funding_wei,"0");
assert.equal(feeDriftPacket.decision.deployer_funding_authorized,false);

{
  const bad=structuredClone(greenObserver);
  bad.observation.proposed_gas_limit="1199999";
  assert.throws(
    ()=>buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
      deployment_input_plan:deploymentPlan,
      observer_result:bad,
    }),
    /fee_funding_observation_formula_mismatch/u,
  );
}
{
  const bad=structuredClone(greenObserver);
  bad.transaction_submission_performed=true;
  assert.throws(
    ()=>buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
      deployment_input_plan:deploymentPlan,
      observer_result:bad,
    }),
    /fee_funding_observer_result_contract_mismatch/u,
  );
}

const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-deployment-fee-funding-v1.mjs",
  "utf8",
);
for(const required of [
  "http://127.0.0.1:18553/",
  "precision_private_qbft_service_not_active",
  "minimum_additional_funding_wei",
  "deployer_funding=false",
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

console.log("VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_OBSERVER_V1_PROOF_GREEN");
console.log("read_only_rpc_method_count=11");
console.log("zero_base_fee_supported=true");
console.log("zero_priority_fee_supported=true");
console.log("gas_limit_multiplier_bps=12000");
console.log("max_fee_per_gas_wei=0");
console.log("max_priority_fee_per_gas_wei=0");
console.log("marked_type2_zero_fee_runtime_proven=true");
console.log("zero_native_balance_deployer_supported=true");
console.log("native_funding_required=false");
console.log("nonzero_fee_observation_remains_hold=true");
console.log("deployer_funding=false");
console.log("signable_transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");
