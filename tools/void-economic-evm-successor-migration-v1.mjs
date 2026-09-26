#!/usr/bin/env node

export const VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1 =
  "VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1";

export const RECONCILED_PREMINE_REFERENCE_ATOMIC_V1 =
  "333333333000000000000000000";

export const MAXIMUM_VOIDTOKEN_SUPPLY_ATOMIC_V1 =
  "666666666000000000000000000";

export const HISTORICAL_VOIDTOKEN_ADDRESS_V1 =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function invariant(condition, reason) {
  if (!condition) throw new Error(reason);
}

function hold(reason, missing = []) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1,
    reason,
    missing_gates: Object.freeze([...missing]),
    migration_authorized: false,
    public_activation_authorized: false,
    money_movement_authorized: false,
  });
}

function requireTrue(missing, value, gate) {
  if (value !== true) missing.push(gate);
}

function requireValue(missing, value, gate) {
  if (value === null || value === undefined || value === "") missing.push(gate);
}

export function classifyVoidEconomicEvmSuccessorMigrationV1(candidate) {
  if (!object(candidate)) return hold("candidate_invalid");

  if (
    candidate.marker !== VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1 ||
    candidate.version !== 1
  ) {
    return hold("candidate_identity_mismatch");
  }

  invariant(
    candidate.architecture_decision ===
      "archive_anvil_migrate_minimal_economic_state_to_clean_successor",
    "architecture_decision_drift",
  );

  const source = candidate.source_execution_layer;
  const successor = candidate.successor_execution_layer;
  const policy = candidate.minimal_economic_state_policy;
  const disposition = candidate.source_contract_disposition;
  const successorAuthority = candidate.successor_authority;
  const token = candidate.token_conservation;
  const quarantine = candidate.dev_and_test_quarantine;
  const nativeGas = candidate.native_gas_cleanup;
  const replay = candidate.replay_and_epoch_safety;
  const pub = candidate.public_verification;
  const ceremony = candidate.ceremony_key_continuity;
  const fundsSafety = candidate.funds_safety;
  const authority = candidate.launch_authority;

  for (const [value, code] of [
    [source, "source_execution_layer_invalid"],
    [successor, "successor_execution_layer_invalid"],
    [policy, "minimal_economic_state_policy_invalid"],
    [disposition, "source_contract_disposition_invalid"],
    [successorAuthority, "successor_authority_invalid"],
    [token, "token_conservation_invalid"],
    [quarantine, "quarantine_policy_invalid"],
    [nativeGas, "native_gas_cleanup_invalid"],
    [replay, "replay_policy_invalid"],
    [pub, "public_verification_invalid"],
    [ceremony, "ceremony_key_continuity_invalid"],
    [fundsSafety, "funds_safety_invalid"],
    [authority, "authority_invalid"],
  ]) {
    invariant(object(value), code);
  }

  // Epoch-1 Anvil is evidence only.
  invariant(source.implementation === "anvil", "source_must_be_anvil");
  invariant(source.chain_id === 2050, "source_chain_id_mismatch");
  invariant(
    source.disposition === "immutable_economic_genesis_archive",
    "source_archive_disposition_mismatch",
  );
  invariant(source.future_write_authority === false, "legacy_write_authority_forbidden");
  invariant(source.raw_public_rpc_allowed === false, "legacy_public_rpc_forbidden");
  invariant(source.historical_receipts_preserved === true, "historical_receipts_must_be_preserved");

  // Epoch-2 execution is intentionally clean and does not create a second
  // economic VOID asset.
  invariant(successor.execution_epoch === 2, "successor_epoch_mismatch");
  invariant(successor.chain_id === 2050, "successor_chain_id_mismatch");
  invariant(
    successor.implementation_class === "production_non_dev_evm_client",
    "successor_client_class_mismatch",
  );
  invariant(successor.anvil_forbidden === true, "successor_anvil_forbidden");
  invariant(
    successor.default_prefunded_dev_accounts_forbidden === true,
    "successor_default_dev_accounts_forbidden",
  );
  invariant(successor.raw_public_rpc_allowed === false, "successor_raw_public_rpc_forbidden");
  invariant(successor.public_read_gateway_required === true, "public_read_gateway_required");
  invariant(
    successor.bounded_signed_submission_gateway_required === true,
    "bounded_signed_submission_gateway_required",
  );
  invariant(successor.public_void_state_anchor_required === true, "public_void_anchor_required");
  invariant(successor.voidtoken_is_only_economic_void_asset === true, "voidtoken_only_economic_asset_required");
  invariant(successor.native_gas_is_economic_asset === false, "native_gas_economic_asset_forbidden");
  invariant(
    successor.participant_native_gas_balance_required === false,
    "participant_native_gas_balance_requirement_forbidden",
  );
  invariant(successor.gas_metering_required === true, "gas_metering_required");
  invariant(
    successor.zero_fee_or_system_sponsored_execution_required === true,
    "zero_fee_or_system_sponsored_execution_required",
  );
  invariant(successor.hidden_native_gas_market_forbidden === true, "hidden_native_gas_market_forbidden");
  invariant(
    successor.migration_anchor_contract_or_equivalent_required === true,
    "migration_anchor_required",
  );

  // The successor is a value/state migration, not an old-architecture clone.
  invariant(policy.preserve_old_contract_architecture_by_default === false, "old_contract_architecture_clone_forbidden");
  invariant(policy.voidtoken_identity_and_supply_state_required === true, "voidtoken_state_required");
  invariant(policy.voidtoken_same_address_required === true, "voidtoken_same_address_required");
  invariant(policy.voidtoken_runtime_identity_required === true, "voidtoken_runtime_identity_required");
  invariant(policy.voidtoken_balance_and_supply_state_exact === true, "voidtoken_balance_supply_exact_required");
  invariant(
    policy.voidtoken_privileged_authority_may_change_only_to_verified_ceremony_address === true,
    "voidtoken_authority_change_must_use_ceremony_address",
  );
  invariant(policy.participant_eoa_balance_same_address_required === true, "participant_eoa_same_address_required");
  invariant(
    policy.contract_holder_balance_remap_allowed_only_by_explicit_manifest === true,
    "contract_holder_remap_manifest_required",
  );
  invariant(
    policy.contract_holder_balance_remap_requires_accounting_equivalence_proof === true,
    "contract_holder_accounting_equivalence_required",
  );
  invariant(
    policy.contract_code_migrates_only_if_required_to_control_live_value_or_obligation === true,
    "contract_code_minimality_required",
  );
  invariant(policy.zero_balance_contract_migrates_by_default === false, "zero_balance_contract_default_migration_forbidden");
  invariant(policy.live_dependency_census_required === true, "live_dependency_census_required");
  invariant(policy.caller_supplied_migration_allowlist_forbidden === true, "caller_supplied_allowlist_forbidden");

  // Explicitly retire old governance plumbing unless final live-state evidence
  // proves an economic dependency. AdminGate is not successor authority.
  invariant(
    disposition.VoidToken ===
      "preserve_same_address_runtime_balance_supply_rotate_privileged_authority_only_if_ceremony_verified",
    "voidtoken_disposition_mismatch",
  );
  invariant(disposition.AdminGate === "archive_only_no_successor_authority", "admin_gate_must_be_archive_only");
  invariant(disposition.ConfigGate === "archive_only_no_successor_authority", "config_gate_must_be_archive_only");
  invariant(
    disposition.OpsTreasury === "archive_only_unless_final_snapshot_dependency_or_nonzero_balance",
    "ops_treasury_disposition_mismatch",
  );
  invariant(
    disposition.UpgradeStaking ===
      "preserve_stake_beneficiary_accounting_via_exact_state_or_explicit_successor_mapping",
    "upgrade_staking_value_policy_mismatch",
  );
  invariant(
    disposition.PresaleFulfillment ===
      "preserve_live_inventory_obligation_via_exact_state_or_explicit_successor_mapping",
    "presale_fulfillment_value_policy_mismatch",
  );

  invariant(successorAuthority.admin_gate_required === false, "successor_admin_gate_forbidden");
  invariant(successorAuthority.config_gate_required === false, "successor_config_gate_forbidden");
  invariant(successorAuthority.legacy_admin_gate_master_migrates === false, "legacy_admin_gate_master_migration_forbidden");
  invariant(successorAuthority.legacy_validator_admin_migrates_by_default === false, "legacy_validator_admin_default_migration_forbidden");
  invariant(successorAuthority.fresh_ceremony_authority_mapping_required === true, "fresh_ceremony_authority_mapping_required");
  invariant(
    successorAuthority.ceremony_public_address_artifact ===
      "ops/mainnet/mainnet0-key-ceremony-result-20260523-122739.md",
    "ceremony_artifact_binding_mismatch",
  );
  invariant(successorAuthority.old_anvil_authority_has_successor_write_power === false, "old_anvil_authority_successor_write_forbidden");
  invariant(successorAuthority.direct_role_specific_authority_preferred === true, "direct_role_authority_required");

  invariant(
    ceremony.ceremony_public_address_artifact ===
      "ops/mainnet/mainnet0-key-ceremony-result-20260523-122739.md",
    "ceremony_public_address_artifact_mismatch",
  );
  invariant(
    ceremony.ceremony_backup_receipt ===
      "ops/mainnet/mainnet0-key-ceremony-backup-voidkey2-20260523-122135.md",
    "ceremony_backup_receipt_mismatch",
  );
  invariant(ceremony.records_public_addresses_only === true, "ceremony_public_addresses_only_required");
  invariant(ceremony.secret_material_must_remain_off_repo === true, "ceremony_secret_material_off_repo_required");
  invariant(
    ceremony.successor_privileged_authorities_must_use_recorded_ceremony_addresses === true,
    "successor_authority_must_use_ceremony_addresses",
  );
  invariant(ceremony.old_anvil_privileged_key_reuse_forbidden === true, "old_anvil_privileged_key_reuse_forbidden");
  invariant(
    ceremony.new_privileged_key_generation_forbidden_without_separate_explicit_authorization === true,
    "new_privileged_key_generation_requires_explicit_authorization",
  );

  const ceremonyAddresses = Object.values(ceremony.recorded_public_addresses || {});
  invariant(ceremonyAddresses.length >= 10, "ceremony_address_set_too_small");
  for (const address of ceremonyAddresses) {
    invariant(/^0x[0-9a-f]{40}$/.test(String(address)), "ceremony_address_invalid");
  }
  invariant(
    new Set(ceremonyAddresses).size === ceremonyAddresses.length,
    "ceremony_address_duplicate",
  );

  invariant(fundsSafety.state_import_migration_preferred === true, "state_import_migration_required");
  invariant(
    fundsSafety.migration_via_series_of_live_treasury_transfers_forbidden === true,
    "live_treasury_transfer_migration_forbidden",
  );
  invariant(
    fundsSafety.offline_successor_build_required_before_live_cutover === true,
    "offline_successor_build_required",
  );
  invariant(
    fundsSafety.source_write_freeze_required_before_final_snapshot === true,
    "source_write_freeze_required",
  );
  invariant(
    fundsSafety.two_independent_readonly_snapshot_reconciliations_required === true,
    "two_independent_snapshot_reconciliations_required",
  );
  invariant(
    fundsSafety.final_snapshot_must_cover_all_accepted_economic_mutations === true,
    "final_snapshot_must_cover_all_mutations",
  );
  invariant(fundsSafety.unmapped_voidtoken_atomic_must_equal_zero === true, "unmapped_voidtoken_must_be_zero");
  invariant(
    fundsSafety.orphan_contract_held_void_atomic_must_equal_zero === true,
    "orphan_contract_value_must_be_zero",
  );
  invariant(fundsSafety.live_cutover_transaction_authority === false, "live_cutover_authority_must_be_false");
  invariant(
    fundsSafety.live_cutover_requires_separate_explicit_authorization === true,
    "live_cutover_requires_explicit_authorization",
  );
  invariant(fundsSafety.no_funds_move_during_snapshot_or_offline_build === true, "funds_move_during_preparation_forbidden");

  // Token supply/value conservation.
  invariant(
    token.reconciled_premine_reference_atomic === RECONCILED_PREMINE_REFERENCE_ATOMIC_V1,
    "reconciled_premine_reference_mismatch",
  );
  invariant(
    token.maximum_supply_atomic === MAXIMUM_VOIDTOKEN_SUPPLY_ATOMIC_V1,
    "maximum_supply_mismatch",
  );
  invariant(token.legitimate_pre_freeze_emissions_must_be_preserved === true, "pre_freeze_emissions_must_be_preserved");
  invariant(token.migration_supply_delta_must_equal_zero === true, "migration_supply_delta_must_be_zero");
  invariant(token.migration_mint_or_burn_forbidden === true, "migration_mint_or_burn_forbidden");
  invariant(token.holder_omission_forbidden === true, "holder_omission_forbidden");
  invariant(token.historical_superseded_test_delivery_not_recreated === true, "superseded_test_delivery_recreation_forbidden");
  invariant(token.old_contract_address_preservation_required === false, "old_contract_address_preservation_forbidden");

  // Development state does not acquire production authority.
  invariant(quarantine.legacy_wc_relayer_is_offchain_service === true, "legacy_relayer_classification_required");
  invariant(quarantine.legacy_wc_relayer_has_migration_authority === false, "legacy_relayer_migration_authority_forbidden");
  invariant(quarantine.devnet_wc_contracts_migrate === false, "devnet_wc_contract_migration_forbidden");
  invariant(quarantine.default_anvil_accounts_migrate_with_balances === false, "anvil_default_balance_migration_forbidden");
  invariant(quarantine.known_anvil_private_key_transactions_allowed === false, "known_anvil_key_transactions_forbidden");
  invariant(quarantine.admin_gate_migrates === false, "admin_gate_migration_forbidden");
  invariant(quarantine.config_gate_migrates === false, "config_gate_migration_forbidden");
  invariant(quarantine.legacy_bootstrap_zero_balance_contracts_migrate === false, "zero_balance_bootstrap_contract_migration_forbidden");

  invariant(nativeGas.old_native_balance_supply_is_void_supply === false, "old_native_gas_is_not_void_supply");
  invariant(nativeGas.old_native_balance_supply_migrates_as_economic_value === false, "old_native_gas_economic_migration_forbidden");
  invariant(nativeGas.known_dev_native_balances_preserved === false, "known_dev_native_balance_preservation_forbidden");

  invariant(authority.source_only === true, "source_only_required");
  for (const [key, value] of Object.entries(authority)) {
    if (key === "source_only") continue;
    invariant(value === false, "authority_must_remain_false:" + key);
  }

  const missing = [];

  requireValue(missing, source.latest_authoritative_snapshot_block, "latest_authoritative_snapshot_block_required");
  requireValue(missing, source.latest_authoritative_snapshot_block_hash, "latest_authoritative_snapshot_block_hash_required");
  requireValue(missing, source.state_dump_sha256, "source_state_dump_sha256_required");
  requireValue(missing, source.archive_manifest_sha256, "archive_manifest_sha256_required");

  requireTrue(missing, policy.voidtoken_runtime_identity_verified, "voidtoken_runtime_identity_verification_required");
  requireTrue(missing, policy.voidtoken_balance_storage_equivalence_verified, "voidtoken_balance_storage_equivalence_required");
  requireTrue(missing, policy.voidtoken_supply_storage_equivalence_verified, "voidtoken_supply_storage_equivalence_required");
  requireTrue(missing, policy.voidtoken_privileged_authority_mapping_verified, "voidtoken_privileged_authority_mapping_required");
  requireTrue(missing, policy.live_value_holder_census_complete, "live_value_holder_census_required");
  requireTrue(missing, policy.live_obligation_contract_census_complete, "live_obligation_contract_census_required");
  requireTrue(missing, policy.contract_holder_destination_manifest_ready, "contract_holder_destination_manifest_required");
  requireTrue(missing, policy.successor_custody_contracts_reviewed, "successor_custody_contract_review_required");

  requireValue(missing, token.final_snapshot_total_supply_atomic, "final_snapshot_total_supply_atomic_required");
  requireValue(missing, token.successor_total_supply_atomic, "successor_total_supply_atomic_required");
  requireTrue(missing, token.final_snapshot_total_supply_verified, "final_snapshot_total_supply_verification_required");
  requireTrue(missing, token.every_nonzero_holder_enumerated, "all_nonzero_holder_enumeration_required");
  requireTrue(missing, token.every_holder_balance_conserved, "all_holder_balance_conservation_required");
  requireTrue(missing, token.aggregate_holder_sum_matches_final_snapshot_total_supply, "source_holder_sum_supply_conservation_required");
  requireTrue(missing, token.successor_holder_sum_matches_successor_total_supply, "successor_holder_sum_supply_conservation_required");
  requireTrue(missing, token.source_successor_total_supply_equal, "source_successor_total_supply_equality_required");
  requireTrue(missing, token.participant_eoa_balances_same_address_verified, "participant_eoa_same_address_balance_verification_required");
  requireTrue(missing, token.contract_holder_migration_map_complete, "contract_holder_migration_map_required");
  requireTrue(missing, token.contract_holder_value_conserved, "contract_holder_value_conservation_required");
  requireTrue(missing, token.no_value_left_trapped_in_retired_contracts, "retired_contract_value_zero_or_remapped_required");

  if (
    token.final_snapshot_total_supply_atomic !== null &&
    token.successor_total_supply_atomic !== null
  ) {
    const finalSupply = BigInt(String(token.final_snapshot_total_supply_atomic));
    const successorSupply = BigInt(String(token.successor_total_supply_atomic));
    const maxSupply = BigInt(MAXIMUM_VOIDTOKEN_SUPPLY_ATOMIC_V1);
    invariant(finalSupply >= 0n && finalSupply <= maxSupply, "final_snapshot_supply_out_of_range");
    invariant(successorSupply === finalSupply, "source_successor_total_supply_mismatch");
  }

  requireTrue(missing, successorAuthority.ceremony_authority_mapping_verified, "ceremony_authority_mapping_verification_required");
  requireTrue(missing, successorAuthority.successor_direct_role_contracts_reviewed, "successor_direct_role_contract_review_required");

  requireTrue(missing, ceremony.ceremony_backup_continuity_verified, "ceremony_backup_continuity_verification_required");
  requireTrue(
    missing,
    ceremony.successor_role_to_ceremony_address_map_verified,
    "successor_role_to_ceremony_address_map_verification_required",
  );

  requireTrue(missing, fundsSafety.final_snapshot_identity_verified, "final_snapshot_identity_verification_required");
  requireTrue(
    missing,
    fundsSafety.independent_snapshot_reconciliation_1_green,
    "independent_snapshot_reconciliation_1_required",
  );
  requireTrue(
    missing,
    fundsSafety.independent_snapshot_reconciliation_2_green,
    "independent_snapshot_reconciliation_2_required",
  );
  requireTrue(
    missing,
    fundsSafety.offline_successor_equivalence_proven,
    "offline_successor_equivalence_proof_required",
  );
  requireTrue(
    missing,
    fundsSafety.source_successor_holder_balance_equivalence_proven,
    "source_successor_holder_balance_equivalence_required",
  );
  requireTrue(
    missing,
    fundsSafety.source_successor_total_supply_equivalence_proven,
    "source_successor_total_supply_equivalence_required",
  );
  requireTrue(
    missing,
    fundsSafety.source_successor_open_obligation_equivalence_proven,
    "source_successor_open_obligation_equivalence_required",
  );
  requireTrue(
    missing,
    fundsSafety.unmapped_voidtoken_atomic_verified_zero,
    "unmapped_voidtoken_zero_verification_required",
  );
  requireTrue(
    missing,
    fundsSafety.orphan_contract_held_void_atomic_verified_zero,
    "orphan_contract_value_zero_verification_required",
  );

  requireTrue(missing, nativeGas.successor_native_gas_supply_accounted, "successor_native_gas_supply_accounting_required");
  requireTrue(missing, nativeGas.successor_execution_fee_model_proven, "successor_execution_fee_model_proof_required");
  requireTrue(missing, nativeGas.participant_gas_path_proven, "participant_execution_gas_path_proof_required");

  requireTrue(missing, replay.legacy_write_rpc_disabled_before_successor_activation, "legacy_write_rpc_disable_required");
  requireTrue(missing, replay.execution_epoch_bound_in_public_gateway, "execution_epoch_gateway_binding_required");
  requireTrue(missing, replay.privileged_signer_nonce_or_key_replay_fence_proven, "privileged_signer_replay_fence_required");
  requireTrue(missing, replay.pending_legacy_signed_transaction_census_complete, "pending_legacy_signed_transaction_census_required");
  requireTrue(missing, replay.cross_epoch_replay_protection_proven, "cross_epoch_replay_protection_required");

  requireTrue(missing, pub.migration_manifest_content_addressed, "content_addressed_migration_manifest_required");
  requireTrue(missing, pub.source_snapshot_public_evidence_ready, "source_snapshot_public_evidence_required");
  requireTrue(missing, pub.successor_genesis_or_state_manifest_public_evidence_ready, "successor_state_manifest_public_evidence_required");
  requireTrue(missing, pub.successor_state_root_public_void_anchor_ready, "successor_state_root_public_void_anchor_required");
  requireTrue(missing, pub.public_balance_receipt_code_verification_ready, "public_economic_verification_path_required");

  if (missing.length) {
    return hold("migration_gates_incomplete", missing);
  }

  return Object.freeze({
    ok: true,
    status: "SOURCE_READY",
    marker: VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1,
    architecture_decision: candidate.architecture_decision,
    execution_epoch: successor.execution_epoch,
    chain_id: successor.chain_id,
    voidtoken_final_snapshot_total_supply_atomic:
      token.final_snapshot_total_supply_atomic,
    participant_eoa_balances_same_address: true,
    voidtoken_same_address_preserved: true,
    voidtoken_runtime_identity_verified: true,
    voidtoken_balance_and_supply_equivalence_verified: true,
    contract_holder_value_remap_manifest_ready: true,
    ceremony_key_continuity_verified: true,
    offline_successor_equivalence_proven: true,
    unmapped_voidtoken_atomic_verified_zero: true,
    orphan_contract_held_void_atomic_verified_zero: true,
    admin_gate_migrates: false,
    config_gate_migrates: false,
    legacy_wc_relayer_migrates: false,
    native_gas_is_economic_asset: false,
    migration_authorized: false,
    public_activation_authorized: false,
    money_movement_authorized: false,
  });
}
