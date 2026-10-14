#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V1 =
  "VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V1";

export const VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract:true,
    exact_live_qualification_required:true,
    exact_custody_assertion_required:true,
    exact_custody_record_required:true,
    exact_custody_record_hash_required:true,
    same_live_custody_session_binding_required:true,
    same_live_custody_session_binding_proven:false,
    durable_claim_executor_required:true,
    durable_claim_performed:false,
    attempt_claim_authorized_by_this_contract:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    generation_execution_performed:false,
    operator_private_key_access:false,
    production_signing:false,
    wallet_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    funds_movement:false,
    filesystem_read:false,
    filesystem_write:false,
    network_access:false,
    service_action:false,
  });

const V84_TOOL_BLOB_SHA1="3dae4db82a9316eaa88f475cec41ddc05a441536";
const V80_CUSTODY_CORE_BLOB_SHA1="f9f18db5bbfeea466202ef0d7babe08c3c401d66";
const V83_COLLECTOR_BLOB_SHA1="899864a8305c54c64bcc2bab6dc1f50b599b0706";
const V82_POLICY_BLOB_SHA1="6f34e79d94c502e31ca4923fd78922d4875550a5";
const HASH64=/^[0-9a-f]{64}$/u;
const GIT40=/^[0-9a-f]{40}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const GENERATION_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;
const LIVE_ID=/^apollyon_custody_live_v1:[0-9a-f]{64}$/u;
const POLICY_ID=/^apollyon_custody_policy_v1:[0-9a-f]{64}$/u;

function fail(code){ throw new Error(code); }
function sha256(value){ return crypto.createHash("sha256").update(value).digest("hex"); }
function exactKeys(value,keys,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  if(Object.keys(value).sort().join("\n")!==[...keys].sort().join("\n"))fail(code);
}
function canonicalize(value){
  if(value===null||typeof value==="string"||typeof value==="boolean")return value;
  if(typeof value==="number"){
    if(!Number.isSafeInteger(value))fail("apollyon_claim_contract_noncanonical_number");
    return value;
  }
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort())out[key]=canonicalize(value[key]);
    return out;
  }
  fail("apollyon_claim_contract_noncanonical_value");
}
export function canonicalApollyonClaimContractJsonV1(value){
  return JSON.stringify(canonicalize(value));
}
function requireFalse(value,keys,code){
  for(const key of keys)if(value[key]!==false)fail(code);
}
function requireTrue(value,keys,code){
  for(const key of keys)if(value[key]!==true)fail(code);
}
function validateLiveAuthority(value){
  const keys=[
    "attempt_claim","authorization_consumption","caller_supplied_evidence",
    "candidate_weight_mutation","designated_host_only","exact_collector_blob_required",
    "exact_policy_blob_required","funds_movement","generation_execution","host_mutation",
    "increasing_boottime_generation_required","network_access","operator_private_key_access",
    "persistent_receipt_write","production_signing","read_only","same_boot_required",
    "service_action","source_policy_qualification_required","stable_host_projection_required",
    "training_execution","transaction_broadcast","transaction_signing",
    "two_live_observations_required","wallet_access",
  ];
  exactKeys(value,keys,"apollyon_claim_contract_live_authority_invalid");
  requireTrue(value,[
    "read_only","designated_host_only","exact_collector_blob_required","exact_policy_blob_required",
    "two_live_observations_required","same_boot_required","increasing_boottime_generation_required",
    "stable_host_projection_required","source_policy_qualification_required",
  ],"apollyon_claim_contract_live_authority_invalid");
  requireFalse(value,[
    "caller_supplied_evidence","host_mutation","service_action","operator_private_key_access",
    "production_signing","authorization_consumption","attempt_claim","training_execution",
    "candidate_weight_mutation","generation_execution","wallet_access","transaction_signing",
    "transaction_broadcast","funds_movement","network_access","persistent_receipt_write",
  ],"apollyon_claim_contract_live_authority_invalid");
}
function validateLiveQualification(value){
  exactKeys(value,[
    "attempt_claim_authorized","attempt_claimed","authority","boot_id_sha256",
    "candidate_weight_mutation_performed","collector_blob_sha1","custody_production_gate_ready",
    "evidence_generation_monotonicity_proven","first_evidence_generation",
    "first_source_policy_qualification_id","funds_movement_performed",
    "generation_execution_performed","host_state_sha256","independent_custody_proven",
    "live_host_qualification_performed","live_qualification_id","marker","network_access_performed",
    "next_gate","observed_at_ms","operator_private_key_access_performed","persistent_receipt_write_performed",
    "policy_blob_sha1","production_signing_performed","second_evidence_generation",
    "second_source_policy_qualification_id","status","target_host","training_execution_authorized",
    "training_execution_performed","transaction_broadcast_performed","transaction_signing_performed",
    "verification_clock_authority_proven","verification_now_ms","version","wallet_access_performed",
  ],"apollyon_claim_contract_live_qualification_invalid");
  if(
    value.marker!=="VOID_APOLLYON_DESIGNATED_HOST_CUSTODY_LIVE_QUALIFICATION_V1"||
    value.version!==1||value.status!=="live_host_independent_custody_qualified"||
    value.target_host!=="Xiphos"||value.collector_blob_sha1!==V83_COLLECTOR_BLOB_SHA1||
    value.policy_blob_sha1!==V82_POLICY_BLOB_SHA1||!LIVE_ID.test(value.live_qualification_id)||
    !POLICY_ID.test(value.first_source_policy_qualification_id)||
    !POLICY_ID.test(value.second_source_policy_qualification_id)||
    !HASH64.test(value.boot_id_sha256)||!HASH64.test(value.host_state_sha256)||
    !Number.isSafeInteger(value.first_evidence_generation)||
    !Number.isSafeInteger(value.second_evidence_generation)||
    value.second_evidence_generation<=value.first_evidence_generation||
    !Number.isSafeInteger(value.observed_at_ms)||!Number.isSafeInteger(value.verification_now_ms)||
    value.verification_now_ms<value.observed_at_ms||
    value.next_gate!=="candidate_training_attempt_claim_contract_v1"
  )fail("apollyon_claim_contract_live_qualification_invalid");
  requireTrue(value,[
    "verification_clock_authority_proven","evidence_generation_monotonicity_proven",
    "live_host_qualification_performed","independent_custody_proven","custody_production_gate_ready",
  ],"apollyon_claim_contract_live_qualification_invalid");
  requireFalse(value,[
    "attempt_claim_authorized","attempt_claimed","training_execution_authorized",
    "training_execution_performed","candidate_weight_mutation_performed","generation_execution_performed",
    "operator_private_key_access_performed","production_signing_performed","wallet_access_performed",
    "transaction_signing_performed","transaction_broadcast_performed","funds_movement_performed",
    "network_access_performed","persistent_receipt_write_performed",
  ],"apollyon_claim_contract_live_qualification_invalid");
  validateLiveAuthority(value.authority);
}
function validateCustodyAssertion(value){
  exactKeys(value,[
    "attempt_claimed","authorization_custodied","authorization_id","custody_generation_id",
    "marker","ok","record_sha256","status","training_execution_performed","version",
  ],"apollyon_claim_contract_custody_assertion_invalid");
  if(
    value.ok!==true||value.marker!=="VOID_APOLLYON_AUTHORIZATION_CUSTODY_CORE_V1"||
    value.version!==1||value.status!=="authorization_custody_asserted"||
    !AUTH_ID.test(value.authorization_id)||!GENERATION_ID.test(value.custody_generation_id)||
    !HASH64.test(value.record_sha256)||value.authorization_custodied!==true||
    value.attempt_claimed!==false||value.training_execution_performed!==false
  )fail("apollyon_claim_contract_custody_assertion_invalid");
}
function validateCustodyRecord(value){
  exactKeys(value,[
    "action","authorization_id","canonical_main","canonical_tree","corpus_sha256",
    "custody_generation_id","custody_policy","marker","operator_public_key_raw_sha256",
    "parent_adapter_sha256","request_sha256","target_host","version",
  ],"apollyon_claim_contract_custody_record_invalid");
  exactKeys(value.custody_policy,[
    "attempt_claimed","automatic_retry_authorized","one_authorization_record_only",
    "training_execution_performed",
  ],"apollyon_claim_contract_custody_record_invalid");
  if(
    value.marker!=="VOID_APOLLYON_AUTHORIZATION_CUSTODY_RECORD_V1"||value.version!==1||
    !AUTH_ID.test(value.authorization_id)||!GENERATION_ID.test(value.custody_generation_id)||
    !HASH64.test(value.operator_public_key_raw_sha256)||!HASH64.test(value.request_sha256)||
    !GIT40.test(value.canonical_main)||!GIT40.test(value.canonical_tree)||
    !HASH64.test(value.corpus_sha256)||!HASH64.test(value.parent_adapter_sha256)||
    value.target_host!=="Xiphos"||value.action!=="candidate_training_attempt_v1"||
    value.custody_policy.one_authorization_record_only!==true||
    value.custody_policy.automatic_retry_authorized!==false||
    value.custody_policy.attempt_claimed!==false||
    value.custody_policy.training_execution_performed!==false
  )fail("apollyon_claim_contract_custody_record_invalid");
}
export function qualifyApollyonCandidateTrainingAttemptClaimContractV1(input){
  exactKeys(input,["custody_assertion","custody_record","live_qualification"],"apollyon_claim_contract_input_invalid");
  validateLiveQualification(input.live_qualification);
  validateCustodyAssertion(input.custody_assertion);
  validateCustodyRecord(input.custody_record);
  const recordSha=sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(input.custody_record)+"\n","utf8"));
  if(
    recordSha!==input.custody_assertion.record_sha256||
    input.custody_record.authorization_id!==input.custody_assertion.authorization_id||
    input.custody_record.custody_generation_id!==input.custody_assertion.custody_generation_id
  )fail("apollyon_claim_contract_custody_cross_binding_invalid");
  const material={
    marker:VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V1,
    version:1,
    status:"claim_contract_qualified_unclaimed",
    target_host:"Xiphos",
    v84_tool_blob_sha1:V84_TOOL_BLOB_SHA1,
    v80_custody_core_blob_sha1:V80_CUSTODY_CORE_BLOB_SHA1,
    live_qualification_id:input.live_qualification.live_qualification_id,
    live_host_state_sha256:input.live_qualification.host_state_sha256,
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
    independent_custody_qualification_required:true,
    exact_custody_record_required:true,
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
    network_access_performed:false,
    next_gate:"durable_candidate_training_attempt_claim_executor_v1",
  };
  return Object.freeze({
    ...material,
    claim_contract_id:"apollyon_claim_contract_v1:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
    authority:VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_AUTHORITY_V1,
  });
}
