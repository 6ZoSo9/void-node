# VOID Self-Capital Round-Trip Paper Observer V1

## Purpose

This lane measures whether a self-funded, inventory-neutral round trip would
increase VOID-controlled capital after externally paid costs. It exists because
the active Across observer measures app-fee revenue from outside users and is
not a self-trading profit model.

## Accounting boundary

V1 requires one starting asset, a forward quote into one intermediate asset,
and a return quote that restores the exact starting asset and chain. The return
quote input must equal the forward quote's guaranteed output. The forward
expected and minimum output amounts must be identical so the modeled return leg
does not depend on unguaranteed intermediate inventory.

The paper calculation is:

```text
expected gross P&L = expected ending base value - starting base value
minimum gross P&L  = minimum ending base value - starting base value

external costs =
  forward gas
  + return gas
  + capital-lock cost
  + capital risk reserve
  + failure reserve
  + safety buffer

net P&L = gross P&L - external costs
```

Provider fees and quoted price impact must already be reflected in both quoted
outputs. App fees must be exactly zero. A fee paid by VOID to a VOID-controlled
recipient is an internal transfer and may not be presented as trading profit.

## Classification

- `paper_positive`: both expected and minimum net P&L are positive;
- `paper_marginal`: expected net P&L is positive but minimum net P&L is not;
- `paper_negative`: expected net P&L is not positive;
- `expired`: either quote is expired at evaluation time.

## V1 limitations

This is a pure deterministic observer. It does not retrieve quotes. It accepts a
sanitized two-quote observation supplied by a later adapter. That adapter must
derive USD valuations from authenticated provider responses rather than accept
caller-invented values. The example fixture uses synthetic economics only and is
not evidence of a real opportunity.

V1 intentionally requires:

- the same base asset and chain at start and finish;
- exact intermediate inventory coverage;
- distinct forward and return quote IDs;
- bounded quote-time skew, rounded up to the next whole second;
- capital-lock coverage for both expected fills;
- capital at risk equal to starting portfolio value;
- zero app fee on both legs;
- explicit provider-fee and price-impact inclusion.

## Authority boundary

The source performs no filesystem access, network access, credential access,
wallet or key access, balance query, approval, transaction construction,
signing, submission, bridge execution, swap execution, custody, service or
timer mutation, deployment, Work Credit write, Buy VOID mutation, or fund
movement.

Every receipt fixes these fields false:

- credential access;
- raw-response and transaction-payload retention;
- network access and mutation;
- wallet or key access;
- transaction construction, signing, and submission;
- fund movement;
- live execution and execution authorization.

A live executor is not part of this lane. Stable paper evidence, independent
quote acquisition, legal review, wallet segregation, explicit loss limits, and
a separately authorized execution project would still be required.

## Files

- `src/external_opportunity/self_capital_round_trip_paper_observer_v1.ts`
- `scripts/prove_external_opportunity_self_capital_round_trip_paper_observer_v1.ts`
- `fixtures/external-opportunity/self-capital-round-trip-paper-observer-v1.example.json`
- `schemas/external-opportunity-self-capital-round-trip-paper-observer-v1.schema.json`
- `docs/architecture/external-opportunity-self-capital-round-trip-paper-observer-v1.md`
- `.github/workflows/external-opportunity-self-capital-round-trip-paper-observer-v1.yml`

## Verification

```bash
node --import tsx scripts/prove_external_opportunity_self_capital_round_trip_paper_observer_v1.ts
npm run build
```

The proof covers deterministic positive economics, marginal and negative
classification, conservative signed-basis-point rounding, expiry, exact app-fee
exclusion, route symmetry, inventory coverage, whole- and fractional-second
quote skew, capital policy, fee/price-impact declarations, unknown-key rejection,
execution-shaped-field rejection, and all false authority flags.
