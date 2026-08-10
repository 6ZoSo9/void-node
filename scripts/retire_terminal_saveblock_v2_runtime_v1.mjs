#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_LEGACY_TERMINAL_SAVEBLOCK_V2_RETIRED_V1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(ROOT, "dist", "index.js");
const SECTION = "// === void terminal saveBlock inject+txroot v2 ===";
const FUNCTION = "voidTerminalSaveBlockInjectAndTxrootV2";
const LEGACY_GATES = [
  "VOID_DISABLE_TERMINAL_SAVEBLOCK_V2",
  "VOID_DISABLE_WRAPPER_STORM",
  "VOID_QUARANTINE_HOT_RUNTIME",
];

function fail(message) {
  console.error(`${MARKER}_FAIL`);
  console.error(message);
  process.exit(1);
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

if (!fs.existsSync(TARGET)) {
  fail(`missing compiled runtime: ${TARGET}`);
}

let source = fs.readFileSync(TARGET, "utf8");

if (count(source, SECTION) !== 1) {
  fail("expected exactly one terminal saveBlock v2 section marker");
}
if (count(source, FUNCTION) !== 1) {
  fail("expected exactly one terminal saveBlock v2 function");
}

const existingRetirementCount = count(source, MARKER);
if (existingRetirementCount === 1) {
  console.log(`${MARKER}_GREEN already_retired=true`);
  process.exit(0);
}
if (existingRetirementCount !== 0) {
  fail(`unexpected retirement marker count: ${existingRetirementCount}`);
}

const sectionAt = source.indexOf(SECTION);
const functionAt = source.indexOf(FUNCTION, sectionAt + SECTION.length);
if (functionAt < 0) {
  fail("terminal saveBlock v2 function not found after its section marker");
}

const between = source.slice(sectionAt + SECTION.length, functionAt);
for (const gate of LEGACY_GATES) {
  if (!between.includes(gate)) {
    fail(`legacy terminal saveBlock v2 guard missing ${gate}`);
  }
}

const guardStartRel = between.indexOf("if");
const guardBraceRel = between.lastIndexOf("{");
if (guardStartRel < 0 || guardBraceRel <= guardStartRel) {
  fail("could not isolate terminal saveBlock v2 guard");
}

const guardStart = sectionAt + SECTION.length + guardStartRel;
const guardEnd = sectionAt + SECTION.length + guardBraceRel + 1;
const legacyGuard = source.slice(guardStart, guardEnd);
for (const gate of LEGACY_GATES) {
  if (!legacyGuard.includes(gate)) {
    fail(`isolated guard does not contain ${gate}`);
  }
}

const retiredGuard = `if (false /* ${MARKER}: legacy self-healing rewrapper retired */) {`;
source = source.slice(0, guardStart) + retiredGuard + source.slice(guardEnd);

if (count(source, MARKER) !== 1) {
  fail("retirement marker was not installed exactly once");
}

const temporary = `${TARGET}.retire-terminal-saveblock-v2.tmp-${process.pid}`;
fs.writeFileSync(temporary, source, { encoding: "utf8", mode: 0o600 });
fs.renameSync(temporary, TARGET);

console.log(
  `${MARKER}_GREEN`,
  JSON.stringify({
    target: path.relative(ROOT, TARGET),
    section_count: 1,
    function_count: 1,
    legacy_guard_retired: true,
  }),
);
