#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const RUNNER=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v1.mjs";
const RUNNER_BLOB="a50b759809198c666a7a3ba52a1cb495c8fda176";
const QUALIFIER=
  "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v1.py";
const QUALIFIER_BLOB="8dc5d53dfcc52c261a3da0ee692f3a4fcc0bfc4c";
const SEALED=
  "scripts/void_buy_void_epoch2_credential_attestation_sealed_v1.mjs";
const SEALED_BLOB="bb58ec88472b724e23aeccf65f44f4582c4a1440";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

for(const [relative,expected] of [
  [RUNNER,RUNNER_BLOB],
  [QUALIFIER,QUALIFIER_BLOB],
  [SEALED,SEALED_BLOB],
]){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,
    "blob_drift:"+relative);
}

const source=fs.readFileSync(path.join(ROOT,RUNNER),"utf8");
for(const required of [
  'const ROOT="/home/zoso/dev/void-node"',
  'const SETPRIV="/usr/bin/setpriv"',
  '"--no-new-privs"',
  '"--reuid="+String(RUNTIME_UID)',
  '"--regid="+String(RUNTIME_GID)',
  '"--clear-groups"',
  'if(process.argv[1]!=="-")throw new Error("runner_git_object_stdin_required")',
  'gitObject(expectedHead,QUALIFIER_REL,QUALIFIER_BLOB)',
  'gitObject(expectedHead,SEALED_REL,SEALED_BLOB)',
  'const before=runQualification(expectedHead);',
  'const sealedRecord=runSealedProbe(expectedHead);',
  'const after=runQualification(expectedHead);',
  'qualification_changed_across_sealed_probe',
  'main_pid_crosscheck_failed',
  'loadcredential_binding_crosscheck_failed',
  'service_cgroup_hash_crosscheck_failed',
  'credential_content_access_in_runner_parent:false',
  'credential_content_access_in_sealed_child:true',
  'private_key_output:false',
  'nontransaction_signature_performed:true',
  'transaction_constructed:false',
  'production_host_evidence_authority:false',
]){
  assert.ok(source.includes(required),required);
}

for(const forbidden of [
  'from "../../tools/',
  'from "../tools/',
  'require("../../',
  'import("../../',
  'spawnSync(PYTHON,["-I","-B",QUALIFIER',
]){
  assert.equal(source.includes(forbidden),false,
    "root_worktree_dependency_forbidden:"+forbidden);
}

const beforeAt=source.indexOf("const before=runQualification(expectedHead);");
const sealedAt=source.indexOf("const sealedRecord=runSealedProbe(expectedHead);");
const afterAt=source.indexOf("const after=runQualification(expectedHead);");
const stableAt=source.indexOf("qualification_changed_across_sealed_probe");
const crossAt=source.indexOf("crossCheck(sealedRecord,before);");
assert.ok(beforeAt>0&&beforeAt<sealedAt&&sealedAt<afterAt&&
  afterAt<stableAt&&stableAt<crossAt);

const self=spawnSync("/usr/bin/node",[
  "--input-type=module","-","--self-test",
],{
  cwd:ROOT,
  input:source,
  encoding:"utf8",
  env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
  timeout:30_000,
  maxBuffer:1024*1024,
});
assert.equal(self.status,0,String(self.stderr||self.stdout));
const selfLines=new Set(self.stdout.split("\n").filter(Boolean));
for(const line of [
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V1_SELF_TEST_GREEN",
  "git_object_stdin_required_for_live=true",
  "qualification_parser_closed=true",
  "receipt_content_addressed=true",
  "runner_parent_credential_content_access=false",
  "sealed_child_credential_content_access=true",
  "nontransaction_signature_only=true",
  "transaction=false",
  "funds_movement=false",
]){
  assert.ok(selfLines.has(line),line);
}

const plan=spawnSync("/usr/bin/node",[
  "--input-type=module","-","--plan",
],{
  cwd:ROOT,
  input:source,
  encoding:"utf8",
  env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
  timeout:30_000,
  maxBuffer:1024*1024,
});
assert.equal(plan.status,0,String(plan.stderr||plan.stdout));
const planLines=new Set(plan.stdout.split("\n").filter(Boolean));
for(const line of [
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V1",
  "mode=plan",
  "git_object_stdin_required_for_live=true",
  "root_required_for_run=true",
  "credential_v6_qualification_required=true",
  "qualification_before_after_sealed_probe_required=true",
  "sealed_git_object_probe_required=true",
  "sealed_probe_runs_as_runtime_uid=true",
  "credential_content_access=false",
  "private_key_access=false",
  "nontransaction_signature=false",
  "transaction=false",
  "rpc_call=false",
  "filesystem_write=false",
  "host_mutation=false",
  "service_mutation=false",
  "systemd_mutation=false",
  "payment_acceptance=false",
  "public_presale_activation=false",
  "wc_void_market_activation=false",
  "funds_movement=false",
  "production_host_evidence_authority=false",
  "next_action=SEPARATELY_AUTHORIZE_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION",
]){
  assert.ok(planLines.has(line),line);
}

console.log("VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V1_PROOF_GREEN");
console.log("root_git_object_entry_required=true");
console.log("root_repository_module_imports=false");
console.log("qualifier_exact_git_object_executed=true");
console.log("qualifier_worktree_execution=false");
console.log("qualifier_before_after_sealed_probe=true");
console.log("sealed_probe_exact_git_object_executed=true");
console.log("sealed_probe_runtime_uid_drop_required=true");
console.log("supplementary_groups_cleared=true");
console.log("no_new_privileges_child=true");
console.log("runner_parent_credential_content_access=false");
console.log("sealed_child_credential_content_access=true");
console.log("nontransaction_signature_only=true");
console.log("transaction=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
