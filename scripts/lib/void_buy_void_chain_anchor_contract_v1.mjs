import { createHash } from "node:crypto";

export const VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_V1 =
  "VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_V1";
export const VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1 =
  "VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1";
export const VOID_DATANET_CONTENT_ANCHOR_V1 =
  "VOID_DATANET_CONTENT_ANCHOR_V1";

export const CONTRACT_SCHEMA_V1 = "void_buy_void_chain_anchor_contract_v1";
export const FULFILLMENT_ANCHOR_SCHEMA_V1 =
  "void_buy_void_fulfillment_anchor_v1";
export const DATANET_CONTENT_ANCHOR_SCHEMA_V1 =
  "void_datanet_content_anchor_v1";
export const CONTRACT_VERSION_V1 = 1;
export const PAYMENT_ASSET_V1 = "USDC";
export const DELIVERY_ASSET_V1 = "VOID";
export const DELIVERY_NETWORK_V1 = "VOID Network";
export const DELIVERY_CHAIN_ID_V1 = "2050";
export const MAX_ANCHOR_SET_RECORDS_V1 = 10_000;
export const MAX_DATANET_SEGMENT_BYTES_V1 = 8 * 1024 * 1024;

export const PAYMENT_RAILS_V1 = Object.freeze([
  Object.freeze({
    source_chain: "base",
    evm_chain_id: "8453",
    asset: PAYMENT_ASSET_V1,
  }),
  Object.freeze({
    source_chain: "ethereum",
    evm_chain_id: "1",
    asset: PAYMENT_ASSET_V1,
  }),
]);

export const CHAIN_OWNS_V1 = Object.freeze([
  "finalized_base_usdc_transfer_event",
  "finalized_ethereum_usdc_transfer_event",
  "finalized_chain2050_void_transfer_event",
  "accepted_chain2050_checkpoint_or_protocol_finality",
]);

export const REQUIRED_CHAIN_SUCCESSOR_V1 = Object.freeze([
  "payment_keyed_chain2050_inventory_reservation",
  "payment_keyed_chain2050_fulfillment_anchor",
  "finite_chain2050_presale_inventory_state",
  "chain2050_datanet_content_commitment",
]);

export const DATANET_OWNS_V1 = Object.freeze([
  "off_chain_payload_bytes",
  "replica_placement_and_availability",
  "peer_retrieval_routes",
  "content_verified_repair",
  "bounded_compaction_and_retention",
  "availability_evidence",
]);

export const LOCAL_STATE_REQUIRED_V1 = Object.freeze([
  "bounded_source_payment_observation_before_finality",
  "bounded_prebroadcast_nonce_and_submission_intent",
  "unknown_broadcast_receipt_reconciliation",
  "temporary_payment_to_delivery_correlation_until_chain_reservation_exists",
  "incomplete_datanet_publication_and_repair_intent",
]);

export const DISPOSABLE_LOCAL_STATE_V1 = Object.freeze([
  "finalized_payment_index",
  "finalized_reservation_index",
  "finalized_fulfillment_index",
  "purchase_status_projection",
  "datanet_retrieval_route_cache",
  "replica_availability_cache",
]);

export const V4_RETAIN_V1 = Object.freeze([
  "failure_atomic_byte_publication",
  "create_only_no_replace",
  "foreign_generation_preservation",
  "exact_byte_verify_then_use",
  "bounded_pre_finalization_replay",
  "bounded_crash_recovery",
  "content_addressed_manifests",
]);

export const V4_DELETE_V1 = Object.freeze([
  "local_finalized_payment_ledger_authority",
  "local_finalized_reservation_ledger_authority",
  "local_finalized_fulfillment_ledger_authority",
  "local_inventory_truth_override",
  "local_purchase_status_as_canonical_truth",
  "full_presale_history_duplication",
  "broker_sequence_as_substitute_for_chain_order",
  "economic_checkpoint_selector_as_competing_ledger_root",
]);

export const HOSTED_EVIDENCE_GATES_V1 = Object.freeze([
  "dual_payment_rail_identity",
  "payment_anchor_domain_separation",
  "payment_confirmation_separate_from_fulfillment",
  "reservation_before_fulfillment",
  "inventory_conservation_available_reserved_fulfilled",
  "one_payment_one_fulfillment",
  "one_delivery_event_one_payment",
  "local_cache_never_overrides_finalized_chain",
  "chain_truth_does_not_imply_byte_availability",
  "datanet_content_digest_verification",
  "closed_schema_and_authority",
  "current_source_binding",
]);

export const DESIGNATED_HOST_EVIDENCE_GATES_V1 = Object.freeze([
  "failure_atomic_publication",
  "directory_durability",
  "foreign_generation_preservation",
  "peer_loss_partition_rejoin",
  "chain_plus_peer_reconstruction",
  "forged_or_stale_payload_rejection",
  "bounded_replica_repair",
  "live_chain_finality_source",
]);

export const SOURCE_BINDINGS_V1 = Object.freeze({
  payment_identity: "src/economic/buy_void_auto_fulfillment_v1.ts",
  dual_payment_rail_proof: "scripts/prove_buy_void_auto_fulfillment_v1.ts",
  delivery_transaction:
    "src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts",
  delivery_receipt_reconciler:
    "src/economic/buy_void_erc20_delivery_receipt_reconciler_v1.ts",
  fulfillment_join:
    "src/economic/buy_void_fulfillment_confirmation_v1.ts",
  finality_boundary:
    "docs/security/live-canonical-chain-state-finality-api-boundary-v1.md",
});

export const VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_AUTHORITY_V1 =
  Object.freeze({
    network_call: false,
    rpc_call: false,
    filesystem_read: false,
    filesystem_write: false,
    wallet_access: false,
    signer_access: false,
    signing: false,
    transaction_construction: false,
    transaction_broadcast: false,
    inventory_mutation: false,
    chain_mutation: false,
    datanet_mutation: false,
    runtime_activation: false,
    service_restart: false,
    money_movement: false,
  });

const PAYMENT_RAIL_BY_NAME = new Map(
  PAYMENT_RAILS_V1.map((rail) => [rail.source_chain, rail]),
);
const TX_HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const FINALITY_REFERENCE = /^voidfinal1_[0-9a-f]{64}$/;
const OBJECT_ID = /^[A-Za-z0-9._:-]{1,160}$/;

const FULFILLMENT_ANCHOR_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "payment_asset",
  "source_chain",
  "source_chain_id",
  "source_payment_transaction_hash",
  "source_payment_log_index",
  "canonical_payment_identity",
  "canonical_payment_identity_sha256",
  "fulfillment_anchor_key_sha256",
  "delivery_chain_id",
  "void_token_contract",
  "fulfillment_wallet",
  "delivery_address",
  "void_amount_units",
  "delivery_transaction_hash",
  "delivery_log_index",
  "delivery_block_number",
  "delivery_block_hash",
  "finalized",
  "finality_kind",
  "finality_reference",
]);

const FULFILLMENT_CANDIDATE_INPUT_KEYS = Object.freeze([
  "source_chain",
  "source_payment_transaction_hash",
  "source_payment_log_index",
  "void_token_contract",
  "fulfillment_wallet",
  "delivery_address",
  "void_amount_units",
  "delivery_transaction_hash",
  "delivery_log_index",
  "delivery_block_number",
  "delivery_block_hash",
  "finality_kind",
  "finality_reference",
]);

const DATANET_ANCHOR_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "chain_id",
  "object_id",
  "content_sha256",
  "finalized",
  "finality_reference",
]);

const CONTRACT_PACKET_KEYS = Object.freeze([
  "schema",
  "marker",
  "version",
  "coordination_marker",
  "accepted_payment_rails",
  "delivery",
  "current_source_state",
  "CHAIN_OWNS",
  "REQUIRED_CHAIN_SUCCESSOR",
  "DATANET_OWNS",
  "LOCAL_STATE_REQUIRED",
  "DISPOSABLE_LOCAL_STATE",
  "V4_RETAIN_DELETE",
  "SOURCE_BINDINGS",
  "authority",
  "evidence_gates",
]);

function fail(message) {
  throw new Error(message);
}

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label}_must_be_object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(`${label}_keys_mismatch`);
  }
  return object;
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalUint(value, label, { positive = false } = {}) {
  let raw;
  if (typeof value === "bigint") {
    if (value < 0n) fail(`${label}_invalid`);
    raw = value.toString();
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) fail(`${label}_invalid`);
    raw = String(value);
  } else {
    raw = String(value ?? "").trim();
  }

  if (!/^(0|[1-9][0-9]*)$/.test(raw)) fail(`${label}_invalid`);
  if (positive && raw === "0") fail(`${label}_must_be_positive`);
  return raw;
}

function normalizeTxHash(value, label) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!TX_HASH.test(normalized)) fail(`${label}_invalid`);
  return normalized;
}

function normalizeAddress(value, label) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!ADDRESS.test(normalized)) fail(`${label}_invalid`);
  return normalized;
}

function normalizeSha256(value, label) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!SHA256.test(normalized)) fail(`${label}_invalid`);
  return normalized;
}

function exactArray(value, expected, label) {
  if (!Array.isArray(value) || canonicalJson(value) !== canonicalJson(expected)) {
    fail(`${label}_mismatch`);
  }
}

export function normalizeSourceChainV1(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  const normalized = raw === "eth" ? "ethereum" : raw;
  if (!PAYMENT_RAIL_BY_NAME.has(normalized)) {
    fail("unsupported_source_payment_chain");
  }
  return normalized;
}

export function paymentRailV1(sourceChain) {
  return PAYMENT_RAIL_BY_NAME.get(normalizeSourceChainV1(sourceChain));
}

export function canonicalPaymentIdentityV1(input) {
  const value = exactKeys(
    input,
    ["source_chain", "transaction_hash", "log_index"],
    "payment_identity_input",
  );
  const sourceChain = normalizeSourceChainV1(value.source_chain);
  const transactionHash = normalizeTxHash(
    value.transaction_hash,
    "payment_transaction_hash",
  );
  const logIndex = canonicalUint(value.log_index, "payment_log_index");
  return `voidpay1:${sourceChain}:${transactionHash}:${logIndex}`;
}

export function paymentIdentitySha256V1(canonicalPaymentIdentity) {
  const identity = String(canonicalPaymentIdentity ?? "");
  if (
    !/^voidpay1:(?:base|ethereum):0x[0-9a-f]{64}:(?:0|[1-9][0-9]*)$/.test(
      identity,
    )
  ) {
    fail("canonical_payment_identity_invalid");
  }
  return sha256Hex(Buffer.from(identity, "utf8"));
}

export function fulfillmentAnchorKeySha256V1(canonicalPaymentIdentity) {
  const identity = String(canonicalPaymentIdentity ?? "");
  paymentIdentitySha256V1(identity);
  const bytes = Buffer.from(identity, "utf8");
  if (bytes.length > 512) fail("canonical_payment_identity_too_large");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length, 0);
  return sha256Hex(
    Buffer.concat([
      Buffer.from("VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\0", "ascii"),
      length,
      bytes,
    ]),
  );
}

export function buildFulfillmentAnchorCandidateV1(input) {
  const value = exactKeys(
    input,
    FULFILLMENT_CANDIDATE_INPUT_KEYS,
    "fulfillment_anchor_candidate_input",
  );
  const rail = paymentRailV1(value.source_chain);
  const sourcePaymentTransactionHash = normalizeTxHash(
    value.source_payment_transaction_hash,
    "source_payment_transaction_hash",
  );
  const sourcePaymentLogIndex = canonicalUint(
    value.source_payment_log_index,
    "source_payment_log_index",
  );
  const canonicalPaymentIdentity = canonicalPaymentIdentityV1({
    source_chain: rail.source_chain,
    transaction_hash: sourcePaymentTransactionHash,
    log_index: sourcePaymentLogIndex,
  });
  const finalityKind = String(value.finality_kind ?? "").trim();
  if (
    !["accepted_checkpoint", "protocol_finalized_state"].includes(finalityKind)
  ) {
    fail("finality_kind_invalid");
  }
  const finalityReference = String(value.finality_reference ?? "")
    .trim()
    .toLowerCase();
  if (!FINALITY_REFERENCE.test(finalityReference)) {
    fail("finality_reference_invalid");
  }

  return Object.freeze({
    schema: FULFILLMENT_ANCHOR_SCHEMA_V1,
    marker: VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1,
    version: CONTRACT_VERSION_V1,
    payment_asset: PAYMENT_ASSET_V1,
    source_chain: rail.source_chain,
    source_chain_id: rail.evm_chain_id,
    source_payment_transaction_hash: sourcePaymentTransactionHash,
    source_payment_log_index: sourcePaymentLogIndex,
    canonical_payment_identity: canonicalPaymentIdentity,
    canonical_payment_identity_sha256:
      paymentIdentitySha256V1(canonicalPaymentIdentity),
    fulfillment_anchor_key_sha256:
      fulfillmentAnchorKeySha256V1(canonicalPaymentIdentity),
    delivery_chain_id: DELIVERY_CHAIN_ID_V1,
    void_token_contract: normalizeAddress(
      value.void_token_contract,
      "void_token_contract",
    ),
    fulfillment_wallet: normalizeAddress(
      value.fulfillment_wallet,
      "fulfillment_wallet",
    ),
    delivery_address: normalizeAddress(
      value.delivery_address,
      "delivery_address",
    ),
    void_amount_units: canonicalUint(
      value.void_amount_units,
      "void_amount_units",
      { positive: true },
    ),
    delivery_transaction_hash: normalizeTxHash(
      value.delivery_transaction_hash,
      "delivery_transaction_hash",
    ),
    delivery_log_index: canonicalUint(
      value.delivery_log_index,
      "delivery_log_index",
    ),
    delivery_block_number: canonicalUint(
      value.delivery_block_number,
      "delivery_block_number",
      { positive: true },
    ),
    delivery_block_hash: normalizeTxHash(
      value.delivery_block_hash,
      "delivery_block_hash",
    ),
    finalized: true,
    finality_kind: finalityKind,
    finality_reference: finalityReference,
  });
}

export function validateFulfillmentAnchorV1(input) {
  try {
    const value = exactKeys(
      input,
      FULFILLMENT_ANCHOR_KEYS,
      "fulfillment_anchor",
    );
    if (
      value.schema !== FULFILLMENT_ANCHOR_SCHEMA_V1 ||
      value.marker !== VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1 ||
      value.version !== CONTRACT_VERSION_V1 ||
      value.payment_asset !== PAYMENT_ASSET_V1 ||
      String(value.delivery_chain_id) !== DELIVERY_CHAIN_ID_V1 ||
      value.finalized !== true
    ) {
      fail("fulfillment_anchor_constant_mismatch");
    }
    const rebuilt = buildFulfillmentAnchorCandidateV1({
      source_chain: value.source_chain,
      source_payment_transaction_hash:
        value.source_payment_transaction_hash,
      source_payment_log_index: value.source_payment_log_index,
      void_token_contract: value.void_token_contract,
      fulfillment_wallet: value.fulfillment_wallet,
      delivery_address: value.delivery_address,
      void_amount_units: value.void_amount_units,
      delivery_transaction_hash: value.delivery_transaction_hash,
      delivery_log_index: value.delivery_log_index,
      delivery_block_number: value.delivery_block_number,
      delivery_block_hash: value.delivery_block_hash,
      finality_kind: value.finality_kind,
      finality_reference: value.finality_reference,
    });
    if (canonicalJson(value) !== canonicalJson(rebuilt)) {
      fail("fulfillment_anchor_derived_field_mismatch");
    }
    return Object.freeze({ ok: true, anchor: rebuilt });
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      reason: String(error?.message || "fulfillment_anchor_invalid"),
    });
  }
}

export function validateFulfillmentAnchorSetV1(records) {
  if (!Array.isArray(records)) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      reason: "fulfillment_anchor_set_must_be_array",
    });
  }
  if (records.length > MAX_ANCHOR_SET_RECORDS_V1) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      reason: "fulfillment_anchor_set_too_large",
    });
  }

  const byPayment = new Map();
  const byDeliveryEvent = new Map();
  let duplicates = 0;
  for (const raw of records) {
    const validated = validateFulfillmentAnchorV1(raw);
    if (!validated.ok) return validated;
    const anchor = validated.anchor;
    const paymentKey = anchor.fulfillment_anchor_key_sha256;
    const deliveryKey =
      `${anchor.delivery_transaction_hash}:${anchor.delivery_log_index}`;
    const encoded = canonicalJson(anchor);

    if (byPayment.has(paymentKey)) {
      if (byPayment.get(paymentKey) !== encoded) {
        return Object.freeze({
          ok: false,
          status: "HOLD",
          reason: "payment_anchor_conflict",
          fulfillment_anchor_key_sha256: paymentKey,
        });
      }
      duplicates += 1;
    } else {
      byPayment.set(paymentKey, encoded);
    }

    if (
      byDeliveryEvent.has(deliveryKey) &&
      byDeliveryEvent.get(deliveryKey) !== paymentKey
    ) {
      return Object.freeze({
        ok: false,
        status: "HOLD",
        reason: "delivery_event_reuse_conflict",
        delivery_event: deliveryKey,
      });
    }
    byDeliveryEvent.set(deliveryKey, paymentKey);
  }

  return Object.freeze({
    ok: true,
    status: "VALID",
    unique_count: byPayment.size,
    duplicate_count: duplicates,
  });
}

function recoveryDecision(status, detail = {}) {
  return Object.freeze({
    ok: !status.endsWith("_HOLD"),
    status,
    automatic_execution_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    inventory_mutation_authorized: false,
    money_movement_authorized: false,
    local_cache_authoritative: false,
    ...detail,
  });
}

export function decideBuyVoidRecoveryV1(input) {
  try {
    const value = exactKeys(
      input,
      [
        "payment",
        "delivery_observation",
        "fulfillment_anchor",
        "local_cache_claim",
      ],
      "buy_void_recovery_input",
    );
    const payment = exactKeys(
      value.payment,
      ["source_chain", "transaction_hash", "log_index", "finality"],
      "source_payment",
    );
    const sourceChain = normalizeSourceChainV1(payment.source_chain);
    const paymentIdentity = canonicalPaymentIdentityV1({
      source_chain: sourceChain,
      transaction_hash: payment.transaction_hash,
      log_index: payment.log_index,
    });
    const paymentFinality = String(payment.finality ?? "").trim();
    if (!["unseen", "observed", "finalized"].includes(paymentFinality)) {
      fail("source_payment_finality_invalid");
    }

    const localClaim = String(value.local_cache_claim ?? "").trim();
    if (!["unknown", "not_fulfilled", "fulfilled"].includes(localClaim)) {
      fail("local_cache_claim_invalid");
    }

    let delivery = null;
    if (value.delivery_observation !== null) {
      delivery = exactKeys(
        value.delivery_observation,
        [
          "transaction_hash",
          "log_index",
          "block_number",
          "block_hash",
          "confirmation_state",
        ],
        "delivery_observation",
      );
      delivery = Object.freeze({
        transaction_hash: normalizeTxHash(
          delivery.transaction_hash,
          "delivery_transaction_hash",
        ),
        log_index: canonicalUint(
          delivery.log_index,
          "delivery_log_index",
        ),
        block_number: canonicalUint(
          delivery.block_number,
          "delivery_block_number",
          { positive: true },
        ),
        block_hash: normalizeTxHash(
          delivery.block_hash,
          "delivery_block_hash",
        ),
        confirmation_state: String(delivery.confirmation_state ?? "").trim(),
      });
      if (
        !["observed", "confirmed", "finalized"].includes(
          delivery.confirmation_state,
        )
      ) {
        fail("delivery_confirmation_state_invalid");
      }
    }

    if (paymentFinality !== "finalized") {
      return recoveryDecision("SOURCE_PAYMENT_NOT_FINAL_HOLD", {
        canonical_payment_identity: paymentIdentity,
        source_chain: sourceChain,
        local_cache_conflict: localClaim === "fulfilled",
      });
    }

    if (value.fulfillment_anchor === null) {
      if (delivery !== null) {
        return recoveryDecision("CORRELATION_ANCHOR_MISSING_HOLD", {
          canonical_payment_identity: paymentIdentity,
          source_chain: sourceChain,
          observed_delivery_transaction_hash: delivery.transaction_hash,
          local_cache_conflict:
            localClaim !== "unknown" &&
            localClaim !==
              (delivery.confirmation_state === "finalized"
                ? "fulfilled"
                : "not_fulfilled"),
        });
      }
      if (localClaim === "fulfilled") {
        return recoveryDecision(
          "LOCAL_FULFILLMENT_CLAIM_UNANCHORED_HOLD",
          {
            canonical_payment_identity: paymentIdentity,
            source_chain: sourceChain,
            local_cache_conflict: true,
          },
        );
      }
      return recoveryDecision("READY_FOR_BOUNDED_PREPARATION", {
        canonical_payment_identity: paymentIdentity,
        source_chain: sourceChain,
        fulfillment_anchor_key_sha256:
          fulfillmentAnchorKeySha256V1(paymentIdentity),
        local_cache_conflict: false,
      });
    }

    const validated = validateFulfillmentAnchorV1(
      value.fulfillment_anchor,
    );
    if (!validated.ok) {
      return recoveryDecision("FULFILLMENT_ANCHOR_INVALID_HOLD", {
        canonical_payment_identity: paymentIdentity,
        source_chain: sourceChain,
        anchor_reason: validated.reason,
        local_cache_conflict: localClaim === "fulfilled",
      });
    }

    const anchor = validated.anchor;
    if (anchor.canonical_payment_identity !== paymentIdentity) {
      return recoveryDecision("FULFILLMENT_ANCHOR_PAYMENT_MISMATCH_HOLD", {
        canonical_payment_identity: paymentIdentity,
        source_chain: sourceChain,
        anchored_payment_identity: anchor.canonical_payment_identity,
        local_cache_conflict: localClaim === "fulfilled",
      });
    }
    if (
      delivery !== null &&
      (anchor.delivery_transaction_hash !== delivery.transaction_hash ||
        anchor.delivery_log_index !== delivery.log_index ||
        anchor.delivery_block_number !== delivery.block_number ||
        anchor.delivery_block_hash !== delivery.block_hash)
    ) {
      return recoveryDecision("FULFILLMENT_ANCHOR_DELIVERY_MISMATCH_HOLD", {
        canonical_payment_identity: paymentIdentity,
        source_chain: sourceChain,
        anchored_delivery_transaction_hash:
          anchor.delivery_transaction_hash,
        observed_delivery_transaction_hash: delivery.transaction_hash,
        local_cache_conflict: localClaim === "fulfilled",
      });
    }

    return recoveryDecision("ALREADY_FULFILLED", {
      canonical_payment_identity: paymentIdentity,
      source_chain: sourceChain,
      fulfillment_anchor_key_sha256:
        anchor.fulfillment_anchor_key_sha256,
      delivery_transaction_hash: anchor.delivery_transaction_hash,
      local_cache_conflict: localClaim === "not_fulfilled",
    });
  } catch (error) {
    return recoveryDecision("RECOVERY_INPUT_INVALID_HOLD", {
      reason: String(error?.message || "recovery_input_invalid"),
      local_cache_conflict: false,
    });
  }
}

export function resolveFinalizedChainTruthV1(input) {
  const value = exactKeys(
    input,
    ["finalized_chain_value", "local_cache_value"],
    "truth_precedence_input",
  );
  if (value.finalized_chain_value === undefined) {
    fail("finalized_chain_value_required");
  }
  return Object.freeze({
    source: "finalized_chain",
    value: value.finalized_chain_value,
    local_cache_conflict:
      value.local_cache_value !== undefined &&
      canonicalJson(value.local_cache_value) !==
        canonicalJson(value.finalized_chain_value),
  });
}

export function buildDatanetContentAnchorV1(input) {
  const value = exactKeys(
    input,
    ["object_id", "content_sha256", "finality_reference"],
    "datanet_content_anchor_input",
  );
  const objectId = String(value.object_id ?? "").trim();
  if (!OBJECT_ID.test(objectId)) fail("datanet_object_id_invalid");
  const finalityReference = String(value.finality_reference ?? "")
    .trim()
    .toLowerCase();
  if (!FINALITY_REFERENCE.test(finalityReference)) {
    fail("datanet_finality_reference_invalid");
  }
  return Object.freeze({
    schema: DATANET_CONTENT_ANCHOR_SCHEMA_V1,
    marker: VOID_DATANET_CONTENT_ANCHOR_V1,
    version: CONTRACT_VERSION_V1,
    chain_id: DELIVERY_CHAIN_ID_V1,
    object_id: objectId,
    content_sha256: normalizeSha256(
      value.content_sha256,
      "datanet_content_sha256",
    ),
    finalized: true,
    finality_reference: finalityReference,
  });
}

function validateDatanetContentAnchorV1(input) {
  const value = exactKeys(
    input,
    DATANET_ANCHOR_KEYS,
    "datanet_content_anchor",
  );
  if (
    value.schema !== DATANET_CONTENT_ANCHOR_SCHEMA_V1 ||
    value.marker !== VOID_DATANET_CONTENT_ANCHOR_V1 ||
    value.version !== CONTRACT_VERSION_V1 ||
    String(value.chain_id) !== DELIVERY_CHAIN_ID_V1 ||
    value.finalized !== true
  ) {
    fail("datanet_content_anchor_constant_mismatch");
  }
  const rebuilt = buildDatanetContentAnchorV1({
    object_id: value.object_id,
    content_sha256: value.content_sha256,
    finality_reference: value.finality_reference,
  });
  if (canonicalJson(value) !== canonicalJson(rebuilt)) {
    fail("datanet_content_anchor_derived_field_mismatch");
  }
  return rebuilt;
}

function datanetDecision(status, detail = {}) {
  return Object.freeze({
    ok: status === "PAYLOAD_VERIFIED",
    status,
    chain_truth_authoritative: true,
    byte_availability_proven: status === "PAYLOAD_VERIFIED",
    filesystem_mutation_authorized: false,
    network_mutation_authorized: false,
    ...detail,
  });
}

export function decideDatanetSegmentRecoveryV1(input) {
  try {
    const value = exactKeys(
      input,
      ["chain_anchor", "payload"],
      "datanet_recovery_input",
    );
    if (value.chain_anchor === null) {
      return datanetDecision("CHAIN_ANCHOR_REQUIRED_HOLD");
    }
    const anchor = validateDatanetContentAnchorV1(value.chain_anchor);
    if (value.payload === null || value.payload === undefined) {
      return datanetDecision("PAYLOAD_UNAVAILABLE", {
        object_id: anchor.object_id,
        expected_sha256: anchor.content_sha256,
      });
    }
    if (
      !Buffer.isBuffer(value.payload) &&
      !(value.payload instanceof Uint8Array)
    ) {
      return datanetDecision("PAYLOAD_INPUT_INVALID_HOLD", {
        object_id: anchor.object_id,
      });
    }
    const bytes = Buffer.from(value.payload);
    if (bytes.length > MAX_DATANET_SEGMENT_BYTES_V1) {
      return datanetDecision("PAYLOAD_TOO_LARGE_HOLD", {
        object_id: anchor.object_id,
        payload_bytes: bytes.length,
        maximum_bytes: MAX_DATANET_SEGMENT_BYTES_V1,
      });
    }
    const observedSha256 = sha256Hex(bytes);
    if (observedSha256 !== anchor.content_sha256) {
      return datanetDecision("PAYLOAD_DIGEST_MISMATCH_HOLD", {
        object_id: anchor.object_id,
        expected_sha256: anchor.content_sha256,
        observed_sha256: observedSha256,
      });
    }
    return datanetDecision("PAYLOAD_VERIFIED", {
      object_id: anchor.object_id,
      content_sha256: observedSha256,
      payload_bytes: bytes.length,
    });
  } catch (error) {
    return datanetDecision("DATANET_RECOVERY_INPUT_INVALID_HOLD", {
      reason: String(error?.message || "datanet_recovery_input_invalid"),
    });
  }
}

export function validateChainAnchorContractPacketV1(input) {
  try {
    const value = exactKeys(
      input,
      CONTRACT_PACKET_KEYS,
      "chain_anchor_contract_packet",
    );
    if (
      value.schema !== CONTRACT_SCHEMA_V1 ||
      value.marker !== VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_V1 ||
      value.version !== CONTRACT_VERSION_V1 ||
      value.coordination_marker !==
        "VOID_COORDINATION_CONTROL_PLANE_V510"
    ) {
      fail("chain_anchor_contract_constant_mismatch");
    }

    exactArray(
      value.accepted_payment_rails,
      PAYMENT_RAILS_V1,
      "accepted_payment_rails",
    );
    exactKeys(
      value.delivery,
      [
        "network",
        "chain_id",
        "asset",
        "current_transaction_shape",
        "required_successor",
      ],
      "delivery",
    );
    if (
      value.delivery.network !== DELIVERY_NETWORK_V1 ||
      String(value.delivery.chain_id) !== DELIVERY_CHAIN_ID_V1 ||
      value.delivery.asset !== DELIVERY_ASSET_V1 ||
      value.delivery.current_transaction_shape !==
        "plain_erc20_transfer" ||
      value.delivery.required_successor !==
        "payment_reservation_then_payment_keyed_fulfillment"
    ) {
      fail("delivery_contract_mismatch");
    }

    exactKeys(
      value.current_source_state,
      [
        "dual_usdc_payment_rails_recognized",
        "on_chain_payment_reservation_present",
        "on_chain_payment_to_fulfillment_anchor_present",
        "on_chain_finite_inventory_state_present",
        "chain2050_live_route_fork_choice_finality_present",
        "chain_hash_proves_datanet_byte_availability",
      ],
      "current_source_state",
    );
    if (
      value.current_source_state.dual_usdc_payment_rails_recognized !==
        true ||
      value.current_source_state
        .on_chain_payment_reservation_present !== false ||
      value.current_source_state
        .on_chain_payment_to_fulfillment_anchor_present !== false ||
      value.current_source_state
        .on_chain_finite_inventory_state_present !== false ||
      value.current_source_state
        .chain2050_live_route_fork_choice_finality_present !== false ||
      value.current_source_state
        .chain_hash_proves_datanet_byte_availability !== false
    ) {
      fail("current_source_state_mismatch");
    }

    exactArray(value.CHAIN_OWNS, CHAIN_OWNS_V1, "CHAIN_OWNS");
    exactArray(
      value.REQUIRED_CHAIN_SUCCESSOR,
      REQUIRED_CHAIN_SUCCESSOR_V1,
      "REQUIRED_CHAIN_SUCCESSOR",
    );
    exactArray(value.DATANET_OWNS, DATANET_OWNS_V1, "DATANET_OWNS");
    exactArray(
      value.LOCAL_STATE_REQUIRED,
      LOCAL_STATE_REQUIRED_V1,
      "LOCAL_STATE_REQUIRED",
    );
    exactArray(
      value.DISPOSABLE_LOCAL_STATE,
      DISPOSABLE_LOCAL_STATE_V1,
      "DISPOSABLE_LOCAL_STATE",
    );

    exactKeys(
      value.V4_RETAIN_DELETE,
      ["retain", "delete"],
      "V4_RETAIN_DELETE",
    );
    exactArray(
      value.V4_RETAIN_DELETE.retain,
      V4_RETAIN_V1,
      "V4_RETAIN_DELETE.retain",
    );
    exactArray(
      value.V4_RETAIN_DELETE.delete,
      V4_DELETE_V1,
      "V4_RETAIN_DELETE.delete",
    );

    if (
      canonicalJson(value.SOURCE_BINDINGS) !==
      canonicalJson(SOURCE_BINDINGS_V1)
    ) {
      fail("SOURCE_BINDINGS_mismatch");
    }
    if (
      canonicalJson(value.authority) !==
      canonicalJson(
        VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_AUTHORITY_V1,
      )
    ) {
      fail("authority_mismatch");
    }

    exactKeys(
      value.evidence_gates,
      ["hosted", "designated_host"],
      "evidence_gates",
    );
    exactArray(
      value.evidence_gates.hosted,
      HOSTED_EVIDENCE_GATES_V1,
      "evidence_gates.hosted",
    );
    exactArray(
      value.evidence_gates.designated_host,
      DESIGNATED_HOST_EVIDENCE_GATES_V1,
      "evidence_gates.designated_host",
    );

    return Object.freeze({ ok: true, packet: value });
  } catch (error) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      reason: String(error?.message || "chain_anchor_contract_invalid"),
    });
  }
}
