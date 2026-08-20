import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
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

async function invoke(input: {
  root: string;
  request_dir: string;
  body: Record<string, unknown>;
  calls: Record<string, unknown>[];
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
        run_pipeline_command: async (command) => {
          input.calls.push(command);
          return {
            ok: true,
            status: "applied",
            applied: true,
            mutation_performed: true,
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
    path.join(os.tmpdir(), "void-buy-activation-runtime-v1-"),
  );
  const requestDir = path.join(root, "requests");
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });
  const requestId = "buyvoid_activation_runtime_v1";
  writeRequest(requestDir, requestId);
  const calls: Record<string, unknown>[] = [];

  try {
    process.env[ENABLE_ENV] = "true";
    process.env[MAX_ENV] = "1";

    const defaultStatus =
      buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1();
    const defaultGate =
      defaultStatus.apply_activation_gate as Record<string, any>;
    assert.equal(defaultGate.enabled, false);
    assert.equal(defaultGate.enabled_stage_count, 0);
    assert.equal(defaultGate.runtime_execution_mounted_v1, true);

    const stageCommand = {
      action: "verify_and_claim",
      request_id: requestId,
    };
    const dry = await invoke({
      root,
      request_dir: requestDir,
      calls,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        stage_command: stageCommand,
      },
    });
    assert.equal(dry.code, 200);
    assert.equal(dry.value.apply_activation.status, "planned");
    const disabledPlan = dry.value.apply_activation.plan;

    const disabledApply = await invoke({
      root,
      request_dir: requestDir,
      calls,
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
    assert.equal(disabledApply.code, 503);
    assert.equal(
      disabledApply.value.error,
      "runtime_apply_not_enabled_v1",
    );
    assert.equal(calls.length, 0);

    process.env[APPLY_ENABLED_ENV] = "true";
    process.env[APPLY_ALLOWED_ENV] = "observe_and_claim";

    const planned = await invoke({
      root,
      request_dir: requestDir,
      calls,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        stage_command: stageCommand,
      },
    });
    assert.equal(planned.code, 200);
    assert.equal(planned.value.apply_activation.status, "planned");
    assert.equal(
      planned.value.apply_activation.policy_enabled,
      true,
    );
    const plan = planned.value.apply_activation.plan;
    assert.match(plan.plan_fingerprint_sha256, /^[0-9a-f]{64}$/);

    const applied = await invoke({
      root,
      request_dir: requestDir,
      calls,
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
    assert.equal(applied.value.apply_activation.status, "authorized");
    assert.equal(applied.value.decision.status, "applied");
    assert.equal(applied.value.decision.stage_transition_count, 1);
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
    assert.equal(calls.length, 1);

    const changedCommand = await invoke({
      root,
      request_dir: requestDir,
      calls,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        stage_command: {
          ...stageCommand,
          note: "changed",
        },
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
    assert.equal(changedCommand.code, 422);
    assert.equal(
      changedCommand.value.error,
      "exact_plan_fingerprint_required",
    );
    assert.equal(calls.length, 1);

    const clientPolicy = await invoke({
      root,
      request_dir: requestDir,
      calls,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        allowed_stages: ["observe_and_claim"],
      },
    });
    assert.equal(clientPolicy.code, 400);
    assert.equal(
      clientPolicy.value.error,
      "runtime_activation_policy_is_server_controlled",
    );

    console.log(
      "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_RUNTIME_V1_GREEN",
    );
    console.log("runtime_gate_present=1");
    console.log("runtime_gate_default_enabled=0");
    console.log("runtime_apply_execution_mounted=1");
    console.log("server_derived_plan_fingerprint=1");
    console.log("exact_fingerprint_replay_guard=1");
    console.log("client_activation_policy=0");
    console.log("non_money_stage_transition_count=1");
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
