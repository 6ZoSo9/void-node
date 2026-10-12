# Buy VOID confirmed closeout v1

`VOID_BUY_VOID_CONFIRMED_CLOSEOUT_V1` closes the accounting
and buyer-facing lifecycle after an execution attempt is already
confirmed on Chain-2050.

## What it does

The closeout path requires an existing `confirmed` execution
attempt. It then:

1. creates one append-only inventory-consumption record bound to
   the exact reservation, confirmation, delivery transaction hash,
   amount, request, instruction, and canonical payment identity;
2. appends one duplicate-safe `fulfilled` operator event to the
   existing public Buy VOID request journal;
3. creates the normal operator-event sidecar used by the current
   queue reader.

The original inventory reservation and public request base record
remain immutable. Effective state is derived from append-only
records.

## Runtime

The loopback-only runtime routes are:

- `GET /__void/operator/buy-void-confirmed-closeout-v1/status`
- `POST /__void/operator/buy-void-confirmed-closeout-v1/command`

The runtime is disabled unless:

```text
VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_ENABLED=1
```

The command accepts only:

```json
{
  "attempt_id": "<sha256>",
  "apply": false,
  "confirmation": "buyVoidConsumeInventoryAndClosePublicRequest"
}
```

The root directory, public request directory, and pool ID are
server controlled.

## Safety boundary

This lane has no RPC, wallet, credential, signing, broadcast,
raw signed transaction, service restart, background loop, or
money-movement authority.

It cannot execute or retry delivery. It only closes state after an
independently confirmed delivery.

The inventory-consumption and public-closeout writers are
duplicate-safe. A partial write can be repaired by a later exact
replay without creating a second consumption or fulfillment event.

## Binding and file-backed proof

The public request payment transaction hash must exactly match the
payment transaction hash persisted in the confirmed fulfillment
record. A mismatch is held before inventory consumption or public
closeout.

The focused proof exercises the real filesystem writers. It proves
one inventory-consumption record and one public fulfillment event
are created, exact replay is duplicate-safe, a conflicting delivery
transaction is refused, the public request base file is unchanged,
and a legacy same-transaction fulfillment event can be reconciled
without appending a second fulfillment event.
