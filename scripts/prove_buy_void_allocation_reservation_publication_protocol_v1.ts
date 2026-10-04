#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  planBuyVoidAllocationReservationV1,
} from "../src/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../src/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1,
  buildBuyVoidAllocationReservationPublicationIntentV1,
  buyVoidAllocationReservationPublicationRetryMatchesV1,
  classifyBuyVoidAllocationReservationPublicationRecoveryV1,
} from "../src/economic/buy_void_allocation_reservation_publication_protocol_v1.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);

const baseInput = {
  ledger_jsonl: "",
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  payment_transaction_hash: "0x" + "a".repeat(64),
  payment_log_index: 7,
  launch_authority: {
    marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    version: 1,
    coupled_launch_id: sha("a"),
    source_composition_id: sha("b"),
    activation_generation: "0x" + "c".repeat(64),
    generation_tip_sha256: sha("d"),
    activation_receipt_id: "voidbclive1_" + "e".repeat(64),
    activation_receipt_sha256: "f".repeat(64),
    expires_at_ms: 1_800_000_300_000,
  },
  buyer_delivery_wallet: "0x" + "1".repeat(40),
  quote_void_amount: "6",
  quote_usdc_amount: "3",
  pool_void_total: "10000000",
  verified_payment_receipt_ref: sha("1"),
  payment_verified_event_sha256: sha("0"),
  duplicate_payment_guard_result: sha("2"),
  inventory_allocation_guard_result: sha("3"),
  operator_activation_record_ref: sha("4"),
  created_at_ms: 1_800_000_000_000,
  verified_payment_gate_green: true,
  duplicate_payment_guard_green: true,
  inventory_allocation_guard_green: true,
  operator_activation_record_green: true,
} as const;

function requireLedgerPlan(
  decision: ReturnType<
    typeof planBuyVoidAllocationReservationV1
  >,
) {
  if (decision.ok === false) {
    throw new Error(decision.reason);
  }
  return decision;
}

function requireHighWater(
  ledger: string,
) {
  const decision =
    deriveBuyVoidAllocationReservationHighWaterV1(ledger);
  if (decision.ok === false) {
    throw new Error(decision.reason);
  }
  return decision;
}

function requireIntent(
  decision: ReturnType<
    typeof buildBuyVoidAllocationReservationPublicationIntentV1
  >,
) {
  if (decision.ok === false) {
    throw new Error(decision.reason);
  }
  return decision;
}

function requireRecovery(
  decision: ReturnType<
    typeof classifyBuyVoidAllocationReservationPublicationRecoveryV1
  >,
) {
  if (decision.ok === false) {
    throw new Error(decision.reason);
  }
  return decision;
}

function expectHeld(
  decision:
    | ReturnType<
        typeof buildBuyVoidAllocationReservationPublicationIntentV1
      >
    | ReturnType<
        typeof classifyBuyVoidAllocationReservationPublicationRecoveryV1
      >,
  reason: string,
): void {
  assert.equal(decision.ok, false);
  if (decision.ok === true) {
    throw new Error("expected publication HOLD");
  }
  assert.equal(decision.reason, reason);
}

const emptyHighWater = requireHighWater("");

const first = requireLedgerPlan(
  planBuyVoidAllocationReservationV1(baseInput),
);
const ledger1 = first.next_ledger_jsonl;
const high1 = requireHighWater(ledger1);

const firstIntent = requireIntent(
  buildBuyVoidAllocationReservationPublicationIntentV1({
    current_ledger_jsonl: "",
    current_high_water_json:
      emptyHighWater.high_water_json,
    next_ledger_jsonl: ledger1,
  }),
);
assert.equal(firstIntent.status, "intent_built");
assert.equal(firstIntent.operation_performed, false);
assert.equal(firstIntent.record_id, first.record.record_id);
assert.equal(
  firstIntent.record_hash,
  first.record.allocation_record_hash,
);
assert.match(
  firstIntent.intent_sha256,
  /^sha256:[0-9a-f]{64}$/u,
);

const firstIntentAgain = requireIntent(
  buildBuyVoidAllocationReservationPublicationIntentV1({
    current_ledger_jsonl: "",
    current_high_water_json:
      emptyHighWater.high_water_json,
    next_ledger_jsonl: ledger1,
  }),
);
assert.equal(
  firstIntentAgain.intent_json,
  firstIntent.intent_json,
);
assert.equal(
  firstIntentAgain.intent_sha256,
  firstIntent.intent_sha256,
);

assert.equal(
  buyVoidAllocationReservationPublicationRetryMatchesV1({
    intent_bytes: firstIntent.intent_json,
    record_id: first.record.record_id,
    record_hash: first.record.allocation_record_hash,
  }),
  true,
);
assert.equal(
  buyVoidAllocationReservationPublicationRetryMatchesV1({
    intent_bytes: firstIntent.intent_json,
    record_id: "voidalloc1_" + "9".repeat(64),
    record_hash: first.record.allocation_record_hash,
  }),
  false,
);

const intentOnly = requireRecovery(
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: firstIntent.intent_json,
    observed_ledger_jsonl: "",
    observed_high_water_json:
      emptyHighWater.high_water_json,
  }),
);
assert.equal(intentOnly.phase, "intent_only");
assert.equal(intentOnly.operation_performed, false);
assert.equal(intentOnly.write_ledger_append_required, true);
assert.equal(intentOnly.write_high_water_required, true);
assert.equal(intentOnly.remove_intent_after_postcheck, true);
assert.equal(
  Buffer.from(
    intentOnly.append_bytes_base64,
    "base64",
  ).toString("utf8"),
  ledger1,
);
assert.equal(
  intentOnly.next_high_water_json,
  high1.high_water_json,
);

const ledgerCommitted = requireRecovery(
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: firstIntent.intent_json,
    observed_ledger_jsonl: ledger1,
    observed_high_water_json:
      emptyHighWater.high_water_json,
  }),
);
assert.equal(ledgerCommitted.phase, "ledger_committed");
assert.equal(
  ledgerCommitted.write_ledger_append_required,
  false,
);
assert.equal(ledgerCommitted.write_high_water_required, true);

const complete = requireRecovery(
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: firstIntent.intent_json,
    observed_ledger_jsonl: ledger1,
    observed_high_water_json: high1.high_water_json,
  }),
);
assert.equal(complete.phase, "complete");
assert.equal(complete.write_ledger_append_required, false);
assert.equal(complete.write_high_water_required, false);

expectHeld(
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: firstIntent.intent_json,
    observed_ledger_jsonl: "",
    observed_high_water_json: high1.high_water_json,
  }),
  "allocation_reservation_publication_high_water_ahead",
);

const second = requireLedgerPlan(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    ledger_jsonl: ledger1,
    request_id: "buyvoid_b_bbbbbbbb",
    payment_transaction_hash: "0x" + "b".repeat(64),
    payment_log_index: 8,
    buyer_delivery_wallet: "0x" + "2".repeat(40),
    quote_void_amount: "4",
    quote_usdc_amount: "2",
    verified_payment_receipt_ref: sha("5"),
    payment_verified_event_sha256: sha("6"),
    duplicate_payment_guard_result: sha("7"),
    inventory_allocation_guard_result: sha("8"),
    operator_activation_record_ref: sha("9"),
    created_at_ms: baseInput.created_at_ms + 1_000,
  }),
);
const ledger2 = second.next_ledger_jsonl;
const high2 = requireHighWater(ledger2);

const secondIntent = requireIntent(
  buildBuyVoidAllocationReservationPublicationIntentV1({
    current_ledger_jsonl: ledger1,
    current_high_water_json: high1.high_water_json,
    next_ledger_jsonl: ledger2,
  }),
);
assert.equal(secondIntent.record_id, second.record.record_id);
assert.equal(
  secondIntent.record_hash,
  second.record.allocation_record_hash,
);

const secondIntentOnly = requireRecovery(
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: secondIntent.intent_json,
    observed_ledger_jsonl: ledger1,
    observed_high_water_json: high1.high_water_json,
  }),
);
assert.equal(secondIntentOnly.phase, "intent_only");
assert.equal(
  Buffer.concat([
    Buffer.from(ledger1, "utf8"),
    Buffer.from(
      secondIntentOnly.append_bytes_base64,
      "base64",
    ),
  ]).toString("utf8"),
  ledger2,
);

const secondLedgerCommitted = requireRecovery(
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: secondIntent.intent_json,
    observed_ledger_jsonl: ledger2,
    observed_high_water_json: high1.high_water_json,
  }),
);
assert.equal(
  secondLedgerCommitted.phase,
  "ledger_committed",
);

const secondComplete = requireRecovery(
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: secondIntent.intent_json,
    observed_ledger_jsonl: ledger2,
    observed_high_water_json: high2.high_water_json,
  }),
);
assert.equal(secondComplete.phase, "complete");

expectHeld(
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: secondIntent.intent_json,
    observed_ledger_jsonl: ledger1,
    observed_high_water_json: high2.high_water_json,
  }),
  "allocation_reservation_publication_high_water_ahead",
);

expectHeld(
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: secondIntent.intent_json,
    observed_ledger_jsonl: "",
    observed_high_water_json: high1.high_water_json,
  }),
  "allocation_reservation_publication_observed_ledger_unknown",
);

expectHeld(
  buildBuyVoidAllocationReservationPublicationIntentV1({
    current_ledger_jsonl: "",
    current_high_water_json:
      emptyHighWater.high_water_json,
    next_ledger_jsonl: ledger2,
  }),
  "allocation_reservation_publication_advance_" +
    "allocation_reservation_high_water_advance_record_count_invalid",
);

expectHeld(
  buildBuyVoidAllocationReservationPublicationIntentV1({
    current_ledger_jsonl: ledger1,
    current_high_water_json: high1.high_water_json,
    next_ledger_jsonl: ledger1,
  }),
  "allocation_reservation_publication_intent_not_required",
);

const alternate = requireLedgerPlan(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    request_id: "buyvoid_c_cccccccc",
    payment_transaction_hash: "0x" + "c".repeat(64),
    payment_log_index: 9,
    buyer_delivery_wallet: "0x" + "3".repeat(40),
    verified_payment_receipt_ref: sha("a"),
    payment_verified_event_sha256: sha("b"),
    duplicate_payment_guard_result: sha("c"),
    inventory_allocation_guard_result: sha("d"),
    operator_activation_record_ref: sha("e"),
  }),
);
expectHeld(
  buildBuyVoidAllocationReservationPublicationIntentV1({
    current_ledger_jsonl: ledger1,
    current_high_water_json: high1.high_water_json,
    next_ledger_jsonl: alternate.next_ledger_jsonl,
  }),
  "allocation_reservation_publication_advance_" +
    "allocation_reservation_high_water_advance_not_exact_append",
);

const tamperedIntentObject = JSON.parse(
  firstIntent.intent_json,
);
tamperedIntentObject.append_bytes_base64 =
  Buffer.from("tampered\n", "utf8").toString("base64");
const tamperedIntent =
  JSON.stringify(tamperedIntentObject) + "\n";
expectHeld(
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: tamperedIntent,
    observed_ledger_jsonl: "",
    observed_high_water_json:
      emptyHighWater.high_water_json,
  }),
  "allocation_reservation_publication_intent_payload_invalid",
);

const prettyIntent =
  JSON.stringify(
    JSON.parse(firstIntent.intent_json),
    null,
    2,
  ) + "\n";
expectHeld(
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: prettyIntent,
    observed_ledger_jsonl: "",
    observed_high_water_json:
      emptyHighWater.high_water_json,
  }),
  "allocation_reservation_publication_intent_serialization_noncanonical",
);

assert.deepEqual(
  VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_AUTHORITY_V1,
  {
    source_contract: true,
    pure_publication_intent: true,
    pure_recovery_classification: true,
    exact_prior_state_binding: true,
    exact_next_state_binding: true,
    single_append_publication: true,
    recoverable_intent_only_phase: true,
    recoverable_ledger_committed_phase: true,
    recoverable_complete_phase: true,
    high_water_ahead_rejected: true,
    unknown_mixed_state_rejected: true,
    runtime_integration: false,
    protected_high_water_storage: false,
    filesystem_read: false,
    filesystem_write: false,
    allocation_reservation_write: false,
    high_water_write: false,
    publication_intent_write: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    market_activation: false,
    public_presale_activation: false,
    production_gate_ready: false,
    funds_movement: false,
  },
);

console.log(
  VOID_BUY_VOID_ALLOCATION_RESERVATION_PUBLICATION_PROTOCOL_V1 +
    "_GREEN",
);
console.log("intent_exact_prior_state_bound=true");
console.log("intent_exact_next_state_bound=true");
console.log("intent_contains_only_single_append_bytes=true");
console.log("intent_next_high_water_bytes_bound=true");
console.log("intent_only_phase_recoverable=true");
console.log("ledger_committed_phase_recoverable=true");
console.log("complete_phase_recoverable=true");
console.log("high_water_ahead_rejected=true");
console.log("unknown_mixed_state_rejected=true");
console.log("multi_record_jump_rejected=true");
console.log("alternate_history_rejected=true");
console.log("retry_record_binding=true");
console.log("runtime_integration=false");
console.log("protected_high_water_storage=false");
console.log("filesystem_write=false");
console.log("allocation_reservation_write=false");
console.log("high_water_write=false");
console.log("publication_intent_write=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
