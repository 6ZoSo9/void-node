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
// Positive real-writer regression against the exact negative #2671 fixture.
// This does not mount any HTTP service, create wallets or touch real ledgers.
async function checkHonestHistory(
  f: ReturnType<typeof setup>, label: string,
): Promise<void> {
  const paid=fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl"));
  assert.ok(paid.equals(EVENT_VALID_ROW),label+" payment row changed");
  const stored=fs.readFileSync(path.join(f.ledgerRoot,ALLOCATION));
  const allocations=rows(path.join(f.ledgerRoot,ALLOCATION));
  assert.equal(allocations.length,1,label+" allocation count");
  assert.equal(
    JSON.stringify(allocations[0]).toLowerCase().includes(WRONG_BUYER),false,
    label+" stored attacker buyer"
  );
  assert.equal(
    JSON.stringify(allocations[0]).toLowerCase().includes(BUYER),true,
    label+" missing original buyer allocation"
  );
  const bound=classifyBuyVoidVerifiedAllocationReplayBindingV1({
    request_id:ID,
    requests_jsonl:fs.readFileSync(path.join(f.requestDir,"requests.jsonl")),
    operator_events_jsonl:paid,
    allocation_jsonl:stored,
  });
  assert.equal(bound.ok,true,label+" replay qualified");
  assert.equal(bound.status,"allocation_present");
  const sidecar=path.join(f.requestDir,
    "operator-event-"+ID+"-"+MARKED+".json");
  assert.equal(fs.existsSync(sidecar),true,label+" sidecar absent");
  const receipt=JSON.parse(fs.readFileSync(sidecar,"utf8"));
  assert.equal(receipt.payment_verifier.from_address,BUYER);
}
async function postFsyncCallerMutationCannotChangeAllocation(): Promise<boolean> {
  const f=setup(),originalCaller:any=JSON.parse(JSON.stringify(original));
  let afterFsync=false;
  try {
    const result=await writeBuyVoidVerifiedPaymentAllocationHandoffV1({
      event:verified,request:originalCaller,request_dir:f.requestDir,
      allocation_ledger_root:f.ledgerRoot,
      allocation_high_water_root:f.highWaterRoot,
      with_launch_authority_mutation:async (_request:any,operation:any)=>{
        assert.equal(_request.delivery_address,BUYER,
          "launch callback must receive entry-time immutable request");
        return operation(()=>{});
      },
      read_sale_state:saleState(f),
      test_only_after_payment_fsync:()=>{
        afterFsync=true;
        originalCaller.delivery_address=WRONG_BUYER;
        originalCaller.quoted_void="9";
        originalCaller.launch_authority.activation_generation="0x"+"9".repeat(64);
      },
    });
    assert.equal(afterFsync,true,"real payment fsync not exercised");
    assert.equal(result.ok,true);
    assert.equal(originalCaller.delivery_address,WRONG_BUYER);
    assert.equal(originalCaller.quoted_void,"9");
    assert.equal(await checkHonestHistory(f,"after-fsync caller mutation"),undefined);
    const paid=fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl"));
    const allocated=fs.readFileSync(path.join(f.ledgerRoot,ALLOCATION));
    const retried=await invoke(f,verified,{fsyncReached:false});
    assert.equal(retried.ok,true,"honest replay after correct allocation");
    assert.ok(fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl")).equals(paid));
    assert.ok(fs.readFileSync(path.join(f.ledgerRoot,ALLOCATION)).equals(allocated));
    return true;
  } finally {fs.rmSync(f.root,{recursive:true,force:true});}
}
async function launchHookCallerMutationCannotChangeAllocation():Promise<boolean> {
  const f=setup(),caller:any=JSON.parse(JSON.stringify(original));
  let afterFsync=false;
  try {
    const result=await writeBuyVoidVerifiedPaymentAllocationHandoffV1({
      event:verified,request:caller,request_dir:f.requestDir,
      allocation_ledger_root:f.ledgerRoot,
      allocation_high_water_root:f.highWaterRoot,
      with_launch_authority_mutation:async (snapshot:any,operation:any)=>{
        assert.equal(snapshot.delivery_address,BUYER);
        caller.delivery_address=WRONG_BUYER;
        caller.quoted_void="13";
        caller.launch_authority.activation_generation="0x"+"8".repeat(64);
        assert.equal(snapshot.delivery_address,BUYER);
        assert.equal(snapshot.quoted_void,"6");
        return operation(()=>{});
      },
      read_sale_state:saleState(f),
      test_only_after_payment_fsync:()=>{afterFsync=true;},
    });
    assert.equal(result.ok,true);
    assert.equal(afterFsync,true);
    assert.equal(await checkHonestHistory(f,"launch callback mutation"),undefined);
    return true;
  } finally {fs.rmSync(f.root,{recursive:true,force:true});}
}
async function unstableCallerToJSONSerializedOnce():Promise<boolean> {
  const f=setup(),caller:any=JSON.parse(JSON.stringify(original));
  let serializations=0,afterFsync=false;
  Object.defineProperty(caller,"toJSON",{
    enumerable:false,
    value(){
      serializations+=1;
      return {
        ...JSON.parse(JSON.stringify(original)),
        delivery_address:serializations===1?BUYER:WRONG_BUYER,
      };
    },
  });
  try {
    const out=await writeBuyVoidVerifiedPaymentAllocationHandoffV1({
      event:verified,request:caller,request_dir:f.requestDir,
      allocation_ledger_root:f.ledgerRoot,
      allocation_high_water_root:f.highWaterRoot,
      with_launch_authority_mutation:async (_snapshot:any,operation:any)=>operation(()=>{}),
      read_sale_state:saleState(f),
      test_only_after_payment_fsync:()=>{afterFsync=true;},
    });
    assert.equal(out.ok,true);
    assert.equal(afterFsync,true);
    assert.equal(serializations,1,"caller toJSON invoked after snapshot");
    assert.equal(await checkHonestHistory(f,"caller toJSON"),undefined);
    return true;
  } finally {fs.rmSync(f.root,{recursive:true,force:true});}
}
async function wrongInitialBuyerStillHoldsBeforeFsync():Promise<boolean> {
  const f=setup(),caller:any=JSON.parse(JSON.stringify(original));
  caller.delivery_address=WRONG_BUYER;
  let afterFsync=false,error="";
  try {
    try {
      await writeBuyVoidVerifiedPaymentAllocationHandoffV1({
        event:verified,request:caller,request_dir:f.requestDir,
        allocation_ledger_root:f.ledgerRoot,
        allocation_high_water_root:f.highWaterRoot,
        with_launch_authority_mutation:async (_snapshot:any,operation:any)=>operation(()=>{}),
        read_sale_state:saleState(f),
        test_only_after_payment_fsync:()=>{afterFsync=true;},
      });
    } catch(e) {error=String(e instanceof Error?e.message:e);}
    assert.ok(error.length>0,"invalid first buyer must hold");
    assert.equal(afterFsync,false,"invalid first buyer reached payment fsync");
    assert.equal(fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl")).length,0);
    assert.equal(fs.readFileSync(path.join(f.ledgerRoot,ALLOCATION)).length,0);
    assert.equal(fs.readdirSync(f.requestDir).filter(x=>x.startsWith("operator-event-")).length,0);
    return true;
  } finally {fs.rmSync(f.root,{recursive:true,force:true});}
}
assert.equal(await positiveControl(),true);
assert.equal(await postFsyncCallerMutationCannotChangeAllocation(),true);
assert.equal(await launchHookCallerMutationCannotChangeAllocation(),true);
assert.equal(await unstableCallerToJSONSerializedOnce(),true);
assert.equal(await wrongInitialBuyerStillHoldsBeforeFsync(),true);
console.log("VOID_BUY_VOID_CANONICAL_CALLER_REQUEST_V1_POSITIVE_GREEN");
console.log("normal_handoff_preserved=true");
console.log("postfsync_caller_wallet_quote_launch_mutation_cannot_poison_allocation=true");
console.log("launch_callback_caller_mutation_cannot_poison_allocation=true");
console.log("unstable_request_toJSON_read_exactly_once=true");
console.log("wrong_first_original_buyer_held_before_fsync=true");
console.log("durable_payment_allocation_original_buyer_bound=true");
console.log("strict_replay_and_exact_recovery_preserved=true");
console.log("real_customer_records_used=false");
console.log("source_writer_not_mounted=true");
console.log("production_payment_authority=false");
console.log("funds_moved=false");
