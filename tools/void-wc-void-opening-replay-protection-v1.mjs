#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  VOID_WC_VOID_OPENING_CLAIM_BINDING_V1,
  deriveWcVoidOpeningClaimBindingV1,
} from "./void-wc-void-opening-claim-binding-v1.mjs";

export const VOID_WC_VOID_OPENING_REPLAY_PROTECTION_V1 =
  "VOID_WC_VOID_OPENING_REPLAY_PROTECTION_V1";

export const VOID_WC_VOID_OPENING_REPLAY_STATE_V1 =
  "VOID_WC_VOID_OPENING_REPLAY_STATE_V1";

export const VOID_WC_VOID_OPENING_REPLAY_TRANSITION_V1 =
  "VOID_WC_VOID_OPENING_REPLAY_TRANSITION_V1";

export const VOID_WC_VOID_OPENING_REPLAY_PROTECTION_AUTHORITY_V1 =
  Object.freeze({
    pure_transition_only: true,
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    token_transfer: false,
    refund_write: false,
    replay_state_persistence: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const MAX_CONSUMED_IDS = 1_000_000;

const STATE_KEYS = Object.freeze([
  "marker",
  "version",
  "coupled_launch_id",
  "revision",
  "consumed_binding_ids",
  "consumed_commitment_ids",
  "consumed_settlement_ids",
  "consumed_disposition_ids",
  "state_id",
]);

const TRANSITION_INPUT_KEYS = Object.freeze([
  "before_state",
  "coupled_launch_id",
  "commitments",
  "ledger_debits",
  "mode",
  "dispositions",
]);

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  const sorted = actual.sort(compareText);
  const expected = [...keys].sort(compareText);
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (plain(value)) {
    const keys = Object.keys(value).sort(compareText);
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function canonicalConsumedIds(value, code) {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length > MAX_CONSUMED_IDS
  ) {
    fail(code);
  }
  const out = value.map((id) => canonicalSha(id, code));
  const sorted = [...out].sort(compareText);
  if (
    new Set(out).size !== out.length ||
    out.some((id, index) => id !== sorted[index])
  ) {
    fail(code);
  }
  return Object.freeze(out);
}

function stateBody(value) {
  return Object.freeze({
    marker: value.marker,
    version: value.version,
    coupled_launch_id: value.coupled_launch_id,
    revision: value.revision,
    consumed_binding_ids: value.consumed_binding_ids,
    consumed_commitment_ids: value.consumed_commitment_ids,
    consumed_settlement_ids: value.consumed_settlement_ids,
    consumed_disposition_ids: value.consumed_disposition_ids,
  });
}

function validateState(raw) {
  const value = exactObject(
    raw,
    STATE_KEYS,
    "INVALID_WC_VOID_OPENING_REPLAY_STATE_SHAPE",
  );
  if (
    value.marker !== VOID_WC_VOID_OPENING_REPLAY_STATE_V1 ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0
  ) {
    fail("INVALID_WC_VOID_OPENING_REPLAY_STATE");
  }

  const coupledLaunchId = canonicalSha(
    value.coupled_launch_id,
    "INVALID_WC_VOID_OPENING_REPLAY_LAUNCH_ID",
  );
  const state = Object.freeze({
    marker: VOID_WC_VOID_OPENING_REPLAY_STATE_V1,
    version: 1,
    coupled_launch_id: coupledLaunchId,
    revision: value.revision,
    consumed_binding_ids: canonicalConsumedIds(
      value.consumed_binding_ids,
      "INVALID_WC_VOID_OPENING_REPLAY_BINDING_ID_SET",
    ),
    consumed_commitment_ids: canonicalConsumedIds(
      value.consumed_commitment_ids,
      "INVALID_WC_VOID_OPENING_REPLAY_COMMITMENT_ID_SET",
    ),
    consumed_settlement_ids: canonicalConsumedIds(
      value.consumed_settlement_ids,
      "INVALID_WC_VOID_OPENING_REPLAY_SETTLEMENT_ID_SET",
    ),
    consumed_disposition_ids: canonicalConsumedIds(
      value.consumed_disposition_ids,
      "INVALID_WC_VOID_OPENING_REPLAY_DISPOSITION_ID_SET",
    ),
    state_id: canonicalSha(
      value.state_id,
      "INVALID_WC_VOID_OPENING_REPLAY_STATE_ID",
    ),
  });
  if (digest(stateBody(state)) !== state.state_id) {
    fail("WC_VOID_OPENING_REPLAY_STATE_ID_MISMATCH");
  }
  return state;
}

export function initialWcVoidOpeningReplayStateV1(coupledLaunchId) {
  const body = Object.freeze({
    marker: VOID_WC_VOID_OPENING_REPLAY_STATE_V1,
    version: 1,
    coupled_launch_id: canonicalSha(
      coupledLaunchId,
      "INVALID_WC_VOID_OPENING_REPLAY_LAUNCH_ID",
    ),
    revision: 0,
    consumed_binding_ids: Object.freeze([]),
    consumed_commitment_ids: Object.freeze([]),
    consumed_settlement_ids: Object.freeze([]),
    consumed_disposition_ids: Object.freeze([]),
  });
  return Object.freeze({
    ...body,
    state_id: digest(body),
  });
}

function appendConsumed(existing, added, duplicateCode) {
  const seen = new Set(existing);
  for (const id of added) {
    canonicalSha(id, duplicateCode);
    if (seen.has(id)) fail(duplicateCode);
    seen.add(id);
  }
  if (seen.size > MAX_CONSUMED_IDS) {
    fail("WC_VOID_OPENING_REPLAY_STATE_CAPACITY_EXCEEDED");
  }
  return Object.freeze([...seen].sort(compareText));
}

export function deriveWcVoidOpeningReplayTransitionV1(input) {
  const request = exactObject(
    input,
    TRANSITION_INPUT_KEYS,
    "INVALID_WC_VOID_OPENING_REPLAY_TRANSITION_INPUT_SHAPE",
  );
  const launchId = canonicalSha(
    request.coupled_launch_id,
    "INVALID_WC_VOID_OPENING_REPLAY_LAUNCH_ID",
  );
  const before = validateState(request.before_state);
  if (before.coupled_launch_id !== launchId) {
    fail("WC_VOID_OPENING_REPLAY_STATE_LAUNCH_MISMATCH");
  }

  const binding = deriveWcVoidOpeningClaimBindingV1({
    coupled_launch_id: launchId,
    commitments: request.commitments,
    ledger_debits: request.ledger_debits,
    mode: request.mode,
    dispositions: request.dispositions,
  });
  if (
    binding.marker !== VOID_WC_VOID_OPENING_CLAIM_BINDING_V1 ||
    binding.opening_claim_transfer_or_refund_binding_source_ready !== true ||
    binding.runtime_execution_ready !== false
  ) {
    fail("WC_VOID_OPENING_REPLAY_BINDING_NOT_SOURCE_READY");
  }

  const bindingIds = [binding.binding_id];
  const commitmentIds = binding.dispositions.map((row) => row.commitment_id);
  const settlementIds = binding.dispositions.map((row) => row.settlement_id);
  const dispositionIds = binding.dispositions.map((row) => row.disposition_id);

  const nextBody = Object.freeze({
    marker: VOID_WC_VOID_OPENING_REPLAY_STATE_V1,
    version: 1,
    coupled_launch_id: launchId,
    revision: before.revision + 1,
    consumed_binding_ids: appendConsumed(
      before.consumed_binding_ids,
      bindingIds,
      "WC_VOID_OPENING_REPLAY_BINDING_ALREADY_CONSUMED",
    ),
    consumed_commitment_ids: appendConsumed(
      before.consumed_commitment_ids,
      commitmentIds,
      "WC_VOID_OPENING_REPLAY_COMMITMENT_ALREADY_CONSUMED",
    ),
    consumed_settlement_ids: appendConsumed(
      before.consumed_settlement_ids,
      settlementIds,
      "WC_VOID_OPENING_REPLAY_SETTLEMENT_ALREADY_CONSUMED",
    ),
    consumed_disposition_ids: appendConsumed(
      before.consumed_disposition_ids,
      dispositionIds,
      "WC_VOID_OPENING_REPLAY_DISPOSITION_ALREADY_CONSUMED",
    ),
  });
  const nextState = Object.freeze({
    ...nextBody,
    state_id: digest(nextBody),
  });

  const transitionBody = Object.freeze({
    marker: VOID_WC_VOID_OPENING_REPLAY_TRANSITION_V1,
    version: 1,
    coupled_launch_id: launchId,
    before_state_id: before.state_id,
    after_state_id: nextState.state_id,
    before_revision: before.revision,
    after_revision: nextState.revision,
    binding_id: binding.binding_id,
    consumed_commitment_count: commitmentIds.length,
    consumed_settlement_count: settlementIds.length,
    consumed_disposition_count: dispositionIds.length,
  });

  return Object.freeze({
    ...transitionBody,
    transition_id: digest(transitionBody),
    next_state: nextState,
    duplicate_replay_protection_source_ready: true,
    duplicate_replay_protection_proven: false,
    durable_replay_state_persistence_verified: false,
    replay_state_write_performed: false,
    runtime_execution_ready: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority: VOID_WC_VOID_OPENING_REPLAY_PROTECTION_AUTHORITY_V1,
  });
}
