import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildAuthenticatedPaidWorkCredentialRotationPlanV1,
} from "../integrations/agents/authenticated-paid-work-credential-rotation-v1/index.mjs";
import {
  buildRotationRuntimeRevalidationBindingV1,
  computeRotationRuntimeRevalidationBindingIdV1,
  validateRotationRuntimeRevalidationBindingV1,
  verifyCredentialRotationWithRuntimeRevalidationV1,
} from "../integrations/agents/authenticated-paid-work-credential-rotation-v1/runtime-revalidation-binding-guard-v1.mjs";

function expectReject(label, mutate, pattern) {
  const candidate = structuredClone(binding);
  mutate(candidate);
  try {
    validateRotationRuntimeRevalidationBindingV1(candidate);
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!pattern.test(message)) throw new Error(`${label}_wrong_error:${message}`);
    return;
  }
  throw new Error(`${label}_did_not_reject`);
}

const plan = buildAuthenticatedPaidWorkCredentialRotationPlanV1();
const fixture = JSON.parse(
  fs.readFileSync(
    "fixtures/agents/authenticated-paid-work-credential-rotation-runtime-revalidation-binding-v1.example.json",
    "utf8",
  ),
);
const binding = buildRotationRuntimeRevalidationBindingV1();
assert.deepEqual(binding, fixture);
assert.equal(
  binding.binding_id,
  computeRotationRuntimeRevalidationBindingIdV1(binding),
);
assert.equal(
  verifyCredentialRotationWithRuntimeRevalidationV1(plan, binding),
  true,
);

expectReject(
  "wrong_current_main",
  (candidate) => {
    candidate.current_main = candidate.base_reviewed_source_main;
    candidate.binding_id = computeRotationRuntimeRevalidationBindingIdV1(candidate);
  },
  /current_main_mismatch/,
);
expectReject(
  "wrong_runtime_merge",
  (candidate) => {
    candidate.runtime_revalidation.merge_commit =
      candidate.base_reviewed_source_main;
    candidate.binding_id = computeRotationRuntimeRevalidationBindingIdV1(candidate);
  },
  /runtime_revalidation_merge_commit_mismatch/,
);
expectReject(
  "issuance_before_revalidation",
  (candidate) => {
    candidate.decision.runtime_revalidation_evidence_required = false;
    candidate.binding_id = computeRotationRuntimeRevalidationBindingIdV1(candidate);
  },
  /runtime_revalidation_evidence_required/,
);
expectReject(
  "rotation_authority_granted",
  (candidate) => {
    candidate.decision.credential_rotation_authorized = true;
    candidate.binding_id = computeRotationRuntimeRevalidationBindingIdV1(candidate);
  },
  /credential_rotation_authorized_must_be_false/,
);
expectReject(
  "binding_id_tamper",
  (candidate) => {
    candidate.binding_id =
      "voidapwcrrb1_0000000000000000000000000000000000000000000000000000000000000000";
  },
  /binding_id_derivation_mismatch/,
);

console.log(`rotation_plan_id=${plan.plan_id}`);
console.log(`binding_id=${binding.binding_id}`);
console.log(`current_main=${binding.current_main}`);
console.log("runtime_revalidation_receipt_contract_bound=true");
console.log("trusted_context_binding_contract_bound=true");
console.log("runtime_revalidation_required_before_issuance=true");
console.log("credential_rotation_authorized=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_CREDENTIAL_ROTATION_RUNTIME_REVALIDATION_BINDING_V1_PROOF_GREEN",
);
