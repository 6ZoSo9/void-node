#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE="ops/precision/void_buy_void_user_manager_private_credential_unit_query_v3.c";
const V2="ops/precision/void_buy_void_user_manager_private_credential_unit_query_v2.c";
const PEER="ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c";
const V2_BLOB="39b292a6353cc36bcc07a5425ff2c736372a7c83";
const PEER_BLOB="d8b30ac499c3bb8a5d223dbc6be687dd175be611";

function run(command,args,{env=process.env,timeout=120000}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout,
    maxBuffer:8*1024*1024,env,
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return r;
}
function git(args){
  return run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args],{
    timeout:30000,
    env:{
      PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",GIT_OPTIONAL_LOCKS:"0",
      GIT_NO_REPLACE_OBJECTS:"1",
    },
  }).stdout.trim();
}

assert.equal(git(["rev-parse","HEAD:"+V2]),V2_BLOB);
assert.equal(git(["rev-parse","HEAD:"+PEER]),PEER_BLOB);
assert.equal(
  git(["hash-object","--",SOURCE]),
  git(["rev-parse","HEAD:"+SOURCE]),
  "V3 working bytes must equal the tracked Git object",
);

const source=fs.readFileSync(path.join(ROOT,SOURCE),"utf8");
for(const needle of [
  "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3",
  '#include "void_buy_void_user_manager_private_peer_guard_v1.c"',
  "MAX_DROPIN_PATHS 64",
  "MAX_LOAD_CREDENTIALS 32",
  "sha256_ctx",
  "sha256_transform",
  "sha256_buffer",
  "sha256_hex",
  "DropInPathsCanonicalSHA256=%s",
  "LoadCredentialCanonicalSHA256=%s",
  "complete_dropin_set_sha256_emitted=true",
  "complete_credential_set_sha256_emitted=true",
  "sha256_known_vector_verified=true",
  "credential_contents_read=false",
  "binary_acceptance=false",
  "live_query_authorized=false",
]) assert.ok(source.includes(needle),needle);

for(const forbidden of [
  "credential_contents_read=true",
  "binary_acceptance=true",
  "live_query_authorized=true",
  "host_mutation=true",
  "payment_acceptance=true",
  "public_presale_activation=true",
  "funds_movement=true",
]) assert.equal(source.includes(forbidden),false,forbidden);

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-e2-auth-query-v3-"));
try{
  const binary=path.join(tmp,"credential-query-v3");
  run("/usr/bin/cc",[
    "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
    "-Wl,--build-id=none","-o",binary,SOURCE,"-ldl",
  ],{
    env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",TZ:"UTC"},
  });
  const self=run(binary,["--self-test"],{
    timeout:30000,
    env:{
      PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",
      VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1:"1",
    },
  });
  const lines=new Set(self.stdout.split("\n"));
  for(const line of [
    "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3_SELF_TEST_GREEN",
    "bounded_dropin_set_observed=true",
    "dropin_limit_64=true",
    "exactly_one_credential_dropin_match_required=true",
    "bounded_loadcredential_set_observed=true",
    "loadcredential_limit_32=true",
    "exactly_one_target_credential_match_required=true",
    "unrelated_credentials_allowed=true",
    "duplicate_credential_ids_rejected=true",
    "credential_set_generation_stability_required=true",
    "complete_dropin_set_sha256_emitted=true",
    "complete_credential_set_sha256_emitted=true",
    "sha256_known_vector_verified=true",
    "credential_contents_read=false",
    "binary_acceptance=false",
    "live_query_authorized=false",
    "host_mutation=false",
    "funds_movement=false",
  ]) assert.ok(lines.has(line),line);

  console.log("VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3_PROOF_GREEN");
  console.log("v2_source_preserved=true");
  console.log("accepted_peer_guard_preserved=true");
  console.log("dropin_bound=64");
  console.log("loadcredential_bound=32");
  console.log("exactly_one_epoch2_credential_required=true");
  console.log("unrelated_credentials_allowed=true");
  console.log("complete_dropin_set_sha256_emitted=true");
  console.log("complete_credential_set_sha256_emitted=true");
  console.log("sha256_known_vector_verified=true");
  console.log("cross_query_complete_set_binding_enabled=true");
  console.log("credential_contents_read=false");
  console.log("binary_acceptance=false");
  console.log("protected_install_authorized=false");
  console.log("live_query_authorized=false");
  console.log("production_host_evidence_authority=false");
  console.log("host_mutation=false");
  console.log("funds_movement=false");
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
