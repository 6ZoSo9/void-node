#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const GIT="/usr/bin/git";
const CORE_REL="ops/precision/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";
const CHILD_REL="ops/precision/void-datanet-registry-reviewed-execution-child-v1.mjs";
const RUNTIME_REL="tools/void-datanet-reviewed-node-package-runtime-v1.mjs";
const PROFILE_REL="ops/security/reviewed-node-package-runtime-ethers-v1.json";
const TOOL_REL="tools/void-datanet-registry-exact-single-broadcast-execution-v1.mjs";
const NETWORK_NODE_BUILTINS=Object.freeze(["node:http"]);
const SYNTHETIC_NODE_BUILTINS=Object.freeze([
  "node:crypto","node:fs","node:http","node:path",
]);
const MAX_SOURCE=32*1024*1024;
const MAX_INPUT=64*1024*1024;
const MAX_OUTPUT=24*1024*1024;
const HEX40=/^[0-9a-f]{40}$/u;

function fail(code){throw new Error(code);}
function plain(v){return v!==null&&typeof v==="object"&&!Array.isArray(v);}
function sha256(b){return crypto.createHash("sha256").update(b).digest("hex");}
function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes).digest("hex");
}
function canonical(value){
  if(value===null)return"null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return"["+value.map(canonical).join(",")+"]";
  if(plain(value))return"{"+Object.keys(value).sort().map(
    k=>JSON.stringify(k)+":"+canonical(value[k])
  ).join(",")+"}";
  fail("isolated_parent_canonical_value_invalid");
}
function gitEnv(){
  return {
    PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
    GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
    GIT_CONFIG_NOSYSTEM:"1",GIT_ATTR_NOSYSTEM:"1",
    GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",
    GIT_TERMINAL_PROMPT:"0",
  };
}
function git(root,args,{binary=false,code="isolated_parent_git_failed"}={}){
  const r=spawnSync(
    GIT,
    ["--no-replace-objects",
      "-c","core.hooksPath=/dev/null",
      "-c","core.attributesFile=/dev/null",
      "-c","core.fsmonitor=false",
      "-c","core.untrackedCache=false",
      "-c","core.preloadIndex=false",
      "-c","submodule.recurse=false",
      "-C",root,...args],
    {
      cwd:"/",env:gitEnv(),encoding:binary?null:"utf8",
      stdio:["ignore","pipe","pipe"],timeout:20_000,maxBuffer:64*1024*1024,
    },
  );
  if(r.error||r.status!==0)fail(code);
  return binary?Buffer.from(r.stdout||Buffer.alloc(0)):String(r.stdout||"").trim();
}
export function exactGitFileV1(repoRoot,head,relative){
  if(!HEX40.test(head))fail("isolated_parent_head_invalid");
  const blob=git(repoRoot,["rev-parse",head+":"+relative],{
    code:"isolated_parent_blob_unavailable:"+relative,
  });
  if(!HEX40.test(blob))fail("isolated_parent_blob_invalid:"+relative);
  const bytes=git(repoRoot,["cat-file","blob",blob],{
    binary:true,code:"isolated_parent_blob_read_failed:"+relative,
  });
  if(gitBlobSha1(bytes)!==blob)fail("isolated_parent_blob_identity_mismatch:"+relative);
  return Object.freeze({relative_path:relative,blob,bytes,sha256:sha256(bytes)});
}
function stableFile(file,label,max=MAX_SOURCE){
  const fd=fs.openSync(file,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  try{
    const a=fs.fstatSync(fd,{bigint:true});
    if(!a.isFile()||a.nlink!==1n||a.size<1n||a.size>BigInt(max))fail(label+"_invalid");
    const bytes=Buffer.alloc(Number(a.size));
    let n=0;
    while(n<bytes.length){
      const x=fs.readSync(fd,bytes,n,bytes.length-n,n);
      if(x<=0)fail(label+"_short_read");
      n+=x;
    }
    const b=fs.fstatSync(fd,{bigint:true});
    for(const k of["dev","ino","size","mtimeNs","ctimeNs","mode","uid","gid","nlink"]){
      if(a[k]!==b[k])fail(label+"_changed");
    }
    return bytes;
  }finally{fs.closeSync(fd);}
}
function writeExact(file,bytes,mode){
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const fd=fs.openSync(
    file,
    fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|
      Number(fs.constants.O_NOFOLLOW||0),
    mode,
  );
  try{
    fs.writeFileSync(fd,bytes);fs.fchmodSync(fd,mode);fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
}
async function importCore(repoRoot,head){
  const source=exactGitFileV1(repoRoot,head,CORE_REL);
  const previous=process.argv[1];
  process.argv[1]="__void_isolated_core_import__";
  try{
    const module=await import(
      "data:text/javascript;base64,"+source.bytes.toString("base64")+"#"+source.blob
    );
    if(typeof module.testOnlyReviewedSourcePlanV1!=="function")fail("isolated_parent_core_export_missing");
    return Object.freeze({module,source});
  }finally{process.argv[1]=previous;}
}
async function importRuntime(repoRoot,head){
  const source=exactGitFileV1(repoRoot,head,RUNTIME_REL);
  const text=source.bytes.toString("utf8");
  if(!Buffer.from(text,"utf8").equals(source.bytes)){
    fail("isolated_parent_runtime_helper_utf8_invalid");
  }
  const module=await import(
    "data:text/javascript;base64,"+
    source.bytes.toString("base64")+
    "#"+source.blob
  );
  return Object.freeze({module,source});
}
export async function prepareIsolatedReviewedExecutionV1({repoRoot,head}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-datanet-isolated-parent-"));
  fs.chmodSync(root,0o700);
  const runtimeRoot=path.join(root,"runtime");
  try{
    const core=await importCore(repoRoot,head);
    const plan=core.module.testOnlyReviewedSourcePlanV1();
    if(plan.head!==head||!Array.isArray(plan.rows)||!(plan.sources instanceof Map)){
      fail("isolated_parent_plan_invalid");
    }
    const runtime=await importRuntime(repoRoot,head);
    const required=[
      "readReviewedNodePackageRuntimeProfileV1","verifyReviewedNodePackageRuntimeV1",
      "materializeReviewedNodePackageRuntimeV1","verifyMaterializedReviewedNodePackageRuntimeV1",
    ];
    for(const name of required)if(typeof runtime.module[name]!=="function")fail("isolated_parent_runtime_export_missing:"+name);
    const profile=runtime.module.readReviewedNodePackageRuntimeProfileV1({
      relativePath:PROFILE_REL,repoRoot,reviewedHead:head,
    });
    runtime.module.verifyReviewedNodePackageRuntimeV1({
      profile:profile.profile,repoRoot,reviewedHead:head,
    });
    runtime.module.materializeReviewedNodePackageRuntimeV1({
      profile:profile.profile,repoRoot,destinationRoot:runtimeRoot,reviewedHead:head,
    });
    runtime.module.verifyMaterializedReviewedNodePackageRuntimeV1({
      profile:profile.profile,destinationRoot:runtimeRoot,repoRoot,
    });
    const ethersBytes=stableFile(
      path.join(runtimeRoot,"node_modules","ethers","dist","ethers.min.js"),
      "isolated_parent_ethers",32*1024*1024,
    );
    const ethersSource=ethersBytes.toString("utf8");
    if(!Buffer.from(ethersSource,"utf8").equals(ethersBytes))fail("isolated_parent_ethers_utf8_invalid");
    runtime.module.verifyMaterializedReviewedNodePackageRuntimeV1({
      profile:profile.profile,destinationRoot:runtimeRoot,repoRoot,
    });
    const child=exactGitFileV1(repoRoot,head,CHILD_REL);
    return Object.freeze({
      root,plan,ethers_source:ethersSource,child,
      binding:Object.freeze({
        repository_head_sha:head,
        closure_count:plan.rows.length,
        closure_aggregate_sha256:plan.closure_aggregate_sha256,
        bare_packages:plan.bare_packages,
        network_capable_modules:plan.network_capable_modules,
        reviewed_core_git_blob_sha1:core.source.blob,
        reviewed_runtime_tool_git_blob_sha1:runtime.source.blob,
        reviewed_runtime_profile_id:profile.profile.profile_id,
        reviewed_runtime_packages_aggregate_sha256:profile.profile.packages_aggregate_sha256,
        reviewed_ethers_standalone_sha256:sha256(ethersBytes),
        reviewed_ethers_standalone_bytes:ethersBytes.length,
        reviewed_execution_child_git_blob_sha1:child.blob,
        reviewed_execution_child_sha256:child.sha256,
        reviewed_graph_executes_in_parent:false,
        execution_network_isolation_provided:true,
        child_stdio_null:true,
        child_ipc:false,
      }),
      reverify(){
        runtime.module.verifyMaterializedReviewedNodePackageRuntimeV1({
          profile:profile.profile,destinationRoot:runtimeRoot,repoRoot,
        });
      },
      cleanup(){fs.rmSync(root,{recursive:true,force:true});},
    });
  }catch(e){fs.rmSync(root,{recursive:true,force:true});throw e;}
}
function sourceObject(plan){
  const out={};
  for(const row of plan.rows){
    const src=plan.sources.get(row.relative_path);
    const text=src.bytes.toString("utf8");
    if(!Buffer.from(text,"utf8").equals(src.bytes))fail("isolated_parent_source_utf8_invalid");
    out[row.relative_path]=text;
  }
  return out;
}
export function childPayloadV1(prepared,head,{mode,call=null}={}){
  const value={
    marker:"VOID_DATANET_REGISTRY_REVIEWED_EXECUTION_CHILD_V1",version:1,mode,
    reviewed_head:head,sources:sourceObject(prepared.plan),
    ethers_source:prepared.ethers_source,
    allowed_node_builtins:prepared.plan.node_builtins,
    network_node_builtins:NETWORK_NODE_BUILTINS,
    network_capable_modules:prepared.plan.network_capable_modules,
  };
  if(mode==="submit")value.call=call;
  return value;
}
export function syntheticPayloadV1(head,source,{networkCapable=false}={}){
  if(typeof source!=="string"||source.length<1||source.length>64*1024)fail("isolated_parent_synthetic_invalid");
  return {
    marker:"VOID_DATANET_REGISTRY_REVIEWED_EXECUTION_CHILD_V1",version:1,mode:"synthetic",
    reviewed_head:head,sources:{[TOOL_REL]:source},
    ethers_source:"export default Object.freeze({});",
    allowed_node_builtins:SYNTHETIC_NODE_BUILTINS,
    network_node_builtins:NETWORK_NODE_BUILTINS,
    network_capable_modules:networkCapable?[TOOL_REL]:[],
  };
}
function readFd(fd,label,max,{empty=false}={}){
  const a=fs.fstatSync(fd,{bigint:true});
  if(!a.isFile()||a.nlink!==1n||a.size<(empty?0n:1n)||a.size>BigInt(max))fail(label+"_invalid");
  const bytes=Buffer.alloc(Number(a.size));let n=0;
  while(n<bytes.length){const x=fs.readSync(fd,bytes,n,bytes.length-n,n);if(x<=0)fail(label+"_short_read");n+=x;}
  const b=fs.fstatSync(fd,{bigint:true});
  for(const k of["dev","ino","size","mtimeNs","ctimeNs","mode","uid","gid","nlink"])if(a[k]!==b[k])fail(label+"_changed");
  return Object.freeze({bytes,stat:a});
}
function parseEnvelope(bytes,mode){
  let v;try{v=JSON.parse(bytes.toString("utf8"));}catch{fail("isolated_parent_child_json_invalid");}
  if(bytes.toString("utf8")!==canonical(v)+"\n")fail("isolated_parent_child_serialization_invalid");
  if(!plain(v)||v.marker!=="VOID_DATANET_REGISTRY_REVIEWED_EXECUTION_CHILD_RESULT_V1"||v.version!==1||
    v.execution_network_isolation_provided!==true||v.stdio_socket_handles!==false||v.ipc_channel!==false
  )fail("isolated_parent_child_shape_invalid");
  if(v.ok!==true){
    const code=String(v.error||"reviewed_child_failed");
    if(!/^[A-Za-z0-9._:-]{1,240}$/u.test(code))fail("isolated_parent_child_error_invalid");
    fail(code);
  }
  if(v.mode!==mode)fail("isolated_parent_child_mode_invalid");
  return v;
}
export function runReviewedChildV1(child,payload,{timeoutMs=60_000,afterOpen=null}={}){
  const childText=child.bytes.toString("utf8");
  if(!Buffer.from(childText,"utf8").equals(child.bytes))fail("isolated_parent_child_utf8_invalid");
  const inputBytes=Buffer.from(canonical(payload)+"\n","utf8");
  if(inputBytes.length<2||inputBytes.length>MAX_INPUT)fail("isolated_parent_child_input_size_invalid");
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-datanet-child-"));fs.chmodSync(root,0o700);
  const input=path.join(root,"input.json"),output=path.join(root,"output.json");
  let inFd=-1,outFd=-1;
  try{
    writeExact(input,inputBytes,0o400);
    inFd=fs.openSync(input,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
    outFd=fs.openSync(output,fs.constants.O_RDWR|fs.constants.O_CREAT|fs.constants.O_EXCL|Number(fs.constants.O_NOFOLLOW||0),0o600);
    fs.fchmodSync(outFd,0o600);fs.fsyncSync(outFd);
    const inBefore=readFd(inFd,"isolated_parent_input",MAX_INPUT);
    const outBefore=fs.fstatSync(outFd,{bigint:true});
    if(afterOpen!==null)afterOpen(Object.freeze({root,input,output,inFd,outFd}));
    const run=spawnSync(
      process.execPath,["--input-type=module","--eval",childText,"3","4"],
      {cwd:"/",env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",XDG_CONFIG_HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
       VOID_DATANET_REVIEWED_CHILD_INPUT_SHA256:sha256(inputBytes)},
       stdio:["ignore","ignore","ignore",inFd,outFd],timeout:timeoutMs},
    );
    if(run.error)fail("reviewed_child_process_error");
    const inAfter=readFd(inFd,"isolated_parent_input_after",MAX_INPUT);
    if(!inAfter.bytes.equals(inputBytes)||inBefore.stat.dev!==inAfter.stat.dev||inBefore.stat.ino!==inAfter.stat.ino)fail("isolated_parent_input_changed");
    const out=readFd(outFd,"isolated_parent_output",MAX_OUTPUT);
    if(out.stat.dev!==outBefore.dev||out.stat.ino!==outBefore.ino)fail("isolated_parent_output_replaced");
    const envelope=parseEnvelope(out.bytes,payload.mode);
    if(run.status!==0)fail("isolated_parent_child_status_inconsistent");
    return Object.freeze({envelope,input_sha256:sha256(inputBytes),output_sha256:sha256(out.bytes)});
  }finally{
    if(inFd>=0)fs.closeSync(inFd);if(outFd>=0)fs.closeSync(outFd);
    inputBytes.fill(0);fs.rmSync(root,{recursive:true,force:true});
  }
}
