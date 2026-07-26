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
import {
  addDecimals,
  compareDecimals,
  validateAgentPaidWorkPaymentIntentEnvelope,
  type AgentPaidWorkPaymentIntentEnvelope,
} from "./agent_paid_work_payment_intent_envelope_v1.js";

export const AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_MARKER =
  "VOID_AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_ENVELOPE_V1" as const;
export const AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_ID_PREFIX =
  "voidawpea1_" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AgentPaidWorkPaymentExecutionAuthorizationDraft {
  marker: typeof AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_MARKER;
  version: 1;
  work_order_id: string;
  quote_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  created_at_utc: string;
  expires_at_utc: string;
  requester: {
    agent_id: string;
  };
  provider: {
    provider_id: string;
  };
  executor: {
    executor_id: string;
  };
  authorizer: {
    authority_id: string;
    authority_policy_id: string;
  };
  resolution: {
    resolver_id: string;
    payment_rail_resolution_id: string;
    provider_destination_binding_id: string;
    resolved_at_utc: string;
  };
  commercial: {
    quote_asset: string;
    service_total: string;
    max_fee_total: string;
    max_payment_total: string;
    payment_rail_id: string;
  };
  authorization: {
    payment_execution_authorized: true;
    exact_payment_intent_only: true;
    one_time_use_required: true;
    duplicate_payment_prevention_required: true;
    replay_protection_required: true;
    atomic_consumption_required: true;
    single_active_execution_authorization_per_intent_required: true;
    requester_authentication_required: true;
    provider_authentication_required: true;
    executor_authentication_required: true;
    resolver_authentication_required: true;
    authorizer_authentication_required: true;
    authorization_signature_required: true;
    authority_policy_binding_required: true;
    authorizer_executor_separation_required: true;
    authorizer_resolver_separation_required: true;
    executor_resolver_separation_required: true;
    destination_binding_verified: true;
    allowlisted_payment_rail_required: true;
    rail_asset_compatibility_verified: true;
    resolution_records_current_required: true;
    resolution_records_unrevoked_required: true;
    resolution_records_not_superseded_required: true;
    executor_resolution_revalidation_at_execution_required: true;
    service_total_exact: true;
    actual_fee_not_to_exceed_max_required: true;
    actual_fee_evidence_required: true;
    unused_fee_not_chargeable: true;
    payment_amount_not_to_exceed_max_total: true;
    payment_receipt_required: true;
    payment_confirmation_required_before_work_execution: true;
    failure_must_not_grant_partial_authority: true;
    work_execution_authorization_separate: true;
    work_execution_authorization_granted: false;
    authorization_is_not_payment_receipt: true;
    authorization_is_not_work_execution_instruction: true;
    authorization_is_not_funds_reservation: true;
    authorization_is_not_transaction_signature: true;
  };
  nonce: string;
}

export interface AgentPaidWorkPaymentExecutionAuthorizationEnvelope
  extends AgentPaidWorkPaymentExecutionAuthorizationDraft {
  payment_execution_authorization_id: string;
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
  assertCondition(
    value === value.trim(),
    `${label} must not have surrounding whitespace`,
  );
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

function parseUtcSeconds(value: string, label: string): number {
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value),
    `${label} must be second-precision UTC`,
  );
  const milliseconds = Date.parse(value);
  assertCondition(
    Number.isFinite(milliseconds),
    `${label} is not valid UTC`,
  );
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

const AUTHORIZATION_TRUE_KEYS = [
  "payment_execution_authorized",
  "exact_payment_intent_only",
  "one_time_use_required",
  "duplicate_payment_prevention_required",
  "replay_protection_required",
  "atomic_consumption_required",
  "single_active_execution_authorization_per_intent_required",
  "requester_authentication_required",
  "provider_authentication_required",
  "executor_authentication_required",
  "resolver_authentication_required",
  "authorizer_authentication_required",
  "authorization_signature_required",
  "authority_policy_binding_required",
  "authorizer_executor_separation_required",
  "authorizer_resolver_separation_required",
  "executor_resolver_separation_required",
  "destination_binding_verified",
  "allowlisted_payment_rail_required",
  "rail_asset_compatibility_verified",
  "resolution_records_current_required",
  "resolution_records_unrevoked_required",
  "resolution_records_not_superseded_required",
  "executor_resolution_revalidation_at_execution_required",
  "service_total_exact",
  "actual_fee_not_to_exceed_max_required",
  "actual_fee_evidence_required",
  "unused_fee_not_chargeable",
  "payment_amount_not_to_exceed_max_total",
  "payment_receipt_required",
  "payment_confirmation_required_before_work_execution",
  "failure_must_not_grant_partial_authority",
  "work_execution_authorization_separate",
  "authorization_is_not_payment_receipt",
  "authorization_is_not_work_execution_instruction",
  "authorization_is_not_funds_reservation",
  "authorization_is_not_transaction_signature",
] as const;

const AUTHORIZATION_KEYS = [
  ...AUTHORIZATION_TRUE_KEYS,
  "work_execution_authorization_granted",
] as const;

function validateDraftShape(
  value: unknown,
  allowId: boolean,
): AgentPaidWorkPaymentExecutionAuthorizationDraft {
  const root = requireRecord(value, "payment execution authorization");
  requireExactKeys(root, "payment execution authorization", [
    "marker",
    "version",
    "work_order_id",
    "quote_id",
    "acceptance_id",
    "payment_intent_id",
    "created_at_utc",
    "expires_at_utc",
    "requester",
    "provider",
    "executor",
    "authorizer",
    "resolution",
    "commercial",
    "authorization",
    "nonce",
    ...(allowId ? ["payment_execution_authorization_id"] : []),
  ]);

  assertCondition(
    root.marker === AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_MARKER,
    `marker must be ${AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_MARKER}`,
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
  const acceptanceId = requirePattern(
    root.acceptance_id,
    "acceptance_id",
    /^voidawa1_[0-9a-f]{64}$/,
    73,
    73,
  );
  const paymentIntentId = requirePattern(
    root.payment_intent_id,
    "payment_intent_id",
    /^voidawpi1_[0-9a-f]{64}$/,
    74,
    74,
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
  const created = parseUtcSeconds(createdAtUtc, "created_at_utc");
  const expires = parseUtcSeconds(expiresAtUtc, "expires_at_utc");
  assertCondition(
    expires > created,
    "expires_at_utc must be after created_at_utc",
  );
  assertCondition(
    expires - created <= 900,
    "payment execution authorization lifetime must not exceed 900 seconds",
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
  requireExactKeys(provider, "provider", ["provider_id"]);
  const providerId = requirePattern(
    provider.provider_id,
    "provider.provider_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );

  const executor = requireRecord(root.executor, "executor");
  requireExactKeys(executor, "executor", ["executor_id"]);
  const executorId = requirePattern(
    executor.executor_id,
    "executor.executor_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );

  const authorizer = requireRecord(root.authorizer, "authorizer");
  requireExactKeys(authorizer, "authorizer", [
    "authority_id",
    "authority_policy_id",
  ]);
  const authorityId = requirePattern(
    authorizer.authority_id,
    "authorizer.authority_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );
  const authorityPolicyId = requirePattern(
    authorizer.authority_policy_id,
    "authorizer.authority_policy_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );

  const resolution = requireRecord(root.resolution, "resolution");
  requireExactKeys(resolution, "resolution", [
    "resolver_id",
    "payment_rail_resolution_id",
    "provider_destination_binding_id",
    "resolved_at_utc",
  ]);
  const resolverId = requirePattern(
    resolution.resolver_id,
    "resolution.resolver_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );
  const railResolutionId = requirePattern(
    resolution.payment_rail_resolution_id,
    "resolution.payment_rail_resolution_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );
  const destinationBindingId = requirePattern(
    resolution.provider_destination_binding_id,
    "resolution.provider_destination_binding_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );
  const resolvedAtUtc = requireTrimmedString(
    resolution.resolved_at_utc,
    "resolution.resolved_at_utc",
    20,
    20,
  );
  parseUtcSeconds(resolvedAtUtc, "resolution.resolved_at_utc");

  const commercial = requireRecord(root.commercial, "commercial");
  requireExactKeys(commercial, "commercial", [
    "quote_asset",
    "service_total",
    "max_fee_total",
    "max_payment_total",
    "payment_rail_id",
  ]);
  const quoteAsset = requirePattern(
    commercial.quote_asset,
    "commercial.quote_asset",
    /^[A-Z][A-Z0-9._:-]{0,31}$/,
    1,
    32,
  );
  const serviceTotal = requireDecimal(
    commercial.service_total,
    "commercial.service_total",
    false,
  );
  const maxFeeTotal = requireDecimal(
    commercial.max_fee_total,
    "commercial.max_fee_total",
    true,
  );
  const maxPaymentTotal = requireDecimal(
    commercial.max_payment_total,
    "commercial.max_payment_total",
    false,
  );
  const paymentRailId = requirePattern(
    commercial.payment_rail_id,
    "commercial.payment_rail_id",
    /^[a-z0-9][a-z0-9._-]{2,127}$/,
    3,
    128,
  );

  const authorization = requireRecord(root.authorization, "authorization");
  requireExactKeys(
    authorization,
    "authorization",
    AUTHORIZATION_KEYS,
  );
  for (const key of AUTHORIZATION_TRUE_KEYS) {
    assertCondition(
      authorization[key] === true,
      `authorization.${key} must be true`,
    );
  }
  assertCondition(
    authorization.work_execution_authorization_granted === false,
    "authorization.work_execution_authorization_granted must be false",
  );

  const nonce = requirePattern(
    root.nonce,
    "nonce",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/,
    1,
    128,
  );

  return {
    marker: AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_MARKER,
    version: 1,
    work_order_id: workOrderId,
    quote_id: quoteId,
    acceptance_id: acceptanceId,
    payment_intent_id: paymentIntentId,
    created_at_utc: createdAtUtc,
    expires_at_utc: expiresAtUtc,
    requester: {
      agent_id: agentId,
    },
    provider: {
      provider_id: providerId,
    },
    executor: {
      executor_id: executorId,
    },
    authorizer: {
      authority_id: authorityId,
      authority_policy_id: authorityPolicyId,
    },
    resolution: {
      resolver_id: resolverId,
      payment_rail_resolution_id: railResolutionId,
      provider_destination_binding_id: destinationBindingId,
      resolved_at_utc: resolvedAtUtc,
    },
    commercial: {
      quote_asset: quoteAsset,
      service_total: serviceTotal,
      max_fee_total: maxFeeTotal,
      max_payment_total: maxPaymentTotal,
      payment_rail_id: paymentRailId,
    },
    authorization: {
      payment_execution_authorized: true,
      exact_payment_intent_only: true,
      one_time_use_required: true,
      duplicate_payment_prevention_required: true,
      replay_protection_required: true,
      atomic_consumption_required: true,
      single_active_execution_authorization_per_intent_required: true,
      requester_authentication_required: true,
      provider_authentication_required: true,
      executor_authentication_required: true,
      resolver_authentication_required: true,
      authorizer_authentication_required: true,
      authorization_signature_required: true,
      authority_policy_binding_required: true,
      authorizer_executor_separation_required: true,
      authorizer_resolver_separation_required: true,
      executor_resolver_separation_required: true,
      destination_binding_verified: true,
      allowlisted_payment_rail_required: true,
      rail_asset_compatibility_verified: true,
      resolution_records_current_required: true,
      resolution_records_unrevoked_required: true,
      resolution_records_not_superseded_required: true,
      executor_resolution_revalidation_at_execution_required: true,
      service_total_exact: true,
      actual_fee_not_to_exceed_max_required: true,
      actual_fee_evidence_required: true,
      unused_fee_not_chargeable: true,
      payment_amount_not_to_exceed_max_total: true,
      payment_receipt_required: true,
      payment_confirmation_required_before_work_execution: true,
      failure_must_not_grant_partial_authority: true,
      work_execution_authorization_separate: true,
      work_execution_authorization_granted: false,
      authorization_is_not_payment_receipt: true,
      authorization_is_not_work_execution_instruction: true,
      authorization_is_not_funds_reservation: true,
      authorization_is_not_transaction_signature: true,
    },
    nonce,
  };
}

function validateBindings(
  workOrder: AgentPaidWorkOrderEnvelope,
  quote: AgentPaidWorkQuoteEnvelope,
  acceptance: AgentPaidWorkAcceptanceEnvelope,
  intent: AgentPaidWorkPaymentIntentEnvelope,
  authorization: AgentPaidWorkPaymentExecutionAuthorizationDraft,
): void {
  assertCondition(
    authorization.work_order_id === workOrder.work_order_id,
    "work_order_id mismatch",
  );
  assertCondition(
    authorization.quote_id === quote.quote_id,
    "quote_id mismatch",
  );
  assertCondition(
    authorization.acceptance_id === acceptance.acceptance_id,
    "acceptance_id mismatch",
  );
  assertCondition(
    authorization.payment_intent_id === intent.payment_intent_id,
    "payment_intent_id mismatch",
  );
  assertCondition(
    intent.work_order_id === workOrder.work_order_id &&
      intent.quote_id === quote.quote_id &&
      intent.acceptance_id === acceptance.acceptance_id,
    "payment-intent lineage mismatch",
  );
  assertCondition(
    authorization.requester.agent_id === intent.requester.agent_id,
    "requester mismatch",
  );
  assertCondition(
    authorization.provider.provider_id === intent.provider.provider_id,
    "provider mismatch",
  );
  assertCondition(
    authorization.authorizer.authority_id !==
      authorization.executor.executor_id,
    "authorizer and executor identities must be distinct",
  );
  assertCondition(
    authorization.authorizer.authority_id !==
      authorization.resolution.resolver_id,
    "authorizer and resolver identities must be distinct",
  );
  assertCondition(
    authorization.executor.executor_id !==
      authorization.resolution.resolver_id,
    "executor and resolver identities must be distinct",
  );
  assertCondition(
    authorization.commercial.quote_asset === intent.commercial.quote_asset,
    "quote asset mismatch",
  );
  assertCondition(
    authorization.commercial.service_total === intent.commercial.total,
    "service total must exactly match payment intent total",
  );
  assertCondition(
    authorization.commercial.payment_rail_id ===
      intent.commercial.payment_rail_id,
    "payment rail mismatch",
  );
  assertCondition(
    compareDecimals(
      authorization.commercial.max_fee_total,
      intent.commercial.max_fee_total,
    ) <= 0,
    "authorization fee ceiling exceeds payment-intent fee ceiling",
  );

  const expectedMaximum = addDecimals(
    authorization.commercial.service_total,
    authorization.commercial.max_fee_total,
  );
  assertCondition(
    compareDecimals(
      authorization.commercial.max_payment_total,
      expectedMaximum,
    ) === 0,
    "max_payment_total must numerically equal service_total plus max_fee_total",
  );
  assertCondition(
    compareDecimals(
      authorization.commercial.max_payment_total,
      workOrder.commercial.max_total,
    ) <= 0,
    "max_payment_total exceeds work-order max_total",
  );

  const intentCreated = parseUtcSeconds(
    intent.created_at_utc,
    "payment-intent created_at_utc",
  );
  const intentExpires = parseUtcSeconds(
    intent.expires_at_utc,
    "payment-intent expires_at_utc",
  );
  const authorizationCreated = parseUtcSeconds(
    authorization.created_at_utc,
    "authorization created_at_utc",
  );
  const authorizationExpires = parseUtcSeconds(
    authorization.expires_at_utc,
    "authorization expires_at_utc",
  );
  const resolvedAt = parseUtcSeconds(
    authorization.resolution.resolved_at_utc,
    "resolution resolved_at_utc",
  );

  assertCondition(
    resolvedAt >= intentCreated,
    "resolution cannot predate payment intent",
  );
  assertCondition(
    resolvedAt <= authorizationCreated,
    "resolution cannot occur after authorization creation",
  );
  assertCondition(
    authorizationCreated >= intentCreated,
    "authorization cannot predate payment intent",
  );
  assertCondition(
    authorizationCreated < intentExpires,
    "authorization must be created before payment-intent expiry",
  );
  assertCondition(
    authorizationExpires <= intentExpires,
    "authorization cannot outlive payment intent",
  );

  assertCondition(
    intent.authorization.separate_payment_execution_required === true,
    "payment intent must require separate payment execution",
  );
  assertCondition(
    intent.authorization.payment_execution_granted === false,
    "payment intent must not already grant payment execution",
  );
  assertCondition(
    intent.authorization.separate_work_execution_authorization_required === true,
    "payment intent must preserve separate work authorization",
  );
  assertCondition(
    intent.authorization.work_execution_authorization_granted === false,
    "payment intent must not grant work execution",
  );
}

export function computeAgentPaidWorkPaymentExecutionAuthorizationId(
  draft: AgentPaidWorkPaymentExecutionAuthorizationDraft,
): string {
  const digest = createHash("sha256")
    .update(canonicalJson(draft))
    .digest("hex");
  return `${AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_ID_PREFIX}${digest}`;
}

export function validateAgentPaidWorkPaymentExecutionAuthorizationDraft(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  intentValue: unknown,
  authorizationValue: unknown,
): asserts authorizationValue is AgentPaidWorkPaymentExecutionAuthorizationDraft {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  validateAgentPaidWorkQuoteEnvelope(workOrderValue, quoteValue);
  validateAgentPaidWorkAcceptanceEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
  );
  validateAgentPaidWorkPaymentIntentEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
  );
  const authorization = validateDraftShape(authorizationValue, false);
  validateBindings(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
    authorization,
  );
}

export function materializeAgentPaidWorkPaymentExecutionAuthorization(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  intentValue: unknown,
  authorizationValue: unknown,
): AgentPaidWorkPaymentExecutionAuthorizationEnvelope {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  validateAgentPaidWorkQuoteEnvelope(workOrderValue, quoteValue);
  validateAgentPaidWorkAcceptanceEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
  );
  validateAgentPaidWorkPaymentIntentEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
  );
  const draft = validateDraftShape(authorizationValue, false);
  validateBindings(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
    draft,
  );
  return {
    ...draft,
    payment_execution_authorization_id:
      computeAgentPaidWorkPaymentExecutionAuthorizationId(draft),
  };
}

export function validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  intentValue: unknown,
  authorizationValue: unknown,
): asserts authorizationValue is AgentPaidWorkPaymentExecutionAuthorizationEnvelope {
  validateAgentPaidWorkOrderEnvelope(workOrderValue);
  validateAgentPaidWorkQuoteEnvelope(workOrderValue, quoteValue);
  validateAgentPaidWorkAcceptanceEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
  );
  validateAgentPaidWorkPaymentIntentEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
  );
  const root = requireRecord(
    authorizationValue,
    "payment execution authorization envelope",
  );
  const draft = validateDraftShape(authorizationValue, true);
  validateBindings(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
    draft,
  );
  const authorizationId = requirePattern(
    root.payment_execution_authorization_id,
    "payment_execution_authorization_id",
    /^voidawpea1_[0-9a-f]{64}$/,
    75,
    75,
  );
  assertCondition(
    authorizationId ===
      computeAgentPaidWorkPaymentExecutionAuthorizationId(draft),
    "payment_execution_authorization_id does not match canonical payload",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail([
    "usage:",
    "  tsx scripts/agent_paid_work_payment_execution_authorization_envelope_v1.ts materialize <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <authorization-draft.json> <authorization-envelope.json>",
    "  tsx scripts/agent_paid_work_payment_execution_authorization_envelope_v1.ts verify <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <authorization-envelope.json>",
  ].join("\n"));
}

function main(): void {
  const [
    mode,
    workOrderPath,
    quotePath,
    acceptancePath,
    intentPath,
    authorizationPath,
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
        intentPath &&
        authorizationPath &&
        outputPath
      ),
      "materialize requires work-order, quote, acceptance, intent, draft, and output",
    );
    const resolvedOutput = resolve(outputPath);
    assertCondition(
      !existsSync(resolvedOutput),
      "refusing to overwrite an existing authorization envelope",
    );
    const envelope =
      materializeAgentPaidWorkPaymentExecutionAuthorization(
        readJson(resolve(workOrderPath)),
        readJson(resolve(quotePath)),
        readJson(resolve(acceptancePath)),
        readJson(resolve(intentPath)),
        readJson(resolve(authorizationPath)),
      );
    writeFileSync(
      resolvedOutput,
      `${JSON.stringify(envelope, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    console.log(`marker=${envelope.marker}`);
    console.log(
      `payment_execution_authorization_id=${envelope.payment_execution_authorization_id}`,
    );
    console.log(`output=${resolvedOutput}`);
    console.log(
      "VOID_AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_ENVELOPE_V1_MATERIALIZED",
    );
    return;
  }

  if (mode === "verify") {
    assertCondition(
      Boolean(
        workOrderPath &&
        quotePath &&
        acceptancePath &&
        intentPath &&
        authorizationPath
      ) && outputPath === undefined,
      "verify requires work-order, quote, acceptance, intent, and authorization",
    );
    const workOrder = readJson(resolve(workOrderPath));
    const quote = readJson(resolve(quotePath));
    const acceptance = readJson(resolve(acceptancePath));
    const intent = readJson(resolve(intentPath));
    const authorization = readJson(resolve(authorizationPath));
    validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(
      workOrder,
      quote,
      acceptance,
      intent,
      authorization,
    );
    console.log(`marker=${authorization.marker}`);
    console.log(`work_order_id=${authorization.work_order_id}`);
    console.log(`quote_id=${authorization.quote_id}`);
    console.log(`acceptance_id=${authorization.acceptance_id}`);
    console.log(`payment_intent_id=${authorization.payment_intent_id}`);
    console.log(
      `payment_execution_authorization_id=${authorization.payment_execution_authorization_id}`,
    );
    console.log(`executor_id=${authorization.executor.executor_id}`);
    console.log(`max_payment_total=${authorization.commercial.max_payment_total}`);
    console.log(
      "VOID_AGENT_PAID_WORK_PAYMENT_EXECUTION_AUTHORIZATION_ENVELOPE_V1_VALID",
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
    console.error(
      `HOLD: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
