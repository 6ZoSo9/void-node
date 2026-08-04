import { readFileSync } from "node:fs";

import {
  hashDualSourceQuoteReducerDocumentV1,
  reduceDualSourceQuoteConservativelyV1,
} from "../src/external_opportunity/dual_source_quote_conservative_reducer_v1.js";
import { createDualSourceQuoteVerificationEnvelopeV1 } from "../src/external_opportunity/dual_source_quote_conservative_reducer_verification_envelope_v1.js";
import {
  createDualSourceQuoteRelativeFreshnessGateReceiptV1,
  verifyDualSourceQuoteRelativeFreshnessGateReceiptAgainstInputV1,
} from "../src/external_opportunity/dual_source_quote_relative_freshness_gate_v1.js";

const PROOF_MARKER =
  "VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_RELATIVE_FRESHNESS_GATE_V1_PROOF_GREEN";

type RecordValue = Record<string, unknown>;

function hold(message: string): never {
  throw new Error(`HOLD: ${message}`);
}

function record(value: unknown, label: string): RecordValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    hold(`${label} must be an object`);
  }
  return value as RecordValue;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectHold(label: string, action: () => unknown): void {
  try {
    action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.startsWith("HOLD:")) {
      throw new Error(`${label} failed without HOLD: ${message}`);
    }
    return;
  }
  throw new Error(`${label} did not fail closed`);
}

const input = JSON.parse(
  readFileSync(
    new URL(
      "../fixtures/external-opportunity/dual-source-quote-conservative-reducer-v1.example.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as unknown;

const schema = record(
  JSON.parse(
    readFileSync(
      new URL(
        "../schemas/external-opportunity-dual-source-quote-relative-freshness-gate-receipt-v1.schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as unknown,
  "relative freshness receipt schema",
);
if (
  schema.$id !==
  "urn:void:schema:external-opportunity-dual-source-quote-relative-freshness-gate-receipt:1"
) {
  hold("relative freshness receipt schema ID differs");
}
if (schema.additionalProperties !== false) {
  hold("relative freshness receipt schema must be closed");
}

const reducerReceipt = reduceDualSourceQuoteConservativelyV1(input);
const verificationEnvelope = createDualSourceQuoteVerificationEnvelopeV1(
  input,
  reducerReceipt,
);
const freshnessReceipt = createDualSourceQuoteRelativeFreshnessGateReceiptV1(
  input,
  reducerReceipt,
  verificationEnvelope,
  15,
);
const verified = verifyDualSourceQuoteRelativeFreshnessGateReceiptAgainstInputV1(
  input,
  reducerReceipt,
  verificationEnvelope,
  15,
  freshnessReceipt,
);

if (!Object.isFrozen(freshnessReceipt) || !Object.isFrozen(verified)) {
  hold("relative freshness receipts must be frozen");
}
if (
  verified.source_input_sha256 !== reducerReceipt.source_input_sha256 ||
  verified.reducer_receipt_sha256 !== reducerReceipt.receipt_sha256 ||
  verified.derivation_verification_sha256 !== verificationEnvelope.verification_sha256
) {
  hold("relative freshness evidence bindings differ");
}
if (
  verified.maximum_quote_age_seconds !== 15 ||
  verified.maximum_observed_quote_age_seconds !== 10 ||
  verified.source_quote_ages[0].age_seconds !== 10 ||
  verified.source_quote_ages[1].age_seconds !== 9
) {
  hold("relative quote ages differ");
}
if (
  verified.relative_freshness_verified !== true ||
  verified.evaluation_clock_authenticated !== false ||
  verified.wall_clock_freshness_verified !== false ||
  verified.source_identity_authenticated !== false
) {
  hold("relative freshness evidence honesty differs");
}
if (
  verified.network_access_performed !== false ||
  verified.credential_access_performed !== false ||
  verified.wallet_or_key_access_performed !== false ||
  verified.transaction_submission_performed !== false ||
  verified.fund_movement_performed !== false ||
  verified.execution_authorized !== false
) {
  hold("relative freshness authority boundary widened");
}

expectHold("policy tighter than quote age", () =>
  createDualSourceQuoteRelativeFreshnessGateReceiptV1(
    input,
    reducerReceipt,
    verificationEnvelope,
    9,
  ),
);

const staleInput = clone(input) as RecordValue;
const staleQuotes = staleInput.quotes;
if (!Array.isArray(staleQuotes) || staleQuotes.length !== 2) {
  hold("fixture quotes differ");
}
record(staleQuotes[0], "stale quote 0").observed_at = "2026-08-04T03:59:00.000Z";
record(staleQuotes[1], "stale quote 1").observed_at = "2026-08-04T03:59:01.000Z";
const staleReducerReceipt = reduceDualSourceQuoteConservativelyV1(staleInput);
const staleVerificationEnvelope = createDualSourceQuoteVerificationEnvelopeV1(
  staleInput,
  staleReducerReceipt,
);
expectHold("long-expiry stale observations", () =>
  createDualSourceQuoteRelativeFreshnessGateReceiptV1(
    staleInput,
    staleReducerReceipt,
    staleVerificationEnvelope,
    15,
  ),
);

const forgedFreshness = clone(freshnessReceipt) as RecordValue;
const forgedAges = forgedFreshness.source_quote_ages;
if (!Array.isArray(forgedAges) || forgedAges.length !== 2) {
  hold("forged source quote ages differ");
}
record(forgedAges[0], "forged quote age 0").age_seconds = 1;
record(forgedAges[1], "forged quote age 1").age_seconds = 1;
forgedFreshness.maximum_observed_quote_age_seconds = 1;
const forgedUnsigned = { ...forgedFreshness };
delete forgedUnsigned.freshness_sha256;
forgedFreshness.freshness_sha256 = hashDualSourceQuoteReducerDocumentV1(forgedUnsigned);
expectHold("self-consistent freshness forgery", () =>
  verifyDualSourceQuoteRelativeFreshnessGateReceiptAgainstInputV1(
    input,
    reducerReceipt,
    verificationEnvelope,
    15,
    forgedFreshness,
  ),
);

const wrongEnvelope = clone(verificationEnvelope) as RecordValue;
wrongEnvelope.verification_sha256 = "0".repeat(64);
expectHold("wrong derivation envelope", () =>
  createDualSourceQuoteRelativeFreshnessGateReceiptV1(
    input,
    reducerReceipt,
    wrongEnvelope,
    15,
  ),
);

console.log(`source_input_sha256=${verified.source_input_sha256}`);
console.log(`reducer_receipt_sha256=${verified.reducer_receipt_sha256}`);
console.log(`derivation_verification_sha256=${verified.derivation_verification_sha256}`);
console.log(`freshness_sha256=${verified.freshness_sha256}`);
console.log(`maximum_quote_age_seconds=${verified.maximum_quote_age_seconds}`);
console.log(`maximum_observed_quote_age_seconds=${verified.maximum_observed_quote_age_seconds}`);
console.log("relative_freshness_verified=true");
console.log("long_expiry_stale_observations_rejected=true");
console.log("self_consistent_freshness_forgery_rejected=true");
console.log("evaluation_clock_authenticated=false");
console.log("wall_clock_freshness_verified=false");
console.log("source_identity_authenticated=false");
console.log("network_access_performed=false");
console.log("credential_access_performed=false");
console.log("wallet_or_key_access_performed=false");
console.log("transaction_submission_performed=false");
console.log("fund_movement_performed=false");
console.log("execution_authorized=false");
console.log(PROOF_MARKER);
