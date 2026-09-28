import { createHash } from "node:crypto";

import {
  verifyWcVoidOpeningLedgerSettlementsV1,
} from "./void-wc-void-coupled-opening-v1.mjs";

import {
  verifyWcVoidOpeningParticipantProvenanceEligibilityV1,
} from "./void-wc-void-opening-participant-provenance-eligibility-v1.mjs";

import {
  classifyWcVoidOpeningWindowPhaseV1,
} from "./void-wc-void-opening-window-policy-v1.mjs";

import {
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT,
} from "./void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs";

export const VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_V1 =
  "VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_V1";

export const VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_SCHEMA_V1 =
  "void.wc-void-opening-concentration-sybil-policy.v1";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_RECORD_SCHEMA_V1 =
  "void.wc-void-opening-related-identity-record.v1";

export const VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_input_only: true,
    related_identity_truth_verified: false,
    runtime_or_launch_evidence: false,
    wall_clock_read: false,
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

const POLICY_KEYS = Object.freeze([
  "schema",
  "policy_id",
  "coupled_launch_id",
  "policy_generation",
  "policy_committed_at_ms",
  "opening_window_id",
  "max_participant_share_bps",
  "max_related_identity_share_bps",
  "failure_action",
]);

const RELATED_IDENTITY_KEYS = Object.freeze([
  "schema",
  "coupled_launch_id",
  "commitment_id",
  "participant_id",
  "cluster_id",
  "cluster_evidence_id",
  "cluster_assignment_method",
]);

const REQUEST_KEYS = Object.freeze([
  "policy",
  "opening_window",
  "commitments",
  "production_wc_provenance_records",
  "eligibility_records",
  "ledger_debits",
  "related_identity_records",
  "observed_at_ms",
]);

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_SET_SIZE = 1_000_000;

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

function snapshotArray(value, code) {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw null;
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      !lengthDescriptor ||
      !Object.hasOwn(lengthDescriptor, "value") ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < 1 ||
      lengthDescriptor.value > MAX_SET_SIZE
    ) {
      throw null;
    }
    const out = [];
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      out.push(descriptor.value);
    }
    return out;
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

function positiveBps(value, code) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  const parsed = BigInt(value);
  if (parsed <= 0n || parsed >= 10_000n) fail(code);
  return parsed;
}

function canonicalGeneration(value) {
  if (typeof value !== "string" || !UINT.test(value) || BigInt(value) <= 0n) {
    fail("INVALID_WC_VOID_CONCENTRATION_POLICY_GENERATION");
  }
  return value;
}

function canonicalMs(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function policyPayload(value) {
  return Object.freeze({
    schema: value.schema,
    coupled_launch_id: value.coupled_launch_id,
    policy_generation: value.policy_generation,
    policy_committed_at_ms: value.policy_committed_at_ms,
    opening_window_id: value.opening_window_id,
    max_participant_share_bps: value.max_participant_share_bps,
    max_related_identity_share_bps:
      value.max_related_identity_share_bps,
    failure_action: value.failure_action,
  });
}

export function wcVoidOpeningConcentrationSybilPolicyIdV1(value) {
  const policy = snapshotExact(
    value,
    POLICY_KEYS,
    "INVALID_WC_VOID_CONCENTRATION_POLICY_SHAPE",
  );
  return digest(policyPayload(policy));
}

function verifyPolicy(raw, openingWindow) {
  const policy = snapshotExact(
    raw,
    POLICY_KEYS,
    "INVALID_WC_VOID_CONCENTRATION_POLICY_SHAPE",
  );
  if (
    policy.schema !==
    VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_SCHEMA_V1
  ) {
    fail("INVALID_WC_VOID_CONCENTRATION_POLICY_SCHEMA");
  }
  canonicalSha(policy.policy_id, "INVALID_WC_VOID_CONCENTRATION_POLICY_ID");
  canonicalSha(policy.coupled_launch_id, "INVALID_COUPLED_LAUNCH_ID");
  canonicalSha(policy.opening_window_id, "INVALID_WC_VOID_OPENING_WINDOW_ID");
  canonicalGeneration(policy.policy_generation);
  const committedAt = canonicalMs(
    policy.policy_committed_at_ms,
    "INVALID_WC_VOID_CONCENTRATION_POLICY_COMMITTED_AT_MS",
  );
  const participantCap = positiveBps(
    policy.max_participant_share_bps,
    "INVALID_WC_VOID_MAX_PARTICIPANT_SHARE_BPS",
  );
  const clusterCap = positiveBps(
    policy.max_related_identity_share_bps,
    "INVALID_WC_VOID_MAX_RELATED_IDENTITY_SHARE_BPS",
  );
  if (clusterCap < participantCap) {
    fail("WC_VOID_RELATED_IDENTITY_CAP_BELOW_PARTICIPANT_CAP");
  }

  if (
    !openingWindow ||
    typeof openingWindow !== "object" ||
    Array.isArray(openingWindow) ||
    openingWindow.coupled_launch_id !== policy.coupled_launch_id ||
    openingWindow.window_id !== policy.opening_window_id
  ) {
    fail("WC_VOID_CONCENTRATION_WINDOW_BINDING_MISMATCH");
  }
  const opensAt = canonicalMs(
    openingWindow.opens_at_ms,
    "INVALID_WC_VOID_OPENING_WINDOW_OPENS_AT_MS",
  );
  if (committedAt >= opensAt) {
    fail("WC_VOID_CONCENTRATION_POLICY_NOT_COMMITTED_BEFORE_OPEN");
  }
  if (
    policy.failure_action !==
    VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT.failure_action
  ) {
    fail("WC_VOID_CONCENTRATION_FAILURE_ACTION_MISMATCH");
  }
  if (wcVoidOpeningConcentrationSybilPolicyIdV1(policy) !== policy.policy_id) {
    fail("WC_VOID_CONCENTRATION_POLICY_DIGEST_MISMATCH");
  }

  return Object.freeze({
    ...policy,
    policy_committed_at_ms: committedAt,
    max_participant_share_bps: participantCap,
    max_related_identity_share_bps: clusterCap,
  });
}

function verifyRelatedIdentityRecords(coupledLaunchId, eligibility, rawRecords) {
  const records = snapshotArray(
    rawRecords,
    "INVALID_WC_VOID_RELATED_IDENTITY_SET",
  );
  if (records.length !== eligibility.eligible_participant_count) {
    fail("WC_VOID_RELATED_IDENTITY_COUNT_MISMATCH");
  }

  const eligibleByCommitment = new Map(
    eligibility.records.map((value) => [value.commitment_id, value]),
  );
  const seen = new Set();

  const canonical = records.map((raw) => {
    const value = snapshotExact(
      raw,
      RELATED_IDENTITY_KEYS,
      "INVALID_WC_VOID_RELATED_IDENTITY_RECORD",
    );
    if (
      value.schema !==
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_RECORD_SCHEMA_V1
    ) {
      fail("INVALID_WC_VOID_RELATED_IDENTITY_SCHEMA");
    }
    if (value.coupled_launch_id !== coupledLaunchId) {
      fail("WC_VOID_RELATED_IDENTITY_LAUNCH_MISMATCH");
    }
    canonicalSha(value.commitment_id, "INVALID_RELATED_IDENTITY_COMMITMENT_ID");
    canonicalSha(value.participant_id, "INVALID_RELATED_IDENTITY_PARTICIPANT_ID");
    canonicalSha(value.cluster_id, "INVALID_RELATED_IDENTITY_CLUSTER_ID");
    canonicalSha(
      value.cluster_evidence_id,
      "INVALID_RELATED_IDENTITY_CLUSTER_EVIDENCE_ID",
    );
    if (
      value.cluster_assignment_method !==
      "content_addressed_related_identity_evidence_v1"
    ) {
      fail("INVALID_RELATED_IDENTITY_ASSIGNMENT_METHOD");
    }

    const eligible = eligibleByCommitment.get(value.commitment_id);
    if (!eligible) fail("UNKNOWN_RELATED_IDENTITY_COMMITMENT");
    if (eligible.participant_id !== value.participant_id) {
      fail("RELATED_IDENTITY_PARTICIPANT_MISMATCH");
    }
    if (seen.has(value.commitment_id)) {
      fail("DUPLICATE_RELATED_IDENTITY_COMMITMENT");
    }
    seen.add(value.commitment_id);

    return Object.freeze({
      commitment_id: value.commitment_id,
      participant_id: value.participant_id,
      cluster_id: value.cluster_id,
      cluster_evidence_id: value.cluster_evidence_id,
      cluster_assignment_method: value.cluster_assignment_method,
    });
  });

  if (seen.size !== eligibility.eligible_participant_count) {
    fail("MISSING_RELATED_IDENTITY_RECORD");
  }

  canonical.sort((left, right) =>
    compareText(left.commitment_id, right.commitment_id)
  );
  return Object.freeze(canonical);
}

export function verifyWcVoidOpeningConcentrationSybilPolicyV1(raw) {
  const input = snapshotExact(
    raw,
    REQUEST_KEYS,
    "INVALID_WC_VOID_CONCENTRATION_REQUEST_SHAPE",
  );

  const phase = classifyWcVoidOpeningWindowPhaseV1(
    input.opening_window,
    input.observed_at_ms,
  );
  const policy = verifyPolicy(input.policy, input.opening_window);
  const eligibility =
    verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      policy.coupled_launch_id,
      input.commitments,
      input.production_wc_provenance_records,
      input.eligibility_records,
    );
  const settlements = verifyWcVoidOpeningLedgerSettlementsV1(
    policy.coupled_launch_id,
    input.commitments,
    input.ledger_debits,
  );
  const related = verifyRelatedIdentityRecords(
    policy.coupled_launch_id,
    eligibility,
    input.related_identity_records,
  );

  const settlementByCommitment = new Map(
    settlements.settlements.map((value) => [
      value.commitment_id,
      BigInt(value.amount_wc),
    ]),
  );
  const total = BigInt(settlements.total_settled_wc_units);
  if (total <= 0n) fail("WC_VOID_CONCENTRATION_SETTLED_TOTAL_INVALID");

  let participantCapsMet = true;
  const participantShares = [];
  const clusterTotals = new Map();

  for (const record of related) {
    const amount = settlementByCommitment.get(record.commitment_id);
    if (amount === undefined || amount <= 0n) {
      fail("WC_VOID_CONCENTRATION_SETTLEMENT_MISSING");
    }

    const withinParticipantCap =
      amount * 10_000n <= total * policy.max_participant_share_bps;
    if (!withinParticipantCap) participantCapsMet = false;

    participantShares.push(Object.freeze({
      commitment_id: record.commitment_id,
      participant_id: record.participant_id,
      wc_units: amount.toString(),
      within_participant_cap: withinParticipantCap,
    }));

    clusterTotals.set(
      record.cluster_id,
      (clusterTotals.get(record.cluster_id) || 0n) + amount,
    );
  }

  let relatedIdentityCapsMet = true;
  const clusterShares = [...clusterTotals.entries()]
    .map(([clusterId, amount]) => {
      const withinClusterCap =
        amount * 10_000n <= total * policy.max_related_identity_share_bps;
      if (!withinClusterCap) relatedIdentityCapsMet = false;
      return Object.freeze({
        cluster_id: clusterId,
        wc_units: amount.toString(),
        within_related_identity_cap: withinClusterCap,
      });
    })
    .sort((left, right) => compareText(left.cluster_id, right.cluster_id));

  const arithmeticCapsMet =
    participantCapsMet && relatedIdentityCapsMet;
  const windowClosed = phase.phase === "closed";

  return Object.freeze({
    marker: VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_V1,
    policy_contract_id:
      VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT
        .policy_contract_id,
    policy_id: policy.policy_id,
    coupled_launch_id: policy.coupled_launch_id,
    opening_window_id: policy.opening_window_id,
    observed_at_ms: canonicalMs(
      input.observed_at_ms,
      "INVALID_WC_VOID_CONCENTRATION_OBSERVED_AT_MS",
    ),
    window_phase: phase.phase,
    total_settled_wc_units: total.toString(),
    max_participant_share_bps:
      policy.max_participant_share_bps.toString(),
    max_related_identity_share_bps:
      policy.max_related_identity_share_bps.toString(),
    participant_caps_met: participantCapsMet,
    related_identity_caps_met: relatedIdentityCapsMet,
    arithmetic_caps_met: arithmeticCapsMet,
    participant_share_results: Object.freeze(participantShares),
    related_identity_cluster_results: Object.freeze(clusterShares),
    exact_eligible_participant_cluster_bijection: true,
    opening_concentration_arithmetic_source_ready: true,
    sybil_cluster_arithmetic_source_ready: true,
    related_identity_truth_verifier_required: true,
    related_identity_truth_verified: false,
    opening_concentration_and_sybil_limits_ready: false,
    opening_price_acceptance_allowed: false,
    opening_price_acceptance_hold:
      !windowClosed
        ? "opening_window_not_closed"
        : !arithmeticCapsMet
          ? policy.failure_action
          : "related_identity_truth_verifier_required",
    production_cap_values_hardcoded: false,
    runtime_or_launch_evidence: false,
    ledger_persistence_verified: false,
    wall_clock_read_performed: false,
    ledger_write_performed: false,
    wc_balance_mutation_performed: false,
    market_activation_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority:
      VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_AUTHORITY_V1,
  });
}
