import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import {
  readBuyVoidExecutionAttemptV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  runBuyVoidErc20TransactionPreparationPlannerV1,
  VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_V1,
  type BuyVoidErc20TransactionPreparationPlannerPolicyV1,
} from "./buy_void_erc20_transaction_preparation_planner_v1.js";

export const VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1 =
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1";

export const VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1 = {
  status: "/__void/operator/buy-void-delivery-runtime-v1/status",
  command: "/__void/operator/buy-void-delivery-runtime-v1/command",
} as const;

export const VOID_BUY_VOID_DELIVERY_RUNTIME_ACTION_V1 =
  "plan_erc20_delivery";

export const VOID_BUY_VOID_DELIVERY_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  one_request_per_command: true,
  server_controlled_root_dir: true,
  server_controlled_policy: true,
  reserved_attempt_loaded_from_server_journal: true,
  server_derived_transaction_plan: true,
  caller_supplied_transaction_plan: false,
  coherent_pending_planner_required: true,
  read_only_planner_rpc_when_enabled: true,
  direct_sign_broadcast_apply_allowed: false,
  durable_prepared_transaction_composition_ready: false,
  private_key_input: false,
  mnemonic_input: false,
  rpc_url_input: false,
  transaction_plan_input: false,
  nonce_input: false,
  gas_limit_input: false,
  fee_input: false,
  filesystem_write: false,
  signing: false,
  transaction_broadcast: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  automatic_retry: false,
  receipt_wait: false,
  background_loop: false,
  service_restart: false,
  money_movement: false,
} as const;

const GLOBAL_MARK =
  "__void_buy_void_delivery_runtime_integration_v1";
const ENABLE_ENV =
  "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED";
const ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR";
const PLANNER_RPC_ENV = "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL";
const JSON_LIMIT = "64kb";
const FIXED_GAS_LIMIT_MULTIPLIER_BPS = "12000";
const FIXED_FEE_MULTIPLIER_BPS = "12000";

const POLICY_ENVS = {
  chain_id: "VOID_BUY_VOID_DELIVERY_CHAIN_ID",
  void_token_address:
    "VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS",
  fulfillment_wallet_address:
    "VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS",
  max_void_amount_units:
    "VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS",
  max_gas_limit:
    "VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT",
  max_fee_per_gas_wei:
    "VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI",
  max_priority_fee_per_gas_wei:
    "VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
} as const;

const ALLOWED_INPUT_KEYS = new Set([
  "action",
  "attempt_id",
]);

type PlannerPolicyStateV1 =
  | {
      configured: true;
      planner_policy:
        BuyVoidErc20TransactionPreparationPlannerPolicyV1;
      fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
    }
  | {
      configured: false;
      missing_envs: string[];
      invalid_envs: string[];
    };

function enabled(): boolean {
  return String(process.env[ENABLE_ENV] || "") === "1";
}

function dataDir(): string {
  const raw = String(
    process.env.DATA_DIR ||
      process.env.VOID_DATA_DIR ||
      "data",
  );
  return path.isAbsolute(raw)
    ? path.normalize(raw)
    : path.join(process.cwd(), raw);
}

export function buyVoidDeliveryRuntimeRootDirV1(): string {
  const configured = String(process.env[ROOT_ENV] || "").trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? path.normalize(configured)
      : path.join(process.cwd(), configured);
  }
  return path.join(
    dataDir(),
    "buy_void_v1",
    "runtime-integration-v1",
  );
}

function sha256(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function plannerPolicyState(): PlannerPolicyStateV1 {
  const values = Object.fromEntries(
    Object.entries(POLICY_ENVS).map(([key, env]) => [
      key,
      String(process.env[env] || "").trim(),
    ]),
  ) as Record<keyof typeof POLICY_ENVS, string>;
  const rpcUrl = String(process.env[PLANNER_RPC_ENV] || "").trim();

  const missing: string[] = Object.entries(POLICY_ENVS)
    .filter(([key]) => !values[key as keyof typeof POLICY_ENVS])
    .map(([, env]) => env);
  if (!rpcUrl) missing.push(PLANNER_RPC_ENV);

  const invalid: string[] = [];
  if (values.chain_id && values.chain_id !== "2050") {
    invalid.push(POLICY_ENVS.chain_id);
  }

  if (missing.length || invalid.length) {
    return {
      configured: false,
      missing_envs: [...new Set(missing)].sort(),
      invalid_envs: [...new Set(invalid)].sort(),
    };
  }

  const plannerPolicy:
    BuyVoidErc20TransactionPreparationPlannerPolicyV1 = {
      enabled: true,
      chain_id: "2050",
      rpc_url: rpcUrl,
      fulfillment_wallet_address:
        values.fulfillment_wallet_address,
      void_token_address: values.void_token_address,
      max_void_amount_units: values.max_void_amount_units,
      gas_limit_multiplier_bps:
        FIXED_GAS_LIMIT_MULTIPLIER_BPS,
      max_gas_limit: values.max_gas_limit,
      fee_multiplier_bps: FIXED_FEE_MULTIPLIER_BPS,
      max_fee_per_gas_wei: values.max_fee_per_gas_wei,
      max_priority_fee_per_gas_wei:
        values.max_priority_fee_per_gas_wei,
    };

  const fingerprintMaterial = JSON.stringify({
    chain_id: "2050",
    rpc_url: rpcUrl,
    fulfillment_wallet_address:
      values.fulfillment_wallet_address.toLowerCase(),
    void_token_address:
      values.void_token_address.toLowerCase(),
    max_void_amount_units: values.max_void_amount_units,
    gas_limit_multiplier_bps:
      FIXED_GAS_LIMIT_MULTIPLIER_BPS,
    max_gas_limit: values.max_gas_limit,
    fee_multiplier_bps: FIXED_FEE_MULTIPLIER_BPS,
    max_fee_per_gas_wei: values.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      values.max_priority_fee_per_gas_wei,
  });

  return {
    configured: true,
    planner_policy: plannerPolicy,
    fingerprint_sha256: sha256(fingerprintMaterial),
    rpc_url_fingerprint_sha256: sha256(rpcUrl),
  };
}

function remoteAddress(req: any): string {
  return String(
    req?.socket?.remoteAddress ??
      req?.connection?.remoteAddress ??
      "",
  ).trim();
}

function loopbackOnly(req: any, res: any): boolean {
  const remote = remoteAddress(req);
  const allowed =
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote === "::ffff:127.0.0.1";
  if (allowed) return true;

  res.status(403).json({
    marker:
      VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
    ok: false,
    error: "operator_loopback_only",
    remote_address: remote,
  });
  return false;
}

function directBody(value: unknown):
  | Record<string, unknown>
  | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
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

function effectiveAuthority(
  policy: PlannerPolicyStateV1,
): Record<string, boolean> {
  return {
    rpc_call: enabled() && policy.configured,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
    filesystem_write: false,
    automatic_retry: false,
  };
}

export function buyVoidDeliveryRuntimeStatusV1():
  Record<string, unknown> {
  const policy = plannerPolicyState();

  return {
    marker:
      VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
    version: 1,
    ok: true,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    routes: VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1,
    root_dir: buyVoidDeliveryRuntimeRootDirV1(),
    root_dir_source: String(process.env[ROOT_ENV] || "").trim()
      ? ROOT_ENV
      : "server_default",
    action: VOID_BUY_VOID_DELIVERY_RUNTIME_ACTION_V1,
    allowed_request_keys: [...ALLOWED_INPUT_KEYS],
    runtime_mode: "read_only_erc20_planning_hold",
    planner_marker:
      VOID_BUY_VOID_ERC20_TRANSACTION_PREPARATION_PLANNER_V1,
    planner_execution_state: "pending",
    planner_rpc_env: PLANNER_RPC_ENV,
    planner_gas_limit_multiplier_bps:
      FIXED_GAS_LIMIT_MULTIPLIER_BPS,
    planner_fee_multiplier_bps:
      FIXED_FEE_MULTIPLIER_BPS,
    policy_configured: policy.configured,
    policy_missing_envs:
      "missing_envs" in policy ? policy.missing_envs : [],
    policy_invalid_envs:
      "invalid_envs" in policy ? policy.invalid_envs : [],
    policy_fingerprint_sha256:
      policy.configured ? policy.fingerprint_sha256 : null,
    planner_rpc_url_fingerprint_sha256:
      policy.configured
        ? policy.rpc_url_fingerprint_sha256
        : null,
    server_derived_transaction_plan: true,
    caller_supplied_transaction_plan: false,
    direct_sign_broadcast_apply_allowed: false,
    durable_prepared_transaction_composition_ready: false,
    canonical_delivery_execution_ready: false,
    authority:
      VOID_BUY_VOID_DELIVERY_RUNTIME_AUTHORITY_V1,
    effective_authority:
      effectiveAuthority(policy),
  };
}

export async function handleBuyVoidDeliveryRuntimeCommandV1(
  req: any,
  res: any,
): Promise<unknown> {
  if (!loopbackOnly(req, res)) return null;

  if (!enabled()) {
    return res.status(503).json({
      marker:
        VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error:
        "buy_void_delivery_runtime_integration_disabled",
      enable_env: ENABLE_ENV,
      enabled: false,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  const body = directBody(req?.body);
  if (!body) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "invalid_json_body",
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  const forbiddenKey = invalidInputKey(body);
  if (forbiddenKey) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "caller_supplied_runtime_material_forbidden",
      forbidden_key: forbiddenKey,
      server_derived_transaction_plan: true,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  if (
    String(body.action || "") !==
    VOID_BUY_VOID_DELIVERY_RUNTIME_ACTION_V1
  ) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "invalid_delivery_action",
      supported_actions: [
        VOID_BUY_VOID_DELIVERY_RUNTIME_ACTION_V1,
      ],
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  const policy = plannerPolicyState();
  if ("missing_envs" in policy) {
    return res.status(503).json({
      marker:
        VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "delivery_planner_policy_not_configured",
      missing_envs: policy.missing_envs,
      invalid_envs: policy.invalid_envs,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  const attemptId = String(body.attempt_id || "")
    .trim()
    .toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(attemptId)) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "invalid_attempt_id",
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  const rootDir = buyVoidDeliveryRuntimeRootDirV1();
  const attempt = readBuyVoidExecutionAttemptV1({
    root_dir: rootDir,
    attempt_id: attemptId,
  });
  if (!attempt) {
    return res.status(404).json({
      marker:
        VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "reserved_execution_attempt_not_found",
      attempt_id: attemptId,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  const planner =
    await runBuyVoidErc20TransactionPreparationPlannerV1({
      attempt,
      policy: policy.planner_policy,
    });

  if (!planner.ok) {
    return res.status(409).json({
      marker:
        VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
      version: 1,
      ok: false,
      status: "held",
      error: "erc20_transaction_preparation_held",
      attempt_id: attemptId,
      planner,
      server_derived_transaction_plan: true,
      caller_supplied_transaction_plan: false,
      durable_prepared_transaction_composition_ready: false,
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
    });
  }

  return res.status(200).json({
    marker:
      VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
    version: 1,
    ok: true,
    status: "planned",
    attempt_id: attemptId,
    plan_origin:
      "coherent_pending_erc20_transaction_preparation_planner_v1",
    server_derived_transaction_plan: true,
    caller_supplied_transaction_plan: false,
    direct_sign_broadcast_apply_allowed: false,
    durable_prepared_transaction_composition_ready: false,
    canonical_delivery_execution_ready: false,
    preparation_fingerprint_sha256:
      planner.preparation_fingerprint_sha256,
    transaction_plan: planner.transaction_plan,
    planner,
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    next_gate:
      "erc20_durable_prepared_transaction_composition",
  });
}

function mount(): void {
  const globalState: any = globalThis as any;
  const app: any =
    globalState.__void_http_app || globalState.app;

  if (
    !app ||
    typeof app.get !== "function" ||
    typeof app.post !== "function"
  ) {
    setTimeout(mount, 250).unref?.();
    return;
  }

  if (app[GLOBAL_MARK]) return;
  app[GLOBAL_MARK] = true;

  const jsonParser = express.json({ limit: JSON_LIMIT });

  app.get(
    VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1.status,
    (req: any, res: any) => {
      if (!loopbackOnly(req, res)) return;
      res.setHeader?.("Cache-Control", "no-store");
      res.json(buyVoidDeliveryRuntimeStatusV1());
    },
  );

  app.post(
    VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1.command,
    jsonParser,
    (req: any, res: any) => {
      return handleBuyVoidDeliveryRuntimeCommandV1(
        req,
        res,
      ).catch((error: any) => {
        if (!res.headersSent) {
          res.status(500).json({
            marker:
              VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1,
            ok: false,
            error: "delivery_runtime_internal_error",
            error_class: String(
              error?.name || "Error",
            ).slice(0, 80),
            mutation_performed: false,
            signing_performed: false,
            transaction_broadcast_performed: false,
            money_movement_performed: false,
          });
        }
      });
    },
  );

  console.log(
    `[${VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_V1}] mounted ` +
      `${VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1.status} ` +
      `${VOID_BUY_VOID_DELIVERY_RUNTIME_ROUTES_V1.command}`,
  );
}

setTimeout(mount, 250).unref?.();
