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
  canonicalApollyonPreclaimV2Json,
} from "../tools/apollyon-candidate-training-preclaim-v2.mjs";
import {
  VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_AUTHORITY_V2,
  qualifyApollyonCandidateTrainingAttemptClaimContractV2,
} from "../tools/apollyon-candidate-training-attempt-claim-contract-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
assert.equal(
  gitBlob(fs.readFileSync(path.join(ROOT,"tools/apollyon-candidate-training-preclaim-v2.mjs"))),
  "d062fe9d8f70f731e157c8d9f835d3f936ac5d59",
);
assert.equal(
  gitBlob(fs.readFileSync(path.join(ROOT,"tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs"))),
  "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
);

function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function preclaim(){
  const material={
    marker:"VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_V2",
    version:2,
    status:"current_v2_custody_composed_with_live_training_isolation",
    target_host:"Xiphos",
    current_v2_policy_blob_sha1:"db5493a513a42780865e7194580eec3b770dc8e1",
    current_v2_live_qualifier_blob_sha1:"435e23d26fa32405e36d5dad17b033ea4ec910e0",
    installed_isolation_qualifier_blob_sha1:"1fdb495aafa136119d50f41410b015930d9fc90d",
    installed_isolation_qualification_id:"apollyon_training_isolation_live_v1:"+"1".repeat(64),
    current_v2_live_qualification_id:"apollyon_custody_live_v2:"+"2".repeat(64),
    training_pid:4242,
    training_process_start_time_ticks:"123456",
    boot_id_sha256:"3".repeat(64),
    same_training_process_generation_bound:true,
    descriptor_absence_composed_into_v2:true,
    absolute_service_control_denial_composed_into_v2:true,
    historical_v84_v1_sufficient:false,
    live_service_source_identity_required:true,
    live_service_source_identity_proven:false,
    same_live_custody_session_binding_required:true,
    same_live_custody_session_binding_proven:false,
    durable_attempt_claim_required:true,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    generation_execution_performed:false,
    next_gate:"live_custody_service_source_identity_binding_v2",
    authority:{
      source_only_composition:true,current_v2_custody_required:true,
      installed_live_isolation_required:true,same_training_process_generation_required:true,
      historical_v84_v1_sufficient:false,live_service_source_identity_required:true,
      live_service_source_identity_proven:false,same_live_custody_session_binding_required:true,
      same_live_custody_session_binding_proven:false,durable_attempt_claim_required:true,
      durable_attempt_claim_performed:false,attempt_claim_authorized:false,attempt_claimed:false,
      training_execution_authorized:false,training_execution_performed:false,
      candidate_weight_mutation_performed:false,generation_execution_performed:false,
      filesystem_read:false,filesystem_write:false,network_access:false,service_action:false,
      credential_access:false,wallet_or_signer_access:false,transaction:false,funds_movement:false,
    },
  };
  return {
    ...material,
    preclaim_id:"apollyon_preclaim_v2:"+
      sha256(Buffer.from(canonicalApollyonPreclaimV2Json(material),"utf8")),
  };
}
function record(){
  return {
    marker:"VOID_APOLLYON_AUTHORIZATION_CUSTODY_RECORD_V1",version:1,
    custody_generation_id:"apollyon_custody_generation_v1:"+"4".repeat(64),
    authorization_id:"apollyon_authz_v1:"+"5".repeat(64),
    operator_public_key_raw_sha256:"6".repeat(64),
    target_host:"Xiphos",action:"candidate_training_attempt_v1",
    request_sha256:"7".repeat(64),canonical_main:"8".repeat(40),
    canonical_tree:"9".repeat(40),corpus_sha256:"a".repeat(64),
    parent_adapter_sha256:"b".repeat(64),
    custody_policy:{
      one_authorization_record_only:true,
      automatic_retry_authorized:false,
      attempt_claimed:false,
      training_execution_performed:false,
    },
  };
}
function assertion(row){
  return {
    ok:true,marker:"VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1",version:1,
    status:"authorization_custody_asserted",
    custody_generation_id:row.custody_generation_id,
    authorization_id:row.authorization_id,
    record_sha256:sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(row)+"\n","utf8")),
    authorization_custodied:true,attempt_claimed:false,training_execution_performed:false,
  };
}

const row=record();
const result=qualifyApollyonCandidateTrainingAttemptClaimContractV2({
  preclaim:preclaim(),custody_assertion:assertion(row),custody_record:row,
});
assert.equal(result.status,"current_v2_claim_contract_qualified_unclaimed");
assert.equal(result.attempt_limit,1);
assert.equal(result.current_v2_preclaim_bound,true);
assert.equal(result.exact_custody_record_bound,true);
assert.equal(result.historical_v84_v1_sufficient,false);
assert.equal(result.live_service_source_identity_proven,false);
assert.equal(result.same_live_custody_session_binding_proven,false);
assert.equal(result.attempt_claimed,false);
assert.equal(result.training_execution_performed,false);
assert.match(result.claim_contract_id,/^apollyon_claim_contract_v2:[0-9a-f]{64}$/u);

{
  const bad=record();bad.request_sha256="c".repeat(64);
  assert.throws(
    ()=>qualifyApollyonCandidateTrainingAttemptClaimContractV2({
      preclaim:preclaim(),custody_assertion:assertion(row),custody_record:bad,
    }),
    /custody_cross_binding_invalid/u,
  );
}
{
  const bad=preclaim();bad.historical_v84_v1_sufficient=true;
  const material=structuredClone(bad);delete material.preclaim_id;
  bad.preclaim_id="apollyon_preclaim_v2:"+
    sha256(Buffer.from(canonicalApollyonPreclaimV2Json(material),"utf8"));
  assert.throws(
    ()=>qualifyApollyonCandidateTrainingAttemptClaimContractV2({
      preclaim:bad,custody_assertion:assertion(row),custody_record:row,
    }),
    /preclaim_invalid/u,
  );
}
{
  const historical={
    marker:"VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V1",
    version:1,
  };
  assert.throws(
    ()=>qualifyApollyonCandidateTrainingAttemptClaimContractV2({
      preclaim:historical,custody_assertion:assertion(row),custody_record:row,
    }),
    /preclaim_invalid/u,
  );
}

for(const [key,expected] of Object.entries({
  source_only_contract:true,current_v2_preclaim_required:true,
  exact_custody_assertion_required:true,exact_custody_record_required:true,
  exact_custody_record_hash_required:true,historical_v84_v1_sufficient:false,
  live_service_source_identity_proven:false,same_live_custody_session_binding_proven:false,
  durable_claim_performed:false,attempt_claimed:false,
  training_execution_authorized:false,training_execution_performed:false,
  candidate_weight_mutation_performed:false,filesystem_read:false,filesystem_write:false,
  network_access:false,service_action:false,funds_movement:false,
})){
  assert.equal(
    VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_AUTHORITY_V2[key],
    expected,key,
  );
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-candidate-training-attempt-claim-contract-v2.mjs"),
  "utf8",
);
for(const required of [
  "canonicalApollyonPreclaimV2Json",
  "canonicalApollyonClaimContractJsonV1",
  'historical_v84_v1_sufficient:false',
  'next_gate:"live_custody_service_source_identity_binding_v2"',
]){
  assert.equal(source.includes(required),true,required);
}
for(const forbidden of [
  "node:fs","node:net","node:child_process","writeFileSync(","spawn(",
  "attempt_claimed:true","training_execution_performed:true",
  "candidate_weight_mutation_performed:true","createPrivateKey","crypto.sign(",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V2_PROOF_GREEN");
console.log("current_v2_preclaim_required=true");
console.log("exact_custody_record_bound=true");
console.log("historical_v84_v1_sufficient=false");
console.log("live_service_source_identity_proven=false");
console.log("same_live_custody_session_binding_proven=false");
console.log("durable_attempt_claim_performed=false");
console.log("training_execution=false");
