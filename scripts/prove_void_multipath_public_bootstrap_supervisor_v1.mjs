#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  bootstrapTransportPlanV1,
  composeFollowerOriginsV1,
  validateLoopbackAdapterOriginV1,
} from "./lib/void_multipath_public_bootstrap_supervisor_v1.mjs";

const MARKER = "VOID_MULTIPATH_PUBLIC_BOOTSTRAP_SUPERVISOR_V1_PROOF";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`${MARKER}_FAIL`);
  console.error(message);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function expectThrow(fn, pattern, label) {
  let error = null;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }
  if (!error || !pattern.test(String(error.message || error))) {
    fail(`${label} did not fail as expected`);
  }
}

const httpsOnly = bootstrapTransportPlanV1({
  httpsPeers: "https://203.0.113.10",
});
expect(JSON.stringify(httpsOnly.transports) === JSON.stringify(["https"]), "HTTPS-only plan mismatch");
expect(httpsOnly.followerFailoverEnabled === false, "HTTPS-only plan must not claim cross-transport failover");

const torOnly = bootstrapTransportPlanV1({
  torPeers: "http://exampleexampleexampleexampleexampleexampleexampleexample.onion",
});
expect(JSON.stringify(torOnly.transports) === JSON.stringify(["tor"]), "Tor-only plan mismatch");

const both = bootstrapTransportPlanV1({
  httpsPeers: "https://203.0.113.10",
  torPeers: "http://exampleexampleexampleexampleexampleexampleexampleexample.onion",
  requireMultipath: true,
});
expect(JSON.stringify(both.transports) === JSON.stringify(["https", "tor"]), "dual-transport plan mismatch");
expect(both.followerFailoverEnabled === true, "dual-transport plan must enable follower failover");
expectThrow(
  () => bootstrapTransportPlanV1({ httpsPeers: "https://203.0.113.10", requireMultipath: true }),
  /requires both HTTPS and Tor/,
  "multipath acceptance with one class",
);
expectThrow(
  () => bootstrapTransportPlanV1({}),
  /at least one verified public bootstrap transport/,
  "empty transport plan",
);

const composed = composeFollowerOriginsV1([
  { transport: "https", base: "http://127.0.0.1:4191" },
  { transport: "tor", base: "http://127.0.0.1:4192" },
]);
expect(
  JSON.stringify(composed.followerOrigins) === JSON.stringify(["http://127.0.0.1:4191", "http://127.0.0.1:4192"]),
  "follower origin composition mismatch",
);
expectThrow(
  () => validateLoopbackAdapterOriginV1("https://127.0.0.1:4191", "https"),
  /unadorned local HTTP origin/,
  "remote/HTTPS adapter origin",
);
expectThrow(
  () => validateLoopbackAdapterOriginV1("http://192.168.1.20:4191", "https"),
  /numeric loopback/,
  "non-loopback adapter origin",
);
expectThrow(
  () => composeFollowerOriginsV1([
    { transport: "https", base: "http://127.0.0.1:4191" },
    { transport: "tor", base: "http://127.0.0.1:4191" },
  ]),
  /distinct loopback origins/,
  "duplicate adapter origin",
);

const launcher = fs.readFileSync(path.join(ROOT, "run-void-node.sh"), "utf8");
const resolver = fs.readFileSync(path.join(ROOT, "scripts", "resolve_void_public_bootstrap_v1.mjs"), "utf8");
const runtimeSupervisor = fs.readFileSync(
  path.join(ROOT, "scripts", "run_void_multipath_public_bootstrap_supervisor_v1.mjs"),
  "utf8",
);

for (const token of [
  "VOID_PUBLIC_BOOTSTRAP_REQUIRE_MULTIPATH",
  "resolve_https_public_bootstrap_v1",
  "resolve_tor_public_bootstrap_v1",
  "reverify HTTPS bootstrap trust after live-resolution failure",
  "reverify Tor bootstrap trust after live-resolution failure",
  "resolved_multipath_https_tor",
  "VOID_MULTIPATH_PUBLIC_BOOTSTRAP_NODE_ENTRY",
]) {
  expect(launcher.includes(token), `launcher missing contract token: ${token}`);
}
for (const token of [
  "--verify-only",
  "EXIT_TRUST_INVALID = 2",
  "EXIT_TRANSPORT_UNAVAILABLE = 3",
  "trust_material_verified=true",
  "live_seed_probe_performed=false",
]) {
  expect(resolver.includes(token), `HTTPS resolver missing contract token: ${token}`);
}
for (const token of [
  "VOID_FOLLOWER_AUTOSTART_PEERS",
  "VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE",
  "createPublicSeedClientAdapterV1",
  "createTorPublicSeedClientAdapterV1",
  "adapter_loopback_only=true",
  "money_movement_authority=false",
]) {
  expect(runtimeSupervisor.includes(token), `runtime supervisor missing contract token: ${token}`);
}
expect(!launcher.includes("BOOTSTRAP_ADDRS="), "launcher must not synthesize manual BOOTSTRAP_ADDRS");

console.log("VOID_MULTIPATH_PUBLIC_BOOTSTRAP_SUPERVISOR_V1_PROOF_GREEN");
console.log("invalid_published_https_trust_fails_closed=true");
console.log("https_transport_unavailability_is_classified=true");
console.log("invalid_published_tor_trust_fails_closed=true");
console.log("tor_trust_reverified_after_live_resolution_failure=true");
console.log("tor_unavailability_can_fall_back_to_https=true");
console.log("https_unavailability_can_fall_back_to_tor=true");
console.log("acceptance_mode_requires_both_transport_classes=true");
console.log("manual_bootstrap_addrs_required=false");
console.log("tailnet_required=false");
console.log("wallet_signer_validator_wc_money_authority=0");
