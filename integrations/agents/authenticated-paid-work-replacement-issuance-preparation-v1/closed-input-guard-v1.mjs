import {
  buildAuthenticatedPaidWorkReplacementIssuancePreparationV1,
} from "./index.mjs";

export const AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_KEYS_V1 =
  Object.freeze([
    "proposed_expires_at_utc",
    "proposed_not_before_utc",
    "rotation_plan",
    "rotation_runtime_binding",
    "runtime_receipt",
    "trusted_context_binding",
  ]);

function fail(message) {
  throw new Error(message);
}

function codeUnitCompare(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function requireClosedPlainInputRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("closed_input_must_be_object");
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("closed_input_prototype_forbidden");
  }

  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    fail("closed_input_symbol_key_forbidden");
  }

  const actual = [...ownKeys].sort(codeUnitCompare);
  const expected = [
    ...AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_KEYS_V1,
  ].sort(codeUnitCompare);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("closed_input_keys_mismatch");
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of expected) {
    const descriptor = descriptors[key];
    if (
      !descriptor ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value")
    ) {
      fail(`closed_input_accessor_forbidden:${key}`);
    }
    if (descriptor.enumerable !== true) {
      fail(`closed_input_non_enumerable_forbidden:${key}`);
    }
  }

  return value;
}

export function validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(
  value,
) {
  return requireClosedPlainInputRecord(value);
}

export function buildAuthenticatedPaidWorkReplacementIssuancePreparationFromClosedInputV1(
  value,
) {
  const input =
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(value);
  return buildAuthenticatedPaidWorkReplacementIssuancePreparationV1(input);
}
