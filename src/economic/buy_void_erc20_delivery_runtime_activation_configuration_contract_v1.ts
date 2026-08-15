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
    status: "source_ready_held_on_presale_invariants",
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
    production_configuration_values_verified: false,
    production_credential_binding_ready: false,
    canonical_production_credential_binding_evidence_ready: true,
    canonical_production_credential_binding_evidence:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
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
      canonical_presale_max_void: "10000000",
      canonical_presale_max_fulfillment_units_6_decimal:
        "10000000000000",
      finite_presale_cap_end_to_end_enforced: false,
      canonical_rate_void_units_numerator: "2",
      canonical_rate_void_units_denominator: "1",
      fixed_presale_rate_enforced: false,
      evidence_source_path:
        "src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts",
    },

    activation_readiness_blockers: [
      "canonical_presale_finite_cap_not_ready",
      "canonical_presale_fixed_rate_not_ready",
      "canonical_delivery_runtime_activation_not_ready",
    ] as const,

    current_parent_blocker:
      "canonical_presale_invariants_not_ready",
    next_gate:
      "canonical_presale_invariants_source_repair",

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
