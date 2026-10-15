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
  "/opt/void-apollyon-custody-service-v2-reviewed-v1/tools/apollyon-authorization-custody-launcher-v2.mjs",
]){
  assert.equal(unit.includes(required),true,required);
}
for(const forbidden of ["WantedBy=","ExecStartPre=/bin/sh","sudo ","curl ","wget "]){
  assert.equal(unit.includes(forbidden),false,"unit:"+forbidden);
}

const target=fs.readFileSync(TARGET,"utf8");
assert.equal(target.includes("Wants=void-apollyon-authorization-custody-v1.service"),true);
assert.equal(target.includes("After=void-apollyon-authorization-custody-v1.service"),true);
assert.equal(target.includes("WantedBy=multi-user.target"),true);

const env=fs.readFileSync(ENV_TEMPLATE,"utf8");
for(const required of [
  "VOID_APOLLYON_CUSTODY_SOCKET_PATH=/run/void-apollyon-custody-v1/custody.sock",
  "VOID_APOLLYON_CUSTODY_STATE_ROOT=/var/lib/void-apollyon-custody-v1",
  "VOID_APOLLYON_CUSTODY_SOCKET_GROUP_GID=@IPC_GID@",
  "VOID_APOLLYON_CUSTODY_OPERATOR_PUBLIC_KEY_FILE=/etc/void/apollyon-custody-v1/operator-public-key.pem",
  "VOID_APOLLYON_CUSTODY_OPERATOR_PUBLIC_KEY_RAW_SHA256=@OPERATOR_PUBLIC_KEY_RAW_SHA256@",
]){
  assert.equal(env.includes(required),true,required);
}

const polkit=fs.readFileSync(POLKIT);
assert.equal(polkit.length,443);
assert.equal(sha256(polkit),"492bbe168680fc81b27ac811f8b9c8900751e09c861523f1ab845e017acaea22");
assert.equal(polkit.toString("utf8").includes('subject.user === "voidapollyontrain"'),true);

for(const [relative,expected] of Object.entries({
  ...manifest.custody_service_closure,
  ...manifest.live_session_closure,
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}
assert.equal(
  gitBlob(fs.readFileSync(path.join(ROOT,"ops/xiphos/apollyon_live_custody_source_session_preentry_v2.c"))),
  "1d0d9893939d1a457970b3b1f16dae06e7fef067",
);

assert.equal(manifest.preentry_lock.bytes,16912);
assert.equal(
  manifest.preentry_lock.sha256,
  "66d9b1c1fff316ecf96d7af73af7bf4a4442d6ce10f0e2df906fa1a79dc5580c",
);
assert.equal(manifest.required_operator_input.private_key_required,false);
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
console.log("custody_identity_create_only_required=true");
console.log("training_ipc_membership_additive_required=true");
console.log("custody_service_refuse_manual_start_stop=true");
console.log("activation_target_separate=true");
console.log("operator_public_key_required=true");
console.log("operator_private_key_required=false");
console.log("service_start=false");
console.log("service_enable=false");
console.log("training_execution=false");
