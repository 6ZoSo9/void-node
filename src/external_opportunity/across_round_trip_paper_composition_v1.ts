import { createHash } from "node:crypto";

import {
  VOID_ACROSS_TOKEN_VALUATION_INGESTION_RESULT_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1,
  hashAcrossTokenValuationDocumentV1,
  type AcrossTokenValuationIngestionResultV1,
} from "./across_swap_api_token_valuation_ingestion_v1.js";
import { assertAcrossRoundTripPaperPositionValueConsistentV1 } from "./across_round_trip_paper_position_value_guard_v1.js";
import {
  VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_INPUT_SCHEMA_V1,
  observeSelfCapitalRoundTripPaperV1,
  type RoundTripAssetV1,
  type RoundTripQuoteLegV1,
  type SelfCapitalRoundTripPaperReceiptV1,
} from "./self_capital_round_trip_paper_observer_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_V1" as const;
export const VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_INPUT_SCHEMA_V1 =
  "void-across-round-trip-paper-composition-input-v1" as const;
export const VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_RECEIPT_SCHEMA_V1 =
  "void-across-round-trip-paper-composition-receipt-v1" as const;

const USD_SCALE = 1_000_000n;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const MAX_RESPONSE_BYTES = 1_048_576;

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;
type RecordValue = Record<string, unknown>;

export type AcrossRoundTripReturnQuoteV1 = Readonly<{
  provider: string;
  quote_id: string;
  observed_at: string;
  quote_expiry_timestamp: number;
  input_asset: RoundTripAssetV1;
  output_asset: RoundTripAssetV1;
  input_amount: string;
  expected_output_amount: string;
  minimum_output_amount: string;
  expected_fill_time_seconds: number;
  quoted_output_includes_provider_fees: true;
  quoted_output_includes_price_impact: true;
  app_fee_usd: "0.000000";
  gas_usd: string;
}>;

export type AcrossRoundTripPaperCompositionInputV1 = Readonly<{
  schema: typeof VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_INPUT_SCHEMA_V1;
  strategy_id: string;
  evaluated_at: string;
  valuation: AcrossTokenValuationIngestionResultV1;
  forward_quote: RoundTripQuoteLegV1;
  return_quote: AcrossRoundTripReturnQuoteV1;
  cost_policy: Readonly<{
    capital_lock_seconds: number;
    annual_capital_cost_bps: number;
    risk_reserve_bps: number;
    failure_reserve_usd: string;
    safety_buffer_usd: string;
    maximum_quote_skew_seconds: number;
  }>;
}>;

export type AcrossRoundTripPaperCompositionReceiptV1 = Readonly<{
  schema: typeof VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_RECEIPT_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_V1;
  phase: "paper_only";
  strategy_class: "self_capital_inventory_neutral_round_trip";
  strategy_id: string;
  composition_id: string;
  source_input_sha256: string;
  valuation_provider: "across";
  valuation_sha256: string;
  valuation_observed_at: string;
  valuation_evaluated_at: string;
  starting_value_source: "across_token_catalog_price_usd";
  starting_value_conservative_floor: true;
  upstream_evidence_supplied_by_caller: true;
  composition_observed_at: string;
  composition_evaluated_at: string;
  return_values_amount_derived: true;
  paper_receipt: SelfCapitalRoundTripPaperReceiptV1;
  composition_network_access_performed: false;
  composition_credential_access_performed: false;
  raw_response_retention: false;
  transaction_payload_retention: false;
  network_mutation_performed: false;
  wallet_or_key_access_performed: false;
  transaction_construction_performed: false;
  transaction_signing_performed: false;
  transaction_submission_performed: false;
  fund_movement_performed: false;
  live_execution_authorized: false;
  execution_authorized: false;
  receipt_sha256: string;
}>;

function hold(message: string): never {
  throw new Error(`HOLD: ${message}`);
}

function record(value: unknown, label: string): RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    hold(`${label} must be an object`);
  }
  return value as RecordValue;
}

function exactKeys(value: RecordValue, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    hold(`${label} keys differ`);
  }
}

function boundedString(value: unknown, label: string, maximumLength = 512): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximumLength ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    hold(`${label} must be a bounded printable string`);
  }
  return value;
}

function canonicalInstant(value: unknown, label: string): string {
  const text = boundedString(value, label, 64);
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== text) {
    hold(`${label} must be a canonical UTC millisecond instant`);
  }
  return text;
}

function safeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    hold(`${label} must be a safe integer in range`);
  }
  return value;
}

function canonicalUnsignedInteger(value: unknown, label: string): string {
  const text = boundedString(value, label, 128);
  if (!/^(0|[1-9][0-9]*)$/.test(text)) {
    hold(`${label} must be a canonical unsigned integer string`);
  }
  return text;
}

function parseUsdMicros(value: unknown, label: string): bigint {
  const text = boundedString(value, label, 64);
  if (!/^(0|[1-9][0-9]*)(\.[0-9]{1,6})?$/.test(text)) {
    hold(`${label} must be a non-negative USD decimal with at most 6 places`);
  }
  const [whole, fraction = ""] = text.split(".");
  return BigInt(whole) * USD_SCALE + BigInt(`${fraction}000000`.slice(0, 6));
}

function formatUsdMicros(value: bigint): string {
  if (value < 0n) hold("USD micros must not be negative");
  const whole = value / USD_SCALE;
  const fraction = (value % USD_SCALE).toString().padStart(6, "0");
  return `${whole}.${fraction}`;
}

function evmAddress(value: unknown, label: string): string {
  const text = boundedString(value, label, 42);
  if (!/^0x[0-9a-fA-F]{40}$/.test(text)) {
    hold(`${label} must be a 20-byte EVM address`);
  }
  return text.toLowerCase();
}

function tokenSymbol(value: unknown, label: string): string {
  const text = boundedString(value, label, 32);
  if (!/^[A-Za-z0-9._-]+$/.test(text)) {
    hold(`${label} contains unsupported characters`);
  }
  return text;
}

function parseAsset(value: unknown, label: string): RoundTripAssetV1 {
  const source = record(value, label);
  exactKeys(source, ["chain_id", "address", "symbol", "decimals"], label);
  return Object.freeze({
    chain_id: safeInteger(source.chain_id, `${label}.chain_id`, 1, 10_000_000),
    address: evmAddress(source.address, `${label}.address`),
    symbol: tokenSymbol(source.symbol, `${label}.symbol`),
    decimals: safeInteger(source.decimals, `${label}.decimals`, 0, 36),
  });
}

function sameAsset(left: RoundTripAssetV1, right: RoundTripAssetV1): boolean {
  return (
    left.chain_id === right.chain_id &&
    left.address === right.address &&
    left.symbol === right.symbol &&
    left.decimals === right.decimals
  );
}

function parseForwardQuote(value: unknown): RoundTripQuoteLegV1 {
  const source = record(value, "forward_quote");
  exactKeys(
    source,
    [
      "provider",
      "quote_id",
      "observed_at",
      "quote_expiry_timestamp",
      "input_asset",
      "output_asset",
      "input_amount",
      "expected_output_amount",
      "minimum_output_amount",
      "expected_output_value_usd",
      "minimum_output_value_usd",
      "expected_fill_time_seconds",
      "quoted_output_includes_provider_fees",
      "quoted_output_includes_price_impact",
      "app_fee_usd",
      "gas_usd",
    ],
    "forward_quote",
  );
  if (source.quoted_output_includes_provider_fees !== true) {
    hold("forward_quote must include provider fees");
  }
  if (source.quoted_output_includes_price_impact !== true) {
    hold("forward_quote must include price impact");
  }
  if (source.app_fee_usd !== "0.000000") {
    hold("forward_quote app_fee_usd must be zero");
  }
  return Object.freeze({
    provider: boundedString(source.provider, "forward_quote.provider", 128),
    quote_id: boundedString(source.quote_id, "forward_quote.quote_id", 256),
    observed_at: canonicalInstant(source.observed_at, "forward_quote.observed_at"),
    quote_expiry_timestamp: safeInteger(
      source.quote_expiry_timestamp,
      "forward_quote.quote_expiry_timestamp",
      1,
      4_102_444_800,
    ),
    input_asset: parseAsset(source.input_asset, "forward_quote.input_asset"),
    output_asset: parseAsset(source.output_asset, "forward_quote.output_asset"),
    input_amount: canonicalUnsignedInteger(source.input_amount, "forward_quote.input_amount"),
    expected_output_amount: canonicalUnsignedInteger(
      source.expected_output_amount,
      "forward_quote.expected_output_amount",
    ),
    minimum_output_amount: canonicalUnsignedInteger(
      source.minimum_output_amount,
      "forward_quote.minimum_output_amount",
    ),
    expected_output_value_usd: formatUsdMicros(
      parseUsdMicros(
        source.expected_output_value_usd,
        "forward_quote.expected_output_value_usd",
      ),
    ),
    minimum_output_value_usd: formatUsdMicros(
      parseUsdMicros(
        source.minimum_output_value_usd,
        "forward_quote.minimum_output_value_usd",
      ),
    ),
    expected_fill_time_seconds: safeInteger(
      source.expected_fill_time_seconds,
      "forward_quote.expected_fill_time_seconds",
      1,
      86_400,
    ),
    quoted_output_includes_provider_fees: true,
    quoted_output_includes_price_impact: true,
    app_fee_usd: "0.000000",
    gas_usd: formatUsdMicros(parseUsdMicros(source.gas_usd, "forward_quote.gas_usd")),
  });
}

function parseReturnQuote(value: unknown): AcrossRoundTripReturnQuoteV1 {
  const source = record(value, "return_quote");
  exactKeys(
    source,
    [
      "provider",
      "quote_id",
      "observed_at",
      "quote_expiry_timestamp",
      "input_asset",
      "output_asset",
      "input_amount",
      "expected_output_amount",
      "minimum_output_amount",
      "expected_fill_time_seconds",
      "quoted_output_includes_provider_fees",
      "quoted_output_includes_price_impact",
      "app_fee_usd",
      "gas_usd",
    ],
    "return_quote",
  );
  if (source.quoted_output_includes_provider_fees !== true) {
    hold("return_quote must include provider fees");
  }
  if (source.quoted_output_includes_price_impact !== true) {
    hold("return_quote must include price impact");
  }
  if (source.app_fee_usd !== "0.000000") {
    hold("return_quote app_fee_usd must be zero");
  }
  return Object.freeze({
    provider: boundedString(source.provider, "return_quote.provider", 128),
    quote_id: boundedString(source.quote_id, "return_quote.quote_id", 256),
    observed_at: canonicalInstant(source.observed_at, "return_quote.observed_at"),
    quote_expiry_timestamp: safeInteger(
      source.quote_expiry_timestamp,
      "return_quote.quote_expiry_timestamp",
      1,
      4_102_444_800,
    ),
    input_asset: parseAsset(source.input_asset, "return_quote.input_asset"),
    output_asset: parseAsset(source.output_asset, "return_quote.output_asset"),
    input_amount: canonicalUnsignedInteger(source.input_amount, "return_quote.input_amount"),
    expected_output_amount: canonicalUnsignedInteger(
      source.expected_output_amount,
      "return_quote.expected_output_amount",
    ),
    minimum_output_amount: canonicalUnsignedInteger(
      source.minimum_output_amount,
      "return_quote.minimum_output_amount",
    ),
    expected_fill_time_seconds: safeInteger(
      source.expected_fill_time_seconds,
      "return_quote.expected_fill_time_seconds",
      1,
      86_400,
    ),
    quoted_output_includes_provider_fees: true,
    quoted_output_includes_price_impact: true,
    app_fee_usd: "0.000000",
    gas_usd: formatUsdMicros(parseUsdMicros(source.gas_usd, "return_quote.gas_usd")),
  });
}

function parseValuation(value: unknown): AcrossTokenValuationIngestionResultV1 {
  const source = record(value, "valuation");
  exactKeys(
    source,
    [
      "schema",
      "marker",
      "provider",
      "endpoint",
      "method",
      "observed_at",
      "evaluated_at",
      "response_bytes",
      "selector",
      "selected_token",
      "price_usd_floor",
      "position_value_usd_floor",
      "price_source_precision_digits",
      "sanitized_token_sha256",
      "valuation_sha256",
      "credential_retention",
      "raw_response_retention",
      "transaction_payload_retention",
      "network_mutation_performed",
      "wallet_or_key_access_performed",
      "transaction_construction_performed",
      "transaction_signing_performed",
      "transaction_submission_performed",
      "fund_movement_performed",
      "live_execution_authorized",
      "execution_authorized",
    ],
    "valuation",
  );
  if (source.schema !== VOID_ACROSS_TOKEN_VALUATION_INGESTION_RESULT_SCHEMA_V1) {
    hold("valuation schema differs");
  }
  if (source.marker !== VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1) {
    hold("valuation marker differs");
  }
  if (
    source.provider !== "across" ||
    source.endpoint !== "https://app.across.to/api/swap/tokens" ||
    source.method !== "GET"
  ) {
    hold("valuation provider boundary differs");
  }

  const observedAt = canonicalInstant(source.observed_at, "valuation.observed_at");
  const evaluatedAt = canonicalInstant(source.evaluated_at, "valuation.evaluated_at");
  if (Date.parse(evaluatedAt) < Date.parse(observedAt)) {
    hold("valuation evaluated_at precedes observed_at");
  }

  const selectorSource = record(source.selector, "valuation.selector");
  exactKeys(selectorSource, ["chain_id", "address", "amount"], "valuation.selector");
  const selector = Object.freeze({
    chain_id: safeInteger(
      selectorSource.chain_id,
      "valuation.selector.chain_id",
      1,
      10_000_000,
    ),
    address: evmAddress(selectorSource.address, "valuation.selector.address"),
    amount: canonicalUnsignedInteger(selectorSource.amount, "valuation.selector.amount"),
  });
  if (BigInt(selector.amount) < 1n) hold("valuation selector amount must be positive");

  const selectedToken = parseAsset(source.selected_token, "valuation.selected_token");
  if (
    selectedToken.chain_id !== selector.chain_id ||
    selectedToken.address !== selector.address
  ) {
    hold("valuation selector and selected token differ");
  }

  const priceUsdFloor = formatUsdMicros(
    parseUsdMicros(source.price_usd_floor, "valuation.price_usd_floor"),
  );
  const positionValueUsdFloor = formatUsdMicros(
    parseUsdMicros(
      source.position_value_usd_floor,
      "valuation.position_value_usd_floor",
    ),
  );
  if (parseUsdMicros(positionValueUsdFloor, "valuation.position_value_usd_floor") < 1n) {
    hold("valuation position value must be positive");
  }

  const sanitizedTokenSha = boundedString(
    source.sanitized_token_sha256,
    "valuation.sanitized_token_sha256",
    64,
  );
  const valuationSha = boundedString(source.valuation_sha256, "valuation.valuation_sha256", 64);
  if (!SHA256_HEX_PATTERN.test(sanitizedTokenSha) || !SHA256_HEX_PATTERN.test(valuationSha)) {
    hold("valuation SHA-256 field differs");
  }

  const falseFields = [
    "credential_retention",
    "raw_response_retention",
    "transaction_payload_retention",
    "network_mutation_performed",
    "wallet_or_key_access_performed",
    "transaction_construction_performed",
    "transaction_signing_performed",
    "transaction_submission_performed",
    "fund_movement_performed",
    "live_execution_authorized",
    "execution_authorized",
  ] as const;
  for (const field of falseFields) {
    if (source[field] !== false) hold(`valuation ${field} must be false`);
  }

  const result = Object.freeze({
    schema: VOID_ACROSS_TOKEN_VALUATION_INGESTION_RESULT_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1,
    provider: "across" as const,
    endpoint: "https://app.across.to/api/swap/tokens" as const,
    method: "GET" as const,
    observed_at: observedAt,
    evaluated_at: evaluatedAt,
    response_bytes: safeInteger(
      source.response_bytes,
      "valuation.response_bytes",
      2,
      MAX_RESPONSE_BYTES,
    ),
    selector,
    selected_token: selectedToken,
    price_usd_floor: priceUsdFloor,
    position_value_usd_floor: positionValueUsdFloor,
    price_source_precision_digits: safeInteger(
      source.price_source_precision_digits,
      "valuation.price_source_precision_digits",
      0,
      36,
    ),
    sanitized_token_sha256: sanitizedTokenSha,
    valuation_sha256: valuationSha,
    credential_retention: false as const,
    raw_response_retention: false as const,
    transaction_payload_retention: false as const,
    network_mutation_performed: false as const,
    wallet_or_key_access_performed: false as const,
    transaction_construction_performed: false as const,
    transaction_signing_performed: false as const,
    transaction_submission_performed: false as const,
    fund_movement_performed: false as const,
    live_execution_authorized: false as const,
    execution_authorized: false as const,
  });

  const valuationCore = Object.freeze({
    provider: result.provider,
    endpoint: result.endpoint,
    observed_at: result.observed_at,
    selector: result.selector,
    selected_token: result.selected_token,
    price_usd_floor: result.price_usd_floor,
    position_value_usd_floor: result.position_value_usd_floor,
    price_source_precision_digits: result.price_source_precision_digits,
    sanitized_token_sha256: result.sanitized_token_sha256,
  });
  if (hashAcrossTokenValuationDocumentV1(valuationCore) !== result.valuation_sha256) {
    hold("valuation digest does not match sanitized valuation core");
  }
  return result;
}

function jsonValue(value: unknown, label: string): JsonValue {
  if (value === null) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) hold(`${label} contains a non-finite number`);
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry, index) => jsonValue(entry, `${label}[${index}]`)));
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const output: Record<string, JsonValue> = {};
    for (const key of Object.keys(source).sort()) {
      output[key] = jsonValue(source[key], `${label}.${key}`);
    }
    return Object.freeze(output);
  }
  hold(`${label} contains unsupported JSON data`);
}

export function canonicalAcrossRoundTripPaperCompositionJsonV1(value: unknown): string {
  return JSON.stringify(jsonValue(value, "document"));
}

export function hashAcrossRoundTripPaperCompositionDocumentV1(value: unknown): string {
  return createHash("sha256")
    .update(canonicalAcrossRoundTripPaperCompositionJsonV1(value), "utf8")
    .digest("hex");
}

export function composeAcrossRoundTripPaperV1(
  value: unknown,
): AcrossRoundTripPaperCompositionReceiptV1 {
  assertAcrossRoundTripPaperPositionValueConsistentV1(value);

  const source = record(value, "Across round-trip paper composition input");
  exactKeys(
    source,
    [
      "schema",
      "strategy_id",
      "evaluated_at",
      "valuation",
      "forward_quote",
      "return_quote",
      "cost_policy",
    ],
    "Across round-trip paper composition input",
  );
  if (source.schema !== VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_INPUT_SCHEMA_V1) {
    hold("Across round-trip paper composition input schema differs");
  }

  const strategyId = boundedString(source.strategy_id, "strategy_id", 256);
  const evaluatedAt = canonicalInstant(source.evaluated_at, "evaluated_at");
  const valuation = parseValuation(source.valuation);
  const forwardQuote = parseForwardQuote(source.forward_quote);
  const returnQuote = parseReturnQuote(source.return_quote);

  const startingAsset = valuation.selected_token;
  if (!sameAsset(startingAsset, forwardQuote.input_asset)) {
    hold("valuation asset must equal the forward quote input asset");
  }
  if (forwardQuote.input_amount !== valuation.selector.amount) {
    hold("valuation amount must equal the forward quote input amount");
  }
  if (!sameAsset(forwardQuote.output_asset, returnQuote.input_asset)) {
    hold("return quote input asset must equal the forward quote output asset");
  }
  if (!sameAsset(returnQuote.output_asset, startingAsset)) {
    hold("return quote output asset must restore the valued starting asset");
  }

  const startingAmount = BigInt(valuation.selector.amount);
  const startingValue = parseUsdMicros(
    valuation.position_value_usd_floor,
    "valuation.position_value_usd_floor",
  );
  const expectedReturnAmount = BigInt(returnQuote.expected_output_amount);
  const minimumReturnAmount = BigInt(returnQuote.minimum_output_amount);
  if (expectedReturnAmount < minimumReturnAmount || minimumReturnAmount < 1n) {
    hold("return quote output amount ordering differs");
  }
  const expectedReturnValue = (startingValue * expectedReturnAmount) / startingAmount;
  const minimumReturnValue = (startingValue * minimumReturnAmount) / startingAmount;

  const costSource = record(source.cost_policy, "cost_policy");
  exactKeys(
    costSource,
    [
      "capital_lock_seconds",
      "annual_capital_cost_bps",
      "risk_reserve_bps",
      "failure_reserve_usd",
      "safety_buffer_usd",
      "maximum_quote_skew_seconds",
    ],
    "cost_policy",
  );

  const compositionObservedAtMilliseconds = Math.max(
    Date.parse(valuation.evaluated_at),
    Date.parse(forwardQuote.observed_at),
    Date.parse(returnQuote.observed_at),
  );
  if (Date.parse(evaluatedAt) < compositionObservedAtMilliseconds) {
    hold("composition evaluated_at precedes supplied evidence");
  }
  const compositionObservedAt = new Date(compositionObservedAtMilliseconds).toISOString();

  const observerInput = Object.freeze({
    schema: VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_INPUT_SCHEMA_V1,
    strategy_id: strategyId,
    observed_at: compositionObservedAt,
    evaluated_at: evaluatedAt,
    starting_asset: startingAsset,
    starting_amount: valuation.selector.amount,
    starting_value_usd: valuation.position_value_usd_floor,
    forward_quote: forwardQuote,
    return_quote: Object.freeze({
      ...returnQuote,
      expected_output_value_usd: formatUsdMicros(expectedReturnValue),
      minimum_output_value_usd: formatUsdMicros(minimumReturnValue),
    }),
    cost_policy: Object.freeze({
      capital_at_risk_usd: valuation.position_value_usd_floor,
      capital_lock_seconds: safeInteger(
        costSource.capital_lock_seconds,
        "cost_policy.capital_lock_seconds",
        1,
        31_536_000,
      ),
      annual_capital_cost_bps: safeInteger(
        costSource.annual_capital_cost_bps,
        "cost_policy.annual_capital_cost_bps",
        0,
        100_000,
      ),
      risk_reserve_bps: safeInteger(
        costSource.risk_reserve_bps,
        "cost_policy.risk_reserve_bps",
        0,
        10_000,
      ),
      failure_reserve_usd: formatUsdMicros(
        parseUsdMicros(costSource.failure_reserve_usd, "cost_policy.failure_reserve_usd"),
      ),
      safety_buffer_usd: formatUsdMicros(
        parseUsdMicros(costSource.safety_buffer_usd, "cost_policy.safety_buffer_usd"),
      ),
      maximum_quote_skew_seconds: safeInteger(
        costSource.maximum_quote_skew_seconds,
        "cost_policy.maximum_quote_skew_seconds",
        0,
        300,
      ),
    }),
  });

  const paperReceipt = observeSelfCapitalRoundTripPaperV1(observerInput);
  const sourceInputSha = hashAcrossRoundTripPaperCompositionDocumentV1({
    ...source,
    valuation,
    forward_quote: forwardQuote,
    return_quote: returnQuote,
  });
  if (!SHA256_HEX_PATTERN.test(sourceInputSha)) hold("composition input SHA-256 differs");

  const receiptCore = Object.freeze({
    schema: VOID_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_RECEIPT_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_ACROSS_ROUND_TRIP_PAPER_COMPOSITION_V1,
    phase: "paper_only" as const,
    strategy_class: "self_capital_inventory_neutral_round_trip" as const,
    strategy_id: strategyId,
    composition_id: sourceInputSha,
    source_input_sha256: sourceInputSha,
    valuation_provider: "across" as const,
    valuation_sha256: valuation.valuation_sha256,
    valuation_observed_at: valuation.observed_at,
    valuation_evaluated_at: valuation.evaluated_at,
    starting_value_source: "across_token_catalog_price_usd" as const,
    starting_value_conservative_floor: true as const,
    upstream_evidence_supplied_by_caller: true as const,
    composition_observed_at: compositionObservedAt,
    composition_evaluated_at: evaluatedAt,
    return_values_amount_derived: true as const,
    paper_receipt: paperReceipt,
    composition_network_access_performed: false as const,
    composition_credential_access_performed: false as const,
    raw_response_retention: false as const,
    transaction_payload_retention: false as const,
    network_mutation_performed: false as const,
    wallet_or_key_access_performed: false as const,
    transaction_construction_performed: false as const,
    transaction_signing_performed: false as const,
    transaction_submission_performed: false as const,
    fund_movement_performed: false as const,
    live_execution_authorized: false as const,
    execution_authorized: false as const,
  });

  return Object.freeze({
    ...receiptCore,
    receipt_sha256: hashAcrossRoundTripPaperCompositionDocumentV1(receiptCore),
  });
}
