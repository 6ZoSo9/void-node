# VOID Purpose-Vault Allocation Market Expansion Amendment V1

Marker: `VOID_PREMINE_PURPOSE_VAULT_MARKET_EXPANSION_AMENDMENT_V1`

Status: source-only allocation amendment. No wallet, signer, transaction,
treasury transfer, liquidity movement, deployment, presale activation, or market
activation is authorized by this document.

## Scope

This amendment records the current future allocation target: retain the existing
10,000,000-VOID presale inventory and add three separate one-sided market
inventories for WC/VOID, BTC/VOID, and ETH/VOID at 10,000,000 VOID each.

It does not change the premine total, emissions supply, validator policy, Work
Credits issuance, governance, or Chain-2050.

For allocation arithmetic, this amendment supersedes earlier target tables that
listed only the presale, only two markets, or only three markets without the
presale.

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

The four economic lanes consume exactly `40,000,000 VOID` of future purpose
allocation: 10,000,000 presale plus 30,000,000 across the three markets.

Relative to the reconciled custody recorded in the parent allocation document,
the future target deltas are:

- 10,000,000 VOID for presale inventory;
- 10,000,000 VOID for WC/VOID market inventory;
- 10,000,000 VOID for BTC/VOID market inventory;
- 10,000,000 VOID for ETH/VOID market inventory;
- 5,000,000 VOID for OpsTreasury; and
- 1,134,000 VOID for the already-recorded validator target shortfall.

The combined future target delta is `46,134,000 VOID`. If and only if those
separately gated future allocations are later approved and funded, the projected
core `VoidTreasury` reserve becomes `287,073,333 VOID`.

## Presale boundary

`PresaleInventoryVault` remains the finite 10,000,000-VOID inventory for the
existing reviewed presale lane. It is separate from all market inventory and
market quote-asset reserves.

Keeping this allocation does not authorize a funding transfer, public intake,
fulfillment, wallet use, signing, or transaction. Those remain separately gated.
Historical test/canary transactions remain valid test and provenance records and
must not be rewritten.

## WC/VOID purpose boundary

`WCVoidMarketVault` is one-sided native VOID inventory for WC/VOID. Its target is
exactly `10,000,000 VOID`; protocol WC seed is `0 WC`.

WC must enter from market participants. There is no fixed WC/VOID conversion and
no administrator-set opening price. The presale's USDC price does not set or peg
WC/VOID.

## BTC/VOID purpose boundary

`BTCVoidMarketVault` is one-sided native VOID inventory for native BTC/native
Chain-2050 VOID. Its target is exactly `10,000,000 VOID`; protocol BTC seed is
`0 BTC`.

BTC must enter from market participants. There is no administrator-set opening
price and no presale-derived BTC/VOID price.

## ETH/VOID purpose boundary

`ETHVoidMarketVault` is one-sided native VOID inventory for native ETH/native
Chain-2050 VOID. Its target is exactly `10,000,000 VOID`; protocol ETH seed is
`0 ETH`.

ETH must enter from market participants. There is no administrator-set opening
price and no presale-derived ETH/VOID price.

## Market solvency boundary

Any virtual WC, BTC, or ETH reserve used by a future AMM is pricing/math state
only and is not spendable liquidity. Each market may pay out only the real quote
asset actually held by that market. The three market reserve ledgers and the
presale USDC ledger remain separate and cannot silently back each other.

## Settlement reuse

Preserving the presale also preserves the settlement engineering already built.
Finality, duplicate protection, append-only journals, participant binding,
bounded execution, receipts, and post-state proof remain reusable for Datanet
and the three market lanes where their assumptions are valid.

Current new implementation work should focus on Datanet plus WC/VOID, BTC/VOID,
and ETH/VOID. Presale-specific work should be limited to preservation, testing,
safety, and the existing funding lane rather than expanding into new economics.

For native ETH, Ethereum-side observation/finality machinery may be adapted
where genuinely asset-agnostic. Native BTC requires its own Bitcoin settlement
and finality adapter.

## Activation boundary

This amendment funds nothing and activates nothing. Final vault identities,
market code, price discovery, reserve accounting, signer authority, settlement
finality, slippage, fees, recovery, transaction construction, signing,
broadcast, and post-state evidence remain separately reviewed gates.

`PROTECT THE CORE`.
