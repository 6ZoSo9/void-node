#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

import {
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_AUTHORIZED_KEY_COMMAND_OPTION_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_AUTHORITY_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_V1,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_REVIEWED_SOURCE_ROOTS_V1,
  classifyVoidBuyVoidLegacyHistoryNimoAuthorizedKeyOptionsV1,
  planVoidBuyVoidLegacyHistoryNimoInstallV1,
} from "../tools/void-buy-legacy-request-history-nimo-install-plan-v1.mjs";

const PLAN="tools/void-buy-legacy-request-history-nimo-install-plan-v1.mjs";
const PROOF="scripts/prove_void_buy_legacy_request_history_nimo_install_plan_v1.mjs";
const DOC="docs/operators/buy-void-legacy-request-history-nimo-install-plan-v1.md";
const WORKFLOW=".github/workflows/buy-void-legacy-request-history-nimo-install-plan-v1.yml";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"){
    return "{"+Object.keys(value).sort()
      .map(key=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
  }
  throw new Error("noncanonical_test_value");
}

for(const file of [PLAN,PROOF,DOC,WORKFLOW]){
  assert.equal(fs.lstatSync(file).isFile(),true,file);
}

const planSource=fs.readFileSync(PLAN,"utf8");
assert.doesNotMatch(planSource,/node:fs|node:child_process|spawnSync|execFile|systemctl|\bssh\s/u);
assert.doesNotMatch(planSource,/BEGIN (?:OPENSSH |RSA |EC |)PRIVATE KEY|PRIVATE KEY-----/u);
assert.match(planSource,/source_only_installation_plan_no_mutation_mode/u);

const observed=[];
for(const expected of VOID_BUY_VOID_LEGACY_HISTORY_NIMO_REVIEWED_SOURCE_ROOTS_V1){
  const bytes=fs.readFileSync(expected.path);
  const actual=gitBlob(bytes);
  assert.equal(actual,expected.git_blob_sha1,expected.path);
  observed.push(Object.freeze({...expected,bytes:bytes.length}));
}
assert.equal(observed.length,19);
assert.equal(new Set(observed.map(x=>x.path)).size,observed.length);

const plan=planVoidBuyVoidLegacyHistoryNimoInstallV1();
assert.equal(plan.marker,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_V1);
assert.equal(plan.version,1);
assert.equal(plan.status,"HOLD_SOURCE_ONLY_INSTALLATION_PLAN");
assert.match(plan.plan_id,/^voidblrhnip1_[0-9a-f]{64}$/u);
assert.equal(plan.source_parent_main,"b912662c4fea95f9b2bff314e7f11003dd91672a");
assert.deepEqual(plan.reviewed_source_roots,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_REVIEWED_SOURCE_ROOTS_V1);
assert.equal(plan.reviewed_source_roots_are_complete_runtime_bundle,false);

assert.equal(
  plan.fixed_layout.handler_path,
  "/usr/local/libexec/void-legacy-history-witness-v1/void/void-buy-legacy-request-history-nimo-forced-command-v1.mjs",
);
assert.equal(
  plan.fixed_layout.config_path,
  "/etc/void/buy-void-legacy-history-external-witness-v1.json",
);
assert.equal(
  plan.fixed_layout.authority_root,
  "/var/lib/void-legacy-history-external-witness-v1",
);
assert.equal(
  plan.fixed_layout.authorized_keys_path,
  "/etc/ssh/authorized_keys/voidwitness",
);
assert.equal(plan.expected_execution_identity.username,"voidwitness");
assert.equal(plan.expected_execution_identity.uid,997);
assert.equal(plan.expected_execution_identity.gid,984);

assert.equal(plan.forced_command.command,VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1);
for(const required of [
  'test -z "$SSH_ORIGINAL_COMMAND" || exit 3',
  "exec /usr/bin/env -i",
  "PATH=/usr/bin:/bin",
  "HOME=/var/lib/voidwitness",
  "LANG=C",
  "LC_ALL=C",
  "VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_V1=1",
  'SSH_ORIGINAL_COMMAND="${SSH_ORIGINAL_COMMAND-}"',
  "/usr/bin/node",
  "/usr/local/libexec/void-legacy-history-witness-v1/void/void-buy-legacy-request-history-nimo-forced-command-v1.mjs",
  "--config=/etc/void/buy-void-legacy-history-external-witness-v1.json",
]){
  assert.equal(plan.forced_command.command.includes(required),true,required);
}
for(const forbidden of ["sudo ","ssh ","scp ","rsync ","/bin/bash","/bin/sh -c"]){
  assert.equal(plan.forced_command.command.includes(forbidden),false,forbidden);
}

assert.equal(plan.authorized_key.restrict_option_required,true);
assert.equal(plan.authorized_key.forced_command_option_required,true);
assert.equal(plan.authorized_key.forced_command_option_exact_encoding_required,true);
assert.equal(plan.authorized_key.forced_command_option_must_equal_selected_command,true);
assert.equal(plan.authorized_key.materialized_entry_command_option_required,true);
assert.equal(
  plan.authorized_key.materialized_entry_command_value_must_equal_forced_command_command,
  true,
);
assert.equal(plan.authorized_key.materialized_entry_restrict_only_sufficient,false);
assert.equal(
  plan.authorized_key.forced_command_value,
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1,
);
const independentlyEncodedCommandOption=
  'command="'+
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1
    .replaceAll("\\","\\\\")
    .replaceAll('"','\\"')+
  '"';
assert.equal(
  VOID_BUY_VOID_LEGACY_HISTORY_NIMO_AUTHORIZED_KEY_COMMAND_OPTION_V1,
  independentlyEncodedCommandOption,
);
assert.equal(
  plan.authorized_key.forced_command_option,
  independentlyEncodedCommandOption,
);

const exactAuthorizedKeyOptions=
  classifyVoidBuyVoidLegacyHistoryNimoAuthorizedKeyOptionsV1({
    restrict:true,
    command_option:independentlyEncodedCommandOption,
    options:["restrict",independentlyEncodedCommandOption],
  });
assert.equal(exactAuthorizedKeyOptions.ok,true);
assert.equal(exactAuthorizedKeyOptions.authorized_keys_mutation_authorized,false);

for(const [label,value,reason] of [
  [
    "missing_command",
    {
      restrict:true,
      options:["restrict",independentlyEncodedCommandOption],
    },
    "legacy_history_nimo_authorized_key_options_shape_invalid",
  ],
  [
    "missing_restrict",
    {
      command_option:independentlyEncodedCommandOption,
      options:["restrict",independentlyEncodedCommandOption],
    },
    "legacy_history_nimo_authorized_key_options_shape_invalid",
  ],
  [
    "restrict_false",
    {
      restrict:false,
      command_option:independentlyEncodedCommandOption,
      options:["restrict",independentlyEncodedCommandOption],
    },
    "legacy_history_nimo_authorized_key_restrict_required",
  ],
  [
    "different_encoding",
    {
      restrict:true,
      command_option:
        'command="'+VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1+'"',
      options:[
        "restrict",
        'command="'+VOID_BUY_VOID_LEGACY_HISTORY_NIMO_FORCED_COMMAND_LINE_V1+'"',
      ],
    },
    "legacy_history_nimo_authorized_key_command_option_mismatch",
  ],
  [
    "different_command",
    {
      restrict:true,
      command_option:'command="/usr/bin/false"',
      options:["restrict",'command="/usr/bin/false"'],
    },
    "legacy_history_nimo_authorized_key_command_option_mismatch",
  ],
  [
    "pty_reenabled",
    {
      restrict:true,
      command_option:independentlyEncodedCommandOption,
      options:["restrict","pty",independentlyEncodedCommandOption],
    },
    "legacy_history_nimo_authorized_key_exact_option_set_required",
  ],
  [
    "port_forwarding_reenabled",
    {
      restrict:true,
      command_option:independentlyEncodedCommandOption,
      options:["restrict","port-forwarding",independentlyEncodedCommandOption],
    },
    "legacy_history_nimo_authorized_key_exact_option_set_required",
  ],
  [
    "user_rc_reenabled",
    {
      restrict:true,
      command_option:independentlyEncodedCommandOption,
      options:["restrict","user-rc",independentlyEncodedCommandOption],
    },
    "legacy_history_nimo_authorized_key_exact_option_set_required",
  ],
  [
    "x11_forwarding_reenabled",
    {
      restrict:true,
      command_option:independentlyEncodedCommandOption,
      options:["restrict","X11-forwarding",independentlyEncodedCommandOption],
    },
    "legacy_history_nimo_authorized_key_exact_option_set_required",
  ],
  [
    "reordered_options",
    {
      restrict:true,
      command_option:independentlyEncodedCommandOption,
      options:[independentlyEncodedCommandOption,"restrict"],
    },
    "legacy_history_nimo_authorized_key_exact_option_set_required",
  ],
  [
    "duplicate_restrict",
    {
      restrict:true,
      command_option:independentlyEncodedCommandOption,
      options:["restrict","restrict",independentlyEncodedCommandOption],
    },
    "legacy_history_nimo_authorized_key_exact_option_set_required",
  ],
  [
    "third_option_forbidden",
    {
      restrict:true,
      command_option:independentlyEncodedCommandOption,
      options:["restrict",independentlyEncodedCommandOption,"no-pty"],
    },
    "legacy_history_nimo_authorized_key_exact_option_set_required",
  ],
]){
  const held=classifyVoidBuyVoidLegacyHistoryNimoAuthorizedKeyOptionsV1(value);
  assert.equal(held.ok,false,label);
  assert.equal(held.status,"HOLD",label);
  assert.equal(held.reason,reason,label);
  assert.equal(held.exact_line_materialized,false,label);
  assert.equal(held.authorized_keys_mutation_authorized,false,label);
}

assert.equal(plan.authorized_key.options_exact_order_required,true);
assert.equal(plan.authorized_key.additional_options_forbidden,true);
assert.deepEqual(
  plan.authorized_key.exact_options,
  ["restrict",independentlyEncodedCommandOption],
);
assert.equal(
  plan.authorized_key.exact_option_prefix,
  "restrict,"+independentlyEncodedCommandOption,
);
assert.equal(plan.authorized_key.dedicated_ed25519_client_key_required,true);
assert.equal(plan.authorized_key.public_key_blob_selected,false);
assert.equal(plan.authorized_key.public_key_fingerprint_selected,false);
assert.equal(plan.authorized_key.exact_line_materialized,false);
assert.equal(plan.authorized_key.existing_reviewed_entries_preserved_required,true);
assert.equal(plan.authorized_key.reviewed_additive_successor_required,true);
assert.equal(plan.authorized_key.replacement_of_existing_file_forbidden,true);

assert.equal(plan.runtime_bundle.deterministic_bundle_candidate_required,true);
assert.equal(plan.runtime_bundle.exact_transitive_runtime_closure_required,true);
assert.equal(plan.runtime_bundle.runtime_bundle_candidate_accepted,false);
assert.equal(plan.runtime_bundle.complete_transitive_runtime_closure_bound,false);
assert.equal(plan.runtime_bundle.installed_runtime_bytes_selected,false);

for(const value of Object.values(plan.host_preflight)){
  assert.equal(value,false);
}
for(const [key,value] of Object.entries(VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_AUTHORITY_V1)){
  if([
    "source_only_installation_plan",
    "exact_reviewed_source_generation_bound",
    "fixed_installation_layout_selected",
    "exact_forced_command_selected",
    "authorized_key_exact_forced_command_option_required",
    "authorized_key_exact_option_set_required",
    "materialized_authorized_key_command_binding_required",
    "dedicated_client_public_key_required",
    "additive_authorized_keys_successor_required",
    "existing_authorized_keys_generation_preservation_required",
    "runtime_bundle_candidate_required",
  ].includes(key)){
    assert.equal(value,true,key);
  }else{
    assert.equal(value,false,key);
  }
}

const planRun=spawnSync(process.execPath,[PLAN,"--plan"],{
  encoding:"utf8",env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
});
assert.equal(planRun.status,0,planRun.stderr);
assert.equal(planRun.stderr,"");
assert.deepEqual(JSON.parse(planRun.stdout),plan);
assert.equal(planRun.stdout,canonical(plan)+"\n");

const self=spawnSync(process.execPath,[PLAN,"--self-test"],{
  encoding:"utf8",env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
});
assert.equal(self.status,0,self.stderr);
for(const line of [
  "VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_V1_SELF_TEST_GREEN",
  "source_only_installation_plan=true",
  "runtime_bundle_candidate_accepted=false",
  "authorized_key_exact_forced_command_option_required=true",
  "authorized_key_exact_option_set_required=true",
  "materialized_authorized_key_command_binding_required=true",
  "authorized_keys_additive_successor_required=true",
  "live_nimo_installed=false",
  "funds_movement=false",
]){
  assert.equal(self.stdout.split("\n").includes(line),true,line);
}

for(const mode of ["--apply","--install","--run","--write-authorized-keys"]){
  const held=spawnSync(process.execPath,[PLAN,mode],{
    encoding:"utf8",env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
  });
  assert.equal(held.status,2,mode);
  assert.equal(held.stdout,"",mode);
  assert.match(held.stderr,/HOLD=source_only_installation_plan_no_mutation_mode/u);
  assert.match(held.stderr,/live_nimo_installed=false/u);
  assert.match(held.stderr,/authorized_keys_mutation_authorized=false/u);
  assert.match(held.stderr,/funds_movement=false/u);
}

const workflow=fs.readFileSync(WORKFLOW,"utf8");
for(const relative of [
  PLAN,PROOF,DOC,WORKFLOW,
  ...VOID_BUY_VOID_LEGACY_HISTORY_NIMO_REVIEWED_SOURCE_ROOTS_V1.map(x=>x.path),
]){
  const escaped=relative.replace(/[.*+?^${}()|[\]\\]/gu,"\\$&");
  const hits=(workflow.match(new RegExp('"'+escaped+'"',"gu"))||[]).length;
  assert.equal(hits>=2,true,"workflow trigger closure missing: "+relative);
}
assert.match(workflow,/pull_request:/u);
assert.match(workflow,/push:\n\s+branches:\s+\[main\]/u);
assert.match(workflow,/workflow_dispatch:/u);
assert.match(workflow,/node:\s+\[22, 24, 26\]/u);
for(const required of [
  "PR_BASE_SHA:",
  "PUSH_BEFORE_SHA:",
  'BASE="$(git rev-parse "$HEAD^1")"',
  'git merge-base --is-ancestor "$BASE" "$HEAD"',
  'git diff --check "$BASE" "$HEAD"',
  'test -z "$(git status --porcelain=v1 --untracked-files=all)"',
]){
  assert.equal(workflow.includes(required),true,"committed diff guard missing: "+required);
}

console.log("VOID_BUY_VOID_LEGACY_HISTORY_NIMO_INSTALL_PLAN_V1_PROOF_GREEN");
console.log("reviewed_source_roots="+String(observed.length));
console.log("runtime_bundle_candidate_accepted=false");
console.log("committed_base_to_head_diff_hygiene_bound=true");
console.log("authorized_key_exact_forced_command_option_required=true");
console.log("authorized_key_exact_option_set_required=true");
console.log("materialized_authorized_key_command_binding_required=true");
console.log("restrict_only_materialized_entry_sufficient=false");
console.log("authorized_key_option_adversaries_rejected=true");
console.log("authorized_key_capability_reenable_options_rejected=true");
console.log("authorized_keys_additive_successor_required=true");
console.log("private_key_access=false");
console.log("live_nimo_installed=false");
console.log("external_transport_authenticated=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
