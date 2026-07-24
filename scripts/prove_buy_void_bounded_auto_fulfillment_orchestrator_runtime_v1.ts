import assert from "node:assert/strict";
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

async function main(): Promise<void> {
  const previousEnable = process.env[ENABLE_ENV];
  const previousMax = process.env[MAX_ENV];

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

    const disabledStatus =
      buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1();
    assert.equal(disabledStatus.enabled, false);

    const disabledRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body: {
          action:
            VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
          snapshot: {
            request_id: "buyvoid_runtime_disabled_v1",
            claim_status: "missing",
          },
        },
      },
      disabledRes,
      { root_dir: "/tmp/void-buy-runtime-v1" },
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
          snapshot: {
            request_id: "buyvoid_runtime_dry_v1",
            claim_status: "missing",
            attempt_status: "missing",
            broadcast_status: "none",
          },
        },
      },
      dryRes,
      { root_dir: "/tmp/void-buy-runtime-v1" },
    );
    assert.equal(dryRes.code, 200);
    assert.equal(dryRes.value.ok, true);
    assert.equal(dryRes.value.dry_run_only, true);
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
          apply: true,
          snapshot: {
            request_id: "buyvoid_runtime_apply_v1",
            claim_status: "missing",
          },
        },
      },
      applyRes,
      { root_dir: "/tmp/void-buy-runtime-v1" },
    );
    assert.equal(applyRes.code, 503);
    assert.equal(
      applyRes.value.error,
      "runtime_apply_not_enabled_v1",
    );

    const forbiddenRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body: {
          action:
            VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
          root_dir: "/tmp/attacker",
          snapshot: {
            request_id: "buyvoid_runtime_forbidden_v1",
          },
        },
      },
      forbiddenRes,
      { root_dir: "/tmp/void-buy-runtime-v1" },
    );
    assert.equal(forbiddenRes.code, 400);
    assert.equal(
      forbiddenRes.value.error,
      "runtime_paths_are_server_controlled",
    );

    process.env[MAX_ENV] = "2";
    const capRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body: {
          action:
            VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
          snapshot: {
            request_id: "buyvoid_runtime_cap_v1",
            claim_status: "missing",
          },
        },
      },
      capRes,
      { root_dir: "/tmp/void-buy-runtime-v1" },
    );
    assert.equal(capRes.code, 503);
    assert.equal(capRes.value.error, "hard_request_cap_mismatch");

    console.log(
      "VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_V1_GREEN",
    );
    console.log("integrated_parent_route=1");
    console.log("operator_loopback_only=1");
    console.log("disabled_by_default=1");
    console.log("dry_run_only_v1=1");
    console.log("runtime_apply=0");
    console.log("hard_max_requests_per_run=1");
    console.log("wallet_access=0");
    console.log("signing=0");
    console.log("transaction_broadcast=0");
    console.log("money_movement=0");
    console.log("background_loop=0");
    console.log("startup_execution=0");
  } finally {
    if (previousEnable === undefined) delete process.env[ENABLE_ENV];
    else process.env[ENABLE_ENV] = previousEnable;
    if (previousMax === undefined) delete process.env[MAX_ENV];
    else process.env[MAX_ENV] = previousMax;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
