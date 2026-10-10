#!/usr/bin/env node
import assert from "node:assert/strict";
import { classifyBuyVoidAllocationReservationLedgerV1,
  planBuyVoidAllocationReservationV1 } from
  "../dist/economic/buy_void_allocation_reservation_ledger_v1.js";

// Everything in this proof is synthetic: no real ledger, service, wallet,
// key, payment, signer, transaction or allocation mutation.
const sha = hex => "sha256:" + hex.repeat(64);
const base = {
  ledger_jsonl: "",
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  payment_transaction_hash: "0x" + "a".repeat(64),
  payment_log_index: 7,
  launch_authority: {
    marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    version: 1,
    coupled_launch_id: sha("a"),
    source_composition_id: sha("b"),
    activation_generation: "0x" + "c".repeat(64),
    generation_tip_sha256: sha("d"),
    activation_receipt_id: "voidbclive1_" + "e".repeat(64),
    activation_receipt_sha256: "f".repeat(64),
    expires_at_ms: 1_800_000_300_000,
  },
  buyer_delivery_wallet: "0x" + "1".repeat(40),
  quote_void_amount: "6",
  quote_usdc_amount: "3",
  pool_void_total: "10000000",
  verified_payment_receipt_ref: sha("1"),
  payment_verified_event_sha256: sha("0"),
  duplicate_payment_guard_result: sha("2"),
  inventory_allocation_guard_result: sha("3"),
  operator_activation_record_ref: sha("4"),
  created_at_ms: 1_800_000_000_000,
  verified_payment_gate_green: true,
  duplicate_payment_guard_green: true,
  inventory_allocation_guard_green: true,
  operator_activation_record_green: true,
};
const first = planBuyVoidAllocationReservationV1(base);
assert.equal(first.ok,true,"initial synthetic reservation must be plannable");
assert.equal(first.status,"planned");
const originalText=first.next_ledger_jsonl;
const originalBytes=Buffer.from(originalText,"utf8");
assert.ok(originalBytes.byteLength>0);
const baseline=classifyBuyVoidAllocationReservationLedgerV1(originalBytes);
assert.equal(baseline.ok,true);
assert.equal(baseline.record_count,1);
assert.equal(baseline.reserved_void_total,"6");
const second={
  ...base,
  ledger_jsonl:originalBytes,
  request_id:"buyvoid_b_bbbbbbbb",
  payment_transaction_hash:"0x"+"b".repeat(64),
  payment_log_index:8,
  buyer_delivery_wallet:"0x"+"2".repeat(40),
  created_at_ms:base.created_at_ms+1000,
};
const normalNext=planBuyVoidAllocationReservationV1(second);
assert.equal(normalNext.ok,true);
assert.equal(normalNext.status,"planned");
assert.equal(normalNext.next_record_count,2);
assert.ok(normalNext.next_ledger_jsonl.startsWith(originalText));

const invalidNonempty=Buffer.from("NOT_A_CANONICAL_ALLOCATION_LEDGER\n");
assert.equal(classifyBuyVoidAllocationReservationLedgerV1(invalidNonempty).ok,false);
const malformed=Buffer.from([0xc3,0x28,0x0a]);
const utf8=classifyBuyVoidAllocationReservationLedgerV1(malformed);
assert.equal(utf8.ok,false);
assert.equal(utf8.reason,"allocation_reservation_ledger_utf8_invalid");
for (const [input,reason] of [
  [Buffer.from("{}"),"allocation_reservation_ledger_missing_final_newline"],
  [Buffer.from("\n"),"allocation_reservation_ledger_lines_invalid"],
  [Buffer.from("{}\r\n"),"allocation_reservation_ledger_lines_invalid"],
]) {
  const output=classifyBuyVoidAllocationReservationLedgerV1(input);
  assert.equal(output.ok,false);
  assert.equal(output.reason,reason);
}

const saved={
  buffer:Object.getOwnPropertyDescriptor(Buffer.prototype,"toString"),
  slice:Object.getOwnPropertyDescriptor(String.prototype,"slice"),
  split:Object.getOwnPropertyDescriptor(String.prototype,"split"),
  endsWith:Object.getOwnPropertyDescriptor(String.prototype,"endsWith"),
};
const calls={buffer:0,slice:0,split:0,endsWith:0};
let observed;
const poison=(object,name,callback)=>
  Object.defineProperty(object,name,{configurable:true,writable:true,value:callback});
try {
  // A former implementation returned a forged valid empty ledger from
  // nonempty bytes because the inherited Buffer.toString returned "".
  poison(Buffer.prototype,"toString",function() {
    calls.buffer += 1; return "";
  });
  // Old JSONL framing similarly delegated authority to ambient methods.
  poison(String.prototype,"slice",function() {
    calls.slice += 1; return "";
  });
  poison(String.prototype,"split",function() {
    calls.split += 1; return [];
  });
  poison(String.prototype,"endsWith",function() {
    calls.endsWith += 1; return false;
  });
  const viewed=classifyBuyVoidAllocationReservationLedgerV1(originalBytes);
  const invalid=classifyBuyVoidAllocationReservationLedgerV1(invalidNonempty);
  const missing=classifyBuyVoidAllocationReservationLedgerV1(Buffer.from("notjson\n"));
  const retry=planBuyVoidAllocationReservationV1({...base,ledger_jsonl:originalBytes});
  const appended=planBuyVoidAllocationReservationV1(second);
  observed={viewed,invalid,missing,retry,appended};
} finally {
  for(const [name,proto,old] of [
    ["toString",Buffer.prototype,saved.buffer],
    ["slice",String.prototype,saved.slice],
    ["split",String.prototype,saved.split],
    ["endsWith",String.prototype,saved.endsWith],
  ]) {
    if(old) Object.defineProperty(proto,name,old);
    else delete proto[name];
  }
}
assert.equal(observed.viewed.ok,true);
assert.equal(observed.viewed.record_count,1);
assert.equal(observed.viewed.tip_hash,baseline.tip_hash);
assert.equal(observed.invalid.ok,false);
assert.equal(observed.missing.ok,false);
assert.equal(observed.retry.ok,true);
assert.equal(observed.retry.status,"idempotent");
assert.equal(observed.retry.next_record_count,1);
assert.equal(observed.retry.next_ledger_jsonl,originalText);
assert.equal(observed.appended.ok,true);
assert.equal(observed.appended.status,"planned");
assert.equal(observed.appended.next_record_count,2);
assert.equal(observed.appended.next_ledger_jsonl,normalNext.next_ledger_jsonl);
assert.ok(observed.appended.next_ledger_jsonl.startsWith(originalText));
assert.equal(calls.buffer,0,"never consult inherited Buffer.toString");
assert.equal(calls.slice,0,"never consult inherited String.slice in ledger path");
assert.equal(calls.split,0,"never consult inherited String.split in ledger path");
assert.equal(calls.endsWith,0,"never consult inherited String.endsWith in ledger path");

console.log("VOID_BUY_VOID_ALLOCATION_RAW_JSONL_PROTOTYPE_BOUNDARY_V1_GREEN");
console.log("nonempty_buffer_never_looks_empty=true");
console.log("buffer_inherited_toString_invocations=0");
console.log("string_inherited_framing_invocations=0");
console.log("original_reservation_hash_preserved=true");
console.log("idempotent_retry_preserves_full_history=true");
console.log("new_plan_preserves_first_full_history=true");
console.log("invalid_json_and_utf8_hold=true");
console.log("real_ledger_or_wallet_access=false");
console.log("payment_or_allocation_append_performed=false");
console.log("presale_activation=false");
console.log("funds_moved=false");
