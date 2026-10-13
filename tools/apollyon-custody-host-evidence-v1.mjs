#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V1,
  VOID_APOLLYON_CUSTODY_REVIEWED_SOURCE_V1,
  qualifyApollyonCustodyHostPolicyV1,
} from "./apollyon-custody-host-policy-qualification-v1.mjs";

export const VOID_APOLLYON_CUSTODY_HOST_EVIDENCE_V1 =
  "VOID_APOLLYON_CUSTODY_HOST_EVIDENCE_V1";

export const VOID_APOLLYON_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_only_collector:true,
    designated_host_read_only_observation:true,
    privileged_read_only_observer_required:true,
    procfs_read:true,
    filesystem_metadata_read:true,
    acl_metadata_read:true,
    systemd_metadata_read:true,
    polkit_authorization_query:true,
    exact_v82_classifier_reused:true,
    synthetic_snapshot_authority:false,
    trusted_collector_proven:false,
    verification_clock_authority_proven:false,
    evidence_generation_monotonicity_proven:false,
    live_host_qualification_performed:false,
    independent_custody_proven:false,
    production_gate_ready:false,
    filesystem_write:false,
    ownership_permission_mutation:false,
    service_mutation:false,
    user_group_mutation:false,
    network_access:false,
    operator_private_key_access:false,
    production_signing:false,
    attempt_claim:false,
    training_execution:false,
    candidate_weight_mutation:false,
    generation_execution:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
  });

const SYSTEMCTL="/usr/bin/systemctl";
const PKCHECK="/usr/bin/pkcheck";
const GETFACL="/usr/bin/getfacl";
const PROC="/proc";
const BOOT_ID="/proc/sys/kernel/random/boot_id";
const SYSTEMD_UNIT=/^[A-Za-z0-9@_.:-]{1,120}\.service$/u;
const OBSERVER_ENV=Object.freeze({
  PATH:"/usr/bin:/bin",
  LANG:"C",
  LC_ALL:"C",
});
const TTL_MS=120_000;
const MAX_TEXT_BYTES=4*1024*1024;
const MAX_UID_GID=0x7fff_ffff;

const SYSTEMD_CONTROL_VERBS=Object.freeze([
  "start",
  "stop",
  "reload",
  "restart",
  "try-restart",
  "reload-or-restart",
  "reload-or-try-restart",
  "kill",
  "reset-failed",
  "set-property",
  "clean",
]);

const SYSTEMD_CONTROL_ACTIONS=Object.freeze([
  "org.freedesktop.systemd1.manage-units",
  "org.freedesktop.systemd1.manage-unit-files",
  "org.freedesktop.systemd1.reload-daemon",
]);

function fail(code){
  throw new Error(code);
}

function exactKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(
    actual.length!==wanted.length||
    actual.some((key,index)=>key!==wanted[index])
  ){
    fail(code);
  }
}

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function absolutePath(value,code){
  if(typeof value!=="string"||!path.isAbsolute(value)||value.includes("\0")){
    fail(code);
  }
  const resolved=path.resolve(value);
  if(resolved!==value||resolved===path.parse(resolved).root)fail(code);
  return resolved;
}

function unitName(value,code){
  if(typeof value!=="string"||!SYSTEMD_UNIT.test(value)||value.startsWith("-")){
    fail(code);
  }
  return value;
}

function runText(command,args){
  return execFileSync(command,args,{
    encoding:"utf8",
    timeout:5000,
    maxBuffer:MAX_TEXT_BYTES,
    stdio:["ignore","pipe","pipe"],
    env:OBSERVER_ENV,
  });
}

function readTextBounded(file,maxBytes=MAX_TEXT_BYTES){
  const fd=fs.openSync(
    file,
    fs.constants.O_RDONLY|Number(fs.constants.O_NOFOLLOW||0),
  );
  try{
    const metadata=fs.fstatSync(fd,{bigint:true});
    if(!metadata.isFile()||metadata.size<1n||metadata.size>BigInt(maxBytes)){
      fail("apollyon_custody_host_evidence_file_invalid");
    }
    const bytes=Buffer.alloc(Number(metadata.size));
    let offset=0;
    while(offset<bytes.length){
      const count=fs.readSync(fd,bytes,offset,bytes.length-offset,offset);
      if(count<=0)fail("apollyon_custody_host_evidence_file_short_read");
      offset+=count;
    }
    const after=fs.fstatSync(fd,{bigint:true});
    if(
      metadata.dev!==after.dev||
      metadata.ino!==after.ino||
      metadata.size!==after.size||
      metadata.mtimeNs!==after.mtimeNs||
      metadata.ctimeNs!==after.ctimeNs
    ){
      fail("apollyon_custody_host_evidence_file_changed");
    }
    return bytes.toString("utf8");
  }finally{
    fs.closeSync(fd);
  }
}

export function parseApollyonProcStatusV1(text){
  const fields=new Map();
  for(const line of String(text||"").split("\n")){
    const index=line.indexOf(":");
    if(index>0)fields.set(line.slice(0,index),line.slice(index+1).trim());
  }
  const uids=String(fields.get("Uid")||"").split(/\s+/u).map(Number);
  const gids=String(fields.get("Gid")||"").split(/\s+/u).map(Number);
  const groups=String(fields.get("Groups")||"")
    .split(/\s+/u).filter(Boolean).map(Number);
  if(
    uids.length!==4||
    gids.length!==4||
    uids.some((v)=>!Number.isSafeInteger(v)||v<1||v>MAX_UID_GID)||
    gids.some((v)=>!Number.isSafeInteger(v)||v<1||v>MAX_UID_GID)||
    new Set(uids).size!==1||
    new Set(gids).size!==1||
    groups.some((v)=>!Number.isSafeInteger(v)||v<0||v>MAX_UID_GID)
  ){
    fail("apollyon_custody_host_evidence_proc_status_invalid");
  }
  return Object.freeze({
    uid:uids[3],
    gid:gids[3],
    groups:Object.freeze([...new Set(groups)].sort((a,b)=>a-b)),
  });
}

export function parseApollyonProcStartTimeV1(text){
  const raw=String(text||"").trim();
  const close=raw.lastIndexOf(")");
  if(close<2)fail("apollyon_custody_host_evidence_proc_stat_invalid");
  const fields=raw.slice(close+1).trim().split(/\s+/u);
  const start=fields[19];
  if(!/^[1-9][0-9]*$/u.test(String(start||""))){
    fail("apollyon_custody_host_evidence_proc_stat_invalid");
  }
  return String(start);
}

export function parseApollyonSystemdShowV1(text){
  const out=Object.create(null);
  for(const line of String(text||"").split("\n")){
    if(!line)continue;
    const index=line.indexOf("=");
    if(index<1)fail("apollyon_custody_host_evidence_systemd_show_invalid");
    const key=line.slice(0,index);
    if(Object.hasOwn(out,key)){
      fail("apollyon_custody_host_evidence_systemd_show_duplicate");
    }
    out[key]=line.slice(index+1);
  }
  return Object.freeze(out);
}

export function assertApollyonSimpleAclTextV1(text){
  const lines=String(text||"").split("\n")
    .map((line)=>line.trim())
    .filter((line)=>line&&!line.startsWith("#"));
  if(lines.length!==3)fail("apollyon_custody_host_evidence_acl_invalid");
  const keys=lines.map((line)=>line.split(":").slice(0,2).join(":")).sort();
  if(keys.join("\n")!==["group:","other:","user:"].join("\n")){
    fail("apollyon_custody_host_evidence_acl_invalid");
  }
  for(const line of lines){
    if(!/^(user::|group::|other::)[rwx-]{3}$/u.test(line)){
      fail("apollyon_custody_host_evidence_acl_invalid");
    }
  }
  return true;
}

function assertSimpleAcl(target){
  assertApollyonSimpleAclTextV1(runText(GETFACL,["-cp","--",target]));
}

function systemdShow(unit,properties){
  return parseApollyonSystemdShowV1(
    runText(SYSTEMCTL,[
      "show",
      unit,
      "--no-pager",
      "--property="+properties.join(","),
    ]),
  );
}

function mainPid(show,unit){
  if(show.Id!==unit||show.ActiveState!=="active"||show.SubState!=="running"){
    fail("apollyon_custody_host_evidence_unit_not_running");
  }
  const pid=Number(show.MainPID);
  if(!Number.isSafeInteger(pid)||pid<2){
    fail("apollyon_custody_host_evidence_main_pid_invalid");
  }
  return pid;
}

function processIdentity(pid){
  const root=path.join(PROC,String(pid));
  const identity=parseApollyonProcStatusV1(
    readTextBounded(path.join(root,"status")),
  );
  return Object.freeze({
    ...identity,
    start_time_ticks:parseApollyonProcStartTimeV1(
      readTextBounded(path.join(root,"stat")),
    ),
  });
}

function modeText(metadata){
  return "0"+Number(metadata.mode&0o777n).toString(8).padStart(3,"0");
}

function directObject(target,kind){
  const resolved=absolutePath(target,"apollyon_custody_host_evidence_path_invalid");
  const listed=fs.lstatSync(resolved,{bigint:true});
  if(listed.isSymbolicLink()||fs.realpathSync.native(resolved)!==resolved){
    fail("apollyon_custody_host_evidence_path_not_direct");
  }
  if(kind==="directory"&&!listed.isDirectory()){
    fail("apollyon_custody_host_evidence_path_type_invalid");
  }
  if(kind==="socket"&&!listed.isSocket()){
    fail("apollyon_custody_host_evidence_path_type_invalid");
  }
  assertSimpleAcl(resolved);
  return Object.freeze({path:resolved,stat:listed});
}

function permissionsFor(metadata,identity){
  const mode=Number(metadata.mode&0o777n);
  if(Number(metadata.uid)===identity.uid)return (mode>>6)&7;
  if(
    Number(metadata.gid)===identity.gid||
    identity.groups.includes(Number(metadata.gid))
  ){
    return (mode>>3)&7;
  }
  return mode&7;
}

function canWrite(metadata,identity){
  return (permissionsFor(metadata,identity)&2)!==0;
}

function canTraverse(metadata,identity){
  return (permissionsFor(metadata,identity)&1)!==0;
}

function ancestorChainForStateRoot(stateRoot){
  const out=[];
  let current=path.dirname(stateRoot.path);
  for(;;){
    const listed=fs.lstatSync(current,{bigint:true});
    if(
      !listed.isDirectory()||
      listed.isSymbolicLink()||
      fs.realpathSync.native(current)!==current
    ){
      fail("apollyon_custody_host_evidence_ancestor_invalid");
    }
    assertSimpleAcl(current);
    out.push(Object.freeze({
      path:current,
      uid:Number(listed.uid),
      gid:Number(listed.gid),
      mode:modeText(listed),
      group_other_writable:(Number(listed.mode&0o022n)!==0),
    }));
    if(current==="/")break;
    current=path.dirname(current);
    if(out.length>64)fail("apollyon_custody_host_evidence_ancestor_chain_too_large");
  }
  return Object.freeze(out);
}

function processCountForUid(uid){
  let count=0;
  let lastPid=null;
  for(const name of fs.readdirSync(PROC)){
    if(!/^[1-9][0-9]*$/u.test(name))continue;
    try{
      const identity=parseApollyonProcStatusV1(
        readTextBounded(path.join(PROC,name,"status")),
      );
      if(identity.uid===uid){
        count+=1;
        lastPid=Number(name);
      }
    }catch(error){
      if(error?.code==="ENOENT"||error?.code==="ESRCH")continue;
      throw error;
    }
  }
  return Object.freeze({count,last_pid:lastPid});
}

function polkitDenied(identity,pid,action,details=[]){
  const args=[
    "--action-id",action,
    "--process",String(pid)+","+identity.start_time_ticks+","+String(identity.uid),
  ];
  for(const [key,value] of details){
    args.push("--detail",key,value);
  }
  try{
    runText(PKCHECK,args);
    return false;
  }catch(error){
    if(Number(error?.status)===1)return true;
    fail("apollyon_custody_host_evidence_polkit_query_failed");
  }
}

function runtimeControlDenied(trainingIdentity,trainingPid,custodyUnit){
  for(const verb of SYSTEMD_CONTROL_VERBS){
    if(!polkitDenied(
      trainingIdentity,
      trainingPid,
      "org.freedesktop.systemd1.manage-units",
      [["unit",custodyUnit],["verb",verb]],
    )){
      return false;
    }
  }
  for(const action of SYSTEMD_CONTROL_ACTIONS){
    if(!polkitDenied(trainingIdentity,trainingPid,action))return false;
  }
  return true;
}

function boolProperty(value,code){
  if(value==="yes")return true;
  if(value==="no")return false;
  fail(code);
}

function listProperty(value){
  return Object.freeze(
    [...new Set(String(value||"").trim().split(/\s+/u).filter(Boolean))].sort(),
  );
}

function optionsV1(raw){
  exactKeys(
    raw,
    ["custody_unit","socket_path","state_root","training_unit"],
    "apollyon_custody_host_evidence_options_invalid",
  );
  return Object.freeze({
    training_unit:unitName(raw.training_unit,"apollyon_custody_host_evidence_unit_invalid"),
    custody_unit:unitName(raw.custody_unit,"apollyon_custody_host_evidence_unit_invalid"),
    state_root:absolutePath(raw.state_root,"apollyon_custody_host_evidence_state_root_invalid"),
    socket_path:absolutePath(raw.socket_path,"apollyon_custody_host_evidence_socket_path_invalid"),
  });
}

export function buildApollyonCustodyHostPolicyEvidenceFromObservationV1(observation){
  exactKeys(
    observation,
    [
      "boot_id_sha256",
      "consumed_directory",
      "custody_identity",
      "custody_process_count",
      "custody_service",
      "evidence_generation",
      "expires_at_ms",
      "hostname",
      "observed_at_ms",
      "runtime_control_denied",
      "socket",
      "socket_parent",
      "state_ancestors",
      "state_root",
      "training_identity",
    ],
    "apollyon_custody_host_evidence_observation_invalid",
  );
  if(String(observation.hostname).toLowerCase()!=="xiphos"){
    fail("apollyon_custody_host_evidence_wrong_host");
  }
  const training=observation.training_identity;
  const custody=observation.custody_identity;
  const socket=observation.socket;
  const socketParent=observation.socket_parent;
  const stateRoot=observation.state_root;
  const consumed=observation.consumed_directory;
  const service=observation.custody_service;
  const ancestors=observation.state_ancestors;
  if(
    !training||!custody||
    !Array.isArray(training.groups)||
    !Array.isArray(custody.groups)||
    !Array.isArray(ancestors)||
    ancestors.length<2
  ){
    fail("apollyon_custody_host_evidence_observation_invalid");
  }
  const ipcGid=socket.gid;
  const custodySupplementary=
    custody.groups.filter((gid)=>gid!==custody.gid).sort((a,b)=>a-b);

  return Object.freeze({
    marker:VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V1,
    version:1,
    target_host:"Xiphos",
    verification_now_ms:observation.observed_at_ms,
    evidence_snapshot:Object.freeze({
      observed_at_ms:observation.observed_at_ms,
      expires_at_ms:observation.expires_at_ms,
      evidence_generation:observation.evidence_generation,
      boot_id_sha256:observation.boot_id_sha256,
    }),
    source_binding:VOID_APOLLYON_CUSTODY_REVIEWED_SOURCE_V1,
    identities:Object.freeze({
      training_uid:training.uid,
      training_gid:training.gid,
      custody_uid:custody.uid,
      custody_gid:custody.gid,
      ipc_gid:ipcGid,
      training_supplementary_gids:Object.freeze([...training.groups].sort((a,b)=>a-b)),
      custody_supplementary_gids:Object.freeze(custodySupplementary),
    }),
    state_root:Object.freeze({
      owner_uid:stateRoot.uid,
      owner_gid:stateRoot.gid,
      mode:stateRoot.mode,
      direct:true,
      symlink:false,
      realpath_canonical:true,
      retained_ancestor_count:ancestors.length,
      retained_ancestors_root_owned:ancestors.every((entry)=>entry.uid===0),
      retained_ancestors_direct:true,
      retained_ancestors_symlink_free:true,
      retained_ancestors_group_other_writable:
        ancestors.some((entry)=>entry.group_other_writable===true),
      training_uid_write_denied:stateRoot.training_write===false,
      training_uid_rename_unlink_denied:
        stateRoot.training_rename_unlink===false,
    }),
    consumed_directory:Object.freeze({
      owner_uid:consumed.uid,
      owner_gid:consumed.gid,
      mode:consumed.mode,
      direct:true,
      symlink:false,
      parent_bound_to_state_root:consumed.parent_bound===true,
      training_uid_write_denied:consumed.training_write===false,
      training_uid_rename_unlink_denied:
        consumed.training_rename_unlink===false,
    }),
    socket_parent:Object.freeze({
      owner_uid:socketParent.uid,
      owner_gid:socketParent.gid,
      mode:socketParent.mode,
      direct:true,
      symlink:false,
      custody_uid_write_allowed:socketParent.custody_write===true,
      training_uid_traverse_allowed:socketParent.training_traverse===true,
      training_uid_write_denied:socketParent.training_write===false,
    }),
    socket:Object.freeze({
      owner_uid:socket.uid,
      owner_gid:socket.gid,
      mode:socket.mode,
      type:"AF_UNIX_socket",
      training_uid_connect_allowed:socket.training_connect===true,
      custody_uid_connect_allowed:socket.custody_connect===true,
    }),
    service:Object.freeze({
      manager:"system",
      user_uid:custody.uid,
      group_gid:custody.gid,
      supplementary_gids:Object.freeze(custodySupplementary),
      umask:service.UMask,
      no_new_privileges:boolProperty(service.NoNewPrivileges,"apollyon_custody_host_evidence_service_invalid"),
      private_tmp:boolProperty(service.PrivateTmp,"apollyon_custody_host_evidence_service_invalid"),
      private_devices:boolProperty(service.PrivateDevices,"apollyon_custody_host_evidence_service_invalid"),
      protect_system:service.ProtectSystem,
      protect_home:boolProperty(service.ProtectHome,"apollyon_custody_host_evidence_service_invalid"),
      protect_kernel_tunables:boolProperty(service.ProtectKernelTunables,"apollyon_custody_host_evidence_service_invalid"),
      protect_kernel_modules:boolProperty(service.ProtectKernelModules,"apollyon_custody_host_evidence_service_invalid"),
      protect_kernel_logs:boolProperty(service.ProtectKernelLogs,"apollyon_custody_host_evidence_service_invalid"),
      protect_control_groups:boolProperty(service.ProtectControlGroups,"apollyon_custody_host_evidence_service_invalid"),
      lock_personality:boolProperty(service.LockPersonality,"apollyon_custody_host_evidence_service_invalid"),
      restrict_suid_sgid:boolProperty(service.RestrictSUIDSGID,"apollyon_custody_host_evidence_service_invalid"),
      restrict_realtime:boolProperty(service.RestrictRealtime,"apollyon_custody_host_evidence_service_invalid"),
      capability_bounding_set:listProperty(service.CapabilityBoundingSet),
      ambient_capabilities:listProperty(service.AmbientCapabilities),
      restrict_address_families:listProperty(service.RestrictAddressFamilies),
      read_write_targets:service.read_write_targets,
      runtime_can_control_service:observation.runtime_control_denied!==true,
      custody_uid_only_reviewed_service:
        observation.custody_process_count===1,
    }),
  });
}

export function collectApollyonCustodyHostEvidenceV1(rawOptions){
  const options=optionsV1(rawOptions);
  if(typeof process.geteuid!=="function"||process.geteuid()!==0){
    fail("apollyon_custody_host_evidence_root_observer_required");
  }
  if(os.hostname().toLowerCase()!=="xiphos"){
    fail("apollyon_custody_host_evidence_wrong_host");
  }

  const observedAt=Date.now();
  const trainingShow=systemdShow(options.training_unit,[
    "Id","MainPID","ActiveState","SubState",
  ]);
  const custodyShow=systemdShow(options.custody_unit,[
    "Id","MainPID","ActiveState","SubState",
    "UMask","NoNewPrivileges","PrivateTmp","PrivateDevices",
    "ProtectSystem","ProtectHome","ProtectKernelTunables",
    "ProtectKernelModules","ProtectKernelLogs","ProtectControlGroups",
    "LockPersonality","RestrictSUIDSGID","RestrictRealtime",
    "CapabilityBoundingSet","AmbientCapabilities",
    "RestrictAddressFamilies","ReadWritePaths",
  ]);
  const trainingPid=mainPid(trainingShow,options.training_unit);
  const custodyPid=mainPid(custodyShow,options.custody_unit);
  const trainingIdentity=processIdentity(trainingPid);
  const custodyIdentity=processIdentity(custodyPid);

  const stateRoot=directObject(options.state_root,"directory");
  const consumed=directObject(path.join(options.state_root,"consumed"),"directory");
  const socketParent=directObject(path.dirname(options.socket_path),"directory");
  const socket=directObject(options.socket_path,"socket");
  const ancestors=ancestorChainForStateRoot(stateRoot);
  const parentOfState=fs.lstatSync(path.dirname(options.state_root),{bigint:true});
  const custodyCount=processCountForUid(custodyIdentity.uid);
  const runtimeDenied=runtimeControlDenied(
    trainingIdentity,
    trainingPid,
    options.custody_unit,
  );

  const readWritePaths=listProperty(custodyShow.ReadWritePaths);
  const expectedWritePaths=[socketParent.path,stateRoot.path].sort();
  if(
    readWritePaths.length!==expectedWritePaths.length||
    readWritePaths.some((entry,index)=>entry!==expectedWritePaths[index])
  ){
    fail("apollyon_custody_host_evidence_read_write_paths_invalid");
  }

  const observation=Object.freeze({
    hostname:os.hostname(),
    observed_at_ms:observedAt,
    expires_at_ms:observedAt+TTL_MS,
    evidence_generation:Math.max(
      1,
      Math.floor(Number(process.hrtime.bigint()/1_000_000n)),
    ),
    boot_id_sha256:sha256(readTextBounded(BOOT_ID,4096).trim()),
    training_identity:trainingIdentity,
    custody_identity:custodyIdentity,
    custody_process_count:
      custodyCount.count===1&&custodyCount.last_pid===custodyPid
        ? 1
        : custodyCount.count,
    runtime_control_denied:runtimeDenied,
    state_ancestors:ancestors,
    state_root:Object.freeze({
      uid:Number(stateRoot.stat.uid),
      gid:Number(stateRoot.stat.gid),
      mode:modeText(stateRoot.stat),
      training_write:canWrite(stateRoot.stat,trainingIdentity),
      training_rename_unlink:canWrite(parentOfState,trainingIdentity),
    }),
    consumed_directory:Object.freeze({
      uid:Number(consumed.stat.uid),
      gid:Number(consumed.stat.gid),
      mode:modeText(consumed.stat),
      parent_bound:path.dirname(consumed.path)===stateRoot.path,
      training_write:canWrite(consumed.stat,trainingIdentity),
      training_rename_unlink:canWrite(stateRoot.stat,trainingIdentity),
    }),
    socket_parent:Object.freeze({
      uid:Number(socketParent.stat.uid),
      gid:Number(socketParent.stat.gid),
      mode:modeText(socketParent.stat),
      custody_write:canWrite(socketParent.stat,custodyIdentity),
      training_traverse:canTraverse(socketParent.stat,trainingIdentity),
      training_write:canWrite(socketParent.stat,trainingIdentity),
    }),
    socket:Object.freeze({
      uid:Number(socket.stat.uid),
      gid:Number(socket.stat.gid),
      mode:modeText(socket.stat),
      training_connect:canWrite(socket.stat,trainingIdentity)&&
        canTraverse(socketParent.stat,trainingIdentity),
      custody_connect:canWrite(socket.stat,custodyIdentity)&&
        canTraverse(socketParent.stat,custodyIdentity),
    }),
    custody_service:Object.freeze({
      ...custodyShow,
      read_write_targets:Object.freeze(["socket_parent","state_root"]),
    }),
  });

  const classifierInput=
    buildApollyonCustodyHostPolicyEvidenceFromObservationV1(observation);
  const decision=qualifyApollyonCustodyHostPolicyV1(classifierInput);

  return Object.freeze({
    ok:true,
    marker:VOID_APOLLYON_CUSTODY_HOST_EVIDENCE_V1,
    version:1,
    status:"live_read_only_evidence_collected_and_source_policy_qualified",
    host_id:"Xiphos",
    selector_binding:Object.freeze({
      training_unit:options.training_unit,
      custody_unit:options.custody_unit,
      state_root_sha256:sha256(options.state_root),
      socket_path_sha256:sha256(options.socket_path),
    }),
    classifier_input:classifierInput,
    classifier_decision:decision,
    live_observation_backed:true,
    trusted_collector_proven:false,
    verification_clock_authority_proven:false,
    evidence_generation_monotonicity_proven:false,
    live_host_qualification_performed:false,
    independent_custody_proven:false,
    production_gate_ready:false,
    attempt_claimed:false,
    training_execution_performed:false,
    authority:VOID_APOLLYON_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1,
  });
}
