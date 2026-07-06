import { existsSync, readFileSync } from "node:fs";

const NODE_CORE = "src/node_core.ts";
const BLOCK_SOURCE = "src/chain/block.ts";

function fail(message: string): never {
  throw new Error(`VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_PERSISTENCE_CLOSURE_V1_FAIL: ${message}`);
}

function lineCol(source: string, index: number): { line: number; col: number } {
  const before = source.slice(0, index);
  const parts = before.split(/\r?\n/);
  return { line: parts.length, col: parts[parts.length - 1].length + 1 };
}

function lineWindow(lines: readonly string[], line: number, before: number, after: number): string {
  const start = Math.max(1, line - before);
  const end = Math.min(lines.length, line + after);
  const selected: string[] = [];
  for (let i = start; i <= end; i++) selected.push(`${String(i).padStart(5, " ")}: ${lines[i - 1]}`);
  return selected.join("\n");
}

function priorWindow(lines: readonly string[], line: number, before: number): string {
  const start = Math.max(1, line - before);
  const end = Math.max(1, line - 1);
  const selected: string[] = [];
  for (let i = start; i <= end; i++) selected.push(lines[i - 1]);
  return selected.join("\n");
}

function assertContains(haystack: string, needle: string, label: string): void {
  if (!haystack.includes(needle)) fail(`${label}: missing ${needle}`);
}

if (!existsSync(NODE_CORE)) fail(`${NODE_CORE} missing`);
if (!existsSync(BLOCK_SOURCE)) fail(`${BLOCK_SOURCE} missing`);

const nodeCore = readFileSync(NODE_CORE, "utf8");
const blockSource = readFileSync(BLOCK_SOURCE, "utf8");

if (!/export\s+function\s+validateBlockForAppend\b|export\s+const\s+validateBlockForAppend\b/.test(blockSource)) {
  fail("validateBlockForAppend is not visibly exported from src/chain/block.ts");
}

const lines = nodeCore.split(/\r?\n/);
const matches = [...nodeCore.matchAll(/this\.store\.saveBlock\s*\(([^)]*)\)/g)];
if (matches.length !== 3) fail(`expected exactly 3 literal this.store.saveBlock call sites, got ${matches.length}`);

type Classified = Readonly<{
  line: number;
  col: number;
  arg: string;
  localProduction: boolean;
  importedPersistence: boolean;
  hasValidateGuard: boolean;
  hasExplicitImportFailure: boolean;
}>;

const classified: Classified[] = matches.map((match) => {
  const idx = match.index ?? 0;
  const lc = lineCol(nodeCore, idx);
  const context = lineWindow(lines, lc.line, 35, 28);
  const before = priorWindow(lines, lc.line, 55);
  const arg = String(match[1] ?? "").trim();
  const localProduction =
    context.includes("const sig = signBytes(this.priv") &&
    context.includes("const b: Block") &&
    context.includes("proposer: this.id") &&
    context.includes("proposerPubkey: this.pubPEM") &&
    context.includes("txRoot: roots.txRoot") &&
    context.includes("blobRoot: roots.blobRoot");
  const hasValidateGuard = before.includes("validateBlockForAppend(");
  const hasExplicitImportFailure =
    before.includes('reason: "invalid imported block"') || before.includes('reason: "invalid imported fill block"');
  const importedPersistence = hasExplicitImportFailure || hasValidateGuard;
  return {
    line: lc.line,
    col: lc.col,
    arg,
    localProduction,
    importedPersistence,
    hasValidateGuard,
    hasExplicitImportFailure,
  };
});

const localSites = classified.filter((site) => site.localProduction);
if (localSites.length !== 1) fail(`expected exactly one local-production saveBlock site, got ${localSites.length}`);
const local = localSites[0];
if (local.hasValidateGuard) fail("local-production saveBlock unexpectedly classified as validateBlockForAppend-gated import path");
if (local.hasExplicitImportFailure) fail("local-production saveBlock unexpectedly has imported-block failure reason nearby");
if (local.line > 760) fail(`local-production saveBlock line appears outside expected production region: ${local.line}`);

const importSites = classified.filter((site) => !site.localProduction);
if (importSites.length !== 2) fail(`expected exactly two imported peer persistence saveBlock sites, got ${importSites.length}`);
for (const site of importSites) {
  if (!site.hasValidateGuard) fail(`import persistence saveBlock at ${site.line}:${site.col} missing validateBlockForAppend guard`);
  if (!site.hasExplicitImportFailure) fail(`import persistence saveBlock at ${site.line}:${site.col} missing explicit invalid imported-block failure reason`);
  if (site.line < 800) fail(`import persistence saveBlock at ${site.line}:${site.col} appears outside pullOnce import region`);
}

const directImport = importSites.find((site) => site.arg === "b");
const fillImport = importSites.find((site) => site.arg === "merged");
if (!directImport) fail("missing direct imported-block saveBlock(b) site");
if (!fillImport) fail("missing imported fill saveBlock(merged) site");

assertContains(nodeCore, 'reason: "invalid imported block"', "direct imported-block rejection");
assertContains(nodeCore, 'reason: "invalid imported fill block"', "fill imported-block rejection");
assertContains(nodeCore, "validateBlockForAppend(b", "validateBlockForAppend call against imported block");

console.log(`VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_PERSISTENCE_CLOSURE_LOCAL_SAVEBLOCK_LINE=${local.line}`);
console.log(`VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_PERSISTENCE_CLOSURE_IMPORTED_SAVEBLOCK_LINES=${importSites.map((s) => s.line).join(",")}`);
console.log("VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_PERSISTENCE_CLOSURE_AUDIT_V1_GREEN");
