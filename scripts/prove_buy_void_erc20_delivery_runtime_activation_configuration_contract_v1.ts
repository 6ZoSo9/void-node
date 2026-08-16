import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1,
  VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1,
} from "../src/economic/buy_void_erc20_delivery_runtime_activation_configuration_contract_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1,
} from "../src/economic/buy_void_erc20_production_configuration_candidate_binding_v1.js";
import {
  readBuyVoidCanonicalPresaleServerPolicyV1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const contract = VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_V1;
const binding =
  VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_RECORD_V1;
assert.equal(
  contract.status,
  "production_configuration_verified_held_on_durable_history_anti_rollback_anchor",
);
assert.equal(contract.canonical_chain_id, "2050");
assert.equal(contract.canonical_asset, "void_token_erc20");
assert.equal(
  contract.prerequisite_source_truth.canonical_delivery_dependency_bootstrap_ready,
  true,
);
assert.equal(
  contract.prerequisite_source_truth.erc20_transaction_preparation_execution_state_ready,
  true,
);
assert.equal(
  contract.prerequisite_source_truth.erc20_execution_composition_ready,
  true,
);
assert.equal(
  contract.prerequisite_source_truth.caller_supplied_transaction_plan_forbidden,
  true,
);
assert.equal(
  contract.prerequisite_source_truth.canonical_erc20_receipt_to_record_confirmed_ready,
  true,
);
assert.equal(
  contract.prerequisite_source_truth.existing_terminal_closeout_reused,
  true,
);
assert.equal(contract.canonical_delivery_runtime_activation_ready, false);
assert.equal(contract.production_configuration_values_verified, true);
assert.equal(contract.production_credential_binding_ready, true);
assert.equal(contract.production_configuration_applied, false);
assert.equal(
  contract.canonical_production_credential_binding_evidence_ready,
  true,
);
assert.equal(
  contract.canonical_production_credential_binding_evidence
    .exact_wallet_binding,
  true,
);
assert.equal(
  contract.canonical_production_credential_binding_evidence
    .interpretation.clone_local_credential_binding_inferred,
  false,
);
assert.equal(
  contract.reviewed_production_configuration_binding.marker,
  binding.marker,
);
assert.equal(
  contract.reviewed_production_configuration_binding
    .configuration_fingerprint_sha256,
  binding.expected.configuration_fingerprint_sha256,
);
assert.equal(
  contract.reviewed_production_configuration_binding
    .reviewed_merge_commit_sha,
  "5a66040d63225dee59fc449937fda063800d425a",
);
assert.equal(
  contract.reviewed_production_configuration_binding
    .repository_candidate_binding_ready,
  true,
);
assert.equal(
  contract.reviewed_production_configuration_binding
    .production_configuration_applied,
  false,
);
assert.equal(
  contract.reviewed_production_configuration_binding
    .runtime_activation_authorized,
  false,
);
assert.equal(
  contract.reviewed_production_configuration_binding
    .dependency_injection_activation_authorized,
  false,
);
assert.equal(
  contract.reviewed_production_configuration_binding
    .inventory_funding_authorized,
  false,
);
assert.equal(contract.dormant_dependency_injection_source_ready, true);
assert.equal(
  contract.dormant_dependency_injection_requires_delivery_runtime_disabled,
  true,
);
assert.equal(
  contract.dormant_dependency_injection_required_delivery_enable_value,
  "0",
);
assert.equal(
  contract.dormant_dependency_injection_wallet_evidence_binding_required,
  true,
);
assert.equal(
  contract.runtime_configuration_contract
    .dependency_injection_requires_delivery_runtime_enable_value,
  "0",
);
assert.equal(
  contract.runtime_configuration_contract
    .dependency_injection_configured_wallet_must_match_evidence,
  true,
);
assert.equal(contract.dependency_injection_runtime_ready, false);
assert.equal(contract.canonical_delivery_runtime_parent_mounted, true);
assert.equal(contract.canonical_delivery_execution_ready, false);
assert.equal(contract.presale_inventory_funding_ready, false);

assert.equal(
  contract.presale_invariant_readiness.canonical_presale_pool_id,
  "buy-void-presale-v1",
);
assert.equal(
  contract.presale_invariant_readiness.canonical_inventory_policy_version,
  "presale-v1",
);
assert.equal(
  contract.presale_invariant_readiness.canonical_presale_max_void,
  "10000000",
);
assert.equal(
  contract.presale_invariant_readiness
    .canonical_presale_max_fulfillment_units_6_decimal,
  "10000000000000",
);
assert.equal(
  contract.presale_invariant_readiness
    .canonical_max_reservation_fulfillment_units_6_decimal,
  "10000000000000",
);
assert.equal(
  contract.presale_invariant_readiness.finite_presale_cap_local_history_enforced,
  true,
);
assert.equal(
  contract.presale_invariant_readiness.finite_presale_cap_end_to_end_enforced,
  false,
);
assert.equal(
  contract.presale_invariant_readiness.canonical_rate_void_units_numerator,
  "2",
);
assert.equal(
  contract.presale_invariant_readiness.canonical_rate_void_units_denominator,
  "1",
);
assert.equal(
  contract.presale_invariant_readiness.fixed_presale_rate_enforced,
  true,
);
assert.equal(
  contract.presale_invariant_readiness.reservation_ceiling_equals_total_pool,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .payment_admission_reservation_atomicity_ready,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .inventory_reservation_before_new_paid_claim,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .paid_unreservable_terminal_obligation_local_integrity_ready,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .paid_unreservable_terminal_obligation_ready,
  false,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_local_consistency_ready,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_expected_set_commitment_ready,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_append_only_hash_chain_index_ready,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_paired_record_expectation_deletion_fail_closed,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_index_truncated_tail_fail_closed,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_missing_record_fail_closed,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_filename_content_identity_enforced,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_closed_schema_enforced,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_liability_completeness_fail_closed,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_integrity_blocks_new_mutation,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_external_anti_rollback_anchor_ready,
  false,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_valid_suffix_rollback_detection_ready,
  false,
);
assert.equal(
  contract.presale_invariant_readiness
    .durable_history_full_rollback_protection_ready,
  false,
);
assert.equal(
  contract.presale_invariant_readiness
    .unindexed_preexisting_history_silently_adopted,
  false,
);
assert.equal(
  contract.presale_invariant_readiness
    .confirmed_payer_without_reservation_or_obligation_allowed,
  false,
);
assert.equal(
  contract.presale_invariant_readiness
    .no_per_buyer_purchase_throttle_below_remaining_inventory,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .validator_scale_purchase_10000_void_admission_ready,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .delivery_execution_amount_cap_separate_from_purchase_admission,
  true,
);
assert.equal(
  contract.presale_invariant_readiness.disabled_delivery_canary_max_may_be_lower,
  true,
);
assert.equal(
  contract.presale_invariant_readiness
    .public_delivery_activation_requires_presale_capacity_max,
  true,
);
assert.equal(
  contract.production_broad_delivery_configuration_verified,
  true,
);
assert.deepEqual(
  [...contract.activation_readiness_blockers],
  [
    "durable_history_anti_rollback_anchor_not_ready",
    "canonical_delivery_runtime_activation_not_ready",
  ],
);
assert.equal(
  contract.current_parent_blocker,
  "durable_history_anti_rollback_anchor_not_ready",
);
assert.equal(
  contract.next_gate,
  "durable_history_anti_rollback_anchor",
);
assert.equal(
  contract.activation_preconditions
    .durable_history_external_anti_rollback_anchor_required,
  true,
);

const presalePolicyBase: NodeJS.ProcessEnv = {
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN: "base",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_USDC_CONTRACT:
    "0x1111111111111111111111111111111111111111",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_RECEIVE_ADDRESS:
    "0x2222222222222222222222222222222222222222",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CURRENT_BLOCK_NUMBER: "105",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_MIN_CONFIRMATIONS: "3",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR: "2",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR: "1",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION:
    "presale-v1",
  VOID_BUY_VOID_INVENTORY_POOL_ID: "buy-void-presale-v1",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS:
    "10000000000000",
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS:
    "10000000000000",
  VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS:
    "0xc884f631c3881b8b672bfcbf019c856146cd7f73",
};

const canonicalPresale =
  readBuyVoidCanonicalPresaleServerPolicyV1(presalePolicyBase);
assert.equal(canonicalPresale.ok, true);

for (const [label, overrides, reason] of [
  [
    "rate",
    {
      VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR: "3",
      VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR: "2",
    },
    "canonical_presale_fixed_rate_mismatch",
  ],
  [
    "capacity",
    {
      VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS:
        "10000000000001",
    },
    "canonical_presale_pool_capacity_mismatch",
  ],
  [
    "reservation-canary",
    {
      VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS:
        "2000000",
    },
    "canonical_presale_reservation_ceiling_mismatch",
  ],
] as const) {
  const held = readBuyVoidCanonicalPresaleServerPolicyV1({
    ...presalePolicyBase,
    ...overrides,
  });
  assert.equal(held.ok, false, label);
  if (held.ok) throw new Error(`${label} unexpectedly configured`);
  assert.equal(held.reason, reason, label);
}
assert.equal(
  contract.amount_unit_contract.max_amount_unit_domain,
  "fulfillment_units_6_decimal",
);
assert.equal(
  contract.amount_unit_contract.fulfillment_unit_decimals,
  6,
);
assert.equal(
  contract.amount_unit_contract.token_atom_decimals,
  18,
);
assert.equal(
  contract.amount_unit_contract.token_atom_multiplier,
  "1000000000000",
);
assert.equal(
  contract.amount_unit_contract
    .max_amount_must_not_exceed_saga_reservation_cap,
  true,
);
assert.equal(
  contract.receipt_confirmation_domain_contract
    .generic_saga_max_confirmations,
  "1000000",
);
assert.equal(
  contract.receipt_confirmation_domain_contract
    .preflight_before_record_confirmed,
  true,
);

const runtime = read(contract.runtime_source_path);
const composition = read(contract.execution_composition_source_path);
const dependency = read(contract.dependency_bootstrap_source_path);
const signer = read("src/economic/buy_void_native_fulfillment_wallet_credential_signer_v1.ts");
const parent = read(contract.parent_source_path);
const inventoryHistory = read(
  contract.presale_invariant_readiness.inventory_obligation_source_path,
);

for (const env of contract.runtime_configuration_contract.required_policy_envs) {
  assert.equal(runtime.includes(env) || composition.includes(env), true, `missing required runtime env ${env}`);
}
for (const marker of [
  "server_derived_transaction_plan: true",
  "caller_supplied_transaction_plan: false",
  "canonical_planner_policy_validation_required: true",
  "durable_nonce_reservation_required: true",
  "signed_hash_custody_required: true",
  "saga_write_ahead_broadcast_intent_required: true",
  "erc20_receipt_reconciliation_required: true",
  "canonical_record_confirmed_required: true",
  "existing_terminal_closeout_reused: true",
  "const ALLOWED_INPUT_KEYS = new Set([",
]) {
  assert.equal(
    runtime.includes(marker),
    true,
    `runtime contract drift: ${marker}`,
  );
}
for (const allowedKey of [
  "action",
  "attempt_id",
  "apply",
  "confirmation",
]) {
  assert.equal(
    runtime.includes(`"${allowedKey}"`),
    true,
    `runtime allowlist missing ${allowedKey}`,
  );
}
assert.doesNotMatch(runtime, /^\s*"plan",\s*$/m);
assert.doesNotMatch(runtime, /^\s*"transaction_plan",\s*$/m);
assert.equal(runtime.includes("const plan = (body as any).plan"), false);
assert.equal(runtime.includes("submission_idempotency_key: (body as any)"), false);
for (const marker of [
  "server_derived_transaction_plan: true",
  "caller_transaction_plan: false",
  "exact_pending_nonce_reservation: true",
  "wallet_scoped_nonce_lock: true",
  "signed_hash_custody_persisted_before_broadcast: true",
  "write_ahead_saga_broadcast_intent: true",
  "no_rebroadcast_after_ambiguous_submission: true",
  "canonical_record_confirmed_reused: true",
  "existing_saga_terminal_closeout_reused: true",
]) assert.equal(composition.includes(marker), true, `composition contract drift: ${marker}`);
assert.equal(composition.includes("runBuyVoidErc20TransactionPreparationPlannerV1"), true);
assert.equal(
  composition.includes(
    "validateBuyVoidErc20TransactionPreparationPlannerPolicyV1",
  ),
  true,
);
assert.equal(
  composition.includes(
    "erc20_execution_max_amount_exceeds_saga_fulfillment_unit_cap",
  ),
  true,
);
assert.equal(
  composition.includes(
    "erc20_receipt_confirmation_count_out_of_saga_range",
  ),
  true,
);
const confirmationPreflight = composition.indexOf(
  "erc20_receipt_confirmation_count_out_of_saga_range",
);
const recordConfirmed = composition.indexOf(
  'action: "record_confirmed"',
);
assert.ok(
  confirmationPreflight >= 0 &&
    recordConfirmed > confirmationPreflight,
  "confirmation range must be held before canonical record_confirmed",
);
assert.equal(composition.includes("runBuyVoidErc20DeliveryReceiptReconcilerV1"), true);
assert.equal(composition.includes('action: "record_confirmed"'), true);
assert.equal(composition.includes("runSagaSupervisorTickV1"), true);

assert.equal(dependency.includes("fixed_systemd_credential_id_reused_when_signing: true"), true);
assert.equal(signer.includes(`"${contract.runtime_configuration_contract.fixed_signer_credential_id}"`), true);
assert.equal(parent.includes("canonical_delivery_runtime_parent_mounted: true"), true);
assert.equal(parent.includes("canonical_delivery_execution_ready: false"), true);
assert.equal(parent.includes("presale_inventory_funding_ready: false"), true);
assert.match(
  parent,
  /from "\.\/buy_void_delivery_runtime_integration_v1\.js";/,
);

for (const marker of [
  "VOID_BUY_VOID_INVENTORY_HISTORY_EXPECTATION_V1",
  "VOID_BUY_VOID_INVENTORY_HISTORY_INDEX_V1",
  "history_index_file",
  "inventory_history_index_truncated_tail",
  "reservation_expectations_dir",
  "obligation_expectations_dir",
  "inventory_reservation_history_expected_set_mismatch",
  "paid_unreservable_history_expected_set_mismatch",
  "inventory_reservation_filename_content_identity_mismatch",
  "paid_unreservable_filename_content_identity_mismatch",
]) {
  assert.equal(
    inventoryHistory.includes(marker),
    true,
    `durable inventory history contract drift: ${marker}`,
  );
}

for (const [key, value] of Object.entries(contract.authority)) {
  assert.equal(key === "source_only_contract" ? value : !value, true, `authority mismatch ${key}`);
}
console.log("VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1_PROOF_GREEN");
console.log("erc20_execution_composition_ready=1");
console.log("caller_supplied_transaction_plan=0");
console.log("canonical_planner_policy_validator_reused=1");
console.log("max_amount_unit_domain=fulfillment_units_6_decimal");
console.log("token_atom_multiplier=1000000000000");
console.log("confirmation_range_preflight_before_record_confirmed=1");
console.log("production_configuration_values_verified=1");
console.log("production_credential_binding_ready=1");
console.log("production_broad_delivery_configuration_verified=1");
console.log("production_configuration_applied=0");
console.log("reviewed_configuration_binding_marker=VOID_BUY_VOID_ERC20_PRODUCTION_CONFIGURATION_CANDIDATE_BINDING_V1");
console.log("configuration_fingerprint_sha256=9891cc703bd724541ace341561e3194bf356d5ac8af9d767acf7189e03174992");
console.log("canonical_production_credential_binding_evidence_ready=1");
console.log("durable_history_expected_set_commitment_ready=1");
console.log("durable_history_append_only_hash_chain_index_ready=1");
console.log("durable_history_paired_record_expectation_deletion_fail_closed=1");
console.log("durable_history_index_truncated_tail_fail_closed=1");
console.log("durable_history_filename_content_identity_enforced=1");
console.log("durable_history_missing_record_fail_closed=1");
console.log("durable_history_liability_completeness_fail_closed=1");
console.log("durable_history_local_consistency_ready=1");
console.log("durable_history_external_anti_rollback_anchor_ready=0");
console.log("durable_history_valid_suffix_rollback_detection_ready=0");
console.log("durable_history_full_rollback_protection_ready=0");
console.log("paid_unreservable_terminal_obligation_local_integrity_ready=1");
console.log("paid_unreservable_terminal_obligation_ready=0");
console.log("dormant_dependency_injection_source_ready=1");
console.log("dependency_injection_requires_delivery_runtime_disabled=1");
console.log("dependency_injection_required_delivery_enable_value=0");
console.log("dependency_injection_wallet_evidence_binding_required=1");
console.log("dependency_injection_runtime_ready=0");
console.log("canonical_delivery_runtime_parent_mounted=1");
console.log("canonical_delivery_runtime_activation_ready=0");
console.log("canonical_delivery_execution_ready=0");
console.log("presale_inventory_funding_ready=0");
console.log("canonical_presale_max_void=10000000");
console.log(
  "canonical_presale_max_fulfillment_units_6_decimal=10000000000000",
);
console.log("finite_presale_cap_local_history_enforced=1");
console.log("finite_presale_cap_end_to_end_enforced=0");
console.log("canonical_presale_rate=2/1");
console.log("fixed_presale_rate_enforced=1");
console.log("canonical_presale_reservation_ceiling=10000000000000");
console.log("per_buyer_purchase_throttle_below_remaining_inventory=0");
console.log("validator_scale_purchase_10000_void_admission_ready=1");
console.log("delivery_execution_amount_cap_separate_from_purchase_admission=1");
console.log("disabled_delivery_canary_max_may_be_lower=1");
console.log("public_delivery_activation_requires_presale_capacity_max=1");
console.log("activation_readiness_blockers=durable_history_anti_rollback_anchor_not_ready,canonical_delivery_runtime_activation_not_ready");
console.log("current_parent_blocker=durable_history_anti_rollback_anchor_not_ready");
console.log("next_gate=durable_history_anti_rollback_anchor");
console.log("runtime_activation_performed=0");
console.log("money_movement=0");
