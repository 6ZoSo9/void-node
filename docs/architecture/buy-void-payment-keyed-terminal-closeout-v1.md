# Buy VOID payment-keyed terminal closeout v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_TERMINAL_CLOSEOUT_V1`

Status: source-only terminal closeout gate. It is not mounted into the canonical
runtime parent.

## Purpose

Require the immutable confirmed payment-keyed receipt evidence from the receipt
reconciliation lane before the existing terminal closeout engine is allowed to
consume reserved inventory and append the public fulfilled event.

This wrapper does not replace the mature closeout engine. It adds one missing
payment-keyed prerequisite and then delegates to the existing engine.

## Existing terminal closeout retained

The existing terminal closeout already requires and revalidates:

- saga state `receipt_confirmed`;
- canonical confirmed-state completion;
- the exact confirmed execution attempt;
- the exact inventory reservation;
- the exact public Buy VOID request;
- one deterministic terminal plan;
- its exact plan fingerprint before mutation;
- request-scoped crash-recoverable closeout locking;
- append-only inventory consumption;
- append-only public operator fulfilled event;
- partial-recovery handling; and
- saga `closeout_committed`.

None of those mechanisms are duplicated or weakened.

## Payment-keyed prerequisite

Before apply, this wrapper first asks the existing closeout engine for its
read-only terminal plan.

It then requires one immutable payment-keyed receipt evidence record for that
exact attempt with:

- `outcome=confirmed`;
- exact saga ID;
- exact attempt ID;
- exact delivery transaction hash;
- exact receipt-policy fingerprint;
- exact fulfillment wallet;
- exact buyer delivery address;
- exact VOID amount;
- exact receipt block number;
- exact receipt block hash; and
- exact observed confirmation count.

The receipt evidence must also bind the exact canonical confirmed state named by
the terminal plan.

## Confirmed-state continuity

The canonical confirmed state and payment-keyed receipt evidence must agree on:

```text
transaction hash
fulfillment wallet
buyer delivery address
VOID units
receipt block number
receipt block hash
confirmation count
```

The terminal plan must also agree on:

```text
attempt ID
inventory reservation
delivery transaction hash
buyer address
consumed VOID units
public fulfilled-event VOID units
```

This prevents a valid receipt for one delivery from authorizing closeout of a
different reservation/request.

## Explicit apply authorization

Dry run exposes:

- the payment-keyed closeout confirmation token;
- the required immutable receipt-policy fingerprint; and
- the deterministic underlying terminal-plan fingerprint.

Apply requires the exact payment-keyed confirmation and receipt-policy
fingerprint.

The wrapper then invokes the existing terminal closeout with the exact
confirmation, server-policy fingerprint, plan fingerprint, saga confirmation,
and saga action confirmation returned by the immediately preceding dry
reconstruction.

The existing closeout engine revalidates the plan again under its request lock
before mutation.

## Failure behavior

The wrapper stops before terminal mutation if:

- confirmed payment-keyed receipt evidence is absent;
- only reverted payment-keyed receipt evidence exists;
- the receipt-policy fingerprint differs;
- the receipt block/hash differs from canonical confirmed state;
- the economic buyer/wallet/amount binding differs;
- the terminal plan differs from the confirmed receipt;
- wrapper confirmation is absent/wrong; or
- the underlying terminal closeout dry reconstruction is held.

## Successful boundary

A successful applied result reuses the existing engine to commit:

```text
inventory consumption
  -> public fulfilled operator event
  -> saga closeout_committed
```

The public request base JSON and inventory reservation base JSON remain
immutable; terminal effects are append-only projections.

A duplicate already-closed saga still requires the payment-keyed receipt evidence
and confirmed-state binding before the wrapper returns duplicate success.

## Authority boundary

When applied this lane can authorize the existing terminal inventory/public
closeout mutation, but it performs no:

- credential access;
- wallet access;
- signing;
- transaction broadcasting;
- Chain-2050 RPC;
- new money movement;
- automatic retry;
- public request base-record rewrite;
- inventory reservation base-record rewrite;
- runtime route mount;
- deployment; or
- service action.

The next gate after this source contract is runtime composition/mounting of the
payment-keyed preparation, guarded broadcast, reconciliation, receipt, and
terminal-closeout stages under server-controlled policy.
