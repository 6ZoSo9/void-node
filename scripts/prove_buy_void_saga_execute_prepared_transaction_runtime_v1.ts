import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
  VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_CONFIRMATION_V1,
  buyVoidSagaExecutePreparedTransactionRuntimeStatusV1,
  handleBuyVoidSagaExecutePreparedTransactionRuntimeCommandV1,
} from "../src/economic/buy_void_saga_execute_prepared_transaction_runtime_v1.js";
import {
  buyVoidRuntimeStatusV1,
} from "../src/economic/buy_void_runtime_integration_v1.js";

const ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ENABLED";
const APPLY_ENV =
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_APPLY_ENABLED";
const SUBMISSION_ENV =
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_SUBMISSION_ENABLED";
const SOCKET_ENV =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SOCKET";

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
  options: Record<string, unknown>,
  remoteAddress = "127.0.0.1",
) {
  const harness = responseHarness();
  await handleBuyVoidSagaExecutePreparedTransactionRuntimeCommandV1(
    {
      socket: { remoteAddress },
      body,
    },
    harness.res,
    options as any,
  );
  const sent = harness.read();
  assert.ok(sent);
  return sent!;
}

const sagaId = `voidbvfsg1_${"a".repeat(64)}`;
const attemptId = "b".repeat(64);
const rootDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-execute-runtime-v1-"),
);
const socket = path.join(rootDir, "private", "broadcaster.sock");

delete process.env[ENABLE_ENV];
delete process.env[APPLY_ENV];
delete process.env[SUBMISSION_ENV];
delete process.env[SOCKET_ENV];

const initial = buyVoidSagaExecutePreparedTransactionRuntimeStatusV1();
assert.equal(initial.enabled, false);
assert.equal(initial.apply_enabled, false);
assert.equal(initial.submission_enabled, false);
assert.equal(initial.broadcaster_socket_configured, false);
assert.equal(
  VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_AUTHORITY_V1
    .transaction_broadcast_by_default,
  false,
);
assert.equal(
  VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_AUTHORITY_V1
    .transaction_broadcast_possible_when_explicitly_applied,
  true,
);
assert.equal(
  VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_AUTHORITY_V1
    .application_signing,
  false,
);

const parent = buyVoidRuntimeStatusV1();
assert.equal(
  (parent.supported_actions as string[]).includes(
    VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
  ),
  false,
);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    parent,
    "saga_execute_prepared_transaction_runtime",
  ),
  false,
);
assert.equal(
  (parent.canonical_delivery as any)
    .opaque_prepared_transaction_execution_parent_mounted,
  false,
);
assert.equal(
  (parent.authority as any)
    .delegated_transaction_broadcast_possible_when_execution_runtime_enabled,
  false,
);
assert.equal((parent.authority as any).transaction_broadcast, false);

const remote = await call(
  {
    action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
  },
  { root_dir: rootDir },
  "100.64.0.1",
);
assert.equal(remote.status, 403);
assert.equal(remote.body.error, "operator_loopback_only");

const disabled = await call(
  {
    action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
  },
  { root_dir: rootDir },
);
assert.equal(disabled.status, 503);
assert.equal(
  disabled.body.error,
  "saga_execute_prepared_transaction_runtime_disabled",
);

process.env[ENABLE_ENV] = "1";

let runCalls = 0;
let applyCalls = 0;
let createCalls = 0;
let simulatedSubmitCalls = 0;
let inspectCalls = 0;
let lastSocketPath = "";

const dryDecision = {
  ok: true as const,
  status: "dry_run" as const,
  applied: false as const,
  mutation_performed: false as const,
  saga_id: sagaId,
  attempt_id: attemptId,
  next_action: "execute_prepared_transaction" as const,
  required_confirmation: "buyVoidAdvanceSagaBroadcastReconciliationV1",
  required_policy_fingerprint_sha256: "c".repeat(64),
  required_saga_confirmation: "advanceSaga",
  required_saga_action_confirmation: "executeSaga",
  required_broadcast_confirmation: "buyVoidSubmitPreparedTransactionFromOpaqueCustodyV1",
  existing_evidence: null,
  existing_outcome: null,
  policy_public_summary: {},
  broadcaster_called: false as const,
  submission_call_performed: false as const,
  transaction_broadcast_performed: false as const,
  reconciliation_required: false,
  automatic_retry_allowed: false as const,
  signed_payload_bytes_persisted: false as const,
  signed_payload_bytes_returned: false as const,
  money_movement_performed: false as const,
};

const dependencies = {
  run_execution: async (input: any) => {
    runCalls += 1;
    if (input.apply !== true) return dryDecision;
    applyCalls += 1;
    const broadcaster = input.dependencies?.broadcaster;
    assert.ok(broadcaster);
    const submission = await broadcaster.submit_once({
      submission_idempotency_key_sha256: "d".repeat(64),
      saga_id: sagaId,
      attempt_id: attemptId,
      broadcast_intent_id: `voidbvbci1_${"e".repeat(64)}`,
      custody_idempotency_key_sha256: "f".repeat(64),
      custody_handle_fingerprint_sha256: "1".repeat(64),
      transaction_plan_fingerprint_sha256: "2".repeat(64),
      signed_transaction_hash: `0x${"3".repeat(64)}`,
    });
    assert.equal(submission.status, "accepted");
    return {
      ok: true,
      status: "accepted",
      applied: true,
      mutation_performed: true,
      saga_id: sagaId,
      attempt_id: attemptId,
      action: "execute_prepared_transaction",
      evidence: {},
      execution_attempt: {},
      broadcast_outcome: null,
      saga_state: {},
      broadcaster_called: true,
      submission_call_performed: true,
      transaction_broadcast_performed: true,
      reconciliation_required: true,
      automatic_retry_allowed: false,
      signed_payload_bytes_persisted: false,
      signed_payload_bytes_returned: false,
      money_movement_performed: true,
    } as any;
  },
  create_broadcaster: (options: any) => {
    createCalls += 1;
    lastSocketPath = options.socket_path;
    return {
      submit_once: async () => {
        simulatedSubmitCalls += 1;
        return {
          ok: true,
          status: "accepted",
          transaction_hash: `0x${"3".repeat(64)}`,
          provider_submission_id: "synthetic-provider",
          definitive_not_submitted: false,
          submission_call_performed: true,
          submission_may_have_occurred: true,
          receipt: null,
        };
      },
      inspect_submission: async () => {
        inspectCalls += 1;
        return {
          ok: true,
          status: "accepted",
          transaction_hash: `0x${"3".repeat(64)}`,
          provider_submission_id: "synthetic-provider",
          definitive_not_submitted: false,
          submission_call_performed: true,
          submission_may_have_occurred: true,
          receipt: null,
        };
      },
    } as any;
  },
};

const dry = await call(
  {
    action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
  },
  { root_dir: rootDir, dependencies },
);
assert.equal(dry.status, 200);
assert.equal(dry.body.status, "dry_run");
assert.equal(dry.body.next_action, "execute_prepared_transaction");
assert.equal(
  dry.body.required_broadcast_confirmation,
  "buyVoidSubmitPreparedTransactionFromOpaqueCustodyV1",
);
assert.equal(dry.body.broadcaster_socket_required_for_dry_run, false);
assert.equal(createCalls, 0);

const callerSocket = await call(
  {
    action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    socket_path: "/tmp/attacker.sock",
  } as any,
  { root_dir: rootDir, dependencies },
);
assert.equal(callerSocket.status, 400);
assert.equal(callerSocket.body.forbidden_key, "socket_path");

const callerRoot = await call(
  {
    action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    root_dir: "/tmp/attacker-root",
  } as any,
  { root_dir: rootDir, dependencies },
);
assert.equal(callerRoot.status, 400);
assert.equal(callerRoot.body.forbidden_key, "root_dir");

const applyDisabled = await call(
  {
    action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    apply: true,
  },
  { root_dir: rootDir, dependencies },
);
assert.equal(applyDisabled.status, 503);
assert.equal(
  applyDisabled.body.error,
  "saga_execute_prepared_transaction_apply_disabled",
);
assert.equal(createCalls, 0);

process.env[APPLY_ENV] = "1";

const submissionDisabled = await call(
  {
    action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    apply: true,
  },
  { root_dir: rootDir, dependencies },
);
assert.equal(submissionDisabled.status, 503);
assert.equal(
  submissionDisabled.body.error,
  "saga_execute_prepared_transaction_submission_disabled",
);
assert.equal(createCalls, 0);

process.env[SUBMISSION_ENV] = "1";

const reconcileDependencies = {
  ...dependencies,
  run_execution: async (input: any) => {
    if (input.apply === true) {
      assert.fail("reconciliation state must hold before apply");
    }
    return {
      ...dryDecision,
      next_action: "reconcile_possible_broadcast",
      required_broadcast_confirmation: null,
    };
  },
};

const reconciliationHeld = await call(
  {
    action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    apply: true,
  },
  { root_dir: rootDir, dependencies: reconcileDependencies },
);
assert.equal(reconciliationHeld.status, 409);
assert.equal(
  reconciliationHeld.body.error,
  "execute_prepared_transaction_not_current_action",
);
assert.equal(reconciliationHeld.body.reconciliation_runtime_required, true);
assert.equal(createCalls, 0);

const wrongConfirmation = await call(
  {
    action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    apply: true,
    confirmation: "wrong",
    coordinator_confirmation: dryDecision.required_confirmation,
    policy_fingerprint_sha256:
      dryDecision.required_policy_fingerprint_sha256,
    saga_confirmation: dryDecision.required_saga_confirmation,
    saga_action_confirmation:
      dryDecision.required_saga_action_confirmation,
    broadcast_confirmation:
      dryDecision.required_broadcast_confirmation,
  },
  { root_dir: rootDir, dependencies },
);
assert.equal(wrongConfirmation.status, 428);
assert.equal(createCalls, 0);

const noSocket = await call(
  {
    action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    apply: true,
    confirmation:
      VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_CONFIRMATION_V1,
    coordinator_confirmation: dryDecision.required_confirmation,
    policy_fingerprint_sha256:
      dryDecision.required_policy_fingerprint_sha256,
    saga_confirmation: dryDecision.required_saga_confirmation,
    saga_action_confirmation:
      dryDecision.required_saga_action_confirmation,
    broadcast_confirmation:
      dryDecision.required_broadcast_confirmation,
  },
  { root_dir: rootDir, dependencies },
);
assert.equal(noSocket.status, 503);
assert.equal(
  noSocket.body.error,
  "server_controlled_broadcaster_socket_not_configured",
);
assert.equal(createCalls, 0);

process.env[SOCKET_ENV] = socket;

const applied = await call(
  {
    action: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    apply: true,
    confirmation:
      VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_CONFIRMATION_V1,
    coordinator_confirmation: dryDecision.required_confirmation,
    policy_fingerprint_sha256:
      dryDecision.required_policy_fingerprint_sha256,
    saga_confirmation: dryDecision.required_saga_confirmation,
    saga_action_confirmation:
      dryDecision.required_saga_action_confirmation,
    broadcast_confirmation:
      dryDecision.required_broadcast_confirmation,
  },
  { root_dir: rootDir, dependencies },
);
assert.equal(applied.status, 200);
assert.equal(applied.body.ok, true);
assert.equal(applied.body.execute_prepared_transaction_mounted, true);
assert.equal(applied.body.transaction_broadcast_performed, true);
assert.equal(applied.body.money_movement_performed, true);
assert.equal(runCalls >= 2, true);
assert.equal(applyCalls, 1);
assert.equal(createCalls, 1);
assert.equal(lastSocketPath, socket);
assert.equal(simulatedSubmitCalls, 1);
assert.equal(inspectCalls, 0);

console.log(
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1_PROOF_GREEN",
);
console.log("standalone_execute_runtime_source_retained=true");
console.log("canonical_parent_execute_mount=false");
console.log("canonical_parent_execute_dispatch=false");
console.log("operator_loopback_only=true");
console.log("server_controlled_root_dir=true");
console.log("server_controlled_broadcaster_socket=true");
console.log("broadcaster_socket_path_exposed=false");
console.log("dry_run_requires_broadcaster_socket=false");
console.log("runtime_disabled_by_default=true");
console.log("apply_disabled_by_default=true");
console.log("submission_disabled_by_default=true");
console.log("exact_broadcast_confirmation_required=true");
console.log("reconciliation_state_submit_blocked=true");
console.log("automatic_resubmission=false");
console.log(`simulated_submit_once_calls=${simulatedSubmitCalls}`);
console.log("real_broadcaster_service_started=false");
console.log("real_rpc_calls=0");
console.log("real_transaction_broadcast=false");
console.log("real_money_movement=false");
