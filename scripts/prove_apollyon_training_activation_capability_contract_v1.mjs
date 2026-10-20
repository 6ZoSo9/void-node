#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1,
  VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_AUTHORITY_V1,
  VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1,
  VOID_APOLLYON_TRAINING_ACTIVATION_GENERATION_BINDING_V1,
  buildApollyonTrainingActivationCapabilityV1,
  buildApollyonTrainingActivationGenerationBindingV1,
  canonicalApollyonTrainingActivationV1,
  hashApollyonTrainingActivationSecretV1,
  qualifyApollyonTrainingActivationCapabilityV1,
  qualifyApollyonTrainingActivationGenerationBindingV1,
} from "../tools/apollyon-training-activation-capability-contract-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE="tools/apollyon-training-activation-capability-contract-v1.mjs";
const SOURCE_BLOB="7af22ba4e4374a5da490d909c32525a68bf0c5d2";
const PARENT_HEAD="d00ca0141db62d752be7ddc6e7d9618e0475d897";
const CONSUMPTION_HEAD="bdadfcc6854d6f4e1804347e51b940e897a8da9f";
const CONSUMPTION_BLOB="42d7d5d4ab75bfd4fc145f63c2a0432f9bcf9bd3";

function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes)
    .digest("hex");
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function read(relative){
  return fs.readFileSync(path.join(ROOT,relative));
}
function cloned(value){
  return structuredClone(value);
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
function revokedProxy(target){
  const state=Proxy.revocable(target,{});
  state.revoke();
  return state.proxy;
}
function oversizedKeySet(value,count=4096){
  const bad={...value};
  for(let index=0;index<count;index+=1){
    bad["oversized_unknown_"+index]="x";
  }
  return bad;
}
function expectRejectedBeforeSort(fn,pattern){
  const originalSort=Array.prototype.sort;
  let sortCalls=0;
  Array.prototype.sort=function(...args){
    sortCalls+=1;
    return originalSort.apply(this,args);
  };
  try{
    expectRejected(fn,pattern);
  }finally{
    Array.prototype.sort=originalSort;
  }
  assert.equal(sortCalls,0);
}

const EXACT_BLOBS=Object.freeze({
  [SOURCE]:SOURCE_BLOB,
  "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v2.py":
    "b57457435cc691ce576ef090e67ba323af254929",
  "ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py":
    "352bd36f2b07091140b990de4170f708eb11fee6",
  "ops/xiphos/void-apollyon-training-bus-isolation-v1.service":
    "62fbabe1cf7ae0d940f5d96e19b06282f841267b",
  "ops/xiphos/apollyon_training_bus_isolation_preentry_v1.c":
    "9503d19c8bc0b4f073ba117f6a547d339b7623d0",
});
for(const [relative,expected] of Object.entries(EXACT_BLOBS)){
  assert.equal(gitBlob(read(relative)),expected,relative);
}

assert.equal(APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.parent_head,PARENT_HEAD);
assert.equal(
  APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_start_consumption_contract_head,
  CONSUMPTION_HEAD,
);
assert.equal(
  APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_start_consumption_contract_blob_sha1,
  CONSUMPTION_BLOB,
);
assert.equal(
  APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_start_consumption_contract_in_parent_lineage,
  false,
);
assert.equal(
  APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_start_consumption_integration_required,
  true,
);

const secret=Buffer.alloc(32,0x42);
const secretHash=hashApollyonTrainingActivationSecretV1(secret);
assert.equal(secretHash,sha256(secret));
expectRejected(
  ()=>hashApollyonTrainingActivationSecretV1(Buffer.alloc(31,0x42)),
  /secret_invalid/u,
);
expectRejected(
  ()=>hashApollyonTrainingActivationSecretV1("not-bytes"),
  /secret_invalid/u,
);
for(const size of [0,1,31,33]){
  expectRejected(
    ()=>hashApollyonTrainingActivationSecretV1(Buffer.alloc(size,0x42)),
    /secret_invalid/u,
  );
  const forged=Buffer.alloc(size,0x42);
  let getterCalls=0;
  Object.defineProperty(forged,"length",{
    configurable:true,
    get(){getterCalls++;return 32;},
  });
  expectRejected(
    ()=>hashApollyonTrainingActivationSecretV1(forged),
    /secret_invalid/u,
  );
  assert.equal(getterCalls,0,"shadowed short Buffer getter must not run");
}
const shadowed32=Buffer.alloc(32,0x42);
let validGetterCalls=0;
Object.defineProperty(shadowed32,"length",{
  configurable:true,
  get(){validGetterCalls++;return 1;},
});
assert.equal(hashApollyonTrainingActivationSecretV1(shadowed32),secretHash);
assert.equal(validGetterCalls,0,"shadowed 32-byte Buffer getter must not run");
expectRejected(
  ()=>hashApollyonTrainingActivationSecretV1(new Uint8Array(32)),
  /secret_invalid/u,
);
const bearerProxy=reflectionTrapProxy(Buffer.alloc(32,0x42));
expectRejected(
  ()=>hashApollyonTrainingActivationSecretV1(bearerProxy.proxy),
  /secret_invalid/u,
);
assert.equal(bearerProxy.trapCalls(),0,"bearer Proxy traps must not run");
expectRejected(
  ()=>hashApollyonTrainingActivationSecretV1(revokedProxy(Buffer.alloc(32,0x42))),
  /secret_invalid/u,
);

const capabilityMaterial={
  activation_capability_issuance_performed:false,
  activation_secret_sha256:secretHash,
  authorization_id:"apollyon_authz_v1:"+"1".repeat(64),
  authorization_slot_external_validation_required:true,
  authorization_slot_id:"apollyon_attempt_claim_auth_slot_v1:"+"2".repeat(64),
  authorization_slot_record_id:
    "apollyon_attempt_claim_auth_slot_record_v1:"+"3".repeat(64),
  capability_replay_authorized:false,
  create_once_key_must_equal_training_start_consumption_slot_id:true,
  credential_name:"apollyon-training-activation-v1",
  custody_generation_id:"apollyon_custody_generation_v1:"+"4".repeat(64),
  direct_systemd_start_without_capability_authorized:false,
  durable_claim_record_id:"apollyon_attempt_claim_record_v2:"+"5".repeat(64),
  durable_claim_record_sha256:"6".repeat(64),
  expected_entrypoint_bytes:
    APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_entrypoint_bytes,
  expected_entrypoint_sha256:
    APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_entrypoint_sha256,
  expected_preentry_sha256:
    APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_preentry_sha256,
  expected_unit_git_blob_sha1:
    APOLLYON_TRAINING_ACTIVATION_DEPENDENCIES_V1.training_unit_blob_sha1,
  external_training_start_consumption_validation_performed:false,
  marker:VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_V1,
  next_gate:"apollyon_training_activation_capability_protected_issuance_v1",
  protected_capability_store_required:true,
  raw_capability_export_authorized:false,
  status:"training_activation_capability_candidate_unissued",
  store_contract_id:"apollyon_claim_store_contract_v2:"+"7".repeat(64),
  store_generation_id:"apollyon_claim_store_generation_v2:"+"8".repeat(64),
  store_policy_id:
    "apollyon_claim_store_policy_v2:"+
    "e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137",
  systemd_caller_identity_authoritative:false,
  systemd_credential_transport_required:true,
  target_host:"Xiphos",
  terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"9".repeat(64),
  training_execution_authorized:false,
  training_start_consumption_contract_blob_sha1:CONSUMPTION_BLOB,
  training_start_consumption_contract_head:CONSUMPTION_HEAD,
  training_start_consumption_contract_in_parent_lineage:false,
  training_start_consumption_integration_required:true,
  training_start_consumption_slot_external_validation_required:true,
  training_start_consumption_slot_id:
    "apollyon_training_start_slot_v1:"+"a".repeat(64),
  version:1,
};
const capability=buildApollyonTrainingActivationCapabilityV1(capabilityMaterial);
assert.equal(Object.isFrozen(capability),true);
assert.match(
  capability.activation_capability_id,
  /^apollyon_training_activation_capability_v1:[0-9a-f]{64}$/u,
);
assert.deepEqual(
  qualifyApollyonTrainingActivationCapabilityV1(capability),
  capability,
);
assert.equal(capability.activation_capability_issuance_performed,false);
assert.equal(capability.external_training_start_consumption_validation_performed,false);
assert.equal(capability.authorization_slot_external_validation_required,true);
assert.equal(
  capability.training_start_consumption_slot_external_validation_required,
  true,
);
assert.equal(capability.protected_capability_store_required,true);
assert.equal(
  capability.create_once_key_must_equal_training_start_consumption_slot_id,
  true,
);
assert.equal(capability.raw_capability_export_authorized,false);
assert.equal(capability.direct_systemd_start_without_capability_authorized,false);
assert.equal(capability.systemd_caller_identity_authoritative,false);
assert.equal(capability.training_execution_authorized,false);

{
  const hostile=reflectionTrapProxy(capabilityMaterial);
  expectRejected(
    ()=>buildApollyonTrainingActivationCapabilityV1(hostile.proxy),
    /capability_invalid/u,
  );
  assert.equal(hostile.trapCalls(),0);
}
{
  const hostile=reflectionTrapProxy(capability);
  expectRejected(
    ()=>qualifyApollyonTrainingActivationCapabilityV1(hostile.proxy),
    /capability_invalid/u,
  );
  assert.equal(hostile.trapCalls(),0);
}

for(const makeInput of [
  ()=>revokedProxy({...capabilityMaterial}),
  ()=>revokedProxy([]),
]){
  expectRejected(
    ()=>buildApollyonTrainingActivationCapabilityV1(makeInput()),
    /capability_invalid/u,
  );
}
for(const makeInput of [
  ()=>revokedProxy({...capability}),
  ()=>revokedProxy([]),
]){
  expectRejected(
    ()=>qualifyApollyonTrainingActivationCapabilityV1(makeInput()),
    /capability_invalid/u,
  );
}

{
  const bad=oversizedKeySet(capabilityMaterial);
  expectRejectedBeforeSort(
    ()=>buildApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}
{
  const bad=oversizedKeySet(capability);
  expectRejectedBeforeSort(
    ()=>qualifyApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}

const capabilityText=canonicalApollyonTrainingActivationV1(capability);
assert.equal(capabilityText.includes(secret.toString("hex")),false);
assert.equal(capabilityText.includes(secret.toString("base64")),false);

{
  const bad=cloned(capability);
  bad.raw_activation_secret=secret.toString("hex");
  expectRejected(
    ()=>qualifyApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}
{
  const bad=cloned(capability);
  bad.activation_capability_id=
    "apollyon_training_activation_capability_v1:"+"0".repeat(64);
  expectRejected(
    ()=>qualifyApollyonTrainingActivationCapabilityV1(bad),
    /capability_id_invalid/u,
  );
}
{
  const bad={...capabilityMaterial};
  Object.defineProperty(bad,"hidden_unknown",{
    enumerable:false,
    configurable:true,
    value:"hidden",
  });
  expectRejected(
    ()=>buildApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}
{
  const bad={...capabilityMaterial};
  bad[Symbol("hidden_unknown")]="hidden";
  expectRejected(
    ()=>buildApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}

{
  const bad={
    ...capabilityMaterial,
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
      ()=>buildApollyonTrainingActivationCapabilityV1(bad),
      /capability_invalid/u,
    );
    assert.equal(cloneCalled,false);
  }finally{
    globalThis.structuredClone=originalClone;
  }
}
{
  const bad={...capabilityMaterial};
  let getterCalls=0;
  Object.defineProperty(bad,"activation_secret_sha256",{
    enumerable:true,
    configurable:true,
    get(){
      getterCalls+=1;
      return getterCalls===1?secretHash:"x".repeat(100000);
    },
  });
  expectRejected(
    ()=>buildApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
  assert.equal(getterCalls,0);
}
{
  const bad={...capability};
  let getterCalls=0;
  Object.defineProperty(bad,"authorization_id",{
    enumerable:true,
    configurable:true,
    get(){
      getterCalls+=1;
      return getterCalls===1
        ?capability.authorization_id
        :"x".repeat(100000);
    },
  });
  expectRejected(
    ()=>qualifyApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
  assert.equal(getterCalls,0);
}

for(const key of [
  "activation_secret_sha256",
  "authorization_id",
  "authorization_slot_id",
  "authorization_slot_record_id",
  "custody_generation_id",
  "durable_claim_record_id",
  "store_contract_id",
  "store_generation_id",
  "store_policy_id",
  "terminal_receipt_id",
  "training_start_consumption_slot_id",
]){
  const bad={...capabilityMaterial,[key]:[capabilityMaterial[key]]};
  expectRejected(
    ()=>buildApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}
{
  const bad={
    ...capabilityMaterial,
    authorization_id:new String(capabilityMaterial.authorization_id),
  };
  expectRejected(
    ()=>buildApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}
{
  const bad=cloned(capability);
  bad.activation_capability_id=[capability.activation_capability_id];
  expectRejected(
    ()=>qualifyApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}

for(const [key,value] of [
  ["activation_capability_issuance_performed",true],
  ["external_training_start_consumption_validation_performed",true],
  ["authorization_slot_external_validation_required",false],
  ["training_start_consumption_slot_external_validation_required",false],
  ["training_start_consumption_contract_in_parent_lineage",true],
  ["training_start_consumption_integration_required",false],
  ["direct_systemd_start_without_capability_authorized",true],
  ["systemd_caller_identity_authoritative",true],
  ["capability_replay_authorized",true],
  ["raw_capability_export_authorized",true],
  ["protected_capability_store_required",false],
  ["create_once_key_must_equal_training_start_consumption_slot_id",false],
  ["training_execution_authorized",true],
]){
  const bad={...capabilityMaterial,[key]:value};
  expectRejected(
    ()=>buildApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}
for(const [key,value] of [
  ["training_start_consumption_contract_head","f".repeat(40)],
  ["training_start_consumption_contract_blob_sha1","f".repeat(40)],
]){
  const bad={...capabilityMaterial,[key]:value};
  expectRejected(
    ()=>buildApollyonTrainingActivationCapabilityV1(bad),
    /capability_invalid/u,
  );
}

const bindingMaterial={
  activation_capability_id:capability.activation_capability_id,
  activation_generation_binding_required:true,
  activation_generation_bound:false,
  activation_secret_possession_proof_required:true,
  activation_secret_possession_proven:false,
  activation_secret_sha256:capability.activation_secret_sha256,
  boot_id_sha256:"b".repeat(64),
  credential_name:capability.credential_name,
  marker:VOID_APOLLYON_TRAINING_ACTIVATION_GENERATION_BINDING_V1,
  next_gate:"apollyon_training_start_consumption_integration_v1",
  observed_preentry_sha256:capability.expected_preentry_sha256,
  status:"training_activation_capability_generation_binding_candidate",
  systemd_caller_identity_authoritative:false,
  systemd_invocation_generation_observation_performed:false,
  systemd_invocation_id:"c".repeat(32),
  target_host:"Xiphos",
  trainer_generation_external_contract_validation_performed:false,
  trainer_generation_external_contract_validation_required:true,
  trainer_generation_id:"apollyon_pretraining_generation_v1:"+"d".repeat(64),
  training_execution_authorized:false,
  training_gid:984,
  training_pid:4242,
  training_process_start_time_ticks:"123456",
  training_release_authorized:false,
  training_source_identity_sha256:"e".repeat(64),
  training_start_admission:false,
  training_start_consumption_performed:false,
  training_start_consumption_record_origin_proven:false,
  training_start_consumption_record_required:true,
  training_start_consumption_slot_id:
    capability.training_start_consumption_slot_id,
  training_uid:997,
  version:1,
};
const binding=buildApollyonTrainingActivationGenerationBindingV1(
  capability,
  bindingMaterial,
);
assert.equal(Object.isFrozen(binding),true);
assert.match(
  binding.activation_binding_id,
  /^apollyon_training_activation_binding_v1:[0-9a-f]{64}$/u,
);
assert.deepEqual(
  qualifyApollyonTrainingActivationGenerationBindingV1(capability,binding),
  binding,
);
assert.equal(binding.activation_generation_binding_required,true);
assert.equal(binding.activation_generation_bound,false);
assert.equal(binding.activation_secret_possession_proof_required,true);
assert.equal(binding.activation_secret_possession_proven,false);
assert.equal(binding.systemd_invocation_generation_observation_performed,false);
assert.equal(binding.trainer_generation_external_contract_validation_required,true);
assert.equal(binding.trainer_generation_external_contract_validation_performed,false);
assert.equal(binding.training_start_consumption_record_required,true);
assert.equal(binding.training_start_consumption_record_origin_proven,false);
assert.equal(binding.training_start_consumption_performed,false);
assert.equal(binding.training_start_admission,false);
assert.equal(binding.training_release_authorized,false);
assert.equal(binding.training_execution_authorized,false);

{
  const hostile=reflectionTrapProxy(bindingMaterial);
  expectRejected(
    ()=>buildApollyonTrainingActivationGenerationBindingV1(
      capability,
      hostile.proxy,
    ),
    /binding_invalid/u,
  );
  assert.equal(hostile.trapCalls(),0);
}
{
  const hostile=reflectionTrapProxy(binding);
  expectRejected(
    ()=>qualifyApollyonTrainingActivationGenerationBindingV1(
      capability,
      hostile.proxy,
    ),
    /binding_invalid/u,
  );
  assert.equal(hostile.trapCalls(),0);
}

for(const makeInput of [
  ()=>revokedProxy({...bindingMaterial}),
  ()=>revokedProxy([]),
]){
  expectRejected(
    ()=>buildApollyonTrainingActivationGenerationBindingV1(
      capability,
      makeInput(),
    ),
    /binding_invalid/u,
  );
}
for(const makeInput of [
  ()=>revokedProxy({...binding}),
  ()=>revokedProxy([]),
]){
  expectRejected(
    ()=>qualifyApollyonTrainingActivationGenerationBindingV1(
      capability,
      makeInput(),
    ),
    /binding_invalid/u,
  );
}

{
  const bad=oversizedKeySet(bindingMaterial);
  expectRejectedBeforeSort(
    ()=>buildApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_invalid/u,
  );
}
{
  const bad=oversizedKeySet(binding);
  expectRejectedBeforeSort(
    ()=>qualifyApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_invalid/u,
  );
}

{
  const bad=cloned(binding);
  bad.activation_binding_id=
    "apollyon_training_activation_binding_v1:"+"0".repeat(64);
  expectRejected(
    ()=>qualifyApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_id_invalid/u,
  );
}
{
  const bad=cloned(binding);
  bad.raw_activation_secret=secret.toString("hex");
  expectRejected(
    ()=>qualifyApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_invalid/u,
  );
}
{
  const bad=cloned(binding);
  bad.training_process_start_time_ticks="1".repeat(100000);
  expectRejected(
    ()=>qualifyApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_invalid/u,
  );
}

{
  const bad={...bindingMaterial};
  Object.defineProperty(bad,"hidden_unknown",{
    enumerable:false,
    configurable:true,
    value:"hidden",
  });
  expectRejected(
    ()=>buildApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_invalid/u,
  );
}
{
  const bad={...bindingMaterial};
  bad[Symbol("hidden_unknown")]="hidden";
  expectRejected(
    ()=>buildApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_invalid/u,
  );
}

{
  const bad={
    ...bindingMaterial,
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
      ()=>buildApollyonTrainingActivationGenerationBindingV1(capability,bad),
      /binding_invalid/u,
    );
    assert.equal(cloneCalled,false);
  }finally{
    globalThis.structuredClone=originalClone;
  }
}
{
  const bad={...bindingMaterial};
  let getterCalls=0;
  Object.defineProperty(bad,"systemd_invocation_id",{
    enumerable:true,
    configurable:true,
    get(){
      getterCalls+=1;
      return getterCalls===1
        ?bindingMaterial.systemd_invocation_id
        :"x".repeat(100000);
    },
  });
  expectRejected(
    ()=>buildApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_invalid/u,
  );
  assert.equal(getterCalls,0);
}
{
  const bad={...binding};
  let getterCalls=0;
  Object.defineProperty(bad,"training_source_identity_sha256",{
    enumerable:true,
    configurable:true,
    get(){
      getterCalls+=1;
      return getterCalls===1
        ?binding.training_source_identity_sha256
        :"x".repeat(100000);
    },
  });
  expectRejected(
    ()=>qualifyApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_invalid/u,
  );
  assert.equal(getterCalls,0);
}

for(const key of [
  "activation_capability_id",
  "activation_secret_sha256",
  "boot_id_sha256",
  "systemd_invocation_id",
  "trainer_generation_id",
  "training_source_identity_sha256",
  "training_start_consumption_slot_id",
]){
  const bad={...bindingMaterial,[key]:[bindingMaterial[key]]};
  expectRejected(
    ()=>buildApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_invalid/u,
  );
}
{
  const bad={
    ...bindingMaterial,
    systemd_invocation_id:new String(bindingMaterial.systemd_invocation_id),
  };
  expectRejected(
    ()=>buildApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_invalid/u,
  );
}

for(const [key,value] of [
  ["activation_capability_id","apollyon_training_activation_capability_v1:"+"f".repeat(64)],
  ["activation_secret_sha256","f".repeat(64)],
  ["training_start_consumption_slot_id","apollyon_training_start_slot_v1:"+"f".repeat(64)],
  ["systemd_invocation_id","BAD"],
  ["training_pid",1],
  ["training_process_start_time_ticks","0"],
  ["training_process_start_time_ticks","18446744073709551616"],
  ["training_process_start_time_ticks","1".repeat(21)],
  ["training_uid",0],
  ["training_gid",0],
  ["training_source_identity_sha256","f".repeat(63)],
  ["trainer_generation_id","apollyon_pretraining_generation_v1:"+"f".repeat(63)],
  ["observed_preentry_sha256","f".repeat(64)],
  ["systemd_caller_identity_authoritative",true],
  ["activation_generation_binding_required",false],
  ["activation_generation_bound",true],
  ["activation_secret_possession_proof_required",false],
  ["activation_secret_possession_proven",true],
  ["systemd_invocation_generation_observation_performed",true],
  ["trainer_generation_external_contract_validation_required",false],
  ["trainer_generation_external_contract_validation_performed",true],
  ["training_start_consumption_record_required",false],
  ["training_start_consumption_record_origin_proven",true],
  ["training_start_consumption_performed",true],
  ["training_start_admission",true],
  ["training_release_authorized",true],
  ["training_execution_authorized",true],
]){
  const bad={...bindingMaterial,[key]:value};
  expectRejected(
    ()=>buildApollyonTrainingActivationGenerationBindingV1(capability,bad),
    /binding_invalid/u,
  );
}

for(const [key,expected] of Object.entries({
  source_contract_only:true,
  activation_capability_issuance_performed:false,
  protected_capability_store_required:true,
  protected_capability_store_implemented:false,
  create_once_key_is_training_start_consumption_slot:true,
  external_training_start_consumption_contract_required:true,
  external_training_start_consumption_contract_in_parent_lineage:false,
  external_training_start_consumption_integration_required:true,
  external_training_start_consumption_validation_performed:false,
  authorization_slot_external_validation_required:true,
  training_start_slot_external_validation_required:true,
  systemd_credential_transport_selected_as_candidate:true,
  systemd_credential_runtime_proven:false,
  service_activation_authorized:false,
  service_action:false,
  systemd_mutation:false,
  host_installation:false,
  filesystem_read:false,
  filesystem_write:false,
  network_access:false,
  training_start_consumption_performed:false,
  training_start_admission:false,
  training_release_authorized:false,
  training_execution_authorized:false,
  training_execution:false,
  candidate_weight_mutation:false,
  credential_access:false,
  private_key_access:false,
  signing:false,
  wallet_access:false,
  transaction:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=read(SOURCE).toString("utf8");
for(const forbidden of [
  'from "node:fs"',
  'from "node:net"',
  'from "node:child_process"',
  "systemctl",
  "LoadCredential=",
  "writeFile",
  "appendFile",
  "mkdir",
  "rename",
  "spawn(",
  "execFile",
  "fetch(",
  "VOID_APOLLYON_TRAINING_ACTIVATION_CONSUMPTION_V1",
  "apollyon_training_activation_consumption_v1:",
  "training_start_admission!==true",
  "training_release_authorized!==true",
  "training_execution_authorized!==true",
  "service_activation_authorized:true",
  "funds_movement:true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_APOLLYON_TRAINING_ACTIVATION_CAPABILITY_CONTRACT_V1_PROOF_GREEN");
console.log("source_blob="+SOURCE_BLOB);
console.log("parent_head="+PARENT_HEAD);
console.log("external_consumption_head="+CONSUMPTION_HEAD);
console.log("external_consumption_blob="+CONSUMPTION_BLOB);
console.log("existing_training_start_consumption_contract_reused=true");
console.log("second_consumption_namespace_defined=false");
console.log("capability_content_addressed=true");
console.log("raw_activation_secret_not_in_receipt=true");
console.log("activation_capability_issuance_performed=false");
console.log("protected_capability_store_required=true");
console.log("create_once_key_is_training_start_consumption_slot=true");
console.log("external_consumption_validation_performed=false");
console.log("direct_systemd_start_without_capability_authorized=false");
console.log("systemd_caller_identity_authoritative=false");
console.log("systemd_credential_transport_candidate_only=true");
console.log("systemd_credential_runtime_proven=false");
console.log("activation_secret_possession_proven=false");
console.log("activation_generation_bound=false");
console.log("activation_secret_intrinsic_byte_length_bound=true");
console.log("activation_secret_shadowed_length_getter_calls=0");
console.log("activation_secret_proxy_traps_not_invoked=true");
console.log("start_ticks_preclone_length_bound=true");
console.log("start_ticks_u64_range_bound=true");
console.log("unknown_object_graph_rejected_before_clone=true");
console.log("regex_coercion_identifiers_rejected=true");
console.log("boxed_string_identifiers_rejected=true");
console.log("accessor_fields_rejected_before_read=true");
console.log("validated_descriptor_snapshot_cloned=true");
console.log("nonenumerable_unknown_keys_rejected=true");
console.log("symbol_keys_rejected=true");
console.log("proxy_inputs_rejected_before_reflection=true");
console.log("proxy_reflection_traps_not_invoked=true");
console.log("revoked_proxy_inputs_rejected_namespaced=true");
console.log("oversized_keyset_rejected_before_sort=true");
console.log("trainer_generation_external_validation_performed=false");
console.log("training_start_consumption_record_origin_proven=false");
console.log("training_start_consumption_performed=false");
console.log("training_start_admission=false");
console.log("training_release_authorized=false");
console.log("training_execution_authorized=false");
console.log("service_action=false");
console.log("funds_movement=false");
