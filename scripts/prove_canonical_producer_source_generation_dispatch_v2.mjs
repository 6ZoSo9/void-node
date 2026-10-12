#!/usr/bin/env node
// Source-only exact-generation dispatcher. Does not start the VOID node.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_CANONICAL_PRODUCER_SOURCE_GENERATION_DISPATCH_V2";
const OLD_SOURCE = "1fde828c97175560f98ab070af33eefc595f8002";
const NEW_SOURCE = "8198912a70c8db0c81dad5d341cb4a779906c851";
const OLD_GUARD_BLOB = "656e397ee6f54d7902c19c8c9c5d826f9bcbdf5c";
const OLD_PROOF_BLOB = "26c5b586e8a97759288a18909ba06312055c54be";
const oldGuardPath = "runtime/canonical-producer-self-http-guard-v1.cjs";
const newGuardPath = "runtime/canonical-producer-self-http-guard-v2.cjs";
const oldProofPath = "scripts/prove_canonical_producer_legacy_self_http_observers_v1.mjs";
const newProofPath =
  "scripts/prove_canonical_producer_legacy_self_http_observers_current_v2.mjs";

function gitBlob(buffer) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + buffer.length + "\0"))
    .update(buffer)
    .digest("hex");
}
function file(name) {
  return fs.readFileSync(name);
}
function runProof(target) {
  const executed = spawnSync(process.execPath, [target], {
    encoding: "utf8",
    timeout: 90_000,
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: "" },
  });
  if (executed.status !== 0 || executed.error) {
    throw new Error("generation proof failed: " + target +
      " status=" + String(executed.status) +
      " stderr=" + String(executed.stderr || executed.error || "").slice(0, 1500));
  }
  assert.match(executed.stdout, /_GREEN/, "missing positive proof marker");
  process.stdout.write(executed.stdout);
}

const indexBlob = gitBlob(file("src/index.ts"));
const oldGuardBuffer = file(oldGuardPath);
const oldProofBuffer = file(oldProofPath);
assert.equal(gitBlob(oldGuardBuffer), OLD_GUARD_BLOB,
  "frozen historical preload unexpectedly changed");
assert.equal(gitBlob(oldProofBuffer), OLD_PROOF_BLOB,
  "frozen historical behavioral proof unexpectedly changed");

const original = oldGuardBuffer.toString("utf8");
const current = file(newGuardPath).toString("utf8");
const expectedCopy = original
  .replace(
    'const MARKER = "VOID_CANONICAL_PRODUCER_SELF_HTTP_GUARD_V1";',
    'const MARKER = "VOID_CANONICAL_PRODUCER_SELF_HTTP_GUARD_V2";',
  )
  .replaceAll("LEGACY_SOURCE_BLOB_SHA", "CURRENT_SOURCE_BLOB_SHA")
  .replaceAll(OLD_SOURCE, NEW_SOURCE)
  .replace(
    '!line.includes("canonical-producer-self-http-guard-v1.cjs")',
    '!line.includes("canonical-producer-self-http-guard-v2.cjs")',
  );
assert.notEqual(expectedCopy, original, "missing versioned guard transform");
assert.equal(current, expectedCopy,
  "current generation must preserve full reviewed guard behavior");

const runner = file("ops/run-void-node-live-v1.sh").toString("utf8");
for (const expected of [
  "VOID_CANONICAL_SELF_HTTP_GUARD",
  "VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS",
  'producer_index_blob="$(git hash-object -- src/index.ts)"',
  'tracked_index_blob="$(git rev-parse --verify "${source_commit_before}:src/index.ts")"',
  'test "$producer_index_blob" = "$tracked_index_blob"',
  '  case "$producer_index_blob" in',
  OLD_SOURCE + ")",
  NEW_SOURCE + ")",
  '--require "$ROOT/' + oldGuardPath + '"',
  '--require "$ROOT/' + newGuardPath + '"',
  "VOID_CANONICAL_PRODUCER_SOURCE_GENERATION_HOLD",
]) {
  assert.ok(runner.includes(expected), "missing exact runner source gate: " + expected);
}

// Exercise only the launcher's source switch in an inert shell fixture.
// It cannot call the node launcher, load keys, or touch a service.
const startOfSelector = runner.indexOf('  case "$producer_index_blob" in');
const endOfSelector = runner.indexOf("\n  esac", startOfSelector);
assert.ok(startOfSelector >= 0 && endOfSelector > startOfSelector,
  "canonical selector source not found");
const selector = runner.slice(startOfSelector,
  endOfSelector + "\n  esac".length);
assert.equal(runner.indexOf('  case "$producer_index_blob" in',
  startOfSelector + 1), -1, "duplicate selector");

function inertSelectSource(sourceSha) {
  const result = spawnSync("bash", [
    "-c",
    'set -euo pipefail\nROOT=/synthetic\nproducer_index_blob="$1"\n' +
      selector + '\nprintf "%s\n" "${canonical_self_http_preload[1]}"\n',
    "--",
    sourceSha,
  ], {
    encoding: "utf8",
    timeout: 2_000,
    maxBuffer: 64 * 1024,
    env: { PATH: "/usr/bin:/bin" },
  });
  assert.equal(result.error, undefined, "synthetic selector launch failed");
  return result;
}
for (const [sha, expectedGuard] of [
  [OLD_SOURCE, oldGuardPath],
  [NEW_SOURCE, newGuardPath],
]) {
  const selected = inertSelectSource(sha);
  assert.equal(selected.status, 0, selected.stderr);
  assert.equal(selected.stdout.trim(), "/synthetic/" + expectedGuard);
}
const unknown = inertSelectSource("0".repeat(40));
assert.notEqual(unknown.status, 0, "unreviewed source was accepted");
assert.match(unknown.stderr,
  /VOID_CANONICAL_PRODUCER_SOURCE_GENERATION_HOLD/);

if (indexBlob === OLD_SOURCE) {
  runProof(oldProofPath);
  process.stdout.write(MARKER + "_GREEN " + JSON.stringify({
    source_blob: indexBlob,
    selected_guard: "frozen_v1",
    historical_v1_unchanged: true,
    current_v2_behavior_parity: true,
    live_service_started: false,
    launch_authority: false,
  }) + "\n");
} else if (indexBlob === NEW_SOURCE) {
  const legacyNegative = spawnSync(process.execPath, [
    "-e",
    'global.fetch=async()=>new Response("offline");require(process.env.MODULE_PATH);',
  ], {
    encoding: "utf8",
    timeout: 7000,
    maxBuffer: 200_000,
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_OPTIONS: "",
      MODULE_PATH: path.resolve(oldGuardPath),
      VOID_CANONICAL_PRODUCER_ROLE: "1",
      VOID_CANONICAL_SELF_HTTP_GUARD: "1",
      VOID_CANONICAL_DISABLE_LEGACY_SELF_HTTP_OBSERVERS: "1",
      HTTP_PORT: "4100",
    },
  });
  assert.notEqual(legacyNegative.status, 0,
    "frozen v1 guard unexpectedly admitted current source");
  assert.match(String(legacyNegative.stderr),
    /VOID_CANONICAL_PRODUCER_SELF_HTTP_GUARD_V1_LEGACY_SOURCE_CONTRACT_FAIL source_blob_mismatch/,
    "frozen v1 rejection reason changed");
  runProof(newProofPath);
  process.stdout.write(MARKER + "_GREEN " + JSON.stringify({
    source_blob: indexBlob,
    selected_guard: "current_v2",
    historical_v1_unchanged: true,
    old_generation_refusal: true,
    current_v2_behavior_parity: true,
    live_service_started: false,
    launch_authority: false,
  }) + "\n");
} else {
  throw new Error(MARKER + "_HOLD unreviewed source blob=" + indexBlob);
}
