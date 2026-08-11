import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  validateAgentPaidWorkWcAwardAuthorizationEnvelope,
  type AgentPaidWorkWcAwardAuthorizationEnvelope,
} from "./agent_paid_work_wc_award_authorization_envelope_v1.js";

export const AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_ENVELOPE_V1" as const;
export const AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_ID_PREFIX =
  "voidawwclwr1_" as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface AgentPaidWorkWcBalance {
  earned_wc: number;
  debited_wc: number;
  redeemable_wc: number;
}

export interface AgentPaidWorkWcLedgerWriteReceiptDraft {
  marker: typeof AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_MARKER;
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
  wc_award_authorization_id: string;
  receipt_created_at_utc: string;
  beneficiary: {
    executor_id: string;
    provider_id: string;
    wc_account_id: string;
  };
  award: {
    denomination: "WC";
    amount_wc: number;
    award_reason_code: string;
    award_policy_id: string;
    score_basis_sha256: string;
  };
  ledger_write: {
    ledger_write_id: string;
    ledger_id: string;
    ledger_entry_id: string;
    entry_type: "earn";
    status: "applied";
    authorization_consumed: true;
    authorization_consumed_at_utc: string;
    applied_at_utc: string;
    uniqueness_key: string;
    atomic_write_confirmed: true;
    uniqueness_key_enforced: true;
    prestate_matched: true;
    duplicate_detected: false;
  };
  state_transition: {
    expected_prestate_sha256: string;
    observed_prestate_sha256: string;
    poststate_sha256: string;
    ledger_sequence_before: number;
    ledger_sequence_after: number;
    pre_balance: AgentPaidWorkWcBalance;
    post_balance: AgentPaidWorkWcBalance;
  };
  receipt_evidence: {
    ledger_entry_sha256: string;
    append_log_sha256: string;
    authorization_verification_sha256: string;
    uniqueness_registry_sha256: string;
    balance_snapshot_sha256: string;
  };
  ledger_executor: {
    executor_id: string;
    execution_policy_id: string;
    signing_key_id: string;
    signature_scheme: "ed25519";
    signed_payload_sha256: string;
    signature_evidence_sha256: string;
  };
  attestation: {
    exact_wc_award_authorization_consumed_once: true;
    atomic_ledger_write_applied: true;
    single_ledger_entry_created: true;
    single_award_per_verification_enforced: true;
    beneficiary_binding_verified: true;
    award_amount_and_cap_verified: true;
    ledger_destination_verified: true;
    uniqueness_key_verified: true;
    expected_prestate_verified: true;
    poststate_verified: true;
    ledger_receipt_immutable: true;
    ledger_entry_immutable: true;
    wc_balance_mutation_recorded: true;
    wc_to_void_settlement_separate: true;
    payment_state_unchanged: true;
    wallet_or_signer_not_accessed: true;
    runtime_not_administered: true;
    buy_void_fulfillment_unchanged: true;
    receipt_is_not_wc_to_void_settlement: true;
    receipt_is_not_payment_instruction: true;
  };
  nonce: string;
}

export interface AgentPaidWorkWcLedgerWriteReceiptEnvelope
  extends AgentPaidWorkWcLedgerWriteReceiptDraft {
  wc_ledger_write_receipt_id: string;
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
  "wc_award_authorization_id",
  "receipt_created_at_utc",
  "beneficiary",
  "award",
  "ledger_write",
  "state_transition",
  "receipt_evidence",
  "ledger_executor",
  "attestation",
  "nonce",
] as const;

const ATTESTATION_TRUE_KEYS = [
  "exact_wc_award_authorization_consumed_once",
  "atomic_ledger_write_applied",
  "single_ledger_entry_created",
  "single_award_per_verification_enforced",
  "beneficiary_binding_verified",
  "award_amount_and_cap_verified",
  "ledger_destination_verified",
  "uniqueness_key_verified",
  "expected_prestate_verified",
  "poststate_verified",
  "ledger_receipt_immutable",
  "ledger_entry_immutable",
  "wc_balance_mutation_recorded",
  "wc_to_void_settlement_separate",
  "payment_state_unchanged",
  "wallet_or_signer_not_accessed",
  "runtime_not_administered",
  "buy_void_fulfillment_unchanged",
  "receipt_is_not_wc_to_void_settlement",
  "receipt_is_not_payment_instruction",
] as const;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,191}$/;
const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const LOWER_CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{2,127}$/;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const MAX_SAFE_WC = Number.MAX_SAFE_INTEGER;

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

function validateBalance(
  value: unknown,
  label: string,
): AgentPaidWorkWcBalance {
  const record = requireRecord(value, label);
  requireExactKeys(record, label, [
    "earned_wc",
    "debited_wc",
    "redeemable_wc",
  ]);

  const earned = requireSafeInteger(
    record.earned_wc,
    `${label}.earned_wc`,
    0,
    MAX_SAFE_WC,
  );
  const debited = requireSafeInteger(
    record.debited_wc,
    `${label}.debited_wc`,
    0,
    MAX_SAFE_WC,
  );
  const redeemable = requireSafeInteger(
    record.redeemable_wc,
    `${label}.redeemable_wc`,
    0,
    MAX_SAFE_WC,
  );

  assertCondition(
    debited <= earned,
    `${label}.debited_wc cannot exceed earned_wc`,
  );
  assertCondition(
    redeemable === earned - debited,
    `${label}.redeemable_wc must equal earned_wc minus debited_wc`,
  );

  return {
    earned_wc: earned,
    debited_wc: debited,
    redeemable_wc: redeemable,
  };
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
): AgentPaidWorkWcLedgerWriteReceiptDraft {
  const root = requireRecord(value, "WC ledger-write receipt");
  requireExactKeys(
    root,
    "WC ledger-write receipt",
    [
      ...ROOT_KEYS,
      ...(allowId ? ["wc_ledger_write_receipt_id"] : []),
    ],
  );

  assertCondition(
    root.marker === AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_MARKER,
    `marker must be ${AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_MARKER}`,
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
  const wcAwardAuthorizationId = requireString(
    root.wc_award_authorization_id,
    "wc_award_authorization_id",
    76,
    76,
    /^voidawwcaa1_[0-9a-f]{64}$/,
  );
  const receiptCreatedAtUtc = requireString(
    root.receipt_created_at_utc,
    "receipt_created_at_utc",
    20,
    20,
  );
  parseUtcSeconds(receiptCreatedAtUtc, "receipt_created_at_utc");

  const beneficiary = requireRecord(root.beneficiary, "beneficiary");
  requireExactKeys(beneficiary, "beneficiary", [
    "executor_id",
    "provider_id",
    "wc_account_id",
  ]);
  const beneficiaryExecutorId = requireString(
    beneficiary.executor_id,
    "beneficiary.executor_id",
    3,
    192,
    ID_PATTERN,
  );
  const beneficiaryProviderId = requireString(
    beneficiary.provider_id,
    "beneficiary.provider_id",
    3,
    192,
    ID_PATTERN,
  );
  const beneficiaryAccountId = requireString(
    beneficiary.wc_account_id,
    "beneficiary.wc_account_id",
    3,
    128,
    ACCOUNT_ID_PATTERN,
  );

  const award = requireRecord(root.award, "award");
  requireExactKeys(award, "award", [
    "denomination",
    "amount_wc",
    "award_reason_code",
    "award_policy_id",
    "score_basis_sha256",
  ]);
  assertCondition(award.denomination === "WC", "award.denomination must be WC");
  const amountWc = requireSafeInteger(
    award.amount_wc,
    "award.amount_wc",
    1,
    1000000000,
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
    192,
    ID_PATTERN,
  );
  const scoreBasisSha256 = requireString(
    award.score_basis_sha256,
    "award.score_basis_sha256",
    71,
    71,
    SHA256_PATTERN,
  );

  const ledgerWrite = requireRecord(root.ledger_write, "ledger_write");
  requireExactKeys(ledgerWrite, "ledger_write", [
    "ledger_write_id",
    "ledger_id",
    "ledger_entry_id",
    "entry_type",
    "status",
    "authorization_consumed",
    "authorization_consumed_at_utc",
    "applied_at_utc",
    "uniqueness_key",
    "atomic_write_confirmed",
    "uniqueness_key_enforced",
    "prestate_matched",
    "duplicate_detected",
  ]);
  const ledgerWriteId = requireString(
    ledgerWrite.ledger_write_id,
    "ledger_write.ledger_write_id",
    3,
    192,
    ID_PATTERN,
  );
  const ledgerId = requireString(
    ledgerWrite.ledger_id,
    "ledger_write.ledger_id",
    3,
    192,
    ID_PATTERN,
  );
  const ledgerEntryId = requireString(
    ledgerWrite.ledger_entry_id,
    "ledger_write.ledger_entry_id",
    3,
    192,
    ID_PATTERN,
  );
  assertCondition(
    ledgerWrite.entry_type === "earn",
    "ledger_write.entry_type must be earn",
  );
  assertCondition(
    ledgerWrite.status === "applied",
    "ledger_write.status must be applied",
  );
  requireBooleanLiteral(
    ledgerWrite.authorization_consumed,
    "ledger_write.authorization_consumed",
    true,
  );
  const authorizationConsumedAtUtc = requireString(
    ledgerWrite.authorization_consumed_at_utc,
    "ledger_write.authorization_consumed_at_utc",
    20,
    20,
  );
  const appliedAtUtc = requireString(
    ledgerWrite.applied_at_utc,
    "ledger_write.applied_at_utc",
    20,
    20,
  );
  parseUtcSeconds(
    authorizationConsumedAtUtc,
    "ledger_write.authorization_consumed_at_utc",
  );
  parseUtcSeconds(appliedAtUtc, "ledger_write.applied_at_utc");
  const uniquenessKey = requireString(
    ledgerWrite.uniqueness_key,
    "ledger_write.uniqueness_key",
    98,
    98,
    /^paid-work-verification:voidawicv1_[0-9a-f]{64}$/,
  );
  requireBooleanLiteral(
    ledgerWrite.atomic_write_confirmed,
    "ledger_write.atomic_write_confirmed",
    true,
  );
  requireBooleanLiteral(
    ledgerWrite.uniqueness_key_enforced,
    "ledger_write.uniqueness_key_enforced",
    true,
  );
  requireBooleanLiteral(
    ledgerWrite.prestate_matched,
    "ledger_write.prestate_matched",
    true,
  );
  requireBooleanLiteral(
    ledgerWrite.duplicate_detected,
    "ledger_write.duplicate_detected",
    false,
  );

  const transition = requireRecord(
    root.state_transition,
    "state_transition",
  );
  requireExactKeys(transition, "state_transition", [
    "expected_prestate_sha256",
    "observed_prestate_sha256",
    "poststate_sha256",
    "ledger_sequence_before",
    "ledger_sequence_after",
    "pre_balance",
    "post_balance",
  ]);
  const expectedPrestateSha256 = requireString(
    transition.expected_prestate_sha256,
    "state_transition.expected_prestate_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const observedPrestateSha256 = requireString(
    transition.observed_prestate_sha256,
    "state_transition.observed_prestate_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const poststateSha256 = requireString(
    transition.poststate_sha256,
    "state_transition.poststate_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const ledgerSequenceBefore = requireSafeInteger(
    transition.ledger_sequence_before,
    "state_transition.ledger_sequence_before",
    0,
    Number.MAX_SAFE_INTEGER - 1,
  );
  const ledgerSequenceAfter = requireSafeInteger(
    transition.ledger_sequence_after,
    "state_transition.ledger_sequence_after",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const preBalance = validateBalance(
    transition.pre_balance,
    "state_transition.pre_balance",
  );
  const postBalance = validateBalance(
    transition.post_balance,
    "state_transition.post_balance",
  );

  assertCondition(
    expectedPrestateSha256 === observedPrestateSha256,
    "expected and observed prestate commitments must match",
  );
  assertCondition(
    ledgerSequenceAfter === ledgerSequenceBefore + 1,
    "ledger sequence must increase by exactly one",
  );
  assertCondition(
    postBalance.earned_wc === preBalance.earned_wc + amountWc,
    "post earned_wc must increase by exactly amount_wc",
  );
  assertCondition(
    postBalance.debited_wc === preBalance.debited_wc,
    "post debited_wc must remain unchanged for an earn entry",
  );
  assertCondition(
    postBalance.redeemable_wc === preBalance.redeemable_wc + amountWc,
    "post redeemable_wc must increase by exactly amount_wc",
  );

  const receiptEvidence = requireRecord(
    root.receipt_evidence,
    "receipt_evidence",
  );
  requireExactKeys(receiptEvidence, "receipt_evidence", [
    "ledger_entry_sha256",
    "append_log_sha256",
    "authorization_verification_sha256",
    "uniqueness_registry_sha256",
    "balance_snapshot_sha256",
  ]);
  const ledgerEntrySha256 = requireString(
    receiptEvidence.ledger_entry_sha256,
    "receipt_evidence.ledger_entry_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const appendLogSha256 = requireString(
    receiptEvidence.append_log_sha256,
    "receipt_evidence.append_log_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const authorizationVerificationSha256 = requireString(
    receiptEvidence.authorization_verification_sha256,
    "receipt_evidence.authorization_verification_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const uniquenessRegistrySha256 = requireString(
    receiptEvidence.uniqueness_registry_sha256,
    "receipt_evidence.uniqueness_registry_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const balanceSnapshotSha256 = requireString(
    receiptEvidence.balance_snapshot_sha256,
    "receipt_evidence.balance_snapshot_sha256",
    71,
    71,
    SHA256_PATTERN,
  );

  const ledgerExecutor = requireRecord(
    root.ledger_executor,
    "ledger_executor",
  );
  requireExactKeys(ledgerExecutor, "ledger_executor", [
    "executor_id",
    "execution_policy_id",
    "signing_key_id",
    "signature_scheme",
    "signed_payload_sha256",
    "signature_evidence_sha256",
  ]);
  const ledgerExecutorId = requireString(
    ledgerExecutor.executor_id,
    "ledger_executor.executor_id",
    3,
    192,
    ID_PATTERN,
  );
  const executionPolicyId = requireString(
    ledgerExecutor.execution_policy_id,
    "ledger_executor.execution_policy_id",
    3,
    192,
    ID_PATTERN,
  );
  const signingKeyId = requireString(
    ledgerExecutor.signing_key_id,
    "ledger_executor.signing_key_id",
    3,
    192,
    ID_PATTERN,
  );
  assertCondition(
    ledgerExecutor.signature_scheme === "ed25519",
    "ledger_executor.signature_scheme must be ed25519",
  );
  const signedPayloadSha256 = requireString(
    ledgerExecutor.signed_payload_sha256,
    "ledger_executor.signed_payload_sha256",
    71,
    71,
    SHA256_PATTERN,
  );
  const signatureEvidenceSha256 = requireString(
    ledgerExecutor.signature_evidence_sha256,
    "ledger_executor.signature_evidence_sha256",
    71,
    71,
    SHA256_PATTERN,
  );

  assertCondition(
    ledgerExecutorId !== beneficiaryAccountId,
    "ledger executor must be distinct from beneficiary WC account",
  );

  const attestation = requireRecord(root.attestation, "attestation");
  requireExactKeys(
    attestation,
    "attestation",
    ATTESTATION_TRUE_KEYS,
  );
  for (const key of ATTESTATION_TRUE_KEYS) {
    requireBooleanLiteral(
      attestation[key],
      `attestation.${key}`,
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
    marker: AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_MARKER,
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
    wc_award_authorization_id: wcAwardAuthorizationId,
    receipt_created_at_utc: receiptCreatedAtUtc,
    beneficiary: {
      executor_id: beneficiaryExecutorId,
      provider_id: beneficiaryProviderId,
      wc_account_id: beneficiaryAccountId,
    },
    award: {
      denomination: "WC",
      amount_wc: amountWc,
      award_reason_code: awardReasonCode,
      award_policy_id: awardPolicyId,
      score_basis_sha256: scoreBasisSha256,
    },
    ledger_write: {
      ledger_write_id: ledgerWriteId,
      ledger_id: ledgerId,
      ledger_entry_id: ledgerEntryId,
      entry_type: "earn",
      status: "applied",
      authorization_consumed: true,
      authorization_consumed_at_utc: authorizationConsumedAtUtc,
      applied_at_utc: appliedAtUtc,
      uniqueness_key: uniquenessKey,
      atomic_write_confirmed: true,
      uniqueness_key_enforced: true,
      prestate_matched: true,
      duplicate_detected: false,
    },
    state_transition: {
      expected_prestate_sha256: expectedPrestateSha256,
      observed_prestate_sha256: observedPrestateSha256,
      poststate_sha256: poststateSha256,
      ledger_sequence_before: ledgerSequenceBefore,
      ledger_sequence_after: ledgerSequenceAfter,
      pre_balance: preBalance,
      post_balance: postBalance,
    },
    receipt_evidence: {
      ledger_entry_sha256: ledgerEntrySha256,
      append_log_sha256: appendLogSha256,
      authorization_verification_sha256:
        authorizationVerificationSha256,
      uniqueness_registry_sha256: uniquenessRegistrySha256,
      balance_snapshot_sha256: balanceSnapshotSha256,
    },
    ledger_executor: {
      executor_id: ledgerExecutorId,
      execution_policy_id: executionPolicyId,
      signing_key_id: signingKeyId,
      signature_scheme: "ed25519",
      signed_payload_sha256: signedPayloadSha256,
      signature_evidence_sha256: signatureEvidenceSha256,
    },
    attestation: {
      exact_wc_award_authorization_consumed_once: true,
      atomic_ledger_write_applied: true,
      single_ledger_entry_created: true,
      single_award_per_verification_enforced: true,
      beneficiary_binding_verified: true,
      award_amount_and_cap_verified: true,
      ledger_destination_verified: true,
      uniqueness_key_verified: true,
      expected_prestate_verified: true,
      poststate_verified: true,
      ledger_receipt_immutable: true,
      ledger_entry_immutable: true,
      wc_balance_mutation_recorded: true,
      wc_to_void_settlement_separate: true,
      payment_state_unchanged: true,
      wallet_or_signer_not_accessed: true,
      runtime_not_administered: true,
      buy_void_fulfillment_unchanged: true,
      receipt_is_not_wc_to_void_settlement: true,
      receipt_is_not_payment_instruction: true,
    },
    nonce,
  };
}

function validateBindings(
  authorization: AgentPaidWorkWcAwardAuthorizationEnvelope,
  receipt: AgentPaidWorkWcLedgerWriteReceiptDraft,
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
    "independent_completion_verification_id",
  ] as const) {
    assertCondition(
      receipt[key] === authorization[key],
      `${key} mismatch`,
    );
  }

  assertCondition(
    receipt.wc_award_authorization_id ===
      authorization.wc_award_authorization_id,
    "wc_award_authorization_id mismatch",
  );
  assertCondition(
    receipt.beneficiary.executor_id ===
      authorization.beneficiary.executor_id,
    "beneficiary.executor_id mismatch",
  );
  assertCondition(
    receipt.beneficiary.provider_id ===
      authorization.beneficiary.provider_id,
    "beneficiary.provider_id mismatch",
  );
  assertCondition(
    receipt.beneficiary.wc_account_id ===
      authorization.beneficiary.wc_account_id,
    "beneficiary.wc_account_id mismatch",
  );
  assertCondition(
    receipt.ledger_write.ledger_id ===
      authorization.ledger_target.ledger_id,
    "ledger_write.ledger_id mismatch",
  );
  assertCondition(
    receipt.ledger_write.uniqueness_key ===
      authorization.ledger_target.uniqueness_key,
    "ledger_write.uniqueness_key mismatch",
  );
  assertCondition(
    receipt.award.amount_wc === authorization.award.amount_wc,
    "award.amount_wc mismatch",
  );
  assertCondition(
    receipt.award.denomination === authorization.award.denomination,
    "award.denomination mismatch",
  );
  assertCondition(
    receipt.award.award_reason_code ===
      authorization.award.award_reason_code,
    "award.award_reason_code mismatch",
  );
  assertCondition(
    receipt.award.award_policy_id ===
      authorization.award.award_policy_id,
    "award.award_policy_id mismatch",
  );
  assertCondition(
    receipt.award.score_basis_sha256 ===
      authorization.award.score_basis_sha256,
    "award.score_basis_sha256 mismatch",
  );
  assertCondition(
    receipt.state_transition.expected_prestate_sha256 ===
      authorization.ledger_target.expected_prestate_sha256,
    "expected_prestate_sha256 mismatch",
  );

  const authorizedAt = parseUtcSeconds(
    authorization.authorized_at_utc,
    "award authorization authorized_at_utc",
  );
  const expiresAt = parseUtcSeconds(
    authorization.expires_at_utc,
    "award authorization expires_at_utc",
  );
  const consumedAt = parseUtcSeconds(
    receipt.ledger_write.authorization_consumed_at_utc,
    "receipt authorization_consumed_at_utc",
  );
  const appliedAt = parseUtcSeconds(
    receipt.ledger_write.applied_at_utc,
    "receipt applied_at_utc",
  );
  const receiptCreatedAt = parseUtcSeconds(
    receipt.receipt_created_at_utc,
    "receipt receipt_created_at_utc",
  );

  assertCondition(
    consumedAt >= authorizedAt,
    "authorization consumption predates authorization creation",
  );
  assertCondition(
    consumedAt <= expiresAt,
    "authorization consumption occurred after expiration",
  );
  assertCondition(
    appliedAt >= consumedAt,
    "ledger application predates authorization consumption",
  );
  assertCondition(
    receiptCreatedAt >= appliedAt,
    "receipt creation predates ledger application",
  );

  assertCondition(
    authorization.authorization.atomic_ledger_write_required === true,
    "award authorization must require atomic ledger execution",
  );
  assertCondition(
    authorization.authorization.single_award_per_verification_required ===
      true,
    "award authorization must require one award per verification",
  );
  assertCondition(
    authorization.authorization.ledger_receipt_required === true,
    "award authorization must require a ledger receipt",
  );
  assertCondition(
    authorization.authorization.ledger_write_is_separate_execution === true,
    "award authorization must preserve separate ledger execution",
  );
  assertCondition(
    authorization.authorization.wc_to_void_settlement_separate === true,
    "award authorization must preserve separate WC-to-VOID settlement",
  );
  assertCondition(
    authorization.authorization.authorization_is_not_ledger_write === true,
    "award authorization must not itself be a ledger write",
  );
}

export function computeAgentPaidWorkWcLedgerWriteReceiptId(
  draft: AgentPaidWorkWcLedgerWriteReceiptDraft,
): string {
  const digest = createHash("sha256")
    .update(canonicalJson(draft))
    .digest("hex");
  return `${AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_ID_PREFIX}${digest}`;
}

export function validateAgentPaidWorkWcLedgerWriteReceiptDraft(
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
  receiptValue: unknown,
): asserts receiptValue is AgentPaidWorkWcLedgerWriteReceiptDraft {
  validateAgentPaidWorkWcAwardAuthorizationEnvelope(
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
    wcAwardAuthorizationValue,
  );

  const authorization =
    wcAwardAuthorizationValue as AgentPaidWorkWcAwardAuthorizationEnvelope;
  const receipt = validateDraftShape(receiptValue, false);
  validateBindings(authorization, receipt);
}

export function materializeAgentPaidWorkWcLedgerWriteReceipt(
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
  receiptValue: unknown,
): AgentPaidWorkWcLedgerWriteReceiptEnvelope {
  validateAgentPaidWorkWcAwardAuthorizationEnvelope(
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
    wcAwardAuthorizationValue,
  );

  const authorization =
    wcAwardAuthorizationValue as AgentPaidWorkWcAwardAuthorizationEnvelope;
  const draft = validateDraftShape(receiptValue, false);
  validateBindings(authorization, draft);

  return {
    ...draft,
    wc_ledger_write_receipt_id:
      computeAgentPaidWorkWcLedgerWriteReceiptId(draft),
  };
}

export function validateAgentPaidWorkWcLedgerWriteReceiptEnvelope(
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
  receiptValue: unknown,
): asserts receiptValue is AgentPaidWorkWcLedgerWriteReceiptEnvelope {
  validateAgentPaidWorkWcAwardAuthorizationEnvelope(
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
    wcAwardAuthorizationValue,
  );

  const authorization =
    wcAwardAuthorizationValue as AgentPaidWorkWcAwardAuthorizationEnvelope;
  const root = requireRecord(
    receiptValue,
    "WC ledger-write receipt envelope",
  );
  const draft = validateDraftShape(receiptValue, true);
  validateBindings(authorization, draft);

  const receiptId = requireString(
    root.wc_ledger_write_receipt_id,
    "wc_ledger_write_receipt_id",
    77,
    77,
    /^voidawwclwr1_[0-9a-f]{64}$/,
  );
  assertCondition(
    receiptId === computeAgentPaidWorkWcLedgerWriteReceiptId(draft),
    "wc_ledger_write_receipt_id does not match canonical payload",
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function usage(): never {
  return fail([
    "usage:",
    "  tsx scripts/agent_paid_work_wc_ledger_write_receipt_envelope_v1.ts materialize <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <payment-execution-authorization.json> <payment-receipt.json> <payment-confirmation.json> <work-execution-authorization.json> <completion-receipt.json> <independent-completion-verification.json> <wc-award-authorization.json> <wc-ledger-receipt-draft.json> <wc-ledger-receipt-envelope.json>",
    "  tsx scripts/agent_paid_work_wc_ledger_write_receipt_envelope_v1.ts verify <work-order.json> <quote.json> <acceptance.json> <payment-intent.json> <payment-execution-authorization.json> <payment-receipt.json> <payment-confirmation.json> <work-execution-authorization.json> <completion-receipt.json> <independent-completion-verification.json> <wc-award-authorization.json> <wc-ledger-receipt-envelope.json>",
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
    receiptPath,
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
      wcAwardAuthorizationPath &&
      receiptPath
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
  const wcAwardAuthorization = readJson(resolve(wcAwardAuthorizationPath));
  const receipt = readJson(resolve(receiptPath));

  if (mode === "materialize") {
    assertCondition(Boolean(outputPath), "materialize requires output path");
    const output = resolve(outputPath);
    assertCondition(
      !existsSync(output),
      "refusing to overwrite an existing WC ledger-write receipt",
    );
    const envelope = materializeAgentPaidWorkWcLedgerWriteReceipt(
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
      receipt,
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
      `wc_ledger_write_receipt_id=${envelope.wc_ledger_write_receipt_id}`,
    );
    console.log(`output=${output}`);
    console.log(
      "VOID_AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_ENVELOPE_V1_MATERIALIZED",
    );
    return;
  }

  if (mode === "verify") {
    assertCondition(
      outputPath === undefined,
      "verify does not accept an output path",
    );
    validateAgentPaidWorkWcLedgerWriteReceiptEnvelope(
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
      receipt,
    );
    console.log(`marker=${receipt.marker}`);
    console.log(
      `wc_award_authorization_id=${receipt.wc_award_authorization_id}`,
    );
    console.log(
      `wc_ledger_write_receipt_id=${receipt.wc_ledger_write_receipt_id}`,
    );
    console.log(`ledger_entry_id=${receipt.ledger_write.ledger_entry_id}`);
    console.log(`amount_wc=${receipt.award.amount_wc}`);
    console.log(
      `post_redeemable_wc=${receipt.state_transition.post_balance.redeemable_wc}`,
    );
    console.log(
      "VOID_AGENT_PAID_WORK_WC_LEDGER_WRITE_RECEIPT_ENVELOPE_V1_VALID",
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
