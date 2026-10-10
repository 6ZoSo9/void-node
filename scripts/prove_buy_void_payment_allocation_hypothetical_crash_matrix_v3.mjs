#!/usr/bin/env node
// Reviewed V3 successor to frozen V1 and V2 source-only crash matrices.
// Neither historical V1 nor V2 proof is modified or repinned. Never writes allocation,
// payment, wallet, signer, transaction, customer or production storage.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyBuyVoidVerifiedAllocationReplayBindingV1,
} from "../dist/economic/buy_void_verified_allocation_replay_binding_v1.js";
import {
  classifyBuyVoidAllocationReservationLedgerV1,
  planBuyVoidAllocationReservationV1,
} from "../dist/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../dist/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  buildBuyVoidAllocationReservationPublicationIntentV1,
  classifyBuyVoidAllocationReservationPublicationRecoveryV1,
} from "../dist/economic/buy_void_allocation_reservation_publication_protocol_v1.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_BLOBS = Object.freeze({
  "src/economic/buy_void_allocation_reservation_ledger_v1.ts":
    "66617a89d5ad9f81b5a21d98cca55fcda6902a80",
  "src/economic/buy_void_verified_allocation_replay_binding_v1.ts":
    "895a429ec7a2ef554552cdaa821731d7a645a701",
  "src/economic/buy_void_allocation_reservation_high_water_v1.ts":
    "9383c94cf848efb9a0112f1b741df4e10f790ac6",
  "src/economic/buy_void_allocation_reservation_publication_protocol_v1.ts":
    "b0fe98427a7bdf1c39c41fb64e94f3f142d6636b",
});
const FROZEN_V1_CRASH_PROOF_BLOB = "1a8db260a134ad438366d5b7660f926768c98a79";
const FROZEN_V2_CRASH_PROOF_BLOB = "d42148523c44d95d3b87236ade22cfb92dcb5bee";
const REVIEWED_COMBINED_SOURCE_HEAD = "452ac177df4ac63d53cac36ba10216ff68495a77";
function sourceBlob(bytes) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0", "utf8"))
    .update(bytes).digest("hex");
}
for (const [relative, expected] of Object.entries(SOURCE_BLOBS)) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  assert.ok(bytes.length < 128 * 1024, "source_size_bound:" + relative);
  assert.equal(sourceBlob(bytes), expected, "reviewed_source_blob_drift:" + relative);
}

// The prior V1 reviewer must continue to reject this changed original-wallet
// source generation. Reproduce its immutable proof file bytes, not its output
// or an unchecked text match masquerading as a historical identity.
const frozenV1 = fs.readFileSync(path.join(ROOT,
  "scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v1.mjs"));
assert.equal(sourceBlob(frozenV1),FROZEN_V1_CRASH_PROOF_BLOB,
  "frozen_historical_V1_crash_source_modified");
const frozenV2 = fs.readFileSync(path.join(ROOT,
  "scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v2.mjs"));
assert.equal(sourceBlob(frozenV2),FROZEN_V2_CRASH_PROOF_BLOB,
  "frozen_historical_V2_crash_source_modified");

const receipt = x => "sha256:" + x.repeat(64);
const tx = x => "0x" + x.repeat(64);
const address = x => "0x" + x.repeat(40);
const rows = sourceRows => Buffer.from(
  sourceRows.map(row => JSON.stringify(row)).join("\n") +
    (sourceRows.length ? "\n" : ""),
  "utf8",
);
const paymentId = (chain, transaction, log) =>
  "voidpay1:" + chain + ":" + transaction + ":" + log;
const POOL = "10000000", NATIVE_BASE_USDC =
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const LAUNCH = Object.freeze({
  marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
  version: 1,
  coupled_launch_id: receipt("a"),
  source_composition_id: receipt("b"),
  activation_generation: tx("c"),
  generation_tip_sha256: receipt("d"),
  activation_receipt_id: "voidbclive1_" + "e".repeat(64),
  activation_receipt_sha256: "f".repeat(64),
  expires_at_ms: 1800000300000,
});
const firstRequest = Object.freeze({
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  tx_hash: tx("1"),
  quoted_void: "6",
  usdc_amount: "3",
  delivery_address: address("2"),
  receive_address: address("3"),
  usdc_contract: NATIVE_BASE_USDC,
  launch_authority: LAUNCH,
});
const firstEvent = Object.freeze({
  schema: "void_buy_void_verified_payment_event_v2",
  marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id: firstRequest.request_id,
  operator_status: "payment_verified",
  payment_verified: true,
  payment_identity_input_complete: true,
  marked_at_ms: 1800000000001,
  tx_hash: firstRequest.tx_hash,
  quoted_void: firstRequest.quoted_void,
  payment_verifier: {
    chain: firstRequest.source_chain,
    transaction_hash: firstRequest.tx_hash,
    log_index: "7",
    block_number: "100",
    confirmations: "12",
    usdc_contract: NATIVE_BASE_USDC,
    from_address: firstRequest.delivery_address,
    receive_address: firstRequest.receive_address,
    delivery_address: firstRequest.delivery_address,
    amount_units: "3000000",
    requested_units: "3000000",
  },
});
const requestHistory = rows([firstRequest]);
const verifiedEvents = rows([firstEvent]);
function replay(requests=requestHistory, events=verifiedEvents, allocation=Buffer.alloc(0)) {
  return classifyBuyVoidVerifiedAllocationReplayBindingV1({
    request_id: firstRequest.request_id,
    requests_jsonl: requests,
    operator_events_jsonl: events,
    allocation_jsonl: allocation,
  });
}
function held(actual, status="held") {
  assert.equal(actual.ok, false, "no simulated HOLD may claim allocated payment");
  assert.equal(actual.status, status);
  assert.equal(actual.operation_performed, false);
}
function ok(value, status) {
  assert.equal(value.ok, true, value.reason);
  assert.equal(value.status, status);
  if (Object.prototype.hasOwnProperty.call(value, "operation_performed")) {
    assert.equal(value.operation_performed, false);
  }
  return value;
}
function plan(baseOverrides={}) {
  return planBuyVoidAllocationReservationV1({
    ledger_jsonl: "",
    request_id: firstRequest.request_id,
    source_chain: firstRequest.source_chain,
    payment_transaction_hash: firstRequest.tx_hash,
    payment_log_index: "7",
    launch_authority: firstRequest.launch_authority,
    buyer_delivery_wallet: firstRequest.delivery_address,
    quote_void_amount: firstRequest.quoted_void,
    quote_usdc_amount: firstRequest.usdc_amount,
    pool_void_total: POOL,
    verified_payment_receipt_ref: receipt("1"),
    payment_verified_event_sha256: observedGap.payment_verified_event_sha256,
    duplicate_payment_guard_result: receipt("2"),
    inventory_allocation_guard_result: receipt("3"),
    operator_activation_record_ref: receipt("4"),
    created_at_ms: 1800000000002,
    // Synthetic planner-only inputs, deliberately NOT trusted as proof of
    // fsync, duplicate/capacity locks, protected custody, or source finality.
    verified_payment_gate_green: true,
    duplicate_payment_guard_green: true,
    inventory_allocation_guard_green: true,
    operator_activation_record_green: true,
    ...baseOverrides,
  });
}

// BEFORE a durable verified-payment line: the separate classifier MUST HOLD.
held(replay(requestHistory, rows([])), "held");

// HYPOTHETICAL crash after payment_verified fsync and before allocation append.
// These in-memory bytes MODEL a durable event; do not establish it was fsynced.
const observedGap = replay();
held(observedGap, "verified_allocation_missing");
assert.equal(observedGap.reason, "verified_allocation_requires_protected_recovery");
assert.equal(observedGap.canonical_payment_identity,
  paymentId("base", firstRequest.tx_hash, "7"));
const exactEventSha = "sha256:" + crypto.createHash("sha256")
  .update(verifiedEvents).digest("hex");
assert.equal(observedGap.payment_verified_event_sha256, exactEventSha);
assert.equal(observedGap.unallocated_verified_void_micro, "6000000");
assert.equal(observedGap.authority.independently_proven_event_fsync, false);
assert.equal(observedGap.authority.capacity_lock_held, false);
assert.equal(observedGap.authority.production_gate_ready, false);

// Guard against forged Buffer .length hiding a previously verified event.
const shortenedVerified = Buffer.from(verifiedEvents);
Object.defineProperty(shortenedVerified,"length",{value:0,configurable:true});
const hiddenPrior = replay(requestHistory,shortenedVerified);
held(hiddenPrior,"held");
assert.equal(hiddenPrior.reason,"operator_events_bytes_invalid");

// First hypothetical repair uses the EXISTING canonical immutable allocation
// record builder; never constructs a second record type or identity format.
const allocationCandidate = ok(plan(), "planned");
assert.equal(allocationCandidate.idempotent, false);
assert.equal(allocationCandidate.record.payment_verified_event_sha256, exactEventSha);
assert.equal(allocationCandidate.record.canonical_payment_identity,
  observedGap.canonical_payment_identity);
assert.equal(allocationCandidate.record.quote_void_amount, "6");
assert.equal(allocationCandidate.record.quote_usdc_amount, "3");
assert.match(allocationCandidate.record.record_id, /^voidalloc1_[0-9a-f]{64}$/u);
const ledger1 = allocationCandidate.next_ledger_jsonl;
const forgedLedgerBuffer = Buffer.from(ledger1,"utf8");
Object.defineProperty(forgedLedgerBuffer,"length",{value:0,configurable:true});
const idempotentForgedLength = plan({
  ledger_jsonl:forgedLedgerBuffer,
  created_at_ms:1800000000055,
});
assert.equal(idempotentForgedLength.ok,true,idempotentForgedLength.reason);
assert.equal(idempotentForgedLength.status,"idempotent");
assert.equal(idempotentForgedLength.next_ledger_jsonl,ledger1);
assert.equal(idempotentForgedLength.record.record_id,allocationCandidate.record.record_id);
// V2 permanent first-original delivery-wallet falsifiers. No later request
// snapshot, even one agreeing with a forged verified event and a canonical
// allocation row, may retrofit a buyer wallet missing in the FIRST request.
for(const initial of [undefined,null,""]){
  const rowsAfterBackfill=rows([
    {...firstRequest,delivery_address:initial},
    firstRequest
  ]);
  for(const events of [rows([]),verifiedEvents]){
    const classified= replay(rowsAfterBackfill,events);
    held(classified,"held");
    assert.equal(classified.reason,"request_initial_delivery_address_missing");
  }
  const forgedAllocation=replay(
    rowsAfterBackfill,verifiedEvents,Buffer.from(ledger1,"utf8"));
  held(forgedAllocation,"held");
  assert.equal(forgedAllocation.reason,"request_initial_delivery_address_missing");
}
// The originally populated wallet stays bound: changing it in any later
// snapshot must HOLD even if the verifier and allocation agree with latest.
const changedBuyer=rows([
  firstRequest,
  {...firstRequest,delivery_address:address("9")}
]);
const changedBuyerReplay=replay(changedBuyer,verifiedEvents);
held(changedBuyerReplay,"held");
assert.equal(changedBuyerReplay.reason,"request_history_lineage_drift");
// Late transaction and receiver binding are distinct legitimate updates.
// They must not be confused with late BUYER wallet assignment.
const legitimateLateOtherFields=replay(rows([
  {...firstRequest,tx_hash:undefined,receive_address:undefined},
  firstRequest
]),verifiedEvents,Buffer.from(ledger1,"utf8"));
assert.equal(legitimateLateOtherFields.status,"allocation_present");
assert.equal(legitimateLateOtherFields.ok,true);
assert.equal(legitimateLateOtherFields.allocation_record_id,
  allocationCandidate.record.record_id);

const classified = ok(classifyBuyVoidAllocationReservationLedgerV1(ledger1), "valid");
assert.equal(classified.record_count, 1);
assert.equal(classified.reserved_void_total, "6");
assert.equal(classified.remaining_void, "9999994");

// HYPOTHETICAL crash after allocation-ledger append but before high-water
// fsync: allocation replay alone says allocation_present, but dual-root
// publication is STILL INCOMPLETE and cannot answer production SUCCESS.
const emptyHW = ok(deriveBuyVoidAllocationReservationHighWaterV1(""), "derived");
const nextHW = ok(deriveBuyVoidAllocationReservationHighWaterV1(ledger1), "derived");
const publication = ok(buildBuyVoidAllocationReservationPublicationIntentV1({
  current_ledger_jsonl: "",
  current_high_water_json: emptyHW.high_water_json,
  next_ledger_jsonl: ledger1,
}), "intent_built");
const phase = (ledger, highWater) =>
  classifyBuyVoidAllocationReservationPublicationRecoveryV1({
    intent_bytes: publication.intent_json,
    observed_ledger_jsonl: ledger,
    observed_high_water_json: highWater,
  });
const pending = ok(phase("", emptyHW.high_water_json), "recoverable");
assert.equal(pending.phase, "intent_only");
assert.equal(pending.write_ledger_append_required, true);
assert.equal(pending.write_high_water_required, true);
const ledgerOnly = ok(phase(ledger1, emptyHW.high_water_json), "recoverable");
assert.equal(ledgerOnly.phase, "ledger_committed");
assert.equal(ledgerOnly.write_ledger_append_required, false);
assert.equal(ledgerOnly.write_high_water_required, true);
const replayAfterLedger = replay(requestHistory, verifiedEvents,
  Buffer.from(ledger1,"utf8"));
assert.equal(replayAfterLedger.status, "allocation_present");
assert.equal(replayAfterLedger.allocation_record_id,
  allocationCandidate.record.record_id);
// The publication protocol is the separate authority here: its "ledger_committed"
// status must NEVER be conflated with completed durable two-root publication.
assert.notEqual(ledgerOnly.phase, "complete");
const complete = ok(phase(ledger1,nextHW.high_water_json), "recoverable");
assert.equal(complete.phase, "complete");
assert.equal(complete.write_ledger_append_required, false);
assert.equal(complete.write_high_water_required, false);
assert.equal(replayAfterLedger.unallocated_verified_void_micro, "0");

// HYPOTHETICAL crash after complete publication, before response or sidecar.
// Planner must be EXACTLY IDEMPOTENT: never append another allocation or pay.
const retry = ok(plan({
  ledger_jsonl:ledger1,
  created_at_ms:1800000000500,
}), "idempotent");
assert.equal(retry.idempotent,true);
assert.equal(retry.record.record_id, allocationCandidate.record.record_id);
assert.equal(retry.next_ledger_jsonl,ledger1);
assert.equal(retry.next_record_count,1);
assert.equal(replay(requestHistory,verifiedEvents,Buffer.from(ledger1)).status,
  "allocation_present");

// Divergent same-request/payment replay, quote changes, and pool drift HOLD.
for(const changed of [
  {payment_transaction_hash:tx("9")},
  {request_id:"buyvoid_b_bbbbbbbb", payment_transaction_hash:firstRequest.tx_hash},
  {quote_void_amount:"8", quote_usdc_amount:"4"},
  {payment_verified_event_sha256:receipt("9")},
  {launch_authority:{...LAUNCH,activation_generation:tx("9")}},
  {pool_void_total:"10000001"},
]) {
  const rejected=plan({ledger_jsonl:ledger1,...changed});
  assert.equal(rejected.ok,false,JSON.stringify(changed));
  assert.equal(rejected.status,"held");
}
held(replay(requestHistory, rows([]), Buffer.from(ledger1)), "held");
held(replay(requestHistory, verifiedEvents,
  Buffer.from(ledger1.replace(/"quote_void_amount":"6"/u,
    '"quote_void_amount":"8"'))), "held");
held(replay(rows([{...firstRequest,usdc_contract:undefined}]),verifiedEvents), "held");
held(replay(requestHistory, rows([{...firstEvent,
  payment_verifier:{...firstEvent.payment_verifier,usdc_contract:address("8")}}])), "held");
const duplicateEvent = {...firstEvent,marked_at_ms:firstEvent.marked_at_ms+1};
held(replay(requestHistory,rows([firstEvent,duplicateEvent])), "held");

// The finite 10m VOID pool is independently enforced by the canonical pure
// planner. This is NOT proof of concurrent admission's global lock.
const soldOut = ok(plan({
  ledger_jsonl:ledger1, request_id:"buyvoid_b_bbbbbbbb",
  source_chain:"base",payment_transaction_hash:tx("b"),payment_log_index:"8",
  buyer_delivery_wallet:address("4"), quote_void_amount:"9999994",
  quote_usdc_amount:"4999997",verified_payment_receipt_ref:receipt("5"),
  payment_verified_event_sha256:receipt("6"),
  duplicate_payment_guard_result:receipt("7"),
  inventory_allocation_guard_result:receipt("8"),
  operator_activation_record_ref:receipt("9"),created_at_ms:1800000000003,
}),"planned");
const full = ok(classifyBuyVoidAllocationReservationLedgerV1(
  soldOut.next_ledger_jsonl),"valid");
assert.equal(full.remaining_void,"0");
assert.equal(full.reserved_void_total,"10000000");
// Verify the EXACT capacity reason, not merely a rejection of malformed test
// inputs. The old V3 fixture spelled a noncanonical extra top-level key
// "payment_verified_receipt_ref", causing an unrelated plain-data rejection.
const validOversellInput = {
  ledger_jsonl:soldOut.next_ledger_jsonl,request_id:"buyvoid_c_cccccccc",
  source_chain:"base",payment_transaction_hash:tx("c"),payment_log_index:"9",
  buyer_delivery_wallet:address("5"),quote_void_amount:"2",
  quote_usdc_amount:"1",verified_payment_receipt_ref:receipt("5"),
  payment_verified_event_sha256:receipt("e"),created_at_ms:1800000000004,
};
const malformedOversell = plan({
  ...validOversellInput, payment_verified_receipt_ref:receipt("5"),
});
assert.equal(malformedOversell.ok,false);
assert.equal(malformedOversell.status,"held");
assert.equal(malformedOversell.reason,
  "allocation_reservation_input_not_plain_data");
const excess=plan(validOversellInput);
assert.equal(excess.ok,false);
assert.equal(excess.status,"held");
assert.equal(excess.reason,
  "allocation_reservation_remaining_inventory_insufficient");

// A green synthetic matrix means ONLY the pure source contracts are internally
// composable for fixed fixtures. No fsync / original-history / custody proof,
// no runtime hook, no change to separate payment-capacity accounting.
const report = Object.freeze({
  marker:"VOID_BUY_VOID_PAYMENT_ALLOCATION_HYPOTHETICAL_CRASH_MATRIX_V3",
  source_only:true,
  historical_v2_original_source_github_head:"f7c894eb2ff8f378b2f0a906192cc1a0602e1d24",
  reviewed_combined_source_head:REVIEWED_COMBINED_SOURCE_HEAD,
  predecessor_replay_source_blob_sha1:"feb1f0e3fea1ff07406cd3b8fcd315c48338596f",
  reviewed_current_replay_source_blob_sha1:
    "895a429ec7a2ef554552cdaa821731d7a645a701",
  historical_v2_source_runtime_generation_commit:"7da490d56556ab98b5515f5eba53bf6a8f118203",
  reviewed_current_allocation_source_blob_sha1:
    "66617a89d5ad9f81b5a21d98cca55fcda6902a80",
  frozen_predecessor_crash_proof_git_blob_sha1:FROZEN_V1_CRASH_PROOF_BLOB,
  frozen_historical_V1_proof_unchanged:true,
  frozen_historical_V2_proof_unchanged:true,
  frozen_historical_V2_proof_git_blob_sha1:FROZEN_V2_CRASH_PROOF_BLOB,
  forged_prior_event_buffer_length_rejected:true,
  forged_allocation_buffer_length_does_not_erase_idempotent_reservation:true,
  initial_buyer_wallet_missing_variants_rejected:3,
  late_buyer_wallet_backfill_verified_allocation_rejected:true,
  changed_original_buyer_wallet_rejected:true,
  late_tx_and_receive_with_original_wallet_positive:true,
  original_event_line_sha256:exactEventSha,
  canonical_payment_identity:observedGap.canonical_payment_identity,
  candidate_record_id:allocationCandidate.record.record_id,
  observed_publication_phases:["intent_only","ledger_committed","complete"],
  next_allocation_record_count:1,
  inventory_units_after_first:"9999994",
  inventory_units_after_synthetic_sellout:"0",
  valid_oversell_rejected_for_insufficient_inventory:true,
  malformed_oversell_input_rejected_for_distinct_plain_data_reason:true,
  exact_replay_idempotent:true,
  conflicting_identity_rejected:true,
  malformed_or_orphan_history_rejected:true,
  proposed_allocation_mutated:false,
  actual_durable_payment_fsync_verified:false,
  verified_capacity_and_request_locks_held:false,
  independently_proven_original_request:false,
  protected_high_water_custody_verified:false,
  allocation_publication_integrated:false,
  exactly_once_allocation_production_ready:false,
  signer_or_wallet_access:false,
  production_source_finality_authority_ready:false,
  presale_activation:false,
  funds_moved:false,
});
process.stdout.write(JSON.stringify(report,null,2) + "\n");
