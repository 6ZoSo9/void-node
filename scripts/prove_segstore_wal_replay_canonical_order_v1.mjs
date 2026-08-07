// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { SegStore } from "../dist/chain/seg_store.js";
import { blockHash, computeRoots } from "../dist/chain/block.js";

const MARKER = "VOID_SEGSTORE_WAL_REPLAY_CANONICAL_ORDER_V1_PROOF_GREEN";
const ZERO_HASH = "0".repeat(64);
const SHAPE_ONLY_SIGNATURE = "00".repeat(64);
const SEG_SPAN = 10_000;

process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = "0";
process.env.VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER = "0";

function segName(number) {
  return String(Math.floor(number / SEG_SPAN) * SEG_SPAN).padStart(8, "0");
}

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
    proposer: "void-segstore-wal-proof",
    sig: SHAPE_ONLY_SIGNATURE,
    ...overrides,
  };
}

function walLine(block) {
  return JSON.stringify({
    v: 1,
    n: block.number,
    b64: Buffer.from(JSON.stringify(block)).toString("base64"),
    ts: 1_700_000_100_000 + block.number,
  });
}

function framedBlock(block) {
  const body = Buffer.from(JSON.stringify(block));
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  return Buffer.concat([len, body]);
}

function seedStore(root, blocks, head) {
  fs.mkdirSync(path.join(root, "segments"), { recursive: true });
  fs.mkdirSync(path.join(root, "wal"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "heads.json"),
    JSON.stringify({ head, number: head, hash: "0x0" }, null, 2),
  );
  fs.writeFileSync(path.join(root, "head.txt"), `${head}\n`);

  const grouped = new Map();
  for (const block of blocks) {
    const seg = segName(block.number);
    if (!grouped.has(seg)) grouped.set(seg, []);
    grouped.get(seg).push(block);
  }

  for (const [seg, segmentBlocks] of grouped) {
    segmentBlocks.sort((a, b) => a.number - b.number);
    const dir = path.join(root, "segments", seg);
    fs.mkdirSync(dir, { recursive: true });
    const frames = segmentBlocks.map(framedBlock);
    fs.writeFileSync(path.join(dir, "blocks.bin"), Buffer.concat(frames));
    fs.writeFileSync(path.join(dir, "index.sparse"), "");
    fs.writeFileSync(
      path.join(dir, "meta.json"),
      JSON.stringify(
        {
          from: Number(seg),
          to: Math.max(...segmentBlocks.map((block) => block.number)),
          bytes: frames.reduce((sum, frame) => sum + frame.length, 0),
          createdAt: 1,
          updatedAt: 1,
        },
        null,
        2,
      ),
    );
  }
}

function writeWal(root, seg, lines) {
  const walDir = path.join(root, "wal");
  fs.mkdirSync(walDir, { recursive: true });
  fs.writeFileSync(path.join(walDir, `${seg}.wal`), `${lines.join("\n")}\n`);
}

function walPath(root, seg) {
  return path.join(root, "wal", `${seg}.wal`);
}

function tempRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `void-segstore-wal-${label}-`));
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

function assertReplayFailure(metrics, fragment) {
  assert.equal(metrics.replay_last_ok, 0);
  assert.match(metrics.replay_last_error, new RegExp(fragment));
}

function proveOutOfOrderLines() {
  const root = tempRoot("out-of-order");
  try {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const block2 = makeBlock(2, block1);
    seedStore(root, [block0], 0);
    writeWal(root, segName(1), [walLine(block2), walLine(block1)]);

    const store = new SegStore(root);
    assert.equal(store.loadHeadNumber(), 2);
    assert.deepEqual(store.loadBlock(1), block1);
    assert.deepEqual(store.loadBlock(2), block2);
    assert.equal(fs.existsSync(walPath(root, segName(1))), false);
    const metrics = store.getWalReplayMetrics();
    assert.equal(metrics.replay_last_ok, 1);
    assert.equal(metrics.replay_last_error, "");
    assert.equal(metrics.replay_entries_applied_total, 2);
  } finally {
    cleanup(root);
  }
}

function proveGapFailsClosed() {
  const root = tempRoot("gap");
  try {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const block2 = makeBlock(2, block1);
    seedStore(root, [block0], 0);
    const line = walLine(block2);
    writeWal(root, segName(2), [line]);

    const store = new SegStore(root);
    assert.equal(store.loadHeadNumber(), 0);
    assert.equal(store.loadBlock(2), null);
    assert.equal(fs.readFileSync(walPath(root, segName(2)), "utf8"), `${line}\n`);
    assert.equal(store.getWalReplayMetrics().replay_entries_applied_total, 0);
    assertReplayFailure(store.getWalReplayMetrics(), "canonical_gap");
  } finally {
    cleanup(root);
  }
}

function proveInvalidParentFailsClosed() {
  const root = tempRoot("bad-parent");
  try {
    const block0 = makeBlock(0);
    const bad1 = makeBlock(1, block0, { parentHash: "f".repeat(64) });
    seedStore(root, [block0], 0);
    const line = walLine(bad1);
    writeWal(root, segName(1), [line]);

    const store = new SegStore(root);
    assert.equal(store.loadHeadNumber(), 0);
    assert.equal(store.loadBlock(1), null);
    assert.equal(fs.readFileSync(walPath(root, segName(1)), "utf8"), `${line}\n`);
    assert.equal(store.getWalReplayMetrics().replay_entries_applied_total, 0);
    assertReplayFailure(store.getWalReplayMetrics(), "parent_hash_mismatch");
  } finally {
    cleanup(root);
  }
}

function proveMalformedEvidenceRetained() {
  const root = tempRoot("malformed");
  try {
    const block0 = makeBlock(0);
    seedStore(root, [block0], 0);
    const malformed = "{not-json";
    writeWal(root, segName(1), [malformed]);

    const store = new SegStore(root);
    assert.equal(store.loadHeadNumber(), 0);
    assert.equal(fs.readFileSync(walPath(root, segName(1)), "utf8"), `${malformed}\n`);
    assert.equal(store.getWalReplayMetrics().replay_entries_applied_total, 0);
    assertReplayFailure(store.getWalReplayMetrics(), "malformed_record");
  } finally {
    cleanup(root);
  }
}

function proveExistingBlockHeadHeal() {
  const root = tempRoot("head-heal");
  try {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    seedStore(root, [block0, block1], 0);
    writeWal(root, segName(1), [walLine(block1)]);

    const store = new SegStore(root);
    assert.equal(store.loadHeadNumber(), 1);
    assert.deepEqual(store.loadBlock(1), block1);
    assert.equal(fs.existsSync(walPath(root, segName(1))), false);
    const metrics = store.getWalReplayMetrics();
    assert.equal(metrics.replay_last_ok, 1);
    assert.equal(metrics.replay_entries_applied_total, 1);
  } finally {
    cleanup(root);
  }
}

function proveExistingConflictFailsClosed() {
  const root = tempRoot("conflict");
  try {
    const block0 = makeBlock(0);
    const replayed1 = makeBlock(1, block0);
    const conflicting1 = makeBlock(1, block0, { timestamp: replayed1.timestamp + 99 });
    seedStore(root, [block0, conflicting1], 0);
    const line = walLine(replayed1);
    writeWal(root, segName(1), [line]);

    const store = new SegStore(root);
    assert.equal(store.loadHeadNumber(), 0);
    assert.deepEqual(store.loadBlock(1), conflicting1);
    assert.equal(fs.readFileSync(walPath(root, segName(1)), "utf8"), `${line}\n`);
    assert.equal(store.getWalReplayMetrics().replay_entries_applied_total, 0);
    assertReplayFailure(store.getWalReplayMetrics(), "existing_block_conflict");
  } finally {
    cleanup(root);
  }
}

function proveAlreadyAppliedDoesNotInflateMetric() {
  const root = tempRoot("already-applied");
  try {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    seedStore(root, [block0, block1], 1);
    writeWal(root, segName(1), [walLine(block1)]);

    const store = new SegStore(root);
    assert.equal(store.loadHeadNumber(), 1);
    assert.equal(fs.existsSync(walPath(root, segName(1))), false);
    const metrics = store.getWalReplayMetrics();
    assert.equal(metrics.replay_last_ok, 1);
    assert.equal(metrics.replay_entries_applied_total, 0);
  } finally {
    cleanup(root);
  }
}

function proveCrossSegmentCanonicalOrder() {
  const root = tempRoot("cross-segment");
  try {
    // This boundary deliberately crosses from an eight-digit segment filename
    // to a nine-digit filename. Plain lexical sorting would put 100000000.wal
    // before 99990000.wal and would strand the future record behind a gap.
    const block99999998 = makeBlock(99_999_998);
    const block99999999 = makeBlock(99_999_999, block99999998);
    const block100000000 = makeBlock(100_000_000, block99999999);
    seedStore(root, [block99999998], 99_999_998);

    // Create the future segment first on purpose. Recovery must use numeric
    // canonical segment order, never directory enumeration or lexical order.
    writeWal(root, segName(100_000_000), [walLine(block100000000)]);
    writeWal(root, segName(99_999_999), [walLine(block99999999)]);

    const store = new SegStore(root);
    assert.equal(store.loadHeadNumber(), 100_000_000);
    assert.deepEqual(store.loadBlock(99_999_999), block99999999);
    assert.deepEqual(store.loadBlock(100_000_000), block100000000);
    assert.equal(fs.existsSync(walPath(root, segName(99_999_999))), false);
    assert.equal(fs.existsSync(walPath(root, segName(100_000_000))), false);
    const metrics = store.getWalReplayMetrics();
    assert.equal(metrics.replay_last_ok, 1);
    assert.equal(metrics.replay_entries_applied_total, 2);
  } finally {
    cleanup(root);
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.resolve(here, "../src/chain/seg_store.ts"), "utf8");
assert(source.includes("const aSeg = Number(a.replace(/\\.wal$/, \"\"));"));
assert(source.includes("return aSeg - bSeg;"));
assert(source.includes("const valid = validateBlockForAppend(blk, parent as any);"));
assert(source.includes("if (n > head + 1)"));
assert(source.includes("existing_block_conflict"));

proveOutOfOrderLines();
proveGapFailsClosed();
proveInvalidParentFailsClosed();
proveMalformedEvidenceRetained();
proveExistingBlockHeadHeal();
proveExistingConflictFailsClosed();
proveAlreadyAppliedDoesNotInflateMetric();
proveCrossSegmentCanonicalOrder();

console.log(MARKER);
console.log("wal_replay_uses_validate_block_for_append=true");
console.log("wal_replay_requires_exact_next_height=true");
console.log("wal_replay_sorts_records_by_block_number=true");
console.log("wal_replay_sorts_segment_files=true");
console.log("wal_replay_retains_malformed_gap_conflict_evidence=true");
console.log("wal_replay_applied_metric_counts_real_advances_only=true");
console.log("wallet_signer_validator_wc_money_authority=0");
