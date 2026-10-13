#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ATTACH_BLOCK_RANGE_MAX_SPAN,
  parseAttachBlockRange,
} from "../src/http/api_attach.ts";

const tsSource = readFileSync("src/http/api_attach.ts", "utf8");
const jsSource = readFileSync("src/http/api_attach.js", "utf8");
for (const source of [tsSource, jsSource]) {
  assert.match(source, /Number\.isSafeInteger\(head\)/);
  assert.match(source, /Number\.isSafeInteger\(from\)/);
  assert.match(source, /Number\.isSafeInteger\(to\)/);
  assert.match(source, /ATTACH_BLOCK_RANGE_MAX_SPAN\s*=\s*250/);
  assert.match(source, /Math\.min\(to, head\)/);
  assert.match(
    source,
    /boundedTo - from >= .*ATTACH_BLOCK_RANGE_MAX_SPAN/,
  );
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

assert.equal(ATTACH_BLOCK_RANGE_MAX_SPAN, 250);
assert.deepEqual(
  parseAttachBlockRange(undefined, undefined, 7),
  { from: 0, to: 7 },
  "small omitted bounds must retain the canonical 0..head default",
);
assert.equal(
  parseAttachBlockRange(undefined, undefined, 1000),
  null,
  "large omitted bounds must reject instead of returning an ambiguous partial page",
);
assert.deepEqual(
  parseAttachBlockRange("10", "259", 1000),
  { from: 10, to: 259 },
  "the exact fixed inclusive span must be accepted",
);
assert.equal(
  parseAttachBlockRange("10", "260", 1000),
  null,
  "an over-limit range must reject instead of returning an ambiguous partial page",
);
assert.deepEqual(
  parseAttachBlockRange("2", "999999", 5),
  { from: 2, to: 5 },
  "a caller-supplied upper bound beyond head must stop at canonical head",
);
assert.deepEqual(
  parseAttachBlockRange("9", "999999", 5),
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
