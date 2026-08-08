import path from "node:path";

import {
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_AUTHORITY_V1,
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
  runBuyVoidSagaTerminalCloseoutV1,
} from "./buy_void_saga_terminal_closeout_v1.js";
import {
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_ENVS_V1,
  readBuyVoidSagaTerminalCloseoutServerPolicyV1,
} from "./buy_void_saga_terminal_closeout_server_policy_v1.js";

export const VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1 =
  "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1";

export const VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1 =
  "run_saga_terminal_closeout";

export const VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1 =
  "buyVoidRunSagaTerminalCloseoutRuntimeV1";

export const VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  apply_disabled_by_default: true,
  server_controlled_root_dir: true,
  server_controlled_terminal_policy: true,
  saga_id_only_selector: true,
  exact_runtime_confirmation_required: true,
  exact_terminal_closeout_confirmation_required: true,
  exact_policy_fingerprint_echo_required: true,
  exact_saga_confirmation_required: true,
  exact_saga_action_confirmation_required: true,
  dry_run_available_without_apply_enable: true,
  inventory_consumption_possible_when_explicitly_applied: true,
  public_fulfilled_projection_possible_when_explicitly_applied: true,
  saga_closeout_possible_when_explicitly_applied: true,
  public_request_base_record_mutation: false,
  reservation_base_record_mutation: false,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  automatic_retry: false,
  background_loop: false,
  startup_execution: false,
  money_movement: false,
} as const;

const ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ENABLED";
const APPLY_ENABLE_ENV =
  "VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_APPLY_ENABLED";
const SAGA_ID = /^voidbvfsg1_[0-9a-f]{64}$/;

const ALLOWED_KEYS = new Set([
  "action",
  "saga_id",
  "apply",
  "confirmation",
  "terminal_closeout_confirmation",
  "policy_fingerprint_sha256",
  "saga_confirmation",
  "saga_action_confirmation",
]);

export type BuyVoidSagaTerminalCloseoutRuntimeDependenciesV1 = {
  run_closeout?: typeof runBuyVoidSagaTerminalCloseoutV1;
};

type RuntimeOptionsV1 = {
  root_dir: string;
  dependencies?: BuyVoidSagaTerminalCloseoutRuntimeDependenciesV1;
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
    throw new Error("terminal_closeout_runtime_server_root_invalid");
  }
  const resolved = path.resolve(raw);
  if (resolved === path.parse(resolved).root) {
    throw new Error(
      "terminal_closeout_runtime_server_root_must_not_be_filesystem_root",
    );
  }
  return resolved;
}

function dependencies(
  supplied?: BuyVoidSagaTerminalCloseoutRuntimeDependenciesV1,
): Required<BuyVoidSagaTerminalCloseoutRuntimeDependenciesV1> {
  return {
    run_closeout: runBuyVoidSagaTerminalCloseoutV1,
    ...(supplied || {}),
  };
}

function inputKeysValid(body: Record<string, any>):
  | { ok: true }
  | { ok: false; key: string } {
  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(key)) return { ok: false, key };
  }
  return { ok: true };
}

function decisionHttpStatus(decision: any): number {
  if (decision?.ok === true) return 200;
  if (decision?.mutation_performed === true) return 500;

  const reason = text(decision?.reason);
  if (
    reason.includes("confirmation") ||
    reason.includes("fingerprint")
  ) {
    return 428;
  }
  if (
    reason.includes("conflict") ||
    reason.includes("mismatch") ||
    reason.includes("ambiguous") ||
    reason.includes("state_changed")
  ) {
    return 409;
  }
  if (
    reason.includes("disabled") ||
    reason.includes("not_configured") ||
    reason.includes("parent_economic_policy_held")
  ) {
    return 503;
  }
  return 422;
}

export function buyVoidSagaTerminalCloseoutRuntimeStatusV1():
Record<string, unknown> {
  const policy = readBuyVoidSagaTerminalCloseoutServerPolicyV1();

  return {
    marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
    version: 1,
    action: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    apply_enabled: applyEnabled(),
    apply_enable_env: APPLY_ENABLE_ENV,
    terminal_policy_enable_env:
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_ENVS_V1.enabled,
    terminal_policy_request_dir_env:
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_SERVER_POLICY_ENVS_V1.request_dir,
    terminal_policy_configured: policy.ok === true,
    terminal_policy_fingerprint_sha256:
      policy.ok === true ? policy.policy.fingerprint_sha256 : null,
    terminal_policy_missing_envs:
      policy.ok === true ? [] : policy.missing_envs,
    required_runtime_confirmation:
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1,
    required_terminal_closeout_confirmation:
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_CONFIRMATION_V1,
    authority: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_AUTHORITY_V1,
    terminal_closeout_authority:
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_AUTHORITY_V1,
  };
}

export async function handleBuyVoidSagaTerminalCloseoutRuntimeCommandV1(
  req: any,
  res: any,
  options: RuntimeOptionsV1,
): Promise<unknown> {
  if (!loopback(req)) {
    return res.status(403).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "operator_loopback_only",
    });
  }

  if (!enabled()) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "saga_terminal_closeout_runtime_disabled",
      enable_env: ENABLE_ENV,
    });
  }

  const body = directObject(req?.body);
  if (
    !body ||
    text(body.action) !==
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1
  ) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "invalid_saga_terminal_closeout_runtime_command",
    });
  }

  const keys = inputKeysValid(body);
  if ("key" in keys) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "caller_supplied_runtime_material_forbidden",
      forbidden_key: keys.key,
    });
  }

  const sagaId = text(body.saga_id).toLowerCase();
  if (!SAGA_ID.test(sagaId)) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "invalid_saga_id",
    });
  }

  let rootDir: string;
  try {
    rootDir = absoluteRoot(options.root_dir);
  } catch (error) {
    return res.status(500).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "server_controlled_root_invalid",
      reason: text((error as Error)?.message || error).slice(0, 160),
    });
  }

  const deps = dependencies(options.dependencies);
  const dry = await deps.run_closeout({
    root_dir: rootDir,
    saga_id: sagaId,
    apply: false,
  });

  if (dry.ok !== true) {
    return res.status(decisionHttpStatus(dry)).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      ok: false,
      status: "held",
      phase: "dry_run",
      decision: dry,
      inventory_consumption_performed: false,
      public_request_fulfilled: false,
      saga_closeout_appended: false,
      money_movement_performed: false,
      authority: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_AUTHORITY_V1,
    });
  }

  if (dry.status === "duplicate") {
    return res.status(200).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      version: 1,
      ok: true,
      status: "duplicate",
      applied: true,
      saga_id: sagaId,
      already_closed: true,
      decision: dry,
      inventory_consumption_performed: false,
      public_request_fulfilled: true,
      saga_closeout_appended: false,
      money_movement_performed: false,
      authority: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_AUTHORITY_V1,
    });
  }

  if (dry.status !== "dry_run") {
    return res.status(500).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "terminal_closeout_preflight_not_dry_run",
      money_movement_performed: false,
    });
  }

  if (body.apply !== true) {
    return res.status(200).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      version: 1,
      ok: true,
      status: "dry_run",
      applied: false,
      saga_id: sagaId,
      required_runtime_confirmation:
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1,
      required_terminal_closeout_confirmation: dry.required_confirmation,
      required_policy_fingerprint_sha256:
        dry.required_policy_fingerprint_sha256,
      required_saga_confirmation: dry.required_saga_confirmation,
      required_saga_action_confirmation:
        dry.required_saga_action_confirmation,
      inventory_consumption_performed: false,
      public_request_fulfilled: false,
      saga_closeout_appended: false,
      money_movement_performed: false,
      decision: dry,
      authority: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_AUTHORITY_V1,
    });
  }

  if (!applyEnabled()) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "saga_terminal_closeout_runtime_apply_disabled",
      apply_enable_env: APPLY_ENABLE_ENV,
      inventory_consumption_performed: false,
      public_request_fulfilled: false,
      saga_closeout_appended: false,
      money_movement_performed: false,
    });
  }

  const confirmationsExact =
    text(body.confirmation) ===
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1 &&
    text(body.terminal_closeout_confirmation) ===
      dry.required_confirmation &&
    text(body.policy_fingerprint_sha256).toLowerCase() ===
      dry.required_policy_fingerprint_sha256 &&
    text(body.saga_confirmation) === dry.required_saga_confirmation &&
    text(body.saga_action_confirmation) ===
      dry.required_saga_action_confirmation;

  if (!confirmationsExact) {
    return res.status(428).json({
      marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "saga_terminal_closeout_runtime_confirmation_mismatch",
      required_runtime_confirmation:
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_CONFIRMATION_V1,
      required_terminal_closeout_confirmation: dry.required_confirmation,
      required_policy_fingerprint_sha256:
        dry.required_policy_fingerprint_sha256,
      required_saga_confirmation: dry.required_saga_confirmation,
      required_saga_action_confirmation:
        dry.required_saga_action_confirmation,
      inventory_consumption_performed: false,
      public_request_fulfilled: false,
      saga_closeout_appended: false,
      money_movement_performed: false,
    });
  }

  const applied = await deps.run_closeout({
    root_dir: rootDir,
    saga_id: sagaId,
    apply: true,
    confirmation: dry.required_confirmation,
    policy_fingerprint_sha256:
      dry.required_policy_fingerprint_sha256,
    saga_confirmation: dry.required_saga_confirmation,
    saga_action_confirmation:
      dry.required_saga_action_confirmation,
  });

  return res.status(decisionHttpStatus(applied)).json({
    marker: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1,
    version: 1,
    ok: applied.ok,
    status: applied.status,
    applied: applied.applied,
    saga_id: sagaId,
    decision: applied,
    mutation_performed: applied.mutation_performed,
    inventory_consumption_performed:
      applied.inventory_consumption_performed,
    public_request_fulfilled: applied.public_request_fulfilled,
    saga_closeout_appended: applied.saga_closeout_appended,
    automatic_retry_allowed: false,
    money_movement_performed: false,
    authority: VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_AUTHORITY_V1,
  });
}
