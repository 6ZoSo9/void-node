#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  submitVoidDatanetRegistryExactSingleBroadcastV1,
} from "../../tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";
import {
  PRIVATE_SUCCESSOR_RPC_V1,
} from "../../tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs";

const ROOT=process.cwd();
const MAX_JSON=24*1024*1024;
const MAX_RPC_RESPONSE=64*1024;

function fail(reason){
  const error=new Error(reason);
  error.name="VoidDatanetRegistryExactSingleBroadcastExecutionHoldV1";
  throw error;
}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i];
    if(!key?.startsWith("--")) fail("invalid_argument:"+String(key));
    const value=String(argv[++i]||"");
    if(!value) fail("missing_argument_value:"+key);
    out[key.slice(2)]=value;
  }
  for(const key of [
    "broadcast-request","broadcast-authorization","prebroadcast-observation",
    "signed-transaction","state-dir","confirmation","output",
  ]){
    if(!out[key]) fail("missing_argument:"+key);
  }
  return out;
}
function git(args){
  const result=spawnSync("git",args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
  });
  if(result.status!==0){
    fail("git_failed:"+String(result.stderr||result.stdout||"").trim().slice(0,220));
  }
  return String(result.stdout||"").trim();
}
function regularJson(raw,label,maxBytes=MAX_JSON){
  const file=path.resolve(raw);
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) fail(label+"_not_regular");
  if(fs.realpathSync.native(file)!==file) fail(label+"_not_canonical");
  if(st.size<2||st.size>maxBytes) fail(label+"_size_invalid");
  return {file,value:JSON.parse(fs.readFileSync(file,"utf8"))};
}
function privateJson(raw,label){
  const file=path.resolve(raw);
  const st=fs.lstatSync(file);
  if(
    st.isSymbolicLink()||
    !st.isFile()||
    fs.realpathSync.native(file)!==file||
    st.nlink!==1||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o777)!==0o600||
    st.size<2||
    st.size>MAX_JSON
  ){
    fail(label+"_private_file_policy_invalid");
  }
  return {file,value:JSON.parse(fs.readFileSync(file,"utf8"))};
}
function stateDir(raw){
  const dir=path.resolve(raw);
  const st=fs.lstatSync(dir);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync.native(dir)!==dir||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o777)!==0o700
  ){
    fail("state_dir_invalid");
  }
  return dir;
}
function outputPath(raw){
  const file=path.resolve(raw);
  if(fs.existsSync(file)) fail("output_already_exists");
  const parent=path.dirname(file);
  const st=fs.lstatSync(parent);
  if(
    st.isSymbolicLink()||
    !st.isDirectory()||
    fs.realpathSync.native(parent)!==parent||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||
    (st.mode&0o022)!==0
  ){
    fail("output_parent_invalid");
  }
  return file;
}
function writeJsonExclusive(file,value){
  const bytes=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  let fd=-1;
  try{
    fd=fs.openSync(
      file,
      fs.constants.O_WRONLY|
        fs.constants.O_CREAT|
        fs.constants.O_EXCL|
        Number(fs.constants.O_NOFOLLOW||0),
      0o600,
    );
    fs.writeFileSync(fd,bytes);
    fs.fchmodSync(fd,0o600);
    fs.fsyncSync(fd);
  }finally{
    bytes.fill(0);
    if(fd>=0) fs.closeSync(fd);
  }
}
function rpcFactory(){
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
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),8000);
    let response;
    let text;
    try{
      response=await fetch(PRIVATE_SUCCESSOR_RPC_V1,{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          jsonrpc:"2.0",
          id:++id,
          method,
          params,
        }),
        signal:controller.signal,
      });
      text=await response.text();
    }finally{
      clearTimeout(timer);
    }
    if(Buffer.byteLength(text||"","utf8")>MAX_RPC_RESPONSE){
      fail("rpc_response_too_large");
    }
    if(!response.ok) fail("rpc_http_status_"+String(response.status));
    const parsed=JSON.parse(text);
    if(parsed?.error){
      const error=new Error("rpc_error");
      if(Number.isInteger(parsed.error.code)) error.code=parsed.error.code;
      throw error;
    }
    if(!Object.hasOwn(parsed,"result")) fail("rpc_result_missing");
    return parsed.result;
  };
}

if(os.hostname()!=="zoso-Precision-Tower-7810") fail("precision_host_required");
const args=parseArgs(process.argv.slice(2));
if(git(["branch","--show-current"])!=="main") fail("main_branch_required");
if(git(["status","--porcelain=v1","--untracked-files=all"])!==""){
  fail("clean_worktree_required");
}

const request=regularJson(args["broadcast-request"],"broadcast_request");
const authorization=regularJson(
  args["broadcast-authorization"],
  "broadcast_authorization",
);
const observation=regularJson(
  args["prebroadcast-observation"],
  "prebroadcast_observation",
);
const signed=privateJson(args["signed-transaction"],"signed_transaction");
const state=stateDir(args["state-dir"]);
const output=outputPath(args.output);

if(args.confirmation!==authorization.value.required_confirmation){
  fail("exact_operation_bound_broadcast_confirmation_required");
}

const result=await submitVoidDatanetRegistryExactSingleBroadcastV1({
  broadcast_request:request.value,
  broadcast_authorization:authorization.value,
  prebroadcast_observation:observation.value,
  signed_transaction:signed.value,
  state_dir:state,
  rpc:rpcFactory(),
  now:()=>Date.now(),
});
writeJsonExclusive(output,result);

console.log("VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_PRECISION_V1");
console.log("ok="+String(result.ok===true));
console.log("status="+String(result.status||"held"));
console.log("reason="+String(result.reason||""));
console.log("broadcast_operation_id="+String(result.broadcast_operation_id||""));
console.log("submission_intent_id="+String(result.submission_intent_id||""));
console.log("submission_result_id="+String(result.submission_result_id||""));
console.log("signed_transaction_id="+String(result.signed_transaction_id||""));
console.log("signed_transaction_hash="+String(result.signed_transaction_hash||""));
console.log("rpc_send_invocation_count="+String(result.rpc_send_invocation_count||0));
console.log("classification="+String(result.classification||""));
console.log("broadcaster_access_performed="+String(result.broadcaster_access_performed===true));
console.log("transaction_submission_performed="+
  String(result.transaction_submission_performed===true));
console.log("transaction_broadcast_performed="+
  String(result.transaction_broadcast_performed===true));
console.log("automatic_retry_performed=false");
console.log("replacement_transaction_created=false");
console.log("credential_access=false");
console.log("private_key_access=false");
console.log("signed_transaction_bytes_output=false");
console.log("output="+output);

if(result.ok!==true) process.exit(2);
console.log("VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_EXECUTION_PRECISION_V1_GREEN");
