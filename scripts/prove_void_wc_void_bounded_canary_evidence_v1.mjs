#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EXPECTED as MARKET_VAULT_COMPILED_IDENTITY_EXPECTED,
} from "../tools/void-wc-void-market-vault-compiled-identity-current-v2.mjs";
import {
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";
import {
  VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_AUTHORITY_V1,
  VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_V1,
  VOID_WC_VOID_BOUNDED_CANARY_POLICY_V1,
  verifyWcVoidBoundedCanaryEvidenceV1,
  wcVoidBoundedCanaryEvidenceIdV1,
  wcVoidBoundedCanaryPolicyIdV1,
} from "../tools/void-wc-void-bounded-canary-evidence-v1.mjs";

const launchId =
  "sha256:" + "a".repeat(64);
const vault =
  "0x1111111111111111111111111111111111111111";
const runtimeSha = "b".repeat(64);

function policyFixture() {
  const value = {
    marker: VOID_WC_VOID_BOUNDED_CANARY_POLICY_V1,
    version: 1,
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    coupled_launch_id: launchId,
    market_vault_address: vault,
    market_vault_runtime_code_sha256: runtimeSha,
    market_vault_compiled_identity_id:
      MARKET_VAULT_COMPILED_IDENTITY_EXPECTED.identity_id,
    wc_settlement_adapter_id:
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    max_participants: "2",
    max_settled_wc_units: "100",
    max_delivered_void_atoms:
      "1000000000000000000000",
    min_finality_confirmations: "3",
    max_evidence_age_seconds: "600",
    requires_live_runtime_evidence: true,
    requires_inventory_lock: true,
    requires_wc_ledger_persistence: true,
    requires_quote_reserve_custody: true,
    requires_claim_binding_persistence: true,
    requires_durable_replay_persistence: true,
    requires_participant_control_finality: true,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    policy_id: "voidwcbcp1_" + "0".repeat(64),
  };
  value.policy_id = wcVoidBoundedCanaryPolicyIdV1(value);
  return value;
}

function evidenceFixture(policy) {
  const value = {
    marker: VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_V1,
    version: 1,
    status: "BOUNDED_CANARY_EVIDENCE_CANDIDATE",
    policy_id: policy.policy_id,
    coupled_launch_id: launchId,
    chain_id: 2050,
    execution_epoch: 2,
    pair: "WC_VOID",
    market_vault_address: vault,
    market_vault_runtime_code_sha256: runtimeSha,
    market_vault_compiled_identity_id:
      MARKET_VAULT_COMPILED_IDENTITY_EXPECTED.identity_id,
    market_vault_runtime_verification_evidence_id:
      "sha256:" + "5".repeat(64),
    inventory_lock_evidence_id:
      "sha256:" + "6".repeat(64),
    wc_settlement_adapter_id:
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    wc_ledger_custody_evidence_id:
      "sha256:" + "7".repeat(64),
    participant_count: "1",
    settled_wc_units: "10",
    delivered_void_atoms:
      "100000000000000000000",
    inventory_lock_verified: true,
    wc_ledger_persistence_verified: true,
    quote_reserve_custody_verified: true,
    opening_claim_binding_id:
      "sha256:" + "1".repeat(64),
    opening_claim_binding_persistence_evidence_id:
      "sha256:" + "8".repeat(64),
    opening_claim_binding_persisted: true,
    replay_capsule_id:
      "voidwcrp1_" + "2".repeat(64),
    replay_terminal_capsule_sha256:
      "3".repeat(64),
    durable_replay_state_persistence_verified: true,
    participant_control_evidence_id:
      "sha256:" + "4".repeat(64),
    participant_postpurchase_voidtoken_control_verified: true,
    observed_finality_confirmations: "6",
    runtime_or_launch_evidence: true,
    observed_at_utc: "2030-01-01T00:00:00Z",
    valid_until_utc: "2030-01-01T00:05:00Z",
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    evidence_id: "voidwcbce1_" + "0".repeat(64),
  };
  value.evidence_id = wcVoidBoundedCanaryEvidenceIdV1(value);
  return value;
}

function verify(policy, evidence, overrides = {}) {
  return verifyWcVoidBoundedCanaryEvidenceV1({
    expected_policy_id:
      overrides.expected_policy_id ?? policy.policy_id,
    evaluation_time_utc:
      overrides.evaluation_time_utc ??
      "2030-01-01T00:03:00Z",
    policy,
    evidence,
  });
}

function mutatedEvidence(policy, evidence, mutate) {
  const value = structuredClone(evidence);
  mutate(value);
  value.evidence_id = wcVoidBoundedCanaryEvidenceIdV1(value);
  return value;
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) =>
      error instanceof Error && error.message === code,
    code,
  );
}

const policy = policyFixture();
const evidence = evidenceFixture(policy);
assert.match(policy.policy_id, /^voidwcbcp1_[0-9a-f]{64}$/);
assert.match(evidence.evidence_id, /^voidwcbce1_[0-9a-f]{64}$/);

const candidateDecision = verify(policy, evidence);
assert.equal(candidateDecision.ok, true);
assert.equal(
  candidateDecision.status,
  "EVIDENCE_CANDIDATE_VALID_UPSTREAM_PROOFS_UNVERIFIED",
);
assert.equal(candidateDecision.policy_id, policy.policy_id);
assert.equal(candidateDecision.evidence_id, evidence.evidence_id);
assert.equal(candidateDecision.coupled_launch_id, launchId);
assert.equal(candidateDecision.chain_id, 2050);
assert.equal(candidateDecision.execution_epoch, 2);
assert.equal(candidateDecision.pair, "WC_VOID");
assert.equal(candidateDecision.market_vault_address, vault);
assert.equal(
  candidateDecision.market_vault_compiled_identity_id,
  MARKET_VAULT_COMPILED_IDENTITY_EXPECTED.identity_id,
);
assert.equal(
  candidateDecision.wc_settlement_adapter_id,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
);
assert.equal(
  candidateDecision.market_vault_runtime_verification_evidence_id,
  "sha256:" + "5".repeat(64),
);
assert.equal(
  candidateDecision.inventory_lock_evidence_id,
  "sha256:" + "6".repeat(64),
);
assert.equal(
  candidateDecision.wc_ledger_custody_evidence_id,
  "sha256:" + "7".repeat(64),
);
assert.equal(
  candidateDecision.opening_claim_binding_persistence_evidence_id,
  "sha256:" + "8".repeat(64),
);
assert.equal(candidateDecision.participant_count, "1");
assert.equal(candidateDecision.settled_wc_units, "10");
assert.equal(
  candidateDecision.delivered_void_atoms,
  "100000000000000000000",
);
assert.equal(candidateDecision.observed_finality_confirmations, "6");
assert.equal(candidateDecision.declared_inventory_lock_verified, true);
assert.equal(
  candidateDecision.declared_wc_ledger_persistence_verified,
  true,
);
assert.equal(
  candidateDecision.declared_quote_reserve_custody_verified,
  true,
);
assert.equal(
  candidateDecision.declared_opening_claim_binding_persisted,
  true,
);
assert.equal(
  candidateDecision.declared_durable_replay_state_persistence_verified,
  true,
);
assert.equal(
  candidateDecision
    .declared_participant_postpurchase_voidtoken_control_verified,
  true,
);
assert.equal(candidateDecision.declared_runtime_or_launch_evidence, true);
assert.equal(candidateDecision.upstream_evidence_references_present, true);
assert.equal(
  candidateDecision.upstream_evidence_semantically_verified,
  false,
);
assert.equal(candidateDecision.live_canary_evidence_verified, false);
assert.equal(
  candidateDecision.bounded_canary_evidence_candidate_valid,
  true,
);
assert.equal(candidateDecision.bounded_canary_green, false);
assert.equal(candidateDecision.production_candidate_binding_allowed, false);
assert.equal(candidateDecision.market_activation_authorized, false);
assert.equal(candidateDecision.public_presale_activation_authorized, false);
assert.equal(candidateDecision.funds_movement_authorized, false);

const repeat = verify(
  structuredClone(policy),
  structuredClone(evidence),
);
assert.equal(repeat.evidence_id, candidateDecision.evidence_id);
assert.equal(repeat.bounded_canary_green, false);
assert.equal(repeat.production_candidate_binding_allowed, false);

rejects(
  () => verify(policy, evidence, {
    expected_policy_id:
      "voidwcbcp1_" + "f".repeat(64),
  }),
  "WC_VOID_BOUNDED_CANARY_EXPECTED_POLICY_ID_MISMATCH",
);

{
  const bad = structuredClone(evidence);
  bad.inventory_lock_evidence_id = "not-an-evidence-id";
  bad.evidence_id = wcVoidBoundedCanaryEvidenceIdV1(bad);
  rejects(
    () => verify(policy, bad),
    "WC_VOID_BOUNDED_CANARY_EVIDENCE_REFERENCE_INVALID",
  );
}

{
  const bad = structuredClone(evidence);
  bad.wc_ledger_custody_evidence_id = "sha256:" + "g".repeat(64);
  bad.evidence_id = wcVoidBoundedCanaryEvidenceIdV1(bad);
  rejects(
    () => verify(policy, bad),
    "WC_VOID_BOUNDED_CANARY_EVIDENCE_REFERENCE_INVALID",
  );
}

{
  const bad = structuredClone(evidence);
  bad.opening_claim_binding_persistence_evidence_id = "";
  bad.evidence_id = wcVoidBoundedCanaryEvidenceIdV1(bad);
  rejects(
    () => verify(policy, bad),
    "WC_VOID_BOUNDED_CANARY_EVIDENCE_REFERENCE_INVALID",
  );
}

for (const [label, mutate, code] of [
  [
    "participant bound",
    (value) => {
      value.participant_count = "3";
    },
    "WC_VOID_BOUNDED_CANARY_PARTICIPANT_BOUND_EXCEEDED",
  ],
  [
    "WC bound",
    (value) => {
      value.settled_wc_units = "101";
    },
    "WC_VOID_BOUNDED_CANARY_WC_BOUND_EXCEEDED",
  ],
  [
    "VOID bound",
    (value) => {
      value.delivered_void_atoms =
        "1000000000000000000001";
    },
    "WC_VOID_BOUNDED_CANARY_VOID_BOUND_EXCEEDED",
  ],
  [
    "finality",
    (value) => {
      value.observed_finality_confirmations = "2";
    },
    "WC_VOID_BOUNDED_CANARY_FINALITY_INSUFFICIENT",
  ],
  [
    "ledger persistence",
    (value) => {
      value.wc_ledger_persistence_verified = false;
    },
    "WC_VOID_BOUNDED_CANARY_REQUIRED_EVIDENCE_DECLARATION_MISSING",
  ],
  [
    "quote custody",
    (value) => {
      value.quote_reserve_custody_verified = false;
    },
    "WC_VOID_BOUNDED_CANARY_REQUIRED_EVIDENCE_DECLARATION_MISSING",
  ],
  [
    "replay persistence",
    (value) => {
      value.durable_replay_state_persistence_verified = false;
    },
    "WC_VOID_BOUNDED_CANARY_REQUIRED_EVIDENCE_DECLARATION_MISSING",
  ],
  [
    "participant control",
    (value) => {
      value.participant_postpurchase_voidtoken_control_verified =
        false;
    },
    "WC_VOID_BOUNDED_CANARY_REQUIRED_EVIDENCE_DECLARATION_MISSING",
  ],
  [
    "runtime evidence",
    (value) => {
      value.runtime_or_launch_evidence = false;
    },
    "WC_VOID_BOUNDED_CANARY_REQUIRED_EVIDENCE_DECLARATION_MISSING",
  ],
  [
    "activation authority",
    (value) => {
      value.market_activation_authorized = true;
    },
    "WC_VOID_BOUNDED_CANARY_EVIDENCE_AUTHORITY_MUST_REMAIN_FALSE",
  ],
  [
    "compiled identity",
    (value) => {
      value.market_vault_compiled_identity_id =
        "voidwcvci1_" + "9".repeat(64);
    },
    "WC_VOID_BOUNDED_CANARY_EVIDENCE_DEPLOYMENT_BINDING_MISMATCH",
  ],
]) {
  const bad = mutatedEvidence(policy, evidence, mutate);
  rejects(() => verify(policy, bad), code);
}

rejects(
  () => verify(policy, evidence, {
    evaluation_time_utc: "2030-01-01T00:05:01Z",
  }),
  "WC_VOID_BOUNDED_CANARY_EVIDENCE_NOT_CURRENT",
);

{
  const bad = structuredClone(evidence);
  bad.evidence_id = "voidwcbce1_" + "e".repeat(64);
  rejects(
    () => verify(policy, bad),
    "WC_VOID_BOUNDED_CANARY_EVIDENCE_ID_MISMATCH",
  );
}

{
  const unbounded = structuredClone(policy);
  unbounded.max_delivered_void_atoms =
    "5000000000000000000000000";
  unbounded.policy_id =
    wcVoidBoundedCanaryPolicyIdV1(unbounded);
  rejects(
    () => verifyWcVoidBoundedCanaryEvidenceV1({
      expected_policy_id: unbounded.policy_id,
      evaluation_time_utc: "2030-01-01T00:03:00Z",
      policy: unbounded,
      evidence,
    }),
    "WC_VOID_BOUNDED_CANARY_POLICY_VOID_BOUND_NOT_CANARY",
  );
}

{
  const stalePolicy = structuredClone(policy);
  stalePolicy.max_evidence_age_seconds = "86401";
  stalePolicy.policy_id =
    wcVoidBoundedCanaryPolicyIdV1(stalePolicy);
  rejects(
    () => verifyWcVoidBoundedCanaryEvidenceV1({
      expected_policy_id: stalePolicy.policy_id,
      evaluation_time_utc: "2030-01-01T00:03:00Z",
      policy: stalePolicy,
      evidence,
    }),
    "WC_VOID_BOUNDED_CANARY_POLICY_MAX_AGE_TOO_LARGE",
  );
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_AUTHORITY_V1,
)) {
  if (key === "source_verification_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-bounded-canary-evidence-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "systemctl",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log("VOID_WC_VOID_BOUNDED_CANARY_EVIDENCE_V1_PROOF_GREEN");
console.log("synthetic_fixture_only=true");
console.log("canonical_live_canary_evidence_checked_in=false");
console.log("expected_reviewed_policy_id_required=true");
console.log("deployment_identity_bound=true");
console.log("live_claims_require_content_addressed_evidence_refs=true");
console.log("content_addressed_refs_not_treated_as_live_truth=true");
console.log("freshness_window_bound=true");
console.log("sub_tranche_canary_bound_required=true");
console.log("live_inventory_lock_required=true");
console.log("live_wc_ledger_persistence_required=true");
console.log("live_quote_reserve_custody_required=true");
console.log("claim_binding_persistence_required=true");
console.log("durable_replay_persistence_required=true");
console.log("participant_control_finality_required=true");
console.log("bounded_canary_evidence_candidate_contract_proven=true");
console.log("upstream_evidence_semantically_verified=false");
console.log("live_canary_evidence_verified=false");
console.log("bounded_canary_green=false");
console.log("production_candidate_binding_allowed=false");
console.log("production_candidate_updated=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
