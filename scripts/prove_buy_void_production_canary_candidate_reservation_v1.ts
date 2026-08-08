import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ROUTE_V1,
  buyVoidProductionCanaryCandidateEndpointV1,
  parseBuyVoidProductionCanaryCandidateArgsV1,
  runBuyVoidProductionCanaryCandidateReservationV1,
  type BuyVoidProductionCanaryCandidateHttpPostV1,
} from "./buy_void_production_canary_candidate_reservation_v1.js";

const requestId = "buyvoid_candidate_1119_v1";
const sagaId = "void-buy-saga-test-1119";
const policyFingerprint = "a".repeat(64);
const attemptId = "b".repeat(64);
const runtimeConfirmation = "buyVoidRunCrashConsistentSagaRuntimeV1";
const sagaConfirmation = "advanceSaga";
const inventoryActionConfirmation = "reserveInventory";
const attemptActionConfirmation = "reserveExecutionAttempt";
const delegatedAttemptConfirmation = "buyVoidReserveExecution";

function dryRun(nextAction: string, options: {
  action_confirmation?: string;
  delegated_confirmation?: string | null;
  attempt_id?: string;
  attempt_status?: string;
} = {}): Record<string, unknown> {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1,
    version: 1,
    ok: true,
    status: "dry_run",
    applied: false,
    request_id: requestId,
    saga_id: sagaId,
    next_action: nextAction,
    required_runtime_confirmation: runtimeConfirmation,
    required_saga_confirmation: sagaConfirmation,
    required_action_confirmation:
      options.action_confirmation || inventoryActionConfirmation,
    required_delegated_confirmation:
      options.delegated_confirmation === undefined
        ? null
        : options.delegated_confirmation,
    required_policy_fingerprint_sha256: policyFingerprint,
    derived_snapshot: {
      request_id: requestId,
      claim_status: "claimed",
      attempt_id: options.attempt_id,
      attempt_status: options.attempt_status || "missing",
      broadcast_status: "none",
    },
  };
}

function applied(): Record<string, unknown> {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1,
    version: 1,
    ok: true,
    status: "applied",
    applied: true,
    request_id: requestId,
    saga_id: sagaId,
    server_policy_fingerprint_sha256: policyFingerprint,
    inventory_decrement_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
  };
}

function rejectArgs(argv: string[], expected: string): void {
  assert.throws(
    () => parseBuyVoidProductionCanaryCandidateArgsV1(argv),
    (error: unknown) => String((error as Error)?.message || error).includes(expected),
  );
}

async function main(): Promise<void> {
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
      .request_id_only_business_selector,
    true,
  );
  assert.deepEqual(
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
      .allowed_apply_stages,
    ["reserve_inventory", "reserve_execution_attempt"],
  );
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
      .prepare_transaction_apply_forbidden,
    true,
  );
  assert.equal(
    buyVoidProductionCanaryCandidateEndpointV1({}),
    `http://127.0.0.1:4100${VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ROUTE_V1}`,
  );
  assert.equal(
    buyVoidProductionCanaryCandidateEndpointV1({
      VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_OPERATOR_PORT: "4117",
    }),
    `http://127.0.0.1:4117${VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ROUTE_V1}`,
  );
  assert.throws(
    () => buyVoidProductionCanaryCandidateEndpointV1({
      VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_OPERATOR_PORT: "https://example.com",
    }),
    /invalid_operator_port/,
  );

  for (const option of [
    "--root-dir",
    "--request-dir",
    "--receipt",
    "--rpc-url",
    "--wallet",
    "--private-key",
    "--signer",
    "--broadcaster",
    "--raw-signed-transaction",
  ]) {
    rejectArgs(["--request-id", requestId, option, "x"], "unexpected_option");
  }
  rejectArgs(
    ["--request-id", requestId, "--confirm", runtimeConfirmation],
    "apply_confirmation_without_apply",
  );

  let claimCalls = 0;
  const claimPost: BuyVoidProductionCanaryCandidateHttpPostV1 = async ({ body }) => {
    claimCalls += 1;
    assert.equal(body.apply, false);
    return { status: 200, json: dryRun("claim_payment") };
  };
  const claimDecision = await runBuyVoidProductionCanaryCandidateReservationV1({
    args: { request_id: requestId, apply: false },
    endpoint: "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/command",
    http_post: claimPost,
  });
  assert.equal(claimDecision.ok, false);
  if (claimDecision.ok) throw new Error("expected claim hold");
  assert.equal(claimDecision.reason, "candidate_requires_existing_claim");
  assert.equal(claimCalls, 1);

  let inventoryPlanCalls = 0;
  const inventoryPlanPost: BuyVoidProductionCanaryCandidateHttpPostV1 = async ({ body }) => {
    inventoryPlanCalls += 1;
    assert.deepEqual(body, {
      action: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1,
      request_id: requestId,
      apply: false,
    });
    return { status: 200, json: dryRun("reserve_inventory") };
  };
  const inventoryPlan = await runBuyVoidProductionCanaryCandidateReservationV1({
    args: { request_id: requestId, apply: false },
    endpoint: "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/command",
    http_post: inventoryPlanPost,
  });
  assert.equal(inventoryPlan.ok, true);
  if (!inventoryPlan.ok || inventoryPlan.status !== "planned") {
    throw new Error("expected inventory plan");
  }
  assert.equal(inventoryPlan.next_action, "reserve_inventory");
  assert.equal(inventoryPlan.required_delegated_confirmation, null);
  assert.match(inventoryPlan.plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.equal(inventoryPlanCalls, 1);

  let staleCalls = 0;
  const stalePost: BuyVoidProductionCanaryCandidateHttpPostV1 = async () => {
    staleCalls += 1;
    return { status: 200, json: dryRun("reserve_inventory") };
  };
  const stale = await runBuyVoidProductionCanaryCandidateReservationV1({
    args: {
      request_id: requestId,
      apply: true,
      confirmation: runtimeConfirmation,
      saga_confirmation: sagaConfirmation,
      action_confirmation: inventoryActionConfirmation,
      policy_fingerprint_sha256: policyFingerprint,
      expected_plan_fingerprint_sha256: "0".repeat(64),
    },
    endpoint: "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/command",
    http_post: stalePost,
  });
  assert.equal(stale.ok, false);
  if (stale.ok) throw new Error("expected stale hold");
  assert.equal(stale.reason, "exact_plan_fingerprint_required");
  assert.equal(staleCalls, 1);

  let inventoryApplyCalls = 0;
  const inventoryApplyPost: BuyVoidProductionCanaryCandidateHttpPostV1 = async ({ body }) => {
    inventoryApplyCalls += 1;
    if (inventoryApplyCalls === 1) {
      assert.equal(body.apply, false);
      return { status: 200, json: dryRun("reserve_inventory") };
    }
    assert.deepEqual(body, {
      action: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1,
      request_id: requestId,
      apply: true,
      confirmation: runtimeConfirmation,
      saga_confirmation: sagaConfirmation,
      action_confirmation: inventoryActionConfirmation,
      policy_fingerprint_sha256: policyFingerprint,
    });
    return { status: 200, json: applied() };
  };
  const inventoryApply = await runBuyVoidProductionCanaryCandidateReservationV1({
    args: {
      request_id: requestId,
      apply: true,
      confirmation: runtimeConfirmation,
      saga_confirmation: sagaConfirmation,
      action_confirmation: inventoryActionConfirmation,
      policy_fingerprint_sha256: policyFingerprint,
      expected_plan_fingerprint_sha256: inventoryPlan.plan_fingerprint_sha256,
    },
    endpoint: "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/command",
    http_post: inventoryApplyPost,
  });
  assert.equal(inventoryApply.ok, true);
  assert.equal(inventoryApply.status, "applied");
  if (inventoryApply.status !== "applied") throw new Error("expected applied inventory");
  assert.equal(inventoryApply.applied_stage, "reserve_inventory");
  assert.equal(inventoryApply.stage_transition_count, 1);
  assert.equal(inventoryApplyCalls, 2);

  let attemptPlanCalls = 0;
  const attemptPlanPost: BuyVoidProductionCanaryCandidateHttpPostV1 = async () => {
    attemptPlanCalls += 1;
    return {
      status: 200,
      json: dryRun("reserve_execution_attempt", {
        action_confirmation: attemptActionConfirmation,
        delegated_confirmation: delegatedAttemptConfirmation,
      }),
    };
  };
  const attemptPlan = await runBuyVoidProductionCanaryCandidateReservationV1({
    args: { request_id: requestId, apply: false },
    endpoint: "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/command",
    http_post: attemptPlanPost,
  });
  assert.equal(attemptPlan.ok, true);
  if (!attemptPlan.ok || attemptPlan.status !== "planned") {
    throw new Error("expected attempt plan");
  }
  assert.equal(
    attemptPlan.required_delegated_confirmation,
    delegatedAttemptConfirmation,
  );
  assert.equal(attemptPlanCalls, 1);

  let attemptApplyCalls = 0;
  const attemptApplyPost: BuyVoidProductionCanaryCandidateHttpPostV1 = async ({ body }) => {
    attemptApplyCalls += 1;
    if (attemptApplyCalls === 1) {
      return {
        status: 200,
        json: dryRun("reserve_execution_attempt", {
          action_confirmation: attemptActionConfirmation,
          delegated_confirmation: delegatedAttemptConfirmation,
        }),
      };
    }
    assert.equal(body.apply, true);
    assert.equal(body.delegated_confirmation, delegatedAttemptConfirmation);
    assert.equal(body.action_confirmation, attemptActionConfirmation);
    return { status: 200, json: applied() };
  };
  const attemptApply = await runBuyVoidProductionCanaryCandidateReservationV1({
    args: {
      request_id: requestId,
      apply: true,
      confirmation: runtimeConfirmation,
      saga_confirmation: sagaConfirmation,
      action_confirmation: attemptActionConfirmation,
      delegated_confirmation: delegatedAttemptConfirmation,
      policy_fingerprint_sha256: policyFingerprint,
      expected_plan_fingerprint_sha256: attemptPlan.plan_fingerprint_sha256,
    },
    endpoint: "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/command",
    http_post: attemptApplyPost,
  });
  assert.equal(attemptApply.ok, true);
  assert.equal(attemptApply.status, "applied");
  if (attemptApply.status !== "applied") throw new Error("expected applied attempt");
  assert.equal(attemptApply.applied_stage, "reserve_execution_attempt");
  assert.equal(attemptApplyCalls, 2);

  let readyCalls = 0;
  const readyPost: BuyVoidProductionCanaryCandidateHttpPostV1 = async ({ body }) => {
    readyCalls += 1;
    assert.equal(body.apply, false);
    return {
      status: 200,
      json: dryRun("prepare_transaction", {
        action_confirmation: "prepareTransaction",
        attempt_id: attemptId,
        attempt_status: "reserved",
      }),
    };
  };
  const ready = await runBuyVoidProductionCanaryCandidateReservationV1({
    args: { request_id: requestId, apply: false },
    endpoint: "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/command",
    http_post: readyPost,
  });
  assert.equal(ready.ok, true);
  assert.equal(ready.status, "candidate_ready");
  if (!ready.ok || ready.status !== "candidate_ready") {
    throw new Error("expected candidate ready");
  }
  assert.equal(ready.candidate_attempt_id, attemptId);
  assert.equal(ready.candidate_attempt_status, "reserved");
  assert.equal(ready.apply_allowed, false);
  assert.equal(readyCalls, 1);

  let forbiddenPrepareCalls = 0;
  const forbiddenPreparePost: BuyVoidProductionCanaryCandidateHttpPostV1 = async () => {
    forbiddenPrepareCalls += 1;
    return {
      status: 200,
      json: dryRun("prepare_transaction", {
        action_confirmation: "prepareTransaction",
        attempt_id: attemptId,
        attempt_status: "reserved",
      }),
    };
  };
  const forbiddenPrepare = await runBuyVoidProductionCanaryCandidateReservationV1({
    args: {
      request_id: requestId,
      apply: true,
      confirmation: runtimeConfirmation,
      saga_confirmation: sagaConfirmation,
      action_confirmation: "prepareTransaction",
      policy_fingerprint_sha256: policyFingerprint,
      expected_plan_fingerprint_sha256: ready.plan_fingerprint_sha256,
    },
    endpoint: "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/command",
    http_post: forbiddenPreparePost,
  });
  assert.equal(forbiddenPrepare.ok, false);
  if (forbiddenPrepare.ok) throw new Error("expected prepare hold");
  assert.equal(forbiddenPrepare.reason, "candidate_ready_apply_forbidden");
  assert.equal(forbiddenPrepareCalls, 1);

  const source = fs.readFileSync(
    "scripts/buy_void_production_canary_candidate_reservation_v1.ts",
    "utf8",
  );
  for (const forbiddenImport of [
    "buy_void_inventory_reservation_journal_v1",
    "buy_void_execution_attempt_journal_v1",
    "buy_void_auto_reserve_plan_worker_v1",
    "reserveBuyVoidInventoryV1",
    "reserveBuyVoidExecutionAttemptV1",
  ]) {
    assert.equal(source.includes(forbiddenImport), false, forbiddenImport);
  }
  assert.equal(source.includes(VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ROUTE_V1), true);
  assert.equal(source.includes(VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1), true);

  console.log("VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1_PROOF_GREEN");
  console.log("request_id_only_business_selector=1");
  console.log("loopback_http_only=1");
  console.log("one_business_stage_per_invocation=1");
  console.log("claim_payment_apply=0");
  console.log("reserve_inventory_apply_bounded=1");
  console.log("reserve_execution_attempt_apply_separate=1");
  console.log("prepare_transaction_apply=0");
  console.log("candidate_attempt_id_exposed=1");
  console.log("money_movement_authority=0");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
