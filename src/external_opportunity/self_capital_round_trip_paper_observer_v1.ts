import { createHash } from "node:crypto";

export const VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_OBSERVER_V1 =
  "VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_OBSERVER_V1" as const;

export const VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_INPUT_SCHEMA_V1 =
  "void-self-capital-round-trip-paper-input-v1" as const;

export const VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_RECEIPT_SCHEMA_V1 =
  "void-self-capital-round-trip-paper-receipt-v1" as const;

const USD_SCALE = 1_000_000n;
const BPS_DENOMINATOR = 10_000n;
const YEAR_SECONDS = 31_536_000n;
const MAX_QUOTE_SKEW_SECONDS = 300;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;
type RecordValue = Record<string, unknown>;

export type RoundTripAssetV1 = Readonly<{
  chain_id: number;
  address: string;
  symbol: string;
  decimals: number;
}>;

export type RoundTripQuoteLegV1 = Readonly<{
  provider: string;
  quote_id: string;
  observed_at: string;
  quote_expiry_timestamp: number;
  input_asset: RoundTripAssetV1;
  output_asset: RoundTripAssetV1;
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

export type SelfCapitalRoundTripPaperInputV1 = Readonly<{
  schema: typeof VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_INPUT_SCHEMA_V1;
  strategy_id: string;
  observed_at: string;
  evaluated_at: string;
  starting_asset: RoundTripAssetV1;
  starting_amount: string;
  starting_value_usd: string;
  forward_quote: RoundTripQuoteLegV1;
  return_quote: RoundTripQuoteLegV1;
  cost_policy: Readonly<{
    capital_at_risk_usd: string;
    capital_lock_seconds: number;
    annual_capital_cost_bps: number;
    risk_reserve_bps: number;
    failure_reserve_usd: string;
    safety_buffer_usd: string;
    maximum_quote_skew_seconds: number;
  }>;
}>;

export type SelfCapitalRoundTripPaperStatusV1 =
  | "paper_positive"
  | "paper_marginal"
  | "paper_negative"
  | "expired";

export type SelfCapitalRoundTripPaperReceiptV1 = Readonly<{
  schema: typeof VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_RECEIPT_SCHEMA_V1;
  marker: typeof VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_OBSERVER_V1;
  phase: "paper_only";
  strategy_class: "self_capital_inventory_neutral_round_trip";
  strategy_id: string;
  opportunity_id: string;
  source_input_sha256: string;
  status: SelfCapitalRoundTripPaperStatusV1;
  observed_at: string;
  evaluated_at: string;
  quote_skew_seconds: number;
  quotes_expired: boolean;
  starting_asset: RoundTripAssetV1;
  intermediate_asset: RoundTripAssetV1;
  starting_amount: string;
  round_trip_intermediate_amount: string;
  expected_ending_amount: string;
  minimum_ending_amount: string;
  starting_value_usd: string;
  expected_ending_value_usd: string;
  minimum_ending_value_usd: string;
  expected_gross_pnl_usd: string;
  minimum_gross_pnl_usd: string;
  paper_costs: Readonly<{
    forward_gas_usd: string;
    return_gas_usd: string;
    capital_lock_cost_usd: string;
    risk_reserve_usd: string;
    failure_reserve_usd: string;
    safety_buffer_usd: string;
    total_external_cost_usd: string;
  }>;
  expected_net_pnl_usd: string;
  minimum_net_pnl_usd: string;
  expected_net_pnl_bps_of_capital: string;
  minimum_net_pnl_bps_of_capital: string;
  internal_app_fee_revenue_usd: "0.000000";
  internal_app_fee_counted_as_profit: false;
  round_trip_inventory_neutral: true;
  starting_asset_restored: true;
  provider_fees_included_in_quotes: true;
  price_impact_included_in_quotes: true;
  credential_access_performed: false;
  raw_response_retention: false;
  transaction_payload_retention: false;
  network_access_performed: false;
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

function exactKeys(
  value: RecordValue,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    hold(`${label} keys differ`);
  }
}

function boundedString(
  value: unknown,
  label: string,
  maximumLength = 512,
): string {
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
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / USD_SCALE;
  const fraction = (absolute % USD_SCALE).toString().padStart(6, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) {
    hold("ceilDiv received invalid values");
  }
  return (numerator + denominator - 1n) / denominator;
}

function floorSignedDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    hold("floorSignedDiv received an invalid denominator");
  }
  return numerator >= 0n
    ? numerator / denominator
    : -ceilDiv(-numerator, denominator);
}

function tokenAddress(value: unknown, label: string): string {
  const text = boundedString(value, label, 128);
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

function parseAsset(value: unknown, label: string): RoundTripAssetV1 {
  const source = record(value, label);
  exactKeys(source, ["chain_id", "address", "symbol", "decimals"], label);
  return Object.freeze({
    chain_id: safeInteger(source.chain_id, `${label}.chain_id`, 1, 10_000_000),
    address: tokenAddress(source.address, `${label}.address`),
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

function parseQuoteLeg(value: unknown, label: string): RoundTripQuoteLegV1 {
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
    hold(`${label}.app_fee_usd must be exactly zero for self-capital paper trading`);
  }

  return Object.freeze({
    provider: boundedString(source.provider, `${label}.provider`, 128),
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
    const result: Record<string, JsonValue> = {};
    for (const key of Object.keys(source).sort()) {
      result[key] = jsonValue(source[key], `${label}.${key}`);
    }
    return Object.freeze(result);
  }
  hold(`${label} contains unsupported JSON data`);
}

export function canonicalSelfCapitalRoundTripJsonV1(value: unknown): string {
  return JSON.stringify(jsonValue(value, "document"));
}

export function hashSelfCapitalRoundTripDocumentV1(value: unknown): string {
  return createHash("sha256")
    .update(canonicalSelfCapitalRoundTripJsonV1(value), "utf8")
    .digest("hex");
}

export function parseSelfCapitalRoundTripPaperInputV1(
  value: unknown,
): SelfCapitalRoundTripPaperInputV1 {
  const source = record(value, "self-capital round-trip paper input");
  exactKeys(
    source,
    [
      "schema",
      "strategy_id",
      "observed_at",
      "evaluated_at",
      "starting_asset",
      "starting_amount",
      "starting_value_usd",
      "forward_quote",
      "return_quote",
      "cost_policy",
    ],
    "self-capital round-trip paper input",
  );

  if (source.schema !== VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_INPUT_SCHEMA_V1) {
    hold("self-capital round-trip paper input schema differs");
  }

  const observedAt = canonicalInstant(source.observed_at, "observed_at");
  const evaluatedAt = canonicalInstant(source.evaluated_at, "evaluated_at");
  if (Date.parse(evaluatedAt) < Date.parse(observedAt)) {
    hold("evaluated_at must not precede observed_at");
  }

  const startingAsset = parseAsset(source.starting_asset, "starting_asset");
  const startingAmount = canonicalUnsignedInteger(source.starting_amount, "starting_amount");
  if (BigInt(startingAmount) < 1n) hold("starting_amount must be greater than zero");
  const startingValue = parseUsdMicros(source.starting_value_usd, "starting_value_usd");
  if (startingValue < 1n) hold("starting_value_usd must be greater than zero");

  const forwardQuote = parseQuoteLeg(source.forward_quote, "forward_quote");
  const returnQuote = parseQuoteLeg(source.return_quote, "return_quote");

  if (!sameAsset(startingAsset, forwardQuote.input_asset)) {
    hold("forward quote input asset must equal the starting asset");
  }
  if (!sameAsset(forwardQuote.output_asset, returnQuote.input_asset)) {
    hold("return quote input asset must equal the forward output asset");
  }
  if (!sameAsset(returnQuote.output_asset, startingAsset)) {
    hold("return quote output asset must restore the starting asset");
  }
  if (forwardQuote.input_amount !== startingAmount) {
    hold("forward quote input amount must equal starting_amount");
  }
  if (forwardQuote.expected_output_amount !== forwardQuote.minimum_output_amount) {
    hold("V1 requires forward expected and minimum output amounts to match exactly");
  }
  if (returnQuote.input_amount !== forwardQuote.minimum_output_amount) {
    hold("return quote input amount must equal the guaranteed forward output amount");
  }
  if (forwardQuote.quote_id === returnQuote.quote_id) {
    hold("forward and return quote IDs must differ");
  }

  const costSource = record(source.cost_policy, "cost_policy");
  exactKeys(
    costSource,
    [
      "capital_at_risk_usd",
      "capital_lock_seconds",
      "annual_capital_cost_bps",
      "risk_reserve_bps",
      "failure_reserve_usd",
      "safety_buffer_usd",
      "maximum_quote_skew_seconds",
    ],
    "cost_policy",
  );

  const capitalAtRisk = parseUsdMicros(
    costSource.capital_at_risk_usd,
    "cost_policy.capital_at_risk_usd",
  );
  if (capitalAtRisk !== startingValue) {
    hold("capital_at_risk_usd must equal starting_value_usd");
  }

  const capitalLockSeconds = safeInteger(
    costSource.capital_lock_seconds,
    "cost_policy.capital_lock_seconds",
    1,
    31_536_000,
  );
  if (
    capitalLockSeconds <
    forwardQuote.expected_fill_time_seconds + returnQuote.expected_fill_time_seconds
  ) {
    hold("capital_lock_seconds must cover both expected quote fill times");
  }

  const maximumQuoteSkewSeconds = safeInteger(
    costSource.maximum_quote_skew_seconds,
    "cost_policy.maximum_quote_skew_seconds",
    0,
    MAX_QUOTE_SKEW_SECONDS,
  );
  const quoteSkewSeconds = Math.ceil(
    Math.abs(
      Date.parse(forwardQuote.observed_at) - Date.parse(returnQuote.observed_at),
    ) / 1_000,
  );
  if (quoteSkewSeconds > maximumQuoteSkewSeconds) {
    hold("forward and return quote observation skew exceeds policy");
  }

  const latestQuoteObservedAt = Math.max(
    Date.parse(forwardQuote.observed_at),
    Date.parse(returnQuote.observed_at),
  );
  if (Date.parse(observedAt) < latestQuoteObservedAt) {
    hold("observed_at must not precede either quote observation");
  }

  return Object.freeze({
    schema: VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_INPUT_SCHEMA_V1,
    strategy_id: boundedString(source.strategy_id, "strategy_id", 256),
    observed_at: observedAt,
    evaluated_at: evaluatedAt,
    starting_asset: startingAsset,
    starting_amount: startingAmount,
    starting_value_usd: formatUsdMicros(startingValue),
    forward_quote: forwardQuote,
    return_quote: returnQuote,
    cost_policy: Object.freeze({
      capital_at_risk_usd: formatUsdMicros(capitalAtRisk),
      capital_lock_seconds: capitalLockSeconds,
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
      maximum_quote_skew_seconds: maximumQuoteSkewSeconds,
    }),
  });
}

export function observeSelfCapitalRoundTripPaperV1(
  value: unknown,
): SelfCapitalRoundTripPaperReceiptV1 {
  const input = parseSelfCapitalRoundTripPaperInputV1(value);
  const startingValue = parseUsdMicros(input.starting_value_usd, "starting_value_usd");
  const expectedEndingValue = parseUsdMicros(
    input.return_quote.expected_output_value_usd,
    "return_quote.expected_output_value_usd",
  );
  const minimumEndingValue = parseUsdMicros(
    input.return_quote.minimum_output_value_usd,
    "return_quote.minimum_output_value_usd",
  );
  const forwardGas = parseUsdMicros(input.forward_quote.gas_usd, "forward_quote.gas_usd");
  const returnGas = parseUsdMicros(input.return_quote.gas_usd, "return_quote.gas_usd");
  const capitalAtRisk = parseUsdMicros(
    input.cost_policy.capital_at_risk_usd,
    "cost_policy.capital_at_risk_usd",
  );
  const failureReserve = parseUsdMicros(
    input.cost_policy.failure_reserve_usd,
    "cost_policy.failure_reserve_usd",
  );
  const safetyBuffer = parseUsdMicros(
    input.cost_policy.safety_buffer_usd,
    "cost_policy.safety_buffer_usd",
  );

  const capitalLockCost = ceilDiv(
    capitalAtRisk *
      BigInt(input.cost_policy.annual_capital_cost_bps) *
      BigInt(input.cost_policy.capital_lock_seconds),
    BPS_DENOMINATOR * YEAR_SECONDS,
  );
  const riskReserve = ceilDiv(
    capitalAtRisk * BigInt(input.cost_policy.risk_reserve_bps),
    BPS_DENOMINATOR,
  );
  const totalExternalCost =
    forwardGas +
    returnGas +
    capitalLockCost +
    riskReserve +
    failureReserve +
    safetyBuffer;

  const expectedGrossPnl = expectedEndingValue - startingValue;
  const minimumGrossPnl = minimumEndingValue - startingValue;
  const expectedNetPnl = expectedGrossPnl - totalExternalCost;
  const minimumNetPnl = minimumGrossPnl - totalExternalCost;

  const quoteSkewSeconds = Math.ceil(
    Math.abs(
      Date.parse(input.forward_quote.observed_at) -
        Date.parse(input.return_quote.observed_at),
    ) / 1_000,
  );
  const quotesExpired =
    Date.parse(input.evaluated_at) >= input.forward_quote.quote_expiry_timestamp * 1_000 ||
    Date.parse(input.evaluated_at) >= input.return_quote.quote_expiry_timestamp * 1_000;

  const status: SelfCapitalRoundTripPaperStatusV1 = quotesExpired
    ? "expired"
    : minimumNetPnl > 0n
      ? "paper_positive"
      : expectedNetPnl > 0n
        ? "paper_marginal"
        : "paper_negative";

  const expectedNetBps = capitalAtRisk > 0n
    ? floorSignedDiv(expectedNetPnl * BPS_DENOMINATOR, capitalAtRisk)
    : 0n;
  const minimumNetBps = capitalAtRisk > 0n
    ? floorSignedDiv(minimumNetPnl * BPS_DENOMINATOR, capitalAtRisk)
    : 0n;

  const sourceInputSha = hashSelfCapitalRoundTripDocumentV1(input);
  if (!SHA256_HEX_PATTERN.test(sourceInputSha)) hold("source input SHA-256 differs");

  const receiptCore = Object.freeze({
    schema: VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_RECEIPT_SCHEMA_V1,
    marker: VOID_SELF_CAPITAL_ROUND_TRIP_PAPER_OBSERVER_V1,
    phase: "paper_only" as const,
    strategy_class: "self_capital_inventory_neutral_round_trip" as const,
    strategy_id: input.strategy_id,
    opportunity_id: sourceInputSha,
    source_input_sha256: sourceInputSha,
    status,
    observed_at: input.observed_at,
    evaluated_at: input.evaluated_at,
    quote_skew_seconds: quoteSkewSeconds,
    quotes_expired: quotesExpired,
    starting_asset: input.starting_asset,
    intermediate_asset: input.forward_quote.output_asset,
    starting_amount: input.starting_amount,
    round_trip_intermediate_amount: input.return_quote.input_amount,
    expected_ending_amount: input.return_quote.expected_output_amount,
    minimum_ending_amount: input.return_quote.minimum_output_amount,
    starting_value_usd: input.starting_value_usd,
    expected_ending_value_usd: input.return_quote.expected_output_value_usd,
    minimum_ending_value_usd: input.return_quote.minimum_output_value_usd,
    expected_gross_pnl_usd: formatUsdMicros(expectedGrossPnl),
    minimum_gross_pnl_usd: formatUsdMicros(minimumGrossPnl),
    paper_costs: Object.freeze({
      forward_gas_usd: input.forward_quote.gas_usd,
      return_gas_usd: input.return_quote.gas_usd,
      capital_lock_cost_usd: formatUsdMicros(capitalLockCost),
      risk_reserve_usd: formatUsdMicros(riskReserve),
      failure_reserve_usd: input.cost_policy.failure_reserve_usd,
      safety_buffer_usd: input.cost_policy.safety_buffer_usd,
      total_external_cost_usd: formatUsdMicros(totalExternalCost),
    }),
    expected_net_pnl_usd: formatUsdMicros(expectedNetPnl),
    minimum_net_pnl_usd: formatUsdMicros(minimumNetPnl),
    expected_net_pnl_bps_of_capital: expectedNetBps.toString(),
    minimum_net_pnl_bps_of_capital: minimumNetBps.toString(),
    internal_app_fee_revenue_usd: "0.000000" as const,
    internal_app_fee_counted_as_profit: false as const,
    round_trip_inventory_neutral: true as const,
    starting_asset_restored: true as const,
    provider_fees_included_in_quotes: true as const,
    price_impact_included_in_quotes: true as const,
    credential_access_performed: false as const,
    raw_response_retention: false as const,
    transaction_payload_retention: false as const,
    network_access_performed: false as const,
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
    receipt_sha256: hashSelfCapitalRoundTripDocumentV1(receiptCore),
  });
}
