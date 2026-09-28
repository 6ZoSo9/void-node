#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  wcVoidOpeningCommitmentIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";

import {
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1,
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_V1,
  VOID_WC_VOID_OPENING_WC_PROVENANCE_SCHEMA_V1,
  verifyWcVoidOpeningNonproductionExclusionV1,
} from "../tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs";

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

function provenance(
  commitmentValue,
  {
    sourceClass = "production_earned_wc",
    receiptId = hash("f"),
    included = true,
  } = {},
) {
  return {
    schema: VOID_WC_VOID_OPENING_WC_PROVENANCE_SCHEMA_V1,
    coupled_launch_id: launchId,
    commitment_id: commitmentValue.commitment_id,
    participant_id: commitmentValue.participant_id,
    account: commitmentValue.account,
    wc_units: commitmentValue.wc_units,
    source_class: sourceClass,
    earning_receipt_id: receiptId,
    price_formation_included: included,
  };
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

const alpha = commitment("1", "wc-opening-alpha", "250");
const beta = commitment("2", "wc-opening-beta", "750");
const alphaProvenance = provenance(alpha, { receiptId: hash("b") });
const betaProvenance = provenance(beta, { receiptId: hash("c") });

assert.equal(
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1.policy_id,
  "sha256:9cc4c2486e5571e6a80c4fa4d2caf8f0ac1d0d8736d27599814f859412a85d6d",
);
assert.equal(
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1
    .allowed_price_forming_source_class,
  "production_earned_wc",
);
assert.deepEqual(
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1
    .excluded_source_classes,
  [
    "canary_wc",
    "development_wc",
    "operator_generated_wc",
    "synthetic_fixture_wc",
    "test_wc",
    "unknown_wc",
  ],
);
assert.equal(
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1
    .participant_eligibility_decided,
  false,
);
assert.equal(
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1
    .concentration_policy_decided,
  false,
);
assert.equal(
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1
    .minimum_depth_policy_decided,
  false,
);
assert.equal(
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1
    .runtime_or_launch_evidence,
  false,
);

const verified = verifyWcVoidOpeningNonproductionExclusionV1(
  launchId,
  [alpha, beta],
  [betaProvenance, alphaProvenance],
);
assert.equal(
  verified.marker,
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_V1,
);
assert.equal(
  verified.policy_id,
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1.policy_id,
);
assert.equal(verified.commitment_count, 2);
assert.equal(verified.provenance_count, 2);
assert.equal(verified.production_price_forming_commitment_count, 2);
assert.equal(verified.excluded_commitment_count, 0);
assert.equal(verified.exact_commitment_provenance_bijection, true);
assert.equal(verified.production_earning_receipt_ids_required, true);
assert.equal(verified.nonproduction_wc_exclusion_verified, true);
assert.equal(verified.participant_source_provenance_bound, true);
assert.equal(
  verified.participant_provenance_and_eligibility_verified,
  false,
);
assert.equal(verified.concentration_policy_ready, false);
assert.equal(verified.minimum_depth_policy_ready, false);
assert.equal(verified.runtime_or_launch_evidence, false);
assert.equal(verified.ledger_write_performed, false);
assert.equal(verified.wc_balance_mutation_performed, false);

for (const sourceClass of
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1
    .excluded_source_classes) {
  const bad = provenance(alpha, {
    sourceClass,
    receiptId: null,
    included: false,
  });
  rejects(
    () => verifyWcVoidOpeningNonproductionExclusionV1(
      launchId,
      [alpha],
      [bad],
    ),
    "NONPRODUCTION_WC_IN_PRICE_FORMING_COHORT",
  );
}

{
  const bad = provenance(alpha, {
    sourceClass: "mystery_wc",
    receiptId: null,
    included: false,
  });
  rejects(
    () => verifyWcVoidOpeningNonproductionExclusionV1(
      launchId,
      [alpha],
      [bad],
    ),
    "INVALID_WC_VOID_OPENING_WC_SOURCE_CLASS",
  );
}

{
  const bad = provenance(alpha, { receiptId: null });
  rejects(
    () => verifyWcVoidOpeningNonproductionExclusionV1(
      launchId,
      [alpha],
      [bad],
    ),
    "INVALID_WC_VOID_OPENING_PRODUCTION_EARNING_RECEIPT_ID",
  );
}

{
  const bad = provenance(alpha, { included: false });
  rejects(
    () => verifyWcVoidOpeningNonproductionExclusionV1(
      launchId,
      [alpha],
      [bad],
    ),
    "PRODUCTION_WC_PRICE_FORMATION_EXCLUSION_MISMATCH",
  );
}

{
  const bad = provenance(alpha);
  bad.account = "wc-opening-other";
  rejects(
    () => verifyWcVoidOpeningNonproductionExclusionV1(
      launchId,
      [alpha],
      [bad],
    ),
    "WC_VOID_OPENING_PROVENANCE_COMMITMENT_MISMATCH",
  );
}

{
  rejects(
    () => verifyWcVoidOpeningNonproductionExclusionV1(
      launchId,
      [alpha, beta],
      [alphaProvenance],
    ),
    "WC_VOID_OPENING_PROVENANCE_COUNT_MISMATCH",
  );
}

{
  rejects(
    () => verifyWcVoidOpeningNonproductionExclusionV1(
      launchId,
      [alpha, beta],
      [alphaProvenance, alphaProvenance],
    ),
    "DUPLICATE_WC_VOID_OPENING_PROVENANCE_COMMITMENT",
  );
}

{
  let getterCalled = false;
  const bad = provenance(alpha);
  Object.defineProperty(bad, "source_class", {
    enumerable: true,
    get() {
      getterCalled = true;
      return "production_earned_wc";
    },
  });
  rejects(
    () => verifyWcVoidOpeningNonproductionExclusionV1(
      launchId,
      [alpha],
      [bad],
    ),
    "INVALID_WC_VOID_OPENING_PROVENANCE_RECORD",
  );
  assert.equal(getterCalled, false);
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_AUTHORITY_V1,
)) {
  if (
    [
      "source_only",
      "explicit_input_only",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs",
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

console.log("VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_V1_GREEN");
console.log(
  "policy_id=" +
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1.policy_id,
);
console.log("allowed_price_forming_source_class=production_earned_wc");
console.log(
  "excluded_source_classes=" +
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1
    .excluded_source_classes.join(","),
);
console.log("nonproduction_wc_exclusion_policy_ready=true");
console.log("participant_provenance_and_eligibility_ready=false");
console.log("opening_concentration_and_sybil_limits_ready=false");
console.log("opening_minimum_real_wc_depth_policy_ready=false");
console.log("runtime_or_launch_evidence=false");
console.log("ledger_write=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
