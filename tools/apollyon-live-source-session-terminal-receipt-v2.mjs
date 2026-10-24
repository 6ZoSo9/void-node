#!/usr/bin/env node
import crypto from "node:crypto";
import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_AUTHORITY_V2,
} from "./apollyon-live-custody-service-source-session-binding-v2.mjs";

export const VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_V2 =
  "VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_V2";

export const VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2 =
  Object.freeze({
    source_only_finalizer:true,
    exact_terminal_runner_receipt_required:true,
    protected_runner_origin_required:true,
    protected_runner_origin_proven:false,
    live_host_observation_performed:false,
    terminal_shutdown_authority_proven:false,
    inner_live_binding_alone_sufficient_for_executor:false,
    same_training_process_generation_cross_binding_required:true,
    exact_training_service_dormancy_required:true,
    training_generation_absence_required:true,
    current_host_revalidation_required:true,
    revalidation_identity_hashes_carried:true,
    terminal_runner_receipt_digest_carried:true,
    durable_claim_executor_required:true,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
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

const RUNNER_V2_BLOB_SHA1="8c2c92055ab05c074653cee971e095934b5cb85c";
const BINDING_V2_BLOB_SHA1="5ee36c89275c29b008094ad030b8664ed9d7b60b";
const HASH64=/^[0-9a-f]{64}$/u;
const GIT40=/^[0-9a-f]{40}$/u;
const CLAIM_ID=/^apollyon_claim_contract_v2:[0-9a-f]{64}$/u;
const PRECLAIM_ID=/^apollyon_preclaim_v2:[0-9a-f]{64}$/u;
const LIVE_BINDING_ID=/^apollyon_live_binding_v2:[0-9a-f]{64}$/u;
const LIVE_V2_ID=/^apollyon_custody_live_v2:[0-9a-f]{64}$/u;
const ISOLATION_ID=/^apollyon_training_isolation_live_v1:[0-9a-f]{64}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const GENERATION_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;

function fail(code){throw new Error(code);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function exactKeys(value,expected,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if(actual.length!==wanted.length||actual.some((key,index)=>key!==wanted[index])){
    fail(code);
  }
}
function requireFalse(value,keys,code){
  for(const key of keys)if(value[key]!==false)fail(code);
}
function requireTrue(value,keys,code){
  for(const key of keys)if(value[key]!==true)fail(code);
}
function canonical(value){return canonicalApollyonClaimContractJsonV1(value);}

function validateBinding(value){
  exactKeys(value,[
    "attempt_claimed","authority","authorization_id","boot_id_sha256",
    "candidate_weight_mutation_performed","canonical_main","canonical_tree",
    "claim_contract_id","claim_contract_v2_blob_sha1","consumed_directory_identity_sha256",
    "consumed_directory_identity_stable","corpus_sha256","current_v2_live_qualification_id",
    "custody_generation_id","custody_launcher_v2_blob_sha1","custody_record_sha256",
    "durable_attempt_claim_performed","durable_attempt_claim_required",
    "funds_movement_performed","generation_execution_performed",
    "installed_isolation_qualification_id","live_binding_id","live_service_source_identity_proven",
    "live_service_source_identity_required","live_socket_identity_stable",
    "loader_environment_clean","marker","next_gate","operator_private_key_access_performed",
    "operator_public_key_raw_sha256","parent_adapter_sha256","preclaim_id",
    "production_signing_performed","request_sha256","same_live_custody_session_binding_proven",
    "same_live_custody_session_binding_required","service_process_identity_sha256",
    "service_process_identity_stable","socket_identity_sha256","state_root_identity_sha256",
    "state_root_identity_stable","status","target_host","training_execution_authorized",
    "training_execution_performed","training_pid","training_process_start_time_ticks",
    "transaction_broadcast_performed","transaction_signing_performed","version",
    "wallet_access_performed",
  ],"apollyon_terminal_receipt_v2_binding_invalid");
  if(
    value.marker!=="VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_V2"||
    value.version!==2||
    value.status!=="current_v2_live_custody_source_session_bound_unclaimed"||
    value.target_host!=="Xiphos"||
    value.claim_contract_v2_blob_sha1!=="fd671b3303946143d927473e4ed04e7cd5030bac"||
    value.custody_launcher_v2_blob_sha1!=="d23ff045d8c355401fed499c6bcffd503ba4c7fd"||
    !LIVE_BINDING_ID.test(value.live_binding_id)||
    !CLAIM_ID.test(value.claim_contract_id)||
    !PRECLAIM_ID.test(value.preclaim_id)||
    !LIVE_V2_ID.test(value.current_v2_live_qualification_id)||
    !ISOLATION_ID.test(value.installed_isolation_qualification_id)||
    !AUTH_ID.test(value.authorization_id)||
    !GENERATION_ID.test(value.custody_generation_id)||
    !Number.isSafeInteger(value.training_pid)||value.training_pid<=0||
    typeof value.training_process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(value.training_process_start_time_ticks)||
    !HASH64.test(value.boot_id_sha256)||
    !HASH64.test(value.custody_record_sha256)||
    !HASH64.test(value.request_sha256)||
    !GIT40.test(value.canonical_main)||!GIT40.test(value.canonical_tree)||
    !HASH64.test(value.corpus_sha256)||!HASH64.test(value.parent_adapter_sha256)||
    !HASH64.test(value.operator_public_key_raw_sha256)||
    !HASH64.test(value.state_root_identity_sha256)||
    !HASH64.test(value.consumed_directory_identity_sha256)||
    !HASH64.test(value.socket_identity_sha256)||
    !HASH64.test(value.service_process_identity_sha256)||
    value.next_gate!=="durable_candidate_training_attempt_claim_executor_v2"
  )fail("apollyon_terminal_receipt_v2_binding_invalid");
  requireTrue(value,[
    "live_service_source_identity_required","live_service_source_identity_proven",
    "loader_environment_clean","same_live_custody_session_binding_required",
    "same_live_custody_session_binding_proven","live_socket_identity_stable",
    "service_process_identity_stable","state_root_identity_stable",
    "consumed_directory_identity_stable","durable_attempt_claim_required",
  ],"apollyon_terminal_receipt_v2_binding_invalid");
  requireFalse(value,[
    "durable_attempt_claim_performed","attempt_claimed","training_execution_authorized",
    "training_execution_performed","candidate_weight_mutation_performed",
    "generation_execution_performed","operator_private_key_access_performed",
    "production_signing_performed","wallet_access_performed",
    "transaction_signing_performed","transaction_broadcast_performed",
    "funds_movement_performed",
  ],"apollyon_terminal_receipt_v2_binding_invalid");
  exactKeys(
    value.authority,
    Object.keys(VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_AUTHORITY_V2),
    "apollyon_terminal_receipt_v2_binding_authority_invalid",
  );
  if(canonical(value.authority)!==
     canonical(VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_AUTHORITY_V2)){
    fail("apollyon_terminal_receipt_v2_binding_authority_invalid");
  }
  const material=structuredClone(value);
  delete material.live_binding_id;
  delete material.authority;
  const expected="apollyon_live_binding_v2:"+
    sha256(Buffer.from(canonical(material),"utf8"));
  if(expected!==value.live_binding_id){
    fail("apollyon_terminal_receipt_v2_binding_id_invalid");
  }
  return Object.freeze(structuredClone(value));
}

function validateRunnerReceipt(value){
  exactKeys(value,[
    "binding","candidate_weight_mutation_performed","custody_service_action_performed",
    "durable_attempt_claim_performed","funds_movement_performed","marker","status",
    "training_execution_performed","training_generation_absent_after",
    "training_pid","training_process_start_time_ticks","training_service_active_after",
    "training_service_enabled","training_service_exact_dormant_after","version",
  ],"apollyon_terminal_receipt_v2_runner_receipt_invalid");
  const binding=validateBinding(value.binding);
  if(
    value.marker!=="VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_RUNNER_V2"||
    value.version!==2||
    value.status!=="live_source_session_binding_complete_training_service_stopped"||
    value.training_pid!==binding.training_pid||
    typeof value.training_process_start_time_ticks!=="string"||
    value.training_process_start_time_ticks!==
      binding.training_process_start_time_ticks||
    value.training_service_enabled!==false||
    value.training_service_active_after!==false||
    value.training_service_exact_dormant_after!==true||
    value.training_generation_absent_after!==true||
    value.durable_attempt_claim_performed!==false||
    value.training_execution_performed!==false||
    value.candidate_weight_mutation_performed!==false||
    value.custody_service_action_performed!==false||
    value.funds_movement_performed!==false
  )fail("apollyon_terminal_receipt_v2_runner_receipt_invalid");
  return {receipt:Object.freeze(structuredClone(value)),binding};
}

export function finalizeApollyonLiveSourceSessionTerminalReceiptV2(input){
  let snapshot;
  try{
    snapshot=structuredClone(input);
  }catch{
    fail("apollyon_terminal_receipt_v2_input_invalid");
  }
  exactKeys(snapshot,["runner_receipt"],"apollyon_terminal_receipt_v2_input_invalid");
  const {receipt,binding}=validateRunnerReceipt(snapshot.runner_receipt);
  const material={
    marker:VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_V2,
    version:2,
    status:"live_source_session_terminal_shutdown_qualified_unclaimed",
    target_host:"Xiphos",
    runner_v2_blob_sha1:RUNNER_V2_BLOB_SHA1,
    binding_v2_blob_sha1:BINDING_V2_BLOB_SHA1,
    live_binding_id:binding.live_binding_id,
    claim_contract_id:binding.claim_contract_id,
    preclaim_id:binding.preclaim_id,
    current_v2_live_qualification_id:binding.current_v2_live_qualification_id,
    installed_isolation_qualification_id:binding.installed_isolation_qualification_id,
    authorization_id:binding.authorization_id,
    custody_generation_id:binding.custody_generation_id,
    custody_record_sha256:binding.custody_record_sha256,
    request_sha256:binding.request_sha256,
    canonical_main:binding.canonical_main,
    canonical_tree:binding.canonical_tree,
    corpus_sha256:binding.corpus_sha256,
    parent_adapter_sha256:binding.parent_adapter_sha256,
    operator_public_key_raw_sha256:binding.operator_public_key_raw_sha256,
    state_root_identity_sha256:binding.state_root_identity_sha256,
    consumed_directory_identity_sha256:binding.consumed_directory_identity_sha256,
    socket_identity_sha256:binding.socket_identity_sha256,
    service_process_identity_sha256:binding.service_process_identity_sha256,
    loader_environment_clean:true,
    live_service_source_identity_proven:true,
    same_live_custody_session_binding_proven:true,
    terminal_runner_receipt_sha256:
      sha256(Buffer.from(canonical(receipt),"utf8")),
    training_pid:binding.training_pid,
    training_process_start_time_ticks:binding.training_process_start_time_ticks,
    boot_id_sha256:binding.boot_id_sha256,
    terminal_shutdown_evidence_shape_qualified:true,
    terminal_shutdown_authority_proven:false,
    training_service_exact_dormant_after:true,
    training_generation_absent_after:true,
    inner_live_binding_alone_sufficient_for_executor:false,
    current_host_revalidation_required:true,
    revalidation_identity_hashes_carried:true,
    terminal_runner_receipt_digest_carried:true,
    protected_runner_origin_required:true,
    protected_runner_origin_proven:false,
    live_host_observation_performed:false,
    durable_attempt_claim_required:true,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    next_gate:"durable_candidate_training_attempt_claim_executor_v2",
  };
  return Object.freeze({
    ...material,
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+
      sha256(Buffer.from(canonical(material),"utf8")),
    authority:VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2,
  });
}
