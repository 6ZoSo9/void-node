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
  VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2,
} from "../tools/apollyon-live-source-session-terminal-receipt-v2.mjs";
import {
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_AUTHORITY_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2,
  qualifyApollyonDurableAttemptClaimStoreContractV2,
} from "../tools/apollyon-durable-attempt-claim-store-contract-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs":
    "e27f0ebb968f4611bfc069670325c3f5e6df1c65",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
    "981935515e08634be96446e58922c16be56d33ad",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs":
    "276b59d1ac7241f756ecd09193c52601c98f5b5e",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

function terminalReceipt(){
  const material={
    marker:"VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_V2",
    version:2,
    status:"live_source_session_terminal_shutdown_qualified_unclaimed",
    target_host:"Xiphos",
    runner_v2_blob_sha1:"8c2c92055ab05c074653cee971e095934b5cb85c",
    binding_v2_blob_sha1:"981935515e08634be96446e58922c16be56d33ad",
    live_binding_id:"apollyon_live_binding_v2:"+"1".repeat(64),
    claim_contract_id:"apollyon_claim_contract_v2:"+"2".repeat(64),
    preclaim_id:"apollyon_preclaim_v2:"+"3".repeat(64),
    current_v2_live_qualification_id:"apollyon_custody_live_v2:"+"4".repeat(64),
    installed_isolation_qualification_id:"apollyon_training_isolation_live_v1:"+"5".repeat(64),
    authorization_id:"apollyon_authz_v1:"+"6".repeat(64),
    custody_generation_id:"apollyon_custody_generation_v1:"+"7".repeat(64),
    custody_record_sha256:"8".repeat(64),
    request_sha256:"9".repeat(64),
    canonical_main:"a".repeat(40),
    canonical_tree:"b".repeat(40),
    corpus_sha256:"c".repeat(64),
    parent_adapter_sha256:"d".repeat(64),
    operator_public_key_raw_sha256:"e".repeat(64),
    state_root_identity_sha256:"f".repeat(64),
    consumed_directory_identity_sha256:"1".repeat(64),
    socket_identity_sha256:"2".repeat(64),
    service_process_identity_sha256:"3".repeat(64),
    loader_environment_clean:true,
    live_service_source_identity_proven:true,
    same_live_custody_session_binding_proven:true,
    terminal_runner_receipt_sha256:"4".repeat(64),
    training_pid:4242,
    training_process_start_time_ticks:"123456",
    boot_id_sha256:"5".repeat(64),
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
  return {
    ...material,
    terminal_receipt_id:"apollyon_terminal_receipt_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
    authority:structuredClone(
      VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2,
    ),
  };
}

const t=terminalReceipt();
const result=qualifyApollyonDurableAttemptClaimStoreContractV2({
  terminal_receipt:t,
});
assert.equal(result.status,"protected_attempt_claim_store_requirements_defined_uninstalled");
assert.equal(result.terminal_receipt_id,t.terminal_receipt_id);
assert.equal(result.custody_generation_id,t.custody_generation_id);
assert.equal(result.custody_record_sha256,t.custody_record_sha256);
assert.equal(result.terminal_source_receipt_bound,true);
assert.equal(result.protected_runner_origin_required,true);
assert.equal(result.protected_runner_origin_proven,false);
assert.equal(result.current_host_revalidation_required,true);
assert.equal(result.current_host_revalidation_performed,false);
assert.equal(result.exact_v2_custody_record_revalidation_required,true);
assert.equal(result.exact_v2_custody_record_revalidation_performed,false);
assert.equal(result.exact_v2_custody_generation_revalidation_required,true);
assert.equal(result.exact_v2_custody_generation_revalidation_performed,false);
assert.equal(result.protected_claim_store_required,true);
assert.equal(result.protected_claim_store_proven,false);
assert.equal(result.claim_identity_bound,false);
assert.equal(result.claim_root_bound,false);
assert.equal(result.host_installation_performed,false);
assert.equal(result.durable_attempt_claim_performed,false);
assert.equal(result.attempt_claim_authorized,false);
assert.equal(result.attempt_claimed,false);
assert.equal(result.training_execution_authorized,false);
assert.equal(result.training_execution_performed,false);
assert.equal(result.candidate_weight_mutation_performed,false);
assert.equal(result.next_gate,"apollyon_durable_attempt_claim_store_host_qualification_v2");
assert.equal(
  result.executor_gate_after_host_qualification,
  "durable_candidate_training_attempt_claim_executor_v2",
);
assert.match(result.store_contract_id,/^apollyon_claim_store_contract_v2:[0-9a-f]{64}$/u);

for(const [key,expected] of Object.entries({
  dedicated_claim_service_identity_required:true,
  claim_identity_distinct_from_training_required:true,
  claim_identity_distinct_from_custody_required:true,
  future_identity_must_be_versioned_and_fixed_before_install:true,
  future_claim_root_must_be_versioned_and_fixed_before_install:true,
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
  claim_file_fsync_before_publication_required:true,
  claim_directory_fsync_after_publication_required:true,
  crash_recovery_exact_state_classification_required:true,
  duplicate_claim_rejected_required:true,
  claim_must_be_durable_before_training_start:true,
  attempt_limit:1,
  automatic_retry_authorized:false,
  broker_execution_ledger_reuse_allowed:false,
  historical_v1_consumption_store_sufficient:false,
})){
  assert.equal(VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2[key],expected,key);
}
for(const [key,expected] of Object.entries({
  source_only_store_contract:true,
  requirements_defined:true,
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
  filesystem_read:false,filesystem_write:false,network_access:false,service_action:false,
  operator_private_key_access:false,production_signing:false,wallet_access:false,
  transaction_signing:false,transaction_broadcast:false,funds_movement:false,
  repository_merge:false,
})){
  assert.equal(VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_AUTHORITY_V2[key],expected,key);
}

for(const mutate of [
  x=>{x.protected_runner_origin_proven=true;},
  x=>{x.terminal_shutdown_authority_proven=true;},
  x=>{x.current_host_revalidation_required=false;},
  x=>{x.durable_attempt_claim_performed=true;},
  x=>{x.attempt_claim_authorized=true;},
  x=>{x.attempt_claimed=true;},
  x=>{x.training_execution_performed=true;},
  x=>{x.training_process_start_time_ticks=123456;},
  x=>{x.custody_record_sha256="0".repeat(64);},
]){
  const bad=terminalReceipt();mutate(bad);
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimStoreContractV2({terminal_receipt:bad}),
    /terminal_invalid|terminal_id_invalid/u,
  );
}
{
  const bad=terminalReceipt();
  const authority={...bad.authority};
  Object.defineProperty(authority,"__proto__",{
    enumerable:true,configurable:true,writable:true,value:{polluted:true},
  });
  bad.authority=authority;
  assert.throws(
    ()=>qualifyApollyonDurableAttemptClaimStoreContractV2({terminal_receipt:bad}),
    /terminal_authority_invalid/u,
  );
}
{
  const input={terminal_receipt:terminalReceipt()};
  const good=input.terminal_receipt;
  const bad={...good,custody_record_sha256:"0".repeat(64)};
  let reads=0;
  Object.defineProperty(input,"terminal_receipt",{
    enumerable:true,configurable:true,
    get(){reads+=1;return reads===1?good:bad;},
  });
  const accepted=qualifyApollyonDurableAttemptClaimStoreContractV2(input);
  assert.equal(reads,1);
  assert.equal(accepted.custody_record_sha256,good.custody_record_sha256);
}


const WORKFLOW=fs.readFileSync(
  path.join(ROOT,".github/workflows/apollyon-durable-attempt-claim-store-contract-v2.yml"),
  "utf8",
);
for(const required of [
  "pull_request:",
  "push:\n    branches: [main]",
  "workflow_dispatch:",
  "push)",
  'BASE="$(git rev-parse "$HEAD^")"',
  '"tools/apollyon-live-source-session-terminal-receipt-v2.mjs"',
  '"tools/apollyon-live-custody-service-source-session-binding-v2.mjs"',
  '"tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs"',
]){
  assert.equal(WORKFLOW.includes(required),true,"workflow parity: "+required);
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-durable-attempt-claim-store-contract-v2.mjs"),
  "utf8",
);
for(const required of [
  'status:"protected_attempt_claim_store_requirements_defined_uninstalled"',
  'claim_identity_bound:false','claim_root_bound:false',
  'protected_claim_store_proven:false','host_installation_performed:false',
  'claim_must_be_durable_before_training_start:true',
  'broker_execution_ledger_reuse_allowed:false',
  'historical_v1_consumption_store_sufficient:false',
  'next_gate:"apollyon_durable_attempt_claim_store_host_qualification_v2"',
])assert.equal(source.includes(required),true,required);
for(const forbidden of [
  "node:fs","node:net","node:child_process","systemctl","writeFileSync(","appendFile",
  "mkdir","spawn(","fetch(","createPrivateKey","crypto.sign(",
  "durable_attempt_claim_performed:true","attempt_claim_authorized:true",
  "attempt_claimed:true","training_execution_authorized:true",
  "training_execution_performed:true","candidate_weight_mutation_performed:true",
  "filesystem_write:true","service_action:true","funds_movement:true",
])assert.equal(source.includes(forbidden),false,forbidden);

console.log("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_CONTRACT_V2_PROOF_GREEN");
console.log("requirements_defined=true");
console.log("dedicated_claim_service_identity_required=true");
console.log("claim_identity_bound=false");
console.log("claim_root_bound=false");
console.log("protected_claim_store_proven=false");
console.log("current_host_revalidation_performed=false");
console.log("exact_v2_custody_record_revalidation_performed=false");
console.log("claim_must_be_durable_before_training_start=true");
console.log("broker_execution_ledger_reuse_allowed=false");
console.log("historical_v1_consumption_store_sufficient=false");
console.log("durable_attempt_claim_performed=false");
console.log("training_execution=false");
