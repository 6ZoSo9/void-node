#!/usr/bin/env node
// Inert source-only, real OS-temp payment/allocation handoff proof on BOTH
// supported native-USDC rails. No RPC, credentials, private ledger or funds.
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
const PINS=Object.freeze({
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts":"f591f7407d9afc2cf77e0f90923aa11b4817fd4e",
  "src/economic/buy_void_verified_allocation_replay_binding_v1.ts":"0a74a3652081c3e142d0b887676771a7ac148f32",
  "src/economic/buy_void_allocation_reservation_ledger_v1.ts":"c3fc204710a9189723651cfeb6ffc52b1aa049db",
  "src/economic/buy_void_allocation_reservation_high_water_v1.ts":"9383c94cf848efb9a0112f1b741df4e10f790ac6",
  "scripts/prove_buy_void_verified_payment_allocation_handoff_first_original_v2.ts":"9fb39172afa09e49c11d72ff376e9af2d99a4101",
  "scripts/prove_buy_void_verified_payment_allocation_handoff_v1.ts":"6d6a8b0efee8bc2d4e7f402bf7bd4b9e4ed4ac3a",
});
function gitBlob(bytes){return crypto.createHash("sha1")
 .update(Buffer.from("blob "+bytes.length+"\0","utf8")).update(bytes).digest("hex");}
for(const [rel,expected] of Object.entries(PINS)){
  const buf=fs.readFileSync(path.join(ROOT,rel));
  assert.ok(buf.length>0&&buf.length<1_000_000,"source bound:"+rel);
  assert.equal(gitBlob(buf),expected,"reviewed source changed:"+rel);
}
const tx=c=>"0x"+c.repeat(64),address=c=>"0x"+c.repeat(40);
const shaRef=c=>"sha256:"+c.repeat(64);
const USDC=Object.freeze({
  base:"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  ethereum:"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
});
const POOL=10_000_000n,MICRO=1_000_000n;
const LAUNCH=Object.freeze({
  marker:"VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",version:1,
  coupled_launch_id:shaRef("a"),source_composition_id:shaRef("b"),
  activation_generation:tx("c"),generation_tip_sha256:shaRef("d"),
  activation_receipt_id:"voidbclive1_"+"e".repeat(64),
  activation_receipt_sha256:"f".repeat(64),expires_at_ms:1_900_000_000_000,
});
const SAME_TX=tx("1");
function request(chain,id,delivery,receiver){
  return {schema:"void_public_buy_void_request_v1",request_id:id,
    status:"payment_submitted_pending_manual_review",
    source_chain:chain,payment_chain:chain,tx_hash:SAME_TX,
    quoted_void:"6",usdc_amount:"3",delivery_address:delivery,
    receive_address:receiver,usdc_contract:USDC[chain],
    launch_authority:LAUNCH,created_at_ms:1_800_000_000_010};
}
const BASE=request("base","buyvoid_z_aaaaaaaa",address("2"),address("3"));
const ETH=request("ethereum","buyvoid_y_bbbbbbbb",address("4"),address("5"));
function verified(r){
  return {schema:"void_buy_void_verified_payment_event_v2",
    marker:"VOID_BUY_VOID_VERIFIED_PAYMENT_V2",request_id:r.request_id,
    operator_status:"payment_verified",payment_verified:true,
    payment_identity_input_complete:true,marked_at_ms:1_800_000_000_020,
    tx_hash:r.tx_hash,quoted_void:r.quoted_void,
    payment_verifier:{chain:r.source_chain,transaction_hash:r.tx_hash,
      log_index:"7",block_number:"100",confirmations:"12",
      usdc_contract:r.usdc_contract,from_address:r.delivery_address,
      receive_address:r.receive_address,delivery_address:r.delivery_address,
      amount_units:"3000000",requested_units:"3000000"}};
}
const rows=xs=>xs.length?xs.map(JSON.stringify).join("\n")+"\n":"";
const EVENT="operator-events.jsonl",REQUEST="requests.jsonl";
const LEDGER="allocation-reservations-v1.jsonl",WATER="allocation-reservation-high-water-v1.json";
function fixture(req,events=[]){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"void-dual-rail-original-handoff-v2-"));
  fs.chmodSync(root,0o700);
  const requestDir=path.join(root,"request"),ledgerRoot=path.join(root,"allocation"),
    highWaterRoot=path.join(root,"high-water");
  for(const dir of [requestDir,ledgerRoot,highWaterRoot])fs.mkdirSync(dir,{mode:0o700});
  fs.writeFileSync(path.join(requestDir,REQUEST),rows(req),{mode:0o600});
  fs.writeFileSync(path.join(requestDir,EVENT),rows(events),{mode:0o600});
  fs.writeFileSync(path.join(ledgerRoot,LEDGER),"",{mode:0o600});
  const genesis=deriveBuyVoidAllocationReservationHighWaterV1("");
  assert.equal(genesis.ok,true);
  fs.writeFileSync(path.join(highWaterRoot,WATER),genesis.high_water_json,{mode:0o600});
  return {root,requestDir,ledgerRoot,highWaterRoot};
}
function snapshot(f){
  return [fs.readFileSync(path.join(f.requestDir,REQUEST)),
    fs.readFileSync(path.join(f.requestDir,EVENT)),
    fs.readFileSync(path.join(f.ledgerRoot,LEDGER)),
    fs.readFileSync(path.join(f.highWaterRoot,WATER))];
}
function unchanged(a,b,label){assert.equal(a.length,b.length,label);
  for(let i=0;i<a.length;i++)assert.deepEqual(a[i],b[i],label+":file-"+i);}
function decimal(units){
  const full=units/MICRO,f=(units%MICRO).toString().padStart(6,"0").replace(/0+$/u,"");
  return f?full+"."+f:full.toString();
}
async function saleState(f){
  const req=fs.readFileSync(path.join(f.requestDir,REQUEST),"utf8")
    .trim().split("\n").filter(Boolean).map(JSON.parse);
  const quote=new Map(req.map(r=>[String(r.request_id),BigInt(r.quoted_void)*MICRO]));
  const event=fs.readFileSync(path.join(f.requestDir,EVENT),"utf8")
    .trim().split("\n").filter(Boolean).map(JSON.parse);
  const verifiedIds=new Set(event.filter(e=>e.operator_status==="payment_verified")
    .map(e=>String(e.request_id)));
  let reserved=0n;for(const id of verifiedIds)reserved+=quote.get(id)||0n;
  return {pool_void_total:decimal(POOL*MICRO),
    allocation_reserved_void:decimal(reserved),verified_void_total:decimal(reserved),
    remaining_void:decimal(POOL*MICRO-reserved)};
}
let authorityCalls=0;
async function handoff(f,r){
  return writeBuyVoidVerifiedPaymentAllocationHandoffV1({
    event:verified(r),request:r,request_dir:f.requestDir,
    allocation_ledger_root:f.ledgerRoot,
    allocation_high_water_root:f.highWaterRoot,
    with_launch_authority_mutation:async (_req,operation)=>
      operation(()=>{authorityCalls++;}),
    read_sale_state:()=>saleState(f),
  });
}
function count(file){const s=fs.readFileSync(file,"utf8").trim();
  return s?s.split("\n").length:0;}
assert.equal(VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1.runtime_integration,false);
assert.equal(VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1.production_gate_ready,false);
assert.equal(VOID_BUY_VOID_VERIFIED_PAYMENT_ALLOCATION_HANDOFF_AUTHORITY_V1.funds_movement,false);

let accepted=0,replays=0,missing=0,chainHolds=0,nonnative=0,late=0;
const both=fixture([BASE,ETH]);
try {
  const one=await handoff(both,BASE);accepted++;
  assert.equal(one.payment_event_appended,true);
  const two=await handoff(both,ETH);accepted++;
  assert.equal(two.payment_event_appended,true);
  assert.notEqual(one.allocation.allocation_record_id,two.allocation.allocation_record_id);
  assert.equal(one.allocation.canonical_payment_identity,"voidpay1:base:"+SAME_TX+":7");
  assert.equal(two.allocation.canonical_payment_identity,"voidpay1:ethereum:"+SAME_TX+":7");
  assert.equal(count(path.join(both.requestDir,EVENT)),2);
  assert.equal(count(path.join(both.ledgerRoot,LEDGER)),2);
  const before=snapshot(both);
  for(const r of [BASE,ETH]){
    const response=await handoff(both,r);
    assert.equal(response.payment_event_appended,false);
    assert.equal(response.idempotent,true);
    replays++;
  }
  unchanged(snapshot(both),before,"cross-rail idempotent replay");
} finally {fs.rmSync(both.root,{recursive:true,force:true});}

for(const [label,initial] of [
  ["absent",(()=>{const {delivery_address:unused,...other}=ETH;void unused;return other;})()],
  ["null",{...ETH,delivery_address:null}],
  ["empty",{...ETH,delivery_address:""}],
]){
  const f=fixture([initial,ETH]);
  try {
    const before=snapshot(f);
    await assert.rejects(()=>handoff(f,ETH),/request_initial_delivery_address_missing/u,
      "original Ethereum buyer missing:"+label);
    unchanged(snapshot(f),before,"missing Ethereum buyer "+label);
    missing++;
  } finally {fs.rmSync(f.root,{recursive:true,force:true});}
}
for(const [label,initial] of [
  ["source", {...ETH,source_chain:"base"}],
  ["alias",{...ETH,payment_chain:"base"}],
]){
  const f=fixture([initial,ETH]);
  try {
    const before=snapshot(f);
    await assert.rejects(()=>handoff(f,ETH),
      /request_history_lineage_drift|request_source_chain_alias_mismatch/u,
      "cross-rail original history:"+label);
    unchanged(snapshot(f),before,"cross chain lineage "+label);
    chainHolds++;
  } finally {fs.rmSync(f.root,{recursive:true,force:true});}
}
{
  const f=fixture([{...ETH,usdc_contract:USDC.base}]);
  try {
    const before=snapshot(f);
    await assert.rejects(()=>handoff(f,ETH),
      /verified_event_request_non_native_usdc_contract|verified_event_usdc_contract_mismatch/u);
    unchanged(snapshot(f),before,"Ethereum native USDC");
    nonnative++;
  } finally {fs.rmSync(f.root,{recursive:true,force:true});}
}
{
  const original={...ETH};delete original.tx_hash;delete original.receive_address;
  const f=fixture([original,ETH]);
  try {
    const result=await handoff(f,ETH);
    assert.equal(result.payment_event_appended,true);
    assert.equal(result.allocation.canonical_payment_identity,
      "voidpay1:ethereum:"+SAME_TX+":7");
    const before=snapshot(f);
    const repeat=await handoff(f,ETH);
    assert.equal(repeat.payment_event_appended,false);
    assert.equal(repeat.idempotent,true);
    unchanged(snapshot(f),before,"Ethereum late tx/receiver replay");
    late++;
  } finally {fs.rmSync(f.root,{recursive:true,force:true});}
}
assert.equal(accepted,2);assert.equal(replays,2);assert.equal(missing,3);
assert.equal(chainHolds,2);assert.equal(nonnative,1);assert.equal(late,1);
assert.ok(authorityCalls>0);
console.log("VOID_BUY_VOID_FIRST_ORIGINAL_DUAL_RAIL_REAL_HANDOFF_V2_GREEN");
console.log("both_native_usdc_rails_admitted=2");
console.log("same_tx_log_cross_rail_payment_identities_distinct=true");
console.log("verified_payment_and_allocation_rows_exact=2");
console.log("idempotent_cross_rail_replays=2");
console.log("ethereum_first_original_missing_wallet_holds=3");
console.log("ethereum_cross_chain_original_history_holds=2");
console.log("ethereum_non_native_usdc_original_holds=1");
console.log("ethereum_valid_original_late_tx_receiver_positive=1");
console.log("failed_cases_durable_payment_allocation_high_water_mutated=false");
console.log("real_temp_filesystem_used=true");
console.log("actual_live_provider_finality_verified=false");
console.log("runtime_integration=false");
console.log("protected_high_water_custody_proven=false");
console.log("production_gate_ready=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
