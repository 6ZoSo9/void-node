import { createHash } from "node:crypto";

import {
  validateAuthenticatedPaidWorkCredentialRotationPlanV1,
} from "../authenticated-paid-work-credential-rotation-v1/index.mjs";
import {
  validateRotationRuntimeRevalidationBindingV1,
  verifyCredentialRotationWithRuntimeRevalidationV1,
} from "../authenticated-paid-work-credential-rotation-v1/runtime-revalidation-binding-guard-v1.mjs";
import {
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1,
} from "../authenticated-paid-work-runtime-revalidation-v1/index.mjs";
import {
  verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1,
} from "../authenticated-paid-work-runtime-revalidation-v1/trusted-context-binding-guard-v1.mjs";

export const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_PREPARATION_V1";
export const PROTOCOL =
  "void-authenticated-paid-work-replacement-issuance-preparation/1";
export const STATUS = "source_prepared_private_issuance_not_authorized";
export const PACKET_PREFIX = "voidapwrip1_";
export const PREPARATION_MAIN =
  "9d860b668e21c98ad19e63b2c32b463025f05310";
export const ROTATION_PLAN_ID =
  "voidapwcrp1_bf56e97e7bb2143c79babafed556a41637e2a071d151436aeac9efbf43d3dde0";
export const ROTATION_RUNTIME_BINDING_ID =
  "voidapwcrrb1_bbc79c19f8b74b5bbbce1246fa147aa553f9edd3b93ec5fb76a963fe12d5523c";
export const CURRENT_CREDENTIAL_ID =
  "voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1";
export const AGENT_ID =
  "void-external-agent-e2e-fulfillment-canary-agent-v1";
export const SCOPE = "agent_paid_work_submit";
export const DESTINATION_WC_ACCOUNT =
  "void-external-agent-e2e-fulfillment-canary-v1";
export const ROTATION_BOUNDARY_UTC = "2026-08-05T00:00:00.000Z";
export const MAXIMUM_CREDENTIAL_LIFETIME_DAYS = 30;

export const ORDERED_GATES = Object.freeze([
  "validate_exact_credential_rotation_plan",
  "validate_rotation_runtime_revalidation_companion",
  "validate_sanitized_runtime_revalidation_receipt",
  "validate_exact_trusted_context_binding",
  "verify_replacement_identity_remains_unresolved_and_distinct",
  "verify_replacement_scope_account_and_bounded_lifetime",
  "prepare_sanitized_canonical_remote_issuance_request",
  "hold_for_nimo_private_credential_material_generation",
  "hold_for_fresh_review_and_append_only_registry_apply",
  "hold_for_receiver_restart_and_replacement_revalidation",
  "hold_until_old_binding_retirement_is_permitted",
  "hold_for_replacement_wc_binding_and_closeout",
  "hold_for_fresh_signatures_quote_plan_and_zoso_confirmation",
]);

export const FALSE_AUTHORITY = Object.freeze({
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

const PACKET_KEYS = [
  "authority",
  "decision",
  "evidence",
  "marker",
  "ordered_gates",
  "packet_id",
  "protocol",
  "replacement_request",
  "rotation",
  "source",
  "status",
  "version",
];
const SOURCE_KEYS = [
  "preparation_main",
  "repository",
  "rotation_merge_commit",
  "runtime_revalidation_merge_commit",
];
const ROTATION_KEYS = [
  "current_credential_id",
  "destination_wc_account",
  "old_binding_retirement_required_before_replacement_binding",
  "rotation_boundary_utc",
  "rotation_plan_id",
  "rotation_runtime_binding_id",
];
const EVIDENCE_KEYS = [
  "bundle_contents_disclosed",
  "contracts_validated",
  "current_runtime_state_established",
  "evaluated_at_utc",
  "private_path_disclosed",
  "producer_authentication_established",
  "runtime_receipt_id",
  "secret_material_disclosed",
  "trusted_context_binding_id",
];
const REQUEST_KEYS = [
  "agent_id",
  "canonical_issuance_marker",
  "destination_wc_account",
  "maximum_credential_lifetime_days",
  "private_credential_material_generated",
  "proposed_expires_at_utc",
  "proposed_not_before_utc",
  "replacement_credential_id",
  "replacement_credential_must_differ",
  "review_policy_id",
  "scope",
  "storage_policy",
];
const DECISION_KEYS = [
  "credential_registry_write_completed",
  "evidence_contracts_validated",
  "execution_authorized",
  "fresh_signatures_quote_plan_confirmation_ready",
  "old_binding_retired",
  "private_credential_material_generated",
  "receiver_revalidated",
  "replacement_binding_applied",
  "replacement_credential_id_resolved",
  "sanitized_issuance_request_prepared",
  "status",
];

const COMMIT_RE = /^[a-f0-9]{40}$/;
const PACKET_ID_RE = /^voidapwrip1_[a-f0-9]{64}$/;
const RECEIPT_ID_RE = /^voidapwrr1_[a-f0-9]{64}$/;
const TRUSTED_BINDING_ID_RE = /^voidapwrtcb1_[a-f0-9]{64}$/;
const UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
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

function requireString(value, label, pattern = null) {
  if (typeof value !== "string" || value !== value.trim() || value.length === 0) {
    fail(`${label}_must_be_trimmed_string`);
  }
  if (pattern && !pattern.test(value)) fail(`${label}_format_mismatch`);
  return value;
}

function requireUtc(value, label) {
  const text = requireString(value, label, UTC_RE);
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== text) {
    fail(`${label}_invalid_utc`);
  }
  return { text, milliseconds: parsed };
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

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function unsignedPacket(packet) {
  const body = structuredClone(packet);
  delete body.packet_id;
  return body;
}

export function computeReplacementIssuancePreparationPacketIdV1(packet) {
  return `${PACKET_PREFIX}${sha256Hex(canonicalJson(unsignedPacket(packet)))}`;
}

function assertNoPrivateCredentialMaterial(value) {
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

export function validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(
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
  requireString(packet.packet_id, "packet_id", PACKET_ID_RE);

  const source = requireRecord(packet.source, "source");
  exactKeys(source, SOURCE_KEYS, "source");
  if (source.repository !== "6ZoSo9/void-node") fail("repository_mismatch");
  if (
    source.preparation_main !== PREPARATION_MAIN ||
    !COMMIT_RE.test(source.preparation_main)
  ) {
    fail("preparation_main_mismatch");
  }
  if (source.rotation_merge_commit !== PREPARATION_MAIN) {
    fail("rotation_merge_commit_mismatch");
  }
  if (
    source.runtime_revalidation_merge_commit !==
    "d12b4620cb5a6e199a6a59f21dfae6dd434c550a"
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
  if (rotation.destination_wc_account !== DESTINATION_WC_ACCOUNT) {
    fail("destination_wc_account_mismatch");
  }
  if (rotation.rotation_boundary_utc !== ROTATION_BOUNDARY_UTC) {
    fail("rotation_boundary_mismatch");
  }
  if (
    rotation.old_binding_retirement_required_before_replacement_binding !== true
  ) {
    fail("old_binding_retirement_order_required");
  }

  const evidence = requireRecord(packet.evidence, "evidence");
  exactKeys(evidence, EVIDENCE_KEYS, "evidence");
  requireString(evidence.runtime_receipt_id, "runtime_receipt_id", RECEIPT_ID_RE);
  requireString(
    evidence.trusted_context_binding_id,
    "trusted_context_binding_id",
    TRUSTED_BINDING_ID_RE,
  );
  requireUtc(evidence.evaluated_at_utc, "evidence_evaluated_at_utc");
  if (evidence.contracts_validated !== true) {
    fail("evidence_contracts_validated_required");
  }
  for (const key of [
    "producer_authentication_established",
    "current_runtime_state_established",
    "private_path_disclosed",
    "bundle_contents_disclosed",
    "secret_material_disclosed",
  ]) {
    if (evidence[key] !== false) fail(`evidence_${key}_must_be_false`);
  }

  const request = requireRecord(packet.replacement_request, "replacement_request");
  exactKeys(request, REQUEST_KEYS, "replacement_request");
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
  if (request.agent_id !== AGENT_ID) fail("replacement_agent_id_mismatch");
  if (request.scope !== SCOPE) fail("replacement_scope_mismatch");
  if (request.destination_wc_account !== DESTINATION_WC_ACCOUNT) {
    fail("replacement_destination_account_mismatch");
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

  const notBefore = requireUtc(
    request.proposed_not_before_utc,
    "proposed_not_before_utc",
  );
  const expires = requireUtc(
    request.proposed_expires_at_utc,
    "proposed_expires_at_utc",
  );
  const observed = requireUtc(
    evidence.evaluated_at_utc,
    "evidence_evaluated_at_utc",
  );
  if (notBefore.milliseconds < observed.milliseconds) {
    fail("replacement_not_before_precedes_runtime_observation");
  }
  if (expires.milliseconds <= notBefore.milliseconds) {
    fail("replacement_expiry_must_follow_not_before");
  }
  const maxLifetimeMs =
    MAXIMUM_CREDENTIAL_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
  if (expires.milliseconds - notBefore.milliseconds > maxLifetimeMs) {
    fail("replacement_lifetime_exceeds_review_policy");
  }

  if (
    !Array.isArray(packet.ordered_gates) ||
    JSON.stringify(packet.ordered_gates) !== JSON.stringify(ORDERED_GATES)
  ) {
    fail("ordered_gate_sequence_mismatch");
  }

  const decision = requireRecord(packet.decision, "decision");
  exactKeys(decision, DECISION_KEYS, "decision");
  if (
    decision.status !==
    "HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION"
  ) {
    fail("decision_status_mismatch");
  }
  if (decision.evidence_contracts_validated !== true) {
    fail("decision_evidence_contracts_validated_required");
  }
  if (decision.sanitized_issuance_request_prepared !== true) {
    fail("decision_sanitized_request_prepared_required");
  }
  for (const key of [
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
  assertNoPrivateCredentialMaterial(packet);

  if (
    packet.packet_id !==
    computeReplacementIssuancePreparationPacketIdV1(packet)
  ) {
    fail("packet_id_derivation_mismatch");
  }
  return packet;
}

export function buildAuthenticatedPaidWorkReplacementIssuancePreparationV1(
  input,
) {
  const rotationPlan = validateAuthenticatedPaidWorkCredentialRotationPlanV1(
    input.rotation_plan,
  );
  const rotationBinding = validateRotationRuntimeRevalidationBindingV1(
    input.rotation_runtime_binding,
  );
  verifyCredentialRotationWithRuntimeRevalidationV1(
    rotationPlan,
    rotationBinding,
  );
  const runtimeReceipt =
    validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(
      input.runtime_receipt,
    );
  verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1(
    runtimeReceipt,
    input.trusted_context_binding,
  );

  if (rotationPlan.plan_id !== ROTATION_PLAN_ID) {
    fail("unexpected_rotation_plan");
  }
  if (rotationBinding.binding_id !== ROTATION_RUNTIME_BINDING_ID) {
    fail("unexpected_rotation_runtime_binding");
  }
  if (
    runtimeReceipt.credential.selected_credential_id !== CURRENT_CREDENTIAL_ID
  ) {
    fail("runtime_receipt_current_credential_mismatch");
  }

  const body = {
    marker: MARKER,
    protocol: PROTOCOL,
    version: 1,
    status: STATUS,
    source: {
      repository: "6ZoSo9/void-node",
      preparation_main: PREPARATION_MAIN,
      rotation_merge_commit: PREPARATION_MAIN,
      runtime_revalidation_merge_commit:
        "d12b4620cb5a6e199a6a59f21dfae6dd434c550a",
    },
    rotation: {
      rotation_plan_id: rotationPlan.plan_id,
      rotation_runtime_binding_id: rotationBinding.binding_id,
      current_credential_id: CURRENT_CREDENTIAL_ID,
      destination_wc_account: DESTINATION_WC_ACCOUNT,
      rotation_boundary_utc: ROTATION_BOUNDARY_UTC,
      old_binding_retirement_required_before_replacement_binding: true,
    },
    evidence: {
      runtime_receipt_id: runtimeReceipt.receipt_id,
      trusted_context_binding_id: input.trusted_context_binding.binding_id,
      evaluated_at_utc: runtimeReceipt.observation.evaluated_at_utc,
      contracts_validated: true,
      producer_authentication_established: false,
      current_runtime_state_established: false,
      private_path_disclosed: false,
      bundle_contents_disclosed: false,
      secret_material_disclosed: false,
    },
    replacement_request: {
      canonical_issuance_marker:
        "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_ISSUANCE_V1",
      review_policy_id: "void-agent-paid-work-credential-review-policy-v1",
      replacement_credential_id: null,
      replacement_credential_must_differ: true,
      agent_id: AGENT_ID,
      scope: SCOPE,
      destination_wc_account: DESTINATION_WC_ACCOUNT,
      proposed_not_before_utc: input.proposed_not_before_utc,
      proposed_expires_at_utc: input.proposed_expires_at_utc,
      maximum_credential_lifetime_days: MAXIMUM_CREDENTIAL_LIFETIME_DAYS,
      storage_policy: "nimo_private_only",
      private_credential_material_generated: false,
    },
    ordered_gates: [...ORDERED_GATES],
    decision: {
      status: "HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION",
      evidence_contracts_validated: true,
      sanitized_issuance_request_prepared: true,
      private_credential_material_generated: false,
      replacement_credential_id_resolved: false,
      credential_registry_write_completed: false,
      receiver_revalidated: false,
      old_binding_retired: false,
      replacement_binding_applied: false,
      fresh_signatures_quote_plan_confirmation_ready: false,
      execution_authorized: false,
    },
    authority: { ...FALSE_AUTHORITY },
  };
  return validateAuthenticatedPaidWorkReplacementIssuancePreparationV1({
    ...body,
    packet_id: `${PACKET_PREFIX}${sha256Hex(canonicalJson(body))}`,
  });
}
