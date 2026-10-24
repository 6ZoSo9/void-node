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
  VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_AUTHORITY_V2,
  finalizeApollyonLiveCustodyServiceSourceSessionBindingV2,
} from "../tools/apollyon-live-custody-service-source-session-binding-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
assert.equal(
  gitBlob(fs.readFileSync(path.join(ROOT,"tools/apollyon-candidate-training-attempt-claim-contract-v2.mjs"))),
  "fd671b3303946143d927473e4ed04e7cd5030bac",
);
assert.equal(
  gitBlob(fs.readFileSync(path.join(ROOT,"tools/apollyon-authorization-custody-launcher-v2.mjs"))),
  "d23ff045d8c355401fed499c6bcffd503ba4c7fd",
);

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
function session(c){
  return {
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
  };
}

const c=claim();
const result=finalizeApollyonLiveCustodyServiceSourceSessionBindingV2({
  claim_contract:c,session_evidence:session(c),
});
assert.equal(result.status,"current_v2_live_custody_source_session_bound_unclaimed");
assert.equal(result.live_service_source_identity_proven,true);
assert.equal(result.same_live_custody_session_binding_proven,true);
assert.equal(result.durable_attempt_claim_performed,false);
assert.equal(result.attempt_claimed,false);
assert.equal(result.training_execution_performed,false);
assert.equal(result.next_gate,"durable_candidate_training_attempt_claim_executor_v2");
assert.match(result.live_binding_id,/^apollyon_live_binding_v2:[0-9a-f]{64}$/u);

for(const mutate of [
  x=>{x.authorization_id="apollyon_authz_v1:"+"0".repeat(64);},
  x=>{x.custody_record_sha256="0".repeat(64);},
  x=>{x.custody_launcher_blob_sha1="0".repeat(40);},
  x=>{x.loader_environment_clean=false;},
  x=>{x.socket_identity_stable=false;},
]){
  const s=session(c);mutate(s);
  assert.throws(
    ()=>finalizeApollyonLiveCustodyServiceSourceSessionBindingV2({
      claim_contract:c,session_evidence:s,
    }),
    /session_evidence_invalid/u,
  );
}

for(const [key,expected] of Object.entries({
  source_only_finalizer:true,current_v2_claim_contract_required:true,
  current_stack_custody_launcher_required:true,
  stable_state_root_identity_required:true,
  stable_consumed_directory_identity_required:true,
  stable_socket_identity_required:true,
  stable_custody_service_process_identity_required:true,
  loader_environment_clean_required:true,
  exact_authorization_identity_rebinding_required:true,
  live_service_source_identity_proven_by_input:false,
  same_live_custody_session_binding_proven_by_input:false,
  durable_attempt_claim_performed:false,attempt_claimed:false,
  training_execution_authorized:false,training_execution_performed:false,
  filesystem_read:false,filesystem_write:false,network_access:false,
  service_action:false,funds_movement:false,
})){
  assert.equal(
    VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_AUTHORITY_V2[key],
    expected,key,
  );
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-live-custody-service-source-session-binding-v2.mjs"),
  "utf8",
);
for(const forbidden of [
  "node:fs","node:net","node:child_process","systemctl","writeFileSync(","spawn(",
  "createPrivateKey","crypto.sign(","attempt_claimed:true",
  "training_execution_performed:true","candidate_weight_mutation_performed:true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_V2_PROOF_GREEN");
console.log("current_v2_claim_contract_required=true");
console.log("current_stack_custody_launcher_required=true");
console.log("live_service_source_identity_proven=true");
console.log("same_live_custody_session_binding_proven=true");
console.log("durable_attempt_claim_performed=false");
console.log("training_execution=false");
