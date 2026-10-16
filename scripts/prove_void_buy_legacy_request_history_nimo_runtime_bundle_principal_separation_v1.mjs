#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_AUTHORITY_V1,
  classifyVoidBuyLegacyRequestHistoryNimoRuntimeBundlePrincipalSeparationShapeV1,
  qualifyVoidBuyLegacyRequestHistoryNimoRuntimeBundlePrincipalSeparationPolicyV1,
} from "../tools/void-buy-legacy-request-history-nimo-runtime-bundle-principal-separation-v1.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","ascii"))
    .update(bytes).digest("hex");
}
assert.equal(
  gitBlob(fs.readFileSync(path.join(
    ROOT,
    "tools/void-buy-legacy-request-history-nimo-runtime-bundle-principal-separation-v1.mjs",
  ))),
  "4e653db85a92a46d6357fb2b42588c09d2113bae",
);

const policy=
  qualifyVoidBuyLegacyRequestHistoryNimoRuntimeBundlePrincipalSeparationPolicyV1();
assert.equal(policy.status,"source_policy_qualified_not_executed");
assert.match(policy.principal_separation_policy_id,/^voidblrhnpspol1_[0-9a-f]{64}$/u);
assert.equal(policy.trusted_supervisor_domain,"root_supervisor");
assert.equal(policy.outer_orchestration_uid_is_trusted_supervisor_domain,true);
assert.equal(policy.outer_orchestration_uid_hostile_same_uid_exclusion_claimed,false);
assert.equal(policy.arbitrary_root_commands_candidate_authority,false);
assert.equal(policy.builder_preexisting_uid_process_count_required,0);
assert.equal(policy.builder_max_observed_concurrent_uid_processes,1);
assert.equal(policy.builder_postbuild_uid_process_count_required,0);
assert.equal(policy.runtime_output_candidate_observation_while_builder_live_allowed,false);
assert.equal(policy.runtime_output_generation_revalidation_before_candidate_observation_required,true);

function fixture(){
  return {
    policy_id:policy.principal_separation_policy_id,
    supervisor:{
      trusted_domain:"root_supervisor",
      uid:0,
      source_identity_sha256:"1".repeat(64),
      executable_identity_sha256:"2".repeat(64),
      first_entry_provenance_required:true,
      outer_orchestration_uid_hostile_same_uid_exclusion_claimed:false,
      arbitrary_root_commands_candidate_authority:false,
    },
    builder:{
      uid:991,
      gid:991,
      supplementary_gids:[],
      no_new_privs:true,
      sudo_authority:false,
      login_session_authority:false,
      setuid_privilege_regain_allowed:false,
      file_capability_privilege_regain_allowed:false,
      preexisting_uid_process_count:0,
      admitted_uid_process_count:1,
      max_observed_concurrent_uid_processes:1,
      continuous_uid_exclusivity_required:true,
      postbuild_uid_process_count:0,
      generation:{
        pid:4242,
        process_start_time_ticks:"123456",
        pidfd_retained:true,
        source_identity_sha256:"3".repeat(64),
      },
    },
    custody:{
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
    },
    timeline:{
      input_custody_complete:10,
      builder_launch:20,
      compiler_exit:30,
      terminal_generation_confirmed:40,
      postbuild_uid_census_zero:50,
      output_custody_complete:60,
      output_fsync_complete:70,
      output_generation_revalidation_complete:75,
      candidate_observation:80,
    },
  };
}

const good=fixture();
const accepted=
  classifyVoidBuyLegacyRequestHistoryNimoRuntimeBundlePrincipalSeparationShapeV1(good);
assert.equal(accepted.status,"PRINCIPAL_SEPARATION_SHAPE_QUALIFIED_NOT_AUTHENTICATED");
assert.match(accepted.principal_separation_shape_id,/^voidblrhnpsshape1_[0-9a-f]{64}$/u);
assert.equal(accepted.trusted_supervisor_required,true);
assert.equal(accepted.builder_principal_distinct,true);
assert.equal(accepted.builder_no_new_privs,true);
assert.equal(accepted.builder_uid_process_exclusivity_shape_qualified,true);
assert.equal(accepted.compiler_input_root_custody_order_shape_qualified,true);
assert.equal(accepted.runtime_output_terminal_handoff_shape_qualified,true);
assert.equal(accepted.runtime_output_generation_revalidation_order_shape_qualified,true);
assert.equal(accepted.outer_runner_same_uid_hostile_exclusion_claimed,false);
assert.equal(accepted.supervisor_first_entry_provenance_authenticated,false);
assert.equal(accepted.builder_process_census_provenance_authenticated,false);
assert.equal(accepted.builder_generation_provenance_authenticated,false);
assert.equal(accepted.compiler_input_custody_provenance_authenticated,false);
assert.equal(accepted.runtime_output_custody_provenance_authenticated,false);
assert.equal(accepted.v3_candidate_derivation_authorized,false);
assert.equal(accepted.runtime_bundle_candidate_accepted,false);
assert.equal(accepted.nimo_contact,false);
assert.equal(accepted.ssh_action,false);
assert.equal(accepted.payment_acceptance,false);
assert.equal(accepted.transaction,false);
assert.equal(accepted.presale_activation,false);
assert.equal(accepted.wc_void_activation,false);
assert.equal(accepted.funds_movement,false);

function expectHold(mutator,pattern){
  const value=fixture();
  mutator(value);
  assert.throws(
    ()=>classifyVoidBuyLegacyRequestHistoryNimoRuntimeBundlePrincipalSeparationShapeV1(value),
    pattern,
  );
}

expectHold(x=>{x.policy_id="voidblrhnpspol1_"+"0".repeat(64);},/policy_id_invalid/u);
expectHold(x=>{x.supervisor.uid=1000;},/supervisor_invalid/u);
expectHold(
  x=>{x.supervisor.outer_orchestration_uid_hostile_same_uid_exclusion_claimed=true;},
  /supervisor_invalid/u,
);
expectHold(
  x=>{x.supervisor.arbitrary_root_commands_candidate_authority=true;},
  /supervisor_invalid/u,
);
expectHold(x=>{x.builder.uid=0;},/builder_uid_invalid/u);
expectHold(x=>{x.builder.gid=0;},/builder_gid_invalid/u);
expectHold(x=>{x.builder.supplementary_gids=[123];},/builder_invalid/u);
expectHold(x=>{x.builder.no_new_privs=false;},/builder_invalid/u);
expectHold(x=>{x.builder.sudo_authority=true;},/builder_invalid/u);
expectHold(x=>{x.builder.login_session_authority=true;},/builder_invalid/u);
expectHold(x=>{x.builder.setuid_privilege_regain_allowed=true;},/builder_invalid/u);
expectHold(x=>{x.builder.file_capability_privilege_regain_allowed=true;},/builder_invalid/u);
expectHold(x=>{x.builder.preexisting_uid_process_count=1;},/builder_invalid/u);
expectHold(x=>{x.builder.admitted_uid_process_count=2;},/builder_invalid/u);
expectHold(x=>{x.builder.max_observed_concurrent_uid_processes=2;},/builder_invalid/u);
expectHold(x=>{x.builder.continuous_uid_exclusivity_required=false;},/builder_invalid/u);
expectHold(x=>{x.builder.postbuild_uid_process_count=1;},/builder_invalid/u);
expectHold(x=>{x.builder.generation.pidfd_retained=false;},/generation_invalid/u);
expectHold(x=>{x.builder.generation.process_start_time_ticks="0";},/generation_invalid/u);
expectHold(
  x=>{x.custody.compiler_snapshot_root_custodied_before_builder_start=false;},
  /custody_invalid/u,
);
expectHold(
  x=>{x.custody.build_input_snapshot_root_custodied_before_builder_start=false;},
  /custody_invalid/u,
);
expectHold(x=>{x.custody.compiler_snapshot_builder_writable=true;},/custody_invalid/u);
expectHold(x=>{x.custody.build_input_snapshot_builder_writable=true;},/custody_invalid/u);
expectHold(x=>{x.custody.checkout_compiler_reopened_during_build=true;},/custody_invalid/u);
expectHold(x=>{x.custody.checkout_input_reopened_during_build=true;},/custody_invalid/u);
expectHold(x=>{x.custody.runtime_output_builder_writable_during_compile=false;},/custody_invalid/u);
expectHold(x=>{x.custody.candidate_observation_while_builder_live=true;},/custody_invalid/u);
expectHold(x=>{x.custody.output_root_custodied_after_builder_terminal=false;},/custody_invalid/u);
expectHold(x=>{x.custody.output_descendants_nonwritable_after_custody=false;},/custody_invalid/u);
expectHold(x=>{x.custody.output_parent_fsync_after_custody=false;},/custody_invalid/u);
expectHold(x=>{x.custody.output_generation_revalidated_after_custody=false;},/custody_invalid/u);
expectHold(x=>{x.timeline.builder_launch=5;},/timeline_invalid/u);
expectHold(x=>{x.timeline.terminal_generation_confirmed=25;},/timeline_invalid/u);
expectHold(x=>{x.timeline.postbuild_uid_census_zero=35;},/timeline_invalid/u);
expectHold(x=>{x.timeline.output_custody_complete=45;},/timeline_invalid/u);
expectHold(x=>{x.timeline.output_generation_revalidation_complete=65;},/timeline_invalid/u);
expectHold(x=>{x.timeline.output_generation_revalidation_complete=90;},/timeline_invalid/u);
expectHold(x=>{x.timeline.candidate_observation=55;},/timeline_invalid/u);

{
  const withExtra=fixture();
  withExtra.builder.extra=true;
  assert.throws(
    ()=>classifyVoidBuyLegacyRequestHistoryNimoRuntimeBundlePrincipalSeparationShapeV1(withExtra),
    /builder_shape_invalid/u,
  );
}
assert.throws(
  ()=>classifyVoidBuyLegacyRequestHistoryNimoRuntimeBundlePrincipalSeparationShapeV1(new Proxy({},{})),
  /shape_invalid/u,
);

for(const [key,expected] of Object.entries({
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
  runtime_output_generation_revalidation_before_candidate_observation_required:true,
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
})){
  assert.equal(
    VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    ROOT,
    "tools/void-buy-legacy-request-history-nimo-runtime-bundle-principal-separation-v1.mjs",
  ),
  "utf8",
);
for(const required of [
  "outer_runner_same_uid_hostile_exclusion_claimed:false",
  "supervisor_first_entry_provenance_authenticated:false",
  "builder_process_census_provenance_authenticated:false",
  "runtime_output_custody_provenance_authenticated:false",
  "runtime_output_generation_revalidation_before_candidate_observation_required:true",
  "v3_candidate_derivation_authorized:false",
  "runtime_bundle_candidate_accepted:false",
]) assert.equal(source.includes(required),true,required);
for(const forbidden of [
  'from "node:fs"',
  'from "node:child_process"',
  'from "node:net"',
  "spawnSync(",
  "execFileSync(",
  "writeFileSync(",
  "appendFileSync(",
  "fetch(",
]) assert.equal(source.includes(forbidden),false,forbidden);

console.log("VOID_BUY_LEGACY_REQUEST_HISTORY_NIMO_RUNTIME_BUNDLE_PRINCIPAL_SEPARATION_V1_GREEN");
console.log("trusted_supervisor_required=true");
console.log("outer_orchestration_uid_is_trusted_domain=true");
console.log("outer_runner_same_uid_hostile_exclusion_claimed=false");
console.log("builder_principal_distinct_required=true");
console.log("builder_no_new_privs_required=true");
console.log("builder_supplementary_groups_empty_required=true");
console.log("builder_sudo_or_login_authority=false");
console.log("builder_privilege_regain_forbidden=true");
console.log("builder_preexisting_processes_zero_required=true");
console.log("builder_continuous_uid_exclusivity_required=true");
console.log("postbuild_builder_uid_processes_zero_required=true");
console.log("compiler_input_custody_before_builder_start_required=true");
console.log("runtime_output_candidate_observation_while_builder_live=false");
console.log("runtime_output_custody_after_builder_terminal_required=true");
console.log("output_generation_revalidation_before_candidate_observation=true");
console.log("candidate_observation_after_custody_required=true");
console.log("supervisor_first_entry_proven=false");
console.log("builder_process_census_provenance_authenticated=false");
console.log("v3_candidate_derivation_authorized=false");
console.log("runtime_bundle_candidate_accepted=false");
console.log("nimo_contact=false");
console.log("funds_movement=false");
