#!/usr/bin/env node
import crypto from "node:crypto";
import * as http from "node:http";
import {
  Interface,
  getAddress,
} from "ethers";
import {
  reconstructDatanetContentCommitmentRuntimeV1,
} from "./datanet-content-commitment-deployment-attestation-v1.mjs";
import {
  verifyDatanetContentCommitmentObjectPreflightV1,
} from "./datanet-content-commitment-object-preflight-v1.mjs";

export const VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_V1 =
  "VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_V1";

export const VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_AUTHORITY_V1={
  canonical_chain_id:"2050",
  loopback_http_only:true,
  fixed_block_observation:true,
  block_hash_revalidation_required:true,
  repeated_is_committed_required:true,
  read_only_rpc_methods:[
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBlockByNumber",
    "eth_getCode",
    "eth_call",
  ],
  rpc_mutation:false,
  filesystem_read:false,
  filesystem_write:false,
  credential_access:false,
  wallet_access:false,
  signing:false,
  commit_calldata_construction:false,
  transaction_construction:false,
  transaction_signing:false,
  transaction_broadcast:false,
  deployment:false,
  chain2050_mutation:false,
  automatic_retry:false,
  funds_action:false,
};

const ADDRESS=/^0x[0-9a-f]{40}$/;
const HASH=/^0x[0-9a-f]{64}$/;
const HEX_QUANTITY=/^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const HEX_BYTES=/^0x(?:[0-9a-f]{2})*$/i;
const DEFAULT_TIMEOUT_MS=5000;
const MAX_TIMEOUT_MS=30000;
const DEFAULT_MAX_RESPONSE_BYTES=1048576;
const MAX_RESPONSE_BYTES=8*1024*1024;
const MAX_REQUEST_BYTES=32768;
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
function sha256(value){
  return crypto.createHash("sha256").update(value,"utf8").digest("hex");
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
function quantity(value){
  const raw=text(value);
  if(!HEX_QUANTITY.test(raw)) return null;
  try{return BigInt(raw);}catch(error){return null;}
}
function bytes(value){
  const raw=text(value).toLowerCase();
  return HEX_BYTES.test(raw)?raw:"";
}
function boundedPositive(value,fallback,maximum){
  if(value===undefined||value===null||value==="") return fallback;
  const parsed=Number(value);
  return Number.isSafeInteger(parsed)&&parsed>0&&parsed<=maximum?parsed:null;
}
function normalizeRpcPolicy(input){
  let url;
  try{url=new URL(text(input?.rpc_url));}catch(error){return null;}
  const host=url.hostname.toLowerCase().replace(/^\[/,"").replace(/\]$/,"");
  const hostname=host==="127.0.0.1"?"127.0.0.1":host==="::1"?"::1":null;
  const port=Number(url.port||0);
  const timeout=boundedPositive(
    input?.request_timeout_ms,DEFAULT_TIMEOUT_MS,MAX_TIMEOUT_MS,
  );
  const maxBytes=boundedPositive(
    input?.max_response_bytes,DEFAULT_MAX_RESPONSE_BYTES,MAX_RESPONSE_BYTES,
  );
  if(
    !hostname||
    url.protocol!=="http:"||
    url.username||url.password||url.search||url.hash||
    !Number.isInteger(port)||port<=0||port>65535||
    !url.pathname.startsWith("/")||url.pathname.length>256||
    timeout===null||maxBytes===null
  ) return null;
  const rendered=hostname==="::1"?"[::1]":hostname;
  const normalized="http://"+rendered+":"+String(port)+url.pathname;
  return {
    rpc_url:normalized,
    rpc_url_fingerprint_sha256:sha256(normalized),
    hostname,port,path:url.pathname,
    request_timeout_ms:timeout,
    max_response_bytes:maxBytes,
  };
}
function createHttpTransport(policy){
  let nextId=0;
  return async(call)=>{
    const id=++nextId;
    const body=JSON.stringify({
      jsonrpc:"2.0",id,method:call.method,params:call.params,
    });
    if(Buffer.byteLength(body,"utf8")>MAX_REQUEST_BYTES){
      throw new Error("object_preflight_observer_request_too_large");
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
          "User-Agent":"void-datanet-content-commitment-object-preflight-observer-v1",
        },
      },(response)=>{
        const chunks=[];
        let total=0;
        response.on("data",(chunk)=>{
          const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
          total+=buffer.length;
          if(total>policy.max_response_bytes){
            request.destroy(new Error("object_preflight_observer_response_too_large"));
            return;
          }
          chunks.push(buffer);
        });
        response.on("end",()=>{
          if(Number(response.statusCode||0)!==200){
            finish(new Error("object_preflight_observer_http_status_invalid"));
            return;
          }
          let payload;
          try{
            payload=JSON.parse(Buffer.concat(chunks).toString("utf8"));
          }catch(error){
            finish(new Error("object_preflight_observer_rpc_json_invalid"));
            return;
          }
          if(
            !payload||payload.jsonrpc!=="2.0"||payload.id!==id||
            payload.error||
            !Object.prototype.hasOwnProperty.call(payload,"result")
          ){
            finish(new Error("object_preflight_observer_rpc_envelope_invalid"));
            return;
          }
          finish(null,payload.result);
        });
      });
      request.setTimeout(policy.request_timeout_ms);
      request.on("timeout",()=>{
        request.destroy(new Error("object_preflight_observer_timeout"));
      });
      request.on("error",(error)=>finish(error));
      request.end(body);
    });
  };
}
function held(reason,options={}){
  return {
    ok:false,
    status:"held",
    marker:VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_V1,
    version:1,
    reason,
    rpc_url_fingerprint_sha256:options.rpc_url_fingerprint_sha256??null,
    rpc_methods_used:options.rpc_methods_used||[],
    rpc_call_performed:(options.rpc_methods_used||[]).length>0,
    preflight:null,
    mutation_performed:false,
    credential_access_performed:false,
    wallet_access_performed:false,
    signing_performed:false,
    commit_calldata_constructed:false,
    transaction_constructed:false,
    transaction_broadcast_performed:false,
    chain2050_mutation_performed:false,
    automatic_retry_allowed:false,
    funds_action_performed:false,
    ...(options.detail?{detail:options.detail}:{}),
  };
}
function viewCall(contract,name,args=[]){
  return {to:contract,data:VIEWS.encodeFunctionData(name,args)};
}
function decodeUint(name,raw){
  const data=bytes(raw);
  if(!data)throw new Error("object_preflight_observer_view_result_invalid:"+name);
  const decoded=VIEWS.decodeFunctionResult(name,data);
  return BigInt(decoded[0]).toString();
}
function decodeAddress(name,raw){
  const data=bytes(raw);
  if(!data)throw new Error("object_preflight_observer_view_result_invalid:"+name);
  const decoded=VIEWS.decodeFunctionResult(name,data);
  const value=address(decoded[0]);
  if(!value)throw new Error("object_preflight_observer_view_address_invalid:"+name);
  return value;
}
function decodeBool(name,raw){
  const data=bytes(raw);
  if(!data)throw new Error("object_preflight_observer_view_result_invalid:"+name);
  const decoded=VIEWS.decodeFunctionResult(name,data);
  if(typeof decoded[0]!=="boolean"){
    throw new Error("object_preflight_observer_view_bool_invalid:"+name);
  }
  return decoded[0];
}

export async function observeDatanetContentCommitmentObjectPreflightV1(input){
  const rpcPolicy=normalizeRpcPolicy(input);
  const deployment=input?.deployment_attestation;
  const intent=input?.preparation_intent;
  const registry=address(deployment?.registry_contract_address);
  const publisher=address(deployment?.publisher_address);
  const predecessor=address(deployment?.predecessor_address);
  const objectId=text(intent?.commitment?.object_id_sha256).toLowerCase();

  if(
    !rpcPolicy||!registry||!publisher||!predecessor||
    !/^[0-9a-f]{64}$/.test(objectId)
  ){
    return held("object_preflight_observer_input_invalid",{
      rpc_url_fingerprint_sha256:rpcPolicy?.rpc_url_fingerprint_sha256??null,
    });
  }

  let reconstructed;
  try{
    reconstructed=reconstructDatanetContentCommitmentRuntimeV1({
      compiled_identity:input.compiled_identity,
      publisher_address:publisher,
      predecessor_address:predecessor,
    });
  }catch(error){
    return held("object_preflight_observer_identity_reconstruction_failed",{
      rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
      detail:{message:text(error?.message||error).slice(0,240)},
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
      return held("object_preflight_observer_chain_id_mismatch",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }
    const head=quantity(await call("eth_blockNumber",[]));
    if(head===null||head<=0n){
      return held("object_preflight_observer_head_invalid",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }
    const headTag="0x"+head.toString(16);
    const blockA=await call("eth_getBlockByNumber",[headTag,false]);
    const blockHashA=hash(blockA?.hash);
    if(!blockHashA||quantity(blockA?.number)!==head){
      return held("object_preflight_observer_block_invalid",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }

    const runtimeCode=bytes(await call("eth_getCode",[registry,headTag]));
    if(
      !runtimeCode||
      runtimeCode==="0x"||
      sha256(Buffer.from(runtimeCode.slice(2),"hex"))!==reconstructed.runtime_sha256
    ){
      return held("object_preflight_observer_runtime_mismatch",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }

    const registryVersion=decodeUint(
      "registryVersion",
      await call("eth_call",[viewCall(registry,"registryVersion"),headTag]),
    );
    const maxObjectBytes=decodeUint(
      "maxObjectBytes",
      await call("eth_call",[viewCall(registry,"maxObjectBytes"),headTag]),
    );
    const observedPublisher=decodeAddress(
      "publisher",
      await call("eth_call",[viewCall(registry,"publisher"),headTag]),
    );
    const observedPredecessor=decodeAddress(
      "predecessor",
      await call("eth_call",[viewCall(registry,"predecessor"),headTag]),
    );
    const committedA=decodeBool(
      "isCommitted",
      await call("eth_call",[
        viewCall(registry,"isCommitted",["0x"+objectId]),
        headTag,
      ]),
    );
    const committedB=decodeBool(
      "isCommitted",
      await call("eth_call",[
        viewCall(registry,"isCommitted",["0x"+objectId]),
        headTag,
      ]),
    );

    const blockB=await call("eth_getBlockByNumber",[headTag,false]);
    const blockHashB=hash(blockB?.hash);
    if(blockHashB!==blockHashA||quantity(blockB?.number)!==head){
      return held("object_preflight_observer_block_revalidation_mismatch",{
        rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
        rpc_methods_used:methods,
      });
    }

    const observation={
      chain_id:"2050",
      registry_contract_address:registry,
      observation_block_number:head.toString(),
      observation_block_hash_before:blockHashA,
      observation_block_hash_after:blockHashB,
      deployed_runtime_sha256:reconstructed.runtime_sha256,
      object_id_sha256:objectId,
      views:{
        registry_version:registryVersion,
        max_object_bytes:maxObjectBytes,
        publisher_address:observedPublisher,
        predecessor_address:observedPredecessor,
      },
      is_committed_before:committedA,
      is_committed_after:committedB,
      same_block_tag_for_all_reads:true,
      block_hash_revalidated:true,
      runtime_code_reverified:true,
      registry_views_reverified:true,
      is_committed_repeated:true,
    };
    const preflight=verifyDatanetContentCommitmentObjectPreflightV1({
      preparation_intent:intent,
      deployment_attestation:deployment,
      observation,
    });
    if(preflight.ok===false){
      return held(
        "object_preflight_observer_verifier_held:"+preflight.reason,
        {
          rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
          rpc_methods_used:methods,
          detail:{preflight_reason:preflight.reason},
        },
      );
    }

    return {
      ok:true,
      status:
        "object_uncommitted_verified_ready_for_separate_unsigned_transaction_plan",
      marker:VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_V1,
      version:1,
      rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
      rpc_methods_used:methods,
      observation,
      preflight,
      fixed_block_observation:true,
      block_hash_revalidated:true,
      repeated_is_committed_verified:true,
      rpc_call_performed:true,
      mutation_performed:false,
      credential_access_performed:false,
      wallet_access_performed:false,
      signing_performed:false,
      commit_calldata_constructed:false,
      transaction_constructed:false,
      transaction_broadcast_performed:false,
      chain2050_mutation_performed:false,
      automatic_retry_allowed:false,
      funds_action_performed:false,
      authority:
        VOID_DATANET_CONTENT_COMMITMENT_OBJECT_PREFLIGHT_OBSERVER_AUTHORITY_V1,
    };
  }catch(error){
    return held("object_preflight_observer_rpc_failed",{
      rpc_url_fingerprint_sha256:rpcPolicy.rpc_url_fingerprint_sha256,
      rpc_methods_used:methods,
      detail:{
        error_class:text(error?.name||"Error").slice(0,80),
        message:text(error?.message||error).slice(0,240),
      },
    });
  }
}
