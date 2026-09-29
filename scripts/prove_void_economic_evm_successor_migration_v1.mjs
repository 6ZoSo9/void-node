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
const isolatedEquivalence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-isolated-successor-equivalence-evidence-v1.json",
    "utf8",
  ),
);
const besuEquivalence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-besu-state-equivalence-evidence-v1.json",
    "utf8",
  ),
);
const freeGasEvidence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-besu-free-gas-evidence-v2.json",
    "utf8",
  ),
);
const qbftBinding = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
    "utf8",
  ),
);
const nonceContinuity = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-besu-nonce-continuity-evidence-v1.json",
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
const ceremonyBackup = fs.readFileSync(
  "ops/mainnet/mainnet0-key-ceremony-backup-voidkey2-20260523-122135.md",
  "utf8",
);
const ceremonyBackupContinuity = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-ceremony-backup-continuity-evidence-v1.json",
    "utf8",
  ),
);
const privilegedReplayFence = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/economic-epoch2-privileged-signer-replay-fence-v1.json",
    "utf8",
  ),
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
  candidate.minimal_economic_state_policy.voidtoken_same_address_required,
  true,
);
assert.equal(
  candidate.minimal_economic_state_policy.voidtoken_runtime_identity_required,
  false,
);
assert.equal(
  candidate.minimal_economic_state_policy.voidtoken_legacy_runtime_reuse_forbidden,
  true,
);
assert.equal(
  candidate.minimal_economic_state_policy.voidtoken_successor_runtime_review_required,
  true,
);
assert.equal(
  candidate.minimal_economic_state_policy
    .voidtoken_successor_runtime_semantic_equivalence_required,
  true,
);
assert.equal(
  candidate.minimal_economic_state_policy.voidtoken_successor_runtime_reviewed,
  true,
);
assert.equal(
  candidate.minimal_economic_state_policy
    .voidtoken_successor_runtime_semantic_equivalence_verified,
  true,
);
assert.equal(
  candidate.minimal_economic_state_policy.voidtoken_successor_runtime_source_path,
  "contracts/epoch2/VoidEpoch2TokenV1.sol",
);
assert.equal(
  candidate.minimal_economic_state_policy
    .voidtoken_successor_runtime_source_git_blob_sha1,
  "7c4297aadbc17b6214b4dde1f1766523cb499923",
);
assert.equal(
  candidate.minimal_economic_state_policy.voidtoken_balance_and_supply_state_exact,
  true,
);
assert.equal(
  candidate.minimal_economic_state_policy
    .voidtoken_privileged_authority_may_change_only_to_verified_ceremony_address,
  true,
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
  candidate.source_contract_disposition.VoidToken,
  "preserve_same_address_balance_supply_rebuild_runtime_with_ceremony_owner_and_prove_semantic_equivalence",
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
assert.match(ceremonyBackup, /status: backup_verified/i);
assert.match(ceremonyBackup, /backup_verified_sha256: true/i);
assert.match(ceremonyBackup, /encrypted LUKS volume labeled VOIDKEY2/i);
assert.match(ceremonyBackup, /does not authorize funding/i);
assert.equal(
  ceremonyBackupContinuity.marker,
  "VOID_ECONOMIC_EPOCH2_CEREMONY_BACKUP_CONTINUITY_EVIDENCE_V1",
);
assert.equal(ceremonyBackupContinuity.status, "GREEN");
assert.equal(
  ceremonyBackupContinuity.verifier.script_sha256,
  "bd5415c5eb147b1175e544366307450796167d0dc6ae8a4973ca01c3cf1a2861",
);
assert.equal(ceremonyBackupContinuity.verification.manifest_all_sha256_verified, true);
assert.equal(
  ceremonyBackupContinuity.verification.public_address_set_matches_may23_ceremony,
  true,
);
assert.equal(
  ceremonyBackupContinuity.verification.public_role_set_matches_may23_ceremony,
  true,
);
assert.equal(
  ceremonyBackupContinuity.verification.ceremony_backup_continuity_verified,
  true,
);
assert.equal(ceremonyBackupContinuity.privacy.private_member_contents_printed, false);
assert.equal(ceremonyBackupContinuity.privacy.private_member_contents_parsed, false);
assert.equal(ceremonyBackupContinuity.privacy.private_member_bytes_hashed_only, true);
assert.equal(ceremonyBackupContinuity.privacy.credential_decryption, false);
assert.equal(ceremonyBackupContinuity.privacy.credential_export, false);
assert.equal(ceremonyBackupContinuity.authority.transaction_signing, false);
assert.equal(ceremonyBackupContinuity.authority.transaction_broadcast, false);
assert.equal(ceremonyBackupContinuity.authority.chain2050_write, false);
assert.equal(ceremonyBackupContinuity.authority.funds_movement, false);
assert.equal(ceremonyBackupContinuity.authority.migration_authorized, false);
assert.equal(ceremonyBackupContinuity.authority.public_activation_authorized, false);
assert.equal(
  candidate.ceremony_key_continuity.ceremony_backup_continuity_evidence,
  "ops/mainnet0/economic-epoch2-ceremony-backup-continuity-evidence-v1.json",
);
assert.equal(
  candidate.ceremony_key_continuity.ceremony_backup_continuity_verified,
  true,
);

const expectedCeremonyAddresses = Object.fromEntries(
  [...ceremony.matchAll(/^([a-z0-9_]+_public_address):\s*(0x[0-9a-fA-F]{40})$/gim)]
    .map((match) => [match[1].replace(/_public_address$/, ""), match[2].toLowerCase()]),
);
assert.equal(
  expectedCeremonyAddresses.premine_treasury_primary,
  candidate.ceremony_key_continuity.recorded_public_addresses.premine_treasury_primary,
);
assert.equal(
  expectedCeremonyAddresses.premine_treasury_network_pool,
  candidate.ceremony_key_continuity.recorded_public_addresses.premine_treasury_network_pool,
);
assert.equal(
  expectedCeremonyAddresses.premine_treasury_bootstrap_liquidity,
  candidate.ceremony_key_continuity.recorded_public_addresses.premine_treasury_bootstrap_liquidity,
);
assert.equal(
  expectedCeremonyAddresses.premine_treasury_grants,
  candidate.ceremony_key_continuity.recorded_public_addresses.premine_treasury_grants,
);
assert.equal(
  expectedCeremonyAddresses.premine_treasury_reserve,
  candidate.ceremony_key_continuity.recorded_public_addresses.premine_treasury_reserve,
);
assert.equal(
  expectedCeremonyAddresses.admingate_master,
  candidate.ceremony_key_continuity.recorded_public_addresses.admingate_master,
);
assert.equal(
  expectedCeremonyAddresses.updategate_signer_1,
  candidate.ceremony_key_continuity.recorded_public_addresses.updategate_signer_1,
);
assert.equal(
  expectedCeremonyAddresses.updategate_signer_2,
  candidate.ceremony_key_continuity.recorded_public_addresses.updategate_signer_2,
);
assert.equal(
  expectedCeremonyAddresses.updategate_signer_3,
  candidate.ceremony_key_continuity.recorded_public_addresses.updategate_signer_3,
);
assert.equal(
  expectedCeremonyAddresses.launch_operator_signer,
  candidate.ceremony_key_continuity.recorded_public_addresses.launch_operator_signer,
);
assert.equal(
  expectedCeremonyAddresses.cold_backup_signer_1,
  candidate.ceremony_key_continuity.recorded_public_addresses.cold_backup_signer_1,
);
assert.equal(
  expectedCeremonyAddresses.cold_backup_signer_2,
  candidate.ceremony_key_continuity.recorded_public_addresses.cold_backup_signer_2,
);
assert.equal(
  expectedCeremonyAddresses.cold_backup_signer_3,
  candidate.ceremony_key_continuity.recorded_public_addresses.cold_backup_signer_3,
);
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
  "offline_successor_equivalence_proof_required",
  "cross_epoch_replay_protection_required",
  "successor_state_root_public_void_anchor_required",
  "public_economic_verification_path_required",
]) {
  assert.ok(held.missing_gates.includes(gate), gate);
}
assert.equal(
  held.missing_gates.includes(
    "production_validator_epoch_domain_enforcement_required",
  ),
  false,
);

for (const gate of [
  "latest_authoritative_snapshot_block_required",
  "latest_authoritative_snapshot_block_hash_required",
  "source_state_dump_sha256_required",
  "archive_manifest_sha256_required",
  "live_value_holder_census_required",
  "live_obligation_contract_census_required",
  "final_snapshot_total_supply_atomic_required",
  "final_snapshot_total_supply_verification_required",
  "all_nonzero_holder_enumeration_required",
  "source_holder_sum_supply_conservation_required",
  "final_snapshot_identity_verification_required",
  "independent_snapshot_reconciliation_1_required",
  "independent_snapshot_reconciliation_2_required",
  "legacy_write_rpc_disable_required",
  "source_snapshot_public_evidence_required",
  "successor_state_manifest_public_evidence_required",
  "voidtoken_privileged_authority_mapping_required",
  "contract_holder_destination_manifest_required",
  "successor_custody_contract_review_required",
  "voidtoken_successor_runtime_review_required",
  "voidtoken_successor_runtime_semantic_equivalence_required",
  "voidtoken_balance_storage_equivalence_required",
  "voidtoken_supply_storage_equivalence_required",
  "successor_total_supply_atomic_required",
  "all_holder_balance_conservation_required",
  "successor_holder_sum_supply_conservation_required",
  "source_successor_total_supply_equality_required",
  "contract_holder_value_conservation_required",
  "retired_contract_value_zero_or_remapped_required",
  "source_successor_holder_balance_equivalence_required",
  "source_successor_total_supply_equivalence_required",
  "source_successor_open_obligation_equivalence_required",
  "unmapped_voidtoken_zero_verification_required",
  "orphan_contract_value_zero_verification_required",
  "participant_eoa_same_address_balance_verification_required",
  "contract_holder_migration_map_required",
  "ceremony_authority_mapping_verification_required",
  "successor_direct_role_contract_review_required",
  "successor_role_to_ceremony_address_map_verification_required",
  "ceremony_backup_continuity_verification_required",
  "privileged_signer_replay_fence_required",
  "raw_transaction_epoch_domain_required",
  "raw_transaction_epoch_domain_source_proof_required",
  "besu_transaction_validation_rule_implementation_required",
  "besu_plugin_artifact_content_addressing_required",
  "besu_plugin_runtime_identity_required",
  "besu_transaction_validation_rule_runtime_proof_required",
  "successor_native_gas_supply_accounting_required",
  "successor_execution_fee_model_proof_required",
  "participant_execution_gas_path_proof_required",
]) {
  assert.equal(held.missing_gates.includes(gate), false, gate);
}

assert.equal(candidate.source_execution_layer.latest_authoritative_snapshot_block, "37392");
assert.equal(
  candidate.source_execution_layer.latest_authoritative_snapshot_block_hash,
  "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
);
assert.equal(
  candidate.source_execution_layer.state_dump_sha256,
  "94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505",
);
assert.equal(
  candidate.source_execution_layer.archive_manifest_sha256,
  "4d8b4f6df9c06cadcd27fd89606e846c83e8303fed9ca45c2b64f65c3baf4a1c",
);
assert.equal(
  candidate.token_conservation.final_snapshot_total_supply_atomic,
  RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
);
assert.equal(candidate.token_conservation.final_snapshot_total_supply_verified, true);
assert.equal(candidate.token_conservation.every_nonzero_holder_enumerated, true);
assert.equal(
  candidate.token_conservation.aggregate_holder_sum_matches_final_snapshot_total_supply,
  true,
);
assert.equal(candidate.minimal_economic_state_policy.live_value_holder_census_complete, true);
assert.equal(candidate.minimal_economic_state_policy.live_obligation_contract_census_complete, true);
assert.equal(candidate.minimal_economic_state_policy.contract_holder_destination_manifest_ready, true);
assert.equal(candidate.minimal_economic_state_policy.successor_custody_contracts_reviewed, true);
assert.equal(candidate.minimal_economic_state_policy.voidtoken_privileged_authority_mapping_verified, true);
assert.equal(candidate.token_conservation.participant_eoa_balances_same_address_verified, true);
assert.equal(candidate.token_conservation.contract_holder_migration_map_complete, true);
assert.equal(candidate.successor_authority.ceremony_authority_mapping_verified, true);
assert.equal(candidate.successor_authority.successor_direct_role_contracts_reviewed, true);
assert.equal(candidate.ceremony_key_continuity.successor_role_to_ceremony_address_map_verified, true);
assert.equal(candidate.funds_safety.final_snapshot_identity_verified, true);
assert.equal(candidate.funds_safety.independent_snapshot_reconciliation_1_green, true);
assert.equal(candidate.funds_safety.independent_snapshot_reconciliation_2_green, true);
assert.equal(
  candidate.public_verification.successor_genesis_or_state_manifest_public_evidence_ready,
  true,
);

assert.equal(
  isolatedEquivalence.marker,
  "VOID_ECONOMIC_EPOCH2_ISOLATED_SUCCESSOR_EQUIVALENCE_EVIDENCE_V1",
);
assert.equal(isolatedEquivalence.status, "ISOLATED_SUCCESSOR_EQUIVALENCE_GREEN");
assert.equal(
  isolatedEquivalence.receipt_file_sha256,
  "8d4bdd7e053d6a790e879ec89f59879c734d7a9e1768d62056156fb03e4af17a",
);
assert.equal(
  isolatedEquivalence.receipt_material_sha256,
  "467b2c8088d84d4856d16b37b591f2b9b8c3f3b424ea633cdf4e56a3fef7325d",
);
assert.equal(isolatedEquivalence.verified_storage_entry_count, 1268);
assert.equal(isolatedEquivalence.gates.isolated_successor_state_equivalence_proven, true);
assert.equal(isolatedEquivalence.gates.offline_successor_equivalence_proven, false);

assert.equal(
  besuEquivalence.marker,
  "VOID_ECONOMIC_EPOCH2_BESU_STATE_EQUIVALENCE_EVIDENCE_V1",
);
assert.equal(
  besuEquivalence.status,
  "BESU_CLIENT_SPECIFIC_STATE_EQUIVALENCE_GREEN",
);
assert.equal(
  besuEquivalence.source_commit,
  "9916991dc6dab5bc05e5f4e38994f7e554c81e24",
);
assert.equal(
  besuEquivalence.canonical_merge_commit,
  "a16729fefbb8d0824836906a41838c76f6be93c9",
);
assert.equal(
  besuEquivalence.genesis.file_sha256,
  "630d70e57372f7e586cdf44f788c0b2cf27de81283e05b1294f1385467bf452d",
);
assert.equal(
  besuEquivalence.genesis.material_sha256,
  "175f6f67fc7242ec8e6d1d2e3393ee4fa7e856c6597590ee86e6fba3844b6166",
);
assert.equal(
  besuEquivalence.state_equivalence_receipt.file_sha256,
  "18a28299a16ae1b3c01a15c7278441c873e4b203536bc958ec00b35cba696c70",
);
assert.equal(
  besuEquivalence.state_equivalence_receipt.material_sha256,
  "a46ea33c2f8b3becf232008108c3a6161e5e118f0b37bffc1dd39afa267478e5",
);
assert.equal(besuEquivalence.verified_storage_entry_count, 1268);
assert.equal(besuEquivalence.native_balance_sum_wei, "0");
assert.equal(
  besuEquivalence.successor_total_supply_atoms,
  RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
);
assert.equal(
  besuEquivalence.successor_holder_sum_atoms,
  RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
);
assert.equal(besuEquivalence.besu.version, "26.8.1");
assert.equal(besuEquivalence.besu.shanghai_time, 0);
assert.equal(besuEquivalence.besu.push0_runtime_compatible, true);
assert.equal(besuEquivalence.gates.client_specific_genesis_built, true);
assert.equal(besuEquivalence.gates.besu_genesis_parse_verified, true);
assert.equal(
  besuEquivalence.gates.client_specific_state_equivalence_proven,
  true,
);
assert.equal(besuEquivalence.gates.production_validator_set_bound, false);
assert.equal(
  besuEquivalence.gates.offline_successor_equivalence_proven,
  false,
);
assert.equal(besuEquivalence.gates.migration_authorized, false);
assert.equal(besuEquivalence.gates.public_activation_authorized, false);

assert.equal(
  freeGasEvidence.marker,
  "VOID_ECONOMIC_EPOCH2_BESU_FREE_GAS_EVIDENCE_V2",
);
assert.equal(
  freeGasEvidence.status,
  "BESU_ZERO_NATIVE_FREE_GAS_EXECUTION_GREEN",
);
assert.equal(
  freeGasEvidence.canonical_proof_merge_commit,
  "e9c52e1ecf3a304ed7c2fc8be1c6c52f62f3495b",
);
assert.equal(
  freeGasEvidence.verification_context.branch_head,
  "8328f043461b501d268204d004d8d6a15bacd2cb",
);
assert.equal(
  freeGasEvidence.verification_context.pr_merge_context_sha,
  "50c6ea3d03d6e77ddf9524cc420410cd12c69a71",
);
assert.equal(
  freeGasEvidence.verification_context.pr_merge_context_main_parent,
  "30c35ab392c5f41d62d042cd1855d2e1e360a879",
);
assert.equal(
  freeGasEvidence.verification_context.pr_merge_context_branch_parent,
  "8328f043461b501d268204d004d8d6a15bacd2cb",
);
assert.equal(freeGasEvidence.verification_context.workflow_run_id, "36278639953");
assert.equal(freeGasEvidence.verification_context.artifact_id, "10918306317");
assert.equal(freeGasEvidence.client.name, "Besu");
assert.equal(freeGasEvidence.client.version, "26.8.1");
assert.equal(freeGasEvidence.client.chain_id, 2050);
assert.equal(freeGasEvidence.client.network_id, "2050");
assert.equal(freeGasEvidence.client.shanghai_time, 0);
assert.equal(
  freeGasEvidence.runtime.void_token_runtime_sha256,
  "7c2e39f57c3240b740d68ef77ae4e9d0fb6110ccb412cbdb1bec99c485ea4adb",
);
assert.equal(freeGasEvidence.transaction_proof.sender_native_balance_before_atoms, "0");
assert.equal(freeGasEvidence.transaction_proof.sender_native_balance_after_atoms, "0");
assert.equal(freeGasEvidence.transaction_proof.transaction_gas_price_atoms, "0");
assert.equal(freeGasEvidence.transaction_proof.gas_used, "52138");
assert.equal(freeGasEvidence.transaction_proof.receipt_effective_gas_price_atoms, "0");
assert.equal(freeGasEvidence.transaction_proof.zero_fee_signed_transaction_mined, true);
assert.equal(freeGasEvidence.transaction_proof.gas_metering_positive, true);
assert.equal(
  freeGasEvidence.transaction_proof.participant_native_gas_balance_required,
  false,
);
assert.equal(freeGasEvidence.transaction_proof.token_transfer_succeeded, true);
assert.equal(
  freeGasEvidence.evidence_hashes.result_json_sha256,
  "2ada7a4cefb1905a782a6131ba13c64a48b2258fbd4c09f2cf8fd50eb3e66d51",
);
assert.equal(
  freeGasEvidence.evidence_hashes.receipt_material_sha256,
  "d718abc275b0bdfc696c01e2c0953c34262325f981baed1118e1d8d94af7668b",
);
assert.equal(
  freeGasEvidence.evidence_hashes.artifact_zip_sha256,
  "5491f1df6c152c1d024baaaed013f767a497a153cd0062d3ec9b2c2049025fb6",
);
assert.equal(freeGasEvidence.gates.successor_native_gas_supply_accounted, true);
assert.equal(freeGasEvidence.gates.successor_execution_fee_model_proven, true);
assert.equal(freeGasEvidence.gates.participant_gas_path_proven, true);
assert.equal(freeGasEvidence.gates.production_validator_set_bound, false);
assert.equal(freeGasEvidence.gates.offline_successor_equivalence_proven, false);
assert.equal(freeGasEvidence.gates.migration_authorized, false);
assert.equal(freeGasEvidence.gates.public_activation_authorized, false);
assert.equal(freeGasEvidence.authority.authoritative_chain2050_write, false);
assert.equal(freeGasEvidence.authority.real_funds_movement, false);

assert.equal(
  candidate.token_conservation.successor_total_supply_atomic,
  RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
);
assert.equal(candidate.token_conservation.every_holder_balance_conserved, true);
assert.equal(
  candidate.token_conservation.successor_holder_sum_matches_successor_total_supply,
  true,
);
assert.equal(candidate.token_conservation.source_successor_total_supply_equal, true);
assert.equal(candidate.token_conservation.contract_holder_value_conserved, true);
assert.equal(
  candidate.token_conservation.no_value_left_trapped_in_retired_contracts,
  true,
);
assert.equal(
  candidate.minimal_economic_state_policy.voidtoken_balance_storage_equivalence_verified,
  true,
);
assert.equal(
  candidate.minimal_economic_state_policy.voidtoken_supply_storage_equivalence_verified,
  true,
);
assert.equal(
  candidate.funds_safety.source_successor_holder_balance_equivalence_proven,
  true,
);
assert.equal(
  candidate.funds_safety.source_successor_total_supply_equivalence_proven,
  true,
);
assert.equal(
  candidate.funds_safety.source_successor_open_obligation_equivalence_proven,
  true,
);
assert.equal(candidate.funds_safety.unmapped_voidtoken_atomic_verified_zero, true);
assert.equal(
  candidate.funds_safety.orphan_contract_held_void_atomic_verified_zero,
  true,
);
assert.equal(candidate.funds_safety.isolated_successor_state_equivalence_proven, true);
assert.equal(candidate.funds_safety.client_specific_state_equivalence_proven, true);
assert.equal(
  candidate.funds_safety.client_specific_state_equivalence_evidence,
  "ops/mainnet0/economic-epoch2-besu-state-equivalence-evidence-v1.json",
);
assert.equal(candidate.funds_safety.offline_successor_equivalence_proven, false);

assert.equal(
  candidate.successor_execution_layer.production_non_dev_client_selected,
  true,
);
assert.equal(candidate.successor_execution_layer.selected_client, "Besu");
assert.equal(candidate.successor_execution_layer.selected_client_version, "26.8.1");
assert.equal(candidate.successor_execution_layer.shanghai_time, 0);
assert.equal(candidate.successor_execution_layer.client_specific_genesis_built, true);
assert.equal(candidate.successor_execution_layer.besu_genesis_parse_verified, true);
assert.equal(
  candidate.successor_execution_layer.client_specific_state_equivalence_proven,
  true,
);
assert.equal(
  qbftBinding.marker,
  "VOID_ECONOMIC_EPOCH2_QBFT_VALIDATOR_BINDING_CANDIDATE_V1",
);
assert.equal(qbftBinding.status, "HOLD");
assert.equal(qbftBinding.economic_validator_roster.validator_count, 126);
assert.equal(
  qbftBinding.economic_validator_roster.validator_set_commitment,
  "0x55ea66fcd73d8e74c0e6baeaa54da5b399c7c3256b5cc9bd296e5540e9079c00",
);
assert.equal(
  qbftBinding.economic_validator_roster.is_besu_qbft_validator_address_source,
  false,
);
assert.equal(
  qbftBinding.identity_semantics
    .automatic_legacy_void_consensus_key_to_besu_address_derivation_allowed,
  false,
);
assert.equal(qbftBinding.qbft.production_binding_entries.length, 3);
assert.equal(qbftBinding.qbft.attested_live_node_count, 3);
assert.equal(qbftBinding.qbft.required_live_node_count, 3);
assert.equal(qbftBinding.qbft.attested_identity_slots_remaining, 0);
assert.equal(qbftBinding.qbft.production_validator_count, 3);
assert.equal(qbftBinding.qbft.required_validator_quorum, 2);
assert.equal(qbftBinding.qbft.byzantine_fault_tolerance, 0);
assert.equal(
  qbftBinding.qbft.one_byzantine_fault_tolerance_available,
  false,
);
assert.equal(
  qbftBinding.qbft.minimum_validator_count_for_one_byzantine_fault_tolerance,
  4,
);
assert.equal(qbftBinding.qbft.fourth_validator_required_for_launch, false);
assert.equal(
  qbftBinding.qbft.production_binding_entries[0].machine_role,
  "precision",
);
assert.equal(
  qbftBinding.qbft.production_binding_entries[0]
    .public_key_address_derivation_verified,
  true,
);
assert.equal(
  qbftBinding.qbft.production_binding_entries[1].machine_role,
  "nimo",
);
assert.equal(
  qbftBinding.qbft.production_binding_entries[1]
    .public_key_address_derivation_verified,
  true,
);
assert.equal(
  qbftBinding.qbft.production_binding_entries[2].machine_role,
  "xiphos",
);
assert.equal(
  qbftBinding.qbft.production_binding_entries[2]
    .public_key_address_derivation_verified,
  true,
);
assert.equal(qbftBinding.gates.production_validator_set_bound, false);
assert.equal(qbftBinding.gates.offline_successor_equivalence_proven, false);
assert.equal(qbftBinding.gates.migration_authorized, false);
assert.equal(qbftBinding.gates.public_activation_authorized, false);

assert.equal(
  candidate.successor_execution_layer.qbft_validator_binding_boundary_defined,
  true,
);
assert.equal(
  candidate.successor_execution_layer.qbft_validator_binding_candidate,
  "ops/mainnet0/economic-epoch2-qbft-validator-binding-candidate-v1.json",
);
assert.equal(
  candidate.successor_execution_layer.economic_validator_roster_is_qbft_address_source,
  false,
);
assert.equal(
  candidate.successor_execution_layer.legacy_void_consensus_key_auto_conversion_allowed,
  false,
);
assert.equal(
  candidate.successor_execution_layer.qbft_validator_binding_entries_ready,
  true,
);
assert.equal(candidate.successor_execution_layer.production_validator_set_bound, false);
assert.equal(
  candidate.public_verification.client_specific_state_evidence_metadata_published,
  true,
);
assert.equal(candidate.native_gas_cleanup.successor_native_gas_supply_accounted, true);
assert.equal(candidate.native_gas_cleanup.successor_execution_fee_model_proven, true);
assert.equal(candidate.native_gas_cleanup.participant_gas_path_proven, true);
assert.equal(
  candidate.native_gas_cleanup.zero_native_free_gas_execution_evidence,
  "ops/mainnet0/economic-epoch2-besu-free-gas-evidence-v2.json",
);
assert.equal(
  candidate.successor_execution_layer.zero_native_free_gas_execution_proven,
  true,
);
assert.equal(
  candidate.successor_execution_layer.zero_native_free_gas_execution_evidence,
  "ops/mainnet0/economic-epoch2-besu-free-gas-evidence-v2.json",
);

assert.equal(
  candidate.replay_and_epoch_safety.legacy_write_rpc_disabled_before_successor_activation,
  true,
);
assert.equal(candidate.replay_and_epoch_safety.frozen_epoch1_nonce_census_bound, true);
assert.equal(
  candidate.replay_and_epoch_safety.frozen_epoch1_nonzero_nonce_account_count,
  154,
);
assert.equal(
  candidate.replay_and_epoch_safety.canonical_nonce_tsv_sha256,
  "c8d316a3ca3739c644bfc7626715144762138cad3fb4d68bbd0e132b0dc42b70",
);
assert.equal(
  candidate.replay_and_epoch_safety.successor_genesis_nonce_continuity_built,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety.besu_nonce_readback_proven,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety.besu_nonce_continuity_evidence,
  "ops/mainnet0/economic-epoch2-besu-nonce-continuity-evidence-v1.json",
);
assert.equal(
  candidate.replay_and_epoch_safety
    .known_retained_raw_transaction_stale_under_exact_nonce_continuity,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety.execution_epoch_bound_in_public_gateway,
  true,
);
assert.equal(
  held.missing_gates.includes("execution_epoch_gateway_binding_required"),
  false,
);
assert.equal(
  held.missing_gates.includes("pending_legacy_signed_transaction_census_required"),
  false,
);
assert.equal(
  candidate.replay_and_epoch_safety
    .privileged_signer_nonce_or_key_replay_fence_proven,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety.privileged_signer_replay_fence_evidence,
  "ops/mainnet0/economic-epoch2-privileged-signer-replay-fence-v1.json",
);
assert.equal(
  privilegedReplayFence.marker,
  "VOID_ECONOMIC_EPOCH2_PRIVILEGED_SIGNER_REPLAY_FENCE_V1",
);
assert.equal(privilegedReplayFence.status,"PRIVILEGED_SIGNER_REPLAY_FENCE_GREEN");
assert.equal(
  privilegedReplayFence.decision.privileged_signer_nonce_or_key_replay_fence_proven,
  true,
);
assert.equal(
  privilegedReplayFence.decision.pending_legacy_signed_transaction_census_complete,
  true,
);
assert.equal(privilegedReplayFence.decision.cross_epoch_replay_protection_proven,false);
assert.equal(privilegedReplayFence.decision.migration_authorized,false);
assert.equal(privilegedReplayFence.decision.public_activation_authorized,false);
assert.equal(privilegedReplayFence.authority.private_key_access,false);
assert.equal(privilegedReplayFence.authority.transaction_signing,false);
assert.equal(privilegedReplayFence.authority.transaction_broadcast,false);
assert.equal(privilegedReplayFence.authority.authoritative_chain2050_write,false);
assert.equal(privilegedReplayFence.authority.funds_movement,false);
assert.equal(
  candidate.replay_and_epoch_safety
    .pending_legacy_signed_transaction_census_complete,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety
    .pending_legacy_signed_transaction_census_evidence,
  "ops/mainnet0/economic-epoch2-signed-artifact-census-closeout-v1.json",
);
assert.equal(
  candidate.replay_and_epoch_safety.raw_transaction_epoch_domain_defined,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety.raw_transaction_epoch_domain_source_proven,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety.besu_transaction_validation_rule_implemented,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety.plugin_artifact_content_addressed,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety.plugin_artifact_runtime_identity_verified,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety
    .besu_transaction_validation_rule_runtime_proven,
  true,
);
assert.equal(
  candidate.replay_and_epoch_safety.raw_transaction_epoch_domain_policy,
  "ops/mainnet0/economic-epoch2-raw-transaction-domain-v1.json",
);
assert.equal(
  candidate.replay_and_epoch_safety.raw_transaction_epoch_domain_runtime_evidence,
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-evidence-v1.json",
);
assert.equal(
  candidate.replay_and_epoch_safety.raw_transaction_epoch_domain_runtime_import,
  "ops/mainnet0/economic-epoch2-besu-raw-transaction-validator-runtime-import-v1.json",
);
assert.equal(
  candidate.replay_and_epoch_safety.raw_transaction_epoch_domain_plugin_sha256,
  "6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518",
);
assert.equal(
  candidate.replay_and_epoch_safety
    .all_production_validators_epoch_domain_enforced,
  false,
);
assert.equal(
  candidate.replay_and_epoch_safety.cross_epoch_replay_protection_proven,
  false,
);

assert.equal(
  nonceContinuity.marker,
  "VOID_ECONOMIC_EPOCH2_BESU_NONCE_CONTINUITY_EVIDENCE_V1",
);
assert.equal(
  nonceContinuity.status,
  "BESU_NONCE_CONTINUITY_AND_ECONOMIC_STATE_EQUIVALENCE_GREEN",
);
assert.equal(nonceContinuity.state_equivalence.alloc_account_count, 156);
assert.equal(nonceContinuity.state_equivalence.economic_state_account_count, 4);
assert.equal(
  nonceContinuity.state_equivalence.verified_storage_entry_count,
  1268,
);
assert.equal(
  nonceContinuity.state_equivalence.client_specific_state_equivalence_proven,
  true,
);
assert.equal(
  nonceContinuity.nonce_continuity.frozen_epoch1_nonzero_nonce_account_count,
  154,
);
assert.equal(
  nonceContinuity.nonce_continuity.nonce_only_alloc_account_count,
  152,
);
assert.equal(
  nonceContinuity.nonce_continuity.canonical_nonce_tsv_sha256,
  "c8d316a3ca3739c644bfc7626715144762138cad3fb4d68bbd0e132b0dc42b70",
);
assert.equal(
  nonceContinuity.nonce_continuity.all_nonce_readbacks_exact,
  true,
);
assert.equal(
  nonceContinuity.nonce_continuity.all_nonce_only_native_balances_zero,
  true,
);
assert.equal(
  nonceContinuity.nonce_continuity.all_retired_nonce_only_code_absent,
  true,
);
assert.equal(
  nonceContinuity.nonce_continuity.known_retained_raw_transaction
    .stale_under_exact_nonce_continuity,
  true,
);
assert.equal(
  nonceContinuity.gates.successor_genesis_nonce_continuity_built,
  true,
);
assert.equal(nonceContinuity.gates.besu_nonce_readback_proven, true);
assert.equal(
  nonceContinuity.gates.pending_legacy_signed_transaction_census_complete,
  false,
);
assert.equal(
  nonceContinuity.gates.execution_epoch_bound_in_public_gateway,
  false,
);
assert.equal(
  nonceContinuity.gates.privileged_signer_nonce_or_key_replay_fence_proven,
  false,
);
assert.equal(
  nonceContinuity.gates.cross_epoch_replay_protection_proven,
  false,
);
assert.equal(nonceContinuity.gates.migration_authorized, false);
assert.equal(nonceContinuity.gates.public_activation_authorized, false);

assert.equal(candidate.public_verification.source_snapshot_public_evidence_ready, true);

assert.equal(
  candidate.public_verification.migration_manifest_content_addressed,
  true,
);
assert.equal(
  candidate.public_verification
    .successor_genesis_or_state_manifest_public_evidence_ready,
  true,
);
assert.equal(
  candidate.public_verification.successor_state_root_public_void_anchor_ready,
  false,
);
assert.equal(
  candidate.public_verification.public_balance_receipt_code_verification_ready,
  false,
);

const ready = structuredClone(candidate);
Object.assign(ready.source_execution_layer, {
  latest_authoritative_snapshot_block: "40000",
  latest_authoritative_snapshot_block_hash: "0x" + "1".repeat(64),
  state_dump_sha256: "2".repeat(64),
  archive_manifest_sha256: "3".repeat(64),
});
Object.assign(ready.minimal_economic_state_policy, {
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
Object.assign(ready.ceremony_key_continuity, {
  ceremony_backup_continuity_verified: true,
  successor_role_to_ceremony_address_map_verified: true,
});
Object.assign(ready.funds_safety, {
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
  raw_transaction_epoch_domain_defined: true,
  raw_transaction_epoch_domain_source_proven: true,
  besu_transaction_validation_rule_implemented: true,
  plugin_artifact_content_addressed: true,
  plugin_artifact_runtime_identity_verified: true,
  besu_transaction_validation_rule_runtime_proven: true,
  all_production_validators_epoch_domain_enforced: true,
  cross_epoch_replay_protection_proven: true,
});
Object.assign(ready.public_verification, {
  migration_manifest_content_addressed: true,
  source_snapshot_public_evidence_ready: true,
  successor_genesis_or_state_manifest_public_evidence_ready: true,
  successor_state_root_public_void_anchor_ready: true,
  public_balance_receipt_code_verification_ready: true,
});

{
  const notDeployedEverywhere = structuredClone(ready);
  notDeployedEverywhere.replay_and_epoch_safety
    .all_production_validators_epoch_domain_enforced = false;
  const blocked = classifyVoidEconomicEvmSuccessorMigrationV1(
    notDeployedEverywhere,
  );
  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, "HOLD");
  assert.ok(
    blocked.missing_gates.includes(
      "production_validator_epoch_domain_enforcement_required",
    ),
  );
}

const sourceReady = classifyVoidEconomicEvmSuccessorMigrationV1(ready);
assert.equal(sourceReady.ok, true);
assert.equal(sourceReady.status, "SOURCE_READY");
assert.equal(sourceReady.admin_gate_migrates, false);
assert.equal(sourceReady.config_gate_migrates, false);
assert.equal(sourceReady.legacy_wc_relayer_migrates, false);
assert.equal(sourceReady.participant_eoa_balances_same_address, true);
assert.equal(sourceReady.voidtoken_same_address_preserved, true);
assert.equal(sourceReady.voidtoken_legacy_runtime_reused, false);
assert.equal(sourceReady.voidtoken_successor_runtime_reviewed, true);
assert.equal(
  sourceReady.voidtoken_successor_runtime_semantic_equivalence_verified,
  true,
);
assert.equal(sourceReady.voidtoken_balance_and_supply_equivalence_verified, true);
assert.equal(sourceReady.contract_holder_value_remap_manifest_ready, true);
assert.equal(sourceReady.ceremony_key_continuity_verified, true);
assert.equal(sourceReady.offline_successor_equivalence_proven, true);
assert.equal(sourceReady.unmapped_voidtoken_atomic_verified_zero, true);
assert.equal(sourceReady.orphan_contract_held_void_atomic_verified_zero, true);
assert.equal(sourceReady.native_gas_is_economic_asset, false);
assert.equal(sourceReady.migration_authorized, false);
assert.equal(sourceReady.public_activation_authorized, false);
assert.equal(sourceReady.money_movement_authorized, false);

{
  const bad = structuredClone(candidate);
  bad.ceremony_key_continuity.successor_privileged_authorities_must_use_recorded_ceremony_addresses = false;
  assert.throws(
    () => classifyVoidEconomicEvmSuccessorMigrationV1(bad),
    /successor_authority_must_use_ceremony_addresses/,
  );
}

{
  const bad = structuredClone(candidate);
  bad.funds_safety.migration_via_series_of_live_treasury_transfers_forbidden = false;
  assert.throws(
    () => classifyVoidEconomicEvmSuccessorMigrationV1(bad),
    /live_treasury_transfer_migration_forbidden/,
  );
}

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
console.log("voidtoken_same_address_required=true");
console.log("voidtoken_runtime_identity_required=false");
console.log("voidtoken_legacy_runtime_reuse_forbidden=true");
console.log("voidtoken_successor_runtime_review_required=true");
console.log("voidtoken_successor_runtime_reviewed=true");
console.log("voidtoken_successor_runtime_semantic_equivalence_required=true");
console.log("voidtoken_successor_runtime_semantic_equivalence_verified=true");
console.log("voidtoken_balance_and_supply_state_exact=true");
console.log("voidtoken_privileged_authority_change_requires_ceremony_address=true");
console.log("contract_holder_value_uses_explicit_successor_mapping=true");
console.log("premine_reference_void=333333333");
console.log("migration_supply_rule=final_live_supply_equals_successor_supply");
console.log("fresh_ceremony_authority_mapping_required=true");
console.log("ceremony_backup_continuity_required=true");
console.log("successor_privileged_authorities_use_ceremony_addresses=true");
console.log("old_anvil_privileged_key_reuse_forbidden=true");
console.log("production_non_dev_client_selected=true");
console.log("client_specific_genesis_built=true");
console.log("besu_genesis_parse_verified=true");
console.log("client_specific_state_equivalence_proven=true");
console.log("successor_native_gas_supply_accounted=true");
console.log("successor_execution_fee_model_proven=true");
console.log("participant_gas_path_proven=true");
console.log("qbft_validator_binding_boundary_defined=true");
console.log("economic_validator_roster_is_qbft_address_source=false");
console.log("legacy_void_consensus_key_auto_conversion_allowed=false");
console.log("qbft_validator_binding_entries_ready=true");
console.log("qbft_production_validator_count=3");
console.log("qbft_required_validator_quorum=2");
console.log("qbft_byzantine_fault_tolerance=0");
console.log("qbft_one_byzantine_fault_tolerance_available=false");
console.log("qbft_minimum_validator_count_for_one_byzantine_fault_tolerance=4");
console.log("qbft_fourth_validator_required_for_launch=false");
console.log("production_validator_set_bound=false");
console.log("offline_successor_build_required=true");
console.log("migration_via_live_treasury_transfers=false");
console.log("two_independent_readonly_snapshot_reconciliations_required=true");
console.log("unmapped_voidtoken_atomic_must_equal_zero=true");
console.log("orphan_contract_held_void_atomic_must_equal_zero=true");
console.log("live_cutover_requires_separate_explicit_authorization=true");
console.log("native_gas_is_economic_asset=false");
console.log("migration_authorized=false");
console.log("public_activation_authorized=false");
console.log("funds_moved=false");
