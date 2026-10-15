#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_AUTHORITY_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V1,
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V1,
  buyVoidSourceFinalityLiveProcessBindingReceiptIdV1,
  classifyBuyVoidSourceFinalityLiveProcessBindingV1,
} from "../dist/economic/buy_void_source_finality_live_process_binding_v1.js";

const SOURCE=fileURLToPath(
  new URL(
    "../src/economic/buy_void_source_finality_live_process_binding_v1.ts",
    import.meta.url,
  ),
);

const deploymentReceiptId="voidbsfdep1_"+"a".repeat(64);

const material={
  marker:VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_RECEIPT_V1,
  version:1,
  deployment_receipt_id:deploymentReceiptId,
  process_source_identity_marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
  process_source_commit:"b".repeat(40),
  process_source_tree:"c".repeat(40),
  process_source_branch:"main",
  service_unit:"void-node-live.service",
  runtime_uid:1000,
  runtime_gid:1000,
  main_pid:4242,
  process_start_time_ticks:"123456789",
  systemd_invocation_id:"d".repeat(32),
  cgroup_v2_path:
    "/user.slice/user-1000.slice/user@1000.service/app.slice/void-node-live.service",
  executable_realpath:"/usr/bin/node",
  cwd_realpath:"/opt/void-node-live-v1",
  cmdline_sha256:"e".repeat(64),
  node_options_sha256:"f".repeat(64),
  canonical_producer_role:true,
  node_path_absent:true,
  ld_preload_absent:true,
  ld_library_path_absent:true,
  capabilities_zero:true,
  no_new_privileges:true,
  source_custody_proven:true,
  reviewed_service_contract_proven:true,
  reviewed_launcher_contract_proven:true,
};

const receipt={
  ...material,
  receipt_id:buyVoidSourceFinalityLiveProcessBindingReceiptIdV1(material),
};

const selfIdentity={
  process_source_identity_marker:material.process_source_identity_marker,
  process_source_commit:material.process_source_commit,
  process_source_tree:material.process_source_tree,
  process_source_branch:material.process_source_branch,
  service_unit:material.service_unit,
  runtime_uid:material.runtime_uid,
  runtime_gid:material.runtime_gid,
  main_pid:material.main_pid,
  process_start_time_ticks:material.process_start_time_ticks,
  systemd_invocation_id:material.systemd_invocation_id,
  cgroup_v2_path:material.cgroup_v2_path,
  executable_realpath:material.executable_realpath,
  cwd_realpath:material.cwd_realpath,
  cmdline_sha256:material.cmdline_sha256,
  node_options_sha256:material.node_options_sha256,
  canonical_producer_role:true,
  node_path_absent:true,
  ld_preload_absent:true,
  ld_library_path_absent:true,
  capabilities_zero:true,
  no_new_privileges:true,
};

const ready=classifyBuyVoidSourceFinalityLiveProcessBindingV1({
  receipt,
  self_identity:selfIdentity,
  deployment_receipt_id:deploymentReceiptId,
});
assert.equal(ready.ok,true);
if(!ready.ok)throw new Error(ready.reason);
assert.equal(
  ready.marker,
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V1,
);
assert.equal(
  ready.status,
  "SAME_LIVE_PROCESS_BINDING_VERIFIED_PRODUCTION_AUTHORITY_STILL_HOLD",
);
assert.equal(ready.receipt_id,receipt.receipt_id);
assert.equal(ready.deployment_receipt_id,deploymentReceiptId);
assert.equal(ready.same_live_process_binding_proven,true);
assert.equal(ready.self_pid_start_time_binding_proven,true);
assert.equal(ready.systemd_invocation_binding_proven,true);
assert.equal(ready.service_cgroup_binding_proven,true);
assert.equal(ready.initial_process_environment_binding_proven,true);
assert.equal(ready.process_cmdline_binding_proven,true);
assert.equal(ready.production_source_finality_authority_ready,false);
assert.equal(ready.public_presale_activation,false);
assert.equal(ready.funds_movement,false);

function heldSelf(overrides){
  const result=classifyBuyVoidSourceFinalityLiveProcessBindingV1({
    receipt,
    self_identity:{...selfIdentity,...overrides},
    deployment_receipt_id:deploymentReceiptId,
  });
  assert.equal(result.ok,false,JSON.stringify(overrides));
  if(result.ok)throw new Error("expected HOLD");
  assert.equal(result.same_live_process_binding_proven,false);
  assert.equal(result.production_source_finality_authority_ready,false);
  assert.equal(result.funds_movement,false);
  return result;
}

for(const overrides of [
  {main_pid:4243},
  {process_start_time_ticks:"123456790"},
  {systemd_invocation_id:"1".repeat(32)},
  {process_source_commit:"1".repeat(40)},
  {process_source_tree:"2".repeat(40)},
  {process_source_branch:"other"},
  {cgroup_v2_path:"/user.slice/not-void-node-live.service"},
  {executable_realpath:"/tmp/node"},
  {cwd_realpath:"/tmp/repo"},
  {cmdline_sha256:"3".repeat(64)},
  {node_options_sha256:"4".repeat(64)},
  {runtime_uid:1001},
  {runtime_gid:1001},
  {canonical_producer_role:false},
  {node_path_absent:false},
  {ld_preload_absent:false},
  {ld_library_path_absent:false},
  {capabilities_zero:false},
  {no_new_privileges:false},
]){
  heldSelf(overrides);
}

{
  const bad=classifyBuyVoidSourceFinalityLiveProcessBindingV1({
    receipt,
    self_identity:selfIdentity,
    deployment_receipt_id:"voidbsfdep1_"+"9".repeat(64),
  });
  assert.equal(bad.ok,false);
  if(bad.ok)throw new Error("expected deployment mismatch HOLD");
  assert.equal(bad.reason,"deployment_receipt_id_mismatch");
}

for(const [key,value] of [
  ["source_custody_proven",false],
  ["reviewed_service_contract_proven",false],
  ["reviewed_launcher_contract_proven",false],
]){
  const badMaterial={...material,[key]:value};
  const badReceipt={
    ...badMaterial,
    receipt_id:"voidbsflp1_"+"0".repeat(64),
  };
  const result=classifyBuyVoidSourceFinalityLiveProcessBindingV1({
    receipt:badReceipt,
    self_identity:selfIdentity,
    deployment_receipt_id:deploymentReceiptId,
  });
  assert.equal(result.ok,false,key);
}

{
  const tampered={...receipt,main_pid:9999};
  const result=classifyBuyVoidSourceFinalityLiveProcessBindingV1({
    receipt:tampered,
    self_identity:selfIdentity,
    deployment_receipt_id:deploymentReceiptId,
  });
  assert.equal(result.ok,false);
}

{
  const accessor={...receipt};
  Object.defineProperty(accessor,"main_pid",{
    enumerable:true,
    get(){throw new Error("accessor_executed");},
  });
  const result=classifyBuyVoidSourceFinalityLiveProcessBindingV1({
    receipt:accessor,
    self_identity:selfIdentity,
    deployment_receipt_id:deploymentReceiptId,
  });
  assert.equal(result.ok,false);
  if(result.ok)throw new Error("accessor receipt unexpectedly accepted");
  assert.notEqual(result.reason,"accessor_executed");
}

assert.equal(
  VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_PATH_V1,
  "/var/lib/void-source-finality-v7/live-process-binding-v1.json",
);

for(const [key,expected] of Object.entries({
  source_only_gate:true,
  root_custodied_receipt_required:true,
  deployment_receipt_binding_required:true,
  self_pid_binding_required:true,
  self_start_time_binding_required:true,
  systemd_invocation_binding_required:true,
  service_cgroup_binding_required:true,
  initial_process_environment_binding_required:true,
  process_cmdline_binding_required:true,
  executable_binding_required:true,
  cwd_binding_required:true,
  canonical_producer_role_required:true,
  source_custody_receipt_claim_required:true,
  reviewed_service_contract_receipt_claim_required:true,
  reviewed_launcher_contract_receipt_claim_required:true,
  zero_process_capabilities_required:true,
  no_new_privileges_required:true,
  host_mutation:false,
  service_mutation:false,
  credential_access:false,
  wallet_or_signer_access:false,
  transaction_signing:false,
  transaction_broadcast:false,
  rpc_call:false,
  production_source_finality_authority_ready:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(SOURCE,"utf8");
for(const required of [
  '"/proc/self/stat"',
  '"/proc/self/status"',
  '"/proc/self/cmdline"',
  '"/proc/self/environ"',
  '"/proc/self/cgroup"',
  '"/proc/self/exe"',
  '"/proc/self/cwd"',
  '"INVOCATION_ID"',
  '"VOID_PROCESS_SOURCE_COMMIT"',
  '"VOID_PROCESS_SOURCE_TREE"',
  '"VOID_PROCESS_SOURCE_BRANCH"',
  '"VOID_CANONICAL_PRODUCER_ROLE"',
  '"NODE_OPTIONS"',
  '"NODE_PATH"',
  '"LD_PRELOAD"',
  '"LD_LIBRARY_PATH"',
  "O_NOFOLLOW",
  "source_custody_proven",
  "reviewed_service_contract_proven",
  "reviewed_launcher_contract_proven",
]){
  assert.equal(source.includes(required),true,required);
}
assert.equal(
  source.includes("process.env"),
  false,
  "mutable process.env must not establish launch identity",
);

console.log(
  "VOID_BUY_VOID_SOURCE_FINALITY_LIVE_PROCESS_BINDING_V1_PROOF_GREEN",
);
console.log("deployment_receipt_binding=true");
console.log("self_pid_start_time_binding=true");
console.log("systemd_invocation_binding=true");
console.log("service_cgroup_binding=true");
console.log("initial_proc_environment_binding=true");
console.log("mutable_process_env_trusted=false");
console.log("process_cmdline_binding=true");
console.log("canonical_producer_role_required=true");
console.log("source_custody_receipt_claim_required=true");
console.log("restart_or_pid_reuse_holds=true");
console.log("production_source_finality_authority_ready=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
