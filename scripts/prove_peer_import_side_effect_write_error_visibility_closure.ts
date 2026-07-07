import fs from "node:fs";
import crypto from "node:crypto";

type Finding = {
  id: string;
  status: "PASS" | "FAIL";
  detail: string;
};

const nodeCorePath = "src/node_core.ts";
const source = fs.readFileSync(nodeCorePath, "utf8");
const lines = source.split(/\r?\n/);

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function immediateTryBlock(catchLineIndex: number): string {
  for (let j = catchLineIndex - 1; j >= Math.max(0, catchLineIndex - 80); j--) {
    if (lines[j]?.trim() === "try {") {
      return lines.slice(j, catchLineIndex + 1).join("\n");
    }
  }
  return "";
}

function isSideEffectSilentCatch(lineIndex: number): boolean {
  const block = immediateTryBlock(lineIndex);
  return (
    block.includes("this.txIndex.putMany(refs)") ||
    block.includes("buildKidxForJsonl") ||
    (block.includes("anyReceipts") && (block.includes("appendMany") || block.includes("append(")))
  );
}

const silentCatchLineIndexes = lines
  .map((line, i) => ({ line, i }))
  .filter(({ line }) => line.trim() === "} catch {}")
  .map(({ i }) => i);

const sideEffectSilentCatchLineIndexes = silentCatchLineIndexes.filter(isSideEffectSilentCatch);

const marker = "VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_FAILURE_VISIBLE";
const helperPresent = source.includes("function recordSideEffectWriteFailure(");
const markerPresent = source.includes(marker);

const requiredScopes = [
  "local-production-tx-index",
  "local-production-kidx",
  "local-production-receipts",
  "peer-import-tx-index",
  "peer-import-receipts",
];

const findings: Finding[] = [];

findings.push({
  id: "node-core-readable",
  status: "PASS",
  detail: `${nodeCorePath} readable`,
});

findings.push({
  id: "side-effect-warning-helper-present",
  status: helperPresent ? "PASS" : "FAIL",
  detail: helperPresent
    ? "recordSideEffectWriteFailure helper is present"
    : "recordSideEffectWriteFailure helper is missing",
});

findings.push({
  id: "side-effect-warning-marker-present",
  status: markerPresent ? "PASS" : "FAIL",
  detail: markerPresent
    ? `${marker} marker is present`
    : `${marker} marker is missing`,
});

findings.push({
  id: "side-effect-silent-catches-closed",
  status: sideEffectSilentCatchLineIndexes.length === 0 ? "PASS" : "FAIL",
  detail: `immediate side-effect catch {} count=${sideEffectSilentCatchLineIndexes.length}`,
});

for (const scope of requiredScopes) {
  const actual = (source.match(new RegExp(scope, "g")) ?? []).length;
  findings.push({
    id: `scope-visible-${scope}`,
    status: actual >= 1 ? "PASS" : "FAIL",
    detail: `${scope} visible warning calls=${actual}, expected>=1`,
  });
}

const totalVisibleScopeCalls = requiredScopes.reduce(
  (sum, scope) => sum + ((source.match(new RegExp(scope, "g")) ?? []).length),
  0,
);

findings.push({
  id: "visible-side-effect-warning-call-count",
  status: totalVisibleScopeCalls >= 7 ? "PASS" : "FAIL",
  detail: `visible side-effect warning scope calls=${totalVisibleScopeCalls}, expected>=7`,
});

const failures = findings.filter((f) => f.status === "FAIL");

console.log(`VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_ERROR_VISIBILITY_CLOSURE_NODE_CORE_SHA256=${sha256(source)}`);
console.log(`VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_ERROR_VISIBILITY_CLOSURE_SILENT_CATCH_COUNT=${silentCatchLineIndexes.length}`);
console.log(`VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_ERROR_VISIBILITY_CLOSURE_SIDE_EFFECT_SILENT_CATCH_COUNT=${sideEffectSilentCatchLineIndexes.length}`);
console.log(`VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_ERROR_VISIBILITY_CLOSURE_VISIBLE_SCOPE_CALL_COUNT=${totalVisibleScopeCalls}`);

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_ERROR_VISIBILITY_CLOSURE_V1_FAIL");
  process.exit(1);
}

console.log("VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_ERROR_VISIBILITY_CLOSURE_V1_GREEN");
