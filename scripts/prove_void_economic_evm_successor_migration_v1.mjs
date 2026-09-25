#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  MAXIMUM_VOIDTOKEN_SUPPLY_ATOMIC_V1,
  RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
  REQUIRED_CANONICAL_CONTRACTS_V1,
  VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1,
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";

const candidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
    "utf8",
  ),
);

const deployed = JSON.parse(
  fs.readFileSync("ops/mainnet/void-mainnet.deployed.json", "utf8"),
);
const premine = JSON.parse(
  fs.readFileSync("ops/mainnet/mainnet0-premine-allocation.current.json", "utf8"),
);
const legacyRelayerSource = fs.readFileSync(
  "ops/wc-relayer-v1.cjs",
  "utf8",
);
const wcDevnetBootstrapSource = fs.readFileSync(
  "ops/mainnet0/wc-devnet-bootstrap-proof.sh",
  "utf8",
);

assert.equal(
  candidate.marker,
  VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1,
);
assert.equal(
  candidate.token_conservation.reconciled_premine_reference_atomic,
  RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
);
assert.equal(
  candidate.token_conservation.maximum_supply_atomic,
  MAXIMUM_VOIDTOKEN_SUPPLY_ATOMIC_V1,
);
assert.equal(candidate.token_conservation.final_snapshot_total_supply_atomic, null);
assert.equal(candidate.token_conservation.successor_total_supply_atomic, null);
assert.equal(
  candidate.token_conservation.legitimate_pre_freeze_emissions_must_be_preserved,
  true,
);
assert.equal(candidate.architecture_decision,
  "archive_anvil_migrate_authoritative_state_to_clean_successor");
assert.equal(candidate.source_execution_layer.implementation, "anvil");
assert.equal(
  candidate.source_execution_layer.disposition,
  "immutable_economic_genesis_archive",
);
assert.equal(candidate.source_execution_layer.future_write_authority, false);
assert.equal(candidate.successor_execution_layer.anvil_forbidden, true);
assert.equal(
  candidate.successor_execution_layer.default_prefunded_dev_accounts_forbidden,
  true,
);
assert.equal(
  candidate.successor_execution_layer.voidtoken_is_only_economic_void_asset,
  true,
);
assert.equal(
  candidate.successor_execution_layer.native_gas_is_economic_asset,
  false,
);
assert.equal(
  candidate.successor_execution_layer.participant_native_gas_balance_required,
  false,
);
assert.equal(
  candidate.dev_and_test_quarantine.legacy_wc_relayer_is_offchain_service,
  true,
);
assert.equal(
  candidate.dev_and_test_quarantine.legacy_wc_relayer_has_migration_authority,
  false,
);
assert.equal(candidate.dev_and_test_quarantine.devnet_wc_contracts_migrate, false);
assert.equal(
  candidate.dev_and_test_quarantine.default_anvil_accounts_migrate_with_balances,
  false,
);
assert.equal(
  candidate.dev_and_test_quarantine.known_anvil_private_key_transactions_allowed,
  false,
);

const held = classifyVoidEconomicEvmSuccessorMigrationV1(candidate);
assert.equal(held.ok, false);
assert.equal(held.status, "HOLD");
assert.equal(held.reason, "migration_gates_incomplete");
for (const gate of [
  "latest_authoritative_snapshot_block_required",
  "source_state_dump_sha256_required",
  "all_nonzero_voidtoken_holders_enumeration_required",
  "all_voidtoken_holder_balance_conservation_required",
  "required_contract_runtime_hash_verification_required",
  "required_contract_storage_root_verification_required",
  "admin_gate_authority_transition_required",
  "upgrade_staking_state_conservation_required",
  "successor_native_gas_supply_accounting_required",
  "successor_execution_fee_model_proof_required",
  "participant_execution_gas_path_proof_required",
  "legacy_write_rpc_disable_required",
  "privileged_signer_replay_fence_required",
  "pending_legacy_signed_transaction_census_required",
  "successor_state_root_void_anchor_required",
  "public_economic_verification_path_required",
]) {
  assert.ok(held.missing_gates.includes(gate), gate);
}
assert.equal(held.migration_authorized, false);
assert.equal(held.public_activation_authorized, false);
assert.equal(held.money_movement_authorized, false);

const roles = Object.fromEntries(
  candidate.canonical_contract_state_preservation.map((row) => [
    row.role,
    row.address.toLowerCase(),
  ]),
);
assert.deepEqual(roles, REQUIRED_CANONICAL_CONTRACTS_V1);


assert.equal(deployed.chainId, 2050);
for (const [role, address] of Object.entries({
  VoidToken: deployed.contracts.VoidToken,
  VoidTreasury: deployed.contracts.VoidTreasury,
  OpsTreasury: deployed.contracts.OpsTreasury,
  AdminGate: deployed.contracts.AdminGate,
  ConfigGate: deployed.contracts.ConfigGate,
  ValidatorSet: deployed.contracts.ValidatorSet,
  EmissionsController: deployed.contracts.EmissionsController,
  RewardEngine: deployed.contracts.RewardEngine,
})) {
  assert.equal(
    String(address).toLowerCase(),
    REQUIRED_CANONICAL_CONTRACTS_V1[role],
    role,
  );
}
assert.equal(
  premine.current_nonzero_holders.find(({ label }) => label === "UpgradeStaking")
    ?.address.toLowerCase(),
  REQUIRED_CANONICAL_CONTRACTS_V1.UpgradeStaking,
);
assert.equal(
  premine.total_supply_atomic,
  RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
);
assert.equal(premine.invariants.current_canonical_supply_conservation_preserved, true);
assert.match(legacyRelayerSource, /server\.listen\(/);
assert.match(legacyRelayerSource, /127\.0\.0\.1/);
assert.match(
  wcDevnetBootstrapSource,
  /"workCreditsRelayerV1": "0x0000000000000000000000000000000000000000"/,
);

const ready = structuredClone(candidate);
Object.assign(ready.source_execution_layer, {
  latest_authoritative_snapshot_block: "40000",
  latest_authoritative_snapshot_block_hash: "0x" + "1".repeat(64),
  state_dump_sha256: "2".repeat(64),
  archive_manifest_sha256: "3".repeat(64),
});
Object.assign(ready.token_conservation, {
  final_snapshot_total_supply_atomic:
    RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
  successor_total_supply_atomic:
    RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
  final_snapshot_total_supply_verified: true,
  every_nonzero_holder_enumerated: true,
  every_holder_balance_conserved: true,
  aggregate_holder_sum_matches_final_snapshot_total_supply: true,
  successor_holder_sum_matches_successor_total_supply: true,
  source_successor_total_supply_equal: true,
});
Object.assign(ready.contract_state_conservation, {
  required_contract_runtime_hashes_verified: true,
  required_contract_storage_roots_verified: true,
  required_contract_nonces_verified: true,
  canonical_role_bindings_verified: true,
  privileged_eoa_rotation_or_preservation_policy_verified: true,
  admin_gate_master_authority_preserved_or_explicitly_rotated: true,
  treasury_authority_preserved_or_explicitly_rotated: true,
  upgrade_staking_state_conserved: true,
});
Object.assign(ready.native_gas_cleanup, {
  successor_native_gas_supply_accounted: true,
  successor_execution_fee_model_proven: true,
  participant_gas_path_proven: true,
});
Object.assign(ready.replay_and_epoch_safety, {
  legacy_write_rpc_disabled_before_successor_activation: true,
  execution_epoch_bound_in_public_gateway: true,
  privileged_signer_nonce_or_key_replay_fence_proven: true,
  pending_legacy_signed_transaction_census_complete: true,
  cross_epoch_replay_protection_proven: true,
});
Object.assign(ready.public_verification, {
  migration_manifest_content_addressed: true,
  source_snapshot_public_evidence_ready: true,
  successor_genesis_or_state_manifest_public_evidence_ready: true,
  successor_state_root_public_void_anchor_ready: true,
  public_balance_receipt_code_verification_ready: true,
});

const readyDecision =
  classifyVoidEconomicEvmSuccessorMigrationV1(ready);
assert.equal(readyDecision.ok, true);
assert.equal(readyDecision.status, "SOURCE_READY");
assert.equal(readyDecision.execution_epoch, 2);
assert.equal(readyDecision.chain_id, 2050);
assert.equal(
  readyDecision.required_contract_count,
  Object.keys(REQUIRED_CANONICAL_CONTRACTS_V1).length,
);
assert.equal(
  readyDecision.voidtoken_final_snapshot_total_supply_atomic,
  RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
);
assert.equal(readyDecision.legacy_wc_relayer_migrates, false);
assert.equal(readyDecision.devnet_wc_contracts_migrate, false);
assert.equal(readyDecision.native_gas_is_economic_asset, false);
assert.equal(readyDecision.migration_authorized, false);
assert.equal(readyDecision.public_activation_authorized, false);
assert.equal(readyDecision.money_movement_authorized, false);

{
  const bad = structuredClone(candidate);
  bad.canonical_contract_state_preservation[0].address =
    "0x1111111111111111111111111111111111111111";
  const result = classifyVoidEconomicEvmSuccessorMigrationV1(bad);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "canonical_contract_set_mismatch");
}

{
  const bad = structuredClone(candidate);
  bad.token_conservation.reconciled_premine_reference_atomic = "1";
  assert.throws(
    () => classifyVoidEconomicEvmSuccessorMigrationV1(bad),
    /reconciled_premine_reference_mismatch/,
  );
}

{
  const bad = structuredClone(candidate);
  bad.dev_and_test_quarantine.default_anvil_accounts_migrate_with_balances =
    true;
  assert.throws(
    () => classifyVoidEconomicEvmSuccessorMigrationV1(bad),
    /anvil_dev_balance_migration_forbidden/,
  );
}

{
  const bad = structuredClone(candidate);
  bad.successor_execution_layer.native_gas_is_economic_asset = true;
  assert.throws(
    () => classifyVoidEconomicEvmSuccessorMigrationV1(bad),
    /native_gas_must_not_be_economic_asset/,
  );
}

{
  const bad = structuredClone(candidate);
  bad.launch_authority.transaction_broadcast = true;
  assert.throws(
    () => classifyVoidEconomicEvmSuccessorMigrationV1(bad),
    /authority_must_remain_false:transaction_broadcast/,
  );
}

console.log("VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1_PROOF_GREEN");
console.log("architecture=archive_anvil_migrate_clean_successor");
console.log("legacy_anvil_future_write_authority=false");
console.log("reconciled_premine_reference_atomic=333333333000000000000000000");
console.log("maximum_voidtoken_supply_atomic=666666666000000000000000000");
console.log("migration_supply_rule=final_live_supply_equals_successor_supply");
console.log("frozen_deployment_addresses_cross_checked=true");
console.log("reconciled_premine_supply_cross_checked=true");
console.log("all_voidtoken_holders_must_be_conserved=true");
console.log("canonical_contract_addresses_must_be_preserved=true");
console.log("admin_gate_state_must_be_preserved_or_explicitly_rotated=true");
console.log("upgrade_staking_state_must_be_conserved=true");
console.log("legacy_wc_relayer_migrates=false");
console.log("devnet_wc_contracts_migrate=false");
console.log("default_anvil_accounts_migrate_with_balances=false");
console.log("voidtoken_is_only_economic_void_asset=true");
console.log("native_gas_is_economic_asset=false");
console.log("raw_public_rpc_allowed=false");
console.log("public_read_gateway_required=true");
console.log("bounded_signed_submission_gateway_required=true");
console.log("public_void_state_anchor_required=true");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_moved=false");
