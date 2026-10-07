#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import * as http from "node:http";
import path from "node:path";
import { register } from "node:module";

export const VOID_DATANET_REGISTRY_REVIEWED_EXECUTION_CHILD_V1 =
  "VOID_DATANET_REGISTRY_REVIEWED_EXECUTION_CHILD_V1";
export const VOID_DATANET_REGISTRY_REVIEWED_EXECUTION_CHILD_RESULT_V1 =
  "VOID_DATANET_REGISTRY_REVIEWED_EXECUTION_CHILD_RESULT_V1";

const EXPECTED_RPC="http://127.0.0.1:18553/";
const MAX_INPUT_BYTES=64*1024*1024;
const MAX_OUTPUT_BYTES=24*1024*1024;
const MAX_SOURCE_BYTES=8*1024*1024;
const MAX_SOURCE_TOTAL_BYTES=32*1024*1024;
const MAX_RPC_RESPONSE=64*1024;
const HEX40=/^[0-9a-f]{40}$/u;
const HEX64=/^[0-9a-f]{64}$/u;
const RELATIVE=/^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/u;
const TOOL_REL="tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";
const RPC_REL="tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs";

function fail(code){
  const error=new Error(code);
  error.name="VoidDatanetRegistryReviewedExecutionChildHoldV1";
  throw error;
}
function plain(value){
  return value!==null&&typeof value==="object"&&!Array.isArray(value);
}
function canonicalJsonV1(value){
  if(value===null) return "null";
  if(typeof value==="string") return JSON.stringify(value);
  if(typeof value==="boolean") return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value)) return String(value);
  if(Array.isArray(value)){
    return "["+value.map(canonicalJsonV1).join(",")+"]";
  }
  if(plain(value)){
    return "{"+Object.keys(value).sort().map(
      key=>JSON.stringify(key)+":"+canonicalJsonV1(value[key]),
    ).join(",")+"}";
  }
  fail("reviewed_child_canonical_value_invalid");
}
function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function sameStat(a,b){
  return (
    a.dev===b.dev&&
    a.ino===b.ino&&
    a.size===b.size&&
    a.mode===b.mode&&
    a.uid===b.uid&&
    a.gid===b.gid&&
    a.nlink===b.nlink&&
    a.mtimeNs===b.mtimeNs&&
    a.ctimeNs===b.ctimeNs
  );
}
function parseFd(value,label){
  if(!/^[3-9][0-9]*$/u.test(String(value||""))){
    fail(label+"_fd_invalid");
  }
  const fd=Number(value);
  if(!Number.isSafeInteger(fd)) fail(label+"_fd_invalid");
  return fd;
}
function readStableRegularFd(fd,label,maxBytes){
  const before=fs.fstatSync(fd,{bigint:true});
  if(
    !before.isFile()||
    before.isSymbolicLink?.()===true||
    before.nlink!==1n||
    before.size<1n||
    before.size>BigInt(maxBytes)
  ){
    fail(label+"_not_bounded_regular_file");
  }
  const bytes=Buffer.alloc(Number(before.size));
  let used=0;
  while(used<bytes.length){
    const n=fs.readSync(
      fd,
      bytes,
      used,
      Math.min(64*1024,bytes.length-used),
      used,
    );
    if(n<=0) fail(label+"_short_read");
    used+=n;
  }
  const probe=Buffer.alloc(1);
  if(fs.readSync(fd,probe,0,1,bytes.length)!==0){
    fail(label+"_grew_during_read");
  }
  const after=fs.fstatSync(fd,{bigint:true});
  if(!sameStat(before,after)) fail(label+"_changed_during_read");
  return bytes;
}
function writeExactRegularFd(fd,value){
  const before=fs.fstatSync(fd,{bigint:true});
  if(
    !before.isFile()||
    before.nlink!==1n||
    before.size!==0n
  ){
    fail("reviewed_child_output_not_empty_regular_file");
  }
  const bytes=Buffer.from(canonicalJsonV1(value)+"\n","utf8");
  if(bytes.length<2||bytes.length>MAX_OUTPUT_BYTES){
    fail("reviewed_child_output_size_invalid");
  }
  let used=0;
  while(used<bytes.length){
    const n=fs.writeSync(fd,bytes,used,bytes.length-used,used);
    if(n<=0) fail("reviewed_child_output_short_write");
    used+=n;
  }
  fs.ftruncateSync(fd,bytes.length);
  fs.fsyncSync(fd);
  const after=fs.fstatSync(fd,{bigint:true});
  if(
    !after.isFile()||
    after.nlink!==1n||
    after.size!==BigInt(bytes.length)||
    after.dev!==before.dev||
    after.ino!==before.ino
  ){
    fail("reviewed_child_output_identity_changed");
  }
}
function safeErrorCode(error){
  const message=String(error?.message||"reviewed_child_failed");
  return /^[A-Za-z0-9._:-]{1,240}$/u.test(message)
    ?message
    :"reviewed_child_failed";
}

function assertIsolatedProcessV1(){
  if(
    typeof process.send==="function"||
    process.channel!==undefined&&process.channel!==null
  ){
    fail("reviewed_child_ipc_forbidden");
  }
  for(const fd of [0,1,2]){
    const st=fs.fstatSync(fd);
    if(st.isSocket()||st.isFIFO()){
      fail("reviewed_child_stdio_socket_forbidden");
    }
  }
  if(typeof process._getActiveHandles==="function"){
    for(const handle of process._getActiveHandles()){
      const name=String(handle?.constructor?.name||"");
      if(
        name==="Socket"||
        name==="TLSSocket"||
        name==="TCP"||
        name==="TCPWrap"||
        name==="Pipe"||
        name==="PipeWrap"
      ){
        fail("reviewed_child_ambient_socket_handle_forbidden");
      }
    }
  }
}

let reviewedAmbientFenceInstalledV1=false;
function installReviewedAmbientFenceV1(){
  if(reviewedAmbientFenceInstalledV1) return;
  const targets=[
    [globalThis,"fetch","reviewed_ambient_fetch_forbidden",false],
    [process,"getBuiltinModule",
      "reviewed_ambient_get_builtin_module_forbidden",true],
    [process,"binding","reviewed_ambient_process_binding_forbidden",true],
    [process,"_linkedBinding",
      "reviewed_ambient_process_linked_binding_forbidden",true],
    [process,"dlopen","reviewed_ambient_process_dlopen_forbidden",true],
    [process,"execve","reviewed_ambient_process_execve_forbidden",true],
    [globalThis,"WebSocket","reviewed_ambient_websocket_forbidden",true],
    [globalThis,"EventSource","reviewed_ambient_eventsource_forbidden",true],
  ];
  const reviewed=[];
  for(const [target,key,reason,optional] of targets){
    const descriptor=Object.getOwnPropertyDescriptor(target,key);
    if(!descriptor){
      if(optional) continue;
      fail("reviewed_ambient_guard_unavailable:"+key);
    }
    if(
      !Object.hasOwn(descriptor,"value")||
      typeof descriptor.value!=="function"||
      (descriptor.configurable!==true&&descriptor.writable!==true)
    ){
      fail("reviewed_ambient_guard_unavailable:"+key);
    }
    reviewed.push({target,key,reason,descriptor});
  }
  for(const {target,key,reason,descriptor} of reviewed){
    Object.defineProperty(target,key,{
      ...descriptor,
      value:function(){throw new Error(reason);},
      writable:false,
      configurable:false,
    });
  }
  reviewedAmbientFenceInstalledV1=true;
}

const REVIEWED_GRAPH_HOOK_SOURCE=String.raw`
import path from "node:path";
let prefix="";
let sources=Object.create(null);
let ethersSource="";
let allowedNodeBuiltins=new Set();
let networkNodeBuiltins=new Set();
let networkCapableModules=new Set();
const PACKAGE_URL="void-reviewed-package:ethers";
function exactStringSet(value,label){
  if(!Array.isArray(value)||value.some(
    item=>typeof item!=="string"||item.length<1
  )){
    throw new Error("reviewed_graph_"+label+"_invalid");
  }
  const set=new Set(value);
  if(set.size!==value.length){
    throw new Error("reviewed_graph_"+label+"_invalid");
  }
  return set;
}
export function initialize(data){
  prefix=String(data?.prefix||"");
  sources=Object.assign(Object.create(null),data?.sources||{});
  ethersSource=String(data?.ethersSource||"");
  allowedNodeBuiltins=exactStringSet(
    data?.allowedNodeBuiltins,
    "allowed_node_builtins",
  );
  networkNodeBuiltins=exactStringSet(
    data?.networkNodeBuiltins,
    "network_node_builtins",
  );
  networkCapableModules=exactStringSet(
    data?.networkCapableModules,
    "network_capable_modules",
  );
  if(!prefix.startsWith("void-reviewed:")||ethersSource.length<1){
    throw new Error("reviewed_graph_hook_init_invalid");
  }
  for(const specifier of networkNodeBuiltins){
    if(!allowedNodeBuiltins.has(specifier)){
      throw new Error("reviewed_graph_network_builtin_not_allowed");
    }
  }
}
function reviewedPath(url){
  if(!url.startsWith(prefix)) return null;
  const relative=url.slice(prefix.length);
  if(!Object.hasOwn(sources,relative)){
    throw new Error("reviewed_graph_module_missing:"+relative);
  }
  return relative;
}
export async function resolve(specifier,context,nextResolve){
  if(specifier.startsWith(prefix)){
    reviewedPath(specifier);
    return {url:specifier,shortCircuit:true};
  }
  if(context.parentURL&&context.parentURL.startsWith(prefix)){
    const parent=reviewedPath(context.parentURL);
    if(specifier==="ethers"){
      return {url:PACKAGE_URL,shortCircuit:true};
    }
    if(specifier.startsWith(".")){
      const resolved=path.posix.normalize(
        path.posix.join(path.posix.dirname(parent),specifier),
      );
      if(
        resolved.startsWith("../")||
        resolved===".."||
        !Object.hasOwn(sources,resolved)
      ){
        throw new Error("reviewed_graph_relative_import_invalid:"+specifier);
      }
      return {url:prefix+resolved,shortCircuit:true};
    }
    if(specifier.startsWith("node:")){
      if(!allowedNodeBuiltins.has(specifier)){
        throw new Error(
          "reviewed_graph_builtin_import_unapproved:"+specifier
        );
      }
      if(
        networkNodeBuiltins.has(specifier)&&
        !networkCapableModules.has(parent)
      ){
        throw new Error(
          "reviewed_graph_network_builtin_parent_uncensused:"+
          parent+":"+specifier
        );
      }
      return nextResolve(specifier,context);
    }
    throw new Error("reviewed_graph_bare_import_forbidden:"+specifier);
  }
  return nextResolve(specifier,context);
}
export async function load(url,context,nextLoad){
  if(url===PACKAGE_URL){
    return {format:"module",source:ethersSource,shortCircuit:true};
  }
  if(url.startsWith(prefix)){
    const relative=reviewedPath(url);
    return {format:"module",source:sources[relative],shortCircuit:true};
  }
  return nextLoad(url,context);
}
`;

function exactStringArray(value,label){
  if(
    !Array.isArray(value)||
    value.some(item=>typeof item!=="string"||item.length<1)
  ){
    fail(label+"_invalid");
  }
  if(new Set(value).size!==value.length) fail(label+"_invalid");
  return Object.freeze([...value]);
}
function parsePayloadV1(bytes){
  let value;
  try{value=JSON.parse(bytes.toString("utf8"));}
  catch{fail("reviewed_child_input_json_invalid");}
  if(bytes.toString("utf8")!==canonicalJsonV1(value)+"\n"){
    fail("reviewed_child_input_serialization_invalid");
  }
  if(
    !plain(value)||
    value.marker!==VOID_DATANET_REGISTRY_REVIEWED_EXECUTION_CHILD_V1||
    value.version!==1||
    !["submit","synthetic"].includes(value.mode)||
    !HEX40.test(String(value.reviewed_head||""))||
    typeof value.ethers_source!=="string"||
    value.ethers_source.length<1||
    value.ethers_source.length>MAX_SOURCE_BYTES||
    !plain(value.sources)
  ){
    fail("reviewed_child_input_shape_invalid");
  }
  const allowedNodeBuiltins=exactStringArray(
    value.allowed_node_builtins,
    "reviewed_child_allowed_node_builtins",
  );
  const networkNodeBuiltins=exactStringArray(
    value.network_node_builtins,
    "reviewed_child_network_node_builtins",
  );
  const networkCapableModules=exactStringArray(
    value.network_capable_modules,
    "reviewed_child_network_capable_modules",
  );
  let sourceTotal=0;
  const sources=Object.create(null);
  for(const relative of Object.keys(value.sources).sort()){
    if(
      !RELATIVE.test(relative)||
      path.posix.normalize(relative)!==relative||
      relative.startsWith("../")
    ){
      fail("reviewed_child_source_path_invalid");
    }
    const source=value.sources[relative];
    if(
      typeof source!=="string"||
      source.length<1||
      Buffer.byteLength(source,"utf8")>MAX_SOURCE_BYTES
    ){
      fail("reviewed_child_source_invalid");
    }
    sourceTotal+=Buffer.byteLength(source,"utf8");
    if(sourceTotal>MAX_SOURCE_TOTAL_BYTES){
      fail("reviewed_child_source_total_too_large");
    }
    sources[relative]=source;
  }
  if(!Object.hasOwn(sources,TOOL_REL)){
    fail("reviewed_child_tool_source_missing");
  }
  if(value.mode==="submit"&&!plain(value.call)){
    fail("reviewed_child_submit_call_invalid");
  }
  return Object.freeze({
    ...value,
    allowed_node_builtins:allowedNodeBuiltins,
    network_node_builtins:networkNodeBuiltins,
    network_capable_modules:networkCapableModules,
    sources:Object.freeze(sources),
  });
}

function registerReviewedModuleGraphV1(payload){
  const prefix="void-reviewed:"+payload.reviewed_head+"/";
  const hookUrl=
    "data:text/javascript;base64,"+
    Buffer.from(REVIEWED_GRAPH_HOOK_SOURCE,"utf8").toString("base64");
  register(hookUrl,{
    parentURL:import.meta.url,
    data:{
      prefix,
      sources:payload.sources,
      ethersSource:payload.ethers_source,
      allowedNodeBuiltins:payload.allowed_node_builtins,
      networkNodeBuiltins:payload.network_node_builtins,
      networkCapableModules:payload.network_capable_modules,
    },
  });
  return Object.freeze({
    tool_url:prefix+TOOL_REL,
    rpc_url:prefix+RPC_REL,
  });
}

function rpcFactory(rpcUrl){
  if(rpcUrl!==EXPECTED_RPC) fail("rpc_target_not_reviewed");
  let id=0;
  return async (method,params=[])=>{
    const allowed=new Set([
      "eth_sendRawTransaction",
      "eth_getTransactionByHash",
      "eth_getTransactionReceipt",
      "eth_getCode",
      "eth_getTransactionCount",
    ]);
    if(!allowed.has(method)) fail("rpc_method_not_allowed:"+method);
    const requestId=++id;
    const body=JSON.stringify({
      jsonrpc:"2.0",
      id:requestId,
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
          "User-Agent":"void-datanet-registry-reviewed-broadcast-v1",
        },
      },(res)=>{
        const chunks=[];
        let total=0;
        let responseEnded=false;
        res.on("aborted",()=>finish(new Error("rpc_response_aborted")));
        res.on("error",(error)=>finish(error));
        res.on("close",()=>{
          if(!responseEnded&&!res.complete){
            finish(new Error("rpc_response_premature_close"));
          }
        });
        res.on("data",(chunk)=>{
          const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
          total+=bytes.length;
          if(total>MAX_RPC_RESPONSE){
            const error=new Error("rpc_response_too_large");
            finish(error);
            req.destroy(error);
            return;
          }
          chunks.push(bytes);
        });
        res.on("end",()=>{
          responseEnded=true;
          const status=Number(res.statusCode);
          if(!Number.isInteger(status)||status<200||status>=300){
            finish(new Error("rpc_http_status_"+String(res.statusCode)));
            return;
          }
          let parsed;
          try{parsed=JSON.parse(Buffer.concat(chunks).toString("utf8"));}
          catch{
            finish(new Error("rpc_json_invalid"));
            return;
          }
          if(parsed?.error){
            const error=new Error("rpc_error");
            if(Number.isInteger(parsed.error.code)) error.code=parsed.error.code;
            finish(error);
            return;
          }
          if(
            parsed?.jsonrpc!=="2.0"||
            parsed?.id!==requestId||
            !Object.hasOwn(parsed,"result")
          ){
            finish(new Error("rpc_result_invalid"));
            return;
          }
          finish(null,parsed.result);
        });
      });
      totalTimer=setTimeout(()=>{
        const error=new Error("rpc_total_deadline_exceeded");
        finish(error);
        req.destroy(error);
      },8000);
      req.setTimeout(8000);
      req.on("timeout",()=>{
        const error=new Error("rpc_timeout");
        finish(error);
        req.destroy(error);
      });
      req.on("error",(error)=>finish(error));
      req.end(body);
    });
  };
}

function primitiveDefault(value){
  if(
    value===null||
    typeof value==="string"||
    typeof value==="boolean"||
    (typeof value==="number"&&Number.isSafeInteger(value))
  ){
    return value;
  }
  fail("reviewed_child_synthetic_default_not_primitive");
}

async function executePayloadV1(payload){
  assertIsolatedProcessV1();
  installReviewedAmbientFenceV1();
  const graph=registerReviewedModuleGraphV1(payload);
  const tool=await import(graph.tool_url);
  if(payload.mode==="synthetic"){
    return Object.freeze({
      synthetic_default:primitiveDefault(tool.default),
    });
  }
  const rpcModule=await import(graph.rpc_url);
  if(
    typeof tool.submitVoidDatanetRegistryExactSingleBroadcastV1!=="function"||
    rpcModule.PRIVATE_SUCCESSOR_RPC_V1!==EXPECTED_RPC
  ){
    fail("reviewed_child_exports_invalid");
  }
  const call=payload.call;
  for(const key of [
    "broadcast_request",
    "broadcast_authorization",
    "prebroadcast_observation",
    "signed_transaction",
  ]){
    if(!plain(call[key])) fail("reviewed_child_submit_call_invalid:"+key);
  }
  if(
    typeof call.state_dir!=="string"||
    !path.isAbsolute(call.state_dir)||
    path.resolve(call.state_dir)!==call.state_dir||
    typeof call.confirmation!=="string"||
    call.confirmation.length<1
  ){
    fail("reviewed_child_submit_call_invalid");
  }
  const result=await tool.submitVoidDatanetRegistryExactSingleBroadcastV1({
    broadcast_request:call.broadcast_request,
    broadcast_authorization:call.broadcast_authorization,
    prebroadcast_observation:call.prebroadcast_observation,
    signed_transaction:call.signed_transaction,
    state_dir:call.state_dir,
    confirmation:call.confirmation,
    rpc:rpcFactory(EXPECTED_RPC),
    now:()=>Date.now(),
  });
  if(!plain(result)) fail("reviewed_child_submit_result_invalid");
  return Object.freeze({result});
}

async function main(){
  const args=process.argv.slice(1);
  if(args.length!==2) fail("reviewed_child_fd_arguments_invalid");
  const inputFd=parseFd(args[0],"reviewed_child_input");
  const outputFd=parseFd(args[1],"reviewed_child_output");
  const inputBytes=readStableRegularFd(
    inputFd,
    "reviewed_child_input",
    MAX_INPUT_BYTES,
  );
  const expectedInputSha=String(
    process.env.VOID_DATANET_REVIEWED_CHILD_INPUT_SHA256||"",
  );
  if(!HEX64.test(expectedInputSha)||sha256(inputBytes)!==expectedInputSha){
    fail("reviewed_child_input_sha256_mismatch");
  }
  let envelope;
  try{
    const payload=parsePayloadV1(inputBytes);
    const value=await executePayloadV1(payload);
    envelope=Object.freeze({
      marker:VOID_DATANET_REGISTRY_REVIEWED_EXECUTION_CHILD_RESULT_V1,
      version:1,
      ok:true,
      mode:payload.mode,
      execution_network_isolation_provided:true,
      stdio_socket_handles:false,
      ipc_channel:false,
      ...value,
    });
  }catch(error){
    envelope=Object.freeze({
      marker:VOID_DATANET_REGISTRY_REVIEWED_EXECUTION_CHILD_RESULT_V1,
      version:1,
      ok:false,
      mode:"held",
      execution_network_isolation_provided:true,
      stdio_socket_handles:false,
      ipc_channel:false,
      error:safeErrorCode(error),
    });
    process.exitCode=2;
  }
  writeExactRegularFd(outputFd,envelope);
}

await main();
