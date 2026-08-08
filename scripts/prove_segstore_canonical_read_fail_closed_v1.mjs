// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { blockHash, computeRoots } from "../dist/chain/block.js";
import { SegStore } from "../dist/chain/seg_store.js";

const MARKER = "VOID_SEGSTORE_CANONICAL_READ_FAIL_CLOSED_V1_PROOF_GREEN";
const CORRUPTION = /VOID_SEGSTORE_CANONICAL_READ_CORRUPTION_V1/;
const ZERO_HASH = "0".repeat(64);
const SHAPE_ONLY_SIGNATURE = "00".repeat(64);

process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = "0";
process.env.VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER = "0";

function makeBlock(number, parent = null, overrides = {}) {
  const txs = [];
  const blobs = [];
  const roots = computeRoots(txs, blobs);
  return {
    number,
    parentHash: parent ? blockHash(parent) : ZERO_HASH,
    timestamp: 1_700_000_000_000 + number,
    txRoot: roots.txRoot,
    blobRoot: roots.blobRoot,
    txs,
    blobs,
    proposer: "void-segstore-canonical-read-proof",
    sig: SHAPE_ONLY_SIGNATURE,
    ...overrides,
  };
}

function frameValue(value) {
  const body = Buffer.from(JSON.stringify(value), "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  return Buffer.concat([len, body]);
}

function frameRaw(body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

function tempRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `void-segstore-read-${label}-`));
}

function seedRoot(root, head = -1) {
  fs.mkdirSync(path.join(root, "segments"), { recursive: true });
  fs.mkdirSync(path.join(root, "wal"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "heads.json"),
    JSON.stringify({ head, number: head, hash: "0x0" }, null, 2),
  );
  fs.writeFileSync(path.join(root, "head.txt"), `${head}\n`);
}

function writeSegment(root, bytes, indexText = "") {
  const dir = path.join(root, "segments", "00000000");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "blocks.bin"), bytes);
  fs.writeFileSync(path.join(dir, "index.sparse"), indexText);
  fs.writeFileSync(
    path.join(dir, "meta.json"),
    JSON.stringify({ from: 0, to: -1, bytes: bytes.length, createdAt: 1, updatedAt: 1 }, null, 2),
  );
}

function expectCorruption(run, label) {
  let error = null;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  assert(error, `${label}: expected canonical read corruption`);
  assert.match(error instanceof Error ? error.message : String(error), CORRUPTION, label);
}

function withRoot(label, run) {
  const root = tempRoot(label);
  try {
    return run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function proveOrdinaryReadAndTrueAbsence() {
  withRoot("ordinary", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveBlock(block0);
    store.saveBlock(block1);

    assert.deepEqual(store.loadBlock(0), block0);
    assert.deepEqual(store.loadBlock(1), block1);
    assert.equal(store.loadBlock(2), null);
  });
}

function proveSegmentMayBeginAboveBase() {
  withRoot("partial-leading-gap", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    seedRoot(root, 1);
    writeSegment(root, frameValue(block1));

    const store = new SegStore(root);
    assert.equal(store.loadBlock(0), null);
    assert.deepEqual(store.loadBlock(1), block1);
  });
}

function provePoisonedSparseIndexFallsBack() {
  withRoot("poison-index", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const block2 = makeBlock(2, block1);
    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveBlock(block0);
    store.saveBlock(block1);
    store.saveBlock(block2);

    const idx = path.join(root, "segments", "00000000", "index.sparse");
    fs.writeFileSync(idx, '{"n":2,"off":999999}\n');
    assert.deepEqual(store.loadBlock(2), block2);

    fs.writeFileSync(idx, '{"n":2,"off":1}\n');
    assert.deepEqual(store.loadBlock(2), block2);

    fs.writeFileSync(idx, 'not-json\n');
    assert.deepEqual(store.loadBlock(2), block2);
  });
}

function proveMalformedCompleteJsonFailsClosed() {
  withRoot("bad-json", (root) => {
    seedRoot(root, 0);
    writeSegment(root, frameRaw("{not-valid-json"));
    const store = new SegStore(root);
    expectCorruption(() => store.loadBlock(0), "complete malformed JSON");
  });
}

function proveInvalidBlockNumberFailsClosed() {
  withRoot("bad-number", (root) => {
    seedRoot(root, 0);
    writeSegment(root, frameValue({ number: "0", payload: "bad" }));
    const store = new SegStore(root);
    expectCorruption(() => store.loadBlock(0), "invalid block number");
  });
}

function proveWrongSegmentFailsClosed() {
  withRoot("wrong-segment", (root) => {
    seedRoot(root, 0);
    writeSegment(root, frameValue({ number: 10_000, payload: "wrong-segment" }));
    const store = new SegStore(root);
    expectCorruption(() => store.loadBlock(0), "wrong segment frame");
  });
}

function proveNonContiguousFramesFailClosed() {
  withRoot("gap", (root) => {
    const block0 = makeBlock(0);
    const block2 = makeBlock(2, block0);
    seedRoot(root, 2);
    writeSegment(root, Buffer.concat([frameValue(block0), frameValue(block2)]));
    const store = new SegStore(root);
    expectCorruption(() => store.loadBlock(2), "non-contiguous frames");
  });
}

function proveTornLengthPrefixFailsClosed() {
  withRoot("torn-prefix", (root) => {
    const block0 = makeBlock(0);
    seedRoot(root, 1);
    writeSegment(root, Buffer.concat([frameValue(block0), Buffer.from([0, 0])]));
    const store = new SegStore(root);
    expectCorruption(() => store.loadBlock(1), "torn length prefix");
  });
}

function proveTornBodyFailsClosed() {
  withRoot("torn-body", (root) => {
    const block0 = makeBlock(0);
    const declared = Buffer.alloc(4);
    declared.writeUInt32BE(10, 0);
    seedRoot(root, 1);
    writeSegment(root, Buffer.concat([frameValue(block0), declared, Buffer.from("abc") ]));
    const store = new SegStore(root);
    expectCorruption(() => store.loadBlock(1), "torn frame body");
  });
}

function proveEarlierSatisfiedReadDoesNotInspectLaterTornTail() {
  withRoot("earlier-read", (root) => {
    const block0 = makeBlock(0);
    seedRoot(root, 0);
    writeSegment(root, Buffer.concat([frameValue(block0), Buffer.from([0, 0, 0])]));
    const store = new SegStore(root);
    assert.deepEqual(store.loadBlock(0), block0);
  });
}

proveOrdinaryReadAndTrueAbsence();
proveSegmentMayBeginAboveBase();
provePoisonedSparseIndexFallsBack();
proveMalformedCompleteJsonFailsClosed();
proveInvalidBlockNumberFailsClosed();
proveWrongSegmentFailsClosed();
proveNonContiguousFramesFailClosed();
proveTornLengthPrefixFailsClosed();
proveTornBodyFailsClosed();
proveEarlierSatisfiedReadDoesNotInspectLaterTornTail();

console.log("ordinary_missing_block_returns_null=true");
console.log("non_base_first_frame_supported=true");
console.log("poisoned_sparse_index_false_absence=false");
console.log("malformed_complete_frame_returns_null=false");
console.log("invalid_block_number_returns_null=false");
console.log("wrong_segment_frame_returns_null=false");
console.log("non_contiguous_frame_returns_null=false");
console.log("torn_prefix_returns_null=false");
console.log("torn_body_returns_null=false");
console.log("corruption_after_satisfied_read_blocks_earlier_read=false");
console.log(MARKER);
