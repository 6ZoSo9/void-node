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
const EXPECTED_WRITER_BLOB="b5d0a66b9cf416691c60801406a2e376cf649c79";
const source=fs.readFileSync(path.join(ROOT,"src/economic/buy_void_verified_payment_capacity_admission_v1.ts"));
const blob=crypto.createHash("sha1")
  .update(Buffer.from("blob "+source.length+"\0","utf8")).update(source).digest("hex");
assert.equal(blob,EXPECTED_WRITER_BLOB,"exact reviewed writer source drift");
const text=source.toString("utf8");
const writer=text.slice(text.indexOf("export async function writeBuyVoidOperatorEventWithCapacityAdmissionV1"));
assert.ok(writer.includes("buy_void_operator_event_capacity_status_noncanonical"));
assert.ok(writer.includes('Object.getOwnPropertyDescriptor(event, "operator_status")'));
assert.ok(writer.includes('Object.getOwnPropertyDescriptor(event, "toJSON")'));
assert.ok(writer.includes("const canonicalOperatorEvent ="));
assert.ok(writer.includes("const operatorEventLine = canonicalOperatorEvent.line"));
assert.ok(writer.includes("buy_void_operator_event_capacity_status_changed_during_snapshot"));
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

  // A status accessor must be rejected from its descriptor without invoking
  // the getter. This prevents routing authority from being a stateful callback.
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
  await assert.rejects(
    ()=>writeBuyVoidOperatorEventWithCapacityAdmissionV1({
      event:statefulEvent,
      request:makeReq(),
      request_dir:statefulRoot,
      with_launch_authority_mutation:noopLaunch,
      read_sale_state:noopSale,
    }),
    /buy_void_operator_event_capacity_status_noncanonical/u,
  );
  assert.equal(statusReads,0,"status getter executed during admission");
  assert.equal(fs.existsSync(statefulRoot),false,
    "status accessor mutated filesystem");

  // A top-level toJSON is executable serialization authority and must be
  // rejected before invocation, even if it would synthesize a canonical
  // payment_verified row.
  const toJsonRoot=path.join(temp,"top-level-tojson-root");
  let toJsonCalls=0;
  const toJsonEvent:any={
    request_id:REQUEST_ID,
    operator_status:"reviewed",
    marked_at_ms:125,
    toJSON(){
      toJsonCalls+=1;
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
    /buy_void_operator_event_capacity_status_noncanonical/u,
  );
  assert.equal(toJsonCalls,0,"event toJSON executed during admission");
  assert.equal(fs.existsSync(toJsonRoot),false,
    "top-level toJSON event mutated filesystem");

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
  console.log("stateful_status_getter_rejected_without_invocation=true");
  console.log("top_level_toJSON_rejected_without_invocation=true");
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
