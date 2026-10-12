import { loadLedgerRecordsV1 } from './apollyon_execution_ledger_load_v1.mjs';
import { replayBrokerStateFromLedgerV1 } from './apollyon_execution_broker_replay_v1.mjs';
import { appendBrokerAuthorizedRecordV1 } from './apollyon_execution_broker_authorized_append_v1.mjs';
import { BROKER_STATE_V1 } from './apollyon_execution_broker_v1.mjs';
import { LEDGER_EVENT_V1, makeLedgerRecordV1 } from './apollyon_execution_ledger_record_v1.mjs';

const ZERO_SHA256 = '0'.repeat(64);
const HEX64 = /^[0-9a-f]{64}$/;
const OPERATION_ID = /^apollyon_op_v1:[0-9a-f]{64}$/;

function fail(message) {
  throw new Error(`VOID_APOLLYON_EXECUTION_BROKER_PREPARE_V1: ${message}`);
}

function exactKeys(value, expected, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object`);
  const actual = Object.keys(value).sort().join(',');
  const wanted = [...expected].sort().join(',');
  if (actual !== wanted) fail(`${name} has unexpected fields`);
}

function validateBinding(binding) {
  exactKeys(binding, [
    'operationId',
    'logicalOperationIntentDigest',
    'logicalWorkDigest',
    'registrySha256',
    'requestBodySha256',
  ], 'binding');
  if (!OPERATION_ID.test(String(binding.operationId ?? ''))) fail('binding operationId is invalid');
  for (const key of [
    'logicalOperationIntentDigest', 'logicalWorkDigest', 'registrySha256', 'requestBodySha256',
  ]) {
    if (!HEX64.test(String(binding[key] ?? ''))) fail(`binding ${key} is invalid`);
  }
  return Object.freeze({
    operationId: binding.operationId,
    logicalOperationIntentDigest: binding.logicalOperationIntentDigest,
    logicalWorkDigest: binding.logicalWorkDigest,
    registrySha256: binding.registrySha256,
    requestBodySha256: binding.requestBodySha256,
  });
}

function assertBindMatches(record, binding) {
  if (!record || record.type !== LEDGER_EVENT_V1.BIND_INTENT || record.sequence !== 0) {
    fail('ledger does not begin with exact BIND_INTENT sequence 0');
  }
  if (record.previousRecordSha256 !== ZERO_SHA256) fail('BIND_INTENT previous hash is invalid');
  if (record.operationId !== binding.operationId
      || record.logicalOperationIntentDigest !== binding.logicalOperationIntentDigest
      || record.logicalWorkDigest !== binding.logicalWorkDigest) {
    fail('durable BIND_INTENT does not match requested operation/intent/work binding');
  }
}

function makeRecord(type, sequence, previousRecordSha256, binding) {
  return makeLedgerRecordV1({
    type,
    operationId: binding.operationId,
    logicalOperationIntentDigest: binding.logicalOperationIntentDigest,
    logicalWorkDigest: binding.logicalWorkDigest,
    sequence,
    previousRecordSha256,
    resultDigest: null,
  });
}

export async function prepareBrokerOperationV1(directoryHandle, rawBinding) {
  const binding = validateBinding(rawBinding);
  let createdBind = false;
  let createdReserve = false;
  let records = await loadLedgerRecordsV1(directoryHandle);

  if (records.length === 0) {
    const bind = makeRecord(LEDGER_EVENT_V1.BIND_INTENT, 0, ZERO_SHA256, binding);
    await appendBrokerAuthorizedRecordV1(directoryHandle, bind);
    createdBind = true;
    records = await loadLedgerRecordsV1(directoryHandle);
  }

  if (records.length < 1) fail('durable BIND_INTENT disappeared after preparation');
  assertBindMatches(records[0], binding);

  let state = replayBrokerStateFromLedgerV1(records);
  if (records.length === 1) {
    if (state.phase !== BROKER_STATE_V1.ABSENT) fail('BIND-only ledger did not replay to ABSENT');
    const reserve = makeRecord(
      LEDGER_EVENT_V1.RESERVE,
      1,
      records[0].recordSha256,
      binding,
    );
    await appendBrokerAuthorizedRecordV1(directoryHandle, reserve);
    createdReserve = true;
    records = await loadLedgerRecordsV1(directoryHandle);
    assertBindMatches(records[0], binding);
    state = replayBrokerStateFromLedgerV1(records);
  }

  if (state.phase !== BROKER_STATE_V1.RESERVED) {
    fail(`broker preparation requires RESERVED phase; durable phase is ${String(state.phase)}`);
  }
  if (records.length !== 2 || records[1]?.type !== LEDGER_EVENT_V1.RESERVE || records[1]?.sequence !== 1) {
    fail('RESERVED ledger must contain exactly BIND_INTENT then RESERVE');
  }
  if (records[1].operationId !== binding.operationId
      || records[1].logicalOperationIntentDigest !== binding.logicalOperationIntentDigest
      || records[1].logicalWorkDigest !== binding.logicalWorkDigest
      || records[1].previousRecordSha256 !== records[0].recordSha256) {
    fail('durable RESERVE does not match exact operation/intent/work binding');
  }

  return Object.freeze({
    operationId: binding.operationId,
    phase: BROKER_STATE_V1.RESERVED,
    ledgerLength: records.length,
    bindRecordSha256: records[0].recordSha256,
    reserveRecordSha256: records[1].recordSha256,
    createdBind,
    createdReserve,
  });
}
