import {
  VOID_BUY_VOID_DUAL_RAIL_POLICY_HOLD_V1,
  readBuyVoidDualRailServerPolicyContractV1,
  validateBuyVoidDualRailServerPolicyObjectV1,
} from "./void_buy_void_dual_rail_server_policy_contract_v1.mjs";

export const VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_V1 =
  "VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_V1";

export const VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_BOUNDARY_V1 = Object.freeze({
  source_only_guard: true,
  base_rpc_identity_distinct_from_ethereum: true,
  base_finality_adapter_distinct_from_ethereum: true,
  receive_address_distinctness_required: false,
  usdc_contract_distinctness_required: false,
  source_chain_rpc_call: false,
  source_chain_finality_authority: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_construction: false,
  transaction_broadcast: false,
  inventory_funding: false,
  public_presale_activation: false,
  money_movement: false,
});

function hold(reason) {
  return {
    ok: false,
    status: VOID_BUY_VOID_DUAL_RAIL_POLICY_HOLD_V1,
    reason,
    missing_envs: [],
  };
}

// Consume only the detached immutable generation returned by policy admission.
function isolationReport(validated) {
  const [base, ethereum] = validated.rails;
  if (base.rpc_identity === ethereum.rpc_identity) {
    throw new Error("dual_rail_rpc_identity_collision");
  }
  if (base.finality.adapter_id === ethereum.finality.adapter_id) {
    throw new Error("dual_rail_finality_adapter_collision");
  }
  return Object.freeze({
    marker: VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_V1,
    base_rpc_identity: base.rpc_identity,
    ethereum_rpc_identity: ethereum.rpc_identity,
    base_finality_adapter_id: base.finality.adapter_id,
    ethereum_finality_adapter_id: ethereum.finality.adapter_id,
    policy_id: validated.policy_id,
    stable_config_sha256:
      validated.fingerprints.combined_stable_sha256,
    boundary: VOID_BUY_VOID_DUAL_RAIL_AUTHORITY_ISOLATION_BOUNDARY_V1,
  });
}

export function assertBuyVoidDualRailAuthorityIsolationV1(policy) {
  return isolationReport(validateBuyVoidDualRailServerPolicyObjectV1(policy));
}

export function validateBuyVoidDualRailAuthorityIsolatedPolicyV1(policy) {
  const validated = validateBuyVoidDualRailServerPolicyObjectV1(policy);
  isolationReport(validated);
  return validated;
}

export function readBuyVoidDualRailAuthorityIsolatedPolicyV1(
  env = process.env,
) {
  const decision = readBuyVoidDualRailServerPolicyContractV1(env);
  if (!decision.ok) return decision;
  try {
    const isolation = isolationReport(decision.policy);
    return Object.freeze({
      ...decision,
      isolation,
    });
  } catch (error) {
    const reason = String(error?.message || "dual_rail_authority_isolation_invalid");
    return hold(reason);
  }
}
