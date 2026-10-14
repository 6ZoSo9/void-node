#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE="ops/security/buy-void-enforcement-final-v7-v2-candidate-v1.json";
const LOCK="ops/security/buy-void-enforcement-final-v7-v2-lock-v1.json";
const CANDIDATE_BYTES=5651;
const CANDIDATE_SHA256="929bdd377d64de242387a6db4d37e333333cdaaa4a31cece3126c352e2dcd085";
const CANDIDATE_BLOB="c331e2dbef9fa4f82f3dfcc205a6564e836ad1df";
const CANDIDATE_SET="d62a87d8c6adeccc3a25cc8e9fe3d7199dddee3ea8ac9706d15862adfd446697";
const CANDIDATE_HEAD="d5a8e8914d830ed210cf6483590490632ac76454";
const LOCK_BYTES=2153;
const LOCK_SHA256="9ba2de10bc53a3ade7892d874de518a532220dca567ce0215a91eb5b94a67e0f";
const LOCK_BLOB="7fe92694da6a115d7d2e53c2e39e66eb15799578";

const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");

function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){assert.ok(Number.isSafeInteger(v));return String(v);}
  if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
  assert.ok(v&&typeof v==="object"&&!Array.isArray(v));
  return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function readExact(relative,max=128*1024){
  const absolute=path.join(ROOT,relative);
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  assert.equal(after.dev,before.dev);assert.equal(after.ino,before.ino);
  assert.equal(after.size,before.size);assert.equal(after.mtimeMs,before.mtimeMs);assert.equal(after.ctimeMs,before.ctimeMs);
  return bytes;
}
function readCandidate(){
  const bytes=readExact(CANDIDATE);
  assert.equal(bytes.length,CANDIDATE_BYTES);
  assert.equal(sha256(bytes),CANDIDATE_SHA256);
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB);
  const c=JSON.parse(bytes.toString("utf8"));
  assert.ok(Buffer.from(JSON.stringify(c,null,2)+"\n").equals(bytes));
  assert.equal(c.schema,"void_buy_void_enforcement_final_v7_v2_candidate_v1");
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_FINAL_V7_V2_CANDIDATE_V1");
  assert.equal(c.version,1);
  assert.equal(c.repository,"6ZoSo9/void-node");
  assert.equal(c.source_parent,"82aee920f26b45c7e43bcc9f9e1023a175e2783a");
  assert.equal(c.hosted_census_evidence?.census_id,
    "voidbefv7c2_2dddb68128ce0baff4a848568fac7651c025cc97956cdf1b3d6faff6a9ae075a");
  assert.equal(c.hosted_census_evidence?.artifact_inventory_sha256,
    "8d186c88bad544fdbdcbc928cce3883c83d9be194ae57f2e00ff1cf84e705496");
  assert.equal(c.hosted_census_evidence?.source_inventory_sha256,
    "9036b38b760d34a586aa8fb44f86e85b6120fbf941b1b487069c90bd1739948b");
  assert.equal(c.hosted_census_evidence?.artifact_count,28);
  assert.equal(c.hosted_census_evidence?.source_file_count,28);
  assert.equal(c.hosted_census_evidence?.cross_node_byte_identity_verified,true);
  assert.equal(c.v7_executable_delta?.module_count,6);
  assert.equal(c.v7_executable_delta?.candidate_generation_sha256,
    "cfac0b510932203623a4b9a0c09ad9c6639efdb04b0e5f1ff9feba15175f9311");
  assert.equal(c.v7_executable_delta?.source_inventory_sha256,
    "55b409c31801d743af3e449edce3cdc5408170e16dfc285053a539208c44cacb");
  assert.equal(c.v7_executable_delta?.artifact_inventory_sha256,
    "45ae15e681a209b0cecef9d581febd98e7cefaf3db72d2c869efedd59e2d5429");
  assert.equal(c.live_process_v2_static_edge?.static_execution_closure_verified,true);
  assert.equal(c.live_process_v2_static_edge?.dynamic_import_count,0);
  assert.equal(c.live_process_v2_static_edge?.function_constructor_count,0);
  for(const key of [
    "package_runtime_identity_accepted","provider_closure_composed",
    "delivery_route_closure_composed","live_process_v2_static_execution_closure_verified",
    "third_party_package_runtime_closure_verified","complete_executable_closure_verified",
  ])assert.equal(c[key],true,key);
  for(const key of [
    "candidate_enforcement_identity_accepted","deployed_artifact_generation_verified",
    "runtime_mount_authority","production_source_finality_authority_ready",
    "public_presale_activation","funds_movement",
  ])assert.equal(c[key],false,key);
  const body=structuredClone(c);
  delete body.candidate_enforcement_set_sha256;
  assert.equal(sha256(Buffer.from(canonical(body),"utf8")),CANDIDATE_SET);
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  return c;
}
function expectedLock(){
  return {
    schema:"void_buy_void_enforcement_final_v7_v2_lock_v1",
    marker:"VOID_BUY_VOID_ENFORCEMENT_FINAL_V7_V2_LOCK_V1",
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
    source_parent:"82aee920f26b45c7e43bcc9f9e1023a175e2783a",
    hosted_census_id:"voidbefv7c2_2dddb68128ce0baff4a848568fac7651c025cc97956cdf1b3d6faff6a9ae075a",
    hosted_census_artifact_inventory_sha256:"8d186c88bad544fdbdcbc928cce3883c83d9be194ae57f2e00ff1cf84e705496",
    hosted_census_source_inventory_sha256:"9036b38b760d34a586aa8fb44f86e85b6120fbf941b1b487069c90bd1739948b",
    v7_executable_delta_generation_sha256:"cfac0b510932203623a4b9a0c09ad9c6639efdb04b0e5f1ff9feba15175f9311",
    v7_executable_delta_source_inventory_sha256:"55b409c31801d743af3e449edce3cdc5408170e16dfc285053a539208c44cacb",
    v7_executable_delta_artifact_inventory_sha256:"45ae15e681a209b0cecef9d581febd98e7cefaf3db72d2c869efedd59e2d5429",
    audited_package_profile_id:"voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac",
    audited_package_profile_canonical_sha256:"3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757",
    provider_closure_sha256:"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945",
    provider_closure_semantic_sha256:"95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384",
    live_process_v2_static_execution_closure_verified:true,
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
  assert.ok(readExact(LOCK).equals(expected),"locked_manifest_not_exact");
  return expected;
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive")process.stdout.write(verify());
else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  verify();
  console.log("VOID_BUY_VOID_ENFORCEMENT_FINAL_V7_V2_LOCK_V1_GREEN");
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("live_process_v2_static_execution_closure_verified=true");
  console.log("complete_executable_closure_verified=true");
  console.log("candidate_enforcement_identity_accepted=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("runtime_mount_authority=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else throw Error("usage: proof [--self-test|--derive]");
