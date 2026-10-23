import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const MARKER="VOID_BUY_VOID_CANONICAL_ERC20_DELIVERY_CANARY_PLAN_V1";
const ROOT=process.cwd();
const BASE_HEAD="40e61e4695cd4fd9e95bbd44e95152b5c2e2f432";
const BASE_TREE="c6d9b9cedd33acd2a114c7577ef11aa3274c3cb3";
const PLAN_PATH="ops/security/buy-void-canonical-erc20-delivery-canary-plan-v1.json";
const PLAN_BLOB="3efe05cfd104e87d48b3eb7e1d6d943ce10a6d5d";
const PLAN_ID="voidbverc20canary1_5c1bc8a16b52b8e7e07f79aadfa01c5865b5804f7603f2c8fd4330d043520173";
const OWNED=Object.freeze([
  ".github/workflows/buy-void-canonical-erc20-delivery-canary-plan-v1.yml",
  "docs/architecture/buy-void-canonical-erc20-delivery-canary-plan-v1.md",
  "ops/security/buy-void-canonical-erc20-delivery-canary-plan-v1.json",
  "scripts/prove_buy_void_canonical_erc20_delivery_canary_plan_v1.mjs"
]);
const SOURCE_BINDINGS=Object.freeze({
  "docs/operators/buy-void-canonical-erc20-delivery-composition-v1.md":"4afae5d20f51beb133ef59e5af6a4272ceb6b42f",
  "docs/operators/buy-void-erc20-delivery-runtime-activation-configuration-contract-v1.md":"3a7157e1100cd9bd897c2b90358ef28ff92c9c8c",
  "scripts/buy_void_production_canary_candidate_reservation_v1.ts":"084d54563cc5c73ec3def45a822461b75d2ce4de",
  "scripts/prove_buy_void_canonical_erc20_delivery_composition_v1.ts":"c14430c5803dae360d21461d290f1501bc9e405f",
  "scripts/prove_buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.ts":"c6fcd21cdfe537badfeaa1d01f8a1ed9acb384cf",
  "scripts/prove_buy_void_production_canary_candidate_reservation_v1.ts":"78c47737ac85de5541f7c055362da7ced3272d31",
  "scripts/prove_buy_void_production_live_canary_preflight_v1.ts":"048fe0b6afbcd80352f4968f1ee6bc4dd7f3d917",
  "scripts/prove_void_participant_postpurchase_voidtoken_control_v1.mjs":"fed6c9860fb7e2ad36dc1222f97c315d1be66441",
  "src/economic/buy_void_allocation_reservation_ledger_v1.ts":"8d84955e1e093a5c5af63241e62b8722fadd2f29",
  "src/economic/buy_void_delivery_runtime_integration_v1.ts":"5b23824bf0a0f33b193e1cfc022fcfb5b898b022",
  "src/economic/buy_void_delivery_sign_broadcast_adapter_v1.ts":"2deaee8ae4e0fbd909b417eef96a76012174c668",
  "src/economic/buy_void_delivery_submission_guard_v1.ts":"f84ca60a37c77ae7691ec6970c59f123de4f73b7",
  "src/economic/buy_void_erc20_delivery_receipt_reconciler_v1.ts":"d769edb821cec543cf05e8425857114261561cc0",
  "src/economic/buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.ts":"f124637375edc5e082ccdec937f43fd2f2312616",
  "src/economic/buy_void_erc20_execution_composition_v1.ts":"acf2f88b513bbe50e192531f9fc8d261b69bd0f1",
  "src/economic/buy_void_erc20_production_configuration_candidate_binding_v1.ts":"4e060e2d5a1b28be03cf8dde3eda45778b7ed002",
  "src/economic/buy_void_erc20_transaction_preparation_planner_v1.ts":"baff79fbfdc9a01c73e66176dcb25ccc8cdaf0e7",
  "src/economic/buy_void_execution_attempt_journal_v1.ts":"536b6f6970c3aaf48b1ae0dec3a0356ad7c3a7fe",
  "src/economic/buy_void_verified_payment_capacity_admission_v1.ts":"ac8bf352979e0e24d2cab45c3b23949e1bd2b026",
  "src/economic/participant_postpurchase_raw_submission_v1.ts":"6019f20517270ee21bf4900ba4f15cccfb32fd2a",
  "tools/void-participant-postpurchase-voidtoken-control-v1.mjs":"e8fef2dd13d3a0a4dd1f597934d2f7305fe2464e",
  "src/economic/buy_void_fulfillment_journal_v1.ts":"7c4b099d835b84f50867e873fca763767c80c015",
  "src/economic/buy_void_inventory_reservation_journal_v1.ts":"dc15061a3c4f09ec31da678aa26a731708e70d6c",
  "src/economic/buy_void_pipeline_coordinator_v1.ts":"318aaa6a1534fed0d2ab934a78d2a5de187f7ef8",
  "src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts":"e284a38a4b7f3d498b07e77c661d6eef3b742e7a",
  "src/economic/buy_void_filesystem_bakery_lock_v1.ts":"9bd47abb857368d928c0ca289766cdf3571629ba",
  "src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts":"0999f773bdc4befb3e82676304f0d69f5cab42ef",
  "src/economic/buy_void_source_finality_execution_preflight_v1.ts":"c23155893efd684073a72a0903b89c72605faad5",
  "src/economic/buy_void_allocation_reservation_high_water_v1.ts":"9383c94cf848efb9a0112f1b741df4e10f790ac6",
  "src/economic/buy_void_allocation_reservation_publication_protocol_v1.ts":"b0fe98427a7bdf1c39c41fb64e94f3f142d6636b",
  "src/economic/buy_void_allocation_reservation_publication_writer_v1.ts":"b460963c25a87153551090ed97e9c716aad0b727",
  "src/economic/buy_void_auto_fulfillment_v1.ts":"b7c963b1d55f000d82ad82289b31107b432503de",
  "src/economic/buy_void_broadcast_outcome_journal_v1.ts":"de8765d306c9ba1153ade10f0e5db92823ef3e39",
  "src/economic/buy_void_confirmed_state_journal_v1.ts":"d420ff9fc9533098b613d2dae82425a9c4a4bf7e",
  "src/economic/buy_void_fulfilled_reconciliation_mode_v1.ts":"441e8635206ceeaf712af904f775fcd4481d08ba",
  "src/economic/buy_void_fulfillment_confirmation_v1.ts":"31c8ce9b88c86d32e187ed2ca7d0a23344fbd113",
  "src/economic/buy_void_native_chain2050_broadcaster_v1.ts":"28b50301609c16838903ee49e62ba91cd4660e88",
  "src/economic/buy_void_native_delivery_sign_broadcast_adapter_v1.ts":"a01182b49ba9edb3f6bab6eccbb524b905d5f990",
  "src/economic/buy_void_preappend_plain_input_v1.ts":"945cd55d92d4a76fe0d8bfaa237ca27d4753dc2f",
  "src/economic/buy_void_request_custody_read_policy_v1.ts":"8885957e3f9ff983724c7944e0d4f181e6e834c1",
  "src/economic/buy_void_terminal_closeout_request_lock_v1.ts":"0ee4e5b5ec8b5653f77dda5b49d5591f42527741",
  "src/economic/buy_void_verified_allocation_replay_binding_v1.ts":"b451bcd895986dadaf6e53954671062068316ccf",
  "src/economic/buy_void_verified_payment_duplicate_guard_v1.ts":"5a95216e5c264f5b6c1c779a494f2c1ed445801e",
  "src/economic/buy_void_verified_payment_v2.ts":"550ede02fc0b7d6874c324af58b5ef9c5591b311",
  "src/economic/buy_void_erc20_production_configuration_verifier_v1.ts":"8781b2e9efa8b70de6f0c6a3721be089cab4a976",
  "src/economic/buy_void_payment_rpc_observer_v1.ts":"0073818ad6f6418e895bf794024c9d678b3bef86",
  "src/economic/buy_void_source_chain_finality_rpc_adapter_v1.ts":"419054e00f4d96015cd066be81e8719ee71ac00c",
  "src/economic/buy_void_source_finality_authenticated_composition_v3.ts":"a3dbe4d0fed3034d3ca2c0b3704a758d7c776090",
  "src/economic/buy_void_source_finality_authority_v2.ts":"64953050d74bc0bc6d1e6948ae992d6143edca99",
  "src/economic/buy_void_source_finality_generation_provenance_v7.ts":"390ff1a2ff0437cd8c8693e7807c12275df42573",
  "src/economic/buy_void_source_finality_live_process_binding_v1.ts":"73f088779f015a554f16e9eecf8a9fd9de0e1594",
  "src/economic/buy_void_source_finality_live_process_binding_v2.ts":"987c97568a4d1b9814218603df48a65dbfeed18f",
  "src/economic/buy_void_source_finality_provider_pair_binding_v1.ts":"5d47cd29929f778b07a59647a80c4384b1497a08",
});
const REQUIRED=Object.freeze([
  "allocation_reserved_before_canary_required",
  "authenticated_operator_route_and_custody_separate_gate",
  "bounded_reserved_inventory_amount_required",
  "broad_delivery_activation_separate_gate",
  "canary_success_does_not_activate_presale",
  "canary_success_does_not_enable_public_delivery",
  "canary_success_does_not_widen_delivery_max",
  "durable_wallet_nonce_reservation_required",
  "exact_allocation_record_id_required",
  "exact_chain_2050_required",
  "exact_delivery_runtime_generation_required",
  "exact_delivery_wallet_generation_required",
  "exact_execution_composition_generation_required",
  "exact_one_erc20_transfer_required",
  "exact_payment_identity_required",
  "exact_signer_credential_generation_required",
  "exact_transfer_event_wallet_to_recipient_amount_required",
  "exact_void_token_address_required",
  "explicit_participant_controlled_recipient_required",
  "external_recipient_consent_or_control_binding_required",
  "native_transaction_value_zero_required",
  "participant_postpurchase_control_evidence_required",
  "presale_inventory_funding_separate_gate",
  "receipt_finality_required",
  "recipient_post_balance_delta_required",
  "signed_transaction_hash_custody_before_broadcast_required",
  "single_broadcast_attempt_or_reconciled_replay_required",
  "successful_receipt_status_required",
  "transfer_amount_equals_bound_allocation_required",
  "write_ahead_broadcast_intent_before_rpc_required",
]);
const OBS=Object.freeze({
  "allocation_handoff_production_gate_ready":false,
  "canonical_asset":"void_token_erc20",
  "canonical_chain_id":"2050",
  "canonical_delivery_execution_ready":false,
  "canonical_erc20_mutation_critical_import_closure_bound":true,
  "canonical_delivery_runtime_activation_ready":false,
  "canonical_delivery_runtime_parent_mounted":true,
  "disabled_delivery_canary_max_may_be_lower":true,
  "legacy_native_canary_retired_for_canonical_erc20_transition":true,
  "legacy_native_canary_runtime_action_reachable":false,
  "historical_native_canary_proof_exact_blob_only":true,
  "historical_native_canary_proof_transitive_import_closure_claimed":false,
  "live_canary_preflight_authorizes_execution":false,
  "live_canary_preflight_broadcast_authorized":false,
  "live_canary_preflight_signing_authorized":false,
  "participant_control_public_submission_open":false,
  "participant_control_source_only":true,
  "participant_control_token_movement":false,
  "presale_inventory_funding_ready":false,
  "production_broad_delivery_configuration_verified":false,
  "public_delivery_activation_requires_presale_capacity_max":true,
});
const AUTH=Object.freeze({
  "canary_execution":false,
  "credential_read":false,
  "funds_movement":false,
  "inventory_funding":false,
  "mounted_operator_route_verified":false,
  "payment_acceptance":false,
  "presale_activation":false,
  "public_delivery_activation":false,
  "rpc_call":false,
  "runtime_mutation":false,
  "signing":false,
  "source_plan_only":true,
  "transaction_broadcast":false,
  "wallet_or_signer_access":false,
});
function git(args){return execFileSync("/usr/bin/git",args,{cwd:ROOT,encoding:"utf8",env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null"}}).trim();}
function gitBlob(bytes){return crypto.createHash("sha1").update(Buffer.from("blob "+String(bytes.length)+"\0","utf8")).update(bytes).digest("hex");}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==="object"){const out={};for(const key of Object.keys(value).sort())out[key]=stable(value[key]);return out;}return value;}
function sha256Text(value){return crypto.createHash("sha256").update(value,"utf8").digest("hex");}
function source(path){return fs.readFileSync(path,"utf8");}
assert.equal(git(["rev-parse",BASE_HEAD+"^{tree}"]),BASE_TREE,"base_tree_drift");
assert.equal(git(["merge-base",BASE_HEAD,"HEAD"]),BASE_HEAD,"base_not_ancestor");
const scope=git(["diff","--name-status",BASE_HEAD,"HEAD"]).split("\n").filter(Boolean).map(line=>{const parts=line.split("\t");assert.equal(parts.length,2,"scope_shape");assert.equal(parts[0],"A","scope_not_add:"+line);return parts[1];}).sort();
assert.deepEqual(scope,OWNED,"exact_four_add_scope_required");
const planBytes=fs.readFileSync(PLAN_PATH);
assert.equal(gitBlob(planBytes),PLAN_BLOB,"plan_blob_drift");
const plan=JSON.parse(planBytes.toString("utf8"));
assert.equal(plan.schema,"void_buy_void_canonical_erc20_delivery_canary_plan_v1");
assert.equal(plan.repository,"6ZoSo9/void-node");
assert.equal(plan.base_head,BASE_HEAD);
assert.equal(plan.base_tree,BASE_TREE);
assert.equal(plan.status,"HOLD");
assert.equal(plan.plan_id,PLAN_ID);
const core={...plan};delete core.plan_id;
assert.equal("voidbverc20canary1_"+sha256Text(JSON.stringify(stable(core))),PLAN_ID,"plan_id_recompute_mismatch");
assert.deepEqual(plan.source_bindings,SOURCE_BINDINGS,"source_bindings_drift");
assert.deepEqual([...plan.future_requirements].sort(),[...REQUIRED].sort(),"future_requirements_drift");
assert.deepEqual(plan.current_observations,OBS,"current_observations_drift");
assert.deepEqual(plan.authority,AUTH,"authority_drift");
for(const [path,expected] of Object.entries(SOURCE_BINDINGS)){assert.match(expected,/^[0-9a-f]{40}$/,"source_binding_sha_invalid:"+path);assert.equal(gitBlob(fs.readFileSync(path)),expected,"source_blob_drift:"+path);}
const config=source("src/economic/buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.ts");
for(const text of ['canonical_chain_id: "2050"','canonical_asset: "void_token_erc20"','canonical_delivery_runtime_activation_ready: false','canonical_delivery_runtime_parent_mounted: true','canonical_delivery_execution_ready: false','presale_inventory_funding_ready: false','disabled_delivery_canary_max_may_be_lower: true','public_delivery_activation_requires_presale_capacity_max: true','production_broad_delivery_configuration_verified: false','canonical_delivery_action: "sign_and_broadcast"','durable_wallet_nonce_reservation_required: true','signed_hash_custody_required: true','write_ahead_broadcast_intent_required: true','receipt_reconciliation_required: true'])assert.ok(config.includes(text),"configuration_contract_missing:"+text);
const retired=source("scripts/buy_void_production_canary_candidate_reservation_v1.ts");
for(const text of ['retired_for_canonical_erc20_transition: true','canonical_delivery_asset: "void_token_erc20"','legacy_parent_runtime_action_reachable: false','signing: false','transaction_broadcast: false','money_movement: false'])assert.ok(retired.includes(text),"retired_canary_contract_missing:"+text);
const preflight=source("src/economic/buy_void_production_live_canary_preflight_v1.ts");
for(const text of ['native_execution_apply: false','signing_authorized: false','transaction_broadcast_authorized: false','money_movement_authorized: false','live_canary_authorized_by_preflight: false'])assert.ok(preflight.includes(text),"legacy_preflight_authority_missing:"+text);
const participant=source("tools/void-participant-postpurchase-voidtoken-control-v1.mjs");
for(const text of ['chain_id: "2050"','native_value_wei_required: "0"','transfer_selector: "0xa9059cbb"','delivery_recipient_signer_binding_required: true','source_only: true','transaction_broadcast: false','public_submission_open: false','token_movement: false','public_presale_activation: false'])assert.ok(participant.includes(text),"participant_control_contract_missing:"+text);
assert.ok(source("src/economic/buy_void_verified_payment_capacity_admission_v1.ts").includes("production_gate_ready: false"),"allocation_handoff_production_gate_must_remain_false");
assert.equal(AUTH.source_plan_only,true);
for(const key of ["canary_execution","credential_read","funds_movement","inventory_funding","mounted_operator_route_verified","payment_acceptance","presale_activation","public_delivery_activation","rpc_call","runtime_mutation","signing","transaction_broadcast","wallet_or_signer_access"])assert.equal(AUTH[key],false,key);
console.log(MARKER+"_GREEN");
console.log("plan_id="+PLAN_ID);
console.log("source_binding_count="+Object.keys(SOURCE_BINDINGS).length);
console.log("future_requirement_count="+REQUIRED.length);
console.log("canonical_asset=void_token_erc20");
console.log("canonical_chain_id=2050");
console.log("legacy_native_canary_retired=true");
console.log("canonical_erc20_mutation_critical_import_closure_bound=true");
console.log("historical_native_canary_proof_exact_blob_only=true");
console.log("historical_native_canary_proof_transitive_import_closure_claimed=false");
console.log("canonical_delivery_runtime_parent_mounted=true");
console.log("canonical_delivery_execution_ready=false");
console.log("presale_inventory_funding_ready=false");
console.log("live_canary_authorized_by_preflight=false");
console.log("participant_control_source_only=true");
console.log("canary_execution=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("public_delivery_activation=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
