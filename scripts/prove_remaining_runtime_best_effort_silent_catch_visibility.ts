import fs from "node:fs";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };

const file = "src/node_core.ts";
const source = fs.readFileSync(file, "utf8");
const lines = source.split(/\r?\n/);

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

const literalCatchIndexes = lines
  .map((line, index) => ({ line, index }))
  .filter(({ line }) => line.includes("} catch {}"))
  .map(({ index }) => index);

const marker = "VOID_REMAINING_RUNTIME_BEST_EFFORT_FAILURE_VISIBLE";
const helper = "function recordRemainingRuntimeBestEffortFailure(";
const requiredScopes = [
  "lan-ip-discovery",
  "send-raw-socket-write",
  "follower-periodic-pull",
];

const findings: Finding[] = [
  {
    id: "remaining-runtime-helper-present",
    status: source.includes(helper) ? "PASS" : "FAIL",
    detail: source.includes(helper) ? "helper present" : "helper missing",
  },
  {
    id: "remaining-runtime-marker-present",
    status: source.includes(marker) ? "PASS" : "FAIL",
    detail: source.includes(marker) ? "marker present" : "marker missing",
  },
  {
    id: "literal-silent-catches-fully-closed",
    status: literalCatchIndexes.length === 0 ? "PASS" : "FAIL",
    detail: `literal silent catches=${literalCatchIndexes.length}, expected=0`,
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

console.log(`VOID_REMAINING_RUNTIME_BEST_EFFORT_SILENT_CATCH_VISIBILITY_NODE_CORE_SHA256=${sha256(source)}`);
console.log(`VOID_REMAINING_RUNTIME_BEST_EFFORT_SILENT_CATCH_VISIBILITY_REMAINING_SILENT_CATCH_COUNT=${literalCatchIndexes.length}`);

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_REMAINING_RUNTIME_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_FAIL");
  process.exit(1);
}

console.log("VOID_REMAINING_RUNTIME_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_GREEN");
