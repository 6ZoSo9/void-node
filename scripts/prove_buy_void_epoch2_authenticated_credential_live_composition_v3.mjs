#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const RUNNER=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs";
const RUNNER_BLOB="1c50670de25e48258a13a6791a751c416ccfe12b";
const QUALIFIER=
  "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py";
const QUALIFIER_BLOB="1f582ab69d31a7f80518fe5c366c2d5036b02c3d";
const SEALED="scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs";
const SEALED_BLOB="14cbe81e27d04fee77cbe75225ce308bf8561a7b";

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
  assert.equal(
    gitBlob(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    "blob_drift:"+relative
  );
}

const source=fs.readFileSync(path.join(ROOT,RUNNER),"utf8");

for(const required of [
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V3",
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3",
  "AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3_GREEN",
  "DERIVE_AND_ACCEPT_EPOCH2_LIVE_COMPOSITION_V3_NATIVE_PREENTRY",
  "BIND_V3R_AUTHENTICATED_EPOCH2_CREDENTIAL_EVIDENCE_IN_DORMANT_CANDIDATE_SUCCESSOR",
  "void_buy_void_user_manager_credential_query_installed_qualification_v3r.py",
  "1f582ab69d31a7f80518fe5c366c2d5036b02c3d",
  "voidbuyumqcredelflock3r_8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34",
  "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V3R",
  "BIND_V3R_AUTHENTICATED_CREDENTIAL_METADATA_IN_EPOCH2_LIVE_COMPOSITION_SUCCESSOR",
  "/opt/void-buy-void-epoch2-live-composition-v3",
  "void_buy_void_epoch2_live_composition_native_preentry_v3",
  "void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs",
  "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3",
  "VOID_BUY_VOID_EPOCH2_NATIVE_PARENT_PROOF_V3",
  "credential_v3r_generation_verified:true",
  "credential_v1_predecessor_verified:true",
  "credential_v2_predecessor_verified:true",
  "complete_dropin_set_hash_stable:true",
  "complete_credential_set_hash_stable:true",
  "credential_complete_dropin_set_sha256",
  "credential_complete_credential_set_sha256",
  "complete_dropin_set_bound_across_signing_window:true",
  "complete_credential_set_bound_across_signing_window:true",
  "qualification_shape_invalid",
  "qualification_complete_set_hash_invalid",
  "qualification_capability_binding_invalid",
  "future_v3_native_preentry_required_for_live=true",
  "protected_native_entry_accepted_by_this_pr=false",
  "protected_native_entry_install_authorized=false",
  "live_execution_authorized=false",
]){
  assert.ok(source.includes(required),required);
}

for(const forbidden of [
  "void_buy_void_user_manager_credential_query_installed_qualification_v1.py",
  "voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c",
  "/opt/void-buy-void-epoch2-live-composition-v2",
  "void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs",
  "VOID_BUY_VOID_EPOCH2_NATIVE_PARENT_PROOF_V1",
]){
  assert.equal(source.includes(forbidden),false,"historical_generation_forbidden:"+forbidden);
}

const validateAt=source.indexOf("function validateQualification(q){");
const sequenceAt=source.indexOf("function runSensitiveSequence({");
const liveAt=source.indexOf("function live(expectedHead,confirm){");
assert.ok(validateAt>0&&sequenceAt>validateAt&&liveAt>sequenceAt);
const openingCheckout=source.indexOf("checkoutFn(expectedHead);",sequenceAt);
const beforeAt=source.indexOf("const before=qualificationFn(expectedHead);",sequenceAt);
const sealedAt=source.indexOf("const sealedRecord=sealedFn(expectedHead);",sequenceAt);
const afterAt=source.indexOf("const after=qualificationFn(expectedHead);",sequenceAt);
const stableAt=source.indexOf("qualification_changed_across_sealed_probe",sequenceAt);
const crossAt=source.indexOf("crossFn(sealedRecord,before);",sequenceAt);
const closingCheckout=source.indexOf("checkoutFn(expectedHead);",crossAt);
assert.ok(
  openingCheckout>sequenceAt&&
  openingCheckout<beforeAt&&
  beforeAt<sealedAt&&
  sealedAt<afterAt&&
  afterAt<stableAt&&
  stableAt<crossAt&&
  crossAt<closingCheckout
);
assert.ok(
  source.indexOf("const nativeProof=requireNativePreentry(expectedHead);",liveAt)>liveAt
);
assert.ok(
  source.indexOf("revalidateNativePreentry(nativeProof,expectedHead);",liveAt)>liveAt
);

const env={PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"};

const self=spawnSync(process.execPath,[path.join(ROOT,RUNNER),"--self-test"],{
  cwd:ROOT,
  encoding:"utf8",
  env,
  timeout:30_000,
  maxBuffer:1024*1024,
});
assert.equal(self.status,0,String(self.stderr||self.stdout));
assert.equal(self.stderr,"");
const selfLines=new Set(self.stdout.split("\n").filter(Boolean));
for(const line of [
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V3_SELF_TEST_GREEN",
  "native_preentry_required_for_live=true",
  "native_parent_retained_for_child_lifetime=true",
  "native_parent_process_generation_bound=true",
  "native_parent_installed_generation_bound=true",
  "native_parent_revalidated_after_sensitive_sequence=true",
  "qualification_parser_closed=true",
  "receipt_content_addressed=true",
  "final_checkout_revalidation_required=true",
  "late_source_drift_blocks_receipt=true",
  "runner_parent_credential_content_access=false",
  "sealed_child_credential_content_access=true",
  "nontransaction_signature_only=true",
  "transaction=false",
  "funds_movement=false",
]){
  assert.ok(selfLines.has(line),line);
}

const plan=spawnSync(process.execPath,[path.join(ROOT,RUNNER),"--plan"],{
  cwd:ROOT,
  encoding:"utf8",
  env,
  timeout:30_000,
  maxBuffer:1024*1024,
});
assert.equal(plan.status,0,String(plan.stderr||plan.stdout));
assert.equal(plan.stderr,"");
const planLines=new Set(plan.stdout.split("\n").filter(Boolean));
for(const line of [
  "VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V3",
  "mode=plan",
  "source_generation=v3r_credential_composition",
  "protected_native_entry_accepted_by_this_pr=false",
  "protected_native_entry_install_authorized=false",
  "live_execution_authorized=false",
  "future_v3_native_preentry_required_for_live=true",
  "credential_v3r_v6_qualification_required=true",
  "complete_dropin_set_hash_binding_required=true",
  "complete_credential_set_hash_binding_required=true",
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
  "next_action=DERIVE_AND_ACCEPT_EPOCH2_LIVE_COMPOSITION_V3_NATIVE_PREENTRY",
]){
  assert.ok(planLines.has(line),line);
}

console.log("VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V3_PROOF_GREEN");
console.log("v3r_credential_qualifier_bound=true");
console.log("complete_dropin_set_hash_bound=true");
console.log("complete_credential_set_hash_bound=true");
console.log("exact_qualification_shape_required=true");
console.log("v3_fixed_native_preentry_path_separate=true");
console.log("v3_native_preentry_accepted_by_this_pr=false");
console.log("v3_native_preentry_install_authorized=false");
console.log("live_execution_authorized=false");
console.log("future_native_parent_proof_required=true");
console.log("runner_parent_credential_content_access=false");
console.log("sealed_child_nontransaction_signing_only=true");
console.log("transaction=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
