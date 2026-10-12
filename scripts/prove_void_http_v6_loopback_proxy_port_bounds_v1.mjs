#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proxyRepoPath = "src/diag/http_v6_loopback_proxy_4100_v1.cjs";
const proxyPath = path.join(repoRoot, proxyRepoPath);

const staged = execFileSync(
  "git",
  ["ls-files", "--stage", "--", proxyRepoPath],
  { cwd: repoRoot, encoding: "utf8" },
).trim();
const [mode, blob, stage, trackedPath, ...extra] = staged.split(/\s+/);
assert.equal(mode, "100755", `${proxyRepoPath} must remain executable`);
assert.match(blob, /^[0-9a-f]{40}$/, "tracked proxy blob must be present");
assert.equal(stage, "0", "tracked proxy must be at index stage zero");
assert.equal(trackedPath, proxyRepoPath);
assert.deepEqual(extra, []);

const direct = spawnSync(proxyPath, [], {
  encoding: "utf8",
  env: { ...process.env, V6PROXY_LISTEN_PORT: "" },
  timeout: 1_000,
});
assert.equal(direct.error, undefined, "proxy must be directly executable");
assert.notEqual(direct.status, 0, "invalid direct invocation must fail closed");
assert.equal(direct.signal, null, "invalid direct invocation must fail before listening");
assert.match(direct.stderr, /V6PROXY_LISTEN_PORT/);

const cases = [
  ["V6PROXY_LISTEN_PORT", ""],
  ["V6PROXY_LISTEN_PORT", "4100tail"],
  ["V6PROXY_LISTEN_PORT", "04100"],
  ["V6PROXY_LISTEN_PORT", "0"],
  ["V6PROXY_LISTEN_PORT", "65536"],
  ["V6PROXY_LISTEN_PORT", "1e3"],
  ["V6PROXY_LISTEN_PORT", " 4100"],
  ["V6PROXY_TARGET_PORT", ""],
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
console.log("proxy_git_mode=100755");
console.log("proxy_direct_execution_inert_failure=true");
console.log(`rejected_noncanonical_or_out_of_range_ports=${cases.length}`);
console.log("network_listener_started=false");
