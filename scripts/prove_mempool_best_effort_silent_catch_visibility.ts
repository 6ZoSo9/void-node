import fs from "node:fs";
import crypto from "node:crypto";

type Finding = {
  id: string;
  status: "PASS" | "FAIL";
  detail: string;
};

const file = "src/node_core.ts";
const source = fs.readFileSync(file, "utf8");
const lines = source.split(/\r?\n/);

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function blockAround(index: number, radius = 12): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(lines.length, index + radius + 1);
  return lines.slice(start, end).join("\n");
}

function immediateTryBlock(catchIndex: number): string {
  const sameLine = lines[catchIndex] ?? "";
  if (sameLine.includes("try") && sameLine.includes("catch")) return sameLine;

  for (let i = catchIndex - 1; i >= Math.max(0, catchIndex - 80); i--) {
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

const mempoolSilentCatchIndexes = literalCatchIndexes.filter((index) => {
  const block = immediateTryBlock(index);
  return block.includes("mempool");
});

const marker = "VOID_MEMPOOL_BEST_EFFORT_FAILURE_VISIBLE";
const helper = "function recordMempoolBestEffortFailure(";
const requiredScopes = [
  "accept-tx-mempool-push",
  "take-tx-batch-mempool-clear",
  "take-tx-batch-mempool-drain",
];

const findings: Finding[] = [
  {
    id: "mempool-helper-present",
    status: source.includes(helper) ? "PASS" : "FAIL",
    detail: source.includes(helper) ? "helper present" : "helper missing",
  },
  {
    id: "mempool-marker-present",
    status: source.includes(marker) ? "PASS" : "FAIL",
    detail: source.includes(marker) ? "marker present" : "marker missing",
  },
  {
    id: "remaining-silent-catch-baseline-after-mempool",
    status: literalCatchIndexes.length <= 11 ? "PASS" : "FAIL",
    detail: `literal silent catches=${literalCatchIndexes.length}, expected<=11`,
  },
  {
    id: "mempool-silent-catches-closed",
    status: mempoolSilentCatchIndexes.length === 0 ? "PASS" : "FAIL",
    detail: `mempool-adjacent silent catches=${mempoolSilentCatchIndexes.length}`,
  },
  ...requiredScopes.map((scope): Finding => {
    const count = (source.match(new RegExp(scope, "g")) ?? []).length;
    return {
      id: `scope-visible-${scope}`,
      status: count >= 1 ? "PASS" : "FAIL",
      detail: `${scope} visible calls=${count}, expected>=1`,
    };
  }),
];

const failures = findings.filter((finding) => finding.status === "FAIL");

console.log(`VOID_MEMPOOL_BEST_EFFORT_SILENT_CATCH_VISIBILITY_NODE_CORE_SHA256=${sha256(source)}`);
console.log(`VOID_MEMPOOL_BEST_EFFORT_SILENT_CATCH_VISIBILITY_REMAINING_SILENT_CATCH_COUNT=${literalCatchIndexes.length}`);
console.log(`VOID_MEMPOOL_BEST_EFFORT_SILENT_CATCH_VISIBILITY_MEMPOOL_SILENT_CATCH_COUNT=${mempoolSilentCatchIndexes.length}`);

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_MEMPOOL_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_FAIL");
  process.exit(1);
}

console.log("VOID_MEMPOOL_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_GREEN");
