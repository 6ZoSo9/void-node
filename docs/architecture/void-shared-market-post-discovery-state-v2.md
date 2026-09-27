# Shared market post-discovery state v2

Marker: `VOID_SHARED_MARKET_POST_DISCOVERY_STATE_V2`

Status: source-only reconciliation model. No market is activated and no inventory
is funded by this source.

## Why V2 exists

V1 remains useful historical evidence, but two assumptions are no longer current
production policy:

1. it treats `WC_VOID`, `BTC_VOID`, and `ETH_VOID` as if all three share
   one presale-closeout opening phase; and
2. it represents the 10,000,000-VOID per-market allocation using six-decimal
   VOID atoms.

Current canonical policy differs:

- WC/VOID opens in the same coupled ceremony as the presale and binds a
  `coupled_launch_id`;
- WC/VOID uses a 5,000,000-VOID participant tranche plus a 5,000,000-VOID
  retained post-opening reserve;
- BTC/VOID and ETH/VOID remain post-presale markets behind their own later
  settlement, funding, and activation gates; and
- canonical `VoidToken` uses 18 decimals at
  `0x470075b85352eb86f7d089fb9ba88945f12aad94`.

V2 preserves V1 as historical evidence rather than silently changing it.

## Reconciled portfolio model

The planned economic inventory remains 30,000,000 VOID total:

- WC/VOID planned inventory: 10,000,000 VOID;
- BTC/VOID planned inventory: 10,000,000 VOID;
- ETH/VOID planned inventory: 10,000,000 VOID.

For the coupled first opening, WC/VOID is split:

- participant opening tranche: 5,000,000 VOID;
- retained post-opening reserve: 5,000,000 VOID;
- settled real WC becomes the quote reserve;
- protocol WC seed remains 0.

BTC/VOID and ETH/VOID remain `post_presale_unopened`. Their 10M allocations are
planned inventory, not current live reserves and not activation authority.

After a successful WC opening but before BTC/VOID or ETH/VOID activation, the
model therefore accounts for:

- 5M VOID allocated to the WC opening cohort;
- 5M VOID retained by the WC/VOID market;
- 20M VOID still planned for the two unopened post-presale markets.

That is exact conservation of the 30M planned portfolio allocation.

## Explicitly retired V1 assumptions

V2 records:

- `legacy_v1_status=historical_not_production_authority`;
- `legacy_v1_six_decimal_void_atoms_authoritative=false`;
- `all_markets_share_one_presale_closeout=false`;
- `wc_void_uses_coupled_launch_id=true`;
- `btc_void_remains_post_presale=true`; and
- `eth_void_remains_post_presale=true`.

This is a model reconciliation only. V1 remains unchanged for regression and
historical evidence.

## Authority boundary

The V2 result keeps all value-bearing authority false:

- no runtime mutation;
- no wallet/signer/private-key access;
- no transaction construction, signing, or broadcast;
- no Chain-2050 write;
- no WC ledger write;
- no inventory funding;
- no liquidity movement;
- no market activation;
- no presale activation; and
- no funds movement.

Quote-reserve custody and VOID-reserve custody also remain unverified.

Verification:

```bash
node scripts/prove_void_shared_market_post_discovery_state_v2.mjs
```
