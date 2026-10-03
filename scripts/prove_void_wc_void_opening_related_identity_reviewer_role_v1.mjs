#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  keccak256,
  toUtf8Bytes,
} from "ethers";

import {
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_ROLE_ID_V1,
} from "../tools/void-wc-void-launch-controller-control-requalification-v1.mjs";

import {
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ADDRESS_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_DECISION_ID_V1,
  buildWcVoidOpeningRelatedIdentityReviewerRoleV1,
  reviewerRoleDecisionIdV1,
  verifyWcVoidOpeningRelatedIdentityReviewerRoleV1,
} from "../tools/void-wc-void-opening-related-identity-reviewer-role-v1.mjs";

const artifactPath =
  "ops/mainnet0/wc-void-opening-related-identity-reviewer-role-v1.json";
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const decision = buildWcVoidOpeningRelatedIdentityReviewerRoleV1();

assert.equal(
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ADDRESS_V1,
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e",
);
assert.equal(
  decision.decision_id,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_DECISION_ID_V1,
);
assert.equal(
  decision.decision_id,
  "voidwcrirr1_b0631ba09dc1009adb99f7b66a52f8e77a9636c9d611c27e67c5784f5d7cde22",
);
assert.equal(
  decision.launch_controller_role_label,
  "VOID_WC_VOID_MARKET_VAULT_LAUNCH_CONTROLLER_V1",
);
assert.equal(
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_ROLE_ID_V1,
  keccak256(
    toUtf8Bytes("VOID_WC_VOID_MARKET_VAULT_LAUNCH_CONTROLLER_V1"),
  ),
);

assert.deepEqual(decision.attestation_scope, [
  "manifest_id",
  "coupled_launch_id",
  "concentration_policy_id",
  "opening_window_id",
  "eligible_cohort_root",
  "cluster_assignment_root",
  "evidence_manifest_root",
]);

assert.equal(decision.reviewer_role_selected, true);
assert.equal(decision.fresh_control_evidence_required, true);
assert.equal(decision.review_attestation_verified, false);
assert.equal(decision.related_identity_truth_verified, false);
assert.equal(decision.opening_concentration_and_sybil_limits_ready, false);
assert.equal(decision.opening_price_acceptance_allowed, false);

assert.equal(
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_AUTHORITY_V1
    .related_identity_manifest_review_attestation_role,
  true,
);
for (const key of [
  "manifest_signing_performed",
  "private_key_access",
  "credential_access",
  "wallet_or_signer_access",
  "wc_ledger_write",
  "wc_balance_mutation",
  "runtime_or_service_mutation",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "deployment_authorized",
  "inventory_funding_authorized",
  "market_activation",
  "public_presale_activation",
  "liquidity_movement",
  "treasury_movement",
  "funds_movement",
]) {
  assert.equal(
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_AUTHORITY_V1[key],
    false,
    key,
  );
}

assert.equal(
  verifyWcVoidOpeningRelatedIdentityReviewerRoleV1(artifact),
  true,
);

const changedAddress = {
  ...artifact,
  reviewer_address: "0x1111111111111111111111111111111111111111",
};
assert.notEqual(
  reviewerRoleDecisionIdV1(changedAddress),
  artifact.decision_id,
);
assert.throws(
  () => verifyWcVoidOpeningRelatedIdentityReviewerRoleV1(changedAddress),
  /reviewer_role_decision_mismatch/u,
);

const changedScope = {
  ...artifact,
  attestation_scope: artifact.attestation_scope.slice(0, -1),
};
assert.notEqual(
  reviewerRoleDecisionIdV1(changedScope),
  artifact.decision_id,
);
assert.throws(
  () => verifyWcVoidOpeningRelatedIdentityReviewerRoleV1(changedScope),
  /reviewer_role_decision_mismatch/u,
);

console.log(
  "VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ROLE_V1_PROOF_GREEN",
);
console.log("reviewer_role_selected=true");
console.log(
  "reviewer_address=0x2f1e0005e865b772b268bd8c797bf3eaa901d97e",
);
console.log(
  "decision_id=" +
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_DECISION_ID_V1,
);
console.log("fresh_control_evidence_required=true");
console.log("review_attestation_verified=false");
console.log("related_identity_truth_verified=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
