#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildBuyVoidCustodyHighWaterTransitionFenceV1,
} from "../src/economic/buy_void_custody_high_water_transition_fence_v1.mjs";
import {
  createOnlyBuyVoidCustodyHighWaterFenceRecordV1,
  VOID_BUY_VOID_CUSTODY_CREATE_ONLY_FENCE_STORAGE_POLICY_V1,
} from "../src/economic/buy_void_custody_high_water_fence_storage_v1.mjs";

const script=fileURLToPath(import.meta.url);
const shaId=value=>"sha256:"+value.repeat(64);
const highWater=(sequence,generation,tip)=>Buffer.from(JSON.stringify({
  marker:"VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_V2",
  version:2,source_composition_id:shaId("a"),sequence,
  generation:"0x"+generation.repeat(64),state:"active",
  tip_sha256:shaId(tip),journal_prefix_sha256:shaId("d"),
},null,2)+"\n");
const prior=highWater(1,"b","c");
const bytesA=highWater(2,"e","1");
const bytesB=highWater(2,"f","2");
const a=buildBuyVoidCustodyHighWaterTransitionFenceV1({
  prior_high_water_bytes:prior,next_high_water_bytes:bytesA,
});
const b=buildBuyVoidCustodyHighWaterTransitionFenceV1({
  prior_high_water_bytes:prior,next_high_water_bytes:bytesB,
});
assert.equal(a.transition_slot_id,b.transition_slot_id,
  "two successors from one prior must share the permanent slot");
assert.ok(!a.record_bytes.equals(b.record_bytes));
const basename=a.transition_slot_id+".json";

function invoke(dir,record){
  return createOnlyBuyVoidCustodyHighWaterFenceRecordV1({
    configured_fence_directory:dir,record_bytes:record,
  });
}
function spawnWorker(root,file){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script,"--worker",root,file],{
      cwd:path.dirname(script),
      stdio:["ignore","pipe","pipe"],
      env:{PATH:process.env.PATH||"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",TZ:"UTC"},
    });
    let stdout="",stderr="";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data",chunk=>{stdout+=chunk;});
    child.stderr.on("data",chunk=>{stderr+=chunk;});
    child.on("error",reject);
    child.on("close",(code)=>{
      if(code!==0){reject(new Error("worker_failed="+code+" "+stderr.slice(0,500)));return;}
      try{resolve(JSON.parse(stdout));}catch(error){reject(error);}
    });
  });
}
async function selfTest(){
  assert.equal(VOID_BUY_VOID_CUSTODY_CREATE_ONLY_FENCE_STORAGE_POLICY_V1.source_only_unmounted,true);
  assert.equal(VOID_BUY_VOID_CUSTODY_CREATE_ONLY_FENCE_STORAGE_POLICY_V1.high_water_writer_integration,false);
  assert.equal(VOID_BUY_VOID_CUSTODY_CREATE_ONLY_FENCE_STORAGE_POLICY_V1.production_allocation_mutation_ready,false);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-create-only-fence-storage-"));
  try {
    const trial=path.join(tmp,"fence");
    fs.mkdirSync(trial,{mode:0o700});
    const wrote=invoke(trial,a.record_bytes);
    assert.equal(wrote.status,"created");
    assert.equal(wrote.record_durable_observation,true);
    const stored=path.join(trial,basename);
    assert.deepEqual(fs.readFileSync(stored),a.record_bytes);
    assert.equal(fs.statSync(stored).mode&0o777,0o600);
    assert.equal(fs.readdirSync(trial).length,1);
    const ino=fs.statSync(stored).ino;
    const again=invoke(trial,a.record_bytes);
    assert.equal(again.status,"exists_same_transition");
    assert.equal(again.created,false);
    assert.equal(fs.statSync(stored).ino,ino);
    assert.throws(()=>invoke(trial,b.record_bytes),
      /custody_hw_transition_fence_competing_successor_same_prior|custody_create_only_fence_storage_slot_conflict/u);
    assert.equal(fs.statSync(stored).ino,ino);
    assert.deepEqual(fs.readFileSync(stored),a.record_bytes);

    // A corrupt/partial or symlink-preplanted permanent slot must remain
    // present and unmodified. Never repair by deleting an unknown record.
    const partial=path.join(tmp,"partial");
    fs.mkdirSync(partial,{mode:0o700});
    const partialFile=path.join(partial,basename);
    fs.writeFileSync(partialFile,Buffer.from("partial","utf8"),{mode:0o600});
    const partialIno=fs.statSync(partialFile).ino;
    assert.throws(()=>invoke(partial,a.record_bytes));
    assert.equal(fs.statSync(partialFile).ino,partialIno);
    assert.equal(fs.readFileSync(partialFile,"utf8"),"partial");

    const symlinkDir=path.join(tmp,"symlink");
    fs.mkdirSync(symlinkDir,{mode:0o700});
    const symlinkFile=path.join(symlinkDir,basename);
    fs.symlinkSync(stored,symlinkFile);
    assert.throws(()=>invoke(symlinkDir,a.record_bytes));
    assert.equal(fs.lstatSync(symlinkFile).isSymbolicLink(),true);
    assert.deepEqual(fs.readFileSync(stored),a.record_bytes);

    const insecure=path.join(tmp,"insecure");
    fs.mkdirSync(insecure,{mode:0o755});
    assert.throws(()=>invoke(insecure,a.record_bytes),
      /custody_create_only_fence_storage_private_root_owner_or_mode_invalid/u);
    assert.equal(fs.readdirSync(insecure).length,0);

    const fault=path.join(tmp,"fsync-fault");
    fs.mkdirSync(fault,{mode:0o700});
    const originalFsync=fs.fsyncSync;
    let faultInvoked=false;
    try {
      fs.fsyncSync=function(fd) {
        if(!faultInvoked){faultInvoked=true;throw new Error("synthetic_record_fsync_failure");}
        return originalFsync(fd);
      };
      assert.throws(()=>invoke(fault,a.record_bytes),/synthetic_record_fsync_failure/u);
      assert.equal(faultInvoked,true);
    } finally {fs.fsyncSync=originalFsync;}
    const faultFile=path.join(fault,basename);
    assert.deepEqual(fs.readFileSync(faultFile),a.record_bytes);
    const recovered=invoke(fault,a.record_bytes);
    assert.equal(recovered.status,"exists_same_transition");
    assert.deepEqual(fs.readFileSync(faultFile),a.record_bytes);

    // Real OS processes compete for one permanent fence slot. Exactly one
    // distinct successor is allowed; losing writer cannot erase/replace it.
    const fileA=path.join(tmp,"proposal-a.json");
    const fileB=path.join(tmp,"proposal-b.json");
    fs.writeFileSync(fileA,a.record_bytes,{mode:0o600});
    fs.writeFileSync(fileB,b.record_bytes,{mode:0o600});
    for(let n=0;n<3;n++){
      const race=path.join(tmp,"race-"+n);
      fs.mkdirSync(race,{mode:0o700});
      const [one,two]=await Promise.all([
        spawnWorker(race,fileA),spawnWorker(race,fileB)
      ]);
      const results=[one,two];
      assert.equal(results.filter(x=>x.status==="created").length,1);
      assert.equal(results.filter(x=>x.status==="held").length,1);
      const winner=results.find(x=>x.status==="created");
      const expected=winner.kind==="a"?a.record_bytes:b.record_bytes;
      assert.deepEqual(fs.readFileSync(path.join(race,basename)),expected);
      assert.equal(fs.readdirSync(race).length,1);
      assert.deepEqual(
        invoke(race,expected).status,"exists_same_transition");
      assert.equal(fs.readdirSync(race).length,1);
    }
    console.log("VOID_CUSTODY_CREATE_ONLY_FENCE_STORAGE_V1_SYNTHETIC_GREEN");
    console.log("two_competing_successors_share_one_slot=true");
    console.log("cross_process_exactly_one_created=true");
    console.log("losing_writer_preserves_winning_record=true");
    console.log("same_record_replay_idempotent=true");
    console.log("corrupt_record_never_deleted=true");
    console.log("symlink_slot_never_followed=true");
    console.log("private_fence_directory_required=true");
    console.log("record_fsync_failure_keeps_permanent_slot=true");
    console.log("high_water_writer_integration=false");
    console.log("cross_process_high_water_rename_serialization_verified=false");
    console.log("production_allocation_mutation_ready=false");
    console.log("funds_moved=false");
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
const args=process.argv.slice(2);
if(args[0]==="--worker"){
  assert.equal(args.length,3);
  const input=fs.readFileSync(args[2]);
  let out;
  try {
    const result=invoke(args[1],input);
    out={status:result.status,kind:input.equals(a.record_bytes)?"a":"b"};
  }catch(error){
    assert.ok(error instanceof Error);
    assert.match(error.message,
      /^(?:custody_hw_transition_fence_competing_successor_same_prior|custody_create_only_fence_storage_(?:record_not_private|record_path_not_bound|record_changed_during_read|record_rebound_after_read|slot_conflict|replay_changed))$/u,
      "loser must HOLD only for a recorded conflicting or in-flight fence");
    out={status:"held",kind:input.equals(a.record_bytes)?"a":"b"};
  }
  process.stdout.write(JSON.stringify(out)+"\n");
}else if(args.length===0||args.length===1&&args[0]==="--self-test"){
  await selfTest();
}else{
  throw new Error("fixture_only_test_mode");
}
