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
console.log("type_only_and_marker_only_imports_recognized=true");
console.log("test_only_import_does_not_grant_runtime_authority=true");
console.log("legacy_unguarded_exports_still_present=true");
console.log("ci_cost_scope_is_path_limited=true");
console.log("runtime_guard_exclusivity_proven=false");
console.log("production_gate_ready=false");
