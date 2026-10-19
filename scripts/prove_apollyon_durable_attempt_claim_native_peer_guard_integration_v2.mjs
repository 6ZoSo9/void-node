#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {
  qualifyApollyonDurableAttemptClaimRevalidationHandoffV2,
} from "../tools/apollyon-durable-attempt-claim-revalidation-handoff-v2.mjs";
import {
  VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_INTEGRATION_AUTHORITY_V2,
  qualifyApollyonDurableAttemptClaimNativePeerGuardIntegrationV2,
} from "../tools/apollyon-durable-attempt-claim-native-peer-guard-integration-v2.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const NATIVE=path.join(
  ROOT,"ops/xiphos/apollyon_durable_attempt_claim_native_peer_guard_v2.c",
);
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
for(const [relative,expected] of Object.entries({
  "tools/apollyon-durable-attempt-claim-native-peer-guard-integration-v2.mjs":
    "5532d18603ab9b4f400082c6fac265c58672ed85",
  "tools/apollyon-durable-attempt-claim-revalidation-handoff-v2.mjs":
    "3feed7f71fb6941f8feccf393f151fa9e973d7a4",
  "ops/xiphos/apollyon_durable_attempt_claim_native_peer_guard_v2.c":
    "defd863de841a1f1460e10985d1990ba1a382f70",
  "scripts/prove_apollyon_durable_attempt_claim_native_peer_guard_v2.mjs":
    "45421969be31286f295c0daba6c36a4e4698010e",
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs":
    "e27f0ebb968f4611bfc069670325c3f5e6df1c65",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
    "981935515e08634be96446e58922c16be56d33ad",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
    "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
})){
  assert.equal(
    gitBlob(fs.readFileSync(path.join(ROOT,relative))),
    expected,
    relative,
  );
}

const handoff=qualifyApollyonDurableAttemptClaimRevalidationHandoffV2();
const result=qualifyApollyonDurableAttemptClaimNativePeerGuardIntegrationV2();
assert.equal(result.status,"native_peer_guard_integration_source_contract_defined_unimplemented");
assert.equal(result.target_host,"Xiphos");
assert.equal(result.parent_handoff_contract_id,handoff.handoff_contract_id);
assert.equal(result.parent_handoff_blob_sha1,"3feed7f71fb6941f8feccf393f151fa9e973d7a4");
assert.equal(result.native_peer_guard_blob_sha1,"defd863de841a1f1460e10985d1990ba1a382f70");
assert.equal(result.native_peer_guard_proof_blob_sha1,"45421969be31286f295c0daba6c36a4e4698010e");
assert.match(result.integration_contract_id,/^apollyon_claim_peer_integration_v2:[0-9a-f]{64}$/u);

for(const key of [
  "self_test_only_required",
  "real_af_unix_so_peercred_primitive_required",
  "retained_pidfd_live_state_primitive_required",
  "retained_pidfd_exit_state_primitive_required",
  "proc_start_ticks_generation_primitive_required",
  "executable_inode_relation_primitive_required",
  "exec_in_place_inode_drift_detection_primitive_required",
  "exact_64_byte_response_frame_primitive_required",
  "write_half_close_eof_primitive_required",
  "extra_byte_rejection_primitive_required",
  "short_eof_rejection_primitive_required",
  "delayed_extra_rejection_primitive_required",
  "exact_prefix_before_no_eof_timeout_primitive_required",
  "held_open_no_eof_timeout_primitive_required",
  "read_half_ack_after_peer_eof_primitive_required",
  "negative_frame_sender_success_required",
]){
  assert.equal(result.native_candidate_boundary[key],true,key);
}
assert.equal(result.native_candidate_boundary.live_mode_present,false);
assert.equal(result.native_candidate_boundary.cross_uid_host_qualification_performed,false);
assert.equal(result.native_candidate_boundary.interpreted_body_source_identity_proven,false);

for(const key of [
  "same_fixed_claim_socket_required",
  "privileged_revalidator_and_publisher_roles_required",
  "publisher_only_claim_body_role",
  "service_so_peercred_before_body_read_required",
  "publisher_authenticates_service_before_body_send_required",
  "revalidator_and_publisher_pidfds_retained_required",
  "revalidator_and_publisher_start_ticks_bound_required",
  "direct_publisher_ppid_to_revalidator_required",
  "cross_uid_generation_and_source_observation_required",
  "native_executable_inode_identity_required",
  "interpreted_runtime_cmdline_and_script_identity_required",
  "source_identity_rechecked_before_body_read_required",
  "source_identity_rechecked_before_store_mutation_required",
  "source_identity_rechecked_before_success_ack_required",
  "pidfd_liveness_rechecked_before_body_read_required",
  "pidfd_liveness_rechecked_before_store_mutation_required",
  "pidfd_liveness_rechecked_before_success_ack_required",
  "request_bytes_from_private_root_to_publisher_pipe_only_required",
  "publisher_request_reconstruction_forbidden",
  "exact_parent_challenge_layout_required",
  "challenge_content_validation_required",
  "exact_64_byte_response_and_eof_required",
  "response_read_half_open_for_ack_required",
  "provenance_session_exactly_one_publisher_request_required",
  "provenance_session_reuse_forbidden",
  "no_store_mutation_before_fresh_challenge_success_required",
  "parent_local_prepublication_checks_remain_required",
  "provenance_loss_after_possible_mutation_must_not_return_success_required",
]){
  assert.equal(result.integration_requirements[key],true,key);
}
assert.equal(result.integration_requirements.root_control_carries_claim_body,false);
assert.equal(result.integration_requirements.direct_ppid_lineage_native_candidate_proven,false);
assert.equal(result.integration_requirements.cross_uid_generation_and_source_observation_proven,false);
assert.equal(result.integration_requirements.interpreted_runtime_cmdline_and_script_identity_proven,false);

for(const key of [
  "claim_service_source_implementation_required",
  "privileged_revalidator_source_implementation_required",
  "publisher_source_implementation_required",
  "fixed_paths_and_numeric_ids_from_fresh_host_plan_required",
  "native_peer_guard_integration_required",
  "installed_first_entry_and_source_custody_qualification_required",
  "cross_uid_kernel_host_qualification_required",
  "current_handoff_requirements_must_not_be_weakened",
]){
  assert.equal(result.future_implementation_gate[key],true,key);
}
for(const key of [
  "implementation_present",
  "native_peer_guard_runtime_integration_present",
  "host_qualification_performed",
  "cross_uid_host_qualification_performed",
  "kernel_peer_authentication_performed",
  "direct_parent_lineage_proven",
  "interpreted_body_source_identity_proven",
  "claim_store_mutation_performed",
  "durable_attempt_claim_performed",
  "attempt_claim_authorized",
  "attempt_claimed",
  "training_execution_authorized",
  "training_execution_performed",
  "candidate_weight_mutation_performed",
]){
  assert.equal(result[key],false,key);
}
assert.equal(
  result.next_gate,
  "apollyon_durable_attempt_claim_store_service_source_implementation_v2",
);
assert.equal(Object.isFrozen(result),true);
assert.equal(Object.isFrozen(result.integration_requirements),true);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"apollyon-peer-integration-v2-"));
const binary=path.join(temp,"peer-guard-v2");
try{
  const compile=spawnSync(
    "/usr/bin/cc",
    ["-std=c11","-O2","-Wall","-Wextra","-Werror",NATIVE,"-o",binary],
    {cwd:ROOT,encoding:"utf8",timeout:20000,env:{PATH:"/usr/bin:/bin",LC_ALL:"C"}},
  );
  assert.equal(compile.status,0,"compile failed:\n"+String(compile.stderr||""));
  const run=spawnSync(
    binary,["--self-test"],
    {cwd:ROOT,encoding:"utf8",timeout:20000,env:{PATH:"/usr/bin:/bin",LC_ALL:"C"}},
  );
  assert.equal(
    run.status,0,
    "native self-test failed:\nstdout="+String(run.stdout||"")+
      "\nstderr="+String(run.stderr||""),
  );
  for(const line of [
    "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_V2_SELF_TEST_GREEN",
    "so_peercred_proven=true",
    "pidfd_liveness_proven=true",
    "pidfd_exit_state_proven=true",
    "exec_in_place_source_drift_detected=true",
    "response_half_close_eof_proven=true",
    "response_exact_prefix_before_no_eof_timeout_proven=true",
    "response_no_eof_peer_held_open_until_timeout_proven=true",
    "negative_frame_sender_success_required=true",
    "cross_uid_host_qualification_performed=false",
    "claim_store_mutation=false",
    "durable_attempt_claim=false",
    "training_execution=false",
  ]){
    assert.equal(run.stdout.includes(line+"\n"),true,line);
  }
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}

for(const [key,expected] of Object.entries({
  source_only_contract:true,
  exact_parent_handoff_required:true,
  exact_native_peer_guard_source_required:true,
  native_peer_guard_runtime_integration_present:false,
  cross_uid_host_qualification_required:true,
  cross_uid_host_qualification_performed:false,
  direct_parent_lineage_required:true,
  interpreted_body_source_identity_still_required:true,
  service_publisher_revalidator_implementation_present:false,
  host_installation:false,
  filesystem_read:false,
  filesystem_write:false,
  account_mutation:false,
  group_mutation:false,
  systemd_mutation:false,
  service_action:false,
  socket_action:false,
  network_access:false,
  claim_store_mutation:false,
  durable_attempt_claim:false,
  attempt_claim_authorized:false,
  attempt_claimed:false,
  training_execution_authorized:false,
  training_execution:false,
  candidate_weight_mutation:false,
  private_key_access:false,
  signing:false,
  wallet_access:false,
  transaction:false,
  funds_movement:false,
})){
  assert.equal(
    VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_INTEGRATION_AUTHORITY_V2[key],
    expected,key,
  );
}


const workflowSource=fs.readFileSync(
  path.join(ROOT,".github/workflows/apollyon-durable-attempt-claim-native-peer-guard-integration-v2.yml"),
  "utf8",
);
for(const dependency of [
  "tools/apollyon-live-source-session-terminal-receipt-v2.mjs",
  "tools/apollyon-live-custody-service-source-session-binding-v2.mjs",
  "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs",
]){
  assert.equal(
    workflowSource.split(dependency).length-1,
    2,
    "focused workflow PR/push trigger parity missing for "+dependency,
  );
}
assert.equal(workflowSource.includes("pull_request:"),true);
assert.equal(workflowSource.includes("push:"),true);
assert.equal(workflowSource.includes("workflow_dispatch:"),true);
assert.equal(workflowSource.includes("PUSH_BEFORE: ${{ github.event.before }}"),true);

const contractSource=fs.readFileSync(
  path.join(ROOT,"tools/apollyon-durable-attempt-claim-native-peer-guard-integration-v2.mjs"),
  "utf8",
);
for(const forbidden of [
  'from "node:fs"','from "node:net"','from "node:child_process"',
  "writeFile","appendFile","systemctl","spawn(","execFile(","fetch(",
  "claim_store_mutation_performed:true","durable_attempt_claim_performed:true",
  "attempt_claimed:true","training_execution_performed:true",
  "candidate_weight_mutation_performed:true","private_key_access:true",
  "signing:true","transaction:true","funds_movement:true",
]){
  assert.equal(contractSource.includes(forbidden),false,forbidden);
}

console.log("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PEER_GUARD_INTEGRATION_V2_PROOF_GREEN");
console.log("parent_handoff_bound=true");
console.log("native_peer_guard_source_bound=true");
console.log("native_peer_guard_self_test_reexecuted=true");
console.log("cross_uid_host_qualification_performed=false");
console.log("direct_parent_lineage_proven=false");
console.log("interpreted_body_source_identity_proven=false");
console.log("runtime_integration_present=false");
console.log("claim_store_mutation=false");
console.log("durable_attempt_claim=false");
console.log("training_execution=false");
