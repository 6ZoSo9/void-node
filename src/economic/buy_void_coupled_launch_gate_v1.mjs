import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1,
  classifyVoidWcVoidCoupledLaunchReadinessV1,
} from "../../tools/void-wc-void-coupled-launch-readiness-v1.mjs";

export const VOID_BUY_COUPLED_LAUNCH_ID_V1 =
  "sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRODUCTION = "ops/mainnet0/wc-void-production-candidate-v1.json";
const COUPLED = "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json";
const SUCCESSOR = "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json";

function read(relativePath) {
  const value = JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf8"),
  );
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("buy_launch_source_invalid");
  }
  return value;
}

function productionRuntimeEvidenceReady(production) {
  const compiled = production?.market_vault_compiled_identity_acceptance;
  const settlement = production?.wc_settlement_adapter_review;
  return (
    compiled?.deployment_attested === true &&
    compiled.final_role_bindings_attested === true &&
    compiled.deployed_runtime_code_observed === true &&
    compiled.inventory_funding_verified === true &&
    compiled.inventory_lock_verified === true &&
    settlement?.live_ledger_persistence_verified === true &&
    settlement.quote_reserve_custody_verified === true
  );
}

function coupledRuntimeEvidenceReady(coupled) {
  const nonproduction =
    coupled?.opening_nonproduction_wc_exclusion_policy;
  const provenance =
    coupled?.opening_participant_provenance_eligibility_policy;
  const concentration =
    coupled?.opening_concentration_sybil_policy_contract;
  const depth =
    coupled?.opening_minimum_real_wc_depth_policy_contract;
  const reverse =
    coupled?.reverse_void_to_wc_settlement_policy;
  const intent =
    coupled?.economic_intent_ttl_caps_policy_contract;
  const sponsored =
    coupled?.system_sponsored_execution_anti_grief_policy_contract;
  const reconciliation =
    coupled?.shared_post_discovery_reconciliation;

  return (
    nonproduction?.runtime_or_launch_evidence === true &&
    provenance?.runtime_or_launch_evidence === true &&
    concentration?.production_cap_values_hardcoded === true &&
    concentration.runtime_enforcement_verified === true &&
    concentration.related_identity_truth_verified === true &&
    depth?.production_minimum_real_wc_value_hardcoded === true &&
    depth.runtime_enforcement_verified === true &&
    reverse?.pricing_math_verified === true &&
    reverse.quote_publisher_authenticity_verified === true &&
    reverse.receipt_provenance_verified === true &&
    reverse.market_vault_custody_verified === true &&
    reverse.runtime_or_launch_evidence === true &&
    intent?.production_ttl_value_hardcoded === true &&
    intent.production_cap_values_hardcoded === true &&
    intent.runtime_enforcement_verified === true &&
    sponsored?.production_budget_values_hardcoded === true &&
    sponsored.runtime_enforcement_verified === true &&
    reconciliation?.runtime_or_launch_evidence === true &&
    reconciliation.quote_reserve_custody_verified === true &&
    reconciliation.void_reserve_custody_verified === true
  );
}

export function classifyBuyLaunchGateV1({ production, coupled, successor }) {
  let decision = null;
  try {
    decision = classifyVoidWcVoidCoupledLaunchReadinessV1({
      production_candidate: production,
      coupled_candidate: coupled,
      successor_migration_candidate: successor,
    });
  } catch {
    decision = null;
  }

  const ready =
    decision?.ok === true &&
    decision.status === "SOURCE_READY" &&
    decision.marker === VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1 &&
    decision.activation_authority === false &&
    decision.funding_authority === false &&
    decision.market_activation_authorized === false &&
    decision.public_presale_activation_authorized === false &&
    decision.funds_movement_authorized === false &&
    productionRuntimeEvidenceReady(production) &&
    coupledRuntimeEvidenceReady(coupled) &&
    coupled?.shared_post_discovery_reconciliation?.coupled_launch_id ===
      VOID_BUY_COUPLED_LAUNCH_ID_V1;

  return Object.freeze({
    ready,
    id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
    reason: ready ? null : "canonical_coupled_launch_source_not_ready",
  });
}

export function readBuyLaunchGateV1() {
  try {
    return classifyBuyLaunchGateV1({
      production: read(PRODUCTION),
      coupled: read(COUPLED),
      successor: read(SUCCESSOR),
    });
  } catch {
    return Object.freeze({
      ready: false,
      id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
      reason: "canonical_coupled_launch_source_unavailable",
    });
  }
}
