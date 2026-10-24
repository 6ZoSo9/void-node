#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

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

const PARENT_SOURCE_BLOBS=Object.freeze({
  "src/economic/buy_void_request_custody_read_policy_v1.ts":
    "8885957e3f9ff983724c7944e0d4f181e6e834c1",
  "src/economic/buy_void_public_request_under_launch_lock_v1.ts":
    "8fe4fa53953683fa0804f24ede838c22ec18cae0",
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts":
    "d1320be22fe55af24017b84f0655fbcde82dbee9",
});
function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes)
    .digest("hex");
}

const gitBlobFixture=Buffer.from("void-stable-request-root-git-blob-self-test\n","utf8");
const gitBlobFixtureCli=spawnSync(
  "/usr/bin/git",
  ["hash-object","--stdin"],
  {
    input:gitBlobFixture,
    encoding:"utf8",
    env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
  },
);
assert.equal(gitBlobFixtureCli.status,0,String(gitBlobFixtureCli.stderr||""));
assert.equal(
  gitBlobSha1(gitBlobFixture),
  String(gitBlobFixtureCli.stdout||"").trim(),
  "git_blob_helper_mismatch",
);
for(const [relative,expected] of Object.entries(PARENT_SOURCE_BLOBS)){
  const bytes=fs.readFileSync(relative);
  assert.equal(
    gitBlobSha1(bytes),
    expected,
    "accepted_parent_source_blob_drift:"+relative,
  );
}

const readPolicy=fs.readFileSync(
  "src/economic/buy_void_request_custody_read_policy_v1.ts","utf8",
);
const normalizedReadPolicy=readPolicy.replace(/\s+/gu,"");
for(const needle of [
  'VOID_BUY_REQUEST_CUSTODY_READ_GID',
  '0o750',
  '0o640',
  'customer_sidecars_group_readable:false',
  'operator_sidecars_group_readable:false',
  'custody_write_authority:false',
]){
  assert.ok(normalizedReadPolicy.includes(needle),needle);
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
  "VOID_BUY_VOID_REQUEST_CUSTODY_READ_JOURNAL_MODE_V1",
  "VOID_BUY_VOID_REQUEST_CUSTODY_READ_GID_V1",
  "buy_void_verified_payment_capacity_request_directory_alias_forbidden",
  "function validateLedgerStatV1(",
  'fail(code + "_file_invalid")',
  'fail(code + "_shared_journal_not_preprovisioned")',
]){
  assert.ok(capacity.includes(needle),needle);
}
const normalizedCapacity=capacity.replace(/\s+/gu,"");
for(const callsite of [
  'openPinnedLedgerV1(directory,"requests.jsonl","buy_void_verified_payment_capacity_requests",{writable:false,create:false},)',
  'openPinnedLedgerV1(directory,"operator-events.jsonl","buy_void_verified_payment_capacity_operator_events",{writable:false,create:false},)',
]){
  assert.ok(
    normalizedCapacity.includes(callsite),
    "shared_journal_callsite_drift:"+callsite,
  );
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

console.log("VOID_BUY_VOID_STABLE_REQUEST_ROOT_POLICY_V2_GREEN");
console.log("request_root=/var/lib/void-buy-request-journal-v1");
console.log("request_directory_mode=0750");
console.log("fixed_journal_mode=0640");
console.log("private_sidecar_mode=0600");
console.log("runtime_user=zoso");
console.log("ipc_group=void-buy-custody-ipc");
console.log("immutable_release_root_forbidden=true");
console.log("accepted_parent_source_generation_bound=true");
console.log("capacity_shared_journal_structural_binding_verified=true");
console.log("legacy_history_disposition_required_before_apply=true");
console.log("request_history_migration_authorized=false");
console.log("service_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
