import {
  C, INITIAL, MAX_U64, STATE_KEYS, FULFILLMENT_KEYS, address, canonicalBuyVoidPaymentIdentityV1,
  canonicalChain2050DeliveryEventIdentityV1, domain, exact, hex64, hash32,
  fail, keys, sha, sourceChain, sourceChainId, text, uint,
  VOID_BUY_VOID_CHAIN2050_PRESALE_CONSTANTS_V1,
  VOID_BUY_VOID_CHAIN2050_PRESALE_FULFILLMENT_V1,
  VOID_BUY_VOID_CHAIN2050_PRESALE_STATE_V1,
} from "./void_buy_void_chain2050_presale_identity_v1.mjs";

function stateProjection(state) {
  const out = { ...state };
  delete out.state_sha256;
  return out;
}
export function computeBuyVoidChain2050PresaleStateSha256V1(state) {
  return domain("VOID_BUY_VOID_CHAIN2050_PRESALE_STATE_V1", stateProjection(state));
}
export function root(previous, anchor) {
  return domain("VOID_BUY_VOID_CHAIN2050_PRESALE_TRANSITION_ROOT_V1", {
    previous_transition_root_sha256: previous,
    fulfillment_anchor_sha256: anchor,
  });
}
export function createBuyVoidChain2050PresaleGenesisV1() {
  const state = {
    schema: "void_buy_void_chain2050_presale_state_v1", marker: VOID_BUY_VOID_CHAIN2050_PRESALE_STATE_V1,
    version: 1, chain_id: "2050", pool_id: C.pool_id, policy_id: C.policy_id,
    initial_inventory_void_atoms: C.initial_inventory_void_atoms,
    remaining_inventory_void_atoms: C.initial_inventory_void_atoms, fulfilled_void_atoms: "0",
    fulfillment_count: "0", state_sequence: "0", previous_state_sha256: null,
    last_fulfillment_anchor_sha256: null,
    transition_root_sha256: domain("VOID_BUY_VOID_CHAIN2050_PRESALE_TRANSITION_ROOT_V1", {
      genesis: true, chain_id: "2050", pool_id: C.pool_id, policy_id: C.policy_id,
      initial_inventory_void_atoms: C.initial_inventory_void_atoms,
    }), state_sha256: "",
  };
  state.state_sha256 = computeBuyVoidChain2050PresaleStateSha256V1(state);
  return Object.freeze(state);
}
export function validateBuyVoidChain2050PresaleStateV1(input) {
  keys(input, STATE_KEYS, "PRESALE_STATE_SHAPE");
  exact(input.schema, "void_buy_void_chain2050_presale_state_v1", "INVALID_STATE_SCHEMA");
  exact(input.marker, VOID_BUY_VOID_CHAIN2050_PRESALE_STATE_V1, "INVALID_STATE_MARKER");
  exact(input.version, 1, "INVALID_STATE_VERSION");
  exact(input.chain_id, "2050", "INVALID_STATE_CHAIN_ID");
  exact(input.pool_id, C.pool_id, "INVALID_POOL_ID");
  exact(input.policy_id, C.policy_id, "INVALID_POLICY_ID");
  exact(input.initial_inventory_void_atoms, C.initial_inventory_void_atoms, "INVALID_INITIAL_INVENTORY");
  const remaining = uint(input.remaining_inventory_void_atoms, "INVALID_REMAINING", { max: INITIAL });
  const fulfilled = uint(input.fulfilled_void_atoms, "INVALID_FULFILLED", { max: INITIAL });
  if (remaining + fulfilled !== INITIAL) fail("INVENTORY_CONSERVATION_FAILURE");
  const count = uint(input.fulfillment_count, "INVALID_FULFILLMENT_COUNT");
  const sequence = uint(input.state_sequence, "INVALID_STATE_SEQUENCE");
  if (count !== sequence) fail("STATE_SEQUENCE_COUNT_MISMATCH");
  const previous = input.previous_state_sha256 === null ? null : hex64(input.previous_state_sha256, "INVALID_PREVIOUS_STATE");
  const last = input.last_fulfillment_anchor_sha256 === null ? null : hex64(input.last_fulfillment_anchor_sha256, "INVALID_LAST_ANCHOR");
  if ((sequence === 0n) !== (previous === null && last === null)) fail("STATE_PREDECESSOR_SHAPE");
  const normalized = {
    ...input, remaining_inventory_void_atoms: remaining.toString(), fulfilled_void_atoms: fulfilled.toString(),
    fulfillment_count: count.toString(), state_sequence: sequence.toString(), previous_state_sha256: previous,
    last_fulfillment_anchor_sha256: last,
    transition_root_sha256: hex64(input.transition_root_sha256, "INVALID_TRANSITION_ROOT"),
    state_sha256: hex64(input.state_sha256, "INVALID_STATE_SHA"),
  };
  exact(normalized.state_sha256, computeBuyVoidChain2050PresaleStateSha256V1(normalized), "PRESALE_STATE_SHA256_MISMATCH");
  return Object.freeze(normalized);
}

function fulfillmentProjection(record) {
  const out = { ...record };
  delete out.fulfillment_anchor_sha256;
  return out;
}
export function computeBuyVoidChain2050FulfillmentAnchorSha256V1(record) {
  return domain("VOID_BUY_VOID_CHAIN2050_PRESALE_FULFILLMENT_V1", fulfillmentProjection(record));
}
export function validateBuyVoidChain2050FulfillmentRecordV1(input) {
  keys(input, FULFILLMENT_KEYS, "FULFILLMENT_SHAPE");
  exact(input.schema, "void_buy_void_chain2050_fulfillment_v1", "INVALID_FULFILLMENT_SCHEMA");
  exact(input.marker, VOID_BUY_VOID_CHAIN2050_PRESALE_FULFILLMENT_V1, "INVALID_FULFILLMENT_MARKER");
  exact(input.version, 1, "INVALID_FULFILLMENT_VERSION");
  exact(input.pool_id, C.pool_id, "INVALID_FULFILLMENT_POOL");
  exact(input.policy_id, C.policy_id, "INVALID_FULFILLMENT_POLICY");
  const chain = sourceChain(input.source_chain);
  const tx = hash32(input.source_transaction_hash, "INVALID_SOURCE_TRANSACTION_HASH");
  const log = uint(input.source_log_index, "INVALID_SOURCE_LOG_INDEX", { max: MAX_U64 }).toString();
  const paymentIdentity = canonicalBuyVoidPaymentIdentityV1({ source_chain: chain, source_transaction_hash: tx, source_log_index: log });
  exact(input.canonical_payment_identity, paymentIdentity, "FULFILLMENT_PAYMENT_IDENTITY_MISMATCH");
  exact(text(input.payment_key_sha256).toLowerCase(), sha(paymentIdentity), "FULFILLMENT_PAYMENT_KEY_MISMATCH");
  exact(text(input.source_chain_id), sourceChainId(chain), "FULFILLMENT_SOURCE_CHAIN_ID_MISMATCH");
  const payment = uint(input.payment_usdc_atoms, "INVALID_PAYMENT_USDC_ATOMS", { positive: true });
  const delivered = uint(input.delivery_void_atoms, "INVALID_DELIVERY_VOID_ATOMS", { positive: true });
  if (payment * 2n !== delivered) fail("FULFILLMENT_RATE_MISMATCH");
  const deliveryIdentity = canonicalChain2050DeliveryEventIdentityV1({
    chain_id: "2050", transaction_hash: input.chain2050_transaction_hash, log_index: input.chain2050_log_index,
  });
  exact(input.delivery_event_identity, deliveryIdentity, "DELIVERY_EVENT_IDENTITY_MISMATCH");
  exact(text(input.delivery_event_key_sha256).toLowerCase(), sha(deliveryIdentity), "DELIVERY_EVENT_KEY_MISMATCH");
  const normalized = {
    ...input, payment_key_sha256: sha(paymentIdentity), canonical_payment_identity: paymentIdentity,
    source_chain: chain, source_chain_id: sourceChainId(chain), source_transaction_hash: tx,
    source_log_index: log, source_policy_fingerprint_sha256: hex64(input.source_policy_fingerprint_sha256, "INVALID_SOURCE_POLICY_FINGERPRINT"),
    source_finality_attestation_sha256: hex64(input.source_finality_attestation_sha256, "INVALID_SOURCE_FINALITY_ATTESTATION"),
    payment_usdc_atoms: payment.toString(), delivery_address: address(input.delivery_address, "INVALID_DELIVERY_ADDRESS"),
    delivery_void_atoms: delivered.toString(), delivery_event_identity: deliveryIdentity,
    delivery_event_key_sha256: sha(deliveryIdentity),
    chain2050_transaction_hash: hash32(input.chain2050_transaction_hash, "INVALID_CHAIN2050_TRANSACTION_HASH"),
    chain2050_log_index: uint(input.chain2050_log_index, "INVALID_CHAIN2050_LOG_INDEX", { max: MAX_U64 }).toString(),
    chain2050_block_height: uint(input.chain2050_block_height, "INVALID_CHAIN2050_BLOCK_HEIGHT", { positive: true }).toString(),
    chain2050_block_hash: hash32(input.chain2050_block_hash, "INVALID_CHAIN2050_BLOCK_HASH"),
    chain2050_finality_attestation_sha256: hex64(input.chain2050_finality_attestation_sha256, "INVALID_CHAIN2050_FINALITY_ATTESTATION"),
    previous_state_sha256: hex64(input.previous_state_sha256, "INVALID_PREVIOUS_STATE"),
    state_sequence: uint(input.state_sequence, "INVALID_FULFILLMENT_SEQUENCE", { positive: true }).toString(),
    fulfillment_anchor_sha256: hex64(input.fulfillment_anchor_sha256, "INVALID_FULFILLMENT_ANCHOR"),
  };
  exact(normalized.fulfillment_anchor_sha256, computeBuyVoidChain2050FulfillmentAnchorSha256V1(normalized), "FULFILLMENT_ANCHOR_MISMATCH");
  return Object.freeze(normalized);
}
