#!/usr/bin/env node
// Synthetic-only crash-stage evidence for the VOID custody V2 high-water.
// NEVER import this script as a production writer: all filenames and state
// are fabricated inside one private os.tmpdir() fixture and destroyed.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER="VOID_BUY_VOID_CUSTODY_HIGH_WATER_ATOMIC_STAGING_TEST_V1";
const PARENT_V2_BLOB="223ebdb8317009228094b8ebecef19dc37d87a91";
const PARENT_OBSERVER_BLOB="d0dd148d6701e5e47cc8301d71a0777876560834";
const SOURCE_PARENT="d882c7435bac405fb8cb9fdc2f143deb730f27a3";
const HIGH_WATER_MARKER="VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_V2";
const MAX_BYTES=16*1024;
const HOLD=Symbol("synthetic_fault");
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const hex32=n=>"0x"+n.repeat(64);
const shaId=n=>"sha256:"+n.repeat(64);
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
function blob(b) {
  return crypto.createHash("sha1").update(Buffer.from("blob "+b.length+"\0"))
    .update(b).digest("hex");
}
function highWater(n,source=shaId("a"),suffix=String(n)) {
  const payload={
    marker:HIGH_WATER_MARKER,version:2,source_composition_id:source,
    sequence:n,generation:hex32("b"),state:"active",
    tip_sha256:shaId(String(suffix).padStart(1,"0").slice(0,1)),
    journal_prefix_sha256:shaId("c")
  };
  return Buffer.from(JSON.stringify(payload,null,2)+"\n","utf8");
}
function valid(bytes) {
  assert.ok(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=MAX_BYTES,
    "test_only_candidate_size_invalid");
  const obj=JSON.parse(bytes.toString("utf8"));
  assert.deepEqual(Object.keys(obj),[
    "marker","version","source_composition_id","sequence","generation",
    "state","tip_sha256","journal_prefix_sha256"
  ],"test_only_high_water_closed_keys");
  assert.equal(obj.marker,HIGH_WATER_MARKER);
  assert.equal(obj.version,2);
  assert.equal(obj.state,"active");
  assert.ok(Number.isSafeInteger(obj.sequence)&&obj.sequence>0);
  assert.match(obj.source_composition_id,/^sha256:[0-9a-f]{64}$/u);
  assert.match(obj.generation,/^0x[0-9a-f]{64}$/u);
  assert.match(obj.tip_sha256,/^sha256:[0-9a-f]{64}$/u);
  assert.match(obj.journal_prefix_sha256,/^sha256:[0-9a-f]{64}$/u);
  assert.ok(bytes.equals(Buffer.from(JSON.stringify(obj,null,2)+"\n")),
    "noncanonical_high_water_bytes");
  return obj;
}
function testRoot(root,permit){
  assert.equal(permit,root.guard,"test_only_root_capability_missing");
  assert.equal(root.path,path.resolve(root.path));
  assert.equal(fs.realpathSync(root.path),root.path);
  assert.ok(root.path.startsWith(path.resolve(os.tmpdir())+path.sep));
  const st=fs.lstatSync(root.path);
  assert.ok(st.isDirectory()&&!st.isSymbolicLink()&&(st.mode&0o077)===0);
  return root.path;
}
function fixture() {
  const name=fs.mkdtempSync(path.join(os.tmpdir(),"void-hw-atomic-fixture-"));
  fs.chmodSync(name,0o700);
  return {path:name,guard:crypto.randomBytes(32).toString("hex")};
}
function readCurrent(root){
  const p=path.join(root.path,"synthetic-high-water-v2.json");
  if(!fs.existsSync(p))return null;
  const st=fs.lstatSync(p);
  assert.ok(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&
    (st.mode&0o077)===0&&st.size>0&&st.size<=MAX_BYTES);
  const bytes=fs.readFileSync(p);
  assert.equal(bytes.length,st.size);
  valid(bytes);
  return bytes;
}
// This intentionally has NO export and NO caller-supplied path argument.
// It is NOT a lock, cross-UID IPC endpoint, signed-lease validator, power-loss
// durability guarantee or production-capable high-water writer.
function testOnlyStageAndRename(root,permit,{expected,proposed,fault=null,stage="stage-1"}) {
  const directory=testRoot(root,permit);
  assert.match(stage,/^stage-[1-9][0-9]{0,2}$/u);
  const old=readCurrent(root);
  if(expected===null)assert.equal(old,null,"unexpected_prior_high_water");
  else {
    assert.ok(Buffer.isBuffer(expected),"missing_exact_expected_previous");
    assert.ok(old?.equals(expected),"prior_high_water_changed");
  }
  const next=valid(proposed);
  if(old!==null){
    const before=valid(old);
    assert.equal(next.source_composition_id,before.source_composition_id,
      "cross_source_high_water_forbidden");
    assert.ok(next.sequence>=before.sequence,"high_water_rollback_forbidden");
    if(next.sequence===before.sequence){
      assert.ok(proposed.equals(old),"conflicting_same_sequence_high_water");
      return {step:"unchanged",stage_created:false,synthetic_acknowledged:true};
    }
  }
  const destination=path.join(directory,"synthetic-high-water-v2.json");
  const pending=path.join(directory,"."+stage+".pending");
  const dirFd=fs.openSync(directory,
    fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW);
  let fileFd;
  let phase="admission";
  try {
    if(fault==="before_stage")throw HOLD;
    fileFd=fs.openSync(pending,
      fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|
      fs.constants.O_NOFOLLOW,0o600);
    const written=fs.writeSync(fileFd,proposed,0,proposed.length,0);
    assert.equal(written,proposed.length,"short_write");
    phase="stage_written";
    if(fault==="after_stage_write")throw HOLD;
    fs.fsyncSync(fileFd);
    phase="staged_fsynced";
    if(fault==="after_stage_fsync")throw HOLD;
    // The before/after current-state check is only a test of sequential
    // callers; a real writer requires a reviewed exclusive custody lock.
    const current=readCurrent(root);
    if(expected===null)assert.equal(current,null);
    else assert.ok(current?.equals(expected),"stale_cas_before_rename");
    fs.renameSync(pending,destination);
    phase="renamed_unacknowledged";
    if(fault==="after_rename")throw HOLD;
    fs.fsyncSync(dirFd);
    phase="directory_fsynced";
    if(fault==="after_directory_fsync")throw HOLD;
    const readback=readCurrent(root);
    assert.ok(readback?.equals(proposed),"postpublish_bytes_changed");
    return {step:phase,stage_created:true,synthetic_acknowledged:true};
  } catch(error){
    if(error!==HOLD)throw error;
    return {step:phase,stage_created:fs.existsSync(pending),
      synthetic_acknowledged:false,fault};
  } finally {
    if(fileFd!==undefined)fs.closeSync(fileFd);
    fs.closeSync(dirFd);
  }
}
function caseRun({prior=null,proposed=highWater(2),fault,stage}){
  const root=fixture();
  try{
    if(prior!==null)fs.writeFileSync(
      path.join(root.path,"synthetic-high-water-v2.json"),prior,{mode:0o600});
    const result=testOnlyStageAndRename(root,root.guard,{
      expected:prior,proposed,fault,stage
    });
    return {root,result,actual:readCurrent(root)};
  } catch(e){
    fs.rmSync(root.path,{recursive:true,force:true});
    throw e;
  }
}
async function test(){
  const source=fs.readFileSync(path.join(ROOT,
    "src/economic/buy_void_custody_launch_authority_v2.mjs"));
  const observer=fs.readFileSync(path.join(ROOT,
    "src/economic/buy_void_custody_launch_observed_read_v1.mjs"));
  assert.equal(blob(source),PARENT_V2_BLOB);
  assert.equal(blob(observer),PARENT_OBSERVER_BLOB);
  assert.equal(process.platform,"linux","Linux synthetic fsync model only");
  const older=highWater(1),newer=highWater(2),newest=highWater(3);
  for(const [key,point] of [
    ["before_stage","before_stage"],["after_stage_write","after_stage_write"],
    ["after_stage_fsync","after_stage_fsync"],
    ["after_rename","after_rename"],
    ["after_directory_fsync","after_directory_fsync"],
  ]){
    const result=caseRun({prior:older,proposed:newer,fault:point,
      stage:"stage-"+(1+[
        "before_stage","after_stage_write","after_stage_fsync",
        "after_rename","after_directory_fsync"].indexOf(point))});
    try{
      assert.equal(result.result.synthetic_acknowledged,false,key);
      if(["before_stage","after_stage_write","after_stage_fsync"].includes(point))
        assert.ok(result.actual?.equals(older),"uncommitted high-water changed");
      else
        assert.ok(result.actual?.equals(newer),
          "renamed-but-unacknowledged expected new file in process model");
    }finally{fs.rmSync(result.root.path,{recursive:true,force:true});}
  }
  const root=fixture();
  try{
    assert.equal(readCurrent(root),null);
    const first=testOnlyStageAndRename(root,root.guard,{
      expected:null,proposed:older,stage:"stage-10"});
    assert.equal(first.step,"directory_fsynced");
    const second=testOnlyStageAndRename(root,root.guard,{
      expected:older,proposed:newer,stage:"stage-11"});
    assert.equal(second.step,"directory_fsynced");
    const replay=testOnlyStageAndRename(root,root.guard,{
      expected:newer,proposed:Buffer.from(newer),stage:"stage-12"});
    assert.equal(replay.step,"unchanged");
    assert.equal(replay.stage_created,false,"idempotent replay did extra write");
    assert.ok(readCurrent(root)?.equals(newer));
    assert.throws(()=>testOnlyStageAndRename(root,root.guard,{
      expected:newer,proposed:older,stage:"stage-13"}),/high_water_rollback_forbidden/);
    const conflicting=highWater(2,shaId("a"),"d");
    assert.throws(()=>testOnlyStageAndRename(root,root.guard,{
      expected:newer,proposed:conflicting,stage:"stage-14"}),
      /conflicting_same_sequence_high_water/);
    assert.throws(()=>testOnlyStageAndRename(root,root.guard,{
      expected:newer,proposed:highWater(3,shaId("e")),stage:"stage-15"}),
      /cross_source_high_water_forbidden/);
    assert.throws(()=>testOnlyStageAndRename(root,root.guard,{
      expected:older,proposed:newest,stage:"stage-16"}),
      /prior_high_water_changed/);
    assert.throws(()=>testOnlyStageAndRename(root,"forged",{
      expected:newer,proposed:newest,stage:"stage-17"}),
      /test_only_root_capability_missing/);
    fs.symlinkSync("synthetic-high-water-v2.json",
      path.join(root.path,".stage-18.pending"));
    assert.throws(()=>testOnlyStageAndRename(root,root.guard,{
      expected:newer,proposed:newest,stage:"stage-18"}),/EEXIST/);
    fs.unlinkSync(path.join(root.path,".stage-18.pending"));
    const complete=testOnlyStageAndRename(root,root.guard,{
      expected:newer,proposed:newest,stage:"stage-19"});
    assert.equal(complete.step,"directory_fsynced");
    assert.ok(readCurrent(root)?.equals(newest));
    // The production V2 classifier must never be used on this unsigned
    // synthetic input; only its pure canonical serializer is checked.
    if(process.argv.includes("--with-v2")){
      const {buildBuyVoidCustodyLaunchHighWaterV2}=await import(
        "../src/economic/buy_void_custody_launch_authority_v2.mjs");
      const input=JSON.parse(newest.toString("utf8"));
      assert.ok(buildBuyVoidCustodyLaunchHighWaterV2(input).equals(newest),
        "V2 canonical high-water serializer mismatch");
    }
  }finally{fs.rmSync(root.path,{recursive:true,force:true});}
  console.log(MARKER+"_GREEN");
  console.log("synthetic_fault_points=5");
  console.log("pre_rename_faults_leave_previous_bytes=true");
  console.log("post_rename_pre_dirfsync_not_acknowledged=true");
  console.log("post_dirfsync_fault_does_not_claim_authority=true");
  console.log("synthetic_idempotent_retry_no_extra_write=true");
  console.log("synthetic_rollback_same_sequence_conflict_and_cross_source_hold=true");
  console.log("synthetic_stale_expected_prior_rejected=true");
  console.log("synthetic_symlink_staging_path_rejected=true");
  console.log("production_custody_high_water_write_performed=false");
  console.log("real_power_loss_durability_verified=false");
  console.log("cross_uid_exclusive_serialization_verified=false");
  console.log("dual_signed_launch_receipt_verified=false");
  console.log("cross_file_atomic_snapshot_verified=false");
  console.log("custody_reserve_method_enabled=false");
  console.log("custody_recover_method_enabled=false");
  console.log("production_allocation_mutation_ready=false");
  console.log("funds_moved=false");
}
const args=process.argv.slice(2);
assert.ok(args.length===1&&args[0]==="--self-test" ||
  args.length===2&&args[0]==="--self-test"&&args[1]==="--with-v2",
  "test_only_no_production_writer_mode");
await test();
