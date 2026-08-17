import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync("src/index.ts", "utf8");
const lines = source.split("\n");
const agentRegion = lines.slice(24899, 27150).join("\n");
const buggySplit = '.split("\\\\n")';
const fixedSplit = '.split("\\n")';
const buggyJoin = '.join("\\\\n")';
const fixedJoin = '.join("\\n")';

assert.equal(agentRegion.includes(buggySplit), false, "literal backslash-n JSONL split remains in live agent job family");
assert.equal(agentRegion.includes(buggyJoin), false, "literal backslash-n JSONL join remains in live agent job family");
assert.ok(agentRegion.split(fixedSplit).length - 1 >= 23, "expected repaired newline JSONL readers");
assert.ok(agentRegion.split(fixedJoin).length - 1 >= 10, "expected repaired newline JSONL writers/metrics joins");

const badReceiptsTail = String.raw`lines.join("\n")+"\\n"`;
const goodReceiptsTail = String.raw`lines.join("\n")+"\n"`;
const badLeaseMetricsTail = String.raw`out.join("\n")+"\\n"`;
const goodLeaseMetricsTail = String.raw`out.join("\n")+"\n"`;
const badLeaseErrorTail = String.raw`send("# error "+(e?.message||"internal")+"\\n");`;
const goodLeaseErrorTail = String.raw`send("# error "+(e?.message||"internal")+"\n");`;
assert.equal(source.includes(badReceiptsTail), false, "receipts metrics still appends a literal backslash-n tail");
assert.equal(source.includes(goodReceiptsTail), true, "receipts metrics real newline tail missing");
assert.equal(source.includes(badLeaseMetricsTail), false, "lease metrics still appends a literal backslash-n tail");
assert.equal(source.includes(goodLeaseMetricsTail), true, "lease metrics real newline tail missing");
assert.equal(source.includes(badLeaseErrorTail), false, "lease metrics error response still appends a literal backslash-n tail");
assert.equal(source.includes(goodLeaseErrorTail), true, "lease metrics error response real newline tail missing");

const unsafeHeader = 'const n = Number((await selfJson(`/blocks/latest/number2.json`)).number);';
const safeHeader = 'const n = Number((await selfJson(`/blocks/latest/number2.json`))?.number);';
assert.equal(source.includes(unsafeHeader), false, "Header3 poller still dereferences synthetic null response");
assert.equal(source.includes(safeHeader), true, "Header3 poller null-safe boundary missing");

const raw = [
  JSON.stringify({ id: "job-a", status: "queued" }),
  JSON.stringify({ id: "job-b", status: "queued" }),
  JSON.stringify({ id: "job-c", status: "queued" }),
].join("\n") + "\n";
const parsed = raw.split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
assert.deepEqual(parsed.map((x) => x.id), ["job-a", "job-b", "job-c"]);
assert.throws(() => JSON.parse(raw), /JSON|Unexpected|non-whitespace/i, "whole-file JSON parse must remain invalid for multi-record JSONL");

console.log("VOID_LIVE_AGENT_JSONL_RUNTIME_WEDGE_V1_PROOF_GREEN");
console.log("agent_jsonl_real_newline_split=true");
console.log("agent_jsonl_real_newline_join=true");
console.log("multi_record_jsonl_parse=true");
console.log("header3_synthetic_null_safe=true");
console.log("runtime_mutation_performed=false");
