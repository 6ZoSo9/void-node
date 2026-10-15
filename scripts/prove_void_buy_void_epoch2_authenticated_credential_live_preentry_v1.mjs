#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const RUNNER_REL=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs";
const PREENTRY_REL=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_preentry_v1.c";
const RUNNER=path.join(ROOT,RUNNER_REL);
const PREENTRY=path.join(ROOT,PREENTRY_REL);
const RUNNER_BLOB="b3d3768846e92065b1f2feb6c7d841b832e6e483";
const PREENTRY_BLOB="0d7cb2e62a13e0974a75cc38ba39d7b2ac340e90";
const RUNNER_BYTES=24365;
const RUNNER_SHA256="d8fef8b60fdfab40e8f6c70566812d0ccb05a3169bcdaa590a50775dc10b3872";
const FIXED_ROOT="/opt/void-buy-void-epoch2-live-composition-v2";
const FIXED_PREENTRY=
  FIXED_ROOT+"/void_buy_void_epoch2_authenticated_credential_live_preentry_v1";
const FIXED_RUNNER=
  FIXED_ROOT+"/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs";
const CONFIRM="RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2";

function gitBlob(raw){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+raw.length+"\0","utf8"))
    .update(raw)
    .digest("hex");
}
function sha256(raw){
  return crypto.createHash("sha256").update(raw).digest("hex");
}
function run(command,args,options={}){
  const r=spawnSync(command,args,{
    cwd:options.cwd??ROOT,
    env:options.env??{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
    input:options.input,
    encoding:options.encoding??"utf8",
    stdio:["pipe","pipe","pipe"],
    timeout:options.timeout??60_000,
    maxBuffer:4*1024*1024,
  });
  if(r.error)throw r.error;
  return r;
}

const runnerRaw=fs.readFileSync(RUNNER);
const preentryRaw=fs.readFileSync(PREENTRY);
assert.equal(gitBlob(runnerRaw),RUNNER_BLOB,"runner blob");
assert.equal(gitBlob(preentryRaw),PREENTRY_BLOB,"preentry blob");
assert.equal(runnerRaw.length,RUNNER_BYTES,"runner bytes");
assert.equal(sha256(runnerRaw),RUNNER_SHA256,"runner sha256");

const runnerSource=runnerRaw.toString("utf8");
const preentrySource=preentryRaw.toString("utf8");

for(const token of [
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V2",
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2",
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs",
  'const SEALED_BLOB="14cbe81e27d04fee77cbe75225ce308bf8561a7b"',
  "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V2",
  "/^voide2sealed2_[0-9a-f]{64}$/u",
  "privileged_first_entry_authenticated:false",
  "credential_generation_retained_through_signing:true",
  "credential_generation_revalidated_after_final_observation:true",
  "credential_generation_revalidated_immediately_before_close:true",
  "function assertPrivilegedFirstEntry()",
  "privileged_first_entry_parent_identity_mismatch",
  "runner_preentry_stdin_required",
  "privileged_first_entry_authenticated:true",
  "sealed_v2_credential_generation_retained:true",
]){
  assert.ok(runnerSource.includes(token),token);
}
for(const forbidden of [
  "CREDENTIAL_ATTESTATION_SEALED_V1",
  "voide2sealed1_",
  "voide2livecomp1_",
]){
  assert.equal(runnerSource.includes(forbidden),false,"forbidden runner token:"+forbidden);
}
assert.ok(
  runnerSource.indexOf("assertPrivilegedFirstEntry();") <
  runnerSource.indexOf("assertTrustedExecutable(GIT);"),
  "first-entry check must precede root helper execution",
);

for(const token of [
  'VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_PREENTRY_V1',
  '#define FIXED_NODE "/usr/bin/node"',
  '#define FIXED_RUNNER "'+FIXED_RUNNER+'"',
  '#define FIXED_RUNNER_BYTES 24365U',
  "static bool sha256_fd_matches(int fd)",
  "native_preentry_runner_digest_mismatch",
  "pipe2(pipefd, O_CLOEXEC)",
  "pid_t child = fork()",
  "dup2(pipefd[0], STDIN_FILENO)",
  "fexecve(node_fd, child_argv, child_env)",
  "stream_exact_runner(runner_fd, pipefd[1])",
  'RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2',
]){
  assert.ok(preentrySource.includes(token),token);
}
assert.equal(preentrySource.includes("system("),false);
assert.equal(preentrySource.includes("popen("),false);

const runnerCheck=run("/usr/bin/node",["--check",RUNNER]);
assert.equal(runnerCheck.status,0,runnerCheck.stderr);

const runnerSelf=run("/usr/bin/node",["--input-type=module","-","--self-test"],{
  input:runnerRaw,
});
assert.equal(runnerSelf.status,0,runnerSelf.stderr);
for(const line of [
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V2_SELF_TEST_GREEN",
  "native_preentry_required_for_live=true",
  "direct_root_node_stdin_rejected=true",
  "nontransaction_signature_only=true",
  "transaction=false",
  "funds_movement=false",
]){
  assert.ok(runnerSelf.stdout.split("\n").includes(line),line);
}

const runnerPlan=run("/usr/bin/node",["--input-type=module","-","--plan"],{
  input:runnerRaw,
});
assert.equal(runnerPlan.status,0,runnerPlan.stderr);
for(const line of [
  "native_preentry_required_for_live=true",
  "runner_source_stdin_supplied_only_by_preentry=true",
  "privileged_first_entry_path="+FIXED_PREENTRY,
  "credential_content_access=false",
  "transaction=false",
  "funds_movement=false",
]){
  assert.ok(runnerPlan.stdout.split("\n").includes(line),line);
}

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-e2-first-entry-proof-"));
try{
  const binary=path.join(tmp,"preentry");
  const compile=run("/usr/bin/cc",[
    "-std=c11","-Wall","-Wextra","-Werror","-O2","-static",
    PREENTRY,"-o",binary,
  ],{timeout:120_000});
  assert.equal(compile.status,0,compile.stderr);

  const nativeSelf=run(binary,["--self-test"]);
  assert.equal(nativeSelf.status,0,nativeSelf.stderr);
  for(const line of [
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_PREENTRY_V1_SELF_TEST=GREEN",
    "fixed_runner_exact_sha256_bound=true",
    "caller_stdin_not_forwarded=true",
    "closed_child_environment_required=true",
    "native_parent_retained_for_child_lifetime=true",
    "credential_content_access=false",
    "transaction=false",
    "funds_movement=false",
  ]){
    assert.ok(nativeSelf.stdout.split("\n").includes(line),line);
  }

  const so=path.join(tmp,"preload.so");
  const marker=path.join(tmp,"preload-marker");
  const preloadC=path.join(tmp,"preload.c");
  const controlC=path.join(tmp,"control.c");
  const control=path.join(tmp,"control");
  fs.writeFileSync(preloadC,
    "#include <fcntl.h>\n#include <stdlib.h>\n#include <unistd.h>\n"+
    "__attribute__((constructor)) static void p(void){"+
    "const char*m=getenv(\"VOID_PRELOAD_MARKER\");if(!m)return;"+
    "int f=open(m,O_WRONLY|O_CREAT|O_TRUNC,0600);if(f>=0){write(f,\"x\",1);close(f);}}\n");
  fs.writeFileSync(controlC,"int main(void){return 0;}\n");
  let cp=run("/usr/bin/cc",["-shared","-fPIC",preloadC,"-o",so]);
  assert.equal(cp.status,0,cp.stderr);
  cp=run("/usr/bin/cc",[controlC,"-o",control]);
  assert.equal(cp.status,0,cp.stderr);

  const poisonEnv={
    PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",
    LD_PRELOAD:so,VOID_PRELOAD_MARKER:marker,
  };
  const positive=run(control,[],{env:poisonEnv});
  assert.equal(positive.status,0,positive.stderr);
  assert.equal(fs.existsSync(marker),true,"dynamic positive control");
  fs.rmSync(marker,{force:true});

  const staticProbe=run(binary,["--self-test"],{env:poisonEnv});
  assert.equal(staticProbe.status,0,staticProbe.stderr);
  assert.equal(fs.existsSync(marker),false,"static preentry must block preload");
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}

console.log("VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_PREENTRY_V1_PROOF_GREEN");
console.log("sealed_v2_runner_bound=true");
console.log("runner_exact_sha256_bound=true");
console.log("direct_root_node_stdin_requires_native_parent=true");
console.log("caller_stdin_not_forwarded=true");
console.log("static_preentry_loader_poison_blocked=true");
console.log("privileged_first_entry_installation_proven=false");
console.log("live_credential_access=false");
console.log("transaction=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
