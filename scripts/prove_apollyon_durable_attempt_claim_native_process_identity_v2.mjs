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
    "fb92b4b3bd2a6594a2a90d7e607cae193452b92b",
  "scripts/prove_apollyon_durable_attempt_claim_native_peer_guard_integration_v2.mjs":
    "6afa9e9c74effb3555694ce9a5b7a01fc518190d",
  "ops/xiphos/apollyon_durable_attempt_claim_native_peer_guard_v2.c":
    "defd863de841a1f1460e10985d1990ba1a382f70",
  "scripts/prove_apollyon_durable_attempt_claim_native_peer_guard_v2.mjs":
    "d9af4667a429a9e55f491676db48cdd5975b7e16",
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
]) assert.equal(source.includes(required),true,required);
for(const required of [
  "struct apollyon_claim_process_identity_v2",
  "pidfd",
  "start_ticks",
  "executable_dev",
  "executable_ino",
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
for(const dependency of parentDependencies){
  assert.equal(
    workflow.split(dependency).length-1,
    2,
    "PR/main-push trigger parity missing for "+dependency,
  );
}
for(const own of [
  "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c",
  "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.h",
  "scripts/apollyon_durable_attempt_claim_native_process_identity_v2_selftest.c",
  "scripts/prove_apollyon_durable_attempt_claim_native_process_identity_v2.mjs",
  "docs/security/apollyon-durable-attempt-claim-native-process-identity-v2.md",
  ".github/workflows/apollyon-durable-attempt-claim-native-process-identity-v2.yml",
]){
  assert.equal(workflow.split(own).length-1,2,"own trigger parity missing for "+own);
}
assert.equal(workflow.includes("pull_request:"),true);
assert.equal(workflow.includes("push:"),true);
assert.equal(workflow.includes("workflow_dispatch:"),true);
assert.equal(workflow.includes("PUSH_BEFORE: ${{ github.event.before }}"),true);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"apollyon-native-identity-v2-"));
const binary=path.join(temp,"identity-selftest");
try{
  const compile=spawnSync(
    "/usr/bin/cc",
    [
      "-std=c11","-O2","-Wall","-Wextra","-Werror",
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
    "native_executable_inode_identity_bound=true",
    "raw_cmdline_identity_bound=true",
    "retained_pidfd_liveness_bound=true",
    "retained_pidfd_exit_state_bound=true",
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
console.log("fully_native_process_identity_path_proven=true");
console.log("cross_uid_host_qualification_performed=false");
console.log("interpreted_body_source_identity_proven=false");
console.log("host_installation=false");
console.log("service_action=false");
console.log("claim_store_mutation=false");
console.log("durable_attempt_claim=false");
console.log("training_execution=false");
