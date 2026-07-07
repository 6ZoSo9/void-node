import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

type Finding = Readonly<{
  id: string;
  ok: boolean;
  severity: "blocker" | "warn" | "info";
  evidence: string;
}>;

type CatchContext = Readonly<{
  index: number;
  line: number;
  hasTxIndexNearby: boolean;
  hasReceiptsNearby: boolean;
  hasKidxNearby: boolean;
  hasImportPersistenceNearby: boolean;
  hasLocalProductionNearby: boolean;
  hasExplicitFailureReturnNearby: boolean;
  context: string;
}>;

const repoRoot = process.cwd();
const nodeCorePath = `${repoRoot}/src/node_core.ts`;
const blockSourcePath = `${repoRoot}/src/chain/block.ts`;
const reportJsonPath = `${repoRoot}/docs/security/peer-import-side-effect-write-error-visibility-preflight-v1-report.json`;
const reportMdPath = `${repoRoot}/docs/security/peer-import-side-effect-write-error-visibility-preflight-v1-report.md`;

const readSource = (path: string): string => readFileSync(path, "utf8");
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

const lineNumberFromIndex = (source: string, index: number): number => source.slice(0, index).split("\n").length;

const lineWindow = (lines: readonly string[], centerLine: number, radius: number): string => {
  const start = Math.max(1, centerLine - radius);
  const end = Math.min(lines.length, centerLine + radius);
  const width = String(end).length;
  const rendered: string[] = [];
  for (let n = start; n <= end; n++) {
    rendered.push(`${String(n).padStart(width, " ")}: ${lines[n - 1] ?? ""}`);
  }
  return rendered.join("\n");
};

const nodeCore = readSource(nodeCorePath);
const blockSource = readSource(blockSourcePath);
const nodeLines = nodeCore.split("\n");

const findings: Finding[] = [];
const addFinding = (id: string, ok: boolean, severity: Finding["severity"], evidence: string): void => {
  findings.push({ id, ok, severity, evidence });
};

addFinding("node-core-present", nodeCore.length > 0, "blocker", "src/node_core.ts readable");
addFinding("block-source-present", blockSource.length > 0, "blocker", "src/chain/block.ts readable");
addFinding(
  "validateBlockForAppend-exported",
  /export\s+function\s+validateBlockForAppend|export\s+const\s+validateBlockForAppend/.test(blockSource),
  "blocker",
  "validateBlockForAppend export visible in src/chain/block.ts",
);
addFinding(
  "node-core-references-validateBlockForAppend",
  nodeCore.includes("validateBlockForAppend"),
  "blocker",
  "src/node_core.ts references validateBlockForAppend",
);

const catchMatches = Array.from(nodeCore.matchAll(/catch\s*\{\s*\}/g));
const contexts: CatchContext[] = catchMatches.map((match, i) => {
  const idx = match.index ?? 0;
  const line = lineNumberFromIndex(nodeCore, idx);
  const context = lineWindow(nodeLines, line, 18);
  const lower = context.toLowerCase();
  return {
    index: i + 1,
    line,
    hasTxIndexNearby: /txIndex|txindex/.test(context),
    hasReceiptsNearby: /receipts|appendMany|append\(/.test(context),
    hasKidxNearby: /buildKidxForJsonl|kidx/i.test(context),
    hasImportPersistenceNearby: /invalid imported block|invalid imported fill block|imported\+\+|filled\+\+|importedNums|theirHead|from,/.test(context),
    hasLocalProductionNearby: /signBytes\(this\.priv|proposer:\s*this\.id|proposerPubkey:\s*this\.pubPEM/.test(context),
    hasExplicitFailureReturnNearby: lower.includes("invalid imported block") || lower.includes("invalid imported fill block"),
    context,
  };
});

const sideEffectContexts = contexts.filter((c) => c.hasTxIndexNearby || c.hasReceiptsNearby || c.hasKidxNearby);
const importSideEffectContexts = sideEffectContexts.filter((c) => c.hasImportPersistenceNearby);
const localSideEffectContexts = sideEffectContexts.filter((c) => c.hasLocalProductionNearby && !c.hasImportPersistenceNearby);

addFinding("silent-catch-sites-discovered", catchMatches.length > 0, "info", `catch {} matches=${catchMatches.length}`);
addFinding("side-effect-silent-catch-sites-discovered", sideEffectContexts.length > 0, "warn", `txIndex/receipts/kidx catch contexts=${sideEffectContexts.length}`);
addFinding("import-side-effect-silent-catch-sites-discovered", importSideEffectContexts.length > 0, "warn", `import side-effect catch contexts=${importSideEffectContexts.length}`);
addFinding("local-production-side-effect-silent-catch-sites-discovered", localSideEffectContexts.length > 0, "info", `local production side-effect catch contexts=${localSideEffectContexts.length}`);

const warningFailures = findings.filter((f) => f.severity === "warn" && !f.ok).map((f) => f.id);
const blockerFailures = findings.filter((f) => f.severity === "blocker" && !f.ok).map((f) => f.id);
const status = blockerFailures.length > 0 ? "STATIC_PREFLIGHT_BLOCKED" : "STATIC_PREFLIGHT_WARNINGS";

const report = {
  schema: "VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_ERROR_VISIBILITY_PREFLIGHT_REPORT_V1",
  generatedAt: "1970-01-01T00:00:00.000Z",
  status,
  nodeCoreSha256: sha256(nodeCore),
  blockSourceSha256: sha256(blockSource),
  silentCatchCount: catchMatches.length,
  sideEffectSilentCatchCount: sideEffectContexts.length,
  importSideEffectSilentCatchCount: importSideEffectContexts.length,
  localProductionSideEffectSilentCatchCount: localSideEffectContexts.length,
  blockerFailures,
  warningFailures,
  findings,
  sideEffectContexts,
  boundary: {
    staticSourcePreflightOnly: true,
    noRuntimeErrorHandlingPatch: true,
    noForkChoiceClaim: true,
    noConsensusFinalityClaim: true,
    noWalletAuthority: true,
    noLedgerWrite: true,
    noValidatorAdmission: true,
    noSignerRotation: true,
    noAutonomousMutation: true,
  },
};

mkdirSync(dirname(reportJsonPath), { recursive: true });
writeFileSync(reportJsonPath, JSON.stringify(report, null, 2) + "\n");

const md: string[] = [];
md.push("# peer import side-effect write error visibility preflight v1");
md.push("");
md.push("- generated_at: 1970-01-01T00:00:00.000Z");
md.push(`- status: ${status}`);
md.push(`- blocker_failures: ${blockerFailures.length ? blockerFailures.join(", ") : "none"}`);
md.push(`- warning_failures: ${warningFailures.length ? warningFailures.join(", ") : "none"}`);
md.push(`- node_core_sha256: ${report.nodeCoreSha256}`);
md.push(`- block_source_sha256: ${report.blockSourceSha256}`);
md.push(`- silent_catch_count: ${catchMatches.length}`);
md.push(`- side_effect_silent_catch_count: ${sideEffectContexts.length}`);
md.push(`- import_side_effect_silent_catch_count: ${importSideEffectContexts.length}`);
md.push(`- local_production_side_effect_silent_catch_count: ${localSideEffectContexts.length}`);
md.push("");
md.push("## Findings");
md.push("");
for (const finding of findings) {
  md.push(`- [${finding.ok ? "PASS" : "FAIL"}] ${finding.id} (${finding.severity}): ${finding.evidence}`);
}
md.push("");
md.push("## Side-effect silent catch contexts");
md.push("");
if (sideEffectContexts.length === 0) {
  md.push("No txIndex/receipts/kidx-adjacent silent `catch {}` contexts found.");
} else {
  for (const c of sideEffectContexts) {
    md.push(`### Context ${c.index}: catch {} at src/node_core.ts:${c.line}`);
    md.push("");
    md.push(`- hasTxIndexNearby: ${c.hasTxIndexNearby}`);
    md.push(`- hasReceiptsNearby: ${c.hasReceiptsNearby}`);
    md.push(`- hasKidxNearby: ${c.hasKidxNearby}`);
    md.push(`- hasImportPersistenceNearby: ${c.hasImportPersistenceNearby}`);
    md.push(`- hasLocalProductionNearby: ${c.hasLocalProductionNearby}`);
    md.push(`- hasExplicitFailureReturnNearby: ${c.hasExplicitFailureReturnNearby}`);
    md.push("");
    md.push("```ts");
    md.push(c.context);
    md.push("```");
    md.push("");
  }
}
md.push("## Boundary");
md.push("");
md.push("Static/source preflight only. This workflow records silent side-effect write catches and does not patch runtime behavior or claim fork-choice, consensus-finality, wallet-authority, ledger-write, validator-admission, signer-rotation, or autonomous-mutation closure.");
md.push("");
writeFileSync(reportMdPath, md.join("\n"));

console.log(`VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_ERROR_VISIBILITY_PREFLIGHT_STATUS=${status}`);
console.log(`SILENT_CATCH_COUNT=${catchMatches.length}`);
console.log(`SIDE_EFFECT_SILENT_CATCH_COUNT=${sideEffectContexts.length}`);
console.log(`IMPORT_SIDE_EFFECT_SILENT_CATCH_COUNT=${importSideEffectContexts.length}`);
console.log("VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_ERROR_VISIBILITY_PREFLIGHT_V1_READY");
