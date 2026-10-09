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
const EXPECTED_SOURCE_BLOB="0df94fb35681f358318416fe6c48f3b794cd6074";

function gitBlob(bytes:Buffer):string {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
const sourceBytes=fs.readFileSync(path.join(ROOT,SOURCE));
assert.equal(gitBlob(sourceBytes),EXPECTED_SOURCE_BLOB,
  "reviewed repaired V2 source drift");

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
      request_id:"buyvoid_v2_accessor_proxy_v1",
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
assert.equal(control.ok,true,"primitive control must verify");
if(control.ok!==true) throw new Error("primitive_control_not_verified");
const expectedEvent=JSON.stringify(control.event);
const expectedTransfer=JSON.stringify(control.matched_transfer);

function requireEquivalentVerified(label:string,input:any):void {
  const decision=buildBuyVoidVerifiedPaymentEventV2(input);
  assert.equal(decision.ok,true,
    "NEGATIVE witness no longer reproduces for "+label+
    "; if source is repaired, retire or convert this Draft");
  if(decision.ok!==true) throw new Error("negative_not_reproduced:"+label);
  assert.equal(JSON.stringify(decision.event),expectedEvent,
    label+" changed canonical verified event");
  assert.equal(JSON.stringify(decision.matched_transfer),expectedTransfer,
    label+" changed matched transfer");
}

{
  const fixture=baseline();
  let reads=0;
  const value=fixture.request.request_id;
  Object.defineProperty(fixture.request,"request_id",{
    enumerable:true,
    configurable:true,
    get(){ reads++; return value; },
  });
  requireEquivalentVerified("request_id_accessor",fixture);
  assert.ok(reads>=1,"request accessor was not invoked");
}

{
  const fixture=baseline();
  let reads=0;
  const value=fixture.policy.allowed_chains;
  Object.defineProperty(fixture.policy,"allowed_chains",{
    enumerable:true,
    configurable:true,
    get(){ reads++; return value; },
  });
  requireEquivalentVerified("policy_allowed_chains_accessor",fixture);
  assert.ok(reads>=1,"policy accessor was not invoked");
}

{
  const fixture=baseline();
  let reads=0;
  const value=fixture.receipt.logs;
  Object.defineProperty(fixture.receipt,"logs",{
    enumerable:true,
    configurable:true,
    get(){ reads++; return value; },
  });
  requireEquivalentVerified("receipt_logs_accessor",fixture);
  assert.ok(reads>=1,"receipt accessor was not invoked");
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
  requireEquivalentVerified("request_proxy",fixture);
  assert.ok(traps>=1,"request proxy trap was not invoked");
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
  requireEquivalentVerified("log_proxy",fixture);
  assert.ok(traps>=1,"log proxy trap was not invoked");
}

console.log("VOID_BUY_VOID_V2_ACCESSOR_PROXY_AUTHORITY_NEGATIVE_V1_REPRODUCED");
console.log("reviewed_repaired_v2_source_blob="+EXPECTED_SOURCE_BLOB);
console.log("primitive_control_verified=true");
console.log("accessor_or_proxy_case_count=5");
console.log("request_accessor_executed_and_verified=true");
console.log("policy_accessor_executed_and_verified=true");
console.log("receipt_accessor_executed_and_verified=true");
console.log("request_proxy_trap_executed_and_verified=true");
console.log("log_proxy_trap_executed_and_verified=true");
console.log("verified_event_byte_equivalent_to_primitive_control=true");
console.log("production_payment_authority_ready=false");
console.log("source_modified=false");
console.log("rpc_used=false");
console.log("customer_record_used=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("funds_moved=false");
