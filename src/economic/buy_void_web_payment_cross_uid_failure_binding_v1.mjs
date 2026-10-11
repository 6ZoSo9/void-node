import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import {
  VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1,
  withBuyVoidCrossUidCapacityExclusiveLockV1,
} from "./buy_void_cross_uid_capacity_exclusive_lock_v1.mjs";
import {
  VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_AUTHORITY_V1,
  VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_V1,
  classifyBuyVoidCrossUidFailureReconciliationV1,
} from "./buy_void_cross_uid_failure_reconciliation_v1.mjs";
import {
  dispatchBuyVoidOperatorEventWithAllocationRequiredV1,
} from "../../dist/economic/buy_void_operator_verified_allocation_dispatch_v1.js";
import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1,
  VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1,
} from "../../dist/economic/buy_void_verified_payment_capacity_admission_v1.js";
import {
  checkedVerifiedPaymentDispatchPlanV1,
  checkedWebCrossUidCapacityConfigV1,
  exactWebCrossUidWriterInputV1,
} from "./buy_void_web_payment_cross_uid_lock_validation_v1.mjs";

export const VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_FAILURE_BINDING_V1 =
  "VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_FAILURE_BINDING_V1";

export const VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_FAILURE_BINDING_AUTHORITY_V1 =
  Object.freeze({
    source_only_unmounted: true,
    canonical_cross_uid_capacity_exclusive_lock_reused: true,
    canonical_allocation_required_dispatch_reused: true,
    durable_allocation_receipt_required_before_lock_release: true,
    canonical_dispatch_planner_reused: true,
    canonical_failure_reconciliation_classifier_reused: true,
    reconciliation_runs_inside_owned_lock_callback: true,
    reconciliation_identity_from_planned_snapshot: true,
    reconciliation_server_roots_from_canonical_plan: true,
    every_dispatch_failure_retains_outer_claim: true,
    every_reconciliation_outcome_retains_outer_claim: true,
    reconciliation_failure_retains_outer_claim: true,
    reconciliation_result_cannot_authorize_release: true,
    public_http_handler_installed: false,
    production_cross_uid_lock_ownership_verified: false,
    cross_file_atomic_snapshot_verified: false,
    external_high_water_witness_verified: false,
    coordinated_storage_rollback_excluded: false,
    cross_uid_lock_release_authorized: false,
    custody_recovery_authorized: false,
    deployed_artifact_generation_verified: false,
    runtime_integration: false,
    payment_acceptance: false,
    presale_activation: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    funds_movement: false,
  });

const RECONCILIATION_STATUSES = Object.freeze([
  "held",
  "observed_no_target_capacity_effect",
  "verified_allocation_missing",
  "allocation_present",
]);

function fail(code, cause = undefined) {
  const error = new Error(code, cause === undefined ? undefined : { cause });
  throw error;
}

function frozenReconciliationInputV1(dispatchInput) {
  const requestId = dispatchInput?.event?.request_id;
  if (typeof requestId !== "string" || !requestId) {
    fail("buy_void_web_cross_uid_reconciliation_request_id_invalid");
  }
  const values = [
    ["allocation_high_water_root", dispatchInput.allocation_high_water_root],
    ["allocation_ledger_root", dispatchInput.allocation_ledger_root],
    ["request_dir", dispatchInput.request_dir],
    ["request_id", requestId],
  ];
  const output = Object.create(null);
  for (const [key, value] of values) {
    if (typeof value !== "string" || !value) {
      fail("buy_void_web_cross_uid_reconciliation_input_invalid");
    }
    Object.defineProperty(output, key, {
      value,
      enumerable: true,
      writable: false,
      configurable: false,
    });
  }
  return Object.freeze(output);
}

function checkedReconciliationResultV1(value, requestId) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      utilTypes.isProxy(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      value.marker !== VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_V1 ||
      value.version !== 1 ||
      !RECONCILIATION_STATUSES.includes(value.status) ||
      value.authority !==
        VOID_BUY_VOID_CROSS_UID_FAILURE_RECONCILIATION_AUTHORITY_V1 ||
      value.operation_performed !== false ||
      value.filesystem_write !== false ||
      value.external_high_water_witness_verified !== false ||
      value.coordinated_storage_rollback_excluded !== false ||
      value.cross_uid_lock_release_authorized !== false ||
      value.custody_recovery_authorized !== false ||
      value.runtime_integration !== false ||
      value.payment_acceptance !== false ||
      value.presale_activation !== false ||
      value.funds_movement !== false) {
    fail("buy_void_web_cross_uid_reconciliation_result_unqualified");
  }

  const held = value.status === "held";
  if ((held && (value.ok !== false || value.classified !== false ||
      value.request_id !== null)) ||
      (!held && (value.classified !== true ||
        value.request_id !== requestId))) {
    fail("buy_void_web_cross_uid_reconciliation_result_identity_invalid");
  }

  const noEffect = value.status === "observed_no_target_capacity_effect";
  const missing = value.status === "verified_allocation_missing";
  const complete = value.status === "allocation_present";
  if (value.observed_no_target_capacity_effect !== noEffect ||
      value.exclusive_recovery_required !== missing ||
      value.durable_handoff_complete !== complete ||
      value.ok !== (noEffect || complete)) {
    fail("buy_void_web_cross_uid_reconciliation_result_status_invalid");
  }
  return value;
}


// Match recordIdV1 in the canonical allocation reservation ledger.
const ALLOCATION_ID_V1 = /^voidalloc1_[0-9a-f]{64}$/u;
const SHA256_REF_V1 = /^sha256:[0-9a-f]{64}$/u;

// A success flag alone does not prove that a verified payment was paired with
// a durable allocation. Read only frozen own-data fields from the canonical
// handoff receipt while still inside the outer cross-UID critical section.
function ownReceiptFieldV1(record, key) {
  if (!record || typeof record !== "object" || Array.isArray(record) ||
      utilTypes.isProxy(record) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(record)) ||
      !Object.isFrozen(record)) {
    fail("buy_void_web_cross_uid_handoff_receipt_unqualified");
  }
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !Object.hasOwn(descriptor, "value")) {
    fail("buy_void_web_cross_uid_handoff_receipt_unqualified");
  }
  return descriptor.value;
}

function checkedDurableAllocationHandoffV1(receipt, eventJson) {
  const get = (key) => ownReceiptFieldV1(receipt, key);
  const allocation = get("allocation");
  const row = (key) => ownReceiptFieldV1(allocation, key);
  const alreadyVerified = get("idempotent");
  const newPaymentAppend = get("payment_event_appended");
  const writerStatus = row("allocation_writer_status");
  const writerOperationPerformed = row("allocation_writer_operation_performed");
  const priorRecoveryPerformed = row("prior_allocation_recovery_performed");
  const finalTip = row("final_tip_hash");
  const expectedDigest = "sha256:" +
    createHash("sha256").update(eventJson + "\n", "utf8").digest("hex");
  if (get("ok") !== true ||
      get("authority") !==
        VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1 ||
      typeof alreadyVerified !== "boolean" ||
      newPaymentAppend !== !alreadyVerified ||
      get("runtime_integration") !== false ||
      get("protected_high_water_custody_proven") !== false ||
      get("production_gate_ready") !== false ||
      get("funds_movement") !== false ||
      row("ok") !== true ||
      row("marker") !== VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_V1 ||
      row("authority") !==
        VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1 ||
      !ALLOCATION_ID_V1.test(row("allocation_record_id")) ||
      !SHA256_REF_V1.test(row("payment_verified_event_sha256")) ||
      row("payment_verified_event_sha256") !== expectedDigest ||
      typeof row("idempotent") !== "boolean" ||
      // A newly appended payment cannot already have an allocated ledger
      // record; only an old payment may legitimately require gap recovery.
      (!alreadyVerified && row("idempotent") !== false) ||
      !Number.isSafeInteger(row("final_record_count")) ||
      row("final_record_count") < 1 ||
      // A positive count alone cannot make a forged writer receipt
      // authoritative: its status, operation flag and final tip must agree.
      !["persisted", "recovered", "idempotent"].includes(writerStatus) ||
      writerOperationPerformed !== (writerStatus !== "idempotent") ||
      typeof priorRecoveryPerformed !== "boolean" ||
      typeof finalTip !== "string" ||
      !SHA256_REF_V1.test(finalTip) ||
      finalTip === "sha256:" + "0".repeat(64) ||
      row("runtime_integration") !== false ||
      row("protected_high_water_custody_proven") !== false ||
      row("production_gate_ready") !== false ||
      row("funds_movement") !== false) {
    fail("buy_void_web_cross_uid_handoff_receipt_unqualified");
  }
  return receipt;
}

function failureWithEvidenceV1(
  code,
  dispatchFailure,
  reconciliation = undefined,
  reconciliationFailure = undefined,
) {
  const error = new Error(code, { cause: dispatchFailure });
  if (reconciliation !== undefined) {
    Object.defineProperty(error, "reconciliation", {
      value: reconciliation,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }
  if (reconciliationFailure !== undefined) {
    Object.defineProperty(error, "reconciliation_failure", {
      value: reconciliationFailure,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }
  return error;
}

export async function
writeBuyVoidPaymentUnderCrossUidLockWithFailureBindingCandidateV1(raw) {
  const input = exactWebCrossUidWriterInputV1(raw);
  const config = checkedWebCrossUidCapacityConfigV1(input.capacity_lock);
  const checked = checkedVerifiedPaymentDispatchPlanV1(input.writer_input);
  const dispatchInput = checked.dispatch_input;
  const reconciliationInput = frozenReconciliationInputV1(dispatchInput);

  const locked = await withBuyVoidCrossUidCapacityExclusiveLockV1(
    config,
    async () => {
      try {
        if (JSON.stringify(dispatchInput.event) !== checked.event_json ||
            JSON.stringify(dispatchInput.request) !== checked.request_json) {
          fail("buy_void_web_cross_uid_dispatch_snapshot_changed");
        }
        const result =
          await dispatchBuyVoidOperatorEventWithAllocationRequiredV1(
            dispatchInput,
          );
        if (ownReceiptFieldV1(result, "ok") !== true) {
          fail("buy_void_web_cross_uid_dispatch_result_unqualified");
        }
        return checkedDurableAllocationHandoffV1(result, checked.event_json);
      } catch (dispatchFailure) {
        let reconciliation;
        try {
          reconciliation = checkedReconciliationResultV1(
            classifyBuyVoidCrossUidFailureReconciliationV1(
              reconciliationInput,
            ),
            reconciliationInput.request_id,
          );
        } catch (reconciliationFailure) {
          throw failureWithEvidenceV1(
            "buy_void_web_cross_uid_reconciliation_failed_lock_retained",
            dispatchFailure,
            undefined,
            reconciliationFailure,
          );
        }
        throw failureWithEvidenceV1(
          "buy_void_web_cross_uid_dispatch_failed_reconciled_lock_retained",
          dispatchFailure,
          reconciliation,
        );
      }
    },
  );

  if (!locked || locked.ok !== true ||
      locked.marker !== VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1 ||
      locked.status !== "completed" ||
      locked.participant_role !== "web" ||
      locked.participant_uid !== config.web_uid ||
      locked.web_uid !== config.web_uid ||
      locked.custody_uid !== config.custody_uid ||
      locked.shared_gid !== config.shared_gid ||
      locked.exclusive_critical_section_completed !== true ||
      locked.lock_release_fsynced !== true ||
      locked.callback_failure_retains_lock !== true ||
      locked.result?.ok !== true) {
    fail("buy_void_web_cross_uid_failure_binding_lock_result_unqualified");
  }

  return Object.freeze({
    marker: VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_FAILURE_BINDING_V1,
    status: "source_candidate_only",
    writer_result: locked.result,
    reconciliation_source_bound: true,
    reconciliation_invoked: false,
    reconciliation_runs_inside_owned_lock_callback: true,
    every_failure_retains_outer_claim: true,
    cross_uid_lock_release_authorized: false,
    custody_recovery_authorized: false,
    deployed_artifact_generation_verified: false,
    runtime_integration: false,
    payment_acceptance: false,
    presale_activation: false,
    funds_movement: false,
  });
}
