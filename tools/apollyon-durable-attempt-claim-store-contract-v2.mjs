#!/usr/bin/env node
import crypto from "node:crypto";
import {
  canonicalApollyonClaimContractJsonV1,
} from "./apollyon-candidate-training-attempt-claim-contract-v1.mjs";
import {
  VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2,
} from "./apollyon-live-source-session-terminal-receipt-v2.mjs";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_V2 =
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_V2";

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2 =
  Object.freeze({
    dedicated_claim_service_identity_required:true,
    claim_identity_distinct_from_training_required:true,
    claim_identity_distinct_from_custody_required:true,
    claim_identity_distinct_from_public_runtime_required:true,
    claim_identity_distinct_from_interactive_operator_required:true,
    claim_identity_supplementary_groups_closed_required:true,
    claim_uid_only_reviewed_service_required:true,
    claim_service_source_identity_required:true,
    non_claim_unprivileged_uid_write_denied_required:true,
    claim_service_training_state_write_denied_required:true,
    claim_service_custody_state_write_denied_required:true,
    claim_service_training_service_control_denied_required:true,
    claim_service_custody_service_control_denied_required:true,
    claim_service_delete_or_overwrite_api_forbidden:true,
    future_identity_must_be_versioned_and_fixed_before_install:true,
    future_claim_root_must_be_versioned_and_fixed_before_install:true,
    claim_store_generation_identity_required:true,
    claim_store_generation_create_once_required:true,
    same_path_replacement_must_be_new_generation_required:true,
    authorization_binding_to_claim_store_generation_required:true,
    old_terminal_receipt_reuse_across_store_generation_forbidden:true,
    new_store_generation_requires_fresh_authorization_required:true,
    cross_generation_authorization_replay_rejected_required:true,
    store_generation_change_blocks_claim_publication_until_requalified_required:true,
    prior_claim_history_continuity_required_for_store_migration:true,
    claim_store_generation_replacement_without_retained_history_is_permanent_hold_required:true,
    fresh_sovereign_rebootstrap_required_for_new_store_generation:true,
    protected_root_mode:"0700",
    immutable_claim_record_mode:"0600",
    final_claim_record_link_count:1,
    root_ancestor_custody_required:true,
    training_uid_write_denied_required:true,
    custody_uid_write_denied_required:true,
    training_uid_service_control_denied_required:true,
    custody_uid_service_control_denied_required:true,
    claim_service_af_unix_only_required:true,
    claim_service_network_access_forbidden:true,
    claim_service_private_key_access_forbidden:true,
    claim_service_signing_forbidden:true,
    exact_terminal_receipt_revalidation_required:true,
    protected_runner_origin_proof_required:true,
    current_host_revalidation_required:true,
    complete_claim_boundary_revalidation_immediately_before_publication_required:true,
    claim_uid_process_exclusivity_revalidation_immediately_before_publication_required:true,
    claim_service_source_identity_revalidation_immediately_before_publication_required:true,
    claim_service_supplementary_groups_revalidation_immediately_before_publication_required:true,
    claim_service_effective_policy_revalidation_immediately_before_publication_required:true,
    claim_store_generation_revalidation_immediately_before_publication_required:true,
    claim_store_root_identity_revalidation_immediately_before_publication_required:true,
    claim_write_authority_revalidation_immediately_before_publication_required:true,
    claim_service_control_denials_revalidation_immediately_before_publication_required:true,
    training_service_exact_dormancy_revalidation_required:true,
    training_generation_absence_revalidation_required:true,
    custody_state_root_identity_revalidation_required:true,
    custody_consumed_directory_identity_revalidation_required:true,
    custody_socket_identity_revalidation_required:true,
    custody_service_process_identity_revalidation_required:true,
    exact_v2_custody_record_revalidation_required:true,
    exact_v2_custody_generation_revalidation_required:true,
    create_only_no_overwrite_claim_publication_required:true,
    canonical_claim_record_required:true,
    claim_record_bind_store_generation_id_required:true,
    claim_record_bind_terminal_receipt_id_required:true,
    claim_record_bind_terminal_runner_receipt_sha256_required:true,
    claim_record_bind_authorization_id_required:true,
    claim_record_bind_custody_generation_id_required:true,
    claim_record_bind_custody_record_sha256_required:true,
    claim_record_bind_request_sha256_required:true,
    claim_record_bind_canonical_main_required:true,
    claim_record_bind_canonical_tree_required:true,
    claim_record_bind_corpus_sha256_required:true,
    claim_record_bind_parent_adapter_sha256_required:true,
    claim_record_bind_operator_public_key_raw_sha256_required:true,
    claim_record_bind_attempt_limit_required:true,
    claim_file_fsync_before_publication_required:true,
    claim_directory_fsync_after_publication_required:true,
    crash_recovery_exact_state_classification_required:true,
    duplicate_claim_rejected_required:true,
    claim_must_be_durable_before_training_start:true,
    attempt_limit:1,
    automatic_retry_authorized:false,
    broker_execution_ledger_reuse_allowed:false,
    historical_v1_consumption_store_sufficient:false,
  });

export const VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_AUTHORITY_V2 =
  Object.freeze({
    source_only_store_contract:true,
    requirements_defined:true,
    terminal_receipt_shape_validation_only:true,
    terminal_receipt_source_origin_proven:false,
    claim_identity_bound:false,
    claim_root_bound:false,
    host_installation_performed:false,
    protected_claim_store_proven:false,
    protected_runner_origin_proven:false,
    current_host_revalidation_performed:false,
    custody_record_revalidation_performed:false,
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
    repository_merge:false,
  });

const TERMINAL_RECEIPT_V2_BLOB_SHA1="e27f0ebb968f4611bfc069670325c3f5e6df1c65";
const CANONICALIZER_V1_BLOB_SHA1="f97fafb0148527ae3a954e2752faef8c7fc9e88e";
const HASH64=/^[0-9a-f]{64}$/u;
const GIT40=/^[0-9a-f]{40}$/u;
const TERMINAL_ID=/^apollyon_terminal_receipt_v2:[0-9a-f]{64}$/u;
const LIVE_BINDING_ID=/^apollyon_live_binding_v2:[0-9a-f]{64}$/u;
const CLAIM_ID=/^apollyon_claim_contract_v2:[0-9a-f]{64}$/u;
const PRECLAIM_ID=/^apollyon_preclaim_v2:[0-9a-f]{64}$/u;
const LIVE_V2_ID=/^apollyon_custody_live_v2:[0-9a-f]{64}$/u;
const ISOLATION_ID=/^apollyon_training_isolation_live_v1:[0-9a-f]{64}$/u;
const AUTH_ID=/^apollyon_authz_v1:[0-9a-f]{64}$/u;
const GENERATION_ID=/^apollyon_custody_generation_v1:[0-9a-f]{64}$/u;

function fail(code){throw new Error(code);}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function canonical(value){return canonicalApollyonClaimContractJsonV1(value);}
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

const TERMINAL_KEYS=[
  "attempt_claim_authorized","attempt_claimed","authority","authorization_id",
  "binding_v2_blob_sha1","boot_id_sha256","candidate_weight_mutation_performed",
  "canonical_main","canonical_tree","claim_contract_id","consumed_directory_identity_sha256",
  "corpus_sha256","current_host_revalidation_required","current_v2_live_qualification_id",
  "custody_generation_id","custody_record_sha256","durable_attempt_claim_performed",
  "durable_attempt_claim_required","inner_live_binding_alone_sufficient_for_executor",
  "installed_isolation_qualification_id","live_binding_id","live_host_observation_performed",
  "live_service_source_identity_proven","loader_environment_clean","marker","next_gate",
  "operator_public_key_raw_sha256","parent_adapter_sha256","preclaim_id",
  "protected_runner_origin_proven","protected_runner_origin_required",
  "request_sha256","revalidation_identity_hashes_carried","runner_v2_blob_sha1",
  "same_live_custody_session_binding_proven","service_process_identity_sha256",
  "socket_identity_sha256","state_root_identity_sha256","status",
  "target_host","terminal_receipt_id","terminal_runner_receipt_digest_carried",
  "terminal_runner_receipt_sha256","terminal_shutdown_authority_proven",
  "terminal_shutdown_evidence_shape_qualified","training_execution_authorized",
  "training_execution_performed","training_generation_absent_after","training_pid",
  "training_process_start_time_ticks","training_service_exact_dormant_after","version",
];

function validateTerminalReceipt(value){
  exactKeys(value,TERMINAL_KEYS,"apollyon_claim_store_contract_v2_terminal_invalid");
  if(
    value.marker!=="VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_V2"||
    value.version!==2||
    value.status!=="live_source_session_terminal_shutdown_qualified_unclaimed"||
    value.target_host!=="Xiphos"||
    value.runner_v2_blob_sha1!=="8c2c92055ab05c074653cee971e095934b5cb85c"||
    value.binding_v2_blob_sha1!=="981935515e08634be96446e58922c16be56d33ad"||
    !TERMINAL_ID.test(value.terminal_receipt_id)||
    !LIVE_BINDING_ID.test(value.live_binding_id)||
    !CLAIM_ID.test(value.claim_contract_id)||
    !PRECLAIM_ID.test(value.preclaim_id)||
    !LIVE_V2_ID.test(value.current_v2_live_qualification_id)||
    !ISOLATION_ID.test(value.installed_isolation_qualification_id)||
    !AUTH_ID.test(value.authorization_id)||
    !GENERATION_ID.test(value.custody_generation_id)||
    !HASH64.test(value.custody_record_sha256)||
    !HASH64.test(value.request_sha256)||
    !GIT40.test(value.canonical_main)||!GIT40.test(value.canonical_tree)||
    !HASH64.test(value.corpus_sha256)||!HASH64.test(value.parent_adapter_sha256)||
    !HASH64.test(value.operator_public_key_raw_sha256)||
    !HASH64.test(value.state_root_identity_sha256)||
    !HASH64.test(value.consumed_directory_identity_sha256)||
    !HASH64.test(value.socket_identity_sha256)||
    !HASH64.test(value.service_process_identity_sha256)||
    !HASH64.test(value.terminal_runner_receipt_sha256)||
    !HASH64.test(value.boot_id_sha256)||
    !Number.isSafeInteger(value.training_pid)||value.training_pid<=0||
    typeof value.training_process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(value.training_process_start_time_ticks)||
    value.next_gate!=="durable_candidate_training_attempt_claim_executor_v2"
  )fail("apollyon_claim_store_contract_v2_terminal_invalid");

  requireTrue(value,[
    "loader_environment_clean","live_service_source_identity_proven",
    "same_live_custody_session_binding_proven",
    "terminal_shutdown_evidence_shape_qualified",
    "training_service_exact_dormant_after","training_generation_absent_after",
    "current_host_revalidation_required","revalidation_identity_hashes_carried",
    "terminal_runner_receipt_digest_carried","protected_runner_origin_required",
    "durable_attempt_claim_required",
  ],"apollyon_claim_store_contract_v2_terminal_invalid");
  requireFalse(value,[
    "terminal_shutdown_authority_proven",
    "inner_live_binding_alone_sufficient_for_executor",
    "protected_runner_origin_proven","live_host_observation_performed",
    "durable_attempt_claim_performed","attempt_claim_authorized","attempt_claimed",
    "training_execution_authorized","training_execution_performed",
    "candidate_weight_mutation_performed",
  ],"apollyon_claim_store_contract_v2_terminal_invalid");
  exactKeys(
    value.authority,
    Object.keys(VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2),
    "apollyon_claim_store_contract_v2_terminal_authority_invalid",
  );
  if(canonical(value.authority)!==
     canonical(VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2)){
    fail("apollyon_claim_store_contract_v2_terminal_authority_invalid");
  }

  const material=structuredClone(value);
  delete material.terminal_receipt_id;
  delete material.authority;
  const expected="apollyon_terminal_receipt_v2:"+
    sha256(Buffer.from(canonical(material),"utf8"));
  if(expected!==value.terminal_receipt_id){
    fail("apollyon_claim_store_contract_v2_terminal_id_invalid");
  }
  return Object.freeze(structuredClone(value));
}

export function qualifyApollyonDurableAttemptClaimStoreContractV2(input){
  let snapshot;
  try{
    snapshot=structuredClone(input);
  }catch{
    fail("apollyon_claim_store_contract_v2_input_invalid");
  }
  exactKeys(snapshot,["terminal_receipt"],"apollyon_claim_store_contract_v2_input_invalid");
  const terminal=validateTerminalReceipt(snapshot.terminal_receipt);

  const material={
    marker:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_V2,
    version:2,
    status:"protected_attempt_claim_store_requirements_defined_uninstalled",
    target_host:"Xiphos",
    terminal_receipt_v2_blob_sha1:TERMINAL_RECEIPT_V2_BLOB_SHA1,
    canonicalizer_v1_blob_sha1:CANONICALIZER_V1_BLOB_SHA1,
    terminal_receipt_id:terminal.terminal_receipt_id,
    terminal_runner_receipt_sha256:terminal.terminal_runner_receipt_sha256,
    live_binding_id:terminal.live_binding_id,
    claim_contract_id:terminal.claim_contract_id,
    authorization_id:terminal.authorization_id,
    custody_generation_id:terminal.custody_generation_id,
    custody_record_sha256:terminal.custody_record_sha256,
    request_sha256:terminal.request_sha256,
    canonical_main:terminal.canonical_main,
    canonical_tree:terminal.canonical_tree,
    corpus_sha256:terminal.corpus_sha256,
    parent_adapter_sha256:terminal.parent_adapter_sha256,
    operator_public_key_raw_sha256:terminal.operator_public_key_raw_sha256,
    state_root_identity_sha256:terminal.state_root_identity_sha256,
    consumed_directory_identity_sha256:terminal.consumed_directory_identity_sha256,
    socket_identity_sha256:terminal.socket_identity_sha256,
    service_process_identity_sha256:terminal.service_process_identity_sha256,
    training_pid:terminal.training_pid,
    training_process_start_time_ticks:terminal.training_process_start_time_ticks,
    boot_id_sha256:terminal.boot_id_sha256,
    terminal_receipt_shape_bound:true,
    terminal_receipt_source_origin_proven:false,
    protected_runner_origin_required:true,
    protected_runner_origin_proven:false,
    current_host_revalidation_required:true,
    current_host_revalidation_performed:false,
    exact_v2_custody_record_revalidation_required:true,
    exact_v2_custody_record_revalidation_performed:false,
    exact_v2_custody_generation_revalidation_required:true,
    exact_v2_custody_generation_revalidation_performed:false,
    protected_claim_store_required:true,
    protected_claim_store_proven:false,
    claim_identity_bound:false,
    claim_root_bound:false,
    host_installation_performed:false,
    durable_attempt_claim_required:true,
    durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,
    attempt_claimed:false,
    training_execution_authorized:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    requirements:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2,
    next_gate:"apollyon_durable_attempt_claim_store_host_qualification_v2",
    executor_gate_after_host_qualification:
      "durable_candidate_training_attempt_claim_executor_v2",
  };
  return Object.freeze({
    ...material,
    store_contract_id:"apollyon_claim_store_contract_v2:"+
      sha256(Buffer.from(canonical(material),"utf8")),
    authority:VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_AUTHORITY_V2,
  });
}
