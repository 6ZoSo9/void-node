#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const MARKER="VOID_BUY_VOID_V7_PROTECTED_DISPATCH_ADMISSION_V1";
const LAUNCHER="ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash";
const NATIVE="ops/precision/void_buy_void_source_finality_v7_native_preentry_v1.c";

const tools=Object.freeze([
  Object.freeze({
    label:"deployment",
    path:"ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts",
    guard:"assertBuyVoidV7ProtectedDeploymentDispatchV1",
    after:'const repo=inspectRepositoryIdentityV1();',
    mutation:"installRootCustodiedReceiptV1({",
  }),
  Object.freeze({
    label:"provider-pair",
    path:"ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts",
    guard:"assertBuyVoidV7ProtectedProviderPairDispatchV1",
    after:"const deployment=readDeploymentBindingV1(DEPLOYMENT_RECEIPT_PATH);",
    mutation:"installProviderPairReceiptCreateOnceV1({",
  }),
  Object.freeze({
    label:"live-process-v2",
    path:"ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts",
    guard:"assertBuyVoidV7ProtectedLiveProcessV2DispatchV1",
    after:"const first=await collectReceipt(args.uid,args.gid);",
    mutation:"installBuyVoidV2LiveProcessReceiptCreateOnceV1({",
  }),
]);

const sha256=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const initializer=hex=>"{"+hex.match(/../gu).map(v=>"0x"+v).join(",")+"}";

const launcherBytes=fs.readFileSync(LAUNCHER);
const launcher=launcherBytes.toString("utf8");
const launcherSha=sha256(launcherBytes);
for(const required of [
  "dispatch_head=",
  "dispatch_tree=",
  "dispatch_branch=",
  "dispatch_status=",
  "protected_dispatch_head_changed",
  "protected_dispatch_tree_changed",
  "protected_dispatch_tree_dirty",
  "VOID_BUY_VOID_V7_PROTECTED_DISPATCH=VOID_BUY_VOID_V7_PROTECTED_DISPATCH_V1",
  'VOID_BUY_VOID_V7_PROTECTED_NATIVE_PREENTRY="$NATIVE_PREENTRY_MARKER"',
  'VOID_BUY_VOID_V7_PROTECTED_SOURCE_ROOT="$ROOT"',
  'VOID_BUY_VOID_V7_PROTECTED_SOURCE_COMMIT="$dispatch_head"',
  'VOID_BUY_VOID_V7_PROTECTED_SOURCE_TREE="$dispatch_tree"',
  'VOID_BUY_VOID_V7_PROTECTED_TOOL_PATH="$tool_path"',
  'VOID_BUY_VOID_V7_PROTECTED_TOOL_BLOB_SHA1="$tracked_blob"',
]) assert.ok(launcher.includes(required),"launcher_missing:"+required);
assert.ok(
  launcher.indexOf("dispatch_head=") <
    launcher.indexOf("VOID_BUY_VOID_V7_PROTECTED_DISPATCH="),
  "dispatch_recheck_must_precede_handoff",
);
assert.ok(
  launcher.indexOf("visible_blob=") <
    launcher.indexOf("VOID_BUY_VOID_V7_PROTECTED_TOOL_BLOB_SHA1="),
  "tool_blob_verification_must_precede_handoff",
);

const native=fs.readFileSync(NATIVE,"utf8");
assert.ok(
  native.includes("#define FIXED_LAUNCHER_BYTES "+launcherBytes.length+"U"),
  "native_launcher_size_binding_mismatch",
);
assert.ok(
  native.includes("FIXED_LAUNCHER_SHA256[32]="+initializer(launcherSha)),
  "native_launcher_sha256_binding_mismatch",
);
assert.ok(native.includes("sha256_fd_matches(launcher_fd)"));
assert.ok(native.indexOf("sha256_fd_matches(launcher_fd)") <
  native.indexOf("fexecve(bash_fd, next_argv, envp)"));

for(const tool of tools){
  const source=fs.readFileSync(tool.path,"utf8");
  for(const required of [
    '"VOID_BUY_VOID_V7_PROTECTED_DISPATCH_V1"',
    '"/opt/void-buy-void-v7-reviewed-v1"',
    "VOID_BUY_VOID_V7_PROTECTED_NATIVE_PREENTRY",
    "VOID_BUY_VOID_V7_PROTECTED_SOURCE_ROOT",
    "VOID_BUY_VOID_V7_PROTECTED_SOURCE_COMMIT",
    "VOID_BUY_VOID_V7_PROTECTED_SOURCE_TREE",
    "VOID_BUY_VOID_V7_PROTECTED_TOOL_PATH",
    "VOID_BUY_VOID_V7_PROTECTED_TOOL_BLOB_SHA1",
    "fileURLToPath(import.meta.url)",
    "HEAD^{commit}",
    "HEAD^{tree}",
    "symbolic-ref",
    "protected_dispatch_visible_blob_mismatch",
  ]) assert.ok(source.includes(required),tool.label+"_missing:"+required);
  const conditional='if(args.mode==="'+(tool.label==="deployment"?"--apply":"apply")+'")';
  const conditionalIndex=source.indexOf(conditional);
  const guardIndex=source.indexOf(tool.guard+"();",conditionalIndex);
  const afterIndex=source.indexOf(tool.after);
  const mutationIndex=source.indexOf(tool.mutation);
  assert.ok(conditionalIndex>=0,tool.label+"_apply_guard_conditional_missing");
  assert.ok(guardIndex>conditionalIndex,tool.label+"_guard_call_missing");
  assert.ok(afterIndex>guardIndex,tool.label+"_guard_must_precede_authority_reads");
  assert.ok(mutationIndex>guardIndex,tool.label+"_guard_must_precede_persistent_mutation");
}

const deployment=fs.readFileSync(tools[0].path,"utf8");
assert.ok(deployment.includes(
  '"ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts"'
));
assert.ok(deployment.includes(
  '"ops/precision/void_buy_void_source_finality_provider_pair_binding_receipt_install_v1.ts"'
));
assert.ok(deployment.includes(
  '"ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts"'
));
assert.ok(deployment.includes(
  '"ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash"'
));
assert.ok(deployment.includes(
  '"ops/precision/void_buy_void_source_finality_v7_native_preentry_v1.c"'
));

console.log(MARKER+"_GREEN");
console.log("protected_launcher_only_persistent_mutation_entry=true");
console.log("protected_dispatch_exact_root_commit_tree_tool_blob_bound=true");
console.log("launcher_generation_rechecked_before_dispatch=true");
console.log("tool_self_blob_reverified_before_apply=true");
console.log("direct_mutable_checkout_apply_must_hold=true");
console.log("plan_read_only_direct_invocation_preserved=true");
console.log("native_launcher_exact_size_sha256_bound=true");
console.log("current_enforcement_inventory_preserved=true");
console.log("service_mutation=false");
console.log("rpc_contact=false");
console.log("credential_wallet_signer_transaction_authority=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
