import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildAuthenticatedPaidWorkReplacementIssuancePreparationV1,
  computeReplacementIssuancePreparationPacketIdV1,
  validateAuthenticatedPaidWorkReplacementIssuancePreparationV1,
  FALSE_AUTHORITY,
  ORDERED_GATES,
} from "../integrations/agents/authenticated-paid-work-replacement-issuance-preparation-v1/index.mjs";

const readJson = (pathname) => JSON.parse(fs.readFileSync(pathname, "utf8"));
const clone = (value) => structuredClone(value);
const reseal = (packet) => {
  packet.packet_id = computeReplacementIssuancePreparationPacketIdV1(packet);
  return packet;
};
const expectReject = (label, operation, pattern) => {
  try {
    operation();
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!pattern.test(message)) {
      throw new Error(`${label}_wrong_error:${message}`);
    }
    return;
  }
  throw new Error(`${label}_did_not_reject`);
};

const rotationPlan = readJson(
  "fixtures/agents/authenticated-paid-work-credential-rotation-plan-v1.example.json",
);
const rotationRuntimeBinding = readJson(
  "fixtures/agents/authenticated-paid-work-credential-rotation-runtime-revalidation-binding-v1.example.json",
);
const runtimeReceipt = readJson(
  "fixtures/agents/authenticated-paid-work-runtime-revalidation-receipt-v1.example.json",
);
const trustedContextBinding = readJson(
  "fixtures/agents/authenticated-paid-work-runtime-revalidation-trusted-context-binding-v1.example.json",
);
const fixture = readJson(
  "fixtures/agents/authenticated-paid-work-replacement-issuance-preparation-v1.example.json",
);

const input = {
  rotation_plan: rotationPlan,
  rotation_runtime_binding: rotationRuntimeBinding,
  runtime_receipt: runtimeReceipt,
  trusted_context_binding: trustedContextBinding,
  proposed_not_before_utc: "2026-08-04T17:00:00.000Z",
  proposed_expires_at_utc: "2026-09-03T17:00:00.000Z",
};
const rebuilt =
  buildAuthenticatedPaidWorkReplacementIssuancePreparationV1(input);
assert.deepEqual(rebuilt, fixture);
assert.equal(
  validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(fixture),
  fixture,
);
assert.equal(
  fixture.packet_id,
  computeReplacementIssuancePreparationPacketIdV1(fixture),
);
assert.deepEqual(fixture.ordered_gates, [...ORDERED_GATES]);
assert.deepEqual(fixture.authority, { ...FALSE_AUTHORITY });

const wrongTrustedContextLink = clone(trustedContextBinding);
wrongTrustedContextLink.receipt_id = `voidapwrr1_${"f".repeat(64)}`;
expectReject(
  "wrong_trusted_context_link",
  () => buildAuthenticatedPaidWorkReplacementIssuancePreparationV1({
    ...input,
    trusted_context_binding: wrongTrustedContextLink,
  }),
  /trusted_context_binding_receipt_id_mismatch/,
);

const staleRotationCompanion = clone(rotationRuntimeBinding);
staleRotationCompanion.current_main = "0".repeat(40);
expectReject(
  "stale_rotation_companion",
  () => buildAuthenticatedPaidWorkReplacementIssuancePreparationV1({
    ...input,
    rotation_runtime_binding: staleRotationCompanion,
  }),
  /current_main_mismatch|binding_id_derivation_mismatch/,
);

expectReject(
  "not_before_precedes_observation",
  () => buildAuthenticatedPaidWorkReplacementIssuancePreparationV1({
    ...input,
    proposed_not_before_utc: "2026-08-04T16:50:09.249Z",
  }),
  /replacement_not_before_precedes_runtime_observation/,
);

expectReject(
  "lifetime_exceeds_policy",
  () => buildAuthenticatedPaidWorkReplacementIssuancePreparationV1({
    ...input,
    proposed_expires_at_utc: "2026-09-03T17:00:00.001Z",
  }),
  /replacement_lifetime_exceeds_review_policy/,
);

const resolvedCredential = clone(fixture);
resolvedCredential.replacement_request.replacement_credential_id =
  `voidapwc1_${"a".repeat(64)}`;
reseal(resolvedCredential);
expectReject(
  "resolved_credential",
  () => validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(
    resolvedCredential,
  ),
  /replacement_credential_id_must_be_unresolved/,
);

const currentnessClaim = clone(fixture);
currentnessClaim.evidence.current_runtime_state_established = true;
reseal(currentnessClaim);
expectReject(
  "currentness_claim",
  () => validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(
    currentnessClaim,
  ),
  /evidence_current_runtime_state_established_must_be_false/,
);

const executionGranted = clone(fixture);
executionGranted.decision.execution_authorized = true;
reseal(executionGranted);
expectReject(
  "execution_granted",
  () => validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(
    executionGranted,
  ),
  /decision_execution_authorized_must_be_false/,
);

const authorityGranted = clone(fixture);
authorityGranted.authority.credential_issuance_authorized = true;
reseal(authorityGranted);
expectReject(
  "issuance_authority_granted",
  () => validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(
    authorityGranted,
  ),
  /authority_credential_issuance_authorized_mismatch/,
);

const reordered = clone(fixture);
[reordered.ordered_gates[0], reordered.ordered_gates[1]] =
  [reordered.ordered_gates[1], reordered.ordered_gates[0]];
reseal(reordered);
expectReject(
  "reordered_gates",
  () => validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(reordered),
  /ordered_gate_sequence_mismatch/,
);

const secretKey = clone(fixture);
secretKey.replacement_request.token = "not-a-real-token";
reseal(secretKey);
expectReject(
  "secret_key",
  () => validateAuthenticatedPaidWorkReplacementIssuancePreparationV1(secretKey),
  /replacement_request_keys_mismatch|prohibited_private_material_key/,
);

console.log(`packet_id=${fixture.packet_id}`);
console.log(`rotation_plan_id=${fixture.rotation.rotation_plan_id}`);
console.log(
  `rotation_runtime_binding_id=${fixture.rotation.rotation_runtime_binding_id}`,
);
console.log(`runtime_receipt_id=${fixture.evidence.runtime_receipt_id}`);
console.log(
  `trusted_context_binding_id=${fixture.evidence.trusted_context_binding_id}`,
);
console.log("rotation_and_runtime_contracts_composed=true");
console.log("replacement_identity_unresolved=true");
console.log("replacement_lifetime_bounded=true");
console.log("sanitized_issuance_request_prepared=true");
console.log("producer_authentication_established=false");
console.log("current_runtime_state_established=false");
console.log("private_credential_material_generated=false");
console.log("credential_registry_write_completed=false");
console.log("old_binding_retired=false");
console.log("replacement_binding_applied=false");
console.log("execution_authorized=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_PREPARATION_V1_PROOF_GREEN",
);
