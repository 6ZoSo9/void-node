#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildVoidBuyVoidCustodyRuntimeBundleCandidateV1,
  canonicalJsonV1,
  verifyVoidBuyVoidCustodyRuntimeBundleCandidateV1,
} from "../tools/void-buy-allocation-custody-runtime-bundle-candidate-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const PARENT_HEAD="b532e1e3214cee298ecbf25f15568b2ee9758399";
const BRANCH_PARENT="cc6a92f436f6c129db12c10288bcb98a8033bb45";
const CANDIDATE_TOOL="tools/void-buy-allocation-custody-runtime-bundle-candidate-v1.mjs";
const CANDIDATE_TOOL_BLOB="de5e3066042d1b20d54acea4b464d591b2d88e1c";
const CANDIDATE_PROOF="scripts/prove_void_buy_allocation_custody_runtime_bundle_candidate_v1.mjs";
const CANDIDATE_PROOF_BLOB="f26ccafea229a25c9774f18effa2fd0727561972";
const CANDIDATE_WORKFLOW=".github/workflows/buy-void-allocation-custody-runtime-bundle-candidate-v1.yml";
const CANDIDATE_WORKFLOW_BLOB="961c48c227696b5d9f4000e89797e4fcebe101b6";
const LOCK="ops/security/buy-void-allocation-custody-runtime-bundle-lock-v1.json";
const SELF="scripts/prove_void_buy_allocation_custody_runtime_bundle_lock_v1.mjs";
const DOC="docs/architecture/buy-void-allocation-custody-runtime-bundle-lock-v1.md";
const WORKFLOW=".github/workflows/buy-void-allocation-custody-runtime-bundle-lock-v1.yml";
const CANDIDATE_ID="voidbuycustodybundle1_2339d565cc1c298a3f7ca9cae2ef163831288007bb32d9e7c37c01880aaee704";
const CANDIDATE_BYTES=9930;
const CANDIDATE_SHA256="5ee2b5e5fc25a7cec8313c7cb7c4cd8bb675e3652ab18dc614577a25376f2279";
const CANDIDATE_GIT_BLOB="fe3108c93a31fe1e5137929202aa433724285480";
const HOSTED_RUN=38664821990;
const ARTIFACTS=Object.freeze({22:11940123060,24:11939814770,26:11939789748});
const EXPECTED_DELTA=Object.freeze([DOC,LOCK,SELF,WORKFLOW].sort());

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function gitBlob(bytes){
  const prefix=Buffer.concat([
    Buffer.from("blob "+bytes.length,"utf8"),
    Buffer.from([0]),
  ]);
  return crypto.createHash("sha1").update(prefix).update(bytes).digest("hex");
}
function read(relative,max=2*1024*1024){
  assert.equal(path.isAbsolute(relative),false,"absolute_path:"+relative);
  assert.equal(relative.split("/").some(part=>!part||part==="."||part===".."),false,
    "unsafe_path:"+relative);
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1&&
    before.size>0&&before.size<=max,"invalid_file:"+relative);
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  assert.equal(bytes.length,before.size,"short_read:"+relative);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  return bytes;
}
function runGit(args){
  const r=spawnSync("/usr/bin/git",[
    "--no-replace-objects","-C",ROOT,...args,
  ],{
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:30000,
    maxBuffer:16*1024*1024,
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0",
    },
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return String(r.stdout||"").trim();
}
function verifyBranch(){
  runGit(["merge-base","--is-ancestor",PARENT_HEAD,"HEAD"]);
  runGit(["merge-base","--is-ancestor",BRANCH_PARENT,"HEAD"]);
  assert.equal(gitBlob(read(CANDIDATE_TOOL)),CANDIDATE_TOOL_BLOB);
  assert.equal(gitBlob(read(CANDIDATE_PROOF)),CANDIDATE_PROOF_BLOB);
  assert.equal(gitBlob(read(CANDIDATE_WORKFLOW)),CANDIDATE_WORKFLOW_BLOB);
  const changed=runGit(["diff","--name-only",BRANCH_PARENT,"HEAD","--"])
    .split("\n").filter(Boolean).sort();
  assert.deepEqual(changed,EXPECTED_DELTA,"acceptance_lock_scope_drift");
}
function deriveCandidateBytes(){
  const candidate=buildVoidBuyVoidCustodyRuntimeBundleCandidateV1(ROOT);
  assert.equal(verifyVoidBuyVoidCustodyRuntimeBundleCandidateV1(candidate),true);
  assert.equal(candidate.candidate_id,CANDIDATE_ID);
  assert.equal(candidate.candidate_accepted,false);
  assert.equal(candidate.runtime_files.length,10);
  assert.equal(candidate.runtime_files.filter(
    row=>row.runtime_kind==="compiled_typescript").length,6);
  assert.equal(candidate.runtime_files.filter(
    row=>row.runtime_kind==="tracked_source").length,4);
  assert.deepEqual(candidate.third_party_runtime_packages,[]);
  assert.deepEqual(candidate.node_modules_runtime_files,[]);
  assert.equal(candidate.runtime_integration,false);
  assert.equal(candidate.public_presale_activation,false);
  assert.equal(candidate.funds_movement,false);
  const bytes=Buffer.from(canonicalJsonV1(candidate)+"\n","utf8");
  assert.equal(bytes.length,CANDIDATE_BYTES,"candidate_bytes");
  assert.equal(sha256(bytes),CANDIDATE_SHA256,"candidate_sha256");
  assert.equal(gitBlob(bytes),CANDIDATE_GIT_BLOB,"candidate_git_blob");
  return bytes;
}
function expectedLock(){
  return {
    schema:"void_buy_void_custody_runtime_bundle_lock_v1",
    marker:"VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_LOCK_V1",
    version:1,
    repository:"6ZoSo9/void-node",
    candidate_head:PARENT_HEAD,
    candidate_hosted_evidence:{
      workflow_run:HOSTED_RUN,
      node22_artifact_id:ARTIFACTS[22],
      node24_artifact_id:ARTIFACTS[24],
      node26_artifact_id:ARTIFACTS[26],
      cross_node_byte_identity_verified:true,
    },
    candidate_evidence:{
      candidate_id:CANDIDATE_ID,
      bytes:CANDIDATE_BYTES,
      sha256:CANDIDATE_SHA256,
      git_blob_sha1:CANDIDATE_GIT_BLOB,
      derivation_tool_path:CANDIDATE_TOOL,
      derivation_tool_git_blob_sha1:CANDIDATE_TOOL_BLOB,
      candidate_proof_path:CANDIDATE_PROOF,
      candidate_proof_git_blob_sha1:CANDIDATE_PROOF_BLOB,
      candidate_workflow_git_blob_sha1:CANDIDATE_WORKFLOW_BLOB,
      runtime_file_count:10,
      compiled_runtime_file_count:6,
      tracked_runtime_source_file_count:4,
      third_party_runtime_packages:0,
      node_modules_runtime_files:0,
    },
    candidate_accepted:true,
    immutable_root_install:false,
    install_target_selected:false,
    node_binary_identity_verified:false,
    request_root_selected:false,
    shared_directory_selected:false,
    service_unit_installed:false,
    service_started:false,
    service_restarted:false,
    runtime_integration:false,
    reserve_method_enabled:false,
    recover_method_enabled:false,
    payment_acceptance:false,
    public_presale_activation:false,
    production_gate_ready:false,
    funds_movement:false,
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
  console.log("VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_LOCK_V1_GREEN");
  console.log("candidate_id="+CANDIDATE_ID);
  console.log("candidate_sha256="+CANDIDATE_SHA256);
  console.log("candidate_git_blob_sha1="+CANDIDATE_GIT_BLOB);
  console.log("candidate_accepted=true");
  console.log("immutable_root_install=false");
  console.log("node_binary_identity_verified=false");
  console.log("request_root_selected=false");
  console.log("shared_directory_selected=false");
  console.log("runtime_integration=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("production_gate_ready=false");
  console.log("funds_movement=false");
  console.log("lock_sha256="+sha256(bytes));
}else{
  throw Error("usage: proof [--self-test|--derive]");
}
