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
assert.equal(
  contract.canonical_production_credential_binding_evidence_ready,
  true,
);
assert.equal(
  contract.canonical_production_credential_binding_evidence
    .exact_wallet_binding,
  true,
);
assert.equal(
  contract.canonical_production_credential_binding_evidence
    .interpretation.clone_local_credential_binding_inferred,
  false,
);
assert.equal(contract.dormant_dependency_injection_source_ready, true);
assert.equal(contract.dependency_injection_runtime_ready, false);
assert.equal(contract.canonical_delivery_runtime_parent_mounted, true);
assert.equal(contract.canonical_delivery_execution_ready, false);
assert.equal(contract.presale_inventory_funding_ready, false);
assert.equal(
  contract.next_gate,
  "disabled_dependency_injection_runtime_authorization",
);
assert.equal(
  contract.amount_unit_contract.max_amount_unit_domain,
  "fulfillment_units_6_decimal",
);
assert.equal(
  contract.amount_unit_contract.fulfillment_unit_decimals,
  6,
);
assert.equal(
  contract.amount_unit_contract.token_atom_decimals,
  18,
);
assert.equal(
  contract.amount_unit_contract.token_atom_multiplier,
  "1000000000000",
);
assert.equal(
  contract.amount_unit_contract
    .max_amount_must_not_exceed_saga_reservation_cap,
  true,
);
assert.equal(
  contract.receipt_confirmation_domain_contract
    .generic_saga_max_confirmations,
  "1000000",
);
assert.equal(
  contract.receipt_confirmation_domain_contract
    .preflight_before_record_confirmed,
  true,
);

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
  "canonical_planner_policy_validation_required: true",
  "durable_nonce_reservation_required: true",
  "signed_hash_custody_required: true",
  "saga_write_ahead_broadcast_intent_required: true",
  "erc20_receipt_reconciliation_required: true",
  "canonical_record_confirmed_required: true",
  "existing_terminal_closeout_reused: true",
  "const ALLOWED_INPUT_KEYS = new Set([",
]) {
  assert.equal(
    runtime.includes(marker),
    true,
    `runtime contract drift: ${marker}`,
  );
}
for (const allowedKey of [
  "action",
  "attempt_id",
  "apply",
  "confirmation",
]) {
  assert.equal(
    runtime.includes(`"${allowedKey}"`),
    true,
    `runtime allowlist missing ${allowedKey}`,
  );
}
assert.doesNotMatch(runtime, /^\s*"plan",\s*$/m);
assert.doesNotMatch(runtime, /^\s*"transaction_plan",\s*$/m);
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
assert.equal(
  composition.includes(
    "validateBuyVoidErc20TransactionPreparationPlannerPolicyV1",
  ),
  true,
);
assert.equal(
  composition.includes(
    "erc20_execution_max_amount_exceeds_saga_fulfillment_unit_cap",
  ),
  true,
);
assert.equal(
  composition.includes(
    "erc20_receipt_confirmation_count_out_of_saga_range",
  ),
  true,
);
const confirmationPreflight = composition.indexOf(
  "erc20_receipt_confirmation_count_out_of_saga_range",
);
const recordConfirmed = composition.indexOf(
  'action: "record_confirmed"',
);
assert.ok(
  confirmationPreflight >= 0 &&
    recordConfirmed > confirmationPreflight,
  "confirmation range must be held before canonical record_confirmed",
);
assert.equal(composition.includes("runBuyVoidErc20DeliveryReceiptReconcilerV1"), true);
assert.equal(composition.includes('action: "record_confirmed"'), true);
assert.equal(composition.includes("runSagaSupervisorTickV1"), true);

assert.equal(dependency.includes("fixed_systemd_credential_id_reused_when_signing: true"), true);
assert.equal(signer.includes(`"${contract.runtime_configuration_contract.fixed_signer_credential_id}"`), true);
assert.equal(parent.includes("canonical_delivery_runtime_parent_mounted: true"), true);
assert.equal(parent.includes("canonical_delivery_execution_ready: false"), true);
assert.equal(parent.includes("presale_inventory_funding_ready: false"), true);
assert.match(
  parent,
  /from "\.\/buy_void_delivery_runtime_integration_v1\.js";/,
);

for (const [key, value] of Object.entries(contract.authority)) {
  assert.equal(key === "source_only_contract" ? value : !value, true, `authority mismatch ${key}`);
}
console.log("VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1_PROOF_GREEN");
console.log("erc20_execution_composition_ready=1");
console.log("caller_supplied_transaction_plan=0");
console.log("canonical_planner_policy_validator_reused=1");
console.log("max_amount_unit_domain=fulfillment_units_6_decimal");
console.log("token_atom_multiplier=1000000000000");
console.log("confirmation_range_preflight_before_record_confirmed=1");
console.log("runtime_activation_performed=0");
console.log("production_configuration_values_verified=0");
console.log("production_credential_binding_ready=0");
console.log("canonical_production_credential_binding_evidence_ready=1");
console.log("dormant_dependency_injection_source_ready=1");
console.log("dependency_injection_runtime_ready=0");
console.log("canonical_delivery_runtime_parent_mounted=1");
console.log("canonical_delivery_execution_ready=0");
console.log("presale_inventory_funding_ready=0");
console.log("money_movement=0");
