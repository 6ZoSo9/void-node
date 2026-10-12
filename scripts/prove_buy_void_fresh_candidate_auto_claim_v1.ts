import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_AUTHORITY_V1,
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
  VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_V1,
  runBuyVoidFreshCandidateAutoClaimV1,
} from "../src/economic/buy_void_fresh_candidate_auto_claim_v1.js";

const sha = "a".repeat(64);
const plan = "b".repeat(64);
const requestId = "buyvoid_fresh_candidate_auto_claim_v1";

const authority = {
  network_state_write: false,
  operator_local_state_write: true,
  runtime_import_mounted: false,
  apply_requested: false,
  inventory_reservation: false,
  execution_attempt_reservation: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  rpc_mutation: false,
  money_movement: false,
  background_loop: false,
  startup_execution: false,
};

const readiness = {
  schema: "void_buy_void_observe_and_claim_candidate_readiness_v1",
  marker: "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1",
  version: 1,
  candidate_stage: "observe_and_claim",
  readiness_status: "exact_one",
  eligible_candidate_count: 1,
  eligible_request_ids: [requestId],
  recommended_request_id: requestId,
  recommended_plan_fingerprint_sha256: plan,
  recommended_orchestrator_confirmation:
    "buyVoidRunBoundedAutomaticFulfillmentStage",
  recommended_delegated_confirmation: "buyVoidVerifyAndClaim",
  recommended_stage_confirmation: "buyVoidApplyObserveAndClaim",
  authority: {
    read_only: true,
    server_derived_snapshot_required: true,
    exact_request_id_only: true,
    runtime_import_mounted: false,
    apply_requested: false,
    filesystem_write_to_network_state: false,
    inventory_reservation: false,
    execution_attempt_reservation: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    rpc_mutation: false,
    money_movement: false,
    background_loop: false,
    startup_execution: false,
  },
};

const alert = {
  schema: "void_buy_void_observe_and_claim_candidate_alert_v1",
  marker: "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_ALERT_V1",
  version: 1,
  candidate_stage: "observe_and_claim",
  request_id: requestId,
  plan_fingerprint_sha256: plan,
  readiness_report_sha256: "c".repeat(64),
  required_orchestrator_confirmation:
    readiness.recommended_orchestrator_confirmation,
  required_delegated_confirmation:
    readiness.recommended_delegated_confirmation,
  required_stage_confirmation:
    readiness.recommended_stage_confirmation,
  required_canary_confirmation:
    "buyVoidArmExactObserveAndClaimCanary",
  alert_fingerprint_sha256: sha,
  operator_action:
    "review_exact_one_candidate_for_separate_arming_lane",
  activation_performed: false,
  authority,
};

async function main(): Promise<void> {
  assert.equal(
    VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_V1,
    "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_V1",
  );
  assert.equal(
    VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
    "buyVoidApplyFreshCandidateAutoClaim",
  );
  assert.equal(
    VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_AUTHORITY_V1
      .one_request_per_run,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_AUTHORITY_V1
      .wallet_access,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_AUTHORITY_V1
      .transaction_broadcast,
    false,
  );

  let workerCalls = 0;

  const dry = await runBuyVoidFreshCandidateAutoClaimV1({
    alert,
    current_readiness: readiness,
    run_worker: () => {
      workerCalls += 1;
      throw new Error("dry run must not call worker");
    },
  });
  assert.equal(dry.ok, true);
  assert.equal(dry.status, "dry_run");
  assert.equal(dry.mutation_performed, false);
  assert.equal(workerCalls, 0);

  const wrong = await runBuyVoidFreshCandidateAutoClaimV1({
    alert,
    current_readiness: readiness,
    apply: true,
    confirmation: "wrong",
    run_worker: () => {
      workerCalls += 1;
      throw new Error("wrong confirmation must not call worker");
    },
  });
  assert.equal(wrong.ok, false);
  if (wrong.ok) throw new Error("expected confirmation hold");
  assert.equal(
    wrong.reason,
    "explicit_fresh_candidate_confirmation_required",
  );
  assert.equal(workerCalls, 0);

  const claimed = await runBuyVoidFreshCandidateAutoClaimV1({
    alert,
    current_readiness: readiness,
    apply: true,
    confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
    run_worker: ({ request_id, worker_confirmation }) => {
      workerCalls += 1;
      assert.equal(request_id, requestId);
      assert.equal(worker_confirmation, "buyVoidAutoClaimPayment");
      return {
        ok: true,
        status: "claimed",
        applied: true,
        mutation_performed: true,
        journal: {
          intent: {
            wallet_access_authorized: false,
            signing_authorized: false,
            transaction_broadcast_authorized: false,
            money_movement_authorized: false,
            automatic_execution_authorized: false,
          },
        },
      };
    },
  });
  assert.equal(claimed.ok, true);
  assert.equal(claimed.status, "claimed");
  assert.equal(claimed.mutation_performed, true);
  assert.equal(workerCalls, 1);

  const duplicate = await runBuyVoidFreshCandidateAutoClaimV1({
    alert,
    current_readiness: readiness,
    apply: true,
    confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
    run_worker: () => ({
      ok: true,
      status: "duplicate",
      applied: true,
      mutation_performed: false,
      journal: {
        intent: {
          wallet_access_authorized: false,
          signing_authorized: false,
          transaction_broadcast_authorized: false,
          money_movement_authorized: false,
          automatic_execution_authorized: false,
        },
      },
    }),
  });
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.mutation_performed, false);

  const stale = await runBuyVoidFreshCandidateAutoClaimV1({
    alert,
    current_readiness: {
      ...readiness,
      recommended_plan_fingerprint_sha256: "d".repeat(64),
    },
    apply: true,
    confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
    run_worker: () => {
      throw new Error("stale plan must not call worker");
    },
  });
  assert.equal(stale.ok, false);
  if (stale.ok) throw new Error("expected stale hold");
  assert.equal(stale.reason, "exact_current_plan_binding_required");

  const multiple = await runBuyVoidFreshCandidateAutoClaimV1({
    alert,
    current_readiness: {
      ...readiness,
      readiness_status: "multiple",
      eligible_candidate_count: 2,
      eligible_request_ids: [requestId, "buyvoid_other"],
    },
    apply: true,
    confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
    run_worker: () => {
      throw new Error("multiple candidates must not call worker");
    },
  });
  assert.equal(multiple.ok, false);
  if (multiple.ok) throw new Error("expected multiple hold");
  assert.equal(
    multiple.reason,
    "current_exact_one_readiness_required",
  );

  const unsafeAlert = await runBuyVoidFreshCandidateAutoClaimV1({
    alert: {
      ...alert,
      authority: { ...authority, wallet_access: true },
    },
    current_readiness: readiness,
    apply: true,
    confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
    run_worker: () => {
      throw new Error("unsafe alert must not call worker");
    },
  });
  assert.equal(unsafeAlert.ok, false);
  if (unsafeAlert.ok) throw new Error("expected authority hold");
  assert.equal(
    unsafeAlert.reason,
    "read_only_alert_authority_required",
  );

  const unsafeWorker = await runBuyVoidFreshCandidateAutoClaimV1({
    alert,
    current_readiness: readiness,
    apply: true,
    confirmation:
      VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_CONFIRMATION_V1,
    run_worker: () => ({
      ok: true,
      status: "claimed",
      applied: true,
      mutation_performed: true,
      wallet_access_performed: true,
    }),
  });
  assert.equal(unsafeWorker.ok, false);
  if (unsafeWorker.ok) throw new Error("expected worker authority hold");
  assert.equal(
    unsafeWorker.reason,
    "auto_claim_worker_authority_violation",
  );

  console.log("VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_V1_GREEN");
  console.log("one_alert_per_run=1");
  console.log("one_request_per_run=1");
  console.log("current_exact_one_readiness_required=1");
  console.log("exact_request_and_plan_binding=1");
  console.log("duplicate_safe_claim=1");
  console.log("request_journal_write=0");
  console.log("inventory_reservation=0");
  console.log("inventory_decrement=0");
  console.log("wallet_access=0");
  console.log("signing=0");
  console.log("transaction_broadcast=0");
  console.log("money_movement=0");
  console.log("verdict=BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_LOCAL_EXACT_GREEN");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
