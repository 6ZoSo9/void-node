import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const marker = "VOID_REFINED_TRACKED_RAW_EMPTY_CATCHES_TERMINAL_FINAL_SEAL_V1";
const sealPath = "docs/security/refined-tracked-raw-empty-catches-terminal-final-seal-v1.json";
const mdPath = "docs/security/refined-tracked-raw-empty-catches-terminal-final-seal-v1.md";
const finalMain = "0ce76f61bbb0d11139d548fc9f33154068eae4b8";
const finalTag = "ckpt-src-index-js-raw-empty-catches-window-0101-0119-v1-post-merge-exact-green-20260711-074736";
const finalReceipt = "/home/zoso/void-precision-smoke/three-box-pr582-exact-main-p2p-strict-runtime-clean-watch-20260711-075620.txt";
const finalReceiptSha256 = "11ee95ed8f5c39eb12c1875e5484024eceb02b02ded5e0a4d131c954f055e92b";

const rawEmptyCatch = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;

function read(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
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

function markerCount(file: string, prefix: string): number {
  return Array.from(read(file).matchAll(new RegExp(prefix + "[A-Z0-9_]*_VISIBLE", "g"))).length;
}

function assertAncestor(commit: string): void {
  execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], { stdio: "pipe" });
}

const seal = JSON.parse(read(sealPath));
const md = read(mdPath);

if (seal.marker !== marker) throw new Error(`wrong seal marker: ${seal.marker}`);
if (!md.includes(marker)) throw new Error("markdown seal missing marker");

if (seal.final_raw_empty_catch_main !== finalMain) throw new Error("wrong final_raw_empty_catch_main");
if (seal.final_raw_empty_catch_tag !== finalTag) throw new Error("wrong final_raw_empty_catch_tag");
if (seal.final_three_box_receipt !== finalReceipt) throw new Error("wrong final_three_box_receipt");
if (seal.final_three_box_receipt_sha256 !== finalReceiptSha256) throw new Error("wrong final_three_box_receipt_sha256");

assertAncestor(finalMain);

const { total, buckets } = refinedTrackedRawCounts();

if (total !== 0) {
  throw new Error(`expected repo-wide refined tracked raw empty catches to be 0, got ${total}`);
}

if (Object.keys(buckets).length !== 0) {
  throw new Error(`expected no refined tracked raw empty catch buckets, got ${JSON.stringify(buckets)}`);
}

if (seal.repo_wide_refined_tracked_raw_empty_catches !== 0) {
  throw new Error("seal repo_wide_refined_tracked_raw_empty_catches must be 0");
}

if (JSON.stringify(seal.buckets) !== "{}") {
  throw new Error(`seal buckets must be {}, got ${JSON.stringify(seal.buckets)}`);
}

const indexMarkers: Record<string, number> = {
  "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0001_0020": 20,
  "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0021_0040": 20,
  "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0041_0060": 20,
  "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0061_0080": 20,
  "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0081_0100": 20,
  "VOID_SRC_INDEX_JS_RAW_EMPTY_CATCH_WINDOW_0101_0119": 19,
};

for (const [prefix, expected] of Object.entries(indexMarkers)) {
  const got = markerCount("src/index.js", prefix);
  if (got !== expected) throw new Error(`expected ${expected} markers for ${prefix}, got ${got}`);
}

console.log(marker + "_GREEN", JSON.stringify({
  finalRawEmptyCatchMain: finalMain,
  finalRawEmptyCatchTag: finalTag,
  finalThreeBoxReceipt: finalReceipt,
  finalThreeBoxReceiptSha256: finalReceiptSha256,
  repoWideRefinedTrackedRawEmptyCatches: total,
  buckets,
  indexMarkers,
}));
