export const
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_INTEGRATION_GATE_V1 =
    "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_INTEGRATION_GATE_V1";

export const
  VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_INTEGRATION_V1 = {
    marker:
      VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_INTEGRATION_GATE_V1,
    version: 1,
    status: "source_ready",
    canonical_chain_id: "2050",
    canonical_asset: "void_token_erc20",
    dependency_bootstrap_source_marker:
      "VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_BOOTSTRAP_V1",
    broadcaster_source_marker:
      "VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1",
    total_deadline_transport_source_marker:
      "VOID_BUY_VOID_ERC20_CHAIN2050_TOTAL_DEADLINE_TRANSPORT_V1",
    source_paths: [
      "src/economic/buy_void_erc20_delivery_dependency_bootstrap_v1.ts",
      "src/economic/buy_void_erc20_chain2050_broadcaster_v1.ts",
      "src/economic/buy_void_erc20_chain2050_total_deadline_transport_v1.ts",
    ],
    canonical_delivery_dependency_bootstrap_ready: true,
    erc20_transaction_preparation_execution_state_ready: true,
    canonical_delivery_runtime_parent_mounted: false,
    canonical_delivery_execution_ready: false,
    canonical_delivery_execution_held: true,
    production_credential_binding_ready: false,
    service_activation_ready: false,
    presale_inventory_funding_ready: false,
    funding_blockers: [
      "canonical_delivery_runtime_activation_not_ready",
    ],
    next_funding_blocker:
      "canonical_delivery_runtime_activation_not_ready",
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
      money_movement: false,
    },
  } as const;
