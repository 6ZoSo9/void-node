# Shared market post-discovery state v1

This source-only reference inspects a caller-supplied output attributed to a
future one-sided opening-price-discovery mechanism. It can establish internal
arithmetic consistency, but it does not admit that assertion as participant or
reserve truth. It is shared by the approved `WC_VOID`, `BTC_VOID`, and
`ETH_VOID` markets.

It does not implement an auction, choose a price, activate a market, fund
inventory, provision liquidity, or authorize a transaction.

### WC/VOID compatibility HOLD

This V1 inspector still assumes that a post-discovery market retains the full
`10,000,000 VOID` allocation. That assumption is **superseded for WC/VOID** by
the coupled-opening 5M/5M batch design:

```text
initial WC/VOID allocation = 10,000,000 VOID
opening participant tranche = 5,000,000 VOID
post-opening retained reserve = 5,000,000 VOID
```

Therefore this shared V1 inspector must not be used as production WC/VOID
post-discovery authority. Its existing WC fixtures remain historical/source
regression evidence until a versioned shared model is reconciled. BTC/VOID and
ETH/VOID semantics are not changed by that WC-specific supersession.

## Inspection contract

Admission requires all of the following:

- an approved pair; `USDC_VOID` and every unknown pair fail closed;
- a content-addressed presale-closeout reference identifier;
- a content-addressed discovery receipt bound to the pair, claimed presale
  closeout, and participant commitment-set root;
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

The assertion digest covers the pair, claimed presale-closeout reference,
commitment root, participant count, both reserve-source amounts, both reserves,
and clearing-price ratio. Replaying that digest with a different pair, closeout,
root, reserve, or price fails closed. Because the digest is self-computed,
it proves only byte integrity and internal consistency. It does not prove that
any participant, commitment, payment, or real quote reserve exists.

Commitment accounting is deterministic and order-independent. Every assertion
binds its pair, claimed participant identifier, and positive quote units.
Duplicate commitment IDs, cross-pair membership, changed payloads, count
mismatch, root mismatch, quote-sum mismatch, and uint256 overflow fail closed.
This closes internal conservation and replay ambiguity without converting
self-authored records into participant identity or reserve-custody authority.

All canonical ordering uses direct JavaScript string code-unit comparison.
Neither adapter-query roots nor shared-portfolio maps depend on host locale,
ICU data, or `String.prototype.localeCompare`. The proof disables
`localeCompare` while producing both structures and requires identical
canonical order, closing a cross-runtime replay and root-divergence seam.

All content digests use a closed canonical encoder over reviewed own enumerable
data descriptors. The encoder serializes supported primitives, arrays, and
objects directly and never invokes inherited `toJSON` hooks. The proof installs
a hostile `Object.prototype.toJSON` that targets adapter-query sets and still
requires different presale-closeout references to produce different roots.

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

That fixed 30M retained-reserve claim is now explicitly **non-production for
WC/VOID** because the WC coupled-opening design retains 5M after allocating the
5M participant tranche. A future version must make post-discovery reserve size
pair-specific before shared portfolio state can be production authority.

All three assertions must bind the same claimed presale-closeout reference.
A portfolio assembled from otherwise valid market assertions carrying
different closeout identifiers fails with
`SHARED_MARKET_PRESALE_CLOSEOUT_MISMATCH`. This prevents one market's opening
state from being replayed into a portfolio for a different claimed closeout.
Identifier equality is only deterministic namespace consistency: it does not
authenticate the closeout, prove finality, close the presale, or activate any
market.

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

The result records `discovery_closeout_reference_bound=true`. This means the
receipt content address and enclosing request name the same claimed closeout;
it does not authenticate the closeout or establish presale closure.

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

No qualifying presale-closeout source adapter exists in current source. Its
shared configuration therefore exposes `adapter_contract_id=null`,
`response_verifier_implemented=false`, `independently_reviewed=false`, and
`configured=false`. Response admission checks that configuration before
touching caller-controlled data and fails with
`PRESALE_CLOSEOUT_SOURCE_ADAPTER_UNCONFIGURED`. A malicious Proxy control proves
that an unconfigured response is neither read nor enumerated. This wall cannot
close the presale or grant activation authority; it reserves the seam for a
separately reviewed canonical source/finality verifier.

The outbound closeout-source query is a closed deterministic projection of the
already-inspected three-market portfolio. It binds the one claimed shared
presale-closeout reference and the exact WC/VOID, BTC/VOID, and ETH/VOID
discovery-receipt identifiers into `query_id`. Reordering the portfolio leaves
the query unchanged; changing any internally valid receipt changes the query
identity. The receipt map is frozen, the approved-market count is exactly
three, and both `adapter_response_accepted` and
`presale_closeout_authority_verified` remain `false`. This query is an outbound
join contract for a future verifier, not proof that a closeout occurred.

A closed response envelope binds one claimed closeout-source event identifier to
one exact `query_id`, and its `response_id` digests both values. An unchanged
response cannot be replayed against a different receipt-set query; inspection
fails with `PRESALE_CLOSEOUT_SOURCE_RESPONSE_QUERY_MISMATCH`. Successful
inspection establishes only self-consistent query/response bytes. It reports
`source_event_verified=false`, `finality_verified=false`,
`presale_closed=false`, and `activation_authority=false`. Because the adapter
remains unconfigured, production response admission still rejects before
reading response data; this envelope cannot manufacture source or finality
authority.

Response-set accounting accepts an exact expected query-ID set and requires one
self-consistent response for every query. The sorted query IDs produce a
domain-separated `expected_query_set_id`, which is included in the response-set
digest. Canonical ordering makes both identities independent of caller order,
while changing any expected query changes the namespace. Duplicate expected
query IDs, duplicate response IDs, more than one response for a query, reuse of
one claimed source-event ID, unknown query membership, and missing responses
fail closed. Query and response arrays use the same descriptor-derived dense
array validation as the market evidence paths, so index accessors fail without
execution. This is replay and join accounting over unverified assertions only:
the set reports source-event verification, finality, presale closure, and
activation authority as false, and does not bypass the unconfigured production
adapter wall.

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
tampering, cross-pair replay, re-hashed cross-closeout receipt substitution,
invalid closeout identity, unknown request fields,
rejection of `USDC_VOID`, order-independent commitment aggregation,
commitment tampering, duplicate commitment replay, count mismatch, and
quote-sum mismatch, plus order-independent one-to-one settlement accounting,
duplicate settlement replay, claimed transfer-reference reuse, multiple
settlements per commitment, unknown or missing commitments, and settlement
amount drift. The portfolio proof additionally covers order independence, exact
three-market membership, the `30,000,000 VOID` claimed allocation total,
missing/duplicate markets, mixed presale-closeout references, cross-market
settlement-reference replay, and
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

Closeout-source response controls additionally prove order-independent response
and expected-query-set identity, exact one-to-one query coverage, namespace
change when an expected query changes, and rejection of duplicate query IDs,
duplicate response IDs, repeated responses for one query, reused claimed
source-event IDs, unknown query membership, and missing responses. Throwing
index-getter controls for both query and response arrays prove rejection before
caller code executes. Every successful aggregate remains non-authoritative and
leaves closeout, settlement, custody, activation, and transaction authority
false.

## Settlement adapter query boundary

The source-event identity is projected into an order-independent, closed
adapter-query set. Each generated query contains only the exact pair, source
profile, atomic unit, commitment, expected amount, opaque settlement reference,
the claimed shared presale-closeout reference, and
`settlement_source_event_id` already validated by the settlement inspector.
The query set has a deterministic content root and count. Changing only the
closeout reference changes that root, so a future response cannot be replayed
from one claimed closeout namespace into another.

The closeout binding remains content-addressed and unverified. It proves query
namespace consistency only; it does not prove closeout authenticity or
finality, participant settlement, custody, or market activation.

This is an outbound interface contract, not an inbound authority path.
`adapter_query_contract_closed=true` and `adapter_response_accepted=false`.
Settlement assertions cannot carry an adapter response or a `verified` boolean;
unknown fields fail the existing exact-shape gate. Consequently a caller cannot
promote a self-authored query result into settlement, finality, custody, reserve,
or activation authority. A future per-asset adapter and its response verifier
must be separately reviewed before any such result can be admitted.

No qualifying adapter exists in current source. Configuration therefore exposes
all three approved pairs with `adapter_contract_id=null`,
`response_verifier_implemented=false`, `independently_reviewed=false`, and
`configured=false`. Adapter-response admission checks this configuration before
touching response bytes or object properties and fails with
`OPENING_QUOTE_SETTLEMENT_ADAPTER_UNCONFIGURED`. The proof supplies a malicious
Proxy response and demonstrates that neither property access nor enumeration is
attempted before the configuration HOLD. This prevents unreviewed response
formats, getters, or caller booleans from becoming an accidental authority
surface.

Every market, source-requirement, and adapter-configuration lookup requires an
owned key before indexing its frozen map. Inherited ordinary-object names are
not markets. Dedicated controls require `toString`, `constructor`, and
`__proto__` to fail with `UNAPPROVED_MARKET` across configuration inspection,
commitment aggregation, and full market-state inspection.

All request, discovery-receipt, commitment, and settlement envelopes must be
plain or null-prototype objects containing exactly the listed enumerable data
properties. Accessor properties, symbol keys, non-enumerable fields, and custom
prototypes fail the existing shape error before any declared field value is
read. Validation returns a frozen null-prototype snapshot populated solely from
the reviewed owned data-descriptor values; every subsequent field read uses that
snapshot rather than the caller's original object. The proof replaces a required
field at each envelope layer with a throwing getter and verifies rejection
without executing it; it also rejects a top-level request with a custom
prototype. Dedicated request, receipt, commitment, settlement, and closeout
response Proxy controls prove that a caller-controlled `get` trap is not
executed after descriptor validation. The five exported receipt, commitment,
settlement, settlement-source-event, and closeout-response content-ID helpers
apply the same exact-shape descriptor snapshot before hashing; direct transparent
Proxy controls prove that these public helpers produce the ordinary-object ID
without invoking a caller-controlled `get` trap. JavaScript meta-object inspection can
still invoke Proxy prototype, key, or descriptor traps, so external bytes should
be parsed into ordinary data before invoking this module; this change closes the
reviewed post-validation property-read seam rather than claiming arbitrary Proxy
inertness.

Commitment, settlement, and portfolio containers are separately validated
before any indexed element is read. They must be ordinary arrays with a
standard array prototype, a bounded integer length, complete dense indices,
and no extra string or symbol keys. Every index must be an enumerable data
property. Validation builds a descriptor-derived snapshot and all later
accounting uses that snapshot. Throwing index-getter controls cover all three
container types and prove rejection without executing the getter. Additional
controls reject a custom array prototype, a sparse commitment array, and a
symbol-bearing commitment array. A separate control makes `localeCompare`
throw and proves adapter-query and portfolio canonicalization do not execute
locale-sensitive ordering. Another control installs an inherited `toJSON` hook
that attempts to collapse distinct closeout-bound query sets and proves their
roots remain distinct.
