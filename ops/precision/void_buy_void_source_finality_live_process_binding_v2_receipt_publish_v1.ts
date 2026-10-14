#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectBuyVoidV2LiveProcessCollectionPlanV1,
  type BuyVoidV2LiveProcessCollectionPlanV1,
} from "./void_buy_void_source_finality_live_process_v2_collection_plan_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2,
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V2,
  buildBuyVoidSourceFinalityLiveProcessBindingReceiptV2,
  type BuyVoidSourceFinalityLiveProcessBindingMaterialV2,
  type BuyVoidSourceFinalityLiveProcessBindingReceiptV2,
} from "../../src/economic/buy_void_source_finality_live_process_binding_v2.js";
import {
  verifyBuyVoidSourceFinalityDeploymentReceiptV7,
} from "../../src/economic/buy_void_source_finality_generation_provenance_v7.js";

export const VOID_BUY_VOID_V2_LIVE_PROCESS_RECEIPT_PUBLISHER_V1 =
  "VOID_BUY_VOID_V2_LIVE_PROCESS_RECEIPT_PUBLISHER_V1";
export const VOID_BUY_VOID_V2_LIVE_PROCESS_RECEIPT_PUBLISH_CONFIRMATION_V1 =
  "publish-v7-live-process-binding-v2-receipt";
export const VOID_BUY_VOID_V7_DEPLOYMENT_RECEIPT_PATH_V1 =
  "/var/lib/void-source-finality-v7/deployment-receipt.json";

const SHA40=/^[0-9a-f]{40}$/u;
const PLAN_ID=/^voidbsv2colplan1_[0-9a-f]{64}$/u;
const MAX_RECEIPT_BYTES=64*1024;

function fail(code:string):never{throw new Error(code);}
function sha256(value:Buffer|string):string{
  return crypto.createHash("sha256").update(value).digest("hex");
}
function rootSafe(absolute:string,wantDirectory:boolean):fs.Stats{
  const st=fs.lstatSync(absolute);
  if(
    st.isSymbolicLink()||
    (wantDirectory?!st.isDirectory():!st.isFile())||
    st.uid!==0||(st.mode&0o022)!==0
  )fail("publisher_root_custody_invalid:"+absolute);
  return st;
}
function proveRootCustodyPath(absolute:string,wantDirectory:boolean):void{
  if(!path.isAbsolute(absolute)||path.resolve(absolute)!==absolute){
    fail("publisher_path_not_canonical");
  }
  rootSafe(absolute,wantDirectory);
  let cursor=wantDirectory?absolute:path.dirname(absolute);
  for(;;){
    rootSafe(cursor,true);
    if(cursor==="/")break;
    const next=path.dirname(cursor);
    if(next===cursor)fail("publisher_ancestor_walk_stalled");
    cursor=next;
  }
}
function runGit(cwd:string,args:string[]):string{
  const r=spawnSync("/usr/bin/git",[
    "--no-replace-objects",
    "-c","core.hooksPath=/dev/null",
    "-c","core.attributesFile=/dev/null",
    "-c","core.fsmonitor=false",
    "-c","core.untrackedCache=false",
    "-c","safe.directory="+cwd,
    "-C",cwd,...args,
  ],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:20_000,maxBuffer:4*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
  });
  if(r.status!==0)fail("publisher_reviewed_git_failed:"+args[0]);
  return String(r.stdout||"").trim();
}
function exactTrackedBlob(cwd:string,commit:string,relative:string):void{
  const absolute=path.join(cwd,...relative.split("/"));
  proveRootCustodyPath(absolute,false);
  const visible=runGit(cwd,["hash-object","--",relative]);
  const tracked=runGit(cwd,["rev-parse","--verify",commit+":"+relative]);
  if(visible!==tracked)fail("publisher_tracked_blob_mismatch:"+relative);
}
export function requalifyBuyVoidV2LiveSourceCustodyV1(
  plan:BuyVoidV2LiveProcessCollectionPlanV1,
):Readonly<{source_custody_proven:true;reviewed_service_contract_proven:true}>{
  const cwd=plan.cwd_realpath;
  proveRootCustodyPath(cwd,true);
  proveRootCustodyPath("/usr/bin/node",false);
  if(
    runGit(cwd,["rev-parse","--verify","HEAD^{commit}"])!==plan.process_source_commit||
    runGit(cwd,["rev-parse","--verify","HEAD^{tree}"])!==plan.process_source_tree||
    runGit(cwd,["symbolic-ref","--short","-q","HEAD"])!=="main"||
    runGit(cwd,["status","--porcelain=v1","--untracked-files=all"])!==""
  )fail("publisher_live_source_generation_mismatch");
  for(const relative of [
    "src/index.ts",
    "ops/run-void-node-live-v1.sh",
    "runtime/canonical-producer-source-custody-v1.cjs",
  ]) exactTrackedBlob(cwd,plan.process_source_commit,relative);
  proveRootCustodyPath(path.join(cwd,"node_modules/tsx/dist/preflight.cjs"),false);
  proveRootCustodyPath(path.join(cwd,"node_modules/tsx/dist/loader.mjs"),false);

  const custody=spawnSync("/usr/bin/setpriv",[
    "--reuid="+String(plan.runtime_uid),
    "--regid="+String(plan.runtime_gid),
    "--clear-groups","--no-new-privs",
    "/usr/bin/node",
    path.join(cwd,"runtime/canonical-producer-source-custody-v1.cjs"),
    cwd,
  ],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30_000,maxBuffer:4*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC"},
  });
  if(
    custody.status!==0||
    !String(custody.stdout||"").includes("VOID_CANONICAL_PRODUCER_SOURCE_CUSTODY_V1_GREEN")
  )fail("publisher_live_source_custody_requalification_failed");
  return Object.freeze({
    source_custody_proven:true,
    reviewed_service_contract_proven:true,
  });
}

export function buildBuyVoidV2LiveProcessReceiptFromPlanV1(input:{
  plan:BuyVoidV2LiveProcessCollectionPlanV1;
  deployment_receipt_id:string;
}):BuyVoidSourceFinalityLiveProcessBindingReceiptV2{
  const plan=input.plan;
  if(
    !PLAN_ID.test(plan.plan_id)||
    plan.receipt_publication_authorized!==false||
    plan.production_source_finality_authority_ready!==false||
    plan.public_presale_activation!==false||
    plan.funds_movement!==false||
    plan.selector_ready_and_green_same_generation!==true||
    plan.manager_and_service_pidfds_retained_by_selector!==true||
    plan.systemctl_user_selector_authority!==false||
    plan.source_generation_verified!==true||
    plan.reviewed_launcher_shape_verified!==true
  )fail("publisher_collection_plan_authority_invalid");
  const uid=plan.runtime_uid;
  const managerCgroup=
    `/user.slice/user-${uid}.slice/user@${uid}.service/init.scope`;
  const material:BuyVoidSourceFinalityLiveProcessBindingMaterialV2=Object.freeze({
    marker:VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V2,
    version:2,
    deployment_receipt_id:input.deployment_receipt_id,
    service_process_selection_mode:plan.selector_mode,
    service_process_selector_contract_id:plan.selector_contract_id,
    manager_pid:plan.manager_pid,
    manager_ppid:1,
    manager_start_time_ticks:plan.manager_start_time_ticks,
    manager_cgroup_v2_path:managerCgroup,
    manager_executable_realpath:"/usr/lib/systemd/systemd",
    manager_cmdline_sha256:plan.manager_cmdline_sha256,
    manager_pidfd_retained_during_collection:true,
    service_pidfd_retained_during_collection:true,
    process_source_identity_marker:plan.process_source_identity_marker,
    process_source_commit:plan.process_source_commit,
    process_source_tree:plan.process_source_tree,
    process_source_branch:"main",
    service_unit:"void-node-live.service",
    runtime_uid:plan.runtime_uid,
    runtime_gid:plan.runtime_gid,
    main_pid:plan.service_pid,
    process_start_time_ticks:plan.service_start_time_ticks,
    systemd_invocation_id:plan.systemd_invocation_id,
    cgroup_v2_path:plan.service_cgroup_v2_path,
    executable_realpath:"/usr/bin/node",
    cwd_realpath:plan.cwd_realpath,
    cmdline_sha256:plan.service_cmdline_sha256,
    node_options_sha256:plan.node_options_sha256,
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
  return buildBuyVoidSourceFinalityLiveProcessBindingReceiptV2(material);
}

function receiptBytes(receipt:BuyVoidSourceFinalityLiveProcessBindingReceiptV2):Buffer{
  const bytes=Buffer.from(JSON.stringify(receipt,null,2)+"\n","utf8");
  if(bytes.length<2||bytes.length>MAX_RECEIPT_BYTES)fail("publisher_receipt_size_invalid");
  return bytes;
}
function sameReceiptIdentity(a:fs.Stats,b:fs.Stats):boolean{
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode&&a.nlink===b.nlink&&a.size===b.size&&
    a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
}
function fsyncDirectory(parent:string):void{
  const d=fs.openSync(parent,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY);
  try{fs.fsyncSync(d);}finally{fs.closeSync(d);}
}
function readInstalledCanonicalReceipt(target:string):Readonly<{
  bytes:Buffer;
  receipt:BuyVoidSourceFinalityLiveProcessBindingReceiptV2;
  identity:fs.Stats;
}>{
  proveRootCustodyPath(target,false);
  const before=fs.lstatSync(target);
  if(before.gid!==0||before.nlink!==1||(before.mode&0o777)!==0o444){
    fail("publisher_receipt_metadata_invalid");
  }
  const fd=fs.openSync(
    target,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const opened=fs.fstatSync(fd);
    if(!sameReceiptIdentity(before,opened)){
      fail("publisher_receipt_open_identity_mismatch");
    }
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd);
    const visible=fs.lstatSync(target);
    if(
      !sameReceiptIdentity(opened,after)||
      !sameReceiptIdentity(after,visible)||
      bytes.length!==after.size
    )fail("publisher_receipt_changed_during_read");
    let rebuilt:BuyVoidSourceFinalityLiveProcessBindingReceiptV2;
    try{
      const parsed=JSON.parse(
        new TextDecoder("utf-8",{fatal:true}).decode(bytes),
      ) as Record<string,unknown>;
      if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)){
        fail("publisher_existing_receipt_invalid");
      }
      const receiptId=String(parsed.receipt_id||"");
      const material={...parsed};
      delete material.receipt_id;
      rebuilt=buildBuyVoidSourceFinalityLiveProcessBindingReceiptV2(
        material as unknown as BuyVoidSourceFinalityLiveProcessBindingMaterialV2,
      );
      if(
        rebuilt.receipt_id!==receiptId||
        !receiptBytes(rebuilt).equals(bytes)
      )fail("publisher_existing_receipt_invalid");
    }catch{
      fail("publisher_existing_receipt_invalid");
    }
    return Object.freeze({bytes,receipt:rebuilt,identity:after});
  }finally{fs.closeSync(fd);}
}
function verifyInstalled(target:string,expected:Buffer):void{
  const observed=readInstalledCanonicalReceipt(target);
  if(!observed.bytes.equals(expected))fail("publisher_receipt_bytes_mismatch");
}
export function installBuyVoidV2LiveProcessReceiptCreateOnceV1(input:{
  target_path:string;
  receipt:BuyVoidSourceFinalityLiveProcessBindingReceiptV2;
}):Readonly<{created:boolean;already_matching:boolean;retired_stale:boolean}>{
  if(process.platform!=="linux")fail("publisher_linux_required");
  if(typeof process.getuid!=="function"||process.getuid()!==0)fail("publisher_root_required");
  const target=path.resolve(input.target_path);
  if(target!==input.target_path||!path.isAbsolute(target))fail("publisher_target_invalid");
  const parent=path.dirname(target);
  proveRootCustodyPath(parent,true);
  const bytes=receiptBytes(input.receipt);
  let retiredStale=false;
  if(fs.existsSync(target)){
    const existing=readInstalledCanonicalReceipt(target);
    if(existing.bytes.equals(bytes)){
      return Object.freeze({
        created:false,
        already_matching:true,
        retired_stale:false,
      });
    }
    const visible=fs.lstatSync(target);
    if(!sameReceiptIdentity(existing.identity,visible)){
      fail("publisher_existing_receipt_changed_before_retirement");
    }
    fs.unlinkSync(target);
    fsyncDirectory(parent);
    if(fs.existsSync(target)){
      fail("publisher_stale_receipt_retirement_failed");
    }
    retiredStale=true;
  }
  const temp=path.join(parent,"."+path.basename(target)+".tmp-"+process.pid+"-"+crypto.randomBytes(8).toString("hex"));
  let fd=-1;
  try{
    fd=fs.openSync(temp,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|
      Number(fs.constants.O_NOFOLLOW||0),0o400);
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
    fs.fchmodSync(fd,0o444);
    fs.fsyncSync(fd);
    fs.closeSync(fd);fd=-1;
    try{fs.linkSync(temp,target);}
    catch(error:any){
      if(error?.code!=="EEXIST")throw error;
      verifyInstalled(target,bytes);
      fs.unlinkSync(temp);
      fsyncDirectory(parent);
      return Object.freeze({
        created:false,
        already_matching:true,
        retired_stale:retiredStale,
      });
    }
    fs.unlinkSync(temp);
    fsyncDirectory(parent);
    verifyInstalled(target,bytes);
    return Object.freeze({
      created:true,
      already_matching:false,
      retired_stale:retiredStale,
    });
  }finally{
    if(fd>=0)fs.closeSync(fd);
    if(fs.existsSync(temp))fs.unlinkSync(temp);
  }
}
export function rollbackNewBuyVoidV2LiveProcessReceiptV1(input:{
  target_path:string;
  receipt:BuyVoidSourceFinalityLiveProcessBindingReceiptV2;
  created:boolean;
}):void{
  if(!input.created)return;
  const target=path.resolve(input.target_path);
  const bytes=receiptBytes(input.receipt);
  verifyInstalled(target,bytes);
  fs.unlinkSync(target);
  fsyncDirectory(path.dirname(target));
}
function samePlan(a:BuyVoidV2LiveProcessCollectionPlanV1,b:BuyVoidV2LiveProcessCollectionPlanV1):void{
  if(a.plan_id!==b.plan_id)fail("publisher_live_generation_changed");
}
async function collectReceipt(runtimeUid:number,runtimeGid:number){
  const plan=await collectBuyVoidV2LiveProcessCollectionPlanV1({
    runtime_uid:runtimeUid,runtime_gid:runtimeGid,
  });
  requalifyBuyVoidV2LiveSourceCustodyV1(plan);
  const deployment=verifyBuyVoidSourceFinalityDeploymentReceiptV7({
    deployment_receipt_path:VOID_BUY_VOID_V7_DEPLOYMENT_RECEIPT_PATH_V1,
    process_source_identity:{
      marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
      commit:plan.process_source_commit,
      tree:plan.process_source_tree,
      branch:"main",
    },
  });
  if(deployment.ok===false)fail("publisher_deployment_receipt_"+deployment.reason);
  if(deployment.reviewed_source_file_count!=="10"){
    fail("publisher_deployment_receipt_not_v2_generation");
  }
  const receipt=buildBuyVoidV2LiveProcessReceiptFromPlanV1({
    plan,deployment_receipt_id:deployment.deployment_receipt_id,
  });
  return Object.freeze({plan,receipt});
}
function positive(value:string|undefined,label:string):number{
  if(!value||!/^[1-9][0-9]*$/u.test(value))fail(label);
  const n=Number(value);if(!Number.isSafeInteger(n)||n<=0)fail(label);return n;
}
function parseArgs(argv:string[]){
  let mode:"plan"|"apply"|null=null,uid=0,gid=0,confirm="";
  for(let i=0;i<argv.length;i++){
    const a=argv[i];
    if(a==="--plan")mode="plan";
    else if(a==="--apply")mode="apply";
    else if(a==="--runtime-uid")uid=positive(argv[++i],"publisher_runtime_uid_invalid");
    else if(a==="--runtime-gid")gid=positive(argv[++i],"publisher_runtime_gid_invalid");
    else if(a==="--confirm")confirm=String(argv[++i]||"");
    else fail("publisher_unknown_argument:"+a);
  }
  if(!mode)fail("publisher_mode_required");
  if(uid<=0||gid<=0)fail("publisher_runtime_identity_required");
  return Object.freeze({mode,uid,gid,confirm});
}

async function main():Promise<void>{
  const args=parseArgs(process.argv.slice(2));
  console.log(VOID_BUY_VOID_V2_LIVE_PROCESS_RECEIPT_PUBLISHER_V1);
  console.log("mode="+args.mode);
  console.log("selector_pidfd_collection=true");
  console.log("deployment_receipt_required=true");
  console.log("live_source_custody_requalification=true");
  console.log("service_mutation=false");
  console.log("rpc_contact=false");
  console.log("credential_access=false");
  console.log("wallet_or_signer_access=false");
  console.log("transaction_broadcast=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");

  const first=await collectReceipt(args.uid,args.gid);
  console.log("collection_plan_id="+first.plan.plan_id);
  console.log("deployment_receipt_id="+first.receipt.deployment_receipt_id);
  console.log("live_process_binding_v2_receipt_id="+first.receipt.receipt_id);
  if(args.mode==="plan"){
    console.log("receipt_publication=false");
    console.log("filesystem_mutation=false");
    console.log("status=V2_LIVE_PROCESS_RECEIPT_PUBLISH_PLAN_GREEN");
    return;
  }
  if(args.confirm!==VOID_BUY_VOID_V2_LIVE_PROCESS_RECEIPT_PUBLISH_CONFIRMATION_V1){
    fail("publisher_apply_confirmation_required");
  }
  const second=await collectReceipt(args.uid,args.gid);
  samePlan(first.plan,second.plan);
  if(second.receipt.receipt_id!==first.receipt.receipt_id){
    fail("publisher_receipt_identity_changed_before_publication");
  }
  const result=installBuyVoidV2LiveProcessReceiptCreateOnceV1({
    target_path:VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2,
    receipt:first.receipt,
  });
  try{
    const after=await collectReceipt(args.uid,args.gid);
    samePlan(first.plan,after.plan);
    if(after.receipt.receipt_id!==first.receipt.receipt_id){
      fail("publisher_receipt_identity_changed_after_publication");
    }
  }catch(error){
    rollbackNewBuyVoidV2LiveProcessReceiptV1({
      target_path:VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2,
      receipt:first.receipt,
      created:result.created,
    });
    throw error;
  }
  console.log("receipt_publication=true");
  console.log("receipt_created="+String(result.created));
  console.log("receipt_already_matching="+String(result.already_matching));
  console.log("stale_receipt_retired="+String(result.retired_stale));
  console.log("post_publication_generation_recheck=true");
  console.log("service_mutation=false");
  console.log("rpc_contact=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
  console.log("status=V2_LIVE_PROCESS_RECEIPT_PUBLISHED_GREEN");
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{
    console.error(VOID_BUY_VOID_V2_LIVE_PROCESS_RECEIPT_PUBLISHER_V1+"_HOLD");
    console.error("reason="+String((error as Error)?.message||"unknown"));
    process.exitCode=2;
  });
}
