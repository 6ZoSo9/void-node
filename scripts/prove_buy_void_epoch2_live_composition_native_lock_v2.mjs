#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE_PARENT="907bc1780110717f4caaae06595ec742976162f1";
const CANDIDATE_HEAD="de1d19d8782405afa4d62ae670b11087d9c7e93e";
const CANDIDATE_MERGE="23e963fb7b16dd2e64ce6934beb9cf831767fe75";

const NATIVE_SOURCE=
  "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c";
const RUNNER_SOURCE=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs";
const SOURCE_PROOF=
  "scripts/prove_buy_void_epoch2_live_composition_native_preentry_v1.mjs";
const SOURCE_WORKFLOW=
  ".github/workflows/buy-void-epoch2-live-composition-native-preentry-v1.yml";
const SEALED_V2=
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";
const CANDIDATE_WORKFLOW=
  ".github/workflows/buy-void-epoch2-live-composition-native-candidate-v2.yml";
const CANDIDATE_FILE=
  "ops/security/buy-void-epoch2-live-composition-native-candidate-v2.json";
const LOCK_FILE=
  "ops/security/buy-void-epoch2-live-composition-native-lock-v2.json";
const SELF=
  "scripts/prove_buy_void_epoch2_live_composition_native_lock_v2.mjs";
const WORKFLOW=
  ".github/workflows/buy-void-epoch2-live-composition-native-lock-v2.yml";
const DOC=
  "docs/operators/buy-void-epoch2-live-composition-native-lock-v2.md";

const EXPECTED_BLOBS=Object.freeze({
  [NATIVE_SOURCE]:"4aa091e7835b32aa5c4e7b8e4059651c69a64eb3",
  [RUNNER_SOURCE]:"92e8c8696ea7e2bb81b6ef089db8baa657188935",
  [SOURCE_PROOF]:"4db3583c5c058a581fce69ef49312f7d3534b8ca",
  [SOURCE_WORKFLOW]:"85c28fdf03345240332cbf41d46fbda065958ec7",
  [SEALED_V2]:"14cbe81e27d04fee77cbe75225ce308bf8561a7b",
  [CANDIDATE_WORKFLOW]:"f3f644ad6c1ee916465a5a471e5b8edb23d18e8d",
});

const CANDIDATE=Object.freeze({
  marker:"VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_V2",
  version:2,
  source_parent:SOURCE_PARENT,
  native_source_git_blob_sha1:EXPECTED_BLOBS[NATIVE_SOURCE],
  runner_source_git_blob_sha1:EXPECTED_BLOBS[RUNNER_SOURCE],
  source_proof_git_blob_sha1:EXPECTED_BLOBS[SOURCE_PROOF],
  source_workflow_git_blob_sha1:EXPECTED_BLOBS[SOURCE_WORKFLOW],
  sealed_v2_git_blob_sha1:EXPECTED_BLOBS[SEALED_V2],
  native_binary_sha256:
    "78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589",
  native_binary_bytes:726976,
  native_static_no_interp:true,
  native_parent_retained_for_child_lifetime:true,
  private_parent_proof_channel:true,
  native_parent_process_generation_bound:true,
  native_parent_installed_generation_bound:true,
  native_parent_revalidation_after_sensitive_sequence:true,
  proof_pipe_closure_fail_closed:true,
  runner_sha256:
    "2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73",
  runner_bytes:30103,
  runner_install_mode:"0444",
  cc_sha256:
    "1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26",
  strip_sha256:
    "0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42",
  policy_expected_head_host_bound_later:true,
  policy_node_identity_host_bound_later:true,
  policy_runner_identity_must_equal_candidate:true,
  candidate_accepted:false,
  install_authorized:false,
  live_execution_authorized:false,
  credential_access:false,
  private_key_access:false,
  transaction:false,
  payment_acceptance:false,
  public_presale_activation:false,
  wc_void_market_activation:false,
  funds_movement:false,
});

const CANDIDATE_BYTES=1644;
const CANDIDATE_SHA256=
  "c60e8e1e5bd4974be21e19a903bcd3d5a9858ecccc7f01977a48707f16c1d774";
const CANDIDATE_BLOB="0975734c1d3e7f9dd8bc1abe65dc28eb7d0faf0d";
const LOCK_ID=
  "voidbuye2livecompnativelock2_"+
  "32261e9f34a132269b9d65a3cc14723938e00a7a6fc4ff08888861afcc50fbd3";

const sha256=(bytes)=>crypto.createHash("sha256").update(bytes).digest("hex");
const gitBlob=(bytes)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
  .update(bytes)
  .digest("hex");

function canonical(value){
  if(value===null)return "null";
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="number"){
    assert.ok(Number.isSafeInteger(value),"noncanonical_number");
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  assert.ok(value&&typeof value==="object","noncanonical_value");
  return "{"+Object.keys(value).sort()
    .map((key)=>JSON.stringify(key)+":"+canonical(value[key]))
    .join(",")+"}";
}

function read(relative,max=4*1024*1024){
  const absolute=path.join(ROOT,...relative.split("/"));
  const before=fs.lstatSync(absolute);
  assert.ok(
    before.isFile()&&!before.isSymbolicLink()&&
    before.nlink===1&&before.size>0&&before.size<=max,
    "invalid_file:"+relative,
  );
  const bytes=fs.readFileSync(absolute);
  const after=fs.lstatSync(absolute);
  for(const key of ["dev","ino","size","mtimeMs","ctimeMs"]){
    assert.equal(after[key],before[key],"file_changed:"+relative+":"+key);
  }
  return bytes;
}

function run(command,args,{cwd=ROOT,env=null,timeout=120000}={}){
  const result=spawnSync(command,args,{
    cwd,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout,
    maxBuffer:16*1024*1024,
    env:env||{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      TZ:"UTC",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0",
    },
  });
  assert.equal(result.error,undefined,String(result.error||""));
  assert.equal(result.status,0,String(result.stderr||result.stdout||""));
  return String(result.stdout||"");
}

function git(args){
  return run(
    "/usr/bin/git",
    ["--no-replace-objects","-C",ROOT,...args],
    {timeout:30000},
  ).trim();
}

function exactCandidateBytes(){
  const bytes=Buffer.from(JSON.stringify(CANDIDATE)+"\n","utf8");
  assert.equal(bytes.length,CANDIDATE_BYTES);
  assert.equal(sha256(bytes),CANDIDATE_SHA256);
  assert.equal(gitBlob(bytes),CANDIDATE_BLOB);
  assert.ok(
    read(CANDIDATE_FILE,4096).equals(bytes),
    "committed_candidate_bytes_mismatch",
  );
}

function expectedLock(){
  const body={
    schema:"void_buy_void_epoch2_live_composition_native_lock_v2",
    marker:"VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_LOCK_V2",
    version:2,
    repository:"6ZoSo9/void-node",
    source_parent:SOURCE_PARENT,
    candidate_head:CANDIDATE_HEAD,
    candidate_merge_commit:CANDIDATE_MERGE,
    candidate_hosted_evidence:{
      workflow_run:38811855456,
      artifact_a:12007939670,
      artifact_b:12008782133,
      artifact_c:12008931729,
      cross_job_byte_identity_verified:true,
      exact_native_and_runner_executed_before_hash:true,
    },
    candidate_evidence:{
      path:CANDIDATE_FILE,
      workflow_path:CANDIDATE_WORKFLOW,
      workflow_git_blob_sha1:EXPECTED_BLOBS[CANDIDATE_WORKFLOW],
      bytes:CANDIDATE_BYTES,
      sha256:CANDIDATE_SHA256,
      git_blob_sha1:CANDIDATE_BLOB,
      native_source_git_blob_sha1:CANDIDATE.native_source_git_blob_sha1,
      runner_source_git_blob_sha1:CANDIDATE.runner_source_git_blob_sha1,
      source_proof_git_blob_sha1:CANDIDATE.source_proof_git_blob_sha1,
      source_workflow_git_blob_sha1:CANDIDATE.source_workflow_git_blob_sha1,
      sealed_v2_git_blob_sha1:CANDIDATE.sealed_v2_git_blob_sha1,
      native_binary_sha256:CANDIDATE.native_binary_sha256,
      native_binary_bytes:CANDIDATE.native_binary_bytes,
      runner_sha256:CANDIDATE.runner_sha256,
      runner_bytes:CANDIDATE.runner_bytes,
      runner_install_mode:CANDIDATE.runner_install_mode,
      cc_sha256:CANDIDATE.cc_sha256,
      strip_sha256:CANDIDATE.strip_sha256,
    },
    native_static_no_interp:true,
    native_parent_retained_for_child_lifetime:true,
    private_parent_proof_channel:true,
    native_parent_process_generation_bound:true,
    native_parent_installed_generation_bound:true,
    native_parent_revalidation_after_sensitive_sequence:true,
    proof_pipe_closure_fail_closed:true,
    policy_expected_head_host_bound_later:true,
    policy_node_identity_host_bound_later:true,
    policy_runner_identity_must_equal_candidate:true,
    candidate_accepted:true,
    install_authorized:false,
    live_execution_authorized:false,
    protected_install_performed:false,
    credential_access:false,
    private_key_access:false,
    transaction:false,
    payment_acceptance:false,
    public_presale_activation:false,
    wc_void_market_activation:false,
    funds_movement:false,
    production_host_evidence_authority:false,
  };
  const id=
    "voidbuye2livecompnativelock2_"+
    sha256(Buffer.from(canonical(body),"utf8"));
  assert.equal(id,LOCK_ID);
  return Object.freeze({...body,lock_id:id});
}

function verifyBranch(){
  git(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"]);
  git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
  git(["merge-base","--is-ancestor",CANDIDATE_MERGE,"HEAD"]);

  for(const [relative,expected] of Object.entries(EXPECTED_BLOBS)){
    assert.equal(
      git(["rev-parse","HEAD:"+relative]),
      expected,
      "source_blob_drift:"+relative,
    );
  }
  assert.equal(git(["rev-parse","HEAD:"+CANDIDATE_FILE]),CANDIDATE_BLOB);
}

function rederiveCandidate(){
  assert.equal(
    sha256(fs.readFileSync("/usr/bin/cc")),
    CANDIDATE.cc_sha256,
    "cc_identity_drift",
  );
  assert.equal(
    sha256(fs.readFileSync("/usr/bin/strip")),
    CANDIDATE.strip_sha256,
    "strip_identity_drift",
  );

  const runnerBytes=read(RUNNER_SOURCE,512*1024);
  assert.equal(runnerBytes.length,CANDIDATE.runner_bytes);
  assert.equal(sha256(runnerBytes),CANDIDATE.runner_sha256);

  const tmp=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-epoch2-native-lock-v2-"),
  );
  try{
    const native=path.join(tmp,"native");
    run("/usr/bin/cc",[
      "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
      "-static","-fno-pie","-no-pie","-Wl,--build-id=none",
      "-o",native,path.join(ROOT,NATIVE_SOURCE),
    ],{
      env:{
        PATH:"/usr/bin:/bin",
        LANG:"C",
        LC_ALL:"C",
        SOURCE_DATE_EPOCH:"0",
      },
    });
    run("/usr/bin/strip",["--strip-all",native],{
      env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
    });

    const nativeBytes=fs.readFileSync(native);
    assert.equal(nativeBytes.length,CANDIDATE.native_binary_bytes);
    assert.equal(sha256(nativeBytes),CANDIDATE.native_binary_sha256);

    const programHeaders=run("/usr/bin/readelf",["-l",native],{
      env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
    });
    assert.equal(programHeaders.includes(" INTERP "),false);

    const nativeSelf=run(native,["--self-test"],{
      env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
    });
    assert.match(
      nativeSelf,
      /VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V1_SELF_TEST_GREEN/u,
    );

    const runnerSelf=run(
      process.execPath,
      [path.join(ROOT,RUNNER_SOURCE),"--self-test"],
      {env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}},
    );
    assert.match(
      runnerSelf,
      /VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V2_SELF_TEST_GREEN/u,
    );

    const runnerPlan=run(
      process.execPath,
      [path.join(ROOT,RUNNER_SOURCE),"--plan"],
      {env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"}},
    );
    assert.match(runnerPlan,/native_preentry_required_for_live=true/u);
    assert.match(runnerPlan,/stdin_javascript_source_forbidden=true/u);
    assert.match(runnerPlan,/transaction=false/u);
    assert.match(runnerPlan,/funds_movement=false/u);

    return {
      native_sha256:sha256(nativeBytes),
      runner_sha256:sha256(runnerBytes),
    };
  }finally{
    fs.rmSync(tmp,{recursive:true,force:true});
  }
}

function verify(){
  verifyBranch();
  exactCandidateBytes();
  const derived=rederiveCandidate();
  const lock=expectedLock();
  const expected=Buffer.from(JSON.stringify(lock,null,2)+"\n","utf8");
  assert.ok(
    read(LOCK_FILE,32*1024).equals(expected),
    "committed_lock_bytes_mismatch",
  );
  return {lock,expected,derived};
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==="--derive"){
  process.stdout.write(verify().expected);
}else if(args.length===0||(args.length===1&&args[0]==="--self-test")){
  const result=verify();
  console.log("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_LOCK_V2_GREEN");
  console.log("lock_id="+result.lock.lock_id);
  console.log("candidate_sha256="+CANDIDATE_SHA256);
  console.log("native_binary_sha256="+result.derived.native_sha256);
  console.log("runner_sha256="+result.derived.runner_sha256);
  console.log("native_static_no_interp=true");
  console.log("native_parent_retained_for_child_lifetime=true");
  console.log("private_parent_proof_channel=true");
  console.log("native_parent_revalidated_after_sensitive_sequence=true");
  console.log("candidate_accepted=true");
  console.log("install_authorized=false");
  console.log("live_execution_authorized=false");
  console.log("credential_access=false");
  console.log("private_key_access=false");
  console.log("transaction=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("wc_void_market_activation=false");
  console.log("funds_movement=false");
  console.log("production_host_evidence_authority=false");
}else{
  throw new Error("usage: proof [--self-test|--derive]");
}
