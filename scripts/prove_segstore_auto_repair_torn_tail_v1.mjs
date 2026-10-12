// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { autoRepairDataDir } from "../dist/chain/auto_repair.js";
import { blockHash, computeRoots } from "../dist/chain/block.js";
import { SegStore } from "../dist/chain/seg_store.js";

const MARKER = "VOID_SEGSTORE_AUTO_REPAIR_TORN_TAIL_V1_PROOF_GREEN";
const ZERO_HASH = "0".repeat(64);
const SHAPE_ONLY_SIGNATURE = "00".repeat(64);
const SEG_SPAN = 10_000;

process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = "0";
process.env.VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER = "0";

function segName(number) {
  return String(Math.floor(number / SEG_SPAN) * SEG_SPAN).padStart(8, "0");
}

function makeBlock(number, parent = null) {
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
    proposer: "void-auto-repair-proof",
    sig: SHAPE_ONLY_SIGNATURE,
  };
}

function frame(block) {
  const body = Buffer.from(JSON.stringify(block));
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  return Buffer.concat([len, body]);
}

function rawFrame(bodyText) {
  const body = Buffer.from(bodyText);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  return Buffer.concat([len, body]);
}

function tempRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `void-auto-repair-${label}-`));
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

function segmentPaths(root, segment) {
  const dir = path.join(root, "segments", segment);
  return {
    dir,
    bin: path.join(dir, "blocks.bin"),
    idx: path.join(dir, "index.sparse"),
    meta: path.join(dir, "meta.json"),
  };
}

function writeSegment(root, blocks, options = {}) {
  assert(blocks.length > 0);
  const segment = segName(blocks[0].number);
  assert(blocks.every((block) => segName(block.number) === segment));
  const paths = segmentPaths(root, segment);
  fs.mkdirSync(paths.dir, { recursive: true });
  const bytes = Buffer.concat(blocks.map(frame));
  fs.writeFileSync(paths.bin, bytes);
  fs.writeFileSync(paths.idx, options.index ?? "");
  fs.writeFileSync(
    paths.meta,
    JSON.stringify(
      options.meta ?? {
        from: Number(segment),
        to: blocks[blocks.length - 1].number,
        bytes: bytes.length,
        createdAt: 1,
        updatedAt: 1,
      },
      null,
      2,
    ),
  );
  return { segment, paths, bytes };
}

function writeHeads(root, head) {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, "heads.json"),
    JSON.stringify({ head, number: head, hash: "0x0" }, null, 2),
  );
  fs.writeFileSync(path.join(root, "head.txt"), `${head}\n`);
}

async function proveTornTailTruncatedBeforeAppend() {
  const root = tempRoot("torn-tail");
  try {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const baseFrame = frame(block0);
    const tornFrame = frame(block1);
    const { paths } = writeSegment(root, [block0]);
    fs.appendFileSync(paths.bin, tornFrame.subarray(0, 11));
    writeHeads(root, 0);

    const beforeBytes = fs.statSync(paths.bin).size;
    const result = await autoRepairDataDir(root, { sparseEvery: 1 });
    assert.equal(result.ok, true);
    assert.equal(result.repairedTornSegments, 1);
    assert.equal(result.tornTailBytesTruncated, 11);
    assert.equal(fs.statSync(paths.bin).size, baseFrame.length);
    assert.equal(beforeBytes - fs.statSync(paths.bin).size, 11);

    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveBlock(block1);
    assert.deepEqual(store.loadBlock(1), block1);
    assert.equal(store.loadHeadNumber(), 1);
  } finally {
    cleanup(root);
  }
}

async function proveCompleteMalformedFrameFailsClosed() {
  const root = tempRoot("complete-malformed");
  try {
    const block0 = makeBlock(0);
    const { paths } = writeSegment(root, [block0]);
    const malformed = rawFrame("{not-json}");
    fs.appendFileSync(paths.bin, malformed);
    writeHeads(root, 0);
    const before = fs.readFileSync(paths.bin);

    await assert.rejects(
      () => autoRepairDataDir(root, { sparseEvery: 1 }),
      /complete frame JSON invalid/,
    );
    assert.deepEqual(fs.readFileSync(paths.bin), before);
  } finally {
    cleanup(root);
  }
}

async function provePoisonedIndexAndMetaRebuilt() {
  const root = tempRoot("poisoned-index-meta");
  try {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const frame0 = frame(block0);
    const frame1 = frame(block1);
    const { paths } = writeSegment(root, [block0, block1], {
      index: `${JSON.stringify({ n: 1, off: 999999 })}\n`,
      meta: {
        from: 12345678,
        to: 999999,
        bytes: 999999,
        createdAt: 123,
        updatedAt: 456,
      },
    });
    writeHeads(root, 999999);

    const result = await autoRepairDataDir(root, { sparseEvery: 1 });
    assert.equal(result.head, 1);

    const expectedIndex =
      `${JSON.stringify({ n: 0, off: 0 })}\n` +
      `${JSON.stringify({ n: 1, off: frame0.length })}\n`;
    assert.equal(fs.readFileSync(paths.idx, "utf8"), expectedIndex);

    const meta = JSON.parse(fs.readFileSync(paths.meta, "utf8"));
    assert.equal(meta.from, 0);
    assert.equal(meta.to, 1);
    assert.equal(meta.bytes, frame0.length + frame1.length);
    assert.equal(meta.createdAt, 123);

    const heads = JSON.parse(fs.readFileSync(path.join(root, "heads.json"), "utf8"));
    assert.equal(heads.head, 1);
    assert.equal(heads.number, 1);
    assert.equal(fs.readFileSync(path.join(root, "head.txt"), "utf8"), "1\n");
  } finally {
    cleanup(root);
  }
}

async function proveNineDigitSegmentDiscovered() {
  const root = tempRoot("nine-digit-segment");
  try {
    const low = makeBlock(99_999_999);
    const high = makeBlock(100_000_000, low);
    writeSegment(root, [low]);
    const highSegment = writeSegment(root, [high]);
    writeHeads(root, -1);

    assert.equal(highSegment.segment, "100000000");
    const result = await autoRepairDataDir(root, { sparseEvery: 1 });
    assert.equal(result.segs, 2);
    assert.equal(result.head, 100_000_000);

    const highMeta = JSON.parse(fs.readFileSync(highSegment.paths.meta, "utf8"));
    assert.equal(highMeta.from, 100_000_000);
    assert.equal(highMeta.to, 100_000_000);
  } finally {
    cleanup(root);
  }
}

async function proveCompleteWrongSegmentFrameRejected() {
  const root = tempRoot("wrong-segment");
  try {
    const block = makeBlock(100_000_000);
    const wrongSegment = "99990000";
    const paths = segmentPaths(root, wrongSegment);
    fs.mkdirSync(paths.dir, { recursive: true });
    fs.writeFileSync(paths.bin, frame(block));
    fs.writeFileSync(paths.idx, "");
    fs.writeFileSync(paths.meta, "{}");
    writeHeads(root, -1);
    const before = fs.readFileSync(paths.bin);

    await assert.rejects(
      () => autoRepairDataDir(root),
      /complete frame segment mismatch/,
    );
    assert.deepEqual(fs.readFileSync(paths.bin), before);
  } finally {
    cleanup(root);
  }
}

async function provePartialLengthPrefixTruncated() {
  const root = tempRoot("partial-prefix");
  try {
    const block0 = makeBlock(0);
    const { paths } = writeSegment(root, [block0]);
    fs.appendFileSync(paths.bin, Buffer.from([0xde, 0xad]));
    writeHeads(root, 0);

    const result = await autoRepairDataDir(root);
    assert.equal(result.repairedTornSegments, 1);
    assert.equal(result.tornTailBytesTruncated, 2);
    assert.equal(fs.statSync(paths.bin).size, frame(block0).length);
  } finally {
    cleanup(root);
  }
}

const source = fs.readFileSync("src/chain/auto_repair.ts", "utf8");
assert.match(source, /segmentBaseFromName/);
assert.match(source, /fs\.truncateSync\(binPath, completeBytes\)/);
assert.match(source, /complete frame JSON invalid/);
assert.match(source, /rebuildSparseIndex/);
assert.match(source, /head: globalHead/);
assert.doesNotMatch(source, /\/\^\\d\{8\}\$\//);
assert.doesNotMatch(source, /Math\.max\(m\.to, scan\.lastN\)/);
assert.doesNotMatch(source, /Math\.max\(m\.bytes, scan\.totalBytes\)/);

await proveTornTailTruncatedBeforeAppend();
await proveCompleteMalformedFrameFailsClosed();
await provePoisonedIndexAndMetaRebuilt();
await proveNineDigitSegmentDiscovered();
await proveCompleteWrongSegmentFrameRejected();
await provePartialLengthPrefixTruncated();

console.log(MARKER);
console.log("torn_trailing_frame_truncated_to_last_complete_boundary=true");
console.log("post_repair_append_readable=true");
console.log("complete_malformed_frame_auto_deleted=false");
console.log("nonempty_poisoned_sparse_index_trusted=false");
console.log("overstated_meta_preserved=false");
console.log("overstated_head_preserved=false");
console.log("nine_plus_digit_segment_names_supported=true");
console.log("wrong_segment_complete_frame_accepted=false");
console.log("partial_length_prefix_truncated=true");
console.log("runtime_live_chain_mutation_performed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
