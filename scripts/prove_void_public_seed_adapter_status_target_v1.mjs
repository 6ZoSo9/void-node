#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_PUBLIC_SEED_ADAPTER_STATUS_TARGET_V1_PROOF_GREEN";
const scriptPath = "ops/public/public-seed-adapter-status-v1.sh";
const docPath = "docs/public/current-public-seed-adapter.md";
const makePath = "Makefile";

for (const file of [scriptPath, docPath, makePath]) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const script = fs.readFileSync(scriptPath, "utf8");
const doc = fs.readFileSync(docPath, "utf8");
const makefile = fs.readFileSync(makePath, "utf8");

assert.equal(
  script.includes('VOID_ADAPTER_HOST:-100.122.79.39'),
  false,
  "status helper still owns retired Alienware default",
);
assert.ok(
  script.includes("VOID_ADAPTER_HOST must be set explicitly"),
  "missing explicit-target HOLD",
);
assert.ok(
  script.includes("retired Alienware adapter target is forbidden"),
  "missing retired-target HOLD",
);

const firstCurl = script.indexOf("curl ");
assert.ok(firstCurl > 0, "status helper no longer contains expected network probes");
for (const token of [
  "VOID_ADAPTER_HOST must be set explicitly",
  "retired Alienware adapter target is forbidden",
]) {
  const at = script.indexOf(token);
  assert.ok(at >= 0 && at < firstCurl, `guard must precede network: ${token}`);
}

function run(envPatch = {}) {
  const env = { ...process.env, ...envPatch };
  delete env.VOID_ADAPTER_HOST;
  if (Object.prototype.hasOwnProperty.call(envPatch, "VOID_ADAPTER_HOST")) {
    env.VOID_ADAPTER_HOST = envPatch.VOID_ADAPTER_HOST;
  }
  const result = spawnSync("bash", [scriptPath], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    timeout: 2000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}

const missing = run();
assert.equal(missing.status, 2);
assert.match(missing.stderr, /VOID_ADAPTER_HOST must be set explicitly/);

for (const retired of [
  "100.122.79.39",
  "zoso-alienware-aurora-r7.taila47fd.ts.net",
  "ZOSO-ALIENWARE-AURORA-R7.TAILA47FD.TS.NET",
]) {
  const result = run({ VOID_ADAPTER_HOST: retired });
  assert.equal(result.status, 2, retired);
  assert.match(result.stderr, /retired Alienware adapter target is forbidden/, retired);
}

const staleWrapper =
  'VOID_ADAPTER_HOST=${VOID_ADAPTER_HOST:-100.122.79.39}';
assert.equal(
  makefile.includes(staleWrapper),
  false,
  "Makefile still injects retired Alienware adapter target",
);
for (const target of [
  "public-seed-adapter-status:\n\t@bash ops/public/public-seed-adapter-status-v1.sh",
  "public-seed-adapter-status-json:\n\t@bash ops/public/public-seed-adapter-status-v1.sh --json",
]) {
  assert.ok(makefile.includes(target), `Makefile target not explicit-target safe: ${target}`);
}

assert.ok(doc.includes("requires an explicit"));
assert.ok(doc.includes("VOID_ADAPTER_HOST"));
assert.ok(doc.includes("rejects the retired Alienware hostname or Tailnet IP"));
assert.ok(doc.includes("fails closed at the helper boundary"));

console.log(MARKER);
console.log("missing_target_hold=true");
console.log("retired_ip_hold=true");
console.log("retired_hostname_hold=true");
console.log("casefold_retired_hostname_hold=true");
console.log("guard_precedes_network=true");
console.log("makefile_retired_default_removed=true");
console.log("retired_default_removed=true");
console.log("runtime_mutation=false");
console.log("credentials_read=false");
console.log("funds_moved=false");
