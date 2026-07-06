import crypto from "node:crypto";
import fs from "node:fs";

const NODE_CORE_PATH = "src/node_core.ts";
const BLOCK_PATH = "src/chain/block.ts";
const REPORT_JSON_PATH = "docs/security/validate-block-for-append-unguarded-saveblock-context-prepatch-report-v1.json";
const REPORT_MD_PATH = "docs/security/validate-block-for-append-unguarded-saveblock-context-prepatch-report-v1.md";

type SaveBlockContextFinding = Readonly<{
  id: string;
  ok: boolean;
  severity: "blocker" | "warn" | "info";
  evidence: string;
}>;

type SaveBlockContext = Readonly<{
  id: string;
  lineNumber: number;
  expression: string;
  guardedWithinWindow: boolean;
  explicitFailureWithinWindow: boolean;
  contextBefore: readonly string[];
  contextLine: string;
  contextAfter: readonly string[];
}>;

const sha256 = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");

const readRequired = (path: string): string => {
  if (!fs.existsSync(path)) {
    throw new Error(`Required file missing: ${path}`);
  }
  return fs.readFileSync(path, "utf8");
};

const nodeCore = readRequired(NODE_CORE_PATH);
const blockSource = readRequired(BLOCK_PATH);
const lines = nodeCore.split(/\r?\n/);
const findings: SaveBlockContextFinding[] = [];
const add = (id: string, ok: boolean, severity: "blocker" | "warn" | "info", evidence: string): void => {
  findings.push({ id, ok, severity, evidence });
};

add("node-core-present", nodeCore.length > 0, "blocker", NODE_CORE_PATH);
add("block-source-present", blockSource.length > 0, "blocker", BLOCK_PATH);
add(
  "validateBlockForAppend-exported",
  /export\s+function\s+validateBlockForAppend\s*\(/.test(blockSource) || /export\s+const\s+validateBlockForAppend\s*=/.test(blockSource),
  "blocker",
  "validateBlockForAppend export is visible in src/chain/block.ts",
);
add("node-core-references-validateBlockForAppend", /validateBlockForAppend/.test(nodeCore), "blocker", "src/node_core.ts references validateBlockForAppend somewhere");

const saveBlockContexts: SaveBlockContext[] = [];
const saveBlockRegex = /await\s+this\.store\.saveBlock\(([^)]+)\);/g;
for (const match of nodeCore.matchAll(saveBlockRegex)) {
  const pos = match.index ?? 0;
  const lineNumber = nodeCore.slice(0, pos).split(/\r?\n/).length;
  const lineIndex = lineNumber - 1;
  const contextBefore = lines.slice(Math.max(0, lineIndex - 18), lineIndex);
  const contextAfter = lines.slice(lineIndex + 1, Math.min(lines.length, lineIndex + 12));
  const sourceWindow = [...contextBefore, lines[lineIndex] ?? "", ...contextAfter].join("\n");
  const guardedWithinWindow = sourceWindow.includes("validateBlockForAppend");
  const explicitFailureWithinWindow = /ok\s*:\s*false/.test(sourceWindow) || /invalid imported block/.test(sourceWindow);
  saveBlockContexts.push({
    id: `saveBlock-${saveBlockContexts.length + 1}`,
    lineNumber,
    expression: (match[1] ?? "").trim(),
    guardedWithinWindow,
    explicitFailureWithinWindow,
    contextBefore,
    contextLine: lines[lineIndex] ?? "",
    contextAfter,
  });
}

add("saveBlock-call-sites-found", saveBlockContexts.length > 0, "blocker", `saveBlock call sites=${saveBlockContexts.length}`);
for (const context of saveBlockContexts) {
  add(`${context.id}-context-captured`, true, "info", `${NODE_CORE_PATH}:${context.lineNumber}`);
  add(`${context.id}-guarded-within-context-window`, context.guardedWithinWindow, "blocker", "validateBlockForAppend visible in captured context window");
  add(`${context.id}-explicit-failure-within-context-window`, context.explicitFailureWithinWindow, "warn", "explicit ok:false or invalid imported block visible in captured context window");
}

const blockerFailures = findings.filter((finding) => finding.severity === "blocker" && !finding.ok).map((finding) => finding.id);
const warningFailures = findings.filter((finding) => finding.severity === "warn" && !finding.ok).map((finding) => finding.id);
const closureStatus = blockerFailures.length === 0 ? "CONTEXT_PREFLIGHT_READY" : "CONTEXT_PREFLIGHT_BLOCKED";

const report = {
  schema: "VOID_VALIDATE_BLOCK_FOR_APPEND_UNGUARDED_SAVEBLOCK_CONTEXT_PREFLIGHT_REPORT_V1",
  generatedAt: "1970-01-01T00:00:00.000Z",
  nodeCoreSha256: sha256(nodeCore),
  blockSourceSha256: sha256(blockSource),
  closureStatus,
  blockerFailures,
  warningFailures,
  findings,
  saveBlockContexts,
  nextAction: "Patch each blocked saveBlock context so validateBlockForAppend executes before persistence and returns an explicit ok:false failure before saveBlock.",
  boundary: {
    staticSourceContextOnly: true,
    noPatchApplied: true,
    noForkChoiceClaim: true,
    noConsensusFinalityClaim: true,
    noWalletAuthority: true,
    noLedgerWrite: true,
    noValidatorAdmission: true,
    noAutonomousMutation: true,
  },
} as const;

fs.mkdirSync("docs/security", { recursive: true });
fs.writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);

const mdLines: string[] = [
  "# validateBlockForAppend unguarded saveBlock context prepatch report v1",
  "",
  "- generated_at: 1970-01-01T00:00:00.000Z",
  `- closure_status: ${closureStatus}`,
  `- blocker_failures: ${blockerFailures.length === 0 ? "none" : blockerFailures.join(", ")}`,
  `- warning_failures: ${warningFailures.length === 0 ? "none" : warningFailures.join(", ")}`,
  `- node_core_sha256: ${report.nodeCoreSha256}`,
  `- block_source_sha256: ${report.blockSourceSha256}`,
  "",
  "## Findings",
  "",
  ...findings.map((finding) => `- [${finding.ok ? "PASS" : "FAIL"}] ${finding.id} (${finding.severity}): ${finding.evidence}`),
  "",
  "## saveBlock contexts",
  "",
];

for (const context of saveBlockContexts) {
  mdLines.push(`### ${context.id} — ${NODE_CORE_PATH}:${context.lineNumber}`);
  mdLines.push("");
  mdLines.push(`- expression: \`${context.expression}\``);
  mdLines.push(`- guarded_within_context_window: ${context.guardedWithinWindow}`);
  mdLines.push(`- explicit_failure_within_context_window: ${context.explicitFailureWithinWindow}`);
  mdLines.push("");
  mdLines.push("```ts");
  for (const before of context.contextBefore) mdLines.push(before);
  mdLines.push(context.contextLine);
  for (const after of context.contextAfter) mdLines.push(after);
  mdLines.push("```");
  mdLines.push("");
}

mdLines.push("## Boundary");
mdLines.push("");
mdLines.push("Static/source context only. This workflow deliberately does not patch code or claim fork-choice, consensus-finality, wallet-authority, ledger-write, validator-admission, signer-rotation, or autonomous-mutation closure.");
mdLines.push("");
fs.writeFileSync(REPORT_MD_PATH, `${mdLines.join("\n")}\n`);

console.log(`VOID_VALIDATE_BLOCK_FOR_APPEND_UNGUARDED_SAVEBLOCK_CONTEXT_PREFLIGHT_STATUS=${closureStatus}`);
console.log(`BLOCKER_FAILURES=${blockerFailures.length === 0 ? "none" : blockerFailures.join(",")}`);
console.log("VOID_VALIDATE_BLOCK_FOR_APPEND_UNGUARDED_SAVEBLOCK_CONTEXT_PREFLIGHT_V1_READY");
