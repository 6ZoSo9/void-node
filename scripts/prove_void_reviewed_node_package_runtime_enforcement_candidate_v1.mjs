#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1,
  canonicalJson,
  collectReviewedNodePackageRuntimeV1,
} from "../tools/void-reviewed-node-package-runtime-v1.mjs";
import {
  runReviewedGitV1,
} from "./prove_buy_void_reviewed_git_invocation_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MARKER="VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_CANDIDATE_V1";
const SOURCE_PARENT="21773007311f63c7a2e5d288e8bfa1e2243d49b6";
const PACKAGE_JSON_BLOB="f28c3e9446c7623ef203da36a9642d046e5f34ee";
const PACKAGE_LOCK_BLOB="b2671f0149f522b2489247016df0a5ec4bb72b8b";
const ENFORCEMENT_V6_PROOF=
  "scripts/prove_buy_void_enforcement_artifact_attestation_v6_candidate.mjs";
const ENFORCEMENT_V6_PROOF_BLOB="a5160f4b11d469accc7af952d39045a4092f0f45";
const TOOL="tools/void-reviewed-node-package-runtime-v1.mjs";
const TOOL_BLOB="6475c3f18ffe566cf5f448ca1de4795391a6efde";
const REVIEWED_GIT_HELPER=
  "scripts/prove_buy_void_reviewed_git_invocation_v1.mjs";
const REVIEWED_GIT_HELPER_BLOB=
  "2df64e31debd4884f2d859d55a87e4ef15925d3d";
const EXPECTED_ROOTS=["ethers","express"];
const EXPECTED_VERSIONS=Object.freeze({ethers:"6.17.0",express:"4.22.2"});

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function exact(relative,expected,max=2*1024*1024){
  const absolute=path.join(ROOT,relative);
  const st=fs.lstatSync(absolute);
  assert.ok(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&
    st.size>0&&st.size<=max,"candidate_input_shape:"+relative);
  const bytes=fs.readFileSync(absolute);
  assert.equal(gitBlob(bytes),expected,"candidate_input_blob:"+relative);
  return bytes;
}
function authorityFalse(profile){
  for(const key of [
    "chain2050_write","credential_access","funds_movement","market_activation",
    "npm_install_performed","package_script_execution","private_key_access",
    "public_presale_activation","rpc_call","runtime_service_mutation",
    "transaction_broadcast","transaction_construction","transaction_signing",
    "transaction_submission","wallet_or_signer_access",
  ]) assert.equal(profile.authority[key],false,key);
}
function derive(){
  assert.equal(process.platform,"linux","linux_only");
  assert.equal(process.arch,"x64","x64_only");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])),
    "reviewed_node_major_required");

  exact("package.json",PACKAGE_JSON_BLOB,128*1024);
  exact("package-lock.json",PACKAGE_LOCK_BLOB,2*1024*1024);
  exact(ENFORCEMENT_V6_PROOF,ENFORCEMENT_V6_PROOF_BLOB,1024*1024);
  exact(TOOL,TOOL_BLOB,1024*1024);
  exact(REVIEWED_GIT_HELPER,REVIEWED_GIT_HELPER_BLOB,256*1024);
  runReviewedGitV1(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"],ROOT);

  const profile=collectReviewedNodePackageRuntimeV1({
    rootPackages:EXPECTED_ROOTS,
  });
  assert.equal(profile.marker,VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1);
  assert.equal(profile.version,1);
  assert.equal(profile.status,"REVIEWED_NODE_PACKAGE_RUNTIME_PROFILE");
  assert.deepEqual(profile.root_packages,EXPECTED_ROOTS);
  assert.equal(profile.package_json_source.git_blob_sha1,PACKAGE_JSON_BLOB);
  assert.equal(profile.package_lock_source.git_blob_sha1,PACKAGE_LOCK_BLOB);
  assert.ok(profile.package_count>9,"combined closure must exceed ethers-only closure");
  assert.ok(profile.total_file_count>1856,
    "combined closure must exceed ethers-only file inventory");
  assert.ok(profile.total_bytes>18906505,
    "combined closure must exceed ethers-only byte inventory");
  for(const [name,version] of Object.entries(EXPECTED_VERSIONS)){
    const row=profile.packages.find(p=>p.name===name);
    assert.ok(row,"missing root package:"+name);
    assert.equal(row.version,version,"root package version:"+name);
  }
  assert.match(profile.profile_id,/^voidrnpr1_[0-9a-f]{64}$/u);
  assert.match(profile.packages_aggregate_sha256,/^[0-9a-f]{64}$/u);
  authorityFalse(profile);

  const profileBytes=Buffer.from(canonicalJson(profile),"utf8");
  return Object.freeze({
    schema:"void_reviewed_node_package_runtime_enforcement_candidate_v1",
    marker:MARKER,
    version:1,
    repository:"6ZoSo9/void-node",
    source_parent:SOURCE_PARENT,
    enforcement_v6_candidate_proof_git_blob_sha1:ENFORCEMENT_V6_PROOF_BLOB,
    required_third_party_packages:EXPECTED_ROOTS,
    package_json_git_blob_sha1:PACKAGE_JSON_BLOB,
    package_lock_git_blob_sha1:PACKAGE_LOCK_BLOB,
    profile,
    profile_canonical_sha256:sha256(profileBytes),
    profile_candidate_accepted:false,
    enforcement_candidate_identity_accepted:false,
    complete_executable_closure_verified:false,
    deployed_artifact_generation_verified:false,
    runtime_mount_authority:false,
    production_source_finality_authority_ready:false,
    public_presale_activation:false,
    funds_movement:false,
  });
}
function selfTest(){
  const out=derive();
  assert.equal(out.profile_candidate_accepted,false);
  assert.equal(out.complete_executable_closure_verified,false);
  assert.deepEqual(out.required_third_party_packages,EXPECTED_ROOTS);
  const altered=structuredClone(out.profile);
  altered.root_packages=["ethers"];
  assert.notEqual(canonicalJson(altered),canonicalJson(out.profile));
  console.log(MARKER+"_SELF_TEST_GREEN");
  console.log("combined_root_packages=ethers,express");
  console.log("profile_candidate_accepted=false");
  console.log("production_authority=false");
  console.log("funds_movement=false");
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(JSON.stringify(derive(),null,2)+"\n");
}else if(args.length===1&&args[0]==="--self-test"){
  selfTest();
}else{
  throw Error("enforcement_package_runtime_candidate_only_no_profile_acceptance");
}
