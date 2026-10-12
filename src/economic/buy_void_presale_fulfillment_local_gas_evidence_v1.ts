export const VOID_BUY_VOID_PRESALE_FULFILLMENT_LOCAL_GAS_EVIDENCE_V1 =
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_LOCAL_GAS_EVIDENCE_V1";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_LOCAL_GAS_EVIDENCE_RECORD_V1 = {
  marker:
    VOID_BUY_VOID_PRESALE_FULFILLMENT_LOCAL_GAS_EVIDENCE_V1,
  version: 1,
  status:
    "local_mock_token_lower_bound_only_not_production_ceiling",
  source: {
    pr_number: 1553,
    exact_proven_head:
      "f6d296772fd41dc57d3fae726e87c4ead2f10664",
    merged_main_commit:
      "61e57ef10e64b372165c3ce390b9ac17456bf235",
    precision_verifier_sha256:
      "a2307d9627c79396fd603133817c65dd8a964c5a033d1f32262fadf914d0b039",
    foundry_image:
      "ghcr.io/foundry-rs/foundry:v1.7.1",
    solidity_release:
      "0.8.24+commit.e11b9ed9",
    evm_version: "paris",
    optimizer_enabled: false,
    via_ir: false,
    test_path:
      "test/mainnet/BuyVoidPresaleFulfillmentV1GasMeasurement.t.sol",
  },
  scenario: {
    predecessor_mode: "genesis_zero",
    fulfillment_case:
      "first_successful_fulfillment_to_zero_balance_recipient",
    amount_atoms:
      "1000000000000000000",
    token_implementation:
      "BuyVoidGasMeasureTokenV1_mock",
    production_void_token_address:
      "0x470075b85352eb86f7d089fb9ba88945f12aad94",
    production_void_token_source_present_in_repository:
      false,
  },
  measurement: {
    foundry_test_gas: "139631",
    measured_fulfill_call_gas:
      "131047",
    mock_token_transfer_call_gas:
      "28412",
    candidate_formula:
      "round_up_10000(2x_measured_call_gas_plus_50000)",
    local_candidate_runtime_gas_ceiling:
      "320000",
  },
  interpretation: {
    exact_local_measurement_verified: true,
    useful_lower_bound_evidence: true,
    production_void_token_execution_measured:
      false,
    production_runtime_gas_ceiling_accepted:
      false,
    reason:
      "production VoidToken source is not retained in this repository; live real-token eth_estimateGas evidence is required before accepting the runtime ceiling",
  },
  authority: {
    evidence_record_only: true,
    rpc_call: false,
    credential_access: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    deployment: false,
    chain2050_mutation: false,
    inventory_funding: false,
    production_configuration_mutation: false,
    runtime_enablement_change: false,
    public_activation: false,
    money_movement: false,
  },
} as const;
