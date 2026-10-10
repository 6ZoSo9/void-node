#!/usr/bin/env node
import assert from "node:assert/strict";
import { classifyBuyVoidVerifiedAllocationReplayBindingV1 } from
  "../dist/economic/buy_void_verified_allocation_replay_binding_v1.js";

const tx=x=>"0x"+x.repeat(64);
const addr=x=>"0x"+x.repeat(40);
const digest=x=>"sha256:"+x.repeat(64);
const request={
  request_id:"buyvoid_a_aaaaaaaa",source_chain:"base",tx_hash:tx("1"),
  quoted_void:"6",usdc_amount:"3",delivery_address:addr("2"),
  receive_address:addr("3"),
  usdc_contract:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  launch_authority:{
    marker:"VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",version:1,
    coupled_launch_id:digest("a"),source_composition_id:digest("b"),
    activation_generation:tx("c"),generation_tip_sha256:digest("d"),
    activation_receipt_id:"voidbclive1_"+"e".repeat(64),
    activation_receipt_sha256:"f".repeat(64),expires_at_ms:1800000300000
  }
};
const event={
  schema:"void_buy_void_verified_payment_event_v2",
  marker:"VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id:request.request_id,
  operator_status:"payment_verified",payment_verified:true,
  payment_identity_input_complete:true,marked_at_ms:1800000000001,
  tx_hash:request.tx_hash,quoted_void:request.quoted_void,
  payment_verifier:{
    chain:"base",transaction_hash:request.tx_hash,log_index:"7",
    block_number:"100",confirmations:"12",
    usdc_contract:request.usdc_contract,from_address:request.delivery_address,
    receive_address:request.receive_address,delivery_address:request.delivery_address,
    amount_units:"3000000",requested_units:"3000000"
  }
};
// Build immutable fixture bytes BEFORE any ambient prototype modification.
const initial={...request,delivery_address:undefined};
const firstBuyerBytes=Buffer.from(
  JSON.stringify(initial)+"\n"+JSON.stringify(request)+"\n","utf8"
);
const completeBuyerBytes=Buffer.from(JSON.stringify(request)+"\n","utf8");
const eventBytes=Buffer.from(JSON.stringify(event)+"\n","utf8");
const conflictBytes=Buffer.from(
  JSON.stringify({...request,payment_chain:"ethereum"})+"\n","utf8"
);
const extraAuthorityBytes=Buffer.from(
  JSON.stringify({...request,launch_authority:{
    ...request.launch_authority,extraneous_claim:"not_in_original_tuple"
  }})+"\n","utf8"
);
const sampleLineArray=[
  JSON.stringify(initial),JSON.stringify(request)
];
function classify(requests_jsonl) {
  return classifyBuyVoidVerifiedAllocationReplayBindingV1({
    request_id:request.request_id,requests_jsonl,
    operator_events_jsonl:eventBytes,allocation_jsonl:Buffer.alloc(0),
  });
}
function held(result,expected) {
  assert.equal(result.ok,false,JSON.stringify(result));
  assert.equal(result.status,"held");
  assert.match(String(result.reason),expected);
  assert.equal(result.operation_performed,false);
  assert.equal(result.authority.production_gate_ready,false);
}
held(classify(firstBuyerBytes),/request_initial_delivery_address_missing/u);
const normal=classify(completeBuyerBytes);
assert.equal(normal.ok,false);
assert.equal(normal.status,"verified_allocation_missing");
held(classify(conflictBytes),/request_source_chain_alias_mismatch/u);
held(classify(extraAuthorityBytes),/request_launch_authority_invalid/u);

const originals={
  map:Object.getOwnPropertyDescriptor(Array.prototype,"map"),
  iterator:Object.getOwnPropertyDescriptor(Array.prototype,Symbol.iterator),
  every:Object.getOwnPropertyDescriptor(Array.prototype,"every"),
  some:Object.getOwnPropertyDescriptor(Array.prototype,"some"),
  sort:Object.getOwnPropertyDescriptor(Array.prototype,"sort"),
};
for(const key of ["map","iterator","every","some","sort"]){
  assert.ok(originals[key]?.value,"native array method absent: "+key);
}
let mapTrap=0,iteratorTrap=0,everyTrap=0,someTrap=0,sortTrap=0;
function restore() {
  Object.defineProperty(Array.prototype,"map",originals.map);
  Object.defineProperty(Array.prototype,Symbol.iterator,originals.iterator);
  Object.defineProperty(Array.prototype,"every",originals.every);
  Object.defineProperty(Array.prototype,"some",originals.some);
  Object.defineProperty(Array.prototype,"sort",originals.sort);
}
try {
  Object.defineProperty(Array.prototype,"map",{
    configurable:true,writable:true,
    value:function(fn,thisArg){
      if(this.length===2 && typeof this[0]==="string" &&
          this[0].includes(request.request_id) &&
          typeof this[1]==="string" && this[1].includes(request.request_id)){
        mapTrap++;
        return [Reflect.apply(fn,thisArg,[this[1],1,this])];
      }
      return Reflect.apply(originals.map.value,this,[fn,thisArg]);
    }
  });
  held(classify(firstBuyerBytes),/request_initial_delivery_address_missing/u);
  assert.equal(mapTrap,0,"untrusted JSONL map was invoked");
  // Positive control: the injected method really can suppress the first row.
  const removed=sampleLineArray.map(x=>x);
  assert.equal(removed.length,1);
  assert.equal(mapTrap,1);
  restore();

  Object.defineProperty(Array.prototype,Symbol.iterator,{
    configurable:true,writable:true,
    value:function(){
      if(this.length===2 && this[0] &&
         typeof this[0]==="object" &&
         Object.hasOwn(this[0],"exactLine")&&
         Object.hasOwn(this[0],"row")){
        iteratorTrap++;
        return [this[1]][Symbol.iterator]();
      }
      return Reflect.apply(originals.iterator.value,this,[]);
    }
  });
  held(classify(firstBuyerBytes),/request_initial_delivery_address_missing/u);
  assert.equal(iteratorTrap,0,"untrusted replay iterator was invoked");
  restore();

  Object.defineProperty(Array.prototype,"every",{
    configurable:true,writable:true,value:function(){everyTrap++;return true;}
  });
  Object.defineProperty(Array.prototype,"some",{
    configurable:true,writable:true,value:function(){someTrap++;return false;}
  });
  held(classify(conflictBytes),/request_source_chain_alias_mismatch/u);
  held(classify(firstBuyerBytes),/request_initial_delivery_address_missing/u);
  assert.equal(everyTrap,0,"ambient every used for original request binding");
  assert.equal(someTrap,0,"ambient some used for original request binding");
  restore();

  Object.defineProperty(Array.prototype,"sort",{
    configurable:true,writable:true,
    value:function(){sortTrap++;return this;}
  });
  held(classify(extraAuthorityBytes),/request_launch_authority_invalid/u);
  held(classify(firstBuyerBytes),/request_initial_delivery_address_missing/u);
  assert.equal(sortTrap,0,"ambient sort used to authorize closed input keys");
  restore();
} finally {
  restore();
}
assert.equal(classify(firstBuyerBytes).reason,
  "request_initial_delivery_address_missing");
console.log("VOID_FIRST_BUYER_REPLAY_OWN_ARRAY_HISTORY_V1_GREEN");
console.log("first_snapshot_not_elided_by_ambient_map=true");
console.log("first_snapshot_not_elided_by_ambient_iterator=true");
console.log("conflicting_rail_alias_rejected_under_ambient_every_some=true");
console.log("extra_launch_authority_rejected_under_ambient_sort=true");
console.log("malicious_map_positive_control_invocations=1");
console.log("real_replay_or_allocation_writer_called=false");
console.log("production_allocation_authority=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
