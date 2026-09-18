import crypto from "node:crypto";
import { Interface, Transaction, getAddress } from "ethers";

import {
  createBuyVoidNativeChain2050BroadcasterV1,
  type BuyVoidNativeChain2050JsonRpcTransportV1,
} from "./buy_void_native_chain2050_broadcaster_v1.js";
import {
  createBuyVoidErc20Chain2050TotalDeadlineHttpTransportV1,
} from "./buy_void_erc20_chain2050_total_deadline_transport_v1.js";
import type {
  BuyVoidDeliveryBroadcasterV1,
  BuyVoidDeliveryBroadcastResultV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1 =
  "VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1";

export const VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_AUTHORITY_V1 = {
  source_only_contract: true,
  canonical_chain_id: "2050",
  fulfillment_contract_only: true,
  exact_fulfill_calldata_required: true,
  nonzero_payment_delivery_id_required: true,
  positive_bounded_amount_required: true,
  transaction_value_wei: "0",
  loopback_http_only: true,
  total_wall_clock_deadline: true,
  bounded_response_bytes: true,
  chain_identity_probe_when_broadcast_called: true,
  per_broadcast_chain_identity_probe: true,
  factory_rpc_probe: false,
  legacy_void_token_transfer_authority: false,
  credential_access: false,
  wallet_access: false,
  transaction_signing: false,
  runtime_route_mount: false,
  background_loop: false,
  automatic_retry: false,
  transaction_broadcast_when_broadcaster_called: true,
  money_movement_when_broadcaster_called: true,
} as const;

export type BuyVoidPaymentKeyedChain2050BroadcasterPolicyV1 = {
  rpc_url: string;
  fulfillment_contract_address: string;
  max_token_amount_atoms: string | number | bigint;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidPaymentKeyedSignedTransactionInspectionReadyV1 = {
  ok: true;
  status: "valid";
  transaction_hash: string;
  fulfillment_contract_address: string;
  payment_delivery_id: string;
  recipient: string;
  amount_atoms: string;
  calldata: string;
};

export type BuyVoidPaymentKeyedSignedTransactionInspectionHeldV1 = {
  ok: false;
  status: "held";
  reason: string;
  transaction_hash: string | null;
};

export type BuyVoidPaymentKeyedSignedTransactionInspectionDecisionV1 =
  | BuyVoidPaymentKeyedSignedTransactionInspectionReadyV1
  | BuyVoidPaymentKeyedSignedTransactionInspectionHeldV1;

export type BuyVoidPaymentKeyedChain2050BroadcasterDecisionV1 =
  | {
      ok: true;
      status: "ready";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1;
      version: 1;
      chain_id: "2050";
      fulfillment_contract_address: string;
      max_token_amount_atoms: string;
      rpc_url_fingerprint_sha256: string;
      broadcaster: BuyVoidDeliveryBroadcasterV1;
      factory_rpc_probe_performed: false;
      transaction_broadcast_performed_by_factory: false;
      money_movement_performed_by_factory: false;
      authority:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_AUTHORITY_V1;
    }
  | {
      ok: false;
      status: "held";
      marker: typeof VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1;
      version: 1;
      reason: string;
      fulfillment_contract_address: string | null;
      max_token_amount_atoms: string | null;
      rpc_url_fingerprint_sha256: string | null;
      factory_rpc_probe_performed: false;
      transaction_broadcast_performed_by_factory: false;
      money_movement_performed_by_factory: false;
      authority:
        typeof VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_AUTHORITY_V1;
    };

type NormalizedPolicyV1 = {
  rpc_url: string;
  fulfillment_contract_address: string;
  max_token_amount_atoms: bigint;
  request_timeout_ms: number;
  max_response_bytes: number;
  rpc_url_fingerprint_sha256: string;
};

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const BYTES32 = /^0x[0-9a-f]{64}$/;
const RAW = /^0x(?:[0-9a-fA-F]{2})+$/;
const MAX_RAW_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const UINT256_MAX = (1n << 256n) - 1n;
const FULFILLMENT = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

function parsePositive(value: unknown): bigint | null {
  try {
    if (typeof value === "bigint") {
      return value > 0n && value <= UINT256_MAX ? value : null;
    }
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || value <= 0) return null;
      return BigInt(value);
    }
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!/^[1-9][0-9]{0,77}$/.test(raw)) return null;
    const parsed = BigInt(raw);
    return parsed <= UINT256_MAX ? parsed : null;
  } catch {
    return null;
  }
}

function boundedPositive(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function normalizeRpc(rawValue: unknown): string {
  if (typeof rawValue !== "string") return "";
  let url: URL;
  try {
    url = new URL(rawValue.trim());
  } catch {
    return "";
  }
  const host = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  const hostname =
    host === "127.0.0.1" ? "127.0.0.1" : host === "::1" ? "::1" : "";
  const port = Number(url.port || 0);
  if (
    url.protocol !== "http:" ||
    !hostname ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65_535 ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.startsWith("/") ||
    url.pathname.length > 256
  ) {
    return "";
  }
  const rendered = hostname === "::1" ? "[::1]" : hostname;
  return "http://" + rendered + ":" + String(port) + url.pathname;
}

function held(
  reason: string,
  transactionHash: string | null = null,
): BuyVoidPaymentKeyedSignedTransactionInspectionHeldV1 {
  return {
    ok: false,
    status: "held",
    reason,
    transaction_hash: transactionHash,
  };
}

function normalizePolicy(
  input: BuyVoidPaymentKeyedChain2050BroadcasterPolicyV1,
): NormalizedPolicyV1 | null {
  const rpcUrl = normalizeRpc(input?.rpc_url);
  const contract = address(input?.fulfillment_contract_address);
  const maximum = parsePositive(input?.max_token_amount_atoms);
  const timeout = boundedPositive(
    input?.request_timeout_ms,
    DEFAULT_TIMEOUT_MS,
    30_000,
  );
  const maxBytes = boundedPositive(
    input?.max_response_bytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    1_048_576,
  );
  if (
    !rpcUrl ||
    !contract ||
    maximum === null ||
    timeout === null ||
    maxBytes === null
  ) {
    return null;
  }
  return {
    rpc_url: rpcUrl,
    fulfillment_contract_address: contract,
    max_token_amount_atoms: maximum,
    request_timeout_ms: timeout,
    max_response_bytes: maxBytes,
    rpc_url_fingerprint_sha256: sha256(rpcUrl),
  };
}

export function inspectBuyVoidPaymentKeyedSignedTransactionV1(input: {
  raw_signed_transaction: unknown;
  fulfillment_contract_address: unknown;
  max_token_amount_atoms: unknown;
}): BuyVoidPaymentKeyedSignedTransactionInspectionDecisionV1 {
  const raw = text(input?.raw_signed_transaction);
  const contract = address(input?.fulfillment_contract_address);
  const maximum = parsePositive(input?.max_token_amount_atoms);
  if (!contract || maximum === null) {
    return held("payment_keyed_signed_transaction_policy_invalid");
  }
  if (
    !RAW.test(raw) ||
    raw.length % 2 !== 0 ||
    (raw.length - 2) / 2 > MAX_RAW_BYTES
  ) {
    return held("payment_keyed_signed_transaction_raw_invalid");
  }

  let transaction: Transaction;
  try {
    transaction = Transaction.from(raw);
  } catch {
    return held("payment_keyed_signed_transaction_parse_failed");
  }
  const transactionHash = text(transaction.hash).toLowerCase();
  const to = address(transaction.to);
  if (!HASH.test(transactionHash)) {
    return held("payment_keyed_signed_transaction_hash_invalid");
  }
  if (
    transaction.type !== 2 ||
    transaction.chainId !== 2050n ||
    to !== contract ||
    transaction.value !== 0n
  ) {
    return held(
      "payment_keyed_signed_transaction_envelope_mismatch",
      transactionHash,
    );
  }

  const calldata = text(transaction.data).toLowerCase();
  let decoded: readonly unknown[];
  try {
    decoded = FULFILLMENT.decodeFunctionData("fulfill", calldata);
  } catch {
    return held(
      "payment_keyed_signed_transaction_calldata_invalid",
      transactionHash,
    );
  }

  const paymentDeliveryId = text(decoded[0]).toLowerCase();
  const recipient = address(decoded[1]);
  let amount: bigint;
  try {
    amount = BigInt(decoded[2] as bigint);
  } catch {
    return held(
      "payment_keyed_signed_transaction_amount_invalid",
      transactionHash,
    );
  }
  if (
    !BYTES32.test(paymentDeliveryId) ||
    paymentDeliveryId === "0x" + "0".repeat(64) ||
    !recipient ||
    amount <= 0n ||
    amount > maximum
  ) {
    return held(
      "payment_keyed_signed_transaction_fulfillment_binding_invalid",
      transactionHash,
    );
  }

  const expected = FULFILLMENT.encodeFunctionData("fulfill", [
    paymentDeliveryId,
    recipient,
    amount,
  ]).toLowerCase();
  if (expected !== calldata) {
    return held(
      "payment_keyed_signed_transaction_calldata_noncanonical",
      transactionHash,
    );
  }

  return {
    ok: true,
    status: "valid",
    transaction_hash: transactionHash,
    fulfillment_contract_address: contract,
    payment_delivery_id: paymentDeliveryId,
    recipient,
    amount_atoms: amount.toString(),
    calldata,
  };
}

export function createBuyVoidPaymentKeyedChain2050BroadcasterV1(
  policyInput: Readonly<BuyVoidPaymentKeyedChain2050BroadcasterPolicyV1>,
  transport: BuyVoidNativeChain2050JsonRpcTransportV1 =
    createBuyVoidErc20Chain2050TotalDeadlineHttpTransportV1(),
): BuyVoidPaymentKeyedChain2050BroadcasterDecisionV1 {
  const policy = normalizePolicy(policyInput);
  if (!policy) {
    return {
      ok: false,
      status: "held",
      marker: VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1,
      version: 1,
      reason: "payment_keyed_chain2050_broadcaster_policy_invalid",
      fulfillment_contract_address:
        address(policyInput?.fulfillment_contract_address) || null,
      max_token_amount_atoms:
        parsePositive(policyInput?.max_token_amount_atoms)?.toString() || null,
      rpc_url_fingerprint_sha256: null,
      factory_rpc_probe_performed: false,
      transaction_broadcast_performed_by_factory: false,
      money_movement_performed_by_factory: false,
      authority: VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_AUTHORITY_V1,
    };
  }

  const broadcaster: BuyVoidDeliveryBroadcasterV1 = {
    async broadcast_signed_transaction(
      rawSignedTransaction: string,
    ): Promise<BuyVoidDeliveryBroadcastResultV1> {
      const inspection = inspectBuyVoidPaymentKeyedSignedTransactionV1({
        raw_signed_transaction: rawSignedTransaction,
        fulfillment_contract_address: policy.fulfillment_contract_address,
        max_token_amount_atoms: policy.max_token_amount_atoms,
      });
      if (inspection.ok === false) {
        return {
          accepted: false,
          ...(inspection.transaction_hash
            ? { transaction_hash: inspection.transaction_hash }
            : {}),
          provider_submission_id:
            "payment-keyed-chain2050-local-transaction-invalid",
          submission_may_have_occurred: false,
        };
      }

      let native;
      try {
        native = await createBuyVoidNativeChain2050BroadcasterV1(
          {
            rpc_url: policy.rpc_url,
            expected_chain_id: 2050,
            request_timeout_ms: policy.request_timeout_ms,
            max_response_bytes: policy.max_response_bytes,
          },
          transport,
        );
      } catch {
        return {
          accepted: false,
          transaction_hash: inspection.transaction_hash,
          provider_submission_id:
            "payment-keyed-chain2050-broadcaster-factory-failed",
          submission_may_have_occurred: false,
        };
      }
      if (native.ok === false) {
        return {
          accepted: false,
          transaction_hash: inspection.transaction_hash,
          provider_submission_id:
            native.provider_submission_id ||
            "payment-keyed-chain2050-chain-probe-held",
          submission_may_have_occurred: false,
        };
      }
      return await native.broadcaster.broadcast_signed_transaction(
        rawSignedTransaction,
      );
    },
  };

  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_V1,
    version: 1,
    chain_id: "2050",
    fulfillment_contract_address: policy.fulfillment_contract_address,
    max_token_amount_atoms: policy.max_token_amount_atoms.toString(),
    rpc_url_fingerprint_sha256: policy.rpc_url_fingerprint_sha256,
    broadcaster,
    factory_rpc_probe_performed: false,
    transaction_broadcast_performed_by_factory: false,
    money_movement_performed_by_factory: false,
    authority: VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_BROADCASTER_AUTHORITY_V1,
  };
}
