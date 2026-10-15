#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2,
  testOnlyBuildBuyVoidAllocationCustodyUserSystemctlInvocationV2,
  testOnlyNormalizeBuyVoidAllocationCustodyUserServiceShowV2,
} from "../tools/void-buy-allocation-custody-host-evidence-v2.mjs";

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2",
);

const invocation=testOnlyBuildBuyVoidAllocationCustodyUserSystemctlInvocationV2({
  runtime_user:"zoso",
  runtime_uid:1000,
  runtime_home:"/home/zoso",
  systemctl_args:["show","void-node-live.service","--no-pager","--property","User"],
});
assert.equal(invocation.command,"/usr/sbin/runuser");
assert.deepEqual(invocation.args,[
  "-u","zoso","--",
  "/usr/bin/env","-i",
  "HOME=/home/zoso",
  "XDG_RUNTIME_DIR=/run/user/1000",
  "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus",
  "PATH=/usr/sbin:/usr/bin:/sbin:/bin",
  "LANG=C","LC_ALL=C","TZ=UTC",
  "/usr/bin/systemctl","--user",
  "show","void-node-live.service","--no-pager","--property","User",
]);

const raw=[
  "User=",
  "Group=",
  "MainPID=4242",
  "ControlGroup=/user.slice/user-1000.slice/user@1000.service/app.slice/void-node-live.service",
  "NoNewPrivileges=yes",
  "CapabilityBoundingSet=",
  "AmbientCapabilities=",
  "",
].join("\n");
const normalized=testOnlyNormalizeBuyVoidAllocationCustodyUserServiceShowV2(raw,{
  runtime_user:"zoso",
  runtime_group:"zoso",
  runtime_uid:1000,
  runtime_service_unit:"void-node-live.service",
});
assert.equal(normalized,[
  "User=zoso",
  "Group=zoso",
  "MainPID=4242",
  "ControlGroup=/user.slice/user-1000.slice/user@1000.service/app.slice/void-node-live.service",
  "NoNewPrivileges=yes",
  "CapabilityBoundingSet=",
  "AmbientCapabilities=",
  "",
].join("\n"));

for(const [label,bad,pattern] of [
  ["explicit-user",raw.replace("User=","User=root"),/explicit_user_group_forbidden/u],
  ["explicit-group",raw.replace("Group=","Group=root"),/explicit_user_group_forbidden/u],
  ["wrong-cgroup",raw.replace("/app.slice/void-node-live.service","/app.slice/other.service"),/runtime_cgroup_invalid/u],
  ["nnp-off",raw.replace("NoNewPrivileges=yes","NoNewPrivileges=no"),/runtime_nnp_invalid/u],
  ["bounding-nonempty",raw.replace("CapabilityBoundingSet=","CapabilityBoundingSet=cap_sys_admin"),/runtime_bounding_set_invalid/u],
  ["ambient-nonempty",raw.replace("AmbientCapabilities=","AmbientCapabilities=cap_net_raw"),/runtime_ambient_caps_invalid/u],
]){
  assert.throws(
    ()=>testOnlyNormalizeBuyVoidAllocationCustodyUserServiceShowV2(bad,{
      runtime_user:"zoso",runtime_group:"zoso",runtime_uid:1000,
      runtime_service_unit:"void-node-live.service",
    }),
    pattern,label,
  );
}

const source=fs.readFileSync(
  path.resolve("tools/void-buy-allocation-custody-host-evidence-v2.mjs"),
  "utf8",
);
assert.match(source,/collectBuyVoidAllocationCustodyHostEvidenceV1/u);
assert.match(source,/runtime_service_manager!=="user"/u);
assert.match(source,/\/usr\/sbin\/runuser/u);
assert.match(source,/DBUS_SESSION_BUS_ADDRESS=unix:path=\/run\/user\//u);
assert.match(source,/\/usr\/bin\/systemctl","--user"/u);
assert.match(source,/assertUserServiceActive/u);
assert.match(source,/process\.geteuid\(\)!==0/u);
assert.match(source,/predecessor_v1_compatible_receipt_sha256/u);
for(const forbidden of [
  /writeFileSync/u,/appendFileSync/u,/chmodSync/u,/chownSync/u,
  /mkdirSync/u,/renameSync/u,/unlinkSync/u,
  /systemctl[^\n]*(?:start|stop|restart|enable|disable|daemon-reload)/u,
]){
  assert.doesNotMatch(source,forbidden);
}

for(const [key,expected] of Object.entries({
  source_only_tool:true,
  read_only_host_observation:true,
  v1_storage_mount_socket_source_engine_reused:true,
  user_systemd_runtime_manager_supported:true,
  exact_runtime_user_bus_required:true,
  runtime_user_manager_identity_derived:true,
  runtime_user_manager_cgroup_bound:true,
  implicit_user_unit_identity_normalized_only_after_verification:true,
  root_execution_required_for_live_collection:true,
  runtime_service_mutation:false,
  custody_service_mutation:false,
  daemon_reload:false,
  filesystem_write:false,
  mount_mutation:false,
  permission_mutation:false,
  credential_access:false,
  private_key_access:false,
  wallet_or_signer_access:false,
  rpc_call:false,
  network_call:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V2[key],expected,key);
}

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2_PROOF_GREEN");
console.log("runtime_service_manager=user");
console.log("user_manager_bus_exact=true");
console.log("implicit_user_group_normalized_after_cgroup_verification=true");
console.log("v1_storage_mount_socket_source_engine_reused=true");
console.log("host_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
