import { createHash } from "node:crypto";

export const VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_V1" as const;
export const VOID_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_INPUT_SCHEMA_V1 =
  "void-dual-source-quote-conservative-reducer-input-v1" as const;
export const VOID_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_RECEIPT_SCHEMA_V1 =
  "void-dual-source-quote-conservative-reducer-receipt-v1" as const;

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const USD_SCALE = 1_000_000n;

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;
type RecordValue = Record<string, unknown>;

export type DualSourceQuoteAssetV1 = Readonly<{
  chain_id: number;
  address: string;
  symbol: string;
  decimals: number;
}>;

export type DualSourceQuoteEvidenceV1 = Readonly<{
  provider: string;
  quote_id: string;
  observed_at: string;
  quote_expiry_timestamp: number;
  input_asset: DualSourceQuoteAssetV1;
  output_asset: DualSourceQuoteAssetV1;
  input_amount: string;
  expected_output_amount: string;
  minimum_output_amount: string;
  expected_output_value_usd: string;
  minimum_output_value_usd: string;
  expected_fill_time_seconds: number;
  quoted_output_includes_provider_fees: true;
  quoted_output_includes_price_impact: true;
  app_fee_usd: "0.000000";
  gas_usd: string;
}>;

export type DualSourceQuoteConservativeReducerInputV1 = Readonly<{
  schema: typeof VOID_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_INPUT_SCHEMA_V1;
  reduction_id: string;
  evaluated_at: string;
  maximum_observation_skew_seconds: number;
  quotes: readonly [DualSourceQuoteEvidenceV1, DualSourceQuoteEvidenceV1];
}>;

export type DualSourceQuoteConservativeReducerReceiptV1 = Readonly<{
  schema: typeof VOID_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_RECEIPT_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_V1;
  phase: "paper_only";
  reduction_id: string;
  source_input_sha256: string;
  evaluated_at: string;
  source_quotes: readonly [
    Readonly<{ provider: string; quote_id: string; quote_sha256: string }>,
    Readonly<{ provider: string; quote_id: string; quote_sha256: string }>,
  ];
  observation_skew_seconds: number;
  source_labels_distinct: true;
  source_identity_authenticated: false;
  route_match: true;
  input_amount_match: true;
  conservative_reduction: Readonly<{
    expected_output_amount: "minimum_of_sources";
    minimum_output_amount: "minimum_of_sources";
    expected_output_value_usd: "minimum_of_sources";
    minimum_output_value_usd: "minimum_of_sources";
    expected_fill_time_seconds: "maximum_of_sources";
    gas_usd: "maximum_of_sources";
    quote_expiry_timestamp: "minimum_of_sources";
  }>;
  reduced_quote: DualSourceQuoteEvidenceV1;
  network_access_performed: false;
  credential_access_performed: false;
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

function canonicalInstant(value: unknown, label: string): string {
  const text = boundedString(value, label, 64);
  const milliseconds = Date.parse(text);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== text) {
    hold(`${label} must be a canonical UTC millisecond instant`);
  }
  return text;
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

function providerLabel(value: unknown, label: string): string {
  const text = boundedString(value, label, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(text)) {
    hold(`${label} contains unsupported characters`);
  }
  return text;
}

function tokenAddress(value: unknown, label: string): string {
  const text = boundedString(value, label, 42);
  if (!/^0x[0-9a-fA-F]{40}$/.test(text)) {
    hold(`${label} must be a 20-byte EVM address`);
  }
  return text.toLowerCase();
}

function tokenSymbol(value: unknown, label: string): string {
  const text = boundedString(value, label, 24);
  if (!/^[A-Za-z0-9._-]+$/.test(text)) {
    hold(`${label} contains unsupported characters`);
  }
  return text;
}

function parseAsset(value: unknown, label: string): DualSourceQuoteAssetV1 {
  const source = record(value, label);
  exactKeys(source, ["chain_id", "address", "symbol", "decimals"], label);
  return Object.freeze({
    chain_id: safeInteger(source.chain_id, `${label}.chain_id`, 1, 10_000_000),
    address: tokenAddress(source.address, `${label}.address`),
    symbol: tokenSymbol(source.symbol, `${label}.symbol`),
    decimals: safeInteger(source.decimals, `${label}.decimals`, 0, 36),
  });
}

function sameAsset(left: DualSourceQuoteAssetV1, right: DualSourceQuoteAssetV1): boolean {
  return (
    left.chain_id === right.chain_id &&
    left.address === right.address &&
    left.symbol === right.symbol &&
    left.decimals === right.decimals
  );
}

function parseQuoteEvidence(value: unknown, label: string): DualSourceQuoteEvidenceV1 {
  const source = record(value, label);
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
    label,
  );

  const inputAmount = canonicalUnsignedInteger(source.input_amount, `${label}.input_amount`);
  const expectedOutputAmount = canonicalUnsignedInteger(
    source.expected_output_amount,
    `${label}.expected_output_amount`,
  );
  const minimumOutputAmount = canonicalUnsignedInteger(
    source.minimum_output_amount,
    `${label}.minimum_output_amount`,
  );
  if (
    BigInt(inputAmount) < 1n ||
    BigInt(expectedOutputAmount) < 1n ||
    BigInt(minimumOutputAmount) < 1n
  ) {
    hold(`${label} amounts must be greater than zero`);
  }
  if (BigInt(expectedOutputAmount) < BigInt(minimumOutputAmount)) {
    hold(`${label}.expected_output_amount is below minimum_output_amount`);
  }

  const expectedOutputValue = parseUsdMicros(
    source.expected_output_value_usd,
    `${label}.expected_output_value_usd`,
  );
  const minimumOutputValue = parseUsdMicros(
    source.minimum_output_value_usd,
    `${label}.minimum_output_value_usd`,
  );
  if (expectedOutputValue < minimumOutputValue) {
    hold(`${label}.expected_output_value_usd is below minimum_output_value_usd`);
  }
  if (source.quoted_output_includes_provider_fees !== true) {
    hold(`${label} must include provider fees in quoted output`);
  }
  if (source.quoted_output_includes_price_impact !== true) {
    hold(`${label} must include price impact in quoted output`);
  }
  if (source.app_fee_usd !== "0.000000") {
    hold(`${label}.app_fee_usd must be exactly zero for self-capital paper evaluation`);
  }

  return Object.freeze({
    provider: providerLabel(source.provider, `${label}.provider`),
    quote_id: boundedString(source.quote_id, `${label}.quote_id`, 256),
    observed_at: canonicalInstant(source.observed_at, `${label}.observed_at`),
    quote_expiry_timestamp: safeInteger(
      source.quote_expiry_timestamp,
      `${label}.quote_expiry_timestamp`,
      1,
      4_102_444_800,
    ),
    input_asset: parseAsset(source.input_asset, `${label}.input_asset`),
    output_asset: parseAsset(source.output_asset, `${label}.output_asset`),
    input_amount: inputAmount,
    expected_output_amount: expectedOutputAmount,
    minimum_output_amount: minimumOutputAmount,
    expected_output_value_usd: formatUsdMicros(expectedOutputValue),
    minimum_output_value_usd: formatUsdMicros(minimumOutputValue),
    expected_fill_time_seconds: safeInteger(
      source.expected_fill_time_seconds,
      `${label}.expected_fill_time_seconds`,
      1,
      86_400,
    ),
    quoted_output_includes_provider_fees: true,
    quoted_output_includes_price_impact: true,
    app_fee_usd: "0.000000",
    gas_usd: formatUsdMicros(parseUsdMicros(source.gas_usd, `${label}.gas_usd`)),
  });
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

export function canonicalDualSourceQuoteReducerJsonV1(value: unknown): string {
  return JSON.stringify(jsonValue(value, "document"));
}

export function hashDualSourceQuoteReducerDocumentV1(value: unknown): string {
  return createHash("sha256")
    .update(canonicalDualSourceQuoteReducerJsonV1(value), "utf8")
    .digest("hex");
}

function sourceOrder(
  left: DualSourceQuoteEvidenceV1,
  right: DualSourceQuoteEvidenceV1,
): number {
  return (
    left.provider.localeCompare(right.provider) || left.quote_id.localeCompare(right.quote_id)
  );
}

function parseInput(value: unknown): DualSourceQuoteConservativeReducerInputV1 {
  const source = record(value, "dual-source reducer input");
  exactKeys(
    source,
    ["schema", "reduction_id", "evaluated_at", "maximum_observation_skew_seconds", "quotes"],
    "dual-source reducer input",
  );
  if (source.schema !== VOID_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_INPUT_SCHEMA_V1) {
    hold("dual-source reducer input schema differs");
  }
  if (!Array.isArray(source.quotes) || source.quotes.length !== 2) {
    hold("dual-source reducer input requires exactly two quotes");
  }
  const parsed = [
    parseQuoteEvidence(source.quotes[0], "quotes[0]"),
    parseQuoteEvidence(source.quotes[1], "quotes[1]"),
  ].sort(sourceOrder) as [DualSourceQuoteEvidenceV1, DualSourceQuoteEvidenceV1];

  return Object.freeze({
    schema: VOID_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_INPUT_SCHEMA_V1,
    reduction_id: boundedString(source.reduction_id, "reduction_id", 128),
    evaluated_at: canonicalInstant(source.evaluated_at, "evaluated_at"),
    maximum_observation_skew_seconds: safeInteger(
      source.maximum_observation_skew_seconds,
      "maximum_observation_skew_seconds",
      0,
      300,
    ),
    quotes: Object.freeze(parsed),
  });
}

function minimumIntegerText(left: string, right: string): string {
  return BigInt(left) <= BigInt(right) ? left : right;
}

function minimumUsd(left: string, right: string): string {
  return formatUsdMicros(
    parseUsdMicros(left, "left USD") <= parseUsdMicros(right, "right USD")
      ? parseUsdMicros(left, "left USD")
      : parseUsdMicros(right, "right USD"),
  );
}

function maximumUsd(left: string, right: string): string {
  return formatUsdMicros(
    parseUsdMicros(left, "left USD") >= parseUsdMicros(right, "right USD")
      ? parseUsdMicros(left, "left USD")
      : parseUsdMicros(right, "right USD"),
  );
}

function receiptWithoutHash(
  receipt: DualSourceQuoteConservativeReducerReceiptV1,
): Omit<DualSourceQuoteConservativeReducerReceiptV1, "receipt_sha256"> {
  const { receipt_sha256: _receiptSha256, ...unsigned } = receipt;
  return unsigned;
}

export function reduceDualSourceQuoteConservativelyV1(
  value: unknown,
): DualSourceQuoteConservativeReducerReceiptV1 {
  const input = parseInput(value);
  const [left, right] = input.quotes;

  if (left.provider.toLowerCase() === right.provider.toLowerCase()) {
    hold("source provider labels must be distinct");
  }
  if (left.quote_id === right.quote_id) {
    hold("source quote IDs must be distinct");
  }
  if (!sameAsset(left.input_asset, right.input_asset)) {
    hold("source quote input assets differ");
  }
  if (!sameAsset(left.output_asset, right.output_asset)) {
    hold("source quote output assets differ");
  }
  if (left.input_amount !== right.input_amount) {
    hold("source quote input amounts differ");
  }

  const evaluatedMilliseconds = Date.parse(input.evaluated_at);
  const leftObservedMilliseconds = Date.parse(left.observed_at);
  const rightObservedMilliseconds = Date.parse(right.observed_at);
  if (
    leftObservedMilliseconds > evaluatedMilliseconds ||
    rightObservedMilliseconds > evaluatedMilliseconds
  ) {
    hold("source quote observation occurs after evaluation");
  }
  const skewMilliseconds = Math.abs(leftObservedMilliseconds - rightObservedMilliseconds);
  if (skewMilliseconds > input.maximum_observation_skew_seconds * 1_000) {
    hold("source quote observation skew exceeds policy");
  }
  const observationSkewSeconds = Math.ceil(skewMilliseconds / 1_000);

  for (const [index, quote] of input.quotes.entries()) {
    const observedMilliseconds = Date.parse(quote.observed_at);
    if (quote.quote_expiry_timestamp * 1_000 <= observedMilliseconds) {
      hold(`quotes[${index}] expiry is not after observation`);
    }
    if (quote.quote_expiry_timestamp * 1_000 <= evaluatedMilliseconds) {
      hold(`quotes[${index}] is expired at evaluation`);
    }
  }

  const normalizedInput = Object.freeze({
    schema: input.schema,
    reduction_id: input.reduction_id,
    evaluated_at: input.evaluated_at,
    maximum_observation_skew_seconds: input.maximum_observation_skew_seconds,
    quotes: input.quotes,
  });
  const sourceInputSha256 = hashDualSourceQuoteReducerDocumentV1(normalizedInput);
  const sourceQuotes = Object.freeze(
    input.quotes.map((quote) =>
      Object.freeze({
        provider: quote.provider,
        quote_id: quote.quote_id,
        quote_sha256: hashDualSourceQuoteReducerDocumentV1(quote),
      }),
    ),
  ) as DualSourceQuoteConservativeReducerReceiptV1["source_quotes"];

  const reducedQuoteCore = Object.freeze({
    provider: "dual-source-conservative",
    observed_at:
      leftObservedMilliseconds >= rightObservedMilliseconds ? left.observed_at : right.observed_at,
    quote_expiry_timestamp: Math.min(
      left.quote_expiry_timestamp,
      right.quote_expiry_timestamp,
    ),
    input_asset: left.input_asset,
    output_asset: left.output_asset,
    input_amount: left.input_amount,
    expected_output_amount: minimumIntegerText(
      left.expected_output_amount,
      right.expected_output_amount,
    ),
    minimum_output_amount: minimumIntegerText(
      left.minimum_output_amount,
      right.minimum_output_amount,
    ),
    expected_output_value_usd: minimumUsd(
      left.expected_output_value_usd,
      right.expected_output_value_usd,
    ),
    minimum_output_value_usd: minimumUsd(
      left.minimum_output_value_usd,
      right.minimum_output_value_usd,
    ),
    expected_fill_time_seconds: Math.max(
      left.expected_fill_time_seconds,
      right.expected_fill_time_seconds,
    ),
    quoted_output_includes_provider_fees: true as const,
    quoted_output_includes_price_impact: true as const,
    app_fee_usd: "0.000000" as const,
    gas_usd: maximumUsd(left.gas_usd, right.gas_usd),
  });
  const reducedQuoteId = `voiddsq1_${hashDualSourceQuoteReducerDocumentV1({
    reduction_id: input.reduction_id,
    source_input_sha256: sourceInputSha256,
    source_quotes: sourceQuotes,
    reduced_quote: reducedQuoteCore,
  })}`;
  const reducedQuote: DualSourceQuoteEvidenceV1 = Object.freeze({
    provider: reducedQuoteCore.provider,
    quote_id: reducedQuoteId,
    observed_at: reducedQuoteCore.observed_at,
    quote_expiry_timestamp: reducedQuoteCore.quote_expiry_timestamp,
    input_asset: reducedQuoteCore.input_asset,
    output_asset: reducedQuoteCore.output_asset,
    input_amount: reducedQuoteCore.input_amount,
    expected_output_amount: reducedQuoteCore.expected_output_amount,
    minimum_output_amount: reducedQuoteCore.minimum_output_amount,
    expected_output_value_usd: reducedQuoteCore.expected_output_value_usd,
    minimum_output_value_usd: reducedQuoteCore.minimum_output_value_usd,
    expected_fill_time_seconds: reducedQuoteCore.expected_fill_time_seconds,
    quoted_output_includes_provider_fees: true,
    quoted_output_includes_price_impact: true,
    app_fee_usd: "0.000000",
    gas_usd: reducedQuoteCore.gas_usd,
  });

  const unsigned = Object.freeze({
    schema: VOID_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_RECEIPT_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_V1,
    phase: "paper_only" as const,
    reduction_id: input.reduction_id,
    source_input_sha256: sourceInputSha256,
    evaluated_at: input.evaluated_at,
    source_quotes: sourceQuotes,
    observation_skew_seconds: observationSkewSeconds,
    source_labels_distinct: true as const,
    source_identity_authenticated: false as const,
    route_match: true as const,
    input_amount_match: true as const,
    conservative_reduction: Object.freeze({
      expected_output_amount: "minimum_of_sources" as const,
      minimum_output_amount: "minimum_of_sources" as const,
      expected_output_value_usd: "minimum_of_sources" as const,
      minimum_output_value_usd: "minimum_of_sources" as const,
      expected_fill_time_seconds: "maximum_of_sources" as const,
      gas_usd: "maximum_of_sources" as const,
      quote_expiry_timestamp: "minimum_of_sources" as const,
    }),
    reduced_quote: reducedQuote,
    network_access_performed: false as const,
    credential_access_performed: false as const,
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
  const receipt: DualSourceQuoteConservativeReducerReceiptV1 = Object.freeze({
    ...unsigned,
    receipt_sha256: hashDualSourceQuoteReducerDocumentV1(unsigned),
  });
  return receipt;
}

export function verifyDualSourceQuoteConservativeReducerReceiptV1(
  value: unknown,
): DualSourceQuoteConservativeReducerReceiptV1 {
  const source = record(value, "dual-source reducer receipt");
  exactKeys(
    source,
    [
      "schema",
      "marker",
      "phase",
      "reduction_id",
      "source_input_sha256",
      "evaluated_at",
      "source_quotes",
      "observation_skew_seconds",
      "source_labels_distinct",
      "source_identity_authenticated",
      "route_match",
      "input_amount_match",
      "conservative_reduction",
      "reduced_quote",
      "network_access_performed",
      "credential_access_performed",
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
      "receipt_sha256",
    ],
    "dual-source reducer receipt",
  );
  if (source.schema !== VOID_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_RECEIPT_SCHEMA_V1) {
    hold("dual-source reducer receipt schema differs");
  }
  if (source.marker !== VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_V1) {
    hold("dual-source reducer receipt marker differs");
  }
  if (source.phase !== "paper_only") hold("dual-source reducer receipt phase differs");
  boundedString(source.reduction_id, "receipt.reduction_id", 128);
  canonicalInstant(source.evaluated_at, "receipt.evaluated_at");
  safeInteger(source.observation_skew_seconds, "receipt.observation_skew_seconds", 0, 300);
  if (
    typeof source.source_input_sha256 !== "string" ||
    !SHA256_HEX_PATTERN.test(source.source_input_sha256)
  ) {
    hold("receipt.source_input_sha256 differs");
  }
  if (!Array.isArray(source.source_quotes) || source.source_quotes.length !== 2) {
    hold("receipt.source_quotes must contain exactly two entries");
  }
  const receiptSources = source.source_quotes.map((entry, index) => {
    const item = record(entry, `receipt.source_quotes[${index}]`);
    exactKeys(
      item,
      ["provider", "quote_id", "quote_sha256"],
      `receipt.source_quotes[${index}]`,
    );
    const quoteSha = boundedString(
      item.quote_sha256,
      `receipt.source_quotes[${index}].quote_sha256`,
      64,
    );
    if (!SHA256_HEX_PATTERN.test(quoteSha)) hold("receipt source quote digest differs");
    return Object.freeze({
      provider: providerLabel(item.provider, `receipt.source_quotes[${index}].provider`),
      quote_id: boundedString(item.quote_id, `receipt.source_quotes[${index}].quote_id`, 256),
      quote_sha256: quoteSha,
    });
  });
  if (receiptSources[0].provider.toLowerCase() === receiptSources[1].provider.toLowerCase()) {
    hold("receipt source provider labels are not distinct");
  }
  const reduction = record(source.conservative_reduction, "receipt.conservative_reduction");
  exactKeys(
    reduction,
    [
      "expected_output_amount",
      "minimum_output_amount",
      "expected_output_value_usd",
      "minimum_output_value_usd",
      "expected_fill_time_seconds",
      "gas_usd",
      "quote_expiry_timestamp",
    ],
    "receipt.conservative_reduction",
  );
  for (const key of [
    "expected_output_amount",
    "minimum_output_amount",
    "expected_output_value_usd",
    "minimum_output_value_usd",
  ] as const) {
    if (reduction[key] !== "minimum_of_sources") {
      hold(`receipt reduction ${key} differs`);
    }
  }
  for (const key of ["expected_fill_time_seconds", "gas_usd"] as const) {
    if (reduction[key] !== "maximum_of_sources") {
      hold(`receipt reduction ${key} differs`);
    }
  }
  if (reduction.quote_expiry_timestamp !== "minimum_of_sources") {
    hold("receipt reduction quote_expiry_timestamp differs");
  }
  const reducedQuote = parseQuoteEvidence(source.reduced_quote, "receipt.reduced_quote");
  if (reducedQuote.provider !== "dual-source-conservative") {
    hold("receipt reduced quote provider differs");
  }
  if (!/^voiddsq1_[0-9a-f]{64}$/.test(reducedQuote.quote_id)) {
    hold("receipt reduced quote ID differs");
  }
  for (const [key, expected] of Object.entries({
    source_labels_distinct: true,
    source_identity_authenticated: false,
    route_match: true,
    input_amount_match: true,
    network_access_performed: false,
    credential_access_performed: false,
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
  })) {
    if (source[key] !== expected) hold(`receipt ${key} differs`);
  }
  const receiptSha = boundedString(source.receipt_sha256, "receipt.receipt_sha256", 64);
  if (!SHA256_HEX_PATTERN.test(receiptSha)) hold("receipt SHA-256 differs");
  const unsigned = { ...source };
  delete unsigned.receipt_sha256;
  if (hashDualSourceQuoteReducerDocumentV1(unsigned) !== receiptSha) {
    hold("receipt SHA-256 verification failed");
  }

  return Object.freeze({
    ...(source as unknown as DualSourceQuoteConservativeReducerReceiptV1),
    source_quotes: Object.freeze(
      receiptSources,
    ) as DualSourceQuoteConservativeReducerReceiptV1["source_quotes"],
    reduced_quote: reducedQuote,
  });
}

export function hashVerifiedDualSourceQuoteConservativeReducerReceiptV1(
  receipt: DualSourceQuoteConservativeReducerReceiptV1,
): string {
  return hashDualSourceQuoteReducerDocumentV1(receiptWithoutHash(receipt));
}
