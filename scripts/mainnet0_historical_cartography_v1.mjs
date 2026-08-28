#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

export const MARKER = "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_V1";
export const SCHEMA = "void_mainnet0_historical_cartography_v1";
export const SCANNER_VERSION = "v1.1";
export const SEG_SPAN = 10_000;
export const MAX_FRAME_BYTES = 128 * 1024 * 1024;
export const LEGACY_MARKER = "proposer.commit-direct.v2fs";
export const LEGACY_EMPTY_TX_ROOT =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
export const ZERO64 = "0".repeat(64);

export const CLASS_MINIMAL = "MINIMAL_V1";
export const CLASS_LEGACY = "LEGACY_V2FS_V1";
export const CLASS_MODERN = "MODERN_SIGNED_V1";
export const CLASS_LEGACY_HEADER_OBJECT =
  "LEGACY_V2FS_EMPTY_HEADER_ROOT_OBJECT_V1";
export const CLASS_MODERN_LEGACY_HEADER =
  "MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1";
export const CLASS_UNKNOWN = "UNKNOWN";

export const VOCABULARY = Object.freeze([
  CLASS_MINIMAL,
  CLASS_LEGACY,
  CLASS_MODERN,
  CLASS_LEGACY_HEADER_OBJECT,
  CLASS_MODERN_LEGACY_HEADER,
]);

const MINIMAL_KEYS = Object.freeze(["number", "timestamp"]);
const LEGACY_KEYS = Object.freeze([
  "_commit", "header", "number", "ts", "txRoot", "txs",
]);
const LEGACY_HEADER_KEYS = Object.freeze(["txRoot"]);
const ROOT_OBJECT_KEYS = Object.freeze(["leaves", "root"]);
const MODERN_KEYS = Object.freeze([
  "blobRoot", "blobs", "header", "number", "parentHash", "proposer",
  "sig", "timestamp", "txRoot", "txs",
]);
const MODERN_HEADER_KEYS = Object.freeze(["txRoot"]);

export const HISTORICAL_MODERN_HEIGHTS = Object.freeze([
  196019,
  196020,
  1833994,
  1834071,
  1834125,
  1834145,
  1834324,
]);
const LATE_HISTORICAL_MODERN_HEIGHT_SET = new Set(
  HISTORICAL_MODERN_HEIGHTS.filter((height) => height > 196020),
);

export const KNOWN_ANCHORS = Object.freeze({
  196019: CLASS_MODERN_LEGACY_HEADER,
  196020: CLASS_MODERN_LEGACY_HEADER,
  196021: CLASS_LEGACY,
  196022: CLASS_LEGACY,
  198196: CLASS_LEGACY_HEADER_OBJECT,
  1833994: CLASS_MODERN_LEGACY_HEADER,
  1834071: CLASS_MODERN_LEGACY_HEADER,
  1834125: CLASS_MODERN_LEGACY_HEADER,
  1834145: CLASS_MODERN_LEGACY_HEADER,
  1834324: CLASS_MODERN_LEGACY_HEADER,
});

export const KNOWN_RAW_ANCHORS = Object.freeze({
  196019: "7cfdea8a045422864cbdac8fee81941f8a50e6c6f663cc7c3cbbfa1bf817609a",
  196020: "0bbfd47245623e41b90abfce639f18bb928397bb7f17eac879b886a9c1794645",
  1833994: "52f59af645c7c4fa0d9f276b36b33e2dc3ece5f189324015990fd8339bb7b8d3",
  1834071: "31c06881a84cd5968656d1c406acfcb37e1b22917e9a0000f5bbb6999a03c9a4",
  1834125: "11e782c41efaccac2e1f2bbd72dd4d5c0f4fa6ad680ad7a5581d328614ae8f26",
  1834145: "e7fe28c758f88be79f973e3d790089c2ea488696164dba68af17a70e480d90ba",
  1834324: "db944ce4f160c57b9642114cdc039e0fd01c4cf8606b4ab47792aa6023cb1198",
});

export class CartographyHold extends Error {
  constructor(reason, detail = {}) {
    super(reason);
    this.name = "CartographyHold";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = {}) {
  throw new CartographyHold(reason, detail);
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value)
    .filter((key) => typeof value[key] !== "undefined")
    .sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function exactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function safeNonnegativeInt(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function safePositiveInt(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function lowerHex(value, length) {
  return (
    typeof value === "string" &&
    new RegExp(`^[0-9a-f]{${length}}$`).test(value)
  );
}

function txArrayShape(value) {
  if (!Array.isArray(value)) return false;
  for (const tx of value) {
    if (
      !tx ||
      typeof tx !== "object" ||
      Array.isArray(tx) ||
      !lowerHex(tx.hash, 64)
    ) {
      return false;
    }
  }
  return true;
}

function minimalMatch(block) {
  return (
    exactKeys(block, MINIMAL_KEYS) &&
    safeNonnegativeInt(block.number) &&
    safePositiveInt(block.timestamp)
  );
}

function legacyBase(block) {
  return (
    exactKeys(block, LEGACY_KEYS) &&
    block._commit === LEGACY_MARKER &&
    safeNonnegativeInt(block.number) &&
    safePositiveInt(block.ts) &&
    txArrayShape(block.txs) &&
    lowerHex(block.txRoot, 64) &&
    exactKeys(block.header, LEGACY_HEADER_KEYS)
  );
}

function legacyStringMatch(block) {
  return (
    legacyBase(block) &&
    lowerHex(block.header.txRoot, 64) &&
    block.header.txRoot === block.txRoot
  );
}

function legacyObjectMatch(block) {
  const nested = block?.header?.txRoot;
  return (
    legacyBase(block) &&
    block.txs.length === 0 &&
    exactKeys(nested, ROOT_OBJECT_KEYS) &&
    lowerHex(nested.root, 64) &&
    Array.isArray(nested.leaves) &&
    nested.leaves.length === 0 &&
    nested.root === block.txRoot &&
    block.txRoot === LEGACY_EMPTY_TX_ROOT
  );
}

function modernHeaderRootMatchesTop(value, topLevelRoot) {
  if (lowerHex(value, 64)) return value === topLevelRoot;
  return (
    exactKeys(value, ROOT_OBJECT_KEYS) &&
    lowerHex(value.root, 64) &&
    Array.isArray(value.leaves) &&
    value.leaves.length === 0 &&
    value.root === topLevelRoot
  );
}

function modernBase(block) {
  return (
    exactKeys(block, MODERN_KEYS) &&
    safeNonnegativeInt(block.number) &&
    safePositiveInt(block.timestamp) &&
    lowerHex(block.parentHash, 64) &&
    lowerHex(block.txRoot, 64) &&
    lowerHex(block.blobRoot, 64) &&
    Array.isArray(block.txs) &&
    Array.isArray(block.blobs) &&
    lowerHex(block.proposer, 32) &&
    lowerHex(block.sig, 128) &&
    exactKeys(block.header, MODERN_HEADER_KEYS)
  );
}

function modernMatch(block) {
  return (
    modernBase(block) &&
    modernHeaderRootMatchesTop(block.header.txRoot, block.txRoot)
  );
}

function historicalModernLegacyHeaderMatch(block) {
  return (
    modernBase(block) &&
    block.txs.length === 0 &&
    block.blobs.length === 0 &&
    block.txRoot === ZERO64 &&
    block.blobRoot === ZERO64 &&
    block.header.txRoot === LEGACY_EMPTY_TX_ROOT
  );
}

function valueKind(value) {
  if (typeof value === "string") {
    return lowerHex(value, 64) ? "hex64_string" : "string";
  }
  if (Array.isArray(value)) return "array";
  if (value && typeof value === "object") {
    if (
      exactKeys(value, ROOT_OBJECT_KEYS) &&
      lowerHex(value.root, 64) &&
      Array.isArray(value.leaves)
    ) {
      return value.leaves.length === 0
        ? "root_leaves_empty_object"
        : "root_leaves_object";
    }
    return "object";
  }
  if (value === null) return "null";
  if (typeof value === "undefined") return "missing";
  return typeof value;
}

export function classifyBlock(block) {
  const matches = [];
  if (minimalMatch(block)) matches.push(CLASS_MINIMAL);
  if (legacyStringMatch(block)) matches.push(CLASS_LEGACY);
  if (modernMatch(block)) matches.push(CLASS_MODERN);
  if (legacyObjectMatch(block)) matches.push(CLASS_LEGACY_HEADER_OBJECT);
  if (historicalModernLegacyHeaderMatch(block)) {
    matches.push(CLASS_MODERN_LEGACY_HEADER);
  }

  const topKeys =
    block && typeof block === "object" && !Array.isArray(block)
      ? Object.keys(block).sort()
      : [];
  const txs =
    block && typeof block === "object" && Array.isArray(block.txs)
      ? block.txs
      : null;
  const headerRoot =
    block &&
    typeof block === "object" &&
    block.header &&
    typeof block.header === "object" &&
    !Array.isArray(block.header)
      ? block.header.txRoot
      : undefined;

  return {
    classification:
      matches.length === 1
        ? matches[0]
        : matches.length === 0
          ? CLASS_UNKNOWN
          : "AMBIGUOUS",
    matches,
    evidence: {
      top_level_keys: topKeys,
      commit_marker:
        block &&
        typeof block === "object" &&
        typeof block._commit === "string"
          ? block._commit
          : null,
      tx_count: txs ? txs.length : null,
      blob_count:
        block && typeof block === "object" && Array.isArray(block.blobs)
          ? block.blobs.length
          : null,
      tx_root_kind:
        block && typeof block === "object"
          ? valueKind(block.txRoot)
          : "missing",
      blob_root_kind:
        block && typeof block === "object"
          ? valueKind(block.blobRoot)
          : "missing",
      header_tx_root_kind: valueKind(headerRoot),
      top_tx_root_zero64: block?.txRoot === ZERO64,
      top_blob_root_zero64: block?.blobRoot === ZERO64,
      header_tx_root_legacy_empty:
        headerRoot === LEGACY_EMPTY_TX_ROOT,
      proposer_present:
        !!block &&
        typeof block === "object" &&
        typeof block.proposer === "string",
      signature_present:
        !!block &&
        typeof block === "object" &&
        typeof block.sig === "string",
    },
  };
}

function legacyEra(classification) {
  return (
    classification === CLASS_LEGACY ||
    classification === CLASS_LEGACY_HEADER_OBJECT
  );
}

export function transitionAllowed(previousClass, currentClass, height) {
  if (height === 0) {
    return previousClass == null && currentClass === CLASS_MINIMAL;
  }

  if (height < 196019) {
    return previousClass === CLASS_MINIMAL && currentClass === CLASS_MINIMAL;
  }

  if (height === 196019) {
    return (
      previousClass === CLASS_MINIMAL &&
      currentClass === CLASS_MODERN_LEGACY_HEADER
    );
  }

  if (height === 196020) {
    return (
      previousClass === CLASS_MODERN_LEGACY_HEADER &&
      currentClass === CLASS_MODERN_LEGACY_HEADER
    );
  }

  if (height === 196021) {
    return (
      previousClass === CLASS_MODERN_LEGACY_HEADER &&
      currentClass === CLASS_LEGACY
    );
  }

  if (LATE_HISTORICAL_MODERN_HEIGHT_SET.has(height)) {
    return (
      legacyEra(previousClass) &&
      currentClass === CLASS_MODERN_LEGACY_HEADER
    );
  }

  if (LATE_HISTORICAL_MODERN_HEIGHT_SET.has(height - 1)) {
    return (
      previousClass === CLASS_MODERN_LEGACY_HEADER &&
      currentClass === CLASS_LEGACY
    );
  }

  return legacyEra(previousClass) && legacyEra(currentClass);
}

export function currentContractBlockHash(block) {
  const header = {
    number: block?.number,
    parentHash: block?.parentHash,
    timestamp: block?.timestamp,
    txRoot: block?.txRoot,
    blobRoot: block?.blobRoot,
    proposer: block?.proposer,
  };
  return sha256Hex(Buffer.from(JSON.stringify(header), "utf8"));
}

function chainDigestInit() {
  return crypto
    .createHash("sha256")
    .update(`${MARKER}\ncomplete-scan-digest\n`, "utf8")
    .digest();
}

function chainDigestNext(previous, record) {
  return crypto
    .createHash("sha256")
    .update(previous)
    .update(Buffer.from(stableStringify(record), "utf8"))
    .digest();
}

function addCompressedRun(state, classification, height) {
  if (
    state.current &&
    state.current.classification === classification &&
    state.current.to + 1 === height
  ) {
    state.current.to = height;
    state.current.count += 1;
    return;
  }
  if (state.current) state.runs.push(state.current);
  state.current = {
    from: height,
    to: height,
    count: 1,
    classification,
  };
}

function finishCompressedRuns(state) {
  if (state.current) state.runs.push(state.current);
  const ranges = [];
  const exceptions = [];
  for (const run of state.runs) {
    if (run.count === 1) {
      exceptions.push({
        height: run.from,
        classification: run.classification,
      });
    } else {
      ranges.push(run);
    }
  }
  return { ranges, exceptions, runs: state.runs };
}

export function expandCompressedManifest(ranges, exceptions) {
  const entries = [];
  for (const range of ranges || []) {
    for (let height = range.from; height <= range.to; height += 1) {
      entries.push({ height, classification: range.classification });
    }
  }
  for (const exception of exceptions || []) {
    entries.push({
      height: exception.height,
      classification: exception.classification,
    });
  }
  return entries.sort((a, b) => a.height - b.height);
}

function segmentName(base) {
  return String(base).padStart(8, "0");
}

function segmentBasesThrough(head) {
  const out = [];
  for (let base = 0; base <= head; base += SEG_SPAN) out.push(base);
  return out;
}

function confinedRegularFile(file) {
  const st = fs.lstatSync(file, { bigint: true });
  if (!st.isFile() || st.isSymbolicLink()) {
    hold("source_path_not_regular_file", { file: path.basename(file) });
  }
  return st;
}

function statIdentity(file) {
  const st = confinedRegularFile(file);
  return {
    dev: String(st.dev),
    ino: String(st.ino),
    size: Number(st.size),
    mtime_ns: String(st.mtimeNs),
  };
}

function sameStatIdentity(a, b) {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtime_ns === b.mtime_ns
  );
}

function hashFileSync(file) {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(file, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let offset = 0;
    for (;;) {
      const count = fs.readSync(fd, buffer, 0, buffer.length, offset);
      if (count === 0) break;
      hash.update(buffer.subarray(0, count));
      offset += count;
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
}

function sourceHeadMarkers(sourceDir, frozenHead) {
  const headsFile = path.join(sourceDir, "heads.json");
  const headTxt = path.join(sourceDir, "head.txt");
  const headsExists = fs.existsSync(headsFile);
  const txtExists = fs.existsSync(headTxt);

  if (headsExists !== txtExists) {
    hold("source_head_marker_partial", {
      heads_json: headsExists,
      head_txt: txtExists,
    });
  }

  if (!headsExists) return { present: false };

  const heads = JSON.parse(fs.readFileSync(headsFile, "utf8"));
  const txt = Number(
    fs.readFileSync(headTxt, "utf8").trim().split(/\s+/)[0],
  );

  if (
    heads?.head !== frozenHead ||
    heads?.number !== frozenHead ||
    txt !== frozenHead
  ) {
    hold("source_head_marker_mismatch", {
      expected: frozenHead,
      heads_head: heads?.head,
      heads_number: heads?.number,
      head_txt: txt,
    });
  }

  return { present: true };
}

function requireEmptyWal(sourceDir) {
  const walDir = path.join(sourceDir, "wal");
  if (!fs.existsSync(walDir)) return { present: false, files: 0 };

  const st = fs.lstatSync(walDir);
  if (!st.isDirectory() || st.isSymbolicLink()) {
    hold("wal_path_not_directory");
  }

  let files = 0;
  for (const name of fs.readdirSync(walDir).sort()) {
    if (!name.endsWith(".wal")) continue;
    files += 1;
    const fst = confinedRegularFile(path.join(walDir, name));
    if (Number(fst.size) !== 0) {
      hold("nonempty_wal", {
        wal: name,
        bytes: Number(fst.size),
      });
    }
  }

  return { present: true, files };
}

function ensureOutputOutsideSource(sourceDir, output) {
  if (!output) return;
  const source = path.resolve(sourceDir);
  const candidate = path.resolve(output);
  if (
    candidate === source ||
    candidate.startsWith(`${source}${path.sep}`)
  ) {
    hold("output_path_overlaps_source");
  }
}

function sourceInventory(sourceDir, frozenHead) {
  const segmentsDir = path.join(sourceDir, "segments");
  const segSt = fs.lstatSync(segmentsDir);
  if (!segSt.isDirectory() || segSt.isSymbolicLink()) {
    hold("segments_path_not_directory");
  }

  const expectedNames = segmentBasesThrough(frozenHead).map(segmentName);
  const discovered = fs
    .readdirSync(segmentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{8}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (stableStringify(discovered) !== stableStringify(expectedNames)) {
    hold("segment_generation_mismatch", {
      expected_count: expectedNames.length,
      discovered_count: discovered.length,
      first_expected: expectedNames[0] || null,
      last_expected: expectedNames.at(-1) || null,
      first_discovered: discovered[0] || null,
      last_discovered: discovered.at(-1) || null,
    });
  }

  return expectedNames.map((name) => {
    const dir = path.join(segmentsDir, name);
    const dst = fs.lstatSync(dir);
    if (!dst.isDirectory() || dst.isSymbolicLink()) {
      hold("segment_directory_not_regular", { segment: name });
    }
    const file = path.join(dir, "blocks.bin");
    return {
      segment: name,
      file,
      pre_stat: statIdentity(file),
    };
  });
}

function checkpointDescriptorDigest(sourceDir) {
  const file = path.join(sourceDir, "checkpoint.json");
  if (!fs.existsSync(file)) return null;
  confinedRegularFile(file);
  return hashFileSync(file);
}

function boundedHoldEvidence(
  height,
  rawSha256,
  classification,
  evidence,
  reason,
) {
  return {
    height,
    raw_sha256: rawSha256,
    classification,
    reason,
    top_level_keys: evidence.top_level_keys,
    commit_marker: evidence.commit_marker,
    tx_count: evidence.tx_count,
    blob_count: evidence.blob_count,
    tx_root_kind: evidence.tx_root_kind,
    blob_root_kind: evidence.blob_root_kind,
    header_tx_root_kind: evidence.header_tx_root_kind,
  };
}

export function buildManifest(input) {
  const withoutId = {
    schema: SCHEMA,
    marker: MARKER,
    network: "VOID Mainnet-0",
    chain_id: 2050,
    status: input.status,
    scanner_version: SCANNER_VERSION,
    source: input.source,
    vocabulary: [...VOCABULARY],
    historical_blocks_scanned: input.historical_blocks_scanned,
    class_counts: input.class_counts,
    unclassified_blocks: input.unclassified_blocks,
    ambiguous_classifications: input.ambiguous_classifications,
    transition_gaps: input.transition_gaps,
    canonical_bytes_modified: 0,
    modern_validator_modified: false,
    complete_scan_digest: input.complete_scan_digest,
    ranges: input.ranges,
    exceptions: input.exceptions,
    anchors: input.anchors,
    holds: input.holds,
  };
  return {
    ...withoutId,
    manifest_id:
      `voidm0map1_${sha256Hex(
        Buffer.from(stableStringify(withoutId), "utf8"),
      )}`,
  };
}

export function scanHistoricalSource(options) {
  const sourceDir = path.resolve(String(options.sourceDir || ""));
  const frozenHead = Number(options.frozenHead);
  const sourceLabel = String(options.sourceLabel || "").trim();
  const knownAnchors = options.knownAnchors || KNOWN_ANCHORS;
  const knownRawAnchors = options.knownRawAnchors || KNOWN_RAW_ANCHORS;

  if (!sourceDir || !fs.existsSync(sourceDir)) hold("source_dir_missing");
  const rootSt = fs.lstatSync(sourceDir);
  if (!rootSt.isDirectory() || rootSt.isSymbolicLink()) {
    hold("source_dir_not_regular_directory");
  }
  if (!Number.isSafeInteger(frozenHead) || frozenHead < 0) {
    hold("invalid_frozen_head");
  }
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(sourceLabel)) {
    hold("invalid_source_label");
  }

  ensureOutputOutsideSource(sourceDir, options.output);
  ensureOutputOutsideSource(sourceDir, options.evidenceJsonl);

  const headMarkers = sourceHeadMarkers(sourceDir, frozenHead);
  const wal =
    options.requireEmptyWal === false
      ? {
          present: fs.existsSync(path.join(sourceDir, "wal")),
          files: null,
        }
      : requireEmptyWal(sourceDir);
  const checkpointSha256 = checkpointDescriptorDigest(sourceDir);
  const inventory = sourceInventory(sourceDir, frozenHead);

  let evidenceFd = null;
  if (options.evidenceJsonl) {
    const evidencePath = path.resolve(options.evidenceJsonl);
    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    evidenceFd = fs.openSync(evidencePath, "wx", 0o600);
  }

  let expectedHeight = 0;
  let scanned = 0;
  let unclassifiedBlocks = 0;
  let ambiguousClassifications = 0;
  let transitionGaps = 0;
  let previousClass = null;
  let previousBlock = null;
  let completeDigest = chainDigestInit();

  const classCounts = Object.fromEntries(
    VOCABULARY.map((name) => [name, 0]),
  );
  const holds = [];
  const anchors = {};
  const compression = { current: null, runs: [] };
  const segmentDescriptors = [];

  const addHold = (entry) => {
    if (holds.length < 64) holds.push(entry);
  };

  try {
    for (const segment of inventory) {
      const fd = fs.openSync(segment.file, "r");
      const fileHash = crypto.createHash("sha256");
      let offset = 0;

      try {
        const size = segment.pre_stat.size;
        while (offset < size) {
          const prefix = Buffer.allocUnsafe(4);
          if (fs.readSync(fd, prefix, 0, 4, offset) !== 4) {
            hold("torn_frame_prefix", {
              segment: segment.segment,
              offset,
            });
          }

          const length = prefix.readUInt32BE(0);
          if (length <= 0 || length > MAX_FRAME_BYTES) {
            hold("invalid_frame_length", {
              segment: segment.segment,
              offset,
              length,
            });
          }

          const body = Buffer.allocUnsafe(length);
          if (
            fs.readSync(fd, body, 0, length, offset + 4) !== length
          ) {
            hold("torn_frame_body", {
              segment: segment.segment,
              offset,
            });
          }

          fileHash.update(prefix);
          fileHash.update(body);
          offset += 4 + length;

          let block;
          try {
            block = JSON.parse(body.toString("utf8"));
          } catch (error) {
            hold("canonical_frame_invalid_json", {
              segment: segment.segment,
              height: expectedHeight,
              message: String(error?.message || error),
            });
          }

          const rawSha256 = sha256Hex(body);

          if (block?.number !== expectedHeight) {
            transitionGaps += 1;
            hold("height_sequence_mismatch", {
              expected_height: expectedHeight,
              observed_height: block?.number,
              raw_sha256: rawSha256,
            });
          }

          if (expectedHeight > frozenHead) {
            hold("frame_beyond_frozen_head", {
              observed_height: expectedHeight,
              frozen_head: frozenHead,
            });
          }

          const classified = classifyBlock(block);
          const classification = classified.classification;
          let parentHashMatch = null;

          if (classification === CLASS_UNKNOWN) {
            unclassifiedBlocks += 1;
            addHold(
              boundedHoldEvidence(
                expectedHeight,
                rawSha256,
                classification,
                classified.evidence,
                "unknown_shape",
              ),
            );
          } else if (classification === "AMBIGUOUS") {
            ambiguousClassifications += 1;
            addHold(
              boundedHoldEvidence(
                expectedHeight,
                rawSha256,
                classification,
                classified.evidence,
                "ambiguous_shape",
              ),
            );
          } else {
            classCounts[classification] += 1;

            if (
              classification === CLASS_MODERN ||
              classification === CLASS_MODERN_LEGACY_HEADER
            ) {
              if (!previousBlock) {
                parentHashMatch = false;
              } else {
                parentHashMatch =
                  block.parentHash === currentContractBlockHash(previousBlock);
              }
              if (!parentHashMatch) {
                transitionGaps += 1;
                addHold({
                  height: expectedHeight,
                  reason: "modern_parent_hash_mismatch",
                  classification,
                  raw_sha256: rawSha256,
                  observed_parent_hash: block.parentHash,
                  expected_parent_hash: previousBlock
                    ? currentContractBlockHash(previousBlock)
                    : null,
                });
              }
            }

            if (
              !transitionAllowed(
                previousClass,
                classification,
                expectedHeight,
              )
            ) {
              transitionGaps += 1;
              addHold(
                boundedHoldEvidence(
                  expectedHeight,
                  rawSha256,
                  classification,
                  classified.evidence,
                  "historical_transition_not_in_closed_map",
                ),
              );
            }

            previousClass = classification;
            addCompressedRun(
              compression,
              classification,
              expectedHeight,
            );
          }

          const record = {
            height: expectedHeight,
            raw_sha256: rawSha256,
            classification,
            top_level_keys: classified.evidence.top_level_keys,
            commit_marker: classified.evidence.commit_marker,
            tx_count: classified.evidence.tx_count,
            blob_count: classified.evidence.blob_count,
            tx_root_kind: classified.evidence.tx_root_kind,
            blob_root_kind: classified.evidence.blob_root_kind,
            header_tx_root_kind:
              classified.evidence.header_tx_root_kind,
            top_tx_root_zero64:
              classified.evidence.top_tx_root_zero64,
            top_blob_root_zero64:
              classified.evidence.top_blob_root_zero64,
            header_tx_root_legacy_empty:
              classified.evidence.header_tx_root_legacy_empty,
            proposer_present: classified.evidence.proposer_present,
            signature_present:
              classified.evidence.signature_present,
            modern_parent_hash_match: parentHashMatch,
          };

          completeDigest = chainDigestNext(completeDigest, record);

          if (evidenceFd !== null) {
            fs.writeSync(
              evidenceFd,
              `${stableStringify(record)}\n`,
              null,
              "utf8",
            );
          }

          if (Object.hasOwn(knownAnchors, expectedHeight)) {
            const expectedClassification =
              knownAnchors[expectedHeight];
            const expectedRawSha256 = Object.hasOwn(
              knownRawAnchors,
              expectedHeight,
            )
              ? knownRawAnchors[expectedHeight]
              : null;

            anchors[String(expectedHeight)] = {
              height: expectedHeight,
              expected_classification: expectedClassification,
              classification,
              raw_sha256: rawSha256,
              expected_raw_sha256: expectedRawSha256,
              header_tx_root_kind:
                classified.evidence.header_tx_root_kind,
            };

            if (classification !== expectedClassification) {
              addHold({
                height: expectedHeight,
                reason: "known_anchor_classification_mismatch",
                expected: expectedClassification,
                observed: classification,
                raw_sha256: rawSha256,
              });
            }

            if (
              expectedRawSha256 !== null &&
              rawSha256 !== expectedRawSha256
            ) {
              addHold({
                height: expectedHeight,
                reason: "known_anchor_raw_sha256_mismatch",
                expected_raw_sha256: expectedRawSha256,
                observed_raw_sha256: rawSha256,
              });
            }
          }

          previousBlock = block;
          expectedHeight += 1;
          scanned += 1;
        }

        if (offset !== size) {
          hold("segment_eof_mismatch", {
            segment: segment.segment,
            offset,
            size,
          });
        }
      } finally {
        fs.closeSync(fd);
      }

      segmentDescriptors.push({
        segment: segment.segment,
        bytes: segment.pre_stat.size,
        sha256: fileHash.digest("hex"),
      });

      if (typeof options.testAfterSegmentHook === "function") {
        options.testAfterSegmentHook({
          segment: segment.segment,
          file: segment.file,
        });
      }
    }
  } finally {
    if (evidenceFd !== null) fs.closeSync(evidenceFd);
  }

  if (
    expectedHeight !== frozenHead + 1 ||
    scanned !== frozenHead + 1
  ) {
    hold("scan_count_mismatch", {
      expected_blocks: frozenHead + 1,
      scanned,
    });
  }

  for (let index = 0; index < inventory.length; index += 1) {
    const before = inventory[index];
    const afterStat = statIdentity(before.file);
    const afterSha256 = hashFileSync(before.file);

    if (
      !sameStatIdentity(before.pre_stat, afterStat) ||
      afterSha256 !== segmentDescriptors[index].sha256
    ) {
      hold("source_generation_changed_during_scan", {
        segment: before.segment,
        pre_sha256: segmentDescriptors[index].sha256,
        post_sha256: afterSha256,
      });
    }
  }

  const compressed = finishCompressedRuns(compression);
  const sourceSegmentsDigest = sha256Hex(
    Buffer.from(stableStringify(segmentDescriptors), "utf8"),
  );
  const sourceIdentityBody = {
    kind: "raw_segstore_blocks_v1",
    source_label: sourceLabel,
    frozen_head: frozenHead,
    segment_count: segmentDescriptors.length,
    source_segments_digest: sourceSegmentsDigest,
    checkpoint_descriptor_sha256: checkpointSha256,
  };
  const sourceId =
    `voidm0src1_${sha256Hex(
      Buffer.from(stableStringify(sourceIdentityBody), "utf8"),
    )}`;

  if (
    options.expectedSourceId &&
    options.expectedSourceId !== sourceId
  ) {
    hold("source_id_mismatch", {
      expected_source_id: options.expectedSourceId,
      actual_source_id: sourceId,
    });
  }

  const source = {
    ...sourceIdentityBody,
    source_id: sourceId,
    head_markers_present: headMarkers.present === true,
    wal_present: wal.present === true,
    wal_files_checked: wal.files,
  };

  const status =
    unclassifiedBlocks === 0 &&
    ambiguousClassifications === 0 &&
    transitionGaps === 0 &&
    holds.length === 0
      ? "complete"
      : "hold";

  return {
    manifest: buildManifest({
      status,
      source,
      historical_blocks_scanned: scanned,
      class_counts: classCounts,
      unclassified_blocks: unclassifiedBlocks,
      ambiguous_classifications: ambiguousClassifications,
      transition_gaps: transitionGaps,
      complete_scan_digest: completeDigest.toString("hex"),
      ranges: compressed.ranges,
      exceptions: compressed.exceptions,
      anchors,
      holds,
    }),
    segmentDescriptors,
    logicalRuns: compressed.runs,
  };
}

function parseArgs(argv) {
  const options = { requireEmptyWal: true };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) hold("missing_cli_value", { arg });
      return argv[index];
    };

    if (arg === "--source-dir") options.sourceDir = next();
    else if (arg === "--frozen-head") {
      options.frozenHead = Number(next());
    } else if (arg === "--source-label") {
      options.sourceLabel = next();
    } else if (arg === "--output") {
      options.output = next();
    } else if (arg === "--evidence-jsonl") {
      options.evidenceJsonl = next();
    } else if (arg === "--expected-source-id") {
      options.expectedSourceId = next();
    } else if (arg === "--allow-nonempty-wal") {
      options.requireEmptyWal = false;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      hold("unknown_cli_argument", { arg });
    }
  }
  return options;
}

function usage() {
  return [
    "Usage: node scripts/mainnet0_historical_cartography_v1.mjs \\",
    "  --source-dir /path/to/frozen/data-or-checkpoint \\",
    "  --frozen-head 1951058 \\",
    "  --source-label precision-mainnet0-head-1951058 \\",
    "  --output /tmp/mainnet0-historical-cartography-v1.json",
    "",
    "Optional:",
    "  --evidence-jsonl /tmp/mainnet0-historical-cartography-v1.jsonl",
    "  --expected-source-id voidm0src1_<sha256>",
    "  --allow-nonempty-wal   # review only; acceptance requires empty WAL",
  ].join("\n");
}

export function writeManifestExclusive(output, manifest) {
  if (!output) return;
  const destination = path.resolve(output);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(
    destination,
    `${stableStringify(manifest)}\n`,
    { flag: "wx", mode: 0o600 },
  );
}

async function cli() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  if (
    !options.sourceDir ||
    !Number.isSafeInteger(options.frozenHead) ||
    !options.sourceLabel
  ) {
    console.error(usage());
    hold("required_cli_argument_missing");
  }

  try {
    const result = scanHistoricalSource(options);
    writeManifestExclusive(options.output, result.manifest);
    const manifest = result.manifest;
    const suffix =
      manifest.status === "complete" ? "GREEN" : "HOLD";

    console.log(`${MARKER}_${suffix}`);
    console.log(
      `historical_blocks_scanned=${manifest.historical_blocks_scanned}`,
    );
    console.log(
      `unclassified_blocks=${manifest.unclassified_blocks}`,
    );
    console.log(
      `ambiguous_classifications=${manifest.ambiguous_classifications}`,
    );
    console.log(`transition_gaps=${manifest.transition_gaps}`);
    console.log(
      `canonical_bytes_modified=${manifest.canonical_bytes_modified}`,
    );
    console.log(
      `modern_validator_modified=${manifest.modern_validator_modified}`,
    );
    console.log("manifest_reproducible=true");
    console.log(
      `complete_scan_digest=${manifest.complete_scan_digest}`,
    );
    console.log(`source_id=${manifest.source.source_id}`);
    console.log(`manifest_id=${manifest.manifest_id}`);

    if (manifest.status !== "complete") process.exitCode = 2;
  } catch (error) {
    if (error instanceof CartographyHold) {
      const report = {
        schema: "void_mainnet0_historical_cartography_hold_v1",
        marker: `${MARKER}_HOLD`,
        status: "hold",
        reason: error.reason,
        detail: error.detail,
      };
      if (
        options.output &&
        !fs.existsSync(path.resolve(options.output))
      ) {
        writeManifestExclusive(options.output, report);
      }
      console.error(`${MARKER}_HOLD: ${error.reason}`);
      console.error(stableStringify(report));
      process.exitCode = 2;
      return;
    }
    throw error;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  cli().catch((error) => {
    console.error(
      `${MARKER}_FAIL: ${String(error?.stack || error)}`,
    );
    process.exit(1);
  });
}
