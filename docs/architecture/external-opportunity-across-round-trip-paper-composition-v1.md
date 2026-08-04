# VOID Across Round-Trip Paper Composition V1

## Purpose

This lane composes the sanitized Across token valuation result with the existing
self-capital round-trip paper observer. It replaces caller-selected starting USD
capital with the conservative, content-addressed `position_value_usd_floor` from
the reviewed Across token-catalog ingestion boundary.

The outcome is still paper-only. It does not demonstrate a live market edge,
executable liquidity, fill reliability, or profit.

## Composition boundary

The input contains:

- one complete `void-across-token-valuation-ingestion-result-v1` record;
- one forward quote leg;
- one return quote leg without caller-supplied USD output values;
- a cost policy without caller-supplied capital-at-risk USD;
- one canonical evaluation instant.

The composer validates the complete Across result, including its exact provider,
endpoint, method, selector/token identity, authority flags, and valuation digest.
The valued token and amount must exactly equal the forward quote input. The
return quote must restore the same token identity.

## Conservative valuation binding

The starting capital and capital-at-risk value are both taken from:

```text
valuation.position_value_usd_floor
```

The caller cannot override either value. Before using it, the composer performs
an independent position-value consistency check against the supplied floored
price, selector amount, token decimals, and source-price precision. The accepted
micro-USD position value must fall within the only interval that the floored
price can produce. A caller cannot alter `position_value_usd_floor`, recompute
the self-authored valuation digest, and manufacture starting capital outside
that interval.

Return-leg expected and minimum USD values are then derived with integer
arithmetic from the valued starting position:

```text
return value micros = floor(
  starting value micros × return output amount ÷ starting amount
)
```

This prevents a caller from manufacturing paper profit by supplying an inflated
ending USD value that disagrees with the returned amount.

The forward quote retains its own intermediate-asset value fields for evidence
continuity, but the existing observer does not count those fields as P&L.

## Evidence and timing

The composition observation instant is the latest of:

- the valuation evaluation instant;
- the forward quote observation instant;
- the return quote observation instant.

The composition evaluation instant must not precede any supplied evidence. Quote
skew, expiry, inventory neutrality, amount continuity, costs, and P&L status are
then evaluated by the canonical self-capital round-trip paper observer.

The receipt binds the Across valuation digest, the normalized composition input,
the resulting observer receipt, and a content-addressed receipt digest.

## Network and credential truth

The composer consumes a supplied valuation result. It does not perform a live
Across request, read an API key, retain a raw provider response, or claim how the
caller acquired the upstream evidence.

The receipt therefore states:

- `upstream_evidence_supplied_by_caller=true`;
- `composition_network_access_performed=false`;
- `composition_credential_access_performed=false`.

A later operator or acquisition lane may produce a real read-only valuation, but
that remains separate from this deterministic composition contract.

## Authority boundary

This lane does not authorize execution. It performs no wallet or private-key
access, balance query, approval, transaction construction, signing, submission,
swap, bridge, custody, deployment, service restart, Work Credit write, Buy VOID
mutation, or fund movement.

A paper-positive result is evidence for further review only. It is not authority
to trade and is not proof that the same opportunity remains available.

## Files

- `src/external_opportunity/across_round_trip_paper_composition_v1.ts`
- `src/external_opportunity/across_round_trip_paper_position_value_guard_v1.ts`
- `scripts/prove_external_opportunity_across_round_trip_paper_composition_v1.ts`
- `fixtures/external-opportunity/across-round-trip-paper-composition-v1.example.json`
- `schemas/external-opportunity-across-round-trip-paper-composition-v1.schema.json`
- `docs/architecture/external-opportunity-across-round-trip-paper-composition-v1.md`
- `.github/workflows/external-opportunity-across-round-trip-paper-composition-v1.yml`

## Verification

```bash
node --import tsx scripts/prove_external_opportunity_across_round_trip_paper_composition_v1.ts
npm run build
```
