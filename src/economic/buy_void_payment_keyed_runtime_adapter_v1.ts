import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import { getAddress } from "ethers";

import {
  readBuyVoidCanonicalPresaleServerPolicyV1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1,
  type BuyVoidPaymentKeyedTransactionPreparationPolicyV1,
} from "./buy_void_payment_keyed_transaction_preparation_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1,
  runBuyVoidPaymentKeyedRuntimePreflightV1,
  type BuyVoidPaymentKeyedRuntimePreflightDecisionV1,
  type BuyVoidPaymentKeyedRuntimeServerPolicyV1,
} from "./buy_void_payment_keyed_runtime_preflight_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ROUTES_V1 = {
  status: "/__void/operator/buy-void-payment-keyed-runtime-v1/status",
  command: "/__void/operator/buy-void-payment-keyed-runtime-v1/command",
} as const;

export const VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  explicit_enable_required_before_rpc: true,
  dry_run_only: true,
  apply_input_forbidden: true,
  attempt_id_only_selector: true,
  caller_policy_forbidden: true,
  caller_saga_id_forbidden: true,
  caller_plan_reservation_id_forbidden: true,
  caller_transaction_material_forbidden: true,
  server_controlled_root_dir: true,
  server_controlled_policy: true,
  canonical_parent_dispatch: false,
  source_finality_preflight_required: true,
  payment_keyed_runtime_preflight_required: true,
  read_only_rpc_possible_when_enabled: true,
  filesystem_write: false,
  signer_access: false,
  credential_access: false,
  signing: false,
  durable_submission_claim: false,
  transaction_broadcast: false,
  receipt_acceptance: false,
  saga_mutation: false,
  inventory_mutation: false,
  public_fulfilled_closeout: false,
  background_loop: false,
  startup_execution: false,
  service_restart: false,
  money_movement: false,
} as const;

export const VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1 = {
  enabled:
    "VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_ENABLED",
  root_dir:
    "VOID_BUY_VOID_RUNTIME_DIR",
  rpc_url:
    "VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL",
  fulfillment_contract_address:
    "VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS",
  gas_limit_multiplier_bps:
    "VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS",
  max_gas_limit:
    "VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT",
  fee_multiplier_bps:
    "VOID_BUY_VOID_PAYMENT_KEYED_FEE_MULTIPLIER_BPS",
  max_fee_per_gas_wei:
    "VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI",
  max_priority_fee_per_gas_wei:
    "VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI",
  request_timeout_ms:
    "VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS",
  max_response_bytes:
    "VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES",
} as const;

type PolicyStateV1 =
  | {
      configured: true;
      root_dir: string;
      server_policy: BuyVoidPaymentKeyedRuntimeServerPolicyV1;
      policy_fingerprint_sha256: string;
      preparation_policy_fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
      fulfillment_wallet_fingerprint_sha256: string;
      fulfillment_contract_fingerprint_sha256: string;
    }
  | {
      configured: false;
      reason: string;
      missing_envs: string[];
      invalid_envs: string[];
    };

export type BuyVoidPaymentKeyedRuntimeAdapterOptionsV1 = {
  env?: NodeJS.ProcessEnv;
  policy_state?: () => PolicyStateV1;
  run_preflight?: typeof runBuyVoidPaymentKeyedRuntimePreflightV1;
};

const GLOBAL_MARK =
  "__void_buy_void_payment_keyed_runtime_adapter_v1_mounted";
const JSON_LIMIT = "8kb";
const SHA256 = /^[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function enabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return /^(1|true|yes|on)$/i.test(
    text(env[VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1.enabled]),
  );
}

function address(value: unknown): string {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

export function buyVoidPaymentKeyedRuntimeAdapterRootDirV1(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = text(
    env[VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1.root_dir],
  );
  if (configured) return path.resolve(configured);
  const dataDir = text(env.VOID_DATA_DIR || env.DATA_DIR || "data_a");
  return path.resolve(
    process.cwd(),
    dataDir,
    "buy_void_v1",
    "runtime-integration-v1",
  );
}

export function buyVoidPaymentKeyedRuntimeAdapterPolicyStateV1(
  env: NodeJS.ProcessEnv = process.env,
): PolicyStateV1 {
  const saga = readBuyVoidCanonicalPresaleServerPolicyV1(env);
  if (saga.ok === false) {
    return {
      configured: false,
      reason: "payment_keyed_runtime_adapter_saga_policy_held:" + saga.reason,
      missing_envs: [...saga.missing_envs].sort(),
      invalid_envs: [],
    };
  }

  const names = VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1;
  const required = [
    names.rpc_url,
    names.fulfillment_contract_address,
    names.gas_limit_multiplier_bps,
    names.max_gas_limit,
    names.fee_multiplier_bps,
    names.max_fee_per_gas_wei,
    names.max_priority_fee_per_gas_wei,
  ];
  const missing = required.filter((name) => !text(env[name]));
  if (missing.length) {
    return {
      configured: false,
      reason: "payment_keyed_runtime_adapter_policy_not_configured",
      missing_envs: missing.sort(),
      invalid_envs: [],
    };
  }

  const wallets =
    saga.policy.execution_policy.fulfillment_wallet_allowlist
      .map((value) => address(value));
  if (wallets.length !== 1 || !wallets[0]) {
    return {
      configured: false,
      reason: "payment_keyed_runtime_adapter_wallet_policy_invalid",
      missing_envs: [],
      invalid_envs: [],
    };
  }
  const wallet = wallets[0];
  const contract = address(env[names.fulfillment_contract_address]);
  if (!contract || contract === wallet) {
    return {
      configured: false,
      reason: "payment_keyed_runtime_adapter_contract_policy_invalid",
      missing_envs: [],
      invalid_envs: [names.fulfillment_contract_address],
    };
  }

  const maximum = text(
    saga.policy.inventory_policy.max_reservation_void_units,
  );
  const timeout = text(env[names.request_timeout_ms]);
  const maxResponse = text(env[names.max_response_bytes]);
  const preparationPolicy: BuyVoidPaymentKeyedTransactionPreparationPolicyV1 = {
    enabled: true,
    chain_id: "2050",
    rpc_url: text(env[names.rpc_url]),
    fulfillment_wallet_address: wallet,
    fulfillment_contract_address: contract,
    max_void_amount_units: maximum,
    gas_limit_multiplier_bps: text(env[names.gas_limit_multiplier_bps]),
    max_gas_limit: text(env[names.max_gas_limit]),
    fee_multiplier_bps: text(env[names.fee_multiplier_bps]),
    max_fee_per_gas_wei: text(env[names.max_fee_per_gas_wei]),
    max_priority_fee_per_gas_wei:
      text(env[names.max_priority_fee_per_gas_wei]),
    ...(timeout ? { request_timeout_ms: timeout } : {}),
    ...(maxResponse ? { max_response_bytes: maxResponse } : {}),
  };

  const validation =
    validateBuyVoidPaymentKeyedTransactionPreparationPolicyV1(
      preparationPolicy,
    );
  if (validation.ok === false) {
    return {
      configured: false,
      reason:
        "payment_keyed_runtime_adapter_preparation_policy_held:" +
        validation.reason,
      missing_envs: [],
      invalid_envs: [
        ...(validation.rpc_url_fingerprint_sha256 === null
          ? [names.rpc_url]
          : []),
      ],
    };
  }

  const rootDir = buyVoidPaymentKeyedRuntimeAdapterRootDirV1(env);
  if (
    !path.isAbsolute(rootDir) ||
    rootDir === path.parse(rootDir).root ||
    rootDir.includes("\0")
  ) {
    return {
      configured: false,
      reason: "payment_keyed_runtime_adapter_root_invalid",
      missing_envs: [],
      invalid_envs: [names.root_dir],
    };
  }

  const serverPolicy: BuyVoidPaymentKeyedRuntimeServerPolicyV1 = {
    preparation_policy: preparationPolicy,
    fulfillment_contract_address: contract,
    max_void_amount_units: maximum,
    saga_policy: saga.policy,
  };
  const policyFingerprint = sha256(
    [
      "marker=" + VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1,
      "version=1",
      "root_dir_sha256=" + sha256(rootDir),
      "saga_policy_fingerprint_sha256=" +
        saga.policy.fingerprints.combined_policy_sha256,
      "preparation_policy_fingerprint_sha256=" +
        validation.policy_fingerprint_sha256,
      "fulfillment_contract_address=" + contract,
      "fulfillment_wallet_address=" + wallet,
      "max_void_amount_units=" + maximum,
    ].join("\n"),
  );

  return {
    configured: true,
    root_dir: rootDir,
    server_policy: serverPolicy,
    policy_fingerprint_sha256: policyFingerprint,
    preparation_policy_fingerprint_sha256:
      validation.policy_fingerprint_sha256,
    rpc_url_fingerprint_sha256:
      validation.rpc_url_fingerprint_sha256,
    fulfillment_wallet_fingerprint_sha256: sha256(wallet),
    fulfillment_contract_fingerprint_sha256: sha256(contract),
  };
}

function remoteAddress(req: any): string {
  return text(
    req?.socket?.remoteAddress ??
      req?.connection?.remoteAddress ??
      req?.ip ??
      "",
  ).toLowerCase();
}

function loopbackOnly(req: any, res: any): boolean {
  const remote = remoteAddress(req);
  const allowed = [
    "127.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
  ].includes(remote);
  if (allowed) return true;
  res.status(403).json({
    marker: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1,
    ok: false,
    error: "operator_loopback_only",
  });
  return false;
}

function directObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return null;
  return value as Record<string, unknown>;
}

function responseStatus(
  decision: BuyVoidPaymentKeyedRuntimePreflightDecisionV1,
): number {
  if (decision.ok === true) return 200;
  if (
    decision.stage === "attempt" ||
    decision.stage === "intent" ||
    decision.stage === "inventory" ||
    decision.stage === "saga_identity"
  ) {
    return 409;
  }
  if (decision.stage === "source_finality") return 503;
  return 422;
}

export function buyVoidPaymentKeyedRuntimeAdapterStatusV1(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, unknown> {
  const policy = buyVoidPaymentKeyedRuntimeAdapterPolicyStateV1(env);
  return {
    marker: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1,
    version: 1,
    ok: true,
    enabled: enabled(env),
    enable_env:
      VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1.enabled,
    routes: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ROUTES_V1,
    command_mode: "dry_run_preflight_only",
    attempt_id_only_selector: true,
    canonical_parent_dispatch: false,
    policy_configured: policy.configured,
    ...(policy.configured
      ? {
          policy_fingerprint_sha256:
            policy.policy_fingerprint_sha256,
          preparation_policy_fingerprint_sha256:
            policy.preparation_policy_fingerprint_sha256,
          rpc_url_fingerprint_sha256:
            policy.rpc_url_fingerprint_sha256,
          fulfillment_wallet_fingerprint_sha256:
            policy.fulfillment_wallet_fingerprint_sha256,
          fulfillment_contract_fingerprint_sha256:
            policy.fulfillment_contract_fingerprint_sha256,
          root_dir_fingerprint_sha256:
            sha256(policy.root_dir),
        }
      : {
          policy_reason: policy.reason,
          missing_policy_envs: policy.missing_envs,
          invalid_policy_envs: policy.invalid_envs,
        }),
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_AUTHORITY_V1,
    preflight_marker:
      VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_V1,
  };
}

export async function handleBuyVoidPaymentKeyedRuntimeAdapterCommandV1(
  req: any,
  res: any,
  options: BuyVoidPaymentKeyedRuntimeAdapterOptionsV1 = {},
): Promise<unknown> {
  if (!loopbackOnly(req, res)) return null;

  const body = directObject(req?.body);
  if (!body) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1,
      ok: false,
      error: "invalid_json_body",
    });
  }
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "attempt_id") {
    return res.status(400).json({
      marker: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1,
      ok: false,
      error: "caller_supplied_runtime_material_forbidden",
      allowed_keys: ["attempt_id"],
      unexpected_keys: keys
        .filter((key) => key !== "attempt_id")
        .sort(),
    });
  }

  const attemptId = text(body.attempt_id).toLowerCase();
  if (!SHA256.test(attemptId)) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1,
      ok: false,
      error: "invalid_attempt_id",
    });
  }

  const env = options.env || process.env;
  if (!enabled(env)) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1,
      ok: false,
      error: "payment_keyed_runtime_adapter_disabled",
      enabled: false,
      enable_env:
        VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ENVS_V1.enabled,
    });
  }

  const policy = options.policy_state
    ? options.policy_state()
    : buyVoidPaymentKeyedRuntimeAdapterPolicyStateV1(env);
  if (!policy.configured) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1,
      ok: false,
      error: policy.reason,
      missing_policy_envs: policy.missing_envs,
      invalid_policy_envs: policy.invalid_envs,
    });
  }

  const runPreflight =
    options.run_preflight ||
    runBuyVoidPaymentKeyedRuntimePreflightV1;
  const decision = await runPreflight({
    root_dir: policy.root_dir,
    attempt_id: attemptId,
    server_policy: policy.server_policy,
    env,
  });

  return res.status(responseStatus(decision)).json(decision);
}

function mount(): void {
  const globalState: any = globalThis as any;
  const app: any = globalState.__void_http_app || globalState.app;
  if (
    !app ||
    typeof app.get !== "function" ||
    typeof app.post !== "function"
  ) {
    setTimeout(mount, 250).unref?.();
    return;
  }
  if (globalState[GLOBAL_MARK]) return;
  globalState[GLOBAL_MARK] = true;

  app.get(
    VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ROUTES_V1.status,
    (req: any, res: any) => {
      if (!loopbackOnly(req, res)) return;
      res.setHeader?.("Cache-Control", "no-store");
      res.status(200).json(
        buyVoidPaymentKeyedRuntimeAdapterStatusV1(),
      );
    },
  );

  app.post(
    VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_ROUTES_V1.command,
    express.json({ limit: JSON_LIMIT }),
    (req: any, res: any) => {
      void handleBuyVoidPaymentKeyedRuntimeAdapterCommandV1(
        req,
        res,
      );
    },
  );
}

mount();
