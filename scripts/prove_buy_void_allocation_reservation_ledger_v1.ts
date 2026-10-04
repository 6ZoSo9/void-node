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
assert.equal(first.record.coupled_launch_id, baseInput.launch_authority.coupled_launch_id);
assert.equal(
  first.record.source_composition_id,
  baseInput.launch_authority.source_composition_id,
);
assert.equal(
  first.record.activation_generation,
  baseInput.launch_authority.activation_generation,
);
assert.equal(
  first.record.generation_tip_sha256,
  baseInput.launch_authority.generation_tip_sha256,
);
assert.equal(
  first.record.activation_receipt_id,
  baseInput.launch_authority.activation_receipt_id,
);
assert.equal(
  first.record.activation_receipt_sha256,
  baseInput.launch_authority.activation_receipt_sha256,
);
assert.equal(first.record.expires_at_ms, baseInput.launch_authority.expires_at_ms);
assert.equal(
  first.record.payment_verified_event_sha256,
  baseInput.payment_verified_event_sha256,
);
assert.equal(
  first.record.canonical_payment_identity,
  "voidpay1:base:0x" + "a".repeat(64) + ":7",
);
assert.equal(
  first.record.previous_allocation_record_hash,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1,
);
assert.equal(first.record.pool_void_total_before, "10000000");
assert.equal(first.record.reserved_void_total_before, "0");
assert.equal(first.record.remaining_void_before, "10000000");
assert.equal(first.record.reserved_void_total_after, "6");
assert.equal(first.record.remaining_void_after, "9999994");
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
assert.equal(classified1.pool_void_total, "10000000");
assert.equal(classified1.reserved_void_total, "6");
assert.equal(classified1.remaining_void, "9999994");
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

for (const [key, value] of [
  ["coupled_launch_id", sha("9")],
  ["source_composition_id", sha("8")],
  ["activation_generation", "0x" + "7".repeat(64)],
  ["generation_tip_sha256", sha("6")],
  ["activation_receipt_id", "voidbclive1_" + "5".repeat(64)],
  ["activation_receipt_sha256", "4".repeat(64)],
  ["expires_at_ms", baseInput.launch_authority.expires_at_ms + 1],
] as const) {
  expectHeld(
    planBuyVoidAllocationReservationV1({
      ...baseInput,
      ledger_jsonl: ledger1,
      launch_authority: {
        ...baseInput.launch_authority,
        [key]: value,
      },
    }),
    "allocation_reservation_idempotent_binding_mismatch",
  );
}
expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    ledger_jsonl: ledger1,
    payment_verified_event_sha256: sha("3"),
  }),
  "allocation_reservation_idempotent_binding_mismatch",
);

const changedEventIdentity =
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    payment_verified_event_sha256: sha("3"),
  });
assert.equal(changedEventIdentity.ok, true);
if (!changedEventIdentity.ok) {
  throw new Error("expected changed event lineage planned on empty ledger");
}
assert.notEqual(
  changedEventIdentity.record.record_id,
  first.record.record_id,
  "record ID must bind exact durable payment_verified event bytes",
);

const changedLaunchIdentity =
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    launch_authority: {
      ...baseInput.launch_authority,
      activation_generation: "0x" + "7".repeat(64),
    },
  });
assert.equal(changedLaunchIdentity.ok, true);
if (!changedLaunchIdentity.ok) {
  throw new Error("expected changed launch lineage planned on empty ledger");
}
assert.notEqual(
  changedLaunchIdentity.record.record_id,
  first.record.record_id,
  "record ID must bind immutable request launch authority",
);

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    ledger_jsonl: ledger1,
    pool_void_total: "10000001",
  }),
  "allocation_reservation_canonical_pool_mismatch",
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
  quote_void_amount: "9999994.000000",
  quote_usdc_amount: "4999997.000000",
  verified_payment_receipt_ref: sha("5"),
  payment_verified_event_sha256: sha("e"),
  launch_authority: {
    marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    version: 1,
    coupled_launch_id: sha("1"),
    source_composition_id: sha("2"),
    activation_generation: "0x" + "3".repeat(64),
    generation_tip_sha256: sha("4"),
    activation_receipt_id: "voidbclive1_" + "5".repeat(64),
    activation_receipt_sha256: "6".repeat(64),
    expires_at_ms: baseInput.launch_authority.expires_at_ms + 1,
  },
  duplicate_payment_guard_result: sha("6"),
  inventory_allocation_guard_result: sha("7"),
  operator_activation_record_ref: sha("8"),
  created_at_ms: baseInput.created_at_ms + 1,
});
assert.equal(second.ok, true);
if (!second.ok) throw new Error("expected second reservation planned");
assert.equal(second.status, "planned");
assert.equal(second.record.payment_log_index, "8");
assert.equal(second.record.quote_void_amount, "9999994");
assert.equal(second.record.quote_usdc_amount, "4999997");
assert.equal(
  second.record.previous_allocation_record_hash,
  first.record.allocation_record_hash,
);
assert.equal(second.record.reserved_void_total_before, "6");
assert.equal(second.record.remaining_void_before, "9999994");
assert.equal(second.record.reserved_void_total_after, "10000000");
assert.equal(second.record.remaining_void_after, "0");

const ledger2 = second.next_ledger_jsonl;
const classified2 =
  classifyBuyVoidAllocationReservationLedgerV1(ledger2);
assert.equal(classified2.ok, true);
if (!classified2.ok) throw new Error("expected sold-out ledger valid");
assert.equal(classified2.record_count, 2);
assert.equal(classified2.reserved_void_total, "10000000");
assert.equal(classified2.remaining_void, "0");

// Internal hash-chain validation alone cannot distinguish current history from a
// genuine older valid prefix or an empty genesis. Runtime integration must bind
// record_count + tip_hash to a separately protected monotonic high-water.
const rollbackPrefix =
  classifyBuyVoidAllocationReservationLedgerV1(ledger1);
assert.equal(rollbackPrefix.ok, true);
if (!rollbackPrefix.ok) {
  throw new Error("expected genuine prefix internally valid");
}
assert.equal(rollbackPrefix.record_count, 1);
assert.equal(rollbackPrefix.tip_hash, first.record.allocation_record_hash);
const rollbackEmpty =
  classifyBuyVoidAllocationReservationLedgerV1("");
assert.equal(rollbackEmpty.ok, true);
if (!rollbackEmpty.ok) {
  throw new Error("expected empty ledger internally valid");
}
assert.equal(rollbackEmpty.record_count, 0);
assert.equal(
  rollbackEmpty.tip_hash,
  VOID_BUY_VOID_ALLOCATION_RESERVATION_GENESIS_HASH_V1,
);

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    ledger_jsonl: ledger2,
    request_id: "buyvoid_c_cccccccc",
    payment_transaction_hash: "0x" + "c".repeat(64),
    payment_log_index: 9,
    buyer_delivery_wallet: "0x" + "3".repeat(40),
    quote_void_amount: "0.000002",
    quote_usdc_amount: "0.000001",
    verified_payment_receipt_ref: sha("9"),
    payment_verified_event_sha256: sha("8"),
    launch_authority: {
      marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
      version: 1,
      coupled_launch_id: sha("7"),
      source_composition_id: sha("6"),
      activation_generation: "0x" + "5".repeat(64),
      generation_tip_sha256: sha("4"),
      activation_receipt_id: "voidbclive1_" + "3".repeat(64),
      activation_receipt_sha256: "2".repeat(64),
      expires_at_ms: baseInput.launch_authority.expires_at_ms + 2,
    },
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

const oversizedAmount = "9".repeat(33);
expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    quote_void_amount: oversizedAmount,
  }),
  "allocation_reservation_quote_void_invalid",
);

{
  const oversizedRecord = JSON.parse(ledger1.trimEnd());
  oversizedRecord.quote_void_amount = oversizedAmount;
  const oversizedLedger = JSON.stringify(oversizedRecord) + "\n";
  const oversizedLedgerDecision =
    classifyBuyVoidAllocationReservationLedgerV1(oversizedLedger);
  assert.equal(oversizedLedgerDecision.ok, false);
  if (oversizedLedgerDecision.ok) {
    throw new Error("expected oversized ledger amount HOLD");
  }
  assert.equal(
    oversizedLedgerDecision.reason,
    "allocation_reservation_quote_void_invalid",
  );
}

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    quote_usdc_amount: "4",
  }),
  "allocation_reservation_presale_rate_mismatch",
);

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    pool_void_total: "9999999",
  }),
  "allocation_reservation_canonical_pool_mismatch",
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
    buyer_delivery_wallet:
      "0x0000000000000000000000000000000000000000",
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

expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    payment_verified_event_sha256: "not-a-ref",
  }),
  "allocation_reservation_payment_verified_event_sha256_invalid",
);

for (const [key, value, reason] of [
  [
    "coupled_launch_id",
    "sha256:bad",
    "allocation_reservation_coupled_launch_id_invalid",
  ],
  [
    "source_composition_id",
    "sha256:bad",
    "allocation_reservation_source_composition_id_invalid",
  ],
  [
    "activation_generation",
    "0x1234",
    "allocation_reservation_activation_generation_invalid",
  ],
  [
    "generation_tip_sha256",
    "sha256:bad",
    "allocation_reservation_generation_tip_invalid",
  ],
  [
    "activation_receipt_id",
    "voidbclive1_bad",
    "allocation_reservation_activation_receipt_id_invalid",
  ],
  [
    "activation_receipt_sha256",
    "bad",
    "allocation_reservation_activation_receipt_sha256_invalid",
  ],
  [
    "expires_at_ms",
    0,
    "allocation_reservation_launch_expiry_invalid",
  ],
] as const) {
  expectHeld(
    planBuyVoidAllocationReservationV1({
      ...baseInput,
      launch_authority: {
        ...baseInput.launch_authority,
        [key]: value,
      },
    }),
    reason,
  );
}

for (const launchAuthority of [
  null,
  { ...baseInput.launch_authority, marker: "WRONG" },
  { ...baseInput.launch_authority, version: 2 },
  { ...baseInput.launch_authority, unexpected: true },
]) {
  expectHeld(
    planBuyVoidAllocationReservationV1({
      ...baseInput,
      launch_authority: launchAuthority,
    }),
    "allocation_reservation_request_launch_authority_invalid",
  );
}

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

const u32Max = planBuyVoidAllocationReservationV1({
  ...baseInput,
  payment_log_index: "4294967295",
});
assert.equal(u32Max.ok, true);
if (!u32Max.ok) throw new Error("expected uint32 max log index");
assert.equal(u32Max.record.payment_log_index, "4294967295");

for (const overflow of ["4294967296", "0x100000000"]) {
  expectHeld(
    planBuyVoidAllocationReservationV1({
      ...baseInput,
      payment_log_index: overflow,
    }),
    "allocation_reservation_payment_log_index_invalid",
  );
}
expectHeld(
  planBuyVoidAllocationReservationV1({
    ...baseInput,
    payment_log_index: "9".repeat(1000),
  }),
  "allocation_reservation_payment_log_index_invalid",
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

const truncatedGenesis = JSON.parse(firstLine);
truncatedGenesis.reserved_void_total_before = "1";
truncatedGenesis.remaining_void_before = "9999999";
truncatedGenesis.reserved_void_total_after = "7";
truncatedGenesis.remaining_void_after = "9999993";
const truncatedGenesisDecision =
  classifyBuyVoidAllocationReservationLedgerV1(
    JSON.stringify(truncatedGenesis) + "\n",
  );
assert.equal(truncatedGenesisDecision.ok, false);
if (truncatedGenesisDecision.ok) {
  throw new Error("expected truncated genesis HOLD");
}
assert.equal(
  truncatedGenesisDecision.reason,
  "allocation_reservation_genesis_inventory_state_invalid",
);

const duplicateHashRows = ledger2.trimEnd().split("\n").map(
  (line) => JSON.parse(line),
);
duplicateHashRows[1].allocation_record_hash =
  duplicateHashRows[0].allocation_record_hash;
const exactDuplicate =
  classifyBuyVoidAllocationReservationLedgerV1(
    duplicateHashRows.map((row) => JSON.stringify(row)).join("\n") + "\n",
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

const reorderedRecord = JSON.parse(firstLine);
const reorderedLine = JSON.stringify(
  Object.fromEntries(
    Object.entries(reorderedRecord).reverse(),
  ),
);
assert.notEqual(reorderedLine, firstLine);
const reordered =
  classifyBuyVoidAllocationReservationLedgerV1(
    reorderedLine + "\n",
  );
assert.equal(reordered.ok, false);
if (reordered.ok) {
  throw new Error("expected noncanonical serialization HOLD");
}
assert.equal(
  reordered.reason,
  "allocation_reservation_record_serialization_noncanonical",
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
    canonical_presale_economics_bound: true,
    external_high_water_binding: false,
    rollback_detection: false,
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
console.log("payment_log_index_uint32_bound=true");
console.log("oversized_payment_log_index_rejected_before_bigint=true");
console.log("request_id_unique=true");
console.log("canonical_payment_identity_unique=true");
console.log("hash_chain_append_only=true");
console.log("genesis_previous_hash_bound=true");
console.log("genesis_reserved_inventory_zero=true");
console.log("truncated_history_as_genesis_rejected=true");
console.log("exact_micro_void_inventory_math=true");
console.log("canonical_presale_pool_void=10000000");
console.log("canonical_presale_rate_void_per_usdc=2");
console.log("exact_retry_idempotent_without_append=true");
console.log("oversell_rejected=true");
console.log("closed_record_schema=true");
console.log("canonical_jsonl_serialization_required=true");
console.log("valid_prefix_internal_continuity_only=true");
console.log("empty_ledger_internal_continuity_only=true");
console.log("external_high_water_binding=false");
console.log("rollback_detection=false");
console.log("runtime_integration=false");
console.log("filesystem_write=false");
console.log("allocation_reservation_write=false");
console.log("production_gate_ready=false");
console.log("amount_text_prebounded_before_bigint=true");
console.log("funds_movement=false");
