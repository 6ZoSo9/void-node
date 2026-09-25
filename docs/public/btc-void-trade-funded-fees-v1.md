# BTC/VOID Trade-Funded Native Fees V1

Marker: `VOID_BTC_VOID_TRADE_FUNDED_FEES_V1`

Status: source-only fee-envelope policy. No wallet, signer, RPC, transaction,
inventory reservation, market activation, or funds movement is authorized.

## Core invariant

Every BTC/VOID swap funds all native network costs from the assets already
inside that swap:

```text
Bitcoin network costs <- BTC leg
Chain-2050 execution costs <- VOID leg
```

There is no standing Bitcoin miner-fee reserve and no standing Chain-2050 gas
subsidy. An executable quote must fail before inventory reservation if either
leg cannot carry every bounded success/refund fee obligation.

This makes depletion fail-closed: the market cannot accept a trade that creates
an unfunded fee liability.

## Worst-case terminal budgeting

Funding/lock actions always occur once a swap becomes funded. Claim and refund
are mutually exclusive terminal paths, so V1 reserves the larger terminal
budget rather than double-counting both:

```text
bitcoin_worst_case_fee =
  bitcoin_funding_fee
  + max(bitcoin_claim_fee, bitcoin_refund_fee)

void_worst_case_fee =
  void_lock_cost
  + max(void_claim_cost, void_refund_cost)
```

The exact budgets are bound into the trade-funded quote identity before any
later executable reservation may exist.

## BTC -> VOID

The buyer's gross BTC budget pays its own Bitcoin costs first.

```text
gross BTC budget
- worst-case Bitcoin fee envelope
= conservative BTC input used by the reserve curve
```

The reserve curve returns a gross VOID amount. That VOID leg must itself cover
the complete Chain-2050 lock plus claim/refund reimbursement envelope:

```text
gross quoted VOID
- worst-case Chain-2050 fee envelope
= minimum net VOID delivered to the buyer
```

This allows a buyer starting with zero VOID to acquire their first VOID. A
future settlement implementation must carry the Chain-2050 executor
reimbursement inside that exact swap's VOID leg. An executor may front gas only
against already-bound per-swap reimbursement.

No general relayer wallet or treasury account acquires an open-ended gas debt.

## VOID -> BTC

The seller's gross VOID budget pays its Chain-2050 costs first:

```text
gross VOID budget
- worst-case Chain-2050 fee envelope
= VOID input used by the reserve curve
```

The gross BTC output then funds its own Bitcoin settlement costs:

```text
gross quoted BTC
- worst-case Bitcoin fee envelope
= minimum net BTC delivered to the seller
```

If the remaining BTC would fall below the configured terminal dust/minimum
output floor, the quote fails.

## Protocol swap fee

The official executable BTC/VOID policy also requires a **50 basis point
(0.50%) protocol swap fee**.

This is the existing constant-product input fee made explicit and fail-closed;
it is not a second fee layered on top of the reserve curve.

The fee is applied to the curve-priced input only after the trade has funded its
own native-network fee envelope:

```text
BTC -> VOID:
  gross BTC
  - Bitcoin success/refund fee envelope
  = curve-priced BTC
  - 0.50% protocol fee effect retained by the curve

VOID -> BTC:
  gross VOID
  - Chain-2050 success/refund fee envelope
  = curve-priced VOID
  - 0.50% protocol fee effect retained by the curve
```

The protocol fee remains in the **input-side market reserve**. It is market
equity: it is not automatically swept to OpsTreasury and it is not available to
sponsor Bitcoin fees or Chain-2050 gas for another trade.

For launch V1, any executable request whose `market_policy.fee_bps` is not
exactly `50` fails closed. A trade whose nominal fee would retain less than one
whole input atomic unit also fails closed.

The protocol fee improves reserve resilience but does not promise infinite
liquidity. Sustained one-way order flow can still approach an output-reserve
floor; when that happens the existing reserve-floor rule stops new executable
quotes instead of allowing the market to drain to zero.

## Reserve interaction

Only the fee-net amount participates in market price/inventory accounting.

For BTC -> VOID, confirmed BTC reaching the market reserve is already net of
that swap's Bitcoin network costs.

For VOID -> BTC, the market's gross BTC reserve debit includes the user's
trade-specific Bitcoin fee budget; the user receives the remainder.

The legacy reserve-policy field:

```text
bitcoin_network_fee_reserve_sats
```

is retained only as a closed-schema compatibility field and must be exactly
`0`. Any nonzero value fails closed.

The official buyback reserve therefore classifies settled BTC only as:

```text
confirmed BTC received net of trade fees
  = active buyback budget
  + retained spread equity
```

## "Never runs out" meaning

No finite system can promise infinite liquidity or network liveness. The
enforceable invariant is stronger and testable:

- no executable swap depends on an unbounded shared gas wallet;
- no executable swap depends on a standing BTC miner-fee pot;
- every accepted swap reserves enough BTC for either Bitcoin claim or refund;
- every accepted swap reserves enough VOID for either Chain-2050 claim or
  refund plus the required lock action;
- fee-fraction caps can reject pathological fee environments;
- configured net-output and Bitcoin dust/minimum floors are enforced;
- reserve floors remain enforced by the underlying deterministic quote math;
- every executable swap pays the fixed 50 bps protocol fee into the input-side
  market reserve;
- protocol-fee equity cannot automatically leave the market or subsidize another
  trade's network costs;
- a fee spike that no longer fits the bound envelope makes the quote
  non-executable instead of spending shared reserves.

Already-bound swaps must preserve their reserved success/refund fee envelopes
through shutdown and restart recovery.

## No hidden relayer fee

This policy contains no sponsorship premium and no service fee.

A future executor reimbursement is bounded to the trade's Chain-2050 fee
envelope and exists only to let an executor front gas for that already-funded
swap. It is not a relayer profit mechanism.

## Source boundary

The reference tool:

```text
tools/void-btc-void-trade-funded-fees-v1.mjs
```

wraps the existing deterministic reserve-curve quote math. It performs no live
network observation and grants no execution authority.

The next implementation gate is executable reservation binding: one exact
reserve snapshot, one exact trade-funded fee quote, one exact atomic-settlement
contract, and durable in-flight fee-liability accounting.
