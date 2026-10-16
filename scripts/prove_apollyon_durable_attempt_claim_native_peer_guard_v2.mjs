#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE=path.join(
  ROOT,
  "ops/xiphos/apollyon_durable_attempt_claim_native_peer_guard_v2.c",
);

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}

for(const [relative,expected] of Object.entries({
  "tools/apollyon-durable-attempt-claim-revalidation-handoff-v2.mjs":
    "fab2b7699121b58010a5ed96ec50a47dd441726f",
  "ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c":
    "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
})){
  assert.equal(
    gitBlob(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    relative,
  );
}

const source=fs.readFileSync(SOURCE,"utf8");
for(const required of [
  '#define MARKER "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_V2"',
  "getsockopt(fd, SOL_SOCKET, SO_PEERCRED",
  "SYS_pidfd_open",
  '"/proc/%ld/exe"',
  "source_relation_to_fd",
  "read_proc_stat",
  "send_exact_then_half_close",
  "shutdown(fd, SHUT_WR)",
  "read_exact_then_eof",
  "self_test_framing_good",
  "self_test_framing_extra",
  "self_test_framing_no_eof",
  "self_test_peer_and_exec_drift",
  'execl("/bin/sleep"',
  "source_candidate_self_test_only",
]){
  assert.equal(source.includes(required),true,required);
}
for(const forbidden of [
  "AF_INET","AF_INET6","SOCK_DGRAM",
  "/var/lib/void-apollyon-attempt-claim-v2",
  "/run/void-apollyon-attempt-claim-v2",
  "/etc/systemd/system/void-apollyon-attempt-claim-v2.service",
  "PRIVATE KEY","createPrivateKey","eth_sendRawTransaction",
  "training_execution=true","durable_attempt_claim=true",
  "claim_store_mutation=true","funds_movement=true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"apollyon-native-peer-v2-"));
const binary=path.join(temp,"peer-guard-v2");
try{
  const compile=spawnSync(
    "/usr/bin/cc",
    [
      "-std=c11","-O2","-Wall","-Wextra","-Werror",
      SOURCE,"-o",binary,
    ],
    {
      cwd:ROOT,
      encoding:"utf8",
      timeout:20000,
      env:{PATH:"/usr/bin:/bin",LC_ALL:"C"},
    },
  );
  assert.equal(
    compile.status,
    0,
    "compile failed:\n"+String(compile.stderr||""),
  );

  const run=spawnSync(
    binary,
    ["--self-test"],
    {
      cwd:ROOT,
      encoding:"utf8",
      timeout:20000,
      env:{PATH:"/usr/bin:/bin",LC_ALL:"C"},
    },
  );
  assert.equal(
    run.status,
    0,
    "self-test failed:\nstdout="+String(run.stdout||"")+
      "\nstderr="+String(run.stderr||""),
  );
  for(const line of [
    "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_V2_SELF_TEST_GREEN",
    "af_unix_sock_stream=true",
    "so_peercred_proven=true",
    "pidfd_liveness_proven=true",
    "exec_in_place_source_drift_detected=true",
    "response_frame_exact_bytes=64",
    "response_half_close_eof_proven=true",
    "response_extra_byte_rejected=true",
    "response_no_eof_timeout_rejected=true",
    "read_half_ack_after_peer_eof_proven=true",
    "cross_uid_host_qualification_performed=false",
    "host_installation=false",
    "claim_store_mutation=false",
    "durable_attempt_claim=false",
    "training_execution=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "funds_movement=false",
  ]){
    assert.equal(run.stdout.includes(line+"\n"),true,line);
  }

  const inert=spawnSync(
    binary,
    [],
    {
      cwd:ROOT,
      encoding:"utf8",
      timeout:5000,
      env:{PATH:"/usr/bin:/bin",LC_ALL:"C"},
    },
  );
  assert.equal(inert.status,2);
  assert.equal(
    String(inert.stderr).includes("reason=source_candidate_self_test_only"),
    true,
  );
  for(const line of [
    "host_installation=false",
    "claim_store_mutation=false",
    "durable_attempt_claim=false",
    "training_execution=false",
    "private_key_access=false",
    "signing=false",
    "transaction=false",
    "funds_movement=false",
  ]){
    assert.equal(String(inert.stderr).includes(line+"\n"),true,line);
  }
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}

console.log("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_V2_PROOF_GREEN");
console.log("parent_handoff_blob_bound=true");
console.log("kernel_reference_blob_bound=true");
console.log("native_peer_credential_self_test=true");
console.log("pidfd_liveness_self_test=true");
console.log("exec_in_place_source_drift_self_test=true");
console.log("stream_half_close_eof_self_test=true");
console.log("live_mode=false");
console.log("claim_store_mutation=false");
console.log("durable_attempt_claim=false");
console.log("training_execution=false");
