#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V4,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V4,
  classifyBuyVoidAllocationCustodyAuthenticatedUserServiceV4,
  parseBuyVoidAuthenticatedUserManagerUnitQueryV4,
} from "../tools/void-buy-allocation-custody-host-evidence-v4.mjs";

const PINS=Object.freeze({
  "ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c":
    "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
  "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c":
    "a493a557305d5193d2b1d38b6070a8e826c1d43a",
  "tools/void-buy-allocation-custody-host-evidence-v3.mjs":
    "eae92c7dd060b4d6139543463b5fbd2f8564585b",
  "scripts/prove_void_buy_allocation_custody_host_evidence_v3.mjs":
    "9130e93d0c31b02d5ac4762065e29f814d054945",
});
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries(PINS)){
  assert.equal(gitBlob(fs.readFileSync(relative)),expected,"source_pin_drift:"+relative);
}

const raw=[
  "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V1_GREEN",
  "runtime_uid=1000",
  "manager_pid=2693",
  "manager_gid=1000",
  "manager_start_ticks=1409",
  "manager_peer_authenticated=true",
  "same_private_fd_used_for_query=true",
  "sanitized_loader_environment=true",
  "libsystemd_fixed_path_verified=true",
  "libsystemd_retained_fd_load=true",
  "libsystemd_symbol_provenance_verified=true",
  "runtime_service_unit=void-node-live.service",
  "LoadState=loaded",
  "ActiveState=active",
  "SubState=running",
  "User=",
  "Group=",
  "MainPID=1073664",
  "ControlGroup=/user.slice/user-1000.slice/user@1000.service/app.slice/void-node-live.service",
  "NoNewPrivileges=yes",
  "CapabilityBoundingSet=000001ffffffffff",
  "AmbientCapabilities=0000000000000000",
  "KernelCapInh=0000000000000000",
  "KernelCapPrm=0000000000000000",
  "KernelCapEff=0000000000000000",
  "KernelCapBnd=000001ffffffffff",
  "KernelCapAmb=0000000000000000",
  "KernelNoNewPrivs=1",
  "capability_bounding_set_kernel_match=true",
  "process_nonbounding_capabilities_zero=true",
  "service_ppid=2693",
  "service_start_ticks=5139458",
  "service_pidfd_retained=true",
  "manager_pidfd_retained=true",
  "runtime_main_pid_kernel_bound=true",
  "manager_generation_reverified=true",
  "service_generation_reverified=true",
  "host_mutation=false",
  "payment_acceptance=false",
  "public_presale_activation=false",
  "funds_movement=false",
  "",
].join("\n");

const parsed=parseBuyVoidAuthenticatedUserManagerUnitQueryV4(raw);
assert.equal(parsed.KernelCapBnd,parsed.CapabilityBoundingSet);
assert.equal(parsed.KernelNoNewPrivs,"1");

const config={
  runtime_user:"zoso",runtime_group:"zoso",runtime_uid:1000,
  runtime_service_unit:"void-node-live.service",
};
const decision=classifyBuyVoidAllocationCustodyAuthenticatedUserServiceV4(raw,config);
assert.equal(decision.marker,VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V4);
assert.equal(decision.configured_capability_bounding_set,"000001ffffffffff");
assert.equal(decision.kernel_cap_bnd,"000001ffffffffff");
assert.equal(decision.kernel_no_new_privileges,true);
assert.equal(decision.capability_bounding_set_kernel_match,true);
assert.equal(decision.process_nonbounding_capabilities_zero,true);
assert.equal(decision.complete_host_evidence_collector,false);
assert.equal(decision.production_host_evidence_authority,false);

for(const [label,bad,pattern] of [
  ["ambient",raw.replace("AmbientCapabilities=0000000000000000","AmbientCapabilities=0000000000000001"),
    /configured_ambient_invalid/u],
  ["cap-prm",raw.replace("KernelCapPrm=0000000000000000","KernelCapPrm=0000000000000001"),
    /kernel_nonbounding_caps_nonzero:KernelCapPrm/u],
  ["cap-eff",raw.replace("KernelCapEff=0000000000000000","KernelCapEff=0000000000000001"),
    /kernel_nonbounding_caps_nonzero:KernelCapEff/u],
  ["bound-mismatch",raw.replace("KernelCapBnd=000001ffffffffff","KernelCapBnd=0000000000000000"),
    /kernel_bounding_mismatch/u],
  ["nnp",raw.replace("KernelNoNewPrivs=1","KernelNoNewPrivs=0"),/kernel_nnp_invalid/u],
  ["relation-claim",raw.replace("capability_bounding_set_kernel_match=true",
    "capability_bounding_set_kernel_match=false"),/native_truth_invalid:capability_bounding_set_kernel_match/u],
  ["bad-mask",raw.replace("KernelCapInh=0000000000000000","KernelCapInh=nothex"),
    /capability_mask_invalid:KernelCapInh/u],
]){
  assert.throws(()=>classifyBuyVoidAllocationCustodyAuthenticatedUserServiceV4(bad,config),pattern,label);
}

const query=fs.readFileSync(
  "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c","utf8");
for(const needle of [
  "KernelCapInh=%016","KernelCapPrm=%016","KernelCapEff=%016",
  "KernelCapBnd=%016","KernelCapAmb=%016","KernelNoNewPrivs=%d",
  "capability_bounding_set_kernel_match=true",
  "process_nonbounding_capabilities_zero=true",
  "same_process_security(&security,&security_after)",
]){
  assert.ok(query.includes(needle),needle);
}

for(const [key,expected] of Object.entries({
  source_composition_only:true,
  authenticated_private_manager_peer_required:true,
  same_authenticated_connection_unit_query_required:true,
  configured_ambient_capabilities_zero_required:true,
  kernel_no_new_privileges_required:true,
  kernel_nonbounding_capabilities_zero_required:true,
  kernel_bounding_set_equals_authenticated_systemd_mask_required:true,
  capability_state_revalidation_required:true,
  generic_user_bus_authority:false,
  complete_host_evidence_collector:false,
  host_mutation:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V4[key],expected,key);
}

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V4_PROOF_GREEN");
console.log("manager_peer_authenticated=true");
console.log("same_authenticated_connection_unit_query=true");
console.log("configured_bounding_set_may_be_nonzero=true");
console.log("configured_ambient_capabilities_zero_required=true");
console.log("kernel_nonbounding_capabilities_zero_required=true");
console.log("kernel_no_new_privileges_required=true");
console.log("kernel_bounding_set_matches_systemd_mask=true");
console.log("capability_state_revalidated=true");
console.log("historical_v3_evidence_preserved=true");
console.log("complete_host_evidence_collector=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
