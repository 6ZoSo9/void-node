#!/usr/bin/env node
import crypto from "node:crypto";
import {Transaction,getCreateAddress,keccak256} from "ethers";

import {
  VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
  validateVoidDatanetRegistryFreshFeeFundingPacketV1,
  validateVoidDatanetRegistryTransactionConstructionAdmissionV1,
} from "./void-datanet-registry-transaction-construction-admission-v1.mjs";
import {
  validateVoidDatanetRegistryDeploymentPreSignRevalidationV1,
} from "./void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs";
import {
  validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
} from "./void-datanet-registry-unsigned-deployment-input-plan-v1.mjs";

export const VOID_DATANET_REGISTRY_UNSIGNED_TRANSACTION_CANDIDATE_V1 =
  "VOID_DATANET_REGISTRY_UNSIGNED_TRANSACTION_CANDIDATE_V1";

const ADDRESS=/^0x[0-9a-f]{40}$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const HEX_BYTES=/^0x(?:[0-9a-f]{2})+$/u;
const ADMISSION_ID=/^voiddrca1_[0-9a-f]{64}$/u;
const PRE_SIGN_ID=/^voiddrpsr1_[0-9a-f]{64}$/u;
const FEE_PACKET_ID=/^voiddrff1_[0-9a-f]{64}$/u;
const PLAN_ID=/^voiddrudp1_[0-9a-f]{64}$/u;

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function sha256HexBytes(value){
  const raw=String(value||"").toLowerCase();
  if(!HEX_BYTES.test(raw)) return "";
  return crypto
    .createHash("sha256")
    .update(Buffer.from(raw.slice(2),"hex"))
    .digest("hex");
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
function decimal(value,label){
  const raw=String(value??"");
  if(!/^(0|[1-9][0-9]{0,77})$/u.test(raw)){
    throw new Error(label+"_invalid");
  }
  return BigInt(raw);
}
function canonicalTimestamp(value,label){
  const raw=String(value||"");
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(raw)||
    !Number.isFinite(Date.parse(raw))
  ){
    throw new Error(label+"_invalid");
  }
  return raw;
}

function bindEvidence(input){
  const deploymentPlan=
    validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(
      input?.deployment_input_plan,
    );
  const fee=
    validateVoidDatanetRegistryFreshFeeFundingPacketV1(
      input?.fresh_fee_funding_packet,
      deploymentPlan,
    );
  const preSign=
    validateVoidDatanetRegistryDeploymentPreSignRevalidationV1(
      input?.pre_sign_revalidation_receipt,
    );
  const admission=
    validateVoidDatanetRegistryTransactionConstructionAdmissionV1(
      input?.construction_admission,
      {
        deployment_input_plan:deploymentPlan,
        fresh_fee_funding_packet:fee.fee_packet,
        pre_sign_revalidation_receipt:preSign,
      },
    );

  if(
    !PLAN_ID.test(String(deploymentPlan.plan_id||""))||
    !FEE_PACKET_ID.test(String(fee.fee_packet.packet_id||""))||
    !PRE_SIGN_ID.test(String(preSign.pre_sign_revalidation_id||""))||
    !ADMISSION_ID.test(String(admission.construction_admission_id||""))||
    admission.deployment_input_plan_id!==deploymentPlan.plan_id||
    admission.fresh_fee_funding_packet_id!==fee.fee_packet.packet_id||
    admission.pre_sign_revalidation_id!==preSign.pre_sign_revalidation_id||
    admission.expires_at_utc!==preSign.valid_until_utc
  ){
    throw new Error("unsigned_candidate_evidence_binding_mismatch");
  }

  return Object.freeze({
    deployment_plan:deploymentPlan,
    fee_packet:fee.fee_packet,
    pre_sign:preSign,
    admission,
  });
}

function compileCandidate(input,{requireConfirmation}){
  const evidence=bindEvidence(input);
  const constructedAt=canonicalTimestamp(
    input?.constructed_at_utc,
    "unsigned_candidate_constructed_at",
  );
  const constructedMs=Date.parse(constructedAt);
  const observedMs=Date.parse(evidence.pre_sign.observed_at_utc);
  const expiresMs=Date.parse(evidence.admission.expires_at_utc);
  if(
    constructedMs<observedMs||
    constructedMs>expiresMs
  ){
    throw new Error("unsigned_candidate_admission_expired_or_time_invalid");
  }

  if(
    requireConfirmation&&
    input?.confirmation!==
      VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1
  ){
    throw new Error(
      "explicit_confirmation_required:"+
      VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
    );
  }

  const plan=evidence.deployment_plan;
  const packet=evidence.fee_packet;
  const deployer=String(plan.deployment_inputs.deployer_address||"").toLowerCase();
  const predicted=String(
    plan.deployment_inputs.predicted_registry_contract_address||"",
  ).toLowerCase();
  const data=String(plan.deployment_inputs.creation_data||"").toLowerCase();

  if(
    !ADDRESS.test(deployer)||
    !ADDRESS.test(predicted)||
    !HEX_BYTES.test(data)||
    keccak256(data)!==plan.deployment_inputs.creation_data_keccak256||
    plan.deployment_inputs.deployment_value_wei!=="0"||
    packet.observation.predicted_registry_address_vacant!==true||
    packet.observation.minimum_additional_funding_wei!=="0"||
    packet.observation.deployer_funding_sufficient!==true||
    packet.decision.fee_caps_sufficient!==true||
    packet.decision.deployer_balance_sufficient!==true
  ){
    throw new Error("unsigned_candidate_source_input_not_green");
  }

  const nonce=decimal(plan.deployment_inputs.deployer_nonce,"unsigned_candidate_nonce");
  if(nonce>BigInt(Number.MAX_SAFE_INTEGER)){
    throw new Error("unsigned_candidate_nonce_exceeds_safe_integer");
  }
  const gasLimit=decimal(
    packet.observation.proposed_gas_limit,
    "unsigned_candidate_gas_limit",
  );
  const maxFee=decimal(
    packet.observation.max_fee_per_gas_wei,
    "unsigned_candidate_max_fee",
  );
  const maxPriority=decimal(
    packet.observation.max_priority_fee_per_gas_wei,
    "unsigned_candidate_max_priority",
  );
  if(
    gasLimit<=0n||
    maxFee<0n||
    maxPriority<0n||
    maxPriority>maxFee
  ){
    throw new Error("unsigned_candidate_fee_or_gas_invalid");
  }

  const derived=getCreateAddress({from:deployer,nonce}).toLowerCase();
  if(derived!==predicted){
    throw new Error("unsigned_candidate_predicted_address_mismatch");
  }

  const tx=Transaction.from({
    type:2,
    chainId:2050,
    nonce,
    gasLimit,
    maxFeePerGas:maxFee,
    maxPriorityFeePerGas:maxPriority,
    to:null,
    value:0n,
    data,
  });
  if(tx.signature!==null){
    throw new Error("unsigned_candidate_unexpected_signature");
  }
  if(
    typeof tx.unsignedSerialized!=="string"||
    !HEX_BYTES.test(tx.unsignedSerialized.toLowerCase())||
    !HASH.test(String(tx.unsignedHash||"").toLowerCase())
  ){
    throw new Error("unsigned_candidate_serialization_invalid");
  }

  const transaction={
    transaction_type:2,
    chain_id:"2050",
    nonce:nonce.toString(10),
    from_address:deployer,
    to_address:null,
    value_wei:"0",
    gas_limit:gasLimit.toString(10),
    max_fee_per_gas_wei:maxFee.toString(10),
    max_priority_fee_per_gas_wei:maxPriority.toString(10),
    data_sha256:sha256HexBytes(data),
    data_keccak256:keccak256(data),
    predicted_contract_address:predicted,
    unsigned_serialized_transaction:tx.unsignedSerialized.toLowerCase(),
    unsigned_transaction_hash:tx.unsignedHash.toLowerCase(),
  };
  const material={
    marker:VOID_DATANET_REGISTRY_UNSIGNED_TRANSACTION_CANDIDATE_V1,
    version:1,
    status:"UNSIGNED_SIGNABLE_TRANSACTION_CANDIDATE_READY_SIGNING_HOLD",
    construction_confirmation:
      VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
    constructed_at_utc:constructedAt,
    valid_until_utc:evidence.admission.expires_at_utc,
    deployment_input_plan_id:plan.plan_id,
    fresh_fee_funding_packet_id:packet.packet_id,
    pre_sign_revalidation_id:evidence.pre_sign.pre_sign_revalidation_id,
    construction_admission_id:evidence.admission.construction_admission_id,
    activation_plan_id:plan.activation_lineage.activation_plan_id,
    activation_receipt_id:plan.activation_lineage.activation_receipt_id,
    resolution_packet_id:plan.resolution_lineage.resolution_packet_id,
    transaction,
    transaction_fingerprint_sha256:
      sha256(Buffer.from(canonicalJson(transaction))),
    verification:{
      construction_confirmation_exact:true,
      construction_admission_exact:true,
      construction_admission_unexpired:true,
      deployment_input_plan_exact:true,
      fresh_fee_packet_exact:true,
      fresh_fee_packet_green:true,
      pre_sign_receipt_exact:true,
      deployer_nonce_exact:true,
      predicted_contract_address_exact:true,
      predicted_contract_address_vacant:true,
      creation_data_exact:true,
      gas_limit_exact:true,
      fee_caps_exact:true,
      deployer_funding_sufficient:true,
      eip1559_type2_serialization_exact:true,
      signature_absent:true,
    },
    authority:{
      transaction_construction:true,
      signable_transaction_materialized:true,
      local_candidate_file_write:true,
      rpc_call:false,
      filesystem_secret_read:false,
      credential_access:false,
      wallet_access:false,
      private_key_access:false,
      deployer_funding:false,
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
    signing_authorized:false,
    next_gate:
      "bind_exact_deployer_signer_identity_then_fresh_read_only_revalidation_and_separate_signing_authorization",
  };

  return Object.freeze({
    ...material,
    candidate_id:
      "voiddrtxc1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function buildVoidDatanetRegistryUnsignedTransactionCandidateV1(input){
  return compileCandidate(input,{requireConfirmation:true});
}

export function validateVoidDatanetRegistryUnsignedTransactionCandidateV1(
  candidate,
  evidence,
){
  if(
    !candidate||
    typeof candidate!=="object"||
    Array.isArray(candidate)||
    candidate.marker!==VOID_DATANET_REGISTRY_UNSIGNED_TRANSACTION_CANDIDATE_V1||
    candidate.version!==1||
    candidate.status!==
      "UNSIGNED_SIGNABLE_TRANSACTION_CANDIDATE_READY_SIGNING_HOLD"||
    candidate.construction_confirmation!==
      VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1||
    !/^voiddrtxc1_[0-9a-f]{64}$/u.test(String(candidate.candidate_id||""))||
    candidate.signing_authorized!==false||
    candidate.next_gate!==
      "bind_exact_deployer_signer_identity_then_fresh_read_only_revalidation_and_separate_signing_authorization"
  ){
    throw new Error("unsigned_candidate_contract_invalid");
  }

  const material=structuredClone(candidate);
  const id=material.candidate_id;
  delete material.candidate_id;
  const expectedId=
    "voiddrtxc1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expectedId){
    throw new Error("unsigned_candidate_id_mismatch");
  }

  const expectedAuthority={
    transaction_construction:true,
    signable_transaction_materialized:true,
    local_candidate_file_write:true,
    rpc_call:false,
    filesystem_secret_read:false,
    credential_access:false,
    wallet_access:false,
    private_key_access:false,
    deployer_funding:false,
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
  if(canonicalJson(candidate.authority)!==canonicalJson(expectedAuthority)){
    throw new Error("unsigned_candidate_authority_mismatch");
  }

  const expectedVerification={
    construction_confirmation_exact:true,
    construction_admission_exact:true,
    construction_admission_unexpired:true,
    deployment_input_plan_exact:true,
    fresh_fee_packet_exact:true,
    fresh_fee_packet_green:true,
    pre_sign_receipt_exact:true,
    deployer_nonce_exact:true,
    predicted_contract_address_exact:true,
    predicted_contract_address_vacant:true,
    creation_data_exact:true,
    gas_limit_exact:true,
    fee_caps_exact:true,
    deployer_funding_sufficient:true,
    eip1559_type2_serialization_exact:true,
    signature_absent:true,
  };
  if(canonicalJson(candidate.verification)!==canonicalJson(expectedVerification)){
    throw new Error("unsigned_candidate_verification_mismatch");
  }

  if(
    !evidence||
    typeof evidence!=="object"||
    Array.isArray(evidence)
  ){
    throw new Error("unsigned_candidate_evidence_required");
  }

  let rebuilt;
  try{
    rebuilt=compileCandidate(
      {
        deployment_input_plan:evidence.deployment_input_plan,
        fresh_fee_funding_packet:evidence.fresh_fee_funding_packet,
        pre_sign_revalidation_receipt:evidence.pre_sign_revalidation_receipt,
        construction_admission:evidence.construction_admission,
        constructed_at_utc:candidate.constructed_at_utc,
      },
      {requireConfirmation:false},
    );
  }catch(error){
    throw new Error(
      "unsigned_candidate_evidence_rebuild_failed:"+
      String(error?.message||error).slice(0,160),
    );
  }
  if(canonicalJson(rebuilt)!==canonicalJson(candidate)){
    throw new Error("unsigned_candidate_evidence_rebuild_mismatch");
  }

  const tx=candidate.transaction;
  if(
    tx?.transaction_type!==2||
    tx?.chain_id!=="2050"||
    tx?.to_address!==null||
    tx?.value_wei!=="0"||
    !ADDRESS.test(String(tx?.from_address||""))||
    !ADDRESS.test(String(tx?.predicted_contract_address||""))||
    !HASH.test(String(tx?.unsigned_transaction_hash||""))||
    !HEX_BYTES.test(String(tx?.unsigned_serialized_transaction||""))
  ){
    throw new Error("unsigned_candidate_transaction_shape_invalid");
  }

  const parsed=Transaction.from(tx.unsigned_serialized_transaction);
  if(
    parsed.signature!==null||
    parsed.type!==2||
    parsed.chainId!==2050n||
    parsed.nonce!==Number(decimal(tx.nonce,"unsigned_candidate_nonce"))||
    parsed.gasLimit!==decimal(tx.gas_limit,"unsigned_candidate_gas_limit")||
    parsed.maxFeePerGas!==
      decimal(tx.max_fee_per_gas_wei,"unsigned_candidate_max_fee")||
    parsed.maxPriorityFeePerGas!==
      decimal(tx.max_priority_fee_per_gas_wei,"unsigned_candidate_max_priority")||
    parsed.to!==null||
    parsed.value!==0n||
    parsed.data.toLowerCase()!==
      String(evidence.deployment_input_plan.deployment_inputs.creation_data).toLowerCase()||
    parsed.unsignedHash.toLowerCase()!==tx.unsigned_transaction_hash
  ){
    throw new Error("unsigned_candidate_transaction_parse_mismatch");
  }

  return candidate;
}
