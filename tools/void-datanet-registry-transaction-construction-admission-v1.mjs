#!/usr/bin/env node
import crypto from "node:crypto";

import {
  VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_OBSERVER_V1,
  buildVoidDatanetRegistryDeploymentFeeFundingPacketV1,
} from "./void-datanet-registry-deployment-fee-funding-observer-v1.mjs";
import {
  validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1,
} from "./void-datanet-registry-unsigned-deployment-input-plan-v1.mjs";
import {
  PRE_SIGN_VALIDITY_SECONDS_V1,
  validateVoidDatanetRegistryDeploymentPreSignRevalidationV1,
} from "./void-datanet-registry-deployment-pre-sign-revalidation-v1.mjs";

export const VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_ADMISSION_V1 =
  "VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_ADMISSION_V1";
export const VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1 =
  "constructDatanetRegistryDeploymentTransactionV1";

const FEE_PACKET_ID=/^voiddrff1_[0-9a-f]{64}$/u;
const PRE_SIGN_ID=/^voiddrpsr1_[0-9a-f]{64}$/u;
const DEPLOYMENT_PLAN_ID=/^voiddrudp1_[0-9a-f]{64}$/u;
const ACTIVATION_PLAN_ID=/^voide2qactp1_[0-9a-f]{64}$/u;
const ACTIVATION_RECEIPT_ID=/^voide2qactr1_[0-9a-f]{64}$/u;
const RESOLUTION_PACKET_ID=/^voiddrrab1_[0-9a-f]{64}$/u;
const ISO_MILLIS_UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

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

export function validateVoidDatanetRegistryFreshFeeFundingPacketV1(
  packet,
  deploymentPlanInput,
){
  const deploymentPlan=
    validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(
      deploymentPlanInput,
    );
  if(!packet||typeof packet!=="object"||Array.isArray(packet)){
    throw new Error("construction_admission_fee_packet_invalid");
  }
  if(
    !FEE_PACKET_ID.test(String(packet.packet_id||""))||
    packet.status!=="READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_GREEN"
  ){
    throw new Error("construction_admission_fee_packet_not_green");
  }

  const observerResult={
    ok:true,
    marker:VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_OBSERVER_V1,
    version:1,
    status:"read_only_fee_gas_funding_green",
    rpc_url_fingerprint_sha256:packet.rpc_url_fingerprint_sha256,
    rpc_methods_used:packet.rpc_methods_used,
    observation:packet.observation,
    read_only_observation_complete:true,
    rpc_call_performed:true,
    mutation_performed:false,
    credential_access_performed:false,
    wallet_access_performed:false,
    private_key_access_performed:false,
    deployer_funding_performed:false,
    signable_transaction_constructed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_mutation_performed:false,
    funds_movement_performed:false,
    automatic_retry_allowed:false,
    next_gate:
      "fresh_read_only_pre_sign_revalidation_before_signable_transaction_construction",
  };
  let rebuilt;
  try{
    rebuilt=buildVoidDatanetRegistryDeploymentFeeFundingPacketV1({
      deployment_input_plan:deploymentPlan,
      observer_result:observerResult,
    });
  }catch{
    throw new Error("construction_admission_fee_packet_rebuild_mismatch");
  }
  if(canonicalJson(rebuilt)!==canonicalJson(packet)){
    throw new Error("construction_admission_fee_packet_rebuild_mismatch");
  }
  if(
    packet.decision?.fee_caps_sufficient!==true||
    packet.decision?.deployer_balance_sufficient!==true||
    packet.decision?.minimum_additional_funding_wei!=="0"||
    packet.decision?.signable_transaction_construction_authorized!==false||
    packet.decision?.deployer_funding_authorized!==false||
    packet.decision?.transaction_signing_authorized!==false||
    packet.decision?.transaction_broadcast_authorized!==false||
    packet.decision?.deployment_authorized!==false||
    packet.decision?.chain2050_write_authorized!==false
  ){
    throw new Error("construction_admission_fee_packet_authority_mismatch");
  }
  return Object.freeze({
    deployment_plan:deploymentPlan,
    fee_packet:packet,
  });
}

export function buildVoidDatanetRegistryTransactionConstructionAdmissionV1(
  input,
){
  const validated=validateVoidDatanetRegistryFreshFeeFundingPacketV1(
    input?.fresh_fee_funding_packet,
    input?.deployment_input_plan,
  );
  const preSign=
    validateVoidDatanetRegistryDeploymentPreSignRevalidationV1(
      input?.pre_sign_revalidation_receipt,
    );

  if(
    !PRE_SIGN_ID.test(String(preSign.pre_sign_revalidation_id||""))||
    preSign.deployment_input_plan_id!==validated.deployment_plan.plan_id||
    preSign.fresh_fee_funding_packet_id!==validated.fee_packet.packet_id||
    preSign.fresh_observation_block_number!==
      validated.fee_packet.observation.observation_block_number||
    preSign.fresh_observation_block_hash!==
      validated.fee_packet.observation.observation_block_hash||
    preSign.activation_plan_id!==
      validated.deployment_plan.activation_lineage.activation_plan_id||
    preSign.activation_receipt_id!==
      validated.deployment_plan.activation_lineage.activation_receipt_id||
    preSign.resolution_packet_id!==
      validated.deployment_plan.resolution_lineage.resolution_packet_id
  ){
    throw new Error("construction_admission_pre_sign_binding_mismatch");
  }

  const evaluatedAt=String(input?.evaluated_at_utc||"");
  const evaluatedMs=Date.parse(evaluatedAt);
  const observedMs=Date.parse(String(preSign.observed_at_utc||""));
  const validMs=Date.parse(String(preSign.valid_until_utc||""));
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(evaluatedAt)||
    !Number.isFinite(evaluatedMs)||
    !Number.isFinite(observedMs)||
    !Number.isFinite(validMs)||
    evaluatedMs<observedMs||
    evaluatedMs>validMs
  ){
    throw new Error("construction_admission_pre_sign_expired_or_time_invalid");
  }

  const material={
    marker:VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_ADMISSION_V1,
    version:1,
    status:"TRANSACTION_CONSTRUCTION_CONFIRMATION_REQUIRED",
    evaluated_at_utc:evaluatedAt,
    expires_at_utc:preSign.valid_until_utc,
    deployment_input_plan_id:validated.deployment_plan.plan_id,
    pre_sign_revalidation_id:preSign.pre_sign_revalidation_id,
    fresh_fee_funding_packet_id:validated.fee_packet.packet_id,
    activation_plan_id:validated.deployment_plan.activation_lineage.activation_plan_id,
    activation_receipt_id:
      validated.deployment_plan.activation_lineage.activation_receipt_id,
    resolution_packet_id:
      validated.deployment_plan.resolution_lineage.resolution_packet_id,
    verification:{
      deployment_input_plan_exact:true,
      fresh_fee_packet_exact:true,
      fresh_fee_packet_green:true,
      pre_sign_receipt_exact:true,
      pre_sign_receipt_unexpired:true,
      fresh_packet_id_bound_to_pre_sign:true,
      fresh_observation_block_bound:true,
      activation_lineage_exact:true,
      fee_caps_sufficient:true,
      deployer_balance_sufficient:true,
      predicted_registry_address_vacant:true,
      deployer_pending_nonce_revalidated:true,
      creation_data_identity_exact:true,
      signable_transaction_materialized:false,
    },
    authority:{
      source_admission_only:true,
      rpc_call:false,
      filesystem_secret_read:false,
      credential_access:false,
      wallet_access:false,
      private_key_access:false,
      deployer_funding:false,
      signable_transaction_materialized:false,
      transaction_construction:false,
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
    construction_authorized:false,
    required_confirmation:
      VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
    next_gate:
      "separate_explicit_operation_bound_confirmation_to_construct_exact_signable_eip1559_registry_deployment_candidate",
  };

  return Object.freeze({
    ...material,
    construction_admission_id:
      "voiddrca1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistryTransactionConstructionAdmissionV1(
  admission,
  evidence,
){
  if(
    !admission||
    typeof admission!=="object"||
    Array.isArray(admission)||
    admission.marker!==VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_ADMISSION_V1||
    admission.version!==1||
    admission.status!=="TRANSACTION_CONSTRUCTION_CONFIRMATION_REQUIRED"||
    !/^voiddrca1_[0-9a-f]{64}$/u.test(
      String(admission.construction_admission_id||""),
    )||
    admission.construction_authorized!==false||
    admission.required_confirmation!==
      VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1||
    admission.next_gate!==
      "separate_explicit_operation_bound_confirmation_to_construct_exact_signable_eip1559_registry_deployment_candidate"||
    !DEPLOYMENT_PLAN_ID.test(String(admission.deployment_input_plan_id||""))||
    !PRE_SIGN_ID.test(String(admission.pre_sign_revalidation_id||""))||
    !FEE_PACKET_ID.test(String(admission.fresh_fee_funding_packet_id||""))||
    !ACTIVATION_PLAN_ID.test(String(admission.activation_plan_id||""))||
    !ACTIVATION_RECEIPT_ID.test(String(admission.activation_receipt_id||""))||
    !RESOLUTION_PACKET_ID.test(String(admission.resolution_packet_id||""))||
    admission.next_gate!==
      "separate_explicit_operation_bound_confirmation_to_construct_exact_signable_eip1559_registry_deployment_candidate"||
    !ISO_MILLIS_UTC.test(String(admission.evaluated_at_utc||""))||
    !ISO_MILLIS_UTC.test(String(admission.expires_at_utc||""))
  ){
    throw new Error("transaction_construction_admission_invalid");
  }

  const material=structuredClone(admission);
  const id=material.construction_admission_id;
  delete material.construction_admission_id;
  const expected="voiddrca1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expected){
    throw new Error("transaction_construction_admission_id_mismatch");
  }

  const expectedVerification={
    deployment_input_plan_exact:true,
    fresh_fee_packet_exact:true,
    fresh_fee_packet_green:true,
    pre_sign_receipt_exact:true,
    pre_sign_receipt_unexpired:true,
    fresh_packet_id_bound_to_pre_sign:true,
    fresh_observation_block_bound:true,
    activation_lineage_exact:true,
    fee_caps_sufficient:true,
    deployer_balance_sufficient:true,
    predicted_registry_address_vacant:true,
    deployer_pending_nonce_revalidated:true,
    creation_data_identity_exact:true,
    signable_transaction_materialized:false,
  };
  if(
    canonicalJson(admission.verification)!==
      canonicalJson(expectedVerification)
  ){
    throw new Error("transaction_construction_admission_verification_mismatch");
  }

  const expectedAuthority={
    source_admission_only:true,
    rpc_call:false,
    filesystem_secret_read:false,
    credential_access:false,
    wallet_access:false,
    private_key_access:false,
    deployer_funding:false,
    signable_transaction_materialized:false,
    transaction_construction:false,
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
  if(canonicalJson(admission.authority)!==canonicalJson(expectedAuthority)){
    throw new Error("transaction_construction_admission_authority_mismatch");
  }

  const evaluatedMs=Date.parse(String(admission.evaluated_at_utc||""));
  const expiresMs=Date.parse(String(admission.expires_at_utc||""));
  if(
    !Number.isFinite(evaluatedMs)||
    !Number.isFinite(expiresMs)||
    evaluatedMs>expiresMs||
    expiresMs-evaluatedMs>PRE_SIGN_VALIDITY_SECONDS_V1*1000
  ){
    throw new Error("transaction_construction_admission_time_invalid");
  }

  if(!evidence||typeof evidence!=="object"||Array.isArray(evidence)){
    throw new Error("transaction_construction_admission_evidence_required");
  }
  let rebuilt;
  try{
    rebuilt=buildVoidDatanetRegistryTransactionConstructionAdmissionV1({
      deployment_input_plan:evidence.deployment_input_plan,
      fresh_fee_funding_packet:evidence.fresh_fee_funding_packet,
      pre_sign_revalidation_receipt:evidence.pre_sign_revalidation_receipt,
      evaluated_at_utc:admission.evaluated_at_utc,
    });
  }catch(error){
    throw new Error(
      "transaction_construction_admission_evidence_rebuild_failed:"+
      String(error?.message||error).slice(0,160),
    );
  }
  if(canonicalJson(rebuilt)!==canonicalJson(admission)){
    throw new Error("transaction_construction_admission_evidence_rebuild_mismatch");
  }
  return admission;
}
