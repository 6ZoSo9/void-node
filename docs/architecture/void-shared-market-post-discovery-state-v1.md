# Shared market post-discovery state v1

This source-only reference inspects a caller-supplied output attributed to a
future one-sided opening-price-discovery mechanism. It can establish internal
arithmetic consistency, but it does not admit that assertion as participant or
reserve truth. It is shared by the approved `WC_VOID`, `BTC_VOID`, and
`ETH_VOID` markets.

It does not implement an auction, choose a price, activate a market, fund
inventory, provision liquidity, or authorize a transaction.

## Admission contract

Admission requires all of the following:

- an approved pair; `USDC_VOID` and every unknown pair fail closed;
- a content-addressed presale-closeout reference identifier;
- a content-addressed discovery receipt bound to the pair and participant
  commitment-set root;
- at least one participant commitment and a strictly positive real quote
  reserve;
- exactly `10,000,000 VOID` (`10,000,000,000,000` six-decimal atoms) locked as
  that market's initial protocol-side reserve; and
- one reduced rational clearing price exactly equal to the real
  quote-reserve/VOID-reserve ratio.

The assertion digest covers the pair, commitment root, participant count, both
reserves, and clearing-price ratio. Replaying that digest with a different
pair, root, reserve, or price fails closed. Because the digest is self-computed,
it proves only byte integrity and internal consistency. It does not prove that
any participant, commitment, payment, or real quote reserve exists.

## Result boundary

Every inspection result is `discovery_authority_hold`. Claimed participant
count, commitment root, quote reserve, and price remain explicitly prefixed
`claimed_`. The result records:

- `participant_commitment_provenance_verified=false`;
- `quote_reserve_custody_verified=false`;
- `opening_price_source=caller_supplied_unverified_assertion`; and
- `opening_price_source_verified=false`.

`admitPostDiscoveryMarketState` validates the assertion and then fails with
`DISCOVERY_AUTHORITY_UNVERIFIED`. A freshly self-hashed fabricated assertion
therefore cannot become post-discovery market state.

The supplied closeout reference is likewise not canonical authority.
`presale_closeout_authority_verified` and `presale_closed` remain `false`
until a separately reviewed Chain-2050 source/finality verifier is composed. A
separate activation gate remains required. Activation, inventory funding,
liquidity provisioning, and transaction authority are always `false`.

This contract deliberately begins after discovery. Price formation,
participant allocation/refund rules, commitment uniqueness, canonical
presale-closeout verification, terminal settlement, and activation remain
separate reviewed seams. Conventional
constant-product quote math may consume an accepted reserve state later, but
it must not invent the zero-to-positive quote transition or reuse the fixed
presale price.

## Verification

Run:

```bash
node scripts/prove_void_shared_market_post_discovery_state_v1.mjs
```

The proof covers all three approved pairs, deterministic HOLD inspection,
rejection of a freshly self-hashed fabricated assertion, zero claimed quote
reserve, inventory drift, mismatched and non-canonical prices, assertion
tampering, cross-pair replay, invalid closeout identity, unknown request fields,
and rejection of `USDC_VOID`.
