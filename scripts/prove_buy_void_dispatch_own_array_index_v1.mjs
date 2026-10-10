#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
  VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1,
  planBuyVoidOperatorAllocationDispatchV1,
} from "../dist/economic/buy_void_operator_verified_allocation_dispatch_v1.js";

const MARKER = "VOID_DISPATCH_OWN_ARRAY_INDEX_SENTINEL_V1";
const ORIGINAL_PUSH_DESCRIPTOR = Object.getOwnPropertyDescriptor(Array.prototype, "push");
const ORIGINAL_INDEX_0 = Object.getOwnPropertyDescriptor(Array.prototype, "0");
const ORIGINAL_INDEX_1 = Object.getOwnPropertyDescriptor(Array.prototype, "1");
assert.equal(typeof ORIGINAL_PUSH_DESCRIPTOR?.value, "function");
const nativePush = ORIGINAL_PUSH_DESCRIPTOR.value;

function makeInput(status) {
  const requestId = "synthetic-dispatch-array-r1";
  return {
    event: {
      request_id: requestId,
      operator_status: status,
      payment_verifier: { from_address: "0x" + "1".repeat(40) },
      claims: [MARKER, "synthetic-trailer"],
      nested: { labels: ["synthetic-prefix", MARKER] },
    },
    request: {
      request_id: requestId,
      delivery_address: "0x" + "1".repeat(40),
      quoted_void: "2",
      audit: [MARKER, "synthetic-other"],
      nested: { tags: ["synthetic-prefix", MARKER] },
    },
    request_dir: "/tmp/void-dispatch-array-proof-no-write",
    allocation_ledger_root: VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
    allocation_high_water_root: VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
    with_launch_authority_mutation() {
      assert.fail("NO launch mutation permitted in source-only plan proof");
    },
    read_sale_state() {
      assert.fail("NO sale-state callback permitted in source-only plan proof");
    },
  };
}

function projection(plan) {
  return JSON.stringify({
    kind: plan.kind,
    event: plan.event,
    request: plan.request,
    request_dir: plan.request_dir,
  });
}

function assertOwnFrozenDense(plan) {
  for (const list of [
    plan.event.claims, plan.event.nested.labels,
    plan.request.audit, plan.request.nested.tags,
  ]) {
    assert.equal(Array.isArray(list), true);
    assert.equal(list.length, 2);
    assert.equal(Object.hasOwn(list, "0"), true);
    assert.equal(Object.hasOwn(list, "1"), true);
    assert.equal(Object.isFrozen(list), true);
    assert.equal(Object.getOwnPropertyDescriptor(list, "toJSON")?.value, undefined);
    assert.equal(Object.getOwnPropertyDescriptor(list, "toJSON")?.enumerable, false);
  }
}

function restore(key, descriptor) {
  if (descriptor === undefined) {
    delete Array.prototype[key];
  } else {
    Object.defineProperty(Array.prototype, key, descriptor);
  }
}

const statuses = ["reviewed", "payment_verified"];
const expected = new Map();
for (const status of statuses) {
  const baseline = planBuyVoidOperatorAllocationDispatchV1(makeInput(status));
  assertOwnFrozenDense(baseline);
  assert.equal(baseline.kind,
    status === "payment_verified" ? "verified_payment_allocation_handoff" :
      "nonpayment_legacy_writer");
  expected.set(status, projection(baseline));
}

const controlProbe = {
  numericSetterCalls: 0,
  contaminatedPushCalls: 0,
  proofFailures: 0,
};
for (const index of [0, 1]) {
  const old = Object.getOwnPropertyDescriptor(Array.prototype, String(index));
  assert.ok(!old || old.configurable, "original inherited numeric slot cannot be changed");
  let markerHits = 0;
  let captured = [];
  let attemptedError = null;
  try {
    Object.defineProperty(Array.prototype, String(index), {
      configurable: true,
      enumerable: false,
      set(value) {
        if (value === MARKER) markerHits += 1;
      },
    });
    // Native Array#push onto an empty/holey array demonstrates the positive
    // malicious inherited-setter control before testing the actual module.
    const control = index === 0 ? [] : ["synthetic-neutral"];
    Reflect.apply(nativePush, control, [MARKER]);
    controlProbe.numericSetterCalls += markerHits;
    if (markerHits !== 1) throw Error("numeric setter control not armed");
    markerHits = 0;

    captured = statuses.map(status =>
      planBuyVoidOperatorAllocationDispatchV1(makeInput(status)));
  } catch (err) {
    attemptedError = err;
  } finally {
    restore(String(index), old);
  }
  if (attemptedError) {
    controlProbe.proofFailures++;
    throw attemptedError;
  }
  assert.equal(markerHits, 0,
    "reviewed dispatcher must not write through inherited numeric setter " + index);
  for (let n = 0; n < statuses.length; n++) {
    const plan = captured[n];
    assertOwnFrozenDense(plan);
    assert.equal(projection(plan), expected.get(statuses[n]));
  }
}

{
  let poisonInvocations = 0;
  let captured = [];
  let attemptedError = null;
  try {
    Object.defineProperty(Array.prototype, "push", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function (...args) {
        if (args.length && args[0] === MARKER) {
          poisonInvocations += 1;
          throw Error("hostile_array_prototype_push_called");
        }
        return Reflect.apply(nativePush, this, args);
      },
    });
    captured = statuses.map(status =>
      planBuyVoidOperatorAllocationDispatchV1(makeInput(status)));
  } catch (err) {
    attemptedError = err;
  } finally {
    Object.defineProperty(Array.prototype, "push", ORIGINAL_PUSH_DESCRIPTOR);
  }
  if (attemptedError) {
    controlProbe.proofFailures++;
    throw attemptedError;
  }
  controlProbe.contaminatedPushCalls = poisonInvocations;
  assert.equal(poisonInvocations, 0,
    "dispatcher must not invoke replaced Array.prototype.push for reviewed event arrays");
  for (let n = 0; n < statuses.length; n++) {
    const plan = captured[n];
    assertOwnFrozenDense(plan);
    assert.equal(projection(plan), expected.get(statuses[n]));
  }
}

assert.equal(controlProbe.numericSetterCalls, 2,
  "both numeric setter controls must have fired before dispatcher admission");
assert.equal(controlProbe.contaminatedPushCalls, 0);
assert.equal(controlProbe.proofFailures, 0);
assert.equal(
  VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1.mounted_operator_route_verified,
  false,
);
assert.equal(
  VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1.production_gate_ready,
  false,
);
assert.equal(
  VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1.funds_movement,
  false,
);

console.log("VOID_BUY_VOID_DISPATCH_OWN_ARRAY_INDEX_V1_GREEN");
console.log("numeric_inherited_setter_positive_controls=2");
console.log("reviewed_dispatcher_inherited_setter_invocations=0");
console.log("reviewed_dispatcher_hostile_array_push_invocations=0");
console.log("both_operator_branches_exact_json_preserved=true");
console.log("nested_own_frozen_array_indexes_preserved=true");
console.log("original_plain_data_and_serializer_constraints_preserved=true");
console.log("mounted_operator_route_verified=false");
console.log("production_gate_ready=false");
console.log("payment_or_allocation_append_performed=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
