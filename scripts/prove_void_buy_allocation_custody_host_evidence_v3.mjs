#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V3,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V3,
  classifyBuyVoidAllocationCustodyAuthenticatedUserServiceV3,
  parseBuyVoidAuthenticatedUserManagerUnitQueryV1,
} from "../tools/void-buy-allocation-custody-host-evidence-v3.mjs";

const PARENT_BLOBS=Object.freeze({
  "ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c":
    "cab88f4642ab929d1f7a4d2f1511462a94ef34ca",
  "tools/void-buy-allocation-custody-host-evidence-v2.mjs":
    "5507d049dc00d46ea3d02d3af46273a73e868639",
});
function gitBlob(bytes){
  const h=Buffer.concat([
    Buffer.from("blob "+bytes.length,"utf8"),
    Buffer.from([0]),
  ]);
  return crypto.createHash("sha1").update(h).update(bytes).digest("hex");
}
for(const [path,expected] of Object.entries(PARENT_BLOBS)){
  const bytes=fs.readFileSync(path);
  assert.equal(gitBlob(bytes),expected,"parent_blob_drift:"+path);
}

const lines=[
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
  "CapabilityBoundingSet=",
  "AmbientCapabilities=",
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
];
const raw=lines.join("\n");
const parsed=parseBuyVoidAuthenticatedUserManagerUnitQueryV1(raw);
assert.equal(parsed.manager_peer_authenticated,"true");
assert.equal(parsed.sanitized_loader_environment,"true");
assert.equal(parsed.libsystemd_fixed_path_verified,"true");
assert.equal(parsed.libsystemd_retained_fd_load,"true");
assert.equal(parsed.libsystemd_symbol_provenance_verified,"true");

const config={
  runtime_user:"zoso",
  runtime_group:"zoso",
  runtime_uid:1000,
  runtime_service_unit:"void-node-live.service",
};
const decision=
  classifyBuyVoidAllocationCustodyAuthenticatedUserServiceV3(raw,config);
assert.equal(
  decision.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V3,
);
assert.equal(decision.manager_peer_authenticated,true);
assert.equal(decision.same_authenticated_connection_unit_query,true);
assert.equal(decision.sanitized_loader_environment,true);
assert.equal(decision.libsystemd_fixed_path_verified,true);
assert.equal(decision.libsystemd_retained_fd_load,true);
assert.equal(decision.libsystemd_symbol_provenance_verified,true);
assert.equal(decision.runtime_user_manager_identity_verified,true);
assert.equal(decision.runtime_user_manager_cgroup_bound,true);
assert.equal(decision.runtime_main_pid_kernel_bound,true);
assert.equal(decision.complete_host_evidence_collector,false);
assert.equal(decision.production_host_evidence_authority,false);

for(const [label,bad,pattern] of [
  [
    "fake-peer",
    raw.replace(
      "manager_peer_authenticated=true",
      "manager_peer_authenticated=false",
    ),
    /native_truth_invalid:manager_peer_authenticated/u,
  ],
  [
    "second-fd",
    raw.replace(
      "same_private_fd_used_for_query=true",
      "same_private_fd_used_for_query=false",
    ),
    /native_truth_invalid:same_private_fd_used_for_query/u,
  ],
  [
    "loader-env",
    raw.replace(
      "sanitized_loader_environment=true",
      "sanitized_loader_environment=false",
    ),
    /native_truth_invalid:sanitized_loader_environment/u,
  ],
  [
    "libsystemd-path",
    raw.replace(
      "libsystemd_fixed_path_verified=true",
      "libsystemd_fixed_path_verified=false",
    ),
    /native_truth_invalid:libsystemd_fixed_path_verified/u,
  ],
  [
    "wrong-parent",
    raw.replace("service_ppid=2693","service_ppid=9999"),
    /direct_parent_invalid/u,
  ],
  [
    "nnp-off",
    raw.replace("NoNewPrivileges=yes","NoNewPrivileges=no"),
    /runtime_nnp_invalid/u,
  ],
  [
    "caps",
    raw.replace(
      "CapabilityBoundingSet=",
      "CapabilityBoundingSet=cap_sys_admin",
    ),
    /runtime_bounding_set_invalid/u,
  ],
  [
    "mutation",
    raw.replace("host_mutation=false","host_mutation=true"),
    /native_non_authority_invalid:host_mutation/u,
  ],
]){
  assert.throws(
    ()=>classifyBuyVoidAllocationCustodyAuthenticatedUserServiceV3(
      bad,
      config,
    ),
    pattern,
    label,
  );
}

const nativeSource=fs.readFileSync(
  "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c",
  "utf8",
);
const parentGuardSource=fs.readFileSync(
  "ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c",
  "utf8",
);
assert.ok(parentGuardSource.includes("SO_PEERCRED"),"SO_PEERCRED");
assert.ok(parentGuardSource.includes("/systemd/private"),"/systemd/private");
for(const needle of [
  "LIBSYSTEMD_SONAME",
  "/usr/lib/x86_64-linux-gnu/libsystemd.so.0",
  "SANITIZED_ENV_MARKER",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "GLIBC_TUNABLES",
  "/proc/self/fd/%d",
  "dladdr",
  "sd_bus_set_fd",
  "sd_bus_set_bus_client",
  "sd_bus_start",
  "sd_bus_get_fd",
  "same_private_fd_used_for_query=true",
  "org.freedesktop.systemd1.Manager",
  "GetUnit",
  "org.freedesktop.systemd1.Service",
  "manager_generation_reverified=true",
  "service_generation_reverified=true",
]){
  assert.ok(nativeSource.includes(needle),needle);
}
assert.equal(nativeSource.includes("/run/user/%lu/bus"),false);
assert.equal(nativeSource.includes("systemctl"),false);

for(const [key,expected] of Object.entries({
  source_composition_only:true,
  authenticated_private_manager_peer_required:true,
  same_authenticated_connection_unit_query_required:true,
  sanitized_loader_environment_required:true,
  fixed_libsystemd_path_required:true,
  retained_libsystemd_descriptor_required:true,
  libsystemd_symbol_provenance_required:true,
  ambient_dynamic_loader_authority:false,
  manager_pidfd_required:true,
  service_pidfd_required:true,
  manager_generation_revalidation_required:true,
  service_generation_revalidation_required:true,
  user_manager_shape_adapter_reused:true,
  generic_user_bus_authority:false,
  complete_host_evidence_collector:false,
  custody_service_v2_source_binding_proven:false,
  custody_service_v2_config_binding_proven:false,
  request_root_host_profile_bound:false,
  storage_mount_evidence_bound:false,
  socket_runtime_directory_live_verified:false,
  polkit_runtime_control_denial_live_verified:false,
  double_census_stability_verified:false,
  host_mutation:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V3[key],
    expected,
    key,
  );
}

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V3_PROOF_GREEN",
);
console.log("manager_peer_authenticated=true");
console.log("same_authenticated_connection_unit_query=true");
console.log("sanitized_loader_environment=true");
console.log("libsystemd_fixed_path_verified=true");
console.log("libsystemd_retained_fd_load=true");
console.log("libsystemd_symbol_provenance_verified=true");
console.log("runtime_user_manager_identity_verified=true");
console.log("runtime_user_manager_cgroup_bound=true");
console.log("runtime_main_pid_kernel_bound=true");
console.log("complete_host_evidence_collector=false");
console.log("host_mutation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
