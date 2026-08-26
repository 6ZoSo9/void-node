// VOID_APOLLYON_ACCEPTED_RESULT_CAPSULE_V1
// Private durable consumer-evidence capsule only. This module owns NO provider-send,
// retry, reclaim, reconciliation, wallet, chain, validator, repository, or service authority.
// The exact-once ledger remains record-only; capsules live in a separate pinned 0700 root.
import { createHash } from 'node:crypto';
import { constants as FS } from 'node:fs';
import { lstat as fsLstat, open as fsOpen } from 'node:fs/promises';

import { loadLedgerRecordsV1 } from './apollyon_execution_ledger_load_v1.mjs';
import { replayBrokerStateFromLedgerV1 } from './apollyon_execution_broker_replay_v1.mjs';
import { BROKER_STATE_V1 } from './apollyon_execution_broker_v1.mjs';

const MODULE_ID = 'VOID_APOLLYON_ACCEPTED_RESULT_CAPSULE_V1';
const CAPSULE_MARKER = 'VOID_APOLLYON_ACCEPTED_RESULT_CAPSULE_V1';
const DIGEST_MARKER = 'VOID_APOLLYON_ACCEPTED_RESULT_DIGEST_V1';
const OPERATION_ID = /^apollyon_op_v1:([0-9a-f]{64})$/;
const HEX64 = /^[0-9a-f]{64}$/;
const MAX_CAPSULE_BYTES = (4 * 1024 * 1024) - (64 * 1024);

function fail(message) {
  throw new Error(`${MODULE_ID}: ${message}`);
}

function isPlainObjectV1(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function exactKeysV1(value, expected, label) {
  if (!isPlainObjectV1(value)) fail(`${label} must be a plain object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(`${label} must contain exactly: ${wanted.join(',')}`);
  }
}

function canonicalJsonV1(value) {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('canonical JSON requires finite numbers');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJsonV1(entry)).join(',')}]`;
  if (!isPlainObjectV1(value)) fail('canonical JSON requires plain objects');
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJsonV1(value[key])}`).join(',')}}`;
}

function snapshotJsonValueV1(value, label, depth = 0) {
  if (depth > 24) fail(`${label} exceeds maximum nested depth 24`);
  if (value === null) return null;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') {
    if (!Number.isFinite(value)) fail(`${label} contains a non-finite number`);
    return value;
  }
  if (type !== 'object') fail(`${label} contains a non-JSON ${type} value`);
  if (Array.isArray(value)) {
    if (value.length > 512) fail(`${label} array exceeds 512 entries`);
    return Object.freeze(value.map((entry) => snapshotJsonValueV1(entry, label, depth + 1)));
  }
  if (!isPlainObjectV1(value)) fail(`${label} contains a non-plain object`);
  const keys = Object.keys(value);
  if (keys.length > 512) fail(`${label} object exceeds 512 keys`);
  if (Reflect.ownKeys(value).length !== keys.length) {
    fail(`${label} contains symbol-keyed or non-enumerable-owned data`);
  }
  const out = {};
  for (const key of keys) out[key] = snapshotJsonValueV1(value[key], label, depth + 1);
  return Object.freeze(out);
}

export function acceptedResultDigestV1(value) {
  const snapshot = snapshotJsonValueV1(value, 'accepted result');
  return createHash('sha256')
    .update(Buffer.concat([
      Buffer.from(`${DIGEST_MARKER}\0`, 'utf8'),
      Buffer.from(canonicalJsonV1(snapshot), 'utf8'),
    ]))
    .digest('hex');
}

export function validateAcceptedResultBindingV1(raw) {
  exactKeysV1(raw, [
    'operationId',
    'logicalOperationIntentDigest',
    'logicalWorkDigest',
    'registrySha256',
    'requestBodySha256',
  ], 'accepted result binding');
  if (!OPERATION_ID.test(String(raw.operationId ?? ''))) {
    fail('accepted result binding operationId is invalid');
  }
  for (const key of [
    'logicalOperationIntentDigest',
    'logicalWorkDigest',
    'registrySha256',
    'requestBodySha256',
  ]) {
    if (!HEX64.test(String(raw[key] ?? ''))) fail(`accepted result binding ${key} is invalid`);
  }
  return Object.freeze({
    operationId: raw.operationId,
    logicalOperationIntentDigest: raw.logicalOperationIntentDigest,
    logicalWorkDigest: raw.logicalWorkDigest,
    registrySha256: raw.registrySha256,
    requestBodySha256: raw.requestBodySha256,
  });
}

function currentEffectiveUidV1() {
  if (typeof process.geteuid !== 'function') fail('process.geteuid is required');
  const uid = process.geteuid();
  if (!Number.isSafeInteger(uid) || uid < 0) fail('process.geteuid returned an invalid effective UID');
  return uid;
}

async function revalidatePinnedRootV1(root) {
  if (root === null || typeof root !== 'object' || Array.isArray(root)) {
    fail('accepted result root must be a pinned directory object');
  }
  const handle = root.handle;
  if (!handle || !Number.isSafeInteger(handle.fd) || handle.fd < 0
      || typeof handle.stat !== 'function' || typeof handle.sync !== 'function') {
    fail('accepted result root pinned FileHandle is missing');
  }
  const st = await handle.stat({ bigint: true });
  if (!st.isDirectory()) fail('accepted result root is not a directory');
  if (st.dev !== root.dev || st.ino !== root.ino) fail('accepted result root dev/ino drifted');
  if ((Number(st.mode) & 0o7777) !== 0o700 || root.mode !== 0o700) {
    fail('accepted result root mode is not exactly 0700');
  }
  if (Number(st.uid) !== currentEffectiveUidV1()) fail('accepted result root owner drifted');
  return handle;
}

function capsuleLeafV1(operationId) {
  const match = OPERATION_ID.exec(operationId);
  if (!match) fail('operationId is invalid for capsule leaf derivation');
  return `accepted-result-v1-${match[1]}.json`;
}

function capsulePathV1(handle, operationId) {
  return `/proc/self/fd/${handle.fd}/${capsuleLeafV1(operationId)}`;
}

function assertPrivateFileStatV1(st, label) {
  if (!st.isFile()) fail(`${label} is not a regular file`);
  if (Number(st.uid) !== currentEffectiveUidV1()) fail(`${label} owner is not the effective UID`);
  if ((Number(st.mode) & 0o7777) !== 0o600) fail(`${label} mode is not exactly 0600`);
  if (st.nlink !== 1n) fail(`${label} link count is not exactly one`);
}

async function readCapsuleFileV1(root, operationId) {
  const directory = await revalidatePinnedRootV1(root);
  const fh = await fsOpen(
    capsulePathV1(directory, operationId),
    FS.O_RDONLY | FS.O_NOFOLLOW | FS.O_NONBLOCK,
  );
  try {
    const before = await fh.stat({ bigint: true });
    assertPrivateFileStatV1(before, 'accepted result capsule');
    if (before.size < 1n || before.size > BigInt(MAX_CAPSULE_BYTES)) {
      fail('accepted result capsule byte length is out of bounds');
    }
    const bytes = Buffer.alloc(Number(before.size));
    let position = 0;
    while (position < bytes.length) {
      const { bytesRead } = await fh.read(bytes, position, bytes.length - position, position);
      if (bytesRead === 0) fail('accepted result capsule ended before declared size');
      position += bytesRead;
    }
    const after = await fh.stat({ bigint: true });
    for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) {
      if (before[key] !== after[key]) fail('accepted result capsule changed during read');
    }
    let value;
    try {
      value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      fail('accepted result capsule is not valid UTF-8 JSON');
    }
    const canonicalBytes = Buffer.from(`${canonicalJsonV1(value)}\n`, 'utf8');
    if (!bytes.equals(canonicalBytes)) {
      fail('accepted result capsule bytes are not exact canonical JSON');
    }

    const visible = await fsLstat(capsulePathV1(directory, operationId), { bigint: true });
    assertPrivateFileStatV1(visible, 'visible accepted result capsule');
    if (visible.dev !== after.dev || visible.ino !== after.ino) {
      fail('visible accepted result capsule generation differs from the generation read');
    }
    await revalidatePinnedRootV1(root);
    return { value, bytes, stat: after };
  } finally {
    try { await fh.close(); } catch { /* best effort */ }
  }
}

function validateCapsuleV1(raw, binding, acceptedDigest) {
  exactKeysV1(raw, [
    'marker',
    'version',
    'operation_id',
    'logical_operation_intent_digest',
    'logical_work_digest',
    'registry_sha256',
    'request_body_sha256',
    'result_digest',
    'result',
  ], 'accepted result capsule');
  if (raw.marker !== CAPSULE_MARKER || raw.version !== 1) {
    fail('accepted result capsule marker/version is invalid');
  }
  if (raw.operation_id !== binding.operationId
      || raw.logical_operation_intent_digest !== binding.logicalOperationIntentDigest
      || raw.logical_work_digest !== binding.logicalWorkDigest
      || raw.registry_sha256 !== binding.registrySha256
      || raw.request_body_sha256 !== binding.requestBodySha256) {
    fail('accepted result capsule binding mismatch');
  }
  if (!HEX64.test(String(raw.result_digest ?? '')) || raw.result_digest !== acceptedDigest) {
    fail('accepted result capsule digest does not match durable ACCEPTED digest');
  }
  const result = snapshotJsonValueV1(raw.result, 'accepted result capsule result');
  if (acceptedResultDigestV1(result) !== raw.result_digest) {
    fail('accepted result capsule payload does not recompute to its digest');
  }
  return Object.freeze({ resultDigest: raw.result_digest, value: result });
}

export async function assertAcceptedResultCapsuleAbsentV1(root, rawBinding) {
  const binding = validateAcceptedResultBindingV1(rawBinding);
  const directory = await revalidatePinnedRootV1(root);
  try {
    const st = await fsLstat(capsulePathV1(directory, binding.operationId));
    if (!st.isFile()) fail('preexisting accepted result capsule leaf is not a regular file');
  } catch (error) {
    if (error?.code === 'ENOENT') return true;
    throw error;
  }
  fail('accepted result capsule leaf already exists before provider admission');
}

export async function publishAcceptedResultCapsuleV1(root, rawBinding, resultDigest, rawValue) {
  const binding = validateAcceptedResultBindingV1(rawBinding);
  if (!HEX64.test(String(resultDigest ?? ''))) fail('resultDigest must be lowercase sha256 hex');
  const result = snapshotJsonValueV1(rawValue, 'accepted result');
  if (acceptedResultDigestV1(result) !== resultDigest) {
    fail('accepted result digest does not bind exact payload');
  }
  const capsule = Object.freeze({
    marker: CAPSULE_MARKER,
    version: 1,
    operation_id: binding.operationId,
    logical_operation_intent_digest: binding.logicalOperationIntentDigest,
    logical_work_digest: binding.logicalWorkDigest,
    registry_sha256: binding.registrySha256,
    request_body_sha256: binding.requestBodySha256,
    result_digest: resultDigest,
    result,
  });
  const bytes = Buffer.from(`${canonicalJsonV1(capsule)}\n`, 'utf8');
  if (bytes.length < 1 || bytes.length > MAX_CAPSULE_BYTES) {
    fail(`accepted result capsule exceeds ${MAX_CAPSULE_BYTES} bytes`);
  }

  const directory = await revalidatePinnedRootV1(root);
  let fh = null;
  try {
    fh = await fsOpen(
      capsulePathV1(directory, binding.operationId),
      FS.O_WRONLY | FS.O_CREAT | FS.O_EXCL | FS.O_NOFOLLOW,
      0o600,
    );
    const created = await fh.stat({ bigint: true });
    assertPrivateFileStatV1(created, 'new accepted result capsule');
    let written = 0;
    while (written < bytes.length) {
      const { bytesWritten } = await fh.write(bytes, written, bytes.length - written, written);
      if (bytesWritten <= 0) fail('accepted result capsule short write');
      written += bytesWritten;
    }
    await fh.sync();
    await directory.sync();

    const reread = await readCapsuleFileV1(root, binding.operationId);
    if (reread.stat.dev !== created.dev || reread.stat.ino !== created.ino) {
      fail('published accepted result capsule generation differs from created inode');
    }
    if (!reread.bytes.equals(bytes)) fail('published accepted result capsule bytes differ');
    return validateCapsuleV1(reread.value, binding, resultDigest);
  } finally {
    if (fh) {
      try { await fh.close(); } catch { /* best effort */ }
    }
  }
}

export async function readAcceptedResultCapsuleV1(root, ledgerDirectoryHandle, rawBinding) {
  const binding = validateAcceptedResultBindingV1(rawBinding);

  // Authority gate comes FIRST and solely from the strict exact-once ledger.
  // An existing capsule while RESERVED/UNCERTAIN/blocked never promotes state.
  const records = await loadLedgerRecordsV1(ledgerDirectoryHandle);
  if (records.length === 0) return null;
  const state = replayBrokerStateFromLedgerV1(records);
  if (state.phase !== BROKER_STATE_V1.ACCEPTED) return null;

  const head = records[0];
  if (head.operationId !== binding.operationId
      || head.logicalOperationIntentDigest !== binding.logicalOperationIntentDigest
      || head.logicalWorkDigest !== binding.logicalWorkDigest) {
    fail('durable ACCEPTED ledger does not match requested binding');
  }
  if (!HEX64.test(String(state.acceptedDigest ?? ''))) {
    fail('durable ACCEPTED digest is invalid');
  }

  const read = await readCapsuleFileV1(root, binding.operationId);
  return validateCapsuleV1(read.value, binding, state.acceptedDigest);
}
