#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V1,
  buyVoidSourceFinalityLiveProcessBindingReceiptIdV1,
  type BuyVoidSourceFinalityLiveProcessBindingMaterialV1,
} from "../../src/economic/buy_void_source_finality_live_process_binding_v1.js";
import {
  verifyBuyVoidSourceFinalityDeploymentReceiptV7,
} from "../../src/economic/buy_void_source_finality_generation_provenance_v7.js";

export const VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_INSTALL_V1 =
  "VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_INSTALL_V1";
export const VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_PATH_V7 =
  "/var/lib/void-source-finality-v7/deployment-receipt.json";
export const VOID_BUY_VOID_LIVE_PROCESS_SERVICE_V1 = "void-node-live.service";
export const VOID_BUY_VOID_LIVE_PROCESS_INSTALL_CONFIRMATION_V1 =
  "create-v7-live-process-binding-receipt";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SHA40=/^[0-9a-f]{40}$/u;
const INVOCATION=/^[0-9a-f]{32}$/u;
const UINT=/^[1-9][0-9]*$/u;
const MAX_ENV=2*1024*1024;
const MAX_CMD=256*1024;
const ALLOW_ENV=new Set([
  "VOID_PROCESS_SOURCE_IDENTITY_MARKER",
  "VOID_PROCESS_SOURCE_COMMIT",
  "VOID_PROCESS_SOURCE_TREE",
  "VOID_PROCESS_SOURCE_BRANCH",
  "INVOCATION_ID",
  "VOID_CANONICAL_PRODUCER_ROLE",
  "NODE_OPTIONS",
]);
const FORBID_ENV=new Set(["NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH"]);

type ServiceSnapshot={
  active_state:string;
  main_pid:number;
  invocation_id:string;
  raw:string;
};

type InitialEnvironment={
  source_marker:string;
  source_commit:string;
  source_tree:string;
  source_branch:string;
  invocation_id:string;
  canonical_producer_role:string;
  node_options:string;
  node_path_absent:boolean;
  ld_preload_absent:boolean;
  ld_library_path_absent:boolean;
};

type CollectedReceipt=Readonly<BuyVoidSourceFinalityLiveProcessBindingMaterialV1&{
  readonly receipt_id:string;
}>;

function sha256(bytes:Buffer|string):string{
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function fail(message:string):never{throw new Error(message);}

function asPositiveInt(value:unknown,label:string):number{
  const raw=String(value??"").trim();
  if(!UINT.test(raw))fail(label);
  const parsed=Number(raw);
  if(!Number.isSafeInteger(parsed)||parsed<=0)fail(label);
  return parsed;
}

function rootSafeStat(absolute:string,wantDirectory:boolean):fs.Stats{
  const st=fs.lstatSync(absolute);
  if(st.isSymbolicLink())fail("root_custody_symlink:"+absolute);
  if(wantDirectory?!st.isDirectory():!st.isFile())fail("root_custody_type:"+absolute);
  if(st.uid!==0)fail("root_custody_owner:"+absolute);
  if((st.mode&0o022)!==0)fail("root_custody_writable:"+absolute);
  return st;
}

function proveRootCustodyPath(absolute:string,wantDirectory:boolean):void{
  const resolved=path.resolve(absolute);
  if(!path.isAbsolute(absolute)||resolved!==absolute)fail("root_custody_path_not_canonical");
  rootSafeStat(resolved,wantDirectory);
  let cursor=wantDirectory?resolved:path.dirname(resolved);
  for(;;){
    rootSafeStat(cursor,true);
    if(cursor==="/")break;
    const next=path.dirname(cursor);
    if(next===cursor)fail("root_custody_ancestor_loop");
    cursor=next;
  }
}

function runGit(cwd:string,args:string[]):string{
  const result=spawnSync("/usr/bin/git",[
    "-c","safe.directory="+cwd,
    "-c","core.hooksPath=/dev/null",
    "-c","core.fsmonitor=false",
    "-c","core.untrackedCache=false",
    "--no-replace-objects",
    "-C",cwd,...args,
  ],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:15_000,
    maxBuffer:4*1024*1024,
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0",
    },
  });
  if(result.status!==0)fail("reviewed_git_failed:"+args[0]);
  return String(result.stdout||"").trim();
}

function readBoundedProcFile(
  pid:number,
  leaf:string,
  maxBytes:number,
):Buffer{
  if(!/^[a-z]+$/u.test(leaf))fail("proc_leaf_invalid");
  const absolute="/proc/"+String(pid)+"/"+leaf;
  const flags=fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW;
  const fd=fs.openSync(absolute,flags);
  try{
    const before=fs.fstatSync(fd);
    const chunks:Buffer[]=[];
    let total=0;
    for(;;){
      const chunk=Buffer.alloc(8192);
      const read=fs.readSync(fd,chunk,0,chunk.length,null);
      if(read===0)break;
      total+=read;
      if(total>maxBytes)fail("proc_file_too_large:"+leaf);
      chunks.push(chunk.subarray(0,read));
    }
    const after=fs.fstatSync(fd);
    if(before.dev!==after.dev||before.ino!==after.ino)fail("proc_file_identity_changed:"+leaf);
    return Buffer.concat(chunks,total);
  }finally{
    fs.closeSync(fd);
  }
}

export function parseBuyVoidLiveProcessInitialEnvironmentV1(
  bytes:Buffer,
):InitialEnvironment{
  if(bytes.length<1||bytes.length>MAX_ENV)fail("process_environment_size_invalid");
  const seen=new Map<string,string>();
  for(const raw of bytes.toString("utf8").split("\0")){
    if(!raw)continue;
    const index=raw.indexOf("=");
    if(index<1)continue;
    const key=raw.slice(0,index);
    if(!ALLOW_ENV.has(key)&&!FORBID_ENV.has(key))continue;
    if(seen.has(key))fail("process_environment_duplicate_allowlisted_key:"+key);
    seen.set(key,raw.slice(index+1));
  }
  for(const key of FORBID_ENV){
    if(seen.has(key))fail("process_environment_forbidden_key_present:"+key);
  }
  for(const key of ALLOW_ENV){
    if(!seen.has(key))fail("process_environment_required_key_missing:"+key);
  }
  const value=(key:string)=>String(seen.get(key)||"");
  const out={
    source_marker:value("VOID_PROCESS_SOURCE_IDENTITY_MARKER"),
    source_commit:value("VOID_PROCESS_SOURCE_COMMIT").toLowerCase(),
    source_tree:value("VOID_PROCESS_SOURCE_TREE").toLowerCase(),
    source_branch:value("VOID_PROCESS_SOURCE_BRANCH"),
    invocation_id:value("INVOCATION_ID").toLowerCase(),
    canonical_producer_role:value("VOID_CANONICAL_PRODUCER_ROLE"),
    node_options:value("NODE_OPTIONS"),
    node_path_absent:true,
    ld_preload_absent:true,
    ld_library_path_absent:true,
  };
  if(
    out.source_marker!=="VOID_NODE_PROCESS_SOURCE_IDENTITY_V1"||
    !SHA40.test(out.source_commit)||
    !SHA40.test(out.source_tree)||
    out.source_branch!=="main"||
    !INVOCATION.test(out.invocation_id)||
    out.canonical_producer_role!=="1"
  )fail("process_environment_identity_invalid");
  return Object.freeze(out);
}

function parseStatus(bytes:Buffer):Readonly<{
  uid:number;gid:number;capabilities_zero:true;no_new_privileges:true;
}>{
  const text=bytes.toString("utf8");
  const line=(name:string)=>{
    const match=text.match(new RegExp("^"+name+":\\s*(.+)$","mu"));
    if(!match)fail("proc_status_missing:"+name);
    return match[1].trim();
  };
  const ids=(name:string)=>{
    const parts=line(name).split(/\s+/u);
    if(parts.length!==4||parts.some(v=>!/^[0-9]+$/u.test(v)))fail("proc_status_ids_invalid:"+name);
    const nums=parts.map(Number);
    if(nums.some(v=>!Number.isSafeInteger(v)||v<=0)||!nums.every(v=>v===nums[0])){
      fail("proc_status_ids_not_stable:"+name);
    }
    return nums[0];
  };
  for(const name of ["CapInh","CapPrm","CapEff","CapAmb"]){
    if(!/^0+$/u.test(line(name)))fail("proc_status_capabilities_nonzero:"+name);
  }
  if(line("NoNewPrivs")!=="1")fail("proc_status_no_new_privileges_required");
  return Object.freeze({
    uid:ids("Uid"),gid:ids("Gid"),capabilities_zero:true,no_new_privileges:true,
  });
}

function processStartTicks(bytes:Buffer):string{
  const text=bytes.toString("utf8").trim();
  const close=text.lastIndexOf(")");
  if(close<2)fail("proc_stat_invalid");
  const fields=text.slice(close+1).trim().split(/\s+/u);
  const start=fields[19]||"";
  if(!UINT.test(start))fail("proc_start_ticks_invalid");
  return start;
}

function cgroupV2Path(bytes:Buffer):string{
  const lines=bytes.toString("utf8").trim().split(/\r?\n/u).filter(Boolean);
  const unified=lines.filter(line=>line.startsWith("0::"));
  if(unified.length!==1)fail("process_cgroup_v2_invalid");
  const value=unified[0].slice(3);
  if(!value.startsWith("/")||path.posix.basename(value)!==VOID_BUY_VOID_LIVE_PROCESS_SERVICE_V1){
    fail("process_cgroup_service_mismatch");
  }
  return value;
}

function parseCmdline(bytes:Buffer):string[]{
  if(bytes.length<1||bytes.length>MAX_CMD)fail("process_cmdline_size_invalid");
  const parts=bytes.toString("utf8").split("\0");
  if(parts.at(-1)==="")parts.pop();
  if(parts.length<1||parts.some(v=>v.length===0))fail("process_cmdline_invalid");
  return parts;
}

function systemdEnvironment(uid:number):NodeJS.ProcessEnv{
  const runtime="/run/user/"+String(uid);
  const bus=runtime+"/bus";
  const dir=fs.lstatSync(runtime);
  const sock=fs.lstatSync(bus);
  if(
    !dir.isDirectory()||dir.isSymbolicLink()||dir.uid!==uid||(dir.mode&0o077)!==0||
    !sock.isSocket()||sock.isSymbolicLink()||sock.uid!==uid
  )fail("user_systemd_bus_custody_invalid");
  return {
    PATH:"/usr/bin:/bin",
    HOME:"/nonexistent",
    LANG:"C",
    LC_ALL:"C",
    XDG_RUNTIME_DIR:runtime,
    DBUS_SESSION_BUS_ADDRESS:"unix:path="+bus,
  };
}

function serviceSnapshot(uid:number):ServiceSnapshot{
  const result=spawnSync("/usr/bin/systemctl",[
    "--user","show",VOID_BUY_VOID_LIVE_PROCESS_SERVICE_V1,
    "--property=ActiveState","--property=MainPID","--property=InvocationID",
    "--no-pager",
  ],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:10_000,
    env:systemdEnvironment(uid),
  });
  if(result.status!==0)fail("user_systemd_show_failed");
  const raw=String(result.stdout||"").trim();
  const map=new Map<string,string>();
  for(const line of raw.split(/\r?\n/u)){
    const i=line.indexOf("=");
    if(i<1)continue;
    map.set(line.slice(0,i),line.slice(i+1));
  }
  const pid=asPositiveInt(map.get("MainPID"),"service_main_pid_invalid");
  const invocation=String(map.get("InvocationID")||"").toLowerCase();
  if(map.get("ActiveState")!=="active"||!INVOCATION.test(invocation)){
    fail("service_identity_invalid");
  }
  return Object.freeze({
    active_state:"active",main_pid:pid,invocation_id:invocation,raw,
  });
}

function exactTrackedBlob(cwd:string,commit:string,relative:string):void{
  const absolute=path.join(cwd,...relative.split("/"));
  const resolved=path.resolve(absolute);
  if(!resolved.startsWith(cwd+path.sep))fail("tracked_path_escape");
  proveRootCustodyPath(resolved,false);
  const worktree=runGit(cwd,["hash-object","--",relative]);
  const committed=runGit(cwd,["rev-parse","--verify",commit+":"+relative]);
  if(worktree!==committed)fail("tracked_file_blob_drift:"+relative);
}

function validateSourceAndLauncher(
  cwd:string,
  env:InitialEnvironment,
  executable:string,
  cmdline:string[],
):Readonly<{source_custody_proven:true;reviewed_launcher_contract_proven:true}>{
  proveRootCustodyPath(cwd,true);
  proveRootCustodyPath(executable,false);
  const head=runGit(cwd,["rev-parse","--verify","HEAD^{commit}"]);
  const tree=runGit(cwd,["rev-parse","--verify","HEAD^{tree}"]);
  const branch=runGit(cwd,["symbolic-ref","--short","-q","HEAD"]);
  const status=runGit(cwd,["status","--porcelain=v1"]);
  if(
    head!==env.source_commit||tree!==env.source_tree||branch!=="main"||status!==""
  )fail("process_source_worktree_not_exact");
  exactTrackedBlob(cwd,env.source_commit,"src/index.ts");
  exactTrackedBlob(cwd,env.source_commit,"ops/run-void-node-live-v1.sh");
  exactTrackedBlob(cwd,env.source_commit,"runtime/canonical-producer-source-custody-v1.cjs");
  exactTrackedBlob(cwd,env.source_commit,"node_modules/tsx/dist/preflight.cjs");
  exactTrackedBlob(cwd,env.source_commit,"node_modules/tsx/dist/loader.mjs");

  const expected=[
    executable,
    "--conditions=void-process-source-identity-v1",
    "--conditions=void-process-source-commit-"+env.source_commit,
    "--conditions=void-process-source-tree-"+env.source_tree,
    "--conditions=void-process-source-branch-main",
    "--require",
    path.join(cwd,"node_modules/tsx/dist/preflight.cjs"),
    "--import",
    "file://"+path.join(cwd,"node_modules/tsx/dist/loader.mjs"),
    path.join(cwd,"src/index.ts"),
  ];
  assert.deepEqual(cmdline,expected,"process_cmdline_not_reviewed_launcher_shape");
  const guardMatch=env.node_options.match(
    new RegExp("^--require "+cwd.replace(/[.*+?^\${}()|[\]\\]/g,"\\$&")+
      "/runtime/(canonical-producer-self-http-guard-v[1-4]\\.cjs)$","u"),
  );
  if(!guardMatch)fail("node_options_guard_invalid");
  exactTrackedBlob(cwd,env.source_commit,"runtime/"+guardMatch[1]);
  return Object.freeze({
    source_custody_proven:true,
    reviewed_launcher_contract_proven:true,
  });
}

export function buildBuyVoidLiveProcessBindingReceiptV1(input:{
  deployment_receipt_id:string;
  process_source_commit:string;
  process_source_tree:string;
  runtime_uid:number;
  runtime_gid:number;
  main_pid:number;
  process_start_time_ticks:string;
  systemd_invocation_id:string;
  cgroup_v2_path:string;
  executable_realpath:string;
  cwd_realpath:string;
  cmdline_sha256:string;
  node_options_sha256:string;
}):CollectedReceipt{
  const material:BuyVoidSourceFinalityLiveProcessBindingMaterialV1=Object.freeze({
    marker:VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V1,
    version:1,
    deployment_receipt_id:input.deployment_receipt_id,
    process_source_identity_marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
    process_source_commit:input.process_source_commit,
    process_source_tree:input.process_source_tree,
    process_source_branch:"main",
    service_unit:VOID_BUY_VOID_LIVE_PROCESS_SERVICE_V1,
    runtime_uid:input.runtime_uid,
    runtime_gid:input.runtime_gid,
    main_pid:input.main_pid,
    process_start_time_ticks:input.process_start_time_ticks,
    systemd_invocation_id:input.systemd_invocation_id,
    cgroup_v2_path:input.cgroup_v2_path,
    executable_realpath:input.executable_realpath,
    cwd_realpath:input.cwd_realpath,
    cmdline_sha256:input.cmdline_sha256,
    node_options_sha256:input.node_options_sha256,
    canonical_producer_role:true,
    node_path_absent:true,
    ld_preload_absent:true,
    ld_library_path_absent:true,
    capabilities_zero:true,
    no_new_privileges:true,
    source_custody_proven:true,
    reviewed_service_contract_proven:true,
    reviewed_launcher_contract_proven:true,
  });
  const receipt_id=buyVoidSourceFinalityLiveProcessBindingReceiptIdV1(material);
  return Object.freeze({...material,receipt_id});
}

export function collectBuyVoidLiveProcessBindingReceiptV1(
  runtimeUid:number,
):CollectedReceipt{
  if(
    typeof process.geteuid!=="function"||
    process.geteuid()!==0||
    runtimeUid<=0||
    !Number.isSafeInteger(runtimeUid)
  )fail("root_collector_and_positive_runtime_uid_required");

  const before=serviceSnapshot(runtimeUid);
  const pid=before.main_pid;
  const status=parseStatus(readBoundedProcFile(pid,"status",128*1024));
  if(status.uid!==runtimeUid)fail("service_runtime_uid_mismatch");

  const env=parseBuyVoidLiveProcessInitialEnvironmentV1(
    readBoundedProcFile(pid,"environ",MAX_ENV),
  );
  if(env.invocation_id!==before.invocation_id)fail("service_invocation_environment_mismatch");

  const statTicks=processStartTicks(readBoundedProcFile(pid,"stat",128*1024));
  const cgroup=cgroupV2Path(readBoundedProcFile(pid,"cgroup",128*1024));
  const cmdBytes=readBoundedProcFile(pid,"cmdline",MAX_CMD);
  const cmdline=parseCmdline(cmdBytes);
  const executable=fs.realpathSync("/proc/"+String(pid)+"/exe");
  const cwd=fs.realpathSync("/proc/"+String(pid)+"/cwd");

  const reviewed=validateSourceAndLauncher(cwd,env,executable,cmdline);
  assert.equal(reviewed.source_custody_proven,true);
  assert.equal(reviewed.reviewed_launcher_contract_proven,true);

  const deployment=verifyBuyVoidSourceFinalityDeploymentReceiptV7({
    deployment_receipt_path:
      VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_PATH_V7,
    process_source_identity:{
      marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
      commit:env.source_commit,
      tree:env.source_tree,
      branch:"main",
    },
  });
  if(deployment.ok===false)fail("deployment_receipt_not_verified:"+deployment.reason);

  const after=serviceSnapshot(runtimeUid);
  if(after.raw!==before.raw)fail("service_identity_changed_during_collection");
  if(after.main_pid!==pid||after.invocation_id!==before.invocation_id){
    fail("service_generation_changed_during_collection");
  }
  const ticksAfter=processStartTicks(readBoundedProcFile(pid,"stat",128*1024));
  if(ticksAfter!==statTicks)fail("process_generation_changed_during_collection");

  return buildBuyVoidLiveProcessBindingReceiptV1({
    deployment_receipt_id:deployment.deployment_receipt_id,
    process_source_commit:env.source_commit,
    process_source_tree:env.source_tree,
    runtime_uid:status.uid,
    runtime_gid:status.gid,
    main_pid:pid,
    process_start_time_ticks:statTicks,
    systemd_invocation_id:before.invocation_id,
    cgroup_v2_path:cgroup,
    executable_realpath:executable,
    cwd_realpath:cwd,
    cmdline_sha256:sha256(cmdBytes),
    node_options_sha256:sha256(env.node_options),
  });
}

function stableReceiptBytes(receipt:CollectedReceipt):Buffer{
  return Buffer.from(JSON.stringify(receipt,null,2)+"\n","utf8");
}

function readExistingRootReceipt(target:string):Buffer{
  proveRootCustodyPath(target,false);
  const st=fs.lstatSync(target);
  if((st.mode&0o777)!==0o444||st.nlink!==1)fail("existing_receipt_metadata_invalid");
  return fs.readFileSync(target);
}

export function installBuyVoidLiveProcessBindingReceiptCreateOnceV1(input:{
  target_path:string;
  receipt:CollectedReceipt;
}):"created"|"already_present"{
  if(typeof process.geteuid!=="function"||process.geteuid()!==0)fail("root_apply_required");
  const target=path.resolve(input.target_path);
  if(target!==input.target_path||!path.isAbsolute(target))fail("target_path_invalid");
  const parent=path.dirname(target);
  proveRootCustodyPath(parent,true);
  const bytes=stableReceiptBytes(input.receipt);
  if(fs.existsSync(target)){
    if(!readExistingRootReceipt(target).equals(bytes))fail("different_live_process_receipt_already_exists");
    return "already_present";
  }
  const temp=path.join(
    parent,
    "."+path.basename(target)+".tmp-"+String(process.pid)+"-"+crypto.randomBytes(8).toString("hex"),
  );
  let fd=-1;
  try{
    fd=fs.openSync(
      temp,
      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,
      0o400,
    );
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd,0o444);
    fs.fsyncSync(fd);
    fs.closeSync(fd);fd=-1;
    fs.linkSync(temp,target);
    fs.unlinkSync(temp);
    const dirfd=fs.openSync(parent,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY);
    try{fs.fsyncSync(dirfd);}finally{fs.closeSync(dirfd);}
  }finally{
    if(fd>=0)fs.closeSync(fd);
    if(fs.existsSync(temp))fs.unlinkSync(temp);
  }
  const installed=readExistingRootReceipt(target);
  if(!installed.equals(bytes))fail("installed_receipt_bytes_mismatch");
  return "created";
}

function parseArgs(argv:string[]):Readonly<{
  mode:"plan"|"apply";runtime_uid:number;confirm:string;
}>{
  let mode:"plan"|"apply"="plan";
  let runtimeUid=0;
  let confirm="";
  for(let i=0;i<argv.length;i+=1){
    const arg=argv[i];
    if(arg==="--plan")mode="plan";
    else if(arg==="--apply")mode="apply";
    else if(arg==="--runtime-uid")runtimeUid=asPositiveInt(argv[++i],"runtime_uid_invalid");
    else if(arg==="--confirm")confirm=String(argv[++i]||"");
    else fail("unknown_argument:"+arg);
  }
  if(runtimeUid===0&&process.env.SUDO_UID){
    runtimeUid=asPositiveInt(process.env.SUDO_UID,"sudo_uid_invalid");
  }
  if(runtimeUid===0)fail("runtime_uid_required");
  return Object.freeze({mode,runtime_uid:runtimeUid,confirm});
}

function main():void{
  const args=parseArgs(process.argv.slice(2));
  console.log(VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_INSTALL_V1);
  console.log("mode="+args.mode);
  console.log("process_environment_read=true");
  console.log("process_environment_output_allowlisted_only=true");
  console.log("unrelated_environment_values_persisted=false");
  console.log("service_mutation=false");
  console.log("credential_file_access=false");
  console.log("wallet_or_signer_access=false");
  console.log("rpc_call=false");
  console.log("transaction_signing=false");
  console.log("transaction_broadcast=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");

  const receipt=collectBuyVoidLiveProcessBindingReceiptV1(args.runtime_uid);
  console.log("runtime_uid="+receipt.runtime_uid);
  console.log("main_pid="+receipt.main_pid);
  console.log("systemd_invocation_id="+receipt.systemd_invocation_id);
  console.log("process_source_commit="+receipt.process_source_commit);
  console.log("process_source_tree="+receipt.process_source_tree);
  console.log("deployment_receipt_id="+receipt.deployment_receipt_id);
  console.log("live_process_binding_receipt_id="+receipt.receipt_id);

  if(args.mode==="plan"){
    console.log("host_mutation=false");
    console.log("status=LIVE_PROCESS_BINDING_RECEIPT_PLAN_GREEN");
    return;
  }
  if(args.confirm!==VOID_BUY_VOID_LIVE_PROCESS_INSTALL_CONFIRMATION_V1){
    fail("apply_confirmation_required");
  }
  const result=installBuyVoidLiveProcessBindingReceiptCreateOnceV1({
    target_path:VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V1,
    receipt,
  });
  console.log("host_mutation=true");
  console.log("receipt_install_result="+result);
  console.log("status=LIVE_PROCESS_BINDING_RECEIPT_INSTALL_GREEN");
}

if(
  process.argv[1]&&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url)
){
  try{main();}catch(error){
    console.error("status=LIVE_PROCESS_BINDING_RECEIPT_INSTALL_HOLD");
    console.error("reason="+String((error as Error)?.message||"unknown"));
    process.exitCode=2;
  }
}
