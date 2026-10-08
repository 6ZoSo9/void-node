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
const MAX_STATIC_SPECIFIER_BYTES = 4 * 1024;
const MAX_STATIC_EXPRESSION_DEPTH = 24;

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

// Fold only side-effect-free, statically decidable string expressions.
// Never execute eval, loaders, property getters or arbitrary source code.
// Build lexical bindings without merging identical identifiers in sibling
// functions or nested blocks. No code is executed and no type inference is
// attempted: only const initializers with a unique lexical binding can fold.
function lexicalBindings(parsed) {
  const byScope = new Map();
  function lexicalScope(node) {
    return ts.isSourceFile(node) || ts.isBlock(node) ||
      ts.isModuleBlock(node) || ts.isCaseBlock(node) ||
      ts.isForStatement(node) || ts.isForInStatement(node) ||
      ts.isForOfStatement(node) || ts.isFunctionLike(node) ||
      ts.isClassExpression(node) || ts.isCatchClause(node) ||
      (typeof ts.isClassStaticBlockDeclaration === "function" &&
       ts.isClassStaticBlockDeclaration(node));
  }
  function parentScope(node, functionScoped = false) {
    for (let p = node.parent; p; p = p.parent) {
      if (functionScoped) {
        if (ts.isFunctionLike(p) || ts.isSourceFile(p) || ts.isModuleBlock(p) ||
            (typeof ts.isClassStaticBlockDeclaration === "function" &&
             ts.isClassStaticBlockDeclaration(p))) return p;
      } else if (lexicalScope(p)) return p;
    }
    return null;
  }
  function add(scope, name, declaration, initializer = null, form = "lexical") {
    if (!scope || !name) return;
    let entries = byScope.get(scope);
    if (!entries) {
      entries = new Map();
      byScope.set(scope, entries);
    }
    const prior = entries.get(name);
    if (prior) {
      // var/function/parameter redeclarations can be multiple declarations
      // of ONE legal function-scoped binding. None is a foldable const.
      // Other duplicates remain conservatively ambiguous.
      if (prior.form === "hoistable" && form === "hoistable") {
        entries.set(name, Object.freeze({kind: "unknown", form: "hoistable"}));
      } else {
        entries.set(name, Object.freeze({kind: "ambiguous", form: "ambiguous"}));
      }
      return;
    }
    entries.set(name, Object.freeze({
      kind: form === "const" && initializer ? "const" : "unknown",
      form,
      declaration,
      initializer,
    }));
  }

  function namesFromBinding(name, result = []) {
    if (ts.isIdentifier(name)) {
      result.push(name.text);
    } else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) {
        if (ts.isBindingElement(element)) namesFromBinding(element.name, result);
      }
    }
    return result;
  }
  function recordUnknown(scope, nameNode, declaration, form = "lexical") {
    if (nameNode) for (const name of namesFromBinding(nameNode)) {
      add(scope, name, declaration, null, form);
    }
  }
  function visit(node) {
    if (ts.isVariableDeclarationList(node)) {
      const isConst = (node.flags & ts.NodeFlags.Const) !== 0;
      const isVar = (node.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) === 0;
      const scope = parentScope(node, isVar);
      for (const declaration of node.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          add(scope, declaration.name.text, declaration,
            isConst ? declaration.initializer : null,
            isConst ? "const" : isVar ? "hoistable" : "lexical");
        } else {
          recordUnknown(scope, declaration.name, declaration,
            isVar ? "hoistable" : "lexical");
        }
      }
    }
    if (ts.isFunctionLike(node)) {
      for (const parameter of node.parameters || []) {
        recordUnknown(node, parameter.name, parameter, "hoistable");
      }
    }
    // A named function expression has an inner name environment. Function
    // parameters shadow that name in the body; a same-spelled parameter is
    // NOT a duplicate/conflicting lexical declaration.
    if (ts.isFunctionExpression(node) && node.name &&
        !byScope.get(node)?.has(node.name.text)) {
      add(node, node.name.text, node);
    }
    // Similarly, a named class expression creates a local binding for its
    // own body and static blocks; it does not bind the outer module object.
    if (ts.isClassExpression(node) && node.name) {
      add(node, node.name.text, node);
    }
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      recordUnknown(node, node.variableDeclaration.name, node.variableDeclaration);
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      add(parentScope(node), node.name.text, node, null, "hoistable");
    }
    if (ts.isClassDeclaration(node) && node.name) {
      add(parentScope(node), node.name.text, node);
    }
    if (ts.isImportDeclaration(node) && node.importClause) {
      const scope = parentScope(node);
      const clause = node.importClause;
      if (clause.name) add(scope, clause.name.text, clause);
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        add(scope, bindings.name.text, bindings);
      } else if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const fromNodeModule = ts.isStringLiteralLike(node.moduleSpecifier) &&
            node.moduleSpecifier.text === "node:module" &&
            (element.propertyName?.text ?? element.name.text) === "createRequire";
          add(scope, element.name.text, element, null,
            fromNodeModule ? "node-create-require-import" : "lexical");
        }
      }
    }
    if (ts.isImportEqualsDeclaration(node)) add(parentScope(node), node.name.text, node);
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  return function resolveIdentifier(identifier) {
    for (let p = identifier.parent; p; p = p.parent) {
      if (lexicalScope(p)) {
        const binding = byScope.get(p)?.get(identifier.text);
        if (binding) return binding;
      }
    }
    return null;
  };
}

function staticStringValue(node, resolveBinding, depth = 0, active = new Set(), limit = { hit: false }) {
  if (!node) return null;
  if (depth >= MAX_STATIC_EXPRESSION_DEPTH) {
    // This is inconclusive, not a proof the import path is safe.
    limit.hit = true;
    return null;
  }
  if (ts.isStringLiteralLike(node)) {
    return Buffer.byteLength(node.text, "utf8") <= MAX_STATIC_SPECIFIER_BYTES
      ? node.text : null;
  }
  const next = expr => staticStringValue(expr, resolveBinding, depth + 1, active, limit);
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) ||
      (typeof ts.isSatisfiesExpression === "function" && ts.isSatisfiesExpression(node))) {
    return next(node.expression);
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = next(node.left);
    const right = next(node.right);
    if (left === null || right === null) return null;
    const value = left + right;
    return Buffer.byteLength(value, "utf8") <= MAX_STATIC_SPECIFIER_BYTES ? value : null;
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const middle = next(span.expression);
      if (middle === null) return null;
      value += middle + span.literal.text;
      if (Buffer.byteLength(value, "utf8") > MAX_STATIC_SPECIFIER_BYTES) return null;
    }
    return value;
  }
  if (ts.isIdentifier(node)) {
    const binding = resolveBinding(node);
    if (binding?.kind !== "const" || active.has(binding.declaration)) return null;
    active.add(binding.declaration);
    const value = next(binding.initializer);
    active.delete(binding.declaration);
    return value;
  }
  return null;
}

function hasAmbiguousLexicalBinding(node, resolveBinding) {
  if (!node) return false;
  let ambiguous = false;
  const visit = expr => {
    if (ambiguous) return;
    if (ts.isIdentifier(expr) && resolveBinding(expr)?.kind === "ambiguous") {
      ambiguous = true;
      return;
    }
    ts.forEachChild(expr, visit);
  };
  visit(node);
  return ambiguous;
}

function unwrapStaticExpression(node) {
  while (node && (ts.isParenthesizedExpression(node) ||
         ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) ||
         ts.isNonNullExpression(node) ||
         (typeof ts.isSatisfiesExpression === "function" && ts.isSatisfiesExpression(node)))) {
    node = node.expression;
  }
  return node;
}

// A const-alias chain leading back to an actual imported node:module
// createRequire factory is safe to *classify* without calling anything.
// A locally declared same-name function is never promoted to a loader.
function isImportedCreateRequireFactory(binding, resolveBinding, active = new Set()) {
  if (!binding) return false;
  if (binding.form === "node-create-require-import") return true;
  if (binding.kind !== "const" || !binding.initializer ||
      active.has(binding.declaration)) return false;
  // Exhaustion is inconclusive, never a proof that an imported factory is
  // absent. Null propagates to the loader caller, which HOLDS if the module
  // argument statically resolves to this protected writer.
  if (active.size >= MAX_STATIC_EXPRESSION_DEPTH) return null;
  active.add(binding.declaration);
  const initializer = unwrapStaticExpression(binding.initializer);
  const recognized = ts.isIdentifier(initializer) &&
    isImportedCreateRequireFactory(resolveBinding(initializer), resolveBinding, active);
  active.delete(binding.declaration);
  return recognized;
}

function isRecognizedCreateRequire(binding, resolveBinding, active = new Set()) {
  if (binding?.kind !== "const" || !binding.initializer ||
      active.has(binding.declaration)) return false;
  // A bounded alias traversal cannot infer "not a loader" at its cap.
  // Null means INDETERMINATE and is treated as a possible loader only when
  // the argument resolves to the protected writer.
  if (active.size >= MAX_STATIC_EXPRESSION_DEPTH) return null;
  active.add(binding.declaration);
  const initializer = unwrapStaticExpression(binding.initializer);
  let recognized = false;
  if (initializer && ts.isCallExpression(initializer)) {
    // This call returns a require loader only if its callee is the reviewed
    // node:module factory itself, or a statically resolved const alias of it.
    const factory = unwrapStaticExpression(initializer.expression);
    if (ts.isIdentifier(factory)) {
      recognized = isImportedCreateRequireFactory(resolveBinding(factory), resolveBinding);
    }
  } else if (initializer && ts.isIdentifier(initializer)) {
    // Constant aliases of an already recognized loader remain loaders.
    recognized = isRecognizedCreateRequire(resolveBinding(initializer), resolveBinding, active);
  }
  active.delete(binding.declaration);
  return recognized;
}

function isModuleLoaderExpression(expression, resolveBinding) {
  if (expression.kind === ts.SyntaxKind.ImportKeyword) return true;
  if (ts.isIdentifier(expression)) {
    const binding = resolveBinding(expression);
    // Unshadowed require() is CommonJS; a locally bound parameter or
    // unrelated function is not. The alias to a genuine node:module
    // createRequire result is the one narrow recognized exception.
    return (expression.text === "require" && binding === null) ||
      isRecognizedCreateRequire(binding, resolveBinding);
  }
  if (!ts.isPropertyAccessExpression(expression) ||
      !ts.isIdentifier(expression.expression)) return false;
  if (expression.expression.text === "module" && expression.name.text === "require") {
    return resolveBinding(expression.expression) === null;
  }
  if (expression.name.text === "resolve") {
    const binding = resolveBinding(expression.expression);
    return (expression.expression.text === "require" && binding === null) ||
      isRecognizedCreateRequire(binding, resolveBinding);
  }
  return false;
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
  const resolveBinding = lexicalBindings(parsed);
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
    } else if (ts.isCallExpression(node)) {
      const loader = isModuleLoaderExpression(node.expression, resolveBinding);
      // true = recognized loader; null = bounded resolution exhausted,
      // potentially a loader. Only false is sufficient to skip this call.
      if (loader !== false) {
        const first = node.arguments[0];
        const limit = { hit: false };
        const resolved = staticStringValue(first, resolveBinding, 0, new Set(), limit);
        if (resolved !== null) {
          push(staticReference(resolved, node, file, null, false,
            first && ts.isStringLiteralLike(first) ? "dynamic-loader" : "computed-loader"));
        } else if (limit.hit ||
                   first?.getText(parsed).includes(WRITER_BASENAME) ||
                   hasAmbiguousLexicalBinding(first, resolveBinding)) {
          // An expression that exceeds the static folding bound cannot be
          // silently accepted. This can conservatively HOLD deep benign
          // imports; it is preferable to missing a statically aliased writer.
          push(Object.freeze({kind: "forbidden", classification: "computed-loader", names: [], specifier: "<computed>"}));
        }
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
