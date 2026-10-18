#!/usr/bin/env node
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  canonicalApollyonClaimContractJsonV1,
} from "../tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  serializeApollyonDurableAttemptClaimPublishRequestV2,
} from "../tools/apollyon-durable-attempt-claim-request-envelope-v2.mjs";
import {
  qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
} from "../tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs";
import {
  qualifyApollyonDurableAttemptClaimStorePolicyV2,
} from "../tools/apollyon-durable-attempt-claim-store-contract-v2.mjs";
import {
  VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_AUTHORITY_V2,
  createApollyonDurableAttemptClaimStoreServiceCoreV2,
  prepareApollyonDurableAttemptClaimPublisherForwardV2,
} from "../tools/apollyon-durable-attempt-claim-store-service-source-implementation-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const TARGET_REL=
  "tools/apollyon-durable-attempt-claim-store-service-source-implementation-v2.mjs";
const TARGET_BLOB="e1329dece0caa2c8c3db142589b5c1c83e6c1076";

const PINNED=Object.freeze({
  [TARGET_REL]:TARGET_BLOB,
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs":
    "93582c324ca85aeff56eb61f82b32f1e4c18dfe9",
  "tools/apollyon-durable-attempt-claim-request-envelope-v2.mjs":
    "d1726e3be042549769d2fe554371facd2ed60553",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs":
    "6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs":
    "d67ef39c4cd034844fb0862e180de46ed4cd0c88",
  "tools/apollyon-durable-attempt-claim-native-peer-guard-integration-v2.mjs":
    "394b9dbaebbdbb561be6119f5be8b60d59fb367d",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
});

const WORKFLOW_REL=
  ".github/workflows/apollyon-durable-attempt-claim-store-service-source-implementation-v2.yml";
const EXPECTED_TRIGGER_PATHS=Object.freeze([
  WORKFLOW_REL,
  "docs/security/apollyon-durable-attempt-claim-store-service-source-implementation-v2.md",
  TARGET_REL,
  "scripts/prove_apollyon_durable_attempt_claim_store_service_source_implementation_v2.mjs",
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs",
  "tools/apollyon-durable-attempt-claim-request-envelope-v2.mjs",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs",
  "tools/apollyon-durable-attempt-claim-native-peer-guard-integration-v2.mjs",
  "tools/apollyon-durable-attempt-claim-revalidation-handoff-v2.mjs",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs",
  "ops/xiphos/apollyon_durable_attempt_claim_native_peer_guard_v2.c",
  "scripts/prove_apollyon_durable_attempt_claim_native_peer_guard_v2.mjs",
]);

const SESSION_ID="apollyon_claim_source_session_v2:"+"e".repeat(64);
const uid=process.getuid();
const gid=process.getgid();
const O_DIRECTORY=fs.constants.O_DIRECTORY??0;
const O_CLOEXEC=fs.constants.O_CLOEXEC??0;
const STORE_POLICY=qualifyApollyonDurableAttemptClaimStorePolicyV2();

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
function canonical(value){
  return canonicalApollyonClaimContractJsonV1(value);
}
function bytes(value){
  return Buffer.from(canonical(value)+"\n","utf8");
}
function mode(st){return st.mode&0o7777;}
function rootIdentity(st){
  return {
    dev:String(st.dev),
    ino:String(st.ino),
    mode:mode(st),
    uid:st.uid,
    gid:st.gid,
    nlink:st.nlink,
    size:st.size,
  };
}
function writeCanonical(file,value){
  fs.writeFileSync(file,bytes(value),{mode:0o600});
  fs.chmodSync(file,0o600);
}
function generationRecord(rootIdentitySha,seed="2"){
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_V2",
    version:2,
    status:"durable_attempt_claim_store_generation_v2",
    store_policy_id:STORE_POLICY.store_policy_id,
    store_generation_id:"apollyon_claim_store_generation_v2:"+seed.repeat(64),
    root_identity_sha256:rootIdentitySha,
    genesis:true,
    predecessor_store_generation_id:null,
    claim_history_count:0,
    claim_history_sha256:"3".repeat(64),
    generation_lineage_count:1,
    generation_lineage_sha256:"4".repeat(64),
    continuity_receipt_id:"apollyon_claim_store_continuity_v2:"+"5".repeat(64),
  };
  return {
    ...material,
    store_generation_record_id:"apollyon_claim_store_generation_record_v2:"+
      sha256(Buffer.from(canonical(material),"utf8")),
  };
}
function claimRecord(generation,{terminalSeed="6",requestSeed="7",treeSeed="b"}={}){
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_V2",
    version:2,
    status:"durable_candidate_training_attempt_claim_record_v2",
    store_contract_id:"apollyon_claim_store_contract_v2:"+"1".repeat(64),
    store_policy_id:STORE_POLICY.store_policy_id,
    store_generation_id:generation.store_generation_id,
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+terminalSeed.repeat(64),
    terminal_runner_receipt_sha256:"8".repeat(64),
    authorization_id:"apollyon_authz_v1:"+"9".repeat(64),
    custody_generation_id:"apollyon_custody_generation_v1:"+"a".repeat(64),
    custody_record_sha256:"b".repeat(64),
    request_sha256:requestSeed.repeat(64),
    canonical_main:"c".repeat(40),
    canonical_tree:treeSeed.repeat(40),
    corpus_sha256:"d".repeat(64),
    parent_adapter_sha256:"e".repeat(64),
    operator_public_key_raw_sha256:"f".repeat(64),
    attempt_limit:1,
    automatic_retry_authorized:false,
  };
  return {
    ...material,
    claim_record_id:"apollyon_attempt_claim_record_v2:"+
      sha256(Buffer.from(canonical(material),"utf8")),
  };
}
function requestBundle(record){
  const request={
    claim_record:record,
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_V2",
    method:"publish_claim_v2",
    store_contract_id:record.store_contract_id,
    store_policy_id:record.store_policy_id,
    version:2,
  };
  const requestBytes=serializeApollyonDurableAttemptClaimPublishRequestV2(request);
  const publishRequestSha=sha256(requestBytes);
  const slot=qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1({
    store_policy_id:record.store_policy_id,
    authorization_id:record.authorization_id,
    store_contract_id:record.store_contract_id,
    store_generation_id:record.store_generation_id,
    terminal_receipt_id:record.terminal_receipt_id,
    claim_record_id:record.claim_record_id,
    claim_record_sha256:sha256(bytes(record)),
    publish_request_sha256:publishRequestSha,
    attempt_limit:1,
    automatic_retry_authorized:false,
  });
  return {request,requestBytes,publishRequestSha,slot};
}
function slotLeaf(slot){
  return "authorization-slot-v1-"+
    slot.authorization_slot_id.split(":")[1]+".json";
}
function claimLeaf(record){
  return "claim-v2-"+record.claim_record_id.split(":")[1]+".json";
}
function generationLeaf(generation){
  return "store-generation-v2-"+
    generation.store_generation_id.split(":")[1]+".json";
}
function revalidationReceipt(stage,context){
  return {
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_LOCAL_REVALIDATION_V2",
    version:2,
    stage,
    session_binding_id:SESSION_ID,
    publish_request_sha256:context.publish_request_sha256,
    store_generation_record_id:context.generation.store_generation_record_id,
    store_generation_id:context.generation.store_generation_id,
    authorization_slot_id:context.slot.authorization_slot_id,
    authorization_slot_record_id:context.slot.authorization_slot_record_id,
    claim_record_id:context.record.claim_record_id,
    local_revalidation_passed:true,
    source_contract_only:true,
    host_proven:false,
  };
}

for(const [relative,expected] of Object.entries(PINNED)){
  const file=path.join(ROOT,relative);
  assert.equal(gitBlob(fs.readFileSync(file)),expected,relative);
}

const workflow=fs.readFileSync(path.join(ROOT,WORKFLOW_REL),"utf8");
function eventTriggerPaths(eventName,nextEventName){
  const lines=workflow.split("\n");
  const start=lines.indexOf("  "+eventName+":");
  const end=lines.indexOf("  "+nextEventName+":",start+1);
  assert.notEqual(start,-1,eventName+" marker");
  assert.notEqual(end,-1,nextEventName+" marker");
  const section=lines.slice(start+1,end);
  const pathsIndex=section.indexOf("    paths:");
  assert.notEqual(pathsIndex,-1,eventName+" paths");
  const values=[];
  for(let index=pathsIndex+1;index<section.length;index++){
    const line=section[index];
    const match=/^      - "([^"]+)"$/u.exec(line);
    if(match){values.push(match[1]);continue;}
    if(/^\s*$/u.test(line))continue;
    if(!line.startsWith("      "))break;
    assert.fail(eventName+" malformed path entry: "+line);
  }
  assert.equal(values.length,new Set(values).size,eventName+" duplicate path");
  return values;
}
const pullPaths=eventTriggerPaths("pull_request","push");
const pushPaths=eventTriggerPaths("push","workflow_dispatch");
assert.deepEqual([...pullPaths].sort(),[...EXPECTED_TRIGGER_PATHS].sort());
assert.deepEqual([...pushPaths].sort(),[...EXPECTED_TRIGGER_PATHS].sort());
assert.deepEqual([...pullPaths].sort(),[...pushPaths].sort());

const targetSource=fs.readFileSync(path.join(ROOT,TARGET_REL),"utf8");
for(const required of [
  'fixed_claim_state_root:"/var/lib/void-apollyon-attempt-claim-v2"',
  'active_generation_leaf:"active-generation-v2.json"',
  'generation_directory:"store-generations-v2"',
  'authorization_slot_directory:"authorization-slots-v1"',
  'claim_directory:"claims-v2"',
  'pending_directory:".pending-v2"',
  'training_start_consumption_directory:"training-start-consumption-v1"',
  "caller_supplied_exclusive_transaction_is_host_proof:false",
  "caller_supplied_revalidator_is_host_proof:false",
  "non_root_claim_identity_required:true",
  "fs.constants.O_RDWR|fs.constants.O_CREAT",
  "cleanupUnlinkedPending",
  "apollyon_claim_store_impl_v2_legacy_transaction_wrapper_forbidden",
  "apollyon_claim_store_impl_v2_transaction_lease_invalid",
  "apollyon_claim_store_impl_v2_transaction_core_unusable",
  "fs.fsyncSync(pendingFd)",
  "fs.linkSync(pendingPath,finalPath)",
  "apollyon_claim_store_impl_v2_orphan_claim_without_slot",
  '"before_slot_publication"',
  '"after_slot_before_claim"',
  '"before_success_ack"',
  'next_gate:"apollyon_durable_attempt_claim_store_service_runtime_integration_v2"',
]){
  assert.ok(targetSource.includes(required),required);
}
for(const forbidden of [
  "net.createServer",
  ".listen(",
  "systemctl",
  "child_process",
  "eth_send",
  "createPrivateKey",
  "production_claim_store_mutation_performed:true",
  "production_durable_attempt_claim_performed:true",
  "attempt_claim_authorized:true",
  "training_execution_authorized:true",
]){
  assert.equal(targetSource.includes(forbidden),false,forbidden);
}

function fixture({
  throwStage=null,
  mutateGenerationStage=null,
  asyncRevalidator=false,
  acquire=null,
  release=null,
  onRevalidate=null,
}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-apollyon-claim-store-v2-"));
  fs.chmodSync(root,0o700);
  for(const name of [
    VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.generation_directory,
    VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory,
    VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
    VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.pending_directory,
    VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.training_start_consumption_directory,
  ]){
    const directory=path.join(root,name);
    fs.mkdirSync(directory,{mode:0o700});
    fs.chmodSync(directory,0o700);
  }
  const active=path.join(root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.active_generation_leaf);
  fs.writeFileSync(active,"{}\n",{mode:0o600});
  fs.chmodSync(active,0o600);

  const rootFd=fs.openSync(root,fs.constants.O_RDONLY|O_DIRECTORY|O_CLOEXEC);
  const stages=[];
  const events=[];
  const acquisitionContexts=[];
  const leases=[];
  let txCount=0;
  let releaseCount=0;
  let generation=null;
  const config={
    root_fd:rootFd,
    claim_uid:uid,
    claim_gid:gid,
    session_binding_id:SESSION_ID,
    acquireExclusiveStoreTransaction(context){
      txCount+=1;
      events.push("acquire");
      acquisitionContexts.push(context);
      const lease={
        release(...args){
          releaseCount+=1;
          events.push("release");
          assert.equal(this,lease,"release receiver is the acquired lease");
          assert.equal(args.length,0,"release receives no transaction capability");
          return release===null?undefined:release(context,lease);
        },
      };
      leases.push(lease);
      return acquire===null?lease:acquire(context,lease);
    },
    revalidate(stage,context){
      stages.push(stage);
      events.push(stage);
      if(onRevalidate!==null)onRevalidate(stage,context);
      if(asyncRevalidator)return Promise.resolve(revalidationReceipt(stage,context));
      if(stage===mutateGenerationStage){
        const drift=generationRecord(
          sha256(Buffer.from(canonical(rootIdentity(fs.fstatSync(rootFd))),"utf8")),
          "0",
        );
        writeCanonical(active,drift);
      }
      if(stage===throwStage){
        throw new Error("fixture_stage_failure");
      }
      return revalidationReceipt(stage,context);
    },
  };
  const core=createApollyonDurableAttemptClaimStoreServiceCoreV2(config);
  const expectedRootHash=sha256(
    Buffer.from(canonical(rootIdentity(fs.fstatSync(rootFd))),"utf8")
  );
  assert.equal(core.root_identity_sha256,expectedRootHash);
  assert.equal(core.root_identity_scheme,"canonical_dev_ino_mode_uid_gid_nlink_size_v1");
  generation=generationRecord(expectedRootHash);
  writeCanonical(active,generation);
  writeCanonical(
    path.join(
      root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.generation_directory,
      generationLeaf(generation),
    ),
    generation,
  );
  return {
    root,rootFd,active,core,config,stages,events,leases,acquisitionContexts,
    txCount:()=>txCount,
    releaseCount:()=>releaseCount,
    generation,
    cleanup(){
      try{fs.closeSync(rootFd);}
      finally{fs.rmSync(root,{recursive:true,force:true});}
    },
  };
}

function publishInput(bundle,generation){
  return {
    authorization_slot_record:bundle.slot,
    expected_store_generation_record:generation,
    request_bytes:bundle.requestBytes,
  };
}
function observationInput(bundle,generation){
  return {
    authorization_id:bundle.request.claim_record.authorization_id,
    expected_store_generation_record:generation,
    request_bytes:bundle.requestBytes,
  };
}
function recordPaths(f,bundle){
  return {
    active:f.active,
    generation:path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.generation_directory,
      generationLeaf(f.generation)),
    slot:path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory,
      slotLeaf(bundle.slot)),
    claim:path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
      claimLeaf(bundle.request.claim_record)),
  };
}
function storeSnapshot(root){
  const rows=[];
  const visit=relative=>{
    const absolute=path.join(root,relative);
    const st=fs.lstatSync(absolute,{bigint:true});
    const row={path:relative};
    for(const key of ["dev","ino","mode","uid","gid","nlink","size","mtimeNs","ctimeNs"]){
      row[key]=String(st[key]);
    }
    row.type=st.isDirectory()?"directory":st.isFile()?"file":st.isSymbolicLink()?"symlink":"other";
    if(st.isFile())row.sha256=sha256(fs.readFileSync(absolute));
    if(st.isSymbolicLink())row.target=fs.readlinkSync(absolute);
    rows.push(row);
    if(st.isDirectory()){
      for(const name of fs.readdirSync(absolute).sort())visit(path.join(relative,name));
    }
  };
  visit("");
  return rows;
}
function requireFrozenObservation(value){
  const visit=row=>{
    if(row===null||typeof row!=="object")return;
    assert.equal(Buffer.isBuffer(row),false,"observation exposes no mutable byte buffer");
    assert.equal(ArrayBuffer.isView(row),false);
    assert.equal(Object.isFrozen(row),true,"every observation record is frozen");
    for(const [key,child] of Object.entries(row)){
      assert.equal(/(?:^|_)fd(?:$|_)/u.test(key),false,"observation exposes no descriptor");
      visit(child);
    }
  };
  visit(value);
}
function withReadOnlyFs(run){
  const denied=[];
  const names=[
    "writeSync","writevSync","writeFileSync","appendFileSync","truncateSync",
    "ftruncateSync","fsyncSync","fdatasyncSync","linkSync","unlinkSync",
    "renameSync","mkdirSync","mkdtempSync","rmSync","rmdirSync","chmodSync",
    "fchmodSync","chownSync","fchownSync","lchmodSync","lchownSync",
    "symlinkSync","copyFileSync","cpSync","utimesSync","futimesSync","lutimesSync",
  ].filter(name=>typeof fs[name]==="function");
  const originals=new Map(names.map(name=>[name,fs[name]]));
  const originalOpen=fs.openSync;
  for(const name of names){
    fs[name]=()=>{denied.push(name);throw ioError("fixture_readonly_api_denied:"+name);};
  }
  fs.openSync=function readonlyOpen(pathname,flags,...args){
    if(typeof flags!=="number"||(flags&(
      fs.constants.O_WRONLY|fs.constants.O_RDWR|fs.constants.O_CREAT|
      fs.constants.O_TRUNC|fs.constants.O_APPEND
    ))!==0){
      denied.push("openSync:write");
      throw ioError("fixture_readonly_open_denied");
    }
    assert.equal(String(pathname).includes(VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.pending_directory),
      false,"observation never opens pending recovery state");
    return originalOpen(pathname,flags,...args);
  };
  try{return run();}
  finally{
    fs.openSync=originalOpen;
    for(const [name,original] of originals)fs[name]=original;
    assert.deepEqual(denied,[],"observation invokes no mutating filesystem API");
  }
}
function withRecordInterleaving(file,{afterStat=null,afterRead=null}={},run){
  const originalStat=fs.fstatSync;
  const originalRead=fs.readSync;
  const initial=fs.lstatSync(file,{bigint:true});
  let injected=false;
  const matches=st=>String(st.dev)===String(initial.dev)&&String(st.ino)===String(initial.ino);
  fs.fstatSync=function interleavedStat(fd,...args){
    const st=originalStat(fd,...args);
    if(!injected&&afterStat!==null&&matches(st)){
      injected=true;
      afterStat(initial);
    }
    return st;
  };
  fs.readSync=function interleavedRead(fd,...args){
    const count=originalRead(fd,...args);
    if(!injected&&afterRead!==null&&count>0&&matches(originalStat(fd,{bigint:true}))){
      injected=true;
      afterRead(initial);
    }
    return count;
  };
  try{return run();}
  finally{
    fs.fstatSync=originalStat;
    fs.readSync=originalRead;
    assert.equal(injected,true,"the intended filesystem interleaving was reached");
  }
}
function requireRecordMetadata(file){
  const st=fs.lstatSync(file);
  assert.equal(st.isFile(),true);
  assert.equal(st.isSymbolicLink(),false);
  assert.equal(st.uid,uid);
  assert.equal(st.gid,gid);
  assert.equal(mode(st),0o600);
  assert.equal(st.nlink,1);
}
function requirePendingEmpty(f){
  assert.deepEqual(
    fs.readdirSync(path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.pending_directory)),
    [],
  );
}
function expectError(fn,code){
  let observed;
  assert.throws(fn,error=>{
    observed=error;
    return String(error?.message||error).includes(code);
  });
  return observed;
}

function requireStoreUnchanged(f){
  for(const name of [
    VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory,
    VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
    VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.pending_directory,
  ]){
    assert.deepEqual(fs.readdirSync(path.join(f.root,name)),[],name);
  }
}
function requireCleanupDiagnostics(error,role,code){
  assert.equal(Object.isFrozen(error.cleanup_errors),true);
  assert.ok(error.cleanup_errors.length>0);
  for(const entry of error.cleanup_errors){
    assert.equal(Object.isFrozen(entry),true);
    assert.deepEqual(Object.keys(entry).sort(),["code","error_code","role"]);
    assert.equal(typeof entry.code,"string");
    assert.equal(typeof entry.role,"string");
  }
  assert.ok(error.cleanup_errors.some(entry=>entry.role===role&&entry.code===code));
}
function requireCoreUnusable(f,input){
  const count=f.txCount();
  expectError(
    ()=>f.core.publishClaim(input),
    "apollyon_claim_store_impl_v2_transaction_core_unusable",
  );
  assert.equal(f.txCount(),count,"poisoned core must not reacquire");
}
const TRANSACTION_DIRECTORIES=new Set([
  VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.generation_directory,
  VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory,
  VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
  VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.pending_directory,
]);
function isTransactionDirectory(entry){
  return entry!==undefined&&
    (entry.flags&O_DIRECTORY)!==0&&
    TRANSACTION_DIRECTORIES.has(path.basename(entry.pathname));
}
function isOwnedRoot(entry,f){
  return entry!==undefined&&(entry.flags&O_DIRECTORY)!==0&&
    entry.pathname==="/proc/self/fd/"+f.rootFd;
}
function ioError(message){
  const error=new Error(message);
  error.code="EIO";
  return error;
}
function withObservedFs({beforeOpen=null,afterOpen=null,afterClose=null}={},run){
  const originalOpen=fs.openSync;
  const originalClose=fs.closeSync;
  const held=new Map();
  const opened=[];
  const closed=[];
  fs.openSync=function observedOpen(pathname,flags,...args){
    if(beforeOpen!==null)beforeOpen(String(pathname),flags);
    const fd=originalOpen(pathname,flags,...args);
    const entry={fd,pathname:String(pathname),flags,serial:opened.length};
    held.set(fd,entry);
    opened.push(entry);
    if(afterOpen!==null)afterOpen(entry);
    return fd;
  };
  fs.closeSync=function observedClose(fd){
    const entry=held.get(fd);
    if(entry!==undefined){
      closed.push(entry);
      held.delete(fd);
    }
    // An injected error follows the actual close. Retrying this FD would be wrong.
    const result=originalClose(fd);
    if(afterClose!==null)afterClose(entry);
    return result;
  };
  try{return run({opened,closed});}
  finally{
    fs.openSync=originalOpen;
    fs.closeSync=originalClose;
  }
}
function inodeKey(st){return String(st.dev)+":"+String(st.ino);}
function withFsyncTrace(run){
  const original=fs.fsyncSync;
  const trace=[];
  fs.fsyncSync=function tracedFsync(fd){
    const st=fs.fstatSync(fd,{bigint:true});
    const result=original(fd);
    trace.push({identity:inodeKey(st),type:st.isFile()?"file":st.isDirectory()?"directory":"other"});
    return result;
  };
  try{return run(trace);}
  finally{fs.fsyncSync=original;}
}
function requireFinalDurabilityTrace(file,trace){
  const finalIdentity=inodeKey(fs.lstatSync(file,{bigint:true}));
  const directoryIdentity=inodeKey(fs.lstatSync(path.dirname(file),{bigint:true}));
  const fileIndex=trace.findIndex(row=>row.type==="file"&&row.identity===finalIdentity);
  assert.ok(fileIndex>=0,"the actual final inode was fsynced before durable success");
  assert.ok(trace.some((row,index)=>index>fileIndex&&row.type==="directory"&&
    row.identity===directoryIdentity),"target directory was fsynced after its final inode");
}

{
  const record=claimRecord(generationRecord("a".repeat(64)));
  const request=requestBundle(record);
  const expectedHex=request.requestBytes.toString("hex");
  const expectedJson=request.requestBytes.toString("utf8");
  let callerCopyCalls=0;
  request.requestBytes.copy=function hostileCopy(){
    callerCopyCalls+=1;
    assert.fail("caller copy override received the private destination");
  };
  const forward=prepareApollyonDurableAttemptClaimPublisherForwardV2(request.requestBytes);
  assert.equal(callerCopyCalls,0);
  const expectedSha=forward.publish_request_sha256;
  request.requestBytes.fill(0);
  const first=forward.exact_request_bytes;
  assert.equal(first.toString("hex"),expectedHex);
  first.fill(0x11);
  const second=forward.exact_request_bytes;
  assert.notEqual(first,second);
  assert.notEqual(first.buffer,second.buffer,"forward copies have independent backing stores");
  assert.equal(second.toString("hex"),expectedHex);
  new Uint8Array(second.buffer).fill(0x22);
  const third=forward.exact_request_bytes;
  assert.equal(third.toString("hex"),expectedHex);
  assert.equal(sha256(third),expectedSha);
  assert.equal(third.toString("utf8"),expectedJson);
  assert.deepEqual(JSON.parse(third.toString("utf8")),forward.request);
  assert.equal(Object.isFrozen(forward),true);
  assert.equal(Object.isFrozen(forward.request),true);
  assert.equal(Object.isFrozen(forward.request.claim_record),true);
  assert.throws(()=>{forward.request.claim_record.claim_record_id="tampered";},TypeError);
  assert.throws(()=>{forward.request.claim_record={};},TypeError);
  assert.equal(sha256(forward.exact_request_bytes),forward.publish_request_sha256);
  assert.deepEqual(JSON.parse(forward.exact_request_bytes.toString("utf8")),forward.request);
  const originalPrototypeCopy=Buffer.prototype.copy;
  let laterPrototypeCopyCalls=0;
  try{
    Buffer.prototype.copy=function hostileLaterCopy(){
      laterPrototypeCopyCalls+=1;
      assert.fail("later copy override received the private bytes");
    };
    const later=forward.exact_request_bytes;
    assert.equal(later.toString("hex"),expectedHex);
    new Uint8Array(later.buffer).fill(0x33);
    assert.equal(sha256(forward.exact_request_bytes),expectedSha);
  }finally{Buffer.prototype.copy=originalPrototypeCopy;}
  assert.equal(laterPrototypeCopyCalls,0);
}

{
  const f=fixture();
  try{
    const record=claimRecord(f.generation);
    const bundle=requestBundle(record);

    const forward=prepareApollyonDurableAttemptClaimPublisherForwardV2(
      bundle.requestBytes
    );
    assert.equal(forward.publish_request_sha256,bundle.publishRequestSha);
    assert.equal(forward.exact_request_bytes.equals(bundle.requestBytes),true);
    assert.notEqual(forward.exact_request_bytes,bundle.requestBytes);
    assert.equal(forward.request_reconstructed,false);
    assert.equal(forward.request_recanonicalized,false);
    const malformed=Buffer.concat([bundle.requestBytes,Buffer.from(" ","ascii")]);
    expectError(
      ()=>prepareApollyonDurableAttemptClaimPublisherForwardV2(malformed),
      "apollyon_claim_request_v2_framing_invalid",
    );

    const first=f.core.publishClaim(publishInput(bundle,f.generation));
    assert.equal(first.slot_publication_outcome,"created");
    assert.equal(first.claim_publication_outcome,"created");
    assert.equal(first.success_response.outcome,"created_durable");
    assert.equal(first.success_response.durability_proven,true);
    assert.equal(first.production_claim_store_mutation_performed,false);
    assert.equal(first.production_durable_attempt_claim_performed,false);
    assert.deepEqual(f.stages,[
      "before_slot_publication",
      "after_slot_before_claim",
      "before_success_ack",
    ]);
    assert.equal(f.txCount(),1);
    assert.equal(f.releaseCount(),1);
    assert.deepEqual(f.events,[
      "acquire","before_slot_publication","after_slot_before_claim",
      "before_success_ack","release",
    ]);
    const acquisition=f.acquisitionContexts[0];
    assert.equal(Object.isFrozen(acquisition),true);
    assert.deepEqual(Object.keys(acquisition).sort(),[
      "authorization_slot_id","claim_record_id","publish_request_sha256",
      "root_identity_sha256","session_binding_id","store_generation_id",
      "store_generation_record_id",
    ]);
    assert.ok(Object.values(acquisition).every(value=>typeof value==="string"));
    assert.deepEqual(acquisition,{
      root_identity_sha256:f.core.root_identity_sha256,
      session_binding_id:SESSION_ID,
      store_generation_id:f.generation.store_generation_id,
      store_generation_record_id:f.generation.store_generation_record_id,
      authorization_slot_id:bundle.slot.authorization_slot_id,
      claim_record_id:record.claim_record_id,
      publish_request_sha256:bundle.publishRequestSha,
    });

    const slotFile=path.join(
      f.root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory,
      slotLeaf(bundle.slot),
    );
    const claimFile=path.join(
      f.root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
      claimLeaf(record),
    );
    requireRecordMetadata(slotFile);
    requireRecordMetadata(claimFile);
    assert.equal(fs.readFileSync(slotFile).equals(bytes(bundle.slot)),true);
    assert.equal(fs.readFileSync(claimFile).equals(bytes(record)),true);
    requirePendingEmpty(f);

    f.stages.length=0;
    const replay=f.core.publishClaim(publishInput(bundle,f.generation));
    assert.equal(replay.slot_publication_outcome,"existing_exact");
    assert.equal(replay.claim_publication_outcome,"existing_exact");
    assert.equal(
      replay.success_response.outcome,
      "recovered_existing_exact_durable",
    );
    assert.deepEqual(f.stages,[
      "before_slot_publication",
      "after_slot_before_claim",
      "before_success_ack",
    ]);
    requirePendingEmpty(f);

    const conflictRecord=claimRecord(f.generation,{
      terminalSeed:"7",
      requestSeed:"8",
      treeSeed:"c",
    });
    const conflict=requestBundle(conflictRecord);
    assert.equal(
      conflict.slot.authorization_slot_id,
      bundle.slot.authorization_slot_id,
    );
    assert.notEqual(
      conflict.slot.authorization_slot_record_id,
      bundle.slot.authorization_slot_record_id,
    );
    expectError(
      ()=>f.core.publishClaim(publishInput(conflict,f.generation)),
      "apollyon_claim_store_impl_v2_existing_record_collision",
    );
    assert.equal(
      fs.existsSync(path.join(
        f.root,
        VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
        claimLeaf(conflictRecord),
      )),
      false,
    );
    requirePendingEmpty(f);
  }finally{f.cleanup();}
}

{
  const f=fixture({throwStage:"after_slot_before_claim"});
  const record=claimRecord(f.generation);
  const bundle=requestBundle(record);
  try{
    expectError(
      ()=>f.core.publishClaim(publishInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_revalidation_failed:after_slot_before_claim",
    );
    assert.equal(f.releaseCount(),1,"body failure releases the acquired lease once");
    const slotFile=path.join(
      f.root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory,
      slotLeaf(bundle.slot),
    );
    const claimFile=path.join(
      f.root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
      claimLeaf(record),
    );
    requireRecordMetadata(slotFile);
    assert.equal(fs.existsSync(claimFile),false);
    requirePendingEmpty(f);

    const normal=createApollyonDurableAttemptClaimStoreServiceCoreV2({
      root_fd:f.rootFd,
      claim_uid:uid,
      claim_gid:gid,
      session_binding_id:SESSION_ID,
      acquireExclusiveStoreTransaction:()=>({release(){return undefined;}}),
      revalidate:(stage,context)=>revalidationReceipt(stage,context),
    });
    const recovered=normal.publishClaim(publishInput(bundle,f.generation));
    assert.equal(recovered.slot_publication_outcome,"existing_exact");
    assert.equal(recovered.claim_publication_outcome,"created");
    assert.equal(recovered.success_response.outcome,"created_durable");
    requireRecordMetadata(claimFile);
  }finally{f.cleanup();}
}

{
  const f=fixture();
  const record=claimRecord(f.generation);
  const bundle=requestBundle(record);
  const originalUnlink=fs.unlinkSync;
  let injected=false;
  try{
    fs.unlinkSync=function injectedUnlink(pathname){
      if(!injected&&String(pathname).includes("pending-claim-")){
        injected=true;
        const error=new Error("fixture_cleanup_failure");
        error.code="EIO";
        throw error;
      }
      return originalUnlink(pathname);
    };
    expectError(
      ()=>f.core.publishClaim(publishInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_indeterminate_after_publication",
    );
  }finally{
    fs.unlinkSync=originalUnlink;
  }
  try{
    assert.equal(injected,true);
    const claimFile=path.join(
      f.root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
      claimLeaf(record),
    );
    assert.equal(fs.lstatSync(claimFile).nlink,2);
    assert.equal(
      fs.readdirSync(
        path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.pending_directory)
      ).some(name=>name.startsWith("pending-claim-")),
      true,
    );
    const retry=f.core.publishClaim(publishInput(bundle,f.generation));
    assert.equal(retry.claim_publication_outcome,"existing_exact");
    assert.equal(retry.success_response.outcome,"recovered_existing_exact_durable");
    requireRecordMetadata(claimFile);
    requirePendingEmpty(f);
  }finally{f.cleanup();}
}


{
  const f=fixture();
  const record=claimRecord(f.generation);
  const bundle=requestBundle(record);
  const originalLink=fs.linkSync;
  let injected=false;
  try{
    fs.linkSync=function injectedLink(oldPath,newPath){
      if(!injected&&String(oldPath).includes("pending-claim-")){
        injected=true;
        const error=new Error("fixture_prelink_failure");
        error.code="EIO";
        throw error;
      }
      return originalLink(oldPath,newPath);
    };
    expectError(
      ()=>f.core.publishClaim(publishInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_publication_failed",
    );
  }finally{
    fs.linkSync=originalLink;
  }
  try{
    assert.equal(injected,true);
    const claimFile=path.join(
      f.root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
      claimLeaf(record),
    );
    assert.equal(fs.existsSync(claimFile),false);
    assert.equal(
      fs.readdirSync(
        path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.pending_directory)
      ).some(name=>name.startsWith("pending-claim-")),
      true,
    );
    const retry=f.core.publishClaim(publishInput(bundle,f.generation));
    assert.equal(retry.slot_publication_outcome,"existing_exact");
    assert.equal(retry.claim_publication_outcome,"created");
    assert.equal(retry.success_response.outcome,"created_durable");
    requireRecordMetadata(claimFile);
    requirePendingEmpty(f);
  }finally{f.cleanup();}
}

{
  const f=fixture();
  let wrapperInvocations=0;
  try{
    // The original exploitable wrapper is rejected before it ever receives fn.
    const wrapper=fn=>{
      wrapperInvocations+=1;
      return Promise.resolve(fn());
    };
    expectError(
      ()=>createApollyonDurableAttemptClaimStoreServiceCoreV2({
        ...f.config,withExclusiveStoreTransaction:wrapper,
      }),
      "apollyon_claim_store_impl_v2_legacy_transaction_wrapper_forbidden",
    );
    assert.equal(wrapperInvocations,0);
    assert.equal(f.txCount(),0);
    requireStoreUnchanged(f);
  }finally{f.cleanup();}
}

let rejectedLeaseGetterCalls=0;
let rejectedLeaseProxyTraps=0;
const invalidLeaseCases=[
  {
    name:"resolved Promise",
    acquire:()=>Promise.resolve({release(){return undefined;}}),
    code:"async_transaction_acquisition_forbidden",
  },
  {
    name:"handled rejected Promise",
    acquire:()=>{
      const result=Promise.reject(new Error("fixture_rejected_acquisition"));
      // A provider owns rejected invalid results; no unhandled-rejection side effect.
      result.catch(()=>undefined);
      return result;
    },
    code:"async_transaction_acquisition_forbidden",
  },
  {name:"null",acquire:()=>null},
  {name:"missing release",acquire:()=>({})},
  {name:"non-callable release",acquire:()=>({release:42})},
  {name:"array",acquire:()=>[]},
  {
    name:"thenable",
    acquire:()=>({release(){return undefined;},then(){assert.fail("then invoked");}}),
  },
  {
    name:"release getter",
    acquire:()=>Object.defineProperty({},"release",{
      enumerable:true,
      get(){rejectedLeaseGetterCalls+=1;return ()=>undefined;},
    }),
  },
  {
    name:"hidden then getter",
    acquire:()=>Object.defineProperty({release(){return undefined;}},"then",{
      get(){rejectedLeaseGetterCalls+=1;return ()=>undefined;},
    }),
  },
  {
    name:"non-enumerable release",
    acquire:()=>Object.defineProperty({},"release",{value:()=>undefined}),
  },
  {
    name:"extra symbol key",
    acquire:()=>({release(){return undefined;},[Symbol("extra")]:true}),
  },
  {
    name:"async release function",
    acquire:()=>({async release(){return undefined;}}),
  },
  {
    name:"generator release function",
    acquire:()=>({*release(){yield undefined;}}),
  },
  {
    name:"proxy release function",
    acquire:()=>({release:new Proxy(()=>undefined,{
      apply(){rejectedLeaseProxyTraps+=1;return undefined;},
      get(){rejectedLeaseProxyTraps+=1;return undefined;},
    })}),
  },
  {
    name:"proxy lease",
    acquire:()=>new Proxy({release(){return undefined;}},{
      getPrototypeOf(){rejectedLeaseProxyTraps+=1;return Object.prototype;},
      ownKeys(){rejectedLeaseProxyTraps+=1;return ["release"];},
      getOwnPropertyDescriptor(){rejectedLeaseProxyTraps+=1;return undefined;},
      get(){rejectedLeaseProxyTraps+=1;return undefined;},
    }),
  },
  {
    name:"revoked proxy lease",
    acquire:()=>{
      const {proxy,revoke}=Proxy.revocable({release(){return undefined;}},{});
      revoke();
      return proxy;
    },
  },
];
for(const candidate of invalidLeaseCases){
  const f=fixture({acquire:candidate.acquire});
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    const input=publishInput(bundle,f.generation);
    expectError(
      ()=>f.core.publishClaim(input),
      "apollyon_claim_store_impl_v2_"+(candidate.code??"transaction_lease_invalid"),
    );
    assert.equal(f.txCount(),1,candidate.name);
    assert.equal(f.releaseCount(),0,candidate.name+" has no validated release capability");
    assert.deepEqual(f.stages,[],candidate.name+" never enters store body");
    requireStoreUnchanged(f);
    requireCoreUnusable(f,input);
  }finally{f.cleanup();}
}
assert.equal(rejectedLeaseGetterCalls,0);
assert.equal(rejectedLeaseProxyTraps,0);

{
  const f=fixture({acquire:()=>{throw new Error("fixture_acquisition_failure");}});
  try{
    const input=publishInput(requestBundle(claimRecord(f.generation)),f.generation);
    expectError(
      ()=>f.core.publishClaim(input),
      "apollyon_claim_store_impl_v2_transaction_acquisition_failed",
    );
    assert.equal(f.releaseCount(),0);
    requireStoreUnchanged(f);
    requireCoreUnusable(f,input);
  }finally{f.cleanup();}
}

{
  const f=fixture({acquire:(_context,lease)=>Object.setPrototypeOf(lease,null)});
  try{
    const input=publishInput(requestBundle(claimRecord(f.generation)),f.generation);
    assert.equal(f.core.publishClaim(input).success_response.outcome,"created_durable");
    assert.equal(f.releaseCount(),1);
    assert.equal(Object.getPrototypeOf(f.leases[0]),null);
  }finally{f.cleanup();}
}

for(const stage of ["acquire","revalidate","release"]){
  let f;
  let input;
  let rejectedReentries=0;
  const reenter=()=>{
    expectError(
      ()=>f.core.publishClaim(input),
      "apollyon_claim_store_impl_v2_transaction_reentry",
    );
    rejectedReentries+=1;
  };
  f=fixture({
    acquire:(_context,lease)=>{if(stage==="acquire")reenter();return lease;},
    onRevalidate:()=>{if(stage==="revalidate")reenter();},
    release:()=>{if(stage==="release")reenter();return undefined;},
  });
  try{
    input=publishInput(requestBundle(claimRecord(f.generation)),f.generation);
    assert.equal(f.core.publishClaim(input).success_response.outcome,"created_durable");
    assert.equal(rejectedReentries,stage==="revalidate"?3:1,stage);
    assert.equal(f.txCount(),1,stage);
    assert.equal(f.releaseCount(),1,stage);
  }finally{f.cleanup();}
}

{
  let f;
  let replacedCallbacksInvoked=0;
  f=fixture({
    onRevalidate:()=>{
      f.leases[0].release=()=>{replacedCallbacksInvoked+=1;};
    },
  });
  try{
    f.config.acquireExclusiveStoreTransaction=()=>{replacedCallbacksInvoked+=1;};
    f.config.revalidate=()=>{replacedCallbacksInvoked+=1;};
    const input=publishInput(requestBundle(claimRecord(f.generation)),f.generation);
    assert.equal(f.core.publishClaim(input).success_response.outcome,"created_durable");
    assert.equal(replacedCallbacksInvoked,0);
    assert.equal(f.txCount(),1);
    assert.equal(f.releaseCount(),1,"release snapshot survives lease property mutation");
    assert.equal(f.stages.length,3,"constructor snapshot survives config mutation");
  }finally{f.cleanup();}
}

for(const candidate of [
  {name:"throw",release:()=>{throw ioError("fixture_release_failure");},code:"transaction_release_failed"},
  {name:"Promise",release:()=>Promise.resolve(),code:"transaction_release_result_invalid"},
  {
    name:"handled rejected Promise",
    release:()=>{
      const result=Promise.reject(new Error("fixture_rejected_release"));
      result.catch(()=>undefined);
      return result;
    },
    code:"transaction_release_result_invalid",
  },
  {name:"non-void",release:()=>1,code:"transaction_release_result_invalid"},
]){
  const f=fixture({release:candidate.release});
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    const input=publishInput(bundle,f.generation);
    const error=expectError(
      ()=>f.core.publishClaim(input),
      "apollyon_claim_store_impl_v2_transaction_cleanup_indeterminate",
    );
    assert.equal(f.releaseCount(),1,candidate.name);
    assert.equal(error.core_store_mutation_may_have_occurred,true);
    requireCleanupDiagnostics(error,"transaction_release",
      "apollyon_claim_store_impl_v2_transaction_release_failed");
    assert.ok(error.cleanup_errors.some(entry=>entry.role==="transaction_release"&&
      entry.error_code==="apollyon_claim_store_impl_v2_"+candidate.code));
    requireRecordMetadata(path.join(f.root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory,slotLeaf(bundle.slot)));
    requireRecordMetadata(path.join(f.root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,claimLeaf(bundle.request.claim_record)));
    requireCoreUnusable(f,input);
  }finally{f.cleanup();}
}

{
  const f=fixture();
  try{
    const input=publishInput(requestBundle(claimRecord(f.generation)),f.generation);
    withObservedFs({
      afterClose(entry){
        if(isTransactionDirectory(entry))f.events.push("closed:"+path.basename(entry.pathname));
        if(isOwnedRoot(entry,f))f.events.push("closed:owned_root");
      },
    },({opened,closed})=>{
      assert.equal(f.core.publishClaim(input).success_response.outcome,"created_durable");
      const directories=opened.filter(isTransactionDirectory);
      assert.equal(directories.length,4);
      const roots=opened.filter(entry=>isOwnedRoot(entry,f));
      assert.equal(roots.length,1,"publisher owns one duplicated root descriptor");
      for(const entry of roots){
        assert.equal(closed.filter(row=>row.serial===entry.serial).length,1);
      }
      for(const entry of directories){
        assert.equal(closed.filter(row=>row.serial===entry.serial).length,1);
      }
    });
    const beforeAck=f.events.indexOf("before_success_ack");
    const releaseIndex=f.events.indexOf("release");
    assert.ok(beforeAck>f.events.indexOf("acquire"));
    for(const directory of TRANSACTION_DIRECTORIES){
      const index=f.events.indexOf("closed:"+directory);
      assert.ok(index>beforeAck&&index<releaseIndex,directory+" closes while lease held");
    }
    const rootClosed=f.events.indexOf("closed:owned_root");
    assert.ok(rootClosed>beforeAck&&rootClosed<releaseIndex,"owned root closes while lease held");
    assert.equal(f.releaseCount(),1);
  }finally{f.cleanup();}
}

for(const failClose of [false,true]){
  const f=fixture();
  try{
    const input=publishInput(requestBundle(claimRecord(f.generation)),f.generation);
    withObservedFs({
      beforeOpen(pathname){
        if(path.basename(pathname)===VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory){
          throw ioError("fixture_partial_directory_open");
        }
      },
      afterClose(entry){
        if(failClose&&(isTransactionDirectory(entry)||isOwnedRoot(entry,f))){
          throw ioError("fixture_directory_close");
        }
      },
    },({opened,closed})=>{
      const error=expectError(
        ()=>f.core.publishClaim(input),
        "apollyon_claim_store_impl_v2_claim_directory_invalid",
      );
      const directories=opened.filter(isTransactionDirectory);
      assert.equal(directories.length,2);
      const roots=opened.filter(entry=>isOwnedRoot(entry,f));
      assert.equal(roots.length,1);
      for(const entry of [...directories,...roots]){
        assert.equal(closed.filter(row=>row.serial===entry.serial).length,1,
          "partial-open cleanup closes each already-owned descriptor exactly once");
      }
      if(failClose){
        assert.equal(error.cleanup_errors.length,3);
        assert.equal(error.cause.message,error.message);
        requireCleanupDiagnostics(error,"transaction_directory",
          "apollyon_claim_store_impl_v2_descriptor_close_failed");
        requireCleanupDiagnostics(error,"transaction_root",
          "apollyon_claim_store_impl_v2_descriptor_close_failed");
      }
    });
    assert.equal(f.releaseCount(),1);
    requireStoreUnchanged(f);
    if(failClose)requireCoreUnusable(f,input);
  }finally{f.cleanup();}
}

for(const throwStage of [null,"after_slot_before_claim"]){
  const f=fixture({
    throwStage,
    release:()=>{throw ioError("fixture_release_and_close_failure");},
  });
  try{
    const input=publishInput(requestBundle(claimRecord(f.generation)),f.generation);
    withObservedFs({
      afterClose(entry){
        if(isTransactionDirectory(entry)||isOwnedRoot(entry,f)){
          throw ioError("fixture_every_directory_close");
        }
      },
    },({opened,closed})=>{
      const error=expectError(
        ()=>f.core.publishClaim(input),
        throwStage===null
          ?"apollyon_claim_store_impl_v2_descriptor_cleanup_failed"
          :"apollyon_claim_store_impl_v2_revalidation_failed:after_slot_before_claim",
      );
      assert.equal(error.cause.message,error.message,"cleanup retains primary failure");
      assert.equal(error.core_store_mutation_may_have_occurred,true);
      assert.equal(error.cleanup_errors.length,6,"four directories, owned root, and release are all reported");
      requireCleanupDiagnostics(error,"transaction_directory",
        "apollyon_claim_store_impl_v2_descriptor_close_failed");
      requireCleanupDiagnostics(error,"transaction_release",
        "apollyon_claim_store_impl_v2_transaction_release_failed");
      requireCleanupDiagnostics(error,"transaction_root",
        "apollyon_claim_store_impl_v2_descriptor_close_failed");
      assert.equal(error.cleanup_errors.filter(row=>row.role==="transaction_directory").length,4);
      assert.equal(error.cleanup_errors.at(-1).role,"transaction_release");
      const directories=opened.filter(isTransactionDirectory);
      assert.equal(directories.length,4);
      const roots=opened.filter(entry=>isOwnedRoot(entry,f));
      assert.equal(roots.length,1);
      for(const entry of [...directories,...roots]){
        assert.equal(closed.filter(row=>row.serial===entry.serial).length,1,
          "a close error cannot skip or retry another owned descriptor");
      }
    });
    assert.equal(f.releaseCount(),1);
    requireCoreUnusable(f,input);
  }finally{f.cleanup();}
}

for(const role of ["record","pending_record","stale_pending","rejected_directory"]){
  const f=fixture();
  const record=claimRecord(f.generation);
  const bundle=requestBundle(record);
  const input=publishInput(bundle,f.generation);
  const staleLeaf="pending-claim-"+record.claim_record_id.split(":")[1]+"-"+
    "a".repeat(32)+".json";
  const stalePath=path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.pending_directory,staleLeaf);
  let injected=0;
  try{
    if(role==="stale_pending")writeCanonical(stalePath,record);
    if(role==="rejected_directory"){
      fs.chmodSync(path.join(f.root,
        VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory),0o755);
    }
    withObservedFs({
      afterClose(entry){
        if(entry===undefined||injected!==0)return;
        const leaf=path.basename(entry.pathname);
        const matched=
          (role==="record"&&leaf===VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.active_generation_leaf)||
          (role==="pending_record"&&leaf.startsWith("pending-slot-")&&
            (entry.flags&fs.constants.O_CREAT)!==0)||
          (role==="stale_pending"&&leaf===staleLeaf&&
            (entry.flags&fs.constants.O_CREAT)===0)||
          (role==="rejected_directory"&&
            leaf===VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory);
        if(matched){injected+=1;throw ioError("fixture_"+role+"_close");}
      },
    },()=>{
      const error=expectError(
        ()=>f.core.publishClaim(input),
        role==="rejected_directory"
          ?"apollyon_claim_store_impl_v2_slot_directory_invalid"
          :"apollyon_claim_store_impl_v2_descriptor_cleanup_failed",
      );
      assert.equal(injected,1,role+" close fault actually reached");
      requireCleanupDiagnostics(error,role,
        "apollyon_claim_store_impl_v2_descriptor_close_failed");
      assert.equal(error.core_store_mutation_may_have_occurred,true);
    });
    assert.equal(f.releaseCount(),1,role+" failure still releases the lease");
    if(role==="stale_pending")assert.equal(fs.existsSync(stalePath),true);
    requireCoreUnusable(f,input);
  }finally{f.cleanup();}
}

{
  const f=fixture({mutateGenerationStage:"before_slot_publication"});
  try{
    const record=claimRecord(f.generation);
    const bundle=requestBundle(record);
    expectError(
      ()=>f.core.publishClaim(publishInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_active_generation_invalid",
    );
    assert.deepEqual(
      fs.readdirSync(
        path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory)
      ),
      [],
    );
    assert.deepEqual(
      fs.readdirSync(path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory)),
      [],
    );
  }finally{f.cleanup();}
}

{
  const f=fixture();
  try{
    const record=claimRecord(f.generation);
    const bundle=requestBundle(record);
    const claimFile=path.join(
      f.root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
      claimLeaf(record),
    );
    writeCanonical(claimFile,record);
    expectError(
      ()=>f.core.publishClaim(publishInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_orphan_claim_without_slot",
    );
  }finally{f.cleanup();}
}

{
  const f=fixture({asyncRevalidator:true});
  try{
    const record=claimRecord(f.generation);
    const bundle=requestBundle(record);
    expectError(
      ()=>f.core.publishClaim(publishInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_async_revalidator_forbidden",
    );
    assert.deepEqual(
      fs.readdirSync(
        path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory)
      ),
      [],
    );
  }finally{f.cleanup();}
}

{
  const f=fixture();
  try{
    expectError(
      ()=>createApollyonDurableAttemptClaimStoreServiceCoreV2({
        root_fd:f.rootFd,
        claim_uid:0,
        claim_gid:gid,
        session_binding_id:SESSION_ID,
        acquireExclusiveStoreTransaction:()=>({release(){return undefined;}}),
        revalidate:(stage,context)=>revalidationReceipt(stage,context),
      }),
      "apollyon_claim_store_impl_v2_config_invalid",
    );
    expectError(
      ()=>createApollyonDurableAttemptClaimStoreServiceCoreV2({
        root_fd:f.rootFd,
        claim_uid:uid,
        claim_gid:0,
        session_binding_id:SESSION_ID,
        acquireExclusiveStoreTransaction:()=>({release(){return undefined;}}),
        revalidate:(stage,context)=>revalidationReceipt(stage,context),
      }),
      "apollyon_claim_store_impl_v2_config_invalid",
    );
  }finally{f.cleanup();}
}

{
  const unhandled=[];
  const observeUnhandled=reason=>{unhandled.push(reason);};
  let callerThenReads=0;
  process.on("unhandledRejection",observeUnhandled);
  try{
    for(const stage of ["acquisition","release"]){
      const rejection=Promise.reject(new Error("fixture_unhandled_"+stage));
      Object.defineProperty(rejection,"then",{
        get(){callerThenReads+=1;assert.fail("caller Promise.then getter invoked");},
      });
      const f=fixture(stage==="acquisition"
        ?{acquire:()=>rejection}
        :{release:()=>rejection});
      try{
        const input=publishInput(requestBundle(claimRecord(f.generation)),f.generation);
        expectError(
          ()=>f.core.publishClaim(input),
          stage==="acquisition"
            ?"apollyon_claim_store_impl_v2_async_transaction_acquisition_forbidden"
            :"apollyon_claim_store_impl_v2_transaction_cleanup_indeterminate",
        );
        if(stage==="acquisition")requireStoreUnchanged(f);
        assert.equal(f.releaseCount(),stage==="acquisition"?0:1);
        requireCoreUnusable(f,input);
      }finally{f.cleanup();}
    }
    // Native rejection reporting happens before the next event-loop turn.
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(unhandled,[],"rejected native capabilities must not escape as unhandled rejections");
    assert.equal(callerThenReads,0);
  }finally{process.off("unhandledRejection",observeUnhandled);}
}

// Retained descriptors must remain attached to their visible namespace after
// every caller revalidation boundary, including the final acknowledgment.
for(const key of ["generation_directory","authorization_slot_directory","claim_directory","pending_directory"]){
  for(const stage of ["before_slot_publication","after_slot_before_claim","before_success_ack"]){
    let f;
    let injected=false;
    const name=VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2[key];
    const outside=fs.mkdtempSync(path.join(os.tmpdir(),"void-apollyon-directory-swap-"));
    fs.mkdirSync(path.join(outside,"replacement"),{mode:0o700});
    f=fixture({onRevalidate(observedStage){
      if(observedStage!==stage||injected)return;
      injected=true;
      fs.renameSync(path.join(f.root,name),path.join(outside,"detached"));
      fs.renameSync(path.join(outside,"replacement"),path.join(f.root,name));
    }});
    try{
      const before=rootIdentity(fs.statSync(f.root));
      const bundle=requestBundle(claimRecord(f.generation));
      expectError(()=>f.core.publishClaim(publishInput(bundle,f.generation)),
        "_directory_binding_changed");
      assert.equal(injected,true,key+" at "+stage);
      assert.deepEqual(rootIdentity(fs.statSync(f.root)),before,
        "directory replacement preserves the persisted root identity");
      assert.deepEqual(fs.readdirSync(path.join(f.root,name)),[],
        "a detached directory cannot receive a success acknowledgment");
      assert.equal(f.releaseCount(),1);
    }finally{f.cleanup();fs.rmSync(outside,{recursive:true,force:true});}
  }
}

for(const kind of ["slot","claim"]){
  let f;
  let bundle;
  let injected=false;
  f=fixture({onRevalidate(stage){
    if(stage!=="before_success_ack")return;
    injected=true;
    fs.chmodSync(recordPaths(f,bundle)[kind],0o644);
  }});
  try{
    bundle=requestBundle(claimRecord(f.generation));
    expectError(()=>f.core.publishClaim(publishInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_persisted_"+kind+"_invalid");
    assert.equal(injected,true);
    assert.equal(mode(fs.lstatSync(recordPaths(f,bundle)[kind])),0o644);
    assert.equal(f.releaseCount(),1,"final record refusal still releases the lease");
  }finally{f.cleanup();}
}

{
  const f=fixture();
  const originalRead=fs.readSync;
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    f.core.publishClaim(publishInput(bundle,f.generation));
    const before=storeSnapshot(f.root);
    f.events.length=0;
    f.stages.length=0;
    const fullReads=new Map();
    const eofReads=new Map();
    let openedRows=[];
    let firstClose=false;
    fs.readSync=function countObservationReads(fd,...args){
      const count=originalRead(fd,...args);
      if(args[3]===0&&count>0)fullReads.set(fd,(fullReads.get(fd)??0)+1);
      if(count===0)eofReads.set(fd,(eofReads.get(fd)??0)+1);
      return count;
    };
    const out=withObservedFs({afterClose(entry){
      if(!firstClose){
        firstClose=true;
        assert.equal(openedRows.length,8,"root, three directories, and four records remain owned");
        const records=openedRows.filter(row=>(row.flags&O_DIRECTORY)===0);
        assert.equal(records.length,4);
        for(const record of records){
          assert.ok(fullReads.get(record.fd)>=2,"held record is reread before any cleanup");
          assert.ok(eofReads.get(record.fd)>=2,"each retained read checks EOF");
        }
      }
      if(entry!==undefined)f.events.push("closed:"+entry.serial);
    }},({opened,closed})=>{
      openedRows=opened;
      const result=withReadOnlyFs(()=>f.core.observeAuthorizationWinner(
        observationInput(bundle,f.generation)
      ));
      assert.equal(opened.length,8);
      assert.equal(closed.length,8);
      assert.equal(new Set(closed.map(row=>row.serial)).size,8);
      assert.equal(isOwnedRoot(closed.at(-1),f),true,"owned root closes last");
      return result;
    });
    assert.equal(out.marker,"VOID_APOLLYON_AUTHORIZATION_WINNER_OBSERVATION_V1");
    assert.equal(out.version,1);
    assert.equal(out.status,"authorization_winner_observed_source_only");
    assert.equal(out.authorization_id,bundle.request.claim_record.authorization_id);
    assert.equal(out.authorization_slot_id,bundle.slot.authorization_slot_id);
    assert.equal(out.authorization_slot_record_id,bundle.slot.authorization_slot_record_id);
    assert.equal(out.authorization_slot_record_sha256,sha256(bytes(bundle.slot)));
    assert.equal(out.claim_record_id,bundle.request.claim_record.claim_record_id);
    assert.equal(out.claim_record_sha256,sha256(bytes(bundle.request.claim_record)));
    assert.equal(out.publish_request_sha256,bundle.publishRequestSha);
    assert.equal(out.store_generation_id,f.generation.store_generation_id);
    assert.equal(out.store_generation_record_id,f.generation.store_generation_record_id);
    assert.equal(out.root_identity_sha256,f.core.root_identity_sha256);
    assert.deepEqual(out.authorization_slot_record,bundle.slot);
    assert.deepEqual(out.claim_record,bundle.request.claim_record);
    assert.deepEqual(out.store_generation_record,f.generation);
    for(const key of ["descriptor_stable_reread_performed","visible_namespace_rebind_performed",
      "source_filesystem_read_performed"]){
      assert.equal(out[key],true,key);
    }
    for(const key of ["source_core_filesystem_mutation_performed","protected_store_origin_proven",
      "privileged_terminal_receipt_revalidation_performed","activation_capability_issuance_authorized",
      "training_start_admission","training_execution_authorized"]){
      assert.equal(out[key],false,key);
    }
    requireFrozenObservation(out);
    assert.throws(()=>{out.claim_record.terminal_receipt_id="changed";},TypeError);
    assert.deepEqual(f.stages,[],"observation never invokes publication revalidation callbacks");
    assert.deepEqual(f.acquisitionContexts[1],f.acquisitionContexts[0],
      "reader and publisher use the same exact seven-field lease context");
    assert.equal(f.events[0],"acquire");
    assert.equal(f.events.at(-1),"release");
    assert.ok(f.events.slice(1,-1).every(event=>event.startsWith("closed:")));
    assert.deepEqual(storeSnapshot(f.root),before,"observation changes no store metadata or bytes");
  }finally{fs.readSync=originalRead;f.cleanup();}
}

// The reader's private request copy cannot share a slab with caller-owned bytes.
{
  let armed=false;
  let callerBytes;
  let copyCalls=0;
  const f=fixture({acquire(_context,lease){
    if(armed)new Uint8Array(callerBytes.buffer).fill(0);
    return lease;
  }});
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    f.core.publishClaim(publishInput(bundle,f.generation));
    callerBytes=Buffer.alloc(bundle.requestBytes.length);
    bundle.requestBytes.copy(callerBytes);
    callerBytes.copy=()=>{copyCalls+=1;assert.fail("caller copy override invoked");};
    armed=true;
    const out=withReadOnlyFs(()=>f.core.observeAuthorizationWinner({
      ...observationInput(bundle,f.generation),request_bytes:callerBytes,
    }));
    assert.equal(copyCalls,0);
    assert.equal(callerBytes.every(byte=>byte===0),true);
    assert.equal(out.publish_request_sha256,bundle.publishRequestSha);
    assert.deepEqual(out.claim_record,bundle.request.claim_record);
    requireFrozenObservation(out);
  }finally{f.cleanup();}
}

for(const fault of ["mode_after_stat","link_after_stat","same_bytes_inode","same_bytes_timestamp",
  "ctime_only","eof_growth"]){
  const f=fixture();
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),"void-apollyon-record-swap-"));
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    f.core.publishClaim(publishInput(bundle,f.generation));
    const file=recordPaths(f,bundle).slot;
    const original=fs.readFileSync(file);
    const mutate=initial=>{
      if(fault==="mode_after_stat")fs.chmodSync(file,0o644);
      if(fault==="link_after_stat")fs.linkSync(file,path.join(outside,"extra-link"));
      if(fault==="same_bytes_inode"){
        fs.renameSync(file,path.join(outside,"detached"));
        fs.writeFileSync(file,original,{mode:0o600});
        assert.notEqual(fs.lstatSync(file,{bigint:true}).ino,initial.ino);
      }
      if(fault==="same_bytes_timestamp"){
        fs.writeFileSync(file,original);
        const future=new Date(Number(initial.mtimeNs/1000000n)+60000);
        fs.utimesSync(file,future,future);
        assert.notEqual(fs.lstatSync(file,{bigint:true}).mtimeNs,initial.mtimeNs);
      }
      if(fault==="ctime_only"){
        fs.chmodSync(file,0o644);
        fs.chmodSync(file,0o600);
        const after=fs.lstatSync(file,{bigint:true});
        assert.equal(after.mtimeNs,initial.mtimeNs);
        assert.notEqual(after.ctimeNs,initial.ctimeNs);
      }
      if(fault==="eof_growth")fs.appendFileSync(file,Buffer.from(" "));
    };
    withRecordInterleaving(file,fault.endsWith("after_stat")?{afterStat:mutate}:{afterRead:mutate},()=>{
      expectError(()=>f.core.observeAuthorizationWinner(observationInput(bundle,f.generation)),
        "apollyon_claim_store_impl_v2_persisted_slot_invalid");
    });
    assert.equal(f.releaseCount(),2,fault+" releases the observation lease");
  }finally{f.cleanup();fs.rmSync(outside,{recursive:true,force:true});}
}

// Synthetic high inode values isolate the precision rule while all reads still
// use a real ordinary file. The two identities collide if converted to Number.
{
  const f=fixture();
  const originalStat=fs.fstatSync;
  const originalLstat=fs.lstatSync;
  const originalRead=fs.readSync;
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    f.core.publishClaim(publishInput(bundle,f.generation));
    const target=originalLstat(recordPaths(f,bundle).slot,{bigint:true});
    const first=9007199254740992n;
    const second=9007199254740993n;
    assert.equal(Number(first),Number(second));
    let changed=false;
    const remap=st=>{
      if(String(st.dev)===String(target.dev)&&String(st.ino)===String(target.ino)){
        assert.equal(typeof st.ino,"bigint","record identity is requested without Number rounding");
        Object.defineProperty(st,"ino",{value:changed?second:first});
      }
      return st;
    };
    fs.fstatSync=(fd,...args)=>remap(originalStat(fd,...args));
    fs.lstatSync=(file,...args)=>remap(originalLstat(file,...args));
    fs.readSync=function changeSyntheticInode(fd,...args){
      const count=originalRead(fd,...args);
      if(count>0&&originalStat(fd,{bigint:true}).ino===target.ino)changed=true;
      return count;
    };
    expectError(()=>f.core.observeAuthorizationWinner(observationInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_persisted_slot_invalid");
    assert.equal(changed,true);
  }finally{
    fs.fstatSync=originalStat;fs.lstatSync=originalLstat;fs.readSync=originalRead;f.cleanup();
  }
}

for(const state of ["empty","missing_slot","missing_claim","pending_slot_link"]){
  const f=fixture();
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    if(state!=="empty")f.core.publishClaim(publishInput(bundle,f.generation));
    const files=recordPaths(f,bundle);
    if(state==="missing_slot")fs.unlinkSync(files.slot);
    if(state==="missing_claim")fs.unlinkSync(files.claim);
    if(state==="pending_slot_link"){
      fs.linkSync(files.slot,path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.pending_directory,
        "pending-slot-"+bundle.slot.authorization_slot_id.split(":")[1]+"-"+"b".repeat(32)+".json"));
    }
    const before=storeSnapshot(f.root);
    withReadOnlyFs(()=>expectError(
      ()=>f.core.observeAuthorizationWinner(observationInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_persisted_"+(state==="missing_claim"?"claim":"slot")+"_invalid",
    ));
    assert.deepEqual(storeSnapshot(f.root),before,state+" observation performs no recovery");
  }finally{f.cleanup();}
}

for(const kind of ["symlink","directory","fifo","socket","oversize","malformed","noncanonical"]){
  const f=fixture();
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    f.core.publishClaim(publishInput(bundle,f.generation));
    const file=recordPaths(f,bundle).slot;
    fs.unlinkSync(file);
    if(kind==="symlink")fs.symlinkSync(recordPaths(f,bundle).claim,file);
    if(kind==="directory")fs.mkdirSync(file,{mode:0o600});
    if(kind==="fifo"){
      execFileSync("mkfifo",[file],{timeout:5000,stdio:"pipe"});
      fs.chmodSync(file,0o600);
    }
    if(kind==="socket"){
      // The child creates one disposable local socket inode and exits. It never
      // binds a TCP address, receives a connection, or touches a production path.
      const socketFile=path.join(f.root,"socket-fixture");
      execFileSync(process.execPath,["--input-type=module","-e",
        'import net from "node:net";const server=net.createServer();'+
        'server.listen(process.argv[1],()=>process.exit(0));',socketFile],
        {timeout:5000,stdio:"pipe"});
      assert.equal(fs.lstatSync(socketFile).isSocket(),true);
      fs.renameSync(socketFile,file);
      fs.chmodSync(file,0o600);
    }
    if(kind==="oversize")fs.writeFileSync(file,Buffer.alloc(256*1024+1,0x20),{mode:0o600});
    if(kind==="malformed")fs.writeFileSync(file,"{broken}\n",{mode:0o600});
    if(kind==="noncanonical")fs.writeFileSync(file,JSON.stringify(bundle.slot)+"\n",{mode:0o600});
    const before=storeSnapshot(f.root);
    let fifoOpened=false;
    withObservedFs({
      beforeOpen(pathname,flags){
        if(kind==="fifo"&&path.basename(pathname)===path.basename(file)){
          assert.notEqual(flags&fs.constants.O_NONBLOCK,0,"FIFO refusal cannot block in open");
        }
      },
      afterOpen(entry){
        if(kind==="fifo"&&path.basename(entry.pathname)===path.basename(file))fifoOpened=true;
      },
    },()=>withReadOnlyFs(()=>expectError(
      ()=>f.core.observeAuthorizationWinner(observationInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_persisted_slot_invalid",
    )));
    if(kind==="fifo")assert.equal(fifoOpened,true,"actual FIFO was opened without waiting for a writer");
    assert.deepEqual(storeSnapshot(f.root),before,kind+" refusal leaves the store unchanged");
  }finally{f.cleanup();}
}

{
  const f=fixture();
  let accessorCalls=0;
  let proxyTraps=0;
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    f.core.publishClaim(publishInput(bundle,f.generation));
    const valid=observationInput(bundle,f.generation);
    const accessor={...valid};
    Object.defineProperty(accessor,"authorization_id",{
      enumerable:true,get(){accessorCalls+=1;return valid.authorization_id;},
    });
    const proxy=new Proxy(valid,{
      get(){proxyTraps+=1;assert.fail("input proxy getter invoked");},
      ownKeys(){proxyTraps+=1;assert.fail("input proxy ownKeys invoked");},
      getPrototypeOf(){proxyTraps+=1;assert.fail("input proxy prototype trap invoked");},
    });
    const revoked=Proxy.revocable(valid,{});
    revoked.revoke();
    const bufferProxy=new Proxy(bundle.requestBytes,{
      getPrototypeOf(){proxyTraps+=1;assert.fail("request buffer prototype trap invoked");},
      get(){proxyTraps+=1;assert.fail("request buffer getter invoked");},
    });
    const revokedBuffer=Proxy.revocable(bundle.requestBytes,{});
    revokedBuffer.revoke();
    for(const invalid of [
      {...valid,filename:"../caller-selected.json"},
      {...valid,authorization_slot_record:bundle.slot},
      {...valid,request_bytes:bundle.requestBytes.toString("utf8")},
      {...valid,request_bytes:bufferProxy},
      {...valid,request_bytes:revokedBuffer.proxy},
      accessor,proxy,revoked.proxy,
    ]){
      const before=f.txCount();
      withReadOnlyFs(()=>expectError(()=>f.core.observeAuthorizationWinner(invalid),
        "apollyon_claim_store_impl_v2_observation_input_invalid"));
      assert.equal(f.txCount(),before,"invalid input never acquires a transaction lease");
    }
    assert.equal(accessorCalls,0);
    assert.equal(proxyTraps,0);
    for(const [invalid,code] of [
      [{...valid,authorization_id:"apollyon_authz_v1:"+"0".repeat(64)},
        "observation_request_cross_binding_invalid"],
      [{...valid,expected_store_generation_record:generationRecord(f.core.root_identity_sha256,"0")},
        "generation_request_cross_binding_invalid"],
    ]){
      const before=f.txCount();
      withReadOnlyFs(()=>expectError(()=>f.core.observeAuthorizationWinner(invalid),
        code));
      assert.equal(f.txCount(),before,"request binding fails before any lease or store observation");
    }
    const competing=requestBundle(claimRecord(f.generation,{terminalSeed:"7"}));
    const before=storeSnapshot(f.root);
    withReadOnlyFs(()=>expectError(()=>f.core.observeAuthorizationWinner(
      observationInput(competing,f.generation)),"cross_binding_invalid"));
    assert.deepEqual(storeSnapshot(f.root),before,"different winner cannot rewrite the occupied slot");
  }finally{f.cleanup();}
}

for(const kind of ["active","generation","claim"]){
  const f=fixture();
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    f.core.publishClaim(publishInput(bundle,f.generation));
    const files=recordPaths(f,bundle);
    if(kind==="claim"){
      writeCanonical(files.claim,claimRecord(f.generation,{terminalSeed:"7"}));
    }else{
      writeCanonical(files[kind],generationRecord(f.core.root_identity_sha256,"0"));
    }
    const before=storeSnapshot(f.root);
    withReadOnlyFs(()=>expectError(()=>f.core.observeAuthorizationWinner(
      observationInput(bundle,f.generation)),kind==="claim"?"observation_claim_mismatch":"generation"));
    assert.deepEqual(storeSnapshot(f.root),before,kind+" cross-binding mismatch is read-only");
  }finally{f.cleanup();}
}

for(const key of ["generation_directory","authorization_slot_directory","claim_directory","root"]){
  const f=fixture();
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),"void-apollyon-reader-directory-swap-"));
  fs.mkdirSync(path.join(outside,"replacement"),{mode:0o700});
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    f.core.publishClaim(publishInput(bundle,f.generation));
    const before=rootIdentity(fs.fstatSync(f.rootFd));
    withRecordInterleaving(recordPaths(f,bundle).slot,{afterRead(){
      if(key==="root"){
        fs.chmodSync(f.root,0o755);
        fs.chmodSync(f.root,0o700);
      }else{
        const visible=path.join(f.root,VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2[key]);
        fs.renameSync(visible,path.join(outside,"detached"));
        fs.renameSync(path.join(outside,"replacement"),visible);
      }
    }},()=>expectError(()=>f.core.observeAuthorizationWinner(observationInput(bundle,f.generation)),
      "_directory_binding_changed"));
    assert.deepEqual(rootIdentity(fs.fstatSync(f.rootFd)),before,
      "transient read evidence does not replace the persisted root identity schema");
  }finally{f.cleanup();fs.rmSync(outside,{recursive:true,force:true});}
}

for(const operation of ["publishClaim","observeAuthorizationWinner"]){
  let f;
  let armed=false;
  let replaced=false;
  const decoy=fs.mkdtempSync(path.join(os.tmpdir(),"void-apollyon-root-fd-reuse-"));
  const replaceCallerFd=()=>{
    if(replaced)return;
    replaced=true;
    fs.closeSync(f.rootFd);
    const decoyFd=fs.openSync(decoy,fs.constants.O_RDONLY|O_DIRECTORY|O_CLOEXEC);
    assert.equal(decoyFd,f.rootFd,"the caller descriptor number is actually reused");
  };
  f=fixture({onRevalidate(stage){
    if(armed&&operation==="publishClaim"&&stage==="before_slot_publication")replaceCallerFd();
  }});
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    if(operation==="observeAuthorizationWinner")f.core.publishClaim(publishInput(bundle,f.generation));
    armed=true;
    const out=withObservedFs({afterOpen(entry){
      if(operation==="observeAuthorizationWinner"&&
         path.basename(entry.pathname)===VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.active_generation_leaf){
        replaceCallerFd();
      }
    }},()=>f.core[operation](operation==="publishClaim"
      ?publishInput(bundle,f.generation):observationInput(bundle,f.generation)));
    assert.equal(replaced,true);
    assert.equal(out.status,operation==="publishClaim"
      ?"store_core_transaction_complete_source_only":"authorization_winner_observed_source_only");
    assert.deepEqual(fs.readdirSync(decoy),[],"caller descriptor reuse cannot redirect store traversal");
    requireRecordMetadata(recordPaths(f,bundle).slot);
    requireRecordMetadata(recordPaths(f,bundle).claim);
    withReadOnlyFs(()=>expectError(()=>f.core.observeAuthorizationWinner(
      observationInput(bundle,f.generation)),"apollyon_claim_store_impl_v2_root_generation_changed"));
    assert.deepEqual(fs.readdirSync(decoy),[]);
  }finally{f.cleanup();fs.rmSync(decoy,{recursive:true,force:true});}
}

for(const outer of ["publishClaim","observeAuthorizationWinner"]){
  for(const stage of ["acquire","release",...(outer==="publishClaim"?["revalidate"]:[])]){
    let f;
    let bundle;
    let armed=false;
    let reentries=0;
    const inner=outer==="publishClaim"?"observeAuthorizationWinner":"publishClaim";
    const reenter=()=>{
      if(!armed)return;
      reentries+=1;
      expectError(()=>f.core[inner](inner==="publishClaim"
        ?publishInput(bundle,f.generation):observationInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_transaction_reentry");
    };
    f=fixture({
      acquire(_context,lease){if(stage==="acquire")reenter();return lease;},
      release(){if(stage==="release")reenter();return undefined;},
      onRevalidate(){if(stage==="revalidate")reenter();},
    });
    try{
      bundle=requestBundle(claimRecord(f.generation));
      f.core.publishClaim(publishInput(bundle,f.generation));
      armed=true;
      f.core[outer](outer==="publishClaim"
        ?publishInput(bundle,f.generation):observationInput(bundle,f.generation));
      assert.equal(reentries,stage==="revalidate"?3:1);
      assert.equal(f.txCount(),2,"nested mixed operation never reacquires");
      assert.equal(f.releaseCount(),2);
    }finally{f.cleanup();}
  }
}

for(const role of ["record","observation_directory","observation_root"]){
  const f=fixture();
  let injected=0;
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    f.core.publishClaim(publishInput(bundle,f.generation));
    const before=storeSnapshot(f.root);
    withObservedFs({afterClose(entry){
      if(injected!==0||entry===undefined)return;
      const matched=role==="record"?(entry.flags&O_DIRECTORY)===0:
        role==="observation_root"?isOwnedRoot(entry,f):isTransactionDirectory(entry);
      if(matched){injected+=1;throw ioError("fixture_observation_close");}
    }},({opened,closed})=>{
      const error=expectError(()=>withReadOnlyFs(()=>f.core.observeAuthorizationWinner(
        observationInput(bundle,f.generation))),"apollyon_claim_store_impl_v2_descriptor_cleanup_failed");
      assert.equal(injected,1,role+" close fault reached");
      assert.equal(error.core_store_mutation_may_have_occurred,false);
      requireCleanupDiagnostics(error,role,"apollyon_claim_store_impl_v2_descriptor_close_failed");
      assert.equal(opened.length,8);
      assert.equal(closed.length,8,"one close failure cannot skip another owned descriptor");
      assert.equal(new Set(closed.map(row=>row.serial)).size,8,"failed close is not retried");
    });
    assert.deepEqual(storeSnapshot(f.root),before);
    assert.equal(f.releaseCount(),2);
    requireCoreUnusable(f,publishInput(bundle,f.generation));
    expectError(()=>f.core.observeAuthorizationWinner(observationInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_transaction_core_unusable");
    assert.equal(f.txCount(),2);
  }finally{f.cleanup();}
}

for(const failure of ["acquisition","release","primary_and_close"]){
  let armed=false;
  const f=fixture({
    acquire(_context,lease){return armed&&failure==="acquisition"?Promise.resolve(lease):lease;},
    release(){
      if(armed&&failure==="release")throw ioError("fixture_observation_release");
      return undefined;
    },
  });
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    f.core.publishClaim(publishInput(bundle,f.generation));
    if(failure==="primary_and_close")fs.chmodSync(recordPaths(f,bundle).claim,0o644);
    const before=storeSnapshot(f.root);
    armed=true;
    withObservedFs({afterClose(entry){
      if(failure==="primary_and_close"&&isOwnedRoot(entry,f))throw ioError("fixture_root_close_after_primary");
    }},()=>{
      const code=failure==="acquisition"?"async_transaction_acquisition_forbidden":
        failure==="release"?"transaction_cleanup_indeterminate":"persisted_claim_invalid";
      const error=expectError(()=>withReadOnlyFs(()=>f.core.observeAuthorizationWinner(
        observationInput(bundle,f.generation))),"apollyon_claim_store_impl_v2_"+code);
      if(failure!=="acquisition")assert.equal(error.core_store_mutation_may_have_occurred,false);
      if(failure==="release")requireCleanupDiagnostics(error,"transaction_release",
        "apollyon_claim_store_impl_v2_transaction_release_failed");
      if(failure==="primary_and_close"){
        assert.equal(error.cause.message,error.message,"reader preserves the primary record failure");
        requireCleanupDiagnostics(error,"observation_root",
          "apollyon_claim_store_impl_v2_descriptor_close_failed");
      }
    });
    assert.deepEqual(storeSnapshot(f.root),before);
    requireCoreUnusable(f,publishInput(bundle,f.generation));
  }finally{f.cleanup();}
}

{
  const f=fixture();
  const descriptor=Object.getOwnPropertyDescriptor(process,"platform");
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    Object.defineProperty(process,"platform",{...descriptor,value:"unsupported-proof-platform"});
    withReadOnlyFs(()=>expectError(()=>{
      const unsupported=createApollyonDurableAttemptClaimStoreServiceCoreV2(f.config);
      unsupported.observeAuthorizationWinner(observationInput(bundle,f.generation));
    },"apollyon_claim_store_impl_v2_backend_unsupported"));
    requireStoreUnchanged(f);
  }finally{Object.defineProperty(process,"platform",descriptor);f.cleanup();}
}

// A final name must stay bound to the inode whose file contents were fsynced.
// Same-byte substitutions are still different publication objects.
for(const kind of ["slot","claim"]){
  for(const point of ["before_link","after_link","pending_close_handoff"]){
    const f=fixture();
    const outside=fs.mkdtempSync(path.join(os.tmpdir(),"void-apollyon-publication-inode-swap-"));
    const originalLink=fs.linkSync;
    let substituted=false;
    try{
      const bundle=requestBundle(claimRecord(f.generation));
      const input=publishInput(bundle,f.generation);
      const final=recordPaths(f,bundle)[kind];
      const expected=bytes(kind==="slot"?bundle.slot:bundle.request.claim_record);
      withFsyncTrace(trace=>{
        const replace=pathname=>{
          substituted=true;
          const oldIdentity=inodeKey(fs.lstatSync(pathname,{bigint:true}));
          fs.renameSync(pathname,path.join(outside,"previous-inode.json"));
          fs.writeFileSync(pathname,expected,{mode:0o600,flag:"wx"});
          const replacement=inodeKey(fs.lstatSync(pathname,{bigint:true}));
          assert.notEqual(replacement,oldIdentity,"substitution really creates another inode");
          assert.equal(trace.some(row=>row.type==="file"&&row.identity===replacement),false,
            "replacement inode has never been fsynced when the race is injected");
        };
        fs.linkSync=function substitutedPublicationLink(source,target){
          const matches=path.basename(String(source)).startsWith("pending-"+kind+"-");
          if(!substituted&&matches&&point==="before_link")replace(source);
          const result=originalLink(source,target);
          if(!substituted&&matches&&point==="after_link")replace(target);
          return result;
        };
        withObservedFs({afterClose(entry){
          if(point==="pending_close_handoff"&&!substituted&&entry!==undefined&&
             path.basename(entry.pathname).startsWith("pending-"+kind+"-")&&
             (entry.flags&fs.constants.O_CREAT)!==0){
            replace(final);
          }
        }},()=>{
          expectError(()=>f.core.publishClaim(input),
            "apollyon_claim_store_impl_v2_published_record_binding_changed");
          assert.equal(substituted,true,kind+" "+point+" race actually happened");
          assert.deepEqual(fs.readFileSync(final),expected,"byte equality cannot substitute for inode durability");
          trace.length=0;
          const recovered=f.core.publishClaim(input);
          assert.equal(recovered[kind+"_publication_outcome"],"existing_exact");
          assert.equal(recovered.success_response.durability_proven,true);
          requireRecordMetadata(final);
          requireFinalDurabilityTrace(final,trace);
        });
      });
    }finally{
      fs.linkSync=originalLink;
      f.cleanup();
      fs.rmSync(outside,{recursive:true,force:true});
    }
  }
}

for(const kind of ["slot","claim"]){
  const f=fixture();
  const originalLink=fs.linkSync;
  let raced=false;
  try{
    const bundle=requestBundle(claimRecord(f.generation));
    const final=recordPaths(f,bundle)[kind];
    const expected=bytes(kind==="slot"?bundle.slot:bundle.request.claim_record);
    withFsyncTrace(trace=>{
      fs.linkSync=function racedExistingFinal(source,target){
        if(!raced&&path.basename(String(source)).startsWith("pending-"+kind+"-")){
          raced=true;
          fs.writeFileSync(target,expected,{mode:0o600,flag:"wx"});
          const identity=inodeKey(fs.lstatSync(target,{bigint:true}));
          assert.equal(trace.some(row=>row.type==="file"&&row.identity===identity),false);
        }
        return originalLink(source,target);
      };
      const recovered=f.core.publishClaim(publishInput(bundle,f.generation));
      assert.equal(raced,true,kind+" create-only link encounters an actual EEXIST race");
      assert.equal(recovered[kind+"_publication_outcome"],"existing_exact");
      assert.equal(recovered.success_response.durability_proven,true);
      requireRecordMetadata(final);
      requireFinalDurabilityTrace(final,trace);
      requirePendingEmpty(f);
    });
  }finally{fs.linkSync=originalLink;f.cleanup();}
}

{
  const f=fixture();
  const originalStat=fs.fstatSync;
  let coercions=0;
  let statCalls=0;
  try{
    fs.fstatSync=(...args)=>{statCalls+=1;return originalStat(...args);};
    withObservedFs({},({opened})=>{
      expectError(()=>createApollyonDurableAttemptClaimStoreServiceCoreV2({
        ...f.config,
        session_binding_id:{toString(){coercions+=1;return SESSION_ID;}},
      }),"apollyon_claim_store_impl_v2_config_invalid");
      assert.equal(opened.length,0);
    });
    assert.equal(coercions,0,"session binding is a primitive string, never a coercion callback");
    assert.equal(statCalls,0,"invalid configuration performs no store metadata read");
    assert.equal(f.txCount(),0);
    assert.equal(f.releaseCount(),0);
    assert.deepEqual(f.stages,[]);
  }finally{fs.fstatSync=originalStat;f.cleanup();}
}

for(const [key,value] of Object.entries(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_AUTHORITY_V2
)){
  if([
    "source_implementation_present",
    "store_core_implementation_present",
    "publisher_exact_forward_implementation_present",
    "publisher_forward_bytes_privately_owned",
    "fixed_physical_namespace_defined",
    "non_root_claim_identity_required",
    "create_only_slot_publication_implemented",
    "create_only_claim_publication_implemented",
    "private_pending_fsync_publication_implemented",
    "directory_fsync_implemented",
    "exact_reread_implemented",
    "descriptor_bound_record_reads_implemented",
    "transaction_namespace_revalidation_implemented",
    "operation_owned_root_descriptor_implemented",
    "readonly_authorization_winner_observation_implemented",
    "crash_recovery_exact_pending_link_cleanup_implemented",
    "stale_unlinked_pending_recovery_implemented",
    "transaction_lease_acquired_before_core_mutation",
    "transaction_body_private",
    "transaction_reentry_guard_implemented",
    "transaction_release_synchronous_required",
    "cleanup_failures_reported",
    "exact_same_claim_recovery_implemented",
    "different_claim_in_occupied_slot_rejected_implemented",
    "slot_before_claim_order_implemented",
    "injected_exclusive_transaction_required",
    "injected_prepublication_revalidator_required",
  ].includes(key)){
    assert.equal(value,true,key);
  }else{
    assert.equal(value,false,key);
  }
}

console.log(
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_V2_PROOF_GREEN"
);
console.log("exact_source_and_parent_blobs_pinned=true");
console.log("pr_push_trigger_closure_exact=true");
console.log("pr_push_trigger_parity=true");
console.log("fixed_physical_namespace_defined=true");
console.log("non_root_claim_identity_required=true");
console.log("root_claim_uid_gid_rejected=true");
console.log("publisher_exact_request_bytes_preserved=true");
console.log("publisher_request_reconstruction_forbidden=true");
console.log("retained_root_identity_bound=true");
console.log("active_and_immutable_generation_cross_bound=true");
console.log("slot_before_claim_durable_order_proven=true");
console.log("private_pending_readwrite_same_descriptor_verification=true");
console.log("private_pending_fsync_link_directory_fsync_proven=true");
console.log("exact_final_reread_proven=true");
console.log("exact_replay_idempotent=true");
console.log("different_claim_same_authorization_rejected=true");
console.log("crash_after_slot_exact_recovery_proven=true");
console.log("post_link_cleanup_failure_recovery_proven=true");
console.log("prelink_stale_pending_recovery_proven=true");
console.log("legacy_promise_wrapper_rejected_without_invocation=true");
console.log("transaction_lease_acquired_before_core_mutation=true");
console.log("invalid_transaction_leases_rejected_before_core_mutation=true");
console.log("transaction_lease_accessors_and_proxies_not_invoked=true");
console.log("transaction_body_private=true");
console.log("transaction_reentry_acquire_revalidate_release_rejected=true");
console.log("transaction_callbacks_and_release_snapshotted=true");
console.log("transaction_release_failure_indeterminate_and_poisoned=true");
console.log("transaction_directories_closed_before_release=true");
console.log("partial_directory_open_cleanup_proven=true");
console.log("all_descriptor_cleanup_roles_report_failures=true");
console.log("primary_failure_preserved_with_all_cleanup_diagnostics=true");
console.log("descriptor_close_failures_are_not_retried=true");
console.log("publisher_forward_private_bytes_survive_all_mutation=true");
console.log("publisher_input_copy_override_not_invoked=true");
console.log("publisher_later_copy_override_not_invoked=true");
console.log("native_promise_rejections_handled_without_caller_then=true");
console.log("generation_drift_before_mutation_rejected=true");
console.log("orphan_claim_without_slot_rejected=true");
console.log("async_revalidator_rejected_before_mutation=true");
console.log("async_transaction_acquisition_rejected_before_core_mutation=true");
console.log("held_directory_replacement_rejected_at_all_revalidation_stages=true");
console.log("final_slot_and_claim_checked_after_success_revalidator=true");
console.log("record_initial_metadata_drift_rejected=true");
console.log("record_same_bytes_inode_and_timestamp_drift_rejected=true");
console.log("record_eof_growth_rejected=true");
console.log("bigint_inode_precision_preserved=true");
console.log("readonly_authorization_winner_observation_proven=true");
console.log("observation_request_bytes_privately_copied=true");
console.log("observation_all_descriptors_held_through_final_reread=true");
console.log("observation_missing_partial_and_malformed_state_rejected_without_repair=true");
console.log("observation_fifo_and_socket_refused_without_blocking=true");
console.log("observation_caller_selected_paths_and_slot_records_forbidden=true");
console.log("observation_request_and_persisted_winner_cross_bound=true");
console.log("observation_directory_and_root_transient_drift_rejected=true");
console.log("caller_root_descriptor_reuse_cannot_redirect_active_operation=true");
console.log("mixed_publish_observe_reentry_rejected=true");
console.log("observation_cleanup_errors_preserve_readonly_classification=true");
console.log("unsupported_reader_backend_rejected=true");
console.log("publication_fsynced_inode_bound_before_and_after_link=true");
console.log("publication_handoff_inode_replacement_rejected=true");
console.log("existing_recovery_fsyncs_actual_final_inode_and_directory=true");
console.log("eexist_recovery_fsyncs_actual_final_inode_and_directory=true");
console.log("session_binding_coercion_forbidden_before_store_access=true");
console.log("caller_supplied_revalidator_is_host_proof=false");
console.log("caller_supplied_exclusive_transaction_is_host_proof=false");
console.log("native_peer_runtime_integration_present=false");
console.log("af_unix_listener_implementation_present=false");
console.log("production_claim_store_mutation_performed=false");
console.log("production_durable_attempt_claim_performed=false");
console.log("attempt_claim_authorized=false");
console.log("training_execution_authorized=false");
console.log("xiphos_execution_performed=false");
console.log("funds_movement=false");
