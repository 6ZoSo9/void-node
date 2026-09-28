#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_POLICY_V1,
} from "../tools/void-economic-epoch2-signed-submission-intent-v1.mjs";

import {
  VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1,
  VOID_ECONOMIC_INTENT_TTL_CAPS_AUTHORITY_V1,
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1,
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1,
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_V1,
  classifyEconomicIntentAdmissionV1,
  classifyEconomicIntentLatePaymentV1,
  economicIntentReservationIdV1,
  economicIntentTtlCapsPolicyIdV1,
  verifyEconomicIntentTtlCapsStateV1,
} from "../tools/void-economic-intent-ttl-caps-policy-v1.mjs";

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const launchId = hash("a");

function policy(overrides = {}) {
  const value = {
    schema: VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SCHEMA_V1,
    policy_id: hash("0"),
    coupled_launch_id: launchId,
    policy_generation: "1",
    policy_committed_at_ms: 1790400000000,
    intent_ttl_seconds: 120,
    per_identity_max_outstanding: 2,
    global_max_outstanding: 3,
    late_payment_action: "reconcile_without_automatic_execution",
    ...overrides,
  };
  value.policy_id = economicIntentTtlCapsPolicyIdV1(value);
  return value;
}

function intent(
  policyValue,
  identityDigit,
  reservationDigit,
  issuedAtMs,
  overrides = {},
) {
  const value = {
    schema: VOID_ECONOMIC_INTENT_RESERVATION_SCHEMA_V1,
    intent_id: hash("0"),
    policy_id: policyValue.policy_id,
    coupled_launch_id: launchId,
    identity_id: hash(identityDigit),
    reservation_id: hash(reservationDigit),
    issued_at_ms: issuedAtMs,
    expires_at_ms:
      issuedAtMs + policyValue.intent_ttl_seconds * 1_000,
    state: "pending_unpaid",
    ...overrides,
  };
  value.intent_id = economicIntentReservationIdV1(value);
  return value;
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

assert.equal(
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1.policy_contract_id,
  "sha256:71bb72b19dec6b24cb864eca8716991b0cec2665e6537584c1a0ff55a06047c0",
);
assert.equal(
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1.max_ttl_seconds,
  "300",
);
assert.equal(
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1.max_ttl_seconds,
  VOID_ECONOMIC_EPOCH2_SIGNED_SUBMISSION_POLICY_V1.max_ttl_seconds,
);
assert.equal(
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1
    .production_ttl_value_hardcoded,
  false,
);
assert.equal(
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1
    .production_cap_values_hardcoded,
  false,
);
assert.equal(
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1
    .late_payment_action,
  "reconcile_without_automatic_execution",
);
assert.equal(
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1
    .late_payment_automatic_execution,
  false,
);

const p = policy();
const first = intent(p, "1", "4", 1790400001000);
const second = intent(p, "1", "5", 1790400011000);
const third = intent(p, "2", "6", 1790400021000);
const expired = intent(p, "1", "7", 1790400000500);
const observedWithOneExpired = 1790400120750;

const state = verifyEconomicIntentTtlCapsStateV1({
  policy: p,
  outstanding_intents: [third, expired, second, first],
  observed_at_ms: observedWithOneExpired,
});

assert.equal(state.marker, VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_V1);
assert.equal(
  state.policy_contract_id,
  "sha256:71bb72b19dec6b24cb864eca8716991b0cec2665e6537584c1a0ff55a06047c0",
);
assert.equal(state.policy_id, p.policy_id);
assert.equal(state.coupled_launch_id, launchId);
assert.equal(state.policy_generation, "1");
assert.equal(state.intent_ttl_seconds, 120);
assert.equal(state.per_identity_max_outstanding, 2);
assert.equal(state.global_max_outstanding, 3);
assert.equal(state.tracked_intent_count, 4);
assert.equal(state.outstanding_intent_count, 3);
assert.equal(state.expired_intent_count, 1);
assert.deepEqual(state.per_identity_outstanding_counts, [
  { identity_id: hash("1"), count: 2 },
  { identity_id: hash("2"), count: 1 },
]);
assert.equal(state.ttl_bounded_by_signed_submission_maximum, true);
assert.equal(state.outstanding_caps_explicit_and_bounded, true);
assert.equal(state.expired_intents_not_counted_as_outstanding, true);
assert.equal(state.expired_reservation_release_required, true);
assert.equal(state.economic_intent_ttl_and_caps_source_ready, true);
assert.equal(state.production_cap_values_hardcoded, false);
assert.equal(state.wall_clock_read_performed, false);
assert.equal(state.runtime_enforcement_verified, false);
assert.equal(state.reservation_mutation_performed, false);
assert.equal(
  state.intents.find((x) => x.intent_id === expired.intent_id)
    .reservation_release_required,
  true,
);

{
  const before = classifyEconomicIntentLatePaymentV1({
    policy: p,
    intent: first,
    payment_observed_at_ms: first.expires_at_ms - 1,
  });
  assert.equal(before.payment_after_expiry, false);
  assert.equal(before.action, "continue_normal_settlement_path");
  assert.equal(before.normal_settlement_path_eligible, true);
  assert.equal(before.automatic_execution_allowed, false);
  assert.equal(before.expired_reservation_release_required, false);
  assert.equal(before.new_reservation_required_for_late_execution, false);
  assert.equal(before.payment_observation_performed, false);
}

{
  const late = classifyEconomicIntentLatePaymentV1({
    policy: p,
    intent: first,
    payment_observed_at_ms: first.expires_at_ms,
  });
  assert.equal(late.payment_after_expiry, true);
  assert.equal(
    late.action,
    "reconcile_without_automatic_execution",
  );
  assert.equal(late.normal_settlement_path_eligible, false);
  assert.equal(late.automatic_execution_allowed, false);
  assert.equal(late.expired_reservation_release_required, true);
  assert.equal(late.new_reservation_required_for_late_execution, true);
  assert.equal(late.transaction_submission, false);
  assert.equal(late.funds_movement, false);
}

{
  const blockedByIdentity = classifyEconomicIntentAdmissionV1({
    policy: p,
    outstanding_intents: [first, second],
    observed_at_ms: 1790400050000,
    identity_id: hash("1"),
  });
  assert.equal(blockedByIdentity.identity_outstanding_count, 2);
  assert.equal(blockedByIdentity.global_outstanding_count, 2);
  assert.equal(blockedByIdentity.per_identity_cap_reached, true);
  assert.equal(blockedByIdentity.global_cap_reached, false);
  assert.equal(blockedByIdentity.admission_allowed, false);
  assert.equal(blockedByIdentity.reservation_created, false);
  assert.equal(blockedByIdentity.reservation_mutation_performed, false);
}

{
  const blockedByGlobal = classifyEconomicIntentAdmissionV1({
    policy: p,
    outstanding_intents: [first, second, third],
    observed_at_ms: 1790400050000,
    identity_id: hash("3"),
  });
  assert.equal(blockedByGlobal.identity_outstanding_count, 0);
  assert.equal(blockedByGlobal.global_outstanding_count, 3);
  assert.equal(blockedByGlobal.per_identity_cap_reached, false);
  assert.equal(blockedByGlobal.global_cap_reached, true);
  assert.equal(blockedByGlobal.admission_allowed, false);
}

{
  const allowedAfterExpiry = classifyEconomicIntentAdmissionV1({
    policy: p,
    outstanding_intents: [expired],
    observed_at_ms: observedWithOneExpired,
    identity_id: hash("1"),
  });
  assert.equal(allowedAfterExpiry.identity_outstanding_count, 0);
  assert.equal(allowedAfterExpiry.global_outstanding_count, 0);
  assert.equal(allowedAfterExpiry.admission_allowed, true);
  assert.equal(allowedAfterExpiry.wall_clock_read_performed, false);
  assert.equal(allowedAfterExpiry.transaction_submission, false);
  assert.equal(allowedAfterExpiry.funds_movement, false);
}

{
  const alternate = policy({
    intent_ttl_seconds: 60,
    per_identity_max_outstanding: 1,
    global_max_outstanding: 4,
    policy_generation: "2",
  });
  const one = intent(alternate, "8", "9", 1790400001000);
  const alternateState = verifyEconomicIntentTtlCapsStateV1({
    policy: alternate,
    outstanding_intents: [one],
    observed_at_ms: 1790400030000,
  });
  assert.equal(alternateState.intent_ttl_seconds, 60);
  assert.equal(alternateState.per_identity_max_outstanding, 1);
  assert.equal(alternateState.global_max_outstanding, 4);
  assert.equal(alternateState.production_cap_values_hardcoded, false);
}

{
  const bad = policy({ intent_ttl_seconds: 301 });
  rejects(
    () =>
      verifyEconomicIntentTtlCapsStateV1({
        policy: bad,
        outstanding_intents: [],
        observed_at_ms: 1790400050000,
      }),
    "ECONOMIC_INTENT_TTL_ABOVE_SIGNED_SUBMISSION_MAXIMUM",
  );
}

{
  const bad = policy({
    per_identity_max_outstanding: 4,
    global_max_outstanding: 3,
  });
  rejects(
    () =>
      verifyEconomicIntentTtlCapsStateV1({
        policy: bad,
        outstanding_intents: [],
        observed_at_ms: 1790400050000,
      }),
    "ECONOMIC_INTENT_GLOBAL_CAP_BELOW_IDENTITY_CAP",
  );
}

{
  const capPolicy = policy({
    per_identity_max_outstanding: 1,
    global_max_outstanding: 3,
  });
  const one = intent(capPolicy, "1", "4", 1790400001000);
  const two = intent(capPolicy, "1", "5", 1790400011000);
  rejects(
    () =>
      verifyEconomicIntentTtlCapsStateV1({
        policy: capPolicy,
        outstanding_intents: [one, two],
        observed_at_ms: 1790400050000,
      }),
    "ECONOMIC_INTENT_PER_IDENTITY_OUTSTANDING_CAP_EXCEEDED",
  );
}

{
  const capPolicy = policy({
    per_identity_max_outstanding: 2,
    global_max_outstanding: 2,
  });
  const one = intent(capPolicy, "1", "4", 1790400001000);
  const two = intent(capPolicy, "2", "5", 1790400011000);
  const three = intent(capPolicy, "3", "6", 1790400021000);
  rejects(
    () =>
      verifyEconomicIntentTtlCapsStateV1({
        policy: capPolicy,
        outstanding_intents: [one, two, three],
        observed_at_ms: 1790400050000,
      }),
    "ECONOMIC_INTENT_GLOBAL_OUTSTANDING_CAP_EXCEEDED",
  );
}

{
  const bad = intent(p, "1", "4", p.policy_committed_at_ms);
  rejects(
    () =>
      verifyEconomicIntentTtlCapsStateV1({
        policy: p,
        outstanding_intents: [bad],
        observed_at_ms: 1790400050000,
      }),
    "ECONOMIC_INTENT_POLICY_NOT_COMMITTED_BEFORE_ADMISSION",
  );
}

{
  const bad = intent(p, "1", "4", 1790400001000, {
    expires_at_ms: 1790400001000 + 119_000,
  });
  bad.intent_id = economicIntentReservationIdV1(bad);
  rejects(
    () =>
      verifyEconomicIntentTtlCapsStateV1({
        policy: p,
        outstanding_intents: [bad],
        observed_at_ms: 1790400050000,
      }),
    "ECONOMIC_INTENT_EXPIRY_NOT_POLICY_BOUND",
  );
}

{
  const bad = structuredClone(p);
  bad.policy_id = hash("f");
  rejects(
    () =>
      verifyEconomicIntentTtlCapsStateV1({
        policy: bad,
        outstanding_intents: [],
        observed_at_ms: 1790400050000,
      }),
    "ECONOMIC_INTENT_TTL_CAPS_POLICY_DIGEST_MISMATCH",
  );
}

{
  const bad = structuredClone(first);
  bad.intent_id = hash("e");
  rejects(
    () =>
      verifyEconomicIntentTtlCapsStateV1({
        policy: p,
        outstanding_intents: [bad],
        observed_at_ms: 1790400050000,
      }),
    "ECONOMIC_INTENT_DIGEST_MISMATCH",
  );
}

rejects(
  () =>
    verifyEconomicIntentTtlCapsStateV1({
      policy: p,
      outstanding_intents: [first, first],
      observed_at_ms: 1790400050000,
    }),
  "DUPLICATE_ECONOMIC_INTENT_ID",
);

{
  const otherIntent = intent(p, "2", "4", 1790400011000);
  rejects(
    () =>
      verifyEconomicIntentTtlCapsStateV1({
        policy: p,
        outstanding_intents: [first, otherIntent],
        observed_at_ms: 1790400050000,
      }),
    "DUPLICATE_ECONOMIC_INTENT_RESERVATION_ID",
  );
}

{
  const bad = policy({
    late_payment_action: "automatic_execute",
  });
  rejects(
    () =>
      verifyEconomicIntentTtlCapsStateV1({
        policy: bad,
        outstanding_intents: [],
        observed_at_ms: 1790400050000,
      }),
    "ECONOMIC_INTENT_LATE_PAYMENT_ACTION_MISMATCH",
  );
}

{
  let getterCalled = false;
  const bad = structuredClone(p);
  Object.defineProperty(bad, "intent_ttl_seconds", {
    enumerable: true,
    get() {
      getterCalled = true;
      return 120;
    },
  });
  rejects(
    () =>
      verifyEconomicIntentTtlCapsStateV1({
        policy: bad,
        outstanding_intents: [],
        observed_at_ms: 1790400050000,
      }),
    "INVALID_ECONOMIC_INTENT_TTL_CAPS_POLICY_SHAPE",
  );
  assert.equal(getterCalled, false);
}

for (const [key, value] of Object.entries(
  VOID_ECONOMIC_INTENT_TTL_CAPS_AUTHORITY_V1,
)) {
  if (key === "source_only" || key === "explicit_input_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-economic-intent-ttl-caps-policy-v1.mjs",
  "utf8",
);
assert.doesNotMatch(source, /Date\.now\(|new\s+Date\s*\(/);
assert.doesNotMatch(
  source,
  /appendFileSync|writeFileSync|renameSync|eth_sendRawTransaction|eth_sendTransaction|new\s+Wallet\s*\(/,
);
assert.match(source, /max_ttl_seconds/);
assert.match(source, /per_identity_max_outstanding/);
assert.match(source, /global_max_outstanding/);
assert.match(source, /reconcile_without_automatic_execution/);

console.log("VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_V1_GREEN");
console.log(
  "policy_contract_id=" +
  VOID_ECONOMIC_INTENT_TTL_CAPS_POLICY_CONTRACT_V1.policy_contract_id,
);
console.log("signed_submission_max_ttl_seconds=300");
console.log("production_ttl_value_hardcoded=false");
console.log("production_cap_values_hardcoded=false");
console.log("pre_admission_cap_classifier_ready=true");
console.log("automatic_execution_authority=false");
console.log("explicit_per_identity_cap_required=true");
console.log("explicit_global_cap_required=true");
console.log("global_cap_not_less_than_identity_cap_required=true");
console.log("expired_intents_not_counted_as_outstanding=true");
console.log("expired_reservation_release_required=true");
console.log("late_payment_action=reconcile_without_automatic_execution");
console.log("late_payment_automatic_execution=false");
console.log("economic_intent_ttl_and_caps_source_ready=true");
console.log("runtime_enforcement_verified=false");
console.log("reservation_mutation=false");
console.log("funds_movement=false");
