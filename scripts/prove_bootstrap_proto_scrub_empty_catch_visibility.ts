import fs from "node:fs";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };

const file = "src/bootstrap/proto_scrub.ts";
const source = fs.readFileSync(file, "utf8");

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

const lines = source.split(/\r?\n/);
const emptyCatchLines = lines
  .map((line, index) => ({ line, lineNumber: index + 1 }))
  .filter(({ line }) => /catch\s*(\([^)]*\))?\s*\{\s*\}/.test(line));

const catchContextCount = lines.filter((line) => /catch\s*(\(|\{)/.test(line)).length;
const marker = "VOID_BOOTSTRAP_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE";
const helper = "function recordProtoScrubBestEffortFailure(";
const requiredScopes = [
  "initial-delete",
  "define-property-normalize",
  "final-delete",
  "outer-proto-scrub",
];

const findings: Finding[] = [
  {
    id: "proto-scrub-helper-present",
    status: source.includes(helper) ? "PASS" : "FAIL",
    detail: source.includes(helper) ? "helper present" : "helper missing",
  },
  {
    id: "proto-scrub-marker-present",
    status: source.includes(marker) ? "PASS" : "FAIL",
    detail: source.includes(marker) ? "marker present" : "marker missing",
  },
  {
    id: "proto-scrub-empty-catches-closed",
    status: emptyCatchLines.length === 0 ? "PASS" : "FAIL",
    detail: `empty catch count=${emptyCatchLines.length}, expected=0`,
  },
  {
    id: "proto-scrub-catch-context-baseline-preserved",
    status: catchContextCount === 4 ? "PASS" : "FAIL",
    detail: `catch context count=${catchContextCount}, expected=4`,
  },
  {
    id: "proto-scrub-object-prototype-target-present",
    status: source.includes("Object.prototype") && source.includes("'txRoot'") ? "PASS" : "FAIL",
    detail: source.includes("Object.prototype") && source.includes("'txRoot'") ? "Object.prototype txRoot target present" : "Object.prototype txRoot target missing",
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

console.log(`VOID_BOOTSTRAP_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_SOURCE_SHA256=${sha256(source)}`);
console.log(`VOID_BOOTSTRAP_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_EMPTY_CATCH_COUNT=${emptyCatchLines.length}`);
console.log(`VOID_BOOTSTRAP_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_CATCH_CONTEXT_COUNT=${catchContextCount}`);

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_BOOTSTRAP_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_V1_FAIL");
  process.exit(1);
}

console.log("VOID_BOOTSTRAP_PROTO_SCRUB_EMPTY_CATCH_VISIBILITY_V1_GREEN");
