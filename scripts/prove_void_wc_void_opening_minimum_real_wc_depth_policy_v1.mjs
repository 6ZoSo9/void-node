#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  wcVoidOpeningCommitmentIdV1,
  wcVoidOpeningSettlementIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";

import {
  VOID_WC_VOID_OPENING_WC_PROVENANCE_SCHEMA_V1,
} from "../tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs";

import {
  VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1,
  wcVoidOpeningWindowIdV1,
} from "../tools/void-wc-void-opening-window-policy-v1.mjs";

import {
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT,
} from "../tools/void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs";

import {
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_SCHEMA_V1,
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_V1,
  verifyWcVoidOpeningMinimumRealWcDepthV1,
  wcVoidOpeningMinimumRealWcDepthPolicyIdV1,
} from "../tools/void-wc-void-opening-minimum-real-wc-depth-policy-v1.mjs";

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

function provenance(commitmentValue, receiptDigit) {
  return {
    schema: VOID_WC_VOID_OPENING_WC_PROVENANCE_SCHEMA_V1,
    coupled_launch_id: launchId,
    commitment_id: commitmentValue.commitment_id,
    participant_id: commitmentValue.participant_id,
    account: commitmentValue.account,
    wc_units: commitmentValue.wc_units,
    source_class: "production_earned_wc",
    earning_receipt_id: hash(receiptDigit),
    price_formation_included: true,
  };
}

function debit(commitmentValue, amount, tsMs) {
  const value = {
    schema: VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
    kind: "debit",
    account: commitmentValue.account,
    amount,
    delta: -amount,
    ts_ms: tsMs,
    reason: "wc_void_opening_settlement_v1",
    settlement_id: hash("0"),
    commitment_id: commitmentValue.commitment_id,
    coupled_launch_id: launchId,
    pair: "WC_VOID",
    source_domain: "void-work-credit-ledger",
    quote_asset_form: "ledger-credit",
    quote_unit: "wc",
    quote_decimals: 0,
    market_meta: {
      adapter_id: VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
      opening_only: true,
      fixed_price: false,
      protocol_wc_seed_units: "0",
    },
  };
  value.settlement_id = wcVoidOpeningSettlementIdV1(value);
  return value;
}

function openingWindow() {
  const value = {
    schema: VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1,
    window_id: hash("0"),
    coupled_launch_id: launchId,
    policy_committed_at_ms: 1790500000000,
    opens_at_ms: 1790500100000,
    closes_at_ms: 1790500200000,
  };
  value.window_id = wcVoidOpeningWindowIdV1(value);
  return value;
}

function policy(window, minimum = "1000", overrides = {}) {
  const value = {
    schema: VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_SCHEMA_V1,
    policy_id: hash("0"),
    coupled_launch_id: launchId,
    policy_generation: "1",
    policy_committed_at_ms: 1790499999000,
    opening_window_id: window.window_id,
    minimum_real_wc_units: minimum,
    minimum_depth_failure_action: "hold_opening_price_acceptance",
    ...overrides,
  };
  value.policy_id = wcVoidOpeningMinimumRealWcDepthPolicyIdV1(value);
  return value;
}

function fixture(minimum = "1000", observedAt = 1790500200000) {
  const alpha = commitment("1", "wc-opening-alpha", "250");
  const beta = commitment("2", "wc-opening-beta", "750");
  const window = openingWindow();
  return {
    policy: policy(window, minimum),
    opening_window: window,
    commitments: [alpha, beta],
    production_wc_provenance_records: [
      provenance(beta, "c"),
      provenance(alpha, "b"),
    ],
    ledger_debits: [
      debit(beta, 750, 1790500150002),
      debit(alpha, 250, 1790500150001),
    ],
    observed_at_ms: observedAt,
  };
}

function clone(value) {
  return structuredClone(value);
}

function rejects(value, code) {
  assert.throws(
    () => verifyWcVoidOpeningMinimumRealWcDepthV1(value),
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

assert.equal(
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
    .policy_contract_id,
  "sha256:bacc5bdc9decfcc934b7418f16b338fe2f010af5abbc5a33ed2f83789b5f8816",
);
assert.equal(
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
    .exact_launch_minimum_real_wc_depth_required,
  true,
);
assert.equal(
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
    .positive_whole_wc_minimum_required,
  true,
);
assert.equal(
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
    .settled_eligible_production_wc_only,
  true,
);
assert.equal(
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
    .production_minimum_real_wc_value_hardcoded,
  false,
);
assert.equal(
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
    .runtime_enforcement_verified,
  false,
);

const exact = fixture();
const verified = verifyWcVoidOpeningMinimumRealWcDepthV1(exact);
assert.equal(
  verified.marker,
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_V1,
);
assert.equal(
  verified.policy_contract_id,
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
    .policy_contract_id,
);
assert.equal(verified.coupled_launch_id, launchId);
assert.equal(verified.opening_window_id, exact.opening_window.window_id);
assert.equal(verified.window_phase, "closed");
assert.equal(verified.minimum_real_wc_units, "1000");
assert.equal(verified.production_price_forming_wc_units, "1000");
assert.equal(verified.settled_production_wc_units, "1000");
assert.equal(verified.minimum_real_wc_depth_met, true);
assert.equal(verified.opening_price_acceptance_allowed, true);
assert.equal(verified.opening_price_acceptance_hold, null);
assert.equal(
  verified.exact_commitment_production_provenance_bijection,
  true,
);
assert.equal(verified.exact_commitment_settlement_bijection, true);
assert.equal(verified.production_earning_receipt_ids_required, true);
assert.equal(verified.nonproduction_wc_exclusion_verified, true);
assert.equal(
  verified.opening_minimum_real_wc_depth_policy_source_ready,
  true,
);
assert.equal(verified.production_minimum_real_wc_value_hardcoded, false);
assert.equal(verified.runtime_or_launch_evidence, false);
assert.equal(verified.live_depth_observation_verified, false);
assert.equal(verified.ledger_persistence_verified, false);
assert.equal(verified.wall_clock_read_performed, false);
assert.equal(verified.ledger_write_performed, false);
assert.equal(verified.wc_balance_mutation_performed, false);
assert.equal(verified.market_activation_authority, false);
assert.equal(verified.public_presale_activation_authority, false);
assert.equal(verified.funds_movement_authority, false);

{
  const below = fixture("1001");
  const result = verifyWcVoidOpeningMinimumRealWcDepthV1(below);
  assert.equal(result.minimum_real_wc_depth_met, false);
  assert.equal(result.opening_price_acceptance_allowed, false);
  assert.equal(
    result.opening_price_acceptance_hold,
    "hold_opening_price_acceptance",
  );
  assert.equal(result.opening_minimum_real_wc_depth_policy_source_ready, true);
}

{
  const beforeClose = fixture("1000", 1790500199999);
  const result = verifyWcVoidOpeningMinimumRealWcDepthV1(beforeClose);
  assert.equal(result.window_phase, "open");
  assert.equal(result.minimum_real_wc_depth_met, true);
  assert.equal(result.opening_price_acceptance_allowed, false);
  assert.equal(
    result.opening_price_acceptance_hold,
    "hold_opening_price_acceptance",
  );
}

{
  const alternate = fixture("500");
  assert.notEqual(alternate.policy.policy_id, exact.policy.policy_id);
  const result = verifyWcVoidOpeningMinimumRealWcDepthV1(alternate);
  assert.equal(result.minimum_real_wc_units, "500");
  assert.equal(result.minimum_real_wc_depth_met, true);
  assert.equal(
    VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
      .production_minimum_real_wc_value_hardcoded,
    false,
  );
}

{
  const bad = clone(exact);
  bad.policy.minimum_real_wc_units = "0";
  bad.policy.policy_id = wcVoidOpeningMinimumRealWcDepthPolicyIdV1(bad.policy);
  rejects(bad, "INVALID_WC_VOID_MINIMUM_REAL_WC_UNITS");
}

{
  const bad = clone(exact);
  bad.policy.policy_committed_at_ms = bad.opening_window.opens_at_ms;
  bad.policy.policy_id = wcVoidOpeningMinimumRealWcDepthPolicyIdV1(bad.policy);
  rejects(bad, "WC_VOID_MINIMUM_DEPTH_POLICY_NOT_COMMITTED_BEFORE_OPEN");
}

{
  const bad = clone(exact);
  bad.policy.minimum_depth_failure_action = "accept_anyway";
  bad.policy.policy_id = wcVoidOpeningMinimumRealWcDepthPolicyIdV1(bad.policy);
  rejects(bad, "WC_VOID_MINIMUM_DEPTH_FAILURE_ACTION_MISMATCH");
}

{
  const bad = clone(exact);
  bad.policy.policy_id = hash("f");
  rejects(bad, "WC_VOID_MINIMUM_DEPTH_POLICY_DIGEST_MISMATCH");
}

{
  const bad = clone(exact);
  bad.production_wc_provenance_records[0].source_class = "test_wc";
  bad.production_wc_provenance_records[0].earning_receipt_id = null;
  bad.production_wc_provenance_records[0].price_formation_included = false;
  rejects(bad, "NONPRODUCTION_WC_IN_PRICE_FORMING_COHORT");
}

{
  const bad = clone(exact);
  bad.ledger_debits[0].amount = 749;
  bad.ledger_debits[0].delta = -749;
  bad.ledger_debits[0].settlement_id =
    wcVoidOpeningSettlementIdV1(bad.ledger_debits[0]);
  rejects(bad, "WC_VOID_OPENING_SETTLEMENT_COMMITMENT_MISMATCH");
}

{
  const bad = clone(exact);
  bad.opening_window.window_id = hash("f");
  rejects(bad, "WC_VOID_OPENING_WINDOW_DIGEST_MISMATCH");
}

{
  let getterCalled = false;
  const bad = clone(exact);
  Object.defineProperty(bad.policy, "minimum_real_wc_units", {
    enumerable: true,
    get() {
      getterCalled = true;
      return "1000";
    },
  });
  rejects(bad, "INVALID_WC_VOID_MINIMUM_DEPTH_POLICY_SHAPE");
  assert.equal(getterCalled, false);
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_AUTHORITY_V1,
)) {
  if (key === "source_only" || key === "explicit_input_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const contractSource = fs.readFileSync(
  "tools/void-wc-void-opening-minimum-real-wc-depth-policy-contract-v1.mjs",
  "utf8",
);
assert.doesNotMatch(contractSource, /minimum_real_wc_units\s*:/);
assert.doesNotMatch(contractSource, /from\s+["']ethers["']/);

const source = fs.readFileSync(
  "tools/void-wc-void-opening-minimum-real-wc-depth-policy-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "appendFileSync",
  "writeFileSync",
  "renameSync",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_V1_GREEN",
);
console.log(
  "policy_contract_id=" +
  VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT
    .policy_contract_id,
);
console.log("opening_minimum_real_wc_depth_policy_source_ready=true");
console.log("exact_launch_minimum_real_wc_depth_required=true");
console.log("positive_whole_wc_minimum_required=true");
console.log("settled_production_earned_wc_only=true");
console.log("price_acceptance_after_window_close_required=true");
console.log("minimum_depth_failure_action=hold_opening_price_acceptance");
console.log("production_minimum_real_wc_value_hardcoded=false");
console.log("runtime_enforcement_verified=false");
console.log("live_depth_observation_verified=false");
console.log("ledger_persistence_verified=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
