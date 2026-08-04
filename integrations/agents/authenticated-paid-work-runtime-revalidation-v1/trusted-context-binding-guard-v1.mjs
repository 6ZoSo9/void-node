import { createHash } from "node:crypto";

import {
  validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1,
} from "./index.mjs";

export const VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_BINDING_MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_BINDING_V1";
export const VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_BINDING_PROTOCOL =
  "void-authenticated-paid-work-runtime-revalidation-trusted-context-binding/1";

export const VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_EXPECTED =
  Object.freeze({
    trusted_context_metadata_commit:
      "ac074d53ab937d302c69b6bff54f02d064e37d57",
    trusted_context_metadata_marker:
      "VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_TRUSTED_CONTEXT_REFERENCE_METADATA_V1",
    trusted_context_metadata_status:
      "source_reference_only_activation_forbidden",
    trusted_context_reference_id:
      "void-authenticated-paid-work-production-activation-trusted-context-reference-metadata-v1",
    bundle_contract_marker:
      "VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_V1",
    bundle_contract_version: 1,
    bundle_sha256:
      "6bf506fa7637fca967a21dd70ba8be7e940194397fc6bf51077309bd7f755a96",
    bundle_path_fingerprint_sha256:
      "606f2f3aaec35e0534d12ff5a28ee94301b8c24f370e949ec26e75e91963456a",
    maximum_bundle_bytes: 25165824,
  });

const BINDING_KEYS = [
  "authority",
  "binding_id",
  "marker",
  "observation",
  "protocol",
  "receipt_id",
  "trusted_context",
];
const OBSERVATION_KEYS = ["evaluated_at_utc"];
const TRUSTED_CONTEXT_KEYS = [
  "bundle_contents_disclosed",
  "bundle_contract_marker",
  "bundle_contract_verified",
  "bundle_contract_version",
  "bundle_path_fingerprint_sha256",
  "bundle_path_fingerprint_verified",
  "bundle_sha256",
  "bundle_sha256_verified",
  "maximum_bundle_bytes",
  "private_bundle_read_performed",
  "private_path_disclosed",
  "provider_binding_verified",
  "reference_metadata_verified",
  "secret_material_disclosed",
  "trusted_context_metadata_commit",
  "trusted_context_metadata_marker",
  "trusted_context_metadata_status",
  "trusted_context_reference_id",
];
const AUTHORITY_KEYS = [
  "activation_authorized",
  "deployment",
  "fund_movement",
  "live_authentication",
  "payment_execution",
  "service_restart",
  "signing",
  "transaction_broadcast",
  "transaction_construction",
  "wallet_or_signer_access",
  "work_credit_write",
  "work_dispatch",
];

const BINDING_ID = /^voidapwrtcb1_[a-f0-9]{64}$/;
const RECEIPT_ID = /^voidapwrr1_[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

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

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256Hex(value) {
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

function unsignedBindingBody(binding) {
  const body = structuredClone(binding);
  delete body.binding_id;
  return body;
}

export function computeAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingIdV1(
  binding,
) {
  return `voidapwrtcb1_${sha256Hex(canonicalJson(unsignedBindingBody(binding)))}`;
}

function requireExactBoolean(value, expected, label) {
  if (value !== expected) fail(`${label}_must_be_${expected}`);
}

function validateObservation(observation) {
  assertExactKeys(observation, OBSERVATION_KEYS, "observation");
  parseUtc(observation.evaluated_at_utc, "evaluated_at_utc");
}

function validateTrustedContext(trustedContext) {
  assertExactKeys(
    trustedContext,
    TRUSTED_CONTEXT_KEYS,
    "trusted_context",
  );
  const expected =
    VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_EXPECTED;
  for (const key of Object.keys(expected)) {
    if (trustedContext[key] !== expected[key]) {
      fail(`trusted_context_${key}_mismatch`);
    }
  }
  if (!COMMIT.test(trustedContext.trusted_context_metadata_commit)) {
    fail("trusted_context_metadata_commit_invalid");
  }
  for (const key of [
    "bundle_sha256",
    "bundle_path_fingerprint_sha256",
  ]) {
    if (!SHA256.test(trustedContext[key])) {
      fail(`trusted_context_${key}_invalid`);
    }
  }
  for (const key of [
    "reference_metadata_verified",
    "bundle_contract_verified",
    "bundle_sha256_verified",
    "bundle_path_fingerprint_verified",
    "provider_binding_verified",
    "private_bundle_read_performed",
  ]) {
    requireExactBoolean(
      trustedContext[key],
      true,
      `trusted_context_${key}`,
    );
  }
  for (const key of [
    "private_path_disclosed",
    "bundle_contents_disclosed",
    "secret_material_disclosed",
  ]) {
    requireExactBoolean(
      trustedContext[key],
      false,
      `trusted_context_${key}`,
    );
  }
}

function validateAuthority(authority) {
  assertExactKeys(authority, AUTHORITY_KEYS, "authority");
  for (const key of AUTHORITY_KEYS) {
    requireExactBoolean(authority[key], false, `authority_${key}`);
  }
}

export function validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
  value,
  options = { verifyBindingId: true },
) {
  const binding = requireRecord(value, "binding");
  assertExactKeys(binding, BINDING_KEYS, "binding");
  if (
    binding.marker !==
    VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_BINDING_MARKER
  ) {
    fail("marker_mismatch");
  }
  if (
    binding.protocol !==
    VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_BINDING_PROTOCOL
  ) {
    fail("protocol_mismatch");
  }
  if (!BINDING_ID.test(binding.binding_id)) fail("binding_id_invalid");
  if (!RECEIPT_ID.test(binding.receipt_id)) fail("receipt_id_invalid");
  validateObservation(binding.observation);
  validateTrustedContext(binding.trusted_context);
  validateAuthority(binding.authority);
  if (options.verifyBindingId !== false) {
    const expectedId =
      computeAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingIdV1(
        binding,
      );
    if (binding.binding_id !== expectedId) {
      fail("binding_id_derivation_mismatch");
    }
  }
  return binding;
}

export function buildAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
  input,
) {
  const binding = structuredClone(input);
  binding.marker =
    VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_BINDING_MARKER;
  binding.protocol =
    VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_BINDING_PROTOCOL;
  binding.binding_id =
    computeAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingIdV1(
      binding,
    );
  validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
    binding,
  );
  return binding;
}

export function verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1(
  receiptValue,
  bindingValue,
) {
  const receipt =
    validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(receiptValue);
  const binding =
    validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
      bindingValue,
    );
  if (receipt.runtime_inputs.trusted_context_reference_verified !== true) {
    fail("receipt_trusted_context_reference_not_verified");
  }
  if (binding.receipt_id !== receipt.receipt_id) {
    fail("trusted_context_binding_receipt_id_mismatch");
  }
  if (
    binding.observation.evaluated_at_utc !==
    receipt.observation.evaluated_at_utc
  ) {
    fail("trusted_context_binding_observation_time_mismatch");
  }
  return true;
}
