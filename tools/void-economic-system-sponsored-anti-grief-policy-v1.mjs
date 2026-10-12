import { createHash } from "node:crypto";

import {
  verifyEconomicIntentTtlCapsStateV1,
} from "./void-economic-intent-ttl-caps-policy-v1.mjs";

import {
  verifyVoidEconomicEpoch2SignedSubmissionIntentV1,
} from "./void-economic-epoch2-signed-submission-intent-v1.mjs";

import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT,
} from "./void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_V1 =
  "VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_V1";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_POLICY_SCHEMA_V1 =
  "void.economic-system-sponsored-anti-grief-policy.v1";

export const VOID_ECONOMIC_SYSTEM_SPONSORSHIP_SCHEMA_V1 =
  "void.economic-system-sponsored-gas-reservation.v1";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    explicit_input_only: true,
    signature_verification: true,
    local_replay_set_observation: true,
    wall_clock_read: false,
    runtime_enforcement: false,
    reservation_mutation: false,
    gas_sponsorship_performed: false,
    rpc_call: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const HEX32 = /^0x[0-9a-f]{64}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;
const MAX_TRACKED_SPONSORSHIPS = 1_000_000;
const MAX_SIGNED_INTENT_GAS_LIMIT =
  BigInt(
    VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
      .max_signed_intent_gas_limit,
  );

const POLICY_KEYS = Object.freeze([
  "schema",
  "policy_id",
  "coupled_launch_id",
  "intent_ttl_caps_policy_id",
  "policy_generation",
  "policy_committed_at_ms",
  "per_intent_sponsored_gas_limit",
  "per_identity_sponsored_gas_budget",
  "global_sponsored_gas_budget",
  "budget_exhaustion_action",
]);

const SPONSORSHIP_KEYS = Object.freeze([
  "schema",
  "sponsorship_id",
  "policy_id",
  "coupled_launch_id",
  "intent_ttl_caps_policy_id",
  "intent_id",
  "identity_id",
  "reservation_id",
  "signed_submission_digest",
  "gas_limit",
]);

const SIGNED_INPUT_KEYS = Object.freeze([
  "intent",
  "calldata",
  "signature",
  "allowed_targets",
  "consumed_digests",
]);

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function snapshotExact(value, keys, code) {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw null;
    }
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
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const length = descriptors.length?.value;
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      length > MAX_TRACKED_SPONSORSHIPS ||
      Reflect.ownKeys(descriptors).length !== length + 1
    ) {
      throw null;
    }
    const out = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
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

function canonicalHex32(value, code) {
  if (typeof value !== "string" || !HEX32.test(value)) fail(code);
  return value;
}

function canonicalMs(value, code) {
  if (!Number.isSafeInteger(value) || value <= 0) fail(code);
  return value;
}

function positiveUintString(value, code) {
  if (typeof value !== "string" || !UINT.test(value)) fail(code);
  const parsed = BigInt(value);
  if (parsed <= 0n) fail(code);
  return parsed;
}

function canonicalGeneration(value) {
  if (typeof value !== "string" || !UINT.test(value) || BigInt(value) <= 0n) {
    fail("INVALID_SYSTEM_SPONSORED_POLICY_GENERATION");
  }
  return value;
}

function policyPayload(value) {
  return Object.freeze({
    schema: value.schema,
    coupled_launch_id: value.coupled_launch_id,
    intent_ttl_caps_policy_id: value.intent_ttl_caps_policy_id,
    policy_generation: value.policy_generation,
    policy_committed_at_ms: value.policy_committed_at_ms,
    per_intent_sponsored_gas_limit: value.per_intent_sponsored_gas_limit,
    per_identity_sponsored_gas_budget:
      value.per_identity_sponsored_gas_budget,
    global_sponsored_gas_budget: value.global_sponsored_gas_budget,
    budget_exhaustion_action: value.budget_exhaustion_action,
  });
}

function sponsorshipPayload(value) {
  return Object.freeze({
    schema: value.schema,
    policy_id: value.policy_id,
    coupled_launch_id: value.coupled_launch_id,
    intent_ttl_caps_policy_id: value.intent_ttl_caps_policy_id,
    intent_id: value.intent_id,
    identity_id: value.identity_id,
    reservation_id: value.reservation_id,
    signed_submission_digest: value.signed_submission_digest,
    gas_limit: value.gas_limit,
  });
}

export function economicSystemSponsoredPolicyIdV1(value) {
  const policy = snapshotExact(
    value,
    POLICY_KEYS,
    "INVALID_SYSTEM_SPONSORED_POLICY_SHAPE",
  );
  return digest(policyPayload(policy));
}

export function economicSystemSponsorshipIdV1(value) {
  const sponsorship = snapshotExact(
    value,
    SPONSORSHIP_KEYS,
    "INVALID_SYSTEM_SPONSORSHIP_SHAPE",
  );
  return digest(sponsorshipPayload(sponsorship));
}

function verifyPolicy(raw, ttlPolicy) {
  const policy = snapshotExact(
    raw,
    POLICY_KEYS,
    "INVALID_SYSTEM_SPONSORED_POLICY_SHAPE",
  );
  if (
    policy.schema !== VOID_ECONOMIC_SYSTEM_SPONSORED_POLICY_SCHEMA_V1
  ) {
    fail("INVALID_SYSTEM_SPONSORED_POLICY_SCHEMA");
  }
  canonicalSha(policy.policy_id, "INVALID_SYSTEM_SPONSORED_POLICY_ID");
  canonicalSha(policy.coupled_launch_id, "INVALID_COUPLED_LAUNCH_ID");
  canonicalSha(
    policy.intent_ttl_caps_policy_id,
    "INVALID_INTENT_TTL_CAPS_POLICY_ID",
  );
  canonicalGeneration(policy.policy_generation);
  const committedAt = canonicalMs(
    policy.policy_committed_at_ms,
    "INVALID_SYSTEM_SPONSORED_POLICY_COMMITTED_AT_MS",
  );

  if (
    !ttlPolicy ||
    typeof ttlPolicy !== "object" ||
    Array.isArray(ttlPolicy) ||
    policy.intent_ttl_caps_policy_id !== ttlPolicy.policy_id ||
    policy.coupled_launch_id !== ttlPolicy.coupled_launch_id
  ) {
    fail("SYSTEM_SPONSORED_TTL_POLICY_BINDING_MISMATCH");
  }
  if (
    !Number.isSafeInteger(ttlPolicy.policy_committed_at_ms) ||
    ttlPolicy.policy_committed_at_ms <= 0 ||
    committedAt <= ttlPolicy.policy_committed_at_ms
  ) {
    fail("SYSTEM_SPONSORED_POLICY_MUST_FOLLOW_TTL_POLICY");
  }

  const perIntent = positiveUintString(
    policy.per_intent_sponsored_gas_limit,
    "INVALID_PER_INTENT_SPONSORED_GAS_LIMIT",
  );
  const perIdentity = positiveUintString(
    policy.per_identity_sponsored_gas_budget,
    "INVALID_PER_IDENTITY_SPONSORED_GAS_BUDGET",
  );
  const global = positiveUintString(
    policy.global_sponsored_gas_budget,
    "INVALID_GLOBAL_SPONSORED_GAS_BUDGET",
  );

  if (perIntent > MAX_SIGNED_INTENT_GAS_LIMIT) {
    fail("PER_INTENT_SPONSORED_GAS_ABOVE_SIGNED_INTENT_MAXIMUM");
  }
  if (perIdentity < perIntent) {
    fail("IDENTITY_SPONSORED_GAS_BUDGET_BELOW_INTENT_LIMIT");
  }
  if (global < perIdentity) {
    fail("GLOBAL_SPONSORED_GAS_BUDGET_BELOW_IDENTITY_BUDGET");
  }
  if (
    policy.budget_exhaustion_action !==
    VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
      .budget_exhaustion_action
  ) {
    fail("SYSTEM_SPONSORED_BUDGET_EXHAUSTION_ACTION_MISMATCH");
  }
  if (economicSystemSponsoredPolicyIdV1(policy) !== policy.policy_id) {
    fail("SYSTEM_SPONSORED_POLICY_DIGEST_MISMATCH");
  }

  return Object.freeze({
    ...policy,
    policy_committed_at_ms: committedAt,
    per_intent_sponsored_gas_limit: perIntent,
    per_identity_sponsored_gas_budget: perIdentity,
    global_sponsored_gas_budget: global,
  });
}

function verifySponsorship(raw, policy, ttlIntent) {
  const sponsorship = snapshotExact(
    raw,
    SPONSORSHIP_KEYS,
    "INVALID_SYSTEM_SPONSORSHIP_SHAPE",
  );
  if (
    sponsorship.schema !== VOID_ECONOMIC_SYSTEM_SPONSORSHIP_SCHEMA_V1
  ) {
    fail("INVALID_SYSTEM_SPONSORSHIP_SCHEMA");
  }
  canonicalSha(sponsorship.sponsorship_id, "INVALID_SYSTEM_SPONSORSHIP_ID");
  canonicalSha(sponsorship.policy_id, "INVALID_SYSTEM_SPONSORED_POLICY_ID");
  canonicalSha(sponsorship.coupled_launch_id, "INVALID_COUPLED_LAUNCH_ID");
  canonicalSha(
    sponsorship.intent_ttl_caps_policy_id,
    "INVALID_INTENT_TTL_CAPS_POLICY_ID",
  );
  canonicalSha(sponsorship.intent_id, "INVALID_ECONOMIC_INTENT_ID");
  canonicalSha(sponsorship.identity_id, "INVALID_ECONOMIC_INTENT_IDENTITY_ID");
  canonicalSha(
    sponsorship.reservation_id,
    "INVALID_ECONOMIC_INTENT_RESERVATION_ID",
  );
  canonicalHex32(
    sponsorship.signed_submission_digest,
    "INVALID_SIGNED_SUBMISSION_DIGEST",
  );

  if (
    sponsorship.policy_id !== policy.policy_id ||
    sponsorship.coupled_launch_id !== policy.coupled_launch_id ||
    sponsorship.intent_ttl_caps_policy_id !==
      policy.intent_ttl_caps_policy_id
  ) {
    fail("SYSTEM_SPONSORSHIP_POLICY_BINDING_MISMATCH");
  }
  if (
    !ttlIntent ||
    sponsorship.intent_id !== ttlIntent.intent_id ||
    sponsorship.identity_id !== ttlIntent.identity_id ||
    sponsorship.reservation_id !== ttlIntent.reservation_id
  ) {
    fail("SYSTEM_SPONSORSHIP_INTENT_BINDING_MISMATCH");
  }

  const gas = positiveUintString(
    sponsorship.gas_limit,
    "INVALID_SYSTEM_SPONSORSHIP_GAS_LIMIT",
  );
  if (gas > policy.per_intent_sponsored_gas_limit) {
    fail("SYSTEM_SPONSORSHIP_PER_INTENT_GAS_LIMIT_EXCEEDED");
  }
  if (gas > MAX_SIGNED_INTENT_GAS_LIMIT) {
    fail("SYSTEM_SPONSORSHIP_SIGNED_INTENT_GAS_LIMIT_EXCEEDED");
  }
  if (
    economicSystemSponsorshipIdV1(sponsorship) !==
    sponsorship.sponsorship_id
  ) {
    fail("SYSTEM_SPONSORSHIP_DIGEST_MISMATCH");
  }

  return Object.freeze({
    sponsorship_id: sponsorship.sponsorship_id,
    intent_id: sponsorship.intent_id,
    identity_id: sponsorship.identity_id,
    reservation_id: sponsorship.reservation_id,
    signed_submission_digest: sponsorship.signed_submission_digest,
    gas_limit: gas,
    outstanding: ttlIntent.outstanding,
  });
}

function indexedTtlState(ttlState) {
  return new Map(
    ttlState.intents.map((intent) => [intent.intent_id, intent]),
  );
}

function verifySponsorshipSet(raw, policy, ttlState) {
  const values = snapshotArray(
    raw,
    "INVALID_SYSTEM_SPONSORSHIP_SET",
  );
  if (values.length !== ttlState.intents.length) {
    fail("SYSTEM_SPONSORSHIP_INTENT_COUNT_MISMATCH");
  }

  const ttlByIntent = indexedTtlState(ttlState);
  const seenSponsorshipIds = new Set();
  const seenIntentIds = new Set();
  const seenSignedDigests = new Set();
  const byIdentity = new Map();
  let globalReserved = 0n;
  let expiredReserved = 0n;

  const sponsorships = values.map((rawValue) => {
    const shape = snapshotExact(
      rawValue,
      SPONSORSHIP_KEYS,
      "INVALID_SYSTEM_SPONSORSHIP_SHAPE",
    );
    const ttlIntent = ttlByIntent.get(shape.intent_id);
    const sponsorship = verifySponsorship(
      rawValue,
      policy,
      ttlIntent,
    );

    if (seenSponsorshipIds.has(sponsorship.sponsorship_id)) {
      fail("DUPLICATE_SYSTEM_SPONSORSHIP_ID");
    }
    if (seenIntentIds.has(sponsorship.intent_id)) {
      fail("DUPLICATE_SYSTEM_SPONSORSHIP_INTENT");
    }
    if (seenSignedDigests.has(sponsorship.signed_submission_digest)) {
      fail("DUPLICATE_SYSTEM_SPONSORSHIP_SIGNED_SUBMISSION_DIGEST");
    }
    seenSponsorshipIds.add(sponsorship.sponsorship_id);
    seenIntentIds.add(sponsorship.intent_id);
    seenSignedDigests.add(sponsorship.signed_submission_digest);

    if (sponsorship.outstanding) {
      globalReserved += sponsorship.gas_limit;
      const next =
        (byIdentity.get(sponsorship.identity_id) || 0n) +
        sponsorship.gas_limit;
      byIdentity.set(sponsorship.identity_id, next);
    } else {
      expiredReserved += sponsorship.gas_limit;
    }

    return sponsorship;
  });

  if (seenIntentIds.size !== ttlByIntent.size) {
    fail("MISSING_SYSTEM_SPONSORSHIP_FOR_INTENT");
  }

  for (const value of byIdentity.values()) {
    if (value > policy.per_identity_sponsored_gas_budget) {
      fail("EXISTING_IDENTITY_SPONSORED_GAS_BUDGET_EXCEEDED");
    }
  }
  if (globalReserved > policy.global_sponsored_gas_budget) {
    fail("EXISTING_GLOBAL_SPONSORED_GAS_BUDGET_EXCEEDED");
  }

  sponsorships.sort((left, right) =>
    compareText(left.sponsorship_id, right.sponsorship_id)
  );
  const identityReserved = [...byIdentity.entries()]
    .map(([identity_id, gas]) =>
      Object.freeze({
        identity_id,
        reserved_gas: gas.toString(),
      })
    )
    .sort((left, right) =>
      compareText(left.identity_id, right.identity_id)
    );

  return Object.freeze({
    sponsorships: Object.freeze(sponsorships),
    global_reserved_gas: globalReserved,
    expired_reserved_gas_not_counted: expiredReserved,
    per_identity_reserved_gas: Object.freeze(identityReserved),
  });
}

export function verifyEconomicSystemSponsoredStateV1({
  sponsorship_policy: rawSponsorshipPolicy,
  ttl_caps_policy: ttlPolicy,
  outstanding_intents: rawOutstandingIntents,
  sponsorships: rawSponsorships,
  observed_at_ms: observedAt,
}) {
  const ttlState = verifyEconomicIntentTtlCapsStateV1({
    policy: ttlPolicy,
    outstanding_intents: rawOutstandingIntents,
    observed_at_ms: observedAt,
  });
  const policy = verifyPolicy(rawSponsorshipPolicy, ttlPolicy);
  const existing = verifySponsorshipSet(
    rawSponsorships,
    policy,
    ttlState,
  );

  return Object.freeze({
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_V1,
    policy_contract_id:
      VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
        .policy_contract_id,
    policy_id: policy.policy_id,
    coupled_launch_id: policy.coupled_launch_id,
    intent_ttl_caps_policy_id: policy.intent_ttl_caps_policy_id,
    observed_at_ms: ttlState.observed_at_ms,
    tracked_intent_count: ttlState.tracked_intent_count,
    outstanding_intent_count: ttlState.outstanding_intent_count,
    expired_intent_count: ttlState.expired_intent_count,
    tracked_sponsorship_count: existing.sponsorships.length,
    active_reserved_gas: existing.global_reserved_gas.toString(),
    expired_reserved_gas_not_counted:
      existing.expired_reserved_gas_not_counted.toString(),
    per_identity_reserved_gas:
      existing.per_identity_reserved_gas,
    historical_state_verified: true,
    expired_sponsorships_not_counted_as_reserved: true,
    runtime_enforcement_verified: false,
    reservation_mutation_performed: false,
    gas_sponsorship_performed: false,
    wall_clock_read_performed: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_AUTHORITY_V1,
  });
}

function verifyCandidateSignedSubmission(
  raw,
  candidateTtlIntent,
  candidateSponsorship,
  observedAtMs,
) {
  const signed = snapshotExact(
    raw,
    SIGNED_INPUT_KEYS,
    "INVALID_SYSTEM_SPONSORED_SIGNED_SUBMISSION_INPUT",
  );
  const nowUnix = Math.floor(
    canonicalMs(observedAtMs, "INVALID_SYSTEM_SPONSORED_OBSERVED_AT_MS") /
      1_000,
  );
  const verified = verifyVoidEconomicEpoch2SignedSubmissionIntentV1({
    intent: signed.intent,
    calldata: signed.calldata,
    signature: signed.signature,
    nowUnix: String(nowUnix),
    allowedTargets: signed.allowed_targets,
    consumedDigests: signed.consumed_digests,
  });

  if (
    verified.typed_data_digest !==
    candidateSponsorship.signed_submission_digest
  ) {
    fail("SYSTEM_SPONSORSHIP_SIGNED_SUBMISSION_DIGEST_MISMATCH");
  }
  if (verified.gas_limit !== candidateSponsorship.gas_limit.toString()) {
    fail("SYSTEM_SPONSORSHIP_SIGNED_GAS_LIMIT_MISMATCH");
  }

  const issuedMs = Number(BigInt(signed.intent.issued_at_unix) * 1_000n);
  const expiresMs = Number(BigInt(signed.intent.expires_at_unix) * 1_000n);
  if (
    !Number.isSafeInteger(issuedMs) ||
    !Number.isSafeInteger(expiresMs) ||
    issuedMs !== candidateTtlIntent.issued_at_ms ||
    expiresMs !== candidateTtlIntent.expires_at_ms
  ) {
    fail("SYSTEM_SPONSORSHIP_SIGNED_INTENT_LIFETIME_MISMATCH");
  }

  return Object.freeze({
    typed_data_digest: verified.typed_data_digest,
    gas_limit: verified.gas_limit,
    signer: verified.signer,
    target: verified.target,
    signature_verified: true,
    replay_precheck_green: true,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
  });
}

export function classifyEconomicSystemSponsoredAdmissionV1({
  sponsorship_policy: rawSponsorshipPolicy,
  ttl_caps_policy: ttlPolicy,
  outstanding_intents: rawOutstandingIntents,
  sponsorships: rawSponsorships,
  candidate_intent: rawCandidateIntent,
  candidate_sponsorship: rawCandidateSponsorship,
  candidate_signed_submission: rawCandidateSignedSubmission,
  observed_at_ms: observedAt,
}) {
  const existingTtlState = verifyEconomicIntentTtlCapsStateV1({
    policy: ttlPolicy,
    outstanding_intents: rawOutstandingIntents,
    observed_at_ms: observedAt,
  });
  const policy = verifyPolicy(rawSponsorshipPolicy, ttlPolicy);
  const existing = verifySponsorshipSet(
    rawSponsorships,
    policy,
    existingTtlState,
  );

  const existingIntents = snapshotArray(
    rawOutstandingIntents,
    "INVALID_ECONOMIC_INTENT_RESERVATION_SET",
  );
  const prospectiveTtlState = verifyEconomicIntentTtlCapsStateV1({
    policy: ttlPolicy,
    outstanding_intents: [...existingIntents, rawCandidateIntent],
    observed_at_ms: observedAt,
  });
  const candidateTtlIntent = prospectiveTtlState.intents
    .find((intent) => intent.intent_id === rawCandidateIntent.intent_id);
  if (!candidateTtlIntent || !candidateTtlIntent.outstanding) {
    fail("SYSTEM_SPONSORED_CANDIDATE_INTENT_NOT_OUTSTANDING");
  }

  const candidate = verifySponsorship(
    rawCandidateSponsorship,
    policy,
    candidateTtlIntent,
  );
  if (
    existing.sponsorships.some(
      (value) =>
        value.sponsorship_id === candidate.sponsorship_id ||
        value.intent_id === candidate.intent_id ||
        value.signed_submission_digest ===
          candidate.signed_submission_digest,
    )
  ) {
    fail("SYSTEM_SPONSORSHIP_CANDIDATE_DUPLICATE");
  }

  const signedVerification = verifyCandidateSignedSubmission(
    rawCandidateSignedSubmission,
    candidateTtlIntent,
    candidate,
    observedAt,
  );

  const identityExisting = existing.per_identity_reserved_gas
    .find((entry) => entry.identity_id === candidate.identity_id);
  const identityReserved =
    BigInt(identityExisting?.reserved_gas || "0");
  const prospectiveIdentity =
    identityReserved + candidate.gas_limit;
  const prospectiveGlobal =
    existing.global_reserved_gas + candidate.gas_limit;

  const identityBudgetExceeded =
    prospectiveIdentity > policy.per_identity_sponsored_gas_budget;
  const globalBudgetExceeded =
    prospectiveGlobal > policy.global_sponsored_gas_budget;
  const allowed = !identityBudgetExceeded && !globalBudgetExceeded;

  return Object.freeze({
    marker: VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_V1,
    policy_contract_id:
      VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
        .policy_contract_id,
    policy_id: policy.policy_id,
    coupled_launch_id: policy.coupled_launch_id,
    candidate_intent_id: candidate.intent_id,
    candidate_identity_id: candidate.identity_id,
    candidate_sponsorship_id: candidate.sponsorship_id,
    candidate_signed_submission_digest:
      candidate.signed_submission_digest,
    candidate_gas_limit: candidate.gas_limit.toString(),
    signed_submission_signature_verified:
      signedVerification.signature_verified,
    signed_submission_gas_limit_bound: true,
    signed_submission_lifetime_matches_economic_intent: true,
    existing_identity_reserved_gas: identityReserved.toString(),
    existing_global_reserved_gas:
      existing.global_reserved_gas.toString(),
    prospective_identity_reserved_gas:
      prospectiveIdentity.toString(),
    prospective_global_reserved_gas:
      prospectiveGlobal.toString(),
    per_intent_sponsored_gas_limit:
      policy.per_intent_sponsored_gas_limit.toString(),
    per_identity_sponsored_gas_budget:
      policy.per_identity_sponsored_gas_budget.toString(),
    global_sponsored_gas_budget:
      policy.global_sponsored_gas_budget.toString(),
    per_identity_budget_exceeded: identityBudgetExceeded,
    global_budget_exceeded: globalBudgetExceeded,
    sponsorship_allowed: allowed,
    denial_reason: allowed
      ? null
      : "sponsored_gas_budget_exhausted",
    hidden_minimum_trade_amount_applied: false,
    budget_exhaustion_action:
      VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
        .budget_exhaustion_action,
    expired_sponsorships_not_counted_as_reserved: true,
    expired_reserved_gas_not_counted:
      existing.expired_reserved_gas_not_counted.toString(),
    system_sponsored_execution_anti_grief_source_ready: true,
    production_budget_values_hardcoded: false,
    runtime_enforcement_verified: false,
    sponsorship_reservation_created: false,
    gas_sponsorship_performed: false,
    wall_clock_read_performed: false,
    transaction_submission: false,
    transaction_broadcast: false,
    authoritative_chain2050_write: false,
    funds_movement: false,
    authority:
      VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_AUTHORITY_V1,
  });
}
