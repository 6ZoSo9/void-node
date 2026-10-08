import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { writeBuyVoidVerifiedPaymentAllocationHandoffV1 } from
  "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";
import { deriveBuyVoidAllocationReservationHighWaterV1 } from
  "../src/economic/buy_void_allocation_reservation_high_water_v1.js";
import { classifyBuyVoidVerifiedAllocationReplayBindingV1 } from
  "../src/economic/buy_void_verified_allocation_replay_binding_v1.js";

const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const RECEIVE = "0x" + "3".repeat(40);
const WALLET = "0x" + "2".repeat(40);
const WRONG_WALLET = "0x" + "9".repeat(40);
const TX = "0x" + "1".repeat(64);
const REQUEST_ID = "buyvoid_h_" + "h".repeat(8);
const LEDGER = "allocation-reservations-v1.jsonl";
const HIGH_WATER = "allocation-reservation-high-water-v1.json";
const POOL = "10000000";
const QUOTE = "6";
const VERIFIED_AT = 1800000000020;

const launch = Object.freeze({
  marker:"VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
  version:1,
  coupled_launch_id:"sha256:"+"a".repeat(64),
  source_composition_id:"sha256:"+"b".repeat(64),
  activation_generation:"0x"+"c".repeat(64),
  generation_tip_sha256:"sha256:"+"d".repeat(64),
  activation_receipt_id:"voidbclive1_"+"e".repeat(64),
  activation_receipt_sha256:"f".repeat(64),
  expires_at_ms:1900000000000
});
const request = Object.freeze({
  schema:"void_public_buy_void_request_v1",
  request_id:REQUEST_ID,
  status:"payment_submitted_pending_manual_review",
  source_chain:"base",
  payment_chain:"base",
  tx_hash:TX,
  quoted_void:QUOTE,
  usdc_amount:"3",
  delivery_address:WALLET,
  receive_address:RECEIVE,
  usdc_contract:BASE_USDC,
  launch_authority:launch,
  created_at_ms:VERIFIED_AT-10
});
const correctEvent = Object.freeze({
  schema:"void_buy_void_verified_payment_event_v2",
  marker:"VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id:REQUEST_ID,
  operator_status:"payment_verified",
  payment_verified:true,
  payment_identity_input_complete:true,
  marked_at_ms:VERIFIED_AT,
  tx_hash:TX,
  quoted_void:QUOTE,
  payment_verifier:{
    chain:"base",
    transaction_hash:TX,
    log_index:"7",
    block_number:"100",
    confirmations:"12",
    usdc_contract:BASE_USDC,
    from_address:WALLET,
    receive_address:RECEIVE,
    delivery_address:WALLET,
    amount_units:"3000000",
    requested_units:"3000000"
  }
});
function rows(file) {
  const s=fs.readFileSync(file,"utf8");
  return s ? s.trimEnd().split("\n").map(JSON.parse) : [];
}
function setup() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-handoff-original-wallet-boundary-"));
  fs.chmodSync(root,0o700);
  const requestDir=path.join(root,"requests");
  const ledgerRoot=path.join(root,"ledger");
  const highWaterRoot=path.join(root,"high-water");
  for(const dir of [requestDir,ledgerRoot,highWaterRoot])fs.mkdirSync(dir,{mode:0o700});
  fs.writeFileSync(path.join(requestDir,"requests.jsonl"),
    JSON.stringify(request)+"\n",{mode:0o600});
  fs.writeFileSync(path.join(requestDir,"operator-events.jsonl"),"",{mode:0o600});
  fs.writeFileSync(path.join(ledgerRoot,LEDGER),"",{mode:0o600});
  const genesis=deriveBuyVoidAllocationReservationHighWaterV1("");
  assert.equal(genesis.ok,true,"allocation genesis");
  fs.writeFileSync(path.join(highWaterRoot,HIGH_WATER),genesis.high_water_json,
    {mode:0o600});
  return {root,requestDir,ledgerRoot,highWaterRoot};
}
function state(f) {
  return async()=>{
    const verified=rows(path.join(f.requestDir,"operator-events.jsonl"))
      .filter(row=>row.operator_status==="payment_verified").length;
    const value=6*verified;
    return {
      pool_void_total:POOL,
      allocation_reserved_void:String(value),
      verified_void_total:String(value),
      remaining_void:String(10000000-value)
    };
  };
}
async function invoke(f,candidateRequest,candidateEvent,mark) {
  return writeBuyVoidVerifiedPaymentAllocationHandoffV1({
    request:candidateRequest,event:candidateEvent,
    request_dir:f.requestDir,
    allocation_ledger_root:f.ledgerRoot,
    allocation_high_water_root:f.highWaterRoot,
    with_launch_authority_mutation: async (_request,operation)=>
      operation(()=>{}),
    read_sale_state:state(f),
    test_only_after_payment_fsync:()=>{mark.appendReached=true}
  });
}
async function demonstrate(label,candidateRequest,candidateEvent) {
  const f=setup(),mark={appendReached:false};
  try {
    let held=false,reason="";
    try {await invoke(f,candidateRequest,candidateEvent,mark);}
    catch(e){held=true;reason=e instanceof Error ? e.message : String(e);}
    const durable=rows(path.join(f.requestDir,"operator-events.jsonl"));
    const allocation=fs.readFileSync(path.join(f.ledgerRoot,LEDGER),"utf8");
    const replay=classifyBuyVoidVerifiedAllocationReplayBindingV1({
      request_id:REQUEST_ID,
      requests_jsonl:fs.readFileSync(path.join(f.requestDir,"requests.jsonl")),
      operator_events_jsonl:fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl")),
      allocation_jsonl:Buffer.from(allocation)
    });
    assert.equal(held,true,label+": handoff must reject invalid lineage");
    assert.equal(mark.appendReached,true,label+": payment append already fsynced");
    assert.equal(durable.length,1,label+": one committed payment");
    assert.equal(durable[0].request_id,REQUEST_ID);
    assert.equal(replay.ok,false,label+": replay must not claim valid allocation");
    assert.equal(replay.status,"held",label+": incorrect lineage must hold");
    let correctedRejected=false;
    try {await invoke(f,request,correctEvent,{appendReached:false});}
    catch{correctedRejected=true;}
    assert.equal(correctedRejected,true,label+": later honest replay cannot erase poisoned row");
    assert.equal(rows(path.join(f.requestDir,"operator-events.jsonl")).length,1);
    console.log("case="+label);
    console.log("source_handoff_rejected_invalid_lineage=true");
    console.log("payment_verified_fsynced_BEFORE_lineage_rejection=true");
    console.log("postappend_replay_held=true");
    console.log("exact_corrected_replay_blocked=true");
    console.log("error="+reason);
    return true;
  }finally{fs.rmSync(f.root,{recursive:true,force:true});}
}
// Negative evidence only: these intentionally reproduce a source-contract
// failure. Passing this regression does NOT mean the launch flow is safe.
const forgedEvent={
  ...correctEvent,
  payment_verifier:{...correctEvent.payment_verifier,from_address:WRONG_WALLET}
};
await demonstrate("forged_verifier_buyer",request,forgedEvent);
const alteredCallerRequest={
  ...request,
  delivery_address:WRONG_WALLET
};
await demonstrate("unbound_caller_delivery",alteredCallerRequest,correctEvent);
console.log("VOID_BUY_VOID_PREAPPEND_ORIGINAL_BUYER_FALSIFICATION_V1_GREEN");
console.log("PREAPPEND_ORIGINAL_BUYER_LINEAGE_SAFE=false");
console.log("canonical_operator_history_poison_reproduced=true");
console.log("production_ready=false");
console.log("real_customer_ledger_access=false");
console.log("wallet_or_signer_access=false");
console.log("funds_moved=false");
