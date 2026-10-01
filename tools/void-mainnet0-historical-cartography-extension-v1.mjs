#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MARKER =
  "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_EXTENSION_V1";
export const SCHEMA =
  "void_mainnet0_historical_cartography_extension_v1";
export const VERSION = 1;
export const EXTENSION_ID_PREFIX = "voidm0ext1_";

export const EXPECTED_ACCEPTANCE_ID =
  "voidm0accept1_0845069c3f20572f2fdf80a7aeb4bde0fc359192d1501a1f6221ba90523bf959";
export const EXPECTED_MANIFEST_ID =
  "voidm0map1_38f4dd05deae1a0dbc8b3d028ffd35bda7f1ba177f37a8b4fc37fb20e2bcc912";
export const EXPECTED_SOURCE_ID =
  "voidm0src1_c87dfdfbbe3aa6099bef0f1f9eafab20a09fe0a8d67453e83828c3eb967090da";
export const EXPECTED_FROZEN_HEAD = 1_951_058;
export const EXPECTED_COMPLETE_SCAN_DIGEST =
  "b4fe72e12e2ad709b4c3d6d4c210f8baa3463df2269d616ec9388badae7ed01c";
export const EXPECTED_CLASSIFICATION_SEMANTICS_ROOT =
  "ea40d5f61cc8e8da68445382e76dc000cebce4d3805132bee93269e73d57a5ad";
export const EXPECTED_PREFIX_ROOT =
  "b9c0f187688790dc32e1fea7ea3294a4540bc410131303ec7806d3c811c67dde";
export const EXPECTED_CHECKPOINT_DESCRIPTOR_SHA256 =
  "6d27db0954e625d71c0abe0fb06cc2519562b8b71fe7b25ce0495079558350b8";

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), "..");
const ACCEPTANCE_REL =
  "public/mainnet0-historical-cartography-acceptance-v1.json";
const MANIFEST_REL =
  "public/mainnet0-historical-cartography-v1.json";
const SCANNER_REL =
  "scripts/mainnet0_historical_cartography_v1.mjs";
const MANIFEST_SCHEMA_REL =
  "public/mainnet0-historical-cartography-v1.schema.json";
const HEX64 = /^[0-9a-f]{64}$/u;
const SOURCE_ID = /^voidm0src1_[0-9a-f]{64}$/u;
const MANIFEST_ID = /^voidm0map1_[0-9a-f]{64}$/u;
const ACCEPTANCE_ID = /^voidm0accept1_[0-9a-f]{64}$/u;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

export class CartographyExtensionHold extends Error {
  constructor(reason, detail = {}) {
    super(reason);
    this.name = "CartographyExtensionHold";
    this.reason = reason;
    this.detail = detail;
  }
}

function hold(reason, detail = {}) {
  throw new CartographyExtensionHold(reason, detail);
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((item) => stableStringify(item)).join(",") + "]";
  }
  return "{" + Object.keys(value)
    .filter((key) => typeof value[key] !== "undefined")
    .sort()
    .map((key) => JSON.stringify(key) + ":" + stableStringify(value[key]))
    .join(",") + "}";
}

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashBytes(bytes) {
  return sha256Hex(bytes);
}

function gitBlobSha1(bytes) {
  const header = Buffer.from("blob " + bytes.length + "\0", "utf8");
  return crypto.createHash("sha1").update(header).update(bytes).digest("hex");
}

function readJson(file) {
  let bytes;
  try {
    bytes = fs.readFileSync(file);
  } catch (error) {
    hold("required_json_unavailable", {
      file: path.relative(ROOT, file),
      code: error?.code || null,
    });
  }
  if (bytes.length < 2 || bytes.length > MAX_OUTPUT_BYTES) {
    hold("required_json_size_invalid", {
      file: path.relative(ROOT, file),
      bytes: bytes.length,
    });
  }
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    hold("required_json_invalid", {
      file: path.relative(ROOT, file),
    });
  }
}

function exactObject(value, keys, reason) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    hold(reason);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    hold(reason, { actual, expected });
  }
  return value;
}

function lowerHex(value, length) {
  return (
    typeof value === "string" &&
    new RegExp("^[0-9a-f]{" + length + "}$").test(value)
  );
}

function statIdentity(file) {
  let st;
  try {
    st = fs.lstatSync(file, { bigint: true });
  } catch (error) {
    hold("source_path_unavailable", {
      file,
      code: error?.code || null,
    });
  }
  if (!st.isFile() || st.isSymbolicLink()) {
    hold("source_path_not_regular_file", { file });
  }
  return Object.freeze({
    dev: String(st.dev),
    ino: String(st.ino),
    size: Number(st.size),
    mtime_ns: String(st.mtimeNs),
  });
}

function sameStatIdentity(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtime_ns === right.mtime_ns
  );
}

function hashFile(file, limit = null) {
  const fd = fs.openSync(file, "r");
  const hash = crypto.createHash("sha256");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  let offset = 0;
  try {
    for (;;) {
      let wanted = buffer.length;
      if (limit !== null) {
        if (offset >= limit) break;
        wanted = Math.min(wanted, limit - offset);
      }
      const count = fs.readSync(fd, buffer, 0, wanted, offset);
      if (count === 0) break;
      hash.update(buffer.subarray(0, count));
      offset += count;
    }
  } finally {
    fs.closeSync(fd);
  }
  if (limit !== null && offset !== limit) {
    hold("source_prefix_short_read", { file, expected: limit, observed: offset });
  }
  return hash.digest("hex");
}

function rederiveContentAddress(value, field, prefix) {
  const clone = structuredClone(value);
  delete clone[field];
  return prefix + sha256Hex(Buffer.from(stableStringify(clone), "utf8"));
}

function validateManifestCompression(manifest, vocabulary) {
  const entries = [];
  for (const range of manifest.ranges || []) {
    if (
      !Number.isSafeInteger(range.from) ||
      !Number.isSafeInteger(range.to) ||
      !Number.isSafeInteger(range.count) ||
      range.from < 0 ||
      range.to < range.from ||
      range.count !== range.to - range.from + 1 ||
      range.count < 2 ||
      !vocabulary.includes(range.classification)
    ) {
      hold("prior_manifest_range_invalid", { range });
    }
    entries.push({
      from: range.from,
      to: range.to,
      count: range.count,
      classification: range.classification,
      kind: "range",
    });
  }
  for (const exception of manifest.exceptions || []) {
    if (
      !Number.isSafeInteger(exception.height) ||
      exception.height < 0 ||
      !vocabulary.includes(exception.classification)
    ) {
      hold("prior_manifest_exception_invalid", { exception });
    }
    entries.push({
      from: exception.height,
      to: exception.height,
      count: 1,
      classification: exception.classification,
      kind: "exception",
    });
  }
  entries.sort((a, b) => a.from - b.from || a.to - b.to);
  let expected = 0;
  const counts = Object.fromEntries(vocabulary.map((name) => [name, 0]));
  for (const entry of entries) {
    if (entry.from !== expected) {
      hold("prior_manifest_compression_gap_or_overlap", {
        expected,
        observed: entry.from,
      });
    }
    counts[entry.classification] += entry.count;
    expected = entry.to + 1;
  }
  if (expected !== manifest.historical_blocks_scanned) {
    hold("prior_manifest_compression_count_mismatch", {
      expected,
      scanned: manifest.historical_blocks_scanned,
    });
  }
  if (stableStringify(counts) !== stableStringify(manifest.class_counts)) {
    hold("prior_manifest_class_count_mismatch", { counts });
  }
  const terminal = entries.at(-1);
  if (!terminal || terminal.to !== manifest.source.frozen_head) {
    hold("prior_manifest_terminal_run_missing");
  }
  return Object.freeze({ entries, terminal, counts });
}

function prefixRootBody(authority) {
  return {
    schema: "void_mainnet0_prefix_commitment_body_v1",
    chain_id: 2050,
    frozen_head: authority.frozen_head,
    segment_count: authority.segment_count,
    total_prefix_bytes: authority.total_prefix_bytes,
    descriptors: authority.descriptors,
  };
}

function validatePrefixAuthority(authority, segSpan) {
  if (!authority || typeof authority !== "object" || Array.isArray(authority)) {
    hold("prior_prefix_authority_invalid");
  }
  if (
    !Number.isSafeInteger(authority.frozen_head) ||
    authority.frozen_head < 0 ||
    authority.block_count !== authority.frozen_head + 1 ||
    !Number.isSafeInteger(authority.segment_count) ||
    authority.segment_count < 1 ||
    !Number.isSafeInteger(authority.total_prefix_bytes) ||
    authority.total_prefix_bytes < 1 ||
    !lowerHex(authority.prefix_root, 64) ||
    !Array.isArray(authority.descriptors) ||
    authority.descriptors.length !== authority.segment_count
  ) {
    hold("prior_prefix_authority_shape_invalid");
  }
  let expectedHeight = 0;
  let totalBytes = 0;
  for (let index = 0; index < authority.descriptors.length; index += 1) {
    const entry = authority.descriptors[index];
    const expectedFrom = index * segSpan;
    const expectedTo = Math.min(
      expectedFrom + segSpan - 1,
      authority.frozen_head,
    );
    const expectedName = String(expectedFrom).padStart(8, "0");
    if (
      entry?.segment !== expectedName ||
      entry?.from !== expectedHeight ||
      entry?.from !== expectedFrom ||
      entry?.to !== expectedTo ||
      !Number.isSafeInteger(entry.prefix_bytes) ||
      entry.prefix_bytes < 1 ||
      !lowerHex(entry.prefix_sha256, 64)
    ) {
      hold("prior_prefix_descriptor_invalid", { index, entry });
    }
    expectedHeight = expectedTo + 1;
    totalBytes += entry.prefix_bytes;
  }
  if (
    expectedHeight !== authority.block_count ||
    totalBytes !== authority.total_prefix_bytes
  ) {
    hold("prior_prefix_descriptor_conservation_failed", {
      expectedHeight,
      totalBytes,
    });
  }
  const root = sha256Hex(
    Buffer.from(stableStringify(prefixRootBody(authority)), "utf8"),
  );
  if (root !== authority.prefix_root) {
    hold("prior_prefix_root_mismatch", {
      expected: authority.prefix_root,
      actual: root,
    });
  }
  return authority;
}

function computeSemantics(root) {
  const inputs = [SCANNER_REL, MANIFEST_SCHEMA_REL].map((relativePath) => {
    const file = path.join(root, relativePath);
    return {
      path: relativePath,
      sha256: hashBytes(fs.readFileSync(file)),
    };
  });
  const body = {
    schema: "void_mainnet0_classification_semantics_v1",
    algorithm: "sha256_stable_json_file_digest_set_v1",
    inputs,
  };
  return Object.freeze({
    ...body,
    root: sha256Hex(Buffer.from(stableStringify(body), "utf8")),
  });
}

export function validateBaselineArtifactsV1(
  acceptanceInput,
  manifestInput,
  {
    repoRoot = ROOT,
    requireProductionIdentity = false,
    scannerMeta,
  } = {},
) {
  const acceptance = structuredClone(acceptanceInput);
  const manifest = structuredClone(manifestInput);
  if (!scannerMeta) hold("scanner_metadata_required");
  const vocabulary = [...scannerMeta.VOCABULARY];

  if (
    !ACCEPTANCE_ID.test(String(acceptance?.acceptance_id || "")) ||
    acceptance.acceptance_id !==
      rederiveContentAddress(acceptance, "acceptance_id", "voidm0accept1_")
  ) {
    hold("prior_acceptance_id_mismatch");
  }
  if (
    !MANIFEST_ID.test(String(manifest?.manifest_id || "")) ||
    manifest.manifest_id !==
      rederiveContentAddress(manifest, "manifest_id", "voidm0map1_")
  ) {
    hold("prior_manifest_id_mismatch");
  }
  if (
    manifest.marker !== scannerMeta.MARKER ||
    manifest.schema !== scannerMeta.SCHEMA ||
    manifest.scanner_version !== scannerMeta.SCANNER_VERSION ||
    manifest.status !== "complete" ||
    manifest.unclassified_blocks !== 0 ||
    manifest.ambiguous_classifications !== 0 ||
    manifest.transition_gaps !== 0 ||
    manifest.canonical_bytes_modified !== 0 ||
    manifest.modern_validator_modified !== false ||
    !Array.isArray(manifest.holds) ||
    manifest.holds.length !== 0 ||
    stableStringify(manifest.vocabulary) !== stableStringify(vocabulary)
  ) {
    hold("prior_manifest_not_accepted_complete_shape");
  }
  if (
    !SOURCE_ID.test(String(manifest.source?.source_id || "")) ||
    manifest.source.frozen_head !== manifest.historical_blocks_scanned - 1
  ) {
    hold("prior_manifest_source_identity_invalid");
  }
  const sourceIdentity = {
    kind: manifest.source.kind,
    source_label: manifest.source.source_label,
    frozen_head: manifest.source.frozen_head,
    segment_count: manifest.source.segment_count,
    source_segments_digest: manifest.source.source_segments_digest,
    checkpoint_descriptor_sha256:
      manifest.source.checkpoint_descriptor_sha256,
  };
  const sourceId =
    "voidm0src1_" +
    sha256Hex(Buffer.from(stableStringify(sourceIdentity), "utf8"));
  if (sourceId !== manifest.source.source_id) {
    hold("prior_manifest_source_id_mismatch");
  }
  const compression = validateManifestCompression(manifest, vocabulary);
  const prefix = validatePrefixAuthority(
    acceptance.canonical_prefix_authority,
    scannerMeta.SEG_SPAN,
  );

  if (
    acceptance.marker !==
      "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_ACCEPTANCE_V1_2" ||
    acceptance.version !== "v1.2" ||
    acceptance.network !== "VOID Mainnet-0" ||
    acceptance.chain_id !== 2050 ||
    acceptance.status !== "complete" ||
    acceptance.scan?.manifest_id !== manifest.manifest_id ||
    acceptance.scan?.source_id !== manifest.source.source_id ||
    acceptance.scan?.frozen_head !== manifest.source.frozen_head ||
    acceptance.scan?.historical_blocks_scanned !==
      manifest.historical_blocks_scanned ||
    acceptance.scan?.complete_scan_digest !== manifest.complete_scan_digest ||
    stableStringify(acceptance.scan?.class_counts) !==
      stableStringify(manifest.class_counts) ||
    prefix.frozen_head !== manifest.source.frozen_head ||
    acceptance.immutable_snapshot?.checkpoint_prefix_root !==
      prefix.prefix_root ||
    acceptance.immutable_snapshot?.immutable_rescan_complete_scan_digest !==
      manifest.complete_scan_digest ||
    acceptance.acceptance_contract?.append_authority !== false ||
    acceptance.acceptance_contract?.validator_authority !== false ||
    acceptance.acceptance_contract?.runtime_authority !== false ||
    acceptance.acceptance_contract?.canonical_bytes_modified !== 0 ||
    acceptance.acceptance_contract?.modern_validator_modified !== false
  ) {
    hold("prior_acceptance_manifest_binding_mismatch");
  }

  const semantics = computeSemantics(path.resolve(repoRoot));
  if (
    stableStringify(semantics) !==
      stableStringify(acceptance.classification_semantics)
  ) {
    hold("classification_semantics_root_mismatch", {
      expected: acceptance.classification_semantics?.root || null,
      actual: semantics.root,
    });
  }

  if (requireProductionIdentity) {
    if (
      acceptance.acceptance_id !== EXPECTED_ACCEPTANCE_ID ||
      manifest.manifest_id !== EXPECTED_MANIFEST_ID ||
      manifest.source.source_id !== EXPECTED_SOURCE_ID ||
      manifest.source.frozen_head !== EXPECTED_FROZEN_HEAD ||
      manifest.complete_scan_digest !== EXPECTED_COMPLETE_SCAN_DIGEST ||
      semantics.root !== EXPECTED_CLASSIFICATION_SEMANTICS_ROOT ||
      prefix.prefix_root !== EXPECTED_PREFIX_ROOT ||
      acceptance.immutable_snapshot?.checkpoint_descriptor_sha256 !==
        EXPECTED_CHECKPOINT_DESCRIPTOR_SHA256
    ) {
      hold("production_baseline_identity_mismatch");
    }
  }

  return Object.freeze({
    acceptance,
    manifest,
    prefix,
    semantics,
    compression,
  });
}

function readHeadMarkers(sourceDir, frozenHead) {
  const headsFile = path.join(sourceDir, "heads.json");
  const headFile = path.join(sourceDir, "head.txt");
  const headsExists = fs.existsSync(headsFile);
  const headExists = fs.existsSync(headFile);
  if (headsExists !== headExists) hold("source_head_marker_partial");
  if (!headsExists) return Object.freeze({ present: false });
  const headsStat = statIdentity(headsFile);
  const headStat = statIdentity(headFile);
  const headsBytes = fs.readFileSync(headsFile);
  const headBytes = fs.readFileSync(headFile);
  let heads;
  try {
    heads = JSON.parse(headsBytes.toString("utf8"));
  } catch {
    hold("source_head_marker_invalid_json");
  }
  const txt = Number(headBytes.toString("utf8").trim().split(/\s+/u)[0]);
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
  return Object.freeze({
    present: true,
    heads_json_stat: headsStat,
    head_txt_stat: headStat,
    heads_json_sha256: hashBytes(headsBytes),
    head_txt_sha256: hashBytes(headBytes),
  });
}

function readWalState(sourceDir) {
  const walDir = path.join(sourceDir, "wal");
  if (!fs.existsSync(walDir)) {
    return Object.freeze({ present: false, files: 0, entries: [] });
  }
  const st = fs.lstatSync(walDir);
  if (!st.isDirectory() || st.isSymbolicLink()) {
    hold("wal_path_not_directory");
  }
  const entries = [];
  for (const name of fs.readdirSync(walDir).sort()) {
    if (!name.endsWith(".wal")) continue;
    const file = path.join(walDir, name);
    const fst = statIdentity(file);
    if (fst.size !== 0) {
      hold("nonempty_wal", { wal: name, bytes: fst.size });
    }
    entries.push(Object.freeze({
      name,
      stat: fst,
      sha256: hashFile(file),
    }));
  }
  return Object.freeze({
    present: true,
    files: entries.length,
    entries,
  });
}

function checkpointDescriptorDigest(sourceDir) {
  const file = path.join(sourceDir, "checkpoint.json");
  if (!fs.existsSync(file)) return null;
  statIdentity(file);
  return hashFile(file);
}

function expectedSegmentNames(frozenHead, segSpan) {
  const out = [];
  for (let base = 0; base <= frozenHead; base += segSpan) {
    out.push(String(base).padStart(8, "0"));
  }
  return out;
}

function sourceInventory(sourceDir, frozenHead, segSpan) {
  const segmentsDir = path.join(sourceDir, "segments");
  let st;
  try {
    st = fs.lstatSync(segmentsDir);
  } catch {
    hold("segments_path_missing");
  }
  if (!st.isDirectory() || st.isSymbolicLink()) {
    hold("segments_path_not_directory");
  }
  const expected = expectedSegmentNames(frozenHead, segSpan);
  const discovered = fs.readdirSync(segmentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[0-9]{8}$/u.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (stableStringify(expected) !== stableStringify(discovered)) {
    hold("segment_generation_mismatch", { expected, discovered });
  }
  return expected.map((segment) => {
    const dir = path.join(segmentsDir, segment);
    const dst = fs.lstatSync(dir);
    if (!dst.isDirectory() || dst.isSymbolicLink()) {
      hold("segment_directory_not_regular", { segment });
    }
    const file = path.join(dir, "blocks.bin");
    return Object.freeze({
      segment,
      file,
      pre_stat: statIdentity(file),
    });
  });
}

function readFrame(fd, offset, size, maxFrameBytes, segment) {
  if (offset + 4 > size) {
    hold("torn_frame_prefix", { segment, offset });
  }
  const prefix = Buffer.allocUnsafe(4);
  if (fs.readSync(fd, prefix, 0, 4, offset) !== 4) {
    hold("torn_frame_prefix", { segment, offset });
  }
  const length = prefix.readUInt32BE(0);
  if (length <= 0 || length > maxFrameBytes) {
    hold("invalid_frame_length", { segment, offset, length });
  }
  if (offset + 4 + length > size) {
    hold("torn_frame_body", { segment, offset, length, size });
  }
  const body = Buffer.allocUnsafe(length);
  if (fs.readSync(fd, body, 0, length, offset + 4) !== length) {
    hold("torn_frame_body", { segment, offset });
  }
  let block;
  try {
    block = JSON.parse(body.toString("utf8"));
  } catch {
    hold("canonical_frame_invalid_json", { segment, offset });
  }
  return Object.freeze({
    prefix,
    body,
    block,
    next_offset: offset + 4 + length,
  });
}

function terminalRunFromManifest(manifest) {
  const head = manifest.source.frozen_head;
  const ranges = manifest.ranges
    .map((entry, index) => ({ ...entry, kind: "range", index }))
    .filter((entry) => entry.to === head);
  const exceptions = manifest.exceptions
    .map((entry, index) => ({
      from: entry.height,
      to: entry.height,
      count: 1,
      classification: entry.classification,
      kind: "exception",
      index,
    }))
    .filter((entry) => entry.to === head);
  const matches = [...ranges, ...exceptions];
  if (matches.length !== 1) hold("prior_terminal_run_ambiguous");
  return matches[0];
}

function addRunRecord(state, classification, height) {
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

function finishRuns(state) {
  if (state.current) state.runs.push(state.current);
  return state.runs;
}

function combineCompression(priorManifest, suffixRecords) {
  const terminal = terminalRunFromManifest(priorManifest);
  const ranges = priorManifest.ranges.map((entry) => ({ ...entry }));
  const exceptions = priorManifest.exceptions.map((entry) => ({ ...entry }));
  if (terminal.kind === "range") ranges.splice(terminal.index, 1);
  else exceptions.splice(terminal.index, 1);

  const state = {
    current: {
      from: terminal.from,
      to: terminal.to,
      count: terminal.count,
      classification: terminal.classification,
    },
    runs: [],
  };
  for (const record of suffixRecords) {
    addRunRecord(state, record.classification, record.height);
  }
  for (const run of finishRuns(state)) {
    if (run.count === 1) {
      exceptions.push({
        height: run.from,
        classification: run.classification,
      });
    } else {
      ranges.push(run);
    }
  }
  return Object.freeze({ ranges, exceptions });
}

function digestNext(previousHex, record) {
  if (!lowerHex(previousHex, 64)) hold("prior_complete_scan_digest_invalid");
  return crypto.createHash("sha256")
    .update(Buffer.from(previousHex, "hex"))
    .update(Buffer.from(stableStringify(record), "utf8"))
    .digest("hex");
}

function scanAcceptedTerminalPrefix({
  file,
  descriptor,
  scanner,
  expectedTerminalClassification,
}) {
  const fd = fs.openSync(file, "r");
  const hash = crypto.createHash("sha256");
  let offset = 0;
  let expectedHeight = descriptor.from;
  let lastBlock = null;
  let lastBody = null;
  try {
    while (offset < descriptor.prefix_bytes) {
      const frame = readFrame(
        fd,
        offset,
        descriptor.prefix_bytes,
        scanner.MAX_FRAME_BYTES,
        descriptor.segment,
      );
      hash.update(frame.prefix);
      hash.update(frame.body);
      if (frame.block?.number !== expectedHeight) {
        hold("accepted_terminal_prefix_height_mismatch", {
          expected: expectedHeight,
          observed: frame.block?.number,
        });
      }
      lastBlock = frame.block;
      lastBody = frame.body;
      expectedHeight += 1;
      offset = frame.next_offset;
    }
  } finally {
    fs.closeSync(fd);
  }
  if (
    offset !== descriptor.prefix_bytes ||
    expectedHeight !== descriptor.to + 1 ||
    !lastBlock ||
    lastBlock.number !== descriptor.to
  ) {
    hold("accepted_terminal_prefix_boundary_mismatch");
  }
  const prefixSha = hash.digest("hex");
  if (prefixSha !== descriptor.prefix_sha256) {
    hold("accepted_terminal_prefix_sha256_mismatch", {
      expected: descriptor.prefix_sha256,
      observed: prefixSha,
    });
  }
  const classified = scanner.classifyBlock(lastBlock);
  if (classified.classification !== expectedTerminalClassification) {
    hold("accepted_terminal_classification_mismatch", {
      expected: expectedTerminalClassification,
      observed: classified.classification,
    });
  }
  return Object.freeze({
    block: lastBlock,
    raw_sha256: hashBytes(lastBody),
    classification: classified.classification,
  });
}

function verifyAcceptedPrefixFiles(sourceDir, prefix, scanner, inventory) {
  const bySegment = new Map(inventory.map((entry) => [entry.segment, entry]));
  let verifiedBytes = 0;
  for (let index = 0; index < prefix.descriptors.length; index += 1) {
    const descriptor = prefix.descriptors[index];
    const entry = bySegment.get(descriptor.segment);
    if (!entry) hold("accepted_prefix_segment_missing", { segment: descriptor.segment });
    const isTerminal = index === prefix.descriptors.length - 1;
    if (!isTerminal && entry.pre_stat.size !== descriptor.prefix_bytes) {
      hold("accepted_closed_segment_size_changed", {
        segment: descriptor.segment,
        expected: descriptor.prefix_bytes,
        observed: entry.pre_stat.size,
      });
    }
    if (isTerminal && entry.pre_stat.size < descriptor.prefix_bytes) {
      hold("accepted_terminal_segment_truncated", {
        expected: descriptor.prefix_bytes,
        observed: entry.pre_stat.size,
      });
    }
    const observed = hashFile(entry.file, descriptor.prefix_bytes);
    if (observed !== descriptor.prefix_sha256) {
      hold("accepted_prefix_sha256_mismatch", {
        segment: descriptor.segment,
        expected: descriptor.prefix_sha256,
        observed,
      });
    }
    verifiedBytes += descriptor.prefix_bytes;
  }
  if (verifiedBytes !== prefix.total_prefix_bytes) {
    hold("accepted_prefix_verified_byte_count_mismatch");
  }
  return verifiedBytes;
}

function recordForBlock(height, body, block, scanner, previousBlock) {
  const rawSha256 = hashBytes(body);
  const classified = scanner.classifyBlock(block);
  const classification = classified.classification;
  if (
    classification === scanner.CLASS_UNKNOWN ||
    classification === "AMBIGUOUS"
  ) {
    hold("suffix_classification_not_closed", {
      height,
      classification,
      raw_sha256: rawSha256,
    });
  }
  if (
    !scanner.transitionAllowed(
      previousBlock.classification,
      classification,
      height,
    )
  ) {
    hold("suffix_transition_not_in_closed_map", {
      height,
      previous: previousBlock.classification,
      current: classification,
    });
  }
  let parentHashMatch = null;
  if (
    classification === scanner.CLASS_MODERN ||
    classification === scanner.CLASS_MODERN_LEGACY_HEADER
  ) {
    parentHashMatch =
      block.parentHash === scanner.currentContractBlockHash(previousBlock.block);
    if (!parentHashMatch) {
      hold("suffix_modern_parent_hash_mismatch", {
        height,
        observed_parent_hash: block.parentHash,
        expected_parent_hash: scanner.currentContractBlockHash(previousBlock.block),
      });
    }
  }
  const evidence = classified.evidence;
  return Object.freeze({
    record: Object.freeze({
      height,
      raw_sha256: rawSha256,
      classification,
      top_level_keys: evidence.top_level_keys,
      commit_marker: evidence.commit_marker,
      tx_count: evidence.tx_count,
      blob_count: evidence.blob_count,
      tx_root_kind: evidence.tx_root_kind,
      blob_root_kind: evidence.blob_root_kind,
      header_tx_root_kind: evidence.header_tx_root_kind,
      top_tx_root_zero64: evidence.top_tx_root_zero64,
      top_blob_root_zero64: evidence.top_blob_root_zero64,
      header_tx_root_legacy_empty: evidence.header_tx_root_legacy_empty,
      proposer_present: evidence.proposer_present,
      signature_present: evidence.signature_present,
      modern_parent_hash_match: parentHashMatch,
    }),
    current: Object.freeze({ block, classification }),
  });
}

export function extendCartographySourceV1({
  priorManifest,
  priorPrefixAuthority,
  sourceDir,
  newFrozenHead,
  sourceLabel,
  scanner = SCANNER,
  testAfterSuffixFrameHook = null,
}) {
  if (
    !MANIFEST_ID.test(String(priorManifest?.manifest_id || "")) ||
    priorManifest.manifest_id !==
      rederiveContentAddress(priorManifest, "manifest_id", "voidm0map1_") ||
    priorManifest.status !== "complete" ||
    priorManifest.marker !== scanner.MARKER ||
    priorManifest.schema !== scanner.SCHEMA ||
    priorManifest.scanner_version !== scanner.SCANNER_VERSION ||
    priorManifest.unclassified_blocks !== 0 ||
    priorManifest.ambiguous_classifications !== 0 ||
    priorManifest.transition_gaps !== 0 ||
    !Array.isArray(priorManifest.holds) ||
    priorManifest.holds.length !== 0
  ) {
    hold("prior_manifest_integrity_mismatch");
  }
  const priorSourceIdentity = {
    kind: priorManifest.source?.kind,
    source_label: priorManifest.source?.source_label,
    frozen_head: priorManifest.source?.frozen_head,
    segment_count: priorManifest.source?.segment_count,
    source_segments_digest: priorManifest.source?.source_segments_digest,
    checkpoint_descriptor_sha256:
      priorManifest.source?.checkpoint_descriptor_sha256,
  };
  const priorSourceId =
    "voidm0src1_" +
    sha256Hex(Buffer.from(stableStringify(priorSourceIdentity), "utf8"));
  if (
    !SOURCE_ID.test(String(priorManifest.source?.source_id || "")) ||
    priorManifest.source.source_id !== priorSourceId ||
    !lowerHex(priorManifest.complete_scan_digest, 64)
  ) {
    hold("prior_manifest_source_or_digest_mismatch");
  }

  const source = path.resolve(String(sourceDir || ""));
  if (!source || !fs.existsSync(source)) hold("source_dir_missing");
  const rootSt = fs.lstatSync(source);
  if (!rootSt.isDirectory() || rootSt.isSymbolicLink()) {
    hold("source_dir_not_regular_directory");
  }
  if (
    !Number.isSafeInteger(newFrozenHead) ||
    newFrozenHead <= priorManifest.source.frozen_head
  ) {
    hold("new_frozen_head_must_extend_prior");
  }
  if (!/^[A-Za-z0-9._-]{1,128}$/u.test(String(sourceLabel || ""))) {
    hold("invalid_source_label");
  }

  validatePrefixAuthority(priorPrefixAuthority, scanner.SEG_SPAN);
  const priorCompression = validateManifestCompression(
    priorManifest,
    [...scanner.VOCABULARY],
  );
  if (
    priorPrefixAuthority.frozen_head !== priorManifest.source.frozen_head ||
    priorPrefixAuthority.block_count !== priorManifest.historical_blocks_scanned
  ) {
    hold("prior_prefix_manifest_height_mismatch");
  }

  const headBefore = readHeadMarkers(source, newFrozenHead);
  const walBefore = readWalState(source);
  const checkpointBefore = checkpointDescriptorDigest(source);
  const inventory = sourceInventory(source, newFrozenHead, scanner.SEG_SPAN);
  const inventoryBySegment = new Map(
    inventory.map((entry) => [entry.segment, entry]),
  );
  const verifiedPrefixBytes = verifyAcceptedPrefixFiles(
    source,
    priorPrefixAuthority,
    scanner,
    inventory,
  );

  const terminalDescriptor = priorPrefixAuthority.descriptors.at(-1);
  const terminalEntry = inventoryBySegment.get(terminalDescriptor.segment);
  const terminalRun = priorCompression.terminal;
  const terminal = scanAcceptedTerminalPrefix({
    file: terminalEntry.file,
    descriptor: terminalDescriptor,
    scanner,
    expectedTerminalClassification: terminalRun.classification,
  });

  let expectedHeight = priorManifest.source.frozen_head + 1;
  let completeDigest = priorManifest.complete_scan_digest;
  let previous = Object.freeze({
    block: terminal.block,
    classification: terminal.classification,
  });
  const suffixRecords = [];
  const suffixCounts = Object.fromEntries(
    [...scanner.VOCABULARY].map((name) => [name, 0]),
  );
  const parseTimeSegmentHashes = new Map();
  const firstExtensionBase =
    Math.floor(priorManifest.source.frozen_head / scanner.SEG_SPAN) *
    scanner.SEG_SPAN;

  for (let base = firstExtensionBase; base <= newFrozenHead; base += scanner.SEG_SPAN) {
    const segment = String(base).padStart(8, "0");
    const entry = inventoryBySegment.get(segment);
    if (!entry) hold("suffix_segment_missing", { segment });
    const fd = fs.openSync(entry.file, "r");
    const fileHash = crypto.createHash("sha256");
    let offset = 0;
    try {
      if (base === firstExtensionBase) {
        const prefixBytes = terminalDescriptor.prefix_bytes;
        const buffer = Buffer.allocUnsafe(1024 * 1024);
        let prefixOffset = 0;
        while (prefixOffset < prefixBytes) {
          const wanted = Math.min(buffer.length, prefixBytes - prefixOffset);
          const count = fs.readSync(
            fd,
            buffer,
            0,
            wanted,
            prefixOffset,
          );
          if (count <= 0) hold("accepted_terminal_prefix_short_read");
          fileHash.update(buffer.subarray(0, count));
          prefixOffset += count;
        }
        offset = prefixBytes;
      }

      while (offset < entry.pre_stat.size) {
        if (expectedHeight > newFrozenHead) {
          hold("frame_beyond_new_frozen_head", {
            segment,
            expectedHeight,
            newFrozenHead,
          });
        }
        const frame = readFrame(
          fd,
          offset,
          entry.pre_stat.size,
          scanner.MAX_FRAME_BYTES,
          segment,
        );
        fileHash.update(frame.prefix);
        fileHash.update(frame.body);
        if (frame.block?.number !== expectedHeight) {
          hold("suffix_height_sequence_mismatch", {
            expected: expectedHeight,
            observed: frame.block?.number,
          });
        }
        const evaluated = recordForBlock(
          expectedHeight,
          frame.body,
          frame.block,
          scanner,
          previous,
        );
        suffixRecords.push(evaluated.record);
        suffixCounts[evaluated.record.classification] += 1;
        completeDigest = digestNext(completeDigest, evaluated.record);
        previous = evaluated.current;
        expectedHeight += 1;
        offset = frame.next_offset;

        if (typeof testAfterSuffixFrameHook === "function") {
          testAfterSuffixFrameHook({
            height: evaluated.record.height,
            segment,
            file: entry.file,
          });
        }
      }
    } finally {
      fs.closeSync(fd);
    }
    parseTimeSegmentHashes.set(segment, fileHash.digest("hex"));
  }

  if (expectedHeight !== newFrozenHead + 1) {
    hold("extension_scan_count_mismatch", {
      expected: newFrozenHead + 1,
      observed: expectedHeight,
    });
  }

  const segmentDescriptors = [];
  const acceptedFinalSegment = terminalDescriptor.segment;
  for (const entry of inventory) {
    const postStat = statIdentity(entry.file);
    if (!sameStatIdentity(entry.pre_stat, postStat)) {
      hold("source_generation_changed_during_extension", {
        segment: entry.segment,
        component: "stat",
      });
    }
    const postSha = hashFile(entry.file);
    const priorDescriptor = priorPrefixAuthority.descriptors.find(
      (descriptor) => descriptor.segment === entry.segment,
    );
    if (priorDescriptor && entry.segment !== acceptedFinalSegment) {
      if (
        postStat.size !== priorDescriptor.prefix_bytes ||
        postSha !== priorDescriptor.prefix_sha256
      ) {
        hold("accepted_closed_segment_changed_during_extension", {
          segment: entry.segment,
        });
      }
    }
    if (entry.segment === acceptedFinalSegment) {
      const prefixSha = hashFile(entry.file, terminalDescriptor.prefix_bytes);
      if (prefixSha !== terminalDescriptor.prefix_sha256) {
        hold("accepted_terminal_prefix_changed_during_extension");
      }
    }
    const parseHash = parseTimeSegmentHashes.get(entry.segment);
    if (parseHash !== undefined && parseHash !== postSha) {
      hold("source_generation_changed_during_suffix_scan", {
        segment: entry.segment,
      });
    }
    segmentDescriptors.push({
      segment: entry.segment,
      bytes: postStat.size,
      sha256: postSha,
    });
  }

  const headAfter = readHeadMarkers(source, newFrozenHead);
  const walAfter = readWalState(source);
  const checkpointAfter = checkpointDescriptorDigest(source);
  if (
    stableStringify(headAfter) !== stableStringify(headBefore) ||
    stableStringify(walAfter) !== stableStringify(walBefore) ||
    checkpointAfter !== checkpointBefore
  ) {
    hold("source_generation_changed_during_extension", {
      component: "metadata",
    });
  }

  const sourceSegmentsDigest = sha256Hex(
    Buffer.from(stableStringify(segmentDescriptors), "utf8"),
  );
  const sourceIdentity = {
    kind: "raw_segstore_blocks_v1",
    source_label: String(sourceLabel),
    frozen_head: newFrozenHead,
    segment_count: segmentDescriptors.length,
    source_segments_digest: sourceSegmentsDigest,
    checkpoint_descriptor_sha256: checkpointAfter,
  };
  const sourceId =
    "voidm0src1_" +
    sha256Hex(Buffer.from(stableStringify(sourceIdentity), "utf8"));
  const candidateSource = {
    ...sourceIdentity,
    source_id: sourceId,
    head_markers_present: headBefore.present === true,
    wal_present: walBefore.present === true,
    wal_files_checked: walBefore.files,
  };

  const classCounts = { ...priorManifest.class_counts };
  for (const name of scanner.VOCABULARY) {
    classCounts[name] += suffixCounts[name];
  }
  const combined = combineCompression(priorManifest, suffixRecords);
  const candidateManifest = scanner.buildManifest({
    status: "complete",
    source: candidateSource,
    historical_blocks_scanned: newFrozenHead + 1,
    class_counts: classCounts,
    unclassified_blocks: 0,
    ambiguous_classifications: 0,
    transition_gaps: 0,
    complete_scan_digest: completeDigest,
    ranges: combined.ranges,
    exceptions: combined.exceptions,
    anchors: structuredClone(priorManifest.anchors),
    holds: [],
  });

  return Object.freeze({
    candidate_manifest: candidateManifest,
    suffix: Object.freeze({
      from_height: priorManifest.source.frozen_head + 1,
      to_height: newFrozenHead,
      blocks_scanned: suffixRecords.length,
      class_counts: Object.freeze({ ...suffixCounts }),
      digest_start: priorManifest.complete_scan_digest,
      digest_end: completeDigest,
    }),
    prefix_verification: Object.freeze({
      accepted_frozen_head: priorPrefixAuthority.frozen_head,
      descriptors_verified: priorPrefixAuthority.descriptors.length,
      prefix_bytes_verified: verifiedPrefixBytes,
      prefix_root: priorPrefixAuthority.prefix_root,
      terminal_segment: terminalDescriptor.segment,
      terminal_prefix_bytes: terminalDescriptor.prefix_bytes,
      terminal_prefix_sha256: terminalDescriptor.prefix_sha256,
      terminal_block_raw_sha256: terminal.raw_sha256,
      accepted_prefix_modified: false,
    }),
    segment_descriptors: Object.freeze(segmentDescriptors),
  });
}

const ACCEPTANCE = readJson(path.join(ROOT, ACCEPTANCE_REL));
const PRIOR_MANIFEST = readJson(path.join(ROOT, MANIFEST_REL));
const PRE_SCANNER_META = Object.freeze({
  MARKER: PRIOR_MANIFEST.marker,
  SCHEMA: PRIOR_MANIFEST.schema,
  SCANNER_VERSION: PRIOR_MANIFEST.scanner_version,
  SEG_SPAN: 10_000,
  VOCABULARY: Object.freeze([...PRIOR_MANIFEST.vocabulary]),
});
const PRODUCTION_BASELINE_PRE = validateBaselineArtifactsV1(
  ACCEPTANCE,
  PRIOR_MANIFEST,
  {
    repoRoot: ROOT,
    requireProductionIdentity: true,
    scannerMeta: PRE_SCANNER_META,
  },
);
const SCANNER = await import(pathToFileURL(path.join(ROOT, SCANNER_REL)).href);
for (const name of [
  "buildManifest",
  "classifyBlock",
  "transitionAllowed",
  "currentContractBlockHash",
]) {
  if (typeof SCANNER[name] !== "function") {
    hold("accepted_scanner_export_missing", { name });
  }
}
if (
  SCANNER.MARKER !== PRE_SCANNER_META.MARKER ||
  SCANNER.SCHEMA !== PRE_SCANNER_META.SCHEMA ||
  SCANNER.SCANNER_VERSION !== PRE_SCANNER_META.SCANNER_VERSION ||
  SCANNER.SEG_SPAN !== PRE_SCANNER_META.SEG_SPAN ||
  stableStringify(SCANNER.VOCABULARY) !==
    stableStringify(PRE_SCANNER_META.VOCABULARY)
) {
  hold("accepted_scanner_runtime_identity_mismatch");
}

export function productionBaselineV1() {
  return PRODUCTION_BASELINE_PRE;
}

export function prepareAcceptedCartographyExtensionV1({
  sourceDir,
  newFrozenHead,
  sourceLabel,
  testAfterSuffixFrameHook = null,
}) {
  const baseline = productionBaselineV1();
  const core = extendCartographySourceV1({
    priorManifest: baseline.manifest,
    priorPrefixAuthority: baseline.prefix,
    sourceDir,
    newFrozenHead,
    sourceLabel,
    scanner: SCANNER,
    testAfterSuffixFrameHook,
  });
  const withoutId = {
    schema: SCHEMA,
    marker: MARKER,
    version: VERSION,
    network: "VOID Mainnet-0",
    chain_id: 2050,
    status: "candidate_complete",
    prior: {
      acceptance_id: baseline.acceptance.acceptance_id,
      manifest_id: baseline.manifest.manifest_id,
      source_id: baseline.manifest.source.source_id,
      frozen_head: baseline.manifest.source.frozen_head,
      block_count: baseline.manifest.historical_blocks_scanned,
      complete_scan_digest: baseline.manifest.complete_scan_digest,
      classification_semantics_root: baseline.semantics.root,
      prefix_root: baseline.prefix.prefix_root,
      checkpoint_descriptor_sha256:
        baseline.acceptance.immutable_snapshot.checkpoint_descriptor_sha256,
    },
    suffix: core.suffix,
    prefix_verification: core.prefix_verification,
    candidate_manifest: core.candidate_manifest,
    authority: {
      source_only_extension_candidate: true,
      prior_acceptance_preserved: true,
      accepted_prefix_modified: false,
      candidate_acceptance_required: true,
      append_authority: false,
      runtime_projection_modified: false,
      runtime_authority: false,
      validator_authority: false,
      checkpoint_publication_authority: false,
      deployment_authority: false,
      wallet_or_signer_authority: false,
      work_credit_authority: false,
      transaction_authority: false,
      treasury_or_liquidity_authority: false,
      funds_movement_authority: false,
    },
  };
  return Object.freeze({
    ...withoutId,
    extension_id:
      EXTENSION_ID_PREFIX +
      sha256Hex(Buffer.from(stableStringify(withoutId), "utf8")),
  });
}

function pathInside(root, candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

function writeOutputExclusive(output, value, sourceDir) {
  const destination = path.resolve(output);
  const source = path.resolve(sourceDir);
  if (pathInside(source, destination)) {
    hold("output_path_overlaps_source");
  }
  const parent = path.dirname(destination);
  if (!fs.existsSync(parent)) hold("output_parent_missing");
  const parentReal = fs.realpathSync(parent);
  const sourceReal = fs.realpathSync(source);
  if (pathInside(sourceReal, parentReal)) {
    hold("output_path_overlaps_source");
  }
  const bytes = Buffer.from(stableStringify(value) + "\n", "utf8");
  if (bytes.length > MAX_OUTPUT_BYTES) {
    hold("extension_output_too_large", { bytes: bytes.length });
  }
  const fd = fs.openSync(
    destination,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      fs.constants.O_NOFOLLOW,
    0o600,
  );
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function parseArgs(argv) {
  const values = Object.create(null);
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) hold("cli_argument_invalid", { key });
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      hold("cli_argument_missing", { key });
    }
    values[key.slice(2)] = value;
    index += 1;
  }
  for (const key of [
    "source-dir",
    "new-frozen-head",
    "source-label",
    "output",
  ]) {
    if (!values[key]) hold("cli_required_argument_missing", { key });
  }
  if (Object.keys(values).length !== 4) hold("cli_argument_set_invalid");
  return values;
}

async function main(argv) {
  const values = parseArgs(argv);
  const newFrozenHead = Number(values["new-frozen-head"]);
  const result = prepareAcceptedCartographyExtensionV1({
    sourceDir: path.resolve(values["source-dir"]),
    newFrozenHead,
    sourceLabel: values["source-label"],
  });
  writeOutputExclusive(
    path.resolve(values.output),
    result,
    path.resolve(values["source-dir"]),
  );
  console.log(MARKER + "_CANDIDATE_GREEN");
  console.log("extension_id=" + result.extension_id);
  console.log("prior_frozen_head=" + result.prior.frozen_head);
  console.log(
    "candidate_frozen_head=" +
      result.candidate_manifest.source.frozen_head,
  );
  console.log("suffix_blocks_scanned=" + result.suffix.blocks_scanned);
  console.log(
    "candidate_manifest_id=" + result.candidate_manifest.manifest_id,
  );
  console.log("accepted_prefix_modified=false");
  console.log("candidate_acceptance_required=true");
  console.log("append_authority=false");
  console.log("runtime_projection_modified=false");
  console.log("runtime_authority=false");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2)).catch((error) => {
    const reason =
      error instanceof CartographyExtensionHold
        ? error.reason
        : String(error?.message || error);
    console.error(MARKER + "_HOLD: " + reason);
    if (error instanceof CartographyExtensionHold) {
      console.error(stableStringify(error.detail));
    }
    process.exitCode = 2;
  });
}
