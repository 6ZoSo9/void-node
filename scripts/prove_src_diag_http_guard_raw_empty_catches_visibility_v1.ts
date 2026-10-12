import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const targets = [
  "src/diag/patch_finalhandler_guard_v2.js",
  "src/diag/patch_finalhandler_hardstub_v4.js",
  "src/diag/patch_http_headers_sent_guard_v1.cjs",
  "src/diag/http_v6_loopback_proxy_4100_v1.cjs",
  "src/diag/patch_express_handle_guard_v2.js",
  "src/diag/patch_express_handle_guard_v3.cjs",
  "src/diag/patch_ignore_sigusr2_v1.cjs",
  "src/diag/patch_http_headers_sent_rescue_v2.cjs",
  "src/diag/patch_listen_trace_v1.js",
];

const rawEmptyCatch = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
const markerPrefix = "VOID_SRC_DIAG_HTTP_GUARD_PACK4";
const expectedClosed = 19;

function read(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

function countRaw(file: string): number {
  return Array.from(read(file).matchAll(rawEmptyCatch)).length;
}

function markerCount(file: string): number {
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
    else if (file === "src/index.ts") bucket = "src_index_ts";
    else if (file === "src/index.js") bucket = "src_index_js";
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
  markers += markerCount(target);
}

if (targetRaw !== 0) {
  throw new Error(`expected zero raw empty catches in pack4 targets, got ${targetRaw}`);
}

if (markers !== expectedClosed) {
  throw new Error(`expected ${expectedClosed} ${markerPrefix} visibility markers, got ${markers}`);
}

const { total, buckets } = refinedTrackedRawCounts();

if (total > 159) {
  throw new Error(`expected refined tracked raw empty catches to stay <= 159 after pack4 closure, got ${total}`);
}

if ((buckets.src_diag || 0) > 40) {
  throw new Error(`expected src_diag bucket to stay <= 40 after pack4 closure, got ${buckets.src_diag || 0}`);
}

if ((buckets.src_index_js || 0) > 119) {
  throw new Error(`expected src_index_js bucket to stay <= 119 after src_diag closure, got ${buckets.src_index_js || 0}`);
}

console.log("VOID_SRC_DIAG_HTTP_GUARD_RAW_EMPTY_CATCHES_VISIBILITY_V1_GREEN", JSON.stringify({
  targets,
  src_diag_pack4_raw_empty_catches_closed: expectedClosed,
  raw_empty_catches_in_pack4_targets: targetRaw,
  repo_wide_refined_tracked_raw_empty_catches: total,
  buckets,
  markerPrefix,
  markerCount: markers,
}));
