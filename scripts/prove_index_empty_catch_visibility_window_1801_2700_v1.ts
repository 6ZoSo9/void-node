import fs from "node:fs";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };

const baseline = JSON.parse(fs.readFileSync("docs/security/index-empty-catch-visibility-window-1801-2700-v1-baseline.json", "utf8")) as {
  marker: string;
  target: string;
  line_window_min: number;
  line_window_max: number;
  line_based_total_exact_empty_catch_count_after: number;
  index_measured_catch_context_count: number;
};

const linePattern = /catch\s*(\([^)]*\))?\s*\{\s*\}/g;

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function lineBasedExactCount(source: string, minLine?: number, maxLine?: number): number {
  return source.split(/\n/).reduce((sum, line, idx) => {
    const lineNo = idx + 1;
    if (minLine !== undefined && lineNo < minLine) return sum;
    if (maxLine !== undefined && lineNo > maxLine) return sum;
    return sum + ((line.match(linePattern) ?? []).length);
  }, 0);
}

function catchContextCount(source: string): number {
  return (source.match(/\bcatch\b/g) ?? []).length;
}

const source = fs.readFileSync(baseline.target, "utf8");
const totalExact = lineBasedExactCount(source);
const windowExact = lineBasedExactCount(source, baseline.line_window_min, baseline.line_window_max);
const contexts = catchContextCount(source);
const markerCount = (source.match(new RegExp(baseline.marker, "g")) ?? []).length;
const hash = sha256(source);

const findings: Finding[] = [
  {
    id: "index-window-empty-catches-closed",
    status: windowExact === 0 ? "PASS" : "FAIL",
    detail: `line-window=${baseline.line_window_min}-${baseline.line_window_max} exact empty catch count=${windowExact}, expected=0`,
  },
  {
    id: "index-total-empty-catch-count-reduced",
    status: totalExact === baseline.line_based_total_exact_empty_catch_count_after ? "PASS" : "FAIL",
    detail: `src/index.ts line-based total exact empty catch count=${totalExact}, expected=${baseline.line_based_total_exact_empty_catch_count_after}`,
  },
  {
    id: "index-measured-catch-context-preserved",
    status: contexts === baseline.index_measured_catch_context_count ? "PASS" : "FAIL",
    detail: `src/index.ts measured catch context count=${contexts}, expected=${baseline.index_measured_catch_context_count}`,
  },
  {
    id: "index-window-marker-present",
    status: markerCount >= 1 ? "PASS" : "FAIL",
    detail: `marker count=${markerCount}, expected>=1`,
  },
];

console.log(`VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_1801_2700_V1_SHA256=${hash}`);
console.log(`VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_1801_2700_V1_WINDOW_EMPTY_CATCH_COUNT=${windowExact}`);
console.log(`VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_1801_2700_V1_INDEX_TOTAL_EMPTY_CATCH_COUNT=${totalExact}`);
console.log(`VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_1801_2700_V1_INDEX_MEASURED_CATCH_CONTEXT_COUNT=${contexts}`);
console.log(`VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_1801_2700_V1_MARKER_COUNT=${markerCount}`);
for (const finding of findings) console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);

if (findings.some((finding) => finding.status === "FAIL")) {
  console.error("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_1801_2700_V1_FAIL");
  process.exit(1);
}

console.log("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_1801_2700_V1_GREEN");
