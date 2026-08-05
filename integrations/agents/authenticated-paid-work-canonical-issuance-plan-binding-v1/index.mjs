import { createHash } from "node:crypto";

import {
  validateAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1,
} from "../authenticated-paid-work-post-expiry-recovery-preparation-v1/index.mjs";
import {
  snapshotAuthenticatedPaidWorkReplacementIssuanceVerificationInputV1,
} from "../authenticated-paid-work-replacement-issuance-preparation-v1/closed-input-guard-v1.mjs";
import {
  FALSE_AUTHORITY as CANONICAL_REQUEST_FALSE_AUTHORITY,
  REQUEST_MARKER,
  contentIdV1,
  validateRequestV1,
} from "../../../scripts/agent_paid_work_canonical_remote_credential_issuance_v1.mjs";

export const MARKER = "VOID_AUTHENTICATED_PAID_WORK_CANONICAL_ISSUANCE_PLAN_BINDING_V1";
export const PLAN_PREFIX = "voidapwnlp1_";
export const POST_EXPIRY_RECOVERY_PACKET_ID =
  "voidapwperp1_aac6114795a5b97a8f79034ca67ae2c98a54298bdab7ba9055fcb9346cf8892f";
export const PRIVATE_RUNTIME_RECONCILIATION_ID =
  "voidapwprmr1_e3d676f29fe53fd322a75e15c20b9dcc1208c16fe0c849ab48be2eac8a6ef35c";
export const PROPOSED_NOT_BEFORE_UTC = "2026-08-05T02:00:00.000Z";
export const CANONICAL_REQUEST_EXPIRES_AT_UTC = "2026-08-12T02:00:00Z";

const PLAN_ID_RE = /^voidapwnlp1_[a-f0-9]{64}$/;
const RECONCILIATION_ID_RE = /^voidapwprmr1_[a-f0-9]{64}$/;
const UTC_MILLISECONDS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const UTC_SECONDS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const RAW_CREDENTIAL_RE = /voidapwc1\.[A-Za-z0-9._:-]{3,180}\.[A-Za-z0-9_-]{20,}/;

export const FALSE_AUTHORITY = Object.freeze({
  "canonical_issuance_plan_selection_authorized": false,
  "operator_request_file_write_authorized": false,
  "private_material_generation_authorized": false,
  "credential_review_approval_authorized": false,
  "credential_registry_write_authorized": false,
  "service_restart_authorized": false,
  "old_binding_retirement_authorized": false,
  "replacement_binding_authorized": false,
  "authentication_authorized": false,
  "paid_work_submission_authorized": false,
  "paid_work_submission_retry_authorized": false,
  "quote_acceptance_authorized": false,
  "payment_authority_granted": false,
  "payment_execution_authorized": false,
  "work_execution_authorized": false,
  "work_dispatch_authorized": false,
  "work_credit_write_authorized": false,
  "wc_to_void_settlement_authorized": false,
  "wallet_or_signer_access_authorized": false,
  "signing_authorized": false,
  "transaction_construction_authorized": false,
  "transaction_broadcast_authorized": false,
  "deployment_authorized": false,
  "fund_movement_authorized": false
});
const EXPECTED_PLAN_BODY = Object.freeze({
  "marker": "VOID_AUTHENTICATED_PAID_WORK_CANONICAL_ISSUANCE_PLAN_BINDING_V1",
  "protocol": "void-authenticated-paid-work-canonical-issuance-plan-binding/1",
  "version": 1,
  "status": "source_plan_bound_request_not_authorized",
  "source": {
    "repository": "6ZoSo9/void-node",
    "plan_source_main": "66bb6113f0164872a9a40dd4837bdfe9dc9c7e6b",
    "post_expiry_recovery_merge_commit": "19a637eaa5d3c4986c922dea214a7c66ed824ca3",
    "private_runtime_revalidation_merge_commit": "7dc10098a87dee5e27a558ef73a5ea3c52479f99",
    "canonical_issuance_module_path": "scripts/agent_paid_work_canonical_remote_credential_issuance_v1.mjs",
    "canonical_issuance_module_blob_sha": "7f72f5ca4fda5dd7d122866ce76d79ad00662a4e",
    "review_policy_path": "fixtures/agent-paid-work/credential-request-review-policy-v1.example.json",
    "review_policy_blob_sha": "449cc17976ed7e1047480a9120d6ef59ef080ca8"
  },
  "evidence": {
    "post_expiry_recovery_packet_id": "voidapwperp1_aac6114795a5b97a8f79034ca67ae2c98a54298bdab7ba9055fcb9346cf8892f",
    "private_runtime_reconciliation_id": "voidapwprmr1_e3d676f29fe53fd322a75e15c20b9dcc1208c16fe0c849ab48be2eac8a6ef35c",
    "post_expiry_recovery_packet_validated": true,
    "private_runtime_reconciliation_validated": true,
    "pre_expiry_runtime_receipt_available": false,
    "current_runtime_state_established": false,
    "producer_authentication_established": false,
    "expired_credential_cannot_be_revalidated_as_current": true,
    "rotation_plan_id_accepted_as_canonical_issuance_plan": false
  },
  "request_contract": {
    "canonical_issuance_marker": "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_ISSUANCE_V1",
    "canonical_request_marker": "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_REQUEST_V1",
    "review_policy_id": "void-agent-paid-work-credential-review-policy-v1",
    "maximum_credential_lifetime_days": 30,
    "agent_id": "void-external-agent-e2e-fulfillment-canary-agent-v1",
    "destination_wc_account": "void-external-agent-e2e-fulfillment-canary-v1",
    "scopes": [
      "agent_paid_work_submit"
    ],
    "proposed_not_before_utc": "2026-08-05T02:00:00.000Z",
    "proposed_expires_at_utc": "2026-08-12T02:00:00.000Z",
    "canonical_request_expires_at_utc": "2026-08-12T02:00:00Z",
    "expected_nimo_hostname": "zoso-N153B",
    "replacement_credential_id": null,
    "replacement_credential_must_differ": true,
    "raw_token_generation_authorized": false,
    "private_credential_material_generated": false,
    "old_binding_retirement_required_before_replacement_binding": true
  },
  "operation_confirmations": {
    "token_generation": "generate-agent-paid-work-canonical-remote-credential-token-v1",
    "review_approval": "approve-agent-paid-work-canonical-remote-credential-v1",
    "registry_apply": "apply-agent-paid-work-canonical-remote-credential-issuance-v1",
    "binding_retirement": "retire-agent-paid-work-credential-wc-account-binding-v1",
    "replacement_binding": "apply-agent-paid-work-credential-wc-account-binding-v1",
    "receiver_restart_separate_confirmation_required": true,
    "fresh_zoso_canary_confirmation_required": true
  },
  "ordered_gates": [
    "verify_post_expiry_recovery_packet_exact",
    "verify_private_runtime_revalidation_reconciliation_exact",
    "verify_expired_credential_is_not_treated_as_current",
    "bind_exact_agent_scope_destination_and_validity_window",
    "derive_canonical_voidapwnlp1_plan_id_from_closed_body",
    "build_sanitized_canonical_remote_issuance_request_in_memory",
    "obtain_separate_authorization_before_any_operator_file_write",
    "obtain_separate_authorization_before_nimo_private_material_generation",
    "review_replacement_response_and_credential_identity",
    "apply_append_only_credential_registry_update_under_separate_confirmation",
    "restart_receiver_under_separate_authority",
    "compose_listener_credential_replay_and_trusted_context_revalidation",
    "retire_expired_old_binding_with_durable_evidence",
    "bind_replacement_credential_and_verify_one_active_binding",
    "obtain_fresh_signatures_quote_execution_plan_and_zoso_confirmation",
    "make_separate_execution_readiness_decision"
  ],
  "decision": {
    "status": "HOLD_PENDING_SANITIZED_REQUEST_MATERIALIZATION_AND_PRIVATE_ROTATION",
    "canonical_issuance_plan_resolved": true,
    "source_request_contract_ready": true,
    "sanitized_request_materialized": false,
    "private_credential_material_generated": false,
    "replacement_credential_id_resolved": false,
    "credential_registry_write_completed": false,
    "receiver_revalidated": false,
    "old_binding_retired": false,
    "replacement_binding_applied": false,
    "fresh_signatures_quote_plan_confirmation_ready": false,
    "execution_authorized": false,
    "next_gate": "obtain_separate_authorization_to_materialize_sanitized_canonical_issuance_request"
  },
  "authority": {
    "canonical_issuance_plan_selection_authorized": false,
    "operator_request_file_write_authorized": false,
    "private_material_generation_authorized": false,
    "credential_review_approval_authorized": false,
    "credential_registry_write_authorized": false,
    "service_restart_authorized": false,
    "old_binding_retirement_authorized": false,
    "replacement_binding_authorized": false,
    "authentication_authorized": false,
    "paid_work_submission_authorized": false,
    "paid_work_submission_retry_authorized": false,
    "quote_acceptance_authorized": false,
    "payment_authority_granted": false,
    "payment_execution_authorized": false,
    "work_execution_authorized": false,
    "work_dispatch_authorized": false,
    "work_credit_write_authorized": false,
    "wc_to_void_settlement_authorized": false,
    "wallet_or_signer_access_authorized": false,
    "signing_authorized": false,
    "transaction_construction_authorized": false,
    "transaction_broadcast_authorized": false,
    "deployment_authorized": false,
    "fund_movement_authorized": false
  }
});

function fail(message) { throw new Error(message); }

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort()) output[key] = canonicalValue(value[key]);
    return output;
  }
  return value;
}

export function canonicalJson(value) { return JSON.stringify(canonicalValue(value)); }
function sha256Hex(value) { return createHash("sha256").update(value).digest("hex"); }

function parseUtcMilliseconds(value, label) {
  if (typeof value !== "string" || !UTC_MILLISECONDS_RE.test(value))
    fail(`${label}_must_be_iso_utc_milliseconds`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value)
    fail(`${label}_invalid_utc`);
  return milliseconds;
}

function parseUtcSeconds(value, label) {
  if (typeof value !== "string" || !UTC_SECONDS_RE.test(value))
    fail(`${label}_must_be_iso_utc_seconds`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) ||
      new Date(milliseconds).toISOString().replace(".000Z", "Z") !== value)
    fail(`${label}_invalid_utc`);
  return milliseconds;
}

function assertNoPrivateMaterial(value, label) {
  const prohibited = new Set([
    "token", "raw_token", "credential_token", "bearer_token",
    "authorization", "authorization_header", "private_key", "signing_key",
    "mnemonic", "seed_phrase", "secret", "secret_value",
  ]);
  const walk = (node, path = "$") => {
    if (typeof node === "string") {
      if (RAW_CREDENTIAL_RE.test(node)) fail(`${label}_raw_credential_at_${path}`);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, `${path}[${index}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (prohibited.has(normalized)) fail(`${label}_prohibited_key_at_${path}.${key}`);
      walk(child, `${path}.${key}`);
    }
  };
  walk(value);
}

function unsigned(value, idKey) {
  const body = structuredClone(value);
  delete body[idKey];
  return body;
}

export function computeCanonicalIssuancePlanIdV1(plan) {
  return `${PLAN_PREFIX}${sha256Hex(canonicalJson(unsigned(plan, "plan_id")))}`;
}

export function validatePrivateRuntimeRevalidationReconciliationV1(value) {
  const reconciliation =
    snapshotAuthenticatedPaidWorkReplacementIssuanceVerificationInputV1(
      value, "$privateRuntimeReconciliation",
    );
  if (typeof reconciliation.reconciliation_id !== "string" ||
      !RECONCILIATION_ID_RE.test(reconciliation.reconciliation_id))
    fail("private_runtime_reconciliation_id_invalid");
  const derived = `voidapwprmr1_${sha256Hex(canonicalJson(unsigned(reconciliation, "reconciliation_id")))}`;
  if (reconciliation.reconciliation_id !== derived)
    fail("private_runtime_reconciliation_id_derivation_mismatch");
  if (reconciliation.reconciliation_id !== PRIVATE_RUNTIME_RECONCILIATION_ID)
    fail("private_runtime_reconciliation_id_mismatch");
  if (reconciliation.marker !==
      "VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_CURRENT_MAIN_RECONCILIATION_V1")
    fail("private_runtime_reconciliation_marker_mismatch");
  if (reconciliation.semantic_reconciliation?.canonical_issuance_plan_binding_required !== true ||
      reconciliation.semantic_reconciliation?.rotation_plan_id_accepted_as_canonical_issuance_plan !== false ||
      reconciliation.semantic_reconciliation?.expired_credential_cannot_be_revalidated_as_current !== true)
    fail("private_runtime_reconciliation_semantics_mismatch");
  if (reconciliation.decision?.canonical_issuance_plan_resolved !== false ||
      reconciliation.decision?.execution_authorized !== false ||
      reconciliation.decision?.next_gate !==
        "build_or_select_reviewed_canonical_issuance_plan_bound_to_post_expiry_recovery_packet")
    fail("private_runtime_reconciliation_decision_mismatch");
  const authority = reconciliation.authority;
  if (!authority || Object.keys(authority).length !== 18 ||
      Object.entries(authority).some(([key, flag]) => !key.endsWith("_authorized") || flag !== false))
    fail("private_runtime_reconciliation_authority_mismatch");
  assertNoPrivateMaterial(reconciliation, "private_runtime_reconciliation");
  return reconciliation;
}

export function validateAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1(value) {
  const plan = snapshotAuthenticatedPaidWorkReplacementIssuanceVerificationInputV1(
    value, "$canonicalIssuancePlan",
  );
  if (typeof plan.plan_id !== "string" || !PLAN_ID_RE.test(plan.plan_id))
    fail("canonical_issuance_plan_id_invalid");
  if (plan.plan_id !== computeCanonicalIssuancePlanIdV1(plan))
    fail("canonical_issuance_plan_id_derivation_mismatch");
  if (canonicalJson(unsigned(plan, "plan_id")) !== canonicalJson(EXPECTED_PLAN_BODY))
    fail("canonical_issuance_plan_body_mismatch");
  if (Object.keys(plan.authority).length !== Object.keys(FALSE_AUTHORITY).length ||
      Object.entries(plan.authority).some(([key, flag]) => FALSE_AUTHORITY[key] !== flag))
    fail("canonical_issuance_plan_authority_mismatch");
  const proposedExpires = parseUtcMilliseconds(
    plan.request_contract.proposed_expires_at_utc, "proposed_expires_at_utc",
  );
  if (proposedExpires !== parseUtcSeconds(
        plan.request_contract.canonical_request_expires_at_utc,
        "canonical_request_expires_at_utc"))
    fail("canonical_request_expiration_binding_mismatch");
  assertNoPrivateMaterial(plan, "canonical_issuance_plan");
  return plan;
}

export function buildAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1({
  postExpiryRecoveryPacket,
  privateRuntimeReconciliation,
}) {
  const recovery = validateAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    snapshotAuthenticatedPaidWorkReplacementIssuanceVerificationInputV1(
      postExpiryRecoveryPacket, "$postExpiryRecoveryPacket",
    ),
  );
  const reconciliation = validatePrivateRuntimeRevalidationReconciliationV1(
    privateRuntimeReconciliation,
  );
  if (recovery.packet_id !== POST_EXPIRY_RECOVERY_PACKET_ID)
    fail("post_expiry_recovery_packet_id_mismatch");
  if (recovery.recovery_request?.canonical_issuance_plan_id !== null ||
      recovery.recovery_request?.canonical_issuance_plan_prefix !== PLAN_PREFIX ||
      recovery.recovery_request?.canonical_issuance_plan_binding_required !== true ||
      recovery.recovery_request?.rotation_plan_id_not_accepted_as_canonical_issuance_plan !== true)
    fail("post_expiry_recovery_protocol_separation_mismatch");
  if (recovery.recovery_request?.agent_id !== EXPECTED_PLAN_BODY.request_contract.agent_id ||
      recovery.recovery_request?.scope !== EXPECTED_PLAN_BODY.request_contract.scopes[0] ||
      recovery.recovery_request?.destination_wc_account !==
        EXPECTED_PLAN_BODY.request_contract.destination_wc_account ||
      recovery.recovery_request?.proposed_not_before_utc !==
        EXPECTED_PLAN_BODY.request_contract.proposed_not_before_utc ||
      recovery.recovery_request?.proposed_expires_at_utc !==
        EXPECTED_PLAN_BODY.request_contract.proposed_expires_at_utc)
    fail("post_expiry_recovery_request_binding_mismatch");
  if (recovery.evidence_gap?.pre_expiry_runtime_receipt_available !== false ||
      recovery.evidence_gap?.current_runtime_state_established !== false ||
      recovery.evidence_gap?.producer_authentication_established !== false)
    fail("post_expiry_evidence_gap_mismatch");
  if (reconciliation.reconciliation_id !== PRIVATE_RUNTIME_RECONCILIATION_ID)
    fail("private_runtime_reconciliation_id_mismatch");
  const body = structuredClone(EXPECTED_PLAN_BODY);
  return validateAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1({
    ...body,
    plan_id: `${PLAN_PREFIX}${sha256Hex(canonicalJson(body))}`,
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function buildSanitizedCanonicalRemoteCredentialRequestFromPlanV1({
  plan,
  postExpiryRecoveryPacket,
  privateRuntimeReconciliation,
  evaluatedAtUtc,
}) {
  const validatedPlan = validateAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1(plan);
  const rebuilt = buildAuthenticatedPaidWorkCanonicalIssuancePlanBindingV1({
    postExpiryRecoveryPacket, privateRuntimeReconciliation,
  });
  if (canonicalJson(validatedPlan) !== canonicalJson(rebuilt))
    fail("canonical_issuance_plan_evidence_binding_mismatch");
  const evaluated = parseUtcSeconds(evaluatedAtUtc, "evaluated_at_utc");
  if (evaluated < parseUtcMilliseconds(PROPOSED_NOT_BEFORE_UTC, "proposed_not_before_utc"))
    fail("request_evaluation_precedes_not_before");
  if (evaluated >= parseUtcSeconds(
        CANONICAL_REQUEST_EXPIRES_AT_UTC, "canonical_request_expires_at_utc"))
    fail("request_evaluation_at_or_after_expiration");
  const core = {
    marker: REQUEST_MARKER,
    version: 1,
    plan_id: validatedPlan.plan_id,
    agent_id: validatedPlan.request_contract.agent_id,
    destination_wc_account: validatedPlan.request_contract.destination_wc_account,
    scopes: validatedPlan.request_contract.scopes,
    expires_at_utc: CANONICAL_REQUEST_EXPIRES_AT_UTC,
    expected_nimo_hostname: validatedPlan.request_contract.expected_nimo_hostname,
    raw_token_generation_authorized: false,
    authority: CANONICAL_REQUEST_FALSE_AUTHORITY,
  };
  const request = { ...core, request_id: contentIdV1("voidapwcir1_", core) };
  validateRequestV1(request);
  assertNoPrivateMaterial(request, "sanitized_canonical_request");
  return deepFreeze(structuredClone(request));
}
