#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runReviewedGitV1 } from "./prove_buy_void_reviewed_git_invocation_v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MANIFEST="ops/security/buy-void-v7-privileged-launcher-package-runtime-v1.json";
const CANDIDATE="scripts/prove_void_buy_v7_privileged_launcher_package_runtime_candidate_v1.mjs";
const CANDIDATE_BLOB="8c7bea17b4bfb4a8380c5ddfbb7480123fa7e46c";
const CANDIDATE_PARENT="d333257e15185f89c3d1a389db5239d94be8a773";
const CANDIDATE_SHA256="35b50f34dc2a13b2e91163c540a7bfe84aec1eb4e37787e54a63e4fba66be00e";
const CANDIDATE_GIT_BLOB="a5a5c2499f7a591df599f1a0af931c461ba447b3";
const CANDIDATE_BYTES=4705;

const EXPECTED={
  "marker": "VOID_BUY_VOID_V7_PRIVILEGED_LAUNCHER_PACKAGE_RUNTIME_V1",
  "version": 1,
  "status": "V7_PRIVILEGED_LAUNCHER_PACKAGE_RUNTIME_IDENTITY",
  "repository": "6ZoSo9/void-node",
  "candidate_parent": "d333257e15185f89c3d1a389db5239d94be8a773",
  "candidate_source_parent": "452691b0644c6295a5295636ab1c89158b2dc184",
  "candidate_script_git_blob_sha1": "8c7bea17b4bfb4a8380c5ddfbb7480123fa7e46c",
  "candidate_json_sha256": "35b50f34dc2a13b2e91163c540a7bfe84aec1eb4e37787e54a63e4fba66be00e",
  "candidate_json_git_blob_sha1": "a5a5c2499f7a591df599f1a0af931c461ba447b3",
  "candidate_json_bytes": 4705,
  "launcher_git_blob_sha1": "ed37356fbc202fe9159b5d390434880a1f86a60e",
  "package_json_git_blob_sha1": "14fbdf5717b07fd4c734f5da7a8e84ed59bee93f",
  "package_lock_git_blob_sha1": "15b5c82ea36f13079a2f9e8863722f654eb3f201",
  "accepted_enforcement_profile": {
    "manifest_git_blob_sha1": "445bcfbf5feae928e0d9cc06d4d31c1ee186fe39",
    "profile_id": "voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac",
    "packages_aggregate_sha256": "77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6",
    "profile_canonical_sha256": "3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757",
    "package_count": 82,
    "total_file_count": 2498,
    "total_bytes": 21290060,
    "root_packages": [
      "ethers",
      "express"
    ]
  },
  "required_privileged_root_packages": [
    "ethers",
    "express",
    "tsx"
  ],
  "root_versions": {
    "ethers": "6.17.0",
    "express": "4.22.3",
    "tsx": "4.23.15"
  },
  "tsx_runtime": {
    "runtime_id": "voidtsxpr1_0f2bf2dba60718942e7db9b83779a2aeb2e9db32e74610a96a8ec978ad35e4d4",
    "packages_aggregate_sha256": "e16cca109419b3ce7b39970458fd76ba53bdc6399641911dd2016886c624a8ca",
    "package_count": 3,
    "total_file_count": 40,
    "total_bytes": 11972707,
    "installed_optional_platform_packages": [
      "@esbuild/linux-x64"
    ]
  },
  "cross_node_candidate_bytes_verified": true,
  "privileged_launcher_package_runtime_identity_accepted": true,
  "privileged_launcher_package_runtime_verified": true,
  "protected_source_install_authorized": false,
  "privileged_receipt_execution_authorized": false,
  "runtime_service_mutation": false,
  "credential_access": false,
  "wallet_or_signer_access": false,
  "rpc_call": false,
  "transaction_broadcast": false,
  "public_presale_activation": false,
  "funds_movement": false
};

function sha256(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
function candidateBytes(){
  const script=fs.readFileSync(path.join(ROOT,CANDIDATE));
  assert.equal(gitBlob(script),CANDIDATE_BLOB,"candidate_script_blob_drift");
  const stdout=execFileSync(process.execPath,[path.join(ROOT,CANDIDATE),"--derive"],{
    cwd:ROOT,
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",TZ:"UTC",
      NODE_ENV:"test",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"
    },
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:180000,maxBuffer:8*1024*1024
  });
  const bytes=Buffer.from(stdout,"utf8");
  assert.equal(bytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(bytes),CANDIDATE_SHA256,"candidate_sha256");
  assert.equal(gitBlob(bytes),CANDIDATE_GIT_BLOB,"candidate_git_blob");
  return bytes;
}
function validateCandidate(j){
  assert.equal(j.schema,"void_buy_void_v7_privileged_launcher_package_runtime_candidate_v1");
  assert.equal(j.marker,"VOID_BUY_VOID_V7_PRIVILEGED_LAUNCHER_PACKAGE_RUNTIME_CANDIDATE_V1");
  assert.equal(j.source_parent,EXPECTED.candidate_source_parent);
  assert.equal(j.launcher_git_blob_sha1,EXPECTED.launcher_git_blob_sha1);
  assert.equal(j.package_json_git_blob_sha1,EXPECTED.package_json_git_blob_sha1);
  assert.equal(j.package_lock_git_blob_sha1,EXPECTED.package_lock_git_blob_sha1);
  assert.deepEqual(j.required_privileged_root_packages,EXPECTED.required_privileged_root_packages);
  assert.deepEqual(j.root_versions,EXPECTED.root_versions);
  assert.equal(j.accepted_enforcement_profile.manifest_git_blob_sha1,
    EXPECTED.accepted_enforcement_profile.manifest_git_blob_sha1);
  assert.equal(j.accepted_enforcement_profile.profile_id,
    EXPECTED.accepted_enforcement_profile.profile_id);
  assert.equal(j.accepted_enforcement_profile.packages_aggregate_sha256,
    EXPECTED.accepted_enforcement_profile.packages_aggregate_sha256);
  assert.equal(j.accepted_enforcement_profile.profile_canonical_sha256,
    EXPECTED.accepted_enforcement_profile.profile_canonical_sha256);
  assert.equal(j.accepted_enforcement_profile.package_count,82);
  assert.equal(j.accepted_enforcement_profile.total_file_count,2498);
  assert.equal(j.accepted_enforcement_profile.total_bytes,21290060);
  assert.deepEqual(j.accepted_enforcement_profile.root_packages,["ethers","express"]);
  assert.equal(j.accepted_enforcement_profile.rederived_exactly,true);
  assert.equal(j.accepted_enforcement_profile.package_records_preserved,true);
  assert.equal(j.tsx_runtime.runtime_id,EXPECTED.tsx_runtime.runtime_id);
  assert.equal(j.tsx_runtime.packages_aggregate_sha256,
    EXPECTED.tsx_runtime.packages_aggregate_sha256);
  assert.equal(j.tsx_runtime.package_count,3);
  assert.equal(j.tsx_runtime.total_file_count,40);
  assert.equal(j.tsx_runtime.total_bytes,11972707);
  assert.deepEqual(j.tsx_runtime.installed_optional_platform_packages,["@esbuild/linux-x64"]);
  assert.equal(j.profile_candidate_accepted,false);
  assert.equal(j.privileged_launcher_package_runtime_verified,false);
  assert.equal(j.protected_source_install_authorized,false);
  assert.equal(j.privileged_receipt_execution_authorized,false);
  for(const key of ["runtime_service_mutation","credential_access","wallet_or_signer_access",
    "rpc_call","transaction_broadcast","public_presale_activation","funds_movement"]){
    assert.equal(j[key],false,key);
  }
}
function main(){
  assert.equal(process.platform,"linux");
  assert.equal(process.arch,"x64");
  assert.ok([22,24,26].includes(Number(process.versions.node.split(".")[0])));
  runReviewedGitV1(["merge-base","--is-ancestor",CANDIDATE_PARENT,"HEAD"],ROOT);
  const bytes=candidateBytes();
  validateCandidate(JSON.parse(bytes.toString("utf8")));
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,MANIFEST),"utf8"));
  assert.deepEqual(manifest,EXPECTED,"privileged_launcher_package_manifest_drift");
  assert.equal(manifest.cross_node_candidate_bytes_verified,true);
  assert.equal(manifest.privileged_launcher_package_runtime_identity_accepted,true);
  assert.equal(manifest.privileged_launcher_package_runtime_verified,true);
  assert.equal(manifest.protected_source_install_authorized,false);
  assert.equal(manifest.privileged_receipt_execution_authorized,false);
  assert.equal(manifest.public_presale_activation,false);
  assert.equal(manifest.funds_movement,false);
  console.log("VOID_BUY_VOID_V7_PRIVILEGED_LAUNCHER_PACKAGE_RUNTIME_V1_LOCK_GREEN");
  console.log("candidate_json_sha256="+CANDIDATE_SHA256);
  console.log("candidate_json_git_blob_sha1="+CANDIDATE_GIT_BLOB);
  console.log("tsx_runtime_id="+EXPECTED.tsx_runtime.runtime_id);
  console.log("tsx_packages_aggregate_sha256="+EXPECTED.tsx_runtime.packages_aggregate_sha256);
  console.log("privileged_launcher_package_runtime_identity_accepted=true");
  console.log("privileged_launcher_package_runtime_verified=true");
  console.log("protected_source_install_authorized=false");
  console.log("privileged_receipt_execution_authorized=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}
main();
