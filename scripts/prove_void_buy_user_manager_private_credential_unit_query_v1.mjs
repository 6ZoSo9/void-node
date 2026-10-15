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
const V6_LOCK=
  "ops/security/buy-void-user-manager-query-elf-lock-v6.json";
const SEALED=
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v1.mjs";

const EXPECTED=Object.freeze({
  query:"fc1f640689b7da7278ff013669ef8a10cd8f6659",
  peer:"d8b30ac499c3bb8a5d223dbc6be687dd175be611",
  preexec:"f0fbfaae97df3294097a281100f06ada2ef157ff",
  v6Lock:"0cda9daecb2aa294f0a10041d81be7673705f1d8",
  v6LockId:"voidbuyumqelflock6_3526916b76e015ad2860be8f207b39013a9c4d71218b500620383a59ff893aa6",
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
assert.equal(git(["rev-parse","HEAD:"+V6_LOCK]),EXPECTED.v6Lock);

const v6Lock=JSON.parse(fs.readFileSync(path.join(ROOT,V6_LOCK),"utf8"));
assert.equal(v6Lock.marker,"VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V6");
assert.equal(v6Lock.version,6);
assert.equal(v6Lock.lock_id,EXPECTED.v6LockId);
assert.equal(v6Lock.candidate_accepted,true);
assert.equal(v6Lock.install_authorized,false);
assert.equal(v6Lock.live_query_authorized,false);
assert.equal(v6Lock.production_host_evidence_authority,false);
assert.equal(v6Lock.kernel_capability_state_bound,true);
assert.equal(v6Lock.configured_kernel_bounding_set_projection_required,true);
assert.equal(v6Lock.private_users_false_required,true);
assert.equal(
  v6Lock.candidate_evidence.query_source_git_blob_sha1,
  EXPECTED.query,
);
assert.equal(
  v6Lock.superseded_v5_hosted_evidence.source_git_blob_sha1,
  "ddca2c544ce14261dffb80a202c0a4ae2979ec1e",
);
assert.equal(v6Lock.superseded_v5_hosted_evidence.never_installed,true);
assert.equal(v6Lock.superseded_v5_hosted_evidence.superseded_by_live_v6,true);

const source=fs.readFileSync(path.join(ROOT,SOURCE),"utf8");
const sealed=fs.readFileSync(path.join(ROOT,SEALED),"utf8");
const preexec=fs.readFileSync(path.join(ROOT,PREEXEC),"utf8");
for(const needle of [
  '#include "void_buy_void_user_manager_private_peer_guard_v1.c"',
  'E2_CREDENTIAL_ID "buy-void-epoch2-fulfiller-v1"',
  'E2_DROPIN_BASENAME "97-buy-void-epoch2-fulfiller-credential-v1.conf"',
  '"NeedDaemonReload"',
  '"FragmentPath"',
  '"DropInPaths"',
  'MAX_DROPIN_PATHS 32',
  'MAX_DROPIN_TOTAL_BYTES (16 * 1024)',
  'credential_match_count',
  'canonical_paths',
  '"LoadCredential"',
  '"org.freedesktop.systemd1.Service"',
  '"a(ss)"',
  'same_retained_private_connection=true',
  'credential_contents_read=false',
  'binary_acceptance=false',
  'live_query_authorized=false',
  'public_user_bus_used=false',
]) assert.ok(source.includes(needle),needle);

assert.match(
  source,
  /get_string_prop\(\s*api,\s*bus,\s*object,\s*"org\.freedesktop\.systemd1\.Service"\s*,\s*"ControlGroup"/u,
  "controlgroup_service_interface_binding_missing",
);

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
assert.doesNotMatch(source, /"org\.freedesktop\.systemd1\.Unit"\s*,\s*"ControlGroup"/u);
assert.ok(
  preexec.includes(
    '#define QUERY_PATH ROOT_DIR "/void_buy_void_user_manager_private_unit_query_v1"',
  ),
  "current_preexec_unit_query_path_missing",
);
assert.ok(
  !preexec.includes("void_buy_void_user_manager_private_credential_unit_query_v1"),
  "current_preexec_must_not_be_claimed_for_credential_query",
);

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
    "accepted_v6_unit_query_pinned_as_integration_peer=true",
    "systemd_private_socket_required=true",
    "public_user_bus_used=false",
    "need_daemon_reload_queried_same_connection=true",
    "fragment_path_queried_same_connection=true",
    "dropin_paths_queried_same_connection=true",
    "load_credential_queried_same_connection=true",
    "main_pid_kernel_bound=true",
    "bounded_dropin_set_observed=true",
    "exactly_one_credential_dropin_match_required=true",
    "unrelated_hardening_dropin_allowed=true",
    "dropin_set_generation_stability_required=true",
    "security_transcript_composed=false",
    "credential_query_preexec_execution_path_proven=false",
    "credential_contents_read=false",
    "binary_acceptance=false",
    "live_query_authorized=false",
    "host_mutation=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
  ]) assert.ok(self.stdout.split("\n").includes(line),line);

  console.log("VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V1_PROOF_GREEN");
  console.log("accepted_v6_query_git_blob_sha1="+EXPECTED.query);
  console.log("accepted_v6_lock_git_blob_sha1="+EXPECTED.v6Lock);
  console.log("accepted_v6_lock_id="+EXPECTED.v6LockId);
  console.log("accepted_v6_query_lock_bound=true");
  console.log("accepted_peer_guard_git_blob_sha1="+EXPECTED.peer);
  console.log("accepted_preexec_git_blob_sha1="+EXPECTED.preexec);
  console.log("credential_effective_properties_same_authenticated_connection=true");
  console.log("bounded_dropin_set_observed=true");
  console.log("exactly_one_credential_dropin_match_required=true");
  console.log("unrelated_hardening_dropin_allowed=true");
  console.log("dropin_set_generation_stability_required=true");
  console.log("security_transcript_composed=false");
  console.log("credential_query_preexec_execution_path_proven=false");
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
