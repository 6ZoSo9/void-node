import { createHash } from "node:crypto";

export const VOID_EXTERNAL_OPPORTUNITY_OBSERVER_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_OBSERVER_V1" as const;

export const VOID_ACROSS_PAPER_QUOTE_INPUT_SCHEMA_V1 =
  "void-across-paper-quote-input-v1" as const;

export const VOID_EXTERNAL_OPPORTUNITY_RECEIPT_SCHEMA_V1 =
  "void-external-opportunity-receipt-v1" as const;

const YEAR_SECONDS = 31_536_000n;
const BPS_DENOMINATOR = 10_000n;
const USD_SCALE = 1_000_000n;

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;

type RecordValue = Record<string, unknown>;

export type AcrossRevenueModelV1 =
  | "integrator_app_fee"
  | "relayer_margin"
  | "other_documented";

export type AcrossPaperQuoteInputV1 = Readonly<{
  schema: typeof VOID_ACROSS_PAPER_QUOTE_INPUT_SCHEMA_V1;
  observed_at: string;
  evaluated_at: string;
  quote_id: string;
  quote_expiry_timestamp: number;
  route: Readonly<{
    origin_chain_id: number;
    destination_chain_id: number;
    input_token: Readonly<{
      address: string;
      symbol: string;
      decimals: number;
    }>;
    output_token: Readonly<{
      address: string;
      symbol: string;
      decimals: number;
    }>;
  }>;
  input_amount: string;
  expected_output_amount: string;
  min_output_amount: string;
  expected_fill_time_sec: number;
  fee_summary: Readonly<{
    total_fee_amount: string;
    total_fee_usd: string;
    origin_gas_usd: string;
  }>;
  revenue_assumption: Readonly<{
    model: AcrossRevenueModelV1;
    gross_revenue_usd: string;
    evidence_label: string;
  }>;
  cost_assumptions: Readonly<{
    destination_gas_usd: string;
    capital_at_risk_usd: string;
    capital_lock_seconds: number;
    annual_capital_cost_bps: number;
    risk_haircut_bps: number;
    safety_buffer_usd: string;
  }>;
}>;

export type ExternalOpportunityStatusV1 =
  | "paper_positive"
  | "paper_negative"
  | "expired";

export type ExternalOpportunityReceiptV1 = Readonly<{
  schema: typeof VOID_EXTERNAL_OPPORTUNITY_RECEIPT_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_OBSERVER_V1;
  provider: "across";
  phase: "paper_only";
  execution_authorized: false;
  opportunity_id: string;
  source_quote_sha256: string;
  quote_id: string;
  observed_at: string;
  evaluated_at: string;
  quote_expiry_timestamp: number;
  status: ExternalOpportunityStatusV1;
  quote_expired: boolean;
  route: AcrossPaperQuoteInputV1["route"];
  input_amount: string;
  expected_output_amount: string;
  min_output_amount: string;
  expected_fill_time_sec: number;
  total_user_fee_amount: string;
  total_user_fee_usd: string;
  revenue_model: AcrossRevenueModelV1;
  revenue_evidence_label: string;
  paper_gross_revenue_usd: string;
  paper_costs: Readonly<{
    origin_gas_usd: string;
    destination_gas_usd: string;
    capital_lock_cost_usd: string;
    risk_haircut_usd: string;
    safety_buffer_usd: string;
    total_cost_usd: string;
  }>;
  paper_net_profit_usd: string;
  paper_net_profit_bps_of_capital: string;
  receipt_sha256: string;
}>;

function hold(message: string): never {
  throw new Error(`HOLD: ${message}`);
}

function record(value: unknown, label: string): RecordValue {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
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

function stringField(
  value: unknown,
  label: string,
  maxLength = 512,
): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maxLength
  ) {
    hold(`${label} must be a non-empty bounded string`);
  }
  return value;
}

function canonicalInstant(value: unknown, label: string): string {
  const text = stringField(value, label, 64);
  const parsed = Date.parse(text);

  if (
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString() !== text
  ) {
    hold(`${label} must be a canonical UTC millisecond instant`);
  }

  return text;
}

function positiveInteger(
  value: unknown,
  label: string,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < 1 ||
    (value as number) > maximum
  ) {
    hold(`${label} must be a positive safe integer`);
  }

  return value as number;
}

function boundedInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < minimum ||
    (value as number) > maximum
  ) {
    hold(`${label} is outside its allowed range`);
  }

  return value as number;
}

function canonicalUnsignedInteger(
  value: unknown,
  label: string,
): string {
  const text = stringField(value, label, 128);

  if (!/^(0|[1-9][0-9]*)$/.test(text)) {
    hold(`${label} must be a canonical unsigned integer string`);
  }

  return text;
}

function tokenAddress(value: unknown, label: string): string {
  const text = stringField(value, label, 128);

  if (!/^0x[0-9a-fA-F]{40}$/.test(text)) {
    hold(`${label} must be a 20-byte EVM address`);
  }

  return text.toLowerCase();
}

function tokenSymbol(value: unknown, label: string): string {
  const text = stringField(value, label, 24);

  if (!/^[A-Za-z0-9._-]+$/.test(text)) {
    hold(`${label} contains unsupported characters`);
  }

  return text;
}

function parseUsdMicros(value: unknown, label: string): bigint {
  const text = stringField(value, label, 64);

  if (!/^(0|[1-9][0-9]*)(\.[0-9]{1,6})?$/.test(text)) {
    hold(`${label} must be a non-negative USD decimal with at most 6 places`);
  }

  const [whole, fraction = ""] = text.split(".");
  const padded = `${fraction}000000`.slice(0, 6);

  return BigInt(whole) * USD_SCALE + BigInt(padded);
}

function formatUsdMicros(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / USD_SCALE;
  const fraction = (absolute % USD_SCALE)
    .toString()
    .padStart(6, "0");

  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) {
    hold("ceilDiv received invalid values");
  }

  return (numerator + denominator - 1n) / denominator;
}

function jsonValue(value: unknown, label: string): JsonValue {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      hold(`${label} contains a non-finite number`);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return Object.freeze(
      value.map((entry, index) =>
        jsonValue(entry, `${label}[${index}]`),
      ),
    );
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

export function canonicalExternalOpportunityJsonV1(
  value: unknown,
): string {
  return JSON.stringify(jsonValue(value, "document"));
}

export function hashExternalOpportunityDocumentV1(
  value: unknown,
): string {
  return createHash("sha256")
    .update(canonicalExternalOpportunityJsonV1(value), "utf8")
    .digest("hex");
}

function parseToken(
  value: unknown,
  label: string,
): AcrossPaperQuoteInputV1["route"]["input_token"] {
  const source = record(value, label);
  exactKeys(source, ["address", "symbol", "decimals"], label);

  return Object.freeze({
    address: tokenAddress(source.address, `${label}.address`),
    symbol: tokenSymbol(source.symbol, `${label}.symbol`),
    decimals: boundedInteger(
      source.decimals,
      `${label}.decimals`,
      0,
      36,
    ),
  });
}

export function parseAcrossPaperQuoteInputV1(
  value: unknown,
): AcrossPaperQuoteInputV1 {
  const source = record(value, "Across paper quote input");

  exactKeys(
    source,
    [
      "schema",
      "observed_at",
      "evaluated_at",
      "quote_id",
      "quote_expiry_timestamp",
      "route",
      "input_amount",
      "expected_output_amount",
      "min_output_amount",
      "expected_fill_time_sec",
      "fee_summary",
      "revenue_assumption",
      "cost_assumptions",
    ],
    "Across paper quote input",
  );

  if (source.schema !== VOID_ACROSS_PAPER_QUOTE_INPUT_SCHEMA_V1) {
    hold("Across paper quote schema differs");
  }

  const observedAt = canonicalInstant(
    source.observed_at,
    "observed_at",
  );
  const evaluatedAt = canonicalInstant(
    source.evaluated_at,
    "evaluated_at",
  );

  if (Date.parse(evaluatedAt) < Date.parse(observedAt)) {
    hold("evaluated_at must not precede observed_at");
  }

  const routeSource = record(source.route, "route");
  exactKeys(
    routeSource,
    [
      "origin_chain_id",
      "destination_chain_id",
      "input_token",
      "output_token",
    ],
    "route",
  );

  const originChainId = positiveInteger(
    routeSource.origin_chain_id,
    "route.origin_chain_id",
  );
  const destinationChainId = positiveInteger(
    routeSource.destination_chain_id,
    "route.destination_chain_id",
  );

  if (originChainId === destinationChainId) {
    hold("Across route must cross distinct chains");
  }

  const inputAmount = canonicalUnsignedInteger(
    source.input_amount,
    "input_amount",
  );
  const expectedOutputAmount = canonicalUnsignedInteger(
    source.expected_output_amount,
    "expected_output_amount",
  );
  const minOutputAmount = canonicalUnsignedInteger(
    source.min_output_amount,
    "min_output_amount",
  );

  if (BigInt(expectedOutputAmount) < BigInt(minOutputAmount)) {
    hold("expected_output_amount is below min_output_amount");
  }

  if (
    BigInt(inputAmount) < 1n ||
    BigInt(expectedOutputAmount) < 1n ||
    BigInt(minOutputAmount) < 1n
  ) {
    hold("quote amounts must be greater than zero");
  }

  const feeSource = record(source.fee_summary, "fee_summary");
  exactKeys(
    feeSource,
    [
      "total_fee_amount",
      "total_fee_usd",
      "origin_gas_usd",
    ],
    "fee_summary",
  );

  const revenueSource = record(
    source.revenue_assumption,
    "revenue_assumption",
  );
  exactKeys(
    revenueSource,
    ["model", "gross_revenue_usd", "evidence_label"],
    "revenue_assumption",
  );

  const model = stringField(
    revenueSource.model,
    "revenue_assumption.model",
    64,
  );

  if (
    model !== "integrator_app_fee" &&
    model !== "relayer_margin" &&
    model !== "other_documented"
  ) {
    hold("revenue_assumption.model is unsupported");
  }

  const costSource = record(
    source.cost_assumptions,
    "cost_assumptions",
  );
  exactKeys(
    costSource,
    [
      "destination_gas_usd",
      "capital_at_risk_usd",
      "capital_lock_seconds",
      "annual_capital_cost_bps",
      "risk_haircut_bps",
      "safety_buffer_usd",
    ],
    "cost_assumptions",
  );

  parseUsdMicros(feeSource.total_fee_usd, "total_fee_usd");
  parseUsdMicros(feeSource.origin_gas_usd, "origin_gas_usd");
  parseUsdMicros(
    revenueSource.gross_revenue_usd,
    "gross_revenue_usd",
  );
  parseUsdMicros(
    costSource.destination_gas_usd,
    "destination_gas_usd",
  );
  parseUsdMicros(
    costSource.capital_at_risk_usd,
    "capital_at_risk_usd",
  );
  parseUsdMicros(
    costSource.safety_buffer_usd,
    "safety_buffer_usd",
  );

  return Object.freeze({
    schema: VOID_ACROSS_PAPER_QUOTE_INPUT_SCHEMA_V1,
    observed_at: observedAt,
    evaluated_at: evaluatedAt,
    quote_id: stringField(source.quote_id, "quote_id", 256),
    quote_expiry_timestamp: positiveInteger(
      source.quote_expiry_timestamp,
      "quote_expiry_timestamp",
      4_102_444_800,
    ),
    route: Object.freeze({
      origin_chain_id: originChainId,
      destination_chain_id: destinationChainId,
      input_token: parseToken(
        routeSource.input_token,
        "route.input_token",
      ),
      output_token: parseToken(
        routeSource.output_token,
        "route.output_token",
      ),
    }),
    input_amount: inputAmount,
    expected_output_amount: expectedOutputAmount,
    min_output_amount: minOutputAmount,
    expected_fill_time_sec: positiveInteger(
      source.expected_fill_time_sec,
      "expected_fill_time_sec",
      86_400,
    ),
    fee_summary: Object.freeze({
      total_fee_amount: canonicalUnsignedInteger(
        feeSource.total_fee_amount,
        "fee_summary.total_fee_amount",
      ),
      total_fee_usd: formatUsdMicros(
        parseUsdMicros(
          feeSource.total_fee_usd,
          "fee_summary.total_fee_usd",
        ),
      ),
      origin_gas_usd: formatUsdMicros(
        parseUsdMicros(
          feeSource.origin_gas_usd,
          "fee_summary.origin_gas_usd",
        ),
      ),
    }),
    revenue_assumption: Object.freeze({
      model: model as AcrossRevenueModelV1,
      gross_revenue_usd: formatUsdMicros(
        parseUsdMicros(
          revenueSource.gross_revenue_usd,
          "revenue_assumption.gross_revenue_usd",
        ),
      ),
      evidence_label: stringField(
        revenueSource.evidence_label,
        "revenue_assumption.evidence_label",
        256,
      ),
    }),
    cost_assumptions: Object.freeze({
      destination_gas_usd: formatUsdMicros(
        parseUsdMicros(
          costSource.destination_gas_usd,
          "cost_assumptions.destination_gas_usd",
        ),
      ),
      capital_at_risk_usd: formatUsdMicros(
        parseUsdMicros(
          costSource.capital_at_risk_usd,
          "cost_assumptions.capital_at_risk_usd",
        ),
      ),
      capital_lock_seconds: positiveInteger(
        costSource.capital_lock_seconds,
        "cost_assumptions.capital_lock_seconds",
        31_536_000,
      ),
      annual_capital_cost_bps: boundedInteger(
        costSource.annual_capital_cost_bps,
        "cost_assumptions.annual_capital_cost_bps",
        0,
        100_000,
      ),
      risk_haircut_bps: boundedInteger(
        costSource.risk_haircut_bps,
        "cost_assumptions.risk_haircut_bps",
        0,
        10_000,
      ),
      safety_buffer_usd: formatUsdMicros(
        parseUsdMicros(
          costSource.safety_buffer_usd,
          "cost_assumptions.safety_buffer_usd",
        ),
      ),
    }),
  });
}

export function observeAcrossPaperQuoteV1(
  value: unknown,
): ExternalOpportunityReceiptV1 {
  const input = parseAcrossPaperQuoteInputV1(value);

  const grossRevenue = parseUsdMicros(
    input.revenue_assumption.gross_revenue_usd,
    "gross_revenue_usd",
  );
  const originGas = parseUsdMicros(
    input.fee_summary.origin_gas_usd,
    "origin_gas_usd",
  );
  const destinationGas = parseUsdMicros(
    input.cost_assumptions.destination_gas_usd,
    "destination_gas_usd",
  );
  const capitalAtRisk = parseUsdMicros(
    input.cost_assumptions.capital_at_risk_usd,
    "capital_at_risk_usd",
  );
  const safetyBuffer = parseUsdMicros(
    input.cost_assumptions.safety_buffer_usd,
    "safety_buffer_usd",
  );

  const capitalLockCost = ceilDiv(
    capitalAtRisk *
      BigInt(input.cost_assumptions.annual_capital_cost_bps) *
      BigInt(input.cost_assumptions.capital_lock_seconds),
    BPS_DENOMINATOR * YEAR_SECONDS,
  );

  const riskHaircut = ceilDiv(
    grossRevenue *
      BigInt(input.cost_assumptions.risk_haircut_bps),
    BPS_DENOMINATOR,
  );

  const totalCost =
    originGas +
    destinationGas +
    capitalLockCost +
    riskHaircut +
    safetyBuffer;

  const netProfit = grossRevenue - totalCost;
  const quoteExpired =
    Date.parse(input.evaluated_at) >=
    input.quote_expiry_timestamp * 1_000;

  const status: ExternalOpportunityStatusV1 = quoteExpired
    ? "expired"
    : netProfit > 0n
      ? "paper_positive"
      : "paper_negative";

  const netProfitBps =
    capitalAtRisk > 0n
      ? (netProfit * BPS_DENOMINATOR) / capitalAtRisk
      : 0n;

  const sourceQuote = Object.freeze({
    provider: "across",
    quote_id: input.quote_id,
    route: input.route,
    input_amount: input.input_amount,
    expected_output_amount: input.expected_output_amount,
    min_output_amount: input.min_output_amount,
    expected_fill_time_sec: input.expected_fill_time_sec,
    quote_expiry_timestamp: input.quote_expiry_timestamp,
    fee_summary: input.fee_summary,
  });

  const opportunityId = hashExternalOpportunityDocumentV1(input);
  const sourceQuoteSha = hashExternalOpportunityDocumentV1(
    sourceQuote,
  );

  const receiptCore = Object.freeze({
    schema: VOID_EXTERNAL_OPPORTUNITY_RECEIPT_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_OBSERVER_V1,
    provider: "across" as const,
    phase: "paper_only" as const,
    execution_authorized: false as const,
    opportunity_id: opportunityId,
    source_quote_sha256: sourceQuoteSha,
    quote_id: input.quote_id,
    observed_at: input.observed_at,
    evaluated_at: input.evaluated_at,
    quote_expiry_timestamp: input.quote_expiry_timestamp,
    status,
    quote_expired: quoteExpired,
    route: input.route,
    input_amount: input.input_amount,
    expected_output_amount: input.expected_output_amount,
    min_output_amount: input.min_output_amount,
    expected_fill_time_sec: input.expected_fill_time_sec,
    total_user_fee_amount:
      input.fee_summary.total_fee_amount,
    total_user_fee_usd: input.fee_summary.total_fee_usd,
    revenue_model: input.revenue_assumption.model,
    revenue_evidence_label:
      input.revenue_assumption.evidence_label,
    paper_gross_revenue_usd: formatUsdMicros(grossRevenue),
    paper_costs: Object.freeze({
      origin_gas_usd: formatUsdMicros(originGas),
      destination_gas_usd: formatUsdMicros(destinationGas),
      capital_lock_cost_usd:
        formatUsdMicros(capitalLockCost),
      risk_haircut_usd: formatUsdMicros(riskHaircut),
      safety_buffer_usd: formatUsdMicros(safetyBuffer),
      total_cost_usd: formatUsdMicros(totalCost),
    }),
    paper_net_profit_usd: formatUsdMicros(netProfit),
    paper_net_profit_bps_of_capital:
      netProfitBps.toString(),
  });

  return Object.freeze({
    ...receiptCore,
    receipt_sha256:
      hashExternalOpportunityDocumentV1(receiptCore),
  });
}
