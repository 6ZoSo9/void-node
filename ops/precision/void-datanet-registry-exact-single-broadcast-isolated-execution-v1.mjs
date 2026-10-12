#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT=fs.realpathSync.native(process.cwd());
const GIT="/usr/bin/git";
const REMOTE="https://github.com/6ZoSo9/void-node.git";
const ORIGINS=new Set([
  "https://github.com/6ZoSo9/void-node",
  "https://github.com/6ZoSo9/void-node.git",
  "git@github.com:6ZoSo9/void-node.git",
  "ssh://git@github.com/6ZoSo9/void-node.git",
]);
const LAUNCHER_REL=
  "ops/precision/void-datanet-registry-exact-single-broadcast-isolated-execution-v1.mjs";
const SUPPORT_REL="tools/void-datanet-registry-isolated-parent-support-v1.mjs";
const MAX_JSON=24*1024*1024;
const HEX40=/^[0-9a-f]{40}$/u;

function fail(code){throw new Error(code);}
function sha256(b){return crypto.createHash("sha256").update(b).digest("hex");}
function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes).digest("hex");
}
function gitEnv(){
  return {PATH:"/usr/bin:/bin",HOME:"/nonexistent",XDG_CONFIG_HOME:"/nonexistent",
    LANG:"C",LC_ALL:"C",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
    GIT_CONFIG_NOSYSTEM:"1",GIT_ATTR_NOSYSTEM:"1",GIT_NO_REPLACE_OBJECTS:"1",
    GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"};
}
function git(args,{binary=false,code="isolated_launcher_git_failed",cwd=ROOT}={}){
  const r=spawnSync(
    GIT,
    ["--no-replace-objects","-c","core.hooksPath=/dev/null",
      "-c","core.attributesFile=/dev/null","-c","core.fsmonitor=false",
      "-c","core.untrackedCache=false","-c","core.preloadIndex=false",
      "-c","submodule.recurse=false",...args],
    {cwd,env:gitEnv(),encoding:binary?null:"utf8",stdio:["ignore","pipe","pipe"],
     timeout:20_000,maxBuffer:64*1024*1024},
  );
  if(r.error||r.status!==0)fail(code);
  return binary?Buffer.from(r.stdout||Buffer.alloc(0)):String(r.stdout||"").trim();
}
function repoGit(args,opts={}){return git(["-C",ROOT,...args],opts);}
function exactFile(head,rel){
  const blob=repoGit(["rev-parse",head+":"+rel],{code:"isolated_launcher_blob_unavailable"});
  if(!HEX40.test(blob))fail("isolated_launcher_blob_invalid");
  const bytes=repoGit(["cat-file","blob",blob],{binary:true,code:"isolated_launcher_blob_read_failed"});
  if(gitBlobSha1(bytes)!==blob)fail("isolated_launcher_blob_identity_mismatch");
  return Object.freeze({blob,bytes,sha256:sha256(bytes)});
}
function remoteHead(){
  const out=git(["ls-remote",REMOTE,"refs/heads/main"],{cwd:"/",code:"canonical_remote_main_unavailable"});
  const m=out.match(/^([0-9a-f]{40})\trefs\/heads\/main$/u);
  if(!m)fail("canonical_remote_main_invalid");
  return m[1];
}
function bootstrap(){
  if(process.argv[1]!=="-")fail("reviewed_git_object_bootstrap_required");
  if(!Array.isArray(process.execArgv)||process.execArgv.length!==1||process.execArgv[0]!=="--input-type=module"){
    fail("reviewed_bootstrap_node_argv_invalid");
  }
  for(const key of["NODE_OPTIONS","NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH",
    "HTTP_PROXY","HTTPS_PROXY","ALL_PROXY","http_proxy","https_proxy","all_proxy"]){
    if(Object.hasOwn(process.env,key))fail("reviewed_bootstrap_environment_not_sanitized");
  }
  const blob=String(process.env.VOID_DATANET_REGISTRY_REVIEWED_LAUNCHER_BLOB_SHA1||"");
  if(process.env.PATH!=="/usr/bin:/bin"||process.env.LANG!=="C"||process.env.LC_ALL!=="C"||!HEX40.test(blob)){
    fail("reviewed_bootstrap_environment_invalid");
  }
  return blob;
}
function authority(expectedBlob,{remote=true}={}){
  const head=repoGit(["rev-parse","HEAD"]);
  const tree=repoGit(["rev-parse","HEAD^{tree}"]);
  const status=repoGit(["status","--porcelain=v1","--untracked-files=all"]);
  const branch=repoGit(["branch","--show-current"]);
  const origin=repoGit(["config","--local","--no-includes","--get","remote.origin.url"]);
  if(!HEX40.test(head)||!HEX40.test(tree)||status!==""||(remote&&branch!=="main")||!ORIGINS.has(origin)){
    fail("reviewed_repository_authority_invalid");
  }
  if(remote&&remoteHead()!==head)fail("local_head_not_canonical_remote_main");
  const launcher=exactFile(head,LAUNCHER_REL);
  if(launcher.blob!==expectedBlob)fail("reviewed_launcher_git_blob_mismatch");
  return Object.freeze({head,tree,launcher});
}
let supportCache=null;
async function support(head){
  if(supportCache?.head===head)return supportCache.module;
  const source=exactFile(head,SUPPORT_REL);
  const text=source.bytes.toString("utf8");
  if(!Buffer.from(text,"utf8").equals(source.bytes))fail("isolated_support_utf8_invalid");
  const module=await import("data:text/javascript;base64,"+source.bytes.toString("base64")+"#"+source.blob);
  for(const name of["prepareIsolatedReviewedExecutionV1","childPayloadV1","syntheticPayloadV1",
    "runReviewedChildV1","exactGitFileV1"]){
    if(typeof module[name]!=="function")fail("isolated_support_export_missing:"+name);
  }
  supportCache={head,module};
  return module;
}
function stableJson(raw,label,{privateMode=false}={}){
  const file=path.resolve(raw);
  const listed=fs.lstatSync(file,{bigint:true});
  if(
    listed.isSymbolicLink()||
    !listed.isFile()||
    fs.realpathSync.native(file)!==file||
    listed.size<2n||
    listed.size>BigInt(MAX_JSON)||
    (privateMode&&(
      listed.nlink!==1n||
      (typeof process.getuid==="function"&&
        listed.uid!==BigInt(process.getuid()))||
      Number(listed.mode&0o777n)!==0o600
    ))
  ){
    fail(label+"_file_policy_invalid");
  }
  const fd=fs.openSync(
    file,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    if(
      !opened.isFile()||
      opened.nlink!==listed.nlink||
      opened.size!==listed.size||
      opened.size<2n||
      opened.size>BigInt(MAX_JSON)||
      opened.dev!==listed.dev||
      opened.ino!==listed.ino||
      (privateMode&&(
        (typeof process.getuid==="function"&&
          opened.uid!==BigInt(process.getuid()))||
        Number(opened.mode&0o777n)!==0o600
      ))
    ){
      fail(label+"_opened_file_policy_invalid");
    }
    const bytes=Buffer.alloc(Number(opened.size));
    let n=0;
    while(n<bytes.length){
      const x=fs.readSync(fd,bytes,n,bytes.length-n,n);
      if(x<=0)fail(label+"_short_read");
      n+=x;
    }
    const probe=Buffer.alloc(1);
    if(fs.readSync(fd,probe,0,1,bytes.length)!==0){
      fail(label+"_grew_during_read");
    }
    const after=fs.fstatSync(fd,{bigint:true});
    const visible=fs.lstatSync(file,{bigint:true});
    for(const k of[
      "dev","ino","size","mtimeNs","ctimeNs","mode","uid","gid","nlink",
    ]){
      if(opened[k]!==after[k]||after[k]!==visible[k]){
        fail(label+"_changed_or_rebound");
      }
    }
    if(visible.isSymbolicLink()||!visible.isFile()){
      fail(label+"_visible_file_policy_invalid");
    }
    return JSON.parse(bytes.toString("utf8"));
  }finally{
    fs.closeSync(fd);
  }
}
function stateDir(raw){
  const dir=path.resolve(raw),st=fs.lstatSync(dir);
  if(st.isSymbolicLink()||!st.isDirectory()||fs.realpathSync.native(dir)!==dir||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||(st.mode&0o777)!==0o700)fail("state_dir_invalid");
  return dir;
}
function outputPath(raw){
  const file=path.resolve(raw);if(fs.existsSync(file))fail("output_already_exists");
  const parent=path.dirname(file),st=fs.lstatSync(parent);
  if(st.isSymbolicLink()||!st.isDirectory()||fs.realpathSync.native(parent)!==parent||
    (typeof process.getuid==="function"&&st.uid!==process.getuid())||(st.mode&0o022)!==0)fail("output_parent_invalid");
  return file;
}
function writeOutput(file,value){
  const bytes=Buffer.from(JSON.stringify(value,null,2)+"\n","utf8");
  const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|Number(fs.constants.O_NOFOLLOW||0),0o600);
  try{fs.writeFileSync(fd,bytes);fs.fchmodSync(fd,0o600);fs.fsyncSync(fd);}finally{bytes.fill(0);fs.closeSync(fd);}
}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const k=argv[i];if(!k?.startsWith("--"))fail("invalid_argument:"+String(k));
    const v=String(argv[++i]||"");if(!v)fail("missing_argument_value:"+k);out[k.slice(2)]=v;
  }
  for(const k of["broadcast-request","broadcast-authorization","prebroadcast-observation",
    "signed-transaction","state-dir","confirmation","output"])if(!out[k])fail("missing_argument:"+k);
  return out;
}
export async function testOnlyPrepareIsolatedReviewedExecutionV1(){
  const head=repoGit(["rev-parse","HEAD"]);
  const s=await support(head);
  const prepared=await s.prepareIsolatedReviewedExecutionV1({repoRoot:ROOT,head});
  try{return prepared.binding;}finally{prepared.cleanup();}
}
export async function testOnlyRunSyntheticReviewedChildV1(source,opts={}){
  const head=repoGit(["rev-parse","HEAD"]),s=await support(head);
  const child=s.exactGitFileV1(ROOT,head,
    "ops/precision/void-datanet-registry-reviewed-execution-child-v1.mjs");
  const payload=s.syntheticPayloadV1(head,source,{networkCapable:opts.networkCapable===true});
  const run=s.runReviewedChildV1(child,payload,{timeoutMs:opts.timeoutMs??5000,afterOpen:opts.afterOpen??null});
  return Object.freeze({default:run.envelope.synthetic_default,execution_network_isolation_provided:true});
}
export function testOnlyReviewedGitHeadV1(){return repoGit(["rev-parse","HEAD"]);}
export function testOnlyReadExactHeadSourceV1(rel){
  const head=repoGit(["rev-parse","HEAD"]);return exactFile(head,rel);
}

async function main(){
  const blob=bootstrap();
  if(os.hostname()!=="zoso-Precision-Tower-7810")fail("precision_host_required");
  const first=authority(blob,{remote:true});
  const s=await support(first.head);
  const prepared=await s.prepareIsolatedReviewedExecutionV1({repoRoot:ROOT,head:first.head});
  try{
    const second=authority(blob,{remote:true});
    if(second.head!==first.head||second.tree!==first.tree)fail("reviewed_repository_authority_changed_during_preparation");
    prepared.reverify();
    const a=parseArgs(process.argv.slice(2));
    const request=stableJson(a["broadcast-request"],"broadcast_request");
    const authorization=stableJson(a["broadcast-authorization"],"broadcast_authorization");
    const observation=stableJson(a["prebroadcast-observation"],"prebroadcast_observation");
    const signed=stableJson(a["signed-transaction"],"signed_transaction",{privateMode:true});
    const state=stateDir(a["state-dir"]),output=outputPath(a.output);
    if(a.confirmation!==authorization.required_confirmation)fail("exact_operation_bound_broadcast_confirmation_required");
    const third=authority(blob,{remote:true});
    if(third.head!==first.head||third.tree!==first.tree)fail("reviewed_repository_authority_changed_before_child");
    prepared.reverify();
    const payload=s.childPayloadV1(prepared,first.head,{mode:"submit",call:{
      broadcast_request:request,broadcast_authorization:authorization,
      prebroadcast_observation:observation,signed_transaction:signed,
      state_dir:state,confirmation:a.confirmation,
    }});
    const run=s.runReviewedChildV1(prepared.child,payload);
    const result=run.envelope.result;
    if(!result||typeof result!=="object"||Array.isArray(result))fail("reviewed_child_submit_result_invalid");
    writeOutput(output,result);
    console.log("VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_ISOLATED_EXECUTION_V1");
    console.log("ok="+String(result.ok===true));
    console.log("status="+String(result.status||"held"));
    console.log("reason="+String(result.reason||""));
    console.log("rpc_send_invocation_count="+String(result.rpc_send_invocation_count||0));
    console.log("reviewed_repository_head_sha="+first.head);
    console.log("reviewed_launcher_git_blob_sha1="+first.launcher.blob);
    console.log("reviewed_source_closure_count="+String(prepared.binding.closure_count));
    console.log("reviewed_execution_child_git_blob_sha1="+prepared.binding.reviewed_execution_child_git_blob_sha1);
    console.log("reviewed_graph_executes_in_parent=false");
    console.log("child_stdio_null=true");
    console.log("child_ipc=false");
    console.log("signed_artifact_paths_forwarded_to_child=false");
    console.log("execution_network_isolation_provided=true");
    console.log("automatic_retry_performed=false");
    console.log("replacement_transaction_created=false");
    console.log("credential_access=false");
    console.log("private_key_access=false");
    console.log("transaction_signing=false");
    console.log("output="+output);
    if(result.ok!==true)process.exitCode=2;
    else console.log("VOID_DATANET_REGISTRY_EXACT_SINGLE_BROADCAST_ISOLATED_EXECUTION_V1_GREEN");
  }finally{prepared.cleanup();}
}
const direct=process.argv[1]&&process.argv[1]!=="-"&&
  import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href;
if(direct)fail("reviewed_git_object_bootstrap_required");
if(process.argv[1]==="-")await main();
