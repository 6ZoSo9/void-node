#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  Wallet,
  keccak256,
  toUtf8Bytes,
} from "ethers";

import {
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_DECISION_ID_V1,
} from "../tools/void-wc-void-opening-related-identity-reviewer-role-v1.mjs";

import {
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_DOMAIN_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_CONTROL_INPUT_LIMITS_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_LINEAGE_BLOBS_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_MANIFEST_COMPILER_BLOB_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_RESOURCE_LIMITS_V1,
  canonicalReviewJsonV1,
  prepareWcVoidOpeningRelatedIdentityReviewAttestationV1,
  relatedIdentityManifestIdV1,
  reviewedControlVerifierGenerationV1,
  validateReviewableRelatedIdentityManifestV1,
  verifyReviewManifestLineageV1,
  verifyReviewSignatureForAddressV1,
  verifyWcVoidOpeningRelatedIdentityReviewAttestationV1,
  voidWcVoidRelatedIdentityReviewDigestV1,
  voidWcVoidRelatedIdentityReviewTypedDataV1,
} from "../tools/void-wc-void-opening-related-identity-review-attestation-v1.mjs";

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
  VOID_WC_VOID_OPENING_ADMISSION_SCHEMA_V1,
  VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1,
  wcVoidOpeningAdmissionIdV1,
  wcVoidOpeningWindowIdV1,
} from "../tools/void-wc-void-opening-window-policy-v1.mjs";

import {
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_SCHEMA_V1,
  wcVoidOpeningConcentrationSybilPolicyIdV1,
} from "../tools/void-wc-void-opening-concentration-sybil-policy-v1.mjs";

import {
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_ASSIGNMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_DOCUMENT_SCHEMA_V1,
  compileWcVoidOpeningRelatedIdentityEvidenceManifestV1,
  wcVoidOpeningRelatedIdentityClusterIdV1,
  wcVoidOpeningRelatedIdentityEvidenceIdV1,
} from "../tools/void-wc-void-opening-related-identity-evidence-manifest-v1.mjs";

assert.equal(
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_DOMAIN_V1.salt,
  keccak256(
    toUtf8Bytes(
      "VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1",
    ),
  ),
  "review attestation domain salt drifted",
);

const h = (x) => "sha256:" + String(x).repeat(64);
const digest = (value) =>
  "sha256:" +
  crypto.createHash("sha256")
    .update(canonicalReviewJsonV1(value), "utf8")
    .digest("hex");

const REVIEWED_MANIFEST_MARKER =
  "VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1";
const REVIEWED_MANIFEST_AUTHORITY = Object.freeze({
  source_only: true,
  explicit_input_only: true,
  eligible_cohort_reverified: true,
  content_addressed_evidence_required: true,
  exact_participant_cluster_bijection_required: true,
  ambiguous_evidence_holds: true,
  reviewer_role_decision_required: true,
  review_attestation_verified: false,
  related_identity_truth_verified: false,
  privacy_sensitive_attribute_inference: false,
  browsing_or_social_graph_deanonymization: false,
  ip_geolocation_or_device_fingerprinting: false,
  runtime_or_launch_evidence: false,
  wc_ledger_write: false,
  wc_balance_mutation: false,
  wallet_or_signer_access: false,
  private_key_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  inventory_funding: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});
function reviewedClusterId(participantIds) {
  const canonical = [...participantIds].sort();
  assert.equal(new Set(canonical).size, canonical.length);
  return digest({
    schema: "void.wc-void-opening-related-identity-cluster.v1",
    participant_ids: canonical,
  });
}

const participantId = h("5");
const commitmentId = h("4");
const clusterId = reviewedClusterId([
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
  marker: REVIEWED_MANIFEST_MARKER,
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
    REVIEWED_MANIFEST_AUTHORITY,
};
manifest.manifest_id = relatedIdentityManifestIdV1(manifest);

assert.equal(
  validateReviewableRelatedIdentityManifestV1(manifest).manifest_id,
  manifest.manifest_id,
);

{
  const oversized = {
    ...manifest,
    participant_count:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_RESOURCE_LIMITS_V1
        .max_participants + 1,
  };
  oversized.manifest_id = relatedIdentityManifestIdV1(oversized);
  assert.throws(
    () => validateReviewableRelatedIdentityManifestV1(oversized),
    /review_manifest_resource_limit_exceeded/u,
  );

  const oversizedEvidence = {
    ...evidence,
    evidence_bytes:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_RESOURCE_LIMITS_V1
        .max_evidence_bytes_per_document + 1,
  };
  const oversizedEvidenceManifest = {
    ...manifest,
    evidence_documents: [oversizedEvidence],
  };
  oversizedEvidenceManifest.manifest_id =
    relatedIdentityManifestIdV1(oversizedEvidenceManifest);
  assert.throws(
    () => validateReviewableRelatedIdentityManifestV1(
      oversizedEvidenceManifest,
    ),
    /review_manifest_resource_limit_exceeded/u,
  );

  let subjectIteratorRead = false;
  const oversizedSubjects = new Proxy(
    [participantId, participantId],
    {
      get(target, property, receiver) {
        if (property === Symbol.iterator) {
          subjectIteratorRead = true;
          throw new Error("subject_iterator_read_before_limit");
        }
        return Reflect.get(target, property, receiver);
      },
    },
  );
  const preCopyLimitManifest = {
    ...manifest,
    evidence_documents: [
      {
        ...evidence,
        subject_participant_ids: oversizedSubjects,
      },
    ],
  };
  assert.throws(
    () => validateReviewableRelatedIdentityManifestV1(preCopyLimitManifest),
    /review_manifest_resource_limit_exceeded/u,
  );
  assert.equal(
    subjectIteratorRead,
    false,
    "subject list was copied before the resource limit check",
  );
}

const lineageHex = (digit) => String(digit).repeat(64);
const lineageLaunchId = h("a");
const lineageAccount = "wc-review-lineage-alpha";
const lineageAgentId = "void.agent.review-lineage-alpha";
const lineageCredentialId = "voidapwc1_" + lineageHex("1");
const lineageBindingId = "voidapwcb1_" + lineageHex("2");
const lineageParticipantId = wcVoidOpeningParticipantIdV1({
  agent_id: lineageAgentId,
  credential_id: lineageCredentialId,
  binding_id: lineageBindingId,
  destination_wc_account: lineageAccount,
});
const lineageCommitment = {
  schema: VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  commitment_id: h("0"),
  coupled_launch_id: lineageLaunchId,
  participant_id: lineageParticipantId,
  account: lineageAccount,
  wc_units: "250",
};
lineageCommitment.commitment_id =
  wcVoidOpeningCommitmentIdV1(lineageCommitment);

const lineageProvenance = {
  schema: VOID_WC_VOID_OPENING_WC_PROVENANCE_SCHEMA_V1,
  coupled_launch_id: lineageLaunchId,
  commitment_id: lineageCommitment.commitment_id,
  participant_id: lineageParticipantId,
  account: lineageAccount,
  wc_units: lineageCommitment.wc_units,
  source_class: "production_earned_wc",
  earning_receipt_id: "sha256:" + lineageHex("3"),
  price_formation_included: true,
};

const lineageEligibility = {
  schema:
    VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_SCHEMA_V1,
  coupled_launch_id: lineageLaunchId,
  commitment_id: lineageCommitment.commitment_id,
  participant_id: lineageParticipantId,
  account: lineageAccount,
  wc_units: lineageCommitment.wc_units,
  agent_id: lineageAgentId,
  credential_id: lineageCredentialId,
  binding_id: lineageBindingId,
  credential_registry_id: "voidapwcr1_" + lineageHex("4"),
  credential_registry_sha256: lineageHex("5"),
  credential_scope: "agent_paid_work_submit",
  credential_issued_at: "2026-09-25T15:00:00.000Z",
  credential_expires_at: "2026-09-26T15:00:00.000Z",
  credential_revoked_at: null,
  binding_registry_id: "voidapwcbr1_" + lineageHex("6"),
  binding_registry_sha256: lineageHex("7"),
  binding_status: "active",
  binding_valid_from: "2026-09-25T15:00:00.000Z",
  binding_valid_until: "2026-09-26T15:00:00.000Z",
  binding_revoked_at: null,
  admission_at: "2026-09-25T16:26:40.000Z",
  earning_adapter_receipt_id: "voidapwear1_" + lineageHex("3"),
  earning_adapter_receipt_sha256: lineageHex("3"),
  earning_receipt_agent_id: lineageAgentId,
  earning_receipt_credential_id: lineageCredentialId,
  earning_receipt_binding_id: lineageBindingId,
  earning_receipt_account: lineageAccount,
  earning_receipt_canonical_redeemable: true,
  eligible: true,
};

const lineageWindow = {
  schema: VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1,
  window_id: h("0"),
  coupled_launch_id: lineageLaunchId,
  policy_committed_at_ms: 1790350000000,
  opens_at_ms: 1790353600000,
  closes_at_ms: 1790357200000,
};
lineageWindow.window_id = wcVoidOpeningWindowIdV1(lineageWindow);

const lineageAdmission = {
  schema: VOID_WC_VOID_OPENING_ADMISSION_SCHEMA_V1,
  admission_id: h("0"),
  window_id: lineageWindow.window_id,
  coupled_launch_id: lineageLaunchId,
  commitment_id: lineageCommitment.commitment_id,
  participant_id: lineageParticipantId,
  account: lineageAccount,
  admitted_at_ms: lineageWindow.opens_at_ms,
};
lineageAdmission.admission_id =
  wcVoidOpeningAdmissionIdV1(lineageAdmission);

const lineageConcentrationPolicy = {
  schema: VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_SCHEMA_V1,
  policy_id: h("0"),
  coupled_launch_id: lineageLaunchId,
  policy_generation: "1",
  policy_committed_at_ms: lineageWindow.opens_at_ms - 1000,
  opening_window_id: lineageWindow.window_id,
  max_participant_share_bps: "5000",
  max_related_identity_share_bps: "6000",
  failure_action: "hold_opening_price_acceptance",
};
lineageConcentrationPolicy.policy_id =
  wcVoidOpeningConcentrationSybilPolicyIdV1(lineageConcentrationPolicy);

const lineageClusterId = wcVoidOpeningRelatedIdentityClusterIdV1([
  lineageParticipantId,
]);
const lineageEvidenceBytes = Buffer.from(
  "review lineage singleton boundary evidence\n",
  "utf8",
);
const lineageEvidenceInput = {
  schema:
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_DOCUMENT_SCHEMA_V1,
  cluster_id: lineageClusterId,
  evidence_kind: "reviewed_cluster_boundary_evidence_v1",
  decision_basis: "distinct_cluster_boundary",
  subject_participant_ids: [lineageParticipantId],
  evidence_file_sha256:
    crypto.createHash("sha256").update(lineageEvidenceBytes).digest("hex"),
  evidence_bytes: lineageEvidenceBytes,
  privacy_class: "void_control_evidence_non_personal_v1",
};
const lineageEvidence = {
  ...lineageEvidenceInput,
  evidence_id:
    wcVoidOpeningRelatedIdentityEvidenceIdV1(lineageEvidenceInput),
};
const lineageAssignment = {
  schema: VOID_WC_VOID_OPENING_RELATED_IDENTITY_ASSIGNMENT_SCHEMA_V1,
  commitment_id: lineageCommitment.commitment_id,
  participant_id: lineageParticipantId,
  cluster_id: lineageClusterId,
  evidence_id: lineageEvidence.evidence_id,
  ambiguous: false,
};

const lineageManifest =
  compileWcVoidOpeningRelatedIdentityEvidenceManifestV1({
    coupled_launch_id: lineageLaunchId,
    concentration_policy_id: lineageConcentrationPolicy.policy_id,
    opening_window_id: lineageWindow.window_id,
    commitments: [lineageCommitment],
    production_wc_provenance_records: [lineageProvenance],
    eligibility_records: [lineageEligibility],
    cluster_assignments: [lineageAssignment],
    evidence_documents: [lineageEvidence],
  });

const lineage = {
  opening_window: lineageWindow,
  opening_admissions: [lineageAdmission],
  concentration_policy: lineageConcentrationPolicy,
  commitments: [lineageCommitment],
  production_wc_provenance_records: [lineageProvenance],
  eligibility_records: [lineageEligibility],
};

const verifiedLineage = await verifyReviewManifestLineageV1(
  lineageManifest,
  lineage,
);
assert.equal(
  verifiedLineage.opening_window_id,
  lineageManifest.opening_window_id,
);
assert.equal(
  verifiedLineage.concentration_policy_id,
  lineageManifest.concentration_policy_id,
);
assert.equal(
  verifiedLineage.eligible_cohort_root,
  lineageManifest.eligible_cohort_root,
);
assert.equal(verifiedLineage.participant_count, 1);
assert.equal(verifiedLineage.assignment_eligibility_bijection_verified, true);
assert.equal(verifiedLineage.eligibility_admission_times_match_opening, true);
assert.equal(verifiedLineage.mutable_worktree_lineage_execution, false);

{
  const mutableManifest = JSON.parse(JSON.stringify(lineageManifest));
  const pending = verifyReviewManifestLineageV1(mutableManifest, lineage);
  mutableManifest.cluster_assignments[0].participant_id = h("e");
  mutableManifest.evidence_documents[0].subject_participant_ids[0] = h("e");
  const detachedResult = await pending;
  assert.equal(detachedResult.participant_count, 1);
  assert.equal(
    detachedResult.assignment_eligibility_bijection_verified,
    true,
  );
}

{
  const substitutedParticipantId = h("f");
  const substitutedClusterId =
    wcVoidOpeningRelatedIdentityClusterIdV1([substitutedParticipantId]);
  const substitutedEvidenceInput = {
    ...lineageEvidenceInput,
    cluster_id: substitutedClusterId,
    subject_participant_ids: [substitutedParticipantId],
  };
  const substitutedEvidence = {
    ...lineageManifest.evidence_documents[0],
    cluster_id: substitutedClusterId,
    subject_participant_ids: [substitutedParticipantId],
    evidence_id:
      wcVoidOpeningRelatedIdentityEvidenceIdV1(substitutedEvidenceInput),
  };
  const substitutedAssignment = {
    ...lineageManifest.cluster_assignments[0],
    participant_id: substitutedParticipantId,
    cluster_id: substitutedClusterId,
    evidence_id: substitutedEvidence.evidence_id,
  };
  const substitutedManifest = {
    ...lineageManifest,
    cluster_assignments: [substitutedAssignment],
    evidence_documents: [substitutedEvidence],
  };
  substitutedManifest.cluster_assignment_root = digest({
    schema:
      "void.wc-void-opening-related-identity-cluster-assignment-root.v1",
    coupled_launch_id: lineageLaunchId,
    assignments: substitutedManifest.cluster_assignments,
  });
  substitutedManifest.evidence_manifest_root = digest({
    schema: "void.wc-void-opening-related-identity-evidence-root.v1",
    coupled_launch_id: lineageLaunchId,
    evidence: substitutedManifest.evidence_documents,
  });
  substitutedManifest.manifest_id =
    relatedIdentityManifestIdV1(substitutedManifest);

  assert.equal(
    validateReviewableRelatedIdentityManifestV1(substitutedManifest).manifest_id,
    substitutedManifest.manifest_id,
  );
  await assert.rejects(
    () => verifyReviewManifestLineageV1(substitutedManifest, lineage),
    /review_manifest_assignment_eligibility_bijection_mismatch/u,
  );
}

await assert.rejects(
  () => verifyReviewManifestLineageV1(
    lineageManifest,
    {
      ...lineage,
      eligibility_records: [
        {
          ...lineageEligibility,
          admission_at: "2026-09-25T16:26:41.000Z",
        },
      ],
    },
  ),
  /review_manifest_eligibility_admission_time_mismatch/u,
);

await assert.rejects(
  () => verifyReviewManifestLineageV1(
    lineageManifest,
    {
      ...lineage,
      concentration_policy: {
        ...lineageConcentrationPolicy,
        max_participant_share_bps: "4000",
      },
    },
  ),
  /WC_VOID_CONCENTRATION_POLICY_DIGEST_MISMATCH/u,
);

await assert.rejects(
  () => verifyReviewManifestLineageV1(
    lineageManifest,
    {
      ...lineage,
      opening_window: {
        ...lineageWindow,
        closes_at_ms: lineageWindow.closes_at_ms + 1,
      },
    },
  ),
  /WC_VOID_OPENING_WINDOW_DIGEST_MISMATCH/u,
);

await assert.rejects(
  () => verifyReviewManifestLineageV1(
    lineageManifest,
    {
      ...lineage,
      eligibility_records: [
        {
          ...lineageEligibility,
          credential_registry_sha256: lineageHex("8"),
        },
      ],
    },
  ),
  /review_manifest_eligible_cohort_lineage_mismatch/u,
);

assert.deepEqual(
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_CONTROL_INPUT_LIMITS_V1,
  {
    max_depth: 16,
    max_nodes: 8_192,
    max_object_keys: 128,
    max_array_items: 512,
    max_string_bytes: 2 * 1024 * 1024,
    max_serialized_bytes: 2 * 1024 * 1024,
  },
);

await assert.rejects(
  () =>
    prepareWcVoidOpeningRelatedIdentityReviewAttestationV1({
      manifest: lineageManifest,
      lineage,
      controlEvidence: {},
      nowUnix: 1_780_000_000n,
    }),
  /review_control_child_execution_failed/u,
);

await assert.rejects(
  () =>
    verifyWcVoidOpeningRelatedIdentityReviewAttestationV1({
      manifest: lineageManifest,
      lineage,
      controlEvidence: {},
      material: {},
      signature: "0x" + "11".repeat(65),
      nowUnix: 1_780_000_000n,
    }),
  /review_control_child_execution_failed/u,
);

await assert.rejects(
  () =>
    prepareWcVoidOpeningRelatedIdentityReviewAttestationV1({
      manifest: lineageManifest,
      lineage,
      controlEvidence: {
        oversized: new Array(
          VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_CONTROL_INPUT_LIMITS_V1
            .max_array_items + 1,
        ).fill(null),
      },
      nowUnix: 1_780_000_000,
    }),
  /review_control_input_resource_limit_exceeded/u,
);

{
  let deep = "leaf";
  for (
    let depth = 0;
    depth <=
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_CONTROL_INPUT_LIMITS_V1
        .max_depth;
    depth += 1
  ) {
    deep = { nested: deep };
  }
  await assert.rejects(
    () =>
      prepareWcVoidOpeningRelatedIdentityReviewAttestationV1({
        manifest: lineageManifest,
        lineage,
        controlEvidence: deep,
        nowUnix: 1_780_000_000,
      }),
    /review_control_input_resource_limit_exceeded/u,
  );
}

{
  const accessorEvidence = {};
  Object.defineProperty(accessorEvidence, "trap", {
    enumerable: true,
    get() {
      throw new Error("control_evidence_accessor_executed");
    },
  });
  await assert.rejects(
    () =>
      prepareWcVoidOpeningRelatedIdentityReviewAttestationV1({
        manifest: lineageManifest,
        lineage,
        controlEvidence: accessorEvidence,
        nowUnix: 1_780_000_000,
      }),
    /review_control_input_shape_invalid/u,
  );
}

{
  const generation = await reviewedControlVerifierGenerationV1();
  assert.equal(
    generation.reviewed_package_runtime_profile_id,
    "voidrnpr1_bb76a6a16b4fb779edffb4f541f7a91d0ddb00bfe404031b4387840e74001e77",
  );
  assert.equal(
    generation.reviewed_packages_aggregate_sha256,
    "5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73",
  );
  assert.equal(generation.reviewed_package_bytes_verified, true);
  assert.equal(generation.ancestor_package_resolution_preempted, true);
  assert.equal(generation.ambient_node_package_bytes_forbidden, true);
  assert.equal(generation.child_process_isolation, true);
  assert.equal(generation.process_environment_mutation, false);
  assert.equal(generation.mutable_worktree_execution, false);

  const trackedEnv = ["GIT_DIR", "GIT_WORK_TREE", "HOME", "PATH"];
  const envBefore = Object.fromEntries(
    trackedEnv.map((key) => [key, process.env[key]]),
  );
  const [concurrentA, concurrentB] = await Promise.all([
    reviewedControlVerifierGenerationV1(),
    reviewedControlVerifierGenerationV1(),
  ]);
  assert.equal(concurrentA.child_process_isolation, true);
  assert.equal(concurrentB.child_process_isolation, true);
  assert.deepEqual(
    Object.fromEntries(trackedEnv.map((key) => [key, process.env[key]])),
    envBefore,
  );

  const ethersPackageJson = path.join(
    process.cwd(),
    "node_modules",
    "ethers",
    "package.json",
  );
  const original = fs.readFileSync(ethersPackageJson);
  const originalMode = fs.statSync(ethersPackageJson).mode & 0o777;
  try {
    fs.chmodSync(ethersPackageJson, 0o600);
    fs.writeFileSync(
      ethersPackageJson,
      Buffer.concat([original, Buffer.from(" ", "utf8")]),
    );
    await assert.rejects(
      () => reviewedControlVerifierGenerationV1(),
      /reviewed_node_runtime_/u,
    );
  } finally {
    fs.writeFileSync(ethersPackageJson, original);
    fs.chmodSync(ethersPackageJson, originalMode);
  }
}

{
  const toolPath =
    "tools/void-wc-void-opening-related-identity-review-attestation-v1.mjs";
  const compilerPath =
    "tools/void-wc-void-opening-related-identity-evidence-manifest-v1.mjs";
  const toolSource = fs.readFileSync(toolPath, "utf8");
  const importPrefixEnd = toolSource.indexOf(
    "export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1",
  );
  assert.ok(importPrefixEnd > 0, "review verifier import prefix missing");
  const moduleImportPrefix = toolSource.slice(0, importPrefixEnd);
  assert.equal(
    moduleImportPrefix.includes('from "ethers"'),
    false,
    "production verifier must not import ambient ethers at module load",
  );
  assert.equal(
    toolSource.includes("canonicalEvidence.filter("),
    false,
    "cluster validation must not rescan the full evidence array",
  );
  assert.equal(
    toolSource.includes("evidenceByCluster.get(clusterId)"),
    true,
    "cluster validation must use the bounded evidence index",
  );
  assert.equal(
    toolSource.includes("Object.assign(process.env"),
    false,
    "control reverification must not mutate process-global environment",
  );
  assert.equal(
    toolSource.includes("function restoreEnvironmentV1"),
    false,
    "process-global environment restoration helper must be absent",
  );
  assert.equal(
    toolSource.includes("child_process_isolation: true"),
    true,
    "control reverification must expose child-process isolation",
  );
  assert.equal(
    toolSource.includes(
      '"    await control.reverifyVoidWcVoidLaunchControllerControlEvidenceV1(input);"',
    ),
    true,
    "reviewed control bridge must await async reverification before JSON output",
  );
  const prepareStart = toolSource.indexOf(
    "export async function prepareWcVoidOpeningRelatedIdentityReviewAttestationV1",
  );
  const verifyStart = toolSource.indexOf(
    "export async function verifyWcVoidOpeningRelatedIdentityReviewAttestationV1",
    prepareStart,
  );
  assert.ok(prepareStart > 0 && verifyStart > prepareStart);
  const prepareSource = toolSource.slice(prepareStart, verifyStart);
  assert.equal(
    prepareSource.includes(
      "const reviewed = validateReviewableRelatedIdentityManifestV1(manifest);",
    ),
    true,
    "prepare must detach the manifest before the first await",
  );
  assert.equal(
    prepareSource.includes(
      "await verifyReviewManifestLineageV1(reviewed, lineage);",
    ),
    true,
    "prepare must verify lineage from the detached manifest",
  );
  assert.equal(
    prepareSource.includes("manifest: reviewed,"),
    true,
    "prepare must construct signing material from the detached manifest",
  );
  assert.equal(
    toolSource.includes(
      'from "./void-wc-void-opening-related-identity-evidence-manifest-v1.mjs"',
    ),
    false,
    "review verifier must not statically execute manifest compiler",
  );

  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-related-identity-review-compiler-sentinel-"),
  );
  const sentinel = path.join(temp, "compiler-executed");
  const original = fs.readFileSync(compilerPath);
  const gitEnv = {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
  };
  try {
    const hide = spawnSync(
      "/usr/bin/git",
      ["-C", process.cwd(), "update-index", "--assume-unchanged", compilerPath],
      { env: gitEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.equal(hide.status, 0, String(hide.stderr || ""));

    fs.writeFileSync(
      compilerPath,
      Buffer.concat([
        Buffer.from(
          'import { writeFileSync as __voidSentinelWrite } from "node:fs";\n' +
            "__voidSentinelWrite(" +
            JSON.stringify(sentinel) +
            ', "executed\\n");\n',
          "utf8",
        ),
        original,
      ]),
    );

    const moduleUrl = pathToFileURL(path.resolve(toolPath)).href;
    const childSource = [
      "import { validateReviewableRelatedIdentityManifestV1 } from " +
        JSON.stringify(moduleUrl) + ";",
      "const manifest=" + JSON.stringify(manifest) + ";",
      "const result=validateReviewableRelatedIdentityManifestV1(manifest);",
      "if(result.manifest_id!==manifest.manifest_id) process.exit(31);",
    ].join("\n");
    const child = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", childSource],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
      },
    );
    assert.equal(
      child.status,
      0,
      String(child.stdout || "") + String(child.stderr || ""),
    );
    assert.equal(
      fs.existsSync(sentinel),
      false,
      "dirty manifest compiler bytes executed",
    );
  } finally {
    fs.writeFileSync(compilerPath, original);
    spawnSync(
      "/usr/bin/git",
      ["-C", process.cwd(), "update-index", "--no-assume-unchanged", compilerPath],
      { env: gitEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

{
  const toolPath =
    "tools/void-wc-void-opening-related-identity-review-attestation-v1.mjs";
  const lineagePath =
    "tools/void-wc-void-opening-concentration-sybil-policy-v1.mjs";
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-related-identity-review-lineage-sentinel-"),
  );
  const sentinel = path.join(temp, "lineage-executed");
  const original = fs.readFileSync(lineagePath);
  const gitEnv = {
    PATH: "/usr/bin:/bin",
    HOME: "/nonexistent",
    XDG_CONFIG_HOME: "/nonexistent",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
  };
  try {
    const hide = spawnSync(
      "/usr/bin/git",
      ["-C", process.cwd(), "update-index", "--assume-unchanged", lineagePath],
      { env: gitEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.equal(hide.status, 0, String(hide.stderr || ""));

    fs.writeFileSync(
      lineagePath,
      Buffer.concat([
        Buffer.from(
          'import { writeFileSync as __voidLineageSentinelWrite } from "node:fs";\n' +
            "__voidLineageSentinelWrite(" +
            JSON.stringify(sentinel) +
            ', "executed\\n");\n',
          "utf8",
        ),
        original,
      ]),
    );

    const moduleUrl = pathToFileURL(path.resolve(toolPath)).href;
    const childSource = [
      "import { verifyReviewManifestLineageV1 } from " +
        JSON.stringify(moduleUrl) + ";",
      "const manifest=" + JSON.stringify(lineageManifest) + ";",
      "const lineage=" + JSON.stringify(lineage) + ";",
      "const result=await verifyReviewManifestLineageV1(manifest,lineage);",
      "if(result.eligible_cohort_root!==manifest.eligible_cohort_root) process.exit(41);",
    ].join("\n");
    const child = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", childSource],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
      },
    );
    assert.equal(
      child.status,
      0,
      String(child.stdout || "") + String(child.stderr || ""),
    );
    assert.equal(
      fs.existsSync(sentinel),
      false,
      "dirty lineage verifier bytes executed",
    );
  } finally {
    fs.writeFileSync(lineagePath, original);
    spawnSync(
      "/usr/bin/git",
      ["-C", process.cwd(), "update-index", "--no-assume-unchanged", lineagePath],
      { env: gitEnv, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

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
  await verifyReviewSignatureForAddressV1({
    material,
    signature,
    expectedReviewerAddress: wallet.address,
  }),
  wallet.address.toLowerCase(),
);
assert.match(
  await voidWcVoidRelatedIdentityReviewDigestV1(material),
  /^0x[0-9a-f]{64}$/u,
);

const wrongWallet = Wallet.createRandom();
await assert.rejects(
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
await assert.rejects(
  () =>
    verifyReviewSignatureForAddressV1({
      material: wrongCompiler,
      signature,
      expectedReviewerAddress: wallet.address,
    }),
  /review_signature_reviewer_mismatch/u,
);

{
  const ethersPackageJson = path.join(
    process.cwd(),
    "node_modules",
    "ethers",
    "package.json",
  );
  const original = fs.readFileSync(ethersPackageJson);
  const originalMode = fs.statSync(ethersPackageJson).mode & 0o777;
  try {
    fs.chmodSync(ethersPackageJson, 0o600);
    fs.writeFileSync(
      ethersPackageJson,
      Buffer.concat([original, Buffer.from(" ", "utf8")]),
    );
    await assert.rejects(
      () => voidWcVoidRelatedIdentityReviewDigestV1(material),
      /reviewed_node_runtime_/u,
    );
    await assert.rejects(
      () => verifyReviewSignatureForAddressV1({
        material,
        signature,
        expectedReviewerAddress: wallet.address,
      }),
      /reviewed_node_runtime_/u,
    );
  } finally {
    fs.writeFileSync(ethersPackageJson, original);
    fs.chmodSync(ethersPackageJson, originalMode);
  }
}

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
console.log("review_domain_salt_rederived=true");
console.log("reviewable_manifest_binding=true");
console.log("manifest_resource_limits_enforced=true");
console.log("subject_resource_limit_checked_before_copy=true");
console.log("linear_evidence_by_cluster_index=true");
console.log("manifest_cluster_evidence_roots_reverified=true");
console.log("manifest_compiler_worktree_execution=false");
console.log("dirty_manifest_compiler_sentinel_execution=false");
console.log("reviewed_opening_lineage_reverified=true");
console.log("stale_concentration_policy_body_rejected=true");
console.log("stale_opening_window_body_rejected=true");
console.log("forged_eligible_cohort_root_rejected=true");
console.log("assignment_eligibility_bijection_verified=true");
console.log("substituted_manifest_participant_rejected=true");
console.log("eligibility_admission_time_binding=true");
console.log("admission_time_drift_rejected=true");
console.log("reviewed_ethers_package_bytes_verified=true");
console.log("production_module_ambient_ethers_import=false");
console.log("ambient_ethers_byte_drift_rejected=true");
console.log("eip712_ambient_ethers_byte_drift_rejected=true");
console.log("validated_manifest_snapshot_detached=true");
console.log("prepare_uses_same_detached_manifest_snapshot=true");
console.log("post_yield_manifest_mutation_ignored=true");
console.log("control_reverification_child_process_isolated=true");
console.log("async_control_reverification_awaited=true");
console.log("bigint_control_now_normalized=true");
console.log("control_input_resource_limits_enforced=true");
console.log("oversized_control_evidence_rejected_before_child=true");
console.log("deep_control_evidence_rejected_before_child=true");
console.log("control_evidence_accessors_not_executed=true");
console.log("process_environment_mutation=false");
console.log("concurrent_control_reverification_parent_env_stable=true");
console.log("dirty_lineage_verifier_sentinel_execution=false");
console.log(
  "reviewed_lineage_blob_count=" +
    Object.keys(
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_LINEAGE_BLOBS_V1,
    ).length,
);
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
