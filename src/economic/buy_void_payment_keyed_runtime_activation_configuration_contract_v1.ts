import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1,
} from "./buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "./buy_void_erc20_production_credential_binding_evidence_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_PARENT_ACTION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
} from "./buy_void_payment_keyed_full_runtime_v1.js";

export const
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1 =
    "VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1";

export const
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ACTIVATION_CONFIGURATION_V1 = {
    marker:
      VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1,
    version: 1,
    status:
      "payment_keyed_source_runtime_ready_held_on_production_activation",
    canonical_chain_id: "2050",
    canonical_asset: "void_token",
    canonical_delivery_mode:
      "payment_keyed_presale_fulfillment_contract",

    prerequisite_source_truth: {
      payment_keyed_full_runtime_marker:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
      payment_keyed_full_runtime_parent_mounted: true,
      payment_keyed_full_runtime_default_off:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1
          .disabled_by_default,
      payment_keyed_full_runtime_apply_default_off:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1
          .apply_disabled_by_default,
      payment_keyed_runtime_one_stage_per_command:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1
          .exactly_one_stage_per_explicit_command,
      payment_keyed_runtime_automatic_retry:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1
          .automatic_retry,
      payment_keyed_preparation_ready: true,
      payment_keyed_guarded_broadcast_ready: true,
      payment_keyed_broadcast_reconciliation_ready: true,
      payment_keyed_receipt_reconciliation_ready: true,
      payment_keyed_terminal_closeout_ready: true,
      immutable_terminal_receipt_evidence_required: true,
      canonical_terminal_closeout_reused: true,
      caller_supplied_stage_forbidden: true,
      caller_supplied_policy_forbidden: true,
      caller_supplied_transaction_material_forbidden: true,
      canonical_presale_server_policy_required: true,
      source_finality_preflight_required: true,
      compiled_fulfillment_identity_accepted: true,
      compiled_fulfillment_identity_id:
        "voidbvpfci1_62d981d2478fe8e8c58740bd65a104f9950e722cf43405d45f4789076be37566",
      compiled_fulfillment_identity_artifact_path:
        "ops/mainnet0/buy-void-presale-fulfillment-compiled-identity-v1.json",
      fulfillment_deployment_preparation_source_ready: true,
      fulfillment_deployment_preparation_source_path:
        "src/economic/buy_void_presale_fulfillment_deployment_preparation_v1.ts",
      fulfillment_local_gas_lower_bound_evidence_ready: true,
      fulfillment_local_gas_lower_bound_source_path:
        "src/economic/buy_void_presale_fulfillment_local_gas_evidence_v1.ts",
      fulfillment_production_gas_observer_source_ready: true,
      fulfillment_production_gas_observer_source_path:
        "tools/buy-void-presale-fulfillment-production-gas-observer-v1.mjs",
      fulfillment_deployer_selection_source_ready: true,
      fulfillment_deployer_selection_source_path:
        "tools/buy-void-presale-fulfillment-deployer-selection-v1.mjs",
      fulfillment_deployer_resolution_evidence_source_ready: true,
      fulfillment_deployer_resolution_evidence_source_path:
        "ops/mainnet0/buy-void-presale-fulfillment-deployer-resolution-v1.json",
      payment_keyed_history_reconciliation_source_ready: true,
      payment_keyed_history_reconciliation_source_path:
        "src/economic/buy_void_payment_keyed_history_reconciliation_v1.ts",
      payment_keyed_history_full_identity_binding_required: true,
      confirmed_closeout_full_payment_identity_binding_required: true,
      production_configuration_verifier_source_ready: true,
      production_configuration_verifier_source_path:
        "src/economic/buy_void_payment_keyed_production_configuration_verifier_v1.ts",
      production_candidate_evidence_source_ready: true,
      production_candidate_evidence_source_path:
        "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json",
      production_activation_evidence_source_ready: true,
      production_activation_evidence_source_path:
        "ops/mainnet0/buy-void-production-activation-evidence-v1.json",
      coupled_native_gas_liability_policy_source_ready: true,
      coupled_native_gas_liability_policy_source_path:
        "tools/void-coupled-native-gas-liability-v1.mjs",
      current_economic_rpc_is_private_anvil: true,
      public_p2p_chain_and_private_evm_relationship_requires_explicit_resolution: true,
      independent_public_voidtoken_verification_required: true,
      native_gas_currency_supply_accounting_required: true,
      participant_post_purchase_voidtoken_control_required: true,
      participant_voidtoken_transfer_submission_path_required: true,
      participant_native_gas_access_or_paymaster_model_required: true,
      presale_micro_purchase_gas_grief_protection_required: true,
      anti_grief_policy_may_use_public_minimum_batching_user_paid_gas_or_equivalent: true,
      hidden_minimum_forbidden: true,
      anti_grief_policy_must_bind_worst_case_cost_before_payment_authority: true,
      shared_native_gas_payer_requires_cross_lane_reservation_journal: true,
      shared_native_gas_payer_requires_cross_lane_nonce_scheduler: true,
      fresh_chain2050_fee_observation_required_before_payment_instruction: true,
      gas_liability_release_requires_terminal_receipt_finality: true,
      presale_payment_instruction_requires_gas_liability_reservation: true,
      source_chain_refund_fee_budget_separate_from_chain2050_gas: true,
      production_credential_binding_evidence_id:
        VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
    },

    payment_keyed_runtime_activation_configuration_contract_ready: true,
    payment_keyed_runtime_activation_ready: false,
    production_configuration_values_verified: false,
    fulfillment_contract_deployment_attested: false,
    fulfillment_contract_predecessor_lineage_attested: false,
    production_credential_binding_ready: true,
    canonical_production_credential_binding_evidence_ready: true,
    canonical_production_credential_binding_evidence:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
    presale_inventory_funding_ready: false,
    coupled_native_gas_reservation_journal_ready: false,
    coupled_native_nonce_scheduler_ready: false,
    economic_execution_layer_identity_resolved: false,
    economic_execution_layer_public_verification_ready: false,
    native_gas_currency_supply_accounting_ready: false,
    participant_post_purchase_voidtoken_control_ready: false,
    participant_voidtoken_transfer_submission_path_ready: false,
    participant_native_gas_access_or_paymaster_model_ready: false,
    presale_micro_purchase_gas_grief_protection_ready: false,
    fresh_fee_admission_guard_ready: false,
    gas_reservation_terminal_receipt_finality_release_guard_ready: false,
    presale_native_gas_reserve_protection_ready: false,
    presale_native_gas_lifetime_capacity_or_replenishment_ready: false,
    paid_unreservable_customer_resolution_policy_ready: false,
    public_buy_void_activation_ready: false,

    presale_invariant_readiness: {
      canonical_presale_pool_id:
        VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1.pool_id,
      canonical_inventory_policy_version:
        VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
          .inventory_policy_version,
      canonical_presale_max_void:
        VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
          .canonical_presale_max_void,
      canonical_presale_max_fulfillment_units_6_decimal:
        VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
          .pool_capacity_void_units,
      canonical_max_reservation_fulfillment_units_6_decimal:
        VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
          .max_reservation_void_units,
      canonical_rate_void_units_numerator:
        VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
          .rate_void_units_numerator,
      canonical_rate_void_units_denominator:
        VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1
          .rate_void_units_denominator,
      exact_lifetime_presale_cap_token_atoms:
        "10000000000000000000000000",
      fulfillment_unit_decimals: 6,
      token_atom_decimals: 18,
      token_atom_multiplier: "1000000000000",
      payment_admission_reservation_atomicity_ready: true,
      payment_keyed_chain_uniqueness_source_ready: true,
      payment_keyed_chain_uniqueness_production_deployment_unproven:
        true,
      public_purchase_throttle_allowed: false,
      hidden_minimum_required_for_gas_safety: false,
      native_gas_liability_reserved_before_payment_instruction: false,
      primary_fulfillment_attempt_gas_reserved: false,
      manual_recovery_attempt_gas_reserved: false,
      automatic_fulfillment_retry_allowed: false,
      fulfillment_native_gas_balance_may_not_be_double_promised: true,
      per_obligation_gas_reservation_does_not_prove_full_presale_capacity: true,
      full_presale_native_gas_capacity_or_replenishment_required: true,
      source_chain_refund_fee_budget_is_separate: true,
    },

    production_payment_keyed_configuration_verified: false,
    deployment_attestation_verified: false,
    inventory_funding_verified: false,

    activation_readiness_blockers: [
      "production_payment_keyed_configuration_not_verified",
      "fulfillment_contract_deployment_not_attested",
      "fulfillment_contract_predecessor_lineage_not_attested",
      "presale_inventory_funding_not_verified",
      "coupled_native_gas_reservation_journal_not_ready",
      "coupled_native_nonce_scheduler_not_ready",
      "economic_execution_layer_identity_not_resolved",
      "economic_execution_layer_public_verification_not_ready",
      "native_gas_currency_supply_accounting_not_ready",
      "participant_post_purchase_voidtoken_control_not_ready",
      "participant_voidtoken_transfer_submission_path_not_ready",
      "participant_native_gas_access_or_paymaster_model_not_ready",
      "presale_micro_purchase_gas_grief_protection_not_ready",
      "fresh_fee_admission_guard_not_ready",
      "gas_reservation_terminal_receipt_finality_release_guard_not_ready",
      "presale_native_gas_reserve_protection_not_ready",
      "presale_native_gas_lifetime_capacity_or_replenishment_not_ready",
      "paid_unreservable_customer_resolution_policy_not_ready",
    ] as const,

    current_parent_blocker:
      "production_payment_keyed_configuration_not_verified",
    next_gate:
      "production_payment_keyed_configuration_verification",

    runtime_source_path:
      "src/economic/buy_void_payment_keyed_full_runtime_v1.ts",
    dependency_bootstrap_source_path:
      "src/economic/buy_void_payment_keyed_runtime_dependency_bootstrap_v1.ts",
    fulfillment_contract_source_path:
      "contracts/mainnet/BuyVoidPresaleFulfillmentV1.sol",
    receipt_evidence_source_path:
      "src/economic/buy_void_payment_keyed_receipt_evidence_v1.ts",
    terminal_closeout_source_path:
      "src/economic/buy_void_payment_keyed_terminal_closeout_v1.ts",
    parent_source_path:
      "src/economic/buy_void_runtime_integration_v1.ts",
    deployment_attestation_verifier_source_path:
      "tools/buy-void-presale-fulfillment-deployment-attestation-v1.mjs",
    deployment_observer_source_path:
      "tools/buy-void-presale-fulfillment-deployment-observer-v1.mjs",
    production_deployment_binding_source_path:
      "src/economic/buy_void_payment_keyed_production_deployment_attestation_v1.ts",

    runtime_configuration_contract: {
      parent_action:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_PARENT_ACTION_V1,
      child_enable_env:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled,
      required_child_enable_value_before_activation: "1",
      child_apply_enable_env:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.apply_enabled,
      required_child_apply_enable_value_before_live_apply: "1",
      candidate_verification_requires_child_enable_value: "0",
      candidate_verification_requires_child_apply_enable_value: "0",
      root_dir_env:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.root_dir,
      required_policy_envs: [
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.rpc_url,
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
          .fulfillment_contract_address,
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
          .gas_limit_multiplier_bps,
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.max_gas_limit,
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
          .fee_multiplier_bps,
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
          .max_fee_per_gas_wei,
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
          .max_priority_fee_per_gas_wei,
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
          .void_token_address,
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
          .receipt_min_confirmations,
        "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
        "VOID_BUY_VOID_INVENTORY_POOL_ID",
        "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION",
        "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS",
        "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS",
        "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR",
        "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR",
      ],
      optional_transport_envs: [
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
          .request_timeout_ms,
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
          .max_response_bytes,
      ],
      credentials_directory_env:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
          .credentials_directory,
      credential_binding_evidence_id_env:
        VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
          .credential_binding_evidence_id,
      required_credential_binding_evidence_id_sha256:
        VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
      fixed_signer_credential_id:
        "buy-void-native-fulfillment-wallet-v1",
      server_controlled_policy: true,
      server_controlled_root_dir: true,
      server_derived_stage: true,
      caller_supplied_stage: false,
      caller_supplied_policy: false,
      caller_supplied_rpc_url: false,
      caller_supplied_transaction_material: false,
      exact_outer_confirmation_required_for_apply: true,
      exactly_one_stage_per_command: true,
      automatic_retry: false,
      background_loop: false,
    },

    fulfillment_contract_deployment_contract: {
      chain_id: "2050",
      source_path:
        "contracts/mainnet/BuyVoidPresaleFulfillmentV1.sol",
      exact_contract_address_required: true,
      exact_runtime_code_hash_required: true,
      exact_creation_code_hash_required: true,
      canonical_void_token_address_required: true,
      canonical_fulfiller_wallet_required: true,
      canonical_predecessor_address_required: true,
      predecessor_lineage_query_required: true,
      predecessor_void_token_match_required: true,
      predecessor_max_inventory_match_required: true,
      predecessor_total_fulfilled_bounded_required: true,
      max_inventory_atoms:
        "10000000000000000000000000",
      void_token_view_required: true,
      max_inventory_view_required: true,
      total_fulfilled_view_required: true,
      remaining_inventory_view_required: true,
      compiled_identity_accepted: true,
      compiled_identity_id:
        "voidbvpfci1_62d981d2478fe8e8c58740bd65a104f9950e722cf43405d45f4789076be37566",
      genesis_predecessor_only_v1: true,
      nonzero_predecessor_requires_separate_identity_acceptance: true,
      fixed_block_observation_required: true,
      deployment_receipt_revalidation_required: true,
      deployment_confirmation_floor_required: true,
      deployment_attestation_source_ready: true,
      deployment_preparation_source_ready: true,
      deployer_selection_source_ready: true,
      deployer_resolution_evidence_source_ready: true,
      deployer_candidate_selected: true,
      human_deployer_selection_required: false,
      deployer_address_resolved: true,
      deployer_address:
        "0x2b4d94ce678ec0bc17924b83236b714339c70b9d",
      deployment_nonce_resolved: true,
      deployment_nonce: "0",
      resulting_contract_address_resolved: true,
      resulting_contract_address:
        "0xa40a43adfd174f88309173cb3daa6e09c10154a7",
      deployment_gas_estimate_resolved: true,
      deployment_gas_estimate: "982843",
      deployment_gas_limit_resolved: true,
      deployment_gas_limit: "1179412",
      deployment_max_cost_wei:
        "3538236000000000",
      deployer_balance_sufficient_for_max_cost: false,
      payment_keyed_max_gas_limit_resolved: false,
      local_mock_token_measured_fulfill_call_gas: "131047",
      local_mock_token_candidate_runtime_gas_ceiling: "320000",
      local_mock_token_candidate_runtime_gas_ceiling_accepted: false,
      production_real_token_gas_estimate_required_after_deployment_and_funding: true,
      production_runtime_gas_ceiling_accepted: false,
      unsigned_deployment_transaction_constructed: false,
      deployment_authorized: false,
    },

    activation_preconditions: {
      production_configuration_verification_required: true,
      canonical_presale_server_policy_required: true,
      canonical_dual_source_payment_policy_required: true,
      authenticated_source_finality_required: true,
      exact_chain2050_fulfillment_deployment_required: true,
      exact_predecessor_lineage_attestation_required: true,
      exact_void_token_binding_required: true,
      exact_fulfiller_wallet_binding_required: true,
      canonical_credential_binding_evidence_required: true,
      fixed_systemd_credential_required_when_signing: true,
      loopback_chain2050_rpc_required: true,
      runtime_child_enable_required: true,
      runtime_apply_enable_required_for_live_apply: true,
      explicit_per_command_confirmation_required: true,
      terminal_receipt_evidence_required_before_closeout: true,
      inventory_funding_separately_authorized_and_proven: true,
      production_real_token_fulfillment_gas_ceiling_accepted_before_runtime_enablement: true,
      coupled_native_gas_reservation_journal_required_before_public_payment_instructions: true,
      coupled_native_nonce_scheduler_required_before_transaction_construction: true,
      economic_execution_layer_identity_must_be_resolved_before_public_activation: true,
      independent_public_voidtoken_verification_required_before_public_activation: true,
      native_gas_currency_supply_accounting_required_before_public_activation: true,
      participant_post_purchase_voidtoken_control_required_before_public_activation: true,
      participant_voidtoken_transfer_submission_path_required_before_public_activation: true,
      participant_native_gas_access_or_paymaster_model_required_before_public_activation: true,
      micro_purchase_gas_grief_protection_required_before_public_payment_instructions: true,
      anti_grief_mechanism_must_be_public_and_policy_bound: true,
      hidden_minimum_forbidden: true,
      anti_grief_worst_case_cost_bound_required: true,
      fresh_fee_observation_required_before_public_payment_instructions: true,
      gas_reservation_release_requires_final_terminal_receipt: true,
      two_bounded_fulfillment_attempts_reserved_per_accepted_payment: true,
      automatic_fulfillment_retry_forbidden: true,
      unrelated_native_gas_spend_must_preserve_reserved_liabilities: true,
      full_presale_native_gas_capacity_or_replenishment_required: true,
      paid_unreservable_customer_resolution_policy_required: true,
      source_chain_refund_fee_budget_must_not_use_chain2050_gas_reserve: true,
      public_activation_separately_authorized: true,
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
      runtime_enablement_change: false,
      runtime_route_mount: false,
      service_start: false,
      production_configuration_mutation: false,
      deployment: false,
      inventory_funding: false,
      public_activation: false,
      money_movement: false,
    },
  } as const;
