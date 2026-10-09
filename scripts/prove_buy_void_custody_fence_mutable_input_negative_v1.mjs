#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildBuyVoidCustodyHighWaterTransitionFenceV1,
  parseBuyVoidCustodyHighWaterTransitionFenceV1,
} from "../src/economic/buy_void_custody_high_water_transition_fence_v1.mjs";
import {
  createOnlyBuyVoidCustodyHighWaterFenceRecordV1,
} from "../src/economic/buy_void_custody_high_water_fence_storage_v1.mjs";

const shaId = value => "sha256:" + value.repeat(64);
const highWater = (sequence,generation,tip) =>
  Buffer.from(JSON.stringify({
    marker: "VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_V2",
    version: 2,
    source_composition_id: shaId("a"),
    sequence,
    generation: "0x" + generation.repeat(64),
    state: "active",
    tip_sha256: shaId(tip),
    journal_prefix_sha256: shaId("d"),
  },null,2) + "\n","utf8");
const prior=highWater(1,"b","c");
const next=highWater(2,"e","f");
const decision=buildBuyVoidCustodyHighWaterTransitionFenceV1({
  prior_high_water_bytes:prior,next_high_water_bytes:next,
});
assert.equal(decision.transition_required,true);
const original=Buffer.from(decision.record_bytes);
const basename=decision.transition_slot_id + ".json";
const digest=bytes=>"sha256:"+crypto.createHash("sha256").update(bytes).digest("hex");
assert.equal(digest(original),decision.record_sha256);
assert.deepEqual(parseBuyVoidCustodyHighWaterTransitionFenceV1(original).record_sha256,
  decision.record_sha256);

// This deliberately witnesses a BAD source-only admission condition. A caller
// still owns the Buffer after the storage writer parses it. The synthetic
// open hook simulates concurrent mutation at a deterministic boundary.
// All paths below live exclusively under a fresh OS temporary directory.
const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-fence-input-ownership-negative-"));
const directory=path.join(root,"private");
const controlDir=path.join(root,"control");
const originalOpen=fs.openSync;
let mutated=false;
try {
  fs.mkdirSync(directory,{mode:0o700});
  fs.mkdirSync(controlDir,{mode:0o700});
  const control=createOnlyBuyVoidCustodyHighWaterFenceRecordV1({
    configured_fence_directory:controlDir,record_bytes:Buffer.from(original),
  });
  assert.equal(control.status,"created");
  assert.equal(control.stored_record_sha256,digest(original));
  assert.deepEqual(fs.readFileSync(path.join(controlDir,basename)),original);

  const supplied=Buffer.from(original); // owned by an external caller
  const marker='\"next_high_water_sha256\": \"sha256:';
  const markIndex=supplied.toString("utf8").indexOf(marker);
  assert.ok(markIndex>=0,"canonical hash field must be present");
  const index=markIndex+marker.length;
  assert.ok(index<supplied.length,"hash-byte offset must fit");
  assert.ok((supplied[index]>=0x30&&supplied[index]<=0x39)||
            (supplied[index]>=0x61&&supplied[index]<=0x66));
  fs.openSync=function(pathname,flags,...rest) {
    const fd=Reflect.apply(originalOpen,fs,[pathname,flags,...rest]);
    if(!mutated && typeof pathname==="string" &&
       pathname.endsWith("/"+basename) &&
       typeof flags==="number" &&
       (flags & fs.constants.O_EXCL)!==0 &&
       (flags & fs.constants.O_CREAT)!==0) {
      // Source has ALREADY parsed/validated the original fence record,
      // but has NOT written a byte to the newly created slot.
      supplied[index]=supplied[index]===0x30?0x31:0x30;
      mutated=true;
    }
    return fd;
  };
  let outcome;
  try {
    outcome=createOnlyBuyVoidCustodyHighWaterFenceRecordV1({
      configured_fence_directory:directory,record_bytes:supplied,
    });
  } finally {fs.openSync=originalOpen;}
  assert.equal(mutated,true,"must hit exclusive-create-after-parse fault window");
  assert.equal(outcome.status,"created","vulnerable source reports success");
  assert.equal(outcome.record_durable_observation,true,"vulnerable source claims durability");
  assert.equal(outcome.stored_record_sha256,digest(original),
    "returned identity still describes PRE-mutation bytes");
  const file=path.join(directory,basename);
  const stored=fs.readFileSync(file);
  assert.deepEqual(stored,supplied,"postwrite comparison reused mutated caller buffer");
  assert.equal(stored.length,original.length);
  assert.notDeepEqual(stored,original,"stored bytes differ from verified input");
  assert.notEqual(digest(stored),outcome.stored_record_sha256,
    "reported digest must diverge from committed bytes");
  assert.throws(()=>parseBuyVoidCustodyHighWaterTransitionFenceV1(stored),
    /custody_hw_transition_fence_record_next_bytes_invalid/u,
    "stored record must not retain its original canonical hash binding");
  const before=fs.statSync(file).ino;
  assert.throws(()=>createOnlyBuyVoidCustodyHighWaterFenceRecordV1({
    configured_fence_directory:directory,record_bytes:Buffer.from(original),
  }));
  assert.equal(fs.statSync(file).ino,before,
    "permanent corrupt slot must NOT be removed to hide the defect");
  assert.deepEqual(fs.readFileSync(file),stored);

  console.log("VOID_CUSTODY_FENCE_MUTABLE_INPUT_NEGATIVE_V1_REPRODUCED");
  console.log("exclusive_create_mutation_after_validation=true");
  console.log("caller_owned_bytes_written_after_change=true");
  console.log("reported_digest_mismatch_permanent_slot=true");
  console.log("invalid_permanent_slot_replay_held=true");
  console.log("healthy_control_create_unchanged=true");
  console.log("all_test_files_under_os_temporary_directory=true");
  console.log("source_only_negative_witness=true");
  console.log("production_allocation_mutation_ready=false");
  console.log("funds_moved=false");
} finally {
  fs.openSync=originalOpen;
  fs.rmSync(root,{recursive:true,force:true});
}
