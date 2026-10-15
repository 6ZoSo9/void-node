#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  collectBuyVoidAllocationCustodyHostEvidenceV1,
} from "./void-buy-allocation-custody-host-evidence-v1.mjs";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V2 =
  Object.freeze({
    source_only_tool:true,
    read_only_host_observation:true,
    v1_storage_mount_socket_source_engine_reused:true,
    user_systemd_runtime_manager_supported:true,
    exact_runtime_user_bus_required:true,
    runtime_user_manager_identity_derived:true,
    runtime_user_manager_cgroup_bound:true,
    implicit_user_unit_identity_normalized_only_after_verification:true,
    root_execution_required_for_live_collection:true,
    runtime_service_mutation:false,
    custody_service_mutation:false,
    daemon_reload:false,
    filesystem_write:false,
    mount_mutation:false,
    permission_mutation:false,
    credential_access:false,
    private_key_access:false,
    wallet_or_signer_access:false,
    rpc_call:false,
    network_call:false,
    payment_acceptance:false,
    public_presale_activation:false,
    funds_movement:false,
  });

const CONFIG_KEYS=Object.freeze([
  "repo_root","ledger_root","custody_root","runtime_user","custody_user",
  "ipc_group","socket_path","service_unit","runtime_service_unit",
  "runtime_service_manager",
]);
const V1_CONFIG_KEYS=Object.freeze(CONFIG_KEYS.slice(0,-1));
const MAX_COMMAND_BYTES=512*1024;
const SAFE_NAME=/^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/u;
const SAFE_UNIT=/^[A-Za-z0-9_.@:-]{1,200}\.service$/u;
const UINT=/^[1-9][0-9]*$/u;

function fail(code){throw new Error(code);}
function exactObject(raw,keys,code){
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype){
    fail(code);
  }
  const got=Object.keys(raw).sort(),want=[...keys].sort();
  if(got.length!==want.length||got.some((v,i)=>v!==want[i]))fail(code);
  return raw;
}
function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"&&Number.isSafeInteger(v))return String(v);
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  if(v&&typeof v==="object"&&!Array.isArray(v)){
    return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
  }
  fail("custody_host_evidence_v2_noncanonical_value");
}
function sha256Id(v){
  return "sha256:"+crypto.createHash("sha256").update(v).digest("hex");
}
function safeName(raw,code){
  const value=String(raw??"");
  if(!SAFE_NAME.test(value))fail(code);
  return value;
}
function safeUnit(raw,code){
  const value=String(raw??"");
  if(!SAFE_UNIT.test(value))fail(code);
  return value;
}
function positive(raw,code){
  const text=String(raw??"").trim();
  if(!UINT.test(text))fail(code);
  const value=Number(text);
  if(!Number.isSafeInteger(value)||value<=0||value>0x7fff_ffff)fail(code);
  return value;
}
function parseShow(raw){
  const out=Object.create(null);
  for(const line of String(raw??"").split("\n")){
    if(!line)continue;
    const at=line.indexOf("=");
    if(at<=0)fail("custody_host_evidence_v2_user_show_invalid");
    const key=line.slice(0,at),value=line.slice(at+1);
    if(Object.hasOwn(out,key))fail("custody_host_evidence_v2_user_show_invalid");
    out[key]=value;
  }
  return out;
}
function commandEnv(){
  return Object.freeze({
    PATH:"/usr/sbin:/usr/bin:/sbin:/bin",
    HOME:"/root",
    LANG:"C",LC_ALL:"C",TZ:"UTC",
    GIT_CONFIG_NOSYSTEM:"1",
    GIT_CONFIG_GLOBAL:"/dev/null",
    GIT_CONFIG_SYSTEM:"/dev/null",
    GIT_NO_REPLACE_OBJECTS:"1",
    GIT_OPTIONAL_LOCKS:"0",
    GIT_TERMINAL_PROMPT:"0",
  });
}
function execText(command,args){
  return execFileSync(command,args,{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    maxBuffer:MAX_COMMAND_BYTES,
    env:commandEnv(),
  });
}
function runtimeAccount(runtimeUser){
  const user=safeName(runtimeUser,"custody_host_evidence_v2_runtime_user_invalid");
  const uid=positive(execText("/usr/bin/id",["-u",user]),"custody_host_evidence_v2_runtime_uid_invalid");
  const gid=positive(execText("/usr/bin/id",["-g",user]),"custody_host_evidence_v2_runtime_gid_invalid");
  const group=String(execText("/usr/bin/id",["-gn",user])).trim();
  if(!SAFE_NAME.test(group))fail("custody_host_evidence_v2_runtime_group_invalid");
  const passwd=String(execText("/usr/bin/getent",["passwd",user])).trim();
  const fields=passwd.split(":");
  if(fields.length!==7||fields[0]!==user||Number(fields[2])!==uid||Number(fields[3])!==gid){
    fail("custody_host_evidence_v2_runtime_passwd_invalid");
  }
  const home=fields[5];
  if(!home||!path.isAbsolute(home)||path.resolve(home)!==home||home.includes("\0")){
    fail("custody_host_evidence_v2_runtime_home_invalid");
  }
  return Object.freeze({user,uid,gid,group,home});
}

export function testOnlyBuildBuyVoidAllocationCustodyUserSystemctlInvocationV2(input){
  const value=exactObject(input,[
    "runtime_user","runtime_uid","runtime_home","systemctl_args",
  ],"custody_host_evidence_v2_test_input_invalid");
  const user=safeName(value.runtime_user,"custody_host_evidence_v2_runtime_user_invalid");
  const uid=positive(value.runtime_uid,"custody_host_evidence_v2_runtime_uid_invalid");
  const home=String(value.runtime_home??"");
  if(!path.isAbsolute(home)||path.resolve(home)!==home||home.includes("\0")){
    fail("custody_host_evidence_v2_runtime_home_invalid");
  }
  if(!Array.isArray(value.systemctl_args)||value.systemctl_args.some(x=>typeof x!=="string")){
    fail("custody_host_evidence_v2_systemctl_args_invalid");
  }
  return Object.freeze({
    command:"/usr/sbin/runuser",
    args:Object.freeze([
      "-u",user,"--",
      "/usr/bin/env","-i",
      "HOME="+home,
      "XDG_RUNTIME_DIR=/run/user/"+String(uid),
      "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/"+String(uid)+"/bus",
      "PATH=/usr/sbin:/usr/bin:/sbin:/bin",
      "LANG=C","LC_ALL=C","TZ=UTC",
      "/usr/bin/systemctl","--user",...value.systemctl_args,
    ]),
  });
}

export function testOnlyNormalizeBuyVoidAllocationCustodyUserServiceShowV2(raw,input){
  const value=exactObject(input,[
    "runtime_user","runtime_group","runtime_uid","runtime_service_unit",
  ],"custody_host_evidence_v2_test_input_invalid");
  const user=safeName(value.runtime_user,"custody_host_evidence_v2_runtime_user_invalid");
  const group=safeName(value.runtime_group,"custody_host_evidence_v2_runtime_group_invalid");
  const uid=positive(value.runtime_uid,"custody_host_evidence_v2_runtime_uid_invalid");
  const unit=safeUnit(value.runtime_service_unit,"custody_host_evidence_v2_runtime_unit_invalid");
  const show=parseShow(raw);
  const keys=["User","Group","MainPID","ControlGroup","NoNewPrivileges","CapabilityBoundingSet","AmbientCapabilities"];
  for(const key of keys)if(!Object.hasOwn(show,key))fail("custody_host_evidence_v2_user_show_invalid");
  if(show.User!==""||show.Group!=="")fail("custody_host_evidence_v2_explicit_user_group_forbidden");
  const pid=positive(show.MainPID,"custody_host_evidence_v2_runtime_pid_invalid");
  const expectedCgroup="/user.slice/user-"+uid+".slice/user@"+uid+".service/app.slice/"+unit;
  if(show.ControlGroup!==expectedCgroup)fail("custody_host_evidence_v2_runtime_cgroup_invalid");
  if(String(show.NoNewPrivileges).toLowerCase()!=="yes")fail("custody_host_evidence_v2_runtime_nnp_invalid");
  if(String(show.CapabilityBoundingSet).trim()!=="")fail("custody_host_evidence_v2_runtime_bounding_set_invalid");
  if(String(show.AmbientCapabilities).trim()!=="")fail("custody_host_evidence_v2_runtime_ambient_caps_invalid");
  return [
    "User="+user,
    "Group="+group,
    "MainPID="+pid,
    "ControlGroup="+show.ControlGroup,
    "NoNewPrivileges=yes",
    "CapabilityBoundingSet=",
    "AmbientCapabilities=",
    "",
  ].join("\n");
}

function userSystemctl(account,args){
  const call=testOnlyBuildBuyVoidAllocationCustodyUserSystemctlInvocationV2({
    runtime_user:account.user,
    runtime_uid:account.uid,
    runtime_home:account.home,
    systemctl_args:args,
  });
  return execText(call.command,[...call.args]);
}
function assertUserServiceActive(account,unit){
  const raw=userSystemctl(account,[
    "show",unit,"--no-pager",
    "--property","LoadState","--property","ActiveState","--property","SubState",
  ]);
  const show=parseShow(raw);
  if(show.LoadState!=="loaded"||show.ActiveState!=="active"||show.SubState!=="running"){
    fail("custody_host_evidence_v2_runtime_service_not_active");
  }
}

function createUserManagerIo(config){
  if(typeof process.geteuid!=="function"||process.geteuid()!==0){
    fail("custody_host_evidence_v2_root_required");
  }
  const account=runtimeAccount(config.runtime_user);
  const runtimeUnit=safeUnit(
    config.runtime_service_unit,
    "custody_host_evidence_v2_runtime_unit_invalid",
  );
  function execFile(command,args){
    if(
      command==="systemctl"&&
      Array.isArray(args)&&
      args[0]==="show"&&args[1]===runtimeUnit&&args[2]==="--no-pager"
    ){
      assertUserServiceActive(account,runtimeUnit);
      const raw=userSystemctl(account,args);
      return testOnlyNormalizeBuyVoidAllocationCustodyUserServiceShowV2(raw,{
        runtime_user:account.user,
        runtime_group:account.group,
        runtime_uid:account.uid,
        runtime_service_unit:runtimeUnit,
      });
    }
    return execText(command,args);
  }
  return Object.freeze({
    lstat(file){return fs.lstatSync(file,{bigint:true});},
    openReadNoFollow(file){
      if(typeof fs.constants.O_NOFOLLOW!=="number"||typeof fs.constants.O_DIRECTORY!=="number"||!fs.existsSync("/proc/self/fd")){
        throw new Error("descriptor_walk_unavailable");
      }
      const raw=String(file??"");
      if(!raw||!path.isAbsolute(raw)||raw.includes("\0"))throw new Error("descriptor_walk_path_invalid");
      const resolved=path.resolve(raw),root=path.parse(resolved).root;
      const parts=resolved.slice(root.length).split(path.sep).filter(Boolean);
      if(parts.length<1)throw new Error("descriptor_walk_path_invalid");
      let directoryFd=-1;
      try{
        directoryFd=fs.openSync(root,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW);
        for(const component of parts.slice(0,-1)){
          if(component==="."||component===".."||component.includes("/")||component.includes("\\")){
            throw new Error("descriptor_walk_component_invalid");
          }
          const nextFd=fs.openSync(
            path.join("/proc/self/fd",String(directoryFd),component),
            fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW,
          );
          const nextStat=fs.fstatSync(nextFd,{bigint:true});
          if(!nextStat.isDirectory()||nextStat.isSymbolicLink()){
            fs.closeSync(nextFd);throw new Error("descriptor_walk_ancestor_invalid");
          }
          fs.closeSync(directoryFd);directoryFd=nextFd;
        }
        const basename=parts.at(-1);
        if(!basename||basename==="."||basename===".."||basename.includes("/")||basename.includes("\\")){
          throw new Error("descriptor_walk_component_invalid");
        }
        const fd=fs.openSync(
          path.join("/proc/self/fd",String(directoryFd),basename),
          fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW,
        );
        fs.closeSync(directoryFd);directoryFd=-1;return fd;
      }catch(error){
        if(directoryFd>=0){try{fs.closeSync(directoryFd);}catch{}}
        throw error;
      }
    },
    fstat(fd){return fs.fstatSync(fd,{bigint:true});},
    readFd(fd,maximum){
      const chunks=[];let total=0;
      while(true){
        const remaining=maximum+1-total;if(remaining<=0)break;
        const buffer=Buffer.alloc(Math.min(16*1024,remaining));
        const count=fs.readSync(fd,buffer,0,buffer.length,null);
        if(count===0)break;
        if(count<0)throw new Error("fd_read_failed");
        chunks.push(buffer.subarray(0,count));total+=count;
      }
      return Buffer.concat(chunks,total);
    },
    closeFd(fd){fs.closeSync(fd);},
    statfs(file){return fs.statfsSync(file,{bigint:true});},
    execFile,
    execFileStatus(command,args){
      const result=spawnSync(command,args,{
        encoding:"utf8",stdio:["ignore","pipe","pipe"],
        maxBuffer:MAX_COMMAND_BYTES,env:commandEnv(),
      });
      if(result.error||result.signal||!Number.isInteger(result.status)){
        throw result.error||new Error("command_status_unavailable");
      }
      return Object.freeze({
        status:result.status,
        stdout:String(result.stdout??""),
        stderr:String(result.stderr??""),
      });
    },
    nowMs(){return Date.now();},
  });
}

function normalizeConfig(raw){
  const value=exactObject(raw,CONFIG_KEYS,"custody_host_evidence_v2_config_invalid");
  if(value.runtime_service_manager!=="user")fail("custody_host_evidence_v2_runtime_manager_invalid");
  safeName(value.runtime_user,"custody_host_evidence_v2_runtime_user_invalid");
  safeUnit(value.runtime_service_unit,"custody_host_evidence_v2_runtime_unit_invalid");
  const v1=Object.create(null);
  for(const key of V1_CONFIG_KEYS)v1[key]=value[key];
  return Object.freeze({v1:Object.freeze(v1),runtime_service_manager:"user"});
}

export function collectBuyVoidAllocationCustodyHostEvidenceV2(rawConfig){
  const config=normalizeConfig(rawConfig);
  const io=createUserManagerIo(config.v1);
  const predecessor=collectBuyVoidAllocationCustodyHostEvidenceV1(config.v1,io);
  const {collector_receipt_sha256:predecessorReceipt,...payload}=predecessor;
  const body=Object.freeze({
    ...payload,
    schema:"void_buy_void_allocation_custody_host_evidence_v2",
    marker:VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2,
    version:2,
    runtime_service_manager:"user",
    runtime_service_identity_source:"user_manager_bus_plus_live_pid_v1",
    predecessor_v1_compatible_receipt_sha256:predecessorReceipt,
    authority:VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V2,
  });
  return Object.freeze({
    ...body,
    collector_receipt_sha256:sha256Id(Buffer.from(canonical(body),"utf8")),
  });
}

function main(){
  const raw=process.env.VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2_CONFIG_JSON;
  if(!raw)fail("custody_host_evidence_v2_config_env_required");
  let config;
  try{config=JSON.parse(raw);}catch{fail("custody_host_evidence_v2_config_json_invalid");}
  const result=collectBuyVoidAllocationCustodyHostEvidenceV2(config);
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
  main();
}
