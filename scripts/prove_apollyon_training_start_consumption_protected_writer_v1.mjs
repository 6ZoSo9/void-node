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
  qualifyApollyonDurableAttemptClaimStorePolicyV2,
} from "../tools/apollyon-durable-attempt-claim-store-contract-v2.mjs";
import {
  qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
} from "../tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs";
import {
  qualifyApollyonTrainingStartConsumptionContractV1,
} from "../tools/apollyon-training-start-consumption-contract-v1.mjs";
import {
  VOID_APOLLYON_TRAINING_START_CONSUMPTION_PROTECTED_WRITER_AUTHORITY_V1,
  apollyonTrainingStartConsumptionSlotLeafV1,
  classifyApollyonTrainingStartConsumptionProtectedSlotV1,
  publishApollyonTrainingStartConsumptionProtectedV1,
} from "../tools/apollyon-training-start-consumption-protected-writer-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WORKFLOW=path.join(
  ROOT,
  ".github/workflows/apollyon-training-start-consumption-protected-writer-v1.yml",
);

function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-training-start-consumption-protected-writer-v1.mjs":
    "d32f1c5761fa5b95f28c2b2edd1253ca9b28f034",
  "tools/apollyon-training-start-consumption-contract-v1.mjs":
    "42d7d5d4ab75bfd4fc145f63c2a0432f9bcf9bd3",
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs":
    "c2ff992a09fe916a5016b5a6c4ceced4ab1d2fa8",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs":
    "87019ae1245a2054407dd47835b0b7a891d4d9a2",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs":
    "6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs":
    "e27f0ebb968f4611bfc069670325c3f5e6df1c65",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
    "981935515e08634be96446e58922c16be56d33ad",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

const policy=qualifyApollyonDurableAttemptClaimStorePolicyV2();
assert.equal(
  policy.store_policy_id,
  "apollyon_claim_store_policy_v2:e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137",
);

function claimRecord(overrides={}){
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_V2",
    version:2,
    status:"durable_candidate_training_attempt_claim_record_v2",
    store_contract_id:"apollyon_claim_store_contract_v2:"+"1".repeat(64),
    store_policy_id:policy.store_policy_id,
    store_generation_id:"apollyon_claim_store_generation_v2:"+"2".repeat(64),
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"3".repeat(64),
    terminal_runner_receipt_sha256:"4".repeat(64),
    authorization_id:"apollyon_authz_v1:"+"5".repeat(64),
    custody_generation_id:"apollyon_custody_generation_v1:"+"6".repeat(64),
    custody_record_sha256:"7".repeat(64),
    request_sha256:"8".repeat(64),
    canonical_main:"9".repeat(40),
    canonical_tree:"a".repeat(40),
    corpus_sha256:"b".repeat(64),
    parent_adapter_sha256:"c".repeat(64),
    operator_public_key_raw_sha256:"d".repeat(64),
    attempt_limit:1,
    automatic_retry_authorized:false,
    ...overrides,
  };
  return {
    ...material,
    claim_record_id:"apollyon_attempt_claim_record_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
  };
}
function success(record,publishRequestSha){
  return {
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RESPONSE_V2",
    version:2,
    status:"durable_claim_success_v2",
    outcome:"created_durable",
    store_contract_id:record.store_contract_id,
    store_policy_id:record.store_policy_id,
    store_generation_id:record.store_generation_id,
    terminal_receipt_id:record.terminal_receipt_id,
    authorization_id:record.authorization_id,
    custody_generation_id:record.custody_generation_id,
    claim_record_id:record.claim_record_id,
    claim_record_sha256:sha256(Buffer.from(
      canonicalApollyonClaimContractJsonV1(record)+"\n","utf8"
    )),
    publish_request_sha256:publishRequestSha,
    durability_proven:true,
    final_visible_record_revalidated:true,
    training_start_admission:false,
    training_start_consumption_required:true,
    training_start_consumption_performed:false,
    next_gate:"apollyon_training_start_consumption_v1",
  };
}
function authorizationSlotRecord(record,publishRequestSha){
  return qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1({
    store_policy_id:record.store_policy_id,
    authorization_id:record.authorization_id,
    store_contract_id:record.store_contract_id,
    store_generation_id:record.store_generation_id,
    terminal_receipt_id:record.terminal_receipt_id,
    claim_record_id:record.claim_record_id,
    claim_record_sha256:sha256(Buffer.from(
      canonicalApollyonClaimContractJsonV1(record)+"\n","utf8"
    )),
    publish_request_sha256:publishRequestSha,
    attempt_limit:1,
    automatic_retry_authorized:false,
  });
}
function trainer(overrides={}){
  const material={
    marker:"VOID_APOLLYON_PRETRAINING_ADMISSION_GENERATION_V1",
    version:1,
    boot_id_sha256:"f".repeat(64),
    pid:4242,
    process_start_time_ticks:"123456",
    uid:997,
    gid:984,
    source_identity_sha256:"0".repeat(64),
    admission_blocked:true,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    automatic_retry_authorized:false,
    ...overrides,
  };
  return {
    ...material,
    trainer_generation_id:"apollyon_pretraining_generation_v1:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
  };
}
function input(overrides={}){
  const record=overrides.claim_record??claimRecord();
  const publishRequestSha=overrides.publish_request_sha256??"e".repeat(64);
  const trainerGeneration=overrides.trainer_generation??trainer();
  return {
    authorization_slot_record:
      overrides.authorization_slot_record??
      authorizationSlotRecord(record,publishRequestSha),
    claim_record:record,
    publish_request_sha256:publishRequestSha,
    success_response:
      overrides.success_response??success(record,publishRequestSha),
    trainer_generation:trainerGeneration,
  };
}
function consumptionRecord(overrides={}){
  return qualifyApollyonTrainingStartConsumptionContractV1(input(overrides))
    .consumption_record;
}
function newRoot(mode=0o700){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-apollyon-training-consumption-writer-v1-"),
  );
  fs.chmodSync(root,mode);
  return root;
}
function openRoot(root){
  return fs.openSync(
    root,
    fs.constants.O_RDONLY|
      Number(fs.constants.O_DIRECTORY||0)|
      Number(fs.constants.O_CLOEXEC||0),
  );
}
function canonicalBytes(record){
  return Buffer.from(canonicalApollyonClaimContractJsonV1(record)+"\n","utf8");
}
function fileMeta(file){
  const s=fs.lstatSync(file,{bigint:true});
  return {
    dev:s.dev,ino:s.ino,uid:s.uid,gid:s.gid,mode:s.mode,nlink:s.nlink,
    size:s.size,mtimeNs:s.mtimeNs,ctimeNs:s.ctimeNs,
  };
}

const record1=consumptionRecord();
const leaf1=apollyonTrainingStartConsumptionSlotLeafV1(record1);
assert.match(leaf1,/^training-start-consumption-v1-[0-9a-f]{64}\.json$/u);
assert.equal(leaf1.includes(record1.authorization_id),false);

{
  const root=newRoot();
  const fd=openRoot(root);
  try{
    const created=publishApollyonTrainingStartConsumptionProtectedV1({
      directory_fd:fd,
      consumption_record:record1,
    });
    assert.equal(created.status,"training_start_consumption_created_durable");
    assert.equal(created.created_durable,true);
    assert.equal(created.existing_exact_consumption,false);
    assert.equal(created.training_start_admission,false);
    assert.equal(created.trainer_release_authorized,false);
    assert.equal(created.training_execution_authorized,false);
    assert.equal(created.automatic_retry_authorized,false);
    assert.equal(created.protected_consumption_store_origin_proven,false);
    assert.equal(created.unique_authorization_claim_slot_protected_origin_proven,false);
    assert.equal(created.unique_authorization_claim_slot_revalidation_performed,false);

    const final=path.join(root,leaf1);
    const stat=fs.lstatSync(final);
    assert.equal(stat.isFile(),true);
    assert.equal(stat.mode&0o7777,0o600);
    assert.equal(stat.nlink,1);
    assert.deepEqual(fs.readFileSync(final),canonicalBytes(record1));

    const classified=classifyApollyonTrainingStartConsumptionProtectedSlotV1({
      directory_fd:fd,
      expected_consumption_record:record1,
    });
    assert.equal(classified.status,"already_consumed");
    assert.equal(classified.existing_exact_consumption,true);

    const beforeBytes=fs.readFileSync(final);
    const beforeMeta=fileMeta(final);
    const duplicate=publishApollyonTrainingStartConsumptionProtectedV1({
      directory_fd:fd,
      consumption_record:record1,
    });
    assert.equal(duplicate.status,"training_start_consumption_already_consumed");
    assert.equal(duplicate.created_durable,false);
    assert.equal(duplicate.existing_exact_consumption,true);
    assert.equal(duplicate.training_start_admission,false);
    assert.deepEqual(fs.readFileSync(final),beforeBytes);
    assert.deepEqual(fileMeta(final),beforeMeta);

    const record2=consumptionRecord({
      trainer_generation:trainer({
        pid:4343,
        process_start_time_ticks:"123457",
        source_identity_sha256:"1".repeat(64),
      }),
    });
    assert.equal(
      record2.training_start_consumption_slot_id,
      record1.training_start_consumption_slot_id,
    );
    assert.notEqual(
      record2.training_start_consumption_id,
      record1.training_start_consumption_id,
    );
    assert.throws(
      ()=>publishApollyonTrainingStartConsumptionProtectedV1({
        directory_fd:fd,
        consumption_record:record2,
      }),
      /existing_slot_collision/u,
    );
    assert.deepEqual(fs.readFileSync(final),beforeBytes);
    assert.deepEqual(fileMeta(final),beforeMeta);
  }finally{
    fs.closeSync(fd);
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=newRoot();
  const fd=openRoot(root);
  try{
    const final=path.join(root,leaf1);
    fs.writeFileSync(final,"{",{mode:0o600});
    fs.chmodSync(final,0o600);
    const before=fs.readFileSync(final);
    assert.throws(
      ()=>publishApollyonTrainingStartConsumptionProtectedV1({
        directory_fd:fd,
        consumption_record:record1,
      }),
      /existing_record_invalid|existing_record_size_invalid/u,
    );
    assert.deepEqual(fs.readFileSync(final),before);
  }finally{
    fs.closeSync(fd);
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=newRoot();
  const fd=openRoot(root);
  try{
    const final=path.join(root,leaf1);
    const out=fs.openSync(final,"wx",0o600);
    try{fs.ftruncateSync(out,64*1024+1);}
    finally{fs.closeSync(out);}
    assert.throws(
      ()=>publishApollyonTrainingStartConsumptionProtectedV1({
        directory_fd:fd,
        consumption_record:record1,
      }),
      /existing_record_size_invalid/u,
    );
    assert.equal(fs.lstatSync(final).size,64*1024+1);
  }finally{
    fs.closeSync(fd);
    fs.rmSync(root,{recursive:true,force:true});
  }
}

// A failed data close must never prevent the retained O_PATH descriptor
// from being closed. Inject EIO *after* a real close and require both closes.
for(const scenario of [
  {method:"classify",fail:["data"]},
  {method:"publish",fail:["data"]},
  {method:"classify",fail:["path"]},
  {method:"classify",fail:["data","path"]},
]){
  const root=newRoot();
  const fd=openRoot(root);
  const final=path.join(root,leaf1);
  fs.writeFileSync(final,canonicalBytes(record1),{mode:0o600});
  fs.chmodSync(final,0o600);
  const rootBefore=fs.readdirSync(root).sort();
  const bytesBefore=fs.readFileSync(final);
  const fdsBefore=fs.readdirSync("/proc/self/fd").sort();
  const originalOpen=fs.openSync;
  const originalClose=fs.closeSync;
  const O_PATH=Number(fs.constants.O_PATH??0o10000000);
  let pathFd=-1;
  let dataFd=-1;
  const closeOrder=[];
  const errors=[];
  fs.openSync=function observedOpen(target,flags,...args){
    const opened=originalOpen.call(fs,target,flags,...args);
    if(String(target)===final&&(flags&O_PATH)!==0)pathFd=opened;
    else if(pathFd>=0&&String(target)==="/proc/self/fd/"+String(pathFd)&&
            (flags&O_PATH)===0)dataFd=opened;
    return opened;
  };
  fs.closeSync=function injectedClose(target){
    const role=target===dataFd?"data":target===pathFd?"path":null;
    if(role!==null)closeOrder.push(role);
    const result=originalClose.call(fs,target);
    if(role!==null&&scenario.fail.includes(role)){
      errors.push(role);
      const fault=new Error("simulated EIO after real close");
      fault.code="EIO";
      throw fault;
    }
    return result;
  };
  try{
    const run=scenario.method==="publish"
      ?()=>publishApollyonTrainingStartConsumptionProtectedV1({
        directory_fd:fd,consumption_record:record1,
      })
      :()=>classifyApollyonTrainingStartConsumptionProtectedSlotV1({
        directory_fd:fd,expected_consumption_record:record1,
      });
    assert.throws(run,error=>{
      assert.match(String(error.message),/existing_read_close_uncertain/u);
      assert.equal(error.cause?.code,"EIO");
      return true;
    });
    assert.ok(pathFd>=0&&dataFd>=0,"both read descriptors were opened");
    assert.notEqual(pathFd,dataFd);
    assert.deepEqual(closeOrder,["data","path"],
      "both close operations attempted exactly once");
    assert.deepEqual(errors,scenario.fail);
  }finally{
    fs.openSync=originalOpen;
    fs.closeSync=originalClose;
    assert.deepEqual(fs.readdirSync("/proc/self/fd").sort(),fdsBefore);
    assert.deepEqual(fs.readdirSync(root).sort(),rootBefore);
    assert.deepEqual(fs.readFileSync(final),bytesBefore);
    fs.closeSync(fd);
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  // Race a regular existing slot into a FIFO exactly at the visible-path open
  // seam. The implementation must use O_PATH admission rather than a blocking
  // data open of the raced pathname.
  const root=newRoot();
  const fd=openRoot(root);
  const final=path.join(root,leaf1);
  fs.writeFileSync(final,canonicalBytes(record1),{mode:0o600});
  fs.chmodSync(final,0o600);
  const originalOpenSync=fs.openSync;
  const O_PATH=Number(fs.constants.O_PATH??0o10000000);
  let substituted=false;
  let visibleDataOpenAttempts=0;
  fs.openSync=function(target,flags,...args){
    if(String(target)===final&&typeof flags==="number"){
      if(!substituted){
        assert.notEqual(flags&O_PATH,0,"existing slot must be O_PATH-admitted first");
        fs.unlinkSync(final);
        fs.mkfifoSync(final,0o600);
        substituted=true;
      }else if((flags&O_PATH)===0){
        visibleDataOpenAttempts+=1;
      }
    }
    return originalOpenSync.call(fs,target,flags,...args);
  };
  try{
    assert.throws(
      ()=>classifyApollyonTrainingStartConsumptionProtectedSlotV1({
        directory_fd:fd,
        expected_consumption_record:record1,
      }),
      /final_identity_drift|final_metadata_invalid/u,
    );
    assert.equal(substituted,true);
    assert.equal(visibleDataOpenAttempts,0);
  }finally{
    fs.openSync=originalOpenSync;
    fs.closeSync(fd);
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  // Grow a valid slot after admission but before its first FD read. The source
  // must request no more than MAX+1 bytes and fail closed.
  const root=newRoot();
  const fd=openRoot(root);
  const final=path.join(root,leaf1);
  fs.writeFileSync(final,canonicalBytes(record1),{mode:0o600});
  fs.chmodSync(final,0o600);
  const originalReadSync=fs.readSync;
  let grew=false;
  let maxRequested=0;
  fs.readSync=function(targetFd,buffer,offset,length,position){
    maxRequested=Math.max(maxRequested,length);
    if(!grew){
      grew=true;
      fs.appendFileSync(final,Buffer.alloc(64*1024,0x78));
    }
    return originalReadSync.call(fs,targetFd,buffer,offset,length,position);
  };
  try{
    assert.throws(
      ()=>classifyApollyonTrainingStartConsumptionProtectedSlotV1({
        directory_fd:fd,
        expected_consumption_record:record1,
      }),
      /existing_record_size_invalid|final_identity_drift/u,
    );
    assert.equal(grew,true);
    assert.ok(maxRequested<=64*1024+1,maxRequested);
  }finally{
    fs.readSync=originalReadSync;
    fs.closeSync(fd);
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const parent=newRoot();
  const root=path.join(parent,"store");
  fs.mkdirSync(root,{mode:0o700});
  const external=path.join(parent,"outside");
  fs.writeFileSync(external,"do-not-touch",{mode:0o600});
  const fd=openRoot(root);
  try{
    fs.symlinkSync(external,path.join(root,leaf1));
    assert.throws(
      ()=>publishApollyonTrainingStartConsumptionProtectedV1({
        directory_fd:fd,
        consumption_record:record1,
      }),
      /final_metadata_invalid/u,
    );
    assert.equal(fs.readFileSync(external,"utf8"),"do-not-touch");
  }finally{
    fs.closeSync(fd);
    fs.rmSync(parent,{recursive:true,force:true});
  }
}

{
  const root=newRoot();
  const fd=openRoot(root);
  try{
    const final=path.join(root,leaf1);
    fs.writeFileSync(final,canonicalBytes(record1),{mode:0o600});
    fs.chmodSync(final,0o600);
    fs.linkSync(final,path.join(root,"extra-hardlink"));
    const before=fs.readFileSync(final);
    assert.equal(fs.lstatSync(final).nlink,2);
    assert.throws(
      ()=>publishApollyonTrainingStartConsumptionProtectedV1({
        directory_fd:fd,
        consumption_record:record1,
      }),
      /final_metadata_invalid/u,
    );
    assert.deepEqual(fs.readFileSync(final),before);
    assert.equal(fs.lstatSync(final).nlink,2);
  }finally{
    fs.closeSync(fd);
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=newRoot(0o755);
  const fd=openRoot(root);
  try{
    assert.throws(
      ()=>publishApollyonTrainingStartConsumptionProtectedV1({
        directory_fd:fd,
        consumption_record:record1,
      }),
      /directory_policy_invalid/u,
    );
    assert.equal(fs.existsSync(path.join(root,leaf1)),false);
  }finally{
    fs.closeSync(fd);
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=newRoot();
  const fd=openRoot(root);
  const originalLstat=fs.lstatSync;
  let driftInjected=false;
  fs.lstatSync=function(target,...args){
    try{
      return originalLstat.call(fs,target,...args);
    }catch(error){
      if(
        !driftInjected&&
        error?.code==="ENOENT"&&
        String(target).endsWith("/"+leaf1)
      ){
        driftInjected=true;
        fs.chmodSync(root,0o755);
      }
      throw error;
    }
  };
  try{
    assert.throws(
      ()=>publishApollyonTrainingStartConsumptionProtectedV1({
        directory_fd:fd,
        consumption_record:record1,
      }),
      /directory_policy_invalid/u,
    );
    assert.equal(driftInjected,true);
    assert.equal(fs.existsSync(path.join(root,leaf1)),false);
  }finally{
    fs.lstatSync=originalLstat;
    fs.chmodSync(root,0o700);
    fs.closeSync(fd);
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=newRoot();
  const fd=openRoot(root);
  fs.closeSync(fd);
  try{
    assert.throws(
      ()=>publishApollyonTrainingStartConsumptionProtectedV1({
        directory_fd:fd,
        consumption_record:record1,
      }),
      /directory_fd_invalid/u,
    );
    assert.equal(fs.existsSync(path.join(root,leaf1)),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  // Each public operation must reject caller-owned executable objects BEFORE
  // cloning, reflection-heavy copying, opening an owned FD or writing a slot.
  const root=newRoot();
  const fd=openRoot(root);
  let getters=0;
  let traps=0;
  const rawRecord={...record1};
  Object.defineProperty(rawRecord,"authorization_id",{
    enumerable:true,get(){getters+=1;throw Error("nested getter executed");},
  });
  const trapRecord=new Proxy({...record1},{
    get(){traps+=1;throw Error("proxy get executed");},
    ownKeys(){traps+=1;throw Error("proxy ownKeys executed");},
    getPrototypeOf(){traps+=1;throw Error("proxy prototype executed");},
    getOwnPropertyDescriptor(){traps+=1;throw Error("proxy descriptor executed");},
  });
  const revoked=Proxy.revocable({...record1},{});revoked.revoke();
  const hidden={...record1};
  Object.defineProperty(hidden,"hidden_value",{value:1,enumerable:false});
  const symbol={...record1,[Symbol("hidden")]:true};
  const longString={...record1,claim_record_id:"x".repeat(100000)};
  const nested={...record1,claim_record_id:{
    [Symbol.toPrimitive](){getters+=1;throw Error("coercion executed");},
  }};
  const inflated={...record1};
  for(let i=0;i<4096;i++)inflated["extra_"+i]=i;
  const badRecords=[rawRecord,trapRecord,revoked.proxy,hidden,symbol,
    longString,nested,inflated];
  const before=fs.readdirSync(root);
  const origClone=globalThis.structuredClone;
  let callerClone=0;
  try{
    for(const [method,recordKey] of [
      [publishApollyonTrainingStartConsumptionProtectedV1,"consumption_record"],
      [classifyApollyonTrainingStartConsumptionProtectedSlotV1,
        "expected_consumption_record"],
    ]){
      const outerGetter={directory_fd:fd};
      Object.defineProperty(outerGetter,recordKey,{
        enumerable:true,get(){getters+=1;throw Error("outer getter executed");},
      });
      const externalProxy=new Proxy({directory_fd:fd,[recordKey]:record1},{
        get(){traps+=1;throw Error("outer proxy get executed");},
        ownKeys(){traps+=1;throw Error("outer proxy ownKeys executed");},
      });
      const inputVariants=[
        outerGetter,externalProxy,
        {...{directory_fd:fd,[recordKey]:record1},extra_field:true},
      ];
      const hiddenOuter={directory_fd:fd,[recordKey]:record1};
      Object.defineProperty(hiddenOuter,"secret",{value:1,enumerable:false});
      inputVariants.push(hiddenOuter);
      const wrongFd={directory_fd:{
        [Symbol.toPrimitive](){getters+=1;throw Error("FD coercion executed");},
      },[recordKey]:record1};
      inputVariants.push(wrongFd);
      for(const rawInput of inputVariants){
        globalThis.structuredClone=(value,...args)=>{
          if(value===rawInput){callerClone+=1;throw Error("cloned caller input");}
          return origClone(value,...args);
        };
        assert.throws(()=>method(rawInput),
          /apollyon_training_start_writer_(?:input|directory_fd)_invalid/u);
      }
      for(const badRecord of badRecords){
        const rawInput={directory_fd:fd,[recordKey]:badRecord};
        globalThis.structuredClone=(value,...args)=>{
          if(value===rawInput||value===badRecord){
            callerClone+=1;throw Error("cloned caller record");
          }
          return origClone(value,...args);
        };
        assert.throws(()=>method(rawInput),
          /apollyon_training_start_writer_consumption_record_input_invalid/u);
      }
    }
    assert.throws(()=>apollyonTrainingStartConsumptionSlotLeafV1(rawRecord),
      /apollyon_training_start_writer_consumption_record_input_invalid/u);
  }finally{
    globalThis.structuredClone=origClone;
    fs.closeSync(fd);
    assert.deepEqual(fs.readdirSync(root),before,
      "invalid caller inputs must not publish or alter store files");
    fs.rmSync(root,{recursive:true,force:true});
  }
  assert.equal(getters,0,"user getter or coercion was invoked");
  assert.equal(traps,0,"user Proxy trap was invoked");
  assert.equal(callerClone,0,"caller-owned object reached structuredClone");
}

{
  const root=newRoot();
  const fd=openRoot(root);
  try{
    assert.throws(
      ()=>publishApollyonTrainingStartConsumptionProtectedV1({
        directory_fd:fd,
        consumption_record:record1,
        final_leaf:"caller-selected.json",
      }),
      /input_invalid/u,
    );
    assert.equal(fs.readdirSync(root).length,0);
  }finally{
    fs.closeSync(fd);
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  source_candidate_only:true,
  linux_required:true,
  caller_retained_directory_fd_required:true,
  owned_directory_fd_duplication_required:true,
  caller_selected_directory_capability:true,
  caller_supplied_store_path_string_supported:false,
  derived_slot_leaf_only:true,
  arbitrary_leaf_name_supported:false,
  read_scope_one_derived_child_of_supplied_directory:true,
  write_scope_one_derived_child_of_supplied_directory:true,
  exact_parent_consumption_record_required:true,
  protected_consumption_store_origin_proven:false,
  unique_authorization_claim_slot_protected_origin_proven:false,
  unique_authorization_claim_slot_revalidation_performed:false,
  current_store_generation_revalidation_performed:false,
  bounded_existing_slot_read:true,
  create_once_final_record_supported:true,
  directory_policy_revalidated_immediately_before_create:true,
  created_file_descriptor_retained_through_final_reread:true,
  no_overwrite:true,
  no_final_unlink:true,
  no_final_rename:true,
  exact_existing_means_already_consumed:true,
  existing_exact_consumption_reusable_admission:false,
  malformed_or_different_existing_slot_fail_closed:true,
  crash_partial_final_fail_closed:true,
  automatic_retry_authorized:false,
  one_derived_slot_filesystem_mutation_may_occur:true,
  directory_creation:false,
  service_action:false,
  socket_action:false,
  trainer_release_authorized:false,
  trainer_release_performed:false,
  training_execution_authorized:false,
  training_execution_performed:false,
  candidate_weight_mutation_performed:false,
  operator_private_key_access:false,
  production_signing:false,
  wallet_access:false,
  transaction_signing:false,
  transaction_broadcast:false,
  funds_movement:false,
  network_access:false,
})){
  assert.equal(
    VOID_APOLLYON_TRAINING_START_CONSUMPTION_PROTECTED_WRITER_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const writerSource=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-training-start-consumption-protected-writer-v1.mjs"),
  "utf8",
);
for(const required of [
  "captureExactOwnData",
  "captureConsumptionRecord",
  "captureWriterInput",
  "utilTypes.isProxy",
  "openOwnedDirectoryFd",
  "O_EXCL",
  "O_NOFOLLOW",
  "fs.fsyncSync(fd)",
  "fs.fsyncSync(owned.fd)",
  "apollyon_training_start_writer_created_generation_replaced",
  "existing_exact_consumption_reusable_admission:false",
  "crash_partial_final_fail_closed:true",
  "protected_consumption_store_origin_proven:false",
  "unique_authorization_claim_slot_revalidation_performed:false",
]){
  assert.equal(writerSource.includes(required),true,required);
}
for(const forbidden of [
  "unlinkSync(","renameSync(","rmSync(","mkdirSync(","symlinkSync(","linkSync(",
  'from "node:net"','from "node:child_process"',"spawn(","execFile(","fetch(",
  "createPrivateKey","crypto.sign(","process.env",
  "trainer_release_authorized:true","training_execution_authorized:true",
  "training_execution_performed:true","candidate_weight_mutation_performed:true",
  "automatic_retry_authorized:true",
]){
  assert.equal(
    writerSource.includes(forbidden),
    false,
    "writer gained forbidden capability: "+forbidden,
  );
}

assert.equal(writerSource.includes("structuredClone(input)"),false);
assert.equal(writerSource.includes("O_PATH"),true);
assert.equal(writerSource.includes("O_NONBLOCK"),true);
assert.equal(writerSource.includes("readBoundedExistingFinal"),true);
assert.equal(writerSource.includes("closeExistingReadFds"),true);
assert.equal(writerSource.includes("fs.readFileSync(fd)"),false);

const workflow=fs.readFileSync(WORKFLOW,"utf8");
const expectedTriggerPaths=[
  "tools/apollyon-training-start-consumption-protected-writer-v1.mjs",
  "scripts/prove_apollyon_training_start_consumption_protected_writer_v1.mjs",
  "docs/security/apollyon-training-start-consumption-protected-writer-v1.md",
  ".github/workflows/apollyon-training-start-consumption-protected-writer-v1.yml",
  "tools/apollyon-training-start-consumption-contract-v1.mjs",
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs",
];
function eventTriggerPaths(yaml,eventName,nextEventName){
  const lines=yaml.split("\n");
  const eventMarker="  "+eventName+":";
  const nextEventMarker="  "+nextEventName+":";
  const start=lines.indexOf(eventMarker);
  const end=lines.indexOf(nextEventMarker,start+1);
  assert.notEqual(start,-1,"missing "+eventMarker);
  assert.notEqual(end,-1,"missing "+nextEventMarker);
  const eventLines=lines.slice(start+1,end);
  const markers=eventLines
    .map((line,index)=>line==="    paths:"?index:-1)
    .filter(index=>index>=0);
  assert.equal(markers.length,1,eventName+" exact paths subsection count");
  const paths=[];
  for(let i=markers[0]+1;i<eventLines.length;i++){
    const line=eventLines[i];
    const match=/^      - "([^"]+)"$/u.exec(line);
    if(match){paths.push(match[1]);continue;}
    if(/^\s*$/u.test(line))continue;
    if(!line.startsWith("      "))break;
    assert.fail(eventName+" malformed path entry "+line);
  }
  return paths;
}
for(const [eventName,nextEvent] of [
  ["pull_request","push"],
  ["push","workflow_dispatch"],
]){
  const actual=eventTriggerPaths(workflow,eventName,nextEvent);
  assert.equal(new Set(actual).size,actual.length,eventName+" duplicate trigger path");
  assert.deepEqual([...actual].sort(),[...expectedTriggerPaths].sort());
}
assert.equal(workflow.includes("PUSH_BEFORE:"),true);
assert.equal(workflow.includes("github.event.before"),true);

console.log(
  "VOID_APOLLYON_TRAINING_START_CONSUMPTION_PROTECTED_WRITER_V1_PROOF_GREEN"
);
console.log("caller_retained_directory_fd_required=true");
console.log("owned_directory_fd_duplication_required=true");
console.log("caller_selected_directory_capability=true");
console.log("derived_slot_leaf_only=true");
console.log("create_once_o_excl_nofollow=true");
console.log("directory_policy_revalidated_immediately_before_create=true");
console.log("post_absence_directory_mode_drift_rejected=true");
console.log("created_file_descriptor_retained_through_final_reread=true");
console.log("file_fsync_before_parent_fsync=true");
console.log("final_exact_reread_required=true");
console.log("exact_existing_means_already_consumed=true");
console.log("different_same_slot_collision_rejected=true");
console.log("symlink_existing_slot_rejected=true");
console.log("hardlink_existing_slot_rejected=true");
console.log("partial_existing_slot_fail_closed=true");
console.log("oversized_existing_slot_rejected_before_read=true");
console.log("caller_selected_leaf_supported=false");
console.log("caller_accessors_proxies_and_nested_objects_rejected_before_clone=true");
console.log("caller_input_preflight_prevents_untrusted_writer_mutation=true");
console.log("existing_slot_held_inode_admission=true");
console.log("existing_slot_fifo_substitution_nonblocking=true");
console.log("existing_slot_bounded_fd_read=true");
console.log("existing_slot_growth_beyond_max_rejected=true");
console.log("existing_slot_dual_fd_close_fault_safe=true");
console.log("protected_consumption_store_origin_proven=false");
console.log("unique_authorization_claim_slot_revalidation_performed=false");
console.log("trainer_release=false");
console.log("training_execution=false");
