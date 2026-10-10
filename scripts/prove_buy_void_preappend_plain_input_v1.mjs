#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  snapshotBuyVoidPreappendPlainInputV1,
} from "../dist/economic/buy_void_preappend_plain_input_v1.js";
import {
  classifyBuyVoidPreappendVerifiedPaymentLineageV1,
} from "../dist/economic/buy_void_verified_allocation_replay_binding_v1.js";

const tx = c => "0x" + c.repeat(64);
const addr = c => "0x" + c.repeat(40);
const digest = c => "sha256:" + c.repeat(64);
const authority = {
  marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
  version: 1,
  coupled_launch_id: digest("a"),
  source_composition_id: digest("b"),
  activation_generation: tx("c"),
  generation_tip_sha256: digest("d"),
  activation_receipt_id: "voidbclive1_" + "e".repeat(64),
  activation_receipt_sha256: "f".repeat(64),
  expires_at_ms: 1800000300000,
};
const request = {
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  tx_hash: tx("1"),
  quoted_void: "6",
  usdc_amount: "3",
  delivery_address: addr("2"),
  receive_address: addr("3"),
  usdc_contract: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  launch_authority: authority,
};
const event = {
  schema: "void_buy_void_verified_payment_event_v2",
  marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id: request.request_id,
  operator_status: "payment_verified",
  payment_verified: true,
  payment_identity_input_complete: true,
  marked_at_ms: 1800000000001,
  tx_hash: request.tx_hash,
  quoted_void: request.quoted_void,
  payment_verifier: {
    chain: request.source_chain,
    transaction_hash: request.tx_hash,
    log_index: "7",
    block_number: "100",
    confirmations: "12",
    usdc_contract: request.usdc_contract,
    from_address: request.delivery_address,
    receive_address: request.receive_address,
    delivery_address: request.delivery_address,
    amount_units: "3000000",
    requested_units: "3000000",
  },
};
const requestHistory = Buffer.from(JSON.stringify(request) + "\n", "utf8");
const empty = () => Buffer.alloc(0);
const input = (changes = {}) => ({
  request,
  event,
  requests_jsonl: Buffer.from(requestHistory),
  prior_operator_events_jsonl: empty(),
  allocation_jsonl: empty(),
  ...changes,
});
const sha = bytes => "sha256:" + createHash("sha256").update(bytes).digest("hex");
const originalEventLine = Buffer.from(JSON.stringify(event) + "\n", "utf8");
const expectedEventSha = sha(originalEventLine);

const safe = snapshotBuyVoidPreappendPlainInputV1(input());
assert.equal(Object.getPrototypeOf(safe.request), null);
assert.equal(Object.getPrototypeOf(safe.event), null);
assert.equal(Object.getPrototypeOf(safe.event.payment_verifier), null);
assert.equal(Object.isFrozen(safe.request), true);
assert.equal(Object.isFrozen(safe.event), true);
assert.equal(JSON.stringify(safe.request), JSON.stringify(request));
assert.equal(JSON.stringify(safe.event), JSON.stringify(event));
assert.equal(sha(Buffer.from(JSON.stringify(safe.event) + "\n")), expectedEventSha);

const ordinary = classifyBuyVoidPreappendVerifiedPaymentLineageV1(input());
assert.equal(ordinary.ok, true, ordinary.reason);
assert.equal(ordinary.status, "ready");
assert.equal(ordinary.operation_performed, false);
assert.equal(ordinary.payment_verified_event_sha256, expectedEventSha);
assert.equal(ordinary.authority.production_gate_ready, false);
assert.equal(ordinary.authority.independently_proven_event_fsync, false);
assert.equal(ordinary.authority.allocation_write, false);
assert.equal(ordinary.authority.funds_movement, false);

let forbiddenCalls = 0;
const hold = (candidate, reason) => {
  const result = classifyBuyVoidPreappendVerifiedPaymentLineageV1(candidate);
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(result.status, "held");
  assert.equal(result.operation_performed, false);
  assert.equal(result.payment_verified_event_sha256, null);
  assert.match(result.reason || "", reason);
};
hold(new Proxy(input(), {
  get() { forbiddenCalls++; throw Error("unreviewed outer get"); },
  ownKeys() { forbiddenCalls++; throw Error("unreviewed outer keys"); },
}), /preappend_input_not_plain_data/u);
assert.equal(forbiddenCalls, 0);

const outerWithGetter = input();
Object.defineProperty(outerWithGetter, "event", {
  enumerable: true, configurable: true,
  get() { forbiddenCalls++; throw Error("unreviewed input getter"); },
});
hold(outerWithGetter, /preappend_input_not_plain_data/u);
assert.equal(forbiddenCalls, 0);

const eventWithGetter = { ...event };
Object.defineProperty(eventWithGetter, "request_id", {
  enumerable: true,
  get() { forbiddenCalls++; throw Error("unreviewed event getter"); },
});
hold(input({ event: eventWithGetter }), /preappend_event_not_plain_data/u);
assert.equal(forbiddenCalls, 0);

const requestWithGetter = { ...request };
Object.defineProperty(requestWithGetter, "tx_hash", {
  enumerable: true,
  get() { forbiddenCalls++; throw Error("unreviewed request getter"); },
});
hold(input({ request: requestWithGetter }), /preappend_request_not_plain_data/u);
assert.equal(forbiddenCalls, 0);

const eventWithSerializer = {
  ...event, toJSON() {
    forbiddenCalls++; throw Error("unreviewed event serializer");
  },
};
hold(input({ event: eventWithSerializer }), /preappend_event_not_plain_data/u);
assert.equal(forbiddenCalls, 0);

const nestedSerializer = { ...event.payment_verifier, toJSON() {
  forbiddenCalls++; throw Error("unreviewed nested serializer");
}};
hold(input({ event: { ...event, payment_verifier: nestedSerializer } }),
  /preappend_event_not_plain_data/u);
assert.equal(forbiddenCalls, 0);

const proxiedEvent = new Proxy({ ...event }, {
  get() { forbiddenCalls++; throw Error("unreviewed event proxy"); },
  ownKeys() { forbiddenCalls++; throw Error("unreviewed event proxy keys"); },
});
hold(input({ event: proxiedEvent }), /preappend_event_not_plain_data/u);
assert.equal(forbiddenCalls, 0);

const customPrototype = Object.create({ named: "unreviewed" });
customPrototype.request_id = request.request_id;
hold(input({ event: customPrototype }), /preappend_event_not_plain_data/u);
hold(input({ event: { ...event, extra: undefined } }),
  /preappend_event_not_plain_data/u);
hold(input({ event: { ...event, extra: "x".repeat(1_048_577) } }),
  /preappend_event_not_plain_data/u);

const cycle = { ...event };
cycle.recursion = cycle;
hold(input({ event: cycle }), /preappend_event_not_plain_data/u);

// Test only snapshot/serialization under deliberately polluted ambient
// prototypes. Historical parsed JSONL rows remain a separate trust boundary.
const priorObjectSerializer = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
const priorArraySerializer = Object.getOwnPropertyDescriptor(Array.prototype, "toJSON");
try {
  Object.defineProperty(Object.prototype, "toJSON", {
    configurable: true, value() { forbiddenCalls++; throw Error("ambient object serializer"); },
  });
  Object.defineProperty(Array.prototype, "toJSON", {
    configurable: true, value() { forbiddenCalls++; throw Error("ambient array serializer"); },
  });
  const inheritedSafe = snapshotBuyVoidPreappendPlainInputV1(input());
  assert.equal(JSON.stringify(inheritedSafe.event), originalEventLine.toString("utf8").trimEnd());
} finally {
  if (priorObjectSerializer) Object.defineProperty(Object.prototype, "toJSON", priorObjectSerializer);
  else delete Object.prototype.toJSON;
  if (priorArraySerializer) Object.defineProperty(Array.prototype, "toJSON", priorArraySerializer);
  else delete Array.prototype.toJSON;
}
assert.equal(forbiddenCalls, 0);

// Plain array input remains valid and keeps its JSON bytes unchanged.
const withArray = input({ event: { ...event, harmless: ["a", 1, null, { x: true }] } });
assert.equal(
  JSON.stringify(snapshotBuyVoidPreappendPlainInputV1(withArray).event),
  JSON.stringify(withArray.event),
);
const sparse = ["a", "b"];
delete sparse[1];
hold(input({ event: { ...event, harmless: sparse } }),
  /preappend_event_not_plain_data/u);

console.log("VOID_BUY_VOID_PREAPPEND_PLAIN_INPUT_V1_PROOF_GREEN");
console.log("ordinary_original_buyer_ready_preserved=true");
console.log("ordinary_payment_event_line_sha256=" + expectedEventSha);
console.log("outer_input_proxy_and_accessor_traps_called=0");
console.log("event_request_getter_and_toJSON_hooks_called=0");
console.log("ambient_serializer_hook_calls=0");
console.log("nested_array_prototype_serializer_blocked=true");
console.log("strict_snapshot_buffers_not_accessed=true");
console.log("source_only_payment_or_allocation_mutation=false");
console.log("production_allocation_mutation_ready=false");
console.log("presale_activation=false");
console.log("funds_moved=false");
