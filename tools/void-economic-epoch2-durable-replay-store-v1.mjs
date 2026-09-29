#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1,
} from "./void-economic-epoch2-signed-submission-intent-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1 =
  "VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1";

export const VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    production_runtime_bound: false,
    public_route_active: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    wallet_access: false,
    private_key_access: false,
    credential_content_access: false,
    validator_mutation: false,
    token_movement: false,
    funds_movement: false,
    migration_authorized: false,
    public_activation_authorized: false,
  });

const MAX_RECEIPT_BYTES = 8 * 1024;
const DIGEST_RE = /^0x[0-9a-f]{64}$/;
const ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const DECIMAL_RE = /^(?:0|[1-9][0-9]*)$/;
const UINT64_MAX = (1n << 64n) - 1n;
const METADATA_KEYS = Object.freeze([
  "chain_id",
  "execution_epoch",
  "gateway_id",
  "signer",
  "nonce",
  "target",
  "calldata_keccak256",
  "expires_at_unix",
]);

export class VoidEconomicEpoch2DurableReplayStoreErrorV1 extends Error {
  constructor(reason) {
    super(reason);
    this.name = "VoidEconomicEpoch2DurableReplayStoreErrorV1";
    this.reason = reason;
  }
}

function fail(reason) {
  throw new VoidEconomicEpoch2DurableReplayStoreErrorV1(reason);
}

function exactPlainRecord(value, keys, reason) {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw null;
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;
    const observed = Object.keys(value).sort();
    const expected = [...keys].sort();
    if (
      observed.length !== expected.length ||
      observed.some((key, index) => key !== expected[index])
    ) {
      throw null;
    }
    const out = Object.create(null);
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      out[key] = descriptor.value;
    }
    return Object.freeze(out);
  } catch {
    fail(reason);
  }
}

function canonicalUint64(value, reason) {
  if (
    typeof value !== "string" ||
    value.length > UINT64_MAX.toString().length ||
    !DECIMAL_RE.test(value)
  ) {
    fail(reason);
  }
  const parsed = BigInt(value);
  if (parsed > UINT64_MAX) fail(reason);
  return value;
}

function canonicalMetadata(value) {
  const input = exactPlainRecord(
    value,
    METADATA_KEYS,
    "durable_replay_metadata_invalid",
  );
  if (input.chain_id !== 2050 || input.execution_epoch !== 2) {
    fail("durable_replay_metadata_domain_invalid");
  }
  if (
    input.gateway_id !== VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_GATEWAY_ID_V1
  ) {
    fail("durable_replay_metadata_gateway_invalid");
  }
  if (
    typeof input.signer !== "string" ||
    !ADDRESS_RE.test(input.signer) ||
    typeof input.target !== "string" ||
    !ADDRESS_RE.test(input.target)
  ) {
    fail("durable_replay_metadata_address_invalid");
  }
  canonicalUint64(input.nonce, "durable_replay_metadata_nonce_invalid");
  canonicalUint64(
    input.expires_at_unix,
    "durable_replay_metadata_expiry_invalid",
  );
  if (
    typeof input.calldata_keccak256 !== "string" ||
    !DIGEST_RE.test(input.calldata_keccak256)
  ) {
    fail("durable_replay_metadata_calldata_hash_invalid");
  }
  return Object.freeze({
    chain_id: input.chain_id,
    execution_epoch: input.execution_epoch,
    gateway_id: input.gateway_id,
    signer: input.signer,
    nonce: input.nonce,
    target: input.target,
    calldata_keccak256: input.calldata_keccak256,
    expires_at_unix: input.expires_at_unix,
  });
}

function canonicalOptions(value) {
  const input = exactPlainRecord(
    value,
    ["timeout_ms"],
    "durable_replay_options_invalid",
  );
  if (
    !Number.isSafeInteger(input.timeout_ms) ||
    input.timeout_ms < 1 ||
    input.timeout_ms > 5_000
  ) {
    fail("durable_replay_timeout_invalid");
  }
  return Object.freeze({ timeout_ms: input.timeout_ms });
}

function privateMode(stat, reason) {
  if ((stat.mode & 0o077) !== 0) fail(reason);
}

function openDirectoryForFsync(directory, reason) {
  let fd;
  try {
    fd = fs.openSync(
      directory,
      fs.constants.O_RDONLY |
        fs.constants.O_DIRECTORY |
        fs.constants.O_NOFOLLOW,
    );
  } catch {
    fail(reason);
  }
  return fd;
}

function fsyncDirectory(directory, reason) {
  const fd = openDirectoryForFsync(directory, reason);
  try {
    fs.fsyncSync(fd);
  } catch {
    fail(reason);
  } finally {
    fs.closeSync(fd);
  }
}

function canonicalReceipt(digest, metadata) {
  return Object.freeze({
    marker: VOID_ECONOMIC_EPOCH2_DURABLE_REPLAY_STORE_V1,
    version: 1,
    status: "CONSUMED",
    digest,
    metadata,
  });
}

function receiptBytes(receipt) {
  return Buffer.from(JSON.stringify(receipt, null, 2) + "\n", "utf8");
}

function validateExistingReceipt(receiptPath, digest, metadata) {
  let stat;
  try {
    stat = fs.lstatSync(receiptPath);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    fail("durable_replay_receipt_stat_failed");
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("durable_replay_receipt_type_invalid");
  }
  privateMode(stat, "durable_replay_receipt_permissions_invalid");
  if (stat.size < 2 || stat.size > MAX_RECEIPT_BYTES) {
    fail("durable_replay_receipt_size_invalid");
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  } catch {
    fail("durable_replay_receipt_parse_failed");
  }
  const expected = canonicalReceipt(digest, metadata);
  if (JSON.stringify(parsed) !== JSON.stringify(expected)) {
    fail("durable_replay_receipt_metadata_mismatch");
  }
}

function writeReceipt(markerDir, digest, metadata) {
  const receiptPath = path.join(markerDir, "receipt.json");
  const pendingPath = path.join(
    markerDir,
    ".receipt." + String(process.pid) + ".pending",
  );
  let fd = null;
  try {
    fd = fs.openSync(
      pendingPath,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        fs.constants.O_NOFOLLOW,
      0o600,
    );
    fs.writeFileSync(fd, receiptBytes(canonicalReceipt(digest, metadata)));
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(pendingPath, receiptPath);
    fsyncDirectory(
      markerDir,
      "durable_replay_marker_directory_fsync_failed",
    );
  } catch (writeError) {
    const cleanupFailures = [];
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (closeError) {
        cleanupFailures.push("close:" + String(closeError?.code || "unknown"));
      }
    }
    try {
      fs.unlinkSync(pendingPath);
    } catch (unlinkError) {
      if (unlinkError?.code !== "ENOENT") {
        cleanupFailures.push(
          "unlink:" + String(unlinkError?.code || "unknown"),
        );
      }
    }
    if (cleanupFailures.length > 0) {
      fail("durable_replay_receipt_cleanup_failed");
    }
    void writeError;
    fail("durable_replay_receipt_write_failed");
  }
}

function replayTuple() {
  return Object.freeze({
    consumed: false,
    already_consumed: true,
    atomic: true,
  });
}

function freshTuple() {
  return Object.freeze({
    consumed: true,
    already_consumed: false,
    atomic: true,
  });
}

export function createVoidEconomicEpoch2DurableReplayStoreV1({ root }) {
  if (
    typeof root !== "string" ||
    root.length === 0 ||
    root.includes("\0") ||
    !path.isAbsolute(root) ||
    path.resolve(root) !== root
  ) {
    fail("durable_replay_root_invalid");
  }

  let rootStat;
  let rootRealpath;
  try {
    rootStat = fs.lstatSync(root);
    rootRealpath = fs.realpathSync.native(root);
  } catch {
    fail("durable_replay_root_unavailable");
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    fail("durable_replay_root_type_invalid");
  }
  if (rootRealpath !== root) fail("durable_replay_root_realpath_mismatch");
  privateMode(rootStat, "durable_replay_root_permissions_invalid");
  if (
    typeof process.getuid === "function" &&
    rootStat.uid !== process.getuid()
  ) {
    fail("durable_replay_root_owner_invalid");
  }

  const pinnedRoot = Object.freeze({
    dev: rootStat.dev,
    ino: rootStat.ino,
    uid: rootStat.uid,
    realpath: rootRealpath,
  });

  function assertRootStable() {
    let stat;
    let realpath;
    try {
      stat = fs.lstatSync(root);
      realpath = fs.realpathSync.native(root);
    } catch {
      fail("durable_replay_root_changed");
    }
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      stat.dev !== pinnedRoot.dev ||
      stat.ino !== pinnedRoot.ino ||
      stat.uid !== pinnedRoot.uid ||
      realpath !== pinnedRoot.realpath
    ) {
      fail("durable_replay_root_changed");
    }
    privateMode(stat, "durable_replay_root_permissions_invalid");
  }

  return Object.freeze({
    async consumeIfFresh(digest, metadata, options) {
      if (typeof digest !== "string" || !DIGEST_RE.test(digest)) {
        fail("durable_replay_digest_invalid");
      }
      const canonicalMeta = canonicalMetadata(metadata);
      canonicalOptions(options);
      assertRootStable();

      const markerDir = path.join(root, digest.slice(2));
      let created = false;
      try {
        fs.mkdirSync(markerDir, { mode: 0o700 });
        created = true;
      } catch (error) {
        if (error?.code !== "EEXIST") {
          fail("durable_replay_marker_create_failed");
        }
      }

      if (!created) {
        let markerStat;
        try {
          markerStat = fs.lstatSync(markerDir);
        } catch {
          fail("durable_replay_marker_stat_failed");
        }
        if (!markerStat.isDirectory() || markerStat.isSymbolicLink()) {
          fail("durable_replay_marker_type_invalid");
        }
        privateMode(markerStat, "durable_replay_marker_permissions_invalid");
        validateExistingReceipt(
          path.join(markerDir, "receipt.json"),
          digest,
          canonicalMeta,
        );
        return replayTuple();
      }

      // The directory name is the authoritative create-once replay marker.
      // It is fsynced into the root before this method may return fresh.
      fsyncDirectory(root, "durable_replay_root_fsync_failed");

      let markerStat;
      try {
        markerStat = fs.lstatSync(markerDir);
      } catch {
        fail("durable_replay_marker_stat_failed");
      }
      if (!markerStat.isDirectory() || markerStat.isSymbolicLink()) {
        fail("durable_replay_marker_type_invalid");
      }
      privateMode(markerStat, "durable_replay_marker_permissions_invalid");

      // The receipt is audit metadata, not replay authority. If this write
      // fails the marker remains consumed and the caller receives a failure.
      writeReceipt(markerDir, digest, canonicalMeta);
      return freshTuple();
    },
  });
}
