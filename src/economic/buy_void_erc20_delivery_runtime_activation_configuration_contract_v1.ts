export const
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1 =
    "VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1";

export const
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1 = {
    marker:
      VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1,
    version: 1,
    status: "source_ready",
    canonical_chain_id: "2050",
    canonical_asset: "void_token_erc20",

    prerequisite_source_truth: {
      canonical_delivery_dependency_bootstrap_ready: true,
      erc20_transaction_preparation_execution_state_ready: true,
      erc20_execution_composition_ready: true,
      caller_supplied_transaction_plan_forbidden: true,
      canonical_erc20_receipt_to_record_confirmed_ready: true,
      existing_terminal_closeout_reused: true,
    },

    canonical_delivery_runtime_activation_configuration_contract_ready: true,
    canonical_delivery_runtime_activation_ready: false,
    production_configuration_values_verified: false,
    production_credential_binding_ready: false,
    canonical_delivery_runtime_parent_mounted: false,
    canonical_delivery_execution_ready: false,
    canonical_delivery_execution_held: true,
    presale_inventory_funding_ready: false,

    current_parent_blocker:
      "canonical_delivery_runtime_activation_not_ready",
    next_gate:
      "production_configuration_verification_and_runtime_mount_authorization",

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
