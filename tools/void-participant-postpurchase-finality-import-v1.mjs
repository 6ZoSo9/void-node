#!/usr/bin/env node
import { createHash } from "node:crypto";

import {
  VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1,
} from "./void-participant-postpurchase-finality-v1.mjs";

export const VOID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_V1 =
  "VOID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_V1";

export const VOID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_AUTHORITY_V1 =
  Object.freeze({
    source_evidence_validation_only: true,
    coupled_gate_binding_derivation: true,
    filesystem_read: false,
    filesystem_write: false,
    credential_access: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    rpc_call: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    token_movement: false,
    funds_movement: false,
    market_activation: false,
    public_presale_activation: false,
  });

const CANONICAL_VOID_TOKEN =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";
const ADDRESS = /^0x[0-9a-f]{40}$/u;
const HASH = /^0x[0-9a-f]{64}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const EVIDENCE_ID = /^sha256:[0-9a-f]{64}$/u;
const BINDING_ID = /^voidppfrb1_[0-9a-f]{64}$/u;
const IMPORT_ID = /^voidppfri1_[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_UINT_DIGITS = 78;

const INPUT_KEYS = Object.freeze([
  "expected",
  "evidence",
]);

const EXPECTED_KEYS = Object.freeze([
  "delivery_transaction_hash",
  "delivery_receipt_evidence_fingerprint_sha256",
  "participant_address",
  "delivered_token_amount_atoms",
  "control_transaction_hash",
  "control_transfer_recipient",
  "control_transfer_amount_atoms",
  "control_receipt_block_number",
  "control_receipt_block_hash",
  "control_transfer_log_index",
  "minimum_delivery_confirmation_count",
  "minimum_control_confirmation_count",
]);

const PAYLOAD_KEYS = Object.freeze([
  "schema",
  "chain_id",
  "execution_epoch",
  "delivery_transaction_hash",
  "delivery_receipt_evidence_fingerprint_sha256",
  "delivery_fulfillment_wallet",
  "delivered_token_amount_atoms",
  "delivery_transfer_log_index",
  "delivery_receipt_block_number",
  "delivery_receipt_block_hash",
  "delivery_observed_confirmation_count",
  "delivery_current_confirmation_count",
  "transaction_hash",
  "participant_address",
  "void_token",
  "transfer_recipient",
  "transfer_amount_atoms",
  "transfer_log_index",
  "receipt_block_number",
  "receipt_block_hash",
  "observed_confirmation_count",
  "required_confirmation_count",
]);

const RECEIPT_KEYS = Object.freeze([
  "marker",
  ...PAYLOAD_KEYS,
  "evidence_id",
  "rpc_methods_used",
  "exact_delivery_receipt_binding_verified",
  "stable_delivery_receipt_revalidation_verified",
  "delivery_to_control_participant_binding_verified",
  "exact_submission_receipt_binding_verified",
  "exact_voidtoken_transfer_finality_verified",
  "stable_receipt_revalidation_verified",
  "participant_postpurchase_voidtoken_control_finality_source_ready",
  "runtime_or_launch_evidence",
  "runtime_route_active",
  "public_submission_open",
  "transaction_submission_performed",
  "transaction_broadcast_performed",
  "authoritative_chain2050_write_performed",
  "token_movement_performed_by_this_verifier",
  "funds_movement_performed_by_this_verifier",
  "authority",
]);

const AUTHORITY_KEYS = Object.freeze([
  "source_only",
  "explicit_input_only",
  "injected_read_transport_required",
  "read_only_rpc",
  "built_in_network_transport",
  "transaction_submission",
  "transaction_broadcast",
  "automatic_retry",
  "wallet_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "authoritative_chain2050_write",
  "token_movement",
  "funds_movement",
  "market_activation",
  "public_presale_activation",
]);

const REQUIRED_RPC_METHODS = Object.freeze([
  "eth_chainId",
  "eth_getTransactionReceipt",
  "eth_blockNumber",
]);

function fail(code) {
  throw new Error(code);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, code) {
  if (!plain(value)) fail(code);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.some((key) => typeof key !== "string")) fail(code);
  const sorted = actual.sort();
  const expected = [...keys].sort();
  if (
    sorted.length !== expected.length ||
    sorted.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  const out = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value")
    ) {
      fail(code);
    }
    out[key] = descriptor.value;
  }
  return Object.freeze(out);
}

function exactArray(value, code) {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype ||
    value.length < 1 ||
    value.length > 1024
  ) {
    fail(code);
  }
  const out = [];
  for (const item of value) {
    if (typeof item !== "string") fail(code);
    out.push(item);
  }
  return Object.freeze(out);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (plain(value)) {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  fail("INVALID_CANONICAL_VALUE");
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function address(value, code) {
  if (typeof value !== "string") fail(code);
  const lower = value.toLowerCase();
  if (!ADDRESS.test(lower) || lower === ZERO_ADDRESS) fail(code);
  return lower;
}

function hash(value, code) {
  if (typeof value !== "string") fail(code);
  const lower = value.toLowerCase();
  if (!HASH.test(lower)) fail(code);
  return lower;
}

function sha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function uint(value, code, { positive = false } = {}) {
  if (
    typeof value !== "string" ||
    value.length > MAX_UINT_DIGITS ||
    !UINT.test(value)
  ) {
    fail(code);
  }
  const parsed = BigInt(value);
  if (positive && parsed <= 0n) fail(code);
  return parsed;
}

function payloadFromReceipt(receipt) {
  const payload = Object.create(null);
  for (const key of PAYLOAD_KEYS) payload[key] = receipt[key];
  return payload;
}

function expectedBinding(raw) {
  const value = exactObject(
    raw,
    EXPECTED_KEYS,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_SHAPE",
  );
  const normalized = Object.freeze({
    delivery_transaction_hash: hash(
      value.delivery_transaction_hash,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_DELIVERY_HASH_INVALID",
    ),
    delivery_receipt_evidence_fingerprint_sha256: sha(
      value.delivery_receipt_evidence_fingerprint_sha256,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_DELIVERY_FINGERPRINT_INVALID",
    ),
    participant_address: address(
      value.participant_address,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_PARTICIPANT_INVALID",
    ),
    delivered_token_amount_atoms: uint(
      value.delivered_token_amount_atoms,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_DELIVERED_AMOUNT_INVALID",
      { positive: true },
    ),
    control_transaction_hash: hash(
      value.control_transaction_hash,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_CONTROL_HASH_INVALID",
    ),
    control_transfer_recipient: address(
      value.control_transfer_recipient,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_CONTROL_RECIPIENT_INVALID",
    ),
    control_transfer_amount_atoms: uint(
      value.control_transfer_amount_atoms,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_CONTROL_AMOUNT_INVALID",
      { positive: true },
    ),
    control_receipt_block_number: uint(
      value.control_receipt_block_number,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_CONTROL_BLOCK_INVALID",
      { positive: true },
    ),
    control_receipt_block_hash: hash(
      value.control_receipt_block_hash,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_CONTROL_BLOCK_HASH_INVALID",
    ),
    control_transfer_log_index: uint(
      value.control_transfer_log_index,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_CONTROL_LOG_INDEX_INVALID",
    ),
    minimum_delivery_confirmation_count: uint(
      value.minimum_delivery_confirmation_count,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_MINIMUM_DELIVERY_CONFIRMATIONS_INVALID",
      { positive: true },
    ),
    minimum_control_confirmation_count: uint(
      value.minimum_control_confirmation_count,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_MINIMUM_CONTROL_CONFIRMATIONS_INVALID",
      { positive: true },
    ),
  });
  const body = Object.freeze({
    delivery_transaction_hash: normalized.delivery_transaction_hash,
    delivery_receipt_evidence_fingerprint_sha256:
      normalized.delivery_receipt_evidence_fingerprint_sha256,
    participant_address: normalized.participant_address,
    delivered_token_amount_atoms:
      normalized.delivered_token_amount_atoms.toString(),
    control_transaction_hash: normalized.control_transaction_hash,
    control_transfer_recipient: normalized.control_transfer_recipient,
    control_transfer_amount_atoms:
      normalized.control_transfer_amount_atoms.toString(),
    control_receipt_block_number:
      normalized.control_receipt_block_number.toString(),
    control_receipt_block_hash: normalized.control_receipt_block_hash,
    control_transfer_log_index:
      normalized.control_transfer_log_index.toString(),
    minimum_delivery_confirmation_count:
      normalized.minimum_delivery_confirmation_count.toString(),
    minimum_control_confirmation_count:
      normalized.minimum_control_confirmation_count.toString(),
  });
  return Object.freeze({
    ...normalized,
    binding_id:
      "voidppfrb1_" + sha256Text(canonicalJson(body)),
  });
}

function validateAuthority(raw) {
  const authority = exactObject(
    raw,
    AUTHORITY_KEYS,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_AUTHORITY_SHAPE_INVALID",
  );
  for (const key of AUTHORITY_KEYS) {
    const expected =
      key === "source_only" ||
      key === "explicit_input_only" ||
      key === "injected_read_transport_required" ||
      key === "read_only_rpc";
    if (authority[key] !== expected) {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_AUTHORITY_MISMATCH");
    }
  }
}

function validateRpcMethods(raw) {
  const methods = exactArray(
    raw,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_RPC_METHOD_SET_INVALID",
  );
  const allowed = new Set(REQUIRED_RPC_METHODS);
  for (const method of methods) {
    if (!allowed.has(method)) {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_RPC_METHOD_FORBIDDEN");
    }
  }
  for (const method of REQUIRED_RPC_METHODS) {
    if (!methods.includes(method)) {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_RPC_METHOD_MISSING");
    }
  }
}

export function importVoidParticipantPostpurchaseFinalityV1(input) {
  const request = exactObject(
    input,
    INPUT_KEYS,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_INPUT_SHAPE",
  );
  const expected = expectedBinding(request.expected);
  if (!BINDING_ID.test(expected.binding_id)) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_BINDING_ID_INVALID");
  }

  const receipt = exactObject(
    request.evidence,
    RECEIPT_KEYS,
    "INVALID_PARTICIPANT_POSTPURCHASE_FINALITY_RECEIPT_SHAPE",
  );
  if (
    receipt.marker !== VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1 ||
    receipt.schema !==
      "void.participant-postpurchase-finality-evidence.v1" ||
    receipt.chain_id !== 2050 ||
    receipt.execution_epoch !== 2
  ) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_RECEIPT_IDENTITY_MISMATCH");
  }

  const evidenceId =
    "sha256:" + sha256Text(canonicalJson(payloadFromReceipt(receipt)));
  if (
    typeof receipt.evidence_id !== "string" ||
    !EVIDENCE_ID.test(receipt.evidence_id) ||
    receipt.evidence_id !== evidenceId
  ) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EVIDENCE_ID_MISMATCH");
  }

  const deliveryHash = hash(
    receipt.delivery_transaction_hash,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_DELIVERY_HASH_INVALID",
  );
  const deliveryFingerprint = sha(
    receipt.delivery_receipt_evidence_fingerprint_sha256,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_DELIVERY_FINGERPRINT_INVALID",
  );
  const participant = address(
    receipt.participant_address,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_PARTICIPANT_INVALID",
  );
  const fulfillmentWallet = address(
    receipt.delivery_fulfillment_wallet,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_FULFILLMENT_WALLET_INVALID",
  );
  const deliveryBlock = uint(
    receipt.delivery_receipt_block_number,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_DELIVERY_BLOCK_INVALID",
    { positive: true },
  );
  const deliveryBlockHash = hash(
    receipt.delivery_receipt_block_hash,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_DELIVERY_BLOCK_HASH_INVALID",
  );
  const deliveryLogIndex = uint(
    receipt.delivery_transfer_log_index,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_DELIVERY_LOG_INDEX_INVALID",
  );
  const deliveredAmount = uint(
    receipt.delivered_token_amount_atoms,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_DELIVERED_AMOUNT_INVALID",
    { positive: true },
  );

  const recomputedDeliveryFingerprint = sha256Text(
    [
      "chain_id=2050",
      "transaction_hash=" + deliveryHash,
      "receipt_block_number=" + deliveryBlock.toString(),
      "receipt_block_hash=" + deliveryBlockHash,
      "void_token_address=" + CANONICAL_VOID_TOKEN,
      "transfer_from=" + fulfillmentWallet,
      "transfer_to=" + participant,
      "token_amount_atoms=" + deliveredAmount.toString(),
      "transfer_log_index=" + deliveryLogIndex.toString(),
    ].join("\n"),
  );
  if (
    recomputedDeliveryFingerprint !== deliveryFingerprint ||
    recomputedDeliveryFingerprint !==
      expected.delivery_receipt_evidence_fingerprint_sha256
  ) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_DELIVERY_FINGERPRINT_MISMATCH");
  }

  const controlHash = hash(
    receipt.transaction_hash,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_HASH_INVALID",
  );
  const recipient = address(
    receipt.transfer_recipient,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_RECIPIENT_INVALID",
  );
  const controlAmount = uint(
    receipt.transfer_amount_atoms,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_AMOUNT_INVALID",
    { positive: true },
  );
  const controlLogIndex = uint(
    receipt.transfer_log_index,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_LOG_INDEX_INVALID",
  );
  const controlBlock = uint(
    receipt.receipt_block_number,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_BLOCK_INVALID",
    { positive: true },
  );
  const controlBlockHash = hash(
    receipt.receipt_block_hash,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_BLOCK_HASH_INVALID",
  );

  if (
    deliveryHash !== expected.delivery_transaction_hash ||
    deliveryFingerprint !==
      expected.delivery_receipt_evidence_fingerprint_sha256 ||
    participant !== expected.participant_address ||
    deliveredAmount !== expected.delivered_token_amount_atoms ||
    controlHash !== expected.control_transaction_hash ||
    recipient !== expected.control_transfer_recipient ||
    controlAmount !== expected.control_transfer_amount_atoms ||
    controlBlock !== expected.control_receipt_block_number ||
    controlBlockHash !== expected.control_receipt_block_hash ||
    controlLogIndex !== expected.control_transfer_log_index
  ) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_EXPECTED_BINDING_MISMATCH");
  }

  if (
    address(
      receipt.void_token,
      "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_TOKEN_INVALID",
    ) !== CANONICAL_VOID_TOKEN
  ) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CANONICAL_TOKEN_MISMATCH");
  }

  if (controlBlock < deliveryBlock) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_BEFORE_DELIVERY");
  }

  const deliveryObserved = uint(
    receipt.delivery_observed_confirmation_count,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_DELIVERY_OBSERVED_CONFIRMATIONS_INVALID",
    { positive: true },
  );
  const deliveryCurrent = uint(
    receipt.delivery_current_confirmation_count,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_DELIVERY_CURRENT_CONFIRMATIONS_INVALID",
    { positive: true },
  );
  const controlObserved = uint(
    receipt.observed_confirmation_count,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_CONFIRMATIONS_INVALID",
    { positive: true },
  );
  const controlRequired = uint(
    receipt.required_confirmation_count,
    "PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_REQUIRED_CONFIRMATIONS_INVALID",
    { positive: true },
  );
  if (deliveryCurrent < deliveryObserved) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_DELIVERY_CONFIRMATION_REGRESSION");
  }
  if (controlObserved < controlRequired) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_CONFIRMATION_CONTRACT_MISMATCH");
  }
  if (
    deliveryCurrent < expected.minimum_delivery_confirmation_count ||
    controlObserved < expected.minimum_control_confirmation_count
  ) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_FINALITY_HOLD");
  }

  if (controlAmount > deliveredAmount) {
    fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_CONTROL_EXCEEDS_DELIVERED_AMOUNT");
  }

  for (const key of [
    "exact_delivery_receipt_binding_verified",
    "stable_delivery_receipt_revalidation_verified",
    "delivery_to_control_participant_binding_verified",
    "exact_submission_receipt_binding_verified",
    "exact_voidtoken_transfer_finality_verified",
    "stable_receipt_revalidation_verified",
    "participant_postpurchase_voidtoken_control_finality_source_ready",
  ]) {
    if (receipt[key] !== true) {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_REQUIRED_PROOF_MISSING");
    }
  }
  for (const key of [
    "runtime_or_launch_evidence",
    "runtime_route_active",
    "public_submission_open",
    "transaction_submission_performed",
    "transaction_broadcast_performed",
    "authoritative_chain2050_write_performed",
    "token_movement_performed_by_this_verifier",
    "funds_movement_performed_by_this_verifier",
  ]) {
    if (receipt[key] !== false) {
      fail("PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_RUNTIME_OR_AUTHORITY_MISMATCH");
    }
  }

  validateAuthority(receipt.authority);
  validateRpcMethods(receipt.rpc_methods_used);

  const body = Object.freeze({
    marker: VOID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_V1,
    version: 1,
    status: "VERIFIED_FINALITY_EVIDENCE_IMPORT",
    binding_id: expected.binding_id,
    source_evidence_id: receipt.evidence_id,
    chain_id: 2050,
    execution_epoch: 2,
    delivery_transaction_hash: deliveryHash,
    delivery_receipt_evidence_fingerprint_sha256:
      deliveryFingerprint,
    delivery_fulfillment_wallet: fulfillmentWallet,
    delivery_receipt_block_number: deliveryBlock.toString(),
    delivery_receipt_block_hash: deliveryBlockHash,
    delivery_transfer_log_index: deliveryLogIndex.toString(),
    participant_address: participant,
    delivered_token_amount_atoms: deliveredAmount.toString(),
    control_transaction_hash: controlHash,
    control_transfer_recipient: recipient,
    control_transfer_amount_atoms: controlAmount.toString(),
    control_receipt_block_number: controlBlock.toString(),
    control_receipt_block_hash: controlBlockHash,
    control_transfer_log_index: controlLogIndex.toString(),
    minimum_delivery_confirmation_count:
      expected.minimum_delivery_confirmation_count.toString(),
    minimum_control_confirmation_count:
      expected.minimum_control_confirmation_count.toString(),
    observed_delivery_confirmation_count:
      deliveryCurrent.toString(),
    observed_control_confirmation_count:
      controlObserved.toString(),
  });

  return Object.freeze({
    ok: true,
    ...body,
    import_id:
      "voidppfri1_" + sha256Text(canonicalJson(body)),
    participant_control_finality_evidence_imported: true,
    participant_post_purchase_voidtoken_control_ready: false,
    production_runtime_binding_required: true,
    coupled_candidate_updated: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority:
      VOID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_AUTHORITY_V1,
  });
}
