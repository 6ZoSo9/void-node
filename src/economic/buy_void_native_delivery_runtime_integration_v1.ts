import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import "./buy_void_native_delivery_runtime_dependencies_v1.js";
import {
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_UNIT_SCALE_V1,
  runBuyVoidNativeDeliverySignBroadcastV1,
  type BuyVoidNativeDeliveryBroadcasterV1,
  type BuyVoidNativeDeliverySignerV1,
  type BuyVoidNativeDeliverySignBroadcastDecisionV1,
  type BuyVoidNativeDeliverySignBroadcastPolicyV1,
  type BuyVoidNativeDeliveryTransactionPlanV1,
} from "./buy_void_native_delivery_sign_broadcast_adapter_v1.js";
import {
  createBuyVoidDeliverySubmissionGuardV1,
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1,
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1,
} from "./buy_void_delivery_submission_guard_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
  type BuyVoidPipelineCoordinatorDecisionV1,
} from "./buy_void_pipeline_coordinator_v1.js";

export const VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1 =
  "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1";

export const VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_ROUTES_V1 = {
  status: "/__void/operator/buy-void-delivery-runtime-v1/status",
  command: "/__void/operator/buy-void-delivery-runtime-v1/command",
} as const;

export const VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  server_controlled_root_dir: true,
  server_controlled_policy: true,
  prepared_attempt_loaded_from_server_journal: true,
  exact_confirmation_required: true,
  durable_submission_guard_required: true,
  signer_dependency_injected: true,
  broadcaster_dependency_injected: true,
  private_key_input: false,
  mnemonic_input: false,
  rpc_url_input: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  automatic_retry: false,
  receipt_wait: false,
  native_asset_only: true,
  erc20_transfer: false,
  token_contract_dependency: false,
  background_loop: false,
  service_restart: false,
  signing_when_fully_enabled: true,
  transaction_broadcast_when_fully_enabled: true,
  money_movement_when_fully_enabled: true,
} as const;

const GLOBAL_MARK =
  "__void_buy_void_native_delivery_runtime_integration_v1";
const GLOBAL_DEPENDENCIES =
  "__void_buy_void_native_delivery_runtime_dependencies_v1";
const ENABLE_ENV =
  "VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_ENABLED";
const ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR";
const JSON_LIMIT = "256kb";

const POLICY_ENVS = {
  chain_id: "VOID_BUY_VOID_NATIVE_DELIVERY_CHAIN_ID",
  asset_mode: "VOID_BUY_VOID_NATIVE_DELIVERY_ASSET_MODE",
  fulfillment_wallet_address:
    "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
  max_void_amount_units:
    "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_AMOUNT_UNITS",
  max_gas_limit:
    "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_GAS_LIMIT",
  max_fee_per_gas_wei:
    "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_FEE_PER_GAS_WEI",
  max_priority_fee_per_gas_wei:
    "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
} as const;

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
  "policy",
  "root_dir",
  "__proto__",
  "prototype",
  "constructor",
]);

type ExternalDependenciesV1 = {
  signer: BuyVoidNativeDeliverySignerV1;
  broadcaster: BuyVoidNativeDeliveryBroadcasterV1;
};

type PolicyStateV1 =
  | {
      configured: true;
      policy: BuyVoidNativeDeliverySignBroadcastPolicyV1;
      fingerprint_sha256: string;
    }
  | {
      configured: false;
      missing_envs: string[];
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

export function buyVoidNativeDeliveryRuntimeRootDirV1(): string {
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
      VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
    ok: false,
    error: "operator_loopback_only",
    remote_address: remote,
  });
  return false;
}

function normalizeKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function findForbiddenInputKey(
  value: unknown,
  depth = 0,
): string | null {
  if (!value || typeof value !== "object" || depth > 12) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenInputKey(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const normalized = normalizeKey(key);
    if (FORBIDDEN_INPUT_KEYS.has(normalized)) return key;
    const found = findForbiddenInputKey(nested, depth + 1);
    if (found) return found;
  }
  return null;
}

function policyState(): PolicyStateV1 {
  const values = Object.fromEntries(
    Object.entries(POLICY_ENVS).map(([key, env]) => [
      key,
      String(process.env[env] || "").trim(),
    ]),
  ) as Record<keyof typeof POLICY_ENVS, string>;

  const missing = Object.entries(POLICY_ENVS)
    .filter(([key]) => !values[key as keyof typeof POLICY_ENVS])
    .map(([, env]) => env);

  if (missing.length) {
    return {
      configured: false,
      missing_envs: missing.sort(),
    };
  }

  if (values.asset_mode !== "native_void") {
    return {
      configured: false,
      missing_envs: [POLICY_ENVS.asset_mode],
    };
  }

  const policy: BuyVoidNativeDeliverySignBroadcastPolicyV1 = {
    enabled: enabled(),
    asset_mode: "native_void",
    chain_id: values.chain_id,
    fulfillment_wallet_address:
      values.fulfillment_wallet_address,
    max_void_amount_units: values.max_void_amount_units,
    max_gas_limit: values.max_gas_limit,
    max_fee_per_gas_wei: values.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      values.max_priority_fee_per_gas_wei,
  };

  const fingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        asset_mode: policy.asset_mode,
        chain_id: policy.chain_id,
        fulfillment_wallet_address:
          String(
            policy.fulfillment_wallet_address,
          ).toLowerCase(),
        max_void_amount_units:
          policy.max_void_amount_units,
        max_gas_limit: policy.max_gas_limit,
        max_fee_per_gas_wei:
          policy.max_fee_per_gas_wei,
        max_priority_fee_per_gas_wei:
          policy.max_priority_fee_per_gas_wei,
      }),
    )
    .digest("hex");

  return {
    configured: true,
    policy,
    fingerprint_sha256: fingerprint,
  };
}

function externalDependencies(): ExternalDependenciesV1 | null {
  const value = (globalThis as any)[GLOBAL_DEPENDENCIES];
  if (
    !value ||
    typeof value.signer?.get_address !== "function" ||
    typeof value.signer?.sign_transaction !== "function" ||
    typeof value.broadcaster
      ?.broadcast_signed_transaction !== "function"
  ) {
    return null;
  }
  return {
    signer: value.signer,
    broadcaster: value.broadcaster,
  };
}

function effectiveAuthority(
  policy: PolicyStateV1,
  dependencies: ExternalDependenciesV1 | null,
): Record<string, boolean> {
  const active =
    enabled() &&
    policy.configured &&
    dependencies !== null;
  return {
    signing: active,
    transaction_broadcast: active,
    money_movement: active,
    rpc_call: false,
    private_key_input: false,
    raw_signed_transaction_input: false,
    automatic_retry: false,
  };
}

export function buyVoidNativeDeliveryRuntimeStatusV1():
  Record<string, unknown> {
  const policy = policyState();
  const dependencies = externalDependencies();

  return {
    marker:
      VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
    version: 1,
    ok: true,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    routes: VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_ROUTES_V1,
    root_dir: buyVoidNativeDeliveryRuntimeRootDirV1(),
    root_dir_source: String(process.env[ROOT_ENV] || "").trim()
      ? ROOT_ENV
      : "server_default",
    action: "sign_and_broadcast",
    asset_mode: "native_void",
    unit_scale: VOID_BUY_VOID_NATIVE_DELIVERY_UNIT_SCALE_V1,
    required_confirmation:
      "buyVoidNativeSignAndBroadcast",
    policy_configured: policy.configured,
    policy_missing_envs:
      "missing_envs" in policy ? policy.missing_envs : [],
    policy_fingerprint_sha256:
      policy.configured
        ? policy.fingerprint_sha256
        : null,
    signer_configured: dependencies !== null,
    broadcaster_configured: dependencies !== null,
    submission_guard_configured: true,
    adapter_marker:
      VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_ADAPTER_V1,
    submission_guard_marker:
      VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1,
    authority:
      VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_AUTHORITY_V1,
    adapter_authority:
      VOID_BUY_VOID_NATIVE_DELIVERY_SIGN_BROADCAST_AUTHORITY_V1,
    submission_guard_authority:
      VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_AUTHORITY_V1,
    effective_authority:
      effectiveAuthority(policy, dependencies),
  };
}

function responseStatus(
  decision: BuyVoidNativeDeliverySignBroadcastDecisionV1,
): number {
  if (!("reason" in decision)) return 200;
  if (decision.status === "broadcast_unknown") return 202;
  if (decision.reason === "explicit_confirmation_required") {
    return 428;
  }
  if (
    decision.reason.includes("already") ||
    decision.reason.includes("conflict")
  ) {
    return 409;
  }
  if (decision.status === "not_broadcast") return 409;
  return 400;
}

function pipelineRecordingCommand(
  rootDir: string,
  decision: BuyVoidNativeDeliverySignBroadcastDecisionV1,
): Record<string, unknown> | null {
  if (!("reason" in decision)) {
    if (decision.status !== "broadcast_accepted") return null;
    return {
      action: "record_broadcast_accepted",
      root_dir: rootDir,
      attempt_id: decision.attempt_id,
      transaction_hash: decision.transaction_hash,
      provider_submission_id:
        decision.provider_submission_id,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1
          .record_broadcast_accepted,
    };
  }

  if (decision.status === "not_broadcast") {
    return {
      action: "record_not_broadcast",
      root_dir: rootDir,
      attempt_id: decision.attempt_id,
      transaction_hash:
        decision.expected_transaction_hash,
      reason_code: decision.reason,
      provider_submission_id:
        decision.provider_submission_id,
      detail: decision.detail || {},
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1
          .record_not_broadcast,
    };
  }

  if (decision.status === "broadcast_unknown") {
    return {
      action: "record_broadcast_unknown",
      root_dir: rootDir,
      attempt_id: decision.attempt_id,
      transaction_hash:
        decision.expected_transaction_hash,
      reason_code: decision.reason,
      provider_submission_id:
        decision.provider_submission_id,
      apply: true,
      confirmation:
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1
          .record_broadcast_unknown,
    };
  }

  return null;
}

function recordingStatus(
  value: BuyVoidPipelineCoordinatorDecisionV1,
): number {
  if (!("reason" in value)) return 200;
  if (
    value.reason.includes("already") ||
    value.reason.includes("duplicate")
  ) {
    return 200;
  }
  return 500;
}

export async function handleBuyVoidNativeDeliveryRuntimeCommandV1(
  req: any,
  res: any,
): Promise<unknown> {
  if (!loopbackOnly(req, res)) return null;

  if (!enabled()) {
    return res.status(503).json({
      marker:
        VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error:
        "buy_void_native_delivery_runtime_integration_disabled",
      enable_env: ENABLE_ENV,
      enabled: false,
    });
  }

  const body = req?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "invalid_json_body",
    });
  }

  const forbiddenKey = findForbiddenInputKey(body);
  if (forbiddenKey) {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "forbidden_execution_material",
      forbidden_key: forbiddenKey,
    });
  }

  if (String((body as any).action || "") !==
      "sign_and_broadcast") {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "invalid_delivery_action",
      supported_actions: ["sign_and_broadcast"],
    });
  }

  const policy = policyState();
  if ("missing_envs" in policy) {
    return res.status(503).json({
      marker:
        VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "native_delivery_policy_not_configured",
      missing_envs: policy.missing_envs,
    });
  }

  const attemptId = String(
    (body as any).attempt_id || "",
  )
    .trim()
    .toLowerCase();
  const rootDir = buyVoidNativeDeliveryRuntimeRootDirV1();
  const attempt = readBuyVoidExecutionAttemptV1({
    root_dir: rootDir,
    attempt_id: attemptId,
  });
  if (!attempt) {
    return res.status(404).json({
      marker:
        VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "prepared_execution_attempt_not_found",
      attempt_id: attemptId,
    });
  }

  const plan = (body as any).plan as
    | BuyVoidNativeDeliveryTransactionPlanV1
    | undefined;
  if (!plan || typeof plan !== "object") {
    return res.status(400).json({
      marker:
        VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "native_delivery_transaction_plan_required",
    });
  }

  const apply = (body as any).apply === true;
  const external = externalDependencies();
  if (apply && !external) {
    return res.status(503).json({
      marker:
        VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
      ok: false,
      error: "native_delivery_sign_broadcast_dependencies_not_configured",
      signer_configured: false,
      broadcaster_configured: false,
      mutation_performed: false,
    });
  }

  const decision = await runBuyVoidNativeDeliverySignBroadcastV1({
    apply,
    confirmation: (body as any).confirmation,
    submission_idempotency_key:
      (body as any).submission_idempotency_key,
    attempt,
    policy: policy.policy,
    plan,
    ...(external
      ? {
          dependencies: {
            submission_guard:
              createBuyVoidDeliverySubmissionGuardV1(
                rootDir,
              ),
            signer: external.signer,
            broadcaster: external.broadcaster,
          },
        }
      : {}),
  });

  let pipelineRecording:
    | BuyVoidPipelineCoordinatorDecisionV1
    | null = null;
  const recordingCommand = apply
    ? pipelineRecordingCommand(rootDir, decision)
    : null;

  if (recordingCommand) {
    pipelineRecording = runBuyVoidPipelineCommandV1(
      recordingCommand as any,
    );
    const status = recordingStatus(pipelineRecording);
    if (status !== 200) {
      return res.status(status).json({
        marker:
          VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
        version: 1,
        ok: false,
        error: "native_delivery_outcome_recording_failed",
        decision,
        pipeline_recording: pipelineRecording,
        reconciliation_required:
          ("reason" in decision &&
            decision.status === "broadcast_unknown") ||
          (!("reason" in decision) &&
            decision.status === "broadcast_accepted"),
        automatic_retry_allowed: false,
        raw_signed_transaction_returned: false,
      });
    }
  }

  return res.status(responseStatus(decision)).json({
    marker:
      VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
    version: 1,
    ok: decision.ok,
    enabled: true,
    operator_loopback_only: true,
    root_dir_server_controlled: true,
    policy_server_controlled: true,
    prepared_attempt_loaded_from_server_journal: true,
    decision,
    pipeline_recording: pipelineRecording,
    raw_signed_transaction_returned: false,
    automatic_retry_allowed: false,
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
    VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_ROUTES_V1.status,
    (req: any, res: any) => {
      if (!loopbackOnly(req, res)) return;
      res.setHeader?.("Cache-Control", "no-store");
      res.json(buyVoidNativeDeliveryRuntimeStatusV1());
    },
  );

  app.post(
    VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_ROUTES_V1.command,
    jsonParser,
    (req: any, res: any) => {
      return handleBuyVoidNativeDeliveryRuntimeCommandV1(
        req,
        res,
      ).catch((error: any) => {
        if (!res.headersSent) {
          res.status(500).json({
            marker:
              VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1,
            ok: false,
            error: "native_delivery_runtime_internal_error",
            error_class: String(
              error?.name || "Error",
            ).slice(0, 80),
            automatic_retry_allowed: false,
          });
        }
      });
    },
  );

  console.log(
    `[${VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_V1}] mounted ` +
      `${VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_ROUTES_V1.status} ` +
      `${VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_ROUTES_V1.command}`,
  );
}

setTimeout(mount, 250).unref?.();
