import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { deriveBuyVoidAllocationReservationHighWaterV1 } from
  "../src/economic/buy_void_allocation_reservation_high_water_v1.js";
import { classifyBuyVoidVerifiedAllocationReplayBindingV1 } from
  "../src/economic/buy_void_verified_allocation_replay_binding_v1.js";
import { writeBuyVoidVerifiedPaymentAllocationHandoffV1 } from
  "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";

// Inert, unmounted real-filesystem falsification. This script EXPECTS the
// current CHECK->APPEND JSON re-serialization flaw, and must be inverted
// to fail-closed regression after the owning source is repaired.
const TOKEN = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const RECEIVE = "0x" + "3".repeat(40);
const BUYER = "0x" + "2".repeat(40);
const WRONG_BUYER = "0x" + "9".repeat(40);
const TX = "0x" + "1".repeat(64);
const ID = "buyvoid_h_" + "a".repeat(8);
const MARKED = 1_800_000_000_020;
const ALLOCATION = "allocation-reservations-v1.jsonl";
const HIGH_WATER = "allocation-reservation-high-water-v1.json";
const launch = Object.freeze({
  marker:"VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",version:1,
  coupled_launch_id:"sha256:"+"a".repeat(64),
  source_composition_id:"sha256:"+"b".repeat(64),
  activation_generation:"0x"+"c".repeat(64),
  generation_tip_sha256:"sha256:"+"d".repeat(64),
  activation_receipt_id:"voidbclive1_"+"e".repeat(64),
  activation_receipt_sha256:"f".repeat(64),
  expires_at_ms:1_900_000_000_000,
});
const original = Object.freeze({
  schema:"void_public_buy_void_request_v1",
  request_id:ID,status:"payment_submitted_pending_manual_review",
  source_chain:"base",payment_chain:"base",tx_hash:TX,
  quoted_void:"6",usdc_amount:"3",
  delivery_address:BUYER,receive_address:RECEIVE,
  usdc_contract:TOKEN,launch_authority:launch,
  created_at_ms:MARKED-10,
});
const verified = Object.freeze({
  schema:"void_buy_void_verified_payment_event_v2",
  marker:"VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id:ID,operator_status:"payment_verified",
  payment_verified:true,payment_identity_input_complete:true,
  marked_at_ms:MARKED,tx_hash:TX,quoted_void:"6",
  payment_verifier:{
    chain:"base",transaction_hash:TX,log_index:"7",
    block_number:"100",confirmations:"12",
    usdc_contract:TOKEN,from_address:BUYER,
    receive_address:RECEIVE,delivery_address:BUYER,
    amount_units:"3000000",requested_units:"3000000",
  },
});
const EVENT_VALID_ROW = Buffer.from(JSON.stringify(verified)+"\n","utf8");
const sha = b=>crypto.createHash("sha256").update(b).digest("hex");

function rows(f) {
  const contents=fs.readFileSync(f,"utf8");
  return contents ? contents.trimEnd().split("\n").filter(Boolean).map((line: string) => JSON.parse(line)) : [];
}
function setup(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-event-check-append-"));
  fs.chmodSync(root,0o700);
  const requestDir=path.join(root,"requests");
  const ledgerRoot=path.join(root,"ledger");
  const highWaterRoot=path.join(root,"high-water");
  for(const dir of [requestDir,ledgerRoot,highWaterRoot]) fs.mkdirSync(dir,{mode:0o700});
  fs.writeFileSync(path.join(requestDir,"requests.jsonl"),JSON.stringify(original)+"\n",{mode:0o600});
  fs.writeFileSync(path.join(requestDir,"operator-events.jsonl"),"",{mode:0o600});
  fs.writeFileSync(path.join(ledgerRoot,ALLOCATION),"",{mode:0o600});
  const highWater=deriveBuyVoidAllocationReservationHighWaterV1("");
  assert.equal(highWater.ok,true);
  fs.writeFileSync(path.join(highWaterRoot,HIGH_WATER),highWater.high_water_json,{mode:0o600});
  return {root,requestDir,ledgerRoot,highWaterRoot};
}
const saleState=fixture=>async()=>{
  const verifiedCount=rows(path.join(fixture.requestDir,"operator-events.jsonl"))
    .filter(row=>row.operator_status==="payment_verified").length;
  const reserved=6*verifiedCount;
  return {
    pool_void_total:"10000000",
    allocation_reserved_void:String(reserved),
    verified_void_total:String(reserved),
    remaining_void:String(10_000_000-reserved),
  };
};
function invoke(fixture,event,flags){
  return writeBuyVoidVerifiedPaymentAllocationHandoffV1({
    event,request:original,request_dir:fixture.requestDir,
    allocation_ledger_root:fixture.ledgerRoot,
    allocation_high_water_root:fixture.highWaterRoot,
    with_launch_authority_mutation:async (_request,operation)=>operation(()=>{}),
    read_sale_state:saleState(fixture),
    test_only_after_payment_fsync:()=>{flags.fsyncReached=true;},
  });
}
async function positiveControl(){
  const f=setup();
  try{
    const flags={fsyncReached:false};
    const result=await invoke(f,verified,flags);
    assert.equal(flags.fsyncReached,true);
    assert.equal(result.ok,true);
    const bytes=fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl"));
    assert.ok(bytes.equals(EVENT_VALID_ROW));
    assert.equal(rows(path.join(f.ledgerRoot,ALLOCATION)).length,1);
    return true;
  } finally{fs.rmSync(f.root,{recursive:true,force:true});}
}
// This positive regression is built on the exact pre-fix OS-temp fixture,
// rather than an artificial JSON.stringify-only example. It verifies actual
// reviewed source byte-buffer append, replay and allocation.
async function assertDurableOriginal(f: ReturnType<typeof setup>, label: string) {
  const durable=fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl"));
  assert.ok(durable.equals(EVENT_VALID_ROW),label+" original buyer row mismatch");
  const allocations=fs.readFileSync(path.join(f.ledgerRoot,ALLOCATION));
  assert.equal(rows(path.join(f.ledgerRoot,ALLOCATION)).length,1,
    label+" exactly one allocation");
  const replay=classifyBuyVoidVerifiedAllocationReplayBindingV1({
    request_id:ID,
    requests_jsonl:fs.readFileSync(path.join(f.requestDir,"requests.jsonl")),
    operator_events_jsonl:durable,
    allocation_jsonl:allocations,
  });
  assert.equal(replay.ok,true,label+" strict replay rejected");
  assert.equal(replay.status,"allocation_present");
  assert.equal(replay.payment_verified_event_sha256,"sha256:"+sha(EVENT_VALID_ROW));
  const sidecar=path.join(f.requestDir,
    "operator-event-"+ID+"-"+MARKED+".json");
  assert.equal(fs.existsSync(sidecar),true,label+" sidecar missing");
  const published=JSON.parse(fs.readFileSync(sidecar,"utf8"));
  assert.equal(published.payment_verifier.from_address,BUYER);
  return true;
}
// The historical P1 failure changed toJSON()'s buyer after its first use,
// allowing a second JSON serialization to poison payment fsync. The new
// committed writer must never call that input toJSON() a second time.
async function adversarialToJSONRetainsReviewedBytes() {
  const f=setup(),flags={fsyncReached:false};
  const payload={...verified,payment_verifier:{...verified.payment_verifier}};
  let serializations=0;
  Object.defineProperty(payload,"toJSON",{
    enumerable:false,configurable:false,
    value(){
      serializations+=1;
      return {...verified,payment_verifier:{
        ...verified.payment_verifier,
        from_address:serializations===1?BUYER:WRONG_BUYER
      }};
    }
  });
  try {
    const result=await invoke(f,payload,flags);
    assert.equal(result.ok,true);
    assert.equal(flags.fsyncReached,true);
    assert.equal(serializations,1,"untrusted toJSON invoked after snapshot");
    assert.equal(await assertDurableOriginal(f,"unstable toJSON"),true);
    return true;
  } finally{fs.rmSync(f.root,{recursive:true,force:true});}
}
// The pre-fsync event snapshot must also prevent a property getter from
// providing the valid buyer on the first read and a wrong one later.
async function adversarialGetterRetainsReviewedBytes() {
  const f=setup(),flags={fsyncReached:false};
  const payload={...verified,payment_verifier:{...verified.payment_verifier}};
  let reads=0;
  Object.defineProperty(payload.payment_verifier,"from_address",{
    enumerable:true,configurable:true,
    get(){reads+=1;return reads===1?BUYER:WRONG_BUYER;},
  });
  try {
    const result=await invoke(f,payload,flags);
    assert.equal(result.ok,true);
    assert.equal(flags.fsyncReached,true);
    assert.equal(reads,1,"mutable getter invoked after original snapshot");
    assert.equal(await assertDurableOriginal(f,"unstable getter"),true);
    return true;
  } finally{fs.rmSync(f.root,{recursive:true,force:true});}
}
// Failing a malicious first serialization must not commit anything, and an
// honest retry must remain possible on the same original on-disk history.
async function firstSerializationWrongBuyerHoldsBeforeFsync() {
  const f=setup(),flags={fsyncReached:false};
  const payload={...verified,payment_verifier:{...verified.payment_verifier}};
  let serializations=0;
  Object.defineProperty(payload,"toJSON",{
    enumerable:false,
    value(){
      serializations+=1;
      return {...verified,payment_verifier:{
        ...verified.payment_verifier,from_address:WRONG_BUYER,
      }};
    }
  });
  try {
    let error="";
    try{await invoke(f,payload,flags);}
    catch(e){error=String(e instanceof Error?e.message:e);}
    assert.match(error,/buy_void_verified_payment_preappend_lineage_/u);
    assert.equal(flags.fsyncReached,false,"invalid first-buyer fsynced");
    assert.equal(serializations,1);
    assert.equal(fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl")).length,0);
    assert.equal(fs.readFileSync(path.join(f.ledgerRoot,ALLOCATION)).length,0);
    assert.equal(fs.readdirSync(f.requestDir).filter(x=>x.startsWith("operator-event-")).length,0);
    const recoveryFlags={fsyncReached:false};
    const recovery=await invoke(f,verified,recoveryFlags);
    assert.equal(recovery.ok,true);
    assert.equal(recoveryFlags.fsyncReached,true);
    assert.equal(await assertDurableOriginal(f,"clean retry"),true);
    return true;
  } finally{fs.rmSync(f.root,{recursive:true,force:true});}
}
// A launch-authority callback has a chance to mutate the input after the
// writer returns control to it. That caller-owned change must not alter the
// already-captured canonical event verified and physically appended.
async function callerMutationDuringLaunchHookCannotAlterFsync() {
  const f=setup(),flags={fsyncReached:false};
  const payload={...verified,payment_verifier:{...verified.payment_verifier}};
  try {
    const result=await writeBuyVoidVerifiedPaymentAllocationHandoffV1({
      event:payload,request:original,request_dir:f.requestDir,
      allocation_ledger_root:f.ledgerRoot,
      allocation_high_water_root:f.highWaterRoot,
      with_launch_authority_mutation:async (_request:any,operation:any)=>{
        payload.payment_verifier.from_address=WRONG_BUYER;
        return operation(()=>{});
      },
      read_sale_state:saleState(f),
      test_only_after_payment_fsync:()=>{flags.fsyncReached=true;},
    });
    assert.equal(result.ok,true);
    assert.equal(flags.fsyncReached,true);
    assert.equal(payload.payment_verifier.from_address,WRONG_BUYER);
    assert.equal(await assertDurableOriginal(f,"callback mutation"),true);
    return true;
  } finally{fs.rmSync(f.root,{recursive:true,force:true});}
}
assert.equal(await positiveControl(),true);
assert.equal(await adversarialToJSONRetainsReviewedBytes(),true);
assert.equal(await adversarialGetterRetainsReviewedBytes(),true);
assert.equal(await firstSerializationWrongBuyerHoldsBeforeFsync(),true);
assert.equal(await callerMutationDuringLaunchHookCannotAlterFsync(),true);
console.log("VOID_BUY_VOID_PREAPPEND_CANONICAL_EVENT_BYTES_V1_GREEN");
console.log("plain_unchanged_event_still_works=true");
console.log("historical_negative_fsync_scenario_now_uses_one_snapshot=true");
console.log("unstable_toJSON_serialized_exactly_once=true");
console.log("unstable_nested_getter_read_exactly_once=true");
console.log("first_serialization_wrong_buyer_held_before_fsync=true");
console.log("no_poisoned_history_clean_original_retry=true");
console.log("launch_callback_mutation_cannot_change_fsync=true");
console.log("canonical_verified_event_equals_durable_payment_jsonl=true");
console.log("allocation_and_sidecar_bind_same_canonical_buyer=true");
console.log("source_writer_not_mounted=true");
console.log("real_customer_data_used=false");
console.log("funds_moved=false");
