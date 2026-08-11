import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  validateAgentPaidWorkOrderEnvelope,
  type AgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";

export const AGENT_PAID_WORK_QUOTE_MARKER =
  "VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1" as const;
export const AGENT_PAID_WORK_QUOTE_ID_PREFIX = "voidawq1_" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AgentPaidWorkQuoteDraft {
  marker: typeof AGENT_PAID_WORK_QUOTE_MARKER;
  version: 1;
  work_order_id: string;
  created_at_utc: string;
  expires_at_utc: string;
  provider: {
    provider_id: string;
    capability_id: string;
  };
  commercial: {
    quote_asset: string;
    total: string;
    payment_rail_id: string;
  };
  execution_commitment: {
    max_runtime_seconds: number;
    max_output_bytes: number;
    output_labels: string[];
    external_side_effects_allowed: false;
    wallet_access_allowed: false;
    money_movement_allowed: false;
  };
  terms: {
    separate_acceptance_required: true;
    payment_required_before_execution: true;
    quote_grants_no_execution_authority: true;
    provider_authentication_required: true;
    quote_is_not_payment_instruction: true;
  };
  nonce: string;
}

export interface AgentPaidWorkQuoteEnvelope extends AgentPaidWorkQuoteDraft {
  quote_id: string;
}

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function requireRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  assertCondition(
    typeof value === "object" && value !== null && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Record<string, unknown>,
  label: string,
  keys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} keys must be exactly: ${expected.join(", ")}`,
  );
}

function requireTrimmedString(
  value: unknown,
  label: string,
  minLength: number,
  maxLength: number,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must not have surrounding whitespace`);
  assertCondition(
    value.length >= minLength && value.length <= maxLength,
    `${label} length must be ${minLength}..${maxLength}`,
  );
  return value;
}

function requirePattern(
  value: unknown,
  label: string,
  pattern: RegExp,
  minLength: number,
  maxLength: number,
): string {
  const text = requireTrimmedString(value, label, minLength, maxLength);
  assertCondition(pattern.test(text), `${label} has invalid format`);
  return text;
}

function requirePositiveInteger(
  value: unknown,
  label: string,
  maximum: number,
): number {
  assertCondition(
    typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 1 &&
      value <= maximum,
    `${label} must be a safe integer in 1..${maximum}`,
  );
  return value;
}

function parseUtcSeconds(value: string, label: string): number {
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value),
    `${label} must be second-precision UTC`,
  );
  const milliseconds = Date.parse(value);
  assertCondition(Number.isFinite(milliseconds), `${label} is not a valid UTC time`);
  assertCondition(
    new Date(milliseconds).toISOString() === value.replace("Z", ".000Z"),
    `${label} is not a canonical UTC timestamp`,
  );
  return milliseconds / 1000;
}

function requirePositiveDecimal(value: unknown, label: string): string {
  const text = requireTrimmedString(value, label, 1, 51);
  const match = /^(0|[1-9]\d{0,31})(?:\.(\d{1,18}))?$/.exec(text);
  assertCondition(Boolean(match), `${label} must be a bounded decimal string`);
  assertCondition(!/^0(?:\.0{1,18})?$/.test(text), `${label} must be greater than zero`);
  return text;
}

function decimalParts(value: string): [string, string] {
  const [integer, fraction = ""] = value.split(".");
  return [integer, fraction.padEnd(18, "0")];
}

export function comparePositiveDecimals(left: string, right: string): number {
  requirePositiveDecimal(left, "left decimal");
  requirePositiveDecimal(right, "right decimal");
  const [leftInteger, leftFraction] = decimalParts(left);
  const [rightInteger, rightFraction] = decimalParts(right);

  if (leftInteger.length !== rightInteger.length) {
    return leftInteger.length < rightInteger.length ? -1 : 1;
  }
  if (leftInteger !== rightInteger) {
    return leftInteger < rightInteger ? -1 : 1;
  }
  if (leftFraction === rightFraction) return 0;
  return leftFraction < rightFraction ? -1 : 1;
}

function requireLogicalOutputLabels(
  value: unknown,
  label: string,
): string[] {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  assertCondition(
    value.length >= 1 && value.length <= 64,
    `${label} must contain 1..64 items`,
  );

  const labels = value.map((item, index) =>
    requirePattern(
      item,
      `${label}[${index}]`,
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/,
      1,
      256,
    ),
  );
  assertCondition(
    new Set(labels).size === labels.length,
    `${label} must contain unique labels`,
  );
  return labels;
}

function canonicalize(value: unknown): JsonValue {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    assertCondition(
      Number.isFinite(value) && Number.isSafeInteger(value),
      "canonical JSON numbers must be finite safe integers",
    );
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  const record = requireRecord(value, "canonical JSON value");
  const result: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(record).sort()) {
    const child = record[key];
    assertCondition(child !== undefined, "canonical JSON rejects undefined");
    result[key] = canonicalize(child);
  }
  return result;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function validateDraftShape(value: unknown, allowQuoteId: boolean): AgentPaidWorkQuoteDraft {
  const root = requireRecord(value, "quote");
  const rootKeys = [
    "marker",
    "version",
    "work_order_id",
    "created_at_utc",
    "expires_at_utc",
    "provider",
    "commercial",
    "execution_commitment",
    "terms",
    "nonce",
    ...(allowQuoteId ? ["quote_id"] : []),
  ] as const;
  requireExactKeys(root, "quote", rootKeys);

  assertCondition(
    root.marker === AGENT_PAID_WORK_QUOTE_MARKER,
    `marker must be ${AGENT_PAID_WORK_QUOTE_MARKER}`,
  );
  assertCondition(root.version === 1, "version must be 1");

  const workOrderId = requirePattern(
    root.work_order_id,
    "work_order_id",
    /^voidawo1_[0-9a-f]{64}$/,
    73,
    73,
  );
  const createdAtUtc = requireTrimmedString(
    root.created_at_utc,
    "created_at_utc",
    20,
    20,
  );
  const expiresAtUtc = requireTrimmedString(
    root.expires_at_utc,
    "expires_at_utc",
    20,
    20,
  );
  const createdSeconds = parseUtcSeconds(createdAtUtc, "created_at_utc");
  const expiresSeconds = parseUtcSeconds(expiresAtUtc, "expires_at_utc");
  assertCondition(
    expiresSeconds > createdSeconds,
    "expires_at_utc must be after created_at_utc",
  );

  const provider = requireRecord(root.provider, "provider");
  requireExactKeys(provider, "provider", ["provider_id", "capability_id"]);
  const providerId = requirePattern(
    provider.provider_id,
    "provider.provider_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );
  const capabilityId = requirePattern(
    provider.capability_id,
    "provider.capability_id",
    /^[a-z0-9][a-z0-9._:-]{2,127}$/,
    3,
    128,
  );

  const commercial = requireRecord(root.commercial, "commercial");
  requireExactKeys(commercial, "commercial", [
    "quote_asset",
    "total",
    "payment_rail_id",
  ]);
  const quoteAsset = requirePattern(
    commercial.quote_asset,
    "commercial.quote_asset",
    /^[A-Z][A-Z0-9._:-]{0,31}$/,
    1,
    32,
  );
  const total = requirePositiveDecimal(
    commercial.total,
    "commercial.total",
  );
  const paymentRailId = requirePattern(
    commercial.payment_rail_id,
    "commercial.payment_rail_id",
    /^[a-z0-9][a-z0-9._-]{2,127}$/,
    3,
    128,
  );

  const commitment = requireRecord(
    root.execution_commitment,
    "execution_commitment",
  );
  requireExactKeys(commitment, "execution_commitment", [
    "max_runtime_seconds",
    "max_output_bytes",
    "output_labels",
    "external_side_effects_allowed",
    "wallet_access_allowed",
    "money_movement_allowed",
  ]);
  const maxRuntimeSeconds = requirePositiveInteger(
    commitment.max_runtime_seconds,
    "execution_commitment.max_runtime_seconds",
    604800,
  );
  const maxOutputBytes = requirePositiveInteger(
    commitment.max_output_bytes,
    "execution_commitment.max_output_bytes",
    1073741824,
  );
  const outputLabels = requireLogicalOutputLabels(
    commitment.output_labels,
    "execution_commitment.output_labels",
  );
  assertCondition(
    commitment.external_side_effects_allowed === false,
    "execution_commitment.external_side_effects_allowed must be false",
  );
  assertCondition(
    commitment.wallet_access_allowed === false,
    "execution_commitment.wallet_access_allowed must be false",
  );
  assertCondition(
    commitment.money_movement_allowed === false,
    "execution_commitment.money_movement_allowed must be false",
  );

  const terms = requireRecord(root.terms, "terms");
  requireExactKeys(terms, "terms", [
    "separate_acceptance_required",
    "payment_required_before_execution",
    "quote_grants_no_execution_authority",
    "provider_authentication_required",
    "quote_is_not_payment_instruction",
  ]);
  assertCondition(
    terms.separate_acceptance_required === true,
    "terms.separate_acceptance_required must be true",
  );
  assertCondition(
    terms.payment_required_before_execution === true,
    "terms.payment_required_before_execution must be true",
  );
  assertCondition(
    terms.quote_grants_no_execution_authority === true,
    "terms.quote_grants_no_execution_authority must be true",
  );
  assertCondition(
    terms.provider_authentication_required === true,
    "terms.provider_authentication_required must be true",
  );
  assertCondition(
    terms.quote_is_not_payment_instruction === true,
    "terms.quote_is_not_payment_instruction must be true",
  );

  const nonce = requirePattern(
    root.nonce,
    "nonce",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/,
    1,
    128,
  );

  return {
    marker: AGENT_PAID_WORK_QUOTE_MARKER,
    version: 1,
    work_order_id: workOrderId,
    created_at_utc: createdAtUtc,
    expires_at_utc: expiresAtUtc,
    provider: {
      provider_id: providerId,
      capability_id: capabilityId,
    },
    commercial: {
      quote_asset: quoteAsset,
      total,
      payment_rail_id: paymentRailId,
    },
    execution_commitment: {
      max_runtime_seconds: maxRuntimeSeconds,
      max_output_bytes: maxOutputBytes,
      output_labels: outputLabels,
      external_side_effects_allowed: false,
      wallet_access_allowed: false,
      money_movement_allowed: false,
    },
    terms: {
      separate_acceptance_required: true,
      payment_required_before_execution: true,
      quote_grants_no_execution_authority: true,
      provider_authentication_required: true,
      quote_is_not_payment_instruction: true,
    },
    nonce,
  };
}

function validateQuoteAgainstWorkOrder(
  workOrder: AgentPaidWorkOrderEnvelope,
  quote: AgentPaidWorkQuoteDraft,
): void {
  assertCondition(
    quote.work_order_id === workOrder.work_order_id,
    "quote work_order_id does not match the supplied work order",
  );
  assertCondition(
    quote.provider.capability_id === workOrder.service.capability_id,
    "quote capability_id does not match the requested capability",
  );
  assertCondition(
    quote.commercial.quote_asset === workOrder.commercial.quote_asset,
    "quote asset does not match the work-order quote asset",
  );
  assertCondition(
    comparePositiveDecimals(
      quote.commercial.total,
      workOrder.commercial.max_total,
    ) <= 0,
    "quote total exceeds the work-order max_total",
  );

  const workCreated = parseUtcSeconds(
    workOrder.created_at_utc,
    "work order created_at_utc",
  );
  const workExpires = parseUtcSeconds(
    workOrder.expires_at_utc,
    "work order expires_at_utc",
  );
  const quoteCreated = parseUtcSeconds(
    quote.created_at_utc,
    "quote created_at_utc",
  );
  const quoteExpires = parseUtcSeconds(
    quote.expires_at_utc,
    "quote expires_at_utc",
  );
  assertCondition(
    quoteCreated >= workCreated,
    "quote cannot be created before the work order",
  );
  assertCondition(
    quoteExpires <= workExpires,
    "quote cannot expire after the work order",
  );

  assertCondition(
    quote.execution_commitment.max_runtime_seconds <=
      workOrder.execution_limits.max_runtime_seconds,
    "quote runtime commitment exceeds the work-order limit",
  );
  assertCondition(
    quote.execution_commitment.max_output_bytes <=
      workOrder.execution_limits.max_output_bytes,
    "quote output-byte commitment exceeds the work-order limit",
  );
  assertCondition(
    JSON.stringify(quote.execution_commitment.output_labels) ===
      JSON.stringify(workOrder.service.expected_outputs),
    "quote output labels must exactly match expected_outputs in order",
  );
  assertCondition(
    workOrder.commercial.payment_required_before_execution === true,
    "work order must require payment before execution",
  );
  assertCondition(
    workOrder.execution_limits.external_side_effects_allowed === false &&
      workOrder.execution_limits.wallet_access_allowed === false &&
      workOrder.execution_limits.money_movement_allowed === false,
    "work order must preserve the bounded no-side-effect posture",
  );
}

export function computeAgentPaidWorkQuoteId(
  draft: AgentPaidWorkQuoteDraft,
): string {
  const digest = createHash("sha256")
    .update(canonicalJson(draft))
    .digest("hex");
  return `${AGENT_PAID_WORK_QUOTE_ID_PREFIX}${digest}`;
}

export function validateAgentPaidWorkQuoteDraft(
  workOrderValue: unknown,
  quoteValue: unknown,
): asserts quoteValue is AgentPaidWorkQuoteDraft {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  const quote = validateDraftShape(quoteValue, false);
  validateQuoteAgainstWorkOrder(workOrderValue, quote);
}

export function materializeAgentPaidWorkQuote(
  workOrderValue: unknown,
  quoteValue: unknown,
): AgentPaidWorkQuoteEnvelope {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  const draft = validateDraftShape(quoteValue, false);
  validateQuoteAgainstWorkOrder(workOrderValue, draft);
  return {
    ...draft,
    quote_id: computeAgentPaidWorkQuoteId(draft),
  };
}

export function validateAgentPaidWorkQuoteEnvelope(
  workOrderValue: unknown,
  quoteValue: unknown,
): asserts quoteValue is AgentPaidWorkQuoteEnvelope {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  const root = requireRecord(quoteValue, "quote envelope");
  const draft = validateDraftShape(quoteValue, true);
  validateQuoteAgainstWorkOrder(workOrderValue, draft);
  const quoteId = requirePattern(
    root.quote_id,
    "quote_id",
    /^voidawq1_[0-9a-f]{64}$/,
    73,
    73,
  );
  assertCondition(
    quoteId === computeAgentPaidWorkQuoteId(draft),
    "quote_id does not match the canonical quote payload",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/agent_paid_work_quote_envelope_v1.ts materialize <work-order.json> <quote-draft.json> <quote-envelope.json>",
      "  tsx scripts/agent_paid_work_quote_envelope_v1.ts verify <work-order.json> <quote-envelope.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [mode, workOrderPath, quotePath, outputPath, ...extra] =
    process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected extra arguments");

  if (mode === "materialize") {
    assertCondition(
      Boolean(workOrderPath && quotePath && outputPath),
      "materialize requires work-order, quote-draft, and output paths",
    );
    const resolvedOutput = resolve(outputPath);
    assertCondition(
      !existsSync(resolvedOutput),
      "refusing to overwrite an existing quote envelope",
    );
    const envelope = materializeAgentPaidWorkQuote(
      readJson(resolve(workOrderPath)),
      readJson(resolve(quotePath)),
    );
    writeFileSync(
      resolvedOutput,
      `${JSON.stringify(envelope, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    console.log(`marker=${envelope.marker}`);
    console.log(`work_order_id=${envelope.work_order_id}`);
    console.log(`quote_id=${envelope.quote_id}`);
    console.log(`output=${resolvedOutput}`);
    console.log("VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1_MATERIALIZED");
    return;
  }

  if (mode === "verify") {
    assertCondition(
      Boolean(workOrderPath && quotePath) && outputPath === undefined,
      "verify requires work-order and quote-envelope paths",
    );
    const workOrder = readJson(resolve(workOrderPath));
    const quote = readJson(resolve(quotePath));
    validateAgentPaidWorkQuoteEnvelope(workOrder, quote);
    console.log(`marker=${quote.marker}`);
    console.log(`work_order_id=${quote.work_order_id}`);
    console.log(`quote_id=${quote.quote_id}`);
    console.log(`provider_id=${quote.provider.provider_id}`);
    console.log(`quote_asset=${quote.commercial.quote_asset}`);
    console.log(`total=${quote.commercial.total}`);
    console.log("VOID_AGENT_PAID_WORK_QUOTE_ENVELOPE_V1_VALID");
    return;
  }

  usage();
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";

if (invokedUrl === import.meta.url) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`HOLD: ${message}`);
    process.exitCode = 1;
  }
}
