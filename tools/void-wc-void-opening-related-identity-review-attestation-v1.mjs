#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

import {
  TypedDataEncoder,
  getAddress,
  isHexString,
  keccak256,
  toUtf8Bytes,
  verifyTypedData,
} from "ethers";

import {
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1,
  reverifyVoidWcVoidLaunchControllerControlEvidenceV1,
} from "./void-wc-void-launch-controller-control-requalification-v1.mjs";

import {
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ADDRESS_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_DECISION_ID_V1,
  buildWcVoidOpeningRelatedIdentityReviewerRoleV1,
  verifyWcVoidOpeningRelatedIdentityReviewerRoleV1,
} from "./void-wc-void-opening-related-identity-reviewer-role-v1.mjs";

import {
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_AUTHORITY_V1,
  VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1,
  wcVoidOpeningRelatedIdentityClusterIdV1,
} from "./void-wc-void-opening-related-identity-evidence-manifest-v1.mjs";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1 =
  "VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_VERIFIER_V1 =
  "VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_VERIFIER_V1";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_DOMAIN_V1 =
  Object.freeze({
    name: "VOID WC/VOID Related Identity Review Attestation",
    version: "1",
    chainId: 2050,
    salt: keccak256(
      toUtf8Bytes(
        "VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1",
      ),
    ),
  });

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_TYPES_V1 =
  Object.freeze({
    RelatedIdentityReview: Object.freeze([
      Object.freeze({ name: "reviewer_role_decision_id", type: "bytes32" }),
      Object.freeze({ name: "reviewer_address", type: "address" }),
      Object.freeze({ name: "control_evidence_id", type: "bytes32" }),
      Object.freeze({ name: "manifest_id", type: "bytes32" }),
      Object.freeze({ name: "coupled_launch_id", type: "bytes32" }),
      Object.freeze({ name: "concentration_policy_id", type: "bytes32" }),
      Object.freeze({ name: "opening_window_id", type: "bytes32" }),
      Object.freeze({ name: "eligible_cohort_root", type: "bytes32" }),
      Object.freeze({ name: "cluster_assignment_root", type: "bytes32" }),
      Object.freeze({ name: "evidence_manifest_root", type: "bytes32" }),
      Object.freeze({ name: "manifest_compiler_git_blob_sha1", type: "bytes20" }),
      Object.freeze({ name: "issued_at_unix", type: "uint64" }),
      Object.freeze({ name: "expires_at_unix", type: "uint64" }),
      Object.freeze({ name: "nonce", type: "bytes32" }),
    ]),
  });

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_AUTHORITY_V1 =
  Object.freeze({
    source_only_verifier: true,
    reviewer_signature_verification: true,
    fresh_launch_controller_control_evidence_required: true,
    manifest_review_attestation_only: true,
    private_key_access: false,
    credential_access: false,
    wallet_or_signer_access: false,
    signing_performed: false,
    wc_ledger_write: false,
    wc_balance_mutation: false,
    runtime_or_service_mutation: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    deployment_authorized: false,
    inventory_funding_authorized: false,
    market_activation: false,
    public_presale_activation: false,
    liquidity_movement: false,
    treasury_movement: false,
    funds_movement: false,
  });

const MAX_TTL_SECONDS = 1800n;
const MIN_TTL_SECONDS = 60n;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const MANIFEST_ID = /^voidwcriem1_[0-9a-f]{64}$/u;
const ROLE_DECISION_ID = /^voidwcrirr1_[0-9a-f]{64}$/u;
const CONTROL_EVIDENCE_ID = /^voidwlcce1_[0-9a-f]{64}$/u;
const BYTES32 = /^0x[0-9a-f]{64}$/u;
const GIT_BLOB = /^[0-9a-f]{40}$/u;
const REVIEWED_MANIFEST_COMPILER_PATH =
  "tools/void-wc-void-opening-related-identity-evidence-manifest-v1.mjs";
export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_MANIFEST_COMPILER_BLOB_V1 =
  "7bb5c54fcd6a0d188b90c4c17d06145fe792ce66";

function fail(code) {
  throw new Error(code);
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalReviewJsonV1(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function digestSha256IdV1(value) {
  return "sha256:" +
    sha256(Buffer.from(canonicalReviewJsonV1(value), "utf8"));
}

function compareTextV1(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactKeysV1(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort(compareTextV1);
  const expected = [...keys].sort(compareTextV1);
  if (canonicalReviewJsonV1(actual) !== canonicalReviewJsonV1(expected)) {
    fail(code);
  }
  return value;
}

function currentManifestCompilerBlobV1() {
  let blob;
  try {
    blob = execFileSync(
      "git",
      [
        "--no-replace-objects",
        "rev-parse",
        "HEAD:" + REVIEWED_MANIFEST_COMPILER_PATH,
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          GIT_OPTIONAL_LOCKS: "0",
          GIT_CONFIG_NOSYSTEM: "1",
        },
      },
    ).trim();
  } catch {
    fail("review_manifest_compiler_blob_unavailable");
  }
  if (
    !GIT_BLOB.test(blob) ||
    blob !==
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_MANIFEST_COMPILER_BLOB_V1
  ) {
    fail("review_manifest_compiler_generation_mismatch");
  }
  return blob;
}

function canonicalAddress(value, code) {
  if (typeof value !== "string") fail(code);
  let address;
  try {
    address = getAddress(value).toLowerCase();
  } catch {
    fail(code);
  }
  return address;
}

function decimal(value, code) {
  if (
    (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") ||
    !/^(0|[1-9][0-9]*)$/u.test(String(value))
  ) {
    fail(code);
  }
  const parsed = BigInt(String(value));
  if (parsed < 0n || parsed > (1n << 64n) - 1n) fail(code);
  return parsed;
}

function prefixedIdBytes32(value, pattern, prefix, code) {
  if (typeof value !== "string" || !pattern.test(value)) fail(code);
  const hex = value.slice(prefix.length);
  const bytes32 = "0x" + hex;
  if (!BYTES32.test(bytes32)) fail(code);
  return bytes32;
}

function sha256IdBytes32(value, code) {
  if (typeof value !== "string" || !SHA256_ID.test(value)) fail(code);
  return "0x" + value.slice("sha256:".length);
}

function gitBlobBytes20(value, code) {
  if (typeof value !== "string" || !GIT_BLOB.test(value)) fail(code);
  return "0x" + value;
}

export function relatedIdentityManifestIdV1(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    fail("review_manifest_not_object");
  }
  const material = { ...manifest };
  delete material.manifest_id;
  return "voidwcriem1_" +
    sha256(Buffer.from(canonicalReviewJsonV1(material), "utf8"));
}

export function validateReviewableRelatedIdentityManifestV1(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    fail("review_manifest_not_object");
  }
  if (
    manifest.marker !==
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_MANIFEST_V1 ||
    manifest.version !== 1 ||
    manifest.status !==
      "RELATED_IDENTITY_EVIDENCE_MANIFEST_READY_REVIEW_ATTESTATION_HOLD" ||
    manifest.chain_id !== 2050 ||
    manifest.pair !== "WC_VOID" ||
    manifest.ready_for_review_attestation !== true ||
    manifest.reviewer_role_decision_required !== true ||
    manifest.review_attestation_verified !== false ||
    manifest.related_identity_truth_verified !== false ||
    manifest.opening_concentration_and_sybil_limits_ready !== false ||
    manifest.opening_price_acceptance_allowed !== false ||
    manifest.opening_price_acceptance_hold !==
      "related_identity_review_attestation_required" ||
    manifest.all_eligible_participants_covered !== true ||
    manifest.exact_participant_cluster_bijection !== true ||
    manifest.ambiguous_participant_count !== 0 ||
    manifest.evidence_bytes_content_addressed !== true ||
    manifest.privacy_class !== "void_control_evidence_non_personal_v1" ||
    canonicalReviewJsonV1(manifest.authority) !==
      canonicalReviewJsonV1(
        VOID_WC_VOID_OPENING_RELATED_IDENTITY_EVIDENCE_AUTHORITY_V1,
      ) ||
    !Number.isSafeInteger(manifest.participant_count) ||
    manifest.participant_count < 1 ||
    !Number.isSafeInteger(manifest.cluster_count) ||
    manifest.cluster_count < 1 ||
    !Number.isSafeInteger(manifest.evidence_document_count) ||
    manifest.evidence_document_count < 1 ||
    !Array.isArray(manifest.cluster_assignments) ||
    manifest.cluster_assignments.length !== manifest.participant_count ||
    !Array.isArray(manifest.evidence_documents) ||
    manifest.evidence_documents.length !== manifest.evidence_document_count
  ) {
    fail("review_manifest_not_ready");
  }

  for (const [key, value] of [
    ["coupled_launch_id", manifest.coupled_launch_id],
    ["concentration_policy_contract_id", manifest.concentration_policy_contract_id],
    ["concentration_policy_id", manifest.concentration_policy_id],
    ["opening_window_id", manifest.opening_window_id],
    ["participant_provenance_policy_id", manifest.participant_provenance_policy_id],
    ["eligible_cohort_root", manifest.eligible_cohort_root],
    ["cluster_assignment_root", manifest.cluster_assignment_root],
    ["evidence_manifest_root", manifest.evidence_manifest_root],
  ]) {
    sha256IdBytes32(value, "review_manifest_invalid_" + key);
  }

  const evidenceById = new Map();
  const canonicalEvidence = [];
  for (const raw of manifest.evidence_documents) {
    const evidence = exactKeysV1(
      raw,
      [
        "schema",
        "cluster_id",
        "evidence_kind",
        "decision_basis",
        "subject_participant_ids",
        "evidence_file_sha256",
        "evidence_bytes",
        "privacy_class",
        "evidence_id",
      ],
      "review_manifest_evidence_shape_invalid",
    );
    sha256IdBytes32(
      evidence.cluster_id,
      "review_manifest_evidence_cluster_invalid",
    );
    sha256IdBytes32(
      evidence.evidence_id,
      "review_manifest_evidence_id_invalid",
    );
    if (
      evidence.schema !==
        "void.wc-void-opening-related-identity-evidence-document.v1" ||
      (
        evidence.evidence_kind !== "void_key_control_linkage_v1" &&
        evidence.evidence_kind !== "void_credential_control_linkage_v1" &&
        evidence.evidence_kind !== "participant_opt_in_linkage_v1" &&
        evidence.evidence_kind !== "reviewed_cluster_boundary_evidence_v1"
      ) ||
      (
        evidence.decision_basis !== "common_control" &&
        evidence.decision_basis !== "distinct_cluster_boundary"
      ) ||
      (
        evidence.decision_basis === "distinct_cluster_boundary" &&
        evidence.evidence_kind !== "reviewed_cluster_boundary_evidence_v1"
      ) ||
      (
        evidence.decision_basis === "common_control" &&
        evidence.evidence_kind === "reviewed_cluster_boundary_evidence_v1"
      ) ||
      !Array.isArray(evidence.subject_participant_ids) ||
      evidence.subject_participant_ids.length < 1 ||
      typeof evidence.evidence_file_sha256 !== "string" ||
      !/^[0-9a-f]{64}$/u.test(evidence.evidence_file_sha256) ||
      !Number.isSafeInteger(evidence.evidence_bytes) ||
      evidence.evidence_bytes < 1 ||
      evidence.privacy_class !== "void_control_evidence_non_personal_v1"
    ) {
      fail("review_manifest_evidence_semantics_invalid");
    }
    const subjects = [...evidence.subject_participant_ids];
    for (const participantId of subjects) {
      sha256IdBytes32(
        participantId,
        "review_manifest_evidence_subject_invalid",
      );
    }
    const sortedSubjects = [...subjects].sort(compareTextV1);
    if (
      new Set(sortedSubjects).size !== sortedSubjects.length ||
      canonicalReviewJsonV1(subjects) !== canonicalReviewJsonV1(sortedSubjects)
    ) {
      fail("review_manifest_evidence_subject_order_invalid");
    }
    const evidenceMaterial = {
      schema: evidence.schema,
      cluster_id: evidence.cluster_id,
      evidence_kind: evidence.evidence_kind,
      decision_basis: evidence.decision_basis,
      subject_participant_ids: subjects,
      evidence_file_sha256: evidence.evidence_file_sha256,
      evidence_bytes: evidence.evidence_bytes,
      privacy_class: evidence.privacy_class,
    };
    if (digestSha256IdV1(evidenceMaterial) !== evidence.evidence_id) {
      fail("review_manifest_evidence_id_mismatch");
    }
    if (evidenceById.has(evidence.evidence_id)) {
      fail("review_manifest_duplicate_evidence_id");
    }
    const normalized = Object.freeze({ ...evidenceMaterial, evidence_id: evidence.evidence_id });
    evidenceById.set(evidence.evidence_id, normalized);
    canonicalEvidence.push(normalized);
  }

  const seenCommitments = new Set();
  const seenParticipants = new Set();
  const referencedEvidence = new Set();
  const participantCluster = new Map();
  const clusterParticipants = new Map();
  const canonicalAssignments = [];

  for (const raw of manifest.cluster_assignments) {
    const assignment = exactKeysV1(
      raw,
      [
        "commitment_id",
        "participant_id",
        "cluster_id",
        "evidence_id",
        "ambiguous",
      ],
      "review_manifest_assignment_shape_invalid",
    );
    for (const [key, value] of [
      ["commitment_id", assignment.commitment_id],
      ["participant_id", assignment.participant_id],
      ["cluster_id", assignment.cluster_id],
      ["evidence_id", assignment.evidence_id],
    ]) {
      sha256IdBytes32(
        value,
        "review_manifest_assignment_invalid_" + key,
      );
    }
    if (
      assignment.ambiguous !== false ||
      seenCommitments.has(assignment.commitment_id) ||
      seenParticipants.has(assignment.participant_id)
    ) {
      fail("review_manifest_assignment_bijection_invalid");
    }
    const evidence = evidenceById.get(assignment.evidence_id);
    if (
      !evidence ||
      evidence.cluster_id !== assignment.cluster_id ||
      !evidence.subject_participant_ids.includes(assignment.participant_id)
    ) {
      fail("review_manifest_assignment_evidence_mismatch");
    }
    seenCommitments.add(assignment.commitment_id);
    seenParticipants.add(assignment.participant_id);
    referencedEvidence.add(assignment.evidence_id);
    participantCluster.set(assignment.participant_id, assignment.cluster_id);
    const members = clusterParticipants.get(assignment.cluster_id) || [];
    members.push(assignment.participant_id);
    clusterParticipants.set(assignment.cluster_id, members);
    canonicalAssignments.push(Object.freeze({
      commitment_id: assignment.commitment_id,
      participant_id: assignment.participant_id,
      cluster_id: assignment.cluster_id,
      evidence_id: assignment.evidence_id,
      ambiguous: false,
    }));
  }

  if (
    seenCommitments.size !== manifest.participant_count ||
    seenParticipants.size !== manifest.participant_count ||
    clusterParticipants.size !== manifest.cluster_count ||
    evidenceById.size !== manifest.evidence_document_count
  ) {
    fail("review_manifest_count_mismatch");
  }

  for (const evidence of canonicalEvidence) {
    if (!referencedEvidence.has(evidence.evidence_id)) {
      fail("review_manifest_unreferenced_evidence");
    }
    for (const participantId of evidence.subject_participant_ids) {
      if (participantCluster.get(participantId) !== evidence.cluster_id) {
        fail("review_manifest_evidence_cluster_assignment_mismatch");
      }
    }
  }

  for (const [clusterId, memberList] of clusterParticipants) {
    const members = [...memberList].sort(compareTextV1);
    if (wcVoidOpeningRelatedIdentityClusterIdV1(members) !== clusterId) {
      fail("review_manifest_cluster_id_mismatch");
    }
    const clusterEvidence = canonicalEvidence.filter(
      (evidence) => evidence.cluster_id === clusterId,
    );
    if (members.length > 1) {
      if (!clusterEvidence.some((evidence) =>
        evidence.decision_basis === "common_control" &&
        canonicalReviewJsonV1(evidence.subject_participant_ids) ===
          canonicalReviewJsonV1(members)
      )) {
        fail("review_manifest_common_control_evidence_incomplete");
      }
    } else if (!clusterEvidence.some((evidence) =>
      evidence.decision_basis === "distinct_cluster_boundary" &&
      canonicalReviewJsonV1(evidence.subject_participant_ids) ===
        canonicalReviewJsonV1(members)
    )) {
      fail("review_manifest_singleton_boundary_evidence_incomplete");
    }
  }

  canonicalAssignments.sort((left, right) =>
    compareTextV1(left.commitment_id, right.commitment_id)
  );
  canonicalEvidence.sort((left, right) =>
    compareTextV1(left.evidence_id, right.evidence_id)
  );
  if (
    canonicalReviewJsonV1(manifest.cluster_assignments) !==
      canonicalReviewJsonV1(canonicalAssignments) ||
    canonicalReviewJsonV1(manifest.evidence_documents) !==
      canonicalReviewJsonV1(canonicalEvidence)
  ) {
    fail("review_manifest_canonical_order_mismatch");
  }

  const assignmentRoot = digestSha256IdV1({
    schema:
      "void.wc-void-opening-related-identity-cluster-assignment-root.v1",
    coupled_launch_id: manifest.coupled_launch_id,
    assignments: canonicalAssignments,
  });
  const evidenceRoot = digestSha256IdV1({
    schema: "void.wc-void-opening-related-identity-evidence-root.v1",
    coupled_launch_id: manifest.coupled_launch_id,
    evidence: canonicalEvidence,
  });
  if (
    assignmentRoot !== manifest.cluster_assignment_root ||
    evidenceRoot !== manifest.evidence_manifest_root
  ) {
    fail("review_manifest_root_mismatch");
  }

  if (
    typeof manifest.manifest_id !== "string" ||
    !MANIFEST_ID.test(manifest.manifest_id) ||
    relatedIdentityManifestIdV1(manifest) !== manifest.manifest_id
  ) {
    fail("review_manifest_id_mismatch");
  }
  return Object.freeze({ ...manifest });
}
export function reviewAttestationTypedValueV1(material) {
  return Object.freeze({
    reviewer_role_decision_id: prefixedIdBytes32(
      material.reviewer_role_decision_id,
      ROLE_DECISION_ID,
      "voidwcrirr1_",
      "review_role_decision_id_invalid",
    ),
    reviewer_address: canonicalAddress(
      material.reviewer_address,
      "review_reviewer_address_invalid",
    ),
    control_evidence_id: prefixedIdBytes32(
      material.control_evidence_id,
      CONTROL_EVIDENCE_ID,
      "voidwlcce1_",
      "review_control_evidence_id_invalid",
    ),
    manifest_id: prefixedIdBytes32(
      material.manifest_id,
      MANIFEST_ID,
      "voidwcriem1_",
      "review_manifest_id_invalid",
    ),
    coupled_launch_id: sha256IdBytes32(
      material.coupled_launch_id,
      "review_coupled_launch_id_invalid",
    ),
    concentration_policy_id: sha256IdBytes32(
      material.concentration_policy_id,
      "review_concentration_policy_id_invalid",
    ),
    opening_window_id: sha256IdBytes32(
      material.opening_window_id,
      "review_opening_window_id_invalid",
    ),
    eligible_cohort_root: sha256IdBytes32(
      material.eligible_cohort_root,
      "review_eligible_cohort_root_invalid",
    ),
    cluster_assignment_root: sha256IdBytes32(
      material.cluster_assignment_root,
      "review_cluster_assignment_root_invalid",
    ),
    evidence_manifest_root: sha256IdBytes32(
      material.evidence_manifest_root,
      "review_evidence_manifest_root_invalid",
    ),
    manifest_compiler_git_blob_sha1: gitBlobBytes20(
      material.manifest_compiler_git_blob_sha1,
      "review_manifest_compiler_blob_invalid",
    ),
    issued_at_unix: decimal(
      material.issued_at_unix,
      "review_issued_at_invalid",
    ).toString(),
    expires_at_unix: decimal(
      material.expires_at_unix,
      "review_expires_at_invalid",
    ).toString(),
    nonce: String(material.nonce || ""),
  });
}

export function voidWcVoidRelatedIdentityReviewTypedDataV1(material) {
  const value = reviewAttestationTypedValueV1(material);
  if (!BYTES32.test(value.nonce)) fail("review_nonce_invalid");
  return Object.freeze({
    domain: VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_DOMAIN_V1,
    types: VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_TYPES_V1,
    value,
  });
}

export function voidWcVoidRelatedIdentityReviewDigestV1(material) {
  const data = voidWcVoidRelatedIdentityReviewTypedDataV1(material);
  return TypedDataEncoder.hash(data.domain, data.types, data.value);
}

export function verifyReviewSignatureForAddressV1({
  material,
  signature,
  expectedReviewerAddress,
}) {
  if (typeof signature !== "string" || !isHexString(signature, 65)) {
    fail("review_signature_invalid");
  }
  const expected = canonicalAddress(
    expectedReviewerAddress,
    "review_expected_address_invalid",
  );
  const data = voidWcVoidRelatedIdentityReviewTypedDataV1(material);
  const recovered = verifyTypedData(
    data.domain,
    data.types,
    data.value,
    signature,
  ).toLowerCase();
  if (recovered !== expected) fail("review_signature_reviewer_mismatch");
  return recovered;
}

function attestationMaterialV1({
  manifest,
  controlEvidenceId,
  nowUnix,
  ttlSeconds,
  nonce,
}) {
  const reviewed = validateReviewableRelatedIdentityManifestV1(manifest);
  const role = buildWcVoidOpeningRelatedIdentityReviewerRoleV1();
  verifyWcVoidOpeningRelatedIdentityReviewerRoleV1(role);

  const issued = decimal(nowUnix, "review_now_invalid");
  const ttl = decimal(ttlSeconds, "review_ttl_invalid");
  if (ttl < MIN_TTL_SECONDS || ttl > MAX_TTL_SECONDS) {
    fail("review_ttl_out_of_range");
  }
  const expires = issued + ttl;
  if (expires > (1n << 64n) - 1n) fail("review_expiry_invalid");
  if (typeof nonce !== "string" || !BYTES32.test(nonce)) {
    fail("review_nonce_invalid");
  }

  return Object.freeze({
    marker: VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_V1,
    version: 1,
    reviewer_role_decision_id:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_DECISION_ID_V1,
    reviewer_address:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ADDRESS_V1,
    control_evidence_id: controlEvidenceId,
    manifest_id: reviewed.manifest_id,
    coupled_launch_id: reviewed.coupled_launch_id,
    concentration_policy_id: reviewed.concentration_policy_id,
    opening_window_id: reviewed.opening_window_id,
    eligible_cohort_root: reviewed.eligible_cohort_root,
    cluster_assignment_root: reviewed.cluster_assignment_root,
    evidence_manifest_root: reviewed.evidence_manifest_root,
    manifest_compiler_git_blob_sha1: currentManifestCompilerBlobV1(),
    issued_at_unix: issued.toString(),
    expires_at_unix: expires.toString(),
    nonce,
  });
}

export async function prepareWcVoidOpeningRelatedIdentityReviewAttestationV1({
  manifest,
  controlEvidence,
  nowUnix = Math.floor(Date.now() / 1000),
  ttlSeconds = 900,
  nonce = null,
} = {}) {
  const role = buildWcVoidOpeningRelatedIdentityReviewerRoleV1();
  verifyWcVoidOpeningRelatedIdentityReviewerRoleV1(role);

  const fresh =
    await reverifyVoidWcVoidLaunchControllerControlEvidenceV1({
      evidence: controlEvidence,
      nowUnix,
    });
  if (
    fresh.evidence_reverified !== true ||
    fresh.candidate_address.toLowerCase() !==
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ADDRESS_V1
  ) {
    fail("review_control_evidence_reviewer_mismatch");
  }

  const nonceValue = nonce === null
    ? "0x" + crypto.randomBytes(32).toString("hex")
    : String(nonce);

  const material = attestationMaterialV1({
    manifest,
    controlEvidenceId: fresh.evidence_id,
    nowUnix,
    ttlSeconds,
    nonce: nonceValue,
  });
  const typedData = voidWcVoidRelatedIdentityReviewTypedDataV1(material);
  return Object.freeze({
    material,
    typed_data: typedData,
    typed_data_digest: TypedDataEncoder.hash(
      typedData.domain,
      typedData.types,
      typedData.value,
    ),
    signing_performed: false,
    review_attestation_verified: false,
    related_identity_truth_verified: false,
  });
}

export async function verifyWcVoidOpeningRelatedIdentityReviewAttestationV1({
  manifest,
  controlEvidence,
  material,
  signature,
  nowUnix = Math.floor(Date.now() / 1000),
} = {}) {
  const role = buildWcVoidOpeningRelatedIdentityReviewerRoleV1();
  verifyWcVoidOpeningRelatedIdentityReviewerRoleV1(role);
  const reviewed = validateReviewableRelatedIdentityManifestV1(manifest);

  const fresh =
    await reverifyVoidWcVoidLaunchControllerControlEvidenceV1({
      evidence: controlEvidence,
      nowUnix,
    });
  if (
    fresh.evidence_reverified !== true ||
    fresh.candidate_address.toLowerCase() !== role.reviewer_address ||
    fresh.evidence_id !== material?.control_evidence_id
  ) {
    fail("review_control_evidence_reviewer_mismatch");
  }

  const expected = attestationMaterialV1({
    manifest: reviewed,
    controlEvidenceId: fresh.evidence_id,
    nowUnix: material?.issued_at_unix,
    ttlSeconds:
      decimal(material?.expires_at_unix, "review_expires_at_invalid") -
      decimal(material?.issued_at_unix, "review_issued_at_invalid"),
    nonce: material?.nonce,
  });
  if (
    canonicalReviewJsonV1(material) !==
    canonicalReviewJsonV1(expected)
  ) {
    fail("review_attestation_material_mismatch");
  }

  const now = decimal(nowUnix, "review_now_invalid");
  const issued = decimal(material.issued_at_unix, "review_issued_at_invalid");
  const expires = decimal(material.expires_at_unix, "review_expires_at_invalid");
  if (now < issued || now >= expires) fail("review_attestation_expired");

  const recovered = verifyReviewSignatureForAddressV1({
    material,
    signature,
    expectedReviewerAddress: role.reviewer_address,
  });

  const resultMaterial = Object.freeze({
    marker:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_ATTESTATION_VERIFIER_V1,
    version: 1,
    status: "RELATED_IDENTITY_REVIEW_ATTESTATION_VERIFIED",
    reviewer_role_decision_id: role.decision_id,
    reviewer_address: recovered,
    control_evidence_id: fresh.evidence_id,
    manifest_id: reviewed.manifest_id,
    coupled_launch_id: reviewed.coupled_launch_id,
    concentration_policy_id: reviewed.concentration_policy_id,
    opening_window_id: reviewed.opening_window_id,
    eligible_cohort_root: reviewed.eligible_cohort_root,
    cluster_assignment_root: reviewed.cluster_assignment_root,
    evidence_manifest_root: reviewed.evidence_manifest_root,
    manifest_compiler_git_blob_sha1:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWED_MANIFEST_COMPILER_BLOB_V1,
    review_attestation_verified: true,
    related_identity_truth_verified: true,
    opening_concentration_and_sybil_limits_ready: false,
    opening_price_acceptance_allowed: false,
    opening_price_acceptance_hold:
      "concentration_arithmetic_recheck_required",
    authority:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEW_AUTHORITY_V1,
  });

  return Object.freeze({
    ...resultMaterial,
    attestation_id:
      "voidwcria1_" +
      sha256(Buffer.from(canonicalReviewJsonV1(resultMaterial), "utf8")),
  });
}
