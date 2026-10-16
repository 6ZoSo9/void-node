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
  qualifyApollyonTrainingStartConsumptionContractV1,
} from "../tools/apollyon-training-start-consumption-contract-v1.mjs";
import {
  VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_AUTHORITY_V1,
  VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_KEYS_V1,
  VOID_APOLLYON_TRAINING_START_RELEASE_REQUIREMENTS_V1,
  qualifyApollyonTrainingStartReleaseBindingV1,
  qualifyApollyonTrainingStartReleasePolicyV1,
  validateApollyonTrainingStartReleaseBindingV1,
} from "../tools/apollyon-training-start-release-binding-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const WORKFLOW=path.join(
  ROOT,
  ".github/workflows/apollyon-training-start-release-binding-v1.yml",
);
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-training-start-release-binding-v1.mjs":
    "35e89b68846f559ab3ec536236cac79b88dd8124",
  "tools/apollyon-training-start-consumption-contract-v1.mjs":
    "f4b5c984cc67de470df1af949723eeaefba0393f",
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

const workflow=fs.readFileSync(WORKFLOW,"utf8");
const expectedTriggerPaths=[
  "tools/apollyon-training-start-release-binding-v1.mjs",
  "scripts/prove_apollyon_training_start_release_binding_v1.mjs",
  "docs/security/apollyon-training-start-release-binding-v1.md",
  ".github/workflows/apollyon-training-start-release-binding-v1.yml",
  "tools/apollyon-training-start-consumption-contract-v1.mjs",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs",
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
  assert.equal(pathMarkers.length,1,eventName+" exact paths subsection count");
  const paths=[];
  for(let index=pathMarkers[0]+1;index<eventLines.length;index++){
    const line=eventLines[index];
    const match=/^      - "([^"]+)"$/u.exec(line);
    if(match){paths.push(match[1]);continue;}
    if(/^\s*$/u.test(line))continue;
    if(!line.startsWith("      "))break;
    assert.fail(eventName+" malformed paths entry: "+line);
  }
  return paths;
}
function assertExactEventTriggerPaths(label,actual){
  assert.equal(actual.length,expectedTriggerPaths.length,label+" trigger path count");
  assert.equal(new Set(actual).size,actual.length,label+" duplicate trigger path");
  assert.deepEqual(
    [...actual].sort(),
    [...expectedTriggerPaths].sort(),
    label+" trigger closure mismatch",
  );
}
assertExactEventTriggerPaths(
  "pull_request",
  eventTriggerPaths(workflow,"pull_request","push"),
);
assertExactEventTriggerPaths(
  "push",
  eventTriggerPaths(workflow,"push","workflow_dispatch"),
);
assert.equal(workflow.includes("PUSH_BEFORE:"),true);
assert.equal(workflow.includes("github.event.before"),true);

const policy=qualifyApollyonDurableAttemptClaimStorePolicyV2();
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
function consumptionFor(trainerGeneration=trainer()){
  const claim_record=claimRecord();
  const publish_request_sha256="e".repeat(64);
  return qualifyApollyonTrainingStartConsumptionContractV1({
    claim_record,
    publish_request_sha256,
    success_response:success(claim_record,publish_request_sha256),
    trainer_generation:trainerGeneration,
  }).consumption_record;
}

const releasePolicy=qualifyApollyonTrainingStartReleasePolicyV1();
assert.match(
  releasePolicy.release_policy_id,
  /^apollyon_training_start_release_policy_v1:[0-9a-f]{64}$/u,
);
assert.deepEqual(
  qualifyApollyonTrainingStartReleasePolicyV1(),
  releasePolicy,
);

const record1=consumptionFor();
const binding1=qualifyApollyonTrainingStartReleaseBindingV1({
  consumption_record:record1,
});
assert.deepEqual(
  Object.keys(binding1).sort(),
  [...VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_KEYS_V1].sort(),
);
assert.equal(
  binding1.status,
  "training_start_release_binding_source_qualified_unimplemented",
);
assert.equal(binding1.release_policy_id,releasePolicy.release_policy_id);
assert.equal(
  binding1.training_start_consumption_slot_id,
  record1.training_start_consumption_slot_id,
);
assert.equal(
  binding1.training_start_consumption_id,
  record1.training_start_consumption_id,
);
assert.equal(binding1.trainer_generation_id,record1.trainer_generation_id);
assert.equal(binding1.trainer_pid,record1.trainer_pid);
assert.equal(
  binding1.trainer_process_start_time_ticks,
  record1.trainer_process_start_time_ticks,
);
assert.equal(binding1.protected_consumption_record_origin_proven,false);
assert.equal(binding1.consumption_durability_revalidation_performed,false);
assert.equal(binding1.live_trainer_generation_revalidation_performed,false);
assert.equal(binding1.training_identity_policy_revalidation_performed,false);
assert.equal(binding1.private_release_channel_origin_proven,false);
assert.equal(binding1.release_not_transferable_to_replacement_generation,true);
assert.equal(binding1.bound_generation_loss_forfeits_attempt,true);
assert.equal(binding1.trainer_release_performed,false);
assert.equal(binding1.training_execution_authorized,false);
assert.equal(binding1.training_execution_performed,false);
assert.equal(binding1.candidate_weight_mutation_performed,false);
assert.equal(binding1.automatic_retry_authorized,false);
assert.equal(
  binding1.next_gate,
  "apollyon_training_start_release_native_candidate_v1",
);
assert.match(
  binding1.release_binding_id,
  /^apollyon_training_start_release_binding_v1:[0-9a-f]{64}$/u,
);
assert.deepEqual(validateApollyonTrainingStartReleaseBindingV1(binding1),binding1);
assert.deepEqual(
  qualifyApollyonTrainingStartReleaseBindingV1({consumption_record:record1}),
  binding1,
);

const record2=consumptionFor(trainer({
  pid:5252,
  process_start_time_ticks:"223456",
  source_identity_sha256:"1".repeat(64),
}));
assert.equal(
  record2.training_start_consumption_slot_id,
  record1.training_start_consumption_slot_id,
);
assert.notEqual(
  record2.training_start_consumption_id,
  record1.training_start_consumption_id,
);
const binding2=qualifyApollyonTrainingStartReleaseBindingV1({
  consumption_record:record2,
});
assert.notEqual(binding2.trainer_generation_id,binding1.trainer_generation_id);
assert.notEqual(binding2.release_binding_id,binding1.release_binding_id);
assert.equal(binding2.release_not_transferable_to_replacement_generation,true);

{
  const bad=structuredClone(binding1);
  bad.trainer_pid+=1;
  assert.throws(
    ()=>validateApollyonTrainingStartReleaseBindingV1(bad),
    /binding_invalid|consumption_record/u,
  );
}
{
  const bad=structuredClone(binding1);
  Object.defineProperty(bad,"__proto__",{
    value:{training_execution_authorized:true},
    enumerable:true,
    configurable:true,
    writable:true,
  });
  assert.equal(Object.keys(bad).includes("__proto__"),true);
  assert.throws(
    ()=>validateApollyonTrainingStartReleaseBindingV1(bad),
    /binding_invalid/u,
  );
}
{
  const bad=structuredClone(binding1);
  Object.defineProperty(bad.authority,"__proto__",{
    value:{training_execution_authorized:true},
    enumerable:true,
    configurable:true,
    writable:true,
  });
  assert.equal(Object.keys(bad.authority).includes("__proto__"),true);
  assert.throws(
    ()=>validateApollyonTrainingStartReleaseBindingV1(bad),
    /authority_invalid/u,
  );
}

for(const [key,expected] of Object.entries({
  blocked_native_first_entry_required:true,
  block_before_model_or_weight_instruction_required:true,
  retained_pidfd_required:true,
  process_start_ticks_required:true,
  reviewed_executable_source_identity_required:true,
  private_inherited_release_channel_required:true,
  release_channel_reconstructible_from_pid_path_or_token_forbidden:true,
  caller_supplied_pid_signal_or_token_release_forbidden:true,
  generic_filesystem_flag_release_forbidden:true,
  exact_release_frame_required:true,
  release_channel_eof_before_authorization_fail_closed:true,
  releaser_crash_before_authorization_fail_closed:true,
  exact_consumption_slot_durable_before_release_required:true,
  consumption_file_fsync_required:true,
  consumption_directory_fsync_required:true,
  final_visible_consumption_record_reread_required:true,
  same_trainer_generation_revalidation_immediately_before_release_required:true,
  exact_uid_gid_groups_nnp_caps_revalidation_required:true,
  trainer_consumption_store_write_rename_unlink_denied_required:true,
  trainer_self_release_forbidden:true,
  pid_reuse_rejected_required:true,
  second_trainer_generation_release_rejected_required:true,
  bound_generation_loss_forfeits_attempt_required:true,
  release_not_transferable_to_replacement_generation_required:true,
  automatic_retry_authorized:false,
})){
  assert.equal(VOID_APOLLYON_TRAINING_START_RELEASE_REQUIREMENTS_V1[key],expected,key);
}

for(const [key,expected] of Object.entries({
  source_only_contract:true,
  exact_parent_consumption_record_required:true,
  release_policy_content_addressed:true,
  release_binding_content_addressed:true,
  protected_consumption_record_origin_required:true,
  protected_consumption_record_origin_proven:false,
  consumption_durability_revalidation_required:true,
  consumption_durability_revalidation_performed:false,
  live_trainer_generation_revalidation_required:true,
  live_trainer_generation_revalidation_performed:false,
  training_identity_policy_revalidation_required:true,
  training_identity_policy_revalidation_performed:false,
  private_release_channel_required:true,
  private_release_channel_origin_proven:false,
  trainer_release_performed:false,
  training_execution_authorized:false,
  training_execution_performed:false,
  candidate_weight_mutation_performed:false,
  automatic_retry_authorized:false,
  filesystem_read:false,filesystem_write:false,network_access:false,
  service_action:false,socket_action:false,operator_private_key_access:false,
  production_signing:false,wallet_access:false,transaction_signing:false,
  transaction_broadcast:false,funds_movement:false,
})){
  assert.equal(
    VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-training-start-release-binding-v1.mjs"),
  "utf8",
);
for(const forbidden of [
  'from "node:fs"','from "node:net"','from "node:child_process"',
  "writeFile","appendFile","systemctl","spawn(","execFile(","fetch(",
  "createPrivateKey","crypto.sign(","trainer_release_performed:true",
  "training_execution_authorized:true","training_execution_performed:true",
  "candidate_weight_mutation_performed:true","filesystem_write:true",
  "network_access:true","service_action:true","socket_action:true",
  "operator_private_key_access:true","production_signing:true",
  "wallet_access:true","transaction_signing:true",
  "transaction_broadcast:true","funds_movement:true",
])assert.equal(source.includes(forbidden),false,forbidden);

console.log("VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_V1_PROOF_GREEN");
console.log("release_binding_content_addressed=true");
console.log("same_slot_different_trainer_release_binding_distinct=true");
console.log("release_not_transferable_to_replacement_generation=true");
console.log("protected_consumption_record_origin_proven=false");
console.log("live_trainer_generation_revalidation_performed=false");
console.log("private_release_channel_origin_proven=false");
console.log("trainer_release_performed=false");
console.log("training_execution=false");
