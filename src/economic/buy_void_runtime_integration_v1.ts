import path from "node:path";
import express from "express";
import "./buy_void_native_delivery_runtime_integration_v1.js";
import "./buy_void_native_delivery_receipt_runtime_v1.js";
import "./buy_void_native_execution_runtime_v1.js";
import "./buy_void_confirmed_closeout_runtime_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  VOID_BUY_VOID_PIPELINE_COORDINATOR_AUTHORITY_V1,
  runBuyVoidPipelineCommandV1,
  type BuyVoidPipelineActionV1,
  type BuyVoidPipelineCommandV1,
  type BuyVoidPipelineCoordinatorDecisionV1,
} from "./buy_void_pipeline_coordinator_v1.js";
import {
  VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
  buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1,
  handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1,
} from "./buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.js";
import {
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
  buyVoidCrashConsistentSagaRuntimeStatusV1,
  handleBuyVoidCrashConsistentSagaRuntimeCommandV1,
} from "./buy_void_crash_consistent_saga_runtime_v1.js";
import {
  VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
  buyVoidSagaBroadcastReconciliationRuntimeStatusV1,
  handleBuyVoidSagaBroadcastReconciliationRuntimeCommandV1,
} from "./buy_void_saga_broadcast_reconciliation_runtime_v1.js";
import {
  VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
  buyVoidSagaExecutePreparedTransactionRuntimeStatusV1,
  handleBuyVoidSagaExecutePreparedTransactionRuntimeCommandV1,
} from "./buy_void_saga_execute_prepared_transaction_runtime_v1.js";
import {
  VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
  buyVoidSagaTerminalCloseoutRuntimeStatusV1,
  handleBuyVoidSagaTerminalCloseoutRuntimeCommandV1,
} from "./buy_void_saga_terminal_closeout_runtime_v1.js";

export const VOID_BUY_VOID_RUNTIME_INTEGRATION_V1 =
  "VOID_BUY_VOID_RUNTIME_INTEGRATION_V1";

export const VOID_BUY_VOID_RUNTIME_INTEGRATION_ROUTES_V1 = {
  status: "/__void/operator/buy-void-runtime-v1/status",
  command: "/__void/operator/buy-void-runtime-v1/command",
} as const;

export const VOID_BUY_VOID_RUNTIME_INTEGRATION_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  server_controlled_root_dir: true,
  dry_by_default: true,
  exact_per_action_confirmation_required: true,
  public_route: false,
  background_loop: false,
  rpc_call: false,
  private_broadcaster_inspection_ipc_possible: true,
  private_broadcaster_submission_ipc_possible_when_explicitly_enabled: true,
  delegated_transaction_broadcast_possible_when_execution_runtime_enabled: true,
  delegated_money_movement_possible_when_submission_occurs: true,
  delegated_inventory_consumption_possible_when_terminal_closeout_runtime_enabled: true,
  delegated_public_fulfilled_projection_possible_when_terminal_closeout_runtime_enabled: true,
  delegated_saga_closeout_possible_when_terminal_closeout_runtime_enabled: true,
  wallet_access: false,
  signing: false,
  raw_signed_transaction_input: false,
  transaction_broadcast: false,
  service_restart: false,
  money_movement: false,
} as const;

const GLOBAL_MARK = "__void_buy_void_runtime_integration_v1";
const ENABLE_ENV = "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED";
const ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR";
const JSON_LIMIT = "256kb";
const MAX_INPUT_NESTING_DEPTH = 12;
const INPUT_NESTING_DEPTH_SENTINEL = "__input_nesting_depth_exceeded__";

const FORBIDDEN_INPUT_KEYS = new Set([
  "private_key",
  "privatekey",
  "mnemonic",
  "seed",
  "seed_phrase",
  "raw_transaction",
  "raw_signed_transaction",
  "signed_transaction",
  "signedtransaction",
  "wallet",
  "signer",
  "signing_key",
  "rpc_url",
  "rpcurl",
  "broadcast_url",
  "broadcasturl",
  "__proto__",
  "prototype",
  "constructor",
]);

function enabled(): boolean {
  return String(process.env[ENABLE_ENV] || "") === "1";
}

function dataDir(): string {
  const raw = String(process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data");
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

export function buyVoidRuntimeRootDirV1(): string {
  const configured = String(process.env[ROOT_ENV] || "").trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? path.normalize(configured)
      : path.join(process.cwd(), configured);
  }
  return path.join(dataDir(), "buy_void_v1", "runtime-integration-v1");
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
    marker: VOID_BUY_VOID_RUNTIME_INTEGRATION_V1,
    ok: false,
    error: "operator_loopback_only",
    remote_address: remote,
  });
  return false;
}

function normalizedKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function findForbiddenInputKey(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object") return null;
  if (depth > MAX_INPUT_NESTING_DEPTH) {
    return INPUT_NESTING_DEPTH_SENTINEL;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenInputKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizedKey(key);
    if (FORBIDDEN_INPUT_KEYS.has(normalized)) return key;
    const found = findForbiddenInputKey(nested, depth + 1);
    if (found) return found;
  }

  return null;
}

function isPipelineAction(value: unknown): value is BuyVoidPipelineActionV1 {
  const action = String(value || "");
  return Object.prototype.hasOwnProperty.call(
    VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
    action,
  );
}

function responseStatus(decision: BuyVoidPipelineCoordinatorDecisionV1): number {
  if (!("reason" in decision)) return 200;

  if (decision.reason === "explicit_confirmation_required") return 428;
  if (decision.reason === "pipeline_command_failed") return 500;
  if (
    decision.reason.includes("already") ||
    decision.reason.includes("conflict") ||
    decision.reason.includes("replay") ||
    decision.reason.includes("regression") ||
    decision.reason.includes("frozen")
  ) {
    return 409;
  }
  return 400;
}

export function buyVoidRuntimeStatusV1(): Record<string, unknown> {
  return {
    marker: VOID_BUY_VOID_RUNTIME_INTEGRATION_V1,
    version: 1,
    ok: true,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    routes: VOID_BUY_VOID_RUNTIME_INTEGRATION_ROUTES_V1,
    root_dir: buyVoidRuntimeRootDirV1(),
    root_dir_source: String(process.env[ROOT_ENV] || "").trim()
      ? ROOT_ENV
      : "server_default",
    supported_actions: [
      ...Object.keys(VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1),
      VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
      VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
      VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
      VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
    ],
    required_confirmations: VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
    authority: VOID_BUY_VOID_RUNTIME_INTEGRATION_AUTHORITY_V1,
    coordinator_authority: VOID_BUY_VOID_PIPELINE_COORDINATOR_AUTHORITY_V1,
    bounded_auto_fulfillment_orchestrator:
      buyVoidBoundedAutoFulfillmentOrchestratorRuntimeStatusV1(),
    crash_consistent_saga_runtime:
      buyVoidCrashConsistentSagaRuntimeStatusV1(),
    saga_broadcast_reconciliation_runtime:
      buyVoidSagaBroadcastReconciliationRuntimeStatusV1(),
    saga_execute_prepared_transaction_runtime:
      buyVoidSagaExecutePreparedTransactionRuntimeStatusV1(),
    saga_terminal_closeout_runtime:
      buyVoidSagaTerminalCloseoutRuntimeStatusV1(),
  };
}

export function handleBuyVoidRuntimeCommandV1(
  req: any,
  res: any,
): unknown {
  if (!loopbackOnly(req, res)) return null;

  if (!enabled()) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "buy_void_runtime_integration_disabled",
      enable_env: ENABLE_ENV,
      enabled: false,
    });
  }

  const body = req?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "invalid_json_body",
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, "root_dir")) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "root_dir_is_server_controlled",
    });
  }

  const forbiddenKey = findForbiddenInputKey(body);
  if (forbiddenKey) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: forbiddenKey === INPUT_NESTING_DEPTH_SENTINEL
        ? "input_nesting_depth_exceeded"
        : "forbidden_execution_material",
      forbidden_key: forbiddenKey,
      max_input_nesting_depth: MAX_INPUT_NESTING_DEPTH,
    });
  }

  if (
    String((body as any).action || "") ===
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1
  ) {
    return handleBuyVoidCrashConsistentSagaRuntimeCommandV1(
      req,
      res,
      { root_dir: buyVoidRuntimeRootDirV1() },
    );
  }

  if (
    String((body as any).action || "") ===
    VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1
  ) {
    return handleBuyVoidSagaBroadcastReconciliationRuntimeCommandV1(
      req,
      res,
      {
        root_dir: buyVoidRuntimeRootDirV1(),
      },
    );
  }

  if (
    String((body as any).action || "") ===
    VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1
  ) {
    return handleBuyVoidSagaExecutePreparedTransactionRuntimeCommandV1(
      req,
      res,
      {
        root_dir: buyVoidRuntimeRootDirV1(),
      },
    );
  }

  if (
    String((body as any).action || "") ===
    VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1
  ) {
    return handleBuyVoidSagaTerminalCloseoutRuntimeCommandV1(
      req,
      res,
      {
        root_dir: buyVoidRuntimeRootDirV1(),
      },
    );
  }

  if (
    String((body as any).action || "") ===
    VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1
  ) {
    return handleBuyVoidBoundedAutoFulfillmentOrchestratorRuntimeCommandV1(
      req,
      res,
      {
        root_dir: buyVoidRuntimeRootDirV1(),
      },
    );
  }

  if (!isPipelineAction((body as any).action)) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "invalid_pipeline_action",
      supported_actions: [
        ...Object.keys(VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1),
        VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ACTION_V1,
        VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
        VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ACTION_V1,
        VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ACTION_V1,
        VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ACTION_V1,
      ],
    });
  }

  const command = {
    ...(body as Record<string, unknown>),
    root_dir: buyVoidRuntimeRootDirV1(),
  } as BuyVoidPipelineCommandV1;

  const decision = runBuyVoidPipelineCommandV1(command);
  return res.status(responseStatus(decision)).json({
    marker: VOID_BUY_VOID_RUNTIME_INTEGRATION_V1,
    version: 1,
    ok: decision.ok,
    enabled: true,
    operator_loopback_only: true,
    root_dir_server_controlled: true,
    action: command.action,
    decision,
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

  app.get(
    VOID_BUY_VOID_RUNTIME_INTEGRATION_ROUTES_V1.status,
    (req: any, res: any) => {
      if (!loopbackOnly(req, res)) return;
      res.setHeader?.("Cache-Control", "no-store");
      res.json(buyVoidRuntimeStatusV1());
    },
  );

  app.post(
    VOID_BUY_VOID_RUNTIME_INTEGRATION_ROUTES_V1.command,
    jsonParser,
    handleBuyVoidRuntimeCommandV1,
  );

  console.log(
    `[${VOID_BUY_VOID_RUNTIME_INTEGRATION_V1}] mounted ` +
      `${VOID_BUY_VOID_RUNTIME_INTEGRATION_ROUTES_V1.status} ` +
      `${VOID_BUY_VOID_RUNTIME_INTEGRATION_ROUTES_V1.command}`,
  );
}

setTimeout(mount, 250).unref?.();
