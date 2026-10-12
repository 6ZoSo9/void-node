// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import fsDefault, * as fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import * as os from "node:os";
import * as path from "node:path";

import { blockHash, computeRoots } from "../dist/chain/block.js";
import { SegStore } from "../dist/chain/seg_store.js";

const MARKER = "VOID_SEGSTORE_WAL_INTENT_DURABILITY_V1_PROOF_GREEN";
const DURABILITY = /VOID_SEGSTORE_WAL_INTENT_DURABILITY_V1/;
const ZERO_HASH = "0".repeat(64);
const SHAPE_ONLY_SIGNATURE = "00".repeat(64);

process.env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED = "0";
process.env.VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER = "0";

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
    proposer: "void-segstore-wal-intent-durability-proof",
    sig: SHAPE_ONLY_SIGNATURE,
  };
}

function tempRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `void-segstore-wal-durable-${label}-`));
}

function withRoot(label, run) {
  const root = tempRoot(label);
  try {
    return run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function segDir(root) {
  return path.join(root, "segments", "00000000");
}

function walPath(root) {
  return path.join(root, "wal", "00000000.wal");
}

function readMaybe(root, rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p).toString("base64") : null;
}

function canonicalSnapshot(root) {
  return JSON.stringify({
    blocks: readMaybe(root, "segments/00000000/blocks.bin"),
    index: readMaybe(root, "segments/00000000/index.sparse"),
    meta: readMaybe(root, "segments/00000000/meta.json"),
    heads: readMaybe(root, "heads.json"),
    headText: readMaybe(root, "head.txt"),
  });
}

function seedEmptySegment(root) {
  const dir = segDir(root);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "blocks.bin"), Buffer.alloc(0));
  fs.writeFileSync(path.join(dir, "index.sparse"), "");
  fs.writeFileSync(
    path.join(dir, "meta.json"),
    JSON.stringify({ from: 0, to: -1, bytes: 0, createdAt: 1, updatedAt: 1 }, null, 2),
  );
}

function readCanonicalFrames(root) {
  const bin = path.join(segDir(root), "blocks.bin");
  if (!fs.existsSync(bin)) return [];
  const bytes = fs.readFileSync(bin);
  const frames = [];
  let off = 0;
  while (off < bytes.length) {
    assert.ok(bytes.length - off >= 4, `short canonical frame prefix at ${off}`);
    const len = bytes.readUInt32BE(off);
    const start = off + 4;
    const end = start + len;
    assert.ok(end <= bytes.length, `short canonical frame body at ${off}`);
    frames.push(JSON.parse(bytes.subarray(start, end).toString("utf8")));
    off = end;
  }
  return frames;
}

function expectDurabilityFailure(run, label) {
  let error = null;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  assert(error, `${label}: expected WAL durability failure`);
  assert.match(error instanceof Error ? error.message : String(error), DURABILITY, label);
}

function withSyntheticAppendFailure(targetPath, run) {
  const originalAppendFileSync = fsDefault.appendFileSync;
  fsDefault.appendFileSync = function patchedAppendFileSync(file, ...args) {
    if (typeof file === "string" && path.resolve(file) === path.resolve(targetPath)) {
      throw new Error("synthetic WAL append failure");
    }
    return originalAppendFileSync.call(fsDefault, file, ...args);
  };
  syncBuiltinESMExports();
  try {
    return run();
  } finally {
    fsDefault.appendFileSync = originalAppendFileSync;
    syncBuiltinESMExports();
  }
}

function withSyntheticFsyncFailure(targetPath, run) {
  const originalOpenSync = fsDefault.openSync;
  const originalFsyncSync = fsDefault.fsyncSync;
  const tracked = new Set();
  const target = path.resolve(targetPath);

  fsDefault.openSync = function patchedOpenSync(file, ...args) {
    const fd = originalOpenSync.call(fsDefault, file, ...args);
    if (typeof file === "string" && path.resolve(file) === target) tracked.add(fd);
    return fd;
  };
  fsDefault.fsyncSync = function patchedFsyncSync(fd) {
    if (tracked.has(fd)) throw new Error(`synthetic fsync failure for ${target}`);
    return originalFsyncSync.call(fsDefault, fd);
  };
  syncBuiltinESMExports();

  try {
    return run();
  } finally {
    fsDefault.openSync = originalOpenSync;
    fsDefault.fsyncSync = originalFsyncSync;
    syncBuiltinESMExports();
  }
}

function assertExactlyBlocks(root, expectedNumbers) {
  const frames = readCanonicalFrames(root);
  assert.deepEqual(frames.map((frame) => frame.number), expectedNumbers);
  assert.equal(new Set(frames.map((frame) => frame.number)).size, frames.length);
}

function proveOrdinaryDurableWriteAndReplayCleanup() {
  withRoot("ordinary", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const store = new SegStore(root, { sparseEvery: 1 });

    store.saveBlock(block0);
    store.saveBlock(block1);
    assert.equal(store.loadHeadNumber(), 1);
    assertExactlyBlocks(root, [0, 1]);
    assert.ok(fs.existsSync(walPath(root)), "normal save should leave replay intent until replay cleanup");

    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assert.deepEqual(reopened.loadBlock(1), block1);
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(fs.existsSync(walPath(root)), false, "replay should prune durable completed intents");
  });
}

function proveWalAppendFailureBlocksCanonicalCommit() {
  withRoot("append-failure", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveBlock(block0);

    const before = canonicalSnapshot(root);
    withSyntheticAppendFailure(walPath(root), () => {
      expectDurabilityFailure(() => store.saveBlock(block1), "WAL append failure");
    });

    assert.equal(canonicalSnapshot(root), before, "WAL append failure must not mutate canonical state");
    assert.equal(store.loadHeadNumber(), 0);
    assert.equal(store.loadBlock(1), null);

    store.saveBlock(block1);
    assert.equal(store.loadHeadNumber(), 1);
    assertExactlyBlocks(root, [0, 1]);
  });
}

function proveWalFileFsyncFailureBlocksCanonicalCommit() {
  withRoot("file-fsync-failure", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveBlock(block0);

    const before = canonicalSnapshot(root);
    withSyntheticFsyncFailure(walPath(root), () => {
      expectDurabilityFailure(() => store.saveBlock(block1), "WAL file fsync failure");
    });

    assert.equal(canonicalSnapshot(root), before, "WAL file fsync failure must not mutate canonical state");
    assert.equal(store.loadHeadNumber(), 0);
    assert.equal(store.loadBlock(1), null);

    store.saveBlock(block1);
    assert.equal(store.loadHeadNumber(), 1);
    assertExactlyBlocks(root, [0, 1]);

    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assertExactlyBlocks(root, [0, 1]);
  });
}

function proveNewWalDirectoryFsyncFailureBlocksCanonicalCommit() {
  withRoot("directory-fsync-failure", (root) => {
    const block0 = makeBlock(0);
    const store = new SegStore(root, { sparseEvery: 1 });
    seedEmptySegment(root);
    const before = canonicalSnapshot(root);

    withSyntheticFsyncFailure(path.join(root, "wal"), () => {
      expectDurabilityFailure(() => store.saveBlock(block0), "new WAL directory fsync failure");
    });

    assert.equal(canonicalSnapshot(root), before, "WAL directory fsync failure must not mutate canonical state");
    assert.equal(store.loadHeadNumber(), -1);
    assert.equal(store.loadBlock(0), null);
    assert.ok(fs.existsSync(walPath(root)), "failed directory fsync may leave a visible uncommitted WAL intent");

    store.saveBlock(block0);
    assert.equal(store.loadHeadNumber(), 0);
    assertExactlyBlocks(root, [0]);

    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 0);
    assertExactlyBlocks(root, [0]);
  });
}

proveOrdinaryDurableWriteAndReplayCleanup();
proveWalAppendFailureBlocksCanonicalCommit();
proveWalFileFsyncFailureBlocksCanonicalCommit();
proveNewWalDirectoryFsyncFailureBlocksCanonicalCommit();

console.log("wal_append_failure_canonical_commit=false");
console.log("wal_file_fsync_failure_canonical_commit=false");
console.log("new_wal_directory_fsync_failure_canonical_commit=false");
console.log("restored_retry_duplicate_canonical_frames=false");
console.log("durable_wal_replay_cleanup_preserved=true");
console.log(MARKER);
