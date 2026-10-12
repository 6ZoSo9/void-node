import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1,
  computePostExpiryRecoveryPreparationPacketIdV1,
  validateAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1,
} from "../integrations/agents/authenticated-paid-work-post-expiry-recovery-preparation-v1/index.mjs";

const rotationPlanPath =
  "fixtures/agents/authenticated-paid-work-credential-rotation-plan-v1.example.json";
const rotationBindingPath =
  "fixtures/agents/authenticated-paid-work-credential-rotation-runtime-revalidation-binding-v1.example.json";
const fixturePath =
  "fixtures/agents/authenticated-paid-work-post-expiry-recovery-preparation-v1.example.json";

function clone(value) {
  return structuredClone(value);
}

function reseal(packet) {
  packet.packet_id =
    computePostExpiryRecoveryPreparationPacketIdV1(packet);
  return packet;
}

function expectReject(label, operation, pattern) {
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
}

const rotationPlan = JSON.parse(fs.readFileSync(rotationPlanPath, "utf8"));
const rotationRuntimeBinding = JSON.parse(
  fs.readFileSync(rotationBindingPath, "utf8"),
);
const input = {
  rotation_plan: rotationPlan,
  rotation_runtime_binding: rotationRuntimeBinding,
  observed_at_utc: "2026-08-05T01:30:00.000Z",
  pre_expiry_runtime_receipt_available: false,
  current_runtime_state_established: false,
  producer_authentication_established: false,
  proposed_not_before_utc: "2026-08-05T02:00:00.000Z",
  proposed_expires_at_utc: "2026-08-12T02:00:00.000Z",
};

const packet =
  buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(input);
assert.equal(
  validateAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(packet),
  packet,
);
assert.equal(
  packet.packet_id,
  computePostExpiryRecoveryPreparationPacketIdV1(packet),
);

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
assert.deepEqual(
  fixture,
  packet,
  "checked-in example must equal deterministic recovery packet",
);

const beforeBoundary = clone(input);
beforeBoundary.observed_at_utc = "2026-08-04T23:59:59.999Z";
expectReject(
  "before_boundary",
  () => buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    beforeBoundary,
  ),
  /observation_precedes_rotation_boundary/,
);

const receiptAvailable = clone(input);
receiptAvailable.pre_expiry_runtime_receipt_available = true;
expectReject(
  "pre_expiry_receipt_available",
  () => buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    receiptAvailable,
  ),
  /pre_expiry_runtime_receipt_must_be_unavailable/,
);

const runtimeClaim = clone(input);
runtimeClaim.current_runtime_state_established = true;
expectReject(
  "current_runtime_claim",
  () => buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    runtimeClaim,
  ),
  /current_runtime_state_must_remain_unestablished/,
);

const producerClaim = clone(input);
producerClaim.producer_authentication_established = true;
expectReject(
  "producer_authentication_claim",
  () => buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    producerClaim,
  ),
  /producer_authentication_must_remain_unestablished/,
);

const notBeforeTooEarly = clone(input);
notBeforeTooEarly.proposed_not_before_utc = "2026-08-05T01:29:59.999Z";
expectReject(
  "not_before_precedes_observation",
  () => buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    notBeforeTooEarly,
  ),
  /replacement_not_before_precedes_recovery_observation/,
);

const excessiveLifetime = clone(input);
excessiveLifetime.proposed_expires_at_utc =
  "2026-09-04T02:00:00.001Z";
expectReject(
  "excessive_lifetime",
  () => buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    excessiveLifetime,
  ),
  /replacement_lifetime_exceeds_review_policy/,
);

const wrongCredentialBoundary = clone(input);
wrongCredentialBoundary.rotation_plan.current_credential.expires_at_utc =
  "2026-08-06T00:00:00Z";
expectReject(
  "wrong_credential_boundary",
  () => buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    wrongCredentialBoundary,
  ),
  /credential_expiry_mismatch|plan_id_derivation_mismatch|input_credential_boundary_mismatch/,
);

const inventedLegacyPlan = clone(packet);
inventedLegacyPlan.recovery_request.canonical_issuance_plan_id =
  `voidapwnlp1_${"a".repeat(64)}`;
reseal(inventedLegacyPlan);
expectReject(
  "invented_legacy_plan",
  () => validateAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    inventedLegacyPlan,
  ),
  /canonical_issuance_plan_id_must_be_unresolved/,
);

const rotationIdMisused = clone(packet);
rotationIdMisused.recovery_request.canonical_issuance_plan_id =
  packet.rotation.rotation_plan_id;
reseal(rotationIdMisused);
expectReject(
  "rotation_id_misused_as_legacy_plan",
  () => validateAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    rotationIdMisused,
  ),
  /canonical_issuance_plan_id_must_be_unresolved/,
);

const canonicalRequestClaim = clone(packet);
canonicalRequestClaim.decision.sanitized_canonical_issuance_request_prepared =
  true;
reseal(canonicalRequestClaim);
expectReject(
  "canonical_request_claim",
  () => validateAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    canonicalRequestClaim,
  ),
  /decision_sanitized_canonical_issuance_request_prepared_must_be_false/,
);

const issuanceAuthority = clone(packet);
issuanceAuthority.authority.credential_issuance_authorized = true;
reseal(issuanceAuthority);
expectReject(
  "issuance_authority",
  () => validateAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    issuanceAuthority,
  ),
  /authority_credential_issuance_authorized_mismatch/,
);

const unknownInput = {
  ...input,
  credential_issuance_authorized: false,
};
expectReject(
  "unknown_input_key",
  () => buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    unknownInput,
  ),
  /input_keys_mismatch/,
);

let proxyTrapCount = 0;
const proxiedInput = new Proxy(input, {
  get() {
    proxyTrapCount += 1;
    throw new Error("proxy_get_trap_executed");
  },
  ownKeys() {
    proxyTrapCount += 1;
    throw new Error("proxy_own_keys_trap_executed");
  },
  getOwnPropertyDescriptor() {
    proxyTrapCount += 1;
    throw new Error("proxy_descriptor_trap_executed");
  },
  getPrototypeOf() {
    proxyTrapCount += 1;
    throw new Error("proxy_prototype_trap_executed");
  },
});
expectReject(
  "root_proxy",
  () => buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    proxiedInput,
  ),
  /closed_input_proxy_forbidden/,
);
assert.equal(proxyTrapCount, 0, "proxy traps must not execute");

let getterCount = 0;
const accessorInput = clone(input);
Object.defineProperty(accessorInput, "observed_at_utc", {
  enumerable: true,
  configurable: true,
  get() {
    getterCount += 1;
    return input.observed_at_utc;
  },
});
expectReject(
  "root_accessor",
  () => buildAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    accessorInput,
  ),
  /closed_input_accessor_forbidden/,
);
assert.equal(getterCount, 0, "accessor getter must not execute");

const tamperedId = clone(packet);
tamperedId.packet_id = `voidapwperp1_${"f".repeat(64)}`;
expectReject(
  "packet_id_tamper",
  () => validateAuthenticatedPaidWorkPostExpiryRecoveryPreparationV1(
    tamperedId,
  ),
  /packet_id_derivation_mismatch/,
);

console.log(`packet_id=${packet.packet_id}`);
console.log(`recovery_main=${packet.source.recovery_main}`);
console.log(
  `replacement_preparation_merge_commit=${packet.source.replacement_preparation_merge_commit}`,
);
console.log(`rotation_plan_id=${packet.rotation.rotation_plan_id}`);
console.log(
  `rotation_runtime_binding_id=${packet.rotation.rotation_runtime_binding_id}`,
);
console.log(
  `rotation_boundary_utc=${packet.rotation.rotation_boundary_utc}`,
);
console.log(`observed_at_utc=${packet.evidence_gap.observed_at_utc}`);
console.log("old_credential_expired=true");
console.log("old_binding_expired=true");
console.log("pre_expiry_runtime_receipt_available=false");
console.log("current_runtime_state_established=false");
console.log("producer_authentication_established=false");
console.log("canonical_issuance_plan_id=null");
console.log("rotation_plan_id_accepted_as_canonical_issuance_plan=false");
console.log("sanitized_canonical_issuance_request_prepared=false");
console.log("private_credential_material_generated=false");
console.log("credential_registry_write_completed=false");
console.log("old_binding_retired=false");
console.log("replacement_binding_applied=false");
console.log("execution_authorized=false");
console.log("proxy_traps_executed=0");
console.log("accessor_getters_executed=0");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_POST_EXPIRY_RECOVERY_PREPARATION_V1_PROOF_GREEN",
);
