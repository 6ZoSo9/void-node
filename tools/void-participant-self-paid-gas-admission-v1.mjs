#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_PARTICIPANT_SELF_PAID_GAS_ADMISSION_V1 =
  "VOID_PARTICIPANT_SELF_PAID_GAS_ADMISSION_V1";

export const AUTHORITY = Object.freeze({
  source_only_policy: true,
  participant_pays_native_gas: true,
  relayer_sponsorship_allowed: false,
  trade_output_may_fund_current_operation_gas: false,
  all_legs_must_be_prebounded: true,
  aggregate_upfront_balance_check_required: true,
  credential_access: false,
  wallet_or_signer_access: false,
  rpc_call: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  funds_movement: false,
  runtime_activation: false,
});

const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const POSITIVE_UINT = /^[1-9][0-9]*$/u;
const MAX_LEGS = 8;

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
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

function hold(reason, detail = undefined) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_PARTICIPANT_SELF_PAID_GAS_ADMISSION_V1,
    reason,
    operation_admitted: false,
    relayer_used: false,
    relayer_available: false,
    transaction_signing_authorized: false,
    transaction_broadcast_authorized: false,
    funds_movement_authorized: false,
    authority: AUTHORITY,
    ...(detail ? { detail } : {}),
  });
}

function normalizeLeg(raw, seen) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "transaction_leg_shape_invalid" };
  }

  const legId = safeId(raw.leg_id);
  const gasLimit = positiveUint(raw.gas_limit);
  const maxFeePerGas = positiveUint(raw.max_fee_per_gas_wei);
  const nativeValue = uint(raw.native_value_wei ?? "0");

  if (
    !legId ||
    seen.has(legId) ||
    gasLimit === null ||
    maxFeePerGas === null ||
    nativeValue === null
  ) {
    return { ok: false, reason: "transaction_leg_binding_invalid" };
  }

  if (
    raw.gas_limit_source !== "bounded_preflight_or_reviewed_ceiling" ||
    raw.max_fee_source !== "bounded_preflight_or_policy_cap"
  ) {
    return { ok: false, reason: "transaction_leg_bound_provenance_required" };
  }

  seen.add(legId);

  const gasCeilingWei = gasLimit * maxFeePerGas;
  const upfrontWei = nativeValue + gasCeilingWei;

  return {
    ok: true,
    leg: Object.freeze({
      leg_id: legId,
      gas_limit: gasLimit.toString(),
      max_fee_per_gas_wei: maxFeePerGas.toString(),
      native_value_wei: nativeValue.toString(),
      gas_ceiling_wei: gasCeilingWei.toString(),
      upfront_native_requirement_wei: upfrontWei.toString(),
      gas_limit_source: raw.gas_limit_source,
      max_fee_source: raw.max_fee_source,
    }),
    upfrontWei,
  };
}

export function admitParticipantSelfPaidGasOperationV1(input) {
  if (
    !input ||
    input.chain_id !== 2050 ||
    typeof input.participant_address !== "string" ||
    !ADDRESS.test(input.participant_address) ||
    !safeId(input.operation_id) ||
    !safeId(input.operation_kind) ||
    input.relayer_requested === true ||
    input.sponsorship_requested === true
  ) {
    return hold("request_identity_or_relayer_policy_invalid");
  }

  const balance = uint(input.native_balance_wei);
  if (balance === null) return hold("native_balance_invalid");

  if (
    !Array.isArray(input.transaction_legs) ||
    input.transaction_legs.length < 1 ||
    input.transaction_legs.length > MAX_LEGS
  ) {
    return hold("transaction_legs_required");
  }

  const seen = new Set();
  const legs = [];
  let required = 0n;

  for (const raw of input.transaction_legs) {
    const normalized = normalizeLeg(raw, seen);
    if (!normalized.ok) return hold(normalized.reason);
    legs.push(normalized.leg);
    required += normalized.upfrontWei;
  }

  if (required <= 0n) return hold("aggregate_native_requirement_invalid");

  const balanceSufficient = balance >= required;
  const shortfall = balanceSufficient ? 0n : required - balance;
  const reserveRemaining = balanceSufficient ? balance - required : 0n;

  const body = {
    chain_id: 2050,
    operation_id: safeId(input.operation_id),
    operation_kind: safeId(input.operation_kind),
    participant_address: input.participant_address.toLowerCase(),
    native_balance_wei: balance.toString(),
    aggregate_upfront_native_requirement_wei: required.toString(),
    native_gas_shortfall_wei: shortfall.toString(),
    balance_after_full_reservation_wei: reserveRemaining.toString(),
    transaction_leg_count: legs.length,
    transaction_legs: legs,
    participant_pays_native_gas: true,
    relayer_used: false,
    relayer_available: false,
    sponsorship_allowed: false,
    post_execution_proceeds_counted_toward_upfront_gas: false,
  };

  const admissionId = "voidspga1_" + sha256(canonical(body));

  if (!balanceSufficient) {
    return Object.freeze({
      ok: false,
      status: "HOLD_INSUFFICIENT_NATIVE_GAS",
      marker: VOID_PARTICIPANT_SELF_PAID_GAS_ADMISSION_V1,
      admission_id: admissionId,
      reason: "insufficient_native_gas_for_complete_operation",
      ...body,
      operation_admitted: false,
      transaction_signing_authorized: false,
      transaction_broadcast_authorized: false,
      funds_movement_authorized: false,
      next_action:
        "participant_must_add_native_void_gas_then_revalidate_entire_operation",
      authority: AUTHORITY,
    });
  }

  return Object.freeze({
    ok: true,
    status: "SELF_PAID_GAS_ADMITTED",
    marker: VOID_PARTICIPANT_SELF_PAID_GAS_ADMISSION_V1,
    admission_id: admissionId,
    ...body,
    operation_admitted: true,
    transaction_signing_authorized: false,
    transaction_broadcast_authorized: false,
    funds_movement_authorized: false,
    next_action:
      "operation_may_advance_to_separately_authorized_signing_path",
    authority: AUTHORITY,
  });
}
