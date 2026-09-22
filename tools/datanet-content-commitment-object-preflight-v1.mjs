#!/usr/bin/env node
import crypto from "node:crypto";
import {
  Interface,
  getAddress,
} from "ethers";
import {
  VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_V1,
} from "./datanet-content-commitment-deployment-attestation-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_AUTHORITY_V1 = {
  pure_observation_validation_only: true,
  approved_preparation_intent_required: true,
  exact_deployment_attestation_required: true,
  exact_commitment_tuple_required: true,
  fixed_block_observation_required: true,
  repeated_is_committed_observation_required: true,
  block_hash_revalidation_required: true,
  ready_for_separate_unsigned_transaction_plan_may_be_true: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  commit_calldata_construction: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_mutation: false,
  validator_mutation: false,
  governance_mutation: false,
  runtime_service_action: false,
  work_credit_award: false,
  funds_action: false,
};

const HASH=/^0x[0-9a-f]{64}$/;
const SHA256=/^[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const PREFLIGHT_ID=/^voiddccop1_[0-9a-f]{64}$/;
const VIEWS=new Interface([
  "function registryVersion() view returns (uint256)",
  "function maxObjectBytes() view returns (uint64)",
  "function publisher() view returns (address)",
  "function predecessor() view returns (address)",
  "function isCommitted(bytes32 objectIdSha256) view returns (bool)",
]);

function text(value){
  return typeof value==="string"?value.trim():String(value??"").trim();
}
function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function address(value){
  const raw=text(value);
  if(!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try{
    const normalized=getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized)?normalized:"";
  }catch(error){
    return "";
  }
}
function hash(value){
  const raw=text(value).toLowerCase();
  return HASH.test(raw)?raw:"";
}
function sha(value){
  const raw=text(value).toLowerCase();
  return SHA256.test(raw)?raw:"";
}
function decimal(value,{positive=false}={}){
  try{
    const raw=text(value);
    if(!/^(0|[1-9][0-9]{0,77})$/.test(raw)) return null;
    const parsed=BigInt(raw);
    if(parsed<0n||(positive&&parsed===0n)) return null;
    return parsed;
  }catch(error){
    return null;
  }
}
function fail(reason,detail=undefined){
  return {
    ok:false,
    status:"held",
    marker:VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_V1,
    version:1,
    reason,
    ...(detail===undefined?{}:{detail}),
    object_uncommitted_preflight_verified:false,
    ready_for_separate_unsigned_transaction_plan:false,
    commit_calldata_construction_authorized:false,
    transaction_construction_authorized:false,
    transaction_signing_authorized:false,
    transaction_broadcast_authorized:false,
    chain2050_write_authorized:false,
    authority:VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_AUTHORITY_V1,
  };
}

function validatePreparationIntent(value){
  if(!plain(value)) return {ok:false,reason:"preparation_intent_invalid"};
  if(
    value.marker!=="VOID_DATANET_PHASE0_CANONICAL_PREPARATION_INTENT_V1"||
    value.version!==1||
    value.status!=="PREPARATION_INTENT_ONLY"||
    value.chain_id!==2050||
    value.phase!==0||
    value.authority_mode!=="PHASE0_OPERATOR_ROOTED"||
    typeof value.preparation_intent_id!=="string"||
    !/^voiddcpi1_[0-9a-f]{64}$/.test(value.preparation_intent_id)
  ){
    return {ok:false,reason:"preparation_intent_contract_mismatch"};
  }
  const {preparation_intent_id:id,...body}=value;
  if(id!=="voiddcpi1_"+sha256(canonicalJson(body))){
    return {ok:false,reason:"preparation_intent_id_mismatch"};
  }
  if(
    value.sovereign_review?.decision!==
      "APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION"||
    value.sovereign_review?.separate_canonical_preparation_eligible!==true||
    value.deployment_binding?.status!=="UNBOUND_REQUIRED"||
    value.required_preflight?.fresh_read_only_is_committed_check_required!==true||
    value.authority?.preparation_intent_only!==true||
    value.authority?.transaction_construction_authorized!==false||
    value.authority?.transaction_signing_authorized!==false||
    value.authority?.transaction_broadcast_authorized!==false||
    value.authority?.chain2050_write_authorized!==false
  ){
    return {ok:false,reason:"preparation_intent_boundary_mismatch"};
  }
  const object=value.commitment;
  if(
    !plain(object)||
    !sha(object.object_id_sha256)||
    !sha(object.content_sha256)||
    decimal(object.byte_length,{positive:true})===null
  ){
    return {ok:false,reason:"preparation_intent_commitment_invalid"};
  }
  return {
    ok:true,
    preparation_intent_id:id,
    object_id_sha256:object.object_id_sha256,
    content_sha256:object.content_sha256,
    byte_length:String(object.byte_length),
  };
}

function validateDeployment(value){
  if(!plain(value)) return {ok:false,reason:"deployment_attestation_invalid"};
  if(
    value.marker!==VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_V1||
    value.version!==1||
    value.ok!==true||
    value.status!==
      "deployment_attested_genesis_lineage_held_on_fresh_object_uncommitted_preflight"||
    value.deployment_attested!==true||
    value.predecessor_lineage_attested!==true||
    value.genesis_predecessor!==true||
    value.object_uncommitted_preflight_verified!==false||
    value.transaction_construction_authorized!==false||
    value.transaction_signing_authorized!==false||
    value.transaction_broadcast_authorized!==false||
    value.chain2050_write_authorized!==false||
    typeof value.deployment_attestation_id!=="string"||
    !/^voiddccda1_[0-9a-f]{64}$/.test(value.deployment_attestation_id)
  ){
    return {ok:false,reason:"deployment_attestation_contract_mismatch"};
  }
  const registry=address(value.registry_contract_address);
  const publisher=address(value.publisher_address);
  const predecessor=address(value.predecessor_address);
  const runtimeSha=sha(value.deployed_runtime_sha256);
  if(
    !registry||!publisher||!predecessor||
    value.chain_id!=="2050"||
    value.registry_version!=="1"||
    value.max_object_bytes!=="268435456"||
    !runtimeSha
  ){
    return {ok:false,reason:"deployment_attestation_binding_invalid"};
  }
  return {
    ok:true,
    deployment_attestation_id:value.deployment_attestation_id,
    registry_contract_address:registry,
    publisher_address:publisher,
    predecessor_address:predecessor,
    deployed_runtime_sha256:runtimeSha,
    compiled_identity_id:value.compiled_identity_id,
  };
}

export function verifyDatanetContentCommitmentObjectPreflightV1(input){
  if(
    !plain(input)||
    !plain(input.observation)
  ){
    return fail("object_preflight_input_invalid");
  }

  const preparation=validatePreparationIntent(input.preparation_intent);
  if(preparation.ok===false){
    return fail(preparation.reason);
  }
  const deployment=validateDeployment(input.deployment_attestation);
  if(deployment.ok===false){
    return fail(deployment.reason);
  }

  const observation=input.observation;
  const registry=address(observation.registry_contract_address);
  const blockNumber=decimal(observation.observation_block_number,{positive:true});
  const blockHashA=hash(observation.observation_block_hash_before);
  const blockHashB=hash(observation.observation_block_hash_after);
  const runtimeSha=sha(observation.deployed_runtime_sha256);
  const publisher=address(observation.views?.publisher_address);
  const predecessor=address(observation.views?.predecessor_address);
  const registryVersion=decimal(observation.views?.registry_version,{positive:true});
  const maxObjectBytes=decimal(observation.views?.max_object_bytes,{positive:true});
  const objectId=sha(observation.object_id_sha256);

  if(
    observation.chain_id!=="2050"||
    registry!==deployment.registry_contract_address||
    blockNumber===null||
    !blockHashA||
    blockHashB!==blockHashA||
    runtimeSha!==deployment.deployed_runtime_sha256||
    publisher!==deployment.publisher_address||
    predecessor!==deployment.predecessor_address||
    registryVersion!==1n||
    maxObjectBytes!==268435456n||
    objectId!==preparation.object_id_sha256
  ){
    return fail("object_preflight_observation_binding_mismatch");
  }

  if(
    observation.is_committed_before!==false||
    observation.is_committed_after!==false
  ){
    return fail("object_preflight_object_already_committed");
  }
  if(
    observation.same_block_tag_for_all_reads!==true||
    observation.block_hash_revalidated!==true||
    observation.runtime_code_reverified!==true||
    observation.registry_views_reverified!==true||
    observation.is_committed_repeated!==true
  ){
    return fail("object_preflight_revalidation_incomplete");
  }

  const evidence={
    chain_id:"2050",
    preparation_intent_id:preparation.preparation_intent_id,
    deployment_attestation_id:deployment.deployment_attestation_id,
    compiled_identity_id:deployment.compiled_identity_id,
    registry_contract_address:registry,
    observation_block_number:blockNumber.toString(),
    observation_block_hash:blockHashA,
    object_id_sha256:preparation.object_id_sha256,
    content_sha256:preparation.content_sha256,
    byte_length:preparation.byte_length,
    deployed_runtime_sha256:runtimeSha,
    publisher_address:publisher,
    predecessor_address:predecessor,
    registry_version:"1",
    max_object_bytes:"268435456",
  };
  const preflightId="voiddccop1_"+sha256(canonicalJson(evidence));
  if(!PREFLIGHT_ID.test(preflightId)){
    return fail("object_preflight_id_invalid");
  }

  return {
    ok:true,
    status:"object_uncommitted_verified_ready_for_separate_unsigned_transaction_plan",
    marker:VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_V1,
    version:1,
    object_preflight_id:preflightId,
    ...evidence,
    object_uncommitted_preflight_verified:true,
    ready_for_separate_unsigned_transaction_plan:true,
    commit_calldata_construction_authorized:false,
    transaction_construction_authorized:false,
    transaction_signing_authorized:false,
    transaction_broadcast_authorized:false,
    chain2050_write_authorized:false,
    next_gate:
      "separate_unsigned_commit_transaction_plan_with_fresh_pre_sign_revalidation",
    authority:VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_AUTHORITY_V1,
  };
}

export const DATANET_CONTENT_COMMITMENT_READ_INTERFACE_V1=VIEWS;
