// VOID_OX_ALPHA_OPENROUTER_BROKER_BINDING_V8_5 - source-only OpenRouter broker binding.
// PURE synchronous deterministic module: no fs/network/process/env/time/random access.
// SAFETY: binds ONE caller-supplied trusted logicalOperationIntentDigest to the exact
// immutable provider work. This module NEVER mints, rotates, or replaces the trusted
// intent digest; transient attempt metadata (timeoutMs, apiKey, trial_id, admission_id,
// nonce, pid, clock time, retry counters, provider request ids) is deliberately absent
// from every identity and digest computed here.
import { createHash } from 'node:crypto';
import { apollyonOperationIdV1 } from './apollyon_execution_broker_v1.mjs';

const MODULE_ID = 'VOID_OX_ALPHA_OPENROUTER_BROKER_BINDING_V8_5';
const WORK_MARKER = 'VOID_APOLLYON_OPENROUTER_LOGICAL_WORK_V1';
const INPUT_KEYS = ['logicalOperationIntentDigest', 'registrySha256', 'requestBody', 'contestant'];
const HEX64 = /^[0-9a-f]{64}$/;
const MAX_DEPTH = 24;
const MAX_CONTAINER_ENTRIES = 512;
const MAX_REQUEST_BODY_BYTES = 3 * 1024 * 1024;
const MAX_CONTESTANT_BYTES = 256 * 1024;

function fail(message) { throw new TypeError(`${MODULE_ID}: ${message}`); }

function isPlainObjectV1(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function sha256HexV1(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

// SAFETY: canonical JSON recursively sorts object keys and preserves array order;
// finite numbers only; output is byte-deterministic for identical logical work.
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

// SAFETY: bounded JSON-only deep snapshot performed BEFORE any hashing; every container
// is copied and frozen so no caller object reference is retained and later caller
// mutation cannot influence any digest returned by this module.
function snapshotJsonValueV1(value, label, depth) {
  if (depth > MAX_DEPTH) fail(`${label} exceeds maximum nesting depth ${MAX_DEPTH}`);
  if (value === null) return null;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') {
    if (!Number.isFinite(value)) fail(`${label} contains a non-finite number`);
    return value;
  }
  if (type !== 'object') fail(`${label} contains a non-JSON ${type} value`);
  if (Array.isArray(value)) {
    if (value.length > MAX_CONTAINER_ENTRIES) fail(`${label} array exceeds ${MAX_CONTAINER_ENTRIES} entries`);
    return Object.freeze(value.map((entry) => snapshotJsonValueV1(entry, label, depth + 1)));
  }
  if (!isPlainObjectV1(value)) fail(`${label} contains a non-plain object`);
  const keys = Object.keys(value);
  if (keys.length > MAX_CONTAINER_ENTRIES) fail(`${label} object exceeds ${MAX_CONTAINER_ENTRIES} keys`);
  if (Reflect.ownKeys(value).length !== keys.length) fail(`${label} contains symbol-keyed or non-enumerable-owned data`);
  const out = {};
  for (const key of keys) out[key] = snapshotJsonValueV1(value[key], label, depth + 1);
  return Object.freeze(out);
}

export function buildOpenRouterBrokerBindingV1(input) {
  if (!isPlainObjectV1(input)) fail('input must be a plain object');
  const actualKeys = Object.keys(input).sort();
  const expectedKeys = [...INPUT_KEYS].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    fail(`input must contain exactly: ${expectedKeys.join(',')}`);
  }
  const { logicalOperationIntentDigest, registrySha256, requestBody, contestant } = input;
  if (typeof logicalOperationIntentDigest !== 'string' || !HEX64.test(logicalOperationIntentDigest)) {
    fail('logicalOperationIntentDigest must be lowercase 64-hex');
  }
  if (typeof registrySha256 !== 'string' || !HEX64.test(registrySha256)) {
    fail('registrySha256 must be lowercase 64-hex');
  }
  // SAFETY: deep-snapshot both JSON inputs before any hashing; caller references dropped.
  const bodySnapshot = snapshotJsonValueV1(requestBody, 'requestBody', 0);
  const contestantSnapshot = snapshotJsonValueV1(contestant, 'contestant', 0);
  const bodyCanonical = canonicalJsonV1(bodySnapshot);
  const contestantCanonical = canonicalJsonV1(contestantSnapshot);
  if (Buffer.byteLength(bodyCanonical, 'utf8') > MAX_REQUEST_BODY_BYTES) fail('requestBody exceeds the 3 MiB canonical ceiling');
  if (Buffer.byteLength(contestantCanonical, 'utf8') > MAX_CONTESTANT_BYTES) fail('contestant exceeds the 256 KiB canonical ceiling');
  // SAFETY: exact immutable logical work payload; only stable logical work enters here.
  const workPayload = Object.freeze({
    marker: WORK_MARKER,
    registry_sha256: registrySha256,
    request_body: bodySnapshot,
    contestant: contestantSnapshot,
  });
  const logicalWorkDigest = sha256HexV1(
    Buffer.concat([Buffer.from(`${WORK_MARKER}\0`, 'utf8'), Buffer.from(canonicalJsonV1(workPayload), 'utf8')])
  );
  // Audit-comparison digest of the exact request-body work bytes; never the operation id.
  const requestBodySha256 = sha256HexV1(Buffer.from(bodyCanonical, 'utf8'));
  // SAFETY: stable intent identity derives ONLY from the coordinator-supplied durable
  // digest via the broker core helper; this module creates or rotates no such identity.
  const operationId = apollyonOperationIdV1({ logicalOperationIntentDigest });
  return Object.freeze({
    operationId,
    logicalOperationIntentDigest,
    logicalWorkDigest,
    registrySha256,
    requestBodySha256,
  });
}
