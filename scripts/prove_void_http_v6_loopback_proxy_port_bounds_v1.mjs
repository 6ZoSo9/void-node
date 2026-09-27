#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proxyPath = path.join(
  repoRoot,
  "src/diag/http_v6_loopback_proxy_4100_v1.cjs",
);

const cases = [
  ["V6PROXY_LISTEN_PORT", "4100tail"],
  ["V6PROXY_LISTEN_PORT", "04100"],
  ["V6PROXY_LISTEN_PORT", "0"],
  ["V6PROXY_LISTEN_PORT", "65536"],
  ["V6PROXY_LISTEN_PORT", "1e3"],
  ["V6PROXY_LISTEN_PORT", " 4100"],
  ["V6PROXY_TARGET_PORT", "4100tail"],
  ["V6PROXY_TARGET_PORT", "65536"],
];

for (const [name, value] of cases) {
  const result = spawnSync(process.execPath, [proxyPath], {
    encoding: "utf8",
    env: { ...process.env, [name]: value },
    timeout: 1_000,
  });

  assert.notEqual(result.status, 0, `${name}=${value} must fail closed`);
  assert.equal(result.signal, null, `${name}=${value} must fail before listening`);
  assert.match(result.stderr, new RegExp(name));
}

console.log("void_http_v6_loopback_proxy_port_bounds_v1=PASS");
console.log(`rejected_noncanonical_or_out_of_range_ports=${cases.length}`);
console.log("network_listener_started=false");
