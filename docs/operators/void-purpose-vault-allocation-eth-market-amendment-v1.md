# VOID Purpose-Vault Allocation ETH/VOID Amendment V1

Marker: `VOID_PREMINE_PURPOSE_VAULT_ETH_MARKET_AMENDMENT_V1`

Status: source-only allocation amendment. No wallet, signer, transaction,
treasury transfer, liquidity movement, deployment, or market activation is
authorized by this document.

## Scope

This amendment changes only the future purpose-vault target by adding a third
one-sided market inventory for native ETH/native Chain-2050 VOID. It does not
change the premine total, emissions supply, validator policy, Work Credits,
governance, or Chain-2050.

For market-allocation arithmetic, this amendment supersedes the `Exact target`,
market-purpose, and market-activation portions of
`docs/operators/void-purpose-vault-allocation-v1.md` where that document lists
only WC/VOID and BTC/VOID.

## Amended exact target

| Custody purpose | Target VOID |
| --- | ---: |
| Core `VoidTreasury` reserve | 297,073,333 |
| `WCVoidMarketVault` | 10,000,000 |
| `BTCVoidMarketVault` | 10,000,000 |
| `ETHVoidMarketVault` | 10,000,000 |
| `OpsTreasury` | 5,000,000 |
| Validator stake target: 126 × 10,000 VOID | 1,260,000 |
| **Total premine** | **333,333,333** |

Relative to the reconciled custody recorded in the parent allocation document,
the future target deltas are now:

- 10,000,000 VOID for WC/VOID market inventory;
- 10,000,000 VOID for BTC/VOID market inventory;
- 10,000,000 VOID for ETH/VOID market inventory;
- 5,000,000 VOID for OpsTreasury; and
- 1,134,000 VOID for the already-recorded validator target shortfall.

The combined future target delta is `36,134,000 VOID`. If and only if those
separately gated future allocations are later approved and funded, the projected
core `VoidTreasury` reserve becomes `297,073,333 VOID`.

## ETH/VOID purpose boundary

`ETHVoidMarketVault` is one-sided native VOID inventory for the ETH/VOID market.
Its target is exactly `10,000,000 VOID`.

The protocol supplies:

- `10,000,000 VOID`; and
- `0 ETH`.

ETH must enter from market participants through real market activity. There is
no administrator-set ETH/VOID opening price and no USD-derived canonical price.
The opening price must be market-discovered under the same principle used for
WC/VOID and BTC/VOID.

Any virtual ETH reserve used by a future AMM is pricing/math state only and is
not spendable ETH. The ETH/VOID market may pay out only real ETH actually held
by that market. ETH reserves from ETH/VOID must not silently back WC/VOID or
BTC/VOID, and those markets must not silently back ETH/VOID.

## Settlement reuse

Presale retirement does not retire settlement engineering. Existing reusable
machinery around finality, duplicate protection, append-only journals,
participant binding, bounded execution, receipts, and post-state proof remains
eligible for reuse where its assumptions are valid.

For ETH/VOID, Ethereum-side transaction observation and finality work may be
adapted where it is genuinely asset-agnostic. Historical USDC-specific pricing,
checkout, and presale assumptions are test/history records only and are not
ETH/VOID market authority.

## Activation boundary

This amendment does not fund `ETHVoidMarketVault` and does not activate an
ETH/VOID market. Vault identity, native ETH settlement semantics, opening price
discovery, one-sided reserve accounting, AMM behavior, fees, slippage,
recovery, signing, broadcast, and post-state proof remain separate gates.

`PROTECT THE CORE`.
