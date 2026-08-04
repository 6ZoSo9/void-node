import { createHash } from "node:crypto";
import * as https from "node:https";
import type { IncomingMessage } from "node:http";

export const VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1" as const;

export const VOID_ACROSS_TOKEN_VALUATION_INGESTION_RESULT_SCHEMA_V1 =
  "void-across-token-valuation-ingestion-result-v1" as const;

const ACROSS_API_ORIGIN = "https://app.across.to";
const ACROSS_SWAP_TOKENS_PATH = "/api/swap/tokens";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_048_576;
const USD_SCALE = 1_000_000n;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

type JsonPrimitive = null | boolean | number | string;
type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;
type RecordValue = Record<string, unknown>;

export type AcrossTokenValuationSelectorV1 = Readonly<{
  chain_id: number;
  address: string;
  amount: string;
}>;

export type AcrossTokenValuationIngestionInputV1 = Readonly<{
  api_key: string;
  selector: AcrossTokenValuationSelectorV1;
  timeout_ms?: number;
}>;

export type AcrossTokenValuationReadonlyHttpsRequestV1 = Readonly<{
  method: "GET";
  url: string;
  headers: Readonly<Record<string, string>>;
  timeout_ms: number;
  max_response_bytes: number;
}>;

export type AcrossTokenValuationReadonlyHttpsResponseV1 = Readonly<{
  status_code: number;
  content_type: string;
  body: string;
}>;

export type AcrossTokenValuationReadonlyTransportV1 = (
  request: AcrossTokenValuationReadonlyHttpsRequestV1,
) => Promise<AcrossTokenValuationReadonlyHttpsResponseV1>;

export type AcrossTokenValuationClockV1 = () => string;

export type AcrossTokenValuationIngestionResultV1 = Readonly<{
  schema: typeof VOID_ACROSS_TOKEN_VALUATION_INGESTION_RESULT_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1;
  provider: "across";
  endpoint: "https://app.across.to/api/swap/tokens";
  method: "GET";
  observed_at: string;
  evaluated_at: string;
  response_bytes: number;
  selector: AcrossTokenValuationSelectorV1;
  selected_token: Readonly<{
    chain_id: number;
    address: string;
    symbol: string;
    decimals: number;
  }>;
  price_usd_floor: string;
  position_value_usd_floor: string;
  price_source_precision_digits: number;
  sanitized_token_sha256: string;
  valuation_sha256: string;
  credential_retention: false;
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

function allowedKeys(
  value: RecordValue,
  allowed: readonly string[],
  label: string,
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) hold(`${label} contains unexpected key: ${key}`);
  }
}

function requiredString(value: unknown, label: string, maxLength = 512): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maxLength ||
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

function canonicalUnsignedInteger(value: unknown, label: string): string {
  const text = requiredString(value, label, 128);
  if (!/^(0|[1-9][0-9]*)$/.test(text)) {
    hold(`${label} must be a canonical unsigned integer`);
  }
  return text;
}

function evmAddress(value: unknown, label: string): string {
  const text = requiredString(value, label, 42);
  if (!/^0x[0-9a-fA-F]{40}$/.test(text)) {
    hold(`${label} must be an EVM address`);
  }
  return text.toLowerCase();
}

function apiKey(value: unknown, label: string): string {
  const text = requiredString(value, label, 1_024);
  if (text.trim() !== text || /\s/.test(text)) {
    hold(`${label} must not contain whitespace`);
  }
  return text;
}

function tokenSymbol(value: unknown, label: string): string {
  const text = requiredString(value, label, 32);
  if (!/^[A-Za-z0-9._-]+$/.test(text)) {
    hold(`${label} contains unsupported characters`);
  }
  return text;
}

function canonicalInstant(value: unknown, label: string): string {
  const text = requiredString(value, label, 64);
  const milliseconds = Date.parse(text);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== text) {
    hold(`${label} must be a canonical ISO-8601 instant`);
  }
  return text;
}

function canonicalDecimal(value: unknown, label: string): Readonly<{
  text: string;
  numerator: bigint;
  fraction_digits: number;
}> {
  const text = requiredString(value, label, 128);
  if (!/^(0|[1-9][0-9]*)(\.[0-9]{1,36})?$/.test(text)) {
    hold(`${label} must be a canonical non-negative decimal`);
  }
  const [whole, fraction = ""] = text.split(".");
  return Object.freeze({
    text,
    numerator: BigInt(`${whole}${fraction}`),
    fraction_digits: fraction.length,
  });
}

function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

function formatUsdMicros(micros: bigint): string {
  if (micros < 0n) hold("USD micros must not be negative");
  const whole = micros / USD_SCALE;
  const fraction = (micros % USD_SCALE).toString().padStart(6, "0");
  return `${whole}.${fraction}`;
}

function floorPriceUsdMicros(price: ReturnType<typeof canonicalDecimal>): bigint {
  return (price.numerator * USD_SCALE) / pow10(price.fraction_digits);
}

function floorPositionValueUsdMicros(
  price: ReturnType<typeof canonicalDecimal>,
  amount: bigint,
  tokenDecimals: number,
): bigint {
  const denominator = pow10(price.fraction_digits + tokenDecimals);
  return (price.numerator * amount * USD_SCALE) / denominator;
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

export function canonicalAcrossTokenValuationJsonV1(value: unknown): string {
  return JSON.stringify(jsonValue(value, "document"));
}

export function hashAcrossTokenValuationDocumentV1(value: unknown): string {
  return createHash("sha256")
    .update(canonicalAcrossTokenValuationJsonV1(value), "utf8")
    .digest("hex");
}

function parseSelector(value: unknown): AcrossTokenValuationSelectorV1 {
  const source = record(value, "selector");
  allowedKeys(source, ["chain_id", "address", "amount"], "selector");
  const amount = canonicalUnsignedInteger(source.amount, "selector.amount");
  if (BigInt(amount) < 1n) hold("selector.amount must be greater than zero");
  return Object.freeze({
    chain_id: safeInteger(source.chain_id, "selector.chain_id", 1, 10_000_000),
    address: evmAddress(source.address, "selector.address"),
    amount,
  });
}

function parseInput(value: unknown): Readonly<{
  api_key: string;
  selector: AcrossTokenValuationSelectorV1;
  timeout_ms: number;
}> {
  const source = record(value, "ingestion input");
  allowedKeys(source, ["api_key", "selector", "timeout_ms"], "ingestion input");
  return Object.freeze({
    api_key: apiKey(source.api_key, "api_key"),
    selector: parseSelector(source.selector),
    timeout_ms:
      source.timeout_ms === undefined
        ? DEFAULT_TIMEOUT_MS
        : safeInteger(source.timeout_ms, "timeout_ms", 1_000, 30_000),
  });
}

function exactChainIdQuery(url: URL): number {
  if (url.hash !== "") hold("Across token endpoint fragments are forbidden");
  const entries = [...url.searchParams.entries()];
  if (entries.length !== 1 || entries[0][0] !== "chainId") {
    hold("Across token endpoint requires an exact chainId-only query");
  }
  const chainIdText = entries[0][1];
  if (!/^[1-9][0-9]*$/.test(chainIdText)) {
    hold("Across token endpoint chainId must be canonical");
  }
  const chainId = Number(chainIdText);
  return safeInteger(chainId, "Across token endpoint chainId", 1, 10_000_000);
}

function buildUrl(selector: AcrossTokenValuationSelectorV1): URL {
  const url = new URL(ACROSS_SWAP_TOKENS_PATH, ACROSS_API_ORIGIN);
  url.searchParams.set("chainId", selector.chain_id.toString());
  if (
    url.protocol !== "https:" ||
    url.hostname !== "app.across.to" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== ACROSS_SWAP_TOKENS_PATH ||
    exactChainIdQuery(url) !== selector.chain_id
  ) {
    hold("Across token endpoint boundary differs");
  }
  return url;
}

function normalizedContentType(value: string | readonly string[] | undefined): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  return value.join(",");
}

export async function acrossTokenValuationReadonlyHttpsGetV1(
  input: AcrossTokenValuationReadonlyHttpsRequestV1,
): Promise<AcrossTokenValuationReadonlyHttpsResponseV1> {
  if (input.method !== "GET") hold("Across token transport permits GET only");
  const url = new URL(input.url);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "app.across.to" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== ACROSS_SWAP_TOKENS_PATH
  ) {
    hold("Across token transport exact-host boundary differs");
  }
  exactChainIdQuery(url);
  if (
    !Number.isSafeInteger(input.timeout_ms) ||
    input.timeout_ms < 1_000 ||
    input.timeout_ms > 30_000
  ) {
    hold("Across token transport timeout differs");
  }
  if (input.max_response_bytes !== MAX_RESPONSE_BYTES) {
    hold("Across token transport response-size boundary differs");
  }

  return await new Promise<AcrossTokenValuationReadonlyHttpsResponseV1>(
    (resolve, reject) => {
      let settled = false;
      const fail = (message: string): void => {
        if (settled) return;
        settled = true;
        reject(new Error(`HOLD: ${message}`));
      };
      const request = https.request(
        url,
        { method: "GET", headers: { ...input.headers } },
        (response: IncomingMessage) => {
          const statusCode = response.statusCode ?? 0;
          if (statusCode >= 300 && statusCode < 400) {
            response.resume();
            fail("Across token transport redirects are forbidden");
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on("data", (chunk: Buffer | string) => {
            if (settled) return;
            const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
            size += buffer.length;
            if (size > input.max_response_bytes) {
              response.destroy();
              fail("Across token response exceeds byte limit");
              return;
            }
            chunks.push(buffer);
          });
          response.on("end", () => {
            if (settled) return;
            settled = true;
            resolve(
              Object.freeze({
                status_code: statusCode,
                content_type: normalizedContentType(response.headers["content-type"]),
                body: Buffer.concat(chunks).toString("utf8"),
              }),
            );
          });
          response.on("error", () => fail("Across token response stream failed"));
        },
      );
      request.setTimeout(input.timeout_ms, () => {
        request.destroy();
        fail("Across token read-only request timed out");
      });
      request.on("error", () => fail("Across token read-only HTTPS request failed"));
      request.end();
    },
  );
}

type SanitizedAcrossTokenV1 = Readonly<{
  chain_id: number;
  address: string;
  symbol: string;
  decimals: number;
  price_usd_exact: string;
}>;

function parseToken(value: unknown, label: string): SanitizedAcrossTokenV1 {
  const source = record(value, label);
  allowedKeys(
    source,
    ["chainId", "address", "name", "symbol", "decimals", "logoUrl", "priceUsd"],
    label,
  );
  return Object.freeze({
    chain_id: safeInteger(source.chainId, `${label}.chainId`, 1, 10_000_000),
    address: evmAddress(source.address, `${label}.address`),
    symbol: tokenSymbol(source.symbol, `${label}.symbol`),
    decimals: safeInteger(source.decimals, `${label}.decimals`, 0, 36),
    price_usd_exact: canonicalDecimal(source.priceUsd, `${label}.priceUsd`).text,
  });
}

function selectToken(
  decoded: unknown,
  selector: AcrossTokenValuationSelectorV1,
): SanitizedAcrossTokenV1 {
  if (!Array.isArray(decoded)) hold("Across token response must be an array");
  if (decoded.length < 1 || decoded.length > 100_000) {
    hold("Across token response entry count differs");
  }
  const parsed = decoded.map((entry, index) => parseToken(entry, `Across token[${index}]`));
  const matches = parsed.filter(
    (token) => token.chain_id === selector.chain_id && token.address === selector.address,
  );
  if (matches.length === 0) hold("Across token selector did not match any token");
  if (matches.length > 1) hold("Across token selector matched duplicate tokens");
  return matches[0];
}

function defaultClock(): string {
  return new Date().toISOString();
}

export async function ingestAcrossTokenValuationV1(
  value: unknown,
  transport: AcrossTokenValuationReadonlyTransportV1 =
    acrossTokenValuationReadonlyHttpsGetV1,
  clock: AcrossTokenValuationClockV1 = defaultClock,
): Promise<AcrossTokenValuationIngestionResultV1> {
  const input = parseInput(value);
  const observedAt = canonicalInstant(clock(), "observed_at");
  const url = buildUrl(input.selector);
  let authorization = `Bearer ${input.api_key}`;
  let response: AcrossTokenValuationReadonlyHttpsResponseV1;
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
          "User-Agent": "void-external-opportunity-observer/1",
        }),
        timeout_ms: input.timeout_ms,
        max_response_bytes: MAX_RESPONSE_BYTES,
      }),
    );
  } finally {
    authorization = "";
  }

  const evaluatedAt = canonicalInstant(clock(), "evaluated_at");
  if (Date.parse(evaluatedAt) < Date.parse(observedAt)) {
    hold("evaluated_at precedes observed_at");
  }
  if (
    !Number.isSafeInteger(response.status_code) ||
    response.status_code < 100 ||
    response.status_code > 599
  ) {
    hold("Across token response status code differs");
  }
  if (response.status_code !== 200) {
    hold(`Across token request returned status ${response.status_code}`);
  }
  if (
    typeof response.content_type !== "string" ||
    !/^application\/json(?:\s*;|$)/i.test(response.content_type)
  ) {
    hold("Across token response content type is not JSON");
  }
  if (
    typeof response.body !== "string" ||
    Buffer.byteLength(response.body, "utf8") > MAX_RESPONSE_BYTES
  ) {
    hold("Across token response body boundary differs");
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(response.body) as unknown;
  } catch {
    hold("Across token response body is not valid JSON");
  }

  const selected = selectToken(decoded, input.selector);
  const price = canonicalDecimal(selected.price_usd_exact, "selected priceUsd");
  const priceUsdMicros = floorPriceUsdMicros(price);
  const positionValueUsdMicros = floorPositionValueUsdMicros(
    price,
    BigInt(input.selector.amount),
    selected.decimals,
  );
  const sanitizedTokenSha = hashAcrossTokenValuationDocumentV1(selected);
  if (!SHA256_HEX_PATTERN.test(sanitizedTokenSha)) {
    hold("sanitized token SHA-256 differs");
  }

  const valuationCore = Object.freeze({
    provider: "across" as const,
    endpoint: `${ACROSS_API_ORIGIN}${ACROSS_SWAP_TOKENS_PATH}` as const,
    observed_at: observedAt,
    selector: input.selector,
    selected_token: Object.freeze({
      chain_id: selected.chain_id,
      address: selected.address,
      symbol: selected.symbol,
      decimals: selected.decimals,
    }),
    price_usd_floor: formatUsdMicros(priceUsdMicros),
    position_value_usd_floor: formatUsdMicros(positionValueUsdMicros),
    price_source_precision_digits: price.fraction_digits,
    sanitized_token_sha256: sanitizedTokenSha,
  });
  const valuationSha = hashAcrossTokenValuationDocumentV1(valuationCore);
  if (!SHA256_HEX_PATTERN.test(valuationSha)) hold("valuation SHA-256 differs");

  return Object.freeze({
    schema: VOID_ACROSS_TOKEN_VALUATION_INGESTION_RESULT_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_ACROSS_TOKEN_VALUATION_INGESTION_V1,
    provider: "across",
    endpoint: "https://app.across.to/api/swap/tokens",
    method: "GET",
    observed_at: observedAt,
    evaluated_at: evaluatedAt,
    response_bytes: Buffer.byteLength(response.body, "utf8"),
    selector: input.selector,
    selected_token: valuationCore.selected_token,
    price_usd_floor: valuationCore.price_usd_floor,
    position_value_usd_floor: valuationCore.position_value_usd_floor,
    price_source_precision_digits: valuationCore.price_source_precision_digits,
    sanitized_token_sha256: sanitizedTokenSha,
    valuation_sha256: valuationSha,
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
  });
}
