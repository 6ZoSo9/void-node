#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {types as utilTypes} from "node:util";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  canonicalApollyonClaimContractJsonV1,
} from "../tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  qualifyApollyonDurableAttemptClaimStorePolicyV2,
} from "../tools/apollyon-durable-attempt-claim-store-contract-v2.mjs";
import {
  qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
} from "../tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs";
import {
  qualifyApollyonTrainingStartConsumptionContractV1,
} from "../tools/apollyon-training-start-consumption-contract-v1.mjs";
import {
  APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_MATERIAL_KEYS_V2,
  APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2,
  VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_AUTHORITY_V2,
  buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV2,
  encodeApollyonTrainingStartProtectedStoreRevalidatorCandidateV2,
  qualifyApollyonTrainingStartProtectedStoreRevalidatorAgainstRequestV2,
  qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2,
} from "../tools/apollyon-training-start-protected-store-revalidator-contract-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE_REL=
  "tools/apollyon-training-start-protected-store-revalidator-contract-v2.mjs";
const PINS=Object.freeze({
  [SOURCE_REL]:"1699ac4d826e778854ea0c91541cf4412b30fb50",
  "tools/apollyon-training-start-store-revalidation-request-v1.mjs":
    "079576db7f880872f2d4dea8e7759bd536161516",
  "tools/apollyon-training-start-consumption-protected-writer-v1.mjs":
    "76f5a6bcbc9854a1133cd1324eb862cb50102c0e",
  "ops/xiphos/apollyon_training_start_consumption_directory_custody_candidate_v1.py":
    "ed6eb47c2f83b35b489d0e9034a4b87c2d10b9dd",
});

function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries(PINS)){
  assert.equal(
    gitBlob(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    relative,
  );
}

const policy=qualifyApollyonDurableAttemptClaimStorePolicyV2();

function claimRecord(overrides={}){
  const material={
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_V2",
    version:2,
    status:"durable_candidate_training_attempt_claim_record_v2",
    store_contract_id:"apollyon_claim_store_contract_v2:"+"1".repeat(64),
    store_policy_id:policy.store_policy_id,
    store_generation_id:"apollyon_claim_store_generation_v2:"+"2".repeat(64),
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"3".repeat(64),
    terminal_runner_receipt_sha256:"4".repeat(64),
    authorization_id:"apollyon_authz_v1:"+"5".repeat(64),
    custody_generation_id:"apollyon_custody_generation_v1:"+"6".repeat(64),
    custody_record_sha256:"7".repeat(64),
    request_sha256:"8".repeat(64),
    canonical_main:"9".repeat(40),
    canonical_tree:"a".repeat(40),
    corpus_sha256:"b".repeat(64),
    parent_adapter_sha256:"c".repeat(64),
    operator_public_key_raw_sha256:"d".repeat(64),
    attempt_limit:1,
    automatic_retry_authorized:false,
    ...overrides,
  };
  return {
    ...material,
    claim_record_id:"apollyon_attempt_claim_record_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
  };
}
function success(record,publishRequestSha){
  return {
    marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RESPONSE_V2",
    version:2,
    status:"durable_claim_success_v2",
    outcome:"created_durable",
    store_contract_id:record.store_contract_id,
    store_policy_id:record.store_policy_id,
    store_generation_id:record.store_generation_id,
    terminal_receipt_id:record.terminal_receipt_id,
    authorization_id:record.authorization_id,
    custody_generation_id:record.custody_generation_id,
    claim_record_id:record.claim_record_id,
    claim_record_sha256:sha256(Buffer.from(
      canonicalApollyonClaimContractJsonV1(record)+"\n","utf8"
    )),
    publish_request_sha256:publishRequestSha,
    durability_proven:true,
    final_visible_record_revalidated:true,
    training_start_admission:false,
    training_start_consumption_required:true,
    training_start_consumption_performed:false,
    next_gate:"apollyon_training_start_consumption_v1",
  };
}
function authorizationSlotRecord(record,publishRequestSha){
  return qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1({
    store_policy_id:record.store_policy_id,
    authorization_id:record.authorization_id,
    store_contract_id:record.store_contract_id,
    store_generation_id:record.store_generation_id,
    terminal_receipt_id:record.terminal_receipt_id,
    claim_record_id:record.claim_record_id,
    claim_record_sha256:sha256(Buffer.from(
      canonicalApollyonClaimContractJsonV1(record)+"\n","utf8"
    )),
    publish_request_sha256:publishRequestSha,
    attempt_limit:1,
    automatic_retry_authorized:false,
  });
}
function trainer(overrides={}){
  const material={
    marker:"VOID_APOLLYON_PRETRAINING_ADMISSION_GENERATION_V1",
    version:1,
    boot_id_sha256:"f".repeat(64),
    pid:4242,
    process_start_time_ticks:"123456",
    uid:997,
    gid:984,
    source_identity_sha256:"0".repeat(64),
    admission_blocked:true,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    automatic_retry_authorized:false,
    ...overrides,
  };
  return {
    ...material,
    trainer_generation_id:"apollyon_pretraining_generation_v1:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
  };
}
function consumptionRecord(overrides={}){
  const record=overrides.claim_record??claimRecord();
  const publishRequestSha=overrides.publish_request_sha256??"e".repeat(64);
  const trainerGeneration=overrides.trainer_generation??trainer();
  return qualifyApollyonTrainingStartConsumptionContractV1({
    authorization_slot_record:
      overrides.authorization_slot_record??
      authorizationSlotRecord(record,publishRequestSha),
    claim_record:record,
    publish_request_sha256:publishRequestSha,
    success_response:
      overrides.success_response??success(record,publishRequestSha),
    trainer_generation:trainerGeneration,
  }).consumption_record;
}

const record=consumptionRecord();
const requestInput=Object.freeze({consumption_record:record});
const candidate=
  buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(requestInput);
const candidateAgain=
  buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(requestInput);
assert.deepEqual(candidateAgain,candidate);
assert(Object.isFrozen(candidate));
assert.equal(candidate.version,2);
assert.match(
  candidate.revalidator_candidate_id,
  /^apollyon_training_start_protected_store_revalidator_v2:[0-9a-f]{64}$/u,
);
assert.equal(
  candidate.parent_head,
  "550020518c2e4d7392b42d79cb83a3aee99f8c1e",
);
assert.equal(
  candidate.parent_revalidation_request_blob_sha1,
  "079576db7f880872f2d4dea8e7759bd536161516",
);
assert.equal(
  candidate.parent_protected_writer_blob_sha1,
  "76f5a6bcbc9854a1133cd1324eb862cb50102c0e",
);
assert.equal(
  candidate.parent_directory_custody_source_blob_sha1,
  "ed6eb47c2f83b35b489d0e9034a4b87c2d10b9dd",
);
assert.equal(
  candidate.reviewed_canonicalizer_v2_head,
  "1f5dbd8f505d90ed197e80a97015066c567e8ced",
);
assert.equal(
  candidate.reviewed_canonicalizer_v2_blob_sha1,
  "4d4b970fa2df3a3e7cae176b18c62aff52e94adc",
);
{
  const superseded={
    ...candidate,
    reviewed_canonicalizer_v2_head:
      "4306d608fbf5b13a8e20b02d8d416b9f55726b8f",
    reviewed_canonicalizer_v2_blob_sha1:
      "6e8056287ae4ac8c73b9230679a6a4b570d8eac8",
  };
  assert.throws(
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(
      superseded,
    ),
    /v2_candidate_invalid/u,
  );
}

assert.equal(
  candidate.fixed_claim_state_root,
  "/var/lib/void-apollyon-attempt-claim-v2",
);
assert.equal(
  candidate.fixed_training_start_consumption_directory,
  "/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1",
);
for(const key of [
  "store_policy_id","store_contract_id","store_generation_id",
  "terminal_receipt_id","authorization_id","authorization_slot_id",
  "authorization_slot_record_id","custody_generation_id",
  "custody_record_sha256","claim_record_id","claim_record_sha256",
  "publish_request_sha256","training_start_consumption_slot_id",
  "training_start_consumption_id","trainer_generation_id",
  "trainer_boot_id_sha256","trainer_pid","trainer_process_start_time_ticks",
  "trainer_uid","trainer_gid","trainer_source_identity_sha256",
]){
  assert.equal(candidate[key],record[key],key);
}
assert.equal(
  qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(candidate)
    .revalidator_candidate_id,
  candidate.revalidator_candidate_id,
);
assert.equal(
  qualifyApollyonTrainingStartProtectedStoreRevalidatorAgainstRequestV2(
    requestInput,candidate,
  ).revalidator_candidate_id,
  candidate.revalidator_candidate_id,
);

for(const key of [
  "source_contract_only","flat_primitive_content_address_required",
  "candidate_frame_hash_json_independent",
  "reviewed_canonicalizer_v2_required_for_future_host",
  "fixture_terminal_root_policy_revalidation_source_bound",
  "trusted_ancestor_custody_required",
  "root_and_consumption_access_acl_absence_required",
  "root_and_consumption_default_acl_absence_required",
  "symlink_fifo_device_hardlink_rejection_required",
  "record_regular_single_link_required",
  "record_bounded_canonical_eof_required",
  "record_retained_visible_generation_required",
  "terminal_receipt_reread_required",
  "custody_record_reread_required",
  "publish_request_binding_revalidation_required",
  "transaction_lease_fencing_required",
  "lease_loss_maps_to_hold_required",
  "indeterminate_close_maps_to_hold_required",
  "automatic_retry_forbidden",
  "fixture_custody_source_required",
  "protected_store_origin_required",
  "current_store_generation_revalidation_required",
  "store_generation_record_reread_required",
  "generation_lineage_revalidation_required",
  "durable_claim_record_reread_required",
  "authorization_winner_reread_required",
  "consumption_slot_classification_required",
  "writer_directory_capability_from_fixed_root_required",
  "writer_directory_capability_exact_path_required",
  "fixed_root_visible_generation_revalidation_required",
  "fixed_consumption_directory_visible_generation_revalidation_required",
  "same_store_generation_through_writer_required",
  "protected_writer_invocation_required",
]){
  assert.equal(candidate[key],true,key);
}
for(const key of [
  "reviewed_canonicalizer_v2_host_integration_proven",
  "parent_revalidation_request_v1_host_realm_proven",
  "candidate_material_derivation_host_realm_proven",
  "trusted_ancestor_custody_proven",
  "root_and_consumption_acl_policy_revalidated",
  "record_type_link_bounds_revalidated",
  "record_terminal_eof_revalidated",
  "terminal_receipt_reread_performed",
  "custody_record_reread_performed",
  "publish_request_binding_revalidation_performed",
  "transaction_lease_fencing_performed",
  "fixture_custody_receipt_authoritative","protected_store_origin_proven",
  "current_store_generation_revalidation_performed",
  "store_generation_record_reread_performed",
  "generation_lineage_revalidation_performed",
  "durable_claim_record_reread_performed","authorization_winner_reread_performed",
  "consumption_slot_classification_performed",
  "writer_directory_capability_exact_path_proven",
  "writer_directory_capability_origin_proven",
  "fixed_root_visible_generation_revalidation_performed",
  "fixed_consumption_directory_visible_generation_revalidation_performed",
  "protected_writer_invocation_authorized","live_host_observation_performed",
  "filesystem_read","filesystem_write","service_action","network_access",
  "credential_access","private_key_access","signing","wallet_access",
  "transaction","funds_movement","training_start_consumption_performed",
  "trainer_release_authorized","trainer_release_performed",
  "training_execution_authorized","training_execution_performed",
  "candidate_weight_mutation_performed",
]){
  assert.equal(candidate[key],false,key);
}
for(const [key,expected] of Object.entries({
  source_contract_only:true,
  public_candidate_only:true,
  candidate_is_bearer_authority:false,
  flat_primitive_content_address_required:true,
  candidate_frame_hash_json_independent:true,
  reviewed_canonicalizer_v2_required_for_future_host:true,
  reviewed_canonicalizer_v2_host_integration_proven:false,
  parent_revalidation_request_v1_host_realm_proven:false,
  candidate_material_derivation_host_realm_proven:false,
  fixture_terminal_root_policy_revalidation_source_bound:true,
  trusted_ancestor_custody_required:true,
  trusted_ancestor_custody_proven:false,
  root_and_consumption_access_acl_absence_required:true,
  root_and_consumption_default_acl_absence_required:true,
  root_and_consumption_acl_policy_revalidated:false,
  symlink_fifo_device_hardlink_rejection_required:true,
  record_regular_single_link_required:true,
  record_type_link_bounds_revalidated:false,
  record_bounded_canonical_eof_required:true,
  record_terminal_eof_revalidated:false,
  record_retained_visible_generation_required:true,
  terminal_receipt_reread_required:true,
  terminal_receipt_reread_performed:false,
  custody_record_reread_required:true,
  custody_record_reread_performed:false,
  publish_request_binding_revalidation_required:true,
  publish_request_binding_revalidation_performed:false,
  transaction_lease_fencing_required:true,
  transaction_lease_fencing_performed:false,
  lease_loss_maps_to_hold_required:true,
  indeterminate_close_maps_to_hold_required:true,
  automatic_retry_forbidden:true,
  fixture_custody_source_required:true,
  fixture_custody_receipt_authoritative:false,
  protected_store_origin_proven:false,
  protected_writer_invocation_authorized:false,
  live_host_observation_performed:false,
  filesystem_read:false,
  filesystem_write:false,
  service_action:false,
  network_access:false,
  credential_access:false,
  transaction:false,
  funds_movement:false,
  training_execution_authorized:false,
})){
  assert.equal(
    VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_AUTHORITY_V2[key],
    expected,key,
  );
}

assert.equal(
  APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V2.head,
  "550020518c2e4d7392b42d79cb83a3aee99f8c1e",
);
assert.equal(
  new Set(APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_MATERIAL_KEYS_V2)
    .size,
  APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_MATERIAL_KEYS_V2.length,
);

// Candidate input accessors and Proxies are rejected before caller code runs.
{
  let getterCalls=0;
  const hostile={...candidate};
  Object.defineProperty(hostile,"claim_record_id",{
    enumerable:true,
    get(){getterCalls+=1;return candidate.claim_record_id;},
  });
  assert.throws(
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(hostile),
    /v2_candidate_schema_invalid/u,
  );
  assert.equal(getterCalls,0);
}
{
  let traps=0;
  const proxy=new Proxy(candidate,{
    get(){traps+=1;throw new Error("trap");},
    getPrototypeOf(){traps+=1;throw new Error("trap");},
    ownKeys(){traps+=1;throw new Error("trap");},
    getOwnPropertyDescriptor(){traps+=1;throw new Error("trap");},
  });
  assert.throws(
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(proxy),
    /v2_candidate_schema_invalid/u,
  );
  assert.equal(traps,0);
}
{
  const revoked=Proxy.revocable(candidate,{});
  revoked.revoke();
  assert.throws(
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(
      revoked.proxy,
    ),
    /v2_candidate_schema_invalid/u,
  );
}
{
  const before=Buffer.from(
    encodeApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(candidate),
  );
  const originalStringify=JSON.stringify;
  const originalGetPrototypeOf=Object.getPrototypeOf;
  const originalGetOwnPropertyDescriptor=Object.getOwnPropertyDescriptor;
  const originalDefineProperty=Object.defineProperty;
  const originalHasOwn=Object.hasOwn;
  const originalCreate=Object.create;
  const originalFreeze=Object.freeze;
  const originalOwnKeys=Reflect.ownKeys;
  const originalReflectApply=Reflect.apply;
  const originalIsSafeInteger=Number.isSafeInteger;
  const originalIsArray=Array.isArray;
  const originalArrayIterator=Array.prototype[Symbol.iterator];
  const originalArrayZero=
    Object.getOwnPropertyDescriptor(Array.prototype,"0");
  const originalIsProxy=utilTypes.isProxy;
  const originalRegExpTest=RegExp.prototype.test;
  const originalRegExpExec=RegExp.prototype.exec;
  const originalBufferLength=
    originalGetOwnPropertyDescriptor(Buffer.prototype,"length");
  const hashPrototype=Object.getPrototypeOf(crypto.createHash("sha256"));
  const originalHashUpdate=hashPrototype.update;
  const originalHashDigest=hashPrototype.digest;
  const originalBufferFrom=Buffer.from;
  const originalBufferConcat=Buffer.concat;
  const originalBufferAlloc=Buffer.alloc;
  const originalWriteUInt32BE=Buffer.prototype.writeUInt32BE;
  const originalTypedArraySet=Uint8Array.prototype.set;
  const originalString=globalThis.String;
  let toJSONGetterCalls=0;
  let arrayIndexSetterCalls=0;
  originalDefineProperty(Object.prototype,"toJSON",{
    configurable:true,
    get(){
      toJSONGetterCalls+=1;
      return function(){return {spoofed:true};};
    },
  });
  originalDefineProperty(Array.prototype,"0",{
    configurable:true,
    set(){arrayIndexSetterCalls+=1;},
  });
  JSON.stringify=()=>{throw new Error("poisoned JSON.stringify");};
  Object.getPrototypeOf=()=>{throw new Error("poisoned Object.getPrototypeOf");};
  Object.getOwnPropertyDescriptor=()=>{throw new Error("poisoned descriptor");};
  Object.defineProperty=()=>{throw new Error("poisoned defineProperty");};
  Object.hasOwn=()=>{throw new Error("poisoned hasOwn");};
  Object.create=()=>{throw new Error("poisoned Object.create");};
  Object.freeze=()=>{throw new Error("poisoned Object.freeze");};
  Reflect.ownKeys=()=>{throw new Error("poisoned ownKeys");};
  Reflect.apply=()=>{throw new Error("poisoned Reflect.apply");};
  Number.isSafeInteger=()=>{throw new Error("poisoned isSafeInteger");};
  Array.isArray=()=>{throw new Error("poisoned isArray");};
  Array.prototype[Symbol.iterator]=function(){
    throw new Error("poisoned Array iterator");
  };
  utilTypes.isProxy=()=>{throw new Error("poisoned isProxy");};
  RegExp.prototype.test=()=>{throw new Error("poisoned RegExp.test");};
  RegExp.prototype.exec=()=>{throw new Error("poisoned RegExp.exec");};
  originalDefineProperty(Buffer.prototype,"length",{
    configurable:true,
    get(){throw new Error("poisoned Buffer.length");},
  });
  hashPrototype.update=()=>{throw new Error("poisoned Hash.update");};
  hashPrototype.digest=()=>{throw new Error("poisoned Hash.digest");};
  Buffer.from=()=>{throw new Error("poisoned Buffer.from");};
  Buffer.concat=()=>{throw new Error("poisoned Buffer.concat");};
  Buffer.alloc=()=>{throw new Error("poisoned Buffer.alloc");};
  Buffer.prototype.writeUInt32BE=()=>{
    throw new Error("poisoned writeUInt32BE");
  };
  Uint8Array.prototype.set=()=>{throw new Error("poisoned Uint8Array.set");};
  globalThis.String=()=>{throw new Error("poisoned String");};
  let qualified;
  let after;
  try{
    qualified=
      qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(
        candidate,
      );
    after=
      encodeApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(candidate);
  }finally{
    globalThis.String=originalString;
    Uint8Array.prototype.set=originalTypedArraySet;
    Buffer.prototype.writeUInt32BE=originalWriteUInt32BE;
    Buffer.alloc=originalBufferAlloc;
    Buffer.concat=originalBufferConcat;
    Buffer.from=originalBufferFrom;
    hashPrototype.digest=originalHashDigest;
    hashPrototype.update=originalHashUpdate;
    if(originalBufferLength===undefined){
      delete Buffer.prototype.length;
    }else{
      originalDefineProperty(Buffer.prototype,"length",originalBufferLength);
    }
    RegExp.prototype.exec=originalRegExpExec;
    RegExp.prototype.test=originalRegExpTest;
    utilTypes.isProxy=originalIsProxy;
    Array.prototype[Symbol.iterator]=originalArrayIterator;
    Number.isSafeInteger=originalIsSafeInteger;
    Array.isArray=originalIsArray;
    Reflect.apply=originalReflectApply;
    Reflect.ownKeys=originalOwnKeys;
    Object.freeze=originalFreeze;
    Object.create=originalCreate;
    Object.hasOwn=originalHasOwn;
    Object.defineProperty=originalDefineProperty;
    Object.getOwnPropertyDescriptor=originalGetOwnPropertyDescriptor;
    Object.getPrototypeOf=originalGetPrototypeOf;
    JSON.stringify=originalStringify;
    if(originalArrayZero===undefined){
      delete Array.prototype[0];
    }else{
      originalDefineProperty(Array.prototype,"0",originalArrayZero);
    }
    delete Object.prototype.toJSON;
  }
  assert.equal(
    qualified.revalidator_candidate_id,
    candidate.revalidator_candidate_id,
  );
  assert.equal(Buffer.compare(before,after),0);
  assert.equal(toJSONGetterCalls,0);
  assert.equal(arrayIndexSetterCalls,0);
}
{
  let getterCalls=0;
  const hostile={};
  Object.defineProperty(hostile,"consumption_record",{
    enumerable:true,
    get(){getterCalls+=1;return record;},
  });
  assert.throws(
    ()=>buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(hostile),
    /input_invalid/u,
  );
  assert.equal(getterCalls,0);
}

// A separately valid content-addressed candidate from a different, coherent
// parent request is still not authority for this request.
{
  const otherClaim=claimRecord({
    store_generation_id:"apollyon_claim_store_generation_v2:"+"f".repeat(64),
  });
  const otherRecord=consumptionRecord({claim_record:otherClaim});
  const otherInput=Object.freeze({consumption_record:otherRecord});
  const otherCandidate=
    buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(otherInput);
  assert.equal(
    qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(
      otherCandidate,
    ).revalidator_candidate_id,
    otherCandidate.revalidator_candidate_id,
  );
  assert.throws(
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorAgainstRequestV2(
      requestInput,otherCandidate,
    ),
    /v2_parent_request_mismatch/u,
  );
}
{
  const tampered={...candidate,revalidator_candidate_id:
    "apollyon_training_start_protected_store_revalidator_v2:"+"0".repeat(64)};
  assert.throws(
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(tampered),
    /v2_candidate_id_invalid/u,
  );
}
{
  const unknown={...candidate,hidden:true};
  assert.throws(
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(unknown),
    /v2_candidate_schema_invalid/u,
  );
}

const source=fs.readFileSync(path.join(ROOT,SOURCE_REL),"utf8");
for(const required of [
  "qualifyApollyonTrainingStartStoreRevalidationRequestV1",
  "flat_primitive_content_address_required:true",
  "candidate_frame_hash_json_independent:true",
  "reviewed_canonicalizer_v2_required_for_future_host:true",
  "reviewed_canonicalizer_v2_host_integration_proven:false",
  "parent_revalidation_request_v1_host_realm_proven:false",
  "candidate_material_derivation_host_realm_proven:false",
  "fixture_terminal_root_policy_revalidation_source_bound:true",
  "trusted_ancestor_custody_required:true",
  "root_and_consumption_access_acl_absence_required:true",
  "root_and_consumption_default_acl_absence_required:true",
  "record_regular_single_link_required:true",
  "record_bounded_canonical_eof_required:true",
  "terminal_receipt_reread_required:true",
  "custody_record_reread_required:true",
  "publish_request_binding_revalidation_required:true",
  "transaction_lease_fencing_required:true",
  "lease_loss_maps_to_hold_required:true",
  "indeterminate_close_maps_to_hold_required:true",
  "automatic_retry_forbidden:true",
  "const REGEXP_EXEC=RegExp.prototype.exec;",
  "const TYPED_ARRAY_LENGTH=",
  "const TYPED_ARRAY_SET=Uint8Array.prototype.set;",
  "concatBuffers(parts)",
  "return frameRecord(value,true);",
  "bufferLength(raw)",
  "bufferLength(keyBytes)",
  "bufferLength(payload)",
  "fixture_custody_receipt_authoritative:false",
  "protected_store_origin_proven:false",
  "writer_directory_capability_origin_proven:false",
  "protected_writer_invocation_authorized:false",
  "live_host_observation_performed:false",
  'next_gate:NEXT_GATE',
]){
  assert.equal(source.includes(required),true,required);
}
for(const forbidden of [
  'from "node:fs"','from "node:net"','from "node:child_process"',
  "JSON.stringify(",
  "new Set(",
  "utilTypes.isProxy(",
  ".test(value.",
  "chunks.push(",
  "own.some(",
  "openSync(","readFileSync(","writeFileSync(","spawn(","execFile(","fetch(",
  "process.env","createPrivateKey","crypto.sign(",
  "protected_store_origin_proven:true",
  "protected_writer_invocation_authorized:true",
  "training_start_consumption_performed:true",
  "trainer_release_authorized:true",
  "training_execution_authorized:true",
  "funds_movement:true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

const candidateFrame=
  encodeApollyonTrainingStartProtectedStoreRevalidatorCandidateV2(candidate);
const candidateFrameSha256=sha256(candidateFrame);
const proofReceipt={
  marker:"VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_CONTRACT_V2_RECEIPT",
  version:2,
  parent_head:candidate.parent_head,
  revalidator_candidate_id:candidate.revalidator_candidate_id,
  candidate_frame_bytes:candidateFrame.length,
  candidate_frame_sha256:candidateFrameSha256,
  protected_store_origin_proven:false,
  protected_writer_invocation_authorized:false,
  training_execution_authorized:false,
  funds_movement:false,
};
const args=process.argv.slice(2);
if(args.length===2&&args[0]==="--emit"){
  fs.writeFileSync(
    args[1],
    Buffer.from(JSON.stringify(proofReceipt)+"\n","utf8"),
    {flag:"wx",mode:0o600},
  );
}else if(args.length!==0){
  throw new Error("usage: proof [--emit <path>]");
}

console.log(
  "VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_CONTRACT_V2_PROOF_GREEN"
);
console.log("exact_parent_revalidation_request_blob_bound=true");
console.log("exact_parent_protected_writer_blob_bound=true");
console.log("exact_fixture_custody_source_blob_bound=true");
console.log("public_candidate_content_addressed=true");
console.log("flat_primitive_frame_hash_json_independent=true");
console.log("post_import_json_tojson_poisoning_does_not_change_candidate_bytes=true");
console.log("captured_reflection_primordials_bound=true");
console.log("captured_frame_qualifier_primordials_bound=true");
console.log("captured_regexp_exec_primordial_bound=true");
console.log("captured_buffer_length_intrinsic_bound=true");
console.log("captured_typed_array_set_primordial_bound=true");
console.log("private_frame_return_without_buffer_copy=true");
console.log("current_canonicalizer_v2_generation_bound=true");
console.log("superseded_canonicalizer_v2_generation_rejected=true");
console.log("revoked_proxy_candidate_rejected=true");
console.log("reviewed_canonicalizer_v2_future_host_required=true");
console.log("full_3557_future_host_matrix_bound=true");
console.log("automatic_retry_forbidden=true");
console.log("transaction_lease_fencing_performed=false");
console.log("terminal_receipt_reread_performed=false");
console.log("custody_record_reread_performed=false");
console.log("parent_v1_request_host_realm_proven=false");
console.log("candidate_material_derivation_host_realm_proven=false");
console.log("public_candidate_not_bearer_authority=true");
console.log("parent_request_cross_binding_required=true");
console.log("readdressed_public_candidate_rejected_against_parent=true");
console.log("candidate_accessors_and_proxies_rejected_before_read=true");
console.log("fixed_claim_state_root_bound=true");
console.log("revalidator_candidate_id="+candidate.revalidator_candidate_id);
console.log("candidate_frame_bytes="+candidateFrame.length);
console.log("candidate_frame_sha256="+candidateFrameSha256);
console.log("fixed_consumption_directory_bound=true");
console.log("protected_store_origin_proven=false");
console.log("current_store_generation_revalidation_performed=false");
console.log("authorization_winner_reread_performed=false");
console.log("writer_directory_capability_origin_proven=false");
console.log("protected_writer_invocation_authorized=false");
console.log("live_host_observation_performed=false");
console.log("filesystem_read=false");
console.log("filesystem_write=false");
console.log("service_action=false");
console.log("training_execution_authorized=false");
console.log("funds_movement=false");
