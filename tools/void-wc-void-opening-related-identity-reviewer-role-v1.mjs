#!/usr/bin/env node
import crypto from "node:crypto";

import {
  getAddress,
  keccak256,
  toUtf8Bytes,
} from "ethers";

import {
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1,
  VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_ROLE_ID_V1,
} from "./void-wc-void-launch-controller-control-requalification-v1.mjs";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ROLE_V1 =
  "VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ROLE_V1";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ADDRESS_V1 =
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_DECISION_ID_V1 =
  "voidwcrirr1_27edb03939335d6b6ede05da0b46f57680e86e3fa104f3e85cb2d1c06676d10a";

export const VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_AUTHORITY_V1 =
  Object.freeze({
    source_only_role_decision: true,
    related_identity_manifest_review_attestation_role: true,
    fresh_control_evidence_required: true,
    manifest_signing_performed: false,
    private_key_access: false,
    credential_access: false,
    wallet_or_signer_access: false,
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

const REVIEWER_ROLE_LABEL =
  "VOID_WC_VOID_MARKET_VAULT_LAUNCH_CONTROLLER_V1";

const ATTESTATION_SCOPE = Object.freeze([
  "manifest_id",
  "coupled_launch_id",
  "concentration_policy_id",
  "opening_window_id",
  "eligible_cohort_root",
  "cluster_assignment_root",
  "evidence_manifest_root",
  "manifest_compiler_git_blob_sha1",
]);

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalReviewerRoleJsonV1(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function expectedMaterialV1() {
  const address = getAddress(
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ADDRESS_V1,
  ).toLowerCase();

  const expectedRoleId = keccak256(toUtf8Bytes(REVIEWER_ROLE_LABEL));
  if (
    expectedRoleId !==
    VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_ROLE_ID_V1
  ) {
    throw new Error("reviewer_launch_controller_role_id_mismatch");
  }

  if (
    VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1 !==
    "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1"
  ) {
    throw new Error("reviewer_control_evidence_marker_mismatch");
  }

  return Object.freeze({
    marker: VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_ROLE_V1,
    version: 1,
    chain_id: 2050,
    pair: "WC_VOID",
    reviewer_role: "related_identity_manifest_reviewer",
    reviewer_address: address,
    launch_controller_role_label: REVIEWER_ROLE_LABEL,
    authorization_basis: "sovereign_explicit_reviewer_role_selection_v1",
    attestation_scope: ATTESTATION_SCOPE,
    fresh_control_evidence_required: true,
    control_evidence_marker:
      VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1,
    reviewer_role_selected: true,
    review_attestation_verified: false,
    related_identity_truth_verified: false,
    opening_concentration_and_sybil_limits_ready: false,
    opening_price_acceptance_allowed: false,
    authority:
      VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_AUTHORITY_V1,
  });
}

export function reviewerRoleDecisionIdV1(value) {
  const material = { ...value };
  delete material.decision_id;
  return "voidwcrirr1_" +
    sha256(Buffer.from(canonicalReviewerRoleJsonV1(material), "utf8"));
}

export function buildWcVoidOpeningRelatedIdentityReviewerRoleV1() {
  const material = expectedMaterialV1();
  const decision = Object.freeze({
    ...material,
    decision_id: VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_DECISION_ID_V1,
  });

  if (
    reviewerRoleDecisionIdV1(decision) !==
    VOID_WC_VOID_OPENING_RELATED_IDENTITY_REVIEWER_DECISION_ID_V1
  ) {
    throw new Error("reviewer_role_decision_id_mismatch");
  }
  return decision;
}

export function verifyWcVoidOpeningRelatedIdentityReviewerRoleV1(value) {
  const expected = buildWcVoidOpeningRelatedIdentityReviewerRoleV1();
  if (
    canonicalReviewerRoleJsonV1(value) !==
    canonicalReviewerRoleJsonV1(expected)
  ) {
    throw new Error("reviewer_role_decision_mismatch");
  }
  return true;
}
