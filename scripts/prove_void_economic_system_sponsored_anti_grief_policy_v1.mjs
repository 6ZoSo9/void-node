#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { Wallet } from "ethers";

import {
  VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1,
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1,
  economicIntentReservationIdV1,
  economicIntentTtlCapsPolicyIdV1,
} from "../tools/void-economic-intent-ttl-caps-policy-v1.mjs";

import {
  buildVoidEconomicEpoch2SignedSubmissionIntentV1,
  voidEconomicEpoch2SignedSubmissionDigestV1,
  voidEconomicEpoch2SignedSubmissionTypedDataV1,
} from "../tools/void-economic-epoch2-signed-submission-intent-v1.mjs";

import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT,
} from "../tools/void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs";

import {
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_AUTHORITY_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORED_POLICY_SCHEMA_V1,
  VOID_ECONOMIC_SYSTEM_SPONSORSHIP_SCHEMA_V1,
  classifyEconomicSystemSponsoredAdmissionV1,
  economicSystemSponsoredPolicyIdV1,
  economicSystemSponsorshipIdV1,
} from "../tools/void-economic-system-sponsored-anti-grief-policy-v1.mjs";

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const hex32 = (digit) => "0x" + String(digit).repeat(64);
const launchId = hash("a");
const target = "0x4444444444444444444444444444444444444444";

function ttlPolicy(overrides = {}) {
  const value = {
    schema: VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1,
    policy_id: hash("0"),
    coupled_launch_id: launchId,
    policy_generation: "1",
    policy_committed_at_ms: 1790400000000,
    intent_ttl_seconds: 120,
    per_identity_max_outstanding: 4,
    global_max_outstanding: 8,
    late_payment_action: "reconcile_without_automatic_execution",
    ...overrides,
  };
  value.policy_id = economicIntentTtlCapsPolicyIdV1(value);
  return value;
}

function ttlIntent(policy, identityDigit, reservationDigit, issuedUnix) {
  const value = {
    schema: VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1,
    intent_id: hash("0"),
    policy_id: policy.policy_id,
    coupled_launch_id: launchId,
    identity_id: hash(identityDigit),
    reservation_id: hash(reservationDigit),
    issued_at_ms: issuedUnix * 1000,
    expires_at_ms:
      (issuedUnix + policy.intent_ttl_seconds) * 1000,
    state: "pending_unpaid",
  };
  value.intent_id = economicIntentReservationIdV1(value);
  return value;
}

function sponsorPolicy(ttl, overrides = {}) {
  const value = {
    schema: VOID_ECONOMIC_SYSTEM_SPONSORED_POLICY_SCHEMA_V1,
    policy_id: hash("0"),
    coupled_launch_id: launchId,
    intent_ttl_caps_policy_id: ttl.policy_id,
    policy_generation: "1",
    policy_committed_at_ms: 1790400000500,
    per_intent_sponsored_gas_limit: "100000",
    per_identity_sponsored_gas_budget: "120000",
    global_sponsored_gas_budget: "180000",
    budget_exhaustion_action:
      "deny_sponsorship_without_hidden_trade_minimum",
    ...overrides,
  };
  value.policy_id = economicSystemSponsoredPolicyIdV1(value);
  return value;
}

function sponsorship(
  sponsor,
  intent,
  signedDigest,
  gasLimit,
) {
  const value = {
    schema: VOID_ECONOMIC_SYSTEM_SPONSORSHIP_SCHEMA_V1,
    sponsorship_id: hash("0"),
    policy_id: sponsor.policy_id,
    coupled_launch_id: launchId,
    intent_ttl_caps_policy_id: sponsor.intent_ttl_caps_policy_id,
    intent_id: intent.intent_id,
    identity_id: intent.identity_id,
    reservation_id: intent.reservation_id,
    signed_submission_digest: signedDigest,
    gas_limit: String(gasLimit),
  };
  value.sponsorship_id = economicSystemSponsorshipIdV1(value);
  return value;
}

async function signedCandidate(
  ttl,
  sponsor,
  identityDigit,
  reservationDigit,
  issuedUnix,
  gasLimit,
) {
  const wallet = Wallet.createRandom();
  const economicIntent =
    ttlIntent(ttl, identityDigit, reservationDigit, issuedUnix);
  const signedIntent =
    buildVoidEconomicEpoch2SignedSubmissionIntentV1({
      signer: wallet.address.toLowerCase(),
      nonce: "1",
      issuedAtUnix: String(issuedUnix),
      expiresAtUnix:
        String(issuedUnix + ttl.intent_ttl_seconds),
      target,
      gasLimit: String(gasLimit),
      calldata: "0x1234",
    });
  const typed =
    voidEconomicEpoch2SignedSubmissionTypedDataV1(signedIntent);
  const signature = await wallet.signTypedData(
    typed.domain,
    typed.types,
    typed.value,
  );
  const digest =
    voidEconomicEpoch2SignedSubmissionDigestV1(signedIntent);
  const gasReservation =
    sponsorship(sponsor, economicIntent, digest, gasLimit);

  return {
    economicIntent,
    gasReservation,
    signedSubmission: {
      intent: signedIntent,
      calldata: "0x1234",
      signature,
      allowed_targets: [target],
      consumed_digests: new Set(),
    },
  };
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

assert.equal(
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
    .policy_contract_id,
  "sha256:4a0a0641c414e6f716359ec4f030a8c8c9204d9752bc98bddc18b2ea1c211f86",
);
assert.equal(
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
    .max_signed_intent_gas_limit,
  "3000000",
);
assert.equal(
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
    .intent_ttl_caps_policy_contract_id,
  "sha256:71bb72b19dec6b24cb864eca8716991b0cec2665e6537584c1a0ff55a06047c0",
);
assert.equal(
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
    .gas_charge_basis,
  "verified_signed_intent_gas_limit",
);
assert.equal(
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
    .hidden_minimum_trade_amount_forbidden,
  true,
);
assert.equal(
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
    .production_budget_values_hardcoded,
  false,
);
assert.equal(
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
    .runtime_enforcement_verified,
  false,
);

const zeroGas = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-besu-free-gas-evidence-v2.json",
    "utf8",
  ),
);
assert.equal(
  zeroGas.marker,
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
    .zero_gas_evidence_marker,
);
assert.equal(
  zeroGas.status,
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
    .zero_gas_evidence_status_required,
);
assert.equal(zeroGas.client.chain_id, 2050);
assert.equal(
  zeroGas.transaction_proof.transaction_gas_price_atoms,
  "0",
);
assert.equal(
  zeroGas.transaction_proof.receipt_effective_gas_price_atoms,
  "0",
);
assert.equal(zeroGas.transaction_proof.gas_metering_positive, true);
assert.equal(
  zeroGas.transaction_proof.participant_native_gas_balance_required,
  false,
);
assert.equal(zeroGas.authority.production_rpc_contact, false);
assert.equal(zeroGas.authority.real_funds_movement, false);

const ttl = ttlPolicy();
const sponsor = sponsorPolicy(ttl);
const expiredIntent = ttlIntent(ttl, "1", "4", 1790400001);
const activeOne = ttlIntent(ttl, "1", "5", 1790400131);
const activeTwo = ttlIntent(ttl, "2", "6", 1790400132);
const existingSponsorships = [
  sponsorship(sponsor, expiredIntent, hex32("1"), 90000),
  sponsorship(sponsor, activeOne, hex32("2"), 60000),
  sponsorship(sponsor, activeTwo, hex32("3"), 60000),
];
const observedAt = 1790400140000;
const candidate =
  await signedCandidate(ttl, sponsor, "1", "7", 1790400133, 50000);

const allowed = classifyEconomicSystemSponsoredAdmissionV1({
  sponsorship_policy: sponsor,
  ttl_caps_policy: ttl,
  outstanding_intents: [expiredIntent, activeOne, activeTwo],
  sponsorships: existingSponsorships,
  candidate_intent: candidate.economicIntent,
  candidate_sponsorship: candidate.gasReservation,
  candidate_signed_submission: candidate.signedSubmission,
  observed_at_ms: observedAt,
});

assert.equal(
  allowed.marker,
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_V1,
);
assert.equal(
  allowed.policy_contract_id,
  "sha256:4a0a0641c414e6f716359ec4f030a8c8c9204d9752bc98bddc18b2ea1c211f86",
);
assert.equal(allowed.candidate_gas_limit, "50000");
assert.equal(allowed.signed_submission_signature_verified, true);
assert.equal(allowed.signed_submission_gas_limit_bound, true);
assert.equal(
  allowed.signed_submission_lifetime_matches_economic_intent,
  true,
);
assert.equal(allowed.existing_identity_reserved_gas, "60000");
assert.equal(allowed.existing_global_reserved_gas, "120000");
assert.equal(allowed.prospective_identity_reserved_gas, "110000");
assert.equal(allowed.prospective_global_reserved_gas, "170000");
assert.equal(allowed.per_identity_budget_exceeded, false);
assert.equal(allowed.global_budget_exceeded, false);
assert.equal(allowed.sponsorship_allowed, true);
assert.equal(allowed.denial_reason, null);
assert.equal(allowed.hidden_minimum_trade_amount_applied, false);
assert.equal(
  allowed.budget_exhaustion_action,
  "deny_sponsorship_without_hidden_trade_minimum",
);
assert.equal(allowed.expired_sponsorships_not_counted_as_reserved, true);
assert.equal(allowed.expired_reserved_gas_not_counted, "90000");
assert.equal(
  allowed.system_sponsored_execution_anti_grief_source_ready,
  true,
);
assert.equal(allowed.production_budget_values_hardcoded, false);
assert.equal(allowed.runtime_enforcement_verified, false);
assert.equal(allowed.sponsorship_reservation_created, false);
assert.equal(allowed.gas_sponsorship_performed, false);
assert.equal(allowed.wall_clock_read_performed, false);
assert.equal(allowed.transaction_submission, false);
assert.equal(allowed.transaction_broadcast, false);
assert.equal(allowed.authoritative_chain2050_write, false);
assert.equal(allowed.funds_movement, false);

{
  const wide = sponsorPolicy(ttl, {
    global_sponsored_gas_budget: "250000",
  });
  const existing = [
    sponsorship(wide, activeOne, hex32("2"), 60000),
    sponsorship(wide, activeTwo, hex32("3"), 60000),
  ];
  const blocked =
    await signedCandidate(ttl, wide, "1", "8", 1790400134, 70000);
  const result = classifyEconomicSystemSponsoredAdmissionV1({
    sponsorship_policy: wide,
    ttl_caps_policy: ttl,
    outstanding_intents: [activeOne, activeTwo],
    sponsorships: existing,
    candidate_intent: blocked.economicIntent,
    candidate_sponsorship: blocked.gasReservation,
    candidate_signed_submission: blocked.signedSubmission,
    observed_at_ms: observedAt,
  });
  assert.equal(result.per_identity_budget_exceeded, true);
  assert.equal(result.global_budget_exceeded, false);
  assert.equal(result.sponsorship_allowed, false);
  assert.equal(result.denial_reason, "sponsored_gas_budget_exhausted");
  assert.equal(result.hidden_minimum_trade_amount_applied, false);
}

{
  const wideIdentity = sponsorPolicy(ttl, {
    per_identity_sponsored_gas_budget: "150000",
    global_sponsored_gas_budget: "180000",
  });
  const existing = [
    sponsorship(wideIdentity, activeOne, hex32("2"), 60000),
    sponsorship(wideIdentity, activeTwo, hex32("3"), 60000),
  ];
  const blocked =
    await signedCandidate(ttl, wideIdentity, "3", "8", 1790400134, 70000);
  const result = classifyEconomicSystemSponsoredAdmissionV1({
    sponsorship_policy: wideIdentity,
    ttl_caps_policy: ttl,
    outstanding_intents: [activeOne, activeTwo],
    sponsorships: existing,
    candidate_intent: blocked.economicIntent,
    candidate_sponsorship: blocked.gasReservation,
    candidate_signed_submission: blocked.signedSubmission,
    observed_at_ms: observedAt,
  });
  assert.equal(result.per_identity_budget_exceeded, false);
  assert.equal(result.global_budget_exceeded, true);
  assert.equal(result.sponsorship_allowed, false);
  assert.equal(result.denial_reason, "sponsored_gas_budget_exhausted");
}

{
  const tooHigh =
    await signedCandidate(ttl, sponsor, "3", "8", 1790400134, 110000);
  rejects(
    () => classifyEconomicSystemSponsoredAdmissionV1({
      sponsorship_policy: sponsor,
      ttl_caps_policy: ttl,
      outstanding_intents: [activeOne],
      sponsorships: [
        sponsorship(sponsor, activeOne, hex32("2"), 60000),
      ],
      candidate_intent: tooHigh.economicIntent,
      candidate_sponsorship: tooHigh.gasReservation,
      candidate_signed_submission: tooHigh.signedSubmission,
      observed_at_ms: observedAt,
    }),
    "SYSTEM_SPONSORSHIP_PER_INTENT_GAS_LIMIT_EXCEEDED",
  );
}

{
  const bad = structuredClone(candidate.gasReservation);
  bad.signed_submission_digest = hex32("f");
  bad.sponsorship_id = economicSystemSponsorshipIdV1(bad);
  rejects(
    () => classifyEconomicSystemSponsoredAdmissionV1({
      sponsorship_policy: sponsor,
      ttl_caps_policy: ttl,
      outstanding_intents: [],
      sponsorships: [],
      candidate_intent: candidate.economicIntent,
      candidate_sponsorship: bad,
      candidate_signed_submission: candidate.signedSubmission,
      observed_at_ms: observedAt,
    }),
    "SYSTEM_SPONSORSHIP_SIGNED_SUBMISSION_DIGEST_MISMATCH",
  );
}

{
  const bad = structuredClone(candidate.gasReservation);
  bad.gas_limit = "49000";
  bad.sponsorship_id = economicSystemSponsorshipIdV1(bad);
  rejects(
    () => classifyEconomicSystemSponsoredAdmissionV1({
      sponsorship_policy: sponsor,
      ttl_caps_policy: ttl,
      outstanding_intents: [],
      sponsorships: [],
      candidate_intent: candidate.economicIntent,
      candidate_sponsorship: bad,
      candidate_signed_submission: candidate.signedSubmission,
      observed_at_ms: observedAt,
    }),
    "SYSTEM_SPONSORSHIP_SIGNED_GAS_LIMIT_MISMATCH",
  );
}

{
  const badIntent = structuredClone(candidate.economicIntent);
  badIntent.expires_at_ms += 1000;
  badIntent.intent_id = economicIntentReservationIdV1(badIntent);
  const badSponsor = sponsorship(
    sponsor,
    badIntent,
    candidate.gasReservation.signed_submission_digest,
    50000,
  );
  rejects(
    () => classifyEconomicSystemSponsoredAdmissionV1({
      sponsorship_policy: sponsor,
      ttl_caps_policy: ttl,
      outstanding_intents: [],
      sponsorships: [],
      candidate_intent: badIntent,
      candidate_sponsorship: badSponsor,
      candidate_signed_submission: candidate.signedSubmission,
      observed_at_ms: observedAt,
    }),
    "ECONOMIC_INTENT_EXPIRY_NOT_POLICY_BOUND",
  );
}

{
  const wrongOrder = sponsorPolicy(ttl, {
    policy_committed_at_ms: ttl.policy_committed_at_ms,
  });
  const badCandidate =
    await signedCandidate(ttl, wrongOrder, "3", "8", 1790400134, 50000);
  rejects(
    () => classifyEconomicSystemSponsoredAdmissionV1({
      sponsorship_policy: wrongOrder,
      ttl_caps_policy: ttl,
      outstanding_intents: [],
      sponsorships: [],
      candidate_intent: badCandidate.economicIntent,
      candidate_sponsorship: badCandidate.gasReservation,
      candidate_signed_submission: badCandidate.signedSubmission,
      observed_at_ms: observedAt,
    }),
    "SYSTEM_SPONSORED_POLICY_MUST_FOLLOW_TTL_POLICY",
  );
}

{
  const bad = sponsorPolicy(ttl, {
    per_intent_sponsored_gas_limit: "3000001",
    per_identity_sponsored_gas_budget: "3000001",
    global_sponsored_gas_budget: "3000001",
  });
  rejects(
    () => classifyEconomicSystemSponsoredAdmissionV1({
      sponsorship_policy: bad,
      ttl_caps_policy: ttl,
      outstanding_intents: [],
      sponsorships: [],
      candidate_intent: candidate.economicIntent,
      candidate_sponsorship: candidate.gasReservation,
      candidate_signed_submission: candidate.signedSubmission,
      observed_at_ms: observedAt,
    }),
    "PER_INTENT_SPONSORED_GAS_ABOVE_SIGNED_INTENT_MAXIMUM",
  );
}

{
  const alternate = sponsorPolicy(ttl, {
    policy_generation: "2",
    per_intent_sponsored_gas_limit: "80000",
    per_identity_sponsored_gas_budget: "160000",
    global_sponsored_gas_budget: "320000",
  });
  assert.notEqual(alternate.policy_id, sponsor.policy_id);
  assert.equal(
    VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
      .production_budget_values_hardcoded,
    false,
  );
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_AUTHORITY_V1,
)) {
  if (
    [
      "source_only",
      "explicit_input_only",
      "signature_verification",
      "local_replay_set_observation",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const lightweight = fs.readFileSync(
  "tools/void-economic-system-sponsored-anti-grief-policy-contract-v1.mjs",
  "utf8",
);
assert.doesNotMatch(lightweight, /from\s+["']ethers["']/);
assert.doesNotMatch(lightweight, /Wallet\s*\(/);

const source = fs.readFileSync(
  "tools/void-economic-system-sponsored-anti-grief-policy-v1.mjs",
  "utf8",
);
assert.doesNotMatch(
  source,
  /appendFileSync|writeFileSync|renameSync|eth_sendRawTransaction|eth_sendTransaction|systemctl/,
);
assert.match(source, /verifyVoidEconomicEpoch2SignedSubmissionIntentV1/);
assert.match(source, /verifyEconomicIntentTtlCapsStateV1/);
assert.match(source, /sponsored_gas_budget_exhausted/);
assert.match(source, /hidden_minimum_trade_amount_applied: false/);

console.log(
  "VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_V1_GREEN",
);
console.log(
  "policy_contract_id=" +
  VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT
    .policy_contract_id,
);
console.log("native_gas_model=epoch2_metered_zero_gas_price_v1");
console.log("native_gas_economic_charge_atoms=0");
console.log("gas_metering_positive_evidence_bound=true");
console.log("signed_intent_gas_limit_binding_required=true");
console.log("signed_submission_digest_binding_required=true");
console.log("ttl_caps_lifecycle_composed=true");
console.log("expired_sponsorships_not_counted_as_reserved=true");
console.log("per_intent_sponsored_gas_limit_required=true");
console.log("per_identity_sponsored_gas_budget_required=true");
console.log("global_sponsored_gas_budget_required=true");
console.log("budget_exhaustion_action=deny_sponsorship_without_hidden_trade_minimum");
console.log("hidden_minimum_trade_amount_forbidden=true");
console.log("production_budget_values_hardcoded=false");
console.log("runtime_enforcement_verified=false");
console.log("reservation_mutation=false");
console.log("gas_sponsorship_performed=false");
console.log("transaction_submission=false");
console.log("funds_movement=false");
