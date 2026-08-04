import assert from "node:assert/strict";
import fs from "node:fs";

import {
  ORDERED_MUTATIONS,
  buildDirectAuthenticationVerificationV1,
  buildExecutionPlanV1,
  computeExecutionPlanSha256V1,
  validateDirectAuthenticationVerificationV1,
  validateExecutionPlanV1,
  verifyExecutionPlanWithEvidenceV1,
} from "../integrations/agents/authenticated-paid-work-execution-plan-v1/index.mjs";

function clone(value) {
  return structuredClone(value);
}

function expectReject(label, operation, pattern) {
  try {
    operation();
  } catch (error) {
    const message = String(error?.message ?? error);
    assert.match(message, pattern, `${label} rejected for the wrong reason`);
    return;
  }
  throw new Error(`${label}_did_not_reject`);
}

const receipt = JSON.parse(
  fs.readFileSync(
    "fixtures/agents/authenticated-paid-work-runtime-revalidation-receipt-v1.example.json",
    "utf8",
  ),
);
const trustedContextBinding = JSON.parse(
  fs.readFileSync(
    "fixtures/agents/authenticated-paid-work-runtime-revalidation-trusted-context-binding-v1.example.json",
    "utf8",
  ),
);

const directVerification = buildDirectAuthenticationVerificationV1({
  verified_at_utc: "2026-08-04T16:50:10.000Z",
  verification_contract:
    "verifyAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1",
  packet_id: `voidafdqa1_${"1".repeat(64)}`,
  packet_sha256: "2".repeat(64),
  work_order_id: `voidawo1_${"3".repeat(64)}`,
  quote_id: `voidawq1_${"4".repeat(64)}`,
  quote_expires_at_utc: "2026-08-04T23:50:00.000Z",
});
assert.equal(
  validateDirectAuthenticationVerificationV1(directVerification),
  directVerification,
);

const preflight = {
  all_reviewed_source_artifact_digests_match: true,
  bounded_replay_snapshot_exact_and_fresh_store_only: true,
  credential_reference_privately_revalidated_without_output: true,
  disabled_configuration_preimage_exact: true,
  disabled_runtime_installation_exact: true,
  execution_lease_absent: true,
  no_inflight_paid_work_or_economic_state: true,
  rollback_receipt_destination_owner_private_and_non_symlink: true,
  runtime_listener_absent: true,
  runtime_revalidation_receipt_verified: true,
  service_inactive_before_start: true,
  target_worktree_clean_and_exact: true,
  trusted_context_binding_verified: true,
  trusted_context_reference_privately_revalidated_without_output: true,
};

const input = {
  operation_id: "void-apw-activation-example-0001",
  generated_at_utc: "2026-08-04T16:50:20.000Z",
  expires_at_utc: "2026-08-04T16:55:20.000Z",
  fresh_origin_main: "9d860b668e21c98ad19e63b2c32b463025f05310",
  runtime_revalidation_receipt: receipt,
  trusted_context_binding: trustedContextBinding,
  direct_authentication_verification: directVerification,
  preflight,
  rollback_receipt_destination_fingerprint_sha256: "a".repeat(64),
};

const plan = buildExecutionPlanV1(input);
assert.equal(validateExecutionPlanV1(plan), plan);
assert.equal(
  verifyExecutionPlanWithEvidenceV1(
    plan,
    receipt,
    trustedContextBinding,
  ),
  true,
);
assert.equal(
  plan.execution_plan_sha256,
  computeExecutionPlanSha256V1(plan),
);
assert.deepEqual(plan.ordered_mutations, [...ORDERED_MUTATIONS]);
assert.equal(plan.confirmation.supplied, null);
assert.equal(plan.confirmation.operator_authority, "zoso_sovereign_operator");
assert.equal(plan.decision.execution_authorized, false);
assert.equal(plan.decision.fresh_zoso_confirmation_required, true);
for (const value of Object.values(plan.authority)) assert.equal(value, false);

const staleRuntime = clone(input);
staleRuntime.generated_at_utc = "2026-08-04T16:56:00.000Z";
staleRuntime.expires_at_utc = "2026-08-04T16:57:00.000Z";
expectReject(
  "stale runtime evidence",
  () => buildExecutionPlanV1(staleRuntime),
  /runtime_evidence_stale/,
);

const staleDirect = clone(input);
staleDirect.direct_authentication_verification.verified_at_utc =
  "2026-08-04T16:40:00.000Z";
const directBody = clone(staleDirect.direct_authentication_verification);
delete directBody.verification_id;
staleDirect.direct_authentication_verification.verification_id =
  directVerification.verification_id;
expectReject(
  "tampered direct evidence",
  () => buildExecutionPlanV1(staleDirect),
  /direct_verification_id_mismatch/,
);

const missingPreflight = clone(input);
missingPreflight.preflight.execution_lease_absent = false;
expectReject(
  "missing execution lease gate",
  () => buildExecutionPlanV1(missingPreflight),
  /execution_lease_absent_must_be_true/,
);

const longLived = clone(input);
longLived.expires_at_utc = "2026-08-04T17:01:00.000Z";
expectReject(
  "long-lived plan",
  () => buildExecutionPlanV1(longLived),
  /plan_expiry_out_of_bounds/,
);

const reordered = clone(plan);
[reordered.ordered_mutations[0], reordered.ordered_mutations[1]] = [
  reordered.ordered_mutations[1],
  reordered.ordered_mutations[0],
];
reordered.execution_plan_sha256 = computeExecutionPlanSha256V1(reordered);
reordered.plan_id = `voidapwep1_${reordered.execution_plan_sha256}`;
expectReject(
  "reordered mutation",
  () => validateExecutionPlanV1(reordered),
  /ordered_mutations_mismatch/,
);

const paymentGranted = clone(plan);
paymentGranted.authority.payment_execution = true;
paymentGranted.execution_plan_sha256 =
  computeExecutionPlanSha256V1(paymentGranted);
paymentGranted.plan_id =
  `voidapwep1_${paymentGranted.execution_plan_sha256}`;
expectReject(
  "payment authority",
  () => validateExecutionPlanV1(paymentGranted),
  /payment_execution_must_be_false/,
);

const confirmationEmbedded = clone(plan);
confirmationEmbedded.confirmation.supplied =
  "confirm-void-authenticated-paid-work-production-activation-v1:forged";
confirmationEmbedded.execution_plan_sha256 =
  computeExecutionPlanSha256V1(confirmationEmbedded);
confirmationEmbedded.plan_id =
  `voidapwep1_${confirmationEmbedded.execution_plan_sha256}`;
expectReject(
  "embedded confirmation",
  () => validateExecutionPlanV1(confirmationEmbedded),
  /confirmation_boundary_mismatch/,
);

const digestTamper = clone(plan);
digestTamper.execution_plan_sha256 = "f".repeat(64);
expectReject(
  "plan digest tamper",
  () => validateExecutionPlanV1(digestTamper),
  /plan_content_address_mismatch/,
);

const wrongBinding = clone(trustedContextBinding);
wrongBinding.receipt_id = `voidapwrr1_${"f".repeat(64)}`;
expectReject(
  "wrong trusted-context receipt link",
  () => verifyExecutionPlanWithEvidenceV1(plan, receipt, wrongBinding),
  /trusted_context_binding_receipt_id_mismatch|binding_id_derivation_mismatch/,
);

console.log(`plan_id=${plan.plan_id}`);
console.log(`execution_plan_sha256=${plan.execution_plan_sha256}`);
console.log(`direct_verification_id=${directVerification.verification_id}`);
console.log("runtime_revalidation_link_exact=true");
console.log("trusted_context_link_exact=true");
console.log("fresh_quote_and_signatures_bound=true");
console.log("ordered_mutation_allowlist_exact=true");
console.log("fresh_zoso_confirmation_required=true");
console.log("execution_authorized=false");
console.log("VOID_AUTHENTICATED_PAID_WORK_EXECUTION_PLAN_V1_PROOF_GREEN");
