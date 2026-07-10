import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const targets = [
  "src/diag/number2_headtxt_fallback_v1.cjs",
  "src/diag/patch_latest_number2_shim_v1.cjs",
  "src/diag/patch_latest_number2_shim_v2.cjs",
  "src/diag/selfcall_probe_v1.cjs",
  "src/diag/patch_latest_number2_fix_v2.cjs",
  "src/diag/seals_head_truthfix_v1.cjs",
  "src/diag/seals_head_truthfix_v1.js",
  "src/diag/txroot3_liveprom_intercept_v1.cjs",
  "src/diag/datanet_mvp_v1.cjs",
  "src/diag/patch_eventloop_heartbeat_v1.cjs",
  "src/diag/ready_bridge_v3.cjs",
];

const rawEmptyCatch = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
const markerPrefix = "VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_PACK5";
const expectedClosed = 23;

function read(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

function countRaw(file: string): number {
  return Array.from(read(file).matchAll(rawEmptyCatch)).length;
}

function countMarkers(file: string): number {
  return Array.from(read(file).matchAll(new RegExp(markerPrefix + "[A-Z0-9_]*_VISIBLE", "g"))).length;
}

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { encoding: "utf8" }).trim().split(/\n/).filter(Boolean);
}

function refinedTrackedRawCounts(): { total: number; buckets: Record<string, number> } {
  const buckets: Record<string, number> = {};
  let total = 0;

  for (const file of trackedFiles()) {
    if (!/\.(js|cjs|mjs|ts|tsx|jsx)$/.test(file)) continue;
    if (!fs.existsSync(file)) continue;

    const n = Array.from(read(file).matchAll(rawEmptyCatch)).length;
    if (!n) continue;

    let bucket = "other";
    if (file.startsWith("src/diag/")) bucket = "src_diag";
    else if (file === "src/index.js") bucket = "src_index_js";
    else if (file === "src/index.ts") bucket = "src_index_ts";
    else if (file.startsWith("scripts/")) bucket = "scripts";
    else if (file.startsWith("ops/")) bucket = "ops";
    else if (file.startsWith("src/chain/")) bucket = "src_chain";
    else if (file.startsWith("src/")) bucket = "src_other";

    buckets[bucket] = (buckets[bucket] || 0) + n;
    total += n;
  }

  return { total, buckets };
}

let targetRaw = 0;
let markers = 0;

for (const target of targets) {
  targetRaw += countRaw(target);
  markers += countMarkers(target);
}

if (targetRaw !== 0) {
  throw new Error(`expected zero raw empty catches in pack5 targets, got ${targetRaw}`);
}

if (markers !== expectedClosed) {
  throw new Error(`expected ${expectedClosed} ${markerPrefix} visibility markers, got ${markers}`);
}

const preloadRemaining = countRaw("src/diag/preload_gate_bundle_afterapp_v3.cjs");
if (preloadRemaining > 17) {
  throw new Error(`expected preload bundle to stay <= 17 raw empty catches after pack5 closure, got ${preloadRemaining}`);
}

const { total, buckets } = refinedTrackedRawCounts();

if (total > 136) {
  throw new Error(`expected refined tracked raw empty catches to stay <= 136 after pack5 closure, got ${total}`);
}

if ((buckets.src_diag || 0) > 17) {
  throw new Error(`expected src_diag bucket to stay <= 17 after pack5 closure, got ${buckets.src_diag || 0}`);
}

if ((buckets.src_index_js || 0) > 119) {
  throw new Error(`expected src_index_js bucket to stay <= 119 after src_diag closure, got ${buckets.src_index_js || 0}`);
}

console.log("VOID_SRC_DIAG_HEAD_SHIM_RESIDUAL_RAW_EMPTY_CATCHES_VISIBILITY_V1_GREEN", JSON.stringify({
  targets,
  src_diag_pack5_raw_empty_catches_closed: expectedClosed,
  raw_empty_catches_in_pack5_targets: targetRaw,
  preload_bundle_remaining_raw_empty_catches: preloadRemaining,
  repo_wide_refined_tracked_raw_empty_catches: total,
  buckets,
  markerPrefix,
  markerCount: markers,
}));
