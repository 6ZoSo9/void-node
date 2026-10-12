#!/usr/bin/env node
import crypto from "node:crypto";
import * as http from "node:http";
import {
  getAddress,
  getCreateAddress,
} from "ethers";

import {
  buildDatanetContentCommitmentDeploymentDataV1,
} from "./datanet-content-commitment-deployment-attestation-v1.mjs";

export const VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_V1 =
  "VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_V1";

export const VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_AUTHORITY_V1 = {
  canonical_chain_id:"2050",
  explicit_deployer_address_required:true,
  exact_publisher_address_required:true,
  genesis_zero_predecessor_only:true,
  accepted_compiled_identity_required:true,
  loopback_http_only:true,
  read_only_rpc_methods:[
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getTransactionCount",
    "eth_getBalance",
    "eth_getCode",
  ],
  deployer_pending_nonce_revalidation_required:true,
  observation_block_hash_revalidation_required:true,
  predicted_create_address_derived_only:true,
  predicted_address_nonce_zero_required:true,
  predicted_address_code_empty_required:true,
  exact_constructor_deployment_data_bound:true,
  rpc_mutation:false,
  filesystem_secret_read:false,
  filesystem_write:false,
  credential_access:false,
  wallet_access:false,
  private_key_access:false,
  transaction_construction:false,
  transaction_signing:false,
  transaction_submission:false,
  transaction_broadcast:false,
  deployment:false,
  chain2050_mutation:false,
  deployer_funding:false,
  funds_action:false,
  automatic_retry:false,
};

const ADDRESS=/^0x[0-9a-f]{40}$/;
const HASH=/^0x[0-9a-f]{64}$/;
const HEX_QUANTITY=/^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const ZERO_ADDRESS="0x0000000000000000000000000000000000000000";
const DEFAULT_TIMEOUT_MS=5_000;
const MAX_TIMEOUT_MS=30_000;
const DEFAULT_MAX_RESPONSE_BYTES=1_048_576;
const MAX_RESPONSE_BYTES=8*1024*1024;
const MAX_REQUEST_BYTES=128*1024;

function text(value){
  return typeof value==="string"?value.trim():String(value??"").trim();
}
function sha256(value){
  return crypto.createHash("sha256").update(value,"utf8").digest("hex");
}
function address(value){
  const raw=text(value);
  if(!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try{
    const normalized=getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized)?normalized:"";
  }catch{
    return "";
  }
}
function hash(value){
  const raw=text(value).toLowerCase();
  return HASH.test(raw)?raw:"";
}
function quantity(value){
  const raw=text(value);
  if(!HEX_QUANTITY.test(raw)) return null;
  try{return BigInt(raw);}catch{return null;}
}
function boundedPositive(value,fallback,maximum){
  if(value===undefined||value===null||value==="") return fallback;
  const parsed=Number(value);
  return Number.isSafeInteger(parsed)&&parsed>0&&parsed<=maximum?parsed:null;
}
function normalizeRpcPolicy(input){
  let url;
  try{url=new URL(text(input?.rpc_url));}catch{return null;}
  const host=url.hostname.toLowerCase().replace(/^\[/,"").replace(/\]$/,"");
  const hostname=host==="127.0.0.1"?"127.0.0.1":host==="::1"?"::1":null;
  const port=Number(url.port||0);
  const timeout=boundedPositive(input?.request_timeout_ms,DEFAULT_TIMEOUT_MS,MAX_TIMEOUT_MS);
  const maxBytes=boundedPositive(input?.max_response_bytes,DEFAULT_MAX_RESPONSE_BYTES,MAX_RESPONSE_BYTES);
  if(
    !hostname||
    url.protocol!=="http:"||
    url.username||
    url.password||
    url.search||
    url.hash||
    !Number.isInteger(port)||
    port<=0||
    port>65535||
    !url.pathname.startsWith("/")||
    url.pathname.length>256||
    timeout===null||
    maxBytes===null
  ) return null;
  const rendered=hostname==="::1"?"[::1]":hostname;
  const normalized="http://"+rendered+":"+String(port)+url.pathname;
  return {
    rpc_url:normalized,
    rpc_url_fingerprint_sha256:sha256(normalized),
    hostname,
    port,
    path:url.pathname,
    request_timeout_ms:timeout,
    max_response_bytes:maxBytes,
  };
}
function createHttpTransport(policy){
  let nextId=0;
  return async(call)=>{
    const id=++nextId;
    const body=JSON.stringify({jsonrpc:"2.0",id,method:call.method,params:call.params});
    if(Buffer.byteLength(body,"utf8")>MAX_REQUEST_BYTES){
      throw new Error("datanet_deployer_resolution_request_too_large");
    }
    return await new Promise((resolve,reject)=>{
      let settled=false;
      const finish=(error,value=undefined)=>{
        if(settled)return;
        settled=true;
        if(error)reject(error);else resolve(value);
      };
      const request=http.request({
        protocol:"http:",
        hostname:policy.hostname,
        port:policy.port,
        path:policy.path,
        method:"POST",
        family:policy.hostname==="::1"?6:4,
        agent:false,
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
          "Content-Length":String(Buffer.byteLength(body,"utf8")),
          Connection:"close",
          "User-Agent":"void-datanet-registry-deployer-resolution-v1",
        },
      },(response)=>{
        const chunks=[];
        let total=0;
        response.on("data",(chunk)=>{
          const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
          total+=buffer.length;
          if(total>policy.max_response_bytes){
            request.destroy(new Error("datanet_deployer_resolution_response_too_large"));
            return;
          }
          chunks.push(buffer);
        });
        response.on("end",()=>{
          if(Number(response.statusCode||0)!==200){
            finish(new Error("datanet_deployer_resolution_http_status_invalid"));
            return;
          }
          let payload;
          try{payload=JSON.parse(Buffer.concat(chunks).toString("utf8"));}
          catch{
            finish(new Error("datanet_deployer_resolution_rpc_json_invalid"));
            return;
          }
          if(
            !payload||
            payload.jsonrpc!=="2.0"||
            payload.id!==id||
            payload.error||
            !Object.prototype.hasOwnProperty.call(payload,"result")
          ){
            finish(new Error("datanet_deployer_resolution_rpc_envelope_invalid"));
            return;
          }
          finish(null,payload.result);
        });
      });
      request.setTimeout(policy.request_timeout_ms);
      request.on("timeout",()=>request.destroy(new Error("datanet_deployer_resolution_timeout")));
      request.on("error",(error)=>finish(error));
      request.end(body);
    });
  };
}
function held(reason,options={}){
  return {
    ok:false,
    status:"held",
    marker:VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_V1,
    version:1,
    reason,
    rpc_url_fingerprint_sha256:options.rpc_url_fingerprint_sha256??null,
    rpc_methods_used:options.rpc_methods_used||[],
    observation:null,
    rpc_call_performed:(options.rpc_methods_used||[]).length>0,
    mutation_performed:false,
    credential_access_performed:false,
    wallet_access_performed:false,
    private_key_access_performed:false,
    transaction_construction_performed:false,
    transaction_signing_performed:false,
    transaction_submission_performed:false,
    transaction_broadcast_performed:false,
    deployment_performed:false,
    chain2050_mutation_performed:false,
    deployer_funding_performed:false,
    funds_action_performed:false,
    automatic_retry_allowed:false,
    ...(options.detail?{detail:options.detail}:{}),
  };
}

export async function observeDatanetRegistryDeployerResolutionV1(input){
  const rpcPolicy=normalizeRpcPolicy(input);
  const deployer=address(input?.deployer_address);
  const publisher=address(input?.publisher_address);
  const predecessor=address(input?.predecessor_address);
  if(
    !rpcPolicy||
    !deployer||
    !publisher||
    !predecessor||
    deployer===publisher||
    deployer===ZERO_ADDRESS||
    publisher===ZERO_ADDRESS||
    predecessor!==ZERO_ADDRESS
  ){
    return held("datanet_deployer_resolution_input_invalid",{
      rpc_url_fingerprint_sha256:rpcPolicy?.rpc_url_fingerprint_sha256??null,
    });
  }

  let deploymentData;
  try{
    deploymentData=buildDatanetContentCommitmentDeploymentDataV1({
      compiled_identity:input.compiled_identity,
      publisher_address:publisher,
      predecessor_address:predecessor,
    });
  }catch(error){
    return held("datanet_deployer_resolution_compiled_identity_or_constructor_invalid",{
      rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
      detail:{error:text(error?.message||error).slice(0,240)},
    });
  }

  const methods=[];
  const transport=input?.transport||createHttpTransport(rpcPolicy);
  const call=async(method,params)=>{
    methods.push(method);
    return await transport({method,params});
  };

  try{
    const chainId=quantity(await call("eth_chainId",[]));
    if(chainId!==2050n){
      return held("datanet_deployer_resolution_chain_id_mismatch",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }

    const head=quantity(await call("eth_blockNumber",[]));
    if(head===null||head<=0n){
      return held("datanet_deployer_resolution_head_invalid",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }
    const headTag="0x"+head.toString(16);

    const blockA=await call("eth_getBlockByNumber",[headTag,false]);
    const blockHashA=hash(blockA?.hash);
    if(!blockHashA||quantity(blockA?.number)!==head){
      return held("datanet_deployer_resolution_observation_block_invalid",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }

    const latestNonce=quantity(await call("eth_getTransactionCount",[deployer,headTag]));
    const pendingNonceA=quantity(await call("eth_getTransactionCount",[deployer,"pending"]));
    const balance=quantity(await call("eth_getBalance",[deployer,headTag]));
    if(
      latestNonce===null||
      pendingNonceA===null||
      pendingNonceA<latestNonce||
      balance===null
    ){
      return held("datanet_deployer_resolution_account_observation_invalid",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }

    let predicted;
    try{
      predicted=getCreateAddress({from:deployer,nonce:pendingNonceA}).toLowerCase();
    }catch{
      return held("datanet_deployer_resolution_create_address_failed",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }

    const predictedNonce=quantity(
      await call("eth_getTransactionCount",[predicted,headTag]),
    );
    const predictedCodeRaw=text(await call("eth_getCode",[predicted,headTag])).toLowerCase();
    if(predictedNonce===null||!/^0x(?:[0-9a-f]{2})*$/.test(predictedCodeRaw)){
      return held("datanet_deployer_resolution_predicted_address_observation_invalid",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }

    const pendingNonceB=quantity(await call("eth_getTransactionCount",[deployer,"pending"]));
    const blockB=await call("eth_getBlockByNumber",[headTag,false]);
    if(
      pendingNonceB===null||
      pendingNonceB!==pendingNonceA||
      hash(blockB?.hash)!==blockHashA||
      quantity(blockB?.number)!==head
    ){
      return held("datanet_deployer_resolution_revalidation_mismatch",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }

    const pendingPresent=pendingNonceA>latestNonce;
    const vacant=predictedNonce===0n&&predictedCodeRaw==="0x";

    const observation={
      chain_id:"2050",
      rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
      observation_block_number:head.toString(),
      observation_block_hash:blockHashA,
      deployer_address:deployer,
      publisher_address:publisher,
      predecessor_address:predecessor,
      latest_nonce:latestNonce.toString(),
      pending_nonce:pendingNonceA.toString(),
      pending_transactions_present:pendingPresent,
      deployer_balance_wei:balance.toString(),
      predicted_registry_contract_address:predicted,
      predicted_registry_address_nonce:predictedNonce.toString(),
      predicted_registry_address_code:predictedCodeRaw,
      predicted_registry_address_vacant:vacant,
      constructor_deployment_data_keccak256:deploymentData.deployment_data_keccak256,
      exact_creation_data_bound:true,
      pending_nonce_revalidated:true,
      observation_block_hash_revalidated:true,
    };

    const green=!pendingPresent&&vacant;

    return {
      ok:true,
      status:green
        ?"read_only_deployer_resolution_green_ready_for_source_evidence_binding"
        :"read_only_deployer_resolution_observed_held_on_pending_or_occupied_address",
      marker:VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_V1,
      version:1,
      read_only_observation_complete:true,
      ready_for_source_evidence_binding:green,
      observation,
      rpc_methods_used:methods,
      rpc_call_performed:true,
      mutation_performed:false,
      credential_access_performed:false,
      wallet_access_performed:false,
      private_key_access_performed:false,
      transaction_construction_performed:false,
      transaction_signing_performed:false,
      transaction_submission_performed:false,
      transaction_broadcast_performed:false,
      deployment_performed:false,
      chain2050_mutation_performed:false,
      deployer_funding_performed:false,
      funds_action_performed:false,
      automatic_retry_allowed:false,
      next_gate:green
        ?"bind_exact_read_only_deployer_resolution_evidence_then_build_source_only_unsigned_deployment_plan"
        :"resolve_pending_deployer_state_or_predicted_address_collision_before_unsigned_plan",
      authority:VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_OBSERVER_AUTHORITY_V1,
    };
  }catch(error){
    return held("datanet_deployer_resolution_rpc_failed",{
      rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
      rpc_methods_used:methods,
      detail:{
        error_class:text(error?.name||"Error").slice(0,80),
        message:text(error?.message||error).slice(0,240),
      },
    });
  }
}
