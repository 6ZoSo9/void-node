#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  EARN_RULES,
  EPOCH2_RULES,
  EARN_ORIGIN,
  EPOCH2_ORIGIN,
  SEED_ORIGIN,
  buildEpoch2PublicReadTunnelOverlayV1,
  parseEpoch2PublicReadTunnelSourceV1,
} from "../tools/void-economic-epoch2-public-read-tunnel-overlay-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INSTALLER = path.join(
  ROOT,
  "ops/mainnet0/install-void-economic-epoch2-public-read-tunnel-overlay-v1.sh",
);
const TUNNEL = "dc1fd639-c2ba-4eb8-b90b-7f73ac020cd9";
const CREDENTIAL = "/home/fixture/.cloudflared/" + TUNNEL + ".json";

function config(rules) {
  const lines = [
    "tunnel: " + TUNNEL,
    "credentials-file: " + CREDENTIAL,
    "originRequest:",
    "  connectTimeout: 10s",
    "ingress:",
  ];
  for (const rule of rules) {
    lines.push(
      "  - hostname: seed.nullfeed.org",
      "    path: " + rule.path,
      "    service: " + rule.service,
    );
  }
  lines.push(
    "  - hostname: seed.nullfeed.org",
    "    service: " + SEED_ORIGIN,
    "  - service: http_status:404",
    "",
  );
  return lines.join("\n");
}

const baseline = config(EARN_RULES);
const parsed = parseEpoch2PublicReadTunnelSourceV1(baseline);
assert.equal(parsed.sourceEpoch2RulesPresent, false);

const built = buildEpoch2PublicReadTunnelOverlayV1(baseline);
assert.equal(built.manifest.source_epoch2_rules_present, false);
assert.equal(built.manifest.earn_route_count, 5);
assert.equal(built.manifest.epoch2_route_count, 4);
assert.equal(built.manifest.raw_public_rpc_allowed, false);
assert.equal(built.manifest.transaction_submission, false);
assert.equal(built.manifest.transaction_broadcast, false);
assert.equal(built.manifest.authoritative_chain2050_write, false);
assert.equal(built.manifest.funds_movement, false);

const upgraded = config([...EARN_RULES, ...EPOCH2_RULES]);
assert.equal(built.config, upgraded);
assert.equal(
  parseEpoch2PublicReadTunnelSourceV1(upgraded).sourceEpoch2RulesPresent,
  true,
);
assert.equal(buildEpoch2PublicReadTunnelOverlayV1(upgraded).config, upgraded);

for (const rule of EARN_RULES) {
  assert.ok(upgraded.includes("path: " + rule.path));
  assert.ok(upgraded.includes("service: " + EARN_ORIGIN));
}
for (const rule of EPOCH2_RULES) {
  assert.ok(upgraded.includes("path: " + rule.path));
  assert.ok(upgraded.includes("service: " + EPOCH2_ORIGIN));
}
assert.ok(upgraded.includes("service: " + SEED_ORIGIN));
assert.ok(upgraded.includes("service: http_status:404"));

const invalid = [
  baseline.replace(EARN_RULES[0].path, "^/.*$"),
  baseline.replace(EARN_ORIGIN, "http://127.0.0.1:8082"),
  baseline.replace(SEED_ORIGIN, "http://127.0.0.1:8082"),
  baseline.replace("  - service: http_status:404\n", ""),
  upgraded.replace(EPOCH2_RULES[0].path, "^/public-node/economic/epoch2/.*$"),
  upgraded.replace(EPOCH2_ORIGIN, "http://0.0.0.0:8083"),
  upgraded.replace(
    "  - hostname: seed.nullfeed.org\n    service: " + SEED_ORIGIN,
    "  - hostname: seed.nullfeed.org\n    path: ^/admin$\n    service: " +
      EPOCH2_ORIGIN +
      "\n  - hostname: seed.nullfeed.org\n    service: " +
      SEED_ORIGIN,
  ),
];
for (const value of invalid) {
  assert.throws(() => parseEpoch2PublicReadTunnelSourceV1(value));
}

const installer = fs.readFileSync(INSTALLER, "utf8");
for (const required of [
  "activateEpoch2PublicReadTunnelOverlayV1",
  "http://127.0.0.1:8082",
  "http://127.0.0.1:4122",
  "http://127.0.0.1:4111",
  "https://seed.nullfeed.org/public-node/economic/epoch2/read-status-v1.json",
  "https://seed.nullfeed.org/__void/public-earn-gateway-v1/status.json",
  "https://seed.nullfeed.org/__void/checkpoint/v1.json",
  "ROLLBACK_BEGIN",
  "TUNNEL_PUBLIC_GREEN=0",
  "EPOCH2_PUBLIC_GREEN=0",
  "for _ in $(seq 1 40); do",
  "tunnel_public_edge_not_ready_after_restart",
  "external_epoch2_status_not_ready:last_http_",
  "sleep 0.5",
  "raw_public_rpc_allowed=false",
  "transaction_submission=false",
  "transaction_broadcast=false",
  "authoritative_chain2050_write=false",
  "funds_movement=false",
]) {
  assert.ok(installer.includes(required), "installer missing " + required);
}
for (const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "--private-key",
  "wallet_file",
]) {
  assert.equal(installer.includes(forbidden), false, forbidden);
}

console.log("VOID_ECONOMIC_EPOCH2_PUBLIC_READ_TUNNEL_OVERLAY_V1_PROOF_GREEN");
console.log("earn_route_count=5");
console.log("epoch2_route_count=4");
console.log("epoch2_exact_path_proxy_only=true");
console.log("seed_fallback_preserved=true");
console.log("terminal_404_preserved=true");
console.log("raw_public_rpc_allowed=false");
console.log("transaction_submission=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");
