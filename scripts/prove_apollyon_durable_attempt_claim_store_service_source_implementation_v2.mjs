#!/usr/bin/env node
import assert from "node:assert/strict";
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
const TARGET_BLOB="31d2d7d91e12132651dfa3429499f09b011318a0";

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
function ioError(message){
  const error=new Error(message);
  error.code="EIO";
  return error;
}
function withObservedFs({beforeOpen=null,afterClose=null}={},run){
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
      },
    },({opened,closed})=>{
      assert.equal(f.core.publishClaim(input).success_response.outcome,"created_durable");
      const directories=opened.filter(isTransactionDirectory);
      assert.equal(directories.length,4);
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
        if(failClose&&isTransactionDirectory(entry))throw ioError("fixture_directory_close");
      },
    },({opened,closed})=>{
      const error=expectError(
        ()=>f.core.publishClaim(input),
        "apollyon_claim_store_impl_v2_claim_directory_invalid",
      );
      const directories=opened.filter(isTransactionDirectory);
      assert.equal(directories.length,2);
      for(const entry of directories){
        assert.equal(closed.filter(row=>row.serial===entry.serial).length,1,
          "partial-open cleanup closes each already-owned descriptor exactly once");
      }
      if(failClose){
        assert.equal(error.cleanup_errors.length,2);
        assert.equal(error.cause.message,error.message);
        requireCleanupDiagnostics(error,"transaction_directory",
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
        if(isTransactionDirectory(entry))throw ioError("fixture_every_directory_close");
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
      assert.equal(error.cleanup_errors.length,5,"four closes and release are all reported");
      requireCleanupDiagnostics(error,"transaction_directory",
        "apollyon_claim_store_impl_v2_descriptor_close_failed");
      requireCleanupDiagnostics(error,"transaction_release",
        "apollyon_claim_store_impl_v2_transaction_release_failed");
      assert.equal(error.cleanup_errors.filter(row=>row.role==="transaction_directory").length,4);
      assert.equal(error.cleanup_errors.at(-1).role,"transaction_release");
      const directories=opened.filter(isTransactionDirectory);
      assert.equal(directories.length,4);
      for(const entry of directories){
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
      "apollyon_claim_store_impl_v2_active_generation_drift",
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
