#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  blockHash,
  validateBlockForAppend,
} from "../dist/chain/block.js";
import { computeTxRoot } from "../dist/util/txroot.js";

const MARKER = "VOID_FOLLOWER_PRESERVE_CANONICAL_TXROOT_V1";

const source = fs.readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const start = source.indexOf("(function installTxRootSealHook(){");
const end = source.indexOf("// ------------- [ADD] light shim to include txRoot", start);

assert.notEqual(start, -1, "txRoot metrics hook start must exist");
assert.notEqual(end, -1, "txRoot metrics hook end must exist");

const hook = source.slice(start, end);
assert.equal(
  /\bb\.txRoot\s*=/.test(hook),
  false,
  "metrics hook must not assign b.txRoot",
);
assert.equal(
  /computeTxRoot\s*\(\s*txs\s*\)/.test(hook),
  false,
  "metrics hook must not derive a replacement txRoot",
);

const legacyEmpty = computeTxRoot([]);
assert.equal(typeof legacyEmpty, "object");
assert.equal(
  legacyEmpty.root,
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
);
assert.deepEqual(legacyEmpty.leaves, []);

const parent = {
  number: 196018,
  timestamp: 1776329917957,
};

const candidate = {
  number: 196019,
  parentHash: blockHash(parent),
  timestamp: 1776365687561,
  txRoot: "0".repeat(64),
  blobRoot: "0".repeat(64),
  txs: [],
  blobs: [],
  proposer: "9d89483769e469e0473b489dc50dba96",
  sig: "0".repeat(128),
  header: {
    txRoot: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
};

const before = candidate.txRoot;
const modern = validateBlockForAppend(candidate, parent);
assert.deepEqual(modern, { ok: true });
assert.equal(candidate.txRoot, before);
assert.equal(candidate.txRoot, "0".repeat(64));

const distSource = fs.readFileSync(new URL("../dist/index.js", import.meta.url), "utf8");
const distStart = distSource.indexOf("(function installTxRootSealHook()");
const distEnd = distSource.indexOf("// ------------- [ADD] light shim to include txRoot", distStart);
assert.notEqual(distStart, -1, "compiled txRoot metrics hook start must exist");
assert.notEqual(distEnd, -1, "compiled txRoot metrics hook end must exist");
const distHook = distSource.slice(distStart, distEnd);
assert.equal(
  /\bb\.txRoot\s*=/.test(distHook),
  false,
  "compiled metrics hook must not assign b.txRoot",
);
assert.equal(
  /computeTxRoot\s*\(\s*txs\s*\)/.test(distHook),
  false,
  "compiled metrics hook must not derive a replacement txRoot",
);

const workflow = fs.readFileSync(
  new URL("../.github/workflows/void-public-bootstrap-client-resilience-v1.yml", import.meta.url),
  "utf8",
);
for (const required of [
  "src/index.ts",
  "src/util/txroot.ts",
  "scripts/prove_follower_preserve_canonical_txroot_v1.mjs",
  "node scripts/prove_follower_preserve_canonical_txroot_v1.mjs",
]) {
  assert.ok(workflow.includes(required), `CI ownership missing ${required}`);
}

console.log(`marker=${MARKER}`);
console.log("canonical_transition_block=196019");
console.log("modern_validation=true");
console.log("legacy_empty_helper_returns_object=true");
console.log("metrics_hook_txroot_mutation=false");
console.log("canonical_txroot_preserved=true");
console.log(`${MARKER}_GREEN`);
