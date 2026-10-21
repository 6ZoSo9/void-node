import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const BASE_HEAD="7197eb96ff3ce2d3f630545a85c150b694d20b3b";
const BASE_TREE="ed7c516dc7d49895a2af576add999c3a5dde945b";
const PLAN_PATH="ops/security/buy-void-verified-payment-cross-uid-session-envelope-plan-v1.json";
const EXPECTED_PLAN_BLOB="336aa696f4ff08341be649d7b5e087367c7c629e";
const OWNED=[".github/workflows/buy-void-verified-payment-cross-uid-session-envelope-plan-v1.yml","docs/architecture/buy-void-verified-payment-cross-uid-session-envelope-plan-v1.md","ops/security/buy-void-verified-payment-cross-uid-session-envelope-plan-v1.json","scripts/prove_buy_void_verified_payment_cross_uid_session_envelope_plan_v1.mjs"];
const EXPECTED_PLAN_ID="voidbuyxuid1_f5aedeb3290db0ce83cad747e97d6fc27b6c3d422263525a2f23df79f126004e";

function git(args){
  return execFileSync("/usr/bin/git",args,{encoding:"utf8",env:{
    PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
    GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null"
  }}).trim();
}
function gitBlob(bytes){return crypto.createHash("sha1").update(Buffer.from("blob "+String(bytes.length)+"\0","utf8")).update(bytes).digest("hex");}
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==="object"){const out=Object.create(null);for(const key of Object.keys(v).sort())out[key]=stable(v[key]);return out;}return v;}
const stableCompact=v=>JSON.stringify(stable(v));
const stablePretty=v=>JSON.stringify(stable(v),null,2)+"\n";

assert.equal(git(["rev-parse",BASE_HEAD+"^{tree}"]),BASE_TREE,"source_base_tree_mismatch");
assert.equal(git(["merge-base",BASE_HEAD,"HEAD"]),BASE_HEAD,"source_base_not_ancestor");
const diff=git(["diff","--name-status",BASE_HEAD,"HEAD"]).split("\n").filter(Boolean).sort();
assert.deepEqual(diff,OWNED.map(path=>"A\t"+path).sort(),"source_scope_not_exact_four_additions");

const planBytes=fs.readFileSync(PLAN_PATH);
assert.equal(gitBlob(planBytes),EXPECTED_PLAN_BLOB,"plan_blob_drift");
const plan=JSON.parse(planBytes.toString("utf8"));
assert.equal(planBytes.toString("utf8"),stablePretty(plan),"plan_not_canonical_pretty_json");
assert.equal(plan.schema,"void.buy.verified_payment.cross_uid_session_envelope_plan.v1");
assert.equal(plan.version,1);
assert.equal(plan.repository,"6ZoSo9/void-node");
assert.equal(plan.source_base_head,BASE_HEAD);
assert.equal(plan.source_base_tree,BASE_TREE);
assert.equal(plan.source_binding_count,11);
assert.equal(Object.keys(plan.source_bindings).length,11);
assert.equal(plan.plan_id,EXPECTED_PLAN_ID);

const noId={...plan}; delete noId.plan_id;
assert.equal("voidbuyxuid1_"+crypto.createHash("sha256").update(stableCompact(noId)).digest("hex"),EXPECTED_PLAN_ID,"plan_id_rederive_mismatch");
for(const [path,expected] of Object.entries(plan.source_bindings))assert.equal(gitBlob(fs.readFileSync(path)),expected,"source_binding_drift:"+path);
const claimEvidence=plan.capacity_lock_claim_reader_source_evidence;
assert.equal(claimEvidence.source_head,BASE_HEAD);
assert.equal(claimEvidence.source_git_blob_sha1,"94f0a0dd8997e1e2c0fab54044f19d70d983d441");
assert.equal(claimEvidence.proof_git_blob_sha1,"4c70b8f9f30eee30395a0f13b028de2007c28249");
assert.equal(claimEvidence.workflow_git_blob_sha1,"cbb5e1cecf613b8bbc7e3b3aafd8ee1e31e582a9");
assert.equal(claimEvidence.focused_workflow_run,39618226898);
assert.equal(claimEvidence.node22_node24_node26_and_cross_node_success,true);
assert.equal(claimEvidence.independent_review_complete,false);
assert.equal(gitBlob(fs.readFileSync(claimEvidence.proof_path)),claimEvidence.proof_git_blob_sha1,"claim_reader_proof_blob_drift");
assert.equal(gitBlob(fs.readFileSync(claimEvidence.workflow_path)),claimEvidence.workflow_git_blob_sha1,"claim_reader_workflow_blob_drift");

const phases=Object.keys(plan.phase_model).sort();
assert.deepEqual(phases,["allocation_durable","allocation_publication_uncertain","claim_acquired","payment_append_uncertain","payment_durable_allocation_missing","pre_mutation_rejected","terminal_revalidated","uncertain"]);
for(const phase of phases)assert.equal(plan.phase_model[phase].retain_claim,true,"claim_not_retained:"+phase);
assert.deepEqual(Object.keys(plan.phase_transition_policy.allowed).sort(),phases);
assert.deepEqual(plan.phase_transition_policy.allowed.terminal_revalidated,[]);
assert.equal(plan.phase_transition_policy.phase_seq_rule,"exact_increment_by_one");
assert.equal(plan.phase_transition_policy.previous_envelope_sha256_required_after_phase0,true);
assert.equal(plan.phase_transition_policy.recovery_from_uncertain_requires_protected_witness,true);
assert.equal(plan.phase_transition_policy.uncertain_to_pre_mutation_rejected_requires_zero_effect_witness,true);
assert.equal(plan.phase_transition_policy.generic_protected_witness_sufficient_for_zero_effect,false);
assert.equal(plan.phase_transition_policy.zero_effect_witness_verification_precedes_pre_mutation_classification,true);
assert.equal(plan.phase_transition_policy.pre_mutation_zero_effect_witness_contract_verification_required,true);
assert.equal(plan.phase_transition_policy.terminal_phase,"terminal_revalidated");
for(const [from,tos] of Object.entries(plan.phase_transition_policy.allowed)){
  for(const to of tos)assert.ok(phases.includes(to),"unknown_phase_transition:"+from+":"+to);
  assert.equal(new Set(tos).size,tos.length,"duplicate_phase_transition:"+from);
}

assert.deepEqual(plan.session_envelope_contract.claim_binding_fields,[
  "claim_nonce","claim_staging_name","claim_owner_role","claim_owner_uid",
  "claim_pid","claim_process_start_ticks","claim_created_at_utc",
  "web_uid","custody_uid","shared_gid"
]);
assert.equal(plan.session_envelope_contract.trusted_clock_release_authority,false);
assert.equal(plan.session_envelope_contract.claim_created_at_utc_release_authority,false);
assert.ok(plan.session_envelope_contract.phase_fields.includes("pre_mutation_zero_effect_witness_sha256"));
assert.equal(plan.authority.pre_mutation_zero_effect_witness_implemented,false);
const zeroEffect=plan.session_envelope_contract.pre_mutation_zero_effect_witness_contract;
assert.equal(zeroEffect.generic_protected_phase_witness_sufficient,false);
assert.equal(zeroEffect.release_authority,false);
assert.equal(zeroEffect.required_for_transition,"uncertain_to_pre_mutation_rejected");
assert.equal(zeroEffect.verification_result_must_be,true);
assert.deepEqual(zeroEffect.required_zero_effect_claims,[
  "no_payment_append_effect",
  "no_allocation_publication_effect",
  "no_sidecar_effect",
  "no_pending_intent_effect",
  "no_earlier_target_capacity_write_effect",
]);
for(const binding of [
  "original_claim_incarnation",
  "request_id",
  "payment_verified_event_sha256",
  "request_ledger_identity_and_tip",
  "operator_payment_ledger_identity_and_tip",
  "allocation_ledger_identity_and_tip",
  "allocation_high_water_generation",
  "sidecar_and_pending_intent_state",
  "reviewed_rollback_exclusion_domain",
  "reviewed_time_domain",
]) assert.ok(zeroEffect.required_bindings.includes(binding),"zero_effect_binding_missing:"+binding);

function uncertainToPreMutationRejectedClassifiable(envelope){
  if(!plan.phase_transition_policy.allowed.uncertain.includes("pre_mutation_rejected"))return false;
  if(!plan.phase_transition_policy.recovery_from_uncertain_requires_protected_witness)return false;
  if(!envelope?.protected_phase_witness_sha256)return false;
  if(plan.phase_transition_policy.uncertain_to_pre_mutation_rejected_requires_zero_effect_witness){
    if(!envelope?.pre_mutation_zero_effect_witness_sha256)return false;
    if(plan.phase_transition_policy.generic_protected_witness_sufficient_for_zero_effect)return false;
    if(plan.phase_transition_policy.pre_mutation_zero_effect_witness_contract_verification_required &&
       envelope?.pre_mutation_zero_effect_witness_verified!==true)return false;
  }
  return true;
}
assert.equal(uncertainToPreMutationRejectedClassifiable({
  protected_phase_witness_sha256:"sha256:"+"1".repeat(64),
}),false,"generic_protected_witness_must_not_classify_uncertain_as_pre_mutation_rejected");
assert.equal(uncertainToPreMutationRejectedClassifiable({
  protected_phase_witness_sha256:"sha256:"+"1".repeat(64),
  pre_mutation_zero_effect_witness_sha256:"sha256:"+"2".repeat(64),
}),false,"zero_effect_witness_hash_without_contract_verification_must_hold");
assert.equal(uncertainToPreMutationRejectedClassifiable({
  protected_phase_witness_sha256:"sha256:"+"1".repeat(64),
  pre_mutation_zero_effect_witness_sha256:"sha256:"+"2".repeat(64),
  pre_mutation_zero_effect_witness_verified:true,
}),true,"verified_zero_effect_witness_must_be_separately_present");

assert.deepEqual(Object.keys(plan.current_outcome_policy).sort(),["allocation_present","held","observed_no_target_capacity_effect","verified_allocation_missing"]);
assert.equal(plan.current_outcome_policy.held,"retain");
assert.equal(plan.current_outcome_policy.verified_allocation_missing,"retain_and_require_exclusive_recovery");

const a=plan.authority;
assert.equal(a.source_plan_only,true);
for(const key of ["capacity_lock_claim_read_nonblocking_verified","capacity_lock_claim_read_nonblocking_independent_review_complete","common_host_session_envelope_implemented","complete_runtime_source_closure","cross_uid_lock_release_authorized","custody_recovery_authorized","deployed_artifact_generation_verified","external_high_water_witness_verified","funds_movement","operator_route_mounted","payment_acceptance","presale_activation","protected_phase_witness_implemented","public_http_handler_installed","runtime_integration","transaction_broadcast","trusted_clock_bound","web_private_root_write_authority"])assert.equal(a[key],false,key+"_must_remain_false");
assert.equal(a.capacity_lock_claim_read_nonblocking_source_evidence_verified,true);
assert.ok(plan.known_holds.includes("cross_uid_capacity_claim_fifo_nonblocking_independent_review_pending"));
assert.equal(plan.known_holds.includes("cross_uid_capacity_claim_fifo_nonblocking_not_verified"),false);

const lockSource=fs.readFileSync("src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs","utf8");
const readFn=lockSource.slice(lockSource.indexOf("function fileReadFlags()"),lockSource.indexOf("function fileCreateFlags()"));
assert.match(readFn,/O_RDONLY[\s\S]*O_NOFOLLOW/u);
assert.match(readFn,/O_NONBLOCK/u,"capacity_lock_nonblocking_source_evidence_missing");
const claimFn=lockSource.slice(lockSource.indexOf("function makeClaim("),lockSource.indexOf("function encodeClaim("));
for(const token of ["record.pid = process.pid","record.process_start_ticks = currentProcessStartTicks()","record.nonce = nonce","record.staging_name = stagingName","record.created_at_utc = new Date().toISOString()"])assert.ok(claimFn.includes(token),"claim_incarnation_binding_missing:"+token);

const service=fs.readFileSync("tools/void-buy-allocation-custody-service-v2.mjs","utf8");
assert.match(service,/reserve_method_enabled:\s*false/u);
assert.match(service,/web_payment_writer_cross_uid_lock_participation_verified:\s*false/u);
const failureBinding=fs.readFileSync("src/economic/buy_void_web_payment_cross_uid_failure_binding_v1.mjs","utf8");
assert.match(failureBinding,/cross_uid_lock_release_authorized:\s*false/u);
assert.match(failureBinding,/custody_recovery_authorized:\s*false/u);
const dispatcher=fs.readFileSync("src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts","utf8");
assert.match(dispatcher,/mounted_operator_route_verified:\s*false/u);
assert.match(dispatcher,/direct_web_process_private_root_write_authority:\s*false/u);

console.log("VOID_BUY_VOID_VERIFIED_PAYMENT_CROSS_UID_SESSION_ENVELOPE_PLAN_V1_GREEN");
console.log("plan_id="+plan.plan_id);
console.log("source_binding_count="+String(plan.source_binding_count));
console.log("phase_count="+String(phases.length));
console.log("phase_transition_graph_closed=true");
console.log("claim_process_incarnation_bound=true");
console.log("claim_created_at_release_authority=false");
console.log("all_current_outcomes_retain_claim=true");
console.log("capacity_lock_claim_read_nonblocking_source_evidence_verified=true");
console.log("capacity_lock_claim_read_nonblocking_independent_review_complete=false");
console.log("capacity_lock_claim_read_nonblocking_verified=false");
console.log("operator_route_mounted=false");
console.log("protected_phase_witness_implemented=false");
console.log("pre_mutation_zero_effect_witness_implemented=false");
console.log("uncertain_to_pre_mutation_rejected_requires_zero_effect_witness=true");
console.log("generic_protected_witness_sufficient_for_zero_effect=false");
console.log("generic_witness_cannot_classify_uncertain_as_pre_mutation_rejected=true");
console.log("zero_effect_witness_hash_without_contract_verification_holds=true");
console.log("cross_uid_lock_release_authorized=false");
console.log("custody_recovery_authorized=false");
console.log("payment_acceptance=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
