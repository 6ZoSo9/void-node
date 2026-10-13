#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalApollyonClaimContractJsonV1,
  qualifyApollyonCandidateTrainingAttemptClaimContractV1,
} from "../tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs";
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function custodyRecord(){return {
  marker:"VOID_APOLLYON_AUTHORIZATION_CUSTODY_RECORD_V1",version:1,
  custody_generation_id:"apollyon_custody_generation_v1:"+"1".repeat(64),
  authorization_id:"apollyon_authz_v1:"+"2".repeat(64),
  operator_public_key_raw_sha256:"3".repeat(64),target_host:"Xiphos",action:"candidate_training_attempt_v1",
  request_sha256:"4".repeat(64),canonical_main:"5".repeat(40),canonical_tree:"6".repeat(40),
  corpus_sha256:"7".repeat(64),parent_adapter_sha256:"8".repeat(64),
  custody_policy:{one_authorization_record_only:true,automatic_retry_authorized:false,attempt_claimed:false,training_execution_performed:false},
};}
function live(){return {
  marker:"VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V1",version:1,status:"live_host_independent_custody_qualified",target_host:"Xiphos",
  collector_blob_sha1:"899864a8305c54c64bcc2bab6dc1f50b599b0706",policy_blob_sha1:"6f34e79d94c502e31ca4923fd78922d4875550a5",
  first_source_policy_qualification_id:"apollyon_custody_policy_v1:"+"9".repeat(64),second_source_policy_qualification_id:"apollyon_custody_policy_v1:"+"a".repeat(64),
  boot_id_sha256:"b".repeat(64),first_evidence_generation:100,second_evidence_generation:200,observed_at_ms:1000,verification_now_ms:1100,
  host_state_sha256:"c".repeat(64),verification_clock_authority_proven:true,evidence_generation_monotonicity_proven:true,
  live_host_qualification_performed:true,independent_custody_proven:true,custody_production_gate_ready:true,
  attempt_claim_authorized:false,attempt_claimed:false,training_execution_authorized:false,training_execution_performed:false,
  candidate_weight_mutation_performed:false,generation_execution_performed:false,operator_private_key_access_performed:false,
  production_signing_performed:false,wallet_access_performed:false,transaction_signing_performed:false,transaction_broadcast_performed:false,
  funds_movement_performed:false,network_access_performed:false,persistent_receipt_write_performed:false,
  next_gate:"candidate_training_attempt_claim_contract_v1",live_qualification_id:"apollyon_custody_live_v1:"+"d".repeat(64),
  authority:{read_only:true,designated_host_only:true,exact_collector_blob_required:true,exact_policy_blob_required:true,caller_supplied_evidence:false,
    two_live_observations_required:true,same_boot_required:true,increasing_boottime_generation_required:true,stable_host_projection_required:true,
    source_policy_qualification_required:true,host_mutation:false,service_action:false,operator_private_key_access:false,production_signing:false,
    authorization_consumption:false,attempt_claim:false,training_execution:false,candidate_weight_mutation:false,generation_execution:false,
    wallet_access:false,transaction_signing:false,transaction_broadcast:false,funds_movement:false,network_access:false,persistent_receipt_write:false},
};}
function assertion(record){return {ok:true,marker:"VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1",version:1,status:"authorization_custody_asserted",
  custody_generation_id:record.custody_generation_id,authorization_id:record.authorization_id,
  record_sha256:sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(record)+"\n","utf8")),authorization_custodied:true,attempt_claimed:false,training_execution_performed:false};}
const record=custodyRecord();
const result=qualifyApollyonCandidateTrainingAttemptClaimContractV1({live_qualification:live(),custody_assertion:assertion(record),custody_record:record});
assert.equal(result.status,"claim_contract_qualified_unclaimed");
assert.equal(result.attempt_limit,1);assert.equal(result.same_live_custody_session_binding_proven,false);assert.equal(result.attempt_claimed,false);assert.equal(result.training_execution_performed,false);
assert.match(result.claim_contract_id,/^apollyon_claim_contract_v1:[0-9a-f]{64}$/u);
{
 const bad=JSON.parse(JSON.stringify(record));bad.request_sha256="e".repeat(64);
 assert.throws(()=>qualifyApollyonCandidateTrainingAttemptClaimContractV1({live_qualification:live(),custody_assertion:assertion(record),custody_record:bad}),/custody_cross_binding_invalid/u);
}
{
 const l=live();l.independent_custody_proven=false;
 assert.throws(()=>qualifyApollyonCandidateTrainingAttemptClaimContractV1({live_qualification:l,custody_assertion:assertion(record),custody_record:record}),/live_qualification_invalid/u);
}
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const src=fs.readFileSync(path.join(ROOT,"tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs"),"utf8");
for(const forbidden of ["node:fs","node:child_process","writeFileSync(","spawn","fetch(","createPrivateKey","crypto.sign(","Wallet(","attempt_claimed:true","training_execution_performed:true"]){
 assert.equal(src.includes(forbidden),false,forbidden);
}
console.log("VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V1_PROOF_GREEN");
console.log("live_v84_required=true");console.log("custody_record_hash_bound=true");console.log("same_live_custody_session_binding_proven=false");console.log("attempt_claimed=false");console.log("training_execution=false");
