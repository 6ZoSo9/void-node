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
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_SCHEMA_V1,
  wcVoidOpeningParticipantIdV1,
} from "../tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs";

import {
  VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1,
  wcVoidOpeningWindowIdV1,
} from "../tools/void-wc-void-opening-window-policy-v1.mjs";

import {
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT,
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT_V1,
} from "../tools/void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs";

import {
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_SCHEMA_V1,
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_RECORD_SCHEMA_V1,
  verifyWcVoidOpeningConcentrationSybilPolicyV1,
  wcVoidOpeningConcentrationSybilPolicyIdV1,
} from "../tools/void-wc-void-opening-concentration-sybil-policy-v1.mjs";

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const hex64 = (digit) => String(digit).repeat(64);
const launchId = hash("a");

function identity(digit, account) {
  const agentId = `void.agent.opening-${digit}`;
  const credentialId = "voidapwc1_" + hex64(digit);
  const bindingId = "voidapwcb1_" + hex64(digit);
  const participantId = wcVoidOpeningParticipantIdV1({
    agent_id: agentId,
    credential_id: credentialId,
    binding_id: bindingId,
    destination_wc_account: account,
  });
  return { agentId, credentialId, bindingId, participantId };
}

function commitment(identityValue, account, wcUnits) {
  const value = {
    schema: VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
    commitment_id: hash("0"),
    coupled_launch_id: launchId,
    participant_id: identityValue.participantId,
    account,
    wc_units: String(wcUnits),
  };
  value.commitment_id = wcVoidOpeningCommitmentIdV1(value);
  return value;
}

function sourceProvenance(commitmentValue, receiptDigit) {
  return {
    schema: VOID_WC_VOID_OPENING_WC_PROVENANCE_SCHEMA_V1,
    coupled_launch_id: launchId,
    commitment_id: commitmentValue.commitment_id,
    participant_id: commitmentValue.participant_id,
    account: commitmentValue.account,
    wc_units: commitmentValue.wc_units,
    source_class: "production_earned_wc",
    earning_receipt_id: "sha256:" + hex64(receiptDigit),
    price_formation_included: true,
  };
}

function eligibility(commitmentValue, identityValue, receiptDigit) {
  return {
    schema:
      VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_SCHEMA_V1,
    coupled_launch_id: launchId,
    commitment_id: commitmentValue.commitment_id,
    participant_id: commitmentValue.participant_id,
    account: commitmentValue.account,
    wc_units: commitmentValue.wc_units,
    agent_id: identityValue.agentId,
    credential_id: identityValue.credentialId,
    binding_id: identityValue.bindingId,
    credential_registry_id: "voidapwcr1_" + hex64("d"),
    credential_registry_sha256: hex64("e"),
    credential_scope: "agent_paid_work_submit",
    credential_issued_at: "2026-09-28T11:00:00.000Z",
    credential_expires_at: "2026-09-29T11:00:00.000Z",
    credential_revoked_at: null,
    binding_registry_id: "voidapwcbr1_" + hex64("f"),
    binding_registry_sha256: hex64("8"),
    binding_status: "active",
    binding_valid_from: "2026-09-28T12:00:00.000Z",
    binding_valid_until: "2026-09-29T12:00:00.000Z",
    binding_revoked_at: null,
    admission_at: "2026-09-28T13:00:00.000Z",
    earning_adapter_receipt_id: "voidapwear1_" + hex64(receiptDigit),
    earning_adapter_receipt_sha256: hex64(receiptDigit),
    earning_receipt_agent_id: identityValue.agentId,
    earning_receipt_credential_id: identityValue.credentialId,
    earning_receipt_binding_id: identityValue.bindingId,
    earning_receipt_account: commitmentValue.account,
    earning_receipt_canonical_redeemable: true,
    eligible: true,
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
    policy_committed_at_ms: 1000,
    opens_at_ms: 2000,
    closes_at_ms: 3000,
  };
  value.window_id = wcVoidOpeningWindowIdV1(value);
  return value;
}

function policy(window, {
  participantCap = "5000",
  clusterCap = "6000",
} = {}) {
  const value = {
    schema: VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_SCHEMA_V1,
    policy_id: hash("0"),
    coupled_launch_id: launchId,
    policy_generation: "1",
    policy_committed_at_ms: 1500,
    opening_window_id: window.window_id,
    max_participant_share_bps: participantCap,
    max_related_identity_share_bps: clusterCap,
    failure_action: "hold_opening_price_acceptance",
  };
  value.policy_id = wcVoidOpeningConcentrationSybilPolicyIdV1(value);
  return value;
}

function related(commitmentValue, clusterDigit, evidenceDigit) {
  return {
    schema: VOID_WC_VOID_OPENING_RELATED_IDENTITY_RECORD_SCHEMA_V1,
    coupled_launch_id: launchId,
    commitment_id: commitmentValue.commitment_id,
    participant_id: commitmentValue.participant_id,
    cluster_id: hash(clusterDigit),
    cluster_evidence_id: hash(evidenceDigit),
    cluster_assignment_method:
      "content_addressed_related_identity_evidence_v1",
  };
}

function fixture(options = {}) {
  const window = openingWindow();
  const alphaIdentity = identity("1", "wc-opening-alpha");
  const betaIdentity = identity("2", "wc-opening-beta");
  const gammaIdentity = identity("3", "wc-opening-gamma");

  const alpha = commitment(alphaIdentity, "wc-opening-alpha", "300");
  const beta = commitment(betaIdentity, "wc-opening-beta", "300");
  const gamma = commitment(gammaIdentity, "wc-opening-gamma", "400");

  const commitments = [alpha, beta, gamma];
  return {
    policy: policy(window, options),
    opening_window: window,
    commitments,
    production_wc_provenance_records: [
      sourceProvenance(alpha, "4"),
      sourceProvenance(beta, "5"),
      sourceProvenance(gamma, "6"),
    ],
    eligibility_records: [
      eligibility(alpha, alphaIdentity, "4"),
      eligibility(beta, betaIdentity, "5"),
      eligibility(gamma, gammaIdentity, "6"),
    ],
    ledger_debits: [
      debit(alpha, 300, 2501),
      debit(beta, 300, 2502),
      debit(gamma, 400, 2503),
    ],
    related_identity_records: [
      related(alpha, "7", "a"),
      related(beta, "7", "b"),
      related(gamma, "8", "c"),
    ],
    observed_at_ms: 4000,
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
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT_V1,
  "VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT_V1",
);
assert.equal(
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT
    .policy_contract_id,
  "sha256:5711c6bb0097be076075ebce2d9f83daafa6d42e87bc581c6e347ec38d8d83a9",
);
assert.equal(
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT
    .exact_launch_cap_values_required,
  true,
);
assert.equal(
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT
    .independent_related_identity_truth_verifier_required,
  true,
);
assert.equal(
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT
    .production_cap_values_hardcoded,
  false,
);
assert.equal(
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT
    .related_identity_truth_verified,
  false,
);

const good = verifyWcVoidOpeningConcentrationSybilPolicyV1(fixture());
assert.equal(
  good.marker,
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_V1,
);
assert.equal(good.window_phase, "closed");
assert.equal(good.total_settled_wc_units, "1000");
assert.equal(good.max_participant_share_bps, "5000");
assert.equal(good.max_related_identity_share_bps, "6000");
assert.equal(good.participant_caps_met, true);
assert.equal(good.related_identity_caps_met, true);
assert.equal(good.arithmetic_caps_met, true);
assert.equal(good.participant_share_results.length, 3);
assert.equal(good.related_identity_cluster_results.length, 2);
assert.equal(good.exact_eligible_participant_cluster_bijection, true);
assert.equal(good.opening_concentration_arithmetic_source_ready, true);
assert.equal(good.sybil_cluster_arithmetic_source_ready, true);
assert.equal(good.related_identity_truth_verifier_required, true);
assert.equal(good.related_identity_truth_verified, false);
assert.equal(good.opening_concentration_and_sybil_limits_ready, false);
assert.equal(good.opening_price_acceptance_allowed, false);
assert.equal(
  good.opening_price_acceptance_hold,
  "related_identity_truth_verifier_required",
);
assert.equal(good.production_cap_values_hardcoded, false);
assert.equal(good.runtime_or_launch_evidence, false);
assert.equal(good.ledger_persistence_verified, false);
assert.equal(good.wall_clock_read_performed, false);
assert.equal(good.ledger_write_performed, false);
assert.equal(good.wc_balance_mutation_performed, false);
assert.equal(good.market_activation_authority, false);
assert.equal(good.public_presale_activation_authority, false);
assert.equal(good.funds_movement_authority, false);

{
  const result = verifyWcVoidOpeningConcentrationSybilPolicyV1(
    fixture({ participantCap: "3500", clusterCap: "6000" }),
  );
  assert.equal(result.participant_caps_met, false);
  assert.equal(result.related_identity_caps_met, true);
  assert.equal(result.arithmetic_caps_met, false);
  assert.equal(
    result.opening_price_acceptance_hold,
    "hold_opening_price_acceptance",
  );
}

{
  const result = verifyWcVoidOpeningConcentrationSybilPolicyV1(
    fixture({ participantCap: "5000", clusterCap: "5500" }),
  );
  assert.equal(result.participant_caps_met, true);
  assert.equal(result.related_identity_caps_met, false);
  assert.equal(result.arithmetic_caps_met, false);
  assert.equal(
    result.opening_price_acceptance_hold,
    "hold_opening_price_acceptance",
  );
}

{
  const value = fixture();
  value.observed_at_ms = 2500;
  const result = verifyWcVoidOpeningConcentrationSybilPolicyV1(value);
  assert.equal(result.window_phase, "open");
  assert.equal(result.opening_price_acceptance_allowed, false);
  assert.equal(result.opening_price_acceptance_hold, "opening_window_not_closed");
}

{
  const value = fixture();
  value.related_identity_records[0].participant_id = hash("9");
  rejects(
    () => verifyWcVoidOpeningConcentrationSybilPolicyV1(value),
    "RELATED_IDENTITY_PARTICIPANT_MISMATCH",
  );
}

{
  const value = fixture();
  value.related_identity_records.pop();
  rejects(
    () => verifyWcVoidOpeningConcentrationSybilPolicyV1(value),
    "WC_VOID_RELATED_IDENTITY_COUNT_MISMATCH",
  );
}

{
  const value = fixture();
  value.related_identity_records[1] =
    structuredClone(value.related_identity_records[0]);
  rejects(
    () => verifyWcVoidOpeningConcentrationSybilPolicyV1(value),
    "DUPLICATE_RELATED_IDENTITY_COMMITMENT",
  );
}

{
  const value = fixture();
  value.related_identity_records[0].cluster_assignment_method = "self_declared";
  rejects(
    () => verifyWcVoidOpeningConcentrationSybilPolicyV1(value),
    "INVALID_RELATED_IDENTITY_ASSIGNMENT_METHOD",
  );
}

{
  const value = fixture();
  value.policy.max_related_identity_share_bps = "4000";
  value.policy.policy_id =
    wcVoidOpeningConcentrationSybilPolicyIdV1(value.policy);
  rejects(
    () => verifyWcVoidOpeningConcentrationSybilPolicyV1(value),
    "WC_VOID_RELATED_IDENTITY_CAP_BELOW_PARTICIPANT_CAP",
  );
}

{
  const value = fixture();
  value.policy.max_participant_share_bps = "10000";
  value.policy.policy_id = hash("0");
  rejects(
    () => verifyWcVoidOpeningConcentrationSybilPolicyV1(value),
    "INVALID_WC_VOID_MAX_PARTICIPANT_SHARE_BPS",
  );
}

{
  const value = fixture();
  value.policy.policy_committed_at_ms = value.opening_window.opens_at_ms;
  value.policy.policy_id =
    wcVoidOpeningConcentrationSybilPolicyIdV1(value.policy);
  rejects(
    () => verifyWcVoidOpeningConcentrationSybilPolicyV1(value),
    "WC_VOID_CONCENTRATION_POLICY_NOT_COMMITTED_BEFORE_OPEN",
  );
}

{
  const value = fixture();
  value.policy.policy_id = hash("f");
  rejects(
    () => verifyWcVoidOpeningConcentrationSybilPolicyV1(value),
    "WC_VOID_CONCENTRATION_POLICY_DIGEST_MISMATCH",
  );
}

{
  let getterCalled = false;
  const value = fixture();
  Object.defineProperty(value.related_identity_records[0], "cluster_id", {
    enumerable: true,
    get() {
      getterCalled = true;
      return hash("7");
    },
  });
  rejects(
    () => verifyWcVoidOpeningConcentrationSybilPolicyV1(value),
    "INVALID_WC_VOID_RELATED_IDENTITY_RECORD",
  );
  assert.equal(getterCalled, false);
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_AUTHORITY_V1,
)) {
  if (key === "source_only" || key === "explicit_input_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-concentration-sybil-policy-v1.mjs",
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
assert.match(source, /related_identity_truth_verified: false/);
assert.match(
  source,
  /opening_concentration_and_sybil_limits_ready: false/,
);
assert.match(source, /amount \* 10_000n <= total/);

console.log("VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_V1_GREEN");
console.log(
  "policy_contract_id=" +
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT
    .policy_contract_id,
);
console.log("exact_launch_cap_values_required=true");
console.log("production_cap_values_hardcoded=false");
console.log("participant_concentration_arithmetic_source_ready=true");
console.log("related_identity_cluster_arithmetic_source_ready=true");
console.log("related_identity_truth_verifier_required=true");
console.log("related_identity_truth_verified=false");
console.log("opening_concentration_and_sybil_limits_ready=false");
console.log("runtime_or_launch_evidence=false");
console.log("ledger_write=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
