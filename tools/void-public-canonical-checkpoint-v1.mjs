#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import {
  blockHash,
  validateBlockForAppend,
} from "../dist/chain/block.js";
import {
  classifyMainnet0CanonicalEraV1,
  validateMainnet0GenesisMinimalForAppendV1,
} from "../dist/chain/mainnet0_historical_compat_v1.js";
import {
  validateMainnet0HistoricalLegacyCommitDirectV2fsForAppendV1,
} from "../dist/chain/legacy_commit_direct_v2fs_v1.js";
import {
  VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1,
} from "../scripts/lib/void_public_checkpoint_contract_v1.mjs";

const MARKER = "VOID_PUBLIC_CANONICAL_CHECKPOINT_V1";
const SCHEMA = "void_public_canonical_checkpoint_v1";
const NETWORK = "VOID Network";
const CHAIN_ID = 2050;
const SEGMENT_SPAN = 10_000;
const SPARSE_REBUILD_EVERY = 16;
const CHECKPOINT_ID_RE = /^voidpbc1_[0-9a-f]{64}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const SOURCE_SHA_RE = /^[0-9a-f]{40}$/;
const SEGMENT_NAME_RE = /^[0-9]{8}$/;
const MAX_FRAME_BYTES = 128 * 1024 * 1024;

let VERIFY_PROC_FD_ROOT_V1 = null;

function configureVerifyProcFdRootV1(packetDir, rawFd) {
  if (process.platform !== "linux") {
    fail("proc-fd packet verification is supported only on Linux");
  }
  if (!/^[0-9]+$/.test(String(rawFd || ""))) {
    fail("--proc-fd-root must be a decimal file descriptor");
  }
  const fd = Number(rawFd);
  if (!Number.isSafeInteger(fd) || fd < 3) {
    fail("--proc-fd-root file descriptor is invalid");
  }
  const root = `/proc/self/fd/${fd}`;
  if (packetDir !== root) {
    fail("--packet must exactly match the requested proc-fd root");
  }
  let st;
  try {
    st = fs.fstatSync(fd, { bigint: true });
  } catch {
    fail("proc-fd packet root descriptor is not open");
  }
  if (!st.isDirectory()) fail("proc-fd packet root is not a directory");
  if (Number(st.uid) !== process.getuid()) {
    fail("proc-fd packet root owner mismatch");
  }
  if ((Number(st.mode) & 0o002) !== 0) {
    fail("proc-fd packet root is world-writable");
  }
  VERIFY_PROC_FD_ROOT_V1 = Object.freeze({
    root,
    fd,
    dev: String(st.dev),
    ino: String(st.ino),
  });
}

function liveVerifyProcFdRootV1(target) {
  const context = VERIFY_PROC_FD_ROOT_V1;
  if (!context) return null;
  const absolute = path.resolve(target);
  const relative = path.relative(context.root, absolute);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    return null;
  }
  let st;
  try {
    st = fs.fstatSync(context.fd, { bigint: true });
  } catch {
    fail("proc-fd packet root descriptor closed during verification");
  }
  if (
    !st.isDirectory() ||
    String(st.dev) !== context.dev ||
    String(st.ino) !== context.ino
  ) {
    fail("proc-fd packet root identity changed during verification");
  }
  return context;
}

const AUTHORITY = Object.freeze({
  private_routes_exposed: false,
  wallet_authority: false,
  signer_authority: false,
  validator_authority: false,
  treasury_authority: false,
  work_credit_authority: false,
  money_movement_authority: false,
});

const MANIFEST_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "format",
  "source_sha",
  "captured_at",
  "head",
  "head_era",
  "head_header_hash",
  "head_body_sha256",
  "block_count",
  "segment_span",
  "segment_count",
  "payload_bytes",
  "segments",
  "rebuild",
  "authority",
  "checkpoint_id",
]);

const SEGMENT_KEYS = Object.freeze([
  "name",
  "path",
  "first",
  "last",
  "blocks",
  "bytes",
  "sha256",
]);

const REBUILD_KEYS = Object.freeze([
  "auto_repair_required",
  "sparse_every",
  "sparse_index_reconstructed",
  "segment_meta_reconstructed",
  "head_markers_reconstructed",
  "wal_included",
  "derived_indexes_included",
  "other_data_dir_content_included",
]);

function fail(message) {
  const error = new Error(message);
  error.voidCheckpointFailure = true;
  throw error;
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(`${label} key set mismatch`);
  }
  return value;
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function checkpointId(body) {
  return `voidpbc1_${sha256Bytes(Buffer.from(stableJson(body)))}`;
}

function parseArgs(argv = process.argv.slice(2)) {
  const command = String(argv[0] || "");
  const values = new Map();
  for (let i = 1; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) fail(`unexpected argument ${key}`);
    if (values.has(key)) fail(`duplicate argument ${key}`);
    const value = String(argv[i + 1] || "");
    if (!value || value.startsWith("--")) fail(`${key} requires a value`);
    values.set(key, value);
    i += 1;
  }
  return { command, values };
}

function required(values, key) {
  const value = String(values.get(key) || "").trim();
  if (!value) fail(`${key} is required`);
  return value;
}

function rejectSymlinkedComponents(target) {
  const absolute = path.resolve(target);
  const procFdRoot = liveVerifyProcFdRootV1(absolute);
  if (procFdRoot) {
    const relative = path.relative(procFdRoot.root, absolute);
    let current = procFdRoot.root;
    for (const part of relative.split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      if (!fs.existsSync(current)) continue;
      const st = fs.lstatSync(current);
      if (st.isSymbolicLink()) {
        fail(`symlinked path component rejected: ${current}`);
      }
    }
    return;
  }

  const parsed = path.parse(absolute);
  const parts = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  for (const part of parts) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) continue;
    const st = fs.lstatSync(current);
    if (st.isSymbolicLink()) fail(`symlinked path component rejected: ${current}`);
  }
}

function regularFile(file, { allowMissing = false, allowEmpty = true } = {}) {
  rejectSymlinkedComponents(path.dirname(file));
  if (!fs.existsSync(file)) {
    if (allowMissing) return null;
    fail(`required file missing: ${file}`);
  }
  const st = fs.lstatSync(file, { bigint: true });
  if (!st.isFile() || st.isSymbolicLink()) {
    fail(`non-regular file rejected: ${file}`);
  }
  if (!allowEmpty && st.size <= 0n) fail(`empty file rejected: ${file}`);
  if (Number(st.uid) !== process.getuid()) fail(`file owner mismatch: ${file}`);
  if ((Number(st.mode) & 0o002) !== 0) fail(`world-writable file rejected: ${file}`);
  return st;
}

function safeDirectory(dir, { allowMissing = false } = {}) {
  // Exact registered proc-FD roots are descriptor-authorized. Consult that
  // authority before inspecting lexical parents such as /proc/self, whose
  // symlink nature is intrinsic to procfs rather than an untrusted data-root
  // redirect.
  const procFdRoot = liveVerifyProcFdRootV1(dir);
  if (procFdRoot && path.resolve(dir) === procFdRoot.root) {
    const st = fs.fstatSync(procFdRoot.fd, { bigint: true });
    if (!st.isDirectory()) fail(`non-directory rejected: ${dir}`);
    if (Number(st.uid) !== process.getuid()) {
      fail(`directory owner mismatch: ${dir}`);
    }
    if ((Number(st.mode) & 0o002) !== 0) {
      fail(`world-writable directory rejected: ${dir}`);
    }
    return st;
  }

  // Ordinary directories and children beneath a registered proc-FD root keep
  // the normal symlink-confinement path. For registered children, the helper
  // walks from the retained root descriptor namespace, not through /proc/self.
  rejectSymlinkedComponents(path.dirname(dir));

  if (!fs.existsSync(dir)) {
    if (allowMissing) return null;
    fail(`required directory missing: ${dir}`);
  }
  const st = fs.lstatSync(dir, { bigint: true });
  if (!st.isDirectory() || st.isSymbolicLink()) {
    fail(`non-directory rejected: ${dir}`);
  }
  if (Number(st.uid) !== process.getuid()) fail(`directory owner mismatch: ${dir}`);
  if ((Number(st.mode) & 0o002) !== 0) fail(`world-writable directory rejected: ${dir}`);
  return st;
}

function stamp(st) {
  return Object.freeze({
    dev: String(st.dev),
    ino: String(st.ino),
    size: String(st.size),
    mtimeNs: String(st.mtimeNs),
    ctimeNs: String(st.ctimeNs),
  });
}

function sameStamp(a, b) {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs &&
    a.ctimeNs === b.ctimeNs
  );
}

function readHeadMarkers(dataDir) {
  const headTxtPath = path.join(dataDir, "head.txt");
  const headsJsonPath = path.join(dataDir, "heads.json");
  regularFile(headTxtPath, { allowEmpty: false });
  regularFile(headsJsonPath, { allowEmpty: false });

  const txt = fs.readFileSync(headTxtPath, "utf8").trim();
  if (!/^(0|[1-9][0-9]*)$/.test(txt)) fail("head.txt is not canonical unsigned decimal");
  const headTxt = Number(txt);
  if (!Number.isSafeInteger(headTxt)) fail("head.txt is not a safe integer");

  let body;
  try {
    body = JSON.parse(fs.readFileSync(headsJsonPath, "utf8"));
  } catch {
    fail("heads.json is invalid JSON");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    fail("heads.json is not an object");
  }
  if (
    typeof body.head !== "number" ||
    !Number.isSafeInteger(body.head) ||
    typeof body.number !== "number" ||
    !Number.isSafeInteger(body.number)
  ) {
    fail("heads.json head/number must be safe integer JSON numbers");
  }
  if (headTxt !== body.head || headTxt !== body.number) {
    fail(`head marker disagreement txt=${headTxt} head=${body.head} number=${body.number}`);
  }
  return headTxt;
}

function assertWalQuiescent(dataDir) {
  const walDir = path.join(dataDir, "wal");
  const st = safeDirectory(walDir, { allowMissing: true });
  if (!st) return;
  for (const name of fs.readdirSync(walDir).sort()) {
    const file = path.join(walDir, name);
    const entry = fs.lstatSync(file, { bigint: true });
    if (!entry.isFile() || entry.isSymbolicLink()) {
      fail(`non-regular WAL entry rejected: ${name}`);
    }
    if (entry.size !== 0n) {
      fail(`nonempty WAL entry rejected: ${name} bytes=${entry.size}`);
    }
  }
}

function gitHead(repoRoot) {
  const cp = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (cp.status !== 0) fail("git rev-parse HEAD failed");
  const sha = cp.stdout.trim();
  if (!SOURCE_SHA_RE.test(sha)) fail("git HEAD is malformed");
  return sha;
}

function segmentName(base) {
  return String(base).padStart(8, "0");
}

function expectedSegmentNames(head) {
  const count = Math.floor(head / SEGMENT_SPAN) + 1;
  return Array.from({ length: count }, (_unused, index) =>
    segmentName(index * SEGMENT_SPAN),
  );
}

function assertExactSegmentDirectorySet(dataDir, head) {
  const root = path.join(dataDir, "segments");
  safeDirectory(root);
  const expected = expectedSegmentNames(head);
  const numeric = fs
    .readdirSync(root)
    .filter((name) => SEGMENT_NAME_RE.test(name))
    .sort();
  if (JSON.stringify(numeric) !== JSON.stringify(expected)) {
    fail("numeric segment directory set does not match head");
  }
  for (const name of expected) {
    safeDirectory(path.join(root, name));
    regularFile(path.join(root, name, "blocks.bin"), { allowEmpty: false });
  }
  return expected;
}

function withAppendAuthorityDisabled(fn) {
  const keys = [
    "VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED",
    "VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER",
  ];
  const prior = new Map(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  try {
    return fn();
  } finally {
    for (const key of keys) {
      const value = prior.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function validateCanonicalBlock(candidate, parent) {
  // Mirror Node.pullOnce()'s production follower post-transport-authority
  // admission semantics. Do not add a stricter parallel era-transition policy.
  const era = classifyMainnet0CanonicalEraV1(candidate);
  if (era === "minimal") {
    const result = validateMainnet0GenesisMinimalForAppendV1(candidate, parent);
    if (!result.ok) fail(`minimal block rejected: ${result.reason}`);
    return era;
  }
  if (era === "legacy-v2fs") {
    const result =
      validateMainnet0HistoricalLegacyCommitDirectV2fsForAppendV1(
        candidate,
        parent,
      );
    if (!result.ok) fail(`legacy block rejected: ${result.reason}`);
    return era;
  }
  const result = withAppendAuthorityDisabled(() =>
    validateBlockForAppend(candidate, parent),
  );
  if (!result.ok) fail(`modern block rejected: ${result.reason}`);
  return era;
}

function scanBlocksFile(file, expectedFirst, expectedLast, priorBlock = null) {
  const st = regularFile(file, { allowEmpty: false });
  if (st.size > BigInt(VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1)) {
    fail(
      `segment exceeds checkpoint byte ceiling: ${file} bytes=${st.size} max=${VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1}`,
    );
  }
  const digest = crypto.createHash("sha256");
  let pos = 0;
  let count = 0;
  let first = null;
  let last = null;
  let lastEra = null;
  let lastBodySha256 = null;
  let previous = priorBlock;

  const fd = fs.openSync(file, "r");
  try {
    while (pos < Number(st.size)) {
      const prefix = Buffer.alloc(4);
      const prefixRead = fs.readSync(fd, prefix, 0, 4, pos);
      if (prefixRead !== 4) fail(`torn frame length prefix: ${file}:${pos}`);
      digest.update(prefix);
      const length = prefix.readUInt32BE(0);
      if (length <= 0 || length > MAX_FRAME_BYTES) {
        fail(`invalid frame length: ${file}:${pos}:${length}`);
      }
      const body = Buffer.alloc(length);
      const bodyRead = fs.readSync(fd, body, 0, length, pos + 4);
      if (bodyRead !== length) fail(`torn frame body: ${file}:${pos}`);
      digest.update(body);

      let block;
      try {
        block = JSON.parse(body.toString("utf8"));
      } catch {
        fail(`invalid block JSON: ${file}:${pos}`);
      }
      if (
        typeof block?.number !== "number" ||
        !Number.isSafeInteger(block.number) ||
        block.number < 0
      ) {
        fail(`invalid block number: ${file}:${pos}`);
      }

      const expectedN = expectedFirst + count;
      if (block.number !== expectedN) {
        fail(`block number discontinuity expected=${expectedN} got=${block.number}`);
      }
      const era = validateCanonicalBlock(block, previous);

      if (first === null) first = block.number;
      last = block.number;
      lastEra = era;
      lastBodySha256 = sha256Bytes(body);
      previous = block;
      count += 1;
      pos += 4 + length;
    }
  } finally {
    fs.closeSync(fd);
  }

  if (first !== expectedFirst || last !== expectedLast) {
    fail(`segment block range mismatch ${file}: ${first}..${last}`);
  }

  const headHeaderHash =
    lastEra === "modern" && previous ? blockHash(previous) : null;

  return Object.freeze({
    bytes: Number(st.size),
    sha256: digest.digest("hex"),
    blocks: count,
    first,
    last,
    lastBlock: previous,
    lastEra,
    lastBodySha256,
    lastHeaderHash: headHeaderHash,
  });
}

function scanBlocksFilePrefix(
  file,
  expectedFirst,
  expectedLast,
  expectedBytes,
  priorBlock = null,
) {
  if (
    !Number.isSafeInteger(expectedBytes) ||
    expectedBytes <= 0 ||
    expectedBytes > VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1
  ) {
    fail(`live-prefix expected byte count invalid: ${file}`);
  }
  const st = regularFile(file, { allowEmpty: false });
  if (st.size < BigInt(expectedBytes)) {
    fail(
      `live-prefix segment shorter than checkpoint bytes: ${file} actual=${st.size} expected=${expectedBytes}`,
    );
  }

  const digest = crypto.createHash("sha256");
  let pos = 0;
  let count = 0;
  let first = null;
  let last = null;
  let lastEra = null;
  let lastBodySha256 = null;
  let previous = priorBlock;

  const fd = fs.openSync(file, "r");
  try {
    while (pos < expectedBytes) {
      if (pos + 4 > expectedBytes) {
        fail(`live-prefix torn frame length prefix: ${file}:${pos}`);
      }
      const prefix = Buffer.alloc(4);
      const prefixRead = fs.readSync(fd, prefix, 0, 4, pos);
      if (prefixRead !== 4) {
        fail(`live-prefix torn frame length prefix: ${file}:${pos}`);
      }
      digest.update(prefix);
      const length = prefix.readUInt32BE(0);
      if (length <= 0 || length > MAX_FRAME_BYTES) {
        fail(`live-prefix invalid frame length: ${file}:${pos}:${length}`);
      }
      if (pos + 4 + length > expectedBytes) {
        fail(`live-prefix frame crosses checkpoint boundary: ${file}:${pos}`);
      }

      const body = Buffer.alloc(length);
      const bodyRead = fs.readSync(fd, body, 0, length, pos + 4);
      if (bodyRead !== length) {
        fail(`live-prefix torn frame body: ${file}:${pos}`);
      }
      digest.update(body);

      let block;
      try {
        block = JSON.parse(body.toString("utf8"));
      } catch {
        fail(`live-prefix invalid block JSON: ${file}:${pos}`);
      }
      if (
        typeof block?.number !== "number" ||
        !Number.isSafeInteger(block.number) ||
        block.number < 0
      ) {
        fail(`live-prefix invalid block number: ${file}:${pos}`);
      }

      const expectedN = expectedFirst + count;
      if (block.number !== expectedN) {
        fail(
          `live-prefix block discontinuity expected=${expectedN} got=${block.number}`,
        );
      }
      const era = validateCanonicalBlock(block, previous);
      if (first === null) first = block.number;
      last = block.number;
      lastEra = era;
      lastBodySha256 = sha256Bytes(body);
      previous = block;
      count += 1;
      pos += 4 + length;
    }
  } finally {
    fs.closeSync(fd);
  }

  if (
    pos !== expectedBytes ||
    first !== expectedFirst ||
    last !== expectedLast
  ) {
    fail(
      `live-prefix segment range mismatch ${file}: ${first}..${last} bytes=${pos}`,
    );
  }

  return Object.freeze({
    checkpointBytes: expectedBytes,
    actualBytes: Number(st.size),
    sha256: digest.digest("hex"),
    blocks: count,
    first,
    last,
    lastBlock: previous,
    lastEra,
    lastBodySha256,
    lastHeaderHash:
      lastEra === "modern" && previous ? blockHash(previous) : null,
  });
}

function verifyLiveCheckpointPrefix(
  dataDir,
  expectedCheckpointId,
) {
  safeDirectory(dataDir);
  if (!CHECKPOINT_ID_RE.test(expectedCheckpointId)) {
    fail("--expected-checkpoint-id malformed");
  }

  const manifestPath = path.join(dataDir, "checkpoint.json");
  regularFile(manifestPath, { allowEmpty: false });
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    fail("checkpoint.json invalid");
  }
  verifyManifestShape(manifest);
  if (manifest.checkpoint_id !== expectedCheckpointId) {
    fail("retained checkpoint manifest differs from selected checkpoint id");
  }

  let prior = null;
  let totalBlocks = 0;
  let totalBytes = 0;
  let headEra = null;
  let headBodySha = null;
  let headHeaderHash = null;

  for (let index = 0; index < manifest.segments.length; index += 1) {
    const entry = manifest.segments[index];
    exactKeys(entry, SEGMENT_KEYS, "segment manifest entry");
    const expectedName = segmentName(index * SEGMENT_SPAN);
    if (
      entry.name !== expectedName ||
      entry.path !== `segments/${entry.name}/blocks.bin`
    ) {
      fail("live-prefix manifest segment order/path mismatch");
    }

    const expectedFirst = index * SEGMENT_SPAN;
    const expectedLast =
      index === manifest.segments.length - 1
        ? manifest.head
        : expectedFirst + SEGMENT_SPAN - 1;
    if (
      entry.first !== expectedFirst ||
      entry.last !== expectedLast ||
      entry.blocks !== expectedLast - expectedFirst + 1
    ) {
      fail("live-prefix manifest segment range/count mismatch");
    }

    safeDirectory(path.join(dataDir, "segments", entry.name));
    const file = path.join(dataDir, entry.path);
    const scan = scanBlocksFilePrefix(
      file,
      expectedFirst,
      expectedLast,
      entry.bytes,
      prior,
    );
    if (
      scan.sha256 !== entry.sha256 ||
      scan.blocks !== entry.blocks
    ) {
      fail(`live-prefix checkpoint digest/count mismatch: ${entry.name}`);
    }
    if (
      index < manifest.segments.length - 1 &&
      scan.actualBytes !== entry.bytes
    ) {
      fail(`live-prefix completed segment grew after checkpoint: ${entry.name}`);
    }

    prior = scan.lastBlock;
    totalBlocks += scan.blocks;
    totalBytes += scan.checkpointBytes;
    headEra = scan.lastEra;
    headBodySha = scan.lastBodySha256;
    headHeaderHash = scan.lastHeaderHash;
  }

  if (
    totalBlocks !== manifest.block_count ||
    totalBytes !== manifest.payload_bytes ||
    headEra !== manifest.head_era ||
    headBodySha !== manifest.head_body_sha256 ||
    headHeaderHash !== manifest.head_header_hash
  ) {
    fail("live-prefix checkpoint aggregate/head mismatch");
  }

  return Object.freeze({
    manifest,
    totalBlocks,
    totalBytes,
  });
}

function fsyncFile(file) {
  const fd = fs.openSync(file, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function fsyncDirectory(dir) {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function writeJsonDurable(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  fsyncFile(file);
}

function verifyAuthority(value) {
  exactKeys(value, Object.keys(AUTHORITY), "checkpoint authority");
  for (const [key, expected] of Object.entries(AUTHORITY)) {
    if (value[key] !== expected) fail(`checkpoint authority ${key} must be false`);
  }
}

function verifyManifestShape(manifest) {
  exactKeys(manifest, MANIFEST_KEYS, "checkpoint manifest");
  if (manifest.schema !== SCHEMA) fail("checkpoint schema mismatch");
  if (manifest.network !== NETWORK || manifest.chain_id !== CHAIN_ID) {
    fail("checkpoint network/chain mismatch");
  }
  if (manifest.format !== "blocks-bin-only-v1") fail("checkpoint format mismatch");
  if (!SOURCE_SHA_RE.test(String(manifest.source_sha || ""))) fail("source_sha malformed");
  const capturedAt = Date.parse(String(manifest.captured_at || ""));
  if (!Number.isFinite(capturedAt)) fail("captured_at invalid");
  if (
    typeof manifest.head !== "number" ||
    !Number.isSafeInteger(manifest.head) ||
    manifest.head < 0
  ) fail("manifest head invalid");
  if (!["minimal", "legacy-v2fs", "modern"].includes(manifest.head_era)) {
    fail("manifest head era invalid");
  }
  if (
    manifest.head_header_hash !== null &&
    !SHA256_RE.test(String(manifest.head_header_hash))
  ) fail("head_header_hash invalid");
  if (!SHA256_RE.test(String(manifest.head_body_sha256 || ""))) {
    fail("head_body_sha256 invalid");
  }
  if (
    typeof manifest.block_count !== "number" ||
    !Number.isSafeInteger(manifest.block_count) ||
    manifest.block_count !== manifest.head + 1
  ) fail("manifest block_count invalid");
  if (manifest.segment_span !== SEGMENT_SPAN) fail("segment span mismatch");
  if (
    typeof manifest.segment_count !== "number" ||
    !Number.isSafeInteger(manifest.segment_count) ||
    manifest.segment_count !== Math.floor(manifest.head / SEGMENT_SPAN) + 1
  ) fail("segment_count invalid");
  if (
    typeof manifest.payload_bytes !== "number" ||
    !Number.isSafeInteger(manifest.payload_bytes) ||
    manifest.payload_bytes <= 0
  ) fail("payload_bytes invalid");
  if (!Array.isArray(manifest.segments) || manifest.segments.length !== manifest.segment_count) {
    fail("segments array mismatch");
  }

  const rebuild = exactKeys(manifest.rebuild, REBUILD_KEYS, "rebuild contract");
  if (
    rebuild.auto_repair_required !== true ||
    rebuild.sparse_every !== SPARSE_REBUILD_EVERY ||
    rebuild.sparse_index_reconstructed !== true ||
    rebuild.segment_meta_reconstructed !== true ||
    rebuild.head_markers_reconstructed !== true ||
    rebuild.wal_included !== false ||
    rebuild.derived_indexes_included !== false ||
    rebuild.other_data_dir_content_included !== false
  ) {
    fail("rebuild contract mismatch");
  }
  verifyAuthority(manifest.authority);

  const withoutId = {};
  for (const key of MANIFEST_KEYS) {
    if (key !== "checkpoint_id") withoutId[key] = manifest[key];
  }
  const expectedId = checkpointId(withoutId);
  if (!CHECKPOINT_ID_RE.test(String(manifest.checkpoint_id || ""))) {
    fail("checkpoint_id malformed");
  }
  if (manifest.checkpoint_id !== expectedId) fail("checkpoint_id content mismatch");
}

function exactPacketFiles(packetDir, manifest) {
  const allowedFiles = new Set(["checkpoint.json"]);
  const expectedDirs = new Set(["segments"]);

  for (const seg of manifest.segments) {
    exactKeys(seg, SEGMENT_KEYS, "segment manifest entry");
    if (!SEGMENT_NAME_RE.test(String(seg.name || ""))) fail("segment name malformed");
    if (seg.path !== `segments/${seg.name}/blocks.bin`) fail("segment path mismatch");
    allowedFiles.add(seg.path);
    expectedDirs.add(`segments/${seg.name}`);
  }

  const stack = [packetDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(packetDir, full).split(path.sep).join("/");
      const st = fs.lstatSync(full);
      if (st.isSymbolicLink()) fail(`packet symlink rejected: ${rel}`);
      if (st.isDirectory()) {
        if (!expectedDirs.has(rel)) fail(`unexpected packet directory: ${rel}`);
        stack.push(full);
      } else if (st.isFile()) {
        if (!allowedFiles.has(rel)) fail(`unexpected packet file: ${rel}`);
      } else {
        fail(`unexpected packet entry type: ${rel}`);
      }
    }
  }

  for (const file of allowedFiles) {
    regularFile(path.join(packetDir, file), { allowEmpty: false });
  }
}

function verifyPacket(packetDir, expectedSourceSha = "") {
  safeDirectory(packetDir);
  const manifestPath = path.join(packetDir, "checkpoint.json");
  regularFile(manifestPath, { allowEmpty: false });
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    fail("checkpoint.json invalid");
  }
  verifyManifestShape(manifest);
  if (expectedSourceSha && manifest.source_sha !== expectedSourceSha) {
    fail("checkpoint source_sha differs from expected source");
  }
  exactPacketFiles(packetDir, manifest);

  let prior = null;
  let totalBlocks = 0;
  let totalBytes = 0;
  let headEra = null;
  let headBodySha = null;
  let headHeaderHash = null;

  for (let index = 0; index < manifest.segments.length; index += 1) {
    const entry = manifest.segments[index];
    const expectedName = segmentName(index * SEGMENT_SPAN);
    if (entry.name !== expectedName) fail("manifest segment order mismatch");
    const expectedFirst = index * SEGMENT_SPAN;
    const expectedLast =
      index === manifest.segments.length - 1
        ? manifest.head
        : expectedFirst + SEGMENT_SPAN - 1;

    if (
      entry.first !== expectedFirst ||
      entry.last !== expectedLast ||
      entry.blocks !== expectedLast - expectedFirst + 1
    ) fail("manifest segment range/count mismatch");
    if (
      typeof entry.bytes !== "number" ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes <= 0 ||
      entry.bytes > VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1 ||
      !SHA256_RE.test(String(entry.sha256 || ""))
    ) fail("manifest segment size/hash invalid");

    const file = path.join(packetDir, entry.path);
    const scan = scanBlocksFile(file, expectedFirst, expectedLast, prior);
    if (
      scan.bytes !== entry.bytes ||
      scan.sha256 !== entry.sha256 ||
      scan.blocks !== entry.blocks
    ) fail(`packet segment digest/count mismatch: ${entry.name}`);

    prior = scan.lastBlock;
    totalBlocks += scan.blocks;
    totalBytes += scan.bytes;
    headEra = scan.lastEra;
    headBodySha = scan.lastBodySha256;
    headHeaderHash = scan.lastHeaderHash;
  }

  if (totalBlocks !== manifest.block_count) fail("packet total block count mismatch");
  if (totalBytes !== manifest.payload_bytes) fail("packet payload byte count mismatch");
  if (headEra !== manifest.head_era) fail("packet head era mismatch");
  if (headBodySha !== manifest.head_body_sha256) fail("packet head body hash mismatch");
  if (headHeaderHash !== manifest.head_header_hash) {
    fail("packet head header hash mismatch");
  }

  return Object.freeze({
    manifest,
    totalBlocks,
    totalBytes,
  });
}

function copyFileDurable(source, destination) {
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  fs.chmodSync(destination, 0o600);
  fsyncFile(destination);
}

function sourceSegmentStamps(dataDir, names) {
  const out = new Map();
  for (const name of names) {
    const file = path.join(dataDir, "segments", name, "blocks.bin");
    out.set(name, stamp(regularFile(file, { allowEmpty: false })));
  }
  return out;
}

function compareSourceSegmentStamps(dataDir, prior) {
  for (const [name, before] of prior) {
    const file = path.join(dataDir, "segments", name, "blocks.bin");
    const after = stamp(regularFile(file, { allowEmpty: false }));
    if (!sameStamp(before, after)) fail(`source segment changed during capture: ${name}`);
  }
}

function pathIsWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}


function auditSource({ dataDir, repoRoot, expectedSourceSha }) {
  safeDirectory(dataDir);
  safeDirectory(repoRoot);

  const actualSourceSha = gitHead(repoRoot);
  if (expectedSourceSha !== actualSourceSha) {
    fail(`source SHA mismatch expected=${expectedSourceSha} actual=${actualSourceSha}`);
  }

  const headBefore = readHeadMarkers(dataDir);
  assertWalQuiescent(dataDir);
  const names = assertExactSegmentDirectorySet(dataDir, headBefore);
  const stampsBefore = sourceSegmentStamps(dataDir, names);

  let priorBlock = null;
  let totalBlocks = 0;
  let payloadBytes = 0;
  let headEra = null;
  let headBodySha256 = null;
  let headHeaderHash = null;

  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    const first = index * SEGMENT_SPAN;
    const last =
      index === names.length - 1 ? headBefore : first + SEGMENT_SPAN - 1;
    const source = path.join(dataDir, "segments", name, "blocks.bin");

    const scan = scanBlocksFile(source, first, last, priorBlock);
    priorBlock = scan.lastBlock;
    totalBlocks += scan.blocks;
    payloadBytes += scan.bytes;
    headEra = scan.lastEra;
    headBodySha256 = scan.lastBodySha256;
    headHeaderHash = scan.lastHeaderHash;
  }

  const headAfter = readHeadMarkers(dataDir);
  if (headAfter !== headBefore) {
    fail(`source head changed during audit ${headBefore}->${headAfter}`);
  }
  assertWalQuiescent(dataDir);
  compareSourceSegmentStamps(dataDir, stampsBefore);

  if (totalBlocks !== headBefore + 1) {
    fail(`source block count mismatch head=${headBefore} blocks=${totalBlocks}`);
  }

  return Object.freeze({
    source_sha: actualSourceSha,
    head: headBefore,
    block_count: totalBlocks,
    segment_count: names.length,
    payload_bytes: payloadBytes,
    head_era: headEra,
    head_body_sha256: headBodySha256,
    head_header_hash: headHeaderHash,
  });
}

function capturePacket({ dataDir, outputDir, repoRoot, expectedSourceSha }) {
  safeDirectory(dataDir);
  safeDirectory(repoRoot);
  rejectSymlinkedComponents(outputDir);
  if (pathIsWithin(dataDir, outputDir)) {
    fail("checkpoint output must be outside the live data directory");
  }
  if (pathIsWithin(repoRoot, outputDir)) {
    fail("checkpoint output must be outside the repository");
  }
  if (fs.existsSync(outputDir)) fail(`output already exists: ${outputDir}`);

  const actualSourceSha = gitHead(repoRoot);
  if (expectedSourceSha !== actualSourceSha) {
    fail(`source SHA mismatch expected=${expectedSourceSha} actual=${actualSourceSha}`);
  }

  const headBefore = readHeadMarkers(dataDir);
  assertWalQuiescent(dataDir);
  const names = assertExactSegmentDirectorySet(dataDir, headBefore);
  const stampsBefore = sourceSegmentStamps(dataDir, names);

  const parent = path.dirname(outputDir);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  safeDirectory(parent);

  const tempDir = `${outputDir}.tmp-${process.pid}-${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}`;
  fs.mkdirSync(tempDir, { mode: 0o700 });
  fs.mkdirSync(path.join(tempDir, "segments"), { mode: 0o700 });

  let published = false;
  try {
    let priorBlock = null;
    let totalBlocks = 0;
    let payloadBytes = 0;
    let headEra = null;
    let headBodySha = null;
    let headHeaderHash = null;
    const segments = [];

    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      const first = index * SEGMENT_SPAN;
      const last =
        index === names.length - 1 ? headBefore : first + SEGMENT_SPAN - 1;
      const source = path.join(dataDir, "segments", name, "blocks.bin");

      const scan = scanBlocksFile(source, first, last, priorBlock);
      priorBlock = scan.lastBlock;
      totalBlocks += scan.blocks;
      payloadBytes += scan.bytes;
      headEra = scan.lastEra;
      headBodySha = scan.lastBodySha256;
      headHeaderHash = scan.lastHeaderHash;

      const segDir = path.join(tempDir, "segments", name);
      fs.mkdirSync(segDir, { mode: 0o700 });
      const destination = path.join(segDir, "blocks.bin");
      copyFileDurable(source, destination);
      const copiedBytes = fs.readFileSync(destination);
      const copiedSha256 = sha256Bytes(copiedBytes);
      if (
        copiedSha256 !== scan.sha256 ||
        copiedBytes.length !== scan.bytes
      ) {
        fail(`copied segment differs from source: ${name}`);
      }
      fsyncDirectory(segDir);

      segments.push({
        name,
        path: `segments/${name}/blocks.bin`,
        first,
        last,
        blocks: scan.blocks,
        bytes: scan.bytes,
        sha256: scan.sha256,
      });
    }

    const headAfter = readHeadMarkers(dataDir);
    if (headAfter !== headBefore) {
      fail(`source head changed during capture ${headBefore}->${headAfter}`);
    }
    assertWalQuiescent(dataDir);
    compareSourceSegmentStamps(dataDir, stampsBefore);

    const body = {
      schema: SCHEMA,
      network: NETWORK,
      chain_id: CHAIN_ID,
      format: "blocks-bin-only-v1",
      source_sha: actualSourceSha,
      captured_at: new Date().toISOString(),
      head: headBefore,
      head_era: headEra,
      head_header_hash: headHeaderHash,
      head_body_sha256: headBodySha,
      block_count: totalBlocks,
      segment_span: SEGMENT_SPAN,
      segment_count: segments.length,
      payload_bytes: payloadBytes,
      segments,
      rebuild: {
        auto_repair_required: true,
        sparse_every: SPARSE_REBUILD_EVERY,
        sparse_index_reconstructed: true,
        segment_meta_reconstructed: true,
        head_markers_reconstructed: true,
        wal_included: false,
        derived_indexes_included: false,
        other_data_dir_content_included: false,
      },
      authority: { ...AUTHORITY },
    };
    const manifest = { ...body, checkpoint_id: checkpointId(body) };
    writeJsonDurable(path.join(tempDir, "checkpoint.json"), manifest);
    fsyncDirectory(path.join(tempDir, "segments"));
    fsyncDirectory(tempDir);

    verifyPacket(tempDir, actualSourceSha);

    fs.renameSync(tempDir, outputDir);
    fsyncDirectory(parent);
    published = true;

    return Object.freeze({
      checkpoint_id: manifest.checkpoint_id,
      source_sha: actualSourceSha,
      head: headBefore,
      block_count: totalBlocks,
      segment_count: segments.length,
      payload_bytes: payloadBytes,
      output: outputDir,
    });
  } finally {
    if (!published && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

function main() {
  try {
    const { command, values } = parseArgs();

    if (command === "audit-source") {
      const dataDir = path.resolve(required(values, "--data-dir"));
      const repoRoot = path.resolve(required(values, "--repo-root"));
      const expectedSourceSha = required(values, "--expected-source-sha");
      if (!SOURCE_SHA_RE.test(expectedSourceSha)) fail("--expected-source-sha malformed");

      const result = auditSource({
        dataDir,
        repoRoot,
        expectedSourceSha,
      });
      for (const [key, value] of Object.entries(result)) {
        console.log(`${key}=${value}`);
      }
      console.log("source_data_mutated=false");
      console.log("checkpoint_bytes_copied=false");
      console.log("checkpoint_publication_authorized=false");
      console.log(`${MARKER}_AUDIT_SOURCE_GREEN`);
      return;
    }

    if (command === "capture") {
      const dataDir = path.resolve(required(values, "--data-dir"));
      const outputDir = path.resolve(required(values, "--output"));
      const repoRoot = path.resolve(required(values, "--repo-root"));
      const expectedSourceSha = required(values, "--expected-source-sha");
      if (!SOURCE_SHA_RE.test(expectedSourceSha)) fail("--expected-source-sha malformed");
      const result = capturePacket({
        dataDir,
        outputDir,
        repoRoot,
        expectedSourceSha,
      });
      for (const [key, value] of Object.entries(result)) {
        console.log(`${key}=${value}`);
      }
      console.log("source_data_mutated=false");
      console.log("checkpoint_publication_authorized=false");
      console.log(`${MARKER}_CAPTURE_GREEN`);
      return;
    }

    if (command === "verify-live-prefix") {
      const packetDir = path.resolve(required(values, "--packet"));
      const expectedCheckpointId =
        required(values, "--expected-checkpoint-id");
      const procFdRoot =
        String(values.get("--proc-fd-root") || "").trim();
      if (procFdRoot) {
        configureVerifyProcFdRootV1(packetDir, procFdRoot);
      }
      try {
        const result = verifyLiveCheckpointPrefix(
          packetDir,
          expectedCheckpointId,
        );
        console.log(
          `checkpoint_id=${result.manifest.checkpoint_id}`,
        );
        console.log(`head=${result.manifest.head}`);
        console.log(`block_count=${result.totalBlocks}`);
        console.log(`payload_bytes=${result.totalBytes}`);
        console.log(
          `proc_fd_root_verified=${procFdRoot ? "true" : "false"}`,
        );
        console.log("checkpoint_prefix_semantics_verified=true");
        console.log("checkpoint_prefix_content_address_verified=true");
        console.log(`${MARKER}_VERIFY_LIVE_PREFIX_GREEN`);
      } finally {
        VERIFY_PROC_FD_ROOT_V1 = null;
      }
      return;
    }

    if (command === "verify") {
      const packetDir = path.resolve(required(values, "--packet"));
      const expectedSourceSha = String(values.get("--expected-source-sha") || "").trim();
      const procFdRoot = String(values.get("--proc-fd-root") || "").trim();
      if (expectedSourceSha && !SOURCE_SHA_RE.test(expectedSourceSha)) {
        fail("--expected-source-sha malformed");
      }
      if (procFdRoot) {
        configureVerifyProcFdRootV1(packetDir, procFdRoot);
      }
      try {
        const result = verifyPacket(packetDir, expectedSourceSha);
        console.log(`checkpoint_id=${result.manifest.checkpoint_id}`);
        console.log(`source_sha=${result.manifest.source_sha}`);
        console.log(`head=${result.manifest.head}`);
        console.log(`block_count=${result.totalBlocks}`);
        console.log(`segment_count=${result.manifest.segment_count}`);
        console.log(`payload_bytes=${result.totalBytes}`);
        console.log(`proc_fd_root_verified=${procFdRoot ? "true" : "false"}`);
        console.log("canonical_semantics_verified=true");
        console.log("authority_boundary_verified=true");
        console.log(`${MARKER}_VERIFY_GREEN`);
      } finally {
        VERIFY_PROC_FD_ROOT_V1 = null;
      }
      return;
    }

    fail("usage: audit-source|capture|verify|verify-live-prefix");
  } catch (error) {
    console.error(`${MARKER}_HOLD`);
    console.error(`reason=${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
