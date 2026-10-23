#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildVoidBuyVoidCustodyRuntimeBundleCandidateV3,
  canonicalJsonV3,
  verifyVoidBuyVoidCustodyRuntimeBundleCandidateV3,
  testOnlyReadCustodyBundleSourceV3,
} from "../tools/void-buy-allocation-custody-runtime-bundle-candidate-v3.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const PARENT_HEAD="b4d1354bc511c4c16138abac693f9c52bd93dc5d";
const CANDIDATE_TOOL="tools/void-buy-allocation-custody-runtime-bundle-candidate-v3.mjs";
const CANDIDATE_TOOL_BLOB="628e872ec286c001eaddcb05b9c2fea915ad0793";
const CANDIDATE_PROOF="scripts/prove_void_buy_allocation_custody_runtime_bundle_candidate_v3.mjs";
const CANDIDATE_PROOF_BLOB="e10d1c233e0871ddbc1bede6cd98bd7bc8d80379";
const CANDIDATE_DOC="docs/architecture/buy-void-allocation-custody-runtime-bundle-candidate-v3.md";
const CANDIDATE_DOC_BLOB="469fa2088cb15a18df24beac63b70039225ec158";
const CANDIDATE_WORKFLOW=".github/workflows/buy-void-allocation-custody-runtime-bundle-candidate-v3.yml";
const CANDIDATE_WORKFLOW_BLOB="08917a6079eb6d6cb7b7c6983702d4fd7e2612eb";
const LOCK="ops/security/buy-void-allocation-custody-runtime-bundle-lock-v3.json";
const SELF="scripts/prove_void_buy_allocation_custody_runtime_bundle_lock_v3.mjs";
const DOC="docs/architecture/buy-void-allocation-custody-runtime-bundle-lock-v3.md";
const WORKFLOW=".github/workflows/buy-void-allocation-custody-runtime-bundle-lock-v3.yml";
const CANDIDATE_ID="voidbuycustodybundle3_dae3764e1f1b660235d17ad933e32ed0d4f67d8fc4cd322286d34c5d9f0dbe32";
const CANDIDATE_BYTES=12379;
const CANDIDATE_SHA256="0d1be868aab98debdf0785c59cf45954ae68b2e1ebd0687ee56206b10b02ac67";
const CANDIDATE_GIT_BLOB="3474174b68995eacd1c516bc9bc5190ff04757b6";
const HOSTED_RUN=39903798415;
const CROSS_NODE_JOB=120253410543;
const ARTIFACTS=Object.freeze({22:12480121859,24:12479744635,26:12480630330});
const EXPECTED_DELTA=Object.freeze([DOC,LOCK,SELF,WORKFLOW].sort());

function sha256(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}
function gitBlob(bytes){
  const prefix=Buffer.concat([Buffer.from("blob "+bytes.length,"utf8"),Buffer.from([0])]);
  return crypto.createHash("sha1").update(prefix).update(bytes).digest("hex");
}
function read(relative,max=2*1024*1024){
  return testOnlyReadCustodyBundleSourceV3(ROOT,relative,max);
}
function git(args){
  return execFileSync("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,maxBuffer:16*1024*1024,
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",GIT_OPTIONAL_LOCKS:"0",GIT_TERMINAL_PROMPT:"0"},
  }).trim();
}
function verifyBranch(){
  git(["merge-base","--is-ancestor",PARENT_HEAD,"HEAD"]);
  assert.equal(gitBlob(read(CANDIDATE_TOOL)),CANDIDATE_TOOL_BLOB);
  assert.equal(gitBlob(read(CANDIDATE_PROOF)),CANDIDATE_PROOF_BLOB);
  assert.equal(gitBlob(read(CANDIDATE_DOC)),CANDIDATE_DOC_BLOB);
  assert.equal(gitBlob(read(CANDIDATE_WORKFLOW)),CANDIDATE_WORKFLOW_BLOB);
  const changed=git(["diff","--name-only",PARENT_HEAD,"HEAD","--"]).split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA,"acceptance_lock_scope_drift");
  git(["diff","--check",PARENT_HEAD,"HEAD","--"]);
}
function deriveCandidateBytes(){
  const candidate=buildVoidBuyVoidCustodyRuntimeBundleCandidateV3(ROOT);
  assert.equal(verifyVoidBuyVoidCustodyRuntimeBundleCandidateV3(candidate),true);
  assert.equal(candidate.candidate_id,CANDIDATE_ID);
  assert.equal(candidate.candidate_accepted,false);
  assert.equal(candidate.runtime_integration,false);
  assert.equal(candidate.public_presale_activation,false);
  assert.equal(candidate.funds_movement,false);
  assert.equal(candidate.runtime_files.length,10);
  assert.equal(candidate.runtime_files.filter(row=>row.runtime_kind==="compiled_typescript").length,6);
  assert.equal(candidate.runtime_files.filter(row=>row.runtime_kind==="tracked_source").length,4);
  assert.equal(candidate.source_inputs.length,19);
  assert.deepEqual(candidate.third_party_runtime_packages,[]);
  assert.deepEqual(candidate.node_modules_runtime_files,[]);
  const bytes=Buffer.from(canonicalJsonV3(candidate)+"\n","utf8");
  assert.equal(bytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(bytes),CANDIDATE_SHA256,"candidate_sha256");
  assert.equal(gitBlob(bytes),CANDIDATE_GIT_BLOB,"candidate_git_blob");
  return bytes;
}
function expectedLock(){
  return {
  "schema": "void_buy_void_custody_runtime_bundle_lock_v3",
  "marker": "VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_LOCK_V3",
  "version": 3,
  "repository": "6ZoSo9/void-node",
  "candidate_head": "b4d1354bc511c4c16138abac693f9c52bd93dc5d",
  "candidate_hosted_evidence": {
    "workflow_run": 39903798415,
    "node22_artifact_id": 12480121859,
    "node24_artifact_id": 12479744635,
    "node26_artifact_id": 12480630330,
    "cross_node_compare_job_id": 120253410543,
    "cross_node_byte_identity_verified": true
  },
  "candidate_evidence": {
    "candidate_id": "voidbuycustodybundle3_dae3764e1f1b660235d17ad933e32ed0d4f67d8fc4cd322286d34c5d9f0dbe32",
    "bytes": 12379,
    "sha256": "0d1be868aab98debdf0785c59cf45954ae68b2e1ebd0687ee56206b10b02ac67",
    "git_blob_sha1": "3474174b68995eacd1c516bc9bc5190ff04757b6",
    "derivation_tool_path": "tools/void-buy-allocation-custody-runtime-bundle-candidate-v3.mjs",
    "derivation_tool_git_blob_sha1": "628e872ec286c001eaddcb05b9c2fea915ad0793",
    "candidate_proof_path": "scripts/prove_void_buy_allocation_custody_runtime_bundle_candidate_v3.mjs",
    "candidate_proof_git_blob_sha1": "e10d1c233e0871ddbc1bede6cd98bd7bc8d80379",
    "candidate_document_path": "docs/architecture/buy-void-allocation-custody-runtime-bundle-candidate-v3.md",
    "candidate_document_git_blob_sha1": "469fa2088cb15a18df24beac63b70039225ec158",
    "candidate_workflow_path": ".github/workflows/buy-void-allocation-custody-runtime-bundle-candidate-v3.yml",
    "candidate_workflow_git_blob_sha1": "08917a6079eb6d6cb7b7c6983702d4fd7e2612eb",
    "runtime_file_count": 10,
    "compiled_runtime_file_count": 6,
    "tracked_runtime_source_file_count": 4,
    "source_input_count": 19,
    "third_party_runtime_packages": 0,
    "node_modules_runtime_files": 0,
    "all_three_fifo_safe_readers_bound": true
  },
  "candidate_accepted": true,
  "immutable_root_install": false,
  "install_target_selected": false,
  "node_binary_identity_verified": false,
  "request_root_selected": false,
  "shared_directory_selected": false,
  "service_unit_installed": false,
  "service_started": false,
  "service_restarted": false,
  "runtime_integration": false,
  "reserve_method_enabled": false,
  "recover_method_enabled": false,
  "payment_acceptance": false,
  "public_presale_activation": false,
  "production_gate_ready": false,
  "funds_movement": false
};
}
function verify(){
  verifyBranch();
  deriveCandidateBytes();
  const expected=Buffer.from(JSON.stringify(expectedLock(),null,2)+"\n","utf8");
  const actual=read(LOCK,128*1024);
  assert.ok(actual.equals(expected),"locked_manifest_not_exact");
  return expected;
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify());
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const bytes=verify();
  console.log("VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_LOCK_V3_GREEN");
  console.log("candidate_id="+CANDIDATE_ID);
  console.log("candidate_sha256="+CANDIDATE_SHA256);
  console.log("candidate_git_blob_sha1="+CANDIDATE_GIT_BLOB);
  console.log("hosted_run="+HOSTED_RUN);
  console.log("cross_node_compare_job="+CROSS_NODE_JOB);
  console.log("candidate_accepted=true");
  console.log("all_three_fifo_safe_readers_bound=true");
  console.log("immutable_root_install=false");
  console.log("runtime_integration=false");
  console.log("reserve_method_enabled=false");
  console.log("recover_method_enabled=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("production_gate_ready=false");
  console.log("funds_movement=false");
  console.log("lock_sha256="+sha256(bytes));
}else{
  throw Error("usage: proof [--self-test|--derive]");
}
