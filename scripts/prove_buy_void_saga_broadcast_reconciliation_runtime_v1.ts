import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
  VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_CONFIRMATION_V1,
  buyVoidSagaBroadcastReconciliationRuntimeStatusV1,
  handleBuyVoidSagaBroadcastReconciliationRuntimeCommandV1,
} from "../src/economic/buy_void_saga_broadcast_reconciliation_runtime_v1.js";
import {
  buyVoidRuntimeStatusV1,
} from "../src/economic/buy_void_runtime_integration_v1.js";

const ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ENABLED";
const APPLY_ENV =
  "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_APPLY_ENABLED";
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
  await handleBuyVoidSagaBroadcastReconciliationRuntimeCommandV1(
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
const rootDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-buy-broadcast-runtime-v1-"),
);
const socket = path.join(rootDir, "private", "broadcaster.sock");

delete process.env[ENABLE_ENV];
delete process.env[APPLY_ENV];
delete process.env[SOCKET_ENV];

const initial = buyVoidSagaBroadcastReconciliationRuntimeStatusV1();
assert.equal(initial.enabled, false);
assert.equal(initial.apply_enabled, false);
assert.equal(initial.broadcaster_socket_configured, false);
assert.equal(initial.broadcaster_socket_fingerprint_sha256, null);
assert.equal(initial.execute_prepared_transaction_mounted, false);
assert.equal(
  VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_AUTHORITY_V1
    .submit_once_runtime_adapter,
  false,
);
assert.equal(
  VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_AUTHORITY_V1
    .transaction_broadcast,
  false,
);
assert.equal(
  VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_AUTHORITY_V1
    .money_movement,
  false,
);

const parent = buyVoidRuntimeStatusV1();
assert.ok(
  (parent.supported_actions as string[]).includes(
    VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
  ),
);
assert.ok(parent.saga_broadcast_reconciliation_runtime);

const remote = await call(
  {
    action: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
  },
  { root_dir: rootDir },
  "100.64.0.1",
);
assert.equal(remote.status, 403);
assert.equal(remote.body.error, "operator_loopback_only");

const disabled = await call(
  {
    action: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
  },
  { root_dir: rootDir },
);
assert.equal(disabled.status, 503);
assert.equal(
  disabled.body.error,
  "saga_broadcast_reconciliation_runtime_disabled",
);

process.env[ENABLE_ENV] = "1";

let runCalls = 0;
let createCalls = 0;
let dangerousSubmitCalls = 0;
let inspectCalls = 0;
let wrappedSubmitBlocked = false;
let lastSocketPath = "";
let appliedRoot = "";

const dryDecision = {
  ok: true as const,
  status: "dry_run" as const,
  applied: false as const,
  mutation_performed: false as const,
  saga_id: sagaId,
  attempt_id: "b".repeat(64),
  next_action: "reconcile_possible_broadcast" as const,
  required_confirmation: "buyVoidAdvanceSagaBroadcastReconciliationV1",
  required_policy_fingerprint_sha256: "c".repeat(64),
  required_saga_confirmation: "advanceSaga",
  required_saga_action_confirmation: "reconcileSaga",
  required_broadcast_confirmation: null,
  existing_evidence: null,
  existing_outcome: null,
  policy_public_summary: {},
  broadcaster_called: false as const,
  submission_call_performed: false as const,
  transaction_broadcast_performed: false as const,
  reconciliation_required: true,
  automatic_retry_allowed: false as const,
  signed_payload_bytes_persisted: false as const,
  signed_payload_bytes_returned: false as const,
  money_movement_performed: false as const,
};

const dependencies = {
  run_reconciliation: async (input: any) => {
    runCalls += 1;
    if (input.apply !== true) return dryDecision;
    appliedRoot = input.root_dir;
    const broadcaster = input.dependencies?.broadcaster;
    assert.ok(broadcaster);
    try {
      await broadcaster.submit_once({});
      assert.fail("reconciliation-only submit adapter unexpectedly returned");
    } catch (error) {
      assert.match(
        String((error as Error)?.message || error),
        /runtime_reconciliation_only_submit_once_forbidden/,
      );
      wrappedSubmitBlocked = true;
    }
    await broadcaster.inspect_submission({});
    return {
      ok: true,
      status: "confirmed",
      applied: true,
      mutation_performed: true,
      saga_id: sagaId,
      attempt_id: "b".repeat(64),
      action: "reconcile_possible_broadcast",
      broadcaster_called: true,
      submission_call_performed: false,
      transaction_broadcast_performed: false,
      reconciliation_required: false,
      automatic_retry_allowed: false,
      signed_payload_bytes_persisted: false,
      signed_payload_bytes_returned: false,
      money_movement_performed: false,
    };
  },
  create_broadcaster: (options: any) => {
    createCalls += 1;
    lastSocketPath = options.socket_path;
    return {
      submit_once: async () => {
        dangerousSubmitCalls += 1;
        return {
          ok: false,
          status: "held",
          reason: "dangerous_submit_should_not_be_reachable",
        };
      },
      inspect_submission: async () => {
        inspectCalls += 1;
        return {
          ok: true,
          status: "confirmed",
          transaction_hash: `0x${"d".repeat(64)}`,
          provider_submission_id: "provider-id",
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
    action: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
  },
  {
    root_dir: rootDir,
    dependencies,
  },
);
assert.equal(dry.status, 200);
assert.equal(dry.body.status, "dry_run");
assert.equal(dry.body.next_action, "reconcile_possible_broadcast");
assert.equal(dry.body.broadcaster_socket_required_for_dry_run, false);
assert.equal(createCalls, 0);
assert.equal(runCalls, 1);

const callerSocket = await call(
  {
    action: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    socket_path: "/tmp/attacker.sock",
  } as any,
  {
    root_dir: rootDir,
    dependencies,
  },
);
assert.equal(callerSocket.status, 400);
assert.equal(
  callerSocket.body.error,
  "caller_supplied_runtime_material_forbidden",
);
assert.equal(callerSocket.body.forbidden_key, "socket_path");

const callerRoot = await call(
  {
    action: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    root_dir: "/tmp/attacker-root",
  } as any,
  {
    root_dir: rootDir,
    dependencies,
  },
);
assert.equal(callerRoot.status, 400);
assert.equal(callerRoot.body.forbidden_key, "root_dir");

const applyDisabled = await call(
  {
    action: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    apply: true,
  },
  {
    root_dir: rootDir,
    dependencies,
  },
);
assert.equal(applyDisabled.status, 503);
assert.equal(
  applyDisabled.body.error,
  "saga_broadcast_reconciliation_apply_disabled",
);
assert.equal(createCalls, 0);

process.env[APPLY_ENV] = "1";

const executeDependencies = {
  ...dependencies,
  run_reconciliation: async (input: any) => {
    if (input.apply === true) {
      assert.fail("execute action must hold before apply coordinator call");
    }
    return {
      ...dryDecision,
      next_action: "execute_prepared_transaction",
      required_broadcast_confirmation:
        "buyVoidSubmitPreparedTransactionV1",
    };
  },
};

const executeHeld = await call(
  {
    action: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    apply: true,
    confirmation:
      VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_CONFIRMATION_V1,
    coordinator_confirmation: dryDecision.required_confirmation,
    policy_fingerprint_sha256:
      dryDecision.required_policy_fingerprint_sha256,
    saga_confirmation: dryDecision.required_saga_confirmation,
    saga_action_confirmation:
      dryDecision.required_saga_action_confirmation,
  },
  {
    root_dir: rootDir,
    dependencies: executeDependencies,
  },
);
assert.equal(executeHeld.status, 409);
assert.equal(
  executeHeld.body.error,
  "execute_prepared_transaction_not_mounted",
);
assert.equal(dangerousSubmitCalls, 0);

process.env[SOCKET_ENV] = socket;

const wrongConfirmation = await call(
  {
    action: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    apply: true,
    confirmation: "wrong",
    coordinator_confirmation: dryDecision.required_confirmation,
    policy_fingerprint_sha256:
      dryDecision.required_policy_fingerprint_sha256,
    saga_confirmation: dryDecision.required_saga_confirmation,
    saga_action_confirmation:
      dryDecision.required_saga_action_confirmation,
  },
  {
    root_dir: rootDir,
    dependencies,
  },
);
assert.equal(wrongConfirmation.status, 428);
assert.equal(createCalls, 0);

const applied = await call(
  {
    action: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
    saga_id: sagaId,
    apply: true,
    confirmation:
      VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_CONFIRMATION_V1,
    coordinator_confirmation: dryDecision.required_confirmation,
    policy_fingerprint_sha256:
      dryDecision.required_policy_fingerprint_sha256,
    saga_confirmation: dryDecision.required_saga_confirmation,
    saga_action_confirmation:
      dryDecision.required_saga_action_confirmation,
  },
  {
    root_dir: rootDir,
    dependencies,
  },
);
assert.equal(applied.status, 200);
assert.equal(applied.body.ok, true);
assert.equal(applied.body.submit_once_runtime_adapter, false);
assert.equal(applied.body.inspect_submission_runtime_adapter, true);
assert.equal(applied.body.transaction_broadcast_performed, false);
assert.equal(applied.body.money_movement_performed, false);
assert.equal(createCalls, 1);
assert.equal(lastSocketPath, socket);
assert.equal(appliedRoot, path.resolve(rootDir));
assert.equal(wrappedSubmitBlocked, true);
assert.equal(dangerousSubmitCalls, 0);
assert.equal(inspectCalls, 1);

const finalStatus =
  buyVoidSagaBroadcastReconciliationRuntimeStatusV1();
assert.equal(finalStatus.enabled, true);
assert.equal(finalStatus.apply_enabled, true);
assert.equal(finalStatus.broadcaster_socket_configured, true);
assert.equal(
  typeof finalStatus.broadcaster_socket_fingerprint_sha256,
  "string",
);
assert.equal(
  JSON.stringify(finalStatus).includes(socket),
  false,
);

console.log(
  "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1_PROOF_GREEN",
);
console.log("parent_runtime_action_registered=true");
console.log("operator_loopback_only=true");
console.log("server_controlled_root_dir=true");
console.log("server_controlled_broadcaster_socket=true");
console.log("broadcaster_socket_path_exposed=false");
console.log("dry_run_requires_broadcaster_socket=false");
console.log("apply_disabled_by_default=true");
console.log("execute_prepared_transaction_mounted=false");
console.log("reconcile_possible_broadcast_mounted=true");
console.log(`submit_once_wrapper_blocked=${wrappedSubmitBlocked}`);
console.log(`dangerous_submit_calls=${dangerousSubmitCalls}`);
console.log(`inspect_submission_calls=${inspectCalls}`);
console.log("transaction_broadcast_performed=false");
console.log("money_movement_performed=false");
