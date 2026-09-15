# VOID Market Distribution Policy V1

Marker: `VOID_MARKET_DISTRIBUTION_POLICY_V1`

Status: source-only market policy overlay. No deployment, wallet access, signing,
transaction broadcast, liquidity movement, treasury transfer, presale action, or
market activation is authorized by this document.

## Scope

The existing presale lane is unchanged by this policy. Its source, economics,
USDC flow, inventory, proofs, settlement behavior, and activation gates remain
exactly where they already are and remain their own source of truth.

This policy adds/defines only the three approved market lanes alongside that
unchanged presale:

- WC/VOID;
- BTC/VOID; and
- ETH/VOID.

Canonical supply remains unchanged:

- maximum supply: `666,666,666 VOID`;
- premine: `333,333,333 VOID`;
- non-premined emissions supply: `333,333,333 VOID` released by the existing
  protocol emission rules over 100 years.

For allocation accounting, the existing `10,000,000 VOID` presale plus three
`10,000,000 VOID` market inventories equals `40,000,000 VOID` across the four
approved economic lanes.

## Launch order

The presale comes first.

WC/VOID, BTC/VOID, and ETH/VOID must not activate while the presale is still
open. Their market runtimes become eligible for separate activation review only
after formal presale closeout. This sequencing prevents an open market from
competing with or arbitraging against the fixed-price funding lane while the
presale is active.

Presale closeout does not automatically activate any market. Each market still
requires its own exact-green implementation, funding, settlement, and activation
gates.

## Market inventory targets

| Market | Protocol-provided opening inventory | Quote asset provided by protocol |
| --- | ---: | ---: |
| WC/VOID | `10,000,000 VOID` | `0 WC` |
| BTC/VOID | `10,000,000 VOID` | `0 BTC` |
| ETH/VOID | `10,000,000 VOID` | `0 ETH` |

The protocol supplies VOID only to these market inventories. Market participants
supply all WC, BTC, and ETH through real market activity.

The presale inventory and its USDC accounting remain separate from all three
market inventories and quote-asset reserves.

## Price discovery

None of the three approved market pairs has a fixed opening price.

In particular:

- there is no fixed `100 WC = 1 VOID` market conversion;
- there is no administrator-set WC/VOID opening price;
- there is no administrator-set BTC/VOID opening price;
- there is no administrator-set ETH/VOID opening price; and
- the presale price does not set, peg, or seed any of the three market prices.

Each market must discover its first clearing price from real participant orders
or commitments. After opening price discovery, the approved AMM prices swaps
dynamically from market state and real reserves.

WC is inflationary accounting value earned through accepted work, so its price
against VOID is market-driven and may move in either direction. BTC/VOID and
ETH/VOID are likewise market-driven.

The exact opening-auction and one-sided-AMM implementation is a separate
technical gate. A conventional two-sided constant-product pool is not treated as
already initialized when the real quote-asset reserve is zero.

## Solvency boundary

Any virtual WC, BTC, or ETH reserve used for pricing is math/accounting state
only and is never spendable liquidity.

A market may pay out only real quote assets actually held by that market:

- WC payout <= real WC held by WC/VOID;
- BTC payout <= real BTC held by BTC/VOID;
- ETH payout <= real ETH held by ETH/VOID.

The three quote reserves do not silently back each other, and presale USDC does
not silently back any market.

## USDC/VOID candidate -- not approved

A post-presale USDC/VOID market is under consideration but is not part of the
approved market allocation in this policy.

Current status:

- approved: `false`;
- allocated VOID: `0`;
- activated: `false`;
- contemplated inventory if separately approved: `10,000,000 VOID`;
- contemplated protocol USDC seed: `0 USDC`;
- contemplated opening price: market-discovered, not inherited from the presale.

If a future policy approves USDC/VOID on those terms, total VOID across presale
plus four 10,000,000-VOID market lanes would become `50,000,000 VOID`. Until
that separate decision is made, the canonical approved total remains
`40,000,000 VOID` and no USDC/VOID market inventory is reserved by this policy.

The fact that the presale accepts USDC does not automatically create, price, or
authorize a USDC/VOID market.

## Existing settlement work

No presale machinery is deleted by this policy. Existing finality checks,
duplicate protection, append-only journals, participant binding, bounded
execution, receipts, post-state proofs, and related settlement work remain
available for the presale itself and may also be reused for Datanet and the
three approved market lanes where their assumptions are valid.

Historical WC->VOID test/canary transactions remain exact test and provenance
records. Their historical amounts do not define the live WC/VOID market price.

New economic implementation priority is Datanet plus WC/VOID, BTC/VOID, and
ETH/VOID. The presale lane itself is left unchanged.

Native BTC requires a Bitcoin-specific settlement/finality adapter. Ethereum
observation/finality machinery may be reused for native ETH only where it is
actually asset-agnostic.

## Activation boundary

This policy funds nothing and activates nothing. Market vault identity, opening
price discovery, reserve accounting, signer authority, settlement finality,
slippage, fees, recovery, transaction construction, signing, broadcast, and
post-state evidence remain separately reviewed gates.

`PROTECT THE CORE`.
