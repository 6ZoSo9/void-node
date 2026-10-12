import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const target = "src/index.js";
const rawEmptyCatch = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
const markerPrefix = "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0101_0119";
const priorMarkerPrefixes = [
  "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0001_0020",
  "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0021_0040",
  "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0041_0060",
  "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0061_0080",
  "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0081_0100",
];
const expectedClosed = 19;

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
const priorMarkerCounts = priorMarkerPrefixes.map((prefix) => [prefix, countMarkers(prefix)] as const);

if (remainingInTarget !== 0) {
  throw new Error(`expected src/index.js raw empty catches to drop to 0, got ${remainingInTarget}`);
}

if (markers !== expectedClosed) {
  throw new Error(`expected ${expectedClosed} ${markerPrefix} visibility markers, got ${markers}`);
}

for (const [prefix, count] of priorMarkerCounts) {
  if (count !== 20) {
    throw new Error(`expected prior marker count for ${prefix} to remain 20, got ${count}`);
  }
}

const { total, buckets } = refinedTrackedRawCounts();

if (total !== 0) {
  throw new Error(`expected refined tracked raw empty catches to drop to 0, got ${total}`);
}

if (Object.keys(buckets).length !== 0) {
  throw new Error(`expected no refined tracked raw empty catch buckets, got ${JSON.stringify(buckets)}`);
}

console.log("VOID_SRC_INDEX_JS_RAW_EMPTY_CATCHES_WINDOW_0101_0119_V1_GREEN", JSON.stringify({
  target,
  src_index_js_window_0101_0119_raw_empty_catches_closed: expectedClosed,
  src_index_js_remaining_raw_empty_catches: remainingInTarget,
  repo_wide_refined_tracked_raw_empty_catches: total,
  buckets,
  markerPrefix,
  markerCount: markers,
  priorMarkerCounts: Object.fromEntries(priorMarkerCounts),
}));
