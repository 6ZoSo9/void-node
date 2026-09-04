import { createHash } from "node:crypto";

export const VOID_BUY_VOID_CHAIN2050_PRESALE_SETTLEMENT_V1 =
  "VOID_BUY_VOID_CHAIN2050_PRESALE_SETTLEMENT_V1";
export const VOID_BUY_VOID_CHAIN2050_PRESALE_STATE_V1 =
  "VOID_BUY_VOID_CHAIN2050_PRESALE_STATE_V1";
export const VOID_BUY_VOID_CHAIN2050_PRESALE_FULFILLMENT_V1 =
  "VOID_BUY_VOID_CHAIN2050_PRESALE_FULFILLMENT_V1";

export const VOID_BUY_VOID_CHAIN2050_PRESALE_CONSTANTS_V1 = Object.freeze({
  chain_id: "2050",
  pool_id: "buy-void-presale-v1",
  policy_id: "void-buy-void-presale-policy-v1",
  initial_inventory_void_atoms: "10000000000000",
  void_decimals: 6,
  usdc_decimals: 6,
  rate_void_atoms_numerator: "2",
  rate_void_atoms_denominator: "1",
  exact_payment_required: true,
  one_payment_one_fulfillment: true,
  one_delivery_event_one_payment: true,
  no_hidden_minimum: true,
  no_per_buyer_throttle_below_remaining_inventory: true,
});

export const VOID_BUY_VOID_CHAIN2050_PRESALE_AUTHORITY_V1 = Object.freeze({
  source_only_reference_machine: true,
  chain_state_mutation: false,
  rpc_call: false,
  filesystem_read: false,
  filesystem_write: false,
  wallet_access: false,
  signer_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  inventory_funding: false,
  public_presale_activation: false,
  money_movement: false,
});

export const C = VOID_BUY_VOID_CHAIN2050_PRESALE_CONSTANTS_V1;
export const INITIAL = BigInt(C.initial_inventory_void_atoms);
export const MAX_U64 = (1n << 64n) - 1n;
const MAX_U256 = (1n << 256n) - 1n;
const HEX64 = /^[0-9a-f]{64}$/;
const HASH32 = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const ID = /^[A-Za-z0-9._:-]{1,160}$/;

export function fail(code, detail = "") {
  const error = new Error(`${VOID_BUY_VOID_CHAIN2050_PRESALE_SETTLEMENT_V1}:${code}:${detail}`);
  error.code = code;
  error.detail = detail;
  throw error;
}
export function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = Object.getPrototypeOf(value);
  return p === Object.prototype || p === null;
}
export function keys(value, expected, code) {
  if (!plain(value)) fail(code, "not_object");
  const a = Object.keys(value).sort();
  const b = [...expected].sort();
  if (a.length !== b.length || a.some((key, i) => key !== b[i])) {
    fail(code, `expected=${b};actual=${a}`);
  }
}
export function canonical(value) {
  if (value === null) return "null";
  if (["string", "boolean"].includes(typeof value)) return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("NON_CANONICAL_NUMBER", String(value));
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (plain(value)) {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  }
  fail("NON_CANONICAL_VALUE", typeof value);
}
export function sha(value) {
  return createHash("sha256").update(value).digest("hex");
}
export function domain(name, value) {
  return sha(`${name}\0${canonical(value)}`);
}
export function text(value) {
  return String(value ?? "").trim();
}
export function exact(value, expected, code) {
  if (value !== expected) fail(code, `expected=${expected};actual=${String(value)}`);
  return expected;
}
export function hex64(value, code) {
  const out = text(value).toLowerCase();
  if (!HEX64.test(out)) fail(code, out || "empty");
  return out;
}
export function hash32(value, code) {
  const out = text(value).toLowerCase();
  if (!HASH32.test(out)) fail(code, out || "empty");
  return out;
}
export function address(value, code) {
  const out = text(value).toLowerCase();
  if (!ADDRESS.test(out)) fail(code, out || "empty");
  return out;
}
export function uint(value, code, { positive = false, max = MAX_U256 } = {}) {
  const out = text(value);
  if (!UINT.test(out)) fail(code, out || "empty");
  const n = BigInt(out);
  if ((positive && n === 0n) || n > max) fail(code, out);
  return n;
}
export function sourceChain(value) {
  const raw = text(value).toLowerCase();
  const out = raw === "eth" ? "ethereum" : raw;
  if (out !== "base" && out !== "ethereum") fail("INVALID_SOURCE_CHAIN", raw);
  return out;
}
export function sourceChainId(chain) {
  return chain === "base" ? "8453" : "1";
}
export function safeId(value, code) {
  const out = text(value);
  if (!ID.test(out)) fail(code, out || "empty");
  return out;
}

export function canonicalBuyVoidPaymentIdentityV1(input) {
  keys(input, ["source_chain", "source_transaction_hash", "source_log_index"], "PAYMENT_IDENTITY_SHAPE");
  const chain = sourceChain(input.source_chain);
  const tx = hash32(input.source_transaction_hash, "INVALID_SOURCE_TRANSACTION_HASH");
  const log = uint(input.source_log_index, "INVALID_SOURCE_LOG_INDEX", { max: MAX_U64 });
  return `voidpay1:${chain}:${tx}:${log}`;
}
export function canonicalBuyVoidPaymentKeySha256V1(input) {
  return sha(canonicalBuyVoidPaymentIdentityV1(input));
}
export function canonicalChain2050DeliveryEventIdentityV1(input) {
  keys(input, ["chain_id", "transaction_hash", "log_index"], "DELIVERY_IDENTITY_SHAPE");
  exact(input.chain_id, "2050", "INVALID_DELIVERY_CHAIN_ID");
  const tx = hash32(input.transaction_hash, "INVALID_DELIVERY_TRANSACTION_HASH");
  const log = uint(input.log_index, "INVALID_DELIVERY_LOG_INDEX", { max: MAX_U64 });
  return `voiddelivery1:2050:${tx}:${log}`;
}
export function canonicalChain2050DeliveryEventKeySha256V1(input) {
  return sha(canonicalChain2050DeliveryEventIdentityV1(input));
}

export const PAYMENT_KEYS = [
  "schema", "marker", "source_chain", "source_chain_id", "source_transaction_hash",
  "source_log_index", "canonical_payment_identity", "payment_key_sha256", "payer_address",
  "delivery_address", "payment_usdc_atoms", "source_policy_fingerprint_sha256",
  "source_finality_attestation_sha256", "finality_status", "exact_payment_verified",
];
export const DELIVERY_KEYS = [
  "schema", "marker", "chain_id", "transaction_hash", "log_index", "block_height",
  "block_hash", "recipient_address", "void_amount_atoms", "execution_status",
  "accepted_checkpoint_height", "accepted_checkpoint_hash", "finality_policy_id",
  "finality_attestation_sha256",
];
export const STATE_KEYS = [
  "schema", "marker", "version", "chain_id", "pool_id", "policy_id",
  "initial_inventory_void_atoms", "remaining_inventory_void_atoms", "fulfilled_void_atoms",
  "fulfillment_count", "state_sequence", "previous_state_sha256",
  "last_fulfillment_anchor_sha256", "transition_root_sha256", "state_sha256",
];
export const FULFILLMENT_KEYS = [
  "schema", "marker", "version", "pool_id", "policy_id", "payment_key_sha256",
  "canonical_payment_identity", "source_chain", "source_chain_id", "source_transaction_hash",
  "source_log_index", "source_policy_fingerprint_sha256", "source_finality_attestation_sha256",
  "payment_usdc_atoms", "delivery_address", "delivery_void_atoms", "delivery_event_identity",
  "delivery_event_key_sha256", "chain2050_transaction_hash", "chain2050_log_index",
  "chain2050_block_height", "chain2050_block_hash", "chain2050_finality_attestation_sha256",
  "previous_state_sha256", "state_sequence", "fulfillment_anchor_sha256",
];

export function normalizeBuyVoidFinalizedSourcePaymentV1(input) {
  keys(input, PAYMENT_KEYS, "SOURCE_PAYMENT_SHAPE");
  exact(input.schema, "void_buy_void_finalized_source_payment_v1", "INVALID_PAYMENT_SCHEMA");
  exact(input.marker, "VOID_BUY_VOID_FINALIZED_SOURCE_PAYMENT_V1", "INVALID_PAYMENT_MARKER");
  const chain = sourceChain(input.source_chain);
  exact(text(input.source_chain_id), sourceChainId(chain), "SOURCE_CHAIN_ID_MISMATCH");
  const tx = hash32(input.source_transaction_hash, "INVALID_SOURCE_TRANSACTION_HASH");
  const log = uint(input.source_log_index, "INVALID_SOURCE_LOG_INDEX", { max: MAX_U64 }).toString();
  const identity = canonicalBuyVoidPaymentIdentityV1({ source_chain: chain, source_transaction_hash: tx, source_log_index: log });
  exact(input.canonical_payment_identity, identity, "CANONICAL_PAYMENT_IDENTITY_MISMATCH");
  exact(text(input.payment_key_sha256).toLowerCase(), sha(identity), "PAYMENT_KEY_MISMATCH");
  const payer = address(input.payer_address, "INVALID_PAYER_ADDRESS");
  const delivery = address(input.delivery_address, "INVALID_DELIVERY_ADDRESS");
  exact(payer, delivery, "PAYER_DELIVERY_ADDRESS_MISMATCH");
  const atoms = uint(input.payment_usdc_atoms, "INVALID_PAYMENT_USDC_ATOMS", { positive: true });
  exact(input.finality_status, "finalized", "SOURCE_PAYMENT_NOT_FINALIZED");
  exact(input.exact_payment_verified, true, "SOURCE_EXACT_PAYMENT_NOT_VERIFIED");
  return Object.freeze({
    schema: input.schema, marker: input.marker, source_chain: chain,
    source_chain_id: sourceChainId(chain), source_transaction_hash: tx, source_log_index: log,
    canonical_payment_identity: identity, payment_key_sha256: sha(identity), payer_address: payer,
    delivery_address: delivery, payment_usdc_atoms: atoms.toString(),
    source_policy_fingerprint_sha256: hex64(input.source_policy_fingerprint_sha256, "INVALID_SOURCE_POLICY_FINGERPRINT"),
    source_finality_attestation_sha256: hex64(input.source_finality_attestation_sha256, "INVALID_SOURCE_FINALITY_ATTESTATION"),
    finality_status: "finalized", exact_payment_verified: true,
  });
}

export function normalizeChain2050FinalizedDeliveryV1(input) {
  keys(input, DELIVERY_KEYS, "CHAIN2050_DELIVERY_SHAPE");
  exact(input.schema, "void_chain2050_finalized_delivery_v1", "INVALID_DELIVERY_SCHEMA");
  exact(input.marker, "VOID_CHAIN2050_FINALIZED_DELIVERY_V1", "INVALID_DELIVERY_MARKER");
  exact(input.chain_id, "2050", "INVALID_DELIVERY_CHAIN_ID");
  const tx = hash32(input.transaction_hash, "INVALID_DELIVERY_TRANSACTION_HASH");
  const log = uint(input.log_index, "INVALID_DELIVERY_LOG_INDEX", { max: MAX_U64 }).toString();
  const block = uint(input.block_height, "INVALID_DELIVERY_BLOCK_HEIGHT", { positive: true });
  const checkpoint = uint(input.accepted_checkpoint_height, "INVALID_CHECKPOINT_HEIGHT", { positive: true });
  if (checkpoint < block) fail("DELIVERY_NOT_BEHIND_ACCEPTED_CHECKPOINT", `${checkpoint}<${block}`);
  exact(input.execution_status, "success", "DELIVERY_EXECUTION_NOT_SUCCESS");
  const identity = canonicalChain2050DeliveryEventIdentityV1({ chain_id: "2050", transaction_hash: tx, log_index: log });
  return Object.freeze({
    schema: input.schema, marker: input.marker, chain_id: "2050", transaction_hash: tx,
    log_index: log, delivery_event_identity: identity, delivery_event_key_sha256: sha(identity),
    block_height: block.toString(), block_hash: hash32(input.block_hash, "INVALID_DELIVERY_BLOCK_HASH"),
    recipient_address: address(input.recipient_address, "INVALID_DELIVERY_RECIPIENT"),
    void_amount_atoms: uint(input.void_amount_atoms, "INVALID_DELIVERY_VOID_ATOMS", { positive: true }).toString(),
    execution_status: "success", accepted_checkpoint_height: checkpoint.toString(),
    accepted_checkpoint_hash: hash32(input.accepted_checkpoint_hash, "INVALID_ACCEPTED_CHECKPOINT_HASH"),
    finality_policy_id: safeId(input.finality_policy_id, "INVALID_FINALITY_POLICY_ID"),
    finality_attestation_sha256: hex64(input.finality_attestation_sha256, "INVALID_CHAIN2050_FINALITY_ATTESTATION"),
  });
}
