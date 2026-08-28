#!/usr/bin/env node

import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

import { readBtcVoidBoundedStdinV1 } from "./void-btc-void-bounded-stdin-v1.mjs";

export const VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1 =
  "VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1";
export const BITCOIN_MAX_MONEY_SATOSHIS_V1 = "2100000000000000";
export const VOID_MAX_SUPPLY_ATOMS_V1 = "666666666000000000000000000";

const TRACE_SCHEMA = "void.btc_void.atomic_settlement_trace.v1";
const CONTRACT_SCHEMA = "void.btc_void.atomic_settlement_contract.v1";
const EVENT_SCHEMA = "void.btc_void.atomic_settlement_event.v1";
const EVALUATION_SCHEMA = "void.btc_void.atomic_settlement_evaluation.v1";
const PAIR = "native_btc/native_void";
const SHA256_ID = /^sha256:[0-9a-f]{64}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const MAX_EVENTS = 64;
const MAX_STDIN_BYTES = 1_048_576;

const TERMINAL_PHASES = new Set([
  "SETTLED",
  "EXPIRED",
  "REFUNDED",
  "HELD",
  "CANCELLED_BEFORE_FUNDING",
]);

const EVENT_TYPES = new Set([
  "BIND_HASHLOCK",
  "EXPIRE_RESERVATION",
  "CANCEL_BEFORE_FUNDING",
  "HOLD",
  "OBSERVE_SOURCE_FUNDING",
  "CONFIRM_SOURCE_FUNDING",
  "OBSERVE_SOURCE_REFUND",
  "OBSERVE_COUNTERPARTY_LOCK",
  "OBSERVE_COUNTERPARTY_REFUND",
  "OBSERVE_PREIMAGE_REVEAL",
  "OBSERVE_BOTH_CLAIMS",
  "FINALIZE_SETTLEMENT",
]);

const TRANSITIONS = Object.freeze({
  RESERVED: Object.freeze({
    BIND_HASHLOCK: "HASH_BOUND",
    EXPIRE_RESERVATION: "EXPIRED",
    CANCEL_BEFORE_FUNDING: "CANCELLED_BEFORE_FUNDING",
    HOLD: "HELD",
  }),
  HASH_BOUND: Object.freeze({
    OBSERVE_SOURCE_FUNDING: "SOURCE_FUNDED",
    EXPIRE_RESERVATION: "EXPIRED",
    CANCEL_BEFORE_FUNDING: "CANCELLED_BEFORE_FUNDING",
    HOLD: "HELD",
  }),
  SOURCE_FUNDED: Object.freeze({
    CONFIRM_SOURCE_FUNDING: "SOURCE_CONFIRMED",
    OBSERVE_SOURCE_REFUND: "REFUNDED",
    HOLD: "HELD",
  }),
  SOURCE_CONFIRMED: Object.freeze({
    OBSERVE_COUNTERPARTY_LOCK: "COUNTERPARTY_LOCKED",
    OBSERVE_SOURCE_REFUND: "REFUNDED",
    HOLD: "HELD",
  }),
  COUNTERPARTY_LOCKED: Object.freeze({
    OBSERVE_PREIMAGE_REVEAL: "PREIMAGE_REVEALED",
    OBSERVE_COUNTERPARTY_REFUND: "REFUND_PENDING_SOURCE",
    HOLD: "HELD",
  }),
  REFUND_PENDING_SOURCE: Object.freeze({
    OBSERVE_SOURCE_REFUND: "REFUNDED",
    HOLD: "HELD",
  }),
  PREIMAGE_REVEALED: Object.freeze({
    OBSERVE_BOTH_CLAIMS: "BOTH_CLAIMS_OBSERVED",
    HOLD: "HELD",
  }),
  BOTH_CLAIMS_OBSERVED: Object.freeze({
    FINALIZE_SETTLEMENT: "SETTLED",
    HOLD: "HELD",
  }),
});

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function contentId(value) {
  return `sha256:${crypto.createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function sha256Id(value, label) {
  if (typeof value !== "string" || !SHA256_ID.test(value)) {
    throw new Error(`${label} must be a canonical sha256 identity`);
  }
  return value;
}

function positiveDecimal(value, label) {
  if (typeof value !== "string" || !DECIMAL.test(value) || value === "0") {
    throw new Error(`${label} must be a positive canonical decimal string`);
  }
  return BigInt(value);
}

function boundedPositiveDecimal(value, label, maximum, maximumLabel) {
  const parsed = positiveDecimal(value, label);
  if (parsed > BigInt(maximum)) {
    throw new Error(`${label} exceeds ${maximumLabel}`);
  }
  return parsed;
}

function validateContract(raw) {
  const contract = exactKeys(
    structuredClone(raw),
    [
      "schema",
      "pair",
      "direction",
      "bitcoin_network",
      "void_chain_id",
      "void_network_identity",
      "quote_id",
      "reserve_snapshot_id",
      "bitcoin_amount_satoshis",
      "void_amount_atoms",
      "hashlock_sha256",
      "bitcoin_refund_horizon_seconds",
      "void_refund_horizon_seconds",
      "minimum_refund_safety_margin_seconds",
      "contract_id",
    ],
    "contract",
  );
  if (contract.schema !== CONTRACT_SCHEMA) throw new Error("contract schema mismatch");
  if (contract.pair !== PAIR) throw new Error("official pair must be native_btc/native_void");
  if (!new Set(["BTC_TO_VOID", "VOID_TO_BTC"]).has(contract.direction)) {
    throw new Error("contract direction mismatch");
  }
  if (contract.bitcoin_network !== "bitcoin_regtest") {
    throw new Error("Phase-0 fixture must use bitcoin_regtest");
  }
  if (contract.void_chain_id !== 2050) throw new Error("VOID chain ID must be 2050");
  if (contract.void_network_identity !== "isolated_chain_2050_test_v1") {
    throw new Error("Phase-0 fixture must use isolated Chain-2050 identity");
  }
  sha256Id(contract.quote_id, "contract.quote_id");
  sha256Id(contract.reserve_snapshot_id, "contract.reserve_snapshot_id");
  boundedPositiveDecimal(
    contract.bitcoin_amount_satoshis,
    "contract.bitcoin_amount_satoshis",
    BITCOIN_MAX_MONEY_SATOSHIS_V1,
    "Bitcoin MAX_MONEY",
  );
  boundedPositiveDecimal(
    contract.void_amount_atoms,
    "contract.void_amount_atoms",
    VOID_MAX_SUPPLY_ATOMS_V1,
    "VOID maximum supply",
  );
  if (typeof contract.hashlock_sha256 !== "string" || !HEX64.test(contract.hashlock_sha256)) {
    throw new Error("contract.hashlock_sha256 must be lowercase hex64");
  }
  const btcHorizon = positiveDecimal(
    contract.bitcoin_refund_horizon_seconds,
    "contract.bitcoin_refund_horizon_seconds",
  );
  const voidHorizon = positiveDecimal(
    contract.void_refund_horizon_seconds,
    "contract.void_refund_horizon_seconds",
  );
  const margin = positiveDecimal(
    contract.minimum_refund_safety_margin_seconds,
    "contract.minimum_refund_safety_margin_seconds",
  );
  if (
    contract.direction === "BTC_TO_VOID" &&
    btcHorizon < voidHorizon + margin
  ) {
    throw new Error("BTC_TO_VOID requires the Bitcoin refund horizon to be safely longer");
  }
  if (
    contract.direction === "VOID_TO_BTC" &&
    voidHorizon < btcHorizon + margin
  ) {
    throw new Error("VOID_TO_BTC requires the VOID refund horizon to be safely longer");
  }
  const { contract_id: suppliedId, ...payload } = contract;
  if (suppliedId !== contentId(payload)) throw new Error("contract_id content mismatch");
  return contract;
}

function validateEvent(raw, index, contract) {
  const label = `events[${index}]`;
  const event = exactKeys(
    structuredClone(raw),
    [
      "schema",
      "contract_id",
      "event_type",
      "from_phase",
      "to_phase",
      "refund_asset_role",
      "evidence_id",
      "event_id",
    ],
    label,
  );
  if (event.schema !== EVENT_SCHEMA) throw new Error(`${label}.schema mismatch`);
  if (event.contract_id !== contract.contract_id) {
    throw new Error(`${label}.contract_id mismatch`);
  }
  if (typeof event.event_type !== "string" || !EVENT_TYPES.has(event.event_type)) {
    throw new Error(`${label}.event_type must be a supported v1 event name`);
  }
  const sourceRefundRole =
    contract.direction === "BTC_TO_VOID" ? "SOURCE_NATIVE_BTC" : "SOURCE_NATIVE_VOID";
  const counterpartyRefundRole =
    contract.direction === "BTC_TO_VOID"
      ? "COUNTERPARTY_NATIVE_VOID"
      : "COUNTERPARTY_NATIVE_BTC";
  const expectedRefundRole =
    event.event_type === "OBSERVE_SOURCE_REFUND"
      ? sourceRefundRole
      : event.event_type === "OBSERVE_COUNTERPARTY_REFUND"
        ? counterpartyRefundRole
        : "NOT_A_REFUND";
  if (event.refund_asset_role !== expectedRefundRole) {
    throw new Error(`${label}.refund_asset_role mismatch`);
  }
  sha256Id(event.evidence_id, `${label}.evidence_id`);
  const { event_id: suppliedId, ...payload } = event;
  if (suppliedId !== contentId(payload)) throw new Error(`${label}.event_id content mismatch`);
  return event;
}

export function evaluateBtcVoidAtomicSettlementTraceV1(raw) {
  const request = exactKeys(
    structuredClone(raw),
    ["schema", "contract", "initial_phase", "events"],
    "trace",
  );
  if (request.schema !== TRACE_SCHEMA) throw new Error("trace schema mismatch");
  if (request.initial_phase !== "RESERVED") {
    throw new Error("trace must start at RESERVED");
  }
  if (!Array.isArray(request.events)) throw new Error("events must be an array");
  if (request.events.length > MAX_EVENTS) throw new Error("events exceeds the v1 limit");
  const contract = validateContract(request.contract);
  const events = request.events.map((event, index) =>
    validateEvent(event, index, contract),
  );

  let phase = request.initial_phase;
  const appliedEventIds = [];
  const seenEvents = new Map();
  const evidenceOwners = new Map();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const prior = seenEvents.get(event.event_id);
    if (prior) {
      if (canonicalJson(prior) !== canonicalJson(event)) {
        throw new Error(`events[${index}] reuses an event_id with changed content`);
      }
      continue;
    }
    const evidenceOwner = evidenceOwners.get(event.evidence_id);
    if (evidenceOwner) {
      throw new Error(
        `events[${index}] reuses evidence_id from a different event`,
      );
    }
    if (TERMINAL_PHASES.has(phase)) {
      throw new Error(`events[${index}] attempts to reopen terminal phase ${phase}`);
    }
    if (event.from_phase !== phase) {
      throw new Error(`events[${index}].from_phase does not match current phase`);
    }
    const expected = TRANSITIONS[phase]?.[event.event_type];
    if (!expected || expected !== event.to_phase) {
      throw new Error(`events[${index}] transition is not allowed`);
    }
    seenEvents.set(event.event_id, event);
    evidenceOwners.set(event.evidence_id, event.event_id);
    appliedEventIds.push(event.event_id);
    phase = event.to_phase;
  }

  const evaluation = {
    schema: EVALUATION_SCHEMA,
    marker: VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1,
    contract_id: contract.contract_id,
    direction: contract.direction,
    final_phase: phase,
    terminal: TERMINAL_PHASES.has(phase),
    applied_event_ids: appliedEventIds,
    invariants: {
      official_pair_native_btc_native_void_only: true,
      native_integer_amounts_bound: true,
      native_amounts_within_chain_supply_limits: true,
      regtest_and_isolated_chain_2050_only: true,
      asymmetric_refund_safety_margin_proven: true,
      transitions_fail_closed: true,
      exact_event_replay_idempotent: true,
      terminal_states_cannot_reopen: true,
      every_transition_receipt_backed: true,
      distinct_transitions_require_distinct_receipts: true,
      refund_receipts_bind_explicit_native_asset_roles: true,
      both_locked_refund_requires_both_asset_resolutions: true,
      no_automatic_retry: true,
    },
    authority: {
      source_only_fixture_evaluation: true,
      live_market_observed: false,
      executable_inventory_reserved: false,
      wallet_or_signer_accessed: false,
      transaction_constructed: false,
      transaction_broadcast: false,
      liquidity_seeded: false,
      presale_mutated: false,
      funds_moved: false,
    },
  };
  return deepFreeze({ ...evaluation, evaluation_id: contentId(evaluation) });
}

async function readBoundedStdin() {
  return readBtcVoidBoundedStdinV1({
    stream: process.stdin,
    maxBytes: MAX_STDIN_BYTES,
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--pretty") || args.length > 1) {
    throw new Error("usage: void-btc-void-atomic-settlement-state-invariants-v1.mjs [--pretty] < trace.json");
  }
  const result = evaluateBtcVoidAtomicSettlementTraceV1(
    JSON.parse(await readBoundedStdin()),
  );
  process.stdout.write(JSON.stringify(result, null, args[0] === "--pretty" ? 2 : 0) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1}_HOLD: ${error.message}\n`);
    process.exitCode = 1;
  });
}
