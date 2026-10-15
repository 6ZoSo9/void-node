#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  parseVoidAgentCredentialRequestProxyV2SourceV1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-source-v1.mjs";
import {
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_AUTHORITY_V1,
  VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_V1,
  createVoidAgentCredentialRequestProxyV2RateStateV1,
  readVoidAgentCredentialRequestProxyV2RateStateV1,
} from "../tools/void-agent-paid-work-credential-request-proxy-v2-rate-state-v1.mjs";

const SIGNATURE=Buffer.from([0x0d,0x0a,0x0d,0x0a,0x00,0x0d,0x0a,0x51,0x55,0x49,0x54,0x0a]);
function proxy4(a,b,c,d,sourcePort=50000){
  const address=Buffer.alloc(12);
  address.set([a,b,c,d],0);
  address.set([127,0,0,1],4);
  address.writeUInt16BE(sourcePort,8);
  address.writeUInt16BE(443,10);
  const header=Buffer.alloc(16);
  SIGNATURE.copy(header,0);
  header[12]=0x21;
  header[13]=0x11;
  header.writeUInt16BE(address.length,14);
  return Buffer.concat([header,address]);
}
const sourceA=parseVoidAgentCredentialRequestProxyV2SourceV1(proxy4(203,0,113,10));
const sourceB=parseVoidAgentCredentialRequestProxyV2SourceV1(proxy4(203,0,113,11));
assert.equal(sourceA.ok,true);
assert.equal(sourceB.ok,true);

const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-credential-rate-state-v1-"));
fs.chmodSync(root,0o700);
try{
  const stateFile=path.join(root,"rate-state.json");
  const store=createVoidAgentCredentialRequestProxyV2RateStateV1({
    state_file:stateFile,
    window_ms:60_000,
    max_requests_per_source:2,
  });
  const originalOpenForAdmission=fs.openSync;
  let canonicalParentOpenCount=0;
  fs.openSync=function(file,...args){
    if(file===root) canonicalParentOpenCount+=1;
    return originalOpenForAdmission.call(fs,file,...args);
  };
  const [a1,a2]=await Promise.all([
    store.admit(sourceA,1_000),
    store.admit(sourceA,1_000),
  ]);
  assert.equal(a1.ok,true);
  assert.equal(a2.ok,true);
  assert.equal(a1.source_request_count_after,1);
  assert.equal(a2.source_request_count_after,2);
  assert.equal(a1.admitted_event_persisted_before_return,true);
  assert.equal(a2.admitted_event_persisted_before_return,true);
  fs.openSync=originalOpenForAdmission;
  assert.equal(
    canonicalParentOpenCount,
    2,
    "each serialized admission must retain exactly one parent FD across read-plan-write",
  );

  const a3=await store.admit(sourceA,1_000);
  assert.equal(a3.ok,false);
  assert.equal(a3.status,"RATE_LIMITED");
  assert.equal(a3.forwarded,false);

  const b1=await store.admit(sourceB,1_000);
  assert.equal(b1.ok,true);
  assert.equal(b1.source_request_count_after,1);

  let events=readVoidAgentCredentialRequestProxyV2RateStateV1(stateFile);
  assert.equal(events.length,3);
  assert.deepEqual(events.map(x=>x.source_key),[
    sourceA.limiter_source_key,
    sourceA.limiter_source_key,
    sourceB.limiter_source_key,
  ]);
  const meta=fs.lstatSync(stateFile);
  assert.equal(meta.isFile(),true);
  assert.equal(meta.isSymbolicLink(),false);
  assert.equal(meta.nlink,1);
  assert.equal(meta.uid,process.getuid());
  assert.equal(meta.mode&0o077,0);

  const restarted=createVoidAgentCredentialRequestProxyV2RateStateV1({
    state_file:stateFile,
    window_ms:60_000,
    max_requests_per_source:2,
  });
  const replay=await restarted.admit(sourceA,1_001);
  assert.equal(replay.ok,false);
  assert.equal(replay.status,"RATE_LIMITED");

  const afterWindow=await restarted.admit(sourceA,61_001);
  assert.equal(afterWindow.ok,true);
  events=readVoidAgentCredentialRequestProxyV2RateStateV1(stateFile);
  assert.equal(events.length,1);
  assert.equal(events[0].source_key,sourceA.limiter_source_key);
  assert.equal(events[0].at_ms,61_001);

  const corrupt=path.join(root,"corrupt.json");
  fs.writeFileSync(corrupt,"{bad}\n",{mode:0o600});
  await assert.rejects(
    ()=>createVoidAgentCredentialRequestProxyV2RateStateV1({
      state_file:corrupt,window_ms:60_000,max_requests_per_source:2,
    }).admit(sourceA,70_000),
    /rate_state_json_invalid/u,
  );

  const permissive=path.join(root,"permissive.json");
  fs.writeFileSync(permissive,JSON.stringify({
    marker:VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_V1,
    version:1,events:[],
  })+"\n",{mode:0o644});
  assert.throws(
    ()=>readVoidAgentCredentialRequestProxyV2RateStateV1(permissive),
    /rate_state_file_invalid/u,
  );

  const parentRaceRoot=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-credential-rate-parent-race-v1-"),
  );
  fs.chmodSync(parentRaceRoot,0o700);
  try{
    const parent=path.join(parentRaceRoot,"state");
    const detached=path.join(parentRaceRoot,"state-detached");
    const redirect=path.join(parentRaceRoot,"redirect");
    fs.mkdirSync(parent,{mode:0o700});
    fs.mkdirSync(redirect,{mode:0o700});
    const raceState=path.join(parent,"rate-state.json");
    const raceStore=createVoidAgentCredentialRequestProxyV2RateStateV1({
      state_file:raceState,window_ms:60_000,max_requests_per_source:2,
    });
    const originalOpen=fs.openSync;
    const originalRename=fs.renameSync;
    const originalSymlink=fs.symlinkSync;
    let swapped=false;
    fs.openSync=function(file,...args){
      const fd=originalOpen.call(fs,file,...args);
      if(
        !swapped&&typeof file==="string"&&
        file.includes("/proc/self/fd/")&&file.includes(".rate-state.json.tmp.")
      ){
        swapped=true;
        originalRename.call(fs,parent,detached);
        originalSymlink.call(fs,redirect,parent,"dir");
      }
      return fd;
    };
    try{
      await assert.rejects(
        ()=>raceStore.admit(sourceA,80_000),
        /rate_state_parent_visible_identity_changed/u,
      );
    }finally{
      fs.openSync=originalOpen;
    }
    assert.equal(swapped,true);
    assert.equal(fs.existsSync(path.join(redirect,"rate-state.json")),false);
    assert.equal(
      fs.readdirSync(detached).some(name=>name.includes(".tmp.")),
      false,
      "bound-parent failure must clean its own temp inode",
    );
  }finally{
    fs.rmSync(parentRaceRoot,{recursive:true,force:true});
  }

  const tempRaceRoot=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-credential-rate-temp-race-v1-"),
  );
  fs.chmodSync(tempRaceRoot,0o700);
  try{
    const tempState=path.join(tempRaceRoot,"rate-state.json");
    const tempStore=createVoidAgentCredentialRequestProxyV2RateStateV1({
      state_file:tempState,window_ms:60_000,max_requests_per_source:2,
    });
    const originalOpen=fs.openSync;
    const originalWriteFile=fs.writeFileSync;
    const originalRename=fs.renameSync;
    let tempPath="";
    let tempVisiblePath="";
    let injected=false;
    fs.openSync=function(file,...args){
      const fd=originalOpen.call(fs,file,...args);
      if(
        typeof file==="string"&&file.includes("/proc/self/fd/")&&
        file.includes(".rate-state.json.tmp.")
      ){
        tempPath=file;
        tempVisiblePath=path.join(tempRaceRoot,path.basename(file));
      }
      return fd;
    };
    fs.writeFileSync=function(file,...args){
      const result=originalWriteFile.call(fs,file,...args);
      if(!injected&&typeof file==="number"&&tempPath){
        injected=true;
        originalRename.call(fs,tempPath,tempPath+".created");
        originalWriteFile.call(fs,tempPath,Buffer.from("foreign\n","utf8"),{mode:0o600});
        throw new Error("synthetic_rate_state_temp_postcreate_failure");
      }
      return result;
    };
    try{
      await assert.rejects(
        ()=>tempStore.admit(sourceB,90_000),
        /synthetic_rate_state_temp_postcreate_failure/u,
      );
    }finally{
      fs.openSync=originalOpen;
      fs.writeFileSync=originalWriteFile;
    }
    assert.equal(injected,true);
    assert.ok(tempVisiblePath,"canonical temp path was not captured");
    assert.equal(fs.readFileSync(tempVisiblePath,"utf8"),"foreign\n",
      "cleanup must not unlink substituted foreign temp inode");
    assert.equal(fs.existsSync(tempVisiblePath+".created"),true);
  }finally{
    fs.rmSync(tempRaceRoot,{recursive:true,force:true});
  }

  const target=path.join(root,"target.json");
  fs.writeFileSync(target,JSON.stringify({
    marker:VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_V1,
    version:1,events:[],
  })+"\n",{mode:0o600});
  const alias=path.join(root,"alias.json");
  fs.symlinkSync(target,alias);
  assert.throws(
    ()=>readVoidAgentCredentialRequestProxyV2RateStateV1(alias),
    /rate_state_file_invalid/u,
  );

  assert.equal(
    VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_AUTHORITY_V1
      .single_process_admission_serialized,
    true,
  );
  assert.equal(
    VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_AUTHORITY_V1
      .multi_process_lock_proven,
    false,
  );
  assert.equal(
    VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_AUTHORITY_V1
      .live_state_custody_proven,
    false,
  );
  console.log("VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_V1_GREEN");
  console.log("caller_a_exhaustion_does_not_deny_caller_b=true");
  console.log("concurrent_admission_serialized=true");
  console.log("accepted_event_persisted_before_return=true");
  console.log("restart_replay_preserved=true");
  console.log("expired_events_compacted_on_next_admission=true");
  console.log("private_descriptor_checked_state=true");
  console.log("retained_parent_descriptor_bound=true");
  console.log("single_parent_binding_spans_read_plan_write=true");
  console.log("parent_namespace_substitution_rejected=true");
  console.log("foreign_temp_inode_not_unlinked=true");
  console.log("multi_process_lock_proven=false");
  console.log("live_state_custody_proven=false");
  console.log("runtime_integration=false");
  console.log("funds_movement=false");
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
