import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  hashDualSourceQuoteReducerDocumentV1,
  reduceDualSourceQuoteConservativelyV1,
  verifyDualSourceQuoteConservativeReducerReceiptV1,
} from "../src/external_opportunity/dual_source_quote_conservative_reducer_v1.js";
import { verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1 } from "../src/external_opportunity/dual_source_quote_conservative_reducer_input_bound_verifier_v1.js";

type MutableJson = Record<string, any>;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

function expectHold(label: string, operation: () => unknown): void {
  try {
    operation();
  } catch (error) {
    assert(error instanceof Error, `${label} must throw an Error`);
    assert(error.message.startsWith("HOLD:"), `${label} must fail closed`);
    return;
  }
  throw new Error(`ASSERTION FAILED: ${label} did not fail closed`);
}

const fixturePath = resolve(
  "fixtures/external-opportunity/dual-source-quote-conservative-reducer-v1.example.json",
);
const sourcePath = resolve(
  "src/external_opportunity/dual_source_quote_conservative_reducer_v1.ts",
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as MutableJson;
const reducerSource = readFileSync(sourcePath, "utf8");

assert(
  !reducerSource.includes("localeCompare"),
  "reducer source must not use locale-sensitive String.localeCompare",
);
assert(
  !reducerSource.includes("Intl.Collator"),
  "reducer source must not use locale-sensitive Intl.Collator",
);
assert(
  reducerSource.includes("if (left < right) return -1;"),
  "canonical ordering must use explicit less-than code-unit comparison",
);
assert(
  reducerSource.includes("if (left > right) return 1;"),
  "canonical ordering must use explicit greater-than code-unit comparison",
);
assert(
  reducerSource.includes("compareCodeUnits(left.provider, right.provider)"),
  "provider ordering must use the explicit code-unit comparator",
);
assert(
  reducerSource.includes("compareCodeUnits(left.quote_id, right.quote_id)"),
  "quote-ID tie-break must use the explicit code-unit comparator",
);

const receipt = reduceDualSourceQuoteConservativelyV1(fixture);
const verified = verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1(
  fixture,
  receipt,
);

assert(
  verified.reduced_quote.expected_output_amount === "30135000000000000",
  "expected amount must use the lower source value",
);
assert(
  verified.reduced_quote.minimum_output_amount === "30075000000000000",
  "minimum amount must use the lower source value",
);
assert(
  verified.reduced_quote.expected_output_value_usd === "100.450000",
  "expected USD must use the lower source value",
);
assert(
  verified.reduced_quote.minimum_output_value_usd === "100.250000",
  "minimum USD must use the lower source value",
);
assert(
  verified.reduced_quote.expected_fill_time_seconds === 45,
  "fill time must use the slower source value",
);
assert(verified.reduced_quote.gas_usd === "0.350000", "gas must use the higher source value");
assert(
  verified.reduced_quote.quote_expiry_timestamp === 1785816280,
  "expiry must use the earlier source value",
);
assert(verified.observation_skew_seconds === 1, "observation skew must be one second");
assert(
  verified.source_identity_authenticated === false,
  "source identity must remain explicitly unauthenticated",
);
assert(verified.execution_authorized === false, "reduction must not authorize execution");

const reversed = clone(fixture);
reversed.quotes.reverse();
const reversedReceipt = reduceDualSourceQuoteConservativelyV1(reversed);
assert(
  reversedReceipt.source_input_sha256 === receipt.source_input_sha256,
  "source ordering must not change normalized input digest",
);
assert(
  reversedReceipt.reduced_quote.quote_id === receipt.reduced_quote.quote_id,
  "source ordering must not change reduced quote ID",
);
assert(
  reversedReceipt.receipt_sha256 === receipt.receipt_sha256,
  "source ordering must not change receipt digest",
);
assert(
  JSON.stringify(reversedReceipt.source_quotes) === JSON.stringify(receipt.source_quotes),
  "source ordering must not change canonical source evidence order",
);
verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1(reversed, receipt);

const codeUnitFixture = clone(fixture);
codeUnitFixture.quotes[0].provider = "Z-provider";
codeUnitFixture.quotes[0].quote_id = "quote-z";
codeUnitFixture.quotes[1].provider = "a-provider";
codeUnitFixture.quotes[1].quote_id = "quote-A";
const codeUnitReceipt = reduceDualSourceQuoteConservativelyV1(codeUnitFixture);
assert(
  codeUnitReceipt.source_quotes[0].provider === "Z-provider",
  "uppercase Z must sort before lowercase a by direct UTF-16 code-unit order",
);
const codeUnitReversed = clone(codeUnitFixture);
codeUnitReversed.quotes.reverse();
const codeUnitReversedReceipt = reduceDualSourceQuoteConservativelyV1(codeUnitReversed);
assert(
  codeUnitReversedReceipt.source_input_sha256 === codeUnitReceipt.source_input_sha256,
  "code-unit edge-case input digest must be permutation invariant",
);
assert(
  codeUnitReversedReceipt.reduced_quote.quote_id === codeUnitReceipt.reduced_quote.quote_id,
  "code-unit edge-case quote ID must be permutation invariant",
);
assert(
  codeUnitReversedReceipt.receipt_sha256 === codeUnitReceipt.receipt_sha256,
  "code-unit edge-case receipt must be permutation invariant",
);
assert(
  JSON.stringify(codeUnitReversedReceipt.source_quotes) ===
    JSON.stringify(codeUnitReceipt.source_quotes),
  "code-unit edge-case source evidence order must be canonical",
);
verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1(
  codeUnitReversed,
  codeUnitReceipt,
);

const sameProvider = clone(fixture);
sameProvider.quotes[1].provider = sameProvider.quotes[0].provider;
expectHold("same provider label", () => reduceDualSourceQuoteConservativelyV1(sameProvider));

const routeMismatch = clone(fixture);
routeMismatch.quotes[1].output_asset.address =
  "0x0000000000000000000000000000000000000003";
expectHold("route mismatch", () => reduceDualSourceQuoteConservativelyV1(routeMismatch));

const amountMismatch = clone(fixture);
amountMismatch.quotes[1].input_amount = "99999999";
expectHold("input amount mismatch", () => reduceDualSourceQuoteConservativelyV1(amountMismatch));

const excessiveSkew = clone(fixture);
excessiveSkew.quotes[1].observed_at = "2026-08-04T04:00:06.000Z";
expectHold("excessive observation skew", () =>
  reduceDualSourceQuoteConservativelyV1(excessiveSkew),
);

const expired = clone(fixture);
expired.quotes[1].quote_expiry_timestamp = 1785816010;
expectHold("expired quote", () => reduceDualSourceQuoteConservativelyV1(expired));

const invertedAmounts = clone(fixture);
invertedAmounts.quotes[1].expected_output_amount = "30000000000000000";
expectHold("expected amount below minimum", () =>
  reduceDualSourceQuoteConservativelyV1(invertedAmounts),
);

const appFee = clone(fixture);
appFee.quotes[1].app_fee_usd = "0.010000";
expectHold("internal app fee", () => reduceDualSourceQuoteConservativelyV1(appFee));

const missingProviderFees = clone(fixture);
missingProviderFees.quotes[1].quoted_output_includes_provider_fees = false;
expectHold("provider fees excluded", () =>
  reduceDualSourceQuoteConservativelyV1(missingProviderFees),
);

const extraField = clone(fixture);
extraField.quotes[1].transaction = {
  to: "0x0000000000000000000000000000000000000004",
};
expectHold("transaction payload field", () =>
  reduceDualSourceQuoteConservativelyV1(extraField),
);

const tamperedReceipt = clone(receipt);
tamperedReceipt.reduced_quote.expected_output_amount = "99999999999999999";
expectHold("tampered receipt without digest repair", () =>
  verifyDualSourceQuoteConservativeReducerReceiptV1(tamperedReceipt),
);

const selfConsistentForgery = clone(receipt);
selfConsistentForgery.reduced_quote.expected_output_amount = "99999999999999999";
const selfConsistentUnsigned = clone(selfConsistentForgery);
delete selfConsistentUnsigned.receipt_sha256;
selfConsistentForgery.receipt_sha256 =
  hashDualSourceQuoteReducerDocumentV1(selfConsistentUnsigned);
const integrityOnlyVerification =
  verifyDualSourceQuoteConservativeReducerReceiptV1(selfConsistentForgery);
assert(
  integrityOnlyVerification.reduced_quote.expected_output_amount ===
    "99999999999999999",
  "receipt-only verification must be recognized as integrity-only",
);
expectHold("self-consistent forged receipt", () =>
  verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1(
    fixture,
    selfConsistentForgery,
  ),
);

const wrongSourceInput = clone(fixture);
wrongSourceInput.reduction_id = "different-reduction-v1";
expectHold("receipt verified against different input", () =>
  verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1(
    wrongSourceInput,
    receipt,
  ),
);

console.log("reduction_id=dual-source-usdc-weth-forward-v1");
console.log(`source_input_sha256=${receipt.source_input_sha256}`);
console.log(`reduced_quote_id=${receipt.reduced_quote.quote_id}`);
console.log(`expected_output_amount=${receipt.reduced_quote.expected_output_amount}`);
console.log(`minimum_output_amount=${receipt.reduced_quote.minimum_output_amount}`);
console.log(`expected_output_value_usd=${receipt.reduced_quote.expected_output_value_usd}`);
console.log(`minimum_output_value_usd=${receipt.reduced_quote.minimum_output_value_usd}`);
console.log(`gas_usd=${receipt.reduced_quote.gas_usd}`);
console.log(`source_identity_authenticated=${receipt.source_identity_authenticated}`);
console.log("canonical_source_order=explicit_utf16_code_units");
console.log("source_permutation_invariant=true");
console.log("locale_dependent_comparators_present=false");
console.log("receipt_input_bound_verification=true");
console.log("self_consistent_forgery_rejected=true");
console.log(`network_access_performed=${receipt.network_access_performed}`);
console.log(`wallet_or_key_access_performed=${receipt.wallet_or_key_access_performed}`);
console.log(`transaction_submission_performed=${receipt.transaction_submission_performed}`);
console.log(`fund_movement_performed=${receipt.fund_movement_performed}`);
console.log(`execution_authorized=${receipt.execution_authorized}`);
console.log(
  "VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_V1_PROOF_GREEN",
);
