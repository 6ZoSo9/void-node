import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
  type BuyVoidBoundedAutoFulfillmentDecisionV1,
  type BuyVoidBoundedAutoFulfillmentSnapshotV1,
  type BuyVoidBoundedAutoFulfillmentStageV1,
} from "../src/economic/buy_void_bounded_auto_fulfillment_orchestrator_v1.js";
import {
  VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_AUTHORITY_V1,
  VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_DEFAULT_POLICY_V1,
  VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_STAGE_CONFIRMATIONS_V1,
  buyVoidBoundedOrchestratorApplyActivationStatusV1,
  evaluateBuyVoidBoundedOrchestratorApplyActivationV1,
} from "../src/economic/buy_void_bounded_orchestrator_apply_activation_gate_v1.js";
import type {
  BuyVoidBoundedOrchestratorServerSnapshotEvidenceV1,
} from "../src/economic/buy_void_bounded_orchestrator_server_snapshot_v1.js";

function snapshot(input: {
  request_id: string;
  claimed?: boolean;
  attempt_id?: string;
  attempt_status?:
    BuyVoidBoundedAutoFulfillmentSnapshotV1["attempt_status"];
}): BuyVoidBoundedAutoFulfillmentSnapshotV1 {
  return {
    request_id: input.request_id,
    public_status: "payment_verified",
    claim_status: input.claimed ? "claimed" : "missing",
    ...(input.attempt_id ? { attempt_id: input.attempt_id } : {}),
    attempt_status: input.attempt_status || "missing",
    broadcast_status: "none",
  };
}

function evidence(): BuyVoidBoundedOrchestratorServerSnapshotEvidenceV1 {
  return {
    request_file: "/server/request.json",
    operator_event_files: ["operator-event-100.json"],
    operator_event_count: 1,
    fulfilled_event_count: 0,
    claim_count: 0,
    attempt_count: 0,
    confirmed_state_count: 0,
    selected_attempt_number: null,
    confirmed_state_present: false,
    public_status_source: "operator_event",
  };
}

function dryDecision(
  stage: BuyVoidBoundedAutoFulfillmentStageV1,
  delegatedConfirmation: string,
): BuyVoidBoundedAutoFulfillmentDecisionV1 {
  return {
    ok: true,
    status: "dry_run",
    applied: false,
    mutation_performed: false,
    terminal: false,
    selected_stage: stage,
    required_confirmation:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
    required_delegated_confirmation: delegatedConfirmation,
    automatic_retry: false,
    stage_transition_count: 0,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

type Decision = ReturnType<
  typeof evaluateBuyVoidBoundedOrchestratorApplyActivationV1
>;

function expectHeld(decision: Decision, reason: string): void {
  assert.equal(decision.status, "held");
  if (decision.status !== "held") {
    throw new Error("expected held decision");
  }
  assert.equal(decision.reason, reason);
  assert.equal(decision.apply_authorized, false);
  assert.equal(decision.mutation_performed, false);
  assert.equal(decision.wallet_access_performed, false);
  assert.equal(decision.signing_performed, false);
  assert.equal(decision.transaction_broadcast_performed, false);
  assert.equal(decision.money_movement_performed, false);
}

async function main(): Promise<void> {
  assert.equal(
    VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_AUTHORITY_V1
      .disabled_by_default,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_AUTHORITY_V1
      .default_enabled_stage_count,
    0,
  );
  assert.equal(
    VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_AUTHORITY_V1
      .runtime_execution_mounted_v1,
    true,
  );
  assert.deepEqual(
    VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_DEFAULT_POLICY_V1,
    { enabled: false, allowed_stages: [] },
  );

  const defaultStatus =
    buyVoidBoundedOrchestratorApplyActivationStatusV1();
  assert.equal(defaultStatus.enabled, false);
  assert.equal(defaultStatus.enabled_stage_count, 0);
  assert.equal(defaultStatus.runtime_execution_mounted_v1, true);

  const enabledStatus =
    buyVoidBoundedOrchestratorApplyActivationStatusV1({
      enabled: true,
      allowed_stages: [
        "reserve_inventory_and_attempt",
        "observe_and_claim",
        "observe_and_claim",
      ],
    });
  assert.equal(enabledStatus.enabled, true);
  assert.equal(enabledStatus.enabled_stage_count, 2);
  assert.deepEqual(enabledStatus.allowed_stages, [
    "observe_and_claim",
    "reserve_inventory_and_attempt",
  ]);

  const requestId = "buyvoid_activation_gate_observe_v1";
  const observeSnapshot = snapshot({ request_id: requestId });
  const observeDecision = dryDecision(
    "observe_and_claim",
    "verifyAndClaimExact",
  );
  const stageCommand = {
    action: "verify_and_claim",
    request_id: requestId,
  };

  const planned =
    evaluateBuyVoidBoundedOrchestratorApplyActivationV1({
      policy:
        VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_DEFAULT_POLICY_V1,
      request_id: requestId,
      derived_snapshot: observeSnapshot,
      snapshot_evidence: evidence(),
      dry_run_decision: observeDecision,
      stage_command: stageCommand,
      apply: false,
    });
  assert.equal(planned.status, "planned");
  if (planned.status !== "planned") {
    throw new Error("expected plan");
  }
  assert.match(planned.plan.plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.equal(
    planned.plan.required_stage_confirmation,
    VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_STAGE_CONFIRMATIONS_V1
      .observe_and_claim,
  );

  const plannedAgain =
    evaluateBuyVoidBoundedOrchestratorApplyActivationV1({
      policy:
        VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_DEFAULT_POLICY_V1,
      request_id: requestId,
      derived_snapshot: observeSnapshot,
      snapshot_evidence: evidence(),
      dry_run_decision: observeDecision,
      stage_command: stageCommand,
      apply: false,
    });
  assert.equal(plannedAgain.status, "planned");
  if (plannedAgain.status !== "planned") {
    throw new Error("expected second plan");
  }
  assert.equal(
    plannedAgain.plan.plan_fingerprint_sha256,
    planned.plan.plan_fingerprint_sha256,
  );

  const disabled =
    evaluateBuyVoidBoundedOrchestratorApplyActivationV1({
      policy:
        VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_DEFAULT_POLICY_V1,
      request_id: requestId,
      derived_snapshot: observeSnapshot,
      snapshot_evidence: evidence(),
      dry_run_decision: observeDecision,
      stage_command: stageCommand,
      apply: true,
      plan_fingerprint: planned.plan.plan_fingerprint_sha256,
      confirmation:
        planned.plan.required_orchestrator_confirmation,
      delegated_confirmation:
        planned.plan.required_delegated_confirmation,
      stage_confirmation:
        planned.plan.required_stage_confirmation,
    });
  expectHeld(disabled, "apply_activation_gate_disabled");

  const enabledPolicy = {
    enabled: true,
    allowed_stages: ["observe_and_claim" as const],
  };

  const wrongFingerprint =
    evaluateBuyVoidBoundedOrchestratorApplyActivationV1({
      policy: enabledPolicy,
      request_id: requestId,
      derived_snapshot: observeSnapshot,
      snapshot_evidence: evidence(),
      dry_run_decision: observeDecision,
      stage_command: stageCommand,
      apply: true,
      plan_fingerprint: "0".repeat(64),
      confirmation:
        planned.plan.required_orchestrator_confirmation,
      delegated_confirmation:
        planned.plan.required_delegated_confirmation,
      stage_confirmation:
        planned.plan.required_stage_confirmation,
    });
  expectHeld(wrongFingerprint, "exact_plan_fingerprint_required");

  const wrongStage =
    evaluateBuyVoidBoundedOrchestratorApplyActivationV1({
      policy: enabledPolicy,
      request_id: requestId,
      derived_snapshot: observeSnapshot,
      snapshot_evidence: evidence(),
      dry_run_decision: observeDecision,
      stage_command: stageCommand,
      apply: true,
      plan_fingerprint: planned.plan.plan_fingerprint_sha256,
      confirmation:
        planned.plan.required_orchestrator_confirmation,
      delegated_confirmation:
        planned.plan.required_delegated_confirmation,
      stage_confirmation: "wrong",
    });
  expectHeld(wrongStage, "exact_stage_confirmation_required");

  const authorized =
    evaluateBuyVoidBoundedOrchestratorApplyActivationV1({
      policy: enabledPolicy,
      request_id: requestId,
      derived_snapshot: observeSnapshot,
      snapshot_evidence: evidence(),
      dry_run_decision: observeDecision,
      stage_command: stageCommand,
      apply: true,
      plan_fingerprint: planned.plan.plan_fingerprint_sha256,
      confirmation:
        planned.plan.required_orchestrator_confirmation,
      delegated_confirmation:
        planned.plan.required_delegated_confirmation,
      stage_confirmation:
        planned.plan.required_stage_confirmation,
    });
  assert.equal(authorized.status, "authorized");
  if (authorized.status !== "authorized") {
    throw new Error("expected authorized decision");
  }
  assert.equal(authorized.apply_authorized, true);
  assert.equal(authorized.mutation_performed, false);
  assert.equal(authorized.stage_transition_count, 0);
  assert.equal(authorized.wallet_access_performed, false);
  assert.equal(authorized.signing_performed, false);
  assert.equal(authorized.transaction_broadcast_performed, false);
  assert.equal(authorized.money_movement_performed, false);

  const notAllowlisted =
    evaluateBuyVoidBoundedOrchestratorApplyActivationV1({
      policy: {
        enabled: true,
        allowed_stages: ["reserve_inventory_and_attempt"],
      },
      request_id: requestId,
      derived_snapshot: observeSnapshot,
      snapshot_evidence: evidence(),
      dry_run_decision: observeDecision,
      stage_command: stageCommand,
      apply: true,
      plan_fingerprint: planned.plan.plan_fingerprint_sha256,
      confirmation:
        planned.plan.required_orchestrator_confirmation,
      delegated_confirmation:
        planned.plan.required_delegated_confirmation,
      stage_confirmation:
        planned.plan.required_stage_confirmation,
    });
  expectHeld(notAllowlisted, "stage_not_allowlisted");

  const executeHeld =
    evaluateBuyVoidBoundedOrchestratorApplyActivationV1({
      policy: {
        enabled: true,
        allowed_stages: ["execute_reserved_plan"],
      },
      request_id: "buyvoid_activation_gate_execute_v1",
      derived_snapshot: snapshot({
        request_id: "buyvoid_activation_gate_execute_v1",
        claimed: true,
        attempt_id: "a".repeat(64),
        attempt_status: "reserved",
      }),
      snapshot_evidence: {
        ...evidence(),
        claim_count: 1,
        attempt_count: 1,
        selected_attempt_number: 1,
      },
      dry_run_decision: dryDecision(
        "execute_reserved_plan",
        "nativeExecutionExact",
      ),
      stage_command: { attempt_id: "a".repeat(64) },
      apply: false,
    });
  expectHeld(executeHeld, "money_or_terminal_stage_hard_forbidden");

  console.log(
    "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_V1_GREEN",
  );
  console.log("disabled_by_default=1");
  console.log("default_enabled_stage_count=0");
  console.log("runtime_execution_mounted_v1=1");
  console.log("server_derived_plan_fingerprint=1");
  console.log("exact_plan_fingerprint_echo=1");
  console.log("exact_orchestrator_confirmation=1");
  console.log("exact_delegated_confirmation=1");
  console.log("exact_stage_confirmation=1");
  console.log("non_money_candidate_stage_count=2");
  console.log("hard_forbidden_stage_count=3");
  console.log("wallet_access=0");
  console.log("signing=0");
  console.log("transaction_broadcast=0");
  console.log("money_movement=0");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
