# BTC/VOID Market-Maker Reserve Policy V1

Marker: `VOID_BTC_VOID_MARKET_MAKER_RESERVE_POLICY_V1`

The official post-presale BTC/VOID market is an active two-sided market maker,
not a one-way treasury sale. When the market sells native VOID for native BTC,
the confirmed BTC proceeds remain inside the segregated market reserve and
automatically create buying power for the reverse VOID-to-BTC direction.

## Native-pair pricing only

No USD, fiat currency, stablecoin price, wrapped-asset price, exchange price,
or external price oracle participates in quoting or spread calculation. The
market measures only native Bitcoin satoshis against native Chain-2050 VOID
atomic units. The spread is a dimensionless basis-point difference applied
directly to that BTC/VOID exchange, not a conversion through dollars.

For example, if one source lot sells **100 VOID for 1 BTC**, a 1% lower
same-lot buyback ceiling is **100 VOID for 0.99 BTC** before any separately
declared native-Bitcoin network-fee reserve. No USD value is calculated for
either asset. A partial buyback uses the same native BTC-per-VOID lot ratio.

The machine-readable request schema has no fiat or oracle field. Inputs such as
`usd_price`, `usd_value_cents`, a stablecoin quote, or an external market price
are unknown fields and fail closed.

## Sale-to-buyback cycle

Each terminally settled BTC-to-VOID sale creates one source-bound buyback lot:

1. BTC that is pending, reorg-exposed, refundable, or below the required
   confirmation count is not bid-eligible.
2. Once the native Bitcoin settlement is terminal and sufficiently confirmed,
   the complete received BTC amount is added to the market reserve.
3. A configured Bitcoin network-fee reserve is retained.
4. The remaining net proceeds create a buyback budget at an effective price
   below the source sale's effective BTC-per-VOID price.
5. The difference remains market-owned spread equity.
6. When the buyback lot fills, reacquired VOID returns to
   `BTCVoidMarketVault` and may be sold again through a new atomic settlement.

The `source_sale_id` is the SHA-256 identity of the exact immutable sale
content: direction, native Bitcoin funding transaction ID and output index,
Chain-2050 settlement-receipt ID, BTC received, and VOID sold. Altering any of
those fields while reusing the ID fails closed. Including the Bitcoin outpoint
prevents two distinct equal-amount sales from collapsing into one identity.
The stable `buyback_lot_id` is derived only from that verified source-sale
identity, so policy or later confirmation-observation changes cannot create a
second lot identity for one sale. `buyback_lot_plan_id` separately addresses
the complete derived plan, including confirmation evidence, spread, and
fee-reserve policy.

Without an already funded native-BTC market reserve, the pool cannot truthfully
publish a funded bid before it receives BTC. In that bootstrap mode, the first
confirmed sale creates the first buyback budget and every later eligible sale
adds another. If funded bids are required from the first market quote, a
separately approved native-BTC seed must exist before activation. This source
policy neither authorizes that seed nor allows presale inventory or receipts to
be silently repurposed for it.

The recommended initial minimum spread is **2%** (`200` basis points), separate
from explicit Bitcoin network-fee reserve. That recommendation is a source
policy value, not an activated mainnet parameter. A later governed policy may
change it without granting the operational signer arbitrary pricing authority.

For a settled sale receiving `B` satoshis for `V` VOID atomic units, fee reserve
`F`, and spread `S` basis points:

```text
net_proceeds = B - F
buyback_budget = floor(net_proceeds * (10000 - S) / 10000)
spread_equity = net_proceeds - buyback_budget
maximum_buyback_price = buyback_budget / V
```

For the complete source lot, `buyback_budget` must be lower than the BTC amount
received. Actual BTC output for a reverse quote must not exceed either the
constant-product curve quote or the remaining buyback-lot budget. This makes an
immediate same-lot round trip return less BTC than the buyer paid while keeping
reserve-curve pricing and inventory movement deterministic.

This rule does not claim that every future market bid remains below every
historical sale price. Reserve state and completed trades change the market.
The enforceable invariant is that each source sale's derived buyback lot has a
lower effective ceiling and cannot create a profitable immediate reversal.

## BTC classification

Every confirmed sale receipt is conserved across exactly three market-owned
classes:

```text
confirmed BTC received
  = active buyback budget
  + Bitcoin network-fee reserve
  + retained spread equity
```

The machine-readable contract emits
`automatic_ops_treasury_sweep_sats: 0`. Market BTC does not silently become
LLC cash or operating revenue. A later surplus withdrawal, if ever approved,
must be a separate governance action above published reserve and open-liability
floors; it cannot weaken pending settlements or active buyback lots.

## Safety and lifecycle

- Buy VOID presale inventory and receipts never enter this market.
- Only native BTC and native Chain-2050 VOID are supported.
- A verified source sale ID maps to exactly one stable buyback-lot ID.
- A different plan ID for an already journaled lot ID is a conflict and must
  return `HOLD`; it must never replace or add to the accepted lot budget.
- Open lot budgets cannot be double-reserved across reverse swaps.
- Shutdown stops new quotes while preserving settlement and refund capability.
- There is no leverage, borrowing, lending, margin, or unsecured credit.
- There is no automatic treasury refill or operations sweep.
- The source tool has no wallet or signer access and performs no RPC call,
  transaction construction, broadcast, reserve mutation, or fund movement.

The V1 tool derives a deterministic buyback-lot plan from already-settled input.
It proves source-content binding and stable lot identity but does not persist
first acceptance. A later durable lot journal must enforce create-once
`buyback_lot_id` insertion and reject a conflicting `buyback_lot_plan_id` before
any reserve mutation. Aggregate reserve snapshots, executable quote binding,
atomic fill settlement, and public receipts remain separately reviewed
implementation gates.
