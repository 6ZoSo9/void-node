import fs from "node:fs";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };

const file = "src/crypto/keypair.ts";
const source = fs.readFileSync(file, "utf8");

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

const lines = source.split(/\r?\n/);
const emptyCatchLines = lines
  .map((line, index) => ({ line, lineNumber: index + 1 }))
  .filter(({ line }) => /catch\s*(\([^)]*\))?\s*\{\s*\}/.test(line));

const catchContextCount = lines.filter((line) => /catch\s*(\(|\{)/.test(line)).length;
const marker = "VOID_CRYPTO_KEYPAIR_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE";
const helper = "function recordCryptoKeypairBestEffortFailure(";
const scope = "pem-parse-fallback-to-raw-seed";

const findings: Finding[] = [
  {
    id: "crypto-keypair-helper-present",
    status: source.includes(helper) ? "PASS" : "FAIL",
    detail: source.includes(helper) ? "helper present" : "helper missing",
  },
  {
    id: "crypto-keypair-marker-present",
    status: source.includes(marker) ? "PASS" : "FAIL",
    detail: source.includes(marker) ? "marker present" : "marker missing",
  },
  {
    id: "crypto-keypair-empty-catches-closed",
    status: emptyCatchLines.length === 0 ? "PASS" : "FAIL",
    detail: `empty catch count=${emptyCatchLines.length}, expected=0`,
  },
  {
    id: "crypto-keypair-catch-context-baseline-preserved",
    status: catchContextCount === 1 ? "PASS" : "FAIL",
    detail: `catch context count=${catchContextCount}, expected=1`,
  },
  {
    id: "crypto-keypair-load-export-present",
    status: source.includes("export function loadKeypair") ? "PASS" : "FAIL",
    detail: source.includes("export function loadKeypair") ? "loadKeypair export present" : "loadKeypair export missing",
  },
  {
    id: "crypto-keypair-raw-seed-fallback-present",
    status: source.includes("normalizeRawSeed") && source.includes("rawSeedToKeypair") ? "PASS" : "FAIL",
    detail: source.includes("normalizeRawSeed") && source.includes("rawSeedToKeypair") ? "raw seed fallback present" : "raw seed fallback missing",
  },
  {
    id: `scope-visible-${scope}`,
    status: source.includes(scope) ? "PASS" : "FAIL",
    detail: source.includes(scope) ? `${scope} visible` : `${scope} missing`,
  },
];

const failures = findings.filter((finding) => finding.status === "FAIL");

console.log(`VOID_CRYPTO_KEYPAIR_EMPTY_CATCH_VISIBILITY_SOURCE_SHA256=${sha256(source)}`);
console.log(`VOID_CRYPTO_KEYPAIR_EMPTY_CATCH_VISIBILITY_EMPTY_CATCH_COUNT=${emptyCatchLines.length}`);
console.log(`VOID_CRYPTO_KEYPAIR_EMPTY_CATCH_VISIBILITY_CATCH_CONTEXT_COUNT=${catchContextCount}`);

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_CRYPTO_KEYPAIR_EMPTY_CATCH_VISIBILITY_V1_FAIL");
  process.exit(1);
}

console.log("VOID_CRYPTO_KEYPAIR_EMPTY_CATCH_VISIBILITY_V1_GREEN");
