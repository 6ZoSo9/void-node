import crypto from "node:crypto";
import path from "node:path";
import {
  runBuyVoidSagaBroadcastReconciliationV1,
  type RunBuyVoidSagaBroadcastReconciliationInputV1,
} from "./buy_void_saga_broadcast_reconciliation_coordinator_v1.js";
import {
  createBuyVoidPreparedTransactionBroadcasterIpcV1,
} from "./buy_void_prepared_transaction_broadcaster_ipc_v1.js";
import type {
  BuyVoidPreparedTransactionBroadcasterV1,
} from "./buy_void_prepared_transaction_broadcast_custody_v1.js";

export const VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1 =
  "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1";

export const VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1 =
  "run_saga_broadcast_reconciliation";

export const VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_CONFIRMATION_V1 =
  "buyVoidRunSagaBroadcastReconciliationRuntimeV1";

export const VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  apply_disabled_by_default: true,
  server_controlled_root_dir: true,
  saga_id_only_selector: true,
  server_controlled_broadcaster_socket: true,
  broadcaster_socket_path_not_exposed: true,
  stable_policy_fingerprint_echo_required: true,
  exact_runtime_confirmation_required: true,
  exact_coordinator_confirmation_required: true,
  exact_saga_confirmation_required: true,
  exact_saga_action_confirmation_required: true,
  dry_run_available_without_broadcaster_socket: true,
  reconcile_possible_broadcast_only_when_applied: true,
  execute_prepared_transaction_mounted: false,
  submit_once_runtime_adapter: false,
  inspect_submission_runtime_adapter: true,
  external_inspection_possible_when_applied: true,
  automatic_resubmission: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  custody_handle_input: false,
  custody_handle_output: false,
  application_wallet_access: false,
  application_signing: false,
  transaction_broadcast: false,
  inventory_decrement: false,
  public_fulfilled_closeout: false,
  background_loop: false,
  startup_execution: false,
  money_movement: false,
} as const;

const ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ENABLED";
const APPLY_ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_APPLY_ENABLED";
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
]);

export type BuyVoidSagaBroadcastReconciliationRuntimeDependenciesV1 = {
  run_reconciliation?: typeof runBuyVoidSagaBroadcastReconciliationV1;
  create_broadcaster?: typeof createBuyVoidPreparedTransactionBroadcasterIpcV1;
};

type RuntimeOptionsV1 = {
  root_dir: string;
  dependencies?: BuyVoidSagaBroadcastReconciliationRuntimeDependenciesV1;
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
    throw new Error("broadcast_runtime_server_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error("broadcast_runtime_server_root_must_not_be_filesystem_root");
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
  supplied?: BuyVoidSagaBroadcastReconciliationRuntimeDependenciesV1,
): Required<BuyVoidSagaBroadcastReconciliationRuntimeDependenciesV1> {
  return {
    run_reconciliation: runBuyVoidSagaBroadcastReconciliationV1,
    create_broadcaster: createBuyVoidPreparedTransactionBroadcasterIpcV1,
    ...(supplied || {}),
  };
}

function inputKeysValid(body: Record<string, any>): {
  ok: true;
} | {
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
  if (
    reason.includes("confirmation") ||
    reason.includes("fingerprint")
  ) return 428;
  if (
    reason.includes("conflict") ||
    reason.includes("state_changed") ||
    reason.includes("outside_boundary") ||
    reason.includes("still_unknown") ||
    reason.includes("receipt_pending")
  ) return 409;
  if (
    reason.includes("not_configured") ||
    reason.includes("disabled")
  ) return 503;
  return 422;
}

function reconciliationOnlyBroadcaster(
  broadcaster: BuyVoidPreparedTransactionBroadcasterV1,
): BuyVoidPreparedTransactionBroadcasterV1 {
  return {
    submit_once: async () => {
      throw new Error(
        "runtime_reconciliation_only_submit_once_forbidden",
      );
    },
    inspect_submission: async (request) =>
      broadcaster.inspect_submission(request),
  };
}

export function buyVoidSagaBroadcastReconciliationRuntimeStatusV1():
Record<string, unknown> {
  return {
    marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
    version: 1,
    action:
      VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    apply_enabled: applyEnabled(),
    apply_enable_env: APPLY_ENABLE_ENV,
    broadcaster_socket_env: SOCKET_ENV,
    broadcaster_socket_configured: socketConfigured(),
    broadcaster_socket_fingerprint_sha256: socketFingerprint(),
    required_runtime_confirmation:
      VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_CONFIRMATION_V1,
    supported_apply_action: "reconcile_possible_broadcast",
    execute_prepared_transaction_mounted: false,
    authority:
      VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_AUTHORITY_V1,
  };
}

export async function handleBuyVoidSagaBroadcastReconciliationRuntimeCommandV1(
  req: any,
  res: any,
  options: RuntimeOptionsV1,
): Promise<unknown> {
  if (!loopback(req)) {
    return res.status(403).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "operator_loopback_only",
    });
  }

  if (!enabled()) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "saga_broadcast_reconciliation_runtime_disabled",
      enable_env: ENABLE_ENV,
    });
  }

  const body = directObject(req?.body);
  if (
    !body ||
    text(body.action) !==
      VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1
  ) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "invalid_saga_broadcast_reconciliation_runtime_command",
    });
  }

  const keys = inputKeysValid(body);
  if ("key" in keys) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "caller_supplied_runtime_material_forbidden",
      forbidden_key: keys.key,
    });
  }

  const sagaId = text(body.saga_id).toLowerCase();
  if (!SAGA_ID.test(sagaId)) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "invalid_saga_id",
    });
  }

  let rootDir: string;
  try {
    rootDir = absoluteRoot(options.root_dir);
  } catch (error) {
    return res.status(500).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "server_controlled_root_invalid",
      reason: text((error as Error)?.message || error).slice(0, 160),
    });
  }

  const deps = dependencies(options.dependencies);
  const dry = await deps.run_reconciliation({
    root_dir: rootDir,
    saga_id: sagaId,
    apply: false,
  });

  if (dry.ok !== true) {
    return res.status(decisionHttpStatus(dry)).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      status: "held",
      phase: "dry_run",
      decision: dry,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority:
        VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_AUTHORITY_V1,
    });
  }

  if (dry.status !== "dry_run") {
    return res.status(500).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "reconciliation_preflight_not_dry_run",
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  if (body.apply !== true) {
    return res.status(200).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      version: 1,
      ok: true,
      status: "dry_run",
      applied: false,
      saga_id: sagaId,
      next_action: dry.next_action,
      required_runtime_confirmation:
        VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_CONFIRMATION_V1,
      required_coordinator_confirmation: dry.required_confirmation,
      required_policy_fingerprint_sha256:
        dry.required_policy_fingerprint_sha256,
      required_saga_confirmation: dry.required_saga_confirmation,
      required_saga_action_confirmation:
        dry.required_saga_action_confirmation,
      execute_prepared_transaction_mounted: false,
      reconcile_possible_broadcast_apply_supported:
        dry.next_action === "reconcile_possible_broadcast",
      broadcaster_socket_required_for_dry_run: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      decision: dry,
      authority:
        VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_AUTHORITY_V1,
    });
  }

  if (!applyEnabled()) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "saga_broadcast_reconciliation_apply_disabled",
      apply_enable_env: APPLY_ENABLE_ENV,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  if (dry.next_action !== "reconcile_possible_broadcast") {
    return res.status(409).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "execute_prepared_transaction_not_mounted",
      next_action: dry.next_action,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  if (
    text(body.confirmation) !==
      VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_CONFIRMATION_V1 ||
    text(body.coordinator_confirmation) !==
      dry.required_confirmation ||
    text(body.policy_fingerprint_sha256) !==
      dry.required_policy_fingerprint_sha256 ||
    text(body.saga_confirmation) !==
      dry.required_saga_confirmation ||
    text(body.saga_action_confirmation) !==
      dry.required_saga_action_confirmation
  ) {
    return res.status(428).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "exact_reconciliation_confirmations_required",
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
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "server_controlled_broadcaster_socket_not_configured",
      socket_env: SOCKET_ENV,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  let broadcaster: BuyVoidPreparedTransactionBroadcasterV1;
  try {
    broadcaster = reconciliationOnlyBroadcaster(
      deps.create_broadcaster({
        socket_path: configuredSocket,
      }),
    );
  } catch (error) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
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
    dependencies: { broadcaster },
  };

  const decision = await deps.run_reconciliation(applyInput);

  if (
    (decision as any)?.submission_call_performed === true ||
    (decision as any)?.transaction_broadcast_performed === true ||
    (decision as any)?.money_movement_performed === true
  ) {
    return res.status(500).json({
      marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
      ok: false,
      error: "reconciliation_only_authority_boundary_violation",
      reconciliation_required: true,
      transaction_broadcast_performed:
        (decision as any)?.transaction_broadcast_performed === true,
      money_movement_performed:
        (decision as any)?.money_movement_performed === true,
    });
  }

  return res.status(decisionHttpStatus(decision)).json({
    marker: VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1,
    version: 1,
    ok: decision.ok,
    applied: true,
    saga_id: sagaId,
    execute_prepared_transaction_mounted: false,
    submit_once_runtime_adapter: false,
    inspect_submission_runtime_adapter: true,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    decision,
    authority:
      VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_AUTHORITY_V1,
  });
}
