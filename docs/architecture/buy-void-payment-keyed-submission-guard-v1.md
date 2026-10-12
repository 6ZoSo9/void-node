# Buy VOID payment-keyed submission guard v1

Marker admitted by the existing durable guard:
`VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1`.

## Purpose

The merged delivery submission guard already provides the durable, append-only,
hash-chained claim/release boundary needed to prevent duplicate transaction
submission. Its journal contract previously recognized only the legacy ERC-20
and native delivery adapter markers.

This change extends that closed marker set with the payment-keyed custodian
broadcast-handoff marker. It does not change claim, release, retry, locking,
hash-chain, timestamp, or idempotency semantics.

## Isolation

Adapter identity remains part of the immutable binding. A payment-keyed attempt
therefore cannot collide with an otherwise identical legacy adapter attempt
solely because the attempt identifier is reused across adapter namespaces.

The proof exercises a complete payment-keyed claim/release lifecycle using the
existing retry-safe `broadcast_definitively_not_submitted` reason and verifies
that the journal round-trips the exact adapter marker.

## Authority boundary

The guard remains a filesystem-only durability primitive. This change performs
no RPC, wallet access, secret access, signing, transaction broadcast, runtime
route mount, or money movement.

It is a prerequisite for a later reviewed composition that hands the exact
#1527 signed payment-keyed transaction to the merged #1523 broadcaster.
