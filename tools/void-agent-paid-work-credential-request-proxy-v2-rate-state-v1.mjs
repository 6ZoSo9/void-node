#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1,
  planVoidAgentCredentialRequestProxyV2RateLimitV1,
} from "./void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs";

export const VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_V1 =
  "VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_V1";

export const VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    exact_proxy_source_planner_reused: true,
    single_process_admission_serialized: true,
    admitted_event_persisted_before_return: true,
    atomic_state_replacement: true,
    file_fsync_required: true,
    parent_directory_fsync_required: true,
    nofollow_state_read_required: true,
    private_state_file_required: true,
    private_state_directory_required: true,
    state_replay_after_restart: true,
    crash_after_persist_before_forward_is_conservative_rate_debit: true,
    multi_process_lock_proven: false,
    live_state_custody_proven: false,
    adapter_stream_binding_proven: false,
    local_transport_trust_proven: false,
    runtime_integration: false,
    credential_issuance: false,
    credential_registry_write: false,
    paid_work_dispatch: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    funds_movement: false,
  });

const MAX_RATE_EVENTS=4096;
const MAX_STATE_BYTES=1024*1024;
const SOURCE_KEY=/^voidcrsrc1_[0-9a-f]{64}$/u;
let tempSequence=0;

function fail(code){throw new Error(code);}
function currentUid(){
  if(typeof process.getuid!=="function") fail("rate_state_uid_unavailable");
  return process.getuid();
}
function sameMeta(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode&&a.nlink===b.nlink&&a.size===b.size&&
    a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
}
function sameDirectoryIdentity(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.gid===b.gid&&
    a.mode===b.mode;
}
function openPrivateParent(stateFile){
  if(typeof stateFile!=="string"||!path.isAbsolute(stateFile)||path.resolve(stateFile)!==stateFile){
    fail("rate_state_path_invalid");
  }
  const parent=path.dirname(stateFile);
  const leaf=path.basename(stateFile);
  if(!leaf||leaf==="."||leaf===".."||leaf.includes("/")||leaf.includes("\\0")){
    fail("rate_state_leaf_invalid");
  }
  let real,visible,fd;
  try{
    real=fs.realpathSync.native(parent);
    visible=fs.lstatSync(parent);
  }catch{fail("rate_state_parent_unavailable");}
  if(
    real!==parent||
    !visible.isDirectory()||
    visible.isSymbolicLink()||
    visible.uid!==currentUid()||
    (visible.mode&0o077)!==0
  ) fail("rate_state_parent_invalid");
  try{
    fd=fs.openSync(
      parent,
      fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW,
    );
  }catch{fail("rate_state_parent_open_failed");}
  try{
    const opened=fs.fstatSync(fd);
    if(!sameDirectoryIdentity(visible,opened)) fail("rate_state_parent_open_identity_mismatch");
    const visibleAfter=fs.lstatSync(parent);
    if(
      !sameDirectoryIdentity(opened,visibleAfter)||
      fs.realpathSync.native(parent)!==parent
    ) fail("rate_state_parent_visible_identity_changed");
    return Object.freeze({
      parent,
      leaf,
      fd,
      dev:opened.dev,
      ino:opened.ino,
      uid:opened.uid,
      gid:opened.gid,
      mode:opened.mode,
    });
  }catch(error){
    fs.closeSync(fd);
    throw error;
  }
}
function closePrivateParent(binding){
  fs.closeSync(binding.fd);
}
function assertPrivateParentStable(binding){
  const opened=fs.fstatSync(binding.fd);
  if(
    opened.dev!==binding.dev||
    opened.ino!==binding.ino||
    opened.uid!==binding.uid||
    opened.gid!==binding.gid||
    opened.mode!==binding.mode||
    !opened.isDirectory()
  ) fail("rate_state_parent_descriptor_changed");
  let visible,real;
  try{
    visible=fs.lstatSync(binding.parent);
    real=fs.realpathSync.native(binding.parent);
  }catch{fail("rate_state_parent_visible_identity_changed");}
  if(
    real!==binding.parent||
    visible.isSymbolicLink()||
    !visible.isDirectory()||
    !sameDirectoryIdentity(opened,visible)
  ) fail("rate_state_parent_visible_identity_changed");
}
function viaPrivateParent(binding,leaf=binding.leaf){
  if(typeof leaf!=="string"||!leaf||leaf.includes("/")||leaf.includes("\\0")){
    fail("rate_state_leaf_invalid");
  }
  return "/proc/self/fd/"+String(binding.fd)+"/"+leaf;
}
function inspectExistingFile(binding){
  const stateVia=viaPrivateParent(binding);
  let meta;
  try{meta=fs.lstatSync(stateVia);}catch(error){
    if(error&&error.code==="ENOENT") return null;
    fail("rate_state_path_lstat_failed");
  }
  if(
    !meta.isFile()||meta.isSymbolicLink()||meta.nlink!==1||
    meta.uid!==currentUid()||(meta.mode&0o077)!==0||
    meta.size<2||meta.size>MAX_STATE_BYTES
  ) fail("rate_state_file_invalid");
  return meta;
}
function readBoundRateState(binding){
  assertPrivateParentStable(binding);
  const existing=inspectExistingFile(binding);
  if(!existing) return Object.freeze([]);
  const stateVia=viaPrivateParent(binding);
  const flags=fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW;
  let fd;
  try{fd=fs.openSync(stateVia,flags);}catch{fail("rate_state_open_failed");}
  try{
    const before=fs.fstatSync(fd);
    if(
      !before.isFile()||before.nlink!==1||before.uid!==currentUid()||
      (before.mode&0o077)!==0||before.size<2||before.size>MAX_STATE_BYTES||
      !sameMeta(existing,before)
    ) fail("rate_state_descriptor_invalid");
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd);
    let visibleAfter;
    try{visibleAfter=fs.lstatSync(stateVia);}catch{fail("rate_state_visible_changed_during_read");}
    if(
      !sameMeta(before,after)||
      !sameMeta(after,visibleAfter)||
      bytes.length!==before.size
    ) fail("rate_state_changed_during_read");
    assertPrivateParentStable(binding);
    return decodeState(bytes);
  }finally{fs.closeSync(fd);}
}
export function readVoidAgentCredentialRequestProxyV2RateStateV1(stateFile){
  const binding=openPrivateParent(stateFile);
  try{return readBoundRateState(binding);}
  finally{closePrivateParent(binding);}
}
function validateEvents(events){
  if(!Array.isArray(events)||events.length>MAX_RATE_EVENTS) fail("rate_state_events_invalid");
  return events.map(event=>{
    if(!event||typeof event!=="object"||Array.isArray(event)||
       Object.keys(event).sort().join("\n")!=="at_ms\nsource_key"||
       !SOURCE_KEY.test(String(event.source_key||""))||
       !Number.isSafeInteger(event.at_ms)||event.at_ms<0){
      fail("rate_state_event_invalid");
    }
    return Object.freeze({source_key:event.source_key,at_ms:event.at_ms});
  });
}
function decodeState(bytes){
  if(!Buffer.isBuffer(bytes)||bytes.length<2||bytes.length>MAX_STATE_BYTES) fail("rate_state_bytes_invalid");
  let value;
  try{value=JSON.parse(bytes.toString("utf8"));}catch{fail("rate_state_json_invalid");}
  if(
    !value||typeof value!=="object"||Array.isArray(value)||
    Object.keys(value).sort().join("\n")!=="events\nmarker\nversion"||
    value.marker!==VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_V1||
    value.version!==1
  ) fail("rate_state_shape_invalid");
  return Object.freeze(validateEvents(value.events));
}
function encodeState(events){
  const body={
    marker:VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_V1,
    version:1,
    events:validateEvents(events),
  };
  const bytes=Buffer.from(JSON.stringify(body)+"\n","utf8");
  if(bytes.length>MAX_STATE_BYTES) fail("rate_state_bytes_exceeded");
  return bytes;
}
function writeBoundStateAtomic(binding,events){
  const bytes=encodeState(events);
  tempSequence+=1;
  const tempName="."+binding.leaf+".tmp."+String(process.pid)+"."+
    String(Date.now())+"."+String(tempSequence);
  const tempVia=viaPrivateParent(binding,tempName);
  const stateVia=viaPrivateParent(binding);
  let fd;
  let created=false;
  let tempIdentity=null;
  try{
    assertPrivateParentStable(binding);
    inspectExistingFile(binding);
    fd=fs.openSync(
      tempVia,
      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,
      0o600,
    );
    created=true;
    tempIdentity=fs.fstatSync(fd);
    if(
      !tempIdentity.isFile()||tempIdentity.isSymbolicLink()||
      tempIdentity.nlink!==1||tempIdentity.uid!==currentUid()||
      (tempIdentity.mode&0o077)!==0
    ) fail("rate_state_temp_descriptor_invalid");
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
    const written=fs.fstatSync(fd);
    if(
      written.dev!==tempIdentity.dev||written.ino!==tempIdentity.ino||
      written.uid!==tempIdentity.uid||written.gid!==tempIdentity.gid
    ) fail("rate_state_temp_descriptor_changed");
    fs.closeSync(fd);
    fd=undefined;
    const tempVisible=fs.lstatSync(tempVia);
    if(
      tempVisible.dev!==tempIdentity.dev||
      tempVisible.ino!==tempIdentity.ino||
      tempVisible.uid!==tempIdentity.uid||
      tempVisible.gid!==tempIdentity.gid
    ) fail("rate_state_temp_visible_identity_changed");
    assertPrivateParentStable(binding);
    fs.renameSync(tempVia,stateVia);
    created=false;
    fs.fsyncSync(binding.fd);
    assertPrivateParentStable(binding);
    const reread=readBoundRateState(binding);
    if(JSON.stringify(reread)!==JSON.stringify(validateEvents(events))) fail("rate_state_postwrite_mismatch");
  }catch(error){
    const cleanupErrors=[];
    if(fd!==undefined){
      try{fs.closeSync(fd);}
      catch(cleanupError){cleanupErrors.push(cleanupError);}
    }
    if(created&&tempIdentity){
      try{
        const visible=fs.lstatSync(tempVia);
        if(visible.dev===tempIdentity.dev&&visible.ino===tempIdentity.ino){
          fs.unlinkSync(tempVia);
          fs.fsyncSync(binding.fd);
        }
      }catch(cleanupError){
        if(cleanupError?.code!=="ENOENT") cleanupErrors.push(cleanupError);
      }
    }
    if(cleanupErrors.length){
      throw new AggregateError(
        [error,...cleanupErrors],
        "rate_state_cleanup_failed",
      );
    }
    throw error;
  }
}
function integer(value,min,max,code){
  if(!Number.isSafeInteger(value)||value<min||value>max) fail(code);
  return value;
}

export function createVoidAgentCredentialRequestProxyV2RateStateV1({
  state_file,
  window_ms,
  max_requests_per_source,
}={}){
  const initialParentBinding=openPrivateParent(state_file);
  closePrivateParent(initialParentBinding);
  integer(window_ms,1000,3600000,"rate_state_window_invalid");
  integer(max_requests_per_source,1,1000,"rate_state_limit_invalid");
  let queue=Promise.resolve();

  const admitUnlocked=async(parsedSource,nowMs)=>{
    integer(nowMs,0,Number.MAX_SAFE_INTEGER,"rate_state_now_invalid");
    const binding=openPrivateParent(state_file);
    try{
      const prior=readBoundRateState(binding);
      const planned=planVoidAgentCredentialRequestProxyV2RateLimitV1({
        parsed_source:parsedSource,
        now_ms:nowMs,
        window_ms,
        max_requests_per_source,
        prior_events:prior,
      });
      if(planned.ok!==true){
        if(planned.status==="RATE_LIMITED"){
          assertPrivateParentStable(binding);
          return Object.freeze({
            ...planned,
            rate_state_durable:true,
            state_file:state_file,
            state_event_count:prior.length,
            forwarded:false,
          });
        }
        fail("rate_state_planner_hold:"+String(planned.reason||"unknown"));
      }
      writeBoundStateAtomic(binding,planned.next_events);
      return Object.freeze({
        ...planned,
        rate_state_durable:true,
        admitted_event_persisted_before_return:true,
        state_file:state_file,
        state_event_count:planned.next_events.length,
        forwarded:false,
        local_transport_trust_proven:false,
        runtime_integration:false,
        authority:VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_AUTHORITY_V1,
      });
    }finally{
      closePrivateParent(binding);
    }
  };

  return Object.freeze({
    marker:VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_V1,
    source_marker:VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_SOURCE_IDENTITY_V1,
    state_file,
    window_ms,
    max_requests_per_source,
    admit(parsedSource,nowMs){
      const result=queue.then(()=>admitUnlocked(parsedSource,nowMs));
      queue=result.then(()=>undefined,()=>undefined);
      return result;
    },
    authority:VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_AUTHORITY_V1,
  });
}
