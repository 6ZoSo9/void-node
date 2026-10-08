#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_AUTHORITY_V1,
  VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1,
  classifyBuyVoidVerifiedAllocationReplayBindingV1,
} from "../dist/economic/buy_void_verified_allocation_replay_binding_v1.js";
import {
  planBuyVoidAllocationReservationV1,
} from "../dist/economic/buy_void_allocation_reservation_ledger_v1.js";

const buf = (rows) => Buffer.from(rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
const tx = (x) => "0x" + x.repeat(64);
const addr = (x) => "0x" + x.repeat(40);
const digest = (x) => "sha256:" + x.repeat(64);
const VOID_POOL = "10000000";
const LAUNCH_AUTHORITY = Object.freeze({
  marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
  version: 1,
  coupled_launch_id: digest("a"),
  source_composition_id: digest("b"),
  activation_generation: tx("c"),
  generation_tip_sha256: digest("d"),
  activation_receipt_id: "voidbclive1_" + "e".repeat(64),
  activation_receipt_sha256: "f".repeat(64),
  expires_at_ms: 1800000300000,
});
const request = Object.freeze({
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  tx_hash: tx("1"),
  quoted_void: "6",
  usdc_amount: "3",
  delivery_address: addr("2"),
  receive_address: addr("3"),
  usdc_contract: addr("4"),
  launch_authority: LAUNCH_AUTHORITY,
});
const event = Object.freeze({
  schema: "void_buy_void_verified_payment_event_v2",
  marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id: request.request_id,
  operator_status: "payment_verified",
  payment_verified: true,
  payment_identity_input_complete: true,
  marked_at_ms: 1800000000001,
  tx_hash: request.tx_hash,
  quoted_void: request.quoted_void,
  payment_verifier: {
    chain: request.source_chain,
    transaction_hash: request.tx_hash,
    log_index: "7",
    block_number: "100",
    confirmations: "12",
    usdc_contract: addr("4"),
    from_address: request.delivery_address,
    receive_address: request.receive_address,
    delivery_address: request.delivery_address,
    amount_units: "3000000",
    requested_units: "3000000",
  },
});

function scan(requestRows = [request], operatorRows = [event], allocationBytes = Buffer.alloc(0), target = request.request_id) {
  return classifyBuyVoidVerifiedAllocationReplayBindingV1({
    request_id: target,
    requests_jsonl: buf(requestRows),
    operator_events_jsonl: buf(operatorRows),
    allocation_jsonl: allocationBytes,
  });
}
function good(result, status) {
  assert.equal(result.marker, VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1);
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.status, status);
  assert.equal(result.operation_performed, false);
  assert.equal(result.authority.production_gate_ready, false);
  assert.equal(result.authority.independently_proven_event_fsync, false);
  assert.equal(result.authority.capacity_lock_held, false);
  assert.equal(result.authority.filesystem_write, false);
  assert.equal(result.authority.runtime_integration, false);
  assert.equal(result.authority.descriptor_bound_read, false);
}
function gap(result) {
  assert.equal(result.marker, VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1);
  assert.equal(result.ok, false, "missing allocation is not an approved outcome");
  assert.equal(result.status, "verified_allocation_missing");
  assert.equal(result.reason, "verified_allocation_requires_protected_recovery");
  assert.equal(result.operation_performed, false);
  assert.equal(result.authority.production_gate_ready, false);
  assert.equal(result.authority.allocation_write, false);
  assert.equal(result.authority.independently_proven_event_fsync, false);
}
function hold(result, contains) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(result.status, "held");
  assert.match(result.reason || "", contains);
  assert.equal(result.operation_performed, false);
  assert.equal(result.payment_verified_event_sha256, null);
}

for (const [key, value] of Object.entries(VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_AUTHORITY_V1)) {
  assert.equal(value, [
    "source_only_snapshot_classifier", "exact_accepted_event_line_commitment",
    "canonical_payment_identity_reused", "canonical_allocation_ledger_classifier_reused",
  ].includes(key), key);
}

// Payment_verified already fsynced is modeled as a complete operator JSONL
// row. The pure classifier cannot prove that these bytes came from storage.
const before = scan();
gap(before);
assert.equal(before.request_id, request.request_id);
assert.equal(before.verified_void_micro, "6000000");
assert.equal(before.unallocated_verified_void_micro, "6000000");
assert.equal(before.canonical_payment_identity, `voidpay1:base:${request.tx_hash}:7`);
assert.equal(before.payment_verified_event_sha256,
  "sha256:" + createHash("sha256").update(buf([event])).digest("hex"));
assert.equal(before.allocation_record_id, null);

const planned = planBuyVoidAllocationReservationV1({
  ledger_jsonl: "",
  request_id: request.request_id,
  source_chain: request.source_chain,
  payment_transaction_hash: request.tx_hash,
  payment_log_index: "7",
  launch_authority: LAUNCH_AUTHORITY,
  buyer_delivery_wallet: request.delivery_address,
  quote_void_amount: request.quoted_void,
  quote_usdc_amount: request.usdc_amount,
  pool_void_total: VOID_POOL,
  verified_payment_receipt_ref: digest("1"),
  payment_verified_event_sha256: before.payment_verified_event_sha256,
  duplicate_payment_guard_result: digest("2"),
  inventory_allocation_guard_result: digest("3"),
  operator_activation_record_ref: digest("4"),
  created_at_ms: 1800000000002,
  // ONLY the separate synthetic planner test uses these booleans. The new
  // replay binder itself never accepts or trusts any such caller assertions.
  verified_payment_gate_green: true,
  duplicate_payment_guard_green: true,
  inventory_allocation_guard_green: true,
  operator_activation_record_green: true,
});
assert.equal(planned.ok, true, planned.reason);
assert.equal(planned.status, "planned");
const allocationBytes = Buffer.from(planned.next_ledger_jsonl, "utf8");
const after = scan([request], [event], allocationBytes);
good(after, "allocation_present");
assert.equal(after.allocation_record_id, planned.record.record_id);
assert.equal(after.unallocated_verified_void_micro, "0");
assert.equal(after.ok, true);
assert.equal(scan([request], [event], allocationBytes).status, "allocation_present");
assert.deepEqual(scan([request], [event], allocationBytes), after);

hold(scan([request], []), /verified_payment_missing/u);
hold(scan([request], [{ ...event, payment_verified: false }]), /verified_payment_v2_identity_incomplete/u);
// P1: absence or malformed coupled launch authority must HOLD even when the
// allocation ledger is empty (payment-fsynced / allocation-missing crash gap).
for (const bad of [
  undefined,
  null,
  {},
  { ...LAUNCH_AUTHORITY, marker: "FORGED" },
  { ...LAUNCH_AUTHORITY, version: 2 },
  { ...LAUNCH_AUTHORITY, activation_receipt_id: undefined },
  { ...LAUNCH_AUTHORITY, activation_receipt_sha256: undefined },
  { ...LAUNCH_AUTHORITY, activation_generation: "0xdeadbeef" },
  { ...LAUNCH_AUTHORITY, expires_at_ms: 0 },
  { ...LAUNCH_AUTHORITY, arbitrary_extra_key: true },
]) {
  const result = scan([{ ...request, launch_authority: bad }], [event]);
  hold(result, /(?:request_launch_authority_invalid|verified_event_request_launch_authority_missing)/u);
}
// A valid but DIFFERENT generation in a later request snapshot conflicts
// with the original tuple. Independent first-generation authority is still
// outside this caller-supplied source-only byte classifier.
hold(scan([request, {
  ...request,
  launch_authority: { ...LAUNCH_AUTHORITY, activation_generation: tx("9") },
}], [event]), /request_history_lineage_drift/u);

// The canonical verified-transfer contract must be present in the retained
// request, not inferred from a caller's arbitrary ERC-20 event.
hold(scan([{ ...request, usdc_contract: undefined }], [event]), /verified_event_request_usdc_contract_missing/u);
hold(scan([{ ...request, usdc_contract: addr("8") }], [event]), /verified_event_usdc_contract_mismatch/u);
hold(scan([request], [{ ...event, payment_verifier: {
  ...event.payment_verifier, usdc_contract: addr("8"),
} }]), /verified_event_usdc_contract_mismatch/u);
hold(scan([request], [{ ...event, payment_verifier: {
  ...event.payment_verifier, usdc_contract: undefined,
} }]), /verified_event_usdc_contract_invalid/u);

// Full snapshots may transition missing -> populated only once. Repeated or
// regressed historical fields must not resurrect stale prior state.
hold(scan([request, request]), /request_history_duplicate_snapshot/u);
for (const key of [
  "tx_hash", "usdc_amount", "delivery_address", "receive_address",
  "usdc_contract", "launch_authority",
]) {
  hold(scan([request, { ...request, [key]: undefined }], [event]), /request_history_lineage_drift/u);
}
const partialOpening = { ...request, tx_hash: "", usdc_contract: undefined,
  launch_authority: undefined, receive_address: undefined };
gap(scan([partialOpening, request], [event]));
hold(scan([{ ...request, quoted_void: "7" }], [event]), /verified_event_request_quote_mismatch/u);
hold(scan([{ ...request, tx_hash: tx("8") }], [event]), /verified_event_transaction_binding_mismatch/u);
// Never substitute Base when either the request or verifier chain is absent.
hold(scan([{ ...request, source_chain: undefined }], [event]), /source_chain_invalid/u);
hold(scan([request], [{ ...event, payment_verifier: {
  ...event.payment_verifier, chain: undefined,
} }]), /source_chain_invalid/u);
hold(scan([{ ...request, delivery_address: addr("7") }], [event]), /verified_event_destination_or_amount_mismatch/u);
hold(scan([request], [{ ...event, payment_verifier: { ...event.payment_verifier, log_index: "8" } }], allocationBytes), /allocation_history_event_lineage_mismatch/u);
hold(scan([request], [{ ...event, marked_at_ms: 1800000000003 }], allocationBytes), /allocation_history_event_lineage_mismatch/u);
hold(scan([request], [], allocationBytes), /verified_payment_missing/u);
hold(scan([request], [event, event]), /verified_payment_duplicate_or_conflicting_event/u);
hold(scan([request, { ...request, quoted_void: "5" }]), /request_history_lineage_drift/u);
hold(scan([request], [{ ...event, operator_status: "pending" }]), /operator_event_conflicting_status/u);

const otherRequest = { ...request, request_id: "buyvoid_b_bbbbbbbb", delivery_address: addr("5") };
const samePaymentOtherRequest = { ...event, request_id: otherRequest.request_id, payment_verifier: {
  ...event.payment_verifier, delivery_address: otherRequest.delivery_address,
  from_address: otherRequest.delivery_address,
} };
hold(scan([request, otherRequest], [event, samePaymentOtherRequest]), /verified_payment_duplicate_or_conflicting_event/u);

const twoRequests = [request, { ...otherRequest, tx_hash: tx("6"), quoted_void: "10000000", usdc_amount: "5000000" }];
const overEvent = { ...event, request_id: twoRequests[1].request_id,
  tx_hash: tx("6"), quoted_void: "10000000", payment_verifier: {
    ...event.payment_verifier, transaction_hash: tx("6"),
    delivery_address: otherRequest.delivery_address, from_address: otherRequest.delivery_address,
    amount_units: "5000000000000", requested_units: "5000000000000",
  } };
hold(scan(twoRequests, [event, overEvent]), /verified_payment_capacity_exceeded/u);

const heldInput = {
  request_id: request.request_id,
  requests_jsonl: buf([request]),
  operator_events_jsonl: buf([event]),
  allocation_jsonl: Buffer.alloc(0),
};
const mutate = (patch) => classifyBuyVoidVerifiedAllocationReplayBindingV1({ ...heldInput, ...patch });
hold(mutate({ operator_events_jsonl: Buffer.from(JSON.stringify(event)) }), /truncated_or_noncanonical/u);
hold(mutate({ operator_events_jsonl: Buffer.from(JSON.stringify(event).replace('"request_id":', '"request_id":"attacker","request_id":') + "\n") }), /noncanonical_row/u);
hold(mutate({ requests_jsonl: Buffer.from("ff", "hex") }), /requests_(?:json_invalid|noncanonical_row)|encoded data|UTF/u);
hold(mutate({ allocation_jsonl: Buffer.from("{}\n") }), /allocation_history_/u);
hold(classifyBuyVoidVerifiedAllocationReplayBindingV1({ ...heldInput, verified_payment_gate_green: true }), /input_shape_invalid/u);

console.log("VOID_BUY_VOID_VERIFIED_ALLOCATION_REPLAY_BINDING_V1_SOURCE_GREEN");
console.log("exact_payment_identity_from_existing_primitive=true");
console.log("exact_verified_event_line_sha256_bound=true");
console.log("missing_allocation_explicit_not_success=true");
console.log("verified_missing_allocation_ok_false=true");
console.log("coupled_launch_authority_required_even_without_allocation=true");
console.log("usdc_contract_matched_to_request_or_held=true");
console.log("request_snapshot_duplicates_or_lineage_erasure_held=true");
console.log("exact_canonical_allocation_history_replay_idempotent=true");
console.log("orphan_conflicting_drift_oversell_history_held=true");
console.log("descriptor_custody_or_payment_fsync_claimed=false");
console.log("allocation_write_or_runtime_activation=false");
console.log("funds_movement=false");
