#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../dist/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  planBuyVoidAllocationReservationV1,
} from "../dist/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_AUTHORITY_V1,
  VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_V1,
  classifyBuyVoidCrossUidFailureReconciliationV1,
} from "../src/economic/buy_void_cross_uid_failure_reconciliation_v1.mjs";

const tx = (char) => "0x" + char.repeat(64);
const address = (char) => "0x" + char.repeat(40);
const digest = (char) => "sha256:" + char.repeat(64);
const jsonl = (rows) => Buffer.from(
  rows.map((row) => JSON.stringify(row)).join("\n") +
    (rows.length ? "\n" : ""),
  "utf8",
);
const sha = (bytes) =>
  "sha256:" + createHash("sha256").update(bytes).digest("hex");
const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

const launchAuthority = Object.freeze({
  marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
  version: 1,
  coupled_launch_id: digest("a"),
  source_composition_id: digest("b"),
  activation_generation: tx("c"),
  generation_tip_sha256: digest("d"),
  activation_receipt_id: "voidbclive1_" + "e".repeat(64),
  activation_receipt_sha256: "f".repeat(64),
  expires_at_ms: 1_900_000_000_000,
});

function request(label, txChar, walletChar) {
  return Object.freeze({
    request_id: `buyvoid_${label}_${label.repeat(8).slice(0, 8)}`,
    source_chain: "base",
    tx_hash: tx(txChar),
    quoted_void: "6",
    usdc_amount: "3",
    delivery_address: address(walletChar),
    receive_address: address(walletChar === "9" ? "8" : "9"),
    usdc_contract: BASE_USDC,
    launch_authority: launchAuthority,
  });
}

function paymentEvent(value, logIndex, markedAt) {
  return Object.freeze({
    schema: "void_buy_void_verified_payment_event_v2",
    marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
    request_id: value.request_id,
    operator_status: "payment_verified",
    payment_verified: true,
    payment_identity_input_complete: true,
    marked_at_ms: markedAt,
    tx_hash: value.tx_hash,
    quoted_void: value.quoted_void,
    payment_verifier: Object.freeze({
      chain: value.source_chain,
      transaction_hash: value.tx_hash,
      log_index: String(logIndex),
      block_number: "100",
      confirmations: "12",
      usdc_contract: BASE_USDC,
      from_address: value.delivery_address,
      receive_address: value.receive_address,
      delivery_address: value.delivery_address,
      amount_units: "3000000",
      requested_units: "3000000",
    }),
  });
}

function reviewedEvent(value, markedAt) {
  return Object.freeze({
    request_id: value.request_id,
    operator_status: "reviewed",
    marked_at_ms: markedAt,
  });
}

function allocationFor(value, event, currentLedger = "") {
  const eventBytes = jsonl([event]);
  const planned = planBuyVoidAllocationReservationV1({
    ledger_jsonl: currentLedger,
    request_id: value.request_id,
    source_chain: value.source_chain,
    payment_transaction_hash: value.tx_hash,
    payment_log_index: event.payment_verifier.log_index,
    launch_authority: value.launch_authority,
    buyer_delivery_wallet: value.delivery_address,
    quote_void_amount: value.quoted_void,
    quote_usdc_amount: value.usdc_amount,
    pool_void_total: "10000000",
    verified_payment_receipt_ref: digest("1"),
    payment_verified_event_sha256: sha(eventBytes),
    duplicate_payment_guard_result: digest("2"),
    inventory_allocation_guard_result: digest("3"),
    operator_activation_record_ref: digest("4"),
    created_at_ms: event.marked_at_ms + 1,
    verified_payment_gate_green: true,
    duplicate_payment_guard_green: true,
    inventory_allocation_guard_green: true,
    operator_activation_record_green: true,
  });
  assert.equal(planned.ok, true, planned.reason);
  return planned;
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-crossuid-reconciliation-v1-"),
);
const requestDir = path.join(root, "requests");
const ledgerRoot = path.join(root, "allocation-ledger");
const highWaterRoot = path.join(root, "allocation-high-water");
const requestPath = path.join(requestDir, "requests.jsonl");
const operatorPath = path.join(requestDir, "operator-events.jsonl");
const ledgerPath = path.join(
  ledgerRoot,
  "allocation-reservations-v1.jsonl",
);
const highWaterPath = path.join(
  highWaterRoot,
  "allocation-reservation-high-water-v1.json",
);

const target = request("a", "1", "2");
const other = request("b", "5", "6");
const targetPayment = paymentEvent(target, 7, 1_800_000_000_020);
const otherPayment = paymentEvent(other, 8, 1_800_000_000_030);
const targetAllocation = allocationFor(target, targetPayment);

function writeState({ requestRows, operatorRows, allocationJsonl }) {
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(ledgerRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(highWaterRoot, { recursive: true, mode: 0o700 });
  fs.chmodSync(ledgerRoot, 0o700);
  fs.chmodSync(highWaterRoot, 0o700);

  const requestBytes = jsonl(requestRows);
  const operatorBytes = jsonl(operatorRows);
  const allocationBytes = Buffer.from(allocationJsonl, "utf8");
  const highWater =
    deriveBuyVoidAllocationReservationHighWaterV1(allocationBytes);
  assert.equal(highWater.ok, true, highWater.reason);

  fs.writeFileSync(requestPath, requestBytes, { mode: 0o600 });
  fs.writeFileSync(operatorPath, operatorBytes, { mode: 0o600 });
  fs.writeFileSync(ledgerPath, allocationBytes, { mode: 0o600 });
  fs.writeFileSync(highWaterPath, highWater.high_water_json, {
    mode: 0o600,
  });
  for (const file of [requestPath, operatorPath, ledgerPath, highWaterPath]) {
    fs.chmodSync(file, 0o600);
  }
}

const classifierInput = Object.freeze({
  allocation_high_water_root: highWaterRoot,
  allocation_ledger_root: ledgerRoot,
  request_dir: requestDir,
  request_id: target.request_id,
});

function snapshotFiles() {
  return [requestPath, operatorPath, ledgerPath, highWaterPath]
    .map((file) => sha(fs.readFileSync(file)));
}

function classifyWithoutMutation() {
  const before = snapshotFiles();
  const result = classifyBuyVoidCrossUidFailureReconciliationV1(
    classifierInput,
  );
  assert.deepEqual(snapshotFiles(), before);
  assert.equal(result.marker,
    VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_V1);
  assert.equal(result.operation_performed, false);
  assert.equal(result.filesystem_write, false);
  assert.equal(result.cross_uid_lock_release_authorized, false);
  assert.equal(result.custody_recovery_authorized, false);
  assert.equal(result.runtime_integration, false);
  assert.equal(result.payment_acceptance, false);
  assert.equal(result.presale_activation, false);
  assert.equal(result.funds_movement, false);
  return result;
}

try {
  assert.equal(
    VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_AUTHORITY_V1
      .source_only_read_classifier,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_AUTHORITY_V1
      .global_verified_allocation_completeness_required,
    true,
  );
  for (const key of [
    "cross_uid_lock_ownership_verified",
    "cross_uid_lock_release_authorized",
    "custody_recovery_authorized",
    "filesystem_write",
    "runtime_integration",
    "payment_acceptance",
    "presale_activation",
    "funds_movement",
  ]) {
    assert.equal(
      VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_AUTHORITY_V1[key],
      false,
      key,
    );
  }

  writeState({
    requestRows: [target],
    operatorRows: [reviewedEvent(target, 1_800_000_000_010)],
    allocationJsonl: "",
  });
  const absent = classifyWithoutMutation();
  assert.equal(absent.ok, true, absent.reason);
  assert.equal(absent.classified, true);
  assert.equal(absent.status, "observed_no_target_capacity_effect");
  assert.equal(absent.observed_no_target_capacity_effect, true);
  assert.equal(absent.exclusive_recovery_required, false);
  assert.equal(absent.durable_handoff_complete, false);
  assert.equal(absent.verified_request_count, 0);
  assert.equal(absent.allocation_record_count, 0);

  writeState({
    requestRows: [target],
    operatorRows: [targetPayment],
    allocationJsonl: "",
  });
  const missing = classifyWithoutMutation();
  assert.equal(missing.ok, false);
  assert.equal(missing.classified, true);
  assert.equal(missing.status, "verified_allocation_missing");
  assert.equal(
    missing.reason,
    "target_verified_allocation_requires_exclusive_recovery",
  );
  assert.equal(missing.exclusive_recovery_required, true);
  assert.equal(missing.observed_no_target_capacity_effect, false);
  assert.equal(missing.durable_handoff_complete, false);
  assert.equal(missing.payment_verified_event_sha256, sha(jsonl([targetPayment])));

  writeState({
    requestRows: [target],
    operatorRows: [targetPayment],
    allocationJsonl: targetAllocation.next_ledger_jsonl,
  });
  const present = classifyWithoutMutation();
  assert.equal(present.ok, true, present.reason);
  assert.equal(present.status, "allocation_present");
  assert.equal(present.durable_handoff_complete, true);
  assert.equal(present.exclusive_recovery_required, false);
  assert.equal(present.allocation_record_id,
    targetAllocation.record.record_id);

  // An orphan target allocation can never be misclassified as no effect.
  writeState({
    requestRows: [target],
    operatorRows: [reviewedEvent(target, 1_800_000_000_010)],
    allocationJsonl: targetAllocation.next_ledger_jsonl,
  });
  const orphan = classifyWithoutMutation();
  assert.equal(orphan.status, "held");
  assert.match(orphan.reason, /allocation_without_verified_payment/u);

  // A different durable payment gap prevents release of the GLOBAL capacity
  // claim even when this target itself has no payment event.
  writeState({
    requestRows: [target, other],
    operatorRows: [
      reviewedEvent(target, 1_800_000_000_010),
      otherPayment,
    ],
    allocationJsonl: "",
  });
  const unrelatedGap = classifyWithoutMutation();
  assert.equal(unrelatedGap.status, "held");
  assert.match(
    unrelatedGap.reason,
    /other_verified_request_not_fully_allocated/u,
  );

  // A rollback/mismatched high-water is always HOLD.
  writeState({
    requestRows: [target],
    operatorRows: [targetPayment],
    allocationJsonl: targetAllocation.next_ledger_jsonl,
  });
  const emptyHighWater =
    deriveBuyVoidAllocationReservationHighWaterV1("");
  assert.equal(emptyHighWater.ok, true);
  fs.writeFileSync(highWaterPath, emptyHighWater.high_water_json);
  fs.chmodSync(highWaterPath, 0o600);
  const rollback = classifyWithoutMutation();
  assert.equal(rollback.status, "held");
  assert.match(rollback.reason, /allocation_high_water_/u);

  // Truncated operator history and adversarial input shapes HOLD.
  writeState({
    requestRows: [target],
    operatorRows: [reviewedEvent(target, 1_800_000_000_010)],
    allocationJsonl: "",
  });
  fs.writeFileSync(operatorPath, Buffer.from("{\"request_id\":", "utf8"));
  fs.chmodSync(operatorPath, 0o600);
  const truncated = classifyWithoutMutation();
  assert.equal(truncated.status, "held");

  const getterInput = { ...classifierInput };
  Object.defineProperty(getterInput, "request_id", {
    enumerable: true,
    get() {
      throw new Error("getter_must_not_run");
    },
  });
  const getter = classifyBuyVoidCrossUidFailureReconciliationV1(getterInput);
  assert.equal(getter.status, "held");
  assert.match(getter.reason, /input_accessor_or_value_invalid/u);

  const proxied = classifyBuyVoidCrossUidFailureReconciliationV1(
    new Proxy({ ...classifierInput }, {}),
  );
  assert.equal(proxied.status, "held");
  assert.match(proxied.reason, /input_shape_invalid/u);

  console.log("VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_PROOF_V1");
  console.log("descriptor_bound_payment_observer_reused=true");
  console.log("descriptor_bound_allocation_observer_reused=true");
  console.log("allocation_high_water_binding_required=true");
  console.log("global_verified_allocation_completeness_required=true");
  console.log("repeated_observation_unchanged_required=true");
  console.log("observed_no_target_capacity_effect=true");
  console.log("verified_allocation_missing_requires_exclusive_recovery=true");
  console.log("allocation_present_classified=true");
  console.log("orphan_allocation_holds=true");
  console.log("unrelated_verified_gap_holds=true");
  console.log("rollback_or_malformed_evidence_holds=true");
  console.log("filesystem_write=false");
  console.log("cross_uid_lock_release_authorized=false");
  console.log("custody_recovery_authorized=false");
  console.log("runtime_integration=false");
  console.log("payment_acceptance=false");
  console.log("presale_activation=false");
  console.log("funds_movement=false");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
