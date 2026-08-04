# External opportunity dual-source quote conservative reducer v1

Marker: `VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_CONSERVATIVE_REDUCER_V1`

## Purpose

A paper opportunity should not become more attractive merely because one supplied quote is optimistic. This source-only reducer accepts exactly two quote records for the same route and input amount, validates their structural and timing compatibility, and emits one quote-leg-shaped record using the less favorable output and expiry values together with the higher cost and fill-time values.

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

Before hashing, the two source records are placed in one canonical order. Provider label is the primary ordering key and quote ID is the tie-break. Both keys use direct ECMAScript relational comparison with `<` and `>`, which compares the strings by UTF-16 code-unit order. The reducer does not use locale-aware collation.

`String.prototype.localeCompare()` and `Intl.Collator` are prohibited in this boundary. Their results can depend on locale and ICU configuration, which could cause different hosts to order identical evidence differently and therefore produce different source-input hashes, quote IDs, and receipt digests.

The quote ID is content-addressed from the canonically ordered normalized input, both source quote digests, and the reduced quote fields. Reversing the supplied source order does not alter the normalized input digest, canonical source-evidence order, reduced quote ID, or receipt digest. The focused proof includes an uppercase-versus-lowercase ordering case and statically fails if a locale-dependent comparator is introduced.

The output retains the general quote-leg field shape used by the paper-observation contracts. Shape compatibility does not guarantee compatibility with every narrower consumer invariant.

## Self-capital V1 compatibility boundary

The self-capital round-trip paper observer V1 requires the forward expected output amount to equal the guaranteed minimum output amount. It also requires the return quote to spend that exact guaranteed forward amount.

The general reducer deliberately preserves separate expected and minimum values, so its ordinary output can fail that narrower contract even though the reduction itself is correct. The reducer must not silently weaken the observer or discard expected-value evidence for every consumer.

The separate self-capital forward adapter:

```text
adaptDualSourceQuoteForSelfCapitalForwardV1(...)
```

re-verifies the complete input-bound and relative-freshness evidence chain, then collapses the adapted forward expected amount and value to the verified reduced guaranteed minima. The adapter proof demonstrates that the ordinary reduced fixture fails the canonical composer while the adapted quote passes the same guarded entrypoint without weakening inventory-neutrality requirements.

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

The relative-freshness gate proves age only against a supplied evaluation instant. It does not authenticate that clock or establish wall-clock freshness.

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

The focused proof also fails if canonical source ordering stops being permutation invariant or if `localeCompare` or `Intl.Collator` appears in the reducer source.

The self-capital adapter additionally rejects mismatched freshness evidence, upstream digest drift, and any adapted quote that fails to collapse expected amount and value to their guaranteed minima.

## Authority boundary

This is a paper-only source contract. It performs no live API request, credential access, raw-response retention, transaction-payload retention, balance query, approval, transaction construction, signing, submission, swap or bridge execution, deployment, service restart, Work Credit write, Buy VOID mutation, wallet access, custody, or fund movement.

A reduced quote, adapted quote, and paper-positive downstream receipt are review evidence only. None authorizes execution.

## Next gate

After merge, a separate lane may compose reduced and adapted quotes with authenticated valuation and acquisition evidence. Provider authentication, trusted clock acquisition, live quote collection, transaction construction, signing, submission, and fund movement remain separately reviewed boundaries.
