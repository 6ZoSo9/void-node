#!/usr/bin/env node
// Checkpoint precomposition admission for the latest immutable parent source.
// This does not merge branches, deploy a node or alter main/frozen evidence.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const OLD_PARENT = "cfc4a3c388f998bed217001d1ff7eeecaadca6ca";
const CURRENT_PARENT = "38fee809db1337610b4b516757c18d6907776743";
const MAIN = "cd7dfcf89fcbe62b5ece9a1e39543b525115a7a8";
const OLD_BLOB = "91151bb6ba5addf061a1a713aeceab142a814312";
const NEW_BLOB = "40239e0f76aa1edce43523d18c1b57691e41e8cf";
const MAIN_BLOB = "1fde828c97175560f98ab070af33eefc595f8002";
const V2_PROOF_BLOB = "b03a985c9c4a3dc78ebe3221ee1f2d8b87023b27";
const FROZEN_V1_BLOB = "033018d6caee821b370001d558fcfb81edda48f1";
const proofV2 = "scripts/prove_void_public_checkpoint_seal_first_startup_current_v2.mjs";
const proofV1 = "scripts/prove_void_public_checkpoint_seal_first_startup_v1.mjs";

function blob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0"))
    .update(bytes)
    .digest("hex");
}
function reviewedSource(commit, expected) {
  const bytes = execFileSync("git", ["show", commit + ":src/index.ts"], {
    maxBuffer: 8 * 1024 * 1024,
    timeout: 30_000,
  });
  assert.equal(blob(bytes), expected, "unreviewed commit source generation");
  return bytes.toString("utf8");
}
const old = reviewedSource(OLD_PARENT, OLD_BLOB);
const now = reviewedSource(CURRENT_PARENT, NEW_BLOB);
const baseline = reviewedSource(MAIN, MAIN_BLOB);
const local = fs.readFileSync("src/index.ts");
assert.equal(blob(local), OLD_BLOB,
  "this unmerged child checkout must retain its old reviewed source");
assert.equal(blob(fs.readFileSync(proofV2)), V2_PROOF_BLOB);
assert.equal(blob(fs.readFileSync(proofV1)), FROZEN_V1_BLOB);

const delta = ",\n" +
  "          // Identical public 409 envelope for a guessed matching or changed\n" +
  "          // amount/rail. Unauthenticated destination control must not reveal\n" +
  "          // the earlier buyer's private original request terms.\n" +
  "          ...(conflict?{one_active_request_cap_enforced:true}:{})";
assert.equal(Buffer.byteLength(delta), 287);
assert.equal(now.split(delta).length, 2, "409 privacy edit must occur exactly once");
assert.equal(now.replace(delta, ""), old,
  "latest parent must differ solely by reviewed anonymous 409 privacy edit");

const start = "  const node = new Node(P2P_PORT, kp, {";
const end = "\n// [ADD] expose live node globally";
function checkpointRegion(source) {
  const i = source.indexOf(start);
  const j = source.indexOf(end, i);
  assert.ok(i >= 0 && j > i, "checkpoint region missing");
  assert.equal(source.indexOf(start, i + 1), -1, "duplicate boot constructor");
  return source.slice(i, j);
}
const priorRegion = checkpointRegion(old);
const newestRegion = checkpointRegion(now);
const mainRegion = checkpointRegion(baseline);
assert.equal(Buffer.byteLength(newestRegion), 1524);
assert.equal(newestRegion, priorRegion, "checkpoint region moved in parent");
assert.equal(newestRegion, mainRegion, "checkpoint differs from reviewed main");
assert.ok(now.length <= 3_852_487, "index ceiling exceeded");
assert.equal((now.match(/new\s+SegStore\s*\(/gu) || []).length, 0,
  "duplicate eager legacy store revived");

const result = execFileSync(process.execPath, [proofV2], {
  encoding: "utf8",
  timeout: 90_000,
  maxBuffer: 2 * 1024 * 1024,
  env: { ...process.env, NODE_OPTIONS: "" },
});
for (const mark of [
  "VOID_PUBLIC_CHECKPOINT_SEAL_FIRST_STARTUP_CURRENT_V2_PROOF_GREEN",
  "inherited_checkpoint_startup_bytes_identical=true",
  "failed_inherited_node_admission_schedules_no_repair=true",
  "normal_repair_runs_only_after_node_constructor=true",
  "explicit_skip_behavior_preserved=true",
]) {
  assert.ok(result.split("\n").includes(mark),
    "reviewed V2 behavioral replay missing: " + mark);
}
console.log("VOID_PUBLIC_CHECKPOINT_LATEST_PARENT_PRECOMPOSITION_V3_GREEN");
console.log("exact_original_and_latest_parent_commits_verified=true");
console.log("latest_source_409_privacy_delta_only=true");
console.log("checkpoint_parent_and_frozen_main_region_bytes_identical=true");
console.log("reviewed_original_v2_behavior_replayed=true");
console.log("frozen_v1_and_v2_proof_blobs_unchanged=true");
console.log("virtual_merge_execution_performed=false");
console.log("child_branch_source_still_old_generation=true");
console.log("installed_checkpoint_or_presale_acceptance=false");
console.log("wallet_signer_credentials_funds_access=false");
