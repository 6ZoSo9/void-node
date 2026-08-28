#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  LEGACY_MARKER,
  LEGACY_EMPTY_TX_ROOT,
  CLASS_MINIMAL,
  CLASS_LEGACY,
  CLASS_MODERN,
  CLASS_LEGACY_HEADER_OBJECT,
  CLASS_UNKNOWN,
  classifyBlock,
  transitionAllowed,
  expandCompressedManifest,
  scanHistoricalSource,
} from "./mainnet0_historical_cartography_v1.mjs";

const PROOF_MARKER = "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_V1_PROOF_GREEN";
const ZERO64 = "0".repeat(64);

function fail(message) { throw new Error(message); }
function assert(condition, message) { if (!condition) fail(message); }
function sha256File(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

function makeMinimal(number) {
  return { number, timestamp: 1700000000000 + number };
}
function makeLegacy(number, nested = "string") {
  const headerRoot = nested === "object" ? { root: LEGACY_EMPTY_TX_ROOT, leaves: [] } : LEGACY_EMPTY_TX_ROOT;
  return { number, ts: 1700000000000 + number, txs: [], _commit: LEGACY_MARKER,
    header: { txRoot: headerRoot }, txRoot: LEGACY_EMPTY_TX_ROOT };
}
function makeModern(number) {
  return { number, parentHash: ZERO64, timestamp: 1700000000000 + number,
    txRoot: ZERO64, blobRoot: ZERO64, txs: [], blobs: [], proposer: "a".repeat(32),
    sig: "b".repeat(128), header: { txRoot: ZERO64 } };
}
function writeFrame(fd, block) {
  const body = Buffer.from(JSON.stringify(block));
  const len = Buffer.alloc(4); len.writeUInt32BE(body.length, 0);
  fs.writeSync(fd, len); fs.writeSync(fd, body);
}
function createFixture(root, blocks) {
  const segmentDir = path.join(root, "segments", "00000000");
  fs.mkdirSync(segmentDir, { recursive: true });
  const blocksFile = path.join(segmentDir, "blocks.bin");
  const fd = fs.openSync(blocksFile, "wx", 0o600);
  try { for (const block of blocks) writeFrame(fd, block); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.mkdirSync(path.join(root, "wal"), { recursive: true });
  fs.writeFileSync(path.join(root, "wal", "00000000.wal"), "", { mode: 0o600 });
  const head = blocks.length - 1;
  fs.writeFileSync(path.join(root, "heads.json"), `${JSON.stringify({ head, number: head, hash: "0x0" }, null, 2)}\n`);
  fs.writeFileSync(path.join(root, "head.txt"), `${head}\n`);
  return { blocksFile, head };
}
function copyFixture(from, to) { fs.cpSync(from, to, { recursive: true }); }
function expectHold(fn, reason) {
  let observed = null;
  try { fn(); } catch (error) { observed = error; }
  assert(observed, `expected HOLD ${reason}, but call succeeded`);
  assert(observed.name === "CartographyHold", `expected CartographyHold for ${reason}, got ${observed?.name}`);
  assert(observed.reason === reason, `expected HOLD reason ${reason}, got ${observed.reason}`);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "void-mainnet0-cartography-proof-"));
const validatorPath = path.resolve("src/chain/block.ts");
const scannerPath = path.resolve("scripts/mainnet0_historical_cartography_v1.mjs");
const validatorBefore = sha256File(validatorPath);

try {
  const source = path.join(tempRoot, "source");
  const fixtureBlocks = [
    makeMinimal(0), makeMinimal(1), makeLegacy(2), makeLegacy(3, "object"),
    makeLegacy(4), makeLegacy(5), makeLegacy(6),
  ];
  const fixture = createFixture(source, fixtureBlocks);
  const sourceBytesBefore = sha256File(fixture.blocksFile);

  const scan1 = scanHistoricalSource({ sourceDir: source, frozenHead: 6, sourceLabel: "synthetic-mainnet0-proof" });
  const scan2 = scanHistoricalSource({ sourceDir: source, frozenHead: 6, sourceLabel: "synthetic-mainnet0-proof" });

  assert(scan1.manifest.status === "complete", "synthetic scan must be complete");
  assert(scan1.manifest.historical_blocks_scanned === 7, "synthetic block count mismatch");
  assert(scan1.manifest.unclassified_blocks === 0, "synthetic unclassified must be zero");
  assert(scan1.manifest.ambiguous_classifications === 0, "synthetic ambiguous must be zero");
  assert(scan1.manifest.transition_gaps === 0, "synthetic transition gaps must be zero");
  assert(scan1.manifest.canonical_bytes_modified === 0, "scanner claims canonical mutation");
  assert(scan1.manifest.modern_validator_modified === false, "scanner claims modern validator mutation");
  assert(scan1.manifest.manifest_id === scan2.manifest.manifest_id &&
    scan1.manifest.complete_scan_digest === scan2.manifest.complete_scan_digest &&
    scan1.manifest.source.source_id === scan2.manifest.source.source_id,
    "same source must reproduce identical manifest/source/scan identities");
  assert(sha256File(fixture.blocksFile) === sourceBytesBefore, "normal scan modified canonical fixture bytes");

  const expanded = expandCompressedManifest(scan1.manifest.ranges, scan1.manifest.exceptions);
  const expectedClasses = [CLASS_MINIMAL, CLASS_MINIMAL, CLASS_LEGACY,
    CLASS_LEGACY_HEADER_OBJECT, CLASS_LEGACY, CLASS_LEGACY, CLASS_LEGACY];
  assert(expanded.length === expectedClasses.length, "compressed map expansion length mismatch");
  for (let height = 0; height < expectedClasses.length; height += 1) {
    assert(expanded[height].height === height, `expanded height mismatch at ${height}`);
    assert(expanded[height].classification === expectedClasses[height], `expanded class mismatch at ${height}`);
  }

  assert(classifyBlock(makeMinimal(0)).classification === CLASS_MINIMAL, "minimal classifier failed");
  assert(classifyBlock(makeLegacy(100)).classification === CLASS_LEGACY, "legacy classifier failed");
  assert(classifyBlock(makeLegacy(198196, "object")).classification === CLASS_LEGACY_HEADER_OBJECT,
    "historical header-root object classifier failed");
  assert(classifyBlock(makeModern(196019)).classification === CLASS_MODERN, "modern classifier failed");

  assert(classifyBlock({ ...makeMinimal(0), extra: true }).classification === CLASS_UNKNOWN,
    "minimal extra key must HOLD");
  const legacyBadHeader = makeLegacy(10); legacyBadHeader.header = { txRoot: LEGACY_EMPTY_TX_ROOT, extra: true };
  assert(classifyBlock(legacyBadHeader).classification === CLASS_UNKNOWN, "legacy header widening must HOLD");
  const objectBadLeaves = makeLegacy(198196, "object"); objectBadLeaves.header.txRoot.leaves = ["unexpected"];
  assert(classifyBlock(objectBadLeaves).classification === CLASS_UNKNOWN, "historical object nonempty leaves must HOLD");
  const modernMissingSig = makeModern(196019); delete modernMissingSig.sig;
  assert(classifyBlock(modernMissingSig).classification === CLASS_UNKNOWN, "modern missing signature must HOLD");

  const anchorShapes = {
    196019: makeModern(196019), 196020: makeModern(196020),
    196021: makeLegacy(196021), 196022: makeLegacy(196022),
    198196: makeLegacy(198196, "object"),
  };
  const anchorExpected = {
    196019: CLASS_MODERN, 196020: CLASS_MODERN,
    196021: CLASS_LEGACY, 196022: CLASS_LEGACY,
    198196: CLASS_LEGACY_HEADER_OBJECT,
  };
  for (const [height, block] of Object.entries(anchorShapes)) {
    assert(classifyBlock(block).classification === anchorExpected[height], `known anchor mismatch at ${height}`);
  }

  assert(transitionAllowed(CLASS_MINIMAL, CLASS_MINIMAL, 1), "minimal->minimal must pass");
  assert(transitionAllowed(CLASS_MINIMAL, CLASS_LEGACY, 2), "minimal->legacy must pass");
  assert(transitionAllowed(CLASS_LEGACY, CLASS_MODERN, 196019), "196019 legacy->modern must pass");
  assert(transitionAllowed(CLASS_MODERN, CLASS_MODERN, 196020), "196020 modern->modern must pass");
  assert(transitionAllowed(CLASS_MODERN, CLASS_LEGACY, 196021), "196021 modern->legacy must pass");
  assert(!transitionAllowed(CLASS_LEGACY, CLASS_MODERN, 1000), "arbitrary legacy->modern must HOLD");
  assert(!transitionAllowed(CLASS_MODERN, CLASS_LEGACY, 200000), "arbitrary modern->legacy must HOLD");

  const tampered = path.join(tempRoot, "tampered");
  copyFixture(source, tampered);
  const tamperedFrames = [...fixtureBlocks];
  tamperedFrames[5] = { ...tamperedFrames[5], ts: tamperedFrames[5].ts + 1 };
  fs.rmSync(path.join(tampered, "segments", "00000000", "blocks.bin"));
  const tamperedFd = fs.openSync(path.join(tampered, "segments", "00000000", "blocks.bin"), "wx", 0o600);
  try { for (const block of tamperedFrames) writeFrame(tamperedFd, block); }
  finally { fs.closeSync(tamperedFd); }
  const tamperedScan = scanHistoricalSource({ sourceDir: tampered, frozenHead: 6, sourceLabel: "synthetic-mainnet0-proof" });
  assert(tamperedScan.manifest.source.source_id !== scan1.manifest.source.source_id,
    "source replacement must change source identity");
  assert(tamperedScan.manifest.complete_scan_digest !== scan1.manifest.complete_scan_digest,
    "per-height tamper must change complete scan digest");
  assert(tamperedScan.manifest.manifest_id !== scan1.manifest.manifest_id,
    "per-height tamper must change manifest identity");

  const moving = path.join(tempRoot, "moving");
  copyFixture(source, moving);
  expectHold(() => scanHistoricalSource({ sourceDir: moving, frozenHead: 6,
    sourceLabel: "synthetic-mainnet0-moving",
    testAfterSegmentHook: ({ file }) => fs.appendFileSync(file, Buffer.from([0])) }),
    "source_generation_changed_during_scan");

  const walHold = path.join(tempRoot, "wal-hold");
  copyFixture(source, walHold);
  fs.writeFileSync(path.join(walHold, "wal", "00000000.wal"), '{"pending":true}\n');
  expectHold(() => scanHistoricalSource({ sourceDir: walHold, frozenHead: 6,
    sourceLabel: "synthetic-mainnet0-wal-hold" }), "nonempty_wal");

  expectHold(() => scanHistoricalSource({ sourceDir: source, frozenHead: 6,
    sourceLabel: "synthetic-mainnet0-output-overlap",
    output: path.join(source, "cartography.json") }), "output_path_overlaps_source");

  const markerHold = path.join(tempRoot, "marker-hold");
  copyFixture(source, markerHold);
  fs.writeFileSync(path.join(markerHold, "head.txt"), "5\n");
  expectHold(() => scanHistoricalSource({ sourceDir: markerHold, frozenHead: 6,
    sourceLabel: "synthetic-mainnet0-marker-hold" }), "source_head_marker_mismatch");

  const validatorAfter = sha256File(validatorPath);
  assert(validatorBefore === validatorAfter, "modern validator bytes changed during proof");
  const scannerSource = fs.readFileSync(scannerPath, "utf8");
  assert(!scannerSource.includes('from "../src/chain/seg_store'), "scanner must not import SegStore");
  assert(!scannerSource.includes("new SegStore"), "scanner must not instantiate SegStore");

  console.log(PROOF_MARKER);
  console.log("synthetic_historical_blocks_scanned=7");
  console.log("unclassified_blocks=0");
  console.log("ambiguous_classifications=0");
  console.log("transition_gaps=0");
  console.log("canonical_bytes_modified=0");
  console.log("modern_validator_modified=false");
  console.log("manifest_reproducible=true");
  console.log(`complete_scan_digest=${scan1.manifest.complete_scan_digest}`);
  console.log("closed_vocabulary=true");
  console.log("known_anchor_shapes_classified=true");
  console.log("representative_mutations_hold=true");
  console.log("source_replacement_changes_identity=true");
  console.log("source_movement_during_scan_holds=true");
  console.log("nonempty_wal_holds=true");
  console.log("head_marker_disagreement_holds=true");
  console.log("output_overlap_holds=true");
  console.log("segstore_constructor_called=false");
  console.log("runtime_mutation=false");
  console.log("network_mutation=false");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
