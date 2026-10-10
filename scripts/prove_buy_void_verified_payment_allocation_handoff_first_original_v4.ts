#!/usr/bin/env node
// First-original buyer V4 successor for the REAL source-only payment→allocation
// handoff. Reuses untouched V1 real-temporary-filesystem tests; no host work.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1,
  writeBuyVoidVerifiedPaymentAllocationHandoffV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";
import {
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../src/economic/buy_void_allocation_reservation_high_water_v1.js";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const BOUND=Object.freeze({
  "scripts/prove_buy_void_verified_payment_allocation_handoff_v1.ts":
    "6d6a8b0efee8bc2d4e7f402bf7bd4b9e4ed4ac3a",
  "src/economic/buy_void_verified_allocation_replay_binding_v1.ts":
    "435ed6000caad046f48fb318fbc7c865393f3b6c",
  "src/economic/buy_void_preappend_plain_input_v1.ts":
    "945cd55d92d4a76fe0d8bfaa237ca27d4753dc2f",
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts":
    "f591f7407d9afc2cf77e0f90923aa11b4817fd4e",
  "src/economic/buy_void_allocation_reservation_ledger_v1.ts":
    "66617a89d5ad9f81b5a21d98cca55fcda6902a80",
  "src/economic/buy_void_allocation_reservation_high_water_v1.ts":
    "9383c94cf848efb9a0112f1b741df4e10f790ac6",
});
function gitBlob(bytes) {
  return crypto.createHash("sha1").update(
    Buffer.from("blob "+bytes.length+"\0","utf8")
  ).update(bytes).digest("hex");
}
for(const [rel,sha] of Object.entries(BOUND)) {
  const buf=fs.readFileSync(path.join(ROOT,rel));
  assert.ok(buf.length>0&&buf.length<1_000_000,"source size bound:"+rel);
  assert.equal(gitBlob(buf),sha,"reviewed handoff source blob mismatch:"+rel);
}
const frozenV3Handoff=fs.readFileSync(path.join(ROOT,
  "scripts/prove_buy_void_verified_payment_allocation_handoff_first_original_v3.ts"));
assert.equal(gitBlob(frozenV3Handoff),
  "d31f8cbb85ed17c9937baf3c9725a6fae22cc829",
  "immutable first-original V3 handoff proof changed");
const frozenV2Handoff=fs.readFileSync(path.join(ROOT,
  "scripts/prove_buy_void_verified_payment_allocation_handoff_first_original_v2.ts"));
assert.equal(gitBlob(frozenV2Handoff),
  "9fb39172afa09e49c11d72ff376e9af2d99a4101",
  "immutable first-original V2 handoff proof changed");
const frozen=fs.readFileSync(path.join(ROOT,
  "scripts/prove_buy_void_payment_allocation_hypothetical_crash_matrix_v1.mjs"));
assert.equal(gitBlob(frozen),"1a8db260a134ad438366d5b7660f926768c98a79",
  "immutable historical V1 crash review source changed");
assert.ok(frozen.toString("utf8").includes(
  "970e686cd96b43d496c44acb4ff343a5e61e26c5"),
  "historical V1 buyer replay pin absent");

// The original V1 source-only, real-temp-filesystem handoff proof is executed
// only AFTER exact Git blob authentication above. Never repin or overwrite V1.
await import("./prove_buy_void_verified_payment_allocation_handoff_v1.js");

const tx=c=>"0x"+c.repeat(64),address=c=>"0x"+c.repeat(40);
const ref=c=>"sha256:"+c.repeat(64);
const MICRO=1_000_000n,POOL=10_000_000n;
const BASE_USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const LAUNCH=Object.freeze({
  marker:"VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",version:1,
  coupled_launch_id:ref("a"),source_composition_id:ref("b"),
  activation_generation:tx("c"),generation_tip_sha256:ref("d"),
  activation_receipt_id:"voidbclive1_"+"e".repeat(64),
  activation_receipt_sha256:"f".repeat(64),expires_at_ms:1_900_000_000_000,
});
const current=Object.freeze({
  schema:"void_public_buy_void_request_v1",
  request_id:"buyvoid_z_aaaaaaaa",
  status:"payment_submitted_pending_manual_review",
  source_chain:"base",payment_chain:"base",
  tx_hash:tx("1"),quoted_void:"6",usdc_amount:"3",
  delivery_address:address("2"),receive_address:address("3"),
  usdc_contract:BASE_USDC,launch_authority:LAUNCH,
  created_at_ms:1_800_000_000_010,
});
const verified=Object.freeze({
  schema:"void_buy_void_verified_payment_event_v2",
  marker:"VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id:current.request_id,operator_status:"payment_verified",
  payment_verified:true,payment_identity_input_complete:true,
  marked_at_ms:1_800_000_000_020,tx_hash:current.tx_hash,
  quoted_void:current.quoted_void,
  payment_verifier:{
    chain:"base",transaction_hash:current.tx_hash,log_index:"7",
    block_number:"100",confirmations:"12",
    usdc_contract:BASE_USDC,from_address:current.delivery_address,
    receive_address:current.receive_address,
    delivery_address:current.delivery_address,
    amount_units:"3000000",requested_units:"3000000",
  },
});
const rows=list=>list.length?list.map(x=>JSON.stringify(x)).join("\n")+"\n":"";
const LEDGER="allocation-reservations-v1.jsonl";
const WATER="allocation-reservation-high-water-v1.json";
function fixture(requestRows,operatorRows=[]) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-v2-first-buyer-handoff-"));
  fs.chmodSync(root,0o700);
  const requestDir=path.join(root,"requests"),
    ledgerRoot=path.join(root,"allocation-ledger"),
    highWaterRoot=path.join(root,"allocation-high-water");
  for(const dir of [requestDir,ledgerRoot,highWaterRoot])fs.mkdirSync(dir,{mode:0o700});
  fs.writeFileSync(path.join(requestDir,"requests.jsonl"),rows(requestRows),{mode:0o600});
  fs.writeFileSync(path.join(requestDir,"operator-events.jsonl"),rows(operatorRows),{mode:0o600});
  fs.writeFileSync(path.join(ledgerRoot,LEDGER),"",{mode:0o600});
  const genesis=deriveBuyVoidAllocationReservationHighWaterV1("");
  assert.equal(genesis.ok,true);
  fs.writeFileSync(path.join(highWaterRoot,WATER),genesis.high_water_json,{mode:0o600});
  return {root,requestDir,ledgerRoot,highWaterRoot};
}
function snapshot(f){
  return [
    fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl")),
    fs.readFileSync(path.join(f.ledgerRoot,LEDGER)),
    fs.readFileSync(path.join(f.highWaterRoot,WATER)),
  ];
}
function amount(units){
  const whole=units/MICRO,f=(units%MICRO).toString().padStart(6,"0").replace(/0+$/u,"");
  return f?whole+"."+f:whole.toString();
}
function readSale(f){
  return async()=>{
    const requests=fs.readFileSync(path.join(f.requestDir,"requests.jsonl"),"utf8")
      .trim().split("\n").filter(Boolean).map(x=>JSON.parse(x));
    const quote=new Map(requests.map(r=>[String(r.request_id),BigInt(r.quoted_void)*MICRO]));
    const events=fs.readFileSync(path.join(f.requestDir,"operator-events.jsonl"),"utf8")
      .trim().split("\n").filter(Boolean).map(x=>JSON.parse(x));
    const verifiedIds=new Set(events.filter(e=>e.operator_status==="payment_verified").map(e=>String(e.request_id)));
    let reserved=0n;for(const id of verifiedIds)reserved+=quote.get(id)||0n;
    return {pool_void_total:amount(POOL*MICRO),
      allocation_reserved_void:amount(reserved),verified_void_total:amount(reserved),
      remaining_void:amount(POOL*MICRO-reserved)};
  };
}
async function invoke(f){
  return writeBuyVoidVerifiedPaymentAllocationHandoffV1({
    event:verified,request:current,
    request_dir:f.requestDir,allocation_ledger_root:f.ledgerRoot,
    allocation_high_water_root:f.highWaterRoot,
    with_launch_authority_mutation:async (_req,operation)=>operation(()=>{}),
    read_sale_state:readSale(f),
  });
}
assert.equal(VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1.runtime_integration,false);
assert.equal(VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1.production_gate_ready,false);
assert.equal(VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1.funds_movement,false);

let missingBeforeAppend=0,forgedHistoricalAllocationHeld=0;
const variants=[
  ["absent",(()=>{const {delivery_address:_unused,...rest}=current;return rest;})()],
  ["null",{...current,delivery_address:null}],
  ["empty",{...current,delivery_address:""}],
];
const donor=fixture([current]);
try {
  const accepted=await invoke(donor);
  assert.equal(accepted.payment_event_appended,true);
  const baseline=snapshot(donor);
  assert.equal(baseline[0].toString("utf8").trim().split("\n").length,1);
  assert.equal(baseline[1].toString("utf8").trim().split("\n").length,1);

  for(const [variant,first] of variants) {
    const f=fixture([first,current]);
    try {
      const before=snapshot(f);
      await assert.rejects(()=>invoke(f),/request_initial_delivery_address_missing/u,
        "missing original buyer must hold before payment append: "+variant);
      const after=snapshot(f);
      for(let i=0;i<3;i++)assert.deepEqual(after[i],before[i],
        "rejected "+variant+" request mutated durable ledger index "+i);
      missingBeforeAppend++;
    } finally {fs.rmSync(f.root,{recursive:true,force:true});}

    // A *matching* preexisting verified allocation/receipt MUST NOT turn a
    // later wallet into evidence of an original buyer. This is a replay test;
    // no new payment, allocation or high-water row may be appended.
    const prefilled=fixture([first,current],[verified]);
    try {
      fs.writeFileSync(path.join(prefilled.ledgerRoot,LEDGER),baseline[1]);
      fs.writeFileSync(path.join(prefilled.highWaterRoot,WATER),baseline[2]);
      const before=snapshot(prefilled);
      await assert.rejects(()=>invoke(prefilled),
        /request_initial_delivery_address_missing|replay_lineage_invalid/u,
        "forged matching allocation failed to lock first original buyer: "+variant);
      const after=snapshot(prefilled);
      for(let i=0;i<3;i++)assert.deepEqual(after[i],before[i],
        "rejected replay "+variant+" mutated durable ledger index "+i);
      forgedHistoricalAllocationHeld++;
    } finally {fs.rmSync(prefilled.root,{recursive:true,force:true});}
  }

  // The buyer wallet was genuinely present in the very first request; only
  // its transaction hash and receiving payment address were bound later.
  const originalLate={...current};
  delete originalLate.tx_hash;delete originalLate.receive_address;
  const legitimate=fixture([originalLate,current]);
  try {
    const out=await invoke(legitimate);
    assert.equal(out.payment_event_appended,true);
    assert.equal(out.idempotent,false);
    assert.equal(out.allocation.allocation_record_id,
      accepted.allocation.allocation_record_id,
      "late payment details changed deterministic allocation identity");
    assert.equal(out.allocation.payment_verified_event_sha256,
      accepted.allocation.payment_verified_event_sha256,
      "late payment details changed verified payment event commitment");
    assert.equal(snapshot(legitimate)[1].toString("utf8").trim().split("\n").length,1,
      "late payment detail handoff must publish exactly one allocation row");
    const replay=await invoke(legitimate);
    assert.equal(replay.payment_event_appended,false);
    assert.equal(replay.idempotent,true);
  } finally {fs.rmSync(legitimate.root,{recursive:true,force:true});}
} finally {fs.rmSync(donor.root,{recursive:true,force:true});}
assert.equal(missingBeforeAppend,3);
assert.equal(forgedHistoricalAllocationHeld,3);
console.log("VOID_BUY_VOID_VERIFIED_ALLOCATION_HANDOFF_FIRST_ORIGINAL_V4_GREEN");
console.log("frozen_first_original_v2_proof_unchanged=true");
console.log("frozen_first_original_v3_proof_unchanged=true");
console.log("original_handoff_v1_proof_blob_immutable=true");
console.log("first_original_missing_absent_null_empty_preappend_held=true");
console.log("forged_matching_allocation_replay_held=true");
console.log("valid_original_late_tx_receiver_preserves_deterministic_allocation=true");
console.log("durable_payment_event_reappend=false");
console.log("real_temp_filesystem_used=true");
console.log("runtime_integration=false");
console.log("protected_high_water_custody_proven=false");
console.log("production_gate_ready=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
