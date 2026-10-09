import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBuyVoidVerifiedPaymentEventV2,
} from "../src/economic/buy_void_verified_payment_v2.js";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE="src/economic/buy_void_verified_payment_v2.ts";
const EXPECTED_SOURCE_BLOB="c0e4660bb238e1b718b8a471890901bd5a59badf";

function gitBlob(bytes:Buffer):string {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}

const sourceBytes=fs.readFileSync(path.join(ROOT,SOURCE));
assert.equal(
  gitBlob(sourceBytes),
  EXPECTED_SOURCE_BLOB,
  "reviewed V2 verifier source drift",
);
const source=sourceBytes.toString("utf8");
for(const pattern of [
  'String(value || "").trim().toLowerCase()',
  'String(value ?? "").trim().toLowerCase()',
  'String(value ?? "").trim()',
  'String(request.request_id || "").trim()',
  'String(topics[0] || "").trim().toLowerCase()',
]) {
  assert.ok(source.includes(pattern),"expected coercive V2 boundary missing: "+pattern);
}

const txHash="0x"+"a".repeat(64);
const delivery="0x"+"1".repeat(40);
const receiver="0x"+"2".repeat(40);
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const transferTopic=
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const addressTopic=(address:string)=>
  "0x"+"0".repeat(24)+address.slice(2);

const baseline:any={
  request:{
    request_id:"buyvoid_json_type_negative_v1",
    source_chain:"base",
    tx_hash:txHash,
    delivery_address:delivery,
    receive_address:receiver,
    usdc_amount:"12.5",
    quoted_void:"25",
  },
  receipt:{
    status:"0x1",
    transactionHash:txHash,
    blockNumber:"0x64",
    logs:[{
      address:usdc,
      topics:[transferTopic,addressTopic(delivery),addressTopic(receiver)],
      data:"0xbebc20",
      logIndex:"0x7",
      transactionHash:txHash,
      blockNumber:"0x64",
    }],
  },
  policy:{
    allowed_chains:["base"],
    usdc_contract_by_chain:{base:usdc},
    receive_address_by_chain:{base:receiver},
    current_block_number_by_chain:{base:"0x65"},
  },
};

function verify(input:any) {
  return buildBuyVoidVerifiedPaymentEventV2(input);
}

const control=verify(structuredClone(baseline));
assert.equal(control.ok,true,"primitive control must verify");
if(control.ok!==true) throw new Error("primitive_control_not_verified");

const expectedEvent=JSON.stringify(control.event);
const expectedTransfer=JSON.stringify(control.matched_transfer);

const cases:Array<[string,(fixture:any)=>void]>=[
  ["request_id_array",f=>{f.request.request_id=[f.request.request_id];}],
  ["request_source_chain_array",f=>{f.request.source_chain=[f.request.source_chain];}],
  ["request_tx_hash_array",f=>{f.request.tx_hash=[f.request.tx_hash];}],
  ["request_delivery_address_array",f=>{f.request.delivery_address=[f.request.delivery_address];}],
  ["request_receive_address_array",f=>{f.request.receive_address=[f.request.receive_address];}],
  ["request_usdc_amount_array",f=>{f.request.usdc_amount=[f.request.usdc_amount];}],
  ["policy_allowed_chain_element_array",f=>{f.policy.allowed_chains=[["base"]];}],
  ["policy_usdc_address_array",f=>{f.policy.usdc_contract_by_chain.base=[f.policy.usdc_contract_by_chain.base];}],
  ["policy_receive_address_array",f=>{f.policy.receive_address_by_chain.base=[f.policy.receive_address_by_chain.base];}],
  ["policy_current_block_array",f=>{f.policy.current_block_number_by_chain.base=[f.policy.current_block_number_by_chain.base];}],
  ["receipt_status_array",f=>{f.receipt.status=[f.receipt.status];}],
  ["receipt_transaction_hash_array",f=>{f.receipt.transactionHash=[f.receipt.transactionHash];}],
  ["receipt_block_number_array",f=>{f.receipt.blockNumber=[f.receipt.blockNumber];}],
  ["log_contract_array",f=>{f.receipt.logs[0].address=[f.receipt.logs[0].address];}],
  ["log_transfer_topic_array",f=>{f.receipt.logs[0].topics[0]=[f.receipt.logs[0].topics[0]];}],
  ["log_from_topic_array",f=>{f.receipt.logs[0].topics[1]=[f.receipt.logs[0].topics[1]];}],
  ["log_receive_topic_array",f=>{f.receipt.logs[0].topics[2]=[f.receipt.logs[0].topics[2]];}],
  ["log_amount_array",f=>{f.receipt.logs[0].data=[f.receipt.logs[0].data];}],
  ["log_index_array",f=>{f.receipt.logs[0].logIndex=[f.receipt.logs[0].logIndex];}],
  ["log_transaction_hash_array",f=>{f.receipt.logs[0].transactionHash=[f.receipt.logs[0].transactionHash];}],
  ["log_block_number_array",f=>{f.receipt.logs[0].blockNumber=[f.receipt.logs[0].blockNumber];}],
];

for(const [label,mutate] of cases) {
  const fixture=structuredClone(baseline);
  mutate(fixture);
  const decision=verify(fixture);
  assert.equal(
    decision.ok,
    true,
    "NEGATIVE WITNESS no longer reproduces for "+label+
      "; if source was repaired, retire this Draft rather than weakening it",
  );
  if(decision.ok!==true) throw new Error("negative_not_reproduced:"+label);
  assert.equal(JSON.stringify(decision.event),expectedEvent,
    "array-wrapped "+label+" changed canonical verified event");
  assert.equal(JSON.stringify(decision.matched_transfer),expectedTransfer,
    "array-wrapped "+label+" changed matched transfer");
}

console.log("VOID_BUY_VOID_V2_JSON_PRIMITIVE_COERCION_NEGATIVE_V1_REPRODUCED");
console.log("reviewed_v2_source_blob="+EXPECTED_SOURCE_BLOB);
console.log("primitive_control_verified=true");
console.log("array_wrapped_wrong_types_accepted_as_verified=true");
console.log("wrong_type_case_count="+cases.length);
console.log("verified_event_byte_equivalent_to_primitive_control=true");
console.log("request_wrong_types_reproduced=true");
console.log("policy_wrong_types_reproduced=true");
console.log("receipt_wrong_types_reproduced=true");
console.log("usdc_log_wrong_types_reproduced=true");
console.log("production_payment_authority_ready=false");
console.log("source_modified=false");
console.log("customer_record_used=false");
console.log("rpc_used=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("funds_moved=false");
