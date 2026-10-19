#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_AUTHORITY_V1,
  VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_DEPENDENCIES_V1,
  VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_SCHEMA_V1,
  VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_V1,
  classifyVoidEconomicSponsoredRuntimeStorageTopologyPolicyV1,
} from "../tools/void-economic-sponsored-runtime-storage-topology-policy-v1.mjs";

const ROOT=process.cwd();
const EXPECTED_BLOBS=Object.freeze({
  "tools/void-economic-sponsored-runtime-storage-topology-policy-v1.mjs":
    "df6464ac119d88004a75613568c7a64fa01ca4de",
  "tools/void-economic-system-sponsored-observation-time-store-v1.mjs":
    "53f0bae06b3361088712eaf6ef6d17e5d9c676de",
  "tools/void-economic-system-sponsored-reservation-store-v1.mjs":
    "8804c99ccdcf4fbcd2becb11689ccfa90b0391f8",
  "tools/void-economic-epoch2-durable-replay-store-v1.mjs":
    "2b267e11d087bec0e0a56825dce9f998d5bc3ad5",
  "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-v1.json":
    "ab7982b52fb0850eb2f1e796c88dcd7a7c743b6c",
});

function gitBlobSha1(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`,"ascii"))
    .update(bytes)
    .digest("hex");
}
for(const [relative,expected] of Object.entries(EXPECTED_BLOBS)){
  assert.equal(
    gitBlobSha1(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    relative,
  );
}

assert.deepEqual(
  VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_DEPENDENCIES_V1,
  {
    observation_time_store_git_blob_sha1:
      "53f0bae06b3361088712eaf6ef6d17e5d9c676de",
    reservation_store_git_blob_sha1:
      "8804c99ccdcf4fbcd2becb11689ccfa90b0391f8",
    durable_replay_store_git_blob_sha1:
      "2b267e11d087bec0e0a56825dce9f998d5bc3ad5",
    production_replay_binding_artifact_git_blob_sha1:
      "ab7982b52fb0850eb2f1e796c88dcd7a7c743b6c",
  },
);

const runtimeUid=41001;
const runtimeGid=41001;

function ancestorsFor(rootPath,{runtimeOwned=false}={}){
  const rows=[];
  let cursor=path.dirname(rootPath);
  while(true){
    const ownedByRuntime=
      runtimeOwned &&
      (cursor==="/home/zoso" || cursor.startsWith("/home/zoso/"));
    rows.push({
      path:cursor,
      owner_uid:ownedByRuntime?runtimeUid:0,
      owner_gid:ownedByRuntime?runtimeGid:0,
      mode:ownedByRuntime?"0700":"0755",
      real_directory:true,
      symlink:false,
      runtime_write:ownedByRuntime,
      runtime_rename:ownedByRuntime,
      runtime_recreate:ownedByRuntime,
    });
    const parent=path.dirname(cursor);
    if(parent===cursor)break;
    cursor=parent;
  }
  return rows;
}
function child(name){
  return {
    name,
    owner_uid:runtimeUid,
    owner_gid:runtimeGid,
    mode:"0700",
    real_directory:true,
    symlink:false,
    preprovisioned:true,
  };
}
function root(role,rootPath){
  const children=
    role==="time"
      ?[child("observation-time-v1.queue"),child("records")]
      :role==="reservation"
        ?[child("records"),child("sponsorship-admission-v1.queue")]
        :[];
  return {
    role,
    root_path:rootPath,
    owner_uid:runtimeUid,
    owner_gid:runtimeGid,
    mode:"0700",
    real_directory:true,
    symlink:false,
    preprovisioned:true,
    runtime_write_required:true,
    runtime_can_replace_root:false,
    children,
    ancestors:ancestorsFor(rootPath),
  };
}
function topology(){
  return {
    schema:
      VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_SCHEMA_V1,
    marker:VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_V1,
    version:1,
    runtime:{
      service_unit:"proof-sponsored-runtime.service",
      manager_scope:"system",
      uid:runtimeUid,
      gid:runtimeGid,
      service_definition_root_owned:true,
      service_definition_group_other_writable:false,
      runtime_can_control_service:false,
      no_new_privileges:true,
      effective_capabilities_empty:true,
      ambient_capabilities_empty:true,
      bounding_capabilities_empty:true,
    },
    time_store:root(
      "time",
      "/proof/void-sponsored-runtime-v1/time",
    ),
    reservation_store:root(
      "reservation",
      "/proof/void-sponsored-runtime-v1/reservation",
    ),
    replay_store:root(
      "replay",
      "/proof/void-sponsored-runtime-v1/replay",
    ),
  };
}

const accepted=
  classifyVoidEconomicSponsoredRuntimeStorageTopologyPolicyV1(topology());
assert.equal(accepted.ok,true);
assert.equal(accepted.status,"POLICY_SHAPE_QUALIFIED_NOT_LIVE");
assert.equal(accepted.runtime_service_policy_shape_qualified,true);
assert.equal(accepted.zero_runtime_capabilities_policy_shape_qualified,true);
assert.equal(accepted.time_store_topology_policy_shape_qualified,true);
assert.equal(accepted.reservation_store_topology_policy_shape_qualified,true);
assert.equal(accepted.execution_replay_store_topology_policy_shape_qualified,true);
assert.equal(accepted.pairwise_disjoint_roots_qualified,true);
assert.equal(accepted.preprovisioned_store_children_policy_shape_qualified,true);
assert.equal(accepted.root_owned_ancestor_policy_shape_qualified,true);
assert.equal(accepted.runtime_root_replacement_denied_policy_shape_qualified,true);
assert.equal(accepted.historical_same_uid_home_replay_topology_accepted,false);
assert.equal(accepted.production_service_identity_selected,false);
assert.equal(accepted.production_runtime_uid_gid_selected,false);
assert.equal(accepted.production_root_paths_selected,false);
assert.equal(accepted.live_host_evidence_verified,false);
assert.equal(accepted.time_store_root_stability_proven,false);
assert.equal(accepted.reservation_store_root_stability_proven,false);
assert.equal(accepted.execution_replay_store_root_stability_proven,false);
assert.equal(accepted.time_store_rollback_resistance_proven,false);
assert.equal(accepted.cross_process_restart_continuity_proven,false);
assert.equal(accepted.cross_boot_restart_continuity_proven,false);
assert.equal(accepted.execution_replay_atomic_consume_performed,false);
assert.equal(accepted.storage_bootstrap,false);
assert.equal(accepted.runtime_integration,false);
assert.equal(accepted.funds_movement,false);

function expectHold(mutator,reason){
  const value=structuredClone(topology());
  mutator(value);
  const result=
    classifyVoidEconomicSponsoredRuntimeStorageTopologyPolicyV1(value);
  assert.equal(result.ok,false,reason);
  assert.equal(result.status,"HOLD",reason);
  assert.equal(result.reason,reason);
  assert.equal(result.live_host_evidence_verified,false);
  assert.equal(result.time_store_root_stability_proven,false);
  assert.equal(result.reservation_store_root_stability_proven,false);
  assert.equal(result.execution_replay_store_root_stability_proven,false);
  assert.equal(result.time_store_rollback_resistance_proven,false);
  assert.equal(result.cross_process_restart_continuity_proven,false);
  assert.equal(result.cross_boot_restart_continuity_proven,false);
  assert.equal(result.execution_replay_atomic_consume_performed,false);
  assert.equal(result.runtime_integration,false);
  assert.equal(result.funds_movement,false);
}
expectHold(
  (x)=>{x.runtime.manager_scope="user";},
  "sponsored_runtime_storage_topology_runtime_service_invalid",
);
expectHold(
  (x)=>{x.runtime.uid=0;},
  "sponsored_runtime_storage_topology_runtime_uid_invalid",
);
expectHold(
  (x)=>{x.runtime.runtime_can_control_service=true;},
  "sponsored_runtime_storage_topology_runtime_service_control_invalid",
);
expectHold(
  (x)=>{x.runtime.effective_capabilities_empty=false;},
  "sponsored_runtime_storage_topology_runtime_capabilities_invalid",
);
expectHold(
  (x)=>{x.runtime.ambient_capabilities_empty=false;},
  "sponsored_runtime_storage_topology_runtime_capabilities_invalid",
);
expectHold(
  (x)=>{x.runtime.bounding_capabilities_empty=false;},
  "sponsored_runtime_storage_topology_runtime_capabilities_invalid",
);
expectHold(
  (x)=>{x.time_store.owner_uid=0;},
  "sponsored_runtime_storage_topology_root_owner_mode_invalid",
);
expectHold(
  (x)=>{x.time_store.mode="0750";},
  "sponsored_runtime_storage_topology_root_owner_mode_invalid",
);
expectHold(
  (x)=>{x.time_store.runtime_can_replace_root=true;},
  "sponsored_runtime_storage_topology_root_replace_invalid",
);
expectHold(
  (x)=>{x.time_store.children.pop();},
  "sponsored_runtime_storage_topology_children_invalid",
);
expectHold(
  (x)=>{x.reservation_store.children[0].mode="0750";},
  "sponsored_runtime_storage_topology_child_owner_mode_invalid",
);
expectHold(
  (x)=>{
    x.replay_store.root_path=x.time_store.root_path;
    x.replay_store.ancestors=structuredClone(x.time_store.ancestors);
  },
  "sponsored_runtime_storage_topology_roots_not_disjoint",
);
expectHold(
  (x)=>{x.replay_store.root_path=x.time_store.root_path+"/replay";},
  "sponsored_runtime_storage_topology_ancestor_chain_incomplete",
);
expectHold(
  (x)=>{x.time_store.ancestors.shift();},
  "sponsored_runtime_storage_topology_ancestor_chain_incomplete",
);
expectHold(
  (x)=>{x.time_store.ancestors[0].owner_uid=runtimeUid;},
  "sponsored_runtime_storage_topology_ancestor_owner_invalid",
);
expectHold(
  (x)=>{x.time_store.ancestors[0].mode="0775";},
  "sponsored_runtime_storage_topology_ancestor_writable",
);
expectHold(
  (x)=>{x.time_store.ancestors[0].runtime_rename=true;},
  "sponsored_runtime_storage_topology_ancestor_runtime_authority_invalid",
);
expectHold(
  (x)=>{x.extra=true;},
  "sponsored_runtime_storage_topology_input_invalid",
);

const replayBinding=JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "ops/mainnet0/economic-epoch2-production-gateway-replay-binding-v1.json",
    ),
    "utf8",
  ),
);
assert.equal(
  replayBinding.threat_model.hostile_same_uid_namespace_race_not_closed,
  true,
);
assert.equal(
  replayBinding.runtime_evidence.replay_root,
  "/home/zoso/.local/state/void-economic-epoch2-public-submission-gateway-v1/replay-v1",
);
{
  const legacy=structuredClone(topology());
  legacy.replay_store.root_path=replayBinding.runtime_evidence.replay_root;
  legacy.replay_store.ancestors=ancestorsFor(
    legacy.replay_store.root_path,
    {runtimeOwned:true},
  );
  const result=
    classifyVoidEconomicSponsoredRuntimeStorageTopologyPolicyV1(legacy);
  assert.equal(result.ok,false);
  assert.equal(
    result.reason,
    "sponsored_runtime_storage_topology_ancestor_owner_invalid",
  );
  assert.equal(result.historical_same_uid_home_replay_topology_accepted,false);
}

for(const [key,expected] of Object.entries({
  source_contract:true,
  three_root_custody_policy_required:true,
  distinct_non_root_runtime_identity_required:true,
  protected_system_service_policy_required:true,
  zero_runtime_capabilities_required:true,
  pairwise_disjoint_roots_required:true,
  runtime_owned_private_roots_required:true,
  preprovisioned_store_children_required:true,
  complete_root_ancestor_chain_required:true,
  root_owned_nonwritable_ancestors_required:true,
  runtime_root_replacement_denied_required:true,
  historical_same_uid_home_replay_topology_accepted:false,
  production_service_identity_selected:false,
  production_runtime_uid_gid_selected:false,
  production_root_paths_selected:false,
  live_host_evidence_verified:false,
  time_store_root_stability_proven:false,
  reservation_store_root_stability_proven:false,
  execution_replay_store_root_stability_proven:false,
  time_store_rollback_resistance_proven:false,
  cross_process_restart_continuity_proven:false,
  cross_boot_restart_continuity_proven:false,
  execution_replay_atomic_consume_performed:false,
  storage_bootstrap:false,
  service_installation:false,
  service_start:false,
  systemd_mutation:false,
  filesystem_mutation:false,
  runtime_integration:false,
  gas_sponsorship_performed:false,
  wallet_or_signer_access:false,
  transaction_construction:false,
  transaction_signing:false,
  transaction_submission:false,
  transaction_broadcast:false,
  authoritative_chain2050_write:false,
  public_presale_activation:false,
  work_credit_write:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_AUTHORITY_V1[key],
    expected,
    key,
  );
}

console.log("VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_TOPOLOGY_POLICY_V1_GREEN");
console.log("three_root_custody_policy_shape_qualified=true");
console.log("preprovisioned_store_children_required=true");
console.log("complete_root_ancestor_chain_required=true");
console.log("root_owned_nonwritable_ancestors_required=true");
console.log("zero_runtime_capabilities_required=true");
console.log("historical_same_uid_home_replay_topology_accepted=false");
console.log("production_service_identity_selected=false");
console.log("production_root_paths_selected=false");
console.log("live_host_evidence_verified=false");
console.log("time_store_rollback_resistance_proven=false");
console.log("cross_process_restart_continuity_proven=false");
console.log("execution_replay_atomic_consume_performed=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
