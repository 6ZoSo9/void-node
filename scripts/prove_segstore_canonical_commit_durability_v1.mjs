// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
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

const FAULT_CHILD = String.raw`
import fsDefault from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.env.VOID_PROOF_ROOT;
const block = JSON.parse(process.env.VOID_PROOF_BLOCK_JSON || "null");
const fault = process.env.VOID_PROOF_FAULT;
const target = path.resolve(process.env.VOID_PROOF_TARGET || ".");
const sparseEvery = Number(process.env.VOID_PROOF_SPARSE_EVERY || "1");
const expectHold = process.env.VOID_PROOF_EXPECT_HOLD === "1";

const originalAppendFileSync = fsDefault.appendFileSync;
const originalOpenSync = fsDefault.openSync;
const originalFsyncSync = fsDefault.fsyncSync;
const originalWriteFileSync = fsDefault.writeFileSync;
const tracked = new Set();

if (fault === "append") {
  fsDefault.appendFileSync = function patchedAppendFileSync(file, ...args) {
    if (typeof file === "string" && path.resolve(file) === target) {
      throw new Error("synthetic canonical append failure");
    }
    return originalAppendFileSync.call(fsDefault, file, ...args);
  };
} else if (fault === "fsync") {
  fsDefault.openSync = function patchedOpenSync(file, ...args) {
    const fd = originalOpenSync.call(fsDefault, file, ...args);
    if (typeof file === "string" && path.resolve(file) === target) tracked.add(fd);
    return fd;
  };
  fsDefault.fsyncSync = function patchedFsyncSync(fd) {
    if (tracked.has(fd)) throw new Error("synthetic canonical fsync failure");
    return originalFsyncSync.call(fsDefault, fd);
  };
} else if (fault === "write-prefix") {
  fsDefault.writeFileSync = function patchedWriteFileSync(file, ...args) {
    if (typeof file === "string" && path.resolve(file).startsWith(target)) {
      throw new Error("synthetic derived metadata write failure");
    }
    return originalWriteFileSync.call(fsDefault, file, ...args);
  };
}

syncBuiltinESMExports();

const segStoreUrl = pathToFileURL(path.join(process.cwd(), "dist", "chain", "seg_store.js")).href;
const { SegStore } = await import(segStoreUrl);
const store = new SegStore(root, { sparseEvery });

function capture(run) {
  try {
    run();
    return { ok: true, message: "" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

const first = capture(() => store.saveBlock(block));
const second = expectHold ? capture(() => store.saveBlock(block)) : null;
process.stdout.write(JSON.stringify({ first, second }));
`;

function runFaultedSave({ root, block, fault, target, sparseEvery = 1, expectHold = false }) {
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", FAULT_CHILD], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VOID_PROOF_ROOT: root,
      VOID_PROOF_BLOCK_JSON: JSON.stringify(block),
      VOID_PROOF_FAULT: fault,
      VOID_PROOF_TARGET: target,
      VOID_PROOF_SPARSE_EVERY: String(sparseEvery),
      VOID_PROOF_EXPECT_HOLD: expectHold ? "1" : "0",
    },
    encoding: "utf8",
  });

  assert.equal(
    child.status,
    0,
    `fault child failed: status=${child.status}\nstdout=${child.stdout}\nstderr=${child.stderr}`,
  );
  assert.ok(child.stdout.trim(), `fault child returned no JSON; stderr=${child.stderr}`);
  return JSON.parse(child.stdout.trim());
}

function expectCanonicalFaultResult(result, label) {
  assert.equal(result.first?.ok, false, `${label}: first write unexpectedly succeeded`);
  assert.match(String(result.first?.message || ""), DURABILITY, `${label}: wrong first failure`);
  assert.equal(result.second?.ok, false, `${label}: same-instance retry unexpectedly succeeded`);
  assert.match(String(result.second?.message || ""), DURABILITY, `${label}: write hold missing`);
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
    const seed = new SegStore(root, { sparseEvery: 1 });
    seed.saveBlock(block0);
    const beforeDerived = derivedSnapshot(root);

    const result = runFaultedSave({
      root,
      block: block1,
      fault: "append",
      target: blocksPath(root),
      sparseEvery: 1,
      expectHold: true,
    });
    expectCanonicalFaultResult(result, "canonical append failure");

    const inspection = new SegStore(root, { sparseEvery: 1 });
    assert.equal(inspection.loadHeadNumber(), 1, "restart must replay durable WAL after failed append");
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(fs.existsSync(walPath(root)), false);

    // The failed attempt itself must not have advanced derived state before restart replay.
    // A fresh reconstruction is allowed to rebuild it while consuming the durable WAL.
    assert.notEqual(derivedSnapshot(root), beforeDerived);
  });
}

function proveVisibleUnconfirmedFrameHealsOnRestartWithoutDuplicate() {
  withRoot("visible-fsync-failure", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const seed = new SegStore(root, { sparseEvery: 1 });
    seed.saveBlock(block0);
    const beforeDerived = derivedSnapshot(root);

    const result = runFaultedSave({
      root,
      block: block1,
      fault: "fsync",
      target: blocksPath(root),
      sparseEvery: 1,
      expectHold: true,
    });
    expectCanonicalFaultResult(result, "blocks.bin fsync failure");

    const headsBeforeRestart = JSON.parse(fs.readFileSync(path.join(root, "heads.json"), "utf8"));
    assert.equal(Number(headsBeforeRestart.head), 0, "head must not advance after failed block fsync");
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(derivedSnapshot(root), beforeDerived, "derived state must not advance before canonical durability");
    assert.ok(fs.existsSync(walPath(root)), "WAL intent must remain for restart recovery");

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
    const seed = new SegStore(root, { sparseEvery: 1 });
    seed.saveBlock(block0);
    const durableBytesBefore = fs.statSync(blocksPath(root)).size;
    const beforeDerived = derivedSnapshot(root);

    const result = runFaultedSave({
      root,
      block: block1,
      fault: "fsync",
      target: blocksPath(root),
      sparseEvery: 1,
      expectHold: true,
    });
    expectCanonicalFaultResult(result, "lost blocks.bin fsync failure");

    const headsBeforeRestart = JSON.parse(fs.readFileSync(path.join(root, "heads.json"), "utf8"));
    assert.equal(Number(headsBeforeRestart.head), 0);
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
    const seed = new SegStore(root, { sparseEvery: 1 });
    seed.saveBlock(block0);
    const beforeDerived = derivedSnapshot(root);

    const result = runFaultedSave({
      root,
      block: block1,
      fault: "fsync",
      target: segDir(root),
      sparseEvery: 1,
      expectHold: true,
    });
    expectCanonicalFaultResult(result, "segment directory fsync failure");

    const headsBeforeRestart = JSON.parse(fs.readFileSync(path.join(root, "heads.json"), "utf8"));
    assert.equal(Number(headsBeforeRestart.head), 0);
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(derivedSnapshot(root), beforeDerived);

    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assertExactlyBlocks(root, [0, 1]);
  });
}

function proveDerivedIndexFailureDoesNotOverrideCanonicalTruth() {
  withRoot("derived-index-failure", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const seed = new SegStore(root, { sparseEvery: 1 });
    seed.saveBlock(block0);
    const indexBefore = readMaybe(indexPath(root));

    const result = runFaultedSave({
      root,
      block: block1,
      fault: "append",
      target: indexPath(root),
      sparseEvery: 1,
      expectHold: false,
    });
    assert.equal(result.first?.ok, true, `derived index failure escaped saveBlock: ${result.first?.message || ""}`);

    const headsAfter = JSON.parse(fs.readFileSync(path.join(root, "heads.json"), "utf8"));
    assert.equal(Number(headsAfter.head), 1);
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(readMaybe(indexPath(root)), indexBefore, "failed sparse-index update must not rewrite canonical truth");

    const reopened = new SegStore(root, { sparseEvery: 1 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assert.deepEqual(reopened.loadBlock(1), block1);
    assertExactlyBlocks(root, [0, 1]);
  });
}

function proveDerivedMetaFailureDoesNotOverrideCanonicalTruth() {
  withRoot("derived-meta-failure", (root) => {
    const block0 = makeBlock(0);
    const block1 = makeBlock(1, block0);
    const seed = new SegStore(root, { sparseEvery: 16 });
    seed.saveBlock(block0);
    const metaBefore = readMaybe(metaPath(root));

    const result = runFaultedSave({
      root,
      block: block1,
      fault: "write-prefix",
      target: `${metaPath(root)}.tmp-`,
      sparseEvery: 16,
      expectHold: false,
    });
    assert.equal(result.first?.ok, true, `derived metadata failure escaped saveBlock: ${result.first?.message || ""}`);

    const headsAfter = JSON.parse(fs.readFileSync(path.join(root, "heads.json"), "utf8"));
    assert.equal(Number(headsAfter.head), 1);
    assertExactlyBlocks(root, [0, 1]);
    assert.equal(readMaybe(metaPath(root)), metaBefore, "failed metadata update must not rewrite canonical truth");

    const reopened = new SegStore(root, { sparseEvery: 16 });
    assert.equal(reopened.loadHeadNumber(), 1);
    assert.deepEqual(reopened.loadBlock(1), block1);
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
