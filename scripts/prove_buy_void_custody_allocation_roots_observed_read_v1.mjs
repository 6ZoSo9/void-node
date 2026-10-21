#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_AUTHORITY_V1,
  VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_V1,
  observeBuyVoidCustodyAllocationRootsReadOnlyV1,
} from "../src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs";

const SOURCE="src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs";
const EXPECTED_SOURCE_BLOB="0bfc2e09ee26cbaefb18d3be1a5a65a4afa9dbcb";
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
const sourceBytes=fs.readFileSync(SOURCE);
assert.equal(gitBlob(sourceBytes),EXPECTED_SOURCE_BLOB,"allocation observer source drift");
const source=sourceBytes.toString("utf8");
assert.match(source,/O_RDONLY[\s\S]*O_NOFOLLOW[\s\S]*O_NONBLOCK/u);
assert.equal(VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_AUTHORITY_V1.fifo_leaf_substitution_nonblocking,true);
for(const key of [
  "allocation_writer_lock_held","installed_service_uid_verified",
  "cross_uid_ipc_authenticated","allocation_reserve_enabled",
  "custody_recover_enabled","filesystem_write",
  "production_allocation_mutation_ready","funds_moved",
]) assert.equal(VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_AUTHORITY_V1[key],false,key);

assert.equal(process.platform,"linux");
assert.ok(typeof process.getuid==="function"&&process.getuid()>0,"nonroot_linux_runner_required");

const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-custody-allocation-read-v1-"));
const ledgerRoot=path.join(root,"ledger");
const highRoot=path.join(root,"high");
const ledgerPath=path.join(ledgerRoot,"allocation-reservations-v1.jsonl");
const highPath=path.join(highRoot,"allocation-reservation-high-water-v1.json");
const ledgerBytes=Buffer.from("", "utf8");
const highBytes=Buffer.from('{"sequence":0}\n',"utf8");
function writeFixture(){
  fs.mkdirSync(ledgerRoot,{recursive:true,mode:0o700});
  fs.mkdirSync(highRoot,{recursive:true,mode:0o700});
  fs.chmodSync(ledgerRoot,0o700);
  fs.chmodSync(highRoot,0o700);
  fs.writeFileSync(ledgerPath,ledgerBytes,{mode:0o600});
  fs.writeFileSync(highPath,highBytes,{mode:0o600});
  fs.chmodSync(ledgerPath,0o600);
  fs.chmodSync(highPath,0o600);
}
function requireHeld(result,reason){
  assert.equal(result.marker,VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_V1);
  assert.equal(result.observed,false,JSON.stringify(result));
  assert.match(result.reason||"",reason);
  assert.equal(result.operation_performed,false);
  assert.equal(result.filesystem_write,false);
  assert.equal(result.production_allocation_mutation_ready,false);
  assert.equal(result.funds_moved,false);
}
try{
  writeFixture();
  const positive=observeBuyVoidCustodyAllocationRootsReadOnlyV1({
    ledger_root:ledgerRoot,high_water_root:highRoot,
  });
  assert.equal(positive.observed,true,positive.reason);
  assert.deepEqual(positive.allocation_jsonl,ledgerBytes);
  assert.deepEqual(positive.allocation_high_water_bytes,highBytes);
  assert.equal(positive.operation_performed,false);
  assert.equal(positive.filesystem_write,false);
  assert.equal(positive.production_allocation_mutation_ready,false);

  const originalOpen=fs.openSync;
  const fifoOriginal=highPath+".fifo-original";
  let fifoSwapExercised=false;
  try{
    fs.openSync=function(target,flags,...args){
      if(!fifoSwapExercised&&typeof target==="string"&&
         target.startsWith("/proc/self/fd/")&&
         target.endsWith("/"+path.basename(highPath))){
        assert.ok((Number(flags)&fs.constants.O_NONBLOCK)!==0,
          "high-water leaf open lost O_NONBLOCK");
        fifoSwapExercised=true;
        fs.renameSync(highPath,fifoOriginal);
        execFileSync("/usr/bin/mkfifo",[highPath],{
          stdio:"ignore",
          env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C"},
        });
        fs.chmodSync(highPath,0o600);
      }
      return originalOpen.call(fs,target,flags,...args);
    };
    requireHeld(observeBuyVoidCustodyAllocationRootsReadOnlyV1({
      ledger_root:ledgerRoot,high_water_root:highRoot,
    }),/private_file_identity_or_bounds_invalid/u);
    assert.equal(fifoSwapExercised,true,"allocation FIFO swap adversary did not execute");
  }finally{
    fs.openSync=originalOpen;
    if(fs.existsSync(highPath))fs.unlinkSync(highPath);
    if(fs.existsSync(fifoOriginal))fs.renameSync(fifoOriginal,highPath);
  }

  const rebound=observeBuyVoidCustodyAllocationRootsReadOnlyV1({
    ledger_root:ledgerRoot,high_water_root:highRoot,
  });
  assert.equal(rebound.observed,true,rebound.reason);

  console.log("VOID_BUY_VOID_CUSTODY_ALLOCATION_ROOTS_OBSERVED_READ_V1_PROOF_GREEN");
  console.log("exact_source_git_blob_verified=true");
  console.log("leaf_fifo_substitution_nonblocking=true");
  console.log("descriptor_and_visible_identity_revalidated=true");
  console.log("cross_root_atomic_snapshot_proven=false");
  console.log("allocation_writer_lock_held=false");
  console.log("allocation_reserve_enabled=false");
  console.log("custody_recover_enabled=false");
  console.log("filesystem_write=false");
  console.log("production_allocation_mutation_ready=false");
  console.log("funds_moved=false");
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
