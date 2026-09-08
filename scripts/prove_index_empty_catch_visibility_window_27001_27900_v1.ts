import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const ID = "VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_27001_27900_V1";
const FILE = "src/index.ts";
const START = 27001;
const END = 27900;
const EXPECTED_SHA256 = "c3cbbda6a4851c5574454ce614bb964c690a4a470c9bb021990cf379af6ef9e9";
const EXPECTED_WINDOW_EMPTY_CATCH_COUNT = 0;
const EXPECTED_TOTAL_EMPTY_CATCH_COUNT = 0;
const EXPECTED_MEASURED_CATCH_CONTEXT_COUNT = 2529;
const MARKER = "VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_27001_27900_V1_VISIBLE";

const source = readFileSync(FILE, "utf8");

function lineAt(index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function countExactEmptyCatches(lo?: number, hi?: number): number {
  const exactEmptyCatchRegex = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
  let count = 0;
  for (const match of source.matchAll(exactEmptyCatchRegex)) {
    const index = match.index;
    if (index === undefined) continue;
    const line = lineAt(index);
    if (lo === undefined || hi === undefined || (line >= lo && line <= hi)) {
      count += 1;
    }
  }
  return count;
}

function markerCount(): number {
  return source.split(MARKER).length - 1;
}

function measuredCatchContextCount(): number {
  return source.match(/\bcatch\b/g)?.length ?? 0;
}

function pass(name: string, detail: string): void {
  console.log(`[PASS] ${name}: ${detail}`);
}

function fail(name: string, detail: string): never {
  console.error(`[FAIL] ${name}: ${detail}`);
  process.exit(1);
}

const sha256 = createHash("sha256").update(source).digest("hex");
const windowCount = countExactEmptyCatches(START, END);
const totalCount = countExactEmptyCatches();
const measuredCount = measuredCatchContextCount();
const markers = markerCount();

console.log(`${ID}_SHA256=${sha256}`);
console.log(`${ID}_WINDOW_EMPTY_CATCH_COUNT=${windowCount}`);
console.log(`${ID}_INDEX_TOTAL_EMPTY_CATCH_COUNT=${totalCount}`);
console.log(`${ID}_INDEX_MEASURED_CATCH_CONTEXT_COUNT=${measuredCount}`);
console.log(`${ID}_MARKER_COUNT=${markers}`);

if (sha256 !== EXPECTED_SHA256) fail("index-window-sha256-stable", `sha256=${sha256}, expected=${EXPECTED_SHA256}`);
pass("index-window-sha256-stable", `sha256=${sha256}`);

if (windowCount !== EXPECTED_WINDOW_EMPTY_CATCH_COUNT) fail("index-window-empty-catches-closed", `line-window=${START}-${END} exact empty catch count=${windowCount}, expected=${EXPECTED_WINDOW_EMPTY_CATCH_COUNT}`);
pass("index-window-empty-catches-closed", `line-window=${START}-${END} exact empty catch count=${windowCount}, expected=${EXPECTED_WINDOW_EMPTY_CATCH_COUNT}`);

if (totalCount !== EXPECTED_TOTAL_EMPTY_CATCH_COUNT) fail("index-total-empty-catch-count-reduced", `src/index.ts line-based total exact empty catch count=${totalCount}, expected=${EXPECTED_TOTAL_EMPTY_CATCH_COUNT}`);
pass("index-total-empty-catch-count-reduced", `src/index.ts line-based total exact empty catch count=${totalCount}, expected=${EXPECTED_TOTAL_EMPTY_CATCH_COUNT}`);

if (measuredCount !== EXPECTED_MEASURED_CATCH_CONTEXT_COUNT) fail("index-measured-catch-context-preserved", `src/index.ts measured catch context count=${measuredCount}, expected=${EXPECTED_MEASURED_CATCH_CONTEXT_COUNT}`);
pass("index-measured-catch-context-preserved", `src/index.ts measured catch context count=${measuredCount}, expected=${EXPECTED_MEASURED_CATCH_CONTEXT_COUNT}`);

if (markers < 1) fail("index-window-marker-present", `marker count=${markers}, expected>=1`);
pass("index-window-marker-present", `marker count=${markers}, expected>=1`);

// VOID_SAVEBLOCK_MARKER_DESCRIPTOR_IDEMPOTENCY_V1_PROOF_BEGIN
const helperBegin =
  "        // VOID_SAVEBLOCK_MARKER_DESCRIPTOR_IDEMPOTENCY_V1_BEGIN\n";
const helperEnd =
  "        // VOID_SAVEBLOCK_MARKER_DESCRIPTOR_IDEMPOTENCY_V1_END\n";
const helperBeginIndex = source.indexOf(helperBegin);
const helperEndIndex = source.indexOf(
  helperEnd,
  helperBeginIndex + helperBegin.length,
);
if (
  helperBeginIndex < 0 ||
  helperEndIndex < 0 ||
  source.indexOf(helperBegin, helperBeginIndex + 1) >= 0 ||
  source.indexOf(helperEnd, helperEndIndex + 1) >= 0
) {
  fail(
    "saveblock-marker-helper-single-source",
    `begin=${helperBeginIndex}, end=${helperEndIndex}`,
  );
}
pass("saveblock-marker-helper-single-source", "exactly one source helper");

const helperSource = source.slice(
  helperBeginIndex + helperBegin.length,
  helperEndIndex,
);
if (
  helperSource.includes("fn[k] = true") ||
  helperSource.includes("(fn as any)[k] = true")
) {
  fail(
    "saveblock-marker-no-direct-assignment-fallback",
    "direct assignment fallback remains",
  );
}
pass(
  "saveblock-marker-no-direct-assignment-fallback",
  "descriptor-aware path only",
);

const helperFactory = new Function(
  `${helperSource}\nreturn voidMarkTruthyFunctionFlagV1;`,
);
const markTruthyFunctionFlag = helperFactory();
if (typeof markTruthyFunctionFlag !== "function") {
  fail(
    "saveblock-marker-helper-executable",
    `type=${typeof markTruthyFunctionFlag}`,
  );
}
pass("saveblock-marker-helper-executable", "function");

function descriptorShape(fn: any, key: string): string {
  const descriptor = Object.getOwnPropertyDescriptor(fn, key);
  if (!descriptor) return "absent";
  return JSON.stringify({
    value: descriptor.value,
    writable: descriptor.writable,
    enumerable: descriptor.enumerable,
    configurable: descriptor.configurable,
  });
}

{
  const fn = function immutableStringMarker() {};
  Object.defineProperty(fn, "__void_trampoline_v7", {
    value: "saveblock.finalize.v2c",
  });
  const before = descriptorShape(fn, "__void_trampoline_v7");
  const visible: unknown[] = [];
  const result = markTruthyFunctionFlag(
    fn,
    "__void_trampoline_v7",
    (error: unknown) => visible.push(error),
  );
  const after = descriptorShape(fn, "__void_trampoline_v7");
  if (
    result !== true ||
    before !== after ||
    (fn as any).__void_trampoline_v7 !== "saveblock.finalize.v2c" ||
    visible.length !== 0
  ) {
    fail(
      "immutable-string-marker-preserved",
      `result=${result}, before=${before}, after=${after}, visible=${visible.length}`,
    );
  }
  pass(
    "immutable-string-marker-preserved",
    "saveblock.finalize.v2c retained exactly",
  );
}

{
  const fn = function immutableTrueMarker() {};
  Object.defineProperty(fn, "__void_trampoline_v7", { value: true });
  const before = descriptorShape(fn, "__void_trampoline_v7");
  const visible: unknown[] = [];
  const result = markTruthyFunctionFlag(
    fn,
    "__void_trampoline_v7",
    (error: unknown) => visible.push(error),
  );
  const after = descriptorShape(fn, "__void_trampoline_v7");
  if (result !== true || before !== after || visible.length !== 0) {
    fail(
      "immutable-true-marker-preserved",
      `result=${result}, before=${before}, after=${after}, visible=${visible.length}`,
    );
  }
  pass("immutable-true-marker-preserved", "immutable true retained exactly");
}

{
  const fn = function absentMarker() {};
  const visible: unknown[] = [];
  const result = markTruthyFunctionFlag(
    fn,
    "__void_trampoline_v7",
    (error: unknown) => visible.push(error),
  );
  const descriptor = Object.getOwnPropertyDescriptor(fn, "__void_trampoline_v7");
  if (
    result !== true ||
    descriptor?.value !== true ||
    descriptor?.configurable !== true ||
    visible.length !== 0
  ) {
    fail(
      "absent-marker-defined",
      `result=${result}, descriptor=${descriptorShape(fn, "__void_trampoline_v7")}, visible=${visible.length}`,
    );
  }
  pass("absent-marker-defined", "truthy configurable marker installed");
}

{
  const fn = function configurableFalseMarker() {};
  Object.defineProperty(fn, "__void_trampoline_v7", {
    value: false,
    configurable: true,
  });
  const visible: unknown[] = [];
  const result = markTruthyFunctionFlag(
    fn,
    "__void_trampoline_v7",
    (error: unknown) => visible.push(error),
  );
  const descriptor = Object.getOwnPropertyDescriptor(fn, "__void_trampoline_v7");
  if (
    result !== true ||
    descriptor?.value !== true ||
    descriptor?.configurable !== true ||
    visible.length !== 0
  ) {
    fail(
      "configurable-false-marker-repaired",
      `result=${result}, descriptor=${descriptorShape(fn, "__void_trampoline_v7")}, visible=${visible.length}`,
    );
  }
  pass("configurable-false-marker-repaired", "configurable conflict repaired");
}

{
  const fn = function immutableFalseMarker() {};
  Object.defineProperty(fn, "__void_trampoline_v7", { value: false });
  const before = descriptorShape(fn, "__void_trampoline_v7");
  const visible: unknown[] = [];
  const result = markTruthyFunctionFlag(
    fn,
    "__void_trampoline_v7",
    (error: unknown) => visible.push(error),
  );
  const after = descriptorShape(fn, "__void_trampoline_v7");
  const first = visible[0];
  if (
    result !== false ||
    before !== after ||
    visible.length !== 1 ||
    !(first instanceof TypeError) ||
    first.message !== "void_saveblock_marker_conflict:__void_trampoline_v7"
  ) {
    fail(
      "nonconfigurable-false-marker-visible",
      `result=${result}, before=${before}, after=${after}, visible=${visible.map(String).join("|")}`,
    );
  }
  pass(
    "nonconfigurable-false-marker-visible",
    "conflict preserved and reported",
  );
}
// VOID_SAVEBLOCK_MARKER_DESCRIPTOR_IDEMPOTENCY_V1_PROOF_END

console.log(`${ID}_GREEN`);
