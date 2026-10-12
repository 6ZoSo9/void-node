#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  validateVoidPublicCheckpointManifestBytesV1,
} from "../scripts/lib/void_public_checkpoint_contract_v1.mjs";
import {
  assertVoidPublicCheckpointManifestMatchesRestartAuthorityV1,
  loadVoidPublicCheckpointRestartAuthorityV1,
} from "../scripts/lib/void_public_checkpoint_restart_authority_v1.mjs";

const MARKER = "VOID_PUBLIC_CHECKPOINT_PUBLICATION_PREFLIGHT_V1";
const SCHEMA = "void_public_checkpoint_publication_preflight_v1";
const CHECKPOINT_ID_RE = /^voidpbc1_[0-9a-f]{64}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const SOURCE_SHA_RE = /^[0-9a-f]{40}$/;
const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const checkpointTool = path.join(
  repoRoot,
  "tools/void-public-canonical-checkpoint-v1.mjs",
);

function fail(message) {
  throw new Error(`${MARKER}: ${message}`);
}

function parseArgs(argv = process.argv.slice(2)) {
  const values = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const key = String(argv[i] || "");
    if (!key.startsWith("--")) fail(`unexpected argument: ${key}`);
    if (values.has(key)) fail(`duplicate argument: ${key}`);
    const value = String(argv[i + 1] || "");
    if (!value || value.startsWith("--")) fail(`${key} requires a value`);
    values.set(key, value);
    i += 1;
  }
  return values;
}

function required(values, key) {
  const value = String(values.get(key) || "").trim();
  if (!value) fail(`${key} is required`);
  return value;
}

function canonicalRealDirectory(raw, label) {
  if (!path.isAbsolute(raw)) fail(`${label} must be absolute`);
  const resolved = path.resolve(raw);
  if (resolved !== raw) fail(`${label} must be canonical`);
  const real = fs.realpathSync(resolved);
  if (real !== resolved) fail(`${label} must not traverse symlinks`);
  const st = fs.lstatSync(resolved, { bigint: true });
  if (!st.isDirectory() || st.isSymbolicLink()) {
    fail(`${label} must be a real directory`);
  }
  if (
    typeof process.getuid === "function" &&
    Number(st.uid) !== process.getuid()
  ) {
    fail(`${label} owner mismatch`);
  }
  if ((Number(st.mode) & 0o002) !== 0) {
    fail(`${label} must not be world-writable`);
  }
  return resolved;
}

function stableFileBytes(file, maxBytes, label) {
  const before = fs.lstatSync(file, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink()) {
    fail(`${label} must be a regular non-symlink file`);
  }
  if (
    typeof process.getuid === "function" &&
    Number(before.uid) !== process.getuid()
  ) {
    fail(`${label} owner mismatch`);
  }
  if ((Number(before.mode) & 0o002) !== 0) {
    fail(`${label} must not be world-writable`);
  }
  const size = Number(before.size);
  if (!Number.isSafeInteger(size) || size < 1 || size > maxBytes) {
    fail(`${label} size outside bound`);
  }

  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    if (
      opened.dev !== before.dev ||
      opened.ino !== before.ino ||
      opened.size !== before.size ||
      opened.mtimeNs !== before.mtimeNs ||
      opened.ctimeNs !== before.ctimeNs
    ) {
      fail(`${label} generation changed before read`);
    }
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < bytes.length) {
      const read = fs.readSync(
        fd,
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      if (read <= 0) fail(`${label} short read`);
      offset += read;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    if (
      after.dev !== opened.dev ||
      after.ino !== opened.ino ||
      after.size !== opened.size ||
      after.mtimeNs !== opened.mtimeNs ||
      after.ctimeNs !== opened.ctimeNs
    ) {
      fail(`${label} generation changed during read`);
    }
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function verifyCanonicalPacket(packetRoot, expectedSourceSha) {
  const cp = childProcess.spawnSync(
    process.execPath,
    [
      checkpointTool,
      "verify",
      "--packet",
      packetRoot,
      "--expected-source-sha",
      expectedSourceSha,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30 * 60 * 1000,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const output = `${cp.stdout || ""}\n${cp.stderr || ""}`;
  if (
    cp.status !== 0 ||
    !output.includes(
      "VOID_PUBLIC_CANONICAL_CHECKPOINT_V1_VERIFY_GREEN",
    ) ||
    !output.includes("canonical_semantics_verified=true") ||
    !output.includes("authority_boundary_verified=true")
  ) {
    fail(
      `canonical packet verification failed: ${output.slice(0, 4000)}`,
    );
  }
}

function safeReceiptPath(raw) {
  if (!path.isAbsolute(raw)) fail("--receipt must be absolute");
  const resolved = path.resolve(raw);
  if (resolved !== raw) fail("--receipt must be canonical");
  const parent = canonicalRealDirectory(
    path.dirname(resolved),
    "receipt parent",
  );
  if (fs.existsSync(resolved)) {
    fail("receipt already exists");
  }
  return { file: resolved, parent };
}

function writeReceiptCreateOnly(file, receipt) {
  fs.writeFileSync(
    file,
    `${JSON.stringify(receipt, null, 2)}\n`,
    { flag: "wx", mode: 0o600 },
  );
  const st = fs.lstatSync(file);
  if (!st.isFile() || st.isSymbolicLink()) {
    fail("receipt write did not produce a regular file");
  }
  if ((st.mode & 0o777) !== 0o600) {
    fail("receipt permissions are not 0600");
  }
}

function main() {
  const values = parseArgs();
  const packetRaw = required(values, "--packet");
  const expectedSourceSha = required(values, "--expected-source-sha");
  const receiptRaw = required(values, "--receipt");

  if (!SOURCE_SHA_RE.test(expectedSourceSha)) {
    fail("--expected-source-sha malformed");
  }

  const packetRoot = canonicalRealDirectory(
    packetRaw,
    "checkpoint packet root",
  );
  const { file: receiptFile } = safeReceiptPath(receiptRaw);

  const manifestFile = path.join(packetRoot, "checkpoint.json");
  const manifestBytes = stableFileBytes(
    manifestFile,
    MAX_MANIFEST_BYTES,
    "checkpoint manifest",
  );
  const manifestSha256 = sha256(manifestBytes);
  if (!SHA256_RE.test(manifestSha256)) {
    fail("manifest sha256 malformed");
  }

  const verifiedManifest =
    validateVoidPublicCheckpointManifestBytesV1(
      manifestBytes,
    );
  if (
    !CHECKPOINT_ID_RE.test(verifiedManifest.checkpoint_id) ||
    verifiedManifest.manifest.source_sha !== expectedSourceSha
  ) {
    fail("checkpoint source identity mismatch");
  }

  const restartAuthority =
    loadVoidPublicCheckpointRestartAuthorityV1();
  assertVoidPublicCheckpointManifestMatchesRestartAuthorityV1(
    verifiedManifest,
    restartAuthority,
  );
  if (
    manifestSha256 !==
    restartAuthority.checkpoint_descriptor_sha256
  ) {
    fail(
      "checkpoint manifest raw bytes differ from independently sealed checkpoint descriptor",
    );
  }

  verifyCanonicalPacket(packetRoot, expectedSourceSha);

  const gatewayEnv = Object.freeze({
    VOID_PUBLIC_SEED_CHECKPOINT_ROOT: packetRoot,
    VOID_PUBLIC_SEED_CHECKPOINT_ID:
      verifiedManifest.checkpoint_id,
    VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256:
      manifestSha256,
  });

  const receipt = Object.freeze({
    schema: SCHEMA,
    status: "green",
    packet_root: packetRoot,
    checkpoint_id: verifiedManifest.checkpoint_id,
    manifest_sha256: manifestSha256,
    source_sha: verifiedManifest.manifest.source_sha,
    head: verifiedManifest.head,
    block_count: verifiedManifest.block_count,
    segment_count: verifiedManifest.segment_count,
    payload_bytes: verifiedManifest.payload_bytes,
    restart_authority: Object.freeze({
      acceptance_id: restartAuthority.acceptance_id,
      source_authority_id:
        restartAuthority.source_authority_id,
      prefix_root: restartAuthority.prefix_root,
      checkpoint_descriptor_sha256:
        restartAuthority.checkpoint_descriptor_sha256,
      frozen_head: restartAuthority.frozen_head,
      block_count: restartAuthority.block_count,
      segment_count: restartAuthority.segment_count,
      total_prefix_bytes:
        restartAuthority.total_prefix_bytes,
    }),
    gateway_env: gatewayEnv,
    authority: Object.freeze({
      publication_authority: false,
      gateway_start_authority: false,
      deployment_authority: false,
      runtime_service_authority: false,
      wallet_or_funds_authority: false,
    }),
  });

  writeReceiptCreateOnly(receiptFile, receipt);

  console.log(MARKER);
  console.log("status=green");
  console.log(`checkpoint_id=${receipt.checkpoint_id}`);
  console.log(`manifest_sha256=${receipt.manifest_sha256}`);
  console.log(`source_sha=${receipt.source_sha}`);
  console.log(`head=${receipt.head}`);
  console.log(`block_count=${receipt.block_count}`);
  console.log(`segment_count=${receipt.segment_count}`);
  console.log(`payload_bytes=${receipt.payload_bytes}`);
  console.log(
    `restart_acceptance_id=${restartAuthority.acceptance_id}`,
  );
  console.log(
    `restart_authority_id=${restartAuthority.source_authority_id}`,
  );
  console.log(
    `restart_prefix_root=${restartAuthority.prefix_root}`,
  );
  console.log(
    `gateway_checkpoint_root=${gatewayEnv.VOID_PUBLIC_SEED_CHECKPOINT_ROOT}`,
  );
  console.log(
    `gateway_checkpoint_id=${gatewayEnv.VOID_PUBLIC_SEED_CHECKPOINT_ID}`,
  );
  console.log(
    `gateway_manifest_sha256=${gatewayEnv.VOID_PUBLIC_SEED_CHECKPOINT_MANIFEST_SHA256}`,
  );
  console.log(`receipt=${receiptFile}`);
  console.log("canonical_packet_verified=true");
  console.log("independent_restart_authority_bound=true");
  console.log("raw_checkpoint_descriptor_sha256_bound=true");
  console.log("gateway_three_pin_tuple_derived=true");
  console.log("receipt_create_only=true");
  console.log("publication_performed=false");
  console.log("gateway_started=false");
  console.log("deployment=false");
  console.log("runtime_service_action=false");
  console.log("wallet_or_transaction_action=false");
  console.log("funds_action=false");
  console.log(`${MARKER}_GREEN`);
}

try {
  main();
} catch (error) {
  console.error(`${MARKER}_HOLD`);
  console.error(
    `reason=${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
