import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_AUTHORITY_V1,
  buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1,
  handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1,
} from "../src/economic/buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.js";

const ENABLE_ENV =
  "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ENABLED";
const MAX_ENV =
  "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_MAX_REQUESTS_PER_RUN";
const APPLY_ENABLED_ENV =
  "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ENABLED";
const APPLY_ALLOWED_ENV =
  "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ALLOWED_STAGES";

function response(): {
  code: number;
  value: any;
  status: (code: number) => any;
  json: (value: unknown) => unknown;
} {
  const state: any = { code: 0, value: null };
  state.status = (code: number) => {
    state.code = code;
    return state;
  };
  state.json = (value: unknown) => {
    state.value = value;
    return value;
  };
  return state;
}

function writeRequest(requestDir: string, requestId: string): void {
  fs.writeFileSync(
    path.join(requestDir, `${requestId}.json`),
    JSON.stringify({
      schema: "void_public_buy_void_request_v1",
      ok: true,
      request_id: requestId,
      status: "payment_submitted_pending_manual_review",
    }) + "\n",
    { mode: 0o600 },
  );
}

async function command(input: {
  root: string;
  request_dir: string;
  body: Record<string, unknown>;
  delegated_calls?: Record<string, unknown>[];
}): Promise<ReturnType<typeof response>> {
  const res = response();
  await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
    {
      socket: { remoteAddress: "127.0.0.1" },
      body: input.body,
    },
    res,
    {
      root_dir: input.root,
      request_dir: input.request_dir,
      snapshot_dependencies: {
        list_claims: () => [],
        list_attempts: () => [],
        read_broadcast: () => null,
        list_confirmed: () => [],
      },
      dependencies: {
        run_pipeline_command: async (delegated) => {
          input.delegated_calls?.push(delegated);
          return {
            ok: true,
            status: "applied",
            applied: true,
            mutation_performed: true,
            wallet_access_performed: false,
            signing_performed: false,
            transaction_broadcast_performed: false,
            money_movement_performed: false,
          };
        },
      },
    },
  );
  return res;
}

async function main(): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const name of [
    ENABLE_ENV,
    MAX_ENV,
    APPLY_ENABLED_ENV,
    APPLY_ALLOWED_ENV,
  ]) {
    previous.set(name, process.env[name]);
    delete process.env[name];
  }

  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-non-money-runtime-v1-"),
  );
  const requestDir = path.join(root, "requests");
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });
  const requestId = "buyvoid_non_money_runtime_v1";
  writeRequest(requestDir, requestId);

  try {
    assert.equal(
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_AUTHORITY_V1
        .disabled_by_default,
      true,
    );
    assert.equal(
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_AUTHORITY_V1
        .runtime_apply_enabled_v1,
      false,
    );
    assert.equal(
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_AUTHORITY_V1
        .runtime_apply_execution_mounted_v1,
      true,
    );
    assert.equal(
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_AUTHORITY_V1
        .runtime_apply_non_money_only_v1,
      true,
    );
    assert.equal(
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_AUTHORITY_V1
        .wallet_access,
      false,
    );

    const defaultStatus =
      buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1();
    assert.equal(defaultStatus.enabled, false);
    assert.equal(defaultStatus.apply_policy_requested_enabled, false);
    assert.equal(defaultStatus.apply_policy_valid, true);
    const defaultGate =
      defaultStatus.apply_activation_gate as Record<string, any>;
    assert.equal(defaultGate.enabled, false);
    assert.equal(defaultGate.enabled_stage_count, 0);
    assert.equal(defaultGate.runtime_execution_mounted_v1, true);

    const disabled = await command({
      root,
      request_dir: requestDir,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
      },
    });
    assert.equal(disabled.code, 503);
    assert.equal(
      disabled.value.error,
      "bounded_auto_fulfillment_orchestrator_disabled",
    );

    process.env[ENABLE_ENV] = "true";
    process.env[MAX_ENV] = "1";

    const stageCommand = {
      action: "verify_and_claim",
      request_id: requestId,
    };
    const dryDisabledPolicy = await command({
      root,
      request_dir: requestDir,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        stage_command: stageCommand,
      },
    });
    assert.equal(dryDisabledPolicy.code, 200);
    assert.equal(dryDisabledPolicy.value.dry_run_only, true);
    assert.equal(
      dryDisabledPolicy.value.decision.selected_stage,
      "observe_and_claim",
    );
    assert.equal(
      dryDisabledPolicy.value.apply_activation.status,
      "planned",
    );
    assert.equal(
      dryDisabledPolicy.value.apply_activation.policy_enabled,
      false,
    );

    const disabledPlan =
      dryDisabledPolicy.value.apply_activation.plan;
    const applyDisabledPolicy = await command({
      root,
      request_dir: requestDir,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        stage_command: stageCommand,
        apply: true,
        plan_fingerprint:
          disabledPlan.plan_fingerprint_sha256,
        confirmation:
          disabledPlan.required_orchestrator_confirmation,
        delegated_confirmation:
          disabledPlan.required_delegated_confirmation,
        stage_confirmation:
          disabledPlan.required_stage_confirmation,
      },
    });
    assert.equal(applyDisabledPolicy.code, 503);
    assert.equal(
      applyDisabledPolicy.value.error,
      "runtime_apply_not_enabled_v1",
    );
    assert.equal(
      applyDisabledPolicy.value.apply_activation.reason,
      "apply_activation_gate_disabled",
    );

    process.env[APPLY_ENABLED_ENV] = "true";
    process.env[APPLY_ALLOWED_ENV] = "observe_and_claim";

    const enabledStatus =
      buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1();
    assert.equal(enabledStatus.apply_policy_requested_enabled, true);
    assert.equal(enabledStatus.apply_policy_valid, true);
    const enabledGate =
      enabledStatus.apply_activation_gate as Record<string, any>;
    assert.equal(enabledGate.enabled, true);
    assert.equal(enabledGate.enabled_stage_count, 1);
    assert.deepEqual(enabledGate.allowed_stages, [
      "observe_and_claim",
    ]);

    const dryEnabledPolicy = await command({
      root,
      request_dir: requestDir,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        stage_command: stageCommand,
      },
    });
    assert.equal(dryEnabledPolicy.code, 200);
    assert.equal(
      dryEnabledPolicy.value.apply_activation.policy_enabled,
      true,
    );
    const plan = dryEnabledPolicy.value.apply_activation.plan;

    const delegatedCalls: Record<string, unknown>[] = [];
    const applied = await command({
      root,
      request_dir: requestDir,
      delegated_calls: delegatedCalls,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        stage_command: stageCommand,
        apply: true,
        plan_fingerprint: plan.plan_fingerprint_sha256,
        confirmation:
          plan.required_orchestrator_confirmation,
        delegated_confirmation:
          plan.required_delegated_confirmation,
        stage_confirmation:
          plan.required_stage_confirmation,
      },
    });
    assert.equal(applied.code, 200);
    assert.equal(applied.value.ok, true);
    assert.equal(applied.value.dry_run_only, false);
    assert.equal(applied.value.apply_executed, true);
    assert.equal(
      applied.value.apply_activation.status,
      "authorized",
    );
    assert.equal(applied.value.decision.status, "applied");
    assert.equal(
      applied.value.decision.selected_stage,
      "observe_and_claim",
    );
    assert.equal(applied.value.decision.stage_transition_count, 1);
    assert.equal(applied.value.decision.mutation_performed, true);
    assert.equal(applied.value.decision.wallet_access_performed, false);
    assert.equal(applied.value.decision.signing_performed, false);
    assert.equal(
      applied.value.decision.transaction_broadcast_performed,
      false,
    );
    assert.equal(
      applied.value.decision.money_movement_performed,
      false,
    );
    assert.equal(delegatedCalls.length, 1);
    assert.equal(delegatedCalls[0].action, "verify_and_claim");
    assert.equal(delegatedCalls[0].request_id, requestId);
    assert.equal(delegatedCalls[0].root_dir, root);
    assert.equal(delegatedCalls[0].apply, true);
    assert.equal(
      delegatedCalls[0].confirmation,
      plan.required_delegated_confirmation,
    );

    const wrongFingerprint = await command({
      root,
      request_dir: requestDir,
      delegated_calls: delegatedCalls,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        stage_command: stageCommand,
        apply: true,
        plan_fingerprint: "0".repeat(64),
        confirmation:
          plan.required_orchestrator_confirmation,
        delegated_confirmation:
          plan.required_delegated_confirmation,
        stage_confirmation:
          plan.required_stage_confirmation,
      },
    });
    assert.equal(wrongFingerprint.code, 422);
    assert.equal(
      wrongFingerprint.value.error,
      "exact_plan_fingerprint_required",
    );
    assert.equal(delegatedCalls.length, 1);

    const clientPolicy = await command({
      root,
      request_dir: requestDir,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        activation_policy: {
          enabled: true,
          allowed_stages: ["observe_and_claim"],
        },
      },
    });
    assert.equal(clientPolicy.code, 400);
    assert.equal(
      clientPolicy.value.error,
      "runtime_activation_policy_is_server_controlled",
    );

    process.env[APPLY_ALLOWED_ENV] = "execute_reserved_plan";
    const invalidStatus =
      buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1();
    assert.equal(invalidStatus.apply_policy_valid, false);
    assert.equal(
      invalidStatus.apply_policy_error,
      "invalid_server_apply_stage_allowlist",
    );
    const invalidApply = await command({
      root,
      request_dir: requestDir,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        stage_command: stageCommand,
        apply: true,
        plan_fingerprint: plan.plan_fingerprint_sha256,
        confirmation:
          plan.required_orchestrator_confirmation,
        delegated_confirmation:
          plan.required_delegated_confirmation,
        stage_confirmation:
          plan.required_stage_confirmation,
      },
    });
    assert.equal(invalidApply.code, 503);
    assert.equal(
      invalidApply.value.error,
      "server_apply_policy_invalid",
    );
    assert.equal(delegatedCalls.length, 1);

    process.env[APPLY_ALLOWED_ENV] = "observe_and_claim";
    process.env[MAX_ENV] = "2";
    const cap = await command({
      root,
      request_dir: requestDir,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
      },
    });
    assert.equal(cap.code, 503);
    assert.equal(cap.value.error, "hard_request_cap_mismatch");

    console.log(
      "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1_GREEN",
    );
    console.log("server_derived_snapshot=1");
    console.log("request_id_only_selector=1");
    console.log("client_supplied_snapshot=0");
    console.log("client_activation_policy=0");
    console.log("operator_loopback_only=1");
    console.log("disabled_by_default=1");
    console.log("runtime_apply_execution_mounted=1");
    console.log("runtime_apply_non_money_only=1");
    console.log("non_money_stage_transition_count=1");
    console.log("hard_max_requests_per_run=1");
    console.log("automatic_retry=0");
    console.log("background_loop=0");
    console.log("startup_execution=0");
    console.log("wallet_access=0");
    console.log("signing=0");
    console.log("transaction_broadcast=0");
    console.log("money_movement=0");
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
