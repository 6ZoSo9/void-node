#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER =
  "VOID_BUY_COUPLED_LAUNCH_RUNTIME_INTEGRATION_GENERATION_DISPATCH_V3";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BAKERY =
  "src/economic/buy_void_filesystem_bakery_lock_v1.ts";
const CURRENT_BAKERY_BLOB =
  "9bd47abb857368d928c0ca289766cdf3571629ba";
const HISTORICAL_DISPATCH_V1 =
  "scripts/prove_void_buy_coupled_launch_runtime_integration_generation_dispatch_v1.mjs";
const HISTORICAL_DISPATCH_V1_BLOB =
  "fdd906038dda6fe000ace8a452e8d32247637ef3";
const HISTORICAL_DISPATCH_V2 =
  "scripts/prove_void_buy_coupled_launch_runtime_integration_generation_dispatch_v2.mjs";
const HISTORICAL_DISPATCH_V2_BLOB =
  "7bc37b4ffcc2d3071bfcedfbeccc734161033b08";
const HISTORICAL_RUNTIME =
  "scripts/prove_void_buy_coupled_launch_runtime_integration_v1.mjs";
const HISTORICAL_RUNTIME_BLOB =
  "699dacd2d4eb21e1a1213a8d0d5d8da94717f3e7";
const CURRENT_RUNTIME =
  "scripts/prove_void_buy_coupled_launch_runtime_integration_current_v2.mjs";
const CURRENT_RUNTIME_BLOB =
  "8b942c99209cafc6f00425720b8aa5c58d247dd3";
const EPOCH2_SOURCE_V3 =
  "tools/void-buy-void-epoch2-postgres-source-qualification-v3.mjs";
const EPOCH2_SOURCE_V3_BLOB =
  "38230df7822b3dcbdc24a42e4fd2e2c24cc43009";
const EPOCH2_SOURCE_V3_PROOF =
  "scripts/prove_void_buy_void_epoch2_postgres_source_qualification_v3.mjs";
const EPOCH2_SOURCE_V3_PROOF_BLOB =
  "95f4ac1c4c764feed6b1782c22f1ec1038518015";

function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

for (const [relative, expected] of [
  [BAKERY, CURRENT_BAKERY_BLOB],
  [HISTORICAL_DISPATCH_V1, HISTORICAL_DISPATCH_V1_BLOB],
  [HISTORICAL_DISPATCH_V2, HISTORICAL_DISPATCH_V2_BLOB],
  [HISTORICAL_RUNTIME, HISTORICAL_RUNTIME_BLOB],
  [CURRENT_RUNTIME, CURRENT_RUNTIME_BLOB],
  [EPOCH2_SOURCE_V3, EPOCH2_SOURCE_V3_BLOB],
  [EPOCH2_SOURCE_V3_PROOF, EPOCH2_SOURCE_V3_PROOF_BLOB],
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
const stdout = String(child.stdout || "");
const stderr = String(child.stderr || "");
assert.equal(
  child.status,
  0,
  "current Epoch-2 coupled-launch integration must succeed" +
    "\nstdout:\n" + stdout +
    "\nstderr:\n" + stderr,
);
for (const marker of [
  "VOID_BUY_COUPLED_LAUNCH_RUNTIME_INTEGRATION_CURRENT_V2_GREEN",
  "generation_transition_publication_uses_same_lock=true",
  "historical_enforcement_v5_current_package_hold=true",
  "current_epoch2_source_tuple_v3_qualified=true",
  "current_enforcement_v5_candidate_acceptance=false",
  "funds_movement=false",
  "runtime_activation_performed=false",
]) {
  assert.ok(stdout.includes(marker), "current integration missing: " + marker);
}

console.log(MARKER + "_GREEN");
console.log("current_bakery_git_blob_sha1=" + CURRENT_BAKERY_BLOB);
console.log("historical_dispatch_v1_preserved=true");
console.log("historical_dispatch_v2_preserved=true");
console.log("historical_runtime_v1_preserved=true");
console.log("current_epoch2_runtime_v2_successor_blob_bound=true");
console.log("current_epoch2_source_v3_blob_bound=true");
console.log("current_epoch2_source_v3_proof_blob_bound=true");
console.log("historical_enforcement_v5_expected_hold=true");
console.log("current_epoch2_source_tuple_v3_qualified=true");
console.log("current_enforcement_v5_candidate_acceptance=false");
console.log("runtime_mutation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
