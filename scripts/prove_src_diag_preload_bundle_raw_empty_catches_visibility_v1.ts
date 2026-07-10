import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const target = "src/diag/preload_gate_bundle_afterapp_v3.cjs";
const rawEmptyCatch = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
const markerPrefix = "VOID_SRC_DIAG_PRELOAD_BUNDLE_PACK6";
const expectedClosed = 17;

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

const targetRaw = countRaw(target);
const markers = countMarkers(target);

if (targetRaw !== 0) {
  throw new Error(`expected zero raw empty catches in preload bundle target, got ${targetRaw}`);
}

if (markers !== expectedClosed) {
  throw new Error(`expected ${expectedClosed} ${markerPrefix} visibility markers, got ${markers}`);
}

const { total, buckets } = refinedTrackedRawCounts();

if (total !== 119) {
  throw new Error(`expected refined tracked raw empty catches to drop to 119, got ${total}`);
}

if ((buckets.src_diag || 0) !== 0) {
  throw new Error(`expected src_diag bucket to drop to 0, got ${buckets.src_diag || 0}`);
}

if ((buckets.src_index_js || 0) !== 119) {
  throw new Error(`expected src_index_js bucket to remain 119, got ${buckets.src_index_js || 0}`);
}

console.log("VOID_SRC_DIAG_PRELOAD_BUNDLE_RAW_EMPTY_CATCHES_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  src_diag_pack6_raw_empty_catches_closed: expectedClosed,
  raw_empty_catches_in_pack6_target: targetRaw,
  repo_wide_refined_tracked_raw_empty_catches: total,
  buckets,
  markerPrefix,
  markerCount: markers,
}));
