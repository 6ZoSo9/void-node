import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  testOnlyReadStrictCapacityCensusV1,
  writeBuyVoidOperatorEventWithCapacityAdmissionV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const EXPECTED_WRITER_BLOB="76b1caa3cac0744e7e1b0e253dd6c9b08757af79";
const source=fs.readFileSync(path.join(ROOT,"src/economic/buy_void_verified_payment_capacity_admission_v1.ts"));
const blob=crypto.createHash("sha1")
  .update(Buffer.from("blob "+source.length+"\0","utf8")).update(source).digest("hex");
assert.equal(blob,EXPECTED_WRITER_BLOB,"exact reviewed writer source drift");
const text=source.toString("utf8");
const writer=text.slice(text.indexOf("export async function writeBuyVoidOperatorEventWithCapacityAdmissionV1"));
assert.ok(writer.includes("buy_void_operator_event_capacity_status_noncanonical"));
assert.ok(writer.includes("const canonicalOperatorEvent ="));
assert.ok(writer.includes("const operatorEventLine = canonicalOperatorEvent.line"));
assert.ok(writer.indexOf('fail("buy_void_operator_event_capacity_status_noncanonical")') <
  writer.indexOf("fs.mkdirSync(requestDir"),"status admission must precede filesystem mutation");
assert.equal(writer.includes('JSON.stringify(event) + "\\n"'),false,
  "legacy writer must append the detached snapshot bytes, not reserialize caller event");
assert.ok(text.includes("buy_void_verified_payment_capacity_operator_status_noncanonical"));
assert.equal(text.includes('String(row.operator_status || "").trim() === "payment_verified"'),false,
  "historical sidecar must not promote noncanonical status");

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-operator-status-identity-"));
const REQUEST_ID="buyvoid_a_aaaaaaaa";
const makeReq=()=>({
  request_id:REQUEST_ID,source_chain:"base",quoted_void:"2",
});
const noopLaunch=async()=>{assert.fail("invalid-status path must never invoke launch");};
const noopSale=async()=>{assert.fail("invalid-status path must never read sale state");};
try {
  // Invalid legacy status must not even CREATE the request root, much less
  // append a misleading payment event or a sidecar file.
  let index=0;
  for(const status of [
    "payment_verified ",
    "\tpayment_verified\n",
    "PAYMENT_VERIFIED",
    "Payment_verified",
    " reviewed",
    "reviewed ",
    "unknown",
    "",
    1,
    {toString(){return "reviewed";},toJSON(){return "payment_verified";}},
  ]) {
    const root=path.join(temp,"absent-request-root-"+String(index++));
    await assert.rejects(
      () => writeBuyVoidOperatorEventWithCapacityAdmissionV1({
        event:{request_id:REQUEST_ID,operator_status:status,marked_at_ms:123},
        request:makeReq(),request_dir:root,
        with_launch_authority_mutation:noopLaunch,
        read_sale_state:noopSale,
      }),
      /buy_void_operator_event_capacity_status_noncanonical/u,
      "unreviewed operator status reached a writer: "+String(status),
    );
    assert.equal(fs.existsSync(root),false,"invalid status mutated filesystem");
  }

  // A stateful status getter previously returned "reviewed" to the routing
  // check, then "payment_verified" during JSON.stringify(), causing an
  // unprotected nonpayment append that recount later treated as paid. The
  // writer must serialize once, route from that detached snapshot, and append
  // those exact same bytes without a second getter read.
  const statefulRoot=path.join(temp,"stateful-status-root");
  let statusReads=0;
  const statefulEvent:any={
    request_id:REQUEST_ID,
    marked_at_ms:124,
  };
  Object.defineProperty(statefulEvent,"operator_status",{
    enumerable:true,
    get(){
      statusReads+=1;
      return statusReads===1 ? "reviewed" : "payment_verified";
    },
  });
  const statefulResult=await writeBuyVoidOperatorEventWithCapacityAdmissionV1({
    event:statefulEvent,
    request:makeReq(),
    request_dir:statefulRoot,
    with_launch_authority_mutation:noopLaunch,
    read_sale_state:noopSale,
  });
  assert.equal(statefulResult.ok,true);
  assert.equal(statusReads,1,"caller status getter was re-read after snapshot");
  const statefulRows=fs.readFileSync(
    path.join(statefulRoot,"operator-events.jsonl"),"utf8",
  ).trimEnd().split("\n").map((line)=>JSON.parse(line));
  assert.equal(statefulRows.length,1);
  assert.equal(statefulRows[0].operator_status,"reviewed");

  // A top-level toJSON can also contradict the visible caller object. Routing
  // authority must follow the serialized snapshot. If toJSON serializes an
  // exact payment_verified event, the call must enter the protected payment
  // path rather than succeed through the legacy nonpayment append.
  const toJsonRoot=path.join(temp,"top-level-tojson-root");
  const toJsonEvent:any={
    request_id:REQUEST_ID,
    operator_status:"reviewed",
    marked_at_ms:125,
    toJSON(){
      return {
        request_id:REQUEST_ID,
        operator_status:"payment_verified",
        marked_at_ms:125,
        quoted_void:"2",
        payment_verifier:{chain:"base"},
      };
    },
  };
  await assert.rejects(
    ()=>writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event:toJsonEvent,
      request:makeReq(),
      request_dir:toJsonRoot,
      with_launch_authority_mutation:noopLaunch,
      read_sale_state:noopSale,
    }),
    /buy_void_verified_payment_capacity_/u,
    "top-level toJSON payment alias escaped protected payment path",
  );
  assert.equal(
    fs.existsSync(path.join(toJsonRoot,"operator-events.jsonl")),
    false,
    "top-level toJSON payment alias reached legacy nonpayment append",
  );

  // Exercise the ACTUAL descriptor-bound capacity census on synthetic
  // private JSONL files; no RPC, signer, live ledger or wallet is involved.
  const ledger=path.join(temp,"capacity-only");
  fs.mkdirSync(ledger,{mode:0o700});
  const reqFile=path.join(ledger,"requests.jsonl");
  const eventFile=path.join(ledger,"operator-events.jsonl");
  fs.writeFileSync(reqFile,JSON.stringify(makeReq())+"\n",{mode:0o600});
  function statusCensus(status:unknown) {
    fs.writeFileSync(eventFile,JSON.stringify({
      request_id:REQUEST_ID,operator_status:status,
      quoted_void:"2",
    })+"\n",{mode:0o600});
    return testOnlyReadStrictCapacityCensusV1(ledger,10000000n,()=>{});
  }
  for(const malformed of [
    "payment_verified ",
    "\tpayment_verified\n",
    "reviewed ",
    12,
  ]) {
    assert.throws(
      ()=>statusCensus(malformed),
      /buy_void_verified_payment_capacity_operator_status_noncanonical/u,
      "recount accepted status alias: "+String(malformed),
    );
  }
  const reviewed=statusCensus("reviewed");
  assert.equal(reviewed.verified_ids.size,0);
  assert.equal(reviewed.verified_void_micro,0n);
  const paid=statusCensus("payment_verified");
  assert.equal(paid.verified_ids.size,1);
  assert.equal(paid.verified_ids.has(REQUEST_ID),true);
  assert.equal(paid.verified_void_micro,2000000n);
  const rejected=statusCensus("rejected");
  assert.equal(rejected.verified_ids.size,0);

  console.log("VOID_BUY_VOID_LEGACY_OPERATOR_STATUS_EXACT_IDENTITY_V1_GREEN");
  console.log("historical_writer_source_sha1="+EXPECTED_WRITER_BLOB);
  console.log("malformed_status_rejected_before_any_fs_mutation=true");
  console.log("computed_status_object_toJSON_alias_rejected=true");
  console.log("stateful_status_getter_single_snapshot=true");
  console.log("top_level_toJSON_payment_alias_protected=true");
  console.log("legacy_recount_rejects_trimmed_verified_alias=true");
  console.log("canonical_reviewed_and_rejected_still_nonpayment=true");
  console.log("canonical_verified_capacity_recount_preserved=true");
  console.log("private_synthetic_temp_only=true");
  console.log("production_route_mounted=false");
  console.log("custody_service_composed=false");
  console.log("deployed_artifact_generation_verified=false");
  console.log("presale_activation=false");
  console.log("funds_moved=false");
} finally {
  fs.rmSync(temp,{recursive:true,force:true});
}
