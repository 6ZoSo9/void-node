import { createHash } from "node:crypto";

import {
  validateAuthenticatedPaidWorkCredentialRotationPlanV1,
} from "../authenticated-paid-work-credential-rotation-v1/index.mjs";
import {
  validateRotationRuntimeRevalidationBindingV1,
  verifyCredentialRotationWithRuntimeRevalidationV1,
} from "../authenticated-paid-work-credential-rotation-v1/runtime-revalidation-binding-guard-v1.mjs";
import {
  snapshotAuthenticatedPaidWorkReplacementIssuanceVerificationInputV1,
} from "../authenticated-paid-work-replacement-issuance-preparation-v1/closed-input-guard-v1.mjs";

export const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_POST_EXPIRY_RECOVERY_PREPARATION_V1";
export const PROTOCOL =
  "void-authenticated-paid-work-post-expiry-recovery-preparation/1";
export const STATUS =
  "source_prepared_post_expiry_recovery_not_authorized";
export const PACKET_PREFIX = "voidapwperp1_";

export const RECOVERY_MAIN =
  "68e3ef3a7c15cf5b3623555979766fadf8b670fe";
export const REPLACEMENT_PREPARATION_MERGE_COMMIT =
  "1f4b6b29fc426b0435668022e8f8162c0fef55ef";
export const ROTATION_MERGE_COMMIT =
  "9d860b668e21c98ad19e63b2c32b463025f05310";
export const RUNTIME_REVALIDATION_MERGE_COMMIT =
  "d12b4620cb5a6e199a6a59f21dfae6dd434c550a";

export const ROTATION_PLAN_ID =
  "voidapwcrp1_bf56e97e7bb2143c79babafed556a41637e2a071d151436aeac9efbf43d3dde0";
export const ROTATION_RUNTIME_BINDING_ID =
  "voidapwcrrb1_bbc79c19f8b74b5bbbce1246fa147aa553f9edd3b93ec5fb76a963fe12d5523c";
export const CURRENT_CREDENTIAL_ID =
  "voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1";
export const CURRENT_BINDING_ID =
  "voidapwcb1_77b02c3c54223062915d1d6b4d9ee0464c575899c164c52502391fff492abf56";
export const AGENT_ID =
  "void-external-agent-e2e-fulfillment-canary-agent-v1";
export const SCOPE = "agent_paid_work_submit";
export const DESTINATION_WC_ACCOUNT =
  "void-external-agent-e2e-fulfillment-canary-v1";
export const ROTATION_BOUNDARY_UTC = "2026-08-05T00:00:00.000Z";
export const MAXIMUM_CREDENTIAL_LIFETIME_DAYS = 30;

export const ORDERED_GATES = Object.freeze([
  "validate_exact_credential_rotation_plan",
  "validate_rotation_runtime_revalidation_companion_contract",
  "verify_rotation_boundary_has_elapsed",
  "verify_old_credential_and_binding_are_expired",
  "record_pre_expiry_runtime_receipt_unavailable",
  "reject_current_runtime_state_or_producer_authentication_claims",
  "prepare_sanitized_post_expiry_recovery_metadata",
  "hold_for_reviewed_canonical_issuance_plan_binding",
  "hold_for_nimo_private_credential_material_generation",
  "hold_for_fresh_review_and_append_only_registry_apply",
  "hold_for_receiver_restart_and_replacement_revalidation",
  "hold_for_expired_old_binding_retirement_evidence",
  "hold_for_replacement_wc_binding_and_closeout",
  "hold_for_fresh_signatures_quote_plan_and_zoso_confirmation",
]);

export const FALSE_AUTHORITY = Object.freeze({
  post_expiry_recovery_execution_authorized: false,
  canonical_issuance_plan_binding_authorized: false,
  private_credential_material_generation_authorized: false,
  credential_issuance_authorized: false,
  credential_review_approval_authorized: false,
  credential_registry_write_authorized: false,
  receiver_restart_authorized: false,
  old_binding_retirement_authorized: false,
  replacement_binding_authorized: false,
  live_authentication_authorized: false,
  paid_work_submission_authorized: false,
  quote_acceptance_authorized: false,
  payment_authority_granted: false,
  payment_execution_authorized: false,
  work_dispatch_authorized: false,
  work_credit_write_authorized: false,
  wallet_or_signer_access_authorized: false,
  signing_authorized: false,
  transaction_construction_authorized: false,
  transaction_broadcast_authorized: false,
  fund_movement_authorized: false,
});

const INPUT_KEYS = [
  "current_runtime_state_established",
  "observed_at_utc",
  "pre_expiry_runtime_receipt_available",
  "producer_authentication_established",
  "proposed_expires_at_utc",
  "proposed_not_before_utc",
  "rotation_plan",
  "rotation_runtime_binding",
];
const PACKET_KEYS = [
  "authority",
  "decision",
  "evidence_gap",
  "marker",
  "ordered_gates",
  "packet_id",
  "protocol",
  "recovery_request",
  "rotation",
  "source",
  "status",
  "version",
];
const SOURCE_KEYS = [
  "recovery_main",
  "replacement_preparation_merge_commit",
  "repository",
  "rotation_merge_commit",
  "runtime_revalidation_merge_commit",
];
const ROTATION_KEYS = [
  "agent_id",
  "binding_expired_at_observation",
  "current_binding_id",
  "current_credential_id",
  "credential_expired_at_observation",
  "destination_wc_account",
  "old_binding_retirement_required_before_replacement_binding",
  "rotation_boundary_utc",
  "rotation_plan_id",
  "rotation_runtime_binding_id",
  "scope",
];
const EVIDENCE_GAP_KEYS = [
  "current_runtime_state_established",
  "gap_classification",
  "observed_at_utc",
  "pre_expiry_runtime_receipt_available",
  "producer_authentication_established",
  "runtime_receipt_id",
  "trusted_context_binding_id",
];
const RECOVERY_REQUEST_KEYS = [
  "agent_id",
  "canonical_issuance_marker",
  "canonical_issuance_plan_binding_required",
  "canonical_issuance_plan_id",
  "canonical_issuance_plan_prefix",
  "destination_wc_account",
  "maximum_credential_lifetime_days",
  "private_credential_material_generated",
  "proposed_expires_at_utc",
  "proposed_not_before_utc",
  "replacement_credential_id",
  "replacement_credential_must_differ",
  "review_policy_id",
  "rotation_plan_id_not_accepted_as_canonical_issuance_plan",
  "scope",
  "storage_policy",
];
const DECISION_KEYS = [
  "canonical_issuance_plan_binding_resolved",
  "credential_registry_write_completed",
  "execution_authorized",
  "expired_boundary_verified",
  "fresh_signatures_quote_plan_confirmation_ready",
  "old_binding_retired",
  "post_expiry_recovery_metadata_prepared",
  "private_credential_material_generated",
  "receiver_revalidated",
  "replacement_binding_applied",
  "replacement_credential_id_resolved",
  "sanitized_canonical_issuance_request_prepared",
  "status",
];

const PACKET_ID_RE = /^voidapwperp1_[a-f0-9]{64}$/;
const COMMIT_RE = /^[a-f0-9]{40}$/;
const UTC_RE = /^\d{4}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const RAW_CREDENTIAL_RE =
  /voidapwc1\.[A-Za-z0-9._:-]{3,180}\.[A-Za-z0-9_-]{20,}/;

function fail(message) {
  throw new Error(message);
}

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label}_must_be_object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(requireRecord(value, label)).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label}_keys_mismatch`);
  }
}

function parseUtc(value, label) {
  if (typeof value !== "string" || !UTC_RE.test(value)) {
    fail(`${label}_must_be_iso_utc_milliseconds`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    fail(`${label}_invalid_utc`);
  }
  return { text: value, milliseconds };
}

function parseFlexibleUtc(value, label) {
  if (typeof value !== "string") fail(`${label}_must_be_string`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) fail(`${label}_invalid_utc`);
  return milliseconds;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort()) {
      output[key] = canonicalValue(value[key]);
    }
    return output;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function unsignedPacket(packet) {
  const body = structuredClone(packet);
  delete body.packet_id;
  return body;
}

export function computePostExpiryRecoveryPreparationPacketIdV1(packet) {
  return `${PACKET_PREFIX}${sha256Hex(canonicalJson(unsignedPacket(packet)))}`;
}

function assertNoPrivateMaterial(value) {
  const prohibitedKeys = new Set([
    "token",
    "raw_token",
    "credential_token",
    "authorization",
    "authorization_header",
    "private_key",
    "mnemonic",
    "seed_phrase",
    "secret_value",
  ]);
  const walk = (node, label = "$") => {
    if (typeof node === "string") {
      if (RAW_CREDENTIAL_RE.test(node)) {
        fail(`raw_credential_material_detected_at_${label}`);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, `${label}[${index}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (prohibitedKeys.has(normalized)) {
        fail(`prohibited_private_material_key_at_${label}.${key}`);
      }
      walk(child, `${label}.${key}`);
    }
  };
  walk(value);
}

function validateFalseAuthority(value) {
  exactKeys(value, Object.keys(FALSE_AUTHORITY), "authority");
  for (const [key, expected] of Object.entries(FALSE_AUTHORITY)) {
    if (value[key] !== expected) fail(`authority_${key}_mismatch`);
  }
}

function validateInput(value) {
  const input =
    snapshotAuthenticatedPaidWorkReplacementIssuanceVerificationInputV1(
      value,
      "$postExpiryRecoveryInput",
    );
  exactKeys(input, INPUT_KEYS, "input");
  if (input.pre_expiry_runtime_receipt_available !== false) {
    fail("pre_expiry_runtime_receipt_must_be_unavailable");
  }
  if (input.current_runtime_state_established !== false) {
    fail("current_runtime_state_must_remain_unestablished");
  }
  if (input.producer_authentication_established !== false) {
    fail("producer_authentication_must_remain_unestablished");
  }
  return input;
}

export function validateAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
  value,
) {
  const packet = requireRecord(value, "packet");
  exactKeys(packet, PACKET_KEYS, "packet");
  if (
    packet.marker !== MARKER ||
    packet.protocol !== PROTOCOL ||
    packet.version !== 1 ||
    packet.status !== STATUS
  ) {
    fail("packet_identity_mismatch");
  }
  if (typeof packet.packet_id !== "string" || !PACKET_ID_RE.test(packet.packet_id)) {
    fail("packet_id_invalid");
  }

  const source = requireRecord(packet.source, "source");
  exactKeys(source, SOURCE_KEYS, "source");
  if (source.repository !== "6ZoSo9/void-node") fail("repository_mismatch");
  for (const key of [
    "recovery_main",
    "replacement_preparation_merge_commit",
    "rotation_merge_commit",
    "runtime_revalidation_merge_commit",
  ]) {
    if (!COMMIT_RE.test(source[key])) fail(`source_${key}_invalid`);
  }
  if (source.recovery_main !== RECOVERY_MAIN) fail("recovery_main_mismatch");
  if (
    source.replacement_preparation_merge_commit !==
    REPLACEMENT_PREPARATION_MERGE_COMMIT
  ) {
    fail("replacement_preparation_merge_commit_mismatch");
  }
  if (source.rotation_merge_commit !== ROTATION_MERGE_COMMIT) {
    fail("rotation_merge_commit_mismatch");
  }
  if (
    source.runtime_revalidation_merge_commit !==
    RUNTIME_REVALIDATION_MERGE_COMMIT
  ) {
    fail("runtime_revalidation_merge_commit_mismatch");
  }

  const rotation = requireRecord(packet.rotation, "rotation");
  exactKeys(rotation, ROTATION_KEYS, "rotation");
  if (rotation.rotation_plan_id !== ROTATION_PLAN_ID) {
    fail("rotation_plan_id_mismatch");
  }
  if (rotation.rotation_runtime_binding_id !== ROTATION_RUNTIME_BINDING_ID) {
    fail("rotation_runtime_binding_id_mismatch");
  }
  if (rotation.current_credential_id !== CURRENT_CREDENTIAL_ID) {
    fail("current_credential_id_mismatch");
  }
  if (rotation.current_binding_id !== CURRENT_BINDING_ID) {
    fail("current_binding_id_mismatch");
  }
  if (rotation.agent_id !== AGENT_ID) fail("agent_id_mismatch");
  if (rotation.scope !== SCOPE) fail("scope_mismatch");
  if (rotation.destination_wc_account !== DESTINATION_WC_ACCOUNT) {
    fail("destination_wc_account_mismatch");
  }
  if (rotation.rotation_boundary_utc !== ROTATION_BOUNDARY_UTC) {
    fail("rotation_boundary_mismatch");
  }
  if (rotation.credential_expired_at_observation !== true) {
    fail("credential_expiry_not_verified");
  }
  if (rotation.binding_expired_at_observation !== true) {
    fail("binding_expiry_not_verified");
  }
  if (
    rotation.old_binding_retirement_required_before_replacement_binding !== true
  ) {
    fail("old_binding_retirement_order_required");
  }

  const gap = requireRecord(packet.evidence_gap, "evidence_gap");
  exactKeys(gap, EVIDENCE_GAP_KEYS, "evidence_gap");
  const observed = parseUtc(gap.observed_at_utc, "observed_at_utc");
  if (observed.milliseconds < Date.parse(ROTATION_BOUNDARY_UTC)) {
    fail("observation_precedes_rotation_boundary");
  }
  if (
    gap.gap_classification !==
    "credential_expired_before_complete_runtime_revalidation"
  ) {
    fail("evidence_gap_classification_mismatch");
  }
  if (gap.pre_expiry_runtime_receipt_available !== false) {
    fail("pre_expiry_runtime_receipt_available_must_be_false");
  }
  if (gap.runtime_receipt_id !== null) {
    fail("runtime_receipt_id_must_be_null");
  }
  if (gap.trusted_context_binding_id !== null) {
    fail("trusted_context_binding_id_must_be_null");
  }
  if (gap.current_runtime_state_established !== false) {
    fail("current_runtime_state_established_must_be_false");
  }
  if (gap.producer_authentication_established !== false) {
    fail("producer_authentication_established_must_be_false");
  }

  const request = requireRecord(packet.recovery_request, "recovery_request");
  exactKeys(request, RECOVERY_REQUEST_KEYS, "recovery_request");
  if (
    request.canonical_issuance_marker !==
    "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_ISSUANCE_V1"
  ) {
    fail("canonical_issuance_marker_mismatch");
  }
  if (
    request.review_policy_id !==
    "void-agent-paid-work-credential-review-policy-v1"
  ) {
    fail("review_policy_id_mismatch");
  }
  if (request.replacement_credential_id !== null) {
    fail("replacement_credential_id_must_be_unresolved");
  }
  if (request.replacement_credential_must_differ !== true) {
    fail("replacement_credential_must_differ_required");
  }
  if (request.canonical_issuance_plan_id !== null) {
    fail("canonical_issuance_plan_id_must_be_unresolved");
  }
  if (request.canonical_issuance_plan_prefix !== "voidapwnlp1_") {
    fail("canonical_issuance_plan_prefix_mismatch");
  }
  if (request.canonical_issuance_plan_binding_required !== true) {
    fail("canonical_issuance_plan_binding_required");
  }
  if (
    request.rotation_plan_id_not_accepted_as_canonical_issuance_plan !== true
  ) {
    fail("rotation_plan_protocol_separation_required");
  }
  if (request.agent_id !== AGENT_ID) fail("recovery_agent_id_mismatch");
  if (request.scope !== SCOPE) fail("recovery_scope_mismatch");
  if (request.destination_wc_account !== DESTINATION_WC_ACCOUNT) {
    fail("recovery_destination_account_mismatch");
  }
  if (
    request.maximum_credential_lifetime_days !==
    MAXIMUM_CREDENTIAL_LIFETIME_DAYS
  ) {
    fail("maximum_credential_lifetime_mismatch");
  }
  if (request.storage_policy !== "nimo_private_only") {
    fail("storage_policy_mismatch");
  }
  if (request.private_credential_material_generated !== false) {
    fail("private_credential_material_generated_must_be_false");
  }
  const notBefore = parseUtc(
    request.proposed_not_before_utc,
    "proposed_not_before_utc",
  );
  const expires = parseUtc(
    request.proposed_expires_at_utc,
    "proposed_expires_at_utc",
  );
  if (notBefore.milliseconds < observed.milliseconds) {
    fail("replacement_not_before_precedes_recovery_observation");
  }
  if (expires.milliseconds <= notBefore.milliseconds) {
    fail("replacement_expiry_must_follow_not_before");
  }
  const maximumLifetime =
    MAXIMUM_CREDENTIAL_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
  if (expires.milliseconds - notBefore.milliseconds > maximumLifetime) {
    fail("replacement_lifetime_exceeds_review_policy");
  }

  if (canonicalJson(packet.ordered_gates) !== canonicalJson(ORDERED_GATES)) {
    fail("ordered_gates_mismatch");
  }

  const decision = requireRecord(packet.decision, "decision");
  exactKeys(decision, DECISION_KEYS, "decision");
  if (
    decision.status !==
    "HOLD_PENDING_CANONICAL_ISSUANCE_PLAN_BINDING_AND_PRIVATE_ROTATION"
  ) {
    fail("decision_status_mismatch");
  }
  if (decision.expired_boundary_verified !== true) {
    fail("expired_boundary_verified_required");
  }
  if (decision.post_expiry_recovery_metadata_prepared !== true) {
    fail("post_expiry_recovery_metadata_prepared_required");
  }
  for (const key of [
    "canonical_issuance_plan_binding_resolved",
    "sanitized_canonical_issuance_request_prepared",
    "private_credential_material_generated",
    "replacement_credential_id_resolved",
    "credential_registry_write_completed",
    "receiver_revalidated",
    "old_binding_retired",
    "replacement_binding_applied",
    "fresh_signatures_quote_plan_confirmation_ready",
    "execution_authorized",
  ]) {
    if (decision[key] !== false) fail(`decision_${key}_must_be_false`);
  }

  validateFalseAuthority(packet.authority);
  assertNoPrivateMaterial(packet);

  if (
    packet.packet_id !==
    computePostExpiryRecoveryPreparationPacketIdV1(packet)
  ) {
    fail("packet_id_derivation_mismatch");
  }
  return packet;
}

export function buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
  value,
) {
  const input = validateInput(value);
  const rotationPlan =
    validateAuthenticatedPaidWorkCredentialRotationPlanV1(input.rotation_plan);
  const rotationRuntimeBinding =
    validateRotationRuntimeRevalidationBindingV1(
      input.rotation_runtime_binding,
    );
  verifyCredentialRotationWithRuntimeRevalidationV1(
    rotationPlan,
    rotationRuntimeBinding,
  );

  if (rotationPlan.plan_id !== ROTATION_PLAN_ID) {
    fail("input_rotation_plan_id_mismatch");
  }
  if (rotationRuntimeBinding.binding_id !== ROTATION_RUNTIME_BINDING_ID) {
    fail("input_rotation_runtime_binding_id_mismatch");
  }
  if (rotationPlan.current_credential.credential_id !== CURRENT_CREDENTIAL_ID) {
    fail("input_current_credential_id_mismatch");
  }
  if (rotationPlan.current_binding.binding_id !== CURRENT_BINDING_ID) {
    fail("input_current_binding_id_mismatch");
  }
  if (rotationPlan.current_credential.agent_id !== AGENT_ID) {
    fail("input_agent_id_mismatch");
  }
  if (rotationPlan.current_credential.scope !== SCOPE) {
    fail("input_scope_mismatch");
  }
  if (
    rotationPlan.current_binding.destination_wc_account !==
    DESTINATION_WC_ACCOUNT
  ) {
    fail("input_destination_wc_account_mismatch");
  }

  const observed = parseUtc(input.observed_at_utc, "observed_at_utc");
  const boundary = Date.parse(ROTATION_BOUNDARY_UTC);
  if (observed.milliseconds < boundary) {
    fail("observation_precedes_rotation_boundary");
  }
  if (
    parseFlexibleUtc(
      rotationPlan.current_credential.expires_at_utc,
      "current_credential_expires_at_utc",
    ) !== boundary
  ) {
    fail("input_credential_boundary_mismatch");
  }
  if (
    parseFlexibleUtc(
      rotationPlan.current_binding.valid_until_utc,
      "current_binding_valid_until_utc",
    ) !== boundary
  ) {
    fail("input_binding_boundary_mismatch");
  }

  const notBefore = parseUtc(
    input.proposed_not_before_utc,
    "proposed_not_before_utc",
  );
  const expires = parseUtc(
    input.proposed_expires_at_utc,
    "proposed_expires_at_utc",
  );
  if (notBefore.milliseconds < observed.milliseconds) {
    fail("replacement_not_before_precedes_recovery_observation");
  }
  if (expires.milliseconds <= notBefore.milliseconds) {
    fail("replacement_expiry_must_follow_not_before");
  }
  const maximumLifetime =
    MAXIMUM_CREDENTIAL_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
  if (expires.milliseconds - notBefore.milliseconds > maximumLifetime) {
    fail("replacement_lifetime_exceeds_review_policy");
  }

  const body = {
    marker: MARKER,
    protocol: PROTOCOL,
    version: 1,
    status: STATUS,
    source: {
      repository: "6ZoSo9/void-node",
      recovery_main: RECOVERY_MAIN,
      replacement_preparation_merge_commit:
        REPLACEMENT_PREPARATION_MERGE_COMMIT,
      rotation_merge_commit: ROTATION_MERGE_COMMIT,
      runtime_revalidation_merge_commit:
        RUNTIME_REVALIDATION_MERGE_COMMIT,
    },
    rotation: {
      rotation_plan_id: ROTATION_PLAN_ID,
      rotation_runtime_binding_id: ROTATION_RUNTIME_BINDING_ID,
      current_credential_id: CURRENT_CREDENTIAL_ID,
      current_binding_id: CURRENT_BINDING_ID,
      agent_id: AGENT_ID,
      scope: SCOPE,
      destination_wc_account: DESTINATION_WC_ACCOUNT,
      rotation_boundary_utc: ROTATION_BOUNDARY_UTC,
      credential_expired_at_observation: true,
      binding_expired_at_observation: true,
      old_binding_retirement_required_before_replacement_binding: true,
    },
    evidence_gap: {
      observed_at_utc: observed.text,
      gap_classification:
        "credential_expired_before_complete_runtime_revalidation",
      pre_expiry_runtime_receipt_available: false,
      runtime_receipt_id: null,
      trusted_context_binding_id: null,
      current_runtime_state_established: false,
      producer_authentication_established: false,
    },
    recovery_request: {
      canonical_issuance_marker:
        "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_ISSUANCE_V1",
      review_policy_id:
        "void-agent-paid-work-credential-review-policy-v1",
      replacement_credential_id: null,
      replacement_credential_must_differ: true,
      canonical_issuance_plan_id: null,
      canonical_issuance_plan_prefix: "voidapwnlp1_",
      canonical_issuance_plan_binding_required: true,
      rotation_plan_id_not_accepted_as_canonical_issuance_plan: true,
      agent_id: AGENT_ID,
      scope: SCOPE,
      destination_wc_account: DESTINATION_WC_ACCOUNT,
      proposed_not_before_utc: notBefore.text,
      proposed_expires_at_utc: expires.text,
      maximum_credential_lifetime_days:
        MAXIMUM_CREDENTIAL_LIFETIME_DAYS,
      storage_policy: "nimo_private_only",
      private_credential_material_generated: false,
    },
    ordered_gates: ORDERED_GATES,
    decision: {
      status:
        "HOLD_PENDING_CANONICAL_ISSUANCE_PLAN_BINDING_AND_PRIVATE_ROTATION",
      expired_boundary_verified: true,
      post_expiry_recovery_metadata_prepared: true,
      canonical_issuance_plan_binding_resolved: false,
      sanitized_canonical_issuance_request_prepared: false,
      private_credential_material_generated: false,
      replacement_credential_id_resolved: false,
      credential_registry_write_completed: false,
      receiver_revalidated: false,
      old_binding_retired: false,
      replacement_binding_applied: false,
      fresh_signatures_quote_plan_confirmation_ready: false,
      execution_authorized: false,
    },
    authority: FALSE_AUTHORITY,
  };
  return validateAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1({
    ...body,
    packet_id: `${PACKET_PREFIX}${sha256Hex(canonicalJson(body))}`,
  });
}
