import {
  canonicalDualSourceQuoteReducerJsonV1,
  hashDualSourceQuoteReducerDocumentV1,
  type DualSourceQuoteConservativeReducerReceiptV1,
} from "./dual_source_quote_conservative_reducer_v1.js";
import { verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1 } from "./dual_source_quote_conservative_reducer_input_bound_verifier_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_V1" as const;
export const VOID_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_SCHEMA_V1 =
  "void-dual-source-quote-verification-envelope-v1" as const;

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

type RecordValue = Record<string, unknown>;

export type DualSourceQuoteVerificationEnvelopeV1 = Readonly<{
  schema: typeof VOID_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_V1;
  phase: "paper_verification";
  reduction_id: string;
  source_input_sha256: string;
  reducer_receipt_sha256: string;
  receipt_integrity_verified: true;
  receipt_derivation_verified: true;
  conservative_derivation_recomputed: true;
  source_identity_authenticated: false;
  network_access_performed: false;
  credential_access_performed: false;
  raw_response_retention: false;
  transaction_payload_retention: false;
  network_mutation_performed: false;
  wallet_or_key_access_performed: false;
  transaction_construction_performed: false;
  transaction_signing_performed: false;
  transaction_submission_performed: false;
  fund_movement_performed: false;
  live_execution_authorized: false;
  execution_authorized: false;
  verification_sha256: string;
}>;

function hold(message: string): never {
  throw new Error(`HOLD: ${message}`);
}

function record(value: unknown, label: string): RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    hold(`${label} must be an object`);
  }
  return value as RecordValue;
}

function exactKeys(value: RecordValue, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    hold(`${label} keys differ`);
  }
}

function boundedString(value: unknown, label: string, maximumLength: number): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximumLength ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    hold(`${label} must be a bounded printable string`);
  }
  return value;
}

function sha256(value: unknown, label: string): string {
  const text = boundedString(value, label, 64);
  if (!SHA256_HEX_PATTERN.test(text)) hold(`${label} must be lowercase SHA-256 hex`);
  return text;
}

function envelopeWithoutHash(
  envelope: DualSourceQuoteVerificationEnvelopeV1,
): Omit<DualSourceQuoteVerificationEnvelopeV1, "verification_sha256"> {
  const { verification_sha256: _verificationSha256, ...unsigned } = envelope;
  return unsigned;
}

function parseVerificationEnvelopeV1(value: unknown): DualSourceQuoteVerificationEnvelopeV1 {
  const source = record(value, "dual-source quote verification envelope");
  exactKeys(
    source,
    [
      "schema",
      "marker",
      "phase",
      "reduction_id",
      "source_input_sha256",
      "reducer_receipt_sha256",
      "receipt_integrity_verified",
      "receipt_derivation_verified",
      "conservative_derivation_recomputed",
      "source_identity_authenticated",
      "network_access_performed",
      "credential_access_performed",
      "raw_response_retention",
      "transaction_payload_retention",
      "network_mutation_performed",
      "wallet_or_key_access_performed",
      "transaction_construction_performed",
      "transaction_signing_performed",
      "transaction_submission_performed",
      "fund_movement_performed",
      "live_execution_authorized",
      "execution_authorized",
      "verification_sha256",
    ],
    "dual-source quote verification envelope",
  );

  if (source.schema !== VOID_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_SCHEMA_V1) {
    hold("verification envelope schema differs");
  }
  if (source.marker !== VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_V1) {
    hold("verification envelope marker differs");
  }
  if (source.phase !== "paper_verification") hold("verification envelope phase differs");

  const expectedBooleans = Object.freeze({
    receipt_integrity_verified: true,
    receipt_derivation_verified: true,
    conservative_derivation_recomputed: true,
    source_identity_authenticated: false,
    network_access_performed: false,
    credential_access_performed: false,
    raw_response_retention: false,
    transaction_payload_retention: false,
    network_mutation_performed: false,
    wallet_or_key_access_performed: false,
    transaction_construction_performed: false,
    transaction_signing_performed: false,
    transaction_submission_performed: false,
    fund_movement_performed: false,
    live_execution_authorized: false,
    execution_authorized: false,
  });
  for (const [key, expected] of Object.entries(expectedBooleans)) {
    if (source[key] !== expected) hold(`verification envelope ${key} differs`);
  }

  const parsed: DualSourceQuoteVerificationEnvelopeV1 = Object.freeze({
    schema: VOID_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_V1,
    phase: "paper_verification",
    reduction_id: boundedString(source.reduction_id, "verification envelope reduction_id", 128),
    source_input_sha256: sha256(
      source.source_input_sha256,
      "verification envelope source_input_sha256",
    ),
    reducer_receipt_sha256: sha256(
      source.reducer_receipt_sha256,
      "verification envelope reducer_receipt_sha256",
    ),
    receipt_integrity_verified: true,
    receipt_derivation_verified: true,
    conservative_derivation_recomputed: true,
    source_identity_authenticated: false,
    network_access_performed: false,
    credential_access_performed: false,
    raw_response_retention: false,
    transaction_payload_retention: false,
    network_mutation_performed: false,
    wallet_or_key_access_performed: false,
    transaction_construction_performed: false,
    transaction_signing_performed: false,
    transaction_submission_performed: false,
    fund_movement_performed: false,
    live_execution_authorized: false,
    execution_authorized: false,
    verification_sha256: sha256(
      source.verification_sha256,
      "verification envelope verification_sha256",
    ),
  });

  if (
    hashDualSourceQuoteReducerDocumentV1(envelopeWithoutHash(parsed)) !==
    parsed.verification_sha256
  ) {
    hold("verification envelope SHA-256 verification failed");
  }
  return parsed;
}

export function createDualSourceQuoteVerificationEnvelopeV1(
  input: unknown,
  receipt: unknown,
): DualSourceQuoteVerificationEnvelopeV1 {
  const verified: DualSourceQuoteConservativeReducerReceiptV1 =
    verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1(input, receipt);

  const unsigned = Object.freeze({
    schema: VOID_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_V1,
    phase: "paper_verification" as const,
    reduction_id: verified.reduction_id,
    source_input_sha256: verified.source_input_sha256,
    reducer_receipt_sha256: verified.receipt_sha256,
    receipt_integrity_verified: true as const,
    receipt_derivation_verified: true as const,
    conservative_derivation_recomputed: true as const,
    source_identity_authenticated: false as const,
    network_access_performed: false as const,
    credential_access_performed: false as const,
    raw_response_retention: false as const,
    transaction_payload_retention: false as const,
    network_mutation_performed: false as const,
    wallet_or_key_access_performed: false as const,
    transaction_construction_performed: false as const,
    transaction_signing_performed: false as const,
    transaction_submission_performed: false as const,
    fund_movement_performed: false as const,
    live_execution_authorized: false as const,
    execution_authorized: false as const,
  });

  return Object.freeze({
    ...unsigned,
    verification_sha256: hashDualSourceQuoteReducerDocumentV1(unsigned),
  });
}

export function verifyDualSourceQuoteVerificationEnvelopeAgainstInputV1(
  input: unknown,
  receipt: unknown,
  envelope: unknown,
): DualSourceQuoteVerificationEnvelopeV1 {
  const parsed = parseVerificationEnvelopeV1(envelope);
  const expected = createDualSourceQuoteVerificationEnvelopeV1(input, receipt);
  if (
    canonicalDualSourceQuoteReducerJsonV1(parsed) !==
    canonicalDualSourceQuoteReducerJsonV1(expected)
  ) {
    hold("verification envelope does not match supplied input and receipt");
  }
  return parsed;
}
