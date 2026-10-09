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

// Test the REPAIR: a caller still owns its original Buffer, but the
// fence writer must detach a private copy before parsing and persist ONLY
// those authenticated bytes. Mutation at O_EXCL is deliberately synthetic.
// All paths below live exclusively under a fresh OS temporary directory.
const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-fence-input-snapshot-positive-"));
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
  assert.notDeepEqual(supplied,original,"the external caller buffer was mutated");
  assert.throws(()=>parseBuyVoidCustodyHighWaterTransitionFenceV1(supplied),
    /custody_hw_transition_fence_record_next_bytes_invalid/u,
    "mutated caller data must fail canonical parsing");
  assert.equal(outcome.status,"created");
  assert.equal(outcome.record_durable_observation,true);
  assert.equal(outcome.stored_record_sha256,digest(original),
    "reported digest must describe privately snapshotted validated bytes");
  const file=path.join(directory,basename);
  const stored=fs.readFileSync(file);
  assert.deepEqual(stored,original,
    "stored permanent record must NOT follow mutated caller input");
  assert.notDeepEqual(stored,supplied,
    "mutated caller buffer must not affect durable slot bytes");
  assert.equal(digest(stored),outcome.stored_record_sha256,
    "stored permanent slot must match its returned SHA-256");
  assert.equal(parseBuyVoidCustodyHighWaterTransitionFenceV1(stored).record_sha256,
    outcome.stored_record_sha256);
  const before=fs.statSync(file).ino;
  const replay=createOnlyBuyVoidCustodyHighWaterFenceRecordV1({
    configured_fence_directory:directory,record_bytes:Buffer.from(original),
  });
  assert.equal(replay.status,"exists_same_transition");
  assert.equal(replay.created,false);
  assert.equal(replay.stored_record_sha256,digest(original));
  assert.equal(fs.statSync(file).ino,before,"replay must keep exact slot inode");
  assert.deepEqual(fs.readFileSync(file),original);
  assert.throws(()=>createOnlyBuyVoidCustodyHighWaterFenceRecordV1({
    configured_fence_directory:directory,record_bytes:supplied,
  }),/custody_hw_transition_fence_record_next_bytes_invalid/u,
  "mutated untrusted bytes must remain invalid");
  assert.deepEqual(fs.readFileSync(file),original);

  console.log("VOID_CUSTODY_FENCE_DETACHED_INPUT_V1_GREEN");
  console.log("exclusive_create_mutation_after_validation=true");
  console.log("caller_owned_bytes_not_written_after_change=true");
  console.log("reported_digest_matches_permanent_slot=true");
  console.log("permanent_slot_canonical_and_replay_idempotent=true");
  console.log("modified_caller_input_remains_rejected=true");
  console.log("healthy_control_create_unchanged=true");
  console.log("all_test_files_under_os_temporary_directory=true");
  console.log("source_only_positive_repair_proof=true");
  console.log("production_allocation_mutation_ready=false");
  console.log("funds_moved=false");
} finally {
  fs.openSync=originalOpen;
  fs.rmSync(root,{recursive:true,force:true});
}
