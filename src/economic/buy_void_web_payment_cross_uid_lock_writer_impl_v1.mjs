import {
  VOID_BUY_VOID_CROSS_UID_CAPACITY_EXCLUSIVE_LOCK_V1,
  withBuyVoidCrossUidCapacityExclusiveLockV1,
} from "./buy_void_cross_uid_capacity_exclusive_lock_v1.mjs";
import {
  dispatchBuyVoidOperatorEventWithAllocationRequiredV1,
} from "../../dist/economic/buy_void_operator_verified_allocation_dispatch_v1.js";
import {
  checkedVerifiedPaymentDispatchPlanV1,
  checkedWebCrossUidCapacityConfigV1,
  exactWebCrossUidWriterInputV1,
} from "./buy_void_web_payment_cross_uid_lock_validation_v1.mjs";

export const VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_V1 =
  "VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_V1";

export const VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_AUTHORITY_V1 =
  Object.freeze({
    source_only_unmounted: true,
    exact_web_uid_required: true,
    canonical_cross_uid_capacity_exclusive_lock_reused: true,
    canonical_allocation_required_dispatch_reused: true,
    canonical_dispatch_planner_snapshots_before_lock_wait: true,
    payment_verified_legacy_writer_forbidden: true,
    payment_verified_allocation_handoff_required: true,
    server_controlled_allocation_roots_bound: true,
    caller_owned_mutation_cannot_redirect_writer: true,
    callback_failure_retains_lock: true,
    public_http_handler_installed: false,
    production_web_writer_cross_uid_participation_verified: false,
    payment_capacity_lock_verified: false,
    allocation_handoff_atomicity_proven: false,
    custody_reserve_recover_enabled: false,
    deployed_artifact_generation_verified: false,
    runtime_integration: false,
    payment_acceptance: false,
    presale_activation: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    funds_movement: false,
  });

function fail(code) {
  throw new Error(code);
}

export async function writeBuyVoidPaymentUnderCrossUidLockCandidateV1(raw) {
  const input = exactWebCrossUidWriterInputV1(raw);
  const config = checkedWebCrossUidCapacityConfigV1(input.capacity_lock);
  const checked = checkedVerifiedPaymentDispatchPlanV1(input.writer_input);
  const dispatchInput = checked.dispatch_input;

  const locked = await withBuyVoidCrossUidCapacityExclusiveLockV1(
    config,
    async () => {
      if (JSON.stringify(dispatchInput.event) !== checked.event_json ||
          JSON.stringify(dispatchInput.request) !== checked.request_json) {
        fail("buy_void_web_cross_uid_dispatch_snapshot_changed");
      }
      const result =
        await dispatchBuyVoidOperatorEventWithAllocationRequiredV1(
          dispatchInput,
        );
      if (!result || result.ok !== true) {
        fail("buy_void_web_cross_uid_dispatch_result_unqualified");
      }
      return result;
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
    fail("buy_void_web_cross_uid_writer_lock_result_unqualified");
  }

  return Object.freeze({
    marker: VOID_BUY_VOID_WEB_PAYMENT_CROSS_UID_LOCK_WRITER_V1,
    status: "source_candidate_only",
    writer_result: locked.result,
    web_writer_cross_uid_lock_source_bound: true,
    allocation_required_dispatch_source_bound: true,
    payment_verified_allocation_handoff_source_bound: true,
    legacy_payment_only_writer_forbidden: true,
    server_controlled_allocation_roots_bound: true,
    immutable_dispatch_snapshot_before_lock: true,
    caller_owned_mutation_after_admission_blocked: true,
    custody_service_joint_handoff_proven: false,
    payment_capacity_lock_verified: false,
    allocation_handoff_atomicity_proven: false,
    deployed_artifact_generation_verified: false,
    runtime_integration: false,
    payment_acceptance: false,
    presale_activation: false,
    funds_movement: false,
  });
}
