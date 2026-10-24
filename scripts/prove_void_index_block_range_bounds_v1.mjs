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

const indexSource = readFileSync("src/index.ts", "utf8");
const attachSource = readFileSync("src/http/api_attach.ts", "utf8");
const routeStart = indexSource.indexOf('app.get("/blocks/range"');
const routeEnd = indexSource.indexOf(
  "/* Bulk block import (follower) */",
  routeStart,
);
assert.ok(routeStart >= 0 && routeEnd > routeStart, "public range route missing");
const route = indexSource.slice(routeStart, routeEnd);

assert.match(
  indexSource,
  /import \{ attachBlockRangeErrorV1, parseAttachBlockRange, resolveAttachBlockRangeAliasV1 \} from "\.\/http\/api_attach\.js";/,
  "public entrypoint must reuse the reviewed canonical parser and error contract",
);
assert.match(
  route,
  /resolveAttachBlockRangeAliasV1\(\s*req\.query\.from,\s*req\.query\.start/s,
  "public route must resolve from/start through the fail-closed alias helper",
);
assert.match(
  route,
  /resolveAttachBlockRangeAliasV1\(\s*req\.query\.to,\s*req\.query\.end/s,
  "public route must resolve to/end through the fail-closed alias helper",
);
assert.match(route, /fromAlias\.ok && toAlias\.ok/);
assert.match(route, /parseAttachBlockRange\(fromRaw, toRaw, head\)/);
assert.match(route, /if \(!range\)[\s\S]*status\(400\)/);
assert.match(route, /attachBlockRangeErrorV1\(fromRaw, toRaw, head\)/);
assert.doesNotMatch(route, /req\.query\.from \?\? req\.query\.start/);
assert.doesNotMatch(route, /req\.query\.to \?\? req\.query\.end/);
assert.match(route, /for \(let i = range\.from; i <= range\.to; i\+\+\)/);
assert.doesNotMatch(
  route,
  /Number\(req\.query\.(?:from|start|to|end)/,
  "public route must not parse unbounded request values independently",
);
assert.doesNotMatch(
  route,
  /for \(let i = from; i <= to; i\+\+\)/,
  "public route must not iterate raw request bounds",
);

assert.equal(ATTACH_BLOCK_RANGE_MAX_SPAN, 250);
assert.deepEqual(
  resolveAttachBlockRangeAliasV1("0", undefined),
  { ok: true, value: "0" },
);
assert.deepEqual(
  resolveAttachBlockRangeAliasV1(undefined, "0"),
  { ok: true, value: "0" },
);
assert.equal(
  resolveAttachBlockRangeAliasV1("0", "100").ok,
  false,
  "conflicting from/start aliases must fail closed",
);
assert.equal(
  resolveAttachBlockRangeAliasV1("1", "1").ok,
  false,
  "dual to/end aliases are rejected even when textually equal",
);
assert.deepEqual(parseAttachBlockRange(undefined, undefined, 7), {
  from: 0,
  to: 7,
});
assert.equal(
  parseAttachBlockRange(undefined, undefined, 1000),
  null,
  "large omitted-default ranges must fail closed",
);
assert.deepEqual(parseAttachBlockRange("10", "259", 1000), {
  from: 10,
  to: 259,
});
assert.equal(
  parseAttachBlockRange("10", "260", 1000),
  null,
  "251 inclusive heights must fail closed",
);
assert.deepEqual(parseAttachBlockRange("2", "999999", 5), {
  from: 2,
  to: 5,
});
assert.deepEqual(parseAttachBlockRange("9", "999999", 5), {
  from: 9,
  to: 5,
});
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

assert.deepEqual(
  parseAttachBlockRange("1001", "1001", 1000),
  { from: 1001, to: 1000 },
  "beyond-head request remains an intentional empty range",
);

assert.match(attachSource, /invalid_head/);
console.log("void_index_block_range_bounds_v1=PASS");
console.log("canonical_parser_reused=true");
console.log("public_aliases_preserved=true");
console.log("conflicting_aliases_rejected=true");
console.log("raw_range_iteration=false");
