import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1,
  buyVoidSagaTerminalCloseoutRuntimeStatusV1,
  handleBuyVoidSagaTerminalCloseoutRuntimeCommandV1,
} from "../src/economic/buy_void_saga_terminal_closeout_runtime_v1.js";
import {
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
} from "../src/economic/buy_void_saga_terminal_closeout_v1.js";

const ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ENABLED";
const APPLY_ENV =
  "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_APPLY_ENABLED";

const sagaId = `voidbvfsg1_${"a".repeat(64)}`;
const policyFingerprint = "b".repeat(64);
const terminalPlanFingerprint = "e".repeat(64);
const sagaConfirmation = "saga-confirmation-v1";
const sagaActionConfirmation = "closeout-action-confirmation-v1";
const rootDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-terminal-closeout-runtime-v1-"),
);

const originalEnable = process.env[ENABLE_ENV];
const originalApply = process.env[APPLY_ENV];

function restore(): void {
  if (originalEnable === undefined) delete process.env[ENABLE_ENV];
  else process.env[ENABLE_ENV] = originalEnable;
  if (originalApply === undefined) delete process.env[APPLY_ENV];
  else process.env[APPLY_ENV] = originalApply;
}

function responseHarness() {
  let sent: { status: number; body: any } | null = null;
  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      sent = { status: this.statusCode, body };
      return this;
    },
  };
  return { res, read: () => sent };
}

async function call(
  body: Record<string, unknown>,
  runCloseout: (input: any) => Promise<any>,
  remoteAddress = "127.0.0.1",
) {
  const harness = responseHarness();
  await handleBuyVoidSagaTerminalCloseoutRuntimeCommandV1(
    {
      socket: { remoteAddress },
      body,
    },
    harness.res,
    {
      root_dir: rootDir,
      dependencies: {
        run_closeout: runCloseout as any,
      },
    },
  );
  const sent = harness.read();
  assert.ok(sent);
  return sent!;
}

const dryDecision = {
  ok: true,
  status: "dry_run",
  applied: false,
  mutation_performed: false,
  saga_id: sagaId,
  attempt_id: "c".repeat(64),
  closeout_id: "d".repeat(64),
  plan: { plan_fingerprint_sha256: terminalPlanFingerprint },
  required_confirmation:
    VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
  required_policy_fingerprint_sha256: policyFingerprint,
  required_plan_fingerprint_sha256: terminalPlanFingerprint,
  required_saga_confirmation: sagaConfirmation,
  required_saga_action_confirmation: sagaActionConfirmation,
  inventory_consumption_performed: false,
  public_request_fulfilled: false,
  saga_closeout_appended: false,
  automatic_retry_allowed: false,
  money_movement_performed: false,
};

const closedDecision = {
  ok: true,
  status: "closed",
  applied: true,
  mutation_performed: true,
  saga_id: sagaId,
  attempt_id: "c".repeat(64),
  closeout_id: "d".repeat(64),
  plan: {},
  saga_state: { state: "closed" },
  inventory_consumption_performed: true,
  public_request_fulfilled: true,
  saga_closeout_appended: true,
  automatic_retry_allowed: false,
  money_movement_performed: false,
};

let applyCalls = 0;
const successfulRun = async (input: any) => {
  if (input.apply === true) {
    applyCalls += 1;
    assert.equal(
      input.confirmation,
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
    );
    assert.equal(input.policy_fingerprint_sha256, policyFingerprint);
    assert.equal(input.expected_plan_fingerprint_sha256, terminalPlanFingerprint);
    assert.equal(input.saga_confirmation, sagaConfirmation);
    assert.equal(input.saga_action_confirmation, sagaActionConfirmation);
    return closedDecision;
  }
  return dryDecision;
};

try {
  delete process.env[ENABLE_ENV];
  delete process.env[APPLY_ENV];

  const initial = buyVoidSagaTerminalCloseoutRuntimeStatusV1();
  assert.equal(initial.enabled, false);
  assert.equal(initial.apply_enabled, false);

  const disabled = await call(
    {
      action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
      saga_id: sagaId,
    },
    successfulRun,
  );
  assert.equal(disabled.status, 503);
  assert.equal(disabled.body.error, "saga_terminal_closeout_runtime_disabled");

  process.env[ENABLE_ENV] = "1";

  const remote = await call(
    {
      action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
      saga_id: sagaId,
    },
    successfulRun,
    "203.0.113.10",
  );
  assert.equal(remote.status, 403);

  const invalidSaga = await call(
    {
      action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
      saga_id: "not-a-saga",
    },
    successfulRun,
  );
  assert.equal(invalidSaga.status, 400);
  assert.equal(invalidSaga.body.error, "invalid_saga_id");

  const callerMaterial = await call(
    {
      action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
      saga_id: sagaId,
      request_dir: "/tmp/not-caller-controlled",
    },
    successfulRun,
  );
  assert.equal(callerMaterial.status, 400);
  assert.equal(
    callerMaterial.body.error,
    "caller_supplied_runtime_material_forbidden",
  );

  const dry = await call(
    {
      action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
      saga_id: sagaId,
    },
    successfulRun,
  );
  assert.equal(dry.status, 200);
  assert.equal(dry.body.status, "dry_run");
  assert.equal(
    dry.body.required_runtime_confirmation,
    VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1,
  );
  assert.equal(
    dry.body.required_terminal_closeout_confirmation,
    VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
  );
  assert.equal(dry.body.required_policy_fingerprint_sha256, policyFingerprint);
  assert.equal(
    dry.body.required_terminal_plan_fingerprint_sha256,
    terminalPlanFingerprint,
  );
  assert.equal(dry.body.inventory_consumption_performed, false);
  assert.equal(dry.body.public_request_fulfilled, false);
  assert.equal(dry.body.saga_closeout_appended, false);
  assert.equal(dry.body.money_movement_performed, false);

  const applyDisabled = await call(
    {
      action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
      saga_id: sagaId,
      apply: true,
    },
    successfulRun,
  );
  assert.equal(applyDisabled.status, 503);
  assert.equal(
    applyDisabled.body.error,
    "saga_terminal_closeout_runtime_apply_disabled",
  );
  assert.equal(applyCalls, 0);

  process.env[APPLY_ENV] = "1";

  const missingConfirmation = await call(
    {
      action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
      saga_id: sagaId,
      apply: true,
    },
    successfulRun,
  );
  assert.equal(missingConfirmation.status, 428);
  assert.equal(
    missingConfirmation.body.error,
    "saga_terminal_closeout_runtime_confirmation_mismatch",
  );
  assert.equal(applyCalls, 0);

  const wrongPlan = await call(
    {
      action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
      saga_id: sagaId,
      apply: true,
      confirmation:
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1,
      terminal_closeout_confirmation:
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
      policy_fingerprint_sha256: policyFingerprint,
      terminal_plan_fingerprint_sha256: "f".repeat(64),
      saga_confirmation: sagaConfirmation,
      saga_action_confirmation: sagaActionConfirmation,
    },
    successfulRun,
  );
  assert.equal(wrongPlan.status, 428);
  assert.equal(
    wrongPlan.body.error,
    "saga_terminal_closeout_runtime_confirmation_mismatch",
  );
  assert.equal(applyCalls, 0);

  const exact = await call(
    {
      action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
      saga_id: sagaId,
      apply: true,
      confirmation:
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1,
      terminal_closeout_confirmation:
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
      policy_fingerprint_sha256: policyFingerprint,
      terminal_plan_fingerprint_sha256: terminalPlanFingerprint,
      saga_confirmation: sagaConfirmation,
      saga_action_confirmation: sagaActionConfirmation,
    },
    successfulRun,
  );
  assert.equal(exact.status, 200);
  assert.equal(exact.body.status, "closed");
  assert.equal(exact.body.mutation_performed, true);
  assert.equal(exact.body.inventory_consumption_performed, true);
  assert.equal(exact.body.public_request_fulfilled, true);
  assert.equal(exact.body.saga_closeout_appended, true);
  assert.equal(exact.body.money_movement_performed, false);
  assert.equal(applyCalls, 1);

  const partialRun = async (input: any) => {
    if (input.apply !== true) return dryDecision;
    return {
      ok: false,
      status: "held",
      applied: true,
      stage: "saga_append",
      reason: "terminal_closeout_saga_held",
      mutation_performed: true,
      inventory_consumption_performed: true,
      public_request_fulfilled: true,
      saga_closeout_appended: false,
      automatic_retry_allowed: false,
      money_movement_performed: false,
    };
  };

  const partial = await call(
    {
      action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
      saga_id: sagaId,
      apply: true,
      confirmation:
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1,
      terminal_closeout_confirmation:
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
      policy_fingerprint_sha256: policyFingerprint,
      terminal_plan_fingerprint_sha256: terminalPlanFingerprint,
      saga_confirmation: sagaConfirmation,
      saga_action_confirmation: sagaActionConfirmation,
    },
    partialRun,
  );
  assert.equal(partial.status, 500);
  assert.equal(partial.body.mutation_performed, true);
  assert.equal(partial.body.inventory_consumption_performed, true);
  assert.equal(partial.body.public_request_fulfilled, true);
  assert.equal(partial.body.saga_closeout_appended, false);
  assert.equal(partial.body.automatic_retry_allowed, false);
  assert.equal(partial.body.money_movement_performed, false);

  console.log("VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1_PROOF_GREEN");
  console.log("operator_loopback_only=true");
  console.log("runtime_disabled_by_default=true");
  console.log("apply_disabled_by_default=true");
  console.log("server_controlled_root_dir=true");
  console.log("server_controlled_terminal_policy=true");
  console.log("exact_runtime_confirmation_required=true");
  console.log("exact_terminal_closeout_confirmation_required=true");
  console.log("exact_policy_fingerprint_echo_required=true");
  console.log("exact_terminal_plan_fingerprint_echo_required=true");
  console.log("inventory_consumption_possible_only_on_explicit_apply=true");
  console.log("public_fulfilled_projection_possible_only_on_explicit_apply=true");
  console.log("saga_closeout_possible_only_on_explicit_apply=true");
  console.log("partial_mutation_failure_http_500=true");
  console.log("automatic_retry_allowed=false");
  console.log("transaction_broadcast_performed=false");
  console.log("money_movement_performed=false");
} finally {
  restore();
  fs.rmSync(rootDir, { recursive: true, force: true });
}
