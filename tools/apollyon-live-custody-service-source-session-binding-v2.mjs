#!/usr/bin/env node
import crypto from "node:crypto";
import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";

export const VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_V2 =
  "VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_V2";

export const VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_AUTHORITY_V2 =
  Object.freeze({
    source_only_finalizer:true,
    current_v2_claim_contract_required:true,
    current_stack_custody_launcher_required:true,
    stable_state_root_identity_required:true,
    stable_consumed_directory_identity_required:true,
    stable_socket_identity_required:true,
    stable_custody_service_process_identity_required:true,
    loader_environment_clean_required:true,
    exact_authorization_identity_rebinding_required:true,
    live_service_source_identity_proven_by_input:false,
    same_live_custody_session_binding_proven_by_input:false,
    durable_attempt_claim_required:true,
    durable_attempt_claim_performed:false,
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

const CLAIM_V2_BLOB_SHA1="fd671b3303946143d927473e4ed04e7cd5030bac";
const CUSTODY_LAUNCHER_V2_BLOB_SHA1="d23ff045d8c355401fed499c6bcffd503ba4c7fd";
const HASH64=/^[0-9a-f]{64}$/u;
const GIT40=/^[0-9a-f]{40}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const GENERATION_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;
const PRECLAIM_ID=/^apollyon_preclaim_v2:[0-9a-f]{64}$/u;
const CLAIM_ID=/^apollyon_claim_contract_v2:[0-9a-f]{64}$/u;
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

function validateClaimContract(value){
  exactKeys(value,[
    "attempt_claim_authorized","attempt_claimed","attempt_limit","authority",
    "authorization_id","boot_id_sha256","candidate_weight_mutation_performed",
    "canonical_main","canonical_tree","claim_contract_id","corpus_sha256",
    "current_v2_live_qualification_id","current_v2_preclaim_bound",
    "custody_generation_id","custody_record_sha256","durable_attempt_claim_performed",
    "durable_attempt_claim_required","exact_custody_record_bound",
    "funds_movement_performed","generation_execution_performed",
    "historical_v84_v1_sufficient","installed_isolation_qualification_id",
    "live_service_source_identity_proven","live_service_source_identity_required",
    "marker","next_gate","operator_private_key_access_performed",
    "operator_public_key_raw_sha256","parent_adapter_sha256","preclaim_id",
    "preclaim_v2_blob_sha1","production_signing_performed","request_sha256",
    "same_live_custody_session_binding_proven","same_live_custody_session_binding_required",
    "status","target_host","training_execution_authorized",
    "training_execution_performed","training_pid","training_process_start_time_ticks",
    "transaction_broadcast_performed","transaction_signing_performed",
    "v1_canonicalizer_blob_sha1","version","wallet_access_performed",
  ],"apollyon_live_binding_v2_claim_contract_invalid");
  if(
    value.marker!=="VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V2"||
    value.version!==2||
    value.status!=="current_v2_claim_contract_qualified_unclaimed"||
    value.target_host!=="Xiphos"||
    value.preclaim_v2_blob_sha1!=="d062fe9d8f70f731e157c8d9f835d3f936ac5d59"||
    value.v1_canonicalizer_blob_sha1!=="f97fafb0148527ae3a954e2752faef8c7fc9e88e"||
    !PRECLAIM_ID.test(value.preclaim_id)||
    !CLAIM_ID.test(value.claim_contract_id)||
    !LIVE_V2_ID.test(value.current_v2_live_qualification_id)||
    !ISOLATION_ID.test(value.installed_isolation_qualification_id)||
    !AUTH_ID.test(value.authorization_id)||!GENERATION_ID.test(value.custody_generation_id)||
    !HASH64.test(value.custody_record_sha256)||
    !HASH64.test(value.operator_public_key_raw_sha256)||
    !HASH64.test(value.request_sha256)||!GIT40.test(value.canonical_main)||
    !GIT40.test(value.canonical_tree)||!HASH64.test(value.corpus_sha256)||
    !HASH64.test(value.parent_adapter_sha256)||!HASH64.test(value.boot_id_sha256)||
    !Number.isSafeInteger(value.training_pid)||value.training_pid<=0||
    typeof value.training_process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(value.training_process_start_time_ticks)||
    value.attempt_limit!==1||
    value.next_gate!=="live_custody_service_source_identity_binding_v2"
  )fail("apollyon_live_binding_v2_claim_contract_invalid");
  requireTrue(value,[
    "current_v2_preclaim_bound","exact_custody_record_bound",
    "live_service_source_identity_required","same_live_custody_session_binding_required",
    "durable_attempt_claim_required",
  ],"apollyon_live_binding_v2_claim_contract_invalid");
  requireFalse(value,[
    "historical_v84_v1_sufficient","live_service_source_identity_proven",
    "same_live_custody_session_binding_proven","durable_attempt_claim_performed",
    "attempt_claim_authorized","attempt_claimed","training_execution_authorized",
    "training_execution_performed","candidate_weight_mutation_performed",
    "generation_execution_performed","operator_private_key_access_performed",
    "production_signing_performed","wallet_access_performed",
    "transaction_signing_performed","transaction_broadcast_performed",
    "funds_movement_performed",
  ],"apollyon_live_binding_v2_claim_contract_invalid");

  const material=structuredClone(value);
  delete material.claim_contract_id;
  delete material.authority;
  const expected="apollyon_claim_contract_v2:"+
    sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8"));
  if(expected!==value.claim_contract_id){
    fail("apollyon_live_binding_v2_claim_contract_id_invalid");
  }
}

function validateSessionEvidence(value,claim){
  exactKeys(value,[
    "authorization_id","consumed_directory_identity_sha256","custody_generation_id",
    "custody_launcher_blob_sha1","custody_record_sha256","loader_environment_clean",
    "operator_public_key_raw_sha256","service_process_identity_sha256",
    "service_process_identity_stable","socket_identity_sha256","socket_identity_stable",
    "state_root_identity_sha256","state_root_identity_stable",
    "consumed_directory_identity_stable",
  ],"apollyon_live_binding_v2_session_evidence_invalid");
  for(const key of [
    "state_root_identity_sha256","consumed_directory_identity_sha256",
    "socket_identity_sha256","service_process_identity_sha256",
  ]){
    if(!HASH64.test(value[key]))fail("apollyon_live_binding_v2_session_evidence_invalid");
  }
  if(
    value.custody_launcher_blob_sha1!==CUSTODY_LAUNCHER_V2_BLOB_SHA1||
    value.authorization_id!==claim.authorization_id||
    value.custody_generation_id!==claim.custody_generation_id||
    value.custody_record_sha256!==claim.custody_record_sha256||
    value.operator_public_key_raw_sha256!==claim.operator_public_key_raw_sha256||
    value.loader_environment_clean!==true||
    value.service_process_identity_stable!==true||
    value.socket_identity_stable!==true||
    value.state_root_identity_stable!==true||
    value.consumed_directory_identity_stable!==true
  )fail("apollyon_live_binding_v2_session_evidence_invalid");
}

export function finalizeApollyonLiveCustodyServiceSourceSessionBindingV2(input){
  exactKeys(input,[
    "claim_contract","session_evidence",
  ],"apollyon_live_binding_v2_input_invalid");
  validateClaimContract(input.claim_contract);
  validateSessionEvidence(input.session_evidence,input.claim_contract);

  const material={
    marker:VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_V2,
    version:2,
    status:"current_v2_live_custody_source_session_bound_unclaimed",
    target_host:"Xiphos",
    claim_contract_v2_blob_sha1:CLAIM_V2_BLOB_SHA1,
    custody_launcher_v2_blob_sha1:CUSTODY_LAUNCHER_V2_BLOB_SHA1,
    claim_contract_id:input.claim_contract.claim_contract_id,
    preclaim_id:input.claim_contract.preclaim_id,
    current_v2_live_qualification_id:input.claim_contract.current_v2_live_qualification_id,
    installed_isolation_qualification_id:
      input.claim_contract.installed_isolation_qualification_id,
    training_pid:input.claim_contract.training_pid,
    training_process_start_time_ticks:
      input.claim_contract.training_process_start_time_ticks,
    boot_id_sha256:input.claim_contract.boot_id_sha256,
    authorization_id:input.claim_contract.authorization_id,
    custody_generation_id:input.claim_contract.custody_generation_id,
    custody_record_sha256:input.claim_contract.custody_record_sha256,
    request_sha256:input.claim_contract.request_sha256,
    canonical_main:input.claim_contract.canonical_main,
    canonical_tree:input.claim_contract.canonical_tree,
    corpus_sha256:input.claim_contract.corpus_sha256,
    parent_adapter_sha256:input.claim_contract.parent_adapter_sha256,
    operator_public_key_raw_sha256:
      input.claim_contract.operator_public_key_raw_sha256,
    state_root_identity_sha256:
      input.session_evidence.state_root_identity_sha256,
    consumed_directory_identity_sha256:
      input.session_evidence.consumed_directory_identity_sha256,
    socket_identity_sha256:input.session_evidence.socket_identity_sha256,
    service_process_identity_sha256:
      input.session_evidence.service_process_identity_sha256,
    live_service_source_identity_required:true,
    live_service_source_identity_proven:true,
    loader_environment_clean:true,
    same_live_custody_session_binding_required:true,
    same_live_custody_session_binding_proven:true,
    live_socket_identity_stable:true,
    service_process_identity_stable:true,
    state_root_identity_stable:true,
    consumed_directory_identity_stable:true,
    durable_attempt_claim_required:true,
    durable_attempt_claim_performed:false,
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
    next_gate:"durable_candidate_training_attempt_claim_executor_v2",
  };
  return Object.freeze({
    ...material,
    live_binding_id:"apollyon_live_binding_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
    authority:
      VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_AUTHORITY_V2,
  });
}
