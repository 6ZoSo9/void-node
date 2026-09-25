#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1 =
  "VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1";

export const AUTHORITY = Object.freeze({
  source_only_policy: true,
  user_pays_first: true,
  explicit_relayer_opt_in_required: true,
  relayer_only_when_user_gas_insufficient: true,
  market_quote_required_for_sponsorship: true,
  fixed_conversion_forbidden: true,
  explicit_positive_service_fee_required: true,
  actual_gas_reconciliation_required: true,
  unused_gas_refund_required: true,
  service_fee_separately_itemized: true,
  reserve_accounting_required: true,
  automatic_fee_asset_conversion: false,
  credential_access: false,
  wallet_or_signer_access: false,
  rpc_call: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  fee_asset_transfer: false,
  native_gas_transfer: false,
  funds_movement: false,
  market_activation: false,
  public_activation: false,
});

const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const POSITIVE_UINT = /^[1-9][0-9]*$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/u;
const BPS = 10_000n;
const MAX_SERVICE_FEE_BPS = 10_000n;

function canonical(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonical).join(",") + "]";
  }
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}"
  );
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function uint(value) {
  const raw = String(value ?? "").trim();
  if (!UINT.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function positiveUint(value) {
  const raw = String(value ?? "").trim();
  if (!POSITIVE_UINT.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function safeId(value) {
  const raw = String(value ?? "").trim();
  return SAFE_ID.test(raw) ? raw : "";
}

function ceilDiv(numerator, denominator) {
  if (denominator <= 0n) throw new Error("division_by_zero");
  return (numerator + denominator - 1n) / denominator;
}

function held(reason, detail = undefined) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1,
    reason,
    relayer_used: false,
    money_movement_authorized: false,
    authority: AUTHORITY,
    ...(detail ? { detail } : {}),
  });
}

function normalizeMarketQuote(raw, nowMs) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const quoteId = safeId(raw.quote_id);
  const sourceId = safeId(raw.source_id);
  const feeAssetId = safeId(raw.fee_asset_id);
  const voidAtoms = positiveUint(raw.void_atoms);
  const feeAssetAtoms = positiveUint(raw.fee_asset_atoms);
  const observedAtMs = uint(raw.observed_at_ms);
  const expiresAtMs = uint(raw.expires_at_ms);

  if (
    !quoteId ||
    !sourceId ||
    !feeAssetId ||
    raw.source_kind !== "market" ||
    raw.fixed_conversion !== false ||
    voidAtoms === null ||
    feeAssetAtoms === null ||
    observedAtMs === null ||
    expiresAtMs === null ||
    expiresAtMs <= observedAtMs ||
    observedAtMs > nowMs ||
    nowMs > expiresAtMs
  ) {
    return null;
  }

  const material = {
    quote_id: quoteId,
    source_id: sourceId,
    source_kind: "market",
    fee_asset_id: feeAssetId,
    void_atoms: voidAtoms.toString(),
    fee_asset_atoms: feeAssetAtoms.toString(),
    observed_at_ms: observedAtMs.toString(),
    expires_at_ms: expiresAtMs.toString(),
    fixed_conversion: false,
  };

  return Object.freeze({
    ...material,
    quote_fingerprint_sha256: sha256(canonical(material)),
  });
}

function gasEnvelope(input) {
  const balance = uint(input?.user_native_balance_wei);
  const gasLimit = positiveUint(input?.estimated_gas_limit);
  const maxFee = positiveUint(input?.max_fee_per_gas_wei);

  if (balance === null || gasLimit === null || maxFee === null) {
    return null;
  }

  return Object.freeze({
    user_native_balance_wei: balance,
    estimated_gas_limit: gasLimit,
    max_fee_per_gas_wei: maxFee,
    reserved_native_gas_wei: gasLimit * maxFee,
  });
}

function serviceFeeBps(value) {
  const parsed = positiveUint(value);
  if (parsed === null || parsed > MAX_SERVICE_FEE_BPS) return null;
  return parsed;
}

export function quoteProductionRelayerGasSponsorshipV1(input) {
  if (
    !input ||
    input.chain_id !== 2050 ||
    typeof input.user_address !== "string" ||
    !ADDRESS.test(input.user_address) ||
    typeof input.relayer_opt_in !== "boolean"
  ) {
    return held("request_shape_invalid");
  }

  const envelope = gasEnvelope(input);
  if (!envelope) return held("gas_envelope_invalid");

  const userCanPay =
    envelope.user_native_balance_wei >= envelope.reserved_native_gas_wei;

  if (userCanPay) {
    return Object.freeze({
      ok: true,
      status: "USER_PAYS_NATIVE_GAS",
      marker: VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1,
      chain_id: 2050,
      user_address: input.user_address.toLowerCase(),
      user_native_balance_wei:
        envelope.user_native_balance_wei.toString(),
      reserved_native_gas_wei:
        envelope.reserved_native_gas_wei.toString(),
      native_gas_shortfall_wei: "0",
      relayer_needed: false,
      relayer_available: false,
      relayer_opt_in: input.relayer_opt_in,
      relayer_used: false,
      sponsorship_quote: null,
      money_movement_authorized: false,
      authority: AUTHORITY,
    });
  }

  const shortfall =
    envelope.reserved_native_gas_wei - envelope.user_native_balance_wei;

  if (input.relayer_opt_in !== true) {
    return Object.freeze({
      ok: false,
      status: "HOLD",
      marker: VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1,
      reason: "insufficient_native_gas_relayer_opt_in_required",
      chain_id: 2050,
      user_address: input.user_address.toLowerCase(),
      user_native_balance_wei:
        envelope.user_native_balance_wei.toString(),
      reserved_native_gas_wei:
        envelope.reserved_native_gas_wei.toString(),
      native_gas_shortfall_wei: shortfall.toString(),
      relayer_needed: true,
      relayer_available: true,
      relayer_opt_in: false,
      relayer_used: false,
      money_movement_authorized: false,
      authority: AUTHORITY,
    });
  }

  const nowMs = uint(input.now_ms);
  if (nowMs === null) return held("now_ms_invalid");

  const quote = normalizeMarketQuote(input.market_quote, nowMs);
  if (!quote) return held("market_quote_invalid_or_expired");

  const feeBps = serviceFeeBps(input.service_fee_bps);
  if (feeBps === null) {
    return held("service_fee_bps_must_be_explicit_positive");
  }

  const reservedReimbursement = ceilDiv(
    envelope.reserved_native_gas_wei * BigInt(quote.fee_asset_atoms),
    BigInt(quote.void_atoms),
  );
  const reservedServiceFee = ceilDiv(
    reservedReimbursement * feeBps,
    BPS,
  );
  const reservedTotalCharge =
    reservedReimbursement + reservedServiceFee;

  const planBody = {
    chain_id: 2050,
    user_address: input.user_address.toLowerCase(),
    user_native_balance_wei:
      envelope.user_native_balance_wei.toString(),
    estimated_gas_limit: envelope.estimated_gas_limit.toString(),
    max_fee_per_gas_wei: envelope.max_fee_per_gas_wei.toString(),
    reserved_native_gas_wei:
      envelope.reserved_native_gas_wei.toString(),
    native_gas_shortfall_wei: shortfall.toString(),
    relayer_opt_in: true,
    fee_asset_id: quote.fee_asset_id,
    market_quote_id: quote.quote_id,
    market_quote_fingerprint_sha256:
      quote.quote_fingerprint_sha256,
    market_quote_source_id: quote.source_id,
    market_quote_void_atoms: quote.void_atoms,
    market_quote_fee_asset_atoms: quote.fee_asset_atoms,
    service_fee_bps: feeBps.toString(),
    reserved_gas_reimbursement_fee_asset_units:
      reservedReimbursement.toString(),
    reserved_service_fee_asset_units:
      reservedServiceFee.toString(),
    reserved_total_charge_fee_asset_units:
      reservedTotalCharge.toString(),
  };

  const sponsorshipQuoteId =
    "voidrgsq1_" + sha256(canonical(planBody));

  return Object.freeze({
    ok: true,
    status: "RELAYER_QUOTE_READY_FOR_USER_APPROVAL",
    marker: VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1,
    sponsorship_quote_id: sponsorshipQuoteId,
    ...planBody,
    user_pays_first: true,
    relayer_needed: true,
    relayer_available: true,
    relayer_used: false,
    fixed_conversion: false,
    actual_gas_reconciliation_required: true,
    unused_gas_refund_required: true,
    service_fee_separately_itemized: true,
    economic_margin_at_locked_quote_fee_asset_units:
      reservedServiceFee.toString(),
    automatic_fee_asset_to_native_conversion: false,
    money_movement_authorized: false,
    authority: AUTHORITY,
  });
}

function validateQuotePlan(plan) {
  if (
    !plan ||
    plan.ok !== true ||
    plan.status !== "RELAYER_QUOTE_READY_FOR_USER_APPROVAL" ||
    plan.marker !== VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1 ||
    typeof plan.sponsorship_quote_id !== "string" ||
    !/^voidrgsq1_[0-9a-f]{64}$/u.test(plan.sponsorship_quote_id) ||
    plan.relayer_opt_in !== true ||
    plan.user_pays_first !== true ||
    plan.relayer_needed !== true ||
    plan.fixed_conversion !== false ||
    plan.actual_gas_reconciliation_required !== true ||
    plan.unused_gas_refund_required !== true ||
    plan.service_fee_separately_itemized !== true ||
    plan.money_movement_authorized !== false
  ) {
    return null;
  }

  const material = {
    chain_id: plan.chain_id,
    user_address: plan.user_address,
    user_native_balance_wei: plan.user_native_balance_wei,
    estimated_gas_limit: plan.estimated_gas_limit,
    max_fee_per_gas_wei: plan.max_fee_per_gas_wei,
    reserved_native_gas_wei: plan.reserved_native_gas_wei,
    native_gas_shortfall_wei: plan.native_gas_shortfall_wei,
    relayer_opt_in: true,
    fee_asset_id: plan.fee_asset_id,
    market_quote_id: plan.market_quote_id,
    market_quote_fingerprint_sha256:
      plan.market_quote_fingerprint_sha256,
    market_quote_source_id: plan.market_quote_source_id,
    market_quote_void_atoms: plan.market_quote_void_atoms,
    market_quote_fee_asset_atoms: plan.market_quote_fee_asset_atoms,
    service_fee_bps: plan.service_fee_bps,
    reserved_gas_reimbursement_fee_asset_units:
      plan.reserved_gas_reimbursement_fee_asset_units,
    reserved_service_fee_asset_units:
      plan.reserved_service_fee_asset_units,
    reserved_total_charge_fee_asset_units:
      plan.reserved_total_charge_fee_asset_units,
  };

  const expected = "voidrgsq1_" + sha256(canonical(material));
  if (expected !== plan.sponsorship_quote_id) return null;
  return material;
}

export function reconcileProductionRelayerGasSponsorshipV1(input) {
  const plan = validateQuotePlan(input?.sponsorship_quote);
  if (!plan) return held("sponsorship_quote_binding_invalid");

  if (input?.user_approved !== true) {
    return held("explicit_user_approval_required");
  }

  const gasUsed = positiveUint(input.actual_gas_used);
  const effectiveGasPrice = positiveUint(
    input.actual_effective_gas_price_wei,
  );
  if (gasUsed === null || effectiveGasPrice === null) {
    return held("actual_gas_receipt_invalid");
  }

  const actualNativeGasWei = gasUsed * effectiveGasPrice;
  const reservedNativeGasWei = BigInt(plan.reserved_native_gas_wei);
  if (actualNativeGasWei > reservedNativeGasWei) {
    return held("actual_gas_exceeds_reserved_envelope");
  }

  const voidAtoms = BigInt(plan.market_quote_void_atoms);
  const feeAssetAtoms = BigInt(plan.market_quote_fee_asset_atoms);
  const feeBps = BigInt(plan.service_fee_bps);

  const actualReimbursement = ceilDiv(
    actualNativeGasWei * feeAssetAtoms,
    voidAtoms,
  );
  const actualServiceFee = ceilDiv(
    actualReimbursement * feeBps,
    BPS,
  );
  const actualTotalCharge = actualReimbursement + actualServiceFee;

  const reservedTotal = BigInt(
    plan.reserved_total_charge_fee_asset_units,
  );
  if (actualTotalCharge > reservedTotal) {
    return held("actual_charge_exceeds_reserved_charge");
  }

  const refund = reservedTotal - actualTotalCharge;

  const reconciliationBody = {
    sponsorship_quote_id:
      input.sponsorship_quote.sponsorship_quote_id,
    user_approved: true,
    actual_gas_used: gasUsed.toString(),
    actual_effective_gas_price_wei: effectiveGasPrice.toString(),
    actual_native_gas_spent_wei: actualNativeGasWei.toString(),
    fee_asset_id: plan.fee_asset_id,
    market_quote_id: plan.market_quote_id,
    market_quote_fingerprint_sha256:
      plan.market_quote_fingerprint_sha256,
    actual_gas_reimbursement_fee_asset_units:
      actualReimbursement.toString(),
    actual_service_fee_asset_units:
      actualServiceFee.toString(),
    actual_total_charge_fee_asset_units:
      actualTotalCharge.toString(),
    refund_fee_asset_units: refund.toString(),
  };

  const reconciliationId =
    "voidrgsr1_" + sha256(canonical(reconciliationBody));

  return Object.freeze({
    ok: true,
    status: "RELAYER_RECONCILIATION_READY",
    marker: VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1,
    reconciliation_id: reconciliationId,
    ...reconciliationBody,
    service_fee_is_privilege_fee: true,
    reimbursement_matches_actual_gas_at_locked_quote: true,
    unused_reserved_charge_refunded: true,
    relayer_positive_margin_at_locked_quote:
      actualServiceFee > 0n,
    native_gas_reserve_depleted_by_wei:
      actualNativeGasWei.toString(),
    fee_asset_reimbursement_collected_units:
      actualReimbursement.toString(),
    fee_asset_service_fee_collected_units:
      actualServiceFee.toString(),
    reserve_replenishment_conversion_required: true,
    automatic_fee_asset_to_native_conversion: false,
    money_movement_authorized: false,
    authority: AUTHORITY,
  });
}
