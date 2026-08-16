import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "./buy_void_erc20_production_credential_binding_evidence_v1.js";

export const
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1 =
    "VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1";

export const
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1 = {
    marker:
      VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1,
    version: 1,
    status: "production_configuration_verified_held_on_durable_history_creation_recovery",
    canonical_chain_id: "2050",
    canonical_asset: "void_token_erc20",

    prerequisite_source_truth: {
      canonical_delivery_dependency_bootstrap_ready: true,
      erc20_transaction_preparation_execution_state_ready: true,
      erc20_execution_composition_ready: true,
      caller_supplied_transaction_plan_forbidden: true,
      canonical_erc20_receipt_to_record_confirmed_ready: true,
      existing_terminal_closeout_reused: true,
      canonical_planner_policy_validator_reused: true,
      max_amount_fulfillment_unit_domain_bound: true,
      confirmation_count_saga_domain_preflight_ready: true,
    },

    canonical_delivery_runtime_activation_configuration_contract_ready: true,
    canonical_delivery_runtime_activation_ready: false,
    production_configuration_values_verified: true,
    production_credential_binding_ready: true,
    canonical_production_credential_binding_evidence_ready: true,
    canonical_production_credential_binding_evidence:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
    reviewed_production_configuration_binding: {
      marker: "VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_V1",
      source_path:
        "src/economic/buy_void_erc20_production_configuration_candidate_binding_v1.ts",
      reviewed_merge_commit_sha:
        "5a66040d63225dee59fc449937fda063800d425a",
      configuration_fingerprint_sha256:
        "9891cc703bd724541ace341561e3194bf356d5ac8af9d767acf7189e03174992",
      repository_candidate_binding_ready: true,
      production_configuration_applied: false,
      runtime_activation_authorized: false,
      dependency_injection_activation_authorized: false,
      inventory_funding_authorized: false,
    },
    production_configuration_applied: false,
    dormant_dependency_injection_source_ready: true,
    dormant_dependency_injection_requires_delivery_runtime_disabled: true,
    dormant_dependency_injection_required_delivery_enable_value: "0",
    dormant_dependency_injection_wallet_evidence_binding_required: true,
    dependency_injection_runtime_ready: false,
    canonical_delivery_runtime_parent_mounted: true,
    canonical_delivery_execution_ready: false,
    canonical_delivery_execution_held: true,
    presale_inventory_funding_ready: false,

    presale_invariant_readiness: {
      canonical_presale_pool_id: "buy-void-presale-v1",
      canonical_inventory_policy_version: "presale-v1",
      canonical_presale_max_void: "10000000",
      canonical_presale_max_fulfillment_units_6_decimal:
        "10000000000000",
      canonical_max_reservation_fulfillment_units_6_decimal:
        "10000000000000",
      finite_presale_cap_local_history_enforced: true,
      finite_presale_cap_end_to_end_enforced: false,
      canonical_rate_void_units_numerator: "2",
      canonical_rate_void_units_denominator: "1",
      fixed_presale_rate_enforced: true,
      reservation_ceiling_equals_total_pool: true,
      no_per_buyer_purchase_throttle_below_remaining_inventory: true,
      payment_admission_reservation_atomicity_ready: true,
      inventory_reservation_before_new_paid_claim: true,
      paid_unreservable_terminal_obligation_local_integrity_ready: true,
      paid_unreservable_terminal_obligation_ready: false,
      durable_history_local_consistency_ready: true,
      durable_history_expected_set_commitment_ready: true,
      durable_history_append_only_hash_chain_index_ready: true,
      durable_history_paired_record_expectation_deletion_fail_closed: true,
      durable_history_index_truncated_tail_fail_closed: true,
      durable_history_missing_record_fail_closed: true,
      durable_history_filename_content_identity_enforced: true,
      durable_history_closed_schema_enforced: true,
      durable_history_liability_completeness_fail_closed: true,
      durable_history_integrity_blocks_new_mutation: true,
      durable_history_creation_commit_point_ready: false,
      durable_history_creation_crash_recovery_ready: false,
      durable_history_partial_creation_retry_ready: false,
      durable_history_manual_state_surgery_required_after_creation_crash: true,
      durable_history_external_anti_rollback_anchor_ready: false,
      durable_history_valid_suffix_rollback_detection_ready: false,
      durable_history_full_rollback_protection_ready: false,
      unindexed_preexisting_history_silently_adopted: false,
      confirmed_payer_without_reservation_or_obligation_allowed: false,
      validator_scale_purchase_10000_void_admission_ready: true,
      delivery_execution_amount_cap_separate_from_purchase_admission: true,
      disabled_delivery_canary_max_may_be_lower: true,
      public_delivery_activation_requires_presale_capacity_max: true,
      evidence_source_path:
        "src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts",
      payment_admission_source_path:
        "src/economic/buy_void_pipeline_coordinator_v1.ts",
      inventory_obligation_source_path:
        "src/economic/buy_void_inventory_reservation_journal_v1.ts",
    },

    production_broad_delivery_configuration_verified: true,

    activation_readiness_blockers: [
      "durable_history_creation_crash_recovery_not_ready",
      "durable_history_anti_rollback_anchor_not_ready",
      "canonical_delivery_runtime_activation_not_ready",
    ] as const,

    current_parent_blocker:
      "durable_history_creation_crash_recovery_not_ready",
    next_gate:
      "durable_history_creation_crash_recovery",

    runtime_source_path:
      "src/economic/buy_void_delivery_runtime_integration_v1.ts",
    execution_composition_source_path:
      "src/economic/buy_void_erc20_execution_composition_v1.ts",
    dependency_bootstrap_source_path:
      "src/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.ts",
    parent_source_path:
      "src/economic/buy_void_runtime_integration_v1.ts",

    runtime_configuration_contract: {
      enable_env:
        "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED",
      enable_value: "1",
      root_dir_env: "VOID_BUY_VOID_RUNTIME_DIR",
      required_policy_envs: [
        "VOID_BUY_VOID_DELIVERY_CHAIN_ID",
        "VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS",
        "VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS",
        "VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS",
        "VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT",
        "VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI",
        "VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
        "VOID_BUY_VOID_ERC20_EXECUTION_RPC_URL",
        "VOID_BUY_VOID_DELIVERY_GAS_LIMIT_MULTIPLIER_BPS",
        "VOID_BUY_VOID_DELIVERY_FEE_MULTIPLIER_BPS",
        "VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS",
      ],
      optional_transport_envs: [
        "VOID_BUY_VOID_DELIVERY_RPC_TIMEOUT_MS",
        "VOID_BUY_VOID_DELIVERY_RPC_MAX_RESPONSE_BYTES",
      ],
      dependency_global:
        "__void_buy_void_delivery_runtime_dependencies_v1",
      dependency_injection_enable_env:
        "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED",
      dependency_injection_requires_delivery_runtime_enable_value: "0",
      dependency_injection_configured_wallet_must_match_evidence: true,
      credential_binding_evidence_id_env:
        "VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID",
      required_credential_binding_evidence_id_sha256:
        "20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495",
      fixed_signer_credential_id:
        "buy-void-native-fulfillment-wallet-v1",
      canonical_delivery_action: "sign_and_broadcast",
      exact_confirmation: "buyVoidSignAndBroadcast",
      server_controlled_policy: true,
      server_controlled_root_dir: true,
      server_derived_transaction_plan: true,
      caller_supplied_transaction_plan: false,
      operator_loopback_only: true,
      durable_submission_guard_required: true,
      durable_wallet_nonce_reservation_required: true,
      signed_hash_custody_required: true,
      write_ahead_broadcast_intent_required: true,
      receipt_reconciliation_required: true,
      canonical_record_confirmed_required: true,
      existing_terminal_closeout_reused: true,
      signer_dependency_injected: true,
      broadcaster_dependency_injected: true,
      automatic_retry: false,
      background_loop: false,
    },

    amount_unit_contract: {
      max_amount_env:
        "VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS",
      max_amount_unit_domain:
        "fulfillment_units_6_decimal",
      fulfillment_unit_decimals: 6,
      token_atom_decimals: 18,
      token_atom_multiplier: "1000000000000",
      max_amount_must_not_exceed_saga_pool_capacity: true,
      max_amount_must_not_exceed_saga_reservation_cap: true,
      canonical_presale_capacity_void_units:
        "10000000000000",
      canonical_presale_reservation_ceiling_void_units:
        "10000000000000",
      public_activation_max_amount_must_equal_presale_capacity: true,
      disabled_canary_max_amount_may_be_lower: true,
      public_purchase_throttle_allowed: false,
      integer_only_conversion: true,
      rounding: false,
    },

    receipt_confirmation_domain_contract: {
      reconciler_observation_domain:
        "decimal_string_bigint",
      generic_saga_max_confirmations: "1000000",
      preflight_before_record_confirmed: true,
      confirmation_1000000_allowed: true,
      confirmation_above_1000000_held: true,
      confirmation_above_safe_integer_held: true,
      partial_confirmed_state_mutation_allowed: false,
    },

    activation_preconditions: {
      enable_flag_required: true,
      exact_policy_configuration_required: true,
      dependency_injection_required: true,
      fixed_systemd_credential_required_when_signing: true,
      loopback_chain2050_rpc_required: true,
      explicit_per_action_confirmation_required: true,
      server_derived_transaction_plan_required: true,
      durable_nonce_and_preparation_custody_required: true,
      crash_reconciliation_required: true,
      erc20_receipt_to_terminal_closeout_required: true,
      production_configuration_verification_required: true,
      canonical_presale_invariants_required: true,
      durable_history_creation_crash_recovery_required: true,
      durable_history_external_anti_rollback_anchor_required: true,
      broad_public_delivery_configuration_required: true,
      public_delivery_amount_cap_must_equal_presale_capacity: true,
      parent_mount_separately_authorized: true,
    },

    authority: {
      source_only_contract: true,
      process_environment_read: false,
      filesystem_read: false,
      filesystem_write: false,
      credential_read: false,
      wallet_access: false,
      rpc_call: false,
      signing: false,
      transaction_broadcast: false,
      runtime_route_mount: false,
      service_start: false,
      production_configuration_mutation: false,
      money_movement: false,
    },
  } as const;