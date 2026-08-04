import { createHash } from "node:crypto";

import {
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1,
} from "../authenticated-paid-work-runtime-revalidation-v1/index.mjs";
import {
  verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1,
} from "../authenticated-paid-work-runtime-revalidation-v1/trusted-context-binding-guard-v1.mjs";

export const EXECUTION_PLAN_SCHEMA_ID =
  "https://void.network/schemas/authenticated-paid-work-execution-plan-v1.schema.json";
export const EXECUTION_PLAN_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PLAN_V1";
export const EXECUTION_PLAN_PROTOCOL =
  "void-authenticated-paid-work-production-activation-execution-plan/1";
export const DIRECT_VERIFICATION_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_AUTHENTICATION_VERIFICATION_V1";

const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const OPERATION = /^void-apw-activation-[a-z0-9][a-z0-9-]{7,95}$/;
const AUTHORITY_KEYS = [
  "activation",
  "credential_access",
  "deployment",
  "fund_movement",
  "live_authentication",
  "payment_authorization",
  "payment_execution",
  "service_restart",
  "service_start",
  "signing",
  "transaction_broadcast",
  "transaction_construction",
  "wallet_or_signer_access",
  "work_credit_write",
  "work_dispatch",
];
const PREFLIGHT_KEYS = [
  "all_reviewed_source_artifact_digests_match",
  "bounded_replay_snapshot_exact_and_fresh_store_only",
  "credential_reference_privately_revalidated_without_output",
  "disabled_configuration_preimage_exact",
  "disabled_runtime_installation_exact",
  "execution_lease_absent",
  "no_inflight_paid_work_or_economic_state",
  "rollback_receipt_destination_owner_private_and_non_symlink",
  "runtime_listener_absent",
  "runtime_revalidation_receipt_verified",
  "service_inactive_before_start",
  "target_worktree_clean_and_exact",
  "trusted_context_binding_verified",
  "trusted_context_reference_privately_revalidated_without_output",
];

export const ORDERED_MUTATIONS = Object.freeze([
  "atomic_compare_and_replace_exact_disabled_configuration_with_reviewed_enabled_configuration",
  "create_exact_empty_owner_private_activation_root",
  "atomic_write_owner_private_reference_environment_file",
  "atomic_write_reviewed_static_user_service_unit",
  "systemd_user_daemon_reload",
  "single_explicit_service_start",
  "write_owner_private_non_secret_execution_receipt",
]);

export const EXPECTED = Object.freeze({
  target: Object.freeze({
    hostname: "zoso-Precision-Tower-7810",
    runtime_user: "zoso",
    repository: "6ZoSo9/void-node",
    node_major: 22,
    service_manager_scope: "systemd_user",
  }),
  artifacts: Object.freeze({
    activation_configuration_sha256:
      "abe7974246d47a4802a936e78f952d6db76d98cccfccc1ce7130309c56b3ee8f",
    bounded_replay_snapshot_sha256:
      "4bd9c20409b961297554a5d830c4a6c3b7c9b24b000766c58c5bd30fb1959f33",
    credential_metadata_commit:
      "cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa",
    credential_reference_metadata_sha256:
      "eac53cc5a7fd9cbb48271a86c475866cf720f6600f3c9342f2f142ee95d5d89c",
    credential_rotation_merge_commit:
      "9d860b668e21c98ad19e63b2c32b463025f05310",
    execution_confirmation_sha256:
      "e2f6cecc52047931ce78445ef00c8eeba990a7f552a9b20efc93d6638f5809f6",
    execution_packet_merge_commit:
      "a6a8757b11828a30899b54eed6c261462681c916",
    live_canary_scope_sha256:
      "4d2a253d43334b5b0c2053007e0135a9467a1f58c0841d79778caf58ffc68f8e",
    rollback_plan_sha256:
      "31470e837beb091f3fb63617c5b5e1afa6268e8e4d81480037e1e459df426c2c",
    runtime_revalidation_merge_commit:
      "d12b4620cb5a6e199a6a59f21dfae6dd434c550a",
    service_unit_design_sha256:
      "f37bcf3931579e13a76e7ab2d03e9d961260fa0e9ec95ca4507bd06e3df38b07",
    trusted_context_reference_metadata_sha256:
      "49a84ccd443eab216f38bc926838272fb82999c0530bd76cb3cb259deac5259a",
  }),
  live_canary_scope_id:
    "voidapwlcs1_d7de055750dc99faedf51d2a62c94e2dad055be5c2660d439c14ec5527dc03bb",
  rollback_path:
    "ops/mainnet0/authenticated-paid-work-runtime-disabled-production-rollback-plan-v1.json",
  confirmation_template:
    "confirm-void-authenticated-paid-work-production-activation-v1:<operation_id>:<execution_plan_sha256>",
});

function fail(message) {
  throw new Error(message);
}

function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label}_must_be_object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(record(value, label)).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label}_keys_mismatch`);
  }
}

function requireText(value, pattern, label) {
  if (typeof value !== "string" || value !== value.trim() || !pattern.test(value)) {
    fail(`${label}_invalid`);
  }
  return value;
}

function parseUtc(value, label) {
  const text = requireText(value, UTC, label);
  const ms = Date.parse(text);
  if (!Number.isFinite(ms) || new Date(ms).toISOString() !== text) {
    fail(`${label}_invalid`);
  }
  return { text, ms };
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort(compareCodeUnits)) {
      output[key] = canonicalValue(value[key]);
    }
    return output;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function deniedAuthority() {
  return Object.fromEntries(AUTHORITY_KEYS.map((key) => [key, false]));
}

function requireDeniedAuthority(value, label) {
  exactKeys(value, AUTHORITY_KEYS, label);
  for (const key of AUTHORITY_KEYS) {
    if (value[key] !== false) fail(`${label}_${key}_must_be_false`);
  }
}

function reseal(value, idKey, prefix) {
  const body = structuredClone(value);
  delete body[idKey];
  value[idKey] = `${prefix}${digest(body)}`;
  return value;
}

export function buildDirectAuthenticationVerificationV1(input) {
  const source = record(input, "direct_verification_input");
  exactKeys(source, [
    "packet_id",
    "packet_sha256",
    "quote_expires_at_utc",
    "quote_id",
    "verified_at_utc",
    "verification_contract",
    "work_order_id",
  ], "direct_verification_input");
  const verifiedAt = parseUtc(source.verified_at_utc, "direct_verified_at_utc");
  const quoteExpires = parseUtc(source.quote_expires_at_utc, "quote_expires_at_utc");
  if (verifiedAt.ms >= quoteExpires.ms) fail("direct_quote_expired");
  if (
    source.verification_contract !==
    "verifyAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1"
  ) {
    fail("direct_verification_contract_mismatch");
  }
  const result = {
    marker: DIRECT_VERIFICATION_MARKER,
    version: 1,
    status: "fresh_direct_authentication_verified_no_persistence",
    verified_at_utc: verifiedAt.text,
    verification_contract: source.verification_contract,
    packet_id: requireText(source.packet_id, /^voidafdqa1_[0-9a-f]{64}$/, "packet_id"),
    packet_sha256: requireText(source.packet_sha256, SHA256, "packet_sha256"),
    work_order_id: requireText(source.work_order_id, /^void[a-z0-9]+1_[0-9a-f]{64}$/, "work_order_id"),
    quote_id: requireText(source.quote_id, /^voidawq1_[0-9a-f]{64}$/, "quote_id"),
    quote_expires_at_utc: quoteExpires.text,
    provider_signature_verified: true,
    requester_signature_verified: true,
    direct_authentication_packet_verified: true,
    eligible_for_atomic_activation_persistence: true,
    atomic_persistence_performed: false,
    packet_bytes_disclosed: false,
    signature_bytes_disclosed: false,
    authority: deniedAuthority(),
    verification_id: "",
  };
  return validateDirectAuthenticationVerificationV1(
    reseal(result, "verification_id", "voidapwdav1_"),
  );
}

export function validateDirectAuthenticationVerificationV1(value) {
  const selected = record(value, "direct_verification");
  exactKeys(selected, [
    "atomic_persistence_performed",
    "authority",
    "direct_authentication_packet_verified",
    "eligible_for_atomic_activation_persistence",
    "marker",
    "packet_bytes_disclosed",
    "packet_id",
    "packet_sha256",
    "provider_signature_verified",
    "quote_expires_at_utc",
    "quote_id",
    "requester_signature_verified",
    "signature_bytes_disclosed",
    "status",
    "verification_contract",
    "verification_id",
    "verified_at_utc",
    "version",
    "work_order_id",
  ], "direct_verification");
  if (
    selected.marker !== DIRECT_VERIFICATION_MARKER ||
    selected.version !== 1 ||
    selected.status !== "fresh_direct_authentication_verified_no_persistence" ||
    selected.verification_contract !==
      "verifyAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1"
  ) {
    fail("direct_verification_contract_mismatch");
  }
  for (const key of [
    "provider_signature_verified",
    "requester_signature_verified",
    "direct_authentication_packet_verified",
    "eligible_for_atomic_activation_persistence",
  ]) {
    if (selected[key] !== true) fail(`direct_verification_${key}_must_be_true`);
  }
  for (const key of [
    "atomic_persistence_performed",
    "packet_bytes_disclosed",
    "signature_bytes_disclosed",
  ]) {
    if (selected[key] !== false) fail(`direct_verification_${key}_must_be_false`);
  }
  parseUtc(selected.verified_at_utc, "direct_verified_at_utc");
  parseUtc(selected.quote_expires_at_utc, "quote_expires_at_utc");
  requireText(selected.packet_id, /^voidafdqa1_[0-9a-f]{64}$/, "packet_id");
  requireText(selected.packet_sha256, SHA256, "packet_sha256");
  requireText(selected.work_order_id, /^void[a-z0-9]+1_[0-9a-f]{64}$/, "work_order_id");
  requireText(selected.quote_id, /^voidawq1_[0-9a-f]{64}$/, "quote_id");
  requireText(selected.verification_id, /^voidapwdav1_[0-9a-f]{64}$/, "verification_id");
  requireDeniedAuthority(selected.authority, "direct_verification_authority");
  const body = structuredClone(selected);
  delete body.verification_id;
  if (selected.verification_id !== `voidapwdav1_${digest(body)}`) {
    fail("direct_verification_id_mismatch");
  }
  return selected;
}

function unsignedPlan(value) {
  const body = structuredClone(value);
  delete body.execution_plan_sha256;
  delete body.plan_id;
  return body;
}

export function computeExecutionPlanSha256V1(value) {
  return digest(unsignedPlan(record(value, "execution_plan")));
}

export function buildExecutionPlanV1(input) {
  const source = record(input, "execution_plan_input");
  exactKeys(source, [
    "direct_authentication_verification",
    "expires_at_utc",
    "fresh_origin_main",
    "generated_at_utc",
    "operation_id",
    "preflight",
    "rollback_receipt_destination_fingerprint_sha256",
    "runtime_revalidation_receipt",
    "trusted_context_binding",
  ], "execution_plan_input");
  const receipt = validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(
    source.runtime_revalidation_receipt,
  );
  verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1(
    receipt,
    source.trusted_context_binding,
  );
  const binding = record(source.trusted_context_binding, "trusted_context_binding");
  const trusted = record(binding.trusted_context, "trusted_context");
  const receiver = record(receipt.receiver, "receiver");
  const credential = record(receipt.credential, "credential");
  const observation = record(receipt.observation, "observation");
  const replay = record(receipt.replay, "replay");
  const decision = record(receipt.decision, "runtime_decision");
  if (
    decision.runtime_revalidation_satisfied !== true ||
    decision.execution_authorized !== false ||
    replay.replay_state_acceptable !== true
  ) {
    fail("runtime_evidence_not_satisfied");
  }
  const direct = validateDirectAuthenticationVerificationV1(
    source.direct_authentication_verification,
  );
  const generated = parseUtc(source.generated_at_utc, "generated_at_utc");
  const expires = parseUtc(source.expires_at_utc, "expires_at_utc");
  const evaluated = parseUtc(observation.evaluated_at_utc, "runtime_evaluated_at_utc");
  const directAt = parseUtc(direct.verified_at_utc, "direct_verified_at_utc");
  const credentialExpires = parseUtc(credential.expires_at_utc, "credential_expires_at_utc");
  const quoteExpires = parseUtc(direct.quote_expires_at_utc, "quote_expires_at_utc");
  if (generated.ms < evaluated.ms || generated.ms - evaluated.ms > 300000) {
    fail("runtime_evidence_stale");
  }
  if (generated.ms < directAt.ms || generated.ms - directAt.ms > 300000) {
    fail("direct_evidence_stale");
  }
  if (
    expires.ms <= generated.ms ||
    expires.ms - generated.ms > 600000 ||
    expires.ms > credentialExpires.ms ||
    expires.ms > quoteExpires.ms
  ) {
    fail("plan_expiry_out_of_bounds");
  }
  const preflight = record(source.preflight, "preflight");
  exactKeys(preflight, PREFLIGHT_KEYS, "preflight");
  for (const key of PREFLIGHT_KEYS) {
    if (preflight[key] !== true) fail(`preflight_${key}_must_be_true`);
  }
  const plan = {
    $schema: EXECUTION_PLAN_SCHEMA_ID,
    marker: EXECUTION_PLAN_MARKER,
    protocol: EXECUTION_PLAN_PROTOCOL,
    version: 1,
    status: "HOLD_PENDING_FRESH_ZOSO_CONFIRMATION",
    operation_id: requireText(source.operation_id, OPERATION, "operation_id"),
    generated_at_utc: generated.text,
    expires_at_utc: expires.text,
    target: {
      ...EXPECTED.target,
      expected_main_commit: requireText(source.fresh_origin_main, COMMIT, "fresh_origin_main"),
    },
    runtime_evidence: {
      receipt_id: receipt.receipt_id,
      trusted_context_binding_id: binding.binding_id,
      evaluated_at_utc: evaluated.text,
      credential_id: credential.selected_credential_id,
      credential_expires_at_utc: credentialExpires.text,
      credential_registry_id: receiver.loaded_registry_id,
      credential_registry_sha256: receiver.loaded_registry_sha256,
      runtime_revalidation_satisfied: true,
      trusted_context_verified: true,
      replay_state_acceptable: true,
    },
    direct_authentication: direct,
    reviewed_artifact_bindings: EXPECTED.artifacts,
    private_reference_fingerprints: {
      trusted_context_bundle_sha256: trusted.bundle_sha256,
      trusted_context_bundle_path_fingerprint_sha256:
        trusted.bundle_path_fingerprint_sha256,
      credential_reference_id: credential.selected_credential_id,
      credential_registry_id: receiver.loaded_registry_id,
    },
    preflight,
    live_canary_scope_binding: {
      reference_id: EXPECTED.live_canary_scope_id,
      sha256: EXPECTED.artifacts.live_canary_scope_sha256,
      maximum_service_starts: 1,
      maximum_canary_runs: 1,
      automatic_retry: false,
    },
    ordered_mutations: [...ORDERED_MUTATIONS],
    rollback_binding: {
      plan_path: EXPECTED.rollback_path,
      plan_sha256: EXPECTED.artifacts.rollback_plan_sha256,
      receipt_destination_fingerprint_sha256: requireText(
        source.rollback_receipt_destination_fingerprint_sha256,
        SHA256,
        "rollback_receipt_destination_fingerprint_sha256",
      ),
      automatic_retry: false,
      automatic_reactivation: false,
    },
    confirmation: {
      required: true,
      operator_authority: "zoso_sovereign_operator",
      template: EXPECTED.confirmation_template,
      maximum_ttl_seconds: 600,
      maximum_attempt_count: 1,
      supplied: null,
    },
    decision: {
      status: "HOLD_PENDING_FRESH_ZOSO_CONFIRMATION",
      runtime_revalidation_satisfied: true,
      trusted_context_verified: true,
      fresh_quote_verified: true,
      provider_signature_verified: true,
      requester_signature_verified: true,
      execution_plan_digest_satisfied: true,
      fresh_zoso_confirmation_required: true,
      execution_authorized: false,
    },
    authority: deniedAuthority(),
    execution_plan_sha256: "",
    plan_id: "",
  };
  plan.execution_plan_sha256 = computeExecutionPlanSha256V1(plan);
  plan.plan_id = `voidapwep1_${plan.execution_plan_sha256}`;
  return validateExecutionPlanV1(plan);
}

export function validateExecutionPlanV1(value) {
  const plan = record(value, "execution_plan");
  exactKeys(plan, [
    "$schema",
    "authority",
    "confirmation",
    "decision",
    "direct_authentication",
    "execution_plan_sha256",
    "expires_at_utc",
    "generated_at_utc",
    "live_canary_scope_binding",
    "marker",
    "operation_id",
    "ordered_mutations",
    "plan_id",
    "preflight",
    "private_reference_fingerprints",
    "protocol",
    "reviewed_artifact_bindings",
    "rollback_binding",
    "runtime_evidence",
    "status",
    "target",
    "version",
  ], "execution_plan");
  if (
    plan.$schema !== EXECUTION_PLAN_SCHEMA_ID ||
    plan.marker !== EXECUTION_PLAN_MARKER ||
    plan.protocol !== EXECUTION_PLAN_PROTOCOL ||
    plan.version !== 1 ||
    plan.status !== "HOLD_PENDING_FRESH_ZOSO_CONFIRMATION"
  ) {
    fail("plan_contract_mismatch");
  }
  requireText(plan.operation_id, OPERATION, "operation_id");
  const generated = parseUtc(plan.generated_at_utc, "generated_at_utc");
  const expires = parseUtc(plan.expires_at_utc, "expires_at_utc");
  if (expires.ms <= generated.ms || expires.ms - generated.ms > 600000) {
    fail("plan_expiry_out_of_bounds");
  }
  const target = record(plan.target, "target");
  exactKeys(target, [
    "expected_main_commit",
    "hostname",
    "node_major",
    "repository",
    "runtime_user",
    "service_manager_scope",
  ], "target");
  requireText(target.expected_main_commit, COMMIT, "expected_main_commit");
  for (const [key, expected] of Object.entries(EXPECTED.target)) {
    if (target[key] !== expected) fail("target_mismatch");
  }
  if (canonicalJson(plan.reviewed_artifact_bindings) !== canonicalJson(EXPECTED.artifacts)) {
    fail("artifact_bindings_mismatch");
  }
  const preflight = record(plan.preflight, "preflight");
  exactKeys(preflight, PREFLIGHT_KEYS, "preflight");
  for (const key of PREFLIGHT_KEYS) {
    if (preflight[key] !== true) fail(`preflight_${key}_must_be_true`);
  }
  if (canonicalJson(plan.ordered_mutations) !== canonicalJson(ORDERED_MUTATIONS)) {
    fail("ordered_mutations_mismatch");
  }
  validateDirectAuthenticationVerificationV1(plan.direct_authentication);
  requireDeniedAuthority(plan.authority, "plan_authority");
  const confirmation = record(plan.confirmation, "confirmation");
  const decision = record(plan.decision, "decision");
  if (
    confirmation.required !== true ||
    confirmation.supplied !== null ||
    confirmation.operator_authority !== "zoso_sovereign_operator" ||
    confirmation.template !== EXPECTED.confirmation_template ||
    confirmation.maximum_ttl_seconds !== 600 ||
    confirmation.maximum_attempt_count !== 1 ||
    decision.status !== "HOLD_PENDING_FRESH_ZOSO_CONFIRMATION" ||
    decision.fresh_zoso_confirmation_required !== true ||
    decision.execution_plan_digest_satisfied !== true ||
    decision.execution_authorized !== false
  ) {
    fail("confirmation_boundary_mismatch");
  }
  requireText(plan.execution_plan_sha256, SHA256, "execution_plan_sha256");
  requireText(plan.plan_id, /^voidapwep1_[0-9a-f]{64}$/, "plan_id");
  const expectedDigest = computeExecutionPlanSha256V1(plan);
  if (
    plan.execution_plan_sha256 !== expectedDigest ||
    plan.plan_id !== `voidapwep1_${expectedDigest}`
  ) {
    fail("plan_content_address_mismatch");
  }
  return plan;
}

export function verifyExecutionPlanWithEvidenceV1(planValue, receiptValue, bindingValue) {
  const plan = validateExecutionPlanV1(planValue);
  const receipt = validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(receiptValue);
  verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1(
    receipt,
    bindingValue,
  );
  const runtime = record(plan.runtime_evidence, "runtime_evidence");
  const binding = record(bindingValue, "trusted_context_binding");
  if (
    runtime.receipt_id !== receipt.receipt_id ||
    runtime.trusted_context_binding_id !== binding.binding_id
  ) {
    fail("runtime_evidence_link_mismatch");
  }
  return true;
}
