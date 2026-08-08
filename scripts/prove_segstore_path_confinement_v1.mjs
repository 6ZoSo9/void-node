// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { autoRepairDataDir } from "../dist/chain/auto_repair.js";
import { blockHash, computeRoots } from "../dist/chain/block.js";
import { SegStore } from "../dist/chain/seg_store.js";

const MARKER = "VOID_SEGSTORE_PATH_CONFINEMENT_V1_PROOF_GREEN";
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
    proposer: "void-segstore-path-confinement-proof",
    sig: SHAPE_ONLY_SIGNATURE,
  };
}

function framedBlock(block) {
  const body = Buffer.from(JSON.stringify(block));
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  return Buffer.concat([len, body]);
}

function newRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `void-segstore-path-${label}-`));
}

function seedRoot(root) {
  fs.mkdirSync(path.join(root, "segments"), { recursive: true });
  fs.mkdirSync(path.join(root, "wal"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "heads.json"),
    JSON.stringify({ head: -1, number: -1, hash: "0x0" }, null, 2),
  );
  fs.writeFileSync(path.join(root, "head.txt"), "-1\n");
}

function outsideFixture(root, name, bytes = Buffer.from(`outside-${name}`)) {
  const outside = path.join(root, "outside");
  fs.mkdirSync(outside, { recursive: true });
  const file = path.join(outside, name);
  fs.writeFileSync(file, bytes);
  return { outside, file, before: fs.readFileSync(file) };
}

function assertOutsideUnchanged(fixture, label) {
  assert.deepEqual(
    fs.readFileSync(fixture.file),
    fixture.before,
    `${label}: outside sentinel changed`,
  );
}

async function expectConfinementReject(run, label) {
  let error = null;
  try {
    await run();
  } catch (caught) {
    error = caught;
  }
  assert(error, `${label}: expected rejection`);
  assert.match(
    error instanceof Error ? error.message : String(error),
    /VOID_SEGSTORE_PATH_CONFINEMENT_V1/,
    `${label}: rejection was not path-confinement failure`,
  );
}

async function proveNormalStoreAndRepairRemainFunctional() {
  const root = newRoot("normal");
  try {
    const block0 = makeBlock(0);
    const store = new SegStore(root, { sparseEvery: 16 });
    store.saveBlock(block0);
    assert.deepEqual(store.loadBlock(0), block0);
    assert.equal(store.loadHeadNumber(), 0);

    const bin = path.join(root, "segments", "00000000", "blocks.bin");
    const completeBytes = fs.statSync(bin).size;
    fs.appendFileSync(bin, Buffer.from([0, 0, 0]));

    const dry = await autoRepairDataDir(root, { sparseEvery: 16, dryRun: true });
    assert.equal(dry.dryRun, true);
    assert.equal(dry.mutationsApplied, false);
    assert.equal(fs.statSync(bin).size, completeBytes + 3);
    assert.equal(dry.wouldTruncateTornTailBytes, 3);

    const live = await autoRepairDataDir(root, { sparseEvery: 16 });
    assert.equal(live.repairedTornSegments, 1);
    assert.equal(live.tornTailBytesTruncated, 3);
    assert.equal(fs.statSync(bin).size, completeBytes);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function proveRootSymlinkRejected() {
  const parent = newRoot("root-link");
  try {
    const fixture = outsideFixture(parent, "root-sentinel.bin");
    const link = path.join(parent, "data-link");
    fs.symlinkSync(fixture.outside, link, "dir");

    await expectConfinementReject(() => Promise.resolve(new SegStore(link)), "SegStore root symlink");
    await expectConfinementReject(() => autoRepairDataDir(link, { dryRun: true }), "auto-repair root symlink");
    assertOutsideUnchanged(fixture, "root symlink");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

async function proveSegmentsDirectorySymlinkRejected() {
  const parent = newRoot("segments-link");
  try {
    const root = path.join(parent, "data");
    fs.mkdirSync(root);
    fs.mkdirSync(path.join(root, "wal"));
    fs.writeFileSync(path.join(root, "heads.json"), JSON.stringify({ head: -1 }));
    fs.writeFileSync(path.join(root, "head.txt"), "-1\n");
    const fixture = outsideFixture(parent, "segments-sentinel.bin");
    fs.symlinkSync(fixture.outside, path.join(root, "segments"), "dir");

    await expectConfinementReject(() => Promise.resolve(new SegStore(root)), "SegStore segments symlink");
    await expectConfinementReject(() => autoRepairDataDir(root, { dryRun: true }), "auto-repair segments symlink");
    assertOutsideUnchanged(fixture, "segments symlink");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

async function proveCanonicalSegmentSymlinkRejected() {
  const parent = newRoot("segment-link");
  try {
    const root = path.join(parent, "data");
    seedRoot(root);
    const fixture = outsideFixture(parent, "segment-sentinel.bin");
    fs.symlinkSync(fixture.outside, path.join(root, "segments", "00000000"), "dir");

    const store = new SegStore(root);
    await expectConfinementReject(() => Promise.resolve(store.saveBlock(makeBlock(0))), "runtime segment symlink");
    await expectConfinementReject(() => autoRepairDataDir(root, { dryRun: true }), "repair segment symlink");
    assertOutsideUnchanged(fixture, "canonical segment symlink");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

async function proveCanonicalFileSymlinksRejected() {
  for (const leaf of ["blocks.bin", "index.sparse", "meta.json"]) {
    const parent = newRoot(`leaf-${leaf.replace(/\W/g, "-")}`);
    try {
      const root = path.join(parent, "data");
      seedRoot(root);
      const seg = path.join(root, "segments", "00000000");
      fs.mkdirSync(seg);
      const fixture = outsideFixture(parent, `${leaf}.sentinel`);
      fs.symlinkSync(fixture.file, path.join(seg, leaf), "file");

      const store = new SegStore(root);
      await expectConfinementReject(() => Promise.resolve(store.saveBlock(makeBlock(0))), `runtime ${leaf} symlink`);
      await expectConfinementReject(() => autoRepairDataDir(root, { dryRun: true }), `repair ${leaf} symlink`);
      assertOutsideUnchanged(fixture, leaf);
      assert.equal(fs.lstatSync(path.join(seg, leaf)).isSymbolicLink(), true);
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  }
}

async function proveTornBlockSymlinkCannotTruncateOutside() {
  const parent = newRoot("torn-block-link");
  try {
    const root = path.join(parent, "data");
    seedRoot(root);
    const seg = path.join(root, "segments", "00000000");
    fs.mkdirSync(seg);
    const block0 = makeBlock(0);
    const outsideBytes = Buffer.concat([framedBlock(block0), Buffer.from([0, 0, 0])]);
    const fixture = outsideFixture(parent, "outside-blocks.bin", outsideBytes);
    fs.symlinkSync(fixture.file, path.join(seg, "blocks.bin"), "file");

    await expectConfinementReject(() => autoRepairDataDir(root, { dryRun: false }), "torn blocks.bin symlink");
    assertOutsideUnchanged(fixture, "torn blocks.bin symlink");
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

async function proveHeadSymlinksRejected() {
  for (const leaf of ["heads.json", "head.txt"]) {
    const parent = newRoot(`head-${leaf}`);
    try {
      const root = path.join(parent, "data");
      fs.mkdirSync(path.join(root, "segments"), { recursive: true });
      fs.mkdirSync(path.join(root, "wal"), { recursive: true });
      const fixture = outsideFixture(parent, `${leaf}.sentinel`);
      fs.symlinkSync(fixture.file, path.join(root, leaf), "file");

      await expectConfinementReject(() => Promise.resolve(new SegStore(root)), `runtime ${leaf} symlink`);
      await expectConfinementReject(() => autoRepairDataDir(root, { dryRun: true }), `repair ${leaf} symlink`);
      assertOutsideUnchanged(fixture, leaf);
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  }
}

async function proveWalDirectoryAndRecordSymlinksRejected() {
  const parent = newRoot("wal-links");
  try {
    const rootA = path.join(parent, "data-a");
    fs.mkdirSync(rootA);
    fs.mkdirSync(path.join(rootA, "segments"));
    fs.writeFileSync(path.join(rootA, "heads.json"), JSON.stringify({ head: -1 }));
    fs.writeFileSync(path.join(rootA, "head.txt"), "-1\n");
    const walDirFixture = outsideFixture(parent, "wal-dir-sentinel.bin");
    fs.symlinkSync(walDirFixture.outside, path.join(rootA, "wal"), "dir");
    await expectConfinementReject(() => Promise.resolve(new SegStore(rootA)), "runtime wal directory symlink");
    assertOutsideUnchanged(walDirFixture, "wal directory symlink");

    const rootB = path.join(parent, "data-b");
    seedRoot(rootB);
    const walFixture = outsideFixture(parent, "outside-record.wal", Buffer.from("outside-wal-record\n"));
    const walLink = path.join(rootB, "wal", "00000000.wal");
    fs.symlinkSync(walFixture.file, walLink, "file");
    const store = new SegStore(rootB);
    await expectConfinementReject(() => Promise.resolve(store.saveBlock(makeBlock(0))), "runtime WAL record symlink");
    assertOutsideUnchanged(walFixture, "WAL record symlink");
    assert.equal(fs.lstatSync(walLink).isSymbolicLink(), true);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

await proveNormalStoreAndRepairRemainFunctional();
await proveRootSymlinkRejected();
await proveSegmentsDirectorySymlinkRejected();
await proveCanonicalSegmentSymlinkRejected();
await proveCanonicalFileSymlinksRejected();
await proveTornBlockSymlinkCannotTruncateOutside();
await proveHeadSymlinksRejected();
await proveWalDirectoryAndRecordSymlinksRejected();

console.log("normal_store_append_load_preserved=true");
console.log("normal_torn_tail_repair_preserved=true");
console.log("dry_run_truth_preserved=true");
console.log("data_root_symlink_accepted=false");
console.log("segments_symlink_accepted=false");
console.log("canonical_segment_symlink_accepted=false");
console.log("blocks_symlink_outside_truncated=false");
console.log("index_meta_symlink_accepted=false");
console.log("heads_symlink_accepted=false");
console.log("wal_symlink_outside_written=false");
console.log("outside_root_side_effects=0");
console.log(MARKER);
