import {
  C, canonical, domain, exact, fail, hex64, keys, plain,
  normalizeBuyVoidFinalizedSourcePaymentV1,
  normalizeChain2050FinalizedDeliveryV1,
  VOID_BUY_VOID_CHAIN2050_PRESALE_AUTHORITY_V1,
  VOID_BUY_VOID_CHAIN2050_PRESALE_FULFILLMENT_V1,
  VOID_BUY_VOID_CHAIN2050_PRESALE_SETTLEMENT_V1,
  VOID_BUY_VOID_CHAIN2050_PRESALE_STATE_V1,
} from "./void_buy_void_chain2050_presale_identity_v1.mjs";
import {
  computeBuyVoidChain2050FulfillmentAnchorSha256V1,
  computeBuyVoidChain2050PresaleStateSha256V1,
  createBuyVoidChain2050PresaleGenesisV1, root,
  validateBuyVoidChain2050FulfillmentRecordV1,
  validateBuyVoidChain2050PresaleStateV1,
} from "./void_buy_void_chain2050_presale_state_v1.mjs";

function sameFacts(record, payment, delivery) {
  return record.payment_key_sha256 === payment.payment_key_sha256 &&
    record.source_policy_fingerprint_sha256 === payment.source_policy_fingerprint_sha256 &&
    record.source_finality_attestation_sha256 === payment.source_finality_attestation_sha256 &&
    record.payment_usdc_atoms === payment.payment_usdc_atoms &&
    record.delivery_address === payment.delivery_address &&
    record.delivery_event_key_sha256 === delivery.delivery_event_key_sha256 &&
    record.delivery_void_atoms === delivery.void_amount_atoms &&
    record.chain2050_block_height === delivery.block_height &&
    record.chain2050_block_hash === delivery.block_hash &&
    record.chain2050_finality_attestation_sha256 === delivery.finality_attestation_sha256;
}

export class BuyVoidChain2050PresaleReferenceMachineV1 {
  #state;
  #payments = new Map();
  #deliveries = new Map();
  #events = [];
  constructor({ genesis = createBuyVoidChain2050PresaleGenesisV1() } = {}) {
    this.#state = validateBuyVoidChain2050PresaleStateV1(genesis);
    if (this.#state.state_sequence !== "0") fail("MACHINE_REQUIRES_GENESIS");
  }
  get state() { return structuredClone(this.#state); }
  get authority() { return VOID_BUY_VOID_CHAIN2050_PRESALE_AUTHORITY_V1; }
  get fulfillmentCount() { return this.#events.length; }
  hasPaymentKey(key) { return this.#payments.has(hex64(key, "INVALID_PAYMENT_KEY")); }
  hasDeliveryEventKey(key) { return this.#deliveries.has(hex64(key, "INVALID_DELIVERY_KEY")); }
  getFulfillmentByPaymentKey(key) {
    const value = this.#payments.get(hex64(key, "INVALID_PAYMENT_KEY"));
    return value ? structuredClone(value) : null;
  }
  getFulfillmentByDeliveryEventKey(key) {
    const paymentKey = this.#deliveries.get(hex64(key, "INVALID_DELIVERY_KEY"));
    return paymentKey ? this.getFulfillmentByPaymentKey(paymentKey) : null;
  }
  exportFulfillmentEvents({ offset = 0, limit = 100 } = {}) {
    if (!Number.isSafeInteger(offset) || offset < 0) fail("INVALID_EVENT_OFFSET");
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 4096) fail("INVALID_EVENT_LIMIT");
    return this.#events.slice(offset, offset + limit).map((entry) => structuredClone(entry));
  }
  preview(input) { return this.#decide(input, false); }
  apply(input) { return this.#decide(input, true); }
  #decide(input, mutate) {
    try {
      keys(input, ["expected_state_sha256", "source_payment", "chain2050_delivery"], "SETTLEMENT_INPUT_SHAPE");
      exact(hex64(input.expected_state_sha256, "INVALID_EXPECTED_STATE"), this.#state.state_sha256, "STALE_PRESALE_STATE_PRECONDITION");
      const payment = normalizeBuyVoidFinalizedSourcePaymentV1(input.source_payment);
      const delivery = normalizeChain2050FinalizedDeliveryV1(input.chain2050_delivery);
      const prior = this.#payments.get(payment.payment_key_sha256);
      if (prior) {
        if (!sameFacts(prior, payment, delivery)) fail("PAYMENT_ALREADY_FULFILLED_CONFLICT");
        return Object.freeze({ ok: true, status: "duplicate_exact", duplicate: true, mutation_applied: false,
          fulfillment: structuredClone(prior), state: this.state, transaction_authority_granted: false });
      }
      if (this.#deliveries.has(delivery.delivery_event_key_sha256)) fail("DELIVERY_EVENT_ALREADY_BOUND_TO_PAYMENT");
      const paid = BigInt(payment.payment_usdc_atoms);
      const delivered = BigInt(delivery.void_amount_atoms);
      if (paid * 2n !== delivered) fail("PRESALE_RATE_MISMATCH");
      exact(delivery.recipient_address, payment.delivery_address, "DELIVERY_RECIPIENT_MISMATCH");
      const remaining = BigInt(this.#state.remaining_inventory_void_atoms);
      if (delivered > remaining) fail("PRESALE_INVENTORY_EXHAUSTED");
      const sequence = BigInt(this.#state.state_sequence) + 1n;
      const record = {
        schema: "void_buy_void_chain2050_fulfillment_v1", marker: VOID_BUY_VOID_CHAIN2050_PRESALE_FULFILLMENT_V1,
        version: 1, pool_id: C.pool_id, policy_id: C.policy_id,
        payment_key_sha256: payment.payment_key_sha256, canonical_payment_identity: payment.canonical_payment_identity,
        source_chain: payment.source_chain, source_chain_id: payment.source_chain_id,
        source_transaction_hash: payment.source_transaction_hash, source_log_index: payment.source_log_index,
        source_policy_fingerprint_sha256: payment.source_policy_fingerprint_sha256,
        source_finality_attestation_sha256: payment.source_finality_attestation_sha256,
        payment_usdc_atoms: payment.payment_usdc_atoms, delivery_address: payment.delivery_address,
        delivery_void_atoms: delivery.void_amount_atoms, delivery_event_identity: delivery.delivery_event_identity,
        delivery_event_key_sha256: delivery.delivery_event_key_sha256,
        chain2050_transaction_hash: delivery.transaction_hash, chain2050_log_index: delivery.log_index,
        chain2050_block_height: delivery.block_height, chain2050_block_hash: delivery.block_hash,
        chain2050_finality_attestation_sha256: delivery.finality_attestation_sha256,
        previous_state_sha256: this.#state.state_sha256, state_sequence: sequence.toString(), fulfillment_anchor_sha256: "",
      };
      record.fulfillment_anchor_sha256 = computeBuyVoidChain2050FulfillmentAnchorSha256V1(record);
      const fulfillment = validateBuyVoidChain2050FulfillmentRecordV1(record);
      const fulfilled = BigInt(this.#state.fulfilled_void_atoms) + delivered;
      const next = {
        schema: "void_buy_void_chain2050_presale_state_v1", marker: VOID_BUY_VOID_CHAIN2050_PRESALE_STATE_V1,
        version: 1, chain_id: "2050", pool_id: C.pool_id, policy_id: C.policy_id,
        initial_inventory_void_atoms: C.initial_inventory_void_atoms,
        remaining_inventory_void_atoms: (remaining - delivered).toString(), fulfilled_void_atoms: fulfilled.toString(),
        fulfillment_count: sequence.toString(), state_sequence: sequence.toString(),
        previous_state_sha256: this.#state.state_sha256,
        last_fulfillment_anchor_sha256: fulfillment.fulfillment_anchor_sha256,
        transition_root_sha256: root(this.#state.transition_root_sha256, fulfillment.fulfillment_anchor_sha256),
        state_sha256: "",
      };
      next.state_sha256 = computeBuyVoidChain2050PresaleStateSha256V1(next);
      const state = validateBuyVoidChain2050PresaleStateV1(next);
      if (mutate) {
        this.#payments.set(fulfillment.payment_key_sha256, fulfillment);
        this.#deliveries.set(fulfillment.delivery_event_key_sha256, fulfillment.payment_key_sha256);
        this.#events.push(fulfillment);
        this.#state = state;
      }
      return Object.freeze({ ok: true, status: mutate ? "applied" : "would_apply", duplicate: false,
        mutation_applied: mutate, fulfillment: structuredClone(fulfillment), state: structuredClone(state),
        transaction_authority_granted: false });
    } catch (error) {
      return Object.freeze({ ok: false, status: "held", reason: String(error?.code || "PRESALE_SETTLEMENT_HOLD"),
        detail: String(error?.detail || error?.message || "unknown"), mutation_applied: false,
        transaction_authority_granted: false });
    }
  }
}

export function replayBuyVoidChain2050PresaleEventsV1(events, { maxEvents = 100000 } = {}) {
  if (!Array.isArray(events)) fail("EVENT_REPLAY_NOT_ARRAY");
  if (!Number.isSafeInteger(maxEvents) || maxEvents < 0 || maxEvents > 1_000_000) fail("INVALID_MAX_EVENTS");
  if (events.length > maxEvents) fail("EVENT_REPLAY_BOUND_EXCEEDED");
  let state = createBuyVoidChain2050PresaleGenesisV1();
  const payments = new Set();
  const deliveries = new Set();
  for (const raw of events) {
    const record = validateBuyVoidChain2050FulfillmentRecordV1(raw);
    const sequence = BigInt(state.state_sequence) + 1n;
    exact(record.state_sequence, sequence.toString(), "EVENT_REPLAY_SEQUENCE_MISMATCH");
    exact(record.previous_state_sha256, state.state_sha256, "EVENT_REPLAY_PREVIOUS_STATE_MISMATCH");
    if (payments.has(record.payment_key_sha256)) fail("EVENT_REPLAY_DUPLICATE_PAYMENT_KEY");
    if (deliveries.has(record.delivery_event_key_sha256)) fail("EVENT_REPLAY_DUPLICATE_DELIVERY_EVENT_KEY");
    const delivered = BigInt(record.delivery_void_atoms);
    const remaining = BigInt(state.remaining_inventory_void_atoms);
    if (delivered > remaining) fail("EVENT_REPLAY_INVENTORY_EXHAUSTED");
    const next = {
      schema: "void_buy_void_chain2050_presale_state_v1", marker: VOID_BUY_VOID_CHAIN2050_PRESALE_STATE_V1,
      version: 1, chain_id: "2050", pool_id: C.pool_id, policy_id: C.policy_id,
      initial_inventory_void_atoms: C.initial_inventory_void_atoms,
      remaining_inventory_void_atoms: (remaining - delivered).toString(),
      fulfilled_void_atoms: (BigInt(state.fulfilled_void_atoms) + delivered).toString(),
      fulfillment_count: sequence.toString(), state_sequence: sequence.toString(),
      previous_state_sha256: state.state_sha256,
      last_fulfillment_anchor_sha256: record.fulfillment_anchor_sha256,
      transition_root_sha256: root(state.transition_root_sha256, record.fulfillment_anchor_sha256), state_sha256: "",
    };
    next.state_sha256 = computeBuyVoidChain2050PresaleStateSha256V1(next);
    state = validateBuyVoidChain2050PresaleStateV1(next);
    payments.add(record.payment_key_sha256);
    deliveries.add(record.delivery_event_key_sha256);
  }
  return Object.freeze({ marker: "VOID_BUY_VOID_CHAIN2050_PRESALE_EVENT_REPLAY_V1",
    event_count: String(events.length), state: structuredClone(state),
    authority: VOID_BUY_VOID_CHAIN2050_PRESALE_AUTHORITY_V1 });
}

export function reconcileBuyVoidLocalFulfillmentProjectionV1({ chain_fulfillment, local_fulfillment }) {
  const chain = validateBuyVoidChain2050FulfillmentRecordV1(chain_fulfillment);
  if (local_fulfillment == null) return Object.freeze({ status: "rebuild_local_projection_from_chain",
    chain_authoritative: true, automatic_delivery_authorized: false, local_projection: structuredClone(chain) });
  let local;
  try { local = validateBuyVoidChain2050FulfillmentRecordV1(local_fulfillment); }
  catch (error) { return Object.freeze({ status: "replace_invalid_local_projection_from_chain",
    chain_authoritative: true, automatic_delivery_authorized: false, local_projection: structuredClone(chain),
    rejected_local_reason: String(error?.code || "INVALID_LOCAL_PROJECTION") }); }
  if (canonical(local) === canonical(chain)) return Object.freeze({ status: "in_sync", chain_authoritative: true,
    automatic_delivery_authorized: false, local_projection: structuredClone(chain) });
  return Object.freeze({ status: "replace_conflicting_local_projection_from_chain", chain_authoritative: true,
    automatic_delivery_authorized: false, local_projection: structuredClone(chain),
    rejected_local_anchor_sha256: local.fulfillment_anchor_sha256 });
}

export function classifyUnanchoredBuyVoidLocalClaimV1(localClaim) {
  if (!plain(localClaim)) return Object.freeze({ status: "hold_local_claim_invalid",
    chain_authoritative: true, automatic_delivery_authorized: false });
  return Object.freeze({ status: "hold_local_claim_not_present_on_chain", chain_authoritative: true,
    automatic_delivery_authorized: false,
    local_claim_fingerprint_sha256: domain("VOID_BUY_VOID_UNANCHORED_LOCAL_CLAIM_V1", localClaim) });
}
