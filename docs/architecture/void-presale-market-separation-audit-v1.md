# VOID Presale / Market Separation Audit V1

Marker: `VOID_PRESALE_MARKET_SEPARATION_AUDIT_V1`

Base reviewed: `b818ee87d83f794cbf198951d248a89e7124712c`

This audit separates the unchanged existing presale lane from the approved
dynamic market lanes. It preserves historical and test evidence and does not
rewrite completed transactions or presale policy.

## Presale boundary

The presale lane stays exactly as it is. This audit does not change:

- presale source or economics;
- USDC payment flow;
- presale inventory rules;
- request/intake behavior;
- settlement behavior;
- proofs and fixtures;
- fulfillment behavior; or
- presale activation and safety gates.

Months of presale engineering remain intact. Historical Buy VOID operator/test
canaries, receipts, recovery records, and proof artifacts remain chronology and
regression-test evidence.

The presale remains its existing `10,000,000 VOID` economic lane. Its price and
USDC accounting do not set, peg, or back WC/VOID, BTC/VOID, or ETH/VOID.

## Launch order

The presale comes first because it is the funding lane.

WC/VOID, BTC/VOID, and ETH/VOID must not activate until formal presale closeout.
Presale closeout does not automatically activate them; each market remains behind
its own exact-green implementation and activation gate.

This prevents the post-presale markets from competing with or arbitraging the
fixed-price presale while the funding lane is active.

## WC/VOID findings

### Must not remain current market-price authority

- `ops/private/wc-to-void-settlement-preview-v1.sh`
  - currently defaults `VOID_WC_TO_VOID_RATE_WC_PER_VOID` to `100`;
  - that fallback is incompatible with market-priced WC/VOID;
  - replacement must consume actual market quote/state and have no fixed fallback.
- `ops/mainnet0/wc-devnet-bootstrap-proof.sh`
  - embeds `WC_PER_VOID = 100` and seeds both sides;
  - that bootstrap is not the one-sided VOID-only launch design.
- `ops/wc-smoke.sh`
  - asserts `wc_per_void=100`;
  - replacement must validate a dynamic quote rather than a chosen fixed price.

### Already useful for the market

- `src/http/workcredits-devnet.ts` reports WC/VOID price from reserve state.
- `ops/void-workcredits-devnet-quote.sh` contains reserve-based pricing math.
- `ops/wc-relayer-v1.cjs` quotes WC->VOID and VOID->WC from reserves and applies
  price impact/slippage handling.

Those components are reusable, but the launch path still needs one-sided opening
price discovery because the protocol supplies `0 WC`.

### Preserve historical/test evidence

Prior WC->VOID canary and settlement records containing values such as `100 WC`
and `1.000000 VOID` remain exact historical evidence. They must not be rewritten
and they do not define the current WC/VOID market price.

Unrelated fixed WC work awards are work-payment amounts, not exchange rates.

## Approved market lanes

Canonical market policy is `docs/architecture/void-market-distribution-policy-v1.md`:

- WC/VOID: `10,000,000 VOID`, `0 WC` protocol seed;
- BTC/VOID: `10,000,000 VOID`, `0 BTC` protocol seed;
- ETH/VOID: `10,000,000 VOID`, `0 ETH` protocol seed;
- no fixed opening price for any of the three pairs;
- quote assets come from market participants;
- each market pays out only real quote assets it actually holds; and
- presale USDC does not back the markets.

Together with the unchanged `10,000,000 VOID` presale lane, the four approved
economic lanes account for `40,000,000 VOID` of premine purpose allocation.

## USDC/VOID remains undecided

A post-presale USDC/VOID market is a candidate only. It is not approved, has
`0 VOID` allocated, and is not part of the canonical `40,000,000 VOID` total.

If separately approved later, the contemplated shape is:

- `10,000,000 VOID` protocol inventory;
- `0 USDC` protocol seed;
- market-supplied USDC;
- market-discovered opening price; and
- activation only after presale closeout and a separate exact-green gate.

That future decision would raise the economic-lane total to `50,000,000 VOID`
and requires a new allocation amendment. The existing presale's use of USDC does
not itself authorize a USDC/VOID market.

## Settlement reuse

Finality checks, duplicate protection, append-only journals, participant binding,
bounded execution, receipts, post-state proofs, and related settlement machinery
remain reusable for Datanet and the approved market lanes where their assumptions
remain valid.

Native BTC requires a Bitcoin-specific finality/settlement adapter. Ethereum
observation/finality machinery may be reused for native ETH only where genuinely
asset-agnostic.

## Implementation priority

1. Leave the presale lane unchanged and finish/operate it under its existing gates.
2. Keep WC/VOID, BTC/VOID, and ETH/VOID inactive until presale closeout.
3. Retire/supersede executable fixed-rate WC market assumptions.
4. Implement shared one-sided opening price discovery and AMM behavior for
   WC/VOID, BTC/VOID, and ETH/VOID.
5. Reuse verified settlement/finality/journal components under the appropriate
   asset-specific adapters.
6. Keep USDC/VOID as an undecided candidate until a separate policy approves it.
7. Fund or activate nothing without its separate exact-green gate.

No item in this audit authorizes a merge, deployment, wallet action, liquidity
movement, presale action, market activation, or treasury transfer.
