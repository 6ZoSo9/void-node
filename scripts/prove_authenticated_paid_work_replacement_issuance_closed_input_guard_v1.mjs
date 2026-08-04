import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildAuthenticatedPaidWorkReplacementIssuancePreparationFromClosedInputV1,
  validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1,
  AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_KEYS_V1,
} from "../integrations/agents/authenticated-paid-work-replacement-issuance-preparation-v1/closed-input-guard-v1.mjs";

const readJson = (pathname) => JSON.parse(fs.readFileSync(pathname, "utf8"));
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

const input = {
  rotation_plan: readJson(
    "fixtures/agents/authenticated-paid-work-credential-rotation-plan-v1.example.json",
  ),
  rotation_runtime_binding: readJson(
    "fixtures/agents/authenticated-paid-work-credential-rotation-runtime-revalidation-binding-v1.example.json",
  ),
  runtime_receipt: readJson(
    "fixtures/agents/authenticated-paid-work-runtime-revalidation-receipt-v1.example.json",
  ),
  trusted_context_binding: readJson(
    "fixtures/agents/authenticated-paid-work-runtime-revalidation-trusted-context-binding-v1.example.json",
  ),
  proposed_not_before_utc: "2026-08-04T17:00:00.000Z",
  proposed_expires_at_utc: "2026-09-03T17:00:00.000Z",
};
const expectedPacket = readJson(
  "fixtures/agents/authenticated-paid-work-replacement-issuance-preparation-v1.example.json",
);

assert.equal(
  validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(input),
  input,
);
assert.deepEqual(
  Reflect.ownKeys(input).sort(),
  [...AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_KEYS_V1].sort(),
);
assert.deepEqual(
  buildAuthenticatedPaidWorkReplacementIssuancePreparationFromClosedInputV1(
    input,
  ),
  expectedPacket,
);

for (const [label, extra] of [
  ["resolved_credential_input", { replacement_credential_id: `voidapwc1_${"a".repeat(64)}` }],
  ["registry_write_input", { credential_registry_write_authorized: true }],
  ["raw_token_input", { raw_token: "not-a-real-token" }],
  ["widened_authority_input", { authority: { execution_authorized: true } }],
]) {
  expectReject(
    label,
    () =>
      buildAuthenticatedPaidWorkReplacementIssuancePreparationFromClosedInputV1({
        ...input,
        ...extra,
      }),
    /closed_input_keys_mismatch/,
  );
}

expectReject(
  "unknown_key_rejected_before_evidence_validation",
  () =>
    buildAuthenticatedPaidWorkReplacementIssuancePreparationFromClosedInputV1({
      ...input,
      rotation_plan: null,
      raw_token: "not-a-real-token",
    }),
  /closed_input_keys_mismatch/,
);

const symbolInput = { ...input };
symbolInput[Symbol("hidden_authority")] = true;
expectReject(
  "symbol_key",
  () => validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(symbolInput),
  /closed_input_symbol_key_forbidden/,
);

const inheritedInput = Object.assign(
  Object.create({ raw_token: "not-a-real-token" }),
  input,
);
expectReject(
  "inherited_input",
  () => validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(inheritedInput),
  /closed_input_prototype_forbidden/,
);

const nonEnumerableInput = { ...input };
Object.defineProperty(nonEnumerableInput, "proposed_expires_at_utc", {
  value: input.proposed_expires_at_utc,
  enumerable: false,
  configurable: true,
  writable: true,
});
expectReject(
  "non_enumerable_expected_field",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(
      nonEnumerableInput,
    ),
  /closed_input_non_enumerable_forbidden:proposed_expires_at_utc/,
);

let getterInvoked = false;
const accessorInput = { ...input };
Object.defineProperty(accessorInput, "proposed_not_before_utc", {
  get() {
    getterInvoked = true;
    throw new Error("getter_must_not_execute");
  },
  enumerable: true,
  configurable: true,
});
expectReject(
  "accessor_expected_field",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(accessorInput),
  /closed_input_accessor_forbidden:proposed_not_before_utc/,
);
assert.equal(getterInvoked, false);

const nonEnumerableUnknown = { ...input };
Object.defineProperty(nonEnumerableUnknown, "raw_token", {
  value: "not-a-real-token",
  enumerable: false,
  configurable: true,
});
expectReject(
  "non_enumerable_unknown_field",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(
      nonEnumerableUnknown,
    ),
  /closed_input_keys_mismatch/,
);

console.log("closed_input_keys_exact=true");
console.log("unknown_top_level_fields_rejected=true");
console.log("unknown_fields_rejected_before_evidence_read=true");
console.log("symbol_keys_rejected=true");
console.log("inherited_inputs_rejected=true");
console.log("non_enumerable_fields_rejected=true");
console.log("accessors_rejected_without_invocation=true");
console.log("execution_authorized=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_GUARD_V1_PROOF_GREEN",
);
