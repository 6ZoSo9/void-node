import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const target = "src/index.js";
const rawEmptyCatch = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
const markerPrefix = "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0041_0060";
const priorMarkerPrefix1 = "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0001_0020";
const priorMarkerPrefix2 = "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0021_0040";
const expectedClosed = 20;

function read(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

function countRaw(file: string): number {
  return Array.from(read(file).matchAll(rawEmptyCatch)).length;
}

function countMarkers(prefix: string): number {
  return Array.from(read(target).matchAll(new RegExp(prefix + "[A-Z0-9_]*_VISIBLE", "g"))).length;
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

const remainingInTarget = countRaw(target);
const markers = countMarkers(markerPrefix);
const priorMarkers1 = countMarkers(priorMarkerPrefix1);
const priorMarkers2 = countMarkers(priorMarkerPrefix2);

if (remainingInTarget !== 59) {
  throw new Error(`expected src/index.js raw empty catches to drop to 59, got ${remainingInTarget}`);
}

if (markers !== expectedClosed) {
  throw new Error(`expected ${expectedClosed} ${markerPrefix} visibility markers, got ${markers}`);
}

if (priorMarkers1 !== 20) {
  throw new Error(`expected prior window 0001-0020 marker count to remain 20, got ${priorMarkers1}`);
}

if (priorMarkers2 !== 20) {
  throw new Error(`expected prior window 0021-0040 marker count to remain 20, got ${priorMarkers2}`);
}

const { total, buckets } = refinedTrackedRawCounts();

if (total !== 59) {
  throw new Error(`expected refined tracked raw empty catches to drop to 59, got ${total}`);
}

if ((buckets.src_diag || 0) !== 0) {
  throw new Error(`expected src_diag bucket to remain 0, got ${buckets.src_diag || 0}`);
}

if ((buckets.src_index_js || 0) !== 59) {
  throw new Error(`expected src_index_js bucket to drop to 59, got ${buckets.src_index_js || 0}`);
}

console.log("VOID_SRC_INDEX_JS_RAW_EMPTY_CATCHES_WINDOW_0041_0060_V1_GREEN", JSON.stringify({
  target,
  src_index_js_window_0041_0060_raw_empty_catches_closed: expectedClosed,
  src_index_js_remaining_raw_empty_catches: remainingInTarget,
  repo_wide_refined_tracked_raw_empty_catches: total,
  buckets,
  markerPrefix,
  markerCount: markers,
  priorMarkerPrefix1,
  priorMarkerCount1: priorMarkers1,
  priorMarkerPrefix2,
  priorMarkerCount2: priorMarkers2,
}));
