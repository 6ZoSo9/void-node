import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const MARKER="VOID_BUY_VOID_VERIFIED_PAYMENT_OPERATOR_PRINCIPAL_AUTH_PLAN_V1";
const ROOT=process.cwd();
const BASE_HEAD="a3e0fdc4a9ee3c39c84f5783064c2e38f9481f97";
const BASE_TREE="4eeb6d9d382d9520b60ae9b698b1135da85b05df";
const PLAN_PATH="ops/security/buy-void-verified-payment-operator-principal-auth-plan-v1.json";
const PLAN_BLOB="8258f7ff9ddd489c483c0e6daf675c9a2a58523e";
const PLAN_ID="voidbuyopauth1_35d73623a820ffb06acd4bf49769237ad13cf2db0ad7f40f2613229d92f2c2d1";
const OWNED=Object.freeze([
  ".github/workflows/buy-void-verified-payment-operator-principal-auth-plan-v1.yml",
  "docs/architecture/buy-void-verified-payment-operator-principal-auth-plan-v1.md",
  PLAN_PATH,
  "scripts/prove_buy_void_verified_payment_operator_principal_auth_plan_v1.mjs",
].sort());
const SOURCE_BINDINGS=Object.freeze({
  "ops/public/void-public-app-composition-gateway-v1.mjs":"b086b612fe5ee1dc1d5bcc4838d926af890d1435",
  "scripts/prove_buy_void_operator_local_intent_v1.ts":"b62351d9e48ab1c9654b6368eb0e412305f0b899",
  "scripts/prove_public_app_composition_gateway_v1.mjs":"0d6c0a6a9b0a9fba31e2632cb255c3514d65f157",
  "src/economic/buy_void_operator_local_intent_v1.ts":"7d1ced8dacb50fd7c7b708fd6587ed7930332bb3",
  "src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts":"eb4fb37c6073415228b312663c45a99d5015c727",
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts":"ac8bf352979e0e24d2cab45c3b23949e1bd2b026",
  "src/index.ts":"123ec1792a027f93d4c9030749a0e7e136a75a44",
});
const REQUIRED=Object.freeze([
  "allocation_high_water_root_server_controlled_and_exact",
  "allocation_ledger_root_server_controlled_and_exact",
  "authorize_operator_mutation_before_event_or_custody_authority",
  "capability_from_query_cookie_body_browser_storage_forbidden",
  "coupled_launch_activation_separate",
  "cross_uid_claim_phase_recovery_contract_independently_accepted",
  "deployed_artifact_generation_bound_before_runtime_authority",
  "exact_mounted_verify_payment_route_generation_bound",
  "loopback_host_and_socket_peer_required_but_not_sufficient",
  "operator_bearer_credential_generation_content_bound",
  "operator_principal_authentication_bound_to_dispatch_invocation",
  "payment_to_void_delivery_canary_separate",
  "post_and_operator_intent_header_required",
  "protected_custody_and_high_water_host_evidence_independently_accepted",
  "public_gateway_operator_prefix_remains_unreachable",
  "registered_route_identity_exact_and_client_url_spelling_non_authoritative",
  "verified_payment_branch_calls_allocation_required_dispatch_not_legacy_writer",
].sort());

function git(args){
  return execFileSync("/usr/bin/git",args,{
    cwd:ROOT,encoding:"utf8",
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null"},
  }).trim();
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes).digest("hex");
}
function stable(value){
  if(Array.isArray(value)) return value.map(stable);
  if(value && typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort()) out[key]=stable(value[key]);
    return out;
  }
  return value;
}
function sha256Text(value){
  return crypto.createHash("sha256").update(value,"utf8").digest("hex");
}
function source(path){ return fs.readFileSync(path,"utf8"); }

assert.equal(git(["rev-parse",BASE_HEAD+"^{tree}"]),BASE_TREE,"base_tree_drift");
assert.equal(git(["merge-base",BASE_HEAD,"HEAD"]),BASE_HEAD,"base_not_ancestor");
const scope=git(["diff","--name-status",BASE_HEAD,"HEAD"])
  .split("\n").filter(Boolean)
  .map(line=>{
    const parts=line.split("\t");
    assert.equal(parts.length,2,"non_add_scope_shape");
    assert.equal(parts[0],"A","scope_not_add:"+line);
    return parts[1];
  }).sort();
assert.deepEqual(scope,OWNED,"exact_four_add_scope_required");

const planBytes=fs.readFileSync(PLAN_PATH);
assert.equal(gitBlob(planBytes),PLAN_BLOB,"plan_blob_drift");
const plan=JSON.parse(planBytes.toString("utf8"));
assert.equal(plan.schema,"void_buy_void_verified_payment_operator_principal_auth_plan_v1");
assert.equal(plan.repository,"6ZoSo9/void-node");
assert.equal(plan.base_head,BASE_HEAD);
assert.equal(plan.base_tree,BASE_TREE);
assert.equal(plan.status,"HOLD");
assert.equal(plan.plan_id,PLAN_ID);
const core={...plan}; delete core.plan_id;
assert.equal(
  "voidbuyopauth1_"+sha256Text(JSON.stringify(stable(core))),
  PLAN_ID,
  "plan_id_recompute_mismatch",
);
assert.deepEqual(plan.source_bindings,SOURCE_BINDINGS,"source_binding_map_drift");
assert.deepEqual([...plan.future_requirements].sort(),REQUIRED,"future_requirement_set_drift");

for(const [path,expected] of Object.entries(SOURCE_BINDINGS)){
  assert.equal(gitBlob(fs.readFileSync(path)),expected,"source_blob_drift:"+path);
}

const local=source("src/economic/buy_void_operator_local_intent_v1.ts");
for(const text of [
  "loopback_host_required: true",
  "loopback_socket_peer_required: true",
  "host_or_peer_authority_forbidden: true",
  "operator_bearer_capability_required: true",
  "capability_query_parameter_forbidden: true",
  "capability_cookie_forbidden: true",
  "capability_browser_storage_forbidden: true",
  "mutation_post_required: true",
  "mutation_intent_header_required: true",
  "mounted_payment_only_verification_forbidden: true",
  "registered_mutation_route_identity_required: true",
  "cross_site_browser_mutation_forbidden: true",
  '"/__void/buy-void/operator/verify-payment.json"',
  '"buy_void_allocation_handoff_unmounted"',
]) assert.ok(local.includes(text),"local_intent_contract_missing:"+text);

const localProof=source("scripts/prove_buy_void_operator_local_intent_v1.ts");
for(const text of [
  "loopback_host_and_socket_peer_required=true",
  "operator_bearer_capability_required=true",
  "operator_mutation_post_required=true",
  "operator_mutation_intent_header_required=true",
  "mounted_operator_mutation_routes_post_only=true",
]) assert.ok(localProof.includes(text),"local_intent_proof_receipt_missing:"+text);

const dispatch=source("src/economic/buy_void_operator_verified_allocation_dispatch_v1.ts");
for(const text of [
  "server_controlled_roots_required: true",
  "mounted_operator_route_verified: false",
  "operator_principal_authenticated: false",
  "custody_service_composed: false",
  "direct_web_process_private_root_write_authority: false",
  "deployed_artifact_generation_verified: false",
  "production_gate_ready: false",
  '"/var/lib/void-allocation-ledger-v1"',
  '"/var/lib/void-allocation-custody-v1"',
  "writeBuyVoidVerifiedPaymentAllocationHandoffV1",
  "writeBuyVoidOperatorEventWithCapacityAdmissionV1",
]) assert.ok(dispatch.includes(text),"dispatch_contract_missing:"+text);

const capacity=source("src/economic/buy_void_verified_payment_capacity_admission_v1.ts");
for(const text of [
  "export async function writeBuyVoidVerifiedPaymentAllocationHandoffV1",
  "runtime_integration: false as const",
  "protected_high_water_custody_proven: false as const",
  "production_gate_ready: false as const",
  "funds_movement: false as const",
]) assert.ok(capacity.includes(text),"capacity_handoff_contract_missing:"+text);

const router=source("src/index.ts");
for(const text of [
  "/__void/buy-void/operator/verify-payment.json",
  "/__void/buy-void/operator/mark.json",
  "writeBuyVoidOperatorEventWithCapacityAdmissionV1",
]) assert.ok(router.includes(text),"mounted_router_contract_missing:"+text);
assert.equal(router.includes("dispatchBuyVoidOperatorEventWithAllocationRequiredV1"),false,
  "allocation_dispatch_must_remain_unmounted_in_current_router");

const gateway=source("ops/public/void-public-app-composition-gateway-v1.mjs");
assert.ok(gateway.includes('"/__void/buy-void/operator"'),"public_gateway_operator_block_missing");

const observations=plan.current_observations;
assert.equal(observations.operator_local_intent_contract_present,true);
assert.equal(observations.loopback_host_required,true);
assert.equal(observations.loopback_socket_peer_required,true);
assert.equal(observations.host_or_peer_alone_is_authority,false);
assert.equal(observations.operator_bearer_capability_required,true);
assert.equal(observations.capability_query_parameter_allowed,false);
assert.equal(observations.capability_cookie_allowed,false);
assert.equal(observations.capability_browser_storage_allowed,false);
assert.equal(observations.operator_mutation_post_required,true);
assert.equal(observations.operator_mutation_intent_header_required,true);
assert.equal(observations.registered_mutation_route_identity_required,true);
assert.equal(observations.cross_site_browser_mutation_allowed,false);
assert.equal(observations.verify_payment_route_allocation_handoff_mounted,false);
assert.equal(observations.verified_allocation_dispatch_source_present,true);
assert.equal(observations.verified_allocation_dispatch_mounted,false);
assert.equal(observations.operator_principal_authenticated_for_verified_allocation_dispatch,false);
assert.equal(observations.server_controlled_allocation_roots_required,true);
assert.equal(observations.public_gateway_blocks_buy_void_operator_prefix,true);

const authority=plan.authority;
assert.equal(authority.source_plan_only,true);
for(const key of [
  "mounted_operator_route_verified",
  "operator_principal_authenticated",
  "verified_allocation_dispatch_mounted",
  "custody_service_composed",
  "private_root_independent_custody_proven",
  "direct_web_process_private_root_write_authority",
  "cross_uid_recovery_or_release_authorized",
  "deployed_artifact_generation_verified",
  "payment_acceptance",
  "presale_activation",
  "signing",
  "transaction_broadcast",
  "funds_movement",
]) assert.equal(authority[key],false,key);

console.log(MARKER+"_GREEN");
console.log("plan_id="+PLAN_ID);
console.log("source_binding_count="+Object.keys(SOURCE_BINDINGS).length);
console.log("future_requirement_count="+REQUIRED.length);
console.log("exact_base_tree_and_four_add_scope=true");
console.log("operator_local_intent_contract_present=true");
console.log("loopback_and_socket_peer_not_sufficient_authority=true");
console.log("operator_bearer_capability_required=true");
console.log("verified_allocation_dispatch_mounted=false");
console.log("operator_principal_authenticated=false");
console.log("server_controlled_allocation_roots_required=true");
console.log("public_gateway_blocks_operator_prefix=true");
console.log("current_router_legacy_capacity_writer=true");
console.log("payment_acceptance=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
