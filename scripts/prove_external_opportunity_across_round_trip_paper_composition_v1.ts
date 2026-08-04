import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_INPUT_SCHEMA_V1,
  VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_RECEIPT_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_V1,
  composeAcrossRoundTripPaperV1,
  hashAcrossRoundTripPaperCompositionDocumentV1,
} from "../src/external_opportunity/across_round_trip_paper_composition_v1.js";
import { hashAcrossTokenValuationDocumentV1 } from "../src/external_opportunity/across_swap_api_token_valuation_ingestion_v1.js";

type JsonObject = Record<string, unknown>;

const fixturePath = new URL(
  "../fixtures/external-opportunity/across-round-trip-paper-composition-v1.example.json",
  import.meta.url,
);
const schemaPath = new URL(
  "../schemas/external-opportunity-across-round-trip-paper-composition-v1.schema.json",
  import.meta.url,
);
const documentationPath = new URL(
  "../docs/architecture/external-opportunity-across-round-trip-paper-composition-v1.md",
  import.meta.url,
);
const workflowPath = new URL(
  "../.github/workflows/external-opportunity-across-round-trip-paper-composition-v1.yml",
  import.meta.url,
);
const sourcePath = new URL(
  "../src/external_opportunity/across_round_trip_paper_composition_v1.ts",
  import.meta.url,
);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectHold(label: string, action: () => unknown): void {
  assert.throws(action, /^Error: HOLD: /, label);
}

const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as JsonObject;
const receipt = composeAcrossRoundTripPaperV1(fixture);

assert.equal(fixture.schema, VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_INPUT_SCHEMA_V1);
assert.equal(receipt.schema, VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_RECEIPT_SCHEMA_V1);
assert.equal(receipt.marker, VOID_EXTERNAL_OPPORTUNITY_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_V1);
assert.equal(receipt.phase, "paper_only");
assert.equal(receipt.valuation_provider, "across");
assert.equal(receipt.starting_value_source, "across_token_catalog_price_usd");
assert.equal(receipt.starting_value_conservative_floor, true);
assert.equal(receipt.return_values_amount_derived, true);
assert.equal(receipt.paper_receipt.starting_value_usd, "99.990312");
assert.equal(receipt.paper_receipt.expected_ending_value_usd, "100.490263");
assert.equal(receipt.paper_receipt.minimum_ending_value_usd, "100.290282");
assert.equal(receipt.paper_receipt.ending_values_amount_derived, true);
assert.equal(receipt.paper_receipt.status, "paper_positive");
assert.equal(receipt.paper_receipt.internal_app_fee_counted_as_profit, false);
assert.equal(receipt.paper_receipt.round_trip_inventory_neutral, true);
assert.equal(receipt.paper_receipt.starting_asset_restored, true);
assert.equal(receipt.composition_network_access_performed, false);
assert.equal(receipt.composition_credential_access_performed, false);
assert.equal(receipt.wallet_or_key_access_performed, false);
assert.equal(receipt.transaction_construction_performed, false);
assert.equal(receipt.transaction_signing_performed, false);
assert.equal(receipt.transaction_submission_performed, false);
assert.equal(receipt.fund_movement_performed, false);
assert.equal(receipt.live_execution_authorized, false);
assert.equal(receipt.execution_authorized, false);
assert.match(receipt.source_input_sha256, /^[0-9a-f]{64}$/);
assert.match(receipt.receipt_sha256, /^[0-9a-f]{64}$/);

const valuation = fixture.valuation as JsonObject;
const valuationCore = {
  provider: valuation.provider,
  endpoint: valuation.endpoint,
  observed_at: valuation.observed_at,
  selector: valuation.selector,
  selected_token: valuation.selected_token,
  price_usd_floor: valuation.price_usd_floor,
  position_value_usd_floor: valuation.position_value_usd_floor,
  price_source_precision_digits: valuation.price_source_precision_digits,
  sanitized_token_sha256: valuation.sanitized_token_sha256,
};
assert.equal(
  hashAcrossTokenValuationDocumentV1(valuationCore),
  valuation.valuation_sha256,
  "fixture valuation digest",
);
const { receipt_sha256: ignoredReceiptSha, ...receiptCore } = receipt;
void ignoredReceiptSha;
assert.equal(
  receipt.receipt_sha256,
  hashAcrossRoundTripPaperCompositionDocumentV1(receiptCore),
  "composition receipt digest",
);

const alteredValuationDigest = clone(fixture);
(alteredValuationDigest.valuation as JsonObject).valuation_sha256 = "b".repeat(64);
expectHold("altered valuation digest", () => composeAcrossRoundTripPaperV1(alteredValuationDigest));

const widenedValuationAuthority = clone(fixture);
(widenedValuationAuthority.valuation as JsonObject).execution_authorized = true;
expectHold("widened valuation authority", () =>
  composeAcrossRoundTripPaperV1(widenedValuationAuthority),
);

const mismatchedStartingAsset = clone(fixture);
(((mismatchedStartingAsset.forward_quote as JsonObject).input_asset as JsonObject).address) =
  "0x0000000000000000000000000000000000000001";
expectHold("mismatched valuation and quote asset", () =>
  composeAcrossRoundTripPaperV1(mismatchedStartingAsset),
);

const mismatchedStartingAmount = clone(fixture);
(mismatchedStartingAmount.forward_quote as JsonObject).input_amount = "99999999";
expectHold("mismatched valuation and quote amount", () =>
  composeAcrossRoundTripPaperV1(mismatchedStartingAmount),
);

const injectedReturnValue = clone(fixture);
(injectedReturnValue.return_quote as JsonObject).expected_output_value_usd = "999999.000000";
expectHold("caller supplied return valuation", () =>
  composeAcrossRoundTripPaperV1(injectedReturnValue),
);

const injectedCapital = clone(fixture);
(injectedCapital.cost_policy as JsonObject).capital_at_risk_usd = "1.000000";
expectHold("caller supplied capital value", () => composeAcrossRoundTripPaperV1(injectedCapital));

const evaluationBeforeEvidence = clone(fixture);
evaluationBeforeEvidence.evaluated_at = "2026-08-04T02:45:00.100Z";
expectHold("evaluation before evidence", () =>
  composeAcrossRoundTripPaperV1(evaluationBeforeEvidence),
);

const staleQuote = clone(fixture);
staleQuote.evaluated_at = "2026-08-04T03:00:00.000Z";
const staleReceipt = composeAcrossRoundTripPaperV1(staleQuote);
assert.equal(staleReceipt.paper_receipt.status, "expired");
assert.equal(staleReceipt.paper_receipt.quotes_expired, true);
assert.equal(staleReceipt.execution_authorized, false);

const schema = JSON.parse(await readFile(schemaPath, "utf8")) as JsonObject;
assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(
  schema.$id,
  "https://voidchain.io/schemas/external-opportunity-across-round-trip-paper-composition-v1.schema.json",
);
assert.equal(schema.additionalProperties, false);

const documentation = await readFile(documentationPath, "utf8");
const workflow = await readFile(workflowPath, "utf8");
const source = await readFile(sourcePath, "utf8");
assert.match(documentation, /paper-only/i);
assert.match(documentation, /does not perform a live\s+Across request/i);
assert.match(documentation, /does not authorize execution/i);
assert.match(workflow, /permissions:\n  contents: read/);
assert.match(
  workflow,
  /node --import tsx scripts\/prove_external_opportunity_across_round_trip_paper_composition_v1\.ts/,
);
assert.doesNotMatch(source, /https\.request|fetch\s*\(/);
assert.doesNotMatch(source, /private[_ -]?key|seed phrase/i);

console.log(`marker=${receipt.marker}`);
console.log(`valuation_sha256=${receipt.valuation_sha256}`);
console.log(`starting_value_usd=${receipt.paper_receipt.starting_value_usd}`);
console.log(`expected_ending_value_usd=${receipt.paper_receipt.expected_ending_value_usd}`);
console.log(`minimum_ending_value_usd=${receipt.paper_receipt.minimum_ending_value_usd}`);
console.log(`paper_status=${receipt.paper_receipt.status}`);
console.log(`return_values_amount_derived=${receipt.return_values_amount_derived}`);
console.log(
  `internal_app_fee_counted_as_profit=${receipt.paper_receipt.internal_app_fee_counted_as_profit}`,
);
console.log(`composition_network_access_performed=${receipt.composition_network_access_performed}`);
console.log(
  `composition_credential_access_performed=${receipt.composition_credential_access_performed}`,
);
console.log(`wallet_or_key_access_performed=${receipt.wallet_or_key_access_performed}`);
console.log(`transaction_submission_performed=${receipt.transaction_submission_performed}`);
console.log(`fund_movement_performed=${receipt.fund_movement_performed}`);
console.log(`execution_authorized=${receipt.execution_authorized}`);
console.log("VOID_EXTERNAL_OPPORTUNITY_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_V1_PROOF_GREEN");
