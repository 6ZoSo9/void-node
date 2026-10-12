import {
  canonicalDualSourceQuoteReducerJsonV1,
  hashDualSourceQuoteReducerDocumentV1,
  type DualSourceQuoteConservativeReducerReceiptV1,
} from "./dual_source_quote_conservative_reducer_v1.js";
import { verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1 } from "./dual_source_quote_conservative_reducer_input_bound_verifier_v1.js";
import {
  verifyDualSourceQuoteVerificationEnvelopeAgainstInputV1,
  type DualSourceQuoteVerificationEnvelopeV1,
} from "./dual_source_quote_conservative_reducer_verification_envelope_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_V1" as const;
export const VOID_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_RECEIPT_SCHEMA_V1 =
  "void-dual-source-quote-relative-freshness-gate-receipt-v1" as const;

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

type RecordValue = Record<string, unknown>;

type RelativeQuoteAgeV1 = Readonly<{
  provider: string;
  quote_id: string;
  age_seconds: number;
}>;

export type DualSourceQuoteRelativeFreshnessGateReceiptV1 = Readonly<{
  schema: typeof VOID_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_RECEIPT_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_V1;
  phase: "paper_relative_freshness_verification";
  reduction_id: string;
  source_input_sha256: string;
  reducer_receipt_sha256: string;
  derivation_verification_sha256: string;
  evaluated_at: string;
  maximum_quote_age_seconds: number;
  source_quote_ages: readonly [RelativeQuoteAgeV1, RelativeQuoteAgeV1];
  maximum_observed_quote_age_seconds: number;
  receipt_integrity_verified: true;
  receipt_derivation_verified: true;
  conservative_derivation_recomputed: true;
  relative_freshness_verified: true;
  evaluation_clock_authenticated: false;
  wall_clock_freshness_verified: false;
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
  freshness_sha256: string;
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

function safeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    hold(`${label} must be a safe integer in range`);
  }
  return value;
}

function canonicalInstant(value: unknown, label: string): string {
  const text = boundedString(value, label, 64);
  const milliseconds = Date.parse(text);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== text) {
    hold(`${label} must be a canonical UTC millisecond instant`);
  }
  return text;
}

function sha256(value: unknown, label: string): string {
  const text = boundedString(value, label, 64);
  if (!SHA256_HEX_PATTERN.test(text)) hold(`${label} must be lowercase SHA-256 hex`);
  return text;
}

function providerLabel(value: unknown, label: string): string {
  const text = boundedString(value, label, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(text)) {
    hold(`${label} contains unsupported characters`);
  }
  return text;
}

function freshnessWithoutHash(
  receipt: DualSourceQuoteRelativeFreshnessGateReceiptV1,
): Omit<DualSourceQuoteRelativeFreshnessGateReceiptV1, "freshness_sha256"> {
  const { freshness_sha256: _freshnessSha256, ...unsigned } = receipt;
  return unsigned;
}

function sourceQuoteAgeSeconds(
  input: unknown,
  reducerReceipt: DualSourceQuoteConservativeReducerReceiptV1,
): Readonly<{
  evaluated_at: string;
  ages: readonly [RelativeQuoteAgeV1, RelativeQuoteAgeV1];
}> {
  const source = record(input, "dual-source reducer input");
  const evaluatedAt = canonicalInstant(source.evaluated_at, "dual-source reducer input evaluated_at");
  const evaluatedMilliseconds = Date.parse(evaluatedAt);
  const quotes = source.quotes;
  if (!Array.isArray(quotes) || quotes.length !== 2) {
    hold("dual-source reducer input quotes differ after derivation verification");
  }

  const ages = reducerReceipt.source_quotes.map((boundSource, sourceIndex) => {
    const matches = quotes.filter((candidate: unknown) => {
      const quote = record(candidate, `dual-source reducer input quotes candidate`);
      return quote.provider === boundSource.provider && quote.quote_id === boundSource.quote_id;
    });
    if (matches.length !== 1) {
      hold(`source quote ${sourceIndex} is not uniquely bound to reducer input`);
    }
    const quote = record(matches[0], `dual-source reducer input quote ${sourceIndex}`);
    const observedAt = canonicalInstant(
      quote.observed_at,
      `dual-source reducer input quote ${sourceIndex} observed_at`,
    );
    const ageMilliseconds = evaluatedMilliseconds - Date.parse(observedAt);
    if (ageMilliseconds < 0) hold(`source quote ${sourceIndex} occurs after evaluation`);
    return Object.freeze({
      provider: providerLabel(boundSource.provider, `source quote ${sourceIndex} provider`),
      quote_id: boundedString(boundSource.quote_id, `source quote ${sourceIndex} quote_id`, 256),
      age_seconds: Math.ceil(ageMilliseconds / 1_000),
    });
  }) as [RelativeQuoteAgeV1, RelativeQuoteAgeV1];

  return Object.freeze({
    evaluated_at: evaluatedAt,
    ages: Object.freeze(ages),
  });
}

function parseRelativeFreshnessReceiptV1(
  value: unknown,
): DualSourceQuoteRelativeFreshnessGateReceiptV1 {
  const source = record(value, "dual-source quote relative freshness receipt");
  exactKeys(
    source,
    [
      "schema",
      "marker",
      "phase",
      "reduction_id",
      "source_input_sha256",
      "reducer_receipt_sha256",
      "derivation_verification_sha256",
      "evaluated_at",
      "maximum_quote_age_seconds",
      "source_quote_ages",
      "maximum_observed_quote_age_seconds",
      "receipt_integrity_verified",
      "receipt_derivation_verified",
      "conservative_derivation_recomputed",
      "relative_freshness_verified",
      "evaluation_clock_authenticated",
      "wall_clock_freshness_verified",
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
      "freshness_sha256",
    ],
    "dual-source quote relative freshness receipt",
  );

  if (source.schema !== VOID_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_RECEIPT_SCHEMA_V1) {
    hold("relative freshness receipt schema differs");
  }
  if (source.marker !== VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_V1) {
    hold("relative freshness receipt marker differs");
  }
  if (source.phase !== "paper_relative_freshness_verification") {
    hold("relative freshness receipt phase differs");
  }

  const expectedBooleans = Object.freeze({
    receipt_integrity_verified: true,
    receipt_derivation_verified: true,
    conservative_derivation_recomputed: true,
    relative_freshness_verified: true,
    evaluation_clock_authenticated: false,
    wall_clock_freshness_verified: false,
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
    if (source[key] !== expected) hold(`relative freshness receipt ${key} differs`);
  }

  if (!Array.isArray(source.source_quote_ages) || source.source_quote_ages.length !== 2) {
    hold("relative freshness receipt requires exactly two source quote ages");
  }
  const ages = source.source_quote_ages.map((entry, index) => {
    const age = record(entry, `relative freshness source_quote_ages[${index}]`);
    exactKeys(
      age,
      ["provider", "quote_id", "age_seconds"],
      `relative freshness source_quote_ages[${index}]`,
    );
    return Object.freeze({
      provider: providerLabel(age.provider, `relative freshness source_quote_ages[${index}].provider`),
      quote_id: boundedString(
        age.quote_id,
        `relative freshness source_quote_ages[${index}].quote_id`,
        256,
      ),
      age_seconds: safeInteger(
        age.age_seconds,
        `relative freshness source_quote_ages[${index}].age_seconds`,
        0,
        86_400,
      ),
    });
  }) as [RelativeQuoteAgeV1, RelativeQuoteAgeV1];

  const parsed: DualSourceQuoteRelativeFreshnessGateReceiptV1 = Object.freeze({
    schema: VOID_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_RECEIPT_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_V1,
    phase: "paper_relative_freshness_verification",
    reduction_id: boundedString(source.reduction_id, "relative freshness reduction_id", 128),
    source_input_sha256: sha256(source.source_input_sha256, "relative freshness source_input_sha256"),
    reducer_receipt_sha256: sha256(
      source.reducer_receipt_sha256,
      "relative freshness reducer_receipt_sha256",
    ),
    derivation_verification_sha256: sha256(
      source.derivation_verification_sha256,
      "relative freshness derivation_verification_sha256",
    ),
    evaluated_at: canonicalInstant(source.evaluated_at, "relative freshness evaluated_at"),
    maximum_quote_age_seconds: safeInteger(
      source.maximum_quote_age_seconds,
      "relative freshness maximum_quote_age_seconds",
      0,
      3_600,
    ),
    source_quote_ages: Object.freeze(ages),
    maximum_observed_quote_age_seconds: safeInteger(
      source.maximum_observed_quote_age_seconds,
      "relative freshness maximum_observed_quote_age_seconds",
      0,
      86_400,
    ),
    receipt_integrity_verified: true,
    receipt_derivation_verified: true,
    conservative_derivation_recomputed: true,
    relative_freshness_verified: true,
    evaluation_clock_authenticated: false,
    wall_clock_freshness_verified: false,
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
    freshness_sha256: sha256(source.freshness_sha256, "relative freshness freshness_sha256"),
  });

  const maximumAge = Math.max(...parsed.source_quote_ages.map((entry) => entry.age_seconds));
  if (parsed.maximum_observed_quote_age_seconds !== maximumAge) {
    hold("relative freshness maximum observed quote age differs");
  }
  if (maximumAge > parsed.maximum_quote_age_seconds) {
    hold("relative freshness receipt exceeds maximum quote age policy");
  }
  if (
    hashDualSourceQuoteReducerDocumentV1(freshnessWithoutHash(parsed)) !== parsed.freshness_sha256
  ) {
    hold("relative freshness receipt SHA-256 verification failed");
  }
  return parsed;
}

export function createDualSourceQuoteRelativeFreshnessGateReceiptV1(
  input: unknown,
  reducerReceipt: unknown,
  verificationEnvelope: unknown,
  maximumQuoteAgeSeconds: number,
): DualSourceQuoteRelativeFreshnessGateReceiptV1 {
  const maximumAgePolicy = safeInteger(
    maximumQuoteAgeSeconds,
    "maximumQuoteAgeSeconds",
    0,
    3_600,
  );
  const verifiedEnvelope: DualSourceQuoteVerificationEnvelopeV1 =
    verifyDualSourceQuoteVerificationEnvelopeAgainstInputV1(
      input,
      reducerReceipt,
      verificationEnvelope,
    );
  const verifiedReceipt = verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1(
    input,
    reducerReceipt,
  );
  const relativeAges = sourceQuoteAgeSeconds(input, verifiedReceipt);
  const maximumObservedAge = Math.max(...relativeAges.ages.map((entry) => entry.age_seconds));
  if (maximumObservedAge > maximumAgePolicy) {
    hold("source quote age exceeds maximum relative freshness policy");
  }

  const unsigned = Object.freeze({
    schema: VOID_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_RECEIPT_SCHEMA_V1,
    marker: VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_V1,
    phase: "paper_relative_freshness_verification" as const,
    reduction_id: verifiedReceipt.reduction_id,
    source_input_sha256: verifiedReceipt.source_input_sha256,
    reducer_receipt_sha256: verifiedReceipt.receipt_sha256,
    derivation_verification_sha256: verifiedEnvelope.verification_sha256,
    evaluated_at: relativeAges.evaluated_at,
    maximum_quote_age_seconds: maximumAgePolicy,
    source_quote_ages: relativeAges.ages,
    maximum_observed_quote_age_seconds: maximumObservedAge,
    receipt_integrity_verified: true as const,
    receipt_derivation_verified: true as const,
    conservative_derivation_recomputed: true as const,
    relative_freshness_verified: true as const,
    evaluation_clock_authenticated: false as const,
    wall_clock_freshness_verified: false as const,
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
    freshness_sha256: hashDualSourceQuoteReducerDocumentV1(unsigned),
  });
}

export function verifyDualSourceQuoteRelativeFreshnessGateReceiptAgainstInputV1(
  input: unknown,
  reducerReceipt: unknown,
  verificationEnvelope: unknown,
  maximumQuoteAgeSeconds: number,
  freshnessReceipt: unknown,
): DualSourceQuoteRelativeFreshnessGateReceiptV1 {
  const parsed = parseRelativeFreshnessReceiptV1(freshnessReceipt);
  const expected = createDualSourceQuoteRelativeFreshnessGateReceiptV1(
    input,
    reducerReceipt,
    verificationEnvelope,
    maximumQuoteAgeSeconds,
  );
  if (
    canonicalDualSourceQuoteReducerJsonV1(parsed) !==
    canonicalDualSourceQuoteReducerJsonV1(expected)
  ) {
    hold("relative freshness receipt does not match supplied evidence and policy");
  }
  return parsed;
}
