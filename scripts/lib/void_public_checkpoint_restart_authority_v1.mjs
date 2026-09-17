#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  stableStringify,
  sha256Hex,
} from "../mainnet0_historical_cartography_v1.mjs";

export const VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_V1 =
  "void_public_checkpoint_restart_authority_v1";

export const PRODUCTION_ACCEPTANCE_ID_V1 =
  "voidm0accept1_0845069c3f20572f2fdf80a7aeb4bde0fc359192d1501a1f6221ba90523bf959";
export const PRODUCTION_AUTHORITY_ID_V1 =
  "voidm0auth1_cdec2cadd6615cdf6c3d64765bcdca3823ff0e8c855c6316bda39c707387b8a8";
export const PRODUCTION_PREFIX_ROOT_V1 =
  "b9c0f187688790dc32e1fea7ea3294a4540bc410131303ec7806d3c811c67dde";
export const PRODUCTION_CHECKPOINT_DESCRIPTOR_SHA256_V1 =
  "6d27db0954e625d71c0abe0fb06cc2519562b8b71fe7b25ce0495079558350b8";
export const PRODUCTION_FROZEN_HEAD_V1 = 1_951_058;
export const PRODUCTION_BLOCK_COUNT_V1 = 1_951_059;
export const PRODUCTION_SEGMENT_COUNT_V1 = 196;
export const PRODUCTION_PREFIX_BYTES_V1 = 452_333_282;

const ACCEPTANCE_SCHEMA =
  "void_mainnet0_historical_cartography_acceptance_v1";
const ACCEPTANCE_VERSION = "v1.2";
const ACCEPTANCE_PREFIX = "voidm0accept1_";
const AUTHORITY_ID_RE = /^voidm0auth1_[0-9a-f]{64}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const SEGMENT_RE = /^[0-9]{8}$/;
const SEGMENT_SPAN = 10_000;
const MAX_SEGMENT_BYTES = 64 * 1024 * 1024;
const MAX_ACCEPTANCE_BYTES = 512 * 1024;
const DEFAULT_REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const PRODUCTION_ACCEPTANCE_REL =
  "public/mainnet0-historical-cartography-acceptance-v1.json";

function fail(message) {
  const error = new Error(message);
  error.voidPublicCheckpointRestartAuthorityV1 = true;
  throw error;
}

function safeInt(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
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

function statIdentity(st) {
  return {
    dev: String(st.dev),
    ino: String(st.ino),
    size: Number(st.size),
    mtimeNs: String(st.mtimeNs),
    ctimeNs: String(st.ctimeNs),
  };
}

function sameIdentity(a, b) {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtimeNs === b.mtimeNs &&
    a.ctimeNs === b.ctimeNs
  );
}

function readStableRegularFile(file, maxBytes) {
  const beforeLs = fs.lstatSync(file, { bigint: true });
  if (!beforeLs.isFile() || beforeLs.isSymbolicLink()) {
    fail(`restart authority path is not a regular non-symlink file: ${file}`);
  }
  if (
    typeof process.getuid === "function" &&
    Number(beforeLs.uid) !== process.getuid()
  ) {
    fail(`restart authority file owner mismatch: ${file}`);
  }
  if ((Number(beforeLs.mode) & 0o002) !== 0) {
    fail(`restart authority file is world-writable: ${file}`);
  }
  const before = statIdentity(beforeLs);
  if (before.size < 1 || before.size > maxBytes) {
    fail(`restart authority file size outside bound: ${file}`);
  }

  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
  );
  try {
    const opened = statIdentity(fs.fstatSync(fd, { bigint: true }));
    if (!sameIdentity(before, opened)) {
      fail(`restart authority file generation changed before read: ${file}`);
    }
    const bytes = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const read = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (read <= 0) fail(`restart authority short read: ${file}`);
      offset += read;
    }
    const after = statIdentity(fs.fstatSync(fd, { bigint: true }));
    if (!sameIdentity(opened, after)) {
      fail(`restart authority file generation changed during read: ${file}`);
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function recomputeAcceptanceId(raw) {
  const body = { ...raw };
  delete body.acceptance_id;
  return (
    ACCEPTANCE_PREFIX +
    sha256Hex(Buffer.from(stableStringify(body), "utf8"))
  );
}

function fixtureConfig(env) {
  const enabled =
    String(
      env.VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_FIXTURE || "0",
    ).trim() === "1";
  if (!enabled) return null;

  if (
    String(env.VOID_PUBLIC_BOOTSTRAP_ALLOW_LOOPBACK_FIXTURE || "0").trim() !==
    "1"
  ) {
    fail("restart authority fixture requires loopback-fixture admission");
  }

  const rawFile = String(
    env.VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_FIXTURE_FILE || "",
  ).trim();
  if (!rawFile || !path.isAbsolute(rawFile)) {
    fail("restart authority fixture file must be an absolute path");
  }
  const resolved = path.resolve(rawFile);
  const tmpRoot = path.resolve(os.tmpdir());
  const relative = path.relative(tmpRoot, resolved);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    fail("restart authority fixture must remain under the system temp root");
  }

  const acceptanceId = String(
    env.VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_ACCEPTANCE_ID || "",
  ).trim();
  const authorityId = String(
    env.VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_AUTHORITY_ID || "",
  ).trim();
  const prefixRoot = String(
    env.VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_PREFIX_ROOT || "",
  ).trim();
  const descriptorSha = String(
    env.VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_EXPECTED_CHECKPOINT_DESCRIPTOR_SHA256 ||
      "",
  ).trim();

  if (
    !/^voidm0accept1_[0-9a-f]{64}$/.test(acceptanceId) ||
    !AUTHORITY_ID_RE.test(authorityId) ||
    !SHA256_RE.test(prefixRoot) ||
    !SHA256_RE.test(descriptorSha)
  ) {
    fail("restart authority fixture expected pins are malformed");
  }

  return Object.freeze({
    file: resolved,
    expectedAcceptanceId: acceptanceId,
    expectedAuthorityId: authorityId,
    expectedPrefixRoot: prefixRoot,
    expectedDescriptorSha256: descriptorSha,
    production: false,
  });
}

function productionConfig(repoRoot) {
  return Object.freeze({
    file: path.join(repoRoot, PRODUCTION_ACCEPTANCE_REL),
    expectedAcceptanceId: PRODUCTION_ACCEPTANCE_ID_V1,
    expectedAuthorityId: PRODUCTION_AUTHORITY_ID_V1,
    expectedPrefixRoot: PRODUCTION_PREFIX_ROOT_V1,
    expectedDescriptorSha256:
      PRODUCTION_CHECKPOINT_DESCRIPTOR_SHA256_V1,
    production: true,
  });
}

function parseAcceptance(bytes, file) {
  let raw;
  try {
    raw = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`restart authority acceptance JSON malformed: ${file}`);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail("restart authority acceptance must be an object");
  }
  return raw;
}

function validateAcceptance(raw, config) {
  if (
    raw.schema !== ACCEPTANCE_SCHEMA ||
    raw.status !== "complete" ||
    raw.version !== ACCEPTANCE_VERSION
  ) {
    fail("restart authority acceptance domain/status/version mismatch");
  }

  const recomputed = recomputeAcceptanceId(raw);
  if (
    raw.acceptance_id !== recomputed ||
    raw.acceptance_id !== config.expectedAcceptanceId
  ) {
    fail("restart authority acceptance content ID mismatch");
  }

  const contract = raw.acceptance_contract;
  if (
    !contract ||
    typeof contract !== "object" ||
    Array.isArray(contract) ||
    contract.canonical_prefix_independently_witnessed !== true ||
    contract.immutable_snapshot_rescan_equal !== true ||
    contract.append_authority !== false ||
    contract.runtime_authority !== false ||
    contract.validator_authority !== false
  ) {
    fail("restart authority acceptance contract mismatch");
  }

  const authority = raw.canonical_prefix_authority;
  if (
    !authority ||
    typeof authority !== "object" ||
    Array.isArray(authority) ||
    authority.authority_basis !==
      "independent_materialization_exact_byte_prefix_match" ||
    authority.exact_byte_prefix_match !== true ||
    authority.source_authority_id !== config.expectedAuthorityId ||
    !AUTHORITY_ID_RE.test(String(authority.source_authority_id || "")) ||
    authority.prefix_root !== config.expectedPrefixRoot ||
    !SHA256_RE.test(String(authority.prefix_root || ""))
  ) {
    fail("restart authority canonical-prefix authority mismatch");
  }

  const frozenHead = safeInt(
    authority.frozen_head,
    "restart authority frozen_head",
  );
  const blockCount = safeInt(
    authority.block_count,
    "restart authority block_count",
    { min: 1 },
  );
  const segmentCount = safeInt(
    authority.segment_count,
    "restart authority segment_count",
    { min: 1 },
  );
  const totalPrefixBytes = safeInt(
    authority.total_prefix_bytes,
    "restart authority total_prefix_bytes",
    { min: 1 },
  );
  if (
    blockCount !== frozenHead + 1 ||
    segmentCount !== Math.floor(frozenHead / SEGMENT_SPAN) + 1
  ) {
    fail("restart authority frozen prefix counts are inconsistent");
  }
  if (
    !Array.isArray(authority.descriptors) ||
    authority.descriptors.length !== segmentCount
  ) {
    fail("restart authority descriptor cardinality mismatch");
  }

  const descriptors = [];
  let aggregateBytes = 0;
  let aggregateBlocks = 0;
  for (let index = 0; index < authority.descriptors.length; index += 1) {
    const row = authority.descriptors[index];
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      fail(`restart authority descriptor ${index} is invalid`);
    }
    const expectedFrom = index * SEGMENT_SPAN;
    const expectedTo = Math.min(
      frozenHead,
      expectedFrom + SEGMENT_SPAN - 1,
    );
    const expectedSegment = String(expectedFrom).padStart(8, "0");
    const prefixBytes = safeInt(
      row.prefix_bytes,
      `restart authority descriptor ${index} prefix_bytes`,
      { min: 1, max: MAX_SEGMENT_BYTES },
    );
    if (
      row.segment !== expectedSegment ||
      !SEGMENT_RE.test(String(row.segment || "")) ||
      row.from !== expectedFrom ||
      row.to !== expectedTo ||
      !SHA256_RE.test(String(row.prefix_sha256 || ""))
    ) {
      fail(`restart authority descriptor ${index} contract mismatch`);
    }
    aggregateBytes += prefixBytes;
    aggregateBlocks += expectedTo - expectedFrom + 1;
    descriptors.push(
      Object.freeze({
        segment: row.segment,
        from: row.from,
        to: row.to,
        prefix_bytes: prefixBytes,
        prefix_sha256: row.prefix_sha256,
      }),
    );
  }
  if (
    aggregateBytes !== totalPrefixBytes ||
    aggregateBlocks !== blockCount
  ) {
    fail("restart authority descriptor conservation mismatch");
  }

  const snapshot = raw.immutable_snapshot;
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    Array.isArray(snapshot) ||
    snapshot.kind !== "blocks_only_checkpoint_v1" ||
    snapshot.checkpoint_prefix_root !== authority.prefix_root ||
    snapshot.checkpoint_descriptor_sha256 !==
      config.expectedDescriptorSha256 ||
    !SHA256_RE.test(String(snapshot.checkpoint_descriptor_sha256 || ""))
  ) {
    fail("restart authority immutable checkpoint witness mismatch");
  }

  if (config.production) {
    if (
      frozenHead !== PRODUCTION_FROZEN_HEAD_V1 ||
      blockCount !== PRODUCTION_BLOCK_COUNT_V1 ||
      segmentCount !== PRODUCTION_SEGMENT_COUNT_V1 ||
      totalPrefixBytes !== PRODUCTION_PREFIX_BYTES_V1
    ) {
      fail("production restart authority numeric anchors changed");
    }
    if (
      authority.independent_materializations !== 2 ||
      authority.independent_witness_repeat_passes !== 2
    ) {
      fail("production restart authority witness cardinality changed");
    }
  }

  return Object.freeze({
    schema: VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_V1,
    production: config.production,
    acceptance_id: raw.acceptance_id,
    source_authority_id: authority.source_authority_id,
    prefix_root: authority.prefix_root,
    checkpoint_descriptor_sha256:
      snapshot.checkpoint_descriptor_sha256,
    frozen_head: frozenHead,
    block_count: blockCount,
    segment_count: segmentCount,
    total_prefix_bytes: totalPrefixBytes,
    descriptors: Object.freeze(descriptors),
  });
}

export function loadVoidPublicCheckpointRestartAuthorityV1({
  repoRoot = DEFAULT_REPO_ROOT,
  env = process.env,
} = {}) {
  const root = path.resolve(repoRoot);
  const config = fixtureConfig(env) ?? productionConfig(root);
  const bytes = readStableRegularFile(
    config.file,
    MAX_ACCEPTANCE_BYTES,
  );
  const raw = parseAcceptance(bytes, config.file);
  return validateAcceptance(raw, config);
}

export function assertVoidPublicCheckpointManifestMatchesRestartAuthorityV1(
  verifiedManifest,
  authority,
) {
  if (
    !verifiedManifest ||
    typeof verifiedManifest !== "object" ||
    !verifiedManifest.manifest ||
    !authority ||
    authority.schema !== VOID_PUBLIC_CHECKPOINT_RESTART_AUTHORITY_V1
  ) {
    fail("checkpoint restart authority comparison input invalid");
  }

  const manifest = verifiedManifest.manifest;
  if (
    verifiedManifest.head !== authority.frozen_head ||
    verifiedManifest.block_count !== authority.block_count ||
    verifiedManifest.segment_count !== authority.segment_count ||
    verifiedManifest.payload_bytes !== authority.total_prefix_bytes ||
    !Array.isArray(manifest.segments) ||
    manifest.segments.length !== authority.segment_count
  ) {
    fail("checkpoint manifest does not cover the exact accepted frozen prefix");
  }

  for (let index = 0; index < authority.descriptors.length; index += 1) {
    const accepted = authority.descriptors[index];
    const actual = manifest.segments[index];
    const expectedPath =
      `segments/${accepted.segment}/blocks.bin`;
    if (
      !actual ||
      actual.name !== accepted.segment ||
      actual.path !== expectedPath ||
      actual.first !== accepted.from ||
      actual.last !== accepted.to ||
      actual.blocks !== accepted.to - accepted.from + 1 ||
      actual.bytes !== accepted.prefix_bytes ||
      actual.sha256 !== accepted.prefix_sha256
    ) {
      fail(
        `checkpoint manifest segment ${accepted.segment} differs from independently accepted canonical prefix`,
      );
    }
  }

  return Object.freeze({
    accepted: true,
    acceptance_id: authority.acceptance_id,
    source_authority_id: authority.source_authority_id,
    prefix_root: authority.prefix_root,
    frozen_head: authority.frozen_head,
    segment_count: authority.segment_count,
  });
}
