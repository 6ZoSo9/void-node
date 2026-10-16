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
  qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2,
} from "../tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs";
import {
  apollyonTrainingStartConsumptionSlotLeafV1,
} from "../tools/apollyon-training-start-consumption-protected-writer-v1.mjs";
import {
  VOID_APOLLYON_TRAINING_START_STORE_REVALIDATION_REQUEST_AUTHORITY_V1,
  qualifyApollyonTrainingStartStoreRevalidationRequestV1,
} from "../tools/apollyon-training-start-store-revalidation-request-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WORKFLOW=path.join(
  ROOT,
  ".github/workflows/apollyon-training-start-store-revalidation-request-v1.yml",
);

function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-training-start-store-revalidation-request-v1.mjs":
    "1e15512c61615f137f89f71f12a1c4630bf8767b",
  "tools/apollyon-training-start-consumption-protected-writer-v1.mjs":
    "a08927b7b16884a9bf0c28328047afdab49649ea",
  "tools/apollyon-training-start-consumption-contract-v1.mjs":
    "4333df6c7918fe9efaada36cac765000eec7948f",
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs":
    "93582c324ca85aeff56eb61f82b32f1e4c18dfe9",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs":
    "d67ef39c4cd034844fb0862e180de46ed4cd0c88",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs":
    "6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs":
    "e27f0ebb968f4611bfc069670325c3f5e6df1c65",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
    "981935515e08634be96446e58922c16be56d33ad",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

const policy=qualifyApollyonDurableAttemptClaimStorePolicyV2();
const candidate=qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2();
assert.equal(candidate.store_policy_id,policy.store_policy_id);
assert.equal(
  candidate.fixed_paths.claim_state_root,
  "/var/lib/void-apollyon-attempt-claim-v2",
);

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
  const input={
    authorization_slot_record:
      overrides.authorization_slot_record??
      authorizationSlotRecord(record,publishRequestSha),
    claim_record:record,
    publish_request_sha256:publishRequestSha,
    success_response:
      overrides.success_response??success(record,publishRequestSha),
    trainer_generation:trainerGeneration,
  };
  return qualifyApollyonTrainingStartConsumptionContractV1(input)
    .consumption_record;
}

const record=consumptionRecord();
const result=qualifyApollyonTrainingStartStoreRevalidationRequestV1({
  consumption_record:record,
});

for(const [key,expected] of [
  ["target_host","Xiphos"],
  ["fixed_claim_state_root","/var/lib/void-apollyon-attempt-claim-v2"],
  ["fixed_training_start_consumption_directory",
    "/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1"],
  ["store_policy_id",record.store_policy_id],
  ["store_contract_id",record.store_contract_id],
  ["store_generation_id",record.store_generation_id],
  ["terminal_receipt_id",record.terminal_receipt_id],
  ["authorization_id",record.authorization_id],
  ["authorization_slot_id",record.authorization_slot_id],
  ["authorization_slot_record_id",record.authorization_slot_record_id],
  ["custody_generation_id",record.custody_generation_id],
  ["custody_record_sha256",record.custody_record_sha256],
  ["claim_record_id",record.claim_record_id],
  ["claim_record_sha256",record.claim_record_sha256],
  ["publish_request_sha256",record.publish_request_sha256],
  ["training_start_consumption_slot_id",record.training_start_consumption_slot_id],
  ["training_start_consumption_slot_leaf",
    apollyonTrainingStartConsumptionSlotLeafV1(record)],
  ["training_start_consumption_id",record.training_start_consumption_id],
  ["trainer_generation_id",record.trainer_generation_id],
  ["trainer_boot_id_sha256",record.trainer_boot_id_sha256],
  ["trainer_pid",record.trainer_pid],
  ["trainer_process_start_time_ticks",record.trainer_process_start_time_ticks],
  ["trainer_uid",record.trainer_uid],
  ["trainer_gid",record.trainer_gid],
  ["trainer_source_identity_sha256",record.trainer_source_identity_sha256],
]){
  assert.equal(result[key],expected,key);
}
assert.equal(result.store_service_candidate_id,candidate.candidate_id);
assert.match(
  result.revalidation_request_id,
  /^apollyon_training_store_revalidation_request_v1:[0-9a-f]{64}$/u,
);

for(const key of [
  "protected_store_origin_proven",
  "current_store_generation_revalidation_performed",
  "store_generation_record_reread_performed",
  "generation_lineage_revalidation_performed",
  "durable_claim_record_reread_performed",
  "authorization_winner_reread_performed",
  "consumption_slot_classification_performed",
  "writer_directory_capability_exact_path_proven",
  "writer_directory_capability_origin_proven",
  "fixed_root_visible_generation_revalidation_performed",
  "fixed_consumption_directory_visible_generation_revalidation_performed",
  "protected_writer_invocation_authorized",
  "training_start_consumption_performed",
  "trainer_release_authorized",
  "trainer_release_performed",
  "training_execution_authorized",
  "training_execution_performed",
  "candidate_weight_mutation_performed",
]){
  assert.equal(result[key],false,key);
}
for(const key of [
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
  assert.equal(result[key],true,key);
}

assert.throws(
  ()=>qualifyApollyonTrainingStartStoreRevalidationRequestV1({
    consumption_record:record,
    claim_state_root:"/tmp/attacker-selected",
  }),
  /input_invalid/u,
);
{
  const bad=structuredClone(record);
  bad.authorization_slot_record_id=
    "apollyon_attempt_claim_auth_slot_record_v1:"+"0".repeat(64);
  assert.throws(
    ()=>qualifyApollyonTrainingStartStoreRevalidationRequestV1({
      consumption_record:bad,
    }),
    /authorization_slot_record_id_invalid|consumption_record_invalid/u,
  );
}
{
  const bad=structuredClone(record);
  bad.store_policy_id=
    "apollyon_claim_store_policy_v2:"+"0".repeat(64);
  assert.throws(
    ()=>qualifyApollyonTrainingStartStoreRevalidationRequestV1({
      consumption_record:bad,
    }),
    /consumption_record_invalid/u,
  );
}

const replacement=consumptionRecord({
  trainer_generation:trainer({
    pid:4343,
    process_start_time_ticks:"123457",
    source_identity_sha256:"1".repeat(64),
  }),
});
const replacementResult=
  qualifyApollyonTrainingStartStoreRevalidationRequestV1({
    consumption_record:replacement,
  });
assert.equal(
  replacementResult.training_start_consumption_slot_id,
  result.training_start_consumption_slot_id,
);
assert.notEqual(
  replacementResult.training_start_consumption_id,
  result.training_start_consumption_id,
);
assert.notEqual(
  replacementResult.revalidation_request_id,
  result.revalidation_request_id,
);

for(const [key,expected] of Object.entries({
  source_only_contract:true,
  exact_consumption_record_required:true,
  accepted_store_service_candidate_required:true,
  accepted_protected_writer_required:true,
  fixed_claim_state_root_bound:true,
  fixed_training_start_consumption_directory_bound:true,
  derived_consumption_leaf_bound:true,
  caller_supplied_store_path_supported:false,
  caller_supplied_consumption_directory_supported:false,
  protected_store_origin_required:true,
  protected_store_origin_proven:false,
  current_store_generation_revalidation_required:true,
  current_store_generation_revalidation_performed:false,
  store_generation_record_reread_required:true,
  store_generation_record_reread_performed:false,
  generation_lineage_revalidation_required:true,
  generation_lineage_revalidation_performed:false,
  durable_claim_record_reread_required:true,
  durable_claim_record_reread_performed:false,
  authorization_winner_reread_required:true,
  authorization_winner_reread_performed:false,
  consumption_slot_classification_required:true,
  consumption_slot_classification_performed:false,
  writer_directory_capability_from_fixed_root_required:true,
  writer_directory_capability_exact_path_required:true,
  writer_directory_capability_exact_path_proven:false,
  writer_directory_capability_origin_proven:false,
  fixed_root_visible_generation_revalidation_required:true,
  fixed_root_visible_generation_revalidation_performed:false,
  fixed_consumption_directory_visible_generation_revalidation_required:true,
  fixed_consumption_directory_visible_generation_revalidation_performed:false,
  same_store_generation_through_writer_required:true,
  protected_writer_invocation_required:true,
  protected_writer_invocation_authorized:false,
  training_start_consumption_performed:false,
  trainer_release_authorized:false,
  trainer_release_performed:false,
  training_execution_authorized:false,
  training_execution_performed:false,
  candidate_weight_mutation_performed:false,
  filesystem_read:false,
  filesystem_write:false,
  network_access:false,
  service_action:false,
  socket_action:false,
  operator_private_key_access:false,
  production_signing:false,
  wallet_access:false,
  transaction_signing:false,
  transaction_broadcast:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_APOLLYON_TRAINING_START_STORE_REVALIDATION_REQUEST_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-training-start-store-revalidation-request-v1.mjs"),
  "utf8",
);
for(const required of [
  "structuredClone(value)",
  '"/var/lib/void-apollyon-attempt-claim-v2"',
  '"/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1"',
  '"a08927b7b16884a9bf0c28328047afdab49649ea"',
  '"d67ef39c4cd034844fb0862e180de46ed4cd0c88"',
  "protected_store_origin_proven:false",
  "current_store_generation_revalidation_performed:false",
  "authorization_winner_reread_performed:false",
  "protected_writer_invocation_authorized:false",
  'next_gate:"apollyon_training_start_protected_store_revalidator_v1"',
]){
  assert.equal(source.includes(required),true,required);
}
for(const forbidden of [
  'from "node:fs"','from "node:net"','from "node:child_process"',
  "writeFileSync(","openSync(","spawn(","execFile(","fetch(",
  "process.env","createPrivateKey","crypto.sign(",
  "protected_store_origin_proven:true",
  "protected_writer_invocation_authorized:true",
  "training_start_consumption_performed:true",
  "trainer_release_authorized:true",
  "training_execution_authorized:true",
  "training_execution_performed:true",
  "candidate_weight_mutation_performed:true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

const workflow=fs.readFileSync(WORKFLOW,"utf8");
const expectedTriggerPaths=[
  "tools/apollyon-training-start-store-revalidation-request-v1.mjs",
  "scripts/prove_apollyon_training_start_store_revalidation_request_v1.mjs",
  "docs/security/apollyon-training-start-store-revalidation-request-v1.md",
  ".github/workflows/apollyon-training-start-store-revalidation-request-v1.yml",
  "tools/apollyon-training-start-consumption-protected-writer-v1.mjs",
  "tools/apollyon-training-start-consumption-contract-v1.mjs",
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs",
];
function eventTriggerPaths(yaml,eventName,nextEventName){
  const lines=yaml.split("\n");
  const start=lines.indexOf("  "+eventName+":");
  const end=lines.indexOf("  "+nextEventName+":",start+1);
  assert.notEqual(start,-1,eventName);
  assert.notEqual(end,-1,nextEventName);
  const block=lines.slice(start+1,end);
  const marker=block.indexOf("    paths:");
  assert.notEqual(marker,-1,eventName+" paths");
  const paths=[];
  for(let i=marker+1;i<block.length;i++){
    const line=block[i];
    const match=/^      - "([^"]+)"$/u.exec(line);
    if(match){paths.push(match[1]);continue;}
    if(/^\s*$/u.test(line))continue;
    if(!line.startsWith("      "))break;
    assert.fail(eventName+" malformed path "+line);
  }
  return paths;
}
for(const [event,next] of [["pull_request","push"],["push","workflow_dispatch"]]){
  const actual=eventTriggerPaths(workflow,event,next);
  assert.equal(new Set(actual).size,actual.length,event+" duplicates");
  assert.deepEqual([...actual].sort(),[...expectedTriggerPaths].sort());
}

console.log(
  "VOID_APOLLYON_TRAINING_START_STORE_REVALIDATION_REQUEST_V1_PROOF_GREEN"
);
console.log("fixed_claim_state_root_bound=true");
console.log("fixed_training_start_consumption_directory_bound=true");
console.log("authorization_winner_identity_bound=true");
console.log("current_store_generation_identity_bound=true");
console.log("durable_claim_identity_bound=true");
console.log("training_start_consumption_slot_bound=true");
console.log("training_start_consumption_slot_leaf_bound=true");
console.log("store_generation_record_reread_required=true");
console.log("generation_lineage_revalidation_required=true");
console.log("visible_namespace_generation_continuity_required=true");
console.log("protected_store_origin_proven=false");
console.log("current_store_generation_revalidation_performed=false");
console.log("authorization_winner_reread_performed=false");
console.log("protected_writer_invocation_authorized=false");
console.log("training_start_consumption_performed=false");
console.log("trainer_release_authorized=false");
console.log("training_execution_authorized=false");
console.log("next_gate=apollyon_training_start_protected_store_revalidator_v1");
