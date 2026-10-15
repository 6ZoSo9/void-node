#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const MARKER="VOID_BUY_VOID_USER_RUNTIME_CUSTODY_HARDENING_V1";
const FILE="ops/systemd/void-node-live.service.d/98-buy-void-allocation-custody-runtime-hardening-v1.conf.example";
const expected=[
  "[Service]",
  "NoNewPrivileges=yes",
  "CapabilityBoundingSet=",
  "AmbientCapabilities=",
  "",
].join("\n");

const raw=fs.readFileSync(path.resolve(FILE),"utf8");
assert.equal(raw,expected,"hardening_dropin_exact_bytes");
assert.equal(raw.endsWith("\n"),true);
const lines=raw.split("\n");
assert.deepEqual(lines,[
  "[Service]",
  "NoNewPrivileges=yes",
  "CapabilityBoundingSet=",
  "AmbientCapabilities=",
  "",
]);
for(const forbidden of [
  "User=",
  "Group=",
  "ExecStart=",
  "Environment=",
  "EnvironmentFile=",
  "ReadWritePaths=",
  "BindPaths=",
  "BindReadOnlyPaths=",
  "SupplementaryGroups=",
  "RestrictAddressFamilies=",
  "PrivateNetwork=",
  "IPAddressDeny=",
  "IPAddressAllow=",
]){
  assert.equal(raw.includes(forbidden),false,forbidden);
}
console.log(MARKER+"_GREEN");
console.log("target_manager=user");
console.log("target_service=void-node-live.service");
console.log("no_new_privileges_required=true");
console.log("capability_bounding_set_empty_required=true");
console.log("ambient_capabilities_empty_required=true");
console.log("user_or_group_migration=false");
console.log("service_restart_authorized=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
