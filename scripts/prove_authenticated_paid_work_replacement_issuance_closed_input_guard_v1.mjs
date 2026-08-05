import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildAuthenticatedPaidWorkReplacementIssuancePreparationFromClosedInputV1,
  validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1,
  AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_BOUNDS_V1,
  AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_KEYS_V1,
} from "../integrations/agents/authenticated-paid-work-replacement-issuance-preparation-v1/closed-input-guard-v1.mjs";

const readJson = (pathname) => JSON.parse(fs.readFileSync(pathname, "utf8"));
const clone = (value) => structuredClone(value);
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

const sanitizedInput =
  validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(input);
assert.notEqual(sanitizedInput, input);
assert.deepEqual(sanitizedInput, input);
assert.equal(Object.isFrozen(sanitizedInput), true);
assert.equal(Object.isFrozen(sanitizedInput.runtime_receipt), true);
assert.equal(Object.isFrozen(sanitizedInput.runtime_receipt.credential), true);
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

const mutableInput = clone(input);
const detachedSnapshot =
  validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(mutableInput);
const originalAgentId = detachedSnapshot.runtime_receipt.credential.agent_id;
mutableInput.runtime_receipt.credential.agent_id = "mutated-after-validation";
assert.equal(detachedSnapshot.runtime_receipt.credential.agent_id, originalAgentId);

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

let nestedGetterInvoked = false;
const nestedAccessor = clone(input);
Object.defineProperty(
  nestedAccessor.runtime_receipt.credential,
  "selected_credential_id",
  {
    get() {
      nestedGetterInvoked = true;
      throw new Error("nested_getter_must_not_execute");
    },
    enumerable: true,
    configurable: true,
  },
);
expectReject(
  "nested_accessor",
  () =>
    buildAuthenticatedPaidWorkReplacementIssuancePreparationFromClosedInputV1(
      nestedAccessor,
    ),
  /closed_input_accessor_forbidden:\$\.runtime_receipt\.credential\.selected_credential_id/,
);
assert.equal(nestedGetterInvoked, false);

const nestedSymbol = clone(input);
nestedSymbol.runtime_receipt[Symbol("hidden_execution_authority")] = true;
expectReject(
  "nested_symbol",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(nestedSymbol),
  /closed_input_symbol_key_forbidden:\$\.runtime_receipt/,
);

const nestedNonEnumerable = clone(input);
Object.defineProperty(nestedNonEnumerable.rotation_plan, "raw_token", {
  value: "not-a-real-token",
  enumerable: false,
  configurable: true,
});
expectReject(
  "nested_non_enumerable",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(
      nestedNonEnumerable,
    ),
  /closed_input_non_enumerable_forbidden:\$\.rotation_plan\.raw_token/,
);

const nestedInherited = clone(input);
Object.setPrototypeOf(
  nestedInherited.trusted_context_binding.trusted_context,
  { raw_token: "not-a-real-token" },
);
expectReject(
  "nested_inherited",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(
      nestedInherited,
    ),
  /closed_input_prototype_forbidden:\$\.trusted_context_binding\.trusted_context/,
);

const cyclicInput = clone(input);
cyclicInput.runtime_receipt.self = cyclicInput.runtime_receipt;
expectReject(
  "cyclic_graph",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(cyclicInput),
  /closed_input_shared_or_cyclic_reference_forbidden:\$\.runtime_receipt\.self/,
);

const sharedInput = clone(input);
const sharedNode = { hidden_authority: true };
sharedInput.runtime_receipt.injected_a = sharedNode;
sharedInput.runtime_receipt.injected_b = sharedNode;
expectReject(
  "shared_reference_graph",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(sharedInput),
  /closed_input_shared_or_cyclic_reference_forbidden:\$\.runtime_receipt\.injected_b/,
);

const sparseArrayInput = clone(input);
sparseArrayInput.runtime_receipt.injected_sparse = new Array(2);
expectReject(
  "sparse_array",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(
      sparseArrayInput,
    ),
  /closed_input_array_shape_mismatch:\$\.runtime_receipt\.injected_sparse/,
);

for (const [label, injected] of [
  ["undefined_value", undefined],
  ["nan_value", Number.NaN],
  ["infinite_value", Number.POSITIVE_INFINITY],
  ["negative_zero_value", -0],
  ["bigint_value", 1n],
]) {
  const invalidDomainInput = clone(input);
  invalidDomainInput.runtime_receipt.injected_invalid_value = injected;
  expectReject(
    label,
    () =>
      validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(
        invalidDomainInput,
      ),
    /closed_input_(value|number)_outside_json_domain/,
  );
}

assert.deepEqual(
  AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_BOUNDS_V1,
  {
    maximum_depth: 64,
    maximum_object_keys: 4_096,
    maximum_array_length: 10_000,
    maximum_total_nodes: 50_000,
    maximum_total_keys: 100_000,
    maximum_total_string_bytes: 8 * 1024 * 1024,
  },
);

console.log("closed_input_keys_exact=true");
console.log("unknown_top_level_fields_rejected=true");
console.log("unknown_fields_rejected_before_evidence_read=true");
console.log("symbol_keys_rejected=true");
console.log("inherited_inputs_rejected=true");
console.log("non_enumerable_fields_rejected=true");
console.log("accessors_rejected_without_invocation=true");
console.log("nested_accessors_rejected_without_invocation=true");
console.log("nested_symbols_and_hidden_fields_rejected=true");
console.log("custom_prototypes_cycles_and_aliases_rejected=true");
console.log("sparse_arrays_rejected=true");
console.log("json_domain_and_resource_bounds_enforced=true");
console.log("sanitized_snapshot_detached_and_deeply_frozen=true");
console.log("execution_authorized=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_GUARD_V1_PROOF_GREEN",
);
