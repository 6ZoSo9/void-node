import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  readBuyVoidSourceFinalitySelfProcessIdentityV1,
  type BuyVoidSourceFinalitySelfProcessIdentityV1,
} from "./buy_void_source_finality_live_process_binding_v1.js";

export const VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V2 =
  "VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V2";
export const VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V2 =
  "VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V2";
export const VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2 =
  "/var/lib/void-source-finality-v7/live-process-binding-v2.json";
export const VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2 =
  "kernel_cgroup_manager_parent_v1";

const SERVICE_UNIT="void-node-live.service";
const MANAGER_EXE="/usr/lib/systemd/systemd";
const NODE_EXE="/usr/bin/node";
const SHA256=/^[0-9a-f]{64}$/u;
const SHA40=/^[0-9a-f]{40}$/u;
const DEPLOYMENT=/^voidbsfdep1_[0-9a-f]{64}$/u;
const RECEIPT=/^voidbsflp2_[0-9a-f]{64}$/u;
const SELECTOR=/^voidbsfpsel1_[0-9a-f]{64}$/u;
const INVOCATION=/^[0-9a-f]{32}$/u;
const UINT=/^[1-9][0-9]*$/u;
const MAX_RECEIPT_BYTES=64*1024;
const MAX_PROC_BYTES=1024*1024;

export const VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_AUTHORITY_V2 =
  Object.freeze({
    source_only_gate:true,
    v1_receipt_authority_rejected:true,
    root_custodied_v2_receipt_required:true,
    kernel_cgroup_manager_parent_selector_required:true,
    exact_manager_executable_required:true,
    exact_service_parent_relation_required:true,
    manager_and_service_start_ticks_required:true,
    manager_and_service_pidfd_retention_required_at_collection:true,
    self_process_reverification_required:true,
    systemctl_user_selector_authority:false,
    systemd_invocation_metadata_only:true,
    host_mutation:false,
    service_mutation:false,
    credential_access:false,
    wallet_or_signer_access:false,
    rpc_call:false,
    transaction_broadcast:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  });

type Plain=Record<string,unknown>;

function plain(value:unknown):value is Plain{
  if(value===null||typeof value!=="object"||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
function canonical(value:unknown):string{
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(plain(value))return "{"+Object.keys(value).sort()
    .map(key=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
  throw new Error("live_process_v2_canonical_value_invalid");
}
function sha256(value:Buffer|string):string{
  return crypto.createHash("sha256").update(value).digest("hex");
}
function exactKeys(value:unknown,keys:readonly string[],code:string):asserts value is Plain{
  if(!plain(value))throw new Error(code);
  const actual=Reflect.ownKeys(Object.getOwnPropertyDescriptors(value));
  if(actual.some(key=>typeof key!=="string"))throw new Error(code);
  const got=(actual as string[]).sort();
  const want=[...keys].sort();
  if(got.length!==want.length||got.some((v,i)=>v!==want[i]))throw new Error(code);
  for(const key of keys){
    const d=Object.getOwnPropertyDescriptor(value,key);
    if(!d||d.enumerable!==true||!("value" in d))throw new Error(code);
  }
}
function positive(value:unknown,code:string):number{
  if(typeof value!=="number"||!Number.isSafeInteger(value)||value<=0)throw new Error(code);
  return value;
}
function uint(value:unknown,code:string):string{
  if(typeof value!=="string"||!UINT.test(value))throw new Error(code);
  return value;
}
function hash(value:unknown,code:string):string{
  if(typeof value!=="string"||!SHA256.test(value))throw new Error(code);
  return value;
}
function absolute(value:unknown,code:string):string{
  if(typeof value!=="string"||!path.isAbsolute(value)||path.resolve(value)!==value||value.includes("\0")){
    throw new Error(code);
  }
  return value;
}

export type BuyVoidKernelProcessObservationV2=Readonly<{
  pid:number;
  ppid:number;
  start_time_ticks:string;
  uid:number;
  gid:number;
  cgroup_v2_path:string;
  comm:string;
  executable_realpath:string;
  executable_root_owned_nonwritable:true;
  cmdline:readonly string[];
}>;

const SELECTOR_CONTRACT_MATERIAL=Object.freeze({
  marker:"VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_V1",
  version:1,
  manager_scope_template:"/user.slice/user-<uid>.slice/user@<uid>.service/init.scope",
  service_cgroup_template:
    "/user.slice/user-<uid>.slice/user@<uid>.service/app.slice/void-node-live.service",
  manager_executable:MANAGER_EXE,
  manager_argv:Object.freeze([MANAGER_EXE,"--user"]),
  service_executable:NODE_EXE,
  service_parent_must_equal_manager_pid:true,
  exact_one_manager_candidate:true,
  exact_one_service_candidate:true,
  manager_and_service_start_ticks_rechecked:true,
  manager_and_service_cgroup_membership_rechecked:true,
  manager_and_service_pidfd_retained_during_collection:true,
  systemctl_user_selector_authority:false,
});

export const VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2 =
  "voidbsfpsel1_"+sha256(canonical(SELECTOR_CONTRACT_MATERIAL));

export type BuyVoidServiceProcessSelectionV2=Readonly<{
  service_process_selection_mode:
    typeof VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2;
  service_process_selector_contract_id:
    typeof VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2;
  manager:BuyVoidKernelProcessObservationV2;
  service:BuyVoidKernelProcessObservationV2;
}>;

function exactManagerScope(uid:number):string{
  return `/user.slice/user-${uid}.slice/user@${uid}.service/init.scope`;
}
function exactServiceCgroup(uid:number):string{
  return `/user.slice/user-${uid}.slice/user@${uid}.service/app.slice/${SERVICE_UNIT}`;
}

export function selectBuyVoidSourceFinalityServiceProcessV2(input:{
  runtime_uid:number;
  runtime_gid:number;
  manager_processes:readonly BuyVoidKernelProcessObservationV2[];
  service_processes:readonly BuyVoidKernelProcessObservationV2[];
}):BuyVoidServiceProcessSelectionV2{
  const uid=positive(input.runtime_uid,"selector_runtime_uid_invalid");
  const gid=positive(input.runtime_gid,"selector_runtime_gid_invalid");
  const managerScope=exactManagerScope(uid);
  const serviceCgroup=exactServiceCgroup(uid);
  const managers=input.manager_processes.filter(row=>
    row.uid===uid&&row.gid===gid&&
    row.cgroup_v2_path===managerScope&&
    row.comm==="systemd"&&
    row.executable_realpath===MANAGER_EXE&&
    row.executable_root_owned_nonwritable===true&&
    row.cmdline.length===2&&
    row.cmdline[0]===MANAGER_EXE&&row.cmdline[1]==="--user"
  );
  if(managers.length!==1)throw new Error("selector_manager_candidate_count_invalid");
  const manager=managers[0];
  const services=input.service_processes.filter(row=>
    row.uid===uid&&row.gid===gid&&
    row.cgroup_v2_path===serviceCgroup&&
    row.ppid===manager.pid&&
    row.executable_realpath===NODE_EXE&&
    row.executable_root_owned_nonwritable===true&&
    row.cmdline.includes("--conditions=void-process-source-branch-main")&&
    row.cmdline.some(value=>value.endsWith("/src/index.ts"))
  );
  if(services.length!==1)throw new Error("selector_service_candidate_count_invalid");
  return Object.freeze({
    service_process_selection_mode:
      VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2,
    service_process_selector_contract_id:
      VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2,
    manager:Object.freeze({...manager,cmdline:Object.freeze([...manager.cmdline])}),
    service:Object.freeze({...services[0],cmdline:Object.freeze([...services[0].cmdline])}),
  });
}

export type BuyVoidSourceFinalityLiveProcessBindingMaterialV2=Readonly<{
  marker:typeof VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V2;
  version:2;
  deployment_receipt_id:string;
  service_process_selection_mode:
    typeof VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2;
  service_process_selector_contract_id:
    typeof VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2;
  manager_pid:number;
  manager_start_time_ticks:string;
  manager_cgroup_v2_path:string;
  manager_executable_realpath:typeof MANAGER_EXE;
  manager_cmdline_sha256:string;
  manager_pidfd_retained_during_collection:true;
  service_pidfd_retained_during_collection:true;
  process_source_identity_marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1";
  process_source_commit:string;
  process_source_tree:string;
  process_source_branch:"main";
  service_unit:typeof SERVICE_UNIT;
  runtime_uid:number;
  runtime_gid:number;
  main_pid:number;
  process_start_time_ticks:string;
  systemd_invocation_id:string;
  cgroup_v2_path:string;
  executable_realpath:typeof NODE_EXE;
  cwd_realpath:string;
  cmdline_sha256:string;
  node_options_sha256:string;
  canonical_producer_role:true;
  node_path_absent:true;
  ld_preload_absent:true;
  ld_library_path_absent:true;
  capabilities_zero:true;
  no_new_privileges:true;
  source_custody_proven:true;
  reviewed_service_contract_proven:true;
  reviewed_launcher_contract_proven:true;
}>;

export type BuyVoidSourceFinalityLiveProcessBindingReceiptV2=
  BuyVoidSourceFinalityLiveProcessBindingMaterialV2&
  Readonly<{receipt_id:string}>;

const MATERIAL_KEYS=Object.freeze([
  "marker","version","deployment_receipt_id",
  "service_process_selection_mode","service_process_selector_contract_id",
  "manager_pid","manager_start_time_ticks","manager_cgroup_v2_path",
  "manager_executable_realpath","manager_cmdline_sha256",
  "manager_pidfd_retained_during_collection","service_pidfd_retained_during_collection",
  "process_source_identity_marker","process_source_commit","process_source_tree",
  "process_source_branch","service_unit","runtime_uid","runtime_gid","main_pid",
  "process_start_time_ticks","systemd_invocation_id","cgroup_v2_path",
  "executable_realpath","cwd_realpath","cmdline_sha256","node_options_sha256",
  "canonical_producer_role","node_path_absent","ld_preload_absent",
  "ld_library_path_absent","capabilities_zero","no_new_privileges",
  "source_custody_proven","reviewed_service_contract_proven",
  "reviewed_launcher_contract_proven",
] as const);
const RECEIPT_KEYS=Object.freeze([...MATERIAL_KEYS,"receipt_id"] as const);

function validateMaterial(raw:unknown):BuyVoidSourceFinalityLiveProcessBindingMaterialV2{
  exactKeys(raw,MATERIAL_KEYS,"live_process_v2_material_shape_invalid");
  if(
    raw.marker!==VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V2||
    raw.version!==2||
    typeof raw.deployment_receipt_id!=="string"||!DEPLOYMENT.test(raw.deployment_receipt_id)||
    raw.service_process_selection_mode!==
      VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTION_MODE_V2||
    raw.service_process_selector_contract_id!==
      VOID_BUY_VOID_SOURCE_FINALITY_SERVICE_PROCESS_SELECTOR_CONTRACT_ID_V2||
    raw.manager_executable_realpath!==MANAGER_EXE||
    raw.executable_realpath!==NODE_EXE||
    raw.process_source_identity_marker!=="VOID_NODE_PROCESS_SOURCE_IDENTITY_V1"||
    typeof raw.process_source_commit!=="string"||!SHA40.test(raw.process_source_commit)||
    typeof raw.process_source_tree!=="string"||!SHA40.test(raw.process_source_tree)||
    raw.process_source_branch!=="main"||
    raw.service_unit!==SERVICE_UNIT||
    typeof raw.systemd_invocation_id!=="string"||!INVOCATION.test(raw.systemd_invocation_id)||
    raw.manager_pidfd_retained_during_collection!==true||
    raw.service_pidfd_retained_during_collection!==true||
    raw.canonical_producer_role!==true||
    raw.node_path_absent!==true||raw.ld_preload_absent!==true||
    raw.ld_library_path_absent!==true||raw.capabilities_zero!==true||
    raw.no_new_privileges!==true||raw.source_custody_proven!==true||
    raw.reviewed_service_contract_proven!==true||
    raw.reviewed_launcher_contract_proven!==true
  )throw new Error("live_process_v2_material_invalid");
  positive(raw.manager_pid,"live_process_v2_manager_pid_invalid");
  positive(raw.runtime_uid,"live_process_v2_runtime_uid_invalid");
  positive(raw.runtime_gid,"live_process_v2_runtime_gid_invalid");
  positive(raw.main_pid,"live_process_v2_main_pid_invalid");
  uint(raw.manager_start_time_ticks,"live_process_v2_manager_start_ticks_invalid");
  uint(raw.process_start_time_ticks,"live_process_v2_process_start_ticks_invalid");
  hash(raw.manager_cmdline_sha256,"live_process_v2_manager_cmdline_sha_invalid");
  hash(raw.cmdline_sha256,"live_process_v2_cmdline_sha_invalid");
  hash(raw.node_options_sha256,"live_process_v2_node_options_sha_invalid");
  absolute(raw.cwd_realpath,"live_process_v2_cwd_invalid");
  const uid=raw.runtime_uid as number;
  if(raw.manager_cgroup_v2_path!==exactManagerScope(uid)){
    throw new Error("live_process_v2_manager_cgroup_invalid");
  }
  if(raw.cgroup_v2_path!==exactServiceCgroup(uid)){
    throw new Error("live_process_v2_service_cgroup_invalid");
  }
  return Object.freeze(raw) as unknown as BuyVoidSourceFinalityLiveProcessBindingMaterialV2;
}

export function buyVoidSourceFinalityLiveProcessBindingReceiptIdV2(
  material:BuyVoidSourceFinalityLiveProcessBindingMaterialV2,
):string{
  return "voidbsflp2_"+sha256(canonical(validateMaterial(material)));
}

export function buildBuyVoidSourceFinalityLiveProcessBindingReceiptV2(
  material:BuyVoidSourceFinalityLiveProcessBindingMaterialV2,
):BuyVoidSourceFinalityLiveProcessBindingReceiptV2{
  const checked=validateMaterial(material);
  return Object.freeze({
    ...checked,
    receipt_id:buyVoidSourceFinalityLiveProcessBindingReceiptIdV2(checked),
  });
}

function validateReceipt(raw:unknown):BuyVoidSourceFinalityLiveProcessBindingReceiptV2{
  exactKeys(raw,RECEIPT_KEYS,"live_process_v2_receipt_shape_invalid");
  const material=Object.fromEntries(
    MATERIAL_KEYS.map(key=>[key,raw[key]]),
  ) as unknown as BuyVoidSourceFinalityLiveProcessBindingMaterialV2;
  const checked=validateMaterial(material);
  if(
    typeof raw.receipt_id!=="string"||!RECEIPT.test(raw.receipt_id)||
    raw.receipt_id!==buyVoidSourceFinalityLiveProcessBindingReceiptIdV2(checked)
  )throw new Error("live_process_v2_receipt_id_invalid");
  return Object.freeze({...checked,receipt_id:raw.receipt_id});
}

function procStat(pid:number):Readonly<{ppid:number;start_time_ticks:string}>{
  const raw=fs.readFileSync(`/proc/${pid}/stat`,"utf8");
  const close=raw.lastIndexOf(")");
  if(close<2)throw new Error("live_process_v2_proc_stat_invalid");
  const fields=raw.slice(close+1).trim().split(/\s+/u);
  const ppid=Number(fields[1]||"");
  const start=fields[19]||"";
  if(!Number.isSafeInteger(ppid)||ppid<=0||!UINT.test(start)){
    throw new Error("live_process_v2_proc_stat_fields_invalid");
  }
  return Object.freeze({ppid,start_time_ticks:start});
}
function procCgroup(pid:number):string{
  const raw=fs.readFileSync(`/proc/${pid}/cgroup`,"utf8");
  const rows=raw.trim().split(/\r?\n/u).filter(Boolean)
    .filter(row=>row.startsWith("0::"));
  if(rows.length!==1)throw new Error("live_process_v2_manager_cgroup_read_invalid");
  return rows[0].slice(3);
}
function procCmdlineSha(pid:number):string{
  const raw=fs.readFileSync(`/proc/${pid}/cmdline`);
  if(raw.length<2||raw.length>MAX_PROC_BYTES){
    throw new Error("live_process_v2_manager_cmdline_size_invalid");
  }
  return sha256(raw);
}

export type BuyVoidSourceFinalityLiveProcessBindingDecisionV2=
  | Readonly<{
      ok:false;
      marker:typeof VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V2;
      status:"HOLD";
      reason:string;
      same_live_process_binding_proven:false;
      production_source_finality_authority_ready:false;
      public_presale_activation:false;
      funds_movement:false;
    }>
  | Readonly<{
      ok:true;
      marker:typeof VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V2;
      status:"SAME_LIVE_PROCESS_BINDING_V2_VERIFIED_PRODUCTION_AUTHORITY_STILL_HOLD";
      receipt_id:string;
      deployment_receipt_id:string;
      service_process_selector_contract_id:string;
      manager_pid:number;
      manager_start_time_ticks:string;
      main_pid:number;
      process_start_time_ticks:string;
      selector_generation_verified:true;
      manager_generation_verified:true;
      direct_parent_binding_proven:true;
      self_identity_binding_proven:true;
      same_live_process_binding_proven:true;
      production_source_finality_authority_ready:false;
      public_presale_activation:false;
      funds_movement:false;
    }>;

function held(reason:string):BuyVoidSourceFinalityLiveProcessBindingDecisionV2{
  return Object.freeze({
    ok:false,
    marker:VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V2,
    status:"HOLD",
    reason,
    same_live_process_binding_proven:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  });
}

export function classifyBuyVoidSourceFinalityLiveProcessBindingV2(input:{
  receipt:unknown;
  self_identity:BuyVoidSourceFinalitySelfProcessIdentityV1;
  self_parent_pid:number;
  manager_start_time_ticks:string;
  manager_cgroup_v2_path:string;
  manager_cmdline_sha256:string;
  deployment_receipt_id:string;
}):BuyVoidSourceFinalityLiveProcessBindingDecisionV2{
  try{
    if(!DEPLOYMENT.test(input.deployment_receipt_id)){
      return held("live_process_v2_deployment_receipt_id_invalid");
    }
    const receipt=validateReceipt(input.receipt);
    if(receipt.deployment_receipt_id!==input.deployment_receipt_id){
      return held("live_process_v2_deployment_receipt_mismatch");
    }
    const self=input.self_identity;
    const pairs:ReadonlyArray<readonly [unknown,unknown,string]>=[
      [self.process_source_identity_marker,receipt.process_source_identity_marker,"source_marker"],
      [self.process_source_commit,receipt.process_source_commit,"source_commit"],
      [self.process_source_tree,receipt.process_source_tree,"source_tree"],
      [self.process_source_branch,receipt.process_source_branch,"source_branch"],
      [self.service_unit,receipt.service_unit,"service_unit"],
      [self.runtime_uid,receipt.runtime_uid,"runtime_uid"],
      [self.runtime_gid,receipt.runtime_gid,"runtime_gid"],
      [self.main_pid,receipt.main_pid,"main_pid"],
      [self.process_start_time_ticks,receipt.process_start_time_ticks,"start_ticks"],
      [self.systemd_invocation_id,receipt.systemd_invocation_id,"invocation_id"],
      [self.cgroup_v2_path,receipt.cgroup_v2_path,"cgroup"],
      [self.executable_realpath,receipt.executable_realpath,"executable"],
      [self.cwd_realpath,receipt.cwd_realpath,"cwd"],
      [self.cmdline_sha256,receipt.cmdline_sha256,"cmdline"],
      [self.node_options_sha256,receipt.node_options_sha256,"node_options"],
      [self.canonical_producer_role,receipt.canonical_producer_role,"producer_role"],
      [self.node_path_absent,receipt.node_path_absent,"node_path_absent"],
      [self.ld_preload_absent,receipt.ld_preload_absent,"ld_preload_absent"],
      [self.ld_library_path_absent,receipt.ld_library_path_absent,"ld_library_path_absent"],
      [self.capabilities_zero,receipt.capabilities_zero,"capabilities_zero"],
      [self.no_new_privileges,receipt.no_new_privileges,"no_new_privileges"],
    ];
    for(const [actual,expected,label] of pairs){
      if(actual!==expected)return held("live_process_v2_self_identity_mismatch:"+label);
    }
    if(input.self_parent_pid!==receipt.manager_pid){
      return held("live_process_v2_direct_parent_mismatch");
    }
    if(input.manager_start_time_ticks!==receipt.manager_start_time_ticks){
      return held("live_process_v2_manager_generation_mismatch");
    }
    if(input.manager_cgroup_v2_path!==receipt.manager_cgroup_v2_path){
      return held("live_process_v2_manager_cgroup_mismatch");
    }
    if(input.manager_cmdline_sha256!==receipt.manager_cmdline_sha256){
      return held("live_process_v2_manager_cmdline_mismatch");
    }
    return Object.freeze({
      ok:true,
      marker:VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V2,
      status:"SAME_LIVE_PROCESS_BINDING_V2_VERIFIED_PRODUCTION_AUTHORITY_STILL_HOLD",
      receipt_id:receipt.receipt_id,
      deployment_receipt_id:receipt.deployment_receipt_id,
      service_process_selector_contract_id:
        receipt.service_process_selector_contract_id,
      manager_pid:receipt.manager_pid,
      manager_start_time_ticks:receipt.manager_start_time_ticks,
      main_pid:receipt.main_pid,
      process_start_time_ticks:receipt.process_start_time_ticks,
      selector_generation_verified:true,
      manager_generation_verified:true,
      direct_parent_binding_proven:true,
      self_identity_binding_proven:true,
      same_live_process_binding_proven:true,
      production_source_finality_authority_ready:false,
      public_presale_activation:false,
      funds_movement:false,
    });
  }catch(error){
    return held(error instanceof Error?error.message:"live_process_v2_uncertain");
  }
}

function rootAncestors(file:string):void{
  let cursor=path.dirname(file);
  for(;;){
    const st=fs.lstatSync(cursor);
    if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==0||(st.mode&0o022)!==0){
      throw new Error("live_process_v2_receipt_ancestor_untrusted");
    }
    const next=path.dirname(cursor);
    if(next===cursor)break;
    cursor=next;
  }
}
function sameIdentity(a:fs.Stats,b:fs.Stats):boolean{
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode&&a.nlink===b.nlink&&a.size===b.size;
}
function readRootReceiptV2(receiptPath:string):BuyVoidSourceFinalityLiveProcessBindingReceiptV2{
  if(
    receiptPath!==VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V2||
    !path.isAbsolute(receiptPath)||path.resolve(receiptPath)!==receiptPath
  )throw new Error("live_process_v2_receipt_path_invalid");
  rootAncestors(receiptPath);
  const before=fs.lstatSync(receiptPath);
  if(
    !before.isFile()||before.isSymbolicLink()||before.uid!==0||before.gid!==0||
    (before.mode&0o777)!==0o444||before.nlink!==1||
    before.size<2||before.size>MAX_RECEIPT_BYTES
  )throw new Error("live_process_v2_receipt_custody_invalid");
  const fd=fs.openSync(receiptPath,fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0));
  try{
    const opened=fs.fstatSync(fd);
    if(!sameIdentity(before,opened))throw new Error("live_process_v2_receipt_open_identity_mismatch");
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd);
    const visible=fs.lstatSync(receiptPath);
    if(
      !sameIdentity(opened,after)||!sameIdentity(after,visible)||
      opened.mtimeMs!==after.mtimeMs||opened.ctimeMs!==after.ctimeMs||
      after.mtimeMs!==visible.mtimeMs||after.ctimeMs!==visible.ctimeMs||
      bytes.length!==after.size
    )throw new Error("live_process_v2_receipt_changed_during_read");
    const parsed=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
    const receipt=validateReceipt(parsed);
    if(JSON.stringify(receipt,null,2)+"\n"!==bytes.toString("utf8")){
      throw new Error("live_process_v2_receipt_wire_format_invalid");
    }
    return receipt;
  }finally{fs.closeSync(fd);}
}

export function verifyBuyVoidSourceFinalityLiveProcessBindingV2(input:{
  receipt_path:string;
  deployment_receipt_id:string;
}):BuyVoidSourceFinalityLiveProcessBindingDecisionV2{
  try{
    const before=readBuyVoidSourceFinalitySelfProcessIdentityV1();
    const selfStat=procStat(process.pid);
    const receipt=readRootReceiptV2(input.receipt_path);
    const managerStat=procStat(receipt.manager_pid);
    const managerCgroup=procCgroup(receipt.manager_pid);
    const managerCmdlineSha=procCmdlineSha(receipt.manager_pid);
    const after=readBuyVoidSourceFinalitySelfProcessIdentityV1();
    if(canonical(before)!==canonical(after)){
      return held("live_process_v2_self_identity_changed_during_verification");
    }
    const decision=classifyBuyVoidSourceFinalityLiveProcessBindingV2({
      receipt,
      self_identity:after,
      self_parent_pid:selfStat.ppid,
      manager_start_time_ticks:managerStat.start_time_ticks,
      manager_cgroup_v2_path:managerCgroup,
      manager_cmdline_sha256:managerCmdlineSha,
      deployment_receipt_id:input.deployment_receipt_id,
    });
    const managerAfter=procStat(receipt.manager_pid);
    if(
      managerAfter.start_time_ticks!==managerStat.start_time_ticks||
      managerAfter.ppid!==managerStat.ppid
    ){
      return held("live_process_v2_manager_identity_changed_during_verification");
    }
    return decision;
  }catch(error){
    return held(error instanceof Error?error.message:"live_process_v2_verification_uncertain");
  }
}
