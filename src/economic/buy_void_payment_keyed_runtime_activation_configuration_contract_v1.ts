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
    },

    production_payment_keyed_configuration_verified: false,
    deployment_attestation_verified: false,
    inventory_funding_verified: false,

    activation_readiness_blockers: [
      "production_payment_keyed_configuration_not_verified",
      "fulfillment_contract_deployment_not_attested",
      "fulfillment_contract_predecessor_lineage_not_attested",
      "presale_inventory_funding_not_verified",
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
      deployment_attestation_source_ready: false,
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
