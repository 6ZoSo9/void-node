#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_LEGACY_TERMINAL_SAVEBLOCK_V2_RETIRED_V1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist", "index.js");
const COPY = path.join(ROOT, "scripts", "copy_void_runtime_js_v1.mjs");
const RETIRE = path.join(ROOT, "scripts", "retire_terminal_saveblock_v2_runtime_v1.mjs");
const SECTION = "// === void terminal saveBlock inject+txroot v2 ===";
const FUNCTION = "voidTerminalSaveBlockInjectAndTxrootV2";
const LEGACY_GATES = [
  "VOID_DISABLE_TERMINAL_SAVEBLOCK_V2",
  "VOID_DISABLE_WRAPPER_STORM",
  "VOID_QUARANTINE_HOT_RUNTIME",
];

function fail(message) {
  console.error(`${MARKER}_PROOF_FAIL`);
  console.error(message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) fail(`missing required file: ${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, "utf8");
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

const copySource = read(COPY);
const retireSource = read(RETIRE);
const dist = read(DIST);

for (const token of [
  "const RETIREMENT_SCRIPT = path.join(",
  "const COMPILED_RUNTIME = path.join(ROOT, \"dist\", \"index.js\");",
  "if (retirementScriptExists || compiledRuntimeExists) {",
  "if (!retirementScriptExists || !compiledRuntimeExists) {",
  "await import(pathToFileURL(RETIREMENT_SCRIPT).href);",
]) {
  if (!copySource.includes(token)) {
    fail(`runtime copy step missing fail-closed retirement contract: ${token}`);
  }
}
for (const token of [MARKER, SECTION, FUNCTION, ...LEGACY_GATES]) {
  if (!retireSource.includes(token)) {
    fail(`retirement transform missing contract token: ${token}`);
  }
}

if (count(dist, MARKER) !== 1) {
  fail(`compiled runtime retirement marker count is ${count(dist, MARKER)}, expected 1`);
}
if (count(dist, SECTION) !== 1) {
  fail(`compiled runtime section count is ${count(dist, SECTION)}, expected 1`);
}
if (count(dist, FUNCTION) !== 1) {
  fail(`compiled runtime function count is ${count(dist, FUNCTION)}, expected 1`);
}

const sectionAt = dist.indexOf(SECTION);
const functionAt = dist.indexOf(FUNCTION, sectionAt + SECTION.length);
if (functionAt < 0) fail("compiled terminal saveBlock v2 function is not after its section marker");
const prefix = dist.slice(sectionAt + SECTION.length, functionAt);

if (!prefix.includes(`if (false /* ${MARKER}: legacy self-healing rewrapper retired */) {`)) {
  fail("compiled terminal saveBlock v2 entry guard is not permanently retired");
}
for (const gate of LEGACY_GATES) {
  if (prefix.includes(gate)) {
    fail(`legacy runtime gate still controls terminal saveBlock v2 entry: ${gate}`);
  }
}

console.log(
  `${MARKER}_PROOF_GREEN`,
  JSON.stringify({
    emitted_runtime_retired: true,
    fail_closed_transform: true,
    public_build_contract_unchanged: true,
    legacy_entry_guard_absent: true,
  }),
);
