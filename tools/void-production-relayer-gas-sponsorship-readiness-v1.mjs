#!/usr/bin/env node
export const VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_READINESS_V1 =
  "VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_READINESS_V1";

export const AUTHORITY = Object.freeze({
  source_classification_only: true,
  credential_access: false,
  wallet_or_signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  fee_asset_transfer: false,
  native_gas_transfer: false,
  funds_movement: false,
  market_activation: false,
  public_activation: false,
});

const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/u;
const POSITIVE_UINT = /^[1-9][0-9]*$/u;

const POLICY_KEYS = Object.freeze([
  "actual_gas_reconciliation_required",
  "automatic_fee_asset_to_native_conversion",
  "explicit_relayer_opt_in_required",
  "fixed_conversion",
  "market_quote_required",
  "relayer_only_when_user_gas_insufficient",
  "reserve_accounting_required",
  "service_fee_is_privilege_fee",
  "service_fee_must_be_explicit_positive",
  "service_fee_separately_itemized",
  "unused_gas_refund_required",
  "user_pays_first",
]);

const AUTHORITY_KEYS = Object.freeze([
  "chain2050_write",
  "credential_access",
  "fee_asset_transfer",
  "funds_movement",
  "market_activation",
  "native_gas_transfer",
  "public_activation",
  "transaction_broadcast",
  "transaction_signing",
  "wallet_or_signer_access",
]);

function hold(reason, extra = {}) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_READINESS_V1,
    reason,
    ...extra,
    authority: AUTHORITY,
  });
}

function exactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

export function classifyProductionRelayerGasSponsorshipReadinessV1(candidate) {
  if (
    !candidate ||
    candidate.marker !==
      "VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_CANDIDATE_V1" ||
    candidate.version !== 1 ||
    !["hold", "source_ready"].includes(candidate.status) ||
    candidate.chain_id !== 2050
  ) {
    return hold("candidate_identity_invalid");
  }

  if (!exactKeys(candidate.policy, POLICY_KEYS)) {
    return hold("policy_shape_invalid");
  }

  const p = candidate.policy;
  if (
    p.user_pays_first !== true ||
    p.relayer_only_when_user_gas_insufficient !== true ||
    p.explicit_relayer_opt_in_required !== true ||
    p.market_quote_required !== true ||
    p.fixed_conversion !== false ||
    p.service_fee_must_be_explicit_positive !== true ||
    p.service_fee_is_privilege_fee !== true ||
    p.actual_gas_reconciliation_required !== true ||
    p.unused_gas_refund_required !== true ||
    p.service_fee_separately_itemized !== true ||
    p.reserve_accounting_required !== true ||
    p.automatic_fee_asset_to_native_conversion !== false
  ) {
    return hold("production_relayer_policy_invariant_mismatch");
  }

  if (!exactKeys(candidate.authority, AUTHORITY_KEYS)) {
    return hold("authority_shape_invalid");
  }
  for (const key of AUTHORITY_KEYS) {
    if (candidate.authority[key] !== false) {
      return hold("authority_must_remain_false");
    }
  }

  if (
    candidate.quote_engine_implemented !== true ||
    candidate.reconciliation_engine_implemented !== true
  ) {
    return hold("quote_or_reconciliation_engine_missing");
  }

  if (candidate.initial_fee_asset_id !== null) {
    if (
      typeof candidate.initial_fee_asset_id !== "string" ||
      !SAFE_ID.test(candidate.initial_fee_asset_id)
    ) {
      return hold("initial_fee_asset_id_invalid");
    }
  }

  if (candidate.market_quote_source_id !== null) {
    if (
      typeof candidate.market_quote_source_id !== "string" ||
      !SAFE_ID.test(candidate.market_quote_source_id)
    ) {
      return hold("market_quote_source_id_invalid");
    }
  }

  if (candidate.service_fee_bps !== null) {
    if (
      typeof candidate.service_fee_bps !== "string" ||
      !POSITIVE_UINT.test(candidate.service_fee_bps) ||
      BigInt(candidate.service_fee_bps) > 10_000n
    ) {
      return hold("service_fee_bps_invalid");
    }
  }

  const missing = [];
  if (candidate.initial_fee_asset_id === null) {
    missing.push("initial_fee_asset_selection_required");
  }
  if (candidate.market_quote_source_id === null) {
    missing.push("market_quote_source_selection_required");
  }
  if (candidate.service_fee_bps === null) {
    missing.push("explicit_service_fee_bps_required");
  }
  if (candidate.market_quote_adapter_implemented !== true) {
    missing.push("market_quote_adapter_required");
  }
  if (candidate.participant_ui_relayer_toggle_implemented !== true) {
    missing.push("participant_ui_relayer_toggle_required");
  }
  if (candidate.participant_ui_itemized_quote_implemented !== true) {
    missing.push("participant_ui_itemized_quote_required");
  }
  if (candidate.runtime_user_native_balance_gate_implemented !== true) {
    missing.push("runtime_user_native_balance_gate_required");
  }
  if (candidate.fee_asset_reservation_collection_implemented !== true) {
    missing.push("fee_asset_reservation_collection_required");
  }
  if (candidate.post_execution_receipt_binding_implemented !== true) {
    missing.push("post_execution_receipt_binding_required");
  }
  if (candidate.fee_asset_refund_implemented !== true) {
    missing.push("fee_asset_refund_required");
  }
  if (candidate.relayer_reserve_accounting_implemented !== true) {
    missing.push("relayer_reserve_accounting_required");
  }
  if (candidate.native_gas_reserve_replenishment_implemented !== true) {
    missing.push("native_gas_reserve_replenishment_required");
  }
  if (candidate.duplicate_replay_protection_proven !== true) {
    missing.push("duplicate_replay_protection_required");
  }
  if (candidate.bounded_canary_green !== true) {
    missing.push("bounded_canary_required");
  }
  if (candidate.public_activation_ready !== true) {
    missing.push("public_activation_ready_required");
  }

  if (missing.length > 0) {
    return hold("production_gates_incomplete", {
      missing_gates: Object.freeze(missing),
      declared_status: candidate.status,
    });
  }

  if (candidate.status !== "source_ready") {
    return hold("source_ready_status_required", {
      missing_gates: Object.freeze([]),
      declared_status: candidate.status,
    });
  }

  return Object.freeze({
    ok: true,
    status: "SOURCE_READY",
    marker: VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_READINESS_V1,
    chain_id: 2050,
    initial_fee_asset_id: candidate.initial_fee_asset_id,
    market_quote_source_id: candidate.market_quote_source_id,
    service_fee_bps: candidate.service_fee_bps,
    user_pays_first: true,
    explicit_relayer_opt_in_required: true,
    relayer_only_when_user_gas_insufficient: true,
    service_fee_is_privilege_fee: true,
    actual_gas_reconciliation_required: true,
    unused_gas_refund_required: true,
    reserve_accounting_required: true,
    activation_authorized: false,
    funds_movement_authorized: false,
    authority: AUTHORITY,
  });
}
