#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  MAXIMUM_VOIDTOKEN_SUPPLY_ATOMIC_V1,
  RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
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
const ceremony = fs.readFileSync(
  "ops/mainnet/mainnet0-key-ceremony-result-20260523-122739.md",
  "utf8",
);
const legacyRelayer = fs.readFileSync("ops/wc-relayer-v1.cjs", "utf8");
const bootstrap = fs.readFileSync(
  "script/mainnet_rebuild/VoidMainnetBootstrapDev.vaults-rebuild.s.sol",
  "utf8",
);

assert.equal(candidate.marker, VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1);
assert.equal(
  candidate.architecture_decision,
  "archive_anvil_migrate_minimal_economic_state_to_clean_successor",
);

assert.equal(
  candidate.token_conservation.reconciled_premine_reference_atomic,
  RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
);
assert.equal(
  candidate.token_conservation.maximum_supply_atomic,
  MAXIMUM_VOIDTOKEN_SUPPLY_ATOMIC_V1,
);
assert.equal(
  premine.total_supply_atomic,
  RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
);
assert.equal(premine.invariants.current_canonical_supply_conservation_preserved, true);

assert.equal(candidate.successor_authority.admin_gate_required, false);
assert.equal(candidate.successor_authority.config_gate_required, false);
assert.equal(candidate.successor_authority.legacy_admin_gate_master_migrates, false);
assert.equal(
  candidate.successor_authority.fresh_ceremony_authority_mapping_required,
  true,
);
assert.equal(
  candidate.successor_authority.ceremony_public_address_artifact,
  "ops/mainnet/mainnet0-key-ceremony-result-20260523-122739.md",
);

assert.equal(candidate.dev_and_test_quarantine.admin_gate_migrates, false);
assert.equal(candidate.dev_and_test_quarantine.config_gate_migrates, false);
assert.equal(
  candidate.dev_and_test_quarantine.legacy_bootstrap_zero_balance_contracts_migrate,
  false,
);
assert.equal(candidate.dev_and_test_quarantine.legacy_wc_relayer_has_migration_authority, false);

assert.equal(
  candidate.minimal_economic_state_policy.preserve_old_contract_architecture_by_default,
  false,
);
assert.equal(
  candidate.minimal_economic_state_policy.participant_eoa_balance_same_address_required,
  true,
);
assert.equal(
  candidate.minimal_economic_state_policy.contract_holder_balance_remap_allowed_only_by_explicit_manifest,
  true,
);
assert.equal(
  candidate.minimal_economic_state_policy.contract_code_migrates_only_if_required_to_control_live_value_or_obligation,
  true,
);

assert.equal(
  candidate.source_contract_disposition.AdminGate,
  "archive_only_no_successor_authority",
);
assert.equal(
  candidate.source_contract_disposition.ConfigGate,
  "archive_only_no_successor_authority",
);

assert.match(ceremony, /records public addresses only/i);
assert.match(ceremony, /does not authorize AdminGate or UpdateGate authority transfer/i);
assert.match(legacyRelayer, /server\.listen\(/);
assert.match(legacyRelayer, /127\.0\.0\.1/);
assert.match(bootstrap, /AdminGate\.systemContracts keys/);
assert.match(bootstrap, /not yet wiring/i);

assert.equal(
  String(deployed.contracts.VoidToken).toLowerCase(),
  "0x470075b85352eb86f7d089fb9ba88945f12aad94",
);
assert.equal(
  premine.current_nonzero_holders.find(({ label }) => label === "UpgradeStaking")
    ?.balance_void,
  "126000",
);

const held = classifyVoidEconomicEvmSuccessorMigrationV1(candidate);
assert.equal(held.ok, false);
assert.equal(held.status, "HOLD");
assert.equal(held.reason, "migration_gates_incomplete");

for (const gate of [
  "latest_authoritative_snapshot_block_required",
  "live_value_holder_census_required",
  "live_obligation_contract_census_required",
  "contract_holder_destination_manifest_required",
  "successor_custody_contract_review_required",
  "final_snapshot_total_supply_atomic_required",
  "all_nonzero_holder_enumeration_required",
  "participant_eoa_same_address_balance_verification_required",
  "contract_holder_migration_map_required",
  "contract_holder_value_conservation_required",
  "retired_contract_value_zero_or_remapped_required",
  "ceremony_authority_mapping_verification_required",
  "successor_direct_role_contract_review_required",
  "successor_execution_fee_model_proof_required",
  "pending_legacy_signed_transaction_census_required",
  "successor_state_root_public_void_anchor_required",
]) {
  assert.ok(held.missing_gates.includes(gate), gate);
}

const ready = structuredClone(candidate);
Object.assign(ready.source_execution_layer, {
  latest_authoritative_snapshot_block: "40000",
  latest_authoritative_snapshot_block_hash: "0x" + "1".repeat(64),
  state_dump_sha256: "2".repeat(64),
  archive_manifest_sha256: "3".repeat(64),
});
Object.assign(ready.minimal_economic_state_policy, {
  live_value_holder_census_complete: true,
  live_obligation_contract_census_complete: true,
  contract_holder_destination_manifest_ready: true,
  successor_custody_contracts_reviewed: true,
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
  participant_eoa_balances_same_address_verified: true,
  contract_holder_migration_map_complete: true,
  contract_holder_value_conserved: true,
  no_value_left_trapped_in_retired_contracts: true,
});
Object.assign(ready.successor_authority, {
  ceremony_authority_mapping_verified: true,
  successor_direct_role_contracts_reviewed: true,
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

const sourceReady = classifyVoidEconomicEvmSuccessorMigrationV1(ready);
assert.equal(sourceReady.ok, true);
assert.equal(sourceReady.status, "SOURCE_READY");
assert.equal(sourceReady.admin_gate_migrates, false);
assert.equal(sourceReady.config_gate_migrates, false);
assert.equal(sourceReady.legacy_wc_relayer_migrates, false);
assert.equal(sourceReady.participant_eoa_balances_same_address, true);
assert.equal(sourceReady.contract_holder_value_remap_manifest_ready, true);
assert.equal(sourceReady.native_gas_is_economic_asset, false);
assert.equal(sourceReady.migration_authorized, false);
assert.equal(sourceReady.public_activation_authorized, false);
assert.equal(sourceReady.money_movement_authorized, false);

{
  const bad = structuredClone(candidate);
  bad.successor_authority.admin_gate_required = true;
  assert.throws(
    () => classifyVoidEconomicEvmSuccessorMigrationV1(bad),
    /successor_admin_gate_forbidden/,
  );
}

{
  const bad = structuredClone(candidate);
  bad.dev_and_test_quarantine.admin_gate_migrates = true;
  assert.throws(
    () => classifyVoidEconomicEvmSuccessorMigrationV1(bad),
    /admin_gate_migration_forbidden/,
  );
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
  bad.launch_authority.transaction_broadcast = true;
  assert.throws(
    () => classifyVoidEconomicEvmSuccessorMigrationV1(bad),
    /authority_must_remain_false:transaction_broadcast/,
  );
}

console.log("VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1_PROOF_GREEN");
console.log("architecture=minimal_economic_state_migration");
console.log("old_anvil=immutable_archive");
console.log("admin_gate_migrates=false");
console.log("config_gate_migrates=false");
console.log("legacy_wc_relayer_migrates=false");
console.log("participant_eoa_balance_same_address_required=true");
console.log("contract_holder_value_uses_explicit_successor_mapping=true");
console.log("premine_reference_void=333333333");
console.log("migration_supply_rule=final_live_supply_equals_successor_supply");
console.log("fresh_ceremony_authority_mapping_required=true");
console.log("native_gas_is_economic_asset=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_moved=false");
