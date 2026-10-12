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

The presale and WC/VOID launch together as the first economic opening.

Presale public intake and WC/VOID public market activation are coupled: neither
may open alone. WC/VOID must satisfy its own exact-green implementation,
funding, opening-price-discovery, settlement, and activation gates for the same
launch ceremony as the presale.

The presale price does not set, peg, or seed WC/VOID. The market retains
`10,000,000 VOID` protocol inventory, `0 WC` protocol quote seed, and
market-discovered price formation from real participant WC.

BTC/VOID and ETH/VOID remain inactive until formal presale closeout. Presale
closeout does not automatically activate them; each remains behind its own
exact-green implementation and activation gate.

## WC/VOID findings

### Retired fixed-price authority

The historical fixed-price WC/VOID v1 chain is retained only for exact regression replay and no longer has ordinary current market-price authority.

- `ops/private/wc-to-void-settlement-preview-v1.sh` and every downstream v1 approval/release/record entrypoint now fail closed unless the exact historical-replay capability `VOID_WC_TO_VOID_FIXED_RATE_V1_HISTORICAL_REPLAY=YES_REPLAY_RETIRED_FIXED_RATE_V1` is supplied.
- `ops/mainnet0/wc-devnet-bootstrap-proof.sh` still embeds the historical `WC_PER_VOID = 100` test pool, but it is replay-only behind the same retirement wall and is not the one-sided VOID-only launch design.
- `ops/wc-smoke.sh` still checks the historical 100:1 devnet fixture, but it is replay-only behind the same retirement wall.
- Ordinary invocation of any retired fixed-price entrypoint fails before fixed-price preview, approval, release, transaction request, or settlement-record logic can run.
- Explicit `make wc-devnet-bootstrap-historical-replay` and `make wc-smoke-historical-replay` targets exist only to preserve reproducible historical regression evidence.

A current WC/VOID implementation must consume actual market quote/state and must have no fixed-price fallback.

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

1. Finish the presale lane under its existing gates and couple its public opening
   to an exact-green WC/VOID activation in the same launch ceremony.
2. Keep WC/VOID market-priced and independent of the presale price, with no fixed
   WC-to-VOID redemption and no protocol WC seed.
3. Keep BTC/VOID and ETH/VOID inactive until presale closeout.
4. Retire/supersede executable fixed-rate WC market assumptions.
5. Implement or complete one-sided opening price discovery and AMM behavior for
   WC/VOID, BTC/VOID, and ETH/VOID under their applicable launch order.
6. Reuse verified settlement/finality/journal components under the appropriate
   asset-specific adapters.
7. Keep USDC/VOID as an undecided candidate until a separate policy approves it.
8. Fund or activate nothing without its separate exact-green gate.

No item in this audit authorizes a merge, deployment, wallet action, liquidity
movement, presale action, market activation, or treasury transfer.
