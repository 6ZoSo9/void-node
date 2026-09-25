#!/usr/bin/env node

export const VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1 =
  "VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1";

export const REQUIRED_CANONICAL_CONTRACTS_V1 = Object.freeze({
  VoidToken: "0x470075b85352eb86f7d089fb9ba88945f12aad94",
  VoidTreasury: "0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514",
  OpsTreasury: "0xf0d64c62a87034e1838db8ec1e2e33666814e7d9",
  AdminGate: "0xdadb70747fb39e79c867811f5a5592c1611bcb52",
  ConfigGate: "0xcf4239ec209bbdb25f5c22903a5aa2050752dd24",
  ValidatorSet: "0x4b3f78e86b0427f750938e7b022d98aa4275f2f7",
  EmissionsController: "0x72b2dead8ce4728a1f3b800f96502a7ace091b81",
  RewardEngine: "0xe2670614ab3cab77999847f3fd2ff6fc34fe2292",
  UpgradeStaking: "0x77dfeedd19a4741f299c902ad5bbe0de917a9e59",
});

export const EXPECTED_VOIDTOKEN_TOTAL_SUPPLY_ATOMIC_V1 =
  "333333333000000000000000000";

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

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function requiredContractMap(candidate) {
  const rows = candidate?.canonical_contract_state_preservation;
  if (!Array.isArray(rows)) return null;
  const map = new Map();
  for (const row of rows) {
    if (!object(row)) return null;
    const role = String(row.role || "");
    const address = String(row.address || "").toLowerCase();
    if (!role || !/^0x[0-9a-f]{40}$/.test(address) || row.required !== true) {
      return null;
    }
    if (map.has(role)) return null;
    map.set(role, address);
  }
  return map;
}

function invariant(condition, reason) {
  if (!condition) throw new Error(reason);
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
      "archive_anvil_migrate_authoritative_state_to_clean_successor",
    "architecture_decision_drift",
  );

  const source = candidate.source_execution_layer;
  const successor = candidate.successor_execution_layer;
  invariant(object(source), "source_execution_layer_invalid");
  invariant(object(successor), "successor_execution_layer_invalid");

  invariant(source.implementation === "anvil", "source_must_be_anvil_archive");
  invariant(source.chain_id === 2050, "source_chain_id_mismatch");
  invariant(
    source.disposition === "immutable_economic_genesis_archive",
    "source_archive_disposition_mismatch",
  );
  invariant(source.future_write_authority === false, "legacy_write_authority_forbidden");
  invariant(source.raw_public_rpc_allowed === false, "legacy_public_rpc_forbidden");

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
    "bounded_submission_gateway_required",
  );
  invariant(successor.public_void_state_anchor_required === true, "public_void_anchor_required");
  invariant(successor.voidtoken_is_only_economic_void_asset === true, "voidtoken_economic_asset_required");
  invariant(successor.native_gas_is_economic_asset === false, "native_gas_must_not_be_economic_asset");
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

  const contractMap = requiredContractMap(candidate);
  if (!contractMap) return hold("canonical_contract_set_invalid");
  for (const [role, address] of Object.entries(REQUIRED_CANONICAL_CONTRACTS_V1)) {
    if (contractMap.get(role) !== address) {
      return hold("canonical_contract_set_mismatch", [role]);
    }
  }
  if (contractMap.size !== Object.keys(REQUIRED_CANONICAL_CONTRACTS_V1).length) {
    return hold("canonical_contract_set_extra_or_missing");
  }

  const conditional = candidate.conditional_state_preservation;
  invariant(object(conditional), "conditional_state_policy_invalid");
  invariant(
    conditional.later_contracts_must_be_discovered_from_final_live_snapshot === true,
    "final_live_contract_discovery_required",
  );
  invariant(
    conditional.include_if_live_code_and_role_or_balance_dependency_verified === true,
    "conditional_contract_dependency_verification_required",
  );
  invariant(
    conditional.caller_supplied_contract_allowlist_forbidden === true,
    "caller_supplied_contract_allowlist_forbidden",
  );
  invariant(
    conditional.canonical_dependency_graph_required === true,
    "canonical_dependency_graph_required",
  );

  const token = candidate.token_conservation;
  invariant(object(token), "token_conservation_invalid");
  invariant(
    token.expected_total_supply_atomic === EXPECTED_VOIDTOKEN_TOTAL_SUPPLY_ATOMIC_V1,
    "voidtoken_total_supply_target_mismatch",
  );
  invariant(
    token.premine_supply_mint_or_burn_during_migration_forbidden === true,
    "migration_mint_or_burn_forbidden",
  );
  invariant(token.holder_omission_forbidden === true, "holder_omission_forbidden");
  invariant(
    token.historical_superseded_test_delivery_not_recreated === true,
    "superseded_test_delivery_recreation_forbidden",
  );

  const quarantine = candidate.dev_and_test_quarantine;
  invariant(object(quarantine), "quarantine_policy_invalid");
  invariant(quarantine.legacy_wc_relayer_is_offchain_service === true, "legacy_relayer_classification_required");
  invariant(quarantine.legacy_wc_relayer_has_migration_authority === false, "legacy_relayer_migration_authority_forbidden");
  invariant(quarantine.devnet_wc_contracts_migrate === false, "devnet_wc_contract_migration_forbidden");
  invariant(quarantine.default_anvil_accounts_migrate_with_balances === false, "anvil_dev_balance_migration_forbidden");
  invariant(quarantine.known_anvil_private_key_transactions_allowed === false, "known_anvil_key_transactions_forbidden");
  invariant(
    quarantine.noncanonical_contract_migration_default ===
      "quarantine_unless_dependency_proven",
    "noncanonical_contract_default_mismatch",
  );
  invariant(
    quarantine.quarantined_contract_with_voidtoken_balance_forbidden === true,
    "quarantined_token_holder_forbidden",
  );
  invariant(
    quarantine.quarantined_contract_referenced_by_canonical_state_forbidden === true,
    "quarantined_dependency_forbidden",
  );

  const nativeGas = candidate.native_gas_cleanup;
  invariant(object(nativeGas), "native_gas_cleanup_invalid");
  invariant(nativeGas.old_native_balance_supply_is_void_supply === false, "old_native_gas_is_not_void_supply");
  invariant(nativeGas.old_native_balance_supply_migrates_as_economic_value === false, "old_native_gas_economic_migration_forbidden");
  invariant(nativeGas.known_dev_native_balances_preserved === false, "known_dev_native_balance_preservation_forbidden");

  const authority = candidate.launch_authority;
  invariant(object(authority), "authority_invalid");
  invariant(authority.source_only === true, "source_only_required");
  for (const [key, value] of Object.entries(authority)) {
    if (key === "source_only") continue;
    invariant(value === false, "authority_must_remain_false:" + key);
  }

  const missing = [];
  const requireTrue = (value, gate) => {
    if (value !== true) missing.push(gate);
  };
  const requireValue = (value, gate) => {
    if (value === null || value === undefined || value === "") missing.push(gate);
  };

  requireValue(source.latest_authoritative_snapshot_block, "latest_authoritative_snapshot_block_required");
  requireValue(source.latest_authoritative_snapshot_block_hash, "latest_authoritative_snapshot_block_hash_required");
  requireValue(source.state_dump_sha256, "source_state_dump_sha256_required");
  requireValue(source.archive_manifest_sha256, "archive_manifest_sha256_required");

  requireTrue(token.final_snapshot_total_supply_verified, "final_snapshot_total_supply_verification_required");
  requireTrue(token.every_nonzero_holder_enumerated, "all_nonzero_voidtoken_holders_enumeration_required");
  requireTrue(token.every_holder_balance_conserved, "all_voidtoken_holder_balance_conservation_required");
  requireTrue(token.aggregate_holder_sum_matches_total_supply, "voidtoken_holder_sum_supply_conservation_required");

  const state = candidate.contract_state_conservation;
  requireTrue(state?.required_contract_runtime_hashes_verified, "required_contract_runtime_hash_verification_required");
  requireTrue(state?.required_contract_storage_roots_verified, "required_contract_storage_root_verification_required");
  requireTrue(state?.required_contract_nonces_verified, "required_contract_nonce_verification_required");
  requireTrue(state?.canonical_role_bindings_verified, "canonical_role_binding_verification_required");
  requireTrue(state?.privileged_eoa_rotation_or_preservation_policy_verified, "privileged_eoa_policy_required");
  requireTrue(state?.admin_gate_master_authority_preserved_or_explicitly_rotated, "admin_gate_authority_transition_required");
  requireTrue(state?.treasury_authority_preserved_or_explicitly_rotated, "treasury_authority_transition_required");
  requireTrue(state?.upgrade_staking_state_conserved, "upgrade_staking_state_conservation_required");

  requireTrue(nativeGas.successor_native_gas_supply_accounted, "successor_native_gas_supply_accounting_required");
  requireTrue(nativeGas.successor_execution_fee_model_proven, "successor_execution_fee_model_proof_required");
  requireTrue(nativeGas.participant_gas_path_proven, "participant_execution_gas_path_proof_required");

  const replay = candidate.replay_and_epoch_safety;
  requireTrue(replay?.legacy_write_rpc_disabled_before_successor_activation, "legacy_write_rpc_disable_required");
  requireTrue(replay?.execution_epoch_bound_in_public_gateway, "execution_epoch_gateway_binding_required");
  requireTrue(replay?.privileged_signer_nonce_or_key_replay_fence_proven, "privileged_signer_replay_fence_required");
  requireTrue(replay?.pending_legacy_signed_transaction_census_complete, "pending_legacy_signed_transaction_census_required");
  requireTrue(replay?.cross_epoch_replay_protection_proven, "cross_epoch_replay_protection_required");

  const pub = candidate.public_verification;
  requireTrue(pub?.migration_manifest_content_addressed, "content_addressed_migration_manifest_required");
  requireTrue(pub?.source_snapshot_public_evidence_ready, "source_snapshot_public_evidence_required");
  requireTrue(pub?.successor_genesis_or_state_manifest_public_evidence_ready, "successor_state_manifest_public_evidence_required");
  requireTrue(pub?.successor_state_root_public_void_anchor_ready, "successor_state_root_void_anchor_required");
  requireTrue(pub?.public_balance_receipt_code_verification_ready, "public_economic_verification_path_required");

  if (missing.length) return hold("migration_gates_incomplete", missing);

  return Object.freeze({
    ok: true,
    status: "SOURCE_READY",
    marker: VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1,
    architecture_decision: candidate.architecture_decision,
    execution_epoch: successor.execution_epoch,
    chain_id: successor.chain_id,
    required_contract_count: contractMap.size,
    voidtoken_total_supply_atomic: token.expected_total_supply_atomic,
    legacy_anvil_disposition: source.disposition,
    legacy_wc_relayer_migrates: false,
    devnet_wc_contracts_migrate: false,
    native_gas_is_economic_asset: false,
    migration_authorized: false,
    public_activation_authorized: false,
    money_movement_authorized: false,
  });
}
