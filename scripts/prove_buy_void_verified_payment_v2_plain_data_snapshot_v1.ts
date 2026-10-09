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
const EXPECTED_SOURCE_BLOB="550ede02fc0b7d6874c324af58b5ef9c5591b311";
const PREDECESSOR_SOURCE_BLOB="0df94fb35681f358318416fe6c48f3b794cd6074";

function gitBlob(bytes:Buffer):string {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}

const sourceBytes=fs.readFileSync(path.join(ROOT,SOURCE));
assert.equal(gitBlob(sourceBytes),EXPECTED_SOURCE_BLOB,
  "plain-data V2 source drift");
const source=sourceBytes.toString("utf8");
for(const marker of [
  'types as utilTypes',
  'utilTypes.isProxy(value)',
  'Object.getOwnPropertyDescriptor(recordValue, key)',
  'snapshotDataArrayV2',
  'snapshotDataMapV2',
  'snapshotRequestV2',
  'snapshotReceiptV2',
  'snapshotPolicyV2',
  'MAX_ALLOWED_CHAINS_V2',
  'MAX_RECEIPT_LOGS_V2',
  'MAX_LOG_TOPICS_V2',
  'MAX_SNAPSHOT_TEXT_CODE_UNITS_V2',
  'payment_input_not_plain_data',
]) assert.ok(source.includes(marker),"missing plain-data boundary: "+marker);
const arraySnapshotIndex=source.indexOf("function snapshotDataArrayV2");
const arrayProxyIndex=source.indexOf("utilTypes.isProxy(value)",arraySnapshotIndex);
const arrayIsArrayIndex=source.indexOf("!Array.isArray(value)",arraySnapshotIndex);
assert.ok(arraySnapshotIndex>=0 && arrayProxyIndex>arraySnapshotIndex &&
  arrayIsArrayIndex>arrayProxyIndex,
  "array Proxy must be rejected before Array.isArray/prototype inspection");
assert.equal(
  source.includes("Object.getOwnPropertyDescriptors(value)"),
  false,
  "V2 snapshots must not allocate full caller-object descriptor tables",
);

const txHash="0x"+"a".repeat(64);
const delivery="0x"+"1".repeat(40);
const receiver="0x"+"2".repeat(40);
const usdc="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const transferTopic=
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const addressTopic=(address:string)=>
  "0x"+"0".repeat(24)+address.slice(2);

function baseline():any {
  return {
    request:{
      request_id:"buyvoid_v2_plain_data_snapshot_v1",
      source_chain:"base",
      tx_hash:txHash,
      delivery_address:delivery,
      receive_address:receiver,
      usdc_amount:"12.5",
      quoted_void:"25",
      payment_chain:"base",
      payment_chain_id:8453,
      usdc_contract:usdc,
      payment_instructions:{
        send_chain:"base",
        send_chain_id:8453,
        token_contract:usdc,
        token_decimals:6,
        send_to:receiver,
        send_from:delivery,
      },
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
        removed:false,
      }],
    },
    policy:{
      allowed_chains:["base"],
      usdc_contract_by_chain:{base:usdc},
      receive_address_by_chain:{base:receiver},
      current_block_number_by_chain:{base:"0x65"},
    },
  };
}

const control=buildBuyVoidVerifiedPaymentEventV2(baseline());
assert.equal(control.ok,true,"plain-data control must verify");
if(control.ok!==true) throw new Error("plain_data_control_not_verified");
const expectedEvent=JSON.stringify(control.event);
const expectedTransfer=JSON.stringify(control.matched_transfer);

function requireHeld(label:string,input:any):void {
  const decision=buildBuyVoidVerifiedPaymentEventV2(input);
  assert.equal(decision.ok,false,"executable object must HOLD: "+label);
}

{
  const fixture=baseline();
  let reads=0;
  const value=fixture.request.request_id;
  Object.defineProperty(fixture.request,"request_id",{
    enumerable:true, configurable:true,
    get(){ reads++; return value; },
  });
  requireHeld("request_id_accessor",fixture);
  assert.equal(reads,0,"request getter executed");
}

{
  const fixture=baseline();
  let reads=0;
  const value=fixture.policy.allowed_chains;
  Object.defineProperty(fixture.policy,"allowed_chains",{
    enumerable:true, configurable:true,
    get(){ reads++; return value; },
  });
  requireHeld("policy_allowed_chains_accessor",fixture);
  assert.equal(reads,0,"policy getter executed");
}

{
  const fixture=baseline();
  let reads=0;
  const value=fixture.receipt.logs;
  Object.defineProperty(fixture.receipt,"logs",{
    enumerable:true, configurable:true,
    get(){ reads++; return value; },
  });
  requireHeld("receipt_logs_accessor",fixture);
  assert.equal(reads,0,"receipt getter executed");
}

{
  const fixture=baseline();
  let reads=0;
  const value=fixture.request.payment_instructions;
  Object.defineProperty(fixture.request,"payment_instructions",{
    enumerable:true, configurable:true,
    get(){ reads++; return value; },
  });
  requireHeld("payment_instructions_accessor",fixture);
  assert.equal(reads,0,"payment-instructions getter executed");
}

{
  const fixture=baseline();
  let reads=0;
  const map=fixture.policy.usdc_contract_by_chain;
  Object.defineProperty(map,"base",{
    enumerable:true, configurable:true,
    get(){ reads++; return usdc; },
  });
  requireHeld("policy_map_accessor",fixture);
  assert.equal(reads,0,"policy-map getter executed");
}

{
  const fixture=baseline();
  let traps=0;
  fixture.request=new Proxy(fixture.request,{
    get(target,property,receiverValue){
      traps++;
      return Reflect.get(target,property,receiverValue);
    },
  });
  requireHeld("request_proxy",fixture);
  assert.equal(traps,0,"request Proxy trap executed");
}

{
  const fixture=baseline();
  let traps=0;
  fixture.receipt.logs[0]=new Proxy(fixture.receipt.logs[0],{
    get(target,property,receiverValue){
      traps++;
      return Reflect.get(target,property,receiverValue);
    },
  });
  requireHeld("log_proxy",fixture);
  assert.equal(traps,0,"log Proxy trap executed");
}

{
  const raw=baseline();
  let traps=0;
  const fixture=new Proxy(raw,{
    get(target,property,receiverValue){
      traps++;
      return Reflect.get(target,property,receiverValue);
    },
  });
  requireHeld("input_proxy",fixture);
  assert.equal(traps,0,"input Proxy trap executed");
}

{
  const fixture=baseline();
  const revocable=Proxy.revocable(fixture.policy.allowed_chains,{});
  revocable.revoke();
  fixture.policy.allowed_chains=revocable.proxy;
  requireHeld("revoked_allowed_chains_proxy",fixture);
}

// Structural resource limits must fire before allocating descriptor tables for
// attacker-sized arrays.
{
  const fixture=baseline();
  const target=Array.from({length:33},()=>"base");
  fixture.policy.allowed_chains=target;
  const original=Object.getOwnPropertyDescriptors;
  let targetDescriptorCalls=0;
  try {
    Object.getOwnPropertyDescriptors=((value:any)=>{
      if(value===target) targetDescriptorCalls++;
      return original(value);
    }) as typeof Object.getOwnPropertyDescriptors;
    requireHeld("allowed_chains_resource_bound",fixture);
  } finally {
    Object.getOwnPropertyDescriptors=original;
  }
  assert.equal(targetDescriptorCalls,0,
    "oversized allowed_chains reached descriptor allocation");
}

{
  const fixture=baseline();
  const template=fixture.receipt.logs[0];
  const target=Array.from({length:4097},()=>template);
  fixture.receipt.logs=target;
  const original=Object.getOwnPropertyDescriptors;
  let targetDescriptorCalls=0;
  try {
    Object.getOwnPropertyDescriptors=((value:any)=>{
      if(value===target) targetDescriptorCalls++;
      return original(value);
    }) as typeof Object.getOwnPropertyDescriptors;
    requireHeld("receipt_logs_resource_bound",fixture);
  } finally {
    Object.getOwnPropertyDescriptors=original;
  }
  assert.equal(targetDescriptorCalls,0,
    "oversized receipt logs reached descriptor allocation");
}

// Policy maps must snapshot only reviewed allowlisted chains; an unrelated
// enumerable getter is not authority and must never execute.
{
  const fixture=baseline();
  let reads=0;
  Object.defineProperty(fixture.policy.usdc_contract_by_chain,"evil",{
    enumerable:true,configurable:true,
    get(){reads++; return "0x"+"9".repeat(40);},
  });
  const decision=buildBuyVoidVerifiedPaymentEventV2(fixture);
  assert.equal(decision.ok,true,
    "unreviewed policy-map field changed valid payment decision");
  assert.equal(reads,0,"unreviewed policy-map getter executed");
}

// A reviewed text field is bounded at snapshot admission.
{
  const fixture=baseline();
  fixture.request.request_id="x".repeat(1024*1024+1);
  requireHeld("oversize_reviewed_text",fixture);
}

const nullProto=baseline();
nullProto.request=Object.assign(Object.create(null),nullProto.request);
nullProto.policy=Object.assign(Object.create(null),nullProto.policy);
nullProto.receipt=Object.assign(Object.create(null),nullProto.receipt);
nullProto.request.payment_instructions=
  Object.assign(Object.create(null),nullProto.request.payment_instructions);
nullProto.policy.usdc_contract_by_chain=
  Object.assign(Object.create(null),nullProto.policy.usdc_contract_by_chain);
nullProto.policy.receive_address_by_chain=
  Object.assign(Object.create(null),nullProto.policy.receive_address_by_chain);
nullProto.policy.current_block_number_by_chain=
  Object.assign(Object.create(null),nullProto.policy.current_block_number_by_chain);
nullProto.receipt.logs[0]=
  Object.assign(Object.create(null),nullProto.receipt.logs[0]);
const nullProtoDecision=buildBuyVoidVerifiedPaymentEventV2(nullProto);
assert.equal(nullProtoDecision.ok,true,"null-prototype plain data must remain supported");
if(nullProtoDecision.ok!==true) throw new Error("null_proto_plain_data_rejected");
assert.equal(JSON.stringify(nullProtoDecision.event),expectedEvent);
assert.equal(JSON.stringify(nullProtoDecision.matched_transfer),expectedTransfer);

console.log("VOID_BUY_VOID_VERIFIED_PAYMENT_V2_PLAIN_DATA_SNAPSHOT_V1_GREEN");
console.log("predecessor_source_blob="+PREDECESSOR_SOURCE_BLOB);
console.log("repaired_source_blob="+EXPECTED_SOURCE_BLOB);
console.log("plain_data_control_verified=true");
console.log("accessor_or_proxy_rejection_case_count=9");
console.log("accessor_getters_executed=false");
console.log("proxy_traps_executed=false");
console.log("revoked_array_proxy_held_without_throw=true");
console.log("array_proxy_rejected_before_isarray=true");
console.log("nested_policy_map_accessor_rejected=true");
console.log("nested_payment_instruction_accessor_rejected=true");
console.log("allowed_chain_array_bound_precedes_descriptors=true");
console.log("receipt_log_array_bound_precedes_descriptors=true");
console.log("full_array_descriptor_tables_allocated=false");
console.log("unreviewed_policy_map_getter_not_enumerated=true");
console.log("oversize_reviewed_text_held=true");
console.log("null_prototype_plain_records_supported=true");
console.log("canonical_verified_event_preserved=true");
console.log("production_payment_authority_ready=false");
console.log("rpc_used=false");
console.log("customer_record_used=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("funds_moved=false");
