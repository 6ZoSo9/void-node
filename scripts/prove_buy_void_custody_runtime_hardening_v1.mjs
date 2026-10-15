#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const FILE="ops/systemd/void-node-live.service.d/98-buy-void-custody-runtime-hardening-v1.conf.example";
const expected=[
  "[Service]",
  "NoNewPrivileges=yes",
  "CapabilityBoundingSet=",
  "AmbientCapabilities=",
  "",
].join("\n");

const bytes=fs.readFileSync(FILE,"utf8");
assert.equal(bytes,expected,"dropin_exact_bytes");

const lines=bytes.trimEnd().split("\n");
assert.deepEqual(lines,[
  "[Service]",
  "NoNewPrivileges=yes",
  "CapabilityBoundingSet=",
  "AmbientCapabilities=",
]);

for(const forbidden of [
  "ExecStart=",
  "ExecStartPre=",
  "ExecStartPost=",
  "User=",
  "Group=",
  "Environment=",
  "EnvironmentFile=",
  "LoadCredential=",
  "SetCredential=",
  "ReadWritePaths=",
  "ReadOnlyPaths=",
  "BindPaths=",
  "BindReadOnlyPaths=",
  "RootDirectory=",
  "ProtectSystem=",
  "ProtectHome=",
  "PrivateNetwork=",
  "RestrictAddressFamilies=",
  "IPAddressAllow=",
  "IPAddressDeny=",
]){
  assert.equal(bytes.includes(forbidden),false,forbidden);
}

const hostEvidence=fs.readFileSync(
  "tools/void-buy-allocation-custody-host-evidence-v1.mjs",
  "utf8",
);
for(const needle of [
  '"NoNewPrivileges"',
  '"CapabilityBoundingSet"',
  '"AmbientCapabilities"',
  "runtime_service_capability_bounding_set",
  "runtime_service_ambient_capabilities",
  "runtime_process_capabilities",
]){
  assert.ok(hostEvidence.includes(needle),needle);
}

console.log("VOID_BUY_VOID_CUSTODY_RUNTIME_HARDENING_V1_GREEN");
console.log("service=void-node-live.service");
console.log("NoNewPrivileges=yes");
console.log("CapabilityBoundingSet=");
console.log("AmbientCapabilities=");
console.log("network_policy_changed=false");
console.log("environment_changed=false");
console.log("credential_binding_changed=false");
console.log("service_installed=false");
console.log("service_restarted=false");
console.log("host_mutation=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
