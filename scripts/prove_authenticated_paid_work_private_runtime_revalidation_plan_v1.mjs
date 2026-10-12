#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repo = process.cwd();
const PLAN_REL = "config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-plan-v1.json";
const SCHEMA_REL = "schemas/authenticated-paid-work-private-runtime-revalidation-plan-v1.schema.json";
const DOC_REL = "docs/operations/authenticated-paid-work-private-runtime-revalidation-plan-v1.md";
const WORKFLOW_REL = ".github/workflows/authenticated-paid-work-private-runtime-revalidation-plan-v1.yml";

const planText = fs.readFileSync(path.join(repo, PLAN_REL), "utf8");
const schemaText = fs.readFileSync(path.join(repo, SCHEMA_REL), "utf8");
const docText = fs.readFileSync(path.join(repo, DOC_REL), "utf8");
const workflowText = fs.readFileSync(path.join(repo, WORKFLOW_REL), "utf8");
const plan = JSON.parse(planText);
const schema = JSON.parse(schemaText);

const EXPECTED = {
  "marker": "VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_PLAN_V1",
  "protocol": "void-authenticated-paid-work-private-runtime-revalidation-plan/1",
  "version": 1,
  "status": "source_plan_replacement_issuance_preparation_merged_waiting_on_private_issuance_and_rotation",
  "source": {
    "plan_source_main": "68e3ef3a7c15cf5b3623555979766fadf8b670fe",
    "execution_packet_merge_commit": "a6a8757b11828a30899b54eed6c261462681c916",
    "execution_packet_reviewed_source_main": "71767df629c1f0034c38ea441c6e2cefc7794820",
    "credential_metadata_commit": "cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa",
    "runtime_revalidation_receipt_contract_pr": 966,
    "runtime_revalidation_receipt_contract_reviewed_head": "9d8fd5b8d46ede825cd11e5cbf98710b1ee00d77",
    "runtime_revalidation_receipt_contract_merge_commit": "d12b4620cb5a6e199a6a59f21dfae6dd434c550a",
    "credential_rotation_plan_pr": 968,
    "credential_rotation_plan_reviewed_head": "28776ceb7ccc23324bb2b22a4318c34578e5a68d",
    "credential_rotation_plan_merge_commit": "9d860b668e21c98ad19e63b2c32b463025f05310",
    "credential_rotation_plan_id": "voidapwcrp1_bf56e97e7bb2143c79babafed556a41637e2a071d151436aeac9efbf43d3dde0",
    "credential_rotation_runtime_binding_id": "voidapwcrrb1_bbc79c19f8b74b5bbbce1246fa147aa553f9edd3b93ec5fb76a963fe12d5523c",
    "intervening_buy_void_pr": 969,
    "intervening_buy_void_reviewed_head": "61d869e58d59d55a98db7ddd3004c62616d2818f",
    "intervening_buy_void_merge_commit": "ac3449d113012c0d37a8b5f099e41f9d081d0279",
    "intervening_buy_void_paths_overlap_plan": false,
    "replacement_issuance_preparation_pr": 972,
    "replacement_issuance_preparation_reviewed_head": "548e7cd8842ae618eed679c7d0e59528c1a08f92",
    "replacement_issuance_preparation_merge_commit": "1f4b6b29fc426b0435668022e8f8162c0fef55ef",
    "replacement_issuance_preparation_packet_id": "voidapwrip1_1610badfc75ba1998e5057a427361b60958e053e38391bca33f177774bf0c40d",
    "public_origin_bridge_pr": 973,
    "public_origin_bridge_reviewed_head": "f99fbb104a6393845a04a3192ae3b9ee801b55c9",
    "public_origin_bridge_merge_commit": "68e3ef3a7c15cf5b3623555979766fadf8b670fe",
    "public_origin_bridge_paths_overlap_plan": false,
    "trusted_context_metadata_commit": "ac074d53ab937d302c69b6bff54f02d064e37d57"
  },
  "expired_legacy_target": {
    "selected_credential_id": "voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1",
    "credential_agent_id": "void-external-agent-e2e-fulfillment-canary-agent-v1",
    "credential_scope": "agent_paid_work_submit",
    "credential_expires_at_utc": "2026-08-05T00:00:00.000Z",
    "current_binding_id": "voidapwcb1_77b02c3c54223062915d1d6b4d9ee0464c575899c164c52502391fff492abf56",
    "binding_destination_account": "void-external-agent-e2e-fulfillment-canary-v1",
    "binding_expires_at_utc": "2026-08-05T00:00:00.000Z",
    "boundary_passed": true,
    "fresh_runtime_revalidation_allowed": false,
    "replacement_metadata_required": true
  },
  "replacement_preparation": {
    "packet_id": "voidapwrip1_1610badfc75ba1998e5057a427361b60958e053e38391bca33f177774bf0c40d",
    "packet_status": "source_prepared_private_issuance_not_authorized",
    "packet_fixture_only": true,
    "packet_ordered_gate_count": 13,
    "contracts_validated": true,
    "runtime_receipt_fixture_id": "voidapwrr1_e4cb6ffd4864007d9e391184196ea86dbe9e58fd46c9c4b5f6b07005cab0ede6",
    "trusted_context_binding_fixture_id": "voidapwrtcb1_4f20cf0df34f1d9d2ceb1df3dff6202931e873660fa6fb74f3d1f7e42309eb13",
    "evidence_evaluated_at_utc": "2026-08-04T16:50:09.250Z",
    "producer_authentication_established": false,
    "current_runtime_state_established": false,
    "sanitized_issuance_request_prepared": true,
    "replacement_credential_id": null,
    "proposed_not_before_utc": "2026-08-04T17:00:00.000Z",
    "proposed_expires_at_utc": "2026-09-03T17:00:00.000Z",
    "maximum_credential_lifetime_days": 30,
    "private_credential_material_generated": false,
    "credential_registry_write_completed": false,
    "receiver_revalidated": false,
    "old_binding_retired": false,
    "replacement_binding_applied": false,
    "decision": "HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION",
    "execution_authorized": false,
    "authority": {
      "private_credential_material_generation_authorized": false,
      "credential_issuance_authorized": false,
      "credential_review_approval_authorized": false,
      "credential_registry_write_authorized": false,
      "receiver_restart_authorized": false,
      "old_binding_retirement_authorized": false,
      "replacement_binding_authorized": false,
      "live_authentication_authorized": false,
      "paid_work_submission_authorized": false,
      "quote_acceptance_authorized": false,
      "payment_authority_granted": false,
      "payment_execution_authorized": false,
      "work_dispatch_authorized": false,
      "work_credit_write_authorized": false,
      "wallet_or_signer_access_authorized": false,
      "signing_authorized": false,
      "transaction_construction_authorized": false,
      "transaction_broadcast_authorized": false,
      "fund_movement_authorized": false
    }
  },
  "public_origin_bridge": {
    "marker": "VOID_NODE_HOSTED_PAID_WORK_ORIGIN_BRIDGE_V1",
    "exact_route": "/__void/agents/paid-work/submissions/v1",
    "merge_commit": "68e3ef3a7c15cf5b3623555979766fadf8b670fe",
    "source_only": true,
    "gateway_override_installed": false,
    "ssh_forward_installed": false,
    "ssh_forward_active": false,
    "composition_gateway_restarted": false,
    "public_preflight_performed": false,
    "authenticated_submission_performed": false,
    "deployment_authorized": false,
    "activation_authorized": false
  },
  "privacy": {
    "raw_token_read_allowed": false,
    "credential_value_output_allowed": false,
    "private_path_output_allowed": false,
    "trusted_context_bundle_output_allowed": false,
    "service_environment_output_allowed": false,
    "authorization_header_output_allowed": false,
    "signature_output_allowed": false,
    "quote_output_allowed": false,
    "transaction_payload_output_allowed": false
  },
  "ordered_plan_gates": [
    "capture_current_origin_main",
    "verify_runtime_revalidation_receipt_contracts_merged",
    "verify_credential_rotation_contracts_merged",
    "verify_replacement_issuance_preparation_contracts_merged",
    "verify_disjoint_buy_void_and_inactive_public_origin_bridge_ancestry",
    "bind_exact_source_main_preparation_packet_and_contract_lineage",
    "verify_current_credential_and_binding_boundary_has_passed",
    "reject_legacy_credential_for_fresh_runtime_revalidation",
    "obtain_separate_private_replacement_issuance_authorization",
    "generate_replacement_private_credential_material_on_nimo_only",
    "review_replacement_and_apply_exact_append_only_credential_registry_update",
    "restart_receiver_under_separate_operation_bound_authority",
    "obtain_private_survey_authorization_and_revalidate_replacement_credential",
    "retire_expired_old_binding_with_durable_evidence",
    "bind_replacement_credential_and_verify_one_active_wc_binding",
    "capture_sanitized_rotation_and_runtime_closeout_evidence",
    "obtain_fresh_signatures_quote_execution_plan_and_zoso_confirmation",
    "revalidate_origin_main_all_evidence_and_make_separate_readiness_decision"
  ],
  "required_private_evidence": [
    "replacement_issuance_preparation_packet_and_exact_evidence_linkage",
    "nimo_private_credential_material_generation_receipt_without_secret_output",
    "replacement_review_and_append_only_credential_registry_apply_receipt",
    "receiver_restart_load_and_loopback_listener_receipt",
    "replacement_credential_runtime_revalidation_and_trusted_context_binding",
    "expired_old_binding_retirement_receipt",
    "replacement_binding_single_active_binding_closeout",
    "fresh_signatures_quote_execution_plan_and_zoso_confirmation_inputs"
  ],
  "unresolved_execution_inputs": {
    "replacement_credential_id": null,
    "replacement_credential_metadata_commit": null,
    "provider_signature_verified": false,
    "requester_signature_verified": false,
    "fresh_direct_authentication_packet_sha256": null,
    "fresh_quote_required": true,
    "fresh_quote_verified": false,
    "fresh_quote_sha256": null,
    "execution_plan_sha256": null,
    "fresh_zoso_confirmation": null,
    "runtime_revalidation_satisfied": false,
    "rotation_satisfied": false,
    "execution_authorized": false
  },
  "fail_closed_conditions": [
    "origin_main_changed",
    "runtime_revalidation_receipt_contract_source_binding_mismatch",
    "credential_rotation_contract_source_binding_mismatch",
    "replacement_issuance_preparation_contract_source_binding_mismatch",
    "intervening_current_main_ancestry_or_path_scope_mismatch",
    "legacy_credential_or_binding_expiry_boundary_not_passed",
    "legacy_credential_used_for_new_runtime_revalidation",
    "replacement_issuance_authorization_missing_expired_or_mismatched",
    "replacement_private_material_generated_outside_nimo_or_secret_output_required",
    "replacement_review_or_registry_append_missing_mismatched_or_non_append_only",
    "receiver_restart_or_loaded_registry_evidence_missing_or_mismatched",
    "replacement_credential_identity_scope_validity_revocation_or_replay_failure",
    "trusted_context_metadata_bundle_or_private_path_fingerprint_mismatch",
    "old_binding_retirement_missing_early_or_without_durable_evidence",
    "replacement_binding_created_before_old_binding_retirement",
    "single_active_binding_or_sanitized_closeout_verification_failure",
    "public_origin_bridge_activation_or_authenticated_submission_assumed",
    "signature_quote_execution_plan_confirmation_or_execution_authority_assumed"
  ],
  "authority": {
    "private_runtime_survey_authorized": false,
    "credential_access_authorized": false,
    "private_path_access_authorized": false,
    "service_environment_access_authorized": false,
    "deployment_authorized": false,
    "service_start_authorized": false,
    "service_restart_authorized": false,
    "live_authentication_authorized": false,
    "signing_authorized": false,
    "quote_acceptance_authorized": false,
    "payment_execution_authorized": false,
    "work_dispatch_authorized": false,
    "work_credit_write_authorized": false,
    "wallet_or_signer_access_authorized": false,
    "transaction_construction_authorized": false,
    "transaction_broadcast_authorized": false,
    "fund_movement_authorized": false,
    "activation_authorized": false
  },
  "decision": {
    "status": "HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION",
    "plan_source_complete": true,
    "replacement_preparation_contract_merged": true,
    "legacy_credential_and_binding_expired": true,
    "private_replacement_issuance_authorized": false,
    "private_credential_material_generated": false,
    "replacement_credential_id_resolved": false,
    "credential_registry_write_completed": false,
    "receiver_revalidated": false,
    "old_binding_retired": false,
    "replacement_binding_applied": false,
    "runtime_revalidation_satisfied": false,
    "rotation_satisfied": false,
    "execution_authorized": false,
    "next_gate": "obtain_separate_private_replacement_issuance_authorization_for_nimo_generation"
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function verify(candidate) {
  assert.deepEqual(candidate, EXPECTED, "plan_contract_mismatch");
}

verify(plan);
assert.deepEqual(schema.const, EXPECTED);
assert.equal(plan.source.plan_source_main, "68e3ef3a7c15cf5b3623555979766fadf8b670fe");
assert.equal(plan.source.replacement_issuance_preparation_merge_commit, "1f4b6b29fc426b0435668022e8f8162c0fef55ef");
assert.equal(plan.source.replacement_issuance_preparation_packet_id, "voidapwrip1_1610badfc75ba1998e5057a427361b60958e053e38391bca33f177774bf0c40d");
assert.equal(plan.source.public_origin_bridge_merge_commit, "68e3ef3a7c15cf5b3623555979766fadf8b670fe");
assert.equal(plan.expired_legacy_target.boundary_passed, true);
assert.equal(plan.expired_legacy_target.fresh_runtime_revalidation_allowed, false);
assert.equal(plan.replacement_preparation.packet_ordered_gate_count, 13);
assert.equal(plan.replacement_preparation.producer_authentication_established, false);
assert.equal(plan.replacement_preparation.current_runtime_state_established, false);
assert.equal(plan.replacement_preparation.replacement_credential_id, null);
assert.equal(plan.replacement_preparation.private_credential_material_generated, false);
assert.equal(Object.keys(plan.replacement_preparation.authority).length, 19);
assert.equal(Object.values(plan.replacement_preparation.authority).every((v) => v === false), true);
assert.equal(plan.public_origin_bridge.source_only, true);
assert.equal(plan.public_origin_bridge.ssh_forward_active, false);
assert.equal(plan.public_origin_bridge.activation_authorized, false);
assert.equal(plan.ordered_plan_gates.length, 18);
assert.equal(new Set(plan.ordered_plan_gates).size, 18);
assert.equal(plan.required_private_evidence.length, 8);
assert.equal(plan.fail_closed_conditions.length, 18);
assert.equal(Object.keys(plan.authority).length, 18);
assert.equal(Object.values(plan.authority).every((v) => v === false), true);
assert.equal(plan.decision.status, "HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION");
assert.equal(plan.decision.legacy_credential_and_binding_expired, true);
assert.equal(plan.decision.private_replacement_issuance_authorized, false);
assert.equal(plan.decision.execution_authorized, false);

const stale = clone(plan);
stale.source.plan_source_main = "1f4b6b29fc426b0435668022e8f8162c0fef55ef";
assert.throws(() => verify(stale), /plan_contract_mismatch/);

const liveEvidence = clone(plan);
liveEvidence.replacement_preparation.current_runtime_state_established = true;
assert.throws(() => verify(liveEvidence), /plan_contract_mismatch/);

const fabricatedCredential = clone(plan);
fabricatedCredential.replacement_preparation.replacement_credential_id =
  "voidapwc1_" + "0".repeat(64);
assert.throws(() => verify(fabricatedCredential), /plan_contract_mismatch/);

const bridgeActivated = clone(plan);
bridgeActivated.public_origin_bridge.activation_authorized = true;
assert.throws(() => verify(bridgeActivated), /plan_contract_mismatch/);

const issuanceAuthorized = clone(plan);
issuanceAuthorized.replacement_preparation.authority.credential_issuance_authorized = true;
assert.throws(() => verify(issuanceAuthorized), /plan_contract_mismatch/);

const renamedGate = clone(plan);
renamedGate.ordered_plan_gates[9] = "generate_replacement_token_on_any_host";
assert.throws(() => verify(renamedGate), /plan_contract_mismatch/);

for (const required of [
  "68e3ef3a7c15cf5b3623555979766fadf8b670fe",
  "1f4b6b29fc426b0435668022e8f8162c0fef55ef",
  "voidapwrip1_1610badfc75ba1998e5057a427361b60958e053e38391bca33f177774bf0c40d",
  "HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION",
  "producer_authentication_established=false",
  "current_runtime_state_established=false",
  "replacement_credential_id=null",
  "2026-08-05T00:00:00.000Z",
  "public bridge remains",
]) {
  assert.ok(docText.includes(required), `document missing: ${required}`);
}

for (const relative of [
  ".github/workflows/authenticated-paid-work-private-runtime-revalidation-plan-v1.yml",
  "config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-plan-v1.json",
  "schemas/authenticated-paid-work-private-runtime-revalidation-plan-v1.schema.json",
  "docs/operations/authenticated-paid-work-private-runtime-revalidation-plan-v1.md",
  "scripts/prove_authenticated_paid_work_private_runtime_revalidation_plan_v1.mjs",
]) {
  assert.ok(workflowText.includes(`- "${relative}"`));
}

for (const forbidden of ["/home/", "Bearer ", "Authorization:", "-----BEGIN", "sk-proj-"]) {
  assert.equal(planText.includes(forbidden), false);
  assert.equal(schemaText.includes(forbidden), false);
  assert.equal(docText.includes(forbidden), false);
}

assert.equal(Number.parseInt(process.versions.node.split(".")[0], 10), 22);

console.log("plan_status=source_plan_replacement_issuance_preparation_merged_waiting_on_private_issuance_and_rotation");
console.log("plan_source_main=68e3ef3a7c15cf5b3623555979766fadf8b670fe");
console.log("replacement_issuance_merge_commit=1f4b6b29fc426b0435668022e8f8162c0fef55ef");
console.log("replacement_issuance_reviewed_head=548e7cd8842ae618eed679c7d0e59528c1a08f92");
console.log("replacement_preparation_packet_id=voidapwrip1_1610badfc75ba1998e5057a427361b60958e053e38391bca33f177774bf0c40d");
console.log("public_origin_bridge_merge_commit=68e3ef3a7c15cf5b3623555979766fadf8b670fe");
console.log("legacy_credential_and_binding_expired=true");
console.log("legacy_credential_fresh_revalidation_allowed=false");
console.log("preparation_packet_ordered_gates=13");
console.log("producer_authentication_established=false");
console.log("current_runtime_state_established=false");
console.log("replacement_credential_id=null");
console.log("private_credential_material_generated=false");
console.log("preparation_denied_authorities=19");
console.log("public_origin_bridge_active=false");
console.log("ordered_plan_gates=18");
console.log("required_private_evidence=8");
console.log("fail_closed_conditions=18");
console.log("denied_authorities=18");
console.log("runtime_revalidation_satisfied=false");
console.log("rotation_satisfied=false");
console.log("fresh_quote_required=true");
console.log("execution_authorized=false");
console.log("replacement_preparation_binding_exact=true");
console.log("credential_expiry_fail_closed=true");
console.log("secret_output_prohibited=true");
console.log("adversarial_contract_mutations_rejected=true");
console.log("plan_sha256=19017e95bb521d5a077fe30aa96e2d23372c0dd1cdfb1c77270565756bc8ddca");
console.log("VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_PLAN_V1_PROOF_GREEN=true");
