import fs from "node:fs";
import crypto from "node:crypto";

type Entry = {
  id: string;
  file: string;
  line: number;
  text: string;
  classification: string;
  sideEffectSilentCatch: boolean;
  importSideEffectSilentCatch: boolean;
  context: string[];
};

type Finding = {
  id: string;
  status: "PASS" | "FAIL";
  detail: string;
};

const file = "src/node_core.ts";
const reportJson = "docs/security/silent-catch-classification-registry-v1-report.json";
const reportMd = "docs/security/silent-catch-classification-registry-v1-report.md";
const expectedLines = [257, 472, 867, 878, 889, 899, 1048];

const source = fs.readFileSync(file, "utf8");
const lines = source.split(/\r?\n/);

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function context(lineIndex: number, radius = 7): string[] {
  const start = Math.max(0, lineIndex - radius);
  const end = Math.min(lines.length, lineIndex + radius + 1);
  return lines.slice(start, end).map((line, offset) => `${start + offset + 1}: ${line}`);
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

function classify(lineIndex: number): {
  classification: string;
  sideEffectSilentCatch: boolean;
  importSideEffectSilentCatch: boolean;
} {
  const block = immediateTryBlock(lineIndex);
  const ctx = context(lineIndex, 16).join("\n");

  const sideEffectSilentCatch =
    block.includes("this.txIndex.putMany(refs)") ||
    block.includes("buildKidxForJsonl") ||
    (block.includes("anyReceipts") && (block.includes("appendMany") || block.includes("append(")));

  const importSideEffectSilentCatch =
    sideEffectSilentCatch &&
    (block.includes("String(tx.hash)") ||
      ctx.includes("imported++") ||
      ctx.includes("existingHasTxs") ||
      ctx.includes("incomingHasTxs"));

  if (sideEffectSilentCatch) {
    return {
      classification: "blocked-side-effect-write-silent-catch",
      sideEffectSilentCatch,
      importSideEffectSilentCatch,
    };
  }

  if (block.includes("mempool") || ctx.includes("mempool")) {
    return {
      classification: "optional-mempool-best-effort",
      sideEffectSilentCatch,
      importSideEffectSilentCatch,
    };
  }

  if (block.includes("loadBlock") || ctx.includes("loadBlock")) {
    return {
      classification: "optional-block-load-probe",
      sideEffectSilentCatch,
      importSideEffectSilentCatch,
    };
  }

  if (ctx.includes("publishJson") || ctx.includes("peer") || ctx.includes("socket") || ctx.includes("broadcast")) {
    return {
      classification: "optional-network-or-notification-path",
      sideEffectSilentCatch,
      importSideEffectSilentCatch,
    };
  }

  return {
    classification: "cataloged-remaining-non-side-effect-silent-catch",
    sideEffectSilentCatch,
    importSideEffectSilentCatch,
  };
}

const catchIndexes = lines
  .map((line, index) => ({ line, index }))
  .filter(({ line }) => line.includes("} catch {}"))
  .map(({ index }) => index);

const actualLines = catchIndexes.map((index) => index + 1);

const entries: Entry[] = catchIndexes.map((lineIndex, i) => {
  const c = classify(lineIndex);
  return {
    id: `silent-catch-${String(i + 1).padStart(2, "0")}`,
    file,
    line: lineIndex + 1,
    text: lines[lineIndex].trim(),
    classification: c.classification,
    sideEffectSilentCatch: c.sideEffectSilentCatch,
    importSideEffectSilentCatch: c.importSideEffectSilentCatch,
    context: context(lineIndex),
  };
});

const sideEffectSilentCatchCount = entries.filter((e) => e.sideEffectSilentCatch).length;
const importSideEffectSilentCatchCount = entries.filter((e) => e.importSideEffectSilentCatch).length;
const blockedCount = entries.filter((e) => e.classification === "blocked-side-effect-write-silent-catch").length;
const classificationCounts = entries.reduce<Record<string, number>>((acc, entry) => {
  acc[entry.classification] = (acc[entry.classification] ?? 0) + 1;
  return acc;
}, {});

const findings: Finding[] = [
  {
    id: "literal-silent-catch-baseline",
    status: entries.length === expectedLines.length ? "PASS" : "FAIL",
    detail: `actual=${entries.length}, expected=${expectedLines.length}`,
  },
  {
    id: "silent-catch-lines-match-baseline",
    status: JSON.stringify(actualLines) === JSON.stringify(expectedLines) ? "PASS" : "FAIL",
    detail: `actual=${actualLines.join(",")}; expected=${expectedLines.join(",")}`,
  },
  {
    id: "side-effect-silent-catches-remain-closed",
    status: sideEffectSilentCatchCount === 0 ? "PASS" : "FAIL",
    detail: `sideEffectSilentCatchCount=${sideEffectSilentCatchCount}`,
  },
  {
    id: "import-side-effect-silent-catches-remain-closed",
    status: importSideEffectSilentCatchCount === 0 ? "PASS" : "FAIL",
    detail: `importSideEffectSilentCatchCount=${importSideEffectSilentCatchCount}`,
  },
  {
    id: "no-blocked-classifications",
    status: blockedCount === 0 ? "PASS" : "FAIL",
    detail: `blockedCount=${blockedCount}`,
  },
];

const report = {
  generated_at: "1970-01-01T00:00:00.000Z",
  marker: "VOID_SILENT_CATCH_CLASSIFICATION_REGISTRY_V1_GREEN",
  node_core_sha256: sha256(source),
  silent_catch_count: entries.length,
  expected_silent_catch_lines: expectedLines,
  actual_silent_catch_lines: actualLines,
  side_effect_silent_catch_count: sideEffectSilentCatchCount,
  import_side_effect_silent_catch_count: importSideEffectSilentCatchCount,
  classification_counts: classificationCounts,
  findings,
  entries,
};

const md = [
  "# silent catch classification registry v1",
  "",
  "- generated_at: 1970-01-01T00:00:00.000Z",
  `- marker: ${report.marker}`,
  `- node_core_sha256: ${report.node_core_sha256}`,
  `- silent_catch_count: ${report.silent_catch_count}`,
  `- side_effect_silent_catch_count: ${report.side_effect_silent_catch_count}`,
  `- import_side_effect_silent_catch_count: ${report.import_side_effect_silent_catch_count}`,
  "",
  "## Classification counts",
  "",
  ...Object.entries(classificationCounts).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `- ${k}: ${v}`),
  "",
  "## Findings",
  "",
  ...findings.map((f) => `- [${f.status}] ${f.id}: ${f.detail}`),
  "",
  "## Entries",
  "",
  ...entries.flatMap((entry) => [
    `### ${entry.id}`,
    "",
    `- file: ${entry.file}`,
    `- line: ${entry.line}`,
    `- text: \`${entry.text.replaceAll("`", "\\`")}\``,
    `- classification: ${entry.classification}`,
    `- sideEffectSilentCatch: ${entry.sideEffectSilentCatch}`,
    `- importSideEffectSilentCatch: ${entry.importSideEffectSilentCatch}`,
    "",
    "```ts",
    ...entry.context,
    "```",
    "",
  ]),
].join("\n");

fs.writeFileSync(reportJson, JSON.stringify(report, null, 2) + "\n");
fs.writeFileSync(reportMd, md + "\n");

console.log(`VOID_SILENT_CATCH_CLASSIFICATION_REGISTRY_NODE_CORE_SHA256=${report.node_core_sha256}`);
console.log(`VOID_SILENT_CATCH_CLASSIFICATION_REGISTRY_SILENT_CATCH_COUNT=${entries.length}`);
console.log(`VOID_SILENT_CATCH_CLASSIFICATION_REGISTRY_SIDE_EFFECT_SILENT_CATCH_COUNT=${sideEffectSilentCatchCount}`);
console.log(`VOID_SILENT_CATCH_CLASSIFICATION_REGISTRY_IMPORT_SIDE_EFFECT_SILENT_CATCH_COUNT=${importSideEffectSilentCatchCount}`);

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (findings.some((f) => f.status === "FAIL")) {
  console.error("VOID_SILENT_CATCH_CLASSIFICATION_REGISTRY_V1_FAIL");
  process.exit(1);
}

console.log("VOID_SILENT_CATCH_CLASSIFICATION_REGISTRY_V1_GREEN");
