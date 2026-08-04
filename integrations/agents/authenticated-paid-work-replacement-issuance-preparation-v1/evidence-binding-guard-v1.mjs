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
  validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1,
  verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1,
} from "../authenticated-paid-work-runtime-revalidation-v1/trusted-context-binding-guard-v1.mjs";
import {
  validateAuthenticatedPaidWorkReplacementIssuancePreparationV1,
} from "./index.mjs";

const EVIDENCE_INPUT_KEYS = [
  "rotation_plan",
  "rotation_runtime_binding",
  "runtime_receipt",
  "trusted_context_binding",
];

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

function requireEqual(actual, expected, label) {
  if (actual !== expected) fail(`${label}_mismatch`);
}

export function verifyAuthenticatedPaidWorkReplacementIssuancePreparationEvidenceBindingV1(
  packetValue,
  evidenceInputValue,
) {
  const packet =
    validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(packetValue);
  const evidenceInput = requireRecord(
    evidenceInputValue,
    "evidence_input",
  );
  assertExactKeys(
    evidenceInput,
    EVIDENCE_INPUT_KEYS,
    "evidence_input",
  );

  const rotationPlan =
    validateAuthenticatedPaidWorkCredentialRotationPlanV1(
      evidenceInput.rotation_plan,
    );
  const rotationRuntimeBinding =
    validateRotationRuntimeRevalidationBindingV1(
      evidenceInput.rotation_runtime_binding,
    );
  verifyCredentialRotationWithRuntimeRevalidationV1(
    rotationPlan,
    rotationRuntimeBinding,
  );

  const runtimeReceipt =
    validateAuthenticatedPaidWorkRuntimeRevalidationReceiptV1(
      evidenceInput.runtime_receipt,
    );
  const trustedContextBinding =
    validateAuthenticatedPaidWorkRuntimeRevalidationTrustedContextBindingV1(
      evidenceInput.trusted_context_binding,
    );
  verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1(
    runtimeReceipt,
    trustedContextBinding,
  );

  requireEqual(
    packet.rotation.rotation_plan_id,
    rotationPlan.plan_id,
    "packet_rotation_plan_id",
  );
  requireEqual(
    packet.rotation.rotation_runtime_binding_id,
    rotationRuntimeBinding.binding_id,
    "packet_rotation_runtime_binding_id",
  );
  requireEqual(
    packet.evidence.runtime_receipt_id,
    runtimeReceipt.receipt_id,
    "packet_runtime_receipt_id",
  );
  requireEqual(
    packet.evidence.trusted_context_binding_id,
    trustedContextBinding.binding_id,
    "packet_trusted_context_binding_id",
  );
  requireEqual(
    packet.evidence.evaluated_at_utc,
    runtimeReceipt.observation.evaluated_at_utc,
    "packet_evaluated_at_utc",
  );

  requireEqual(
    packet.rotation.current_credential_id,
    rotationPlan.current_credential.credential_id,
    "packet_current_credential_rotation",
  );
  requireEqual(
    packet.rotation.destination_wc_account,
    rotationPlan.current_binding.destination_wc_account,
    "packet_destination_account_rotation",
  );
  if (
    Date.parse(packet.rotation.rotation_boundary_utc) !==
    Date.parse(rotationPlan.lifecycle_contract.rotation_boundary_utc)
  ) {
    fail("packet_rotation_boundary_mismatch");
  }

  requireEqual(
    packet.replacement_request.agent_id,
    rotationPlan.replacement_contract.replacement_agent_id,
    "packet_replacement_agent_rotation",
  );
  requireEqual(
    packet.replacement_request.scope,
    rotationPlan.replacement_contract.replacement_scope,
    "packet_replacement_scope_rotation",
  );
  requireEqual(
    packet.replacement_request.destination_wc_account,
    rotationPlan.replacement_contract.replacement_destination_wc_account,
    "packet_replacement_account_rotation",
  );

  requireEqual(
    packet.rotation.current_credential_id,
    runtimeReceipt.credential.selected_credential_id,
    "packet_runtime_credential",
  );
  requireEqual(
    packet.replacement_request.agent_id,
    runtimeReceipt.credential.agent_id,
    "packet_runtime_agent",
  );
  requireEqual(
    packet.replacement_request.scope,
    runtimeReceipt.credential.scope,
    "packet_runtime_scope",
  );

  return true;
}
