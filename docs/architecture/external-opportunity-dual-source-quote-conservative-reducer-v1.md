# External opportunity dual-source quote conservative reducer v1

Marker: `VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_V1`

## Purpose

A paper opportunity should not become more attractive merely because one supplied quote is optimistic. This source-only reducer accepts exactly two quote records for the same route and input amount, validates their structural and timing compatibility, and emits one observer-compatible quote using the less favorable output and expiry values together with the higher cost and fill-time values.

The reducer is provider-neutral. It performs no quote acquisition and makes no network request.

## Input contract

The input contains:

- one reduction identifier;
- one canonical evaluation instant;
- a maximum observation-skew policy from zero through 300 seconds;
- exactly two closed quote records.

Each quote must include exact input and output assets, base-unit amounts, USD values, fill time, gas, observation time, expiry, and explicit confirmation that provider fees and price impact are already reflected in quoted output. Internal VOID application fees must be exactly zero for this self-capital paper lane.

The two provider labels and quote IDs must differ. Their route, token metadata, and input amount must match exactly. Both quotes must be unexpired at evaluation and observed no farther apart than the configured skew.

## Conservative reduction

The emitted quote uses:

- the minimum expected output amount;
- the minimum guaranteed output amount;
- the minimum expected output USD value;
- the minimum guaranteed output USD value;
- the maximum expected fill time;
- the maximum gas estimate;
- the earliest quote expiry;
- the later observation timestamp.

The quote ID is content-addressed from the normalized input, both source quote digests, and the reduced quote fields. Reversing the order of otherwise identical sources does not alter the normalized input digest or reduced quote ID.

The output shape remains compatible with the quote-leg contract used by the self-capital round-trip paper observer.

## Input-bound receipt verification

An unkeyed receipt digest proves only that a receipt is internally content-addressed. It does not prove that the receipt was conservatively derived from the claimed source input. A caller could otherwise alter a reduced field, recompute the receipt digest, and produce a self-consistent but false receipt.

Consumers that possess the source input must use:

```text
verifyDualSourceQuoteConservativeReducerReceiptAgainstInputV1(input, receipt)
```

The input-bound verifier:

1. applies the closed receipt parser and digest check;
2. recomputes the canonical conservative receipt from the supplied source input;
3. requires the source-input digest to match;
4. requires exact canonical equality with the recomputed receipt.

`verifyDualSourceQuoteConservativeReducerReceiptV1(receipt)` remains an integrity-only parser. It must not be treated as proof of conservative derivation or source provenance.

The adversarial proof demonstrates that a receipt-only verifier can accept a deliberately altered receipt after its unkeyed digest is recomputed, while the input-bound verifier rejects the same self-consistent forgery.

## Evidence limitation

Distinct provider labels are not authenticated provider identities. The receipt therefore records:

```text
source_labels_distinct=true
source_identity_authenticated=false
```

This reducer prevents one optimistic source from dominating a paper result, but it does not prove that either quote came from the named provider. A later authenticated acquisition or attestation lane must establish provider provenance. The reducer must not be described as live market consensus.

USD values remain supplied quote evidence. This lane checks ordering and conservative selection, not independent token-price arithmetic. Existing valuation and composition controls remain separate.

## Fail-closed conditions

The reducer rejects:

- additional or missing fields;
- duplicate provider labels or quote IDs;
- route, token-metadata, or input-amount disagreement;
- future observations, excessive observation skew, or expired quotes;
- expected amounts or USD values below their minimum values;
- provider fees or price impact excluded from quoted output;
- a nonzero internal application fee;
- transaction payload fields or other widened authority;
- receipt tampering or digest mismatch;
- a self-consistent receipt whose derivation differs from the supplied source input;
- a receipt verified against a different source input.

## Authority boundary

This is a paper-only source contract. It performs no live API request, credential access, raw-response retention, transaction-payload retention, balance query, approval, transaction construction, signing, submission, swap or bridge execution, deployment, service restart, Work Credit write, Buy VOID mutation, wallet access, custody, or fund movement.

A reduced quote and a paper-positive downstream receipt are review evidence only. Neither authorizes execution.

## Next gate

After merge, a separate lane may compose reduced forward and return quotes with authenticated valuation evidence and the existing round-trip paper observer. Provider authentication and any live quote acquisition remain separately reviewed boundaries.
