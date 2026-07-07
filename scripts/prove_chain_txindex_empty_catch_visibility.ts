import fs from "node:fs";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };

const file = "src/chain/txindex.ts";
const source = fs.readFileSync(file, "utf8");

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

const lines = source.split(/\r?\n/);
const emptyCatchLines = lines
  .map((line, index) => ({ line, lineNumber: index + 1 }))
  .filter(({ line }) => /catch\s*(\([^)]*\))?\s*\{\s*\}/.test(line));

const catchContextCount = lines.filter((line) => /catch\s*(\(|\{)/.test(line)).length;
const marker = "VOID_CHAIN_TXINDEX_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE";
const helper = "function recordTxIndexBestEffortFailure(";
const requiredScopes = [
  "list-shards-directory-scan",
  "lookup-in-shard-read-parse",
];

const findings: Finding[] = [
  {
    id: "txindex-helper-present",
    status: source.includes(helper) ? "PASS" : "FAIL",
    detail: source.includes(helper) ? "helper present" : "helper missing",
  },
  {
    id: "txindex-marker-present",
    status: source.includes(marker) ? "PASS" : "FAIL",
    detail: source.includes(marker) ? "marker present" : "marker missing",
  },
  {
    id: "txindex-empty-catches-closed",
    status: emptyCatchLines.length === 0 ? "PASS" : "FAIL",
    detail: `empty catch count=${emptyCatchLines.length}, expected=0`,
  },
  {
    id: "txindex-catch-context-baseline-preserved",
    status: catchContextCount === 2 ? "PASS" : "FAIL",
    detail: `catch context count=${catchContextCount}, expected=2`,
  },
  {
    id: "txindex-class-present",
    status: source.includes("export class TxIndex") ? "PASS" : "FAIL",
    detail: source.includes("export class TxIndex") ? "TxIndex export present" : "TxIndex export missing",
  },
  {
    id: "txindex-list-shards-present",
    status: source.includes("listShards()") ? "PASS" : "FAIL",
    detail: source.includes("listShards()") ? "listShards present" : "listShards missing",
  },
  {
    id: "txindex-lookup-in-shard-present",
    status: source.includes("lookupInShard(") ? "PASS" : "FAIL",
    detail: source.includes("lookupInShard(") ? "lookupInShard present" : "lookupInShard missing",
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

console.log(`VOID_CHAIN_TXINDEX_EMPTY_CATCH_VISIBILITY_TXINDEX_SHA256=${sha256(source)}`);
console.log(`VOID_CHAIN_TXINDEX_EMPTY_CATCH_VISIBILITY_EMPTY_CATCH_COUNT=${emptyCatchLines.length}`);
console.log(`VOID_CHAIN_TXINDEX_EMPTY_CATCH_VISIBILITY_CATCH_CONTEXT_COUNT=${catchContextCount}`);

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_CHAIN_TXINDEX_EMPTY_CATCH_VISIBILITY_V1_FAIL");
  process.exit(1);
}

console.log("VOID_CHAIN_TXINDEX_EMPTY_CATCH_VISIBILITY_V1_GREEN");
