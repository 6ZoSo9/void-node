import { createHash } from "node:crypto";

export const VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT_V1 =
  "VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT_V1";

const CONTRACT_PAYLOAD = Object.freeze({
  schema: "void.wc-void-opening-minimum-real-wc-depth-policy-contract.v1",
  version: 1,
  chain_id: 2050,
  pair: "WC_VOID",
  source_domain: "void-work-credit-ledger",
  quote_asset_form: "ledger-credit",
  quote_unit: "wc",
  quote_decimals: 0,
  protocol_wc_seed_units: "0",
  opening_price_source: "settled_wc_over_opening_sale_tranche",
  nonproduction_wc_exclusion_policy_id:
    "sha256:9cc4c2486e5571e6a80c4fa4d2caf8f0ac1d0d8736d27599814f859412a85d6d",
  exact_launch_minimum_real_wc_depth_required: true,
  positive_whole_wc_minimum_required: true,
  policy_committed_before_open_required: true,
  price_acceptance_after_window_close_required: true,
  settled_production_earned_wc_only: true,
  exact_commitment_settlement_bijection_required: true,
  minimum_depth_exhaustion_action: "hold_opening_price_acceptance",
  fixed_conversion_forbidden: true,
  production_minimum_real_wc_value_hardcoded: false,
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

export const VOID_WC_VOID_OPENING_MINIMUM_REAL_WC_DEPTH_POLICY_CONTRACT =
  Object.freeze({
    ...CONTRACT_PAYLOAD,
    policy_contract_id: digest(CONTRACT_PAYLOAD),
  });
