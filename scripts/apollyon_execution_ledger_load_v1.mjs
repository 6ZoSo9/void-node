// VOID_OX_ALPHA_LEDGER_LOAD_RECOVERY_V7_1B - deterministic ledger bytes plus fail-closed load/recovery.
// Scope: source-only. NO execution, retry, reclaim, provider-send, reservation, admission, or mutation
// authority is defined, granted, or implied here; a verified chain is structural/binding proof only and
// the V5.x broker reducer stays the sole transition-authority reducer. Recovery treats every visible
// published record as crash evidence: nothing is deleted, repaired, truncated, skipped, renamed,
// overwritten, quarantined, or synthesized; any anomaly throws/HOLDs with no automatic retry.
// Cross-process single-writer serialization is explicitly deferred to V7.2. Linux-only; enumeration is
// strictly read-only through /proc/self/fd/<pinned-dir-fd> and no rootPath is ever re-resolved here.
import { readPublishedRecordBytesV1 } from './apollyon_execution_ledger_publish_v1.mjs';
import { verifyLedgerRecordV1, verifyLedgerChainV1 } from './apollyon_execution_ledger_record_v1.mjs';
import { readdir } from 'node:fs/promises';

const MODULE_ID = 'VOID_OX_ALPHA_LEDGER_LOAD_RECOVERY_V7_1B';
const MAX_RECORD_BYTES = 256 * 1024;
const RECORD_NAME = /^record-[0-9]{16}\.json$/;

function fail(message) { throw new Error(`${MODULE_ID}: ${message}`); }
function currentEffectiveUidV1() {
  if (typeof process.geteuid !== 'function') fail('process.geteuid is required and missing');
  const uid = process.geteuid();
  if (!Number.isSafeInteger(uid) || uid < 0) fail('process.geteuid returned an invalid effective UID');
  return uid;
}
function requireLinuxV1() { if (process.platform !== 'linux') fail('ledger load supports Linux only'); }

// Exactly the eight persisted fields, in this exact insertion order (never sorted, never pretty-printed).
function eightFieldCopyV1(record) {
  return {
    type: record.type,
    operationId: record.operationId,
    logicalOperationIntentDigest: record.logicalOperationIntentDigest,
    logicalWorkDigest: record.logicalWorkDigest,
    sequence: record.sequence,
    previousRecordSha256: record.previousRecordSha256,
    resultDigest: record.resultDigest,
    recordSha256: record.recordSha256,
  };
}

export function encodeLedgerRecordBytesV1(record) {
  verifyLedgerRecordV1(record);
  return Buffer.from(JSON.stringify(eightFieldCopyV1(record)) + '\n', 'utf8');
}

const STRICT_UTF8 = new TextDecoder('utf8', { fatal: true });

export function decodeLedgerRecordBytesV1(bytes) {
  if (!(bytes instanceof Uint8Array)) fail('record bytes must be a Buffer or Uint8Array');
  if (bytes.length < 1 || bytes.length > MAX_RECORD_BYTES) fail('record bytes must carry 1..256KiB');
  const stored = Buffer.from(bytes); // independent copy; later caller mutation cannot affect this decode
  let text;
  try { text = STRICT_UTF8.decode(stored); } catch { fail('record bytes are not strictly valid UTF-8'); }
  let parsed;
  try { parsed = JSON.parse(text); } catch { fail('record bytes are not exactly one JSON document'); }
  verifyLedgerRecordV1(parsed);
  if (!encodeLedgerRecordBytesV1(parsed).equals(stored)) {
    fail('record bytes are not canonical (key set/order, whitespace, duplicate keys, UTF-8 form, or trailing bytes)');
  }
  return Object.freeze(eightFieldCopyV1(parsed));
}

function assertPinnedDirectoryObjectV1(directoryHandle) {
  if (directoryHandle === null || typeof directoryHandle !== 'object' || Array.isArray(directoryHandle)) {
    fail('directoryHandle must be the pinned object returned by openPinnedLedgerDirectoryV1');
  }
  const handle = directoryHandle.handle;
  if (!handle || typeof handle.fd !== 'number' ||
      typeof handle.stat !== 'function' || typeof handle.sync !== 'function') {
    fail('pinned FileHandle is missing or unsuitable');
  }
  return handle; // the ONLY fd authority; any separately supplied fd field is ignored entirely
}

async function assertPinnedIdentityV1(directoryHandle) {
  requireLinuxV1();
  const handle = assertPinnedDirectoryObjectV1(directoryHandle);
  const stat = await handle.stat({ bigint: true });
  if (!stat.isDirectory()) fail('pinned handle does not refer to a directory');
  if (stat.dev !== directoryHandle.dev || stat.ino !== directoryHandle.ino) fail('pinned directory dev/ino drifted');
  if ((Number(stat.mode) & 0o7777) !== 0o700) fail('pinned directory mode is not exactly 0700');
  if (Number(stat.uid) !== currentEffectiveUidV1()) fail('pinned directory is not owned by the effective UID');
  return handle;
}

// Full observable generation of the pinned directory; compared before and after the entire load window.
function generationStampV1(stat) {
  return [stat.dev, stat.ino, stat.uid, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs];
}
function sameGenerationV1(a, b) { return a.every((value, index) => value === b[index]); }

async function enumerateV1(handle) {
  return readdir(`/proc/self/fd/${handle.fd}`, { withFileTypes: true, encoding: 'utf8' });
}

// Every visible entry must be a regular file named record-[0-9]{16}.json; anything else fails closed.
function parseVisibleRecordsV1(entries) {
  const visible = [];
  for (const entry of entries) {
    if (!entry.isFile()) fail(`visible entry is not a regular file: ${entry.name}`);
    if (!RECORD_NAME.test(entry.name)) fail(`unexpected visible entry name: ${entry.name}`);
    const sequence = Number(entry.name.slice(7, 23)); // the 16 decimal digits
    if (!Number.isSafeInteger(sequence) || sequence < 0) fail(`filename sequence is not a safe integer: ${entry.name}`);
    visible.push({ name: entry.name, sequence });
  }
  visible.sort((a, b) => a.sequence - b.sequence); // numeric comparison only; never localeCompare
  for (let index = 0; index < visible.length; index++) {
    if (visible[index].sequence !== index) fail(`record names must be contiguous 0..N with no hole (at index ${index})`);
  }
  return visible;
}

export async function loadLedgerRecordsV1(directoryHandle) {
  const handle = await assertPinnedIdentityV1(directoryHandle);
  const before = await handle.stat({ bigint: true }); // generation snapshot taken before enumeration
  const expected = parseVisibleRecordsV1(await enumerateV1(handle));
  const records = [];
  for (const { sequence } of expected) {
    const record = decodeLedgerRecordBytesV1(await readPublishedRecordBytesV1(directoryHandle, sequence));
    if (record.sequence !== sequence) fail(`decoded sequence ${record.sequence} does not match filename sequence ${sequence}`);
    records.push(record); // already frozen by decode
  }
  const after = await handle.stat({ bigint: true }); // generation snapshot after loading
  if (!sameGenerationV1(generationStampV1(before), generationStampV1(after))) {
    fail('ledger directory generation changed during load (dev/ino/uid/mode/size/mtimeNs/ctimeNs drift)');
  }
  const reread = parseVisibleRecordsV1(await enumerateV1(handle)); // mandatory second enumeration
  if (reread.length !== expected.length ||
      expected.some((item, index) => reread[index].name !== item.name)) {
    fail('the visible filename set changed during load');
  }
  if (records.length > 0) verifyLedgerChainV1(records); // structural/binding proof; confers no authority
  return Object.freeze(records); // empty directory legitimately freezes to []
}
