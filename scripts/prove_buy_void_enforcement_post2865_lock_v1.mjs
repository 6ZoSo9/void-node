#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const CANDIDATE="ops/security/buy-void-enforcement-post2865-candidate-v1.json";
const LOCK="ops/security/buy-void-enforcement-post2865-lock-v1.json";
const CANDIDATE_BYTES=2806;
const CANDIDATE_SHA256="d2b1488dbc6b9dffeb7cdf428be10ea01720081347bc53438ed89a468defc70d";
const CANDIDATE_BLOB="e85ec223ccb5babcc834a300e1be5abc315626dd";
const CANDIDATE_SET="1f83d8e867fc53e8a9ed240f4876f1f9412b7b2dca7c06cbb479dbe38e40a93b";
const CANDIDATE_HEAD="3c93b17200c4eeffeaea488c2970c5f7dcc6891e";
const COMPILED_GENERATION="18758f6563f9a96aea0d55e293a4c10da8de349ba12ecc90fdebd82f486b944c";
const PROFILE_ID="voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac";
const PROFILE_CANONICAL="3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757";
const PROVIDER="3b6be7b9efdc7f70b6f270f77208efab2f7321136a54cc76a7e1d34c57bd4945";
const PROVIDER_SEMANTIC="95112d913d45b2b03887edb97c8693eef84a72b54b61503ffc66a6a7bce67384";

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
  const st=fs.lstatSync(absolute);
  assert.ok(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size>0&&st.size<=max,
    "invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  assert.equal(bytes.length,st.size,"short_read:"+relative);
  return bytes;
}
function candidate(){
  const bytes=readExact(CANDIDATE);
  assert.equal(bytes.length,CANDIDATE_BYTES);
  assert.equal(sha256(bytes),CANDIDATE_SHA256);
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB);
  const c=JSON.parse(bytes.toString("utf8"));
  assert.equal(c.schema,"void_buy_void_enforcement_post2865_candidate_v1");
  assert.equal(c.marker,"VOID_BUY_VOID_ENFORCEMENT_POST2865_CANDIDATE_V1");
  assert.equal(c.version,1);
  assert.equal(c.repository,"6ZoSo9/void-node");
  assert.equal(c.compiled_source_finality?.compiled_artifact_generation_sha256,COMPILED_GENERATION);
  assert.equal(c.compiled_source_finality?.compiled_artifact_generation_verified,true);
  assert.equal(c.audited_package_runtime?.profile_id,PROFILE_ID);
  assert.equal(c.audited_package_runtime?.profile_canonical_sha256,PROFILE_CANONICAL);
  assert.equal(c.dependency_provider?.provider_closure_sha256,PROVIDER);
  assert.equal(c.dependency_provider?.provider_closure_semantic_sha256,PROVIDER_SEMANTIC);
  for(const key of [
    "package_runtime_identity_accepted","provider_closure_composed",
    "delivery_route_closure_composed","third_party_package_runtime_closure_verified",
    "complete_executable_closure_verified",
  ]) assert.equal(c[key],true,key);
  for(const key of [
    "candidate_enforcement_identity_accepted","deployed_artifact_generation_verified",
    "runtime_mount_authority","production_source_finality_authority_ready",
    "public_presale_activation","funds_movement",
  ]) assert.equal(c[key],false,key);
  const copy=structuredClone(c);
  delete copy.candidate_enforcement_set_sha256;
  assert.equal(sha256(Buffer.from(canonical(copy),"utf8")),CANDIDATE_SET);
  assert.equal(c.candidate_enforcement_set_sha256,CANDIDATE_SET);
  return c;
}
function expectedLock(){
  return {
    schema:"void_buy_void_enforcement_post2865_lock_v1",
    marker:"VOID_BUY_VOID_ENFORCEMENT_POST2865_LOCK_V1",
    version:1,
    repository:"6ZoSo9/void-node",
    candidate_head:CANDIDATE_HEAD,
    candidate_evidence:{
      path:CANDIDATE,bytes:CANDIDATE_BYTES,sha256:CANDIDATE_SHA256,
      git_blob_sha1:CANDIDATE_BLOB,candidate_enforcement_set_sha256:CANDIDATE_SET,
    },
    compiled_source_finality_generation_sha256:COMPILED_GENERATION,
    audited_package_profile_id:PROFILE_ID,
    audited_package_profile_canonical_sha256:PROFILE_CANONICAL,
    provider_closure_sha256:PROVIDER,
    provider_closure_semantic_sha256:PROVIDER_SEMANTIC,
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
  candidate();
  const expected=Buffer.from(JSON.stringify(expectedLock(),null,2)+"\n","utf8");
  const actual=readExact(LOCK);
  assert.ok(actual.equals(expected),"locked_manifest_not_exact");
  return expected;
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify());
}else if(args.length===0||args[0]==="--self-test"){
  verify();
  console.log("VOID_BUY_VOID_ENFORCEMENT_POST2865_LOCK_V1_GREEN");
  console.log("complete_executable_closure_verified=true");
  console.log("candidate_enforcement_identity_accepted=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}else throw Error("usage: proof [--self-test|--derive]");
