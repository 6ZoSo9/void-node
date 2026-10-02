#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {Transaction,getCreateAddress} from "ethers";

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
  runVoidDatanetRegistryDeploymentPreSignRevalidationV1,
} from "../tools/void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs";
import {
  VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
  buildVoidDatanetRegistryTransactionConstructionAdmissionV1,
  validateVoidDatanetRegistryFreshFeeFundingPacketV1,
  validateVoidDatanetRegistryTransactionConstructionAdmissionV1,
} from "../tools/void-datanet-registry-transaction-construction-admission-v1.mjs";
import {
  VOID_DATANET_REGISTRY_UNSIGNED_TRANSACTION_CANDIDATE_V1,
  buildVoidDatanetRegistryUnsignedTransactionCandidateV1,
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1,
} from "../tools/void-datanet-registry-unsigned-transaction-candidate-v1.mjs";

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
function rehashAdmission(value){
  const x=structuredClone(value);
  delete x.construction_admission_id;
  return "voiddrca1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}
function rehashCandidate(value){
  const x=structuredClone(value);
  delete x.candidate_id;
  return "voiddrtxc1_"+sha256(Buffer.from(JSON.stringify(canonical(x))));
}

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
  activationPlanMaterial,
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

const resolutionHash="0x"+"5".repeat(64);
const resolutionReplies=[
  "0x802",
  "0x2",
  {number:"0x2",hash:resolutionHash},
  "0x0",
  "0x0",
  "0xde0b6b3a7640000",
  "0x0",
  "0x",
  "0x0",
  {number:"0x2",hash:resolutionHash},
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

function feeReplies(head,hashDigit,estimate="0xf4240"){
  const headHex="0x"+BigInt(head).toString(16);
  const hash="0x"+String(hashDigit).repeat(64);
  return [
    "0x802",
    headHex,
    {number:headHex,hash,baseFeePerGas:"0x0"},
    "0x0",
    "0xde0b6b3a7640000",
    "0x0",
    "0x",
    estimate,
    "0x0",
    "0x0",
    {number:headHex,hash,baseFeePerGas:"0x0"},
  ];
}
async function observeFee(head,hashDigit,estimate){
  const replies=feeReplies(head,hashDigit,estimate);
  let at=0;
  const observer=await observeVoidDatanetRegistryDeploymentFeeFundingV1({
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
  return observer;
}

const priorObserver=await observeFee(3,"6");
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

const freshReplies=feeReplies(4,"7","0x100000");
let freshAt=0;
const preSignResult=
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
    transport:async()=>freshReplies[freshAt++],
  });
assert.equal(freshAt,11);
assert.equal(preSignResult.ok,true);

const freshPacket=preSignResult.fresh_fee_funding_packet;
const preSign=preSignResult.receipt;
assert.equal(
  validateVoidDatanetRegistryFreshFeeFundingPacketV1(
    freshPacket,
    deploymentPlan,
  ).fee_packet,
  freshPacket,
);

const admission=buildVoidDatanetRegistryTransactionConstructionAdmissionV1({
  deployment_input_plan:deploymentPlan,
  fresh_fee_funding_packet:freshPacket,
  pre_sign_revalidation_receipt:preSign,
  evaluated_at_utc:"2030-01-01T00:07:00.000Z",
});
assert.equal(
  admission.status,
  "TRANSACTION_CONSTRUCTION_CONFIRMATION_REQUIRED",
);
assert.match(admission.construction_admission_id,/^voiddrca1_[0-9a-f]{64}$/u);
assert.equal(
  validateVoidDatanetRegistryTransactionConstructionAdmissionV1(
    admission,
    {
      deployment_input_plan:deploymentPlan,
      fresh_fee_funding_packet:freshPacket,
      pre_sign_revalidation_receipt:preSign,
    },
  ),
  admission,
);
assert.equal(admission.deployment_input_plan_id,deploymentPlan.plan_id);
assert.equal(admission.pre_sign_revalidation_id,preSign.pre_sign_revalidation_id);
assert.equal(admission.fresh_fee_funding_packet_id,freshPacket.packet_id);
assert.equal(admission.expires_at_utc,preSign.valid_until_utc);
assert.equal(admission.verification.pre_sign_receipt_unexpired,true);
assert.equal(admission.verification.fresh_packet_id_bound_to_pre_sign,true);
assert.equal(admission.verification.fresh_observation_block_bound,true);
assert.equal(admission.verification.signable_transaction_materialized,false);
assert.equal(admission.authority.source_admission_only,true);
for(const [key,value] of Object.entries(admission.authority)){
  if(key==="source_admission_only") assert.equal(value,true,key);
  else assert.equal(value,false,key);
}
assert.equal(admission.construction_authorized,false);
assert.equal(
  admission.required_confirmation,
  VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
);
assert.equal(
  admission.required_confirmation,
  "constructDatanetRegistryDeploymentTransactionV1",
);

{
  assert.throws(
    ()=>buildVoidDatanetRegistryTransactionConstructionAdmissionV1({
      deployment_input_plan:deploymentPlan,
      fresh_fee_funding_packet:freshPacket,
      pre_sign_revalidation_receipt:preSign,
      evaluated_at_utc:"2030-01-01T00:09:00.000Z",
    }),
    /construction_admission_pre_sign_expired_or_time_invalid/u,
  );
}
{
  const bad=structuredClone(freshPacket);
  bad.observation.proposed_gas_limit="1";
  assert.throws(
    ()=>buildVoidDatanetRegistryTransactionConstructionAdmissionV1({
      deployment_input_plan:deploymentPlan,
      fresh_fee_funding_packet:bad,
      pre_sign_revalidation_receipt:preSign,
      evaluated_at_utc:"2030-01-01T00:07:00.000Z",
    }),
    /construction_admission_fee_packet_rebuild_mismatch/u,
  );
}
{
  const bad=structuredClone(preSign);
  bad.fresh_fee_funding_packet_id="voiddrff1_"+"0".repeat(64);
  const material=structuredClone(bad);
  delete material.pre_sign_revalidation_id;
  for(const key of [
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
  bad.pre_sign_revalidation_id=
    "voiddrpsr1_"+sha256(Buffer.from(JSON.stringify(canonical(material))));
  assert.throws(
    ()=>buildVoidDatanetRegistryTransactionConstructionAdmissionV1({
      deployment_input_plan:deploymentPlan,
      fresh_fee_funding_packet:freshPacket,
      pre_sign_revalidation_receipt:bad,
      evaluated_at_utc:"2030-01-01T00:07:00.000Z",
    }),
    /construction_admission_pre_sign_binding_mismatch/u,
  );
}
{
  const bad=structuredClone(admission);
  bad.authority.transaction_construction=true;
  bad.construction_admission_id=rehashAdmission(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryTransactionConstructionAdmissionV1(
      bad,
      {
        deployment_input_plan:deploymentPlan,
        fresh_fee_funding_packet:freshPacket,
        pre_sign_revalidation_receipt:preSign,
      },
    ),
    /transaction_construction_admission_authority_mismatch/u,
  );
}
{
  const bad=structuredClone(admission);
  bad.activation_plan_id="voide2qactp1_"+"0".repeat(64);
  bad.construction_admission_id=rehashAdmission(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryTransactionConstructionAdmissionV1(
      bad,
      {
        deployment_input_plan:deploymentPlan,
        fresh_fee_funding_packet:freshPacket,
        pre_sign_revalidation_receipt:preSign,
      },
    ),
    /transaction_construction_admission_evidence_rebuild_mismatch/u,
  );
}
{
  const bad=structuredClone(admission);
  bad.expires_at_utc="2030-01-01T00:10:00.000Z";
  bad.construction_admission_id=rehashAdmission(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryTransactionConstructionAdmissionV1(
      bad,
      {
        deployment_input_plan:deploymentPlan,
        fresh_fee_funding_packet:freshPacket,
        pre_sign_revalidation_receipt:preSign,
      },
    ),
    /transaction_construction_admission_time_invalid/u,
  );
}
{
  const bad=structuredClone(admission);
  bad.next_gate="anything_else";
  bad.construction_admission_id=rehashAdmission(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryTransactionConstructionAdmissionV1(
      bad,
      {
        deployment_input_plan:deploymentPlan,
        fresh_fee_funding_packet:freshPacket,
        pre_sign_revalidation_receipt:preSign,
      },
    ),
    /transaction_construction_admission_invalid/u,
  );
}

const candidate=buildVoidDatanetRegistryUnsignedTransactionCandidateV1({
  deployment_input_plan:deploymentPlan,
  fresh_fee_funding_packet:freshPacket,
  pre_sign_revalidation_receipt:preSign,
  construction_admission:admission,
  constructed_at_utc:"2030-01-01T00:07:10.000Z",
  confirmation:VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
});
assert.equal(
  candidate.marker,
  VOID_DATANET_REGISTRY_UNSIGNED_TRANSACTION_CANDIDATE_V1,
);
assert.equal(
  candidate.status,
  "UNSIGNED_SIGNABLE_TRANSACTION_CANDIDATE_READY_SIGNING_HOLD",
);
assert.match(candidate.candidate_id,/^voiddrtxc1_[0-9a-f]{64}$/u);
assert.equal(
  candidate.construction_confirmation,
  "constructDatanetRegistryDeploymentTransactionV1",
);
assert.equal(candidate.construction_admission_id,admission.construction_admission_id);
assert.equal(candidate.deployment_input_plan_id,deploymentPlan.plan_id);
assert.equal(candidate.fresh_fee_funding_packet_id,freshPacket.packet_id);
assert.equal(candidate.pre_sign_revalidation_id,preSign.pre_sign_revalidation_id);
assert.equal(candidate.valid_until_utc,admission.expires_at_utc);
assert.equal(candidate.transaction.transaction_type,2);
assert.equal(candidate.transaction.chain_id,"2050");
assert.equal(
  candidate.transaction.nonce,
  deploymentPlan.deployment_inputs.deployer_nonce,
);
assert.equal(
  candidate.transaction.from_address,
  deploymentPlan.deployment_inputs.deployer_address,
);
assert.equal(candidate.transaction.to_address,null);
assert.equal(candidate.transaction.value_wei,"0");
assert.equal(
  candidate.transaction.gas_limit,
  freshPacket.observation.proposed_gas_limit,
);
assert.equal(
  candidate.transaction.max_fee_per_gas_wei,
  freshPacket.observation.max_fee_per_gas_wei,
);
assert.equal(
  candidate.transaction.max_priority_fee_per_gas_wei,
  freshPacket.observation.max_priority_fee_per_gas_wei,
);
assert.equal(
  candidate.transaction.data_keccak256,
  deploymentPlan.deployment_inputs.creation_data_keccak256,
);
assert.equal(
  candidate.transaction.predicted_contract_address,
  deploymentPlan.deployment_inputs.predicted_registry_contract_address,
);
assert.match(
  candidate.transaction.unsigned_serialized_transaction,
  /^0x(?:[0-9a-f]{2})+$/u,
);
assert.match(candidate.transaction.unsigned_transaction_hash,/^0x[0-9a-f]{64}$/u);
assert.equal(
  candidate.transaction_fingerprint_sha256,
  sha256(Buffer.from(JSON.stringify(canonical(candidate.transaction)))),
);
assert.equal(candidate.verification.signature_absent,true);
assert.equal(candidate.verification.eip1559_type2_serialization_exact,true);
assert.equal(candidate.authority.transaction_construction,true);
assert.equal(candidate.authority.signable_transaction_materialized,true);
assert.equal(candidate.authority.local_candidate_file_write,true);
for(const key of [
  "rpc_call","filesystem_secret_read","credential_access","wallet_access",
  "private_key_access","deployer_funding","transaction_signing",
  "transaction_submission","transaction_broadcast","deployment",
  "chain2050_mutation","validator_mutation","token_movement","funds_movement",
  "migration_authorized","public_activation_authorized","automatic_retry",
]){
  assert.equal(candidate.authority[key],false,key);
}
assert.equal(candidate.signing_authorized,false);
assert.equal(
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
    candidate,
    {
      deployment_input_plan:deploymentPlan,
      fresh_fee_funding_packet:freshPacket,
      pre_sign_revalidation_receipt:preSign,
      construction_admission:admission,
    },
  ),
  candidate,
);

const parsedCandidate=Transaction.from(
  candidate.transaction.unsigned_serialized_transaction,
);
assert.equal(parsedCandidate.signature,null);
assert.equal(parsedCandidate.type,2);
assert.equal(parsedCandidate.chainId,2050n);
assert.equal(parsedCandidate.nonce,0);
assert.equal(parsedCandidate.to,null);
assert.equal(parsedCandidate.value,0n);
assert.equal(
  parsedCandidate.data.toLowerCase(),
  deploymentPlan.deployment_inputs.creation_data.toLowerCase(),
);
assert.equal(
  parsedCandidate.unsignedHash.toLowerCase(),
  candidate.transaction.unsigned_transaction_hash,
);

{
  assert.throws(
    ()=>buildVoidDatanetRegistryUnsignedTransactionCandidateV1({
      deployment_input_plan:deploymentPlan,
      fresh_fee_funding_packet:freshPacket,
      pre_sign_revalidation_receipt:preSign,
      construction_admission:admission,
      constructed_at_utc:"2030-01-01T00:07:10.000Z",
      confirmation:"wrongConfirmation",
    }),
    /explicit_confirmation_required:constructDatanetRegistryDeploymentTransactionV1/u,
  );
}
{
  assert.throws(
    ()=>buildVoidDatanetRegistryUnsignedTransactionCandidateV1({
      deployment_input_plan:deploymentPlan,
      fresh_fee_funding_packet:freshPacket,
      pre_sign_revalidation_receipt:preSign,
      construction_admission:admission,
      constructed_at_utc:"2030-01-01T00:09:00.000Z",
      confirmation:VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
    }),
    /unsigned_candidate_admission_expired_or_time_invalid/u,
  );
}
{
  const bad=structuredClone(candidate);
  bad.authority.transaction_signing=true;
  bad.candidate_id=rehashCandidate(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
      bad,
      {
        deployment_input_plan:deploymentPlan,
        fresh_fee_funding_packet:freshPacket,
        pre_sign_revalidation_receipt:preSign,
        construction_admission:admission,
      },
    ),
    /unsigned_candidate_authority_mismatch/u,
  );
}
{
  const bad=structuredClone(candidate);
  bad.transaction.nonce="1";
  bad.transaction_fingerprint_sha256=
    sha256(Buffer.from(JSON.stringify(canonical(bad.transaction))));
  bad.candidate_id=rehashCandidate(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
      bad,
      {
        deployment_input_plan:deploymentPlan,
        fresh_fee_funding_packet:freshPacket,
        pre_sign_revalidation_receipt:preSign,
        construction_admission:admission,
      },
    ),
    /unsigned_candidate_evidence_rebuild_mismatch/u,
  );
}
{
  const bad=structuredClone(candidate);
  bad.construction_confirmation="wrongConfirmation";
  bad.candidate_id=rehashCandidate(bad);
  assert.throws(
    ()=>validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
      bad,
      {
        deployment_input_plan:deploymentPlan,
        fresh_fee_funding_packet:freshPacket,
        pre_sign_revalidation_receipt:preSign,
        construction_admission:admission,
      },
    ),
    /unsigned_candidate_contract_invalid/u,
  );
}

const toolSource=fs.readFileSync(
  "tools/void-datanet-registry-transaction-construction-admission-v1.mjs",
  "utf8",
);
assert.ok(
  toolSource.includes(
    'VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1 =\n  "constructDatanetRegistryDeploymentTransactionV1"',
  ),
);

const runner=fs.readFileSync(
  "ops/precision/void-datanet-registry-transaction-construction-admission-v1.mjs",
  "utf8",
);
for(const required of [
  "DEPLOYMENT_INPUT_PLAN_JSON",
  "FRESH_FEE_FUNDING_PACKET_JSON",
  "PRE_SIGN_REVALIDATION_JSON",
  "construction_authorized=false",
  '"required_confirmation="+admission.required_confirmation',
  "rpc_call=false",
  "credential_access=false",
  "wallet_access=false",
  "private_key_access=false",
  "deployer_funding=false",
  "signable_transaction_materialized=false",
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
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "SigningKey",
  "Wallet(",
  "Transaction.from",
  "serializeTransaction",
  "systemctl",
  "docker ",
  "ssh ",
  "sudo ",
]){
  assert.equal(runner.includes(forbidden),false,forbidden);
}

const candidateRunner=fs.readFileSync(
  "ops/precision/void-datanet-registry-unsigned-transaction-candidate-v1.mjs",
  "utf8",
);
for(const required of [
  "explicit_confirmation_required:",
  "VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1",
  "transaction_construction=true",
  "signable_transaction_materialized=true",
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
  "signing_authorized=false",
]){
  assert.ok(candidateRunner.includes(required),required);
}
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "SigningKey",
  "Wallet(",
  "privateKey",
  "systemctl",
  "docker ",
  "ssh ",
  "sudo ",
]){
  assert.equal(candidateRunner.includes(forbidden),false,forbidden);
}

console.log("VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_ADMISSION_V1_PROOF_GREEN");
console.log("deployment_input_plan_exact=true");
console.log("fresh_fee_packet_rebuilt=true");
console.log("pre_sign_receipt_exact=true");
console.log("pre_sign_receipt_unexpired=true");
console.log("fresh_packet_id_bound=true");
console.log("fresh_observation_block_bound=true");
console.log("activation_lineage_exact=true");
console.log("construction_authorized=false");
console.log("required_confirmation=constructDatanetRegistryDeploymentTransactionV1");
console.log("rpc_call=false");
console.log("credential_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("deployer_funding=false");
console.log("signable_transaction_materialized=false");
console.log("transaction_construction=false");
console.log("transaction_signing=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("chain2050_mutation=false");
console.log("funds_movement=false");

console.log("VOID_DATANET_REGISTRY_UNSIGNED_TRANSACTION_CANDIDATE_V1_PROOF_GREEN");
console.log("exact_construction_confirmation_required=true");
console.log("eip1559_type2_unsigned_serialization=true");
console.log("candidate_evidence_rebuild_required=true");
console.log("candidate_validity_bound_to_pre_sign_expiry=true");
console.log("transaction_construction=true");
console.log("signable_transaction_materialized=true");
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
console.log("signing_authorized=false");
