import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  VOID_ACROSS_TOKEN_VALUATION_INGESTION_RESULT_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1,
  canonicalAcrossTokenValuationJsonV1,
  hashAcrossTokenValuationDocumentV1,
  ingestAcrossTokenValuationV1,
  type AcrossTokenValuationReadonlyHttpsRequestV1,
  type AcrossTokenValuationReadonlyTransportV1,
} from "../src/external_opportunity/across_swap_api_token_valuation_ingestion_v1.js";

type JsonObject = Record<string, unknown>;

const fixturePath = new URL(
  "../fixtures/external-opportunity/across-swap-api-token-valuation-ingestion-v1.example.json",
  import.meta.url,
);
const schemaPath = new URL(
  "../schemas/external-opportunity-across-swap-api-token-valuation-ingestion-v1.schema.json",
  import.meta.url,
);
const documentationPath = new URL(
  "../docs/architecture/external-opportunity-across-swap-api-token-valuation-ingestion-v1.md",
  import.meta.url,
);
const workflowPath = new URL(
  "../.github/workflows/external-opportunity-across-swap-api-token-valuation-ingestion-v1.yml",
  import.meta.url,
);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fixedClock(): () => string {
  const instants = [
    "2026-08-03T23:40:00.000Z",
    "2026-08-03T23:40:00.250Z",
  ];
  return () => {
    const value = instants.shift();
    if (value === undefined) throw new Error("clock exhausted");
    return value;
  };
}

function responseTokens(): JsonObject[] {
  return [
    {
      chainId: 42161,
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimals: 18,
      logoUrl: "https://example.invalid/weth.png",
      priceUsd: "3123.456789123456789",
    },
    {
      chainId: 42161,
      address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      logoUrl: "https://example.invalid/usdc.png",
      priceUsd: "0.999903123456789",
    },
  ];
}

function mockTransport(
  body: unknown,
  capture: AcrossTokenValuationReadonlyHttpsRequestV1[] = [],
  statusCode = 200,
  contentType = "application/json; charset=utf-8",
): AcrossTokenValuationReadonlyTransportV1 {
  return async (request) => {
    capture.push(request);
    return Object.freeze({
      status_code: statusCode,
      content_type: contentType,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  };
}

async function expectHold(
  operation: () => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  await assert.rejects(operation, pattern);
}

const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as JsonObject;
const schema = JSON.parse(await readFile(schemaPath, "utf8")) as JsonObject;
const documentation = await readFile(documentationPath, "utf8");
const workflow = await readFile(workflowPath, "utf8");

assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(schema.type, "object");
assert.equal(schema.additionalProperties, false);
assert.deepEqual(schema.required, ["api_key", "integrator_id", "selector"]);
assert.equal(
  (((schema.properties as JsonObject).integrator_id as JsonObject).pattern),
  "^0x[0-9a-fA-F]{4}$",
);
assert.match(documentation, /performs no live API request/);
assert.match(documentation, /No floating-point arithmetic is used/);
assert.match(documentation, /fund[- ]movement/);
assert.match(
  workflow,
  /node --import tsx scripts\/prove_external_opportunity_across_swap_api_token_valuation_ingestion_v1\.ts/,
);
assert.match(workflow, /npm run build/);

const captured: AcrossTokenValuationReadonlyHttpsRequestV1[] = [];
const result = await ingestAcrossTokenValuationV1(
  fixture,
  mockTransport(responseTokens(), captured),
  fixedClock(),
);

assert.equal(captured.length, 1);
assert.equal(captured[0].method, "GET");
assert.equal(
  captured[0].url,
  "https://app.across.to/api/swap/tokens?chainId=42161&integratorId=0xdead",
);
assert.deepEqual(captured[0].headers, {
  Accept: "application/json",
  Authorization: "Bearer synthetic-test-key-not-a-credential",
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  "User-Agent": "void-external-opportunity-observer/1",
});
assert.equal(captured[0].timeout_ms, 5000);
assert.equal(captured[0].max_response_bytes, 1_048_576);

assert.equal(result.schema, VOID_ACROSS_TOKEN_VALUATION_INGESTION_RESULT_SCHEMA_V1);
assert.equal(result.marker, VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1);
assert.equal(result.provider, "across");
assert.equal(result.endpoint, "https://app.across.to/api/swap/tokens");
assert.equal(result.method, "GET");
assert.equal(result.observed_at, "2026-08-03T23:40:00.000Z");
assert.equal(result.evaluated_at, "2026-08-03T23:40:00.250Z");
assert.deepEqual(result.selector, {
  chain_id: 42161,
  address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  amount: "100000000",
});
assert.deepEqual(result.selected_token, {
  chain_id: 42161,
  address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  symbol: "USDC",
  decimals: 6,
});
assert.equal(result.price_usd_floor, "0.999903");
assert.equal(result.position_value_usd_floor, "99.990312");
assert.equal(result.price_source_precision_digits, 15);
assert.match(result.sanitized_token_sha256, /^[0-9a-f]{64}$/);
assert.match(result.valuation_sha256, /^[0-9a-f]{64}$/);
assert.equal(result.credential_retention, false);
assert.equal(result.raw_response_retention, false);
assert.equal(result.transaction_payload_retention, false);
assert.equal(result.network_mutation_performed, false);
assert.equal(result.wallet_or_key_access_performed, false);
assert.equal(result.transaction_construction_performed, false);
assert.equal(result.transaction_signing_performed, false);
assert.equal(result.transaction_submission_performed, false);
assert.equal(result.fund_movement_performed, false);
assert.equal(result.live_execution_authorized, false);
assert.equal(result.execution_authorized, false);
assert.equal(result.response_bytes, Buffer.byteLength(JSON.stringify(responseTokens()), "utf8"));

const serialized = JSON.stringify(result);
assert.doesNotMatch(serialized, /synthetic-test-key-not-a-credential/);
assert.doesNotMatch(serialized, /example\.invalid/);
assert.doesNotMatch(serialized, /USD Coin/);
assert.doesNotMatch(serialized, /Wrapped Ether/);

const deterministic = await ingestAcrossTokenValuationV1(
  clone(fixture),
  mockTransport(responseTokens()),
  fixedClock(),
);
assert.deepEqual(result, deterministic);
assert.equal(
  canonicalAcrossTokenValuationJsonV1(result),
  canonicalAcrossTokenValuationJsonV1(deterministic),
);
assert.equal(
  hashAcrossTokenValuationDocumentV1(result),
  hashAcrossTokenValuationDocumentV1(deterministic),
);

const missing = responseTokens().filter((token) => token.symbol !== "USDC");
await expectHold(
  () => ingestAcrossTokenValuationV1(fixture, mockTransport(missing), fixedClock()),
  /selector did not match any token/,
);

const duplicate = [...responseTokens(), clone(responseTokens()[1])];
await expectHold(
  () => ingestAcrossTokenValuationV1(fixture, mockTransport(duplicate), fixedClock()),
  /selector matched duplicate tokens/,
);

const malformedPrice = responseTokens();
malformedPrice[1].priceUsd = "1e0";
await expectHold(
  () => ingestAcrossTokenValuationV1(fixture, mockTransport(malformedPrice), fixedClock()),
  /canonical non-negative decimal/,
);

const unexpectedResponseKey = responseTokens();
unexpectedResponseKey[1].calldata = "0x1234";
await expectHold(
  () => ingestAcrossTokenValuationV1(fixture, mockTransport(unexpectedResponseKey), fixedClock()),
  /unexpected key: calldata/,
);

const zeroAmount = clone(fixture);
(zeroAmount.selector as JsonObject).amount = "0";
await expectHold(
  () => ingestAcrossTokenValuationV1(zeroAmount, mockTransport(responseTokens()), fixedClock()),
  /amount must be greater than zero/,
);

const unknownInputKey = clone(fixture);
unknownInputKey.wallet = "forbidden";
await expectHold(
  () => ingestAcrossTokenValuationV1(unknownInputKey, mockTransport(responseTokens()), fixedClock()),
  /unexpected key: wallet/,
);

const invalidIntegrator = clone(fixture);
invalidIntegrator.integrator_id = "0xzzzz";
await expectHold(
  () => ingestAcrossTokenValuationV1(invalidIntegrator, mockTransport(responseTokens()), fixedClock()),
  /two-byte 0x-prefixed hex value/,
);

await expectHold(
  () => ingestAcrossTokenValuationV1(fixture, mockTransport(responseTokens(), [], 503), fixedClock()),
  /returned status 503/,
);
await expectHold(
  () => ingestAcrossTokenValuationV1(
    fixture,
    mockTransport(responseTokens(), [], 200, "text/plain"),
    fixedClock(),
  ),
  /content type is not JSON/,
);
await expectHold(
  () => ingestAcrossTokenValuationV1(fixture, mockTransport("not-json"), fixedClock()),
  /body is not valid JSON/,
);
await expectHold(
  () => ingestAcrossTokenValuationV1(fixture, mockTransport({ tokens: responseTokens() }), fixedClock()),
  /response must be an array/,
);

console.log("live_api_request_performed=false");
console.log("selected_token_matches=1");
console.log("price_usd_floor=0.999903");
console.log("position_value_usd_floor=99.990312");
console.log("credential_retention=false");
console.log("raw_response_retention=false");
console.log("wallet_or_key_access_performed=false");
console.log("transaction_construction_performed=false");
console.log("transaction_signing_performed=false");
console.log("transaction_submission_performed=false");
console.log("fund_movement_performed=false");
console.log("live_execution_authorized=false");
console.log("VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1_PROOF_GREEN");
