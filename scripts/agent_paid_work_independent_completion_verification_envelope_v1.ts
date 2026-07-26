import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  validateAgentPaidWorkCompletionReceiptEnvelope,
  type AgentPaidWorkCompletionReceiptEnvelope,
} from "./agent_paid_work_completion_receipt_envelope_v1.js";
import type {
  AgentPaidWorkExecutionAuthorizationEnvelope,
} from "./agent_paid_work_execution_authorization_envelope_v1.js";

export const AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_MARKER =
  "VOID_AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_ENVELOPE_V1" as const;
export const AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_ID_PREFIX =
  "voidawicv1_" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type AgentPaidWorkCompletionVerificationStatus =
  | "verified"
  | "rejected"
  | "inconclusive";

export type AgentPaidWorkExecutionStatus =
  | "succeeded"
  | "failed"
  | "timed_out"
  | "cancelled"
  | "policy_rejected";

export interface AgentPaidWorkIndependentCompletionVerificationDraft {
  marker:
    typeof AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_MARKER;
  version: 1;
  work_order_id: string;
  quote_id: string;
  acceptance_id: string;
  payment_intent_id: string;
  payment_execution_authorization_id: string;
  payment_receipt_id: string;
  payment_confirmation_id: string;
  work_execution_authorization_id: string;
  work_completion_receipt_id: string;
  verified_at_utc: string;
  verifier: {
    verifier_id: string;
    verification_policy_id: string;
    verification_run_id: string;
  };
  subject: {
    executor_id: string;
    provider_id: string;
    execution_id: string;
    execution_status: AgentPaidWorkExecutionStatus;
  };
  work_contract: {
    task_type: string;
    task_spec_sha256: string;
    input_manifest_sha256: string;
    expected_output_schema_sha256: string;
    result_delivery_channel_id: string;
  };
  observed_result_commitments: {
    output_manifest_sha256: string;
    result_payload_sha256: string;
    stdout_sha256: string;
    stderr_sha256: string;
    execution_log_sha256: string;
    evidence_bundle_sha256: string;
  };
  verification_evidence: {
    verification_report_sha256: string;
    reproduction_log_sha256: string;
    schema_validation_report_sha256: string;
    policy_review_report_sha256: string;
    executor_signature_verification_sha256: string;
  };
  checks: {
    completion_receipt_integrity_verified: boolean;
    execution_authorization_binding_verified: boolean;
    executor_signature_verified: boolean;
    task_spec_binding_verified: boolean;
    input_manifest_binding_verified: boolean;
    expected_output_schema_verified: boolean;
    result_payload_schema_valid: boolean;
    output_manifest_verified: boolean;
    evidence_bundle_verified: boolean;
    resource_limits_verified: boolean;
    policy_observation_verified: boolean;
    completion_requirements_satisfied: boolean;
  };
  decision: {
    status: AgentPaidWorkCompletionVerificationStatus;
    completion_verified: boolean;
    failure_reason_code: string | null;
    decision_final: boolean;
    supersedes_verification_id: null;
  };
  verifier_authentication: {
    signer_id: string;
    signing_key_id: string;
    signature_scheme: "ed25519";
    signed_payload_sha256: string;
    signature_evidence_sha256: string;
  };
  attestation: {
    exact_completion_receipt_only: true;
    independent_verifier_required: true;
    verifier_authentication_required: true;
    verifier_signature_verification_required: true;
    verifier_executor_separation_required: true;
    verifier_provider_separation_required: true;
    verifier_authorizer_separation_required: true;
    verification_evidence_immutable: true;
    one_final_verification_per_completion_receipt: true;
    replay_protection_required: true;
    completion_receipt_immutable: true;
    work_credit_award_separate: true;
    verification_is_not_work_execution_instruction: true;
    verification_is_not_work_credit_award_instruction: true;
    verification_is_not_payment_instruction: true;
    completion_receipt_mutation_authorized: false;
    work_credit_award_authorized: false;
    payment_mutation_authorized: false;
    wallet_or_signer_access_authorized: false;
    runtime_administration_authorized: false;
    buy_void_fulfillment_authorized: false;
  };
  nonce: string;
}

export interface AgentPaidWorkIndependentCompletionVerificationEnvelope
  extends AgentPaidWorkIndependentCompletionVerificationDraft {
  independent_completion_verification_id: string;
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
  "work_completion_receipt_id",
  "verified_at_utc",
  "verifier",
  "subject",
  "work_contract",
  "observed_result_commitments",
  "verification_evidence",
  "checks",
  "decision",
  "verifier_authentication",
  "attestation",
  "nonce",
] as const;

const CHECK_KEYS = [
  "completion_receipt_integrity_verified",
  "execution_authorization_binding_verified",
  "executor_signature_verified",
  "task_spec_binding_verified",
  "input_manifest_binding_verified",
  "expected_output_schema_verified",
  "result_payload_schema_valid",
  "output_manifest_verified",
  "evidence_bundle_verified",
  "resource_limits_verified",
  "policy_observation_verified",
  "completion_requirements_satisfied",
] as const;

const ATTESTATION_TRUE_KEYS = [
  "exact_completion_receipt_only",
  "independent_verifier_required",
  "verifier_authentication_required",
  "verifier_signature_verification_required",
  "verifier_executor_separation_required",
  "verifier_provider_separation_required",
  "verifier_authorizer_separation_required",
  "verification_evidence_immutable",
  "one_final_verification_per_completion_receipt",
  "replay_protection_required",
  "completion_receipt_immutable",
  "work_credit_award_separate",
  "verification_is_not_work_execution_instruction",
  "verification_is_not_work_credit_award_instruction",
  "verification_is_not_payment_instruction",
] as const;

const ATTESTATION_FALSE_KEYS = [
  "completion_receipt_mutation_authorized",
  "work_credit_award_authorized",
  "payment_mutation_authorized",
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

const DECISION_STATUSES = [
  "verified",
  "rejected",
  "inconclusive",
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
): AgentPaidWorkIndependentCompletionVerificationDraft {
  const root = requireRecord(value, "independent completion verification");
  requireExactKeys(
    root,
    "independent completion verification",
    [
      ...ROOT_KEYS,
      ...(allowId ? ["independent_completion_verification_id"] : []),
    ],
  );

  assertCondition(
    root.marker ===
      AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_MARKER,
    `marker must be ${
      AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_MARKER
    }`,
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
  const workCompletionReceiptId = requireString(
    root.work_completion_receipt_id,
    "work_completion_receipt_id",
    74,
    74,
    /^voidawcr1_[0-9a-f]{64}$/,
  );
  const verifiedAtUtc = requireString(
    root.verified_at_utc,
    "verified_at_utc",
    20,
    20,
  );
  parseUtcSeconds(verifiedAtUtc, "verified_at_utc");

  const verifier = requireRecord(root.verifier, "verifier");
  requireExactKeys(verifier, "verifier", [
    "verifier_id",
    "verification_policy_id",
    "verification_run_id",
  ]);
  const verifierId = requireString(
    verifier.verifier_id,
    "verifier.verifier_id",
    3,
    128,
    ID_PATTERN,
  );
  const verificationPolicyId = requireString(
    verifier.verification_policy_id,
    "verifier.verification_policy_id",
    3,
    128,
    ID_PATTERN,
  );
  const verificationRunId = requireString(
    verifier.verification_run_id,
    "verifier.verification_run_id",
    3,
    128,
    ID_PATTERN,
  );

  const subject = requireRecord(root.subject, "subject");
  requireExactKeys(subject, "subject", [
    "executor_id",
    "provider_id",
    "execution_id",
    "execution_status",
  ]);
  const executorId = requireString(
    subject.executor_id,
    "subject.executor_id",
    3,
    128,
    ID_PATTERN,
  );
  const providerId = requireString(
    subject.provider_id,
    "subject.provider_id",
    3,
    128,
    ID_PATTERN,
  );
  const executionId = requireString(
    subject.execution_id,
    "subject.execution_id",
    3,
    128,
    ID_PATTERN,
  );
  const executionStatus = requireString(
    subject.execution_status,
    "subject.execution_status",
    6,
    32,
  );
  assertCondition(
    EXECUTION_STATUSES.includes(
      executionStatus as AgentPaidWorkExecutionStatus,
    ),
    "subject.execution_status is invalid",
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

  const observedResultCommitments = requireRecord(
    root.observed_result_commitments,
    "observed_result_commitments",
  );
  requireExactKeys(
    observedResultCommitments,
    "observed_result_commitments",
    [
      "output_manifest_sha256",
      "result_payload_sha256",
      "stdout_sha256",
      "stderr_sha256",
      "execution_log_sha256",
      "evidence_bundle_sha256",
    ],
  );
  const outputManifestSha256 = requireString(
    observedResultCommitments.output_manifest_sha256,
    "observed_result_commitments.output_manifest_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const resultPayloadSha256 = requireString(
    observedResultCommitments.result_payload_sha256,
    "observed_result_commitments.result_payload_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const stdoutSha256 = requireString(
    observedResultCommitments.stdout_sha256,
    "observed_result_commitments.stdout_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const stderrSha256 = requireString(
    observedResultCommitments.stderr_sha256,
    "observed_result_commitments.stderr_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const executionLogSha256 = requireString(
    observedResultCommitments.execution_log_sha256,
    "observed_result_commitments.execution_log_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const evidenceBundleSha256 = requireString(
    observedResultCommitments.evidence_bundle_sha256,
    "observed_result_commitments.evidence_bundle_sha256",
    71,
    71,
    SHA256_PATTERN,
  );

  const verificationEvidence = requireRecord(
    root.verification_evidence,
    "verification_evidence",
  );
  requireExactKeys(verificationEvidence, "verification_evidence", [
    "verification_report_sha256",
    "reproduction_log_sha256",
    "schema_validation_report_sha256",
    "policy_review_report_sha256",
    "executor_signature_verification_sha256",
  ]);
  const verificationReportSha256 = requireString(
    verificationEvidence.verification_report_sha256,
    "verification_evidence.verification_report_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const reproductionLogSha256 = requireString(
    verificationEvidence.reproduction_log_sha256,
    "verification_evidence.reproduction_log_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const schemaValidationReportSha256 = requireString(
    verificationEvidence.schema_validation_report_sha256,
    "verification_evidence.schema_validation_report_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const policyReviewReportSha256 = requireString(
    verificationEvidence.policy_review_report_sha256,
    "verification_evidence.policy_review_report_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const executorSignatureVerificationSha256 = requireString(
    verificationEvidence.executor_signature_verification_sha256,
    "verification_evidence.executor_signature_verification_sha256",
    71,
    71,
    SHA256_PATTERN,
  );

  const checks = requireRecord(root.checks, "checks");
  requireExactKeys(checks, "checks", CHECK_KEYS);
  const completionReceiptIntegrityVerified = requireBoolean(
    checks.completion_receipt_integrity_verified,
    "checks.completion_receipt_integrity_verified",
  );
  const executionAuthorizationBindingVerified = requireBoolean(
    checks.execution_authorization_binding_verified,
    "checks.execution_authorization_binding_verified",
  );
  const executorSignatureVerified = requireBoolean(
    checks.executor_signature_verified,
    "checks.executor_signature_verified",
  );
  const taskSpecBindingVerified = requireBoolean(
    checks.task_spec_binding_verified,
    "checks.task_spec_binding_verified",
  );
  const inputManifestBindingVerified = requireBoolean(
    checks.input_manifest_binding_verified,
    "checks.input_manifest_binding_verified",
  );
  const expectedOutputSchemaVerified = requireBoolean(
    checks.expected_output_schema_verified,
    "checks.expected_output_schema_verified",
  );
  const resultPayloadSchemaValid = requireBoolean(
    checks.result_payload_schema_valid,
    "checks.result_payload_schema_valid",
  );
  const outputManifestVerified = requireBoolean(
    checks.output_manifest_verified,
    "checks.output_manifest_verified",
  );
  const evidenceBundleVerified = requireBoolean(
    checks.evidence_bundle_verified,
    "checks.evidence_bundle_verified",
  );
  const resourceLimitsVerified = requireBoolean(
    checks.resource_limits_verified,
    "checks.resource_limits_verified",
  );
  const policyObservationVerified = requireBoolean(
    checks.policy_observation_verified,
    "checks.policy_observation_verified",
  );
  const completionRequirementsSatisfied = requireBoolean(
    checks.completion_requirements_satisfied,
    "checks.completion_requirements_satisfied",
  );

  const checkValues = [
    completionReceiptIntegrityVerified,
    executionAuthorizationBindingVerified,
    executorSignatureVerified,
    taskSpecBindingVerified,
    inputManifestBindingVerified,
    expectedOutputSchemaVerified,
    resultPayloadSchemaValid,
    outputManifestVerified,
    evidenceBundleVerified,
    resourceLimitsVerified,
    policyObservationVerified,
    completionRequirementsSatisfied,
  ];

  const decision = requireRecord(root.decision, "decision");
  requireExactKeys(decision, "decision", [
    "status",
    "completion_verified",
    "failure_reason_code",
    "decision_final",
    "supersedes_verification_id",
  ]);
  const decisionStatus = requireString(
    decision.status,
    "decision.status",
    8,
    32,
  );
  assertCondition(
    DECISION_STATUSES.includes(
      decisionStatus as AgentPaidWorkCompletionVerificationStatus,
    ),
    "decision.status is invalid",
  );
  const completionVerified = requireBoolean(
    decision.completion_verified,
    "decision.completion_verified",
  );
  const failureReasonCode = requireNullableString(
    decision.failure_reason_code,
    "decision.failure_reason_code",
    3,
    128,
    ID_PATTERN,
  );
  const decisionFinal = requireBoolean(
    decision.decision_final,
    "decision.decision_final",
  );
  assertCondition(
    decision.supersedes_verification_id === null,
    "decision.supersedes_verification_id must be null",
  );

  if (decisionStatus === "verified") {
    assertCondition(
      executionStatus === "succeeded",
      "verified decision requires a succeeded execution",
    );
    assertCondition(
      checkValues.every(Boolean),
      "verified decision requires every verification check to pass",
    );
    assertCondition(
      completionVerified,
      "verified decision requires completion_verified=true",
    );
    assertCondition(
      failureReasonCode === null,
      "verified decision must not include a failure reason",
    );
    assertCondition(
      decisionFinal,
      "verified decision must be final",
    );
  } else {
    assertCondition(
      !completionVerified,
      `${decisionStatus} decision requires completion_verified=false`,
    );
    assertCondition(
      failureReasonCode !== null,
      `${decisionStatus} decision requires a failure reason`,
    );
    assertCondition(
      checkValues.some((item) => !item),
      `${decisionStatus} decision requires at least one failed check`,
    );
    assertCondition(
      decisionFinal === (decisionStatus === "rejected"),
      "rejected must be final and inconclusive must be non-final",
    );
  }

  const verifierAuthentication = requireRecord(
    root.verifier_authentication,
    "verifier_authentication",
  );
  requireExactKeys(verifierAuthentication, "verifier_authentication", [
    "signer_id",
    "signing_key_id",
    "signature_scheme",
    "signed_payload_sha256",
    "signature_evidence_sha256",
  ]);
  const signerId = requireString(
    verifierAuthentication.signer_id,
    "verifier_authentication.signer_id",
    3,
    128,
    ID_PATTERN,
  );
  const signingKeyId = requireString(
    verifierAuthentication.signing_key_id,
    "verifier_authentication.signing_key_id",
    3,
    128,
    ID_PATTERN,
  );
  assertCondition(
    verifierAuthentication.signature_scheme === "ed25519",
    "verifier_authentication.signature_scheme must be ed25519",
  );
  const signedPayloadSha256 = requireString(
    verifierAuthentication.signed_payload_sha256,
    "verifier_authentication.signed_payload_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const signatureEvidenceSha256 = requireString(
    verifierAuthentication.signature_evidence_sha256,
    "verifier_authentication.signature_evidence_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  assertCondition(
    signerId === verifierId,
    "verifier authentication signer must match verifier",
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
    marker:
      AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_MARKER,
    version: 1,
    work_order_id: workOrderId,
    quote_id: quoteId,
    acceptance_id: acceptanceId,
    payment_intent_id: paymentIntentId,
    payment_execution_authorization_id: paymentExecutionAuthorizationId,
    payment_receipt_id: paymentReceiptId,
    payment_confirmation_id: paymentConfirmationId,
    work_execution_authorization_id: workExecutionAuthorizationId,
    work_completion_receipt_id: workCompletionReceiptId,
    verified_at_utc: verifiedAtUtc,
    verifier: {
      verifier_id: verifierId,
      verification_policy_id: verificationPolicyId,
      verification_run_id: verificationRunId,
    },
    subject: {
      executor_id: executorId,
      provider_id: providerId,
      execution_id: executionId,
      execution_status: executionStatus as AgentPaidWorkExecutionStatus,
    },
    work_contract: {
      task_type: taskType,
      task_spec_sha256: taskSpecSha256,
      input_manifest_sha256: inputManifestSha256,
      expected_output_schema_sha256: expectedOutputSchemaSha256,
      result_delivery_channel_id: resultDeliveryChannelId,
    },
    observed_result_commitments: {
      output_manifest_sha256: outputManifestSha256,
      result_payload_sha256: resultPayloadSha256,
      stdout_sha256: stdoutSha256,
      stderr_sha256: stderrSha256,
      execution_log_sha256: executionLogSha256,
      evidence_bundle_sha256: evidenceBundleSha256,
    },
    verification_evidence: {
      verification_report_sha256: verificationReportSha256,
      reproduction_log_sha256: reproductionLogSha256,
      schema_validation_report_sha256: schemaValidationReportSha256,
      policy_review_report_sha256: policyReviewReportSha256,
      executor_signature_verification_sha256:
        executorSignatureVerificationSha256,
    },
    checks: {
      completion_receipt_integrity_verified:
        completionReceiptIntegrityVerified,
      execution_authorization_binding_verified:
        executionAuthorizationBindingVerified,
      executor_signature_verified: executorSignatureVerified,
      task_spec_binding_verified: taskSpecBindingVerified,
      input_manifest_binding_verified: inputManifestBindingVerified,
      expected_output_schema_verified: expectedOutputSchemaVerified,
      result_payload_schema_valid: resultPayloadSchemaValid,
      output_manifest_verified: outputManifestVerified,
      evidence_bundle_verified: evidenceBundleVerified,
      resource_limits_verified: resourceLimitsVerified,
      policy_observation_verified: policyObservationVerified,
      completion_requirements_satisfied: completionRequirementsSatisfied,
    },
    decision: {
      status:
        decisionStatus as AgentPaidWorkCompletionVerificationStatus,
      completion_verified: completionVerified,
      failure_reason_code: failureReasonCode,
      decision_final: decisionFinal,
      supersedes_verification_id: null,
    },
    verifier_authentication: {
      signer_id: signerId,
      signing_key_id: signingKeyId,
      signature_scheme: "ed25519",
      signed_payload_sha256: signedPayloadSha256,
      signature_evidence_sha256: signatureEvidenceSha256,
    },
    attestation: {
      exact_completion_receipt_only: true,
      independent_verifier_required: true,
      verifier_authentication_required: true,
      verifier_signature_verification_required: true,
      verifier_executor_separation_required: true,
      verifier_provider_separation_required: true,
      verifier_authorizer_separation_required: true,
      verification_evidence_immutable: true,
      one_final_verification_per_completion_receipt: true,
      replay_protection_required: true,
      completion_receipt_immutable: true,
      work_credit_award_separate: true,
      verification_is_not_work_execution_instruction: true,
      verification_is_not_work_credit_award_instruction: true,
      verification_is_not_payment_instruction: true,
      completion_receipt_mutation_authorized: false,
      work_credit_award_authorized: false,
      payment_mutation_authorized: false,
      wallet_or_signer_access_authorized: false,
      runtime_administration_authorized: false,
      buy_void_fulfillment_authorized: false,
    },
    nonce,
  };
}

function validateBindings(
  workExecutionAuthorization:
    AgentPaidWorkExecutionAuthorizationEnvelope,
  completionReceipt: AgentPaidWorkCompletionReceiptEnvelope,
  verification:
    AgentPaidWorkIndependentCompletionVerificationDraft,
): void {
  for (const key of [
    "work_order_id",
    "quote_id",
    "acceptance_id",
    "payment_intent_id",
    "payment_execution_authorization_id",
    "payment_receipt_id",
    "payment_confirmation_id",
    "work_execution_authorization_id",
  ] as const) {
    assertCondition(
      verification[key] === completionReceipt[key],
      `${key} mismatch`,
    );
  }
  assertCondition(
    verification.work_completion_receipt_id ===
      completionReceipt.work_completion_receipt_id,
    "work_completion_receipt_id mismatch",
  );

  assertCondition(
    verification.subject.executor_id ===
      completionReceipt.executor.executor_id,
    "subject.executor_id mismatch",
  );
  assertCondition(
    verification.subject.provider_id ===
      completionReceipt.executor.provider_id,
    "subject.provider_id mismatch",
  );
  assertCondition(
    verification.subject.execution_id ===
      completionReceipt.execution.execution_id,
    "subject.execution_id mismatch",
  );
  assertCondition(
    verification.subject.execution_status ===
      completionReceipt.execution.status,
    "subject.execution_status mismatch",
  );

  for (const key of [
    "task_type",
    "task_spec_sha256",
    "input_manifest_sha256",
    "expected_output_schema_sha256",
    "result_delivery_channel_id",
  ] as const) {
    assertCondition(
      verification.work_contract[key] ===
        completionReceipt.work_contract[key],
      `work_contract.${key} mismatch`,
    );
  }

  for (const key of [
    "output_manifest_sha256",
    "result_payload_sha256",
    "stdout_sha256",
    "stderr_sha256",
    "execution_log_sha256",
    "evidence_bundle_sha256",
  ] as const) {
    assertCondition(
      verification.observed_result_commitments[key] ===
        completionReceipt.result_commitments[key],
      `observed_result_commitments.${key} mismatch`,
    );
  }

  assertCondition(
    verification.verifier.verifier_id ===
      workExecutionAuthorization.completion_verifier.verifier_id,
    "verifier_id mismatch with work execution authorization",
  );
  assertCondition(
    verification.verifier.verification_policy_id ===
      workExecutionAuthorization.completion_verifier.verification_policy_id,
    "verification_policy_id mismatch with work execution authorization",
  );

  const verifierId = verification.verifier.verifier_id;
  assertCondition(
    verifierId !== completionReceipt.executor.executor_id,
    "verifier must be distinct from executor",
  );
  assertCondition(
    verifierId !== completionReceipt.executor.provider_id,
    "verifier must be distinct from provider",
  );
  assertCondition(
    verifierId !== workExecutionAuthorization.authorizer.authority_id,
    "verifier must be distinct from work execution authorizer",
  );

  const receiptCreated = parseUtcSeconds(
    completionReceipt.receipt_created_at_utc,
    "completion receipt receipt_created_at_utc",
  );
  const verifiedAt = parseUtcSeconds(
    verification.verified_at_utc,
    "verification verified_at_utc",
  );
  assertCondition(
    verifiedAt >= receiptCreated,
    "verification cannot predate completion receipt creation",
  );

  assertCondition(
    completionReceipt.attestation
      .independent_completion_verification_required === true,
    "completion receipt must require independent verification",
  );
  assertCondition(
    completionReceipt.attestation.correctness_verified === false,
    "completion receipt must not already claim correctness verification",
  );
  assertCondition(
    completionReceipt.attestation
      .receipt_is_not_independent_completion_verification === true,
    "completion receipt must preserve separate verification boundary",
  );
}

export function computeAgentPaidWorkIndependentCompletionVerificationId(
  draft: AgentPaidWorkIndependentCompletionVerificationDraft,
): string {
  const digest = createHash("sha256")
    .update(canonicalJson(draft))
    .digest("hex");
  return `${
    AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_ID_PREFIX
  }${digest}`;
}

export function validateAgentPaidWorkIndependentCompletionVerificationDraft(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  workExecutionAuthorizationValue: unknown,
  completionReceiptValue: unknown,
  verificationValue: unknown,
): asserts verificationValue is
  AgentPaidWorkIndependentCompletionVerificationDraft {
  validateAgentPaidWorkCompletionReceiptEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    workExecutionAuthorizationValue,
    completionReceiptValue,
  );
  const workExecutionAuthorization =
    workExecutionAuthorizationValue as
      AgentPaidWorkExecutionAuthorizationEnvelope;
  const completionReceipt =
    completionReceiptValue as AgentPaidWorkCompletionReceiptEnvelope;
  const verification = validateDraftShape(verificationValue, false);
  validateBindings(
    workExecutionAuthorization,
    completionReceipt,
    verification,
  );
}

export function materializeAgentPaidWorkIndependentCompletionVerification(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  workExecutionAuthorizationValue: unknown,
  completionReceiptValue: unknown,
  verificationValue: unknown,
): AgentPaidWorkIndependentCompletionVerificationEnvelope {
  validateAgentPaidWorkCompletionReceiptEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    workExecutionAuthorizationValue,
    completionReceiptValue,
  );
  const workExecutionAuthorization =
    workExecutionAuthorizationValue as
      AgentPaidWorkExecutionAuthorizationEnvelope;
  const completionReceipt =
    completionReceiptValue as AgentPaidWorkCompletionReceiptEnvelope;
  const draft = validateDraftShape(verificationValue, false);
  validateBindings(
    workExecutionAuthorization,
    completionReceipt,
    draft,
  );
  return {
    ...draft,
    independent_completion_verification_id:
      computeAgentPaidWorkIndependentCompletionVerificationId(draft),
  };
}

export function validateAgentPaidWorkIndependentCompletionVerificationEnvelope(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  workExecutionAuthorizationValue: unknown,
  completionReceiptValue: unknown,
  verificationValue: unknown,
): asserts verificationValue is
  AgentPaidWorkIndependentCompletionVerificationEnvelope {
  validateAgentPaidWorkCompletionReceiptEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    workExecutionAuthorizationValue,
    completionReceiptValue,
  );
  const workExecutionAuthorization =
    workExecutionAuthorizationValue as
      AgentPaidWorkExecutionAuthorizationEnvelope;
  const completionReceipt =
    completionReceiptValue as AgentPaidWorkCompletionReceiptEnvelope;
  const root = requireRecord(
    verificationValue,
    "independent completion verification envelope",
  );
  const draft = validateDraftShape(verificationValue, true);
  validateBindings(
    workExecutionAuthorization,
    completionReceipt,
    draft,
  );
  const verificationId = requireString(
    root.independent_completion_verification_id,
    "independent_completion_verification_id",
    75,
    75,
    /^voidawicv1_[0-9a-f]{64}$/,
  );
  assertCondition(
    verificationId ===
      computeAgentPaidWorkIndependentCompletionVerificationId(draft),
    "independent_completion_verification_id does not match canonical payload",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail([
    "usage:",
    "  tsx scripts/agent_paid_work_independent_completion_verification_envelope_v1.ts materialize <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <payment-execution-authorization.json> <payment-receipt.json> <payment-confirmation.json> <work-execution-authorization.json> <completion-receipt.json> <verification-draft.json> <verification-envelope.json>",
    "  tsx scripts/agent_paid_work_independent_completion_verification_envelope_v1.ts verify <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <payment-execution-authorization.json> <payment-receipt.json> <payment-confirmation.json> <work-execution-authorization.json> <completion-receipt.json> <verification-envelope.json>",
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
    verificationPath,
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
      completionReceiptPath &&
      verificationPath
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
  const verification = readJson(resolve(verificationPath));

  if (mode === "materialize") {
    assertCondition(Boolean(outputPath), "materialize requires output path");
    const output = resolve(outputPath);
    assertCondition(
      !existsSync(output),
      "refusing to overwrite an existing independent verification",
    );
    const envelope =
      materializeAgentPaidWorkIndependentCompletionVerification(
        workOrder,
        quote,
        acceptance,
        paymentIntent,
        paymentExecutionAuthorization,
        paymentReceipt,
        paymentConfirmation,
        workExecutionAuthorization,
        completionReceipt,
        verification,
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
      `independent_completion_verification_id=${
        envelope.independent_completion_verification_id
      }`,
    );
    console.log(`output=${output}`);
    console.log(
      "VOID_AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_"
      + "ENVELOPE_V1_MATERIALIZED",
    );
    return;
  }

  if (mode === "verify") {
    assertCondition(
      outputPath === undefined,
      "verify does not accept an output path",
    );
    validateAgentPaidWorkIndependentCompletionVerificationEnvelope(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      completionReceipt,
      verification,
    );
    console.log(`marker=${verification.marker}`);
    console.log(
      `work_completion_receipt_id=${
        verification.work_completion_receipt_id
      }`,
    );
    console.log(
      `independent_completion_verification_id=${
        verification.independent_completion_verification_id
      }`,
    );
    console.log(`decision_status=${verification.decision.status}`);
    console.log(
      `completion_verified=${verification.decision.completion_verified}`,
    );
    console.log(
      "VOID_AGENT_PAID_WORK_INDEPENDENT_COMPLETION_VERIFICATION_"
      + "ENVELOPE_V1_VALID",
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
