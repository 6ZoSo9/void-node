#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER =
  "VOID_BUY_COUPLED_LAUNCH_RUNTIME_INTEGRATION_GENERATION_DISPATCH_V2";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BAKERY =
  "src/economic/buy_void_filesystem_bakery_lock_v1.ts";
const CURRENT_BAKERY_BLOB =
  "9bd47abb857368d928c0ca289766cdf3571629ba";
const HISTORICAL_DISPATCH =
  "scripts/prove_void_buy_coupled_launch_runtime_integration_generation_dispatch_v1.mjs";
const HISTORICAL_DISPATCH_BLOB =
  "fdd906038dda6fe000ace8a452e8d32247637ef3";
const HISTORICAL_RUNTIME =
  "scripts/prove_void_buy_coupled_launch_runtime_integration_v1.mjs";
const HISTORICAL_RUNTIME_BLOB =
  "699dacd2d4eb21e1a1213a8d0d5d8da94717f3e7";
const CURRENT_RUNTIME =
  "scripts/prove_void_buy_coupled_launch_runtime_integration_current_v2.mjs";
const CURRENT_RUNTIME_BLOB =
  "1a6316f3ab6f90c649b5a267b27d823513c90d97";

function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

for (const [relative, expected] of [
  [BAKERY, CURRENT_BAKERY_BLOB],
  [HISTORICAL_DISPATCH, HISTORICAL_DISPATCH_BLOB],
  [HISTORICAL_RUNTIME, HISTORICAL_RUNTIME_BLOB],
  [CURRENT_RUNTIME, CURRENT_RUNTIME_BLOB],
]) {
  assert.equal(
    gitBlobSha1(fs.readFileSync(path.join(ROOT, relative))),
    expected,
    "reviewed generation blob drift: " + relative,
  );
}

const child = spawnSync(process.execPath, [CURRENT_RUNTIME], {
  cwd: ROOT,
  encoding: "utf8",
  env: { ...process.env },
  stdio: ["ignore", "pipe", "pipe"],
  timeout: 180_000,
  maxBuffer: 32 * 1024 * 1024,
});
assert.equal(child.error, undefined);
assert.equal(
  child.status,
  0,
  "current Epoch-2 coupled-launch integration must succeed",
);

const stdout = String(child.stdout || "");
for (const marker of [
  "VOID_BUY_COUPLED_LAUNCH_RUNTIME_INTEGRATION_CURRENT_V2_GREEN",
  "generation_transition_publication_uses_same_lock=true",
  "historical_enforcement_v5_epoch2_source_hold=true",
  "current_epoch2_source_tuple_qualified=true",
  "current_enforcement_v5_candidate_acceptance=false",
  "funds_movement=false",
  "runtime_activation_performed=false",
]) {
  assert.ok(stdout.includes(marker), "current integration missing: " + marker);
}

console.log(MARKER + "_GREEN");
console.log("current_bakery_git_blob_sha1=" + CURRENT_BAKERY_BLOB);
console.log("historical_dispatch_v1_preserved=true");
console.log("historical_runtime_v1_preserved=true");
console.log("current_epoch2_runtime_v2_exact_blob_bound=true");
console.log("historical_enforcement_v5_expected_hold=true");
console.log("current_epoch2_source_tuple_qualified=true");
console.log("current_enforcement_v5_candidate_acceptance=false");
console.log("runtime_mutation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
