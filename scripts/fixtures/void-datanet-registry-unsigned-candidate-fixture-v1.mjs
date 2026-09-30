#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import {getCreateAddress} from "ethers";

import {
  EXPECTED_VALIDATORS_V1,
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_ACTIVATION_V1,
  buildVoidEconomicEpoch2QbftPrivateRuntimeActivationReceiptV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1,
} from "../../tools/void-economic-epoch2-qbft-private-runtime-activation-v1.mjs";
import {
  observeDatanetRegistryDeployerResolutionV1,
} from "../../tools/datanet-content-commitment-registry-deployer-resolution-observer-v1.mjs";
import {
  PRIVATE_SUCCESSOR_RPC_V1,
  buildVoidDatanetActivationBoundDeployerObserverInputV1,
  buildVoidDatanetActivationBoundResolutionPacketV1,
} from "../../tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs";
import {
  buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
} from "../../tools/void-datanet-registry-unsigned-deployment-input-plan-v1.mjs";
import {
  buildVoidDatanetRegistryDeploymentFeeFundingPacketV1,
  observeVoidDatanetRegistryDeploymentFeeFundingV1,
} from "../../tools/void-datanet-registry-deployment-fee-funding-observer-v1.mjs";
import {
  runVoidDatanetRegistryDeploymentPreSignRevalidationV1,
} from "../../tools/void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs";
import {
  VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
  buildVoidDatanetRegistryTransactionConstructionAdmissionV1,
  validateVoidDatanetRegistryTransactionConstructionAdmissionV1,
} from "../../tools/void-datanet-registry-transaction-construction-admission-v1.mjs";
import {
  buildVoidDatanetRegistryUnsignedTransactionCandidateV1,
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1,
} from "../../tools/void-datanet-registry-unsigned-transaction-candidate-v1.mjs";

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
function requireTrue(value,label){
  if(value!==true) throw new Error("fixture_"+label+"_not_true");
}

export async function buildVoidDatanetRegistryUnsignedCandidateFixtureV1(){
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

  const compiledIdentity=JSON.parse(fs.readFileSync(
    "ops/mainnet0/datanet-content-commitment-compiled-identity-v1.json",
    "utf8",
  ));
  const publisherSelection=JSON.parse(fs.readFileSync(
    "ops/mainnet0/datanet-content-commitment-publisher-selection-v1.json",
    "utf8",
  ));
  const deployerSelection=JSON.parse(fs.readFileSync(
    "ops/mainnet0/datanet-content-commitment-registry-deployer-selection-v1.json",
    "utf8",
  ));
  const predecessor="0x0000000000000000000000000000000000000000";

  const binding=buildVoidDatanetActivationBoundDeployerObserverInputV1({
    activation_plan:activationPlan,
    activation_receipt:activationReceipt,
    deployer_address:deployerSelection.deployer_address,
    publisher_address:publisherSelection.publisher_address,
    predecessor_address:predecessor,
    compiled_identity:compiledIdentity,
  });

  const predicted=getCreateAddress({
    from:deployerSelection.deployer_address,
    nonce:0n,
  }).toLowerCase();
  if(!/^0x[0-9a-f]{40}$/u.test(predicted)){
    throw new Error("fixture_predicted_address_invalid");
  }

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
    compiled_identity:compiledIdentity,
    transport:async()=>resolutionReplies[resolutionAt++],
  });
  if(resolutionAt!==10){
    throw new Error("fixture_resolution_rpc_count_mismatch");
  }
  requireTrue(
    deployerObservation.ready_for_source_evidence_binding,
    "resolution_binding",
  );

  const resolutionPacket=buildVoidDatanetActivationBoundResolutionPacketV1({
    activation_plan:activationPlan,
    activation_receipt:activationReceipt,
    deployer_address:binding.deployer_address,
    publisher_address:binding.publisher_address,
    predecessor_address:binding.predecessor_address,
    compiled_identity:compiledIdentity,
    observer_result:deployerObservation,
  });
  const deploymentPlan=buildVoidDatanetRegistryUnsignedDeploymentInputPlanV1({
    activation_plan:activationPlan,
    activation_receipt:activationReceipt,
    resolution_packet:resolutionPacket,
    deployer_address:binding.deployer_address,
    publisher_address:binding.publisher_address,
    predecessor_address:binding.predecessor_address,
    compiled_identity:compiledIdentity,
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
      compiled_identity:compiledIdentity,
      transport:async()=>replies[at++],
    });
    if(at!==11) throw new Error("fixture_fee_rpc_count_mismatch");
    return observer;
  }

  const priorObserver=await observeFee(3,"6");
  const priorPacket=buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
    deployment_input_plan:deploymentPlan,
    observer_result:priorObserver,
  });
  if(priorPacket.status!=="READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN"){
    throw new Error("fixture_prior_fee_packet_not_green");
  }

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
      compiled_identity:compiledIdentity,
      observed_at_utc:"2030-01-01T00:06:30.000Z",
      transport:async()=>freshReplies[freshAt++],
    });
  if(freshAt!==11||preSignResult.ok!==true){
    throw new Error("fixture_pre_sign_not_green");
  }

  const freshFeePacket=preSignResult.fresh_fee_funding_packet;
  const preSignReceipt=preSignResult.receipt;
  const constructionAdmission=
    buildVoidDatanetRegistryTransactionConstructionAdmissionV1({
      deployment_input_plan:deploymentPlan,
      fresh_fee_funding_packet:freshFeePacket,
      pre_sign_revalidation_receipt:preSignReceipt,
      evaluated_at_utc:"2030-01-01T00:07:00.000Z",
    });
  validateVoidDatanetRegistryTransactionConstructionAdmissionV1(
    constructionAdmission,
    {
      deployment_input_plan:deploymentPlan,
      fresh_fee_funding_packet:freshFeePacket,
      pre_sign_revalidation_receipt:preSignReceipt,
    },
  );

  const candidate=buildVoidDatanetRegistryUnsignedTransactionCandidateV1({
    deployment_input_plan:deploymentPlan,
    fresh_fee_funding_packet:freshFeePacket,
    pre_sign_revalidation_receipt:preSignReceipt,
    construction_admission:constructionAdmission,
    constructed_at_utc:"2030-01-01T00:07:10.000Z",
    confirmation:VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
  });
  const candidateEvidence=Object.freeze({
    deployment_input_plan:deploymentPlan,
    fresh_fee_funding_packet:freshFeePacket,
    pre_sign_revalidation_receipt:preSignReceipt,
    construction_admission:constructionAdmission,
  });
  validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
    candidate,
    candidateEvidence,
  );

  return Object.freeze({
    candidate,
    candidateEvidence,
    deployerSelection,
    publisherSelection,
    compiledIdentity,
    predecessor,
    activationPlan,
    activationReceipt,
    resolutionPacket,
    deploymentPlan,
    binding,
  });
}
