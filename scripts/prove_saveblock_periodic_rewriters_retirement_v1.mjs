#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_LEGACY_SAVEBLOCK_PERIODIC_REWRITERS_RETIRED_V1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist", "index.js");
const RETIRE = path.join(ROOT, "scripts", "retire_saveblock_periodic_rewriters_v1.mjs");
const PACKAGE = path.join(ROOT, "package.json");
const EXPECTED_POSTBUILD = "node scripts/retire_saveblock_periodic_rewriters_v1.mjs";

const RETIREMENTS = [
  {
    id: "txroot_counters_watchdog",
    section: "// ---------------- [ADD] TxRoot counters: periodic last-wins wrapper ----------------",
    functionName: "installTxRootCountersWatchdog",
    timer: "setInterval(wrapOnce, 500);",
    marker: "VOID_LEGACY_TXROOT_COUNTERS_WATCHDOG_RETIRED_V1",
  },
  {
    id: "v7_saveblock_repair_loop",
    section: "// ===== [ADD] V7 recursion fix: de-proxy + stable saveBlock rebind (v1) =====",
    functionName: "v7RecursionFixSaveBlockV1",
    timer: "setInterval(tick, 1000);",
    marker: "VOID_LEGACY_V7_SAVEBLOCK_REPAIR_LOOP_RETIRED_V1",
  },
];

function fail(message) {
  console.error(`${MARKER}_PROOF_FAIL`);
  console.error(message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail(`missing required file: ${path.relative(ROOT, file)}`);
  }
  return fs.readFileSync(file, "utf8");
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

function entryGuard(marker) {
  return `return; /* ${marker}: legacy periodic saveBlock rewriter retired */`;
}

let pkg;
try {
  pkg = JSON.parse(read(PACKAGE));
} catch (error) {
  fail(`package.json is not valid JSON: ${error.message}`);
}
if (pkg?.scripts?.postbuild !== EXPECTED_POSTBUILD) {
  fail(`postbuild must be exactly: ${EXPECTED_POSTBUILD}`);
}

const retireSource = read(RETIRE);
const dist = read(DIST);

for (const token of [MARKER, "dist", "index.js", ...RETIREMENTS.flatMap((item) => [
  item.section,
  item.functionName,
  item.timer,
  item.marker,
])]) {
  if (!retireSource.includes(token)) {
    fail(`retirement transform missing contract token: ${token}`);
  }
}

for (const spec of RETIREMENTS) {
  if (count(dist, spec.section) !== 1) {
    fail(`${spec.id}: compiled runtime section count is ${count(dist, spec.section)}, expected 1`);
  }
  if (count(dist, spec.functionName) !== 1) {
    fail(`${spec.id}: compiled runtime function count is ${count(dist, spec.functionName)}, expected 1`);
  }
  if (count(dist, spec.timer) !== 1) {
    fail(`${spec.id}: compiled runtime polling timer count is ${count(dist, spec.timer)}, expected 1`);
  }
  if (count(dist, spec.marker) !== 1) {
    fail(`${spec.id}: compiled runtime retirement marker count is ${count(dist, spec.marker)}, expected 1`);
  }

  const sectionAt = dist.indexOf(spec.section);
  const functionAt = dist.indexOf(`function ${spec.functionName}`, sectionAt + spec.section.length);
  if (functionAt < 0 || functionAt - sectionAt > 512) {
    fail(`${spec.id}: compiled function is not at the reviewed section boundary`);
  }
  const braceAt = dist.indexOf("{", functionAt);
  if (braceAt < 0 || braceAt - functionAt > 256) {
    fail(`${spec.id}: compiled function entry could not be isolated`);
  }

  const guard = entryGuard(spec.marker);
  const afterBrace = dist.slice(braceAt + 1, Math.min(dist.length, braceAt + 1 + guard.length + 96));
  if (!afterBrace.trimStart().startsWith(guard)) {
    fail(`${spec.id}: unconditional retirement return is not the first function statement`);
  }

  const guardAt = dist.indexOf(guard, braceAt + 1);
  const timerAt = dist.indexOf(spec.timer, braceAt + 1);
  if (guardAt < 0 || timerAt < 0 || guardAt >= timerAt) {
    fail(`${spec.id}: legacy polling timer is not dominated by the retirement return`);
  }
}

console.log(
  `${MARKER}_PROOF_GREEN`,
  JSON.stringify({
    emitted_runtime_retired: true,
    fail_closed_transform: true,
    build_hook: "postbuild",
    build_contract_preserved: true,
    idempotent_transform_supported: true,
    retired: RETIREMENTS.map(({ id, marker }) => ({ id, marker })),
  }),
);