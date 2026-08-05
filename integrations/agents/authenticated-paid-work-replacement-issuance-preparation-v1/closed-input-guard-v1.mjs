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

export const AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_BOUNDS_V1 =
  Object.freeze({
    maximum_depth: 64,
    maximum_object_keys: 4_096,
    maximum_array_length: 10_000,
    maximum_total_nodes: 50_000,
    maximum_total_keys: 100_000,
    maximum_total_string_bytes: 8 * 1024 * 1024,
  });

function fail(message) {
  throw new Error(message);
}

function codeUnitCompare(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function requireDataDescriptor(descriptor, label, enumerable) {
  if (
    !descriptor ||
    !Object.prototype.hasOwnProperty.call(descriptor, "value")
  ) {
    fail(`closed_input_accessor_forbidden:${label}`);
  }
  if (descriptor.enumerable !== enumerable) {
    fail(`closed_input_non_enumerable_forbidden:${label}`);
  }
  return descriptor.value;
}

function requireClosedRootShape(value) {
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
    requireDataDescriptor(descriptors[key], key, true);
  }
}

function newTraversalState() {
  return {
    seen: new WeakSet(),
    total_nodes: 0,
    total_keys: 0,
    total_string_bytes: 0,
  };
}

function accountNode(state, label, depth) {
  const bounds =
    AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_BOUNDS_V1;
  if (depth > bounds.maximum_depth) {
    fail(`closed_input_maximum_depth_exceeded:${label}`);
  }
  state.total_nodes += 1;
  if (state.total_nodes > bounds.maximum_total_nodes) {
    fail("closed_input_maximum_total_nodes_exceeded");
  }
}

function accountKeys(state, count, label, maximumPerContainer) {
  const bounds =
    AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_BOUNDS_V1;
  if (count > maximumPerContainer) {
    fail(`closed_input_maximum_object_keys_exceeded:${label}`);
  }
  state.total_keys += count;
  if (state.total_keys > bounds.maximum_total_keys) {
    fail("closed_input_maximum_total_keys_exceeded");
  }
}

function cloneClosedJsonValue(value, label, state, depth) {
  if (value === null || typeof value === "boolean") return value;

  if (typeof value === "string") {
    const bounds =
      AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_BOUNDS_V1;
    state.total_string_bytes += Buffer.byteLength(value, "utf8");
    if (state.total_string_bytes > bounds.maximum_total_string_bytes) {
      fail("closed_input_maximum_total_string_bytes_exceeded");
    }
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail(`closed_input_number_outside_json_domain:${label}`);
    }
    return value;
  }

  if (typeof value !== "object") {
    fail(`closed_input_value_outside_json_domain:${label}`);
  }

  accountNode(state, label, depth);
  if (state.seen.has(value)) {
    fail(`closed_input_shared_or_cyclic_reference_forbidden:${label}`);
  }
  state.seen.add(value);

  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      fail(`closed_input_array_prototype_forbidden:${label}`);
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const length = requireDataDescriptor(
      descriptors.length,
      `${label}.length`,
      false,
    );
    const bounds =
      AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_BOUNDS_V1;
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      length > bounds.maximum_array_length
    ) {
      fail(`closed_input_array_length_out_of_bounds:${label}`);
    }

    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      fail(`closed_input_symbol_key_forbidden:${label}`);
    }
    const expectedKeys = [
      ...Array.from({ length }, (_, index) => String(index)),
      "length",
    ].sort(codeUnitCompare);
    const actualKeys = [...ownKeys].sort(codeUnitCompare);
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      fail(`closed_input_array_shape_mismatch:${label}`);
    }
    accountKeys(state, length, label, bounds.maximum_array_length);

    const output = [];
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      const child = requireDataDescriptor(
        descriptors[key],
        `${label}[${index}]`,
        true,
      );
      output.push(
        cloneClosedJsonValue(child, `${label}[${index}]`, state, depth + 1),
      );
    }
    return Object.freeze(output);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(`closed_input_prototype_forbidden:${label}`);
  }

  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    fail(`closed_input_symbol_key_forbidden:${label}`);
  }
  accountKeys(
    state,
    ownKeys.length,
    label,
    AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_BOUNDS_V1
      .maximum_object_keys,
  );

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = {};
  for (const key of [...ownKeys].sort(codeUnitCompare)) {
    const child = requireDataDescriptor(
      descriptors[key],
      `${label}.${key}`,
      true,
    );
    Object.defineProperty(output, key, {
      value: cloneClosedJsonValue(
        child,
        `${label}.${key}`,
        state,
        depth + 1,
      ),
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(output);
}

export function validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(
  value,
) {
  requireClosedRootShape(value);
  return cloneClosedJsonValue(value, "$", newTraversalState(), 0);
}

export function buildAuthenticatedPaidWorkReplacementIssuancePreparationFromClosedInputV1(
  value,
) {
  const input =
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(value);
  return buildAuthenticatedPaidWorkReplacementIssuancePreparationV1(input);
}
