import { createHash } from "node:crypto";

export const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_CREDENTIAL_ROTATION_PLAN_V1";
export const STATUS = "source_ready_rotation_not_authorized";
export const PLAN_PREFIX = "voidapwcrp1_";

export const REVIEWED_SOURCE_MAIN =
  "a6a8757b11828a30899b54eed6c261462681c916";
export const CREDENTIAL_METADATA_COMMIT =
  "cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa";
export const CURRENT_CREDENTIAL_ID =
  "voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1";
export const CURRENT_AGENT_ID =
  "void-external-agent-e2e-fulfillment-canary-agent-v1";
export const CURRENT_SCOPE = "agent_paid_work_submit";
export const CURRENT_REGISTRY_ID =
  "voidapwcr1_ce24175f3144131773f730d4989113b949998d79c48c3ddbd9752390122aac4f";
export const CURRENT_REGISTRY_SHA256 =
  "92e3149e560f7fa159d8fb5c59cd680cb6547a8a8f8010036bc02c4aa8d6e00e";
export const CURRENT_BINDING_ID =
  "voidapwcb1_77b02c3c54223062915d1d6b4d9ee0464c575899c164c52502391fff492abf56";
export const CURRENT_BINDING_REGISTRY_ID =
  "voidapwcbr1_f27a463089e3d00154963b699e39085e9ea08ce321f257270f4e5aa5be0925c2";
export const DESTINATION_WC_ACCOUNT =
  "void-external-agent-e2e-fulfillment-canary-v1";
export const ROTATION_BOUNDARY_UTC = "2026-08-05T00:00:00Z";

export const ORDERED_GATES = Object.freeze([
  "capture_current_origin_main",
  "verify_current_credential_and_binding_identity",
  "prepare_sanitized_canonical_remote_issuance_request",
  "generate_replacement_raw_token_on_nimo_with_exact_confirmation",
  "prepare_sanitized_replacement_review_decision",
  "stage_distinct_replacement_credential_registry_append",
  "apply_exact_replacement_credential_registry_append",
  "restart_receiver_under_separate_authority",
  "revalidate_replacement_credential_loaded_active_unrevoked_and_unconsumed",
  "wait_until_old_credential_and_binding_expired_or_revoked",
  "retire_old_wc_binding_with_exact_confirmation",
  "bind_replacement_credential_to_same_wc_account_with_exact_confirmation",
  "revalidate_single_active_binding_and_capture_sanitized_closeout",
  "obtain_fresh_zoso_confirmation_for_separate_paid_work_canary",
]);

export const FALSE_AUTHORITY = Object.freeze({
  raw_token_generation_authorized: false,
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

const PLAN_KEYS = [
  "authority",
  "confirmations",
  "current_binding",
  "current_credential",
  "decision",
  "lifecycle_contract",
  "marker",
  "ordered_gates",
  "plan_id",
  "replacement_contract",
  "reviewed_source_main",
  "source_contracts",
  "status",
  "version",
];
const CURRENT_CREDENTIAL_KEYS = [
  "agent_id",
  "credential_id",
  "credential_metadata_commit",
  "expires_at_utc",
  "registry_credential_count",
  "registry_id",
  "registry_sha256",
  "scope",
  "valid_from_utc",
];
const CURRENT_BINDING_KEYS = [
  "active_binding_expected",
  "binding_id",
  "binding_registry_id",
  "destination_wc_account",
  "valid_from_utc",
  "valid_until_utc",
];
const REPLACEMENT_KEYS = [
  "canonical_issuance_marker",
  "credential_registry_append_only",
  "maximum_credential_lifetime_days",
  "raw_token_storage_policy",
  "replacement_agent_id",
  "replacement_credential_id",
  "replacement_credential_must_differ",
  "replacement_destination_wc_account",
  "replacement_expiration_selected_by_fresh_review",
  "replacement_may_be_issued_before_rotation_boundary",
  "replacement_scope",
  "review_policy_id",
];
const LIFECYCLE_KEYS = [
  "old_binding_retirement_not_before_utc",
  "old_binding_retirement_reason",
  "old_binding_retirement_required_before_replacement_binding",
  "paid_work_submission_before_closeout_forbidden",
  "replacement_receiver_load_revalidation_required",
  "replacement_wc_binding_revalidation_required",
  "rotation_boundary_utc",
];
const CONFIRMATION_KEYS = [
  "binding_retirement",
  "fresh_zoso_canary_confirmation_required",
  "receiver_restart_separate_confirmation_required",
  "registry_apply",
  "replacement_binding",
  "review_approval",
  "token_generation",
];
const SOURCE_KEYS = [
  "binding_retirement_path",
  "canonical_issuance_path",
  "credential_binding_lifecycle_path",
  "review_policy_fixture_path",
  "review_policy_maximum_lifetime_days",
];
const DECISION_KEYS = [
  "credential_replacement_prepared",
  "live_canary_authorized",
  "old_binding_retired",
  "receiver_revalidated",
  "replacement_binding_applied",
  "status",
];

const SHA256_RE = /^[a-f0-9]{64}$/;
const COMMIT_RE = /^[a-f0-9]{40}$/;
const PLAN_ID_RE = /^voidapwcrp1_[a-f0-9]{64}$/;
const CREDENTIAL_ID_RE = /^voidapwc1_[a-f0-9]{64}$/;
const REGISTRY_ID_RE = /^voidapwcr1_[a-f0-9]{64}$/;
const BINDING_ID_RE = /^voidapwcb1_[a-f0-9]{64}$/;
const BINDING_REGISTRY_ID_RE = /^voidapwcbr1_[a-f0-9]{64}$/;
const UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const RAW_TOKEN_RE = /voidapwc1\.[A-Za-z0-9._:-]{3,180}\.[A-Za-z0-9_-]{20,}/;

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
  if (
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString().replace(".000Z", "Z") !== text
  ) {
    fail(`${label}_invalid_utc`);
  }
  return text;
}

function requireFalse(value, label) {
  if (value !== false) fail(`${label}_must_be_false`);
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort()) {
      result[key] = canonicalValue(value[key]);
    }
    return result;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function unsignedPlan(plan) {
  const body = structuredClone(plan);
  delete body.plan_id;
  return body;
}

export function computeCredentialRotationPlanIdV1(plan) {
  return `${PLAN_PREFIX}${sha256Hex(canonicalJson(unsignedPlan(plan)))}`;
}

function assertNoSecretMaterial(value) {
  const prohibitedKeys = new Set([
    "token",
    "raw_token",
    "credential_token",
    "authorization_header",
    "private_key",
    "seed_phrase",
    "secret",
  ]);
  const walk = (node, path = "$") => {
    if (typeof node === "string") {
      if (RAW_TOKEN_RE.test(node)) fail(`raw_token_material_detected_at_${path}`);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, `${path}[${index}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, child] of Object.entries(node)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (prohibitedKeys.has(normalized)) {
        fail(`prohibited_secret_key_at_${path}.${key}`);
      }
      walk(child, `${path}.${key}`);
    }
  };
  walk(value);
}

function verifyFalseAuthority(value) {
  exactKeys(value, Object.keys(FALSE_AUTHORITY), "authority");
  for (const [key, expected] of Object.entries(FALSE_AUTHORITY)) {
    if (value[key] !== expected) fail(`authority_${key}_mismatch`);
  }
}

export function validateAuthenticatedPaidWorkCredentialRotationPlanV1(value) {
  const plan = requireRecord(value, "plan");
  exactKeys(plan, PLAN_KEYS, "plan");
  if (plan.marker !== MARKER || plan.version !== 1 || plan.status !== STATUS) {
    fail("plan_identity_mismatch");
  }
  requireString(plan.plan_id, "plan_id", PLAN_ID_RE);
  if (
    plan.reviewed_source_main !== REVIEWED_SOURCE_MAIN ||
    !COMMIT_RE.test(plan.reviewed_source_main)
  ) {
    fail("reviewed_source_main_mismatch");
  }

  const credential = requireRecord(
    plan.current_credential,
    "current_credential",
  );
  exactKeys(credential, CURRENT_CREDENTIAL_KEYS, "current_credential");
  if (credential.credential_metadata_commit !== CREDENTIAL_METADATA_COMMIT) {
    fail("credential_metadata_commit_mismatch");
  }
  if (
    credential.credential_id !== CURRENT_CREDENTIAL_ID ||
    !CREDENTIAL_ID_RE.test(credential.credential_id)
  ) {
    fail("current_credential_id_mismatch");
  }
  if (credential.agent_id !== CURRENT_AGENT_ID) fail("current_agent_id_mismatch");
  if (credential.scope !== CURRENT_SCOPE) fail("current_scope_mismatch");
  if (
    credential.registry_id !== CURRENT_REGISTRY_ID ||
    !REGISTRY_ID_RE.test(credential.registry_id)
  ) {
    fail("current_registry_id_mismatch");
  }
  if (
    credential.registry_sha256 !== CURRENT_REGISTRY_SHA256 ||
    !SHA256_RE.test(credential.registry_sha256)
  ) {
    fail("current_registry_sha256_mismatch");
  }
  if (credential.registry_credential_count !== 9) {
    fail("current_registry_count_mismatch");
  }
  requireUtc(credential.valid_from_utc, "current_credential_valid_from_utc");
  const credentialExpiry = requireUtc(
    credential.expires_at_utc,
    "current_credential_expires_at_utc",
  );
  if (credentialExpiry !== ROTATION_BOUNDARY_UTC) {
    fail("current_credential_expiry_mismatch");
  }

  const binding = requireRecord(plan.current_binding, "current_binding");
  exactKeys(binding, CURRENT_BINDING_KEYS, "current_binding");
  if (
    binding.binding_id !== CURRENT_BINDING_ID ||
    !BINDING_ID_RE.test(binding.binding_id)
  ) {
    fail("current_binding_id_mismatch");
  }
  if (
    binding.binding_registry_id !== CURRENT_BINDING_REGISTRY_ID ||
    !BINDING_REGISTRY_ID_RE.test(binding.binding_registry_id)
  ) {
    fail("current_binding_registry_id_mismatch");
  }
  if (binding.destination_wc_account !== DESTINATION_WC_ACCOUNT) {
    fail("destination_wc_account_mismatch");
  }
  requireUtc(binding.valid_from_utc, "current_binding_valid_from_utc");
  const bindingExpiry = requireUtc(
    binding.valid_until_utc,
    "current_binding_valid_until_utc",
  );
  if (bindingExpiry !== ROTATION_BOUNDARY_UTC) {
    fail("current_binding_expiry_mismatch");
  }
  if (binding.active_binding_expected !== true) {
    fail("active_binding_expected_must_be_true");
  }

  const replacement = requireRecord(
    plan.replacement_contract,
    "replacement_contract",
  );
  exactKeys(replacement, REPLACEMENT_KEYS, "replacement_contract");
  if (
    replacement.canonical_issuance_marker !==
    "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_ISSUANCE_V1"
  ) {
    fail("canonical_issuance_marker_mismatch");
  }
  if (
    replacement.review_policy_id !==
    "void-agent-paid-work-credential-review-policy-v1"
  ) {
    fail("review_policy_id_mismatch");
  }
  if (replacement.maximum_credential_lifetime_days !== 30) {
    fail("maximum_credential_lifetime_days_mismatch");
  }
  if (replacement.replacement_credential_id !== null) {
    fail("replacement_credential_id_must_be_unresolved");
  }
  if (replacement.replacement_credential_must_differ !== true) {
    fail("replacement_credential_must_differ_required");
  }
  if (replacement.replacement_agent_id !== CURRENT_AGENT_ID) {
    fail("replacement_agent_id_mismatch");
  }
  if (replacement.replacement_scope !== CURRENT_SCOPE) {
    fail("replacement_scope_mismatch");
  }
  if (
    replacement.replacement_destination_wc_account !== DESTINATION_WC_ACCOUNT
  ) {
    fail("replacement_destination_wc_account_mismatch");
  }
  if (replacement.replacement_expiration_selected_by_fresh_review !== true) {
    fail("fresh_review_expiration_required");
  }
  if (replacement.replacement_may_be_issued_before_rotation_boundary !== true) {
    fail("preissue_contract_required");
  }
  if (replacement.raw_token_storage_policy !== "nimo_private_only") {
    fail("raw_token_storage_policy_mismatch");
  }
  if (replacement.credential_registry_append_only !== true) {
    fail("credential_registry_append_only_required");
  }

  const lifecycle = requireRecord(
    plan.lifecycle_contract,
    "lifecycle_contract",
  );
  exactKeys(lifecycle, LIFECYCLE_KEYS, "lifecycle_contract");
  if (lifecycle.rotation_boundary_utc !== ROTATION_BOUNDARY_UTC) {
    fail("rotation_boundary_mismatch");
  }
  if (
    lifecycle.old_binding_retirement_not_before_utc !== ROTATION_BOUNDARY_UTC
  ) {
    fail("old_binding_retirement_boundary_mismatch");
  }
  if (
    lifecycle.old_binding_retirement_reason !== "credential_expired_rotation"
  ) {
    fail("old_binding_retirement_reason_mismatch");
  }
  for (const key of [
    "old_binding_retirement_required_before_replacement_binding",
    "replacement_receiver_load_revalidation_required",
    "replacement_wc_binding_revalidation_required",
    "paid_work_submission_before_closeout_forbidden",
  ]) {
    if (lifecycle[key] !== true) fail(`${key}_required`);
  }

  if (
    Date.parse(lifecycle.old_binding_retirement_not_before_utc) <
    Date.parse(binding.valid_until_utc)
  ) {
    fail("old_binding_retirement_precedes_binding_expiry");
  }

  if (
    !Array.isArray(plan.ordered_gates) ||
    JSON.stringify(plan.ordered_gates) !== JSON.stringify(ORDERED_GATES)
  ) {
    fail("ordered_gate_sequence_mismatch");
  }
  const retireIndex = plan.ordered_gates.indexOf(
    "retire_old_wc_binding_with_exact_confirmation",
  );
  const bindIndex = plan.ordered_gates.indexOf(
    "bind_replacement_credential_to_same_wc_account_with_exact_confirmation",
  );
  if (retireIndex < 0 || bindIndex <= retireIndex) {
    fail("replacement_binding_must_follow_retirement");
  }

  const confirmations = requireRecord(plan.confirmations, "confirmations");
  exactKeys(confirmations, CONFIRMATION_KEYS, "confirmations");
  if (
    confirmations.token_generation !==
    "generate-agent-paid-work-canonical-remote-credential-token-v1"
  ) {
    fail("token_generation_confirmation_mismatch");
  }
  if (
    confirmations.review_approval !==
    "approve-agent-paid-work-canonical-remote-credential-v1"
  ) {
    fail("review_confirmation_mismatch");
  }
  if (
    confirmations.registry_apply !==
    "apply-agent-paid-work-canonical-remote-credential-issuance-v1"
  ) {
    fail("registry_apply_confirmation_mismatch");
  }
  if (
    confirmations.binding_retirement !==
    "retire-agent-paid-work-credential-wc-account-binding-v1"
  ) {
    fail("binding_retirement_confirmation_mismatch");
  }
  if (
    confirmations.replacement_binding !==
    "apply-agent-paid-work-credential-wc-account-binding-v1"
  ) {
    fail("replacement_binding_confirmation_mismatch");
  }
  if (confirmations.receiver_restart_separate_confirmation_required !== true) {
    fail("receiver_restart_confirmation_required");
  }
  if (confirmations.fresh_zoso_canary_confirmation_required !== true) {
    fail("fresh_zoso_confirmation_required");
  }

  const sources = requireRecord(plan.source_contracts, "source_contracts");
  exactKeys(sources, SOURCE_KEYS, "source_contracts");
  if (
    sources.canonical_issuance_path !==
    "scripts/agent_paid_work_canonical_remote_credential_issuance_v1.mjs"
  ) {
    fail("canonical_issuance_path_mismatch");
  }
  if (
    sources.credential_binding_lifecycle_path !==
    "scripts/agent_paid_work_credential_wc_account_binding_lifecycle_v1.mjs"
  ) {
    fail("binding_lifecycle_path_mismatch");
  }
  if (
    sources.binding_retirement_path !==
    "scripts/agent_paid_work_credential_wc_account_binding_retirement_v1.mjs"
  ) {
    fail("binding_retirement_path_mismatch");
  }
  if (
    sources.review_policy_fixture_path !==
    "fixtures/agent-paid-work/credential-request-review-policy-v1.example.json"
  ) {
    fail("review_policy_fixture_path_mismatch");
  }
  if (sources.review_policy_maximum_lifetime_days !== 30) {
    fail("source_review_policy_maximum_mismatch");
  }

  const decision = requireRecord(plan.decision, "decision");
  exactKeys(decision, DECISION_KEYS, "decision");
  if (decision.status !== "HOLD_PENDING_REPLACEMENT_CREDENTIAL_AND_BINDING") {
    fail("decision_status_mismatch");
  }
  for (const key of [
    "credential_replacement_prepared",
    "old_binding_retired",
    "replacement_binding_applied",
    "receiver_revalidated",
    "live_canary_authorized",
  ]) {
    requireFalse(decision[key], `decision_${key}`);
  }

  verifyFalseAuthority(plan.authority);
  assertNoSecretMaterial(plan);

  const expectedId = computeCredentialRotationPlanIdV1(plan);
  if (plan.plan_id !== expectedId) fail("plan_id_derivation_mismatch");
  return plan;
}

export function buildAuthenticatedPaidWorkCredentialRotationPlanV1() {
  const body = {
    marker: MARKER,
    version: 1,
    status: STATUS,
    reviewed_source_main: REVIEWED_SOURCE_MAIN,
    current_credential: {
      credential_metadata_commit: CREDENTIAL_METADATA_COMMIT,
      credential_id: CURRENT_CREDENTIAL_ID,
      agent_id: CURRENT_AGENT_ID,
      scope: CURRENT_SCOPE,
      registry_id: CURRENT_REGISTRY_ID,
      registry_sha256: CURRENT_REGISTRY_SHA256,
      registry_credential_count: 9,
      valid_from_utc: "2026-08-03T15:02:30Z",
      expires_at_utc: ROTATION_BOUNDARY_UTC,
    },
    current_binding: {
      binding_id: CURRENT_BINDING_ID,
      binding_registry_id: CURRENT_BINDING_REGISTRY_ID,
      destination_wc_account: DESTINATION_WC_ACCOUNT,
      valid_from_utc: "2026-08-03T15:02:30Z",
      valid_until_utc: ROTATION_BOUNDARY_UTC,
      active_binding_expected: true,
    },
    replacement_contract: {
      canonical_issuance_marker:
        "VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_ISSUANCE_V1",
      review_policy_id: "void-agent-paid-work-credential-review-policy-v1",
      maximum_credential_lifetime_days: 30,
      replacement_credential_id: null,
      replacement_credential_must_differ: true,
      replacement_agent_id: CURRENT_AGENT_ID,
      replacement_scope: CURRENT_SCOPE,
      replacement_destination_wc_account: DESTINATION_WC_ACCOUNT,
      replacement_expiration_selected_by_fresh_review: true,
      replacement_may_be_issued_before_rotation_boundary: true,
      raw_token_storage_policy: "nimo_private_only",
      credential_registry_append_only: true,
    },
    lifecycle_contract: {
      rotation_boundary_utc: ROTATION_BOUNDARY_UTC,
      old_binding_retirement_reason: "credential_expired_rotation",
      old_binding_retirement_not_before_utc: ROTATION_BOUNDARY_UTC,
      old_binding_retirement_required_before_replacement_binding: true,
      replacement_receiver_load_revalidation_required: true,
      replacement_wc_binding_revalidation_required: true,
      paid_work_submission_before_closeout_forbidden: true,
    },
    ordered_gates: [...ORDERED_GATES],
    confirmations: {
      token_generation:
        "generate-agent-paid-work-canonical-remote-credential-token-v1",
      review_approval: "approve-agent-paid-work-canonical-remote-credential-v1",
      registry_apply:
        "apply-agent-paid-work-canonical-remote-credential-issuance-v1",
      receiver_restart_separate_confirmation_required: true,
      binding_retirement:
        "retire-agent-paid-work-credential-wc-account-binding-v1",
      replacement_binding:
        "apply-agent-paid-work-credential-wc-account-binding-v1",
      fresh_zoso_canary_confirmation_required: true,
    },
    source_contracts: {
      canonical_issuance_path:
        "scripts/agent_paid_work_canonical_remote_credential_issuance_v1.mjs",
      credential_binding_lifecycle_path:
        "scripts/agent_paid_work_credential_wc_account_binding_lifecycle_v1.mjs",
      binding_retirement_path:
        "scripts/agent_paid_work_credential_wc_account_binding_retirement_v1.mjs",
      review_policy_fixture_path:
        "fixtures/agent-paid-work/credential-request-review-policy-v1.example.json",
      review_policy_maximum_lifetime_days: 30,
    },
    decision: {
      status: "HOLD_PENDING_REPLACEMENT_CREDENTIAL_AND_BINDING",
      credential_replacement_prepared: false,
      old_binding_retired: false,
      replacement_binding_applied: false,
      receiver_revalidated: false,
      live_canary_authorized: false,
    },
    authority: { ...FALSE_AUTHORITY },
  };
  const plan = {
    ...body,
    plan_id: `${PLAN_PREFIX}${sha256Hex(canonicalJson(body))}`,
  };
  return validateAuthenticatedPaidWorkCredentialRotationPlanV1(plan);
}
