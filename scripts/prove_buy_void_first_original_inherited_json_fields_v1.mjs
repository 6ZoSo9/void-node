#!/usr/bin/env node
import assert from "node:assert/strict";
import { classifyBuyVoidVerifiedAllocationReplayBindingV1 } from
  "../dist/economic/buy_void_verified_allocation_replay_binding_v1.js";

// All synthetic rows and their canonical bytes are created before any
// prototype contamination. Never read a real buyer ledger or payment.
const tx = x => "0x" + x.repeat(64);
const addr = x => "0x" + x.repeat(40);
const digest = x => "sha256:" + x.repeat(64);
const request = {
  request_id: "buyvoid_a_aaaaaaaa", source_chain:"base",
  tx_hash:tx("1"), quoted_void:"6", usdc_amount:"3",
  delivery_address:addr("2"), receive_address:addr("3"),
  usdc_contract:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  launch_authority:{
    marker:"VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",version:1,
    coupled_launch_id:digest("a"),source_composition_id:digest("b"),
    activation_generation:tx("c"),generation_tip_sha256:digest("d"),
    activation_receipt_id:"voidbclive1_"+"e".repeat(64),
    activation_receipt_sha256:"f".repeat(64),expires_at_ms:1800000300000
  }
};
const event = {
  schema:"void_buy_void_verified_payment_event_v2",
  marker:"VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id:request.request_id,operator_status:"payment_verified",
  payment_verified:true,payment_identity_input_complete:true,
  marked_at_ms:1800000000001,tx_hash:request.tx_hash,
  quoted_void:request.quoted_void,
  payment_verifier:{
    chain:"base",transaction_hash:request.tx_hash,log_index:"7",
    block_number:"100",confirmations:"12",usdc_contract:request.usdc_contract,
    from_address:request.delivery_address,
    receive_address:request.receive_address,
    delivery_address:request.delivery_address,
    amount_units:"3000000",requested_units:"3000000"
  }
};
const line = item => JSON.stringify(item)+"\n";
const history = (...items) => Buffer.from(items.map(line).join(""),"utf8");
const events = history(event);
const emptyAlloc = Buffer.alloc(0);
function classify(historyBytes){
  return classifyBuyVoidVerifiedAllocationReplayBindingV1({
    request_id:request.request_id,requests_jsonl:historyBytes,
    operator_events_jsonl:events,allocation_jsonl:emptyAlloc,
  });
}
function mustHold(result,reason){
  assert.equal(result.ok,false);
  assert.equal(result.status,"held");
  assert.match(String(result.reason),reason);
  assert.equal(result.operation_performed,false);
  assert.equal(result.authority.production_gate_ready,false);
}
const missingDelivery = history({...request,delivery_address:undefined},request);
const missingToken = history({...request,usdc_contract:undefined},request);
const missingLaunch = history({...request,launch_authority:undefined},request);
const missingRequestId = history({...request,request_id:undefined},request);
const complete = history(request);
const nestedArray = history({...request,diagnostic_array:["safe","fixed"]});
mustHold(classify(missingDelivery),/request_initial_delivery_address_missing/u);
mustHold(classify(missingToken),/request_initial_usdc_contract_missing/u);
mustHold(classify(missingLaunch),/request_initial_launch_authority_missing/u);
mustHold(classify(missingRequestId),/request_id_invalid/u);
const baseline=classify(complete);
assert.equal(baseline.status,"verified_allocation_missing");
assert.equal(baseline.operation_performed,false);
assert.equal(classify(nestedArray).status,"verified_allocation_missing");

// A poisoned Object.prototype must not supply an absent original JSONL
// field or run a getter/toJSON while parsing or validating signed bytes.
function poison(proto,name,valueOrGetter,expectedHistory,expectedReason,asGetter=true) {
  const previous=Object.getOwnPropertyDescriptor(proto,name);
  let reads=0;
  try {
    Object.defineProperty(proto,name,asGetter ?
      {configurable:true,get(){reads++;return valueOrGetter;}} :
      {configurable:true,value:valueOrGetter,writable:true});
    const decision=classify(expectedHistory);
    mustHold(decision,expectedReason);
    assert.equal(reads,0,"untrusted inherited "+name+" executed");
  } finally {
    if(previous)Object.defineProperty(proto,name,previous);
    else delete proto[name];
  }
}
poison(Object.prototype,"delivery_address",request.delivery_address,
  missingDelivery,/request_initial_delivery_address_missing/u);
poison(Object.prototype,"usdc_contract",request.usdc_contract,
  missingToken,/request_initial_usdc_contract_missing/u);
poison(Object.prototype,"launch_authority",request.launch_authority,
  missingLaunch,/request_initial_launch_authority_missing/u);
poison(Object.prototype,"request_id",request.request_id,
  missingRequestId,/request_id_invalid/u);
let jsonHooks=0;
const oldObjectToJSON=Object.getOwnPropertyDescriptor(Object.prototype,"toJSON");
try {
  Object.defineProperty(Object.prototype,"toJSON",{
    configurable:true,value(){jsonHooks++;return this;}
  });
  mustHold(classify(missingDelivery),/request_initial_delivery_address_missing/u);
  assert.equal(jsonHooks,0,"Object.prototype.toJSON invoked on parsed buyer row");
} finally {
  if(oldObjectToJSON)Object.defineProperty(Object.prototype,"toJSON",oldObjectToJSON);
  else delete Object.prototype.toJSON;
}
// JSON arrays inside otherwise canonical request rows also cannot inherit
// Array.prototype.toJSON to rewrite a historical byte commitment.
const oldArrayToJSON=Object.getOwnPropertyDescriptor(Array.prototype,"toJSON");
let arrayToJSON=0;
try {
  Object.defineProperty(Array.prototype,"toJSON",{
    configurable:true,value(){arrayToJSON++;return ["forged"];}
  });
  const candidate=classify(nestedArray);
  assert.equal(candidate.status,"verified_allocation_missing");
  assert.equal(arrayToJSON,0,"Array.prototype.toJSON invoked on JSONL nested array");
} finally {
  if(oldArrayToJSON)Object.defineProperty(Array.prototype,"toJSON",oldArrayToJSON);
  else delete Array.prototype.toJSON;
}
const positive=classify(complete);
assert.equal(positive.status,"verified_allocation_missing");
assert.equal(positive.canonical_payment_identity,baseline.canonical_payment_identity);
assert.equal(positive.payment_verified_event_sha256,baseline.payment_verified_event_sha256);
console.log("VOID_BUY_VOID_FIRST_ORIGINAL_INHERITED_JSON_FIELDS_V1_GREEN");
console.log("original_wallet_inheritance_refused=true");
console.log("original_native_usdc_inheritance_refused=true");
console.log("original_launch_receipt_inheritance_refused=true");
console.log("original_request_id_inheritance_refused=true");
console.log("object_inherited_getters_executed=0");
console.log("object_inherited_toJSON_executed=0");
console.log("array_inherited_toJSON_executed=0");
console.log("canonical_positive_lineage_unchanged=true");
console.log("payment_or_allocation_append_performed=false");
console.log("production_gate_ready=false");
console.log("funds_moved=false");
