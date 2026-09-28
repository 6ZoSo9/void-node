import {
  VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1,
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "./void-economic-evm-successor-migration-v1.mjs";

import {
  VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
  wcVoidOpeningCommitmentIdV1,
  wcVoidOpeningSettlementIdV1,
} from "./void-wc-void-coupled-opening-v1.mjs";

import {
  VOID_SHARED_MARKET_POST_DISCOVERY_SCHEMA_V2,
  VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2,
  reconcileSharedMarketPostDiscoveryStateV2,
} from "./void-shared-market-post-discovery-state-v2.mjs";

import {
  VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1,
} from "./void-wc-void-opening-nonproduction-exclusion-v1.mjs";

import {
  VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1,
} from "./void-wc-void-opening-participant-provenance-eligibility-v1.mjs";

import {
  VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1,
} from "./void-wc-void-reverse-settlement-v1.mjs";

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
  "shared_post_discovery_reconciliation",
  "opening_nonproduction_wc_exclusion_policy",
  "opening_participant_provenance_eligibility_policy",
  "reverse_void_to_wc_settlement_policy",
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

const PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_KEYS = Object.freeze([
  "schema",
  "version",
  "identity_source",
  "earning_source",
  "participant_id_derivation",
  "active_credential_required",
  "credential_unexpired_at_admission_required",
  "active_binding_required",
  "binding_unexpired_at_admission_required",
  "production_earning_receipt_required",
  "earning_receipt_identity_match_required",
  "price_forming_source_class",
  "eligibility_scope",
  "sybil_policy_decided",
  "concentration_policy_decided",
  "minimum_depth_policy_decided",
  "source_only",
  "runtime_or_launch_evidence",
  "policy_id",
]);

const REVERSE_VOID_TO_WC_SETTLEMENT_POLICY_KEYS = Object.freeze([
  "schema",
  "version",
  "adapter_id",
  "pair",
  "direction",
  "canonical_void_token_required",
  "participant_transfer_method",
  "transfer_recipient",
  "transfer_amount_basis",
  "exact_one_transfer_log_required",
  "credit_kind",
  "credit_reason",
  "credit_amount_basis",
  "source_domain",
  "quote_asset_form",
  "quote_unit",
  "quote_decimals",
  "native_gas_model",
  "participant_native_gas_balance_required",
  "native_gas_economic_charge_atoms",
  "fixed_conversion",
  "presale_price_authority",
  "authenticated_quote_envelope_required",
  "pricing_math_verified",
  "quote_publisher_authenticity_verified",
  "receipt_provenance_verified",
  "market_vault_custody_verified",
  "runtime_or_launch_evidence",
  "source_only",
  "policy_id",
]);

const NONPRODUCTION_EXCLUSION_POLICY_KEYS = Object.freeze([
  "schema",
  "version",
  "allowed_price_forming_source_class",
  "excluded_source_classes",
  "production_earning_receipt_id_required",
  "exact_commitment_provenance_bijection_required",
  "participant_eligibility_decided",
  "concentration_policy_decided",
  "minimum_depth_policy_decided",
  "source_only",
  "runtime_or_launch_evidence",
  "policy_id",
]);

const SHARED_POST_DISCOVERY_RECONCILIATION_KEYS = Object.freeze([
  "profile",
  "source_model_fixture",
  "runtime_or_launch_evidence",
  "coupled_launch_id",
  "marker",
  "schema",
  "reconciliation_id",
  "wc_opening_state_id",
  "chain_id",
  "network_identity",
  "execution_epoch",
  "void_token",
  "void_token_decimals",
  "wc_void_phase",
  "btc_void_phase",
  "eth_void_phase",
  "wc_void_settled_quote_reserve_units",
  "total_planned_void_inventory_atoms",
  "wc_opening_participant_allocated_void_atoms",
  "wc_post_opening_retained_void_reserve_atoms",
  "unopened_post_presale_planned_void_inventory_atoms",
  "modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms",
  "shared_post_discovery_model_reconciled",
  "legacy_v1_six_decimal_void_atoms_authoritative",
  "all_markets_share_one_presale_closeout",
  "wc_void_uses_coupled_launch_id",
  "btc_void_remains_post_presale",
  "eth_void_remains_post_presale",
  "exact_30m_planned_inventory_conservation",
  "quote_reserve_custody_verified",
  "void_reserve_custody_verified",
  "market_activation_authority",
  "public_presale_activation_authority",
  "inventory_funding_authority",
  "funds_movement_authority",
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

const SOURCE_MODEL_COUPLED_LAUNCH_ID = "sha256:" + "a".repeat(64);

function sourceModelHash(digit) {
  return "sha256:" + String(digit).repeat(64);
}

function sourceModelCommitment(participantDigit, account, wcUnits) {
  const value = {
    schema: VOID_WC_VOID_OPENING_COMMITMENT_SCHEMA_V1,
    commitment_id: sourceModelHash("0"),
    coupled_launch_id: SOURCE_MODEL_COUPLED_LAUNCH_ID,
    participant_id: sourceModelHash(participantDigit),
    account,
    wc_units: String(wcUnits),
  };
  value.commitment_id = wcVoidOpeningCommitmentIdV1(value);
  return value;
}

function sourceModelDebit(commitmentValue, amount, tsMs) {
  const value = {
    schema: VOID_WC_VOID_OPENING_LEDGER_DEBIT_SCHEMA_V1,
    kind: "debit",
    account: commitmentValue.account,
    amount,
    delta: -amount,
    ts_ms: tsMs,
    reason: "wc_void_opening_settlement_v1",
    settlement_id: sourceModelHash("0"),
    commitment_id: commitmentValue.commitment_id,
    coupled_launch_id: SOURCE_MODEL_COUPLED_LAUNCH_ID,
    pair: "WC_VOID",
    source_domain: "void-work-credit-ledger",
    quote_asset_form: "ledger-credit",
    quote_unit: "wc",
    quote_decimals: 0,
    market_meta: {
      adapter_id: VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
      opening_only: true,
      fixed_price: false,
      protocol_wc_seed_units: "0",
    },
  };
  value.settlement_id = wcVoidOpeningSettlementIdV1(value);
  return value;
}

function deriveCanonicalSharedPostDiscoverySourceModelV2() {
  const first = sourceModelCommitment("1", "wc-opening-alpha", "250");
  const second = sourceModelCommitment("2", "wc-opening-beta", "750");
  const firstDebit = sourceModelDebit(first, 250, 1790344000001);
  const secondDebit = sourceModelDebit(second, 750, 1790344000002);
  return reconcileSharedMarketPostDiscoveryStateV2({
    coupled_launch_id: SOURCE_MODEL_COUPLED_LAUNCH_ID,
    commitments: [first, second],
    ledger_debits: [secondDebit, firstDebit],
  });
}

function validateParticipantProvenanceEligibilityPolicy(raw) {
  const binding = exactObject(
    raw,
    PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_KEYS,
    "opening_participant_provenance_eligibility_policy",
  );
  const expected =
    VOID_WC_VOID_OPENING_PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_V1;
  for (const key of PARTICIPANT_PROVENANCE_ELIGIBILITY_POLICY_KEYS) {
    if (binding[key] !== expected[key]) {
      throw new Error(
        "opening_participant_provenance_eligibility_policy_mismatch:" + key,
      );
    }
  }
  return binding;
}

function validateReverseVoidToWcSettlementPolicy(raw) {
  const binding = exactObject(
    raw,
    REVERSE_VOID_TO_WC_SETTLEMENT_POLICY_KEYS,
    "reverse_void_to_wc_settlement_policy",
  );
  const expected = VOID_WC_VOID_REVERSE_SETTLEMENT_POLICY_V1;
  for (const key of REVERSE_VOID_TO_WC_SETTLEMENT_POLICY_KEYS) {
    if (binding[key] !== expected[key]) {
      throw new Error(
        "reverse_void_to_wc_settlement_policy_mismatch:" + key,
      );
    }
  }
  return binding;
}

function validateNonproductionExclusionPolicy(raw) {
  const binding = exactObject(
    raw,
    NONPRODUCTION_EXCLUSION_POLICY_KEYS,
    "opening_nonproduction_wc_exclusion_policy",
  );
  const expected =
    VOID_WC_VOID_OPENING_NONPRODUCTION_EXCLUSION_POLICY_V1;
  for (const key of NONPRODUCTION_EXCLUSION_POLICY_KEYS) {
    const actual = binding[key];
    const wanted = expected[key];
    if (Array.isArray(wanted)) {
      if (
        !Array.isArray(actual) ||
        actual.length !== wanted.length ||
        actual.some((value, index) => value !== wanted[index])
      ) {
        throw new Error("opening_nonproduction_wc_exclusion_policy_mismatch:" + key);
      }
    } else if (actual !== wanted) {
      throw new Error("opening_nonproduction_wc_exclusion_policy_mismatch:" + key);
    }
  }
  return binding;
}

function validateSharedPostDiscoveryReconciliation(raw) {
  const binding = exactObject(
    raw,
    SHARED_POST_DISCOVERY_RECONCILIATION_KEYS,
    "shared_post_discovery_reconciliation",
  );
  const state = deriveCanonicalSharedPostDiscoverySourceModelV2();
  const expected = {
    profile: "canonical_source_model_fixture_v2",
    source_model_fixture: true,
    runtime_or_launch_evidence: false,
    coupled_launch_id: state.coupled_launch_id,
    marker: VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2,
    schema: VOID_SHARED_MARKET_POST_DISCOVERY_SCHEMA_V2,
    reconciliation_id: state.reconciliation_id,
    wc_opening_state_id: state.wc_opening_state_id,
    chain_id: state.chain_id,
    network_identity: state.network_identity,
    execution_epoch: state.execution_epoch,
    void_token: state.void_token,
    void_token_decimals: state.void_token_decimals,
    wc_void_phase: state.market_models.WC_VOID.phase,
    btc_void_phase: state.market_models.BTC_VOID.phase,
    eth_void_phase: state.market_models.ETH_VOID.phase,
    wc_void_settled_quote_reserve_units:
      state.market_models.WC_VOID.settled_quote_reserve_units,
    total_planned_void_inventory_atoms:
      state.total_planned_void_inventory_atoms,
    wc_opening_participant_allocated_void_atoms:
      state.wc_opening_participant_allocated_void_atoms,
    wc_post_opening_retained_void_reserve_atoms:
      state.wc_post_opening_retained_void_reserve_atoms,
    unopened_post_presale_planned_void_inventory_atoms:
      state.unopened_post_presale_planned_void_inventory_atoms,
    modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms:
      state.modeled_protocol_side_void_after_wc_opening_before_post_presale_markets_atoms,
    shared_post_discovery_model_reconciled:
      state.shared_post_discovery_model_reconciled,
    legacy_v1_six_decimal_void_atoms_authoritative:
      state.legacy_v1_six_decimal_void_atoms_authoritative,
    all_markets_share_one_presale_closeout:
      state.all_markets_share_one_presale_closeout,
    wc_void_uses_coupled_launch_id: state.wc_void_uses_coupled_launch_id,
    btc_void_remains_post_presale: state.btc_void_remains_post_presale,
    eth_void_remains_post_presale: state.eth_void_remains_post_presale,
    exact_30m_planned_inventory_conservation:
      state.exact_30m_planned_inventory_conservation,
    quote_reserve_custody_verified: state.quote_reserve_custody_verified,
    void_reserve_custody_verified: state.void_reserve_custody_verified,
    market_activation_authority: state.market_activation_authority,
    public_presale_activation_authority:
      state.public_presale_activation_authority,
    inventory_funding_authority: state.inventory_funding_authority,
    funds_movement_authority: state.funds_movement_authority,
  };
  for (const key of SHARED_POST_DISCOVERY_RECONCILIATION_KEYS) {
    if (binding[key] !== expected[key]) {
      throw new Error("shared_post_discovery_reconciliation_mismatch:" + key);
    }
  }
  return Object.freeze({ binding, state });
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
  const participantProvenanceEligibilityPolicy =
    validateParticipantProvenanceEligibilityPolicy(
      candidate.opening_participant_provenance_eligibility_policy,
    );
  const reverseVoidToWcSettlementPolicy =
    validateReverseVoidToWcSettlementPolicy(
      candidate.reverse_void_to_wc_settlement_policy,
    );
  const nonproductionExclusionPolicy =
    validateNonproductionExclusionPolicy(
      candidate.opening_nonproduction_wc_exclusion_policy,
    );
  const sharedPostDiscoveryReconciliation =
    validateSharedPostDiscoveryReconciliation(
      candidate.shared_post_discovery_reconciliation,
    );
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
  return Object.freeze({
    candidate,
    participantProvenanceEligibilityPolicy,
    reverseVoidToWcSettlementPolicy,
    nonproductionExclusionPolicy,
    sharedPostDiscoveryReconciliation,
  });
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
    decision.voidtoken_legacy_runtime_reused === false &&
    decision.voidtoken_successor_runtime_reviewed === true &&
    decision.voidtoken_successor_runtime_semantic_equivalence_verified === true &&
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
  let validated;
  try {
    validated = validateStaticCandidate(rawCandidate);
  } catch (error) {
    return hold(
      error instanceof Error ? error.message : "candidate_invalid",
    );
  }

  const candidate = validated.candidate;
  const participantProvenanceEligibilityPolicy =
    validated.participantProvenanceEligibilityPolicy;
  const reverseVoidToWcSettlementPolicy =
    validated.reverseVoidToWcSettlementPolicy;
  const nonproductionExclusionPolicy =
    validated.nonproductionExclusionPolicy;
  const sharedPostDiscoveryReconciliation =
    validated.sharedPostDiscoveryReconciliation;

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
    opening_participant_provenance_eligibility_policy_id:
      participantProvenanceEligibilityPolicy.policy_id,
    opening_participant_identity_source:
      participantProvenanceEligibilityPolicy.identity_source,
    opening_participant_earning_source:
      participantProvenanceEligibilityPolicy.earning_source,
    opening_participant_provenance_and_eligibility_ready: true,
    opening_nonproduction_wc_exclusion_policy_id:
      nonproductionExclusionPolicy.policy_id,
    opening_allowed_price_forming_wc_source_class:
      nonproductionExclusionPolicy.allowed_price_forming_source_class,
    opening_nonproduction_wc_exclusion_ready: true,
    reverse_void_to_wc_settlement_policy_id:
      reverseVoidToWcSettlementPolicy.policy_id,
    reverse_void_to_wc_settlement_adapter_id:
      reverseVoidToWcSettlementPolicy.adapter_id,
    reverse_void_transfer_amount_basis:
      reverseVoidToWcSettlementPolicy.transfer_amount_basis,
    reverse_wc_credit_amount_basis:
      reverseVoidToWcSettlementPolicy.credit_amount_basis,
    reverse_void_to_wc_settlement_ready: true,
    shared_post_discovery_reconciliation_id:
      sharedPostDiscoveryReconciliation.state.reconciliation_id,
    shared_post_discovery_opening_state_id:
      sharedPostDiscoveryReconciliation.state.wc_opening_state_id,
    shared_post_discovery_model_profile:
      candidate.shared_post_discovery_reconciliation.profile,
    shared_post_discovery_model_reconciled: true,
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
