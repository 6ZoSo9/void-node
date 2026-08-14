import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1,
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1,
} from "../src/economic/buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.js";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const contract = VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1;
assert.equal(contract.marker, VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1);
assert.equal(contract.status, "source_ready");
assert.equal(contract.canonical_chain_id, "2050");
assert.equal(contract.canonical_asset, "void_token_erc20");
assert.equal(contract.prerequisite_source_truth.canonical_delivery_dependency_bootstrap_ready, true);
assert.equal(contract.prerequisite_source_truth.erc20_transaction_preparation_execution_state_ready, true);
assert.equal(contract.prerequisite_source_truth.erc20_execution_composition_ready, true);
assert.equal(contract.prerequisite_source_truth.caller_supplied_transaction_plan_forbidden, true);
assert.equal(contract.prerequisite_source_truth.canonical_erc20_receipt_to_record_confirmed_ready, true);
assert.equal(contract.prerequisite_source_truth.existing_terminal_closeout_reused, true);
assert.equal(contract.canonical_delivery_runtime_activation_ready, false);
assert.equal(contract.production_configuration_values_verified, false);
assert.equal(contract.production_credential_binding_ready, false);
assert.equal(contract.canonical_delivery_runtime_parent_mounted, false);
assert.equal(contract.canonical_delivery_execution_ready, false);
assert.equal(contract.presale_inventory_funding_ready, false);
assert.equal(contract.next_gate, "production_configuration_verification_and_runtime_mount_authorization");

const runtime = read(contract.runtime_source_path);
const composition = read(contract.execution_composition_source_path);
const dependency = read(contract.dependency_bootstrap_source_path);
const signer = read("src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts");
const parent = read(contract.parent_source_path);

for (const env of contract.runtime_configuration_contract.required_policy_envs) {
  assert.equal(runtime.includes(env) || composition.includes(env), true, `missing required runtime env ${env}`);
}
for (const marker of [
  "server_derived_transaction_plan: true",
  "caller_supplied_transaction_plan: false",
  '"plan"',
  "durable_nonce_reservation_required: true",
  "signed_hash_custody_required: true",
  "saga_write_ahead_broadcast_intent_required: true",
  "erc20_receipt_reconciliation_required: true",
  "canonical_record_confirmed_required: true",
  "existing_terminal_closeout_reused: true",
]) assert.equal(runtime.includes(marker), true, `runtime contract drift: ${marker}`);
assert.equal(runtime.includes("const plan = (body as any).plan"), false);
assert.equal(runtime.includes("submission_idempotency_key: (body as any)"), false);
for (const marker of [
  "server_derived_transaction_plan: true",
  "caller_transaction_plan: false",
  "exact_pending_nonce_reservation: true",
  "wallet_scoped_nonce_lock: true",
  "signed_hash_custody_persisted_before_broadcast: true",
  "write_ahead_saga_broadcast_intent: true",
  "no_rebroadcast_after_ambiguous_submission: true",
  "canonical_record_confirmed_reused: true",
  "existing_saga_terminal_closeout_reused: true",
]) assert.equal(composition.includes(marker), true, `composition contract drift: ${marker}`);
assert.equal(composition.includes("runBuyVoidErc20TransactionPreparationPlannerV1"), true);
assert.equal(composition.includes("runBuyVoidErc20DeliveryReceiptReconcilerV1"), true);
assert.equal(composition.includes('action: "record_confirmed"'), true);
assert.equal(composition.includes("runSagaSupervisorTickV1"), true);

assert.equal(dependency.includes("fixed_systemd_credential_id_reused_when_signing: true"), true);
assert.equal(signer.includes(`"${contract.runtime_configuration_contract.fixed_signer_credential_id}"`), true);
assert.equal(parent.includes("canonical_delivery_runtime_parent_mounted: false"), true);
assert.equal(parent.includes("canonical_delivery_execution_ready: false"), true);
assert.equal(parent.includes("presale_inventory_funding_ready: false"), true);
assert.doesNotMatch(parent, /(?:import|from)\s+["']\.\/buy_void_delivery_runtime_integration_v1\.js["']/);

for (const [key, value] of Object.entries(contract.authority)) {
  assert.equal(key === "source_only_contract" ? value : !value, true, `authority mismatch ${key}`);
}
console.log("VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1_PROOF_GREEN");
console.log("erc20_execution_composition_ready=1");
console.log("caller_supplied_transaction_plan=0");
console.log("runtime_activation_performed=0");
console.log("production_configuration_values_verified=0");
console.log("production_credential_binding_ready=0");
console.log("canonical_delivery_runtime_parent_mounted=0");
console.log("canonical_delivery_execution_ready=0");
console.log("presale_inventory_funding_ready=0");
console.log("money_movement=0");
