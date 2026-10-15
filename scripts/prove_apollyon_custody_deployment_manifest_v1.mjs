#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MANIFEST=path.join(ROOT,"ops/xiphos/apollyon-custody-deployment-manifest-v1.json");
const UNIT=path.join(ROOT,"ops/xiphos/void-apollyon-authorization-custody-v1.service");
const TARGET=path.join(ROOT,"ops/xiphos/void-apollyon-authorization-custody-v1.target");
const ENV_TEMPLATE=path.join(ROOT,"ops/xiphos/void-apollyon-authorization-custody-v1.env.template");
const POLKIT=path.join(ROOT,"ops/xiphos/00-void-apollyon-training-custody-deny-v1.rules");
const TMPFILES=path.join(ROOT,"ops/xiphos/void-apollyon-custody-v1.tmpfiles.conf");
const SOCKET_CLEANUP=path.join(ROOT,"ops/xiphos/apollyon_custody_stale_socket_cleanup_v1.py");
const NODE_RUNTIME_MANIFEST=path.join(ROOT,"ops/xiphos/apollyon-node-runtime-custody-v1.json");
const PREENTRY_LOCK=path.join(ROOT,"ops/security/apollyon-live-custody-source-session-preentry-binary-lock-v1.json");
const PREENTRY_LOCK_PROOF=path.join(ROOT,"scripts/prove_apollyon_live_custody_source_session_preentry_binary_lock_v1.py");
const PREENTRY_LOCK_WORKFLOW=path.join(ROOT,".github/workflows/apollyon-live-custody-source-session-preentry-binary-lock-v1.yml");
const PREENTRY_LOCK_BLOB="aaa4d3265fcd3471fb433928df1cf9f9b4ef42a6";
const PREENTRY_LOCK_PROOF_BLOB="2d823b6acdf9861ad4bb05c62a25d8f2ad37f477";
const PREENTRY_LOCK_WORKFLOW_BLOB="8421a574064874b3bead14482a93d21d9414e80f";

function canonical(v){
  if(Array.isArray(v))return v.map(canonical);
  if(v&&typeof v==="object"){
    const out={};
    for(const k of Object.keys(v).sort())out[k]=canonical(v[k]);
    return out;
  }
  return v;
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
function sha256(bytes){return crypto.createHash("sha256").update(bytes).digest("hex");}

const raw=fs.readFileSync(MANIFEST,"utf8");
const manifest=JSON.parse(raw);
assert.equal(JSON.stringify(canonical(manifest))+"\n",raw);
assert.equal(manifest.marker,"VOID_APOLLYON_CUSTODY_DEPLOYMENT_MANIFEST_V1");
assert.equal(manifest.version,1);
assert.equal(manifest.status,"source_only_deployment_contract");
assert.equal(manifest.target_host,"Xiphos");

assert.deepEqual(manifest.identities,{
  custody_group:"voidapollyoncustody",
  custody_ipc_membership_required:true,
  custody_user:"voidapollyoncustody",
  distinct_primary_groups_required:true,
  ipc_group:"voidapollyonipc",
  training_ipc_membership_required:true,
  training_user:"voidapollyontrain",
});

const unit=fs.readFileSync(UNIT,"utf8");
for(const required of [
  "RefuseManualStart=yes","RefuseManualStop=yes",
  "User=voidapollyoncustody","Group=voidapollyoncustody",
  "SupplementaryGroups=voidapollyonipc","UMask=0077",
  "NoNewPrivileges=yes","PrivateTmp=yes","PrivateDevices=yes",
  "ProtectSystem=strict","ProtectHome=yes","ProtectKernelTunables=yes",
  "ProtectKernelModules=yes","ProtectKernelLogs=yes","ProtectControlGroups=yes",
  "LockPersonality=yes","RestrictSUIDSGID=yes","RestrictRealtime=yes",
  "CapabilityBoundingSet=\n","AmbientCapabilities=\n",
  "RestrictAddressFamilies=AF_UNIX",
  "ReadWritePaths=/run/void-apollyon-custody-v1",
  "ReadWritePaths=/var/lib/void-apollyon-custody-v1",
  "EnvironmentFile=/etc/void/apollyon-custody-v1/custody.env",
  "/opt/void-apollyon-node-runtime-v1/node",
  "/opt/void-apollyon-custody-service-v2-reviewed-v1/tools/apollyon-authorization-custody-launcher-v2.mjs",
  "ExecStopPost=/usr/bin/python3 -I -B /opt/void-apollyon-custody-lifecycle-v1/apollyon_custody_stale_socket_cleanup_v1.py --cleanup",
]){
  assert.equal(unit.includes(required),true,required);
}
for(const forbidden of ["WantedBy=","ExecStartPre=/bin/sh","sudo ","curl ","wget "]){
  assert.equal(unit.includes(forbidden),false,"unit:"+forbidden);
}

const nodeRuntime=JSON.parse(fs.readFileSync(NODE_RUNTIME_MANIFEST,"utf8"));
assert.equal(nodeRuntime.marker,"VOID_APOLLYON_NODE_RUNTIME_CUSTODY_V1");
assert.equal(nodeRuntime.installed.path,"/opt/void-apollyon-node-runtime-v1/node");
assert.equal(nodeRuntime.installed.version,"v24.21.0");
assert.equal(nodeRuntime.installed.bytes,126595440);
assert.equal(nodeRuntime.installed.sha256,"7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c");
assert.equal(nodeRuntime.installed.owner,"root:root");
assert.equal(nodeRuntime.installed.mode,"0755");
assert.equal(nodeRuntime.installed.package_manager_required,false);
assert.deepEqual(manifest.node_runtime_contract,{
  bytes:126595440,
  copied_binary_probe_qualified:true,
  installed_path:"/opt/void-apollyon-node-runtime-v1/node",
  manifest_path:"ops/xiphos/apollyon-node-runtime-custody-v1.json",
  marker:"VOID_APOLLYON_NODE_RUNTIME_CUSTODY_V1",
  mode:"0755",
  package_manager_required:false,
  root_owned_install_required:true,
  sha256:"7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c",
  source_path:"/opt/nodejs/node-v24.21.0-linux-x64/bin/node",
  version:"v24.21.0",
});
assert.equal(manifest.paths.node_runtime,"/opt/void-apollyon-node-runtime-v1/node");

assert.equal(manifest.paths.live_session_source_root,"/opt/void-apollyon-live-custody-binding-v2-reviewed-v2");
assert.deepEqual(manifest.systemd_package_review,{
  current_xiphos_package_version:"255.4-1ubuntu8.18",
  exact_allowlist:true,
  reviewed_major:255,
  reviewed_package_versions:["255.4-1ubuntu8.11","255.4-1ubuntu8.18"],
  running_installed_match_required:true,
});
assert.equal(manifest.service_contract.node_runtime_path,"/opt/void-apollyon-node-runtime-v1/node");

assert.equal(manifest.service_contract.activation_target_stop_propagates_to_service,true);
assert.equal(manifest.service_contract.activation_target_restart_propagation,false);
assert.equal(manifest.service_contract.direct_service_start_stop_refused,true);
assert.equal(manifest.service_contract.activation_target_unit_file_state_required,"disabled");
assert.equal(manifest.service_contract.custody_service_unit_file_state_required,"static");
assert.deepEqual(
  manifest.service_contract.unset_environment,
  [
    "GCONV_PATH","LD_AUDIT","LD_LIBRARY_PATH","LD_PRELOAD",
    "NODE_OPTIONS","NODE_PATH","OPENSSL_CONF",
  ],
);

assert.equal(manifest.service_contract.restart_safe_socket_cleanup_required,true);
assert.equal(
  manifest.service_contract.exec_stop_post,
  "/usr/bin/python3 -I -B /opt/void-apollyon-custody-lifecycle-v1/apollyon_custody_stale_socket_cleanup_v1.py --cleanup",
);
assert.equal(manifest.paths.custody_lifecycle_root,"/opt/void-apollyon-custody-lifecycle-v1");
assert.equal(
  manifest.paths.custody_stale_socket_cleanup,
  "/opt/void-apollyon-custody-lifecycle-v1/apollyon_custody_stale_socket_cleanup_v1.py",
);
assert.deepEqual(manifest.host_lifecycle_closure,{
  "ops/xiphos/apollyon_custody_stale_socket_cleanup_v1.py":
    "3cb5f2b85c80b9a26ba5e8d73634c29f584011af",
});
assert.deepEqual(manifest.socket_lifecycle_contract,{
  advertised_socket_unlink_by_source_service:false,
  custody_uid_process_census_uid_slots:["real","effective","saved","filesystem"],
  custody_uid_process_exclusivity_required:true,
  exec_stop_post_cleanup_required:true,
  fixed_socket_path:"/run/void-apollyon-custody-v1/custody.sock",
  helper_git_blob_sha1:"3cb5f2b85c80b9a26ba5e8d73634c29f584011af",
  helper_mode:"0444",
  helper_owner:"root:root",
  helper_runtime_user:"voidapollyoncustody",
  live_listener_unlink_forbidden:true,
  restart_safe_cleanup_required:true,
  same_inode_private_hardlink_cleanup:true,
  stale_socket_cleanup_external_required:true,
  unclassifiable_process_status_holds:true,
});
assert.equal(
  gitBlob(fs.readFileSync(SOCKET_CLEANUP)),
  "3cb5f2b85c80b9a26ba5e8d73634c29f584011af",
);

const target=fs.readFileSync(TARGET,"utf8");
assert.equal(target.includes("Wants=void-apollyon-authorization-custody-v1.service"),true);
assert.equal(target.includes("PropagatesStopTo=void-apollyon-authorization-custody-v1.service"),true);
assert.equal(target.includes("After=void-apollyon-authorization-custody-v1.service"),true);
assert.equal(target.includes("WantedBy=multi-user.target"),true);

const env=fs.readFileSync(ENV_TEMPLATE,"utf8");
const expectedEnvLines=[
  "VOID_APOLLYON_CUSTODY_SOCKET_PATH=/run/void-apollyon-custody-v1/custody.sock",
  "VOID_APOLLYON_CUSTODY_STATE_ROOT=/var/lib/void-apollyon-custody-v1",
  "VOID_APOLLYON_CUSTODY_SOCKET_GROUP_GID=@IPC_GID@",
  "VOID_APOLLYON_CUSTODY_OPERATOR_PUBLIC_KEY_FILE=/etc/void/apollyon-custody-v1/operator-public-key.pem",
  "VOID_APOLLYON_CUSTODY_OPERATOR_PUBLIC_KEY_RAW_SHA256=@OPERATOR_PUBLIC_KEY_RAW_SHA256@",
];
assert.equal(env,expectedEnvLines.join("\n")+"\n");
const envKeys=expectedEnvLines.map(line=>line.slice(0,line.indexOf("=")));
assert.deepEqual(
  manifest.configuration_file_contract.environment_file.exact_keys,
  envKeys,
);
for(const forbidden of [
  "GCONV_PATH","LD_AUDIT","LD_LIBRARY_PATH","LD_PRELOAD",
  "NODE_OPTIONS","NODE_PATH","OPENSSL_CONF",
]){
  assert.equal(envKeys.includes(forbidden),false,forbidden);
  assert.equal(
    manifest.configuration_file_contract.environment_file.forbidden_keys.includes(forbidden),
    true,
    forbidden,
  );
}
assert.equal(manifest.configuration_file_contract.environment_file.extra_keys_forbidden,true);

const polkit=fs.readFileSync(POLKIT);
assert.equal(polkit.length,443);
assert.equal(sha256(polkit),"492bbe168680fc81b27ac811f8b9c8900751e09c861523f1ab845e017acaea22");
assert.equal(polkit.toString("utf8").includes('subject.user === "voidapollyontrain"'),true);

for(const [relative,expected] of Object.entries({
  ...manifest.custody_service_closure,
  ...manifest.live_session_closure,
  ...manifest.host_lifecycle_closure,
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}
assert.equal(
  gitBlob(fs.readFileSync(path.join(ROOT,"ops/xiphos/apollyon_live_custody_source_session_preentry_v2.c"))),
  "1d0d9893939d1a457970b3b1f16dae06e7fef067",
);

const lockRaw=fs.readFileSync(PREENTRY_LOCK);
assert.equal(gitBlob(lockRaw),PREENTRY_LOCK_BLOB);
assert.equal(gitBlob(fs.readFileSync(PREENTRY_LOCK_PROOF)),PREENTRY_LOCK_PROOF_BLOB);
assert.equal(gitBlob(fs.readFileSync(PREENTRY_LOCK_WORKFLOW)),PREENTRY_LOCK_WORKFLOW_BLOB);
const acceptedLock=JSON.parse(lockRaw.toString("utf8"));
assert.equal(JSON.stringify(canonical(acceptedLock))+"\n",lockRaw.toString("utf8"));
assert.equal(acceptedLock.lock_id,"apollyon_live_custody_source_session_preentry_binary_lock_v1:7009aab71636ae4a06d880160e60b7131887f0ab7199b8da19ef65f399534439");
assert.equal(acceptedLock.candidate_id,"apollyon_live_custody_source_session_preentry_binary_candidate_v1:5007ad5368afd86679cd18811822b648bb4abc4c13169d55d2b27822609de5ab");
assert.equal(acceptedLock.binary.bytes,798736);
assert.equal(acceptedLock.binary.sha256,"2d705515d825051111b5fd9f99356466bf341056a0bf67d34b80a869a337d21d");
for(const key of ["static_link_required","pt_interp_absent","hostile_ld_preload_positive_control","hostile_ld_preload_preentry_blocked"]){
  assert.equal(acceptedLock.binary[key],true,"accepted-lock:"+key);
  assert.equal(manifest.preentry_lock[key],true,"manifest-lock:"+key);
}
assert.equal(acceptedLock.candidate_binary_identity_accepted,true);
assert.equal(acceptedLock.installed_preentry_identity_proven,false);
assert.equal(manifest.preentry_lock.bytes,acceptedLock.binary.bytes);
assert.equal(manifest.preentry_lock.sha256,acceptedLock.binary.sha256);
assert.equal(manifest.preentry_lock.candidate_id,acceptedLock.candidate_id);
assert.equal(manifest.preentry_lock.lock_id,acceptedLock.lock_id);
assert.equal(manifest.preentry_lock.candidate_binary_identity_accepted,true);
assert.equal(manifest.preentry_lock.installed_preentry_identity_proven,false);
assert.deepEqual(manifest.preentry_lock_evidence,{
  git_blob_sha1:PREENTRY_LOCK_BLOB,
  lock_id:"apollyon_live_custody_source_session_preentry_binary_lock_v1:7009aab71636ae4a06d880160e60b7131887f0ab7199b8da19ef65f399534439",
  path:"ops/security/apollyon-live-custody-source-session-preentry-binary-lock-v1.json",
  verification_proof_git_blob_sha1:PREENTRY_LOCK_PROOF_BLOB,
  verification_proof_path:"scripts/prove_apollyon_live_custody_source_session_preentry_binary_lock_v1.py",
  verification_workflow_git_blob_sha1:PREENTRY_LOCK_WORKFLOW_BLOB,
  verification_workflow_path:".github/workflows/apollyon-live-custody-source-session-preentry-binary-lock-v1.yml",
  verification_workflow_run:38788674691,
});
assert.equal(manifest.required_operator_input.private_key_required,false);
assert.equal(manifest.required_operator_input.public_identity_cross_attested,true);
assert.equal(
  manifest.required_operator_input.expected_operator_public_key_raw_sha256,
  "c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134",
);
assert.deepEqual(manifest.configuration_file_contract.config_directory,{
  acceptance_revalidation_required:true,
  canonical_real_directory_required:true,
  group_world_writable_forbidden:true,
  mode:"0755",
  owner:"root:root",
  path:"/etc/void/apollyon-custody-v1",
  symlink_forbidden:true,
});
for(const [name,expected] of Object.entries({
  environment_file:{mode:"0600",path:"/etc/void/apollyon-custody-v1/custody.env"},
  operator_public_key_file:{mode:"0644",path:"/etc/void/apollyon-custody-v1/operator-public-key.pem"},
})){
  const row=manifest.configuration_file_contract[name];
  assert.equal(row.owner,"root:root",name+":owner");
  assert.equal(row.mode,expected.mode,name+":mode");
  assert.equal(row.path,expected.path,name+":path");
  assert.equal(row.canonical_path_required,true,name+":canonical");
  assert.equal(row.symlink_forbidden,true,name+":symlink");
  assert.equal(row.single_link_required,true,name+":links");
  assert.equal(row.group_world_writable_forbidden,true,name+":writable");
  assert.equal(row.acceptance_revalidation_required,true,name+":revalidation");
}
assert.equal(
  manifest.configuration_file_contract.operator_public_key_file.expected_raw_sha256,
  manifest.required_operator_input.expected_operator_public_key_raw_sha256,
);
assert.equal(
  manifest.configuration_file_contract.operator_public_key_file.private_key_bytes_forbidden,
  true,
);
assert.equal(
  fs.readFileSync(TMPFILES,"utf8"),
  "d /run/void-apollyon-custody-v1 0750 voidapollyoncustody voidapollyonipc - -\n",
);
assert.equal(manifest.filesystem_contract.socket_parent_recreated_by_tmpfiles,true);
for(const key of [
  "host_installation","account_mutation","group_mutation","systemd_mutation",
  "polkit_mutation","service_start","service_enable","training_execution",
  "durable_attempt_claim","candidate_weight_mutation","operator_private_key_access",
  "wallet_access","transaction_signing","funds_movement",
]){
  assert.equal(manifest.authority[key],false,key);
}
assert.equal(manifest.authority.source_only_contract,true);
assert.equal(
  manifest.next_gate,
  "apollyon_live_custody_source_session_create_only_install_v1",
);

console.log("VOID_APOLLYON_CUSTODY_DEPLOYMENT_MANIFEST_V1_PROOF_GREEN");
console.log("systemd_8_18_review_bound=true");
console.log("live_session_reviewed_root_v2=true");
console.log("root_custodied_node_runtime_required=true");
console.log("node_runtime_path=/opt/void-apollyon-node-runtime-v1/node");
console.log("node_runtime_sha256=7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c");
console.log("custody_identity_create_only_required=true");
console.log("training_ipc_membership_additive_required=true");
console.log("custody_service_refuse_manual_start_stop=true");
console.log("activation_target_separate=true");
console.log("activation_target_stop_propagates_to_service=true");
console.log("restart_safe_socket_cleanup_required=true");
console.log("stale_socket_cleanup_external_fulfilled=true");
console.log("direct_service_start_stop_refused=true");
console.log("operator_public_key_required=true");
console.log("operator_public_key_raw_sha256=c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134");
console.log("preentry_static_lock_bound=true");
console.log("preentry_pt_interp_absent=true");
console.log("preentry_hostile_ld_preload_blocked=true");
console.log("preentry_lock_artifact_bound=true");
console.log("configuration_files_root_owned=true");
console.log("environment_exact_five_keys=true");
console.log("loader_environment_keys_forbidden=true");
console.log("configuration_acceptance_revalidation_required=true");
console.log("socket_parent_tmpfiles_bound=true");
console.log("operator_private_key_required=false");
console.log("service_start=false");
console.log("service_enable=false");
console.log("training_execution=false");
