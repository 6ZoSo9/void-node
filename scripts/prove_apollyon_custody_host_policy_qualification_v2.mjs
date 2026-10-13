#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V1,
  VOID_APOLLYON_CUSTODY_REVIEWED_SOURCE_V1,
  qualifyApollyonCustodyHostPolicyV1,
} from "../tools/apollyon-custody-host-policy-qualification-v1.mjs";
import {
  VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V2,
  VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2,
  VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2,
  qualifyApollyonCustodyHostPolicyV2,
} from "../tools/apollyon-custody-host-policy-qualification-v2.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const HISTORICAL=Object.freeze({
  "tools/apollyon-custody-host-policy-qualification-v1.mjs":"6f34e79d94c502e31ca4923fd78922d4875550a5",
  "scripts/prove_apollyon_custody_host_policy_qualification_v1.mjs":"977f1ee63e9998da619df1bc0318ad3ccc6f0938",
  "docs/security/apollyon-custody-host-policy-qualification-v1.md":"6b3619725ae8d95d5361f5e20f4d1372333266a8",
  "ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v1.py":"899864a8305c54c64bcc2bab6dc1f50b599b0706",
  "scripts/prove_apollyon_designated_host_custody_evidence_readonly_v1.py":"b3b05ec797b07ad96be6629e425d37de0e3bd248",
  "docs/security/apollyon-designated-host-custody-evidence-readonly-v1.md":"61532b4443e6c336c64f015ebf8cdead56b2dc11",
});
function gitBlob(bytes){
  return crypto.createHash("sha1").update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries(HISTORICAL)){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}
const workflow=fs.readFileSync(
  path.join(ROOT,".github/workflows/apollyon-custody-socket-parent-namespace-v2.yml"),
  "utf8",
);
for(const relative of [
  ...Object.keys(HISTORICAL),
  "tools/apollyon-custody-host-policy-qualification-v2.mjs",
  "scripts/prove_apollyon_custody_host_policy_qualification_v2.mjs",
  "ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py",
  "scripts/prove_apollyon_designated_host_custody_evidence_readonly_v2.py",
  "docs/security/apollyon-custody-host-policy-qualification-v2.md",
  "docs/security/apollyon-designated-host-custody-evidence-readonly-v2.md",
]){
  assert.equal(workflow.includes('"' + relative + '"'),true,"workflow trigger missing "+relative);
}
const now=1_800_000_000_000;
const serviceUnit="void-apollyon-authorization-custody-v1.service";
const manageUnitVerbs=[
  "start","verify-active","stop","reload","reload-or-start","restart","try-restart",
  "try-reload","nop","reload-or-restart","reload-or-try-restart","kill","clean",
  "set-property","reset-failed","ref","bind-mount","mount-image",
];
const globalControlActions=[
  "org.freedesktop.systemd1.manage-unit-files",
  "org.freedesktop.systemd1.reload-daemon",
  "org.freedesktop.systemd1.set-environment",
];
function serviceControlFixture(){
  const checks=[
    {action_id:"org.freedesktop.systemd1.manage-units",details:[],exit_status:1,result:"explicitly_denied"},
    ...manageUnitVerbs.map((verb)=>({
      action_id:"org.freedesktop.systemd1.manage-units",
      details:[{key:"unit",value:serviceUnit},{key:"verb",value:verb}],
      exit_status:1,result:"explicitly_denied",
    })),
    ...globalControlActions.map((action_id)=>({
      action_id,details:[],exit_status:1,result:"explicitly_denied",
    })),
  ];
  return {
    all_systemd_control_actions_explicitly_denied:true,
    checked_actions:checks,
    observed_systemd_version_line:"systemd 255 (255.4-1ubuntu8.11)",
    pkcheck_subject:"4242,123456,1000",
    reviewed_systemd_major:255,
    runtime_can_control_service:false,
    service_unit:serviceUnit,
    training_pid:4242,
    training_process_capabilities:{
      ambient:"0",effective:"0",inheritable:"0",no_new_privileges:true,permitted:"0",
    },
    training_process_start_time_ticks:"123456",
    training_uid:1000,
  };
}
function v1Fixture(){
  return {
    marker:VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V1,version:1,
    target_host:"Xiphos",verification_now_ms:now,
    evidence_snapshot:{observed_at_ms:now-10_000,expires_at_ms:now+120_000,evidence_generation:7,boot_id_sha256:"11".repeat(32)},
    source_binding:{...VOID_APOLLYON_CUSTODY_REVIEWED_SOURCE_V1},
    identities:{training_uid:1000,training_gid:1000,custody_uid:994,custody_gid:981,ipc_gid:980,training_supplementary_gids:[980],custody_supplementary_gids:[980]},
    state_root:{owner_uid:994,owner_gid:981,mode:"0700",direct:true,symlink:false,realpath_canonical:true,retained_ancestor_count:4,retained_ancestors_root_owned:true,retained_ancestors_direct:true,retained_ancestors_symlink_free:true,retained_ancestors_group_other_writable:false,training_uid_write_denied:true,training_uid_rename_unlink_denied:true},
    consumed_directory:{owner_uid:994,owner_gid:981,mode:"0700",direct:true,symlink:false,parent_bound_to_state_root:true,training_uid_write_denied:true,training_uid_rename_unlink_denied:true},
    socket_parent:{owner_uid:994,owner_gid:980,mode:"0750",direct:true,symlink:false,custody_uid_write_allowed:true,training_uid_traverse_allowed:true,training_uid_write_denied:true},
    socket:{owner_uid:994,owner_gid:980,mode:"0660",type:"AF_UNIX_socket",training_uid_connect_allowed:true,custody_uid_connect_allowed:true},
    service:{manager:"system",user_uid:994,group_gid:981,supplementary_gids:[980],umask:"0077",no_new_privileges:true,private_tmp:true,private_devices:true,protect_system:"strict",protect_home:true,protect_kernel_tunables:true,protect_kernel_modules:true,protect_kernel_logs:true,protect_control_groups:true,lock_personality:true,restrict_suid_sgid:true,restrict_realtime:true,capability_bounding_set:[],ambient_capabilities:[],restrict_address_families:["AF_UNIX"],read_write_targets:["socket_parent","state_root"],runtime_can_control_service:false,custody_uid_only_reviewed_service:true},
  };
}
function v2Fixture(){
  const x=structuredClone(v1Fixture());
  x.marker=VOID_APOLLYON_CUSTODY_HOST_POLICY_EVIDENCE_V2;x.version=2;
  Object.assign(x.socket_parent,{
    retained_ancestor_count:3,retained_ancestors_root_owned:true,
    retained_ancestors_direct:true,retained_ancestors_symlink_free:true,
    retained_ancestors_group_other_writable:false,
    training_uid_rename_unlink_denied:true,
  });
  x.service_control=serviceControlFixture();
  return x;
}
const old=qualifyApollyonCustodyHostPolicyV1(v1Fixture());
const current=qualifyApollyonCustodyHostPolicyV2(v2Fixture());
assert.equal(current.ok,true);
assert.equal(current.marker,VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2);
assert.equal(current.version,2);
assert.equal(current.historical_v1_qualification_id,old.qualification_id);
assert.match(current.qualification_id,/^apollyon_custody_policy_v2:[0-9a-f]{64}$/u);
assert.equal(current.socket_parent_retained_ancestor_policy_qualified,true);
assert.equal(current.socket_parent_training_rename_unlink_policy_qualified,true);
assert.equal(current.service_control_policy_qualified,true);
assert.equal(current.live_host_qualification_performed,false);
assert.equal(current.production_gate_ready,false);
assert.throws(()=>qualifyApollyonCustodyHostPolicyV1(v2Fixture()),/input_invalid/u);
for(const mutate of [
  x=>{x.socket_parent.retained_ancestor_count=1;},
  x=>{x.socket_parent.retained_ancestors_root_owned=false;},
  x=>{x.socket_parent.retained_ancestors_direct=false;},
  x=>{x.socket_parent.retained_ancestors_symlink_free=false;},
  x=>{x.socket_parent.retained_ancestors_group_other_writable=true;},
  x=>{x.socket_parent.training_uid_rename_unlink_denied=false;},
]){
  const bad=v2Fixture();mutate(bad);
  assert.throws(()=>qualifyApollyonCustodyHostPolicyV2(bad),/socket_parent_invalid/u);
}
{
  const bad=v2Fixture();bad.state_root.training_uid_write_denied=false;
  assert.throws(()=>qualifyApollyonCustodyHostPolicyV2(bad),/state_root_invalid/u);
}
{
  const bad=v2Fixture();bad.service.custody_uid_only_reviewed_service=false;
  assert.throws(()=>qualifyApollyonCustodyHostPolicyV2(bad),/service_invalid/u);
}
{
  const bad=v2Fixture();
  bad.service_control.checked_actions[1].exit_status=0;
  bad.service_control.checked_actions[1].result="authorized";
  assert.throws(()=>qualifyApollyonCustodyHostPolicyV2(bad),/service_control_invalid/u);
}
{
  const bad=v2Fixture();bad.service_control.training_uid=1001;
  assert.throws(()=>qualifyApollyonCustodyHostPolicyV2(bad),/service_control_invalid/u);
}
{
  const bad=v2Fixture();bad.service_control.reviewed_systemd_major=256;
  assert.throws(()=>qualifyApollyonCustodyHostPolicyV2(bad),/service_control_invalid/u);
}
{
  const bad=v2Fixture();bad.service.runtime_can_control_service=true;
  assert.throws(()=>qualifyApollyonCustodyHostPolicyV2(bad),/(service_control_mismatch|service_invalid)/u);
}
for(const [key,expected] of Object.entries({
  source_only_classifier:true,host_io:false,filesystem_read:false,filesystem_write:false,
  process_execution:false,network_access:false,operator_private_key_access:false,
  production_signing:false,attempt_claim:false,training_execution:false,wallet_access:false,
  transaction_signing:false,transaction_broadcast:false,funds_movement:false,
  historical_v1_classifier_reused:true,socket_parent_retained_ancestor_binding:true,
  socket_parent_training_rename_unlink_denied_required:true,
  explicit_training_pid_service_control_denial_required:true,
  reviewed_systemd_major_pinned:true,
})){
  assert.equal(VOID_APOLLYON_CUSTODY_HOST_POLICY_AUTHORITY_V2[key],expected,key);
}
const source=fs.readFileSync(path.join(ROOT,"tools/apollyon-custody-host-policy-qualification-v2.mjs"),"utf8");
for(const forbidden of ["node:fs","node:net","node:child_process","process.env","fetch(","execFile","spawn("]){
  assert.equal(source.includes(forbidden),false,forbidden);
}
console.log("VOID_APOLLYON_CUSTODY_HOST_POLICY_QUALIFICATION_V2_PROOF_GREEN");
console.log("historical_v1_classifier_bytes_unchanged=true");
console.log("historical_v83_collector_bytes_unchanged=true");
console.log("socket_parent_retained_ancestor_binding=true");
console.log("socket_parent_training_rename_unlink_denied_required=true");
console.log("explicit_training_pid_service_control_denial_required=true");
console.log("reviewed_systemd_major=255");
console.log("live_host_qualification_performed=false");
console.log("production_gate_ready=false");
console.log("attempt_claimed=false");
console.log("training_execution=false");
