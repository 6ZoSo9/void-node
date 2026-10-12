import { createHash } from "node:crypto";

import {
  validateAuthenticatedPaidWorkCredentialRotationPlanV1,
} from "./index.mjs";

export const MARKER =
  "VOID_AUTHENTICATED_PAID_WORK_CREDENTIAL_ROTATION_RUNTIME_REVALIDATION_BINDING_V1";
export const BINDING_PREFIX = "voidapwcrrb1_";
export const BASE_ROTATION_PLAN_ID =
  "voidapwcrp1_bf56e97e7bb2143c79babafed556a41637e2a071d151436aeac9efbf43d3dde0";
export const BASE_REVIEWED_SOURCE_MAIN =
  "a6a8757b11828a30899b54eed6c261462681c916";
export const CURRENT_MAIN =
  "d12b4620cb5a6e199a6a59f21dfae6dd434c550a";

const BINDING_KEYS = [
  "authority",
  "base_reviewed_source_main",
  "binding_id",
  "current_main",
  "decision",
  "marker",
  "required_gate",
  "rotation_plan_id",
  "runtime_revalidation",
  "version",
];
const REVALIDATION_KEYS = [
  "merge_commit",
  "receipt_contract_path",
  "trusted_context_guard_path",
];
const DECISION_KEYS = [
  "credential_rotation_authorized",
  "runtime_revalidation_evidence_required",
  "status",
];
const AUTHORITY_KEYS = [
  "credential_issuance_authorized",
  "credential_registry_write_authorized",
  "receiver_restart_authorized",
  "binding_retirement_authorized",
  "replacement_binding_authorized",
  "live_canary_authorized",
];
const ID_RE = /^voidapwcrrb1_[a-f0-9]{64}$/;

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

function unsignedBinding(value) {
  const body = structuredClone(value);
  delete body.binding_id;
  return body;
}

export function computeRotationRuntimeRevalidationBindingIdV1(value) {
  return `${BINDING_PREFIX}${sha256Hex(canonicalJson(unsignedBinding(value)))}`;
}

export function validateRotationRuntimeRevalidationBindingV1(value) {
  const binding = requireRecord(value, "binding");
  exactKeys(binding, BINDING_KEYS, "binding");
  if (binding.marker !== MARKER || binding.version !== 1) {
    fail("binding_identity_mismatch");
  }
  if (typeof binding.binding_id !== "string" || !ID_RE.test(binding.binding_id)) {
    fail("binding_id_invalid");
  }
  if (binding.rotation_plan_id !== BASE_ROTATION_PLAN_ID) {
    fail("rotation_plan_id_mismatch");
  }
  if (binding.base_reviewed_source_main !== BASE_REVIEWED_SOURCE_MAIN) {
    fail("base_reviewed_source_main_mismatch");
  }
  if (binding.current_main !== CURRENT_MAIN) {
    fail("current_main_mismatch");
  }
  if (
    binding.required_gate !==
    "verify_sanitized_runtime_revalidation_receipt_and_trusted_context_binding_before_replacement_issuance"
  ) {
    fail("required_gate_mismatch");
  }

  const revalidation = requireRecord(
    binding.runtime_revalidation,
    "runtime_revalidation",
  );
  exactKeys(revalidation, REVALIDATION_KEYS, "runtime_revalidation");
  if (revalidation.merge_commit !== CURRENT_MAIN) {
    fail("runtime_revalidation_merge_commit_mismatch");
  }
  if (
    revalidation.receipt_contract_path !==
    "integrations/agents/authenticated-paid-work-runtime-revalidation-v1/index.mjs"
  ) {
    fail("runtime_revalidation_receipt_path_mismatch");
  }
  if (
    revalidation.trusted_context_guard_path !==
    "integrations/agents/authenticated-paid-work-runtime-revalidation-v1/trusted-context-binding-guard-v1.mjs"
  ) {
    fail("trusted_context_guard_path_mismatch");
  }

  const decision = requireRecord(binding.decision, "decision");
  exactKeys(decision, DECISION_KEYS, "decision");
  if (decision.status !== "HOLD_PENDING_RUNTIME_REVALIDATION_AND_ROTATION") {
    fail("decision_status_mismatch");
  }
  if (decision.runtime_revalidation_evidence_required !== true) {
    fail("runtime_revalidation_evidence_required");
  }
  if (decision.credential_rotation_authorized !== false) {
    fail("credential_rotation_authorized_must_be_false");
  }

  const authority = requireRecord(binding.authority, "authority");
  exactKeys(authority, AUTHORITY_KEYS, "authority");
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) fail(`authority_${key}_must_be_false`);
  }

  if (binding.binding_id !== computeRotationRuntimeRevalidationBindingIdV1(binding)) {
    fail("binding_id_derivation_mismatch");
  }
  return binding;
}

export function buildRotationRuntimeRevalidationBindingV1() {
  const body = {
    marker: MARKER,
    version: 1,
    rotation_plan_id: BASE_ROTATION_PLAN_ID,
    base_reviewed_source_main: BASE_REVIEWED_SOURCE_MAIN,
    current_main: CURRENT_MAIN,
    required_gate:
      "verify_sanitized_runtime_revalidation_receipt_and_trusted_context_binding_before_replacement_issuance",
    runtime_revalidation: {
      merge_commit: CURRENT_MAIN,
      receipt_contract_path:
        "integrations/agents/authenticated-paid-work-runtime-revalidation-v1/index.mjs",
      trusted_context_guard_path:
        "integrations/agents/authenticated-paid-work-runtime-revalidation-v1/trusted-context-binding-guard-v1.mjs",
    },
    decision: {
      status: "HOLD_PENDING_RUNTIME_REVALIDATION_AND_ROTATION",
      runtime_revalidation_evidence_required: true,
      credential_rotation_authorized: false,
    },
    authority: {
      credential_issuance_authorized: false,
      credential_registry_write_authorized: false,
      receiver_restart_authorized: false,
      binding_retirement_authorized: false,
      replacement_binding_authorized: false,
      live_canary_authorized: false,
    },
  };
  return validateRotationRuntimeRevalidationBindingV1({
    ...body,
    binding_id: `${BINDING_PREFIX}${sha256Hex(canonicalJson(body))}`,
  });
}

export function verifyCredentialRotationWithRuntimeRevalidationV1(
  planValue,
  bindingValue,
) {
  const plan = validateAuthenticatedPaidWorkCredentialRotationPlanV1(planValue);
  const binding = validateRotationRuntimeRevalidationBindingV1(bindingValue);
  if (binding.rotation_plan_id !== plan.plan_id) {
    fail("binding_rotation_plan_link_mismatch");
  }
  if (plan.reviewed_source_main !== binding.base_reviewed_source_main) {
    fail("binding_base_main_link_mismatch");
  }
  return true;
}
