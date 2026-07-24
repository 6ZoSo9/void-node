import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_AUTHORITY_V1,
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
  runBuyVoidBoundedAutoFulfillmentOrchestratorV1,
} from "../src/economic/buy_void_bounded_auto_fulfillment_orchestrator_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
} from "../src/economic/buy_void_pipeline_coordinator_v1.js";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
} from "../src/economic/buy_void_native_execution_worker_v1.js";

async function main(): Promise<void> {
  assert.equal(
    VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_AUTHORITY_V1
      .one_request_per_invocation,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_AUTHORITY_V1
      .one_stage_transition_per_invocation,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_AUTHORITY_V1
      .automatic_retry,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_AUTHORITY_V1
      .background_loop,
    false,
  );

  const root = "/tmp/void-buy-bounded-orchestrator-proof-v1";

  const dryClaim = await runBuyVoidBoundedAutoFulfillmentOrchestratorV1({
    root_dir: root,
    snapshot: {
      request_id: "buyvoid_contract_claim_v1",
      public_status: "payment_submitted_pending_manual_review",
      claim_status: "missing",
      attempt_status: "missing",
      broadcast_status: "none",
    },
  });
  assert.equal(dryClaim.ok, true);
  assert.equal(dryClaim.status, "dry_run");
  assert.equal(dryClaim.selected_stage, "observe_and_claim");
  assert.equal(
    dryClaim.required_delegated_confirmation,
    VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_and_claim,
  );

  const dryReserve = await runBuyVoidBoundedAutoFulfillmentOrchestratorV1({
    root_dir: root,
    snapshot: {
      request_id: "buyvoid_contract_reserve_v1",
      claim_status: "claimed",
      attempt_status: "missing",
      broadcast_status: "none",
    },
  });
  assert.equal(dryReserve.ok, true);
  assert.equal(
    dryReserve.selected_stage,
    "reserve_inventory_and_attempt",
  );

  const dryUnknown = await runBuyVoidBoundedAutoFulfillmentOrchestratorV1({
    root_dir: root,
    snapshot: {
      request_id: "buyvoid_contract_unknown_v1",
      claim_status: "claimed",
      attempt_id: "a".repeat(64),
      attempt_status: "broadcast",
      broadcast_status: "broadcast_unknown",
    },
    stage_command: {
      action: "record_broadcast_unknown",
      request_id: "buyvoid_contract_unknown_v1",
    },
  });
  assert.equal(dryUnknown.ok, true);
  assert.equal(
    dryUnknown.selected_stage,
    "reconcile_possible_broadcast",
  );
  assert.equal(dryUnknown.automatic_retry, false);

  let pipelineCalls = 0;
  const appliedClaim = await runBuyVoidBoundedAutoFulfillmentOrchestratorV1({
    root_dir: root,
    snapshot: {
      request_id: "buyvoid_contract_apply_claim_v1",
      claim_status: "missing",
      attempt_status: "missing",
      broadcast_status: "none",
    },
    stage_command: {
      action: "verify_and_claim",
      request_id: "buyvoid_contract_apply_claim_v1",
    },
    apply: true,
    confirmation:
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
    delegated_confirmation:
      VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_and_claim,
    dependencies: {
      run_pipeline_command: (command) => {
        pipelineCalls += 1;
        assert.equal(command.root_dir, root);
        assert.equal(command.apply, true);
        assert.equal(
          command.confirmation,
          VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_and_claim,
        );
        return {
          ok: true,
          status: "applied",
          applied: true,
          mutation_performed: true,
        };
      },
    },
  });
  assert.equal(appliedClaim.ok, true);
  assert.equal(appliedClaim.status, "applied");
  assert.equal(appliedClaim.stage_transition_count, 1);
  assert.equal(pipelineCalls, 1);
  assert.equal(appliedClaim.wallet_access_performed, false);

  const missingConfirmation =
    await runBuyVoidBoundedAutoFulfillmentOrchestratorV1({
      root_dir: root,
      snapshot: {
        request_id: "buyvoid_contract_missing_confirmation_v1",
        claim_status: "missing",
        attempt_status: "missing",
        broadcast_status: "none",
      },
      stage_command: {
        action: "verify_and_claim",
        request_id: "buyvoid_contract_missing_confirmation_v1",
      },
      apply: true,
      delegated_confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.verify_and_claim,
      dependencies: {
        run_pipeline_command: () => {
          throw new Error("must_not_run");
        },
      },
    });
  assert.equal(missingConfirmation.ok, false);
  if (missingConfirmation.ok) throw new Error("expected hold");
  assert.equal(
    missingConfirmation.reason,
    "explicit_orchestrator_confirmation_required",
  );

  let nativeCalls = 0;
  const attemptId = "b".repeat(64);
  const appliedExecution =
    await runBuyVoidBoundedAutoFulfillmentOrchestratorV1({
      root_dir: root,
      snapshot: {
        request_id: "buyvoid_contract_execute_v1",
        claim_status: "claimed",
        attempt_id: attemptId,
        attempt_status: "prepared",
        broadcast_status: "none",
      },
      stage_command: {
        request_id: "buyvoid_contract_execute_v1",
        attempt_id: attemptId,
      },
      apply: true,
      confirmation:
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_CONFIRMATION_V1,
      delegated_confirmation:
        VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
      dependencies: {
        run_native_execution_command: (command) => {
          nativeCalls += 1;
          assert.equal(command.attempt_id, attemptId);
          assert.equal(command.root_dir, root);
          return {
            ok: true,
            status: "broadcast_accepted",
            applied: true,
            mutation_performed: true,
            wallet_access_performed: true,
            signing_performed: true,
            transaction_broadcast_performed: true,
            money_movement_performed: true,
          };
        },
      },
    });
  assert.equal(appliedExecution.ok, true);
  assert.equal(nativeCalls, 1);
  assert.equal(appliedExecution.wallet_access_performed, true);
  assert.equal(appliedExecution.signing_performed, true);
  assert.equal(
    appliedExecution.transaction_broadcast_performed,
    true,
  );
  assert.equal(appliedExecution.money_movement_performed, true);
  assert.equal(appliedExecution.automatic_retry, false);

  const terminal = await runBuyVoidBoundedAutoFulfillmentOrchestratorV1({
    root_dir: root,
    snapshot: {
      request_id: "buyvoid_contract_terminal_v1",
      public_status: "fulfilled",
      claim_status: "claimed",
      attempt_status: "confirmed",
      broadcast_status: "confirmed",
    },
  });
  assert.equal(terminal.ok, true);
  assert.equal(terminal.terminal, true);
  assert.equal(terminal.selected_stage, null);

  console.log(
    "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_V1_GREEN",
  );
  console.log("stage_count=5");
  console.log("one_request_per_invocation=1");
  console.log("one_stage_transition_per_invocation=1");
  console.log("dry_by_default=1");
  console.log("exact_orchestrator_confirmation_required=1");
  console.log("exact_delegated_confirmation_required=1");
  console.log("no_retry_after_possible_broadcast=1");
  console.log("background_loop=0");
  console.log("startup_execution=0");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
