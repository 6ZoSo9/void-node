#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  withBuyVoidFilesystemBakeryLockV1,
} from "../dist/economic/buy_void_filesystem_bakery_lock_v1.js";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_TRANSPORT_ENVELOPE_V1,
  buildVoidBuyVoidLegacyHistoryNimoServerResponseV1,
  classifyVoidBuyVoidLegacyHistoryNimoServerRequestV1,
  testOnlyClassifyVoidBuyVoidLegacyHistoryNimoServerRequestAgainstFingerprintV1,
} from "./void-buy-legacy-request-history-nimo-transport-envelope-v1.mjs";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_PATH_V1,
  inspectVoidBuyVoidLegacyHistoryExternalWitnessV1,
} from "./void-buy-legacy-request-history-external-witness-v1.mjs";
import {
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
} from "../dist/economic/buy_void_allocation_custody_witness_transport_v1.js";

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_V1 =
  "VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_V1";

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_AUTHORITY_V1 =
  Object.freeze({
    source_handler: true,
    forced_command_boundary: true,
    empty_original_command_required: true,
    fixed_config_path_required: true,
    root_owned_nonwritable_config_ancestry_required: true,
    root_owned_read_only_config_required: true,
    fixed_authority_root_required: true,
    authority_root_mode_0700_required: true,
    witness_mode_0600_single_link_required: true,
    intent_mode_0600_single_link_required: true,
    nofollow_config_and_witness_open: true,
    descriptor_pinned_authority_root: true,
    shared_cross_process_lock: true,
    server_replans_signed_authorization: true,
    compare_and_swap_required: true,
    durable_append_intent: true,
    torn_append_recovery: true,
    exact_post_crash_idempotence: true,
    witness_fsync: true,
    authority_directory_fsync: true,
    post_mutation_path_rebind: true,
    fixed_nimo_host_identity_required: true,
    arbitrary_append_bytes_from_client: false,
    caller_selected_path: false,
    caller_selected_command: false,
    shell_access: false,
    generic_write_primitive: false,
    generic_delete_primitive: false,
    generic_rename_primitive: false,
    service_control_primitive: false,
    live_nimo_installed: false,
    live_handler_execution_performed: false,
    live_remote_read_performed: false,
    live_remote_append_performed: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    external_witness_verified: false,
    historical_request_history_disposition_accepted: false,
    stable_root_apply_authorized: false,
    private_key_access: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
  });

export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_CONFIG_PATH_V1 =
  "/etc/void/buy-void-legacy-history-external-witness-v1.json";
export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_AUTHORITY_ROOT_V1 =
  "/var/lib/void-legacy-history-external-witness-v1";
export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_WITNESS_NAME_V1 =
  "legacy-history-sovereign-authorization-v1.jsonl";
export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INTENT_NAME_V1 =
  "legacy-history-sovereign-authorization-append-intent-v1.json";
export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_LOCK_NAME_V1 =
  ".legacy-history-sovereign-authorization-v1";
export const VOID_BUY_VOID_LEGACY_HISTORY_NIMO_HANDLER_PATH_V1 =
  "/usr/local/libexec/void-legacy-history-witness-v1/void/void-buy-legacy-request-history-nimo-forced-command-v1.mjs";

const CONFIG_SCHEMA="void_buy_void_legacy_history_nimo_forced_command_config_v1";
const CONFIG_MARKER="VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_CONFIG_V1";
const INTENT_SCHEMA="void_buy_void_legacy_history_nimo_append_intent_v1";
const INTENT_MARKER="VOID_BUY_VOID_LEGACY_HISTORY_NIMO_APPEND_INTENT_V1";
const ENV_MARKER="VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_V1";
const EXPECTED_NIMO=Object.freeze({
  witness_hostname:"Nimo",
  witness_machine_id_sha256:
    "sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4",
  witness_root_disk_serial:"50026B76873B25AB",
  witness_root_disk_wwn:"eui.00000000000000000026b76873b25ab5",
});
const WITNESS_PATH=
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_AUTHORITY_ROOT_V1+"/"+
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_WITNESS_NAME_V1;
const MAX_CONFIG_BYTES=256*1024;
const MAX_REQUEST_BYTES=256*1024;
const MAX_WITNESS_BYTES=4*1024*1024;
const MAX_INTENT_BYTES=1024*1024;
const O_NOFOLLOW=fs.constants.O_NOFOLLOW;
const O_DIRECTORY=fs.constants.O_DIRECTORY;
const SHA256_ID=/^sha256:[0-9a-f]{64}$/u;
const SAFE_TEXT=/^[A-Za-z0-9._:@/+~-]{1,300}$/u;

function fail(code){throw new Error(code);}
function exactObject(value,keys,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const got=Object.keys(value).sort(),want=[...keys].sort();
  if(got.length!==want.length||got.some((x,i)=>x!==want[i]))fail(code);
  return value;
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value).replace(/[\u007f-\uffff]/g,
    ch=>"\\u"+ch.charCodeAt(0).toString(16).padStart(4,"0"));
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort()
      .map(key=>canonical(key)+":"+canonical(value[key])).join(",")+"}";
  }
  fail("legacy_history_nimo_forced_command_noncanonical_value");
}
function canonicalBytes(value){return Buffer.from(canonical(value),"utf8");}
function sha256Id(value){
  return "sha256:"+crypto.createHash("sha256").update(value).digest("hex");
}
function sameIdentity(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode&&a.nlink===b.nlink;
}
function sameFile(a,b){
  return sameIdentity(a,b)&&a.size===b.size&&a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs;
}
function validateRootOwnedAncestor(st,code){
  if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==0n||
     (Number(st.mode)&0o022)!==0)fail(code);
}
function validateRootOwnedConfig(st){
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==0n||st.gid!==0n||
     st.nlink!==1n||(Number(st.mode)&0o777)!==0o444||
     st.size<2n||st.size>BigInt(MAX_CONFIG_BYTES)){
    fail("legacy_history_nimo_forced_command_config_custody_invalid");
  }
}
function validatePrivateDirectory(st,code){
  const uid=BigInt(process.getuid());
  if(!st.isDirectory()||st.isSymbolicLink()||st.uid!==uid||
     (Number(st.mode)&0o777)!==0o700)fail(code);
}
function validatePrivateFile(st,maxBytes,allowEmpty,code){
  const uid=BigInt(process.getuid());
  if(!st.isFile()||st.isSymbolicLink()||st.uid!==uid||st.nlink!==1n||
     (Number(st.mode)&0o777)!==0o600||
     st.size<BigInt(allowEmpty?0:1)||st.size>BigInt(maxBytes))fail(code);
}
function readFd(fd,size,maxBytes,allowEmpty,code){
  if(size>BigInt(maxBytes)||size<BigInt(allowEmpty?0:1))fail(code);
  const out=Buffer.alloc(Number(size));
  let offset=0;
  while(offset<out.length){
    const n=fs.readSync(fd,out,offset,out.length-offset,offset);
    if(n<=0)fail(code);
    offset+=n;
  }
  return out;
}
function writeAll(fd,bytes,start=null){
  let offset=0;
  while(offset<bytes.length){
    const n=fs.writeSync(fd,bytes,offset,bytes.length-offset,
      start===null?null:start+offset);
    if(n<=0)fail("legacy_history_nimo_forced_command_short_write");
    offset+=n;
  }
}
function openRootOwnedDirectoryChain(target){
  const resolved=path.resolve(target);
  if(!path.isAbsolute(resolved)||resolved!==target)fail("legacy_history_nimo_forced_command_path_invalid");
  let cursor="/";
  const opened=[];
  try{
    let fd=fs.openSync("/",O_DIRECTORY|O_NOFOLLOW|fs.constants.O_RDONLY);
    let st=fs.fstatSync(fd,{bigint:true});
    validateRootOwnedAncestor(st,"legacy_history_nimo_forced_command_ancestor_invalid");
    opened.push(fd);
    for(const part of resolved.split("/").filter(Boolean)){
      cursor=path.join(cursor,part);
      fd=fs.openSync(cursor,O_DIRECTORY|O_NOFOLLOW|fs.constants.O_RDONLY);
      st=fs.fstatSync(fd,{bigint:true});
      validateRootOwnedAncestor(st,"legacy_history_nimo_forced_command_ancestor_invalid");
      opened.push(fd);
    }
    return Object.freeze({path:resolved,fd:opened.at(-1),fds:opened});
  }catch(error){
    for(const fd of opened.reverse()){try{fs.closeSync(fd);}catch{}}
    throw error;
  }
}
function readRootOwnedConfig(configPath){
  if(configPath!==VOID_BUY_VOID_LEGACY_HISTORY_NIMO_CONFIG_PATH_V1){
    fail("legacy_history_nimo_forced_command_config_path_invalid");
  }
  const parent=path.dirname(configPath);
  const chain=openRootOwnedDirectoryChain(parent);
  try{
    const visible=fs.lstatSync(configPath,{bigint:true});
    validateRootOwnedConfig(visible);
    const fd=fs.openSync(configPath,fs.constants.O_RDONLY|O_NOFOLLOW);
    try{
      const opened=fs.fstatSync(fd,{bigint:true});
      validateRootOwnedConfig(opened);
      if(!sameFile(visible,opened))fail("legacy_history_nimo_forced_command_config_rebind");
      const bytes=readFd(fd,opened.size,MAX_CONFIG_BYTES,false,
        "legacy_history_nimo_forced_command_config_invalid");
      const after=fs.fstatSync(fd,{bigint:true});
      const visibleAfter=fs.lstatSync(configPath,{bigint:true});
      if(!sameFile(opened,after)||!sameFile(after,visibleAfter)){
        fail("legacy_history_nimo_forced_command_config_changed");
      }
      let parsed;
      try{parsed=JSON.parse(bytes.toString("utf8"));}catch{
        fail("legacy_history_nimo_forced_command_config_json_invalid");
      }
      if(canonicalBytes(parsed).compare(bytes)!==0){
        fail("legacy_history_nimo_forced_command_config_noncanonical");
      }
      return parseConfig(parsed);
    }finally{fs.closeSync(fd);}
  }finally{
    for(const fd of chain.fds.reverse()){try{fs.closeSync(fd);}catch{}}
  }
}
function parseConfig(value,{allowTestRoot=false}={}){
  const raw=exactObject(value,[
    "schema","marker","version","authority_root","witness_filename",
    "transport_policy","expected_witness_identity",
  ],"legacy_history_nimo_forced_command_config_shape_invalid");
  if(raw.schema!==CONFIG_SCHEMA||raw.marker!==CONFIG_MARKER||raw.version!==1||
     raw.witness_filename!==VOID_BUY_VOID_LEGACY_HISTORY_NIMO_WITNESS_NAME_V1){
    fail("legacy_history_nimo_forced_command_config_invalid");
  }
  const authorityRoot=path.resolve(String(raw.authority_root??""));
  if(!path.isAbsolute(authorityRoot)||
     (!allowTestRoot&&authorityRoot!==VOID_BUY_VOID_LEGACY_HISTORY_NIMO_AUTHORITY_ROOT_V1)){
    fail("legacy_history_nimo_forced_command_authority_root_invalid");
  }
  const policy=classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(raw.transport_policy);
  if(policy.ok!==true)fail("legacy_history_nimo_forced_command_transport_policy_invalid");
  if(policy.policy.remote_host!=="nimo"||policy.policy.remote_user!=="voidwitness"||
     policy.policy.remote_port!==22||policy.policy.remote_forced_command_only!==true||
     policy.policy.remote_shell_allowed!==false||
     policy.policy.caller_selected_remote_command!==false||
     policy.policy.caller_selected_remote_path!==false){
    fail("legacy_history_nimo_forced_command_transport_policy_boundary_invalid");
  }
  const id=exactObject(raw.expected_witness_identity,[
    "witness_hostname","witness_machine_id_sha256",
    "witness_root_disk_serial","witness_root_disk_wwn",
  ],"legacy_history_nimo_forced_command_identity_shape_invalid");
  for(const [key,expected] of Object.entries(EXPECTED_NIMO)){
    if(id[key]!==expected)fail("legacy_history_nimo_forced_command_identity_invalid");
  }
  return Object.freeze({
    schema:CONFIG_SCHEMA,marker:CONFIG_MARKER,version:1,
    authority_root:authorityRoot,
    witness_filename:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_WITNESS_NAME_V1,
    transport_policy:policy.policy,
    transport_policy_sha256:policy.policy_sha256,
    expected_witness_identity:Object.freeze({...EXPECTED_NIMO}),
  });
}
function openAuthorityRoot(root,{allowTestParent=false}={}){
  const resolved=path.resolve(root);
  const parent=path.dirname(resolved);
  const parentChain=allowTestParent
    ?Object.freeze({fds:[]})
    :openRootOwnedDirectoryChain(parent);
  let fd=null;
  try{
    const visible=fs.lstatSync(resolved,{bigint:true});
    validatePrivateDirectory(visible,"legacy_history_nimo_forced_command_authority_root_invalid");
    fd=fs.openSync(resolved,O_DIRECTORY|O_NOFOLLOW|fs.constants.O_RDONLY);
    const opened=fs.fstatSync(fd,{bigint:true});
    validatePrivateDirectory(opened,"legacy_history_nimo_forced_command_authority_root_invalid");
    if(!sameIdentity(visible,opened))fail("legacy_history_nimo_forced_command_authority_root_rebind");
    return Object.freeze({
      path:resolved,fd,
      proc_path:"/proc/self/fd/"+String(fd),
      opened,
      parent_fds:parentChain.fds,
    });
  }catch(error){
    if(fd!==null)try{fs.closeSync(fd);}catch{}
    for(const x of parentChain.fds.reverse()){try{fs.closeSync(x);}catch{}}
    throw error;
  }
}
function closeAuthorityRoot(directory){
  try{fs.closeSync(directory.fd);}finally{
    for(const fd of directory.parent_fds.reverse()){try{fs.closeSync(fd);}catch{}}
  }
}
function assertAuthorityRootBound(directory){
  const opened=fs.fstatSync(directory.fd,{bigint:true});
  const visible=fs.lstatSync(directory.path,{bigint:true});
  validatePrivateDirectory(opened,"legacy_history_nimo_forced_command_authority_root_changed");
  validatePrivateDirectory(visible,"legacy_history_nimo_forced_command_authority_root_changed");
  if(!sameIdentity(directory.opened,opened)||!sameIdentity(opened,visible)){
    fail("legacy_history_nimo_forced_command_authority_root_changed");
  }
}
function readPrivateFile(directory,name,maxBytes,allowEmpty,code){
  assertAuthorityRootBound(directory);
  const visiblePath=path.join(directory.path,name);
  const pinnedPath=path.join(directory.proc_path,name);
  const before=fs.lstatSync(visiblePath,{bigint:true});
  validatePrivateFile(before,maxBytes,allowEmpty,code);
  const fd=fs.openSync(pinnedPath,fs.constants.O_RDONLY|O_NOFOLLOW);
  try{
    const opened=fs.fstatSync(fd,{bigint:true});
    validatePrivateFile(opened,maxBytes,allowEmpty,code);
    if(!sameFile(before,opened))fail(code+"_path_not_bound");
    const bytes=readFd(fd,opened.size,maxBytes,allowEmpty,code);
    const after=fs.fstatSync(fd,{bigint:true});
    const visibleAfter=fs.lstatSync(visiblePath,{bigint:true});
    if(!sameFile(opened,after)||!sameFile(after,visibleAfter))fail(code+"_changed");
    assertAuthorityRootBound(directory);
    return bytes;
  }finally{fs.closeSync(fd);}
}
function createPrivateFile(directory,name,bytes,maxBytes,code){
  if(bytes.length<1||bytes.length>maxBytes)fail(code);
  assertAuthorityRootBound(directory);
  const fd=fs.openSync(
    path.join(directory.proc_path,name),
    fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|O_NOFOLLOW,
    0o600,
  );
  try{writeAll(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  fs.fsyncSync(directory.fd);
  assertAuthorityRootBound(directory);
}
function unlinkPrivateFile(directory,name,maxBytes,code){
  assertAuthorityRootBound(directory);
  const visible=path.join(directory.path,name);
  const pinned=path.join(directory.proc_path,name);
  const a=fs.lstatSync(visible,{bigint:true});
  const b=fs.lstatSync(pinned,{bigint:true});
  validatePrivateFile(a,maxBytes,false,code);
  validatePrivateFile(b,maxBytes,false,code);
  if(!sameFile(a,b))fail(code+"_not_bound");
  fs.unlinkSync(pinned);
  fs.fsyncSync(directory.fd);
  assertAuthorityRootBound(directory);
}
function openWitnessUpdate(directory){
  assertAuthorityRootBound(directory);
  const visiblePath=path.join(directory.path,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_WITNESS_NAME_V1);
  const pinnedPath=path.join(directory.proc_path,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_WITNESS_NAME_V1);
  const before=fs.lstatSync(visiblePath,{bigint:true});
  validatePrivateFile(before,MAX_WITNESS_BYTES,true,
    "legacy_history_nimo_forced_command_witness_invalid");
  const fd=fs.openSync(pinnedPath,fs.constants.O_RDWR|O_NOFOLLOW);
  const opened=fs.fstatSync(fd,{bigint:true});
  validatePrivateFile(opened,MAX_WITNESS_BYTES,true,
    "legacy_history_nimo_forced_command_witness_invalid");
  if(!sameFile(before,opened)){
    fs.closeSync(fd);fail("legacy_history_nimo_forced_command_witness_path_not_bound");
  }
  return Object.freeze({fd,opened,visible_path:visiblePath});
}
function assertWitnessBound(directory,witness){
  const opened=fs.fstatSync(witness.fd,{bigint:true});
  const visible=fs.lstatSync(witness.visible_path,{bigint:true});
  validatePrivateFile(opened,MAX_WITNESS_BYTES,true,
    "legacy_history_nimo_forced_command_witness_changed");
  validatePrivateFile(visible,MAX_WITNESS_BYTES,true,
    "legacy_history_nimo_forced_command_witness_changed");
  if(!sameIdentity(witness.opened,opened)||!sameFile(opened,visible)){
    fail("legacy_history_nimo_forced_command_witness_changed");
  }
  assertAuthorityRootBound(directory);
}
function currentWitness(directory){
  const bytes=readPrivateFile(
    directory,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_WITNESS_NAME_V1,
    MAX_WITNESS_BYTES,true,"legacy_history_nimo_forced_command_witness_invalid"
  );
  inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(bytes);
  return bytes;
}
function hostIdentity(){
  const machineId=fs.readFileSync("/etc/machine-id","utf8").trim().toLowerCase();
  if(!/^[0-9a-f]{32}$/u.test(machineId)){
    fail("legacy_history_nimo_forced_command_machine_id_invalid");
  }
  const run=(command,args)=>{
    const r=spawnSync(command,args,{
      encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:5000,
      env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
    });
    if(r.error||r.signal||r.status!==0||typeof r.stdout!=="string"){
      fail("legacy_history_nimo_forced_command_host_probe_failed");
    }
    return r.stdout.trim();
  };
  const source=run("/usr/bin/findmnt",["-n","-o","SOURCE","/"]);
  if(!source.startsWith("/dev/"))fail("legacy_history_nimo_forced_command_root_source_invalid");
  const parentName=run("/usr/bin/lsblk",["-ndo","PKNAME",source]);
  const parent=parentName&&/^[A-Za-z0-9._-]+$/u.test(parentName)?"/dev/"+parentName:source;
  const pieces=run("/usr/bin/lsblk",["-ndo","SERIAL,WWN",parent])
    .split(/\s+/u).filter(Boolean);
  if(pieces.length!==2)fail("legacy_history_nimo_forced_command_root_identity_invalid");
  return Object.freeze({
    witness_hostname:os.hostname(),
    witness_machine_id_sha256:sha256Id(Buffer.from(machineId,"utf8")),
    witness_root_disk_serial:pieces[0],
    witness_root_disk_wwn:pieces[1],
  });
}
function requireHostIdentity(config,observed){
  for(const [key,expected] of Object.entries(config.expected_witness_identity)){
    if(observed[key]!==expected)fail("legacy_history_nimo_forced_command_host_identity_mismatch");
  }
}
function intentBody(requestBytes,prior,next,eventId){
  return Object.freeze({
    schema:INTENT_SCHEMA,
    marker:INTENT_MARKER,
    version:1,
    request_id:JSON.parse(requestBytes.toString("utf8")).request_id,
    request_sha256:sha256Id(requestBytes),
    request_json_base64:requestBytes.toString("base64"),
    prior_witness_sha256:sha256Id(prior),
    prior_witness_bytes:prior.length,
    expected_next_witness_sha256:sha256Id(next),
    expected_next_witness_bytes:next.length,
    expected_event_id:eventId,
  });
}
function serializeIntent(body){
  const bytes=Buffer.from(canonical(body),"utf8");
  if(bytes.length>MAX_INTENT_BYTES)fail("legacy_history_nimo_forced_command_intent_too_large");
  return bytes;
}
function parseIntent(bytes){
  if(bytes.length<2||bytes.length>MAX_INTENT_BYTES){
    fail("legacy_history_nimo_forced_command_intent_invalid");
  }
  let raw;
  try{raw=JSON.parse(bytes.toString("utf8"));}catch{
    fail("legacy_history_nimo_forced_command_intent_invalid");
  }
  const value=exactObject(raw,[
    "schema","marker","version","request_id","request_sha256","request_json_base64",
    "prior_witness_sha256","prior_witness_bytes","expected_next_witness_sha256",
    "expected_next_witness_bytes","expected_event_id",
  ],"legacy_history_nimo_forced_command_intent_shape_invalid");
  if(value.schema!==INTENT_SCHEMA||value.marker!==INTENT_MARKER||value.version!==1||
     !SAFE_TEXT.test(String(value.request_id||""))||
     !SHA256_ID.test(String(value.request_sha256||""))||
     !SHA256_ID.test(String(value.prior_witness_sha256||""))||
     !SHA256_ID.test(String(value.expected_next_witness_sha256||""))||
     !SAFE_TEXT.test(String(value.expected_event_id||""))||
     !Number.isSafeInteger(value.prior_witness_bytes)||value.prior_witness_bytes<0||
     !Number.isSafeInteger(value.expected_next_witness_bytes)||
     value.expected_next_witness_bytes<value.prior_witness_bytes){
    fail("legacy_history_nimo_forced_command_intent_invalid");
  }
  let request;
  try{request=Buffer.from(value.request_json_base64,"base64");}catch{
    fail("legacy_history_nimo_forced_command_intent_invalid");
  }
  if(request.toString("base64")!==value.request_json_base64||
     request.length<2||request.length>MAX_REQUEST_BYTES||
     sha256Id(request)!==value.request_sha256){
    fail("legacy_history_nimo_forced_command_intent_invalid");
  }
  return Object.freeze({...value,request_bytes:request});
}
function maybeIntent(directory){
  try{
    return parseIntent(readPrivateFile(
      directory,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INTENT_NAME_V1,
      MAX_INTENT_BYTES,false,"legacy_history_nimo_forced_command_intent_invalid"
    ));
  }catch(error){
    if(error?.code==="ENOENT"||String(error?.message||"").includes("ENOENT"))return null;
    throw error;
  }
}
function replan(config,requestBytes,prior,serverClassifier){
  const server=serverClassifier({
    policy:config.transport_policy,
    request_json:requestBytes,
    current_witness_jsonl:prior,
  });
  if(server?.ok!==true||server.operation!=="append"||
     !Buffer.isBuffer(server.next_witness_jsonl)||
     typeof server.event?.event_id!=="string"){
    fail("legacy_history_nimo_forced_command_server_plan_invalid");
  }
  return server;
}
function recoverIntent(directory,config,incomingRequest,serverClassifier,hooks){
  const intent=maybeIntent(directory);
  if(!intent)return null;
  if(!intent.request_bytes.equals(incomingRequest)){
    fail("legacy_history_nimo_forced_command_pending_intent_request_mismatch");
  }
  const witness=openWitnessUpdate(directory);
  let wrote=false;
  try{
    const current=readFd(
      witness.fd,fs.fstatSync(witness.fd,{bigint:true}).size,
      MAX_WITNESS_BYTES,true,"legacy_history_nimo_forced_command_witness_invalid"
    );
    if(current.length<intent.prior_witness_bytes){
      fail("legacy_history_nimo_forced_command_recovery_rollback_detected");
    }
    const prior=current.subarray(0,intent.prior_witness_bytes);
    if(sha256Id(prior)!==intent.prior_witness_sha256){
      fail("legacy_history_nimo_forced_command_recovery_prior_mismatch");
    }
    const server=replan(config,intent.request_bytes,prior,serverClassifier);
    const next=Buffer.from(server.next_witness_jsonl);
    if(
      sha256Id(next)!==intent.expected_next_witness_sha256||
      next.length!==intent.expected_next_witness_bytes||
      server.event.event_id!==intent.expected_event_id||
      !next.subarray(0,prior.length).equals(prior)
    )fail("legacy_history_nimo_forced_command_recovery_plan_mismatch");
    if(current.equals(next)){
      // Completed before crash; cleanup only.
    }else if(next.subarray(0,current.length).equals(current)){
      const delta=next.subarray(current.length);
      if(delta.length<1)fail("legacy_history_nimo_forced_command_recovery_delta_invalid");
      writeAll(witness.fd,delta,current.length);
      fs.fsyncSync(witness.fd);
      wrote=true;
      assertWitnessBound(directory,witness);
      if(hooks?.interrupt_after_recovery_write===true){
        throw new Error("legacy_history_nimo_forced_command_test_interrupt_after_recovery_write");
      }
    }else{
      fail("legacy_history_nimo_forced_command_recovery_nonprefix_state");
    }
    const final=readFd(
      witness.fd,fs.fstatSync(witness.fd,{bigint:true}).size,
      MAX_WITNESS_BYTES,true,"legacy_history_nimo_forced_command_witness_invalid"
    );
    if(!final.equals(next))fail("legacy_history_nimo_forced_command_recovery_final_mismatch");
    inspectVoidBuyVoidLegacyHistoryExternalWitnessV1(final);
    assertWitnessBound(directory,witness);
  }finally{fs.closeSync(witness.fd);}
  unlinkPrivateFile(
    directory,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INTENT_NAME_V1,
    MAX_INTENT_BYTES,"legacy_history_nimo_forced_command_intent_cleanup_invalid"
  );
  const observed=currentWitness(directory);
  return buildVoidBuyVoidLegacyHistoryNimoServerResponseV1({
    policy:config.transport_policy,
    request_json:incomingRequest,
    observed_witness_jsonl:observed,
    operation_performed:wrote,
  });
}
function appendNew(directory,config,requestBytes,server,serverClassifier,hooks){
  const prior=currentWitness(directory);
  const next=Buffer.from(server.next_witness_jsonl);
  if(!server.append_required){
    return buildVoidBuyVoidLegacyHistoryNimoServerResponseV1({
      policy:config.transport_policy,request_json:requestBytes,
      observed_witness_jsonl:prior,operation_performed:false,
    });
  }
  if(!next.subarray(0,prior.length).equals(prior)||next.length<=prior.length){
    fail("legacy_history_nimo_forced_command_append_plan_invalid");
  }
  const intent=intentBody(requestBytes,prior,next,server.event.event_id);
  const intentBytes=serializeIntent(intent);
  createPrivateFile(
    directory,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INTENT_NAME_V1,
    intentBytes,MAX_INTENT_BYTES,"legacy_history_nimo_forced_command_intent_create_invalid"
  );
  if(hooks?.interrupt_after_intent===true){
    throw new Error("legacy_history_nimo_forced_command_test_interrupt_after_intent");
  }
  const witness=openWitnessUpdate(directory);
  try{
    const opened=readFd(
      witness.fd,fs.fstatSync(witness.fd,{bigint:true}).size,
      MAX_WITNESS_BYTES,true,"legacy_history_nimo_forced_command_witness_invalid"
    );
    if(!opened.equals(prior))fail("legacy_history_nimo_forced_command_witness_changed_before_append");
    const delta=next.subarray(prior.length);
    if(hooks?.interrupt_after_partial_append===true){
      const partial=Math.max(1,Math.floor(delta.length/2));
      writeAll(witness.fd,delta.subarray(0,partial),prior.length);
      fs.fsyncSync(witness.fd);
      assertWitnessBound(directory,witness);
      throw new Error("legacy_history_nimo_forced_command_test_interrupt_after_partial_append");
    }
    writeAll(witness.fd,delta,prior.length);
    fs.fsyncSync(witness.fd);
    assertWitnessBound(directory,witness);
    if(hooks?.interrupt_after_full_append===true){
      throw new Error("legacy_history_nimo_forced_command_test_interrupt_after_full_append");
    }
  }finally{fs.closeSync(witness.fd);}
  unlinkPrivateFile(
    directory,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INTENT_NAME_V1,
    MAX_INTENT_BYTES,"legacy_history_nimo_forced_command_intent_cleanup_invalid"
  );
  const observed=currentWitness(directory);
  if(!observed.equals(next))fail("legacy_history_nimo_forced_command_post_append_mismatch");
  return buildVoidBuyVoidLegacyHistoryNimoServerResponseV1({
    policy:config.transport_policy,request_json:requestBytes,
    observed_witness_jsonl:observed,operation_performed:true,
  });
}
function handle(config,requestBytes,{host=hostIdentity(),serverClassifier=classifyVoidBuyVoidLegacyHistoryNimoServerRequestV1,hooks={}}={}){
  requireHostIdentity(config,host);
  const directory=openAuthorityRoot(config.authority_root,{
    allowTestParent:hooks?.allow_test_parent===true,
  });
  try{
    return withBuyVoidFilesystemBakeryLockV1(
      path.join(directory.proc_path,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_LOCK_NAME_V1),
      ()=>{
        requireHostIdentity(config,hostIdentityOrInjected(host,hooks));
        assertAuthorityRootBound(directory);
        const pending=maybeIntent(directory);
        if(pending){
          const recovered=recoverIntent(
            directory,config,requestBytes,serverClassifier,hooks
          );
          if(!recovered?.ok)fail("legacy_history_nimo_forced_command_recovery_response_invalid");
          return Object.freeze({...recovered,recovered_intent:true});
        }
        const prior=currentWitness(directory);
        const server=serverClassifier({
          policy:config.transport_policy,
          request_json:requestBytes,
          current_witness_jsonl:prior,
        });
        if(server?.ok!==true){
          fail("legacy_history_nimo_forced_command_request_"+String(server?.reason||"held"));
        }
        if(server.operation==="read"){
          const response=buildVoidBuyVoidLegacyHistoryNimoServerResponseV1({
            policy:config.transport_policy,request_json:requestBytes,
            observed_witness_jsonl:prior,operation_performed:false,
          });
          if(response.ok!==true)fail("legacy_history_nimo_forced_command_read_response_invalid");
          return Object.freeze({...response,recovered_intent:false});
        }
        const response=appendNew(
          directory,config,requestBytes,server,serverClassifier,hooks
        );
        if(response.ok!==true)fail("legacy_history_nimo_forced_command_append_response_invalid");
        return Object.freeze({...response,recovered_intent:false});
      }
    );
  }finally{closeAuthorityRoot(directory);}
}
function hostIdentityOrInjected(host,hooks){
  return hooks?.use_injected_host_identity===true?host:hostIdentity();
}
export function handleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
  config,
  requestBytes,
){
  const normalized=parseConfig(config);
  return handle(normalized,Buffer.from(requestBytes));
}
export function testOnlyHandleVoidBuyVoidLegacyHistoryNimoForcedCommandRequestV1(
  config,
  requestBytes,
  options={},
){
  const normalized=parseConfig(config,{allowTestRoot:true});
  return handle(normalized,Buffer.from(requestBytes),{
    host:options.host_identity??EXPECTED_NIMO,
    serverClassifier:options.server_classifier??classifyVoidBuyVoidLegacyHistoryNimoServerRequestV1,
    hooks:{
      ...(options.hooks??{}),
      use_injected_host_identity:true,
      allow_test_parent:true,
    },
  });
}
async function readOneRequest(){
  const chunks=[];let total=0;
  for await(const chunk of process.stdin){
    const b=Buffer.from(chunk);total+=b.length;
    if(total>MAX_REQUEST_BYTES)fail("legacy_history_nimo_forced_command_request_too_large");
    chunks.push(b);
  }
  const bytes=Buffer.concat(chunks);
  if(bytes.length<2||bytes.at(-1)!==0x0a||bytes.subarray(0,-1).includes(0x0a)){
    fail("legacy_history_nimo_forced_command_request_invalid");
  }
  return bytes;
}
function parseCli(argv){
  if(argv.length!==1||argv[0]!=="--config="+VOID_BUY_VOID_LEGACY_HISTORY_NIMO_CONFIG_PATH_V1){
    fail("legacy_history_nimo_forced_command_cli_invalid");
  }
  return Object.freeze({config_path:VOID_BUY_VOID_LEGACY_HISTORY_NIMO_CONFIG_PATH_V1});
}
async function main(){
  if(process.env[ENV_MARKER]!=="1"){
    fail("legacy_history_nimo_forced_command_marker_required");
  }
  if(String(process.env.SSH_ORIGINAL_COMMAND??"")!==""){
    fail("legacy_history_nimo_forced_command_original_command_forbidden");
  }
  if(process.getuid?.()===0){
    fail("legacy_history_nimo_forced_command_root_execution_forbidden");
  }
  const cli=parseCli(process.argv.slice(2));
  const config=readRootOwnedConfig(cli.config_path);
  const request=await readOneRequest();
  const result=handle(config,request);
  if(result?.ok!==true||!Buffer.isBuffer(result.response_json)){
    fail("legacy_history_nimo_forced_command_response_invalid");
  }
  process.stdout.write(result.response_json);
}
const invoked=process.argv[1]&&
  import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href;
if(invoked){
  main().catch(error=>{
    process.stderr.write(
      VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_V1+
      "_HOLD "+String(error?.message||error)+"\n"
    );
    process.exitCode=3;
  });
}
