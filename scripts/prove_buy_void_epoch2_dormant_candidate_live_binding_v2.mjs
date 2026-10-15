#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const BINDER=
  "ops/precision/void_buy_void_epoch2_dormant_candidate_live_binding_v2.mjs";
const BINDER_BLOB="ed6e3400dcdaa157c13fafdae15ffe71248b64e7";
const CHILD=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs";
const CHILD_BLOB="8ab77a4f0782f228171a2895641a56cb37c5659e";
const NATIVE=
  "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c";
const NATIVE_BLOB="4aa091e7835b32aa5c4e7b8e4059651c69a64eb3";
const CANDIDATE=
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json";
const CANDIDATE_BLOB="2c861c021192c034c98404989cd25b26788cd0f0";
const GIT="/usr/bin/git";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

for(const [relative,expected] of [
  [BINDER,BINDER_BLOB],
  [CHILD,CHILD_BLOB],
  [NATIVE,NATIVE_BLOB],
  [CANDIDATE,CANDIDATE_BLOB],
]){
  assert.equal(
    gitBlob(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    "blob_drift:"+relative,
  );
}

const source=fs.readFileSync(path.join(ROOT,BINDER),"utf8");

for(const required of [
  'VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V2',
  'RUN_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V2',
  'ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs',
  '8ab77a4f0782f228171a2895641a56cb37c5659e',
  'ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c',
  '4aa091e7835b32aa5c4e7b8e4059651c69a64eb3',
  '/opt/void-buy-void-epoch2-live-composition-v2/void_buy_void_epoch2_live_composition_native_preentry_v1',
  'const SUDO="/usr/bin/sudo"',
  'const DEVNULL="/dev/null"',
  'nullFd=fs.openSync(DEVNULL,"r")',
  'stdio:[nullFd,"pipe","pipe"]',
  '"-n",',
  'NATIVE_FIXED,',
  'runtime_uid_required_for_live_binding',
  'binder_git_object_stdin_required',
  'privileged_first_entry_authenticated:true',
  'native_preentry_policy_bound:true',
  'root_node_descriptor_execution_bound:true',
  'runner_retained_descriptor_bound:true',
  'native_parent_retained_for_child_lifetime:true',
  'native_parent_process_generation_bound:true',
  'native_parent_installed_generation_bound:true',
  'native_parent_revalidated_after_sensitive_sequence:true',
  'stdin_javascript_source_forbidden:true',
  'credential_generation_retained_through_signing:true',
  'credential_generation_revalidated_after_final_observation:true',
  'credential_generation_revalidated_immediately_before_close:true',
  'voide2livecomp2_',
  'voide2candbind2_',
  'checkout_revalidated_after_child:true',
  'customer_safe_to_pay:false',
  'transaction_signing_proven:false',
  'public_presale_activation:false',
  'wc_void_market_activation:false',
  'funds_movement:false',
]){
  assert.equal(source.includes(required),true,"missing:"+required);
}

for(const forbidden of [
  'spawnSync(NODE,[',
  '"--input-type=module",',
  'root_required_for_live_binding',
  'const SETPRIV=',
  'voide2livecomp1_',
  'voide2candbind1_',
  '--receipt',
  'receipt-file',
]){
  assert.equal(source.includes(forbidden),false,"forbidden:"+forbidden);
}

const nativeSourceAt=source.indexOf(
  "const nativeSource=gitObject(expectedHead,NATIVE_REL,NATIVE_BLOB);",
);
const devnullAt=source.indexOf('nullFd=fs.openSync(DEVNULL,"r");');
const sudoAt=source.indexOf("r=spawnSync(SUDO,[");
const closingCheckoutAt=source.indexOf(
  "requireExactCheckout(expectedHead);",
  source.indexOf("const child=runChild(expectedHead);"),
);
const buildAt=source.indexOf(
  "const receipt=buildBindingReceipt(expectedHead,candidate,child);",
);
assert.ok(nativeSourceAt>0);
assert.ok(devnullAt>nativeSourceAt);
assert.ok(sudoAt>devnullAt);
assert.ok(closingCheckoutAt>sudoAt);
assert.ok(buildAt>closingCheckoutAt);

function runStdin(arg){
  return spawnSync(process.execPath,[
    "--input-type=module","-",arg,
  ],{
    cwd:ROOT,
    input:source,
    encoding:"utf8",
    env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
    timeout:30_000,
    maxBuffer:1024*1024,
  });
}

const self=runStdin("--self-test");
assert.equal(self.status,0,String(self.stderr||self.stdout));
const selfLines=new Set(self.stdout.split("\n").filter(Boolean));
for(const line of [
  "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V2_SELF_TEST_GREEN",
  "arbitrary_child_receipt_input_accepted=false",
  "exact_child_live_composition_required=true",
  "systemd_credential_identity_proven_on_bound_receipt=true",
  "active_signing_capability_proven_on_bound_receipt=true",
  "full_public_child_receipt_retained=true",
  "closing_checkout_revalidation_before_receipt=true",
  "accepted_signer_control_evidence_binding_still_required=true",
  "customer_safe_to_pay=false",
  "transaction=false",
  "public_presale_activation=false",
  "funds_movement=false",
]){
  assert.equal(selfLines.has(line),true,line);
}

const plan=runStdin("--plan");
assert.equal(plan.status,0,String(plan.stderr||plan.stdout));
const planLines=new Set(plan.stdout.split("\n").filter(Boolean));
for(const line of [
  "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V2",
  "mode=plan",
  "git_object_stdin_required_for_live=true",
  "runtime_uid_required_for_run=true",
  "binder_root_execution_forbidden=true",
  "exact_native_preentry_child_required=true",
  "sudo_cached_or_nopasswd_required=true",
  "child_stdin_devnull_required=true",
  "exact_child_live_composition_required=true",
  "arbitrary_child_receipt_input_accepted=false",
  "credential_content_access=false",
  "private_key_access=false",
  "transaction=false",
  "payment_acceptance=false",
  "customer_safe_to_pay=false",
  "public_presale_activation=false",
  "wc_void_market_activation=false",
  "funds_movement=false",
  "production_host_evidence_authority=false",
]){
  assert.equal(planLines.has(line),true,line);
}

const direct=spawnSync(process.execPath,[path.join(ROOT,BINDER),"--plan"],{
  cwd:ROOT,
  encoding:"utf8",
  env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
  timeout:30_000,
  maxBuffer:1024*1024,
});
assert.equal(direct.status,2);
assert.match(direct.stderr,/binder_git_object_stdin_required/u);

console.log("VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V2_PROOF_GREEN");
console.log("binder_unprivileged=true");
console.log("binder_root_execution_forbidden=true");
console.log("binder_git_object_entry_required=true");
console.log("arbitrary_child_receipt_input_accepted=false");
console.log("child_native_preentry_fixed_path_required=true");
console.log("child_stdin_devnull_required=true");
console.log("child_root_stdin_javascript_execution=false");
console.log("child_live_composition_v2_required=true");
console.log("sealed_v2_generation_retention_required=true");
console.log("surviving_native_parent_required=true");
console.log("native_parent_process_generation_required=true");
console.log("native_parent_installed_generation_required=true");
console.log("native_parent_closing_revalidation_required=true");
console.log("closing_checkout_revalidation_before_receipt=true");
console.log("systemd_credential_identity_promoted_only_from_protected_child=true");
console.log("active_signing_capability_promoted_only_from_protected_child=true");
console.log("accepted_signer_control_evidence_binding_still_required=true");
console.log("customer_safe_to_pay=false");
console.log("transaction=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
