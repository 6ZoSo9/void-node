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
  validateAgentPaidWorkPaymentIntentEnvelope,
  type AgentPaidWorkPaymentIntentEnvelope,
} from "./agent_paid_work_payment_intent_envelope_v1.js";
import {
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope,
  type AgentPaidWorkPaymentExecutionAuthorizationEnvelope,
} from "./agent_paid_work_payment_execution_authorization_envelope_v1.js";
import {
  validateAgentPaidWorkPaymentReceiptEnvelope,
  type AgentPaidWorkPaymentReceiptEnvelope,
} from "./agent_paid_work_payment_receipt_envelope_v1.js";
import {
  validateEnvelope as validateAgentPaidWorkIndependentPaymentConfirmationEnvelope,
  type AgentPaidWorkIndependentPaymentConfirmationEnvelope,
} from "./agent_paid_work_independent_payment_confirmation_envelope_v1.js";

export const AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_MARKER =
  "VOID_AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_ENVELOPE_V1" as const;
export const AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_ID_PREFIX =
  "voidawwea1_" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AgentPaidWorkExecutionAuthorizationDraft {
  marker: typeof AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_MARKER;
  version: 1;
  work_order_id: string;
  quote_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  payment_execution_authorization_id: string;
  payment_receipt_id: string;
  payment_confirmation_id: string;
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
  completion_verifier: {
    verifier_id: string;
    verification_policy_id: string;
  };
  work_contract: {
    task_type: string;
    task_spec_sha256: string;
    input_manifest_sha256: string;
    expected_output_schema_sha256: string;
    result_delivery_channel_id: string;
  };
  resource_limits: {
    max_wall_clock_seconds: number;
    max_cpu_seconds: number;
    max_memory_bytes: number;
    max_output_bytes: number;
    max_network_requests: number;
    max_retry_count: number;
  };
  capability_policy: {
    allowed_capability_ids: string[];
    network_allowlist_ids: string[];
    data_classification:
      | "public"
      | "internal"
      | "confidential"
      | "restricted";
    sandbox_required: true;
    secrets_allowed: false;
    wallet_access_allowed: false;
    payment_mutation_allowed: false;
    work_credit_mutation_allowed: false;
    buy_void_fulfillment_allowed: false;
    runtime_administration_allowed: false;
    host_filesystem_write_allowed: false;
    external_side_effects_allowed: false;
  };
  authorization: {
    work_execution_authorized: true;
    exact_payment_confirmation_only: true;
    exact_task_spec_only: true;
    one_time_use_required: true;
    replay_protection_required: true;
    atomic_consumption_required: true;
    single_active_execution_authorization_per_confirmation_required: true;
    requester_authentication_required: true;
    provider_authentication_required: true;
    executor_authentication_required: true;
    authorizer_authentication_required: true;
    authorization_signature_required: true;
    authority_policy_binding_required: true;
    provider_executor_binding_required: true;
    authorizer_executor_separation_required: true;
    completion_verifier_executor_separation_required: true;
    completion_verifier_authorizer_separation_required: true;
    resource_limits_enforced: true;
    capability_allowlist_enforced: true;
    network_allowlist_enforced: true;
    input_integrity_verification_required: true;
    output_commitment_required: true;
    completion_receipt_required: true;
    independent_completion_verification_required: true;
    payment_state_immutable: true;
    authorization_is_not_completion_receipt: true;
    authorization_is_not_work_completion_confirmation: true;
    authorization_is_not_wc_award_instruction: true;
    authorization_is_not_payment_instruction: true;
  };
  nonce: string;
}

export interface AgentPaidWorkExecutionAuthorizationEnvelope
  extends AgentPaidWorkExecutionAuthorizationDraft {
  work_execution_authorization_id: string;
}

const AUTHORIZATION_TRUE_KEYS = [
  "work_execution_authorized",
  "exact_payment_confirmation_only",
  "exact_task_spec_only",
  "one_time_use_required",
  "replay_protection_required",
  "atomic_consumption_required",
  "single_active_execution_authorization_per_confirmation_required",
  "requester_authentication_required",
  "provider_authentication_required",
  "executor_authentication_required",
  "authorizer_authentication_required",
  "authorization_signature_required",
  "authority_policy_binding_required",
  "provider_executor_binding_required",
  "authorizer_executor_separation_required",
  "completion_verifier_executor_separation_required",
  "completion_verifier_authorizer_separation_required",
  "resource_limits_enforced",
  "capability_allowlist_enforced",
  "network_allowlist_enforced",
  "input_integrity_verification_required",
  "output_commitment_required",
  "completion_receipt_required",
  "independent_completion_verification_required",
  "payment_state_immutable",
  "authorization_is_not_completion_receipt",
  "authorization_is_not_work_completion_confirmation",
  "authorization_is_not_wc_award_instruction",
  "authorization_is_not_payment_instruction",
] as const;

const ROOT_KEYS = [
  "marker",
  "version",
  "work_order_id",
  "quote_id",
  "acceptance_id",
  "payment_intent_id",
  "payment_execution_authorization_id",
  "payment_receipt_id",
  "payment_confirmation_id",
  "created_at_utc",
  "expires_at_utc",
  "requester",
  "provider",
  "executor",
  "authorizer",
  "completion_verifier",
  "work_contract",
  "resource_limits",
  "capability_policy",
  "authorization",
  "nonce",
] as const;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const TASK_TYPE_PATTERN = /^[a-z0-9][a-z0-9._-]{2,127}$/;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    fail(message);
  }
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
  expectedKeys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} keys must be exactly: ${expected.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  pattern?: RegExp,
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
  if (pattern) {
    assertCondition(pattern.test(value), `${label} has invalid format`);
  }
  return value;
}

function requireSafeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    typeof value === "number" && Number.isSafeInteger(value),
    `${label} must be a safe integer`,
  );
  assertCondition(
    value >= minimum && value <= maximum,
    `${label} must be ${minimum}..${maximum}`,
  );
  return value;
}

function requireBooleanLiteral(
  value: unknown,
  label: string,
  expected: boolean,
): void {
  assertCondition(value === expected, `${label} must be ${expected}`);
}

function parseUtcSeconds(value: string, label: string): number {
  assertCondition(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value),
    `${label} must be second-precision UTC`,
  );
  const milliseconds = Date.parse(value);
  assertCondition(Number.isFinite(milliseconds), `${label} is invalid UTC`);
  assertCondition(
    new Date(milliseconds).toISOString() === value.replace("Z", ".000Z"),
    `${label} is not canonical UTC`,
  );
  return milliseconds / 1000;
}

function requireSortedUniqueIds(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): string[] {
  assertCondition(Array.isArray(value), `${label} must be an array`);
  assertCondition(
    value.length >= minimum && value.length <= maximum,
    `${label} item count must be ${minimum}..${maximum}`,
  );

  const normalized = value.map((item, index) =>
    requireString(item, `${label}[${index}]`, 3, 128, ID_PATTERN),
  );
  const unique = new Set(normalized);
  assertCondition(
    unique.size === normalized.length,
    `${label} must not contain duplicates`,
  );
  const sorted = [...normalized].sort();
  assertCondition(
    JSON.stringify(normalized) === JSON.stringify(sorted),
    `${label} must be lexicographically sorted`,
  );
  return normalized;
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
  const source = requireRecord(value, "canonical JSON value");
  const result: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(source).sort()) {
    const child = source[key];
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
): AgentPaidWorkExecutionAuthorizationDraft {
  const root = requireRecord(value, "work execution authorization");
  requireExactKeys(
    root,
    "work execution authorization",
    [
      ...ROOT_KEYS,
      ...(allowId ? ["work_execution_authorization_id"] : []),
    ],
  );

  assertCondition(
    root.marker === AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_MARKER,
    `marker must be ${AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_MARKER}`,
  );
  assertCondition(root.version === 1, "version must be 1");

  const workOrderId = requireString(
    root.work_order_id,
    "work_order_id",
    73,
    73,
    /^voidawo1_[0-9a-f]{64}$/,
  );
  const quoteId = requireString(
    root.quote_id,
    "quote_id",
    73,
    73,
    /^voidawq1_[0-9a-f]{64}$/,
  );
  const acceptanceId = requireString(
    root.acceptance_id,
    "acceptance_id",
    73,
    73,
    /^voidawa1_[0-9a-f]{64}$/,
  );
  const paymentIntentId = requireString(
    root.payment_intent_id,
    "payment_intent_id",
    74,
    74,
    /^voidawpi1_[0-9a-f]{64}$/,
  );
  const paymentExecutionAuthorizationId = requireString(
    root.payment_execution_authorization_id,
    "payment_execution_authorization_id",
    75,
    75,
    /^voidawpea1_[0-9a-f]{64}$/,
  );
  const paymentReceiptId = requireString(
    root.payment_receipt_id,
    "payment_receipt_id",
    75,
    75,
    /^voidawper1_[0-9a-f]{64}$/,
  );
  const paymentConfirmationId = requireString(
    root.payment_confirmation_id,
    "payment_confirmation_id",
    74,
    74,
    /^voidawpc1_[0-9a-f]{64}$/,
  );

  const createdAtUtc = requireString(
    root.created_at_utc,
    "created_at_utc",
    20,
    20,
  );
  const expiresAtUtc = requireString(
    root.expires_at_utc,
    "expires_at_utc",
    20,
    20,
  );
  const created = parseUtcSeconds(createdAtUtc, "created_at_utc");
  const expires = parseUtcSeconds(expiresAtUtc, "expires_at_utc");
  assertCondition(expires > created, "expires_at_utc must follow created_at_utc");
  assertCondition(
    expires - created <= 900,
    "work execution authorization lifetime must not exceed 900 seconds",
  );

  const requester = requireRecord(root.requester, "requester");
  requireExactKeys(requester, "requester", ["agent_id"]);
  const requesterId = requireString(
    requester.agent_id,
    "requester.agent_id",
    3,
    128,
    ID_PATTERN,
  );

  const provider = requireRecord(root.provider, "provider");
  requireExactKeys(provider, "provider", ["provider_id"]);
  const providerId = requireString(
    provider.provider_id,
    "provider.provider_id",
    3,
    128,
    ID_PATTERN,
  );

  const executor = requireRecord(root.executor, "executor");
  requireExactKeys(executor, "executor", ["executor_id"]);
  const executorId = requireString(
    executor.executor_id,
    "executor.executor_id",
    3,
    128,
    ID_PATTERN,
  );

  const authorizer = requireRecord(root.authorizer, "authorizer");
  requireExactKeys(authorizer, "authorizer", [
    "authority_id",
    "authority_policy_id",
  ]);
  const authorityId = requireString(
    authorizer.authority_id,
    "authorizer.authority_id",
    3,
    128,
    ID_PATTERN,
  );
  const authorityPolicyId = requireString(
    authorizer.authority_policy_id,
    "authorizer.authority_policy_id",
    3,
    128,
    ID_PATTERN,
  );

  const completionVerifier = requireRecord(
    root.completion_verifier,
    "completion_verifier",
  );
  requireExactKeys(completionVerifier, "completion_verifier", [
    "verifier_id",
    "verification_policy_id",
  ]);
  const verifierId = requireString(
    completionVerifier.verifier_id,
    "completion_verifier.verifier_id",
    3,
    128,
    ID_PATTERN,
  );
  const verificationPolicyId = requireString(
    completionVerifier.verification_policy_id,
    "completion_verifier.verification_policy_id",
    3,
    128,
    ID_PATTERN,
  );

  assertCondition(
    authorityId !== executorId,
    "authorizer and executor identities must be distinct",
  );
  assertCondition(
    verifierId !== executorId,
    "completion verifier and executor identities must be distinct",
  );
  assertCondition(
    verifierId !== authorityId,
    "completion verifier and authorizer identities must be distinct",
  );

  const workContract = requireRecord(root.work_contract, "work_contract");
  requireExactKeys(workContract, "work_contract", [
    "task_type",
    "task_spec_sha256",
    "input_manifest_sha256",
    "expected_output_schema_sha256",
    "result_delivery_channel_id",
  ]);
  const taskType = requireString(
    workContract.task_type,
    "work_contract.task_type",
    3,
    128,
    TASK_TYPE_PATTERN,
  );
  const taskSpecSha256 = requireString(
    workContract.task_spec_sha256,
    "work_contract.task_spec_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const inputManifestSha256 = requireString(
    workContract.input_manifest_sha256,
    "work_contract.input_manifest_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const expectedOutputSchemaSha256 = requireString(
    workContract.expected_output_schema_sha256,
    "work_contract.expected_output_schema_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const resultDeliveryChannelId = requireString(
    workContract.result_delivery_channel_id,
    "work_contract.result_delivery_channel_id",
    3,
    128,
    ID_PATTERN,
  );

  const resourceLimits = requireRecord(
    root.resource_limits,
    "resource_limits",
  );
  requireExactKeys(resourceLimits, "resource_limits", [
    "max_wall_clock_seconds",
    "max_cpu_seconds",
    "max_memory_bytes",
    "max_output_bytes",
    "max_network_requests",
    "max_retry_count",
  ]);
  const maxWallClockSeconds = requireSafeInteger(
    resourceLimits.max_wall_clock_seconds,
    "resource_limits.max_wall_clock_seconds",
    1,
    86400,
  );
  const maxCpuSeconds = requireSafeInteger(
    resourceLimits.max_cpu_seconds,
    "resource_limits.max_cpu_seconds",
    1,
    86400,
  );
  const maxMemoryBytes = requireSafeInteger(
    resourceLimits.max_memory_bytes,
    "resource_limits.max_memory_bytes",
    1048576,
    68719476736,
  );
  const maxOutputBytes = requireSafeInteger(
    resourceLimits.max_output_bytes,
    "resource_limits.max_output_bytes",
    1,
    1073741824,
  );
  const maxNetworkRequests = requireSafeInteger(
    resourceLimits.max_network_requests,
    "resource_limits.max_network_requests",
    0,
    10000,
  );
  const maxRetryCount = requireSafeInteger(
    resourceLimits.max_retry_count,
    "resource_limits.max_retry_count",
    0,
    10,
  );

  const capabilityPolicy = requireRecord(
    root.capability_policy,
    "capability_policy",
  );
  requireExactKeys(capabilityPolicy, "capability_policy", [
    "allowed_capability_ids",
    "network_allowlist_ids",
    "data_classification",
    "sandbox_required",
    "secrets_allowed",
    "wallet_access_allowed",
    "payment_mutation_allowed",
    "work_credit_mutation_allowed",
    "buy_void_fulfillment_allowed",
    "runtime_administration_allowed",
    "host_filesystem_write_allowed",
    "external_side_effects_allowed",
  ]);
  const allowedCapabilityIds = requireSortedUniqueIds(
    capabilityPolicy.allowed_capability_ids,
    "capability_policy.allowed_capability_ids",
    1,
    64,
  );
  const networkAllowlistIds = requireSortedUniqueIds(
    capabilityPolicy.network_allowlist_ids,
    "capability_policy.network_allowlist_ids",
    0,
    64,
  );
  const dataClassification = requireString(
    capabilityPolicy.data_classification,
    "capability_policy.data_classification",
    3,
    32,
  );
  assertCondition(
    [
      "public",
      "internal",
      "confidential",
      "restricted",
    ].includes(dataClassification),
    "capability_policy.data_classification is invalid",
  );
  requireBooleanLiteral(
    capabilityPolicy.sandbox_required,
    "capability_policy.sandbox_required",
    true,
  );
  requireBooleanLiteral(
    capabilityPolicy.secrets_allowed,
    "capability_policy.secrets_allowed",
    false,
  );
  requireBooleanLiteral(
    capabilityPolicy.wallet_access_allowed,
    "capability_policy.wallet_access_allowed",
    false,
  );
  requireBooleanLiteral(
    capabilityPolicy.payment_mutation_allowed,
    "capability_policy.payment_mutation_allowed",
    false,
  );
  requireBooleanLiteral(
    capabilityPolicy.work_credit_mutation_allowed,
    "capability_policy.work_credit_mutation_allowed",
    false,
  );
  requireBooleanLiteral(
    capabilityPolicy.buy_void_fulfillment_allowed,
    "capability_policy.buy_void_fulfillment_allowed",
    false,
  );
  requireBooleanLiteral(
    capabilityPolicy.runtime_administration_allowed,
    "capability_policy.runtime_administration_allowed",
    false,
  );
  requireBooleanLiteral(
    capabilityPolicy.host_filesystem_write_allowed,
    "capability_policy.host_filesystem_write_allowed",
    false,
  );
  requireBooleanLiteral(
    capabilityPolicy.external_side_effects_allowed,
    "capability_policy.external_side_effects_allowed",
    false,
  );

  const authorization = requireRecord(root.authorization, "authorization");
  requireExactKeys(
    authorization,
    "authorization",
    AUTHORIZATION_TRUE_KEYS,
  );
  for (const key of AUTHORIZATION_TRUE_KEYS) {
    requireBooleanLiteral(
      authorization[key],
      `authorization.${key}`,
      true,
    );
  }

  const nonce = requireString(
    root.nonce,
    "nonce",
    1,
    128,
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/,
  );

  return {
    marker: AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_MARKER,
    version: 1,
    work_order_id: workOrderId,
    quote_id: quoteId,
    acceptance_id: acceptanceId,
    payment_intent_id: paymentIntentId,
    payment_execution_authorization_id: paymentExecutionAuthorizationId,
    payment_receipt_id: paymentReceiptId,
    payment_confirmation_id: paymentConfirmationId,
    created_at_utc: createdAtUtc,
    expires_at_utc: expiresAtUtc,
    requester: {
      agent_id: requesterId,
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
    completion_verifier: {
      verifier_id: verifierId,
      verification_policy_id: verificationPolicyId,
    },
    work_contract: {
      task_type: taskType,
      task_spec_sha256: taskSpecSha256,
      input_manifest_sha256: inputManifestSha256,
      expected_output_schema_sha256: expectedOutputSchemaSha256,
      result_delivery_channel_id: resultDeliveryChannelId,
    },
    resource_limits: {
      max_wall_clock_seconds: maxWallClockSeconds,
      max_cpu_seconds: maxCpuSeconds,
      max_memory_bytes: maxMemoryBytes,
      max_output_bytes: maxOutputBytes,
      max_network_requests: maxNetworkRequests,
      max_retry_count: maxRetryCount,
    },
    capability_policy: {
      allowed_capability_ids: allowedCapabilityIds,
      network_allowlist_ids: networkAllowlistIds,
      data_classification:
        dataClassification as
          | "public"
          | "internal"
          | "confidential"
          | "restricted",
      sandbox_required: true,
      secrets_allowed: false,
      wallet_access_allowed: false,
      payment_mutation_allowed: false,
      work_credit_mutation_allowed: false,
      buy_void_fulfillment_allowed: false,
      runtime_administration_allowed: false,
      host_filesystem_write_allowed: false,
      external_side_effects_allowed: false,
    },
    authorization: {
      work_execution_authorized: true,
      exact_payment_confirmation_only: true,
      exact_task_spec_only: true,
      one_time_use_required: true,
      replay_protection_required: true,
      atomic_consumption_required: true,
      single_active_execution_authorization_per_confirmation_required: true,
      requester_authentication_required: true,
      provider_authentication_required: true,
      executor_authentication_required: true,
      authorizer_authentication_required: true,
      authorization_signature_required: true,
      authority_policy_binding_required: true,
      provider_executor_binding_required: true,
      authorizer_executor_separation_required: true,
      completion_verifier_executor_separation_required: true,
      completion_verifier_authorizer_separation_required: true,
      resource_limits_enforced: true,
      capability_allowlist_enforced: true,
      network_allowlist_enforced: true,
      input_integrity_verification_required: true,
      output_commitment_required: true,
      completion_receipt_required: true,
      independent_completion_verification_required: true,
      payment_state_immutable: true,
      authorization_is_not_completion_receipt: true,
      authorization_is_not_work_completion_confirmation: true,
      authorization_is_not_wc_award_instruction: true,
      authorization_is_not_payment_instruction: true,
    },
    nonce,
  };
}

function validateBindings(
  workOrder: AgentPaidWorkOrderEnvelope,
  quote: AgentPaidWorkQuoteEnvelope,
  acceptance: AgentPaidWorkAcceptanceEnvelope,
  paymentIntent: AgentPaidWorkPaymentIntentEnvelope,
  paymentExecutionAuthorization:
    AgentPaidWorkPaymentExecutionAuthorizationEnvelope,
  paymentReceipt: AgentPaidWorkPaymentReceiptEnvelope,
  paymentConfirmation:
    AgentPaidWorkIndependentPaymentConfirmationEnvelope,
  authorization: AgentPaidWorkExecutionAuthorizationDraft,
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
    authorization.payment_intent_id === paymentIntent.payment_intent_id,
    "payment_intent_id mismatch",
  );
  assertCondition(
    authorization.payment_execution_authorization_id ===
      paymentExecutionAuthorization.payment_execution_authorization_id,
    "payment_execution_authorization_id mismatch",
  );
  assertCondition(
    authorization.payment_receipt_id === paymentReceipt.payment_receipt_id,
    "payment_receipt_id mismatch",
  );
  assertCondition(
    authorization.payment_confirmation_id ===
      paymentConfirmation.payment_confirmation_id,
    "payment_confirmation_id mismatch",
  );
  assertCondition(
    authorization.requester.agent_id ===
      paymentConfirmation.requester.agent_id,
    "requester mismatch",
  );
  assertCondition(
    authorization.provider.provider_id ===
      paymentConfirmation.provider.provider_id,
    "provider mismatch",
  );

  const confirmationTime = parseUtcSeconds(
    paymentConfirmation.confirmed_at_utc,
    "payment confirmation confirmed_at_utc",
  );
  const authorizationCreated = parseUtcSeconds(
    authorization.created_at_utc,
    "authorization created_at_utc",
  );
  assertCondition(
    authorizationCreated >= confirmationTime,
    "work authorization cannot predate payment confirmation",
  );

  assertCondition(
    paymentConfirmation.confirmation.payment_settlement_confirmed === true,
    "payment confirmation must confirm settlement",
  );
  assertCondition(
    paymentConfirmation.confirmation.work_execution_authorization_separate ===
      true,
    "payment confirmation must preserve separate work authorization",
  );
  assertCondition(
    paymentConfirmation.confirmation.work_execution_authorization_granted ===
      false,
    "payment confirmation must not already grant work execution",
  );
  assertCondition(
    paymentReceipt.attestation.independent_confirmation_required === true,
    "payment receipt must require independent confirmation",
  );
  assertCondition(
    paymentReceipt.attestation.work_execution_authorization_granted === false,
    "payment receipt must not grant work execution",
  );
}

export function computeAgentPaidWorkExecutionAuthorizationId(
  draft: AgentPaidWorkExecutionAuthorizationDraft,
): string {
  const digest = createHash("sha256")
    .update(canonicalJson(draft))
    .digest("hex");
  return `${AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_ID_PREFIX}${digest}`;
}

export function validateAgentPaidWorkExecutionAuthorizationDraft(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  authorizationValue: unknown,
): asserts authorizationValue is AgentPaidWorkExecutionAuthorizationDraft {
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
    paymentIntentValue,
  );
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
  );
  validateAgentPaidWorkPaymentReceiptEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
  );
  validateAgentPaidWorkIndependentPaymentConfirmationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
  );
  const authorization = validateDraftShape(authorizationValue, false);
  validateBindings(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    authorization,
  );
}

export function materializeAgentPaidWorkExecutionAuthorization(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  authorizationValue: unknown,
): AgentPaidWorkExecutionAuthorizationEnvelope {
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
    paymentIntentValue,
  );
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
  );
  validateAgentPaidWorkPaymentReceiptEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
  );
  validateAgentPaidWorkIndependentPaymentConfirmationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
  );
  const draft = validateDraftShape(authorizationValue, false);
  validateBindings(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    draft,
  );
  return {
    ...draft,
    work_execution_authorization_id:
      computeAgentPaidWorkExecutionAuthorizationId(draft),
  };
}

export function validateAgentPaidWorkExecutionAuthorizationEnvelope(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  authorizationValue: unknown,
): asserts authorizationValue is AgentPaidWorkExecutionAuthorizationEnvelope {
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
    paymentIntentValue,
  );
  validateAgentPaidWorkPaymentExecutionAuthorizationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
  );
  validateAgentPaidWorkPaymentReceiptEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
  );
  validateAgentPaidWorkIndependentPaymentConfirmationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
  );

  const root = requireRecord(
    authorizationValue,
    "work execution authorization envelope",
  );
  const draft = validateDraftShape(authorizationValue, true);
  validateBindings(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    draft,
  );
  const authorizationId = requireString(
    root.work_execution_authorization_id,
    "work_execution_authorization_id",
    75,
    75,
    /^voidawwea1_[0-9a-f]{64}$/,
  );
  assertCondition(
    authorizationId === computeAgentPaidWorkExecutionAuthorizationId(draft),
    "work_execution_authorization_id does not match canonical payload",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail([
    "usage:",
    "  tsx scripts/agent_paid_work_execution_authorization_envelope_v1.ts materialize <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <payment-execution-authorization.json> <payment-receipt.json> <payment-confirmation.json> <work-authorization-draft.json> <work-authorization-envelope.json>",
    "  tsx scripts/agent_paid_work_execution_authorization_envelope_v1.ts verify <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <payment-execution-authorization.json> <payment-receipt.json> <payment-confirmation.json> <work-authorization-envelope.json>",
  ].join("\n"));
}

function main(): void {
  const [
    mode,
    workOrderPath,
    quotePath,
    acceptancePath,
    paymentIntentPath,
    paymentExecutionAuthorizationPath,
    paymentReceiptPath,
    paymentConfirmationPath,
    authorizationPath,
    outputPath,
    ...extra
  ] = process.argv.slice(2);

  assertCondition(extra.length === 0, "unexpected extra arguments");
  assertCondition(
    Boolean(
      workOrderPath &&
      quotePath &&
      acceptancePath &&
      paymentIntentPath &&
      paymentExecutionAuthorizationPath &&
      paymentReceiptPath &&
      paymentConfirmationPath &&
      authorizationPath
    ),
    "missing required input paths",
  );

  const workOrder = readJson(resolve(workOrderPath));
  const quote = readJson(resolve(quotePath));
  const acceptance = readJson(resolve(acceptancePath));
  const paymentIntent = readJson(resolve(paymentIntentPath));
  const paymentExecutionAuthorization = readJson(
    resolve(paymentExecutionAuthorizationPath),
  );
  const paymentReceipt = readJson(resolve(paymentReceiptPath));
  const paymentConfirmation = readJson(resolve(paymentConfirmationPath));
  const authorization = readJson(resolve(authorizationPath));

  if (mode === "materialize") {
    assertCondition(Boolean(outputPath), "materialize requires output path");
    const output = resolve(outputPath);
    assertCondition(
      !existsSync(output),
      "refusing to overwrite an existing work authorization",
    );
    const envelope = materializeAgentPaidWorkExecutionAuthorization(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      authorization,
    );
    writeFileSync(
      output,
      `${JSON.stringify(envelope, null, 2)}\n`,
      {
        encoding: "utf8",
        mode: 0o600,
        flag: "wx",
      },
    );
    console.log(`marker=${envelope.marker}`);
    console.log(
      `work_execution_authorization_id=${envelope.work_execution_authorization_id}`,
    );
    console.log(`output=${output}`);
    console.log(
      "VOID_AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_ENVELOPE_V1_MATERIALIZED",
    );
    return;
  }

  if (mode === "verify") {
    assertCondition(
      outputPath === undefined,
      "verify does not accept an output path",
    );
    validateAgentPaidWorkExecutionAuthorizationEnvelope(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      authorization,
    );
    console.log(`marker=${authorization.marker}`);
    console.log(`work_order_id=${authorization.work_order_id}`);
    console.log(
      `payment_confirmation_id=${authorization.payment_confirmation_id}`,
    );
    console.log(
      `work_execution_authorization_id=${authorization.work_execution_authorization_id}`,
    );
    console.log(`executor_id=${authorization.executor.executor_id}`);
    console.log(
      "VOID_AGENT_PAID_WORK_EXECUTION_AUTHORIZATION_ENVELOPE_V1_VALID",
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
