#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2,
  buildBuyVoidAllocationCustodyUserSystemctlInvocationV2,
  normalizeBuyVoidAllocationCustodyUserServiceShowV2,
} from "../tools/void-buy-allocation-custody-host-evidence-v2.mjs";

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2",
);

const invocation=buildBuyVoidAllocationCustodyUserSystemctlInvocationV2({
  runtime_user:"zoso",
  runtime_uid:1000,
  runtime_home:"/home/zoso",
  systemctl_args:[
    "show","void-node-live.service","--no-pager",
    "--property","LoadState",
    "--property","ActiveState",
    "--property","SubState",
    "--property","User",
    "--property","Group",
    "--property","MainPID",
    "--property","ControlGroup",
    "--property","NoNewPrivileges",
    "--property","CapabilityBoundingSet",
    "--property","AmbientCapabilities",
  ],
});
assert.equal(invocation.command,"/usr/sbin/runuser");
assert.deepEqual(invocation.args.slice(0,17),[
  "-u","zoso","--",
  "/usr/bin/env","-i",
  "HOME=/home/zoso",
  "XDG_RUNTIME_DIR=/run/user/1000",
  "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus",
  "PATH=/usr/sbin:/usr/bin:/sbin:/bin",
  "LANG=C","LC_ALL=C","TZ=UTC",
  "/usr/bin/systemctl","--user",
  "show","void-node-live.service","--no-pager",
]);

const raw=[
  "LoadState=loaded",
  "ActiveState=active",
  "SubState=running",
  "User=",
  "Group=",
  "MainPID=4242",
  "ControlGroup=/user.slice/user-1000.slice/user@1000.service/app.slice/void-node-live.service",
  "NoNewPrivileges=yes",
  "CapabilityBoundingSet=",
  "AmbientCapabilities=",
  "",
].join("\n");
const normalized=normalizeBuyVoidAllocationCustodyUserServiceShowV2(raw,{
  runtime_user:"zoso",
  runtime_group:"zoso",
  runtime_uid:1000,
  runtime_service_unit:"void-node-live.service",
});
assert.equal(normalized.runtime_service_manager,"user");
assert.equal(normalized.runtime_user,"zoso");
assert.equal(normalized.runtime_group,"zoso");
assert.equal(normalized.main_pid,4242);
assert.equal(normalized.no_new_privileges,true);
assert.deepEqual(normalized.capability_bounding_set,[]);
assert.deepEqual(normalized.ambient_capabilities,[]);
assert.equal(normalized.reported_control_group_shape_validated,true);
assert.equal(normalized.manager_peer_authenticated,false);
assert.equal(normalized.runtime_user_manager_identity_verified,false);
assert.equal(normalized.runtime_user_manager_cgroup_bound,false);
assert.equal(
  normalized.identity_normalization,
  "untrusted_user_systemctl_shape_only_v2",
);
assert.equal(normalized.production_host_evidence_authority,false);

// A same-UID fake D-Bus peer can return byte-identical systemctl text. This
// syntax adapter must therefore classify the exact accepted shape without ever
// promoting the transport peer or reported cgroup to authenticated authority.
const fakeBusNormalized=normalizeBuyVoidAllocationCustodyUserServiceShowV2(
  String(raw),
  {
    runtime_user:"zoso",
    runtime_group:"zoso",
    runtime_uid:1000,
    runtime_service_unit:"void-node-live.service",
  },
);
assert.equal(fakeBusNormalized.main_pid,4242);
assert.equal(
  fakeBusNormalized.control_group,
  "/user.slice/user-1000.slice/user@1000.service/app.slice/void-node-live.service",
);
assert.equal(fakeBusNormalized.manager_peer_authenticated,false);
assert.equal(fakeBusNormalized.runtime_user_manager_identity_verified,false);
assert.equal(fakeBusNormalized.runtime_user_manager_cgroup_bound,false);
assert.equal(fakeBusNormalized.production_host_evidence_authority,false);

for(const [label,bad,pattern] of [
  ["inactive",raw.replace("ActiveState=active","ActiveState=inactive"),/runtime_service_not_active/u],
  ["explicit-user",raw.replace("User=","User=root"),/explicit_user_group_forbidden/u],
  ["explicit-group",raw.replace("Group=","Group=root"),/explicit_user_group_forbidden/u],
  ["wrong-cgroup",raw.replace("/app.slice/void-node-live.service","/app.slice/other.service"),/runtime_cgroup_invalid/u],
  ["nnp-off",raw.replace("NoNewPrivileges=yes","NoNewPrivileges=no"),/runtime_nnp_invalid/u],
  ["bounding-nonempty",raw.replace("CapabilityBoundingSet=","CapabilityBoundingSet=cap_sys_admin"),/runtime_bounding_set_invalid/u],
  ["ambient-nonempty",raw.replace("AmbientCapabilities=","AmbientCapabilities=cap_net_raw"),/runtime_ambient_caps_invalid/u],
]){
  assert.throws(
    ()=>normalizeBuyVoidAllocationCustodyUserServiceShowV2(bad,{
      runtime_user:"zoso",runtime_group:"zoso",runtime_uid:1000,
      runtime_service_unit:"void-node-live.service",
    }),
    pattern,label,
  );
}

const source=fs.readFileSync(
  "tools/void-buy-allocation-custody-host-evidence-v2.mjs",
  "utf8",
);
assert.doesNotMatch(source,/node:(?:fs|child_process|net|http|https)/u);
assert.doesNotMatch(source,/collectBuyVoidAllocationCustodyHostEvidenceV1/u);
assert.doesNotMatch(source,/execFile|spawnSync|systemctl\([^)]/u);
assert.match(source,/\/usr\/sbin\/runuser/u);
assert.match(source,/DBUS_SESSION_BUS_ADDRESS=unix:path=\/run\/user\//u);
assert.match(source,/\/usr\/bin\/systemctl","--user"/u);
assert.match(source,/production_host_evidence_authority:false/u);

for(const [key,expected] of Object.entries({
  source_policy_only:true,
  runtime_manager_adapter_only:true,
  read_only_observation_plan:true,
  user_systemd_runtime_manager_supported:true,
  exact_runtime_user_bus_required:true,
  exact_runtime_user_bus_path_selected:true,
  manager_peer_authenticated:false,
  runtime_user_manager_identity_derived:false,
  runtime_user_manager_cgroup_bound:false,
  reported_control_group_shape_validated:true,
  implicit_user_unit_identity_normalized_only_after_verification:false,
  v1_host_collector_reused:false,
  complete_host_evidence_collector:false,
  service_v2_source_binding_proven:false,
  service_v2_config_binding_proven:false,
  custody_service_runtime_directory_policy_bound:false,
  host_read_performed:false,
  host_mutation:false,
  filesystem_write:false,
  service_mutation:false,
  systemd_mutation:false,
  daemon_reload:false,
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
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_AUTHORITY_V2[key],
    expected,key,
  );
}

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_V2_PROOF_GREEN");
console.log("runtime_manager_adapter_only=true");
console.log("runtime_service_manager=user");
console.log("user_manager_bus_path_selected=true");
console.log("manager_peer_authenticated=false");
console.log("runtime_user_manager_identity_verified=false");
console.log("runtime_user_manager_cgroup_bound=false");
console.log("fake_same_uid_bus_cannot_promote_authority=true");
console.log("complete_host_evidence_collector=false");
console.log("service_v2_source_binding_proven=false");
console.log("service_v2_config_binding_proven=false");
console.log("host_mutation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
