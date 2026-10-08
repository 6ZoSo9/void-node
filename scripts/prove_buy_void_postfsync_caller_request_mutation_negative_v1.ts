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
// Test ONLY the original source author's supported after-payment-fsync
// fault-injection callback. This is an unmounted API and disposable ledger.
// A source-level negative GREEN means the CURRENT REQUEST OBJECT CAN CHANGE
// after its buyer/launch checks and before the durable allocation planner.
async function originalCallerWalletSwappedAfterPaymentFsync() {
  const f=setup();
  const mutableRequest: any=JSON.parse(JSON.stringify(original));
  let afterPaymentFsync=false, firstError="";
  try {
    try {
      await writeBuyVoidVerifiedPaymentAllocationHandoffV1({
        event:verified,
        request:mutableRequest,
        request_dir:f.requestDir,
        allocation_ledger_root:f.ledgerRoot,
        allocation_high_water_root:f.highWaterRoot,
        with_launch_authority_mutation:async (_request:any,operation:any)=>operation(()=>{}),
        read_sale_state:saleState(f),
        test_only_after_payment_fsync:()=>{
          afterPaymentFsync=true;
          mutableRequest.delivery_address=WRONG_BUYER;
        },
      });
    } catch(e) { firstError=String(e instanceof Error?e.message:e); }
    assert.equal(afterPaymentFsync,true,"source must reach real durable payment fsync");
    assert.equal(mutableRequest.delivery_address,WRONG_BUYER);
    assert.ok(firstError.length>0,"unqualified mutated request must not be accepted");
    const paymentPath=path.join(f.requestDir,"operator-events.jsonl");
    const allocationPath=path.join(f.ledgerRoot,ALLOCATION);
    const paid=fs.readFileSync(paymentPath);
    assert.ok(paid.equals(EVENT_VALID_ROW),
      "original source must still fsync correct immutable V2 buyer event");
    const allocations=rows(allocationPath);
    assert.equal(allocations.length,1,
      "this source generation persists a wrong-buyer allocation before rejecting");
    assert.ok(JSON.stringify(allocations[0]).toLowerCase().includes(WRONG_BUYER),
      "durable allocation must reflect the swapped caller wallet, not first original");
    const replay=classifyBuyVoidVerifiedAllocationReplayBindingV1({
      request_id:ID,
      requests_jsonl:fs.readFileSync(path.join(f.requestDir,"requests.jsonl")),
      operator_events_jsonl:paid,
      allocation_jsonl:fs.readFileSync(allocationPath),
    });
    assert.notEqual(replay.status,"allocation_present",
      "strict replay must reject the inconsistent permanent allocation");
    assert.notEqual(replay.ok,true,
      "invalid allocation cannot be presented as accepted buyer history");
    const sidecars=fs.readdirSync(f.requestDir)
      .filter(name=>name.startsWith("operator-event-")&&name.endsWith(".json"));
    assert.equal(sidecars.length,0,
      "postcheck must have held before success-sidecar publication");

    // An honest retry cannot retroactively erase the poisoned append-only
    // allocation. It must not append another payment row or reserve twice.
    let retryError="";
    try {
      await invoke(f,verified,{fsyncReached:false});
    } catch(e) {retryError=String(e instanceof Error?e.message:e);}
    assert.ok(retryError.length>0,
      "unreviewed recovery must not silently call corrupt allocation legitimate");
    assert.ok(fs.readFileSync(paymentPath).equals(EVENT_VALID_ROW));
    assert.equal(rows(allocationPath).length,1);
    assert.ok(JSON.stringify(rows(allocationPath)[0]).toLowerCase().includes(WRONG_BUYER));

    console.log("VOID_BUY_VOID_POSTFSYNC_MUTABLE_CALLER_REQUEST_NEGATIVE_V1_GREEN");
    console.log("plain_immutable_control_passed=true");
    console.log("preappend_original_buyer_validated=true");
    console.log("original_verified_payment_fsynced_before_mutation=true");
    console.log("mutable_caller_wallet_swapped_after_fsync=true");
    console.log("incorrect_allocation_persisted_before_strict_replay_hold=true");
    console.log("strict_postcheck_rejects_poisoned_allocation=true");
    console.log("honest_retry_cannot_silently_repair_poisoned_allocation=true");
    console.log("payment_row_was_not_duplicated=true");
    console.log("customer_or_real_ledger_used=false");
    console.log("runtime_route_mounted=false");
    console.log("wallet_signer_chain_action=false");
    console.log("production_authority_ready=false");
    console.log("funds_moved=false");
    return true;
  } finally { fs.rmSync(f.root,{recursive:true,force:true}); }
}
assert.equal(await positiveControl(),true);
assert.equal(await originalCallerWalletSwappedAfterPaymentFsync(),true);
