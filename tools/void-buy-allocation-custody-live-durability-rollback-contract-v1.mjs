export const VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_CONTRACT_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_CONTRACT_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_PARENT_PLAN_ID_V1 =
  "voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_REVIEWED_PRIMITIVE_BLOBS_V1 =
  Object.freeze({
    external_custody_qualification:
      "d2bc816b027d2aca0c236d9ec31d128b28159d7d",
    rollback_independence:
      "2d5fc24498b569f20701445d6214a8ca31e4f701",
    rollback_policy_evidence:
      "cf40d9d4a19d138d74aee849a6c02f96ee362dbb",
    second_control_composition:
      "97180cc03e3f1b2f9935191ac6aafe4b15307708",
  });

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_AUTHORITY_V1 =
  Object.freeze({
    source_only_contract: true,
    read_only_collection_sufficient: false,
    separately_authorized_storage_mutation_required: true,
    separately_authorized_live_rollback_test_required: true,
    production_gate_ready: false,
    host_execution_authorized: false,
    filesystem_read_authorized: false,
    filesystem_write_authorized: false,
    storage_mutation_authorized: false,
    rollback_test_authorized: false,
    service_mutation_authorized: false,
    credential_access_authorized: false,
    wallet_or_signer_access_authorized: false,
    payment_acceptance_authorized: false,
    public_presale_activation_authorized: false,
    wc_void_market_activation_authorized: false,
    transaction_submission_authorized: false,
    treasury_or_liquidity_action_authorized: false,
    funds_movement: false,
    production_host_evidence_authority: false,
  });

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_REQUIRED_FUTURE_EVIDENCE_V1 =
  Object.freeze({
    non_customer_canary_domain_required: true,
    operation_bound_authorization_required: true,
    exact_current_policy_binding_required: true,
    reviewed_source_generation_binding_required: true,
    challenge_entropy_and_unpredictability_required: true,
    live_journal_challenge_append_required: true,
    live_high_water_advance_required: true,
    journal_and_high_water_sync_close_reopen_required: true,
    external_witness_post_challenge_append_required: true,
    controlled_rollback_attempt_required: true,
    reviewed_rollback_controller_required: true,
    high_water_second_control_approval_required: true,
    post_rollback_high_water_non_decrease_required: true,
    stale_journal_refusal_required: true,
    post_rollback_external_witness_continuity_required: true,
    distinct_physical_storage_reobservation_required: true,
    post_test_policy_rebind_required: true,
    allocation_ledger_unchanged_required: true,
    customer_request_state_unchanged_required: true,
    evidence_origin_authentication_required: true,
  });

const PREREQUISITE_KEYS = Object.freeze([
  "rollback_independence_policy_qualified",
  "live_policy_observation_proven",
  "policy_file_installation_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "live_remote_append_performed",
  "external_second_control_domain_qualified",
  "external_second_control_policy_binding_proven",
  "post_cycle_live_policy_observation_bound",
]);

function held(reason, missing) {
  return Object.freeze({
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_CONTRACT_V1,
    version: 1,
    status: "held",
    reason,
    source_contract_ready: false,
    reviewed_prerequisites_bound: false,
    missing_prerequisites: Object.freeze([...missing]),
    read_only_collection_sufficient: false,
    controlled_live_challenge_required: false,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    host_execution_authorized: false,
    storage_mutation_authorized: false,
    rollback_test_authorized: false,
    payment_acceptance_authorized: false,
    public_presale_activation_authorized: false,
    wc_void_market_activation_authorized: false,
    transaction_submission_authorized: false,
    treasury_or_liquidity_action_authorized: false,
    funds_movement: false,
    production_host_evidence_authority: false,
    next_action: "HOLD_REVIEWED_LANE2_PREREQUISITES",
  });
}

export function classifyBuyVoidAllocationCustodyLiveDurabilityRollbackContractV1(
  input,
) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return held("input_shape_invalid", []);
  }
  const keys = Object.keys(input).sort();
  const expected = [...PREREQUISITE_KEYS].sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    return held("input_shape_invalid", []);
  }
  for (const key of PREREQUISITE_KEYS) {
    if (typeof input[key] !== "boolean") {
      return held("input_shape_invalid", []);
    }
  }

  const missing = PREREQUISITE_KEYS.filter((key) => input[key] !== true);
  if (missing.length !== 0) {
    return held("reviewed_prerequisites_missing", missing);
  }

  return Object.freeze({
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_LIVE_DURABILITY_ROLLBACK_CONTRACT_V1,
    version: 1,
    status: "source_prerequisites_bound_controlled_challenge_required",
    reason: "reviewed_prerequisites_bound",
    source_contract_ready: true,
    reviewed_prerequisites_bound: true,
    missing_prerequisites: Object.freeze([]),
    read_only_collection_sufficient: false,
    controlled_live_challenge_required: true,
    live_durable_storage_proven: false,
    rollback_resistance_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    host_execution_authorized: false,
    storage_mutation_authorized: false,
    rollback_test_authorized: false,
    payment_acceptance_authorized: false,
    public_presale_activation_authorized: false,
    wc_void_market_activation_authorized: false,
    transaction_submission_authorized: false,
    treasury_or_liquidity_action_authorized: false,
    funds_movement: false,
    production_host_evidence_authority: false,
    next_action:
      "SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1",
  });
}
