// VOID_APOLLYON_ACCEPTED_RESULT_CAPSULE_V1
// Private durable consumer-evidence capsule only. This module owns NO provider-send,
// retry, reclaim, wallet, chain, validator, repository, or service authority.
// Exact-once execution authority remains solely in the record-only broker ledger.
import { createHash } from 'node:crypto';
import { constants as FS } from 'node:fs';
import {
  lstat as fsLstat,
  link as fsLink,
  open as fsOpen,
  unlink as fsUnlink,
} from 'node:fs/promises';

import { loadLedgerRecordsV1 } from './apollyon_execution_ledger_load_v1.mjs';
import { replayBrokerStateFromLedgerV1 } from './apollyon_execution_broker_replay_v1.mjs';
import { BROKER_STATE_V1 } from './apollyon_execution_broker_v1.mjs';

const MODULE_ID = 'VOID_APOLLYON_ACCEPTED_RESULT_CAPSULE_V1';
const CAPSULE_MARKER = 'VOID_APOLLYON_ACCEPTED_RESULT_CAPSULE_V1';
const DIGEST_MARKER = 'VOID_APOLLYON_ACCEPTED_RESULT_DIGEST_V1';
const OPERATION_ID = /^apollyon_op_v1:([0-9a-f]{64})$/;
const HEX64 = /^[0-9a-f]{64}$/;

export const MAX_ACCEPTED_RESULT_CANONICAL_BYTES = 3 * 1024 * 1024;
export const MAX_CAPSULE_BYTES = MAX_ACCEPTED_RESULT_CANONICAL_BYTES + (128 * 1024);

function fail(message) { throw new Error(`${MODULE_ID}: ${message}`); }
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

export function assertAcceptedResultCapacityV1(value) {
  const snapshot = snapshotJsonValueV1(value, 'accepted result');
  const bytes = Buffer.from(canonicalJsonV1(snapshot), 'utf8');
  if (bytes.length > MAX_ACCEPTED_RESULT_CANONICAL_BYTES) {
    fail(`accepted result exceeds ${MAX_ACCEPTED_RESULT_CANONICAL_BYTES} canonical bytes`);
  }
  return Object.freeze({ value: snapshot, canonicalBytes: bytes });
}

export function acceptedResultDigestV1(value) {
  const bounded = assertAcceptedResultCapacityV1(value);
  return createHash('sha256')
    .update(Buffer.concat([Buffer.from(`${DIGEST_MARKER}\0`, 'utf8'), bounded.canonicalBytes]))
    .digest('hex');
}

export function validateAcceptedResultBindingV1(raw) {
  exactKeysV1(raw, [
    'operationId','logicalOperationIntentDigest','logicalWorkDigest','registrySha256','requestBodySha256',
  ], 'accepted result binding');
  if (!OPERATION_ID.test(String(raw.operationId ?? ''))) fail('accepted result binding operationId is invalid');
  for (const key of ['logicalOperationIntentDigest','logicalWorkDigest','registrySha256','requestBodySha256']) {
    if (!HEX64.test(String(raw[key] ?? ''))) fail(`accepted result binding ${key} is invalid`);
  }
  return Object.freeze({...raw});
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
  if ((Number(st.mode) & 0o7777) !== 0o700 || root.mode !== 0o700) fail('accepted result root mode is not exactly 0700');
  if (Number(st.uid) !== currentEffectiveUidV1()) fail('accepted result root owner drifted');
  return handle;
}
function operationHexV1(operationId) {
  const match = OPERATION_ID.exec(operationId);
  if (!match) fail('operationId is invalid for capsule leaf derivation');
  return match[1];
}
function finalLeafV1(operationId) { return `accepted-result-v1-${operationHexV1(operationId)}.json`; }
function stageLeafV1(operationId) { return `.accepted-result-stage-v1-${operationHexV1(operationId)}.json`; }
function leafPathV1(handle, leaf) { return `/proc/self/fd/${handle.fd}/${leaf}`; }
function assertPrivateFileStatV1(st, label, allowedLinks = [1n]) {
  if (!st.isFile()) fail(`${label} is not a regular file`);
  if (Number(st.uid) !== currentEffectiveUidV1()) fail(`${label} owner is not the effective UID`);
  if ((Number(st.mode) & 0o7777) !== 0o600) fail(`${label} mode is not exactly 0600`);
  if (!allowedLinks.includes(st.nlink)) fail(`${label} link count ${String(st.nlink)} is not reviewed`);
}
async function lstatOrNullV1(path) {
  try { return await fsLstat(path, { bigint: true }); }
  catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
}
async function readCapsuleLeafV1(root, operationId, leaf, allowedLinks = [1n]) {
  const directory = await revalidatePinnedRootV1(root);
  const path = leafPathV1(directory, leaf);
  const fh = await fsOpen(path, FS.O_RDONLY | FS.O_NOFOLLOW | FS.O_NONBLOCK);
  try {
    const before = await fh.stat({ bigint: true });
    assertPrivateFileStatV1(before, leaf, allowedLinks);
    if (before.size < 1n || before.size > BigInt(MAX_CAPSULE_BYTES)) fail(`${leaf} byte length is out of bounds`);
    const bytes = Buffer.alloc(Number(before.size));
    let position = 0;
    while (position < bytes.length) {
      const { bytesRead } = await fh.read(bytes, position, bytes.length - position, position);
      if (bytesRead === 0) fail(`${leaf} ended before declared size`);
      position += bytesRead;
    }
    const after = await fh.stat({ bigint: true });
    for (const key of ['dev','ino','size','mtimeNs','ctimeNs','nlink']) {
      if (before[key] !== after[key]) fail(`${leaf} changed during read`);
    }
    let value;
    try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { fail(`${leaf} is not valid UTF-8 JSON`); }
    const canonicalBytes = Buffer.from(`${canonicalJsonV1(value)}\n`, 'utf8');
    if (!bytes.equals(canonicalBytes)) fail(`${leaf} bytes are not exact canonical JSON`);
    const visible = await fsLstat(path, { bigint: true });
    assertPrivateFileStatV1(visible, `visible ${leaf}`, allowedLinks);
    if (visible.dev !== after.dev || visible.ino !== after.ino) fail(`visible ${leaf} generation differs from generation read`);
    await revalidatePinnedRootV1(root);
    return { value, bytes, stat: after };
  } finally { await fh.close().catch(() => {}); }
}
function validateCapsuleV1(raw, binding, acceptedDigest) {
  exactKeysV1(raw, [
    'marker','version','operation_id','logical_operation_intent_digest','logical_work_digest',
    'registry_sha256','request_body_sha256','result_digest','result',
  ], 'accepted result capsule');
  if (raw.marker !== CAPSULE_MARKER || raw.version !== 1) fail('accepted result capsule marker/version is invalid');
  if (raw.operation_id !== binding.operationId
      || raw.logical_operation_intent_digest !== binding.logicalOperationIntentDigest
      || raw.logical_work_digest !== binding.logicalWorkDigest
      || raw.registry_sha256 !== binding.registrySha256
      || raw.request_body_sha256 !== binding.requestBodySha256) fail('accepted result capsule binding mismatch');
  if (!HEX64.test(String(raw.result_digest ?? '')) || raw.result_digest !== acceptedDigest) fail('accepted result capsule digest mismatch');
  const result = assertAcceptedResultCapacityV1(raw.result).value;
  if (acceptedResultDigestV1(result) !== raw.result_digest) fail('accepted result capsule payload does not recompute to its digest');
  return Object.freeze({ resultDigest: raw.result_digest, value: result });
}
function capsuleBytesV1(binding, resultDigest, rawValue) {
  if (!HEX64.test(String(resultDigest ?? ''))) fail('resultDigest must be lowercase sha256 hex');
  const result = assertAcceptedResultCapacityV1(rawValue).value;
  if (acceptedResultDigestV1(result) !== resultDigest) fail('accepted result digest does not bind exact payload');
  const capsule = Object.freeze({
    marker: CAPSULE_MARKER, version: 1,
    operation_id: binding.operationId,
    logical_operation_intent_digest: binding.logicalOperationIntentDigest,
    logical_work_digest: binding.logicalWorkDigest,
    registry_sha256: binding.registrySha256,
    request_body_sha256: binding.requestBodySha256,
    result_digest: resultDigest,
    result,
  });
  const bytes = Buffer.from(`${canonicalJsonV1(capsule)}\n`, 'utf8');
  if (bytes.length < 1 || bytes.length > MAX_CAPSULE_BYTES) fail(`accepted result capsule exceeds ${MAX_CAPSULE_BYTES} bytes`);
  return { bytes };
}
async function assertLeafAbsentV1(directory, leaf, label) {
  const st = await lstatOrNullV1(leafPathV1(directory, leaf));
  if (st !== null) fail(`${label} already exists before provider admission`);
}
export async function assertAcceptedResultCapsuleAbsentV1(root, rawBinding) {
  const binding = validateAcceptedResultBindingV1(rawBinding);
  const directory = await revalidatePinnedRootV1(root);
  await assertLeafAbsentV1(directory, finalLeafV1(binding.operationId), 'accepted result capsule final');
  await assertLeafAbsentV1(directory, stageLeafV1(binding.operationId), 'accepted result capsule stage');
  return true;
}

const FAULT_POINTS = new Set([
  'duringStageWrite','afterStageWrite','afterStageSync','afterStageDirSync','afterFinalLink',
  'afterFinalDirSync','afterStageUnlink','afterCleanupDirSync','beforeReadback',
]);
function parseProofHooksV1(raw) {
  if (raw === null || raw === undefined) return null;
  if (!isPlainObjectV1(raw) || Object.keys(raw).sort().join(',') !== 'faultAt') fail('capsule proof hooks may contain exactly faultAt');
  if (!FAULT_POINTS.has(raw.faultAt)) fail('capsule proof fault point is invalid');
  return raw.faultAt;
}
function faultV1(selected, point) { if (selected === point) fail(`synthetic accepted-capsule fault at ${point}`); }

export async function publishAcceptedResultCapsuleV1(root, rawBinding, resultDigest, rawValue, proofHooks = null) {
  const binding = validateAcceptedResultBindingV1(rawBinding);
  const { bytes } = capsuleBytesV1(binding, resultDigest, rawValue);
  const directory = await revalidatePinnedRootV1(root);
  const stageLeaf = stageLeafV1(binding.operationId);
  const finalLeaf = finalLeafV1(binding.operationId);
  const stagePath = leafPathV1(directory, stageLeaf);
  const finalPath = leafPathV1(directory, finalLeaf);
  const selectedFault = parseProofHooksV1(proofHooks);
  let fh = null, created = null, stageDurable = false, finalLinked = false;
  try {
    fh = await fsOpen(stagePath, FS.O_WRONLY | FS.O_CREAT | FS.O_EXCL | FS.O_NOFOLLOW, 0o600);
    created = await fh.stat({ bigint: true });
    assertPrivateFileStatV1(created, 'new accepted result stage');
    let written = 0;
    while (written < bytes.length) {
      let requested = bytes.length - written;
      if (selectedFault === 'duringStageWrite' && written === 0) {
        requested = Math.max(1, Math.floor(requested / 2));
      }
      const { bytesWritten } = await fh.write(bytes, written, requested, written);
      if (bytesWritten <= 0) fail('accepted result stage short write');
      written += bytesWritten;
      if (selectedFault === 'duringStageWrite') {
        fail('synthetic accepted-capsule fault at duringStageWrite');
      }
    }
    faultV1(selectedFault, 'afterStageWrite');
    await fh.sync();
    faultV1(selectedFault, 'afterStageSync');
    await directory.sync();
    stageDurable = true;
    faultV1(selectedFault, 'afterStageDirSync');
    await fsLink(stagePath, finalPath);
    finalLinked = true;
    faultV1(selectedFault, 'afterFinalLink');
    await directory.sync();
    faultV1(selectedFault, 'afterFinalDirSync');
    await fsUnlink(stagePath);
    faultV1(selectedFault, 'afterStageUnlink');
    await directory.sync();
    faultV1(selectedFault, 'afterCleanupDirSync');
    await fh.close(); fh = null;
    faultV1(selectedFault, 'beforeReadback');
    const reread = await readCapsuleLeafV1(root, binding.operationId, finalLeaf, [1n]);
    if (!reread.bytes.equals(bytes)) fail('published accepted result capsule bytes differ');
    return validateCapsuleV1(reread.value, binding, resultDigest);
  } catch (error) {
    if (!stageDurable && !finalLinked && created !== null) {
      try {
        const visible = await fsLstat(stagePath, { bigint: true });
        if (visible.dev === created.dev && visible.ino === created.ino) {
          await fsUnlink(stagePath);
          await directory.sync();
        }
      } catch (cleanupError) {
        if (cleanupError?.code !== 'ENOENT') { /* denial-only residue; never authorize resend */ }
      }
    }
    throw error;
  } finally {
    if (fh) await fh.close().catch(() => {});
  }
}

export async function recoverAcceptedResultCapsuleCandidateV1(root, rawBinding) {
  const binding = validateAcceptedResultBindingV1(rawBinding);
  const directory = await revalidatePinnedRootV1(root);
  const stageLeaf = stageLeafV1(binding.operationId);
  const finalLeaf = finalLeafV1(binding.operationId);
  const stagePath = leafPathV1(directory, stageLeaf);
  const finalPath = leafPathV1(directory, finalLeaf);
  const finalStat = await lstatOrNullV1(finalPath);
  const stageStat = await lstatOrNullV1(stagePath);
  if (finalStat === null && stageStat === null) return null;

  if (finalStat === null) {
    const stageRead = await readCapsuleLeafV1(root, binding.operationId, stageLeaf, [1n]);
    const candidate = validateCapsuleV1(stageRead.value, binding, String(stageRead.value?.result_digest ?? ''));
    await fsLink(stagePath, finalPath);
    await directory.sync();
    await fsUnlink(stagePath);
    await directory.sync();
    const finalRead = await readCapsuleLeafV1(root, binding.operationId, finalLeaf, [1n]);
    const finalized = validateCapsuleV1(finalRead.value, binding, candidate.resultDigest);
    if (!finalRead.bytes.equals(stageRead.bytes)) fail('recovered final bytes differ from durable stage');
    return finalized;
  }

  const allowedLinks = finalStat.nlink === 2n ? [2n] : [1n];
  const finalRead = await readCapsuleLeafV1(root, binding.operationId, finalLeaf, allowedLinks);
  const candidate = validateCapsuleV1(finalRead.value, binding, String(finalRead.value?.result_digest ?? ''));
  if (finalRead.stat.nlink === 2n) {
    if (stageStat === null) fail('two-link accepted final has no reviewed stage name');
    const stageRead = await readCapsuleLeafV1(root, binding.operationId, stageLeaf, [2n]);
    if (stageRead.stat.dev !== finalRead.stat.dev || stageRead.stat.ino !== finalRead.stat.ino) fail('accepted final/stage generations differ');
    if (!stageRead.bytes.equals(finalRead.bytes)) fail('accepted final/stage bytes differ');
    await fsUnlink(stagePath);
    await directory.sync();
  } else if (stageStat !== null) {
    fail('foreign accepted-result stage exists beside final');
  }
  const strictFinal = await readCapsuleLeafV1(root, binding.operationId, finalLeaf, [1n]);
  return validateCapsuleV1(strictFinal.value, binding, candidate.resultDigest);
}

export async function readAcceptedResultCapsuleV1(root, ledgerDirectoryHandle, rawBinding) {
  const binding = validateAcceptedResultBindingV1(rawBinding);
  const records = await loadLedgerRecordsV1(ledgerDirectoryHandle);
  if (records.length === 0) return null;
  const state = replayBrokerStateFromLedgerV1(records);
  if (state.phase !== BROKER_STATE_V1.ACCEPTED) return null;
  const head = records[0];
  if (head.operationId !== binding.operationId
      || head.logicalOperationIntentDigest !== binding.logicalOperationIntentDigest
      || head.logicalWorkDigest !== binding.logicalWorkDigest) fail('durable ACCEPTED ledger does not match requested binding');
  if (!HEX64.test(String(state.acceptedDigest ?? ''))) fail('durable ACCEPTED digest is invalid');
  const read = await readCapsuleLeafV1(root, binding.operationId, finalLeafV1(binding.operationId), [1n]);
  return validateCapsuleV1(read.value, binding, state.acceptedDigest);
}
