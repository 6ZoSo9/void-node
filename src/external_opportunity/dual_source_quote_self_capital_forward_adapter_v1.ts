import {
  canonicalDualSourceQuoteReducerJsonV1,
  hashDualSourceQuoteReducerDocumentV1,
  type DualSourceQuoteEvidenceV1,
} from "./dual_source_quote_conservative_reducer_v1.js";
import { verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1 } from "./dual_source_quote_conservative_reducer_input_bound_verifier_v1.js";
import { verifyDualSourceQuoteRelativeFreshnessGateReceiptAgainstInputV1 } from "./dual_source_quote_relative_freshness_gate_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_V1" as const;
export const VOID_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_RECEIPT_SCHEMA_V1 =
  "void-dual-source-quote-self-capital-forward-adapter-receipt-v1" as const;

export type DualSourceQuoteSelfCapitalForwardAdapterReceiptV1 = Readonly<{
  schema: typeof VOID_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_RECEIPT_SCHEMA_V1;
  marker: typeof VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_V1;
  phase: "paper_self_capital_forward_adapter";
  reduction_id: string;
  source_input_sha256: string;
  reducer_receipt_sha256: string;
  derivation_verification_sha256: string;
  freshness_sha256: string;
  maximum_quote_age_seconds: number;
  relative_freshness_verified: true;
  evaluation_clock_authenticated: false;
  wall_clock_freshness_verified: false;
  source_identity_authenticated: false;
  expected_amount_collapsed_to_guaranteed: true;
  expected_value_collapsed_to_guaranteed: true;
  self_capital_v1_forward_compatible: true;
  adapted_quote: DualSourceQuoteEvidenceV1;
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
  adapter_sha256: string;
}>;

function hold(message: string): never {
  throw new Error(`HOLD: ${message}`);
}

function receiptWithoutHash(
  receipt: DualSourceQuoteSelfCapitalForwardAdapterReceiptV1,
): Omit<DualSourceQuoteSelfCapitalForwardAdapterReceiptV1, "adapter_sha256"> {
  const { adapter_sha256: _adapterSha256, ...unsigned } = receipt;
  return unsigned;
}

export function adaptDualSourceQuoteForSelfCapitalForwardV1(
  input: unknown,
  reducerReceipt: unknown,
  verificationEnvelope: unknown,
  maximumQuoteAgeSeconds: number,
  freshnessReceipt: unknown,
): DualSourceQuoteSelfCapitalForwardAdapterReceiptV1 {
  const verifiedReducer =
    verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1(
      input,
      reducerReceipt,
    );
  const verifiedFreshness =
    verifyDualSourceQuoteRelativeFreshnessGateReceiptAgainstInputV1(
      input,
      reducerReceipt,
      verificationEnvelope,
      maximumQuoteAgeSeconds,
      freshnessReceipt,
    );

  if (
    verifiedFreshness.source_input_sha256 !== verifiedReducer.source_input_sha256 ||
    verifiedFreshness.reducer_receipt_sha256 !== verifiedReducer.receipt_sha256
  ) {
    hold("freshness evidence is not bound to the verified reducer receipt");
  }

  const reduced = verifiedReducer.reduced_quote;
  const adaptedQuoteCore = Object.freeze({
    provider: "dual-source-conservative-self-capital",
    observed_at: reduced.observed_at,
    quote_expiry_timestamp: reduced.quote_expiry_timestamp,
    input_asset: reduced.input_asset,
    output_asset: reduced.output_asset,
    input_amount: reduced.input_amount,
    expected_output_amount: reduced.minimum_output_amount,
    minimum_output_amount: reduced.minimum_output_amount,
    expected_output_value_usd: reduced.minimum_output_value_usd,
    minimum_output_value_usd: reduced.minimum_output_value_usd,
    expected_fill_time_seconds: reduced.expected_fill_time_seconds,
    quoted_output_includes_provider_fees: true as const,
    quoted_output_includes_price_impact: true as const,
    app_fee_usd: "0.000000" as const,
    gas_usd: reduced.gas_usd,
  });
  const quoteId = `voiddsqsca1_${hashDualSourceQuoteReducerDocumentV1({
    marker: VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_V1,
    source_input_sha256: verifiedReducer.source_input_sha256,
    reducer_receipt_sha256: verifiedReducer.receipt_sha256,
    freshness_sha256: verifiedFreshness.freshness_sha256,
    adapted_quote: adaptedQuoteCore,
  })}`;
  const adaptedQuote: DualSourceQuoteEvidenceV1 = Object.freeze({
    ...adaptedQuoteCore,
    quote_id: quoteId,
  });

  if (
    adaptedQuote.expected_output_amount !== adaptedQuote.minimum_output_amount ||
    adaptedQuote.expected_output_value_usd !== adaptedQuote.minimum_output_value_usd
  ) {
    hold("adapted quote does not satisfy the self-capital V1 guaranteed-forward contract");
  }

  const unsigned = Object.freeze({
    schema: VOID_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_RECEIPT_SCHEMA_V1,
    marker:
      VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_V1,
    phase: "paper_self_capital_forward_adapter" as const,
    reduction_id: verifiedReducer.reduction_id,
    source_input_sha256: verifiedReducer.source_input_sha256,
    reducer_receipt_sha256: verifiedReducer.receipt_sha256,
    derivation_verification_sha256:
      verifiedFreshness.derivation_verification_sha256,
    freshness_sha256: verifiedFreshness.freshness_sha256,
    maximum_quote_age_seconds: verifiedFreshness.maximum_quote_age_seconds,
    relative_freshness_verified: true as const,
    evaluation_clock_authenticated: false as const,
    wall_clock_freshness_verified: false as const,
    source_identity_authenticated: false as const,
    expected_amount_collapsed_to_guaranteed: true as const,
    expected_value_collapsed_to_guaranteed: true as const,
    self_capital_v1_forward_compatible: true as const,
    adapted_quote: adaptedQuote,
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
    adapter_sha256: hashDualSourceQuoteReducerDocumentV1(unsigned),
  });
}

export function verifyDualSourceQuoteSelfCapitalForwardAdapterReceiptV1(
  input: unknown,
  reducerReceipt: unknown,
  verificationEnvelope: unknown,
  maximumQuoteAgeSeconds: number,
  freshnessReceipt: unknown,
  value: unknown,
): DualSourceQuoteSelfCapitalForwardAdapterReceiptV1 {
  const expected = adaptDualSourceQuoteForSelfCapitalForwardV1(
    input,
    reducerReceipt,
    verificationEnvelope,
    maximumQuoteAgeSeconds,
    freshnessReceipt,
  );
  if (
    canonicalDualSourceQuoteReducerJsonV1(value) !==
    canonicalDualSourceQuoteReducerJsonV1(expected)
  ) {
    hold("self-capital forward adapter receipt does not match supplied evidence");
  }
  return expected;
}

export function hashVerifiedDualSourceQuoteSelfCapitalForwardAdapterReceiptV1(
  receipt: DualSourceQuoteSelfCapitalForwardAdapterReceiptV1,
): string {
  return hashDualSourceQuoteReducerDocumentV1(receiptWithoutHash(receipt));
}
