#!/usr/bin/env node
import crypto from "node:crypto";
import * as http from "node:http";
import {getCreateAddress} from "ethers";

import {
  PRIVATE_SUCCESSOR_RPC_V1,
} from "./void-datanet-registry-deployer-activation-bound-observer-v1.mjs";
import {
  requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1,
} from "./void-datanet-registry-signed-verification-broadcast-request-v1.mjs";

export const VOID_DATANET_REGISTRY_PREBROADCAST_OBSERVER_V1 =
  "VOID_DATANET_REGISTRY_PREBROADCAST_OBSERVER_V1";

export const VOID_DATANET_REGISTRY_PREBROADCAST_VALIDITY_SECONDS_V1=120;

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

const REQUEST_ID=/^voiddrbar1_[0-9a-f]{64}$/u;
const AUTH_ID=/^voiddrba1_[0-9a-f]{64}$/u;
const VERIFICATION_ID=/^voiddrstv1_[0-9a-f]{64}$/u;
const SIGNED_ID=/^voiddrstx1_[0-9a-f]{64}$/u;
const CANDIDATE_ID=/^voiddrtxc1_[0-9a-f]{64}$/u;
const SIGNING_REQUEST_ID=/^voiddrsr1_[0-9a-f]{64}$/u;
const SIGNING_AUTH_ID=/^voiddrsa1_[0-9a-f]{64}$/u;
const SIGNING_CONSUMPTION_ID=/^voiddrsac1_[0-9a-f]{64}$/u;
const SIGNING_OPERATION_ID=/^voiddrso1_[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;

function exactKeys(value,keys,label){
  if(!value||typeof value!=="object"||Array.isArray(value)){
    throw new Error(label+"_invalid");
  }
  const actual=Object.keys(value).sort();
  const expected=[...keys].sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected)){
    throw new Error(label+"_keys_invalid");
  }
}
function canonicalUtc(value,label){
  const raw=String(value||"");
  const ms=Date.parse(raw);
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(raw)||
    !Number.isFinite(ms)||
    new Date(ms).toISOString()!==raw
  ){
    throw new Error(label+"_invalid");
  }
  return {raw,ms};
}

export function validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1(input){
  const request=input?.broadcast_request;
  const authorization=input?.broadcast_authorization;
  if(
    !request||
    request.marker!=="VOID_DATANET_REGISTRY_BROADCAST_AUTHORIZATION_REQUEST_V1"||
    request.version!==1||
    request.status!=="HOLD_PENDING_EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION"||
    !REQUEST_ID.test(String(request.broadcast_authorization_request_id||""))||
    !VERIFICATION_ID.test(String(request.signed_transaction_verification_id||""))||
    !SIGNED_ID.test(String(request.signed_transaction_id||""))||
    !CANDIDATE_ID.test(String(request.candidate_id||""))||
    !SIGNING_REQUEST_ID.test(String(request.signing_request_id||""))||
    !SIGNING_AUTH_ID.test(String(request.signing_authorization_id||""))||
    !SIGNING_CONSUMPTION_ID.test(String(request.consumption_record_id||""))||
    !SIGNING_OPERATION_ID.test(String(request.signing_operation_id||""))||
    !SHA256.test(String(request.transaction_fingerprint_sha256||""))||
    !ADDRESS.test(String(request.deployer_address||""))||
    request.broadcast_authorized!==false||
    request.broadcast_performed!==false||
    request.next_gate!=="explicit_exact_registry_single_transaction_broadcast_authorization_v1"
  ){
    throw new Error("registry_prebroadcast_request_contract_invalid");
  }
  const requestMaterial=structuredClone(request);
  const requestId=requestMaterial.broadcast_authorization_request_id;
  delete requestMaterial.broadcast_authorization_request_id;
  if(
    requestId!=="voiddrbar1_"+
      sha256(Buffer.from(canonicalJson(requestMaterial)))
  ){
    throw new Error("registry_prebroadcast_request_id_mismatch");
  }
  const requestScope={
    exact_single_transaction:true,
    exact_signed_transaction_only:true,
    one_submission_attempt_only:true,
    exact_contract_creation_consequence_requires_later_authorization:true,
    exact_gas_fee_spend_requires_later_authorization:true,
    additional_value_transfer_authorized:false,
    replacement_transaction_authorized:false,
    automatic_retry:false,
  };
  exactKeys(request.scope,Object.keys(requestScope),"registry_prebroadcast_request_scope");
  for(const [key,value] of Object.entries(requestScope)){
    if(request.scope[key]!==value){
      throw new Error("registry_prebroadcast_request_scope_mismatch:"+key);
    }
  }
  const requestAuthority={
    request_only:true,
    signed_transaction_bytes_output:false,
    credential_access:false,
    private_key_access:false,
    broadcaster_access:false,
    transaction_submission:false,
    transaction_broadcast_authorized:false,
    transaction_broadcast_performed:false,
    deployment_authorized:false,
    deployment_performed:false,
    chain2050_write_authorized:false,
    chain2050_write_performed:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    automatic_retry:false,
  };
  exactKeys(
    request.authority,
    Object.keys(requestAuthority),
    "registry_prebroadcast_request_authority",
  );
  for(const [key,value] of Object.entries(requestAuthority)){
    if(request.authority[key]!==value){
      throw new Error("registry_prebroadcast_request_authority_mismatch:"+key);
    }
  }

  const signedAt=canonicalUtc(
    request.signed_at_utc,
    "registry_prebroadcast_request_signed_at",
  );
  void signedAt;
  const tx=request.transaction_summary;
  if(
    tx?.transaction_type!==2||
    tx?.chain_id!=="2050"||
    !DECIMAL.test(String(tx?.nonce||""))||
    !ADDRESS.test(String(tx?.from_address||""))||
    tx?.to_address!==null||
    tx?.value_wei!=="0"||
    !DECIMAL.test(String(tx?.gas_limit||""))||
    !DECIMAL.test(String(tx?.max_fee_per_gas_wei||""))||
    !DECIMAL.test(String(tx?.max_priority_fee_per_gas_wei||""))||
    !ADDRESS.test(String(tx?.predicted_contract_address||""))||
    !SHA256.test(String(tx?.data_sha256||""))||
    !HASH.test(String(tx?.data_keccak256||""))||
    !HASH.test(String(tx?.unsigned_transaction_hash||""))||
    !HASH.test(String(tx?.signed_transaction_hash||""))||
    !SHA256.test(String(tx?.signed_serialized_transaction_sha256||""))||
    request.deployer_address!==tx.from_address
  ){
    throw new Error("registry_prebroadcast_request_transaction_shape_invalid");
  }
  const expectedConfirmation=
    requiredVoidDatanetRegistryDeploymentBroadcastConfirmationV1({
      signed_transaction_id:request.signed_transaction_id,
      signed_transaction_hash:tx.signed_transaction_hash,
      candidate_id:request.candidate_id,
      transaction_fingerprint_sha256:request.transaction_fingerprint_sha256,
    });
  if(request.required_confirmation!==expectedConfirmation){
    throw new Error("registry_prebroadcast_request_confirmation_mismatch");
  }

  if(
    !authorization||
    authorization.marker!=="VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION_V1"||
    authorization.version!==1||
    authorization.status!=="EXACT_SINGLE_TRANSACTION_BROADCAST_AUTHORIZED_CONSUMPTION_HOLD"||
    !AUTH_ID.test(String(authorization.broadcast_authorization_id||""))||
    authorization.broadcast_authorized!==true||
    authorization.broadcast_performed!==false||
    authorization.next_gate!==
      "fresh_prebroadcast_observation_then_durable_single_use_broadcast_authorization_consumption_v1"
  ){
    throw new Error("registry_prebroadcast_authorization_contract_invalid");
  }
  const authMaterial=structuredClone(authorization);
  const authId=authMaterial.broadcast_authorization_id;
  delete authMaterial.broadcast_authorization_id;
  if(
    authId!=="voiddrba1_"+sha256(Buffer.from(canonicalJson(authMaterial)))
  ){
    throw new Error("registry_prebroadcast_authorization_id_mismatch");
  }
  const authScope={
    exact_single_transaction:true,
    exact_signed_transaction_only:true,
    exact_signed_transaction_hash:true,
    signing_lineage_bound:true,
    one_submission_attempt_only:true,
    single_use:true,
    fresh_prebroadcast_observation_required:true,
    durable_consumption_before_broadcaster_access_required:true,
    runtime_expiry_recheck_before_broadcast_required:true,
    exact_contract_creation_consequence_authorized:true,
    exact_gas_fee_spend_authorized:true,
    additional_value_transfer_authorized:false,
    replacement_transaction_authorized:false,
    automatic_retry:false,
  };
  exactKeys(
    authorization.authorization_scope,
    Object.keys(authScope),
    "registry_prebroadcast_authorization_scope",
  );
  for(const [key,value] of Object.entries(authScope)){
    if(authorization.authorization_scope[key]!==value){
      throw new Error("registry_prebroadcast_authorization_scope_mismatch:"+key);
    }
  }
  const authAuthority={
    operation_confirmation_verified:true,
    exact_signed_transaction_broadcast_authorized:true,
    source_authorization_artifact_only:true,
    signed_transaction_bytes_access:false,
    credential_access:false,
    private_key_access:false,
    broadcaster_access:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_write_performed:false,
    validator_mutation:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
    automatic_retry:false,
  };
  exactKeys(
    authorization.authority,
    Object.keys(authAuthority),
    "registry_prebroadcast_authorization_authority",
  );
  for(const [key,value] of Object.entries(authAuthority)){
    if(authorization.authority[key]!==value){
      throw new Error("registry_prebroadcast_authorization_authority_mismatch:"+key);
    }
  }
  const start=canonicalUtc(
    authorization.authorized_at_utc,
    "registry_prebroadcast_authorized_at",
  );
  const end=canonicalUtc(
    authorization.valid_until_utc,
    "registry_prebroadcast_authorization_valid_until",
  );
  if(end.ms<=start.ms||end.ms-start.ms>300_000){
    throw new Error("registry_prebroadcast_authorization_window_invalid");
  }
  if(
    authorization.broadcast_authorization_request_id!==
      request.broadcast_authorization_request_id||
    authorization.signed_transaction_id!==request.signed_transaction_id||
    authorization.candidate_id!==request.candidate_id||
    authorization.signing_request_id!==request.signing_request_id||
    authorization.signing_authorization_id!==request.signing_authorization_id||
    authorization.consumption_record_id!==request.consumption_record_id||
    authorization.signing_operation_id!==request.signing_operation_id||
    authorization.transaction_fingerprint_sha256!==
      request.transaction_fingerprint_sha256||
    authorization.deployer_address!==request.deployer_address||
    authorization.signed_at_utc!==request.signed_at_utc||
    authorization.required_confirmation!==expectedConfirmation||
    canonicalJson(authorization.transaction_summary)!==
      canonicalJson(request.transaction_summary)
  ){
    throw new Error("registry_prebroadcast_request_authorization_lineage_mismatch");
  }
  return Object.freeze({request,authorization});
}

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
  if(url!==PRIVATE_SUCCESSOR_RPC_V1){
    throw new Error("rpc_url_not_reviewed");
  }
  const body=JSON.stringify({
    jsonrpc:"2.0",
    id:1,
    method,
    params,
  });
  return await new Promise((resolve,reject)=>{
    let settled=false;
    let totalTimer=null;
    const finish=(error,value)=>{
      if(settled) return;
      settled=true;
      if(totalTimer!==null){
        clearTimeout(totalTimer);
        totalTimer=null;
      }
      if(error) reject(error);
      else resolve(value);
    };
    const req=http.request({
      protocol:"http:",
      hostname:"127.0.0.1",
      port:18553,
      path:"/",
      method:"POST",
      family:4,
      agent:false,
      headers:{
        Accept:"application/json",
        "Content-Type":"application/json",
        "Content-Length":String(Buffer.byteLength(body)),
        Connection:"close",
        "User-Agent":"void-datanet-registry-prebroadcast-observer-v1",
      },
    },(res)=>{
      const chunks=[];
      let total=0;
      res.on("data",(chunk)=>{
        const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
        total+=bytes.length;
        if(total>MAX_RESPONSE_BYTES){
          req.destroy(new Error("rpc_response_too_large"));
          return;
        }
        chunks.push(bytes);
      });
      res.on("end",()=>{
        const status=Number(res.statusCode);
        if(!Number.isInteger(status)||status<200||status>=300){
          finish(new Error("rpc_http_"+String(res.statusCode)));
          return;
        }
        let parsed;
        try{
          parsed=JSON.parse(Buffer.concat(chunks).toString("utf8"));
        }catch{
          finish(new Error("rpc_json_invalid"));
          return;
        }
        if(parsed?.error){
          finish(new Error("rpc_error"));
          return;
        }
        finish(null,parsed?.result);
      });
    });
    totalTimer=setTimeout(
      ()=>req.destroy(new Error("rpc_total_deadline_exceeded")),
      5000,
    );
    req.setTimeout(5000);
    req.on("timeout",()=>req.destroy(new Error("rpc_timeout")));
    req.on("error",(error)=>finish(error));
    req.end(body);
  });
}

export async function observeVoidDatanetRegistryPrebroadcastV1(input){
  let authorization;
  try{
    authorization=
      validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1({
        broadcast_request:input?.broadcast_request,
        broadcast_authorization:input?.broadcast_authorization,
      }).authorization;
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

  const observedAt=String(input?.observed_at_utc||"");
  const observedMs=Date.parse(observedAt);
  if(
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(observedAt)||
    !Number.isFinite(observedMs)||
    new Date(observedMs).toISOString()!==observedAt
  ){
    return held("registry_prebroadcast_observed_at_invalid",authorization);
  }
  const validUntil=new Date(
    observedMs+VOID_DATANET_REGISTRY_PREBROADCAST_VALIDITY_SECONDS_V1*1000,
  ).toISOString();

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
      observed_at_utc:observedAt,
      valid_until_utc:validUntil,
      freshness_seconds:VOID_DATANET_REGISTRY_PREBROADCAST_VALIDITY_SECONDS_V1,
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
    observation.freshness_seconds!==
      VOID_DATANET_REGISTRY_PREBROADCAST_VALIDITY_SECONDS_V1||
    !Number.isFinite(Date.parse(String(observation.observed_at_utc||"")))||
    !Number.isFinite(Date.parse(String(observation.valid_until_utc||"")))||
    Date.parse(observation.valid_until_utc)-Date.parse(observation.observed_at_utc)!==
      VOID_DATANET_REGISTRY_PREBROADCAST_VALIDITY_SECONDS_V1*1000||
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
      validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1({
        broadcast_request:evidence?.broadcast_request,
        broadcast_authorization:evidence?.broadcast_authorization,
      }).authorization;
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
