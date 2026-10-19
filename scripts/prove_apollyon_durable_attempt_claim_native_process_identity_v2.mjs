#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE=path.join(ROOT,"ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c");
const HEADER=path.join(ROOT,"ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.h");
const SELFTEST=path.join(ROOT,"scripts/apollyon_durable_attempt_claim_native_process_identity_v2_selftest.c");
const WORKFLOW=path.join(ROOT,".github/workflows/apollyon-durable-attempt-claim-native-process-identity-v2.yml");

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}

for(const [relative,expected] of Object.entries({
  "tools/apollyon-durable-attempt-claim-native-peer-guard-integration-v2.mjs":
    "5532d18603ab9b4f400082c6fac265c58672ed85",
  "scripts/prove_apollyon_durable_attempt_claim_native_peer_guard_integration_v2.mjs":
    "2079fc8ad4ce98773a94a977c3c76bb9e05145dc",
  "ops/xiphos/apollyon_durable_attempt_claim_native_peer_guard_v2.c":
    "defd863de841a1f1460e10985d1990ba1a382f70",
  "scripts/prove_apollyon_durable_attempt_claim_native_peer_guard_v2.mjs":
    "45421969be31286f295c0daba6c36a4e4698010e",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

const source=fs.readFileSync(SOURCE,"utf8");
const header=fs.readFileSync(HEADER,"utf8");
for(const required of [
  "apollyon_claim_process_identity_observe_v2",
  "apollyon_claim_process_identity_pidfd_state_v2",
  "apollyon_claim_process_identity_close_v2",
  "SYS_pidfd_open",
  "\"/proc/%ld/%s\"",
  "\"cmdline\"",
  "\"status\"",
  "\"stat\"",
  "\"/proc/%ld/exe\"",
  "expected_ppid",
  "before_start",
  "after_start",
  "expected_executable_fd",
  "expected_cmdline",
  "expected_supplementary_gids",
  "expected_supplementary_gid_count",
  "Groups:",
  "APOLLYON_CLAIM_PROCESS_IDENTITY_MAX_SUPPLEMENTARY_GIDS_V2",
  "POLLNVAL",
  "POLLERR",
  "POLLHUP",
  "APOLLYON_CLAIM_PROCESS_IDENTITY_V2_SELF_TEST",
]) assert.equal(source.includes(required),true,required);
for(const required of [
  "struct apollyon_claim_process_identity_v2",
  "pidfd",
  "start_ticks",
  "executable_dev",
  "executable_ino",
  "expected_supplementary_gids",
  "expected_supplementary_gid_count",
]) assert.equal(header.includes(required),true,required);
for(const forbidden of [
  "AF_UNIX","SO_PEERCRED","socket(","connect(","bind(","listen(","accept(",
  "O_WRONLY","O_CREAT","rename(","unlink(","mkdir(","systemctl",
  "/var/lib/void-apollyon-attempt-claim-v2",
  "/run/void-apollyon-attempt-claim-v2",
  "PRIVATE KEY","createPrivateKey","eth_sendRawTransaction",
]) assert.equal(source.includes(forbidden),false,forbidden);
assert.equal(source.includes("int main("),false,"library gained standalone main");

const parentDependencies=[
  "tools/apollyon-durable-attempt-claim-native-peer-guard-integration-v2.mjs",
  "scripts/prove_apollyon_durable_attempt_claim_native_peer_guard_integration_v2.mjs",
  ".github/workflows/apollyon-durable-attempt-claim-native-peer-guard-integration-v2.yml",
  "tools/apollyon-durable-attempt-claim-revalidation-handoff-v2.mjs",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs",
  "tools/apollyon-durable-attempt-claim-request-envelope-v2.mjs",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs",
  "ops/xiphos/apollyon_durable_attempt_claim_native_peer_guard_v2.c",
  "scripts/prove_apollyon_durable_attempt_claim_native_peer_guard_v2.mjs",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs",
];
const workflow=fs.readFileSync(WORKFLOW,"utf8");
const pushToken="  push:\n";
const dispatchToken="  workflow_dispatch:\n";
const pushIndex=workflow.indexOf(pushToken);
const dispatchIndex=workflow.indexOf(dispatchToken,pushIndex+pushToken.length);
assert.notEqual(pushIndex,-1);
assert.notEqual(dispatchIndex,-1);
const pullSection=workflow.slice(0,pushIndex);
const pushSection=workflow.slice(pushIndex+pushToken.length,dispatchIndex);
function requireTriggerPath(relative){
  const entry='      - "'+relative+'"';
  assert.equal(
    pullSection.split(entry).length-1,
    1,
    "pull_request trigger missing/duplicate for "+relative,
  );
  assert.equal(
    pushSection.split(entry).length-1,
    1,
    "push trigger missing/duplicate for "+relative,
  );
}
for(const dependency of parentDependencies)requireTriggerPath(dependency);
for(const own of [
  "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c",
  "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.h",
  "scripts/apollyon_durable_attempt_claim_native_process_identity_v2_selftest.c",
  "scripts/prove_apollyon_durable_attempt_claim_native_process_identity_v2.mjs",
  "docs/security/apollyon-durable-attempt-claim-native-process-identity-v2.md",
  ".github/workflows/apollyon-durable-attempt-claim-native-process-identity-v2.yml",
])requireTriggerPath(own);
assert.equal(workflow.includes("pull_request:"),true);
assert.equal(workflow.includes("push:"),true);
assert.equal(workflow.includes("workflow_dispatch:"),true);
assert.equal(workflow.includes("PUSH_BEFORE: ${{ github.event.before }}"),true);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"apollyon-native-identity-v2-"));
const binary=path.join(temp,"identity-selftest");
const object=path.join(temp,"identity.o");
try{
  const productionCompile=spawnSync(
    "/usr/bin/cc",
    [
      "-std=c11","-O2","-Wall","-Wextra","-Werror",
      "-I",path.dirname(HEADER),"-c",SOURCE,"-o",object,
    ],
    {cwd:ROOT,encoding:"utf8",timeout:20000,env:{PATH:"/usr/bin:/bin",LC_ALL:"C"}},
  );
  assert.equal(
    productionCompile.status,0,
    "production compile failed:\n"+String(productionCompile.stderr||""),
  );
  const compile=spawnSync(
    "/usr/bin/cc",
    [
      "-std=c11","-O2","-Wall","-Wextra","-Werror",
      "-DAPOLLYON_CLAIM_PROCESS_IDENTITY_V2_SELF_TEST=1",
      "-I",path.dirname(HEADER),SOURCE,SELFTEST,"-o",binary,
    ],
    {cwd:ROOT,encoding:"utf8",timeout:20000,env:{PATH:"/usr/bin:/bin",LC_ALL:"C"}},
  );
  assert.equal(compile.status,0,"compile failed:\n"+String(compile.stderr||""));
  const run=spawnSync(
    binary,["--self-test"],
    {cwd:ROOT,encoding:"utf8",timeout:20000,env:{PATH:"/usr/bin:/bin",LC_ALL:"C"}},
  );
  assert.equal(
    run.status,0,
    "self-test failed:\nstdout="+String(run.stdout||"")+"\nstderr="+String(run.stderr||""),
  );
  for(const line of [
    "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PROCESS_IDENTITY_V2_SELF_TEST_GREEN",
    "direct_parent_lineage_primitive_proven=true",
    "pid_start_generation_bound=true",
    "all_uid_gid_slots_bound=true",
    "exact_supplementary_groups_bound=true",
    "supplementary_group_parser_adversaries=true",
    "native_executable_inode_identity_bound=true",
    "raw_cmdline_identity_bound=true",
    "double_observation_generation_bracketed=true",
    "exec_in_place_observation_drift_rejected=true",
    "retained_pidfd_liveness_bound=true",
    "retained_pidfd_exit_state_bound=true",
    "invalid_pidfd_rejected=true",
    "wrong_parent_rejected=true",
    "wrong_cmdline_rejected=true",
    "wrong_executable_rejected=true",
    "cross_uid_host_qualification_performed=false",
    "interpreted_body_source_identity_proven=false",
    "host_installation=false",
    "service_action=false",
    "claim_store_mutation=false",
    "durable_attempt_claim=false",
    "training_execution=false",
  ]) assert.equal(run.stdout.includes(line+"\n"),true,line);

  const inert=spawnSync(
    binary,[],
    {cwd:ROOT,encoding:"utf8",timeout:5000,env:{PATH:"/usr/bin:/bin",LC_ALL:"C"}},
  );
  assert.equal(inert.status,2,"self-test harness gained non-self-test positive mode");
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}

console.log("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PROCESS_IDENTITY_V2_PROOF_GREEN");
console.log("parent_integration_blob_bound=true");
console.log("parent_native_generation_bound=true");
console.log("direct_parent_lineage_primitive_proven=true");
console.log("supplementary_groups_exact_set_proven=true");
console.log("double_observation_stability_proven=true");
console.log("exec_in_place_observation_drift_rejected=true");
console.log("pidfd_error_state_fail_closed=true");
console.log("production_compile_without_test_hook=true");
console.log("parent_generation_rebound=true");
console.log("fully_native_process_identity_path_proven=true");
console.log("cross_uid_host_qualification_performed=false");
console.log("interpreted_body_source_identity_proven=false");
console.log("host_installation=false");
console.log("service_action=false");
console.log("claim_store_mutation=false");
console.log("durable_attempt_claim=false");
console.log("training_execution=false");
