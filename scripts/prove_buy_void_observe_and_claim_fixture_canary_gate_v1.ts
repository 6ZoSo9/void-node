import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
} from "../src/economic/buy_void_bounded_auto_fulfillment_orchestrator_v1.js";
import {
  VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_V1,
  VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_PLAN_CONFIRMATION_V1,
  VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_STAGE_CONFIRMATIONS_V1,
  type BuyVoidBoundedOrchestratorActivationPlanV1,
} from "../src/economic/buy_void_bounded_orchestrator_apply_activation_gate_v1.js";
import {
  VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANARY_CONFIRMATION_V1,
  VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_AUTHORITY_V1,
  VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_DEFAULT_POLICY_V1,
  buyVoidObserveAndClaimFixtureCanaryStatusV1,
  evaluateBuyVoidObserveAndClaimFixtureCanaryV1,
} from "../src/economic/buy_void_observe_and_claim_fixture_canary_gate_v1.js";

const REQUEST_ID = "buyvoid_fixture_observe_and_claim_v1";
const FINGERPRINT = "a".repeat(64);
const DELEGATED_CONFIRMATION = "verifyAndClaimExact";

function plan(
  selectedStage:
    BuyVoidBoundedOrchestratorActivationPlanV1["selected_stage"]
    = "observe_and_claim",
): BuyVoidBoundedOrchestratorActivationPlanV1 {
  return {
    schema:
      "void_buy_void_bounded_orchestrator_activation_plan_v1",
    marker:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_V1,
    version: 1,
    request_id: REQUEST_ID,
    canonical_payment_identity: "voidpay1:fixture:1",
    attempt_id: null,
    public_status: "payment_submitted_pending_manual_review",
    claim_status: "missing",
    attempt_status: "missing",
    broadcast_status: "none",
    selected_stage: selectedStage,
    stage_command: {
      action: "verify_and_claim",
      request_id: REQUEST_ID,
    },
    required_orchestrator_confirmation:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
    required_delegated_confirmation: DELEGATED_CONFIRMATION,
    required_plan_confirmation:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_PLAN_CONFIRMATION_V1,
    required_stage_confirmation:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_STAGE_CONFIRMATIONS_V1
        .observe_and_claim,
    operator_event_files: ["operator-event-fixture.json"],
    operator_event_count: 1,
    fulfilled_event_count: 0,
    claim_count: 0,
    attempt_count: 0,
    confirmed_state_count: 0,
    selected_attempt_number: null,
    confirmed_state_present: false,
    public_status_source: "operator_event",
    plan_fingerprint_sha256: FINGERPRINT,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

type Decision = ReturnType<
  typeof evaluateBuyVoidObserveAndClaimFixtureCanaryV1
>;
type HeldDecision = Extract<Decision, { status: "held" }>;

function expectHeld(
  decision: Decision,
  reason: string,
): asserts decision is HeldDecision {
  assert.equal(decision.status, "held");
  if (decision.status !== "held") {
    throw new Error("expected held decision");
  }
  assert.equal(decision.reason, reason);
  assert.equal(decision.canary_authorized, false);
  assert.equal(decision.fixture_only, true);
  assert.equal(decision.live_activation_mounted, false);
  assert.equal(decision.mutation_performed, false);
  assert.equal(decision.inventory_reservation_performed, false);
  assert.equal(
    decision.execution_attempt_reservation_performed,
    false,
  );
  assert.equal(decision.wallet_access_performed, false);
  assert.equal(decision.signing_performed, false);
  assert.equal(decision.transaction_broadcast_performed, false);
  assert.equal(decision.rpc_mutation_performed, false);
  assert.equal(decision.money_movement_performed, false);
}

async function main(): Promise<void> {
  assert.equal(
    VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_AUTHORITY_V1
      .fixture_only_v1,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_AUTHORITY_V1
      .live_activation_mounted_v1,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_AUTHORITY_V1
      .default_enabled_stage_count,
    0,
  );
  assert.deepEqual(
    VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_DEFAULT_POLICY_V1,
    {
      enabled: false,
      exact_request_ids: [],
      maximum_successful_canary_mutations: 1,
    },
  );

  const status = buyVoidObserveAndClaimFixtureCanaryStatusV1();
  assert.equal(status.fixture_only, true);
  assert.equal(status.live_activation_mounted, false);
  assert.equal(status.enabled, false);
  assert.equal(status.enabled_stage_count, 0);
  assert.equal(status.exact_request_allowlist_count, 0);
  assert.equal(status.candidate_stage, "observe_and_claim");

  const preview = evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
    policy:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_DEFAULT_POLICY_V1,
    activation_plan: plan(),
    apply: false,
  });

  assert.equal(preview.status, "planned");
  if (preview.status !== "planned") {
    throw new Error("expected planned fixture canary");
  }
  assert.equal(preview.canary_authorized, false);
  assert.equal(preview.request_id, REQUEST_ID);
  assert.equal(preview.plan_fingerprint_sha256, FINGERPRINT);
  assert.equal(preview.selected_stage, "observe_and_claim");
  assert.equal(preview.mutation_performed, false);

  const disabled = evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
    policy:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_DEFAULT_POLICY_V1,
    activation_plan: plan(),
    apply: true,
    plan_fingerprint: FINGERPRINT,
    orchestrator_confirmation:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
    delegated_confirmation: DELEGATED_CONFIRMATION,
    stage_confirmation:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_STAGE_CONFIRMATIONS_V1
        .observe_and_claim,
    canary_confirmation:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANARY_CONFIRMATION_V1,
  });
  expectHeld(disabled, "observe_and_claim_canary_disabled");

  const enabledPolicy = {
    enabled: true,
    exact_request_ids: [REQUEST_ID],
    maximum_successful_canary_mutations: 1 as const,
  };

  const wrongRequest = evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
    policy: {
      ...enabledPolicy,
      exact_request_ids: ["buyvoid_other_fixture_v1"],
    },
    activation_plan: plan(),
    apply: true,
  });
  expectHeld(wrongRequest, "request_not_canary_allowlisted");

  const multipleRequests =
    evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
      policy: {
        ...enabledPolicy,
        exact_request_ids: [
          REQUEST_ID,
          "buyvoid_other_fixture_v1",
        ],
      },
      activation_plan: plan(),
      apply: true,
    });
  expectHeld(
    multipleRequests,
    "exact_one_request_allowlist_required",
  );

  const wrongStage = evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
    policy: enabledPolicy,
    activation_plan: plan("reserve_inventory_and_attempt"),
    apply: true,
  });
  expectHeld(wrongStage, "observe_and_claim_stage_required");

  const wrongFingerprint =
    evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
      policy: enabledPolicy,
      activation_plan: plan(),
      apply: true,
      plan_fingerprint: "b".repeat(64),
    });
  expectHeld(
    wrongFingerprint,
    "exact_plan_fingerprint_required",
  );

  const exhausted = evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
    policy: enabledPolicy,
    activation_plan: plan(),
    apply: true,
    successful_canary_mutation_count: 1,
  });
  expectHeld(
    exhausted,
    "maximum_successful_canary_mutations_reached",
  );

  const wrongOrchestrator =
    evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
      policy: enabledPolicy,
      activation_plan: plan(),
      apply: true,
      plan_fingerprint: FINGERPRINT,
      orchestrator_confirmation: "wrong",
    });
  expectHeld(
    wrongOrchestrator,
    "exact_orchestrator_confirmation_required",
  );

  const wrongDelegated =
    evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
      policy: enabledPolicy,
      activation_plan: plan(),
      apply: true,
      plan_fingerprint: FINGERPRINT,
      orchestrator_confirmation:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
      delegated_confirmation: "wrong",
    });
  expectHeld(
    wrongDelegated,
    "exact_delegated_confirmation_required",
  );

  const wrongStageConfirmation =
    evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
      policy: enabledPolicy,
      activation_plan: plan(),
      apply: true,
      plan_fingerprint: FINGERPRINT,
      orchestrator_confirmation:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
      delegated_confirmation: DELEGATED_CONFIRMATION,
      stage_confirmation: "wrong",
    });
  expectHeld(
    wrongStageConfirmation,
    "exact_stage_confirmation_required",
  );

  const wrongCanaryConfirmation =
    evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
      policy: enabledPolicy,
      activation_plan: plan(),
      apply: true,
      plan_fingerprint: FINGERPRINT,
      orchestrator_confirmation:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
      delegated_confirmation: DELEGATED_CONFIRMATION,
      stage_confirmation:
        VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_STAGE_CONFIRMATIONS_V1
          .observe_and_claim,
      canary_confirmation: "wrong",
    });
  expectHeld(
    wrongCanaryConfirmation,
    "exact_canary_confirmation_required",
  );

  const authorized = evaluateBuyVoidObserveAndClaimFixtureCanaryV1({
    policy: enabledPolicy,
    activation_plan: plan(),
    apply: true,
    plan_fingerprint: FINGERPRINT,
    orchestrator_confirmation:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
    delegated_confirmation: DELEGATED_CONFIRMATION,
    stage_confirmation:
      VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_STAGE_CONFIRMATIONS_V1
        .observe_and_claim,
    canary_confirmation:
      VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANARY_CONFIRMATION_V1,
    successful_canary_mutation_count: 0,
  });

  assert.equal(authorized.status, "authorized");
  if (authorized.status !== "authorized") {
    throw new Error("expected authorized fixture gate");
  }
  assert.equal(authorized.canary_authorized, true);
  assert.equal(authorized.fixture_only, true);
  assert.equal(authorized.live_activation_mounted, false);
  assert.equal(authorized.selected_stage, "observe_and_claim");
  assert.equal(authorized.mutation_performed, false);
  assert.equal(authorized.inventory_reservation_performed, false);
  assert.equal(
    authorized.execution_attempt_reservation_performed,
    false,
  );
  assert.equal(authorized.wallet_access_performed, false);
  assert.equal(authorized.signing_performed, false);
  assert.equal(authorized.transaction_broadcast_performed, false);
  assert.equal(authorized.rpc_mutation_performed, false);
  assert.equal(authorized.money_movement_performed, false);

  console.log(
    "VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_GATE_V1_GREEN",
  );
  console.log("fixture_only=1");
  console.log("live_activation_mounted=0");
  console.log("default_enabled_stage_count=0");
  console.log("default_exact_request_allowlist_count=0");
  console.log("candidate_stage=observe_and_claim");
  console.log("maximum_successful_canary_mutations=1");
  console.log("automatic_retry=0");
  console.log("mutation_performed=0");
  console.log("inventory_reservation=0");
  console.log("execution_attempt_reservation=0");
  console.log("wallet_access=0");
  console.log("signing=0");
  console.log("transaction_broadcast=0");
  console.log("rpc_mutation=0");
  console.log("money_movement=0");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
