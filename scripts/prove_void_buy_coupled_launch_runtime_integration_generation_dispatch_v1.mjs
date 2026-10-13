#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER =
  "VOID_BUY_COUPLED_LAUNCH_RUNTIME_INTEGRATION_GENERATION_DISPATCH_V1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HISTORICAL_V5_SOURCE_HEAD =
  "22a30e3ffad6047a472488104c769140bd050878";
const BAKERY =
  "src/economic/buy_void_filesystem_bakery_lock_v1.ts";
const CURRENT_BAKERY_BLOB =
  "9bd47abb857368d928c0ca289766cdf3571629ba";

function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

const bakeryBytes = fs.readFileSync(path.join(ROOT, BAKERY));
assert.equal(gitBlobSha1(bakeryBytes), CURRENT_BAKERY_BLOB);

const historicalV5 = fs.readFileSync(
  path.join(ROOT, "scripts/prove_buy_void_enforcement_artifact_attestation_v5_candidate.mjs"),
  "utf8",
);
assert.match(
  historicalV5,
  new RegExp('const SOURCE_HEAD = "' + HISTORICAL_V5_SOURCE_HEAD + '";'),
);
assert.match(
  historicalV5,
  /runReviewedGitV1\(\["merge-base","--is-ancestor",SOURCE_HEAD,"HEAD"\]/u,
);
assert.match(historicalV5, /runReviewedGitV1\(\[\s*"diff"/u);

const child = spawnSync(
  process.execPath,
  ["scripts/prove_void_buy_coupled_launch_runtime_integration_v1.mjs"],
  {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180_000,
    maxBuffer: 32 * 1024 * 1024,
  },
);
assert.equal(child.error, undefined);
assert.equal(
  child.status,
  1,
  "historical V5 must reject the advanced current source generation",
);

const stdout = String(child.stdout || "");
const stderr = String(child.stderr || "");
const combined = stdout + "\n" + stderr;

for (const marker of [
  "VOID_BUY_COUPLED_LAUNCH_RUNTIME_INTEGRATION_V1_GREEN",
  "shared_generation_authority_bakery_lock_required=true",
  "request_launch_authority_revalidated_before_persist=true",
  "verified_payment_duplicate_guard_inside_capacity_lock=true",
  "canonical_coupled_readiness_dependency_closure_bound=true",
]) {
  assert.ok(stdout.includes(marker), "functional integration did not reach: " + marker);
}

assert.match(combined, /Command failed: \/usr\/bin\/git/u);
assert.ok(
  combined.includes(
    "diff --quiet --no-ext-diff --no-textconv " +
      HISTORICAL_V5_SOURCE_HEAD +
      " HEAD --",
  ),
  "historical V5 refusal did not occur at reviewed source-closure diff",
);
assert.ok(
  combined.includes(BAKERY),
  "historical V5 reviewed closure did not include bakery lock",
);
assert.ok(
  combined.includes("deriveBuyVoidEnforcementArtifactAttestationV5Candidate"),
  "historical V5 refusal stack missing",
);

console.log(MARKER + "_GREEN");
console.log("current_runtime_functional_integration_green=true");
console.log("current_bakery_git_blob_sha1=" + CURRENT_BAKERY_BLOB);
console.log("historical_enforcement_v5_source_head=" + HISTORICAL_V5_SOURCE_HEAD);
console.log("historical_enforcement_v5_expected_hold=true");
console.log("historical_enforcement_v5_acceptance=false");
console.log("current_enforcement_successor_not_claimed=true");
console.log("runtime_mutation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
