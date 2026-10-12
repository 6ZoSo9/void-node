#!/usr/bin/env node
import crypto from "node:crypto";
import {
  Interface,
} from "ethers";
import {
  VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  verifyDatanetContentCommitmentObjectPreflightAgainstFingerprintV1,
} from "./datanet-content-commitment-object-preflight-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_UNSIGNED_CALL_PLAN_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_UNSIGNED_CALL_PLAN_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_UNSIGNED_CALL_PLAN_AUTHORITY_V1 = {
  source_only_plan: true,
  exact_hardened_object_preflight_required: true,
  exact_commit_calldata_materialization_only: true,
  no_dynamic_transaction_fields_bound: true,
  fresh_pre_sign_revalidation_required: true,
  rpc_call: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  signable_transaction_construction: false,
  nonce_selection: false,
  gas_limit_selection: false,
  fee_selection: false,
  transaction_broadcast: false,
  chain2050_mutation: false,
  validator_mutation: false,
  governance_mutation: false,
  runtime_service_action: false,
  work_credit_award: false,
  automatic_retry: false,
  funds_action: false,
};

const SHA256=/^[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const PLAN_ID=/^voiddccup1_[0-9a-f]{64}$/;
const COMMIT=new Interface([
  "function commit(bytes32 objectIdSha256, bytes32 contentSha256, uint64 byteLength)",
]);

function text(value){
  return typeof value==="string"?value.trim():String(value??"").trim();
}
function held(reason){
  return {
    ok:false,
    status:"held",
    marker:VOID_DATANET_CONTENT_COMMITMENT_UNSIGNED_CALL_PLAN_V1,
    version:1,
    reason,
    commit_calldata_constructed:false,
    unsigned_call_plan_constructed:false,
    signable_transaction_constructed:false,
    transaction_signing_authorized:false,
    transaction_broadcast_authorized:false,
    chain2050_write_authorized:false,
    authority:VOID_DATANET_CONTENT_COMMITMENT_UNSIGNED_CALL_PLAN_AUTHORITY_V1,
  };
}
function sha256Bytes(hex){
  return crypto.createHash("sha256")
    .update(Buffer.from(hex.slice(2),"hex"))
    .digest("hex");
}

export function buildDatanetContentCommitmentUnsignedCallPlanAgainstFingerprintV1(
  input,
  expectedFingerprint,
){
  const preflight=
    verifyDatanetContentCommitmentObjectPreflightAgainstFingerprintV1(
      input,
      expectedFingerprint,
    );
  if(preflight.ok===false){
    return held("unsigned_call_plan_preflight_held:"+preflight.reason);
  }
  if(
    preflight.status!==
      "object_uncommitted_verified_ready_for_separate_unsigned_transaction_plan"||
    preflight.object_uncommitted_preflight_verified!==true||
    preflight.ready_for_separate_unsigned_transaction_plan!==true||
    preflight.commit_calldata_construction_authorized!==false||
    preflight.transaction_construction_authorized!==false||
    preflight.transaction_signing_authorized!==false||
    preflight.transaction_broadcast_authorized!==false||
    preflight.chain2050_write_authorized!==false
  ){
    return held("unsigned_call_plan_preflight_boundary_mismatch");
  }

  const registry=text(preflight.registry_contract_address).toLowerCase();
  const publisher=text(preflight.publisher_address).toLowerCase();
  const objectId=text(preflight.object_id_sha256).toLowerCase();
  const contentSha=text(preflight.content_sha256).toLowerCase();
  const byteLength=text(preflight.byte_length);
  if(
    !ADDRESS.test(registry)||
    !ADDRESS.test(publisher)||
    !SHA256.test(objectId)||
    !SHA256.test(contentSha)||
    !/^[1-9][0-9]{0,8}$/.test(byteLength)
  ){
    return held("unsigned_call_plan_preflight_material_invalid");
  }

  let length;
  try{
    length=BigInt(byteLength);
  }catch(error){
    return held("unsigned_call_plan_byte_length_invalid");
  }
  if(length<1n||length>268435456n){
    return held("unsigned_call_plan_byte_length_invalid");
  }

  let calldata;
  try{
    calldata=COMMIT.encodeFunctionData("commit",[
      "0x"+objectId,
      "0x"+contentSha,
      length,
    ]).toLowerCase();
    const decoded=COMMIT.decodeFunctionData("commit",calldata);
    if(
      String(decoded[0]).toLowerCase()!=="0x"+objectId||
      String(decoded[1]).toLowerCase()!=="0x"+contentSha||
      BigInt(decoded[2])!==length
    ){
      return held("unsigned_call_plan_calldata_roundtrip_mismatch");
    }
  }catch(error){
    return held("unsigned_call_plan_calldata_construction_failed");
  }

  const body={
    marker:VOID_DATANET_CONTENT_COMMITMENT_UNSIGNED_CALL_PLAN_V1,
    version:1,
    status:"unsigned_call_plan_ready_for_fresh_pre_sign_revalidation",
    chain_id:"2050",
    object_preflight_id:preflight.object_preflight_id,
    preparation_intent_id:preflight.preparation_intent_id,
    sovereign_review_decision_id:preflight.sovereign_review_decision_id,
    sovereign_review_decision_sha256:
      preflight.sovereign_review_decision_sha256,
    deployment_attestation_id:preflight.deployment_attestation_id,
    compiled_identity_id:preflight.compiled_identity_id,
    source_observation:{
      block_number:preflight.observation_block_number,
      block_hash:preflight.observation_block_hash,
      object_uncommitted_preflight_verified:true,
    },
    commitment:{
      object_id_sha256:objectId,
      content_sha256:contentSha,
      byte_length:byteLength,
    },
    unsigned_call:{
      from_address:publisher,
      to_address:registry,
      value_wei:"0",
      function_signature:"commit(bytes32,bytes32,uint64)",
      calldata,
      calldata_sha256:sha256Bytes(calldata),
    },
    unbound_transaction_fields:{
      transaction_type:null,
      nonce:null,
      gas_limit:null,
      max_fee_per_gas_wei:null,
      max_priority_fee_per_gas_wei:null,
    },
    required_fresh_pre_sign_revalidation:{
      exact_plan_id_rebind_required:true,
      preparation_authority_reverification_required:true,
      deployment_runtime_reverification_required:true,
      registry_views_reverification_required:true,
      object_is_committed_false_twice_required:true,
      same_fixed_block_required:true,
      block_hash_revalidation_required:true,
      pending_nonce_binding_required:true,
      gas_estimate_required:true,
      fee_binding_required:true,
      publisher_native_gas_balance_check_required:true,
      prior_observation_never_authorizes_signing:true,
    },
    materialization:{
      commit_calldata_constructed:true,
      unsigned_call_plan_constructed:true,
      signable_transaction_constructed:false,
    },
    authority:{
      calldata_materialization_only:true,
      rpc_call_authorized:false,
      credential_access_authorized:false,
      wallet_access_authorized:false,
      nonce_selection_authorized:false,
      gas_limit_selection_authorized:false,
      fee_selection_authorized:false,
      signable_transaction_construction_authorized:false,
      transaction_signing_authorized:false,
      transaction_broadcast_authorized:false,
      chain2050_write_authorized:false,
      validator_mutation_authorized:false,
      governance_mutation_authorized:false,
      runtime_service_action_authorized:false,
      work_credit_award_authorized:false,
      funds_action_authorized:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      "fresh_pre_sign_revalidation_and_dynamic_transaction_binding_v1",
  };
  const planId="voiddccup1_"+sha256(canonicalJson(body));
  if(!PLAN_ID.test(planId)){
    return held("unsigned_call_plan_id_invalid");
  }
  return {
    ok:true,
    ...body,
    unsigned_call_plan_id:planId,
  };
}

export function buildDatanetContentCommitmentUnsignedCallPlanV1(input){
  return buildDatanetContentCommitmentUnsignedCallPlanAgainstFingerprintV1(
    input,
    VOID_DATANET_PHASE0_SOVEREIGN_PRIMARY_DER_SHA256_V1,
  );
}

export const DATANET_CONTENT_COMMITMENT_CALL_INTERFACE_V1=COMMIT;
