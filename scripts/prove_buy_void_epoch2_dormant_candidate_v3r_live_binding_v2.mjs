#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const BINDER=
  "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs";
const BINDER_BLOB="9c29eb4716077e459b9154f39d0f30cf2e56729f";
const CANDIDATE=
  "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v4.json";
const CANDIDATE_BLOB="e569c9211e01f14c7c00dd1c5041d4dfb0817609";
const QUALIFIER=
  "ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py";
const QUALIFIER_BLOB="a04c2e7665294cdd142426e9eb01ee27c5292b8d";
const RUNNER=
  "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs";
const RUNNER_BLOB="499df9b94b5b89354837570da0c7e47ec280025d";
const NATIVE_SOURCE=
  "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c";
const NATIVE_SOURCE_BLOB="5021727f1def1ec11f870d735cab65acc1701a5e";
const BINDER_PREENTRY=
  "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c";
const BINDER_PREENTRY_BLOB="09f3dd60393c289f7bfee83bea290dc58f37ce54";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of [
  [BINDER,BINDER_BLOB],
  [CANDIDATE,CANDIDATE_BLOB],
  [QUALIFIER,QUALIFIER_BLOB],
  [RUNNER,RUNNER_BLOB],
  [NATIVE_SOURCE,NATIVE_SOURCE_BLOB],
  [BINDER_PREENTRY,BINDER_PREENTRY_BLOB],
]){
  assert.equal(
    gitBlob(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    "blob_drift:"+relative
  );
}

const source=fs.readFileSync(path.join(ROOT,BINDER),"utf8");
for(const required of [
  "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V2",
  "RUN_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V2",
  "EPOCH2_SIGNER_CONTROL_AND_AUTHENTICATED_CREDENTIAL_PROVEN_REMAINING_GATES_HOLD",
  "QUALIFY_LIVE_EXACT_CHAIN_RECEIPT_AND_EITHER_ZERO_FEE_ENVELOPE_OR_PER_PAYMENT_NATIVE_GAS_FUNDING",
  "buy-void-payment-keyed-epoch2-dormant-candidate-v4.json",
  CANDIDATE_BLOB,
  "void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py",
  QUALIFIER_BLOB,
  '"/opt/void-buy-void-epoch2-live-composition-v3/"+',
  '"void_buy_void_epoch2_live_composition_native_preentry_v3"',
  "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3",
  "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V2",
  "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PARENT_PROOF_V2",
  "binder_native_parent_marker_required",
  "binder_preentry_parent_executable_mismatch",
  "binder_preentry_parent_child_generation_mismatch",
  "binder_preentry_parent_running_generation_mismatch",
  "binder_preentry_node_running_generation_mismatch",
  "binder_preentry_binder_generation_invalid",
  "native_binder_first_entry_required_for_live=true",
  "private_binder_parent_proof_required_for_live=true",
  "caller_stdin_alone_authority=false",
  "voide2livecomp3_",
  "voide2candbind3r2_",
  "stdinIgnore:true",
  "arbitrary_live_receipt_input_accepted=false",
  "candidate_v4_signer_control_preserved=true",
  "systemd_credential_identity_promoted_only_from_native_live_receipt=true",
  "active_signing_capability_promoted_only_from_native_live_receipt=true",
  "customer_safe_to_pay=false",
  "transaction=false",
  "public_presale_activation=false",
  "wc_void_market_activation=false",
  "funds_movement=false",
]){
  assert.ok(source.includes(required),required);
}
const nativeSource=fs.readFileSync(path.join(ROOT,BINDER_PREENTRY),"utf8");
for(const required of [
  "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V2",
  'BINDER_GIT_BLOB "9c29eb4716077e459b9154f39d0f30cf2e56729f"',
  "#define BINDER_BYTES 39391U",
  "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PARENT_PROOF_V2",
  "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V2_BINDER_FD=",
  "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V2_PROOF_FD=",
  "binder_preentry_caller_stdin_forbidden",
  "binder_preentry_binder_identity_mismatch",
  "binder_preentry_node_digest_mismatch",
  "binder_preentry_self_running_generation_mismatch",
  "require_devnull_stdin();",
  "fexecve(node_fd,next_argv,envp);",
  "stream_fd(binder_fd,source_pipe[1])",
]) assert.ok(nativeSource.includes(required),required);

for(const forbidden of [
  "--receipt",
  "--receipt-file",
  "RECEIPT_PATH",
  "process.env.RECEIPT",
  "readFileSync(process.stdin",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED:\"1\"",
  "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED:\"1\"",
]){
  assert.equal(source.includes(forbidden),false,"forbidden:"+forbidden);
}

const liveAt=source.indexOf("function live(expectedHead,confirm){");
const candidateAt=source.indexOf("const candidate=loadCandidate(expectedHead);",liveAt);
const beforeAt=source.indexOf("const before=runQualification(expectedHead);",liveAt);
const childAt=source.indexOf("const child=runNativeLive(expectedHead);",liveAt);
const afterAt=source.indexOf("const after=runQualification(expectedHead);",liveAt);
const stableAt=source.indexOf("installed_qualification_changed_across_live_composition",liveAt);
const closingAt=source.indexOf("requireExactCheckout(expectedHead);",afterAt);
const buildAt=source.indexOf("buildBindingReceipt(expectedHead,candidate,before,child)",closingAt);
assert.ok(
  liveAt>0&&candidateAt>liveAt&&beforeAt>candidateAt&&
  childAt>beforeAt&&afterAt>childAt&&stableAt>afterAt&&
  closingAt>stableAt&&buildAt>closingAt
);

const nativeAt=source.indexOf("function runNativeLive(expectedHead){");
const ignoreAt=source.indexOf("stdinIgnore:true",nativeAt);
const nativeCall=source.indexOf("const r=run(FIXED_NATIVE",nativeAt);
assert.ok(nativeAt>0&&nativeCall>nativeAt&&ignoreAt>nativeCall);

const env={PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"};
const self=spawnSync(process.execPath,[path.join(ROOT,BINDER),"--self-test"],{
  cwd:ROOT,encoding:"utf8",env,
  timeout:30_000,maxBuffer:2*1024*1024,
});
assert.equal(self.error,undefined,String(self.error?.message||""));
assert.equal(self.signal,null,String(self.signal||""));
assert.equal(self.status,0,String(self.stderr||self.stdout));
assert.equal(self.stderr,"");
const selfLines=new Set(self.stdout.split("\n").filter(Boolean));
for(const line of [
  "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V2_SELF_TEST_GREEN",
  "candidate_v4_signer_control_preserved=true",
  "v6r2_installed_qualification_required=true",
  "fixed_native_v3_live_composition_required=true",
  "arbitrary_live_receipt_input_accepted=false",
  "systemd_credential_identity_promoted_only_from_native_live_receipt=true",
  "active_signing_capability_promoted_only_from_native_live_receipt=true",
  "runtime_source_generation_bound=true",
  "remaining_gate_count=3",
  "customer_safe_to_pay=false",
  "transaction=false",
  "public_presale_activation=false",
  "wc_void_market_activation=false",
  "funds_movement=false",
]){
  assert.ok(selfLines.has(line),line);
}

const plan=spawnSync(process.execPath,[path.join(ROOT,BINDER),"--plan"],{
  cwd:ROOT,encoding:"utf8",env,
  timeout:30_000,maxBuffer:2*1024*1024,
});
assert.equal(plan.error,undefined,String(plan.error?.message||""));
assert.equal(plan.signal,null,String(plan.signal||""));
assert.equal(plan.status,0,String(plan.stderr||plan.stdout));
assert.equal(plan.stderr,"");
const planLines=new Set(plan.stdout.split("\n").filter(Boolean));
for(const line of [
  "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V2",
  "mode=plan",
  "native_binder_first_entry_required_for_live=true",
  "private_binder_parent_proof_required_for_live=true",
  "caller_stdin_alone_authority=false",
  "root_required_for_run=true",
  "exact_dormant_candidate_v4_git_object_required=true",
  "v6r2_installed_qualification_before_after_required=true",
  "fixed_native_v3_live_composition_required=true",
  "arbitrary_live_receipt_input_accepted=false",
  "signer_control_predecessor_evidence_required=true",
  "credential_content_access=false",
  "private_key_access=false",
  "signing=false",
  "transaction=false",
  "payment_acceptance=false",
  "customer_safe_to_pay=false",
  "public_presale_activation=false",
  "wc_void_market_activation=false",
  "funds_movement=false",
  "production_host_evidence_authority=false",
  "next_action=SEPARATELY_AUTHORIZE_EPOCH2_V3R_DORMANT_CANDIDATE_LIVE_BINDING",
]){
  assert.ok(planLines.has(line),line);
}

// Direct worktree invocation cannot become live authority.
const direct=spawnSync(process.execPath,[
  path.join(ROOT,BINDER),"--run","--confirm",
  "RUN_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V2",
  "--expected-head","a".repeat(40),
],{
  cwd:ROOT,encoding:"utf8",env,
  timeout:30_000,maxBuffer:2*1024*1024,
});
assert.equal(direct.status,2);
assert.match(direct.stderr,/binder_native_first_entry_required/u);

const directStdin=spawnSync(process.execPath,[
  "--input-type=module","-","--run","--confirm",
  "RUN_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V2",
  "--expected-head","a".repeat(40),
],{
  cwd:ROOT,input:source,encoding:"utf8",env,
  timeout:30_000,maxBuffer:2*1024*1024,
});
assert.equal(directStdin.status,2);
assert.match(directStdin.stderr,/binder_native_parent_marker_required/u);

const buildRoot=fs.mkdtempSync("/tmp/void-e2-dormant-binder-v2-preentry-");
try{
  const binary=path.join(buildRoot,"preentry");
  const cc=spawnSync("/usr/bin/cc",[
    "-std=c11","-O2","-Wall","-Wextra","-Werror",
    path.join(ROOT,BINDER_PREENTRY),"-o",binary,
  ],{
    cwd:ROOT,encoding:"utf8",env,
    timeout:30_000,maxBuffer:2*1024*1024,
  });
  assert.equal(cc.status,0,String(cc.stderr||cc.stdout));
  const nativeSelf=spawnSync(binary,["--self-test"],{
    cwd:ROOT,encoding:"utf8",env,
    timeout:30_000,maxBuffer:2*1024*1024,
  });
  assert.equal(nativeSelf.status,0,String(nativeSelf.stderr||nativeSelf.stdout));
  assert.equal(nativeSelf.stderr,"");
  const nativeLines=new Set(nativeSelf.stdout.split("\n").filter(Boolean));
  for(const line of [
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V2_SELF_TEST_GREEN",
    "native_first_instruction=true",
    "fixed_self_path=true",
    "fixed_binder_path=true",
    "binder_exact_sha256_bound=true",
    "binder_git_blob_provenance_bound=true",
    "node_policy_sha256_bound=true",
    "binder_descriptor_retained=true",
    "node_descriptor_fexecve=true",
    "private_parent_proof_channel=true",
    "caller_stdin_javascript_forbidden=true",
    "loader_environment_sanitized=true",
    "credential_content_access=false",
    "transaction=false",
    "public_presale_activation=false",
    "funds_movement=false",
  ]) assert.ok(nativeLines.has(line),line);
}finally{
  fs.rmSync(buildRoot,{recursive:true,force:true});
}

console.log("VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V2_PROOF_GREEN");
console.log("native_binder_first_entry_required=true");
console.log("native_binder_preentry_source_bound=true");
console.log("binder_exact_sha256_bound=true");
console.log("private_binder_parent_proof_required=true");
console.log("arbitrary_stdin_live_binding_rejected=true");
console.log("native_source_stream_required=true");
console.log("native_node_policy_binding_required=true");
console.log("candidate_v4_git_object_bound=true");
console.log("candidate_v4_signer_control_preserved=true");
console.log("v6r2_qualifier_git_object_bound=true");
console.log("v6r2_qualification_before_after_required=true");
console.log("fixed_native_v3_live_composition_required=true");
console.log("native_devnull_stdin_required=true");
console.log("arbitrary_live_receipt_input_accepted=false");
console.log("voide2livecomp3_receipt_content_address_verified=true");
console.log("systemd_credential_identity_promoted_only_from_native_live_receipt=true");
console.log("active_signing_capability_promoted_only_from_native_live_receipt=true");
console.log("remaining_gate_count=3");
console.log("customer_safe_to_pay=false");
console.log("transaction=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("wc_void_market_activation=false");
console.log("funds_movement=false");
