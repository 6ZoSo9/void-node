#!/usr/bin/env node
import crypto from "node:crypto";
import {getCreateAddress} from "ethers";

import {
  PRIVATE_SUCCESSOR_RPC_V1,
} from "./void-datanet-registry-deployer-activation-bound-observer-v1.mjs";
import {
  validateVoidDatanetRegistrySingleTransactionBroadcastAuthorizationV1,
} from "./void-datanet-registry-single-transaction-broadcast-authorization-v1.mjs";

export const VOID_DATANET_REGISTRY_PREBROADCAST_OBSERVER_V1 =
  "VOID_DATANET_REGISTRY_PREBROADCAST_OBSERVER_V1";

export const VOID_DATANET_REGISTRY_PREBROADCAST_RPC_METHODS_V1 = Object.freeze([
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_getTransactionCount",
  "eth_getTransactionCount",
  "eth_getCode",
  "eth_getBalance",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getTransactionCount",
  "eth_getBlockByNumber",
]);

const HASH=/^0x[0-9a-f]{64}$/u;
const ADDRESS=/^0x[0-9a-f]{40}$/u;
const DECIMAL=/^(0|[1-9][0-9]{0,77})$/u;
const HEX_QUANTITY=/^0x(?:0|[1-9a-f][0-9a-f]*)$/u;
const MAX_RESPONSE_BYTES=64*1024;

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
function held(reason,authorization=null,detail=undefined){
  return Object.freeze({
    ok:false,
    marker:VOID_DATANET_REGISTRY_PREBROADCAST_OBSERVER_V1,
    version:1,
    status:"held",
    reason,
    broadcast_authorization_id:
      authorization?.broadcast_authorization_id??null,
    signed_transaction_id:authorization?.signed_transaction_id??null,
    signed_transaction_hash:
      authorization?.transaction_summary?.signed_transaction_hash??null,
    read_only_rpc_observation_complete:false,
    signed_transaction_already_known:null,
    signed_transaction_already_receipted:null,
    broadcast_authorization_consumption_performed:false,
    signed_transaction_bytes_accessed:false,
    broadcaster_access_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_write_performed:false,
    funds_movement_performed:false,
    automatic_retry_allowed:false,
    ...(detail===undefined?{}:{detail}),
  });
}
function quantity(value,label){
  const raw=String(value??"").toLowerCase();
  if(!HEX_QUANTITY.test(raw)){
    throw new Error(label+"_invalid");
  }
  return BigInt(raw);
}
function decimal(value,label){
  const raw=String(value??"");
  if(!DECIMAL.test(raw)){
    throw new Error(label+"_invalid");
  }
  return BigInt(raw);
}
async function defaultTransport({url,method,params}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  try{
    const response=await fetch(url,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        jsonrpc:"2.0",
        id:1,
        method,
        params,
      }),
      signal:controller.signal,
    });
    const text=await response.text();
    if(Buffer.byteLength(text)>MAX_RESPONSE_BYTES){
      throw new Error("rpc_response_too_large");
    }
    if(!response.ok){
      throw new Error("rpc_http_"+String(response.status));
    }
    const parsed=JSON.parse(text);
    if(parsed?.error){
      throw new Error("rpc_error");
    }
    return parsed?.result;
  }finally{
    clearTimeout(timer);
  }
}

export async function observeVoidDatanetRegistryPrebroadcastV1(input){
  let authorization;
  try{
    authorization=
      validateVoidDatanetRegistrySingleTransactionBroadcastAuthorizationV1(
        input?.broadcast_authorization,
        input?.broadcast_authorization_evidence,
      );
  }catch(error){
    return held("registry_prebroadcast_authorization_invalid",null,{
      error_class:String(error?.name||"Error").slice(0,80),
    });
  }

  const rpcUrl=String(input?.rpc_url||"");
  if(rpcUrl!==PRIVATE_SUCCESSOR_RPC_V1){
    return held("registry_prebroadcast_rpc_url_mismatch",authorization);
  }
  const transport=
    typeof input?.transport==="function"?input.transport:defaultTransport;
  const calls=[];
  async function rpc(method,params){
    if(
      calls.length>=VOID_DATANET_REGISTRY_PREBROADCAST_RPC_METHODS_V1.length||
      method!==VOID_DATANET_REGISTRY_PREBROADCAST_RPC_METHODS_V1[calls.length]
    ){
      throw new Error("registry_prebroadcast_rpc_sequence_violation");
    }
    calls.push(method);
    return await transport({url:rpcUrl,method,params});
  }

  const tx=authorization.transaction_summary;
  try{
    const nonce=decimal(tx.nonce,"registry_prebroadcast_nonce");
    const gasLimit=decimal(tx.gas_limit,"registry_prebroadcast_gas_limit");
    const maxFee=decimal(
      tx.max_fee_per_gas_wei,
      "registry_prebroadcast_max_fee",
    );
    const priority=decimal(
      tx.max_priority_fee_per_gas_wei,
      "registry_prebroadcast_priority_fee",
    );
    if(
      !ADDRESS.test(String(tx.from_address||""))||
      !ADDRESS.test(String(tx.predicted_contract_address||""))||
      !HASH.test(String(tx.signed_transaction_hash||""))||
      priority>maxFee
    ){
      return held("registry_prebroadcast_transaction_summary_invalid",authorization);
    }

    const predicted=getCreateAddress({
      from:tx.from_address,
      nonce,
    }).toLowerCase();
    if(predicted!==tx.predicted_contract_address){
      return held("registry_prebroadcast_predicted_address_mismatch",authorization);
    }

    const chainId=String(await rpc("eth_chainId",[])).toLowerCase();
    if(chainId!=="0x802"){
      return held("registry_prebroadcast_chain_id_mismatch",authorization);
    }
    const blockHex=String(await rpc("eth_blockNumber",[])).toLowerCase();
    const blockNumber=quantity(blockHex,"registry_prebroadcast_block_number");
    const block=await rpc("eth_getBlockByNumber",[blockHex,false]);
    if(
      !block||
      String(block.number||"").toLowerCase()!==blockHex||
      !HASH.test(String(block.hash||"").toLowerCase())
    ){
      return held("registry_prebroadcast_block_invalid",authorization);
    }
    const blockHash=String(block.hash).toLowerCase();
    const baseFee=quantity(
      block.baseFeePerGas??"0x0",
      "registry_prebroadcast_base_fee",
    );
    if(baseFee>maxFee){
      return held("registry_prebroadcast_base_fee_exceeds_max_fee",authorization);
    }

    const deployerPending=quantity(
      await rpc("eth_getTransactionCount",[tx.from_address,"pending"]),
      "registry_prebroadcast_deployer_pending_nonce",
    );
    if(deployerPending!==nonce){
      return held("registry_prebroadcast_deployer_nonce_changed",authorization,{
        expected_nonce:nonce.toString(10),
        observed_pending_nonce:deployerPending.toString(10),
      });
    }

    const predictedNonce=quantity(
      await rpc(
        "eth_getTransactionCount",
        [tx.predicted_contract_address,blockHex],
      ),
      "registry_prebroadcast_predicted_nonce",
    );
    const predictedCode=String(
      await rpc("eth_getCode",[tx.predicted_contract_address,blockHex]),
    ).toLowerCase();
    if(predictedNonce!==0n||predictedCode!=="0x"){
      return held("registry_prebroadcast_predicted_address_occupied",authorization);
    }

    const balance=quantity(
      await rpc("eth_getBalance",[tx.from_address,blockHex]),
      "registry_prebroadcast_deployer_balance",
    );
    const maximumGasCost=gasLimit*maxFee;
    if(balance<maximumGasCost){
      return held("registry_prebroadcast_deployer_balance_insufficient",authorization,{
        required_maximum_gas_cost_wei:maximumGasCost.toString(10),
        observed_balance_wei:balance.toString(10),
      });
    }

    const knownTransaction=
      await rpc("eth_getTransactionByHash",[tx.signed_transaction_hash]);
    if(knownTransaction!==null){
      return held("registry_prebroadcast_signed_transaction_already_known",authorization);
    }
    const knownReceipt=
      await rpc("eth_getTransactionReceipt",[tx.signed_transaction_hash]);
    if(knownReceipt!==null){
      return held("registry_prebroadcast_signed_transaction_already_receipted",authorization);
    }

    const deployerPendingAgain=quantity(
      await rpc("eth_getTransactionCount",[tx.from_address,"pending"]),
      "registry_prebroadcast_deployer_pending_nonce_recheck",
    );
    if(deployerPendingAgain!==nonce){
      return held("registry_prebroadcast_pending_nonce_changed_during_observation",authorization);
    }
    const blockAgain=await rpc("eth_getBlockByNumber",[blockHex,false]);
    if(
      !blockAgain||
      String(blockAgain.number||"").toLowerCase()!==blockHex||
      String(blockAgain.hash||"").toLowerCase()!==blockHash
    ){
      return held("registry_prebroadcast_block_changed_during_observation",authorization);
    }
    if(calls.length!==VOID_DATANET_REGISTRY_PREBROADCAST_RPC_METHODS_V1.length){
      return held("registry_prebroadcast_rpc_sequence_incomplete",authorization);
    }

    const material={
      marker:VOID_DATANET_REGISTRY_PREBROADCAST_OBSERVER_V1,
      version:1,
      status:"FRESH_PREBROADCAST_OBSERVATION_GREEN_CONSUMPTION_HOLD",
      broadcast_authorization_id:authorization.broadcast_authorization_id,
      signed_transaction_id:authorization.signed_transaction_id,
      signed_transaction_hash:tx.signed_transaction_hash,
      candidate_id:authorization.candidate_id,
      transaction_fingerprint_sha256:
        authorization.transaction_fingerprint_sha256,
      deployer_address:tx.from_address,
      predicted_contract_address:tx.predicted_contract_address,
      observation:{
        chain_id:"2050",
        observation_block_number:blockNumber.toString(10),
        observation_block_hash:blockHash,
        base_fee_per_gas_wei:baseFee.toString(10),
        deployer_pending_nonce:deployerPending.toString(10),
        predicted_registry_nonce:predictedNonce.toString(10),
        predicted_registry_code:predictedCode,
        deployer_balance_wei:balance.toString(10),
        maximum_gas_cost_wei:maximumGasCost.toString(10),
        signed_transaction_already_known:false,
        signed_transaction_already_receipted:false,
        pending_nonce_revalidated:true,
        observation_block_hash_revalidated:true,
      },
      rpc_methods_used:[...calls],
      authority:{
        read_only_rpc_observation:true,
        filesystem_secret_read:false,
        credential_access:false,
        private_key_access:false,
        signed_transaction_bytes_access:false,
        broadcaster_access:false,
        authorization_consumption:false,
        transaction_submission:false,
        transaction_broadcast:false,
        deployment:false,
        chain2050_mutation:false,
        validator_mutation:false,
        token_movement:false,
        funds_movement:false,
        automatic_retry:false,
      },
      next_gate:
        "durable_single_use_registry_broadcast_authorization_consumption_v1",
    };
    return Object.freeze({
      ok:true,
      ...material,
      prebroadcast_observation_id:
        "voiddrpbo1_"+sha256(Buffer.from(canonicalJson(material))),
      read_only_rpc_observation_complete:true,
      signed_transaction_already_known:false,
      signed_transaction_already_receipted:false,
      broadcast_authorization_consumption_performed:false,
      signed_transaction_bytes_accessed:false,
      broadcaster_access_performed:false,
      transaction_submission_performed:false,
      transaction_broadcast_performed:false,
      deployment_performed:false,
      chain2050_write_performed:false,
      funds_movement_performed:false,
      automatic_retry_allowed:false,
    });
  }catch(error){
    return held("registry_prebroadcast_rpc_observation_failed",authorization,{
      error_class:String(error?.name||"Error").slice(0,80),
    });
  }
}

export function validateVoidDatanetRegistryPrebroadcastObservationV1(
  observation,
  evidence,
){
  if(
    !observation||
    observation.ok!==true||
    observation.marker!==VOID_DATANET_REGISTRY_PREBROADCAST_OBSERVER_V1||
    observation.version!==1||
    observation.status!=="FRESH_PREBROADCAST_OBSERVATION_GREEN_CONSUMPTION_HOLD"||
    !/^voiddrpbo1_[0-9a-f]{64}$/u.test(
      String(observation.prebroadcast_observation_id||""),
    )||
    observation.next_gate!==
      "durable_single_use_registry_broadcast_authorization_consumption_v1"||
    observation.read_only_rpc_observation_complete!==true||
    observation.signed_transaction_already_known!==false||
    observation.signed_transaction_already_receipted!==false||
    observation.broadcast_authorization_consumption_performed!==false||
    observation.signed_transaction_bytes_accessed!==false||
    observation.broadcaster_access_performed!==false||
    observation.transaction_submission_performed!==false||
    observation.transaction_broadcast_performed!==false||
    observation.deployment_performed!==false||
    observation.chain2050_write_performed!==false||
    observation.funds_movement_performed!==false||
    observation.automatic_retry_allowed!==false
  ){
    throw new Error("registry_prebroadcast_observation_contract_invalid");
  }

  const material=structuredClone(observation);
  const id=material.prebroadcast_observation_id;
  for(const key of [
    "prebroadcast_observation_id",
    "ok",
    "read_only_rpc_observation_complete",
    "signed_transaction_already_known",
    "signed_transaction_already_receipted",
    "broadcast_authorization_consumption_performed",
    "signed_transaction_bytes_accessed",
    "broadcaster_access_performed",
    "transaction_submission_performed",
    "transaction_broadcast_performed",
    "deployment_performed",
    "chain2050_write_performed",
    "funds_movement_performed",
    "automatic_retry_allowed",
  ]){
    delete material[key];
  }
  const expectedId=
    "voiddrpbo1_"+sha256(Buffer.from(canonicalJson(material)));
  if(id!==expectedId){
    throw new Error("registry_prebroadcast_observation_id_mismatch");
  }

  const expectedMethods=VOID_DATANET_REGISTRY_PREBROADCAST_RPC_METHODS_V1;
  if(
    JSON.stringify(observation.rpc_methods_used)!==
      JSON.stringify(expectedMethods)
  ){
    throw new Error("registry_prebroadcast_rpc_method_sequence_mismatch");
  }
  const expectedAuthority={
    read_only_rpc_observation:true,
    filesystem_secret_read:false,
    credential_access:false,
    private_key_access:false,
    signed_transaction_bytes_access:false,
    broadcaster_access:false,
    authorization_consumption:false,
    transaction_submission:false,
    transaction_broadcast:false,
    deployment:false,
    chain2050_mutation:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    automatic_retry:false,
  };
  if(
    JSON.stringify(Object.keys(observation.authority).sort())!==
      JSON.stringify(Object.keys(expectedAuthority).sort())
  ){
    throw new Error("registry_prebroadcast_authority_keys_invalid");
  }
  for(const [key,value] of Object.entries(expectedAuthority)){
    if(observation.authority[key]!==value){
      throw new Error("registry_prebroadcast_authority_mismatch:"+key);
    }
  }

  let authorization;
  try{
    authorization=
      validateVoidDatanetRegistrySingleTransactionBroadcastAuthorizationV1(
        evidence?.broadcast_authorization,
        evidence?.broadcast_authorization_evidence,
      );
  }catch(error){
    throw new Error(
      "registry_prebroadcast_authorization_rebuild_failed:"+
      String(error?.message||error).slice(0,180),
    );
  }
  const tx=authorization.transaction_summary;
  if(
    observation.broadcast_authorization_id!==
      authorization.broadcast_authorization_id||
    observation.signed_transaction_id!==authorization.signed_transaction_id||
    observation.signed_transaction_hash!==tx.signed_transaction_hash||
    observation.candidate_id!==authorization.candidate_id||
    observation.transaction_fingerprint_sha256!==
      authorization.transaction_fingerprint_sha256||
    observation.deployer_address!==tx.from_address||
    observation.predicted_contract_address!==tx.predicted_contract_address||
    observation.observation?.chain_id!=="2050"||
    observation.observation?.deployer_pending_nonce!==String(tx.nonce)||
    observation.observation?.predicted_registry_nonce!=="0"||
    observation.observation?.predicted_registry_code!=="0x"||
    observation.observation?.signed_transaction_already_known!==false||
    observation.observation?.signed_transaction_already_receipted!==false||
    observation.observation?.pending_nonce_revalidated!==true||
    observation.observation?.observation_block_hash_revalidated!==true
  ){
    throw new Error("registry_prebroadcast_observation_lineage_mismatch");
  }
  const maximumGasCost=
    decimal(tx.gas_limit,"registry_prebroadcast_validate_gas_limit")*
    decimal(tx.max_fee_per_gas_wei,"registry_prebroadcast_validate_max_fee");
  if(
    observation.observation.maximum_gas_cost_wei!==maximumGasCost.toString(10)||
    decimal(
      observation.observation.deployer_balance_wei,
      "registry_prebroadcast_validate_balance",
    )<maximumGasCost
  ){
    throw new Error("registry_prebroadcast_observation_funding_mismatch");
  }
  return observation;
}
