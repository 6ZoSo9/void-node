#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import {
  canonicalApollyonOperatorAuthorizationJsonV1,
} from "../scripts/apollyon_operator_authorization_packet_v1.mjs";
import {
  createApollyonAuthorizationCustodyCoreV1,
} from "./apollyon-authorization-custody-core-v1.mjs";

export const VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1 =
  "VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1";

export const VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_AUTHORITY_V1 =
  Object.freeze({
    source_only_service:true,
    unix_socket_only:true,
    server_controlled_socket_path:true,
    server_controlled_state_root:true,
    exact_request_bytes_required:true,
    bounded_request_response:true,
    no_retry:true,
    private_listener_then_hardlink_publication:true,
    advertised_socket_unlink_on_stop:false,
    stale_socket_cleanup_external:true,
    dedicated_custody_uid_intended:true,
    socket_directory_cross_uid_policy_required:true,
    same_uid_socket_path_tamper_resistance_claimed:false,
    custody_core_leaf_unlink_resistance_claimed:false,
    live_host_qualification_performed:false,
    independent_custody_proven:false,
    production_gate_ready:false,
    service_started_by_import:false,
    operator_private_key_access:false,
    production_signing:false,
    attempt_claim:false,
    training_execution:false,
    candidate_weight_mutation:false,
    generation_execution:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
  });

const REQUEST_SCHEMA="void_apollyon_authorization_custody_request_v1";
const RESPONSE_SCHEMA="void_apollyon_authorization_custody_response_v1";
const AUTHORIZATION_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const HASH64=/^[0-9a-f]{64}$/u;
const MAX_REQUEST_BYTES=64*1024;
const MAX_RESPONSE_BYTES=64*1024;
const SOCKET_TIMEOUT_MS=5000;
const MAX_SOCKET_PATH_BYTES=100;

function fail(code){
  throw new Error(code);
}

function canonical(value){
  return canonicalApollyonOperatorAuthorizationJsonV1(value);
}

function sha256Id(value){
  return "sha256:"+crypto.createHash("sha256").update(value).digest("hex");
}

function absolutePath(value,code){
  if(typeof value!=="string"||!path.isAbsolute(value)||value.includes("\0")){
    fail(code);
  }
  const resolved=path.resolve(value);
  if(resolved!==value||resolved===path.parse(resolved).root){
    fail(code);
  }
  return resolved;
}

function exactKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(
    actual.length!==wanted.length||
    actual.some((key,index)=>key!==wanted[index])
  ){
    fail(code);
  }
}

function safeReason(error){
  const raw=String(error?.message||error||"apollyon_custody_service_held");
  if(/^[a-z][a-z0-9_]{2,179}$/u.test(raw))return raw;
  return "apollyon_custody_service_held";
}

function normalizeOptions(raw){
  exactKeys(
    raw,
    [
      "expected_operator_public_key_raw_sha256",
      "operator_public_key_pem",
      "socket_group_gid",
      "socket_path",
      "state_root",
    ],
    "apollyon_custody_service_options_invalid",
  );
  const socketPath=absolutePath(
    raw.socket_path,
    "apollyon_custody_service_socket_path_invalid",
  );
  const stateRoot=absolutePath(
    raw.state_root,
    "apollyon_custody_service_state_root_invalid",
  );
  const gid=Number(raw.socket_group_gid);
  if(!Number.isSafeInteger(gid)||gid<0||gid>0x7fff_ffff){
    fail("apollyon_custody_service_socket_group_invalid");
  }
  if(
    typeof raw.expected_operator_public_key_raw_sha256!=="string"||
    !HASH64.test(raw.expected_operator_public_key_raw_sha256)
  ){
    fail("apollyon_custody_service_operator_fingerprint_invalid");
  }
  if(
    typeof raw.operator_public_key_pem!=="string"||
    raw.operator_public_key_pem.length<32||
    raw.operator_public_key_pem.length>8192
  ){
    fail("apollyon_custody_service_operator_public_key_invalid");
  }
  if(Buffer.byteLength(socketPath,"utf8")>MAX_SOCKET_PATH_BYTES){
    fail("apollyon_custody_service_socket_path_too_long");
  }
  const socketParent=path.dirname(socketPath);
  if(
    socketParent===stateRoot||
    socketParent.startsWith(stateRoot+path.sep)||
    stateRoot.startsWith(socketParent+path.sep)
  ){
    fail("apollyon_custody_service_paths_not_separated");
  }
  return Object.freeze({
    socket_path:socketPath,
    state_root:stateRoot,
    socket_group_gid:gid,
    expected_operator_public_key_raw_sha256:
      raw.expected_operator_public_key_raw_sha256,
    operator_public_key_pem:raw.operator_public_key_pem,
  });
}

function assertSocketParent(directory,gid){
  const metadata=fs.lstatSync(directory,{bigint:true});
  if(
    !metadata.isDirectory()||
    metadata.isSymbolicLink()||
    fs.realpathSync.native(directory)!==directory||
    (typeof process.getuid==="function"&&metadata.uid!==BigInt(process.getuid()))||
    metadata.gid!==BigInt(gid)||
    Number(metadata.mode&0o777n)!==0o750
  ){
    fail("apollyon_custody_service_socket_parent_invalid");
  }
  if(
    typeof process.getgroups==="function"&&
    !process.getgroups().includes(gid)&&
    (typeof process.getgid!=="function"||process.getgid()!==gid)
  ){
    fail("apollyon_custody_service_socket_group_not_granted");
  }
}

function socketIdentity(stat){
  return Object.freeze({
    dev:String(stat.dev),
    ino:String(stat.ino),
    uid:String(stat.uid),
    gid:String(stat.gid),
    mode:Number(stat.mode&0o777n),
  });
}

function sameSocketIdentity(identity,stat){
  return (
    identity!==null&&
    identity.dev===String(stat.dev)&&
    identity.ino===String(stat.ino)
  );
}

function normalizeRequest(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)){
    fail("apollyon_custody_service_request_invalid");
  }
  if(raw.method==="consume"){
    exactKeys(
      raw,
      ["marker","method","packet","schema","version"],
      "apollyon_custody_service_request_invalid",
    );
    if(
      raw.schema!==REQUEST_SCHEMA||
      raw.marker!==VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1||
      raw.version!==1
    ){
      fail("apollyon_custody_service_request_invalid");
    }
    return Object.freeze({
      schema:REQUEST_SCHEMA,
      marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1,
      version:1,
      method:"consume",
      packet:raw.packet,
    });
  }
  if(raw.method==="assert"){
    exactKeys(
      raw,
      ["authorization_id","marker","method","schema","version"],
      "apollyon_custody_service_request_invalid",
    );
    if(
      raw.schema!==REQUEST_SCHEMA||
      raw.marker!==VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1||
      raw.version!==1||
      typeof raw.authorization_id!=="string"||
      !AUTHORIZATION_ID.test(raw.authorization_id)
    ){
      fail("apollyon_custody_service_request_invalid");
    }
    return Object.freeze({
      schema:REQUEST_SCHEMA,
      marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1,
      version:1,
      method:"assert",
      authorization_id:raw.authorization_id,
    });
  }
  fail("apollyon_custody_service_request_invalid");
}

function held(reason){
  return Object.freeze({
    ok:false,
    status:"held",
    reason,
    source_service_contract_proven:true,
    independent_custody_proven:false,
    live_host_qualification_performed:false,
    attempt_claimed:false,
    training_execution_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    funds_movement_performed:false,
  });
}

function responseEnvelope(requestSha256,decision){
  return Object.freeze({
    schema:RESPONSE_SCHEMA,
    marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1,
    version:1,
    request_sha256:requestSha256,
    decision,
  });
}

function serializeResponse(response){
  const bytes=Buffer.from(canonical(response)+"\n","utf8");
  if(bytes.length>MAX_RESPONSE_BYTES){
    return Buffer.from(
      canonical(
        responseEnvelope(
          sha256Id(Buffer.from("oversize","utf8")),
          held("apollyon_custody_service_response_too_large"),
        ),
      )+"\n",
      "utf8",
    );
  }
  return bytes;
}

function parseRequestBytes(bytes){
  if(bytes.length<3||bytes.length>MAX_REQUEST_BYTES){
    fail("apollyon_custody_service_request_size_invalid");
  }
  const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  if(!text.endsWith("\n")||text.slice(0,-1).includes("\n")){
    fail("apollyon_custody_service_request_framing_invalid");
  }
  const body=text.slice(0,-1);
  let parsed;
  try{
    parsed=JSON.parse(body);
  }catch{
    fail("apollyon_custody_service_request_json_invalid");
  }
  const normalized=normalizeRequest(parsed);
  const canonicalBytes=Buffer.from(canonical(normalized)+"\n","utf8");
  if(!bytes.equals(canonicalBytes)){
    fail("apollyon_custody_service_request_noncanonical");
  }
  return Object.freeze({
    normalized,
    request_sha256:sha256Id(bytes),
  });
}

function privateListenPath(socketPath){
  const parent=path.dirname(socketPath);
  for(let i=0;i<64;i+=1){
    const candidate=path.join(parent,".v"+crypto.randomBytes(2).toString("hex"));
    if(Buffer.byteLength(candidate,"utf8")>MAX_SOCKET_PATH_BYTES)continue;
    try{
      fs.lstatSync(candidate);
    }catch(error){
      if(error?.code==="ENOENT")return candidate;
      throw error;
    }
  }
  fail("apollyon_custody_service_private_socket_unavailable");
}

export function createApollyonAuthorizationCustodyServiceV1(rawOptions){
  const options=normalizeOptions(rawOptions);
  let core=null;
  let server=null;
  let started=false;
  let lifecycleBusy=false;
  let hiddenPath=null;
  let boundIdentity=null;
  const sockets=new Set();

  function state(){
    return Object.freeze({
      started,
      core_present:core!==null,
      server_present:server!==null,
      server_listening:Boolean(server?.listening),
      hidden_path_present:hiddenPath!==null,
      advertised_socket_identity_bound:boundIdentity!==null,
      accepted_socket_count:sockets.size,
    });
  }

  async function cleanupAfterFailedStart(advertisedPublished){
    for(const socket of sockets)socket.destroy();
    if(server?.listening){
      await new Promise((resolve)=>server.close(()=>resolve()));
    }
    if(
      advertisedPublished&&
      boundIdentity!==null
    ){
      try{
        const advertised=fs.lstatSync(options.socket_path,{bigint:true});
        if(advertised.isSocket()&&sameSocketIdentity(boundIdentity,advertised)){
          fs.unlinkSync(options.socket_path);
        }
      }catch(error){
        if(error?.code!=="ENOENT")throw error;
      }
    }
    if(hiddenPath!==null){
      try{
        const hidden=fs.lstatSync(hiddenPath,{bigint:true});
        if(boundIdentity!==null&&hidden.isSocket()&&sameSocketIdentity(boundIdentity,hidden)){
          fs.unlinkSync(hiddenPath);
        }
      }catch(error){
        if(error?.code!=="ENOENT")throw error;
      }
    }
    core?.close();
    core=null;
    server=null;
    hiddenPath=null;
    boundIdentity=null;
    started=false;
  }

  async function start(){
    if(lifecycleBusy)fail("apollyon_custody_service_lifecycle_busy");
    lifecycleBusy=true;
    let advertisedPublished=false;
    try{
      if(started)fail("apollyon_custody_service_already_started");
      assertSocketParent(path.dirname(options.socket_path),options.socket_group_gid);
      try{
        fs.lstatSync(options.socket_path);
        fail("apollyon_custody_service_socket_path_exists");
      }catch(error){
        if(
          error instanceof Error&&
          error.message==="apollyon_custody_service_socket_path_exists"
        ){
          throw error;
        }
        if(error?.code!=="ENOENT")throw error;
      }

      core=createApollyonAuthorizationCustodyCoreV1({
        state_root:options.state_root,
        expected_operator_public_key_raw_sha256:
          options.expected_operator_public_key_raw_sha256,
        operator_public_key:options.operator_public_key_pem,
      });

      hiddenPath=privateListenPath(options.socket_path);
      server=net.createServer((socket)=>{
        sockets.add(socket);
        socket.setTimeout(SOCKET_TIMEOUT_MS);
        const chunks=[];
        let total=0;
        let finished=false;

        const finish=(response)=>{
          if(finished)return;
          finished=true;
          const bytes=serializeResponse(response);
          socket.write(bytes);
          socket.destroySoon();
        };

        socket.on("data",(chunk)=>{
          if(finished)return;
          total+=chunk.length;
          if(total>MAX_REQUEST_BYTES){
            finish(
              responseEnvelope(
                sha256Id(Buffer.from("oversize","utf8")),
                held("apollyon_custody_service_request_too_large"),
              ),
            );
            return;
          }
          chunks.push(Buffer.from(chunk));
        });

        socket.on("timeout",()=>{
          finish(
            responseEnvelope(
              sha256Id(Buffer.from("timeout","utf8")),
              held("apollyon_custody_service_request_timeout"),
            ),
          );
        });

        socket.on("end",()=>{
          if(finished)return;
          let parsed;
          try{
            const bytes=Buffer.concat(chunks,total);
            parsed=parseRequestBytes(bytes);
            const decision=
              parsed.normalized.method==="consume"
                ? core.consume(parsed.normalized.packet)
                : core.assertConsumed(parsed.normalized.authorization_id);
            finish(responseEnvelope(parsed.request_sha256,decision));
          }catch(error){
            finish(
              responseEnvelope(
                sha256Id(Buffer.from("invalid","utf8")),
                held(safeReason(error)),
              ),
            );
          }
        });

        socket.on("error",()=>{});
        socket.on("close",()=>sockets.delete(socket));
      });

      await new Promise((resolve,reject)=>{
        const onError=(error)=>{
          server.off("listening",onListening);
          reject(error);
        };
        const onListening=()=>{
          server.off("error",onError);
          resolve();
        };
        server.once("error",onError);
        server.once("listening",onListening);
        server.listen(hiddenPath);
      });

      fs.chmodSync(hiddenPath,0o660);
      if(typeof process.getuid==="function"){
        fs.chownSync(hiddenPath,process.getuid(),options.socket_group_gid);
      }
      const hidden=fs.lstatSync(hiddenPath,{bigint:true});
      if(
        !hidden.isSocket()||
        Number(hidden.mode&0o777n)!==0o660||
        hidden.gid!==BigInt(options.socket_group_gid)||
        (typeof process.getuid==="function"&&hidden.uid!==BigInt(process.getuid()))
      ){
        fail("apollyon_custody_service_private_socket_policy_invalid");
      }
      boundIdentity=socketIdentity(hidden);
      fs.linkSync(hiddenPath,options.socket_path);
      advertisedPublished=true;
      const advertised=fs.lstatSync(options.socket_path,{bigint:true});
      if(
        !advertised.isSocket()||
        !sameSocketIdentity(boundIdentity,advertised)||
        Number(advertised.mode&0o777n)!==0o660||
        advertised.gid!==BigInt(options.socket_group_gid)
      ){
        fail("apollyon_custody_service_advertised_socket_invalid");
      }

      started=true;
      return Object.freeze({
        ok:true,
        status:"started_source_service",
        source_service_contract_proven:true,
        live_host_qualification_performed:false,
        independent_custody_proven:false,
        attempt_claimed:false,
        training_execution_performed:false,
      });
    }catch(error){
      await cleanupAfterFailedStart(advertisedPublished);
      throw error;
    }finally{
      lifecycleBusy=false;
    }
  }

  async function stop(){
    if(lifecycleBusy)fail("apollyon_custody_service_lifecycle_busy");
    lifecycleBusy=true;
    try{
      if(!started)fail("apollyon_custody_service_not_started");
      for(const socket of sockets)socket.destroy();
      if(server?.listening){
        await new Promise((resolve)=>server.close(()=>resolve()));
      }
      core?.close();
      core=null;

      if(hiddenPath!==null){
        try{
          const hidden=fs.lstatSync(hiddenPath,{bigint:true});
          if(boundIdentity!==null&&hidden.isSocket()&&sameSocketIdentity(boundIdentity,hidden)){
            fs.unlinkSync(hiddenPath);
          }
        }catch(error){
          if(error?.code!=="ENOENT")throw error;
        }
      }

      server=null;
      hiddenPath=null;
      boundIdentity=null;
      started=false;
      return Object.freeze({
        ok:true,
        status:"stopped_source_service",
        advertised_socket_unlinked:false,
        stale_advertised_socket_cleanup_external:true,
        live_host_qualification_performed:false,
        independent_custody_proven:false,
      });
    }finally{
      lifecycleBusy=false;
    }
  }

  return Object.freeze({
    marker:VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_V1,
    version:1,
    start,
    stop,
    state,
    options:Object.freeze({
      socket_path:options.socket_path,
      state_root:options.state_root,
      socket_group_gid:options.socket_group_gid,
      expected_operator_public_key_raw_sha256:
        options.expected_operator_public_key_raw_sha256,
    }),
    authority:VOID_APOLLYON_AUTHORIZATION_CUSTODY_SERVICE_AUTHORITY_V1,
  });
}
