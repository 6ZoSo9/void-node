import fs from "node:fs";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };

const file = "src/node_core.ts";
const source = fs.readFileSync(file, "utf8");
const lines = source.split(/\r?\n/);

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function immediateTryBlock(catchIndex: number): string {
  const sameLine = lines[catchIndex] ?? "";
  if (sameLine.includes("try") && sameLine.includes("catch")) return sameLine;
  for (let i = catchIndex - 1; i >= Math.max(0, catchIndex - 90); i--) {
    const line = lines[i]?.trim() ?? "";
    if (line === "try {" || line.endsWith("try {") || line.includes("try {")) {
      return lines.slice(i, catchIndex + 1).join("\n");
    }
  }
  return sameLine;
}

const literalCatchIndexes = lines
  .map((line, index) => ({ line, index }))
  .filter(({ line }) => line.includes("} catch " + "{}"))
  .map(({ index }) => index);

const importHeadNeedles = ["persistHeadAtomic", "heads.json", "head.txt", "loadBlock", "headNumber", "latestNumber"];
const importHeadSilentCatchIndexes = literalCatchIndexes.filter((index) => {
  const block = immediateTryBlock(index);
  return importHeadNeedles.some((needle) => block.includes(needle));
});

const marker = "VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_FAILURE_VISIBLE";
const helper = "function recordImportHeadAdvanceBestEffortFailure(";
const requiredScopes = [
  "persist-head-atomic",
  "persist-head-filesystem",
  "advance-contiguous-head-load-block",
  "advance-contiguous-head-memory",
];

const findings: Finding[] = [
  { id: "import-head-advance-helper-present", status: source.includes(helper) ? "PASS" : "FAIL", detail: source.includes(helper) ? "helper present" : "helper missing" },
  { id: "import-head-advance-marker-present", status: source.includes(marker) ? "PASS" : "FAIL", detail: source.includes(marker) ? "marker present" : "marker missing" },
  { id: "remaining-silent-catch-baseline-after-import-head-advance", status: literalCatchIndexes.length <= 3 ? "PASS" : "FAIL", detail: `literal silent catches=${literalCatchIndexes.length}, expected<=3` },
  { id: "import-head-advance-silent-catches-closed", status: importHeadSilentCatchIndexes.length === 0 ? "PASS" : "FAIL", detail: `import-head-advance silent catches=${importHeadSilentCatchIndexes.length}` },
  ...requiredScopes.map((scope): Finding => {
    const count = (source.match(new RegExp(scope, "g")) ?? []).length;
    return { id: `scope-visible-${scope}`, status: count >= 1 ? "PASS" : "FAIL", detail: `${scope} visible calls=${count}, expected>=1` };
  }),
];

const failures = findings.filter((finding) => finding.status === "FAIL");
console.log(`VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_NODE_CORE_SHA256=${sha256(source)}`);
console.log(`VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_REMAINING_SILENT_CATCH_COUNT=${literalCatchIndexes.length}`);
console.log(`VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_IMPORT_HEAD_SILENT_CATCH_COUNT=${importHeadSilentCatchIndexes.length}`);
for (const finding of findings) console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
if (failures.length) {
  console.error("VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_FAIL");
  process.exit(1);
}
console.log("VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_GREEN");
