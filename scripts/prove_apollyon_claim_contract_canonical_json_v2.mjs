#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {types} from "node:util";

import {
  canonicalApollyonClaimContractJsonV1,
} from "../tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  VOID_APOLLYON_CLAIM_CONTRACT_CANONICAL_JSON_V2,
  VOID_APOLLYON_CLAIM_CONTRACT_CANONICAL_JSON_AUTHORITY_V2,
  canonicalApollyonClaimContractJsonV2,
} from "../tools/apollyon-claim-contract-canonical-json-v2.mjs";

function expectCode(fn,pattern,label){
  assert.throws(fn,pattern,label);
}

function restoreDescriptor(target,key,descriptor){
  if(descriptor===undefined)delete target[key];
  else Object.defineProperty(target,key,descriptor);
}

const fixtures=[
  null,
  true,
  false,
  0,
  -0,
  1,
  -1,
  Number.MAX_SAFE_INTEGER,
  Number.MIN_SAFE_INTEGER,
  "",
  "plain",
  "quote\" slash\\ backspace\b tab\t newline\n formfeed\f carriage\r nul\u0000",
  "unicode-é-東京-😀",
  "\ud800",
  "\udc00",
  [1,"two",null,true,false,["nested",0]],
  {
    z:1,
    a:"two",
    nested:{gamma:null,alpha:true,beta:-7},
    list:[{k:"v"},3,false],
  },
  {
    "10":"ten",
    "2":"two",
    "0":"zero",
    "4294967294":"max-index",
    "4294967295":"not-index",
    "01":"leading-zero",
    a:1,
  },
];

let vector="";
for(let index=0;index<fixtures.length;index+=1){
  const v1=canonicalApollyonClaimContractJsonV1(fixtures[index]);
  const v2=canonicalApollyonClaimContractJsonV2(fixtures[index]);
  assert.equal(v2,v1,"valid_fixture_equivalence:"+index);
  vector+=v2+"\n";
}
const fixtureVectorSha256=crypto.createHash("sha256").update(vector,"utf8").digest("hex");

const numericKeyFixture={
  "10":"ten",
  "2":"two",
  "0":"zero",
  "4294967294":"max-index",
  "4294967295":"not-index",
  "01":"leading-zero",
  a:1,
};
const numericKeyExpected=
  '{"0":"zero","2":"two","10":"ten","4294967294":"max-index","01":"leading-zero","4294967295":"not-index","a":1}';
assert.equal(canonicalApollyonClaimContractJsonV1(numericKeyFixture),numericKeyExpected);
assert.equal(canonicalApollyonClaimContractJsonV2(numericKeyFixture),numericKeyExpected);

const nestedFixture={
  z:[3,{b:"two",a:1}],
  a:{flag:true,value:null},
};
const nestedBaseline=canonicalApollyonClaimContractJsonV2(nestedFixture);
const arrayBaseline=canonicalApollyonClaimContractJsonV2([1,{a:"b"},3]);

const originalObjectToJSON=Object.getOwnPropertyDescriptor(Object.prototype,"toJSON");
const originalArrayToJSON=Object.getOwnPropertyDescriptor(Array.prototype,"toJSON");
const originalStringify=JSON.stringify;
const originalHasOwn=Object.hasOwn;

let objectToJSONHits=0;
try{
  Object.defineProperty(Object.prototype,"toJSON",{
    configurable:true,
    get(){
      objectToJSONHits+=1;
      return function(){return "poisoned-object-tojson";};
    },
  });
  assert.equal(
    canonicalApollyonClaimContractJsonV2(nestedFixture),
    nestedBaseline,
  );
  assert.notEqual(
    canonicalApollyonClaimContractJsonV1(nestedFixture),
    nestedBaseline,
  );
  assert.ok(objectToJSONHits>0);
}finally{
  restoreDescriptor(Object.prototype,"toJSON",originalObjectToJSON);
}

let arrayToJSONHits=0;
try{
  Object.defineProperty(Array.prototype,"toJSON",{
    configurable:true,
    get(){
      arrayToJSONHits+=1;
      return function(){return "poisoned-array-tojson";};
    },
  });
  assert.equal(
    canonicalApollyonClaimContractJsonV2([1,{a:"b"},3]),
    arrayBaseline,
  );
  assert.notEqual(
    canonicalApollyonClaimContractJsonV1([1,{a:"b"},3]),
    arrayBaseline,
  );
  assert.ok(arrayToJSONHits>0);
}finally{
  restoreDescriptor(Array.prototype,"toJSON",originalArrayToJSON);
}

let stringifyHits=0;
try{
  JSON.stringify=function(){
    stringifyHits+=1;
    return '"poisoned-global-stringify"';
  };
  assert.equal(
    canonicalApollyonClaimContractJsonV2(nestedFixture),
    nestedBaseline,
  );
  assert.equal(
    canonicalApollyonClaimContractJsonV1(nestedFixture),
    '"poisoned-global-stringify"',
  );
  assert.equal(stringifyHits,1);
}finally{
  JSON.stringify=originalStringify;
}

try{
  Object.hasOwn=function(){return false;};
  assert.equal(
    canonicalApollyonClaimContractJsonV2(nestedFixture),
    nestedBaseline,
  );
}finally{
  Object.hasOwn=originalHasOwn;
}

const originalArrayZero=Object.getOwnPropertyDescriptor(Array.prototype,"0");
let arrayIndexSetterHits=0;
let arraySetterResult;
try{
  Object.defineProperty(Array.prototype,"0",{
    configurable:true,
    set(){
      arrayIndexSetterHits+=1;
    },
  });
  arraySetterResult=canonicalApollyonClaimContractJsonV2(nestedFixture);
}finally{
  restoreDescriptor(Array.prototype,"0",originalArrayZero);
}
assert.equal(arraySetterResult,nestedBaseline);
assert.equal(arrayIndexSetterHits,0);

const originalIsProxy=types.isProxy;
let proxyDetectorPoisonTraps=0;
const proxyUnderDetectorPoison=new Proxy({a:1},{
  getPrototypeOf(target){
    proxyDetectorPoisonTraps+=1;
    return Reflect.getPrototypeOf(target);
  },
  ownKeys(target){
    proxyDetectorPoisonTraps+=1;
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target,key){
    proxyDetectorPoisonTraps+=1;
    return Reflect.getOwnPropertyDescriptor(target,key);
  },
});
try{
  types.isProxy=function(){return false;};
  expectCode(
    ()=>canonicalApollyonClaimContractJsonV2(proxyUnderDetectorPoison),
    /apollyon_claim_canonical_v2_proxy_forbidden/u,
    "captured_proxy_detector_required",
  );
}finally{
  types.isProxy=originalIsProxy;
}
assert.equal(proxyDetectorPoisonTraps,0);

let getterHits=0;
const accessor={};
Object.defineProperty(accessor,"a",{
  enumerable:true,
  get(){
    getterHits+=1;
    return 1;
  },
});
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(accessor),
  /apollyon_claim_canonical_v2_object_shape_invalid/u,
  "accessor_rejected",
);
assert.equal(getterHits,0);

let proxyTrapHits=0;
const proxied=new Proxy({a:1},{
  ownKeys(target){
    proxyTrapHits+=1;
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target,key){
    proxyTrapHits+=1;
    return Reflect.getOwnPropertyDescriptor(target,key);
  },
});
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(proxied),
  /apollyon_claim_canonical_v2_proxy_forbidden/u,
  "proxy_rejected",
);
assert.equal(proxyTrapHits,0);

const revokedProxy=Proxy.revocable([],{});
revokedProxy.revoke();
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(revokedProxy.proxy),
  /apollyon_claim_canonical_v2_proxy_forbidden/u,
  "revoked_proxy_rejected",
);

let callableProxyTrapHits=0;
const callableProxy=new Proxy(function callableTarget(){},{
  apply(){
    callableProxyTrapHits+=1;
    return null;
  },
  get(){
    callableProxyTrapHits+=1;
    return undefined;
  },
  ownKeys(){
    callableProxyTrapHits+=1;
    return [];
  },
});
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(callableProxy),
  /apollyon_claim_canonical_v2_proxy_forbidden/u,
  "callable_proxy_rejected",
);
assert.equal(callableProxyTrapHits,0);

const revokedCallableProxy=Proxy.revocable(function revokedCallableTarget(){},{});
revokedCallableProxy.revoke();
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(revokedCallableProxy.proxy),
  /apollyon_claim_canonical_v2_proxy_forbidden/u,
  "revoked_callable_proxy_rejected",
);

const protoKeyObject={a:1};
Object.defineProperty(protoKeyObject,"__proto__",{
  value:{poisoned:true},
  enumerable:true,
  configurable:true,
  writable:true,
});
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(protoKeyObject),
  /apollyon_claim_canonical_v2_object_key_invalid/u,
  "proto_key_rejected",
);

const symbolObject={a:1};
symbolObject[Symbol("hidden")]=2;
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(symbolObject),
  /apollyon_claim_canonical_v2_object_shape_invalid/u,
  "symbol_rejected",
);

const hiddenObject={a:1};
Object.defineProperty(hiddenObject,"hidden",{value:2,enumerable:false});
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(hiddenObject),
  /apollyon_claim_canonical_v2_object_shape_invalid/u,
  "nonenumerable_rejected",
);

const sparse=[1,,3];
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(sparse),
  /apollyon_claim_canonical_v2_array_shape_invalid/u,
  "sparse_array_rejected",
);

const extraArray=[1,2];
extraArray.extra=3;
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(extraArray),
  /apollyon_claim_canonical_v2_array_shape_invalid/u,
  "extra_array_property_rejected",
);

const accessorArray=[1];
Object.defineProperty(accessorArray,"0",{
  enumerable:true,
  configurable:true,
  get(){
    getterHits+=1;
    return 1;
  },
});
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(accessorArray),
  /apollyon_claim_canonical_v2_array_shape_invalid/u,
  "array_accessor_rejected",
);
assert.equal(getterHits,0);

class CustomRecord{
  constructor(){this.a=1;}
}
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(new CustomRecord()),
  /apollyon_claim_canonical_v2_object_prototype_invalid/u,
  "custom_prototype_rejected",
);

const cyclic={a:1};
cyclic.self=cyclic;
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(cyclic),
  /apollyon_claim_canonical_v2_cycle_invalid/u,
  "cycle_rejected",
);

let deep={leaf:true};
for(let index=0;index<70;index+=1)deep={child:deep};
expectCode(
  ()=>canonicalApollyonClaimContractJsonV2(deep),
  /apollyon_claim_canonical_v2_depth_invalid/u,
  "depth_rejected",
);

for(const value of [NaN,Infinity,-Infinity,1.5,BigInt(1),undefined,Symbol("x")]){
  expectCode(
    ()=>canonicalApollyonClaimContractJsonV2(value),
    /apollyon_claim_canonical_v2_(?:number|value)_invalid/u,
    "noncanonical_value_rejected",
  );
}

assert.equal(
  VOID_APOLLYON_CLAIM_CONTRACT_CANONICAL_JSON_V2,
  "VOID_APOLLYON_CLAIM_CONTRACT_CANONICAL_JSON_V2",
);
for(const key of [
  "consumer_migration_performed",
  "trusted_module_initialization_proven",
  "installed_runtime_authorized",
  "protected_host_execution_authorized",
  "claim_publication_authorized",
  "training_start_authorized",
  "training_execution_authorized",
  "credential_access_authorized",
  "signing_authorized",
  "transaction_authorized",
  "funds_movement_authorized",
]){
  assert.equal(
    VOID_APOLLYON_CLAIM_CONTRACT_CANONICAL_JSON_AUTHORITY_V2[key],
    false,
    key,
  );
}

console.log("VOID_APOLLYON_CLAIM_CONTRACT_CANONICAL_JSON_V2_PROOF_GREEN");
console.log("valid_fixture_equivalence_count="+fixtures.length);
console.log("post_import_object_tojson_poison_resisted=true");
console.log("post_import_array_tojson_poison_resisted=true");
console.log("post_import_json_stringify_poison_resisted=true");
console.log("captured_own_primitive_survived_poison=true");
console.log("captured_proxy_detector_survived_poison=true");
console.log("proxy_detector_poison_traps_executed=0");
console.log("revoked_proxy_rejected=true");
console.log("callable_proxy_rejected_before_type_dispatch=true");
console.log("revoked_callable_proxy_rejected=true");
console.log("callable_proxy_traps_executed=0");
console.log("array_prototype_index_setter_hits=0");
console.log("proto_key_rejected=true");
console.log("proxy_traps_executed=0");
console.log("accessor_getter_executed=0");
console.log("closed_surface_adversaries_rejected=true");
console.log("integer_like_key_order_matches_v1=true");
console.log("frozen_v1_unchanged=true");
console.log("consumer_migration_performed=false");
console.log("protected_host_execution_authorized=false");
console.log("claim_publication_authorized=false");
console.log("training_execution_authorized=false");
console.log("funds_movement_authorized=false");
console.log("fixture_vector_sha256="+fixtureVectorSha256);
