import {
  VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1,
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "./void-economic-evm-successor-migration-v1.mjs";

export const VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1 =
  "VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1";

export const VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_AUTHORITY_V1 =
  Object.freeze({
    source_classification_only: true,
    state_export: false,
    genesis_build: false,
    runtime_mutation: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_funding: false,
    liquidity_movement: false,
    market_activation: false,
    public_presale_activation: false,
    migration_activation: false,
    funds_movement: false,
  });

const TOP_KEYS = Object.freeze([
  "authority",
  "chain_id",
  "execution_epoch",
  "execution_policy",
  "gates",
  "marker",
  "presale_wc_void_coupled_launch_required",
  "status",
  "successor_migration_candidate_path",
  "version",
  "wc_void_opening",
]);

const OPENING_KEYS = Object.freeze([
  "fixed_conversion",
  "fixed_opening_price",
  "opening_allocation_policy",
  "opening_price_source",
  "opening_sale_tranche_void_atoms",
  "post_opening_void_reserve_atoms",
  "protocol_void_inventory_atoms",
  "protocol_wc_seed_units",
]);

const EXECUTION_KEYS = Object.freeze([
  "native_gas_is_economic_asset",
  "participant_native_gas_balance_required",
  "raw_public_rpc_allowed",
  "voidtoken_is_only_economic_void_asset",
  "zero_fee_or_system_sponsored_execution_required",
]);

const GATE_KEYS = Object.freeze([
  "bounded_canary_green",
  "coupled_activation_ready",
  "economic_intent_ttl_and_caps_ready",
  "opening_claim_transfer_or_refund_binding_ready",
  "opening_commitment_window_policy_ready",
  "opening_concentration_and_sybil_limits_ready",
  "opening_minimum_real_wc_depth_policy_ready",
  "opening_nonproduction_wc_exclusion_ready",
  "opening_participant_provenance_and_eligibility_ready",
  "participant_post_purchase_voidtoken_control_ready",
  "public_quote_disclosure_ready",
  "quote_reserve_custody_verified",
  "reverse_void_to_wc_settlement_ready",
  "shared_post_discovery_model_reconciled",
  "system_sponsored_execution_anti_grief_ready",
  "wc_ledger_persistence_verified",
]);

const AUTHORITY_KEYS = Object.freeze([
  "chain2050_write",
  "funds_movement",
  "genesis_build",
  "inventory_funding",
  "liquidity_movement",
  "market_activation",
  "migration_activation",
  "private_key_access",
  "public_presale_activation",
  "runtime_mutation",
  "state_export",
  "transaction_broadcast",
  "transaction_construction",
  "transaction_signing",
  "wallet_or_signer_access",
]);

const GATE_TO_MISSING = Object.freeze({
  opening_commitment_window_policy_ready:
    "opening_commitment_window_policy_required",
  opening_participant_provenance_and_eligibility_ready:
    "opening_participant_provenance_and_eligibility_required",
  opening_concentration_and_sybil_limits_ready:
    "opening_concentration_and_sybil_limits_required",
  opening_minimum_real_wc_depth_policy_ready:
    "opening_minimum_real_wc_depth_policy_required",
  opening_nonproduction_wc_exclusion_ready:
    "opening_nonproduction_wc_exclusion_required",
  opening_claim_transfer_or_refund_binding_ready:
    "opening_claim_transfer_or_refund_binding_required",
  wc_ledger_persistence_verified:
    "wc_ledger_persistence_verification_required",
  quote_reserve_custody_verified:
    "quote_reserve_custody_verification_required",
  shared_post_discovery_model_reconciled:
    "shared_post_discovery_model_reconciliation_required",
  reverse_void_to_wc_settlement_ready:
    "reverse_void_to_wc_settlement_required",
  participant_post_purchase_voidtoken_control_ready:
    "participant_post_purchase_voidtoken_control_required",
  system_sponsored_execution_anti_grief_ready:
    "system_sponsored_execution_anti_grief_required",
  economic_intent_ttl_and_caps_ready:
    "economic_intent_ttl_and_caps_required",
  public_quote_disclosure_ready:
    "public_quote_disclosure_required",
  bounded_canary_green:
    "bounded_canary_required",
  coupled_activation_ready:
    "coupled_activation_ready_required",
});

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, keys, label) {
  if (!object(value)) throw new Error(label + "_invalid");
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(label + "_keys_mismatch");
  }
  return value;
}

function hold(reason, missing = []) {
  return Object.freeze({
    ok: false,
    status: "HOLD",
    marker: VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1,
    reason,
    missing_gates: Object.freeze([...missing]),
    successor_migration_authorized: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority: VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_AUTHORITY_V1,
  });
}

function validateStaticCandidate(raw) {
  const candidate = exactObject(raw, TOP_KEYS, "candidate");
  const opening = exactObject(
    candidate.wc_void_opening,
    OPENING_KEYS,
    "wc_void_opening",
  );
  const execution = exactObject(
    candidate.execution_policy,
    EXECUTION_KEYS,
    "execution_policy",
  );
  const gates = exactObject(candidate.gates, GATE_KEYS, "gates");
  const authority = exactObject(
    candidate.authority,
    AUTHORITY_KEYS,
    "authority",
  );

  if (
    candidate.marker !== VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1 ||
    candidate.version !== 1 ||
    !["HOLD", "SOURCE_READY"].includes(candidate.status)
  ) {
    throw new Error("candidate_identity_mismatch");
  }
  if (candidate.chain_id !== 2050 || candidate.execution_epoch !== 2) {
    throw new Error("chain_or_execution_epoch_mismatch");
  }
  if (
    candidate.successor_migration_candidate_path !==
    "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json"
  ) {
    throw new Error("successor_candidate_path_mismatch");
  }
  if (candidate.presale_wc_void_coupled_launch_required !== true) {
    throw new Error("coupled_launch_requirement_mismatch");
  }

  if (
    opening.protocol_void_inventory_atoms !==
      "10000000000000000000000000" ||
    opening.opening_sale_tranche_void_atoms !==
      "5000000000000000000000000" ||
    opening.post_opening_void_reserve_atoms !==
      "5000000000000000000000000" ||
    opening.protocol_wc_seed_units !== "0" ||
    opening.fixed_conversion !== false ||
    opening.fixed_opening_price !== false ||
    opening.opening_price_source !==
      "settled_wc_over_opening_sale_tranche" ||
    opening.opening_allocation_policy !==
      "pro_rata_largest_remainder_v1"
  ) {
    throw new Error("wc_void_opening_policy_mismatch");
  }

  if (
    execution.voidtoken_is_only_economic_void_asset !== true ||
    execution.native_gas_is_economic_asset !== false ||
    execution.participant_native_gas_balance_required !== false ||
    execution.zero_fee_or_system_sponsored_execution_required !== true ||
    execution.raw_public_rpc_allowed !== false
  ) {
    throw new Error("successor_execution_policy_mismatch");
  }

  for (const [key, value] of Object.entries(authority)) {
    if (value !== false) throw new Error("authority_must_remain_false:" + key);
  }
  for (const [key, value] of Object.entries(gates)) {
    if (typeof value !== "boolean") {
      throw new Error("gate_must_be_boolean:" + key);
    }
  }
  return candidate;
}

function successorDecisionReady(decision) {
  return (
    object(decision) &&
    decision.ok === true &&
    decision.status === "SOURCE_READY" &&
    decision.marker === VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1 &&
    decision.execution_epoch === 2 &&
    decision.chain_id === 2050 &&
    decision.participant_eoa_balances_same_address === true &&
    decision.voidtoken_same_address_preserved === true &&
    decision.voidtoken_runtime_identity_verified === true &&
    decision.voidtoken_balance_and_supply_equivalence_verified === true &&
    decision.contract_holder_value_remap_manifest_ready === true &&
    decision.ceremony_key_continuity_verified === true &&
    decision.offline_successor_equivalence_proven === true &&
    decision.unmapped_voidtoken_atomic_verified_zero === true &&
    decision.orphan_contract_held_void_atomic_verified_zero === true &&
    decision.admin_gate_migrates === false &&
    decision.config_gate_migrates === false &&
    decision.legacy_wc_relayer_migrates === false &&
    decision.native_gas_is_economic_asset === false &&
    decision.migration_authorized === false &&
    decision.public_activation_authorized === false &&
    decision.money_movement_authorized === false
  );
}

export function classifyVoidCoupledEconomicSuccessorGateFromDecisionV1(
  rawCandidate,
  successorDecision,
) {
  let candidate;
  try {
    candidate = validateStaticCandidate(rawCandidate);
  } catch (error) {
    return hold(
      error instanceof Error ? error.message : "candidate_invalid",
    );
  }

  const missing = [];
  if (!successorDecisionReady(successorDecision)) {
    missing.push("economic_successor_migration_source_ready_required");
  }
  for (const key of GATE_KEYS) {
    if (candidate.gates[key] !== true) {
      missing.push(GATE_TO_MISSING[key]);
    }
  }

  if (missing.length > 0) {
    return hold("coupled_economic_gates_incomplete", missing);
  }
  if (candidate.status !== "SOURCE_READY") {
    return hold("source_ready_status_required");
  }

  return Object.freeze({
    ok: true,
    status: "SOURCE_READY",
    marker: VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_V1,
    chain_id: 2050,
    execution_epoch: 2,
    presale_wc_void_coupled_launch_required: true,
    protocol_void_inventory_atoms:
      candidate.wc_void_opening.protocol_void_inventory_atoms,
    opening_sale_tranche_void_atoms:
      candidate.wc_void_opening.opening_sale_tranche_void_atoms,
    post_opening_void_reserve_atoms:
      candidate.wc_void_opening.post_opening_void_reserve_atoms,
    opening_price_source:
      candidate.wc_void_opening.opening_price_source,
    opening_allocation_policy:
      candidate.wc_void_opening.opening_allocation_policy,
    voidtoken_is_only_economic_void_asset: true,
    native_gas_is_economic_asset: false,
    participant_native_gas_balance_required: false,
    raw_public_rpc_allowed: false,
    successor_migration_authorized: false,
    market_activation_authorized: false,
    public_presale_activation_authorized: false,
    funds_movement_authorized: false,
    authority: VOID_COUPLED_ECONOMIC_SUCCESSOR_GATE_AUTHORITY_V1,
  });
}

export function classifyVoidCoupledEconomicSuccessorGateV1(
  rawCandidate,
  successorMigrationCandidate,
) {
  let successorDecision;
  try {
    successorDecision =
      classifyVoidEconomicEvmSuccessorMigrationV1(
        successorMigrationCandidate,
      );
  } catch {
    successorDecision = null;
  }
  return classifyVoidCoupledEconomicSuccessorGateFromDecisionV1(
    rawCandidate,
    successorDecision,
  );
}
