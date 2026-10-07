#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

export const VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_CLIENT_V1 =
  "VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_CLIENT_V1";

const SERVICE_MARKER=
  "VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_SERVICE_V1";
const REQUEST_SCHEMA=
  "void_datanet_registry_broadcast_generation_custody_request_v1";
const RESPONSE_SCHEMA=
  "void_datanet_registry_broadcast_generation_custody_response_v1";
const SHA256_ID=/^sha256:[0-9a-f]{64}$/u;
const FENCE_ID=/^voiddrbgf1_[0-9a-f]{64}$/u;
const MAX_TIMEOUT_MS=5000;
const MAX_RESPONSE_BYTES=64*1024;

function fail(code){
  throw new Error(code);
}

function directObject(value,keys,code){
  if(!value||typeof value!=="object"||Array.isArray(value)) fail(code);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null) fail(code);
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const own=Reflect.ownKeys(descriptors);
  if(own.some((key)=>typeof key!=="string")) fail(code);
  const actual=[...own].sort();
  const expected=[...keys].sort();
  if(
    actual.length!==expected.length||
    actual.some((key,index)=>key!==expected[index])
  ){
    fail(code);
  }
  const out=Object.create(null);
  for(const key of keys){
    const descriptor=descriptors[key];
    if(
      !descriptor||
      descriptor.enumerable!==true||
      !Object.hasOwn(descriptor,"value")
    ){
      fail(code);
    }
    out[key]=descriptor.value;
  }
  return Object.freeze(out);
}

function canonical(value){
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isSafeInteger(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object"){
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  fail("datanet_broadcast_generation_custody_client_noncanonical_value");
}

function canonicalJson(value){
  return JSON.stringify(canonical(value));
}

function sha256Id(value){
  return "sha256:"+
    crypto.createHash("sha256").update(value).digest("hex");
}

function absolutePath(value,code){
  const raw=String(value??"").trim();
  if(!raw||!path.isAbsolute(raw)||raw.includes("\0")) fail(code);
  const resolved=path.resolve(raw);
  if(resolved===path.parse(resolved).root) fail(code);
  return resolved;
}

function boundedInteger(value,min,max,code){
  const parsed=Number(value);
  if(!Number.isSafeInteger(parsed)||parsed<min||parsed>max) fail(code);
  return parsed;
}

function assertNoSymlinkAncestors(target,code){
  const resolved=path.resolve(target);
  const parsed=path.parse(resolved);
  let cursor=parsed.root;
  for(const segment of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)){
    cursor=path.join(cursor,segment);
    const stat=fs.lstatSync(cursor);
    if(stat.isSymbolicLink()) fail(code);
  }
}

function normalizeOptions(raw){
  const value=directObject(
    raw,
    [
      "socket_path",
      "connect_timeout_ms",
      "response_timeout_ms",
      "max_response_bytes",
    ],
    "datanet_broadcast_generation_custody_client_options_invalid",
  );
  return Object.freeze({
    socket_path:absolutePath(
      value.socket_path,
      "datanet_broadcast_generation_custody_client_socket_path_invalid",
    ),
    connect_timeout_ms:boundedInteger(
      value.connect_timeout_ms,
      1,
      MAX_TIMEOUT_MS,
      "datanet_broadcast_generation_custody_client_connect_timeout_invalid",
    ),
    response_timeout_ms:boundedInteger(
      value.response_timeout_ms,
      1,
      MAX_TIMEOUT_MS,
      "datanet_broadcast_generation_custody_client_response_timeout_invalid",
    ),
    max_response_bytes:boundedInteger(
      value.max_response_bytes,
      1024,
      MAX_RESPONSE_BYTES,
      "datanet_broadcast_generation_custody_client_response_bound_invalid",
    ),
  });
}

function assertSocketPath(options){
  assertNoSymlinkAncestors(
    path.dirname(options.socket_path),
    "datanet_broadcast_generation_custody_client_socket_parent_invalid",
  );
  const parent=fs.lstatSync(path.dirname(options.socket_path));
  const socket=fs.lstatSync(options.socket_path);
  if(
    !parent.isDirectory()||
    parent.isSymbolicLink()||
    (parent.mode&0o777)!==0o750||
    !socket.isSocket()||
    socket.isSymbolicLink()||
    (socket.mode&0o777)!==0o660||
    socket.gid!==parent.gid
  ){
    fail("datanet_broadcast_generation_custody_client_socket_policy_invalid");
  }
}

function normalizeContext(raw){
  if(!raw||typeof raw!=="object"){
    fail("datanet_broadcast_generation_custody_client_context_invalid");
  }
  const signal=raw.signal;
  const timeoutMs=boundedInteger(
    raw.timeout_ms,
    1,
    MAX_TIMEOUT_MS,
    "datanet_broadcast_generation_custody_client_context_invalid",
  );
  if(
    !signal||
    typeof signal.aborted!=="boolean"||
    typeof signal.addEventListener!=="function"||
    typeof signal.removeEventListener!=="function"
  ){
    fail("datanet_broadcast_generation_custody_client_context_invalid");
  }
  return Object.freeze({signal,timeout_ms:timeoutMs});
}

const SUCCESS_DECISION_KEYS=Object.freeze([
  "ok",
  "status",
  "broadcast_generation_fence_id",
  "custody_receipt_sha256",
  "source_service_contract_proven",
  "independent_custody_proven",
  "live_host_qualification_performed",
  "operation_performed",
  "rpc_access",
  "transaction_broadcast",
  "funds_movement",
]);
const HELD_DECISION_KEYS=Object.freeze([
  "ok",
  "status",
  "reason",
  "broadcast_generation_fence_id",
  "custody_receipt_sha256",
  "source_service_contract_proven",
  "independent_custody_proven",
  "live_host_qualification_performed",
  "operation_performed",
  "rpc_access",
  "transaction_broadcast",
  "funds_movement",
]);

function validateDecision(decision,expectedMethod,expectedFenceId,expectedReceipt){
  if(
    !["claim","assert"].includes(expectedMethod)||
    typeof expectedFenceId!=="string"||
    !FENCE_ID.test(expectedFenceId)
  ){
    fail("datanet_broadcast_generation_custody_client_response_invalid");
  }
  if(!decision||typeof decision!=="object"||Array.isArray(decision)){
    fail("datanet_broadcast_generation_custody_client_response_invalid");
  }
  if(decision.ok===true){
    const value=directObject(
      decision,
      SUCCESS_DECISION_KEYS,
      "datanet_broadcast_generation_custody_client_response_invalid",
    );
    const expectedOperationPerformed=value.status==="created";
    if(
      (
        expectedMethod==="claim"
          ? !["created","exists"].includes(value.status)
          : value.status!=="asserted"
      )||
      value.broadcast_generation_fence_id!==expectedFenceId||
      typeof value.custody_receipt_sha256!=="string"||
      !SHA256_ID.test(value.custody_receipt_sha256)||
      (
        expectedMethod==="assert"&&
        value.custody_receipt_sha256!==expectedReceipt
      )||
      value.source_service_contract_proven!==true||
      value.independent_custody_proven!==false||
      value.live_host_qualification_performed!==false||
      value.operation_performed!==expectedOperationPerformed||
      value.rpc_access!==false||
      value.transaction_broadcast!==false||
      value.funds_movement!==false
    ){
      fail("datanet_broadcast_generation_custody_client_response_invalid");
    }
    return Object.freeze({...value});
  }
  const value=directObject(
    decision,
    HELD_DECISION_KEYS,
    "datanet_broadcast_generation_custody_client_response_invalid",
  );
  if(
    value.ok!==false||
    value.status!=="held"||
    typeof value.reason!=="string"||
    !/^[a-z][a-z0-9_]{2,179}$/u.test(value.reason)||
    value.broadcast_generation_fence_id!==null||
    value.custody_receipt_sha256!==null||
    value.source_service_contract_proven!==true||
    value.independent_custody_proven!==false||
    value.live_host_qualification_performed!==false||
    value.operation_performed!==false||
    value.rpc_access!==false||
    value.transaction_broadcast!==false||
    value.funds_movement!==false
  ){
    fail("datanet_broadcast_generation_custody_client_response_invalid");
  }
  return Object.freeze({...value});
}

function validateResponse(
  raw,
  requestSha256,
  expectedMethod,
  expectedFenceId,
  expectedReceipt,
){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)){
    fail("datanet_broadcast_generation_custody_client_response_invalid");
  }
  const keys=Object.keys(raw).sort();
  const expected=[
    "schema",
    "marker",
    "version",
    "request_sha256",
    "decision",
  ].sort();
  if(
    keys.length!==expected.length||
    keys.some((key,index)=>key!==expected[index])||
    raw.schema!==RESPONSE_SCHEMA||
    raw.marker!==SERVICE_MARKER||
    raw.version!==1||
    raw.request_sha256!==requestSha256
  ){
    fail("datanet_broadcast_generation_custody_client_response_invalid");
  }
  return validateDecision(
    raw.decision,
    expectedMethod,
    expectedFenceId,
    expectedReceipt,
  );
}

async function request(options,envelope,rawContext){
  const context=normalizeContext(rawContext);
  assertSocketPath(options);
  if(context.signal.aborted){
    throw context.signal.reason instanceof Error
      ? context.signal.reason
      : new Error("datanet_broadcast_generation_custody_client_aborted");
  }
  // Use one serialized request as the authority for the wire bytes, digest,
  // and response expectations. Caller-owned fence objects can mutate later.
  const requestJson=JSON.stringify(envelope);
  if(typeof requestJson!=="string"){
    fail("datanet_broadcast_generation_custody_client_request_invalid");
  }
  if(context.signal.aborted){
    throw context.signal.reason instanceof Error
      ? context.signal.reason
      : new Error("datanet_broadcast_generation_custody_client_aborted");
  }
  const serializedRequest=JSON.parse(requestJson);
  const requestSha256=sha256Id(
    Buffer.from(canonicalJson(serializedRequest),"utf8"),
  );
  const line=requestJson+"\n";
  if(Buffer.byteLength(line,"utf8")>64*1024){
    fail("datanet_broadcast_generation_custody_client_request_too_large");
  }
  const totalTimeout=Math.min(
    MAX_TIMEOUT_MS,
    context.timeout_ms,
  );
  const connectTimeout=Math.min(options.connect_timeout_ms,totalTimeout);
  const responseTimeout=Math.min(options.response_timeout_ms,totalTimeout);

  return await new Promise((resolve,reject)=>{
    let settled=false;
    let connected=false;
    let input="";
    let totalTimer=null;
    let connectTimer=null;
    let responseTimer=null;
    let socket=null;

    const cleanup=()=>{
      if(totalTimer!==null) clearTimeout(totalTimer);
      if(connectTimer!==null) clearTimeout(connectTimer);
      if(responseTimer!==null) clearTimeout(responseTimer);
      context.signal.removeEventListener("abort",onAbort);
    };
    const finish=(error,value)=>{
      if(settled) return;
      settled=true;
      cleanup();
      if(error){
        if(socket!==null) socket.destroy(error);
        reject(error);
      }else{
        if(socket!==null) socket.destroy();
        resolve(value);
      }
    };
    const onAbort=()=>{
      finish(
        context.signal.reason instanceof Error
          ? context.signal.reason
          : new Error("datanet_broadcast_generation_custody_client_aborted"),
      );
    };
    const armResponseTimeout=()=>{
      if(responseTimer!==null) clearTimeout(responseTimer);
      responseTimer=setTimeout(
        ()=>finish(
          new Error(
            "datanet_broadcast_generation_custody_client_response_timeout",
          ),
        ),
        responseTimeout,
      );
    };

    context.signal.addEventListener("abort",onAbort,{once:true});
    if(context.signal.aborted){
      onAbort();
      return;
    }
    totalTimer=setTimeout(
      ()=>finish(
        new Error("datanet_broadcast_generation_custody_client_total_timeout"),
      ),
      totalTimeout,
    );
    connectTimer=setTimeout(
      ()=>finish(
        new Error("datanet_broadcast_generation_custody_client_connect_timeout"),
      ),
      connectTimeout,
    );

    socket=net.createConnection(options.socket_path);
    socket.on("error",(error)=>finish(error));
    socket.on("connect",()=>{
      connected=true;
      if(connectTimer!==null){
        clearTimeout(connectTimer);
        connectTimer=null;
      }
      armResponseTimeout();
      socket.write(line);
    });
    socket.on("data",(chunk)=>{
      if(!connected||settled) return;
      input+=chunk.toString("utf8");
      if(Buffer.byteLength(input,"utf8")>options.max_response_bytes){
        finish(
          new Error(
            "datanet_broadcast_generation_custody_client_response_too_large",
          ),
        );
        return;
      }
      armResponseTimeout();
      const newline=input.indexOf("\n");
      if(newline<0) return;
      if(input.slice(newline+1).length!==0){
        finish(
          new Error(
            "datanet_broadcast_generation_custody_client_response_invalid",
          ),
        );
        return;
      }
      let parsed;
      try{
        parsed=JSON.parse(input.slice(0,newline));
      }catch(error){
        void error;
        finish(
          new Error(
            "datanet_broadcast_generation_custody_client_response_invalid",
          ),
        );
        return;
      }
      let decision;
      try{
        decision=validateResponse(
          parsed,
          requestSha256,
          serializedRequest.method,
          serializedRequest.fence?.broadcast_generation_fence_id,
          serializedRequest.custody_receipt_sha256,
        );
      }catch(error){
        finish(error);
        return;
      }
      finish(null,decision);
    });
    socket.on("close",()=>{
      if(!settled){
        finish(
          new Error(
            "datanet_broadcast_generation_custody_client_premature_close",
          ),
        );
      }
    });
  });
}

export function createVoidDatanetRegistryBroadcastGenerationCustodyTransportV1(
  rawOptions,
){
  const options=normalizeOptions(rawOptions);
  return Object.freeze({
    options,
    async claim(fence,context){
      return await request(
        options,
        {
          schema:REQUEST_SCHEMA,
          marker:SERVICE_MARKER,
          version:1,
          method:"claim",
          fence,
          custody_receipt_sha256:null,
        },
        context,
      );
    },
    async assert(claim,fence,context){
      if(
        !claim||
        typeof claim!=="object"||
        typeof claim.custody_receipt_sha256!=="string"||
        !SHA256_ID.test(claim.custody_receipt_sha256)
      ){
        fail("datanet_broadcast_generation_custody_client_claim_invalid");
      }
      return await request(
        options,
        {
          schema:REQUEST_SCHEMA,
          marker:SERVICE_MARKER,
          version:1,
          method:"assert",
          fence,
          custody_receipt_sha256:claim.custody_receipt_sha256,
        },
        context,
      );
    },
  });
}

export const VOID_DATANET_REGISTRY_BROADCAST_GENERATION_CUSTODY_CLIENT_AUTHORITY_V1 =
  Object.freeze({
    source_only_transport:true,
    unix_socket_only:true,
    caller_selected_socket_per_request:false,
    arbitrary_url:false,
    redirects:false,
    bounded_connect_timeout:true,
    bounded_response_timeout:true,
    bounded_total_timeout_from_context:true,
    abort_signal_required:true,
    abort_destroys_socket:true,
    exact_request_response_binding:true,
    live_host_qualification_performed:false,
    independent_custody_proven:false,
    runtime_integration:false,
    rpc_access:false,
    transaction_broadcast:false,
    funds_movement:false,
  });
