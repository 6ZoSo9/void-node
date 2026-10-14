#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MANIFEST="docs/architecture/buy-void-enforcement-artifact-attestation-v6.json";
const PACKAGE_MANIFEST="ops/security/reviewed-node-package-runtime-enforcement-v1.json";
const PACKAGE_MANIFEST_BLOB="169216419f35c9213a96cde8d835c97ef4410710";
const PACKAGE_PROOF="scripts/prove_void_reviewed_node_package_runtime_enforcement_v1.mjs";
const PACKAGE_PROOF_BLOB="841fedfe8d1a3ed2257d79104bc6086cafc290d6";
const CANDIDATE_PROOF="scripts/prove_buy_void_enforcement_artifact_attestation_v6_candidate.mjs";
const CANDIDATE_PROOF_BLOB="a5160f4b11d469accc7af952d39045a4092f0f45";
const EXPECTED_CANDIDATE_JSON_SHA256="f3680f613095054be2699fefe6d1f11dc03eda725d930254d2a045462bf4646e";
const EXPECTED_CANDIDATE_SET="43a1a3cbec71f59e0c33216afe5e5b826e119e95aa14acfd2bc2d8b2c238a297";
const EXPECTED_PROFILE_ID="voidrnpr1_c15b7f3cb00d85f378a69cfc536c3845e29f9be7047e3af0f9fbd646eb2f5860";
const EXPECTED_PROFILE_AGGREGATE="5eb57ae9bfa6a0f195d5ccf40697985f0043456057525c3fdca7f4c894173561";
const EXPECTED_ACCEPTED_SET="c197ccf77e6fc7499143ed26f00be95c39ae2e8b16d2900255c0dcab576f0f4c";

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
function regular(file,max=16*1024*1024){
  const st=fs.lstatSync(file);
  assert.ok(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size>0&&st.size<=max,
    "invalid_regular_file:"+file);
  return fs.readFileSync(file);
}
function repo(relative,max){
  const p=path.join(ROOT,relative);
  assert.ok(p.startsWith(ROOT+path.sep));
  return regular(p,max);
}
function packageLock(){
  const bytes=repo(PACKAGE_MANIFEST,128*1024);
  assert.equal(gitBlob(bytes),PACKAGE_MANIFEST_BLOB,"package_manifest_blob_drift");
  const p=JSON.parse(bytes);
  assert.equal(p.marker,"VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_V1");
  assert.equal(p.status,"REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_IDENTITY");
  assert.deepEqual(p.root_packages,["ethers","express"]);
  assert.equal(p.profile_id,EXPECTED_PROFILE_ID);
  assert.equal(p.packages_aggregate_sha256,EXPECTED_PROFILE_AGGREGATE);
  assert.equal(p.profile_identity_accepted,true);
  assert.equal(p.complete_executable_closure_verified,false);
  assert.equal(p.production_source_finality_authority_ready,false);
  assert.equal(p.public_presale_activation,false);
  assert.equal(p.funds_movement,false);
  assert.equal(gitBlob(repo(PACKAGE_PROOF,512*1024)),PACKAGE_PROOF_BLOB);
  assert.equal(gitBlob(repo(CANDIDATE_PROOF,1024*1024)),CANDIDATE_PROOF_BLOB);
  return p;
}
function candidate(file){
  const bytes=regular(file,2*1024*1024);
  assert.equal(sha256(bytes),EXPECTED_CANDIDATE_JSON_SHA256,"candidate_json_sha256_mismatch");
  const c=JSON.parse(bytes);
  assert.equal(c.schema,"void_buy_void_enforcement_artifact_v6_candidate");
  assert.equal(c.version,6);
  assert.equal(c.source_runtime_parent,"99c9b6a5aaaf0f4a5440ebc2dfade3fba70dfc1e");
  assert.equal(c.candidate_enforcement_set_sha256,EXPECTED_CANDIDATE_SET);
  assert.equal(c.predecessor.locked_source_finality_compiled_v5_manifest_blob,
    "44dc5c187adeb35b6a41038a044165f1c6799c74");
  assert.equal(c.predecessor.locked_source_finality_compiled_v5_generation,
    "18758f6563f9a96aea0d55e293a4c10da8de349ba12ecc90fdebd82f486b944c");
  assert.equal(c.dynamic_tool_candidate_count,1);
  assert.equal(c.dynamic_tool_execution_identity_verified,true);
  assert.equal(c.dynamic_tool_transitive_closure_verified,true);
  assert.equal(c.no_dynamic_unknown_imports,true);
  assert.deepEqual(c.third_party_package_imports,["ethers","express"]);
  assert.equal(c.package_runtime_evidence.ethers_package_runtime_verified,true);
  assert.equal(c.package_runtime_evidence.express_package_runtime_verified,false);
  assert.equal(c.package_runtime_evidence.third_party_package_runtime_closure_verified,false);
  assert.equal(c.complete_executable_closure_verified,false);
  assert.equal(c.candidate_identity_accepted,false);
  for(const k of ["deployed_artifact_generation_verified","runtime_mount_authority",
    "production_source_finality_authority_ready","presale_activation","funds_movement"])
    assert.equal(c[k],false,k);
  return c;
}
function packageLog(file){
  const s=regular(file,2*1024*1024).toString("utf8");
  for(const line of [
    "VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_V1_LOCK_GREEN",
    "profile_id="+EXPECTED_PROFILE_ID,
    "packages_aggregate_sha256="+EXPECTED_PROFILE_AGGREGATE,
    "root_packages=ethers,express",
    "private_express_and_ethers_import_green=true",
    "profile_identity_accepted=true",
    "complete_executable_closure_verified=false",
    "production_source_finality_authority_ready=false",
    "public_presale_activation=false",
    "funds_movement=false",
  ])assert.ok(s.includes(line),"package_lock_log_missing:"+line);
}
function derive(candidateFile,logFile){
  const c=candidate(candidateFile);
  const p=packageLock();
  packageLog(logFile);
  const body={
    schema:"void_buy_void_enforcement_artifact_attestation_v6",
    marker:"VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V6",
    version:6,repository:"6ZoSo9/void-node",
    source_runtime_parent:c.source_runtime_parent,
    candidate:{
      source_head:"21773007311f63c7a2e5d288e8bfa1e2243d49b6",
      candidate_json_sha256:EXPECTED_CANDIDATE_JSON_SHA256,
      candidate_enforcement_set_sha256:EXPECTED_CANDIDATE_SET,
    },
    compiled_source_finality:{
      manifest_git_blob_sha1:c.predecessor.locked_source_finality_compiled_v5_manifest_blob,
      compiled_artifact_generation_sha256:c.predecessor.locked_source_finality_compiled_v5_generation,
      compiled_artifact_generation_verified:true,
    },
    dynamic_runtime:{
      dynamic_tool_candidate_count:c.dynamic_tool_candidate_count,
      dynamic_tool_execution_identity_verified:c.dynamic_tool_execution_identity_verified,
      dynamic_tool_transitive_closure_verified:c.dynamic_tool_transitive_closure_verified,
      no_dynamic_unknown_imports:c.no_dynamic_unknown_imports,
    },
    package_runtime:{
      manifest_path:PACKAGE_MANIFEST,
      manifest_git_blob_sha1:PACKAGE_MANIFEST_BLOB,
      profile_id:p.profile_id,
      packages_aggregate_sha256:p.packages_aggregate_sha256,
      root_packages:p.root_packages,
      package_json_git_blob_sha1:p.package_json_git_blob_sha1,
      package_lock_git_blob_sha1:p.package_lock_git_blob_sha1,
      profile_identity_accepted:true,
      third_party_package_runtime_closure_verified:true,
    },
    third_party_package_imports:c.third_party_package_imports,
    complete_executable_closure_verified:true,
    candidate_identity_accepted:true,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  };
  const digest=sha256(Buffer.from(canonical(body),"utf8"));
  assert.equal(digest,EXPECTED_ACCEPTED_SET,"accepted_enforcement_set_digest_mismatch");
  return {...body,accepted_enforcement_set_sha256:digest};
}
function parseArgs(){
  const out={mode:"",candidate:"",log:""};
  for(const arg of process.argv.slice(2)){
    if(arg==="--derive"||arg==="--verify")out.mode=arg;
    else if(arg.startsWith("--candidate="))out.candidate=arg.slice(12);
    else if(arg.startsWith("--package-runtime-log="))out.log=arg.slice(22);
    else throw Error("unknown_argument:"+arg);
  }
  assert.ok(out.mode&&out.candidate&&out.log,"required_arguments_missing");
  return out;
}
const a=parseArgs();
const expected=derive(path.resolve(a.candidate),path.resolve(a.log));
if(a.mode==="--derive")process.stdout.write(JSON.stringify(expected,null,2)+"\n");
else{
  const committed=JSON.parse(repo(MANIFEST,128*1024));
  assert.equal(canonical(committed),canonical(expected),"committed_v6_lock_manifest_drift");
  console.log("VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V6_LOCK_GREEN");
  console.log("accepted_enforcement_set_sha256="+EXPECTED_ACCEPTED_SET);
  console.log("candidate_identity_accepted=true");
  console.log("complete_executable_closure_verified=true");
  console.log("deployed_artifact_generation_verified=false");
  console.log("runtime_mount_authority=false");
  console.log("production_source_finality_authority_ready=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}
