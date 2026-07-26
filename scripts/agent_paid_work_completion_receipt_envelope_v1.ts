import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  validateAgentPaidWorkExecutionAuthorizationEnvelope,
  type AgentPaidWorkExecutionAuthorizationEnvelope,
} from "./agent_paid_work_execution_authorization_envelope_v1.js";

export const AGENT_PAID_WORK_COMPLETION_RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_COMPLETION_RECEIPT_ENVELOPE_V1" as const;
export const AGENT_PAID_WORK_COMPLETION_RECEIPT_ID_PREFIX =
  "voidawcr1_" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type AgentPaidWorkExecutionStatus =
  | "succeeded"
  | "failed"
  | "timed_out"
  | "cancelled"
  | "policy_rejected";

export interface AgentPaidWorkCompletionReceiptDraft {
  marker: typeof AGENT_PAID_WORK_COMPLETION_RECEIPT_MARKER;
  version: 1;
  work_order_id: string;
  quote_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  payment_execution_authorization_id: string;
  payment_receipt_id: string;
  payment_confirmation_id: string;
  work_execution_authorization_id: string;
  receipt_created_at_utc: string;
  execution: {
    execution_id: string;
    attempt_number: number;
    status: AgentPaidWorkExecutionStatus;
    authorization_consumed: true;
    authorization_consumed_at_utc: string;
    started_at_utc: string;
    finished_at_utc: string;
    exit_code: number | null;
    failure_reason_code: string | null;
    sandbox_id: string;
    environment_image_sha256: string;
  };
  executor: {
    executor_id: string;
    provider_id: string;
  };
  work_contract: {
    task_type: string;
    task_spec_sha256: string;
    input_manifest_sha256: string;
    expected_output_schema_sha256: string;
    result_delivery_channel_id: string;
  };
  result_commitments: {
    output_manifest_sha256: string;
    result_payload_sha256: string;
    stdout_sha256: string;
    stderr_sha256: string;
    execution_log_sha256: string;
    evidence_bundle_sha256: string;
  };
  resource_usage: {
    wall_clock_seconds: number;
    cpu_seconds: number;
    peak_memory_bytes: number;
    output_bytes: number;
    network_requests: number;
    retry_count: number;
  };
  policy_observation: {
    sandbox_enforced: boolean;
    input_integrity_verified: boolean;
    capability_allowlist_observed: boolean;
    network_allowlist_observed: boolean;
    resource_limits_observed: boolean;
    secrets_accessed: boolean;
    wallet_accessed: boolean;
    payment_state_mutated: boolean;
    work_credits_mutated: boolean;
    buy_void_fulfillment_mutated: boolean;
    runtime_administered: boolean;
    host_filesystem_written: boolean;
    unapproved_external_side_effects_observed: boolean;
  };
  executor_authentication: {
    signer_id: string;
    signing_key_id: string;
    signature_scheme: "ed25519";
    signed_payload_sha256: string;
    signature_evidence_sha256: string;
  };
  attestation: {
    exact_execution_authorization_consumed_once: true;
    receipt_unique_per_execution_attempt: true;
    authorization_replay_forbidden: true;
    result_commitments_recorded: true;
    resource_usage_recorded: true;
    executor_authentication_required: true;
    executor_signature_verification_required: true;
    completion_receipt_immutable: true;
    independent_completion_verification_required: true;
    correctness_verified: false;
    work_credit_award_authorized: false;
    payment_instruction_authorized: false;
    payment_state_mutation_authorized: false;
    wallet_or_signer_access_authorized: false;
    runtime_administration_authorized: false;
    buy_void_fulfillment_authorized: false;
    receipt_is_not_independent_completion_verification: true;
    receipt_is_not_work_credit_award_instruction: true;
    receipt_is_not_payment_instruction: true;
  };
  nonce: string;
}

export interface AgentPaidWorkCompletionReceiptEnvelope
  extends AgentPaidWorkCompletionReceiptDraft {
  work_completion_receipt_id: string;
}

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
  "work_execution_authorization_id",
  "receipt_created_at_utc",
  "execution",
  "executor",
  "work_contract",
  "result_commitments",
  "resource_usage",
  "policy_observation",
  "executor_authentication",
  "attestation",
  "nonce",
] as const;

const ATTESTATION_TRUE_KEYS = [
  "exact_execution_authorization_consumed_once",
  "receipt_unique_per_execution_attempt",
  "authorization_replay_forbidden",
  "result_commitments_recorded",
  "resource_usage_recorded",
  "executor_authentication_required",
  "executor_signature_verification_required",
  "completion_receipt_immutable",
  "independent_completion_verification_required",
  "receipt_is_not_independent_completion_verification",
  "receipt_is_not_work_credit_award_instruction",
  "receipt_is_not_payment_instruction",
] as const;

const ATTESTATION_FALSE_KEYS = [
  "correctness_verified",
  "work_credit_award_authorized",
  "payment_instruction_authorized",
  "payment_state_mutation_authorized",
  "wallet_or_signer_access_authorized",
  "runtime_administration_authorized",
  "buy_void_fulfillment_authorized",
] as const;

const EXECUTION_STATUSES = [
  "succeeded",
  "failed",
  "timed_out",
  "cancelled",
  "policy_rejected",
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

function requireNullableString(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  pattern?: RegExp,
): string | null {
  if (value === null) {
    return null;
  }
  return requireString(value, label, minimum, maximum, pattern);
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

function requireNullableSafeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number | null {
  if (value === null) {
    return null;
  }
  return requireSafeInteger(value, label, minimum, maximum);
}

function requireBoolean(value: unknown, label: string): boolean {
  assertCondition(typeof value === "boolean", `${label} must be boolean`);
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
): AgentPaidWorkCompletionReceiptDraft {
  const root = requireRecord(value, "work completion receipt");
  requireExactKeys(
    root,
    "work completion receipt",
    [
      ...ROOT_KEYS,
      ...(allowId ? ["work_completion_receipt_id"] : []),
    ],
  );

  assertCondition(
    root.marker === AGENT_PAID_WORK_COMPLETION_RECEIPT_MARKER,
    `marker must be ${AGENT_PAID_WORK_COMPLETION_RECEIPT_MARKER}`,
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
  const workExecutionAuthorizationId = requireString(
    root.work_execution_authorization_id,
    "work_execution_authorization_id",
    75,
    75,
    /^voidawwea1_[0-9a-f]{64}$/,
  );
  const receiptCreatedAtUtc = requireString(
    root.receipt_created_at_utc,
    "receipt_created_at_utc",
    20,
    20,
  );
  parseUtcSeconds(receiptCreatedAtUtc, "receipt_created_at_utc");

  const execution = requireRecord(root.execution, "execution");
  requireExactKeys(execution, "execution", [
    "execution_id",
    "attempt_number",
    "status",
    "authorization_consumed",
    "authorization_consumed_at_utc",
    "started_at_utc",
    "finished_at_utc",
    "exit_code",
    "failure_reason_code",
    "sandbox_id",
    "environment_image_sha256",
  ]);
  const executionId = requireString(
    execution.execution_id,
    "execution.execution_id",
    3,
    128,
    ID_PATTERN,
  );
  const attemptNumber = requireSafeInteger(
    execution.attempt_number,
    "execution.attempt_number",
    1,
    11,
  );
  const status = requireString(
    execution.status,
    "execution.status",
    6,
    32,
  );
  assertCondition(
    EXECUTION_STATUSES.includes(status as AgentPaidWorkExecutionStatus),
    "execution.status is invalid",
  );
  requireBooleanLiteral(
    execution.authorization_consumed,
    "execution.authorization_consumed",
    true,
  );
  const authorizationConsumedAtUtc = requireString(
    execution.authorization_consumed_at_utc,
    "execution.authorization_consumed_at_utc",
    20,
    20,
  );
  const startedAtUtc = requireString(
    execution.started_at_utc,
    "execution.started_at_utc",
    20,
    20,
  );
  const finishedAtUtc = requireString(
    execution.finished_at_utc,
    "execution.finished_at_utc",
    20,
    20,
  );
  parseUtcSeconds(
    authorizationConsumedAtUtc,
    "execution.authorization_consumed_at_utc",
  );
  parseUtcSeconds(startedAtUtc, "execution.started_at_utc");
  parseUtcSeconds(finishedAtUtc, "execution.finished_at_utc");
  const exitCode = requireNullableSafeInteger(
    execution.exit_code,
    "execution.exit_code",
    -255,
    255,
  );
  const failureReasonCode = requireNullableString(
    execution.failure_reason_code,
    "execution.failure_reason_code",
    3,
    128,
    ID_PATTERN,
  );
  const sandboxId = requireString(
    execution.sandbox_id,
    "execution.sandbox_id",
    3,
    128,
    ID_PATTERN,
  );
  const environmentImageSha256 = requireString(
    execution.environment_image_sha256,
    "execution.environment_image_sha256",
    71,
    71,
    SHA256_PATTERN,
  );

  if (status === "succeeded") {
    assertCondition(exitCode === 0, "successful execution must use exit code 0");
    assertCondition(
      failureReasonCode === null,
      "successful execution must not have a failure reason",
    );
  } else {
    assertCondition(
      failureReasonCode !== null,
      "non-success execution requires a failure reason",
    );
    assertCondition(
      exitCode !== 0,
      "non-success execution cannot use exit code 0",
    );
  }

  const executor = requireRecord(root.executor, "executor");
  requireExactKeys(executor, "executor", ["executor_id", "provider_id"]);
  const executorId = requireString(
    executor.executor_id,
    "executor.executor_id",
    3,
    128,
    ID_PATTERN,
  );
  const providerId = requireString(
    executor.provider_id,
    "executor.provider_id",
    3,
    128,
    ID_PATTERN,
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

  const resultCommitments = requireRecord(
    root.result_commitments,
    "result_commitments",
  );
  requireExactKeys(resultCommitments, "result_commitments", [
    "output_manifest_sha256",
    "result_payload_sha256",
    "stdout_sha256",
    "stderr_sha256",
    "execution_log_sha256",
    "evidence_bundle_sha256",
  ]);
  const outputManifestSha256 = requireString(
    resultCommitments.output_manifest_sha256,
    "result_commitments.output_manifest_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const resultPayloadSha256 = requireString(
    resultCommitments.result_payload_sha256,
    "result_commitments.result_payload_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const stdoutSha256 = requireString(
    resultCommitments.stdout_sha256,
    "result_commitments.stdout_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const stderrSha256 = requireString(
    resultCommitments.stderr_sha256,
    "result_commitments.stderr_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const executionLogSha256 = requireString(
    resultCommitments.execution_log_sha256,
    "result_commitments.execution_log_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const evidenceBundleSha256 = requireString(
    resultCommitments.evidence_bundle_sha256,
    "result_commitments.evidence_bundle_sha256",
    71,
    71,
    SHA256_PATTERN,
  );

  const resourceUsage = requireRecord(
    root.resource_usage,
    "resource_usage",
  );
  requireExactKeys(resourceUsage, "resource_usage", [
    "wall_clock_seconds",
    "cpu_seconds",
    "peak_memory_bytes",
    "output_bytes",
    "network_requests",
    "retry_count",
  ]);
  const wallClockSeconds = requireSafeInteger(
    resourceUsage.wall_clock_seconds,
    "resource_usage.wall_clock_seconds",
    0,
    86400,
  );
  const cpuSeconds = requireSafeInteger(
    resourceUsage.cpu_seconds,
    "resource_usage.cpu_seconds",
    0,
    86400,
  );
  const peakMemoryBytes = requireSafeInteger(
    resourceUsage.peak_memory_bytes,
    "resource_usage.peak_memory_bytes",
    0,
    68719476736,
  );
  const outputBytes = requireSafeInteger(
    resourceUsage.output_bytes,
    "resource_usage.output_bytes",
    0,
    1073741824,
  );
  const networkRequests = requireSafeInteger(
    resourceUsage.network_requests,
    "resource_usage.network_requests",
    0,
    10000,
  );
  const retryCount = requireSafeInteger(
    resourceUsage.retry_count,
    "resource_usage.retry_count",
    0,
    10,
  );

  const policyObservation = requireRecord(
    root.policy_observation,
    "policy_observation",
  );
  requireExactKeys(policyObservation, "policy_observation", [
    "sandbox_enforced",
    "input_integrity_verified",
    "capability_allowlist_observed",
    "network_allowlist_observed",
    "resource_limits_observed",
    "secrets_accessed",
    "wallet_accessed",
    "payment_state_mutated",
    "work_credits_mutated",
    "buy_void_fulfillment_mutated",
    "runtime_administered",
    "host_filesystem_written",
    "unapproved_external_side_effects_observed",
  ]);
  const sandboxEnforced = requireBoolean(
    policyObservation.sandbox_enforced,
    "policy_observation.sandbox_enforced",
  );
  const inputIntegrityVerified = requireBoolean(
    policyObservation.input_integrity_verified,
    "policy_observation.input_integrity_verified",
  );
  const capabilityAllowlistObserved = requireBoolean(
    policyObservation.capability_allowlist_observed,
    "policy_observation.capability_allowlist_observed",
  );
  const networkAllowlistObserved = requireBoolean(
    policyObservation.network_allowlist_observed,
    "policy_observation.network_allowlist_observed",
  );
  const resourceLimitsObserved = requireBoolean(
    policyObservation.resource_limits_observed,
    "policy_observation.resource_limits_observed",
  );
  const secretsAccessed = requireBoolean(
    policyObservation.secrets_accessed,
    "policy_observation.secrets_accessed",
  );
  const walletAccessed = requireBoolean(
    policyObservation.wallet_accessed,
    "policy_observation.wallet_accessed",
  );
  const paymentStateMutated = requireBoolean(
    policyObservation.payment_state_mutated,
    "policy_observation.payment_state_mutated",
  );
  const workCreditsMutated = requireBoolean(
    policyObservation.work_credits_mutated,
    "policy_observation.work_credits_mutated",
  );
  const buyVoidFulfillmentMutated = requireBoolean(
    policyObservation.buy_void_fulfillment_mutated,
    "policy_observation.buy_void_fulfillment_mutated",
  );
  const runtimeAdministered = requireBoolean(
    policyObservation.runtime_administered,
    "policy_observation.runtime_administered",
  );
  const hostFilesystemWritten = requireBoolean(
    policyObservation.host_filesystem_written,
    "policy_observation.host_filesystem_written",
  );
  const unapprovedExternalSideEffectsObserved = requireBoolean(
    policyObservation.unapproved_external_side_effects_observed,
    "policy_observation.unapproved_external_side_effects_observed",
  );

  if (status === "succeeded") {
    for (const [label, observed] of [
      ["sandbox_enforced", sandboxEnforced],
      ["input_integrity_verified", inputIntegrityVerified],
      ["capability_allowlist_observed", capabilityAllowlistObserved],
      ["network_allowlist_observed", networkAllowlistObserved],
      ["resource_limits_observed", resourceLimitsObserved],
    ] as const) {
      assertCondition(
        observed,
        `successful execution requires policy_observation.${label}=true`,
      );
    }
    for (const [label, observed] of [
      ["secrets_accessed", secretsAccessed],
      ["wallet_accessed", walletAccessed],
      ["payment_state_mutated", paymentStateMutated],
      ["work_credits_mutated", workCreditsMutated],
      ["buy_void_fulfillment_mutated", buyVoidFulfillmentMutated],
      ["runtime_administered", runtimeAdministered],
      ["host_filesystem_written", hostFilesystemWritten],
      [
        "unapproved_external_side_effects_observed",
        unapprovedExternalSideEffectsObserved,
      ],
    ] as const) {
      assertCondition(
        !observed,
        `successful execution requires policy_observation.${label}=false`,
      );
    }
  }

  const executorAuthentication = requireRecord(
    root.executor_authentication,
    "executor_authentication",
  );
  requireExactKeys(executorAuthentication, "executor_authentication", [
    "signer_id",
    "signing_key_id",
    "signature_scheme",
    "signed_payload_sha256",
    "signature_evidence_sha256",
  ]);
  const signerId = requireString(
    executorAuthentication.signer_id,
    "executor_authentication.signer_id",
    3,
    128,
    ID_PATTERN,
  );
  const signingKeyId = requireString(
    executorAuthentication.signing_key_id,
    "executor_authentication.signing_key_id",
    3,
    128,
    ID_PATTERN,
  );
  assertCondition(
    executorAuthentication.signature_scheme === "ed25519",
    "executor_authentication.signature_scheme must be ed25519",
  );
  const signedPayloadSha256 = requireString(
    executorAuthentication.signed_payload_sha256,
    "executor_authentication.signed_payload_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const signatureEvidenceSha256 = requireString(
    executorAuthentication.signature_evidence_sha256,
    "executor_authentication.signature_evidence_sha256",
    71,
    71,
    SHA256_PATTERN,
  );

  assertCondition(
    signerId === executorId,
    "executor authentication signer must match executor",
  );

  const attestation = requireRecord(root.attestation, "attestation");
  requireExactKeys(
    attestation,
    "attestation",
    [
      ...ATTESTATION_TRUE_KEYS,
      ...ATTESTATION_FALSE_KEYS,
    ],
  );
  for (const key of ATTESTATION_TRUE_KEYS) {
    requireBooleanLiteral(
      attestation[key],
      `attestation.${key}`,
      true,
    );
  }
  for (const key of ATTESTATION_FALSE_KEYS) {
    requireBooleanLiteral(
      attestation[key],
      `attestation.${key}`,
      false,
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
    marker: AGENT_PAID_WORK_COMPLETION_RECEIPT_MARKER,
    version: 1,
    work_order_id: workOrderId,
    quote_id: quoteId,
    acceptance_id: acceptanceId,
    payment_intent_id: paymentIntentId,
    payment_execution_authorization_id: paymentExecutionAuthorizationId,
    payment_receipt_id: paymentReceiptId,
    payment_confirmation_id: paymentConfirmationId,
    work_execution_authorization_id: workExecutionAuthorizationId,
    receipt_created_at_utc: receiptCreatedAtUtc,
    execution: {
      execution_id: executionId,
      attempt_number: attemptNumber,
      status: status as AgentPaidWorkExecutionStatus,
      authorization_consumed: true,
      authorization_consumed_at_utc: authorizationConsumedAtUtc,
      started_at_utc: startedAtUtc,
      finished_at_utc: finishedAtUtc,
      exit_code: exitCode,
      failure_reason_code: failureReasonCode,
      sandbox_id: sandboxId,
      environment_image_sha256: environmentImageSha256,
    },
    executor: {
      executor_id: executorId,
      provider_id: providerId,
    },
    work_contract: {
      task_type: taskType,
      task_spec_sha256: taskSpecSha256,
      input_manifest_sha256: inputManifestSha256,
      expected_output_schema_sha256: expectedOutputSchemaSha256,
      result_delivery_channel_id: resultDeliveryChannelId,
    },
    result_commitments: {
      output_manifest_sha256: outputManifestSha256,
      result_payload_sha256: resultPayloadSha256,
      stdout_sha256: stdoutSha256,
      stderr_sha256: stderrSha256,
      execution_log_sha256: executionLogSha256,
      evidence_bundle_sha256: evidenceBundleSha256,
    },
    resource_usage: {
      wall_clock_seconds: wallClockSeconds,
      cpu_seconds: cpuSeconds,
      peak_memory_bytes: peakMemoryBytes,
      output_bytes: outputBytes,
      network_requests: networkRequests,
      retry_count: retryCount,
    },
    policy_observation: {
      sandbox_enforced: sandboxEnforced,
      input_integrity_verified: inputIntegrityVerified,
      capability_allowlist_observed: capabilityAllowlistObserved,
      network_allowlist_observed: networkAllowlistObserved,
      resource_limits_observed: resourceLimitsObserved,
      secrets_accessed: secretsAccessed,
      wallet_accessed: walletAccessed,
      payment_state_mutated: paymentStateMutated,
      work_credits_mutated: workCreditsMutated,
      buy_void_fulfillment_mutated: buyVoidFulfillmentMutated,
      runtime_administered: runtimeAdministered,
      host_filesystem_written: hostFilesystemWritten,
      unapproved_external_side_effects_observed:
        unapprovedExternalSideEffectsObserved,
    },
    executor_authentication: {
      signer_id: signerId,
      signing_key_id: signingKeyId,
      signature_scheme: "ed25519",
      signed_payload_sha256: signedPayloadSha256,
      signature_evidence_sha256: signatureEvidenceSha256,
    },
    attestation: {
      exact_execution_authorization_consumed_once: true,
      receipt_unique_per_execution_attempt: true,
      authorization_replay_forbidden: true,
      result_commitments_recorded: true,
      resource_usage_recorded: true,
      executor_authentication_required: true,
      executor_signature_verification_required: true,
      completion_receipt_immutable: true,
      independent_completion_verification_required: true,
      correctness_verified: false,
      work_credit_award_authorized: false,
      payment_instruction_authorized: false,
      payment_state_mutation_authorized: false,
      wallet_or_signer_access_authorized: false,
      runtime_administration_authorized: false,
      buy_void_fulfillment_authorized: false,
      receipt_is_not_independent_completion_verification: true,
      receipt_is_not_work_credit_award_instruction: true,
      receipt_is_not_payment_instruction: true,
    },
    nonce,
  };
}

function validateBindings(
  workExecutionAuthorization:
    AgentPaidWorkExecutionAuthorizationEnvelope,
  receipt: AgentPaidWorkCompletionReceiptDraft,
): void {
  assertCondition(
    receipt.work_order_id === workExecutionAuthorization.work_order_id,
    "work_order_id mismatch",
  );
  assertCondition(
    receipt.quote_id === workExecutionAuthorization.quote_id,
    "quote_id mismatch",
  );
  assertCondition(
    receipt.acceptance_id === workExecutionAuthorization.acceptance_id,
    "acceptance_id mismatch",
  );
  assertCondition(
    receipt.payment_intent_id ===
      workExecutionAuthorization.payment_intent_id,
    "payment_intent_id mismatch",
  );
  assertCondition(
    receipt.payment_execution_authorization_id ===
      workExecutionAuthorization.payment_execution_authorization_id,
    "payment_execution_authorization_id mismatch",
  );
  assertCondition(
    receipt.payment_receipt_id ===
      workExecutionAuthorization.payment_receipt_id,
    "payment_receipt_id mismatch",
  );
  assertCondition(
    receipt.payment_confirmation_id ===
      workExecutionAuthorization.payment_confirmation_id,
    "payment_confirmation_id mismatch",
  );
  assertCondition(
    receipt.work_execution_authorization_id ===
      workExecutionAuthorization.work_execution_authorization_id,
    "work_execution_authorization_id mismatch",
  );
  assertCondition(
    receipt.executor.executor_id ===
      workExecutionAuthorization.executor.executor_id,
    "executor_id mismatch",
  );
  assertCondition(
    receipt.executor.provider_id ===
      workExecutionAuthorization.provider.provider_id,
    "provider_id mismatch",
  );

  for (const key of [
    "task_type",
    "task_spec_sha256",
    "input_manifest_sha256",
    "expected_output_schema_sha256",
    "result_delivery_channel_id",
  ] as const) {
    assertCondition(
      receipt.work_contract[key] ===
        workExecutionAuthorization.work_contract[key],
      `work_contract.${key} mismatch`,
    );
  }

  const authorizationCreated = parseUtcSeconds(
    workExecutionAuthorization.created_at_utc,
    "work authorization created_at_utc",
  );
  const authorizationExpires = parseUtcSeconds(
    workExecutionAuthorization.expires_at_utc,
    "work authorization expires_at_utc",
  );
  const authorizationConsumed = parseUtcSeconds(
    receipt.execution.authorization_consumed_at_utc,
    "receipt authorization_consumed_at_utc",
  );
  const started = parseUtcSeconds(
    receipt.execution.started_at_utc,
    "receipt started_at_utc",
  );
  const finished = parseUtcSeconds(
    receipt.execution.finished_at_utc,
    "receipt finished_at_utc",
  );
  const receiptCreated = parseUtcSeconds(
    receipt.receipt_created_at_utc,
    "receipt_created_at_utc",
  );

  assertCondition(
    authorizationConsumed >= authorizationCreated,
    "authorization consumption predates authorization creation",
  );
  assertCondition(
    authorizationConsumed <= authorizationExpires,
    "authorization consumption occurred after authorization expiration",
  );
  assertCondition(
    started >= authorizationConsumed,
    "execution start predates authorization consumption",
  );
  assertCondition(
    started <= authorizationExpires,
    "execution start occurred after authorization expiration",
  );
  assertCondition(
    finished >= started,
    "execution finish predates execution start",
  );
  assertCondition(
    receiptCreated >= finished,
    "receipt creation predates execution finish",
  );

  const measuredWallClock = finished - started;
  assertCondition(
    receipt.resource_usage.wall_clock_seconds === measuredWallClock,
    "resource_usage.wall_clock_seconds must match execution timestamps",
  );
  assertCondition(
    receipt.resource_usage.retry_count ===
      receipt.execution.attempt_number - 1,
    "resource_usage.retry_count must equal attempt_number minus one",
  );
  assertCondition(
    receipt.execution.attempt_number <=
      workExecutionAuthorization.resource_limits.max_retry_count + 1,
    "execution attempt exceeds authorized retry count",
  );

  const withinLimits =
    receipt.resource_usage.wall_clock_seconds <=
      workExecutionAuthorization.resource_limits.max_wall_clock_seconds &&
    receipt.resource_usage.cpu_seconds <=
      workExecutionAuthorization.resource_limits.max_cpu_seconds &&
    receipt.resource_usage.peak_memory_bytes <=
      workExecutionAuthorization.resource_limits.max_memory_bytes &&
    receipt.resource_usage.output_bytes <=
      workExecutionAuthorization.resource_limits.max_output_bytes &&
    receipt.resource_usage.network_requests <=
      workExecutionAuthorization.resource_limits.max_network_requests &&
    receipt.resource_usage.retry_count <=
      workExecutionAuthorization.resource_limits.max_retry_count;

  assertCondition(
    receipt.policy_observation.resource_limits_observed === withinLimits,
    "resource_limits_observed must truthfully match measured limits",
  );

  if (receipt.execution.status === "succeeded") {
    assertCondition(
      withinLimits,
      "successful execution cannot exceed authorized resource limits",
    );
  }

  assertCondition(
    workExecutionAuthorization.authorization.completion_receipt_required ===
      true,
    "work authorization must require a completion receipt",
  );
  assertCondition(
    workExecutionAuthorization.authorization
      .independent_completion_verification_required === true,
    "work authorization must require independent completion verification",
  );
  assertCondition(
    workExecutionAuthorization.authorization
      .authorization_is_not_completion_receipt === true,
    "work authorization must preserve the separate receipt boundary",
  );
}

export function computeAgentPaidWorkCompletionReceiptId(
  draft: AgentPaidWorkCompletionReceiptDraft,
): string {
  const digest = createHash("sha256")
    .update(canonicalJson(draft))
    .digest("hex");
  return `${AGENT_PAID_WORK_COMPLETION_RECEIPT_ID_PREFIX}${digest}`;
}

export function validateAgentPaidWorkCompletionReceiptDraft(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  workExecutionAuthorizationValue: unknown,
  completionReceiptValue: unknown,
): asserts completionReceiptValue is AgentPaidWorkCompletionReceiptDraft {
  validateAgentPaidWorkExecutionAuthorizationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    workExecutionAuthorizationValue,
  );
  const workExecutionAuthorization =
    workExecutionAuthorizationValue as
      AgentPaidWorkExecutionAuthorizationEnvelope;
  const completionReceipt = validateDraftShape(
    completionReceiptValue,
    false,
  );
  validateBindings(workExecutionAuthorization, completionReceipt);
}

export function materializeAgentPaidWorkCompletionReceipt(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  workExecutionAuthorizationValue: unknown,
  completionReceiptValue: unknown,
): AgentPaidWorkCompletionReceiptEnvelope {
  validateAgentPaidWorkExecutionAuthorizationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    workExecutionAuthorizationValue,
  );
  const workExecutionAuthorization =
    workExecutionAuthorizationValue as
      AgentPaidWorkExecutionAuthorizationEnvelope;
  const draft = validateDraftShape(completionReceiptValue, false);
  validateBindings(workExecutionAuthorization, draft);
  return {
    ...draft,
    work_completion_receipt_id:
      computeAgentPaidWorkCompletionReceiptId(draft),
  };
}

export function validateAgentPaidWorkCompletionReceiptEnvelope(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  workExecutionAuthorizationValue: unknown,
  completionReceiptValue: unknown,
): asserts completionReceiptValue is AgentPaidWorkCompletionReceiptEnvelope {
  validateAgentPaidWorkExecutionAuthorizationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    workExecutionAuthorizationValue,
  );
  const workExecutionAuthorization =
    workExecutionAuthorizationValue as
      AgentPaidWorkExecutionAuthorizationEnvelope;
  const root = requireRecord(
    completionReceiptValue,
    "work completion receipt envelope",
  );
  const draft = validateDraftShape(completionReceiptValue, true);
  validateBindings(workExecutionAuthorization, draft);
  const receiptId = requireString(
    root.work_completion_receipt_id,
    "work_completion_receipt_id",
    74,
    74,
    /^voidawcr1_[0-9a-f]{64}$/,
  );
  assertCondition(
    receiptId === computeAgentPaidWorkCompletionReceiptId(draft),
    "work_completion_receipt_id does not match canonical payload",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail([
    "usage:",
    "  tsx scripts/agent_paid_work_completion_receipt_envelope_v1.ts materialize <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <payment-execution-authorization.json> <payment-receipt.json> <payment-confirmation.json> <work-execution-authorization.json> <completion-receipt-draft.json> <completion-receipt-envelope.json>",
    "  tsx scripts/agent_paid_work_completion_receipt_envelope_v1.ts verify <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <payment-execution-authorization.json> <payment-receipt.json> <payment-confirmation.json> <work-execution-authorization.json> <completion-receipt-envelope.json>",
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
    workExecutionAuthorizationPath,
    completionReceiptPath,
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
      workExecutionAuthorizationPath &&
      completionReceiptPath
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
  const workExecutionAuthorization = readJson(
    resolve(workExecutionAuthorizationPath),
  );
  const completionReceipt = readJson(resolve(completionReceiptPath));

  if (mode === "materialize") {
    assertCondition(Boolean(outputPath), "materialize requires output path");
    const output = resolve(outputPath);
    assertCondition(
      !existsSync(output),
      "refusing to overwrite an existing completion receipt",
    );
    const envelope = materializeAgentPaidWorkCompletionReceipt(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      completionReceipt,
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
      `work_completion_receipt_id=${envelope.work_completion_receipt_id}`,
    );
    console.log(`output=${output}`);
    console.log(
      "VOID_AGENT_PAID_WORK_COMPLETION_RECEIPT_ENVELOPE_V1_MATERIALIZED",
    );
    return;
  }

  if (mode === "verify") {
    assertCondition(
      outputPath === undefined,
      "verify does not accept an output path",
    );
    validateAgentPaidWorkCompletionReceiptEnvelope(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      completionReceipt,
    );
    console.log(`marker=${completionReceipt.marker}`);
    console.log(
      `work_execution_authorization_id=${completionReceipt.work_execution_authorization_id}`,
    );
    console.log(
      `work_completion_receipt_id=${completionReceipt.work_completion_receipt_id}`,
    );
    console.log(`execution_id=${completionReceipt.execution.execution_id}`);
    console.log(`execution_status=${completionReceipt.execution.status}`);
    console.log(
      "VOID_AGENT_PAID_WORK_COMPLETION_RECEIPT_ENVELOPE_V1_VALID",
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
