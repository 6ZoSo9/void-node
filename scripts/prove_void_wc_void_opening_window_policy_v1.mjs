#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  wcVoidOpeningCommitmentIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";

import {
  VOID_WC_VOID_OPENING_ADMISSION_SCHEMA_V1,
  VOID_WC_VOID_OPENING_WINDOW_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_WINDOW_POLICY_V1,
  VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1,
  classifyWcVoidOpeningWindowPhaseV1,
  verifyWcVoidOpeningWindowPolicyV1,
  wcVoidOpeningAdmissionIdV1,
  wcVoidOpeningWindowIdV1,
} from "../tools/void-wc-void-opening-window-policy-v1.mjs";

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const launchId = hash("a");

function commitment(participantDigit, account, wcUnits) {
  const value = {
    schema: VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
    commitment_id: hash("0"),
    coupled_launch_id: launchId,
    participant_id: hash(participantDigit),
    account,
    wc_units: String(wcUnits),
  };
  value.commitment_id = wcVoidOpeningCommitmentIdV1(value);
  return value;
}

const first = commitment("1", "wc-opening-alpha", "250");
const second = commitment("2", "wc-opening-beta", "750");

function window() {
  const value = {
    schema: VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1,
    window_id: hash("0"),
    coupled_launch_id: launchId,
    policy_committed_at_ms: 1790350000000,
    opens_at_ms: 1790353600000,
    closes_at_ms: 1790357200000,
  };
  value.window_id = wcVoidOpeningWindowIdV1(value);
  return value;
}

function admission(commitmentValue, admittedAtMs, windowValue) {
  const value = {
    schema: VOID_WC_VOID_OPENING_ADMISSION_SCHEMA_V1,
    admission_id: hash("0"),
    window_id: windowValue.window_id,
    coupled_launch_id: launchId,
    commitment_id: commitmentValue.commitment_id,
    participant_id: commitmentValue.participant_id,
    account: commitmentValue.account,
    admitted_at_ms: admittedAtMs,
  };
  value.admission_id = wcVoidOpeningAdmissionIdV1(value);
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

const w = window();
const firstAdmission = admission(first, w.opens_at_ms, w);
const secondAdmission = admission(second, w.closes_at_ms - 1, w);

const state = verifyWcVoidOpeningWindowPolicyV1({
  coupled_launch_id: launchId,
  window: w,
  commitments: [second, first],
  admissions: [secondAdmission, firstAdmission],
});

assert.equal(state.marker, VOID_WC_VOID_OPENING_WINDOW_POLICY_V1);
assert.match(state.policy_state_id, /^sha256:[0-9a-f]{64}$/);
assert.equal(state.coupled_launch_id, launchId);
assert.equal(state.window_id, w.window_id);
assert.equal(state.policy_committed_at_ms, 1790350000000);
assert.equal(state.opens_at_ms, 1790353600000);
assert.equal(state.closes_at_ms, 1790357200000);
assert.equal(state.opening_commitment_window_policy_ready, true);
assert.equal(state.policy_committed_before_open, true);
assert.equal(state.finite_window_required, true);
assert.equal(state.deterministic_close_exclusive, true);
assert.equal(state.close_boundary_admission_rejected, true);
assert.equal(state.post_close_admission_forbidden, true);
assert.equal(state.exact_commitment_admission_bijection, true);
assert.equal(state.admission_order_independent, true);
assert.equal(state.duration_value_hardcoded, false);
assert.equal(state.participant_provenance_verified, false);
assert.equal(state.live_admission_persistence_verified, false);
assert.equal(state.live_clock_observed, false);
assert.equal(state.ledger_write_performed, false);
assert.equal(state.wc_balance_mutation_performed, false);
assert.equal(state.market_activation_authority, false);
assert.equal(state.public_presale_activation_authority, false);
assert.equal(state.funds_movement_authority, false);

const reordered = verifyWcVoidOpeningWindowPolicyV1({
  coupled_launch_id: launchId,
  window: w,
  commitments: [first, second],
  admissions: [firstAdmission, secondAdmission],
});
assert.equal(reordered.policy_state_id, state.policy_state_id);
assert.deepEqual(reordered.admissions, state.admissions);

assert.deepEqual(
  classifyWcVoidOpeningWindowPhaseV1(w, w.opens_at_ms - 1),
  {
    window_id: w.window_id,
    observed_at_ms: w.opens_at_ms - 1,
    phase: "scheduled",
    admission_allowed: false,
    deterministic_close_exclusive: true,
    wall_clock_read_performed: false,
  },
);
assert.equal(
  classifyWcVoidOpeningWindowPhaseV1(w, w.opens_at_ms).phase,
  "open",
);
assert.equal(
  classifyWcVoidOpeningWindowPhaseV1(w, w.closes_at_ms - 1).phase,
  "open",
);
assert.equal(
  classifyWcVoidOpeningWindowPhaseV1(w, w.closes_at_ms).phase,
  "closed",
);
assert.equal(
  classifyWcVoidOpeningWindowPhaseV1(w, w.closes_at_ms)
    .admission_allowed,
  false,
);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_WINDOW_AUTHORITY_V1,
)) {
  assert.equal(
    key === "source_only" || key === "explicit_input_only"
      ? value
      : !value,
    true,
    key,
  );
}

{
  const bad = clone(w);
  bad.policy_committed_at_ms = bad.opens_at_ms;
  bad.window_id = wcVoidOpeningWindowIdV1(bad);
  rejects(
    () => verifyWcVoidOpeningWindowPolicyV1({
      coupled_launch_id: launchId,
      window: bad,
      commitments: [first, second],
      admissions: [firstAdmission, secondAdmission],
    }),
    "WC_VOID_OPENING_WINDOW_ORDER_INVALID",
  );
}

{
  const bad = clone(firstAdmission);
  bad.admitted_at_ms = w.opens_at_ms - 1;
  bad.admission_id = wcVoidOpeningAdmissionIdV1(bad);
  rejects(
    () => verifyWcVoidOpeningWindowPolicyV1({
      coupled_launch_id: launchId,
      window: w,
      commitments: [first, second],
      admissions: [bad, secondAdmission],
    }),
    "WC_VOID_OPENING_ADMISSION_OUTSIDE_WINDOW",
  );
}

{
  const bad = clone(secondAdmission);
  bad.admitted_at_ms = w.closes_at_ms;
  bad.admission_id = wcVoidOpeningAdmissionIdV1(bad);
  rejects(
    () => verifyWcVoidOpeningWindowPolicyV1({
      coupled_launch_id: launchId,
      window: w,
      commitments: [first, second],
      admissions: [firstAdmission, bad],
    }),
    "WC_VOID_OPENING_ADMISSION_OUTSIDE_WINDOW",
  );
}

{
  const bad = clone(firstAdmission);
  bad.account = second.account;
  bad.admission_id = wcVoidOpeningAdmissionIdV1(bad);
  rejects(
    () => verifyWcVoidOpeningWindowPolicyV1({
      coupled_launch_id: launchId,
      window: w,
      commitments: [first, second],
      admissions: [bad, secondAdmission],
    }),
    "WC_VOID_OPENING_ADMISSION_COMMITMENT_MISMATCH",
  );
}

rejects(
  () => verifyWcVoidOpeningWindowPolicyV1({
    coupled_launch_id: launchId,
    window: w,
    commitments: [first, second],
    admissions: [firstAdmission, firstAdmission],
  }),
  "DUPLICATE_WC_VOID_OPENING_ADMISSION_ID",
);

rejects(
  () => verifyWcVoidOpeningWindowPolicyV1({
    coupled_launch_id: launchId,
    window: w,
    commitments: [first, second],
    admissions: [firstAdmission],
  }),
  "WC_VOID_OPENING_ADMISSION_COUNT_MISMATCH",
);

{
  const bad = clone(w);
  bad.closes_at_ms += 1;
  rejects(
    () => verifyWcVoidOpeningWindowPolicyV1({
      coupled_launch_id: launchId,
      window: bad,
      commitments: [first, second],
      admissions: [firstAdmission, secondAdmission],
    }),
    "WC_VOID_OPENING_WINDOW_DIGEST_MISMATCH",
  );
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-window-policy-v1.mjs",
  "utf8",
);
assert.doesNotMatch(
  source,
  /mnemonic|PRIVATE_KEY\s*=|process\.env\.[A-Z0-9_]*PRIVATE_KEY|new\s+Wallet\s*\(|fromPhrase\s*\(|fromMnemonic\s*\(/i,
);
assert.doesNotMatch(source, /eth_sendRawTransaction|eth_sendTransaction/i);
assert.doesNotMatch(source, /appendFileSync|writeFileSync|renameSync/);
assert.doesNotMatch(source, /Date\.now\(|new\s+Date\s*\(/);
assert.match(source, /policy_committed_at_ms/);
assert.match(source, /admittedAt >= window\.closes_at_ms/);

console.log("VOID_WC_VOID_OPENING_WINDOW_POLICY_V1_GREEN");
console.log("opening_commitment_window_policy_ready=true");
console.log("policy_committed_before_open=true");
console.log("finite_window_required=true");
console.log("deterministic_close_exclusive=true");
console.log("close_boundary_admission_rejected=true");
console.log("exact_commitment_admission_bijection=true");
console.log("duration_value_hardcoded=false");
console.log("participant_provenance_verified=false");
console.log("live_admission_persistence_verified=false");
console.log("wall_clock_read=false");
console.log("ledger_write=false");
console.log("market_activation=false");
console.log("funds_movement=false");
