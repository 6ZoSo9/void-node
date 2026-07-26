import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  validateAgentPaidWorkIndependentCompletionVerificationEnvelope,
  type AgentPaidWorkIndependentCompletionVerificationEnvelope,
} from "./agent_paid_work_independent_completion_verification_envelope_v1.js";

export const AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_MARKER =
  "VOID_AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_ENVELOPE_V1" as const;
export const AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_ID_PREFIX =
  "voidawwcaa1_" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AgentPaidWorkWcAwardAuthorizationDraft {
  marker: typeof AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_MARKER;
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
  independent_completion_verification_id: string;
  authorized_at_utc: string;
  expires_at_utc: string;
  beneficiary: {
    executor_id: string;
    provider_id: string;
    wc_account_id: string;
  };
  verified_completion: {
    verifier_id: string;
    verification_policy_id: string;
    decision_status: "verified";
    completion_verified: true;
  };
  award: {
    denomination: "WC";
    amount_wc: number;
    maximum_authorized_amount_wc: number;
    award_reason_code: string;
    award_policy_id: string;
    score_basis_sha256: string;
  };
  ledger_target: {
    ledger_id: string;
    entry_type: "earn";
    destination_account_id: string;
    uniqueness_key: string;
    expected_prestate_sha256: string;
    ledger_receipt_schema_id: string;
  };
  authorizer: {
    authority_id: string;
    authority_policy_id: string;
    signing_key_id: string;
    signature_scheme: "ed25519";
    signed_payload_sha256: string;
    signature_evidence_sha256: string;
  };
  authorization: {
    wc_award_authorized: true;
    exact_independent_verification_only: true;
    exact_completion_receipt_only: true;
    verified_completion_required: true;
    one_time_use_required: true;
    replay_protection_required: true;
    atomic_ledger_write_required: true;
    single_award_per_verification_required: true;
    beneficiary_binding_required: true;
    authorizer_authentication_required: true;
    authorization_signature_required: true;
    authority_policy_binding_required: true;
    authorizer_beneficiary_separation_required: true;
    authorizer_provider_separation_required: true;
    authorizer_verifier_separation_required: true;
    award_amount_cap_enforced: true;
    ledger_uniqueness_enforced: true;
    ledger_receipt_required: true;
    ledger_write_is_separate_execution: true;
    wc_to_void_settlement_separate: true;
    payment_mutation_forbidden: true;
    wallet_access_forbidden: true;
    runtime_administration_forbidden: true;
    buy_void_fulfillment_forbidden: true;
    authorization_is_not_ledger_write: true;
    authorization_is_not_wc_to_void_settlement: true;
    authorization_is_not_payment_instruction: true;
  };
  nonce: string;
}

export interface AgentPaidWorkWcAwardAuthorizationEnvelope
  extends AgentPaidWorkWcAwardAuthorizationDraft {
  wc_award_authorization_id: string;
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
  "independent_completion_verification_id",
  "authorized_at_utc",
  "expires_at_utc",
  "beneficiary",
  "verified_completion",
  "award",
  "ledger_target",
  "authorizer",
  "authorization",
  "nonce",
] as const;

const AUTHORIZATION_TRUE_KEYS = [
  "wc_award_authorized",
  "exact_independent_verification_only",
  "exact_completion_receipt_only",
  "verified_completion_required",
  "one_time_use_required",
  "replay_protection_required",
  "atomic_ledger_write_required",
  "single_award_per_verification_required",
  "beneficiary_binding_required",
  "authorizer_authentication_required",
  "authorization_signature_required",
  "authority_policy_binding_required",
  "authorizer_beneficiary_separation_required",
  "authorizer_provider_separation_required",
  "authorizer_verifier_separation_required",
  "award_amount_cap_enforced",
  "ledger_uniqueness_enforced",
  "ledger_receipt_required",
  "ledger_write_is_separate_execution",
  "wc_to_void_settlement_separate",
  "payment_mutation_forbidden",
  "wallet_access_forbidden",
  "runtime_administration_forbidden",
  "buy_void_fulfillment_forbidden",
  "authorization_is_not_ledger_write",
  "authorization_is_not_wc_to_void_settlement",
  "authorization_is_not_payment_instruction",
] as const;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/;
const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const LOWER_CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{2,127}$/;
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
): AgentPaidWorkWcAwardAuthorizationDraft {
  const root = requireRecord(value, "WC award authorization");
  requireExactKeys(
    root,
    "WC award authorization",
    [
      ...ROOT_KEYS,
      ...(allowId ? ["wc_award_authorization_id"] : []),
    ],
  );

  assertCondition(
    root.marker === AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_MARKER,
    `marker must be ${AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_MARKER}`,
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
  const independentCompletionVerificationId = requireString(
    root.independent_completion_verification_id,
    "independent_completion_verification_id",
    75,
    75,
    /^voidawicv1_[0-9a-f]{64}$/,
  );

  const authorizedAtUtc = requireString(
    root.authorized_at_utc,
    "authorized_at_utc",
    20,
    20,
  );
  const expiresAtUtc = requireString(
    root.expires_at_utc,
    "expires_at_utc",
    20,
    20,
  );
  const authorizedAt = parseUtcSeconds(
    authorizedAtUtc,
    "authorized_at_utc",
  );
  const expiresAt = parseUtcSeconds(expiresAtUtc, "expires_at_utc");
  assertCondition(
    expiresAt > authorizedAt,
    "expires_at_utc must follow authorized_at_utc",
  );
  assertCondition(
    expiresAt - authorizedAt <= 900,
    "WC award authorization lifetime must not exceed 900 seconds",
  );

  const beneficiary = requireRecord(root.beneficiary, "beneficiary");
  requireExactKeys(beneficiary, "beneficiary", [
    "executor_id",
    "provider_id",
    "wc_account_id",
  ]);
  const executorId = requireString(
    beneficiary.executor_id,
    "beneficiary.executor_id",
    3,
    160,
    ID_PATTERN,
  );
  const providerId = requireString(
    beneficiary.provider_id,
    "beneficiary.provider_id",
    3,
    160,
    ID_PATTERN,
  );
  const wcAccountId = requireString(
    beneficiary.wc_account_id,
    "beneficiary.wc_account_id",
    3,
    128,
    ACCOUNT_ID_PATTERN,
  );

  const verifiedCompletion = requireRecord(
    root.verified_completion,
    "verified_completion",
  );
  requireExactKeys(verifiedCompletion, "verified_completion", [
    "verifier_id",
    "verification_policy_id",
    "decision_status",
    "completion_verified",
  ]);
  const verifierId = requireString(
    verifiedCompletion.verifier_id,
    "verified_completion.verifier_id",
    3,
    160,
    ID_PATTERN,
  );
  const verificationPolicyId = requireString(
    verifiedCompletion.verification_policy_id,
    "verified_completion.verification_policy_id",
    3,
    160,
    ID_PATTERN,
  );
  assertCondition(
    verifiedCompletion.decision_status === "verified",
    "verified_completion.decision_status must be verified",
  );
  requireBooleanLiteral(
    verifiedCompletion.completion_verified,
    "verified_completion.completion_verified",
    true,
  );

  const award = requireRecord(root.award, "award");
  requireExactKeys(award, "award", [
    "denomination",
    "amount_wc",
    "maximum_authorized_amount_wc",
    "award_reason_code",
    "award_policy_id",
    "score_basis_sha256",
  ]);
  assertCondition(award.denomination === "WC", "award.denomination must be WC");
  const amountWc = requireSafeInteger(
    award.amount_wc,
    "award.amount_wc",
    1,
    1_000_000_000,
  );
  const maximumAuthorizedAmountWc = requireSafeInteger(
    award.maximum_authorized_amount_wc,
    "award.maximum_authorized_amount_wc",
    1,
    1_000_000_000,
  );
  assertCondition(
    amountWc <= maximumAuthorizedAmountWc,
    "award.amount_wc exceeds maximum_authorized_amount_wc",
  );
  const awardReasonCode = requireString(
    award.award_reason_code,
    "award.award_reason_code",
    3,
    128,
    LOWER_CODE_PATTERN,
  );
  const awardPolicyId = requireString(
    award.award_policy_id,
    "award.award_policy_id",
    3,
    160,
    ID_PATTERN,
  );
  const scoreBasisSha256 = requireString(
    award.score_basis_sha256,
    "award.score_basis_sha256",
    71,
    71,
    SHA256_PATTERN,
  );

  const ledgerTarget = requireRecord(root.ledger_target, "ledger_target");
  requireExactKeys(ledgerTarget, "ledger_target", [
    "ledger_id",
    "entry_type",
    "destination_account_id",
    "uniqueness_key",
    "expected_prestate_sha256",
    "ledger_receipt_schema_id",
  ]);
  const ledgerId = requireString(
    ledgerTarget.ledger_id,
    "ledger_target.ledger_id",
    3,
    160,
    ID_PATTERN,
  );
  assertCondition(
    ledgerTarget.entry_type === "earn",
    "ledger_target.entry_type must be earn",
  );
  const destinationAccountId = requireString(
    ledgerTarget.destination_account_id,
    "ledger_target.destination_account_id",
    3,
    128,
    ACCOUNT_ID_PATTERN,
  );
  const uniquenessKey = requireString(
    ledgerTarget.uniqueness_key,
    "ledger_target.uniqueness_key",
    98,
    98,
    /^paid-work-verification:voidawicv1_[0-9a-f]{64}$/,
  );
  const expectedPrestateSha256 = requireString(
    ledgerTarget.expected_prestate_sha256,
    "ledger_target.expected_prestate_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const ledgerReceiptSchemaId = requireString(
    ledgerTarget.ledger_receipt_schema_id,
    "ledger_target.ledger_receipt_schema_id",
    3,
    160,
    ID_PATTERN,
  );

  const authorizer = requireRecord(root.authorizer, "authorizer");
  requireExactKeys(authorizer, "authorizer", [
    "authority_id",
    "authority_policy_id",
    "signing_key_id",
    "signature_scheme",
    "signed_payload_sha256",
    "signature_evidence_sha256",
  ]);
  const authorityId = requireString(
    authorizer.authority_id,
    "authorizer.authority_id",
    3,
    160,
    ID_PATTERN,
  );
  const authorityPolicyId = requireString(
    authorizer.authority_policy_id,
    "authorizer.authority_policy_id",
    3,
    160,
    ID_PATTERN,
  );
  const signingKeyId = requireString(
    authorizer.signing_key_id,
    "authorizer.signing_key_id",
    3,
    160,
    ID_PATTERN,
  );
  assertCondition(
    authorizer.signature_scheme === "ed25519",
    "authorizer.signature_scheme must be ed25519",
  );
  const signedPayloadSha256 = requireString(
    authorizer.signed_payload_sha256,
    "authorizer.signed_payload_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const signatureEvidenceSha256 = requireString(
    authorizer.signature_evidence_sha256,
    "authorizer.signature_evidence_sha256",
    71,
    71,
    SHA256_PATTERN,
  );

  assertCondition(
    authorityId !== executorId,
    "authorizer must be distinct from beneficiary executor",
  );
  assertCondition(
    authorityId !== providerId,
    "authorizer must be distinct from provider",
  );
  assertCondition(
    authorityId !== verifierId,
    "authorizer must be distinct from independent verifier",
  );
  assertCondition(
    authorityPolicyId === awardPolicyId,
    "authorizer policy must match award policy",
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
    marker: AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_MARKER,
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
    independent_completion_verification_id:
      independentCompletionVerificationId,
    authorized_at_utc: authorizedAtUtc,
    expires_at_utc: expiresAtUtc,
    beneficiary: {
      executor_id: executorId,
      provider_id: providerId,
      wc_account_id: wcAccountId,
    },
    verified_completion: {
      verifier_id: verifierId,
      verification_policy_id: verificationPolicyId,
      decision_status: "verified",
      completion_verified: true,
    },
    award: {
      denomination: "WC",
      amount_wc: amountWc,
      maximum_authorized_amount_wc: maximumAuthorizedAmountWc,
      award_reason_code: awardReasonCode,
      award_policy_id: awardPolicyId,
      score_basis_sha256: scoreBasisSha256,
    },
    ledger_target: {
      ledger_id: ledgerId,
      entry_type: "earn",
      destination_account_id: destinationAccountId,
      uniqueness_key: uniquenessKey,
      expected_prestate_sha256: expectedPrestateSha256,
      ledger_receipt_schema_id: ledgerReceiptSchemaId,
    },
    authorizer: {
      authority_id: authorityId,
      authority_policy_id: authorityPolicyId,
      signing_key_id: signingKeyId,
      signature_scheme: "ed25519",
      signed_payload_sha256: signedPayloadSha256,
      signature_evidence_sha256: signatureEvidenceSha256,
    },
    authorization: {
      wc_award_authorized: true,
      exact_independent_verification_only: true,
      exact_completion_receipt_only: true,
      verified_completion_required: true,
      one_time_use_required: true,
      replay_protection_required: true,
      atomic_ledger_write_required: true,
      single_award_per_verification_required: true,
      beneficiary_binding_required: true,
      authorizer_authentication_required: true,
      authorization_signature_required: true,
      authority_policy_binding_required: true,
      authorizer_beneficiary_separation_required: true,
      authorizer_provider_separation_required: true,
      authorizer_verifier_separation_required: true,
      award_amount_cap_enforced: true,
      ledger_uniqueness_enforced: true,
      ledger_receipt_required: true,
      ledger_write_is_separate_execution: true,
      wc_to_void_settlement_separate: true,
      payment_mutation_forbidden: true,
      wallet_access_forbidden: true,
      runtime_administration_forbidden: true,
      buy_void_fulfillment_forbidden: true,
      authorization_is_not_ledger_write: true,
      authorization_is_not_wc_to_void_settlement: true,
      authorization_is_not_payment_instruction: true,
    },
    nonce,
  };
}

function validateBindings(
  verification:
    AgentPaidWorkIndependentCompletionVerificationEnvelope,
  authorization: AgentPaidWorkWcAwardAuthorizationDraft,
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
    "work_completion_receipt_id",
  ] as const) {
    assertCondition(
      authorization[key] === verification[key],
      `${key} mismatch`,
    );
  }
  assertCondition(
    authorization.independent_completion_verification_id ===
      verification.independent_completion_verification_id,
    "independent_completion_verification_id mismatch",
  );

  assertCondition(
    verification.decision.status === "verified",
    "independent completion verification must be verified",
  );
  assertCondition(
    verification.decision.completion_verified === true,
    "independent completion verification must confirm completion",
  );
  assertCondition(
    verification.decision.decision_final === true,
    "independent completion verification must be final",
  );
  assertCondition(
    verification.decision.failure_reason_code === null,
    "verified completion must not contain a failure reason",
  );
  assertCondition(
    Object.values(verification.checks).every((item) => item === true),
    "every independent verification check must pass",
  );

  assertCondition(
    authorization.beneficiary.executor_id ===
      verification.subject.executor_id,
    "beneficiary.executor_id mismatch",
  );
  assertCondition(
    authorization.beneficiary.provider_id ===
      verification.subject.provider_id,
    "beneficiary.provider_id mismatch",
  );
  assertCondition(
    authorization.verified_completion.verifier_id ===
      verification.verifier.verifier_id,
    "verified_completion.verifier_id mismatch",
  );
  assertCondition(
    authorization.verified_completion.verification_policy_id ===
      verification.verifier.verification_policy_id,
    "verified_completion.verification_policy_id mismatch",
  );

  assertCondition(
    authorization.ledger_target.destination_account_id ===
      authorization.beneficiary.wc_account_id,
    "ledger destination must equal beneficiary WC account",
  );
  assertCondition(
    authorization.ledger_target.uniqueness_key ===
      `paid-work-verification:${
        verification.independent_completion_verification_id
      }`,
    "ledger uniqueness key mismatch",
  );

  const verifiedAt = parseUtcSeconds(
    verification.verified_at_utc,
    "independent verification verified_at_utc",
  );
  const authorizedAt = parseUtcSeconds(
    authorization.authorized_at_utc,
    "authorization authorized_at_utc",
  );
  assertCondition(
    authorizedAt >= verifiedAt,
    "WC award authorization cannot predate independent verification",
  );

  assertCondition(
    verification.attestation.work_credit_award_separate === true,
    "independent verification must keep WC award separate",
  );
  assertCondition(
    verification.attestation.work_credit_award_authorized === false,
    "independent verification must not already authorize a WC award",
  );
  assertCondition(
    verification.attestation
      .verification_is_not_work_credit_award_instruction === true,
    "independent verification must not be a WC award instruction",
  );
}

export function computeAgentPaidWorkWcAwardAuthorizationId(
  draft: AgentPaidWorkWcAwardAuthorizationDraft,
): string {
  const digest = createHash("sha256")
    .update(canonicalJson(draft))
    .digest("hex");
  return `${AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_ID_PREFIX}${digest}`;
}

export function validateAgentPaidWorkWcAwardAuthorizationDraft(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  workExecutionAuthorizationValue: unknown,
  completionReceiptValue: unknown,
  independentCompletionVerificationValue: unknown,
  wcAwardAuthorizationValue: unknown,
): asserts wcAwardAuthorizationValue is
  AgentPaidWorkWcAwardAuthorizationDraft {
  validateAgentPaidWorkIndependentCompletionVerificationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    workExecutionAuthorizationValue,
    completionReceiptValue,
    independentCompletionVerificationValue,
  );
  const verification =
    independentCompletionVerificationValue as
      AgentPaidWorkIndependentCompletionVerificationEnvelope;
  const authorization = validateDraftShape(
    wcAwardAuthorizationValue,
    false,
  );
  validateBindings(verification, authorization);
}

export function materializeAgentPaidWorkWcAwardAuthorization(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  workExecutionAuthorizationValue: unknown,
  completionReceiptValue: unknown,
  independentCompletionVerificationValue: unknown,
  wcAwardAuthorizationValue: unknown,
): AgentPaidWorkWcAwardAuthorizationEnvelope {
  validateAgentPaidWorkIndependentCompletionVerificationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    workExecutionAuthorizationValue,
    completionReceiptValue,
    independentCompletionVerificationValue,
  );
  const verification =
    independentCompletionVerificationValue as
      AgentPaidWorkIndependentCompletionVerificationEnvelope;
  const draft = validateDraftShape(wcAwardAuthorizationValue, false);
  validateBindings(verification, draft);
  return {
    ...draft,
    wc_award_authorization_id:
      computeAgentPaidWorkWcAwardAuthorizationId(draft),
  };
}

export function validateAgentPaidWorkWcAwardAuthorizationEnvelope(
  workOrderValue: unknown,
  quoteValue: unknown,
  acceptanceValue: unknown,
  paymentIntentValue: unknown,
  paymentExecutionAuthorizationValue: unknown,
  paymentReceiptValue: unknown,
  paymentConfirmationValue: unknown,
  workExecutionAuthorizationValue: unknown,
  completionReceiptValue: unknown,
  independentCompletionVerificationValue: unknown,
  wcAwardAuthorizationValue: unknown,
): asserts wcAwardAuthorizationValue is
  AgentPaidWorkWcAwardAuthorizationEnvelope {
  validateAgentPaidWorkIndependentCompletionVerificationEnvelope(
    workOrderValue,
    quoteValue,
    acceptanceValue,
    paymentIntentValue,
    paymentExecutionAuthorizationValue,
    paymentReceiptValue,
    paymentConfirmationValue,
    workExecutionAuthorizationValue,
    completionReceiptValue,
    independentCompletionVerificationValue,
  );
  const verification =
    independentCompletionVerificationValue as
      AgentPaidWorkIndependentCompletionVerificationEnvelope;
  const root = requireRecord(
    wcAwardAuthorizationValue,
    "WC award authorization envelope",
  );
  const draft = validateDraftShape(wcAwardAuthorizationValue, true);
  validateBindings(verification, draft);
  const authorizationId = requireString(
    root.wc_award_authorization_id,
    "wc_award_authorization_id",
    76,
    76,
    /^voidawwcaa1_[0-9a-f]{64}$/,
  );
  assertCondition(
    authorizationId === computeAgentPaidWorkWcAwardAuthorizationId(draft),
    "wc_award_authorization_id does not match canonical payload",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail([
    "usage:",
    "  tsx scripts/agent_paid_work_wc_award_authorization_envelope_v1.ts materialize <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <payment-execution-authorization.json> <payment-receipt.json> <payment-confirmation.json> <work-execution-authorization.json> <completion-receipt.json> <independent-completion-verification.json> <wc-award-authorization-draft.json> <wc-award-authorization-envelope.json>",
    "  tsx scripts/agent_paid_work_wc_award_authorization_envelope_v1.ts verify <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <payment-execution-authorization.json> <payment-receipt.json> <payment-confirmation.json> <work-execution-authorization.json> <completion-receipt.json> <independent-completion-verification.json> <wc-award-authorization-envelope.json>",
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
    independentCompletionVerificationPath,
    wcAwardAuthorizationPath,
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
      independentCompletionVerificationPath &&
      wcAwardAuthorizationPath
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
  const independentCompletionVerification = readJson(
    resolve(independentCompletionVerificationPath),
  );
  const wcAwardAuthorization = readJson(
    resolve(wcAwardAuthorizationPath),
  );

  if (mode === "materialize") {
    assertCondition(Boolean(outputPath), "materialize requires output path");
    const output = resolve(outputPath);
    assertCondition(
      !existsSync(output),
      "refusing to overwrite an existing WC award authorization",
    );
    const envelope = materializeAgentPaidWorkWcAwardAuthorization(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      completionReceipt,
      independentCompletionVerification,
      wcAwardAuthorization,
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
      `wc_award_authorization_id=${envelope.wc_award_authorization_id}`,
    );
    console.log(`output=${output}`);
    console.log(
      "VOID_AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_ENVELOPE_V1_MATERIALIZED",
    );
    return;
  }

  if (mode === "verify") {
    assertCondition(
      outputPath === undefined,
      "verify does not accept an output path",
    );
    validateAgentPaidWorkWcAwardAuthorizationEnvelope(
      workOrder,
      quote,
      acceptance,
      paymentIntent,
      paymentExecutionAuthorization,
      paymentReceipt,
      paymentConfirmation,
      workExecutionAuthorization,
      completionReceipt,
      independentCompletionVerification,
      wcAwardAuthorization,
    );
    console.log(`marker=${wcAwardAuthorization.marker}`);
    console.log(
      `independent_completion_verification_id=${
        wcAwardAuthorization.independent_completion_verification_id
      }`,
    );
    console.log(
      `wc_award_authorization_id=${
        wcAwardAuthorization.wc_award_authorization_id
      }`,
    );
    console.log(`amount_wc=${wcAwardAuthorization.award.amount_wc}`);
    console.log(
      `wc_account_id=${wcAwardAuthorization.beneficiary.wc_account_id}`,
    );
    console.log(
      "VOID_AGENT_PAID_WORK_WC_AWARD_AUTHORIZATION_ENVELOPE_V1_VALID",
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
