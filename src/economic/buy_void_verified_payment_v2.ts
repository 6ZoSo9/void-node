import type {
  BuyVoidRequestV1,
  BuyVoidVerifiedPaymentEventV1,
} from "./buy_void_auto_fulfillment_v1.js";
import { types as utilTypes } from "node:util";

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
const MAX_PAYMENT_LOG_INDEX = 0xffff_ffffn;
// Current coupled checkout uses chain-native USDC, not an env-chosen ERC-20.
const NATIVE_USDC_BY_CHAIN: Readonly<Record<string, string>> = Object.freeze({
  base: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
});
const NATIVE_CHAIN_ID_BY_CHAIN: Readonly<Record<string, number>> =
  Object.freeze({
    base: 8453,
    ethereum: 1,
  });

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

// Checkout-specific fields are optional for old generic V2 callers, but their
// presence invokes the mandatory native-USDC/original-instruction binding guard below.
export type BuyVoidVerifiedPaymentRequestV2 = BuyVoidRequestV1 & {
  payment_chain?: unknown;
  payment_chain_id?: unknown;
  usdc_contract?: unknown;
  payment_instructions?: unknown;
  launch_authority?: unknown;
};

export type BuildBuyVoidVerifiedPaymentInputV2 = {
  request: BuyVoidVerifiedPaymentRequestV2;
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


type BuyVoidDataFieldSnapshotV2 = Readonly<{
  present: boolean;
  value: unknown;
}>;

function plainDataRecordV2(
  value: unknown,
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object" ||
    utilTypes.isProxy(value) ||
    Array.isArray(value)
  ) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return null;
  }
  return value as Record<string, unknown>;
}

function ownDataFieldV2(
  recordValue: Record<string, unknown>,
  key: string,
): BuyVoidDataFieldSnapshotV2 | null {
  const descriptor = Object.getOwnPropertyDescriptor(recordValue, key);
  if (!descriptor) {
    return Object.freeze({ present: false, value: undefined });
  }
  if (
    descriptor.enumerable !== true ||
    !Object.hasOwn(descriptor, "value")
  ) {
    return null;
  }
  return Object.freeze({
    present: true,
    value: descriptor.value,
  });
}

function snapshotSelectedDataRecordV2(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> | null {
  const recordValue = plainDataRecordV2(value);
  if (!recordValue) return null;
  const out: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const field = ownDataFieldV2(recordValue, key);
    if (!field) return null;
    if (field.present) out[key] = field.value;
  }
  return out;
}

function snapshotDataArrayV2(
  value: unknown,
): readonly unknown[] | null {
  if (
    !value ||
    typeof value !== "object" ||
    utilTypes.isProxy(value) ||
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    return null;
  }
  const descriptors =
    Object.getOwnPropertyDescriptors(value) as unknown as Record<
      PropertyKey,
      PropertyDescriptor
    >;
  const ownKeys = Reflect.ownKeys(descriptors);
  const length = descriptors["length"]?.value;
  if (
    ownKeys.some((key) => typeof key !== "string") ||
    !Number.isSafeInteger(length) ||
    length < 0 ||
    ownKeys.length !== length + 1
  ) {
    return null;
  }
  const out: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      return null;
    }
    out.push(descriptor.value);
  }
  return Object.freeze(out);
}

function snapshotDataMapV2(
  value: unknown,
): Readonly<Record<string, unknown>> | null {
  const recordValue = plainDataRecordV2(value);
  if (!recordValue) return null;
  const descriptors = Object.getOwnPropertyDescriptors(recordValue);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string")) return null;
  const out: Record<string, unknown> = Object.create(null);
  for (const key of keys as string[]) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      return null;
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

const REQUEST_SNAPSHOT_KEYS_V2 = Object.freeze([
  "request_id",
  "source_chain",
  "tx_hash",
  "delivery_address",
  "receive_address",
  "usdc_amount",
  "quoted_void",
  "payment_chain",
  "payment_chain_id",
  "usdc_contract",
  "payment_instructions",
  "launch_authority",
]);

const PAYMENT_INSTRUCTION_KEYS_V2 = Object.freeze([
  "send_chain",
  "send_chain_id",
  "token_contract",
  "token_decimals",
  "send_to",
  "send_from",
]);

function snapshotRequestV2(
  value: unknown,
): BuyVoidVerifiedPaymentRequestV2 | null {
  const selected = snapshotSelectedDataRecordV2(
    value,
    REQUEST_SNAPSHOT_KEYS_V2,
  );
  if (!selected) return null;
  if (Object.hasOwn(selected, "payment_instructions")) {
    const instructions = snapshotSelectedDataRecordV2(
      selected.payment_instructions,
      PAYMENT_INSTRUCTION_KEYS_V2,
    );
    if (!instructions) return null;
    selected.payment_instructions = Object.freeze(instructions);
  }
  return Object.freeze(
    selected,
  ) as unknown as BuyVoidVerifiedPaymentRequestV2;
}

function snapshotPolicyV2(
  value: unknown,
): BuyVoidVerifiedPaymentPolicyV2 | null {
  const selected = snapshotSelectedDataRecordV2(value, [
    "allowed_chains",
    "usdc_contract_by_chain",
    "receive_address_by_chain",
    "current_block_number_by_chain",
  ]);
  if (!selected) return null;

  if (Object.hasOwn(selected, "allowed_chains")) {
    const allowed = snapshotDataArrayV2(selected.allowed_chains);
    if (!allowed) return null;
    selected.allowed_chains = allowed;
  }
  for (const key of [
    "usdc_contract_by_chain",
    "receive_address_by_chain",
    "current_block_number_by_chain",
  ]) {
    if (!Object.hasOwn(selected, key)) continue;
    const map = snapshotDataMapV2(selected[key]);
    if (!map) return null;
    selected[key] = map;
  }

  return Object.freeze(
    selected,
  ) as unknown as BuyVoidVerifiedPaymentPolicyV2;
}

const RECEIPT_LOG_KEYS_V2 = Object.freeze([
  "address",
  "topics",
  "data",
  "logIndex",
  "transactionHash",
  "blockNumber",
  "removed",
]);

function snapshotReceiptV2(
  value: unknown,
): BuyVoidTransactionReceiptV2 | null {
  const selected = snapshotSelectedDataRecordV2(value, [
    "status",
    "transactionHash",
    "blockNumber",
    "logs",
  ]);
  if (!selected) return null;
  if (Object.hasOwn(selected, "logs")) {
    const rawLogs = snapshotDataArrayV2(selected.logs);
    if (!rawLogs) return null;
    const logs: Readonly<Record<string, unknown>>[] = [];
    for (const rawLog of rawLogs) {
      const log = snapshotSelectedDataRecordV2(
        rawLog,
        RECEIPT_LOG_KEYS_V2,
      );
      if (!log) return null;
      if (Object.hasOwn(log, "topics")) {
        const topics = snapshotDataArrayV2(log.topics);
        if (!topics) return null;
        log.topics = topics;
      }
      logs.push(Object.freeze(log));
    }
    selected.logs = Object.freeze(logs);
  }
  return Object.freeze(
    selected,
  ) as unknown as BuyVoidTransactionReceiptV2;
}

function normalizeChain(value: unknown): string {
  if (typeof value !== "string") return "";
  const raw = value.trim().toLowerCase();
  const chain = raw === "eth" ? "ethereum" : raw;
  return CHAIN.test(chain) ? chain : "";
}

function normalizeAddress(value: unknown): string {
  if (typeof value !== "string") return "";
  const address = value.trim().toLowerCase();
  return ADDRESS.test(address) ? address : "";
}

function exactCheckoutChain(value: unknown, expected: string): boolean {
  return (
    typeof value === "string" &&
    value.trim().toLowerCase() === expected
  );
}

function exactCheckoutInteger(value: unknown, expected: number): boolean {
  return typeof value === "number" && value === expected;
}

function record(value: unknown): Record<string, unknown> | null {
  return plainDataRecordV2(value);
}

function normalizeHash(value: unknown): string {
  if (typeof value !== "string") return "";
  const hash = value.trim().toLowerCase();
  return HEX_32.test(hash) ? hash : "";
}

function parseNonNegativeInteger(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }

  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
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
  let raw = "";
  if (typeof value === "string") raw = value.trim();
  else if (typeof value === "number" && Number.isFinite(value)) {
    raw = String(value);
  }
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
  if (typeof value !== "string") return "";
  const topic = value.trim().toLowerCase();
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
  if (!input) return held("missing_input");
  const envelope = snapshotSelectedDataRecordV2(input, [
    "request",
    "receipt",
    "policy",
  ]);
  if (!envelope) return held("payment_input_not_plain_data");

  const rawRequest = envelope.request;
  const rawReceipt = envelope.receipt;
  const rawPolicy = envelope.policy;
  if (!rawRequest || !rawReceipt || !rawPolicy) {
    return held("missing_input");
  }

  const request = snapshotRequestV2(rawRequest);
  const receipt = snapshotReceiptV2(rawReceipt);
  const policy = snapshotPolicyV2(rawPolicy);
  if (!request || !receipt || !policy) {
    return held("payment_input_not_plain_data");
  }

  if (typeof request.request_id !== "string") {
    return held("invalid_request_id");
  }
  const requestId = request.request_id.trim();
  if (!/^[A-Za-z0-9._:-]{3,160}$/.test(requestId)) {
    return held("invalid_request_id");
  }

  const chain = normalizeChain(request.source_chain);
  if (!chain) return held("invalid_source_chain");

  if (!Array.isArray(policy.allowed_chains)) {
    return held("invalid_allowed_chains_policy");
  }
  const allowedChains = new Set(
    policy.allowed_chains.map(normalizeChain).filter(Boolean),
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

  // Pure consistency check only: original first-row chronology and custody
  // must be authenticated separately by the protected runtime/history lane.
  // Legacy V2 fixtures without any checkout/coupled evidence keep their
  // previous behavior, but are NOT production payment-admission authority.
  const original = request;
  const hasCheckoutEvidence = [
    "payment_chain",
    "payment_chain_id",
    "usdc_contract",
    "payment_instructions",
    "launch_authority",
  ].some((key) => Object.prototype.hasOwnProperty.call(original, key));
  if (hasCheckoutEvidence) {
    const originalToken = normalizeAddress(original.usdc_contract);
    if (!originalToken) {
      return held("original_request_usdc_contract_missing_or_invalid");
    }
    if (originalToken !== NATIVE_USDC_BY_CHAIN[chain]) {
      return held("original_request_non_native_usdc_contract");
    }
    if (originalToken !== usdcContract) {
      return held("verified_payment_policy_original_usdc_mismatch");
    }
  }
  if (
    !policyReceiveAddress ||
    !requestReceiveAddress ||
    policyReceiveAddress !== requestReceiveAddress
  ) {
    return held("receive_address_binding_mismatch");
  }
  if (!deliveryAddress) return held("invalid_delivery_address");

  if (hasCheckoutEvidence) {
    const expectedChainId = NATIVE_CHAIN_ID_BY_CHAIN[chain];
    if (!exactCheckoutChain(original.payment_chain, chain)) {
      return held("original_request_payment_chain_mismatch");
    }
    if (!exactCheckoutInteger(original.payment_chain_id, expectedChainId)) {
      return held("original_request_payment_chain_id_mismatch");
    }
    const instructions = record(original.payment_instructions);
    if (!instructions) {
      return held("original_request_payment_instructions_missing_or_invalid");
    }
    if (!exactCheckoutChain(instructions.send_chain, chain)) {
      return held("original_request_payment_instruction_chain_mismatch");
    }
    if (!exactCheckoutInteger(instructions.send_chain_id, expectedChainId)) {
      return held("original_request_payment_instruction_chain_id_mismatch");
    }
    if (normalizeAddress(instructions.token_contract) !== usdcContract) {
      return held("original_request_payment_instruction_token_mismatch");
    }
    if (!exactCheckoutInteger(instructions.token_decimals, 6)) {
      return held("original_request_payment_instruction_decimals_mismatch");
    }
    if (normalizeAddress(instructions.send_to) !== requestReceiveAddress) {
      return held("original_request_payment_instruction_receive_mismatch");
    }
    if (normalizeAddress(instructions.send_from) !== deliveryAddress) {
      return held("original_request_payment_instruction_sender_mismatch");
    }
  }

  const requestedUnits = decimalToUnits(request.usdc_amount, 6);
  if (requestedUnits === null || requestedUnits <= 0n) {
    return held("invalid_requested_usdc_amount");
  }

  const rawLogs = Array.isArray(receipt.logs) ? receipt.logs : [];
  const matches: BuyVoidMatchedUsdcTransferV2[] = [];
  let matchingTransferLogIndexOutOfDomain = false;

  for (const rawLog of rawLogs) {
    if (!rawLog || typeof rawLog !== "object" || Array.isArray(rawLog)) {
      continue;
    }
    const log = rawLog as BuyVoidReceiptLogV2;
    if (log.removed !== undefined && typeof log.removed !== "boolean") {
      continue;
    }
    if (log.removed === true) continue;

    const logContract = normalizeAddress(log.address);
    if (logContract !== usdcContract) continue;

    const topics = Array.isArray(log.topics) ? log.topics : [];
    if (normalizeHash(topics[0]) !== TRANSFER_TOPIC) {
      continue;
    }

    const fromAddress = topicAddress(topics[1]);
    const receiveAddress = topicAddress(topics[2]);
    if (fromAddress !== deliveryAddress) continue;
    if (receiveAddress !== policyReceiveAddress) continue;

    const amountUnits = parseNonNegativeInteger(log.data);
    if (amountUnits === null || amountUnits !== requestedUnits) continue;

    const logTxHash =
      log.transactionHash !== undefined && log.transactionHash !== null
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

    const logIndex = parseNonNegativeInteger(log.logIndex);
    if (logIndex === null) continue;
    if (logIndex > MAX_PAYMENT_LOG_INDEX) {
      matchingTransferLogIndexOutOfDomain = true;
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

  if (matchingTransferLogIndexOutOfDomain) {
    return held("log_index_exceeds_1463_domain");
  }
  if (matches.length === 0) {
    return held("matching_usdc_transfer_not_found");
  }
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
