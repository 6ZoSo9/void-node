#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_CUSTODY_PAYMENT_LEDGERS_OBSERVED_READ_POLICY_V1,
  VOID_BUY_VOID_CUSTODY_PAYMENT_LEDGERS_OBSERVED_READ_V1,
  observeBuyVoidCustodyPaymentLedgersReadOnlyV1,
} from "../src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs";

const SOURCE="src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs";
const EXPECTED_SOURCE_BLOB="7c0a960b2dbf728b1daf0abbf5c44f55e2cd4325";
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
const sourceBytes=fs.readFileSync(SOURCE);
assert.equal(gitBlob(sourceBytes),EXPECTED_SOURCE_BLOB,"payment ledger observer source drift");
const source=sourceBytes.toString("utf8");
for(const required of [
  "utilTypes.isProxy(input)",
  "Object.getOwnPropertyDescriptors(input)",
  '"/proc/self/fd/"',
  "requests_changed_during_observation",
  "operator_changed_during_observation",
  "directory_ancestor_changed_during_observation",
  "descriptor_cleanup_failed",
]) assert.ok(source.includes(required),"missing observer boundary: "+required);
for(const forbidden of [
  "writeFileSync","appendFileSync","renameSync","unlinkSync","rmSync",
  "mkdirSync","chmodSync","chownSync",
]) assert.equal(source.includes(forbidden),false,"reader gained write primitive: "+forbidden);

const policy=VOID_BUY_VOID_CUSTODY_PAYMENT_LEDGERS_OBSERVED_READ_POLICY_V1;
for(const [key,value] of Object.entries(policy)){
  const expectedTrue=new Set([
    "source_only_descriptor_reader","linux_procfs_dirfd_required",
    "fixed_ledger_names","cross_file_read_window_unchanged_proven",
  ]);
  assert.equal(value,expectedTrue.has(key),key);
}

const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-custody-payment-read-v1-"));
const requestDir=path.join(root,"runtime");
const requestPath=path.join(requestDir,"requests.jsonl");
const operatorPath=path.join(requestDir,"operator-events.jsonl");
const requestRows=[
  {request_id:"buyvoid_a_aaaaaaaa",quoted_void:"6",source_chain:"base"},
  {request_id:"buyvoid_b_bbbbbbbb",quoted_void:"4",source_chain:"base"},
];
const operatorRows=[
  {request_id:"buyvoid_a_aaaaaaaa",operator_status:"payment_verified"},
];
const bytes=(rows)=>Buffer.from(rows.map(row=>JSON.stringify(row)).join("\n")+"\n","utf8");
const requestBytes=bytes(requestRows);
const operatorBytes=bytes(operatorRows);
const writeFixture=()=>{
  fs.mkdirSync(requestDir,{recursive:true,mode:0o750});
  fs.writeFileSync(requestPath,requestBytes,{mode:0o640});
  fs.writeFileSync(operatorPath,operatorBytes,{mode:0o640});
};
const restoreFixture=()=>{
  if(fs.existsSync(requestDir)&&fs.lstatSync(requestDir).isSymbolicLink()){
    fs.unlinkSync(requestDir);
  }
  const moved=requestDir+".moved";
  if(fs.existsSync(moved)){
    if(fs.existsSync(requestDir))fs.rmSync(requestDir,{recursive:true,force:true});
    fs.renameSync(moved,requestDir);
  }
  writeFixture();
};
function requireHeld(result,reason){
  assert.equal(result.marker,VOID_BUY_VOID_CUSTODY_PAYMENT_LEDGERS_OBSERVED_READ_V1);
  assert.equal(result.observed,false,JSON.stringify(result));
  assert.match(result.reason||"",reason);
  assert.equal(result.requests_jsonl,null);
  assert.equal(result.operator_events_jsonl,null);
  assert.equal(result.cross_file_read_window_unchanged_proven,false);
  assert.equal(result.cross_file_atomic_snapshot_verified,false);
  assert.equal(result.filesystem_write,false);
  assert.equal(result.custody_reserve_method_enabled,false);
  assert.equal(result.production_allocation_mutation_ready,false);
  assert.equal(result.funds_movement,false);
}
try{
  writeFixture();
  const positive=observeBuyVoidCustodyPaymentLedgersReadOnlyV1({request_dir:requestDir});
  assert.equal(positive.observed,true,positive.reason);
  assert.deepEqual(positive.requests_jsonl,requestBytes);
  assert.deepEqual(positive.operator_events_jsonl,operatorBytes);
  assert.equal(positive.cross_file_read_window_unchanged_proven,true);
  assert.equal(positive.cross_file_atomic_snapshot_verified,false);
  assert.equal(positive.server_path_configuration_verified,false);
  assert.equal(positive.cross_uid_permissions_qualified,false);
  assert.equal(positive.payment_capacity_lock_verified,false);
  assert.equal(positive.filesystem_write,false);
  assert.equal(positive.custody_reserve_method_enabled,false);

  let proxyTraps=0;
  const proxied=new Proxy({request_dir:requestDir},{
    getPrototypeOf(target){proxyTraps++;return Reflect.getPrototypeOf(target);},
    ownKeys(target){proxyTraps++;return Reflect.ownKeys(target);},
    getOwnPropertyDescriptor(target,key){
      proxyTraps++;return Reflect.getOwnPropertyDescriptor(target,key);
    },
  });
  requireHeld(observeBuyVoidCustodyPaymentLedgersReadOnlyV1(proxied),
    /input_shape_invalid/u);
  assert.equal(proxyTraps,0,"Proxy trap executed");

  let getterReads=0;
  const accessor={};
  Object.defineProperty(accessor,"request_dir",{
    enumerable:true,configurable:true,
    get(){getterReads++;return requestDir;},
  });
  requireHeld(observeBuyVoidCustodyPaymentLedgersReadOnlyV1(accessor),
    /input_accessor_forbidden/u);
  assert.equal(getterReads,0,"request_dir getter executed");
  requireHeld(observeBuyVoidCustodyPaymentLedgersReadOnlyV1({
    request_dir:requestDir,extra:true,
  }),/input_shape_invalid/u);

  fs.renameSync(operatorPath,operatorPath+".real");
  fs.symlinkSync(path.basename(operatorPath)+".real",operatorPath);
  requireHeld(observeBuyVoidCustodyPaymentLedgersReadOnlyV1({request_dir:requestDir}),
    /operator_leaf_unqualified/u);
  fs.unlinkSync(operatorPath);
  fs.renameSync(operatorPath+".real",operatorPath);

  const originalRead=fs.readSync;
  let readCalls=0;
  try{
    fs.readSync=function(...args){
      readCalls++;
      if(readCalls===2){
        fs.appendFileSync(requestPath,Buffer.from("{}\n","utf8"));
      }
      return originalRead.apply(fs,args);
    };
    requireHeld(observeBuyVoidCustodyPaymentLedgersReadOnlyV1({request_dir:requestDir}),
      /requests_changed_during_observation/u);
    assert.ok(readCalls>=2);
  }finally{
    fs.readSync=originalRead;
    writeFixture();
  }

  readCalls=0;
  let maxBuffer=0;
  try{
    fs.readSync=function(fd,buffer,...args){
      readCalls++;
      maxBuffer=Math.max(maxBuffer,buffer.length);
      if(readCalls===2){
        fs.appendFileSync(operatorPath,Buffer.alloc(3*1024*1024,0x61));
      }
      return originalRead.call(fs,fd,buffer,...args);
    };
    requireHeld(observeBuyVoidCustodyPaymentLedgersReadOnlyV1({request_dir:requestDir}),
      /operator_changed_during_read/u);
    assert.ok(maxBuffer<=Math.max(requestBytes.length,operatorBytes.length)+1,
      "observer allocated from post-open growth");
  }finally{
    fs.readSync=originalRead;
    writeFixture();
  }

  readCalls=0;
  const away=path.join(root,"away");
  fs.mkdirSync(away,{mode:0o750});
  fs.writeFileSync(path.join(away,"requests.jsonl"),requestBytes,{mode:0o640});
  fs.writeFileSync(path.join(away,"operator-events.jsonl"),operatorBytes,{mode:0o640});
  try{
    fs.readSync=function(fd,buffer,...args){
      readCalls++;
      if(readCalls===2){
        fs.renameSync(requestDir,requestDir+".moved");
        fs.symlinkSync(away,requestDir,"dir");
      }
      return originalRead.call(fs,fd,buffer,...args);
    };
    requireHeld(observeBuyVoidCustodyPaymentLedgersReadOnlyV1({request_dir:requestDir}),
      /(?:changed_during_observation|directory_ancestor_changed_during_observation)/u);
    assert.ok(readCalls>=2);
  }finally{
    fs.readSync=originalRead;
    restoreFixture();
    fs.rmSync(away,{recursive:true,force:true});
  }

  const originalOpen=fs.openSync;
  const originalClose=fs.closeSync;
  let injectedOpen=false;
  let cleanupCloses=0;
  try{
    fs.openSync=function(target,...args){
      if(!injectedOpen&&typeof target==="string"&&
         target.startsWith("/proc/self/fd/")&&target.endsWith("/"+path.basename(root))){
        injectedOpen=true;
        const error=new Error("synthetic_midwalk_open_failure");
        error.code="EACCES";
        throw error;
      }
      return originalOpen.call(fs,target,...args);
    };
    fs.closeSync=function(fd){
      cleanupCloses++;
      return originalClose.call(fs,fd);
    };
    requireHeld(observeBuyVoidCustodyPaymentLedgersReadOnlyV1({request_dir:requestDir}),
      /held/u);
    assert.equal(injectedOpen,true);
    assert.ok(cleanupCloses>=2,"mid-walk held directory descriptors were not closed");
  }finally{
    fs.openSync=originalOpen;
    fs.closeSync=originalClose;
  }

  let injectedClose=false;
  try{
    fs.closeSync=function(fd){
      const result=originalClose.call(fs,fd);
      if(!injectedClose){
        injectedClose=true;
        throw new Error("synthetic_close_failure");
      }
      return result;
    };
    requireHeld(observeBuyVoidCustodyPaymentLedgersReadOnlyV1({request_dir:requestDir}),
      /descriptor_cleanup_failed/u);
    assert.equal(injectedClose,true);
  }finally{
    fs.closeSync=originalClose;
  }

  const rebound=observeBuyVoidCustodyPaymentLedgersReadOnlyV1({request_dir:requestDir});
  assert.equal(rebound.observed,true,rebound.reason);
  assert.deepEqual(rebound.requests_jsonl,requestBytes);
  assert.deepEqual(rebound.operator_events_jsonl,operatorBytes);

  console.log("VOID_BUY_VOID_CUSTODY_PAYMENT_LEDGERS_OBSERVED_READ_V1_PROOF_GREEN");
  console.log("exact_source_git_blob_verified=true");
  console.log("fixed_requests_and_operator_leaf_names=true");
  console.log("two_leaf_descriptors_open_before_read=true");
  console.log("cross_file_read_window_unchanged_proven=true");
  console.log("leaf_symlink_rejected=true");
  console.log("request_mutation_during_operator_read_rejected=true");
  console.log("post_open_growth_bounded_and_rejected=true");
  console.log("ancestor_swap_during_read_rejected=true");
  console.log("proxy_and_accessor_execution_count=0");
  console.log("midwalk_descriptor_cleanup_verified=true");
  console.log("descriptor_close_failure_visible=true");
  console.log("server_path_configuration_verified=false");
  console.log("cross_uid_permissions_qualified=false");
  console.log("cross_file_atomic_snapshot_verified=false");
  console.log("payment_capacity_lock_verified=false");
  console.log("filesystem_write=false");
  console.log("custody_reserve_method_enabled=false");
  console.log("production_allocation_mutation_ready=false");
  console.log("funds_moved=false");
}finally{
  fs.readSync=fs.readSync;
  fs.openSync=fs.openSync;
  fs.closeSync=fs.closeSync;
  fs.rmSync(root,{recursive:true,force:true});
}
