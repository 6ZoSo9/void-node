#!/usr/bin/env node
// Source-only, unprivileged private OS-temp proof. Real ledger/launch/receipt
// source readers are invoked; NO reserve/recover/payment route is mounted.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveBuyVoidAllocationReservationHighWaterV1 as derive,
  classifyBuyVoidAllocationReservationHighWaterBindingV1 as bind,
} from "../dist/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  VOID_BUY_VOID_CUSTODY_READONLY_RESERVE_PREVIEW_AUTHORITY_V1 as AUTH,
  previewBuyVoidCustodyReserveFromPrivateFilesReadOnlyV1 as preview,
} from "../src/economic/buy_void_custody_readonly_reserve_preview_v1.mjs";
import {
  observeBuyVoidCustodyPaymentLedgersReadOnlyV1 as observePayment,
} from "../src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs";
import {
  observeBuyVoidCustodyLaunchFilesReadOnlyV1 as observeLaunch,
} from "../src/economic/buy_void_custody_launch_observed_read_v1.mjs";
import {
  observeBuyVoidCustodyAllocationRootsReadOnlyV1 as observeAllocation,
} from "../src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED = Object.freeze({
  "src/economic/buy_void_custody_readonly_reserve_preview_v1.mjs":
    "c0ad4967b31e0e023d2c10c983381e203cc05789",
  "src/economic/buy_void_custody_allocation_roots_observed_read_v1.mjs":
    "1bf88a403b1012ac00edaf634c5ed237a898043c",
  "src/economic/buy_void_custody_payment_ledgers_observed_read_v1.mjs":
    "7c0a960b2dbf728b1daf0abbf5c44f55e2cd4325",
  "src/economic/buy_void_custody_launch_observed_read_v1.mjs":
    "d0dd148d6701e5e47cc8301d71a0777876560834",
  "src/economic/buy_void_custody_reserve_plan_v1.mjs":
    "c8ce5546fbe9a801161adbd7218888500ce346c9",
  "src/economic/buy_void_allocation_reservation_high_water_v1.ts":
    "9383c94cf848efb9a0112f1b741df4e10f790ac6",
});
for (const [p, sha] of Object.entries(EXPECTED)) {
  const bytes = fs.readFileSync(path.join(ROOT, p));
  const actual = crypto.createHash("sha1")
    .update(Buffer.from("blob " + bytes.length + "\0"))
    .update(bytes).digest("hex");
  assert.equal(actual, sha, "reviewed source identity " + p);
}
assert.equal(process.platform, "linux");
assert.ok(typeof process.getuid === "function" && process.getuid() > 0);
for (const [key,value] of Object.entries(AUTH)) {
  if (/^(filesystem_write|production_allocation_mutation_ready|presale_activation|funds_moved|custody_reserve_method_enabled|custody_recover_method_enabled)$/u.test(key)) {
    assert.equal(value, false, key);
  }
}
const reqId = "buyvoid_a_aaaaaaaa";
function privateDirectory(p) {
  fs.mkdirSync(p, {recursive:true, mode:0o700});
  fs.chmodSync(p,0o700);
}
function privateFile(p, bytes) {
  fs.writeFileSync(p,bytes,{mode:0o600});
  fs.chmodSync(p,0o600);
}
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),"void-custody-reserve-preview-"));
  fs.chmodSync(root,0o700);
  const request = path.join(root,"requests");
  const shared = path.join(root,"shared");
  const activation = path.join(root,"activation");
  const custody = path.join(root,"custody-launch");
  const ledger = path.join(root,"allocation-ledger");
  const high = path.join(root,"allocation-high");
  for (const dir of [request,shared,path.join(shared,"economic"),
                     activation,custody,ledger,high]) privateDirectory(dir);
  const requestRow = Buffer.from(JSON.stringify({
    request_id:reqId,source_chain:"base",quoted_void:"6",
  })+"\n");
  const verified = Buffer.from(JSON.stringify({
    request_id:reqId,operator_status:"payment_verified",
    marked_at_ms:1800000000001,
  })+"\n");
  const receipt = Buffer.from('{"synthetic_not_signed":true}\n');
  const journal = Buffer.from('{"synthetic_unactivated_generation":true}\n');
  const launchHigh = Buffer.from('{"synthetic_unverified_high_water":true}\n');
  privateFile(path.join(request,"requests.jsonl"),requestRow);
  privateFile(path.join(request,"operator-events.jsonl"),verified);
  privateFile(path.join(shared,"economic",
    "buy-void-coupled-live-generation-v1.jsonl"),journal);
  const receiptPath = path.join(activation,"receipt.json");
  const custodyPath = path.join(custody,
    "buy-void-custody-launch-high-water-v2.json");
  privateFile(receiptPath,receipt);
  privateFile(custodyPath,launchHigh);
  const allocationLedger = Buffer.alloc(0);
  const highWater = derive(allocationLedger);
  assert.equal(highWater.ok, true, "canonical empty high-water derivation");
  assert.equal(typeof highWater.high_water_json,"string");
  privateFile(path.join(ledger,"allocation-reservations-v1.jsonl"),allocationLedger);
  const allocationHighFile = path.join(high,"allocation-reservation-high-water-v1.json");
  privateFile(allocationHighFile, Buffer.from(highWater.high_water_json,"utf8"));
  return {
    root,request,shared,activation,custody,ledger,high,
    allocationHighFile,receiptPath,custodyPath,
    opts: {
      request_id:reqId,
      request_dir:request,
      shared_data_dir:shared,
      activation_receipt_absolute_path:receiptPath,
      custody_high_water_absolute_path:custodyPath,
      allocation_ledger_root:ledger,
      allocation_high_water_root:high,
    },
  };
}
function isHeld(v,reason) {
  assert.equal(v.ok,false);
  assert.equal(v.status,"held");
  if (reason) assert.equal(v.reason,reason);
  assert.equal(v.operation_performed,false);
  assert.equal(v.filesystem_write,false);
  assert.equal(v.cross_root_atomic_snapshot_proven,false);
  assert.equal(v.production_allocation_mutation_ready,false);
  assert.equal(v.presale_activation,false);
  assert.equal(v.funds_moved,false);
  assert.equal(v.would_plan_allocation,false);
  assert.equal(v.allocation_record_id,null);
}
{
  const f=fixture();
  try {
    const payment=observePayment({request_dir:f.request});
    assert.equal(payment.observed,true,payment.reason);
    const launch=observeLaunch({
      shared_data_dir:f.shared,
      activation_receipt_absolute_path:f.receiptPath,
      custody_high_water_absolute_path:f.custodyPath,
    });
    assert.equal(launch.observed,true,launch.reason);
    const allocation=observeAllocation({
      ledger_root:f.ledger,high_water_root:f.high,
    });
    assert.equal(allocation.observed,true,allocation.reason);
    const bound=bind({
      ledger_jsonl:allocation.allocation_jsonl,
      high_water_json:allocation.allocation_high_water_bytes,
    });
    assert.equal(bound.ok,true,bound.reason);
    assert.equal(bound.status,"bound");
    const before={
      requests:fs.readFileSync(path.join(f.request,"requests.jsonl")),
      operator:fs.readFileSync(path.join(f.request,"operator-events.jsonl")),
      high:fs.readFileSync(f.allocationHighFile),
    };
    const result=preview(f.opts);
    isHeld(result,"custody_signed_source_plan_held");
    assert.deepEqual(fs.readFileSync(path.join(f.request,"requests.jsonl")),before.requests);
    assert.deepEqual(fs.readFileSync(path.join(f.request,"operator-events.jsonl")),before.operator);
    assert.deepEqual(fs.readFileSync(f.allocationHighFile),before.high);
    console.log("real_payment_launch_allocation_observers_composed=true");
    console.log("canonical_allocation_high_water_binding_verified=true");
    console.log("unactivated_signed_launch_stays_HOLD=true");
  } finally {fs.rmSync(f.root,{recursive:true,force:true});}
}
{
  const f=fixture();
  try {
    fs.writeFileSync(f.allocationHighFile,Buffer.from('{"corrupt":true}\n'));
    fs.chmodSync(f.allocationHighFile,0o600);
    isHeld(preview(f.opts),"allocation_ledger_high_water_binding_held");
    fs.unlinkSync(f.receiptPath);
    isHeld(preview(f.opts),"launch_evidence_observation_held");
    console.log("mismatched_allocation_high_water_stays_HOLD=true");
    console.log("missing_launch_receipt_stays_HOLD=true");
  } finally {fs.rmSync(f.root,{recursive:true,force:true});}
}
{
  const f=fixture();
  try {
    let callbacks=0;
    const getter={...f.opts};
    Object.defineProperty(getter,"request_id",{
      enumerable:true,
      get(){callbacks++;return reqId;},
    });
    isHeld(preview(getter),"config_unqualified");
    const proxy=new Proxy(f.opts,{
      ownKeys(){callbacks++;throw new Error("proxy_executed");},
      getPrototypeOf(){callbacks++;throw new Error("proxy_executed");},
    });
    isHeld(preview(proxy),"config_unqualified");
    assert.equal(callbacks,0);
    isHeld(preview({...f.opts,payment_verified:true}),"config_unqualified");
    isHeld(preview({...f.opts,now_ms:1800000000000}),"config_unqualified");
    isHeld(preview({...f.opts,request_id:"../../escape"}),"config_unqualified");
    console.log("caller_green_flags_clock_proxies_accessors_rejected=true");
  } finally {fs.rmSync(f.root,{recursive:true,force:true});}
}
console.log("cross_root_atomic_snapshot_proven=false");
console.log("remote_authenticated_custody_ipc=false");
console.log("custody_reserve_method_enabled=false");
console.log("custody_recover_method_enabled=false");
console.log("production_allocation_mutation_ready=false");
console.log("funds_moved=false");
console.log("VOID_BUY_VOID_CUSTODY_READONLY_RESERVE_PREVIEW_V1_GREEN");
