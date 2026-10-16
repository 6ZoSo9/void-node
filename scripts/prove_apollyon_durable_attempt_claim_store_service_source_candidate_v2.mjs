#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_DANGEROUS_ENVIRONMENT_NAMES_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SUCCESS_RESPONSE_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_FAILURE_RESPONSE_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_PUBLISHER_LEAST_AUTHORITY_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_CONTINUITY_RECEIPT_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_SYSTEMD_REQUIREMENTS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SOCKET_REQUIREMENTS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_LEAST_AUTHORITY_KEYS_V2,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2,
  qualifyApollyonDurableAttemptClaimStorePolicyV2,
} from "../tools/apollyon-durable-attempt-claim-store-contract-v2.mjs";
import {
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_CANDIDATE_AUTHORITY_V2,
  canonicalApollyonClaimStoreServiceSourceCandidateV2,
  qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2,
} from "../tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}

const EXACT_BLOBS=Object.freeze({
  "tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs":
    "5a399fd9bec0ed1014b917043771cb8ba1287cba",
  "ops/xiphos/apollyon_durable_attempt_claim_store_host_plan_v2.py":
    "03ea7df9b7a548c73ec1c715d716391be5d5d223",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs":
    "6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs":
    "e27f0ebb968f4611bfc069670325c3f5e6df1c65",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
    "981935515e08634be96446e58922c16be56d33ad",
});
for(const [relative,expected] of Object.entries(EXACT_BLOBS)){
  assert.equal(gitBlob(fs.readFileSync(path.join(ROOT,relative))),expected,relative);
}

const policy=qualifyApollyonDurableAttemptClaimStorePolicyV2();
const candidate=qualifyApollyonDurableAttemptClaimStoreServiceSourceCandidateV2();
assert.equal(
  policy.store_policy_id,
  "apollyon_claim_store_policy_v2:e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137",
);
assert.equal(
  candidate.marker,
  "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_CANDIDATE_V2",
);
assert.equal(candidate.version,2);
assert.equal(candidate.status,"claim_store_service_source_boundary_defined_unimplemented");
assert.equal(candidate.target_host,"Xiphos");
assert.equal(candidate.parent_store_contract_head,"fe7e1ad9b78a24b77a1657067e4d08f7c56a7731");
assert.equal(candidate.parent_store_contract_blob_sha1,"6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe");
assert.equal(candidate.parent_host_plan_head,"5693e0e060dd567acbbf7a1e44ab641efded4a98");
assert.equal(candidate.parent_host_planner_blob_sha1,"03ea7df9b7a548c73ec1c715d716391be5d5d223");
assert.equal(candidate.store_policy_id,policy.store_policy_id);
assert.deepEqual(candidate.fixed_identities,{
  claim_service_user:"voidapollyonclaim",
  claim_service_group:"voidapollyonclaim",
  claim_publisher_user:"voidapollyonclaimpub",
  claim_publisher_group:"voidapollyonclaimpub",
  claim_ipc_group:"voidapollyonclaimipc",
});
assert.deepEqual(candidate.fixed_paths,{
  claim_state_root:"/var/lib/void-apollyon-attempt-claim-v2",
  claim_socket_parent:"/run/void-apollyon-attempt-claim-v2",
  claim_socket:"/run/void-apollyon-attempt-claim-v2/claim.sock",
  claim_service_unit:"/etc/systemd/system/void-apollyon-attempt-claim-v2.service",
  claim_service_source_root:"/opt/void-apollyon-attempt-claim-v2-reviewed-v1",
  claim_publisher_source_root:"/opt/void-apollyon-attempt-claim-publisher-v2-reviewed-v1",
});
assert.equal(candidate.numeric_host_identities,null);
assert.equal(candidate.host_plan_receipt_required_for_numeric_identity_binding,true);
assert.equal(candidate.host_plan_receipt_consumed,false);
assert.equal(candidate.service_implementation_present,false);
assert.equal(candidate.publisher_implementation_present,false);
assert.equal(candidate.host_installation_performed,false);
assert.equal(candidate.protected_store_qualification_performed,false);
assert.equal(candidate.durable_attempt_claim_performed,false);
assert.equal(candidate.training_start_consumption_performed,false);
assert.equal(candidate.training_execution_performed,false);
assert.equal(candidate.candidate_weight_mutation_performed,false);
assert.equal(
  candidate.next_gate,
  "apollyon_durable_attempt_claim_store_service_source_implementation_v2",
);
assert.match(
  candidate.candidate_id,
  /^apollyon_claim_store_service_source_candidate_v2:[0-9a-f]{64}$/u,
);

assert.deepEqual(
  candidate.requirements.dangerous_environment_names,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_DANGEROUS_ENVIRONMENT_NAMES_V2,
);
assert.deepEqual(
  candidate.requirements.service_systemd,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_SYSTEMD_REQUIREMENTS_V2,
);
assert.deepEqual(candidate.requirements.socket,VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SOCKET_REQUIREMENTS_V2);
assert.deepEqual(candidate.requirements.store,VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_REQUIREMENTS_V2);
assert.deepEqual(
  candidate.requirements.service_least_authority_keys,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SERVICE_LEAST_AUTHORITY_KEYS_V2,
);
assert.deepEqual(
  candidate.requirements.publisher_least_authority_keys,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_PUBLISHER_LEAST_AUTHORITY_KEYS_V2,
);
assert.deepEqual(candidate.requirements.request_keys,VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_KEYS_V2);
assert.deepEqual(candidate.requirements.claim_record_keys,VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_RECORD_KEYS_V2);
assert.deepEqual(
  candidate.requirements.success_response_keys,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_SUCCESS_RESPONSE_KEYS_V2,
);
assert.deepEqual(
  candidate.requirements.failure_response_keys,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_FAILURE_RESPONSE_KEYS_V2,
);
assert.deepEqual(
  candidate.requirements.store_generation_record_keys,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_GENERATION_RECORD_KEYS_V2,
);
assert.deepEqual(
  candidate.requirements.continuity_receipt_keys,
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_CONTINUITY_RECEIPT_KEYS_V2,
);

const idMaterial=structuredClone(candidate);
delete idMaterial.candidate_id;
assert.equal(
  candidate.candidate_id,
  "apollyon_claim_store_service_source_candidate_v2:"+
    sha256(Buffer.from(canonicalApollyonClaimStoreServiceSourceCandidateV2(idMaterial),"utf8")),
);

for(const value of [
  candidate,
  candidate.fixed_identities,
  candidate.fixed_paths,
  candidate.requirements,
  candidate.requirements.service_systemd,
  candidate.requirements.socket,
  candidate.requirements.store,
]){
  assert.equal(Object.isFrozen(value),true);
}
assert.throws(()=>{
  candidate.fixed_paths.claim_socket="/tmp/not-reviewed.sock";
},TypeError);

for(const [key,expected] of Object.entries({
  source_only_candidate:true,
  exact_parent_store_policy_required:true,
  exact_parent_host_plan_source_required:true,
  fixed_identity_names_bound:true,
  fixed_paths_bound:true,
  host_plan_receipt_required_for_numeric_identity_binding:true,
  numeric_host_identity_binding_performed:false,
  service_implementation_present:false,
  publisher_implementation_present:false,
  service_unit_implementation_present:false,
  socket_listener_implementation_present:false,
  durable_store_writer_implementation_present:false,
  training_start_consumer_implementation_present:false,
  host_installation:false,
  filesystem_read:false,
  filesystem_write:false,
  account_mutation:false,
  group_mutation:false,
  systemd_mutation:false,
  service_action:false,
  socket_action:false,
  network_access:false,
  credential_access:false,
  private_key_access:false,
  signing:false,
  wallet_access:false,
  transaction:false,
  funds_movement:false,
  durable_attempt_claim:false,
  training_execution:false,
  candidate_weight_mutation:false,
})){
  assert.equal(
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_CANDIDATE_AUTHORITY_V2[key],
    expected,key,
  );
}

const source=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-durable-attempt-claim-store-service-source-candidate-v2.mjs"),
  "utf8",
);
for(const required of [
  'PARENT_STORE_CONTRACT_HEAD="fe7e1ad9b78a24b77a1657067e4d08f7c56a7731"',
  'PARENT_STORE_CONTRACT_BLOB_SHA1="6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe"',
  'PARENT_HOST_PLAN_HEAD="5693e0e060dd567acbbf7a1e44ab641efded4a98"',
  'PARENT_HOST_PLANNER_BLOB_SHA1="03ea7df9b7a548c73ec1c715d716391be5d5d223"',
  'numeric_host_identities:null',
  'host_plan_receipt_required_for_numeric_identity_binding:true',
  'service_implementation_present:false',
  'publisher_implementation_present:false',
]){
  assert.equal(source.includes(required),true,required);
}
for(const forbidden of [
  'from "node:fs"','from "node:net"','from "node:child_process"',
  "writeFile","appendFile","mkdirSync","rmSync","renameSync","linkSync",
  "listen(","connect(","spawn(","execFile(","systemctl",
  "createPrivateKey","crypto.sign(","fetch(",
  "durable_attempt_claim:true","training_execution:true",
  "candidate_weight_mutation:true","host_installation:true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

console.log("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_CANDIDATE_V2_PROOF_GREEN");
console.log("exact_parent_store_policy_required=true");
console.log("exact_parent_host_plan_source_required=true");
console.log("complete_service_systemd_policy_projected=true");
console.log("complete_socket_policy_projected=true");
console.log("complete_store_policy_projected=true");
console.log("service_and_publisher_least_authority_schemas_projected=true");
console.log("host_plan_receipt_required_for_numeric_identity_binding=true");
console.log("numeric_host_identity_binding_performed=false");
console.log("service_implementation_present=false");
console.log("publisher_implementation_present=false");
console.log("host_installation=false");
console.log("durable_attempt_claim=false");
console.log("training_execution=false");
