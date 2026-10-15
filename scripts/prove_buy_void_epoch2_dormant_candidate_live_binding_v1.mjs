#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const BINDER=
  "ops/precision/void_buy_void_epoch2_dormant_candidate_live_binding_v1.mjs";
const BINDER_BLOB="2686acdfbed5b3e2c929c896f032b01b94c89cef";
const OPERATOR_DOC=
  "docs/operators/buy-void-epoch2-dormant-candidate-live-binding-v1.md";
const OPERATOR_DOC_BLOB="916bfc05303c822f1032f315f7a2d2a02501a819";
const CHILD=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v1.mjs";
const CHILD_BLOB="28d718eb4155e47dbe8d476a4cf45f2d3871e4db";
const CANDIDATE=
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json";
const CANDIDATE_BLOB="2c861c021192c034c98404989cd25b26788cd0f0";
const CANDIDATE_PROOF=
  "scripts/prove_buy_void_payment_keyed_epoch2_dormant_candidate_v1.ts";
const CANDIDATE_PROOF_BLOB="0d9eb90c27031b9820a139be2af63c4c07433e20";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

for(const [relative,expected] of [
  [BINDER,BINDER_BLOB],
  [OPERATOR_DOC,OPERATOR_DOC_BLOB],
  [CHILD,CHILD_BLOB],
  [CANDIDATE,CANDIDATE_BLOB],
  [CANDIDATE_PROOF,CANDIDATE_PROOF_BLOB],
]){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,
    "blob_drift:"+relative);
}

const source=fs.readFileSync(path.join(ROOT,BINDER),"utf8");
const operatorDoc=fs.readFileSync(path.join(ROOT,OPERATOR_DOC),"utf8");
for(const required of [
  "GIT_NO_REPLACE_OBJECTS=1",
  "GIT_CONFIG_GLOBAL=/dev/null",
  "GIT_CONFIG_SYSTEM=/dev/null",
  "--no-replace-objects",
  "core.fsmonitor=false",
  "core.hooksPath=/dev/null",
  "branch --show-current",
  "status --porcelain=v1 --untracked-files=all",
  "binder_blob=",
  "2686acdfbed5b3e2c929c896f032b01b94c89cef",
  "cat-file blob",
]){
  assert.ok(operatorDoc.includes(required),"operator_launcher_contract:"+required);
}
assert.equal(
  operatorDoc.includes("head=$(/usr/bin/git rev-parse --verify HEAD)"),
  false,
  "unsanitized_operator_git_entry_forbidden",
);
for(const required of [
  'const CHILD_BLOB="28d718eb4155e47dbe8d476a4cf45f2d3871e4db"',
  'const CANDIDATE_BLOB="2c861c021192c034c98404989cd25b26788cd0f0"',
  'if(process.argv[1]!=="-")throw new Error("binder_git_object_stdin_required")',
  'const child=runChild(expectedHead);',
  'const candidate=loadCandidate(expectedHead);',
  'systemd_credential_identity_proven:true',
  'active_signing_capability_proven:true',
  'authenticated_credential_live_receipt:child',
  'signer_offchain_control_proven:false',
  'transaction_signing_proven:false',
  'customer_safe_to_pay:false',
  'production_host_evidence_authority:false',
  'next_action:NEXT_ACTION',
]){
  assert.ok(source.includes(required),required);
}
for(const forbidden of [
  "--receipt",
  "receipt-file",
  "readFileSync(process.argv",
  'from "../../',
  'from "../',
]){
  assert.equal(source.includes(forbidden),false,
    "arbitrary_or_worktree_input_forbidden:"+forbidden);
}
assert.equal((source.match(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/gu)||[]).length,0);

const childAt=source.indexOf("const child=runChild(expectedHead);");
const buildAt=source.indexOf("const receipt=buildBindingReceipt(expectedHead,candidate,child);");
assert.ok(childAt>0&&buildAt>childAt);

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
  "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V1_SELF_TEST_GREEN",
  "arbitrary_child_receipt_input_accepted=false",
  "exact_child_live_composition_required=true",
  "systemd_credential_identity_proven_on_bound_receipt=true",
  "active_signing_capability_proven_on_bound_receipt=true",
  "full_public_child_receipt_retained=true",
  "launch_operator_signer_control_still_required=true",
  "customer_safe_to_pay=false",
  "transaction=false",
  "public_presale_activation=false",
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
  "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V1",
  "mode=plan",
  "git_object_stdin_required_for_live=true",
  "root_required_for_run=true",
  "exact_child_live_composition_required=true",
  "arbitrary_child_receipt_input_accepted=false",
  "exact_dormant_candidate_git_object_required=true",
  "credential_content_access=false",
  "private_key_access=false",
  "nontransaction_signature=false",
  "transaction=false",
  "filesystem_write=false",
  "host_mutation=false",
  "service_mutation=false",
  "systemd_mutation=false",
  "payment_acceptance=false",
  "customer_safe_to_pay=false",
  "public_presale_activation=false",
  "wc_void_market_activation=false",
  "funds_movement=false",
  "production_host_evidence_authority=false",
  "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING",
]){
  assert.ok(planLines.has(line),line);
}

console.log("VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V1_PROOF_GREEN");
console.log("binder_git_object_entry_required=true");
console.log("arbitrary_child_receipt_input_accepted=false");
console.log("child_live_composition_git_object_required=true");
console.log("dormant_candidate_git_object_required=true");
console.log("systemd_credential_identity_promoted_only_from_live_child=true");
console.log("active_signing_capability_promoted_only_from_live_child=true");
console.log("launch_operator_signer_control_still_required=true");
console.log("customer_safe_to_pay=false");
console.log("transaction=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
