#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_STABLE_REQUEST_ROOT_AUTHORITY_V1,
  VOID_BUY_VOID_STABLE_REQUEST_ROOT_FRAGMENT_V1,
  VOID_BUY_VOID_STABLE_REQUEST_ROOT_POLICY_V1,
  classifyVoidBuyVoidStableRequestRootPolicyV1,
  renderVoidBuyVoidStableRequestRootDropinV1,
} from "../tools/void-buy-stable-request-root-policy-v1.mjs";

const accepted=classifyVoidBuyVoidStableRequestRootPolicyV1(
  structuredClone(VOID_BUY_VOID_STABLE_REQUEST_ROOT_FRAGMENT_V1),
);
assert.equal(accepted.ok,true);
assert.equal(accepted.status,"SOURCE_POLICY_GREEN_NOT_INSTALLED");
assert.equal(accepted.marker,VOID_BUY_VOID_STABLE_REQUEST_ROOT_POLICY_V1);
assert.equal(accepted.request_root,"/var/lib/void-buy-request-journal-v1");
assert.equal(accepted.stable_across_release_swap,true);
assert.equal(accepted.directory_mode,"0750");
assert.equal(accepted.fixed_journal_mode,"0640");
assert.equal(accepted.private_sidecar_mode,"0600");
assert.equal(accepted.legacy_history_disposition_required,true);
assert.equal(accepted.production_gate_ready,false);

assert.equal(
  renderVoidBuyVoidStableRequestRootDropinV1(980),
  [
    "[Service]",
    "Environment=VOID_BUY_REQUEST_DIR=/var/lib/void-buy-request-journal-v1",
    "Environment=VOID_BUY_REQUEST_CUSTODY_READ_GID=980",
    "",
  ].join("\n"),
);
for(const bad of [0,-1,"01"," 980","980 ","abc",2147483648]){
  assert.throws(
    ()=>renderVoidBuyVoidStableRequestRootDropinV1(bad),
    /stable_request_root_ipc_gid_invalid/u,
  );
}

function held(mutator,reason){
  const v=structuredClone(VOID_BUY_VOID_STABLE_REQUEST_ROOT_FRAGMENT_V1);
  mutator(v);
  const d=classifyVoidBuyVoidStableRequestRootPolicyV1(v);
  assert.equal(d.ok,false,reason);
  assert.equal(d.status,"HOLD",reason);
  assert.equal(d.reason,reason);
}
held(x=>{x.request_root="/opt/void-node-live/releases/x/.runtime/requests";},
  "stable_request_root_request_root_invalid");
held(x=>{x.request_root="/var/lib/void-allocation-custody-v1/requests";},
  "stable_request_root_request_root_invalid");
held(x=>{x.directory_mode="0770";},
  "stable_request_root_directory_mode_invalid");
held(x=>{x.fixed_journal_mode="0660";},
  "stable_request_root_fixed_journal_mode_invalid");
held(x=>{x.private_sidecar_mode="0640";},
  "stable_request_root_private_sidecar_mode_invalid");
held(x=>{x.runtime_user="void-buy-runtime";},
  "stable_request_root_runtime_user_invalid");

const readPolicy=fs.readFileSync(
  "src/economic/buy_void_request_custody_read_policy_v1.ts","utf8",
);
for(const needle of [
  'VOID_BUY_REQUEST_CUSTODY_READ_GID',
  '0o750',
  '0o640',
  'customer_sidecars_group_readable:false',
  'operator_sidecars_group_readable:false',
  'custody_write_authority:false',
]){
  assert.ok(readPolicy.includes(needle),needle);
}
const requestWriter=fs.readFileSync(
  "src/economic/buy_void_public_request_under_launch_lock_v1.ts","utf8",
);
for(const needle of [
  "VOID_BUY_VOID_REQUEST_CUSTODY_READ_ENABLED_V1",
  "custody_readable_directory_alias_forbidden",
  "custody_readable_journal_not_preprovisioned",
  "operator-events.jsonl",
]){
  assert.ok(requestWriter.includes(needle),needle);
}
const capacity=fs.readFileSync(
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts","utf8",
);
for(const needle of [
  "VOID_BUY_VOID_REQUEST_CUSTODY_READ_ENABLED_V1",
  "buy_void_verified_payment_capacity_request_directory_alias_forbidden",
  "buy_void_verified_payment_capacity_requests_file_invalid",
  "buy_void_verified_payment_capacity_operator_events_file_invalid",
]){
  assert.ok(capacity.includes(needle),needle);
}

for(const [key,expected] of Object.entries({
  source_policy_only:true,
  fixed_absolute_root_selected:true,
  immutable_release_root_forbidden:true,
  protected_allocation_roots_forbidden:true,
  preprovisioned_root_required:true,
  preprovisioned_fixed_journals_required:true,
  runtime_uid_remains_owner:true,
  custody_read_via_ipc_group_only:true,
  custody_write_authority:false,
  customer_sidecars_group_readable:false,
  operator_sidecars_group_readable:false,
  legacy_history_disposition_required_before_apply:true,
  live_host_metadata_verified:false,
  request_history_migration_authorized:false,
  service_mutation:false,
  permission_mutation:false,
  filesystem_write:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(VOID_BUY_VOID_STABLE_REQUEST_ROOT_AUTHORITY_V1[key],expected,key);
}

console.log("VOID_BUY_VOID_STABLE_REQUEST_ROOT_POLICY_V1_GREEN");
console.log("request_root=/var/lib/void-buy-request-journal-v1");
console.log("request_directory_mode=0750");
console.log("fixed_journal_mode=0640");
console.log("private_sidecar_mode=0600");
console.log("runtime_user=zoso");
console.log("ipc_group=void-buy-custody-ipc");
console.log("immutable_release_root_forbidden=true");
console.log("legacy_history_disposition_required_before_apply=true");
console.log("request_history_migration_authorized=false");
console.log("service_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
