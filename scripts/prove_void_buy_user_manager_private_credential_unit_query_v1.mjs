#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE=
  "ops/precision/void_buy_void_user_manager_private_credential_unit_query_v1.c";
const QUERY=
  "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c";
const PEER=
  "ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c";
const PREEXEC=
  "ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c";
const SEALED=
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v1.mjs";

const EXPECTED=Object.freeze({
  query:"ddca2c544ce14261dffb80a202c0a4ae2979ec1e",
  peer:"d8b30ac499c3bb8a5d223dbc6be687dd175be611",
  preexec:"f0fbfaae97df3294097a281100f06ada2ef157ff",
});

function run(command,args,{env=process.env,timeout=120000}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout,
    maxBuffer:8*1024*1024,
    env,
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args){
  return run("/usr/bin/git",[
    "--no-replace-objects","-C",ROOT,...args
  ],{
    timeout:30000,
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_NO_REPLACE_OBJECTS:"1",
    },
  }).stdout.trim();
}

assert.equal(git(["rev-parse","HEAD:"+QUERY]),EXPECTED.query);
assert.equal(git(["rev-parse","HEAD:"+PEER]),EXPECTED.peer);
assert.equal(git(["rev-parse","HEAD:"+PREEXEC]),EXPECTED.preexec);

const source=fs.readFileSync(path.join(ROOT,SOURCE),"utf8");
const sealed=fs.readFileSync(path.join(ROOT,SEALED),"utf8");
for(const needle of [
  '#include "void_buy_void_user_manager_private_peer_guard_v1.c"',
  'E2_CREDENTIAL_ID "buy-void-epoch2-fulfiller-v1"',
  'E2_DROPIN_BASENAME "97-buy-void-epoch2-fulfiller-credential-v1.conf"',
  '"NeedDaemonReload"',
  '"FragmentPath"',
  '"DropInPaths"',
  '"LoadCredential"',
  '"org.freedesktop.systemd1.Service"',
  '"org.freedesktop.systemd1.Service","ControlGroup"',
  '"a(ss)"',
  'same_retained_private_connection=true',
  'credential_contents_read=false',
  'binary_acceptance=false',
  'live_query_authorized=false',
  'public_user_bus_used=false',
]) assert.ok(source.includes(needle),needle);

assert.ok(
  sealed.includes('const CREDENTIAL_ID = "buy-void-epoch2-fulfiller-v1";'),
  "sealed_credential_id_drift",
);
assert.ok(
  sealed.includes(
    '"97-buy-void-epoch2-fulfiller-credential-v1.conf"',
  ),
  "sealed_dropin_basename_drift",
);
assert.ok(!source.includes('"--user", "show"'));
assert.ok(!source.includes("/run/user/%lu/bus"));
assert.ok(!source.includes('"org.freedesktop.systemd1.Unit","ControlGroup"'));

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-e2-auth-query-"));
try{
  const binary=path.join(tmp,"credential-query");
  run("/usr/bin/cc",[
    "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
    "-Wl,--build-id=none",
    "-o",binary,SOURCE,"-ldl",
  ],{timeout:120000});
  const self=run(binary,["--self-test"],{
    timeout:30000,
    env:{
      PATH:"/usr/bin:/bin",
      LANG:"C",
      LC_ALL:"C",
      VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1:"1",
    },
  });
  for(const line of [
    "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V1_SELF_TEST_GREEN",
    "accepted_v4_peer_guard_embedded=true",
    "accepted_v4_unit_query_pinned_as_integration_peer=true",
    "systemd_private_socket_required=true",
    "public_user_bus_used=false",
    "need_daemon_reload_queried_same_connection=true",
    "fragment_path_queried_same_connection=true",
    "dropin_paths_queried_same_connection=true",
    "load_credential_queried_same_connection=true",
    "main_pid_kernel_bound=true",
    "credential_contents_read=false",
    "binary_acceptance=false",
    "live_query_authorized=false",
    "host_mutation=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
  ]) assert.ok(self.stdout.split("\n").includes(line),line);

  console.log("VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V1_PROOF_GREEN");
  console.log("accepted_v4_query_git_blob_sha1="+EXPECTED.query);
  console.log("accepted_peer_guard_git_blob_sha1="+EXPECTED.peer);
  console.log("accepted_preexec_git_blob_sha1="+EXPECTED.preexec);
  console.log("credential_effective_properties_same_authenticated_connection=true");
  console.log("credential_contents_read=false");
  console.log("binary_acceptance=false");
  console.log("live_query_authorized=false");
  console.log("host_mutation=false");
  console.log("payment_acceptance=false");
  console.log("public_presale_activation=false");
  console.log("funds_movement=false");
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
