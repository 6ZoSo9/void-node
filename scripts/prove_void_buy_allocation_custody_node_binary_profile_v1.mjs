#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_CUSTODY_NODE_BINARY_AUTHORITY_V1,
  VOID_BUY_VOID_CUSTODY_NODE_BINARY_EXPECTED_V1,
  VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_ID_V1,
  VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_SCHEMA_V1,
  VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_V1,
  canonicalJsonV1,
  classifyVoidBuyVoidCustodyNodeBinaryProfileV1,
  inspectVoidBuyVoidCustodyNodeBinaryProfileV1,
} from "../tools/void-buy-allocation-custody-node-binary-profile-v1.mjs";

assert.equal(
  VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_V1,
  "VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_V1",
);
assert.equal(
  VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_SCHEMA_V1,
  "void_buy_void_custody_node_binary_profile_v1",
);
assert.match(
  VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_ID_V1,
  /^voidbuycustodynode1_[0-9a-f]{64}$/u,
);

const expected = VOID_BUY_VOID_CUSTODY_NODE_BINARY_EXPECTED_V1;
assert.deepEqual(expected, {
  host: "zoso-Precision-Tower-7810",
  path: "/usr/bin/node",
  bytes: 124827920,
  sha256: "fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48",
  version_string: "v22.23.3",
  uid: 0,
  gid: 0,
  mode_octal: "0755",
  nlink: 1,
  direct_regular: true,
  root_owned: true,
  group_world_writable: false,
  elf: true,
  stable_during_observation: true,
  parent_chain: [
    {
      path: "/",
      uid: 0,
      gid: 0,
      mode_octal: "0755",
      root_owned: true,
      group_world_writable: false,
    },
    {
      path: "/usr",
      uid: 0,
      gid: 0,
      mode_octal: "0755",
      root_owned: true,
      group_world_writable: false,
    },
    {
      path: "/usr/bin",
      uid: 0,
      gid: 0,
      mode_octal: "0755",
      root_owned: true,
      group_world_writable: false,
    },
  ],
});

const positive = classifyVoidBuyVoidCustodyNodeBinaryProfileV1(expected);
assert.equal(positive.ok, true);
assert.equal(positive.status, "SOURCE_EXPECTED_NODE_BINARY_IDENTITY_GREEN");
assert.equal(positive.expected_node_binary_identity_selected, true);
assert.equal(positive.live_at_use_reverification_required, true);
assert.equal(positive.node_binary_identity_verified, false);
assert.equal(positive.runtime_integration, false);
assert.equal(positive.payment_acceptance, false);
assert.equal(positive.public_presale_activation, false);
assert.equal(positive.production_gate_ready, false);
assert.equal(positive.funds_movement, false);

for (const mutate of [
  (x) => { x.path = "/usr/local/bin/node"; },
  (x) => { x.sha256 = "0".repeat(64); },
  (x) => { x.version_string = "v24.0.0"; },
  (x) => { x.bytes += 1; },
  (x) => { x.uid = 1000; },
  (x) => { x.mode_octal = "0775"; },
  (x) => { x.nlink = 2; },
  (x) => { x.direct_regular = false; },
  (x) => { x.elf = false; },
  (x) => { x.stable_during_observation = false; },
  (x) => { x.parent_chain[2].group_world_writable = true; },
  (x) => { x.extra = true; },
]) {
  const candidate = structuredClone(expected);
  mutate(candidate);
  const result = classifyVoidBuyVoidCustodyNodeBinaryProfileV1(candidate);
  assert.equal(result.ok, false);
  assert.equal(result.status, "HOLD");
  assert.equal(result.reason, "custody_node_binary_identity_mismatch");
}

const profile = inspectVoidBuyVoidCustodyNodeBinaryProfileV1();
const { profile_id: ignored, ...body } = profile;
const recomputed =
  "voidbuycustodynode1_" +
  crypto
    .createHash("sha256")
    .update(Buffer.from(canonicalJsonV1(body) + "\n", "utf8"))
    .digest("hex");
assert.equal(recomputed, VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_ID_V1);
assert.equal(profile.observation_basis.authenticated_attestation, false);
assert.equal(profile.observation_basis.observation_time_bound, false);

for (const [key, expectedValue] of Object.entries({
  source_expected_identity_only: true,
  expected_node_binary_identity_selected: true,
  operator_evidence_authenticated: false,
  operator_evidence_signed: false,
  observation_time_bound: false,
  observation_freshness_proven: false,
  live_at_use_reverification_required: true,
  node_binary_identity_verified: false,
  immutable_root_install: false,
  service_unit_installed: false,
  service_started: false,
  service_restarted: false,
  runtime_integration: false,
  reserve_method_enabled: false,
  recover_method_enabled: false,
  payment_acceptance: false,
  public_presale_activation: false,
  production_gate_ready: false,
  funds_movement: false,
})) {
  assert.equal(VOID_BUY_VOID_CUSTODY_NODE_BINARY_AUTHORITY_V1[key], expectedValue, key);
}

const lock = JSON.parse(
  fs.readFileSync(
    "ops/security/buy-void-allocation-custody-runtime-bundle-lock-v1.json",
    "utf8",
  ),
);
assert.equal(lock.marker, "VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_LOCK_V1");
assert.equal(lock.candidate_accepted, true);
assert.equal(lock.node_binary_identity_verified, false);
assert.equal(lock.runtime_integration, false);
assert.equal(lock.payment_acceptance, false);
assert.equal(lock.public_presale_activation, false);
assert.equal(lock.funds_movement, false);

const source = fs.readFileSync(
  "tools/void-buy-allocation-custody-node-binary-profile-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "node:child_process",
  "execSync(",
  "spawnSync(",
  "writeFile",
  "systemctl",
  "sudo ",
  "/proc/",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_V1_GREEN");
console.log("profile_id=" + VOID_BUY_VOID_CUSTODY_NODE_BINARY_PROFILE_ID_V1);
console.log("fixed_node_path=/usr/bin/node");
console.log("node_version=v22.23.3");
console.log("node_bytes=124827920");
console.log("node_sha256=fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48");
console.log("expected_node_binary_identity_selected=true");
console.log("operator_evidence_authenticated=false");
console.log("observation_freshness_proven=false");
console.log("live_at_use_reverification_required=true");
console.log("node_binary_identity_verified=false");
console.log("runtime_integration=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
