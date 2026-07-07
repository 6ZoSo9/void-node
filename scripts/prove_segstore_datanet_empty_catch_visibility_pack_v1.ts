import fs from "node:fs";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };

const targets = [
  "src/chain/seg_store.ts",
  "src/http/datanet_routes.ts",
];

const marker = "VOID_SEGSTORE_DATANET_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function exactEmptyCatchCount(source: string): number {
  return (source.match(/catch\s*(\([^)]*\))?\s*\{\s*\}/g) ?? []).length;
}

function catchContextCount(source: string): number {
  return (source.match(/\bcatch\b/g) ?? []).length;
}

const expectedCatchContexts: Record<string, number> = {
  "src/chain/seg_store.ts": 28,
  "src/http/datanet_routes.ts": 20,
};

const findings: Finding[] = [];
const perFile: Array<{ file: string; sha256: string; emptyCatchCount: number; catchContextCount: number; markerCount: number }> = [];

for (const file of targets) {
  const source = fs.readFileSync(file, "utf8");
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
    status: contexts === expectedCatchContexts[file] ? "PASS" : "FAIL",
    detail: `${file} catch context count=${contexts}, expected=${expectedCatchContexts[file]}`,
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

const failures = findings.filter((finding) => finding.status === "FAIL");

console.log(`VOID_SEGSTORE_DATANET_EMPTY_CATCH_VISIBILITY_PACK_V1_TARGET_COUNT=${targets.length}`);
console.log(`VOID_SEGSTORE_DATANET_EMPTY_CATCH_VISIBILITY_PACK_V1_TARGET_EMPTY_CATCH_COUNT=${totalEmptyCatchCount}`);
for (const row of perFile) {
  console.log(`VOID_SEGSTORE_DATANET_EMPTY_CATCH_VISIBILITY_PACK_V1_FILE=${row.file} SHA256=${row.sha256} EMPTY_CATCH_COUNT=${row.emptyCatchCount} CATCH_CONTEXT_COUNT=${row.catchContextCount} MARKER_COUNT=${row.markerCount}`);
}
for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_SEGSTORE_DATANET_EMPTY_CATCH_VISIBILITY_PACK_V1_FAIL");
  process.exit(1);
}

console.log("VOID_SEGSTORE_DATANET_EMPTY_CATCH_VISIBILITY_PACK_V1_GREEN");
