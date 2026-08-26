const REQUEST_MARKER = 'VOID_APOLLYON_OPENROUTER_BROKER_REQUEST_V1';
const RESPONSE_MARKER = 'VOID_APOLLYON_OPENROUTER_BROKER_RESPONSE_V1';
const REQUEST_ID = /^voidobr1_[0-9a-f]{64}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const OPERATION_ID = /^apollyon_op_v1:[0-9a-f]{64}$/;
const MAX_WIRE_BYTES = 4 * 1024 * 1024;
const MAX_REQUEST_BODY_BYTES = 3 * 1024 * 1024;
const MAX_CONTESTANT_BYTES = 256 * 1024;
const HOLD_CODES = new Set([
  'INVALID_REQUEST',
  'BUSY',
  'UNCERTAIN_OR_TERMINAL',
  'PROVIDER_HOLD',
  'ADMISSION_HOLD',
  'INTERNAL_HOLD',
]);

function fail(message) {
  throw new Error(`VOID_APOLLYON_OPENROUTER_BROKER_IPC_PROTOCOL_V1: ${message}`);
}

function exactKeys(value, expected, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
  const actual = Object.keys(value).sort().join(',');
  const wanted = [...expected].sort().join(',');
  if (actual !== wanted) fail(`${name} has unexpected fields`);
}

function snapshotJson(value, name, depth = 0) {
  if (depth > 24) fail(`${name} exceeds maximum nesting depth`);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(`${name} contains a non-finite number`);
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 512) fail(`${name} array exceeds maximum length`);
    return Object.freeze(value.map((entry) => snapshotJson(entry, name, depth + 1)));
  }
  if (!value || typeof value !== 'object') fail(`${name} contains a non-JSON value`);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(`${name} contains a non-plain object`);
  const keys = Object.keys(value);
  if (keys.length > 512) fail(`${name} object exceeds maximum key count`);
  const out = {};
  for (const key of keys) out[key] = snapshotJson(value[key], name, depth + 1);
  return Object.freeze(out);
}

function canonicalize(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
  return out;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function utf8Bytes(text) {
  return Buffer.byteLength(text, 'utf8');
}

function decodeOneLine(bytes, name) {
  if (!(bytes instanceof Uint8Array) && !Buffer.isBuffer(bytes)) fail(`${name} must be bytes`);
  if (bytes.byteLength < 2 || bytes.byteLength > MAX_WIRE_BYTES) fail(`${name} byte length is invalid`);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`${name} must be valid UTF-8`);
  }
  if (!text.endsWith('\n') || text.slice(0, -1).includes('\n') || text.includes('\r')) {
    fail(`${name} must contain exactly one LF-terminated JSON line`);
  }
  try {
    return JSON.parse(text.slice(0, -1));
  } catch {
    fail(`${name} must contain valid JSON`);
  }
}

function encodeOneLine(value, name) {
  const text = `${canonicalJson(value)}\n`;
  if (utf8Bytes(text) > MAX_WIRE_BYTES) fail(`${name} exceeds wire byte ceiling`);
  return Buffer.from(text, 'utf8');
}

function validateRequestValue(raw) {
  exactKeys(raw, [
    'marker',
    'version',
    'request_id',
    'logical_operation_intent_digest',
    'registry_sha256',
    'request_body',
    'contestant',
    'timeout_ms',
  ], 'request');
  if (raw.marker !== REQUEST_MARKER || raw.version !== 1) fail('request marker/version is invalid');
  if (!REQUEST_ID.test(String(raw.request_id ?? ''))) fail('request_id is invalid');
  if (!HEX64.test(String(raw.logical_operation_intent_digest ?? ''))) fail('logical_operation_intent_digest is invalid');
  if (!HEX64.test(String(raw.registry_sha256 ?? ''))) fail('registry_sha256 is invalid');
  if (!Number.isSafeInteger(raw.timeout_ms) || raw.timeout_ms < 1000 || raw.timeout_ms > 300000) {
    fail('timeout_ms is invalid');
  }
  const requestBody = snapshotJson(raw.request_body, 'request_body');
  const contestant = snapshotJson(raw.contestant, 'contestant');
  if (utf8Bytes(canonicalJson(requestBody)) > MAX_REQUEST_BODY_BYTES) fail('request_body exceeds byte ceiling');
  if (utf8Bytes(canonicalJson(contestant)) > MAX_CONTESTANT_BYTES) fail('contestant exceeds byte ceiling');
  return Object.freeze({
    marker: REQUEST_MARKER,
    version: 1,
    request_id: raw.request_id,
    logical_operation_intent_digest: raw.logical_operation_intent_digest,
    registry_sha256: raw.registry_sha256,
    request_body: requestBody,
    contestant,
    timeout_ms: raw.timeout_ms,
  });
}

function validateResponseValue(raw) {
  exactKeys(raw, [
    'marker',
    'version',
    'request_id',
    'status',
    'operation_id',
    'result_digest',
    'result',
    'hold_code',
  ], 'response');
  if (raw.marker !== RESPONSE_MARKER || raw.version !== 1) fail('response marker/version is invalid');
  if (!REQUEST_ID.test(String(raw.request_id ?? ''))) fail('response request_id is invalid');
  if (!['ACCEPTED', 'HOLD'].includes(raw.status)) fail('response status is invalid');

  if (raw.status === 'ACCEPTED') {
    if (!OPERATION_ID.test(String(raw.operation_id ?? ''))) fail('accepted response operation_id is invalid');
    if (!HEX64.test(String(raw.result_digest ?? ''))) fail('accepted response result_digest is invalid');
    if (raw.hold_code !== null) fail('accepted response hold_code must be null');
    const result = snapshotJson(raw.result, 'response result');
    return Object.freeze({
      marker: RESPONSE_MARKER,
      version: 1,
      request_id: raw.request_id,
      status: 'ACCEPTED',
      operation_id: raw.operation_id,
      result_digest: raw.result_digest,
      result,
      hold_code: null,
    });
  }

  if (raw.operation_id !== null && !OPERATION_ID.test(String(raw.operation_id))) {
    fail('HOLD response operation_id is invalid');
  }
  if (raw.result_digest !== null || raw.result !== null) fail('HOLD response cannot contain result material');
  if (!HOLD_CODES.has(raw.hold_code)) fail('HOLD response code is invalid');
  return Object.freeze({
    marker: RESPONSE_MARKER,
    version: 1,
    request_id: raw.request_id,
    status: 'HOLD',
    operation_id: raw.operation_id,
    result_digest: null,
    result: null,
    hold_code: raw.hold_code,
  });
}

export function encodeBrokerRequestV1(value) {
  return encodeOneLine(validateRequestValue(value), 'request');
}

export function decodeBrokerRequestV1(bytes) {
  return validateRequestValue(decodeOneLine(bytes, 'request'));
}

export function encodeBrokerResponseV1(value) {
  return encodeOneLine(validateResponseValue(value), 'response');
}

export function decodeBrokerResponseV1(bytes) {
  return validateResponseValue(decodeOneLine(bytes, 'response'));
}
