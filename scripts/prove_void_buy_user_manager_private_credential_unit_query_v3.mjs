#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE="ops/precision/void_buy_void_user_manager_private_credential_unit_query_v3.c";
const V2="ops/precision/void_buy_void_user_manager_private_credential_unit_query_v2.c";
const PEER="ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c";
const SOURCE_BLOB="e131d5c4c09ed1036fadf89f6d7e1c64c2ea5917";
const V2_BLOB="39b292a6353cc36bcc07a5425ff2c736372a7c83";
const PEER_BLOB="d8b30ac499c3bb8a5d223dbc6be687dd175be611";

const gitBlob=(bytes)=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
  .update(bytes).digest("hex");

for(const [relative,expected] of [
  [SOURCE,SOURCE_BLOB],
  [V2,V2_BLOB],
  [PEER,PEER_BLOB],
]){
  assert.equal(
    gitBlob(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    "blob_drift:"+relative
  );
}

const source=fs.readFileSync(path.join(ROOT,SOURCE),"utf8");
for(const required of [
  'VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3',
  'MAX_DROPIN_PATHS 64',
  'MAX_LOAD_CREDENTIALS 32',
  'duplicate_credential_ids_rejected=true',
  'unrelated_credentials_allowed=true',
  'credential_set_generation_stability_required=true',
  'credential_sha256_hex',
  'DropInPathsSetSha256=%s',
  'LoadCredentialSetSha256=%s',
  'credential_before.dropins.canonical_paths',
  'credential_before.dropins.canonical_bytes',
  'credential_before.canonical_load_credentials',
  'credential_before.load_credential_canonical_bytes',
  'ba7816bf8f01cfea414140de5dae2223',
  'b00361a396177a9cb410ff61f20015ad',
  'complete_dropin_set_fingerprint=true',
  'complete_loadcredential_set_fingerprint=true',
  'same_length_set_substitution_changes_fingerprint=true',
  'unrelated_credential_paths_emitted=false',
  'credential_contents_read=false',
]){
  assert.ok(source.includes(required),required);
}

assert.equal(source.includes('printf("%s\n", credential_before.dropins.canonical_paths)'),false);
assert.equal(source.includes('printf("%s\n", credential_before.canonical_load_credentials)'),false);
assert.equal(source.includes('fputs(credential_before.dropins.canonical_paths'),false);
assert.equal(source.includes('fputs(credential_before.canonical_load_credentials'),false);

const dropinHashAt=source.indexOf(
  '(const unsigned char *)credential_before.dropins.canonical_paths'
);
const dropinLengthAt=source.indexOf(
  'credential_before.dropins.canonical_bytes',
  dropinHashAt
);
const loadHashAt=source.indexOf(
  '(const unsigned char *)credential_before.canonical_load_credentials'
);
const loadLengthAt=source.indexOf(
  'credential_before.load_credential_canonical_bytes',
  loadHashAt
);
assert.ok(dropinHashAt>0&&dropinLengthAt>dropinHashAt);
assert.ok(loadHashAt>0&&loadLengthAt>loadHashAt);

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

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-e2-credential-v3-fingerprint-"));
try{
  const binary=path.join(tmp,"credential-query-v3");
  run("/usr/bin/cc",[
    "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident",
    "-Wl,--build-id=none","-o",binary,SOURCE,"-ldl",
  ],{
    env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C",SOURCE_DATE_EPOCH:"0"}
  });
  const self=run(binary,["--self-test"],{
    timeout:30000,
    env:{
      PATH:"/usr/bin:/bin",
      LANG:"C",
      LC_ALL:"C",
      VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1:"1",
    }
  });
  const lines=new Set(self.stdout.split("\n").filter(Boolean));
  for(const line of [
    "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3_SELF_TEST_GREEN",
    "dropin_limit_64=true",
    "loadcredential_limit_32=true",
    "exactly_one_target_credential_match_required=true",
    "unrelated_credentials_allowed=true",
    "duplicate_credential_ids_rejected=true",
    "credential_set_generation_stability_required=true",
    "complete_dropin_set_fingerprint=true",
    "complete_loadcredential_set_fingerprint=true",
    "same_length_set_substitution_changes_fingerprint=true",
    "unrelated_credential_paths_emitted=false",
    "credential_contents_read=false",
    "binary_acceptance=false",
    "live_query_authorized=false",
    "host_mutation=false",
    "funds_movement=false",
  ]){
    assert.ok(lines.has(line),line);
  }
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}

console.log("VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3_PROOF_GREEN");
console.log("v2_source_preserved=true");
console.log("accepted_peer_guard_preserved=true");
console.log("dropin_bound=64");
console.log("loadcredential_bound=32");
console.log("exactly_one_epoch2_credential_required=true");
console.log("unrelated_credentials_allowed=true");
console.log("complete_dropin_set_sha256_emitted=true");
console.log("complete_loadcredential_set_sha256_emitted=true");
console.log("same_length_set_substitution_detectable=true");
console.log("unrelated_credential_paths_emitted=false");
console.log("credential_contents_read=false");
console.log("binary_acceptance=false");
console.log("protected_install_authorized=false");
console.log("live_query_authorized=false");
console.log("production_host_evidence_authority=false");
console.log("host_mutation=false");
console.log("funds_movement=false");
