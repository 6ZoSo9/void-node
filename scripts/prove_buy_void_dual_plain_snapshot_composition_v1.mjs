#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  snapshotBuyVoidPreappendPlainInputV1,
} from "../dist/economic/buy_void_preappend_plain_input_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
  VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
  VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1,
  planBuyVoidOperatorAllocationDispatchV1,
} from "../dist/economic/buy_void_operator_verified_allocation_dispatch_v1.js";

// Source-only: compose the real first-original preappend snapshot and real
// verified→allocation dispatcher planner in one process. Never invoke a writer.
const SENTINEL = "VOID_DUAL_ARRAY_INDEX_COMPOSITION_SENTINEL_V1";
const original = {
  zero: Object.getOwnPropertyDescriptor(Array.prototype, "0"),
  one: Object.getOwnPropertyDescriptor(Array.prototype, "1"),
  push: Object.getOwnPropertyDescriptor(Array.prototype, "push"),
};
assert.equal(typeof original.push?.value, "function");
const nativePush = original.push.value;
const statuses = ["reviewed", "payment_verified"];

function specimen(status) {
  return {
    request: {
      request_id: "synthetic-dual-snapshot-r1",
      delivery_address: "0x" + "1".repeat(40),
      quoted_void: "2",
      audit: [SENTINEL, "second"],
      nested: {tags: ["first", SENTINEL]},
    },
    event: {
      request_id: "synthetic-dual-snapshot-r1",
      operator_status: status,
      payment_verifier: {from_address: "0x" + "1".repeat(40)},
      claims: [SENTINEL, "second"],
      nested: {labels: ["first", SENTINEL]},
    },
    requests_jsonl: Buffer.alloc(0),
    prior_operator_events_jsonl: Buffer.alloc(0),
    allocation_jsonl: Buffer.alloc(0),
  };
}
function checkArrays(value) {
  const arrays = [
    value.event.claims, value.event.nested.labels,
    value.request.audit, value.request.nested.tags,
  ];
  for(const array of arrays) {
    assert.equal(Array.isArray(array),true);
    assert.equal(array.length,2);
    assert.equal(Object.isFrozen(array),true);
    assert.equal(Object.getOwnPropertyDescriptor(array,"toJSON")?.value,undefined);
    for(const index of ["0","1"]) {
      const d=Object.getOwnPropertyDescriptor(array,index);
      assert.ok(d && Object.hasOwn(d,"value") && d.enumerable === true);
    }
  }
}
function compose(status) {
  const prior = specimen(status);
  const snap = snapshotBuyVoidPreappendPlainInputV1(prior);
  checkArrays(snap);
  assert.equal(Object.isFrozen(snap.event),true);
  assert.equal(Object.isFrozen(snap.request),true);
  assert.equal(Object.getPrototypeOf(snap.event),null);
  assert.equal(Object.getPrototypeOf(snap.request),null);
  assert.equal(JSON.stringify(snap.event),JSON.stringify(prior.event));
  assert.equal(JSON.stringify(snap.request),JSON.stringify(prior.request));
  const plan = planBuyVoidOperatorAllocationDispatchV1({
    event: snap.event,
    request: snap.request,
    request_dir: "/tmp/void-dual-index-test-NO-WRITES",
    allocation_ledger_root: VOID_BUY_VOID_ALLOCATION_LEDGER_ROOT_V1,
    allocation_high_water_root: VOID_BUY_VOID_ALLOCATION_HIGH_WATER_ROOT_V1,
    with_launch_authority_mutation() {assert.fail("launch mutation forbidden");},
    read_sale_state() {assert.fail("sale state call forbidden");},
  });
  checkArrays(plan);
  assert.equal(Object.isFrozen(plan.event),true);
  assert.equal(Object.isFrozen(plan.request),true);
  assert.equal(plan.kind, status==="payment_verified" ?
    "verified_payment_allocation_handoff" : "nonpayment_legacy_writer");
  assert.equal(JSON.stringify(plan.event),JSON.stringify(prior.event));
  assert.equal(JSON.stringify(plan.request),JSON.stringify(prior.request));
  return JSON.stringify({kind:plan.kind,request:plan.request,event:plan.event});
}
const baselineVerified = compose("payment_verified");
const baselineReviewed = compose("reviewed");
let inheritedSetterInvocations=0;
let controlInvocations=0;
let replacedPushInvocations=0;
function restore(k,descriptor) {
  if (descriptor) Object.defineProperty(Array.prototype,k,descriptor);
  else delete Array.prototype[k];
}
try {
  for(const index of ["0","1"]) {
    const control = new Array(Number(index)+1);
    Object.defineProperty(control,"toJSON",{
      value:undefined,enumerable:false,configurable:false,
    });
    Object.defineProperty(Array.prototype,index,{
      configurable:true,enumerable:false,
      set(_value){
        if(this===control){controlInvocations+=1;return;}
        if(Object.prototype.hasOwnProperty.call(this,"toJSON")) {
          inheritedSetterInvocations+=1;
          throw Error("reviewed_clone_hit_ambient_numeric_setter");
        }
      },
    });
    control[Number(index)]=SENTINEL;
    assert.equal(controlInvocations,Number(index)+1,"numeric setter control not armed");
    const payment = compose("payment_verified");
    const reviewed = compose("reviewed");
    assert.equal(payment,baselineVerified);
    assert.equal(reviewed,baselineReviewed);
    restore(index,original[index==="0"?"zero":"one"]);
  }
  assert.equal(inheritedSetterInvocations,0);
  Object.defineProperty(Array.prototype,"push",{
    configurable:true,enumerable:false,writable:true,
    value:function(...args){
      if(Object.prototype.hasOwnProperty.call(this,"toJSON")&&
        args.includes(SENTINEL)) {
        replacedPushInvocations+=1;
        throw Error("reviewed_clone_called_hostile_array_push");
      }
      return Reflect.apply(nativePush,this,args);
    },
  });
  assert.equal(compose("payment_verified"),baselineVerified);
  assert.equal(compose("reviewed"),baselineReviewed);
  assert.equal(replacedPushInvocations,0);
} finally {
  restore("0",original.zero);
  restore("1",original.one);
  restore("push",original.push);
}
assert.equal(controlInvocations,2);
assert.equal(inheritedSetterInvocations,0);
assert.equal(replacedPushInvocations,0);
assert.equal(VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1.mounted_operator_route_verified,false);
assert.equal(VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1.production_gate_ready,false);
assert.equal(VOID_BUY_VOID_OPERATOR_VERIFIED_ALLOCATION_DISPATCH_AUTHORITY_V1.funds_movement,false);
console.log("VOID_BUY_VOID_DUAL_PLAIN_SNAPSHOTS_COMPOSED_V1_GREEN");
console.log("tested_actual_compiled_preappend_and_dispatcher=true");
console.log("shared_inherited_numeric_setter_controls=2");
console.log("preappend_then_dispatch_setter_invocations=0");
console.log("preappend_then_dispatch_hostile_push_invocations=0");
console.log("reviewed_and_payment_verified_branches_match_clean_json=true");
console.log("all_nested_array_indexes_own_frozen=true");
console.log("operator_route_mounted=false");
console.log("payment_append_performed=false");
console.log("allocation_append_performed=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
