#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_AUTHORITY_V1,
  VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_FRAGMENT_V1,
  VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_POLICY_V1,
  classifyVoidBuyVoidRuntimeIpcGroupRefreshPolicyV1,
} from "../tools/void-buy-runtime-ipc-group-refresh-policy-v1.mjs";

const accepted=classifyVoidBuyVoidRuntimeIpcGroupRefreshPolicyV1(
  structuredClone(VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_FRAGMENT_V1),
);
assert.equal(accepted.ok,true);
assert.equal(accepted.status,"SOURCE_POLICY_GREEN_NOT_APPLIED");
assert.equal(accepted.marker,VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_POLICY_V1);
assert.equal(accepted.runtime_identity_preserved,true);
assert.equal(accepted.target_supplementary_gid,980);
assert.equal(accepted.user_manager_refresh_required,true);
assert.equal(accepted.user_manager_refresh_scope,"user@1000.service");
assert.equal(accepted.expected_runtime_service_restart,true);
assert.equal(accepted.host_mutation_authorized,false);
assert.equal(accepted.production_gate_ready,false);

function held(mutator,reason){
  const x=structuredClone(VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_FRAGMENT_V1);
  mutator(x);
  const d=classifyVoidBuyVoidRuntimeIpcGroupRefreshPolicyV1(x);
  assert.equal(d.ok,false,reason);
  assert.equal(d.reason,reason);
  assert.equal(d.host_mutation_authorized,false);
}
held(x=>{x.runtime_user="void-buy-runtime";},"runtime_ipc_group_refresh_runtime_user_invalid");
held(x=>{x.ipc_gid=981;},"runtime_ipc_group_refresh_ipc_gid_invalid");
held(x=>{x.user_manager_unit="void-node-live.service";},"runtime_ipc_group_refresh_user_manager_unit_invalid");
held(x=>{x.membership_add=["/usr/sbin/usermod","--groups","void-buy-custody-ipc","zoso"];},"runtime_ipc_group_refresh_membership_add_invalid");
held(x=>{x.user_manager_refresh=["/usr/bin/systemctl","--user","restart","void-node-live.service"];},"runtime_ipc_group_refresh_user_manager_refresh_invalid");
held(x=>{x.membership_rollback=["/usr/bin/gpasswd","--delete","void-buy-runtime","void-buy-custody-ipc"];},"runtime_ipc_group_refresh_membership_rollback_invalid");

let traps=0;
const hostile=new Proxy(structuredClone(
  VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_FRAGMENT_V1,
),{
  ownKeys(){traps+=1;throw Error("trap");},
  getPrototypeOf(){traps+=1;throw Error("trap");},
});
const hostileDecision=
  classifyVoidBuyVoidRuntimeIpcGroupRefreshPolicyV1(hostile);
assert.equal(hostileDecision.ok,false);
assert.equal(hostileDecision.reason,"runtime_ipc_group_refresh_shape_invalid");
assert.equal(traps,0);

const policySource=fs.readFileSync(
  "tools/void-buy-runtime-ipc-group-refresh-policy-v1.mjs","utf8",
);
assert.doesNotMatch(policySource,/node:(?:fs|child_process|net|http|https)/u);
assert.doesNotMatch(policySource,/execFile|spawn|writeFile|chmod|chown|mkdir/u);
assert.match(policySource,/\/usr\/sbin\/usermod/u);
assert.match(policySource,/\/usr\/bin\/systemctl","restart","user@1000\.service"/u);
assert.match(policySource,/\/usr\/bin\/gpasswd","--delete","zoso","void-buy-custody-ipc"/u);

function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\\0","utf8"))
    .update(bytes)
    .digest("hex");
}

const socketPolicyBytes=fs.readFileSync(
  "tools/void-buy-allocation-custody-socket-runtime-directory-policy-v1.mjs",
);
assert.equal(
  gitBlobSha1(socketPolicyBytes),
  "9d4b97a822b50c525722f0decae9205a9aebeb4a",
  "socket_runtime_directory_policy_parent_blob_drift",
);
const socketPolicy=socketPolicyBytes.toString("utf8");
assert.match(socketPolicy,/ipc_group: "void-buy-custody-ipc"/u);
assert.match(socketPolicy,/runtime_directory_mode: "0750"/u);
assert.match(socketPolicy,/socket_mode: "0660"/u);
assert.match(socketPolicy,/runtime_socket_parent_write_denied_required: true/u);

const runtimeHardeningBytes=fs.readFileSync(
  "ops/systemd/void-node-live.service.d/98-buy-void-allocation-custody-runtime-hardening-v1.conf.example",
);
assert.equal(
  gitBlobSha1(runtimeHardeningBytes),
  "ddb9498bfbe12cc5952e82c6a8c5d0232425f32a",
  "runtime_hardening_parent_blob_drift",
);
const runtimeHardening=runtimeHardeningBytes.toString("utf8");
assert.equal(runtimeHardening,
  "[Service]\nNoNewPrivileges=yes\nCapabilityBoundingSet=\nAmbientCapabilities=\n",
);

for(const [key,expected] of Object.entries({
  source_policy_only:true,
  current_runtime_identity_preserved:true,
  staged_runtime_identity_migration:false,
  distinct_ipc_group_required:true,
  account_database_membership_required:true,
  user_manager_refresh_required:true,
  runtime_service_restart_via_manager_refresh_expected:true,
  direct_user_service_supplementary_groups_shortcut_forbidden:true,
  setuid_group_helper_shortcut_forbidden:true,
  pre_refresh_active_user_service_census_required:true,
  pre_refresh_runtime_generation_receipt_required:true,
  post_refresh_manager_gid_inheritance_required:true,
  post_refresh_runtime_gid_inheritance_required:true,
  post_refresh_active_user_service_set_recovery_required:true,
  post_refresh_runtime_source_identity_required:true,
  post_refresh_runtime_readiness_required:true,
  rollback_only_if_membership_added_by_operation:true,
  rollback_user_manager_refresh_required:true,
  account_mutation:false,
  user_manager_restart:false,
  service_restart:false,
  filesystem_mutation:false,
  systemd_mutation:false,
  credential_access:false,
  wallet_or_signer_access:false,
  rpc_call:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_AUTHORITY_V1[key],expected,key);
}

console.log("VOID_BUY_VOID_RUNTIME_IPC_GROUP_REFRESH_POLICY_V1_GREEN");
console.log("runtime_identity_preserved=true");
console.log("target_supplementary_gid=980");
console.log("user_manager_refresh_required=true");
console.log("direct_user_service_supplementary_groups_shortcut_forbidden=true");
console.log("pre_refresh_active_user_service_census_required=true");
console.log("post_refresh_active_user_service_set_recovery_required=true");
console.log("post_refresh_manager_gid_inheritance_required=true");
console.log("post_refresh_runtime_gid_inheritance_required=true");
console.log("host_mutation_authorized=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
