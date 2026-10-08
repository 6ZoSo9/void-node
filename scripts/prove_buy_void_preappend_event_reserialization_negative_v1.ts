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
  return contents ? contents.trimEnd().split("\n").filter(Boolean).map(JSON.parse) : [];
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
async function mutatingObjectReproduction(){
  const f=setup();
  const flags={fsyncReached:false};
  const payload={...verified,payment_verifier:{...verified.payment_verifier}};
  let serializationCount=0;
  Object.defineProperty(payload,"toJSON",{
    enumerable:false,configurable:false,
    value(){
      serializationCount+=1;
      return {...verified,payment_verifier:{
        ...verified.payment_verifier,
        from_address:serializationCount===1?BUYER:WRONG_BUYER
      }};
    }
  });
  try{
    let error="";
    try {await invoke(f,payload,flags);}
    catch(e){error=String(e instanceof Error?e.message:e);}
    const stored=fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl"));
    const storedRows=rows(path.join(f.requestDir,"operator-events.jsonl"));
    const allocations=fs.readFileSync(path.join(f.ledgerRoot,ALLOCATION));
    // This is intentionally a negative witness. The bad buyer must appear
    // AFTER the pre-append validator accepted the initial, correct bytes.
    assert.ok(serializationCount>=2,"candidate was not serialized at least twice");
    assert.equal(flags.fsyncReached,true,"unsafe durable append did not occur");
    assert.equal(storedRows.length,1,"expected one durable operator payment row");
    assert.equal(storedRows[0].payment_verifier.from_address,WRONG_BUYER);
    assert.equal(stored.equals(EVENT_VALID_ROW),false);
    assert.notEqual(sha(stored),sha(EVENT_VALID_ROW));
    const replay=classifyBuyVoidVerifiedAllocationReplayBindingV1({
      request_id:ID,
      requests_jsonl:fs.readFileSync(path.join(f.requestDir,"requests.jsonl")),
      operator_events_jsonl:stored,
      allocation_jsonl:allocations,
    });
    assert.equal(replay.ok,false,"invalid buyer was accepted by strict replay");
    assert.ok(error.length>0,"writer unexpectedly reported full success");

    const oldLedger=Buffer.from(stored),oldAlloc=Buffer.from(allocations);
    let retryReason="";
    try{await invoke(f,verified,{fsyncReached:false});}
    catch(e){retryReason=String(e instanceof Error?e.message:e);}
    assert.ok(retryReason.length>0,"correct buyer unexpectedly replayed invalid history");
    assert.equal(fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl")).equals(oldLedger),true);
    assert.equal(fs.readFileSync(path.join(f.ledgerRoot,ALLOCATION)).equals(oldAlloc),true);

    return Object.freeze({
      count:serializationCount,
      immutable_expected_sha:sha(EVENT_VALID_ROW),
      durable_wrong_buyer_sha:sha(stored),
      writer_held_only_after_fsync:true,
      strict_replay_rejected:true,
      correct_replay_cannot_erase_bad_history:true,
    });
  } finally{fs.rmSync(f.root,{recursive:true,force:true});}
}
assert.equal(await positiveControl(),true);
const result=await mutatingObjectReproduction();
assert.ok(result.count>=2);
console.log("VOID_BUY_VOID_PREAPPEND_EVENT_RESERIALIZATION_NEGATIVE_V1_GREEN");
console.log("plain_unchanged_event_still_works=true");
console.log("original_buyer_validated_on_first_serialization=true");
console.log("different_payment_sender_written_after_fsync=true");
console.log("durable_row_bytes_differ_from_preappend_checked_bytes=true");
console.log("strict_replay_rejects_after_fsync=true");
console.log("correct_replay_cannot_repair_poisoned_row=true");
console.log("mutable_caller_event_no_production_authority=true");
console.log("source_writer_not_mounted=true");
console.log("real_customer_data_used=false");
console.log("funds_moved=false");
