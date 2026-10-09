import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { BuyVoidRequestV1 } from "../src/economic/buy_void_auto_fulfillment_v1.js";
import {
  createBuyVoidPaymentHttpTransportV1,
  observeBuyVoidPaymentV1,
  type BuyVoidPaymentRpcObserverPolicyV1,
  type BuyVoidPaymentRpcTransportV1,
} from "../src/economic/buy_void_payment_rpc_observer_v1.js";
import {
  VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_V1,
  VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_AUTHORITY_V1,
  classifyBuyVoidCanonicalPaymentRpcRailV1,
  observeBuyVoidCanonicalRailPaymentV1,
} from "../src/economic/buy_void_canonical_payment_rpc_rail_guard_v1.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OBSERVER = "src/economic/buy_void_payment_rpc_observer_v1.ts";
const EXPECTED_OBSERVER_GIT_BLOB =
  "0073818ad6f6418e895bf794024c9d678b3bef86";
const bytes = fs.readFileSync(path.join(ROOT, OBSERVER));
const gitBlob = crypto.createHash("sha1")
  .update(Buffer.from("blob " + bytes.byteLength + "\0", "utf8"))
  .update(bytes).digest("hex");
assert.equal(gitBlob, EXPECTED_OBSERVER_GIT_BLOB,
  "repaired reviewed total-deadline observer source must not drift");
const GUARD_SOURCE = "src/economic/buy_void_canonical_payment_rpc_rail_guard_v1.ts";
const EXPECTED_GUARD_GIT_BLOB = "2864703a443eac19c3fb6e5750757e5c54fce5dd";
const guardBytes = fs.readFileSync(path.join(ROOT, GUARD_SOURCE));
assert.equal(crypto.createHash("sha1")
  .update(Buffer.from("blob " + guardBytes.byteLength + "\0", "utf8"))
  .update(guardBytes).digest("hex"), EXPECTED_GUARD_GIT_BLOB,
  "canonical rail guard source identity must match the reviewed byte string");
const guardSource=guardBytes.toString("utf8");
assert.ok(
  guardSource.includes("const snapshot: BuyVoidPaymentRpcObserverPolicyV1 ="),
  "validated RPC policy snapshot must close its observer-policy type",
);

assert.equal(
  VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_V1,
  "VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_V1",
);
assert.equal(VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_AUTHORITY_V1.exact_base_chain_id,8453);
assert.equal(VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_AUTHORITY_V1.exact_ethereum_chain_id,1);
assert.equal(VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_AUTHORITY_V1.production_payment_authority_ready,false);
assert.equal(VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_AUTHORITY_V1.runtime_route_mount,false);
assert.equal(VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_AUTHORITY_V1.signer_access,false);
assert.equal(
  VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_AUTHORITY_V1
    .policy_snapshot_once_before_guard_and_transport,
  true,
);
assert.equal(
  VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_AUTHORITY_V1
    .policy_accessors_or_proxy_allowed,
  false,
);
assert.equal(
  VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_AUTHORITY_V1
    .request_payment_identity_snapshot_once,
  true,
);
assert.equal(
  VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_AUTHORITY_V1
    .request_accessors_or_proxy_allowed,
  false,
);

const rpcUrl = "http://127.0.0.1:1/";
const hash = "0x" + "a".repeat(64);
const policy = (
  chain:"base" | "ethereum",chainId:string|number,
): BuyVoidPaymentRpcObserverPolicyV1 => ({
  enabled:true,source_chain:chain,chain_id:chainId,rpc_url:rpcUrl,
  timeout_ms:250,max_response_bytes:1024,
});
const request = (chain:string) => ({
  request_id:"synthetic-only",
  source_chain:chain,tx_hash:hash,
}) as unknown as BuyVoidRequestV1;

function fixture(chainId:string) {
  let calls=0;
  const methods:string[]=[];
  const transport:BuyVoidPaymentRpcTransportV1 = {
    async call(input) {
      calls++;
      methods.push(input.method);
      if(input.method==="eth_chainId") return chainId;
      if(input.method==="eth_getTransactionReceipt") return {
        status:"0x1",transactionHash:hash,blockNumber:"0x8",logs:[],
      };
      if(input.method==="eth_blockNumber") return "0x9";
      throw new Error("unexpected synthetic RPC method");
    },
  };
  return {transport,methods,get calls(){return calls;}};
}

// Reproduce the exact earlier standalone V1 gap in memory: a Base policy
// with Ethereum chain ID and a fixture RPC that agrees with the incorrect
// policy can reach an OBSERVED result. This proof grants no payment validity.
{
  const mismatch = policy("base",1);
  const direct = createBuyVoidPaymentHttpTransportV1(mismatch);
  assert.equal("reason" in direct,false,
    "V1 historical normalizePolicy gap changed; rereview needed");
  const fake = fixture("0x1");
  const v1 = await observeBuyVoidPaymentV1({
    request:request("base"),policy:mismatch,transport:fake.transport,
  });
  assert.equal(v1.ok,true,
    "original observer must reproduce source-chain/chain-ID gap in fixture");
  assert.equal(fake.calls,3);
  const guardedFixture = fixture("0x1");
  const guarded = await observeBuyVoidCanonicalRailPaymentV1({
    request:request("base"),policy:mismatch,transport:guardedFixture.transport,
  });
  assert.equal(guarded.ok,false);
  if(guarded.ok===false) {
    assert.equal(guarded.reason,"canonical_payment_rpc_chain_id_mismatch");
  }
  assert.equal(guardedFixture.calls,0,
    "invalid rail-chain pairing must HOLD before any observer RPC");
}

// Both native USDC source rails are canonical: Base=8453, Ethereum=1.
for(const [rail,id,hex] of [
  ["base",8453,"0x2105"],["ethereum",1,"0x1"]
] as const) {
  for(const representation of [id,String(id)]) {
    const p=policy(rail,representation);
    const normalized=classifyBuyVoidCanonicalPaymentRpcRailV1(p);
    assert.equal(normalized.ok,true);
    const mock=fixture(hex);
    const actual=await observeBuyVoidCanonicalRailPaymentV1({
      request:request(rail),policy:p,transport:mock.transport,
    });
    assert.equal(actual.ok,true,"canonical rail should reach original observer");
    assert.equal(mock.calls,3);
    assert.deepEqual(mock.methods,
      ["eth_chainId","eth_getTransactionReceipt","eth_blockNumber"]);
    if(actual.ok===true) {
      assert.equal(actual.source_chain,rail);
      assert.equal(actual.chain_id,String(id));
      assert.equal(actual.payment_transaction_hash,hash);
    }
  }
}

// Executable policy/request surfaces are rejected without invocation.
{
  let policyGetterCalls=0;
  const accessorPolicy:any={
    enabled:true,
    chain_id:8453,
    rpc_url:rpcUrl,
  };
  Object.defineProperty(accessorPolicy,"source_chain",{
    enumerable:true,
    get(){
      policyGetterCalls+=1;
      return "base";
    },
  });
  const directHeld=classifyBuyVoidCanonicalPaymentRpcRailV1(accessorPolicy);
  assert.equal(directHeld.ok,false);
  if(directHeld.ok===false) {
    assert.equal(directHeld.reason,"canonical_payment_rpc_policy_accessor_forbidden");
  }
  assert.equal(policyGetterCalls,0,
    "direct classifier executed policy getter");
  const mock=fixture("0x2105");
  const held=await observeBuyVoidCanonicalRailPaymentV1({
    request:request("base"),policy:accessorPolicy,transport:mock.transport,
  });
  assert.equal(held.ok,false);
  if(held.ok===false) {
    assert.equal(held.reason,"canonical_payment_rpc_policy_accessor_forbidden");
  }
  assert.equal(policyGetterCalls,0,"policy getter executed");
  assert.equal(mock.calls,0,"accessor policy reached RPC");
}
{
  let policyProxyTraps=0;
  const proxyPolicy=new Proxy(policy("base",8453),{
    ownKeys(target){
      policyProxyTraps+=1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target,key){
      policyProxyTraps+=1;
      return Reflect.getOwnPropertyDescriptor(target,key);
    },
  });
  const directHeld=classifyBuyVoidCanonicalPaymentRpcRailV1(proxyPolicy);
  assert.equal(directHeld.ok,false);
  assert.equal(policyProxyTraps,0,
    "direct classifier executed policy Proxy trap");
  const mock=fixture("0x2105");
  const held=await observeBuyVoidCanonicalRailPaymentV1({
    request:request("base"),policy:proxyPolicy,transport:mock.transport,
  });
  assert.equal(held.ok,false);
  assert.equal(policyProxyTraps,0,"policy Proxy trap executed");
  assert.equal(mock.calls,0,"proxy policy reached RPC");
}
{
  let requestGetterCalls=0;
  const accessorRequest:any={tx_hash:hash};
  Object.defineProperty(accessorRequest,"source_chain",{
    enumerable:true,
    get(){
      requestGetterCalls+=1;
      return "base";
    },
  });
  const mock=fixture("0x2105");
  const held=await observeBuyVoidCanonicalRailPaymentV1({
    request:accessorRequest,policy:policy("base",8453),transport:mock.transport,
  });
  assert.equal(held.ok,false);
  if(held.ok===false) {
    assert.equal(held.reason,"canonical_payment_rpc_request_invalid");
  }
  assert.equal(requestGetterCalls,0,"request getter executed");
  assert.equal(mock.calls,0,"accessor request reached RPC");
}
{
  let requestProxyTraps=0;
  const proxyRequest=new Proxy(request("base") as any,{
    ownKeys(target){
      requestProxyTraps+=1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target,key){
      requestProxyTraps+=1;
      return Reflect.getOwnPropertyDescriptor(target,key);
    },
  });
  const mock=fixture("0x2105");
  const held=await observeBuyVoidCanonicalRailPaymentV1({
    request:proxyRequest,policy:policy("base",8453),transport:mock.transport,
  });
  assert.equal(held.ok,false);
  assert.equal(requestProxyTraps,0,"request Proxy trap executed");
  assert.equal(mock.calls,0,"proxy request reached RPC");
}

// Once admitted, later mutation of the original policy/request cannot change
// the rail or payment identity consumed by the legacy observer.
{
  const mutablePolicy:any=policy("base",8453);
  const mutableRequest:any=request("base");
  let calls=0;
  const transport:BuyVoidPaymentRpcTransportV1={
    async call(input) {
      calls+=1;
      if(calls===1) {
        mutablePolicy.source_chain="ethereum";
        mutablePolicy.chain_id=1;
        mutablePolicy.rpc_url="https://example.invalid/changed";
        mutableRequest.source_chain="ethereum";
        mutableRequest.tx_hash="0x"+"b".repeat(64);
      }
      if(input.method==="eth_chainId") return "0x2105";
      if(input.method==="eth_getTransactionReceipt") {
        assert.deepEqual(input.params,[hash],
          "observer payment hash changed after caller mutation");
        return {
          status:"0x1",transactionHash:hash,blockNumber:"0x8",logs:[],
        };
      }
      if(input.method==="eth_blockNumber") return "0x9";
      throw new Error("unexpected synthetic RPC method");
    },
  };
  const out=await observeBuyVoidCanonicalRailPaymentV1({
    request:mutableRequest,policy:mutablePolicy,transport,
  });
  assert.equal(out.ok,true,"admitted snapshot did not survive caller mutation");
  assert.equal(calls,3);
  if(out.ok===true) {
    assert.equal(out.source_chain,"base");
    assert.equal(out.chain_id,"8453");
    assert.equal(out.payment_transaction_hash,hash);
  }
}

const negativePolicies:unknown[] = [
  policy("base",1),policy("base","1"),
  policy("ethereum",8453),policy("ethereum","8453"),
  policy("base","08453"),policy("base","0x2105"),
  policy("ethereum","01"),policy("ethereum",0),
  policy("base",-8453),policy("base",8453.25),
  policy("base",Number.POSITIVE_INFINITY),
  {...policy("base",8453),chain_id:true},
  {...policy("base",8453),chain_id:null},
  {...policy("base",8453),chain_id:{valueOf(){throw Error("must not coerce");}}},
  {...policy("base",8453),source_chain:"eth"},
  {...policy("base",8453),source_chain:"polygon"},
  {...policy("base",8453),enabled:false},
  null,[],Object.create(null),
];
for(const candidate of negativePolicies) {
  const decision=classifyBuyVoidCanonicalPaymentRpcRailV1(candidate);
  assert.equal(decision.ok,false,"wrong pairing/type must HOLD");
}
{
  const disabledPolicy={...policy("base",8453),enabled:false};
  const disabledFixture=fixture("0x2105");
  const disabledObserved=await observeBuyVoidCanonicalRailPaymentV1({
    request:request("base"),
    policy:disabledPolicy,
    transport:disabledFixture.transport,
  });
  assert.equal(disabledObserved.ok,false);
  if(disabledObserved.ok===false) {
    assert.equal(
      disabledObserved.reason,
      "canonical_payment_rpc_policy_disabled",
    );
  }
  assert.equal(
    disabledFixture.calls,
    0,
    "disabled canonical policy reached RPC",
  );
}

const wrongRequest=fixture("0x2105");
const mismatchReq=await observeBuyVoidCanonicalRailPaymentV1({
  request:request("ethereum"),policy:policy("base",8453),
  transport:wrongRequest.transport,
});
assert.equal(mismatchReq.ok,false);
if(mismatchReq.ok===false){
  assert.equal(mismatchReq.reason,"canonical_payment_rpc_request_chain_mismatch");
}
assert.equal(wrongRequest.calls,0);
console.log("VOID_BUY_VOID_CANONICAL_PAYMENT_RPC_RAIL_GUARD_V1_PROOF_GREEN");
console.log("legacy_observer_mismatched_chain_configuration_observed_synthetically=true");
console.log("legacy_observer_source_blob_bound="+EXPECTED_OBSERVER_GIT_BLOB);
console.log("canonical_rail_guard_source_blob_bound="+EXPECTED_GUARD_GIT_BLOB);
console.log("base_mainnet_chain_id_8453_required=true");
console.log("ethereum_mainnet_chain_id_1_required=true");
console.log("wrong_chain_id_held_before_RPC=true");
console.log("mismatched_request_chain_held_before_RPC=true");
console.log("disabled_policy_held_before_RPC=true");
console.log("typed_policy_snapshot_contract=true");
console.log("policy_accessor_rejected_without_invocation=true");
console.log("policy_proxy_rejected_without_traps=true");
console.log("direct_classifier_policy_accessor_rejected_without_invocation=true");
console.log("direct_classifier_policy_proxy_rejected_without_traps=true");
console.log("request_accessor_rejected_without_invocation=true");
console.log("request_proxy_rejected_without_traps=true");
console.log("post_admission_policy_request_mutation_ignored=true");
console.log("canonical_receipt_observation_delegates_to_V1=true");
console.log("negative_policy_cases="+negativePolicies.length);
console.log("real_RPC_or_customer_record_used=false");
console.log("runtime_route_mount=false");
console.log("production_payment_authority_ready=false");
console.log("signing_or_funds_moved=false");
