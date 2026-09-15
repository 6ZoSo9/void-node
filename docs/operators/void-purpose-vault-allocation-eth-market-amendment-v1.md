# VOID Purpose-Vault Allocation Market Expansion Amendment V1

Marker: `VOID_PREMINE_PURPOSE_VAULT_MARKET_EXPANSION_AMENDMENT_V1`

Status: source-only allocation amendment. No wallet, signer, transaction,
treasury transfer, liquidity movement, deployment, presale action, or market
activation is authorized by this document.

## Scope

The existing presale lane is unchanged. This amendment does not alter its source,
economics, USDC flow, inventory rules, proofs, settlement behavior, or activation
gates.

The existing purpose-vault target already contains:

- `10,000,000 VOID` for `PresaleInventoryVault`; and
- `10,000,000 VOID` for `BTCVoidMarketVault`.

This amendment adds two new 10,000,000-VOID market inventories alongside those
existing allocations:

- `WCVoidMarketVault`: `10,000,000 VOID`; and
- `ETHVoidMarketVault`: `10,000,000 VOID`.

The result is four approved 10,000,000-VOID economic lanes: presale, WC/VOID,
BTC/VOID, and ETH/VOID, for `40,000,000 VOID` total.

No supply, emissions, validator, governance, Work Credits issuance, or Chain-2050
rule changes are made here.

## Amended exact target

| Custody purpose | Target VOID |
| --- | ---: |
| Core `VoidTreasury` reserve | 287,073,333 |
| `PresaleInventoryVault` | 10,000,000 |
| `WCVoidMarketVault` | 10,000,000 |
| `BTCVoidMarketVault` | 10,000,000 |
| `ETHVoidMarketVault` | 10,000,000 |
| `OpsTreasury` | 5,000,000 |
| Validator stake target: 126 × 10,000 VOID | 1,260,000 |
| **Total premine** | **333,333,333** |

Relative to the reconciled custody recorded in the unchanged parent allocation
document, the future target deltas are:

- 10,000,000 VOID for the existing presale inventory;
- 10,000,000 VOID for the new WC/VOID market inventory;
- 10,000,000 VOID for the existing BTC/VOID market inventory;
- 10,000,000 VOID for the new ETH/VOID market inventory;
- 5,000,000 VOID for OpsTreasury; and
- 1,134,000 VOID for the already-recorded validator target shortfall.

The combined future target delta is `46,134,000 VOID`. If and only if those
separately gated future allocations are later approved and funded, the projected
core `VoidTreasury` reserve becomes `287,073,333 VOID`.

## Presale-first activation order

The presale is the first live economic lane.

WC/VOID, BTC/VOID, and ETH/VOID must remain inactive until formal presale
closeout. Presale closeout is necessary but not sufficient: each market still
requires a separate exact-green activation gate.

This ordering keeps the fixed-price funding lane from competing with the open
markets while the presale is being used to fund development.

## Presale boundary

`PresaleInventoryVault` is not modified by this amendment. All existing presale
rules remain in their existing source of truth. The presale inventory is not a
market pool and its USDC accounting does not back or price any of the three
approved market pairs.

## WC/VOID purpose boundary

`WCVoidMarketVault` is one-sided native VOID inventory for WC/VOID. Its target is
exactly `10,000,000 VOID`; protocol WC seed is `0 WC`.

WC must enter from market participants. There is no fixed WC/VOID market
conversion and no administrator-set opening price. The presale does not set or
peg WC/VOID.

## BTC/VOID purpose boundary

The existing `BTCVoidMarketVault` allocation remains `10,000,000 VOID`. Under
the market policy overlay, protocol BTC seed is `0 BTC` and BTC is supplied by
market participants. There is no administrator-set BTC/VOID opening price.

This amendment does not rewrite or delete the existing BTC market engineering;
it adds the common one-sided price-discovery principle for the market lane.

## ETH/VOID purpose boundary

`ETHVoidMarketVault` is one-sided native VOID inventory for native ETH/native
Chain-2050 VOID. Its target is exactly `10,000,000 VOID`; protocol ETH seed is
`0 ETH`.

ETH must enter from market participants. There is no administrator-set ETH/VOID
opening price and the presale does not set or peg ETH/VOID.

## USDC/VOID candidate boundary

A post-presale USDC/VOID market remains under consideration only.

It has no approved vault and consumes no VOID allocation in this amendment.
Current allocation is `0 VOID` and current activation is `false`.

If separately approved later under the same market principles, the contemplated
shape is `10,000,000 VOID` protocol inventory, `0 USDC` protocol seed, and a
market-discovered opening price independent of the presale price. That future
approval would raise the economic-lane total from `40,000,000 VOID` to
`50,000,000 VOID` and would require a new allocation amendment.

## Market solvency boundary

Any virtual WC, BTC, or ETH reserve used by a future AMM is pricing/math state
only and is not spendable liquidity. Each market may pay out only the real quote
asset actually held by that market. The three market reserve ledgers and presale
USDC accounting remain separate and cannot silently back each other.

## Settlement reuse

The existing presale and its settlement engineering remain intact. Finality,
duplicate protection, append-only journals, participant binding, bounded
execution, receipts, and post-state proofs remain reusable for Datanet and the
three approved market lanes where their assumptions are valid.

New market implementation work should focus on Datanet plus WC/VOID, BTC/VOID,
and ETH/VOID without requiring changes to the presale lane itself.

Native BTC requires Bitcoin-specific settlement/finality handling. Ethereum-side
observation/finality machinery may be reused for native ETH where the logic is
genuinely asset-agnostic.

## Activation boundary

This amendment funds nothing and activates nothing. Final vault identities,
market code, price discovery, reserve accounting, signer authority, settlement
finality, slippage, fees, recovery, transaction construction, signing,
broadcast, and post-state evidence remain separately reviewed gates.

`PROTECT THE CORE`.
