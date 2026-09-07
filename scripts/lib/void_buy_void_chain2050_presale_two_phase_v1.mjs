import { createHash } from "node:crypto";

export const MARKER = "VOID_BUY_VOID_CHAIN2050_PRESALE_TWO_PHASE_V1";
export const RESERVATION_MARKER = "VOID_BUY_VOID_CHAIN2050_PAYMENT_RESERVATION_V1";
export const FULFILLMENT_MARKER = "VOID_BUY_VOID_CHAIN2050_FULFILLMENT_RECORD_V1";
export const STATE_MARKER = "VOID_BUY_VOID_CHAIN2050_PRESALE_STATE_V2";

export const PRESALE = Object.freeze({
  chain_id: "2050",
  pool_id: "buy-void-presale-v1",
  policy_id: "void-buy-void-presale-two-phase-v1",
  initial_inventory_void_atoms: "10000000000000",
  void_decimals: 6,
  usdc_decimals: 6,
  rate_void_atoms_numerator: "2",
  rate_void_atoms_denominator: "1",
  exact_payment_required: true,
  payment_confirmation_separate_from_fulfillment: true,
  no_hidden_minimum: true,
  no_per_buyer_throttle_below_remaining_inventory: true,
});

export const AUTHORITY = Object.freeze({
  source_only_reference_machine: true,
  chain_state_mutation: false,
  source_chain_rpc_call: false,
  chain2050_rpc_call: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_access: false,
  wallet_access: false,
  signer_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  inventory_funding: false,
  public_presale_activation: false,
  money_movement: false,
});

const INITIAL = BigInt(PRESALE.initial_inventory_void_atoms);
const MAX_U64 = (1n << 64n) - 1n;
const MAX_U256 = (1n << 256n) - 1n;
const H32 = /^0x[0-9a-f]{64}$/;
const A20 = /^0x[0-9a-f]{40}$/;
const H64 = /^[0-9a-f]{64}$/;
const UINT = /^(0|[1-9][0-9]*)$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

function fail(code, detail = "") {
  const e = new Error(`${MARKER}:${code}:${detail}`);
  e.code = code;
  e.detail = detail;
  throw e;
}
function plain(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}
function keys(v, expected, code) {
  if (!plain(v)) fail(code, "not_object");
  const a = Object.keys(v).sort();
  const b = [...expected].sort();
  if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
    fail(code, `expected=${b};actual=${a}`);
  }
}
function canon(v) {
  if (v === null) return "null";
  if (typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
  if (typeof v === "number") {
    if (!Number.isSafeInteger(v)) fail("NON_CANONICAL_NUMBER", String(v));
    return String(v);
  }
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (plain(v)) {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
  }
  fail("NON_CANONICAL_VALUE", typeof v);
}
const sha = (v) => createHash("sha256").update(v).digest("hex");
const domain = (name, v) => sha(`${name}\0${canon(v)}`);
const text = (v) => String(v ?? "").trim();
function exact(v, wanted, code) {
  if (v !== wanted) fail(code, `expected=${wanted};actual=${String(v)}`);
  return wanted;
}
function hash32(v, code) {
  const x = text(v).toLowerCase();
  if (!H32.test(x)) fail(code, x || "empty");
  return x;
}
function addr(v, code) {
  const x = text(v).toLowerCase();
  if (!A20.test(x)) fail(code, x || "empty");
  return x;
}
function hex64(v, code) {
  const x = text(v).toLowerCase();
  if (!H64.test(x)) fail(code, x || "empty");
  return x;
}
function safeId(v, code) {
  const x = text(v);
  if (!SAFE_ID.test(x)) fail(code, x || "empty");
  return x;
}
function uint(v, code, { positive = false, max = MAX_U256 } = {}) {
  const x = text(v);
  if (!UINT.test(x)) fail(code, x || "empty");
  const n = BigInt(x);
  if ((positive && n === 0n) || n > max) fail(code, x);
  return n;
}
function sourceChain(v) {
  const raw = text(v).toLowerCase();
  const x = raw === "eth" ? "ethereum" : raw;
  if (x !== "base" && x !== "ethereum") fail("INVALID_SOURCE_CHAIN", raw);
  return x;
}
const sourceChainId = (c) => c === "base" ? "8453" : "1";

const PAYMENT_KEYS = [
  "schema","marker","source_chain","source_chain_id","source_transaction_hash",
  "source_log_index","canonical_payment_identity","payment_key_sha256","payer_address",
  "delivery_address","payment_usdc_atoms","source_policy_fingerprint_sha256",
  "source_finality_attestation_sha256","finality_status","exact_payment_verified",
];
const DELIVERY_KEYS = [
  "schema","marker","chain_id","transaction_hash","log_index","block_height","block_hash",
  "recipient_address","void_amount_atoms","execution_status","accepted_checkpoint_height",
  "accepted_checkpoint_hash","finality_policy_id","finality_attestation_sha256",
];
const STATE_KEYS = [
  "schema","marker","version","chain_id","pool_id","policy_id",
  "initial_inventory_void_atoms","available_inventory_void_atoms",
  "reserved_inventory_void_atoms","fulfilled_inventory_void_atoms",
  "confirmed_payment_count","fulfilled_payment_count","state_sequence",
  "previous_state_sha256","last_transition_anchor_sha256","transition_root_sha256","state_sha256",
];
const RESERVATION_KEYS = [
  "schema","marker","version","pool_id","policy_id","payment_key_sha256",
  "canonical_payment_identity","source_chain","source_chain_id","source_transaction_hash",
  "source_log_index","source_policy_fingerprint_sha256","source_finality_attestation_sha256",
  "payer_address","delivery_address","payment_usdc_atoms","reserved_void_atoms",
  "previous_state_sha256","state_sequence","reservation_anchor_sha256",
];
const FULFILLMENT_KEYS = [
  "schema","marker","version","pool_id","policy_id","payment_key_sha256",
  "reservation_anchor_sha256","canonical_payment_identity","delivery_address",
  "delivery_void_atoms","delivery_event_identity","delivery_event_key_sha256",
  "chain2050_transaction_hash","chain2050_log_index","chain2050_block_height",
  "chain2050_block_hash","chain2050_accepted_checkpoint_height",
  "chain2050_accepted_checkpoint_hash","chain2050_finality_policy_id",
  "chain2050_finality_attestation_sha256","previous_state_sha256",
  "state_sequence","fulfillment_anchor_sha256",
];

export function canonicalPaymentIdentityV1(input) {
  keys(input, ["source_chain","source_transaction_hash","source_log_index"], "PAYMENT_IDENTITY_SHAPE");
  const c = sourceChain(input.source_chain);
  const tx = hash32(input.source_transaction_hash, "INVALID_SOURCE_TRANSACTION_HASH");
  const log = uint(input.source_log_index, "INVALID_SOURCE_LOG_INDEX", { max: MAX_U64 }).toString();
  return `voidpay1:${c}:${tx}:${log}`;
}
function paymentKeyFromCanonicalIdentityV1(value) {
  const identity = text(value);
  const match = /^voidpay1:(base|ethereum):(0x[0-9a-f]{64}):(0|[1-9][0-9]*)$/.exec(identity);
  if (!match) fail("INVALID_CANONICAL_PAYMENT_IDENTITY", identity || "empty");
  uint(match[3], "INVALID_CANONICAL_PAYMENT_LOG_INDEX", { max: MAX_U64 });
  const bytes = Buffer.from(identity, "utf8");
  if (bytes.length > 512) fail("CANONICAL_PAYMENT_IDENTITY_TOO_LARGE");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length, 0);
  return sha(Buffer.concat([
    Buffer.from("VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\0", "ascii"),
    length,
    bytes,
  ]));
}

export function canonicalPaymentKeySha256V1(input) {
  return paymentKeyFromCanonicalIdentityV1(canonicalPaymentIdentityV1(input));
}
export function canonicalDeliveryEventIdentityV1(input) {
  keys(input, ["chain_id","transaction_hash","log_index"], "DELIVERY_IDENTITY_SHAPE");
  exact(text(input.chain_id), "2050", "INVALID_DELIVERY_CHAIN_ID");
  const tx = hash32(input.transaction_hash, "INVALID_DELIVERY_TRANSACTION_HASH");
  const log = uint(input.log_index, "INVALID_DELIVERY_LOG_INDEX", { max: MAX_U64 }).toString();
  return `voiddelivery1:2050:${tx}:${log}`;
}
export function canonicalDeliveryEventKeySha256V1(input) {
  return domain("VOID_BUY_VOID_DELIVERY_EVENT_KEY_V1", { identity: canonicalDeliveryEventIdentityV1(input) });
}

export function normalizeFinalizedSourcePaymentV1(input) {
  keys(input, PAYMENT_KEYS, "SOURCE_PAYMENT_SHAPE");
  exact(input.schema, "void_buy_void_finalized_source_payment_v1", "INVALID_PAYMENT_SCHEMA");
  exact(input.marker, "VOID_BUY_VOID_FINALIZED_SOURCE_PAYMENT_V1", "INVALID_PAYMENT_MARKER");
  const c = sourceChain(input.source_chain);
  exact(text(input.source_chain_id), sourceChainId(c), "SOURCE_CHAIN_ID_MISMATCH");
  const tx = hash32(input.source_transaction_hash, "INVALID_SOURCE_TRANSACTION_HASH");
  const log = uint(input.source_log_index, "INVALID_SOURCE_LOG_INDEX", { max: MAX_U64 }).toString();
  const identity = canonicalPaymentIdentityV1({ source_chain: c, source_transaction_hash: tx, source_log_index: log });
  const paymentKey = canonicalPaymentKeySha256V1({ source_chain: c, source_transaction_hash: tx, source_log_index: log });
  exact(input.canonical_payment_identity, identity, "CANONICAL_PAYMENT_IDENTITY_MISMATCH");
  exact(text(input.payment_key_sha256).toLowerCase(), paymentKey, "PAYMENT_KEY_MISMATCH");
  const payer = addr(input.payer_address, "INVALID_PAYER_ADDRESS");
  const delivery = addr(input.delivery_address, "INVALID_DELIVERY_ADDRESS");
  exact(payer, delivery, "PAYER_DELIVERY_ADDRESS_MISMATCH");
  const paymentAtoms = uint(input.payment_usdc_atoms, "INVALID_PAYMENT_USDC_ATOMS", { positive: true });
  exact(input.finality_status, "finalized", "SOURCE_PAYMENT_NOT_FINALIZED");
  exact(input.exact_payment_verified, true, "SOURCE_EXACT_PAYMENT_NOT_VERIFIED");
  return Object.freeze({
    schema: input.schema, marker: input.marker, source_chain: c, source_chain_id: sourceChainId(c),
    source_transaction_hash: tx, source_log_index: log, canonical_payment_identity: identity,
    payment_key_sha256: paymentKey, payer_address: payer, delivery_address: delivery,
    payment_usdc_atoms: paymentAtoms.toString(),
    source_policy_fingerprint_sha256: hex64(input.source_policy_fingerprint_sha256, "INVALID_SOURCE_POLICY_FINGERPRINT"),
    source_finality_attestation_sha256: hex64(input.source_finality_attestation_sha256, "INVALID_SOURCE_FINALITY_ATTESTATION"),
    finality_status: "finalized", exact_payment_verified: true,
  });
}

export function normalizeFinalizedChain2050DeliveryV1(input) {
  keys(input, DELIVERY_KEYS, "CHAIN2050_DELIVERY_SHAPE");
  exact(input.schema, "void_chain2050_finalized_delivery_v1", "INVALID_DELIVERY_SCHEMA");
  exact(input.marker, "VOID_CHAIN2050_FINALIZED_DELIVERY_V1", "INVALID_DELIVERY_MARKER");
  exact(text(input.chain_id), "2050", "INVALID_DELIVERY_CHAIN_ID");
  const tx = hash32(input.transaction_hash, "INVALID_DELIVERY_TRANSACTION_HASH");
  const log = uint(input.log_index, "INVALID_DELIVERY_LOG_INDEX", { max: MAX_U64 }).toString();
  const block = uint(input.block_height, "INVALID_DELIVERY_BLOCK_HEIGHT", { positive: true });
  const checkpoint = uint(input.accepted_checkpoint_height, "INVALID_CHECKPOINT_HEIGHT", { positive: true });
  if (checkpoint < block) fail("DELIVERY_NOT_BEHIND_ACCEPTED_CHECKPOINT", `${checkpoint}<${block}`);
  exact(input.execution_status, "success", "DELIVERY_EXECUTION_NOT_SUCCESS");
  const identity = canonicalDeliveryEventIdentityV1({ chain_id: "2050", transaction_hash: tx, log_index: log });
  return Object.freeze({
    schema: input.schema, marker: input.marker, chain_id: "2050", transaction_hash: tx, log_index: log,
    delivery_event_identity: identity,
    delivery_event_key_sha256: canonicalDeliveryEventKeySha256V1({ chain_id: "2050", transaction_hash: tx, log_index: log }),
    block_height: block.toString(), block_hash: hash32(input.block_hash, "INVALID_DELIVERY_BLOCK_HASH"),
    recipient_address: addr(input.recipient_address, "INVALID_DELIVERY_RECIPIENT"),
    void_amount_atoms: uint(input.void_amount_atoms, "INVALID_DELIVERY_VOID_ATOMS", { positive: true }).toString(),
    execution_status: "success", accepted_checkpoint_height: checkpoint.toString(),
    accepted_checkpoint_hash: hash32(input.accepted_checkpoint_hash, "INVALID_ACCEPTED_CHECKPOINT_HASH"),
    finality_policy_id: safeId(input.finality_policy_id, "INVALID_FINALITY_POLICY_ID"),
    finality_attestation_sha256: hex64(input.finality_attestation_sha256, "INVALID_CHAIN2050_FINALITY_ATTESTATION"),
  });
}

function stateCore(s) { const x = { ...s }; delete x.state_sha256; return x; }
export const computeStateSha256V1 = (s) => domain("VOID_BUY_VOID_CHAIN2050_PRESALE_STATE_V2", stateCore(s));
const genesisRoot = () => domain("VOID_BUY_VOID_CHAIN2050_PRESALE_TRANSITION_ROOT_V2", {
  genesis: true, chain_id: PRESALE.chain_id, pool_id: PRESALE.pool_id,
  policy_id: PRESALE.policy_id, initial_inventory_void_atoms: PRESALE.initial_inventory_void_atoms,
});
const nextRoot = (prior, anchor) => domain("VOID_BUY_VOID_CHAIN2050_PRESALE_TRANSITION_ROOT_V2", {
  previous_transition_root_sha256: prior, transition_anchor_sha256: anchor,
});

export function createGenesisStateV1() {
  const s = {
    schema: "void_buy_void_chain2050_presale_state_v2", marker: STATE_MARKER, version: 2,
    chain_id: "2050", pool_id: PRESALE.pool_id, policy_id: PRESALE.policy_id,
    initial_inventory_void_atoms: PRESALE.initial_inventory_void_atoms,
    available_inventory_void_atoms: PRESALE.initial_inventory_void_atoms,
    reserved_inventory_void_atoms: "0", fulfilled_inventory_void_atoms: "0",
    confirmed_payment_count: "0", fulfilled_payment_count: "0", state_sequence: "0",
    previous_state_sha256: null, last_transition_anchor_sha256: null,
    transition_root_sha256: genesisRoot(), state_sha256: "",
  };
  s.state_sha256 = computeStateSha256V1(s);
  return Object.freeze(s);
}

export function validateStateV1(input) {
  keys(input, STATE_KEYS, "PRESALE_STATE_SHAPE");
  exact(input.schema, "void_buy_void_chain2050_presale_state_v2", "INVALID_STATE_SCHEMA");
  exact(input.marker, STATE_MARKER, "INVALID_STATE_MARKER");
  exact(input.version, 2, "INVALID_STATE_VERSION");
  exact(text(input.chain_id), "2050", "INVALID_STATE_CHAIN_ID");
  exact(input.pool_id, PRESALE.pool_id, "INVALID_POOL_ID");
  exact(input.policy_id, PRESALE.policy_id, "INVALID_POLICY_ID");
  exact(input.initial_inventory_void_atoms, PRESALE.initial_inventory_void_atoms, "INVALID_INITIAL_INVENTORY");
  const available = uint(input.available_inventory_void_atoms, "INVALID_AVAILABLE", { max: INITIAL });
  const reserved = uint(input.reserved_inventory_void_atoms, "INVALID_RESERVED", { max: INITIAL });
  const fulfilled = uint(input.fulfilled_inventory_void_atoms, "INVALID_FULFILLED", { max: INITIAL });
  if (available + reserved + fulfilled !== INITIAL) fail("INVENTORY_CONSERVATION_FAILURE");
  const confirmed = uint(input.confirmed_payment_count, "INVALID_CONFIRMED_PAYMENT_COUNT");
  const done = uint(input.fulfilled_payment_count, "INVALID_FULFILLED_PAYMENT_COUNT");
  if (done > confirmed) fail("FULFILLED_COUNT_EXCEEDS_CONFIRMED");
  const sequence = uint(input.state_sequence, "INVALID_STATE_SEQUENCE");
  if (sequence !== confirmed + done) fail("STATE_SEQUENCE_COUNT_MISMATCH");
  const previous = input.previous_state_sha256 === null ? null : hex64(input.previous_state_sha256, "INVALID_PREVIOUS_STATE");
  const last = input.last_transition_anchor_sha256 === null ? null : hex64(input.last_transition_anchor_sha256, "INVALID_LAST_TRANSITION_ANCHOR");
  const root = hex64(input.transition_root_sha256, "INVALID_TRANSITION_ROOT");
  if (sequence === 0n) {
    if (previous !== null || last !== null) fail("STATE_PREDECESSOR_SHAPE");
    if (available !== INITIAL || reserved !== 0n || fulfilled !== 0n || confirmed !== 0n || done !== 0n) fail("GENESIS_STATE_SHAPE");
    exact(root, genesisRoot(), "GENESIS_TRANSITION_ROOT_MISMATCH");
  } else if (previous === null || last === null) fail("STATE_PREDECESSOR_SHAPE");
  const out = {
    ...input, available_inventory_void_atoms: available.toString(),
    reserved_inventory_void_atoms: reserved.toString(), fulfilled_inventory_void_atoms: fulfilled.toString(),
    confirmed_payment_count: confirmed.toString(), fulfilled_payment_count: done.toString(),
    state_sequence: sequence.toString(), previous_state_sha256: previous,
    last_transition_anchor_sha256: last, transition_root_sha256: root,
    state_sha256: hex64(input.state_sha256, "INVALID_STATE_SHA256"),
  };
  exact(out.state_sha256, computeStateSha256V1(out), "PRESALE_STATE_SHA256_MISMATCH");
  return Object.freeze(out);
}

function reservationCore(r) { const x = { ...r }; delete x.reservation_anchor_sha256; return x; }
export const computeReservationAnchorSha256V1 = (r) => domain("VOID_BUY_VOID_CHAIN2050_PAYMENT_RESERVATION_V1", reservationCore(r));
export function validateReservationV1(input) {
  keys(input, RESERVATION_KEYS, "RESERVATION_SHAPE");
  exact(input.schema, "void_buy_void_chain2050_payment_reservation_v1", "INVALID_RESERVATION_SCHEMA");
  exact(input.marker, RESERVATION_MARKER, "INVALID_RESERVATION_MARKER");
  exact(input.version, 1, "INVALID_RESERVATION_VERSION");
  exact(input.pool_id, PRESALE.pool_id, "INVALID_RESERVATION_POOL");
  exact(input.policy_id, PRESALE.policy_id, "INVALID_RESERVATION_POLICY");
  const c = sourceChain(input.source_chain);
  const tx = hash32(input.source_transaction_hash, "INVALID_SOURCE_TRANSACTION_HASH");
  const log = uint(input.source_log_index, "INVALID_SOURCE_LOG_INDEX", { max: MAX_U64 }).toString();
  const identity = canonicalPaymentIdentityV1({ source_chain: c, source_transaction_hash: tx, source_log_index: log });
  const key = canonicalPaymentKeySha256V1({ source_chain: c, source_transaction_hash: tx, source_log_index: log });
  exact(input.canonical_payment_identity, identity, "RESERVATION_PAYMENT_IDENTITY_MISMATCH");
  exact(text(input.payment_key_sha256).toLowerCase(), key, "RESERVATION_PAYMENT_KEY_MISMATCH");
  exact(text(input.source_chain_id), sourceChainId(c), "RESERVATION_SOURCE_CHAIN_ID_MISMATCH");
  const paid = uint(input.payment_usdc_atoms, "INVALID_PAYMENT_USDC_ATOMS", { positive: true });
  const amount = uint(input.reserved_void_atoms, "INVALID_RESERVED_VOID_ATOMS", { positive: true, max: INITIAL });
  if (paid * 2n !== amount) fail("RESERVATION_RATE_MISMATCH");
  const out = {
    ...input, payment_key_sha256: key, canonical_payment_identity: identity, source_chain: c,
    source_chain_id: sourceChainId(c), source_transaction_hash: tx, source_log_index: log,
    source_policy_fingerprint_sha256: hex64(input.source_policy_fingerprint_sha256, "INVALID_SOURCE_POLICY_FINGERPRINT"),
    source_finality_attestation_sha256: hex64(input.source_finality_attestation_sha256, "INVALID_SOURCE_FINALITY_ATTESTATION"),
    payer_address: addr(input.payer_address, "INVALID_PAYER_ADDRESS"),
    delivery_address: addr(input.delivery_address, "INVALID_DELIVERY_ADDRESS"),
    payment_usdc_atoms: paid.toString(), reserved_void_atoms: amount.toString(),
    previous_state_sha256: hex64(input.previous_state_sha256, "INVALID_PREVIOUS_STATE"),
    state_sequence: uint(input.state_sequence, "INVALID_RESERVATION_SEQUENCE", { positive: true }).toString(),
    reservation_anchor_sha256: hex64(input.reservation_anchor_sha256, "INVALID_RESERVATION_ANCHOR"),
  };
  exact(out.payer_address, out.delivery_address, "PAYER_DELIVERY_ADDRESS_MISMATCH");
  exact(out.reservation_anchor_sha256, computeReservationAnchorSha256V1(out), "RESERVATION_ANCHOR_MISMATCH");
  return Object.freeze(out);
}

function fulfillmentCore(r) { const x = { ...r }; delete x.fulfillment_anchor_sha256; return x; }
export const computeFulfillmentAnchorSha256V1 = (r) => domain("VOID_BUY_VOID_CHAIN2050_FULFILLMENT_RECORD_V1", fulfillmentCore(r));
export function validateFulfillmentV1(input) {
  keys(input, FULFILLMENT_KEYS, "FULFILLMENT_SHAPE");
  exact(input.schema, "void_buy_void_chain2050_fulfillment_record_v1", "INVALID_FULFILLMENT_SCHEMA");
  exact(input.marker, FULFILLMENT_MARKER, "INVALID_FULFILLMENT_MARKER");
  exact(input.version, 1, "INVALID_FULFILLMENT_VERSION");
  exact(input.pool_id, PRESALE.pool_id, "INVALID_FULFILLMENT_POOL");
  exact(input.policy_id, PRESALE.policy_id, "INVALID_FULFILLMENT_POLICY");
  const identity = text(input.canonical_payment_identity);
  if (!/^voidpay1:(?:base|ethereum):0x[0-9a-f]{64}:(?:0|[1-9][0-9]*)$/.test(identity)) fail("INVALID_CANONICAL_PAYMENT_IDENTITY");
  const paymentKey = hex64(input.payment_key_sha256, "INVALID_PAYMENT_KEY");
  exact(
    paymentKey,
    paymentKeyFromCanonicalIdentityV1(identity),
    "FULFILLMENT_PAYMENT_KEY_MISMATCH",
  );
  const reservationAnchor = hex64(input.reservation_anchor_sha256, "INVALID_RESERVATION_ANCHOR");
  const deliveryIdentity = canonicalDeliveryEventIdentityV1({
    chain_id: "2050", transaction_hash: input.chain2050_transaction_hash, log_index: input.chain2050_log_index,
  });
  const deliveryKey = canonicalDeliveryEventKeySha256V1({
    chain_id: "2050", transaction_hash: input.chain2050_transaction_hash, log_index: input.chain2050_log_index,
  });
  exact(input.delivery_event_identity, deliveryIdentity, "DELIVERY_EVENT_IDENTITY_MISMATCH");
  exact(text(input.delivery_event_key_sha256).toLowerCase(), deliveryKey, "DELIVERY_EVENT_KEY_MISMATCH");
  const block = uint(input.chain2050_block_height, "INVALID_CHAIN2050_BLOCK_HEIGHT", { positive: true });
  const checkpoint = uint(input.chain2050_accepted_checkpoint_height, "INVALID_CHAIN2050_ACCEPTED_CHECKPOINT_HEIGHT", { positive: true });
  if (checkpoint < block) fail("DELIVERY_NOT_BEHIND_ACCEPTED_CHECKPOINT", `${checkpoint}<${block}`);
  const out = {
    ...input, payment_key_sha256: paymentKey, reservation_anchor_sha256: reservationAnchor,
    canonical_payment_identity: identity, delivery_address: addr(input.delivery_address, "INVALID_DELIVERY_ADDRESS"),
    delivery_void_atoms: uint(input.delivery_void_atoms, "INVALID_DELIVERY_VOID_ATOMS", { positive: true, max: INITIAL }).toString(),
    delivery_event_identity: deliveryIdentity, delivery_event_key_sha256: deliveryKey,
    chain2050_transaction_hash: hash32(input.chain2050_transaction_hash, "INVALID_CHAIN2050_TRANSACTION_HASH"),
    chain2050_log_index: uint(input.chain2050_log_index, "INVALID_CHAIN2050_LOG_INDEX", { max: MAX_U64 }).toString(),
    chain2050_block_height: block.toString(), chain2050_block_hash: hash32(input.chain2050_block_hash, "INVALID_CHAIN2050_BLOCK_HASH"),
    chain2050_accepted_checkpoint_height: checkpoint.toString(),
    chain2050_accepted_checkpoint_hash: hash32(input.chain2050_accepted_checkpoint_hash, "INVALID_CHAIN2050_ACCEPTED_CHECKPOINT_HASH"),
    chain2050_finality_policy_id: safeId(input.chain2050_finality_policy_id, "INVALID_CHAIN2050_FINALITY_POLICY_ID"),
    chain2050_finality_attestation_sha256: hex64(input.chain2050_finality_attestation_sha256, "INVALID_CHAIN2050_FINALITY_ATTESTATION"),
    previous_state_sha256: hex64(input.previous_state_sha256, "INVALID_PREVIOUS_STATE"),
    state_sequence: uint(input.state_sequence, "INVALID_FULFILLMENT_SEQUENCE", { positive: true }).toString(),
    fulfillment_anchor_sha256: hex64(input.fulfillment_anchor_sha256, "INVALID_FULFILLMENT_ANCHOR"),
  };
  exact(out.fulfillment_anchor_sha256, computeFulfillmentAnchorSha256V1(out), "FULFILLMENT_ANCHOR_MISMATCH");
  return Object.freeze(out);
}

function paymentMatches(r, p) {
  return r.payment_key_sha256 === p.payment_key_sha256 &&
    r.canonical_payment_identity === p.canonical_payment_identity &&
    r.source_chain === p.source_chain && r.source_chain_id === p.source_chain_id &&
    r.source_transaction_hash === p.source_transaction_hash && r.source_log_index === p.source_log_index &&
    r.source_policy_fingerprint_sha256 === p.source_policy_fingerprint_sha256 &&
    r.source_finality_attestation_sha256 === p.source_finality_attestation_sha256 &&
    r.payer_address === p.payer_address && r.delivery_address === p.delivery_address &&
    r.payment_usdc_atoms === p.payment_usdc_atoms;
}
function deliveryMatches(f, d) {
  return f.delivery_address === d.recipient_address && f.delivery_void_atoms === d.void_amount_atoms &&
    f.delivery_event_identity === d.delivery_event_identity && f.delivery_event_key_sha256 === d.delivery_event_key_sha256 &&
    f.chain2050_transaction_hash === d.transaction_hash && f.chain2050_log_index === d.log_index &&
    f.chain2050_block_height === d.block_height && f.chain2050_block_hash === d.block_hash &&
    f.chain2050_accepted_checkpoint_height === d.accepted_checkpoint_height &&
    f.chain2050_accepted_checkpoint_hash === d.accepted_checkpoint_hash &&
    f.chain2050_finality_policy_id === d.finality_policy_id &&
    f.chain2050_finality_attestation_sha256 === d.finality_attestation_sha256;
}
const held = (reason, extra = {}) => Object.freeze({
  ok: false, status: "held", reason, mutation_applied: false,
  transaction_authority_granted: false, ...extra,
});

export class BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1 {
  #state;
  #reservations = new Map();
  #fulfillments = new Map();
  #deliveryEvents = new Map();
  #events = [];
  constructor({ genesis = createGenesisStateV1() } = {}) {
    this.#state = validateStateV1(genesis);
    if (this.#state.state_sequence !== "0") fail("MACHINE_REQUIRES_GENESIS");
  }
  get state() { return structuredClone(this.#state); }
  get authority() { return AUTHORITY; }
  get eventCount() { return this.#events.length; }
  getReservation(key) {
    const v = this.#reservations.get(hex64(key, "INVALID_PAYMENT_KEY"));
    return v ? structuredClone(v) : null;
  }
  getFulfillment(key) {
    const v = this.#fulfillments.get(hex64(key, "INVALID_PAYMENT_KEY"));
    return v ? structuredClone(v) : null;
  }
  getPurchaseStatus(key) {
    const k = hex64(key, "INVALID_PAYMENT_KEY");
    if (this.#fulfillments.has(k)) return "FULFILLED";
    if (this.#reservations.has(k)) return "CONFIRMED_RESERVED";
    return "UNSEEN";
  }
  exportEvents({ offset = 0, limit = 100 } = {}) {
    if (!Number.isSafeInteger(offset) || offset < 0) fail("INVALID_EVENT_OFFSET");
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 4096) fail("INVALID_EVENT_LIMIT");
    return this.#events.slice(offset, offset + limit).map((entry) => structuredClone(entry));
  }
  previewConfirmPayment(input) { return this.#confirm(input, false); }
  confirmPayment(input) { return this.#confirm(input, true); }
  #confirm(input, mutate) {
    try {
      keys(input, ["expected_state_sha256","source_payment"], "CONFIRM_PAYMENT_INPUT_SHAPE");
      exact(hex64(input.expected_state_sha256, "INVALID_EXPECTED_STATE"), this.#state.state_sha256, "STALE_PRESALE_STATE_PRECONDITION");
      const payment = normalizeFinalizedSourcePaymentV1(input.source_payment);
      const prior = this.#reservations.get(payment.payment_key_sha256);
      if (prior) {
        if (!paymentMatches(prior, payment)) return held("PAYMENT_ALREADY_CONFIRMED_CONFLICT");
        return Object.freeze({
          ok: true, status: this.#fulfillments.has(payment.payment_key_sha256) ? "already_fulfilled" : "duplicate_confirmed_reserved",
          duplicate: true, mutation_applied: false, reservation: structuredClone(prior),
          state: this.state, transaction_authority_granted: false,
        });
      }
      const required = BigInt(payment.payment_usdc_atoms) * 2n;
      const available = BigInt(this.#state.available_inventory_void_atoms);
      if (required > available) {
        return Object.freeze({
          ok: false, status: "capacity_rejected",
          reason: "PRESALE_INVENTORY_INSUFFICIENT_BEFORE_FULFILLMENT",
          required_void_atoms: required.toString(), available_void_atoms: available.toString(),
          payment_key_sha256: payment.payment_key_sha256, mutation_applied: false,
          transaction_authority_granted: false,
        });
      }
      const sequence = BigInt(this.#state.state_sequence) + 1n;
      const reservation = {
        schema: "void_buy_void_chain2050_payment_reservation_v1", marker: RESERVATION_MARKER, version: 1,
        pool_id: PRESALE.pool_id, policy_id: PRESALE.policy_id,
        payment_key_sha256: payment.payment_key_sha256, canonical_payment_identity: payment.canonical_payment_identity,
        source_chain: payment.source_chain, source_chain_id: payment.source_chain_id,
        source_transaction_hash: payment.source_transaction_hash, source_log_index: payment.source_log_index,
        source_policy_fingerprint_sha256: payment.source_policy_fingerprint_sha256,
        source_finality_attestation_sha256: payment.source_finality_attestation_sha256,
        payer_address: payment.payer_address, delivery_address: payment.delivery_address,
        payment_usdc_atoms: payment.payment_usdc_atoms, reserved_void_atoms: required.toString(),
        previous_state_sha256: this.#state.state_sha256, state_sequence: sequence.toString(),
        reservation_anchor_sha256: "",
      };
      reservation.reservation_anchor_sha256 = computeReservationAnchorSha256V1(reservation);
      const r = validateReservationV1(reservation);
      const next = {
        schema: "void_buy_void_chain2050_presale_state_v2", marker: STATE_MARKER, version: 2,
        chain_id: "2050", pool_id: PRESALE.pool_id, policy_id: PRESALE.policy_id,
        initial_inventory_void_atoms: PRESALE.initial_inventory_void_atoms,
        available_inventory_void_atoms: (available - required).toString(),
        reserved_inventory_void_atoms: (BigInt(this.#state.reserved_inventory_void_atoms) + required).toString(),
        fulfilled_inventory_void_atoms: this.#state.fulfilled_inventory_void_atoms,
        confirmed_payment_count: (BigInt(this.#state.confirmed_payment_count) + 1n).toString(),
        fulfilled_payment_count: this.#state.fulfilled_payment_count, state_sequence: sequence.toString(),
        previous_state_sha256: this.#state.state_sha256, last_transition_anchor_sha256: r.reservation_anchor_sha256,
        transition_root_sha256: nextRoot(this.#state.transition_root_sha256, r.reservation_anchor_sha256),
        state_sha256: "",
      };
      next.state_sha256 = computeStateSha256V1(next);
      const s = validateStateV1(next);
      if (mutate) {
        this.#reservations.set(r.payment_key_sha256, r);
        this.#state = s;
        this.#events.push(Object.freeze({ kind: "payment_confirmed", record: r, resulting_state_sha256: s.state_sha256 }));
      }
      return Object.freeze({
        ok: true, status: mutate ? "confirmed_reserved" : "would_confirm_reserved", duplicate: false,
        mutation_applied: mutate, reservation: structuredClone(r), state: structuredClone(s),
        transaction_authority_granted: false,
      });
    } catch (e) {
      return held(String(e?.code || "CONFIRM_PAYMENT_HOLD"), { detail: String(e?.detail || e?.message || "unknown") });
    }
  }

  previewRecordFulfillment(input) { return this.#fulfill(input, false); }
  recordFulfillment(input) { return this.#fulfill(input, true); }
  #fulfill(input, mutate) {
    try {
      keys(input, ["expected_state_sha256","payment_key_sha256","chain2050_delivery"], "RECORD_FULFILLMENT_INPUT_SHAPE");
      exact(hex64(input.expected_state_sha256, "INVALID_EXPECTED_STATE"), this.#state.state_sha256, "STALE_PRESALE_STATE_PRECONDITION");
      const paymentKey = hex64(input.payment_key_sha256, "INVALID_PAYMENT_KEY");
      const reservation = this.#reservations.get(paymentKey);
      if (!reservation) return held("PAYMENT_NOT_CONFIRMED_RESERVED");
      const delivery = normalizeFinalizedChain2050DeliveryV1(input.chain2050_delivery);
      const prior = this.#fulfillments.get(paymentKey);
      if (prior) {
        if (!deliveryMatches(prior, delivery)) return held("PAYMENT_ALREADY_FULFILLED_CONFLICT");
        return Object.freeze({
          ok: true, status: "duplicate_fulfilled", duplicate: true, mutation_applied: false,
          fulfillment: structuredClone(prior), state: this.state, transaction_authority_granted: false,
        });
      }
      if (this.#deliveryEvents.has(delivery.delivery_event_key_sha256)) return held("DELIVERY_EVENT_ALREADY_BOUND_TO_PAYMENT");
      exact(delivery.recipient_address, reservation.delivery_address, "DELIVERY_RECIPIENT_MISMATCH");
      exact(delivery.void_amount_atoms, reservation.reserved_void_atoms, "DELIVERY_AMOUNT_MISMATCH");
      const amount = BigInt(reservation.reserved_void_atoms);
      const reserved = BigInt(this.#state.reserved_inventory_void_atoms);
      if (amount > reserved) return held("RESERVED_INVENTORY_UNDERFLOW_HOLD");
      const sequence = BigInt(this.#state.state_sequence) + 1n;
      const f = {
        schema: "void_buy_void_chain2050_fulfillment_record_v1", marker: FULFILLMENT_MARKER, version: 1,
        pool_id: PRESALE.pool_id, policy_id: PRESALE.policy_id,
        payment_key_sha256: reservation.payment_key_sha256, reservation_anchor_sha256: reservation.reservation_anchor_sha256,
        canonical_payment_identity: reservation.canonical_payment_identity, delivery_address: reservation.delivery_address,
        delivery_void_atoms: reservation.reserved_void_atoms, delivery_event_identity: delivery.delivery_event_identity,
        delivery_event_key_sha256: delivery.delivery_event_key_sha256,
        chain2050_transaction_hash: delivery.transaction_hash, chain2050_log_index: delivery.log_index,
        chain2050_block_height: delivery.block_height, chain2050_block_hash: delivery.block_hash,
        chain2050_accepted_checkpoint_height: delivery.accepted_checkpoint_height,
        chain2050_accepted_checkpoint_hash: delivery.accepted_checkpoint_hash,
        chain2050_finality_policy_id: delivery.finality_policy_id,
        chain2050_finality_attestation_sha256: delivery.finality_attestation_sha256,
        previous_state_sha256: this.#state.state_sha256, state_sequence: sequence.toString(),
        fulfillment_anchor_sha256: "",
      };
      f.fulfillment_anchor_sha256 = computeFulfillmentAnchorSha256V1(f);
      const fulfillment = validateFulfillmentV1(f);
      const next = {
        schema: "void_buy_void_chain2050_presale_state_v2", marker: STATE_MARKER, version: 2,
        chain_id: "2050", pool_id: PRESALE.pool_id, policy_id: PRESALE.policy_id,
        initial_inventory_void_atoms: PRESALE.initial_inventory_void_atoms,
        available_inventory_void_atoms: this.#state.available_inventory_void_atoms,
        reserved_inventory_void_atoms: (reserved - amount).toString(),
        fulfilled_inventory_void_atoms: (BigInt(this.#state.fulfilled_inventory_void_atoms) + amount).toString(),
        confirmed_payment_count: this.#state.confirmed_payment_count,
        fulfilled_payment_count: (BigInt(this.#state.fulfilled_payment_count) + 1n).toString(),
        state_sequence: sequence.toString(), previous_state_sha256: this.#state.state_sha256,
        last_transition_anchor_sha256: fulfillment.fulfillment_anchor_sha256,
        transition_root_sha256: nextRoot(this.#state.transition_root_sha256, fulfillment.fulfillment_anchor_sha256),
        state_sha256: "",
      };
      next.state_sha256 = computeStateSha256V1(next);
      const s = validateStateV1(next);
      if (mutate) {
        this.#fulfillments.set(paymentKey, fulfillment);
        this.#deliveryEvents.set(fulfillment.delivery_event_key_sha256, paymentKey);
        this.#state = s;
        this.#events.push(Object.freeze({ kind: "fulfillment_recorded", record: fulfillment, resulting_state_sha256: s.state_sha256 }));
      }
      return Object.freeze({
        ok: true, status: mutate ? "fulfilled" : "would_fulfill", duplicate: false, mutation_applied: mutate,
        fulfillment: structuredClone(fulfillment), state: structuredClone(s), transaction_authority_granted: false,
      });
    } catch (e) {
      return held(String(e?.code || "RECORD_FULFILLMENT_HOLD"), { detail: String(e?.detail || e?.message || "unknown") });
    }
  }
}

function paymentFromReservation(r) {
  return {
    schema: "void_buy_void_finalized_source_payment_v1", marker: "VOID_BUY_VOID_FINALIZED_SOURCE_PAYMENT_V1",
    source_chain: r.source_chain, source_chain_id: r.source_chain_id, source_transaction_hash: r.source_transaction_hash,
    source_log_index: r.source_log_index, canonical_payment_identity: r.canonical_payment_identity,
    payment_key_sha256: r.payment_key_sha256, payer_address: r.payer_address, delivery_address: r.delivery_address,
    payment_usdc_atoms: r.payment_usdc_atoms, source_policy_fingerprint_sha256: r.source_policy_fingerprint_sha256,
    source_finality_attestation_sha256: r.source_finality_attestation_sha256,
    finality_status: "finalized", exact_payment_verified: true,
  };
}
function deliveryFromFulfillment(f) {
  return {
    schema: "void_chain2050_finalized_delivery_v1", marker: "VOID_CHAIN2050_FINALIZED_DELIVERY_V1",
    chain_id: "2050", transaction_hash: f.chain2050_transaction_hash, log_index: f.chain2050_log_index,
    block_height: f.chain2050_block_height, block_hash: f.chain2050_block_hash,
    recipient_address: f.delivery_address, void_amount_atoms: f.delivery_void_atoms, execution_status: "success",
    accepted_checkpoint_height: f.chain2050_accepted_checkpoint_height,
    accepted_checkpoint_hash: f.chain2050_accepted_checkpoint_hash,
    finality_policy_id: f.chain2050_finality_policy_id,
    finality_attestation_sha256: f.chain2050_finality_attestation_sha256,
  };
}

export function replayTwoPhasePresaleEventsV1(events, { maxEvents = 100000 } = {}) {
  if (!Array.isArray(events)) fail("EVENT_REPLAY_NOT_ARRAY");
  if (!Number.isSafeInteger(maxEvents) || maxEvents < 0 || maxEvents > 1_000_000) fail("INVALID_MAX_EVENTS");
  if (events.length > maxEvents) fail("EVENT_REPLAY_BOUND_EXCEEDED");
  const m = new BuyVoidChain2050PresaleTwoPhaseReferenceMachineV1();
  for (const e of events) {
    keys(e, ["kind","record","resulting_state_sha256"], "EVENT_SHAPE");
    let result;
    if (e.kind === "payment_confirmed") {
      const r = validateReservationV1(e.record);
      result = m.confirmPayment({ expected_state_sha256: m.state.state_sha256, source_payment: paymentFromReservation(r) });
      if (!result.ok || result.status !== "confirmed_reserved" || canon(result.reservation) !== canon(r)) {
        fail("EVENT_REPLAY_CONFIRM_MISMATCH");
      }
    } else if (e.kind === "fulfillment_recorded") {
      const f = validateFulfillmentV1(e.record);
      result = m.recordFulfillment({
        expected_state_sha256: m.state.state_sha256, payment_key_sha256: f.payment_key_sha256,
        chain2050_delivery: deliveryFromFulfillment(f),
      });
      if (!result.ok || result.status !== "fulfilled" || canon(result.fulfillment) !== canon(f)) {
        fail("EVENT_REPLAY_FULFILLMENT_MISMATCH");
      }
    } else fail("EVENT_KIND_INVALID", String(e.kind));
    exact(e.resulting_state_sha256, result.state.state_sha256, "EVENT_REPLAY_RESULTING_STATE_MISMATCH");
  }
  return Object.freeze({
    marker: "VOID_BUY_VOID_CHAIN2050_PRESALE_TWO_PHASE_REPLAY_V1",
    event_count: String(events.length), state: m.state, authority: AUTHORITY,
  });
}
