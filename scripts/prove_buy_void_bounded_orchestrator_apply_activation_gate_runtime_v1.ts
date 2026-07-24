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

function writeRequest(
  requestDir: string,
  requestId: string,
): void {
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
    },
  );
  return res;
}

async function main(): Promise<void> {
  const previousEnable = process.env[ENABLE_ENV];
  const previousMax = process.env[MAX_ENV];
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-activation-runtime-v1-"),
  );
  const requestDir = path.join(root, "requests");
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });

  try {
    const requestId = "buyvoid_activation_runtime_v1";
    writeRequest(requestDir, requestId);

    delete process.env[ENABLE_ENV];
    delete process.env[MAX_ENV];

    const disabledStatus =
      buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1();

    assert.equal(disabledStatus.enabled, false);
    assert.equal(
      disabledStatus.snapshot_source,
      "server_derived_request_id_only",
    );
    assert.equal(
      disabledStatus.client_supplied_snapshot_forbidden,
      true,
    );

    const disabledGate =
      disabledStatus.apply_activation_gate as Record<string, any>;
    assert.equal(disabledGate.enabled, false);
    assert.equal(disabledGate.enabled_stage_count, 0);
    assert.deepEqual(disabledGate.allowed_stages, []);
    assert.equal(disabledGate.runtime_execution_mounted_v1, false);

    process.env[ENABLE_ENV] = "true";
    process.env[MAX_ENV] = "1";

    const dry = await command({
      root,
      request_dir: requestDir,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        stage_command: {
          action: "verify_and_claim",
          request_id: requestId,
        },
      },
    });

    assert.equal(dry.code, 200);
    assert.equal(dry.value.ok, true);
    assert.equal(dry.value.dry_run_only, true);
    assert.equal(
      dry.value.snapshot_source,
      "server_derived_request_id_only",
    );
    assert.equal(
      dry.value.decision.selected_stage,
      "observe_and_claim",
    );
    assert.equal(dry.value.apply_activation.status, "planned");
    assert.equal(
      dry.value.apply_activation.apply_authorized,
      false,
    );
    assert.match(
      dry.value.apply_activation.plan.plan_fingerprint_sha256,
      /^[0-9a-f]{64}$/,
    );
    assert.equal(
      dry.value.apply_activation.plan.wallet_access_authorized,
      false,
    );
    assert.equal(
      dry.value.apply_activation.plan.signing_authorized,
      false,
    );
    assert.equal(
      dry.value.apply_activation.plan.transaction_broadcast_authorized,
      false,
    );
    assert.equal(
      dry.value.apply_activation.plan.money_movement_authorized,
      false,
    );

    const plan = dry.value.apply_activation.plan;

    const apply = await command({
      root,
      request_dir: requestDir,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        stage_command: {
          action: "verify_and_claim",
          request_id: requestId,
        },
        apply: true,
        plan_fingerprint: plan.plan_fingerprint_sha256,
        confirmation: plan.required_orchestrator_confirmation,
        delegated_confirmation:
          plan.required_delegated_confirmation,
        stage_confirmation: plan.required_stage_confirmation,
      },
    });

    assert.equal(apply.code, 503);
    assert.equal(apply.value.ok, false);
    assert.equal(
      apply.value.error,
      "runtime_apply_not_enabled_v1",
    );
    assert.equal(
      apply.value.activation_error,
      "apply_activation_gate_disabled",
    );
    assert.equal(apply.value.legacy_apply_hard_stop, true);
    assert.equal(
      apply.value.apply_activation.status,
      "held",
    );
    assert.equal(
      apply.value.apply_activation.reason,
      "apply_activation_gate_disabled",
    );
    assert.equal(
      apply.value.apply_activation.apply_authorized,
      false,
    );
    assert.equal(
      apply.value.apply_activation.mutation_performed,
      false,
    );
    assert.equal(
      apply.value.apply_activation.wallet_access_performed,
      false,
    );
    assert.equal(
      apply.value.apply_activation.signing_performed,
      false,
    );
    assert.equal(
      apply.value.apply_activation.transaction_broadcast_performed,
      false,
    );
    assert.equal(
      apply.value.apply_activation.money_movement_performed,
      false,
    );

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

    const allowedStages = await command({
      root,
      request_dir: requestDir,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        allowed_stages: ["observe_and_claim"],
      },
    });

    assert.equal(allowedStages.code, 400);
    assert.equal(
      allowedStages.value.error,
      "runtime_activation_policy_is_server_controlled",
    );

    const snapshot = await command({
      root,
      request_dir: requestDir,
      body: {
        action:
          VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        request_id: requestId,
        snapshot: { request_id: "attacker" },
      },
    });

    assert.equal(snapshot.code, 400);
    assert.equal(
      snapshot.value.error,
      "client_supplied_snapshot_forbidden",
    );

    console.log(
      "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ACTIVATION_GATE_RUNTIME_V1_GREEN",
    );
    console.log("runtime_gate_present=1");
    console.log("runtime_gate_enabled=0");
    console.log("runtime_enabled_stage_count=0");
    console.log("server_derived_plan_fingerprint=1");
    console.log("client_activation_policy=0");
    console.log("runtime_apply_execution_mounted=0");
    console.log("mutation_performed=0");
    console.log("wallet_access=0");
    console.log("signing=0");
    console.log("transaction_broadcast=0");
    console.log("money_movement=0");
  } finally {
    if (previousEnable === undefined) {
      delete process.env[ENABLE_ENV];
    } else {
      process.env[ENABLE_ENV] = previousEnable;
    }
    if (previousMax === undefined) {
      delete process.env[MAX_ENV];
    } else {
      process.env[MAX_ENV] = previousMax;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
