#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const deployed = JSON.parse(
  fs.readFileSync("ops/mainnet/void-mainnet.deployed.json", "utf8"),
);
const candidate = JSON.parse(
  fs.readFileSync("ops/mainnet0/wc-void-production-candidate-v1.json", "utf8"),
);
const privateCheckpoint = fs.readFileSync(
  "docs/operations/void-private-chain2050-checkpoint-v1.md",
  "utf8",
);
const nativeStore = fs.readFileSync(
  "docs/operators/native-account-state-store-contract-v1.md",
  "utf8",
);
const presaleContract = fs.readFileSync(
  "src/economic/buy_void_payment_keyed_runtime_activation_configuration_contract_v1.ts",
  "utf8",
);
const identityDoc = fs.readFileSync(
  "docs/operators/coupled-economic-execution-layer-identity-v1.md",
  "utf8",
);
const knownDevFundingEvidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-sovereign-owner-gas-funding-request-evidence-v1.json",
    "utf8",
  ),
);
const selectorDeployment = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/void-private-chain2050-production-selector-deployment-v1.json",
    "utf8",
  ),
);
const laterEconomicReceipt = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/chain2050-role-authority-sovereign-owner-gas-funding-receipt-evidence-v1.json",
    "utf8",
  ),
);

assert.equal(deployed.chainId, 2050);
assert.equal(deployed.source_of_truth_rpc, "http://127.0.0.1:8545");
assert.match(
  String(deployed.contracts.VoidToken || "").toLowerCase(),
  /^0x470075b85352eb86f7d089fb9ba88945f12aad94$/,
);

assert.match(
  privateCheckpoint,
  /private Chain-2050 Anvil RPC used by bounded VOID economic tooling/,
);
assert.match(privateCheckpoint, /anvil_dumpState/);

assert.match(nativeStore, /source-only and unmounted/);
assert.match(nativeStore, /module mounted: false/);
assert.match(nativeStore, /canonical block executor wired: false/);

assert.equal(
  String(knownDevFundingEvidence.source?.address || "").toLowerCase(),
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
);
assert.equal(
  knownDevFundingEvidence.source?.kind,
  "standard_anvil_prefunded_dev_account",
);
assert.match(
  String(knownDevFundingEvidence.fresh_observation?.source_balance_wei || ""),
  /^(0|[1-9][0-9]*)$/,
);
assert.equal(
  knownDevFundingEvidence.fresh_observation?.source_latest_nonce,
  knownDevFundingEvidence.transaction?.nonce,
);

assert.equal(selectorDeployment.source_only, true);
assert.equal(selectorDeployment.installation_performed, false);
assert.equal(selectorDeployment.checkpoint_promotion_performed, false);
assert.equal(selectorDeployment.production_state_load_performed, false);
assert.equal(
  selectorDeployment.startup?.stale_baseline_fallback_allowed,
  false,
);
const plannedCheckpointHeight = BigInt(
  String(selectorDeployment.checkpoint_promotion_plan?.block_number || "0"),
);
const laterAcceptedEconomicHeight = BigInt(
  String(laterEconomicReceipt.receipt?.block_number || "0"),
);
assert.equal(plannedCheckpointHeight, 37371n);
assert.ok(
  laterAcceptedEconomicHeight >= 37391n,
  "later accepted economic receipt must be at least block 37391",
);
assert.ok(
  plannedCheckpointHeight < laterAcceptedEconomicHeight,
  "planned checkpoint must be proven stale relative to later accepted economic history",
);

assert.equal(candidate.economic_execution_layer_identity_resolved, false);
assert.equal(
  candidate.economic_execution_layer_public_verification_ready,
  false,
);
assert.equal(candidate.native_gas_currency_supply_accounting_ready, false);
assert.equal(candidate.known_anvil_prefunded_dev_accounts_neutralized, false);
assert.equal(candidate.known_anvil_dev_private_key_submission_blocked, false);
assert.equal(
  candidate.native_gas_genesis_supply_and_known_key_accounts_reconciled,
  false,
);
assert.equal(candidate.private_evm_selector_durability_deployed, false);
assert.equal(candidate.latest_economic_state_durable_checkpoint_ready, false);
assert.equal(candidate.private_evm_restart_recovery_proven, false);
assert.equal(candidate.private_evm_stale_state_fallback_impossible, false);
assert.equal(candidate.economic_mutation_durability_gate_active, false);
assert.equal(candidate.participant_post_purchase_voidtoken_control_ready, false);
assert.equal(candidate.participant_voidtoken_transfer_submission_path_ready, false);
assert.equal(
  candidate.participant_native_gas_access_or_paymaster_model_ready,
  false,
);

for (const marker of [
  "economic_execution_layer_identity_not_resolved",
  "economic_execution_layer_public_verification_not_ready",
  "native_gas_currency_supply_accounting_not_ready",
]) {
  assert.ok(presaleContract.includes(marker), marker);
}

for (const marker of [
  "current_economic_rpc_is_private_anvil: true",
  "public_p2p_chain_and_private_evm_relationship_requires_explicit_resolution: true",
  "independent_public_voidtoken_verification_required: true",
  "native_gas_currency_supply_accounting_required: true",
]) {
  assert.ok(presaleContract.includes(marker), marker);
}

assert.match(
  identityDoc,
  /Current audited source does \*\*not\*\* prove that the private Anvil block\/state\s+history is the same history as the public P2P\/block runtime/m,
);
assert.match(
  identityDoc,
  /economic_execution_layer_identity_resolved=false/,
);
assert.match(
  identityDoc,
  /economic_execution_layer_public_verification_ready=false/,
);
assert.match(
  identityDoc,
  /native_gas_currency_supply_accounting_ready=false/,
);
assert.match(
  identityDoc,
  /known_anvil_prefunded_dev_accounts_neutralized=false/,
);
assert.match(
  identityDoc,
  /known_anvil_dev_private_key_submission_blocked=false/,
);
assert.match(
  identityDoc,
  /native_gas_genesis_supply_and_known_key_accounts_reconciled=false/,
);
assert.match(identityDoc, /Known-key Anvil account boundary/);
assert.match(identityDoc, /Private EVM durability and restart boundary/);
assert.match(identityDoc, /37371/);
assert.match(identityDoc, /37391/);
assert.match(identityDoc, /private_evm_selector_durability_deployed=false/);
assert.match(identityDoc, /latest_economic_state_durable_checkpoint_ready=false/);
assert.match(identityDoc, /economic_mutation_durability_gate_active=false/);
assert.match(
  identityDoc,
  /participant_post_purchase_voidtoken_control_ready=false/,
);
assert.match(
  identityDoc,
  /participant_voidtoken_transfer_submission_path_ready=false/,
);
assert.match(
  identityDoc,
  /participant_native_gas_access_or_paymaster_model_ready=false/,
);

assert.match(identityDoc, /Explicit economic EVM layer/);
assert.match(identityDoc, /Canonical-chain migration/);
assert.match(identityDoc, /performs no RPC call/);

console.log("VOID_COUPLED_ECONOMIC_EXECUTION_LAYER_IDENTITY_V1_PROOF_GREEN");
console.log("economic_rpc_private_anvil=true");
console.log("public_private_execution_history_binding_proven=false");
console.log("native_account_store_runtime_mounted=false");
console.log("economic_execution_layer_identity_resolved=false");
console.log("economic_execution_layer_public_verification_ready=false");
console.log("native_gas_currency_supply_accounting_ready=false");
console.log("known_anvil_prefunded_dev_accounts_neutralized=false");
console.log("known_anvil_dev_private_key_submission_blocked=false");
console.log("native_gas_genesis_supply_and_known_key_accounts_reconciled=false");
console.log("planned_private_evm_checkpoint_height=37371");
console.log("later_accepted_economic_receipt_height_at_least=37391");
console.log("planned_private_evm_checkpoint_is_stale=true");
console.log("private_evm_selector_durability_deployed=false");
console.log("latest_economic_state_durable_checkpoint_ready=false");
console.log("private_evm_restart_recovery_proven=false");
console.log("private_evm_stale_state_fallback_impossible=false");
console.log("economic_mutation_durability_gate_active=false");
console.log("participant_post_purchase_voidtoken_control_ready=false");
console.log("participant_voidtoken_transfer_submission_path_ready=false");
console.log("participant_native_gas_access_or_paymaster_model_ready=false");
console.log("public_economic_activation_authorized=false");
console.log("funds_moved=false");
