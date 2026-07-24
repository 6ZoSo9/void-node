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

function response(): {
  code: number;
  value: any;
  status: (code: number) => any;
  json: (value: unknown) => unknown;
} {
  const state: any = {
    code: 0,
    value: null,
  };
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

async function main(): Promise<void> {
  const previousEnable = process.env[ENABLE_ENV];
  const previousMax = process.env[MAX_ENV];
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-orchestrator-runtime-v1-"),
  );
  const requestDir = path.join(root, "requests");
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });
  const requestId = "buyvoid_runtime_dry_v1";
  writeRequest(requestDir, requestId);

  try {
    delete process.env[ENABLE_ENV];
    delete process.env[MAX_ENV];

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
        .wallet_access,
      false,
    );
    assert.equal(
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_AUTHORITY_V1
        .client_supplied_snapshot_forbidden,
      true,
    );

    const disabledStatus =
      buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1();
    assert.equal(disabledStatus.enabled, false);
    assert.equal(
      disabledStatus.snapshot_source,
      "server_derived_request_id_only",
    );
    const disabledActivation =
      disabledStatus.apply_activation_gate as Record<string, any>;
    assert.equal(disabledActivation.enabled, false);
    assert.equal(disabledActivation.enabled_stage_count, 0);
    assert.equal(
      disabledActivation.runtime_execution_mounted_v1,
      false,
    );

    const disabledRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body: {
          action:
            VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
          request_id: requestId,
        },
      },
      disabledRes,
      {
        root_dir: root,
        request_dir: requestDir,
      },
    );
    assert.equal(disabledRes.code, 503);
    assert.equal(
      disabledRes.value.error,
      "bounded_auto_fulfillment_orchestrator_disabled",
    );

    process.env[ENABLE_ENV] = "true";
    process.env[MAX_ENV] = "1";

    const dryRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "::1" },
        body: {
          action:
            VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
          request_id: requestId,
        },
      },
      dryRes,
      {
        root_dir: root,
        request_dir: requestDir,
        snapshot_dependencies: {
          list_claims: () => [],
          list_attempts: () => [],
          read_broadcast: () => null,
          list_confirmed: () => [],
        },
      },
    );
    assert.equal(dryRes.code, 200);
    assert.equal(dryRes.value.ok, true);
    assert.equal(dryRes.value.dry_run_only, true);
    assert.equal(
      dryRes.value.snapshot_source,
      "server_derived_request_id_only",
    );
    assert.equal(
      dryRes.value.decision.selected_stage,
      "observe_and_claim",
    );

    const applyRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body: {
          action:
            VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
          request_id: requestId,
          apply: true,
        },
      },
      applyRes,
      {
        root_dir: root,
        request_dir: requestDir,
      },
    );
    assert.equal(applyRes.code, 503);
    assert.equal(
      applyRes.value.error,
      "runtime_apply_not_enabled_v1",
    );
    assert.equal(
      applyRes.value.activation_error,
      "apply_activation_gate_disabled",
    );
    assert.equal(
      applyRes.value.legacy_apply_hard_stop,
      true,
    );
    assert.equal(
      applyRes.value.apply_activation.status,
      "held",
    );
    assert.equal(
      applyRes.value.apply_activation.reason,
      "apply_activation_gate_disabled",
    );
    assert.equal(
      applyRes.value.apply_activation.apply_authorized,
      false,
    );

    const forbiddenRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body: {
          action:
            VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
          root_dir: "/tmp/attacker",
          request_id: requestId,
        },
      },
      forbiddenRes,
      {
        root_dir: root,
        request_dir: requestDir,
      },
    );
    assert.equal(forbiddenRes.code, 400);
    assert.equal(
      forbiddenRes.value.error,
      "runtime_paths_are_server_controlled",
    );

    const snapshotRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body: {
          action:
            VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
          request_id: requestId,
          snapshot: { request_id: "attacker" },
        },
      },
      snapshotRes,
      {
        root_dir: root,
        request_dir: requestDir,
      },
    );
    assert.equal(snapshotRes.code, 400);
    assert.equal(
      snapshotRes.value.error,
      "client_supplied_snapshot_forbidden",
    );

    process.env[MAX_ENV] = "2";
    const capRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body: {
          action:
            VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
          request_id: requestId,
        },
      },
      capRes,
      {
        root_dir: root,
        request_dir: requestDir,
      },
    );
    assert.equal(capRes.code, 503);
    assert.equal(capRes.value.error, "hard_request_cap_mismatch");

    console.log(
      "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1_GREEN",
    );
    console.log("server_derived_snapshot=1");
    console.log("request_id_only_selector=1");
    console.log("client_supplied_snapshot=0");
    console.log("operator_loopback_only=1");
    console.log("disabled_by_default=1");
    console.log("dry_run_only_v1=1");
    console.log("runtime_apply=0");
    console.log("apply_activation_gate_present=1");
    console.log("apply_activation_gate_enabled=0");
    console.log("enabled_stage_count=0");
    console.log("runtime_apply_execution_mounted=0");
    console.log("hard_max_requests_per_run=1");
    console.log("wallet_access=0");
    console.log("signing=0");
    console.log("transaction_broadcast=0");
    console.log("money_movement=0");
    console.log("background_loop=0");
    console.log("startup_execution=0");
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
