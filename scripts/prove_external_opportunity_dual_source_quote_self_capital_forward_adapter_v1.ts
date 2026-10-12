import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_INPUT_SCHEMA_V1,
  composeAcrossRoundTripPaperV1,
} from "../src/external_opportunity/across_round_trip_paper_composition_v1.js";
import {
  VOID_ACROSS_TOKEN_VALUATION_INGESTION_RESULT_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1,
  hashAcrossTokenValuationDocumentV1,
} from "../src/external_opportunity/across_swap_api_token_valuation_ingestion_v1.js";
import {
  hashDualSourceQuoteReducerDocumentV1,
  reduceDualSourceQuoteConservativelyV1,
} from "../src/external_opportunity/dual_source_quote_conservative_reducer_v1.js";
import { createDualSourceQuoteVerificationEnvelopeV1 } from "../src/external_opportunity/dual_source_quote_conservative_reducer_verification_envelope_v1.js";
import { createDualSourceQuoteRelativeFreshnessGateReceiptV1 } from "../src/external_opportunity/dual_source_quote_relative_freshness_gate_v1.js";
import {
  VOID_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_RECEIPT_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_V1,
  adaptDualSourceQuoteForSelfCapitalForwardV1,
  verifyDualSourceQuoteSelfCapitalForwardAdapterReceiptV1,
} from "../src/external_opportunity/dual_source_quote_self_capital_forward_adapter_v1.js";

type JsonObject = Record<string, unknown>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectHold(label: string, action: () => unknown): void {
  assert.throws(action, /^Error: HOLD: /, label);
}

const reducerFixture = JSON.parse(
  await readFile(
    new URL(
      "../fixtures/external-opportunity/dual-source-quote-conservative-reducer-v1.example.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as JsonObject;

const reducerReceipt = reduceDualSourceQuoteConservativelyV1(reducerFixture);
const verificationEnvelope = createDualSourceQuoteVerificationEnvelopeV1(
  reducerFixture,
  reducerReceipt,
);
const maximumQuoteAgeSeconds = 15;
const freshnessReceipt = createDualSourceQuoteRelativeFreshnessGateReceiptV1(
  reducerFixture,
  reducerReceipt,
  verificationEnvelope,
  maximumQuoteAgeSeconds,
);
const adapterReceipt = adaptDualSourceQuoteForSelfCapitalForwardV1(
  reducerFixture,
  reducerReceipt,
  verificationEnvelope,
  maximumQuoteAgeSeconds,
  freshnessReceipt,
);
const verifiedAdapter =
  verifyDualSourceQuoteSelfCapitalForwardAdapterReceiptV1(
    reducerFixture,
    reducerReceipt,
    verificationEnvelope,
    maximumQuoteAgeSeconds,
    freshnessReceipt,
    adapterReceipt,
  );

assert.equal(
  verifiedAdapter.schema,
  VOID_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_RECEIPT_SCHEMA_V1,
);
assert.equal(
  verifiedAdapter.marker,
  VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_V1,
);
assert.equal(verifiedAdapter.relative_freshness_verified, true);
assert.equal(verifiedAdapter.evaluation_clock_authenticated, false);
assert.equal(verifiedAdapter.wall_clock_freshness_verified, false);
assert.equal(verifiedAdapter.source_identity_authenticated, false);
assert.equal(verifiedAdapter.expected_amount_collapsed_to_guaranteed, true);
assert.equal(verifiedAdapter.expected_value_collapsed_to_guaranteed, true);
assert.equal(verifiedAdapter.self_capital_v1_forward_compatible, true);
assert.equal(
  verifiedAdapter.adapted_quote.expected_output_amount,
  "30075000000000000",
);
assert.equal(
  verifiedAdapter.adapted_quote.minimum_output_amount,
  "30075000000000000",
);
assert.equal(
  verifiedAdapter.adapted_quote.expected_output_value_usd,
  "100.250000",
);
assert.equal(
  verifiedAdapter.adapted_quote.minimum_output_value_usd,
  "100.250000",
);
assert.equal(verifiedAdapter.adapted_quote.gas_usd, "0.350000");
assert.match(verifiedAdapter.adapted_quote.quote_id, /^voiddsqsca1_[0-9a-f]{64}$/);
assert.equal(verifiedAdapter.execution_authorized, false);

const startingAsset = verifiedAdapter.adapted_quote.input_asset;
const intermediateAsset = verifiedAdapter.adapted_quote.output_asset;
const valuationCore = {
  provider: "across",
  endpoint: "https://app.across.to/api/swap/tokens",
  observed_at: "2026-08-04T04:00:00.000Z",
  selector: {
    chain_id: startingAsset.chain_id,
    address: startingAsset.address,
    amount: verifiedAdapter.adapted_quote.input_amount,
  },
  selected_token: startingAsset,
  price_usd_floor: "1.000000",
  position_value_usd_floor: "100.000000",
  price_source_precision_digits: 6,
  sanitized_token_sha256: "a".repeat(64),
};
const valuation = {
  schema: VOID_ACROSS_TOKEN_VALUATION_INGESTION_RESULT_SCHEMA_V1,
  marker: VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1,
  provider: valuationCore.provider,
  endpoint: valuationCore.endpoint,
  method: "GET",
  observed_at: valuationCore.observed_at,
  evaluated_at: "2026-08-04T04:00:00.250Z",
  response_bytes: 512,
  selector: valuationCore.selector,
  selected_token: valuationCore.selected_token,
  price_usd_floor: valuationCore.price_usd_floor,
  position_value_usd_floor: valuationCore.position_value_usd_floor,
  price_source_precision_digits: valuationCore.price_source_precision_digits,
  sanitized_token_sha256: valuationCore.sanitized_token_sha256,
  valuation_sha256: hashAcrossTokenValuationDocumentV1(valuationCore),
  credential_retention: false,
  raw_response_retention: false,
  transaction_payload_retention: false,
  network_mutation_performed: false,
  wallet_or_key_access_performed: false,
  transaction_construction_performed: false,
  transaction_signing_performed: false,
  transaction_submission_performed: false,
  fund_movement_performed: false,
  live_execution_authorized: false,
  execution_authorized: false,
};
const returnQuote = {
  provider: "synthetic-return-fixture",
  quote_id: "adapter-return-quote-fixture-v1",
  observed_at: "2026-08-04T04:00:02.000Z",
  quote_expiry_timestamp: verifiedAdapter.adapted_quote.quote_expiry_timestamp,
  input_asset: intermediateAsset,
  output_asset: startingAsset,
  input_amount: verifiedAdapter.adapted_quote.minimum_output_amount,
  expected_output_amount: "100500000",
  minimum_output_amount: "100300000",
  expected_fill_time_seconds: 30,
  quoted_output_includes_provider_fees: true,
  quoted_output_includes_price_impact: true,
  app_fee_usd: "0.000000",
  gas_usd: "0.050000",
};
const compositionInput = {
  schema: VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_INPUT_SCHEMA_V1,
  strategy_id: "dual-source-adapted-round-trip-paper-v1",
  evaluated_at: "2026-08-04T04:00:10.000Z",
  valuation,
  forward_quote: verifiedAdapter.adapted_quote,
  return_quote: returnQuote,
  cost_policy: {
    capital_lock_seconds: 3600,
    annual_capital_cost_bps: 500,
    risk_reserve_bps: 5,
    failure_reserve_usd: "0.020000",
    safety_buffer_usd: "0.020000",
    maximum_quote_skew_seconds: 5,
  },
};

const unadaptedComposition = clone(compositionInput);
unadaptedComposition.forward_quote = reducerReceipt.reduced_quote;
expectHold("unadapted reducer quote violates guaranteed-forward V1", () =>
  composeAcrossRoundTripPaperV1(unadaptedComposition),
);

const compositionReceipt = composeAcrossRoundTripPaperV1(compositionInput);
assert.equal(compositionReceipt.paper_receipt.round_trip_inventory_neutral, true);
assert.equal(compositionReceipt.paper_receipt.starting_asset_restored, true);
assert.equal(
  compositionReceipt.paper_receipt.round_trip_intermediate_amount,
  verifiedAdapter.adapted_quote.minimum_output_amount,
);
assert.equal(compositionReceipt.paper_receipt.status, "paper_marginal");
assert.equal(compositionReceipt.paper_receipt.expected_ending_value_usd, "100.500000");
assert.equal(compositionReceipt.paper_receipt.minimum_ending_value_usd, "100.300000");
assert.equal(compositionReceipt.composition_network_access_performed, false);
assert.equal(compositionReceipt.composition_credential_access_performed, false);
assert.equal(compositionReceipt.transaction_submission_performed, false);
assert.equal(compositionReceipt.fund_movement_performed, false);
assert.equal(compositionReceipt.execution_authorized, false);

const forgedAdapter = clone(adapterReceipt) as JsonObject;
const forgedQuote = forgedAdapter.adapted_quote as JsonObject;
forgedQuote.expected_output_amount = "30135000000000000";
const unsignedForgery = { ...forgedAdapter };
delete unsignedForgery.adapter_sha256;
forgedAdapter.adapter_sha256 =
  hashDualSourceQuoteReducerDocumentV1(unsignedForgery);
expectHold("self-consistent adapter forgery", () =>
  verifyDualSourceQuoteSelfCapitalForwardAdapterReceiptV1(
    reducerFixture,
    reducerReceipt,
    verificationEnvelope,
    maximumQuoteAgeSeconds,
    freshnessReceipt,
    forgedAdapter,
  ),
);

const wrongFreshness = clone(freshnessReceipt) as JsonObject;
wrongFreshness.freshness_sha256 = "0".repeat(64);
expectHold("wrong freshness evidence", () =>
  adaptDualSourceQuoteForSelfCapitalForwardV1(
    reducerFixture,
    reducerReceipt,
    verificationEnvelope,
    maximumQuoteAgeSeconds,
    wrongFreshness,
  ),
);

console.log(`adapter_marker=${verifiedAdapter.marker}`);
console.log(`adapter_sha256=${verifiedAdapter.adapter_sha256}`);
console.log(`adapted_quote_id=${verifiedAdapter.adapted_quote.quote_id}`);
console.log(
  `adapted_guaranteed_output_amount=${verifiedAdapter.adapted_quote.minimum_output_amount}`,
);
console.log(
  `adapted_guaranteed_output_value_usd=${verifiedAdapter.adapted_quote.minimum_output_value_usd}`,
);
console.log("unadapted_reducer_quote_rejected_by_self_capital_v1=true");
console.log("adapted_reducer_quote_composed_by_canonical_across_composer=true");
console.log(`paper_status=${compositionReceipt.paper_receipt.status}`);
console.log("relative_freshness_verified=true");
console.log("evaluation_clock_authenticated=false");
console.log("wall_clock_freshness_verified=false");
console.log("source_identity_authenticated=false");
console.log("network_access_performed=false");
console.log("credential_access_performed=false");
console.log("transaction_submission_performed=false");
console.log("fund_movement_performed=false");
console.log("execution_authorized=false");
console.log(
  "VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_V1_PROOF_GREEN",
);
