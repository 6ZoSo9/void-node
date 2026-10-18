#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_AUTHORITY_V2,
  augmentApollyonV2EvidenceWithIsolationV1,
  canonicalApollyonPreclaimV2Json,
  validateApollyonInstalledIsolationReceiptV1,
} from "../tools/apollyon-candidate-training-preclaim-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-custody-host-policy-qualification-v2.mjs":
    "db5493a513a42780865e7194580eec3b770dc8e1",
  "tools/apollyon-designated-host-custody-live-qualification-v2.mjs":
    "435e23d26fa32405e36d5dad17b033ea4ec910e0",
  "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v1.py":
    "1fdb495aafa136119d50f41410b015930d9fc90d",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

function hash(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function receipt(){
  const material={
    marker:"VOID_APOLLYON_INSTALLED_TRAINING_BUS_ISOLATION_QUALIFICATION_V1",
    version:1,
    status:"installed_training_bus_isolation_live_generation_observed",
    target_host:"Xiphos",
    materials:{
      unit_git_blob_sha1:"62fbabe1cf7ae0d940f5d96e19b06282f841267b",
      preentry_bytes:17352,
      preentry_sha256:"6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47",
      entrypoint_bytes:17384,
      entrypoint_sha256:"7a1ec91b612998824e37aa0f8522a94d7ceffe9f4f21e0702fe0a0d5ca5bdd9a",
    },
    live:{
      mainpid:4242,
      boot_id_sha256:"11".repeat(32),
      process_start_time_ticks:123456,
      entrypoint_path:"/opt/void-apollyon-training-v1/apollyon_candidate_training_entrypoint_v1",
      uid_slots:[997,997,997,997],
      gid_slots:[984,984,984,984],
      no_new_privileges:true,
      capability_sets_zero:true,
      inherited_fds_ge_3_absent:true,
      systemd_cgroup_verified:true,
    },
    installed_unit_identity_proven:true,
    installed_preentry_binary_identity_proven:true,
    installed_training_entrypoint_identity_proven:true,
    live_systemd_enforcement_proven:true,
    inherited_system_bus_descriptor_absence_proven:true,
    absolute_runtime_service_control_denial_proven:true,
    canonical_installed_qualification_complete:true,
    service_action_performed:false,
    service_enabled:false,
    service_active_after_observation:true,
    training_execution:false,
    attempt_claim:false,
    candidate_weight_mutation:false,
    next_gate:"apollyon_candidate_training_preclaim_v2",
    authority:{
      live_host_required:true,root_required:true,
      exact_installed_unit_required:true,exact_installed_preentry_required:true,
      exact_installed_entrypoint_required:true,
      service_start_stop_required_for_standalone_live_qualify:true,
      existing_live_pid_observation_supported:true,
      service_enable:false,training_execution:false,attempt_claim:false,
      candidate_weight_mutation:false,credential_access:false,
      wallet_or_signer_access:false,transaction:false,funds_movement:false,
    },
  };
  return {
    ...material,
    qualification_id:"apollyon_training_isolation_live_v1:"+
      hash(Buffer.from(canonicalApollyonPreclaimV2Json(material),"utf8")),
  };
}
function raw(){
  return {
    marker:"VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2",
    version:2,target_host:"Xiphos",
    evidence_snapshot:{boot_id_sha256:"11".repeat(32)},
    identities:{training_uid:997,training_gid:984},
    service:{runtime_can_control_service:null},
    service_control:{
      inherited_system_bus_descriptor_absence_required:true,
      inherited_system_bus_descriptor_absence_proven:false,
      absolute_runtime_service_control_denial_proven:false,
      runtime_can_control_service:null,
      training_pid:4242,
      training_process_start_time_ticks:"123456",
      training_uid:997,
    },
  };
}

const accepted=validateApollyonInstalledIsolationReceiptV1(receipt());
assert.match(
  accepted.qualification_id,
  /^apollyon_training_isolation_live_v1:[0-9a-f]{64}$/u,
);
const augmented=augmentApollyonV2EvidenceWithIsolationV1(raw(),accepted);
assert.equal(augmented.service_control.inherited_system_bus_descriptor_absence_proven,true);
assert.equal(augmented.service_control.absolute_runtime_service_control_denial_proven,true);
assert.equal(augmented.service_control.runtime_can_control_service,false);
assert.equal(augmented.service.runtime_can_control_service,false);

for(const mutate of [
  x=>{x.service_control.training_pid=4243;},
  x=>{x.service_control.training_process_start_time_ticks="123457";},
  x=>{x.evidence_snapshot.boot_id_sha256="22".repeat(32);},
  x=>{x.service_control.inherited_system_bus_descriptor_absence_proven=true;},
]){
  const bad=raw();mutate(bad);
  assert.throws(
    ()=>augmentApollyonV2EvidenceWithIsolationV1(bad,receipt()),
    /(same_process_generation_mismatch|raw_v2_boundary_not_unproven)/u,
  );
}
{
  const bad=receipt();
  bad.live.process_start_time_ticks=123457;
  assert.throws(
    ()=>validateApollyonInstalledIsolationReceiptV1(bad),
    /receipt_id_invalid/u,
  );
}

for(const [key,expected] of Object.entries({
  source_only_composition:true,
  current_v2_custody_required:true,
  installed_live_isolation_required:true,
  same_training_process_generation_required:true,
  historical_v84_v1_sufficient:false,
  live_service_source_identity_proven:false,
  same_live_custody_session_binding_proven:false,
  durable_attempt_claim_performed:false,
  attempt_claim_authorized:false,
  training_execution_authorized:false,
  training_execution_performed:false,
  filesystem_read:false,filesystem_write:false,network_access:false,
  service_action:false,credential_access:false,wallet_or_signer_access:false,
  transaction:false,funds_movement:false,
})){
  assert.equal(VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_AUTHORITY_V2[key],expected,key);
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-candidate-training-preclaim-v2.mjs"),"utf8",
);
for(const required of [
  "qualifyApollyonCustodyHostPolicyV2",
  "qualifyApollyonDesignatedHostCustodyLivePairV2",
  "historical_v84_v1_sufficient:false",
  'next_gate:"live_custody_service_source_identity_binding_v2"',
]){
  assert.equal(source.includes(required),true,required);
}
for(const forbidden of [
  "apollyon-designated-host-custody-live-qualification-v1",
  "node:fs","node:net","node:child_process","systemctl",
  "writeFileSync(","spawn(","training_execution_performed:true",
  "attempt_claimed:true","candidate_weight_mutation_performed:true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_V2_PROOF_GREEN");
console.log("current_v2_required=true");
console.log("installed_live_isolation_required=true");
console.log("same_training_process_generation_required=true");
console.log("historical_v84_v1_sufficient=false");
console.log("live_service_source_identity_proven=false");
console.log("same_live_custody_session_binding_proven=false");
console.log("durable_attempt_claim_performed=false");
console.log("training_execution=false");
