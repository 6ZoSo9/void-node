import crypto from "node:crypto";
import path from "node:path";
import {
  Interface,
  Transaction,
  getAddress,
} from "ethers";
import {
  createBuyVoidDeliverySubmissionGuardV1,
  VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1,
} from "./buy_void_delivery_submission_guard_v1.js";
import {
  createBuyVoidNativeFulfillmentWalletCredentialSignerV1,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1,
} from "./buy_void_native_fulfillment_wallet_credential_signer_v1.js";
import {
  createBuyVoidErc20Chain2050BroadcasterV1,
  VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1,
  type BuyVoidErc20Chain2050BroadcasterPolicyV1,
} from "./buy_void_erc20_chain2050_broadcaster_v1.js";
import type {
  BuyVoidDeliverySignBroadcastDependenciesV1,
  BuyVoidDeliverySignerV1,
  BuyVoidDeliveryUnsignedTransactionV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1 =
  "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1";

export const VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1 = {
  source_only_contract: true,
  canonical_chain_id: "2050",
  canonical_asset: "void_token_erc20",
  parent_mounted: false,
  process_environment_read: false,
  startup_side_effect: false,
  composition_time_filesystem_read: false,
  composition_time_filesystem_write: false,
  composition_time_credential_read: false,
  composition_time_rpc_call: false,
  composition_time_signing: false,
  composition_time_transaction_broadcast: false,
  composition_time_money_movement: false,
  durable_submission_guard_reused: true,
  fixed_systemd_credential_id_reused_when_signing: true,
  credential_read_deferred_until_sign_transaction: true,
  exact_erc20_unsigned_transaction_revalidated_before_credential_read: true,
  exact_erc20_signed_transaction_revalidated_after_signing: true,
  total_deadline_chain2050_broadcaster_reused: true,
  automatic_retry: false,
  runtime_route_mount: false,
  service_start: false,
  dependency_methods_can_write_submission_guard_when_called: true,
  dependency_methods_can_read_credential_when_called: true,
  dependency_methods_can_sign_when_called: true,
  dependency_methods_can_broadcast_when_called: true,
  dependency_methods_can_move_funds_when_called: true,
} as const;

export type BuyVoidErc20DeliveryDependencyBootstrapPolicyV1 = {
  enabled: boolean;
  credentials_directory: string;
  fulfillment_wallet_address: string;
  void_token_address: string;
  submission_guard_root_dir: string;
  rpc_url: string;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidErc20DeliveryDependencyBootstrapReadyV1 = {
  ok: true;
  status: "ready";
  marker: typeof VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1;
  version: 1;
  chain_id: "2050";
  credential_id:
    typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1;
  credential_signer_marker:
    typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1;
  submission_guard_marker:
    typeof VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1;
  broadcaster_marker:
    typeof VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1;
  fulfillment_wallet_address: string;
  void_token_address: string;
  wallet_address_fingerprint_sha256: string;
  void_token_address_fingerprint_sha256: string;
  rpc_url_fingerprint_sha256: string;
  dependencies: BuyVoidDeliverySignBroadcastDependenciesV1;
  credential_read_performed: false;
  rpc_call_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  authority:
    typeof VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1;
};

export type BuyVoidErc20DeliveryDependencyBootstrapHeldV1 = {
  ok: false;
  status: "held" | "disabled";
  marker: typeof VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1;
  version: 1;
  reason: string;
  credential_read_performed: false;
  rpc_call_performed: false;
  signing_performed: false;
  transaction_broadcast_performed: false;
  money_movement_performed: false;
  authority:
    typeof VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1;
};

export type BuyVoidErc20DeliveryDependencyBootstrapDecisionV1 =
  | BuyVoidErc20DeliveryDependencyBootstrapReadyV1
  | BuyVoidErc20DeliveryDependencyBootstrapHeldV1;

const TRANSFER_INTERFACE = new Interface([
  "function transfer(address to, uint256 value) returns (bool)",
]);
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_RESPONSE_BYTES = 1_048_576;

type NormalizedPolicyV1 = {
  credentials_directory: string;
  fulfillment_wallet_address: string;
  void_token_address: string;
  submission_guard_root_dir: string;
  broadcaster_policy: BuyVoidErc20Chain2050BroadcasterPolicyV1;
  wallet_address_fingerprint_sha256: string;
  void_token_address_fingerprint_sha256: string;
  rpc_url_fingerprint_sha256: string;
};

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeAddress(value: unknown): string {
  const raw = String(value || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    return getAddress(raw).toLowerCase();
  } catch {
    return "";
  }
}

function absoluteNonRoot(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) return "";
  const normalized = path.resolve(raw);
  return normalized === path.parse(normalized).root ? "" : normalized;
}

function positiveBounded(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function normalizeRpcUrl(
  value: unknown,
): { url: string; fingerprint: string } | null {
  let url: URL;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    return null;
  }
  const host = url.hostname
    .trim()
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "::1"].includes(host) ||
    !url.port ||
    !Number.isInteger(Number(url.port)) ||
    Number(url.port) <= 0 ||
    Number(url.port) > 65_535 ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.startsWith("/") ||
    url.pathname.length > 256
  ) {
    return null;
  }
  const rendered = host === "::1" ? "[::1]" : host;
  const normalized = `http://${rendered}:${Number(url.port)}${url.pathname}`;
  return { url: normalized, fingerprint: sha256(normalized) };
}

function held(
  reason: string,
  status: "held" | "disabled" = "held",
): BuyVoidErc20DeliveryDependencyBootstrapHeldV1 {
  return {
    ok: false,
    status,
    marker: VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1,
    version: 1,
    reason,
    credential_read_performed: false,
    rpc_call_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1,
  };
}

function normalizePolicy(
  input: Readonly<BuyVoidErc20DeliveryDependencyBootstrapPolicyV1>,
): NormalizedPolicyV1 | BuyVoidErc20DeliveryDependencyBootstrapHeldV1 {
  if (input?.enabled !== true) {
    return held("erc20_delivery_dependency_bootstrap_disabled", "disabled");
  }

  const credentialsDirectory = absoluteNonRoot(
    input.credentials_directory,
  );
  const submissionGuardRoot = absoluteNonRoot(
    input.submission_guard_root_dir,
  );
  const wallet = normalizeAddress(input.fulfillment_wallet_address);
  const token = normalizeAddress(input.void_token_address);
  const rpc = normalizeRpcUrl(input.rpc_url);
  const timeout = positiveBounded(
    input.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxResponseBytes = positiveBounded(
    input.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );

  if (
    !credentialsDirectory ||
    !submissionGuardRoot ||
    credentialsDirectory === submissionGuardRoot ||
    !wallet ||
    !token ||
    wallet === token ||
    !rpc ||
    timeout === null ||
    maxResponseBytes === null
  ) {
    return held("erc20_delivery_dependency_bootstrap_policy_invalid");
  }

  return {
    credentials_directory: credentialsDirectory,
    fulfillment_wallet_address: wallet,
    void_token_address: token,
    submission_guard_root_dir: submissionGuardRoot,
    broadcaster_policy: {
      rpc_url: rpc.url,
      void_token_address: token,
      request_timeout_ms: timeout,
      max_response_bytes: maxResponseBytes,
    },
    wallet_address_fingerprint_sha256: sha256(wallet),
    void_token_address_fingerprint_sha256: sha256(token),
    rpc_url_fingerprint_sha256: rpc.fingerprint,
  };
}

function validateUnsignedErc20Transfer(
  transaction: Readonly<BuyVoidDeliveryUnsignedTransactionV1>,
  tokenAddress: string,
): void {
  const to = normalizeAddress(transaction?.to);
  const data = String(transaction?.data || "").toLowerCase();
  if (
    transaction?.type !== 2 ||
    transaction.chainId !== 2050n ||
    !Number.isSafeInteger(transaction.nonce) ||
    transaction.nonce < 0 ||
    transaction.gasLimit <= 0n ||
    transaction.maxFeePerGas <= 0n ||
    transaction.maxPriorityFeePerGas < 0n ||
    transaction.maxPriorityFeePerGas > transaction.maxFeePerGas ||
    to !== tokenAddress ||
    transaction.value !== 0n
  ) {
    throw new Error("erc20_dependency_unsigned_transaction_invalid");
  }

  try {
    const decoded = TRANSFER_INTERFACE.decodeFunctionData(
      "transfer",
      data,
    );
    const recipient = normalizeAddress(decoded[0]);
    const amount = BigInt(decoded[1]);
    const reencoded = TRANSFER_INTERFACE.encodeFunctionData(
      "transfer",
      [recipient, amount],
    ).toLowerCase();
    if (!recipient || amount <= 0n || reencoded !== data) {
      throw new Error("invalid");
    }
  } catch {
    throw new Error("erc20_dependency_transfer_calldata_invalid");
  }
}

function validateSignedErc20Transfer(
  rawSignedTransaction: string,
  expectedWallet: string,
  expectedToken: string,
  unsigned: Readonly<BuyVoidDeliveryUnsignedTransactionV1>,
): void {
  let parsed: Transaction;
  try {
    parsed = Transaction.from(rawSignedTransaction);
  } catch {
    throw new Error("erc20_dependency_signed_transaction_parse_failed");
  }
  if (
    normalizeAddress(parsed.from) !== expectedWallet ||
    normalizeAddress(parsed.to) !== expectedToken ||
    parsed.type !== unsigned.type ||
    parsed.chainId !== unsigned.chainId ||
    parsed.nonce !== unsigned.nonce ||
    parsed.gasLimit !== unsigned.gasLimit ||
    parsed.maxFeePerGas !== unsigned.maxFeePerGas ||
    parsed.maxPriorityFeePerGas !== unsigned.maxPriorityFeePerGas ||
    parsed.value !== 0n ||
    String(parsed.data || "").toLowerCase() !==
      String(unsigned.data || "").toLowerCase()
  ) {
    throw new Error("erc20_dependency_signed_transaction_binding_mismatch");
  }
}

export function createBuyVoidErc20DeliveryDependencyBootstrapV1(
  input: Readonly<BuyVoidErc20DeliveryDependencyBootstrapPolicyV1>,
): BuyVoidErc20DeliveryDependencyBootstrapDecisionV1 {
  const normalized = normalizePolicy(input);
  if ("reason" in normalized) return normalized;

  let submissionGuard;
  try {
    submissionGuard = createBuyVoidDeliverySubmissionGuardV1(
      normalized.submission_guard_root_dir,
    );
  } catch {
    return held("erc20_delivery_submission_guard_create_failed");
  }

  const signer: BuyVoidDeliverySignerV1 = {
    async get_address(): Promise<string> {
      return normalized.fulfillment_wallet_address;
    },

    async sign_transaction(
      transaction: Readonly<BuyVoidDeliveryUnsignedTransactionV1>,
    ): Promise<string> {
      validateUnsignedErc20Transfer(
        transaction,
        normalized.void_token_address,
      );

      const signerDecision =
        createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
        credentials_directory: normalized.credentials_directory,
        expected_wallet_address:
          normalized.fulfillment_wallet_address,
      });
      if ("reason" in signerDecision) {
        throw new Error(
          "erc20_dependency_credential_signer_not_ready",
        );
      }

      const raw = await signerDecision.signer.sign_transaction(
        transaction as any,
      );
      validateSignedErc20Transfer(
        raw,
        normalized.fulfillment_wallet_address,
        normalized.void_token_address,
        transaction,
      );
      return raw;
    },
  };

  const broadcasterDecision =
    createBuyVoidErc20Chain2050BroadcasterV1(
      normalized.broadcaster_policy,
    );
  if ("reason" in broadcasterDecision) {
    return held("erc20_delivery_broadcaster_create_failed");
  }

  const dependencies: BuyVoidDeliverySignBroadcastDependenciesV1 = {
    submission_guard: submissionGuard,
    signer,
    broadcaster: broadcasterDecision.broadcaster,
  };

  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1,
    version: 1,
    chain_id: "2050",
    credential_id:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
    credential_signer_marker:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1,
    submission_guard_marker:
      VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1,
    broadcaster_marker:
      VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1,
    fulfillment_wallet_address:
      normalized.fulfillment_wallet_address,
    void_token_address: normalized.void_token_address,
    wallet_address_fingerprint_sha256:
      normalized.wallet_address_fingerprint_sha256,
    void_token_address_fingerprint_sha256:
      normalized.void_token_address_fingerprint_sha256,
    rpc_url_fingerprint_sha256:
      normalized.rpc_url_fingerprint_sha256,
    dependencies,
    credential_read_performed: false,
    rpc_call_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1,
  };
}
