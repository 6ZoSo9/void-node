#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_SCHEMA_V1,
  VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_V1,
  classifyVoidEconomicSponsoredRuntimeStorageTopologyPolicyV1,
} from "../tools/void-economic-sponsored-runtime-storage-topology-policy-v1.mjs";

const ROOT=process.cwd();
const SELECTION=
  "ops/mainnet0/economic-sponsored-runtime-storage-production-selection-v1.json";
const POLICY="tools/void-economic-sponsored-runtime-storage-topology-policy-v1.mjs";
const HISTORICAL_REPLAY=
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-v1.json";

const EXPECTED_BLOBS=Object.freeze({
  [SELECTION]:"2d609f5fdcd10be767ad5518bc3188dff45d1fea",
  [POLICY]:"df6464ac119d88004a75613568c7a64fa01ca4de",
  [HISTORICAL_REPLAY]:"ab7982b52fb0850eb2f1e796c88dcd7a7c743b6c",
});

const EXPECTED_SELECTION_ID=
  "voidsponsoredstoreselect1_0224ed5a5cb20670e4b12259f0871357ebb8b52478702a98dd80edbf1d3ae938";
const PROOF_UID=41001;
const PROOF_GID=41001;

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes)
    .digest("hex");
}
function sha256(bytes){
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="string")return JSON.stringify(value);
  if(typeof value==="number"){
    assert.ok(Number.isSafeInteger(value),"noncanonical_number");
    return String(value);
  }
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  assert.ok(value&&typeof value==="object"&&!Array.isArray(value),"noncanonical_value");
  return "{"+Object.keys(value).sort()
    .map((key)=>JSON.stringify(key)+":"+canonical(value[key])).join(",")+"}";
}

for(const [relative,expected] of Object.entries(EXPECTED_BLOBS)){
  assert.equal(
    gitBlob(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    "blob_drift:"+relative,
  );
}

const selection=JSON.parse(fs.readFileSync(path.join(ROOT,SELECTION),"utf8"));
const expectedTopKeys=[
  "marker","schema","version","status","service","storage",
  "historical_user_home_replay_root_reused",
  "production_service_identity_selected",
  "production_account_names_selected",
  "production_runtime_uid_gid_selected",
  "production_root_paths_selected",
  "live_host_evidence_verified",
  "storage_bootstrap","service_installation","service_start",
  "systemd_mutation","filesystem_mutation",
  "time_store_root_stability_proven",
  "reservation_store_root_stability_proven",
  "execution_replay_store_root_stability_proven",
  "runtime_integration","gas_sponsorship_performed",
  "transaction_submission","public_presale_activation",
  "work_credit_write","funds_movement","next_action","selection_id",
].sort();
assert.deepEqual(Object.keys(selection).sort(),expectedTopKeys);

assert.equal(
  selection.marker,
  "VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_PRODUCTION_SELECTION_V1",
);
assert.equal(
  selection.schema,
  "void_economic_sponsored_runtime_storage_production_selection_v1",
);
assert.equal(selection.version,1);
assert.equal(
  selection.status,
  "PRODUCTION_NAMES_AND_ROOTS_SELECTED_NOT_PROVISIONED",
);

assert.deepEqual(Object.keys(selection.service).sort(),[
  "group","manager_scope","runtime_gid","runtime_uid",
  "unit","unit_install_path","user",
].sort());
assert.equal(selection.service.unit,"void-economic-sponsored-runtime-v1.service");
assert.equal(selection.service.user,"void-sponsored-runtime");
assert.equal(selection.service.group,"void-sponsored-runtime");
assert.equal(selection.service.manager_scope,"system");
assert.equal(
  selection.service.unit_install_path,
  "/etc/systemd/system/void-economic-sponsored-runtime-v1.service",
);
assert.equal(selection.service.runtime_uid,null);
assert.equal(selection.service.runtime_gid,null);
assert.match(selection.service.user,/^[a-z_][a-z0-9_-]{0,31}$/u);
assert.match(selection.service.group,/^[a-z_][a-z0-9_-]{0,31}$/u);

assert.deepEqual(Object.keys(selection.storage).sort(),[
  "parent_mode","parent_owner_gid","parent_owner_uid","parent_root",
  "replay_children","replay_root","reservation_children","reservation_root",
  "runtime_root_mode","time_children","time_root",
].sort());
assert.equal(
  selection.storage.parent_root,
  "/var/lib/void-economic-sponsored-runtime-v1",
);
assert.equal(selection.storage.parent_owner_uid,0);
assert.equal(selection.storage.parent_owner_gid,0);
assert.equal(selection.storage.parent_mode,"0755");
assert.equal(selection.storage.runtime_root_mode,"0700");

const expectedRoots={
  time:"/var/lib/void-economic-sponsored-runtime-v1/time",
  reservation:"/var/lib/void-economic-sponsored-runtime-v1/reservation",
  replay:"/var/lib/void-economic-sponsored-runtime-v1/replay",
};
assert.equal(selection.storage.time_root,expectedRoots.time);
assert.equal(selection.storage.reservation_root,expectedRoots.reservation);
assert.equal(selection.storage.replay_root,expectedRoots.replay);
assert.deepEqual(selection.storage.time_children,[
  "observation-time-v1.queue","records",
]);
assert.deepEqual(selection.storage.reservation_children,[
  "records","sponsorship-admission-v1.queue",
]);
assert.deepEqual(selection.storage.replay_children,[]);

const roots=Object.values(expectedRoots);
assert.equal(new Set(roots).size,3);
for(const root of roots){
  assert.equal(path.posix.dirname(root),selection.storage.parent_root);
  assert.equal(root.startsWith("/home/"),false);
  assert.equal(root.startsWith("/tmp/"),false);
  assert.equal(root.startsWith("/run/"),false);
}

const historical=JSON.parse(
  fs.readFileSync(path.join(ROOT,HISTORICAL_REPLAY),"utf8"),
);
const historicalReplay=historical.runtime_evidence.replay_root;
assert.equal(
  historicalReplay,
  "/home/zoso/.local/state/void-economic-epoch2-public-submission-gateway-v1/replay-v1",
);
assert.equal(roots.includes(historicalReplay),false);
assert.equal(selection.historical_user_home_replay_root_reused,false);

assert.equal(selection.production_service_identity_selected,true);
assert.equal(selection.production_account_names_selected,true);
assert.equal(selection.production_runtime_uid_gid_selected,false);
assert.equal(selection.production_root_paths_selected,true);
for(const key of [
  "live_host_evidence_verified",
  "storage_bootstrap",
  "service_installation",
  "service_start",
  "systemd_mutation",
  "filesystem_mutation",
  "time_store_root_stability_proven",
  "reservation_store_root_stability_proven",
  "execution_replay_store_root_stability_proven",
  "runtime_integration",
  "gas_sponsorship_performed",
  "transaction_submission",
  "public_presale_activation",
  "work_credit_write",
  "funds_movement",
]){
  assert.equal(selection[key],false,key);
}
assert.equal(
  selection.next_action,
  "BUILD_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V1",
);

const body=structuredClone(selection);
delete body.selection_id;
assert.equal(
  "voidsponsoredstoreselect1_"+sha256(Buffer.from(canonical(body),"utf8")),
  EXPECTED_SELECTION_ID,
);
assert.equal(selection.selection_id,EXPECTED_SELECTION_ID);

function ancestorsFor(rootPath){
  const rows=[];
  let cursor=path.posix.dirname(rootPath);
  while(true){
    rows.push({
      path:cursor,
      owner_uid:0,
      owner_gid:0,
      mode:"0755",
      real_directory:true,
      symlink:false,
      runtime_write:false,
      runtime_rename:false,
      runtime_recreate:false,
    });
    const parent=path.posix.dirname(cursor);
    if(parent===cursor)break;
    cursor=parent;
  }
  return rows;
}
function child(name){
  return {
    name,
    owner_uid:PROOF_UID,
    owner_gid:PROOF_GID,
    mode:"0700",
    real_directory:true,
    symlink:false,
    preprovisioned:true,
  };
}
function root(role,rootPath,children){
  return {
    role,
    root_path:rootPath,
    owner_uid:PROOF_UID,
    owner_gid:PROOF_GID,
    mode:"0700",
    real_directory:true,
    symlink:false,
    preprovisioned:true,
    runtime_write_required:true,
    runtime_can_replace_root:false,
    children:children.map(child),
    ancestors:ancestorsFor(rootPath),
  };
}
const topology={
  schema:VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_SCHEMA_V1,
  marker:VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_V1,
  version:1,
  runtime:{
    service_unit:selection.service.unit,
    manager_scope:"system",
    uid:PROOF_UID,
    gid:PROOF_GID,
    service_definition_root_owned:true,
    service_definition_group_other_writable:false,
    runtime_can_control_service:false,
    no_new_privileges:true,
    effective_capabilities_empty:true,
    ambient_capabilities_empty:true,
    bounding_capabilities_empty:true,
  },
  time_store:root("time",selection.storage.time_root,selection.storage.time_children),
  reservation_store:root(
    "reservation",
    selection.storage.reservation_root,
    selection.storage.reservation_children,
  ),
  replay_store:root("replay",selection.storage.replay_root,[]),
};
const policy=classifyVoidEconomicSponsoredRuntimeStorageTopologyPolicyV1(topology);
assert.equal(policy.ok,true);
assert.equal(policy.status,"POLICY_SHAPE_QUALIFIED_NOT_LIVE");
assert.equal(policy.production_service_identity_selected,false);
assert.equal(policy.production_runtime_uid_gid_selected,false);
assert.equal(policy.production_root_paths_selected,false);
assert.equal(policy.live_host_evidence_verified,false);
assert.equal(policy.storage_bootstrap,false);
assert.equal(policy.runtime_integration,false);
assert.equal(policy.public_presale_activation,false);
assert.equal(policy.funds_movement,false);

// The numeric IDs above are proof fixtures only and must never leak into the
// production selection object.
assert.equal(JSON.stringify(selection).includes(String(PROOF_UID)),false);
assert.equal(JSON.stringify(selection).includes(String(PROOF_GID)),false);

function invalid(mutator){
  const copy=structuredClone(selection);
  mutator(copy);
  return copy;
}
assert.notEqual(
  invalid((x)=>{x.service.runtime_uid=PROOF_UID;}).service.runtime_uid,
  selection.service.runtime_uid,
);
assert.notEqual(
  invalid((x)=>{x.storage.replay_root=historicalReplay;})
    .storage.replay_root,
  selection.storage.replay_root,
);

console.log(
  "VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_PRODUCTION_SELECTION_V1_PROOF_GREEN",
);
console.log("selection_id="+selection.selection_id);
console.log("service_unit_selected="+selection.service.unit);
console.log("service_account_name_selected=true");
console.log("service_group_name_selected=true");
console.log("production_runtime_uid_gid_selected=false");
console.log("production_root_paths_selected=true");
console.log("root_parent_selected="+selection.storage.parent_root);
console.log("time_root_selected="+selection.storage.time_root);
console.log("reservation_root_selected="+selection.storage.reservation_root);
console.log("replay_root_selected="+selection.storage.replay_root);
console.log("historical_user_home_replay_root_reused=false");
console.log("selected_paths_policy_shape_qualified=true");
console.log("proof_only_numeric_identity_not_production=true");
console.log("live_host_evidence_verified=false");
console.log("storage_bootstrap=false");
console.log("service_installation=false");
console.log("systemd_mutation=false");
console.log("filesystem_mutation=false");
console.log("runtime_integration=false");
console.log("gas_sponsorship_performed=false");
console.log("public_presale_activation=false");
console.log("work_credit_write=false");
console.log("funds_movement=false");
console.log("next_action="+selection.next_action);
