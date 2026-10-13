#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import {
  VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V1,
  VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V1,
  VOID_APOLLYON_CUSTODY_REVIEWED_SOURCE_V1,
  qualifyApollyonCustodyHostPolicyV1,
} from "../tools/apollyon-custody-host-policy-qualification-v1.mjs";

const TOOL=fileURLToPath(
  new URL("../tools/apollyon-custody-host-policy-qualification-v1.mjs",import.meta.url),
);

const now=1_800_000_000_000;

function fixture(){
  return {
    marker:VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V1,
    version:1,
    target_host:"Xiphos",
    verification_now_ms:now,
    evidence_snapshot:{
      observed_at_ms:now-10_000,
      expires_at_ms:now+120_000,
      evidence_generation:7,
      boot_id_sha256:"11".repeat(32),
    },
    source_binding:{...VOID_APOLLYON_CUSTODY_REVIEWED_SOURCE_V1},
    identities:{
      training_uid:1000,
      training_gid:1000,
      custody_uid:994,
      custody_gid:981,
      ipc_gid:980,
      training_supplementary_gids:[980],
      custody_supplementary_gids:[980],
    },
    state_root:{
      owner_uid:994,
      owner_gid:981,
      mode:"0700",
      direct:true,
      symlink:false,
      realpath_canonical:true,
      retained_ancestor_count:4,
      retained_ancestors_root_owned:true,
      retained_ancestors_direct:true,
      retained_ancestors_symlink_free:true,
      retained_ancestors_group_other_writable:false,
      training_uid_write_denied:true,
      training_uid_rename_unlink_denied:true,
    },
    consumed_directory:{
      owner_uid:994,
      owner_gid:981,
      mode:"0700",
      direct:true,
      symlink:false,
      parent_bound_to_state_root:true,
      training_uid_write_denied:true,
      training_uid_rename_unlink_denied:true,
    },
    socket_parent:{
      owner_uid:994,
      owner_gid:980,
      mode:"0750",
      direct:true,
      symlink:false,
      custody_uid_write_allowed:true,
      training_uid_traverse_allowed:true,
      training_uid_write_denied:true,
    },
    socket:{
      owner_uid:994,
      owner_gid:980,
      mode:"0660",
      type:"AF_UNIX_socket",
      training_uid_connect_allowed:true,
      custody_uid_connect_allowed:true,
    },
    service:{
      manager:"system",
      user_uid:994,
      group_gid:981,
      supplementary_gids:[980],
      umask:"0077",
      no_new_privileges:true,
      private_tmp:true,
      private_devices:true,
      protect_system:"strict",
      protect_home:true,
      protect_kernel_tunables:true,
      protect_kernel_modules:true,
      protect_kernel_logs:true,
      protect_control_groups:true,
      lock_personality:true,
      restrict_suid_sgid:true,
      restrict_realtime:true,
      capability_bounding_set:[],
      ambient_capabilities:[],
      restrict_address_families:["AF_UNIX"],
      read_write_targets:["socket_parent","state_root"],
      runtime_can_control_service:false,
      custody_uid_only_reviewed_service:true,
    },
  };
}

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

{
  const result=qualifyApollyonCustodyHostPolicyV1(fixture());
  assert.equal(result.ok,true);
  assert.equal(result.status,"source_policy_qualified");
  assert.match(
    result.qualification_id,
    /^apollyon_custody_policy_v1:[0-9a-f]{64}$/u,
  );
  assert.equal(result.source_binding_verified,true);
  assert.equal(result.identity_separation_qualified,true);
  assert.equal(result.state_root_policy_qualified,true);
  assert.equal(result.socket_policy_qualified,true);
  assert.equal(result.service_hardening_policy_qualified,true);
  assert.equal(result.live_host_qualification_performed,false);
  assert.equal(result.independent_custody_proven,false);
  assert.equal(result.production_gate_ready,false);
  assert.equal(result.attempt_claimed,false);
  assert.equal(result.training_execution_performed,false);
}

{
  const bad=fixture();
  bad.identities.custody_uid=bad.identities.training_uid;
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /identity_separation_invalid/u,
  );
}

{
  const bad=fixture();
  bad.identities.ipc_gid=bad.identities.custody_gid;
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /identity_separation_invalid/u,
  );
}

{
  const bad=fixture();
  bad.state_root.training_uid_write_denied=false;
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /state_root_invalid/u,
  );
}

{
  const bad=fixture();
  bad.state_root.retained_ancestors_group_other_writable=true;
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /state_root_invalid/u,
  );
}

{
  const bad=fixture();
  bad.socket_parent.training_uid_write_denied=false;
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /socket_parent_invalid/u,
  );
}

{
  const bad=fixture();
  bad.socket.mode="0670";
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /socket_invalid/u,
  );
}

{
  const bad=fixture();
  bad.service.read_write_targets=[
    "socket_parent",
    "state_root",
    "extra",
  ];
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /service_invalid/u,
  );
}

{
  const bad=fixture();
  bad.service.restrict_address_families=["AF_UNIX","AF_INET"];
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /service_invalid/u,
  );
}

{
  const bad=fixture();
  bad.service.custody_uid_only_reviewed_service=false;
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /service_invalid/u,
  );
}

{
  const bad=fixture();
  bad.source_binding.custody_service_blob_sha1="22".repeat(20);
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /source_binding_invalid/u,
  );
}

{
  const bad=fixture();
  bad.evidence_snapshot.expires_at_ms=now;
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /evidence_freshness_invalid/u,
  );
}

{
  const bad=fixture();
  bad.evidence_snapshot.expires_at_ms=
    bad.evidence_snapshot.observed_at_ms+5*60*1000+1;
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV1(bad),
    /evidence_freshness_invalid/u,
  );
}

{
  const a=fixture();
  const b=clone(a);
  b.identities={
    ipc_gid:980,
    custody_supplementary_gids:[980],
    custody_gid:981,
    training_uid:1000,
    custody_uid:994,
    training_gid:1000,
    training_supplementary_gids:[980],
  };
  const left=qualifyApollyonCustodyHostPolicyV1(a);
  const right=qualifyApollyonCustodyHostPolicyV1(b);
  assert.equal(left.qualification_id,right.qualification_id);
}

for(const [key,expected] of Object.entries({
  source_only_classifier:true,
  host_io:false,
  filesystem_read:false,
  filesystem_write:false,
  process_execution:false,
  systemd_action:false,
  user_group_mutation:false,
  ownership_permission_mutation:false,
  service_installation:false,
  service_start_stop:false,
  network_access:false,
  operator_private_key_access:false,
  production_signing:false,
  attempt_claim:false,
  training_execution:false,
  candidate_weight_mutation:false,
  generation_execution:false,
  wallet_access:false,
  transaction_signing:false,
  transaction_broadcast:false,
  funds_movement:false,
  verification_clock_authority_proven:false,
  evidence_generation_monotonicity_proven:false,
  live_host_qualification_performed:false,
  independent_custody_proven:false,
  production_gate_ready:false,
})){
  assert.equal(
    VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(TOOL,"utf8");
for(const forbidden of [
  "node:fs",
  "node:net",
  "node:child_process",
  "process.env",
  "fetch(",
  "execFile",
  "spawn(",
  "systemctl",
  "chmod",
  "chown",
  "Wallet(",
  "signTransaction(",
]){
  assert.equal(
    source.includes(forbidden),
    false,
    "classifier gained forbidden host/runtime capability: "+forbidden,
  );
}

console.log("VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V1_PROOF_GREEN");
console.log("source_binding_verified=true");
console.log("identity_separation_qualified=true");
console.log("state_root_policy_qualified=true");
console.log("socket_policy_qualified=true");
console.log("service_hardening_policy_qualified=true");
console.log("evidence_freshness_checked=true");
console.log("verification_clock_authority_proven=false");
console.log("evidence_generation_monotonicity_proven=false");
console.log("live_host_qualification_performed=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("attempt_claimed=false");
console.log("training_execution=false");
