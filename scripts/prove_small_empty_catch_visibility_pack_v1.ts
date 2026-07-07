import fs from "node:fs";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };

const targets = [
  "src/dev/dev_safe_bundle.ts",
  "src/http/participant_wallet_native_v1.ts",
  "src/http/routes/index_kidx_extras.ts",
  "src/http/tx_routes.ts",
  "src/chain/auto_repair.ts",
  "src/chain/receipts.ts",
  "src/receipts.ts",
];

const marker = "VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function exactEmptyCatchCount(source: string): number {
  return (source.match(/catch\s*(\([^)]*\))?\s*\{\s*\}/g) ?? []).length;
}

const findings: Finding[] = [];
const perFile: Array<{ file: string; sha256: string; emptyCatchCount: number; markerCount: number }> = [];

for (const file of targets) {
  const source = fs.readFileSync(file, "utf8");
  const emptyCatchCount = exactEmptyCatchCount(source);
  const markerCount = (source.match(new RegExp(marker, "g")) ?? []).length;
  perFile.push({ file, sha256: sha256(source), emptyCatchCount, markerCount });

  findings.push({
    id: `target-empty-catches-closed-${file}`,
    status: emptyCatchCount === 0 ? "PASS" : "FAIL",
    detail: `${file} empty catch count=${emptyCatchCount}, expected=0`,
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
  detail: `target empty catch total=${totalEmptyCatchCount}, expected=0`,
});

const failures = findings.filter((finding) => finding.status === "FAIL");

console.log(`VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_TARGET_COUNT=${targets.length}`);
console.log(`VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_TARGET_EMPTY_CATCH_COUNT=${totalEmptyCatchCount}`);
for (const row of perFile) {
  console.log(`VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FILE=${row.file} SHA256=${row.sha256} EMPTY_CATCH_COUNT=${row.emptyCatchCount} MARKER_COUNT=${row.markerCount}`);
}
for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAIL");
  process.exit(1);
}

console.log("VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_GREEN");
