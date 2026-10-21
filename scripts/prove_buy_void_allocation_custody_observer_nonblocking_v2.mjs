#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1,
  testOnlyReadPinnedFileV2,
} from "../tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v2.mjs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1,
  testOnlyReadRootOwnedPolicyFileV2,
  testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyEvidenceV1,
} from "../tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v2.mjs";

const SELF=fileURLToPath(import.meta.url);
const NOW=1_800_000_000_000;
const POLICY_PATH="/etc/void/buy-void-allocation-custody-witness-live-read-replay-rollback-controls-v1.json";
const V1_INSTALLATION_BLOB="c0c86bc1687fc9a3cb9313b5a68029c35c6a9a63";
const V1_ROLLBACK_BLOB="cf40d9d4a19d138d74aee849a6c02f96ee362dbb";
function gitBlob(bytes){return crypto.createHash("sha1").update(Buffer.from("blob "+String(bytes.length)+"\0","utf8")).update(bytes).digest("hex");}
function canonicalJson(value){
  if(value===null)return "null";
  if(typeof value==="string"||typeof value==="boolean")return JSON.stringify(value);
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonicalJson).join(",")+"]";
  if(value&&typeof value==="object")return "{"+Object.keys(value).sort().map(key=>JSON.stringify(key)+":"+canonicalJson(value[key])).join(",")+"}";
  throw new Error("noncanonical proof value");
}
function sha256Id(value){return "sha256:"+crypto.createHash("sha256").update(value).digest("hex");}
function installationV1(){
  const normalized={
    schema:"void_buy_void_allocation_custody_witness_live_read_replay_installation_evidence_v1",
    marker:"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1",
    version:1,
    parent_writer_marker:"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1",
    high_water_marker:"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_HIGH_WATER_V1",
    hostname:"zoso-Precision-Tower-7810",
    journal_root:{path:"/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1",dev:"2050",ino:"225448588",uid:994,gid:981,mode:0o700,mount_id:33,major_minor:"8:2",fs_type:"ext4",mount_source:"/dev/sda2",mount_source_resolved:"/dev/sda2",mount_point:"/",parent_device:"/dev/sda",disk_serial:"2530E9C796D8",disk_wwn:"0x500a0751e9c796d8"},
    high_water_root:{path:"/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1",dev:"66306",ino:"213909505",uid:994,gid:981,mode:0o700,mount_id:3936,major_minor:"259:2",fs_type:"ext4",mount_source:"/dev/nvme0n1p1",mount_source_resolved:"/dev/nvme0n1p1",mount_point:"/var/lib/void-allocation-custody-v1",parent_device:"/dev/nvme0n1",disk_serial:"25278B802787",disk_wwn:"eui.e8238fa6bf530001001b448b42e66c36"},
    journal_file:{path:"/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1/live-read-replay-v1.jsonl",dev:"2050",ino:"225448589",mtime_ns:"1791332658259059852",ctime_ns:"1791332658259631554",sha256:"sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",bytes:0,uid:994,gid:981,mode:0o600,nlink:1,regular_file:true,symlink:false},
    high_water_file:{path:"/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1/live-read-replay-high-water-v1.json",dev:"66306",ino:"213909506",mtime_ns:"1791332658276916555",ctime_ns:"1791332658276916555",sha256:"sha256:9fbff858219c90347b66d127b45edb869044b2132051042c7cb78d4b6ac21483",bytes:512,uid:994,gid:981,mode:0o600,nlink:1,regular_file:true,symlink:false},
    high_water_sha256:"sha256:9fbff858219c90347b66d127b45edb869044b2132051042c7cb78d4b6ac21483",
    generation:0,sequence:0,event_count:0,pending:false,pending_challenge_sha256:null,pending_challenge_id:null,pending_expires_at_ms:null,last_terminal_state:null,ready_for_issue:true,
  };
  const qualification_id="voidwlrie1_"+crypto.createHash("sha256").update(canonicalJson(normalized),"utf8").digest("hex");
  return {ok:true,status:"LIVE_REPLAY_STORAGE_DOMAINS_QUALIFIED",marker:normalized.marker,version:1,qualification_id,normalized,operation_performed:false,storage_domain_classification_green:true,live_storage_observation_proven:true,distinct_local_storage_domains_proven:true,distinct_parent_block_devices_proven:true,canonical_journal_high_water_binding_proven:true,no_pending_publication_intent_observed:true,double_census_stability_proven:true,live_durable_storage_proven:false,rollback_resistance_proven:false,protected_high_water_custody_proven:false,independent_custody_proven:false,live_evidence_origin_proven:false,external_transport_authenticated:false,external_witness_storage_proven:false,live_remote_read_performed:false,runtime_integration:false,production_gate_ready:false,funds_movement:false,authority:{}};
}
function control(){
  return {schema:"void_buy_void_allocation_custody_witness_live_read_replay_rollback_control_v1",marker:"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_CONTROL_V1",version:1,host_id:"zoso-Precision-Tower-7810",policy_generation:"1",policy_ttl_ms:60_000,journal:{role:"journal",snapshot_enabled:false,snapshot_domain_id:null,backup_enabled:false,backup_domain_id:null,backup_target_id:null,restore_domain_id:"void.replay.journal.restore.v1",rollback_controller_id:"void.replay.journal.rollback.controller.v1",restore_credential_domain_id:"void.replay.journal.restore.credentials.v1",hostwide_snapshot_member:false,hostwide_backup_member:false,automatic_restore_allowed:false,restore_requires_manual_approval:true,restore_requires_separate_credential:true,restore_second_control_required:false},high_water:{role:"high_water",snapshot_enabled:false,snapshot_domain_id:null,backup_enabled:false,backup_domain_id:null,backup_target_id:null,restore_domain_id:"void.replay.high-water.restore.v1",rollback_controller_id:"void.replay.high-water.rollback.controller.v1",restore_credential_domain_id:"void.replay.high-water.restore.credentials.v1",hostwide_snapshot_member:false,hostwide_backup_member:false,automatic_restore_allowed:false,restore_requires_manual_approval:true,restore_requires_separate_credential:true,restore_second_control_required:true},hostwide_snapshot_can_revert_both:false,hostwide_backup_can_revert_both:false,hostwide_restore_can_revert_both:false,shared_rollback_controller:false,coordinated_rollback_without_second_control:false};
}
function policyObservation(){
  const value=control();
  const bytes=Buffer.from(canonicalJson(value)+"\n","utf8");
  return {path:POLICY_PATH,bytes,sha256:sha256Id(bytes),uid:0,gid:0,mode:0o444,nlink:1,dev:"2050",ino:"9001",mtime_ns:"1791333000000000000",ctime_ns:"1791333000000000000",control:value};
}
function fifo(pathname,mode){execFileSync("/usr/bin/mkfifo",[pathname],{stdio:"ignore"});fs.chmodSync(pathname,mode);}
function installationChild(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-observer-v2-install-"));fs.chmodSync(root,0o700);
  const name="journal.json",visible=path.join(root,name);
  try{
    fs.writeFileSync(visible,"x\n",{mode:0o600});
    assert.throws(()=>testOnlyReadPinnedFileV2({root_path:root,name,max_bytes:1024,allow_empty:false,before_open:({visible_path})=>{fs.renameSync(visible_path,visible_path+".original");fifo(visible_path,0o600);}}),/witness_replay_installation_evidence_test_file_invalid/u);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}
function policyChild(){
  assert.equal(process.getuid?.(),0,"policy FIFO fixture requires root");
  const root=fs.mkdtempSync("/root/void-observer-v2-policy-");fs.chmodSync(root,0o700);
  const policy=path.join(root,"policy.json");
  try{
    fs.writeFileSync(policy,"{}\n",{mode:0o444});fs.chownSync(policy,0,0);fs.chmodSync(policy,0o444);
    assert.throws(()=>testOnlyReadRootOwnedPolicyFileV2({policy_path:policy,before_open:({policy_path})=>{fs.renameSync(policy_path,policy_path+".original");fifo(policy_path,0o444);}}),/witness_replay_rollback_policy_evidence_policy_file_changed/u);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}
if(process.argv[2]==="--fifo-installation-child"){installationChild();process.exit(0);}
if(process.argv[2]==="--fifo-policy-child"){policyChild();process.exit(0);}

assert.equal(gitBlob(fs.readFileSync("tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v1.mjs")),V1_INSTALLATION_BLOB);
assert.equal(gitBlob(fs.readFileSync("tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v1.mjs")),V1_ROLLBACK_BLOB);
const installSource=fs.readFileSync("tools/void-buy-allocation-custody-witness-live-read-replay-installation-evidence-v2.mjs","utf8");
const rollbackSource=fs.readFileSync("tools/void-buy-allocation-custody-witness-live-read-replay-rollback-policy-evidence-v2.mjs","utf8");
assert.match(installSource,/O_RDONLY \| O_NOFOLLOW \| O_NONBLOCK/u);
assert.match(rollbackSource,/O_RDONLY \| O_NOFOLLOW \| O_NONBLOCK/u);
assert.match(rollbackSource,/installation-evidence-v2[.]mjs/u);
assert.equal(VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1,"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_V1");
assert.equal(VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1,"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1");
{
  const classified=testOnlyClassifyBuyVoidAllocationCustodyWitnessLiveReadReplayRollbackPolicyEvidenceV1({installation_evidence:installationV1(),policy_file:policyObservation(),verification_now_ms:NOW});
  assert.equal(classified.ok,true);
  assert.equal(classified.marker,"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_V1");
  assert.equal(classified.version,1);
  assert.match(classified.normalized.installation_qualification_id,/^voidwlrie1_[0-9a-f]{64}$/u);
}
for(const mode of ["--fifo-installation-child","--fifo-policy-child"]){
  const child=spawnSync(process.execPath,[SELF,mode],{encoding:"utf8",timeout:3000,env:{...process.env,HOME:"/root"}});
  assert.equal(child.error?.code,undefined,mode+" timed out or failed to spawn");
  assert.equal(child.signal,null,mode+" signal");
  assert.equal(child.status,0,mode+" stderr="+child.stderr);
}
for(const authority of [VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_INSTALLATION_EVIDENCE_AUTHORITY_V1,VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_ROLLBACK_POLICY_EVIDENCE_AUTHORITY_V1]){
  assert.equal(authority.filesystem_write,false);
  assert.equal(authority.storage_bootstrap,false);
  assert.equal(authority.runtime_integration,false);
  assert.equal(authority.production_gate_ready,false);
  assert.equal(authority.funds_movement,false);
}
console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_OBSERVER_NONBLOCKING_V2_PROOF_GREEN");
console.log("historical_v1_observer_blobs_unchanged=true");
console.log("v1_evidence_contract_preserved=true");
console.log("installation_regular_file_open_nonblocking=true");
console.log("rollback_policy_regular_file_open_nonblocking=true");
console.log("rollback_policy_uses_installation_source_v2=true");
console.log("positive_v1_parent_and_policy_classification_preserved=true");
console.log("fifo_swap_fixtures_timeout_bounded=true");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
