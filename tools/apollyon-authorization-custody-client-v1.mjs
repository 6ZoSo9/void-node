#!/usr/bin/env node

import crypto from "node:crypto";
import net from "node:net";
import path from "node:path";

import {
  canonicalApollyonOperatorAuthorizationJsonV1,
} from "../scripts/apollyon_operator_authorization_packet_v1.mjs";
import {
  VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1,
} from "./apollyon-authorization-custody-service-v1.mjs";

export const VOID_APOLLYON_AUTHORIZATION_CUSTODY_CLIENT_V1 =
  "VOID_APOLLYON_AUTHORIZATION_CUSTODY_CLIENT_V1";

const REQUEST_SCHEMA="void_apollyon_authorization_custody_request_v1";
const RESPONSE_SCHEMA="void_apollyon_authorization_custody_response_v1";
const AUTHORIZATION_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const MAX_RESPONSE_BYTES=64*1024;
const DEFAULT_TIMEOUT_MS=5000;

function fail(code){
  throw new Error(code);
}

function canonical(value){
  return canonicalApollyonOperatorAuthorizationJsonV1(value);
}

function sha256Id(value){
  return "sha256:"+crypto.createHash("sha256").update(value).digest("hex");
}

function socketPath(value){
  if(typeof value!=="string"||!path.isAbsolute(value)||value.includes("\0")){
    fail("apollyon_custody_client_socket_path_invalid");
  }
  const resolved=path.resolve(value);
  if(resolved!==value||resolved===path.parse(resolved).root){
    fail("apollyon_custody_client_socket_path_invalid");
  }
  return resolved;
}

function boundedTimeout(value){
  const parsed=value===undefined?DEFAULT_TIMEOUT_MS:Number(value);
  if(!Number.isSafeInteger(parsed)||parsed<100||parsed>30_000){
    fail("apollyon_custody_client_timeout_invalid");
  }
  return parsed;
}

function parseResponse(bytes,expectedRequestSha256){
  if(bytes.length<3||bytes.length>MAX_RESPONSE_BYTES){
    fail("apollyon_custody_client_response_size_invalid");
  }
  const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  if(!text.endsWith("\n")||text.slice(0,-1).includes("\n")){
    fail("apollyon_custody_client_response_framing_invalid");
  }
  let parsed;
  try{
    parsed=JSON.parse(text.slice(0,-1));
  }catch{
    fail("apollyon_custody_client_response_json_invalid");
  }
  if(
    !parsed||
    typeof parsed!=="object"||
    Array.isArray(parsed)||
    Object.keys(parsed).sort().join("\n")!==
      ["decision","marker","request_sha256","schema","version"].sort().join("\n")||
    parsed.schema!==RESPONSE_SCHEMA||
    parsed.marker!==VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1||
    parsed.version!==1||
    parsed.request_sha256!==expectedRequestSha256
  ){
    fail("apollyon_custody_client_response_invalid");
  }
  if(canonical(parsed)+"\n"!==text){
    fail("apollyon_custody_client_response_noncanonical");
  }
  return parsed.decision;
}

function requestBytes(method,value){
  let request;
  if(method==="consume"){
    request={
      schema:REQUEST_SCHEMA,
      marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1,
      version:1,
      method:"consume",
      packet:value,
    };
  }else if(method==="assert"){
    if(typeof value!=="string"||!AUTHORIZATION_ID.test(value)){
      fail("apollyon_custody_client_authorization_id_invalid");
    }
    request={
      schema:REQUEST_SCHEMA,
      marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1,
      version:1,
      method:"assert",
      authorization_id:value,
    };
  }else{
    fail("apollyon_custody_client_method_invalid");
  }
  return Buffer.from(canonical(request)+"\n","utf8");
}

export function createApollyonAuthorizationCustodyClientV1(options){
  const fixedSocketPath=socketPath(options?.socket_path);

  async function send(method,value,requestOptions={}){
    const timeoutMs=boundedTimeout(requestOptions.timeout_ms);
    const signal=requestOptions.signal??null;
    if(signal!==null&&!(signal instanceof AbortSignal)){
      fail("apollyon_custody_client_signal_invalid");
    }
    if(signal?.aborted)throw new Error("apollyon_custody_client_aborted");

    const bytes=requestBytes(method,value);
    const requestSha256=sha256Id(bytes);

    return await new Promise((resolve,reject)=>{
      const socket=net.createConnection({path:fixedSocketPath});
      const chunks=[];
      let total=0;
      let settled=false;
      const timer=setTimeout(()=>{
        finishReject(new Error("apollyon_custody_client_timeout"));
      },timeoutMs);

      const abort=()=>{
        finishReject(new Error("apollyon_custody_client_aborted"));
      };

      function cleanup(){
        clearTimeout(timer);
        signal?.removeEventListener("abort",abort);
      }

      function finishReject(error){
        if(settled)return;
        settled=true;
        cleanup();
        socket.destroy();
        reject(error);
      }

      function finishResolve(value){
        if(settled)return;
        settled=true;
        cleanup();
        socket.destroy();
        resolve(value);
      }

      signal?.addEventListener("abort",abort,{once:true});

      socket.on("connect",()=>{
        socket.end(bytes);
      });
      socket.on("data",(chunk)=>{
        total+=chunk.length;
        if(total>MAX_RESPONSE_BYTES){
          finishReject(new Error("apollyon_custody_client_response_too_large"));
          return;
        }
        chunks.push(Buffer.from(chunk));
      });
      socket.on("end",()=>{
        if(settled)return;
        try{
          finishResolve(
            parseResponse(Buffer.concat(chunks,total),requestSha256),
          );
        }catch(error){
          finishReject(error);
        }
      });
      socket.on("error",(error)=>finishReject(error));
    });
  }

  return Object.freeze({
    marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_CLIENT_V1,
    version:1,
    socket_path:fixedSocketPath,
    consume:(packet,options={})=>send("consume",packet,options),
    assertConsumed:(authorizationId,options={})=>
      send("assert",authorizationId,options),
    authority:Object.freeze({
      unix_socket_only:true,
      fixed_socket_path:true,
      bounded_timeout:true,
      bounded_response_bytes:true,
      automatic_retry:false,
      http_fallback:false,
      network_fallback:false,
      caller_selected_server_path:false,
      wallet_access:false,
      training_execution:false,
      funds_movement:false,
    }),
  });
}
