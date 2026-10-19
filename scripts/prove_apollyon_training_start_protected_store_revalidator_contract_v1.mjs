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
  qualifyApollyonDurableAttemptClaimStorePolicyV2,
} from "../tools/apollyon-durable-attempt-claim-store-contract-v2.mjs";
import {
  qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
} from "../tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs";
import {
  qualifyApollyonTrainingStartConsumptionContractV1,
} from "../tools/apollyon-training-start-consumption-contract-v1.mjs";
import {
  APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_MATERIAL_KEYS_V1,
  APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V1,
  VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_AUTHORITY_V1,
  buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV1,
  qualifyApollyonTrainingStartProtectedStoreRevalidatorAgainstRequestV1,
  qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV1,
} from "../tools/apollyon-training-start-protected-store-revalidator-contract-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE_REL=
  "tools/apollyon-training-start-protected-store-revalidator-contract-v1.mjs";
const PINS=Object.freeze({
  [SOURCE_REL]:"26bdc5fca4bbbafd585145752a599b5c34edf7ea",
  "tools/apollyon-training-start-store-revalidation-request-v1.mjs":
    "be9347a157c7e220aa65cf3dad1c8b7781904277",
  "tools/apollyon-training-start-consumption-protected-writer-v1.mjs":
    "473b4148e6bcb755bb8bf7c6af890150a9f43efe",
  "ops/xiphos/apollyon_training_start_consumption_directory_custody_candidate_v1.py":
    "42408e7a65e3565a8a98cb4e23985c3ca76045bc",
});

function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
function canonical(value){
  const out={};
  for(const key of Object.keys(value).sort())out[key]=value[key];
  return JSON.stringify(out);
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
  buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV1(requestInput);
const candidateAgain=
  buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV1(requestInput);
assert.deepEqual(candidateAgain,candidate);
assert(Object.isFrozen(candidate));
assert.match(
  candidate.revalidator_candidate_id,
  /^apollyon_training_start_protected_store_revalidator_v1:[0-9a-f]{64}$/u,
);
assert.equal(
  candidate.parent_head,
  "477248e81d1fb5fb64e0af41e84d5bff092f7bab",
);
assert.equal(
  candidate.parent_revalidation_request_blob_sha1,
  "be9347a157c7e220aa65cf3dad1c8b7781904277",
);
assert.equal(
  candidate.parent_protected_writer_blob_sha1,
  "473b4148e6bcb755bb8bf7c6af890150a9f43efe",
);
assert.equal(
  candidate.parent_directory_custody_source_blob_sha1,
  "42408e7a65e3565a8a98cb4e23985c3ca76045bc",
);
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
  qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV1(candidate)
    .revalidator_candidate_id,
  candidate.revalidator_candidate_id,
);
assert.equal(
  qualifyApollyonTrainingStartProtectedStoreRevalidatorAgainstRequestV1(
    requestInput,candidate,
  ).revalidator_candidate_id,
  candidate.revalidator_candidate_id,
);

for(const key of [
  "source_contract_only","fixture_custody_source_required",
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
    VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_AUTHORITY_V1[key],
    expected,key,
  );
}

assert.equal(
  APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_PARENT_V1.head,
  "477248e81d1fb5fb64e0af41e84d5bff092f7bab",
);
assert.equal(
  new Set(APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_MATERIAL_KEYS_V1)
    .size,
  APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_MATERIAL_KEYS_V1.length,
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
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV1(hostile),
    /candidate_schema_invalid/u,
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
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV1(proxy),
    /candidate_schema_invalid/u,
  );
  assert.equal(traps,0);
}
{
  let getterCalls=0;
  const hostile={};
  Object.defineProperty(hostile,"consumption_record",{
    enumerable:true,
    get(){getterCalls+=1;return record;},
  });
  assert.throws(
    ()=>buildApollyonTrainingStartProtectedStoreRevalidatorCandidateV1(hostile),
    /input_invalid/u,
  );
  assert.equal(getterCalls,0);
}

// A content-addressed public candidate is not enough: valid-looking drift must
// still fail when cross-bound to the exact parent request.
{
  const drift={...candidate,store_generation_id:
    "apollyon_claim_store_generation_v2:"+"f".repeat(64)};
  const material={...drift};
  delete material.revalidator_candidate_id;
  drift.revalidator_candidate_id=
    "apollyon_training_start_protected_store_revalidator_v1:"+
    sha256(Buffer.from(canonical(material),"utf8"));
  const shape=
    qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV1(drift);
  assert.equal(shape.store_generation_id,drift.store_generation_id);
  assert.throws(
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorAgainstRequestV1(
      requestInput,shape,
    ),
    /parent_request_mismatch/u,
  );
}
{
  const tampered={...candidate,revalidator_candidate_id:
    "apollyon_training_start_protected_store_revalidator_v1:"+"0".repeat(64)};
  assert.throws(
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV1(tampered),
    /candidate_id_invalid/u,
  );
}
{
  const unknown={...candidate,hidden:true};
  assert.throws(
    ()=>qualifyApollyonTrainingStartProtectedStoreRevalidatorCandidateV1(unknown),
    /candidate_schema_invalid/u,
  );
}

const source=fs.readFileSync(path.join(ROOT,SOURCE_REL),"utf8");
for(const required of [
  "qualifyApollyonTrainingStartStoreRevalidationRequestV1",
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

console.log(
  "VOID_APOLLYON_TRAINING_START_PROTECTED_STORE_REVALIDATOR_CONTRACT_V1_PROOF_GREEN"
);
console.log("exact_parent_revalidation_request_blob_bound=true");
console.log("exact_parent_protected_writer_blob_bound=true");
console.log("exact_fixture_custody_source_blob_bound=true");
console.log("public_candidate_content_addressed=true");
console.log("public_candidate_not_bearer_authority=true");
console.log("parent_request_cross_binding_required=true");
console.log("readdressed_public_candidate_rejected_against_parent=true");
console.log("candidate_accessors_and_proxies_rejected_before_read=true");
console.log("fixed_claim_state_root_bound=true");
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
