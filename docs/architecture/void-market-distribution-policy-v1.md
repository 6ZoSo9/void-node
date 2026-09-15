# VOID Market Distribution Policy V1

Marker: `VOID_MARKET_DISTRIBUTION_POLICY_V1`

Status: source-only policy. No deployment, wallet access, signing, transaction
broadcast, liquidity movement, treasury transfer, or market activation is
authorized by this document.

## Scope

This policy changes one distribution decision only: the fixed-price VOID
presale is retired. Existing VOID supply, emissions, validator, treasury,
Work Credits, governance, and Chain-2050 rules remain unchanged unless a
separate policy explicitly changes them.

Canonical supply remains:

- maximum supply: `666,666,666 VOID`;
- premine: `333,333,333 VOID`;
- non-premined emissions supply: `333,333,333 VOID` released by the existing
  protocol emission rules over 100 years.

## Retired fixed-price paths

The following are not current VOID policy:

- a USD- or USDC-denominated fixed-price presale;
- `$0.50 per VOID` or any other administrator-set fiat sale price;
- a fixed `100 WC = 1 VOID` conversion;
- any other administrator-set WC/VOID opening price;
- any administrator-set BTC/VOID opening price.

Historical source, proof, receipt, and canary artifacts that contain those
values remain chronology/provenance evidence. They do not establish a current
price or authorize new intake, settlement, fulfillment, or sale activity.

## Market inventory targets

The current target is two separate one-sided market inventories funded with
premine VOID only:

| Market | Protocol-provided opening inventory | Quote asset provided by protocol |
| --- | ---: | ---: |
| WC/VOID | `10,000,000 VOID` | `0 WC` |
| BTC/VOID | `10,000,000 VOID` | `0 BTC` |

The protocol does not mint, buy, or seed WC or BTC to manufacture the other
side of either market. Market participants supply WC and BTC through real
trades.

## Price discovery

Neither market has a fixed opening price.

The opening mechanism must discover its first clearing price from real market
orders or commitments. After opening price discovery, the approved AMM must
price swaps dynamically from market state and real reserves.

WC is inflationary accounting value earned through accepted work. Its exchange
rate against VOID is therefore market-priced and may move in either direction.
There is no permanent WC-to-VOID redemption ratio.

BTC/VOID is likewise market-priced. A USD market for BTC or VOID does not make
USD an input to VOID's canonical market policy.

The exact opening-auction and one-sided-AMM implementation is a separate
technical gate. This policy does not pretend that a conventional two-sided
constant-product pool can launch with zero quote-asset reserve.

## Solvency boundary

Any future virtual reserve used for pricing is accounting/math state only. It is
not WC, BTC, treasury property, or spendable liquidity.

A market may pay out only real quote assets actually held by that market. In
particular:

- WC paid out by WC/VOID must not exceed real WC held by the WC/VOID market;
- BTC paid out by BTC/VOID must not exceed real BTC held by the BTC/VOID market;
- one market's quote reserves must not silently back the other market;
- market BTC is not automatically operating-treasury BTC.

## Reuse of existing work

Retiring the presale does not discard the engineering already completed around
payment observation and safe settlement. Components such as source finality,
duplicate-payment protection, append-only journals, exact participant binding,
receipts, bounded execution, Datanet accounting, and public proof surfaces may
be reused where their assumptions remain valid.

Presale-specific economics, fixed-price quoting, USDC sale intake, and
presale-only naming are legacy surfaces and must not be treated as authority for
new market implementation.

## Activation boundary

This policy does not fund either 10,000,000-VOID market inventory and does not
activate either market. Vault identity, market code, opening price discovery,
reserve accounting, signer authority, settlement finality, slippage behavior,
fees, recovery rules, and post-state proofs remain separately reviewable gates.

`PROTECT THE CORE`.
