import { TextDecoder, types as utilTypes } from "node:util";

import {
  classifyBuyVoidAllocationReservationLedgerV1,
} from "../../dist/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  classifyBuyVoidAllocationReservationHighWaterBindingV1,
} from "../../dist/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  classifyBuyVoidVerifiedAllocationReplayBindingV1,
} from "../../dist/economic/buy_void_verified_allocation_replay_binding_v1.js";
import {
  observeBuyVoidCustodyAllocationRootsReadOnlyV1,
} from "./buy_void_custody_allocation_roots_observed_read_v1.mjs";
import {
  observeBuyVoidCustodyPaymentLedgersReadOnlyV1,
} from "./buy_void_custody_payment_ledgers_observed_read_v1.mjs";

export const VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_V1 =
  "VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_V1";

export const VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_AUTHORITY_V1 =
  Object.freeze({
    source_only_read_classifier: true,
    descriptor_bound_payment_observer_reused: true,
    descriptor_bound_allocation_observer_reused: true,
    canonical_replay_classifier_reused: true,
    canonical_allocation_ledger_classifier_reused: true,
    allocation_high_water_binding_required: true,
    repeated_observation_unchanged_required: true,
    global_verified_allocation_completeness_required: true,
    target_capacity_effect_classified: true,
    cross_file_atomic_snapshot_verified: false,
    cross_uid_lock_ownership_verified: false,
    cross_uid_lock_release_authorized: false,
    custody_recovery_authorized: false,
    filesystem_write: false,
    runtime_integration: false,
    payment_acceptance: false,
    presale_activation: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    funds_movement: false,
  });

const REQUEST_ID = /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u;
const INPUT_KEYS = Object.freeze([
  "allocation_high_water_root",
  "allocation_ledger_root",
  "request_dir",
  "request_id",
]);
const MAX_JSONL_BYTES = 64 * 1024 * 1024;
const MAX_ROWS = 100_000;
const UTF8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function fail(code) {
  throw new Error("buy_void_cross_uid_failure_reconciliation_" + code);
}

function exactInput(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
      utilTypes.isProxy(raw) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(raw))) {
    fail("input_shape_invalid");
  }
  const keys = Reflect.ownKeys(raw);
  if (keys.length !== INPUT_KEYS.length ||
      keys.some((key) => typeof key !== "string") ||
      [...keys].sort().some((key, index) => key !== INPUT_KEYS[index])) {
    fail("input_shape_invalid");
  }
  const output = Object.create(null);
  for (const key of INPUT_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value") ||
        typeof descriptor.value !== "string") {
      fail("input_accessor_or_value_invalid");
    }
    Object.defineProperty(output, key, {
      value: descriptor.value,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  if (!REQUEST_ID.test(output.request_id)) {
    fail("request_id_invalid");
  }
  return Object.freeze(output);
}

function held(reason) {
  return Object.freeze({
    ok: false,
    classified: false,
    status: "held",
    marker: VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_V1,
    version: 1,
    reason,
    request_id: null,
    payment_verified_event_sha256: null,
    allocation_record_id: null,
    verified_request_count: null,
    allocation_record_count: null,
    observed_no_target_capacity_effect: false,
    exclusive_recovery_required: false,
    durable_handoff_complete: false,
    cross_uid_lock_release_authorized: false,
    custody_recovery_authorized: false,
    operation_performed: false,
    filesystem_write: false,
    runtime_integration: false,
    payment_acceptance: false,
    presale_activation: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_AUTHORITY_V1,
  });
}

function decision(input) {
  return Object.freeze({
    ok: input.ok,
    classified: true,
    status: input.status,
    marker: VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_V1,
    version: 1,
    reason: input.reason,
    request_id: input.request_id,
    payment_verified_event_sha256:
      input.payment_verified_event_sha256,
    allocation_record_id: input.allocation_record_id,
    verified_request_count: input.verified_request_count,
    allocation_record_count: input.allocation_record_count,
    observed_no_target_capacity_effect:
      input.status === "observed_no_target_capacity_effect",
    exclusive_recovery_required:
      input.status === "verified_allocation_missing",
    durable_handoff_complete:
      input.status === "allocation_present",
    cross_uid_lock_release_authorized: false,
    custody_recovery_authorized: false,
    operation_performed: false,
    filesystem_write: false,
    runtime_integration: false,
    payment_acceptance: false,
    presale_activation: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_AUTHORITY_V1,
  });
}

function strictVerifiedRequestIds(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 ||
      bytes.length > MAX_JSONL_BYTES) {
    fail("operator_events_bytes_invalid");
  }
  if (bytes.length >= 3 && bytes[0] === 0xef &&
      bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("operator_events_utf8_bom_forbidden");
  }
  let text;
  try {
    text = UTF8.decode(bytes);
  } catch {
    fail("operator_events_utf8_invalid");
  }
  if (!text.endsWith("\n") || text.includes("\r") ||
      text.charCodeAt(0) === 0xfeff) {
    fail("operator_events_noncanonical");
  }
  const lines = text.slice(0, -1).split("\n");
  if (lines.length > MAX_ROWS || lines.some((line) => line.length === 0)) {
    fail("operator_events_rows_invalid");
  }
  const verified = new Set();
  for (const line of lines) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      fail("operator_events_json_invalid");
    }
    if (!row || typeof row !== "object" || Array.isArray(row) ||
        JSON.stringify(row) !== line ||
        typeof row.request_id !== "string" ||
        !REQUEST_ID.test(row.request_id) ||
        typeof row.operator_status !== "string" ||
        (row.payment_verified === true &&
          row.operator_status !== "payment_verified")) {
      fail("operator_events_row_invalid");
    }
    if (row.operator_status === "payment_verified") {
      if (verified.has(row.request_id)) {
        fail("operator_events_verified_request_duplicate");
      }
      verified.add(row.request_id);
    }
  }
  return Object.freeze([...verified].sort());
}

function replay(input, requestId) {
  return classifyBuyVoidVerifiedAllocationReplayBindingV1({
    request_id: requestId,
    requests_jsonl: Buffer.from(input.requests_jsonl),
    operator_events_jsonl: Buffer.from(input.operator_events_jsonl),
    allocation_jsonl: Buffer.from(input.allocation_jsonl),
  });
}

export function classifyBuyVoidCrossUidFailureReconciliationV1(raw = {}) {
  try {
    const input = exactInput(raw);
    const payment = observeBuyVoidCustodyPaymentLedgersReadOnlyV1({
      request_dir: input.request_dir,
    });
    if (payment?.observed !== true ||
        !Buffer.isBuffer(payment.requests_jsonl) ||
        !Buffer.isBuffer(payment.operator_events_jsonl)) {
      fail("payment_observation_" + String(payment?.reason || "held"));
    }

    const allocation = observeBuyVoidCustodyAllocationRootsReadOnlyV1({
      ledger_root: input.allocation_ledger_root,
      high_water_root: input.allocation_high_water_root,
    });
    if (allocation?.observed !== true ||
        !Buffer.isBuffer(allocation.allocation_jsonl) ||
        !Buffer.isBuffer(allocation.allocation_high_water_bytes)) {
      fail("allocation_observation_" + String(allocation?.reason || "held"));
    }

    // Repeat both independent observations and require byte identity across
    // the complete read window. This detects ordinary concurrent changes but
    // deliberately does not claim an atomic cross-filesystem snapshot; a
    // future release caller must independently prove it owns the outer lock.
    const paymentAgain = observeBuyVoidCustodyPaymentLedgersReadOnlyV1({
      request_dir: input.request_dir,
    });
    const allocationAgain = observeBuyVoidCustodyAllocationRootsReadOnlyV1({
      ledger_root: input.allocation_ledger_root,
      high_water_root: input.allocation_high_water_root,
    });
    if (paymentAgain?.observed !== true ||
        allocationAgain?.observed !== true ||
        !Buffer.isBuffer(paymentAgain.requests_jsonl) ||
        !Buffer.isBuffer(paymentAgain.operator_events_jsonl) ||
        !Buffer.isBuffer(allocationAgain.allocation_jsonl) ||
        !Buffer.isBuffer(allocationAgain.allocation_high_water_bytes) ||
        !paymentAgain.requests_jsonl.equals(payment.requests_jsonl) ||
        !paymentAgain.operator_events_jsonl.equals(
          payment.operator_events_jsonl,
        ) ||
        !allocationAgain.allocation_jsonl.equals(
          allocation.allocation_jsonl,
        ) ||
        !allocationAgain.allocation_high_water_bytes.equals(
          allocation.allocation_high_water_bytes,
        )) {
      fail("repeated_observation_changed");
    }

    const highWater =
      classifyBuyVoidAllocationReservationHighWaterBindingV1({
        ledger_jsonl: Buffer.from(allocation.allocation_jsonl),
        high_water_json: Buffer.from(
          allocation.allocation_high_water_bytes,
        ),
      });
    if (highWater?.ok !== true || highWater.status !== "bound" ||
        highWater.rollback_safe_for_presented_authoritative_high_water !==
          true) {
      fail("allocation_high_water_" +
        String(highWater?.reason || "held"));
    }

    const ledger = classifyBuyVoidAllocationReservationLedgerV1(
      Buffer.from(allocation.allocation_jsonl),
    );
    if (ledger?.ok !== true || !Array.isArray(ledger.records)) {
      fail("allocation_ledger_" + String(ledger?.reason || "held"));
    }

    const observed = Object.freeze({
      requests_jsonl: Buffer.from(payment.requests_jsonl),
      operator_events_jsonl: Buffer.from(payment.operator_events_jsonl),
      allocation_jsonl: Buffer.from(allocation.allocation_jsonl),
    });
    const verifiedIds = strictVerifiedRequestIds(
      observed.operator_events_jsonl,
    );
    const verifiedSet = new Set(verifiedIds);
    if (ledger.records.some(
      (record) => !verifiedSet.has(record?.request_id),
    )) {
      fail("allocation_without_verified_payment");
    }
    const targetRecords = ledger.records.filter(
      (record) => record?.request_id === input.request_id,
    );
    if (targetRecords.length > 1) {
      fail("target_allocation_cardinality_invalid");
    }

    let targetReplay = null;
    for (const requestId of verifiedIds) {
      const classified = replay(observed, requestId);
      if (requestId === input.request_id) {
        targetReplay = classified;
        continue;
      }
      if (classified?.ok !== true ||
          classified.status !== "allocation_present" ||
          classified.request_id !== requestId ||
          !classified.allocation_record_id) {
        fail("other_verified_request_not_fully_allocated");
      }
    }

    if (!verifiedIds.includes(input.request_id)) {
      if (targetRecords.length !== 0) {
        fail("target_allocation_without_verified_payment");
      }
      const absent = replay(observed, input.request_id);
      if (absent?.status !== "held" ||
          absent.reason !== "replay_binding_verified_payment_missing") {
        fail("target_absence_not_proven_" +
          String(absent?.reason || absent?.status || "held"));
      }
      return decision({
        ok: true,
        status: "observed_no_target_capacity_effect",
        reason: null,
        request_id: input.request_id,
        payment_verified_event_sha256: null,
        allocation_record_id: null,
        verified_request_count: verifiedIds.length,
        allocation_record_count: ledger.records.length,
      });
    }

    if (!targetReplay) {
      fail("target_replay_missing");
    }
    if (targetReplay.request_id !== input.request_id ||
        !targetReplay.payment_verified_event_sha256) {
      fail("target_replay_identity_invalid");
    }

    if (targetReplay.status === "verified_allocation_missing" &&
        targetReplay.reason ===
          "verified_allocation_requires_protected_recovery") {
      if (targetRecords.length !== 0) {
        fail("target_missing_replay_has_allocation_record");
      }
      return decision({
        ok: false,
        status: "verified_allocation_missing",
        reason: "target_verified_allocation_requires_exclusive_recovery",
        request_id: input.request_id,
        payment_verified_event_sha256:
          targetReplay.payment_verified_event_sha256,
        allocation_record_id: null,
        verified_request_count: verifiedIds.length,
        allocation_record_count: ledger.records.length,
      });
    }

    if (targetReplay.ok === true &&
        targetReplay.status === "allocation_present") {
      if (targetRecords.length !== 1 ||
          targetReplay.allocation_record_id !==
            targetRecords[0].record_id) {
        fail("target_present_replay_record_mismatch");
      }
      return decision({
        ok: true,
        status: "allocation_present",
        reason: null,
        request_id: input.request_id,
        payment_verified_event_sha256:
          targetReplay.payment_verified_event_sha256,
        allocation_record_id: targetReplay.allocation_record_id,
        verified_request_count: verifiedIds.length,
        allocation_record_count: ledger.records.length,
      });
    }

    fail("target_replay_" +
      String(targetReplay.reason || targetReplay.status || "held"));
  } catch (error) {
    const rawReason = error instanceof Error
      ? error.message
      : "buy_void_cross_uid_failure_reconciliation_unknown_hold";
    const prefix = "buy_void_cross_uid_failure_reconciliation_";
    return held(rawReason.startsWith(prefix)
      ? rawReason.slice(prefix.length)
      : "held");
  }
}
