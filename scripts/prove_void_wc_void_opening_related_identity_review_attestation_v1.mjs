#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  Wallet,
} from "ethers";

import {
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1,
  wcVoidOpeningRelatedIdentityClusterIdV1,
} from "../tools/void-wc-void-opening-related-identity-evidence-manifest-v1.mjs";

import {
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_DECISION_ID_V1,
} from "../tools/void-wc-void-opening-related-identity-reviewer-role-v1.mjs";

import {
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_MANIFEST_COMPILER_BLOB_V1,
  canonicalReviewJsonV1,
  relatedIdentityManifestIdV1,
  validateReviewableRelatedIdentityManifestV1,
  verifyReviewSignatureForAddressV1,
  voidWcVoidRelatedIdentityReviewDigestV1,
  voidWcVoidRelatedIdentityReviewTypedDataV1,
} from "../tools/void-wc-void-opening-related-identity-review-attestation-v1.mjs";

const h = (x) => "sha256:" + String(x).repeat(64);
const digest = (value) =>
  "sha256:" +
  crypto.createHash("sha256")
    .update(canonicalReviewJsonV1(value), "utf8")
    .digest("hex");

const participantId = h("5");
const commitmentId = h("4");
const clusterId = wcVoidOpeningRelatedIdentityClusterIdV1([
  participantId,
]);

const evidenceMaterial = {
  schema:
    "void.wc-void-opening-related-identity-evidence-document.v1",
  cluster_id: clusterId,
  evidence_kind: "reviewed_cluster_boundary_evidence_v1",
  decision_basis: "distinct_cluster_boundary",
  subject_participant_ids: [participantId],
  evidence_file_sha256: String("8").repeat(64),
  evidence_bytes: 32,
  privacy_class: "void_control_evidence_non_personal_v1",
};
const evidence = {
  ...evidenceMaterial,
  evidence_id: digest(evidenceMaterial),
};
const assignment = {
  commitment_id: commitmentId,
  participant_id: participantId,
  cluster_id: clusterId,
  evidence_id: evidence.evidence_id,
  ambiguous: false,
};
const coupledLaunchId = h("a");
const clusterAssignmentRoot = digest({
  schema:
    "void.wc-void-opening-related-identity-cluster-assignment-root.v1",
  coupled_launch_id: coupledLaunchId,
  assignments: [assignment],
});
const evidenceManifestRoot = digest({
  schema: "void.wc-void-opening-related-identity-evidence-root.v1",
  coupled_launch_id: coupledLaunchId,
  evidence: [evidence],
});

const manifest = {
  marker: VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1,
  version: 1,
  status:
    "RELATED_IDENTITY_EVIDENCE_MANIFEST_READY_REVIEW_ATTESTATION_HOLD",
  chain_id: 2050,
  pair: "WC_VOID",
  coupled_launch_id: coupledLaunchId,
  concentration_policy_contract_id: h("b"),
  concentration_policy_id: h("c"),
  opening_window_id: h("d"),
  participant_provenance_policy_id: h("e"),
  eligible_cohort_root: h("1"),
  cluster_assignment_root: clusterAssignmentRoot,
  evidence_manifest_root: evidenceManifestRoot,
  participant_count: 1,
  cluster_count: 1,
  evidence_document_count: 1,
  all_eligible_participants_covered: true,
  exact_participant_cluster_bijection: true,
  ambiguous_participant_count: 0,
  evidence_bytes_content_addressed: true,
  privacy_class: "void_control_evidence_non_personal_v1",
  ready_for_review_attestation: true,
  reviewer_role_decision_required: true,
  review_attestation_verified: false,
  related_identity_truth_verified: false,
  opening_concentration_and_sybil_limits_ready: false,
  opening_price_acceptance_allowed: false,
  opening_price_acceptance_hold:
    "related_identity_review_attestation_required",
  cluster_assignments: [assignment],
  evidence_documents: [evidence],
  authority:
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_AUTHORITY_V1,
};
manifest.manifest_id = relatedIdentityManifestIdV1(manifest);

assert.equal(
  validateReviewableRelatedIdentityManifestV1(manifest).manifest_id,
  manifest.manifest_id,
);

const wallet = Wallet.createRandom();
const material = {
  marker:
    "VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1",
  version: 1,
  reviewer_role_decision_id:
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_DECISION_ID_V1,
  reviewer_address: wallet.address.toLowerCase(),
  control_evidence_id: "voidwlcce1_" + String("9").repeat(64),
  manifest_id: manifest.manifest_id,
  coupled_launch_id: manifest.coupled_launch_id,
  concentration_policy_id: manifest.concentration_policy_id,
  opening_window_id: manifest.opening_window_id,
  eligible_cohort_root: manifest.eligible_cohort_root,
  cluster_assignment_root: manifest.cluster_assignment_root,
  evidence_manifest_root: manifest.evidence_manifest_root,
  manifest_compiler_git_blob_sha1:
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_MANIFEST_COMPILER_BLOB_V1,
  issued_at_unix: "1780000000",
  expires_at_unix: "1780000900",
  nonce: "0x" + String("f").repeat(64),
};

const typed = voidWcVoidRelatedIdentityReviewTypedDataV1(material);
const signature = await wallet.signTypedData(
  typed.domain,
  typed.types,
  typed.value,
);
assert.equal(
  verifyReviewSignatureForAddressV1({
    material,
    signature,
    expectedReviewerAddress: wallet.address,
  }),
  wallet.address.toLowerCase(),
);
assert.match(
  voidWcVoidRelatedIdentityReviewDigestV1(material),
  /^0x[0-9a-f]{64}$/u,
);

const wrongWallet = Wallet.createRandom();
assert.throws(
  () =>
    verifyReviewSignatureForAddressV1({
      material,
      signature,
      expectedReviewerAddress: wrongWallet.address,
    }),
  /review_signature_reviewer_mismatch/u,
);

const wrongCompiler = {
  ...material,
  manifest_compiler_git_blob_sha1:
    "1111111111111111111111111111111111111111",
};
assert.throws(
  () =>
    verifyReviewSignatureForAddressV1({
      material: wrongCompiler,
      signature,
      expectedReviewerAddress: wallet.address,
    }),
  /review_signature_reviewer_mismatch/u,
);

const ambiguous = {
  ...manifest,
  ambiguous_participant_count: 1,
};
ambiguous.manifest_id = relatedIdentityManifestIdV1(ambiguous);
assert.throws(
  () => validateReviewableRelatedIdentityManifestV1(ambiguous),
  /review_manifest_not_ready/u,
);

const incomplete = {
  ...manifest,
  all_eligible_participants_covered: false,
};
incomplete.manifest_id = relatedIdentityManifestIdV1(incomplete);
assert.throws(
  () => validateReviewableRelatedIdentityManifestV1(incomplete),
  /review_manifest_not_ready/u,
);

const forgedRoot = {
  ...manifest,
  cluster_assignment_root: h("0"),
};
forgedRoot.manifest_id = relatedIdentityManifestIdV1(forgedRoot);
assert.throws(
  () => validateReviewableRelatedIdentityManifestV1(forgedRoot),
  /review_manifest_root_mismatch/u,
);

const forgedEvidence = {
  ...manifest,
  evidence_documents: [
    {
      ...evidence,
      evidence_id: h("7"),
    },
  ],
};
forgedEvidence.cluster_assignments = [
  {
    ...assignment,
    evidence_id: h("7"),
  },
];
forgedEvidence.evidence_manifest_root = digest({
  schema: "void.wc-void-opening-related-identity-evidence-root.v1",
  coupled_launch_id: coupledLaunchId,
  evidence: forgedEvidence.evidence_documents,
});
forgedEvidence.cluster_assignment_root = digest({
  schema:
    "void.wc-void-opening-related-identity-cluster-assignment-root.v1",
  coupled_launch_id: coupledLaunchId,
  assignments: forgedEvidence.cluster_assignments,
});
forgedEvidence.manifest_id =
  relatedIdentityManifestIdV1(forgedEvidence);
assert.throws(
  () => validateReviewableRelatedIdentityManifestV1(forgedEvidence),
  /review_manifest_evidence_id_mismatch/u,
);

for (const key of [
  "private_key_access",
  "credential_access",
  "wallet_or_signer_access",
  "signing_performed",
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
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_AUTHORITY_V1[key],
    false,
    key,
  );
}

console.log(
  "VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1_PROOF_GREEN",
);
console.log("generic_eip712_recovery=true");
console.log("reviewable_manifest_binding=true");
console.log("manifest_cluster_evidence_roots_reverified=true");
console.log(
  "manifest_compiler_git_blob_sha1=" +
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_MANIFEST_COMPILER_BLOB_V1,
);
console.log("ambiguous_manifest_rejected=true");
console.log("incomplete_manifest_rejected=true");
console.log("forged_manifest_root_rejected=true");
console.log("forged_evidence_id_rejected=true");
console.log("production_private_key_access=false");
console.log("production_signing_performed=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
