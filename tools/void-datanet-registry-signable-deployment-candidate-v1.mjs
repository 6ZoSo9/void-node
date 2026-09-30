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

export const VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_V1 =
  "VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_V1";

export const VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_AUTHORITY_V1 =
  Object.freeze({
    operation_bound_confirmation_required:true,
    exact_construction_admission_required:true,
    exact_fresh_fee_packet_required:true,
    exact_pre_sign_receipt_required:true,
    exact_deployment_input_plan_required:true,
    transaction_construction:true,
    signable_transaction_materialized:true,
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
  });

const CANDIDATE_ID=/^voiddrtxc1_[0-9a-f]{64}$/u;
const ISO_MILLIS_UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const HASH=/^0x[0-9a-f]{64}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const HEX_DATA=/^0x(?:[0-9a-f]{2})+$/u;

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
function decimal(value,label){
  const raw=String(value??"");
  if(!/^(0|[1-9][0-9]{0,77})$/u.test(raw)){
    throw new Error(label+"_invalid");
  }
  return BigInt(raw);
}

export function requireVoidDatanetRegistryConstructionConfirmationV1(
  confirmation,
){
  if(
    String(confirmation||"")!==
      VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1
  ){
    throw new Error(
      "transaction_construction_explicit_confirmation_required:"+
      VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
    );
  }
  return true;
}

export function validateVoidDatanetRegistryConstructionEvidenceV1(input){
  const deploymentPlan=
    validateVoidDatanetRegistryUnsignedDeploymentInputPlanV1(
      input?.deployment_input_plan,
    );
  const fresh=
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
        fresh_fee_funding_packet:fresh.fee_packet,
        pre_sign_revalidation_receipt:preSign,
      },
    );

  if(
    admission.deployment_input_plan_id!==deploymentPlan.plan_id||
    admission.pre_sign_revalidation_id!==preSign.pre_sign_revalidation_id||
    admission.fresh_fee_funding_packet_id!==fresh.fee_packet.packet_id||
    admission.activation_plan_id!==deploymentPlan.activation_lineage.activation_plan_id||
    admission.activation_receipt_id!==
      deploymentPlan.activation_lineage.activation_receipt_id||
    admission.resolution_packet_id!==deploymentPlan.resolution_lineage.resolution_packet_id
  ){
    throw new Error("transaction_construction_evidence_lineage_mismatch");
  }

  const observation=fresh.fee_packet.observation;
  if(
    preSign.fresh_fee_funding_packet_id!==fresh.fee_packet.packet_id||
    preSign.fresh_observation_block_number!==observation.observation_block_number||
    preSign.fresh_observation_block_hash!==observation.observation_block_hash||
    preSign.continuity?.deployer_pending_nonce_stable!==true||
    preSign.continuity?.predicted_registry_address_vacant!==true||
    preSign.continuity?.creation_data_identity_stable!==true||
    preSign.continuity?.fresh_fee_caps_sufficient!==true||
    preSign.continuity?.fresh_deployer_balance_sufficient!==true||
    preSign.continuity?.minimum_additional_funding_wei!=="0"||
    fresh.fee_packet.decision?.fee_caps_sufficient!==true||
    fresh.fee_packet.decision?.deployer_balance_sufficient!==true||
    fresh.fee_packet.decision?.minimum_additional_funding_wei!=="0"
  ){
    throw new Error("transaction_construction_freshness_or_funding_mismatch");
  }

  const deployer=String(
    deploymentPlan.deployment_inputs?.deployer_address||"",
  ).toLowerCase();
  const predicted=String(
    deploymentPlan.deployment_inputs?.predicted_registry_contract_address||"",
  ).toLowerCase();
  const data=String(
    deploymentPlan.deployment_inputs?.creation_data||"",
  ).toLowerCase();
  const nonce=decimal(
    deploymentPlan.deployment_inputs?.deployer_nonce,
    "transaction_construction_nonce",
  );
  const gasLimit=decimal(
    observation.proposed_gas_limit,
    "transaction_construction_gas_limit",
  );
  const maxFee=decimal(
    observation.max_fee_per_gas_wei,
    "transaction_construction_max_fee",
  );
  const maxPriority=decimal(
    observation.max_priority_fee_per_gas_wei,
    "transaction_construction_priority_fee",
  );

  if(
    !ADDRESS.test(deployer)||
    !ADDRESS.test(predicted)||
    !HEX_DATA.test(data)||
    deploymentPlan.deployment_inputs?.deployment_value_wei!=="0"||
    observation.deployer_pending_nonce!==nonce.toString(10)||
    observation.predicted_registry_contract_address!==predicted||
    observation.predicted_registry_address_vacant!==true||
    observation.creation_data_keccak256!==
      deploymentPlan.deployment_inputs.creation_data_keccak256||
    keccak256(data)!==deploymentPlan.deployment_inputs.creation_data_keccak256||
    getCreateAddress({from:deployer,nonce}).toLowerCase()!==predicted||
    gasLimit<=0n||
    maxFee<=0n||
    maxPriority<0n||
    maxPriority>maxFee
  ){
    throw new Error("transaction_construction_candidate_inputs_invalid");
  }

  return Object.freeze({
    deployment_plan:deploymentPlan,
    fresh_fee_packet:fresh.fee_packet,
    pre_sign_receipt:preSign,
    construction_admission:admission,
    normalized:Object.freeze({
      deployer_address:deployer,
      predicted_registry_contract_address:predicted,
      nonce,
      gas_limit:gasLimit,
      max_fee_per_gas_wei:maxFee,
      max_priority_fee_per_gas_wei:maxPriority,
      creation_data:data,
    }),
  });
}

export function buildVoidDatanetRegistryConstructionHoldV1(input){
  const validated=validateVoidDatanetRegistryConstructionEvidenceV1(input);
  return Object.freeze({
    marker:VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_V1,
    version:1,
    status:"TRANSACTION_CONSTRUCTION_EXPLICIT_CONFIRMATION_REQUIRED",
    construction_admission_id:
      validated.construction_admission.construction_admission_id,
    deployment_input_plan_id:validated.deployment_plan.plan_id,
    pre_sign_revalidation_id:
      validated.pre_sign_receipt.pre_sign_revalidation_id,
    fresh_fee_funding_packet_id:validated.fresh_fee_packet.packet_id,
    expires_at_utc:validated.construction_admission.expires_at_utc,
    construction_authorized:false,
    required_confirmation:
      VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
    signable_transaction_materialized:false,
    authority:Object.freeze({
      source_plan_only:true,
      transaction_construction:false,
      signable_transaction_materialized:false,
      credential_access:false,
      wallet_access:false,
      private_key_access:false,
      transaction_signing:false,
      transaction_submission:false,
      transaction_broadcast:false,
      deployment:false,
      chain2050_mutation:false,
      funds_movement:false,
      automatic_retry:false,
    }),
  });
}

export function constructVoidDatanetRegistrySignableDeploymentCandidateV1(
  input,
){
  requireVoidDatanetRegistryConstructionConfirmationV1(input?.confirmation);
  const validated=validateVoidDatanetRegistryConstructionEvidenceV1(input);

  const constructedAt=String(input?.constructed_at_utc||"");
  const constructedMs=Date.parse(constructedAt);
  const expiresMs=Date.parse(
    String(validated.construction_admission.expires_at_utc||""),
  );
  if(
    !ISO_MILLIS_UTC.test(constructedAt)||
    !Number.isFinite(constructedMs)||
    !Number.isFinite(expiresMs)||
    constructedMs>Date.parse(
      String(validated.construction_admission.expires_at_utc),
    )||
    constructedMs<Date.parse(
      String(validated.construction_admission.evaluated_at_utc),
    )
  ){
    throw new Error("transaction_construction_admission_expired_or_time_invalid");
  }

  const n=validated.normalized;
  const tx=Transaction.from({
    type:2,
    chainId:2050,
    nonce:n.nonce,
    gasLimit:n.gas_limit,
    maxFeePerGas:n.max_fee_per_gas_wei,
    maxPriorityFeePerGas:n.max_priority_fee_per_gas_wei,
    to:null,
    value:0n,
    data:n.creation_data,
    accessList:[],
  });
  if(tx.signature!==null){
    throw new Error("transaction_construction_unexpected_signature");
  }
  if(
    !HASH.test(String(tx.unsignedHash||"").toLowerCase())||
    !/^0x(?:[0-9a-f]{2})+$/u.test(
      String(tx.unsignedSerialized||"").toLowerCase(),
    )
  ){
    throw new Error("transaction_construction_unsigned_encoding_invalid");
  }

  const candidate={
    transaction_type:2,
    chain_id:"2050",
    nonce:n.nonce.toString(10),
    from_address:n.deployer_address,
    to_address:null,
    value_wei:"0",
    gas_limit:n.gas_limit.toString(10),
    max_fee_per_gas_wei:n.max_fee_per_gas_wei.toString(10),
    max_priority_fee_per_gas_wei:
      n.max_priority_fee_per_gas_wei.toString(10),
    access_list:[],
    data:n.creation_data,
    data_keccak256:keccak256(n.creation_data),
    predicted_registry_contract_address:
      n.predicted_registry_contract_address,
    unsigned_serialized_transaction:
      tx.unsignedSerialized.toLowerCase(),
    unsigned_transaction_hash:
      tx.unsignedHash.toLowerCase(),
  };

  const material={
    marker:VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_V1,
    version:1,
    status:"SIGNABLE_EIP1559_DEPLOYMENT_CANDIDATE_CONSTRUCTED_SIGNING_HOLD",
    constructed_at_utc:constructedAt,
    construction_admission_id:
      validated.construction_admission.construction_admission_id,
    deployment_input_plan_id:validated.deployment_plan.plan_id,
    pre_sign_revalidation_id:
      validated.pre_sign_receipt.pre_sign_revalidation_id,
    fresh_fee_funding_packet_id:validated.fresh_fee_packet.packet_id,
    construction_confirmation:
      VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1,
    candidate,
    candidate_fingerprint_sha256:
      sha256(Buffer.from(canonicalJson(candidate))),
    authority:
      VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_AUTHORITY_V1,
    signing_authorized:false,
    submission_authorized:false,
    broadcast_authorized:false,
    deployment_authorized:false,
    funds_movement_authorized:false,
    next_gate:
      "separate_explicit_single_transaction_signing_authorization_bound_to_exact_unsigned_transaction_hash",
  };

  return Object.freeze({
    ...material,
    candidate_id:
      "voiddrtxc1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function validateVoidDatanetRegistrySignableDeploymentCandidateV1(
  candidate,
){
  if(
    !candidate||
    typeof candidate!=="object"||
    Array.isArray(candidate)||
    candidate.marker!==VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_V1||
    candidate.version!==1||
    candidate.status!==
      "SIGNABLE_EIP1559_DEPLOYMENT_CANDIDATE_CONSTRUCTED_SIGNING_HOLD"||
    !CANDIDATE_ID.test(String(candidate.candidate_id||""))||
    candidate.construction_confirmation!==
      VOID_DATANET_REGISTRY_TRANSACTION_CONSTRUCTION_CONFIRMATION_V1||
    candidate.signing_authorized!==false||
    candidate.submission_authorized!==false||
    candidate.broadcast_authorized!==false||
    candidate.deployment_authorized!==false||
    candidate.funds_movement_authorized!==false
  ){
    throw new Error("signable_deployment_candidate_contract_mismatch");
  }

  const material=structuredClone(candidate);
  const id=material.candidate_id;
  delete material.candidate_id;
  const expected="voiddrtxc1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expected){
    throw new Error("signable_deployment_candidate_id_mismatch");
  }

  if(
    canonicalJson(candidate.authority)!==
      canonicalJson(
        VOID_DATANET_REGISTRY_SIGNABLE_DEPLOYMENT_CANDIDATE_AUTHORITY_V1,
      )
  ){
    throw new Error("signable_deployment_candidate_authority_mismatch");
  }

  const c=candidate.candidate;
  if(
    c?.transaction_type!==2||
    c?.chain_id!=="2050"||
    !/^(0|[1-9][0-9]{0,77})$/u.test(String(c?.nonce||""))||
    c?.to_address!==null||
    c?.value_wei!=="0"||
    !/^(0|[1-9][0-9]{0,77})$/u.test(String(c?.gas_limit||""))||
    !/^(0|[1-9][0-9]{0,77})$/u.test(String(c?.max_fee_per_gas_wei||""))||
    !/^(0|[1-9][0-9]{0,77})$/u.test(
      String(c?.max_priority_fee_per_gas_wei||""),
    )||
    !Array.isArray(c?.access_list)||
    c.access_list.length!==0||
    !ADDRESS.test(String(c?.from_address||""))||
    !ADDRESS.test(String(c?.predicted_registry_contract_address||""))||
    !HEX_DATA.test(String(c?.data||""))||
    !HASH.test(String(c?.data_keccak256||""))||
    !HASH.test(String(c?.unsigned_transaction_hash||""))||
    !/^0x(?:[0-9a-f]{2})+$/u.test(
      String(c?.unsigned_serialized_transaction||""),
    )
  ){
    throw new Error("signable_deployment_candidate_fields_invalid");
  }
  return candidate;
}
