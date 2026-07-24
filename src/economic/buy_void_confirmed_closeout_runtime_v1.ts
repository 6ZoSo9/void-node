import path from "node:path";
import express from "express";
import {
  VOID_BUY_VOID_CONFIRMED_CLOSEOUT_AUTHORITY_V1,
  VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1,
  runBuyVoidConfirmedCloseoutV1,
  type BuyVoidConfirmedCloseoutDecisionV1,
} from "./buy_void_confirmed_closeout_v1.js";

export const VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1 =
  "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1";

export const VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_ROUTES_V1 = {
  status:
    "/__void/operator/buy-void-confirmed-closeout-v1/status",
  command:
    "/__void/operator/buy-void-confirmed-closeout-v1/command",
} as const;

export const VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  server_controlled_root_dir: true,
  server_controlled_request_dir: true,
  attempt_id_only_selector: true,
  one_request_per_command: true,
  dry_by_default: true,
  exact_confirmation_required: true,
  wallet_access: false,
  credential_access: false,
  signing: false,
  transaction_broadcast: false,
  rpc_call: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  background_loop: false,
  startup_execution: false,
  service_restart: false,
  money_movement: false,
} as const;

const ENABLE_ENV =
  "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_ENABLED";
const ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR";
const REQUEST_DIR_ENV = "VOID_BUY_REQUEST_DIR";
const POOL_ENV = "VOID_BUY_VOID_INVENTORY_POOL_ID";
const GLOBAL_MARK =
  "__void_buy_void_confirmed_closeout_runtime_v1_mounted";
const JSON_LIMIT = "8kb";

function enabled(): boolean {
  return String(process.env[ENABLE_ENV] || "").trim() === "1";
}

export function buyVoidConfirmedCloseoutRuntimeRootDirV1():
  string {
  const configured = String(process.env[ROOT_ENV] || "").trim();
  if (configured) return path.resolve(configured);
  const dataDir = String(
    process.env.VOID_DATA_DIR ||
    process.env.DATA_DIR ||
    "data_a",
  ).trim();
  return path.resolve(
    process.cwd(),
    dataDir,
    "buy_void_v1",
    "runtime-integration-v1",
  );
}

export function buyVoidConfirmedCloseoutRequestDirV1():
  string {
  const configured = String(
    process.env[REQUEST_DIR_ENV] || "",
  ).trim();
  return configured
    ? path.resolve(configured)
    : path.resolve(
        process.cwd(),
        ".runtime",
        "public-buy-void-requests-v1",
      );
}

function poolId(): string {
  return String(
    process.env[POOL_ENV] ||
    "void-presale-mainnet0-v1",
  ).trim();
}

function loopbackOnly(req: any, res: any): boolean {
  const address = String(
    req?.socket?.remoteAddress ||
    req?.ip ||
    "",
  ).toLowerCase();
  const allowed = new Set([
    "127.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
  ]);
  if (allowed.has(address)) return true;
  res.status(403).json({
    marker:
      VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1,
    ok: false,
    error: "loopback_required",
  });
  return false;
}

export function buyVoidConfirmedCloseoutRuntimeStatusV1():
  Record<string, unknown> {
  return {
    marker:
      VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1,
    version: 1,
    ok: true,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    routes:
      VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_ROUTES_V1,
    operator_loopback_only: true,
    one_request_per_command: true,
    root_dir:
      buyVoidConfirmedCloseoutRuntimeRootDirV1(),
    root_dir_source:
      String(process.env[ROOT_ENV] || "").trim()
        ? ROOT_ENV
        : "server_default",
    request_dir:
      buyVoidConfirmedCloseoutRequestDirV1(),
    request_dir_source:
      String(process.env[REQUEST_DIR_ENV] || "").trim()
        ? REQUEST_DIR_ENV
        : "server_default",
    pool_id: poolId(),
    pool_id_source:
      String(process.env[POOL_ENV] || "").trim()
        ? POOL_ENV
        : "server_default",
    required_confirmation:
      VOID_BUY_VOID_CONFIRMED_CLOSEOUT_CONFIRMATION_V1,
    authority:
      VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_AUTHORITY_V1,
    closeout_authority:
      VOID_BUY_VOID_CONFIRMED_CLOSEOUT_AUTHORITY_V1,
  };
}

function responseStatus(
  decision: BuyVoidConfirmedCloseoutDecisionV1,
): number {
  if (!("reason" in decision)) return 200;
  if (decision.reason === "explicit_confirmation_required") {
    return 428;
  }
  if (
    decision.reason ===
      "confirmed_closeout_policy_disabled"
  ) {
    return 503;
  }
  if (
    decision.reason.includes("already") ||
    decision.reason.includes("conflict") ||
    decision.reason.includes("mismatch")
  ) {
    return 409;
  }
  return decision.mutation_performed ? 500 : 400;
}

export function handleBuyVoidConfirmedCloseoutRuntimeCommandV1(
  req: any,
  res: any,
): unknown {
  if (!loopbackOnly(req, res)) return null;

  if (!enabled()) {
    return res.status(503).json({
      marker:
        VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "confirmed_closeout_runtime_disabled",
      enabled: false,
      enable_env: ENABLE_ENV,
    });
  }

  const body = req?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "invalid_json_body",
    });
  }

  const allowed = new Set([
    "attempt_id",
    "apply",
    "confirmation",
  ]);
  const unexpected = Object.keys(body).filter(
    (key) => !allowed.has(key),
  );
  if (unexpected.length) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1,
      ok: false,
      error: "unexpected_input_key",
      unexpected_keys: unexpected.sort(),
    });
  }

  const decision = runBuyVoidConfirmedCloseoutV1({
    root_dir:
      buyVoidConfirmedCloseoutRuntimeRootDirV1(),
    attempt_id: (body as any).attempt_id,
    policy: {
      enabled: true,
      pool_id: poolId(),
      request_dir:
        buyVoidConfirmedCloseoutRequestDirV1(),
    },
    apply: (body as any).apply === true,
    confirmation: (body as any).confirmation,
  });

  return res.status(responseStatus(decision)).json(decision);
}

function mount(): void {
  const globalState: any = globalThis as any;
  const app: any =
    globalState.__void_http_app ||
    globalState.app;

  if (
    !app ||
    typeof app.get !== "function" ||
    typeof app.post !== "function"
  ) {
    const timer = setTimeout(mount, 250);
    (timer as any).unref?.();
    return;
  }
  if (globalState[GLOBAL_MARK]) return;
  globalState[GLOBAL_MARK] = true;

  app.get(
    VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_ROUTES_V1
      .status,
    (req: any, res: any) => {
      if (!loopbackOnly(req, res)) return;
      res.status(200).json(
        buyVoidConfirmedCloseoutRuntimeStatusV1(),
      );
    },
  );

  app.post(
    VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_ROUTES_V1
      .command,
    express.json({ limit: JSON_LIMIT }),
    (req: any, res: any) => {
      handleBuyVoidConfirmedCloseoutRuntimeCommandV1(
        req,
        res,
      );
    },
  );
}

mount();
