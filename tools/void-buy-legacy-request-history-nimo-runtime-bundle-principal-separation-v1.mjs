#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_V1 =
  "VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_V1";
export const VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_SCHEMA_V1 =
  "void_buy_legacy_request_history_nimo_runtime_bundle_principal_separation_v1";

export const VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_AUTHORITY_V1 =
  Object.freeze({
    source_contract:true,
    v3_candidate_required:true,
    trusted_supervisor_required:true,
    builder_principal_distinct_required:true,
    builder_no_new_privs_required:true,
    builder_cleared_supplementary_groups_required:true,
    builder_no_sudo_or_login_authority_required:true,
    builder_privilege_regain_forbidden:true,
    builder_preexisting_processes_zero_required:true,
    builder_continuous_uid_exclusivity_required:true,
    builder_retained_generation_required:true,
    postbuild_builder_uid_processes_zero_required:true,
    compiler_input_root_custody_before_builder_start_required:true,
    runtime_output_root_custody_after_builder_terminal_required:true,
    runtime_output_candidate_observation_before_custody:false,
    outer_runner_same_uid_hostile_exclusion_claimed:false,
    supervisor_first_entry_proven:false,
    builder_process_census_provenance_authenticated:false,
    builder_generation_provenance_authenticated:false,
    compiler_input_custody_provenance_authenticated:false,
    runtime_output_custody_provenance_authenticated:false,
    v3_candidate_derivation_authorized:false,
    runtime_bundle_candidate_accepted:false,
    protected_nimo_install:false,
    nimo_contact:false,
    ssh_action:false,
    authorized_keys_mutation:false,
    witness_read:false,
    witness_append:false,
    private_key_access:false,
    sovereign_signing:false,
    payment_acceptance:false,
    transaction:false,
    presale_activation:false,
    wc_void_activation:false,
    funds_movement:false,
  });

const HASH64=/^[0-9a-f]{64}$/u;
const POLICY_ID=/^voidblrhnpspol1_[0-9a-f]{64}$/u;

function fail(code){throw new Error(code);}
function normalize(value){
  if(Array.isArray(value)) return value.map(normalize);
  if(value&&typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort()) out[key]=normalize(value[key]);
    return out;
  }
  return value;
}
function canonical(value){return JSON.stringify(normalize(value));}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function clonePlain(value,code){
  let copy;
  try{copy=structuredClone(value);}catch{fail(code);}
  if(!copy||typeof copy!=="object"||Array.isArray(copy))fail(code);
  const proto=Object.getPrototypeOf(copy);
  if(proto!==Object.prototype&&proto!==null)fail(code);
  return copy;
}
function exactKeys(value,keys,code){
  const copy=clonePlain(value,code);
  const actual=Object.keys(copy).sort();
  const expected=[...keys].sort();
  if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index])){
    fail(code);
  }
  return copy;
}
function safeInt(value,min,max,code){
  if(!Number.isSafeInteger(value)||value<min||value>max)fail(code);
  return value;
}
function requireBool(value,expected,code){if(value!==expected)fail(code);}

export function qualifyVoidBuyLegacyRequestHistoryNimoRuntimeBundlePrincipalSeparationPolicyV1(){
  const material={
    marker:VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_V1,
    schema:VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_SCHEMA_V1,
    version:1,
    status:"source_policy_qualified_not_executed",
    trusted_supervisor_domain:"root_supervisor",
    outer_orchestration_uid_is_trusted_supervisor_domain:true,
    outer_orchestration_uid_hostile_same_uid_exclusion_claimed:false,
    supervisor_source_identity_content_addressed_required:true,
    supervisor_executable_identity_content_addressed_required:true,
    supervisor_first_entry_provenance_required:true,
    arbitrary_root_commands_candidate_authority:false,
    builder_distinct_nonroot_uid_gid_required:true,
    builder_zero_supplementary_groups_required:true,
    builder_no_new_privs_required:true,
    builder_sudo_authority_allowed:false,
    builder_login_session_authority_allowed:false,
    builder_setuid_privilege_regain_allowed:false,
    builder_file_capability_privilege_regain_allowed:false,
    builder_preexisting_uid_process_count_required:0,
    builder_max_observed_concurrent_uid_processes:1,
    builder_exact_pid_start_pidfd_generation_required:true,
    builder_terminal_generation_required_before_output_custody:true,
    builder_postbuild_uid_process_count_required:0,
    compiler_snapshot_root_custody_before_builder_launch_required:true,
    build_input_snapshot_root_custody_before_builder_launch_required:true,
    checkout_compiler_reopen_during_build_allowed:false,
    checkout_input_reopen_during_build_allowed:false,
    runtime_output_builder_writable_only_during_compile:true,
    runtime_output_candidate_observation_while_builder_live_allowed:false,
    runtime_output_root_custody_after_builder_terminal_required:true,
    runtime_output_descendants_nonwritable_after_custody_required:true,
    runtime_output_parent_fsync_after_custody_required:true,
    runtime_output_generation_revalidation_after_custody_required:true,
    candidate_observation_after_output_custody_required:true,
    three_node_byte_equality_required:true,
  };
  return Object.freeze({
    ...material,
    principal_separation_policy_id:"voidblrhnpspol1_"+
      sha256(Buffer.from(canonical(material),"utf8")),
    authority:
      VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_AUTHORITY_V1,
  });
}

const SUPERVISOR_KEYS=Object.freeze([
  "arbitrary_root_commands_candidate_authority",
  "executable_identity_sha256",
  "first_entry_provenance_required",
  "outer_orchestration_uid_hostile_same_uid_exclusion_claimed",
  "source_identity_sha256",
  "trusted_domain",
  "uid",
]);
const GENERATION_KEYS=Object.freeze([
  "pid",
  "pidfd_retained",
  "process_start_time_ticks",
  "source_identity_sha256",
]);
const BUILDER_KEYS=Object.freeze([
  "admitted_uid_process_count",
  "continuous_uid_exclusivity_required",
  "file_capability_privilege_regain_allowed",
  "gid",
  "generation",
  "login_session_authority",
  "max_observed_concurrent_uid_processes",
  "no_new_privs",
  "postbuild_uid_process_count",
  "preexisting_uid_process_count",
  "setuid_privilege_regain_allowed",
  "sudo_authority",
  "supplementary_gids",
  "uid",
]);
const CUSTODY_KEYS=Object.freeze([
  "build_input_snapshot_builder_writable",
  "build_input_snapshot_root_custodied_before_builder_start",
  "candidate_observation_while_builder_live",
  "checkout_compiler_reopened_during_build",
  "checkout_input_reopened_during_build",
  "compiler_snapshot_builder_writable",
  "compiler_snapshot_root_custodied_before_builder_start",
  "output_descendants_nonwritable_after_custody",
  "output_generation_revalidated_after_custody",
  "output_parent_fsync_after_custody",
  "output_root_custodied_after_builder_terminal",
  "runtime_output_builder_writable_during_compile",
]);
const TIMELINE_KEYS=Object.freeze([
  "builder_launch",
  "candidate_observation",
  "compiler_exit",
  "input_custody_complete",
  "output_custody_complete",
  "output_fsync_complete",
  "postbuild_uid_census_zero",
  "terminal_generation_confirmed",
]);

export function classifyVoidBuyLegacyRequestHistoryNimoRuntimeBundlePrincipalSeparationShapeV1(input){
  const snapshot=exactKeys(
    input,
    ["builder","custody","policy_id","supervisor","timeline"],
    "nimo_bundle_principal_separation_shape_invalid",
  );
  const policy=
    qualifyVoidBuyLegacyRequestHistoryNimoRuntimeBundlePrincipalSeparationPolicyV1();
  if(!POLICY_ID.test(snapshot.policy_id)||snapshot.policy_id!==policy.principal_separation_policy_id){
    fail("nimo_bundle_principal_separation_policy_id_invalid");
  }

  const supervisor=exactKeys(
    snapshot.supervisor,SUPERVISOR_KEYS,
    "nimo_bundle_principal_separation_supervisor_shape_invalid",
  );
  if(
    supervisor.trusted_domain!=="root_supervisor"||
    supervisor.uid!==0||
    !HASH64.test(supervisor.source_identity_sha256)||
    !HASH64.test(supervisor.executable_identity_sha256)||
    supervisor.first_entry_provenance_required!==true||
    supervisor.outer_orchestration_uid_hostile_same_uid_exclusion_claimed!==false||
    supervisor.arbitrary_root_commands_candidate_authority!==false
  ){
    fail("nimo_bundle_principal_separation_supervisor_invalid");
  }

  const builder=exactKeys(
    snapshot.builder,BUILDER_KEYS,
    "nimo_bundle_principal_separation_builder_shape_invalid",
  );
  safeInt(builder.uid,1,65533,"nimo_bundle_principal_separation_builder_uid_invalid");
  safeInt(builder.gid,1,65533,"nimo_bundle_principal_separation_builder_gid_invalid");
  if(
    !Array.isArray(builder.supplementary_gids)||
    builder.supplementary_gids.length!==0||
    builder.no_new_privs!==true||
    builder.sudo_authority!==false||
    builder.login_session_authority!==false||
    builder.setuid_privilege_regain_allowed!==false||
    builder.file_capability_privilege_regain_allowed!==false||
    builder.preexisting_uid_process_count!==0||
    builder.admitted_uid_process_count!==1||
    builder.max_observed_concurrent_uid_processes!==1||
    builder.continuous_uid_exclusivity_required!==true||
    builder.postbuild_uid_process_count!==0
  ){
    fail("nimo_bundle_principal_separation_builder_invalid");
  }
  const generation=exactKeys(
    builder.generation,GENERATION_KEYS,
    "nimo_bundle_principal_separation_generation_shape_invalid",
  );
  safeInt(generation.pid,2,0x7fffffff,"nimo_bundle_principal_separation_generation_pid_invalid");
  if(
    typeof generation.process_start_time_ticks!=="string"||
    !/^[1-9][0-9]*$/u.test(generation.process_start_time_ticks)||
    generation.pidfd_retained!==true||
    !HASH64.test(generation.source_identity_sha256)
  ){
    fail("nimo_bundle_principal_separation_generation_invalid");
  }

  const custody=exactKeys(
    snapshot.custody,CUSTODY_KEYS,
    "nimo_bundle_principal_separation_custody_shape_invalid",
  );
  for(const [key,expected] of Object.entries({
    compiler_snapshot_root_custodied_before_builder_start:true,
    build_input_snapshot_root_custodied_before_builder_start:true,
    compiler_snapshot_builder_writable:false,
    build_input_snapshot_builder_writable:false,
    checkout_compiler_reopened_during_build:false,
    checkout_input_reopened_during_build:false,
    runtime_output_builder_writable_during_compile:true,
    candidate_observation_while_builder_live:false,
    output_root_custodied_after_builder_terminal:true,
    output_descendants_nonwritable_after_custody:true,
    output_parent_fsync_after_custody:true,
    output_generation_revalidated_after_custody:true,
  })){
    requireBool(custody[key],expected,"nimo_bundle_principal_separation_custody_invalid");
  }

  const timeline=exactKeys(
    snapshot.timeline,TIMELINE_KEYS,
    "nimo_bundle_principal_separation_timeline_shape_invalid",
  );
  const ordered=[
    "input_custody_complete",
    "builder_launch",
    "compiler_exit",
    "terminal_generation_confirmed",
    "postbuild_uid_census_zero",
    "output_custody_complete",
    "output_fsync_complete",
    "candidate_observation",
  ];
  let previous=0;
  for(const key of ordered){
    const value=safeInt(
      timeline[key],1,Number.MAX_SAFE_INTEGER,
      "nimo_bundle_principal_separation_timeline_invalid",
    );
    if(value<=previous)fail("nimo_bundle_principal_separation_timeline_invalid");
    previous=value;
  }

  const acceptedShape={
    policy_id:snapshot.policy_id,
    supervisor,
    builder,
    custody,
    timeline,
  };
  return Object.freeze({
    marker:VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_V1,
    version:1,
    status:"PRINCIPAL_SEPARATION_SHAPE_QUALIFIED_NOT_AUTHENTICATED",
    principal_separation_shape_id:"voidblrhnpsshape1_"+
      sha256(Buffer.from(canonical(acceptedShape),"utf8")),
    trusted_supervisor_required:true,
    builder_principal_distinct:true,
    builder_no_new_privs:true,
    builder_uid_process_exclusivity_shape_qualified:true,
    compiler_input_root_custody_order_shape_qualified:true,
    runtime_output_terminal_handoff_shape_qualified:true,
    outer_runner_same_uid_hostile_exclusion_claimed:false,
    supervisor_first_entry_provenance_authenticated:false,
    builder_process_census_provenance_authenticated:false,
    builder_generation_provenance_authenticated:false,
    compiler_input_custody_provenance_authenticated:false,
    runtime_output_custody_provenance_authenticated:false,
    v3_candidate_derivation_authorized:false,
    runtime_bundle_candidate_accepted:false,
    protected_nimo_install:false,
    nimo_contact:false,
    ssh_action:false,
    witness_read:false,
    witness_append:false,
    private_key_access:false,
    sovereign_signing:false,
    payment_acceptance:false,
    transaction:false,
    presale_activation:false,
    wc_void_activation:false,
    funds_movement:false,
    authority:
      VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_AUTHORITY_V1,
  });
}
