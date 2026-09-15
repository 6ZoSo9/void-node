# VOID Market Distribution Policy V1

Marker: `VOID_MARKET_DISTRIBUTION_POLICY_V1`

Status: source-only policy. No deployment, wallet access, signing, transaction
broadcast, liquidity movement, treasury transfer, presale activation, or market
activation is authorized by this document.

## Scope

This policy preserves the existing presale funding lane and establishes three
separate one-sided market lanes. Existing VOID supply, emissions, validator,
treasury, Work Credits, governance, and Chain-2050 rules remain unchanged unless
a separate policy explicitly changes them.

Canonical supply remains:

- maximum supply: `666,666,666 VOID`;
- premine: `333,333,333 VOID`;
- non-premined emissions supply: `333,333,333 VOID` released by the existing
  protocol emission rules over 100 years.

The current premine distribution target reserves `40,000,000 VOID` across four
separate economic lanes:

- `10,000,000 VOID` for the existing presale inventory;
- `10,000,000 VOID` for WC/VOID market inventory;
- `10,000,000 VOID` for BTC/VOID market inventory; and
- `10,000,000 VOID` for ETH/VOID market inventory.

## Presale lane

The presale is retained as a separate funding lane. It is not a price oracle for
WC/VOID, BTC/VOID, or ETH/VOID and its inventory must not be silently shared with
those markets.

The existing reviewed presale economics remain the presale source of truth:

- finite presale inventory: `10,000,000 VOID`;
- accepted payment asset under the existing lane: USDC;
- fixed presale rate: `2 VOID per 1 USDC`, equivalent to `0.50 USDC per VOID`;
- existing verified-payment, duplicate-protection, buyer-binding, allocation,
  bounded-execution, receipt, and settlement gates remain applicable.

This document does not itself enable public presale intake, fund a fulfillment
wallet, authorize a treasury transfer, or authorize a sale transaction. Runtime
activation remains a separate reviewed gate.

Historical presale source, proof, receipt, and canary artifacts remain
chronology/provenance and test evidence. They are not deleted or rewritten.

## Dynamic market lanes

The following are not current market policy for WC/VOID, BTC/VOID, or ETH/VOID:

- a fixed `100 WC = 1 VOID` conversion;
- any administrator-set WC/VOID opening price;
- any administrator-set BTC/VOID opening price;
- any administrator-set ETH/VOID opening price; or
- deriving any of those three opening prices from the presale's USDC price.

Historical WC settlement artifacts containing `100 WC -> 1 VOID` remain
chronology/provenance evidence and test records. They do not establish a current
WC/VOID market price.

## Market inventory targets

The current target is three separate one-sided market inventories funded with
premine VOID only:

| Market | Protocol-provided opening inventory | Quote asset provided by protocol |
| --- | ---: | ---: |
| WC/VOID | `10,000,000 VOID` | `0 WC` |
| BTC/VOID | `10,000,000 VOID` | `0 BTC` |
| ETH/VOID | `10,000,000 VOID` | `0 ETH` |

The protocol does not mint, buy, or seed WC, BTC, or ETH to manufacture the
other side of any market. Market participants supply WC, BTC, and ETH through
real trades.

## Price discovery

None of the three markets has a fixed opening price.

Each opening mechanism must discover its first clearing price from real market
orders or commitments. After opening price discovery, the approved AMM must
price swaps dynamically from market state and real reserves.

WC is inflationary accounting value earned through accepted work. Its exchange
rate against VOID is therefore market-priced and may move in either direction.
There is no permanent WC-to-VOID redemption ratio.

BTC/VOID and ETH/VOID are likewise market-priced. A USD market for BTC, ETH, or
VOID does not make USD an input to those canonical market-pricing mechanisms.
The presale's USDC price also does not set or peg any of the three market pairs.

The exact opening-auction and one-sided-AMM implementation is a separate
technical gate. This policy does not pretend that a conventional two-sided
constant-product pool can launch with zero quote-asset reserve.

## Solvency boundary

Any future virtual reserve used for pricing is accounting/math state only. It is
not WC, BTC, ETH, treasury property, or spendable liquidity.

A market may pay out only real quote assets actually held by that market. In
particular:

- WC paid out by WC/VOID must not exceed real WC held by the WC/VOID market;
- BTC paid out by BTC/VOID must not exceed real BTC held by the BTC/VOID market;
- ETH paid out by ETH/VOID must not exceed real ETH held by the ETH/VOID market;
- one market's quote reserves must not silently back another market; and
- market BTC or ETH is not automatically operating-treasury BTC or ETH.

Presale USDC is separate from all three market reserve ledgers and must not be
silently counted as WC/VOID, BTC/VOID, or ETH/VOID backing.

## Reuse of existing work

Keeping the presale also keeps the engineering already completed around payment
observation and safe settlement. Components such as source finality,
duplicate-payment protection, append-only journals, exact participant binding,
receipts, bounded execution, Datanet accounting, and public proof surfaces remain
valid work and may be reused where their assumptions remain valid.

Current implementation effort should not expand presale-specific features beyond
what is required to preserve, verify, safely operate, or close the existing
funding lane. New economic implementation work should focus on Datanet and the
WC/VOID, BTC/VOID, and ETH/VOID market structures.

For native ETH, Ethereum transaction/finality machinery may be adapted where it
is genuinely asset-agnostic, but USDC-specific pricing assumptions do not carry
into ETH/VOID market pricing. Native BTC still requires its own Bitcoin
settlement/finality adapter.

## Activation boundary

This policy does not fund the presale inventory, fund any 10,000,000-VOID market
inventory, activate the presale, or activate any market. Vault identity, market
code, opening price discovery, reserve accounting, signer authority, settlement
finality, slippage behavior, fees, recovery rules, and post-state proofs remain
separately reviewable gates.

`PROTECT THE CORE`.
