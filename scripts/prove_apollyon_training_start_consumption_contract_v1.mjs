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
  VOID_APOLLYON_TRAINING_START_CONSUMPTION_AUTHORITY_V1,
  VOID_APOLLYON_TRAINING_START_CONSUMPTION_RECORD_KEYS_V1,
  classifyApollyonTrainingStartConsumptionRecoveryV1,
  qualifyApollyonTrainingStartConsumptionContractV1,
  validateApollyonTrainingStartConsumptionRecordV1,
} from "../tools/apollyon-training-start-consumption-contract-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WORKFLOW=path.join(ROOT,".github/workflows/apollyon-training-start-consumption-contract-v1.yml");
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs":
    "6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs":
    "c2ff992a09fe916a5016b5a6c4ceced4ab1d2fa8",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs":
    "87019ae1245a2054407dd47835b0b7a891d4d9a2",
  "tools/apollyon-training-start-consumption-contract-v1.mjs":
    "60987b860fb7159d88f4f601b76878e7d8ccca92",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

const workflow=fs.readFileSync(WORKFLOW,"utf8");
const expectedTriggerPaths=[
  "tools/apollyon-training-start-consumption-contract-v1.mjs",
  "scripts/prove_apollyon_training_start_consumption_contract_v1.mjs",
  "docs/security/apollyon-training-start-consumption-contract-v1.md",
  ".github/workflows/apollyon-training-start-consumption-contract-v1.yml",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs",
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs",
];
function eventTriggerPaths(yaml,eventName,nextEventName){
  const lines=yaml.split("\n");
  const eventMarker="  "+eventName+":";
  const nextEventMarker="  "+nextEventName+":";
  const eventStart=lines.indexOf(eventMarker);
  const eventEnd=lines.indexOf(nextEventMarker,eventStart+1);
  assert.notEqual(eventStart,-1,"missing event marker "+eventMarker);
  assert.notEqual(eventEnd,-1,"missing event boundary "+nextEventMarker);
  assert.ok(eventStart<eventEnd,"event markers out of order");

  const eventLines=lines.slice(eventStart+1,eventEnd);
  const pathMarkers=eventLines
    .map((line,index)=>line==="    paths:"?index:-1)
    .filter(index=>index>=0);
  assert.deepEqual(pathMarkers.length,1,eventName+" exact paths subsection count");

  const paths=[];
  for(let index=pathMarkers[0]+1;index<eventLines.length;index++){
    const line=eventLines[index];
    const match=/^      - "([^"]+)"$/u.exec(line);
    if(match){
      paths.push(match[1]);
      continue;
    }
    if(/^\s*$/u.test(line))continue;
    if(!line.startsWith("      "))break;
    assert.fail(eventName+" malformed paths entry: "+line);
  }
  return paths;
}
function assertExactEventTriggerPaths(label,actual){
  assert.equal(actual.length,expectedTriggerPaths.length,label+" trigger path count");
  assert.equal(new Set(actual).size,actual.length,label+" duplicate trigger path");
  assert.deepEqual([...actual].sort(),[...expectedTriggerPaths].sort(),label+" trigger closure mismatch");
}
const pullRequestTriggerPaths=eventTriggerPaths(workflow,"pull_request","push");
const pushTriggerPaths=eventTriggerPaths(workflow,"push","workflow_dispatch");
assertExactEventTriggerPaths("pull_request",pullRequestTriggerPaths);
assertExactEventTriggerPaths("push",pushTriggerPaths);

const siblingListAdversary=[
  "on:",
  "  pull_request:",
  "    branches:",
  '      - "tools/apollyon-live-custody-service-source-session-binding-v2.mjs"',
  "    paths:",
  '      - "tools/apollyon-training-start-consumption-contract-v1.mjs"',
  "  push:",
  "    branches: [main]",
  "    paths:",
  '      - "tools/apollyon-training-start-consumption-contract-v1.mjs"',
  "  workflow_dispatch:",
  "",
].join("\n");
assert.deepEqual(
  eventTriggerPaths(siblingListAdversary,"pull_request","push"),
  ["tools/apollyon-training-start-consumption-contract-v1.mjs"],
  "pull_request sibling list must not count as paths",
);
assert.deepEqual(
  eventTriggerPaths(siblingListAdversary,"push","workflow_dispatch"),
  ["tools/apollyon-training-start-consumption-contract-v1.mjs"],
  "push sibling list must not count as paths",
);
assert.equal(workflow.includes("PUSH_BEFORE:"),true);
assert.equal(workflow.includes("github.event.before"),true);
const policy=qualifyApollyonDurableAttemptClaimStorePolicyV2();
assert.equal(
  policy.store_policy_id,
  "apollyon_claim_store_policy_v2:e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137",
);

function claimRecord(){
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
  };
  return {
    ...material,
    claim_record_id:"apollyon_attempt_claim_record_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
  };
}
function success(record,publishRequestSha="e".repeat(64)){
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
function trainingStartSlotIdFromAuthorizationSlot(authorizationSlotId){
  const material={
    marker:"VOID_APOLLYON_TRAINING_START_CONSUMPTION_SLOT_V1",
    version:1,
    authorization_slot_id:authorizationSlotId,
  };
  return "apollyon_training_start_slot_v1:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8"));
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
function trainer(){
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
  };
  return {
    ...material,
    trainer_generation_id:"apollyon_pretraining_generation_v1:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
  };
}
function input(){
  const record=claimRecord();
  const publish_request_sha256="e".repeat(64);
  return {
    authorization_slot_record:authorizationSlotRecord(
      record,
      publish_request_sha256,
    ),
    claim_record:record,
    publish_request_sha256,
    success_response:success(record,publish_request_sha256),
    trainer_generation:trainer(),
  };
}

const good=input();
const result=qualifyApollyonTrainingStartConsumptionContractV1(good);
assert.equal(result.status,"training_start_consumption_source_contract_qualified_unimplemented");
assert.equal(result.durable_claim_success_shape_qualified,true);
assert.equal(result.durable_claim_success_origin_proven,false);
assert.equal(result.durable_claim_success_is_bearer_training_authority,false);
assert.equal(result.protected_claim_record_reread_required,true);
assert.equal(result.protected_claim_record_reread_performed,false);
assert.equal(result.current_store_generation_revalidation_required,true);
assert.equal(result.current_store_generation_revalidation_performed,false);
assert.equal(result.pretraining_generation_shape_qualified,true);
assert.equal(result.pretraining_generation_source_origin_proven,false);
assert.equal(result.trainer_generation_must_remain_blocked_until_durable_consumption,true);
assert.equal(result.training_start_consumption_create_once_required,true);
assert.equal(result.trainer_independent_consumption_slot_qualified,true);
assert.equal(result.authorization_wide_consumption_slot_qualified,true);
assert.equal(result.unique_authorization_claim_slot_shape_qualified,true);
assert.equal(result.unique_authorization_claim_slot_protected_origin_required,true);
assert.equal(result.unique_authorization_claim_slot_protected_origin_proven,false);
assert.equal(result.unique_authorization_claim_slot_revalidation_required,true);
assert.equal(result.unique_authorization_claim_slot_revalidation_performed,false);
assert.equal(result.training_start_slot_derived_from_authorization_slot,true);
assert.equal(
  result.authorization_slot_id,
  good.authorization_slot_record.authorization_slot_id,
);
assert.equal(
  result.authorization_slot_record_id,
  good.authorization_slot_record.authorization_slot_record_id,
);
assert.equal(result.protected_namespace_keyed_by_consumption_slot_required,true);
assert.equal(result.training_start_consumption_performed,false);
assert.equal(result.existing_exact_consumption_reusable_admission,false);
assert.equal(result.lost_ack_second_start_forbidden,true);
assert.equal(result.automatic_retry_authorized,false);
assert.equal(result.protected_consumption_store_proven,false);
assert.equal(result.training_release_gate_required,true);
assert.equal(result.bound_trainer_generation_revalidation_required_before_release,true);
assert.equal(result.bound_trainer_generation_revalidation_performed,false);
assert.equal(result.training_identity_policy_revalidation_required_before_release,true);
assert.equal(result.training_identity_policy_revalidation_performed,false);
assert.equal(result.bound_trainer_generation_loss_after_consumption_forfeits_attempt,true);
assert.equal(result.training_release_performed,false);
assert.equal(result.training_execution_authorized,false);
assert.equal(result.training_execution_performed,false);
assert.equal(result.candidate_weight_mutation_performed,false);
assert.equal(result.next_gate,"apollyon_training_start_consumption_implementation_v1");
assert.match(result.training_start_contract_id,/^apollyon_training_start_contract_v1:[0-9a-f]{64}$/u);

const record=result.consumption_record;
assert.deepEqual(
  Object.keys(record).sort(),
  [...VOID_APOLLYON_TRAINING_START_CONSUMPTION_RECORD_KEYS_V1].sort(),
);
assert.equal(record.claim_record_id,good.claim_record.claim_record_id);
assert.equal(record.authorization_id,good.claim_record.authorization_id);
assert.equal(
  record.authorization_slot_id,
  good.authorization_slot_record.authorization_slot_id,
);
assert.equal(
  record.authorization_slot_record_id,
  good.authorization_slot_record.authorization_slot_record_id,
);
assert.equal(record.custody_generation_id,good.claim_record.custody_generation_id);
assert.equal(record.store_generation_id,good.claim_record.store_generation_id);
assert.equal(record.training_start_consumption_slot_id,result.training_start_consumption_slot_id);
assert.match(
  record.training_start_consumption_slot_id,
  /^apollyon_training_start_slot_v1:[0-9a-f]{64}$/u,
);
assert.equal(record.trainer_generation_id,good.trainer_generation.trainer_generation_id);
assert.equal(record.attempt_limit,1);
assert.equal(record.automatic_retry_authorized,false);
assert.match(
  record.training_start_consumption_id,
  /^apollyon_training_start_consumption_v1:[0-9a-f]{64}$/u,
);
assert.deepEqual(
  validateApollyonTrainingStartConsumptionRecordV1(record),
  record,
);
// A persisted trainer-generation ID must match its OWN PID/start/boot/UID/GID
// and source fields, even after an adversary recomputes the outer record ID.
for(const corrupt of [
  bad=>{bad.trainer_generation_id="apollyon_pretraining_generation_v1:"+"0".repeat(64);},
  bad=>{bad.trainer_pid+=1;},
]){
  const bad=structuredClone(record);
  corrupt(bad);
  const material=structuredClone(bad);
  delete material.training_start_consumption_id;
  bad.training_start_consumption_id="apollyon_training_start_consumption_v1:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8"));
  assert.throws(
    ()=>validateApollyonTrainingStartConsumptionRecordV1(bad),
    /trainer_generation_id_invalid/u,
  );
}

assert.deepEqual(
  classifyApollyonTrainingStartConsumptionRecoveryV1({
    training_start_consumption_slot_id:record.training_start_consumption_slot_id,
    expected_consumption_record:record,
    observed_consumption_record:null,
  }),
  {
    status:"unconsumed_shape",
    create_once_publication_candidate:true,
    create_once_publication_authorized:false,
    existing_exact_consumption:false,
    training_start_admission:false,
    automatic_retry_authorized:false,
    protected_store_observation_performed:false,
  },
);
assert.deepEqual(
  classifyApollyonTrainingStartConsumptionRecoveryV1({
    training_start_consumption_slot_id:record.training_start_consumption_slot_id,
    expected_consumption_record:record,
    observed_consumption_record:structuredClone(record),
  }),
  {
    status:"already_consumed_shape",
    create_once_publication_candidate:false,
    create_once_publication_authorized:false,
    existing_exact_consumption:true,
    training_start_admission:false,
    automatic_retry_authorized:false,
    protected_store_observation_performed:false,
  },
);
{
  const bad=structuredClone(record);
  bad.trainer_pid+=1;
  // This fixture must represent a SECOND VALID blocked trainer, not a
  // mismatched generation ID (which the persisted validator now rejects).
  const trainerMaterial={
    marker:"VOID_APOLLYON_PRETRAINING_ADMISSION_GENERATION_V1",
    version:1,
    admission_blocked:true,
    automatic_retry_authorized:false,
    boot_id_sha256:bad.trainer_boot_id_sha256,
    candidate_weight_mutation_performed:false,
    gid:bad.trainer_gid,
    pid:bad.trainer_pid,
    process_start_time_ticks:bad.trainer_process_start_time_ticks,
    source_identity_sha256:bad.trainer_source_identity_sha256,
    training_execution_performed:false,
    uid:bad.trainer_uid,
  };
  bad.trainer_generation_id="apollyon_pretraining_generation_v1:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(trainerMaterial),"utf8"));
  const material=structuredClone(bad);
  delete material.training_start_consumption_id;
  bad.training_start_consumption_id="apollyon_training_start_consumption_v1:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8"));
  assert.throws(
    ()=>classifyApollyonTrainingStartConsumptionRecoveryV1({
      training_start_consumption_slot_id:record.training_start_consumption_slot_id,
      expected_consumption_record:record,
      observed_consumption_record:bad,
    }),
    /existing_consumption_collision/u,
  );
}
{
  const second=input();
  second.trainer_generation.pid=4343;
  second.trainer_generation.process_start_time_ticks="123457";
  const trainerMaterial=structuredClone(second.trainer_generation);
  delete trainerMaterial.trainer_generation_id;
  second.trainer_generation.trainer_generation_id=
    "apollyon_pretraining_generation_v1:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(trainerMaterial),"utf8"));
  const secondResult=qualifyApollyonTrainingStartConsumptionContractV1(second);
  assert.equal(secondResult.training_start_consumption_slot_id,result.training_start_consumption_slot_id);
  assert.notEqual(
    secondResult.consumption_record.training_start_consumption_id,
    record.training_start_consumption_id,
  );
  assert.throws(
    ()=>classifyApollyonTrainingStartConsumptionRecoveryV1({
      training_start_consumption_slot_id:record.training_start_consumption_slot_id,
      expected_consumption_record:secondResult.consumption_record,
      observed_consumption_record:record,
    }),
    /existing_consumption_collision/u,
  );
}
{
  const second=input();
  const claimMaterial=structuredClone(second.claim_record);
  delete claimMaterial.claim_record_id;
  claimMaterial.store_generation_id=
    "apollyon_claim_store_generation_v2:"+"a".repeat(64);
  claimMaterial.terminal_receipt_id=
    "apollyon_terminal_receipt_v2:"+"b".repeat(64);
  claimMaterial.terminal_runner_receipt_sha256="c".repeat(64);
  claimMaterial.request_sha256="d".repeat(64);
  claimMaterial.canonical_main="e".repeat(40);
  claimMaterial.canonical_tree="f".repeat(40);
  claimMaterial.corpus_sha256="1".repeat(64);
  claimMaterial.parent_adapter_sha256="2".repeat(64);
  second.claim_record={
    ...claimMaterial,
    claim_record_id:"apollyon_attempt_claim_record_v2:"+
      sha256(Buffer.from(
        canonicalApollyonClaimContractJsonV1(claimMaterial),"utf8"
      )),
  };
  second.publish_request_sha256="3".repeat(64);
  second.success_response=success(
    second.claim_record,
    second.publish_request_sha256,
  );
  second.authorization_slot_record=authorizationSlotRecord(
    second.claim_record,
    second.publish_request_sha256,
  );
  second.trainer_generation.pid=4545;
  second.trainer_generation.process_start_time_ticks="123458";
  const trainerMaterial=structuredClone(second.trainer_generation);
  delete trainerMaterial.trainer_generation_id;
  second.trainer_generation.trainer_generation_id=
    "apollyon_pretraining_generation_v1:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(trainerMaterial),"utf8"));

  const secondResult=qualifyApollyonTrainingStartConsumptionContractV1(second);
  assert.notEqual(secondResult.claim_record_id,result.claim_record_id);
  assert.notEqual(secondResult.store_generation_id,result.store_generation_id);
  assert.notEqual(secondResult.terminal_receipt_id,result.terminal_receipt_id);
  assert.equal(secondResult.authorization_id,result.authorization_id);
  assert.equal(secondResult.custody_generation_id,result.custody_generation_id);
  assert.equal(
    secondResult.authorization_slot_id,
    result.authorization_slot_id,
  );
  assert.notEqual(
    secondResult.authorization_slot_record_id,
    result.authorization_slot_record_id,
  );
  assert.equal(
    secondResult.training_start_consumption_slot_id,
    result.training_start_consumption_slot_id,
  );
  assert.notEqual(
    secondResult.consumption_record.training_start_consumption_id,
    record.training_start_consumption_id,
  );
  assert.throws(
    ()=>classifyApollyonTrainingStartConsumptionRecoveryV1({
      training_start_consumption_slot_id:record.training_start_consumption_slot_id,
      expected_consumption_record:secondResult.consumption_record,
      observed_consumption_record:record,
    }),
    /existing_consumption_collision/u,
  );
}
{
  const bad=input();
  bad.authorization_slot_record=authorizationSlotRecord(
    bad.claim_record,
    "1".repeat(64),
  );
  assert.throws(
    ()=>qualifyApollyonTrainingStartConsumptionContractV1(bad),
    /claim_boundary_invalid/u,
  );
}
{
  const bad=input();
  bad.authorization_slot_record={
    ...bad.authorization_slot_record,
    authorization_slot_record_id:
      "apollyon_attempt_claim_auth_slot_record_v1:"+"0".repeat(64),
  };
  assert.throws(
    ()=>qualifyApollyonTrainingStartConsumptionContractV1(bad),
    /auth_slot_v1_record_invalid/u,
  );
}
{
  const bad=input();
  const alternate=claimRecord();
  const alternateMaterial=structuredClone(alternate);
  delete alternateMaterial.claim_record_id;
  alternateMaterial.terminal_receipt_id=
    "apollyon_terminal_receipt_v2:"+"a".repeat(64);
  alternateMaterial.store_generation_id=
    "apollyon_claim_store_generation_v2:"+"b".repeat(64);
  const alternateClaim={
    ...alternateMaterial,
    claim_record_id:"apollyon_attempt_claim_record_v2:"+
      sha256(Buffer.from(
        canonicalApollyonClaimContractJsonV1(alternateMaterial),
        "utf8",
      )),
  };
  bad.authorization_slot_record=authorizationSlotRecord(
    alternateClaim,
    bad.publish_request_sha256,
  );
  assert.equal(
    bad.authorization_slot_record.authorization_slot_id,
    good.authorization_slot_record.authorization_slot_id,
  );
  assert.notEqual(
    bad.authorization_slot_record.claim_record_id,
    good.claim_record.claim_record_id,
  );
  assert.throws(
    ()=>qualifyApollyonTrainingStartConsumptionContractV1(bad),
    /claim_boundary_invalid/u,
  );
}
{
  const bad=structuredClone(record);
  bad.authorization_slot_id=
    "apollyon_attempt_claim_auth_slot_v1:"+"f".repeat(64);
  bad.training_start_consumption_slot_id=
    trainingStartSlotIdFromAuthorizationSlot(bad.authorization_slot_id);
  const material=structuredClone(bad);
  delete material.training_start_consumption_id;
  bad.training_start_consumption_id="apollyon_training_start_consumption_v1:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8"));
  assert.throws(
    ()=>validateApollyonTrainingStartConsumptionRecordV1(bad),
    /authorization_slot_id_invalid/u,
  );
}
{
  const bad=structuredClone(record);
  bad.training_start_consumption_slot_id=
    "apollyon_training_start_slot_v1:"+"0".repeat(64);
  const material=structuredClone(bad);
  delete material.training_start_consumption_id;
  bad.training_start_consumption_id="apollyon_training_start_consumption_v1:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8"));
  assert.throws(
    ()=>validateApollyonTrainingStartConsumptionRecordV1(bad),
    /consumption_slot_id_invalid/u,
  );
}
{
  const bad=structuredClone(record);
  bad.authorization_slot_record_id=
    "apollyon_attempt_claim_auth_slot_record_v1:"+"f".repeat(64);
  const material=structuredClone(bad);
  delete material.training_start_consumption_id;
  bad.training_start_consumption_id="apollyon_training_start_consumption_v1:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8"));
  assert.throws(
    ()=>validateApollyonTrainingStartConsumptionRecordV1(bad),
    /authorization_slot_record_id_invalid/u,
  );
}
{
  const bad=structuredClone(record);
  bad.automatic_retry_authorized=true;
  assert.throws(
    ()=>validateApollyonTrainingStartConsumptionRecordV1(bad),
    /consumption_record_invalid/u,
  );
}
{
  const bad=structuredClone(record);
  bad.store_policy_id="apollyon_claim_store_policy_v2:"+"f".repeat(64);
  const material=structuredClone(bad);
  delete material.training_start_consumption_id;
  bad.training_start_consumption_id="apollyon_training_start_consumption_v1:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8"));
  assert.throws(
    ()=>validateApollyonTrainingStartConsumptionRecordV1(bad),
    /consumption_record_invalid/u,
  );
}
{
  const bad=structuredClone(record);
  bad.training_start_consumption_id=
    "apollyon_training_start_consumption_v1:"+"0".repeat(64);
  assert.throws(
    ()=>validateApollyonTrainingStartConsumptionRecordV1(bad),
    /consumption_record_id_invalid/u,
  );
}

for(const mutate of [
  x=>{x.success_response.training_start_admission=true;},
  x=>{x.success_response.training_start_consumption_required=false;},
  x=>{x.success_response.training_start_consumption_performed=true;},
  x=>{x.success_response.durability_proven=false;},
  x=>{x.trainer_generation.admission_blocked=false;},
  x=>{x.trainer_generation.training_execution_performed=true;},
  x=>{x.trainer_generation.candidate_weight_mutation_performed=true;},
  x=>{x.trainer_generation.automatic_retry_authorized=true;},
  x=>{x.trainer_generation.uid=0;},
  x=>{x.trainer_generation.gid=0;},
  x=>{x.trainer_generation.process_start_time_ticks=123456;},
  x=>{x.trainer_generation.trainer_generation_id=
    "apollyon_pretraining_generation_v1:"+"f".repeat(64);},
  x=>{x.claim_record.automatic_retry_authorized=true;},
]){
  const bad=input();mutate(bad);
  assert.throws(()=>qualifyApollyonTrainingStartConsumptionContractV1(bad));
}

{
  const bad=input();
  Object.defineProperty(
    bad.trainer_generation,"__proto__",
    {value:"unexpected",enumerable:true,configurable:true},
  );
  assert.throws(()=>qualifyApollyonTrainingStartConsumptionContractV1(bad));
}
{
  assert.throws(
    ()=>qualifyApollyonTrainingStartConsumptionContractV1(new Proxy({},{})),
    /input_invalid/u,
  );
}
{
  let reads=0;
  const base=input();
  const accessor={
    authorization_slot_record:base.authorization_slot_record,
    claim_record:base.claim_record,
    publish_request_sha256:base.publish_request_sha256,
    success_response:base.success_response,
    get trainer_generation(){reads+=1;return base.trainer_generation;},
  };
  const accepted=qualifyApollyonTrainingStartConsumptionContractV1(accessor);
  assert.equal(reads,1);
  assert.equal(accepted.trainer_generation_id,base.trainer_generation.trainer_generation_id);
}

for(const [key,expected] of Object.entries({
  source_only_contract:true,
  exact_parent_store_contract_required:true,
  exact_accepted_store_policy_required:true,
  durable_claim_success_shape_required:true,
  durable_claim_success_is_bearer_training_authority:false,
  protected_claim_record_reread_required:true,
  protected_claim_record_origin_proven:false,
  current_store_generation_revalidation_required:true,
  current_store_generation_revalidation_performed:false,
  exact_inert_pretraining_generation_required:true,
  pretraining_generation_source_origin_proven:false,
  training_start_consumption_create_once_required:true,
  trainer_independent_consumption_slot_required:true,
  authorization_wide_consumption_slot_required:true,
  unique_authorization_claim_slot_record_required:true,
  unique_authorization_claim_slot_shape_qualified:true,
  unique_authorization_claim_slot_protected_origin_required:true,
  unique_authorization_claim_slot_protected_origin_proven:false,
  unique_authorization_claim_slot_revalidation_required:true,
  unique_authorization_claim_slot_revalidation_performed:false,
  training_start_slot_derived_from_authorization_slot_required:true,
  protected_namespace_keyed_by_consumption_slot_required:true,
  training_start_consumption_performed:false,
  existing_exact_consumption_reusable_admission:false,
  lost_ack_second_start_forbidden:true,
  automatic_retry_authorized:false,
  protected_consumption_store_required:true,
  protected_consumption_store_proven:false,
  recovery_classifier_protected_origin_proven:false,
  training_release_gate_required:true,
  bound_trainer_generation_revalidation_required_before_release:true,
  bound_trainer_generation_revalidation_performed:false,
  training_identity_policy_revalidation_required_before_release:true,
  training_identity_policy_revalidation_performed:false,
  bound_trainer_generation_loss_after_consumption_forfeits_attempt:true,
  training_release_performed:false,
  filesystem_read:false,filesystem_write:false,network_access:false,
  service_action:false,socket_action:false,training_execution_authorized:false,
  training_execution_performed:false,candidate_weight_mutation_performed:false,
  operator_private_key_access:false,production_signing:false,wallet_access:false,
  transaction_signing:false,transaction_broadcast:false,funds_movement:false,
})){
  assert.equal(VOID_APOLLYON_TRAINING_START_CONSUMPTION_AUTHORITY_V1[key],expected,key);
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-training-start-consumption-contract-v1.mjs"),
  "utf8",
);
for(const required of [
  "existing_exact_consumption_reusable_admission:false",
  "existing_consumption_collision",
  "lost_ack_second_start_forbidden:true",
  "trainer_independent_consumption_slot_qualified:true",
  "authorization_wide_consumption_slot_qualified:true",
  "unique_authorization_claim_slot_shape_qualified:true",
  "unique_authorization_claim_slot_protected_origin_proven:false",
  "unique_authorization_claim_slot_revalidation_performed:false",
  "training_start_slot_derived_from_authorization_slot:true",
  "protected_namespace_keyed_by_consumption_slot_required:true",
  "trainer_generation_must_remain_blocked_until_durable_consumption:true",
  'next_gate:"apollyon_training_start_consumption_implementation_v1"',
])assert.equal(source.includes(required),true,required);
for(const forbidden of [
  'from "node:fs"','from "node:net"','from "node:child_process"',
  "writeFileSync(","appendFileSync(","spawn(","execFile(","fetch(",
  "training_execution_authorized:true","training_execution_performed:true",
  "candidate_weight_mutation_performed:true","automatic_retry_authorized:true",
])assert.equal(source.includes(forbidden),false,forbidden);

console.log("VOID_APOLLYON_TRAINING_START_CONSUMPTION_V1_PROOF_GREEN");
console.log("durable_claim_success_is_bearer_training_authority=false");
console.log("exact_inert_pretraining_generation_required=true");
console.log("training_start_consumption_create_once_required=true");
console.log("trainer_independent_consumption_slot_required=true");
console.log("authorization_wide_consumption_slot_required=true");
console.log("unique_authorization_claim_slot_record_required=true");
console.log("unique_authorization_claim_slot_shape_qualified=true");
console.log("unique_authorization_claim_slot_protected_origin_proven=false");
console.log("unique_authorization_claim_slot_revalidation_required=true");
console.log("unique_authorization_claim_slot_revalidation_performed=false");
console.log("training_start_slot_derived_from_authorization_slot=true");
console.log("authorization_slot_record_id_tamper_rejected=true");
console.log("persisted_authorization_slot_record_id_forgery_rejected=true");
console.log("persisted_trainer_generation_identity_rederived=true");
console.log("alternate_claim_winner_mismatch_rejected=true");
console.log("forged_authorization_slot_id_rejected=true");
console.log("protected_namespace_keyed_by_consumption_slot_required=true");
console.log("two_trainer_same_slot_collision_closed=true");
console.log("same_authorization_different_claim_same_slot=true");
console.log("existing_exact_consumption_reusable_admission=false");
console.log("recovery_unconsumed_vs_already_consumed_closed=true");
console.log("recovery_classifier_protected_origin_proven=false");
console.log("create_once_publication_authorized=false");
console.log("lost_ack_second_start_forbidden=true");
console.log("training_start_consumption_performed=false");
console.log("bound_trainer_generation_revalidation_required_before_release=true");
console.log("bound_trainer_generation_loss_after_consumption_forfeits_attempt=true");
console.log("event_specific_transitive_workflow_trigger_closure=true");
console.log("training_execution=false");
