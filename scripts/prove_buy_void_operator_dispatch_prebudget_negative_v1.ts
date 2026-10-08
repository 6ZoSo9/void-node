import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  planBuyVoidOperatorAllocationDispatchV1,
  VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
} from "../src/economic/buy_void_operator_verified_allocation_dispatch_v1.js";

const SOURCE = "src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts";
const EXPECTED_SOURCE_BLOB = "5005fc05c8ad22e4301f2141678d87c88fef0a16";
const SNAPSHOT_MAX = 256 * 1024;
const EXCESS = 4 * 1024 * 1024;
const sourceBytes = fs.readFileSync(SOURCE);
const blob = crypto.createHash("sha1")
  .update(Buffer.from("blob " + sourceBytes.length + "\0"))
  .update(sourceBytes).digest("hex");
assert.equal(blob, EXPECTED_SOURCE_BLOB, "exact dispatcher source changed");
const sourceText = sourceBytes.toString("utf8");
const serializeAt = sourceText.indexOf("const result = JSON.stringify(value);");
const budgetAt = sourceText.indexOf('if (Buffer.byteLength(raw, "utf8") > 256 * 1024)');
assert.ok(serializeAt > 0 && budgetAt > serializeAt,
  "the negative test requires the actual serialize-before-size boundary");

const authority = VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1;
for (const field of [
  "mounted_operator_route_verified", "operator_principal_authenticated",
  "private_root_independent_custody_proven", "custody_service_composed",
  "direct_web_process_private_root_write_authority",
  "deployed_artifact_generation_verified", "production_gate_ready",
  "signing", "transaction_broadcast", "funds_movement",
] as const) assert.equal(authority[field], false, field);

const harmlessEvent = () => ({
  request_id: "synthetic-event-1",
  operator_status: "payment_verified",
  payment_verifier: { from_address: "0x" + "1".repeat(40) },
});
const harmlessRequest = () => ({
  request_id: "synthetic-event-1",
  delivery_address: "0x" + "1".repeat(40),
  quoted_void: "2",
});
function input(overrides: Record<string, any> = {}) {
  return {
    event: harmlessEvent(),
    request: harmlessRequest(),
    request_dir: "/tmp/void-test-no-real-request-dir",
    allocation_ledger_root: VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
    allocation_high_water_root: VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
    with_launch_authority_mutation: async () => assert.fail("launch called"),
    read_sale_state: async () => assert.fail("sale called"),
    ...overrides,
  };
}

// Valid, small, fully synthetic data is not rejected by the snapshot.
const validPlan = planBuyVoidOperatorAllocationDispatchV1(input());
assert.equal(validPlan.kind, "verified_payment_allocation_handoff");
assert.equal(Object.isFrozen(validPlan.event), true);
assert.equal(Object.isFrozen(validPlan.request), true);
assert.equal(Object.isFrozen(validPlan.event.payment_verifier), true);

// Capture the ACTUAL number of bytes allocated by the planner's own
// JSON.stringify call before its post-serialization budget check. No actual
// filesystem writer, service or customer record is called by this proof.
function measureRejectedSerialization(overrides: Record<string, any>, expectedError: RegExp) {
  const originalStringify = JSON.stringify;
  let largestString = 0;
  let calls = 0;
  try {
    JSON.stringify = ((...args: Parameters<typeof JSON.stringify>) => {
      const output = originalStringify(...args);
      calls++;
      if (typeof output === "string") {
        largestString = Math.max(largestString, Buffer.byteLength(output, "utf8"));
      }
      return output;
    }) as typeof JSON.stringify;
    assert.throws(
      () => planBuyVoidOperatorAllocationDispatchV1(input(overrides)),
      expectedError,
    );
  } finally {
    JSON.stringify = originalStringify;
  }
  return { largestString, calls };
}

let eventCallbackCount = 0;
const eventWithOversizeCallback = {
  toJSON() {
    eventCallbackCount++;
    return {
      request_id: "synthetic-event-1",
      operator_status: "payment_verified",
      padding: "X".repeat(EXCESS),
    };
  },
};
const eventObservation = measureRejectedSerialization(
  { event: eventWithOversizeCallback },
  /buy_void_operator_allocation_dispatch_event_size_exceeded/u,
);
assert.equal(eventCallbackCount, 1, "callback ran before event rejection");
assert.ok(eventObservation.largestString > EXCESS,
  "actual JSON stringify materialized > 4 MiB before size rejection");
assert.equal(eventObservation.calls, 1, "event over-limit stops before request");

let requestCallbackCount = 0;
const requestWithOversizeCallback = {
  toJSON() {
    requestCallbackCount++;
    return {
      request_id: "synthetic-event-1",
      padding: "Y".repeat(EXCESS),
    };
  },
};
const requestObservation = measureRejectedSerialization(
  { request: requestWithOversizeCallback },
  /buy_void_operator_allocation_dispatch_request_size_exceeded/u,
);
assert.equal(requestCallbackCount, 1);
assert.ok(requestObservation.largestString > EXCESS);
assert.equal(requestObservation.calls, 2, "event serialized then oversized request");

// A getter is invoked before the budget rejection; it can perform arbitrary
// caller-side effects despite the eventual HOLD. Synthetic variable only.
let getterAccesses = 0;
const accessorEvent: Record<string, any> = {
  request_id: "synthetic-event-1",
  operator_status: "payment_verified",
};
Object.defineProperty(accessorEvent, "padding", {
  enumerable: true,
  get() {
    getterAccesses++;
    return "Z".repeat(EXCESS);
  },
});
const getterObservation = measureRejectedSerialization(
  { event: accessorEvent },
  /buy_void_operator_allocation_dispatch_event_size_exceeded/u,
);
assert.equal(getterAccesses, 1);
assert.ok(getterObservation.largestString > EXCESS);

// Depth also has no pre-JSON cap; the error is caught as serialization_failed.
// Keep the fixture finite and much smaller in bytes than the oversize ones.
const nested: Record<string, any> = harmlessEvent();
let cur: any = nested;
for (let i = 0; i < 12000; i++) {
  const child: any = {};
  cur.nested = child;
  cur = child;
}
assert.throws(
  () => planBuyVoidOperatorAllocationDispatchV1(input({ event: nested })),
  /buy_void_operator_allocation_dispatch_event_serialization_failed/u,
);

console.log("VOID_BUY_VOID_OPERATOR_DISPATCH_PREBUDGET_NEGATIVE_V1_GREEN");
console.log("reviewed_dispatcher_blob_verified=true");
console.log("valid_small_immutable_snapshot_accepted=true");
console.log("declared_limit_bytes=" + SNAPSHOT_MAX);
console.log("materialized_event_json_bytes=" + eventObservation.largestString);
console.log("materialized_request_json_bytes=" + requestObservation.largestString);
console.log("materialized_getter_json_bytes=" + getterObservation.largestString);
console.log("materialized_over_limit_before_reject=true");
console.log("event_toJSON_callback_executed_before_HOLD=true");
console.log("request_toJSON_callback_executed_before_HOLD=true");
console.log("event_property_getter_executed_before_HOLD=true");
console.log("deep_nesting_reached_serialization_engine_before_HOLD=true");
console.log("pre_serialization_resource_bound_verified=false");
console.log("mounted_operator_route_verified=false");
console.log("payment_or_allocation_append_performed=false");
console.log("production_gate_ready=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
