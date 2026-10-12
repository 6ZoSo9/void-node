import fs from "node:fs";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };

const baselinePath = "docs/security/scripts-empty-catch-visibility-pack-v1-baseline.json";
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as {
  marker: string;
  targets: Record<string, { exact_empty_catch_count_before: number; catch_context_count: number }>;
  total_exact_empty_catch_count_before: number;
  expected_repo_empty_catch_count_before: number;
  expected_repo_empty_catch_count_after: number | null;
  observed_guard_inventory_drop: number | null;
};

const marker = baseline.marker;
const targets = Object.keys(baseline.targets).sort();

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function exactEmptyCatchCount(source: string): number {
  return (source.match(/catch\s*(\([^)]*\))?\s*\{\s*\}/g) ?? []).length;
}

function catchContextCount(source: string): number {
  return (source.match(/\bcatch\b/g) ?? []).length;
}

const findings: Finding[] = [];
const perFile: Array<{ file: string; sha256: string; emptyCatchCount: number; catchContextCount: number; markerCount: number }> = [];

for (const file of targets) {
  const source = fs.readFileSync(file, "utf8");
  const expected = baseline.targets[file];
  const emptyCatchCount = exactEmptyCatchCount(source);
  const contexts = catchContextCount(source);
  const markerCount = (source.match(new RegExp(marker, "g")) ?? []).length;
  perFile.push({ file, sha256: sha256(source), emptyCatchCount, catchContextCount: contexts, markerCount });

  findings.push({
    id: `target-empty-catches-closed-${file}`,
    status: emptyCatchCount === 0 ? "PASS" : "FAIL",
    detail: `${file} exact empty catch count=${emptyCatchCount}, expected=0`,
  });
  findings.push({
    id: `target-catch-context-baseline-preserved-${file}`,
    status: contexts === expected.catch_context_count ? "PASS" : "FAIL",
    detail: `${file} catch context count=${contexts}, expected=${expected.catch_context_count}`,
  });
  findings.push({
    id: `target-marker-present-${file}`,
    status: markerCount >= 1 ? "PASS" : "FAIL",
    detail: `${file} marker count=${markerCount}, expected>=1`,
  });
}

const totalEmptyCatchCount = perFile.reduce((sum, row) => sum + row.emptyCatchCount, 0);
findings.unshift({
  id: "batch-target-empty-catch-total-zero",
  status: totalEmptyCatchCount === 0 ? "PASS" : "FAIL",
  detail: `target exact empty catch total=${totalEmptyCatchCount}, expected=0`,
});

findings.unshift({
  id: "batch-baseline-total-recorded",
  status: baseline.total_exact_empty_catch_count_before > 0 ? "PASS" : "FAIL",
  detail: `baseline exact empty catches closed=${baseline.total_exact_empty_catch_count_before}, expected>0`,
});

const failures = findings.filter((finding) => finding.status === "FAIL");

console.log(`VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_TARGET_COUNT=${targets.length}`);
console.log(`VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_BASELINE_EMPTY_CATCH_COUNT=${baseline.total_exact_empty_catch_count_before}`);
console.log(`VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_TARGET_EMPTY_CATCH_COUNT=${totalEmptyCatchCount}`);
if (baseline.expected_repo_empty_catch_count_after !== null) {
  console.log(`VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_EXPECTED_REPO_EMPTY_CATCH_AFTER=${baseline.expected_repo_empty_catch_count_after}`);
}
for (const row of perFile) {
  console.log(`VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_FILE=${row.file} SHA256=${row.sha256} EMPTY_CATCH_COUNT=${row.emptyCatchCount} CATCH_CONTEXT_COUNT=${row.catchContextCount} MARKER_COUNT=${row.markerCount}`);
}
for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_FAIL");
  process.exit(1);
}

console.log("VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_GREEN");
