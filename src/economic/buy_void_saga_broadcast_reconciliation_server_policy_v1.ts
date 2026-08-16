import crypto from "node:crypto";
import {
  readBuyVoidCanonicalPresaleServerPolicyV1,
  type BuyVoidCrashConsistentSagaServerPolicyV1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import type {
  BuyVoidNativeDeliveryReceiptReconcilerPolicyV1,
} from "./buy_void_native_delivery_receipt_reconciler_v1.js";

export const VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_V1 =
  "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_V1";

export const VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_AUTHORITY_V1 = {
  environment_configuration_only: true,
  caller_policy_input: false,
  parent_economic_policy_required: true,
  parent_economic_policy_fingerprint_bound: true,
  chain_id: "2050",
  loopback_receipt_rpc_only: true,
  read_only_receipt_rpc_only: true,
  one_fulfillment_wallet: true,
  secret_material: false,
  filesystem_read: false,
  filesystem_write: false,
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  money_movement: false,
} as const;

export const VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_ENVS_V1 = {
  receipt_rpc_url:
    "VOID_BUY_VOID_SAGA_BROADCAST_RECEIPT_RPC_URL",
  receipt_min_confirmations:
    "VOID_BUY_VOID_SAGA_BROADCAST_RECEIPT_MIN_CONFIRMATIONS",
} as const;

export type BuyVoidSagaBroadcastReconciliationServerPolicyV1 = {
  marker:
    typeof VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_V1;
  version: 1;
  economic_policy: BuyVoidCrashConsistentSagaServerPolicyV1;
  receipt_policy: BuyVoidNativeDeliveryReceiptReconcilerPolicyV1;
  receipt_rpc_url_fingerprint_sha256: string;
  combined_policy_fingerprint_sha256: string;
  policy_id: string;
  public_summary: {
    chain_id: "2050";
    receipt_min_confirmations: number;
    economic_policy_fingerprint_sha256: string;
    receipt_rpc_url_fingerprint_sha256: string;
    fulfillment_wallet_fingerprint_sha256: string;
  };
  authority:
    typeof VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_AUTHORITY_V1;
};

export type BuyVoidSagaBroadcastReconciliationServerPolicyDecisionV1 =
  | {
      ok: true;
      status: "configured";
      policy: BuyVoidSagaBroadcastReconciliationServerPolicyV1;
    }
  | {
      ok: false;
      status: "held";
      reason: string;
      missing_envs: string[];
      detail?: Record<string, unknown>;
      policy?: never;
    };

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

function held(
  reason: string,
  missingEnvs: string[] = [],
  detail?: Record<string, unknown>,
): Extract<BuyVoidSagaBroadcastReconciliationServerPolicyDecisionV1, { ok: false }> {
  return {
    ok: false,
    status: "held",
    reason,
    missing_envs: [...missingEnvs].sort(),
    ...(detail ? { detail } : {}),
  };
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function parseMinimum(value: unknown): number | null {
  const raw = text(value);
  if (!/^[0-9]+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 1_000
    ? parsed
    : null;
}

function normalizedLoopbackRpc(value: unknown): string {
  let url: URL;
  try {
    url = new URL(text(value));
  } catch {
    return "";
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "http:" ||
    url.username ||
    url.password ||
    url.hash ||
    !["127.0.0.1", "::1", "localhost"].includes(host)
  ) {
    return "";
  }
  return url.toString();
}

export function readBuyVoidSagaBroadcastReconciliationServerPolicyV1(
  env: NodeJS.ProcessEnv = process.env,
): BuyVoidSagaBroadcastReconciliationServerPolicyDecisionV1 {
  const economicDecision =
    readBuyVoidCanonicalPresaleServerPolicyV1(env);
  if (economicDecision.ok !== true) {
    return held(
      `parent_economic_policy_held:${economicDecision.reason}`,
      economicDecision.missing_envs,
      economicDecision.detail,
    );
  }

  const rpcName =
    VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_ENVS_V1
      .receipt_rpc_url;
  const minimumName =
    VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_ENVS_V1
      .receipt_min_confirmations;
  const missing = [rpcName, minimumName].filter(
    (name) => !text(env[name]),
  );
  if (missing.length) {
    return held("broadcast_reconciliation_policy_not_configured", missing);
  }

  const rpcUrl = normalizedLoopbackRpc(env[rpcName]);
  if (!rpcUrl) {
    return held("broadcast_reconciliation_rpc_must_be_loopback_http");
  }
  const minimum = parseMinimum(env[minimumName]);
  if (minimum === null) {
    return held("broadcast_reconciliation_min_confirmations_invalid");
  }

  const economicPolicy = economicDecision.policy;
  const wallets = economicPolicy.execution_policy
    .fulfillment_wallet_allowlist
    .map((value) => text(value).toLowerCase());
  if (wallets.length !== 1 || !/^0x[0-9a-f]{40}$/.test(wallets[0])) {
    return held("broadcast_reconciliation_wallet_policy_invalid");
  }

  const rpcFingerprint = sha256(rpcUrl);
  const combinedFingerprint = sha256(canonical({
    economic_policy_fingerprint_sha256:
      economicPolicy.fingerprints.combined_policy_sha256,
    chain_id: "2050",
    receipt_rpc_url_fingerprint_sha256: rpcFingerprint,
    receipt_min_confirmations: minimum,
    fulfillment_wallet_fingerprint_sha256: sha256(wallets[0]),
  }));
  const policyId =
    `void-buy-void-saga-broadcast-policy-v1-${combinedFingerprint}`;

  return {
    ok: true,
    status: "configured",
    policy: {
      marker:
        VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_V1,
      version: 1,
      economic_policy: economicPolicy,
      receipt_policy: {
        enabled: true,
        chain_id: "2050",
        rpc_url: rpcUrl,
        min_confirmations: minimum,
        fulfillment_wallet_allowlist: wallets,
      },
      receipt_rpc_url_fingerprint_sha256: rpcFingerprint,
      combined_policy_fingerprint_sha256: combinedFingerprint,
      policy_id: policyId,
      public_summary: {
        chain_id: "2050",
        receipt_min_confirmations: minimum,
        economic_policy_fingerprint_sha256:
          economicPolicy.fingerprints.combined_policy_sha256,
        receipt_rpc_url_fingerprint_sha256: rpcFingerprint,
        fulfillment_wallet_fingerprint_sha256: sha256(wallets[0]),
      },
      authority:
        VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_AUTHORITY_V1,
    },
  };
}
