import { createHash } from "node:crypto";

export const VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_RECEIPT_V1";
export const VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_PROTOCOL =
  "void-authenticated-paid-work-runtime-revalidation/1";

export const VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_EXPECTED =
  Object.freeze({
    reviewed_source_main: "a6a8757b11828a30899b54eed6c261462681c916",
    execution_packet_marker:
      "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1",
    execution_packet_status: "source_ready_execution_not_authorized",
    execution_packet_merge_commit:
      "a6a8757b11828a30899b54eed6c261462681c916",
    credential_metadata_commit:
      "cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa",
    host: "zoso-Precision-Tower-7810",
    manager_scope: "systemd_user",
    service: "void-agent-paid-work-submission-receiver-v1.service",
    listener_host: "127.0.0.1",
    listener_port: 4187,
    selected_credential_id:
      "voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1",
    agent_id: "void-external-agent-e2e-fulfillment-canary-agent-v1",
    scope: "agent_paid_work_submit",
    credential_not_before_utc: "2026-08-03T15:02:30.000Z",
    credential_expires_at_utc: "2026-08-05T00:00:00.000Z",
    registry_id:
      "voidapwcr1_ce24175f3144131773f730d4989113b949998d79c48c3ddbd9752390122aac4f",
    registry_sha256:
      "92e3149e560f7fa159d8fb5c59cd680cb6547a8a8f8010036bc02c4aa8d6e00e",
    credential_count: 9,
  });

const RECEIPT_KEYS = [
  "credential",
  "decision",
  "marker",
  "observation",
  "protocol",
  "receipt_id",
  "receiver",
  "replay",
  "runtime_inputs",
  "safety",
  "source",
  "target",
];
const SOURCE_KEYS = [
  "credential_metadata_commit",
  "execution_packet_marker",
  "execution_packet_merge_commit",
  "execution_packet_status",
  "reviewed_source_main",
];
const TARGET_KEYS = [
  "host",
  "listener_host",
  "listener_port",
  "manager_scope",
  "service",
];
const OBSERVATION_KEYS = [
  "captured_at_utc",
  "clock_synchronized",
  "evaluated_at_utc",
  "max_age_seconds",
  "relative_age_seconds",
];
const RECEIVER_KEYS = [
  "configuration_revalidation_completed",
  "health_http_status",
  "listener_loopback_only",
  "loaded_credential_count",
  "loaded_registry_id",
  "loaded_registry_sha256",
  "main_pid",
  "restart_required",
  "secret_values_disclosed",
  "service_active",
  "target_registry_loaded",
];
const CREDENTIAL_KEYS = [
  "agent_id",
  "expires_at_utc",
  "identity_verified",
  "not_before_utc",
  "raw_token_read",
  "revocation_checked",
  "revoked",
  "scope",
  "scope_verified",
  "secret_material_disclosed",
  "selected_credential_id",
  "validity_window_contains_observation",
];
const REPLAY_KEYS = [
  "replay_state_acceptable",
  "replay_state_checked",
  "selected_credential_previously_consumed",
  "unexpected_mutation_observed",
];
const RUNTIME_INPUT_KEYS = [
  "credential_reference_verified_and_fresh",
  "execution_plan_sha256",
  "fresh_direct_authentication_packet_sha256",
  "fresh_origin_main",
  "fresh_quote_required",
  "fresh_zoso_confirmation",
  "provider_signature_verified",
  "requester_signature_verified",
  "trusted_context_reference_verified",
];
const SAFETY_KEYS = [
  "fund_movement_performed",
  "live_authentication_performed",
  "payment_execution_performed",
  "service_mutation_performed",
  "transaction_broadcast_performed",
  "wallet_or_signer_access_performed",
  "work_credit_write_performed",
  "work_dispatch_performed",
];
const DECISION_KEYS = [
  "execution_authorized",
  "execution_plan_digest_required",
  "fresh_quote_required",
  "fresh_signatures_required",
  "fresh_zoso_confirmation_required",
  "runtime_revalidation_satisfied",
  "status",
];

const RECEIPT_ID = /^voidapwrr1_[a-f0-9]{64}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LOOPBACKS = new Set(["127.0.0.1", "::1"]);

function fail(message) {
  throw new Error(message);
}

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label}_must_be_object`);
  }
  return value;
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(requireRecord(value, label)).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label}_keys_mismatch`);
  }
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

function parseUtc(value, label) {
  if (typeof value !== "string" || !ISO_UTC.test(value)) {
    fail(`${label}_must_be_iso_utc_milliseconds`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    fail(`${label}_invalid`);
  }
  return parsed;
}

function unsignedReceiptBody(receipt) {
  const body = structuredClone(receipt);
  delete body.receipt_id;
  return body;
}

export function computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(
  receipt,
) {
  return `voidapwrr1_${sha256Hex(canonicalJson(unsignedReceiptBody(receipt)))}`;
}

function requireExactBoolean(value, expected, label) {
  if (value !== expected) fail(`${label}_must_be_${expected}`);
}

function validateSource(source) {
  assertExactKeys(source, SOURCE_KEYS, "source");
  const expected = VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_EXPECTED;
  for (const key of SOURCE_KEYS) {
    if (source[key] !== expected[key]) fail(`source_${key}_mismatch`);
  }
  for (const key of [
    "reviewed_source_main",
    "execution_packet_merge_commit",
    "credential_metadata_commit",
  ]) {
    if (!COMMIT.test(source[key])) fail(`source_${key}_invalid`);
  }
}

function validateTarget(target) {
  assertExactKeys(target, TARGET_KEYS, "target");
  const expected = VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_EXPECTED;
  for (const key of TARGET_KEYS) {
    if (target[key] !== expected[key]) fail(`target_${key}_mismatch`);
  }
  if (!LOOPBACKS.has(target.listener_host)) fail("target_listener_not_loopback");
}

function validateObservation(observation) {
  assertExactKeys(observation, OBSERVATION_KEYS, "observation");
  const captured = parseUtc(observation.captured_at_utc, "captured_at_utc");
  const evaluated = parseUtc(observation.evaluated_at_utc, "evaluated_at_utc");
  if (evaluated < captured) fail("evaluated_at_precedes_capture");
  if (!Number.isInteger(observation.max_age_seconds) ||
      observation.max_age_seconds < 1 || observation.max_age_seconds > 900) {
    fail("max_age_seconds_out_of_range");
  }
  const expectedAge = Math.ceil((evaluated - captured) / 1000);
  if (observation.relative_age_seconds !== expectedAge) {
    fail("relative_age_seconds_mismatch");
  }
  if (expectedAge > observation.max_age_seconds) fail("observation_stale");
  requireExactBoolean(observation.clock_synchronized, true, "clock_synchronized");
  return { captured, evaluated };
}

function validateReceiver(receiver) {
  assertExactKeys(receiver, RECEIVER_KEYS, "receiver");
  const expected = VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_EXPECTED;
  requireExactBoolean(receiver.service_active, true, "receiver_service_active");
  if (!Number.isInteger(receiver.main_pid) || receiver.main_pid <= 1) {
    fail("receiver_main_pid_invalid");
  }
  if (receiver.health_http_status !== 200) fail("receiver_health_status_mismatch");
  requireExactBoolean(
    receiver.listener_loopback_only,
    true,
    "receiver_listener_loopback_only",
  );
  if (receiver.loaded_registry_id !== expected.registry_id) {
    fail("receiver_registry_id_mismatch");
  }
  if (receiver.loaded_registry_sha256 !== expected.registry_sha256 ||
      !SHA256.test(receiver.loaded_registry_sha256)) {
    fail("receiver_registry_sha256_mismatch");
  }
  if (receiver.loaded_credential_count !== expected.credential_count) {
    fail("receiver_credential_count_mismatch");
  }
  requireExactBoolean(
    receiver.target_registry_loaded,
    true,
    "receiver_target_registry_loaded",
  );
  requireExactBoolean(receiver.restart_required, false, "receiver_restart_required");
  requireExactBoolean(
    receiver.configuration_revalidation_completed,
    true,
    "receiver_configuration_revalidation_completed",
  );
  requireExactBoolean(
    receiver.secret_values_disclosed,
    false,
    "receiver_secret_values_disclosed",
  );
}

function validateCredential(credential, evaluatedAt) {
  assertExactKeys(credential, CREDENTIAL_KEYS, "credential");
  const expected = VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_EXPECTED;
  for (const key of ["selected_credential_id", "agent_id", "scope"]) {
    if (credential[key] !== expected[key]) fail(`credential_${key}_mismatch`);
  }
  if (credential.not_before_utc !== expected.credential_not_before_utc) {
    fail("credential_not_before_mismatch");
  }
  if (credential.expires_at_utc !== expected.credential_expires_at_utc) {
    fail("credential_expires_at_mismatch");
  }
  const notBefore = parseUtc(credential.not_before_utc, "credential_not_before_utc");
  const expiresAt = parseUtc(credential.expires_at_utc, "credential_expires_at_utc");
  if (!(notBefore <= evaluatedAt && evaluatedAt < expiresAt)) {
    fail("credential_outside_validity_window");
  }
  for (const key of [
    "identity_verified",
    "scope_verified",
    "validity_window_contains_observation",
    "revocation_checked",
  ]) {
    requireExactBoolean(credential[key], true, `credential_${key}`);
  }
  for (const key of ["revoked", "raw_token_read", "secret_material_disclosed"]) {
    requireExactBoolean(credential[key], false, `credential_${key}`);
  }
}

function validateReplay(replay) {
  assertExactKeys(replay, REPLAY_KEYS, "replay");
  requireExactBoolean(replay.replay_state_checked, true, "replay_state_checked");
  requireExactBoolean(
    replay.unexpected_mutation_observed,
    false,
    "replay_unexpected_mutation_observed",
  );
  requireExactBoolean(
    replay.selected_credential_previously_consumed,
    false,
    "replay_selected_credential_previously_consumed",
  );
  requireExactBoolean(
    replay.replay_state_acceptable,
    true,
    "replay_state_acceptable",
  );
}

function validateRuntimeInputs(runtimeInputs) {
  assertExactKeys(runtimeInputs, RUNTIME_INPUT_KEYS, "runtime_inputs");
  const expected = VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_EXPECTED;
  if (runtimeInputs.fresh_origin_main !== expected.reviewed_source_main) {
    fail("runtime_input_origin_main_mismatch");
  }
  requireExactBoolean(
    runtimeInputs.trusted_context_reference_verified,
    true,
    "runtime_input_trusted_context_reference_verified",
  );
  requireExactBoolean(
    runtimeInputs.credential_reference_verified_and_fresh,
    true,
    "runtime_input_credential_reference_verified_and_fresh",
  );
  requireExactBoolean(
    runtimeInputs.provider_signature_verified,
    false,
    "runtime_input_provider_signature_verified",
  );
  requireExactBoolean(
    runtimeInputs.requester_signature_verified,
    false,
    "runtime_input_requester_signature_verified",
  );
  if (runtimeInputs.fresh_direct_authentication_packet_sha256 !== null) {
    fail("runtime_input_authentication_packet_must_be_null");
  }
  if (runtimeInputs.execution_plan_sha256 !== null) {
    fail("runtime_input_execution_plan_must_be_null");
  }
  if (runtimeInputs.fresh_zoso_confirmation !== null) {
    fail("runtime_input_zoso_confirmation_must_be_null");
  }
  requireExactBoolean(
    runtimeInputs.fresh_quote_required,
    true,
    "runtime_input_fresh_quote_required",
  );
}

function validateSafety(safety) {
  assertExactKeys(safety, SAFETY_KEYS, "safety");
  for (const key of SAFETY_KEYS) {
    requireExactBoolean(safety[key], false, `safety_${key}`);
  }
}

function validateDecision(decision) {
  assertExactKeys(decision, DECISION_KEYS, "decision");
  if (decision.status !== "HOLD_PENDING_SIGNATURES_QUOTE_PLAN_AND_CONFIRMATION") {
    fail("decision_status_mismatch");
  }
  requireExactBoolean(
    decision.runtime_revalidation_satisfied,
    true,
    "decision_runtime_revalidation_satisfied",
  );
  for (const key of [
    "fresh_signatures_required",
    "fresh_quote_required",
    "execution_plan_digest_required",
    "fresh_zoso_confirmation_required",
  ]) {
    requireExactBoolean(decision[key], true, `decision_${key}`);
  }
  requireExactBoolean(
    decision.execution_authorized,
    false,
    "decision_execution_authorized",
  );
}

export function validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(
  value,
  options = { verifyReceiptId: true },
) {
  const receipt = requireRecord(value, "receipt");
  assertExactKeys(receipt, RECEIPT_KEYS, "receipt");
  if (receipt.marker !== VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_MARKER) {
    fail("marker_mismatch");
  }
  if (receipt.protocol !== VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_PROTOCOL) {
    fail("protocol_mismatch");
  }
  if (!RECEIPT_ID.test(receipt.receipt_id)) fail("receipt_id_invalid");
  validateSource(receipt.source);
  validateTarget(receipt.target);
  const { evaluated } = validateObservation(receipt.observation);
  validateReceiver(receipt.receiver);
  validateCredential(receipt.credential, evaluated);
  validateReplay(receipt.replay);
  validateRuntimeInputs(receipt.runtime_inputs);
  validateSafety(receipt.safety);
  validateDecision(receipt.decision);
  if (options.verifyReceiptId !== false) {
    const expectedId =
      computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(receipt);
    if (receipt.receipt_id !== expectedId) fail("receipt_id_derivation_mismatch");
  }
  return receipt;
}

export function buildAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(input) {
  const receipt = structuredClone(input);
  receipt.marker = VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_MARKER;
  receipt.protocol = VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_PROTOCOL;
  receipt.receipt_id =
    computeAuthenticatedPaidWorkRuntimeRevalidationReceiptIdV1(receipt);
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(receipt);
  return receipt;
}
