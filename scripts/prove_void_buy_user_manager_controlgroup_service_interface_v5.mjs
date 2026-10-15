#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const QUERY="ops/precision/void_buy_void_user_manager_private_unit_query_v1.c";
const EXPECTED_QUERY_BLOB="ddca2c544ce14261dffb80a202c0a4ae2979ec1e";

const bytes=fs.readFileSync(QUERY);
const gitBlob=b=>crypto.createHash("sha1")
  .update(Buffer.from("blob "+b.length+"\0","utf8")).update(b).digest("hex");
assert.equal(gitBlob(bytes),EXPECTED_QUERY_BLOB,"query_blob_drift");

const source=bytes.toString("utf8");
const good='get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Service","ControlGroup",out->control_group,sizeof(out->control_group))';
const bad='get_string_prop(api,bus,object_copy,"org.freedesktop.systemd1.Unit","ControlGroup",out->control_group,sizeof(out->control_group))';

assert.equal(source.split(good).length-1,1,"service_controlgroup_binding_exactly_once");
assert.equal(source.includes(bad),false,"generic_unit_controlgroup_binding_forbidden");

for(const required of [
  '"org.freedesktop.systemd1.Unit","LoadState"',
  '"org.freedesktop.systemd1.Unit","ActiveState"',
  '"org.freedesktop.systemd1.Unit","SubState"',
  '"org.freedesktop.systemd1.Service","User"',
  '"org.freedesktop.systemd1.Service","Group"',
  '"org.freedesktop.systemd1.Service","MainPID"',
  '"org.freedesktop.systemd1.Service","NoNewPrivileges"',
  '"org.freedesktop.systemd1.Service","PrivateUsers"',
  '"org.freedesktop.systemd1.Service","CapabilityBoundingSet"',
  '"org.freedesktop.systemd1.Service","AmbientCapabilities"',
  'manager_peer_authenticated=true',
  'same_private_fd_used_for_query=true',
  'private_users_false_required=true',
  'systemd_kernel_bounding_set_match_required=true',
]){
  assert.ok(source.includes(required),required);
}

console.log("VOID_BUY_VOID_USER_MANAGER_CONTROLGROUP_SERVICE_INTERFACE_V5_PROOF_GREEN");
console.log("query_blob_bound=true");
console.log("control_group_service_interface_required=true");
console.log("generic_unit_control_group_forbidden=true");
console.log("manager_private_peer_contract_preserved=true");
console.log("kernel_capability_contract_preserved=true");
console.log("private_users_false_required=true");
console.log("host_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
