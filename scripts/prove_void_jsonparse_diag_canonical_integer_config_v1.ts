#!/usr/bin/env -S npx tsx

import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { parseJsonParseDiagPositiveInteger } from "../src/diag/jsonparse_diag.ts";

const fallback = 4096;
const minimum = 16;

for (const [raw, expected] of [
  ["1", 16],
  ["15", 16],
  ["16", 16],
  ["17", 17],
  ["200", 200],
  ["4096", 4096],
  [String(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER],
] as const) {
  assert.equal(
    parseJsonParseDiagPositiveInteger(raw, fallback, minimum),
    expected,
    `canonical input ${raw}`,
  );
}

for (const raw of [
  undefined,
  "",
  "0",
  "-1",
  "+16",
  "016",
  "16.0",
  "1e3",
  "16junk",
  " 16",
  "16 ",
  String(Number.MAX_SAFE_INTEGER + 1),
]) {
  assert.equal(
    parseJsonParseDiagPositiveInteger(raw, fallback, minimum),
    fallback,
    `non-canonical input ${String(raw)}`,
  );
}

assert.equal(
  parseJsonParseDiagPositiveInteger(undefined, 200, 50),
  200,
);
assert.equal(
  parseJsonParseDiagPositiveInteger("49", 200, 50),
  50,
);
assert.equal(
  parseJsonParseDiagPositiveInteger("50", 200, 50),
  50,
);
assert.equal(
  parseJsonParseDiagPositiveInteger("51", 200, 50),
  51,
);

const source = fs.readFileSync(
  fileURLToPath(new URL("../src/diag/jsonparse_diag.ts", import.meta.url)),
  "utf8",
);
assert.doesNotMatch(source, /Number\.parseInt/u);
assert.equal(
  source.match(/parseJsonParseDiagPositiveInteger\(/gu)?.length,
  3,
);
assert.match(
  source,
  /process\.env\.VOID_DIAG_JSONPARSE_SAMPLE_EVERY,\s*4096,\s*16,/u,
);
assert.match(
  source,
  /process\.env\.VOID_DIAG_JSONPARSE_MAX_KEYS,\s*200,\s*50,/u,
);

console.log("void_jsonparse_diag_canonical_integer_config_v1=PASS");
console.log("partial_integer_parse_rejected=true");
console.log("unsafe_integer_rejected=true");
console.log("existing_defaults_preserved=true");
console.log("existing_minimums_preserved=true");
console.log("runtime_or_network_action=false");
