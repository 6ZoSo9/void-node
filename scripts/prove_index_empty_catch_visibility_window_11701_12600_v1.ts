import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const ID = "VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_11701_12600_V1";
const FILE = "src/index.ts";
const START = 11701;
const END = 12600;
const EXPECTED_SHA256 = "c857ace13ff0c5cb173e2e05976d4faf50b103c69554ae1b6e63d015189b745f";
const EXPECTED_WINDOW_EMPTY_CATCH_COUNT = 0;
const EXPECTED_TOTAL_EMPTY_CATCH_COUNT = 1013;
const EXPECTED_MEASURED_CATCH_CONTEXT_COUNT = 2563;
const MARKER = "VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_11701_12600_V1_VISIBLE";

const source = readFileSync(FILE, "utf8");

function lineAt(index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function countExactEmptyCatches(lo?: number, hi?: number): number {
  const exactEmptyCatchRegex = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
  let count = 0;
  for (const match of source.matchAll(exactEmptyCatchRegex)) {
    const index = match.index;
    if (index === undefined) continue;
    const line = lineAt(index);
    if (lo === undefined || hi === undefined || (line >= lo && line <= hi)) {
      count += 1;
    }
  }
  return count;
}

function markerCount(): number {
  return source.split(MARKER).length - 1;
}

function measuredCatchContextCount(): number {
  return source.match(/\bcatch\b/g)?.length ?? 0;
}

function pass(name: string, detail: string): void {
  console.log(`[PASS] ${name}: ${detail}`);
}

function fail(name: string, detail: string): never {
  console.error(`[FAIL] ${name}: ${detail}`);
  process.exit(1);
}

const sha256 = createHash("sha256").update(source).digest("hex");
const windowCount = countExactEmptyCatches(START, END);
const totalCount = countExactEmptyCatches();
const measuredCount = measuredCatchContextCount();
const markers = markerCount();

console.log(`${ID}_SHA256=${sha256}`);
console.log(`${ID}_WINDOW_EMPTY_CATCH_COUNT=${windowCount}`);
console.log(`${ID}_INDEX_TOTAL_EMPTY_CATCH_COUNT=${totalCount}`);
console.log(`${ID}_INDEX_MEASURED_CATCH_CONTEXT_COUNT=${measuredCount}`);
console.log(`${ID}_MARKER_COUNT=${markers}`);

if (sha256 !== EXPECTED_SHA256) fail("index-window-sha256-stable", `sha256=${sha256}, expected=${EXPECTED_SHA256}`);
pass("index-window-sha256-stable", `sha256=${sha256}`);

if (windowCount !== EXPECTED_WINDOW_EMPTY_CATCH_COUNT) fail("index-window-empty-catches-closed", `line-window=${START}-${END} exact empty catch count=${windowCount}, expected=${EXPECTED_WINDOW_EMPTY_CATCH_COUNT}`);
pass("index-window-empty-catches-closed", `line-window=${START}-${END} exact empty catch count=${windowCount}, expected=${EXPECTED_WINDOW_EMPTY_CATCH_COUNT}`);

if (totalCount !== EXPECTED_TOTAL_EMPTY_CATCH_COUNT) fail("index-total-empty-catch-count-reduced", `src/index.ts line-based total exact empty catch count=${totalCount}, expected=${EXPECTED_TOTAL_EMPTY_CATCH_COUNT}`);
pass("index-total-empty-catch-count-reduced", `src/index.ts line-based total exact empty catch count=${totalCount}, expected=${EXPECTED_TOTAL_EMPTY_CATCH_COUNT}`);

if (measuredCount !== EXPECTED_MEASURED_CATCH_CONTEXT_COUNT) fail("index-measured-catch-context-preserved", `src/index.ts measured catch context count=${measuredCount}, expected=${EXPECTED_MEASURED_CATCH_CONTEXT_COUNT}`);
pass("index-measured-catch-context-preserved", `src/index.ts measured catch context count=${measuredCount}, expected=${EXPECTED_MEASURED_CATCH_CONTEXT_COUNT}`);

if (markers < 1) fail("index-window-marker-present", `marker count=${markers}, expected>=1`);
pass("index-window-marker-present", `marker count=${markers}, expected>=1`);

console.log(`${ID}_GREEN`);
