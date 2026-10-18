#!/usr/bin/env node
import crypto from "node:crypto";
import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  canonicalApollyonPreclaimV2Json,
} from "./apollyon-candidate-training-preclaim-v2.mjs";

export const VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V2 =
  "VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V2";

export const VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_AUTHORITY_V2 =
  Object.freeze({
    source_only_contract:true,
    current_v2_preclaim_required:true,
    exact_custody_assertion_required:true,
    exact_custody_record_required:true,
    exact_custody_record_hash_required:true,
    historical_v84_v1_sufficient:false,
    live_service_source_identity_required:true,
    live_service_source_identity_proven:false,
    same_live_custody_session_binding_required:true,
    same_live_custody_session_binding_proven:false,
    durable_claim_executor_required:true,
    durable_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    generation_execution_performed:false,
    filesystem_read:false,
    filesystem_write:false,
    network_access:false,
    service_action:false,
    operator_private_key_access:false,
    production_signing:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
  });

const PRECLAIM_V2_BLOB_SHA1="d062fe9d8f70f731e157c8d9f835d3f936ac5d59";
const V1_CANONICALIZER_BLOB_SHA1="f97fafb0148527ae3a954e2752faef8c7fc9e88e";
const HASH64=/^[0-9a-f]{64}$/u;
const GIT40=/^[0-9a-f]{40}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const GENERATION_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;
const PRECLAIM_ID=/^apollyon_preclaim_v2:[0-9a-f]{64}$/u;
const LIVE_V2_ID=/^apollyon_custody_live_v2:[0-9a-f]{64}$/u;
const ISOLATION_ID=/^apollyon_training_isolation_live_v1:[0-9a-f]{64}$/u;

function fail(code){throw new Error(code);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function exactKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index]))fail(code);
}
function requireFalse(value,keys,code){
  for(const key of keys)if(value[key]!==false)fail(code);
}
function requireTrue(value,keys,code){
  for(const key of keys)if(value[key]!==true)fail(code);
}

function validateAuthority(value){
  exactKeys(value,[
    "attempt_claim_authorized","attempt_claimed","candidate_weight_mutation_performed",
    "credential_access","current_v2_custody_required","durable_attempt_claim_performed",
    "durable_attempt_claim_required","filesystem_read","filesystem_write","funds_movement",
    "generation_execution_performed","historical_v84_v1_sufficient",
    "installed_live_isolation_required","live_service_source_identity_proven",
    "live_service_source_identity_required","network_access","same_live_custody_session_binding_proven",
    "same_live_custody_session_binding_required","same_training_process_generation_required",
    "service_action","source_only_composition","training_execution_authorized",
    "training_execution_performed","transaction","wallet_or_signer_access",
  ],"apollyon_claim_contract_v2_preclaim_authority_invalid");
  requireTrue(value,[
    "source_only_composition","current_v2_custody_required","installed_live_isolation_required",
    "same_training_process_generation_required","live_service_source_identity_required",
    "same_live_custody_session_binding_required","durable_attempt_claim_required",
  ],"apollyon_claim_contract_v2_preclaim_authority_invalid");
  requireFalse(value,[
    "historical_v84_v1_sufficient","live_service_source_identity_proven",
    "same_live_custody_session_binding_proven","durable_attempt_claim_performed",
    "attempt_claim_authorized","attempt_claimed","training_execution_authorized",
    "training_execution_performed","candidate_weight_mutation_performed",
    "generation_execution_performed","filesystem_read","filesystem_write","network_access",
    "service_action","credential_access","wallet_or_signer_access","transaction","funds_movement",
  ],"apollyon_claim_contract_v2_preclaim_authority_invalid");
}

function validatePreclaim(value){
  exactKeys(value,[
    "absolute_service_control_denial_composed_into_v2","attempt_claim_authorized",
    "attempt_claimed","authority","boot_id_sha256","candidate_weight_mutation_performed",
    "current_v2_live_qualification_id","current_v2_live_qualifier_blob_sha1",
    "current_v2_policy_blob_sha1","descriptor_absence_composed_into_v2",
    "durable_attempt_claim_performed","durable_attempt_claim_required",
    "generation_execution_performed","historical_v84_v1_sufficient",
    "installed_isolation_qualification_id","installed_isolation_qualifier_blob_sha1",
    "live_service_source_identity_proven","live_service_source_identity_required",
    "marker","next_gate","preclaim_id","same_live_custody_session_binding_proven",
    "same_live_custody_session_binding_required","same_training_process_generation_bound",
    "status","target_host","training_execution_authorized","training_execution_performed",
    "training_pid","training_process_start_time_ticks","version",
  ],"apollyon_claim_contract_v2_preclaim_invalid");
  if(
    value.marker!=="VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_V2"||
    value.version!==2||
    value.status!=="current_v2_custody_composed_with_live_training_isolation"||
    value.target_host!=="Xiphos"||
    value.current_v2_policy_blob_sha1!=="db5493a513a42780865e7194580eec3b770dc8e1"||
    value.current_v2_live_qualifier_blob_sha1!=="435e23d26fa32405e36d5dad17b033ea4ec910e0"||
    value.installed_isolation_qualifier_blob_sha1!=="1fdb495aafa136119d50f41410b015930d9fc90d"||
    !PRECLAIM_ID.test(value.preclaim_id)||
    !LIVE_V2_ID.test(value.current_v2_live_qualification_id)||
    !ISOLATION_ID.test(value.installed_isolation_qualification_id)||
    !HASH64.test(value.boot_id_sha256)||
    !Number.isSafeInteger(value.training_pid)||value.training_pid<=0||
    typeof value.training_process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(value.training_process_start_time_ticks)||
    value.next_gate!=="live_custody_service_source_identity_binding_v2"
  )fail("apollyon_claim_contract_v2_preclaim_invalid");
  requireTrue(value,[
    "same_training_process_generation_bound","descriptor_absence_composed_into_v2",
    "absolute_service_control_denial_composed_into_v2","live_service_source_identity_required",
    "same_live_custody_session_binding_required","durable_attempt_claim_required",
  ],"apollyon_claim_contract_v2_preclaim_invalid");
  requireFalse(value,[
    "historical_v84_v1_sufficient","live_service_source_identity_proven",
    "same_live_custody_session_binding_proven","durable_attempt_claim_performed",
    "attempt_claim_authorized","attempt_claimed","training_execution_authorized",
    "training_execution_performed","candidate_weight_mutation_performed",
    "generation_execution_performed",
  ],"apollyon_claim_contract_v2_preclaim_invalid");
  validateAuthority(value.authority);
  const material=structuredClone(value);
  delete material.preclaim_id;
  const expected="apollyon_preclaim_v2:"+
    sha256(Buffer.from(canonicalApollyonPreclaimV2Json(material),"utf8"));
  if(expected!==value.preclaim_id)fail("apollyon_claim_contract_v2_preclaim_id_invalid");
}

function validateCustodyAssertion(value){
  exactKeys(value,[
    "attempt_claimed","authorization_custodied","authorization_id","custody_generation_id",
    "marker","ok","record_sha256","status","training_execution_performed","version",
  ],"apollyon_claim_contract_v2_custody_assertion_invalid");
  if(
    value.ok!==true||
    value.marker!=="VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1"||
    value.version!==1||value.status!=="authorization_custody_asserted"||
    !AUTH_ID.test(value.authorization_id)||!GENERATION_ID.test(value.custody_generation_id)||
    !HASH64.test(value.record_sha256)||value.authorization_custodied!==true||
    value.attempt_claimed!==false||value.training_execution_performed!==false
  )fail("apollyon_claim_contract_v2_custody_assertion_invalid");
}

function validateCustodyRecord(value){
  exactKeys(value,[
    "action","authorization_id","canonical_main","canonical_tree","corpus_sha256",
    "custody_generation_id","custody_policy","marker","operator_public_key_raw_sha256",
    "parent_adapter_sha256","request_sha256","target_host","version",
  ],"apollyon_claim_contract_v2_custody_record_invalid");
  exactKeys(value.custody_policy,[
    "attempt_claimed","automatic_retry_authorized","one_authorization_record_only",
    "training_execution_performed",
  ],"apollyon_claim_contract_v2_custody_record_invalid");
  if(
    value.marker!=="VOID_APOLLYON_AUTHORIZATION_CUSTODY_RECORD_V1"||
    value.version!==1||!AUTH_ID.test(value.authorization_id)||
    !GENERATION_ID.test(value.custody_generation_id)||
    !HASH64.test(value.operator_public_key_raw_sha256)||
    !HASH64.test(value.request_sha256)||!GIT40.test(value.canonical_main)||
    !GIT40.test(value.canonical_tree)||!HASH64.test(value.corpus_sha256)||
    !HASH64.test(value.parent_adapter_sha256)||value.target_host!=="Xiphos"||
    value.action!=="candidate_training_attempt_v1"||
    value.custody_policy.one_authorization_record_only!==true||
    value.custody_policy.automatic_retry_authorized!==false||
    value.custody_policy.attempt_claimed!==false||
    value.custody_policy.training_execution_performed!==false
  )fail("apollyon_claim_contract_v2_custody_record_invalid");
}

export function qualifyApollyonCandidateTrainingAttemptClaimContractV2(input){
  exactKeys(input,[
    "custody_assertion","custody_record","preclaim",
  ],"apollyon_claim_contract_v2_input_invalid");
  validatePreclaim(input.preclaim);
  validateCustodyAssertion(input.custody_assertion);
  validateCustodyRecord(input.custody_record);

  const recordSha=sha256(Buffer.from(
    canonicalApollyonClaimContractJsonV1(input.custody_record)+"\n","utf8",
  ));
  if(
    recordSha!==input.custody_assertion.record_sha256||
    input.custody_record.authorization_id!==input.custody_assertion.authorization_id||
    input.custody_record.custody_generation_id!==input.custody_assertion.custody_generation_id
  )fail("apollyon_claim_contract_v2_custody_cross_binding_invalid");

  const material={
    marker:VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V2,
    version:2,
    status:"current_v2_claim_contract_qualified_unclaimed",
    target_host:"Xiphos",
    preclaim_v2_blob_sha1:PRECLAIM_V2_BLOB_SHA1,
    v1_canonicalizer_blob_sha1:V1_CANONICALIZER_BLOB_SHA1,
    preclaim_id:input.preclaim.preclaim_id,
    current_v2_live_qualification_id:input.preclaim.current_v2_live_qualification_id,
    installed_isolation_qualification_id:input.preclaim.installed_isolation_qualification_id,
    training_pid:input.preclaim.training_pid,
    training_process_start_time_ticks:input.preclaim.training_process_start_time_ticks,
    boot_id_sha256:input.preclaim.boot_id_sha256,
    custody_generation_id:input.custody_assertion.custody_generation_id,
    custody_record_sha256:recordSha,
    authorization_id:input.custody_record.authorization_id,
    operator_public_key_raw_sha256:input.custody_record.operator_public_key_raw_sha256,
    request_sha256:input.custody_record.request_sha256,
    canonical_main:input.custody_record.canonical_main,
    canonical_tree:input.custody_record.canonical_tree,
    corpus_sha256:input.custody_record.corpus_sha256,
    parent_adapter_sha256:input.custody_record.parent_adapter_sha256,
    attempt_limit:1,
    current_v2_preclaim_bound:true,
    exact_custody_record_bound:true,
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
    operator_private_key_access_performed:false,
    production_signing_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    transaction_broadcast_performed:false,
    funds_movement_performed:false,
    next_gate:"live_custody_service_source_identity_binding_v2",
  };
  return Object.freeze({
    ...material,
    claim_contract_id:"apollyon_claim_contract_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
    authority:VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_AUTHORITY_V2,
  });
}
