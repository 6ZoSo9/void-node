# Buy VOID prepared transaction nonce allocation lock v1

Marker:

`VOID_BUY_VOID_PREPARED_TRANSACTION_NONCE_ALLOCATION_LOCK_V1`

## Problem

A per-nonce atomic create prevents two attempts from owning one nonce, but it does not by itself prevent two processes handling the same attempt from selecting different nonce candidates before either publishes the attempt index.

That race can occur when the processes observe different pending-nonce floors or see different concurrent wallet allocations. A green single-process proof is therefore insufficient for transaction preparation.

## Lock contract

The wallet allocation path now uses a filesystem bakery lock with:

- unique nonce-qualified choosing claims;
- unique ticket claims;
- monotonically increasing ticket selection;
- choosing-phase completion before ticket ordering;
- deterministic lowest-ticket ownership;
- dead-process claim removal;
- stale temporary-file removal;
- cleanup limited to each contender's unique claim paths; and
- no shared replacement-owner unlink operation.

The lock serializes the complete operation that:

1. recovers the attempt index;
2. validates any existing plan;
3. computes the next wallet nonce;
4. atomically publishes the nonce record; and
5. atomically publishes the attempt index.

## Pending-nonce rule

The chain pending nonce is a floor, not a reservation.

If a canonical local plan already exists at a nonce below a later observed pending nonce, the allocator fails closed with `prepared_plan_reserved_nonce_below_observed_pending`. It does not create a second plan, silently replace the canonical plan, or release the existing nonce.

## Race-artifact rule

A canonical nonce record and its attempt index are immutable.

The only removable record is an unindexed, same-attempt, same-template race artifact when an already valid attempt index identifies a different canonical winner. Conflicting templates fail closed. Multiple unindexed records fail closed because there is no safe evidence selecting a winner.

This cleanup is not nonce release. A canonical reservation is never deleted or reopened by this module.

## Multi-process proof

The focused proof starts two independent Node processes at the same barrier for the same attempt with pending floors 7 and 8.

The accepted outcomes are:

- floor 8 wins first: both processes resolve to the same nonce-8 reservation; or
- floor 7 wins first: the floor-8 process fails closed because the canonical nonce is below its later observation.

In both cases there is exactly one canonical reservation and no duplicate nonce ownership.

The proof then kills a process while it owns the bakery ticket. The next allocator must remove the dead process's unique claim, acquire the lock, reserve a different nonce for a different attempt, and leave the lock queue empty.

Expected marker:

```text
VOID_BUY_VOID_PREPARED_TRANSACTION_NONCE_ALLOCATION_LOCK_V1_PROOF_GREEN
```

## Authority boundary

This is source, proof, documentation, and CI only. It does not call a live RPC, read credentials, access a wallet, sign, persist signed payload bytes, broadcast, decrement inventory, close out fulfillment, deploy, restart services, or move funds.

Runtime mounting, live nonce observation, external custody, signing, broadcast, receipt reconciliation, fulfillment closeout, deployment, and money movement remain separate explicit gates.
