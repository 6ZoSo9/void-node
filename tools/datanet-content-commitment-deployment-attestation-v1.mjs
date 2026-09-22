#!/usr/bin/env node
import {
  AbiCoder,
  getAddress,
  getCreateAddress,
  keccak256,
} from "ethers";
import {
  verifyDatanetContentCommitmentCompiledIdentityV1,
} from "./datanet-content-commitment-compiled-identity-acceptance-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "./datanet-content-commitment-compiler-profile-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_AUTHORITY_V1 = {
  pure_observation_validation_only: true,
  accepted_compiler_identity_required: true,
  exact_creation_transaction_required: true,
  exact_create_address_required: true,
  exact_runtime_reconstruction_required: true,
  exact_view_binding_required: true,
  genesis_predecessor_only_v1: true,
  nonzero_predecessor_requires_separate_identity_acceptance: true,
  fresh_object_uncommitted_preflight_still_required: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  calldata_construction_for_commit: false,
  transaction_construction: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  validator_mutation: false,
  governance_mutation: false,
  runtime_service_action: false,
  work_credit_award: false,
  funds_action: false,
};

const ZERO_ADDRESS="0x0000000000000000000000000000000000000000";
const HASH=/^0x[0-9a-f]{64}$/;
const ADDRESS=/^0x[0-9a-f]{40}$/;
const UINT256_MAX=(1n<<256n)-1n;
const MAX_OBJECT_BYTES=268435456n;
const ABI=AbiCoder.defaultAbiCoder();

function fail(reason,detail=undefined){
  return {
    ok:false,
    status:"held",
    marker:VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_V1,
    version:1,
    reason,
    ...(detail===undefined?{}:{detail}),
    deployment_attested:false,
    predecessor_lineage_attested:false,
    object_uncommitted_preflight_verified:false,
    transaction_construction_authorized:false,
    transaction_signing_authorized:false,
    transaction_broadcast_authorized:false,
    chain2050_write_authorized:false,
    authority:VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_AUTHORITY_V1,
  };
}

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
function decimal(value,{positive=false}={}){
  try{
    const raw=text(value);
    if(!/^(0|[1-9][0-9]{0,77})$/.test(raw)) return null;
    const parsed=BigInt(raw);
    if(parsed<0n||parsed>UINT256_MAX||(positive&&parsed===0n)) return null;
    return parsed;
  }catch(error){
    return null;
  }
}
function nonceValue(value){
  try{
    if(typeof value==="number"&&Number.isSafeInteger(value)&&value>=0) return BigInt(value);
    const parsed=decimal(value);
    if(parsed===null||parsed>BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return parsed;
  }catch(error){
    return null;
  }
}
function normalizeHex(value){
  const raw=text(value).toLowerCase();
  if(!/^0x(?:[0-9a-f]{2})*$/.test(raw)||raw.length<4) return "";
  return raw;
}
function abiWordForAddress(value){
  const normalized=address(value);
  if(!normalized) throw new Error("address_word_invalid");
  return normalized.slice(2).padStart(64,"0");
}
function exactReferences(identity,name){
  const values=identity?.artifacts?.immutable_layout?.[name]?.references;
  if(!Array.isArray(values)||values.length<1) throw new Error("immutable_reference_missing:"+name);
  return values.map((entry)=>{
    if(
      !plain(entry)||
      !Number.isSafeInteger(entry.start)||
      !Number.isSafeInteger(entry.length)||
      entry.start<0||
      entry.length!==32
    ) throw new Error("immutable_reference_invalid:"+name);
    return {start:entry.start,length:entry.length};
  });
}

export function reconstructDatanetContentCommitmentRuntimeV1({
  compiled_identity,
  publisher_address,
  predecessor_address,
}){
  const accepted=verifyDatanetContentCommitmentCompiledIdentityV1(compiled_identity);
  if(accepted.ok===false){
    throw new Error("compiled_identity_not_accepted:"+accepted.reason);
  }
  const template=normalizeHex(compiled_identity?.artifacts?.runtime_template_hex);
  if(!template) throw new Error("runtime_template_hex_invalid");
  const bytes=Buffer.from(template.slice(2),"hex");

  for(const [name,value] of [
    ["publisher",publisher_address],
    ["predecessor",predecessor_address],
  ]){
    const word=Buffer.from(abiWordForAddress(value),"hex");
    for(const ref of exactReferences(compiled_identity,name)){
      if(ref.start+ref.length>bytes.length){
        throw new Error("immutable_reference_out_of_bounds:"+name);
      }
      word.copy(bytes,ref.start);
    }
  }
  return {
    runtime_code:"0x"+bytes.toString("hex"),
    runtime_bytes:bytes.length,
    runtime_sha256:sha256(bytes),
    runtime_keccak256:keccak256("0x"+bytes.toString("hex")),
  };
}

export function buildDatanetContentCommitmentDeploymentDataV1({
  compiled_identity,
  publisher_address,
  predecessor_address,
}){
  const accepted=verifyDatanetContentCommitmentCompiledIdentityV1(compiled_identity);
  if(accepted.ok===false){
    throw new Error("compiled_identity_not_accepted:"+accepted.reason);
  }
  const creation=normalizeHex(compiled_identity?.artifacts?.creation_bytecode_hex);
  if(!creation) throw new Error("creation_bytecode_hex_invalid");
  const publisher=address(publisher_address);
  const predecessor=address(predecessor_address);
  if(!publisher||!predecessor||publisher===ZERO_ADDRESS){
    throw new Error("constructor_address_invalid");
  }
  const args=ABI.encode(
    ["address","address"],
    [publisher,predecessor],
  ).toLowerCase();
  return {
    constructor_arguments:args,
    deployment_data:creation+args.slice(2),
    deployment_data_keccak256:keccak256(creation+args.slice(2)),
  };
}

export function verifyDatanetContentCommitmentDeploymentObservationV1(input){
  if(!plain(input)||!plain(input.policy)||!plain(input.observation)){
    return fail("deployment_attestation_input_invalid");
  }
  const accepted=verifyDatanetContentCommitmentCompiledIdentityV1(input.compiled_identity);
  if(accepted.ok===false){
    return fail("deployment_attestation_compiled_identity_not_accepted",{reason:accepted.reason});
  }

  const policy=input.policy;
  const expectedPublisher=address(policy.publisher_address);
  const expectedPredecessor=address(policy.predecessor_address);
  const expectedContract=address(policy.registry_contract_address);
  const minConfirmations=decimal(policy.min_confirmations,{positive:true});
  if(
    text(policy.chain_id)!=="2050"||
    !expectedPublisher||
    !expectedPredecessor||
    !expectedContract||
    minConfirmations===null||
    minConfirmations>1_000_000n||
    expectedPublisher===ZERO_ADDRESS||
    expectedContract===ZERO_ADDRESS||
    expectedPublisher===expectedContract
  ){
    return fail("deployment_attestation_policy_invalid");
  }
  if(expectedPredecessor!==ZERO_ADDRESS){
    return fail(
      "deployment_attestation_nonzero_predecessor_identity_not_accepted_v1",
      {predecessor_address:expectedPredecessor},
    );
  }

  const observation=input.observation;
  const contractAddress=address(observation.contract_address);
  const publisher=address(observation.views?.publisher_address);
  const predecessor=address(observation.views?.predecessor_address);
  const registryVersion=decimal(observation.views?.registry_version,{positive:true});
  const maxObjectBytes=decimal(observation.views?.max_object_bytes,{positive:true});
  const observationBlockHash=hash(observation.observation_block_hash);
  const observationBlock=decimal(observation.observation_block_number,{positive:true});

  if(
    text(observation.chain_id)!=="2050"||
    contractAddress!==expectedContract||
    publisher!==expectedPublisher||
    predecessor!==expectedPredecessor||
    registryVersion!==1n||
    maxObjectBytes!==MAX_OBJECT_BYTES||
    !observationBlockHash||
    observationBlock===null
  ){
    return fail("deployment_attestation_observation_binding_mismatch");
  }

  const tx=observation.deployment_transaction;
  const receipt=observation.deployment_receipt;
  if(!plain(tx)||!plain(receipt)){
    return fail("deployment_attestation_transaction_evidence_missing");
  }
  const txHash=hash(tx.hash);
  const receiptTxHash=hash(receipt.transaction_hash);
  const txFrom=address(tx.from);
  const txNonce=nonceValue(tx.nonce);
  const txTo=
    tx.to===null||tx.to===undefined||text(tx.to)===""?null:address(tx.to);
  const txInput=normalizeHex(tx.input);
  const txValue=decimal(tx.value_wei);
  const receiptContract=address(receipt.contract_address);
  const receiptBlockHash=hash(receipt.block_hash);
  const receiptBlock=decimal(receipt.block_number,{positive:true});
  const confirmationCount=
    receiptBlock!==null&&observationBlock>=receiptBlock
      ? observationBlock-receiptBlock+1n
      : 0n;

  if(
    !txHash||
    txHash!==receiptTxHash||
    !txFrom||
    txNonce===null||
    txTo!==null||
    !txInput||
    txValue!==0n||
    text(tx.chain_id)!=="2050"||
    text(receipt.status)!=="1"||
    receiptContract!==expectedContract||
    !receiptBlockHash||
    receiptBlock===null||
    receiptBlock>observationBlock
  ){
    return fail("deployment_attestation_creation_transaction_mismatch");
  }
  if(confirmationCount<minConfirmations){
    return fail("deployment_attestation_confirmation_depth_insufficient",{
      observed_confirmation_count:confirmationCount.toString(),
      minimum_confirmation_count:minConfirmations.toString(),
    });
  }

  let derivedContract;
  try{
    derivedContract=getCreateAddress({from:txFrom,nonce:txNonce}).toLowerCase();
  }catch(error){
    return fail("deployment_attestation_create_address_derivation_failed");
  }
  if(derivedContract!==expectedContract){
    return fail("deployment_attestation_create_address_mismatch",{
      derived_contract_address:derivedContract,
    });
  }

  let deploymentData;
  let reconstructed;
  try{
    deploymentData=buildDatanetContentCommitmentDeploymentDataV1({
      compiled_identity:input.compiled_identity,
      publisher_address:expectedPublisher,
      predecessor_address:expectedPredecessor,
    });
    reconstructed=reconstructDatanetContentCommitmentRuntimeV1({
      compiled_identity:input.compiled_identity,
      publisher_address:expectedPublisher,
      predecessor_address:expectedPredecessor,
    });
  }catch(error){
    return fail("deployment_attestation_identity_reconstruction_failed",{
      error:text(error?.message||error).slice(0,240),
    });
  }

  if(txInput!==deploymentData.deployment_data.toLowerCase()){
    return fail("deployment_attestation_creation_input_mismatch");
  }
  const observedCode=normalizeHex(observation.runtime_code);
  if(
    !observedCode||
    observedCode!==reconstructed.runtime_code.toLowerCase()||
    (observedCode.length-2)/2!==reconstructed.runtime_bytes||
    sha256(Buffer.from(observedCode.slice(2),"hex"))!==reconstructed.runtime_sha256||
    keccak256(observedCode)!==reconstructed.runtime_keccak256
  ){
    return fail("deployment_attestation_runtime_code_mismatch");
  }
  if(predecessor!==ZERO_ADDRESS){
    return fail("deployment_attestation_predecessor_lineage_unproven");
  }

  const normalizedEvidence={
    chain_id:"2050",
    observation_block_number:observationBlock.toString(),
    observation_block_hash:observationBlockHash,
    registry_contract_address:expectedContract,
    publisher_address:expectedPublisher,
    predecessor_address:expectedPredecessor,
    registry_version:"1",
    max_object_bytes:MAX_OBJECT_BYTES.toString(),
    deployment_transaction_hash:txHash,
    deployment_from_address:txFrom,
    deployment_nonce:txNonce.toString(),
    deployment_block_number:receiptBlock.toString(),
    deployment_block_hash:receiptBlockHash,
    observed_confirmation_count:confirmationCount.toString(),
    minimum_confirmation_count:minConfirmations.toString(),
    deployment_data_keccak256:deploymentData.deployment_data_keccak256,
    deployed_runtime_sha256:reconstructed.runtime_sha256,
    deployed_runtime_keccak256:reconstructed.runtime_keccak256,
    compiled_identity_id:accepted.identity_id,
  };

  return {
    ok:true,
    status:
      "deployment_attested_genesis_lineage_held_on_fresh_object_uncommitted_preflight",
    marker:VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_V1,
    version:1,
    deployment_attestation_id:
      "voiddccda1_"+sha256(canonicalJson(normalizedEvidence)),
    ...normalizedEvidence,
    creation_transaction_exact_match:true,
    create_address_exact_match:true,
    runtime_code_exact_match:true,
    immutable_publisher_exact_match:true,
    immutable_predecessor_exact_match:true,
    contract_views_exact_match:true,
    deployment_confirmation_floor_satisfied:true,
    predecessor_lineage_attested:true,
    genesis_predecessor:true,
    deployment_attested:true,
    object_uncommitted_preflight_verified:false,
    transaction_construction_authorized:false,
    transaction_signing_authorized:false,
    transaction_broadcast_authorized:false,
    chain2050_write_authorized:false,
    next_gate:
      "fresh_chain2050_is_committed_false_preflight_for_approved_preparation_intent",
    authority:
      VOID_DATANET_CONTENT_COMMITMENT_DEPLOYMENT_ATTESTATION_AUTHORITY_V1,
  };
}
