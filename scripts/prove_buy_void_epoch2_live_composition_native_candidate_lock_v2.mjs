#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const ROOT=process.cwd();
const LOCK="ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v2.json";
const LOCK_BLOB="83968ee655824e44d8e2c2eb243c2136b2dbe0e9";
const LOCK_ID=
  "voide2nativecandlock2_0d824d2f5a367b3f15e37b8ee80d2a6a16e647db06400a38bd9866e4baf310c2";
const CANDIDATE_HEAD="de1d19d8782405afa4d62ae670b11087d9c7e93e";
const SOURCE_PARENT="907bc1780110717f4caaae06595ec742976162f1";
const CANDIDATE_WORKFLOW=
  ".github/workflows/buy-void-epoch2-live-composition-native-candidate-v2.yml";
const CANDIDATE_WORKFLOW_BLOB="f3f644ad6c1ee916465a5a471e5b8edb23d18e8d";
const CANDIDATE_DOC=
  "docs/operators/buy-void-epoch2-live-composition-native-candidate-v2.md";
const CANDIDATE_DOC_BLOB="e1a0b0cf19947bd6364d980e08b571fdc37fa479";
const NATIVE=
  "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c";
const NATIVE_BLOB="4aa091e7835b32aa5c4e7b8e4059651c69a64eb3";
const RUNNER=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs";
const RUNNER_BLOB="92e8c8696ea7e2bb81b6ef089db8baa657188935";
const SOURCE_PROOF=
  "scripts/prove_buy_void_epoch2_live_composition_native_preentry_v1.mjs";
const SOURCE_PROOF_BLOB="4db3583c5c058a581fce69ef49312f7d3534b8ca";
const SOURCE_WORKFLOW=
  ".github/workflows/buy-void-epoch2-live-composition-native-preentry-v1.yml";
const SOURCE_WORKFLOW_BLOB="85c28fdf03345240332cbf41d46fbda065958ec7";
const SEALED_V2=
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";
const SEALED_V2_BLOB="14cbe81e27d04fee77cbe75225ce308bf8561a7b";

const EXPECTED=Object.freeze({
  native_binary_sha256:"78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589",
  native_binary_bytes:726976,
  runner_sha256:"2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73",
  runner_bytes:30103,
  cc_sha256:"1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26",
  strip_sha256:"0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42",
});

const GIT="/usr/bin/git";
const CC="/usr/bin/cc";
const STRIP="/usr/bin/strip";

function canonical(value){
  if(value===null)return "null";
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="number"){
    assert.ok(Number.isSafeInteger(value));
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  assert.ok(value&&typeof value==="object");
  return "{"+Object.keys(value).sort()
    .map((key)=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
}

function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function git(args){
  return execFileSync(GIT,[
    "-c","core.fsmonitor=false",
    "-c","core.hooksPath=/dev/null",
    ...args,
  ],{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout:15_000,
    env:{
      PATH:"/usr/bin:/bin",
      HOME:String(process.env.HOME||""),
      LANG:"C",
      LC_ALL:"C",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
    },
  }).trim();
}

function run(command,args,options={}){
  return spawnSync(command,args,{
    cwd:options.cwd||ROOT,
    env:options.env||{
      PATH:"/usr/bin:/bin",
      HOME:String(process.env.HOME||""),
      LANG:"C",
      LC_ALL:"C",
      SOURCE_DATE_EPOCH:"0",
    },
    encoding:"utf8",
    timeout:options.timeout||60_000,
    maxBuffer:2*1024*1024,
  });
}

assert.equal(git(["status","--porcelain=v1"]),"");
git(["merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD"]);
git(["merge-base","--is-ancestor",SOURCE_PARENT,"HEAD"]);

for(const [relative,expected] of [
  [LOCK,LOCK_BLOB],
  [CANDIDATE_WORKFLOW,CANDIDATE_WORKFLOW_BLOB],
  [CANDIDATE_DOC,CANDIDATE_DOC_BLOB],
  [NATIVE,NATIVE_BLOB],
  [RUNNER,RUNNER_BLOB],
  [SOURCE_PROOF,SOURCE_PROOF_BLOB],
  [SOURCE_WORKFLOW,SOURCE_WORKFLOW_BLOB],
  [SEALED_V2,SEALED_V2_BLOB],
]){
  assert.equal(git(["rev-parse","HEAD:"+relative]),expected,"blob_drift:"+relative);
}

const lock=JSON.parse(fs.readFileSync(LOCK,"utf8"));
const lockBody={...lock};
delete lockBody.lock_id;
assert.equal(
  "voide2nativecandlock2_"+sha256(Buffer.from(canonical(lockBody),"utf8")),
  LOCK_ID,
);
assert.equal(lock.lock_id,LOCK_ID);

for(const [key,want] of Object.entries({
  marker:"VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V2",
  version:2,
  candidate_source_parent:SOURCE_PARENT,
  candidate_pr_head:CANDIDATE_HEAD,
  candidate_workflow_git_blob_sha1:CANDIDATE_WORKFLOW_BLOB,
  candidate_doc_git_blob_sha1:CANDIDATE_DOC_BLOB,
  native_source_git_blob_sha1:NATIVE_BLOB,
  runner_source_git_blob_sha1:RUNNER_BLOB,
  source_proof_git_blob_sha1:SOURCE_PROOF_BLOB,
  source_workflow_git_blob_sha1:SOURCE_WORKFLOW_BLOB,
  sealed_v2_git_blob_sha1:SEALED_V2_BLOB,
  native_binary_sha256:EXPECTED.native_binary_sha256,
  native_binary_bytes:EXPECTED.native_binary_bytes,
  native_static_no_interp:true,
  runner_sha256:EXPECTED.runner_sha256,
  runner_bytes:EXPECTED.runner_bytes,
  runner_install_mode:"0444",
  cc_sha256:EXPECTED.cc_sha256,
  strip_sha256:EXPECTED.strip_sha256,
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
  native_binary_identity_accepted:true,
  runner_identity_accepted:true,
  install_authorized:false,
  live_execution_authorized:false,
  credential_access:false,
  private_key_access:false,
  transaction:false,
  payment_acceptance:false,
  public_presale_activation:false,
  wc_void_market_activation:false,
  funds_movement:false,
})){
  assert.equal(lock[key],want,"lock_field:"+key);
}

const ccBytes=fs.readFileSync(CC);
const stripBytes=fs.readFileSync(STRIP);
assert.equal(sha256(ccBytes),EXPECTED.cc_sha256);
assert.equal(sha256(stripBytes),EXPECTED.strip_sha256);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-e2-native-lock-v2-"));
try{
  const native=path.join(temp,"native");
  const compile=run(CC,[
    "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
    "-static","-fno-pie","-no-pie","-Wl,--build-id=none",
    "-o",native,path.join(ROOT,NATIVE),
  ]);
  assert.equal(compile.status,0,compile.stderr);
  const strip=run(STRIP,["--strip-all",native]);
  assert.equal(strip.status,0,strip.stderr);

  const nativeBytes=fs.readFileSync(native);
  assert.equal(nativeBytes.length,EXPECTED.native_binary_bytes);
  assert.equal(sha256(nativeBytes),EXPECTED.native_binary_sha256);

  const file=run("/usr/bin/file",[native]);
  assert.equal(file.status,0,file.stderr);
  assert.match(file.stdout,/statically linked/u);
  const readelf=run("/usr/bin/readelf",["-l",native]);
  assert.equal(readelf.status,0,readelf.stderr);
  assert.equal(/\bINTERP\b/u.test(readelf.stdout),false);

  const self=run(native,["--self-test"]);
  assert.equal(self.status,0,self.stderr);
  assert.match(
    self.stdout,
    /VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V1_SELF_TEST_GREEN/u,
  );

  const runnerBytes=fs.readFileSync(RUNNER);
  assert.equal(runnerBytes.length,EXPECTED.runner_bytes);
  assert.equal(sha256(runnerBytes),EXPECTED.runner_sha256);
  const runnerSelf=run(process.execPath,[RUNNER,"--self-test"]);
  assert.equal(runnerSelf.status,0,runnerSelf.stderr);
  const runnerPlan=run(process.execPath,[RUNNER,"--plan"]);
  assert.equal(runnerPlan.status,0,runnerPlan.stderr);
  assert.match(runnerPlan.stdout,/native_preentry_required_for_live=true/u);
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}

assert.equal(git(["status","--porcelain=v1"]),"");

console.log("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V2_PROOF_GREEN");
console.log("candidate_pr_head_bound=true");
console.log("candidate_workflow_bound=true");
console.log("candidate_doc_bound=true");
console.log("native_source_bound=true");
console.log("runner_source_bound=true");
console.log("native_binary_rederived=true");
console.log("runner_identity_rederived=true");
console.log("native_static_no_interp=true");
console.log("toolchain_identity_bound=true");
console.log("candidate_accepted=true");
console.log("native_binary_identity_accepted=true");
console.log("runner_identity_accepted=true");
console.log("policy_expected_head_host_bound_later=true");
console.log("policy_node_identity_host_bound_later=true");
console.log("install_authorized=false");
console.log("live_execution_authorized=false");
console.log("credential_access=false");
console.log("transaction=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
