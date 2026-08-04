# External opportunity dual-source quote self-capital forward adapter v1

Marker: `VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_SELF_CAPITAL_FORWARD_ADAPTER_V1`

## Problem

The general dual-source conservative reducer preserves separate expected and guaranteed output amounts. That is correct for a general quote-leg contract, but the existing self-capital round-trip paper observer V1 deliberately requires the forward expected output amount to equal the guaranteed minimum output amount. The return quote must then spend that exact guaranteed amount.

Passing the reducer's ordinary output directly into the canonical Across round-trip composer therefore fails closed whenever the reduced expected amount remains above the reduced minimum amount. Weakening the observer would widen its inventory-neutrality assumptions. Altering the general reducer would discard useful expected-value evidence for other consumers.

## Adapter contract

The adapter consumes the complete evidence chain:

1. the exact two-source reducer input;
2. the input-bound conservative reducer receipt;
3. the derivation-verification envelope;
4. the relative-freshness receipt and its exact maximum-age policy.

It independently re-runs the input-bound reducer verification and relative-freshness verification before producing a forward quote.

The adapted quote preserves the verified reduced quote's:

- input and output assets;
- input amount;
- observation time;
- earliest expiry;
- slower expected fill time;
- higher gas estimate;
- provider-fee and price-impact inclusion flags;
- zero internal application fee.

For compatibility with the self-capital V1 guaranteed-forward contract, it then:

- sets expected output amount equal to the reduced guaranteed minimum amount;
- preserves that same amount as the minimum output amount;
- sets expected output USD value equal to the reduced guaranteed minimum USD value;
- preserves that same USD value as the minimum output USD value.

The adapter does not increase an output amount or value. It deliberately discards the optimistic spread between expected and minimum forward outcomes.

## Content addressing and verification

The adapted quote receives a `voiddsqsca1_` identifier derived from the adapter marker, exact source-input digest, reducer-receipt digest, freshness digest, and adapted quote fields.

The adapter receipt binds:

- source-input SHA-256;
- reducer-receipt SHA-256;
- derivation-verification SHA-256;
- freshness SHA-256;
- maximum relative quote-age policy;
- the exact adapted quote;
- explicit evidence and authority boundaries.

Consumers retaining the complete upstream evidence must use:

```text
verifyDualSourceQuoteSelfCapitalForwardAdapterReceiptV1(...)
```

That verifier recomputes the complete expected adapter receipt and requires exact canonical equality. Recomputing the unkeyed adapter digest after altering a quote field is not sufficient.

## Canonical composition proof

The focused proof demonstrates both sides of the compatibility boundary:

- the ordinary reduced quote fails closed at the merged canonical `composeAcrossRoundTripPaperV1` entrypoint because expected and guaranteed forward amounts differ;
- the adapted quote passes the same canonical guarded composer without bypassing the position-value consistency guard;
- the return quote spends exactly the adapted guaranteed forward amount;
- inventory neutrality and starting-asset restoration remain true;
- a self-consistent forged adapter receipt and mismatched freshness evidence fail closed.

The proof uses only deterministic synthetic evidence. A resulting paper classification is not a live quote, market edge, available liquidity, fill guarantee, or executable profit.

## Evidence limitations

The upstream freshness gate verifies quote age only relative to the supplied evaluation instant. The adapter therefore preserves:

```text
relative_freshness_verified=true
evaluation_clock_authenticated=false
wall_clock_freshness_verified=false
source_identity_authenticated=false
```

The adapter does not authenticate provider identity, the evaluation clock, a wall clock, price provenance, liquidity, or fill reliability. Those remain separate acquisition and attestation boundaries.

## Fail-closed conditions

The adapter rejects:

- a reducer receipt not exactly derived from the supplied two-source input;
- a verification envelope not bound to that input and receipt;
- a freshness receipt not exactly derived from the same evidence and age policy;
- any upstream digest mismatch;
- an altered or self-consistent forged adapter receipt;
- an adapted quote that does not collapse expected amount and value to their guaranteed minima;
- any widened execution or fund-movement authority.

## Authority boundary

This is a source-only, paper-only compatibility contract. It performs no network request, live quote acquisition, credential access, provider authentication, balance query, approval, transaction construction, signing, submission, swap or bridge execution, deployment, service restart, Work Credit write, Buy VOID mutation, wallet access, custody, or fund movement.

The adapted quote and any downstream paper receipt are review evidence only. They never authorize execution.

## Next gate

After merge, the reducer and adapter can feed a separately reviewed authenticated acquisition and composition lane. Trusted clock acquisition, provider provenance, live quote collection, executable transaction construction, treasury limits, signing, submission, and fund movement remain separate explicit gates.
