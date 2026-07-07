import fs from "node:fs";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };

const file = "src/util/txroot.ts";
const source = fs.readFileSync(file, "utf8");

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

const lines = source.split(/\r?\n/);
const emptyCatchLines = lines
  .map((line, index) => ({ line, lineNumber: index + 1 }))
  .filter(({ line }) => /catch\s*(\([^)]*\))?\s*\{\s*\}/.test(line));

const marker = "VOID_UTIL_TXROOT_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE";
const helper = "function recordTxrootCompatFallbackFailure(";
const requiredScopes = [
  "computeTxRoot-compat-probe",
  "merkleRoot-compat-probe",
];

const findings: Finding[] = [
  {
    id: "txroot-helper-present",
    status: source.includes(helper) ? "PASS" : "FAIL",
    detail: source.includes(helper) ? "helper present" : "helper missing",
  },
  {
    id: "txroot-marker-present",
    status: source.includes(marker) ? "PASS" : "FAIL",
    detail: source.includes(marker) ? "marker present" : "marker missing",
  },
  {
    id: "txroot-empty-catches-closed",
    status: emptyCatchLines.length === 0 ? "PASS" : "FAIL",
    detail: `empty catch count=${emptyCatchLines.length}, expected=0`,
  },
  {
    id: "txroot-export-present",
    status: source.includes("export const txroot") ? "PASS" : "FAIL",
    detail: source.includes("export const txroot") ? "txroot export present" : "txroot export missing",
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

console.log(`VOID_UTIL_TXROOT_EMPTY_CATCH_VISIBILITY_TXROOT_SHA256=${sha256(source)}`);
console.log(`VOID_UTIL_TXROOT_EMPTY_CATCH_VISIBILITY_EMPTY_CATCH_COUNT=${emptyCatchLines.length}`);

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_UTIL_TXROOT_EMPTY_CATCH_VISIBILITY_V1_FAIL");
  process.exit(1);
}

console.log("VOID_UTIL_TXROOT_EMPTY_CATCH_VISIBILITY_V1_GREEN");
