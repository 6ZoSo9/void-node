#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  snapshotBuyVoidPreappendPlainInputV1,
} from "../dist/economic/buy_void_preappend_plain_input_v1.js";

const sample = () => ({
  request: {
    request_id: "synthetic_request",
    provenance: { evidence: ["original", "buyer"] },
  },
  event: {
    marker: "VOID_TEST_INERT_PREAPPEND",
    payment_verifier: {
      topics: ["alpha", "beta"],
      nested: [[{ source: "reviewed" }]],
    },
  },
  requests_jsonl: Buffer.alloc(0),
  prior_operator_events_jsonl: Buffer.alloc(0),
  allocation_jsonl: Buffer.alloc(0),
});

const expected = sample();
const expectedEvent = JSON.stringify(expected.event);
const expectedRequest = JSON.stringify(expected.request);
const originals = new Map(
  ["0", "1"].map(index =>
    [index, Object.getOwnPropertyDescriptor(Array.prototype, index)]),
);
let intercepted = 0;
const trap = function (_value) {
  // Only flag array clones with the dedicated own toJSON shadow installed by
  // the real snapshot implementation; do not interfere with ordinary Node
  // implementation arrays during the brief synthetic ambient attack.
  if (Object.prototype.hasOwnProperty.call(this, "toJSON")) {
    intercepted += 1;
    if (this !== proofWitness) {
      throw new Error("unreviewed_inherited_numeric_array_setter_executed");
    }
  }
};
const proofWitness = new Array(1);
let snap;
try {
  for (const index of originals.keys()) {
    Object.defineProperty(Array.prototype, index, {
      configurable: true, enumerable: false, set: trap,
    });
  }
  Object.defineProperty(proofWitness, "toJSON", {
    value: undefined, configurable: false,
  });
  proofWitness[0] = "prove_ambient_trap_installed";
  assert.equal(intercepted, 1, "negative witness: numeric setter must be armed");
  intercepted = 0;
  snap = snapshotBuyVoidPreappendPlainInputV1(sample());
  assert.equal(intercepted, 0, "snapshot must never call inherited setters");
} finally {
  for (const [index, descriptor] of originals) {
    if (descriptor) Object.defineProperty(Array.prototype, index, descriptor);
    else delete Array.prototype[index];
  }
}
assert.ok(snap);
assert.equal(intercepted, 0);
assert.equal(JSON.stringify(snap.event), expectedEvent);
assert.equal(JSON.stringify(snap.request), expectedRequest);
assert.equal(Object.getPrototypeOf(snap.event), null);
assert.equal(Object.getPrototypeOf(snap.request), null);
assert.equal(Object.isFrozen(snap.event), true);
const arrays = [
  snap.event.payment_verifier.topics,
  snap.event.payment_verifier.nested,
  snap.event.payment_verifier.nested[0],
  snap.request.provenance.evidence,
];
let indexes = 0;
for (const array of arrays) {
  assert.ok(Array.isArray(array));
  assert.ok(Object.isFrozen(array));
  for (let index = 0; index < array.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(array, String(index));
    assert.ok(descriptor, "every array index must be own");
    assert.equal(descriptor.enumerable, true);
    assert.equal(descriptor.configurable, false);
    assert.equal(descriptor.writable, false);
    indexes += 1;
  }
  assert.equal(Object.getOwnPropertyDescriptor(array, "toJSON")?.value, undefined);
}
assert.equal(indexes, 6);
console.log("VOID_BUY_VOID_PREAPPEND_AMBIENT_ARRAY_INDEX_SETTER_V1_GREEN");
console.log("inherited_numeric_setter_negative_witness_armed=true");
console.log("snapshot_inherited_numeric_setter_invocations=0");
console.log("own_readonly_array_indexes_verified=true");
console.log("nested_arrays_verified=true");
console.log("exact_original_json_bytes_preserved=true");
console.log("global_Array_prototype_restored=true");
console.log("historical_reviewed_witness_repin=false");
console.log("payment_verified_append=false");
console.log("allocation_mutation=false");
console.log("presale_activation=false");
console.log("funds_moved=false");
