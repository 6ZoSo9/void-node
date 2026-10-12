#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  wcVoidOpeningCommitmentIdV1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";

import {
  VOID_WC_VOID_OPENING_WC_PROVENANCE_SCHEMA_V1,
} from "../tools/void-wc-void-opening-nonproduction-exclusion-v1.mjs";

import {
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_SCHEMA_V1,
  wcVoidOpeningParticipantIdV1,
} from "../tools/void-wc-void-opening-participant-provenance-eligibility-v1.mjs";

import {
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_ASSIGNMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_DOCUMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1,
  compileWcVoidOpeningRelatedIdentityEvidenceManifestV1,
  wcVoidOpeningRelatedIdentityClusterIdV1,
  wcVoidOpeningRelatedIdentityEvidenceIdV1,
} from "../tools/void-wc-void-opening-related-identity-evidence-manifest-v1.mjs";

const hash = (digit) => "sha256:" + String(digit).repeat(64);
const hex64 = (digit) => String(digit).repeat(64);
const launchId = hash("a");
const concentrationPolicyId = hash("d");
const openingWindowId = hash("e");

function sha(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function identity(digit, account) {
  const agentId = `void.agent.related-${digit}`;
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
    credential_registry_id: "voidapwcr1_" + hex64("a"),
    credential_registry_sha256: hex64("9"),
    credential_scope: "agent_paid_work_submit",
    credential_issued_at: "2030-01-01T10:00:00.000Z",
    credential_expires_at: "2030-01-02T10:00:00.000Z",
    credential_revoked_at: null,
    binding_registry_id: "voidapwcbr1_" + hex64("d"),
    binding_registry_sha256: hex64("e"),
    binding_status: "active",
    binding_valid_from: "2030-01-01T10:00:00.000Z",
    binding_valid_until: "2030-01-02T10:00:00.000Z",
    binding_revoked_at: null,
    admission_at: "2030-01-01T12:00:00.000Z",
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

function evidence({
  clusterId,
  participants,
  kind,
  basis,
  text,
}) {
  const bytes = Buffer.from(text + "\n", "utf8");
  const input = {
    schema:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_DOCUMENT_SCHEMA_V1,
    cluster_id: clusterId,
    evidence_kind: kind,
    decision_basis: basis,
    subject_participant_ids: [...participants],
    evidence_file_sha256: sha(bytes),
    evidence_bytes: bytes,
    privacy_class: "void_control_evidence_non_personal_v1",
  };
  return {
    ...input,
    evidence_id: wcVoidOpeningRelatedIdentityEvidenceIdV1(input),
  };
}

function assignment(commitmentValue, clusterId, evidenceId, ambiguous = false) {
  return {
    schema: VOID_WC_VOID_OPENING_RELATED_IDENTITY_ASSIGNMENT_SCHEMA_V1,
    commitment_id: commitmentValue.commitment_id,
    participant_id: commitmentValue.participant_id,
    cluster_id: clusterId,
    evidence_id: evidenceId,
    ambiguous,
  };
}

function request(clusterAssignments, evidenceDocuments) {
  return {
    coupled_launch_id: launchId,
    concentration_policy_id: concentrationPolicyId,
    opening_window_id: openingWindowId,
    commitments: [alpha, beta],
    production_wc_provenance_records: [betaSource, alphaSource],
    eligibility_records: [betaEligibility, alphaEligibility],
    cluster_assignments: clusterAssignments,
    evidence_documents: evidenceDocuments,
  };
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

const alphaIdentity = identity("1", "wc-related-alpha");
const betaIdentity = identity("2", "wc-related-beta");
const alpha = commitment(alphaIdentity, "wc-related-alpha", "250");
const beta = commitment(betaIdentity, "wc-related-beta", "750");
const alphaSource = sourceProvenance(alpha, "b");
const betaSource = sourceProvenance(beta, "c");
const alphaEligibility = eligibility(alpha, alphaIdentity, "b");
const betaEligibility = eligibility(beta, betaIdentity, "c");

const commonCluster = wcVoidOpeningRelatedIdentityClusterIdV1([
  alpha.participant_id,
  beta.participant_id,
]);
const commonEvidence = evidence({
  clusterId: commonCluster,
  participants: [alpha.participant_id, beta.participant_id],
  kind: "participant_opt_in_linkage_v1",
  basis: "common_control",
  text:
    "VOID opt-in linkage proof fixture: both participants explicitly prove common control",
});

const complete = compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(
  request(
    [
      assignment(alpha, commonCluster, commonEvidence.evidence_id),
      assignment(beta, commonCluster, commonEvidence.evidence_id),
    ],
    [commonEvidence],
  ),
);

assert.equal(
  complete.marker,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1,
);
assert.equal(
  complete.status,
  "RELATED_IDENTITY_EVIDENCE_MANIFEST_READY_REVIEW_ATTESTATION_HOLD",
);
assert.match(complete.manifest_id, /^voidwcriem1_[0-9a-f]{64}$/u);
assert.equal(complete.participant_count, 2);
assert.equal(complete.cluster_count, 1);
assert.equal(complete.evidence_document_count, 1);
assert.equal(complete.all_eligible_participants_covered, true);
assert.equal(complete.exact_participant_cluster_bijection, true);
assert.equal(complete.ambiguous_participant_count, 0);
assert.equal(complete.evidence_bytes_content_addressed, true);
assert.equal(complete.ready_for_review_attestation, true);
assert.equal(complete.reviewer_role_decision_required, true);
assert.equal(complete.review_attestation_verified, false);
assert.equal(complete.related_identity_truth_verified, false);
assert.equal(complete.opening_concentration_and_sybil_limits_ready, false);
assert.equal(complete.opening_price_acceptance_allowed, false);
assert.equal(
  complete.opening_price_acceptance_hold,
  "related_identity_review_attestation_required",
);
assert.equal(complete.cluster_assignments[0].ambiguous, false);
assert.equal(complete.evidence_documents[0].evidence_bytes, commonEvidence.evidence_bytes.length);
assert.equal(
  complete.evidence_documents[0].privacy_class,
  "void_control_evidence_non_personal_v1",
);

{
  const alphaCluster = wcVoidOpeningRelatedIdentityClusterIdV1([
    alpha.participant_id,
  ]);
  const betaCluster = wcVoidOpeningRelatedIdentityClusterIdV1([
    beta.participant_id,
  ]);
  const alphaBoundary = evidence({
    clusterId: alphaCluster,
    participants: [alpha.participant_id],
    kind: "reviewed_cluster_boundary_evidence_v1",
    basis: "distinct_cluster_boundary",
    text: "reviewed cluster-boundary evidence fixture alpha",
  });
  const betaBoundary = evidence({
    clusterId: betaCluster,
    participants: [beta.participant_id],
    kind: "reviewed_cluster_boundary_evidence_v1",
    basis: "distinct_cluster_boundary",
    text: "reviewed cluster-boundary evidence fixture beta",
  });
  const singleton = compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(
    request(
      [
        assignment(alpha, alphaCluster, alphaBoundary.evidence_id),
        assignment(beta, betaCluster, betaBoundary.evidence_id),
      ],
      [betaBoundary, alphaBoundary],
    ),
  );
  assert.equal(singleton.cluster_count, 2);
  assert.equal(singleton.ready_for_review_attestation, true);
  assert.equal(singleton.related_identity_truth_verified, false);
}

{
  const ambiguous = compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(
    request(
      [
        assignment(alpha, commonCluster, commonEvidence.evidence_id, true),
        assignment(beta, commonCluster, commonEvidence.evidence_id),
      ],
      [commonEvidence],
    ),
  );
  assert.equal(
    ambiguous.status,
    "RELATED_IDENTITY_EVIDENCE_MANIFEST_AMBIGUOUS_HOLD",
  );
  assert.equal(ambiguous.ambiguous_participant_count, 1);
  assert.equal(ambiguous.ready_for_review_attestation, false);
  assert.equal(ambiguous.related_identity_truth_verified, false);
  assert.equal(
    ambiguous.opening_price_acceptance_hold,
    "related_identity_evidence_ambiguous",
  );
}

{
  const bad = request(
    [assignment(alpha, commonCluster, commonEvidence.evidence_id)],
    [commonEvidence],
  );
  rejects(
    () => compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(bad),
    "RELATED_IDENTITY_ASSIGNMENT_COUNT_MISMATCH",
  );
}

{
  const badCluster = hash("f");
  const badEvidence = evidence({
    clusterId: badCluster,
    participants: [alpha.participant_id, beta.participant_id],
    kind: "void_key_control_linkage_v1",
    basis: "common_control",
    text: "wrong cluster id fixture",
  });
  rejects(
    () => compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(
      request(
        [
          assignment(alpha, badCluster, badEvidence.evidence_id),
          assignment(beta, badCluster, badEvidence.evidence_id),
        ],
        [badEvidence],
      ),
    ),
    "RELATED_IDENTITY_CLUSTER_ID_MISMATCH",
  );
}

{
  const bad = {
    ...commonEvidence,
    evidence_bytes: Buffer.from("tampered evidence\n", "utf8"),
  };
  rejects(
    () => compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(
      request(
        [
          assignment(alpha, commonCluster, commonEvidence.evidence_id),
          assignment(beta, commonCluster, commonEvidence.evidence_id),
        ],
        [bad],
      ),
    ),
    "INVALID_RELATED_IDENTITY_EVIDENCE_BYTES",
  );
}

{
  const bytes = Buffer.from("fresh bytes but stale evidence id\n", "utf8");
  const bad = {
    ...commonEvidence,
    evidence_file_sha256: sha(bytes),
    evidence_bytes: bytes,
  };
  rejects(
    () => compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(
      request(
        [
          assignment(alpha, commonCluster, commonEvidence.evidence_id),
          assignment(beta, commonCluster, commonEvidence.evidence_id),
        ],
        [bad],
      ),
    ),
    "RELATED_IDENTITY_EVIDENCE_ID_MISMATCH",
  );
}

{
  const bytes = Buffer.from("forbidden surveillance evidence\n", "utf8");
  const input = {
    schema:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_DOCUMENT_SCHEMA_V1,
    cluster_id: commonCluster,
    evidence_kind: "ip_geolocation_common_control_v1",
    decision_basis: "common_control",
    subject_participant_ids: [alpha.participant_id, beta.participant_id],
    evidence_file_sha256: sha(bytes),
    evidence_bytes: bytes,
    privacy_class: "void_control_evidence_non_personal_v1",
  };
  rejects(
    () => wcVoidOpeningRelatedIdentityEvidenceIdV1(input),
    "INVALID_RELATED_IDENTITY_EVIDENCE_KIND",
  );
}

{
  const unknownParticipant = hash("9");
  const cluster = wcVoidOpeningRelatedIdentityClusterIdV1([
    unknownParticipant,
  ]);
  const unknownEvidence = evidence({
    clusterId: cluster,
    participants: [unknownParticipant],
    kind: "reviewed_cluster_boundary_evidence_v1",
    basis: "distinct_cluster_boundary",
    text: "unknown participant fixture",
  });
  rejects(
    () => compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(
      request(
        [
          assignment(alpha, commonCluster, commonEvidence.evidence_id),
          assignment(beta, commonCluster, commonEvidence.evidence_id),
        ],
        [commonEvidence, unknownEvidence],
      ),
    ),
    "RELATED_IDENTITY_EVIDENCE_UNKNOWN_PARTICIPANT",
  );
}

{
  const alphaCluster = wcVoidOpeningRelatedIdentityClusterIdV1([
    alpha.participant_id,
  ]);
  const betaCluster = wcVoidOpeningRelatedIdentityClusterIdV1([
    beta.participant_id,
  ]);
  const crossEvidence = evidence({
    clusterId: alphaCluster,
    participants: [alpha.participant_id, beta.participant_id],
    kind: "participant_opt_in_linkage_v1",
    basis: "common_control",
    text: "cross-cluster evidence fixture",
  });
  const betaBoundary = evidence({
    clusterId: betaCluster,
    participants: [beta.participant_id],
    kind: "reviewed_cluster_boundary_evidence_v1",
    basis: "distinct_cluster_boundary",
    text: "beta boundary fixture",
  });
  rejects(
    () => compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(
      request(
        [
          assignment(alpha, alphaCluster, crossEvidence.evidence_id),
          assignment(beta, betaCluster, betaBoundary.evidence_id),
        ],
        [crossEvidence, betaBoundary],
      ),
    ),
    "RELATED_IDENTITY_EVIDENCE_CLUSTER_ASSIGNMENT_MISMATCH",
  );
}

{
  const extra = evidence({
    clusterId: commonCluster,
    participants: [alpha.participant_id, beta.participant_id],
    kind: "void_credential_control_linkage_v1",
    basis: "common_control",
    text: "unreferenced extra evidence fixture",
  });
  rejects(
    () => compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(
      request(
        [
          assignment(alpha, commonCluster, commonEvidence.evidence_id),
          assignment(beta, commonCluster, commonEvidence.evidence_id),
        ],
        [commonEvidence, extra],
      ),
    ),
    "UNREFERENCED_RELATED_IDENTITY_EVIDENCE",
  );
}

{
  let getterCalled = false;
  const badAssignment = assignment(
    alpha,
    commonCluster,
    commonEvidence.evidence_id,
  );
  Object.defineProperty(badAssignment, "cluster_id", {
    enumerable: true,
    get() {
      getterCalled = true;
      return commonCluster;
    },
  });
  rejects(
    () => compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(
      request(
        [
          badAssignment,
          assignment(beta, commonCluster, commonEvidence.evidence_id),
        ],
        [commonEvidence],
      ),
    ),
    "INVALID_RELATED_IDENTITY_ASSIGNMENT",
  );
  assert.equal(getterCalled, false);
}

for (const [key, value] of Object.entries(
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_AUTHORITY_V1,
)) {
  if ([
    "source_only",
    "explicit_input_only",
    "eligible_cohort_reverified",
    "content_addressed_evidence_required",
    "exact_participant_cluster_bijection_required",
    "ambiguous_evidence_holds",
    "reviewer_role_decision_required",
  ].includes(key)) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-opening-related-identity-evidence-manifest-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "writeFileSync",
  "appendFileSync",
  "renameSync",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
  "related_identity_truth_verified: true",
  "review_attestation_verified: true",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}
for (const required of [
  "void_key_control_linkage_v1",
  "void_credential_control_linkage_v1",
  "participant_opt_in_linkage_v1",
  "reviewed_cluster_boundary_evidence_v1",
  "void_control_evidence_non_personal_v1",
  "related_identity_review_attestation_required",
]) {
  assert.equal(source.includes(required), true, required);
}

console.log(
  "VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1_GREEN",
);
console.log("participant_count=2");
console.log("complete_cluster_count=1");
console.log("ambiguous_evidence_holds=true");
console.log("eligible_cohort_reverified=true");
console.log("evidence_bytes_content_addressed=true");
console.log("reviewer_role_decision_required=true");
console.log("review_attestation_verified=false");
console.log("related_identity_truth_verified=false");
console.log("opening_price_acceptance_allowed=false");
console.log("privacy_sensitive_attribute_inference=false");
console.log("ip_geolocation_or_device_fingerprinting=false");
