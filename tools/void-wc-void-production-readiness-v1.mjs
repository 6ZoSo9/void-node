export const VOID_WC_VOID_PRODUCTION_READINESS_V1 =
  "VOID_WC_VOID_PRODUCTION_READINESS_V1";

export const VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1 = Object.freeze({
  source_classification_only: true,
  wallet_or_signer_access: false,
  transaction_signing: false,
  transaction_broadcast: false,
  treasury_transfer: false,
  liquidity_movement: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
});

const CANDIDATE_KEYS = Object.freeze([
  "authority",
  "bounded_canary_green",
  "chain_id",
  "coupled_activation_ready",
  "coupled_native_gas_liability_policy_implemented",
  "coupled_native_gas_liability_policy_path",
  "coupled_native_gas_reservation_journal_implemented",
  "coupled_native_nonce_scheduler_implemented",
  "economic_execution_layer_identity_resolved",
  "economic_execution_layer_public_verification_ready",
  "native_gas_currency_supply_accounting_ready",
  "known_anvil_prefunded_dev_accounts_neutralized",
  "known_anvil_dev_private_key_submission_blocked",
  "native_gas_genesis_supply_and_known_key_accounts_reconciled",
  "private_evm_selector_durability_deployed",
  "latest_economic_state_durable_checkpoint_ready",
  "private_evm_restart_recovery_proven",
  "private_evm_stale_state_fallback_impossible",
  "economic_mutation_durability_gate_active",
  "participant_post_purchase_voidtoken_control_ready",
  "participant_voidtoken_transfer_submission_path_ready",
  "participant_native_gas_access_or_paymaster_model_ready",
  "presale_micro_purchase_gas_grief_protection_ready",
  "wc_void_microtrade_gas_grief_protection_ready",
  "coupled_unfunded_reservation_hoarding_protection_ready",
  "presale_payment_instruction_ttl_and_late_payment_policy_ready",
  "wc_void_outstanding_intent_cap_and_expiry_ready",
  "wc_void_opening_price_manipulation_protection_ready",
  "wc_void_opening_commitment_window_policy_ready",
  "wc_void_opening_participant_provenance_and_eligibility_ready",
  "wc_void_opening_concentration_and_sybil_limits_ready",
  "wc_void_opening_minimum_quote_depth_policy_ready",
  "wc_void_opening_nonproduction_wc_exclusion_ready",
  "wc_void_opening_participant_consideration_model_ready",
  "wc_void_opening_wc_debit_claim_or_refund_binding_ready",
  "wc_void_opening_post_discovery_reserve_conservation_ready",
  "wc_void_opening_allocation_tranche_or_liquidity_claim_policy_ready",
  "wc_void_shared_post_discovery_model_reconciled",
  "wc_void_quote_reserve_transfer_or_escrow_primitive_ready",
  "wc_void_quote_reserve_transfer_conservation_proven",
  "public_economic_fee_and_net_output_disclosure_ready",
  "public_economic_expiry_and_gas_payer_disclosure_ready",
  "fresh_fee_admission_guard_integrated",
  "gas_reservation_terminal_receipt_finality_release_guard_implemented",
  "presale_native_gas_reserve_protection_integrated",
  "presale_native_gas_lifetime_capacity_or_replenishment_ready",
  "wc_void_native_gas_replenishment_or_user_paid_model_ready",
  "wc_void_fee_coverage_scope",
  "wc_void_reverse_settlement_adapter_ready",
  "wc_settlement_runtime_gas_ceiling_observed",
  "wc_settlement_runtime_gas_limit",
  "wc_settlement_max_fee_per_gas_wei",
  "shared_gas_payer_double_spend_protection_proven",
  "default_private_key_allowed",
  "default_wallet_allowed",
  "duplicate_replay_protection_proven",
  "fixed_conversion",
  "fixed_opening_price",
  "inventory_funded",
  "inventory_lock_proven",
  "legacy_devnet_relayer_reused",
  "market_vault_contract_name",
  "market_vault_source_path",
  "market_vault_source_implemented",
  "market_vault_lock_semantics_proven",
  "market_vault_recovery_path_ready",
  "market_vault_compiler_profile_locked",
  "market_vault_dual_compiler_gate_implemented",
  "market_vault_compiled_identity_committed",
  "market_vault_deployment_preparation_implemented",
  "market_vault_deployer_observer_implemented",
  "market_vault_deployer_generation_evidence_committed",
  "market_vault_deployer_generation_evidence_path",
  "market_vault_deployer_public_identity_sha256",
  "market_vault_deployer_address",
  "market_vault_deployer_observation_evidence_path",
  "market_vault_deployer_observation_json_sha256",
  "market_vault_deployer_observation_block_number",
  "market_vault_deployer_observation_block_hash",
  "market_vault_deployer_observation_verified",
  "market_vault_deployer_pending_nonce",
  "market_vault_predicted_contract_address",
  "market_vault_deployment_gas_estimate",
  "market_vault_proposed_deployment_gas_limit",
  "market_vault_proposed_max_deployment_cost_wei",
  "market_vault_deployer_balance_wei",
  "market_vault_deployer_balance_sufficient",
  "market_vault_fee_caps_sufficient",
  "market_vault_coupled_launch_commitment_committed",
  "market_vault_role_binding_proposal_implemented",
  "market_vault_role_binding_proposal_path",
  "market_vault_role_binding_authorization_committed",
  "market_vault_role_binding_authorization_id",
  "market_vault_role_binding_authorization_path",
  "market_vault_launch_controller",
  "market_vault_settlement_executor",
  "market_vault_closeout_controller",
  "market_vault_final_role_bindings_attested",
  "market_vault_coupled_launch_id",
  "market_vault_compiled_identity_id",
  "market_vault_compiled_identity_manifest_path",
  "market_vault_creation_bytecode_sha256",
  "market_vault_runtime_template_sha256",
  "market_vault_immutable_layout_sha256",
  "market_vault_address",
  "market_vault_independently_verified",
  "market_vault_runtime_code_sha256",
  "marker",
  "native_void_token",
  "opening_discovery_implemented",
  "opening_price_source",
  "opening_sale_tranche_void_atoms",
  "post_opening_void_reserve_atoms",
  "opening_allocation_policy",
  "pair",
  "protocol_void_inventory_atoms",
  "protocol_wc_seed_units",
  "status",
  "version",
  "wc_settlement_adapter_id",
  "wc_settlement_adapter_implemented",
  "wc_settlement_adapter_independently_reviewed",
  "wc_ledger_persistence_verifier_implemented",
  "wc_ledger_persistence_verified",
  "quote_reserve_custody_verified",
  "participant_opening_claim_policy_ready",
  "wc_source_profile",
]);

const SOURCE_PROFILE_KEYS = Object.freeze([
  "quote_asset_form",
  "quote_decimals",
  "quote_unit",
  "source_domain",
]);

const AUTHORITY_KEYS = Object.freeze([
  "funds_movement",
  "liquidity_movement",
  "market_activation",
  "public_presale_activation",
  "transaction_broadcast",
  "transaction_signing",
  "treasury_transfer",
  "wallet_or_signer_access",
]);

const ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const SHA256_HEX = /^[0-9a-f]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/u;
const UINT = /^(0|[1-9][0-9]*)$/u;

const EXPECTED_VOID_TOKEN = "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const EXPECTED_VOID_INVENTORY_ATOMS = 10_000_000n * 10n ** 18n;
const EXPECTED_OPENING_SALE_TRANCHE_ATOMS = 5_000_000n * 10n ** 18n;
const EXPECTED_POST_OPENING_VOID_RESERVE_ATOMS = 5_000_000n * 10n ** 18n;
const EXPECTED_OPENING_ALLOCATION_POLICY = "pro_rata_largest_remainder_v1";
const EXPECTED_COMPILED_IDENTITY_ID =
  "voidwcvci1_f4096e7c4520897d656a64a8be5b344a3541e0e960226787654415f867f2d045";
const EXPECTED_COMPILED_IDENTITY_MANIFEST =
  "ops/mainnet0/wc-void-market-vault-v2-compiled-identity-v1.json";
const EXPECTED_CREATION_SHA256 =
  "84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540";
const EXPECTED_RUNTIME_TEMPLATE_SHA256 =
  "99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e";
const EXPECTED_IMMUTABLE_LAYOUT_SHA256 =
  "61de8af4e7f5a960227cb76383b7e48d52ddceb305d043f6905812deeb02d33b";
const EXPECTED_COUPLED_LAUNCH_ID =
  "0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83";
const EXPECTED_ROLE_PROPOSAL_PATH =
  "ops/mainnet0/wc-void-coupled-launch-role-proposal-v1.json";
const EXPECTED_ROLE_AUTHORIZATION_ID =
  "voidwcvra1_8bd7a5dbb1f27b61fd236ee0588c1271cb86e719a7de8db0465a6070831b8b36";
const EXPECTED_ROLE_AUTHORIZATION_PATH =
  "ops/mainnet0/wc-void-market-vault-role-binding-authorization-v1.json";
const EXPECTED_LAUNCH_CONTROLLER =
  "0x2f1e0005e865b772b268bd8c797bf3eaa901d97e";
const EXPECTED_SETTLEMENT_EXECUTOR =
  "0xc884f631c3881b8b672bfcbf019c856146cd7f73";
const EXPECTED_CLOSEOUT_CONTROLLER =
  "0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b";
const EXPECTED_DEPLOYER =
  "0x907ea7d0d57f5631219674bdf666a7e929613074";
const EXPECTED_DEPLOYER_EVIDENCE_PATH =
  "ops/mainnet0/wc-void-market-vault-deployer-offline-generation-evidence-v1.json";
const EXPECTED_DEPLOYER_PUBLIC_IDENTITY_SHA256 =
  "7e0522e971060ae1bbe1011b01c2d64bb84234c0f7069701a4459f351ee113ac";
const EXPECTED_DEPLOYER_OBSERVATION_EVIDENCE_PATH =
  "ops/mainnet0/wc-void-market-vault-deployment-observation-evidence-v1.json";
const EXPECTED_DEPLOYER_OBSERVATION_JSON_SHA256 =
  "f4154d928766c74cad326643c2f46ad0322b917fae593e94a030d8d80046ce5c";
const EXPECTED_DEPLOYER_OBSERVATION_BLOCK_NUMBER = "37392";
const EXPECTED_DEPLOYER_OBSERVATION_BLOCK_HASH =
  "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52";
const EXPECTED_DEPLOYER_PENDING_NONCE = "0";
const EXPECTED_PREDICTED_CONTRACT =
  "0x210b006e39a78d02330ae648262025d8fa22e9f0";
const EXPECTED_DEPLOYMENT_GAS_ESTIMATE = "1852535";
const EXPECTED_DEPLOYMENT_GAS_LIMIT = "2223042";
const EXPECTED_MAX_DEPLOYMENT_COST_WEI = "6669126000000000";
const EXPECTED_DEPLOYER_BALANCE_WEI = "0";
const EXPECTED_COUPLED_GAS_POLICY_PATH =
  "tools/void-coupled-native-gas-liability-v1.mjs";
const EXPECTED_WC_SETTLEMENT_MAX_FEE_PER_GAS_WEI = "3000000000";

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error(`${label} must use a plain prototype`);
  }
  return value;
}

function exactObject(value, keys, label) {
  const object = plainObject(value, label);
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} keys mismatch`);
  }
  return object;
}

function hold(reason, extra = {}) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_WC_VOID_PRODUCTION_READINESS_V1,
    reason,
    ...extra,
    authority: VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1,
  });
}

function canonicalUint(value, label) {
  if (typeof value !== "string" || value.length > 78 || !UINT.test(value)) {
    throw new Error(`${label} must be a canonical unsigned decimal string`);
  }
  return BigInt(value);
}

function allFalseAuthority(value) {
  const authority = exactObject(value, AUTHORITY_KEYS, "authority");
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) {
      throw new Error(`authority.${key} must remain false`);
    }
  }
  return true;
}

export function classifyVoidWcVoidProductionReadinessV1(raw) {
  let candidate;
  try {
    candidate = exactObject(raw, CANDIDATE_KEYS, "WC/VOID production candidate");
    allFalseAuthority(candidate.authority);

    if (
      candidate.marker !== "VOID_WC_VOID_PRODUCTION_CANDIDATE_V1" ||
      candidate.version !== 1 ||
      !["hold", "source_ready"].includes(candidate.status)
    ) {
      return hold("candidate_identity_invalid");
    }
    if (candidate.chain_id !== 2050 || candidate.pair !== "WC_VOID") {
      return hold("network_or_pair_mismatch");
    }
    if (
      typeof candidate.native_void_token !== "string" ||
      !ADDRESS.test(candidate.native_void_token) ||
      candidate.native_void_token.toLowerCase() !== EXPECTED_VOID_TOKEN
    ) {
      return hold("canonical_void_token_mismatch");
    }
    if (
      canonicalUint(
        candidate.protocol_void_inventory_atoms,
        "protocol_void_inventory_atoms",
      ) !== EXPECTED_VOID_INVENTORY_ATOMS
    ) {
      return hold("protocol_void_inventory_mismatch");
    }
    if (canonicalUint(candidate.protocol_wc_seed_units, "protocol_wc_seed_units") !== 0n) {
      return hold("protocol_wc_seed_must_be_zero");
    }
    if (candidate.fixed_conversion !== false || candidate.fixed_opening_price !== false) {
      return hold("fixed_wc_void_price_authority_forbidden");
    }
    if (
      candidate.opening_price_source !==
        "settled_wc_over_opening_sale_tranche"
    ) {
      return hold("opening_price_source_mismatch");
    }
    if (
      candidate.opening_sale_tranche_void_atoms !==
        EXPECTED_OPENING_SALE_TRANCHE_ATOMS.toString() ||
      candidate.post_opening_void_reserve_atoms !==
        EXPECTED_POST_OPENING_VOID_RESERVE_ATOMS.toString() ||
      candidate.opening_allocation_policy !==
        EXPECTED_OPENING_ALLOCATION_POLICY
    ) {
      return hold("opening_allocation_policy_mismatch");
    }

    const profile = exactObject(
      candidate.wc_source_profile,
      SOURCE_PROFILE_KEYS,
      "WC source profile",
    );
    if (
      profile.source_domain !== "void-work-credit-ledger" ||
      profile.quote_asset_form !== "ledger-credit" ||
      profile.quote_unit !== "wc" ||
      profile.quote_decimals !== 0
    ) {
      return hold("wc_source_profile_mismatch");
    }

    if (
      candidate.market_vault_contract_name !== "WCVoidMarketVaultV2" ||
      candidate.market_vault_source_path !==
        "contracts/mainnet/WCVoidMarketVaultV2.sol"
    ) {
      return hold("market_vault_source_identity_mismatch");
    }
    if (candidate.market_vault_source_implemented !== true) {
      return hold("market_vault_source_implementation_missing");
    }
    if (candidate.market_vault_lock_semantics_proven !== true) {
      return hold("market_vault_lock_semantics_not_proven");
    }
    if (candidate.market_vault_compiler_profile_locked !== true) {
      return hold("market_vault_compiler_profile_not_locked");
    }
    if (candidate.market_vault_dual_compiler_gate_implemented !== true) {
      return hold("market_vault_dual_compiler_gate_missing");
    }
    if (candidate.market_vault_deployment_preparation_implemented !== true) {
      return hold("market_vault_deployment_preparation_missing");
    }
    if (candidate.market_vault_deployer_observer_implemented !== true) {
      return hold("market_vault_deployer_observer_missing");
    }
    if (candidate.market_vault_deployer_generation_evidence_committed === true) {
      if (
        candidate.market_vault_deployer_generation_evidence_path !==
          EXPECTED_DEPLOYER_EVIDENCE_PATH ||
        candidate.market_vault_deployer_public_identity_sha256 !==
          EXPECTED_DEPLOYER_PUBLIC_IDENTITY_SHA256 ||
        typeof candidate.market_vault_deployer_address !== "string" ||
        candidate.market_vault_deployer_address.toLowerCase() !==
          EXPECTED_DEPLOYER
      ) {
        return hold("market_vault_deployer_generation_binding_mismatch");
      }
    }
    if (candidate.market_vault_deployer_observation_verified === true) {
      if (
        candidate.market_vault_deployer_observation_evidence_path !==
          EXPECTED_DEPLOYER_OBSERVATION_EVIDENCE_PATH ||
        candidate.market_vault_deployer_observation_json_sha256 !==
          EXPECTED_DEPLOYER_OBSERVATION_JSON_SHA256 ||
        candidate.market_vault_deployer_observation_block_number !==
          EXPECTED_DEPLOYER_OBSERVATION_BLOCK_NUMBER ||
        candidate.market_vault_deployer_observation_block_hash !==
          EXPECTED_DEPLOYER_OBSERVATION_BLOCK_HASH ||
        candidate.market_vault_deployer_pending_nonce !==
          EXPECTED_DEPLOYER_PENDING_NONCE ||
        typeof candidate.market_vault_predicted_contract_address !== "string" ||
        candidate.market_vault_predicted_contract_address.toLowerCase() !==
          EXPECTED_PREDICTED_CONTRACT ||
        candidate.market_vault_deployment_gas_estimate !==
          EXPECTED_DEPLOYMENT_GAS_ESTIMATE ||
        candidate.market_vault_proposed_deployment_gas_limit !==
          EXPECTED_DEPLOYMENT_GAS_LIMIT ||
        candidate.market_vault_proposed_max_deployment_cost_wei !==
          EXPECTED_MAX_DEPLOYMENT_COST_WEI ||
        candidate.market_vault_deployer_balance_wei !==
          EXPECTED_DEPLOYER_BALANCE_WEI ||
        candidate.market_vault_fee_caps_sufficient !== true
      ) {
        return hold("market_vault_deployer_observation_binding_mismatch");
      }
    }
    if (candidate.market_vault_coupled_launch_commitment_committed !== true) {
      return hold("market_vault_coupled_launch_commitment_missing");
    }
    if (candidate.market_vault_role_binding_proposal_implemented !== true) {
      return hold("market_vault_role_binding_proposal_missing");
    }
    if (
      candidate.market_vault_role_binding_proposal_path !==
      EXPECTED_ROLE_PROPOSAL_PATH
    ) {
      return hold("market_vault_role_binding_proposal_path_mismatch");
    }
    if (candidate.market_vault_role_binding_authorization_committed !== true) {
      return hold("market_vault_role_binding_authorization_missing");
    }
    if (
      candidate.market_vault_role_binding_authorization_id !==
        EXPECTED_ROLE_AUTHORIZATION_ID ||
      candidate.market_vault_role_binding_authorization_path !==
        EXPECTED_ROLE_AUTHORIZATION_PATH
    ) {
      return hold("market_vault_role_binding_authorization_mismatch");
    }
    if (
      typeof candidate.market_vault_launch_controller !== "string" ||
      typeof candidate.market_vault_settlement_executor !== "string" ||
      typeof candidate.market_vault_closeout_controller !== "string" ||
      candidate.market_vault_launch_controller.toLowerCase() !==
        EXPECTED_LAUNCH_CONTROLLER ||
      candidate.market_vault_settlement_executor.toLowerCase() !==
        EXPECTED_SETTLEMENT_EXECUTOR ||
      candidate.market_vault_closeout_controller.toLowerCase() !==
        EXPECTED_CLOSEOUT_CONTROLLER
    ) {
      return hold("market_vault_final_role_binding_mismatch");
    }
    if (
      typeof candidate.market_vault_coupled_launch_id !== "string" ||
      !/^0x[0-9a-fA-F]{64}$/u.test(candidate.market_vault_coupled_launch_id) ||
      /^0x0{64}$/iu.test(candidate.market_vault_coupled_launch_id) ||
      candidate.market_vault_coupled_launch_id.toLowerCase() !==
        EXPECTED_COUPLED_LAUNCH_ID
    ) {
      return hold("market_vault_coupled_launch_id_mismatch");
    }
    if (candidate.market_vault_compiled_identity_committed === true) {
      if (
        candidate.market_vault_compiled_identity_id !==
          EXPECTED_COMPILED_IDENTITY_ID ||
        candidate.market_vault_compiled_identity_manifest_path !==
          EXPECTED_COMPILED_IDENTITY_MANIFEST ||
        candidate.market_vault_creation_bytecode_sha256 !==
          EXPECTED_CREATION_SHA256 ||
        candidate.market_vault_runtime_template_sha256 !==
          EXPECTED_RUNTIME_TEMPLATE_SHA256 ||
        candidate.market_vault_immutable_layout_sha256 !==
          EXPECTED_IMMUTABLE_LAYOUT_SHA256
      ) {
        return hold("market_vault_compiled_identity_binding_mismatch");
      }
    }

    if (
      candidate.coupled_native_gas_liability_policy_implemented !== true ||
      candidate.coupled_native_gas_liability_policy_path !==
        EXPECTED_COUPLED_GAS_POLICY_PATH
    ) {
      return hold("coupled_native_gas_liability_policy_binding_mismatch");
    }
    if (
      candidate.wc_void_fee_coverage_scope !==
        "opening_wc_to_void_settlement_only"
    ) {
      return hold("wc_void_fee_coverage_scope_mismatch");
    }
    if (
      candidate.wc_settlement_max_fee_per_gas_wei !==
        EXPECTED_WC_SETTLEMENT_MAX_FEE_PER_GAS_WEI
    ) {
      return hold("wc_settlement_max_fee_per_gas_binding_mismatch");
    }
    if (candidate.wc_settlement_runtime_gas_ceiling_observed === true) {
      if (
        typeof candidate.wc_settlement_runtime_gas_limit !== "string" ||
        !UINT.test(candidate.wc_settlement_runtime_gas_limit) ||
        BigInt(candidate.wc_settlement_runtime_gas_limit) === 0n
      ) {
        return hold("wc_settlement_runtime_gas_limit_invalid");
      }
    } else if (candidate.wc_settlement_runtime_gas_limit !== null) {
      return hold("wc_settlement_runtime_gas_limit_must_be_null_until_observed");
    }

    if (
      candidate.legacy_devnet_relayer_reused !== false ||
      candidate.default_private_key_allowed !== false ||
      candidate.default_wallet_allowed !== false
    ) {
      return hold("devnet_or_default_secret_path_forbidden");
    }
  } catch (error) {
    return hold("candidate_shape_or_value_invalid", {
      error_class:
        error instanceof Error && /^[A-Za-z0-9._:-]{1,80}$/u.test(error.name)
          ? error.name
          : "Error",
    });
  }

  const missing = [];
  if (candidate.market_vault_recovery_path_ready !== true) {
    return hold("market_vault_recovery_path_not_ready");
  }
  if (candidate.market_vault_compiled_identity_committed !== true) {
    missing.push("market_vault_compiled_identity_required");
  }
  if (candidate.market_vault_final_role_bindings_attested !== true) {
    missing.push("market_vault_final_role_bindings_required");
  }
  if (candidate.market_vault_deployer_generation_evidence_committed !== true) {
    missing.push("market_vault_deployer_generation_evidence_required");
  }
  if (candidate.market_vault_deployer_address === null) {
    missing.push("market_vault_deployer_address_required");
  } else if (
    typeof candidate.market_vault_deployer_address !== "string" ||
    !ADDRESS.test(candidate.market_vault_deployer_address)
  ) {
    return hold("market_vault_deployer_address_invalid");
  }
  if (candidate.market_vault_deployer_observation_verified !== true) {
    missing.push("market_vault_deployer_observation_required");
  }
  if (candidate.market_vault_deployer_pending_nonce === null) {
    missing.push("market_vault_deployer_pending_nonce_required");
  } else if (
    typeof candidate.market_vault_deployer_pending_nonce !== "string" ||
    !UINT.test(candidate.market_vault_deployer_pending_nonce)
  ) {
    return hold("market_vault_deployer_pending_nonce_invalid");
  }
  if (candidate.market_vault_predicted_contract_address === null) {
    missing.push("market_vault_predicted_contract_address_required");
  } else if (
    typeof candidate.market_vault_predicted_contract_address !== "string" ||
    !ADDRESS.test(candidate.market_vault_predicted_contract_address)
  ) {
    return hold("market_vault_predicted_contract_address_invalid");
  }
  if (candidate.market_vault_deployment_gas_estimate === null) {
    missing.push("market_vault_deployment_gas_estimate_required");
  } else if (
    typeof candidate.market_vault_deployment_gas_estimate !== "string" ||
    !UINT.test(candidate.market_vault_deployment_gas_estimate)
  ) {
    return hold("market_vault_deployment_gas_estimate_invalid");
  }
  if (candidate.market_vault_proposed_deployment_gas_limit === null) {
    missing.push("market_vault_proposed_deployment_gas_limit_required");
  } else if (
    typeof candidate.market_vault_proposed_deployment_gas_limit !== "string" ||
    !UINT.test(candidate.market_vault_proposed_deployment_gas_limit)
  ) {
    return hold("market_vault_proposed_deployment_gas_limit_invalid");
  }
  if (candidate.market_vault_deployer_balance_sufficient !== true) {
    missing.push("market_vault_deployer_balance_sufficiency_required");
  }
  if (candidate.market_vault_fee_caps_sufficient !== true) {
    missing.push("market_vault_fee_caps_sufficiency_required");
  }
  if (candidate.market_vault_address === null) {
    missing.push("market_vault_address_required");
  } else if (
    typeof candidate.market_vault_address !== "string" ||
    !ADDRESS.test(candidate.market_vault_address)
  ) {
    return hold("market_vault_address_invalid");
  }

  if (candidate.market_vault_runtime_code_sha256 === null) {
    missing.push("market_vault_runtime_code_sha256_required");
  } else if (
    typeof candidate.market_vault_runtime_code_sha256 !== "string" ||
    !SHA256_HEX.test(candidate.market_vault_runtime_code_sha256)
  ) {
    return hold("market_vault_runtime_code_sha256_invalid");
  }

  if (candidate.market_vault_independently_verified !== true) {
    missing.push("market_vault_independent_verification_required");
  }
  if (candidate.inventory_funded !== true) {
    missing.push("inventory_funding_required");
  }
  if (candidate.inventory_lock_proven !== true) {
    missing.push("inventory_lock_proof_required");
  }
  if (candidate.opening_discovery_implemented !== true) {
    missing.push("opening_discovery_implementation_required");
  }

  if (candidate.wc_settlement_adapter_id === null) {
    missing.push("wc_settlement_adapter_id_required");
  } else if (
    typeof candidate.wc_settlement_adapter_id !== "string" ||
    !SAFE_ID.test(candidate.wc_settlement_adapter_id)
  ) {
    return hold("wc_settlement_adapter_id_invalid");
  }

  if (candidate.wc_settlement_adapter_implemented !== true) {
    missing.push("wc_settlement_adapter_implementation_required");
  }
  if (candidate.wc_settlement_adapter_independently_reviewed !== true) {
    missing.push("wc_settlement_adapter_independent_review_required");
  }
  if (candidate.wc_ledger_persistence_verifier_implemented !== true) {
    missing.push("wc_ledger_persistence_verifier_implementation_required");
  }
  if (candidate.wc_ledger_persistence_verified !== true) {
    missing.push("wc_ledger_persistence_verification_required");
  }
  if (candidate.quote_reserve_custody_verified !== true) {
    missing.push("quote_reserve_custody_verification_required");
  }
  if (candidate.participant_opening_claim_policy_ready !== true) {
    missing.push("participant_opening_claim_policy_required");
  }
  if (candidate.coupled_native_gas_reservation_journal_implemented !== true) {
    missing.push("coupled_native_gas_reservation_journal_required");
  }
  if (candidate.coupled_native_nonce_scheduler_implemented !== true) {
    missing.push("coupled_native_nonce_scheduler_required");
  }
  if (candidate.economic_execution_layer_identity_resolved !== true) {
    missing.push("economic_execution_layer_identity_resolution_required");
  }
  if (candidate.economic_execution_layer_public_verification_ready !== true) {
    missing.push("economic_execution_layer_public_verification_required");
  }
  if (candidate.native_gas_currency_supply_accounting_ready !== true) {
    missing.push("native_gas_currency_supply_accounting_required");
  }
  if (candidate.known_anvil_prefunded_dev_accounts_neutralized !== true) {
    missing.push("known_anvil_prefunded_dev_accounts_neutralization_required");
  }
  if (candidate.known_anvil_dev_private_key_submission_blocked !== true) {
    missing.push("known_anvil_dev_private_key_submission_block_required");
  }
  if (
    candidate.native_gas_genesis_supply_and_known_key_accounts_reconciled
    !== true
  ) {
    missing.push("native_gas_genesis_supply_and_known_key_accounts_reconciliation_required");
  }
  if (candidate.private_evm_selector_durability_deployed !== true) {
    missing.push("private_evm_selector_durability_deployment_required");
  }
  if (candidate.latest_economic_state_durable_checkpoint_ready !== true) {
    missing.push("latest_economic_state_durable_checkpoint_required");
  }
  if (candidate.private_evm_restart_recovery_proven !== true) {
    missing.push("private_evm_restart_recovery_proof_required");
  }
  if (candidate.private_evm_stale_state_fallback_impossible !== true) {
    missing.push("private_evm_stale_state_fallback_exclusion_required");
  }
  if (candidate.economic_mutation_durability_gate_active !== true) {
    missing.push("economic_mutation_durability_gate_activation_required");
  }
  if (candidate.participant_post_purchase_voidtoken_control_ready !== true) {
    missing.push("participant_post_purchase_voidtoken_control_required");
  }
  if (candidate.participant_voidtoken_transfer_submission_path_ready !== true) {
    missing.push("participant_voidtoken_transfer_submission_path_required");
  }
  if (candidate.participant_native_gas_access_or_paymaster_model_ready !== true) {
    missing.push("participant_native_gas_access_or_paymaster_model_required");
  }
  if (candidate.presale_micro_purchase_gas_grief_protection_ready !== true) {
    missing.push("presale_micro_purchase_gas_grief_protection_required");
  }
  if (candidate.wc_void_microtrade_gas_grief_protection_ready !== true) {
    missing.push("wc_void_microtrade_gas_grief_protection_required");
  }
  if (
    candidate.coupled_unfunded_reservation_hoarding_protection_ready !== true
  ) {
    missing.push("coupled_unfunded_reservation_hoarding_protection_required");
  }
  if (
    candidate.presale_payment_instruction_ttl_and_late_payment_policy_ready
    !== true
  ) {
    missing.push("presale_payment_instruction_ttl_and_late_payment_policy_required");
  }
  if (candidate.wc_void_outstanding_intent_cap_and_expiry_ready !== true) {
    missing.push("wc_void_outstanding_intent_cap_and_expiry_required");
  }
  if (candidate.wc_void_opening_price_manipulation_protection_ready !== true) {
    missing.push("wc_void_opening_price_manipulation_protection_required");
  }
  if (candidate.wc_void_opening_commitment_window_policy_ready !== true) {
    missing.push("wc_void_opening_commitment_window_policy_required");
  }
  if (
    candidate.wc_void_opening_participant_provenance_and_eligibility_ready
    !== true
  ) {
    missing.push("wc_void_opening_participant_provenance_and_eligibility_required");
  }
  if (candidate.wc_void_opening_concentration_and_sybil_limits_ready !== true) {
    missing.push("wc_void_opening_concentration_and_sybil_limits_required");
  }
  if (candidate.wc_void_opening_minimum_quote_depth_policy_ready !== true) {
    missing.push("wc_void_opening_minimum_quote_depth_policy_required");
  }
  if (candidate.wc_void_opening_nonproduction_wc_exclusion_ready !== true) {
    missing.push("wc_void_opening_nonproduction_wc_exclusion_required");
  }
  if (candidate.wc_void_opening_participant_consideration_model_ready !== true) {
    missing.push("wc_void_opening_participant_consideration_model_required");
  }
  if (
    candidate.wc_void_opening_wc_debit_claim_or_refund_binding_ready !== true
  ) {
    missing.push("wc_void_opening_wc_debit_claim_or_refund_binding_required");
  }
  if (
    candidate.wc_void_opening_post_discovery_reserve_conservation_ready !== true
  ) {
    missing.push("wc_void_opening_post_discovery_reserve_conservation_required");
  }
  if (
    candidate.wc_void_opening_allocation_tranche_or_liquidity_claim_policy_ready
    !== true
  ) {
    missing.push("wc_void_opening_allocation_tranche_or_liquidity_claim_policy_required");
  }
  if (candidate.wc_void_shared_post_discovery_model_reconciled !== true) {
    missing.push("wc_void_shared_post_discovery_model_reconciliation_required");
  }
  if (
    candidate.wc_void_quote_reserve_transfer_or_escrow_primitive_ready
    !== true
  ) {
    missing.push("wc_void_quote_reserve_transfer_or_escrow_primitive_required");
  }
  if (candidate.wc_void_quote_reserve_transfer_conservation_proven !== true) {
    missing.push("wc_void_quote_reserve_transfer_conservation_proof_required");
  }
  if (candidate.public_economic_fee_and_net_output_disclosure_ready !== true) {
    missing.push("public_economic_fee_and_net_output_disclosure_required");
  }
  if (
    candidate.public_economic_expiry_and_gas_payer_disclosure_ready !== true
  ) {
    missing.push("public_economic_expiry_and_gas_payer_disclosure_required");
  }
  if (candidate.fresh_fee_admission_guard_integrated !== true) {
    missing.push("fresh_fee_admission_guard_required");
  }
  if (
    candidate.gas_reservation_terminal_receipt_finality_release_guard_implemented
    !== true
  ) {
    missing.push("gas_reservation_terminal_receipt_finality_release_guard_required");
  }
  if (candidate.presale_native_gas_reserve_protection_integrated !== true) {
    missing.push("presale_native_gas_reserve_protection_required");
  }
  if (
    candidate.presale_native_gas_lifetime_capacity_or_replenishment_ready
    !== true
  ) {
    missing.push("presale_native_gas_lifetime_capacity_or_replenishment_required");
  }
  if (
    candidate.wc_void_native_gas_replenishment_or_user_paid_model_ready
    !== true
  ) {
    missing.push("wc_void_native_gas_replenishment_or_user_paid_model_required");
  }
  if (candidate.wc_void_reverse_settlement_adapter_ready !== true) {
    missing.push("wc_void_reverse_settlement_adapter_required");
  }
  if (candidate.wc_settlement_runtime_gas_ceiling_observed !== true) {
    missing.push("wc_settlement_runtime_gas_ceiling_observation_required");
  }
  if (candidate.shared_gas_payer_double_spend_protection_proven !== true) {
    missing.push("shared_gas_payer_double_spend_protection_required");
  }
  if (candidate.duplicate_replay_protection_proven !== true) {
    missing.push("duplicate_replay_protection_required");
  }
  if (candidate.bounded_canary_green !== true) {
    missing.push("bounded_canary_required");
  }
  if (candidate.coupled_activation_ready !== true) {
    missing.push("coupled_activation_ready_required");
  }

  if (missing.length > 0) {
    return hold("production_gates_incomplete", {
      missing_gates: Object.freeze(missing),
      declared_status: candidate.status,
    });
  }
  if (candidate.status !== "source_ready") {
    return hold("source_ready_status_required", {
      missing_gates: Object.freeze([]),
      declared_status: candidate.status,
    });
  }

  return Object.freeze({
    ok: true,
    status: "SOURCE_READY",
    marker: VOID_WC_VOID_PRODUCTION_READINESS_V1,
    chain_id: 2050,
    pair: "WC_VOID",
    market_vault_address: candidate.market_vault_address.toLowerCase(),
    market_vault_runtime_code_sha256:
      candidate.market_vault_runtime_code_sha256,
    wc_settlement_adapter_id: candidate.wc_settlement_adapter_id,
    protocol_void_inventory_atoms:
      EXPECTED_VOID_INVENTORY_ATOMS.toString(),
    protocol_wc_seed_units: "0",
    opening_price_source: "settled_wc_over_opening_sale_tranche",
    opening_sale_tranche_void_atoms:
      EXPECTED_OPENING_SALE_TRANCHE_ATOMS.toString(),
    post_opening_void_reserve_atoms:
      EXPECTED_POST_OPENING_VOID_RESERVE_ATOMS.toString(),
    opening_allocation_policy: EXPECTED_OPENING_ALLOCATION_POLICY,
    coupled_native_gas_liability_policy:
      EXPECTED_COUPLED_GAS_POLICY_PATH,
    coupled_native_gas_reservation_ready: true,
    coupled_native_nonce_scheduler_ready: true,
    economic_execution_layer_identity_resolved: true,
    economic_execution_layer_public_verification_ready: true,
    native_gas_currency_supply_accounting_ready: true,
    known_anvil_prefunded_dev_accounts_neutralized: true,
    known_anvil_dev_private_key_submission_blocked: true,
    native_gas_genesis_supply_and_known_key_accounts_reconciled: true,
    private_evm_selector_durability_deployed: true,
    latest_economic_state_durable_checkpoint_ready: true,
    private_evm_restart_recovery_proven: true,
    private_evm_stale_state_fallback_impossible: true,
    economic_mutation_durability_gate_active: true,
    participant_post_purchase_voidtoken_control_ready: true,
    participant_voidtoken_transfer_submission_path_ready: true,
    participant_native_gas_access_or_paymaster_model_ready: true,
    presale_micro_purchase_gas_grief_protection_ready: true,
    wc_void_microtrade_gas_grief_protection_ready: true,
    coupled_unfunded_reservation_hoarding_protection_ready: true,
    presale_payment_instruction_ttl_and_late_payment_policy_ready: true,
    wc_void_outstanding_intent_cap_and_expiry_ready: true,
    wc_void_opening_price_manipulation_protection_ready: true,
    wc_void_opening_commitment_window_policy_ready: true,
    wc_void_opening_participant_provenance_and_eligibility_ready: true,
    wc_void_opening_concentration_and_sybil_limits_ready: true,
    wc_void_opening_minimum_quote_depth_policy_ready: true,
    wc_void_opening_nonproduction_wc_exclusion_ready: true,
    wc_void_opening_participant_consideration_model_ready: true,
    wc_void_opening_wc_debit_claim_or_refund_binding_ready: true,
    wc_void_opening_post_discovery_reserve_conservation_ready: true,
    wc_void_opening_allocation_tranche_or_liquidity_claim_policy_ready: true,
    wc_void_shared_post_discovery_model_reconciled: true,
    wc_void_quote_reserve_transfer_or_escrow_primitive_ready: true,
    wc_void_quote_reserve_transfer_conservation_proven: true,
    public_economic_fee_and_net_output_disclosure_ready: true,
    public_economic_expiry_and_gas_payer_disclosure_ready: true,
    fresh_fee_admission_guard_ready: true,
    gas_reservation_terminal_receipt_finality_release_guard_ready: true,
    wc_void_native_gas_replenishment_or_user_paid_model_ready: true,
    wc_void_reverse_settlement_adapter_ready: true,
    wc_settlement_runtime_gas_limit:
      candidate.wc_settlement_runtime_gas_limit,
    activation_authority: false,
    funding_authority: false,
    authority: VOID_WC_VOID_PRODUCTION_READINESS_AUTHORITY_V1,
  });
}
