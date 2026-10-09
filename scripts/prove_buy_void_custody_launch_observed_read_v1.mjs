#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_CUSTODY_LAUNCH_READ_ONLY_EVIDENCE_V1,
  VOID_BUY_VOID_CUSTODY_LAUNCH_READ_ONLY_EVIDENCE_POLICY_V1,
  observeBuyVoidCustodyLaunchFilesReadOnlyV1,
  testOnlyReadBoundLinuxCustodyEvidenceFileV1,
} from "../src/economic/buy_void_custody_launch_observed_read_v1.mjs";

const SOURCE = "src/economic/buy_void_custody_launch_observed_read_v1.mjs";
const SOURCE_BLOB = "e4da36b14c4bea4aee59ea959c2e6cf1d69bd5aa";
const bytes = fs.readFileSync(SOURCE);
const actual = crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0"))
  .update(bytes).digest("hex");
assert.equal(actual,SOURCE_BLOB,"custody observer source blob drift");
for(const [name,expected] of [
  ["src/economic/buy_void_custody_launch_authority_v2.mjs",
   "223ebdb8317009228094b8ebecef19dc37d87a91"],
  ["src/economic/buy_void_coupled_launch_gate_v1.mjs",
   "e0402744ae51bb7bda2dc1e2038aae217d868ed9"],
]) {
  const original=fs.readFileSync(name);
  const git=crypto.createHash("sha1")
    .update(Buffer.from("blob "+original.length+"\0"))
    .update(original).digest("hex");
  assert.equal(git,expected,"parent source identity drift: "+name);
}

const policy = VOID_BUY_VOID_CUSTODY_LAUNCH_READ_ONLY_EVIDENCE_POLICY_V1;
for(const field of [
  "caller_provided_root_authority", "server_path_configuration_verified",
  "cross_uid_permissions_qualified", "source_gate_verified",
  "receipt_signature_verified", "cross_file_atomic_snapshot_verified",
  "custody_high_water_writer_enabled", "custody_reserve_method_enabled",
  "custody_recover_method_enabled", "service_mounted",
  "production_allocation_mutation_ready",
  "presale_or_market_activation", "funds_movement",
])assert.equal(policy[field],false,field);
assert.equal(policy.source_only_descriptor_reader,true);

const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-custody-observer-v1-"));
const shared=path.join(root,"shared"),economic=path.join(shared,"economic");
const receiptDir=path.join(root,"receipt"),custody=path.join(root,"custody");
const journal=path.join(economic,"buy-void-coupled-live-generation-v1.jsonl");
const receipt=path.join(receiptDir,"synthetic-activation.json");
const highWater=path.join(custody,"synthetic-high-water.json");
const journalBytes=Buffer.from('{"synthetic_journal_only":true}\n',"utf8");
const receiptBytes=Buffer.from('{"synthetic_receipt_only":true}\n',"utf8");
const highWaterBytes=Buffer.from('{"synthetic_high_water_only":true}\n',"utf8");
const req=Object.freeze({
  shared_data_dir:shared,
  activation_receipt_absolute_path:receipt,
  custody_high_water_absolute_path:highWater,
});
const writeInitial=()=>{
  for(const name of [economic,receiptDir,custody]){
    fs.mkdirSync(name,{recursive:true,mode:0o700});
    fs.chmodSync(name,0o700);
  }
  fs.writeFileSync(journal,journalBytes,{mode:0o600});
  fs.writeFileSync(receipt,receiptBytes,{mode:0o600});
  fs.writeFileSync(highWater,highWaterBytes,{mode:0o600});
  for(const file of [journal,receipt,highWater])fs.chmodSync(file,0o600);
};
const held=(input=req)=>{
  const result=observeBuyVoidCustodyLaunchFilesReadOnlyV1(input);
  assert.equal(result.observed,false);
  assert.equal(result.journal_bytes,null);
  assert.equal(result.activation_receipt_bytes,null);
  assert.equal(result.custody_high_water_bytes,null);
  assert.equal(result.production_allocation_mutation_ready,false);
  assert.equal(result.custody_reserve_method_enabled,false);
  assert.equal(result.custody_recover_method_enabled,false);
  assert.equal(result.funds_movement,false);
  return result;
};
const cleanDir=()=>{
  if(fs.existsSync(economic)&&fs.lstatSync(economic).isSymbolicLink())fs.unlinkSync(economic);
  const original=path.join(root,"original-economic");
  if(fs.existsSync(original)) {
    fs.rmSync(economic,{recursive:true,force:true});
    fs.renameSync(original,economic);
  }
};
const originalOpen=fs.openSync,originalRead=fs.readSync;
try {
  writeInitial();
  const positive=observeBuyVoidCustodyLaunchFilesReadOnlyV1(req);
  assert.equal(positive.marker,VOID_BUY_VOID_CUSTODY_LAUNCH_READ_ONLY_EVIDENCE_V1);
  assert.equal(positive.observed,true);
  assert.deepEqual(positive.journal_bytes,journalBytes);
  assert.deepEqual(positive.activation_receipt_bytes,receiptBytes);
  assert.deepEqual(positive.custody_high_water_bytes,highWaterBytes);
  assert.equal(positive.source_gate_verified,false);
  assert.equal(positive.receipt_signature_verified,false);
  assert.equal(positive.server_path_configuration_verified,false);
  assert.equal(positive.cross_file_atomic_snapshot_verified,false);
  assert.equal(positive.custody_reserve_method_enabled,false);
  assert.equal(positive.production_allocation_mutation_ready,false);

  fs.unlinkSync(highWater);
  const missing=held();
  assert.equal(missing.reason,"evidence_missing_or_unreadable");
  fs.writeFileSync(highWater,highWaterBytes,{mode:0o600});

  fs.chmodSync(highWater,0o644);
  held();
  fs.chmodSync(highWater,0o600);

  held({...req,shared_data_dir:"relative"});
  held({...req,custody_high_water_absolute_path:journal});
  held({...req,activation_receipt_absolute_path:highWater});

  fs.renameSync(highWater,highWater+".normal");
  fs.symlinkSync(highWater+".normal",highWater);
  held();
  fs.unlinkSync(highWater);
  fs.renameSync(highWater+".normal",highWater);

  const away=path.join(root,"outside");
  fs.mkdirSync(away,{mode:0o700});
  fs.writeFileSync(path.join(away,path.basename(journal)),"ALIEN\n",{mode:0o600});
  let attacked=false;
  try{
    fs.openSync=function(p,...args){
      if(!attacked&&typeof p==="string"&&
          /^\/proc\/self\/fd\/\d+\/economic$/u.test(p)){
        attacked=true;
        fs.renameSync(economic,path.join(root,"original-economic"));
        fs.symlinkSync(away,economic,"dir");
      }
      return originalOpen.call(fs,p,...args);
    };
    held();
    assert.equal(attacked,true);
  } finally {fs.openSync=originalOpen;cleanDir();}

  attacked=false;
  try{
    fs.readSync=function(fd,buffer,...args){
      if(!attacked){
        attacked=true;
        fs.renameSync(economic,path.join(root,"original-economic"));
        fs.symlinkSync(away,economic,"dir");
      }
      return originalRead.call(fs,fd,buffer,...args);
    };
    held();
    assert.equal(attacked,true);
  } finally {fs.readSync=originalRead;cleanDir();}

  attacked=false;
  let maxSize=0,totalRead=0;
  try{
    fs.readSync=function(fd,buffer,...args){
      if(!attacked){
        attacked=true;
        fs.appendFileSync(journal,Buffer.alloc(3*1024*1024,0x61));
      }
      maxSize=Math.max(maxSize,buffer.length);
      const n=originalRead.call(fs,fd,buffer,...args);
      totalRead+=n;
      return n;
    };
    held();
    assert.equal(attacked,true);
    assert.equal(maxSize,journalBytes.length+1);
    assert.equal(totalRead,journalBytes.length+1);
  } finally {
    fs.readSync=originalRead;
    fs.writeFileSync(journal,journalBytes,{mode:0o600});
  }
  assert.equal(
    testOnlyReadBoundLinuxCustodyEvidenceFileV1(journal,64*1024).toString(),
    journalBytes.toString(),
  );
  assert.equal(observeBuyVoidCustodyLaunchFilesReadOnlyV1(req).observed,true);

  console.log("VOID_BUY_VOID_CUSTODY_LAUNCH_READ_ONLY_EVIDENCE_V1_PROOF_GREEN");
  console.log("exact_source_git_blob_verified=true");
  console.log("three_source_files_bound_by_retained_directory_descriptors=true");
  console.log("custody_high_water_absent_holds=true");
  console.log("custody_high_water_permissions_fail_closed=true");
  console.log("leaf_symlink_rejected=true");
  console.log("ancestor_preopen_swap_rejected=true");
  console.log("ancestor_during_read_swap_rejected=true");
  console.log("three_MiB_growth_read_bounded_to_original_plus_one=true");
  console.log("server_path_configuration_verified=false");
  console.log("cross_file_atomic_snapshot_verified=false");
  console.log("source_gate_verified=false");
  console.log("receipt_signature_verified=false");
  console.log("cross_uid_permissions_qualified=false");
  console.log("custody_high_water_write_performed=false");
  console.log("custody_reserve_method_enabled=false");
  console.log("custody_recover_method_enabled=false");
  console.log("production_allocation_mutation_ready=false");
  console.log("funds_movement=false");
  console.log("real_custody_file_access=false");
} finally {
  fs.openSync=originalOpen;
  fs.readSync=originalRead;
  fs.rmSync(root,{recursive:true,force:true});
}
