# Coupled presale + WC/VOID native-gas liability v1

Marker: `VOID_COUPLED_NATIVE_GAS_LIABILITY_V1`

Status: source-only fail-closed launch policy. It does not access a wallet,
reserve live gas, accept a payment, debit WC, sign or broadcast a transaction,
activate either market, or move funds.

## Why this gate exists

The canonical presale inventory and WC/VOID market inventory are `VoidToken`
assets. Chain-2050 transaction fees are paid from an executor's native balance.

Those balances are technically distinct.

Therefore withholding `VoidToken` from a buyer or trader does **not** by
itself replenish the account that pays Chain-2050 transaction gas. Launch
accounting must protect native gas explicitly.

The current coupled launch also reuses the canonical Buy VOID fulfillment wallet
as the WC/VOID settlement executor. V1 permits that shared payer only if both
lanes consume one cross-lane native-gas reservation journal **and one cross-lane
nonce scheduler**. The same wei may never be promised to both a presale
fulfillment and a WC/VOID settlement, and the same account nonce may never be
claimed independently by both lanes.

Every admission also binds a fresh Chain-2050 fee observation. A stale
observation, an observed base fee at or above the configured max-fee cap, or an
unavailable shared nonce slot fails closed before external payment/settlement
authority is created.

## Presale

The already accepted production fulfillment ceiling is:

```text
max gas limit        = 320000
max fee per gas      = 3000000000 wei
max cost / attempt   = 960000000000000 wei
```

Every admitted payment obligation reserves two bounded attempts:

```text
primary fulfillment attempt
+ one manual recovery attempt
= 1920000000000000 wei maximum reserved liability
```

Automatic retry remains forbidden.

The gas reservation must exist before a payment instruction can gain public
money authority. A stale or unreserved instruction cannot create a new accepted
presale obligation.

This preserves the existing presale economics, but it does **not** prove that
the full 10,000,000-VOID sale can finish from the currently funded native-gas
balance. Per-obligation admission safety and full-lifetime gas capacity are
different claims. Public activation requires either enough bounded native-gas
capacity for the intended sale envelope or a separately reviewed replenishment
mechanism.

This preserves the existing presale economics:

- no hidden minimum purchase is introduced;
- no per-buyer throttle below remaining inventory is introduced;
- the fixed presale rate is unchanged; and
- the buyer's purchased `VoidToken` amount is not silently reduced to pay an
  unrelated native-gas balance.

If unreserved native gas falls below the amount required for another bounded
obligation, public payment admission must fail closed before accepting more
money.

## WC/VOID

WC/VOID cannot yet receive an executable gas limit from source assumptions.

Before coupled activation, the exact deployed `WCVoidMarketVaultV2.settleVoid`
path must be measured against the canonical production `VoidToken` and the
authorized settlement executor. The resulting maximum gas limit must be bound
to the deployed runtime identity.

V1 then reserves:

```text
measured settleVoid gas limit
* 3000000000 wei max fee per gas
* 2 bounded attempts
```

before an irreversible WC debit or executable settlement obligation may become
authoritative.

One attempt is primary. One is a manually authorized recovery allowance.
Automatic retry remains forbidden.

WC/VOID protocol pricing remains market-determined. This policy does not invent
a fixed WC/VOID spread or protocol fee merely to mask the native-gas problem.
A fee retained in canonical Chain-2050 `VoidToken` does not replenish the
executor's distinct native-gas balance by itself.

This V1 fee coverage is only for the current **opening WC -> VoidToken
settlement** path. It does not claim that a production VOID -> WC reverse
settlement adapter or a complete two-sided WC/VOID execution path is ready.
Those require their own reviewed settlement and fee model before production
WC/VOID can be described as two-sided.

## Shared payer rule

The shared payer is currently:

```text
0xc884f631c3881b8b672bfcbf019c856146cd7f73
```

After coupled activation, any unrelated native-value spend from this account is
permitted only if the post-spend balance still covers every open gas liability
in the single reservation journal.

This includes deployment funding, operator transfers, maintenance transactions,
and any future market lane. A transaction cannot treat "wallet has enough
balance right now" as sufficient if that balance has already been reserved for
customer or participant obligations.

## Reservation accounting

For a new obligation:

```text
per_attempt_max_cost =
  max_gas_limit * max_fee_per_gas

requested_liability =
  per_attempt_max_cost * 2

available_unreserved =
  payer_native_balance
  - sum(open cross-lane gas liabilities)

admit only if:
  available_unreserved >= requested_liability
```

The reservation ID is content-addressed. Runtime integration must make journal
creation atomic with the authority transition it protects so two concurrent
lanes cannot both observe the same unreserved balance and spend it.

## Failure behavior

A successful terminal receipt releases unused reserved gas only after the
lane's required receipt-finality threshold is satisfied. A pending,
reorg-uncertain, malformed, or crash-unreconciled receipt keeps the full
unresolved liability reserved.

A failed first broadcast may consume at most the first bounded attempt. The
second allowance remains reserved but requires explicit manual recovery
authorization.

If both bounded attempts are exhausted, the obligation enters HOLD. No third
automatic attempt, shared-gas fallback, or silent liability increase is
allowed.

Actual gas consumption is reconciled from the terminal receipt's gas-used and
effective-gas-price evidence; the journal does not release capacity merely
because a transaction was submitted.

Source-chain customer refunds are a separate economic and fee domain. A future
Base/Ethereum refund path must carry its own source-chain fee budget and must
not consume the Chain-2050 fulfillment gas reservation.

## Launch blockers

Presale public activation remains HOLD until:

- the cross-lane gas reservation journal is runtime-integrated;
- the cross-lane nonce scheduler serializes presale and WC/VOID transaction
  construction for the shared EOA;
- fresh fee-cap sufficiency is checked before payment instructions gain
  authority;
- payment instructions cannot gain authority without a gas reservation;
- reservations are not released before terminal receipt finality;
- signing/broadcast checks preserve all open gas liabilities;
- unrelated native spends are guarded by the same post-spend reserve floor;
- full-presale native-gas capacity or an explicit replenishment mechanism is
  proven; and
- paid-but-unreservable customer resolution/refund policy is separately ready.

WC/VOID additionally remains HOLD until:

- the vault is deployed and independently verified;
- the production `settleVoid` gas ceiling is measured;
- that ceiling is bound to the exact deployed runtime;
- WC settlement authority cannot precede gas reservation;
- the shared nonce scheduler is integrated;
- fresh fee-cap sufficiency is checked before settlement authority;
- a sustainable native-gas replenishment or user-paid native-gas model exists;
- the reverse VOID -> WC settlement adapter is separately ready before the
  market is described as two-sided; and
- cross-lane double-spend protection is proven.

The source reference is:

```text
tools/void-coupled-native-gas-liability-v1.mjs
```
