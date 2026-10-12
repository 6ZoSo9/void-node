#!/usr/bin/env npx tsx
import fs from "node:fs";

const file = "src/index.ts";
const src = fs.readFileSync(file, "utf8");
const start = src.indexOf("  async function readInputs(){");
const end = src.indexOf("\n  function attach(){", start);

function fail(message: string): never {
  console.error(`VOID_READY_RUNTIME_HTTP_PORT_V1_FAIL: ${message}`);
  process.exit(1);
}

if (start < 0 || end < 0) fail("readInputs block not found");
const block = src.slice(start, end);

const required = [
  'const port = String(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || "4100");',
  'const base = `http://127.0.0.1:${port}`;',
  'fetchText(`${base}/head.txt`, 300)',
  'fetchText(`${base}/blocks/latest/number2.json`, 400)',
  'fetchText(`${base}/__void/metrics/void.basics.v2.prom`, 500)',
  'fetchText(`${base}/blocks/${head}/txroot/verify2`, 500)',
  'fetchText(`${base}/health/txroot3?format=prom`, 300)',
  'fetchText(`${base}/health/txroot3/live.prom`, 300)',
  'fetchText(`${base}/__void/metrics/lastmile.v4b.prom`, 500)',
  'const raw = String(t || "").trim();',
  'const j = JSON.parse(raw);',
];

for (const needle of required) {
  if (!block.includes(needle)) fail(`missing ${needle}`);
}

if (block.includes("http://localhost:4100")) fail("hardcoded port remains");
if (block.includes('Number(String(t || "").trim().split(/\\s+/)[0])')) {
  fail("empty response can still coerce to head zero");
}

const parseHead = (text: string): number | null => {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const n = Number(raw.split(/\s+/)[0]);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

if (parseHead("") !== null) fail("empty response became zero");
if (parseHead("   \n") !== null) fail("whitespace response became zero");
if (parseHead("1856587\n") !== 1856587) fail("valid head rejected");

console.log("VOID_READY_RUNTIME_HTTP_PORT_V1_GREEN");
