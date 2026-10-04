#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1,
  planBuyVoidAllocationReservationV1,
} from "../src/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1,
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
  deriveBuyVoidAllocationReservationHighWaterV1,
  planBuyVoidAllocationReservationHighWaterAdvanceV1,
} from "../src/economic/buy_void_allocation_reservation_high_water_v1.js";

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

function requireOk<T>(
  value: T,
): Extract<T, { ok: true }> {
  const runtime = value as T & {
    ok: boolean;
    reason?: string;
  };
  if (runtime.ok !== true) {
    throw new Error(runtime.reason ?? "unexpected_hold");
  }
  return value as Extract<T, { ok: true }>;
}

function requireDerived(
  ledger: string,
) {
  return requireOk(
    deriveBuyVoidAllocationReservationHighWaterV1(ledger),
  );
}

function requirePlanned(
  decision: ReturnType<
    typeof planBuyVoidAllocationReservationV1
  >,
) {
  return requireOk(decision);
}

function expectHeld(
  decision:
    | ReturnType<
        typeof classifyBuyVoidAllocationReservationHighWaterBindingV1
      >
    | ReturnType<
        typeof planBuyVoidAllocationReservationHighWaterAdvanceV1
      >,
  reason: string,
): void {
  const runtime = decision as {
    ok: boolean;
    reason?: string;
  };
  assert.equal(runtime.ok, false);
  assert.equal(runtime.reason, reason);
}

const empty = requireDerived("");
assert.equal(empty.status, "derived");
assert.equal(empty.operation_performed, false);
assert.equal(empty.high_water.record_count, 0);
assert.equal(
  empty.high_water.tip_hash,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1,
);
assert.equal(empty.high_water.ledger_bytes, 0);
assert.equal(
  empty.high_water.ledger_sha256,
  "sha256:e3b0c44298fc1c149afbf4c8996fb924" +
    "27ae41e4649b934ca495991b7852b855",
);
assert.equal(empty.high_water.pool_void_total, "10000000");
assert.equal(empty.high_water.reserved_void_total, "0");
assert.equal(empty.high_water.remaining_void, "10000000");

const emptyBound = requireOk(
  classifyBuyVoidAllocationReservationHighWaterBindingV1({
    ledger_jsonl: "",
    high_water_json: empty.high_water_json,
  }),
);
assert.equal(
  emptyBound.rollback_safe_for_presented_authoritative_high_water,
  true,
);

const first = requirePlanned(
  planBuyVoidAllocationReservationV1(baseInput),
);
const ledger1 = first.next_ledger_jsonl;
const high1 = requireDerived(ledger1);
assert.equal(high1.high_water.record_count, 1);
assert.equal(
  high1.high_water.tip_hash,
  first.record.allocation_record_hash,
);
assert.equal(high1.high_water.reserved_void_total, "6");
assert.equal(high1.high_water.remaining_void, "9999994");

const firstAdvance = requireOk(
  planBuyVoidAllocationReservationHighWaterAdvanceV1({
    current_ledger_jsonl: "",
    current_high_water_json: empty.high_water_json,
    next_ledger_jsonl: ledger1,
  }),
);
assert.equal(firstAdvance.status, "planned");
assert.equal(firstAdvance.idempotent, false);
assert.equal(firstAdvance.next_high_water.record_count, 1);

const firstRetry = requireOk(
  planBuyVoidAllocationReservationHighWaterAdvanceV1({
    current_ledger_jsonl: ledger1,
    current_high_water_json: high1.high_water_json,
    next_ledger_jsonl: ledger1,
  }),
);
assert.equal(firstRetry.status, "idempotent");
assert.equal(firstRetry.idempotent, true);
assert.equal(
  firstRetry.next_high_water_json,
  high1.high_water_json,
);

const second = requirePlanned(
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
const high2 = requireDerived(ledger2);
assert.equal(high2.high_water.record_count, 2);
assert.equal(high2.high_water.reserved_void_total, "10");
assert.equal(high2.high_water.remaining_void, "9999990");

const secondAdvance = requireOk(
  planBuyVoidAllocationReservationHighWaterAdvanceV1({
    current_ledger_jsonl: ledger1,
    current_high_water_json: high1.high_water_json,
    next_ledger_jsonl: ledger2,
  }),
);
assert.equal(secondAdvance.status, "planned");
assert.equal(secondAdvance.next_high_water.record_count, 2);

for (const rolledBackLedger of ["", ledger1]) {
  expectHeld(
    classifyBuyVoidAllocationReservationHighWaterBindingV1({
      ledger_jsonl: rolledBackLedger,
      high_water_json: high2.high_water_json,
    }),
    "allocation_reservation_high_water_binding_mismatch",
  );
}

const mutateHighWater = (
  json: string,
  field: string,
  value: unknown,
): string => {
  const parsed = JSON.parse(json);
  parsed[field] = value;
  return JSON.stringify(parsed) + "\n";
};

for (const [field, value] of [
  ["record_count", 9],
  ["tip_hash", sha("f")],
  ["ledger_sha256", sha("e")],
  ["ledger_bytes", 1],
  ["reserved_void_total", "999"],
  ["remaining_void", "1"],
] as const) {
  expectHeld(
    classifyBuyVoidAllocationReservationHighWaterBindingV1({
      ledger_jsonl: ledger2,
      high_water_json: mutateHighWater(
        high2.high_water_json,
        field,
        value,
      ),
    }),
    "allocation_reservation_high_water_binding_mismatch",
  );
}

expectHeld(
  classifyBuyVoidAllocationReservationHighWaterBindingV1({
    ledger_jsonl: ledger2,
    high_water_json:
      JSON.stringify(
        JSON.parse(high2.high_water_json),
        null,
        2,
      ) + "\n",
  }),
  "allocation_reservation_high_water_serialization_noncanonical",
);

expectHeld(
  planBuyVoidAllocationReservationHighWaterAdvanceV1({
    current_ledger_jsonl: "",
    current_high_water_json: empty.high_water_json,
    next_ledger_jsonl: ledger2,
  }),
  "allocation_reservation_high_water_advance_record_count_invalid",
);

const alternateFirst = requirePlanned(
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
  planBuyVoidAllocationReservationHighWaterAdvanceV1({
    current_ledger_jsonl: ledger1,
    current_high_water_json: high1.high_water_json,
    next_ledger_jsonl: alternateFirst.next_ledger_jsonl,
  }),
  "allocation_reservation_high_water_advance_not_exact_append",
);

expectHeld(
  planBuyVoidAllocationReservationHighWaterAdvanceV1({
    current_ledger_jsonl: ledger1,
    current_high_water_json: high2.high_water_json,
    next_ledger_jsonl: ledger2,
  }),
  "allocation_reservation_high_water_binding_mismatch",
);

assert.deepEqual(
  VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_AUTHORITY_V1,
  {
    source_contract: true,
    pure_high_water_binding: true,
    exact_record_count_binding: true,
    exact_tip_hash_binding: true,
    exact_ledger_sha256_binding: true,
    exact_ledger_byte_length_binding: true,
    exact_inventory_state_binding: true,
    monotonic_single_append_validation: true,
    rollback_detection_with_authoritative_high_water: true,
    protected_high_water_storage: false,
    crash_recoverable_publication: false,
    runtime_integration: false,
    filesystem_read: false,
    filesystem_write: false,
    allocation_reservation_write: false,
    high_water_write: false,
    payment_verified_event_write: false,
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
  VOID_BUY_VOID_ALLOCATION_RESERVATION_HIGH_WATER_V1 +
    "_GREEN",
);
console.log("record_count_bound=true");
console.log("tip_hash_bound=true");
console.log("ledger_sha256_bound=true");
console.log("ledger_byte_length_bound=true");
console.log("inventory_state_bound=true");
console.log("rollback_to_empty_rejected_with_authoritative_high_water=true");
console.log("rollback_to_valid_prefix_rejected_with_authoritative_high_water=true");
console.log("exact_single_record_append_required=true");
console.log("idempotent_unchanged_state_allowed=true");
console.log("protected_high_water_storage=false");
console.log("crash_recoverable_publication=false");
console.log("runtime_integration=false");
console.log("filesystem_write=false");
console.log("allocation_reservation_write=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
