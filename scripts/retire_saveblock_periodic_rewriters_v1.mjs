#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MARKER = "VOID_LEGACY_SAVEBLOCK_PERIODIC_REWRITERS_RETIRED_V1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(ROOT, "dist", "index.js");

const RETIREMENTS = [
  {
    id: "txroot_counters_watchdog",
    section: "// ---------------- [ADD] TxRoot counters: periodic last-wins wrapper ----------------",
    endSection: "// ---------------- [ADD] TxRoot counters: clean-room last-wins wrapper + /metrics/txroot2 ----------------",
    functionName: "installTxRootCountersWatchdog",
    timer: "setInterval(wrapOnce, 500);",
    marker: "VOID_LEGACY_TXROOT_COUNTERS_WATCHDOG_RETIRED_V1",
  },
  {
    id: "v7_saveblock_repair_loop",
    section: "// ===== [ADD] V7 recursion fix: de-proxy + stable saveBlock rebind (v1) =====",
    endSection: "// [saveblock.finalize.v1] stamp SegStore.prototype.saveBlock to avoid wrap storms / recursion loops",
    functionName: "v7RecursionFixSaveBlockV1",
    timer: "setInterval(tick, 1000);",
    marker: "VOID_LEGACY_V7_SAVEBLOCK_REPAIR_LOOP_RETIRED_V1",
  },
];

function fail(message) {
  console.error(`${MARKER}_FAIL`);
  console.error(message);
  process.exit(1);
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

function assertTargetIsRegularFile() {
  const relative = path.relative(ROOT, TARGET);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("compiled runtime target must stay beneath repository root");
  }

  let current = ROOT;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) break;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) {
      fail(`compiled runtime path must not contain symlinks: ${path.relative(ROOT, current)}`);
    }
  }

  if (!fs.existsSync(TARGET)) {
    fail(`missing compiled runtime: ${path.relative(ROOT, TARGET)}`);
  }
  const stat = fs.lstatSync(TARGET);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("compiled runtime must be one regular non-symlink file");
  }
  return stat;
}

function entryGuard(marker) {
  return `return; /* ${marker}: legacy periodic saveBlock rewriter retired */`;
}

function retireOne(source, spec) {
  if (count(source, spec.section) !== 1) {
    fail(`${spec.id}: expected exactly one section marker`);
  }
  if (count(source, spec.endSection) !== 1) {
    fail(`${spec.id}: expected exactly one end-section marker`);
  }

  const sectionAt = source.indexOf(spec.section);
  const endSectionAt = source.indexOf(spec.endSection, sectionAt + spec.section.length);
  if (endSectionAt < 0) {
    fail(`${spec.id}: reviewed end-section marker is not after its section marker`);
  }
  const sectionBody = source.slice(sectionAt, endSectionAt);
  if (count(sectionBody, spec.functionName) !== 1) {
    fail(`${spec.id}: expected exactly one function name inside reviewed section`);
  }
  if (count(sectionBody, spec.timer) !== 1) {
    fail(`${spec.id}: expected exactly one legacy polling timer inside reviewed section`);
  }

  const markerCount = count(source, spec.marker);
  const functionAt = source.indexOf(`function ${spec.functionName}`, sectionAt + spec.section.length);
  if (functionAt < 0 || functionAt >= endSectionAt) {
    fail(`${spec.id}: function is not located inside its reviewed section`);
  }
  if (functionAt - sectionAt > 512) {
    fail(`${spec.id}: function moved too far from its reviewed section marker`);
  }

  const braceAt = source.indexOf("{", functionAt);
  if (braceAt < 0 || braceAt >= endSectionAt || braceAt - functionAt > 256) {
    fail(`${spec.id}: could not isolate reviewed function entry`);
  }

  const guard = entryGuard(spec.marker);
  const bodyPrefix = source.slice(braceAt + 1, Math.min(endSectionAt, braceAt + 1 + guard.length + 96));

  if (markerCount === 1) {
    if (!bodyPrefix.trimStart().startsWith(guard)) {
      fail(`${spec.id}: retirement marker exists away from the function entry`);
    }
    return source;
  }
  if (markerCount !== 0) {
    fail(`${spec.id}: unexpected retirement marker count ${markerCount}`);
  }

  return source.slice(0, braceAt + 1) + `\n  ${guard}` + source.slice(braceAt + 1);
}

const targetStat = assertTargetIsRegularFile();
let source = fs.readFileSync(TARGET, "utf8");
for (const retirement of RETIREMENTS) {
  source = retireOne(source, retirement);
}

for (const retirement of RETIREMENTS) {
  if (count(source, retirement.marker) !== 1) {
    fail(`${retirement.id}: retirement marker was not installed exactly once`);
  }
}

const temporary = `${TARGET}.retire-periodic-saveblock.tmp-${process.pid}-${Date.now()}`;
try {
  fs.writeFileSync(temporary, source, {
    encoding: "utf8",
    flag: "wx",
    mode: targetStat.mode & 0o777,
  });
  fs.renameSync(temporary, TARGET);
} finally {
  fs.rmSync(temporary, { force: true });
}

console.log(
  `${MARKER}_GREEN`,
  JSON.stringify({
    target: path.relative(ROOT, TARGET),
    retired: RETIREMENTS.map(({ id, marker }) => ({ id, marker })),
    polling_ownership_loops_active: false,
  }),
);