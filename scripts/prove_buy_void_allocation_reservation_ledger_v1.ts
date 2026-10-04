#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1,
  classifyBuyVoidAllocationReservationLedgerV1,
  planBuyVoidAllocationReservationV1,
} from "../src/economic/buy_void_allocation_reservation_ledger_v1.js";

const sha = (hex: string): string =>
  "sha256:" + hex.repeat(64);

const baseInput = {
  ledger_jsonl: "",
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  payment_transaction_hash: "0x" + "a".repeat(64),
  payment_log_index: 7,
  buyer_delivery_wallet: "0x" + "1".repeat(40),
  quote_void_amount: "6",
  quote_usdc_amount: "3",
  pool_void_total: "10",
  verified_payment_receipt_ref: sha("1"),
  duplicate_payment_guard_result: sha("2"),
  inventory_allocation_guard_result: sha("3"),
  operator_activation_record_ref: sha("4"),
  created_at_ms: 1_800_000_000_000,
  verified_payment_gate_green: true,
  duplicate_payment_guard_green: true,
  inventory_allocation_guard_green: true,
  operator_activation_record_green: true,
} as const;

function expectHeld(
  decision: ReturnType<
    typeof planBuyVoidAllocationReservationV1
  >,
  reason: string,
): void {
  assert.equal(decision.ok, false);
  if (decision.ok) {
    throw new Error("expected allocation reservation HOLD");
  }
  assert.equal(decision.status, "held");
  assert.equal(decision.reason, reason);
}

const empty =
  classifyBuyVoidAllocationReservationLedgerV1("");
assert.equal(empty.ok, true);
if (!empty.ok) throw new Error("expected empty ledger valid");
assert.equal(empty.record_count, 0);
assert.equal(empty.tip_hash,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1);
assert.equal(empty.reserved_void_total, "0");
assert.equal(empty.remaining_void, null);

const first = planBuyVoidAllocationReservationV1(baseInput);
assert.equal(first.ok, true);
if (!first.ok) throw new Error("expected first reservation planned");
assert.equal(first.status, "planned");
assert.equal(first.idempotent, false);
assert.equal(first.operation_performed, false);
assert.equal(first.record.record_type, "allocation_reserved");
assert.match(first.record.record_id, /^voidalloc1_[0-9a-f]{64}$/u);
assert.equal(first.record.source_chain, "base");
assert.equal(
  first.record.canonical_payment_identity,
  "voidpay1:base:0x" + "a".repeat(64) + ":7",
);
assert.equal(
  first.record.previous_allocation_record_hash,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1,
);
assert.equal(first.record.pool_void_total_before, "10");
assert.equal(first.record.reserved_void_total_before, "0");
assert.equal(first.record.remaining_void_before, "10");
assert.equal(first.record.reserved_void_total_after, "6");
assert.equal(first.record.remaining_void_after, "4");
assert.match(
  first.record.allocation_record_hash,
  /^sha256:[0-9a-f]{64}$/u,
);
assert.equal(first.next_record_count, 1);

const ledger1 = first.next_ledger_jsonl;
const classified1 =
  classifyBuyVoidAllocationReservationLedgerV1(ledger1);
assert.equal(classified1.ok, true);
if (!classified1.ok) throw new Error("expected first ledger valid");
assert.equal(classified1.record_count, 1);
assert.equal(classified1.pool_void_total, "10");
assert.equal(classified1.reserved_void_total, "6");
assert.equal(classified1.remaining_void, "4");
assert.equal(classified1.tip_hash, first.record.allocation_record_hash);

const retry = planBuyVoidAllocationReservationV1({
  ...baseInput,
  ledger_jsonl: ledger1,
  created_at_ms: baseInput.created_at_ms + 10_000,
});
assert.equal(retry.ok, true);
if (!retry.ok) throw new Error("expected exact retry idempotent");
assert.equal(retry.status, "idempotent");
assert.equal(retry.idempotent, true);
assert.equal(retry.next_ledger_jsonl, ledger1);
assert.equal(retry.next_record_count, 1);
assert.equal(
  retry.record.allocation_record_hash,
  first.record.allocation_record_hash,
);

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    ledger_jsonl: ledger1,
    pool_void_total: "11",
  }),
  "allocation_reservation_idempotent_pool_mismatch",
);

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    ledger_jsonl: ledger1,
    buyer_delivery_wallet: "0x" + "2".repeat(40),
  }),
  "allocation_reservation_idempotent_binding_mismatch",
);

const second = planBuyVoidAllocationReservationV1({
  ...baseInput,
  ledger_jsonl: ledger1,
  request_id: "buyvoid_b_bbbbbbbb",
  payment_transaction_hash: "0x" + "b".repeat(64),
  payment_log_index: "0x8",
  buyer_delivery_wallet: "0x" + "2".repeat(40),
  quote_void_amount: "4.000000",
  quote_usdc_amount: "2.000000",
  verified_payment_receipt_ref: sha("5"),
  duplicate_payment_guard_result: sha("6"),
  inventory_allocation_guard_result: sha("7"),
  operator_activation_record_ref: sha("8"),
  created_at_ms: baseInput.created_at_ms + 1,
});
assert.equal(second.ok, true);
if (!second.ok) throw new Error("expected second reservation planned");
assert.equal(second.status, "planned");
assert.equal(second.record.payment_log_index, "8");
assert.equal(second.record.quote_void_amount, "4");
assert.equal(second.record.quote_usdc_amount, "2");
assert.equal(
  second.record.previous_allocation_record_hash,
  first.record.allocation_record_hash,
);
assert.equal(second.record.reserved_void_total_before, "6");
assert.equal(second.record.remaining_void_before, "4");
assert.equal(second.record.reserved_void_total_after, "10");
assert.equal(second.record.remaining_void_after, "0");

const ledger2 = second.next_ledger_jsonl;
const classified2 =
  classifyBuyVoidAllocationReservationLedgerV1(ledger2);
assert.equal(classified2.ok, true);
if (!classified2.ok) throw new Error("expected sold-out ledger valid");
assert.equal(classified2.record_count, 2);
assert.equal(classified2.reserved_void_total, "10");
assert.equal(classified2.remaining_void, "0");

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    ledger_jsonl: ledger2,
    request_id: "buyvoid_c_cccccccc",
    payment_transaction_hash: "0x" + "c".repeat(64),
    payment_log_index: 9,
    buyer_delivery_wallet: "0x" + "3".repeat(40),
    quote_void_amount: "0.000001",
    quote_usdc_amount: "0.000001",
    verified_payment_receipt_ref: sha("9"),
    duplicate_payment_guard_result: sha("a"),
    inventory_allocation_guard_result: sha("b"),
    operator_activation_record_ref: sha("c"),
    created_at_ms: baseInput.created_at_ms + 2,
  }),
  "allocation_reservation_remaining_inventory_insufficient",
);

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    ledger_jsonl: ledger1,
    request_id: "buyvoid_c_cccccccc",
  }),
  "allocation_reservation_duplicate_canonical_payment_identity",
);

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    ledger_jsonl: ledger1,
    payment_transaction_hash: "0x" + "d".repeat(64),
    payment_log_index: 10,
  }),
  "allocation_reservation_duplicate_request_id",
);

for (const key of [
  "verified_payment_gate_green",
  "duplicate_payment_guard_green",
  "inventory_allocation_guard_green",
  "operator_activation_record_green",
] as const) {
  expectHeld(
    planBuyVoidAllocationReservationV1({
      ...baseInput,
      [key]: false,
    }),
    "allocation_reservation_prerequisite_gate_not_green",
  );
}

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    quote_void_amount: "0",
  }),
  "allocation_reservation_quote_void_invalid",
);

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    buyer_delivery_wallet: "0x1234",
  }),
  "allocation_reservation_buyer_wallet_invalid",
);

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    verified_payment_receipt_ref: "not-a-ref",
  }),
  "allocation_reservation_verified_payment_ref_invalid",
);

const ethereum = planBuyVoidAllocationReservationV1({
  ...baseInput,
  source_chain: "eth",
});
assert.equal(ethereum.ok, true);
if (!ethereum.ok) throw new Error("expected eth alias normalized");
assert.equal(ethereum.record.source_chain, "ethereum");
assert.equal(
  ethereum.record.canonical_payment_identity,
  "voidpay1:ethereum:0x" + "a".repeat(64) + ":7",
);

const malformed =
  classifyBuyVoidAllocationReservationLedgerV1("{bad}\n");
assert.equal(malformed.ok, false);
if (malformed.ok) throw new Error("expected malformed ledger HOLD");
assert.equal(malformed.reason,
  "allocation_reservation_ledger_json_invalid");

const noFinalNewline =
  classifyBuyVoidAllocationReservationLedgerV1(
    ledger1.slice(0, -1),
  );
assert.equal(noFinalNewline.ok, false);
if (noFinalNewline.ok) {
  throw new Error("expected final-newline HOLD");
}
assert.equal(
  noFinalNewline.reason,
  "allocation_reservation_ledger_missing_final_newline",
);

const firstLine = ledger1.trimEnd();
const exactDuplicate =
  classifyBuyVoidAllocationReservationLedgerV1(
    firstLine + "\n" + firstLine + "\n",
  );
assert.equal(exactDuplicate.ok, false);
if (exactDuplicate.ok) {
  throw new Error("expected duplicate record HOLD");
}
assert.equal(
  exactDuplicate.reason,
  "allocation_reservation_duplicate_record_hash",
);

const rows2 = ledger2.trimEnd().split("\n").map(
  (line) => JSON.parse(line),
);
rows2[1].previous_allocation_record_hash =
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1;
const wrongPrevious =
  classifyBuyVoidAllocationReservationLedgerV1(
    rows2.map((row) => JSON.stringify(row)).join("\n") + "\n",
  );
assert.equal(wrongPrevious.ok, false);
if (wrongPrevious.ok) {
  throw new Error("expected wrong previous hash HOLD");
}
assert.equal(
  wrongPrevious.reason,
  "allocation_reservation_previous_hash_mismatch",
);

const tampered = JSON.parse(firstLine);
tampered.verified_payment_receipt_ref = sha("f");
const hashTamper =
  classifyBuyVoidAllocationReservationLedgerV1(
    JSON.stringify(tampered) + "\n",
  );
assert.equal(hashTamper.ok, false);
if (hashTamper.ok) throw new Error("expected hash tamper HOLD");
assert.equal(
  hashTamper.reason,
  "allocation_reservation_hash_mismatch",
);

const extraField = JSON.parse(firstLine);
extraField.unreviewed = true;
const extra =
  classifyBuyVoidAllocationReservationLedgerV1(
    JSON.stringify(extraField) + "\n",
  );
assert.equal(extra.ok, false);
if (extra.ok) throw new Error("expected closed schema HOLD");
assert.equal(
  extra.reason,
  "allocation_reservation_record_shape_invalid",
);

assert.deepEqual(
  VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_AUTHORITY_V1,
  {
    source_contract: true,
    pure_planning: true,
    append_only_jsonl_contract: true,
    hash_chain_validation: true,
    duplicate_request_rejection: true,
    duplicate_payment_identity_rejection: true,
    exact_inventory_arithmetic: true,
    runtime_integration: false,
    filesystem_read: false,
    filesystem_write: false,
    allocation_reservation_write: false,
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
  VOID_BUY_VOID_ALLOCATION_RESERVATION_LEDGER_V1 +
    "_GREEN",
);
console.log("record_type=allocation_reserved");
console.log("canonical_payment_identity_bound=true");
console.log("request_id_unique=true");
console.log("canonical_payment_identity_unique=true");
console.log("hash_chain_append_only=true");
console.log("genesis_previous_hash_bound=true");
console.log("exact_micro_void_inventory_math=true");
console.log("exact_retry_idempotent_without_append=true");
console.log("oversell_rejected=true");
console.log("closed_record_schema=true");
console.log("runtime_integration=false");
console.log("filesystem_write=false");
console.log("allocation_reservation_write=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
