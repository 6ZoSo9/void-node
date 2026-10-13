#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import {
  buildApollyonCustodyHostPolicyEvidenceFromObservationV1,
  parseApollyonProcStartTimeV1,
  parseApollyonProcStatusV1,
  parseApollyonSystemdShowV1,
  assertApollyonSimpleAclTextV1,
  VOID_APOLLYON_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1,
} from "../tools/apollyon-custody-host-evidence-v1.mjs";
import {
  qualifyApollyonCustodyHostPolicyV2,
} from "../tools/apollyon-custody-host-policy-qualification-v2.mjs";

const TOOL=fileURLToPath(
  new URL("../tools/apollyon-custody-host-evidence-v1.mjs",import.meta.url),
);

function observation(){
  return {
    hostname:"Xiphos",
    verification_now_ms:1_800_000_000_000,
    observed_at_ms:1_800_000_000_000,
    expires_at_ms:1_800_000_120_000,
    evidence_generation:123456,
    boot_id_sha256:"11".repeat(32),
    training_identity:{
      uid:1000,
      gid:1000,
      groups:[980],
      start_time_ticks:"100",
    },
    custody_identity:{
      uid:994,
      gid:981,
      groups:[980],
      start_time_ticks:"200",
    },
    custody_process_count:1,
    runtime_control_denied:true,
    state_ancestors:[
      {path:"/",uid:0,gid:0,mode:"0755",group_other_writable:false},
      {path:"/var",uid:0,gid:0,mode:"0755",group_other_writable:false},
      {path:"/var/lib",uid:0,gid:0,mode:"0755",group_other_writable:false},
    ],
    socket_ancestors:[
      {path:"/",uid:0,gid:0,mode:"0755",group_other_writable:false},
      {path:"/run",uid:0,gid:0,mode:"0755",group_other_writable:false},
    ],
    state_root:{
      uid:994,
      gid:981,
      mode:"0700",
      training_write:false,
      training_rename_unlink:false,
    },
    consumed_directory:{
      uid:994,
      gid:981,
      mode:"0700",
      parent_bound:true,
      training_write:false,
      training_rename_unlink:false,
    },
    socket_parent:{
      uid:994,
      gid:980,
      mode:"0750",
      custody_write:true,
      training_traverse:true,
      training_write:false,
      training_rename_unlink:false,
    },
    socket:{
      uid:994,
      gid:980,
      mode:"0660",
      training_connect:true,
      custody_connect:true,
    },
    custody_service:{
      UMask:"0077",
      NoNewPrivileges:"yes",
      PrivateTmp:"yes",
      PrivateDevices:"yes",
      ProtectSystem:"strict",
      ProtectHome:"yes",
      ProtectKernelTunables:"yes",
      ProtectKernelModules:"yes",
      ProtectKernelLogs:"yes",
      ProtectControlGroups:"yes",
      LockPersonality:"yes",
      RestrictSUIDSGID:"yes",
      RestrictRealtime:"yes",
      CapabilityBoundingSet:"",
      AmbientCapabilities:"",
      RestrictAddressFamilies:"AF_UNIX",
      ReadWritePaths:"/run/void-apollyon /var/lib/void-apollyon",
      read_write_targets:["socket_parent","state_root"],
    },
  };
}

{
  const parsed=parseApollyonProcStatusV1(
    "Uid:\t1000\t1000\t1000\t1000\n"+
    "Gid:\t1000\t1000\t1000\t1000\n"+
    "Groups:\t27 980\n",
  );
  assert.equal(parsed.uid,1000);
  assert.equal(parsed.gid,1000);
  assert.deepEqual(parsed.groups,[27,980]);
}

{
  assert.throws(
    ()=>parseApollyonProcStatusV1(
      "Uid:\t0\t0\t0\t0\n"+
      "Gid:\t0\t0\t0\t0\n"+
      "Groups:\t0\n",
    ),
    /proc_status_invalid/u,
  );
}

assert.equal(
  parseApollyonProcStartTimeV1(
    "123 (node worker) S 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 2222 20",
  ),
  "2222",
);

{
  const parsed=parseApollyonSystemdShowV1(
    "Id=void-apollyon.service\nMainPID=123\nActiveState=active\n",
  );
  assert.equal(parsed.Id,"void-apollyon.service");
  assert.equal(parsed.MainPID,"123");
  assert.equal(parsed.ActiveState,"active");
  assert.throws(
    ()=>parseApollyonSystemdShowV1("Id=a\nId=b\n"),
    /systemd_show_duplicate/u,
  );
}

assert.equal(
  assertApollyonSimpleAclTextV1("user::rwx\ngroup::r-x\nother::---\n"),
  true,
);
assert.throws(
  ()=>assertApollyonSimpleAclTextV1(
    "user::rwx\nuser:1000:rwx\ngroup::---\nmask::rwx\nother::---\n",
  ),
  /acl_invalid/u,
);

{
  const evidence=buildApollyonCustodyHostPolicyEvidenceFromObservationV1(
    observation(),
  );
  const decision=qualifyApollyonCustodyHostPolicyV2(evidence);
  assert.equal(decision.ok,true);
  assert.equal(decision.status,"source_policy_qualified");
  assert.equal(decision.live_host_qualification_performed,false);
  assert.equal(decision.independent_custody_proven,false);
}

{
  const bad=observation();
  bad.verification_now_ms=bad.expires_at_ms;
  const evidence=buildApollyonCustodyHostPolicyEvidenceFromObservationV1(bad);
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV2(evidence),
    /evidence_freshness_invalid/u,
  );
}

{
  const bad=observation();
  bad.socket_parent.training_rename_unlink=true;
  const evidence=buildApollyonCustodyHostPolicyEvidenceFromObservationV1(bad);
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV2(evidence),
    /socket_parent_invalid/u,
  );
}

{
  const bad=observation();
  bad.socket_ancestors[1].group_other_writable=true;
  const evidence=buildApollyonCustodyHostPolicyEvidenceFromObservationV1(bad);
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV2(evidence),
    /socket_parent_invalid/u,
  );
}

{
  const bad=observation();
  bad.runtime_control_denied=false;
  const evidence=buildApollyonCustodyHostPolicyEvidenceFromObservationV1(bad);
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV2(evidence),
    /service_invalid/u,
  );
}

{
  const bad=observation();
  bad.custody_process_count=2;
  const evidence=buildApollyonCustodyHostPolicyEvidenceFromObservationV1(bad);
  assert.throws(
    ()=>qualifyApollyonCustodyHostPolicyV2(evidence),
    /service_invalid/u,
  );
}

{
  const bad=observation();
  bad.hostname="Precision";
  assert.throws(
    ()=>buildApollyonCustodyHostPolicyEvidenceFromObservationV1(bad),
    /wrong_host/u,
  );
}

for(const [key,expected] of Object.entries({
  source_only_collector:true,
  designated_host_read_only_observation:true,
  privileged_read_only_observer_required:true,
  procfs_read:true,
  filesystem_metadata_read:true,
  acl_metadata_read:true,
  systemd_metadata_read:true,
  polkit_authorization_query:true,
  exact_v82_classifier_reused:false,
  v82_v1_classifier_preserved:true,
  v83_policy_v2_classifier_required:true,
  synthetic_snapshot_authority:false,
  trusted_collector_proven:false,
  verification_clock_authority_proven:false,
  evidence_generation_monotonicity_proven:false,
  live_host_qualification_performed:false,
  independent_custody_proven:false,
  production_gate_ready:false,
  filesystem_write:false,
  ownership_permission_mutation:false,
  service_mutation:false,
  user_group_mutation:false,
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
})){
  assert.equal(
    VOID_APOLLYON_CUSTODY_HOST_EVIDENCE_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(TOOL,"utf8");

assert.equal(
  source.includes('from "./apollyon-custody-host-policy-qualification-v1.mjs"'),
  false,
  "V83 collector must not execute the frozen V82 V1 classifier",
);
assert.equal(
  source.includes('from "./apollyon-custody-host-policy-qualification-v2.mjs"'),
  true,
  "V83 collector must execute the versioned V2 classifier",
);
for(const forbidden of [
  "writeFileSync",
  "appendFileSync",
  "mkdirSync",
  "chmodSync",
  "chownSync",
  "unlinkSync",
  "renameSync",
  "linkSync",
  "symlinkSync",
  "copyFileSync",
  "rmSync",
  "rmdirSync",
  "truncateSync",
  "ftruncateSync",
  "fsyncSync",
  "Wallet(",
  "signTransaction(",
  "eth_sendRawTransaction",
]){
  assert.equal(
    source.includes(forbidden),
    false,
    "collector gained forbidden mutation capability: "+forbidden,
  );
}

const systemctlVerbs=[
  ...source.matchAll(/runText\(SYSTEMCTL,\s*\[\s*"([^"]+)"/gu),
].map((match)=>match[1]);
assert.deepEqual(systemctlVerbs,["show"]);

console.log("VOID_APOLLYON_CUSTODY_HOST_EVIDENCE_V1_PROOF_GREEN");
console.log("designated_host_read_only_observation=true");
console.log("privileged_read_only_observer_required=true");
console.log("systemd_metadata_read=true");
console.log("polkit_authorization_query=true");
console.log("filesystem_write=false");
console.log("service_mutation=false");
console.log("live_host_qualification_performed=false");
console.log("independent_custody_proven=false");
console.log("production_gate_ready=false");
console.log("attempt_claimed=false");
console.log("training_execution=false");
