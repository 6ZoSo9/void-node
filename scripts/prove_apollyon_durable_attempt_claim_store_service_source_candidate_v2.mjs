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
    "7654ddb2d5875d1aa42e8f41398afb727ba3832d",
  "ops/xiphos/apollyon_durable_attempt_claim_store_host_plan_v2.py":
    "9e2a716e43e4a9815f9e8f2c67c0d3e322f8b64d",
  "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs":
    "bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs":
    "974a383f4904b6b223a2143d5f7a19322f3d1f66",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
    "5ee36c89275c29b008094ad030b8664ed9d7b60b",
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
assert.equal(candidate.parent_store_contract_head,"9475035552881f34658a7c8f3a6b336199fda159");
assert.equal(candidate.parent_store_contract_blob_sha1,"bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc");
assert.equal(candidate.parent_host_plan_head,"30edd98609877c15be44d26b46916cf8c5d1f174");
assert.equal(candidate.parent_host_planner_blob_sha1,"9e2a716e43e4a9815f9e8f2c67c0d3e322f8b64d");
assert.notEqual(candidate.parent_host_planner_blob_sha1,"69db13fffaf1678da03b90f0fa14fd60c3c5c98c");
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
assert.equal(candidate.host_plan_receipt_content_address_reverification_required,true);
assert.equal(candidate.caller_supplied_host_plan_sufficient,false);
assert.equal(candidate.live_host_plan_reexecution_required_before_provisioning,true);
assert.deepEqual(candidate.host_plan_receipt_requirements,{
  marker:"VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_HOST_PLAN_V2",
  version:2,
  status:"xiphos_claim_store_preinstall_plan_ready",
  target_host:"Xiphos",
  parent_head:"9475035552881f34658a7c8f3a6b336199fda159",
  parent_contract_blob_sha1:"bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc",
  store_policy_id:"apollyon_claim_store_policy_v2:e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137",
  fixed_names:candidate.fixed_identities,
  fixed_paths:candidate.fixed_paths,
  plan_id_pattern:"^apollyon_claim_store_host_plan_v2:[0-9a-f]{64}$",
  plan_id_content_address_reverification_required:true,
  caller_supplied_host_plan_sufficient:false,
  live_host_plan_reexecution_required_before_provisioning:true,
  machine_id_revalidation_required_before_provisioning:true,
  local_identity_files_revalidation_required_before_provisioning:true,
  trusted_parent_directories_revalidation_required_before_provisioning:true,
  selected_candidate_keys:[
    "claim_service_uid","claim_publisher_uid",
    "claim_service_gid","claim_publisher_gid","claim_ipc_gid",
  ],
  selected_candidate_values_positive_safe_integers_required:true,
  selected_candidate_values_pairwise_distinct_required:true,
  selected_candidate_values_within_system_id_ranges_required:true,
  selected_candidate_values_absent_from_current_local_identity_rows_required:true,
  selected_candidate_values_absent_from_live_process_credentials_required:true,
  live_process_identity_authority_required:true,
  live_process_identity_authority_profile:
    "reviewed_root_host_pid_user_namespace_procfs_v2",
  root_execution_verified_required:true,
  host_pid_namespace_external_lease_required:true,
  host_user_namespace_external_lease_required:true,
  pid1_namespace_matches_self_required:true,
  pid1_user_namespace_matches_self_required:true,
  procfs_hidepid_absent_required:true,
  complete_process_visibility_required:true,
  all_four_uid_slots_consumed_required:true,
  all_four_gid_slots_consumed_required:true,
  supplementary_groups_consumed_required:true,
  initial_and_final_process_census_required:true,
  candidate_slots_clear_in_final_process_census_required:true,
  source_generation_source_head:"30edd98609877c15be44d26b46916cf8c5d1f174",
  source_generation_parent_head:"9475035552881f34658a7c8f3a6b336199fda159",
  source_generation_planner_blob_sha1:"9e2a716e43e4a9815f9e8f2c67c0d3e322f8b64d",
  source_generation_parent_contract_blob_sha1:"bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc",
  source_generation_authenticated_required:true,
  source_generation_isolated_python_startup_proven_required:true,
  reviewed_source_head_external_lease_required:true,
  target_names_absent_required:true,
  target_paths_absent_required:true,
  candidate_slots_selected_in_plan_required:true,
  candidate_slots_globally_distinct_required:true,
  candidate_slots_revalidation_required_before_provisioning:true,
  candidate_slots_live_process_recensus_required_before_provisioning:true,
  candidate_slots_host_user_namespace_recensus_required_before_provisioning:true,
  candidate_slots_provisioning_ready_required:false,
  claim_identity_provisioned_required:false,
  publisher_identity_provisioned_required:false,
  claim_ipc_group_provisioned_required:false,
  claim_root_created_required:false,
  claim_socket_parent_created_required:false,
  claim_service_source_installed_required:false,
  claim_publisher_source_installed_required:false,
  claim_service_unit_installed_required:false,
  claim_service_started_required:false,
  protected_claim_store_proven_required:false,
  durable_attempt_claim_performed_required:false,
  training_execution_performed_required:false,
  next_gate:"apollyon_durable_attempt_claim_store_service_source_candidate_v2",
});
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
  candidate.host_plan_receipt_requirements,
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
  host_plan_receipt_content_address_reverification_required:true,
  caller_supplied_host_plan_sufficient:false,
  live_host_plan_reexecution_required_before_provisioning:true,
  live_process_credential_exclusion_required:true,
  host_pid_namespace_external_lease_required:true,
  host_user_namespace_external_lease_required:true,
  host_root_user_namespace_binding_required:true,
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
  attempt_claim_authorized:false,
  attempt_claimed:false,
  training_execution_authorized:false,
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
  'PARENT_STORE_CONTRACT_HEAD="9475035552881f34658a7c8f3a6b336199fda159"',
  'PARENT_STORE_CONTRACT_BLOB_SHA1="bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc"',
  'PARENT_HOST_PLAN_HEAD="30edd98609877c15be44d26b46916cf8c5d1f174"',
  'PARENT_HOST_PLANNER_BLOB_SHA1="9e2a716e43e4a9815f9e8f2c67c0d3e322f8b64d"',
  'numeric_host_identities:null',
  'host_plan_receipt_required_for_numeric_identity_binding:true',
  'host_plan_receipt_requirements:hostPlanReceiptRequirements',
  'plan_id_content_address_reverification_required:true',
  'caller_supplied_host_plan_sufficient:false',
  'live_host_plan_reexecution_required_before_provisioning:true',
  'live_process_identity_authority_required:true',
  'host_pid_namespace_external_lease_required:true',
  'host_user_namespace_external_lease_required:true',
  'host_root_user_namespace_binding_required:true',
  'source_generation_isolated_python_startup_proven_required:true',
  'candidate_slots_revalidation_required_before_provisioning:true',
  'candidate_slots_live_process_recensus_required_before_provisioning:true',
  'candidate_slots_host_user_namespace_recensus_required_before_provisioning:true',
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
console.log("host_plan_receipt_exact_schema_requirements_bound=true");
console.log("host_plan_receipt_content_address_reverification_required=true");
console.log("caller_supplied_host_plan_sufficient=false");
console.log("live_host_plan_reexecution_required_before_provisioning=true");
console.log("host_plan_source_generation_requirements_bound=true");
console.log("live_process_credential_exclusion_required=true");
console.log("host_pid_namespace_external_lease_required=true");
console.log("host_user_namespace_external_lease_required=true");
console.log("host_root_user_namespace_binding_required=true");
console.log("candidate_slots_revalidation_required_before_provisioning=true");
console.log("candidate_slots_live_process_recensus_required_before_provisioning=true");
console.log("numeric_host_identity_binding_performed=false");
console.log("service_implementation_present=false");
console.log("publisher_implementation_present=false");
console.log("host_installation=false");
console.log("durable_attempt_claim=false");
console.log("training_execution=false");
