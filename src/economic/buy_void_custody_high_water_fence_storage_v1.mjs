import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  parseBuyVoidCustodyHighWaterTransitionFenceV1,
  classifyBuyVoidCustodyHighWaterTransitionFenceSlotV1,
} from "./buy_void_custody_high_water_transition_fence_v1.mjs";

export const VOID_BUY_VOID_CUSTODY_CREATE_ONLY_FENCE_STORAGE_V1 =
  "VOID_BUY_VOID_CUSTODY_CREATE_ONLY_FENCE_STORAGE_V1";

export const VOID_BUY_VOID_CUSTODY_CREATE_ONLY_FENCE_STORAGE_POLICY_V1 =
  Object.freeze({
    source_only_unmounted: true,
    trusted_preprovisioned_fence_directory_required: true,
    permanent_create_only_slot: true,
    competing_next_same_prior_rejected: true,
    fence_record_deletion_allowed: false,
    unexpected_existing_record_replacement_allowed: false,
    fsync_file_before_directory: true,
    failed_fsync_never_reaps_permanent_slot: true,
    no_automatic_stale_fence_reclamation: true,
    high_water_writer_integration: false,
    cross_process_high_water_rename_serialization_verified: false,
    recovery_publishing_enabled: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    production_allocation_mutation_ready: false,
    funds_movement: false,
  });

const NOFOLLOW=fs.constants.O_NOFOLLOW;
const DIRECTORY=fs.constants.O_DIRECTORY;
const MAX=64*1024;
const SLOT=/^voidchwf1_[0-9a-f]{64}$/u;

function fail(reason){throw new Error("custody_create_only_fence_storage_"+reason);}
function identity(a,b) {
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&
    a.gid===b.gid&&a.mode===b.mode&&a.nlink===b.nlink;
}
function strongFile(a,b){
  return identity(a,b)&&a.size===b.size&&
    a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs;
}
function closeOrFail(fd,label){
  try{fs.closeSync(fd);}
  catch(error){fail("fd_close_failed_"+label);}
}
function openPrivatePinnedRoot(configured){
  if(process.platform!=="linux"||!Number.isInteger(NOFOLLOW)||
    NOFOLLOW<=0||!Number.isInteger(DIRECTORY)||
    !fs.existsSync("/proc/self/fd"))fail("linux_proc_fd_required");
  if(typeof configured!=="string"||!path.isAbsolute(configured)||
    configured.includes("\0"))fail("root_invalid");
  const resolved=path.resolve(configured);
  if(resolved==="/")fail("root_forbidden");
  const rootVisible=fs.lstatSync(resolved,{bigint:true});
  if(!rootVisible.isDirectory()||rootVisible.isSymbolicLink())fail("root_invalid");
  const ancestors=[];
  let fd=-1;
  try {
    fd=fs.openSync("/",fs.constants.O_RDONLY|DIRECTORY|NOFOLLOW);
    let current="";
    const parts=resolved.split("/").filter(Boolean);
    for(const part of parts){
      if(part==="."||part==="..")fail("unsafe_component");
      const next=fs.openSync("/proc/self/fd/"+fd+"/"+part,
        fs.constants.O_RDONLY|DIRECTORY|NOFOLLOW);
      ancestors.push(fd);
      fd=next;
      current+="/"+part;
      const visible=fs.lstatSync(current,{bigint:true});
      const opened=fs.fstatSync(fd,{bigint:true});
      if(!visible.isDirectory()||visible.isSymbolicLink()||
        !identity(visible,opened))fail("ancestor_not_bound");
    }
    const last=fs.fstatSync(fd,{bigint:true});
    if(!identity(rootVisible,last)||typeof process.getuid!=="function"||
      last.uid!==BigInt(process.getuid())||
      (Number(last.mode)&0o077)!==0)fail("private_root_owner_or_mode_invalid");
    const out=Object.freeze({fd,root:resolved,stat:last});
    fd=-1;
    return out;
  } finally {
    if(fd>=0)closeOrFail(fd,"root_open_error");
    for(const parent of ancestors.reverse())closeOrFail(parent,"root_ancestor");
  }
}
function stillPinned(dir) {
  const opened=fs.fstatSync(dir.fd,{bigint:true});
  const visible=fs.lstatSync(dir.root,{bigint:true});
  if(!opened.isDirectory()||!visible.isDirectory()||
    visible.isSymbolicLink()||
    !identity(dir.stat,opened)||!identity(dir.stat,visible))fail("root_rebound");
}
function readPinnedRecord(dir,name){
  stillPinned(dir);
  const visiblePath=path.join(dir.root,name);
  const pinnedPath="/proc/self/fd/"+dir.fd+"/"+name;
  const visible=fs.lstatSync(visiblePath,{bigint:true});
  if(!visible.isFile()||visible.isSymbolicLink()||
    visible.nlink!==1n||visible.uid!==BigInt(process.getuid())||
    (Number(visible.mode)&0o777)!==0o600||
    visible.size<1n||visible.size>BigInt(MAX))fail("record_not_private");
  const fd=fs.openSync(pinnedPath,fs.constants.O_RDONLY|NOFOLLOW);
  try {
    const opened=fs.fstatSync(fd,{bigint:true});
    if(!strongFile(visible,opened))fail("record_path_not_bound");
    const size=Number(opened.size);
    const content=Buffer.alloc(size+1);
    let total=0;
    while(total<content.length){
      const count=fs.readSync(fd,content,total,content.length-total,total);
      if(count===0)break;
      total+=count;
    }
    if(total!==size)fail("record_changed_during_read");
    if(!strongFile(opened,fs.fstatSync(fd,{bigint:true}))||
      !strongFile(opened,fs.lstatSync(visiblePath,{bigint:true}))) {
      fail("record_rebound_after_read");
    }
    stillPinned(dir);
    return content.subarray(0,total);
  }finally{closeOrFail(fd,"record_read");}
}
function writeAll(fd,bytes){
  let offset=0;
  while(offset<bytes.length){
    const n=fs.writeSync(fd,bytes,offset,bytes.length-offset,null);
    if(n<=0)fail("short_write");
    offset+=n;
  }
}

/**
 * Source-only staging primitive. Caller must preprovision a PRIVATE fence
 * directory. Never deletes created/existing records, including after errors.
 *
 * A successful O_EXCL create is a one-way, durable conflict decision keyed
 * by the prior high-water. A later high-water writer MUST still be explicitly
 * serialized/connected to this fence in a separately reviewed successor.
 */
export function createOnlyBuyVoidCustodyHighWaterFenceRecordV1({
  configured_fence_directory,
  record_bytes,
}={}){
  if(!Buffer.isBuffer(record_bytes)||record_bytes.length<1||
    record_bytes.length>MAX)fail("record_bytes_invalid");
  const parsed=parseBuyVoidCustodyHighWaterTransitionFenceV1(record_bytes);
  const slotId=parsed.record.transition_slot_id;
  if(!SLOT.test(slotId))fail("transition_slot_invalid");
  const file=slotId+".json";
  const dir=openPrivatePinnedRoot(configured_fence_directory);
  let created=false,fd=-1,durable=false;
  try {
    stillPinned(dir);
    const candidate="/proc/self/fd/"+dir.fd+"/"+file;
    try{
      fd=fs.openSync(candidate,fs.constants.O_WRONLY|fs.constants.O_CREAT|
        fs.constants.O_EXCL|NOFOLLOW,0o600);
      created=true;
    }catch(error){
      if(error?.code!=="EEXIST")throw error;
      // No deletion/overwrite, even of an invalid/partial existing slot.
      const existing=readPinnedRecord(dir,file);
      const classification=classifyBuyVoidCustodyHighWaterTransitionFenceSlotV1({
        expected_record_bytes:record_bytes,observed_record_bytes:existing,
      });
      if(classification.status!=="exists_same_transition")fail("slot_conflict");
      // Bring an existing matching slot into this process's durable
      // observation before returning a positive replay result.
      const observedFd=fs.openSync(candidate,fs.constants.O_RDONLY|NOFOLLOW);
      try{
        const st=fs.fstatSync(observedFd,{bigint:true});
        if(st.nlink!==1n||st.uid!==BigInt(process.getuid())||
          (Number(st.mode)&0o777)!==0o600)fail("replayed_slot_invalid");
        fs.fsyncSync(observedFd);
      }finally{closeOrFail(observedFd,"existing_fence");}
      fs.fsyncSync(dir.fd);
      if(!readPinnedRecord(dir,file).equals(record_bytes))fail("replay_changed");
      return Object.freeze({
        status:"exists_same_transition",created:false,
        transition_slot_id:slotId,
        stored_record_sha256:parsed.record_sha256,
        record_durable_observation:true,high_water_mutated:false,
        complete_writer_serialization_verified:false,
        production_allocation_mutation_ready:false,funds_moved:false,
      });
    }
    // Once created, never unlink even if a later step fails: partial or
    // ambiguous records are a permanent recovery HOLD, never silently reaped.
    writeAll(fd,record_bytes);
    fs.fsyncSync(fd);
    closeOrFail(fd,"new_fence");
    fd=-1;
    fs.fsyncSync(dir.fd);
    stillPinned(dir);
    if(!readPinnedRecord(dir,file).equals(record_bytes))fail("postwrite_mismatch");
    durable=true;
    return Object.freeze({
      status:"created",created:true,
      transition_slot_id:slotId,
      stored_record_sha256:parsed.record_sha256,
      record_durable_observation:true,high_water_mutated:false,
      complete_writer_serialization_verified:false,
      production_allocation_mutation_ready:false,funds_moved:false,
    });
  }finally{
    // Do not erase a created record even on a failed fsync or close.
    if(fd>=0)closeOrFail(fd,"error_fence");
    closeOrFail(dir.fd,"fence_directory");
    // created and durable are diagnostic-only local flags: no false authority.
    void created;void durable;
  }
}
