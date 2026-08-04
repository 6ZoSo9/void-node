import { readFileSync } from "node:fs";

import {
  hashDualSourceQuoteReducerDocumentV1,
  reduceDualSourceQuoteConservativelyV1,
} from "../src/external_opportunity/dual_source_quote_conservative_reducer_v1.js";
import {
  createDualSourceQuoteVerificationEnvelopeV1,
  verifyDualSourceQuoteVerificationEnvelopeAgainstInputV1,
} from "../src/external_opportunity/dual_source_quote_conservative_reducer_verification_envelope_v1.js";

const PROOF_MARKER =
  "VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_V1_PROOF_GREEN";

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
        "../schemas/external-opportunity-dual-source-quote-verification-envelope-v1.schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as unknown,
  "verification envelope schema",
);
if (
  schema.$id !==
  "urn:void:schema:external-opportunity-dual-source-quote-verification-envelope:1"
) {
  hold("verification envelope schema ID differs");
}
if (schema.additionalProperties !== false) {
  hold("verification envelope schema must be closed");
}

const receipt = reduceDualSourceQuoteConservativelyV1(input);
const envelope = createDualSourceQuoteVerificationEnvelopeV1(input, receipt);
const verified = verifyDualSourceQuoteVerificationEnvelopeAgainstInputV1(
  input,
  receipt,
  envelope,
);

if (!Object.isFrozen(envelope) || !Object.isFrozen(verified)) {
  hold("verification envelopes must be frozen");
}
if (
  verified.source_input_sha256 !== receipt.source_input_sha256 ||
  verified.reducer_receipt_sha256 !== receipt.receipt_sha256
) {
  hold("verification envelope evidence bindings differ");
}
if (
  verified.receipt_integrity_verified !== true ||
  verified.receipt_derivation_verified !== true ||
  verified.conservative_derivation_recomputed !== true
) {
  hold("verification envelope success claims differ");
}
if (
  verified.source_identity_authenticated !== false ||
  verified.network_access_performed !== false ||
  verified.credential_access_performed !== false ||
  verified.wallet_or_key_access_performed !== false ||
  verified.transaction_submission_performed !== false ||
  verified.fund_movement_performed !== false ||
  verified.execution_authorized !== false
) {
  hold("verification envelope authority boundary widened");
}

const wrongInput = clone(input) as RecordValue;
wrongInput.reduction_id = "different-reduction-id";
expectHold("different source input", () =>
  verifyDualSourceQuoteVerificationEnvelopeAgainstInputV1(
    wrongInput,
    receipt,
    envelope,
  ),
);

const forgedEnvelope = clone(envelope) as RecordValue;
forgedEnvelope.reducer_receipt_sha256 = "0".repeat(64);
const forgedEnvelopeUnsigned = { ...forgedEnvelope };
delete forgedEnvelopeUnsigned.verification_sha256;
forgedEnvelope.verification_sha256 = hashDualSourceQuoteReducerDocumentV1(
  forgedEnvelopeUnsigned,
);
expectHold("self-consistent verification-envelope forgery", () =>
  verifyDualSourceQuoteVerificationEnvelopeAgainstInputV1(
    input,
    receipt,
    forgedEnvelope,
  ),
);

const forgedReceipt = clone(receipt) as RecordValue;
const forgedReducedQuote = record(forgedReceipt.reduced_quote, "forged reduced quote");
forgedReducedQuote.gas_usd = "0.000000";
const forgedReceiptUnsigned = { ...forgedReceipt };
delete forgedReceiptUnsigned.receipt_sha256;
forgedReceipt.receipt_sha256 = hashDualSourceQuoteReducerDocumentV1(
  forgedReceiptUnsigned,
);
expectHold("self-consistent reducer-receipt forgery", () =>
  createDualSourceQuoteVerificationEnvelopeV1(input, forgedReceipt),
);

const tamperedDigest = clone(envelope) as RecordValue;
tamperedDigest.verification_sha256 = "f".repeat(64);
expectHold("tampered verification digest", () =>
  verifyDualSourceQuoteVerificationEnvelopeAgainstInputV1(
    input,
    receipt,
    tamperedDigest,
  ),
);

console.log(`source_input_sha256=${verified.source_input_sha256}`);
console.log(`reducer_receipt_sha256=${verified.reducer_receipt_sha256}`);
console.log(`verification_sha256=${verified.verification_sha256}`);
console.log("receipt_integrity_verified=true");
console.log("receipt_derivation_verified=true");
console.log("conservative_derivation_recomputed=true");
console.log("different_source_input_rejected=true");
console.log("self_consistent_verification_envelope_forgery_rejected=true");
console.log("self_consistent_reducer_receipt_forgery_rejected=true");
console.log("source_identity_authenticated=false");
console.log("network_access_performed=false");
console.log("credential_access_performed=false");
console.log("wallet_or_key_access_performed=false");
console.log("transaction_submission_performed=false");
console.log("fund_movement_performed=false");
console.log("execution_authorized=false");
console.log(PROOF_MARKER);
