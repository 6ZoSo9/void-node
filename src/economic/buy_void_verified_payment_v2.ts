import type {
  BuyVoidRequestV1,
  BuyVoidVerifiedPaymentEventV1,
} from "./buy_void_auto_fulfillment_v1.js";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_V2 =
  "VOID_BUY_VOID_VERIFIED_PAYMENT_V2";

export const VOID_BUY_VOID_VERIFIED_PAYMENT_AUTHORITY_V2 = {
  rpc_call: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  runtime_route_mount: false,
  filesystem_write: false,
  money_movement: false,
} as const;

const ADDRESS = /^0x[0-9a-f]{40}$/;
const HEX_32 = /^0x[0-9a-f]{64}$/;
const CHAIN = /^[a-z0-9][a-z0-9_-]{1,31}$/;
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export type BuyVoidReceiptLogV2 = {
  address?: unknown;
  topics?: unknown;
  data?: unknown;
  logIndex?: unknown;
  transactionHash?: unknown;
  blockNumber?: unknown;
  removed?: unknown;
};

export type BuyVoidTransactionReceiptV2 = {
  status?: unknown;
  transactionHash?: unknown;
  blockNumber?: unknown;
  logs?: unknown;
};

export type BuyVoidVerifiedPaymentPolicyV2 = {
  allowed_chains: string[];
  usdc_contract_by_chain: Record<string, string>;
  receive_address_by_chain: Record<string, string>;
  current_block_number_by_chain: Record<string, string | number>;
};

export type BuyVoidMatchedUsdcTransferV2 = {
  log_index: string;
  transaction_hash: string;
  block_number: string;
  usdc_contract: string;
  from_address: string;
  receive_address: string;
  delivery_address: string;
  amount_units: string;
  requested_units: string;
};

export type BuyVoidVerifiedPaymentEventV2 =
  BuyVoidVerifiedPaymentEventV1 & {
    schema: "void_buy_void_verified_payment_event_v2";
    marker: typeof VOID_BUY_VOID_VERIFIED_PAYMENT_V2;
    payment_identity_input_complete: true;
    payment_verifier: NonNullable<
      BuyVoidVerifiedPaymentEventV1["payment_verifier"]
    > & {
      log_index: string;
      block_number: string;
      confirmations: string;
      transaction_hash: string;
      usdc_contract: string;
      from_address: string;
      receive_address: string;
      delivery_address: string;
      amount_units: string;
      requested_units: string;
    };
  };

export type BuyVoidVerifiedPaymentDecisionV2 =
  | {
      ok: true;
      status: "verified";
      verified: true;
      event: BuyVoidVerifiedPaymentEventV2;
      matched_transfer: BuyVoidMatchedUsdcTransferV2;
    }
  | {
      ok: false;
      status: "held";
      verified: false;
      reason: string;
      detail?: Record<string, unknown>;
    };

export type BuildBuyVoidVerifiedPaymentInputV2 = {
  request: BuyVoidRequestV1;
  receipt: BuyVoidTransactionReceiptV2;
  policy: BuyVoidVerifiedPaymentPolicyV2;
};

function held(
  reason: string,
  detail?: Record<string, unknown>,
): BuyVoidVerifiedPaymentDecisionV2 {
  return {
    ok: false,
    status: "held",
    verified: false,
    reason,
    ...(detail ? { detail } : {}),
  };
}

function normalizeChain(value: unknown): string {
  const raw = String(value || "").trim().toLowerCase();
  const chain = raw === "eth" ? "ethereum" : raw;
  return CHAIN.test(chain) ? chain : "";
}

function normalizeAddress(value: unknown): string {
  const address = String(value || "").trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function normalizeHash(value: unknown): string {
  const hash = String(value || "").trim().toLowerCase();
  return HEX_32.test(hash) ? hash : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }

  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;

  try {
    if (/^0x[0-9a-f]+$/.test(raw) || /^[0-9]+$/.test(raw)) {
      const n = BigInt(raw);
      return n >= 0n ? n : null;
    }
  } catch {
    return null;
  }

  return null;
}

function decimalToUnits(value: unknown, decimals = 6): bigint | null {
  const raw = String(value ?? "").trim();
  if (!raw || !/^[0-9]+(?:\.[0-9]+)?$/.test(raw)) return null;

  const [whole, fraction = ""] = raw.split(".");
  if (fraction.length > decimals) return null;

  try {
    return (
      BigInt(whole) * 10n ** BigInt(decimals) +
      BigInt(fraction.padEnd(decimals, "0") || "0")
    );
  } catch {
    return null;
  }
}

function topicAddress(value: unknown): string {
  const topic = String(value || "").trim().toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(topic)) return "";
  return `0x${topic.slice(-40)}`;
}

function receiptSucceeded(value: unknown): boolean {
  const status = parseNonNegativeInteger(value);
  return status === 1n;
}

export function buildBuyVoidVerifiedPaymentEventV2(
  input: BuildBuyVoidVerifiedPaymentInputV2,
): BuyVoidVerifiedPaymentDecisionV2 {
  const request = input?.request;
  const receipt = input?.receipt;
  const policy = input?.policy;
  if (!request || !receipt || !policy) return held("missing_input");

  const requestId = String(request.request_id || "").trim();
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(requestId)) {
    return held("invalid_request_id");
  }

  const chain = normalizeChain(request.source_chain);
  if (!chain) return held("invalid_source_chain");

  const allowedChains = new Set(
    (policy.allowed_chains || []).map(normalizeChain).filter(Boolean),
  );
  if (!allowedChains.has(chain)) return held("source_chain_not_allowlisted");

  const requestTxHash = normalizeHash(request.tx_hash);
  const receiptTxHash = normalizeHash(receipt.transactionHash);
  if (!requestTxHash || !receiptTxHash) {
    return held("invalid_payment_transaction_hash");
  }
  if (requestTxHash !== receiptTxHash) {
    return held("payment_transaction_hash_mismatch");
  }

  if (!receiptSucceeded(receipt.status)) return held("payment_tx_failed");

  const receiptBlockNumber = parseNonNegativeInteger(receipt.blockNumber);
  const currentBlockNumber = parseNonNegativeInteger(
    policy.current_block_number_by_chain?.[chain],
  );
  if (receiptBlockNumber === null || receiptBlockNumber <= 0n) {
    return held("missing_receipt_block_number");
  }
  if (currentBlockNumber === null || currentBlockNumber < receiptBlockNumber) {
    return held("invalid_current_block_number");
  }

  const confirmations = currentBlockNumber - receiptBlockNumber + 1n;
  const usdcContract = normalizeAddress(policy.usdc_contract_by_chain?.[chain]);
  const policyReceiveAddress = normalizeAddress(
    policy.receive_address_by_chain?.[chain],
  );
  const requestReceiveAddress = normalizeAddress(request.receive_address);
  const deliveryAddress = normalizeAddress(request.delivery_address);
  if (!usdcContract) return held("invalid_usdc_contract_policy");
  if (
    !policyReceiveAddress ||
    !requestReceiveAddress ||
    policyReceiveAddress !== requestReceiveAddress
  ) {
    return held("receive_address_binding_mismatch");
  }
  if (!deliveryAddress) return held("invalid_delivery_address");

  const requestedUnits = decimalToUnits(request.usdc_amount, 6);
  if (requestedUnits === null || requestedUnits <= 0n) {
    return held("invalid_requested_usdc_amount");
  }

  const rawLogs = Array.isArray(receipt.logs) ? receipt.logs : [];
  const matches: BuyVoidMatchedUsdcTransferV2[] = [];

  for (const rawLog of rawLogs) {
    const log = (rawLog || {}) as BuyVoidReceiptLogV2;
    if (log.removed === true) continue;

    const logContract = normalizeAddress(log.address);
    if (logContract !== usdcContract) continue;

    const topics = Array.isArray(log.topics) ? log.topics : [];
    if (String(topics[0] || "").trim().toLowerCase() !== TRANSFER_TOPIC) {
      continue;
    }

    const fromAddress = topicAddress(topics[1]);
    const receiveAddress = topicAddress(topics[2]);
    if (fromAddress !== deliveryAddress) continue;
    if (receiveAddress !== policyReceiveAddress) continue;

    const amountUnits = parseNonNegativeInteger(log.data);
    if (amountUnits === null || amountUnits !== requestedUnits) continue;

    const logIndex = parseNonNegativeInteger(log.logIndex);
    if (logIndex === null) continue;

    const logTxHash = log.transactionHash
      ? normalizeHash(log.transactionHash)
      : receiptTxHash;
    if (!logTxHash || logTxHash !== receiptTxHash) continue;

    const logBlockNumber: bigint | null =
      log.blockNumber !== undefined && log.blockNumber !== null
        ? parseNonNegativeInteger(log.blockNumber)
        : receiptBlockNumber;
    if (logBlockNumber === null || logBlockNumber !== receiptBlockNumber) {
      continue;
    }

    matches.push({
      log_index: logIndex.toString(),
      transaction_hash: receiptTxHash,
      block_number: receiptBlockNumber.toString(),
      usdc_contract: usdcContract,
      from_address: fromAddress,
      receive_address: receiveAddress,
      delivery_address: deliveryAddress,
      amount_units: amountUnits.toString(),
      requested_units: requestedUnits.toString(),
    });
  }

  if (matches.length === 0) return held("matching_usdc_transfer_not_found");
  if (matches.length > 1) {
    return held("ambiguous_matching_usdc_transfers", {
      matching_log_indexes: matches.map((match) => match.log_index),
      match_count: matches.length,
    });
  }

  const matched = matches[0];
  const event: BuyVoidVerifiedPaymentEventV2 = {
    schema: "void_buy_void_verified_payment_event_v2",
    marker: VOID_BUY_VOID_VERIFIED_PAYMENT_V2,
    request_id: requestId,
    operator_status: "payment_verified",
    payment_verified: true,
    tx_hash: receiptTxHash,
    payment_identity_input_complete: true,
    payment_verifier: {
      chain,
      transaction_hash: receiptTxHash,
      log_index: matched.log_index,
      block_number: matched.block_number,
      confirmations: confirmations.toString(),
      usdc_contract: matched.usdc_contract,
      from_address: matched.from_address,
      receive_address: matched.receive_address,
      delivery_address: matched.delivery_address,
      amount_units: matched.amount_units,
      requested_units: matched.requested_units,
    },
  };

  return {
    ok: true,
    status: "verified",
    verified: true,
    event,
    matched_transfer: matched,
  };
}
