import {
  probeBuyVoidNativeChain2050BroadcasterV1,
} from "./buy_void_native_chain2050_broadcaster_v1.js";
import {
  createBuyVoidNativeFulfillmentWalletCredentialSignerV1,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
} from "./buy_void_native_fulfillment_wallet_credential_signer_v1.js";

export const VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_V1 =
  "VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_V1";

export const VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_CONFIRMATION_V1 =
  "probeBuyVoidNativeDeliveryDependenciesReadOnlyV1";

export const VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_AUTHORITY_V1 = {
  disabled_by_default: true,
  explicit_probe_required: true,
  exact_confirmation_required: true,
  systemd_credential_read: true,
  wallet_address_derivation: true,
  wallet_address_output: false,
  private_key_output: false,
  signer_output: false,
  transaction_signing: false,
  loopback_chain_identity_read: true,
  rpc_methods: ["eth_chainId"] as const,
  broadcaster_output: false,
  transaction_broadcast: false,
  dependency_assignment: false,
  runtime_enablement: false,
  service_restart: false,
  filesystem_write: false,
  automatic_retry: false,
  money_movement: false,
} as const;

export type BuyVoidNativeDeliveryDependencyReadinessInputV1 = {
  probe: boolean;
  confirmation: string;
  credentials_directory: string;
  expected_wallet_address: string;
  rpc_url: string;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidNativeDeliveryDependencyReadinessReadyV1 = {
  ok: true;
  marker: typeof VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_V1;
  version: 1;
  status: "ready";
  credential_id:
    typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1;
  chain_id: "2050";
  wallet_address_fingerprint_sha256: string;
  rpc_url_fingerprint_sha256: string;
  credential_read_performed: true;
  chain_identity_probe_performed: true;
  signing_performed: false;
  transaction_broadcast_performed: false;
  dependency_assignment_performed: false;
  runtime_enablement_performed: false;
  money_movement: false;
  authority:
    typeof VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_AUTHORITY_V1;
};

export type BuyVoidNativeDeliveryDependencyReadinessHeldV1 = {
  ok: false;
  marker: typeof VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_V1;
  version: 1;
  status: "disabled" | "held";
  reason: string;
  credential_id:
    typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1;
  wallet_address_fingerprint_sha256: string | null;
  rpc_url_fingerprint_sha256: string | null;
  credential_read_performed: boolean;
  chain_identity_probe_performed: boolean;
  signing_performed: false;
  transaction_broadcast_performed: false;
  dependency_assignment_performed: false;
  runtime_enablement_performed: false;
  money_movement: false;
  authority:
    typeof VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_AUTHORITY_V1;
  detail?: Record<string, unknown>;
};

export type BuyVoidNativeDeliveryDependencyReadinessDecisionV1 =
  | BuyVoidNativeDeliveryDependencyReadinessReadyV1
  | BuyVoidNativeDeliveryDependencyReadinessHeldV1;

const SAFE_REASON = /^[a-z0-9_]{1,160}$/;

function safeReason(value: unknown): string {
  const reason = String(value || "").trim();
  return SAFE_REASON.test(reason) ? reason : "dependency_readiness_held";
}

function safeDetail(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const source = value as Record<string, unknown>;
  const allowed = [
    "error_class",
    "mode",
    "size_bytes",
    "expected_wallet_address_fingerprint_sha256",
    "error_code",
    "http_status",
    "observed_chain_id",
  ];
  const result: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key];
    }
  }
  return Object.keys(result).length ? result : undefined;
}

function held(
  reason: string,
  options: {
    status?: "disabled" | "held";
    wallet_address_fingerprint_sha256?: string | null;
    rpc_url_fingerprint_sha256?: string | null;
    credential_read_performed?: boolean;
    chain_identity_probe_performed?: boolean;
    detail?: Record<string, unknown>;
  } = {},
): BuyVoidNativeDeliveryDependencyReadinessHeldV1 {
  return {
    ok: false,
    marker: VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_V1,
    version: 1,
    status: options.status || "held",
    reason: safeReason(reason),
    credential_id:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
    wallet_address_fingerprint_sha256:
      options.wallet_address_fingerprint_sha256 || null,
    rpc_url_fingerprint_sha256:
      options.rpc_url_fingerprint_sha256 || null,
    credential_read_performed:
      options.credential_read_performed === true,
    chain_identity_probe_performed:
      options.chain_identity_probe_performed === true,
    signing_performed: false,
    transaction_broadcast_performed: false,
    dependency_assignment_performed: false,
    runtime_enablement_performed: false,
    money_movement: false,
    authority:
      VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_AUTHORITY_V1,
    ...(options.detail ? { detail: options.detail } : {}),
  };
}

export async function probeBuyVoidNativeDeliveryDependencyReadinessV1(
  input: BuyVoidNativeDeliveryDependencyReadinessInputV1,
): Promise<BuyVoidNativeDeliveryDependencyReadinessDecisionV1> {
  if (input?.probe !== true) {
    return held("readiness_probe_not_requested", { status: "disabled" });
  }

  if (
    String(input.confirmation || "") !==
    VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_CONFIRMATION_V1
  ) {
    return held("readiness_probe_confirmation_mismatch");
  }

  const signerDecision =
    createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
      credentials_directory: input.credentials_directory,
      expected_wallet_address: input.expected_wallet_address,
    });
  if ("reason" in signerDecision) {
    const detail = safeDetail(signerDecision.detail);
    return held(`signer_${safeReason(signerDecision.reason)}`, {
      wallet_address_fingerprint_sha256:
        signerDecision.wallet_address_fingerprint_sha256,
      credential_read_performed: true,
      ...(detail ? { detail } : {}),
    });
  }

  const rpcDecision = await probeBuyVoidNativeChain2050BroadcasterV1({
    rpc_url: input.rpc_url,
    expected_chain_id: 2050,
    request_timeout_ms: input.request_timeout_ms,
    max_response_bytes: input.max_response_bytes,
  });
  if ("reason" in rpcDecision) {
    const detail = safeDetail(rpcDecision.detail);
    return held(`broadcaster_${safeReason(rpcDecision.reason)}`, {
      wallet_address_fingerprint_sha256:
        signerDecision.wallet_address_fingerprint_sha256,
      rpc_url_fingerprint_sha256:
        rpcDecision.rpc_url_fingerprint_sha256,
      credential_read_performed: true,
      chain_identity_probe_performed:
        rpcDecision.rpc_url_fingerprint_sha256 !== null,
      ...(detail ? { detail } : {}),
    });
  }

  return {
    ok: true,
    marker: VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_V1,
    version: 1,
    status: "ready",
    credential_id:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
    chain_id: "2050",
    wallet_address_fingerprint_sha256:
      signerDecision.wallet_address_fingerprint_sha256,
    rpc_url_fingerprint_sha256:
      rpcDecision.rpc_url_fingerprint_sha256,
    credential_read_performed: true,
    chain_identity_probe_performed: true,
    signing_performed: false,
    transaction_broadcast_performed: false,
    dependency_assignment_performed: false,
    runtime_enablement_performed: false,
    money_movement: false,
    authority:
      VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_AUTHORITY_V1,
  };
}
