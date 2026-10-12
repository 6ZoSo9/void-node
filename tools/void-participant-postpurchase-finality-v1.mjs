import { createHash } from "node:crypto";
import {
  Interface,
  getAddress,
  id,
} from "ethers";

export const VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1 =
  "VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1";

export const VOID_PARTICIPANT_POSTPURCHASE_FINALITY_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_input_only: true,
    injected_read_transport_required: true,
    read_only_rpc: true,
    built_in_network_transport: false,
    transaction_submission: false,
    transaction_broadcast: false,
    automatic_retry: false,
    wallet_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    market_activation: false,
    public_presale_activation: false,
  });

const EXPECTED_CHAIN_ID = 2050n;
const MAX_RECEIPT_LOGS = 1_024;
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const TRANSFER_TOPIC =
  id("Transfer(address,address,uint256)").toLowerCase();

const TRANSFER_INTERFACE = new Interface([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);

const SUBMISSION_FIELDS = Object.freeze([
  "marker",
  "version",
  "status",
  "chain_id",
  "participant_address",
  "void_token",
  "transfer_recipient",
  "transfer_amount_atoms",
  "transaction_hash",
  "delivery_transaction_hash",
  "delivery_receipt_block_number",
  "delivery_receipt_block_hash",
  "delivery_transfer_log_index",
  "delivery_receipt_evidence_fingerprint_sha256",
  "delivery_fulfillment_wallet",
  "delivered_token_amount_atoms",
  "delivery_observed_confirmation_count",
  "submission_may_have_occurred",
  "automatic_retry",
  "delivery_reconciliation_confirmed",
  "participant_signature_recovered",
  "delivery_recipient_equals_signer",
  "canonical_voidtoken_transfer_verified",
  "zero_native_value_verified",
  "zero_gas_price_policy_bound",
  "transaction_submission_performed",
  "transaction_broadcast_performed",
  "receipt_finality_verified",
  "participant_postpurchase_voidtoken_control_ready",
]);

const RECEIPT_FIELDS = Object.freeze([
  "transactionHash",
  "from",
  "to",
  "status",
  "blockNumber",
  "blockHash",
  "logs",
]);

const LOG_FIELDS = Object.freeze([
  "address",
  "topics",
  "data",
  "logIndex",
  "transactionHash",
]);

function fail(code) {
  throw new Error(code);
}

function snapshotFields(value, fields, code) {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw null;
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;
    const out = Object.create(null);
    for (const field of fields) {
      const descriptor = Object.getOwnPropertyDescriptor(value, field);
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      out[field] = descriptor.value;
    }
    return Object.freeze(out);
  } catch {
    fail(code);
  }
}

function snapshotArray(value, max, code) {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw null;
    }
    const lengthDescriptor =
      Object.getOwnPropertyDescriptor(value, "length");
    if (
      !lengthDescriptor ||
      !Object.hasOwn(lengthDescriptor, "value") ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 0 ||
      lengthDescriptor.value > max
    ) {
      throw null;
    }
    const out = [];
    for (let i = 0; i < lengthDescriptor.value; i += 1) {
      const descriptor =
        Object.getOwnPropertyDescriptor(value, String(i));
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      out.push(descriptor.value);
    }
    return out;
  } catch {
    fail(code);
  }
}

function normalizeAddress(value, code) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/u.test(value)) {
    fail(code);
  }
  try {
    const out = getAddress(value).toLowerCase();
    if (
      !ADDRESS.test(out) ||
      out === "0x0000000000000000000000000000000000000000"
    ) {
      fail(code);
    }
    return out;
  } catch {
    fail(code);
  }
}

function normalizeHash(value, code) {
  if (typeof value !== "string") fail(code);
  const out = value.toLowerCase();
  if (!HASH.test(out)) fail(code);
  return out;
}

function normalizeSha256(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function quantity(value, code, { positive = false } = {}) {
  let parsed;
  if (
    typeof value === "string" &&
    /^0x(?:0|[1-9a-f][0-9a-f]*)$/iu.test(value)
  ) {
    parsed = BigInt(value);
  } else if (typeof value === "string" && UINT.test(value)) {
    parsed = BigInt(value);
  } else if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    parsed = BigInt(value);
  } else {
    fail(code);
  }
  if (positive && parsed <= 0n) fail(code);
  return parsed;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizeSubmission(raw) {
  const value = snapshotFields(
    raw,
    SUBMISSION_FIELDS,
    "INVALID_PARTICIPANT_POSTPURCHASE_SUBMISSION_SHAPE",
  );
  if (
    value.marker !== "VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1" ||
    value.version !== 1 ||
    value.status !== "submission_accepted_finality_required" ||
    value.chain_id !== "2050" ||
    value.submission_may_have_occurred !== true ||
    value.automatic_retry !== false ||
    value.delivery_reconciliation_confirmed !== true ||
    value.participant_signature_recovered !== true ||
    value.delivery_recipient_equals_signer !== true ||
    value.canonical_voidtoken_transfer_verified !== true ||
    value.zero_native_value_verified !== true ||
    value.zero_gas_price_policy_bound !== true ||
    value.transaction_submission_performed !== true ||
    value.transaction_broadcast_performed !== true ||
    value.receipt_finality_verified !== false ||
    value.participant_postpurchase_voidtoken_control_ready !== false
  ) {
    fail("PARTICIPANT_POSTPURCHASE_SUBMISSION_NOT_FINALITY_ELIGIBLE");
  }

  const participantAddress = normalizeAddress(
    value.participant_address,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_PARTICIPANT",
  );
  const voidToken = normalizeAddress(
    value.void_token,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_TOKEN",
  );
  const transferRecipient = normalizeAddress(
    value.transfer_recipient,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_RECIPIENT",
  );
  const transferAmountAtoms = quantity(
    value.transfer_amount_atoms,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_AMOUNT",
    { positive: true },
  );
  const transactionHash = normalizeHash(
    value.transaction_hash,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_TRANSACTION_HASH",
  );

  const deliveryTransactionHash = normalizeHash(
    value.delivery_transaction_hash,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_TRANSACTION_HASH",
  );
  if (deliveryTransactionHash === transactionHash) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_CONTROL_HASH_COLLISION");
  }
  const deliveryReceiptBlockNumber = quantity(
    value.delivery_receipt_block_number,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_BLOCK_NUMBER",
    { positive: true },
  );
  const deliveryReceiptBlockHash = normalizeHash(
    value.delivery_receipt_block_hash,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_BLOCK_HASH",
  );
  const deliveryTransferLogIndex = quantity(
    value.delivery_transfer_log_index,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_LOG_INDEX",
  );
  const deliveryFingerprint = normalizeSha256(
    value.delivery_receipt_evidence_fingerprint_sha256,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_FINGERPRINT",
  );
  const deliveryFulfillmentWallet = normalizeAddress(
    value.delivery_fulfillment_wallet,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_FULFILLMENT_WALLET",
  );
  const deliveredTokenAmountAtoms = quantity(
    value.delivered_token_amount_atoms,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERED_AMOUNT",
    { positive: true },
  );
  const deliveryObservedConfirmationCount = quantity(
    value.delivery_observed_confirmation_count,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_CONFIRMATION_COUNT",
    { positive: true },
  );
  if (transferAmountAtoms > deliveredTokenAmountAtoms) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_CONTROL_EXCEEDS_DELIVERED_AMOUNT");
  }

  return Object.freeze({
    participant_address: participantAddress,
    void_token: voidToken,
    transfer_recipient: transferRecipient,
    transfer_amount_atoms: transferAmountAtoms,
    transaction_hash: transactionHash,
    delivery_transaction_hash: deliveryTransactionHash,
    delivery_receipt_block_number: deliveryReceiptBlockNumber,
    delivery_receipt_block_hash: deliveryReceiptBlockHash,
    delivery_transfer_log_index: deliveryTransferLogIndex,
    delivery_receipt_evidence_fingerprint_sha256: deliveryFingerprint,
    delivery_fulfillment_wallet: deliveryFulfillmentWallet,
    delivered_token_amount_atoms: deliveredTokenAmountAtoms,
    delivery_observed_confirmation_count: deliveryObservedConfirmationCount,
  });
}

function parseDeliveryReceipt(raw, submission) {
  const receipt = snapshotFields(
    raw,
    RECEIPT_FIELDS,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_RECEIPT_SHAPE",
  );
  const txHash = normalizeHash(
    receipt.transactionHash,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_RECEIPT_HASH",
  );
  if (txHash !== submission.delivery_transaction_hash) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_TRANSACTION_HASH_MISMATCH");
  }
  const from = normalizeAddress(
    receipt.from,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_RECEIPT_FROM",
  );
  if (from !== submission.delivery_fulfillment_wallet) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_RECEIPT_FROM_MISMATCH");
  }
  const to = normalizeAddress(
    receipt.to,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_RECEIPT_TO",
  );
  if (to !== submission.void_token) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_RECEIPT_TOKEN_MISMATCH");
  }
  if (
    quantity(
      receipt.status,
      "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_STATUS",
    ) !== 1n
  ) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_TRANSACTION_NOT_SUCCESS");
  }

  const blockNumber = quantity(
    receipt.blockNumber,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_BLOCK_NUMBER",
    { positive: true },
  );
  if (blockNumber !== submission.delivery_receipt_block_number) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_BLOCK_NUMBER_MISMATCH");
  }
  const blockHash = normalizeHash(
    receipt.blockHash,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_BLOCK_HASH",
  );
  if (blockHash !== submission.delivery_receipt_block_hash) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_BLOCK_HASH_MISMATCH");
  }

  const logs = snapshotArray(
    receipt.logs,
    MAX_RECEIPT_LOGS,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_LOG_SET",
  );
  const matches = [];
  for (const rawLog of logs) {
    const log = snapshotFields(
      rawLog,
      LOG_FIELDS,
      "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_LOG_SHAPE",
    );
    if (
      normalizeAddress(
        log.address,
        "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_LOG_ADDRESS",
      ) !== submission.void_token
    ) {
      continue;
    }
    const topics = snapshotArray(
      log.topics,
      4,
      "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_TOPIC_SET",
    );
    if (
      topics.length === 0 ||
      typeof topics[0] !== "string" ||
      topics[0].toLowerCase() !== TRANSFER_TOPIC
    ) {
      continue;
    }
    if (
      normalizeHash(
        log.transactionHash,
        "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_LOG_TRANSACTION_HASH",
      ) !== submission.delivery_transaction_hash
    ) {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_LOG_TRANSACTION_MISMATCH");
    }
    let parsed;
    try {
      parsed = TRANSFER_INTERFACE.parseLog({
        topics,
        data: String(log.data || ""),
      });
    } catch {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_TRANSFER_LOG_DECODE_FAILED");
    }
    if (!parsed || parsed.name !== "Transfer") {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_TRANSFER_LOG_DECODE_FAILED");
    }
    matches.push(Object.freeze({
      from: normalizeAddress(
        String(parsed.args[0]),
        "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_TRANSFER_FROM",
      ),
      to: normalizeAddress(
        String(parsed.args[1]),
        "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_TRANSFER_TO",
      ),
      value: BigInt(parsed.args[2]),
      log_index: quantity(
        log.logIndex,
        "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_LOG_INDEX",
      ),
    }));
  }

  if (matches.length !== 1) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_EXACT_ONE_DELIVERY_TRANSFER_REQUIRED");
  }
  const transfer = matches[0];
  if (transfer.from !== submission.delivery_fulfillment_wallet) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_TRANSFER_FROM_MISMATCH");
  }
  if (transfer.to !== submission.participant_address) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_TRANSFER_TO_MISMATCH");
  }
  if (transfer.value !== submission.delivered_token_amount_atoms) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_TRANSFER_AMOUNT_MISMATCH");
  }
  if (transfer.log_index !== submission.delivery_transfer_log_index) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_LOG_INDEX_MISMATCH");
  }

  const fingerprint = createHash("sha256").update(
    [
      "chain_id=2050",
      "transaction_hash=" + txHash,
      "receipt_block_number=" + blockNumber.toString(),
      "receipt_block_hash=" + blockHash,
      "void_token_address=" + submission.void_token,
      "transfer_from=" + transfer.from,
      "transfer_to=" + transfer.to,
      "token_amount_atoms=" + transfer.value.toString(),
      "transfer_log_index=" + transfer.log_index.toString(),
    ].join("\n"),
  ).digest("hex");
  if (fingerprint !== submission.delivery_receipt_evidence_fingerprint_sha256) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_FINGERPRINT_MISMATCH");
  }

  return Object.freeze({
    transaction_hash: txHash,
    from,
    to,
    block_number: blockNumber,
    block_hash: blockHash,
    transfer_from: transfer.from,
    transfer_to: transfer.to,
    transfer_value: transfer.value,
    transfer_log_index: transfer.log_index,
    receipt_evidence_fingerprint_sha256: fingerprint,
  });
}

function parseReceipt(raw, submission) {
  const receipt = snapshotFields(
    raw,
    RECEIPT_FIELDS,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_SHAPE",
  );
  const txHash = normalizeHash(
    receipt.transactionHash,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_HASH",
  );
  if (txHash !== submission.transaction_hash) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_TRANSACTION_HASH_MISMATCH");
  }
  const from = normalizeAddress(
    receipt.from,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_FROM",
  );
  if (from !== submission.participant_address) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_FROM_MISMATCH");
  }
  const to = normalizeAddress(
    receipt.to,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_TO",
  );
  if (to !== submission.void_token) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_TOKEN_MISMATCH");
  }
  if (
    quantity(
      receipt.status,
      "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_STATUS",
    ) !== 1n
  ) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_TRANSACTION_NOT_SUCCESS");
  }
  const blockNumber = quantity(
    receipt.blockNumber,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_BLOCK_NUMBER",
    { positive: true },
  );
  const blockHash = normalizeHash(
    receipt.blockHash,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_BLOCK_HASH",
  );

  const logs = snapshotArray(
    receipt.logs,
    MAX_RECEIPT_LOGS,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_LOG_SET",
  );
  const matches = [];
  for (const rawLog of logs) {
    const log = snapshotFields(
      rawLog,
      LOG_FIELDS,
      "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_LOG_SHAPE",
    );
    if (
      normalizeAddress(
        log.address,
        "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_LOG_ADDRESS",
      ) !== submission.void_token
    ) {
      continue;
    }
    const topics = snapshotArray(
      log.topics,
      4,
      "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_TOPIC_SET",
    );
    if (
      topics.length === 0 ||
      typeof topics[0] !== "string" ||
      topics[0].toLowerCase() !== TRANSFER_TOPIC
    ) {
      continue;
    }
    if (
      normalizeHash(
        log.transactionHash,
        "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_LOG_TRANSACTION_HASH",
      ) !== submission.transaction_hash
    ) {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_LOG_TRANSACTION_MISMATCH");
    }
    let parsed;
    try {
      parsed = TRANSFER_INTERFACE.parseLog({
        topics,
        data: String(log.data || ""),
      });
    } catch {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_TRANSFER_LOG_DECODE_FAILED");
    }
    if (!parsed || parsed.name !== "Transfer") {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_TRANSFER_LOG_DECODE_FAILED");
    }
    matches.push(Object.freeze({
      from: normalizeAddress(
        String(parsed.args[0]),
        "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_TRANSFER_FROM",
      ),
      to: normalizeAddress(
        String(parsed.args[1]),
        "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_TRANSFER_TO",
      ),
      value: BigInt(parsed.args[2]),
      log_index: quantity(
        log.logIndex,
        "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_LOG_INDEX",
      ),
    }));
  }
  if (matches.length !== 1) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_EXACT_ONE_TRANSFER_REQUIRED");
  }
  const transfer = matches[0];
  if (transfer.from !== submission.participant_address) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_TRANSFER_FROM_MISMATCH");
  }
  if (transfer.to !== submission.transfer_recipient) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_TRANSFER_TO_MISMATCH");
  }
  if (transfer.value !== submission.transfer_amount_atoms) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_TRANSFER_AMOUNT_MISMATCH");
  }

  return Object.freeze({
    transaction_hash: txHash,
    from,
    to,
    block_number: blockNumber,
    block_hash: blockHash,
    transfer_from: transfer.from,
    transfer_to: transfer.to,
    transfer_value: transfer.value,
    transfer_log_index: transfer.log_index,
  });
}

function sameReceipt(left, right) {
  return (
    left.transaction_hash === right.transaction_hash &&
    left.from === right.from &&
    left.to === right.to &&
    left.block_number === right.block_number &&
    left.block_hash === right.block_hash &&
    left.transfer_from === right.transfer_from &&
    left.transfer_to === right.transfer_to &&
    left.transfer_value === right.transfer_value &&
    left.transfer_log_index === right.transfer_log_index
  );
}

export async function verifyVoidParticipantPostpurchaseFinalityV1({
  submission,
  min_confirmations,
  transport,
}) {
  const normalizedSubmission = normalizeSubmission(submission);
  const minimum = quantity(
    min_confirmations,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_MIN_CONFIRMATIONS",
    { positive: true },
  );
  if (minimum > 1_000n) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_MIN_CONFIRMATIONS_TOO_LARGE");
  }
  if (typeof transport !== "function") {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_INJECTED_TRANSPORT_REQUIRED");
  }

  const methods = [];
  const call = async (method, params) => {
    if (![
      "eth_chainId",
      "eth_getTransactionReceipt",
      "eth_blockNumber",
    ].includes(method)) {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_RPC_METHOD_FORBIDDEN");
    }
    methods.push(method);
    return await transport(Object.freeze({ method, params: Object.freeze(params) }));
  };

  const chain = quantity(
    await call("eth_chainId", []),
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_CHAIN_ID",
  );
  if (chain !== EXPECTED_CHAIN_ID) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_CHAIN_ID_MISMATCH");
  }

  const firstDeliveryRaw = await call(
    "eth_getTransactionReceipt",
    [normalizedSubmission.delivery_transaction_hash],
  );
  if (firstDeliveryRaw === null) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_RECEIPT_NOT_FOUND");
  }
  const firstDelivery = parseDeliveryReceipt(
    firstDeliveryRaw,
    normalizedSubmission,
  );

  const firstRaw = await call(
    "eth_getTransactionReceipt",
    [normalizedSubmission.transaction_hash],
  );
  if (firstRaw === null) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_NOT_FOUND");
  }
  const first = parseReceipt(firstRaw, normalizedSubmission);
  if (first.block_number < firstDelivery.block_number) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_CONTROL_BEFORE_DELIVERY");
  }

  const head = quantity(
    await call("eth_blockNumber", []),
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_HEAD",
  );
  if (head < firstDelivery.block_number) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_HEAD_BEFORE_DELIVERY");
  }
  const deliveryConfirmations =
    head - firstDelivery.block_number + 1n;
  if (
    deliveryConfirmations <
    normalizedSubmission.delivery_observed_confirmation_count
  ) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_CONFIRMATION_REGRESSION");
  }

  if (head < first.block_number) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_HEAD_BEFORE_RECEIPT");
  }
  const confirmations = head - first.block_number + 1n;
  if (confirmations < minimum) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_CONFIRMATIONS_INSUFFICIENT");
  }

  const secondDeliveryRaw = await call(
    "eth_getTransactionReceipt",
    [normalizedSubmission.delivery_transaction_hash],
  );
  if (secondDeliveryRaw === null) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_RECEIPT_REVALIDATION_MISSING");
  }
  const secondDelivery = parseDeliveryReceipt(
    secondDeliveryRaw,
    normalizedSubmission,
  );
  if (!sameReceipt(firstDelivery, secondDelivery)) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_DELIVERY_RECEIPT_CHANGED");
  }

  const secondRaw = await call(
    "eth_getTransactionReceipt",
    [normalizedSubmission.transaction_hash],
  );
  if (secondRaw === null) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_REVALIDATION_MISSING");
  }
  const second = parseReceipt(secondRaw, normalizedSubmission);
  if (!sameReceipt(first, second)) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_CHANGED");
  }

  const payload = Object.freeze({
    schema: "void.participant-postpurchase-finality-evidence.v1",
    chain_id: 2050,
    execution_epoch: 2,
    delivery_transaction_hash: firstDelivery.transaction_hash,
    delivery_receipt_evidence_fingerprint_sha256:
      firstDelivery.receipt_evidence_fingerprint_sha256,
    delivery_fulfillment_wallet: firstDelivery.from,
    delivered_token_amount_atoms:
      firstDelivery.transfer_value.toString(),
    delivery_transfer_log_index:
      firstDelivery.transfer_log_index.toString(),
    delivery_receipt_block_number:
      firstDelivery.block_number.toString(),
    delivery_receipt_block_hash: firstDelivery.block_hash,
    delivery_observed_confirmation_count:
      normalizedSubmission.delivery_observed_confirmation_count.toString(),
    delivery_current_confirmation_count:
      deliveryConfirmations.toString(),
    transaction_hash: first.transaction_hash,
    participant_address: first.from,
    void_token: first.to,
    transfer_recipient: first.transfer_to,
    transfer_amount_atoms: first.transfer_value.toString(),
    transfer_log_index: first.transfer_log_index.toString(),
    receipt_block_number: first.block_number.toString(),
    receipt_block_hash: first.block_hash,
    observed_confirmation_count: confirmations.toString(),
    required_confirmation_count: minimum.toString(),
  });

  return Object.freeze({
    marker: VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
    ...payload,
    evidence_id: digest(payload),
    rpc_methods_used: Object.freeze([...methods]),
    exact_delivery_receipt_binding_verified: true,
    stable_delivery_receipt_revalidation_verified: true,
    delivery_to_control_participant_binding_verified: true,
    exact_submission_receipt_binding_verified: true,
    exact_voidtoken_transfer_finality_verified: true,
    stable_receipt_revalidation_verified: true,
    participant_postpurchase_voidtoken_control_finality_source_ready: true,
    runtime_or_launch_evidence: false,
    runtime_route_active: false,
    public_submission_open: false,
    transaction_submission_performed: false,
    transaction_broadcast_performed: false,
    authoritative_chain2050_write_performed: false,
    token_movement_performed_by_this_verifier: false,
    funds_movement_performed_by_this_verifier: false,
    authority: VOID_PARTICIPANT_POSTPURCHASE_FINALITY_AUTHORITY_V1,
  });
}
