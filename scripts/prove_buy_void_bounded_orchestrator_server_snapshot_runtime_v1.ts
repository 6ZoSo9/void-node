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

async function main(): Promise<void> {
  const previousEnable = process.env[ENABLE_ENV];
  const previousMax = process.env[MAX_ENV];
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-snapshot-runtime-v1-"),
  );
  const requestDir = path.join(root, "requests");
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });

  try {
    const requestId = "buyvoid_snapshot_runtime_v1";
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

    process.env[ENABLE_ENV] = "true";
    process.env[MAX_ENV] = "1";

    const dryRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
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
    assert.equal(
      dryRes.value.snapshot_source,
      "server_derived_request_id_only",
    );
    assert.equal(
      dryRes.value.derived_snapshot.request_id,
      requestId,
    );
    assert.equal(
      dryRes.value.decision.selected_stage,
      "observe_and_claim",
    );

    const snapshotRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body: {
          action:
            VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
          request_id: requestId,
          snapshot: {
            request_id: "attacker",
            public_status: "fulfilled",
          },
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

    const missingRes = response();
    await handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      {
        socket: { remoteAddress: "127.0.0.1" },
        body: {
          action:
            VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        },
      },
      missingRes,
      {
        root_dir: root,
        request_dir: requestDir,
      },
    );

    assert.equal(missingRes.code, 400);
    assert.equal(
      missingRes.value.error,
      "request_id_required",
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
      "VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_SERVER_SNAPSHOT_RUNTIME_V1_GREEN",
    );
    console.log("request_id_only_selector=1");
    console.log("client_supplied_snapshot_forbidden=1");
    console.log("server_derived_snapshot=1");
    console.log("dry_run_only_v1=1");
    console.log("runtime_apply=0");
    console.log("hard_max_requests_per_run=1");
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
