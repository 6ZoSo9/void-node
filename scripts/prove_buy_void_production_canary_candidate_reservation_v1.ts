import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_PARENT_RUNTIME_MARKER_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_COMMAND_ROUTE_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_STATUS_ROUTE_V1,
  buyVoidProductionCanaryCandidateCommandEndpointV1,
  buyVoidProductionCanaryCandidateStatusEndpointV1,
  parseBuyVoidProductionCanaryCandidateArgsV1,
  runBuyVoidProductionCanaryCandidateReservationV1,
  type BuyVoidProductionCanaryCandidateHttpGetV1,
  type BuyVoidProductionCanaryCandidateHttpPostV1,
} from "./buy_void_production_canary_candidate_reservation_v1.js";

const requestId = "buyvoid_candidate_1119_v1";
const sagaId = "void-buy-saga-test-1119";
const policyFingerprint = "a".repeat(64);
const attemptId = "b".repeat(64);
const runtimeConfirmation = "buyVoidRunCrashConsistentSagaRuntimeV1";
const sagaConfirmation = "buyVoidAdvanceCrashConsistentFulfillmentSagaV1";
const inventoryActionConfirmation = "buyVoidSagaReserveInventoryV1";
const attemptActionConfirmation = "buyVoidSagaReserveExecutionAttemptV1";
const delegatedAttemptConfirmation = "buyVoidReserveExecution";
const commandEndpoint =
  "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/command";
const statusEndpoint =
  "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/status";

function status(preparationEnabled = false): Record<string, unknown> {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_PARENT_RUNTIME_MARKER_V1,
    version: 1,
    ok: true,
    enabled: true,
    crash_consistent_saga_runtime: {
      marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1,
      version: 1,
      enabled: true,
      preparation_enabled: preparationEnabled,
    },
  };
}
function dryRun(
  nextAction: "reserve_inventory" | "reserve_execution_attempt",
  options: {
    action_confirmation?: string;
    delegated_confirmation?: string | null;
  } = {},
): Record<string, unknown> {
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
      attempt_status: "missing",
      broadcast_status: "none",
    },
  };
}
function applied(
  action: "reserve_inventory" | "reserve_execution_attempt",
): Record<string, unknown> {
  return {
    marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1,
    version: 1,
    ok: true,
    status: "applied",
    applied: true,
    request_id: requestId,
    saga_id: sagaId,
    result: {
      ok: true,
      status: "applied",
      action,
      state: action === "reserve_inventory"
        ? {
            state: "inventory_reserved",
            next_action: "reserve_execution_attempt",
          }
        : {
            state: "attempt_reserved",
            attempt_id: attemptId,
            attempt_number: 1,
            next_action: "prepare_transaction",
          },
    },
    server_policy_fingerprint_sha256: policyFingerprint,
    inventory_decrement_performed: false,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    public_fulfilled_closeout_performed: false,
    money_movement_performed: false,
  };
}
function getOk(): BuyVoidProductionCanaryCandidateHttpGetV1 {
  return async ({ url }) => {
    assert.equal(url, statusEndpoint);
    return { status: 200, json: status(false) };
  };
}
function rejectArgs(argv: string[], expected: string): void {
  assert.throws(
    () => parseBuyVoidProductionCanaryCandidateArgsV1(argv),
    (error: unknown) =>
      String((error as Error)?.message || error).includes(expected),
  );
}

async function main(): Promise<void> {
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
      .request_id_only_business_selector,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
      .transaction_preparation_gate_must_be_disabled,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
      .rpc_call,
    false,
  );
  assert.deepEqual(
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
      .allowed_apply_stages,
    ["reserve_inventory", "reserve_execution_attempt"],
  );
  assert.equal(
    buyVoidProductionCanaryCandidateCommandEndpointV1({}),
    `http://127.0.0.1:4100${VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_COMMAND_ROUTE_V1}`,
  );
  assert.equal(
    buyVoidProductionCanaryCandidateStatusEndpointV1({}),
    `http://127.0.0.1:4100${VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_STATUS_ROUTE_V1}`,
  );
  assert.equal(
    buyVoidProductionCanaryCandidateCommandEndpointV1({
      VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_OPERATOR_PORT: "4117",
    }),
    `http://127.0.0.1:4117${VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_COMMAND_ROUTE_V1}`,
  );
  assert.throws(
    () => buyVoidProductionCanaryCandidateCommandEndpointV1({
      VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_OPERATOR_PORT:
        "https://example.com",
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

  let unsafePreparationPosts = 0;
  const unsafePreparation =
    await runBuyVoidProductionCanaryCandidateReservationV1({
      args: { request_id: requestId, apply: false },
      command_endpoint: commandEndpoint,
      status_endpoint: statusEndpoint,
      http_get: async () => ({ status: 200, json: status(true) }),
      http_post: async () => {
        unsafePreparationPosts += 1;
        throw new Error("must_not_post");
      },
    });
  assert.equal(unsafePreparation.ok, false);
  if (unsafePreparation.ok) throw new Error("expected preparation hold");
  assert.equal(
    unsafePreparation.reason,
    "transaction_preparation_must_remain_disabled_for_candidate_reservation",
  );
  assert.equal(unsafePreparationPosts, 0);

  let claimPosts = 0;
  const claimDecision = await runBuyVoidProductionCanaryCandidateReservationV1({
    args: { request_id: requestId, apply: false },
    command_endpoint: commandEndpoint,
    status_endpoint: statusEndpoint,
    http_get: getOk(),
    http_post: async ({ body }) => {
      claimPosts += 1;
      assert.equal(body.apply, false);
      return {
        status: 422,
        json: {
          marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1,
          ok: false,
          error: "crash_consistent_saga_runtime_held",
          reason: "claim_stage_command_required",
        },
      };
    },
  });
  assert.equal(claimDecision.ok, false);
  if (claimDecision.ok) throw new Error("expected claim hold");
  assert.equal(claimDecision.reason, "candidate_requires_existing_claim");
  assert.equal(claimPosts, 1);

  let inventoryPlanPosts = 0;
  const inventoryPlanPost: BuyVoidProductionCanaryCandidateHttpPostV1 =
    async ({ url, body }) => {
      inventoryPlanPosts += 1;
      assert.equal(url, commandEndpoint);
      assert.deepEqual(body, {
        action: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1,
        request_id: requestId,
        apply: false,
      });
      return { status: 200, json: dryRun("reserve_inventory") };
    };
  const inventoryPlan =
    await runBuyVoidProductionCanaryCandidateReservationV1({
      args: { request_id: requestId, apply: false },
      command_endpoint: commandEndpoint,
      status_endpoint: statusEndpoint,
      http_get: getOk(),
      http_post: inventoryPlanPost,
    });
  assert.equal(inventoryPlan.ok, true);
  if (!inventoryPlan.ok || inventoryPlan.status !== "planned") {
    throw new Error("expected inventory plan");
  }
  assert.equal(inventoryPlan.next_action, "reserve_inventory");
  assert.equal(inventoryPlan.required_delegated_confirmation, null);
  assert.equal(inventoryPlan.runtime_preparation_enabled, false);
  assert.match(inventoryPlan.plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.equal(inventoryPlanPosts, 1);

  let stalePosts = 0;
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
    command_endpoint: commandEndpoint,
    status_endpoint: statusEndpoint,
    http_get: getOk(),
    http_post: async () => {
      stalePosts += 1;
      return { status: 200, json: dryRun("reserve_inventory") };
    },
  });
  assert.equal(stale.ok, false);
  if (stale.ok) throw new Error("expected stale hold");
  assert.equal(stale.reason, "exact_plan_fingerprint_required");
  assert.equal(stalePosts, 1);

  let inventoryApplyPosts = 0;
  const inventoryApply =
    await runBuyVoidProductionCanaryCandidateReservationV1({
      args: {
        request_id: requestId,
        apply: true,
        confirmation: runtimeConfirmation,
        saga_confirmation: sagaConfirmation,
        action_confirmation: inventoryActionConfirmation,
        policy_fingerprint_sha256: policyFingerprint,
        expected_plan_fingerprint_sha256: inventoryPlan.plan_fingerprint_sha256,
      },
      command_endpoint: commandEndpoint,
      status_endpoint: statusEndpoint,
      http_get: getOk(),
      http_post: async ({ body }) => {
        inventoryApplyPosts += 1;
        if (inventoryApplyPosts === 1) {
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
        return { status: 200, json: applied("reserve_inventory") };
      },
    });
  assert.equal(inventoryApply.ok, true);
  assert.equal(inventoryApply.status, "applied");
  if (!inventoryApply.ok || inventoryApply.status !== "applied") {
    throw new Error("expected applied inventory");
  }
  assert.equal(inventoryApply.applied_stage, "reserve_inventory");
  assert.equal(inventoryApply.stage_transition_count, 1);
  assert.equal(inventoryApplyPosts, 2);

  let attemptPlanPosts = 0;
  const attemptPlanPost: BuyVoidProductionCanaryCandidateHttpPostV1 =
    async () => {
      attemptPlanPosts += 1;
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
    command_endpoint: commandEndpoint,
    status_endpoint: statusEndpoint,
    http_get: getOk(),
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
  assert.equal(attemptPlanPosts, 1);

  let attemptApplyPosts = 0;
  const attemptApply =
    await runBuyVoidProductionCanaryCandidateReservationV1({
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
      command_endpoint: commandEndpoint,
      status_endpoint: statusEndpoint,
      http_get: getOk(),
      http_post: async ({ body }) => {
        attemptApplyPosts += 1;
        if (attemptApplyPosts === 1) {
          return {
            status: 200,
            json: dryRun("reserve_execution_attempt", {
              action_confirmation: attemptActionConfirmation,
              delegated_confirmation: delegatedAttemptConfirmation,
            }),
          };
        }
        assert.equal(body.apply, true);
        assert.equal(
          body.delegated_confirmation,
          delegatedAttemptConfirmation,
        );
        assert.equal(body.action_confirmation, attemptActionConfirmation);
        return {
          status: 200,
          json: applied("reserve_execution_attempt"),
        };
      },
    });
  assert.equal(attemptApply.ok, true);
  assert.equal(attemptApply.status, "candidate_ready");
  if (!attemptApply.ok || attemptApply.status !== "candidate_ready") {
    throw new Error("expected candidate ready");
  }
  assert.equal(attemptApply.applied, true);
  assert.equal(attemptApply.applied_stage, "reserve_execution_attempt");
  assert.equal(attemptApply.candidate_attempt_id, attemptId);
  assert.equal(
    attemptApply.candidate_handoff,
    "production_live_canary_preflight",
  );
  assert.equal(attemptApply.runtime_preparation_enabled, false);
  assert.equal(attemptApply.stage_transition_count, 1);
  assert.equal(attemptApplyPosts, 2);

  let alreadyReservedPosts = 0;
  const alreadyReserved =
    await runBuyVoidProductionCanaryCandidateReservationV1({
      args: { request_id: requestId, apply: false },
      command_endpoint: commandEndpoint,
      status_endpoint: statusEndpoint,
      http_get: getOk(),
      http_post: async () => {
        alreadyReservedPosts += 1;
        return {
          status: 503,
          json: {
            marker:
              VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_MARKER_V1,
            ok: false,
            error: "crash_consistent_saga_runtime_held",
            reason: "transaction_preparation_disabled",
          },
        };
      },
    });
  assert.equal(alreadyReserved.ok, false);
  if (alreadyReserved.ok) throw new Error("expected already-reserved hold");
  assert.equal(
    alreadyReserved.reason,
    "candidate_already_reserved_use_prior_candidate_receipt",
  );
  assert.equal(alreadyReservedPosts, 1);

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
    "runBuyVoidSagaPreparedTransactionCoordinatorV1",
  ]) {
    assert.equal(source.includes(forbiddenImport), false, forbiddenImport);
  }
  assert.equal(
    source.includes(
      VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_COMMAND_ROUTE_V1,
    ),
    true,
  );
  assert.equal(
    source.includes(
      VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_STATUS_ROUTE_V1,
    ),
    true,
  );
  assert.equal(
    source.includes(VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1),
    true,
  );

  console.log(
    "VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1_PROOF_GREEN",
  );
  console.log("request_id_only_business_selector=1");
  console.log("loopback_http_only=1");
  console.log("preparation_gate_required_disabled=1");
  console.log("rpc_call=0");
  console.log("one_business_stage_per_invocation=1");
  console.log("claim_payment_apply=0");
  console.log("reserve_inventory_apply_bounded=1");
  console.log("reserve_execution_attempt_apply_separate=1");
  console.log("candidate_attempt_id_from_apply_receipt=1");
  console.log("prepare_transaction_invocation=0");
  console.log("money_movement_authority=0");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
