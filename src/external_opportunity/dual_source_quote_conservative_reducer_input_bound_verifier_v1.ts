import {
  canonicalDualSourceQuoteReducerJsonV1,
  reduceDualSourceQuoteConservativelyV1,
  verifyDualSourceQuoteConservativeReducerReceiptV1,
  type DualSourceQuoteConservativeReducerReceiptV1,
} from "./dual_source_quote_conservative_reducer_v1.js";

export const VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_INPUT_BOUND_VERIFIER_V1 =
  "VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_INPUT_BOUND_VERIFIER_V1" as const;

function hold(message: string): never {
  throw new Error(`HOLD: ${message}`);
}

/**
 * Verify both the closed receipt shape/content digest and the exact conservative
 * derivation from the supplied source input.
 *
 * Receipt-only verification cannot prove derivation because a caller can alter
 * receipt fields and recompute its unkeyed content digest. This verifier
 * recomputes the canonical receipt from the original input and requires exact
 * canonical equality.
 */
export function verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1(
  input: unknown,
  value: unknown,
): DualSourceQuoteConservativeReducerReceiptV1 {
  const verified = verifyDualSourceQuoteConservativeReducerReceiptV1(value);
  const expected = reduceDualSourceQuoteConservativelyV1(input);

  if (verified.source_input_sha256 !== expected.source_input_sha256) {
    hold("receipt source input digest does not match supplied input");
  }
  if (
    canonicalDualSourceQuoteReducerJsonV1(verified) !==
    canonicalDualSourceQuoteReducerJsonV1(expected)
  ) {
    hold("receipt conservative derivation does not match supplied input");
  }

  return verified;
}
