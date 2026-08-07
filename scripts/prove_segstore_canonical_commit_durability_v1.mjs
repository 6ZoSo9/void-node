// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import fsDefault, * as fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import * as os from "node:os";
import * as path from "node:path";

import { blockHash, computeRoots } from "../dist/chain/block.js";
import { SegStore } from "../dist/chain/seg_store.js";

const MARKER = "VOID_SEGSTORE_CANONICAL_COMMIT_DURABILITY_V1_PROOF_GREEN";
const DURABILITY = /VOID_SEGSTORE_CANONICAL_COMMIT_DURABILITY_V1/;
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
    proposer: "void-segstore-canonical-commit-durability-proof",
    sig: SHAPE_ONLY_SIGNATURE,
  };
}

function tempRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `void-segstore-canonical-durable-${label}-`));
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

function blocksPath(root) {
  return path.join(segDir(root), "blocks.bin");
}

function indexPath(root) {
  return path.join(segDir(root), "index.sparse");
}

function metaPath(root) {
  return path.join(segDir(root), "meta.json");
}

function walPath(root) {
  return path.join(root, "wal", "00000000.wal");
}

function readMaybe(file) {
  return fs.existsSync(file) ? fs.readFileSync(file).toString("base64") : null;
}

function derivedSnapshot(root) {
  return JSON.stringify({
    index: readMaybe(indexPath(root)),
    meta: readMaybe(metaPath(root)),
  });
}

function readCanonicalFrames(root) {
  const bin = blocksPath(root);
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

function assertExactlyBlocks(root, expectedNumbers) {
  const frames = readCanonicalFrames(root);
  assert.deepEqual(frames.map((frame) => frame.number), expectedNumbers);
  assert.equal(new Set(frames.map((frame) => frame.number)).size, frames.length);
}

function expectDurabilityFailure(run, label) {
  let error = null;
  try {
    run();
  } catch (caught) {
    error = caught;
  }
  assert(error, `${label}: expected canonical commit durability failure`);
  assert.match(error instanceof Error ? error.message : String(error), DURABILITY, label);
}

function withSyntheticAppendFailure(targetPath, run) {
  const originalAppendFileSync = fsDefault.appendFileSync;
  const target = path.resolve(targetPath);
  fsDefault.appendFileSync = function patchedAppendFileSync(file, ...args) {
    if (typeof file === "string" && path.resolve(file) === target) {
      throw new Error(`synthetic append failure for ${target}`);
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

function withSyntheticWriteFileFailure(targetPrefix, run) {
  const originalWriteFileSync = fsDefault.writeFileSync;
  const prefix = path.resolve(targetPrefix);
  fsDefault.writeFileSync = function patchedWriteFileSync(file, ...args) {
    if (typeof file === "string" && path.resolve(file).startsWith(prefix)) {
      throw new Error(`synthetic write failure for ${prefix}`);
    }
    return originalWriteFileSync.call(fsDefault, file, ...args);
  };
  syncBuiltinESMExports();
  try {
    return run();
  } finally {
    fsDefault.writeFileSync = originalWriteFileSync;
    syncBuiltinESMExports();
  }
}

function proveOrdinaryCommitDurability() {
  withRoot("ordinary", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveBlock(block0);
    store.saveBlock(block1);
    assert.equal(store.loadHeadNumber(), 1);
    assertExactlyBlocks(root, [0, 1]);

    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assert.deepEqual(reopened.loadBlock(1), block1);
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(fs.existsSync(walPath(root)), false);
  });
}

function proveCanonicalAppendFailureLatchesUntilRestart() {
  withRoot("append-failure", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveBlock(block0);
    const beforeDerived = derivedSnapshot(root);

    withSyntheticAppendFailure(blocksPath(root), () => {
      expectDurabilityFailure(() => store.saveBlock(block1), "canonical append failure");
    });

    assert.equal(store.loadHeadNumber(), 0);
    assertExactlyBlocks(root, [0]);
    assert.equal(derivedSnapshot(root), beforeDerived);
    assert.ok(fs.existsSync(walPath(root)), "durable WAL intent must survive failed canonical append");
    expectDurabilityFailure(() => store.saveBlock(block1), "same-instance retry after append failure");
    assertExactlyBlocks(root, [0]);

    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(fs.existsSync(walPath(root)), false);
  });
}

function proveVisibleUnconfirmedFrameHealsOnRestartWithoutDuplicate() {
  withRoot("visible-fsync-failure", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveBlock(block0);
    const beforeDerived = derivedSnapshot(root);

    withSyntheticFsyncFailure(blocksPath(root), () => {
      expectDurabilityFailure(() => store.saveBlock(block1), "blocks.bin fsync failure");
    });

    assert.equal(store.loadHeadNumber(), 0, "head must not advance after failed block fsync");
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(derivedSnapshot(root), beforeDerived, "derived state must not advance before canonical durability");
    assert.ok(fs.existsSync(walPath(root)), "WAL intent must remain for restart recovery");

    expectDurabilityFailure(() => store.saveBlock(block1), "same-instance retry after block fsync failure");
    assertExactlyBlocks(root, [0, 1]);

    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assert.deepEqual(reopened.loadBlock(1), block1);
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(fs.existsSync(walPath(root)), false);
  });
}

function proveLostUnconfirmedFrameReplaysExactlyOnce() {
  withRoot("lost-fsync-failure", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveBlock(block0);
    const durableBytesBefore = fs.statSync(blocksPath(root)).size;
    const beforeDerived = derivedSnapshot(root);

    withSyntheticFsyncFailure(blocksPath(root), () => {
      expectDurabilityFailure(() => store.saveBlock(block1), "lost blocks.bin fsync failure");
    });

    assert.equal(store.loadHeadNumber(), 0);
    assert.equal(derivedSnapshot(root), beforeDerived);
    assertExactlyBlocks(root, [0, 1]);

    // Model the crash outcome where the un-fsynced append is not present after restart.
    fs.truncateSync(blocksPath(root), durableBytesBefore);
    assertExactlyBlocks(root, [0]);

    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assert.deepEqual(reopened.loadBlock(1), block1);
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(fs.existsSync(walPath(root)), false);
  });
}

function proveSegmentDirectoryFsyncFailureBlocksHeadAndLatches() {
  withRoot("segment-dir-fsync-failure", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveBlock(block0);
    const beforeDerived = derivedSnapshot(root);

    withSyntheticFsyncFailure(segDir(root), () => {
      expectDurabilityFailure(() => store.saveBlock(block1), "segment directory fsync failure");
    });

    assert.equal(store.loadHeadNumber(), 0);
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(derivedSnapshot(root), beforeDerived);
    expectDurabilityFailure(() => store.saveBlock(block1), "same-instance retry after directory fsync failure");
    assertExactlyBlocks(root, [0, 1]);

    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assertExactlyBlocks(root, [0, 1]);
  });
}

function proveDerivedIndexFailureDoesNotOverrideCanonicalTruth() {
  withRoot("derived-index-failure", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const store = new SegStore(root, { sparseEvery: 1 });
    store.saveBlock(block0);
    const indexBefore = readMaybe(indexPath(root));

    withSyntheticAppendFailure(indexPath(root), () => {
      store.saveBlock(block1);
    });

    assert.equal(store.loadHeadNumber(), 1);
    assert.deepEqual(store.loadBlock(1), block1);
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(readMaybe(indexPath(root)), indexBefore, "failed sparse-index update must not rewrite canonical truth");

    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assertExactlyBlocks(root, [0, 1]);
  });
}

function proveDerivedMetaFailureDoesNotOverrideCanonicalTruth() {
  withRoot("derived-meta-failure", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const store = new SegStore(root, { sparseEvery: 16 });
    store.saveBlock(block0);
    const metaBefore = readMaybe(metaPath(root));

    withSyntheticWriteFileFailure(`${metaPath(root)}.tmp-`, () => {
      store.saveBlock(block1);
    });

    assert.equal(store.loadHeadNumber(), 1);
    assert.deepEqual(store.loadBlock(1), block1);
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(readMaybe(metaPath(root)), metaBefore, "failed metadata update must not rewrite canonical truth");

    const reopened = new SegStore(root, { sparseEvery: 16 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assertExactlyBlocks(root, [0, 1]);
  });
}

proveOrdinaryCommitDurability();
proveCanonicalAppendFailureLatchesUntilRestart();
proveVisibleUnconfirmedFrameHealsOnRestartWithoutDuplicate();
proveLostUnconfirmedFrameReplaysExactlyOnce();
proveSegmentDirectoryFsyncFailureBlocksHeadAndLatches();
proveDerivedIndexFailureDoesNotOverrideCanonicalTruth();
proveDerivedMetaFailureDoesNotOverrideCanonicalTruth();

console.log("canonical_append_failure_head_advanced=false");
console.log("canonical_file_fsync_failure_head_advanced=false");
console.log("canonical_segment_directory_fsync_failure_head_advanced=false");
console.log("same_instance_retry_after_uncertain_commit_allowed=false");
console.log("surviving_unconfirmed_frame_duplicated_on_restart=false");
console.log("lost_unconfirmed_frame_replayed_exactly_once=true");
console.log("derived_sparse_index_is_canonical_authority=false");
console.log("derived_meta_is_canonical_authority=false");
console.log("durable_wal_recovery_preserved=true");
console.log(MARKER);
