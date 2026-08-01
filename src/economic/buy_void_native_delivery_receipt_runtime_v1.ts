import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import {
  listBuyVoidFulfillmentJournalClaimsV1,
  type BuyVoidFulfillmentJournalIntentV1,
} from "./buy_void_fulfillment_journal_v1.js";
import {
  readBuyVoidExecutionAttemptV1,
} from "./buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1,
  VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
  runBuyVoidNativeDeliveryReceiptReconcilerV1,
  type BuyVoidNativeDeliveryReceiptReconcilerDecisionV1,
  type BuyVoidNativeDeliveryReceiptReconcilerPolicyV1,
  type BuyVoidNativeDeliveryReceiptRpcTransportV1,
} from "./buy_void_native_delivery_receipt_reconciler_v1.js";

export const VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1 =
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1";

export const VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_ROUTES_V1 = {
  status:
    "/__void/operator/buy-void-native-delivery-receipt-v1/status",
  command:
    "/__void/operator/buy-void-native-delivery-receipt-v1/command",
} as const;

export const VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_AUTHORITY_V1 = {
  operator_loopback_only: true,
  disabled_by_default: true,
  dry_run_allowed_while_disabled: true,
  apply_allowed_while_disabled: false,
  one_attempt_per_command: true,
  attempt_id_only_selector: true,
  server_controlled_root_dir: true,
  server_controlled_rpc_url: true,
  server_controlled_policy: true,
  journal_reconstruction_required: true,
  exact_confirmation_required_before_apply_io: true,
  read_only_rpc_methods: [
    "eth_chainId",
    "eth_getTransactionReceipt",
    "eth_blockNumber",
  ],
  wallet_access: false,
  credential_access: false,
  secret_access: false,
  signing: false,
  transaction_broadcast: false,
  raw_signed_transaction_input: false,
  raw_signed_transaction_persistence: false,
  raw_signed_transaction_output: false,
  inventory_decrement: false,
  public_request_journal_write: false,
  background_loop: false,
  automatic_retry: false,
  startup_execution: false,
  service_restart: false,
  money_movement: false,
} as const;

const ENABLE_ENV =
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_ENABLED";
const ROOT_ENV = "VOID_BUY_VOID_RUNTIME_DIR";
const RPC_ENV = "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL";
const WALLET_ENV =
  "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS";
const MIN_CONFIRMATIONS_ENV =
  "VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_MIN_CONFIRMATIONS";
const GLOBAL_MARK =
  "__void_buy_void_native_delivery_receipt_runtime_v1_mounted";
const JSON_LIMIT = "8kb";
const HASH = /^[0-9a-f]{64}$/u;
const ADDRESS = /^0x[0-9a-f]{40}$/iu;

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
  "root_dir",
  "policy",
  "transport",
  "intent",
  "__proto__",
  "prototype",
  "constructor",
]);

export type BuyVoidNativeDeliveryReceiptRuntimePolicyV1 = {
  enabled: boolean;
  root_dir: string;
  receipt_policy: BuyVoidNativeDeliveryReceiptReconcilerPolicyV1;
};

export type BuyVoidNativeDeliveryReceiptRuntimeCommandV1 = {
  attempt_id: string;
  apply?: boolean;
  confirmation?: unknown;
};

export type BuyVoidNativeDeliveryReceiptRuntimeDecisionV1 =
  | {
      ok: true;
      marker: typeof VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1;
      version: 1;
      status:
        | "dry_run_confirmed"
        | "dry_run_reverted"
        | "confirmed"
        | "reverted"
        | "already_confirmed";
      attempt_id: string;
      reconstructed_from_server_journals: true;
      reconciliation: BuyVoidNativeDeliveryReceiptReconcilerDecisionV1 & {
        ok: true;
      };
      mutation_performed: boolean;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
    }
  | {
      ok: false;
      marker: typeof VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1;
      version: 1;
      status: "held";
      stage:
        | "runtime_policy"
        | "journal_reconstruction"
        | "receipt_reconciliation";
      reason: string;
      attempt_id: string | null;
      reconciliation?: BuyVoidNativeDeliveryReceiptReconcilerDecisionV1;
      mutation_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      money_movement_performed: false;
      detail?: Record<string, unknown>;
    };

type PolicyStateV1 =
  | {
      configured: true;
      policy: BuyVoidNativeDeliveryReceiptRuntimePolicyV1;
      policy_fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
    }
  | {
      configured: false;
      missing_policy_envs: string[];
      invalid_policy_envs: string[];
    };

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function enabled(): boolean {
  return String(process.env[ENABLE_ENV] || "").trim() === "1";
}

export function buyVoidNativeDeliveryReceiptRuntimeRootDirV1(): string {
  const configured = String(process.env[ROOT_ENV] || "").trim();
  if (configured) return path.resolve(configured);
  const dataDir = String(
    process.env.VOID_DATA_DIR || process.env.DATA_DIR || "data_a",
  ).trim();
  return path.resolve(
    process.cwd(),
    dataDir,
    "buy_void_v1",
    "runtime-integration-v1",
  );
}

function loopbackRpcUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      ["127.0.0.1", "::1", "localhost"].includes(
        url.hostname.toLowerCase(),
      )
    );
  } catch {
    return false;
  }
}

function policyState(): PolicyStateV1 {
  const rpcUrl = String(process.env[RPC_ENV] || "").trim();
  const wallet = String(process.env[WALLET_ENV] || "")
    .trim()
    .toLowerCase();
  const minConfirmations = String(
    process.env[MIN_CONFIRMATIONS_ENV] || "",
  ).trim();
  const values = new Map([
    [RPC_ENV, rpcUrl],
    [WALLET_ENV, wallet],
    [MIN_CONFIRMATIONS_ENV, minConfirmations],
  ]);
  const missing = [...values.entries()]
    .filter(([, value]) => !value)
    .map(([key]) => key)
    .sort();
  const invalid: string[] = [];
  if (rpcUrl && !loopbackRpcUrl(rpcUrl)) invalid.push(RPC_ENV);
  if (wallet && !ADDRESS.test(wallet)) invalid.push(WALLET_ENV);
  if (minConfirmations) {
    const parsed = Number(minConfirmations);
    if (
      !/^[1-9][0-9]*$/u.test(minConfirmations) ||
      !Number.isSafeInteger(parsed) ||
      parsed > 1_000
    ) {
      invalid.push(MIN_CONFIRMATIONS_ENV);
    }
  }
  if (missing.length || invalid.length) {
    return {
      configured: false,
      missing_policy_envs: missing,
      invalid_policy_envs: invalid.sort(),
    };
  }

  const rootDir = buyVoidNativeDeliveryReceiptRuntimeRootDirV1();
  const normalizedRpcUrl = new URL(rpcUrl).toString();
  const rpcFingerprint = sha256Hex(normalizedRpcUrl);
  const policy: BuyVoidNativeDeliveryReceiptRuntimePolicyV1 = {
    enabled: enabled(),
    root_dir: rootDir,
    receipt_policy: {
      enabled: true,
      chain_id: "2050",
      rpc_url: normalizedRpcUrl,
      min_confirmations: minConfirmations,
      fulfillment_wallet_allowlist: [wallet],
    },
  };
  return {
    configured: true,
    policy,
    rpc_url_fingerprint_sha256: rpcFingerprint,
    policy_fingerprint_sha256: sha256Hex(
      [
        `root_dir=${rootDir}`,
        "chain_id=2050",
        `rpc_url_fingerprint_sha256=${rpcFingerprint}`,
        `min_confirmations=${minConfirmations}`,
        `fulfillment_wallet=${wallet}`,
      ].join("\n"),
    ),
  };
}

function normalizeKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/gu, "");
}

function findForbiddenInputKey(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object" || depth > 12) return null;
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
    if (FORBIDDEN_INPUT_KEYS.has(normalizeKey(key))) return key;
    const found = findForbiddenInputKey(nested, depth + 1);
    if (found) return found;
  }
  return null;
}

function loopbackOnly(req: any, res: any): boolean {
  const address = String(
    req?.socket?.remoteAddress || req?.ip || "",
  ).toLowerCase();
  if (
    ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address)
  ) {
    return true;
  }
  res.status(403).json({
    marker: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1,
    ok: false,
    error: "loopback_required",
  });
  return false;
}

function held(
  stage: "runtime_policy" | "journal_reconstruction" | "receipt_reconciliation",
  options: {
    reason: string;
    attempt_id?: string | null;
    reconciliation?: BuyVoidNativeDeliveryReceiptReconcilerDecisionV1;
    detail?: Record<string, unknown>;
  },
): BuyVoidNativeDeliveryReceiptRuntimeDecisionV1 {
  return {
    ok: false,
    marker: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1,
    version: 1,
    status: "held",
    stage,
    reason: options.reason,
    attempt_id: options.attempt_id ?? null,
    ...(options.reconciliation
      ? { reconciliation: options.reconciliation }
      : {}),
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

function reconstructIntent(
  rootDir: string,
  attemptId: string,
):
  | { intent: BuyVoidFulfillmentJournalIntentV1 }
  | { reason: string; detail?: Record<string, unknown> } {
  let attempt;
  try {
    attempt = readBuyVoidExecutionAttemptV1({
      root_dir: rootDir,
      attempt_id: attemptId,
    });
  } catch (error) {
    return {
      reason: "execution_attempt_read_failed",
      detail: {
        error_class: String((error as Error)?.name || "Error").slice(0, 80),
      },
    };
  }
  if (!attempt) return { reason: "execution_attempt_not_found" };

  let claims: BuyVoidFulfillmentJournalIntentV1[];
  try {
    claims = listBuyVoidFulfillmentJournalClaimsV1(rootDir);
  } catch (error) {
    return {
      reason: "fulfillment_claim_read_failed",
      detail: {
        error_class: String((error as Error)?.name || "Error").slice(0, 80),
      },
    };
  }
  const matches = claims.filter(
    (intent) =>
      intent.claim.canonical_payment_identity ===
        attempt.reservation.canonical_payment_identity &&
      intent.claim.request_id === attempt.reservation.request_id &&
      intent.claim.instruction_id === attempt.reservation.instruction_id,
  );
  if (matches.length !== 1) {
    return {
      reason: "fulfillment_claim_match_count_invalid",
      detail: { match_count: matches.length },
    };
  }
  return { intent: matches[0] };
}

export async function runBuyVoidNativeDeliveryReceiptRuntimeCommandV1(
  input: {
    runtime_policy: BuyVoidNativeDeliveryReceiptRuntimePolicyV1;
    command: BuyVoidNativeDeliveryReceiptRuntimeCommandV1;
    transport?: BuyVoidNativeDeliveryReceiptRpcTransportV1;
    now_ms?: number;
  },
): Promise<BuyVoidNativeDeliveryReceiptRuntimeDecisionV1> {
  const attemptId = String(input?.command?.attempt_id || "").trim();
  if (!HASH.test(attemptId)) {
    return held("runtime_policy", {
      reason: "invalid_receipt_reconciliation_selector",
      attempt_id: attemptId || null,
    });
  }
  const apply = input.command.apply === true;
  if (apply && input.runtime_policy.enabled !== true) {
    return held("runtime_policy", {
      reason: "native_delivery_receipt_runtime_disabled",
      attempt_id: attemptId,
    });
  }
  if (
    apply &&
    String(input.command.confirmation || "") !==
      VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1
  ) {
    return held("runtime_policy", {
      reason: "explicit_confirmation_required",
      attempt_id: attemptId,
      detail: {
        required_confirmation:
          VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
      },
    });
  }

  const reconstructed = reconstructIntent(
    input.runtime_policy.root_dir,
    attemptId,
  );
  if ("reason" in reconstructed) {
    return held("journal_reconstruction", {
      reason: reconstructed.reason,
      attempt_id: attemptId,
      detail: reconstructed.detail,
    });
  }

  const reconciliation =
    await runBuyVoidNativeDeliveryReceiptReconcilerV1({
      root_dir: input.runtime_policy.root_dir,
      attempt_id: attemptId,
      intent: reconstructed.intent,
      policy: {
        ...input.runtime_policy.receipt_policy,
        enabled: true,
      },
      apply,
      confirmation: input.command.confirmation,
      transport: input.transport,
      now_ms: input.now_ms,
    });
  if ("reason" in reconciliation) {
    return held("receipt_reconciliation", {
      reason: reconciliation.reason,
      attempt_id: attemptId,
      reconciliation,
      detail: reconciliation.detail,
    });
  }
  return {
    ok: true,
    marker: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1,
    version: 1,
    status: reconciliation.status,
    attempt_id: attemptId,
    reconstructed_from_server_journals: true,
    reconciliation,
    mutation_performed: reconciliation.mutation_performed,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

export function buyVoidNativeDeliveryReceiptRuntimeStatusV1():
  Record<string, unknown> {
  const policy = policyState();
  return {
    marker: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1,
    version: 1,
    ok: true,
    enabled: enabled(),
    enable_env: ENABLE_ENV,
    routes: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_ROUTES_V1,
    operator_loopback_only: true,
    one_attempt_per_command: true,
    dry_run_allowed_while_disabled: true,
    root_dir: buyVoidNativeDeliveryReceiptRuntimeRootDirV1(),
    root_dir_source: String(process.env[ROOT_ENV] || "").trim()
      ? ROOT_ENV
      : "server_default",
    policy_configured: policy.configured,
    ...("policy" in policy
      ? {
          policy_fingerprint_sha256:
            policy.policy_fingerprint_sha256,
          rpc_url_fingerprint_sha256:
            policy.rpc_url_fingerprint_sha256,
        }
      : {
          missing_policy_envs: policy.missing_policy_envs,
          invalid_policy_envs: policy.invalid_policy_envs,
        }),
    apply_ready: enabled() && policy.configured,
    required_confirmation:
      VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_CONFIRMATION_V1,
    authority:
      VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_AUTHORITY_V1,
    reconciler_authority:
      VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RECONCILER_AUTHORITY_V1,
  };
}

function responseStatus(
  decision: BuyVoidNativeDeliveryReceiptRuntimeDecisionV1,
): number {
  if (!("reason" in decision)) return 200;
  if (decision.reason === "explicit_confirmation_required") return 428;
  if (
    decision.reason === "native_delivery_receipt_runtime_disabled" ||
    decision.reason === "native_delivery_receipt_policy_not_configured"
  ) {
    return 503;
  }
  if (
    decision.reason === "native_delivery_receipt_pending" ||
    decision.reason === "insufficient_native_delivery_confirmations"
  ) {
    return 202;
  }
  if (decision.reason === "native_delivery_receipt_rpc_failed") return 502;
  if (
    decision.reason.includes("already") ||
    decision.reason.includes("conflict") ||
    decision.reason.includes("mismatch") ||
    decision.reason.includes("binding")
  ) {
    return 409;
  }
  return 400;
}

export async function handleBuyVoidNativeDeliveryReceiptRuntimeCommandV1(
  req: any,
  res: any,
): Promise<unknown> {
  if (!loopbackOnly(req, res)) return null;
  const body = req?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1,
      ok: false,
      error: "invalid_json_body",
    });
  }
  const forbiddenKey = findForbiddenInputKey(body);
  if (forbiddenKey) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1,
      ok: false,
      error: "forbidden_execution_material",
      forbidden_key: forbiddenKey,
    });
  }
  const allowed = new Set(["attempt_id", "apply", "confirmation"]);
  const unexpected = Object.keys(body).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    return res.status(400).json({
      marker: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1,
      ok: false,
      error: "unexpected_input_key",
      unexpected_keys: unexpected.sort(),
    });
  }

  const policy = policyState();
  if ("missing_policy_envs" in policy) {
    return res.status(503).json({
      marker: VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_V1,
      ok: false,
      error: "native_delivery_receipt_policy_not_configured",
      missing_policy_envs: policy.missing_policy_envs,
      invalid_policy_envs: policy.invalid_policy_envs,
    });
  }
  const decision =
    await runBuyVoidNativeDeliveryReceiptRuntimeCommandV1({
      runtime_policy: policy.policy,
      command: {
        attempt_id: (body as any).attempt_id,
        apply: (body as any).apply === true,
        confirmation: (body as any).confirmation,
      },
    });
  return res.status(responseStatus(decision)).json(decision);
}

function mount(): void {
  const globalState: any = globalThis as any;
  const app: any = globalState.__void_http_app || globalState.app;
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") {
    const timer = setTimeout(mount, 250);
    (timer as any).unref?.();
    return;
  }
  if (globalState[GLOBAL_MARK]) return;
  globalState[GLOBAL_MARK] = true;

  app.get(
    VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_ROUTES_V1.status,
    (req: any, res: any) => {
      if (!loopbackOnly(req, res)) return;
      res.status(200).json(
        buyVoidNativeDeliveryReceiptRuntimeStatusV1(),
      );
    },
  );
  app.post(
    VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_ROUTES_V1.command,
    express.json({ limit: JSON_LIMIT }),
    (req: any, res: any) => {
      void handleBuyVoidNativeDeliveryReceiptRuntimeCommandV1(req, res);
    },
  );
}

mount();
