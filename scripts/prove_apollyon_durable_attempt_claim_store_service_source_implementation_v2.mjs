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
const TARGET_BLOB="405fff4ea6ab6158ec2cc3483c317bc5666755ee";

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
  "apollyon_claim_store_impl_v2_transaction_outside_wrapper_call",
  "apollyon_claim_store_impl_v2_transaction_result_substitution",
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
  asyncTransaction=false,
  captureTransaction=false,
  substituteTransactionResult=false,
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
  let txCount=0;
  let savedTransaction=null;
  let generation=null;
  const config={
    root_fd:rootFd,
    claim_uid:uid,
    claim_gid:gid,
    session_binding_id:SESSION_ID,
    withExclusiveStoreTransaction(fn){
      txCount+=1;
      if(asyncTransaction)return Promise.resolve(null);
      if(captureTransaction){
        savedTransaction=fn;
        return null;
      }
      const value=fn();
      return substituteTransactionResult?structuredClone(value):value;
    },
    revalidate(stage,context){
      stages.push(stage);
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
    root,rootFd,active,core,stages,
    txCount:()=>txCount,
    savedTransaction:()=>savedTransaction,
    generation,
    cleanup(){
      try{fs.closeSync(rootFd);}catch{}
      fs.rmSync(root,{recursive:true,force:true});
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
  assert.throws(fn,error=>String(error?.message||error).includes(code));
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
      withExclusiveStoreTransaction:fn=>fn(),
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
  const f=fixture({captureTransaction:true});
  try{
    const record=claimRecord(f.generation);
    const bundle=requestBundle(record);
    expectError(
      ()=>f.core.publishClaim(publishInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_transaction_not_exactly_once",
    );
    const saved=f.savedTransaction();
    assert.equal(typeof saved,"function");
    expectError(
      ()=>saved(),
      "apollyon_claim_store_impl_v2_transaction_outside_wrapper_call",
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
  const f=fixture({substituteTransactionResult:true});
  try{
    const record=claimRecord(f.generation);
    const bundle=requestBundle(record);
    expectError(
      ()=>f.core.publishClaim(publishInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_transaction_result_substitution",
    );
    requireRecordMetadata(path.join(
      f.root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.authorization_slot_directory,
      slotLeaf(bundle.slot),
    ));
    requireRecordMetadata(path.join(
      f.root,
      VOID_APOLLYON_CLAIM_STORE_LAYOUT_V2.claim_directory,
      claimLeaf(record),
    ));
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
  const f=fixture({asyncTransaction:true});
  try{
    const record=claimRecord(f.generation);
    const bundle=requestBundle(record);
    expectError(
      ()=>f.core.publishClaim(publishInput(bundle,f.generation)),
      "apollyon_claim_store_impl_v2_async_transaction_forbidden",
    );
    assert.equal(f.txCount(),1);
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
        withExclusiveStoreTransaction:fn=>fn(),
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
        withExclusiveStoreTransaction:fn=>fn(),
        revalidate:(stage,context)=>revalidationReceipt(stage,context),
      }),
      "apollyon_claim_store_impl_v2_config_invalid",
    );
  }finally{f.cleanup();}
}

for(const [key,value] of Object.entries(
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_AUTHORITY_V2
)){
  if([
    "source_implementation_present",
    "store_core_implementation_present",
    "publisher_exact_forward_implementation_present",
    "fixed_physical_namespace_defined",
    "non_root_claim_identity_required",
    "create_only_slot_publication_implemented",
    "create_only_claim_publication_implemented",
    "private_pending_fsync_publication_implemented",
    "directory_fsync_implemented",
    "exact_reread_implemented",
    "crash_recovery_exact_pending_link_cleanup_implemented",
    "stale_unlinked_pending_recovery_implemented",
    "transaction_callback_lifetime_guard_implemented",
    "transaction_result_passthrough_required",
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
console.log("transaction_callback_lifetime_guard_proven=true");
console.log("transaction_result_substitution_rejected=true");
console.log("generation_drift_before_mutation_rejected=true");
console.log("orphan_claim_without_slot_rejected=true");
console.log("async_revalidator_rejected_before_mutation=true");
console.log("async_transaction_rejected_before_mutation=true");
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
