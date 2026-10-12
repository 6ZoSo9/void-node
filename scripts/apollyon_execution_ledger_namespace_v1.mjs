// VOID_OX_ALPHA_EXECUTION_LEDGER_NAMESPACE_V8_6 — per-operation durable ledger namespace.
// Scope guard: pure filesystem namespace mapping only; Linux-only; no network, env, time,
// random, PID-liveness, TTL, retry, reclaim, wallet, chain, validator, repo, or service code.
// Maps ONE stable broker operationId to exactly ONE private ledger directory beneath an
// already-open pinned broker ledger-root FileHandle. The logical work digest NEVER chooses
// the directory: the same operationId always reopens the same basename regardless of work
// bytes; different operationIds always map to different basenames even for identical work.
import { mkdir } from 'node:fs/promises';
import { openPinnedLedgerDirectoryV1 } from './apollyon_execution_ledger_publish_v1.mjs';

const MODULE_ID = 'VOID_OX_ALPHA_EXECUTION_LEDGER_NAMESPACE_V8_6';
const OPERATION_ID_PATTERN = /^apollyon_op_v1:([0-9a-f]{64})$/;

function fail(message) { throw new Error(`${MODULE_ID}: ${message}`); }

async function closeQuietlyV1(handle) {
  try { await handle.close(); } catch { /* best effort */ }
}

export async function openOperationLedgerNamespaceV1(rootDirectoryHandle, operationId) {
  if (process.platform !== 'linux') fail('namespace primitive supports Linux only');
  if (typeof operationId !== 'string') fail('operationId must be a string');
  const match = OPERATION_ID_PATTERN.exec(operationId);
  if (!match) fail('operationId must match /^apollyon_op_v1:[0-9a-f]{64}$/');
  // Identity is the operationId alone: no re-hashing, no caller-supplied basename/path, and
  // no work, registry, trial/admission id, timeout, key, provider id, clock, PID, or attempt
  // counter ever influences namespaceName. Directory existence confers NO execution authority;
  // BIND_INTENT/RESERVE and replay remain mandatory before any provider admission.
  const namespaceName = `apollyon-op-v1-${match[1]}`;
  if (rootDirectoryHandle === null || typeof rootDirectoryHandle !== 'object' || Array.isArray(rootDirectoryHandle)) {
    fail('rootDirectoryHandle must be an open Node FileHandle');
  }
  const { fd } = rootDirectoryHandle;
  if (!Number.isSafeInteger(fd) || fd < 0) fail('rootDirectoryHandle.fd must be a safe integer >= 0');
  if (typeof rootDirectoryHandle.stat !== 'function') fail('rootDirectoryHandle.stat must be an async stat function');

  // Snapshot the exact open root generation BEFORE any namespace mutation.
  const rootBefore = await rootDirectoryHandle.stat({ bigint: true });
  if (!rootBefore.isDirectory()) fail('ledger root is not a directory');
  if ((Number(rootBefore.mode) & 0o7777) !== 0o700) fail('ledger root mode is not exactly 0700');
  if (typeof process.getuid === 'function' && Number(rootBefore.uid) !== process.getuid()) {
    fail('ledger root owner is not the current real UID');
  }

  // Every pathname stays beneath the exact open root generation via /proc/self/fd/<fd>;
  // no caller path is ever used to rediscover the root.
  const namespacePath = `/proc/self/fd/${fd}/${namespaceName}`;
  try {
    await mkdir(namespacePath, { mode: 0o700 }); // EEXIST below means reopen the existing namespace.
  } catch (error) {
    if (error?.code !== 'EEXIST') fail(`namespace creation failed: ${String(error?.code ?? 'unknown_error')}`);
  }

  // Reopen EXCLUSIVELY through the proven publisher's pinned-directory validation; no weaker
  // duplicate open routine is implemented here.
  const directoryHandle = await openPinnedLedgerDirectoryV1(namespacePath);
  try {
    // Require exact root generation continuity across dev, ino, uid, and permission bits.
    const rootAfter = await rootDirectoryHandle.stat({ bigint: true });
    if (!rootAfter.isDirectory()) fail('ledger root is no longer a directory');
    if (rootAfter.dev !== rootBefore.dev || rootAfter.ino !== rootBefore.ino) fail('ledger root dev/ino generation drifted');
    if (rootAfter.uid !== rootBefore.uid) fail('ledger root uid drifted');
    if ((Number(rootAfter.mode) & 0o7777) !== (Number(rootBefore.mode) & 0o7777)) fail('ledger root permission bits drifted');
    // Child must be a private 0700 directory owned identically to the root; its own dev/ino
    // generation remains pinned by the FileHandle carried in the publisher's frozen object.
    if (directoryHandle.mode !== 0o700) fail('namespace mode is not exactly 0700');
    if (directoryHandle.uid !== Number(rootBefore.uid)) fail('namespace owner differs from ledger root owner');
    return Object.freeze({
      operationId,
      namespaceName,
      rootDev: rootBefore.dev.toString(10),
      rootIno: rootBefore.ino.toString(10),
      directoryHandle,
    });
  } catch (error) {
    await closeQuietlyV1(directoryHandle.handle); // close child before throwing any post-open failure
    throw error;
  }
}

// Read-only/no-create lookup for already-existing durable operation state.
// This function NEVER mkdirs. It exists so committed ACCEPTED results can be
// replayed before any fresh execution-admission authority is considered.
export async function openExistingOperationLedgerNamespaceV1(rootDirectoryHandle, operationId) {
  if (process.platform !== 'linux') fail('namespace primitive supports Linux only');
  if (typeof operationId !== 'string') fail('operationId must be a string');
  const match = OPERATION_ID_PATTERN.exec(operationId);
  if (!match) fail('operationId must match /^apollyon_op_v1:[0-9a-f]{64}$/');
  if (rootDirectoryHandle === null || typeof rootDirectoryHandle !== 'object' || Array.isArray(rootDirectoryHandle)) {
    fail('rootDirectoryHandle must be an open Node FileHandle');
  }
  const { fd } = rootDirectoryHandle;
  if (!Number.isSafeInteger(fd) || fd < 0) fail('rootDirectoryHandle.fd must be a safe integer >= 0');
  if (typeof rootDirectoryHandle.stat !== 'function') fail('rootDirectoryHandle.stat must be an async stat function');

  const rootBefore = await rootDirectoryHandle.stat({ bigint: true });
  if (!rootBefore.isDirectory()) fail('ledger root is not a directory');
  if ((Number(rootBefore.mode) & 0o7777) !== 0o700) fail('ledger root mode is not exactly 0700');
  if (typeof process.getuid === 'function' && Number(rootBefore.uid) !== process.getuid()) {
    fail('ledger root owner is not the current real UID');
  }

  const namespaceName = `apollyon-op-v1-${match[1]}`;
  const namespacePath = `/proc/self/fd/${fd}/${namespaceName}`;
  let directoryHandle;
  try {
    directoryHandle = await openPinnedLedgerDirectoryV1(namespacePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    const rootAfterMissing = await rootDirectoryHandle.stat({ bigint: true });
    if (!rootAfterMissing.isDirectory()
        || rootAfterMissing.dev !== rootBefore.dev
        || rootAfterMissing.ino !== rootBefore.ino
        || rootAfterMissing.uid !== rootBefore.uid
        || (Number(rootAfterMissing.mode) & 0o7777) !== (Number(rootBefore.mode) & 0o7777)) {
      fail('ledger root generation drifted during no-create missing lookup');
    }
    return null;
  }

  try {
    const rootAfter = await rootDirectoryHandle.stat({ bigint: true });
    if (!rootAfter.isDirectory()) fail('ledger root is no longer a directory');
    if (rootAfter.dev !== rootBefore.dev || rootAfter.ino !== rootBefore.ino) fail('ledger root dev/ino generation drifted');
    if (rootAfter.uid !== rootBefore.uid) fail('ledger root uid drifted');
    if ((Number(rootAfter.mode) & 0o7777) !== (Number(rootBefore.mode) & 0o7777)) {
      fail('ledger root permission bits drifted');
    }
    if (directoryHandle.mode !== 0o700) fail('namespace mode is not exactly 0700');
    if (directoryHandle.uid !== Number(rootBefore.uid)) fail('namespace owner differs from ledger root owner');
    return Object.freeze({
      operationId,
      namespaceName,
      rootDev: rootBefore.dev.toString(10),
      rootIno: rootBefore.ino.toString(10),
      directoryHandle,
    });
  } catch (error) {
    await closeQuietlyV1(directoryHandle.handle);
    throw error;
  }
}
