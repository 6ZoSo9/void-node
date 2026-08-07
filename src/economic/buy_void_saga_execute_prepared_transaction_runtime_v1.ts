import crypto from "node:crypto";
import path from "node:path";

import {
  runBuyVoidSagaBroadcastReconciliationV1,
  type RunBuyVoidSagaBroadcastReconciliationInputV1,
} from "./buy_void_saga_broadcast_reconciliation_coordinator_v1.js";
import {
  createBuyVoidPreparedTransactionBroadcasterIpcV1,
} from "./buy_void_prepared_transaction_broadcaster_ipc_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1,
  type BuyVoidPreparedTransactionBroadcasterV1,
} from "./buy_void_prepared_transaction_broadcast_custody_v1.js";

export const VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1 =
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1";

export const VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1 =
  "run_saga_execute_prepared_transaction";

export const VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_CONFIRMATION_V1 =
  "buyVoidRunSagaExecutePreparedTransactionRuntimeV1";

export const VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  apply_disabled_by_default: true,
  submission_disabled_by_default: true,
  server_controlled_root_dir: true,
  saga_id_only_selector: true,
  server_controlled_broadcaster_socket: true,
  broadcaster_socket_path_not_exposed: true,
  stable_policy_fingerprint_echo_required: true,
  exact_runtime_confirmation_required: true,
  exact_coordinator_confirmation_required: true,
  exact_saga_confirmation_required: true,
  exact_saga_action_confirmation_required: true,
  exact_broadcast_confirmation_required: true,
  dry_run_available_without_broadcaster_socket: true,
  execute_prepared_transaction_only_when_applied: true,
  reconcile_possible_broadcast_not_applied_here: true,
  submit_once_runtime_adapter: true,
  inspect_submission_runtime_adapter: true,
  external_submission_possible_when_explicitly_applied: true,
  automatic_resubmission: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  custody_handle_input: false,
  custody_handle_output: false,
  application_wallet_access: false,
  application_signing: false,
  transaction_broadcast_by_default: false,
  transaction_broadcast_possible_when_explicitly_applied: true,
  inventory_decrement: false,
  public_fulfilled_closeout: false,
  background_loop: false,
  startup_execution: false,
  money_movement_by_default: false,
  money_movement_possible_when_submission_occurs: true,
} as const;

const ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ENABLED";
const APPLY_ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_APPLY_ENABLED";
const SUBMISSION_ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_SUBMISSION_ENABLED";
const SOCKET_ENV =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SOCKET";

const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;
const ALLOWED_KEYS = new Set([
  "action",
  "saga_id",
  "apply",
  "confirmation",
  "coordinator_confirmation",
  "policy_fingerprint_sha256",
  "saga_confirmation",
  "saga_action_confirmation",
  "broadcast_confirmation",
]);

export type BuyVoidSagaExecutePreparedTransactionRuntimeDependenciesV1 = {
  run_execution?: typeof runBuyVoidSagaBroadcastReconciliationV1;
  create_broadcaster?: typeof createBuyVoidPreparedTransactionBroadcasterIpcV1;
};

type RuntimeOptionsV1 = {
  root_dir: string;
  dependencies?: BuyVoidSagaExecutePreparedTransactionRuntimeDependenciesV1;
};

function truthy(value: unknown): boolean {
  return /^(1|true|yes|on)$/i.test(String(value ?? "").trim());
}

function enabled(): boolean {
  return truthy(process.env[ENABLE_ENV]);
}

function applyEnabled(): boolean {
  return truthy(process.env[APPLY_ENABLE_ENV]);
}

function submissionEnabled(): boolean {
  return truthy(process.env[SUBMISSION_ENABLE_ENV]);
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function directObject(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return null;
  return value as Record<string, any>;
}

function loopback(req: any): boolean {
  const address = text(
    req?.socket?.remoteAddress ??
      req?.connection?.remoteAddress ??
      req?.ip ??
      "",
  ).toLowerCase();
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address);
}

function absoluteRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
    throw new Error("execute_runtime_server_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("execute_runtime_server_root_must_not_be_filesystem_root");
  }
  return resolved;
}

function socketPath(): string {
  return text(process.env[SOCKET_ENV]);
}

function socketFingerprint(): string | null {
  const raw = socketPath();
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

function socketConfigured(): boolean {
  const raw = socketPath();
  return Boolean(raw && path.isAbsolute(raw) && !raw.includes("\0"));
}

function dependencies(
  supplied?: BuyVoidSagaExecutePreparedTransactionRuntimeDependenciesV1,
): Required<BuyVoidSagaExecutePreparedTransactionRuntimeDependenciesV1> {
  return {
    run_execution: runBuyVoidSagaBroadcastReconciliationV1,
    create_broadcaster: createBuyVoidPreparedTransactionBroadcasterIpcV1,
    ...(supplied || {}),
  };
}

function inputKeysValid(body: Record<string, any>): { ok: true } | {
  ok: false;
  key: string;
} {
  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(key)) return { ok: false, key };
  }
  return { ok: true };
}

function decisionHttpStatus(decision: any): number {
  if (decision?.ok === true) return 200;
  const reason = text(decision?.reason);
  if (reason.includes("confirmation") || reason.includes("fingerprint")) {
    return 428;
  }
  if (
    reason.includes("conflict") ||
    reason.includes("state_changed") ||
    reason.includes("outside_boundary") ||
    reason.includes("still_unknown") ||
    reason.includes("receipt_pending") ||
    reason.includes("reconciliation")
  ) {
    return 409;
  }
  if (
    reason.includes("not_configured") ||
    reason.includes("disabled") ||
    reason.includes("not_ready")
  ) {
    return 503;
  }
  return 422;
}

export function buyVoidSagaExecutePreparedTransactionRuntimeStatusV1():
Record<string, unknown> {
  return {
    marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
    version: 1,
    action:
      VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    apply_enabled: applyEnabled(),
    apply_enable_env: APPLY_ENABLE_ENV,
    submission_enabled: submissionEnabled(),
    submission_enable_env: SUBMISSION_ENABLE_ENV,
    broadcaster_socket_env: SOCKET_ENV,
    broadcaster_socket_configured: socketConfigured(),
    broadcaster_socket_fingerprint_sha256: socketFingerprint(),
    required_runtime_confirmation:
      VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_CONFIRMATION_V1,
    required_broadcast_confirmation:
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1,
    supported_apply_action: "execute_prepared_transaction",
    authority:
      VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_AUTHORITY_V1,
  };
}

export async function handleBuyVoidSagaExecutePreparedTransactionRuntimeCommandV1(
  req: any,
  res: any,
  options: RuntimeOptionsV1,
): Promise<unknown> {
  if (!loopback(req)) {
    return res.status(403).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "operator_loopback_only",
    });
  }

  if (!enabled()) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "saga_execute_prepared_transaction_runtime_disabled",
      enable_env: ENABLE_ENV,
    });
  }

  const body = directObject(req?.body);
  if (
    !body ||
    text(body.action) !==
      VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1
  ) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "invalid_saga_execute_prepared_transaction_runtime_command",
    });
  }

  const keys = inputKeysValid(body);
  if ("key" in keys) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "caller_supplied_runtime_material_forbidden",
      forbidden_key: keys.key,
    });
  }

  const sagaId = text(body.saga_id).toLowerCase();
  if (!SAGA_ID.test(sagaId)) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "invalid_saga_id",
    });
  }

  let rootDir: string;
  try {
    rootDir = absoluteRoot(options.root_dir);
  } catch (error) {
    return res.status(500).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "server_controlled_root_invalid",
      reason: text((error as Error)?.message || error).slice(0, 160),
    });
  }

  const deps = dependencies(options.dependencies);
  const dry = await deps.run_execution({
    root_dir: rootDir,
    saga_id: sagaId,
    apply: false,
  });

  if (dry.ok !== true) {
    return res.status(decisionHttpStatus(dry)).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      status: "held",
      phase: "dry_run",
      decision: dry,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority:
        VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_AUTHORITY_V1,
    });
  }

  if (dry.status !== "dry_run") {
    return res.status(500).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "execution_preflight_not_dry_run",
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  if (body.apply !== true) {
    return res.status(200).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      version: 1,
      ok: true,
      status: "dry_run",
      applied: false,
      saga_id: sagaId,
      next_action: dry.next_action,
      required_runtime_confirmation:
        VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_CONFIRMATION_V1,
      required_coordinator_confirmation: dry.required_confirmation,
      required_policy_fingerprint_sha256:
        dry.required_policy_fingerprint_sha256,
      required_saga_confirmation: dry.required_saga_confirmation,
      required_saga_action_confirmation:
        dry.required_saga_action_confirmation,
      required_broadcast_confirmation:
        dry.required_broadcast_confirmation,
      execute_prepared_transaction_apply_supported:
        dry.next_action === "execute_prepared_transaction",
      broadcaster_socket_required_for_dry_run: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      decision: dry,
      authority:
        VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_AUTHORITY_V1,
    });
  }

  if (!applyEnabled()) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "saga_execute_prepared_transaction_apply_disabled",
      apply_enable_env: APPLY_ENABLE_ENV,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  if (!submissionEnabled()) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "saga_execute_prepared_transaction_submission_disabled",
      submission_enable_env: SUBMISSION_ENABLE_ENV,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  if (dry.next_action !== "execute_prepared_transaction") {
    return res.status(409).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "execute_prepared_transaction_not_current_action",
      next_action: dry.next_action,
      reconciliation_runtime_required:
        dry.next_action === "reconcile_possible_broadcast",
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  if (
    dry.required_broadcast_confirmation !==
    VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1
  ) {
    return res.status(500).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "execution_broadcast_confirmation_contract_invalid",
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  if (
    text(body.confirmation) !==
      VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_CONFIRMATION_V1 ||
    text(body.coordinator_confirmation) !==
      dry.required_confirmation ||
    text(body.policy_fingerprint_sha256) !==
      dry.required_policy_fingerprint_sha256 ||
    text(body.saga_confirmation) !==
      dry.required_saga_confirmation ||
    text(body.saga_action_confirmation) !==
      dry.required_saga_action_confirmation ||
    text(body.broadcast_confirmation) !==
      dry.required_broadcast_confirmation
  ) {
    return res.status(428).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "exact_execute_prepared_transaction_confirmations_required",
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  const configuredSocket = socketPath();
  if (
    !configuredSocket ||
    !path.isAbsolute(configuredSocket) ||
    configuredSocket.includes("\0")
  ) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "server_controlled_broadcaster_socket_not_configured",
      socket_env: SOCKET_ENV,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  let broadcaster: BuyVoidPreparedTransactionBroadcasterV1;
  try {
    broadcaster = deps.create_broadcaster({
      socket_path: configuredSocket,
    });
  } catch (error) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "broadcaster_ipc_not_ready",
      reason: text((error as Error)?.message || error).slice(0, 160),
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  const applyInput: RunBuyVoidSagaBroadcastReconciliationInputV1 = {
    root_dir: rootDir,
    saga_id: sagaId,
    apply: true,
    confirmation: body.coordinator_confirmation,
    policy_fingerprint_sha256: body.policy_fingerprint_sha256,
    saga_confirmation: body.saga_confirmation,
    saga_action_confirmation: body.saga_action_confirmation,
    broadcast_confirmation: body.broadcast_confirmation,
    dependencies: { broadcaster },
  };

  const decision = await deps.run_execution(applyInput);

  if (
    decision.ok === true &&
    (decision as any).action !== "execute_prepared_transaction"
  ) {
    return res.status(500).json({
      marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
      ok: false,
      error: "execute_runtime_action_boundary_violation",
      observed_action: (decision as any).action,
      transaction_broadcast_performed:
        (decision as any).transaction_broadcast_performed === true,
      money_movement_performed:
        (decision as any).money_movement_performed === true,
    });
  }

  return res.status(decisionHttpStatus(decision)).json({
    marker: VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1,
    version: 1,
    ok: decision.ok,
    applied: true,
    saga_id: sagaId,
    execute_prepared_transaction_mounted: true,
    submit_once_runtime_adapter: true,
    inspect_submission_runtime_adapter: true,
    automatic_resubmission: false,
    transaction_broadcast_performed:
      (decision as any).transaction_broadcast_performed === true,
    money_movement_performed:
      (decision as any).money_movement_performed === true,
    decision,
    authority:
      VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_AUTHORITY_V1,
  });
}
