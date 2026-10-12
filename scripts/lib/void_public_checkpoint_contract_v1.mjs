#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_PUBLIC_CHECKPOINT_SCHEMA_V1 =
  "void_public_canonical_checkpoint_v1";
export const VOID_PUBLIC_CHECKPOINT_DISCOVERY_SCHEMA_V1 =
  "void_public_checkpoint_discovery_v1";
export const VOID_PUBLIC_CHECKPOINT_NETWORK_V1 = "VOID Network";
export const VOID_PUBLIC_CHECKPOINT_CHAIN_ID_V1 = 2050;
export const VOID_PUBLIC_CHECKPOINT_FORMAT_V1 = "blocks-bin-only-v1";
export const VOID_PUBLIC_CHECKPOINT_SEGMENT_SPAN_V1 = 10_000;
export const VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1 =
  64 * 1024 * 1024;
export const VOID_PUBLIC_CHECKPOINT_SPARSE_EVERY_V1 = 16;

export const VOID_PUBLIC_CHECKPOINT_ID_RE_V1 =
  /^voidpbc1_[0-9a-f]{64}$/;
export const VOID_PUBLIC_CHECKPOINT_MANIFEST_PATH_RE_V1 =
  /^\/checkpoints\/v1\/(voidpbc1_[0-9a-f]{64})\/checkpoint\.json$/;
export const VOID_PUBLIC_CHECKPOINT_SEGMENT_PATH_RE_V1 =
  /^\/checkpoints\/v1\/(voidpbc1_[0-9a-f]{64})\/segments\/([0-9]{8})\/blocks\.bin$/;

const SHA256_RE = /^[0-9a-f]{64}$/;
const SOURCE_SHA_RE = /^[0-9a-f]{40}$/;

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

const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

const DISCOVERY_KEYS = Object.freeze([
  "schema",
  "network",
  "chain_id",
  "status",
  "checkpoint",
]);

const DISCOVERY_CHECKPOINT_KEYS = Object.freeze([
  "checkpoint_id",
  "manifest_sha256",
  "source_sha",
  "head",
  "block_count",
  "segment_count",
  "payload_bytes",
  "packet_base_path",
]);

function fail(message) {
  const error = new Error(message);
  error.voidPublicCheckpointContractV1 = true;
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

function safeInteger(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    fail(`${label} must be a safe integer from ${min} through ${max}`);
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  if (Array.isArray(value)) {
    for (const entry of value) deepFreeze(entry);
  } else {
    for (const entry of Object.values(value)) deepFreeze(entry);
  }
  return Object.freeze(value);
}

function parseJsonBytes(bytes, label) {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    fail(`${label} is malformed JSON`);
  }
}

export function stableVoidPublicCheckpointJsonV1(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableVoidPublicCheckpointJsonV1(entry)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableVoidPublicCheckpointJsonV1(value[key])}`,
    )
    .join(",")}}`;
}

export function sha256VoidPublicCheckpointBytesV1(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function computeVoidPublicCheckpointIdV1(manifestLike) {
  const body = {};
  for (const key of MANIFEST_KEYS) {
    if (key === "checkpoint_id") continue;
    if (!Object.prototype.hasOwnProperty.call(manifestLike, key)) {
      fail(`checkpoint manifest body missing ${key}`);
    }
    body[key] = manifestLike[key];
  }
  const digest = sha256VoidPublicCheckpointBytesV1(
    Buffer.from(stableVoidPublicCheckpointJsonV1(body)),
  );
  return `voidpbc1_${digest}`;
}

export function validateVoidPublicCheckpointDiscoveryObjectV1(raw) {
  const root = exactKeys(raw, DISCOVERY_KEYS, "checkpoint discovery");
  if (
    root.schema !== VOID_PUBLIC_CHECKPOINT_DISCOVERY_SCHEMA_V1 ||
    root.network !== VOID_PUBLIC_CHECKPOINT_NETWORK_V1 ||
    root.chain_id !== VOID_PUBLIC_CHECKPOINT_CHAIN_ID_V1
  ) {
    fail("checkpoint discovery domain mismatch");
  }

  if (root.status === "unavailable") {
    if (root.checkpoint !== null) {
      fail("unavailable checkpoint discovery must carry null");
    }
    return Object.freeze({
      status: "unavailable",
      checkpoint: null,
    });
  }
  if (root.status !== "available") {
    fail("checkpoint discovery status is invalid");
  }

  const checkpoint = exactKeys(
    root.checkpoint,
    DISCOVERY_CHECKPOINT_KEYS,
    "checkpoint discovery checkpoint",
  );
  if (!VOID_PUBLIC_CHECKPOINT_ID_RE_V1.test(String(checkpoint.checkpoint_id || ""))) {
    fail("checkpoint discovery checkpoint_id malformed");
  }
  if (!SHA256_RE.test(String(checkpoint.manifest_sha256 || ""))) {
    fail("checkpoint discovery manifest_sha256 malformed");
  }
  if (!SOURCE_SHA_RE.test(String(checkpoint.source_sha || ""))) {
    fail("checkpoint discovery source_sha malformed");
  }

  const head = safeInteger(checkpoint.head, "checkpoint discovery head");
  const blockCount = safeInteger(
    checkpoint.block_count,
    "checkpoint discovery block_count",
    { min: 1 },
  );
  const segmentCount = safeInteger(
    checkpoint.segment_count,
    "checkpoint discovery segment_count",
    { min: 1 },
  );
  safeInteger(
    checkpoint.payload_bytes,
    "checkpoint discovery payload_bytes",
    { min: 1 },
  );

  if (blockCount !== head + 1) {
    fail("checkpoint discovery block_count does not match head");
  }
  if (
    segmentCount !==
    Math.floor(head / VOID_PUBLIC_CHECKPOINT_SEGMENT_SPAN_V1) + 1
  ) {
    fail("checkpoint discovery segment_count does not match head");
  }

  const expectedBase = `/checkpoints/v1/${checkpoint.checkpoint_id}`;
  if (checkpoint.packet_base_path !== expectedBase) {
    fail("checkpoint discovery packet_base_path mismatch");
  }

  return Object.freeze({
    status: "available",
    checkpoint: deepFreeze({
      checkpoint_id: checkpoint.checkpoint_id,
      manifest_sha256: checkpoint.manifest_sha256,
      source_sha: checkpoint.source_sha,
      head,
      block_count: blockCount,
      segment_count: segmentCount,
      payload_bytes: checkpoint.payload_bytes,
      packet_base_path: expectedBase,
    }),
  });
}

export function parseVoidPublicCheckpointDiscoveryBytesV1(bytes) {
  return validateVoidPublicCheckpointDiscoveryObjectV1(
    parseJsonBytes(bytes, "checkpoint discovery response"),
  );
}

export function validateVoidPublicCheckpointManifestBytesV1(
  bytes,
  {
    expectedCheckpoint = null,
    expectedCheckpointId = "",
  } = {},
) {
  const bodyBytes = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const manifestSha256 = sha256VoidPublicCheckpointBytesV1(bodyBytes);
  const manifest = exactKeys(
    parseJsonBytes(bodyBytes, "checkpoint manifest"),
    MANIFEST_KEYS,
    "checkpoint manifest",
  );

  if (
    manifest.schema !== VOID_PUBLIC_CHECKPOINT_SCHEMA_V1 ||
    manifest.network !== VOID_PUBLIC_CHECKPOINT_NETWORK_V1 ||
    manifest.chain_id !== VOID_PUBLIC_CHECKPOINT_CHAIN_ID_V1 ||
    manifest.format !== VOID_PUBLIC_CHECKPOINT_FORMAT_V1
  ) {
    fail("checkpoint manifest domain/format mismatch");
  }
  if (!SOURCE_SHA_RE.test(String(manifest.source_sha || ""))) {
    fail("checkpoint manifest source_sha malformed");
  }
  if (!Number.isFinite(Date.parse(String(manifest.captured_at || "")))) {
    fail("checkpoint manifest captured_at invalid");
  }

  const head = safeInteger(manifest.head, "checkpoint manifest head");
  if (!["minimal", "legacy-v2fs", "modern"].includes(manifest.head_era)) {
    fail("checkpoint manifest head_era invalid");
  }
  if (
    manifest.head_header_hash !== null &&
    !SHA256_RE.test(String(manifest.head_header_hash || ""))
  ) {
    fail("checkpoint manifest head_header_hash invalid");
  }
  if (!SHA256_RE.test(String(manifest.head_body_sha256 || ""))) {
    fail("checkpoint manifest head_body_sha256 invalid");
  }

  const blockCount = safeInteger(
    manifest.block_count,
    "checkpoint manifest block_count",
    { min: 1 },
  );
  if (blockCount !== head + 1) {
    fail("checkpoint manifest block_count does not match head");
  }
  if (manifest.segment_span !== VOID_PUBLIC_CHECKPOINT_SEGMENT_SPAN_V1) {
    fail("checkpoint manifest segment_span mismatch");
  }
  const segmentCount = safeInteger(
    manifest.segment_count,
    "checkpoint manifest segment_count",
    { min: 1 },
  );
  if (
    segmentCount !==
    Math.floor(head / VOID_PUBLIC_CHECKPOINT_SEGMENT_SPAN_V1) + 1
  ) {
    fail("checkpoint manifest segment_count does not match head");
  }
  const payloadBytes = safeInteger(
    manifest.payload_bytes,
    "checkpoint manifest payload_bytes",
    { min: 1 },
  );
  if (
    !Array.isArray(manifest.segments) ||
    manifest.segments.length !== segmentCount
  ) {
    fail("checkpoint manifest segments array mismatch");
  }

  const rebuild = exactKeys(
    manifest.rebuild,
    REBUILD_KEYS,
    "checkpoint rebuild contract",
  );
  if (
    rebuild.auto_repair_required !== true ||
    rebuild.sparse_every !== VOID_PUBLIC_CHECKPOINT_SPARSE_EVERY_V1 ||
    rebuild.sparse_index_reconstructed !== true ||
    rebuild.segment_meta_reconstructed !== true ||
    rebuild.head_markers_reconstructed !== true ||
    rebuild.wal_included !== false ||
    rebuild.derived_indexes_included !== false ||
    rebuild.other_data_dir_content_included !== false
  ) {
    fail("checkpoint rebuild contract mismatch");
  }

  const authority = exactKeys(
    manifest.authority,
    AUTHORITY_KEYS,
    "checkpoint authority",
  );
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) {
      fail(`checkpoint authority ${key} must be false`);
    }
  }

  let aggregateBytes = 0;
  let aggregateBlocks = 0;
  const segmentsByName = {};

  for (let index = 0; index < manifest.segments.length; index += 1) {
    const entry = exactKeys(
      manifest.segments[index],
      SEGMENT_KEYS,
      `checkpoint segment ${index}`,
    );
    const expectedFirst =
      index * VOID_PUBLIC_CHECKPOINT_SEGMENT_SPAN_V1;
    const expectedLast =
      index === manifest.segments.length - 1
        ? head
        : expectedFirst + VOID_PUBLIC_CHECKPOINT_SEGMENT_SPAN_V1 - 1;
    const expectedName = String(expectedFirst).padStart(8, "0");
    const expectedPath = `segments/${expectedName}/blocks.bin`;

    if (
      entry.name !== expectedName ||
      entry.path !== expectedPath ||
      entry.first !== expectedFirst ||
      entry.last !== expectedLast ||
      entry.blocks !== expectedLast - expectedFirst + 1
    ) {
      fail(`checkpoint segment ${index} range/path contract mismatch`);
    }

    const entryBytes = safeInteger(
      entry.bytes,
      `checkpoint segment ${index} bytes`,
      {
        min: 1,
        max: VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1,
      },
    );
    if (!SHA256_RE.test(String(entry.sha256 || ""))) {
      fail(`checkpoint segment ${index} sha256 malformed`);
    }

    aggregateBytes += entryBytes;
    aggregateBlocks += entry.blocks;
    segmentsByName[expectedName] = deepFreeze({
      name: expectedName,
      path: expectedPath,
      first: expectedFirst,
      last: expectedLast,
      blocks: entry.blocks,
      bytes: entryBytes,
      sha256: entry.sha256,
    });
  }

  if (aggregateBytes !== payloadBytes) {
    fail("checkpoint manifest aggregate payload bytes mismatch");
  }
  if (aggregateBlocks !== blockCount) {
    fail("checkpoint manifest aggregate block count mismatch");
  }

  const expectedContentId = computeVoidPublicCheckpointIdV1(manifest);
  if (
    !VOID_PUBLIC_CHECKPOINT_ID_RE_V1.test(
      String(manifest.checkpoint_id || ""),
    ) ||
    manifest.checkpoint_id !== expectedContentId
  ) {
    fail("checkpoint manifest content-derived checkpoint_id mismatch");
  }
  if (
    expectedCheckpointId &&
    manifest.checkpoint_id !== expectedCheckpointId
  ) {
    fail("checkpoint manifest checkpoint_id differs from requested route");
  }

  if (expectedCheckpoint) {
    if (manifestSha256 !== expectedCheckpoint.manifest_sha256) {
      fail("checkpoint manifest raw SHA-256 differs from discovery");
    }
    for (const key of [
      "checkpoint_id",
      "source_sha",
      "head",
      "block_count",
      "segment_count",
      "payload_bytes",
    ]) {
      if (manifest[key] !== expectedCheckpoint[key]) {
        fail(`checkpoint manifest ${key} differs from discovery`);
      }
    }
  }

  deepFreeze(manifest);
  deepFreeze(segmentsByName);
  return Object.freeze({
    checkpoint_id: manifest.checkpoint_id,
    manifest_sha256: manifestSha256,
    source_sha: manifest.source_sha,
    head,
    block_count: blockCount,
    segment_count: segmentCount,
    payload_bytes: payloadBytes,
    manifest,
    segments_by_name: segmentsByName,
  });
}

export function validateVoidPublicCheckpointSegmentBytesV1(
  route,
  bytes,
  verifiedManifest,
) {
  if (!verifiedManifest || typeof verifiedManifest !== "object") {
    fail("verified checkpoint manifest binding is required");
  }
  let parsed;
  try {
    parsed = new URL(String(route), "http://checkpoint.invalid");
  } catch {
    fail("checkpoint segment route is invalid");
  }
  if (parsed.search !== "") {
    fail("checkpoint segment route must not contain query parameters");
  }
  const match = VOID_PUBLIC_CHECKPOINT_SEGMENT_PATH_RE_V1.exec(
    parsed.pathname,
  );
  if (!match) fail("checkpoint segment route is malformed");
  if (match[1] !== verifiedManifest.checkpoint_id) {
    fail("checkpoint segment checkpoint_id differs from verified manifest");
  }

  const expected = verifiedManifest.segments_by_name?.[match[2]];
  if (!expected) {
    fail("checkpoint segment is not present in verified manifest");
  }

  const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (
    body.length <= 0 ||
    body.length > VOID_PUBLIC_CHECKPOINT_SEGMENT_MAX_BYTES_V1 ||
    body.length !== expected.bytes
  ) {
    fail("checkpoint segment byte length differs from verified manifest");
  }
  const digest = sha256VoidPublicCheckpointBytesV1(body);
  if (digest !== expected.sha256) {
    fail("checkpoint segment SHA-256 differs from verified manifest");
  }
  return expected;
}
