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
  type BuyVoidDeliverySubmissionGuardV1,
} from "./buy_void_delivery_submission_guard_v1.js";
import {
  createBuyVoidNativeFulfillmentWalletCredentialSignerV1,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
  VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1,
} from "./buy_void_native_fulfillment_wallet_credential_signer_v1.js";
import {
  createBuyVoidPaymentKeyedChain2050BroadcasterV1,
  inspectBuyVoidPaymentKeyedSignedTransactionV1,
  VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1,
} from "./buy_void_payment_keyed_chain2050_broadcaster_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "./buy_void_erc20_production_credential_binding_evidence_v1.js";
import type {
  BuyVoidDeliveryBroadcasterV1,
  BuyVoidDeliverySignerV1,
  BuyVoidDeliveryUnsignedTransactionV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1 = {
  source_only_contract: true,
  canonical_chain_id: "2050",
  canonical_payment_keyed_fulfillment_only: true,
  existing_fixed_systemd_credential_reused: true,
  existing_credential_binding_evidence_reused: true,
  durable_submission_guard_reused: true,
  payment_keyed_chain2050_broadcaster_reused: true,
  composition_time_credential_read: false,
  composition_time_wallet_access: false,
  composition_time_rpc_call: false,
  composition_time_signing: false,
  composition_time_transaction_broadcast: false,
  composition_time_submission_guard_write: false,
  credential_read_deferred_until_sign_transaction: true,
  exact_unsigned_fulfillment_revalidated_before_credential_read: true,
  exact_signed_fulfillment_revalidated_after_signing: true,
  automatic_retry: false,
  runtime_route_mount: false,
  background_loop: false,
  service_start: false,
  dependency_methods_can_write_submission_guard_when_called: true,
  dependency_methods_can_read_credential_when_called: true,
  dependency_methods_can_sign_when_called: true,
  dependency_methods_can_broadcast_when_called: true,
  dependency_methods_can_move_funds_when_called: true,
} as const;

export type BuyVoidPaymentKeyedRuntimeDependencyBootstrapPolicyV1 = {
  enabled: boolean;
  credential_binding_evidence_id: string;
  credentials_directory: string;
  fulfillment_wallet_address: string;
  fulfillment_contract_address: string;
  max_token_amount_atoms: string | number | bigint;
  submission_guard_root_dir: string;
  rpc_url: string;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidPaymentKeyedRuntimeDependenciesV1 = {
  signer: BuyVoidDeliverySignerV1;
  submission_guard: BuyVoidDeliverySubmissionGuardV1;
  broadcaster: BuyVoidDeliveryBroadcasterV1;
};

export type BuyVoidPaymentKeyedRuntimeDependencyBootstrapDecisionV1 =
  | {
      ok: true;
      status: "ready";
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1;
      version: 1;
      chain_id: "2050";
      credential_id:
        typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1;
      credential_signer_marker:
        typeof VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1;
      credential_binding_evidence_id:
        typeof VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1;
      submission_guard_marker:
        typeof VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1;
      broadcaster_marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1;
      fulfillment_wallet_address: string;
      fulfillment_contract_address: string;
      wallet_address_fingerprint_sha256: string;
      fulfillment_contract_fingerprint_sha256: string;
      rpc_url_fingerprint_sha256: string;
      max_token_amount_atoms: string;
      dependencies: BuyVoidPaymentKeyedRuntimeDependenciesV1;
      credential_read_performed: false;
      rpc_call_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      submission_guard_write_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held" | "disabled";
      marker:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1;
      version: 1;
      reason: string;
      credential_read_performed: false;
      rpc_call_performed: false;
      signing_performed: false;
      transaction_broadcast_performed: false;
      submission_guard_write_performed: false;
      money_movement_performed: false;
      authority:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1;
    };

type NormalizedV1 = {
  credentials_directory: string;
  wallet: string;
  contract: string;
  max_atoms: bigint;
  submission_guard_root_dir: string;
  rpc_url: string;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const UINT256_MAX = (1n << 256n) - 1n;
const FULFILLMENT = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);

function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : String(value ?? "").trim();
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
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

function absoluteNonRoot(value: unknown): string {
  const raw = text(value);
  if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) return "";
  const normalized = path.resolve(raw);
  return normalized === path.parse(normalized).root ? "" : normalized;
}

function positiveUint256(value: unknown): bigint | null {
  try {
    const parsed = BigInt(value as any);
    return parsed > 0n && parsed <= UINT256_MAX
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function held(
  reason: string,
  status: "held" | "disabled" = "held",
): Extract<
  BuyVoidPaymentKeyedRuntimeDependencyBootstrapDecisionV1,
  { ok: false }
> {
  return {
    ok: false,
    status,
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1,
    version: 1,
    reason,
    credential_read_performed: false,
    rpc_call_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    submission_guard_write_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1,
  };
}

function normalize(
  input: Readonly<BuyVoidPaymentKeyedRuntimeDependencyBootstrapPolicyV1>,
): NormalizedV1 | Extract<
  BuyVoidPaymentKeyedRuntimeDependencyBootstrapDecisionV1,
  { ok: false }
> {
  if (input?.enabled !== true) {
    return held(
      "payment_keyed_runtime_dependency_bootstrap_disabled",
      "disabled",
    );
  }

  if (
    text(input.credential_binding_evidence_id) !==
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1
  ) {
    return held(
      "payment_keyed_runtime_credential_binding_evidence_id_mismatch",
    );
  }

  const credentials = absoluteNonRoot(input.credentials_directory);
  const guardRoot = absoluteNonRoot(input.submission_guard_root_dir);
  const wallet = address(input.fulfillment_wallet_address);
  const contract = address(input.fulfillment_contract_address);
  const maxAtoms = positiveUint256(input.max_token_amount_atoms);
  const evidenceWallet = address(
    VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1
      .derived_wallet_address,
  );
  if (
    !credentials ||
    !guardRoot ||
    credentials === guardRoot ||
    !wallet ||
    !contract ||
    wallet === contract ||
    !evidenceWallet ||
    wallet !== evidenceWallet ||
    maxAtoms === null
  ) {
    return held(
      "payment_keyed_runtime_dependency_bootstrap_policy_invalid",
    );
  }

  return {
    credentials_directory: credentials,
    wallet,
    contract,
    max_atoms: maxAtoms,
    submission_guard_root_dir: guardRoot,
    rpc_url: text(input.rpc_url),
    ...(input.request_timeout_ms !== undefined
      ? { request_timeout_ms: input.request_timeout_ms }
      : {}),
    ...(input.max_response_bytes !== undefined
      ? { max_response_bytes: input.max_response_bytes }
      : {}),
  };
}

function validateUnsignedFulfillment(
  transaction: Readonly<BuyVoidDeliveryUnsignedTransactionV1>,
  expectedContract: string,
  maxAtoms: bigint,
): void {
  const target = address(transaction?.to);
  const data = text(transaction?.data).toLowerCase();
  if (
    transaction?.type !== 2 ||
    transaction.chainId !== 2050n ||
    !Number.isSafeInteger(transaction.nonce) ||
    transaction.nonce < 0 ||
    transaction.gasLimit <= 0n ||
    transaction.maxFeePerGas <= 0n ||
    transaction.maxPriorityFeePerGas < 0n ||
    transaction.maxPriorityFeePerGas >
      transaction.maxFeePerGas ||
    target !== expectedContract ||
    transaction.value !== 0n
  ) {
    throw new Error(
      "payment_keyed_runtime_dependency_unsigned_transaction_invalid",
    );
  }

  let decoded: readonly unknown[];
  try {
    decoded = FULFILLMENT.decodeFunctionData("fulfill", data);
  } catch {
    throw new Error(
      "payment_keyed_runtime_dependency_fulfillment_calldata_invalid",
    );
  }
  const paymentDeliveryId = text(decoded[0]).toLowerCase();
  const recipient = address(decoded[1]);
  let amount: bigint;
  try {
    amount = BigInt(decoded[2] as bigint);
  } catch {
    throw new Error(
      "payment_keyed_runtime_dependency_fulfillment_amount_invalid",
    );
  }
  const reencoded = FULFILLMENT.encodeFunctionData("fulfill", [
    paymentDeliveryId,
    recipient,
    amount,
  ]).toLowerCase();
  if (
    !/^0x[0-9a-f]{64}$/.test(paymentDeliveryId) ||
    paymentDeliveryId === "0x" + "0".repeat(64) ||
    !recipient ||
    amount <= 0n ||
    amount > maxAtoms ||
    reencoded !== data
  ) {
    throw new Error(
      "payment_keyed_runtime_dependency_fulfillment_binding_invalid",
    );
  }
}

function validateSignedExact(
  rawSignedTransaction: string,
  expectedWallet: string,
  expectedContract: string,
  maxAtoms: bigint,
  unsigned: Readonly<BuyVoidDeliveryUnsignedTransactionV1>,
): void {
  const inspected = inspectBuyVoidPaymentKeyedSignedTransactionV1({
    raw_signed_transaction: rawSignedTransaction,
    fulfillment_contract_address: expectedContract,
    max_token_amount_atoms: maxAtoms,
  });
  if (inspected.ok === false) {
    throw new Error(
      "payment_keyed_runtime_dependency_signed_transaction_invalid:" +
        inspected.reason,
    );
  }

  let parsed: Transaction;
  try {
    parsed = Transaction.from(rawSignedTransaction);
  } catch {
    throw new Error(
      "payment_keyed_runtime_dependency_signed_transaction_parse_failed",
    );
  }
  if (
    address(parsed.from) !== expectedWallet ||
    address(parsed.to) !== expectedContract ||
    parsed.type !== unsigned.type ||
    parsed.chainId !== unsigned.chainId ||
    parsed.nonce !== unsigned.nonce ||
    parsed.gasLimit !== unsigned.gasLimit ||
    parsed.maxFeePerGas !== unsigned.maxFeePerGas ||
    parsed.maxPriorityFeePerGas !==
      unsigned.maxPriorityFeePerGas ||
    parsed.value !== unsigned.value ||
    text(parsed.data).toLowerCase() !==
      text(unsigned.data).toLowerCase()
  ) {
    throw new Error(
      "payment_keyed_runtime_dependency_signed_transaction_binding_mismatch",
    );
  }
}

export function createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1(
  input: Readonly<BuyVoidPaymentKeyedRuntimeDependencyBootstrapPolicyV1>,
): BuyVoidPaymentKeyedRuntimeDependencyBootstrapDecisionV1 {
  const normalized = normalize(input);
  if ("reason" in normalized) return normalized;

  let submissionGuard: BuyVoidDeliverySubmissionGuardV1;
  try {
    submissionGuard =
      createBuyVoidDeliverySubmissionGuardV1(
        normalized.submission_guard_root_dir,
      );
  } catch {
    return held(
      "payment_keyed_runtime_submission_guard_create_failed",
    );
  }

  const broadcasterDecision =
    createBuyVoidPaymentKeyedChain2050BroadcasterV1({
      rpc_url: normalized.rpc_url,
      fulfillment_contract_address: normalized.contract,
      max_token_amount_atoms: normalized.max_atoms,
      ...(normalized.request_timeout_ms !== undefined
        ? {
            request_timeout_ms:
              normalized.request_timeout_ms,
          }
        : {}),
      ...(normalized.max_response_bytes !== undefined
        ? {
            max_response_bytes:
              normalized.max_response_bytes,
          }
        : {}),
    });
  if (broadcasterDecision.ok === false) {
    return held(
      "payment_keyed_runtime_broadcaster_not_ready:" +
        broadcasterDecision.reason,
    );
  }

  const signer: BuyVoidDeliverySignerV1 = {
    async get_address(): Promise<string> {
      return normalized.wallet;
    },

    async sign_transaction(
      transaction: Readonly<BuyVoidDeliveryUnsignedTransactionV1>,
    ): Promise<string> {
      validateUnsignedFulfillment(
        transaction,
        normalized.contract,
        normalized.max_atoms,
      );

      const credential =
        createBuyVoidNativeFulfillmentWalletCredentialSignerV1({
          credentials_directory:
            normalized.credentials_directory,
          expected_wallet_address: normalized.wallet,
        });
      if (credential.ok === false) {
        throw new Error(
          "payment_keyed_runtime_credential_signer_not_ready:" +
            credential.reason,
        );
      }
      const raw =
        await credential.signer.sign_transaction(
          transaction as any,
        );
      validateSignedExact(
        raw,
        normalized.wallet,
        normalized.contract,
        normalized.max_atoms,
        transaction,
      );
      return raw;
    },
  };

  return {
    ok: true,
    status: "ready",
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1,
    version: 1,
    chain_id: "2050",
    credential_id:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_ID_V1,
    credential_signer_marker:
      VOID_BUY_VOID_NATIVE_FULFILLMENT_WALLET_CREDENTIAL_SIGNER_V1,
    credential_binding_evidence_id:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
    submission_guard_marker:
      VOID_BUY_VOID_DELIVERY_SUBMISSION_GUARD_V1,
    broadcaster_marker:
      VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1,
    fulfillment_wallet_address: normalized.wallet,
    fulfillment_contract_address: normalized.contract,
    wallet_address_fingerprint_sha256:
      sha256(normalized.wallet),
    fulfillment_contract_fingerprint_sha256:
      sha256(normalized.contract),
    rpc_url_fingerprint_sha256:
      broadcasterDecision.rpc_url_fingerprint_sha256,
    max_token_amount_atoms:
      normalized.max_atoms.toString(),
    dependencies: {
      signer,
      submission_guard: submissionGuard,
      broadcaster: broadcasterDecision.broadcaster,
    },
    credential_read_performed: false,
    rpc_call_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    submission_guard_write_performed: false,
    money_movement_performed: false,
    authority:
      VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1,
  };
}
