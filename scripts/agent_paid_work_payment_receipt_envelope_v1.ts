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
import {
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope,
  type AgentPaidWorkPaymentExecutionAuthorizationEnvelope,
} from "./agent_paid_work_payment_execution_authorization_envelope_v1.js";

export const AGENT_PAID_WORK_PAYMENT_RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_PAYMENT_RECEIPT_ENVELOPE_V1" as const;
export const AGENT_PAID_WORK_PAYMENT_RECEIPT_ID_PREFIX =
  "voidawper1_" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AgentPaidWorkPaymentReceiptDraft {
  marker: typeof AGENT_PAID_WORK_PAYMENT_RECEIPT_MARKER;
  version: 1;
  work_order_id: string;
  quote_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  payment_execution_authorization_id: string;
  executed_at_utc: string;
  observed_at_utc: string;
  requester: { agent_id: string };
  provider: { provider_id: string };
  executor: { executor_id: string };
  authorizer: {
    authority_id: string;
    authority_policy_id: string;
  };
  resolution: {
    resolver_id: string;
    payment_rail_resolution_id: string;
    provider_destination_binding_id: string;
  };
  commercial: {
    quote_asset: string;
    service_total: string;
    actual_fee_total: string;
    payment_total: string;
    payment_rail_id: string;
  };
  evidence: {
    executor_attempt_id: string;
    authorization_consumption_id: string;
    rail_receipt_id: string;
    payment_evidence_sha256: string;
  };
  attestation: {
    payment_execution_succeeded: true;
    exact_authorization_consumed: true;
    one_time_use_verified: true;
    duplicate_payment_prevention_verified: true;
    replay_protection_verified: true;
    atomic_consumption_verified: true;
    executor_authentication_required: true;
    executor_signature_required: true;
    payment_rail_confirmation_required: true;
    independent_confirmation_required: true;
    receipt_is_not_independent_confirmation: true;
    receipt_is_not_work_execution_instruction: true;
    work_execution_authorization_separate: true;
    work_execution_authorization_granted: false;
    actual_fee_evidence_required: true;
    unused_fee_not_charged: true;
    provider_destination_binding_revalidated: true;
    rail_asset_compatibility_revalidated: true;
    resolution_records_current_unrevoked_unsuperseded_verified: true;
    payment_amount_within_authorization: true;
    service_total_exact: true;
    payment_total_exact: true;
    receipt_is_not_transaction_signature: true;
    receipt_is_not_funds_reservation: true;
    single_success_receipt_per_authorization_required: true;
    executor_attempt_id_unique_required: true;
    authorization_consumption_id_unique_required: true;
    rail_receipt_id_unique_required: true;
    executor_signature_binds_receipt_and_evidence: true;
    receipt_immutable_and_non_superseding: true;
    failure_receipt_separate_required: true;
  };
  nonce: string;
}

export interface AgentPaidWorkPaymentReceiptEnvelope
  extends AgentPaidWorkPaymentReceiptDraft {
  payment_receipt_id: string;
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
  if (Array.isArray(value)) return value.map(canonicalize);
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

const ATTESTATION_TRUE_KEYS = [
  "payment_execution_succeeded",
  "exact_authorization_consumed",
  "one_time_use_verified",
  "duplicate_payment_prevention_verified",
  "replay_protection_verified",
  "atomic_consumption_verified",
  "executor_authentication_required",
  "executor_signature_required",
  "payment_rail_confirmation_required",
  "independent_confirmation_required",
  "receipt_is_not_independent_confirmation",
  "receipt_is_not_work_execution_instruction",
  "work_execution_authorization_separate",
  "actual_fee_evidence_required",
  "unused_fee_not_charged",
  "provider_destination_binding_revalidated",
  "rail_asset_compatibility_revalidated",
  "resolution_records_current_unrevoked_unsuperseded_verified",
  "payment_amount_within_authorization",
  "service_total_exact",
  "payment_total_exact",
  "receipt_is_not_transaction_signature",
  "receipt_is_not_funds_reservation",
  "single_success_receipt_per_authorization_required",
  "executor_attempt_id_unique_required",
  "authorization_consumption_id_unique_required",
  "rail_receipt_id_unique_required",
  "executor_signature_binds_receipt_and_evidence",
  "receipt_immutable_and_non_superseding",
  "failure_receipt_separate_required",
] as const;

const ATTESTATION_KEYS = [
  ...ATTESTATION_TRUE_KEYS,
  "work_execution_authorization_granted",
] as const;

function validateDraftShape(
  value: unknown,
  allowId: boolean,
): AgentPaidWorkPaymentReceiptDraft {
  const root = requireRecord(value, "payment receipt");
  requireExactKeys(root, "payment receipt", [
    "marker",
    "version",
    "work_order_id",
    "quote_id",
    "acceptance_id",
    "payment_intent_id",
    "payment_execution_authorization_id",
    "executed_at_utc",
    "observed_at_utc",
    "requester",
    "provider",
    "executor",
    "authorizer",
    "resolution",
    "commercial",
    "evidence",
    "attestation",
    "nonce",
    ...(allowId ? ["payment_receipt_id"] : []),
  ]);

  assertCondition(
    root.marker === AGENT_PAID_WORK_PAYMENT_RECEIPT_MARKER,
    `marker must be ${AGENT_PAID_WORK_PAYMENT_RECEIPT_MARKER}`,
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
  const authorizationId = requirePattern(
    root.payment_execution_authorization_id,
    "payment_execution_authorization_id",
    /^voidawpea1_[0-9a-f]{64}$/,
    75,
    75,
  );

  const executedAtUtc = requireTrimmedString(
    root.executed_at_utc,
    "executed_at_utc",
    20,
    20,
  );
  const observedAtUtc = requireTrimmedString(
    root.observed_at_utc,
    "observed_at_utc",
    20,
    20,
  );
  const executed = parseUtcSeconds(executedAtUtc, "executed_at_utc");
  const observed = parseUtcSeconds(observedAtUtc, "observed_at_utc");
  assertCondition(
    observed >= executed,
    "observed_at_utc cannot precede executed_at_utc",
  );
  assertCondition(
    observed - executed <= 300,
    "receipt observation delay must not exceed 300 seconds",
  );

  const requester = requireRecord(root.requester, "requester");
  requireExactKeys(requester, "requester", ["agent_id"]);
  const requesterId = requirePattern(
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

  const commercial = requireRecord(root.commercial, "commercial");
  requireExactKeys(commercial, "commercial", [
    "quote_asset",
    "service_total",
    "actual_fee_total",
    "payment_total",
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
  const actualFeeTotal = requireDecimal(
    commercial.actual_fee_total,
    "commercial.actual_fee_total",
    true,
  );
  const paymentTotal = requireDecimal(
    commercial.payment_total,
    "commercial.payment_total",
    false,
  );
  const paymentRailId = requirePattern(
    commercial.payment_rail_id,
    "commercial.payment_rail_id",
    /^[a-z0-9][a-z0-9._-]{2,127}$/,
    3,
    128,
  );

  const evidence = requireRecord(root.evidence, "evidence");
  requireExactKeys(evidence, "evidence", [
    "executor_attempt_id",
    "authorization_consumption_id",
    "rail_receipt_id",
    "payment_evidence_sha256",
  ]);
  const executorAttemptId = requirePattern(
    evidence.executor_attempt_id,
    "evidence.executor_attempt_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );
  const consumptionId = requirePattern(
    evidence.authorization_consumption_id,
    "evidence.authorization_consumption_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );
  const railReceiptId = requirePattern(
    evidence.rail_receipt_id,
    "evidence.rail_receipt_id",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/,
    3,
    128,
  );
  const evidenceSha = requirePattern(
    evidence.payment_evidence_sha256,
    "evidence.payment_evidence_sha256",
    /^sha256:[0-9a-f]{64}$/,
    71,
    71,
  );

  const attestation = requireRecord(root.attestation, "attestation");
  requireExactKeys(attestation, "attestation", ATTESTATION_KEYS);
  for (const key of ATTESTATION_TRUE_KEYS) {
    assertCondition(
      attestation[key] === true,
      `attestation.${key} must be true`,
    );
  }
  assertCondition(
    attestation.work_execution_authorization_granted === false,
    "attestation.work_execution_authorization_granted must be false",
  );

  const nonce = requirePattern(
    root.nonce,
    "nonce",
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/,
    1,
    128,
  );

  return {
    marker: AGENT_PAID_WORK_PAYMENT_RECEIPT_MARKER,
    version: 1,
    work_order_id: workOrderId,
    quote_id: quoteId,
    acceptance_id: acceptanceId,
    payment_intent_id: paymentIntentId,
    payment_execution_authorization_id: authorizationId,
    executed_at_utc: executedAtUtc,
    observed_at_utc: observedAtUtc,
    requester: { agent_id: requesterId },
    provider: { provider_id: providerId },
    executor: { executor_id: executorId },
    authorizer: {
      authority_id: authorityId,
      authority_policy_id: authorityPolicyId,
    },
    resolution: {
      resolver_id: resolverId,
      payment_rail_resolution_id: railResolutionId,
      provider_destination_binding_id: destinationBindingId,
    },
    commercial: {
      quote_asset: quoteAsset,
      service_total: serviceTotal,
      actual_fee_total: actualFeeTotal,
      payment_total: paymentTotal,
      payment_rail_id: paymentRailId,
    },
    evidence: {
      executor_attempt_id: executorAttemptId,
      authorization_consumption_id: consumptionId,
      rail_receipt_id: railReceiptId,
      payment_evidence_sha256: evidenceSha,
    },
    attestation: {
      payment_execution_succeeded: true,
      exact_authorization_consumed: true,
      one_time_use_verified: true,
      duplicate_payment_prevention_verified: true,
      replay_protection_verified: true,
      atomic_consumption_verified: true,
      executor_authentication_required: true,
      executor_signature_required: true,
      payment_rail_confirmation_required: true,
      independent_confirmation_required: true,
      receipt_is_not_independent_confirmation: true,
      receipt_is_not_work_execution_instruction: true,
      work_execution_authorization_separate: true,
      work_execution_authorization_granted: false,
      actual_fee_evidence_required: true,
      unused_fee_not_charged: true,
      provider_destination_binding_revalidated: true,
      rail_asset_compatibility_revalidated: true,
      resolution_records_current_unrevoked_unsuperseded_verified: true,
      payment_amount_within_authorization: true,
      service_total_exact: true,
      payment_total_exact: true,
      receipt_is_not_transaction_signature: true,
      receipt_is_not_funds_reservation: true,
      single_success_receipt_per_authorization_required: true,
      executor_attempt_id_unique_required: true,
      authorization_consumption_id_unique_required: true,
      rail_receipt_id_unique_required: true,
      executor_signature_binds_receipt_and_evidence: true,
      receipt_immutable_and_non_superseding: true,
      failure_receipt_separate_required: true,
    },
    nonce,
  };
}

function validateBindings(
  workOrder: AgentPaidWorkOrderEnvelope,
  quote: AgentPaidWorkQuoteEnvelope,
  acceptance: AgentPaidWorkAcceptanceEnvelope,
  intent: AgentPaidWorkPaymentIntentEnvelope,
  authorization: AgentPaidWorkPaymentExecutionAuthorizationEnvelope,
  receipt: AgentPaidWorkPaymentReceiptDraft,
): void {
  assertCondition(
    receipt.work_order_id === workOrder.work_order_id,
    "work_order_id mismatch",
  );
  assertCondition(receipt.quote_id === quote.quote_id, "quote_id mismatch");
  assertCondition(
    receipt.acceptance_id === acceptance.acceptance_id,
    "acceptance_id mismatch",
  );
  assertCondition(
    receipt.payment_intent_id === intent.payment_intent_id,
    "payment_intent_id mismatch",
  );
  assertCondition(
    receipt.payment_execution_authorization_id ===
      authorization.payment_execution_authorization_id,
    "payment execution authorization ID mismatch",
  );

  assertCondition(
    receipt.requester.agent_id === authorization.requester.agent_id,
    "requester mismatch",
  );
  assertCondition(
    receipt.provider.provider_id === authorization.provider.provider_id,
    "provider mismatch",
  );
  assertCondition(
    receipt.executor.executor_id === authorization.executor.executor_id,
    "executor mismatch",
  );
  assertCondition(
    receipt.authorizer.authority_id ===
      authorization.authorizer.authority_id,
    "authorizer mismatch",
  );
  assertCondition(
    receipt.authorizer.authority_policy_id ===
      authorization.authorizer.authority_policy_id,
    "authority policy mismatch",
  );
  assertCondition(
    receipt.resolution.resolver_id ===
      authorization.resolution.resolver_id,
    "resolver mismatch",
  );
  assertCondition(
    receipt.resolution.payment_rail_resolution_id ===
      authorization.resolution.payment_rail_resolution_id,
    "rail resolution mismatch",
  );
  assertCondition(
    receipt.resolution.provider_destination_binding_id ===
      authorization.resolution.provider_destination_binding_id,
    "provider destination binding mismatch",
  );

  assertCondition(
    receipt.commercial.quote_asset ===
      authorization.commercial.quote_asset,
    "quote asset mismatch",
  );
  assertCondition(
    receipt.commercial.service_total ===
      authorization.commercial.service_total,
    "service total must exactly match authorization",
  );
  assertCondition(
    receipt.commercial.payment_rail_id ===
      authorization.commercial.payment_rail_id,
    "payment rail mismatch",
  );
  assertCondition(
    compareDecimals(
      receipt.commercial.actual_fee_total,
      authorization.commercial.max_fee_total,
    ) <= 0,
    "actual fee exceeds authorization ceiling",
  );

  const expectedPayment = addDecimals(
    receipt.commercial.service_total,
    receipt.commercial.actual_fee_total,
  );
  assertCondition(
    compareDecimals(
      receipt.commercial.payment_total,
      expectedPayment,
    ) === 0,
    "payment_total must numerically equal service_total plus actual_fee_total",
  );
  assertCondition(
    compareDecimals(
      receipt.commercial.payment_total,
      authorization.commercial.max_payment_total,
    ) <= 0,
    "payment total exceeds authorization maximum",
  );
  assertCondition(
    compareDecimals(
      receipt.commercial.payment_total,
      workOrder.commercial.max_total,
    ) <= 0,
    "payment total exceeds work-order maximum",
  );

  const authorizationCreated = parseUtcSeconds(
    authorization.created_at_utc,
    "authorization created_at_utc",
  );
  const authorizationExpires = parseUtcSeconds(
    authorization.expires_at_utc,
    "authorization expires_at_utc",
  );
  const executed = parseUtcSeconds(
    receipt.executed_at_utc,
    "receipt executed_at_utc",
  );
  assertCondition(
    executed >= authorizationCreated,
    "payment execution cannot predate authorization",
  );
  assertCondition(
    executed <= authorizationExpires,
    "payment execution cannot occur after authorization expiry",
  );

  assertCondition(
    authorization.authorization.payment_execution_authorized === true,
    "authorization must grant payment execution",
  );
  assertCondition(
    authorization.authorization.payment_receipt_required === true,
    "authorization must require a payment receipt",
  );
  assertCondition(
    authorization.authorization.work_execution_authorization_granted === false,
    "authorization must not grant work execution",
  );
  assertCondition(
    authorization.authorization.authorization_is_not_transaction_signature === true,
    "authorization must not be a transaction signature",
  );
}

export function computeAgentPaidWorkPaymentReceiptId(
  draft: AgentPaidWorkPaymentReceiptDraft,
): string {
  const digest = createHash("sha256")
    .update(canonicalJson(draft))
    .digest("hex");
  return `${AGENT_PAID_WORK_PAYMENT_RECEIPT_ID_PREFIX}${digest}`;
}

export function validateAgentPaidWorkPaymentReceiptDraft(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  intentValue: unknown,
  authorizationValue: unknown,
  receiptValue: unknown,
): asserts receiptValue is AgentPaidWorkPaymentReceiptDraft {
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
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
    authorizationValue,
  );
  const receipt = validateDraftShape(receiptValue, false);
  validateBindings(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
    authorizationValue,
    receipt,
  );
}

export function materializeAgentPaidWorkPaymentReceipt(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  intentValue: unknown,
  authorizationValue: unknown,
  receiptValue: unknown,
): AgentPaidWorkPaymentReceiptEnvelope {
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
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
    authorizationValue,
  );
  const draft = validateDraftShape(receiptValue, false);
  validateBindings(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
    authorizationValue,
    draft,
  );
  return {
    ...draft,
    payment_receipt_id:
      computeAgentPaidWorkPaymentReceiptId(draft),
  };
}

export function validateAgentPaidWorkPaymentReceiptEnvelope(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  intentValue: unknown,
  authorizationValue: unknown,
  receiptValue: unknown,
): asserts receiptValue is AgentPaidWorkPaymentReceiptEnvelope {
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
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
    authorizationValue,
  );
  const root = requireRecord(receiptValue, "payment receipt envelope");
  const draft = validateDraftShape(receiptValue, true);
  validateBindings(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    intentValue,
    authorizationValue,
    draft,
  );
  const receiptId = requirePattern(
    root.payment_receipt_id,
    "payment_receipt_id",
    /^voidawper1_[0-9a-f]{64}$/,
    75,
    75,
  );
  assertCondition(
    receiptId === computeAgentPaidWorkPaymentReceiptId(draft),
    "payment_receipt_id does not match canonical payload",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail([
    "usage:",
    "  tsx scripts/agent_paid_work_payment_receipt_envelope_v1.ts materialize <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <authorization.json> <receipt-draft.json> <receipt-envelope.json>",
    "  tsx scripts/agent_paid_work_payment_receipt_envelope_v1.ts verify <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <authorization.json> <receipt-envelope.json>",
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
    receiptPath,
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
        receiptPath &&
        outputPath
      ),
      "materialize requires lineage, authorization, receipt draft, and output",
    );
    const resolvedOutput = resolve(outputPath);
    assertCondition(
      !existsSync(resolvedOutput),
      "refusing to overwrite an existing payment receipt",
    );
    const envelope = materializeAgentPaidWorkPaymentReceipt(
      readJson(resolve(workOrderPath)),
      readJson(resolve(quotePath)),
      readJson(resolve(acceptancePath)),
      readJson(resolve(intentPath)),
      readJson(resolve(authorizationPath)),
      readJson(resolve(receiptPath)),
    );
    writeFileSync(
      resolvedOutput,
      `${JSON.stringify(envelope, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    console.log(`marker=${envelope.marker}`);
    console.log(`payment_receipt_id=${envelope.payment_receipt_id}`);
    console.log(`output=${resolvedOutput}`);
    console.log(
      "VOID_AGENT_PAID_WORK_PAYMENT_RECEIPT_ENVELOPE_V1_MATERIALIZED",
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
        authorizationPath &&
        receiptPath
      ) && outputPath === undefined,
      "verify requires lineage, authorization, and receipt envelope",
    );
    const workOrder = readJson(resolve(workOrderPath));
    const quote = readJson(resolve(quotePath));
    const acceptance = readJson(resolve(acceptancePath));
    const intent = readJson(resolve(intentPath));
    const authorization = readJson(resolve(authorizationPath));
    const receipt = readJson(resolve(receiptPath));
    validateAgentPaidWorkPaymentReceiptEnvelope(
      workOrder,
      quote,
      acceptance,
      intent,
      authorization,
      receipt,
    );
    console.log(`marker=${receipt.marker}`);
    console.log(`work_order_id=${receipt.work_order_id}`);
    console.log(`payment_intent_id=${receipt.payment_intent_id}`);
    console.log(
      `payment_execution_authorization_id=${receipt.payment_execution_authorization_id}`,
    );
    console.log(`payment_receipt_id=${receipt.payment_receipt_id}`);
    console.log(`payment_total=${receipt.commercial.payment_total}`);
    console.log(`actual_fee_total=${receipt.commercial.actual_fee_total}`);
    console.log(
      "VOID_AGENT_PAID_WORK_PAYMENT_RECEIPT_ENVELOPE_V1_VALID",
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
