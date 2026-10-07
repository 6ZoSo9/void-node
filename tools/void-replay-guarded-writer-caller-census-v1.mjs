#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

export const VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_V1 =
  "VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_V1";
export const VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_AUTHORITY_V1 = Object.freeze({
  git_tracked_source_only: true,
  direct_writer_import_census: true,
  typescript_ast_parser: true,
  unexpected_runtime_writer_imports_hold: true,
  unguarded_exports_still_present: true,
  executable_import_closure_proven: false,
  runtime_guard_exclusivity_proven: false,
  authenticated_ssh_transport_performed: false,
  runtime_service_installed: false,
  witness_or_replay_mutation: false,
  wallet_signer_or_funds_access: false,
  chain_or_market_mutation: false,
  production_gate_ready: false,
});
const WRITER_BASENAME = "buy_void_allocation_custody_witness_live_read_replay_writer_v1";
const WRITER_PATH = "src/economic/" + WRITER_BASENAME + ".ts";
const LEGACY = Object.freeze([
  "persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1",
  "persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1",
]);
const ALLOWED_MARKERS = Object.freeze([
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1",
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1",
]);
const PROOF_RUNTIME_IMPORTS = Object.freeze([
  "scripts/prove_buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts",
  "scripts/prove_buy_void_allocation_custody_witness_live_read_replay_composition_v1.ts",
  "scripts/prove_buy_void_allocation_custody_witness_live_read_replay_guarded_compare_writer_v1.ts",
]);
const SOURCE_EXTENSION = /\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/u;
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;

function sha256(value) {
  return "sha256:" + crypto.createHash("sha256").update(value).digest("hex");
}
function writerSpecifier(value) {
  if (typeof value !== "string" || !value.includes(WRITER_BASENAME)) return false;
  // Reject aliases/queries too. The scanner need not resolve them to safely HOLD.
  return true;
}
function assertPath(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._/-]{1,500}$/u.test(value) ||
      value.startsWith("/") || value.split("/").includes("..")) {
    throw new Error("guarded_replay_census_source_path_invalid");
  }
}
function scriptKind(name) {
  if (/\.tsx$/u.test(name)) return ts.ScriptKind.TSX;
  if (/\.(?:jsx)$/u.test(name)) return ts.ScriptKind.JSX;
  if (/\.(?:tsx?|mts|cts)$/u.test(name)) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}
function staticReference(specifier, node, file, valueNames = null, typeOnly = false, classification = "static-import") {
  if (!writerSpecifier(specifier)) return null;
  const allowedTest = PROOF_RUNTIME_IMPORTS.includes(file);
  if (typeOnly) return Object.freeze({ kind: "type_only", classification, names: valueNames || [], specifier });
  if (allowedTest) return Object.freeze({ kind: "proof_fixture_only", classification, names: valueNames || [], specifier });
  if (classification === "static-import" && valueNames && valueNames.length > 0 &&
      valueNames.every(name => ALLOWED_MARKERS.includes(name))) {
    return Object.freeze({ kind: "marker_only", classification, names: valueNames, specifier });
  }
  return Object.freeze({ kind: "forbidden", classification, names: valueNames || [], specifier });
}

/** Static, source-only census; not proof of a protected runtime import graph. */
export function inspectVoidReplayWriterCallerSourceV1(file, contents) {
  assertPath(file);
  if (typeof contents !== "string" || Buffer.byteLength(contents, "utf8") > MAX_SOURCE_BYTES) {
    throw new Error("guarded_replay_census_source_bytes_invalid");
  }
  const parsed = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, scriptKind(file));
  if (parsed.parseDiagnostics.length > 0) throw new Error("guarded_replay_census_source_parse_invalid");
  const refs = [];
  function push(ref) { if (ref) refs.push(ref); }
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const clause = node.importClause;
      let typeOnly = Boolean(clause?.isTypeOnly);
      const bindings = clause?.namedBindings;
      const names = [];
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) names.push(element.propertyName?.text ?? element.name.text);
        if (bindings.elements.length && bindings.elements.every(x => x.isTypeOnly) &&
            !clause?.name) typeOnly = true;
      }
      // Side-effect, namespace and default imports have no named-value allowlist.
      const namedOnly = Boolean(clause && !clause.name && bindings && ts.isNamedImports(bindings));
      push(staticReference(node.moduleSpecifier.text, node, file,
        namedOnly ? names : null, typeOnly));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier &&
               ts.isStringLiteralLike(node.moduleSpecifier)) {
      const names = [];
      const bindings = node.exportClause;
      let typeOnly = Boolean(node.isTypeOnly);
      if (bindings && ts.isNamedExports(bindings)) {
        for (const element of bindings.elements) names.push(element.propertyName?.text ?? element.name.text);
        if (bindings.elements.length && bindings.elements.every(x => x.isTypeOnly)) typeOnly = true;
      }
      push(staticReference(node.moduleSpecifier.text, node, file, names, typeOnly, "reexport"));
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) &&
               node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
      push(staticReference(node.moduleReference.expression.text, node, file, null, Boolean(node.isTypeOnly), "import-equals"));
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
               (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      const first = node.arguments[0];
      if (first && ts.isStringLiteralLike(first)) {
        push(staticReference(first.text, node, file, null, false, "dynamic-loader"));
      } else if (first?.getText(parsed).includes(WRITER_BASENAME)) {
        push(Object.freeze({kind: "forbidden", classification: "computed-loader", names: [], specifier: "<computed>"}));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  let legacyExports = null;
  if (file === WRITER_PATH) {
    const names = new Set();
    for (const statement of parsed.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name &&
          statement.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) names.add(statement.name.text);
    }
    legacyExports = LEGACY.map(name => ({ name, present: names.has(name) }));
  }
  return Object.freeze({ file, references: refs, legacy_exports: legacyExports });
}

export function classifyVoidReplayWriterCallerCensusV1(sources) {
  if (!Array.isArray(sources) || sources.length < 1) throw new Error("guarded_replay_census_sources_invalid");
  const records = [];
  let prior = "";
  for (const item of sources) {
    if (!item || Object.getPrototypeOf(item) !== Object.prototype) throw new Error("guarded_replay_census_item_invalid");
    assertPath(item.file);
    if (item.file <= prior) throw new Error("guarded_replay_census_file_order_or_duplicate");
    prior = item.file;
    records.push(inspectVoidReplayWriterCallerSourceV1(item.file, item.contents));
  }
  const legacy = records.find(x => x.file === WRITER_PATH)?.legacy_exports;
  const unexpected = records.flatMap(record => record.references
    .filter(ref => ref.kind === "forbidden")
    .map(ref => ({ file: record.file, classification: ref.classification, names: ref.names, specifier: ref.specifier })));
  const callerRecords = records.filter(record => record.references.length).map(record => ({
    file: record.file,
    categories: record.references.map(ref => ref.kind),
    classifications: record.references.map(ref => ref.classification),
  }));
  const body = {
    marker: VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_V1,
    status: unexpected.length ? "HOLD_UNREVIEWED_WRITER_CALLER" : "SOURCE_ONLY_CENSUS",
    tracked_source_files_observed: records.length,
    writer_legacy_unguarded_exports_still_present: Boolean(legacy?.every(x => x.present)),
    writer_legacy_export_names_verified: legacy !== undefined,
    caller_records: callerRecords,
    unexpected_writer_imports: unexpected,
    runtime_guard_exclusivity_proven: false,
    executable_import_closure_proven: false,
    trusted_ssh_callback_exclusive: false,
    production_gate_ready: false,
    authority: VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_AUTHORITY_V1,
  };
  return Object.freeze({...body, receipt_sha256: sha256(JSON.stringify(body))});
}

function trackedSourceFiles(root) {
  const raw = execFileSync("/usr/bin/git", ["-C", root, "ls-files", "-z"],
    { encoding: "buffer", maxBuffer: 16 * 1024 * 1024, timeout: 15_000 });
  const entries = raw.toString("utf8").split("\0").filter(Boolean).filter(x => SOURCE_EXTENSION.test(x));
  if (!entries.length || entries.length > 25_000) throw new Error("guarded_replay_census_tracked_sources_unavailable");
  const sources = [];
  for (const rel of [...new Set(entries)].sort()) {
    assertPath(rel);
    const full = path.join(root, rel);
    const meta = fs.lstatSync(full);
    if (!meta.isFile() || meta.isSymbolicLink() || meta.size > MAX_SOURCE_BYTES) {
      throw new Error("guarded_replay_census_tracked_source_not_regular");
    }
    sources.push({ file: rel, contents: fs.readFileSync(full, "utf8") });
  }
  return sources;
}

function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--scan") {
    process.stderr.write("HOLD: only --scan is supported; no execution/deployment mode.\n");
    process.exitCode = 2;
    return;
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = classifyVoidReplayWriterCallerCensusV1(trackedSourceFiles(root));
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (result.status !== "SOURCE_ONLY_CENSUS" || !result.writer_legacy_export_names_verified ||
      !result.writer_legacy_unguarded_exports_still_present) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try { main(); } catch (error) {
    process.stderr.write("VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_V1_HOLD " +
      String(error?.message || error) + "\n");
    process.exitCode = 2;
  }
}
