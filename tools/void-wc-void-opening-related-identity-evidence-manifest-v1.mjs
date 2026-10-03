import { createHash } from "node:crypto";

import {
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_V1,
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1,
  verifyWcVoidOpeningParticipantProvenanceEligibilityV1,
} from "./void-wc-void-opening-participant-provenance-eligibility-v1.mjs";

import {
  VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT,
} from "./void-wc-void-opening-concentration-sybil-policy-contract-v1.mjs";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1 =
  "VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1";
export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_ASSIGNMENT_SCHEMA_V1 =
  "void.wc-void-opening-related-identity-assignment.v1";
export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_DOCUMENT_SCHEMA_V1 =
  "void.wc-void-opening-related-identity-evidence-document.v1";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
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

const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const MAX_SET_SIZE = 1_000_000;
const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;

const REQUEST_KEYS = Object.freeze([
  "coupled_launch_id",
  "concentration_policy_id",
  "opening_window_id",
  "commitments",
  "production_wc_provenance_records",
  "eligibility_records",
  "cluster_assignments",
  "evidence_documents",
]);

const ASSIGNMENT_KEYS = Object.freeze([
  "schema",
  "commitment_id",
  "participant_id",
  "cluster_id",
  "evidence_id",
  "ambiguous",
]);

const EVIDENCE_KEYS = Object.freeze([
  "schema",
  "evidence_id",
  "cluster_id",
  "evidence_kind",
  "decision_basis",
  "subject_participant_ids",
  "evidence_file_sha256",
  "evidence_bytes",
  "privacy_class",
]);

const EVIDENCE_ID_INPUT_KEYS = Object.freeze([
  "schema",
  "cluster_id",
  "evidence_kind",
  "decision_basis",
  "subject_participant_ids",
  "evidence_file_sha256",
  "evidence_bytes",
  "privacy_class",
]);

const EVIDENCE_KINDS = Object.freeze(new Set([
  "void_key_control_linkage_v1",
  "void_credential_control_linkage_v1",
  "participant_opt_in_linkage_v1",
  "reviewed_cluster_boundary_evidence_v1",
]));

function fail(code) {
  throw new Error(code);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function plain(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (plain(value)) {
    return "{" + Object.keys(value).sort(compareText)
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") + "}";
  }
  fail("INVALID_RELATED_IDENTITY_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function snapshotExact(value, keys, code) {
  try {
    if (!plain(value)) throw null;
    const actual = Object.keys(value).sort(compareText);
    const expected = [...keys].sort(compareText);
    if (canonicalJson(actual) !== canonicalJson(expected)) throw null;
    const out = Object.create(null);
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      out[key] = descriptor.value;
    }
    return Object.freeze(out);
  } catch {
    fail(code);
  }
}

function snapshotArray(value, code, { allowEmpty = false } = {}) {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw null;
    }
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    if (
      !lengthDescriptor ||
      !Object.hasOwn(lengthDescriptor, "value") ||
      !Number.isSafeInteger(lengthDescriptor.value) ||
      lengthDescriptor.value < (allowEmpty ? 0 : 1) ||
      lengthDescriptor.value > MAX_SET_SIZE
    ) {
      throw null;
    }
    const out = [];
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        !descriptor ||
        descriptor.enumerable !== true ||
        !Object.hasOwn(descriptor, "value")
      ) {
        throw null;
      }
      out.push(descriptor.value);
    }
    return out;
  } catch {
    fail(code);
  }
}

function shaId(value, code) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(code);
  return value;
}

function sortedUniqueShaIds(value, code) {
  const values = snapshotArray(value, code);
  const out = values.map((item) => shaId(item, code)).sort(compareText);
  for (let index = 1; index < out.length; index += 1) {
    if (out[index] === out[index - 1]) fail(code + "_DUPLICATE");
  }
  return Object.freeze(out);
}

export function wcVoidOpeningRelatedIdentityClusterIdV1(participantIds) {
  const canonical = sortedUniqueShaIds(
    participantIds,
    "INVALID_RELATED_IDENTITY_CLUSTER_PARTICIPANTS",
  );
  return digest({
    schema: "void.wc-void-opening-related-identity-cluster.v1",
    participant_ids: canonical,
  });
}

function evidenceSummary(raw) {
  const value = snapshotExact(
    raw,
    EVIDENCE_KEYS,
    "INVALID_RELATED_IDENTITY_EVIDENCE_DOCUMENT",
  );
  if (
    value.schema !==
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_DOCUMENT_SCHEMA_V1
  ) {
    fail("INVALID_RELATED_IDENTITY_EVIDENCE_SCHEMA");
  }
  shaId(value.evidence_id, "INVALID_RELATED_IDENTITY_EVIDENCE_ID");
  shaId(value.cluster_id, "INVALID_RELATED_IDENTITY_EVIDENCE_CLUSTER_ID");
  if (!EVIDENCE_KINDS.has(value.evidence_kind)) {
    fail("INVALID_RELATED_IDENTITY_EVIDENCE_KIND");
  }
  if (
    value.decision_basis !== "common_control" &&
    value.decision_basis !== "distinct_cluster_boundary"
  ) {
    fail("INVALID_RELATED_IDENTITY_DECISION_BASIS");
  }
  if (
    value.decision_basis === "distinct_cluster_boundary" &&
    value.evidence_kind !== "reviewed_cluster_boundary_evidence_v1"
  ) {
    fail("RELATED_IDENTITY_BOUNDARY_EVIDENCE_KIND_MISMATCH");
  }
  if (
    value.decision_basis === "common_control" &&
    value.evidence_kind === "reviewed_cluster_boundary_evidence_v1"
  ) {
    fail("RELATED_IDENTITY_COMMON_CONTROL_EVIDENCE_KIND_MISMATCH");
  }
  const subjects = sortedUniqueShaIds(
    value.subject_participant_ids,
    "INVALID_RELATED_IDENTITY_EVIDENCE_SUBJECTS",
  );
  if (
    value.privacy_class !== "void_control_evidence_non_personal_v1" ||
    !Buffer.isBuffer(value.evidence_bytes) ||
    value.evidence_bytes.length < 1 ||
    value.evidence_bytes.length > MAX_EVIDENCE_BYTES ||
    typeof value.evidence_file_sha256 !== "string" ||
    !HEX64.test(value.evidence_file_sha256) ||
    sha256Bytes(value.evidence_bytes) !== value.evidence_file_sha256
  ) {
    fail("INVALID_RELATED_IDENTITY_EVIDENCE_BYTES");
  }

  const summary = Object.freeze({
    schema: value.schema,
    cluster_id: value.cluster_id,
    evidence_kind: value.evidence_kind,
    decision_basis: value.decision_basis,
    subject_participant_ids: subjects,
    evidence_file_sha256: value.evidence_file_sha256,
    evidence_bytes: value.evidence_bytes.length,
    privacy_class: value.privacy_class,
  });
  if (digest(summary) !== value.evidence_id) {
    fail("RELATED_IDENTITY_EVIDENCE_ID_MISMATCH");
  }
  return Object.freeze({
    ...summary,
    evidence_id: value.evidence_id,
  });
}

export function wcVoidOpeningRelatedIdentityEvidenceIdV1(raw) {
  const value = snapshotExact(
    raw,
    EVIDENCE_ID_INPUT_KEYS,
    "INVALID_RELATED_IDENTITY_EVIDENCE_ID_INPUT",
  );
  if (
    value.schema !==
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_DOCUMENT_SCHEMA_V1
  ) {
    fail("INVALID_RELATED_IDENTITY_EVIDENCE_SCHEMA");
  }
  shaId(value.cluster_id, "INVALID_RELATED_IDENTITY_EVIDENCE_CLUSTER_ID");
  if (!EVIDENCE_KINDS.has(value.evidence_kind)) {
    fail("INVALID_RELATED_IDENTITY_EVIDENCE_KIND");
  }
  if (
    value.decision_basis !== "common_control" &&
    value.decision_basis !== "distinct_cluster_boundary"
  ) {
    fail("INVALID_RELATED_IDENTITY_DECISION_BASIS");
  }
  if (
    value.decision_basis === "distinct_cluster_boundary" &&
    value.evidence_kind !== "reviewed_cluster_boundary_evidence_v1"
  ) {
    fail("RELATED_IDENTITY_BOUNDARY_EVIDENCE_KIND_MISMATCH");
  }
  if (
    value.decision_basis === "common_control" &&
    value.evidence_kind === "reviewed_cluster_boundary_evidence_v1"
  ) {
    fail("RELATED_IDENTITY_COMMON_CONTROL_EVIDENCE_KIND_MISMATCH");
  }
  const subjects = sortedUniqueShaIds(
    value.subject_participant_ids,
    "INVALID_RELATED_IDENTITY_EVIDENCE_SUBJECTS",
  );
  if (
    value.privacy_class !== "void_control_evidence_non_personal_v1" ||
    !Buffer.isBuffer(value.evidence_bytes) ||
    value.evidence_bytes.length < 1 ||
    value.evidence_bytes.length > MAX_EVIDENCE_BYTES ||
    typeof value.evidence_file_sha256 !== "string" ||
    !HEX64.test(value.evidence_file_sha256) ||
    sha256Bytes(value.evidence_bytes) !== value.evidence_file_sha256
  ) {
    fail("INVALID_RELATED_IDENTITY_EVIDENCE_BYTES");
  }
  return digest(Object.freeze({
    schema: value.schema,
    cluster_id: value.cluster_id,
    evidence_kind: value.evidence_kind,
    decision_basis: value.decision_basis,
    subject_participant_ids: subjects,
    evidence_file_sha256: value.evidence_file_sha256,
    evidence_bytes: value.evidence_bytes.length,
    privacy_class: value.privacy_class,
  }));
}

export function compileWcVoidOpeningRelatedIdentityEvidenceManifestV1(raw) {
  const input = snapshotExact(
    raw,
    REQUEST_KEYS,
    "INVALID_RELATED_IDENTITY_MANIFEST_REQUEST",
  );
  shaId(input.coupled_launch_id, "INVALID_RELATED_IDENTITY_LAUNCH_ID");
  shaId(input.concentration_policy_id, "INVALID_RELATED_IDENTITY_POLICY_ID");
  shaId(input.opening_window_id, "INVALID_RELATED_IDENTITY_WINDOW_ID");

  const eligibility =
    verifyWcVoidOpeningParticipantProvenanceEligibilityV1(
      input.coupled_launch_id,
      input.commitments,
      input.production_wc_provenance_records,
      input.eligibility_records,
    );
  if (
    eligibility.marker !==
      VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_V1 ||
    eligibility.policy_id !==
      VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1
        .policy_id ||
    eligibility.participant_provenance_and_eligibility_verified !== true
  ) {
    fail("RELATED_IDENTITY_ELIGIBLE_COHORT_REVERIFY_FAILED");
  }

  const eligibleByCommitment = new Map(
    eligibility.records.map((record) => [record.commitment_id, record]),
  );
  const eligibleParticipantIds = new Set(
    eligibility.records.map((record) => record.participant_id),
  );

  const evidenceDocs = snapshotArray(
    input.evidence_documents,
    "INVALID_RELATED_IDENTITY_EVIDENCE_SET",
  ).map(evidenceSummary);
  const evidenceById = new Map();
  for (const evidence of evidenceDocs) {
    if (evidenceById.has(evidence.evidence_id)) {
      fail("DUPLICATE_RELATED_IDENTITY_EVIDENCE_ID");
    }
    for (const participantId of evidence.subject_participant_ids) {
      if (!eligibleParticipantIds.has(participantId)) {
        fail("RELATED_IDENTITY_EVIDENCE_UNKNOWN_PARTICIPANT");
      }
    }
    evidenceById.set(evidence.evidence_id, evidence);
  }

  const assignments = snapshotArray(
    input.cluster_assignments,
    "INVALID_RELATED_IDENTITY_ASSIGNMENT_SET",
  );
  if (assignments.length !== eligibility.eligible_participant_count) {
    fail("RELATED_IDENTITY_ASSIGNMENT_COUNT_MISMATCH");
  }

  const seenCommitments = new Set();
  const seenParticipants = new Set();
  const clusterParticipants = new Map();
  const participantCluster = new Map();
  const referencedEvidenceIds = new Set();
  let ambiguousParticipantCount = 0;

  const canonicalAssignments = assignments.map((rawAssignment) => {
    const value = snapshotExact(
      rawAssignment,
      ASSIGNMENT_KEYS,
      "INVALID_RELATED_IDENTITY_ASSIGNMENT",
    );
    if (
      value.schema !==
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_ASSIGNMENT_SCHEMA_V1
    ) {
      fail("INVALID_RELATED_IDENTITY_ASSIGNMENT_SCHEMA");
    }
    shaId(value.commitment_id, "INVALID_RELATED_IDENTITY_COMMITMENT_ID");
    shaId(value.participant_id, "INVALID_RELATED_IDENTITY_PARTICIPANT_ID");
    shaId(value.cluster_id, "INVALID_RELATED_IDENTITY_CLUSTER_ID");
    shaId(value.evidence_id, "INVALID_RELATED_IDENTITY_ASSIGNMENT_EVIDENCE_ID");
    if (typeof value.ambiguous !== "boolean") {
      fail("INVALID_RELATED_IDENTITY_AMBIGUOUS_FLAG");
    }

    const eligible = eligibleByCommitment.get(value.commitment_id);
    if (!eligible) fail("UNKNOWN_RELATED_IDENTITY_COMMITMENT");
    if (eligible.participant_id !== value.participant_id) {
      fail("RELATED_IDENTITY_ASSIGNMENT_PARTICIPANT_MISMATCH");
    }
    if (seenCommitments.has(value.commitment_id)) {
      fail("DUPLICATE_RELATED_IDENTITY_ASSIGNMENT_COMMITMENT");
    }
    if (seenParticipants.has(value.participant_id)) {
      fail("DUPLICATE_RELATED_IDENTITY_ASSIGNMENT_PARTICIPANT");
    }
    const evidence = evidenceById.get(value.evidence_id);
    if (!evidence) fail("RELATED_IDENTITY_ASSIGNMENT_EVIDENCE_MISSING");
    if (
      evidence.cluster_id !== value.cluster_id ||
      !evidence.subject_participant_ids.includes(value.participant_id)
    ) {
      fail("RELATED_IDENTITY_ASSIGNMENT_EVIDENCE_MISMATCH");
    }

    seenCommitments.add(value.commitment_id);
    seenParticipants.add(value.participant_id);
    participantCluster.set(value.participant_id, value.cluster_id);
    referencedEvidenceIds.add(value.evidence_id);
    if (value.ambiguous) ambiguousParticipantCount += 1;
    const current = clusterParticipants.get(value.cluster_id) || [];
    current.push(value.participant_id);
    clusterParticipants.set(value.cluster_id, current);

    return Object.freeze({
      commitment_id: value.commitment_id,
      participant_id: value.participant_id,
      cluster_id: value.cluster_id,
      evidence_id: value.evidence_id,
      ambiguous: value.ambiguous,
    });
  });

  if (
    seenCommitments.size !== eligibility.eligible_participant_count ||
    seenParticipants.size !== eligibility.eligible_participant_count
  ) {
    fail("RELATED_IDENTITY_ASSIGNMENT_BIJECTION_INCOMPLETE");
  }

  for (const evidence of evidenceDocs) {
    if (!referencedEvidenceIds.has(evidence.evidence_id)) {
      fail("UNREFERENCED_RELATED_IDENTITY_EVIDENCE");
    }
    for (const participantId of evidence.subject_participant_ids) {
      if (participantCluster.get(participantId) !== evidence.cluster_id) {
        fail("RELATED_IDENTITY_EVIDENCE_CLUSTER_ASSIGNMENT_MISMATCH");
      }
    }
  }

  const clusterIds = [...clusterParticipants.keys()].sort(compareText);
  for (const clusterId of clusterIds) {
    const participants = clusterParticipants.get(clusterId).sort(compareText);
    if (wcVoidOpeningRelatedIdentityClusterIdV1(participants) !== clusterId) {
      fail("RELATED_IDENTITY_CLUSTER_ID_MISMATCH");
    }
    const clusterEvidence = evidenceDocs.filter(
      (evidence) => evidence.cluster_id === clusterId,
    );
    if (clusterEvidence.length < 1) {
      fail("RELATED_IDENTITY_CLUSTER_EVIDENCE_MISSING");
    }
    if (participants.length > 1) {
      const coversWholeCluster = clusterEvidence.some((evidence) =>
        evidence.decision_basis === "common_control" &&
        canonicalJson(evidence.subject_participant_ids) ===
          canonicalJson(participants)
      );
      if (!coversWholeCluster) {
        fail("RELATED_IDENTITY_COMMON_CONTROL_CLUSTER_EVIDENCE_INCOMPLETE");
      }
    } else {
      const hasBoundary = clusterEvidence.some((evidence) =>
        evidence.decision_basis === "distinct_cluster_boundary" &&
        canonicalJson(evidence.subject_participant_ids) ===
          canonicalJson(participants)
      );
      if (!hasBoundary) {
        fail("RELATED_IDENTITY_SINGLETON_BOUNDARY_EVIDENCE_INCOMPLETE");
      }
    }
  }

  canonicalAssignments.sort((left, right) =>
    compareText(left.commitment_id, right.commitment_id)
  );
  evidenceDocs.sort((left, right) =>
    compareText(left.evidence_id, right.evidence_id)
  );

  const eligibleCohortRoot = digest({
    schema: "void.wc-void-opening-eligible-cohort-root.v1",
    coupled_launch_id: input.coupled_launch_id,
    participant_provenance_policy_id: eligibility.policy_id,
    records: eligibility.records,
  });
  const clusterAssignmentRoot = digest({
    schema: "void.wc-void-opening-related-identity-cluster-assignment-root.v1",
    coupled_launch_id: input.coupled_launch_id,
    assignments: canonicalAssignments,
  });
  const evidenceManifestRoot = digest({
    schema: "void.wc-void-opening-related-identity-evidence-root.v1",
    coupled_launch_id: input.coupled_launch_id,
    evidence: evidenceDocs,
  });

  const complete = ambiguousParticipantCount === 0;
  const material = Object.freeze({
    marker: VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1,
    version: 1,
    status: complete
      ? "RELATED_IDENTITY_EVIDENCE_MANIFEST_READY_REVIEW_ATTESTATION_HOLD"
      : "RELATED_IDENTITY_EVIDENCE_MANIFEST_AMBIGUOUS_HOLD",
    chain_id: 2050,
    pair: "WC_VOID",
    coupled_launch_id: input.coupled_launch_id,
    concentration_policy_contract_id:
      VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT
        .policy_contract_id,
    concentration_policy_id: input.concentration_policy_id,
    opening_window_id: input.opening_window_id,
    participant_provenance_policy_id: eligibility.policy_id,
    eligible_cohort_root: eligibleCohortRoot,
    cluster_assignment_root: clusterAssignmentRoot,
    evidence_manifest_root: evidenceManifestRoot,
    participant_count: eligibility.eligible_participant_count,
    cluster_count: clusterIds.length,
    evidence_document_count: evidenceDocs.length,
    all_eligible_participants_covered: true,
    exact_participant_cluster_bijection: true,
    ambiguous_participant_count: ambiguousParticipantCount,
    evidence_bytes_content_addressed: true,
    privacy_class: "void_control_evidence_non_personal_v1",
    ready_for_review_attestation: complete,
    reviewer_role_decision_required: true,
    review_attestation_verified: false,
    related_identity_truth_verified: false,
    opening_concentration_and_sybil_limits_ready: false,
    opening_price_acceptance_allowed: false,
    opening_price_acceptance_hold: complete
      ? "related_identity_review_attestation_required"
      : "related_identity_evidence_ambiguous",
    cluster_assignments: Object.freeze(canonicalAssignments),
    evidence_documents: Object.freeze(evidenceDocs),
    authority:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_AUTHORITY_V1,
  });
  return Object.freeze({
    ...material,
    manifest_id:
      "voidwcriem1_" +
      createHash("sha256").update(canonicalJson(material), "utf8").digest("hex"),
  });
}
