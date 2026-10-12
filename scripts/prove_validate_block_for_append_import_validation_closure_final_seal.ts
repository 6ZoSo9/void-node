import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

type Finding = Readonly<{
  id: string;
  ok: boolean;
  severity?: string;
  evidence?: string;
}>;

type PreflightReport = Readonly<{
  schema?: string;
  closureStatus?: string;
  blockerFailures?: readonly string[];
  warningFailures?: readonly string[];
  findings?: readonly Finding[];
}>;

type DiscoveryContext = Readonly<{
  index?: number;
  line?: number;
  column?: number;
  hasValidateBlockForAppendNearby?: boolean;
  hasExplicitInvalidImportedBlockNearby?: boolean;
  context?: string;
}>;

type DiscoveryReport = Readonly<{
  schema?: string;
  closureStatus?: string;
  literalSaveBlockCount?: number;
  unguardedLiteralSaveBlockCount?: number;
  contexts?: readonly DiscoveryContext[];
}>;

const readText = (path: string): string => {
  if (!existsSync(path)) throw new Error(`Missing required file: ${path}`);
  return readFileSync(path, "utf8");
};

const readJson = <T>(path: string): T => JSON.parse(readText(path)) as T;

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const requireFindingPass = (report: PreflightReport, id: string): void => {
  const finding = report.findings?.find((entry) => entry.id === id);
  assert(finding, `Missing preflight finding: ${id}`);
  assert(finding?.ok === true, `Expected preflight finding to pass: ${id}`);
};

const lineNumberForOffset = (text: string, offset: number): number => text.slice(0, offset).split("\n").length;

const contextForLine = (text: string, line: number, radius = 28): string => {
  const lines = text.split("\n");
  const start = Math.max(1, line - radius);
  const end = Math.min(lines.length, line + radius);
  return lines.slice(start - 1, end).join("\n");
};

const extractValidateBlockForAppendBody = (source: string): string => {
  const signatureIndex = source.indexOf("validateBlockForAppend");
  assert(signatureIndex >= 0, "validateBlockForAppend symbol not found in block source");
  const openBrace = source.indexOf("{", signatureIndex);
  assert(openBrace >= 0, "Could not find validateBlockForAppend opening brace");

  let depth = 0;
  for (let i = openBrace; i < source.length; i++) {
    const char = source[i];
    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(openBrace, i + 1);
    }
  }
  throw new Error("Could not extract validateBlockForAppend body");
};

const nodeCore = readText("src/node_core.ts");
const blockSource = readText("src/chain/block.ts");
const importPersistenceDoc = readText("docs/security/validate-block-for-append-import-persistence-closure-v1.md");
const preflight = readJson<PreflightReport>(
  "docs/security/validate-block-for-append-import-validation-closure-preflight-report-v1.json",
);
const discovery = readJson<DiscoveryReport>(
  "docs/security/validate-block-for-append-saveblock-context-discovery-v2-report.json",
);

assert(
  existsSync("scripts/prove_peer_block_import_validation_boundary.ts"),
  "Peer import validation proof script is missing",
);
assert(
  existsSync("scripts/prove_validate_block_for_append_import_persistence_closure.ts"),
  "Import persistence closure proof script is missing",
);

assert(
  preflight.schema === "VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_VALIDATION_CLOSURE_PREFLIGHT_REPORT_V1",
  "Unexpected preflight report schema",
);
assert(preflight.closureStatus === "STATIC_PREFLIGHT_BLOCKED", "Preflight report should record prior blocked status");
assert(
  preflight.blockerFailures?.length === 1 &&
    preflight.blockerFailures[0] === "pullOnce-saveBlock-src/node_core.ts-1-guarded",
  "Preflight blocker set must be exactly the first saveBlock guard finding",
);

for (const findingId of [
  "block-source-present",
  "validateBlockForAppend-present",
  "validateBlockForAppend-body-extracted",
  "parent-aware",
  "explicit-rejection-path",
  "parent-hash-linkage",
  "height-continuity",
  "block-identity-hash",
  "roots-commitments",
  "signature-proposer-authority",
  "broader-block-validation-delegation",
  "pullOnce-saveBlock-files-found",
  "pullOnce-saveBlock-src/node_core.ts-2-guarded",
  "pullOnce-saveBlock-src/node_core.ts-3-guarded",
  "peer-import-proof-script-present",
]) {
  requireFindingPass(preflight, findingId);
}

assert(
  discovery.schema === "VOID_VALIDATE_BLOCK_FOR_APPEND_SAVEBLOCK_CONTEXT_DISCOVERY_V2_REPORT",
  "Unexpected saveBlock context discovery report schema",
);
assert(discovery.closureStatus === "CONTEXT_DISCOVERY_READY", "SaveBlock context discovery must be ready");
assert(discovery.literalSaveBlockCount === 3, "Expected exactly three literal this.store.saveBlock call sites");
assert(discovery.unguardedLiteralSaveBlockCount === 1, "Expected exactly one unguarded literal saveBlock call site");
assert(Array.isArray(discovery.contexts) && discovery.contexts.length === 3, "Expected three discovery contexts");

const saveBlockMatches = [...nodeCore.matchAll(/this\.store\.saveBlock\s*\(/g)];
assert(saveBlockMatches.length === 3, `Expected 3 literal saveBlock calls in src/node_core.ts; got ${saveBlockMatches.length}`);

const sourceContexts = saveBlockMatches.map((match, index) => {
  const line = lineNumberForOffset(nodeCore, match.index ?? 0);
  const context = contextForLine(nodeCore, line);
  const hasValidateBlockForAppendNearby = context.includes("validateBlockForAppend");
  const hasExplicitInvalidImportedBlockNearby = /invalid imported (fill )?block/.test(context);
  const hasLocalProductionSignals =
    context.includes("signBytes(this.priv") &&
    context.includes("proposer: this.id") &&
    context.includes("proposerPubkey: this.pubPEM") &&
    context.includes("const b: Block");
  return {
    index: index + 1,
    line,
    context,
    hasValidateBlockForAppendNearby,
    hasExplicitInvalidImportedBlockNearby,
    hasLocalProductionSignals,
  };
});

const localProductionSaves = sourceContexts.filter(
  (entry) => !entry.hasValidateBlockForAppendNearby && entry.hasLocalProductionSignals,
);
const importedPersistenceSaves = sourceContexts.filter(
  (entry) => entry.hasValidateBlockForAppendNearby && entry.hasExplicitInvalidImportedBlockNearby,
);

assert(localProductionSaves.length === 1, "Expected exactly one unguarded local-production saveBlock call");
assert(importedPersistenceSaves.length === 2, "Expected exactly two guarded imported-persistence saveBlock calls");
assert(
  localProductionSaves[0].line < importedPersistenceSaves[0].line,
  "Local production saveBlock should precede peer import persistence contexts",
);

const validateBlockBody = extractValidateBlockForAppendBody(blockSource);
const validateBlockBodyLower = validateBlockBody.toLowerCase();
assert(validateBlockBody.length > 1000, "validateBlockForAppend body is unexpectedly small");
for (const token of ["parent", "parenthash", "number", "txroot", "blobroot", "proposer", "sig"]) {
  assert(validateBlockBodyLower.includes(token), `validateBlockForAppend body is missing expected token: ${token}`);
}

assert(
  importPersistenceDoc.includes("local block production") || importPersistenceDoc.includes("LOCAL_SAVEBLOCK"),
  "Import persistence closure doc must record local-production distinction",
);

console.log(
  `VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_VALIDATION_CLOSURE_FINAL_SEAL_NODE_CORE_SHA256=${sha256(nodeCore)}`,
);
console.log(
  `VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_VALIDATION_CLOSURE_FINAL_SEAL_BLOCK_SOURCE_SHA256=${sha256(blockSource)}`,
);
console.log(
  `VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_VALIDATION_CLOSURE_FINAL_SEAL_LOCAL_SAVEBLOCK_LINE=${localProductionSaves[0].line}`,
);
console.log(
  `VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_VALIDATION_CLOSURE_FINAL_SEAL_IMPORTED_SAVEBLOCK_LINES=${importedPersistenceSaves.map((entry) => entry.line).join(",")}`,
);
console.log("VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_VALIDATION_CLOSURE_FINAL_SEAL_AUDIT_V1_GREEN");
