# Shared market post-discovery state v1

This source-only reference inspects a caller-supplied output attributed to a
future one-sided opening-price-discovery mechanism. It can establish internal
arithmetic consistency, but it does not admit that assertion as participant or
reserve truth. It is shared by the approved `WC_VOID`, `BTC_VOID`, and
`ETH_VOID` markets.

It does not implement an auction, choose a price, activate a market, fund
inventory, provision liquidity, or authorize a transaction.

## Inspection contract

Admission requires all of the following:

- an approved pair; `USDC_VOID` and every unknown pair fail closed;
- a content-addressed presale-closeout reference identifier;
- a content-addressed discovery receipt bound to the pair and participant
  commitment-set root;
- an exact set of self-hashed commitment assertions whose canonical sorted root,
  count, and quote-unit sum equal the discovery assertion;
- an exact set of self-hashed quote-settlement assertions in one-to-one
  correspondence with those commitments, with equal per-record and total quote
  units, the exact policy-approved quote asset and source profile for the pair,
  a unique claimed settlement reference for every commitment, and a
  content-addressed source-event join identifier over those exact expected
  source facts;
- an explicit protocol quote seed of exactly zero and a positive claimed
  participant quote reserve exactly equal to the complete real quote reserve;
- at least one commitment assertion and a strictly positive claimed quote
  reserve;
- a claim of exactly `10,000,000 VOID` (`10,000,000,000,000`
  six-decimal atoms) locked as that market's protocol-side reserve; and
- one reduced rational clearing price exactly equal to the real
  quote-reserve/VOID-reserve ratio.

The assertion digest covers the pair, commitment root, participant count, both
reserve-source amounts, both reserves, and clearing-price ratio. Replaying that
digest with a different
pair, root, reserve, or price fails closed. Because the digest is self-computed,
it proves only byte integrity and internal consistency. It does not prove that
any participant, commitment, payment, or real quote reserve exists.

Commitment accounting is deterministic and order-independent. Every assertion
binds its pair, claimed participant identifier, and positive quote units.
Duplicate commitment IDs, cross-pair membership, changed payloads, count
mismatch, root mismatch, quote-sum mismatch, and uint256 overflow fail closed.
This closes internal conservation and replay ambiguity without converting
self-authored records into participant identity or reserve-custody authority.

The receipt distinguishes the zero protocol quote seed from the positive
participant-supplied quote claim. Any nonzero protocol quote seed or any drift
between participant quote units and the complete quote reserve fails closed.
This preserves the merged one-sided-opening policy without proving that the
claimed participants or their funds exist.

Quote-settlement accounting is likewise deterministic and order-independent.
Every claimed settlement binds one commitment, the same positive quote amount,
the pair's exact quote asset, and one opaque settlement reference. Duplicate
settlement IDs, cross-asset assertions, wrong source domains, wrapped/testnet
substitutions, multiple
settlements for one commitment, reused settlement references, unknown or
missing commitments, amount drift, and total drift fail closed. This proves
only a bijection among caller-supplied records: settlement references are not
independently authenticated, and matching the asset label does not identify a
canonical network, transaction, finality rule, producer, or custodian. Neither
settlement source nor quote custody is verified.

Each settlement also carries `settlement_source_event_id`, a domain-separated
digest over the pair, quote asset, closed source and unit profile, commitment,
amount, and opaque settlement reference. This gives a future independently
reviewed per-asset adapter one exact query/result join identity. The inspector
recomputes the identifier and rejects drift or reuse. It is still a
caller-authored content address: it does not prove that a source event exists,
is canonical or final, or is held in custody.

## Shared portfolio boundary

The portfolio inspector requires exactly one internally consistent assertion for
each approved market: `WC_VOID`, `BTC_VOID`, and `ETH_VOID`. It canonicalizes
market order, retains exactly `10,000,000 VOID` per market, and reports the
fixed claimed total of `30,000,000 VOID` without pooling those allocations.

Settlement references must also be unique across all three markets. A caller
cannot reuse one claimed transfer to support multiple market assertions. Quote
amounts remain denominated and reported per pair; unlike units are never summed
or treated as interchangeable collateral. Cross-market VOID inventory backing
and cross-market quote-reserve backing are both explicitly false.

This portfolio check is still only an inspection of self-authored evidence.
`admitSharedPostDiscoveryMarketPortfolioState` always fails with
`SHARED_MARKET_PORTFOLIO_AUTHORITY_UNVERIFIED`. No merged shared verifier can
currently authenticate WC, native BTC, and native ETH settlement under one
canonical source contract, so the reference does not manufacture that claim.

## Result boundary

Every inspection result is `discovery_authority_hold`. Claimed participant
count, commitment root, quote reserve, and price remain explicitly prefixed
`claimed_`. The result records:

- `participant_commitment_provenance_verified=false`;
- `quote_settlement_source_verified=false`;
- `quote_reserve_custody_verified=false`;
- `void_reserve_custody_verified=false`;
- `opening_price_source=caller_supplied_unverified_assertion`; and
- `opening_price_source_verified=false`.

It also records `claimed_protocol_quote_seed_units="0"` and
`zero_protocol_quote_seed_required=true`; these are policy invariants, not
funding or custody evidence.

Each result also records the policy-derived `claimed_quote_settlement_asset` and
`quote_settlement_asset_consistent=true`. These mean only that the caller's
self-authored settlement rows use `WC`, `BTC`, or `ETH` consistently with their
approved pair.

The closed source profiles require:

- WC/VOID: `void-work-credit-ledger` + `ledger-credit`;
- BTC/VOID: `bitcoin-mainnet` + `native`;
- ETH/VOID: `ethereum-mainnet` + `native`.

Quote amounts are atomic integers in a closed unit profile:

- WC/VOID: `wc`, 0 decimal places;
- BTC/VOID: `satoshi`, 8 decimal places;
- ETH/VOID: `wei`, 18 decimal places.

The unit label and decimal count are included in every settlement digest. A
numerically equal string cannot move between WC, satoshi, or wei accounting.
This prevents scale ambiguity in commitment sums, settlement conservation, and
the reserve-ratio price without introducing floating-point arithmetic.

The selected profile is included in each settlement digest. Re-hashing cannot
turn Bitcoin testnet BTC, wrapped BTC, an ERC-20 token, or a non-ledger WC claim
into the approved quote source. The result records
`quote_settlement_source_profile_consistent=true` while retaining
`quote_unit_profile_consistent=true`, `quote_units_are_atomic=true`, and
`settlement_source_event_binding_self_consistent=true`, while retaining
`quote_settlement_source_adapter_implemented=false` and
`quote_settlement_source_verified=false`. A profile is a deterministic
configuration requirement, not a canonical per-asset settlement-source
adapter.

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
presale-closeout verification, authenticated settlement/custody, and activation
remain separate reviewed seams. Conventional
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
rejection of `USDC_VOID`, order-independent commitment aggregation,
commitment tampering, duplicate commitment replay, count mismatch, and
quote-sum mismatch, plus order-independent one-to-one settlement accounting,
duplicate settlement replay, claimed transfer-reference reuse, multiple
settlements per commitment, unknown or missing commitments, and settlement
amount drift. The portfolio proof additionally covers order independence, exact
three-market membership, the `30,000,000 VOID` claimed allocation total,
missing/duplicate markets, cross-market settlement-reference replay, and
fail-closed portfolio admission. Dedicated negative controls reject any nonzero
protocol quote seed and any mismatch between participant-supplied quote units
and the complete claimed quote reserve. A dedicated negative control also
re-hashes a BTC/VOID settlement mislabeled as ETH and requires fail-closed asset
rejection. Further controls reject Bitcoin testnet, wrapped/ERC-20 ETH, and
non-ledger WC source-profile substitutions even after their settlement IDs are
recomputed. Unit controls likewise reject BTC labeled as wei, ETH carrying
8-decimal scaling, and WC carrying 18-decimal scaling after re-hashing. A
source-event join control changes an opaque settlement reference and recomputes
the outer settlement digest but requires rejection because the bound join
identifier no longer matches.

## Settlement adapter query boundary

The source-event identity is projected into an order-independent, closed
adapter-query set. Each generated query contains only the exact pair, source
profile, atomic unit, commitment, expected amount, opaque settlement reference,
and `settlement_source_event_id` already validated by the settlement inspector.
The query set has a deterministic content root and count.

This is an outbound interface contract, not an inbound authority path.
`adapter_query_contract_closed=true` and `adapter_response_accepted=false`.
Settlement assertions cannot carry an adapter response or a `verified` boolean;
unknown fields fail the existing exact-shape gate. Consequently a caller cannot
promote a self-authored query result into settlement, finality, custody, reserve,
or activation authority. A future per-asset adapter and its response verifier
must be separately reviewed before any such result can be admitted.
