import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type Finding = { id: string; status: "PASS" | "FAIL"; detail: string };
type FileCount = { file: string; count: number };

const generatedAt = "1970-01-01T00:00:00.000Z";
const roots = ["src", "scripts"];
const self = path.normalize("scripts/prove_runtime_error_visibility_no_silent_swallowing_guard.ts");
const generatedProofScriptPattern = /^scripts\/prove_.*\.ts$/;
const reportJsonPath = "docs/security/runtime-error-visibility-no-silent-swallowing-guard-v1-report.json";
const reportMdPath = "docs/security/runtime-error-visibility-no-silent-swallowing-guard-v1-report.md";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const normalized = path.normalize(full);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
      out.push(...walk(normalized));
      continue;
    }
    if (entry.isFile() && normalized.endsWith(".ts")) out.push(normalized);
  }
  return out;
}

function countCatchContextLines(file: string): number {
  const text = fs.readFileSync(file, "utf8");
  return text.split(/\r?\n/).filter((line) => /catch\s*(\(|\{)/.test(line)).length;
}

function literalEmptyCatchMatches(file: string): string[] {
  const text = fs.readFileSync(file, "utf8");
  return text
    .split(/\r?\n/)
    .filter((line) => /catch\s*(\([^)]*\))?\s*\{\s*\}/.test(line));
}

const files = roots
  .flatMap((root) => walk(root))
  .filter((file) => path.normalize(file) !== self)
  .filter((file) => !generatedProofScriptPattern.test(path.normalize(file)))
  .sort();

const counts: FileCount[] = files
  .map((file) => ({ file, count: countCatchContextLines(file) }))
  .filter((entry) => entry.count > 0)
  .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));

const repoCatchContextCount = counts.reduce((sum, entry) => sum + entry.count, 0);
const nodeCore = "src/node_core.ts";
const nodeCoreSource = fs.readFileSync(nodeCore, "utf8");
const nodeCoreCatchContextCount = countCatchContextLines(nodeCore);
const nodeCoreLiteralEmptyCatchCount = literalEmptyCatchMatches(nodeCore).length;
const repoLiteralEmptyCatchCount = files.reduce((sum, file) => sum + literalEmptyCatchMatches(file).length, 0);

const expectedTopCounts: Record<string, number> = {
  "src/index.ts": 2542,
  "src/node_core.ts": 37,
  "src/chain/seg_store.ts": 28,
  "src/http/datanet_routes.ts": 20,
  "src/cli.ts": 20,
};

const requiredNodeCoreVisibilityMarkers = [
  "VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_FAILURE_VISIBLE",
  "VOID_MEMPOOL_BEST_EFFORT_FAILURE_VISIBLE",
  "VOID_PEER_HEAD_PROBE_BEST_EFFORT_FAILURE_VISIBLE",
  "VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_FAILURE_VISIBLE",
  "VOID_REMAINING_RUNTIME_BEST_EFFORT_FAILURE_VISIBLE",
];

const requiredProofs = [
  "scripts/prove_silent_catch_zero_terminal_final_seal.ts",
  "scripts/prove_remaining_runtime_best_effort_silent_catch_visibility.ts",
  "scripts/prove_silent_catch_classification_registry.ts",
  "scripts/prove_peer_import_side_effect_write_error_visibility_preflight.ts",
  "scripts/prove_peer_import_side_effect_write_error_visibility_closure.ts",
];

const topByFile = counts.slice(0, 40);
const countByFile = new Map(counts.map((entry) => [entry.file, entry.count]));

const findings: Finding[] = [
  {
    id: "repo-catch-inventory-baseline",
    status: repoCatchContextCount === 2786 ? "PASS" : "FAIL",
    detail: `repo catch context count=${repoCatchContextCount}, expected=2786`,
  },
  {
    id: "node-core-catch-context-baseline",
    status: nodeCoreCatchContextCount === 37 ? "PASS" : "FAIL",
    detail: `src/node_core.ts catch context count=${nodeCoreCatchContextCount}, expected=37`,
  },
  {
    id: "node-core-literal-empty-catch-zero",
    status: nodeCoreLiteralEmptyCatchCount === 0 ? "PASS" : "FAIL",
    detail: `src/node_core.ts literal empty catch count=${nodeCoreLiteralEmptyCatchCount}, expected=0`,
  },
  {
    id: "repo-wide-literal-empty-catch-pressure-recorded",
    status: repoLiteralEmptyCatchCount > 0 ? "PASS" : "FAIL",
    detail: `repo literal empty catch count=${repoLiteralEmptyCatchCount}, expected>0 as bounded future cleanup inventory`,
  },
  ...Object.entries(expectedTopCounts).map(([file, expected]): Finding => {
    const actual = countByFile.get(file) ?? 0;
    return {
      id: `catch-inventory-baseline-${file}`,
      status: actual === expected ? "PASS" : "FAIL",
      detail: `${file} catch context count=${actual}, expected=${expected}`,
    };
  }),
  ...requiredNodeCoreVisibilityMarkers.map((marker): Finding => ({
    id: `node-core-visibility-marker-${marker}`,
    status: nodeCoreSource.includes(marker) ? "PASS" : "FAIL",
    detail: nodeCoreSource.includes(marker) ? "marker present" : "marker missing",
  })),
  ...requiredProofs.map((proofPath): Finding => ({
    id: `proof-present-${proofPath}`,
    status: fs.existsSync(proofPath) ? "PASS" : "FAIL",
    detail: fs.existsSync(proofPath) ? "proof present" : "proof missing",
  })),
];

const failures = findings.filter((finding) => finding.status === "FAIL");

const report = {
  generated_at: generatedAt,
  status: failures.length ? "FAIL" : "GREEN",
  node_core_sha256: sha256(nodeCoreSource),
  repo_catch_context_count: repoCatchContextCount,
  node_core_catch_context_count: nodeCoreCatchContextCount,
  node_core_literal_empty_catch_count: nodeCoreLiteralEmptyCatchCount,
  repo_literal_empty_catch_count: repoLiteralEmptyCatchCount,
  top_by_file: topByFile,
  findings,
  scope_note:
    "This guard is intentionally bounded: it freezes the core node_core zero-empty-catch and visible-failure boundary while recording repo-wide catch pressure for later bounded cleanup lanes.",
};

fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2) + "\n");

const md = [
  "# runtime error visibility no silent swallowing guard v1",
  "",
  `- generated_at: ${generatedAt}`,
  `- status: ${report.status}`,
  `- node_core_sha256: ${report.node_core_sha256}`,
  `- repo_catch_context_count: ${repoCatchContextCount}`,
  `- node_core_catch_context_count: ${nodeCoreCatchContextCount}`,
  `- node_core_literal_empty_catch_count: ${nodeCoreLiteralEmptyCatchCount}`,
  `- repo_literal_empty_catch_count: ${repoLiteralEmptyCatchCount}`,
  "",
  "## Scope",
  "",
  report.scope_note,
  "",
  "## Top catch context files",
  "",
  ...topByFile.slice(0, 20).map((entry) => `- ${entry.count}: \`${entry.file}\``),
  "",
  "## Findings",
  "",
  ...findings.map((finding) => `- [${finding.status}] ${finding.id}: ${finding.detail}`),
  "",
];

fs.writeFileSync(reportMdPath, md.join("\n"));

console.log(`VOID_RUNTIME_ERROR_VISIBILITY_NO_SILENT_SWALLOWING_GUARD_NODE_CORE_SHA256=${report.node_core_sha256}`);
console.log(`VOID_RUNTIME_ERROR_VISIBILITY_NO_SILENT_SWALLOWING_GUARD_REPO_CATCH_CONTEXT_COUNT=${repoCatchContextCount}`);
console.log(`VOID_RUNTIME_ERROR_VISIBILITY_NO_SILENT_SWALLOWING_GUARD_NODE_CORE_CATCH_CONTEXT_COUNT=${nodeCoreCatchContextCount}`);
console.log(`VOID_RUNTIME_ERROR_VISIBILITY_NO_SILENT_SWALLOWING_GUARD_NODE_CORE_EMPTY_CATCH_COUNT=${nodeCoreLiteralEmptyCatchCount}`);
console.log(`VOID_RUNTIME_ERROR_VISIBILITY_NO_SILENT_SWALLOWING_GUARD_REPO_EMPTY_CATCH_COUNT=${repoLiteralEmptyCatchCount}`);

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_RUNTIME_ERROR_VISIBILITY_NO_SILENT_SWALLOWING_GUARD_V1_FAIL");
  process.exit(1);
}

console.log("VOID_RUNTIME_ERROR_VISIBILITY_NO_SILENT_SWALLOWING_GUARD_V1_GREEN");
