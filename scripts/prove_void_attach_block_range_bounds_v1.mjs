#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ATTACH_BLOCK_RANGE_ERROR_CODE_V1,
  ATTACH_BLOCK_RANGE_MAX_SPAN,
  attachBlockRangeErrorV1,
  parseAttachBlockRange,
  resolveAttachBlockRangeAliasV1,
} from "../src/http/api_attach.ts";

const tsSource = readFileSync("src/http/api_attach.ts", "utf8");
const jsSource = readFileSync("src/http/api_attach.js", "utf8");
for (const source of [tsSource, jsSource]) {
  assert.match(source, /Number\.isSafeInteger\(head\)/);
  assert.match(source, /normalizeAttachBlockRangeBoundV1/);
  assert.ok(source.includes("^(?:0|[1-9][0-9]*)$"));
  assert.doesNotMatch(source, /Number\(fromRaw/);
  assert.doesNotMatch(source, /Number\(toRaw/);
  assert.match(source, /ATTACH_BLOCK_RANGE_MAX_SPAN\s*=\s*250/);
  assert.match(source, /Math\.min\(to, head\)/);
  assert.match(
    source,
    /boundedTo - from >= .*ATTACH_BLOCK_RANGE_MAX_SPAN/,
  );
  assert.match(source, /parseAttachBlockRange\(/);
  assert.match(source, /resolveAttachBlockRangeAliasV1/);
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
  resolveAttachBlockRangeAliasV1("10", undefined),
  { ok: true, value: "10" },
);
assert.deepEqual(
  resolveAttachBlockRangeAliasV1(undefined, "10"),
  { ok: true, value: "10" },
);
assert.deepEqual(
  resolveAttachBlockRangeAliasV1(undefined, undefined),
  { ok: true, value: undefined },
);
for (const [primary, alias] of [["10", "10"], ["10", "11"]]) {
  assert.deepEqual(
    resolveAttachBlockRangeAliasV1(primary, alias),
    { ok: false, value: null },
    "dual alias definitions must fail closed",
  );
}
for (const source of [tsSource, jsSource]) {
  assert.match(
    source,
    /resolveAttachBlockRangeAliasV1\(\s*req\.query\.from,\s*req\.query\.start/s,
  );
  assert.match(
    source,
    /resolveAttachBlockRangeAliasV1\(\s*req\.query\.to,\s*req\.query\.end/s,
  );
}
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

assert.deepEqual(parseAttachBlockRange(10, 259, 1000), {
  from: 10,
  to: 259,
});

for (const [name, from, to, head] of [
  ["empty_from", "", "1", 7],
  ["whitespace_to", "0", " ", 7],
  ["leading_zero_from", "01", "1", 7],
  ["repeated_from", ["0", "1"], "1", 7],
  ["single_array_to", "0", ["1"], 7],
  ["object_from", { value: "0" }, "1", 7],
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


for (const [name, from, to, head] of [
  ["empty_from", "", "1", 7],
  ["whitespace_to", "0", " ", 7],
  ["leading_zero_from", "01", "1", 7],
  ["repeated_from", ["0", "1"], "1", 7],
  ["single_array_to", "0", ["1"], 7],
  ["object_from", { value: "0" }, "1", 7],
]) {
  assert.equal(
    attachBlockRangeErrorV1(from, to, head).reason,
    "invalid_bounds",
    `${name} error classification must fail closed`,
  );
}

assert.equal(ATTACH_BLOCK_RANGE_ERROR_CODE_V1, "VOID_BLOCK_RANGE_INVALID_V1");
for (const invalidHead of [
  Number.NaN,
  -2,
  1.5,
  Number.MAX_SAFE_INTEGER + 1,
]) {
  assert.deepEqual(
    attachBlockRangeErrorV1("5", "6", invalidHead),
    {
      ok: false,
      error: "bad range",
      code: "VOID_BLOCK_RANGE_INVALID_V1",
      reason: "invalid_head",
      max_heights: 250,
      recovery: null,
      aliases: { from: ["from", "start"], to: ["to", "end"] },
    },
    "invalid internal head must be non-retryable",
  );
  assert.equal(
    parseAttachBlockRange("5", "6", invalidHead),
    null,
    "invalid internal head must remain rejected by the canonical parser",
  );
}
assert.deepEqual(
  attachBlockRangeErrorV1(undefined, undefined, 1000),
  {
    ok: false,
    error: "bad range",
    code: "VOID_BLOCK_RANGE_INVALID_V1",
    reason: "range_span_exceeds_limit",
    max_heights: 250,
    recovery: { from: 0, to: 249 },
    aliases: { from: ["from", "start"], to: ["to", "end"] },
  },
);
assert.deepEqual(
  attachBlockRangeErrorV1("10", "260", 1000),
  {
    ok: false,
    error: "bad range",
    code: "VOID_BLOCK_RANGE_INVALID_V1",
    reason: "range_span_exceeds_limit",
    max_heights: 250,
    recovery: { from: 10, to: 259 },
    aliases: { from: ["from", "start"], to: ["to", "end"] },
  },
);
assert.equal(attachBlockRangeErrorV1("2", "1", 1000).reason, "invalid_bounds");
const emptyStoreRecovery = attachBlockRangeErrorV1(
  undefined,
  undefined,
  -1,
).recovery;
assert.deepEqual(
  emptyStoreRecovery,
  { from: 0, to: 0 },
  "empty-store recovery must be parser-acceptable while representing no data",
);
assert.deepEqual(
  attachBlockRangeErrorV1("5", "bad", -1).recovery,
  { from: 0, to: 0 },
  "empty-store recovery must ignore malformed-request lower bounds",
);
assert.deepEqual(
  parseAttachBlockRange(
    emptyStoreRecovery.from,
    emptyStoreRecovery.to,
    -1,
  ),
  { from: 0, to: -1 },
  "retrying advertised numeric empty-store recovery must yield the empty interval",
);
assert.deepEqual(
  parseAttachBlockRange(
    String(emptyStoreRecovery.from),
    String(emptyStoreRecovery.to),
    -1,
  ),
  { from: 0, to: -1 },
  "URL-string empty-store recovery must round-trip through the canonical parser",
);
const beyondHeadRecovery = attachBlockRangeErrorV1(
  "1001",
  "invalid",
  1000,
).recovery;
assert.deepEqual(
  beyondHeadRecovery,
  { from: 1001, to: 1001 },
  "beyond-head invalid recovery must remain parser-acceptable",
);
assert.deepEqual(
  parseAttachBlockRange(
    beyondHeadRecovery.from,
    beyondHeadRecovery.to,
    1000,
  ),
  { from: 1001, to: 1000 },
  "retrying advertised beyond-head recovery must yield the intentional empty range",
);

for (const source of [tsSource, jsSource]) {
  assert.match(source, /VOID_BLOCK_RANGE_INVALID_V1/);
  assert.match(source, /max_heights/);
  assert.match(source, /range_span_exceeds_limit/);
  assert.match(source, /invalid_head/);
  assert.match(source, /attachBlockRangeErrorV1/);
}
console.log("void_attach_block_range_bounds_v1=PASS");
