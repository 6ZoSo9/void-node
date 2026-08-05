#!/usr/bin/env node

import crypto from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

export const MARKER = "VOID_BUY_VOID_CRASH_CONSISTENT_FULFILLMENT_SAGA_V1";
export const SCHEMA = "void_buy_void_crash_consistent_fulfillment_saga_v1";
export const EVENT_SCHEMA = "void_buy_void_crash_consistent_fulfillment_saga_event_v1";
export const LEASE_SCHEMA = "void_buy_void_crash_consistent_fulfillment_saga_lease_v1";
export const SAGA_ID_PREFIX = "voidbvfsg1_";
export const EVENT_ID_PREFIX = "voidbvfsge1_";
export const ADVANCE_CONFIRMATION = "buyVoidAdvanceCrashConsistentFulfillmentSagaV1";

export const AUTHORITY = Object.freeze({
  source_only_contract: true,
  one_request_per_saga: true,
  one_payment_per_saga: true,
  one_execution_attempt_per_payment: true,
  per_request_lease_required: true,
  monotonically_increasing_fencing_token_required: true,
  append_only_hash_chain_required: true,
  prepared_transaction_hash_required_before_broadcast: true,
  no_automatic_rebroadcast_after_possible_broadcast: true,
  receipt_confirmation_required_before_closeout: true,
  caller_supplied_private_material_forbidden: true,
  caller_supplied_raw_signed_transaction_forbidden: true,
  background_loop: false,
  startup_execution: false,
  network_request: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  inventory_decrement: false,
  public_request_mutation: false,
  money_movement: false,
});

export const EVENT_TYPES = Object.freeze([
  "saga_initialized",
  "claim_committed",
  "inventory_reserved",
  "attempt_reserved",
  "transaction_prepared",
  "broadcast_not_attempted",
  "broadcast_unknown",
  "broadcast_accepted",
  "receipt_confirmed",
  "receipt_reverted",
  "closeout_committed",
  "terminal_hold",
]);

export const ACTION_CONFIRMATIONS = Object.freeze({
  claim_payment: "buyVoidSagaClaimPaymentV1",
  reserve_inventory: "buyVoidSagaReserveInventoryV1",
  reserve_execution_attempt: "buyVoidSagaReserveExecutionAttemptV1",
  prepare_transaction: "buyVoidSagaPrepareTransactionV1",
  execute_prepared_transaction: "buyVoidSagaExecutePreparedTransactionV1",
  reconcile_possible_broadcast: "buyVoidSagaReconcilePossibleBroadcastV1",
  closeout_confirmed_delivery: "buyVoidSagaCloseoutConfirmedDeliveryV1",
});

const SHA256 = /^[0-9a-f]{64}$/u;
const TX_HASH = /^0x[0-9a-f]{64}$/u;
const GIT_SHA = /^[0-9a-f]{40}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{3,200}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const EVENT_FILE = /^(\d{8})-(voidbvfsge1_[0-9a-f]{64})\.json$/u;
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const MAX_EVENTS = 64;
const MAX_LEASE_TTL_MS = 15 * 60 * 1000;

const FORBIDDEN_KEYS = new Set([
  "private_key",
  "privatekey",
  "mnemonic",
  "seed",
  "seed_phrase",
  "seedphrase",
  "raw_transaction",
  "raw_signed_transaction",
  "signed_transaction",
  "signedtransaction",
  "authorization",
  "authorization_header",
  "bearer_token",
  "credential",
  "credential_value",
  "secret",
  "password",
  "keystore",
  "wallet_file",
  "rpc_url",
  "rpcurl",
  "__proto__",
  "prototype",
  "constructor",
]);

function fail(message) {
  throw new Error(message);
}

function directObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label}_must_be_object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(`${label}_prototype_forbidden`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  const actual = Object.keys(directObject(value, label)).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label}_keys_mismatch`);
  }
}

function nonEmptyString(value, label, maximum = 4096) {
  if (typeof value !== "string" || value !== value.trim()) {
    fail(`${label}_must_be_trimmed_string`);
  }
  if (value.length < 1 || value.length > maximum) {
    fail(`${label}_length_out_of_range`);
  }
  return value;
}

function safeId(value, label) {
  const text = nonEmptyString(value, label, 200);
  if (!SAFE_ID.test(text)) fail(`${label}_invalid`);
  return text;
}

function sha256(value, label) {
  const text = nonEmptyString(value, label, 64);
  if (!SHA256.test(text)) fail(`${label}_invalid_sha256`);
  return text;
}

function gitSha(value, label) {
  const text = nonEmptyString(value, label, 40);
  if (!GIT_SHA.test(text)) fail(`${label}_invalid_git_sha`);
  return text;
}

function transactionHash(value, label) {
  const text = nonEmptyString(value, label, 66).toLowerCase();
  if (!TX_HASH.test(text)) fail(`${label}_invalid_transaction_hash`);
  return text;
}

function address(value, label) {
  const text = nonEmptyString(value, label, 42).toLowerCase();
  if (!ADDRESS.test(text)) fail(`${label}_invalid_address`);
  return text;
}

function decimal(value, label, { positive = false } = {}) {
  const text = String(value ?? "").trim();
  if (!DECIMAL.test(text)) fail(`${label}_invalid_decimal`);
  const parsed = BigInt(text);
  if (positive && parsed <= 0n) fail(`${label}_must_be_positive`);
  return text;
}

function safeInteger(value, minimum, maximum, label) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    fail(`${label}_out_of_range`);
  }
  return value;
}

function canonicalUtc(value, label) {
  const text = nonEmptyString(value, label, 24);
  if (!UTC.test(text)) fail(`${label}_must_be_utc_milliseconds`);
  const milliseconds = Date.parse(text);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== text) {
    fail(`${label}_invalid_utc`);
  }
  return text;
}

function normalizeKey(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9_]/gu, "");
}

export function assertNoSecretMaterialV1(value, path = "$", depth = 0) {
  if (depth > 24) fail(`${path}_maximum_depth_exceeded`);
  if (typeof value === "string") {
    if (/voidapwc1\.[A-Za-z0-9._:-]+\.[A-Za-z0-9_-]{16,}/u.test(value)) {
      fail(`${path}_raw_credential_forbidden`);
    }
    if (/^0x[0-9a-fA-F]{130,}$/u.test(value)) {
      fail(`${path}_raw_transaction_like_value_forbidden`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecretMaterialV1(entry, `${path}[${index}]`, depth + 1));
    return;
  }
  directObject(value, path);
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(normalizeKey(key))) {
      fail(`${path}.${key}_forbidden_key`);
    }
    assertNoSecretMaterialV1(nested, `${path}.${key}`, depth + 1);
  }
}

export function canonicalJsonV1(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJsonV1).join(",")}]`;
  directObject(value, "canonical_value");
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJsonV1(value[key])}`).join(",")}}`;
}

function digest(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function contentId(prefix, value, idKey) {
  const body = structuredClone(value);
  delete body[idKey];
  return `${prefix}${digest(canonicalJsonV1(body))}`;
}

export function validateSagaBindingV1(value) {
  exactKeys(value, [
    "request_id",
    "canonical_payment_identity",
    "request_key_sha256",
    "payment_key_sha256",
    "delivery_address",
    "void_amount_units",
    "chain_id",
    "pool_id",
  ], "binding");
  const binding = {
    request_id: safeId(value.request_id, "binding.request_id"),
    canonical_payment_identity: safeId(value.canonical_payment_identity, "binding.canonical_payment_identity"),
    request_key_sha256: sha256(value.request_key_sha256, "binding.request_key_sha256"),
    payment_key_sha256: sha256(value.payment_key_sha256, "binding.payment_key_sha256"),
    delivery_address: address(value.delivery_address, "binding.delivery_address"),
    void_amount_units: decimal(value.void_amount_units, "binding.void_amount_units", { positive: true }),
    chain_id: nonEmptyString(value.chain_id, "binding.chain_id", 16),
    pool_id: safeId(value.pool_id, "binding.pool_id"),
  };
  if (binding.chain_id !== "2050") fail("binding.chain_id_mismatch");
  assertNoSecretMaterialV1(binding, "binding");
  return binding;
}

export function computeSagaIdV1(binding) {
  return `${SAGA_ID_PREFIX}${digest(canonicalJsonV1(validateSagaBindingV1(binding)))}`;
}

function validatePayload(eventType, payload) {
  directObject(payload, "event.payload");
  assertNoSecretMaterialV1(payload, "event.payload");
  const commonAttempt = () => safeId(payload.attempt_id, "event.payload.attempt_id");

  if (eventType === "saga_initialized") {
    exactKeys(payload, ["source_floor_main", "policy_id", "max_attempts"], "event.payload");
    gitSha(payload.source_floor_main, "event.payload.source_floor_main");
    safeId(payload.policy_id, "event.payload.policy_id");
    if (payload.max_attempts !== 1) fail("event.payload.max_attempts_mismatch");
    return structuredClone(payload);
  }
  if (eventType === "claim_committed") {
    exactKeys(payload, ["claim_id", "instruction_id"], "event.payload");
    safeId(payload.claim_id, "event.payload.claim_id");
    safeId(payload.instruction_id, "event.payload.instruction_id");
    return structuredClone(payload);
  }
  if (eventType === "inventory_reserved") {
    exactKeys(payload, ["reservation_id"], "event.payload");
    sha256(payload.reservation_id, "event.payload.reservation_id");
    return structuredClone(payload);
  }
  if (eventType === "attempt_reserved") {
    exactKeys(payload, ["attempt_id", "attempt_number"], "event.payload");
    commonAttempt();
    if (payload.attempt_number !== 1) fail("event.payload.attempt_number_mismatch");
    return structuredClone(payload);
  }
  if (eventType === "transaction_prepared") {
    exactKeys(payload, [
      "attempt_id",
      "transaction_hash",
      "nonce",
      "fulfillment_wallet_fingerprint_sha256",
      "gas_limit",
      "max_fee_per_gas_wei",
      "max_priority_fee_per_gas_wei",
    ], "event.payload");
    commonAttempt();
    transactionHash(payload.transaction_hash, "event.payload.transaction_hash");
    safeInteger(payload.nonce, 0, Number.MAX_SAFE_INTEGER, "event.payload.nonce");
    sha256(payload.fulfillment_wallet_fingerprint_sha256, "event.payload.fulfillment_wallet_fingerprint_sha256");
    decimal(payload.gas_limit, "event.payload.gas_limit", { positive: true });
    decimal(payload.max_fee_per_gas_wei, "event.payload.max_fee_per_gas_wei", { positive: true });
    decimal(payload.max_priority_fee_per_gas_wei, "event.payload.max_priority_fee_per_gas_wei");
    if (BigInt(payload.max_priority_fee_per_gas_wei) > BigInt(payload.max_fee_per_gas_wei)) {
      fail("event.payload.priority_fee_exceeds_max_fee");
    }
    return structuredClone(payload);
  }
  if (["broadcast_not_attempted", "broadcast_unknown", "broadcast_accepted"].includes(eventType)) {
    const expected = eventType === "broadcast_not_attempted"
      ? ["attempt_id", "transaction_hash", "reason_code", "broadcast_call_performed"]
      : ["attempt_id", "transaction_hash", "reason_code", "broadcast_call_performed", "provider_submission_id_sha256"];
    exactKeys(payload, expected, "event.payload");
    commonAttempt();
    transactionHash(payload.transaction_hash, "event.payload.transaction_hash");
    safeId(payload.reason_code, "event.payload.reason_code");
    if (eventType === "broadcast_not_attempted") {
      if (payload.broadcast_call_performed !== false) fail("event.payload.broadcast_call_performed_must_be_false");
    } else {
      if (payload.broadcast_call_performed !== true) fail("event.payload.broadcast_call_performed_must_be_true");
      sha256(payload.provider_submission_id_sha256, "event.payload.provider_submission_id_sha256");
    }
    return structuredClone(payload);
  }
  if (["receipt_confirmed", "receipt_reverted"].includes(eventType)) {
    exactKeys(payload, [
      "attempt_id",
      "transaction_hash",
      "block_number",
      "block_hash",
      "confirmations",
      "receipt_status",
    ], "event.payload");
    commonAttempt();
    transactionHash(payload.transaction_hash, "event.payload.transaction_hash");
    decimal(payload.block_number, "event.payload.block_number");
    transactionHash(payload.block_hash, "event.payload.block_hash");
    safeInteger(payload.confirmations, 1, 1_000_000, "event.payload.confirmations");
    const expectedStatus = eventType === "receipt_confirmed" ? 1 : 0;
    if (payload.receipt_status !== expectedStatus) fail("event.payload.receipt_status_mismatch");
    return structuredClone(payload);
  }
  if (eventType === "closeout_committed") {
    exactKeys(payload, [
      "attempt_id",
      "transaction_hash",
      "closeout_id",
      "inventory_decremented",
      "public_request_fulfilled",
    ], "event.payload");
    commonAttempt();
    transactionHash(payload.transaction_hash, "event.payload.transaction_hash");
    sha256(payload.closeout_id, "event.payload.closeout_id");
    if (payload.inventory_decremented !== true || payload.public_request_fulfilled !== true) {
      fail("event.payload.closeout_flags_mismatch");
    }
    return structuredClone(payload);
  }
  if (eventType === "terminal_hold") {
    exactKeys(payload, ["reason_code", "related_event_id"], "event.payload");
    safeId(payload.reason_code, "event.payload.reason_code");
    if (payload.related_event_id !== null) {
      const related = nonEmptyString(payload.related_event_id, "event.payload.related_event_id", 77);
      if (!/^voidbvfsge1_[0-9a-f]{64}$/u.test(related)) fail("event.payload.related_event_id_invalid");
    }
    return structuredClone(payload);
  }
  fail("event_type_unsupported");
}

export function buildSagaEventV1(input) {
  const binding = validateSagaBindingV1(input.binding);
  const sagaId = computeSagaIdV1(binding);
  const eventType = nonEmptyString(input.event_type, "event_type", 64);
  if (!EVENT_TYPES.includes(eventType)) fail("event_type_invalid");
  const event = {
    schema: EVENT_SCHEMA,
    marker: MARKER,
    version: 1,
    saga_id: sagaId,
    event_id: null,
    sequence: safeInteger(input.sequence, 0, MAX_EVENTS - 1, "sequence"),
    previous_event_id: input.previous_event_id === null
      ? null
      : nonEmptyString(input.previous_event_id, "previous_event_id", 77),
    recorded_at_utc: canonicalUtc(input.recorded_at_utc, "recorded_at_utc"),
    event_type: eventType,
    fencing_token: safeInteger(input.fencing_token, 1, Number.MAX_SAFE_INTEGER, "fencing_token"),
    binding,
    payload: validatePayload(eventType, input.payload),
    authority: AUTHORITY,
  };
  event.event_id = contentId(EVENT_ID_PREFIX, event, "event_id");
  return validateSagaEventV1(event);
}

export function validateSagaEventV1(value) {
  exactKeys(value, [
    "schema",
    "marker",
    "version",
    "saga_id",
    "event_id",
    "sequence",
    "previous_event_id",
    "recorded_at_utc",
    "event_type",
    "fencing_token",
    "binding",
    "payload",
    "authority",
  ], "event");
  if (value.schema !== EVENT_SCHEMA || value.marker !== MARKER || value.version !== 1) {
    fail("event_identity_mismatch");
  }
  const binding = validateSagaBindingV1(value.binding);
  const sagaId = computeSagaIdV1(binding);
  if (value.saga_id !== sagaId) fail("event_saga_id_mismatch");
  if (!/^voidbvfsge1_[0-9a-f]{64}$/u.test(String(value.event_id || ""))) {
    fail("event_id_invalid");
  }
  if (value.event_id !== contentId(EVENT_ID_PREFIX, value, "event_id")) {
    fail("event_id_derivation_mismatch");
  }
  safeInteger(value.sequence, 0, MAX_EVENTS - 1, "event.sequence");
  if (value.previous_event_id !== null && !/^voidbvfsge1_[0-9a-f]{64}$/u.test(String(value.previous_event_id))) {
    fail("event_previous_event_id_invalid");
  }
  canonicalUtc(value.recorded_at_utc, "event.recorded_at_utc");
  if (!EVENT_TYPES.includes(value.event_type)) fail("event_type_invalid");
  safeInteger(value.fencing_token, 1, Number.MAX_SAFE_INTEGER, "event.fencing_token");
  validatePayload(value.event_type, value.payload);
  if (canonicalJsonV1(value.authority) !== canonicalJsonV1(AUTHORITY)) {
    fail("event_authority_mismatch");
  }
  assertNoSecretMaterialV1(value, "event");
  return structuredClone(value);
}

function same(valueA, valueB) {
  return canonicalJsonV1(valueA) === canonicalJsonV1(valueB);
}

function initialState(binding, sagaId) {
  return {
    schema: SCHEMA,
    marker: MARKER,
    version: 1,
    saga_id: sagaId,
    binding,
    state: "empty",
    terminal: false,
    event_count: 0,
    last_event_id: null,
    last_sequence: -1,
    last_fencing_token: 0,
    claim_id: null,
    instruction_id: null,
    reservation_id: null,
    attempt_id: null,
    attempt_number: 0,
    transaction_hash: null,
    nonce: null,
    broadcast_call_may_have_occurred: false,
    receipt_status: null,
    closeout_id: null,
    automatic_retry_allowed: false,
    next_action: null,
    authority: AUTHORITY,
  };
}

function requireState(state, allowed, eventType) {
  if (!allowed.includes(state.state)) fail(`transition_${state.state}_to_${eventType}_forbidden`);
}

function requireAttemptAndHash(state, payload) {
  if (payload.attempt_id !== state.attempt_id) fail("event_attempt_id_binding_mismatch");
  if (payload.transaction_hash !== state.transaction_hash) fail("event_transaction_hash_binding_mismatch");
}

export function foldSagaEventsV1(events) {
  if (!Array.isArray(events) || events.length < 1 || events.length > MAX_EVENTS) {
    fail("events_count_out_of_range");
  }
  const validated = events.map(validateSagaEventV1);
  const binding = validated[0].binding;
  const sagaId = validated[0].saga_id;
  let state = initialState(binding, sagaId);
  let previousTime = -1;

  for (let index = 0; index < validated.length; index += 1) {
    const event = validated[index];
    if (!same(event.binding, binding) || event.saga_id !== sagaId) fail("event_binding_changed");
    if (event.sequence !== index) fail("event_sequence_gap_or_duplicate");
    const expectedPrevious = index === 0 ? null : validated[index - 1].event_id;
    if (event.previous_event_id !== expectedPrevious) fail("event_hash_chain_broken");
    if (event.fencing_token < state.last_fencing_token) fail("event_fencing_token_regressed");
    const time = Date.parse(event.recorded_at_utc);
    if (time < previousTime) fail("event_time_regressed");
    previousTime = time;

    const payload = event.payload;
    if (event.event_type === "saga_initialized") {
      requireState(state, ["empty"], event.event_type);
      if (index !== 0) fail("saga_initialized_must_be_first");
      state.state = "initialized";
    } else if (event.event_type === "claim_committed") {
      requireState(state, ["initialized"], event.event_type);
      state.claim_id = payload.claim_id;
      state.instruction_id = payload.instruction_id;
      state.state = "claimed";
    } else if (event.event_type === "inventory_reserved") {
      requireState(state, ["claimed"], event.event_type);
      state.reservation_id = payload.reservation_id;
      state.state = "inventory_reserved";
    } else if (event.event_type === "attempt_reserved") {
      requireState(state, ["inventory_reserved"], event.event_type);
      state.attempt_id = payload.attempt_id;
      state.attempt_number = payload.attempt_number;
      state.state = "attempt_reserved";
    } else if (event.event_type === "transaction_prepared") {
      requireState(state, ["attempt_reserved"], event.event_type);
      if (payload.attempt_id !== state.attempt_id) fail("prepared_attempt_id_mismatch");
      state.transaction_hash = payload.transaction_hash;
      state.nonce = payload.nonce;
      state.state = "transaction_prepared";
    } else if (event.event_type === "broadcast_not_attempted") {
      requireState(state, ["transaction_prepared", "broadcast_not_attempted"], event.event_type);
      requireAttemptAndHash(state, payload);
      state.broadcast_call_may_have_occurred = false;
      state.state = "broadcast_not_attempted";
    } else if (event.event_type === "broadcast_unknown") {
      requireState(state, ["transaction_prepared", "broadcast_not_attempted", "broadcast_unknown"], event.event_type);
      requireAttemptAndHash(state, payload);
      state.broadcast_call_may_have_occurred = true;
      state.state = "broadcast_unknown";
    } else if (event.event_type === "broadcast_accepted") {
      requireState(state, ["transaction_prepared", "broadcast_not_attempted", "broadcast_unknown", "broadcast_accepted"], event.event_type);
      requireAttemptAndHash(state, payload);
      state.broadcast_call_may_have_occurred = true;
      state.state = "broadcast_accepted";
    } else if (event.event_type === "receipt_confirmed") {
      requireState(state, ["broadcast_unknown", "broadcast_accepted"], event.event_type);
      requireAttemptAndHash(state, payload);
      state.receipt_status = 1;
      state.state = "receipt_confirmed";
    } else if (event.event_type === "receipt_reverted") {
      requireState(state, ["broadcast_unknown", "broadcast_accepted"], event.event_type);
      requireAttemptAndHash(state, payload);
      state.receipt_status = 0;
      state.state = "receipt_reverted";
      state.terminal = true;
    } else if (event.event_type === "closeout_committed") {
      requireState(state, ["receipt_confirmed"], event.event_type);
      requireAttemptAndHash(state, payload);
      state.closeout_id = payload.closeout_id;
      state.state = "closed";
      state.terminal = true;
    } else if (event.event_type === "terminal_hold") {
      if (state.terminal) fail("terminal_hold_after_terminal_forbidden");
      state.state = "terminal_hold";
      state.terminal = true;
    }

    state.event_count = index + 1;
    state.last_event_id = event.event_id;
    state.last_sequence = event.sequence;
    state.last_fencing_token = event.fencing_token;
  }

  const next = deriveSagaNextActionV1(state);
  state.next_action = next.action;
  return state;
}

export function deriveSagaNextActionV1(state) {
  directObject(state, "state");
  if (state.terminal || state.state === "closed" || state.state === "receipt_reverted" || state.state === "terminal_hold") {
    return {
      action: null,
      terminal: true,
      automatic_execution_allowed: false,
      automatic_retry_allowed: false,
      required_confirmation: null,
      reason: state.state,
    };
  }
  const mapping = {
    initialized: "claim_payment",
    claimed: "reserve_inventory",
    inventory_reserved: "reserve_execution_attempt",
    attempt_reserved: "prepare_transaction",
    transaction_prepared: "execute_prepared_transaction",
    broadcast_not_attempted: "execute_prepared_transaction",
    broadcast_unknown: "reconcile_possible_broadcast",
    broadcast_accepted: "reconcile_possible_broadcast",
    receipt_confirmed: "closeout_confirmed_delivery",
  };
  const action = mapping[state.state] || null;
  if (!action) fail("next_action_unresolved");
  return {
    action,
    terminal: false,
    automatic_execution_allowed: [
      "claim_payment",
      "reserve_inventory",
      "reserve_execution_attempt",
      "prepare_transaction",
    ].includes(action),
    automatic_retry_allowed: false,
    required_confirmation: ACTION_CONFIRMATIONS[action],
    reason: null,
  };
}

export function buildSagaRecordV1(events) {
  const state = foldSagaEventsV1(events);
  const record = {
    schema: SCHEMA,
    marker: MARKER,
    version: 1,
    saga_id: state.saga_id,
    binding: state.binding,
    events: events.map(validateSagaEventV1),
    state: {
      state: state.state,
      terminal: state.terminal,
      event_count: state.event_count,
      last_event_id: state.last_event_id,
      last_sequence: state.last_sequence,
      last_fencing_token: state.last_fencing_token,
      claim_id: state.claim_id,
      instruction_id: state.instruction_id,
      reservation_id: state.reservation_id,
      attempt_id: state.attempt_id,
      attempt_number: state.attempt_number,
      transaction_hash: state.transaction_hash,
      nonce: state.nonce,
      broadcast_call_may_have_occurred: state.broadcast_call_may_have_occurred,
      receipt_status: state.receipt_status,
      closeout_id: state.closeout_id,
      automatic_retry_allowed: false,
      next_action: state.next_action,
    },
    authority: AUTHORITY,
  };
  return validateSagaRecordV1(record);
}

export function validateSagaRecordV1(value) {
  exactKeys(value, ["schema", "marker", "version", "saga_id", "binding", "events", "state", "authority"], "record");
  if (value.schema !== SCHEMA || value.marker !== MARKER || value.version !== 1) fail("record_identity_mismatch");
  const folded = foldSagaEventsV1(value.events);
  if (value.saga_id !== folded.saga_id || !same(value.binding, folded.binding)) fail("record_binding_mismatch");
  const expectedState = buildSagaRecordStateProjection(folded);
  if (!same(value.state, expectedState)) fail("record_state_projection_mismatch");
  if (!same(value.authority, AUTHORITY)) fail("record_authority_mismatch");
  assertNoSecretMaterialV1(value, "record");
  return structuredClone(value);
}

function buildSagaRecordStateProjection(state) {
  return {
    state: state.state,
    terminal: state.terminal,
    event_count: state.event_count,
    last_event_id: state.last_event_id,
    last_sequence: state.last_sequence,
    last_fencing_token: state.last_fencing_token,
    claim_id: state.claim_id,
    instruction_id: state.instruction_id,
    reservation_id: state.reservation_id,
    attempt_id: state.attempt_id,
    attempt_number: state.attempt_number,
    transaction_hash: state.transaction_hash,
    nonce: state.nonce,
    broadcast_call_may_have_occurred: state.broadcast_call_may_have_occurred,
    receipt_status: state.receipt_status,
    closeout_id: state.closeout_id,
    automatic_retry_allowed: false,
    next_action: state.next_action,
  };
}

function ensurePrivateDirectory(path) {
  const resolved = resolve(path);
  if (!existsSync(resolved)) mkdirSync(resolved, { recursive: true, mode: 0o700 });
  const metadata = lstatSync(resolved);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) fail("store_directory_must_be_direct_directory");
  if (typeof process.getuid === "function" && metadata.uid !== process.getuid()) fail("store_directory_owner_mismatch");
  if ((metadata.mode & 0o077) !== 0) fail("store_directory_must_be_private");
  return resolved;
}

function readJsonFile(path, label) {
  const metadata = lstatSync(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) fail(`${label}_must_be_direct_file`);
  if (metadata.size < 1 || metadata.size > MAX_JSON_BYTES) fail(`${label}_size_out_of_range`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function fsyncDirectory(path) {
  const descriptor = openSync(path, "r");
  try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
}

function atomicWriteJson(path, value) {
  const parent = ensurePrivateDirectory(dirname(path));
  const temporary = `${path}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
  const descriptor = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  renameSync(temporary, path);
  fsyncDirectory(parent);
}

function withExclusiveLock(path, operation) {
  let descriptor;
  try {
    descriptor = openSync(path, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") fail("store_lock_busy");
    throw error;
  }
  try {
    return operation();
  } finally {
    closeSync(descriptor);
    rmSync(path, { force: true });
  }
}

function validateLease(value) {
  exactKeys(value, [
    "schema",
    "marker",
    "version",
    "saga_id",
    "owner_id",
    "fencing_token",
    "acquired_at_ms",
    "expires_at_ms",
    "released",
  ], "lease");
  if (value.schema !== LEASE_SCHEMA || value.marker !== MARKER || value.version !== 1) fail("lease_identity_mismatch");
  if (!/^voidbvfsg1_[0-9a-f]{64}$/u.test(String(value.saga_id || ""))) fail("lease_saga_id_invalid");
  safeId(value.owner_id, "lease.owner_id");
  safeInteger(value.fencing_token, 1, Number.MAX_SAFE_INTEGER, "lease.fencing_token");
  safeInteger(value.acquired_at_ms, 0, Number.MAX_SAFE_INTEGER, "lease.acquired_at_ms");
  safeInteger(value.expires_at_ms, value.acquired_at_ms, Number.MAX_SAFE_INTEGER, "lease.expires_at_ms");
  if (typeof value.released !== "boolean") fail("lease.released_must_be_boolean");
  return structuredClone(value);
}

export function createFilesystemSagaStoreV1(rootDir) {
  const root = ensurePrivateDirectory(rootDir);
  const sagasRoot = ensurePrivateDirectory(join(root, "sagas"));

  function locations(sagaId) {
    if (!/^voidbvfsg1_[0-9a-f]{64}$/u.test(String(sagaId || ""))) fail("store_saga_id_invalid");
    const saga = ensurePrivateDirectory(join(sagasRoot, sagaId));
    const events = ensurePrivateDirectory(join(saga, "events"));
    return {
      saga,
      events,
      lease: join(saga, "lease.json"),
      leaseLock: join(saga, "lease.lock"),
      appendLock: join(saga, "append.lock"),
    };
  }

  function recover(sagaId) {
    const place = locations(sagaId);
    const entries = readdirSync(place.events, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (entry.name.includes(".tmp-")) continue;
      if (!entry.isFile() || entry.isSymbolicLink()) fail("event_directory_contains_non_regular_entry");
      const match = EVENT_FILE.exec(entry.name);
      if (!match) fail("event_filename_invalid");
      files.push({ name: entry.name, sequence: Number(match[1]), eventId: match[2] });
    }
    files.sort((a, b) => a.sequence - b.sequence || a.name.localeCompare(b.name));
    if (files.length < 1) return null;
    const events = files.map((file, index) => {
      if (file.sequence !== index) fail("event_file_sequence_gap_or_duplicate");
      const event = validateSagaEventV1(readJsonFile(join(place.events, file.name), "event_file"));
      if (event.sequence !== index || event.event_id !== file.eventId) fail("event_filename_content_mismatch");
      return event;
    });
    return buildSagaRecordV1(events);
  }

  function acquireLease({ saga_id, owner_id, now_ms, ttl_ms }) {
    const place = locations(saga_id);
    safeId(owner_id, "owner_id");
    safeInteger(now_ms, 0, Number.MAX_SAFE_INTEGER, "now_ms");
    safeInteger(ttl_ms, 1, MAX_LEASE_TTL_MS, "ttl_ms");
    return withExclusiveLock(place.leaseLock, () => {
      let previous = null;
      if (existsSync(place.lease)) previous = validateLease(readJsonFile(place.lease, "lease_file"));
      if (previous && previous.saga_id !== saga_id) fail("lease_saga_binding_mismatch");
      if (previous && !previous.released && previous.expires_at_ms > now_ms && previous.owner_id !== owner_id) {
        return {
          ok: false,
          status: "held",
          reason: "lease_held_by_another_owner",
          active_owner_id: previous.owner_id,
          expires_at_ms: previous.expires_at_ms,
          fencing_token: previous.fencing_token,
        };
      }
      const sameActiveOwner = previous && !previous.released && previous.owner_id === owner_id && previous.expires_at_ms > now_ms;
      const fencingToken = sameActiveOwner ? previous.fencing_token : (previous?.fencing_token || 0) + 1;
      const lease = validateLease({
        schema: LEASE_SCHEMA,
        marker: MARKER,
        version: 1,
        saga_id,
        owner_id,
        fencing_token: fencingToken,
        acquired_at_ms: now_ms,
        expires_at_ms: now_ms + ttl_ms,
        released: false,
      });
      atomicWriteJson(place.lease, lease);
      return { ok: true, status: "acquired", lease };
    });
  }

  function releaseLease({ saga_id, owner_id, fencing_token, now_ms }) {
    const place = locations(saga_id);
    return withExclusiveLock(place.leaseLock, () => {
      if (!existsSync(place.lease)) fail("lease_missing");
      const lease = validateLease(readJsonFile(place.lease, "lease_file"));
      if (lease.owner_id !== owner_id || lease.fencing_token !== fencing_token || lease.released) {
        fail("lease_release_binding_mismatch");
      }
      const released = validateLease({
        ...lease,
        expires_at_ms: Math.max(lease.acquired_at_ms, now_ms),
        released: true,
      });
      atomicWriteJson(place.lease, released);
      return released;
    });
  }

  function appendEvent({ event, owner_id, fencing_token, now_ms }) {
    const validated = validateSagaEventV1(event);
    const place = locations(validated.saga_id);
    return withExclusiveLock(place.appendLock, () => {
      if (!existsSync(place.lease)) fail("append_requires_lease");
      const lease = validateLease(readJsonFile(place.lease, "lease_file"));
      if (
        lease.owner_id !== owner_id ||
        lease.fencing_token !== fencing_token ||
        lease.released ||
        lease.expires_at_ms <= now_ms
      ) {
        fail("append_lease_not_current");
      }
      if (validated.fencing_token !== fencing_token) fail("event_fencing_token_mismatch");
      const current = recover(validated.saga_id);
      const expectedSequence = current ? current.state.event_count : 0;
      const expectedPrevious = current ? current.state.last_event_id : null;
      if (validated.sequence !== expectedSequence || validated.previous_event_id !== expectedPrevious) {
        fail("append_expected_head_mismatch");
      }
      const filename = `${String(validated.sequence).padStart(8, "0")}-${validated.event_id}.json`;
      const target = join(place.events, filename);
      if (existsSync(target)) fail("event_file_already_exists");
      atomicWriteJson(target, validated);
      return recover(validated.saga_id);
    });
  }

  return Object.freeze({ root_dir: root, recover, acquireLease, releaseLease, appendEvent });
}

export function buildNextEventFromActionResultV1({ record, action, result, fencing_token, recorded_at_utc }) {
  const current = validateSagaRecordV1(record);
  const next = deriveSagaNextActionV1({ ...current.state, terminal: current.state.terminal });
  if (next.action !== action) fail("action_does_not_match_current_state");
  directObject(result, "action_result");
  assertNoSecretMaterialV1(result, "action_result");
  const mapping = {
    claim_payment: "claim_committed",
    reserve_inventory: "inventory_reserved",
    reserve_execution_attempt: "attempt_reserved",
    prepare_transaction: "transaction_prepared",
    closeout_confirmed_delivery: "closeout_committed",
  };
  let eventType = mapping[action] || null;
  if (action === "execute_prepared_transaction") {
    if (!["broadcast_not_attempted", "broadcast_unknown", "broadcast_accepted"].includes(result.outcome)) {
      fail("execution_outcome_invalid");
    }
    eventType = result.outcome;
  }
  if (action === "reconcile_possible_broadcast") {
    if (!["broadcast_accepted", "receipt_confirmed", "receipt_reverted"].includes(result.outcome)) {
      fail("reconciliation_outcome_invalid");
    }
    eventType = result.outcome;
  }
  if (!eventType) fail("action_event_mapping_missing");
  const payload = structuredClone(result.payload);
  return buildSagaEventV1({
    binding: current.binding,
    sequence: current.state.event_count,
    previous_event_id: current.state.last_event_id,
    recorded_at_utc,
    event_type: eventType,
    fencing_token,
    payload,
  });
}

export async function runSagaSupervisorTickV1(input) {
  const store = input?.store;
  if (!store || typeof store.recover !== "function" || typeof store.acquireLease !== "function" || typeof store.appendEvent !== "function") {
    fail("supervisor_store_required");
  }
  const binding = validateSagaBindingV1(input.binding);
  const sagaId = computeSagaIdV1(binding);
  const ownerId = safeId(input.owner_id, "owner_id");
  const nowMs = safeInteger(input.now_ms, 0, Number.MAX_SAFE_INTEGER, "now_ms");
  const ttlMs = safeInteger(input.lease_ttl_ms, 1, MAX_LEASE_TTL_MS, "lease_ttl_ms");
  const leaseDecision = store.acquireLease({ saga_id: sagaId, owner_id: ownerId, now_ms: nowMs, ttl_ms: ttlMs });
  if (!leaseDecision.ok) return leaseDecision;
  const lease = leaseDecision.lease;
  try {
    let record = store.recover(sagaId);
    if (!record) {
      const event = buildSagaEventV1({
        binding,
        sequence: 0,
        previous_event_id: null,
        recorded_at_utc: input.recorded_at_utc,
        event_type: "saga_initialized",
        fencing_token: lease.fencing_token,
        payload: {
          source_floor_main: gitSha(input.source_floor_main, "source_floor_main"),
          policy_id: safeId(input.policy_id, "policy_id"),
          max_attempts: 1,
        },
      });
      record = store.appendEvent({ event, owner_id: ownerId, fencing_token: lease.fencing_token, now_ms: nowMs });
    }
    const next = deriveSagaNextActionV1({ ...record.state, terminal: record.state.terminal });
    if (next.terminal) {
      return { ok: true, status: "terminal", saga_id: sagaId, state: record.state, action: null };
    }
    if (input.apply !== true) {
      return {
        ok: true,
        status: "dry_run",
        saga_id: sagaId,
        state: record.state,
        action: next.action,
        automatic_execution_allowed: next.automatic_execution_allowed,
        automatic_retry_allowed: false,
        required_confirmation: next.required_confirmation,
      };
    }
    if (input.confirmation !== ADVANCE_CONFIRMATION) fail("supervisor_confirmation_required");
    if (input.action_confirmation !== next.required_confirmation) fail("action_confirmation_required");
    const adapter = input.adapters?.[next.action];
    if (typeof adapter !== "function") fail("action_adapter_required");
    const actionResult = await adapter({ saga_id: sagaId, binding, record, action: next.action });
    const event = buildNextEventFromActionResultV1({
      record,
      action: next.action,
      result: actionResult,
      fencing_token: lease.fencing_token,
      recorded_at_utc: input.recorded_at_utc,
    });
    const updated = store.appendEvent({ event, owner_id: ownerId, fencing_token: lease.fencing_token, now_ms: nowMs });
    return {
      ok: true,
      status: "applied",
      saga_id: sagaId,
      action: next.action,
      event_id: event.event_id,
      state: updated.state,
      automatic_retry_allowed: false,
    };
  } finally {
    store.releaseLease({ saga_id: sagaId, owner_id: ownerId, fencing_token: lease.fencing_token, now_ms: nowMs });
  }
}
