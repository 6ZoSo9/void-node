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
  finalizeApollyonLiveCustodyServiceSourceSessionBindingV2,
} from "../tools/apollyon-live-custody-service-source-session-binding-v2.mjs";
import {
  VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2,
  finalizeApollyonLiveSourceSessionTerminalReceiptV2,
} from "../tools/apollyon-live-source-session-terminal-receipt-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-live-custody-source-session-runner-v2.mjs":
    "8c2c92055ab05c074653cee971e095934b5cb85c",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
    "5ee36c89275c29b008094ad030b8664ed9d7b60b",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs":
    "974a383f4904b6b223a2143d5f7a19322f3d1f66",
})){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

function claim(){
  const material={
    marker:"VOID_APOLLYON_CANDIDATE_TRAINING_ATTEMPT_CLAIM_CONTRACT_V2",
    version:2,status:"current_v2_claim_contract_qualified_unclaimed",
    target_host:"Xiphos",
    preclaim_v2_blob_sha1:"d062fe9d8f70f731e157c8d9f835d3f936ac5d59",
    v1_canonicalizer_blob_sha1:"f97fafb0148527ae3a954e2752faef8c7fc9e88e",
    preclaim_id:"apollyon_preclaim_v2:"+"1".repeat(64),
    current_v2_live_qualification_id:"apollyon_custody_live_v2:"+"2".repeat(64),
    installed_isolation_qualification_id:"apollyon_training_isolation_live_v1:"+"3".repeat(64),
    training_pid:4242,training_process_start_time_ticks:"123456",
    boot_id_sha256:"4".repeat(64),
    custody_generation_id:"apollyon_custody_generation_v1:"+"5".repeat(64),
    custody_record_sha256:"6".repeat(64),
    authorization_id:"apollyon_authz_v1:"+"7".repeat(64),
    operator_public_key_raw_sha256:"8".repeat(64),
    request_sha256:"9".repeat(64),canonical_main:"a".repeat(40),
    canonical_tree:"b".repeat(40),corpus_sha256:"c".repeat(64),
    parent_adapter_sha256:"d".repeat(64),attempt_limit:1,
    current_v2_preclaim_bound:true,exact_custody_record_bound:true,
    historical_v84_v1_sufficient:false,live_service_source_identity_required:true,
    live_service_source_identity_proven:false,
    same_live_custody_session_binding_required:true,
    same_live_custody_session_binding_proven:false,
    durable_attempt_claim_required:true,durable_attempt_claim_performed:false,
    attempt_claim_authorized:false,attempt_claimed:false,
    training_execution_authorized:false,training_execution_performed:false,
    candidate_weight_mutation_performed:false,generation_execution_performed:false,
    operator_private_key_access_performed:false,production_signing_performed:false,
    wallet_access_performed:false,transaction_signing_performed:false,
    transaction_broadcast_performed:false,funds_movement_performed:false,
    next_gate:"live_custody_service_source_identity_binding_v2",
  };
  const authority={
    source_only_contract:true,current_v2_preclaim_required:true,
    exact_custody_assertion_required:true,exact_custody_record_required:true,
    exact_custody_record_hash_required:true,historical_v84_v1_sufficient:false,
    live_service_source_identity_required:true,live_service_source_identity_proven:false,
    same_live_custody_session_binding_required:true,same_live_custody_session_binding_proven:false,
    durable_claim_executor_required:true,durable_claim_performed:false,
    attempt_claim_authorized:false,attempt_claimed:false,
    training_execution_authorized:false,training_execution_performed:false,
    candidate_weight_mutation_performed:false,generation_execution_performed:false,
    filesystem_read:false,filesystem_write:false,network_access:false,service_action:false,
    operator_private_key_access:false,production_signing:false,wallet_access:false,
    transaction_signing:false,transaction_broadcast:false,funds_movement:false,
  };
  return {
    ...material,
    claim_contract_id:"apollyon_claim_contract_v2:"+
      sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(material),"utf8")),
    authority,
  };
}
function binding(){
  const c=claim();
  return finalizeApollyonLiveCustodyServiceSourceSessionBindingV2({
    claim_contract:c,
    session_evidence:{
      authorization_id:c.authorization_id,
      custody_generation_id:c.custody_generation_id,
      custody_record_sha256:c.custody_record_sha256,
      operator_public_key_raw_sha256:c.operator_public_key_raw_sha256,
      custody_launcher_blob_sha1:"d23ff045d8c355401fed499c6bcffd503ba4c7fd",
      state_root_identity_sha256:"e".repeat(64),
      consumed_directory_identity_sha256:"f".repeat(64),
      socket_identity_sha256:"1".repeat(64),
      service_process_identity_sha256:"2".repeat(64),
      loader_environment_clean:true,
      state_root_identity_stable:true,
      consumed_directory_identity_stable:true,
      socket_identity_stable:true,
      service_process_identity_stable:true,
    },
  });
}
function receipt(){
  const b=binding();
  return {
    marker:"VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_RUNNER_V2",
    version:2,
    status:"live_source_session_binding_complete_training_service_stopped",
    binding:b,
    training_pid:b.training_pid,
    training_process_start_time_ticks:b.training_process_start_time_ticks,
    training_service_enabled:false,
    durable_attempt_claim_performed:false,
    training_execution_performed:false,
    candidate_weight_mutation_performed:false,
    custody_service_action_performed:false,
    funds_movement_performed:false,
    training_service_active_after:false,
    training_service_exact_dormant_after:true,
    training_generation_absent_after:true,
  };
}

const terminalInput=receipt();
const result=finalizeApollyonLiveSourceSessionTerminalReceiptV2({
  runner_receipt:terminalInput,
});
assert.equal(result.status,"live_source_session_terminal_shutdown_qualified_unclaimed");
assert.equal(result.terminal_shutdown_evidence_shape_qualified,true);
assert.equal(result.terminal_shutdown_authority_proven,false);
assert.equal(result.training_service_exact_dormant_after,true);
assert.equal(result.training_generation_absent_after,true);
assert.equal(result.inner_live_binding_alone_sufficient_for_executor,false);
assert.equal(result.current_host_revalidation_required,true);
assert.equal(result.revalidation_identity_hashes_carried,true);
assert.equal(result.terminal_runner_receipt_digest_carried,true);
assert.equal(result.state_root_identity_sha256,"e".repeat(64));
assert.equal(result.consumed_directory_identity_sha256,"f".repeat(64));
assert.equal(result.socket_identity_sha256,"1".repeat(64));
assert.equal(result.service_process_identity_sha256,"2".repeat(64));
assert.equal(result.loader_environment_clean,true);
assert.equal(result.live_service_source_identity_proven,true);
assert.equal(result.same_live_custody_session_binding_proven,true);
assert.equal(
  result.terminal_runner_receipt_sha256,
  sha256(Buffer.from(canonicalApollyonClaimContractJsonV1(terminalInput),"utf8")),
);
assert.equal(result.protected_runner_origin_required,true);
assert.equal(result.protected_runner_origin_proven,false);
assert.equal(result.live_host_observation_performed,false);
assert.equal(result.durable_attempt_claim_performed,false);
assert.equal(result.attempt_claim_authorized,false);
assert.equal(result.attempt_claimed,false);
assert.equal(result.training_execution_authorized,false);
assert.equal(result.training_execution_performed,false);
assert.equal(result.next_gate,"durable_candidate_training_attempt_claim_executor_v2");
assert.match(result.terminal_receipt_id,/^apollyon_terminal_receipt_v2:[0-9a-f]{64}$/u);

for(const mutate of [
  x=>{x.status="live_source_session_binding_complete_training_service_pending_stop";},
  x=>{x.training_service_active_after=true;},
  x=>{x.training_service_exact_dormant_after=false;},
  x=>{x.training_generation_absent_after=false;},
  x=>{x.training_pid+=1;},
  x=>{x.training_process_start_time_ticks="123457";},
  x=>{x.training_process_start_time_ticks=123456;},
  x=>{x.durable_attempt_claim_performed=true;},
  x=>{x.training_execution_performed=true;},
  x=>{x.training_service_enabled=true;},
  x=>{x.candidate_weight_mutation_performed=true;},
  x=>{x.custody_service_action_performed=true;},
  x=>{x.funds_movement_performed=true;},
]){
  const r=receipt();mutate(r);
  assert.throws(
    ()=>finalizeApollyonLiveSourceSessionTerminalReceiptV2({runner_receipt:r}),
    /runner_receipt_invalid/u,
  );
}
{
  const r=receipt();
  r.binding={...r.binding,next_gate:"something_else"};
  assert.throws(
    ()=>finalizeApollyonLiveSourceSessionTerminalReceiptV2({runner_receipt:r}),
    /binding_invalid|binding_id_invalid/u,
  );
}
{
  const r=receipt();
  r.binding={...r.binding,attempt_claimed:true};
  assert.throws(
    ()=>finalizeApollyonLiveSourceSessionTerminalReceiptV2({runner_receipt:r}),
    /binding_invalid|binding_id_invalid/u,
  );
}
{
  const r=receipt();
  const badAuthority={...r.binding.authority};
  Object.defineProperty(badAuthority,"__proto__",{
    enumerable:true,
    configurable:true,
    writable:true,
    value:{polluted:true},
  });
  assert.equal(Object.hasOwn(badAuthority,"__proto__"),true);
  assert.equal(
    Object.hasOwn(structuredClone(badAuthority),"__proto__"),
    true,
  );
  r.binding={...r.binding,authority:badAuthority};
  assert.throws(
    ()=>finalizeApollyonLiveSourceSessionTerminalReceiptV2({runner_receipt:r}),
    /binding_authority_invalid/u,
  );
}
assert.throws(
  ()=>finalizeApollyonLiveSourceSessionTerminalReceiptV2({runner_receipt:{binding:binding()}}),
  /runner_receipt_invalid/u,
);

{
  const r=receipt();
  const goodBinding=r.binding;
  const expectedReceipt={...r,binding:goodBinding};
  const badBinding={
    ...goodBinding,
    state_root_identity_sha256:"0".repeat(64),
  };
  let bindingReads=0;
  Object.defineProperty(r,"binding",{
    enumerable:true,
    configurable:true,
    get(){
      bindingReads+=1;
      return bindingReads===1?goodBinding:badBinding;
    },
  });
  const terminal=finalizeApollyonLiveSourceSessionTerminalReceiptV2({
    runner_receipt:r,
  });
  assert.equal(bindingReads,1);
  assert.equal(
    terminal.state_root_identity_sha256,
    goodBinding.state_root_identity_sha256,
  );
  assert.equal(
    terminal.terminal_runner_receipt_sha256,
    sha256(Buffer.from(
      canonicalApollyonClaimContractJsonV1(expectedReceipt),
      "utf8",
    )),
  );
}

for(const [key,expected] of Object.entries({
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
  durable_claim_executor_required:true,
  durable_attempt_claim_performed:false,
  attempt_claim_authorized:false,
  attempt_claimed:false,
  training_execution_authorized:false,
  training_execution_performed:false,
  candidate_weight_mutation_performed:false,
  filesystem_read:false,filesystem_write:false,network_access:false,
  service_action:false,operator_private_key_access:false,production_signing:false,
  wallet_access:false,transaction_signing:false,transaction_broadcast:false,
  funds_movement:false,
})){
  assert.equal(VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_AUTHORITY_V2[key],expected,key);
}


const WORKFLOW=fs.readFileSync(
  path.join(ROOT,".github/workflows/apollyon-live-source-session-terminal-receipt-v2.yml"),
  "utf8",
);
for(const required of [
  "pull_request:",
  "push:\n    branches: [main]",
  "workflow_dispatch:",
  '"tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs"',
  "push)",
  'BASE="$(git rev-parse "$HEAD^")"',
]){
  assert.equal(WORKFLOW.includes(required),true,"workflow parity: "+required);
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-live-source-session-terminal-receipt-v2.mjs"),
  "utf8",
);
for(const required of [
  'status:"live_source_session_terminal_shutdown_qualified_unclaimed"',
  'terminal_shutdown_evidence_shape_qualified:true',
  'terminal_shutdown_authority_proven:false',
  'inner_live_binding_alone_sufficient_for_executor:false',
  'current_host_revalidation_required:true',
  'revalidation_identity_hashes_carried:true',
  'terminal_runner_receipt_digest_carried:true',
  'snapshot=structuredClone(input);',
  'const {receipt,binding}=validateRunnerReceipt(snapshot.runner_receipt);',
  'exactKeys(\n    value.authority,',
  'Object.keys(VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_AUTHORITY_V2)',
  'canonical(receipt)',
  'protected_runner_origin_required:true',
  'protected_runner_origin_proven:false',
  'next_gate:"durable_candidate_training_attempt_claim_executor_v2"',
])assert.equal(source.includes(required),true,required);
for(const forbidden of [
  "node:fs","node:net","node:child_process","systemctl","writeFileSync(","spawn(",
  "createPrivateKey","crypto.sign(","attempt_claimed:true",
  "training_execution_performed:true","candidate_weight_mutation_performed:true",
  "canonical(input.runner_receipt)",
  "validateRunnerReceipt(input.runner_receipt)",
])assert.equal(source.includes(forbidden),false,forbidden);

console.log("VOID_APOLLYON_LIVE_SOURCE_SESSION_TERMINAL_RECEIPT_V2_PROOF_GREEN");
console.log("exact_terminal_runner_receipt_required=true");
console.log("inner_live_binding_alone_sufficient_for_executor=false");
console.log("terminal_shutdown_evidence_shape_qualified=true");
console.log("terminal_shutdown_authority_proven=false");
console.log("training_service_exact_dormant_after=true");
console.log("training_generation_absent_after=true");
console.log("current_host_revalidation_required=true");
console.log("revalidation_identity_hashes_carried=true");
console.log("terminal_runner_receipt_digest_carried=true");
console.log("single_plain_input_snapshot_required=true");
console.log("accessor_snapshot_drift_rejected=true");
console.log("binding_authority_exact_keys_required=true");
console.log("binding_authority_proto_extra_rejected=true");
console.log("protected_runner_origin_required=true");
console.log("protected_runner_origin_proven=false");
console.log("live_host_observation_performed=false");
console.log("durable_attempt_claim_performed=false");
console.log("training_execution=false");
