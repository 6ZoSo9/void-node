#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

import {
  PRIVATE_SUCCESSOR_RPC_V1,
} from "../../tools/void-datanet-registry-deployer-activation-bound-observer-v1.mjs";
import {
  observeVoidDatanetRegistryPrebroadcastV1,
  validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1,
  validateVoidDatanetRegistryPrebroadcastObservationV1,
} from "../../tools/void-datanet-registry-prebroadcast-observer-v1.mjs";

const ROOT=process.cwd();

function fail(reason){
  const error=new Error(reason);
  error.name="VoidDatanetRegistryPrebroadcastHoldV1";
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
  for(const key of ["broadcast-request","broadcast-authorization","output"]){
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
validateVoidDatanetRegistryBroadcastRuntimeArtifactsV1({
  broadcast_request:request.value,
  broadcast_authorization:authorization.value,
});

const service="void-economic-epoch2-qbft-validator-v1.service";
const active=spawnSync("systemctl",["--user","is-active","--quiet",service],{
  stdio:["ignore","ignore","ignore"],
});
if(active.status!==0) fail("precision_private_qbft_service_not_active");

const observation=await observeVoidDatanetRegistryPrebroadcastV1({
  rpc_url:PRIVATE_SUCCESSOR_RPC_V1,
  broadcast_request:request.value,
  broadcast_authorization:authorization.value,
  observed_at_utc:new Date().toISOString(),
});

const output=outputPath(args.output);
writeJsonExclusive(output,observation);

console.log("VOID_DATANET_REGISTRY_PREBROADCAST_OBSERVER_PRECISION_V1");
console.log("ok="+String(observation.ok===true));
console.log("status="+String(observation.status||"held"));
console.log("reason="+String(observation.reason||""));
console.log("prebroadcast_observation_id="+
  String(observation.prebroadcast_observation_id||""));
console.log("broadcast_authorization_id="+
  String(observation.broadcast_authorization_id||""));
console.log("signed_transaction_hash="+
  String(observation.signed_transaction_hash||""));
console.log("read_only_rpc_observation_complete="+
  String(observation.read_only_rpc_observation_complete===true));
console.log("signed_transaction_bytes_accessed=false");
console.log("broadcaster_access=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");
console.log("output="+output);

if(observation.ok!==true){
  process.exit(2);
}
validateVoidDatanetRegistryPrebroadcastObservationV1(
  observation,
  {
    broadcast_request:request.value,
    broadcast_authorization:authorization.value,
  },
);
console.log("VOID_DATANET_REGISTRY_PREBROADCAST_OBSERVER_PRECISION_V1_GREEN");
