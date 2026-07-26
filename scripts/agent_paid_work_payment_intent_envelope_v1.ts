import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  validateAgentPaidWorkOrderEnvelope,
  type AgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  validateAgentPaidWorkQuoteEnvelope,
  type AgentPaidWorkQuoteEnvelope,
} from "./agent_paid_work_quote_envelope_v1.js";
import {
  validateAgentPaidWorkAcceptanceEnvelope,
  type AgentPaidWorkAcceptanceEnvelope,
} from "./agent_paid_work_acceptance_envelope_v1.js";

export const AGENT_PAID_WORK_PAYMENT_INTENT_MARKER =
  "VOID_AGENT_PAID_WORK_PAYMENT_INTENT_ENVELOPE_V1" as const;
export const AGENT_PAID_WORK_PAYMENT_INTENT_ID_PREFIX =
  "voidawpi1_" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AgentPaidWorkPaymentIntentDraft {
  marker: typeof AGENT_PAID_WORK_PAYMENT_INTENT_MARKER;
  version: 1;
  work_order_id: string;
  quote_id: string;
  acceptance_id: string;
  created_at_utc: string;
  expires_at_utc: string;
  requester: { agent_id: string };
  provider: { provider_id: string };
  commercial: {
    quote_asset: string;
    total: string;
    max_fee_total: string;
    payment_rail_id: string;
  };
  authorization: {
    payment_authorization_requested: true;
    exact_quote_total_only: true;
    max_fee_enforced: true;
    one_time_use_required: true;
    replay_protection_required: true;
    single_active_payment_intent_per_acceptance_required: true;
    requester_authentication_required: true;
    provider_authentication_required: true;
    destination_resolution_required: true;
    allowlisted_payment_rail_required: true;
    separate_payment_execution_required: true;
    separate_work_execution_authorization_required: true;
    payment_execution_granted: false;
    work_execution_authorization_granted: false;
    intent_is_not_payment_receipt: true;
    intent_is_not_funds_transfer: true;
    intent_is_not_funds_reservation: true;
  };
  nonce: string;
}

export interface AgentPaidWorkPaymentIntentEnvelope
  extends AgentPaidWorkPaymentIntentDraft {
  payment_intent_id: string;
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
  minimum: number,
  maximum: number,
): string {
  assertCondition(typeof value === "string", `${label} must be a string`);
  assertCondition(value === value.trim(), `${label} must not have surrounding whitespace`);
  assertCondition(
    value.length >= minimum && value.length <= maximum,
    `${label} length must be ${minimum}..${maximum}`,
  );
  return value;
}

function requirePattern(
  value: unknown,
  label: string,
  pattern: RegExp,
  minimum: number,
  maximum: number,
): string {
  const text = requireTrimmedString(value, label, minimum, maximum);
  assertCondition(pattern.test(text), `${label} has invalid format`);
  return text;
}

function requireDecimal(
  value: unknown,
  label: string,
  allowZero: boolean,
): string {
  const text = requireTrimmedString(value, label, 1, 51);
  assertCondition(
    /^(0|[1-9]\d{0,31})(?:\.\d{1,18})?$/.test(text),
    `${label} must be a bounded decimal string`,
  );
  if (!allowZero) {
    assertCondition(
      !/^0(?:\.0{1,18})?$/.test(text),
      `${label} must be greater than zero`,
    );
  }
  return text;
}

function decimalParts(value: string): [string, string] {
  const [integer, fraction = ""] = value.split(".");
  return [integer, fraction.padEnd(18, "0")];
}

export function compareDecimals(left: string, right: string): number {
  requireDecimal(left, "left decimal", true);
  requireDecimal(right, "right decimal", true);
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

export function addDecimals(left: string, right: string): string {
  requireDecimal(left, "left decimal", true);
  requireDecimal(right, "right decimal", true);
  const [li, lf] = decimalParts(left);
  const [ri, rf] = decimalParts(right);
  const scale = 10n ** 18n;
  const total =
    BigInt(li) * scale +
    BigInt(lf) +
    BigInt(ri) * scale +
    BigInt(rf);
  const integer = total / scale;
  const fraction = (total % scale).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${integer}.${fraction}` : integer.toString();
}

function parseUtcSeconds(value: string, label: string): number {
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value),
    `${label} must be second-precision UTC`,
  );
  const milliseconds = Date.parse(value);
  assertCondition(Number.isFinite(milliseconds), `${label} is not valid UTC`);
  assertCondition(
    new Date(milliseconds).toISOString() === value.replace("Z", ".000Z"),
    `${label} is not canonical UTC`,
  );
  return milliseconds / 1000;
}

function canonicalize(value: unknown): JsonValue {
  if (
    value === null ||
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
  if (Array.isArray(value)) return value.map(canonicalize);
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

function validateDraftShape(
  value: unknown,
  allowId: boolean,
): AgentPaidWorkPaymentIntentDraft {
  const root = requireRecord(value, "payment intent");
  requireExactKeys(root, "payment intent", [
    "marker", "version", "work_order_id", "quote_id", "acceptance_id",
    "created_at_utc", "expires_at_utc", "requester", "provider",
    "commercial", "authorization", "nonce",
    ...(allowId ? ["payment_intent_id"] : []),
  ]);
  assertCondition(
    root.marker === AGENT_PAID_WORK_PAYMENT_INTENT_MARKER,
    `marker must be ${AGENT_PAID_WORK_PAYMENT_INTENT_MARKER}`,
  );
  assertCondition(root.version === 1, "version must be 1");

  const workOrderId = requirePattern(
    root.work_order_id, "work_order_id", /^voidawo1_[0-9a-f]{64}$/, 73, 73,
  );
  const quoteId = requirePattern(
    root.quote_id, "quote_id", /^voidawq1_[0-9a-f]{64}$/, 73, 73,
  );
  const acceptanceId = requirePattern(
    root.acceptance_id, "acceptance_id", /^voidawa1_[0-9a-f]{64}$/, 73, 73,
  );
  const createdAtUtc = requireTrimmedString(root.created_at_utc, "created_at_utc", 20, 20);
  const expiresAtUtc = requireTrimmedString(root.expires_at_utc, "expires_at_utc", 20, 20);
  const created = parseUtcSeconds(createdAtUtc, "created_at_utc");
  const expires = parseUtcSeconds(expiresAtUtc, "expires_at_utc");
  assertCondition(expires > created, "expires_at_utc must be after created_at_utc");

  const requester = requireRecord(root.requester, "requester");
  requireExactKeys(requester, "requester", ["agent_id"]);
  const agentId = requirePattern(
    requester.agent_id, "requester.agent_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/, 3, 128,
  );

  const provider = requireRecord(root.provider, "provider");
  requireExactKeys(provider, "provider", ["provider_id"]);
  const providerId = requirePattern(
    provider.provider_id, "provider.provider_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/, 3, 128,
  );

  const commercial = requireRecord(root.commercial, "commercial");
  requireExactKeys(commercial, "commercial", [
    "quote_asset", "total", "max_fee_total", "payment_rail_id",
  ]);
  const quoteAsset = requirePattern(
    commercial.quote_asset, "commercial.quote_asset",
    /^[A-Z][A-Z0-9._:-]{0,31}$/, 1, 32,
  );
  const total = requireDecimal(commercial.total, "commercial.total", false);
  const maxFeeTotal = requireDecimal(
    commercial.max_fee_total, "commercial.max_fee_total", true,
  );
  const paymentRailId = requirePattern(
    commercial.payment_rail_id, "commercial.payment_rail_id",
    /^[a-z0-9][a-z0-9._-]{2,127}$/, 3, 128,
  );

  const authorization = requireRecord(root.authorization, "authorization");
  const authorizationKeys = [
    "payment_authorization_requested",
    "exact_quote_total_only",
    "max_fee_enforced",
    "one_time_use_required",
    "replay_protection_required",
    "single_active_payment_intent_per_acceptance_required",
    "requester_authentication_required",
    "provider_authentication_required",
    "destination_resolution_required",
    "allowlisted_payment_rail_required",
    "separate_payment_execution_required",
    "separate_work_execution_authorization_required",
    "payment_execution_granted",
    "work_execution_authorization_granted",
    "intent_is_not_payment_receipt",
    "intent_is_not_funds_transfer",
    "intent_is_not_funds_reservation",
  ] as const;
  requireExactKeys(authorization, "authorization", authorizationKeys);
  const trueKeys = authorizationKeys.filter(
    (key) =>
      key !== "payment_execution_granted" &&
      key !== "work_execution_authorization_granted",
  );
  for (const key of trueKeys) {
    assertCondition(
      authorization[key] === true,
      `authorization.${key} must be true`,
    );
  }
  assertCondition(
    authorization.payment_execution_granted === false,
    "authorization.payment_execution_granted must be false",
  );
  assertCondition(
    authorization.work_execution_authorization_granted === false,
    "authorization.work_execution_authorization_granted must be false",
  );

  const nonce = requirePattern(
    root.nonce, "nonce", /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/, 1, 128,
  );

  return {
    marker: AGENT_PAID_WORK_PAYMENT_INTENT_MARKER,
    version: 1,
    work_order_id: workOrderId,
    quote_id: quoteId,
    acceptance_id: acceptanceId,
    created_at_utc: createdAtUtc,
    expires_at_utc: expiresAtUtc,
    requester: { agent_id: agentId },
    provider: { provider_id: providerId },
    commercial: {
      quote_asset: quoteAsset,
      total,
      max_fee_total: maxFeeTotal,
      payment_rail_id: paymentRailId,
    },
    authorization: {
      payment_authorization_requested: true,
      exact_quote_total_only: true,
      max_fee_enforced: true,
      one_time_use_required: true,
      replay_protection_required: true,
      single_active_payment_intent_per_acceptance_required: true,
      requester_authentication_required: true,
      provider_authentication_required: true,
      destination_resolution_required: true,
      allowlisted_payment_rail_required: true,
      separate_payment_execution_required: true,
      separate_work_execution_authorization_required: true,
      payment_execution_granted: false,
      work_execution_authorization_granted: false,
      intent_is_not_payment_receipt: true,
      intent_is_not_funds_transfer: true,
      intent_is_not_funds_reservation: true,
    },
    nonce,
  };
}

function validateBindings(
  workOrder: AgentPaidWorkOrderEnvelope,
  quote: AgentPaidWorkQuoteEnvelope,
  acceptance: AgentPaidWorkAcceptanceEnvelope,
  intent: AgentPaidWorkPaymentIntentDraft,
): void {
  assertCondition(intent.work_order_id === workOrder.work_order_id, "work_order_id mismatch");
  assertCondition(intent.quote_id === quote.quote_id, "quote_id mismatch");
  assertCondition(intent.acceptance_id === acceptance.acceptance_id, "acceptance_id mismatch");
  assertCondition(quote.work_order_id === workOrder.work_order_id, "quote/work-order binding mismatch");
  assertCondition(acceptance.work_order_id === workOrder.work_order_id, "acceptance/work-order binding mismatch");
  assertCondition(acceptance.quote_id === quote.quote_id, "acceptance/quote binding mismatch");
  assertCondition(
    intent.requester.agent_id === acceptance.requester.agent_id,
    "requester mismatch",
  );
  assertCondition(
    intent.provider.provider_id === acceptance.provider.provider_id,
    "provider mismatch",
  );
  assertCondition(
    intent.commercial.quote_asset === acceptance.commercial.quote_asset,
    "quote asset mismatch",
  );
  assertCondition(
    intent.commercial.total === acceptance.commercial.total,
    "total must exactly match the acceptance",
  );
  assertCondition(
    intent.commercial.payment_rail_id === acceptance.commercial.payment_rail_id,
    "payment_rail_id mismatch",
  );

  const combined = addDecimals(
    intent.commercial.total,
    intent.commercial.max_fee_total,
  );
  assertCondition(
    compareDecimals(combined, workOrder.commercial.max_total) <= 0,
    "total plus max_fee_total exceeds the work-order max_total",
  );

  const acceptanceCreated = parseUtcSeconds(
    acceptance.created_at_utc, "acceptance created_at_utc",
  );
  const acceptanceExpires = parseUtcSeconds(
    acceptance.expires_at_utc, "acceptance expires_at_utc",
  );
  const quoteExpires = parseUtcSeconds(quote.expires_at_utc, "quote expires_at_utc");
  const workExpires = parseUtcSeconds(workOrder.expires_at_utc, "work-order expires_at_utc");
  const intentCreated = parseUtcSeconds(intent.created_at_utc, "intent created_at_utc");
  const intentExpires = parseUtcSeconds(intent.expires_at_utc, "intent expires_at_utc");
  assertCondition(
    intentCreated >= acceptanceCreated,
    "payment intent cannot be created before acceptance",
  );
  assertCondition(intentCreated < acceptanceExpires, "payment intent must be created before acceptance expiry");
  assertCondition(intentExpires <= acceptanceExpires, "payment intent cannot outlive acceptance");
  assertCondition(intentExpires <= quoteExpires, "payment intent cannot outlive quote");
  assertCondition(intentExpires <= workExpires, "payment intent cannot outlive work order");

  assertCondition(
    acceptance.terms.acceptance_replay_protection_required === true,
    "acceptance must require replay protection",
  );
  assertCondition(
    acceptance.terms.single_active_acceptance_per_quote_required === true,
    "acceptance must require one active acceptance per quote",
  );
  assertCondition(
    acceptance.terms.acceptance_is_not_funds_reservation === true,
    "acceptance must not reserve funds",
  );
  assertCondition(
    acceptance.terms.payment_authorization_granted === false,
    "acceptance must not already grant payment authority",
  );
  assertCondition(
    acceptance.terms.execution_authorization_granted === false,
    "acceptance must not grant execution authority",
  );
}

export function computeAgentPaidWorkPaymentIntentId(
  draft: AgentPaidWorkPaymentIntentDraft,
): string {
  const digest = createHash("sha256").update(canonicalJson(draft)).digest("hex");
  return `${AGENT_PAID_WORK_PAYMENT_INTENT_ID_PREFIX}${digest}`;
}

export function validateAgentPaidWorkPaymentIntentDraft(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  intentValue: unknown,
): asserts intentValue is AgentPaidWorkPaymentIntentDraft {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  validateAgentPaidWorkQuoteEnvelope(workOrderValue, quoteValue);
  validateAgentPaidWorkAcceptanceEnvelope(
    workOrderValue, quoteValue, acceptanceValue,
  );
  const intent = validateDraftShape(intentValue, false);
  validateBindings(workOrderValue, quoteValue, acceptanceValue, intent);
}

export function materializeAgentPaidWorkPaymentIntent(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  intentValue: unknown,
): AgentPaidWorkPaymentIntentEnvelope {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  validateAgentPaidWorkQuoteEnvelope(workOrderValue, quoteValue);
  validateAgentPaidWorkAcceptanceEnvelope(
    workOrderValue, quoteValue, acceptanceValue,
  );
  const draft = validateDraftShape(intentValue, false);
  validateBindings(workOrderValue, quoteValue, acceptanceValue, draft);
  return {
    ...draft,
    payment_intent_id: computeAgentPaidWorkPaymentIntentId(draft),
  };
}

export function validateAgentPaidWorkPaymentIntentEnvelope(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  intentValue: unknown,
): asserts intentValue is AgentPaidWorkPaymentIntentEnvelope {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  validateAgentPaidWorkQuoteEnvelope(workOrderValue, quoteValue);
  validateAgentPaidWorkAcceptanceEnvelope(
    workOrderValue, quoteValue, acceptanceValue,
  );
  const root = requireRecord(intentValue, "payment intent envelope");
  const draft = validateDraftShape(intentValue, true);
  validateBindings(workOrderValue, quoteValue, acceptanceValue, draft);
  const id = requirePattern(
    root.payment_intent_id,
    "payment_intent_id",
    /^voidawpi1_[0-9a-f]{64}$/,
    74,
    74,
  );
  assertCondition(
    id === computeAgentPaidWorkPaymentIntentId(draft),
    "payment_intent_id does not match the canonical payload",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail([
    "usage:",
    "  tsx scripts/agent_paid_work_payment_intent_envelope_v1.ts materialize <work-order.json> <quote.json> <acceptance.json> <intent-draft.json> <intent-envelope.json>",
    "  tsx scripts/agent_paid_work_payment_intent_envelope_v1.ts verify <work-order.json> <quote.json> <acceptance.json> <intent-envelope.json>",
  ].join("\n"));
}

function main(): void {
  const [mode, workPath, quotePath, acceptancePath, intentPath, outputPath, ...extra] =
    process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected extra arguments");

  if (mode === "materialize") {
    assertCondition(
      Boolean(workPath && quotePath && acceptancePath && intentPath && outputPath),
      "materialize requires work-order, quote, acceptance, draft, and output paths",
    );
    const resolvedOutput = resolve(outputPath);
    assertCondition(!existsSync(resolvedOutput), "refusing to overwrite an existing payment intent");
    const envelope = materializeAgentPaidWorkPaymentIntent(
      readJson(resolve(workPath)),
      readJson(resolve(quotePath)),
      readJson(resolve(acceptancePath)),
      readJson(resolve(intentPath)),
    );
    writeFileSync(
      resolvedOutput,
      `${JSON.stringify(envelope, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    console.log(`marker=${envelope.marker}`);
    console.log(`payment_intent_id=${envelope.payment_intent_id}`);
    console.log(`output=${resolvedOutput}`);
    console.log("VOID_AGENT_PAID_WORK_PAYMENT_INTENT_ENVELOPE_V1_MATERIALIZED");
    return;
  }

  if (mode === "verify") {
    assertCondition(
      Boolean(workPath && quotePath && acceptancePath && intentPath) &&
        outputPath === undefined,
      "verify requires work-order, quote, acceptance, and intent-envelope paths",
    );
    const work = readJson(resolve(workPath));
    const quote = readJson(resolve(quotePath));
    const acceptance = readJson(resolve(acceptancePath));
    const intent = readJson(resolve(intentPath));
    validateAgentPaidWorkPaymentIntentEnvelope(work, quote, acceptance, intent);
    console.log(`marker=${intent.marker}`);
    console.log(`work_order_id=${intent.work_order_id}`);
    console.log(`quote_id=${intent.quote_id}`);
    console.log(`acceptance_id=${intent.acceptance_id}`);
    console.log(`payment_intent_id=${intent.payment_intent_id}`);
    console.log(`total=${intent.commercial.total}`);
    console.log(`max_fee_total=${intent.commercial.max_fee_total}`);
    console.log("VOID_AGENT_PAID_WORK_PAYMENT_INTENT_ENVELOPE_V1_VALID");
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
    console.error(`HOLD: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
