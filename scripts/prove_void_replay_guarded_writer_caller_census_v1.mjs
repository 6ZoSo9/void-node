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
const refused=spawnSync(process.execPath,[tool,"--apply"],{encoding:"utf8",timeout:5000});
assert.equal(refused.status,2);
assert.match(refused.stderr,/HOLD/u);
assert.equal(refused.stdout,"");
assert.equal(good.marker,VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_V1);
console.log("VOID_REPLAY_GUARDED_WRITER_CALLER_CENSUS_V1_SOURCE_GREEN");
console.log("direct_unguarded_import_adversaries_rejected=true");
console.log("namespace_reexport_dynamic_require_adversaries_rejected=true");
console.log("type_only_and_marker_only_imports_recognized=true");
console.log("test_only_import_does_not_grant_runtime_authority=true");
console.log("legacy_unguarded_exports_still_present=true");
console.log("runtime_guard_exclusivity_proven=false");
console.log("production_gate_ready=false");
