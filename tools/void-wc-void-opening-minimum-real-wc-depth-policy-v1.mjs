import { createHash } from "node:crypto";

import {
  verifyWcVoidOpeningLedgerSettlementsV1,
} from "./void-wc-void-coupled-opening-v1.mjs";

import {
  verifyWcVoidOpeningNonproductionExclusionV1,
} from "./void-wc-void-opening-nonproduction-exclusion-v1.mjs";

import {
  classifyWcVoidOpeningWindowPhaseV1,
} from "./void-wc-void-opening-window-policy-v1.mjs";

import {
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT,
} from "./void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs";

export const VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_V1 =
  "VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_V1";

export const VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_SCHEMA_V1 =
  "void.wc-void-opening-minimum-real-wc-depth-policy.v1";

export const VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_input_only: true,
    wall_clock_read: false,
    runtime_or_launch_evidence: false,
    ledger_write: false,
    wc_balance_mutation: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_SAFE_WC = BigInt(Number.MAX_SAFE_INTEGER);

const POLICY_KEYS = Object.freeze([
  "schema",
  "policy_id",
  "coupled_launch_id",
  "policy_generation",
  "policy_committed_at_ms",
  "opening_window_id",
  "minimum_real_wc_units",
  "minimum_depth_failure_action",
]);

const REQUEST_KEYS = Object.freeze([
  "policy",
  "opening_window",
  "commitments",
  "production_wc_provenance_records",
  "ledger_debits",
  "observed_at_ms",
]);

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function snapshotExact(value, keys, code) {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw null;
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const ownKeys = Reflect.ownKeys(descriptors);
    if (ownKeys.some((key) => typeof key !== "string")) throw null;
    const actual = ownKeys.sort(compareText);
    const expected = [...keys].sort(compareText);
    if (
      actual.length !== expected.length ||
      actual.some((key, index) => key !== expected[index])
    ) {
      throw null;
    }
    const out = Object.create(null);
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      out[key] = descriptor.value;
    }
    return Object.freeze(out);
  } catch {
    fail(code);
  }
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
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort(compareText);
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

function canonicalSha(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function positiveWholeWc(value, code) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  const parsed = BigInt(value);
  if (parsed <= 0n || parsed > MAX_SAFE_WC) fail(code);
  return parsed;
}

function canonicalMs(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function canonicalGeneration(value) {
  if (typeof value !== "string" || !UINT.test(value) || BigInt(value) <= 0n) {
    fail("INVALID_WC_VOID_MINIMUM_DEPTH_POLICY_GENERATION");
  }
  return value;
}

function policyPayload(value) {
  return Object.freeze({
    schema: value.schema,
    coupled_launch_id: value.coupled_launch_id,
    policy_generation: value.policy_generation,
    policy_committed_at_ms: value.policy_committed_at_ms,
    opening_window_id: value.opening_window_id,
    minimum_real_wc_units: value.minimum_real_wc_units,
    minimum_depth_failure_action: value.minimum_depth_failure_action,
  });
}

export function wcVoidOpeningMinimumRealWcDepthPolicyIdV1(value) {
  const policy = snapshotExact(
    value,
    POLICY_KEYS,
    "INVALID_WC_VOID_MINIMUM_DEPTH_POLICY_SHAPE",
  );
  return digest(policyPayload(policy));
}

function verifyPolicy(raw, openingWindow) {
  const policy = snapshotExact(
    raw,
    POLICY_KEYS,
    "INVALID_WC_VOID_MINIMUM_DEPTH_POLICY_SHAPE",
  );
  if (
    policy.schema !==
    VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_SCHEMA_V1
  ) {
    fail("INVALID_WC_VOID_MINIMUM_DEPTH_POLICY_SCHEMA");
  }
  canonicalSha(policy.policy_id, "INVALID_WC_VOID_MINIMUM_DEPTH_POLICY_ID");
  canonicalSha(policy.coupled_launch_id, "INVALID_COUPLED_LAUNCH_ID");
  canonicalSha(policy.opening_window_id, "INVALID_WC_VOID_OPENING_WINDOW_ID");
  canonicalGeneration(policy.policy_generation);
  const committedAt = canonicalMs(
    policy.policy_committed_at_ms,
    "INVALID_WC_VOID_MINIMUM_DEPTH_POLICY_COMMITTED_AT_MS",
  );
  const minimum = positiveWholeWc(
    policy.minimum_real_wc_units,
    "INVALID_WC_VOID_MINIMUM_REAL_WC_UNITS",
  );

  if (
    !openingWindow ||
    typeof openingWindow !== "object" ||
    Array.isArray(openingWindow) ||
    openingWindow.coupled_launch_id !== policy.coupled_launch_id ||
    openingWindow.window_id !== policy.opening_window_id
  ) {
    fail("WC_VOID_MINIMUM_DEPTH_WINDOW_BINDING_MISMATCH");
  }
  const opensAt = canonicalMs(
    openingWindow.opens_at_ms,
    "INVALID_WC_VOID_OPENING_WINDOW_OPENS_AT_MS",
  );
  if (committedAt >= opensAt) {
    fail("WC_VOID_MINIMUM_DEPTH_POLICY_NOT_COMMITTED_BEFORE_OPEN");
  }
  if (
    policy.minimum_depth_failure_action !==
    VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
      .minimum_depth_exhaustion_action
  ) {
    fail("WC_VOID_MINIMUM_DEPTH_FAILURE_ACTION_MISMATCH");
  }
  if (wcVoidOpeningMinimumRealWcDepthPolicyIdV1(policy) !== policy.policy_id) {
    fail("WC_VOID_MINIMUM_DEPTH_POLICY_DIGEST_MISMATCH");
  }

  return Object.freeze({
    ...policy,
    policy_committed_at_ms: committedAt,
    minimum_real_wc_units: minimum,
  });
}

export function verifyWcVoidOpeningMinimumRealWcDepthV1(raw) {
  const input = snapshotExact(
    raw,
    REQUEST_KEYS,
    "INVALID_WC_VOID_MINIMUM_DEPTH_REQUEST_SHAPE",
  );

  const phase = classifyWcVoidOpeningWindowPhaseV1(
    input.opening_window,
    input.observed_at_ms,
  );
  const policy = verifyPolicy(input.policy, input.opening_window);
  const production = verifyWcVoidOpeningNonproductionExclusionV1(
    policy.coupled_launch_id,
    input.commitments,
    input.production_wc_provenance_records,
  );
  const settlements = verifyWcVoidOpeningLedgerSettlementsV1(
    policy.coupled_launch_id,
    input.commitments,
    input.ledger_debits,
  );

  const productionWc = production.records.reduce(
    (sum, record) => sum + positiveWholeWc(
      record.wc_units,
      "INVALID_WC_VOID_MINIMUM_DEPTH_PRODUCTION_WC_UNITS",
    ),
    0n,
  );
  const settledWc = positiveWholeWc(
    settlements.total_settled_wc_units,
    "INVALID_WC_VOID_MINIMUM_DEPTH_SETTLED_WC_UNITS",
  );
  if (productionWc !== settledWc) {
    fail("WC_VOID_MINIMUM_DEPTH_PRODUCTION_SETTLEMENT_TOTAL_MISMATCH");
  }

  const minimumMet = settledWc >= policy.minimum_real_wc_units;
  const windowClosed = phase.phase === "closed";
  const priceAcceptanceAllowed = windowClosed && minimumMet;

  return Object.freeze({
    marker: VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_V1,
    policy_contract_id:
      VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
        .policy_contract_id,
    policy_id: policy.policy_id,
    coupled_launch_id: policy.coupled_launch_id,
    opening_window_id: policy.opening_window_id,
    observed_at_ms: canonicalMs(
      input.observed_at_ms,
      "INVALID_WC_VOID_MINIMUM_DEPTH_OBSERVED_AT_MS",
    ),
    window_phase: phase.phase,
    minimum_real_wc_units: policy.minimum_real_wc_units.toString(),
    production_price_forming_wc_units: productionWc.toString(),
    settled_production_wc_units: settledWc.toString(),
    minimum_real_wc_depth_met: minimumMet,
    opening_price_acceptance_allowed: priceAcceptanceAllowed,
    opening_price_acceptance_hold:
      priceAcceptanceAllowed
        ? null
        : policy.minimum_depth_failure_action,
    exact_commitment_production_provenance_bijection:
      production.exact_commitment_provenance_bijection,
    exact_commitment_settlement_bijection:
      settlements.exact_commitment_settlement_bijection,
    production_earning_receipt_ids_required:
      production.production_earning_receipt_ids_required,
    nonproduction_wc_exclusion_verified:
      production.nonproduction_wc_exclusion_verified,
    opening_minimum_real_wc_depth_policy_source_ready: true,
    production_minimum_real_wc_value_hardcoded: false,
    runtime_or_launch_evidence: false,
    live_depth_observation_verified: false,
    ledger_persistence_verified: false,
    wall_clock_read_performed: false,
    ledger_write_performed: false,
    wc_balance_mutation_performed: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority:
      VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_AUTHORITY_V1,
  });
}
