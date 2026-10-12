import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_AUTHORITY_V1,
  VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1,
  evaluateExternalOpportunityProviderRiskV1,
  validateExternalOpportunityProviderRiskRegistryV1,
  type ExternalOpportunityProviderRiskRegistryV1,
  type ExternalOpportunityRiskObservationV1,
} from "../src/external_opportunity/provider_risk_registry_v1.js";

const root = process.cwd();
const fixturePath = path.join(
  root,
  "fixtures/external-opportunity/provider-risk-registry-v1.example.json",
);
const schemaPath = path.join(
  root,
  "schemas/external-opportunity-provider-risk-registry-v1.schema.json",
);
const sourcePath = path.join(
  root,
  "src/external_opportunity/provider_risk_registry_v1.ts",
);

const registry = JSON.parse(
  fs.readFileSync(fixturePath, "utf8"),
) as ExternalOpportunityProviderRiskRegistryV1;
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8")) as {
  $id?: string;
  properties?: Record<string, unknown>;
};
const source = fs.readFileSync(sourcePath, "utf8");

const validation = validateExternalOpportunityProviderRiskRegistryV1(registry);
assert.deepEqual(validation, { ok: true, errors: [] });

assert.equal(
  registry.marker,
  VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1,
);
assert.equal(registry.phase, "paper_only");
assert.equal(registry.live_execution_enabled, false);
assert.deepEqual(
  registry.authority,
  VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_AUTHORITY_V1,
);
assert.match(
  String(schema.$id || ""),
  /external-opportunity-provider-risk-registry-v1\.schema\.json$/,
);
assert.ok(schema.properties);

const ethereumUsdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const baseUsdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const positiveObservation: ExternalOpportunityRiskObservationV1 = {
  provider_id: "across",
  phase: "paper_only",
  api_origin: "https://app.across.to/api",
  source_chain_id: 8453,
  destination_chain_id: 1,
  input_token_address: baseUsdc,
  output_token_address: ethereumUsdc,
  quote_age_ms: 1_000,
  notional_usd: 1,
  gross_revenue_usd: 0.3,
  protocol_fee_usd: 0.005,
  gas_cost_usd: 0.03,
  slippage_bps: 10,
  daily_notional_before_usd: 0,
  daily_loss_before_usd: 0,
  simulation_status: "not_run",
  operator_approved: false,
};

const positive = evaluateExternalOpportunityProviderRiskV1(
  registry,
  positiveObservation,
);
assert.equal(positive.status, "recordable_paper_positive");
assert.equal(positive.quote_record_authorized, true);
assert.equal(positive.live_execution_authorized, false);
assert.equal(positive.wallet_or_key_access_authorized, false);
assert.equal(positive.transaction_construction_authorized, false);
assert.equal(positive.transaction_submission_authorized, false);
assert.equal(positive.metrics.net_profit_usd, 0.264);
assert.equal(positive.metrics.net_profit_margin_bps, 2640);
assert.equal(positive.metrics.protocol_fee_bps, 50);
assert.ok(
  positive.metrics.protocol_fee_bps <=
    registry.providers[0].policy.max_protocol_fee_bps,
);
assert.deepEqual(positive.reasons, []);

const ieeeBoundaryRawNet = 0.3 - (0.005 + 0.195);
assert.equal(ieeeBoundaryRawNet < 0.1, true);
const exactThreshold = evaluateExternalOpportunityProviderRiskV1(registry, {
  ...positiveObservation,
  gross_revenue_usd: 0.3,
  protocol_fee_usd: 0.005,
  gas_cost_usd: 0.195,
  slippage_bps: 0,
});
assert.equal(exactThreshold.metrics.net_profit_usd, 0.1);
assert.equal(exactThreshold.status, "recordable_paper_positive");
assert.deepEqual(exactThreshold.reasons, []);

const justBelowThreshold = evaluateExternalOpportunityProviderRiskV1(registry, {
  ...positiveObservation,
  gross_revenue_usd: 0.299999999999,
  protocol_fee_usd: 0.005,
  gas_cost_usd: 0.195,
  slippage_bps: 0,
});
assert.equal(justBelowThreshold.metrics.net_profit_usd, 0.099999999999);
assert.equal(justBelowThreshold.status, "recordable_paper_negative");
assert.ok(justBelowThreshold.reasons.includes("minimum_net_profit_not_met"));

const derivedOverflowRegistry: ExternalOpportunityProviderRiskRegistryV1 = {
  ...registry,
  providers: registry.providers.map((provider, index) =>
    index === 0
      ? {
          ...provider,
          policy: {
            ...provider.policy,
            max_daily_notional_usd: Number.MAX_VALUE,
            min_net_profit_usd: 0,
            min_net_profit_margin_bps: 0,
          },
        }
      : provider,
  ),
};
assert.deepEqual(
  validateExternalOpportunityProviderRiskRegistryV1(derivedOverflowRegistry),
  { ok: true, errors: [] },
);

const rawProtocolFeeBpsOverflow = (1 / Number.MIN_VALUE) * 10_000;
assert.equal(Number.isFinite(rawProtocolFeeBpsOverflow), false);
const derivedOverflow = evaluateExternalOpportunityProviderRiskV1(
  derivedOverflowRegistry,
  {
    ...positiveObservation,
    notional_usd: Number.MIN_VALUE,
    gross_revenue_usd: 1,
    protocol_fee_usd: 1,
    gas_cost_usd: 0,
    slippage_bps: 0,
  },
);
assert.equal(derivedOverflow.status, "held");
assert.equal(derivedOverflow.quote_record_authorized, false);
assert.deepEqual(derivedOverflow.reasons, ["derived_metric_non_finite"]);
assert.equal(
  Object.values(derivedOverflow.metrics).every((value) => value === 0),
  true,
);

const finiteProjectedDailyNotional = Number.MAX_VALUE / 2 + 1;
assert.equal(Number.isFinite(finiteProjectedDailyNotional), true);
const normalizedOverflow = evaluateExternalOpportunityProviderRiskV1(
  derivedOverflowRegistry,
  {
    ...positiveObservation,
    notional_usd: 1,
    gross_revenue_usd: 1,
    protocol_fee_usd: 0,
    gas_cost_usd: 0,
    slippage_bps: 0,
    daily_notional_before_usd: Number.MAX_VALUE / 2,
  },
);
assert.equal(normalizedOverflow.status, "held");
assert.equal(normalizedOverflow.quote_record_authorized, false);
assert.deepEqual(normalizedOverflow.reasons, ["derived_metric_non_finite"]);
assert.equal(
  Object.values(normalizedOverflow.metrics).every((value) => value === 0),
  true,
);

const negative = evaluateExternalOpportunityProviderRiskV1(registry, {
  ...positiveObservation,
  gross_revenue_usd: 0.01,
  gas_cost_usd: 0.2,
  slippage_bps: 25,
});
assert.equal(negative.status, "recordable_paper_negative");
assert.equal(negative.quote_record_authorized, true);
assert.equal(negative.live_execution_authorized, false);
assert.ok(negative.reasons.includes("minimum_net_profit_not_met"));
assert.ok(negative.reasons.includes("minimum_net_profit_margin_not_met"));
assert.ok(negative.reasons.includes("per_opportunity_loss_limit_exceeded"));
assert.ok(negative.reasons.includes("daily_loss_limit_exceeded"));

const stale = evaluateExternalOpportunityProviderRiskV1(registry, {
  ...positiveObservation,
  quote_age_ms: 60_001,
});
assert.equal(stale.status, "held");
assert.equal(stale.quote_record_authorized, false);
assert.deepEqual(stale.reasons, ["quote_too_old"]);

const unknownProvider = evaluateExternalOpportunityProviderRiskV1(registry, {
  ...positiveObservation,
  provider_id: "unknown",
});
assert.equal(unknownProvider.status, "held");
assert.deepEqual(unknownProvider.reasons, ["provider_not_registered"]);

const wrongOrigin = evaluateExternalOpportunityProviderRiskV1(registry, {
  ...positiveObservation,
  api_origin: "https://example.invalid/api",
});
assert.equal(wrongOrigin.status, "held");
assert.deepEqual(wrongOrigin.reasons, ["api_origin_not_allowed"]);

const wrongToken = evaluateExternalOpportunityProviderRiskV1(registry, {
  ...positiveObservation,
  input_token_address: "0x1111111111111111111111111111111111111111",
});
assert.equal(wrongToken.status, "held");
assert.deepEqual(wrongToken.reasons, ["input_token_not_allowed"]);

const overLimit = evaluateExternalOpportunityProviderRiskV1(registry, {
  ...positiveObservation,
  notional_usd: 6,
  gross_revenue_usd: 2,
});
assert.equal(overLimit.status, "recordable_paper_negative");
assert.ok(overLimit.reasons.includes("notional_limit_exceeded"));

const liveCandidate = evaluateExternalOpportunityProviderRiskV1(registry, {
  ...positiveObservation,
  phase: "live_candidate",
  simulation_status: "passed",
  operator_approved: true,
});
assert.equal(liveCandidate.status, "live_candidate_blocked");
assert.equal(liveCandidate.quote_record_authorized, false);
assert.equal(liveCandidate.live_execution_authorized, false);
assert.ok(liveCandidate.reasons.includes("live_execution_disabled_by_registry"));
assert.ok(liveCandidate.reasons.includes("execution_contract_not_allowed"));

for (const forbidden of [
  /\bfetch\s*\(/,
  /\baxios\b/,
  /\bsendTransaction\s*\(/,
  /\beth_sendRawTransaction\b/,
  /\bprivateKey\b/,
  /\bchild_process\b/,
  /\bsystemctl\b/,
  /\bexecSync\s*\(/,
  /\bspawnSync\s*\(/,
]) {
  assert.equal(
    forbidden.test(source),
    false,
    `forbidden runtime surface matched: ${String(forbidden)}`,
  );
}

console.log("VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1_PROOF");
console.log(`provider_count=${registry.providers.length}`);
console.log(`registry_validation_exact=${validation.ok}`);
console.log(`paper_positive_net_profit_usd=${positive.metrics.net_profit_usd}`);
console.log(`paper_threshold_raw_ieee_net_profit_usd=${ieeeBoundaryRawNet}`);
console.log(`paper_threshold_metric_net_profit_usd=${exactThreshold.metrics.net_profit_usd}`);
console.log(`paper_threshold_positive=${exactThreshold.status === "recordable_paper_positive"}`);
console.log(`paper_just_below_threshold_negative=${justBelowThreshold.status === "recordable_paper_negative"}`);
console.log(`derived_metric_raw_overflow_held=${derivedOverflow.status === "held"}`);
console.log(`derived_metric_normalization_overflow_held=${normalizedOverflow.status === "held"}`);
console.log(`paper_negative_reason_count=${negative.reasons.length}`);
console.log(`stale_quote_held=${stale.status === "held"}`);
console.log(
  `unknown_provider_held=${unknownProvider.status === "held"}`,
);
console.log(`wrong_origin_held=${wrongOrigin.status === "held"}`);
console.log(`wrong_token_held=${wrongToken.status === "held"}`);
console.log(
  `live_candidate_execution_authorized=${liveCandidate.live_execution_authorized}`,
);
console.log("wallet_or_key_access_authorized=false");
console.log("transaction_construction_authorized=false");
console.log("transaction_submission_authorized=false");
console.log("network_request_performed=false");
console.log(
  "VOID_EXTERNAL_OPPORTUNITY_PROVIDER_RISK_REGISTRY_V1_PROOF_EXACT_GREEN",
);
