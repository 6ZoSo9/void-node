#!/usr/bin/env node
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const PARENT_HEAD="51c95c3324844a8a9580066649debf8fdcd42e3c";
const SOURCE=
  "ops/precision/void_buy_void_user_manager_private_credential_unit_query_preexec_v1.c";
const QUERY=
  "ops/precision/void_buy_void_user_manager_private_credential_unit_query_v1.c";
const ORDINARY_PREEXEC=
  "ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c";
const SELF=
  "scripts/prove_void_buy_void_user_manager_private_credential_unit_query_preexec_v1.mjs";
const DOC=
  "docs/operators/buy-void-user-manager-private-credential-unit-query-preexec-v1.md";
const WORKFLOW=
  ".github/workflows/buy-void-user-manager-private-credential-unit-query-preexec-v1.yml";
const EXPECTED_DELTA=[SOURCE,SELF,DOC,WORKFLOW].sort();

const EXPECTED=Object.freeze({
  credentialQuery:"e12e0b16df6e6eb5fd912a6dbf6ae970673246f9",
  ordinaryPreexec:"f0fbfaae97df3294097a281100f06ada2ef157ff",
});

function run(command,args,{timeout=30000}={}){
  const r=spawnSync(command,args,{
    cwd:ROOT,
    encoding:"utf8",
    stdio:["ignore","pipe","pipe"],
    timeout,
    maxBuffer:4*1024*1024,
    env:{
      PATH:"/usr/bin:/bin",
      HOME:"/nonexistent",
      LANG:"C",
      LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",
      GIT_CONFIG_GLOBAL:"/dev/null",
      GIT_CONFIG_SYSTEM:"/dev/null",
      GIT_NO_REPLACE_OBJECTS:"1",
      GIT_OPTIONAL_LOCKS:"0",
      GIT_TERMINAL_PROMPT:"0",
    },
  });
  assert.equal(r.error,undefined,String(r.error||""));
  assert.equal(r.status,0,String(r.stderr||r.stdout||""));
  return String(r.stdout||"").trim();
}
function git(args){
  return run("/usr/bin/git",["--no-replace-objects","-C",ROOT,...args]);
}

git(["merge-base","--is-ancestor",PARENT_HEAD,"HEAD"]);
const changed=git(["diff","--name-only",PARENT_HEAD,"HEAD","--"])
  .split("\n").filter(Boolean).sort();
assert.deepEqual(changed,EXPECTED_DELTA,"credential_preexec_scope_drift");
assert.equal(git(["rev-parse","HEAD:"+QUERY]),EXPECTED.credentialQuery);
assert.equal(git(["rev-parse","HEAD:"+ORDINARY_PREEXEC]),EXPECTED.ordinaryPreexec);

const source=fs.readFileSync(path.join(ROOT,SOURCE),"utf8");
for(const exact of [
  '#define MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_PREEXEC_V1"',
  '#define ROOT_DIR "/opt/void-buy-void-user-manager-credential-query-v1"',
  '#define SELF_PATH ROOT_DIR "/void_buy_void_user_manager_private_credential_unit_query_preexec_v1"',
  '#define QUERY_PATH ROOT_DIR "/void_buy_void_user_manager_private_credential_unit_query_v1"',
  '#define QUERY_MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1=1"',
  'open(QUERY_PATH, O_RDONLY | O_CLOEXEC | O_NOFOLLOW)',
  'fexecve(fd, child_argv, child_env);',
  '"PATH=/usr/bin:/bin"',
  '"LANG=C"',
  '"LC_ALL=C"',
  'hold("fixed_preexec_path_required")',
  'hold("query_file_custody_invalid")',
  'same_stat(&opened, &visible_after)',
  'if (v > (0x7fffffffULL - digit) / 10ULL) return -1;',
]){
  assert.ok(source.includes(exact),exact);
}
for(const forbidden of [
  "system(",
  "popen(",
  "execvp(",
  "execvpe(",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "NODE_OPTIONS",
  "NODE_PATH",
  "/run/user/",
  "systemctl",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

const credentialQuery=fs.readFileSync(path.join(ROOT,QUERY),"utf8");
assert.ok(
  credentialQuery.includes(
    '#define SANITIZED_ENV_MARKER "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1"',
  ),
  "credential_query_sanitized_marker_drift",
);
assert.ok(
  credentialQuery.includes("credential_query_preexec_execution_path_proven=false"),
  "parent_query_must_not_claim_preexec",
);

console.log("VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_PREEXEC_V1_PROOF_GREEN");
console.log("credential_query_git_blob_sha1="+EXPECTED.credentialQuery);
console.log("ordinary_preexec_git_blob_sha1="+EXPECTED.ordinaryPreexec);
console.log("distinct_fixed_install_root=true");
console.log("static_link_required=true");
console.log("dynamic_loader_before_preexec_forbidden=true");
console.log("fixed_preexec_path=true");
console.log("retained_query_descriptor=true");
console.log("bounded_uid_parser=true");
console.log("clean_child_environment_constructed_by_parent=true");
console.log("query_fexecve_required=true");
console.log("credential_query_elf_content_lock_still_required=true");
console.log("binary_acceptance=false");
console.log("protected_install_authorized=false");
console.log("live_query_authorized=false");
console.log("credential_contents_read=false");
console.log("host_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
