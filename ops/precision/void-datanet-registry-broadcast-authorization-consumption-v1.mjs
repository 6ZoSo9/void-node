#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  consumeVoidDatanetRegistryBroadcastAuthorizationV1,
} from "../../tools/void-datanet-registry-single-use-broadcast-authorization-consumption-v1.mjs";

const ROOT=process.cwd();

function fail(reason){
  const error=new Error(reason);
  error.name="VoidDatanetRegistryBroadcastConsumptionHoldV1";
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
    "broadcast-request","broadcast-authorization",
    "prebroadcast-observation","state-dir","output",
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
function regularJson(raw,label,maxBytes=4*1024*1024){
  const file=path.resolve(raw);
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) fail(label+"_not_regular");
  if(fs.realpathSync.native(file)!==file) fail(label+"_not_canonical");
  if(st.size<2||st.size>maxBytes) fail(label+"_size_invalid");
  let value;
  try{
    value=JSON.parse(
      new TextDecoder("utf-8",{fatal:true}).decode(fs.readFileSync(file)),
    );
  }catch{
    fail(label+"_invalid_utf8_json");
  }
  return {file,value};
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
const state=stateDir(args["state-dir"]);
const output=outputPath(args.output);

const result=consumeVoidDatanetRegistryBroadcastAuthorizationV1({
  broadcast_request:request.value,
  broadcast_authorization:authorization.value,
  prebroadcast_observation:observation.value,
  state_dir:state,
});
writeJsonExclusive(output,result);

console.log("VOID_DATANET_REGISTRY_BROADCAST_AUTHORIZATION_CONSUMPTION_PRECISION_V1");
console.log("ok="+String(result.ok===true));
console.log("status="+String(result.status||"held"));
console.log("reason="+String(result.reason||""));
console.log("consumption_record_id="+
  String(result.consumption_record_id||""));
console.log("broadcast_operation_id="+
  String(result.broadcast_operation_id||""));
console.log("authorization_consumed="+
  String(result.authorization_consumed===true||
    result.consumption?.authorization_consumed===true));
console.log("signed_transaction_bytes_accessed=false");
console.log("broadcaster_access=false");
console.log("rpc_call=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
console.log("output="+output);
if(result.ok!==true){
  process.exit(2);
}
console.log("VOID_DATANET_REGISTRY_BROADCAST_AUTHORIZATION_CONSUMPTION_PRECISION_V1_GREEN");
