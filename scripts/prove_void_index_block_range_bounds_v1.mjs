#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ATTACH_BLOCK_RANGE_ERROR_CODE_V1,
  ATTACH_BLOCK_RANGE_MAX_SPAN,
  attachBlockRangeErrorV1,
  parseAttachBlockRange,
} from "../src/http/api_attach.ts";

const indexSource = readFileSync("src/index.ts", "utf8");
const apiAttachSource = readFileSync("src/http/api_attach.ts", "utf8");
const routeStart = indexSource.indexOf('app.get("/blocks/range"');
const routeEnd = indexSource.indexOf(
  "/* Bulk block import (follower) */",
  routeStart,
);
assert.ok(routeStart >= 0 && routeEnd > routeStart, "public range route missing");
const route = indexSource.slice(routeStart, routeEnd);

assert.match(
  indexSource,
  /import \{ attachBlockRangeErrorV1, parseAttachBlockRange \} from "\.\/http\/api_attach\.js";/,
  "public entrypoint must reuse the reviewed canonical parser",
);
assert.match(
  route,
  /parseAttachBlockRange\(\s*req\.query\.from \?\? req\.query\.start,\s*req\.query\.to \?\? req\.query\.end,\s*head,?\s*\)/s,
  "public route must preserve from/start and to/end aliases through the canonical parser",
);
assert.match(route, /if \(!range\)[\s\S]*status\(400\)[.]json\(attachBlockRangeErrorV1\(\)\)/);
assert.match(apiAttachSource, /status\(400\)[.]json\(attachBlockRangeErrorV1\(\)\)/);
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
assert.equal(ATTACH_BLOCK_RANGE_ERROR_CODE_V1, "void_block_range_invalid_v1");
assert.deepEqual(attachBlockRangeErrorV1(), {
  ok: false,
  error: "bad range",
  error_code: "void_block_range_invalid_v1",
  max_inclusive_heights: 250,
  recovery: {
    preferred_query: ["from", "to"],
    aliases: { from: "start", to: "end" },
    max_to_offset_from: 249,
  },
});
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

console.log("void_index_block_range_bounds_v1=PASS");
console.log("canonical_parser_reused=true");
console.log("public_aliases_preserved=true");
console.log("machine_readable_range_error_v1=true");
console.log("raw_range_iteration=false");
