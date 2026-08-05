import assert from "node:assert/strict";

import {
  validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1,
} from "../integrations/agents/authenticated-paid-work-replacement-issuance-preparation-v1/closed-input-guard-v1.mjs";

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

function freshInput() {
  return {
    rotation_plan: {},
    rotation_runtime_binding: {},
    runtime_receipt: {
      credential: {
        selected_credential_id: "synthetic-closed-input-only",
      },
      evidence_array: [{ marker: "synthetic" }],
    },
    trusted_context_binding: {},
    proposed_not_before_utc: "2026-08-05T00:00:00.000Z",
    proposed_expires_at_utc: "2026-09-04T00:00:00.000Z",
  };
}

const ordinaryInput = freshInput();
assert.deepEqual(
  validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(ordinaryInput),
  ordinaryInput,
);

function trapCounter() {
  const counts = {
    get: 0,
    getOwnPropertyDescriptor: 0,
    getPrototypeOf: 0,
    has: 0,
    ownKeys: 0,
  };
  return {
    counts,
    handler: {
      get(target, key, receiver) {
        counts.get += 1;
        return Reflect.get(target, key, receiver);
      },
      getOwnPropertyDescriptor(target, key) {
        counts.getOwnPropertyDescriptor += 1;
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
      getPrototypeOf(target) {
        counts.getPrototypeOf += 1;
        return Reflect.getPrototypeOf(target);
      },
      has(target, key) {
        counts.has += 1;
        return Reflect.has(target, key);
      },
      ownKeys(target) {
        counts.ownKeys += 1;
        return Reflect.ownKeys(target);
      },
    },
  };
}

function assertNoTrap(counts) {
  assert.deepEqual(counts, {
    get: 0,
    getOwnPropertyDescriptor: 0,
    getPrototypeOf: 0,
    has: 0,
    ownKeys: 0,
  });
}

const rootTrap = trapCounter();
const rootProxy = new Proxy(freshInput(), rootTrap.handler);
expectReject(
  "root_proxy",
  () => validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(rootProxy),
  /closed_input_proxy_forbidden:\$/,
);
assertNoTrap(rootTrap.counts);

const nestedObjectInput = freshInput();
const nestedObjectTrap = trapCounter();
nestedObjectInput.runtime_receipt.credential = new Proxy(
  nestedObjectInput.runtime_receipt.credential,
  nestedObjectTrap.handler,
);
expectReject(
  "nested_object_proxy",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(
      nestedObjectInput,
    ),
  /closed_input_proxy_forbidden:\$\.runtime_receipt\.credential/,
);
assertNoTrap(nestedObjectTrap.counts);

const nestedArrayInput = freshInput();
const nestedArrayTrap = trapCounter();
nestedArrayInput.runtime_receipt.evidence_array = new Proxy(
  nestedArrayInput.runtime_receipt.evidence_array,
  nestedArrayTrap.handler,
);
expectReject(
  "nested_array_proxy",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(
      nestedArrayInput,
    ),
  /closed_input_proxy_forbidden:\$\.runtime_receipt\.evidence_array/,
);
assertNoTrap(nestedArrayTrap.counts);

const revokedInput = freshInput();
const revocable = Proxy.revocable(
  revokedInput.runtime_receipt.credential,
  {},
);
revocable.revoke();
revokedInput.runtime_receipt.credential = revocable.proxy;
expectReject(
  "revoked_proxy",
  () =>
    validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(revokedInput),
  /closed_input_proxy_forbidden:\$\.runtime_receipt\.credential/,
);

console.log("root_proxy_rejected=true");
console.log("nested_object_proxy_rejected=true");
console.log("nested_array_proxy_rejected=true");
console.log("revoked_proxy_rejected=true");
console.log("proxy_inputs_rejected_before_traps=true");
console.log("execution_authorized=false");
console.log(
  "VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_PROXY_REJECTION_V1_PROOF_GREEN",
);
