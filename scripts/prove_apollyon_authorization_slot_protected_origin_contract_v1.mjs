#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  canonicalApollyonClaimContractJsonV1,
} from "../tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
} from "../tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs";
import {
  CANONICALIZER_V1_BLOB_SHA1,
  PARENT_AUTHORIZATION_SLOT_BLOB_SHA1,
  PARENT_HEAD,
  VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_AUTHORITY_V1,
  VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_REQUIREMENTS_V1,
  buildApollyonAuthorizationSlotProtectedOriginCandidateV1,
  qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1,
} from "../tools/apollyon-authorization-slot-protected-origin-contract-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE=
  "tools/apollyon-authorization-slot-protected-origin-contract-v1.mjs";
const SOURCE_BLOB="036252c32f5456610f3c42bdf387450ef3a8b7c4";
const PARENT_SLOT_BLOB="93582c324ca85aeff56eb61f82b32f1e4c18dfe9";
const CANONICALIZER_BLOB="f97fafb0148527ae3a954e2752faef8c7fc9e88e";
const PARENT_SERVICE_CANDIDATE_BLOB=
  "d67ef39c4cd034844fb0862e180de46ed4cd0c88";

function read(relative){
  return fs.readFileSync(path.join(ROOT,relative));
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes)
    .digest("hex");
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value){
  return canonicalApollyonClaimContractJsonV1(value);
}
function expectRejected(fn,pattern){
  assert.throws(fn,pattern);
}
function reflectionTrapProxy(target){
  let trapCalls=0;
  const trip=()=>{
    trapCalls+=1;
    throw new Error("proxy_trap_invoked");
  };
  return {
    proxy:new Proxy(target,{
      get:trip,
      getPrototypeOf:trip,
      getOwnPropertyDescriptor:trip,
      ownKeys:trip,
    }),
    trapCalls:()=>trapCalls,
  };
}
function oversizedKeySet(value,count=4096){
  const bad={...value};
  for(let index=0;index<count;index+=1){
    bad["oversized_unknown_"+index]="x";
  }
  return bad;
}
function expectRejectedBeforeOversizedSort(fn,pattern){
  const originalSort=Array.prototype.sort;
  let oversizedSort=false;
  Array.prototype.sort=function(...args){
    if(this.length>512)oversizedSort=true;
    return originalSort.apply(this,args);
  };
  try{
    expectRejected(fn,pattern);
  }finally{
    Array.prototype.sort=originalSort;
  }
  assert.equal(oversizedSort,false);
}

const exact=Object.freeze({
  [SOURCE]:SOURCE_BLOB,
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs":
    PARENT_SLOT_BLOB,
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    CANONICALIZER_BLOB,
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs":
    PARENT_SERVICE_CANDIDATE_BLOB,
});
for(const [relative,expected] of Object.entries(exact)){
  assert.equal(gitBlob(read(relative)),expected,relative);
}
assert.equal(PARENT_HEAD,"4e7d433a4141b4a7cad7fb001d0800dccb1b5ec2");
assert.equal(PARENT_AUTHORIZATION_SLOT_BLOB_SHA1,PARENT_SLOT_BLOB);
assert.equal(CANONICALIZER_V1_BLOB_SHA1,CANONICALIZER_BLOB);

const slotRecord=
  qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1({
    store_policy_id:
      "apollyon_claim_store_policy_v2:"+
      "e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137",
    authorization_id:"apollyon_authz_v1:"+"1".repeat(64),
    store_contract_id:"apollyon_claim_store_contract_v2:"+"2".repeat(64),
    store_generation_id:"apollyon_claim_store_generation_v2:"+"3".repeat(64),
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"4".repeat(64),
    claim_record_id:"apollyon_attempt_claim_record_v2:"+"5".repeat(64),
    claim_record_sha256:"6".repeat(64),
    publish_request_sha256:"7".repeat(64),
    attempt_limit:1,
    automatic_retry_authorized:false,
  });

const candidate=
  buildApollyonAuthorizationSlotProtectedOriginCandidateV1(slotRecord);
assert.equal(Object.isFrozen(candidate),true);
assert.equal(Object.isFrozen(candidate.requirements),true);
assert.match(
  candidate.protected_origin_contract_id,
  /^apollyon_authorization_slot_protected_origin_v1:[0-9a-f]{64}$/u,
);
assert.deepEqual(
  qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(candidate),
  candidate,
);
assert.equal(candidate.authorization_id,slotRecord.authorization_id);
assert.equal(candidate.authorization_slot_id,slotRecord.authorization_slot_id);
assert.equal(
  candidate.authorization_slot_record_id,
  slotRecord.authorization_slot_record_id,
);
assert.equal(
  candidate.authorization_slot_record_sha256,
  sha256(Buffer.from(canonical(slotRecord)+"\n","utf8")),
);
assert.deepEqual(
  candidate.requirements,
  VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_REQUIREMENTS_V1,
);
assert.equal(candidate.authorization_slot_protected_origin_proven,false);
assert.equal(candidate.authorization_slot_revalidation_performed,false);
assert.equal(candidate.activation_capability_issuance_authorized,false);
assert.equal(candidate.automatic_retry_authorized,false);

{
  const bad=structuredClone(candidate);
  bad.protected_origin_contract_id=
    "apollyon_authorization_slot_protected_origin_v1:"+"0".repeat(64);
  expectRejected(
    ()=>qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /contract_id_invalid/u,
  );
}
for(const [key,value] of [
  ["authorization_slot_protected_origin_proven",true],
  ["authorization_slot_revalidation_performed",true],
  ["activation_capability_issuance_authorized",true],
  ["automatic_retry_authorized",true],
]){
  const bad=structuredClone(candidate);
  bad[key]=value;
  expectRejected(
    ()=>qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /candidate_invalid/u,
  );
}

{
  const hostile=reflectionTrapProxy(slotRecord);
  expectRejected(
    ()=>buildApollyonAuthorizationSlotProtectedOriginCandidateV1(hostile.proxy),
    /slot_invalid/u,
  );
  assert.equal(hostile.trapCalls(),0);
}

{
  const bad=oversizedKeySet(slotRecord);
  expectRejectedBeforeOversizedSort(
    ()=>buildApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /slot_invalid/u,
  );
}

{
  const bad={...slotRecord};
  Object.defineProperty(bad,"hidden_unknown",{
    enumerable:false,
    configurable:true,
    value:"hidden",
  });
  expectRejected(
    ()=>buildApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /slot_invalid/u,
  );
}
{
  const bad={...slotRecord};
  bad[Symbol("hidden_unknown")]="hidden";
  expectRejected(
    ()=>buildApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /slot_invalid/u,
  );
}

{
  const bad={
    ...slotRecord,
    unknown_graph:{payload:"x".repeat(100000)},
  };
  const originalClone=globalThis.structuredClone;
  let cloneCalled=false;
  globalThis.structuredClone=(value)=>{
    cloneCalled=true;
    return originalClone(value);
  };
  try{
    expectRejected(
      ()=>buildApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
      /slot_invalid/u,
    );
    assert.equal(cloneCalled,false);
  }finally{
    globalThis.structuredClone=originalClone;
  }
}
{
  const bad={...slotRecord};
  let getterCalls=0;
  Object.defineProperty(bad,"authorization_id",{
    enumerable:true,
    configurable:true,
    get(){
      getterCalls+=1;
      return getterCalls===1
        ?slotRecord.authorization_id
        :"x".repeat(100000);
    },
  });
  expectRejected(
    ()=>buildApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /slot_invalid/u,
  );
  assert.equal(getterCalls,0);
}
{
  const bad={...slotRecord,authorization_id:[slotRecord.authorization_id]};
  expectRejected(
    ()=>buildApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /slot_invalid/u,
  );
}

{
  const hostile=reflectionTrapProxy(candidate);
  expectRejected(
    ()=>qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(hostile.proxy),
    /candidate_invalid/u,
  );
  assert.equal(hostile.trapCalls(),0);
}
{
  const bad=oversizedKeySet(candidate);
  expectRejectedBeforeOversizedSort(
    ()=>qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /candidate_invalid/u,
  );
}
{
  const bad=structuredClone(candidate);
  const hostile=reflectionTrapProxy(bad.requirements);
  bad.requirements=hostile.proxy;
  expectRejected(
    ()=>qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /requirements_invalid/u,
  );
  assert.equal(hostile.trapCalls(),0);
}

{
  const bad=structuredClone(candidate);
  bad.requirements=oversizedKeySet(bad.requirements);
  expectRejectedBeforeOversizedSort(
    ()=>qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /requirements_invalid/u,
  );
}

{
  const bad={...candidate};
  Object.defineProperty(bad,"hidden_unknown",{
    enumerable:false,
    configurable:true,
    value:"hidden",
  });
  expectRejected(
    ()=>qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /candidate_invalid/u,
  );
}
{
  const bad={...candidate};
  bad[Symbol("hidden_unknown")]="hidden";
  expectRejected(
    ()=>qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /candidate_invalid/u,
  );
}

{
  const bad={...candidate};
  let getterCalls=0;
  Object.defineProperty(bad,"authorization_slot_record_sha256",{
    enumerable:true,
    configurable:true,
    get(){
      getterCalls+=1;
      return getterCalls===1
        ?candidate.authorization_slot_record_sha256
        :"x".repeat(100000);
    },
  });
  expectRejected(
    ()=>qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /candidate_invalid/u,
  );
  assert.equal(getterCalls,0);
}
{
  const bad=structuredClone(candidate);
  let getterCalls=0;
  Object.defineProperty(bad.requirements,"same_protected_claim_root_required",{
    enumerable:true,
    configurable:true,
    get(){
      getterCalls+=1;
      return true;
    },
  });
  expectRejected(
    ()=>qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /requirements_invalid/u,
  );
  assert.equal(getterCalls,0);
}
{
  const bad=structuredClone(candidate);
  bad.authorization_slot_id=[candidate.authorization_slot_id];
  expectRejected(
    ()=>qualifyApollyonAuthorizationSlotProtectedOriginCandidateV1(bad),
    /candidate_invalid/u,
  );
}

for(const [key,expected] of Object.entries({
  source_only_contract:true,
  protected_authorization_slot_store_required:true,
  protected_authorization_slot_store_proven:false,
  same_protected_claim_root_required:true,
  same_protected_claim_root_proven:false,
  descriptor_stable_slot_reread_required:true,
  descriptor_stable_slot_reread_performed:false,
  protected_authorization_slot_origin_required:true,
  protected_authorization_slot_origin_proven:false,
  authorization_slot_revalidation_required:true,
  authorization_slot_revalidation_performed:false,
  activation_capability_issuance_authorized:false,
  activation_capability_issuance_performed:false,
  training_start_consumption_authorized:false,
  training_start_consumption_performed:false,
  training_start_admission:false,
  training_release_authorized:false,
  training_execution_authorized:false,
  training_execution:false,
  filesystem_read:false,
  filesystem_write:false,
  service_action:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_AUTHORITY_V1[key],
    expected,
    key,
  );
}

assert.equal(
  VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_REQUIREMENTS_V1
    .caller_supplied_slot_record_sufficient,
  false,
);
assert.equal(
  VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_REQUIREMENTS_V1
    .authorization_slot_revalidation_immediately_before_capability_issuance_required,
  true,
);

const source=read(SOURCE).toString("utf8");
for(const forbidden of [
  'from "node:fs"',
  'from "node:net"',
  'from "node:child_process"',
  "systemctl",
  "writeFile",
  "appendFile",
  "mkdir",
  "rename",
  "unlink",
  "spawn(",
  "execFile",
  "fetch(",
  "activation_capability_issuance_authorized:true",
  "protected_authorization_slot_origin_proven:true",
  "training_start_consumption_performed:true",
  "training_start_admission:true",
  "training_release_authorized:true",
  "training_execution_authorized:true",
  "funds_movement:true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log(
  "VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_CONTRACT_V1_PROOF_GREEN"
);
console.log("parent_head="+PARENT_HEAD);
console.log("parent_authorization_slot_blob="+PARENT_SLOT_BLOB);
console.log("caller_supplied_slot_record_sufficient=false");
console.log("protected_authorization_slot_store_required=true");
console.log("protected_authorization_slot_store_proven=false");
console.log("protected_authorization_slot_origin_required=true");
console.log("protected_authorization_slot_origin_proven=false");
console.log("authorization_slot_revalidation_required=true");
console.log("authorization_slot_revalidation_performed=false");
console.log("slot_unknown_graph_rejected_before_parent_clone=true");
console.log("slot_accessor_rejected_before_read=true");
console.log("candidate_accessor_rejected_before_read=true");
console.log("requirements_accessor_rejected_before_read=true");
console.log("regex_coercion_rejected=true");
console.log("nonenumerable_unknown_keys_rejected=true");
console.log("symbol_keys_rejected=true");
console.log("slot_proxy_rejected_before_reflection=true");
console.log("candidate_proxy_rejected_before_reflection=true");
console.log("requirements_proxy_rejected_before_reflection=true");
console.log("proxy_reflection_traps_not_invoked=true");
console.log("oversized_keyset_rejected_before_sort=true");
console.log("activation_capability_issuance_authorized=false");
console.log("activation_capability_issuance_performed=false");
console.log("training_start_consumption_performed=false");
console.log("training_start_admission=false");
console.log("training_release_authorized=false");
console.log("training_execution_authorized=false");
console.log("service_action=false");
console.log("funds_movement=false");
