import * as https from "node:https";
import type { IncomingMessage } from "node:http";

import {
  VOID_ACROSS_PAPER_QUOTE_INPUT_SCHEMA_V1,
  observeAcrossPaperQuoteV1,
  type AcrossPaperQuoteInputV1,
  type ExternalOpportunityReceiptV1,
} from "./across_quote_observer_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_ACROSS_QUOTE_INGESTION_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_ACROSS_QUOTE_INGESTION_V1" as const;

export const VOID_ACROSS_QUOTE_INGESTION_RESULT_SCHEMA_V1 =
  "void-across-quote-ingestion-result-v1" as const;

const ACROSS_API_ORIGIN = "https://app.across.to";
const ACROSS_SWAP_APPROVAL_PATH = "/api/swap/approval";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_048_576;
const USD_SCALE_DIGITS = 6;

type RecordValue = Record<string, unknown>;

export type AcrossSwapApprovalTradeTypeV1 =
  | "exactInput"
  | "minOutput"
  | "exactOutput";

export type AcrossSwapApprovalQueryV1 = Readonly<{
  trade_type: AcrossSwapApprovalTradeTypeV1;
  amount: string;
  input_token: string;
  output_token: string;
  origin_chain_id: number;
  destination_chain_id: number;
  depositor: string;
  recipient?: string;
  integrator_id: string;
  app_fee?: string;
  app_fee_recipient?: string;
}>;

export type AcrossQuoteObservationPolicyV1 = Readonly<{
  capital_at_risk_usd: string;
  capital_lock_seconds: number;
  annual_capital_cost_bps: number;
  risk_haircut_bps: number;
  safety_buffer_usd: string;
}>;

export type AcrossSwapApprovalIngestionInputV1 = Readonly<{
  api_key: string;
  query: AcrossSwapApprovalQueryV1;
  policy: AcrossQuoteObservationPolicyV1;
  timeout_ms?: number;
}>;

export type AcrossReadonlyHttpsRequestV1 = Readonly<{
  method: "GET";
  url: string;
  headers: Readonly<Record<string, string>>;
  timeout_ms: number;
  max_response_bytes: number;
}>;

export type AcrossReadonlyHttpsResponseV1 = Readonly<{
  status_code: number;
  content_type: string;
  body: string;
}>;

export type AcrossReadonlyTransportV1 = (
  request: AcrossReadonlyHttpsRequestV1,
) => Promise<AcrossReadonlyHttpsResponseV1>;

export type AcrossQuoteClockV1 = () => string;

export type AcrossSwapApprovalIngestionResultV1 = Readonly<{
  schema: typeof VOID_ACROSS_QUOTE_INGESTION_RESULT_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_ACROSS_QUOTE_INGESTION_V1;
  provider: "across";
  endpoint: "https://app.across.to/api/swap/approval";
  method: "GET";
  observed_at: string;
  evaluated_at: string;
  quote_id: string;
  response_bytes: number;
  credential_retention: false;
  raw_response_retention: false;
  transaction_payload_retention: false;
  network_mutation_performed: false;
  wallet_or_key_access_performed: false;
  transaction_construction_performed: false;
  transaction_submission_performed: false;
  live_execution_authorized: false;
  paper_input: AcrossPaperQuoteInputV1;
  paper_receipt: ExternalOpportunityReceiptV1;
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

function allowedKeys(
  value: RecordValue,
  allowed: readonly string[],
  label: string,
): void {
  const allowedSet = new Set(allowed);

  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      hold(`${label} contains unexpected key: ${key}`);
    }
  }
}

function requiredString(
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

  if (/[\u0000-\u001f\u007f]/.test(value)) {
    hold(`${label} contains a control character`);
  }

  return value;
}

function canonicalUnsignedInteger(
  value: unknown,
  label: string,
): string {
  const text = requiredString(value, label, 128);

  if (!/^(0|[1-9][0-9]*)$/.test(text)) {
    hold(`${label} must be a canonical unsigned integer`);
  }

  return text;
}

function positiveInteger(
  value: unknown,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    hold(`${label} must be a positive safe integer`);
  }

  return value;
}

function boundedInteger(
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
    hold(`${label} must be an integer in range`);
  }

  return value;
}

function canonicalInstant(
  value: unknown,
  label: string,
): string {
  const text = requiredString(value, label, 64);
  const milliseconds = Date.parse(text);

  if (!Number.isFinite(milliseconds)) {
    hold(`${label} must be a valid instant`);
  }

  const canonical = new Date(milliseconds).toISOString();

  if (canonical !== text) {
    hold(`${label} must be a canonical ISO-8601 instant`);
  }

  return canonical;
}

function evmAddress(
  value: unknown,
  label: string,
): string {
  const text = requiredString(value, label, 42);

  if (!/^0x[0-9a-fA-F]{40}$/.test(text)) {
    hold(`${label} must be an EVM address`);
  }

  return text.toLowerCase();
}

function tokenSymbol(
  value: unknown,
  label: string,
): string {
  const text = requiredString(value, label, 32);

  if (!/^[A-Za-z0-9._-]{1,32}$/.test(text)) {
    hold(`${label} has invalid token-symbol characters`);
  }

  return text;
}

function integratorId(
  value: unknown,
  label: string,
): string {
  const text = requiredString(value, label, 6);

  if (!/^0x[0-9a-fA-F]{4}$/.test(text)) {
    hold(`${label} must be a two-byte 0x-prefixed hex value`);
  }

  return text.toLowerCase();
}

function apiKey(
  value: unknown,
  label: string,
): string {
  const text = requiredString(value, label, 1_024);

  if (text.trim() !== text || /\s/.test(text)) {
    hold(`${label} must not contain whitespace`);
  }

  return text;
}

function canonicalDecimal(
  value: unknown,
  label: string,
  maximumFractionDigits = 36,
): string {
  const text = requiredString(value, label, 128);
  const pattern = new RegExp(
    `^(0|[1-9][0-9]*)(\\.[0-9]{1,${maximumFractionDigits}})?$`,
  );

  if (!pattern.test(text)) {
    hold(`${label} must be a canonical non-negative decimal`);
  }

  return text;
}

function decimalParts(
  value: string,
): Readonly<{ whole: string; fraction: string }> {
  const separator = value.indexOf(".");

  return Object.freeze({
    whole: separator === -1 ? value : value.slice(0, separator),
    fraction: separator === -1 ? "" : value.slice(separator + 1),
  });
}

function formatUsdMicros(
  micros: bigint,
): string {
  if (micros < 0n) {
    hold("USD micros must not be negative");
  }

  const whole = micros / 1_000_000n;
  const fraction = (micros % 1_000_000n)
    .toString()
    .padStart(USD_SCALE_DIGITS, "0");

  return `${whole}.${fraction}`;
}

function floorUsdMicros(
  value: unknown,
  label: string,
): string {
  const text = canonicalDecimal(value, label);
  const parts = decimalParts(text);
  const fraction = `${parts.fraction}000000`.slice(
    0,
    USD_SCALE_DIGITS,
  );

  return formatUsdMicros(
    BigInt(parts.whole) * 1_000_000n +
      BigInt(fraction),
  );
}

function ceilUsdMicros(
  value: unknown,
  label: string,
): string {
  const text = canonicalDecimal(value, label);
  const parts = decimalParts(text);
  const kept = `${parts.fraction}000000`.slice(
    0,
    USD_SCALE_DIGITS,
  );
  const discarded = parts.fraction.slice(USD_SCALE_DIGITS);
  const increment = /[1-9]/.test(discarded) ? 1n : 0n;

  return formatUsdMicros(
    BigInt(parts.whole) * 1_000_000n +
      BigInt(kept) +
      increment,
  );
}

function canonicalAppFee(
  value: unknown,
  label: string,
): string {
  const text = canonicalDecimal(value, label, 6);
  const parts = decimalParts(text);
  const scaled = BigInt(parts.whole) * 1_000_000n +
    BigInt(`${parts.fraction}000000`.slice(0, 6));

  if (scaled > 1_000_000n) {
    hold(`${label} must be between zero and one`);
  }

  return text;
}

function decimalGreaterThanZero(
  value: string,
): boolean {
  const parts = decimalParts(value);

  return (
    BigInt(parts.whole) > 0n ||
    /[1-9]/.test(parts.fraction)
  );
}

function parseQuery(
  value: unknown,
): AcrossSwapApprovalQueryV1 {
  const source = record(value, "query");

  allowedKeys(
    source,
    [
      "trade_type",
      "amount",
      "input_token",
      "output_token",
      "origin_chain_id",
      "destination_chain_id",
      "depositor",
      "recipient",
      "integrator_id",
      "app_fee",
      "app_fee_recipient",
    ],
    "query",
  );

  const tradeType = requiredString(
    source.trade_type,
    "query.trade_type",
    16,
  );

  if (
    tradeType !== "exactInput" &&
    tradeType !== "minOutput" &&
    tradeType !== "exactOutput"
  ) {
    hold("query.trade_type differs");
  }

  const originChainId = positiveInteger(
    source.origin_chain_id,
    "query.origin_chain_id",
  );
  const destinationChainId = positiveInteger(
    source.destination_chain_id,
    "query.destination_chain_id",
  );

  if (originChainId === destinationChainId) {
    hold("query must cross distinct chains");
  }

  const recipient =
    source.recipient === undefined
      ? undefined
      : evmAddress(source.recipient, "query.recipient");

  const appFee =
    source.app_fee === undefined
      ? undefined
      : canonicalAppFee(source.app_fee, "query.app_fee");

  const appFeeRecipient =
    source.app_fee_recipient === undefined
      ? undefined
      : evmAddress(
          source.app_fee_recipient,
          "query.app_fee_recipient",
        );

  if (
    appFee !== undefined &&
    decimalGreaterThanZero(appFee) &&
    appFeeRecipient === undefined
  ) {
    hold("query.app_fee_recipient is required for nonzero app_fee");
  }

  if (appFee === undefined && appFeeRecipient !== undefined) {
    hold("query.app_fee_recipient requires app_fee");
  }

  return Object.freeze({
    trade_type: tradeType,
    amount: canonicalUnsignedInteger(
      source.amount,
      "query.amount",
    ),
    input_token: evmAddress(
      source.input_token,
      "query.input_token",
    ),
    output_token: evmAddress(
      source.output_token,
      "query.output_token",
    ),
    origin_chain_id: originChainId,
    destination_chain_id: destinationChainId,
    depositor: evmAddress(
      source.depositor,
      "query.depositor",
    ),
    ...(recipient === undefined ? {} : { recipient }),
    integrator_id: integratorId(
      source.integrator_id,
      "query.integrator_id",
    ),
    ...(appFee === undefined ? {} : { app_fee: appFee }),
    ...(appFeeRecipient === undefined
      ? {}
      : { app_fee_recipient: appFeeRecipient }),
  });
}

function parsePolicy(
  value: unknown,
): AcrossQuoteObservationPolicyV1 {
  const source = record(value, "policy");

  allowedKeys(
    source,
    [
      "capital_at_risk_usd",
      "capital_lock_seconds",
      "annual_capital_cost_bps",
      "risk_haircut_bps",
      "safety_buffer_usd",
    ],
    "policy",
  );

  return Object.freeze({
    capital_at_risk_usd: floorUsdMicros(
      source.capital_at_risk_usd,
      "policy.capital_at_risk_usd",
    ),
    capital_lock_seconds: boundedInteger(
      source.capital_lock_seconds,
      "policy.capital_lock_seconds",
      0,
      31_536_000,
    ),
    annual_capital_cost_bps: boundedInteger(
      source.annual_capital_cost_bps,
      "policy.annual_capital_cost_bps",
      0,
      100_000,
    ),
    risk_haircut_bps: boundedInteger(
      source.risk_haircut_bps,
      "policy.risk_haircut_bps",
      0,
      10_000,
    ),
    safety_buffer_usd: ceilUsdMicros(
      source.safety_buffer_usd,
      "policy.safety_buffer_usd",
    ),
  });
}

function parseInput(
  value: unknown,
): Readonly<{
  api_key: string;
  query: AcrossSwapApprovalQueryV1;
  policy: AcrossQuoteObservationPolicyV1;
  timeout_ms: number;
}> {
  const source = record(value, "ingestion input");

  allowedKeys(
    source,
    ["api_key", "query", "policy", "timeout_ms"],
    "ingestion input",
  );

  return Object.freeze({
    api_key: apiKey(source.api_key, "api_key"),
    query: parseQuery(source.query),
    policy: parsePolicy(source.policy),
    timeout_ms:
      source.timeout_ms === undefined
        ? DEFAULT_TIMEOUT_MS
        : boundedInteger(
            source.timeout_ms,
            "timeout_ms",
            1_000,
            30_000,
          ),
  });
}

function buildUrl(
  query: AcrossSwapApprovalQueryV1,
): URL {
  const url = new URL(
    ACROSS_SWAP_APPROVAL_PATH,
    ACROSS_API_ORIGIN,
  );

  url.searchParams.set("tradeType", query.trade_type);
  url.searchParams.set("amount", query.amount);
  url.searchParams.set("inputToken", query.input_token);
  url.searchParams.set("outputToken", query.output_token);
  url.searchParams.set(
    "originChainId",
    query.origin_chain_id.toString(),
  );
  url.searchParams.set(
    "destinationChainId",
    query.destination_chain_id.toString(),
  );
  url.searchParams.set("depositor", query.depositor);
  url.searchParams.set("integratorId", query.integrator_id);

  if (query.recipient !== undefined) {
    url.searchParams.set("recipient", query.recipient);
  }

  if (query.app_fee !== undefined) {
    url.searchParams.set("appFee", query.app_fee);
  }

  if (query.app_fee_recipient !== undefined) {
    url.searchParams.set(
      "appFeeRecipient",
      query.app_fee_recipient,
    );
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "app.across.to" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== ACROSS_SWAP_APPROVAL_PATH
  ) {
    hold("Across Swap API URL boundary differs");
  }

  return url;
}

function normalizedContentType(
  value: string | readonly string[] | undefined,
): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    return "";
  }

  return value.join(",");
}

export async function acrossSwapApiReadonlyHttpsGetV1(
  input: AcrossReadonlyHttpsRequestV1,
): Promise<AcrossReadonlyHttpsResponseV1> {
  if (input.method !== "GET") {
    hold("Across transport permits GET only");
  }

  const url = new URL(input.url);

  if (
    url.protocol !== "https:" ||
    url.hostname !== "app.across.to" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== ACROSS_SWAP_APPROVAL_PATH
  ) {
    hold("Across transport exact-host boundary differs");
  }

  if (
    !Number.isSafeInteger(input.timeout_ms) ||
    input.timeout_ms < 1_000 ||
    input.timeout_ms > 30_000
  ) {
    hold("Across transport timeout differs");
  }

  if (
    input.max_response_bytes !== MAX_RESPONSE_BYTES
  ) {
    hold("Across transport response-size boundary differs");
  }

  return await new Promise<AcrossReadonlyHttpsResponseV1>(
    (resolve, reject) => {
      let settled = false;

      const fail = (message: string): void => {
        if (settled) {
          return;
        }

        settled = true;
        reject(new Error(`HOLD: ${message}`));
      };

      const request = https.request(
        url,
        {
          method: "GET",
          headers: { ...input.headers },
        },
        (response: IncomingMessage) => {
          const statusCode = response.statusCode ?? 0;

          if (statusCode >= 300 && statusCode < 400) {
            response.resume();
            fail("Across transport redirects are forbidden");
            return;
          }

          const chunks: Buffer[] = [];
          let size = 0;

          response.on("data", (chunk: Buffer | string) => {
            if (settled) {
              return;
            }

            const buffer =
              typeof chunk === "string"
                ? Buffer.from(chunk)
                : chunk;

            size += buffer.length;

            if (size > input.max_response_bytes) {
              response.destroy();
              fail("Across response exceeds byte limit");
              return;
            }

            chunks.push(buffer);
          });

          response.on("end", () => {
            if (settled) {
              return;
            }

            settled = true;

            resolve(
              Object.freeze({
                status_code: statusCode,
                content_type: normalizedContentType(
                  response.headers["content-type"],
                ),
                body: Buffer.concat(chunks).toString("utf8"),
              }),
            );
          });

          response.on("error", () => {
            fail("Across response stream failed");
          });
        },
      );

      request.setTimeout(input.timeout_ms, () => {
        request.destroy();
        fail("Across read-only request timed out");
      });

      request.on("error", () => {
        fail("Across read-only HTTPS request failed");
      });

      request.end();
    },
  );
}

function parseToken(
  value: unknown,
  label: string,
): Readonly<{
  address: string;
  symbol: string;
  decimals: number;
  chain_id: number;
}> {
  const source = record(value, label);

  return Object.freeze({
    address: evmAddress(source.address, `${label}.address`),
    symbol: tokenSymbol(source.symbol, `${label}.symbol`),
    decimals: boundedInteger(
      source.decimals,
      `${label}.decimals`,
      0,
      36,
    ),
    chain_id: positiveInteger(
      source.chainId,
      `${label}.chainId`,
    ),
  });
}

function feeAmount(
  value: unknown,
  label: string,
): Readonly<{
  amount: string;
  amount_usd_floor: string;
  amount_usd_ceil: string;
  source: RecordValue;
}> {
  const source = record(value, label);

  return Object.freeze({
    amount: canonicalUnsignedInteger(
      source.amount,
      `${label}.amount`,
    ),
    amount_usd_floor: floorUsdMicros(
      source.amountUsd,
      `${label}.amountUsd`,
    ),
    amount_usd_ceil: ceilUsdMicros(
      source.amountUsd,
      `${label}.amountUsd`,
    ),
    source,
  });
}

function parseResponseBody(
  value: unknown,
  query: AcrossSwapApprovalQueryV1,
  policy: AcrossQuoteObservationPolicyV1,
  observedAt: string,
  evaluatedAt: string,
): Readonly<{
  quote_id: string;
  paper_input: AcrossPaperQuoteInputV1;
}> {
  const source = record(value, "Across response");

  const inputToken = parseToken(
    source.inputToken,
    "Across response.inputToken",
  );
  const outputToken = parseToken(
    source.outputToken,
    "Across response.outputToken",
  );

  if (
    inputToken.address !== query.input_token ||
    inputToken.chain_id !== query.origin_chain_id
  ) {
    hold("Across response input token or chain differs");
  }

  if (
    outputToken.address !== query.output_token ||
    outputToken.chain_id !== query.destination_chain_id
  ) {
    hold("Across response output token or chain differs");
  }

  const inputAmount = canonicalUnsignedInteger(
    source.inputAmount,
    "Across response.inputAmount",
  );
  const expectedOutputAmount = canonicalUnsignedInteger(
    source.expectedOutputAmount,
    "Across response.expectedOutputAmount",
  );
  const minOutputAmount = canonicalUnsignedInteger(
    source.minOutputAmount,
    "Across response.minOutputAmount",
  );

  if (
    BigInt(inputAmount) < 1n ||
    BigInt(expectedOutputAmount) < 1n ||
    BigInt(minOutputAmount) < 1n
  ) {
    hold("Across response amounts must be positive");
  }

  if (BigInt(expectedOutputAmount) < BigInt(minOutputAmount)) {
    hold("Across expected output is below minimum output");
  }

  if (
    query.trade_type === "exactInput" &&
    inputAmount !== query.amount
  ) {
    hold("Across exactInput amount differs");
  }

  if (
    query.trade_type === "minOutput" &&
    BigInt(minOutputAmount) < BigInt(query.amount)
  ) {
    hold("Across minOutput guarantee is below requested amount");
  }

  if (
    query.trade_type === "exactOutput" &&
    expectedOutputAmount !== query.amount
  ) {
    hold("Across exactOutput amount differs");
  }

  const expectedFillTime = boundedInteger(
    source.expectedFillTime,
    "Across response.expectedFillTime",
    0,
    31_536_000,
  );
  const quoteExpiryTimestamp = positiveInteger(
    source.quoteExpiryTimestamp,
    "Across response.quoteExpiryTimestamp",
  );
  const quoteId = requiredString(
    source.id,
    "Across response.id",
    256,
  );

  if (policy.capital_lock_seconds < expectedFillTime) {
    hold("capital_lock_seconds is below expected fill time");
  }

  const fees = record(source.fees, "Across response.fees");
  const total = feeAmount(
    fees.total,
    "Across response.fees.total",
  );
  const originGas = feeAmount(
    fees.originGas,
    "Across response.fees.originGas",
  );

  const totalDetails = record(
    total.source.details,
    "Across response.fees.total.details",
  );
  const app = feeAmount(
    totalDetails.app,
    "Across response.fees.total.details.app",
  );
  const bridge = record(
    totalDetails.bridge,
    "Across response.fees.total.details.bridge",
  );
  const bridgeDetails = record(
    bridge.details,
    "Across response.fees.total.details.bridge.details",
  );
  const destinationGas = feeAmount(
    bridgeDetails.destinationGas,
    "Across response.fees.total.details.bridge.details.destinationGas",
  );

  const appFeeConfigured =
    query.app_fee !== undefined &&
    decimalGreaterThanZero(query.app_fee);

  if (!appFeeConfigured && BigInt(app.amount) !== 0n) {
    hold("Across response reports app revenue without configured app fee");
  }

  const paperInput: AcrossPaperQuoteInputV1 = Object.freeze({
    schema: VOID_ACROSS_PAPER_QUOTE_INPUT_SCHEMA_V1,
    observed_at: observedAt,
    evaluated_at: evaluatedAt,
    quote_id: quoteId,
    quote_expiry_timestamp: quoteExpiryTimestamp,
    route: Object.freeze({
      origin_chain_id: query.origin_chain_id,
      destination_chain_id: query.destination_chain_id,
      input_token: Object.freeze({
        address: inputToken.address,
        symbol: inputToken.symbol,
        decimals: inputToken.decimals,
      }),
      output_token: Object.freeze({
        address: outputToken.address,
        symbol: outputToken.symbol,
        decimals: outputToken.decimals,
      }),
    }),
    input_amount: inputAmount,
    expected_output_amount: expectedOutputAmount,
    min_output_amount: minOutputAmount,
    expected_fill_time_sec: expectedFillTime,
    fee_summary: Object.freeze({
      total_fee_amount: total.amount,
      total_fee_usd: total.amount_usd_ceil,
      origin_gas_usd: originGas.amount_usd_ceil,
    }),
    revenue_assumption: Object.freeze({
      model: "integrator_app_fee",
      gross_revenue_usd: app.amount_usd_floor,
      evidence_label:
        "across_swap_api_fee_breakdown_app_amount_usd",
    }),
    cost_assumptions: Object.freeze({
      destination_gas_usd:
        destinationGas.amount_usd_ceil,
      capital_at_risk_usd:
        policy.capital_at_risk_usd,
      capital_lock_seconds:
        policy.capital_lock_seconds,
      annual_capital_cost_bps:
        policy.annual_capital_cost_bps,
      risk_haircut_bps:
        policy.risk_haircut_bps,
      safety_buffer_usd:
        policy.safety_buffer_usd,
    }),
  });

  return Object.freeze({
    quote_id: quoteId,
    paper_input: paperInput,
  });
}

function defaultClock(): string {
  return new Date().toISOString();
}

export async function ingestAcrossSwapApprovalQuoteV1(
  value: unknown,
  transport: AcrossReadonlyTransportV1 =
    acrossSwapApiReadonlyHttpsGetV1,
  clock: AcrossQuoteClockV1 = defaultClock,
): Promise<AcrossSwapApprovalIngestionResultV1> {
  const input = parseInput(value);
  const observedAt = canonicalInstant(
    clock(),
    "observed_at",
  );
  const url = buildUrl(input.query);
  let authorization = `Bearer ${input.api_key}`;

  let response: AcrossReadonlyHttpsResponseV1;

  try {
    response = await transport(
      Object.freeze({
        method: "GET",
        url: url.toString(),
        headers: Object.freeze({
          Accept: "application/json",
          Authorization: authorization,
          "Cache-Control": "no-store",
          Pragma: "no-cache",
          "User-Agent":
            "void-external-opportunity-observer/1",
        }),
        timeout_ms: input.timeout_ms,
        max_response_bytes: MAX_RESPONSE_BYTES,
      }),
    );
  } finally {
    authorization = "";
  }

  const evaluatedAt = canonicalInstant(
    clock(),
    "evaluated_at",
  );

  if (Date.parse(evaluatedAt) < Date.parse(observedAt)) {
    hold("evaluated_at precedes observed_at");
  }

  if (
    !Number.isSafeInteger(response.status_code) ||
    response.status_code < 100 ||
    response.status_code > 599
  ) {
    hold("Across response status code differs");
  }

  if (response.status_code !== 200) {
    hold(
      `Across read-only quote request returned status ${response.status_code}`,
    );
  }

  if (
    typeof response.content_type !== "string" ||
    !/^application\/json(?:\s*;|$)/i.test(
      response.content_type,
    )
  ) {
    hold("Across response content type is not JSON");
  }

  if (
    typeof response.body !== "string" ||
    Buffer.byteLength(response.body, "utf8") >
      MAX_RESPONSE_BYTES
  ) {
    hold("Across response body boundary differs");
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(response.body) as unknown;
  } catch {
    hold("Across response body is not valid JSON");
  }

  const normalized = parseResponseBody(
    decoded,
    input.query,
    input.policy,
    observedAt,
    evaluatedAt,
  );
  const paperReceipt = observeAcrossPaperQuoteV1(
    normalized.paper_input,
  );

  return Object.freeze({
    schema: VOID_ACROSS_QUOTE_INGESTION_RESULT_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_ACROSS_QUOTE_INGESTION_V1,
    provider: "across",
    endpoint:
      "https://app.across.to/api/swap/approval",
    method: "GET",
    observed_at: observedAt,
    evaluated_at: evaluatedAt,
    quote_id: normalized.quote_id,
    response_bytes: Buffer.byteLength(
      response.body,
      "utf8",
    ),
    credential_retention: false,
    raw_response_retention: false,
    transaction_payload_retention: false,
    network_mutation_performed: false,
    wallet_or_key_access_performed: false,
    transaction_construction_performed: false,
    transaction_submission_performed: false,
    live_execution_authorized: false,
    paper_input: normalized.paper_input,
    paper_receipt: paperReceipt,
  });
}
