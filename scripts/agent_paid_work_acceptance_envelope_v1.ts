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

export const AGENT_PAID_WORK_ACCEPTANCE_MARKER =
  "VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1" as const;
export const AGENT_PAID_WORK_ACCEPTANCE_ID_PREFIX = "voidawa1_" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AgentPaidWorkAcceptanceDraft {
  marker: typeof AGENT_PAID_WORK_ACCEPTANCE_MARKER;
  version: 1;
  work_order_id: string;
  quote_id: string;
  created_at_utc: string;
  expires_at_utc: string;
  requester: {
    agent_id: string;
  };
  provider: {
    provider_id: string;
    capability_id: string;
  };
  commercial: {
    quote_asset: string;
    total: string;
    payment_rail_id: string;
  };
  terms: {
    quote_terms_accepted: true;
    requester_authentication_required: true;
    provider_authentication_required: true;
    separate_payment_authorization_required: true;
    separate_execution_authorization_required: true;
    acceptance_is_not_payment_instruction: true;
    acceptance_is_not_execution_instruction: true;
    acceptance_replay_protection_required: true;
    single_active_acceptance_per_quote_required: true;
    acceptance_is_not_funds_reservation: true;
    payment_authorization_granted: false;
    execution_authorization_granted: false;
  };
  nonce: string;
}

export interface AgentPaidWorkAcceptanceEnvelope
  extends AgentPaidWorkAcceptanceDraft {
  acceptance_id: string;
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
  assertCondition(
    value === value.trim(),
    `${label} must not have surrounding whitespace`,
  );
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

function requirePositiveDecimal(
  value: unknown,
  label: string,
): string {
  const text = requireTrimmedString(value, label, 1, 51);
  assertCondition(
    /^(0|[1-9]\d{0,31})(?:\.\d{1,18})?$/.test(text),
    `${label} must be a bounded decimal string`,
  );
  assertCondition(
    !/^0(?:\.0{1,18})?$/.test(text),
    `${label} must be greater than zero`,
  );
  return text;
}

function parseUtcSeconds(value: string, label: string): number {
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value),
    `${label} must be second-precision UTC`,
  );
  const milliseconds = Date.parse(value);
  assertCondition(
    Number.isFinite(milliseconds),
    `${label} is not a valid UTC time`,
  );
  assertCondition(
    new Date(milliseconds).toISOString() === value.replace("Z", ".000Z"),
    `${label} is not a canonical UTC timestamp`,
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

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  const record = requireRecord(value, "canonical JSON value");
  const result: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(record).sort()) {
    const child = record[key];
    assertCondition(
      child !== undefined,
      "canonical JSON rejects undefined",
    );
    result[key] = canonicalize(child);
  }
  return result;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function validateDraftShape(
  value: unknown,
  allowAcceptanceId: boolean,
): AgentPaidWorkAcceptanceDraft {
  const root = requireRecord(value, "acceptance");
  requireExactKeys(root, "acceptance", [
    "marker",
    "version",
    "work_order_id",
    "quote_id",
    "created_at_utc",
    "expires_at_utc",
    "requester",
    "provider",
    "commercial",
    "terms",
    "nonce",
    ...(allowAcceptanceId ? ["acceptance_id"] : []),
  ]);

  assertCondition(
    root.marker === AGENT_PAID_WORK_ACCEPTANCE_MARKER,
    `marker must be ${AGENT_PAID_WORK_ACCEPTANCE_MARKER}`,
  );
  assertCondition(root.version === 1, "version must be 1");

  const workOrderId = requirePattern(
    root.work_order_id,
    "work_order_id",
    /^voidawo1_[0-9a-f]{64}$/,
    73,
    73,
  );
  const quoteId = requirePattern(
    root.quote_id,
    "quote_id",
    /^voidawq1_[0-9a-f]{64}$/,
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
  const createdSeconds = parseUtcSeconds(
    createdAtUtc,
    "created_at_utc",
  );
  const expiresSeconds = parseUtcSeconds(
    expiresAtUtc,
    "expires_at_utc",
  );
  assertCondition(
    expiresSeconds > createdSeconds,
    "expires_at_utc must be after created_at_utc",
  );

  const requester = requireRecord(root.requester, "requester");
  requireExactKeys(requester, "requester", ["agent_id"]);
  const agentId = requirePattern(
    requester.agent_id,
    "requester.agent_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );

  const provider = requireRecord(root.provider, "provider");
  requireExactKeys(provider, "provider", [
    "provider_id",
    "capability_id",
  ]);
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

  const terms = requireRecord(root.terms, "terms");
  requireExactKeys(terms, "terms", [
    "quote_terms_accepted",
    "requester_authentication_required",
    "provider_authentication_required",
    "separate_payment_authorization_required",
    "separate_execution_authorization_required",
    "acceptance_is_not_payment_instruction",
    "acceptance_is_not_execution_instruction",
    "acceptance_replay_protection_required",
    "single_active_acceptance_per_quote_required",
    "acceptance_is_not_funds_reservation",
    "payment_authorization_granted",
    "execution_authorization_granted",
  ]);
  assertCondition(
    terms.quote_terms_accepted === true,
    "terms.quote_terms_accepted must be true",
  );
  assertCondition(
    terms.requester_authentication_required === true,
    "terms.requester_authentication_required must be true",
  );
  assertCondition(
    terms.provider_authentication_required === true,
    "terms.provider_authentication_required must be true",
  );
  assertCondition(
    terms.separate_payment_authorization_required === true,
    "terms.separate_payment_authorization_required must be true",
  );
  assertCondition(
    terms.separate_execution_authorization_required === true,
    "terms.separate_execution_authorization_required must be true",
  );
  assertCondition(
    terms.acceptance_is_not_payment_instruction === true,
    "terms.acceptance_is_not_payment_instruction must be true",
  );
  assertCondition(
    terms.acceptance_is_not_execution_instruction === true,
    "terms.acceptance_is_not_execution_instruction must be true",
  );
  assertCondition(
    terms.acceptance_replay_protection_required === true,
    "terms.acceptance_replay_protection_required must be true",
  );
  assertCondition(
    terms.single_active_acceptance_per_quote_required === true,
    "terms.single_active_acceptance_per_quote_required must be true",
  );
  assertCondition(
    terms.acceptance_is_not_funds_reservation === true,
    "terms.acceptance_is_not_funds_reservation must be true",
  );
  assertCondition(
    terms.payment_authorization_granted === false,
    "terms.payment_authorization_granted must be false",
  );
  assertCondition(
    terms.execution_authorization_granted === false,
    "terms.execution_authorization_granted must be false",
  );

  const nonce = requirePattern(
    root.nonce,
    "nonce",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/,
    1,
    128,
  );

  return {
    marker: AGENT_PAID_WORK_ACCEPTANCE_MARKER,
    version: 1,
    work_order_id: workOrderId,
    quote_id: quoteId,
    created_at_utc: createdAtUtc,
    expires_at_utc: expiresAtUtc,
    requester: {
      agent_id: agentId,
    },
    provider: {
      provider_id: providerId,
      capability_id: capabilityId,
    },
    commercial: {
      quote_asset: quoteAsset,
      total,
      payment_rail_id: paymentRailId,
    },
    terms: {
      quote_terms_accepted: true,
      requester_authentication_required: true,
      provider_authentication_required: true,
      separate_payment_authorization_required: true,
      separate_execution_authorization_required: true,
      acceptance_is_not_payment_instruction: true,
      acceptance_is_not_execution_instruction: true,
      acceptance_replay_protection_required: true,
      single_active_acceptance_per_quote_required: true,
      acceptance_is_not_funds_reservation: true,
      payment_authorization_granted: false,
      execution_authorization_granted: false,
    },
    nonce,
  };
}

function validateAcceptanceBindings(
  workOrder: AgentPaidWorkOrderEnvelope,
  quote: AgentPaidWorkQuoteEnvelope,
  acceptance: AgentPaidWorkAcceptanceDraft,
): void {
  assertCondition(
    acceptance.work_order_id === workOrder.work_order_id,
    "acceptance work_order_id does not match the supplied work order",
  );
  assertCondition(
    acceptance.quote_id === quote.quote_id,
    "acceptance quote_id does not match the supplied quote",
  );
  assertCondition(
    quote.work_order_id === workOrder.work_order_id,
    "quote is not bound to the supplied work order",
  );
  assertCondition(
    acceptance.requester.agent_id === workOrder.requester.agent_id,
    "acceptance requester does not match the work-order requester",
  );
  assertCondition(
    acceptance.provider.provider_id === quote.provider.provider_id,
    "acceptance provider does not match the quote provider",
  );
  assertCondition(
    acceptance.provider.capability_id === quote.provider.capability_id,
    "acceptance capability does not match the quote capability",
  );
  assertCondition(
    acceptance.commercial.quote_asset === quote.commercial.quote_asset,
    "acceptance quote asset does not match the quote",
  );
  assertCondition(
    acceptance.commercial.total === quote.commercial.total,
    "acceptance total does not exactly match the quote",
  );
  assertCondition(
    acceptance.commercial.payment_rail_id ===
      quote.commercial.payment_rail_id,
    "acceptance payment_rail_id does not exactly match the quote",
  );

  const quoteCreated = parseUtcSeconds(
    quote.created_at_utc,
    "quote created_at_utc",
  );
  const quoteExpires = parseUtcSeconds(
    quote.expires_at_utc,
    "quote expires_at_utc",
  );
  const workExpires = parseUtcSeconds(
    workOrder.expires_at_utc,
    "work-order expires_at_utc",
  );
  const acceptanceCreated = parseUtcSeconds(
    acceptance.created_at_utc,
    "acceptance created_at_utc",
  );
  const acceptanceExpires = parseUtcSeconds(
    acceptance.expires_at_utc,
    "acceptance expires_at_utc",
  );

  assertCondition(
    acceptanceCreated >= quoteCreated,
    "acceptance cannot be created before the quote",
  );
  assertCondition(
    acceptanceCreated < quoteExpires,
    "acceptance must be created before quote expiry",
  );
  assertCondition(
    acceptanceExpires <= quoteExpires,
    "acceptance cannot expire after the quote",
  );
  assertCondition(
    acceptanceExpires <= workExpires,
    "acceptance cannot expire after the work order",
  );

  assertCondition(
    quote.terms.separate_acceptance_required === true,
    "quote must require separate acceptance",
  );
  assertCondition(
    quote.terms.provider_authentication_required === true,
    "quote must preserve provider-authentication requirements",
  );
  assertCondition(
    quote.terms.quote_is_not_payment_instruction === true,
    "quote must preserve the non-payment-instruction boundary",
  );
  assertCondition(
    quote.terms.payment_required_before_execution === true,
    "quote must require payment before execution",
  );
  assertCondition(
    quote.terms.quote_grants_no_execution_authority === true,
    "quote must grant no execution authority",
  );
}

export function computeAgentPaidWorkAcceptanceId(
  draft: AgentPaidWorkAcceptanceDraft,
): string {
  const digest = createHash("sha256")
    .update(canonicalJson(draft))
    .digest("hex");
  return `${AGENT_PAID_WORK_ACCEPTANCE_ID_PREFIX}${digest}`;
}

export function validateAgentPaidWorkAcceptanceDraft(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
): asserts acceptanceValue is AgentPaidWorkAcceptanceDraft {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  validateAgentPaidWorkQuoteEnvelope(workOrderValue, quoteValue);
  const acceptance = validateDraftShape(acceptanceValue, false);
  validateAcceptanceBindings(
    workOrderValue,
    quoteValue,
    acceptance,
  );
}

export function materializeAgentPaidWorkAcceptance(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
): AgentPaidWorkAcceptanceEnvelope {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  validateAgentPaidWorkQuoteEnvelope(workOrderValue, quoteValue);
  const draft = validateDraftShape(acceptanceValue, false);
  validateAcceptanceBindings(workOrderValue, quoteValue, draft);
  return {
    ...draft,
    acceptance_id: computeAgentPaidWorkAcceptanceId(draft),
  };
}

export function validateAgentPaidWorkAcceptanceEnvelope(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
): asserts acceptanceValue is AgentPaidWorkAcceptanceEnvelope {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  validateAgentPaidWorkQuoteEnvelope(workOrderValue, quoteValue);
  const root = requireRecord(acceptanceValue, "acceptance envelope");
  const draft = validateDraftShape(acceptanceValue, true);
  validateAcceptanceBindings(workOrderValue, quoteValue, draft);
  const acceptanceId = requirePattern(
    root.acceptance_id,
    "acceptance_id",
    /^voidawa1_[0-9a-f]{64}$/,
    73,
    73,
  );
  assertCondition(
    acceptanceId === computeAgentPaidWorkAcceptanceId(draft),
    "acceptance_id does not match the canonical acceptance payload",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail(
    [
      "usage:",
      "  tsx scripts/agent_paid_work_acceptance_envelope_v1.ts materialize <work-order.json> <quote.json> <acceptance-draft.json> <acceptance-envelope.json>",
      "  tsx scripts/agent_paid_work_acceptance_envelope_v1.ts verify <work-order.json> <quote.json> <acceptance-envelope.json>",
    ].join("\n"),
  );
}

function main(): void {
  const [
    mode,
    workOrderPath,
    quotePath,
    acceptancePath,
    outputPath,
    ...extra
  ] = process.argv.slice(2);
  assertCondition(extra.length === 0, "unexpected extra arguments");

  if (mode === "materialize") {
    assertCondition(
      Boolean(
        workOrderPath &&
        quotePath &&
        acceptancePath &&
        outputPath
      ),
      "materialize requires work-order, quote, acceptance-draft, and output paths",
    );
    const resolvedOutput = resolve(outputPath);
    assertCondition(
      !existsSync(resolvedOutput),
      "refusing to overwrite an existing acceptance envelope",
    );
    const envelope = materializeAgentPaidWorkAcceptance(
      readJson(resolve(workOrderPath)),
      readJson(resolve(quotePath)),
      readJson(resolve(acceptancePath)),
    );
    writeFileSync(
      resolvedOutput,
      `${JSON.stringify(envelope, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    console.log(`marker=${envelope.marker}`);
    console.log(`work_order_id=${envelope.work_order_id}`);
    console.log(`quote_id=${envelope.quote_id}`);
    console.log(`acceptance_id=${envelope.acceptance_id}`);
    console.log(`output=${resolvedOutput}`);
    console.log(
      "VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1_MATERIALIZED",
    );
    return;
  }

  if (mode === "verify") {
    assertCondition(
      Boolean(workOrderPath && quotePath && acceptancePath) &&
        outputPath === undefined,
      "verify requires work-order, quote, and acceptance-envelope paths",
    );
    const workOrder = readJson(resolve(workOrderPath));
    const quote = readJson(resolve(quotePath));
    const acceptance = readJson(resolve(acceptancePath));
    validateAgentPaidWorkAcceptanceEnvelope(
      workOrder,
      quote,
      acceptance,
    );
    console.log(`marker=${acceptance.marker}`);
    console.log(`work_order_id=${acceptance.work_order_id}`);
    console.log(`quote_id=${acceptance.quote_id}`);
    console.log(`acceptance_id=${acceptance.acceptance_id}`);
    console.log(`requester_agent_id=${acceptance.requester.agent_id}`);
    console.log(`provider_id=${acceptance.provider.provider_id}`);
    console.log(`quote_asset=${acceptance.commercial.quote_asset}`);
    console.log(`total=${acceptance.commercial.total}`);
    console.log(
      "VOID_AGENT_PAID_WORK_ACCEPTANCE_ENVELOPE_V1_VALID",
    );
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
