#!/usr/bin/env node
// Source-only, in-memory model of pre-append buyer/lineage qualification.
// This does not call the real payment writer or touch a customer/host ledger.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  classifyBuyVoidVerifiedAllocationReplayBindingV1,
} from "../dist/economic/buy_void_verified_allocation_replay_binding_v1.js";

const REQUEST_ID = "buyvoid_a_aaaaaaaa"; // valid 8-hex suffix, unlike hhhhhhhh
const ADDRESS = "0x" + "2".repeat(40);
const OTHER_ADDRESS = "0x" + "9".repeat(40);
const RECEIVE = "0x" + "3".repeat(40);
const NATIVE_BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const TX = "0x" + "1".repeat(64);
const EVENT_TIME = 1800000000020;
const SOURCE_PARENT = "b2571e8ee9c352bd9b78ce8f0c87f2487e3f8ded";
const SOURCE_REPLAY_GIT_BLOB = "feb1f0e3fea1ff07406cd3b8fcd315c48338596f";
const SOURCE_HANDOFF_GIT_BLOB = "3e16948a1f98bc42ccfa6c688780ef6ce8620800";
const LAUNCH_KEYS = Object.freeze([
  "activation_generation", "activation_receipt_id", "activation_receipt_sha256",
  "coupled_launch_id", "expires_at_ms", "generation_tip_sha256",
  "marker", "source_composition_id", "version",
]);
const launch = Object.freeze({
  marker:"VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
  version:1, coupled_launch_id:"sha256:"+"a".repeat(64),
  source_composition_id:"sha256:"+"b".repeat(64),
  activation_generation:"0x"+"c".repeat(64),
  generation_tip_sha256:"sha256:"+"d".repeat(64),
  activation_receipt_id:"voidbclive1_"+"e".repeat(64),
  activation_receipt_sha256:"f".repeat(64),
  expires_at_ms:1900000000000,
});
const durable = Object.freeze({
  schema:"void_public_buy_void_request_v1",
  request_id:REQUEST_ID,
  status:"payment_submitted_pending_manual_review",
  source_chain:"base", payment_chain:"base",
  tx_hash:TX, quoted_void:"6", usdc_amount:"3",
  delivery_address:ADDRESS, receive_address:RECEIVE,
  usdc_contract:NATIVE_BASE_USDC, launch_authority:launch,
  created_at_ms:EVENT_TIME-10,
});
const canonicalEvent = Object.freeze({
  schema:"void_buy_void_verified_payment_event_v2",
  marker:"VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
  request_id:REQUEST_ID, operator_status:"payment_verified",
  payment_verified:true, payment_identity_input_complete:true,
  marked_at_ms:EVENT_TIME,
  tx_hash:TX, quoted_void:"6",
  payment_verifier:{
    chain:"base", transaction_hash:TX, log_index:"7",
    block_number:"100", confirmations:"12",
    usdc_contract:NATIVE_BASE_USDC,
    from_address:ADDRESS, delivery_address:ADDRESS, receive_address:RECEIVE,
    amount_units:"3000000", requested_units:"3000000",
  },
});
const EXPECTED_SHA = event =>
  "sha256:"+crypto.createHash("sha256")
    .update(Buffer.from(JSON.stringify(event)+"\n","utf8")).digest("hex");
const jsonl = (...records) =>
  Buffer.from(records.map(x=>JSON.stringify(x)+"\n").join(""),"utf8");
const address = x => typeof x==="string" ? x.trim().toLowerCase() : "";
const micro = raw => {
  if(typeof raw!=="string" && typeof raw!=="number")return null;
  const match=/^(0|[1-9][0-9]*)(?:\.([0-9]{1,6}))?$/u.exec(String(raw));
  if(!match)return null;
  return BigInt(match[1])*1000000n+
    BigInt((match[2]||"").padEnd(6,"0")||"0");
};
const sameLaunch = (candidate, original) =>
  candidate && original &&
  LAUNCH_KEYS.every(k=>candidate[k]===original[k]);
const held = (reason, strictReason=null) => Object.freeze({
  ready:false, reason, replay_reason:strictReason,
  append_allowed:false, fsync_or_sidecar_performed:false,
});
// This is a REFERENCE qualification model, not a replacement writer.
// "verified_allocation_missing" is the expected positive result for a
// fully qualified verified event which has NOT yet been appended or allocated.
function qualifyNewVerifiedPaymentInMemory({
  candidateRequest,event,originalRequests,priorEvents,allocation,
}) {
  const proposed=Buffer.concat([priorEvents,jsonl(event)]);
  const classified=classifyBuyVoidVerifiedAllocationReplayBindingV1({
    request_id:event.request_id,
    requests_jsonl:originalRequests,
    operator_events_jsonl:proposed,
    allocation_jsonl:allocation,
  });
  if(classified.status!=="verified_allocation_missing" ||
     classified.payment_verified_event_sha256!==EXPECTED_SHA(event) ||
     classified.request_id!==event.request_id) {
    return held("strict_hypothetical_replay_held",classified.reason);
  }

  // The strict existing replay classifier binds event to the full immutable
  // original request lineage. It does not compare the separate caller-supplied
  // request argument used by the allocation planner. That is a second gate.
  const requests=originalRequests.toString("utf8").trimEnd().split("\n")
    .filter(Boolean).map(JSON.parse).filter(r=>r.request_id===event.request_id);
  const last=requests.at(-1);
  if(!last || candidateRequest?.request_id!==event.request_id)
    return held("caller_request_id_not_original");
  for(const key of [
    "source_chain","payment_chain","tx_hash","delivery_address",
    "receive_address","usdc_contract",
  ]) {
    if(address(candidateRequest[key])!==address(last[key]))
      return held("caller_original_"+key+"_mismatch");
  }
  for(const key of ["quoted_void","usdc_amount"]) {
    if(micro(candidateRequest[key])===null ||
       micro(candidateRequest[key])!==micro(last[key]))
      return held("caller_original_"+key+"_mismatch");
  }
  if(!sameLaunch(candidateRequest.launch_authority,last.launch_authority))
    return held("caller_original_launch_authority_mismatch");

  return Object.freeze({
    ready:true,status:classified.status,
    canonical_payment_identity:classified.canonical_payment_identity,
    payment_verified_event_sha256:classified.payment_verified_event_sha256,
    original_request_id:event.request_id,
    original_buyer_and_launch_lineage_bound:true,
    append_allowed_in_this_reference_model:true,
    // Even a valid hypothetical check is not filesystem/durability authority.
    fsync_or_sidecar_performed:false,
  });
}
const base={candidateRequest:durable,event:canonicalEvent,
  originalRequests:jsonl(durable),priorEvents:Buffer.alloc(0),
  allocation:Buffer.alloc(0)};
const cases=[];
function positive(label,input) {
  const decision=qualifyNewVerifiedPaymentInMemory(input);
  assert.equal(decision.ready,true,label+": "+JSON.stringify(decision));
  assert.equal(decision.status,"verified_allocation_missing");
  assert.match(decision.canonical_payment_identity,/^voidpay1:base:0x[0-9a-f]{64}:7$/u);
  assert.equal(decision.fsync_or_sidecar_performed,false);
  cases.push({name:label,ready:true,reason:null});
}
function negative(label,input,reason) {
  const result=qualifyNewVerifiedPaymentInMemory(input);
  assert.equal(result.ready,false,label);
  assert.equal(result.reason,reason,label+": "+JSON.stringify(result));
  assert.equal(result.append_allowed,false,label);
  assert.equal(result.fsync_or_sidecar_performed,false,label);
  cases.push({name:label,ready:false,reason:result.reason});
}
positive("original_event_valid_before_append",base);
negative("forged_verifier_from_address",{
  ...base,event:{...canonicalEvent,payment_verifier:{
    ...canonicalEvent.payment_verifier,from_address:OTHER_ADDRESS,
  }},
},"strict_hypothetical_replay_held");
negative("forged_receipt_destination",{
  ...base,event:{...canonicalEvent,payment_verifier:{
    ...canonicalEvent.payment_verifier,receive_address:OTHER_ADDRESS,
  }},
},"strict_hypothetical_replay_held");
negative("foreign_erc20_event",{
  ...base,event:{...canonicalEvent,payment_verifier:{
    ...canonicalEvent.payment_verifier,usdc_contract:OTHER_ADDRESS,
  }},
},"strict_hypothetical_replay_held");
negative("out_of_domain_log_index",{
  ...base,event:{...canonicalEvent,payment_verifier:{
    ...canonicalEvent.payment_verifier,log_index:"4294967296",
  }},
},"strict_hypothetical_replay_held");
negative("altered_caller_delivery_address",{
  ...base,candidateRequest:{...durable,delivery_address:OTHER_ADDRESS},
},"caller_original_delivery_address_mismatch");
negative("altered_caller_receiver",{
  ...base,candidateRequest:{...durable,receive_address:OTHER_ADDRESS},
},"caller_original_receive_address_mismatch");
negative("altered_caller_quoted_void",{
  ...base,candidateRequest:{...durable,quoted_void:"7"},
},"caller_original_quoted_void_mismatch");
negative("altered_caller_launch_generation",{
  ...base,candidateRequest:{...durable,launch_authority:{
    ...launch,activation_generation:"0x"+"9".repeat(64),
  }},
},"caller_original_launch_authority_mismatch");
negative("unqualified_original_without_launch",{
  ...base,originalRequests:jsonl({...durable,launch_authority:undefined}),
},"strict_hypothetical_replay_held");
negative("unqualified_original_without_native_token",{
  ...base,originalRequests:jsonl({...durable,usdc_contract:undefined}),
},"strict_hypothetical_replay_held");
assert.equal(cases.length,11);
console.log(JSON.stringify({
  marker:"VOID_BUY_VOID_PREAPPEND_IN_MEMORY_LINEAGE_PROOF_V1",
  schema:"void_buy_void_preappend_lineage_hypothetical_v1",
  source_parent:SOURCE_PARENT,
  source_replay_git_blob:SOURCE_REPLAY_GIT_BLOB,
  source_handoff_git_blob:SOURCE_HANDOFF_GIT_BLOB,
  positive_cases:1,negative_cases:10,
  scenarios:cases,
  actual_handoff_modified:false,
  actual_append_invoked:false,
  customer_history_read:false,
  runtime_mounted:false,
  filesystem_mutation:false,
  proof_is_reference_only:true,
  production_preappend_guard_integrated:false,
  production_gate_ready:false,
  public_presale_activation:false,
  funds_moved:false,
},null,2));
