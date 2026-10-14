#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE="ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v1.json";
const LOCK="ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v1.json";
const CANDIDATE_HEAD="9982e7899a52402ad010fb9066ad78db8c9d49cc";
const CANDIDATE_BYTES=16342;
const CANDIDATE_SHA256="481603ad75f871aef503686548cc1e4b8b54d556f83dca55136813d33d6d991c";
const CANDIDATE_BLOB="6b2958bdb4dbb38354d5a4b41e5b4d1e919b6794";
const CANDIDATE_SET="152dc7a45f4d596513cfd7dc44277ece1aea3d64e30e616089162760ec245a9e";
const PROTECTED_CENSUS_ID="voidbefv7c3_6ecf0dda04818faca50159763d330c6c95baa52148dcdbb3d6faff6a9ae075a";
const PROTECTED_CENSUS_SHA256="c6d2d3707c0e79701579dd2d3f75def150aa2b37b594cdb631f780f0922e01ee";
const PROTECTED_INVENTORY_SHA256="36c18eb2bd7ac1ab02b8a1463e7e9afc82423192eedcdf7e9190f6aaba53bee5";
const LOCK_BYTES=1637;
const LOCK_SHA256="132dd7734174cf5f6ab8a691a9319a327f662de65d90021f1483fad09ffc857a";
const LOCK_BLOB="217c34baf1b37d8f7d51f352a17dae66f78f52fa";

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v),"noncanonical_number");return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v),"noncanonical_value");
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}

function readExact(relative,max=1024*1024){
  const absolute=path.join(ROOT,relative);
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs","nlink"]){
    assert.equal(after[key],before[key],"file_drift:"+relative+":"+key);
  }
  return bytes;
}

function readCandidate(){
  const bytes=readExact(CANDIDATE);
  assert.equal(bytes.length,CANDIDATE_BYTES);
  assert.equal(sha256(bytes),CANDIDATE_SHA256);
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB);
  const c=JSON.parse(bytes.toString("utf8"));
  assert.ok(Buffer.from(JSON.stringify(c,null,2)+"\n").equals(bytes),
    "candidate_json_not_exact_pretty_bytes");
  assert.equal(c.schema,"void_buy_void_enforcement_final_protected_v7_v2_candidate_v1");
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V1");
  assert.equal(c.repository,"6ZoSo9/void-node");
  assert.equal(c.protected_census_parent,"873e4fa7cdc1cdb5e6d39c721759c7bebc8dff86");
  assert.equal(c.current_enforcement_parent,"a2f304fa3ae494cdd4fa71f65aa6f689a1313948");
  assert.equal(c.protected_census_evidence?.census_id,PROTECTED_CENSUS_ID);
  assert.equal(c.protected_census_evidence?.census_json_sha256,PROTECTED_CENSUS_SHA256);
  assert.equal(
    c.protected_census_evidence?.protected_tracked_source_inventory_canonical_sha256,
    PROTECTED_INVENTORY_SHA256,
  );
  assert.equal(c.current_enforcement_tracked_source_inventory_count,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_v1?.length,49);
  assert.equal(c.current_enforcement_tracked_source_inventory_verified,true);
  assert.equal(
    sha256(Buffer.from(canonical(c.current_enforcement_tracked_source_inventory_v1),"utf8")),
    PROTECTED_INVENTORY_SHA256,
  );
  assert.equal(c.complete_executable_closure_verified,true);
  assert.equal(c.candidate_enforcement_identity_accepted,false);
  for(const key of [
    "deployed_artifact_generation_verified","runtime_mount_authority",
    "production_source_finality_authority_ready","public_presale_activation",
    "funds_movement",
  ])assert.equal(c[key],false,key);
  const body=structuredClone(c);
  delete body.candidate_enforcement_set_sha256;
  assert.equal(sha256(Buffer.from(canonical(body),"utf8")),CANDIDATE_SET);
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  return c;
}

function expectedLock(){
  return {
    schema:"void_buy_void_enforcement_final_protected_v7_v2_lock_v1",
    marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V1",
    version:1,
    repository:"6ZoSo9/void-node",
    candidate_head:CANDIDATE_HEAD,
    candidate_evidence:{
      path:CANDIDATE,
      bytes:CANDIDATE_BYTES,
      sha256:CANDIDATE_SHA256,
      git_blob_sha1:CANDIDATE_BLOB,
      candidate_enforcement_set_sha256:CANDIDATE_SET,
    },
    runtime_source_parent:"82aee920f26b45c7e43bcc9f9e1023a175e2783a",
    protected_census_parent:"873e4fa7cdc1cdb5e6d39c721759c7bebc8dff86",
    current_enforcement_parent:"a2f304fa3ae494cdd4fa71f65aa6f689a1313948",
    protected_census_id:PROTECTED_CENSUS_ID,
    protected_census_json_sha256:PROTECTED_CENSUS_SHA256,
    protected_tracked_source_inventory_canonical_sha256:PROTECTED_INVENTORY_SHA256,
    current_enforcement_tracked_source_inventory_count:49,
    current_enforcement_tracked_source_inventory_verified:true,
    complete_executable_closure_verified:true,
    candidate_enforcement_identity_accepted:true,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  };
}

function verify(){
  readCandidate();
  const expected=Buffer.from(JSON.stringify(expectedLock(),null,2)+"\n","utf8");
  assert.equal(expected.length,LOCK_BYTES);
  assert.equal(sha256(expected),LOCK_SHA256);
  assert.equal(gitBlob(expected),LOCK_BLOB);
  assert.ok(readExact(LOCK).equals(expected),"lock_manifest_not_exact");
  return expected;
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify());
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  verify();
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V1_GREEN");
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("protected_tracked_source_inventory_count=49");
  console.log("current_enforcement_tracked_source_inventory_verified=true");
  console.log("complete_executable_closure_verified=true");
  console.log("candidate_enforcement_identity_accepted=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("runtime_mount_authority=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else{
  throw Error("usage: proof [--self-test|--derive]");
}
