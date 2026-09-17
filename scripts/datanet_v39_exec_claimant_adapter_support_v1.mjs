// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

const O_DIRECTORY=fs.constants.O_DIRECTORY||0, O_NOFOLLOW=fs.constants.O_NOFOLLOW||0, O_CLOEXEC=fs.constants.O_CLOEXEC||0;
const SCHEMA_ID="VOID_DATANET_V39_EXEC_CLAIMANT_RECORD_V1";
const ARMED_FORMAT="VOID_DATANET_RECOVERY_ARMED_V3", CLAIMED_FORMAT="VOID_DATANET_RECOVERY_CLAIMED_V3", CLOSED_FORMAT="VOID_DATANET_RECOVERY_CLOSED_V3";
const CAP_FORMAT="VOID_DATANET_RECOVERY_CLAIMANT_CAPABILITY_V1";
const sha256=(data)=>createHash("sha256").update(data).digest("hex");
const identityText=(st)=>`${String(st.dev)}:${String(st.ino)}`;
function canonicalFlat(obj){const ordered={};for(const key of Object.keys(obj).sort())ordered[key]=obj[key];return Buffer.from(`${JSON.stringify(ordered)}\n`,"ascii");}

export function installV39Adapter(cfg){
  const {action,python,linkHelper,root,k,rootIdentity,lockIdentity,recordSourceSha256,claimantSourceSha256,generationSourceSha256,linkPath,capFd,payloadBytes,payloadSha256,armedFd,armedGeneration,claimedFd,claimedGeneration}=cfg;
  const markerName=(kind)=>`.void-datanet-recovery-${k}.${kind}.v3`;
  const rootOpen=()=>fs.openSync(root,fs.constants.O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
  function readFdRaw(fd){const st=fs.fstatSync(fd,{bigint:true});assert.ok(st.size>0n&&st.size<=3072n);const raw=Buffer.alloc(Number(st.size));assert.equal(fs.readSync(fd,raw,0,raw.length,0),raw.length);const obj=JSON.parse(raw.toString("ascii"));assert.deepEqual(canonicalFlat(obj),raw);return {st,raw,obj,sha256:sha256(raw)};}
  function readInherited(rootStable,kind,fd,expectedGeneration){
    assert.ok(Number.isSafeInteger(fd)&&fd>=3);assert.ok(Number.isSafeInteger(expectedGeneration)&&expectedGeneration>=0);
    const item=readFdRaw(fd), visible=fs.lstatSync(`${rootStable}/${markerName(kind)}`,{bigint:true});
    assert.equal(item.st.isFile(),true);assert.equal(visible.isFile(),true);assert.equal(visible.isSymbolicLink(),false);assert.equal(identityText(item.st),identityText(visible));
    assert.equal(item.st.uid,BigInt(process.getuid()));assert.equal(Number(item.st.mode)&0o777,0o600);assert.equal(item.st.nlink,1n);
    assert.equal(item.obj.record_identity,identityText(item.st));assert.equal(item.obj.record_generation,expectedGeneration);
    assert.equal(item.obj.root_identity,rootIdentity);assert.equal(item.obj.quota_key,k);assert.equal(item.obj.record_source_sha256,recordSourceSha256);assert.equal(item.obj.generation_source_sha256,generationSourceSha256);assert.equal(item.obj.schema_id,SCHEMA_ID);
    return {name:markerName(kind),raw:item.raw,record:item.obj,sha256:item.sha256,identity:identityText(item.st),generation:expectedGeneration,inherited_fd:fd,inherited_fd_verified:true};
  }
  function reserveMarker(rootStable,kind){
    const fd=fs.openSync(`${rootStable}/${markerName(kind)}`,fs.constants.O_RDWR|fs.constants.O_CREAT|fs.constants.O_EXCL|O_CLOEXEC|O_NOFOLLOW,0o600);fs.fchmodSync(fd,0o600);
    const st=fs.fstatSync(fd,{bigint:true});assert.equal(st.isFile(),true);assert.equal(st.uid,BigInt(process.getuid()));assert.equal(st.nlink,1n);assert.equal(st.size,0n);return fd;
  }
  function finalizeReserved(rootFd,rootStable,kind,fd,generation,base){
    const before=fs.fstatSync(fd,{bigint:true}), visible=fs.lstatSync(`${rootStable}/${markerName(kind)}`,{bigint:true});assert.equal(identityText(before),identityText(visible));assert.equal(before.size,0n);
    const obj={...base,record_identity:identityText(before),record_generation:generation};const raw=canonicalFlat(obj);assert.ok(raw.length>0&&raw.length<=3072);
    let off=0;while(off<raw.length){const n=fs.writeSync(fd,raw,off,raw.length-off,off);assert.ok(n>0);off+=n;}fs.fsyncSync(fd);fs.fsyncSync(rootFd);
    const item=readFdRaw(fd), afterVisible=fs.lstatSync(`${rootStable}/${markerName(kind)}`,{bigint:true});assert.equal(identityText(item.st),identityText(before));assert.equal(identityText(afterVisible),identityText(before));assert.deepEqual(item.raw,raw);assert.equal(item.obj.record_identity,identityText(before));assert.equal(item.obj.record_generation,generation);
    return {name:markerName(kind),raw:item.raw,record:item.obj,sha256:item.sha256,identity:identityText(before),generation,generation_identity:`${identityText(before)}:${generation}`};
  }
  function verifyCapability(claimed,armed){
    const rec=claimed.record;assert.equal(rec.format,CLAIMED_FORMAT);assert.equal(rec.state,"CLAIMED");assert.equal(rec.schema_id,SCHEMA_ID);assert.equal(rec.armed_sha256,armed.sha256);assert.equal(rec.claimant_pid,process.pid);assert.equal(rec.claimant_capability_seals,15);assert.equal(rec.claimant_source_sha256,claimantSourceSha256);
    const st=fs.fstatSync(capFd,{bigint:true});assert.equal(st.isFile(),true);assert.ok(st.size>0n&&st.size<=4096n);const raw=Buffer.alloc(Number(st.size));assert.equal(fs.readSync(capFd,raw,0,raw.length,0),raw.length);assert.equal(sha256(raw),rec.claimant_capability_sha256);const cap=JSON.parse(raw.toString("ascii"));assert.deepEqual(canonicalFlat(cap),raw);
    assert.equal(cap.format,CAP_FORMAT);assert.equal(cap.pid,process.pid);assert.equal(cap.root_identity,rootIdentity);assert.equal(cap.lock_identity,lockIdentity);assert.equal(cap.quota_key,k);assert.equal(cap.armed_sha256,armed.sha256);assert.equal(cap.record_source_sha256,recordSourceSha256);assert.equal(cap.claimant_source_sha256,claimantSourceSha256);assert.equal(cap.s0_identity,armed.record.s0_identity);assert.equal(cap.s0_generation,armed.record.s0_generation);
    return {bytes:raw.length,sha256:sha256(raw),pid:cap.pid,seal_value_committed:15};
  }

  let recoveryPreflight=null;
  if(action==="close-s1"){
    assert.ok(Number.isSafeInteger(capFd)&&capFd>=3);const rootFd=rootOpen(), rootStable=`/proc/self/fd/${rootFd}`;
    try{assert.equal(identityText(fs.fstatSync(rootFd,{bigint:true})),rootIdentity);const armed=readInherited(rootStable,"armed",armedFd,armedGeneration), claimed=readInherited(rootStable,"claimed",claimedFd,claimedGeneration);assert.equal(armed.record.format,ARMED_FORMAT);assert.equal(armed.record.state,"ARMED");const capability=verifyCapability(claimed,armed);recoveryPreflight={armed,claimed,capability};}finally{fs.closeSync(rootFd);}
  }

  let linkGenerationReceipt=null, linkSubstitutions=0, reservedFd=-1, reservedKind=null;
  if(action!=="e0"){
    const originalSpawnSync=childProcess.spawnSync.bind(childProcess);
    childProcess.spawnSync=function patchedSpawnSync(executable,args,options){
      const isLink=executable===linkPath&&Array.isArray(args)&&args.length===5&&args[0]==="-L"&&args[1]==="-T"&&args[2]==="--"&&args[3]==="/proc/self/fd/3"&&typeof args[4]==="string"&&args[4].startsWith("/proc/self/fd/4/");
      if(!isLink)return originalSpawnSync(executable,args,options);assert.equal(linkSubstitutions,0);const slotName=args[4].slice("/proc/self/fd/4/".length);const stdio=Array.isArray(options?.stdio)?[...options.stdio]:null;assert.ok(stdio&&stdio.length>=5);const parentRootFd=stdio[4];assert.ok(Number.isSafeInteger(parentRootFd));const rootStable=`/proc/self/fd/${parentRootFd}`;
      reservedKind=action==="arm-h0"?"armed":"closed";reservedFd=reserveMarker(rootStable,reservedKind);stdio[1]="pipe";stdio.push(reservedFd);const result=originalSpawnSync(python,["-I","-B",linkHelper,"--slot-name",slotName,"--reserved-name",markerName(reservedKind),"--reserved-fd","5"],{...options,stdio});
      const stdout=Buffer.isBuffer(result.stdout)?result.stdout:Buffer.from(result.stdout||"");const stderr=Buffer.isBuffer(result.stderr)?result.stderr:Buffer.from(result.stderr||"");assert.equal(result.status,0,stderr.toString("utf8"));const lines=stdout.toString("utf8").split("\n").filter(Boolean);assert.equal(lines.length,1);const rec=JSON.parse(lines[0]);assert.equal(rec.marker,"VOID_DATANET_V39_LINK_GENERATION_RECORD_HELPER_V1_GREEN");assert.equal(rec.status,"GREEN");assert.equal(rec.slot_name,slotName);assert.equal(rec.reserved_name,markerName(reservedKind));assert.equal(rec.payload_generation_ioctl_calls,1);assert.equal(rec.reserved_generation_ioctl_calls,1);assert.equal(rec.setversion_issued,false);linkGenerationReceipt={...rec,ioctl_calls:1};linkSubstitutions++;return {...result,stdout:Buffer.alloc(0)};
    };syncBuiltinESMExports();
    const originalReaddirSync=fs.readdirSync.bind(fs);fs.readdirSync=function filtered(path,options){const result=originalReaddirSync(path,options);if(!Array.isArray(result)||typeof path!=="string"||!path.startsWith("/proc/self/fd/"))return result;const blocked=new Set([markerName("armed"),markerName("claimed"),markerName("closed")]);return result.filter((entry)=>!blocked.has(Buffer.isBuffer(entry)?entry.toString("utf8"):String(entry)));};syncBuiltinESMExports();
  }

  function finalizeReceipt(receipt){
    assert.equal(receipt.publisher_pid,process.pid);assert.ok(linkGenerationReceipt!==null);assert.equal(linkSubstitutions,1);const payloadIdentity=`${receipt.payload_identity.dev}:${receipt.payload_identity.ino}`;assert.equal(linkGenerationReceipt.payload_identity,payloadIdentity);assert.ok(reservedFd>=3);
    const rootFd=rootOpen(),rootStable=`/proc/self/fd/${rootFd}`;try{assert.equal(identityText(fs.fstatSync(rootFd,{bigint:true})),rootIdentity);
      if(action==="arm-h0"){
        assert.equal(receipt.requested_slot,0);const armed=finalizeReserved(rootFd,rootStable,"armed",reservedFd,linkGenerationReceipt.reserved_generation,{format:ARMED_FORMAT,state:"ARMED",root_identity:rootIdentity,quota_key:k,record_source_sha256:recordSourceSha256,generation_source_sha256:generationSourceSha256,schema_id:SCHEMA_ID,s0_identity:payloadIdentity,s0_generation:linkGenerationReceipt.generation,s0_length:payloadBytes,s0_sha256:payloadSha256});
        fs.closeSync(reservedFd);reservedFd=-1;return {...receipt,v34_recovery:{action,armed_sha256:armed.sha256,armed_record_identity:armed.identity,armed_record_generation:armed.generation,generation_bound_record_admission:true,same_pid_writer:true,legacy_link_helper_identity_superseded:true,link_generation_helper:linkGenerationReceipt}};
      }
      assert.equal(action,"close-s1");assert.equal(receipt.requested_slot,1);assert.ok(recoveryPreflight!==null);const {armed,claimed,capability}=recoveryPreflight;const closed=finalizeReserved(rootFd,rootStable,"closed",reservedFd,linkGenerationReceipt.reserved_generation,{format:CLOSED_FORMAT,state:"CLOSED",reason:"RECOVERY_H1",root_identity:rootIdentity,quota_key:k,record_source_sha256:recordSourceSha256,generation_source_sha256:generationSourceSha256,schema_id:SCHEMA_ID,armed_sha256:armed.sha256,claimed_sha256:claimed.sha256,claimant_capability_sha256:capability.sha256,claimant_pid:process.pid,s1_identity:payloadIdentity,s1_generation:linkGenerationReceipt.generation,s1_length:payloadBytes,s1_sha256:payloadSha256});
      fs.closeSync(reservedFd);reservedFd=-1;return {...receipt,v34_recovery:{action,armed_sha256:armed.sha256,claimed_sha256:claimed.sha256,closed_sha256:closed.sha256,closed_record_identity:closed.identity,closed_record_generation:closed.generation,generation_bound_record_admission:true,inherited_armed_record_fd_verified:true,inherited_claimed_record_fd_verified:true,claimant_capability:capability,claimant_preflight_before_s1:true,same_pid_writer:true,legacy_link_helper_identity_superseded:true,link_generation_helper:linkGenerationReceipt}};
    }finally{fs.closeSync(rootFd);}}
  return {finalizeReceipt};
}
