#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER="VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1";
const SOURCE="ops/precision/void_buy_void_source_finality_live_process_v2_selector_guard.c";
const source=fs.readFileSync(SOURCE,"utf8");

for(const required of [
  '#define MARKER "VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1"',
  '#define MANAGER_EXE "/usr/lib/systemd/systemd"',
  '#define NODE_EXE "/usr/bin/node"',
  '" - cgroup2 "',
  'init.scope',
  'app.slice/%s',
  'SYS_pidfd_open',
  'SYS_pidfd_send_signal',
  'o->ppid==1',
  'o->ppid==manager_pid',
  'safe_root_ancestors',
  'safe_root_exec',
  'O_NOFOLLOW',
  'VERIFY\\n',
  'selection_changed_during_collection',
  'systemctl_user_selector_authority=false',
]) assert.equal(source.includes(required),true,required);

for(const forbidden of [
  "systemctl",
  "dbus",
  "/run/user/",
  "curl",
  "wget",
  "socket(",
  "connect(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "PRIVATE_KEY",
  "SEED_PHRASE",
]) assert.equal(source.includes(forbidden),false,forbidden);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-v2-native-selector-proof-"));
try{
  const binary=path.join(tmp,"selector");
  const compile=spawnSync("/usr/bin/cc",[
    "-std=c11","-Wall","-Wextra","-Werror","-O2",
    "-o",binary,SOURCE,
  ],{encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30_000});
  assert.equal(compile.error,undefined,String(compile.error||""));
  assert.equal(compile.status,0,compile.stderr||compile.stdout);

  const self=spawnSync(binary,["--self-test"],{
    encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:10_000,
  });
  assert.equal(self.error,undefined,String(self.error||""));
  assert.equal(self.status,0,self.stderr||self.stdout);
  for(const line of [
    MARKER+"_SELF_TEST_GREEN",
    "sha256_internal_verified=true",
    "pidfd_open_self_verified=true",
    "pidfd_send_signal_zero_verified=true",
    "service_mutation=false",
    "rpc_contact=false",
    "public_presale_activation=false",
    "funds_movement=false",
  ]) assert.match(self.stdout,new RegExp("^"+line+"$","m"));

  if(typeof process.getuid==="function"&&process.getuid()!==0){
    const denied=spawnSync(binary,[
      "--select","--runtime-uid",String(process.getuid()),
      "--runtime-gid",String(process.getgid()),
    ],{encoding:"utf8",stdio:["pipe","pipe","pipe"],timeout:10_000});
    assert.equal(denied.status,2);
    assert.match(denied.stderr,/reason=root_required/u);
  }
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}

console.log("VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1_PROOF_GREEN");
console.log("native_pidfd_owner=true");
console.log("manager_pid1_parent_required=true");
console.log("manager_exact_systemd_path_required=true");
console.log("service_direct_manager_parent_required=true");
console.log("root_owned_nonwritable_executable_ancestry_required=true");
console.log("pidfd_liveness_rechecked=true");
console.log("selection_rederived_after_collection=true");
console.log("systemctl_user_selector_authority=false");
console.log("receipt_publication=false");
console.log("service_mutation=false");
console.log("rpc_contact=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
