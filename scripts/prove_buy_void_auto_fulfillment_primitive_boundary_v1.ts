import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalBuyVoidPaymentIdentityV1,
  decideBuyVoidAutoFulfillmentV1,
} from "../src/economic/buy_void_auto_fulfillment_v1.js";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE="src/economic/buy_void_auto_fulfillment_v1.ts";
const EXPECTED_SOURCE_BLOB="3f10035412f6a52eebe4c4855b8f18072d452f47";
const PREDECESSOR_SOURCE_BLOB="1ac1ad6213be83f1aa8261a554caa91544fe5e09";

function gitBlob(bytes:Buffer):string {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
}
const sourceBytes=fs.readFileSync(path.join(ROOT,SOURCE));
assert.equal(gitBlob(sourceBytes),EXPECTED_SOURCE_BLOB,
  "repaired auto-fulfillment source drift");
const source=sourceBytes.toString("utf8");
for(const required of [
  'types as utilTypes',
  'utilTypes.isProxy(value)',
  'Object.getOwnPropertyDescriptors(value)',
  'snapshotAutoFulfillmentInputV1',
  'auto_fulfillment_input_not_plain_data',
]) assert.ok(source.includes(required),
  "missing plain-data snapshot boundary: "+required);

for(const forbidden of [
  'String(value || "").trim().toLowerCase()',
  'String(value ?? "").trim().toLowerCase()',
  'String(value ?? "").trim()',
  'String(request.request_id || "").trim()',
  'String(event.request_id || "").trim()',
  'String(event.operator_status || "").trim().toLowerCase()',
]) assert.equal(source.includes(forbidden),false,
  "coercive auto-fulfillment boundary remains: "+forbidden);

const txHash="0x"+"a".repeat(64);
const delivery="0x"+"b".repeat(40);
const receiver="0x"+"c".repeat(40);
const usdc="0x"+"d".repeat(40);

function baseline():any {
  return {
    request:{
      request_id:"buyvoid_auto_fulfillment_boundary_v1",
      source_chain:"base",
      tx_hash:txHash,
      delivery_address:delivery,
      receive_address:receiver,
      usdc_amount:"10",
      quoted_void:"20",
    },
    verified_payment_event:{
      schema:"void_buy_void_verified_payment_event_v2",
      marker:"VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
      payment_identity_input_complete:true,
      request_id:"buyvoid_auto_fulfillment_boundary_v1",
      operator_status:"payment_verified",
      payment_verified:true,
      tx_hash:txHash,
      payment_verifier:{
        chain:"base",
        transaction_hash:txHash,
        log_index:"7",
        block_number:"12345678",
        confirmations:"12",
        usdc_contract:usdc,
        from_address:delivery,
        receive_address:receiver,
        delivery_address:delivery,
        amount_units:"10000000",
        requested_units:"10000000",
      },
    },
    policy:{
      automatic_fulfillment_enabled:true,
      allowed_chains:["base","ethereum"],
      min_confirmations_by_chain:{base:12,ethereum:24},
      usdc_contract_by_chain:{base:usdc,ethereum:"0x"+"e".repeat(40)},
      receive_address_by_chain:{base:receiver,ethereum:"0x"+"f".repeat(40)},
      rate_void_units_numerator:"2",
      rate_void_units_denominator:"1",
      pool_remaining_void_units:"10000000000000",
      exact_payment_required:true,
    },
    prior_claims:[],
  };
}

const control=decideBuyVoidAutoFulfillmentV1(baseline());
assert.equal(control.ok,true,"primitive control must approve");
assert.equal(control.status,"approved");
if(control.ok!==true) throw new Error("primitive_control_not_approved");
const expectedDecision=JSON.stringify(control);

const wrongTypeCases:Array<[string,(fixture:any)=>void]>=[
  ["request_id_array",f=>{f.request.request_id=[f.request.request_id];}],
  ["request_id_number",f=>{f.request.request_id=123;}],
  ["request_source_chain_array",f=>{f.request.source_chain=[f.request.source_chain];}],
  ["request_tx_hash_array",f=>{f.request.tx_hash=[f.request.tx_hash];}],
  ["request_delivery_address_array",f=>{f.request.delivery_address=[f.request.delivery_address];}],
  ["request_receive_address_array",f=>{f.request.receive_address=[f.request.receive_address];}],
  ["request_usdc_amount_array",f=>{f.request.usdc_amount=[f.request.usdc_amount];}],
  ["request_quoted_void_array",f=>{f.request.quoted_void=[f.request.quoted_void];}],
  ["event_request_id_array",f=>{f.verified_payment_event.request_id=[f.verified_payment_event.request_id];}],
  ["event_operator_status_array",f=>{f.verified_payment_event.operator_status=[f.verified_payment_event.operator_status];}],
  ["event_tx_hash_array",f=>{f.verified_payment_event.tx_hash=[f.verified_payment_event.tx_hash];}],
  ["verifier_chain_array",f=>{f.verified_payment_event.payment_verifier.chain=[f.verified_payment_event.payment_verifier.chain];}],
  ["verifier_tx_hash_array",f=>{f.verified_payment_event.payment_verifier.transaction_hash=[f.verified_payment_event.payment_verifier.transaction_hash];}],
  ["verifier_tx_hash_falsy_number",f=>{f.verified_payment_event.payment_verifier.transaction_hash=0;}],
  ["verifier_log_index_array",f=>{f.verified_payment_event.payment_verifier.log_index=[f.verified_payment_event.payment_verifier.log_index];}],
  ["verifier_block_number_array",f=>{f.verified_payment_event.payment_verifier.block_number=[f.verified_payment_event.payment_verifier.block_number];}],
  ["verifier_confirmations_array",f=>{f.verified_payment_event.payment_verifier.confirmations=[f.verified_payment_event.payment_verifier.confirmations];}],
  ["verifier_usdc_contract_array",f=>{f.verified_payment_event.payment_verifier.usdc_contract=[f.verified_payment_event.payment_verifier.usdc_contract];}],
  ["verifier_from_address_array",f=>{f.verified_payment_event.payment_verifier.from_address=[f.verified_payment_event.payment_verifier.from_address];}],
  ["verifier_receive_address_array",f=>{f.verified_payment_event.payment_verifier.receive_address=[f.verified_payment_event.payment_verifier.receive_address];}],
  ["verifier_delivery_address_array",f=>{f.verified_payment_event.payment_verifier.delivery_address=[f.verified_payment_event.payment_verifier.delivery_address];}],
  ["verifier_amount_units_array",f=>{f.verified_payment_event.payment_verifier.amount_units=[f.verified_payment_event.payment_verifier.amount_units];}],
  ["verifier_requested_units_array",f=>{f.verified_payment_event.payment_verifier.requested_units=[f.verified_payment_event.payment_verifier.requested_units];}],
  ["policy_allowed_chain_element_array",f=>{f.policy.allowed_chains[0]=[f.policy.allowed_chains[0]];}],
  ["policy_allowed_chains_nonarray",f=>{f.policy.allowed_chains="base";}],
  ["policy_min_confirmations_map_array",f=>{const m:any=[];m.base=12;f.policy.min_confirmations_by_chain=m;}],
  ["policy_usdc_contract_map_array",f=>{const m:any=[];m.base=usdc;f.policy.usdc_contract_by_chain=m;}],
  ["policy_receive_address_map_array",f=>{const m:any=[];m.base=receiver;f.policy.receive_address_by_chain=m;}],
  ["prior_claims_nonarray",f=>{f.prior_claims={};}],
  ["policy_min_confirmations_array",f=>{f.policy.min_confirmations_by_chain.base=[f.policy.min_confirmations_by_chain.base];}],
  ["policy_min_confirmations_string",f=>{f.policy.min_confirmations_by_chain.base="12";}],
  ["policy_min_confirmations_bigint",f=>{f.policy.min_confirmations_by_chain.base=12n;}],
  ["policy_usdc_contract_array",f=>{f.policy.usdc_contract_by_chain.base=[f.policy.usdc_contract_by_chain.base];}],
  ["policy_receive_address_array",f=>{f.policy.receive_address_by_chain.base=[f.policy.receive_address_by_chain.base];}],
  ["policy_rate_numerator_array",f=>{f.policy.rate_void_units_numerator=[f.policy.rate_void_units_numerator];}],
  ["policy_rate_denominator_array",f=>{f.policy.rate_void_units_denominator=[f.policy.rate_void_units_denominator];}],
  ["policy_pool_remaining_array",f=>{f.policy.pool_remaining_void_units=[f.policy.pool_remaining_void_units];}],
];
for(const [label,mutate] of wrongTypeCases){
  const fixture=structuredClone(baseline());
  mutate(fixture);
  const decision=decideBuyVoidAutoFulfillmentV1(fixture);
  assert.equal(decision.ok,false,"wrong structural type must HOLD: "+label);
}

for(const [label,input] of [
  ["identity_chain_array",{source_chain:["base"],payment_transaction_hash:txHash,payment_log_index:"7"}],
  ["identity_hash_array",{source_chain:"base",payment_transaction_hash:[txHash],payment_log_index:"7"}],
  ["identity_log_index_array",{source_chain:"base",payment_transaction_hash:txHash,payment_log_index:["7"]}],
] as const){
  assert.throws(
    ()=>canonicalBuyVoidPaymentIdentityV1(input as any),
    /invalid_/u,
    label+" must fail closed",
  );
}

const duplicateCases:Array<[string,(claim:any)=>void]>=[
  ["prior_claim_identity_array",c=>{c.canonical_payment_identity=[c.canonical_payment_identity];}],
  ["prior_claim_request_id_array",c=>{c.request_id=[c.request_id];}],
  ["prior_claim_fingerprint_array",c=>{c.decision_fingerprint=[c.decision_fingerprint];}],
];
for(const [label,mutate] of duplicateCases){
  const fixture=baseline();
  fixture.prior_claims=[structuredClone(control.claim)];
  mutate(fixture.prior_claims[0]);
  const decision=decideBuyVoidAutoFulfillmentV1(fixture);
  assert.equal(decision.ok,false,"malformed prior claim must HOLD: "+label);
}

// Executable-object authority must be rejected without invoking caller code.
{
  const raw=baseline();
  let traps=0;
  const fixture=new Proxy(raw,{
    get(target,property,receiverValue){
      traps++;
      return Reflect.get(target,property,receiverValue);
    },
  });
  const decision=decideBuyVoidAutoFulfillmentV1(fixture);
  assert.equal(decision.ok,false,"top-level Proxy must HOLD");
  assert.equal(traps,0,"top-level Proxy trap executed");
}

{
  const fixture=baseline();
  let reads=0;
  const value=fixture.request.request_id;
  Object.defineProperty(fixture.request,"request_id",{
    enumerable:true,configurable:true,
    get(){reads++; return value;},
  });
  const decision=decideBuyVoidAutoFulfillmentV1(fixture);
  assert.equal(decision.ok,false,"request accessor must HOLD");
  assert.equal(reads,0,"request getter executed");
}

{
  const fixture=baseline();
  let traps=0;
  fixture.verified_payment_event.payment_verifier=new Proxy(
    fixture.verified_payment_event.payment_verifier,
    {
      ownKeys(target){traps++; return Reflect.ownKeys(target);},
      getOwnPropertyDescriptor(target,key){
        traps++;
        return Reflect.getOwnPropertyDescriptor(target,key);
      },
    },
  );
  const decision=decideBuyVoidAutoFulfillmentV1(fixture);
  assert.equal(decision.ok,false,"payment verifier Proxy must HOLD");
  assert.equal(traps,0,"payment verifier Proxy trap executed");
}

{
  const fixture=baseline();
  let reads=0;
  Object.defineProperty(fixture.policy.usdc_contract_by_chain,"base",{
    enumerable:true,configurable:true,
    get(){reads++; return usdc;},
  });
  const decision=decideBuyVoidAutoFulfillmentV1(fixture);
  assert.equal(decision.ok,false,"policy-map accessor must HOLD");
  assert.equal(reads,0,"policy-map getter executed");
}

{
  const fixture=baseline();
  fixture.prior_claims=[structuredClone(control.claim)];
  let reads=0;
  const claim=fixture.prior_claims[0];
  const value=claim.request_id;
  Object.defineProperty(claim,"request_id",{
    enumerable:true,configurable:true,
    get(){reads++; return value;},
  });
  const decision=decideBuyVoidAutoFulfillmentV1(fixture);
  assert.equal(decision.ok,false,"prior-claim accessor must HOLD");
  assert.equal(reads,0,"prior-claim getter executed");
}

{
  const fixture=baseline();
  const revocable=Proxy.revocable(fixture.policy.allowed_chains,{});
  revocable.revoke();
  fixture.policy.allowed_chains=revocable.proxy;
  const decision=decideBuyVoidAutoFulfillmentV1(fixture);
  assert.equal(decision.ok,false,"revoked array Proxy must HOLD");
}

{
  const fixture=baseline();
  const custom=Object.create({inherited:"authority"});
  Object.assign(custom,fixture.request);
  fixture.request=custom;
  const decision=decideBuyVoidAutoFulfillmentV1(fixture);
  assert.equal(decision.ok,false,"custom request prototype must HOLD");
}

const primitiveVariants=baseline();
primitiveVariants.request.usdc_amount=10;
primitiveVariants.request.quoted_void=20;
primitiveVariants.verified_payment_event.payment_verifier.log_index=7;
primitiveVariants.verified_payment_event.payment_verifier.block_number=12345678;
primitiveVariants.verified_payment_event.payment_verifier.confirmations=12;
primitiveVariants.verified_payment_event.payment_verifier.amount_units=10000000;
primitiveVariants.verified_payment_event.payment_verifier.requested_units=10000000;
primitiveVariants.policy.min_confirmations_by_chain.base=12;
primitiveVariants.policy.rate_void_units_numerator=2;
primitiveVariants.policy.rate_void_units_denominator=1;
primitiveVariants.policy.pool_remaining_void_units=10000000000000;
const preserved=decideBuyVoidAutoFulfillmentV1(primitiveVariants);
assert.equal(preserved.ok,true,"reviewed primitive number forms must approve");
assert.equal(preserved.status,"approved");
assert.equal(JSON.stringify(preserved),expectedDecision,
  "reviewed primitive variants changed canonical decision");

assert.equal(
  canonicalBuyVoidPaymentIdentityV1({
    source_chain:"BASE",
    payment_transaction_hash:txHash.toUpperCase().replace("0X","0x"),
    payment_log_index:"0x7",
  }),
  "voidpay1:base:"+txHash+":7",
  "reviewed primitive canonicalization changed",
);

console.log("VOID_BUY_VOID_AUTO_FULFILLMENT_PRIMITIVE_BOUNDARY_V1_GREEN");
console.log("predecessor_source_blob="+PREDECESSOR_SOURCE_BLOB);
console.log("repaired_source_blob="+EXPECTED_SOURCE_BLOB);
console.log("primitive_control_approved=true");
console.log("wrong_structural_type_case_count="+wrongTypeCases.length);
console.log("wrong_structural_types_held=true");
console.log("canonical_identity_wrong_types_held=true");
console.log("malformed_prior_claims_held=true");
console.log("reviewed_primitive_forms_preserved=true");
console.log("canonical_approved_decision_preserved=true");
console.log("verifier_falsy_wrong_type_tx_hash_does_not_fallback=true");
console.log("top_level_proxy_rejected_without_traps=true");
console.log("request_accessor_rejected_without_invocation=true");
console.log("payment_verifier_proxy_rejected_without_traps=true");
console.log("policy_map_accessor_rejected_without_invocation=true");
console.log("prior_claim_accessor_rejected_without_invocation=true");
console.log("revoked_array_proxy_held=true");
console.log("custom_prototype_rejected=true");
console.log("production_payment_authority_ready=false");
console.log("rpc_used=false");
console.log("filesystem_write=false");
console.log("wallet_or_signer_access=false");
console.log("transaction_broadcast=false");
console.log("funds_moved=false");
