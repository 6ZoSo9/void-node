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
  qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1,
} from "../tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs";
import {
  VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_AUTHORITY_V1,
  RELEASE_FRAME_BYTES_V1,
  RELEASE_FRAME_DOMAIN_SHA256_HEX_V1,
  VOID_APOLLYON_TRAINING_START_RELEASE_BINDING_KEYS_V1,
  VOID_APOLLYON_TRAINING_START_RELEASE_CHANNEL_ORIGIN_SHAPE_KEYS_V1,
  VOID_APOLLYON_TRAINING_START_RELEASE_REQUIREMENTS_V1,
  apollyonTrainingStartReleaseFrameV1,
  qualifyApollyonTrainingStartReleaseBindingV1,
  qualifyApollyonTrainingStartReleaseChannelOriginShapeV1,
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
    "a7e4a69b9561fe441a0a1ab7476c6329e2cea3a8",
  "tools/apollyon-training-start-consumption-contract-v1.mjs":
    "42d7d5d4ab75bfd4fc145f63c2a0432f9bcf9bd3",
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs":
    "c2ff992a09fe916a5016b5a6c4ceced4ab1d2fa8",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs":
    "87019ae1245a2054407dd47835b0b7a891d4d9a2",
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
  "scripts/prove_apollyon_training_start_consumption_contract_v1.mjs",
  "docs/security/apollyon-training-start-consumption-contract-v1.md",
  ".github/workflows/apollyon-training-start-consumption-contract-v1.yml",
  "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs",
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs",
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
function authorizationSlotRecordFor(
  claim_record,
  publish_request_sha256,
){
  return qualifyApollyonDurableAttemptClaimAuthorizationSlotRecordV1({
    store_policy_id:claim_record.store_policy_id,
    authorization_id:claim_record.authorization_id,
    store_contract_id:claim_record.store_contract_id,
    store_generation_id:claim_record.store_generation_id,
    terminal_receipt_id:claim_record.terminal_receipt_id,
    claim_record_id:claim_record.claim_record_id,
    claim_record_sha256:sha256(Buffer.from(
      canonicalApollyonClaimContractJsonV1(claim_record)+"\n","utf8"
    )),
    publish_request_sha256,
    attempt_limit:1,
    automatic_retry_authorized:false,
  });
}
function consumptionFor(
  trainerGeneration=trainer(),
  claim_record=claimRecord(),
  publish_request_sha256="e".repeat(64),
){
  const authorization_slot_record=authorizationSlotRecordFor(
    claim_record,
    publish_request_sha256,
  );
  return qualifyApollyonTrainingStartConsumptionContractV1({
    authorization_slot_record,
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
assert.equal(
  releasePolicy.authorization_slot_v1_blob_sha1,
  "c2ff992a09fe916a5016b5a6c4ceced4ab1d2fa8",
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
assert.equal(binding1.authorization_slot_id,record1.authorization_slot_id);
assert.equal(
  binding1.authorization_slot_record_id,
  record1.authorization_slot_record_id,
);
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
assert.equal(binding1.releaser_generation_revalidation_required,true);
assert.equal(binding1.releaser_generation_revalidation_performed,false);
assert.equal(binding1.trainer_releaser_lineage_required,true);
assert.equal(binding1.trainer_releaser_lineage_proven,false);
assert.equal(binding1.release_writer_exclusivity_required,true);
assert.equal(binding1.release_writer_exclusivity_proven,false);
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

const frame1=apollyonTrainingStartReleaseFrameV1(binding1);
assert.equal(frame1.length,RELEASE_FRAME_BYTES_V1);
assert.equal(RELEASE_FRAME_BYTES_V1,64);
assert.equal(
  frame1.subarray(0,32).toString("hex"),
  RELEASE_FRAME_DOMAIN_SHA256_HEX_V1,
);
assert.equal(
  frame1.subarray(32).toString("hex"),
  sha256(Buffer.from(binding1.release_binding_id,"utf8")),
);

function channelShape(overrides={}){
  return {
    release_binding:binding1,
    correct_release_frame_sha256:sha256(frame1),
    releaser_generation:{
      marker:"VOID_APOLLYON_TRAINING_START_RELEASER_GENERATION_V1",
      version:1,
      pid:31337,
      process_start_time_ticks:"998877",
      uid:0,
      gid:0,
      supplementary_gids:[],
      source_identity_sha256:"a".repeat(64),
      pidfd_retained:true,
    },
    trainer_observed_ppid:31337,
    trainer_inherits_release_read_end_only:true,
    trainer_release_write_end_absent:true,
    release_write_end_exclusive_to_releaser:true,
    unrelated_duplicate_writer_fds_absent:true,
    releaser_live_through_frame_completion:true,
    ...overrides,
  };
}
const originShape=qualifyApollyonTrainingStartReleaseChannelOriginShapeV1(
  channelShape(),
);
assert.equal(
  originShape.status,
  "release_channel_origin_shape_qualified_not_authenticated",
);
assert.equal(originShape.release_binding_id,binding1.release_binding_id);
assert.equal(originShape.correct_release_frame_shape_qualified,true);
assert.equal(originShape.releaser_generation_shape_qualified,true);
assert.equal(originShape.trainer_direct_parent_releaser_lineage_shape_qualified,true);
assert.equal(originShape.trainer_read_end_only_shape_qualified,true);
assert.equal(originShape.release_write_end_exclusivity_shape_qualified,true);
assert.equal(originShape.private_release_channel_origin_proven,false);
assert.equal(originShape.trainer_release_authorized,false);
assert.equal(originShape.trainer_release_performed,false);
assert.equal(originShape.training_execution_authorized,false);
assert.equal(originShape.training_execution_performed,false);
assert.deepEqual(
  Object.keys(channelShape()).sort(),
  [...VOID_APOLLYON_TRAINING_START_RELEASE_CHANNEL_ORIGIN_SHAPE_KEYS_V1].sort(),
);

// Correct deterministic frame bytes are not enough without reviewed writer shape.
assert.throws(
  ()=>qualifyApollyonTrainingStartReleaseChannelOriginShapeV1({
    release_binding:binding1,
    correct_release_frame_sha256:sha256(frame1),
  }),
  /channel_origin_shape_invalid/u,
);
assert.throws(
  ()=>qualifyApollyonTrainingStartReleaseChannelOriginShapeV1(
    channelShape({trainer_observed_ppid:31338}),
  ),
  /channel_origin_shape_invalid/u,
);
assert.throws(
  ()=>qualifyApollyonTrainingStartReleaseChannelOriginShapeV1(
    channelShape({release_write_end_exclusive_to_releaser:false}),
  ),
  /channel_origin_shape_invalid/u,
);
assert.throws(
  ()=>qualifyApollyonTrainingStartReleaseChannelOriginShapeV1(
    channelShape({unrelated_duplicate_writer_fds_absent:false}),
  ),
  /channel_origin_shape_invalid/u,
);
{
  const bad=channelShape();
  bad.releaser_generation.source_identity_sha256="not-reviewed";
  assert.throws(
    ()=>qualifyApollyonTrainingStartReleaseChannelOriginShapeV1(bad),
    /releaser_generation_invalid|channel_origin_shape_invalid/u,
  );
}
{
  const bad=channelShape();
  bad.releaser_generation.supplementary_gids=[7,7];
  assert.throws(
    ()=>qualifyApollyonTrainingStartReleaseChannelOriginShapeV1(bad),
    /channel_origin_shape_invalid/u,
  );
}

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
assert.equal(record2.authorization_slot_id,record1.authorization_slot_id);
assert.equal(
  record2.authorization_slot_record_id,
  record1.authorization_slot_record_id,
);
const binding2=qualifyApollyonTrainingStartReleaseBindingV1({
  consumption_record:record2,
});
assert.notEqual(binding2.trainer_generation_id,binding1.trainer_generation_id);
assert.notEqual(binding2.release_binding_id,binding1.release_binding_id);
assert.equal(binding2.release_not_transferable_to_replacement_generation,true);
const frame2=apollyonTrainingStartReleaseFrameV1(binding2);
assert.notDeepEqual(frame2,frame1);
assert.equal(frame2.length,64);

function recomputeReleaseBindingId(value){
  const material=structuredClone(value);
  delete material.release_binding_id;
  delete material.authority;
  return "apollyon_training_start_release_binding_v1:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8"));
}
{
  const bad=structuredClone(binding1);
  bad.trainer_pid+=1;
  // The stricter persisted-consumption validator must reject the mismatched
  // trainer-generation ID before outer release-binding checks run.
  assert.throws(
    ()=>validateApollyonTrainingStartReleaseBindingV1(bad),
    /trainer_generation_id_invalid/u,
  );
}
{
  const bad=structuredClone(binding1);
  bad.authorization_slot_id=
    "apollyon_attempt_claim_auth_slot_v1:"+"a".repeat(64);
  bad.release_binding_id=recomputeReleaseBindingId(bad);
  assert.throws(
    ()=>validateApollyonTrainingStartReleaseBindingV1(bad),
    /binding_invalid|authorization_slot|consumption_record/u,
  );
}
{
  const bad=structuredClone(binding1);
  bad.authorization_slot_record_id=
    "apollyon_attempt_claim_auth_slot_record_v1:"+"b".repeat(64);
  bad.release_binding_id=recomputeReleaseBindingId(bad);
  assert.throws(
    ()=>validateApollyonTrainingStartReleaseBindingV1(bad),
    /binding_invalid|authorization_slot|consumption_record/u,
  );
}
{
  const alternateClaim=claimRecord({
    store_generation_id:"apollyon_claim_store_generation_v2:"+"c".repeat(64),
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+"d".repeat(64),
  });
  const alternateRecord=consumptionFor(
    trainer({
      pid:6262,
      process_start_time_ticks:"323456",
      source_identity_sha256:"2".repeat(64),
    }),
    alternateClaim,
    "1".repeat(64),
  );
  const alternateBinding=qualifyApollyonTrainingStartReleaseBindingV1({
    consumption_record:alternateRecord,
  });
  assert.equal(
    alternateBinding.authorization_slot_id,
    binding1.authorization_slot_id,
  );
  assert.notEqual(
    alternateBinding.authorization_slot_record_id,
    binding1.authorization_slot_record_id,
  );
  assert.notEqual(alternateBinding.release_binding_id,binding1.release_binding_id);
  assert.equal(
    alternateBinding.unique_authorization_claim_slot_revalidation_performed,
    false,
  );
  assert.equal(alternateBinding.trainer_release_performed,false);
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
  reviewed_releaser_generation_required:true,
  releaser_pidfd_retained_required:true,
  releaser_start_ticks_bound_required:true,
  releaser_source_identity_exact_required:true,
  releaser_uid_gid_groups_identity_required:true,
  releaser_live_through_authorized_frame_completion_required:true,
  trainer_direct_parent_releaser_lineage_required:true,
  trainer_inherits_release_read_end_only_required:true,
  trainer_release_write_end_absent_required:true,
  release_write_end_exclusive_to_reviewed_releaser_required:true,
  unrelated_duplicate_release_writer_fds_rejected_required:true,
  correct_frame_from_unreviewed_writer_is_authority:false,
  release_channel_reconstructible_from_pid_path_or_token_forbidden:true,
  caller_supplied_pid_signal_or_token_release_forbidden:true,
  generic_filesystem_flag_release_forbidden:true,
  exact_release_frame_required:true,
  release_frame_bytes:64,
  release_frame_domain_sha256_hex:
    "c201c621cc904c2e9c0c2527322debc326736b7f5e2c731a1032d2f1d3cb2b16",
  release_frame_binding_component_sha256_of_release_binding_id_utf8_required:true,
  release_frame_exact_read_then_eof_required:true,
  release_frame_bytes_are_not_bearer_authority:true,
  release_channel_eof_before_authorization_fail_closed:true,
  releaser_crash_before_authorization_fail_closed:true,
  exact_consumption_slot_durable_before_release_required:true,
  consumption_file_fsync_required:true,
  consumption_directory_fsync_required:true,
  final_visible_consumption_record_reread_required:true,
  unique_authorization_claim_slot_ids_preserved_required:true,
  unique_authorization_claim_slot_protected_origin_required:true,
  unique_authorization_claim_slot_revalidation_immediately_before_release_required:true,
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
  unique_authorization_claim_slot_required:true,
  unique_authorization_claim_slot_protected_origin_required:true,
  unique_authorization_claim_slot_protected_origin_proven:false,
  unique_authorization_claim_slot_revalidation_required:true,
  unique_authorization_claim_slot_revalidation_performed:false,
  live_trainer_generation_revalidation_required:true,
  live_trainer_generation_revalidation_performed:false,
  training_identity_policy_revalidation_required:true,
  training_identity_policy_revalidation_performed:false,
  private_release_channel_required:true,
  private_release_channel_origin_proven:false,
  releaser_generation_revalidation_required:true,
  releaser_generation_revalidation_performed:false,
  trainer_releaser_lineage_required:true,
  trainer_releaser_lineage_proven:false,
  release_writer_exclusivity_required:true,
  release_writer_exclusivity_proven:false,
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
console.log("authorization_slot_generation_bound=true");
console.log("authorization_slot_lineage_preserved=true");
console.log("authorization_slot_record_lineage_preserved=true");
console.log("authorization_slot_tamper_rejected=true");
console.log("alternate_claim_winner_release_binding_distinct=true");
console.log("unique_authorization_claim_slot_revalidation_performed=false");
console.log("same_slot_different_trainer_release_binding_distinct=true");
console.log("release_not_transferable_to_replacement_generation=true");
console.log("release_frame_bytes=64");
console.log("release_frame_non_bearer=true");
console.log("reviewed_releaser_generation_required=true");
console.log("trainer_releaser_lineage_required=true");
console.log("exclusive_reviewed_release_writer_required=true");
console.log("correct_frame_from_unreviewed_writer_insufficient=true");
console.log("release_channel_origin_shape_is_not_authority=true");
console.log("protected_consumption_record_origin_proven=false");
console.log("live_trainer_generation_revalidation_performed=false");
console.log("private_release_channel_origin_proven=false");
console.log("trainer_release_performed=false");
console.log("training_execution=false");
