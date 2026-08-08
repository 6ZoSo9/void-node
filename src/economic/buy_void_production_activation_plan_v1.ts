import crypto from "node:crypto";
import path from "node:path";
import { getAddress } from "ethers";

import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
  type BuyVoidPreparedTransactionBroadcasterSubmissionActivationPolicyV1,
} from "./buy_void_prepared_transaction_broadcaster_submission_activation_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
} from "./buy_void_prepared_transaction_custodian_credential_activation_v1.js";
import type {
  BuyVoidPreparedTransactionCustodianCredentialCompositionPolicyV1,
} from "./buy_void_prepared_transaction_custodian_credential_composition_v1.js";
import {
  buyVoidPreparedTransactionCredentialSignerFingerprintV1,
} from "./buy_void_prepared_transaction_credential_signer_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1,
} from "./buy_void_prepared_transaction_broadcast_custody_v1.js";

export const VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1 =
  "VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1";

export const VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1 = {
  source_only_contract: true,
  pure_policy_validation_only: true,
  service_construction: false,
  service_start: false,
  credential_read: false,
  signing: false,
  rpc_call: false,
  transaction_submission: false,
  transaction_broadcast: false,
  inventory_mutation: false,
  public_fulfilled_projection: false,
  deployment: false,
  service_restart: false,
  money_movement: false,
  same_custody_store_required: true,
  distinct_private_service_sockets_required: true,
  broadcaster_signer_fingerprint_must_match_expected_wallet: true,
  chain_id_2050_required: true,
  loopback_http_rpc_policy_required: true,
  separate_custodian_activation_confirmation_required: true,
  separate_broadcaster_activation_confirmation_required: true,
  separate_real_broadcast_confirmation_required: true,
} as const;

const ADDRESS = /^0x[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const PLAN_DOMAIN = "void-buy-production-activation-plan-v1";

export type BuyVoidProductionActivationPlanPolicyV1 = {
  custodian: Readonly<
    BuyVoidPreparedTransactionCustodianCredentialCompositionPolicyV1
  >;
  broadcaster: Readonly<
    BuyVoidPreparedTransactionBroadcasterSubmissionActivationPolicyV1
  >;
};

export type BuyVoidProductionActivationPlanReadyV1 = {
  ok: true;
  status: "ready";
  marker: typeof VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1;
  version: 1;
  plan_id_sha256: string;
  expected_chain_id: "2050";
  expected_wallet_address: string;
  expected_signer_fingerprint_sha256: string;
  custody_store_dir: string;
  custodian_socket_path: string;
  broadcaster_socket_path: string;
  broadcaster_state_dir: string;
  credentials_directory: string;
  rpc_url: string;
  rpc_url_fingerprint_sha256: string;
  required_custodian_activation_confirmation:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1;
  required_broadcaster_activation_confirmation:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1;
  required_real_broadcast_confirmation:
    typeof VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1;
  production_activation_performed: false;
  credential_read_performed: false;
  signing_performed: false;
  rpc_call_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  authority: typeof VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1;
};

export type BuyVoidProductionActivationPlanHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1;
  version: 1;
  reason: string;
  production_activation_performed: false;
  credential_read_performed: false;
  signing_performed: false;
  rpc_call_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  authority: typeof VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1;
};

export type BuyVoidProductionActivationPlanDecisionV1 =
  | BuyVoidProductionActivationPlanReadyV1
  | BuyVoidProductionActivationPlanHeldV1;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function absoluteNonRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) return "";
  const resolved = path.resolve(raw);
  return resolved === path.parse(resolved).root ? "" : resolved;
}

function normalizeAddress(value: unknown): string {
  const raw = text(value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    const normalized = getAddress(raw).toLowerCase();
    return ADDRESS.test(normalized) ? normalized : "";
  } catch {
    return "";
  }
}

function parseChainId(value: unknown): bigint | null {
  try {
    if (typeof value === "bigint") return value >= 0n ? value : null;
    if (typeof value === "number") {
      return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
    }
    const raw = text(value);
    if (/^0x[0-9a-f]+$/i.test(raw) || /^(0|[1-9][0-9]*)$/.test(raw)) {
      return BigInt(raw);
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeLoopbackRpcUrl(value: unknown): string {
  let url: URL;
  try {
    url = new URL(text(value));
  } catch {
    return "";
  }

  const rawHost = url.hostname.toLowerCase();
  const host = rawHost.replace(/^\[/, "").replace(/\]$/, "");
  if (url.protocol !== "http:") return "";
  if (host !== "127.0.0.1" && host !== "::1") return "";
  if (url.username || url.password || url.search || url.hash) return "";

  const port = Number(url.port || 0);
  if (!Number.isSafeInteger(port) || port <= 0 || port > 65_535) return "";
  if (!url.pathname.startsWith("/") || url.pathname.length > 256) return "";

  const renderedHost = host === "::1" ? "[::1]" : host;
  return `http://${renderedHost}:${port}${url.pathname}`;
}

function held(reason: string): BuyVoidProductionActivationPlanHeldV1 {
  return {
    ok: false,
    status: "held",
    marker: VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1,
    version: 1,
    reason,
    production_activation_performed: false,
    credential_read_performed: false,
    signing_performed: false,
    rpc_call_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority: VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1,
  };
}

export function createBuyVoidProductionActivationPlanV1(
  policy: Readonly<BuyVoidProductionActivationPlanPolicyV1>,
): BuyVoidProductionActivationPlanDecisionV1 {
  const custodianSocket = absoluteNonRoot(policy?.custodian?.socket_path);
  const broadcasterSocket = absoluteNonRoot(policy?.broadcaster?.socket_path);
  const custodianStore = absoluteNonRoot(
    policy?.custodian?.custody_store_dir,
  );
  const broadcasterStore = absoluteNonRoot(
    policy?.broadcaster?.custody_store_dir,
  );
  const broadcasterState = absoluteNonRoot(
    policy?.broadcaster?.state_dir,
  );
  const credentialsDirectory = absoluteNonRoot(
    policy?.custodian?.credentials_directory,
  );
  const wallet = normalizeAddress(policy?.custodian?.expected_wallet_address);

  if (
    !custodianSocket ||
    !broadcasterSocket ||
    !custodianStore ||
    !broadcasterStore ||
    !broadcasterState ||
    !credentialsDirectory ||
    !wallet
  ) {
    return held("production_activation_plan_policy_invalid");
  }

  if (custodianStore !== broadcasterStore) {
    return held("production_activation_plan_custody_store_mismatch");
  }

  const distinctPaths = new Set([
    custodianSocket,
    broadcasterSocket,
    custodianStore,
    broadcasterState,
    credentialsDirectory,
  ]);
  if (distinctPaths.size !== 5) {
    return held("production_activation_plan_paths_must_be_distinct");
  }

  let expectedSignerFingerprint: string;
  try {
    expectedSignerFingerprint =
      buyVoidPreparedTransactionCredentialSignerFingerprintV1(wallet);
  } catch {
    return held("production_activation_plan_signer_fingerprint_derivation_failed");
  }

  const broadcasterFingerprint = text(
    policy?.broadcaster?.expected_signer_fingerprint_sha256,
  ).toLowerCase();
  if (
    !SHA256.test(broadcasterFingerprint) ||
    broadcasterFingerprint !== expectedSignerFingerprint
  ) {
    return held("production_activation_plan_signer_fingerprint_mismatch");
  }

  if (parseChainId(policy?.broadcaster?.rpc?.expected_chain_id) !== 2050n) {
    return held("production_activation_plan_chain_id_must_be_2050");
  }

  const rpcUrl = normalizeLoopbackRpcUrl(policy?.broadcaster?.rpc?.rpc_url);
  if (!rpcUrl) {
    return held("production_activation_plan_rpc_policy_invalid");
  }

  const rpcFingerprint = sha256(rpcUrl);
  const planId = sha256(
    [
      PLAN_DOMAIN,
      `chain_id=2050`,
      `wallet=${wallet}`,
      `signer_fingerprint=${expectedSignerFingerprint}`,
      `custody_store=${custodianStore}`,
      `custodian_socket=${custodianSocket}`,
      `broadcaster_socket=${broadcasterSocket}`,
      `broadcaster_state=${broadcasterState}`,
      `credentials_directory=${credentialsDirectory}`,
      `rpc_url=${rpcUrl}`,
    ].join("\n"),
  );

  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_V1,
    version: 1,
    plan_id_sha256: planId,
    expected_chain_id: "2050",
    expected_wallet_address: wallet,
    expected_signer_fingerprint_sha256: expectedSignerFingerprint,
    custody_store_dir: custodianStore,
    custodian_socket_path: custodianSocket,
    broadcaster_socket_path: broadcasterSocket,
    broadcaster_state_dir: broadcasterState,
    credentials_directory: credentialsDirectory,
    rpc_url: rpcUrl,
    rpc_url_fingerprint_sha256: rpcFingerprint,
    required_custodian_activation_confirmation:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
    required_broadcaster_activation_confirmation:
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
    required_real_broadcast_confirmation:
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCAST_CONFIRMATION_V1,
    production_activation_performed: false,
    credential_read_performed: false,
    signing_performed: false,
    rpc_call_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority: VOID_BUY_VOID_PRODUCTION_ACTIVATION_PLAN_AUTHORITY_V1,
  };
}
