#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ACTIVATION_CONFIGURATION_V1,
} from "../src/economic/buy_void_payment_keyed_runtime_activation_configuration_contract_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_OPTIONAL_KEYS_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_REQUIRED_KEYS_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1,
  verifyBuyVoidPaymentKeyedProductionConfigurationV1,
} from "../src/economic/buy_void_payment_keyed_production_configuration_verifier_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";

const WALLET = String(
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1
    .derived_wallet_address,
).toLowerCase();

function candidate(
  override: Record<string, string> = {},
): Record<string, string> {
  return {
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED: "0",
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED: "0",
    VOID_BUY_VOID_RUNTIME_DIR:
      "/var/lib/void-node/buy_void_v1/runtime-integration-v1",
    VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL:
      "http://127.0.0.1:18545/",
    VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS:
      "0x1111111111111111111111111111111111111111",
    VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS: "12000",
    VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT: "300000",
    VOID_BUY_VOID_PAYMENT_KEYED_FEE_MULTIPLIER_BPS: "20000",
    VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI: "5000000000",
    VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI:
      "1000000000",
    VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS:
      "0x2222222222222222222222222222222222222222",
    VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "3",
    VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS: WALLET,
    VOID_BUY_VOID_INVENTORY_POOL_ID: "buy-void-presale-v1",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION:
      "presale-v1",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS:
      "10000000000000",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS:
      "10000000000000",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR:
      "2",
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR:
      "1",
    VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID:
      VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
    CREDENTIALS_DIRECTORY: "/run/credentials/void-node",
    VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS: "5000",
    VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES: "65536",
    ...override,
  };
}

const contract =
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ACTIVATION_CONFIGURATION_V1;

assert.equal(
  contract.marker,
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1,
);
assert.equal(
  contract.status,
  "payment_keyed_source_runtime_ready_held_on_production_activation",
);
assert.equal(
  contract.payment_keyed_runtime_activation_configuration_contract_ready,
  true,
);
assert.equal(contract.payment_keyed_runtime_activation_ready, false);
assert.equal(contract.production_configuration_values_verified, false);
assert.equal(contract.fulfillment_contract_deployment_attested, false);
assert.equal(
  contract.fulfillment_contract_predecessor_lineage_attested,
  false,
);
assert.equal(contract.presale_inventory_funding_ready, false);
assert.equal(contract.coupled_native_gas_reservation_journal_ready, false);
assert.equal(contract.coupled_native_nonce_scheduler_ready, false);
assert.equal(contract.economic_execution_layer_identity_resolved, false);
assert.equal(
  contract.economic_execution_layer_public_verification_ready,
  false,
);
assert.equal(contract.native_gas_currency_supply_accounting_ready, false);
assert.equal(contract.known_anvil_prefunded_dev_accounts_neutralized, false);
assert.equal(contract.known_anvil_dev_private_key_submission_blocked, false);
assert.equal(
  contract.native_gas_genesis_supply_and_known_key_accounts_reconciled,
  false,
);
assert.equal(contract.participant_post_purchase_voidtoken_control_ready, false);
assert.equal(contract.participant_voidtoken_transfer_submission_path_ready, false);
assert.equal(
  contract.participant_native_gas_access_or_paymaster_model_ready,
  false,
);
assert.equal(contract.presale_micro_purchase_gas_grief_protection_ready, false);
assert.equal(contract.unpaid_instruction_reservation_hoarding_protection_ready, false);
assert.equal(contract.payment_instruction_ttl_policy_ready, false);
assert.equal(
  contract.late_payment_after_instruction_expiry_reconciliation_ready,
  false,
);
assert.equal(contract.fresh_fee_admission_guard_ready, false);
assert.equal(
  contract.gas_reservation_terminal_receipt_finality_release_guard_ready,
  false,
);
assert.equal(contract.presale_native_gas_reserve_protection_ready, false);
assert.equal(
  contract.presale_native_gas_lifetime_capacity_or_replenishment_ready,
  false,
);
assert.equal(contract.paid_unreservable_customer_resolution_policy_ready, false);
assert.equal(contract.public_buy_void_activation_ready, false);
assert.equal(
  contract.current_parent_blocker,
  "production_payment_keyed_configuration_not_verified",
);
assert.equal(
  contract.next_gate,
  "production_payment_keyed_configuration_verification",
);
assert.deepEqual(contract.activation_readiness_blockers, [
  "production_payment_keyed_configuration_not_verified",
  "fulfillment_contract_deployment_not_attested",
  "fulfillment_contract_predecessor_lineage_not_attested",
  "presale_inventory_funding_not_verified",
  "coupled_native_gas_reservation_journal_not_ready",
  "coupled_native_nonce_scheduler_not_ready",
  "economic_execution_layer_identity_not_resolved",
  "economic_execution_layer_public_verification_not_ready",
  "native_gas_currency_supply_accounting_not_ready",
  "known_anvil_prefunded_dev_accounts_not_neutralized",
  "known_anvil_dev_private_key_submission_not_blocked",
  "native_gas_genesis_supply_and_known_key_accounts_not_reconciled",
  "participant_post_purchase_voidtoken_control_not_ready",
  "participant_voidtoken_transfer_submission_path_not_ready",
  "participant_native_gas_access_or_paymaster_model_not_ready",
  "presale_micro_purchase_gas_grief_protection_not_ready",
  "unpaid_instruction_reservation_hoarding_protection_not_ready",
  "payment_instruction_ttl_policy_not_ready",
  "late_payment_after_instruction_expiry_reconciliation_not_ready",
  "fresh_fee_admission_guard_not_ready",
  "gas_reservation_terminal_receipt_finality_release_guard_not_ready",
  "presale_native_gas_reserve_protection_not_ready",
  "presale_native_gas_lifetime_capacity_or_replenishment_not_ready",
  "paid_unreservable_customer_resolution_policy_not_ready",
]);

assert.equal(
  contract.prerequisite_source_truth
    .payment_keyed_full_runtime_parent_mounted,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .payment_keyed_full_runtime_default_off,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .payment_keyed_full_runtime_apply_default_off,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .payment_keyed_runtime_one_stage_per_command,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .payment_keyed_runtime_automatic_retry,
  false,
);
assert.equal(
  contract.prerequisite_source_truth
    .payment_keyed_history_reconciliation_source_ready,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .payment_keyed_history_reconciliation_source_path,
  "src/economic/buy_void_payment_keyed_history_reconciliation_v1.ts",
);
assert.equal(
  contract.prerequisite_source_truth
    .payment_keyed_history_full_identity_binding_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .confirmed_closeout_full_payment_identity_binding_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .production_configuration_verifier_source_ready,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .production_candidate_evidence_source_ready,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .production_activation_evidence_source_ready,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .coupled_native_gas_liability_policy_source_ready,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .coupled_native_gas_liability_policy_source_path,
  "tools/void-coupled-native-gas-liability-v1.mjs",
);
assert.equal(
  contract.prerequisite_source_truth
    .shared_native_gas_payer_requires_cross_lane_reservation_journal,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .presale_payment_instruction_requires_gas_liability_reservation,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .shared_native_gas_payer_requires_cross_lane_nonce_scheduler,
  true,
);
assert.equal(
  contract.prerequisite_source_truth.current_economic_rpc_is_private_anvil,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .public_p2p_chain_and_private_evm_relationship_requires_explicit_resolution,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .independent_public_voidtoken_verification_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .native_gas_currency_supply_accounting_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .known_anvil_prefunded_dev_accounts_must_be_neutralized,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .known_anvil_dev_private_key_transactions_must_be_rejected,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .native_gas_genesis_supply_and_known_key_accounts_must_be_reconciled,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .participant_post_purchase_voidtoken_control_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .participant_voidtoken_transfer_submission_path_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .participant_native_gas_access_or_paymaster_model_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .presale_micro_purchase_gas_grief_protection_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .anti_grief_policy_may_use_public_minimum_batching_user_paid_gas_or_equivalent,
  true,
);
assert.equal(
  contract.prerequisite_source_truth.hidden_minimum_forbidden,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .anti_grief_policy_must_bind_worst_case_cost_before_payment_authority,
  true,
);
assert.equal(
  contract.prerequisite_source_truth.unpaid_instruction_reservation_ttl_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .per_identity_outstanding_instruction_cap_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth.global_outstanding_instruction_cap_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .expired_unpaid_instruction_releases_soft_reservation_only_after_payment_absence_recheck,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .late_payment_after_instruction_expiry_requires_deterministic_reconciliation,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .expired_instruction_must_not_auto_fulfill_or_auto_refund,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .presale_micro_purchase_gas_grief_protection_required,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .fresh_chain2050_fee_observation_required_before_payment_instruction,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .gas_liability_release_requires_terminal_receipt_finality,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .source_chain_refund_fee_budget_separate_from_chain2050_gas,
  true,
);
assert.equal(
  contract.prerequisite_source_truth
    .production_credential_binding_evidence_id,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
);
assert.equal(
  contract.fulfillment_contract_deployment_contract.max_inventory_atoms,
  "10000000000000000000000000",
);
assert.equal(
  contract.presale_invariant_readiness
    .canonical_presale_max_fulfillment_units_6_decimal,
  "10000000000000",
);
assert.equal(
  contract.presale_invariant_readiness.hidden_minimum_required_for_gas_safety,
  false,
);
assert.equal(
  contract.presale_invariant_readiness
    .native_gas_liability_reserved_before_payment_instruction,
  false,
);
assert.equal(
  contract.presale_invariant_readiness
    .fulfillment_native_gas_balance_may_not_be_double_promised,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .per_obligation_gas_reservation_does_not_prove_full_presale_capacity,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .full_presale_native_gas_capacity_or_replenishment_required,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .source_chain_refund_fee_budget_is_separate,
  true,
);
assert.equal(
  contract.runtime_configuration_contract
    .candidate_verification_requires_child_enable_value,
  "0",
);
assert.equal(
  contract.runtime_configuration_contract
    .candidate_verification_requires_child_apply_enable_value,
  "0",
);
assert.equal(
  contract.runtime_configuration_contract
    .required_credential_binding_evidence_id_sha256,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
);

const ready =
  verifyBuyVoidPaymentKeyedProductionConfigurationV1(
    candidate(),
  );
if (ready.ok === false) throw new Error(ready.reason);
assert.equal(
  ready.marker,
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_V1,
);
assert.equal(
  ready.status,
  "candidate_verified_held_on_deployment_attestation",
);
assert.equal(ready.candidate_configuration_values_verified, true);
assert.equal(ready.runtime_remains_disabled, true);
assert.equal(ready.runtime_apply_remains_disabled, true);
assert.equal(ready.credential_wallet_binding_verified, true);
assert.equal(ready.canonical_presale_economics_verified, true);
assert.equal(
  ready.fulfillment_contract_address_shape_verified_only,
  true,
);
assert.equal(ready.fulfillment_contract_deployment_attested, false);
assert.equal(ready.predecessor_lineage_attested, false);
assert.equal(ready.inventory_funding_verified, false);
assert.equal(ready.production_configuration_applied, false);
assert.equal(ready.runtime_activation_authorized, false);
assert.equal(ready.public_activation_authorized, false);
assert.equal(
  ready.next_gate,
  "fulfillment_contract_deployment_and_lineage_attestation",
);
assert.match(
  ready.configuration_fingerprint_sha256,
  /^[0-9a-f]{64}$/,
);
assert.match(
  ready.preparation_policy_fingerprint_sha256,
  /^[0-9a-f]{64}$/,
);
assert.match(
  ready.receipt_policy_fingerprint_sha256,
  /^[0-9a-f]{64}$/,
);
assert.match(
  ready.rpc_url_fingerprint_sha256,
  /^[0-9a-f]{64}$/,
);
assert.equal(ready.max_void_amount_units, "10000000000000");
assert.equal(
  ready.max_token_amount_atoms,
  "10000000000000000000000000",
);

function heldReason(
  override: Record<string, string>,
): string {
  const result =
    verifyBuyVoidPaymentKeyedProductionConfigurationV1(
      candidate(override),
    );
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("expected held");
  return result.reason;
}

assert.equal(
  heldReason({
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED: "1",
  }),
  "payment_keyed_production_runtime_must_remain_disabled",
);
assert.equal(
  heldReason({
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED: "1",
  }),
  "payment_keyed_production_runtime_apply_must_remain_disabled",
);
assert.equal(
  heldReason({
    VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL:
      "https://chain2050.example.invalid/",
  }),
  "payment_keyed_production_rpc_url_invalid",
);
assert.equal(
  heldReason({
    VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS:
      "0x0000000000000000000000000000000000000000",
  }),
  "payment_keyed_production_contract_token_address_invalid",
);
assert.equal(
  heldReason({
    VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS:
      "0x1111111111111111111111111111111111111111",
  }),
  "payment_keyed_production_contract_token_address_invalid",
);
assert.equal(
  heldReason({
    VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS:
      "0x3333333333333333333333333333333333333333",
  }),
  "payment_keyed_production_wallet_evidence_mismatch",
);
assert.equal(
  heldReason({
    VOID_BUY_VOID_INVENTORY_POOL_ID: "wrong-pool",
  }),
  "payment_keyed_production_presale_invariant_mismatch",
);
assert.equal(
  heldReason({
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS:
      "9999999999999",
  }),
  "payment_keyed_production_presale_invariant_mismatch",
);
assert.equal(
  heldReason({
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR:
      "3",
  }),
  "payment_keyed_production_presale_invariant_mismatch",
);
assert.equal(
  heldReason({
    VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS: "1001",
  }),
  "payment_keyed_production_min_confirmations_invalid",
);
assert.equal(
  heldReason({
    VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID:
      "0".repeat(64),
  }),
  "payment_keyed_production_credential_evidence_mismatch",
);
assert.equal(
  heldReason({
    CREDENTIALS_DIRECTORY: "/",
  }),
  "payment_keyed_production_credentials_directory_invalid",
);

{
  const value = candidate();
  delete value.VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL;
  const result =
    verifyBuyVoidPaymentKeyedProductionConfigurationV1(
      value,
    );
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("missing field unexpectedly ready");
  assert.equal(
    result.reason,
    "payment_keyed_production_configuration_missing_field",
  );
}

{
  const result =
    verifyBuyVoidPaymentKeyedProductionConfigurationV1({
      ...candidate(),
      ATTACKER_PRIVATE_KEY: "forbidden",
    });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("unknown key unexpectedly ready");
  assert.equal(
    result.reason,
    "payment_keyed_production_configuration_unknown_key",
  );
}

for (const key of
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_REQUIRED_KEYS_V1) {
  assert.equal(typeof key, "string");
  assert.ok(key.length > 0);
}
for (const key of
  VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_OPTIONAL_KEYS_V1) {
  assert.equal(typeof key, "string");
  assert.ok(key.length > 0);
}

for (const [key, expected] of Object.entries({
  pure_configuration_validation_only: true,
  explicit_candidate_input_required: true,
  process_environment_read: false,
  filesystem_read: false,
  filesystem_write: false,
  credential_read: false,
  wallet_access: false,
  rpc_call: false,
  signing: false,
  transaction_broadcast: false,
  deployment_attestation: false,
  runtime_activation: false,
  runtime_apply_activation: false,
  inventory_funding: false,
  public_activation: false,
  money_movement: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_VERIFIER_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

const runtimeSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_payment_keyed_full_runtime_v1.ts",
  ),
  "utf8",
);
assert.match(
  runtimeSource,
  /VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED/,
);
assert.match(
  runtimeSource,
  /VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED/,
);
assert.match(
  runtimeSource,
  /VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS/,
);
assert.match(
  runtimeSource,
  /VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS/,
);
assert.match(
  runtimeSource,
  /VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID/,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_PRODUCTION_CONFIGURATION_V1_PROOF_GREEN");
console.log("payment_keyed_runtime_source_ready=true");
console.log("payment_keyed_runtime_parent_mounted=true");
console.log("candidate_runtime_enabled=false");
console.log("candidate_runtime_apply_enabled=false");
console.log("candidate_configuration_values_verified=true");
console.log("credential_wallet_binding_verified=true");
console.log("canonical_presale_economics_verified=true");
console.log("full_presale_max_void_units=10000000000000");
console.log("full_presale_max_token_atoms=10000000000000000000000000");
console.log("fulfillment_contract_address_shape_only=true");
console.log("fulfillment_contract_deployment_attested=false");
console.log("predecessor_lineage_attested=false");
console.log("inventory_funding_verified=false");
console.log("coupled_native_gas_reservation_journal_ready=false");
console.log("coupled_native_nonce_scheduler_ready=false");
console.log("economic_execution_layer_identity_resolved=false");
console.log("economic_execution_layer_public_verification_ready=false");
console.log("native_gas_currency_supply_accounting_ready=false");
console.log("known_anvil_prefunded_dev_accounts_neutralized=false");
console.log("known_anvil_dev_private_key_submission_blocked=false");
console.log("native_gas_genesis_supply_and_known_key_accounts_reconciled=false");
console.log("participant_post_purchase_voidtoken_control_ready=false");
console.log("participant_voidtoken_transfer_submission_path_ready=false");
console.log("participant_native_gas_access_or_paymaster_model_ready=false");
console.log("presale_micro_purchase_gas_grief_protection_ready=false");
console.log("presale_anti_grief_public_minimum_batching_user_paid_or_equivalent=true");
console.log("presale_hidden_minimum_forbidden=true");
console.log("presale_anti_grief_worst_case_cost_binding_required=true");
console.log("presale_unpaid_instruction_reservation_hoarding_protection_ready=false");
console.log("presale_payment_instruction_ttl_policy_ready=false");
console.log("presale_late_payment_after_expiry_reconciliation_ready=false");
console.log("fresh_fee_admission_guard_ready=false");
console.log("gas_reservation_terminal_receipt_finality_release_guard_ready=false");
console.log("presale_native_gas_reserve_protection_ready=false");
console.log("presale_native_gas_lifetime_capacity_or_replenishment_ready=false");
console.log("paid_unreservable_customer_resolution_policy_ready=false");
console.log("presale_hidden_minimum_required_for_gas_safety=false");
console.log("presale_payment_instruction_requires_gas_liability_reservation=true");
console.log("presale_reserved_attempts_per_obligation=2");
console.log("presale_automatic_fulfillment_retry=false");
console.log("runtime_activation_authorized=false");
console.log("public_activation_authorized=false");
console.log("next_gate=fulfillment_contract_deployment_and_lineage_attestation");
