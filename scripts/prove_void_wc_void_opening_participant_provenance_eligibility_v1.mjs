#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  wcVoidOpeningCommitmentIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";

import {
  VOID_WC_VOID_OPENING_WC_PROVENANCE_SCHEMA_V1,
} from "../tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs";

import {
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1,
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_SCHEMA_V1,
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_V1,
  verifyWcVoidOpeningParticipantProvenanceEligibilityV1,
  wcVoidOpeningParticipantIdV1,
} from "../tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs";

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

function sourceProvenance(commitmentValue, receiptShaDigit) {
  return {
    schema: VOID_WC_VOID_OPENING_WC_PROVENANCE_SCHEMA_V1,
    coupled_launch_id: launchId,
    commitment_id: commitmentValue.commitment_id,
    participant_id: commitmentValue.participant_id,
    account: commitmentValue.account,
    wc_units: commitmentValue.wc_units,
    source_class: "production_earned_wc",
    earning_receipt_id: "sha256:" + hex64(receiptShaDigit),
    price_formation_included: true,
  };
}

function eligibility(
  commitmentValue,
  identityValue,
  receiptDigit,
  {
    validFrom = "2026-09-28T12:00:00.000Z",
    validUntil = "2026-09-29T12:00:00.000Z",
    revokedAt = null,
    admissionAt = "2026-09-28T13:00:00.000Z",
    eligible = true,
  } = {},
) {
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
    binding_registry_id: "voidapwcbr1_" + hex64("d"),
    binding_registry_sha256: hex64("e"),
    binding_status: "active",
    binding_valid_from: validFrom,
    binding_valid_until: validUntil,
    binding_revoked_at: revokedAt,
    admission_at: admissionAt,
    earning_adapter_receipt_id: "voidapwear1_" + hex64(receiptDigit),
    earning_adapter_receipt_sha256: hex64(receiptDigit),
    earning_receipt_agent_id: identityValue.agentId,
    earning_receipt_credential_id: identityValue.credentialId,
    earning_receipt_binding_id: identityValue.bindingId,
    earning_receipt_account: commitmentValue.account,
    earning_receipt_canonical_redeemable: true,
    eligible,
  };
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

const alphaIdentity = identity("1", "wc-opening-alpha");
const betaIdentity = identity("2", "wc-opening-beta");
const alpha = commitment(alphaIdentity, "wc-opening-alpha", "250");
const beta = commitment(betaIdentity, "wc-opening-beta", "750");
const alphaSource = sourceProvenance(alpha, "b");
const betaSource = sourceProvenance(beta, "c");
const alphaEligibility = eligibility(alpha, alphaIdentity, "b");
const betaEligibility = eligibility(beta, betaIdentity, "c");

assert.equal(
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1.policy_id,
  "sha256:4237e22d89fca84b5b884a2e2ef7177323f876625540f3ed259d54aabfaee55d",
);
assert.equal(
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1
    .identity_source,
  "active_paid_work_credential_wc_account_binding_v1",
);
assert.equal(
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1
    .earning_source,
  "agent_paid_work_wc_earning_adapter_receipt_v1",
);
assert.equal(
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1
    .price_forming_source_class,
  "production_earned_wc",
);
assert.equal(
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1
    .sybil_policy_decided,
  false,
);
assert.equal(
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1
    .concentration_policy_decided,
  false,
);
assert.equal(
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1
    .minimum_depth_policy_decided,
  false,
);
assert.equal(
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1
    .runtime_or_launch_evidence,
  false,
);

const verified =
  verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
    launchId,
    [alpha, beta],
    [betaSource, alphaSource],
    [betaEligibility, alphaEligibility],
  );
assert.equal(
  verified.marker,
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_V1,
);
assert.equal(verified.commitment_count, 2);
assert.equal(verified.eligible_participant_count, 2);
assert.equal(verified.production_wc_exclusion_verified, true);
assert.equal(verified.active_credential_wc_account_binding_required, true);
assert.equal(verified.production_earning_receipt_required, true);
assert.equal(verified.earning_receipt_identity_match_verified, true);
assert.equal(verified.exact_commitment_eligibility_bijection, true);
assert.equal(verified.participant_provenance_and_eligibility_verified, true);
assert.equal(verified.sybil_policy_ready, false);
assert.equal(verified.concentration_policy_ready, false);
assert.equal(verified.minimum_depth_policy_ready, false);
assert.equal(verified.runtime_or_launch_evidence, false);
assert.equal(verified.wc_ledger_write_performed, false);

{
  const badIdentity = {
    ...alphaIdentity,
    participantId: hash("9"),
  };
  const badCommitment = commitment(
    badIdentity,
    "wc-opening-alpha",
    "250",
  );
  const badSource = sourceProvenance(badCommitment, "b");
  const badEligibility = eligibility(
    badCommitment,
    alphaIdentity,
    "b",
  );
  rejects(
    () => verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      launchId,
      [badCommitment],
      [badSource],
      [badEligibility],
    ),
    "WC_VOID_OPENING_PARTICIPANT_IDENTITY_MISMATCH",
  );
}

{
  const bad = eligibility(alpha, alphaIdentity, "b", {
    validUntil: "2026-09-28T12:30:00.000Z",
  });
  rejects(
    () => verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      launchId,
      [alpha],
      [alphaSource],
      [bad],
    ),
    "WC_VOID_OPENING_BINDING_OUTSIDE_VALIDITY",
  );
}

{
  const bad = eligibility(alpha, alphaIdentity, "b", {
    revokedAt: "2026-09-28T12:30:00.000Z",
  });
  rejects(
    () => verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      launchId,
      [alpha],
      [alphaSource],
      [bad],
    ),
    "WC_VOID_OPENING_BINDING_NOT_ACTIVE",
  );
}

{
  const bad = eligibility(alpha, alphaIdentity, "b");
  bad.earning_receipt_agent_id = "void.agent.other";
  rejects(
    () => verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      launchId,
      [alpha],
      [alphaSource],
      [bad],
    ),
    "WC_VOID_OPENING_EARNING_RECEIPT_IDENTITY_MISMATCH",
  );
}

{
  const bad = eligibility(alpha, alphaIdentity, "b");
  bad.earning_adapter_receipt_sha256 = hex64("f");
  rejects(
    () => verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      launchId,
      [alpha],
      [alphaSource],
      [bad],
    ),
    "WC_VOID_OPENING_ELIGIBILITY_EARNING_RECEIPT_MISMATCH",
  );
}

{
  const bad = eligibility(alpha, alphaIdentity, "b", { eligible: false });
  rejects(
    () => verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      launchId,
      [alpha],
      [alphaSource],
      [bad],
    ),
    "WC_VOID_OPENING_PARTICIPANT_NOT_ELIGIBLE",
  );
}

{
  rejects(
    () => verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      launchId,
      [alpha, beta],
      [alphaSource, betaSource],
      [alphaEligibility],
    ),
    "WC_VOID_OPENING_ELIGIBILITY_COUNT_MISMATCH",
  );
}

{
  rejects(
    () => verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      launchId,
      [alpha, beta],
      [alphaSource, betaSource],
      [alphaEligibility, alphaEligibility],
    ),
    "DUPLICATE_WC_VOID_OPENING_ELIGIBILITY_COMMITMENT",
  );
}

{
  let getterCalled = false;
  const bad = eligibility(alpha, alphaIdentity, "b");
  Object.defineProperty(bad, "binding_status", {
    enumerable: true,
    get() {
      getterCalled = true;
      return "active";
    },
  });
  rejects(
    () => verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      launchId,
      [alpha],
      [alphaSource],
      [bad],
    ),
    "INVALID_WC_VOID_OPENING_ELIGIBILITY_RECORD",
  );
  assert.equal(getterCalled, false);
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_AUTHORITY_V1,
)) {
  if (["source_only", "explicit_input_only"].includes(key)) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs",
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
  "VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_V1_GREEN",
);
console.log(
  "policy_id=" +
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1.policy_id,
);
console.log("identity_source=active_paid_work_credential_wc_account_binding_v1");
console.log("earning_source=agent_paid_work_wc_earning_adapter_receipt_v1");
console.log("price_forming_source_class=production_earned_wc");
console.log("opening_participant_provenance_and_eligibility_ready=true");
console.log("opening_concentration_and_sybil_limits_ready=false");
console.log("opening_minimum_real_wc_depth_policy_ready=false");
console.log("runtime_or_launch_evidence=false");
console.log("wc_ledger_write=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
