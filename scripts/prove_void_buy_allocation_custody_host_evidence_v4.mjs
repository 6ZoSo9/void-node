#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V4,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V4,
  classifyBuyVoidAllocationCustodyAuthenticatedUserServiceV4,
  parseBuyVoidAuthenticatedUserManagerUnitQueryV2,
} from "../tools/void-buy-allocation-custody-host-evidence-v4.mjs";

const PINNED_BLOBS=Object.freeze({
  "ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c":
    "d8b30ac499c3bb8a5d223dbc6be687dd175be611",
  "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c":
    "5355b7f177574ac4fa173a693605acaf9c5f26e4",
  "ops/systemd/void-node-live.service.d/98-buy-void-allocation-custody-runtime-hardening-v2.conf.example":
    "211f2ee00e431af80e94ca9937412900bddda5f9",
});

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
for(const [path,expected] of Object.entries(PINNED_BLOBS)){
  assert.equal(gitBlob(fs.readFileSync(path)),expected,"pinned_blob_drift:"+path);
}

const lines=[
  "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V2_GREEN",
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
  "MainPID=4026802",
  "ControlGroup=/user.slice/user-1000.slice/user@1000.service/app.slice/void-node-live.service",
  "NoNewPrivileges=yes",
  "PrivateUsers=no",
  "CapabilityBoundingSet=000001ffffffffff",
  "AmbientCapabilities=0000000000000000",
  "KernelNoNewPrivs=1",
  "KernelCapInh=0000000000000000",
  "KernelCapPrm=0000000000000000",
  "KernelCapEff=0000000000000000",
  "KernelCapBnd=000001ffffffffff",
  "KernelCapAmb=0000000000000000",
  "configured_kernel_bounding_set_equal=true",
  "kernel_active_capabilities_zero=true",
  "service_ppid=2693",
  "service_start_ticks=999999",
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
];
const raw=lines.join("\n");
const parsed=parseBuyVoidAuthenticatedUserManagerUnitQueryV2(raw);
assert.equal(parsed.PrivateUsers,"no");
assert.equal(parsed.CapabilityBoundingSet,"000001ffffffffff");
assert.equal(parsed.KernelCapBnd,parsed.CapabilityBoundingSet);
assert.equal(parsed.KernelCapEff,"0000000000000000");

const config={
  runtime_user:"zoso",
  runtime_group:"zoso",
  runtime_uid:1000,
  runtime_service_unit:"void-node-live.service",
};
const decision=classifyBuyVoidAllocationCustodyAuthenticatedUserServiceV4(raw,config);
assert.equal(decision.marker,VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V4);
assert.equal(decision.no_new_privileges,true);
assert.equal(decision.private_users,false);
assert.equal(decision.kernel_active_capabilities_zero,true);
assert.equal(decision.configured_kernel_bounding_set_equal,true);
assert.equal(decision.capability_bounding_set_hex,"000001ffffffffff");
assert.equal(decision.kernel_cap_bnd_hex,"000001ffffffffff");
assert.equal(decision.complete_host_evidence_collector,false);

for(const [label,bad,pattern] of [
  ["private-users",raw.replace("PrivateUsers=no","PrivateUsers=yes"),/private_users_invalid/u],
  ["nnp-systemd",raw.replace("NoNewPrivileges=yes","NoNewPrivileges=no"),/runtime_nnp_invalid/u],
  ["nnp-kernel",raw.replace("KernelNoNewPrivs=1","KernelNoNewPrivs=0"),/runtime_nnp_invalid/u],
  ["effective-cap",raw.replace("KernelCapEff=0000000000000000","KernelCapEff=0000000000000001"),/active_capability_state_invalid/u],
  ["ambient-policy",raw.replace("AmbientCapabilities=0000000000000000","AmbientCapabilities=0000000000000001"),/active_capability_state_invalid/u],
  ["bounding-mismatch",raw.replace("KernelCapBnd=000001ffffffffff","KernelCapBnd=000000ffffffffff"),/bounding_set_mismatch/u],
  ["truth-flag",raw.replace("configured_kernel_bounding_set_equal=true","configured_kernel_bounding_set_equal=false"),/native_truth_invalid/u],
  ["mutation",raw.replace("host_mutation=false","host_mutation=true"),/native_non_authority_invalid/u],
]){
  assert.throws(
    ()=>parseBuyVoidAuthenticatedUserManagerUnitQueryV2(bad),
    pattern,
    label,
  );
}

assert.throws(
  ()=>classifyBuyVoidAllocationCustodyAuthenticatedUserServiceV4(parsed,config),
  /native_transcript_required/u,
  "caller-built parsed object must not become authority",
);
assert.throws(
  ()=>parseBuyVoidAuthenticatedUserManagerUnitQueryV2(raw+"unexpected=value\n"),
  /native_output_shape_invalid/u,
);

for(const [key,expected] of Object.entries({
  source_composition_only:true,
  authenticated_private_manager_peer_required:true,
  same_authenticated_connection_unit_query_required:true,
  no_new_privileges_required:true,
  private_users_false_required:true,
  kernel_active_capabilities_zero_required:true,
  configured_kernel_bounding_set_equality_required:true,
  complete_host_evidence_collector:false,
  host_mutation:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V4[key],expected,key);
}

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V4_PROOF_GREEN");
console.log("native_v2_exact_transcript_required=true");
console.log("caller_built_native_object_authority=false");
console.log("private_users_false_required=true");
console.log("kernel_no_new_privileges_required=true");
console.log("kernel_active_capabilities_zero_required=true");
console.log("configured_kernel_bounding_set_equality_required=true");
console.log("authenticated_manager_peer_required=true");
console.log("same_authenticated_connection_unit_query_required=true");
console.log("complete_host_evidence_collector=false");
console.log("host_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
