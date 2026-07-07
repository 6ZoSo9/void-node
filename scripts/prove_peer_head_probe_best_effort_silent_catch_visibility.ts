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
  .filter(({ line }) => line.includes("} catch {}"))
  .map(({ index }) => index);

const probeNeedles = [
  "/blocks/latest/number2.json",
  "/head",
  "/__void/demo/summary.json",
  "/api/health",
];

const peerHeadProbeSilentCatchIndexes = literalCatchIndexes.filter((index) => {
  const block = immediateTryBlock(index);
  return probeNeedles.some((needle) => block.includes(needle));
});

const marker = "VOID_PEER_HEAD_PROBE_BEST_EFFORT_FAILURE_VISIBLE";
const helper = "function recordPeerHeadProbeFailure(";

const requiredScopes = [
  "peer-head-probe-latest-number2",
  "peer-head-probe-head",
  "peer-head-probe-demo-summary",
  "peer-head-probe-api-health",
];

const findings: Finding[] = [
  {
    id: "peer-head-probe-helper-present",
    status: source.includes(helper) ? "PASS" : "FAIL",
    detail: source.includes(helper) ? "helper present" : "helper missing",
  },
  {
    id: "peer-head-probe-marker-present",
    status: source.includes(marker) ? "PASS" : "FAIL",
    detail: source.includes(marker) ? "marker present" : "marker missing",
  },
  {
    id: "remaining-silent-catch-baseline-after-peer-head-probe",
    status: literalCatchIndexes.length === 7 ? "PASS" : "FAIL",
    detail: `literal silent catches=${literalCatchIndexes.length}, expected=7`,
  },
  {
    id: "peer-head-probe-silent-catches-closed",
    status: peerHeadProbeSilentCatchIndexes.length === 0 ? "PASS" : "FAIL",
    detail: `peer-head-probe silent catches=${peerHeadProbeSilentCatchIndexes.length}`,
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

console.log(`VOID_PEER_HEAD_PROBE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_NODE_CORE_SHA256=${sha256(source)}`);
console.log(`VOID_PEER_HEAD_PROBE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_REMAINING_SILENT_CATCH_COUNT=${literalCatchIndexes.length}`);
console.log(`VOID_PEER_HEAD_PROBE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_PROBE_SILENT_CATCH_COUNT=${peerHeadProbeSilentCatchIndexes.length}`);

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_PEER_HEAD_PROBE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_FAIL");
  process.exit(1);
}

console.log("VOID_PEER_HEAD_PROBE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_GREEN");
