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
function requirePrivateParent(stateFile){
  if(typeof stateFile!=="string"||!path.isAbsolute(stateFile)||path.resolve(stateFile)!==stateFile){
    fail("rate_state_path_invalid");
  }
  const parent=path.dirname(stateFile);
  let real,meta;
  try{
    real=fs.realpathSync.native(parent);
    meta=fs.lstatSync(parent);
  }catch{fail("rate_state_parent_unavailable");}
  if(
    real!==parent||
    !meta.isDirectory()||
    meta.isSymbolicLink()||
    meta.uid!==currentUid()||
    (meta.mode&0o077)!==0
  ) fail("rate_state_parent_invalid");
  return parent;
}
function sameMeta(a,b){
  return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&
    a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;
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
function inspectExistingFile(stateFile){
  let meta;
  try{meta=fs.lstatSync(stateFile);}catch(error){
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
export function readVoidAgentCredentialRequestProxyV2RateStateV1(stateFile){
  requirePrivateParent(stateFile);
  const existing=inspectExistingFile(stateFile);
  if(!existing) return Object.freeze([]);
  const flags=fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW;
  let fd;
  try{fd=fs.openSync(stateFile,flags);}catch{fail("rate_state_open_failed");}
  try{
    const before=fs.fstatSync(fd);
    if(
      !before.isFile()||before.nlink!==1||before.uid!==currentUid()||
      (before.mode&0o077)!==0||before.size<2||before.size>MAX_STATE_BYTES
    ) fail("rate_state_descriptor_invalid");
    const bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd);
    if(!sameMeta(before,after)||bytes.length!==before.size) fail("rate_state_changed_during_read");
    return decodeState(bytes);
  }finally{fs.closeSync(fd);}
}
function fsyncParent(parent){
  const flags=fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW;
  let fd;
  try{fd=fs.openSync(parent,flags);}catch{fail("rate_state_parent_open_failed");}
  try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function writeStateAtomic(stateFile,events){
  const parent=requirePrivateParent(stateFile);
  inspectExistingFile(stateFile);
  const bytes=encodeState(events);
  tempSequence+=1;
  const temp=stateFile+".tmp."+String(process.pid)+"."+String(Date.now())+"."+String(tempSequence);
  let fd;
  let created=false;
  try{
    fd=fs.openSync(
      temp,
      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,
      0o600,
    );
    created=true;
    fs.writeFileSync(fd,bytes);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd=undefined;
    fs.renameSync(temp,stateFile);
    created=false;
    fsyncParent(parent);
    const reread=readVoidAgentCredentialRequestProxyV2RateStateV1(stateFile);
    if(JSON.stringify(reread)!==JSON.stringify(validateEvents(events))) fail("rate_state_postwrite_mismatch");
  }catch(error){
    if(fd!==undefined){try{fs.closeSync(fd);}catch{}}
    if(created){try{fs.rmSync(temp,{force:true});}catch{}}
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
  requirePrivateParent(state_file);
  integer(window_ms,1000,3600000,"rate_state_window_invalid");
  integer(max_requests_per_source,1,1000,"rate_state_limit_invalid");
  let queue=Promise.resolve();

  const admitUnlocked=async(parsedSource,nowMs)=>{
    integer(nowMs,0,Number.MAX_SAFE_INTEGER,"rate_state_now_invalid");
    const prior=readVoidAgentCredentialRequestProxyV2RateStateV1(state_file);
    const planned=planVoidAgentCredentialRequestProxyV2RateLimitV1({
      parsed_source:parsedSource,
      now_ms:nowMs,
      window_ms,
      max_requests_per_source,
      prior_events:prior,
    });
    if(planned.ok!==true){
      if(planned.status==="RATE_LIMITED"){
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
    writeStateAtomic(state_file,planned.next_events);
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
