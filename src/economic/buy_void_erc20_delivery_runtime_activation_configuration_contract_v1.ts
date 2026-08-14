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
      "erc20_durable_prepared_transaction_composition",

    runtime_source_path:
      "src/economic/buy_void_delivery_runtime_integration_v1.ts",
    transaction_preparation_planner_source_path:
      "src/economic/buy_void_erc20_transaction_preparation_planner_v1.ts",
    dependency_bootstrap_source_path:
      "src/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.ts",
    parent_source_path:
      "src/economic/buy_void_runtime_integration_v1.ts",

    runtime_configuration_contract: {
      enable_env:
        "VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED",
      enable_value: "1",
      root_dir_env: "VOID_BUY_VOID_RUNTIME_DIR",
      planner_rpc_env:
        "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL",
      policy_envs: [
        "VOID_BUY_VOID_DELIVERY_CHAIN_ID",
        "VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS",
        "VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS",
        "VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS",
        "VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT",
        "VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI",
        "VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
      ],
      fixed_planner_gas_limit_multiplier_bps: "12000",
      fixed_planner_fee_multiplier_bps: "12000",
      canonical_delivery_action: "plan_erc20_delivery",
      caller_input_keys: [
        "action",
        "attempt_id",
      ],
      server_derived_transaction_plan_required: true,
      caller_supplied_transaction_plan_forbidden: true,
      coherent_pending_planner_required: true,
      direct_sign_broadcast_apply_allowed: false,
      durable_prepared_transaction_composition_ready: false,
      fixed_signer_credential_id:
        "buy-void-native-fulfillment-wallet-v1",
      server_controlled_policy: true,
      server_controlled_root_dir: true,
      operator_loopback_only: true,
      automatic_retry: false,
      receipt_wait: false,
      background_loop: false,
    },

    activation_preconditions: {
      server_derived_transaction_plan_required: true,
      caller_supplied_transaction_plan_forbidden: true,
      durable_wallet_nonce_reservation_required: true,
      live_pre_sign_nonce_revalidation_required: true,
      opaque_signed_transaction_custody_required: true,
      crash_recoverable_prepared_binding_required: true,
      confirmed_erc20_receipt_terminal_closeout_required: true,
      production_configuration_verification_required_after_composition: true,
      fixed_systemd_credential_verification_required_after_composition: true,
      parent_mount_separately_authorized: true,
      inventory_funding_separately_authorized: true,
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
