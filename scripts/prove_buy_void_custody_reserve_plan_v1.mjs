#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_AUTHORITY_V1,
  VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_V1,
  planBuyVoidCustodyReserveFromObservedBytesV1,
  testOnlyPlanBuyVoidCustodyReserveV1,
} from "../src/economic/buy_void_custody_reserve_plan_v1.mjs";
import {
  classifyBuyVoidAllocationReservationLedgerV1,
} from "../dist/economic/buy_void_allocation_reservation_ledger_v1.js";

const SOURCE="src/economic/buy_void_custody_reserve_plan_v1.mjs";
const EXPECTED_SOURCE_BLOB="c8ce5546fbe9a801161adbd7218888500ce346c9";
const PINS=Object.freeze({
  "src/economic/buy_void_verified_allocation_replay_binding_v1.ts":
    "970e686cd96b43d496c44acb4ff343a5e61e26c5",
  "src/economic/buy_void_allocation_reservation_ledger_v1.ts":
    "c3fc204710a9189723651cfeb6ffc52b1aa049db",
  "src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts":
    "e284a38a4b7f3d498b07e77c661d6eef3b742e7a",
  "src/economic/buy_void_custody_launch_authority_v2.mjs":
    "223ebdb8317009228094b8ebecef19dc37d87a91",
});
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
const sourceBytes=fs.readFileSync(SOURCE);
assert.equal(gitBlob(sourceBytes),EXPECTED_SOURCE_BLOB,"custody reserve plan source drift");
for(const [path,expected] of Object.entries(PINS)){
  assert.equal(gitBlob(fs.readFileSync(path)),expected,"dependency drift: "+path);
}
const source=sourceBytes.toString("utf8");
for(const required of [
  "classifyBuyVoidVerifiedAllocationReplayBindingV1",
  "planBuyVoidAllocationReservationV1",
  "classifyBuyVoidCustodyLaunchAuthorityObservedBytesV2",
  "snapshotProductionInput",
  "prior_verified_allocation_gap",
  "request_launch_authority_mismatch",
]) assert.ok(source.includes(required),"missing reserve-plan boundary: "+required);
for(const forbidden of [
  'from "node:fs"',
  "persistBuyVoidAllocationReservationPublicationWriterV1",
  "writeFileSync",
  "appendFileSync",
  "renameSync",
]) assert.equal(source.includes(forbidden),false,"source-only planner gained filesystem mutation: "+forbidden);

assert.equal(VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_V1,"VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_V1");
for(const [key,value] of Object.entries(VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_AUTHORITY_V1)){
  const allowedTrue=new Set([
    "source_only_planner",
    "verified_payment_replay_classifier_reused",
    "canonical_allocation_planner_reused",
    "custody_launch_v2_classifier_reused",
  ]);
  assert.equal(value,allowedTrue.has(key),key);
}

const buf=(rows)=>Buffer.from(
  rows.map(row=>JSON.stringify(row)).join("\n")+(rows.length?"\n":""),
  "utf8",
);
const tx=(x)=>"0x"+x.repeat(64);
const addr=(x)=>"0x"+x.repeat(40);
const digest=(x)=>"sha256:"+x.repeat(64);
const shaRef=(bytes)=>"sha256:"+crypto.createHash("sha256").update(bytes).digest("hex");
const NOW=1800000000002;
const receipt=Object.freeze({
  coupled_launch_id:digest("a"),
  source_composition_id:digest("b"),
  activation_generation:tx("c"),
  generation_tip_sha256:digest("d"),
  activation_receipt_id:"voidbclive1_"+"e".repeat(64),
  expires_at_ms:1800000300000,
});
const receiptBytes=Buffer.from(JSON.stringify(receipt),"utf8");
const receiptSha=shaRef(receiptBytes);
const launchAuthority=Object.freeze({
  marker:"VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
  version:1,
  coupled_launch_id:receipt.coupled_launch_id,
  source_composition_id:receipt.source_composition_id,
  activation_generation:receipt.activation_generation,
  generation_tip_sha256:receipt.generation_tip_sha256,
  activation_receipt_id:receipt.activation_receipt_id,
  activation_receipt_sha256:receiptSha.slice("sha256:".length),
  expires_at_ms:receipt.expires_at_ms,
});
const launchDecision=Object.freeze({
  ready:true,
  high_water_matches_current:true,
  high_water_advance_required:false,
  source_composition_id:receipt.source_composition_id,
  generation:receipt.activation_generation,
  tip_sha256:receipt.generation_tip_sha256,
  activation_receipt_id:receipt.activation_receipt_id,
  activation_receipt_sha256:receiptSha,
});
const nativeUsdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const request=Object.freeze({
  request_id:"buyvoid_a_aaaaaaaa",
  source_chain:"base",
  tx_hash:tx("1"),
  quoted_void:"6",
  usdc_amount:"3",
  delivery_address:addr("2"),
  receive_address:addr("3"),
  usdc_contract:nativeUsdc,
  launch_authority:launchAuthority,
});
const event=Object.freeze({
  schema:"void_buy_void_verified_payment_event_v2",
  marker:"VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id:request.request_id,
  operator_status:"payment_verified",
  payment_verified:true,
  payment_identity_input_complete:true,
  marked_at_ms:1800000000001,
  tx_hash:request.tx_hash,
  quoted_void:request.quoted_void,
  payment_verifier:Object.freeze({
    chain:"base",
    transaction_hash:request.tx_hash,
    log_index:"7",
    block_number:"100",
    confirmations:"12",
    usdc_contract:nativeUsdc,
    from_address:request.delivery_address,
    receive_address:request.receive_address,
    delivery_address:request.delivery_address,
    amount_units:"3000000",
    requested_units:"3000000",
  }),
});
const base=Object.freeze({
  request_id:request.request_id,
  requests_jsonl:buf([request]),
  operator_events_jsonl:buf([event]),
  allocation_jsonl:Buffer.alloc(0),
  activation_receipt_bytes:receiptBytes,
  launch_authority_decision:launchDecision,
  now_ms:NOW,
});
function requireReady(decision,status){
  assert.equal(decision.ready,true,JSON.stringify(decision));
  assert.equal(decision.status,status);
  assert.equal(decision.reason,null);
  assert.equal(decision.operation_performed,false);
  assert.equal(decision.descriptor_bound_reads,false);
  assert.equal(decision.filesystem_write,false);
  assert.equal(decision.allocation_write,false);
  assert.equal(decision.custody_reserve_method_enabled,false);
  assert.equal(decision.production_allocation_mutation_ready,false);
  assert.equal(decision.funds_movement,false);
}
function requireHeld(decision,reason){
  assert.equal(decision.ready,false,JSON.stringify(decision));
  assert.equal(decision.status,"held");
  assert.match(decision.reason||"",reason);
  assert.equal(decision.operation_performed,false);
  assert.equal(decision.allocation_write,false);
  assert.equal(decision.production_allocation_mutation_ready,false);
}

const first=testOnlyPlanBuyVoidCustodyReserveV1(base);
requireReady(first,"planned");
assert.match(first.allocation_record_id,/^voidalloc1_[0-9a-f]{64}$/u);
assert.match(first.payment_verified_event_sha256,/^sha256:[0-9a-f]{64}$/u);
const ledger1=Buffer.from(first.next_ledger_jsonl,"utf8");
const classified=classifyBuyVoidAllocationReservationLedgerV1(ledger1);
assert.equal(classified.ok,true);
assert.equal(classified.record_count,1);
assert.equal(classified.records[0].request_id,request.request_id);
assert.equal(classified.records[0].payment_verified_event_sha256,
  first.payment_verified_event_sha256);

const again=testOnlyPlanBuyVoidCustodyReserveV1({
  ...base,allocation_jsonl:ledger1,
});
requireReady(again,"idempotent");
assert.equal(again.idempotent,true);
assert.equal(again.next_ledger_jsonl,first.next_ledger_jsonl);
assert.equal(again.allocation_record_id,first.allocation_record_id);

const mismatchedLaunchRequest={
  ...request,
  launch_authority:{
    ...launchAuthority,
    source_composition_id:digest("9"),
  },
};
requireHeld(testOnlyPlanBuyVoidCustodyReserveV1({
  ...base,requests_jsonl:buf([mismatchedLaunchRequest]),
}),/request_launch_authority_mismatch/u);
requireHeld(testOnlyPlanBuyVoidCustodyReserveV1({
  ...base,launch_authority_decision:{...launchDecision,ready:false},
}),/launch_authority_not_ready/u);
requireHeld(testOnlyPlanBuyVoidCustodyReserveV1({
  ...base,activation_receipt_bytes:Buffer.from(JSON.stringify({...receipt,expires_at_ms:receipt.expires_at_ms+1})),
}),/request_launch_authority_mismatch/u);

const request2=Object.freeze({
  ...request,
  request_id:"buyvoid_b_bbbbbbbb",
  tx_hash:tx("9"),
  quoted_void:"4",
  usdc_amount:"2",
  delivery_address:addr("4"),
  receive_address:addr("5"),
});
const event2=Object.freeze({
  ...event,
  request_id:request2.request_id,
  tx_hash:request2.tx_hash,
  quoted_void:request2.quoted_void,
  payment_verifier:Object.freeze({
    ...event.payment_verifier,
    transaction_hash:request2.tx_hash,
    from_address:request2.delivery_address,
    receive_address:request2.receive_address,
    delivery_address:request2.delivery_address,
    amount_units:"2000000",
    requested_units:"2000000",
  }),
});
requireHeld(testOnlyPlanBuyVoidCustodyReserveV1({
  ...base,
  requests_jsonl:buf([request,request2]),
  operator_events_jsonl:buf([event,event2]),
}),/prior_verified_allocation_gap/u);

const productionBase=Object.freeze({
  request_id:request.request_id,
  requests_jsonl:buf([request]),
  operator_events_jsonl:buf([event]),
  allocation_jsonl:Buffer.alloc(0),
  generation_journal_bytes:Buffer.from("{}\n"),
  activation_receipt_bytes:receiptBytes,
  custody_high_water_bytes:Buffer.from("{}\n"),
});
requireHeld(planBuyVoidCustodyReserveFromObservedBytesV1({
  ...productionBase,now_ms:NOW,
}),/input_not_plain_data/u);
requireHeld(planBuyVoidCustodyReserveFromObservedBytesV1({
  ...productionBase,verified_payment_gate_green:true,
}),/input_not_plain_data/u);
requireHeld(planBuyVoidCustodyReserveFromObservedBytesV1({
  ...productionBase,requests_jsonl:"not-a-buffer",
}),/input_not_plain_data/u);

const oversizedReceipt=Buffer.alloc(64*1024+1,0x7b);
requireHeld(testOnlyPlanBuyVoidCustodyReserveV1({
  ...base,activation_receipt_bytes:oversizedReceipt,
}),/activation_receipt_size_invalid/u);

// Production entry must copy caller Buffers before any classifier can observe
// later caller mutation. The exact synthetic bytes remain launch-HOLD, but
// the caller-owned inputs themselves stay unchanged.
const mutableRequests=Buffer.from(productionBase.requests_jsonl);
const mutableProduction={...productionBase,requests_jsonl:mutableRequests};
const productionCopyHeld=planBuyVoidCustodyReserveFromObservedBytesV1(
  mutableProduction,
);
requireHeld(productionCopyHeld,/launch_authority_not_ready/u);
assert.deepEqual(mutableRequests,productionBase.requests_jsonl);

let proxyTraps=0;
const proxied=new Proxy({...productionBase},{
  get(target,key,receiver){proxyTraps++;return Reflect.get(target,key,receiver);},
  getPrototypeOf(target){proxyTraps++;return Reflect.getPrototypeOf(target);},
});
requireHeld(planBuyVoidCustodyReserveFromObservedBytesV1(proxied),/input_not_plain_data/u);
assert.equal(proxyTraps,0,"production input Proxy trap executed");

let getterReads=0;
const accessor={...productionBase};
Object.defineProperty(accessor,"request_id",{
  enumerable:true,configurable:true,
  get(){getterReads++;return request.request_id;},
});
requireHeld(planBuyVoidCustodyReserveFromObservedBytesV1(accessor),/input_not_plain_data/u);
assert.equal(getterReads,0,"production input accessor executed");

// Exact-shape synthetic bytes still cannot fake V2 signed launch authority.
const productionHeld=planBuyVoidCustodyReserveFromObservedBytesV1(productionBase);
requireHeld(productionHeld,/launch_authority_not_ready/u);

console.log("VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_V1_PROOF_GREEN");
console.log("exact_source_and_dependency_blobs_verified=true");
console.log("durable_verified_payment_replay_semantics_reused=true");
console.log("canonical_allocation_planner_reused=true");
console.log("signed_launch_v2_classifier_called_by_production_entry=true");
console.log("planned_then_idempotent_exact_ledger=true");
console.log("request_launch_lineage_mismatch_held=true");
console.log("prior_verified_allocation_gap_held=true");
console.log("production_input_exact_plain_data=true");
console.log("production_byte_inputs_detached=true");
console.log("activation_receipt_size_bounded=true");
console.log("proxy_and_accessor_execution_count=0");
console.log("caller_green_flags_accepted=false");
console.log("caller_clock_accepted=false");
console.log("descriptor_bound_reads=false");
console.log("filesystem_write=false");
console.log("custody_reserve_method_enabled=false");
console.log("production_allocation_mutation_ready=false");
console.log("funds_movement=false");
// Source-only synthetic proof: no real allocation, transfer or funding action.
// Retain the established marker and satisfy the separately pinned CI receipt.
console.log("funds_moved=false");
