#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_WC_VOID_PRODUCTION_READINESS_V1,
  classifyVoidWcVoidProductionReadinessV1,
} from "../tools/void-wc-void-production-readiness-v1.mjs";
import {
  VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1,
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "../tools/void-coupled-economic-successor-gate-v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";
import {
  VOID_WC_VOID_COUPLED_LAUNCH_READINESS_AUTHORITY_V1,
  VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1,
  classifyVoidWcVoidCoupledLaunchReadinessV1,
} from "../tools/void-wc-void-coupled-launch-readiness-v1.mjs";

const production = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/wc-void-production-candidate-v1.json",
    "utf8",
  ),
);
const coupled = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
    "utf8",
  ),
);
const successor = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    "utf8",
  ),
);

assert.equal(
  VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1,
  "VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1",
);

const canonicalHeld = classifyVoidWcVoidCoupledLaunchReadinessV1({
  production_candidate: production,
  coupled_candidate: coupled,
  successor_migration_candidate: successor,
});
assert.equal(canonicalHeld.ok, false);
assert.equal(canonicalHeld.status, "HOLD");
assert.equal(
  canonicalHeld.reason,
  "production_readiness_not_source_ready",
);
assert.equal(canonicalHeld.activation_authority, false);
assert.equal(canonicalHeld.funding_authority, false);
assert.equal(canonicalHeld.market_activation_authorized, false);
assert.equal(canonicalHeld.public_presale_activation_authorized, false);
assert.equal(canonicalHeld.funds_movement_authorized, false);

const productionReady = structuredClone(production);
Object.assign(productionReady, {
  status: "source_ready",
  market_vault_address:
    "0x1111111111111111111111111111111111111111",
  market_vault_runtime_code_sha256: "a".repeat(64),
  market_vault_independently_verified: true,
  inventory_funded: true,
  inventory_lock_proven: true,
  wc_settlement_adapter_independently_reviewed: true,
  wc_ledger_persistence_verified: true,
  quote_reserve_custody_verified: true,
  participant_opening_claim_policy_ready: true,
  duplicate_replay_protection_proven: true,
  bounded_canary_green: true,
  coupled_activation_ready: true,
});

const productionDecision =
  classifyVoidWcVoidProductionReadinessV1(productionReady);
assert.equal(productionDecision.ok, true);
assert.equal(productionDecision.status, "SOURCE_READY");
assert.equal(
  productionDecision.marker,
  VOID_WC_VOID_PRODUCTION_READINESS_V1,
);

const bareBooleanCannotBypass =
  classifyVoidWcVoidCoupledLaunchReadinessV1({
    production_candidate: productionReady,
    coupled_candidate: coupled,
    successor_migration_candidate: successor,
  });
assert.equal(bareBooleanCannotBypass.ok, false);
assert.equal(
  bareBooleanCannotBypass.reason,
  "coupled_readiness_not_source_ready",
);
assert.equal(
  bareBooleanCannotBypass.production_status,
  "SOURCE_READY",
);
assert.equal(
  bareBooleanCannotBypass.coupled_status,
  "HOLD",
);
assert.equal(productionReady.coupled_activation_ready, true);

const successorReady = structuredClone(successor);
Object.assign(successorReady.source_execution_layer, {
  latest_authoritative_snapshot_block: "40000",
  latest_authoritative_snapshot_block_hash:
    "0x" + "1".repeat(64),
  state_dump_sha256: "2".repeat(64),
  archive_manifest_sha256: "3".repeat(64),
});
Object.assign(successorReady.minimal_economic_state_policy, {
  voidtoken_successor_runtime_reviewed: true,
  voidtoken_successor_runtime_semantic_equivalence_verified: true,
  voidtoken_balance_storage_equivalence_verified: true,
  voidtoken_supply_storage_equivalence_verified: true,
  voidtoken_privileged_authority_mapping_verified: true,
  live_value_holder_census_complete: true,
  live_obligation_contract_census_complete: true,
  contract_holder_destination_manifest_ready: true,
  successor_custody_contracts_reviewed: true,
});
const premine =
  successorReady.token_conservation.reconciled_premine_reference_atomic;
Object.assign(successorReady.token_conservation, {
  final_snapshot_total_supply_atomic: premine,
  successor_total_supply_atomic: premine,
  final_snapshot_total_supply_verified: true,
  every_nonzero_holder_enumerated: true,
  every_holder_balance_conserved: true,
  aggregate_holder_sum_matches_final_snapshot_total_supply: true,
  successor_holder_sum_matches_successor_total_supply: true,
  source_successor_total_supply_equal: true,
  participant_eoa_balances_same_address_verified: true,
  contract_holder_migration_map_complete: true,
  contract_holder_value_conserved: true,
  no_value_left_trapped_in_retired_contracts: true,
});
Object.assign(successorReady.successor_authority, {
  ceremony_authority_mapping_verified: true,
  successor_direct_role_contracts_reviewed: true,
});
Object.assign(successorReady.ceremony_key_continuity, {
  ceremony_backup_continuity_verified: true,
  successor_role_to_ceremony_address_map_verified: true,
});
Object.assign(successorReady.funds_safety, {
  final_snapshot_identity_verified: true,
  independent_snapshot_reconciliation_1_green: true,
  independent_snapshot_reconciliation_2_green: true,
  offline_successor_equivalence_proven: true,
  source_successor_holder_balance_equivalence_proven: true,
  source_successor_total_supply_equivalence_proven: true,
  source_successor_open_obligation_equivalence_proven: true,
  unmapped_voidtoken_atomic_verified_zero: true,
  orphan_contract_held_void_atomic_verified_zero: true,
});
Object.assign(successorReady.native_gas_cleanup, {
  successor_native_gas_supply_accounted: true,
  successor_execution_fee_model_proven: true,
  participant_gas_path_proven: true,
});
Object.assign(successorReady.replay_and_epoch_safety, {
  legacy_write_rpc_disabled_before_successor_activation: true,
  execution_epoch_bound_in_public_gateway: true,
  privileged_signer_nonce_or_key_replay_fence_proven: true,
  pending_legacy_signed_transaction_census_complete: true,
  cross_epoch_replay_protection_proven: true,
});
Object.assign(successorReady.public_verification, {
  migration_manifest_content_addressed: true,
  source_snapshot_public_evidence_ready: true,
  successor_genesis_or_state_manifest_public_evidence_ready: true,
  successor_state_root_public_void_anchor_ready: true,
  public_balance_receipt_code_verification_ready: true,
});

const successorDecision =
  classifyVoidEconomicEvmSuccessorMigrationV1(successorReady);
assert.equal(successorDecision.ok, true);
assert.equal(successorDecision.status, "SOURCE_READY");

const coupledReady = structuredClone(coupled);
coupledReady.status = "SOURCE_READY";
for (const key of Object.keys(coupledReady.gates)) {
  coupledReady.gates[key] = true;
}

const coupledDecision =
  classifyVoidCoupledEconomicSuccessorGateV1(
    coupledReady,
    successorReady,
  );
assert.equal(coupledDecision.ok, true);
assert.equal(coupledDecision.status, "SOURCE_READY");
assert.equal(
  coupledDecision.marker,
  VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1,
);

const composedReady =
  classifyVoidWcVoidCoupledLaunchReadinessV1({
    production_candidate: productionReady,
    coupled_candidate: coupledReady,
    successor_migration_candidate: successorReady,
  });
assert.equal(composedReady.ok, true);
assert.equal(composedReady.status, "SOURCE_READY");
assert.match(
  composedReady.composition_id,
  /^sha256:[0-9a-f]{64}$/,
);
assert.equal(composedReady.production_status, "SOURCE_READY");
assert.equal(composedReady.coupled_status, "SOURCE_READY");
assert.equal(composedReady.chain_id, 2050);
assert.equal(composedReady.execution_epoch, 2);
assert.equal(composedReady.pair, "WC_VOID");
assert.equal(
  composedReady.protocol_void_inventory_atoms,
  "10000000000000000000000000",
);
assert.equal(composedReady.activation_authority, false);
assert.equal(composedReady.funding_authority, false);
assert.equal(composedReady.market_activation_authorized, false);
assert.equal(composedReady.public_presale_activation_authorized, false);
assert.equal(composedReady.funds_movement_authorized, false);

const reorderedReady =
  classifyVoidWcVoidCoupledLaunchReadinessV1({
    production_candidate: structuredClone(productionReady),
    coupled_candidate: structuredClone(coupledReady),
    successor_migration_candidate: structuredClone(successorReady),
  });
assert.equal(reorderedReady.composition_id, composedReady.composition_id);

for (const [key, value] of Object.entries(
  VOID_WC_VOID_COUPLED_LAUNCH_READINESS_AUTHORITY_V1,
)) {
  if (key === "source_classification_only") {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  "tools/void-wc-void-coupled-launch-readiness-v1.mjs",
  "utf8",
);
assert.match(
  source,
  /classifyVoidWcVoidProductionReadinessV1/,
);
assert.match(
  source,
  /classifyVoidCoupledEconomicSuccessorGateV1/,
);
assert.doesNotMatch(source, /JsonRpcProvider\s*\(/);
assert.doesNotMatch(source, /eth_sendRawTransaction/);
assert.doesNotMatch(source, /writeFileSync/);
assert.doesNotMatch(source, /new\s+Wallet\s*\(/);

console.log("VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1_PROOF_GREEN");
console.log("canonical_status=HOLD");
console.log("production_bare_coupled_boolean_bypass=false");
console.log("production_classifier_required=true");
console.log("canonical_coupled_classifier_required=true");
console.log("economic_successor_classifier_required=true");
console.log("synthetic_both_source_ready_composes=true");
console.log("activation_authority=false");
console.log("funding_authority=false");
console.log("funds_movement=false");
