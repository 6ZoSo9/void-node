#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const RUNNER=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_signer_control_binding_v2.mjs";
const RUNNER_BLOB="5ff0fe527c4e66fce446a26dabb8abaf9b1a01d5";
const CHILD=
  "ops/precision/void_buy_void_epoch2_dormant_candidate_live_binding_v2.mjs";
const CHILD_BLOB="20105c8ff7ac35aac0f0f2fcbe8884ba441f5870";
const CANDIDATE=
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json";
const CANDIDATE_BLOB="6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1";
const CANDIDATE_PROOF=
  "scripts/prove_buy_void_payment_keyed_epoch2_dormant_candidate_v2.mjs";
const CANDIDATE_PROOF_BLOB="863ea6fcef568314e43ea8994bf495e126b5a434";
const EVIDENCE=
  "ops/mainnet0/evidence/buy-void-epoch2-signer-control-public-evidence-v1.json";
const EVIDENCE_BLOB="361aea8767f8b049fafd28663b71b177f38f180d";
const EVIDENCE_TOOL=
  "tools/void-buy-void-epoch2-signer-control-public-evidence-v1.mjs";
const EVIDENCE_TOOL_BLOB="d0f3c575903a44b9a538f0201257584545077be9";
const EVIDENCE_PROOF=
  "scripts/prove_buy_void_epoch2_signer_control_public_evidence_v1.mjs";
const EVIDENCE_PROOF_BLOB="8b34c9c43e28122d7509febfb8f5ab9a001a1b43";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

for(const [relative,expected] of [
  [RUNNER,RUNNER_BLOB],
  [CHILD,CHILD_BLOB],
  [CANDIDATE,CANDIDATE_BLOB],
  [CANDIDATE_PROOF,CANDIDATE_PROOF_BLOB],
  [EVIDENCE,EVIDENCE_BLOB],
  [EVIDENCE_TOOL,EVIDENCE_TOOL_BLOB],
  [EVIDENCE_PROOF,EVIDENCE_PROOF_BLOB],
]){
  assert.equal(
    gitBlob(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    "blob_drift:"+relative,
  );
}

const source=fs.readFileSync(path.join(ROOT,RUNNER),"utf8");

for(const required of [
  'const CHILD_BLOB="20105c8ff7ac35aac0f0f2fcbe8884ba441f5870"',
  'const CANDIDATE_V2_BLOB="6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1"',
  'const SIGNER_EVIDENCE_BLOB="361aea8767f8b049fafd28663b71b177f38f180d"',
  'const SIGNER_TOOL_BLOB="d0f3c575903a44b9a538f0201257584545077be9"',
  'const SIGNER_PROOF_BLOB="8b34c9c43e28122d7509febfb8f5ab9a001a1b43"',
  'if(process.argv[1]!=="-")throw new Error("runner_git_object_stdin_required")',
  'const child=runChild(expectedHead);',
  'const {candidate,evidence}=loadStaticEvidence(expectedHead);',
  'requireExactCheckout(expectedHead);',
  'signer_offchain_control_proven:true',
  'launch_operator_signer_control_evidence_bound:true',
  'systemd_credential_identity_proven:true',
  'active_signing_capability_proven:true',
  'current_system_credential_matches_immutable_fulfiller:true',
  'privileged_first_entry_authenticated:child.privileged_first_entry_authenticated',
  'native_preentry_policy_bound:child.native_preentry_policy_bound',
  'root_node_descriptor_execution_bound:child.root_node_descriptor_execution_bound',
  'runner_retained_descriptor_bound:child.runner_retained_descriptor_bound',
  'stdin_javascript_source_forbidden:child.stdin_javascript_source_forbidden',
  'runtime_uid_required_for_live_binding',
  'runner_root_execution_forbidden:true',
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
  assert.equal(
    source.includes(forbidden),
    false,
    "arbitrary_or_worktree_input_forbidden:"+forbidden,
  );
}

const liveAt=source.indexOf("function live(expectedHead,confirm)");
const childAt=source.indexOf("const child=runChild(expectedHead);",liveAt);
const firstCloseAt=source.indexOf("requireExactCheckout(expectedHead);",childAt);
const staticAt=source.indexOf(
  "const {candidate,evidence}=loadStaticEvidence(expectedHead);",
  childAt,
);
const secondCloseAt=source.indexOf(
  "requireExactCheckout(expectedHead);",
  firstCloseAt+1,
);
const receiptAt=source.indexOf(
  "const receipt=buildReceipt(expectedHead,child,candidate,evidence);",
  liveAt,
);
assert.ok(
  liveAt>0&&childAt>liveAt&&firstCloseAt>childAt&&
  staticAt>firstCloseAt&&secondCloseAt>staticAt&&receiptAt>secondCloseAt,
);

const self=spawnSync(process.execPath,[
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
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V2_SELF_TEST_GREEN",
  "arbitrary_credential_binding_receipt_input_accepted=false",
  "accepted_signer_control_evidence_bound=true",
  "candidate_lineage_crosscheck=true",
  "signer_offchain_control_proven_on_combined_receipt=true",
  "systemd_credential_identity_proven_on_combined_receipt=true",
  "active_signing_capability_proven_on_combined_receipt=true",
  "transaction_signing_proven=false",
  "customer_safe_to_pay=false",
  "transaction=false",
  "payment_acceptance=false",
  "public_presale_activation=false",
  "funds_movement=false",
]){
  assert.ok(selfLines.has(line),line);
}

const plan=spawnSync(process.execPath,[
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
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V2",
  "mode=plan",
  "git_object_stdin_required_for_live=true",
  "runtime_uid_required_for_run=true",
  "runner_root_execution_forbidden=true",
  "protected_v2_binder_child_required=true",
  "exact_authenticated_credential_binding_child_required=true",
  "arbitrary_credential_binding_receipt_input_accepted=false",
  "accepted_signer_control_candidate_git_object_required=true",
  "accepted_signer_control_public_evidence_git_object_required=true",
  "accepted_signer_control_tool_and_proofs_pinned=true",
  "closing_checkout_revalidation_required=true",
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
  "next_action=SEPARATELY_AUTHORIZE_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING",
]){
  assert.ok(planLines.has(line),line);
}

const direct=spawnSync(process.execPath,[path.join(ROOT,RUNNER),"--plan"],{
  cwd:ROOT,
  encoding:"utf8",
  env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
  timeout:30_000,
  maxBuffer:1024*1024,
});
assert.equal(direct.status,2);
assert.match(direct.stderr,/runner_git_object_stdin_required/u);

console.log("VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_SIGNER_CONTROL_BINDING_V2_PROOF_GREEN");
console.log("runner_git_object_entry_required=true");
console.log("runner_unprivileged=true");
console.log("runner_root_execution_forbidden=true");
console.log("protected_v2_binder_child_required=true");
console.log("protected_first_entry_provenance_required=true");
console.log("arbitrary_credential_binding_receipt_input_accepted=false");
console.log("exact_credential_binding_child_required=true");
console.log("accepted_signer_control_candidate_bound=true");
console.log("accepted_signer_control_evidence_bound=true");
console.log("accepted_signer_control_tool_and_proofs_pinned=true");
console.log("candidate_lineage_crosscheck=true");
console.log("closing_checkout_revalidation_before_receipt=true");
console.log("signer_offchain_control_proven_on_combined_receipt=true");
console.log("systemd_credential_identity_proven_on_combined_receipt=true");
console.log("active_signing_capability_proven_on_combined_receipt=true");
console.log("transaction_signing_proven=false");
console.log("customer_safe_to_pay=false");
console.log("transaction=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
