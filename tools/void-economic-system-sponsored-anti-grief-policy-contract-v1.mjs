import { createHash } from "node:crypto";

export const VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT_V1 =
  "VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT_V1";

const CONTRACT_PAYLOAD = Object.freeze({
  schema: "void.economic-system-sponsored-anti-grief-policy-contract.v1",
  version: 1,
  chain_id: 2050,
  execution_epoch: 2,
  native_gas_model: "epoch2_metered_zero_gas_price_v1",
  native_gas_economic_charge_atoms: "0",
  participant_native_gas_balance_required: false,
  max_signed_intent_gas_limit: "3000000",
  intent_ttl_caps_policy_contract_id:
    "sha256:71bb72b19dec6b24cb864eca8716991b0cec2665e6537584c1a0ff55a06047c0",
  committed_zero_gas_metering_evidence_required: true,
  zero_gas_evidence_marker:
    "VOID_ECONOMIC_EPOCH2_BESU_FREE_GAS_EVIDENCE_V2",
  zero_gas_evidence_status_required:
    "BESU_ZERO_NATIVE_FREE_GAS_EXECUTION_GREEN",
  positive_gas_metering_required: true,
  exact_launch_budget_values_required: true,
  positive_per_intent_sponsored_gas_limit_required: true,
  positive_per_identity_sponsored_gas_budget_required: true,
  positive_global_sponsored_gas_budget_required: true,
  identity_budget_not_less_than_intent_limit_required: true,
  global_budget_not_less_than_identity_budget_required: true,
  content_addressed_policy_required: true,
  content_addressed_sponsorship_required: true,
  signed_intent_gas_limit_binding_required: true,
  signed_submission_digest_binding_required: true,
  signed_submission_lifetime_matches_economic_intent_required: true,
  gas_charge_basis: "verified_signed_intent_gas_limit",
  expired_sponsorships_not_counted_as_reserved: true,
  budget_exhaustion_action:
    "deny_sponsorship_without_hidden_trade_minimum",
  hidden_minimum_trade_amount_forbidden: true,
  production_budget_values_hardcoded: false,
  source_only: true,
  runtime_enforcement_verified: false,
});

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((key) =>
      JSON.stringify(key) + ":" + canonicalJson(value[key])
    ).join(",") + "}";
  }
  throw new Error("INVALID_CANONICAL_VALUE");
}

function digest(value) {
  return "sha256:" +
    createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export const VOID_ECONOMIC_SYSTEM_SPONSORED_ANTI_GRIEF_POLICY_CONTRACT =
  Object.freeze({
    ...CONTRACT_PAYLOAD,
    policy_contract_id: digest(CONTRACT_PAYLOAD),
  });
