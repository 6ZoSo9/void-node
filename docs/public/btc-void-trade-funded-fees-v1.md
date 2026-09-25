# BTC/VOID Trade-Funded Native Fees V1

Marker: `VOID_BTC_VOID_TRADE_FUNDED_FEES_V1`

Status: source-only fee-envelope policy. No wallet, signer, RPC, transaction,
inventory reservation, market activation, or funds movement is authorized.

## Core invariant

Bitcoin miner fees are trade-funded from the BTC leg.

The market base asset on Chain-2050 is canonical `VoidToken`. Its token balance
is **not** the same balance that pays Chain-2050 native transaction gas.
Therefore the `lock_void_atomic / claim_void_atomic / refund_void_atomic`
amounts in this V1 are a bounded **VoidToken economic charge envelope**, not a
proof that native gas has been paid.

```text
Bitcoin network costs <- BTC leg             [proven source policy]
VoidToken economic charge <- VoidToken leg   [bounded source policy]
Chain-2050 native gas <- separate native balance [UNRESOLVED]
```

There is no standing Bitcoin miner-fee reserve. BTC/VOID is not executable until
a separately reviewed native-gas model proves either sustainable replenishment
or a user-paid/native-gas path and binds that liability before inventory
reservation.

That native-gas model must also close the microscopic-trade grief boundary.
If a shared executor/paymaster bears mostly fixed Chain-2050 gas for arbitrarily
small swaps, an attacker can consume native-gas capacity without materially
moving inventory. V1 does not select a minimum trade here. A disclosed
policy-bound minimum, deterministic batching, direct user-paid native gas, or
another bounded mechanism may close the gate. Hidden minimums are not permitted.

Executable quote reservations have a separate hoarding boundary. Production
must bind a reservation TTL, a per-identity outstanding-reservation cap, and a
global outstanding-reservation cap before any reservation can lock output
inventory. Expiry removes settlement authority for that quote. Funding observed
after expiry enters deterministic reconciliation and cannot silently revive the
expired reservation.

## Opening-state prerequisite

The official BTC/VOID market allocation begins with `0 BTC` protocol quote
seed. The positive BTC reserve in this document's quote fixtures is therefore
not launch authority.

Before any executable fee quote can reserve inventory, the reserve snapshot
must derive from a separately verified opening-price discovery with real BTC
provenance, concentration/Sybil controls, and minimum quote depth. The fee
policy cannot bootstrap the initial price by itself.

## Opening-price authority

The fee wrapper is not opening-price authority. Its positive-reserve fixtures
exercise post-discovery quote math.

Because the official protocol BTC seed is zero, executable fee quotes remain
HOLD until an independently reviewed opening-discovery result produces the
initial real BTC reserve and exact reserve snapshot. The opening cohort/order
set must be bounded against first-arriver, concentration, Sybil, and
operator-selected-price manipulation, and must satisfy a reviewed minimum
real-BTC depth policy.

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

The reserve curve returns a gross `VoidToken` amount. V1 may subtract a
bounded token-denominated execution charge before computing the user's net
output:

```text
gross quoted VoidToken
- bounded VoidToken economic charge
= provisional net VoidToken output
```

That subtraction does **not** fund the executor's native gas balance. A buyer
starting with no Chain-2050 native gas therefore cannot yet be promised a
depletion-safe first purchase solely from this token charge. Before activation,
the exact settlement path needs a native-gas liability reservation plus a
sustainable replenishment or user-paid model.

## VOID -> BTC

The seller's gross `VoidToken` budget may carry the same bounded
token-denominated economic charge before curve pricing:

```text
gross VoidToken budget
- bounded VoidToken economic charge
= VoidToken input used by the reserve curve
```

The seller's native Chain-2050 transaction gas is still a separate liability;
this source policy does not convert `VoidToken` into native gas.

The gross BTC output then funds its own Bitcoin settlement costs:

```text
gross quoted BTC
- worst-case Bitcoin fee envelope
= minimum net BTC delivered to the seller
```

If the remaining BTC would fall below the configured terminal dust/minimum
output floor, the quote fails.

## Combined economic-charge review

Current source contains two separate market economics:

- the official AMM input protocol fee: **50 bps (0.50%)**; and
- the reserve-recycling/buyback policy spread: **100 bps (1%)** on eligible
  buyback-lot pricing.

They are not the same charge and they must not be described as one another.
Depending on direction and reserve-lot state, both may affect the user's
effective price. That combination has not yet been accepted as an executable
launch policy.

Before activation, one reviewed policy must explicitly decide whether both
components remain, and every executable quote must disclose:

- gross input;
- Bitcoin network-fee envelope;
- Chain-2050 native-gas payer/model;
- 0.50% protocol fee;
- applicable 1% buyback spread/ceiling effect, when relevant;
- reserve-curve price impact;
- minimum/net user output;
- quote expiration; and
- any other bounded settlement charge.

No quote may market the 0.50% fee as the user's complete cost while a separate
buyback spread also affects execution.

## Protocol swap fee

The official executable BTC/VOID policy also requires a **50 basis point
(0.50%) protocol swap fee**.

This is the existing constant-product input fee made explicit and fail-closed;
it is not a second fee layered on top of the reserve curve.

The fee is applied to the curve-priced input after the Bitcoin fee envelope and
the provisional VoidToken economic charge have been accounted for. It does not
prove or replenish Chain-2050 native gas:

```text
BTC -> VOID:
  gross BTC
  - Bitcoin success/refund fee envelope
  = curve-priced BTC
  - 0.50% protocol fee effect retained by the curve

VOID -> BTC:
  gross VOID
  - bounded VoidToken economic charge
  = curve-priced VoidToken
  - 0.50% protocol fee effect retained by the curve
```

The protocol fee remains in the **input-side market reserve**. It is market
equity and is not automatically swept to OpsTreasury. When the input asset is
`VoidToken`, that retained token value does not replenish the distinct
Chain-2050 native-gas balance by itself.

For launch V1, any executable request whose `market_policy.fee_bps` is not
exactly `50` fails closed. A trade whose nominal fee would retain less than one
whole input atomic unit also fails closed.

The protocol fee improves reserve resilience but does not promise infinite
liquidity. Sustained one-way order flow can still approach an output-reserve
floor; when that happens the existing reserve-floor rule stops new executable
quotes instead of allowing the market to drain to zero.

## Complete fee topology required before activation

The 0.50% protocol fee does **not** require a separate on-chain payment. It is
the input fee already embedded in the constant-product quote math, so the input
reserve simply retains the fee effect.

The native-network fee topology is different and must be exhaustive.

Bitcoin V1 permits only:

```text
success: funding transaction + claim transaction
refund:  funding transaction + refund transaction
```

Each budget must cover the complete signed transaction shape, including every
input/output/script byte that affects miner fee. An additional RBF replacement,
CPFP child, anchor-spend, or other fee-bump transaction is not permitted unless
a later version explicitly adds and binds its budget before execution.

For Chain-2050, the intended transaction topology remains:

```text
success: lock/setup call + claim call
refund:  lock/setup call + refund call
```

The launch contract must be predeployed; per-swap deployment is forbidden.
However, the native-gas budget for these calls must be measured in the chain's
native gas unit (wei-style accounting), not in `VoidToken` atomic units. The
current token-denominated charge is not a substitute for that budget.

The measured lock/claim/refund gas must include internal transfers, storage
writes, and logs. A separate post-terminal reimbursement transaction is not a
hidden escape hatch: any executor model must separately prove where native gas
comes from and how it remains solvent.

### Reverted terminal calls

A reverted Chain-2050 call still burns gas. Because state changes inside a
reverted call also revert, reimbursement cannot safely depend on a transfer made
only inside that same call.

Before activation, the concrete settlement design must prove a bounded native-
gas allowance before the terminal broadcast attempt. The swap permits at most
one terminal broadcast attempt and no automatic retry. That allowance is **not
yet proven trade-funded** merely because a `VoidToken` charge was withheld.
A failed attempt must not silently consume unreserved shared native gas.

This is a launch gate, not yet a runtime claim. Source policy alone cannot prove
the deployed contract's actual gas usage. Activation remains HOLD until the
exact deployed settlement bytecode is measured on the target Chain-2050 runtime
and a gas census demonstrates that lock, claim, refund, internal payouts,
events, and failure/revert behavior all fit the bound envelopes.

The atomic fee amounts themselves may not be trusted merely because a caller
supplied them. Before activation they must be derived and bound as follows:

```text
Bitcoin action budget
  = exact canonical transaction vbytes
    * quote-bound maximum satoshis-per-vbyte

Chain-2050 native-gas action budget
  = measured gas limit for the exact deployed bytecode/method
    * quote-bound maximum fee per gas
  [denominated in native gas, not VoidToken]
```

The fee observation used to choose those ceilings must be fresh and included in
the executable quote identity. A stale fee quote fails before funding. If fees
later rise above an already-bound ceiling, the system may HOLD for liveness; it
must not silently spend a shared reserve or enlarge the user's liability.

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

- Bitcoin miner-fee solvency does not depend on a standing BTC fee pot;
- every accepted Bitcoin-side path must reserve enough BTC for claim or refund;
- the VoidToken economic charge is bounded and explicit;
- **no executable BTC/VOID claim is made yet for Chain-2050 native-gas
  self-funding**;
- fee-fraction caps can reject pathological fee environments;
- configured net-output and Bitcoin dust/minimum floors are enforced;
- reserve floors remain enforced by the underlying deterministic quote math;
- every executable swap pays the fixed 50 bps protocol fee into the input-side
  market reserve;
- protocol-fee equity cannot automatically leave the market;
- a VoidToken protocol fee is not described as native-gas replenishment; and
- activation remains HOLD until native-gas capacity/replenishment or a user-paid
  model is proven and bound to settlement.

Already-bound swaps must preserve their reserved success/refund fee envelopes
through shutdown and restart recovery.

## No hidden relayer fee

This policy contains no sponsorship premium and no service fee.

There is no hidden relayer-profit premium. There is also no claim that a
VoidToken reimbursement alone repays native gas. Any executor sponsorship or
paymaster-style design must be separately reviewed and prove native-gas
solvency/replenishment before activation.

## Source boundary

The reference tool:

```text
tools/void-btc-void-trade-funded-fees-v1.mjs
```

wraps the existing deterministic reserve-curve quote math. It performs no live
network observation and grants no execution authority.

The next implementation gate is native-gas model resolution plus executable
reservation binding: exact reserve state, Bitcoin fee budgets, a separately
denominated Chain-2050 native-gas budget, exact settlement bytecode, and durable
in-flight liability accounting. Until then this source quote is not executable.
