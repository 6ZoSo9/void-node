import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_OBSERVER_V1,
  VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_RECEIPT_SCHEMA_V1,
  canonicalSelfCapitalRoundTripJsonV1,
  hashSelfCapitalRoundTripDocumentV1,
  observeSelfCapitalRoundTripPaperV1,
  parseSelfCapitalRoundTripPaperInputV1,
} from "../src/external_opportunity/self_capital_round_trip_paper_observer_v1.js";

type JsonObject = Record<string, unknown>;

const fixturePath = new URL(
  "../fixtures/external-opportunity/self-capital-round-trip-paper-observer-v1.example.json",
  import.meta.url,
);
const schemaPath = new URL(
  "../schemas/external-opportunity-self-capital-round-trip-paper-observer-v1.schema.json",
  import.meta.url,
);
const documentationPath = new URL(
  "../docs/architecture/external-opportunity-self-capital-round-trip-paper-observer-v1.md",
  import.meta.url,
);
const workflowPath = new URL(
  "../.github/workflows/external-opportunity-self-capital-round-trip-paper-observer-v1.yml",
  import.meta.url,
);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectHold(value: unknown, pattern: RegExp): void {
  assert.throws(() => observeSelfCapitalRoundTripPaperV1(value), pattern);
}

const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as JsonObject;
const schema = JSON.parse(await readFile(schemaPath, "utf8")) as JsonObject;
const documentation = await readFile(documentationPath, "utf8");
const workflow = await readFile(workflowPath, "utf8");

assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(schema.type, "object");
assert.equal(schema.additionalProperties, false);
assert.equal(
  ((schema.properties as JsonObject).schema as JsonObject).const,
  "void-self-capital-round-trip-paper-input-v1",
);
assert.equal(
  ((((schema.$defs as JsonObject).quoteLeg as JsonObject).properties as JsonObject)
    .app_fee_usd as JsonObject).const,
  "0.000000",
);
assert.match(documentation, /App fees must be exactly zero/);
assert.match(documentation, /amount-derived ending USD valuation/);
assert.match(documentation, /fund movement/);
assert.match(
  workflow,
  /node --import tsx scripts\/prove_external_opportunity_self_capital_round_trip_paper_observer_v1\.ts/,
);
assert.match(workflow, /npm run build/);

const parsed = parseSelfCapitalRoundTripPaperInputV1(fixture);
const receipt = observeSelfCapitalRoundTripPaperV1(fixture);
assert.equal(receipt.schema, VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_RECEIPT_SCHEMA_V1);
assert.equal(receipt.marker, VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_OBSERVER_V1);
assert.equal(receipt.phase, "paper_only");
assert.equal(receipt.strategy_class, "self_capital_inventory_neutral_round_trip");
assert.equal(receipt.status, "paper_positive");
assert.equal(receipt.quote_skew_seconds, 3);
assert.equal(receipt.quotes_expired, false);
assert.equal(receipt.starting_value_usd, "100.000000");
assert.equal(receipt.expected_ending_value_usd, "100.400000");
assert.equal(receipt.minimum_ending_value_usd, "100.200000");
assert.equal(receipt.ending_values_amount_derived, true);
assert.equal(receipt.expected_gross_pnl_usd, "0.400000");
assert.equal(receipt.minimum_gross_pnl_usd, "0.200000");
assert.deepEqual(receipt.paper_costs, {
  forward_gas_usd: "0.010000",
  return_gas_usd: "0.010000",
  capital_lock_cost_usd: "0.000914",
  risk_reserve_usd: "0.050000",
  failure_reserve_usd: "0.020000",
  safety_buffer_usd: "0.050000",
  total_external_cost_usd: "0.140914",
});
assert.equal(receipt.expected_net_pnl_usd, "0.259086");
assert.equal(receipt.minimum_net_pnl_usd, "0.059086");
assert.equal(receipt.expected_net_pnl_bps_of_capital, "25");
assert.equal(receipt.minimum_net_pnl_bps_of_capital, "5");
assert.equal(receipt.internal_app_fee_revenue_usd, "0.000000");
assert.equal(receipt.internal_app_fee_counted_as_profit, false);
assert.equal(receipt.round_trip_inventory_neutral, true);
assert.equal(receipt.starting_asset_restored, true);
assert.equal(receipt.provider_fees_included_in_quotes, true);
assert.equal(receipt.price_impact_included_in_quotes, true);
assert.equal(receipt.credential_access_performed, false);
assert.equal(receipt.raw_response_retention, false);
assert.equal(receipt.transaction_payload_retention, false);
assert.equal(receipt.network_access_performed, false);
assert.equal(receipt.network_mutation_performed, false);
assert.equal(receipt.wallet_or_key_access_performed, false);
assert.equal(receipt.transaction_construction_performed, false);
assert.equal(receipt.transaction_signing_performed, false);
assert.equal(receipt.transaction_submission_performed, false);
assert.equal(receipt.fund_movement_performed, false);
assert.equal(receipt.live_execution_authorized, false);
assert.equal(receipt.execution_authorized, false);
assert.match(receipt.opportunity_id, /^[0-9a-f]{64}$/);
assert.match(receipt.receipt_sha256, /^[0-9a-f]{64}$/);
assert.equal(receipt.opportunity_id, receipt.source_input_sha256);
assert.equal(receipt.source_input_sha256, hashSelfCapitalRoundTripDocumentV1(parsed));
assert.equal(
  canonicalSelfCapitalRoundTripJsonV1(fixture),
  canonicalSelfCapitalRoundTripJsonV1(clone(fixture)),
);
assert.deepEqual(receipt, observeSelfCapitalRoundTripPaperV1(clone(fixture)));

const marginal = clone(fixture);
(marginal.return_quote as JsonObject).minimum_output_amount = "100100000";
(marginal.return_quote as JsonObject).minimum_output_value_usd = "100.100000";
const marginalReceipt = observeSelfCapitalRoundTripPaperV1(marginal);
assert.equal(marginalReceipt.status, "paper_marginal");
assert.equal(marginalReceipt.expected_net_pnl_usd, "0.259086");
assert.equal(marginalReceipt.minimum_net_pnl_usd, "-0.040914");
assert.equal(marginalReceipt.expected_net_pnl_bps_of_capital, "25");
assert.equal(marginalReceipt.minimum_net_pnl_bps_of_capital, "-5");

const negative = clone(fixture);
(negative.return_quote as JsonObject).expected_output_amount = "100100000";
(negative.return_quote as JsonObject).minimum_output_amount = "100000000";
(negative.return_quote as JsonObject).expected_output_value_usd = "100.100000";
(negative.return_quote as JsonObject).minimum_output_value_usd = "100.000000";
const negativeReceipt = observeSelfCapitalRoundTripPaperV1(negative);
assert.equal(negativeReceipt.status, "paper_negative");
assert.equal(negativeReceipt.expected_net_pnl_usd, "-0.040914");
assert.equal(negativeReceipt.minimum_net_pnl_usd, "-0.140914");
assert.equal(negativeReceipt.expected_net_pnl_bps_of_capital, "-5");
assert.equal(negativeReceipt.minimum_net_pnl_bps_of_capital, "-15");

const inflatedExpectedValue = clone(fixture);
(inflatedExpectedValue.return_quote as JsonObject).expected_output_amount = "99900000";
(inflatedExpectedValue.return_quote as JsonObject).minimum_output_amount = "99800000";
(inflatedExpectedValue.return_quote as JsonObject).expected_output_value_usd = "101.000000";
(inflatedExpectedValue.return_quote as JsonObject).minimum_output_value_usd = "100.500000";
expectHold(inflatedExpectedValue, /expected_output_value_usd must equal amount-derived ending value/);

const understatedMinimumValue = clone(fixture);
(understatedMinimumValue.return_quote as JsonObject).minimum_output_value_usd = "100.199999";
expectHold(understatedMinimumValue, /minimum_output_value_usd must equal amount-derived ending value/);

const expired = clone(fixture);
(expired.forward_quote as JsonObject).quote_expiry_timestamp = 1_700_000_000;
assert.equal(observeSelfCapitalRoundTripPaperV1(expired).status, "expired");

const nonzeroAppFee = clone(fixture);
(nonzeroAppFee.forward_quote as JsonObject).app_fee_usd = "1.000000";
expectHold(nonzeroAppFee, /app_fee_usd must be exactly zero/);

const routeMismatch = clone(fixture);
(((routeMismatch.return_quote as JsonObject).output_asset as JsonObject).chain_id) = 1;
expectHold(routeMismatch, /return quote output asset must restore the starting asset/);

const intermediateMismatch = clone(fixture);
(((intermediateMismatch.return_quote as JsonObject).input_asset as JsonObject).address) =
  "0x0000000000000000000000000000000000000001";
expectHold(intermediateMismatch, /return quote input asset must equal the forward output asset/);

const inventoryMismatch = clone(fixture);
(inventoryMismatch.return_quote as JsonObject).input_amount = "100499999";
expectHold(inventoryMismatch, /return quote input amount must equal the guaranteed forward output amount/);

const nonGuaranteedForward = clone(fixture);
(nonGuaranteedForward.forward_quote as JsonObject).minimum_output_amount = "100400000";
expectHold(nonGuaranteedForward, /forward expected and minimum output amounts to match exactly/);

const quoteSkew = clone(fixture);
(quoteSkew.return_quote as JsonObject).observed_at = "2026-08-03T18:30:20.000Z";
quoteSkew.observed_at = "2026-08-03T18:30:20.000Z";
quoteSkew.evaluated_at = "2026-08-03T18:30:21.000Z";
expectHold(quoteSkew, /quote observation skew exceeds policy/);

const fractionalQuoteSkew = clone(fixture);
(fractionalQuoteSkew.cost_policy as JsonObject).maximum_quote_skew_seconds = 3;
(fractionalQuoteSkew.return_quote as JsonObject).observed_at =
  "2026-08-03T18:30:03.001Z";
fractionalQuoteSkew.observed_at = "2026-08-03T18:30:03.001Z";
fractionalQuoteSkew.evaluated_at = "2026-08-03T18:30:04.001Z";
expectHold(fractionalQuoteSkew, /quote observation skew exceeds policy/);

const shortCapitalLock = clone(fixture);
(shortCapitalLock.cost_policy as JsonObject).capital_lock_seconds = 1;
expectHold(shortCapitalLock, /capital_lock_seconds must cover both expected quote fill times/);

const capitalMismatch = clone(fixture);
(capitalMismatch.cost_policy as JsonObject).capital_at_risk_usd = "99.000000";
expectHold(capitalMismatch, /capital_at_risk_usd must equal starting_value_usd/);

const missingFeeInclusion = clone(fixture);
(missingFeeInclusion.forward_quote as JsonObject).quoted_output_includes_provider_fees = false;
expectHold(missingFeeInclusion, /must include provider fees in quoted output/);

const missingImpactInclusion = clone(fixture);
(missingImpactInclusion.return_quote as JsonObject).quoted_output_includes_price_impact = false;
expectHold(missingImpactInclusion, /must include price impact in quoted output/);

const unknownInputKey = clone(fixture);
unknownInputKey.wallet = "forbidden";
expectHold(unknownInputKey, /input keys differ/);

const unknownQuoteKey = clone(fixture);
(unknownQuoteKey.forward_quote as JsonObject).calldata = "0x1234";
expectHold(unknownQuoteKey, /forward_quote keys differ/);

console.log("positive_expected_net_pnl_usd=0.259086");
console.log("positive_minimum_net_pnl_usd=0.059086");
console.log("ending_values_amount_derived=true");
console.log("inconsistent_ending_values_rejected=true");
console.log("internal_app_fee_counted_as_profit=false");
console.log("round_trip_inventory_neutral=true");
console.log("wallet_or_key_access_performed=false");
console.log("transaction_construction_performed=false");
console.log("transaction_signing_performed=false");
console.log("transaction_submission_performed=false");
console.log("fund_movement_performed=false");
console.log("live_execution_authorized=false");
console.log("VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_OBSERVER_V1_PROOF_GREEN");
