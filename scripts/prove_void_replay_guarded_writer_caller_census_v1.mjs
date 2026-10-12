#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspectVoidReplayWriterCallerSourceV1,
  classifyVoidReplayWriterCallerCensusV1,
  VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_V1,
  VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_AUTHORITY_V1,
} from "../tools/void-replay-guarded-writer-caller-census-v1.mjs";

const target = "buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tool = path.join(root, "tools/void-replay-guarded-writer-caller-census-v1.mjs");
const writer = "src/economic/buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts";
const legacyIssue = "persistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueV1";
const legacyTerminal = "persistBuyVoidAllocationCustodyWitnessLiveReadReplayTerminalV1";
const marker = "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_V1";
const typeName = "BuyVoidWitnessLiveReadReplayCompareCallbackV1";

function inspect(body, file="src/economic/runtime.ts") {
  return inspectVoidReplayWriterCallerSourceV1(file, body);
}
function kind(body,file) { return inspect(body,file).references.map(ref => ref.kind); }
for(const code of [
  `import { ${legacyIssue} } from './${target}';`,
  `import { ${legacyIssue} as safe } from './${target}';`,
  `import { ${legacyTerminal} as foo } from './${target}';`,
  `import * as writer from './${target}';`,
  `import writer from './${target}';`,
  `import './${target}';`,
  `export { ${legacyIssue} } from './${target}';`,
  `export * from './${target}';`,
  `const writer = await import('./${target}');`,
  `const writer = require('./${target}');`,
  `import x = require('./${target}');`,
  `const writer = await import('./' + '${target}');`,
]) {
  assert.deepEqual(kind(code), ["forbidden"], code);
}
// A previous real blind spot: the complete writer basename is split across
// static literals, so raw getText().includes(WRITER_BASENAME) sees no match.
for (const computed of [
  `const writer = await import('./buy_void_allocation_custody_witness_live_read_replay_' + 'writer_v1.js')`,
  `const writer = require('./buy_void_allocation_custody_witness_live_read_replay_' + 'writer_v1.js')`,
  `const a = './buy_void_allocation_custody_witness_live_read_replay_'; const b = 'writer_v1.js'; const writer = await import(a + b)`,
  `const path = './buy_void_allocation_custody_witness_live_read_replay_' + 'writer_v1.js'; const writer = require(path)`,
  `const path = './buy_void_allocation_custody_witness_live_read_replay_' + 'writer_v1.js'; const copy = path; const writer = await import(copy)`,
  "const writer = await import(`./buy_void_allocation_custody_witness_live_read_replay_${'writer_v1.js'}`)",
  `const writer = module.require('./buy_void_allocation_custody_witness_live_read_replay_' + 'writer_v1.js')`,
  `const writer = require.resolve('./buy_void_allocation_custody_witness_live_read_replay_' + 'writer_v1.js')`,
  `const path = ('./buy_void_allocation_custody_witness_live_read_replay_' as const) + ('writer_v1.js' as const); const writer = await import(path)`,
]) {
  assert.deepEqual(kind(computed), ["forbidden"], computed);
}
// Lexical scope is part of the trust boundary. A sibling const declaration
// must not erase the reviewed alias used by a different function.
const splitTarget = "'./buy_void_allocation_custody_witness_live_read_replay_' + 'writer_v1.js'";
for (const [label, source, expected] of [
  ["sibling const cannot erase a writer alias",
    `function first(){const ref=${splitTarget};require(ref)} function second(){const ref='./other.js'}`,
    ["forbidden"]],
  ["sibling writer const cannot taint unrelated loader",
    `function first(){const ref='./other.js';require(ref)} function second(){const ref=${splitTarget}}`,
    []],
  ["nested writer const resolves over outer benign alias",
    `const ref='./other.js';{const ref=${splitTarget};require(ref)}`,
    ["forbidden"]],
  ["nested benign const shadows outer writer alias",
    `const ref=${splitTarget};{const ref='./other.js';require(ref)}`,
    []],
  ["outer writer alias remains visible inside nested block",
    `const ref=${splitTarget};{require(ref)}`,
    ["forbidden"]],
  ["sibling const aliases do not erase transitive writer binding",
    `function first(){const ref=${splitTarget};const alias=ref;require(alias)} function second(){const ref='./other.js'}`,
    ["forbidden"]],
  ["function argument shadows outer constant",
    `const ref=${splitTarget};function first(ref){require(ref)}`,
    []],
  ["arrow argument shadows outer constant",
    `const ref=${splitTarget};const fn=(ref)=>require(ref)`,
    []],
  ["catch argument shadows outer constant",
    `const ref=${splitTarget};try{}catch(ref){require(ref)}`,
    []],
  ["for-scope const shadows outer constant",
    `const ref=${splitTarget};for(const ref of ['./other.js']){require(ref)}`,
    []],
  ["another nested writer binding is not lost",
    `function a(){const ref=${splitTarget};function b(){const ref='./other.js';require(ref)}require(ref)}`,
    ["forbidden"]],
  ["duplicate same-scope declarations do not silently clear a writer alias",
    `const ref=${splitTarget};const ref='./other.js';require(ref)`,
    ["forbidden"]],
  ["constant alias cycles remain unresolved, not executable",
    `const a=b;const b=a;require(a)`,
    []],
]) {
  assert.deepEqual(kind(source), expected, label);
}
// These exact cases were raised in independent security review after the
// first lexical-scope repair. A shadowed loader or a legal repeated binding
// must not be mistaken for direct use of the Node module system.
for (const [label, code, expected] of [
  ["injected require callback shadows Node require",
    `function check(require){const ref=${splitTarget};require(ref)}`, []],
  ["injected module object shadows CommonJS module",
    `function check(module){const ref=${splitTarget};module.require(ref)}`, []],
  ["injected require object shadows require.resolve",
    `function check(require){const ref=${splitTarget};require.resolve(ref)}`, []],
  ["local function require shadows Node require",
    `function require(ref){}const ref=${splitTarget};require(ref)`, []],
  ["sibling loader identifier does not affect the real require",
    `function check(require){require('./other.js')}const ref=${splitTarget};require(ref)`, ["forbidden"]],
  ["var and function declarations share an allowed binding",
    `function ref(){} var ref; require(ref)`, []],
  ["function parameter and var redeclaration share a binding",
    `function check(ref){var ref; require(ref)}`, []],
  ["duplicate hoisted var declarations are not ambiguous",
    `var ref; var ref; require(ref)`, []],
  ["sibling function still binds split writer source",
    `function check(ref){var ref; require(ref)}function separate(){const ref=${splitTarget};require(ref)}`, ["forbidden"]],
  ["class static var does not taint source-level const",
    `const ref='./other.js';class C{static{var ref;}}require(ref)`, []],
  ["class static var shadows source-level writer alias only inside static block",
    `const ref=${splitTarget};class C{static{var ref; require(ref)}}`, []],
  ["class static const writer reference remains a forbidden direct loader",
    `class C{static{const ref=${splitTarget};require(ref)}}`, ["forbidden"]],
  ["source-level writer alias remains visible outside class static block",
    `const ref=${splitTarget};class C{static{var ref;}}require(ref)`, ["forbidden"]],
  ["real createRequire loader with exact node:module import is still caught",
    `import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const ref=${splitTarget};require(ref)`, ["forbidden"]],
  ["aliased real createRequire loader stays caught",
    `import {createRequire as makeRequire} from 'node:module';const require=makeRequire(import.meta.url);const ref=${splitTarget};require(ref)`, ["forbidden"]],
  ["named loader from aliased createRequire import is caught",
    `import {createRequire as makeRequire} from 'node:module';const loader=makeRequire(import.meta.url);const ref=${splitTarget};loader(ref)`, ["forbidden"]],
  ["transitively aliased createRequire loader is caught",
    `import {createRequire} from 'node:module';const real=createRequire(import.meta.url);const loader=real;const ref=${splitTarget};loader(ref)`, ["forbidden"]],
  ["fake locally defined createRequire cannot impersonate imported factory",
    `const createRequire=()=>x=>x;const load=createRequire();const ref=${splitTarget};load(ref)`, []],
]) {
  assert.deepEqual(kind(code), expected, label);
}
// Exact-head independent security review: follow const aliases of the real
// imported createRequire *factory*, not just aliases of its returned loader.
// Named function/class expressions bind local names rather than CommonJS
// require/module globals. Test both negative and positive boundaries.
for (const [label, code, expected] of [
  ["genuine createRequire factory const alias remains a loader",
    `import {createRequire} from 'node:module'; const factory=createRequire; const load=factory(import.meta.url); const target=${splitTarget}; load(target)`,
    ["forbidden"]],
  ["double-aliased imported createRequire factory remains a loader",
    `import {createRequire as cr} from 'node:module'; const factory=cr; const alias=factory; const load=alias(import.meta.url); const target=${splitTarget}; load(target)`,
    ["forbidden"]],
  ["parenthesized TypeScript factory alias remains a loader",
    `import {createRequire as cr} from 'node:module'; const factory=(cr as typeof cr); const load=factory(import.meta.url); const target=${splitTarget}; load(target)`,
    ["forbidden"]],
  ["real require loader alias chain from factory alias remains caught",
    `import {createRequire} from 'node:module'; const factory=createRequire; const real=factory(import.meta.url); const alias=real; const target=${splitTarget}; alias.resolve(target)`,
    ["forbidden"]],
  ["unrelated local createRequire factory cannot masquerade as import",
    `const createRequire=()=>()=>0;const factory=createRequire;const load=factory(); const target=${splitTarget}; load(target)`,
    []],
  ["locally shadowed imported createRequire factory is not trusted",
    `import {createRequire} from 'node:module';function test(createRequire){ const factory=createRequire;const load=factory();const target=${splitTarget};load(target)}`,
    []],
  ["factory alias cycle does not resolve to a loader",
    `import {createRequire} from 'node:module';const first=second;const second=first;const load=first(import.meta.url);const target=${splitTarget};load(target)`,
    []],
  ["function expression named require is not CommonJS require",
    `const f=function require(){const target=${splitTarget};require(target)}`, []],
  ["function expression named require shadows only its own body",
    `const f=function require(){const target=${splitTarget};require(target)}; const target=${splitTarget}; require(target)`,
    ["forbidden"]],
  ["named function expression module shadows CommonJS module inside body",
    `const f=function module(){const target=${splitTarget};module.require(target)}`, []],
  ["class expression named module shadows CommonJS module inside static block",
    `const f=class module{static{const target=${splitTarget};module.require(target)}}`, []],
  ["class expression named module does not shadow outer CommonJS module",
    `const f=class module{static{const target=${splitTarget};module.require(target)}};const target=${splitTarget};module.require(target)`,
    ["forbidden"]],
]) {
  assert.deepEqual(kind(code), expected, label);
}
// Review P2: reaching the 24-binding alias limit must never mean that a
// genuine node:module createRequire loader has been disproven.
const deepLoaderAlias = (count, source) => {
  const lines = [source];
  for (let i = 1; i <= count; i += 1) {
    lines.push(`const loader${i}=loader${i - 1};`);
  }
  return lines.join("\n");
};
const deepFactoryAlias = (count) => {
  const lines = ["import {createRequire} from 'node:module';", "const factory0=createRequire;"];
  for (let i = 1; i <= count; i += 1) {
    lines.push(`const factory${i}=factory${i - 1};`);
  }
  return lines.join("\n");
};
for (const depth of [23, 24, 25, 27, 40]) {
  const realLoader = deepLoaderAlias(depth,
    "import {createRequire} from 'node:module';const loader0=createRequire(import.meta.url);");
  const realFactory = deepFactoryAlias(depth);
  assert.deepEqual(kind(`${realLoader}\nconst target=${splitTarget};loader${depth}(target)`),
    ["forbidden"], `deep direct loader alias must HOLD: ${depth}`);
  assert.deepEqual(kind(`${realFactory}\nconst loader=factory${depth}(import.meta.url);const target=${splitTarget};loader(target)`),
    ["forbidden"], `deep imported factory alias must HOLD: ${depth}`);
  assert.deepEqual(kind(`${realLoader}\nconst target='./unrelated.mjs';loader${depth}(target)`),
    [], `deep non-writer request remains out of scope: ${depth}`);
}
// Deep *path* aliases must not become silently safe because folding reached
// the bound. A benign dynamic import past this cap conservatively HOLDS too;
// this is documented as a source-review tripwire, not runtime proof.
const deepPath = ["const target0=" + splitTarget + ";"];
const deepBenignPath = ["const target0='./unrelated.mjs';"];
for (let i = 1; i <= 35; i += 1) {
  deepPath.push(`const target${i}=target${i - 1};`);
  deepBenignPath.push(`const target${i}=target${i - 1};`);
}
assert.deepEqual(kind(`${deepPath.join("\n")}\nawait import(target35)`),
  ["forbidden"], "depth cap on module path must HOLD");
assert.deepEqual(kind(`${deepBenignPath.join("\n")}\nawait import(target35)`),
  ["forbidden"], "inconclusive path depth is a conservative HOLD");
assert.deepEqual(kind("const ref=process.env.UNREVIEWED;await import(ref)"),
  [], "unknown runtime path without bound exhaustion remains out of scope");

// Named function-expression name environment is shadowed by a parameter of
// the same name. This is one binding, not an ambiguous lexical collision.
for (const [label, code, expected] of [
  ["named function expr with colliding ordinary parameter",
    `const f=function ref(ref){require(ref)}`, []],
  ["named require function expr with colliding require parameter",
    `const f=function require(require){const target=${splitTarget};require(target)}`, []],
  ["named require function expr without colliding parameter stays local",
    `const f=function require(other){const target=${splitTarget};require(target)}`, []],
  ["named ref expression parameter does not hide actual global require",
    `const f=function ref(ref){const target=${splitTarget};require(target)}`, ["forbidden"]],
  ["unshadowed outer require remains a real loader",
    `const f=function require(require){const target=${splitTarget};require(target)};const target=${splitTarget};require(target)`,
    ["forbidden"]],
]) {
  assert.deepEqual(kind(code), expected, label);
}
// Review P2: an overlong literal, intermediate concatenation or template
// expression is INDETERMINATE, not a safe/non-writer conclusion. Even an
// oversized unrelated dynamic import deliberately HOLDs for manual review.
const longQuery = "x".repeat(5_000);
for(const [label, source, expected] of [
  ["oversized literal with writer prefix/suffix",
    `await import('./buy_void_allocation_custody_witness_live_read_replay_writer_v1.js?${longQuery}')`,
    ["forbidden"]],
  ["oversized computed concatenation with split basename",
    `const prefix='./buy_void_allocation_custody_witness_live_read_replay_';const suffix='writer_v1.js?'+${JSON.stringify(longQuery)};await import(prefix+suffix)`,
    ["forbidden"]],
  ["oversized bare literal followed by computed writer suffix",
    `const prefix=${JSON.stringify(longQuery)};const suffix='./buy_void_allocation_custody_witness_live_read_replay_'+'writer_v1.js';await import(prefix+suffix)`,
    ["forbidden"]],
  ["oversized template value with split basename",
    `const huge=${JSON.stringify(longQuery)};const target=\`./buy_void_allocation_custody_witness_live_read_replay_\${'writer_v1.js?'}\${huge}\`;await import(target)`,
    ["forbidden"]],
  ["oversized unrelated literal is a conservative HOLD",
    `await import('./other.mjs?${longQuery}')`, ["forbidden"]],
]) assert.deepEqual(kind(source),expected,label);

// Named FunctionExpression has a separate self-name environment outside
// its parameter/var scope. Parameters and body var bindings shadow its name
// and are not conflicting declarations of one lexical name.
for(const [label, source, expected] of [
  ["function expression name shadowed by body var",
    `const f=function ref(){var ref;require(ref)}`, []],
  ["named require expression name shadowed by body var",
    `const f=function require(){var require;const target=${splitTarget};require(target)}`, []],
  ["function expression name shadowed by same-name parameter",
    `const f=function ref(ref){require(ref)}`, []],
  ["named require expression parameter shadows self-name",
    `const f=function require(require){const target=${splitTarget};require(target)}`, []],
  ["body var cannot hide unrelated genuine writer import",
    `const f=function ref(){var ref;const target=${splitTarget};require(target)}`,
    ["forbidden"]],
  ["expression self-name does not shadow the outer loader",
    `const f=function require(){var require;const t=${splitTarget};require(t)};const t=${splitTarget};require(t)`,
    ["forbidden"]],
]) assert.deepEqual(kind(source),expected,label);
// An existing proof path remains a fixture-only allowance, not a runtime gate.
assert.deepEqual(kind(`const x = await import('./buy_void_allocation_custody_witness_live_read_replay_' + 'writer_v1.js')`,
  "scripts/prove_buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts"), ["proof_fixture_only"]);
// Unknown dynamic loaders are still outside this bounded source audit; avoid
// claiming a full ESM execution closure or blanket dynamic-import rejection.
assert.deepEqual(kind('const arbitrary = process.env.UNKNOWN_MODULE; await import(arbitrary)'), []);
assert.deepEqual(kind('const first = second; const second = first; await import(first)'), []);

assert.deepEqual(kind(`import type { ${typeName} } from './${target}';`), ["type_only"]);
assert.deepEqual(kind(`import { type ${typeName} } from './${target}';`), ["type_only"]);
assert.deepEqual(kind(`export type { ${typeName} } from './${target}';`), ["type_only"]);
assert.deepEqual(kind(`import { ${marker} } from './${target}';`), ["marker_only"]);
assert.deepEqual(kind(`import { ${marker}, ${legacyIssue} } from './${target}';`), ["forbidden"]);
assert.deepEqual(kind(`import { ${legacyIssue} } from '../src/economic/${target}';`,
  "scripts/prove_buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts"), ["proof_fixture_only"]);
assert.deepEqual(kind(`import { ${legacyIssue} } from '../src/economic/${target}';`,
  "scripts/unreviewed_executor.ts"), ["forbidden"]);
assert.deepEqual(kind(`// import { ${legacyIssue} } from './${target}';`), []);
assert.deepEqual(kind(`const harmless = 'import ${legacyIssue} from ${target}';`), []);

const fixture = [
  {file:"scripts/prove_buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts",contents:`import { ${legacyIssue} } from '../src/economic/${target}'`},
  {file:"src/economic/executor.ts",contents:`import type { ${typeName} } from './${target}'`},
  {file:writer,contents:`export function ${legacyIssue}() {}\nexport function ${legacyTerminal}() {}`},
].sort((a,b)=>a.file.localeCompare(b.file));
const good = classifyVoidReplayWriterCallerCensusV1(fixture);
assert.equal(good.status,"SOURCE_ONLY_CENSUS");
assert.equal(good.writer_legacy_unguarded_exports_still_present,true);
assert.equal(good.runtime_guard_exclusivity_proven,false);
assert.equal(good.production_gate_ready,false);
assert.match(good.receipt_sha256,/^sha256:[0-9a-f]{64}$/u);
const bad = classifyVoidReplayWriterCallerCensusV1([...fixture,
  {file:"src/economic/nonproof.ts",contents:`import { ${legacyIssue} } from './${target}'`}
].sort((a,b)=>a.file.localeCompare(b.file)));
assert.equal(bad.status,"HOLD_UNREVIEWED_WRITER_CALLER");
assert.equal(bad.unexpected_writer_imports.length,1);
assert.deepEqual(bad.unexpected_writer_imports[0].names,[legacyIssue]);
assert.equal(bad.production_gate_ready,false);
assert.throws(()=>classifyVoidReplayWriterCallerCensusV1(fixture.slice().reverse()),/order|duplicate/u);
assert.throws(()=>inspect("import ", "../../bad.ts"),/source_path_invalid/u);
assert.throws(()=>inspect("import {", "src/economic/runtime.ts"),/source_parse_invalid/u);
const src = readFileSync(tool, "utf8");
assert.match(src,/typescript_ast_parser: true/u);
for(const key of [
  "executable_import_closure_proven","runtime_guard_exclusivity_proven",
  "authenticated_ssh_transport_performed","runtime_service_installed",
  "witness_or_replay_mutation","wallet_signer_or_funds_access","chain_or_market_mutation","production_gate_ready"
]) assert.equal(VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_AUTHORITY_V1[key], false, key);
// A broad PR trigger would violate the merged repository CI cost boundary.
const workflowPath = path.join(root, ".github/workflows/void-replay-guarded-writer-caller-census-v1.yml");
const workflow = readFileSync(workflowPath, "utf8");
const triggerBegin = workflow.indexOf("  pull_request:\n    paths:\n");
const triggerEnd = workflow.indexOf("  workflow_dispatch:\n", triggerBegin);
assert.ok(triggerBegin >= 0 && triggerEnd > triggerBegin, "focused_pr_paths_required");
const prPaths = workflow.slice(triggerBegin, triggerEnd);
assert.doesNotMatch(prPaths, /^\s+-\s+["']?\*/mu, "repository_wide_pr_glob_forbidden");
for (const required of [
  "src/economic/**",
  "src/index.ts",
  "tools/void-replay-guarded-writer-caller-census-v1.mjs",
  "scripts/prove_void_replay_guarded_writer_caller_census_v1.mjs",
  ".github/workflows/void-replay-guarded-writer-caller-census-v1.yml",
]) {
  assert.ok(prPaths.includes(`- "${required}"`), `missing_reviewed_pr_scope:${required}`);
}

const refused=spawnSync(process.execPath,[tool,"--apply"],{encoding:"utf8",timeout:5000});
assert.equal(refused.status,2);
assert.match(refused.stderr,/HOLD/u);
assert.equal(refused.stdout,"");
assert.equal(good.marker,VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_V1);
console.log("VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_V1_SOURCE_GREEN");
console.log("direct_unguarded_import_adversaries_rejected=true");
console.log("namespace_reexport_dynamic_require_adversaries_rejected=true");
console.log("statically_computed_writer_loader_adversaries_rejected=true");
console.log("sibling_shadow_lexical_recovery_and_duplicate_binding_hold=true");
console.log("shadowed_loader_hoistable_bindings_class_static_scope_qualified=true");
console.log("imported_factory_alias_chain_and_named_expression_shadowing_proven=true");
console.log("bounded_loader_and_path_alias_depths_fail_closed=true");
console.log("named_function_expression_parameter_shadowing_proven=true");
console.log("oversized_static_import_specifiers_hold=true");
console.log("named_expression_var_parameter_name_environments_separated=true");
console.log("type_only_and_marker_only_imports_recognized=true");
console.log("test_only_import_does_not_grant_runtime_authority=true");
console.log("legacy_unguarded_exports_still_present=true");
console.log("ci_cost_scope_is_path_limited=true");
console.log("runtime_guard_exclusivity_proven=false");
console.log("production_gate_ready=false");
