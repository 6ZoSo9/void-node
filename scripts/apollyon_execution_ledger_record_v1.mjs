// VOID Apollyon execution ledger record core v6.2 - pure record/hash-chain ESM.
// Purity: node:crypto only; no fs, network, env/process, timers, child_process,
// services, wallets, validator/chain runtimes, provider calls, credentials, or
// dependencies; no filesystem I/O; no clocks or randomness (fully deterministic).
// AUTHORITY INVARIANT: verification is structural/binding proof only and never
// grants reclaim, retry, or provider-execution authority; the verified broker
// state machine remains the sole transition-authority reducer. This module never
// mints operationIds; identity derivation stays broker-side.
// Attempt/envelope concepts (trial/admission ids, timestamps, nonces, max_tokens,
// pid, lease, retry, timeout, epoch/fence, process identity, provider request
// id) are excluded by closed key schemas and explicitly rejected by name below.
import { createHash } from 'node:crypto';

export const LEDGER_EVENT_V1 = Object.freeze({
  BIND_INTENT: 'BIND_INTENT', RESERVE: 'RESERVE',
  PROVIDER_ADMITTED: 'PROVIDER_ADMITTED', RESULT_WITNESSED: 'RESULT_WITNESSED',
  PROVIDER_RESULT: 'PROVIDER_RESULT', RECONCILE_BLOCKED: 'RECONCILE_BLOCKED',
});

const EVENTS = new Set(Object.values(LEDGER_EVENT_V1));
const SCHEMA = 'apollyon_execution_ledger_record_v1'; // body-domain tag, not a record field
const HEX64 = /^[0-9a-f]{64}$/; // lowercase-only by construction
const OPID = /^apollyon_op_v1:[0-9a-f]{64}$/;
const ZERO_HASH = '0'.repeat(64);
const fail = (m) => { throw new TypeError(m); };
const sha256Hex = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const isHex64 = (v) => typeof v === 'string' && HEX64.test(v);

// Closed maker-input schema: exactly these seven keys; anything else rejects.
const INPUT_KEYS = new Set([
  'type', 'operationId', 'logicalOperationIntentDigest', 'logicalWorkDigest',
  'sequence', 'previousRecordSha256', 'resultDigest',
]);
const RECORD_KEYS = new Set([...INPUT_KEYS, 'recordSha256']);

// Explicit denylist: named attempt/envelope concepts are refused outright even
// though the closed schemas already exclude them (defense in depth, clear errors).
const FORBIDDEN_KEYS = new Set([
  'admissionId', 'attempt', 'attemptId', 'epoch', 'fence', 'fenceToken', 'lease',
  'leaseId', 'maxTokens', 'nonce', 'pid', 'processId', 'providerRequestId',
  'retry', 'retryCount', 'timeout', 'timeoutMs', 'timestamp', 'trial', 'trialId',
]);

// Deterministic canonical text over already-validated value trees. Object keys
// sort by UTF-16 code units via plain Array#sort (locale-free, never
// localeCompare); strings escape via JSON.stringify; numbers are safe integers.
function canon(v) {
  if (v === null) return 'null';
  const t = typeof v;
  if (t === 'string') return JSON.stringify(v);
  if (t === 'number') {
    if (!Number.isSafeInteger(v)) fail('canonical numbers must be safe integers');
    return String(v);
  }
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (t === 'object') {
    const ks = Object.keys(v).sort();
    return '{' + ks.map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  }
  return fail('unsupported canonical value: ' + t);
}

// Exact-key gate: rejects wrong arity, unknown keys, and forbidden attempt/
// envelope keys by name, so envelope metadata cannot ride along on records.
function exactKeys(o, allowed, what) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) fail(what + ' object required');
  const ks = Object.keys(o);
  if (ks.length !== allowed.size) fail(what + ' key-count mismatch');
  for (const k of ks) {
    if (FORBIDDEN_KEYS.has(k)) fail(what + ' forbidden attempt/envelope key: ' + k);
    if (!allowed.has(k)) fail(what + ' unexpected key: ' + k);
  }
}

// Immutable binding triple carried identically by every record in a chain.
function assertBinding(operationId, intent, work, what) {
  if (typeof operationId !== 'string' || !OPID.test(operationId)) {
    fail(what + ': operationId must match apollyon_op_v1:<64 lowercase hex>');
  }
  if (!isHex64(intent)) fail(what + ': logicalOperationIntentDigest must be lowercase sha256 hex');
  if (!isHex64(work)) fail(what + ': logicalWorkDigest must be lowercase sha256 hex');
}

// Event placement and resultDigest rule: BIND_INTENT pinned to sequence 0 over
// 64 zeroes with null digest; RESULT_WITNESSED and PROVIDER_RESULT alone may
// carry a result digest. The witness is post-send authority but is not ACCEPTED.
function assertEventShape(type, sequence, previousRecordSha256, resultDigest, what) {
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    fail(what + ': sequence must be a safe non-negative integer');
  }
  if (!isHex64(previousRecordSha256)) fail(what + ': previousRecordSha256 must be lowercase sha256 hex');
  if (type === LEDGER_EVENT_V1.BIND_INTENT) {
    if (sequence !== 0) fail('BIND_INTENT must sit at sequence 0');
    if (previousRecordSha256 !== ZERO_HASH) fail('BIND_INTENT must chain from 64 zeroes');
    if (resultDigest !== null) fail('BIND_INTENT requires resultDigest=null');
    return;
  }
  if (sequence < 1) fail(type + ' must sit at sequence >= 1');
  if (type === LEDGER_EVENT_V1.RESULT_WITNESSED || type === LEDGER_EVENT_V1.PROVIDER_RESULT) {
    if (!isHex64(resultDigest)) fail(type + ' requires a lowercase sha256 resultDigest');
  } else if (resultDigest !== null) {
    fail(type + ' requires resultDigest=null');
  }
}

// Canonical body definition shared by maker and verifier so "the body" cannot
// drift apart between write and prove paths; the utf8 bytes of this text hash.
function bodyText(r) {
  return canon({
    schema: SCHEMA, type: r.type, operationId: r.operationId,
    logicalOperationIntentDigest: r.logicalOperationIntentDigest,
    logicalWorkDigest: r.logicalWorkDigest, sequence: r.sequence,
    previousRecordSha256: r.previousRecordSha256, resultDigest: r.resultDigest,
  });
}

// Build one immutable record; fails closed on any schema/format/placement
// violation. recordSha256 is always computed here, never accepted from input.
export function makeLedgerRecordV1(input) {
  exactKeys(input, INPUT_KEYS, 'ledger record input');
  if (!EVENTS.has(input.type)) fail('unknown ledger event type');
  assertBinding(input.operationId, input.logicalOperationIntentDigest, input.logicalWorkDigest, 'input');
  assertEventShape(input.type, input.sequence, input.previousRecordSha256, input.resultDigest, 'input');
  const base = {
    type: input.type, operationId: input.operationId,
    logicalOperationIntentDigest: input.logicalOperationIntentDigest,
    logicalWorkDigest: input.logicalWorkDigest, sequence: input.sequence,
    previousRecordSha256: input.previousRecordSha256, resultDigest: input.resultDigest,
  };
  return Object.freeze({ ...base, recordSha256: sha256Hex(bodyText(base)) });
}

// Single-record structural self-proof: exact schema, valid formats and event
// placement, and recordSha256 equal to the sha256 of the canonical body.
export function verifyLedgerRecordV1(record) {
  exactKeys(record, RECORD_KEYS, 'ledger record');
  if (!EVENTS.has(record.type)) fail('unknown ledger event type');
  assertBinding(record.operationId, record.logicalOperationIntentDigest, record.logicalWorkDigest, 'record');
  assertEventShape(record.type, record.sequence, record.previousRecordSha256, record.resultDigest, 'record');
  if (!isHex64(record.recordSha256)) fail('recordSha256 must be lowercase sha256 hex');
  if (sha256Hex(bodyText(record)) !== record.recordSha256) {
    fail('recordSha256 does not match the canonical body');
  }
  return true;
}

// Chain proof: non-empty; opens with BIND_INTENT at sequence 0 over 64 zeroes;
// contiguous integer sequences; intact previous-hash links; one immutable
// binding triple end to end. Logical-work drift under the same durable intent
// is a binding conflict and rejects here; it can never mint a fresh operation.
// Purely structural: confers no reclaim, retry, or provider-execution authority.
export function verifyLedgerChainV1(records) {
  if (!Array.isArray(records) || records.length === 0) fail('records must be a non-empty array');
  const head = records[0];
  verifyLedgerRecordV1(head);
  if (head.type !== LEDGER_EVENT_V1.BIND_INTENT || head.sequence !== 0 ||
      head.previousRecordSha256 !== ZERO_HASH) {
    fail('chain must open with BIND_INTENT at sequence 0 chained from 64 zeroes');
  }
  for (let i = 1; i < records.length; i++) {
    const r = records[i];
    verifyLedgerRecordV1(r);
    if (r.sequence !== i) fail('sequences must be contiguous integers from 0 (index ' + i + ')');
    if (r.previousRecordSha256 !== records[i - 1].recordSha256) {
      fail('broken previous-record hash link at index ' + i);
    }
    if (r.operationId !== head.operationId ||
        r.logicalOperationIntentDigest !== head.logicalOperationIntentDigest ||
        r.logicalWorkDigest !== head.logicalWorkDigest) {
      fail('binding conflict at index ' + i + ': durable intent or logical work drifted');
    }
  }
  return true;
}
