import { createHash } from "node:crypto";

export const VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT_V1 =
  "VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT_V1";

const CONTRACT_PAYLOAD = Object.freeze({
  schema: "void.wc-void-opening-concentration-sybil-policy-contract.v1",
  version: 1,
  chain_id: 2050,
  pair: "WC_VOID",
  participant_provenance_policy_id:
    "sha256:66655e80ef7bcbc2edce68b7ab285d0bb404e95fb546e7bd27451c189613eacf",
  nonproduction_wc_exclusion_policy_id:
    "sha256:9cc4c2486e5571e6a80c4fa4d2caf8f0ac1d0d8736d27599814f859412a85d6d",
  exact_launch_cap_values_required: true,
  positive_participant_share_cap_bps_required: true,
  positive_related_identity_share_cap_bps_required: true,
  share_caps_strictly_below_full_cohort_required: true,
  related_identity_cap_not_less_than_participant_cap_required: true,
  policy_committed_before_open_required: true,
  content_addressed_policy_required: true,
  exact_eligible_participant_cluster_bijection_required: true,
  content_addressed_cluster_evidence_id_required: true,
  independent_related_identity_truth_verifier_required: true,
  opening_price_acceptance_after_window_close_required: true,
  failure_action: "hold_opening_price_acceptance",
  production_cap_values_hardcoded: false,
  source_only: true,
  runtime_enforcement_verified: false,
  related_identity_truth_verified: false,
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

export const VOID_WC_VOID_OPENING_CONCENTRATION_SYBIL_POLICY_CONTRACT =
  Object.freeze({
    ...CONTRACT_PAYLOAD,
    policy_contract_id: digest(CONTRACT_PAYLOAD),
  });
