#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE="ops/security/buy-void-enforcement-post2933-candidate-v2.json";
const LOCK="ops/security/buy-void-enforcement-post2933-lock-v2.json";
const CANDIDATE_BYTES=5004;
const CANDIDATE_SHA256="1472ac34b6bd6b2bcf24ef3934e95121fa95b3b8406e20c7e0160d3faabc0b6f";
const CANDIDATE_BLOB="622807eaf246cae558186bbd1922aebda9025f72";
const CANDIDATE_SET="f1f3fbdd0a015fdabf8da924a53a87174663d38cdde182cdc036cf0f9a3407bd";
const CANDIDATE_HEAD="1c7f0c84cfb89a159cee4d8ee6bf518926bd4c06";
const LOCK_BYTES=1967;
const LOCK_SHA256="dc7dc8ae3bd48ec1e0647cde6ba495671d5ccf51a501ca7cded4f295a83d8faa";
const LOCK_BLOB="af89fe4f852a1480da4e5e72ddf2ccd3be46aed3";
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
  const absolute=path.join(ROOT,relative),before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute),after=fs.lstatSync(absolute);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  assert.equal(after.dev,before.dev);assert.equal(after.ino,before.ino);
  assert.equal(after.size,before.size);assert.equal(after.mtimeMs,before.mtimeMs);assert.equal(after.ctimeMs,before.ctimeMs);
  return bytes;
}
function candidate(){
  const bytes=readExact(CANDIDATE);
  assert.equal(bytes.length,CANDIDATE_BYTES);
  assert.equal(sha256(bytes),CANDIDATE_SHA256);
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB);
  const c=JSON.parse(bytes.toString("utf8"));
  assert.ok(Buffer.from(JSON.stringify(c,null,2)+"\n").equals(bytes));
  assert.equal(c.schema,"void_buy_void_enforcement_post2933_candidate_v2");
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_POST2933_CANDIDATE_V2");
  assert.equal(c.version,2);assert.equal(c.repository,"6ZoSo9/void-node");
  assert.equal(c.source_parent,"ccb4546cf841ce1a43a13339272e4d07c90f7cc0");
  assert.equal(c.hosted_census_evidence?.census_id,
    "voidbe2933c1_b37b0e86035a3dd1ccf09821445069ea0de1626be4763c9d19d2975645a93539");
  assert.equal(c.hosted_census_evidence?.artifact_inventory_sha256,
    "cf36522638c099f7b8c5036fb32d943d6fe543329a36519e69cf2d9fb0105dd0");
  assert.equal(c.hosted_census_evidence?.source_inventory_sha256,
    "4e86bb6f22dbd0e8908697291b78309c295cd316603532a3eb7ccfcc877749d5");
  assert.equal(c.hosted_census_evidence?.cross_node_byte_identity_verified,true);
  assert.equal(c.v7_executable_delta?.candidate_generation_sha256,
    "17e70d5f6fe47f7eda87aabfa79ead574ecadeec4eb44470b774f020c997006e");
  assert.equal(c.v7_executable_delta?.artifact_inventory_sha256,
    "9ddb6e6b9ed47313bec79b20accc26c36be386ce862db8f2f771d871dd7c6fae");
  assert.equal(c.audited_package_runtime?.profile_identity_accepted,true);
  assert.deepEqual(c.audited_package_runtime?.root_packages,["ethers","express"]);
  assert.equal(c.dependency_provider?.provider_closure_identity_accepted,true);
  for(const key of ["package_runtime_identity_accepted","provider_closure_composed",
    "delivery_route_closure_composed","third_party_package_runtime_closure_verified",
    "complete_executable_closure_verified"])assert.equal(c[key],true,key);
  for(const key of ["candidate_enforcement_identity_accepted","deployed_artifact_generation_verified",
    "runtime_mount_authority","production_source_finality_authority_ready",
    "public_presale_activation","funds_movement"])assert.equal(c[key],false,key);
  const body=structuredClone(c);delete body.candidate_enforcement_set_sha256;
  assert.equal(sha256(Buffer.from(canonical(body),"utf8")),CANDIDATE_SET);
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  return c;
}
function expectedLock(){
  return {"schema":"void_buy_void_enforcement_post2933_lock_v2","marker":"VOID_BUY_VOID_ENFORCEMENT_POST2933_LOCK_V2","version":2,"repository":"6ZoSo9/void-node","candidate_head":"1c7f0c84cfb89a159cee4d8ee6bf518926bd4c06","candidate_evidence":{"path":"ops/security/buy-void-enforcement-post2933-candidate-v2.json","bytes":5004,"sha256":"1472ac34b6bd6b2bcf24ef3934e95121fa95b3b8406e20c7e0160d3faabc0b6f","git_blob_sha1":"622807eaf246cae558186bbd1922aebda9025f72","candidate_enforcement_set_sha256":"f1f3fbdd0a015fdabf8da924a53a87174663d38cdde182cdc036cf0f9a3407bd"},"source_parent":"ccb4546cf841ce1a43a13339272e4d07c90f7cc0","hosted_census_id":"voidbe2933c1_b37b0e86035a3dd1ccf09821445069ea0de1626be4763c9d19d2975645a93539","hosted_census_artifact_inventory_sha256":"cf36522638c099f7b8c5036fb32d943d6fe543329a36519e69cf2d9fb0105dd0","hosted_census_source_inventory_sha256":"4e86bb6f22dbd0e8908697291b78309c295cd316603532a3eb7ccfcc877749d5","v7_executable_delta_generation_sha256":"17e70d5f6fe47f7eda87aabfa79ead574ecadeec4eb44470b774f020c997006e","v7_executable_delta_artifact_inventory_sha256":"9ddb6e6b9ed47313bec79b20accc26c36be386ce862db8f2f771d871dd7c6fae","audited_package_profile_id":"voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac","audited_package_profile_canonical_sha256":"3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757","provider_closure_sha256":"3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945","provider_closure_semantic_sha256":"95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384","complete_executable_closure_verified":true,"candidate_enforcement_identity_accepted":true,"deployed_artifact_generation_verified":false,"runtime_mount_authority":false,"production_source_finality_authority_ready":false,"public_presale_activation":false,"funds_movement":false};
}
function verify(){
  candidate();
  const expected=Buffer.from(JSON.stringify(expectedLock(),null,2)+"\n","utf8");
  assert.equal(expected.length,LOCK_BYTES);assert.equal(sha256(expected),LOCK_SHA256);
  assert.equal(gitBlob(expected),LOCK_BLOB);
  assert.ok(readExact(LOCK).equals(expected),"locked_manifest_not_exact");
  return expected;
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive")process.stdout.write(verify());
else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  verify();
  console.log("VOID_BUY_VOID_ENFORCEMENT_POST2933_LOCK_V2_GREEN");
  console.log("candidate_enforcement_set_sha256="+CANDIDATE_SET);
  console.log("complete_executable_closure_verified=true");
  console.log("candidate_enforcement_identity_accepted=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("runtime_mount_authority=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else throw Error("usage: proof [--self-test|--derive]");
