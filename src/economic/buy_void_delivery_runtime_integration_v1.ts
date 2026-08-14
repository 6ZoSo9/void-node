import path from "node:path";
import express from "express";
import {
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1,
  VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1,
  type BuyVoidDeliveryBroadcasterV1,
  type BuyVoidDeliverySignerV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";
import {
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1,
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1,
} from "./buy_void_delivery_submission_guard_v1.js";
import {
  VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1,
  VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1,
  VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_AUTHORITY_V1,
  readBuyVoidErc20ExecutionCompositionPolicyV1,
  runBuyVoidErc20ExecutionCompositionV1,
} from "./buy_void_erc20_execution_composition_v1.js";

export const VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1 =
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1";

export const VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1 = {
  status: "/__void/operator/buy-void-delivery-runtime-v1/status",
  command: "/__void/operator/buy-void-delivery-runtime-v1/command",
} as const;

export const VOID_BUY_VOID_DELIVERY_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  server_controlled_root_dir: true,
  server_controlled_policy: true,
  prepared_attempt_loaded_from_server_journal: true,
  server_derived_transaction_plan: true,
  caller_supplied_transaction_plan: false,
  exact_confirmation_required: true,
  durable_submission_guard_required: true,
  signer_dependency_injected: true,
  broadcaster_dependency_injected: true,
  coherent_pending_planner_reused: true,
  canonical_planner_policy_validation_required: true,
  max_amount_fulfillment_unit_binding_required: true,
  confirmation_count_preflight_before_record_confirmed_required: true,
  durable_nonce_reservation_required: true,
  signed_hash_custody_required: true,
  saga_write_ahead_broadcast_intent_required: true,
  erc20_receipt_reconciliation_required: true,
  canonical_record_confirmed_required: true,
  existing_terminal_closeout_reused: true,
  private_key_input: false,
  mnemonic_input: false,
  rpc_url_input: false,
  transaction_plan_input: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  automatic_retry: false,
  receipt_wait: false,
  background_loop: false,
  service_restart: false,
  signing_when_fully_enabled: true,
  transaction_broadcast_when_fully_enabled: true,
  money_movement_when_fully_enabled: true,
} as const;

const GLOBAL_MARK = "__void_buy_void_delivery_runtime_integration_v1";
const GLOBAL_DEPENDENCIES = "__void_buy_void_delivery_runtime_dependencies_v1";
const ENABLE_ENV = "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED";
const ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR";
const JSON_LIMIT = "64kb";
const OUTER_CONFIRMATION = "buyVoidSignAndBroadcast";
const CANONICAL_DELIVERY_POLICY_ENVS = [
  "VOID_BUY_VOID_DELIVERY_CHAIN_ID",
  "VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS",
  "VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS",
  "VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS",
  "VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT",
  "VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
] as const;

const ALLOWED_INPUT_KEYS = new Set([
  "action",
  "attempt_id",
  "apply",
  "confirmation",
]);

type ExternalDependenciesV1 = {
  signer: BuyVoidDeliverySignerV1;
  broadcaster: BuyVoidDeliveryBroadcasterV1;
};

function enabled(): boolean {
  return String(process.env[ENABLE_ENV] || "") === "1";
}

function dataDir(): string {
  const raw = String(process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data");
  return path.isAbsolute(raw) ? path.normalize(raw) : path.join(process.cwd(), raw);
}

export function buyVoidDeliveryRuntimeRootDirV1(): string {
  const configured = String(process.env[ROOT_ENV] || "").trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? path.normalize(configured)
      : path.join(process.cwd(), configured);
  }
  return path.join(dataDir(), "buy_void_v1", "runtime-integration-v1");
}

function remoteAddress(req: any): string {
  return String(req?.socket?.remoteAddress ?? req?.connection?.remoteAddress ?? "").trim();
}

function loopbackOnly(req: any, res: any): boolean {
  const remote = remoteAddress(req);
  if (["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) return true;
  res.status(403).json({
    marker: VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
    ok: false,
    error: "operator_loopback_only",
    remote_address: remote,
  });
  return false;
}

function directBody(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (
    prototype !== Object.prototype &&
    prototype !== null
  ) {
    return null;
  }
  return value as Record<string, unknown>;
}

function invalidInputKey(
  value: Record<string, unknown>,
): string | null {
  for (const key of Object.keys(value)) {
    if (!ALLOWED_INPUT_KEYS.has(key)) return key;
  }
  return null;
}

function externalDependencies(): ExternalDependenciesV1 | null {
  const value = (globalThis as any)[GLOBAL_DEPENDENCIES];
  if (
    !value ||
    typeof value.signer?.get_address !== "function" ||
    typeof value.signer?.sign_transaction !== "function" ||
    typeof value.broadcaster?.broadcast_signed_transaction !== "function"
  ) return null;
  return { signer: value.signer, broadcaster: value.broadcaster };
}

function decisionStatus(decision: any): number {
  if (decision?.ok === true) return 200;
  const reason = String(decision?.reason || "");
  if (reason.includes("confirmation")) return 428;
  if (reason.includes("not_found")) return 404;
  if (
    reason.includes("conflict") || reason.includes("drift") ||
    reason.includes("reserved_by_other") || reason.includes("reconciliation") ||
    reason.includes("receipt_not_found")
  ) return 409;
  if (
    reason.includes("not_configured") || reason.includes("dependency_required") ||
    reason.includes("disabled")
  ) return 503;
  return 400;
}

export function buyVoidDeliveryRuntimeStatusV1(): Record<string, unknown> {
  const policy = readBuyVoidErc20ExecutionCompositionPolicyV1();
  const dependencies = externalDependencies();
  const active = enabled() && policy.ok === true && dependencies !== null;
  return {
    marker: VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
    version: 1,
    ok: true,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    routes: VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1,
    root_dir: buyVoidDeliveryRuntimeRootDirV1(),
    root_dir_source: String(process.env[ROOT_ENV] || "").trim() ? ROOT_ENV : "server_default",
    action: "sign_and_broadcast",
    required_confirmation: OUTER_CONFIRMATION,
    policy_configured: policy.ok,
    canonical_delivery_policy_envs: CANONICAL_DELIVERY_POLICY_ENVS,
    policy_missing_envs: policy.ok === false ? policy.missing_envs : [],
    policy_validation_reason: policy.ok === false ? policy.reason : null,
    policy_validation_detail:
      policy.ok === false ? (policy.detail || null) : null,
    canonical_planner_policy_validator_reused: true,
    policy_fingerprint_sha256:
      policy.ok === true
        ? policy.policy.policy_fingerprint_sha256
        : null,
    signer_configured: dependencies !== null,
    broadcaster_configured: dependencies !== null,
    submission_guard_configured: true,
    adapter_marker: VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_ADAPTER_V1,
    submission_guard_marker: VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1,
    execution_composition_marker: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_V1,
    server_derived_transaction_plan: true,
    caller_supplied_transaction_plan: false,
    authority: VOID_BUY_VOID_DELIVERY_RUNTIME_AUTHORITY_V1,
    adapter_authority: VOID_BUY_VOID_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1,
    submission_guard_authority: VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1,
    execution_composition_authority:
      VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_AUTHORITY_V1,
    effective_authority: {
      signing: active,
      transaction_broadcast: active,
      money_movement: active,
      rpc_call: enabled() && policy.ok === true,
      private_key_input: false,
      raw_signed_transaction_input: false,
      caller_supplied_transaction_plan: false,
      automatic_retry: false,
    },
  };
}

export async function handleBuyVoidDeliveryRuntimeCommandV1(req: any, res: any): Promise<unknown> {
  if (!loopbackOnly(req, res)) return null;
  if (!enabled()) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "buy_void_delivery_runtime_integration_disabled",
      enable_env: ENABLE_ENV,
      enabled: false,
    });
  }
  const body = directBody(req?.body);
  if (!body) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "invalid_json_body",
    });
  }
  const forbiddenKey = invalidInputKey(body);
  if (forbiddenKey) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error:
        "caller_supplied_runtime_material_forbidden",
      forbidden_key: forbiddenKey,
      server_derived_transaction_plan: true,
      caller_supplied_transaction_plan: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }
  if (String(body.action || "") !== "sign_and_broadcast") {
    return res.status(400).json({
      marker: VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "invalid_delivery_action",
      supported_actions: ["sign_and_broadcast"],
    });
  }
  const policy = readBuyVoidErc20ExecutionCompositionPolicyV1();
  if (policy.ok === false) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "delivery_policy_not_configured",
      reason: policy.reason,
      missing_envs: policy.missing_envs,
    });
  }
  const apply = body.apply === true;
  if (apply && String(body.confirmation || "") !== OUTER_CONFIRMATION) {
    return res.status(428).json({
      marker: VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "explicit_confirmation_required",
      required_confirmation: OUTER_CONFIRMATION,
    });
  }
  const attemptId = String(body.attempt_id || "").trim().toLowerCase();
  const external = externalDependencies();
  const decision = await runBuyVoidErc20ExecutionCompositionV1({
    root_dir: buyVoidDeliveryRuntimeRootDirV1(),
    attempt_id: attemptId,
    apply,
    ...(apply
      ? { confirmation: VOID_BUY_VOID_ERC20_EXECUTION_COMPOSITION_CONFIRMATION_V1 }
      : {}),
    policy: policy.policy,
    dependencies: external ? { signer: external.signer, broadcaster: external.broadcaster } : {},
  });
  return res.status(decisionStatus(decision)).json({
    marker: VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
    version: 1,
    ok: decision.ok,
    enabled: true,
    operator_loopback_only: true,
    root_dir_server_controlled: true,
    policy_server_controlled: true,
    server_derived_transaction_plan: true,
    caller_supplied_transaction_plan: false,
    decision,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
  });
}

function mount(): void {
  const globalState: any = globalThis as any;
  const app: any = globalState.__void_http_app || globalState.app;
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    setTimeout(mount, 250).unref?.();
    return;
  }
  if (app[GLOBAL_MARK]) return;
  app[GLOBAL_MARK] = true;
  const jsonParser = express.json({ limit: JSON_LIMIT });
  app.get(VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1.status, (req: any, res: any) => {
    if (!loopbackOnly(req, res)) return;
    res.setHeader?.("Cache-Control", "no-store");
    res.json(buyVoidDeliveryRuntimeStatusV1());
  });
  app.post(
    VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1.command,
    jsonParser,
    (req: any, res: any) => handleBuyVoidDeliveryRuntimeCommandV1(req, res).catch((error: any) => {
      if (!res.headersSent) {
        res.status(500).json({
          marker: VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
          ok: false,
          error: "delivery_runtime_internal_error",
          error_class: String(error?.name || "Error").slice(0, 80),
          automatic_retry_allowed: false,
        });
      }
    }),
  );
  console.log(
    `[${VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1}] mounted ` +
      `${VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1.status} ` +
      `${VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1.command}`,
  );
}

setTimeout(mount, 250).unref?.();
