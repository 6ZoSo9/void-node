#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { blockHash, ZERO_HASH_64 } from "../dist/chain/block.js";
import {
  VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
  VOID_LEGACY_EMPTY_TX_ROOT_V1,
} from "../dist/chain/legacy_commit_direct_v2fs_v1.js";
import { autoRepairDataDir } from "../dist/chain/auto_repair.js";

const MARKER = "VOID_PUBLIC_CANONICAL_CHECKPOINT_V1_PROOF";
const root = process.cwd();
const tool = path.join(root, "tools/void-public-canonical-checkpoint-v1.mjs");

function run(args) {
  return spawnSync(process.execPath, [tool, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function writeFrame(fd, block) {
  const body = Buffer.from(JSON.stringify(block));
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  fs.writeSync(fd, len);
  fs.writeSync(fd, body);
}

function fixtureBlocks() {
  const minimal0 = { number: 0, timestamp: 1 };
  const minimal1 = { number: 1, timestamp: 2 };
  const legacy2 = {
    _commit: VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
    header: { txRoot: VOID_LEGACY_EMPTY_TX_ROOT_V1 },
    number: 2,
    ts: 3,
    txRoot: VOID_LEGACY_EMPTY_TX_ROOT_V1,
    txs: [],
  };
  const modern3 = {
    number: 3,
    parentHash: blockHash(legacy2),
    timestamp: 4,
    txRoot: ZERO_HASH_64,
    blobRoot: ZERO_HASH_64,
    txs: [],
    blobs: [],
    proposer: "0123456789abcdef0123456789abcdef",
    sig: "11".repeat(64),
  };
  const modern4 = {
    number: 4,
    parentHash: blockHash(modern3),
    timestamp: 5,
    txRoot: ZERO_HASH_64,
    blobRoot: ZERO_HASH_64,
    txs: [],
    blobs: [],
    proposer: "0123456789abcdef0123456789abcdef",
    sig: "22".repeat(64),
  };
  return [minimal0, minimal1, legacy2, modern3, modern4];
}

function makeSource(dir) {
  fs.mkdirSync(path.join(dir, "segments", "00000000"), { recursive: true });
  fs.mkdirSync(path.join(dir, "wal"), { recursive: true });
  const fd = fs.openSync(path.join(dir, "segments", "00000000", "blocks.bin"), "w");
  try {
    for (const block of fixtureBlocks()) writeFrame(fd, block);
  } finally {
    fs.closeSync(fd);
  }
  fs.writeFileSync(path.join(dir, "heads.json"), JSON.stringify({
    head: 4,
    number: 4,
    hash: "0x0",
  }) + "\n");
  fs.writeFileSync(path.join(dir, "head.txt"), "4\n");
  fs.writeFileSync(path.join(dir, "wal", "wal.jsonl"), "");
}

const sourceSha = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).stdout.trim();
assert.match(sourceSha, /^[0-9a-f]{40}$/);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-checkpoint-proof-"));
try {
  const source = path.join(tmp, "source");
  const packet = path.join(tmp, "packet");
  makeSource(source);

  const sourceAudit = run([
    "audit-source",
    "--data-dir", source,
    "--repo-root", root,
    "--expected-source-sha", sourceSha,
  ]);
  assert.equal(sourceAudit.status, 0, sourceAudit.stderr);
  assert.match(
    sourceAudit.stdout,
    /VOID_PUBLIC_CANONICAL_CHECKPOINT_V1_AUDIT_SOURCE_GREEN/,
  );
  assert.match(sourceAudit.stdout, /source_data_mutated=false/);
  assert.match(sourceAudit.stdout, /checkpoint_bytes_copied=false/);

  const capture = run([
    "capture",
    "--data-dir", source,
    "--output", packet,
    "--repo-root", root,
    "--expected-source-sha", sourceSha,
  ]);
  assert.equal(capture.status, 0, capture.stderr);
  assert.match(capture.stdout, /VOID_PUBLIC_CANONICAL_CHECKPOINT_V1_CAPTURE_GREEN/);
  assert.match(capture.stdout, /source_data_mutated=false/);

  const verify = run([
    "verify",
    "--packet", packet,
    "--expected-source-sha", sourceSha,
  ]);
  assert.equal(verify.status, 0, verify.stderr);
  assert.match(verify.stdout, /canonical_semantics_verified=true/);

  const manifest = JSON.parse(fs.readFileSync(path.join(packet, "checkpoint.json"), "utf8"));
  assert.equal(manifest.format, "blocks-bin-only-v1");
  assert.equal(manifest.head, 4);
  assert.equal(manifest.block_count, 5);
  assert.equal(manifest.segment_count, 1);
  assert.equal(manifest.rebuild.sparse_every, 16);
  assert.equal(manifest.rebuild.wal_included, false);
  assert.equal(manifest.rebuild.other_data_dir_content_included, false);
  assert.equal(manifest.head_era, "modern");
  assert.match(manifest.head_header_hash, /^[0-9a-f]{64}$/);

  // Prove the blocks-only packet reconstructs the exact current SegStore
  // derived layout contract through the repository's canonical repair path.
  const restored = path.join(tmp, "restored");
  const restoredSeg = path.join(restored, "segments", "00000000");
  fs.mkdirSync(restoredSeg, { recursive: true });
  fs.copyFileSync(
    path.join(packet, "segments", "00000000", "blocks.bin"),
    path.join(restoredSeg, "blocks.bin"),
  );
  const repaired = await autoRepairDataDir(restored, {
    sparseEvery: 16,
    dryRun: false,
  });
  assert.equal(repaired.mutationsApplied, true);
  assert.equal(fs.readFileSync(path.join(restored, "head.txt"), "utf8").trim(), "4");
  const heads = JSON.parse(fs.readFileSync(path.join(restored, "heads.json"), "utf8"));
  assert.equal(heads.head, 4);
  assert.equal(heads.number, 4);
  assert.ok(fs.existsSync(path.join(restoredSeg, "index.sparse")));
  assert.ok(fs.existsSync(path.join(restoredSeg, "meta.json")));
  const sparse = fs.readFileSync(path.join(restoredSeg, "index.sparse"), "utf8");
  assert.match(sparse, /^\{"n":0,"off":0\}\n$/);
  const meta = JSON.parse(fs.readFileSync(path.join(restoredSeg, "meta.json"), "utf8"));
  assert.equal(meta.from, 0);
  assert.equal(meta.to, 4);
  assert.ok(meta.bytes > 0);

  // Tampered payload must fail.
  const blocks = path.join(packet, "segments", "00000000", "blocks.bin");
  const original = fs.readFileSync(blocks);
  const tampered = Buffer.from(original);
  tampered[tampered.length - 1] ^= 1;
  fs.writeFileSync(blocks, tampered);
  const tamperVerify = run(["verify", "--packet", packet]);
  assert.notEqual(tamperVerify.status, 0);
  fs.writeFileSync(blocks, original);

  // Tampered content id must fail.
  const manifestPath = path.join(packet, "checkpoint.json");
  const originalManifest = fs.readFileSync(manifestPath, "utf8");
  const badManifest = JSON.parse(originalManifest);
  badManifest.checkpoint_id = "voidpbc1_" + "0".repeat(64);
  fs.writeFileSync(manifestPath, JSON.stringify(badManifest, null, 2) + "\n");
  const badId = run(["verify", "--packet", packet]);
  assert.notEqual(badId.status, 0);
  fs.writeFileSync(manifestPath, originalManifest);

  // Capture output must not be placed inside live DATA_DIR or repository.
  const insideData = run([
    "capture",
    "--data-dir", source,
    "--output", path.join(source, "checkpoint-inside-data"),
    "--repo-root", root,
    "--expected-source-sha", sourceSha,
  ]);
  assert.notEqual(insideData.status, 0);
  assert.match(insideData.stderr, /outside the live data directory/);

  const insideRepoSource = path.join(tmp, "source-inside-repo-boundary");
  makeSource(insideRepoSource);
  const insideRepo = run([
    "capture",
    "--data-dir", insideRepoSource,
    "--output", path.join(root, ".void-checkpoint-proof-should-not-exist"),
    "--repo-root", root,
    "--expected-source-sha", sourceSha,
  ]);
  assert.notEqual(insideRepo.status, 0);
  assert.match(insideRepo.stderr, /outside the repository/);
  assert.equal(fs.existsSync(path.join(root, ".void-checkpoint-proof-should-not-exist")), false);

  // Nonempty WAL must fail capture.
  const source2 = path.join(tmp, "source-nonempty-wal");
  makeSource(source2);
  fs.writeFileSync(path.join(source2, "wal", "00000000.wal"), "intent\n");
  const badWal = run([
    "capture",
    "--data-dir", source2,
    "--output", path.join(tmp, "bad-wal-packet"),
    "--repo-root", root,
    "--expected-source-sha", sourceSha,
  ]);
  assert.notEqual(badWal.status, 0);
  assert.match(badWal.stderr, /nonempty WAL entry rejected/);

  // Packet path widening/symlink insertion must fail.
  fs.symlinkSync("/tmp", path.join(packet, "unexpected-link"));
  const badLink = run(["verify", "--packet", packet]);
  assert.notEqual(badLink.status, 0);

  console.log("production_follower_admission_equivalent=true");
  console.log("read_only_source_audit=true");
  console.log("audit_source_checkpoint_bytes_copied=false");
  console.log("minimal_legacy_modern_validation_reused=true");
  console.log("blocks_only_packet=true");
  console.log("content_addressed_manifest=true");
  console.log("payload_tamper_rejected=true");
  console.log("manifest_id_tamper_rejected=true");
  console.log("output_inside_data_rejected=true");
  console.log("output_inside_repository_rejected=true");
  console.log("nonempty_wal_capture_rejected=true");
  console.log("packet_path_widening_rejected=true");
  console.log("auto_repair_sparse_every_16_reconstruction=true");
  console.log("head_markers_reconstructed=true");
  console.log("segment_meta_reconstructed=true");
  console.log("sparse_index_reconstructed=true");
  console.log("publication_authorized=false");
  console.log(`${MARKER}_GREEN`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
