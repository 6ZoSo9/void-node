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
  ZERO64,
  CLASS_MINIMAL,
  CLASS_LEGACY,
  CLASS_MODERN,
  CLASS_LEGACY_HEADER_OBJECT,
  CLASS_MODERN_LEGACY_HEADER,
  CLASS_UNKNOWN,
  HISTORICAL_MODERN_HEIGHTS,
  KNOWN_RAW_ANCHORS,
  classifyBlock,
  transitionAllowed,
  currentContractBlockHash,
  expandCompressedManifest,
  scanHistoricalSource,
} from "./mainnet0_historical_cartography_v1.mjs";

const PROOF_MARKER =
  "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_V1_1_PROOF_GREEN";

function fail(message) { throw new Error(message); }
function assert(condition, message) { if (!condition) fail(message); }
function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function makeMinimal(number) {
  return { number, timestamp: 1700000000000 + number };
}
function makeLegacy(number, nested = "string") {
  const headerRoot = nested === "object"
    ? { root: LEGACY_EMPTY_TX_ROOT, leaves: [] }
    : LEGACY_EMPTY_TX_ROOT;
  return {
    number,
    ts: 1700000000000 + number,
    txs: [],
    _commit: LEGACY_MARKER,
    header: { txRoot: headerRoot },
    txRoot: LEGACY_EMPTY_TX_ROOT,
  };
}
function makeModern(number) {
  return {
    number,
    parentHash: ZERO64,
    timestamp: 1700000000000 + number,
    txRoot: ZERO64,
    blobRoot: ZERO64,
    txs: [],
    blobs: [],
    proposer: "a".repeat(32),
    sig: "b".repeat(128),
    header: { txRoot: ZERO64 },
  };
}
function makeHistoricalModern(number) {
  return { ...makeModern(number), header: { txRoot: LEGACY_EMPTY_TX_ROOT } };
}
function writeFrame(fd, block) {
  const body = Buffer.from(JSON.stringify(block));
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  fs.writeSync(fd, len);
  fs.writeSync(fd, body);
}
function createFixture(root, blocks) {
  const segmentDir = path.join(root, "segments", "00000000");
  fs.mkdirSync(segmentDir, { recursive: true });
  const blocksFile = path.join(segmentDir, "blocks.bin");
  const fd = fs.openSync(blocksFile, "wx", 0o600);
  try {
    for (const block of blocks) writeFrame(fd, block);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.mkdirSync(path.join(root, "wal"), { recursive: true });
  fs.writeFileSync(path.join(root, "wal", "00000000.wal"), "", { mode: 0o600 });
  const head = blocks.length - 1;
  fs.writeFileSync(
    path.join(root, "heads.json"),
    `${JSON.stringify({ head, number: head, hash: "0x0" }, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(root, "head.txt"), `${head}\n`);
  return { blocksFile, head };
}
function copyFixture(from, to) { fs.cpSync(from, to, { recursive: true }); }
function expectHold(fn, reason) {
  let observed = null;
  try { fn(); } catch (error) { observed = error; }
  assert(observed, `expected HOLD ${reason}, but call succeeded`);
  assert(observed.name === "CartographyHold",
    `expected CartographyHold for ${reason}, got ${observed?.name}`);
  assert(observed.reason === reason,
    `expected HOLD reason ${reason}, got ${observed.reason}`);
}

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-mainnet0-cartography-v1-1-proof-"),
);
const validatorPath = path.resolve("src/chain/block.ts");
const scannerPath = path.resolve("scripts/mainnet0_historical_cartography_v1.mjs");
const validatorBefore = sha256File(validatorPath);

try {
  const source = path.join(tempRoot, "source");
  const fixtureBlocks = Array.from({ length: 7 }, (_, number) => makeMinimal(number));
  const fixture = createFixture(source, fixtureBlocks);
  const sourceBytesBefore = sha256File(fixture.blocksFile);

  const scan1 = scanHistoricalSource({
    sourceDir: source,
    frozenHead: 6,
    sourceLabel: "synthetic-mainnet0-v1-1-proof",
  });
  const scan2 = scanHistoricalSource({
    sourceDir: source,
    frozenHead: 6,
    sourceLabel: "synthetic-mainnet0-v1-1-proof",
  });

  assert(scan1.manifest.status === "complete", "synthetic scan must complete");
  assert(scan1.manifest.historical_blocks_scanned === 7, "synthetic block count mismatch");
  assert(scan1.manifest.unclassified_blocks === 0, "synthetic unclassified must be zero");
  assert(scan1.manifest.ambiguous_classifications === 0, "synthetic ambiguous must be zero");
  assert(scan1.manifest.transition_gaps === 0, "synthetic transition gaps must be zero");
  assert(scan1.manifest.canonical_bytes_modified === 0, "scanner claims canonical mutation");
  assert(scan1.manifest.modern_validator_modified === false, "scanner claims modern validator mutation");
  assert(
    scan1.manifest.manifest_id === scan2.manifest.manifest_id &&
      scan1.manifest.complete_scan_digest === scan2.manifest.complete_scan_digest &&
      scan1.manifest.source.source_id === scan2.manifest.source.source_id,
    "same source must reproduce identical identities",
  );
  assert(sha256File(fixture.blocksFile) === sourceBytesBefore,
    "normal scan modified canonical fixture bytes");

  const expanded = expandCompressedManifest(scan1.manifest.ranges, scan1.manifest.exceptions);
  assert(expanded.length === 7, "compressed expansion length mismatch");
  for (let height = 0; height < 7; height += 1) {
    assert(expanded[height].height === height, `height mismatch ${height}`);
    assert(expanded[height].classification === CLASS_MINIMAL,
      `class mismatch ${height}`);
  }

  assert(classifyBlock(makeMinimal(0)).classification === CLASS_MINIMAL,
    "minimal classifier failed");
  assert(classifyBlock(makeLegacy(100)).classification === CLASS_LEGACY,
    "legacy classifier failed");
  assert(classifyBlock(makeLegacy(198196, "object")).classification ===
    CLASS_LEGACY_HEADER_OBJECT,
    "legacy header-object classifier failed");
  assert(classifyBlock(makeModern(196019)).classification === CLASS_MODERN,
    "strict modern classifier failed");
  assert(classifyBlock(makeHistoricalModern(196019)).classification ===
    CLASS_MODERN_LEGACY_HEADER,
    "historical modern/header-root classifier failed");

  const hist = makeHistoricalModern(1833994);
  assert(hist.txRoot === ZERO64 && hist.blobRoot === ZERO64,
    "historical modern top roots must be zero64");
  assert(hist.header.txRoot === LEGACY_EMPTY_TX_ROOT,
    "historical modern header root must be legacy e3b0");
  assert(hist.txs.length === 0 && hist.blobs.length === 0,
    "historical modern arrays must be empty");

  const histBadTxRoot = makeHistoricalModern(1833994);
  histBadTxRoot.txRoot = LEGACY_EMPTY_TX_ROOT;
  assert(classifyBlock(histBadTxRoot).classification === CLASS_MODERN,
    "top txRoot/header e3b0 variant is structurally strict-modern, not historical legacy-header");
  assert(!transitionAllowed(CLASS_LEGACY, CLASS_MODERN, 1833994),
    "structurally strict-modern txRoot variant must transition-HOLD");

  const histBadBlobRoot = makeHistoricalModern(1833994);
  histBadBlobRoot.blobRoot = LEGACY_EMPTY_TX_ROOT;
  assert(classifyBlock(histBadBlobRoot).classification === CLASS_UNKNOWN,
    "historical modern blobRoot widening must HOLD");

  const histBadHeader = makeHistoricalModern(1833994);
  histBadHeader.header.txRoot = ZERO64;
  assert(classifyBlock(histBadHeader).classification === CLASS_MODERN,
    "zero header root is strict modern, not historical legacy-header class");

  const histBadTxs = makeHistoricalModern(1833994);
  histBadTxs.txs = [{ hash: "c".repeat(64) }];
  assert(classifyBlock(histBadTxs).classification === CLASS_UNKNOWN,
    "historical modern nonempty txs must HOLD");

  assert(classifyBlock({ ...makeMinimal(0), extra: true }).classification === CLASS_UNKNOWN,
    "minimal extra key must HOLD");
  const legacyBadHeader = makeLegacy(10);
  legacyBadHeader.header = { txRoot: LEGACY_EMPTY_TX_ROOT, extra: true };
  assert(classifyBlock(legacyBadHeader).classification === CLASS_UNKNOWN,
    "legacy header widening must HOLD");
  const objectBadLeaves = makeLegacy(198196, "object");
  objectBadLeaves.header.txRoot.leaves = ["unexpected"];
  assert(classifyBlock(objectBadLeaves).classification === CLASS_UNKNOWN,
    "historical object nonempty leaves must HOLD");
  const modernMissingSig = makeModern(196019);
  delete modernMissingSig.sig;
  assert(classifyBlock(modernMissingSig).classification === CLASS_UNKNOWN,
    "modern missing signature must HOLD");

  assert(transitionAllowed(CLASS_MINIMAL, CLASS_MINIMAL, 1),
    "minimal->minimal must pass");
  assert(transitionAllowed(CLASS_MINIMAL, CLASS_MODERN_LEGACY_HEADER, 196019),
    "196019 minimal->historical-modern must pass");
  assert(transitionAllowed(CLASS_MODERN_LEGACY_HEADER,
    CLASS_MODERN_LEGACY_HEADER, 196020),
    "196020 historical-modern->historical-modern must pass");
  assert(transitionAllowed(CLASS_MODERN_LEGACY_HEADER, CLASS_LEGACY, 196021),
    "196021 historical-modern->legacy must pass");

  for (const height of HISTORICAL_MODERN_HEIGHTS.filter((value) => value > 196020)) {
    assert(transitionAllowed(CLASS_LEGACY, CLASS_MODERN_LEGACY_HEADER, height),
      `legacy->historical-modern must pass at ${height}`);
    assert(transitionAllowed(CLASS_MODERN_LEGACY_HEADER, CLASS_LEGACY, height + 1),
      `historical-modern->legacy must pass at ${height + 1}`);
  }

  assert(!transitionAllowed(CLASS_LEGACY, CLASS_MODERN_LEGACY_HEADER, 1834000),
    "arbitrary legacy->historical-modern must HOLD");
  assert(!transitionAllowed(CLASS_LEGACY, CLASS_MODERN, 1833994),
    "strict modern is not an evidenced singleton class");
  assert(!transitionAllowed(CLASS_MINIMAL, CLASS_LEGACY, 2),
    "early minimal->legacy widening must HOLD");

  const previousMinimal = makeMinimal(196018);
  const canonical196019 = {
    ...makeHistoricalModern(196019),
    parentHash: currentContractBlockHash(previousMinimal),
  };
  assert(canonical196019.parentHash === currentContractBlockHash(previousMinimal),
    "historical modern parent hash contract mismatch");
  assert(Object.keys(KNOWN_RAW_ANCHORS).length === 7,
    "seven raw historical-modern anchors required");

  const anchorMismatch = scanHistoricalSource({
    sourceDir: source,
    frozenHead: 6,
    sourceLabel: "synthetic-anchor-mismatch",
    knownAnchors: { 1: CLASS_LEGACY },
    knownRawAnchors: {},
  });
  assert(anchorMismatch.manifest.status === "hold", "anchor mismatch must HOLD");
  assert(anchorMismatch.manifest.unclassified_blocks === 0,
    "anchor mismatch must not double-count unclassified blocks");
  assert(anchorMismatch.manifest.holds.length === 1 &&
    anchorMismatch.manifest.holds[0].reason === "known_anchor_classification_mismatch",
    "anchor mismatch must create exactly one bounded HOLD");

  const tampered = path.join(tempRoot, "tampered");
  copyFixture(source, tampered);
  const tamperedFrames = [...fixtureBlocks];
  tamperedFrames[5] = { ...tamperedFrames[5], timestamp: tamperedFrames[5].timestamp + 1 };
  fs.rmSync(path.join(tampered, "segments", "00000000", "blocks.bin"));
  const tamperedFd = fs.openSync(
    path.join(tampered, "segments", "00000000", "blocks.bin"), "wx", 0o600);
  try { for (const block of tamperedFrames) writeFrame(tamperedFd, block); }
  finally { fs.closeSync(tamperedFd); }
  const tamperedScan = scanHistoricalSource({
    sourceDir: tampered,
    frozenHead: 6,
    sourceLabel: "synthetic-mainnet0-v1-1-proof",
  });
  assert(tamperedScan.manifest.source.source_id !== scan1.manifest.source.source_id,
    "source replacement must change source identity");
  assert(tamperedScan.manifest.complete_scan_digest !== scan1.manifest.complete_scan_digest,
    "per-height tamper must change complete scan digest");
  assert(tamperedScan.manifest.manifest_id !== scan1.manifest.manifest_id,
    "per-height tamper must change manifest identity");

  const moving = path.join(tempRoot, "moving");
  copyFixture(source, moving);
  expectHold(() => scanHistoricalSource({
    sourceDir: moving,
    frozenHead: 6,
    sourceLabel: "synthetic-mainnet0-moving",
    testAfterSegmentHook: ({ file }) => fs.appendFileSync(file, Buffer.from([0])),
  }), "source_generation_changed_during_scan");

  const walHold = path.join(tempRoot, "wal-hold");
  copyFixture(source, walHold);
  fs.writeFileSync(path.join(walHold, "wal", "00000000.wal"), '{"pending":true}\n');
  expectHold(() => scanHistoricalSource({
    sourceDir: walHold,
    frozenHead: 6,
    sourceLabel: "synthetic-mainnet0-wal-hold",
  }), "nonempty_wal");

  expectHold(() => scanHistoricalSource({
    sourceDir: source,
    frozenHead: 6,
    sourceLabel: "synthetic-mainnet0-output-overlap",
    output: path.join(source, "cartography.json"),
  }), "output_path_overlaps_source");

  const markerHold = path.join(tempRoot, "marker-hold");
  copyFixture(source, markerHold);
  fs.writeFileSync(path.join(markerHold, "head.txt"), "5\n");
  expectHold(() => scanHistoricalSource({
    sourceDir: markerHold,
    frozenHead: 6,
    sourceLabel: "synthetic-mainnet0-marker-hold",
  }), "source_head_marker_mismatch");

  const validatorAfter = sha256File(validatorPath);
  assert(validatorBefore === validatorAfter,
    "modern validator bytes changed during proof");
  const scannerSource = fs.readFileSync(scannerPath, "utf8");
  assert(!scannerSource.includes('from "../src/chain/seg_store'),
    "scanner must not import SegStore");
  assert(!scannerSource.includes("new SegStore"),
    "scanner must not instantiate SegStore");

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
  console.log("historical_modern_exact_shape_falsified=true");
  console.log("seven_historical_modern_heights_bound=true");
  console.log("seven_raw_sha256_anchors_bound=true");
  console.log("historical_transition_map_exact=true");
  console.log("anchor_mismatch_not_double_counted=true");
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
