#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  parseAttachBlockRange,
} from "../src/http/api_attach.ts";

const tsSource = readFileSync("src/http/api_attach.ts", "utf8");
const jsSource = readFileSync("src/http/api_attach.js", "utf8");
for (const source of [tsSource, jsSource]) {
  assert.match(source, /Number\.isSafeInteger\(head\)/);
  assert.match(source, /Number\.isSafeInteger\(from\)/);
  assert.match(source, /Number\.isSafeInteger\(to\)/);
  assert.match(source, /Math\.min\(to, head\)/);
  assert.match(source, /parseAttachBlockRange\(/);
}
assert.doesNotMatch(
  tsSource,
  /for \(let n = from; n <= to; n\+\+\)/,
  "route must not iterate the unbounded request values",
);
assert.doesNotMatch(
  jsSource,
  /for \(var n = from; n <= to; n\+\+\)/,
  "compiled route must not iterate the unbounded request values",
);

assert.deepEqual(
  parseAttachBlockRange(undefined, undefined, 7),
  { from: 0, to: 7 },
  "omitted bounds must retain the canonical 0..head default",
);
assert.deepEqual(
  parseAttachBlockRange("2", "9", 5),
  { from: 2, to: 5 },
  "a caller-supplied upper bound beyond head must stop at canonical head",
);
assert.deepEqual(
  parseAttachBlockRange("9", "9", 5),
  { from: 9, to: 5 },
  "a range wholly beyond head must terminate without scanning",
);
assert.deepEqual(
  parseAttachBlockRange("0", "999999", -1),
  { from: 0, to: -1 },
  "an explicit range over an empty store must remain an empty result",
);

for (const [name, from, to, head] of [
  ["fractional_from", "0.5", "1", 7],
  ["fractional_to", "0", "1.5", 7],
  ["unsafe_to", "0", String(Number.MAX_SAFE_INTEGER + 1), 7],
  ["unsafe_head", "0", "1", Number.MAX_SAFE_INTEGER + 1],
  ["negative_from", "-1", "1", 7],
  ["reversed", "2", "1", 7],
]) {
  assert.equal(
    parseAttachBlockRange(from, to, head),
    null,
    `${name} must fail closed`,
  );
}

console.log("void_attach_block_range_bounds_v1=PASS");
