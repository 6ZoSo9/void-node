import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V1 =
  "VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V1";
export const VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V1 =
  "VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V1";
export const VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V1 =
  "/var/lib/void-source-finality-v7/live-process-binding-v1.json";

export const VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_AUTHORITY_V1 =
  Object.freeze({
    source_only_gate: true,
    root_custodied_receipt_required: true,
    deployment_receipt_binding_required: true,
    self_pid_binding_required: true,
    self_start_time_binding_required: true,
    systemd_invocation_binding_required: true,
    service_cgroup_binding_required: true,
    initial_process_environment_binding_required: true,
    process_cmdline_binding_required: true,
    executable_binding_required: true,
    cwd_binding_required: true,
    canonical_producer_role_required: true,
    source_custody_receipt_claim_required: true,
    reviewed_service_contract_receipt_claim_required: true,
    reviewed_launcher_contract_receipt_claim_required: true,
    zero_process_capabilities_required: true,
    no_new_privileges_required: true,
    host_mutation: false,
    service_mutation: false,
    credential_access: false,
    wallet_or_signer_access: false,
    transaction_signing: false,
    transaction_broadcast: false,
    rpc_call: false,
    production_source_finality_authority_ready: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const RECEIPT_ID=/^voidbsflp1_[0-9a-f]{64}$/u;
const DEPLOYMENT_RECEIPT_ID=/^voidbsfdep1_[0-9a-f]{64}$/u;
const HEX40=/^[0-9a-f]{40}$/u;
const HASH64=/^[0-9a-f]{64}$/u;
const INVOCATION_ID=/^[0-9a-f]{32}$/u;
const UINT=/^(?:0|[1-9][0-9]*)$/u;
const MAX_RECEIPT_BYTES=64*1024;
const MAX_CMDLINE_BYTES=128*1024;
const MAX_ENVIRON_BYTES=1024*1024;
const SERVICE_UNIT="void-node-live.service";
const PROCESS_SOURCE_MARKER="VOID_NODE_PROCESS_SOURCE_IDENTITY_V1";

const MATERIAL_KEYS=Object.freeze([
  "marker",
  "version",
  "deployment_receipt_id",
  "process_source_identity_marker",
  "process_source_commit",
  "process_source_tree",
  "process_source_branch",
  "service_unit",
  "runtime_uid",
  "runtime_gid",
  "main_pid",
  "process_start_time_ticks",
  "systemd_invocation_id",
  "cgroup_v2_path",
  "executable_realpath",
  "cwd_realpath",
  "cmdline_sha256",
  "node_options_sha256",
  "canonical_producer_role",
  "node_path_absent",
  "ld_preload_absent",
  "ld_library_path_absent",
  "capabilities_zero",
  "no_new_privileges",
  "source_custody_proven",
  "reviewed_service_contract_proven",
  "reviewed_launcher_contract_proven",
] as const);

const RECEIPT_KEYS=Object.freeze([...MATERIAL_KEYS,"receipt_id"] as const);

const SELF_KEYS=Object.freeze([
  "process_source_identity_marker",
  "process_source_commit",
  "process_source_tree",
  "process_source_branch",
  "service_unit",
  "runtime_uid",
  "runtime_gid",
  "main_pid",
  "process_start_time_ticks",
  "systemd_invocation_id",
  "cgroup_v2_path",
  "executable_realpath",
  "cwd_realpath",
  "cmdline_sha256",
  "node_options_sha256",
  "canonical_producer_role",
  "node_path_absent",
  "ld_preload_absent",
  "ld_library_path_absent",
  "capabilities_zero",
  "no_new_privileges",
] as const);

type JsonObject=Record<string,unknown>;

export type BuyVoidSourceFinalityLiveProcessBindingMaterialV1={
  readonly marker:typeof VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V1;
  readonly version:1;
  readonly deployment_receipt_id:string;
  readonly process_source_identity_marker:string;
  readonly process_source_commit:string;
  readonly process_source_tree:string;
  readonly process_source_branch:"main";
  readonly service_unit:typeof SERVICE_UNIT;
  readonly runtime_uid:number;
  readonly runtime_gid:number;
  readonly main_pid:number;
  readonly process_start_time_ticks:string;
  readonly systemd_invocation_id:string;
  readonly cgroup_v2_path:string;
  readonly executable_realpath:string;
  readonly cwd_realpath:string;
  readonly cmdline_sha256:string;
  readonly node_options_sha256:string;
  readonly canonical_producer_role:true;
  readonly node_path_absent:true;
  readonly ld_preload_absent:true;
  readonly ld_library_path_absent:true;
  readonly capabilities_zero:true;
  readonly no_new_privileges:true;
  readonly source_custody_proven:true;
  readonly reviewed_service_contract_proven:true;
  readonly reviewed_launcher_contract_proven:true;
};

export type BuyVoidSourceFinalityLiveProcessBindingReceiptV1=
  BuyVoidSourceFinalityLiveProcessBindingMaterialV1 & {
    readonly receipt_id:string;
  };

export type BuyVoidSourceFinalitySelfProcessIdentityV1={
  readonly process_source_identity_marker:string;
  readonly process_source_commit:string;
  readonly process_source_tree:string;
  readonly process_source_branch:"main";
  readonly service_unit:typeof SERVICE_UNIT;
  readonly runtime_uid:number;
  readonly runtime_gid:number;
  readonly main_pid:number;
  readonly process_start_time_ticks:string;
  readonly systemd_invocation_id:string;
  readonly cgroup_v2_path:string;
  readonly executable_realpath:string;
  readonly cwd_realpath:string;
  readonly cmdline_sha256:string;
  readonly node_options_sha256:string;
  readonly canonical_producer_role:true;
  readonly node_path_absent:true;
  readonly ld_preload_absent:true;
  readonly ld_library_path_absent:true;
  readonly capabilities_zero:true;
  readonly no_new_privileges:true;
};

export type BuyVoidSourceFinalityLiveProcessBindingHeldV1={
  readonly ok:false;
  readonly marker:typeof VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V1;
  readonly status:"HOLD";
  readonly reason:string;
  readonly same_live_process_binding_proven:false;
  readonly production_source_finality_authority_ready:false;
  readonly public_presale_activation:false;
  readonly funds_movement:false;
};

export type BuyVoidSourceFinalityLiveProcessBindingReadyV1={
  readonly ok:true;
  readonly marker:typeof VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V1;
  readonly status:"SAME_LIVE_PROCESS_BINDING_VERIFIED_PRODUCTION_AUTHORITY_STILL_HOLD";
  readonly receipt_id:string;
  readonly deployment_receipt_id:string;
  readonly process_source_commit:string;
  readonly process_source_tree:string;
  readonly systemd_invocation_id:string;
  readonly main_pid:number;
  readonly process_start_time_ticks:string;
  readonly root_receipt_custody_proven:true;
  readonly deployment_receipt_binding_proven:true;
  readonly self_pid_start_time_binding_proven:true;
  readonly systemd_invocation_binding_proven:true;
  readonly service_cgroup_binding_proven:true;
  readonly initial_process_environment_binding_proven:true;
  readonly process_cmdline_binding_proven:true;
  readonly source_custody_receipt_claim_bound:true;
  readonly reviewed_service_contract_receipt_claim_bound:true;
  readonly reviewed_launcher_contract_receipt_claim_bound:true;
  readonly same_live_process_binding_proven:true;
  readonly production_source_finality_authority_ready:false;
  readonly public_presale_activation:false;
  readonly funds_movement:false;
};

export type BuyVoidSourceFinalityLiveProcessBindingDecisionV1=
  | BuyVoidSourceFinalityLiveProcessBindingHeldV1
  | BuyVoidSourceFinalityLiveProcessBindingReadyV1;

function held(reason:string):BuyVoidSourceFinalityLiveProcessBindingHeldV1{
  return Object.freeze({
    ok:false,
    marker:VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V1,
    status:"HOLD",
    reason,
    same_live_process_binding_proven:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  });
}

function sha256(bytes:Buffer|string):string{
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function plainDataObject(
  value:unknown,
  expectedKeys:readonly string[],
  code:string,
):JsonObject{
  if(value===null||typeof value!=="object"||Array.isArray(value))throw new Error(code);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)throw new Error(code);
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const keys=Reflect.ownKeys(descriptors);
  if(keys.some(key=>typeof key!=="string"))throw new Error(code);
  const actual=(keys as string[]).sort();
  const expected=[...expectedKeys].sort();
  if(
    actual.length!==expected.length||
    actual.some((key,index)=>key!==expected[index])
  )throw new Error(code);
  const out:Object=Object.create(null);
  for(const key of expectedKeys){
    const descriptor=descriptors[key];
    if(
      !descriptor||
      descriptor.enumerable!==true||
      !Object.hasOwn(descriptor,"value")
    )throw new Error(code);
    (out as JsonObject)[key]=descriptor.value;
  }
  return out as JsonObject;
}

function canonicalJson(value:unknown):string{
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonicalJson).join(",")+"]";
  if(value&&typeof value==="object"){
    const proto=Object.getPrototypeOf(value);
    if(proto!==Object.prototype&&proto!==null)throw new Error("live_process_binding_canonical_value_invalid");
    const descriptors=Object.getOwnPropertyDescriptors(value);
    const keys=Reflect.ownKeys(descriptors);
    if(keys.some(key=>typeof key!=="string"))throw new Error("live_process_binding_canonical_value_invalid");
    const body:string[]=[];
    for(const key of (keys as string[]).sort()){
      const d=descriptors[key];
      if(!d||d.enumerable!==true||!Object.hasOwn(d,"value")){
        throw new Error("live_process_binding_canonical_value_invalid");
      }
      body.push(JSON.stringify(key)+":"+canonicalJson(d.value));
    }
    return "{"+body.join(",")+"}";
  }
  throw new Error("live_process_binding_canonical_value_invalid");
}

function asPositiveSafeInt(value:unknown,code:string):number{
  if(
    typeof value!=="number"||
    !Number.isSafeInteger(value)||
    value<=0
  )throw new Error(code);
  return value;
}

function asAbsolutePath(value:unknown,code:string):string{
  if(
    typeof value!=="string"||
    !path.isAbsolute(value)||
    value.includes("\0")||
    path.resolve(value)!==value
  )throw new Error(code);
  return value;
}

function validateMaterial(
  raw:unknown,
):BuyVoidSourceFinalityLiveProcessBindingMaterialV1{
  const v=plainDataObject(raw,MATERIAL_KEYS,"live_process_binding_receipt_material_shape_invalid");
  if(
    v.marker!==VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V1||
    v.version!==1||
    typeof v.deployment_receipt_id!=="string"||
    !DEPLOYMENT_RECEIPT_ID.test(v.deployment_receipt_id)||
    v.process_source_identity_marker!==PROCESS_SOURCE_MARKER||
    typeof v.process_source_commit!=="string"||
    !HEX40.test(v.process_source_commit)||
    typeof v.process_source_tree!=="string"||
    !HEX40.test(v.process_source_tree)||
    v.process_source_branch!=="main"||
    v.service_unit!==SERVICE_UNIT||
    typeof v.process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(v.process_start_time_ticks)||
    typeof v.systemd_invocation_id!=="string"||
    !INVOCATION_ID.test(v.systemd_invocation_id)||
    typeof v.cgroup_v2_path!=="string"||
    !v.cgroup_v2_path.startsWith("/")||
    v.cgroup_v2_path.includes("\0")||
    path.posix.basename(v.cgroup_v2_path)!==SERVICE_UNIT||
    typeof v.cmdline_sha256!=="string"||
    !HASH64.test(v.cmdline_sha256)||
    typeof v.node_options_sha256!=="string"||
    !HASH64.test(v.node_options_sha256)||
    v.canonical_producer_role!==true||
    v.node_path_absent!==true||
    v.ld_preload_absent!==true||
    v.ld_library_path_absent!==true||
    v.capabilities_zero!==true||
    v.no_new_privileges!==true||
    v.source_custody_proven!==true||
    v.reviewed_service_contract_proven!==true||
    v.reviewed_launcher_contract_proven!==true
  )throw new Error("live_process_binding_receipt_material_invalid");
  asPositiveSafeInt(v.runtime_uid,"live_process_binding_runtime_uid_invalid");
  asPositiveSafeInt(v.runtime_gid,"live_process_binding_runtime_gid_invalid");
  asPositiveSafeInt(v.main_pid,"live_process_binding_main_pid_invalid");
  asAbsolutePath(v.executable_realpath,"live_process_binding_executable_invalid");
  asAbsolutePath(v.cwd_realpath,"live_process_binding_cwd_invalid");
  return Object.freeze(v) as unknown as BuyVoidSourceFinalityLiveProcessBindingMaterialV1;
}

export function buyVoidSourceFinalityLiveProcessBindingReceiptIdV1(
  material:BuyVoidSourceFinalityLiveProcessBindingMaterialV1,
):string{
  const checked=validateMaterial(material);
  return "voidbsflp1_"+sha256(Buffer.from(canonicalJson(checked),"utf8"));
}

function validateReceipt(
  raw:unknown,
):BuyVoidSourceFinalityLiveProcessBindingReceiptV1{
  const v=plainDataObject(raw,RECEIPT_KEYS,"live_process_binding_receipt_shape_invalid");
  const materialRaw:Object=Object.create(null);
  for(const key of MATERIAL_KEYS)(materialRaw as JsonObject)[key]=v[key];
  const material=validateMaterial(materialRaw);
  if(
    typeof v.receipt_id!=="string"||
    !RECEIPT_ID.test(v.receipt_id)||
    v.receipt_id!==buyVoidSourceFinalityLiveProcessBindingReceiptIdV1(material)
  )throw new Error("live_process_binding_receipt_id_invalid");
  return Object.freeze({...material,receipt_id:v.receipt_id}) as BuyVoidSourceFinalityLiveProcessBindingReceiptV1;
}

function validateSelfIdentity(
  raw:unknown,
):BuyVoidSourceFinalitySelfProcessIdentityV1{
  const v=plainDataObject(raw,SELF_KEYS,"live_process_binding_self_identity_shape_invalid");
  if(
    v.process_source_identity_marker!==PROCESS_SOURCE_MARKER||
    typeof v.process_source_commit!=="string"||
    !HEX40.test(v.process_source_commit)||
    typeof v.process_source_tree!=="string"||
    !HEX40.test(v.process_source_tree)||
    v.process_source_branch!=="main"||
    v.service_unit!==SERVICE_UNIT||
    typeof v.process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(v.process_start_time_ticks)||
    typeof v.systemd_invocation_id!=="string"||
    !INVOCATION_ID.test(v.systemd_invocation_id)||
    typeof v.cgroup_v2_path!=="string"||
    !v.cgroup_v2_path.startsWith("/")||
    path.posix.basename(v.cgroup_v2_path)!==SERVICE_UNIT||
    typeof v.cmdline_sha256!=="string"||
    !HASH64.test(v.cmdline_sha256)||
    typeof v.node_options_sha256!=="string"||
    !HASH64.test(v.node_options_sha256)||
    v.canonical_producer_role!==true||
    v.node_path_absent!==true||
    v.ld_preload_absent!==true||
    v.ld_library_path_absent!==true||
    v.capabilities_zero!==true||
    v.no_new_privileges!==true
  )throw new Error("live_process_binding_self_identity_invalid");
  asPositiveSafeInt(v.runtime_uid,"live_process_binding_self_runtime_uid_invalid");
  asPositiveSafeInt(v.runtime_gid,"live_process_binding_self_runtime_gid_invalid");
  asPositiveSafeInt(v.main_pid,"live_process_binding_self_main_pid_invalid");
  asAbsolutePath(v.executable_realpath,"live_process_binding_self_executable_invalid");
  asAbsolutePath(v.cwd_realpath,"live_process_binding_self_cwd_invalid");
  return Object.freeze(v) as unknown as BuyVoidSourceFinalitySelfProcessIdentityV1;
}

export function classifyBuyVoidSourceFinalityLiveProcessBindingV1(input:{
  receipt:unknown;
  self_identity:unknown;
  deployment_receipt_id:string;
}):BuyVoidSourceFinalityLiveProcessBindingDecisionV1{
  try{
    if(!DEPLOYMENT_RECEIPT_ID.test(String(input.deployment_receipt_id??""))){
      return held("deployment_receipt_id_invalid");
    }
    const receipt=validateReceipt(input.receipt);
    const self=validateSelfIdentity(input.self_identity);
    if(receipt.deployment_receipt_id!==input.deployment_receipt_id){
      return held("deployment_receipt_id_mismatch");
    }
    const pairs:readonly [keyof BuyVoidSourceFinalitySelfProcessIdentityV1,unknown][]=[
      ["process_source_identity_marker",receipt.process_source_identity_marker],
      ["process_source_commit",receipt.process_source_commit],
      ["process_source_tree",receipt.process_source_tree],
      ["process_source_branch",receipt.process_source_branch],
      ["service_unit",receipt.service_unit],
      ["runtime_uid",receipt.runtime_uid],
      ["runtime_gid",receipt.runtime_gid],
      ["main_pid",receipt.main_pid],
      ["process_start_time_ticks",receipt.process_start_time_ticks],
      ["systemd_invocation_id",receipt.systemd_invocation_id],
      ["cgroup_v2_path",receipt.cgroup_v2_path],
      ["executable_realpath",receipt.executable_realpath],
      ["cwd_realpath",receipt.cwd_realpath],
      ["cmdline_sha256",receipt.cmdline_sha256],
      ["node_options_sha256",receipt.node_options_sha256],
      ["canonical_producer_role",receipt.canonical_producer_role],
      ["node_path_absent",receipt.node_path_absent],
      ["ld_preload_absent",receipt.ld_preload_absent],
      ["ld_library_path_absent",receipt.ld_library_path_absent],
      ["capabilities_zero",receipt.capabilities_zero],
      ["no_new_privileges",receipt.no_new_privileges],
    ];
    for(const [key,expected] of pairs){
      if(self[key]!==expected)return held("self_process_identity_mismatch:"+String(key));
    }
    return Object.freeze({
      ok:true,
      marker:VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V1,
      status:"SAME_LIVE_PROCESS_BINDING_VERIFIED_PRODUCTION_AUTHORITY_STILL_HOLD",
      receipt_id:receipt.receipt_id,
      deployment_receipt_id:receipt.deployment_receipt_id,
      process_source_commit:receipt.process_source_commit,
      process_source_tree:receipt.process_source_tree,
      systemd_invocation_id:receipt.systemd_invocation_id,
      main_pid:receipt.main_pid,
      process_start_time_ticks:receipt.process_start_time_ticks,
      root_receipt_custody_proven:true,
      deployment_receipt_binding_proven:true,
      self_pid_start_time_binding_proven:true,
      systemd_invocation_binding_proven:true,
      service_cgroup_binding_proven:true,
      initial_process_environment_binding_proven:true,
      process_cmdline_binding_proven:true,
      source_custody_receipt_claim_bound:true,
      reviewed_service_contract_receipt_claim_bound:true,
      reviewed_launcher_contract_receipt_claim_bound:true,
      same_live_process_binding_proven:true,
      production_source_finality_authority_ready:false,
      public_presale_activation:false,
      funds_movement:false,
    });
  }catch(error){
    return held(
      error instanceof Error&&error.message
        ? error.message
        : "live_process_binding_uncertain",
    );
  }
}

function parseProcStatStartTicks(text:string):string{
  const close=text.lastIndexOf(") ");
  if(close<=0)throw new Error("self_proc_stat_invalid");
  const fields=text.slice(close+2).trim().split(/\s+/u);
  const start=fields[19];
  if(fields.length<20||!start||!/^[1-9][0-9]*$/u.test(start)){
    throw new Error("self_proc_start_time_invalid");
  }
  return start;
}

function parseInitialEnvironment(bytes:Buffer):Map<string,string>{
  if(bytes.length<1||bytes.length>MAX_ENVIRON_BYTES){
    throw new Error("self_proc_environ_size_invalid");
  }
  const out=new Map<string,string>();
  for(const raw of bytes.toString("utf8").split("\0")){
    if(raw==="")continue;
    const index=raw.indexOf("=");
    if(index<=0)throw new Error("self_proc_environ_entry_invalid");
    const key=raw.slice(0,index);
    const value=raw.slice(index+1);
    if(!/^[A-Z0-9_]{1,128}$/u.test(key)){
      continue;
    }
    if(out.has(key))throw new Error("self_proc_environ_duplicate_key");
    out.set(key,value);
  }
  return out;
}

function parseCapabilitiesAndNnp(status:string):{
  capabilities_zero:true;
  no_new_privileges:true;
}{
  for(const key of ["CapInh","CapPrm","CapEff","CapAmb"]){
    const match=new RegExp("^"+key+":\\s*([0-9A-Fa-f]+)\\s*$","mu").exec(status);
    if(!match||BigInt("0x"+match[1])!==0n){
      throw new Error("self_process_capability_state_invalid");
    }
  }
  const nnp=/^NoNewPrivs:\s*1\s*$/mu.exec(status);
  if(!nnp)throw new Error("self_process_no_new_privileges_missing");
  return {capabilities_zero:true,no_new_privileges:true};
}

function parseCgroupV2(text:string):string{
  const lines=text.trim().split(/\r?\n/u).filter(Boolean);
  const unified=lines.filter(line=>line.startsWith("0::"));
  if(unified.length!==1)throw new Error("self_cgroup_v2_identity_invalid");
  const value=unified[0].slice(3);
  if(
    !value.startsWith("/")||
    value.includes("\0")||
    path.posix.basename(value)!==SERVICE_UNIT
  )throw new Error("self_cgroup_service_unit_mismatch");
  return value;
}

export function readBuyVoidSourceFinalitySelfProcessIdentityV1():
  BuyVoidSourceFinalitySelfProcessIdentityV1{
  if(process.platform!=="linux")throw new Error("self_process_linux_required");
  if(
    typeof process.getuid!=="function"||
    typeof process.getgid!=="function"||
    typeof process.geteuid!=="function"||
    typeof process.getegid!=="function"
  )throw new Error("self_process_posix_identity_required");
  const uid=process.getuid();
  const gid=process.getgid();
  if(
    uid<=0||
    gid<=0||
    process.geteuid()!==uid||
    process.getegid()!==gid
  )throw new Error("self_process_unprivileged_identity_required");

  const stat=fs.readFileSync("/proc/self/stat","utf8");
  const status=fs.readFileSync("/proc/self/status","utf8");
  const cmdline=fs.readFileSync("/proc/self/cmdline");
  if(cmdline.length<2||cmdline.length>MAX_CMDLINE_BYTES){
    throw new Error("self_proc_cmdline_size_invalid");
  }
  const env=parseInitialEnvironment(fs.readFileSync("/proc/self/environ"));
  const requiredEnv=(key:string):string=>{
    const value=env.get(key);
    if(value===undefined||value==="")throw new Error("self_process_environment_missing:"+key);
    return value;
  };
  for(const key of ["NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH"]){
    if(env.has(key))throw new Error("self_process_unreviewed_loader_environment:"+key);
  }
  const sourceMarker=requiredEnv("VOID_PROCESS_SOURCE_IDENTITY_MARKER");
  const sourceCommit=requiredEnv("VOID_PROCESS_SOURCE_COMMIT");
  const sourceTree=requiredEnv("VOID_PROCESS_SOURCE_TREE");
  const sourceBranch=requiredEnv("VOID_PROCESS_SOURCE_BRANCH");
  const invocationId=requiredEnv("INVOCATION_ID");
  const canonicalRole=requiredEnv("VOID_CANONICAL_PRODUCER_ROLE");
  const nodeOptions=requiredEnv("NODE_OPTIONS");
  if(
    sourceMarker!==PROCESS_SOURCE_MARKER||
    !HEX40.test(sourceCommit)||
    !HEX40.test(sourceTree)||
    sourceBranch!=="main"||
    !INVOCATION_ID.test(invocationId)||
    canonicalRole!=="1"
  )throw new Error("self_process_environment_identity_invalid");

  const caps=parseCapabilitiesAndNnp(status);
  return validateSelfIdentity({
    process_source_identity_marker:sourceMarker,
    process_source_commit:sourceCommit,
    process_source_tree:sourceTree,
    process_source_branch:"main",
    service_unit:SERVICE_UNIT,
    runtime_uid:uid,
    runtime_gid:gid,
    main_pid:process.pid,
    process_start_time_ticks:parseProcStatStartTicks(stat),
    systemd_invocation_id:invocationId,
    cgroup_v2_path:parseCgroupV2(
      fs.readFileSync("/proc/self/cgroup","utf8"),
    ),
    executable_realpath:fs.realpathSync.native("/proc/self/exe"),
    cwd_realpath:fs.realpathSync.native("/proc/self/cwd"),
    cmdline_sha256:sha256(cmdline),
    node_options_sha256:sha256(Buffer.from(nodeOptions,"utf8")),
    canonical_producer_role:true,
    node_path_absent:true,
    ld_preload_absent:true,
    ld_library_path_absent:true,
    capabilities_zero:caps.capabilities_zero,
    no_new_privileges:caps.no_new_privileges,
  });
}

function sameFileIdentity(a:fs.Stats,b:fs.Stats):boolean{
  return (
    a.dev===b.dev&&
    a.ino===b.ino&&
    a.uid===b.uid&&
    a.gid===b.gid&&
    a.mode===b.mode&&
    a.nlink===b.nlink&&
    a.size===b.size
  );
}

function assertRootOwnedAncestors(file:string):void{
  let current=path.dirname(file);
  const chain:string[]=[];
  while(true){
    chain.push(current);
    const parent=path.dirname(current);
    if(parent===current)break;
    current=parent;
  }
  for(const location of chain.reverse()){
    const st=fs.lstatSync(location);
    if(
      st.isSymbolicLink()||
      !st.isDirectory()||
      st.uid!==0||
      (st.mode&0o022)!==0
    )throw new Error("live_process_binding_receipt_ancestor_untrusted");
  }
}

function readRootCustodiedReceipt(
  receiptPath:string,
):BuyVoidSourceFinalityLiveProcessBindingReceiptV1{
  if(
    receiptPath!==VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V1||
    !path.isAbsolute(receiptPath)||
    path.resolve(receiptPath)!==receiptPath
  )throw new Error("live_process_binding_receipt_path_invalid");
  assertRootOwnedAncestors(receiptPath);
  const before=fs.lstatSync(receiptPath);
  if(
    before.isSymbolicLink()||
    !before.isFile()||
    before.uid!==0||
    before.gid!==0||
    (before.mode&0o777)!==0o444||
    before.nlink!==1||
    before.size<2||
    before.size>MAX_RECEIPT_BYTES||
    fs.realpathSync.native(receiptPath)!==receiptPath
  )throw new Error("live_process_binding_receipt_custody_invalid");
  const fd=fs.openSync(
    receiptPath,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const opened=fs.fstatSync(fd);
    if(!sameFileIdentity(before,opened)){
      throw new Error("live_process_binding_receipt_open_identity_mismatch");
    }
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd);
    const visible=fs.lstatSync(receiptPath);
    if(
      !sameFileIdentity(opened,after)||
      !sameFileIdentity(after,visible)||
      opened.mtimeMs!==after.mtimeMs||
      opened.ctimeMs!==after.ctimeMs||
      after.mtimeMs!==visible.mtimeMs||
      after.ctimeMs!==visible.ctimeMs||
      bytes.length!==after.size
    )throw new Error("live_process_binding_receipt_changed_during_read");
    return validateReceipt(JSON.parse(bytes.toString("utf8")));
  }finally{
    fs.closeSync(fd);
  }
}

export function verifyBuyVoidSourceFinalityLiveProcessBindingV1(input:{
  receipt_path:string;
  deployment_receipt_id:string;
}):BuyVoidSourceFinalityLiveProcessBindingDecisionV1{
  try{
    const before=readBuyVoidSourceFinalitySelfProcessIdentityV1();
    const receipt=readRootCustodiedReceipt(input.receipt_path);
    const after=readBuyVoidSourceFinalitySelfProcessIdentityV1();
    if(canonicalJson(before)!==canonicalJson(after)){
      return held("self_process_identity_changed_during_verification");
    }
    return classifyBuyVoidSourceFinalityLiveProcessBindingV1({
      receipt,
      self_identity:after,
      deployment_receipt_id:input.deployment_receipt_id,
    });
  }catch(error){
    return held(
      error instanceof Error&&error.message
        ? error.message
        : "live_process_binding_verification_uncertain",
    );
  }
}
