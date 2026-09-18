# Buy VOID payment-keyed custodian broadcast v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1`

Confirmation: `buyVoidBroadcastPaymentKeyedCustodianTransactionV1`

## Purpose

This is the reviewed handoff between the payment-keyed custodian signer and the
payment-keyed Chain-2050 broadcaster. It does not mount or activate a runtime
route.

The module accepts the original custodian request plus the signed result from
the signer. Before a broadcaster or durable submission guard is touched, it
independently revalidates the request, canonical payment key, exact fulfillment
calldata, call fingerprint, transaction-plan fingerprint, #1525 canonical
unsigned-transaction fingerprint, request fingerprint, request idempotency key,
raw signed transaction, signer address, transaction hash, fees, target, value,
calldata, and empty access list.

It also passes the raw signed transaction through the merged #1523 local
payment-keyed transaction inspection wall and requires the decoded payment ID,
recipient, amount, target, calldata, and transaction hash to match the request.

## Durable submission binding

Apply mode derives a deterministic submission idempotency key from:

- the custodian request idempotency key;
- the exact signed transaction hash; and
- the canonical unsigned-transaction fingerprint.

The durable submission guard claim binds that key to the execution attempt,
signed transaction hash, and transaction-plan fingerprint under the marker
`VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_V1`.

The broadcaster is never called unless that claim succeeds.

A definitive no-submission result releases the claim with the existing
retry-safe `broadcast_definitively_not_submitted` reason. An exception,
ambiguous provider result, or accepted hash mismatch leaves the claim in place,
requires reconciliation, and forbids automatic retry.

## Explicit apply gate

Broadcast requires all of:

- a fully validated signed result;
- `apply=true`;
- exact confirmation `buyVoidBroadcastPaymentKeyedCustodianTransactionV1`;
- an injected durable submission guard; and
- an injected broadcaster.

Dry run performs no guard claim and no broadcast call.

## Raw transaction handling

The raw signed transaction is accepted only as part of the already validated
signer result. It is revalidated before use, passed directly to the injected
broadcaster, then not persisted or returned by this module.

## Authority boundary

The module itself performs no RPC, credential access, wallet access, signing,
filesystem access, deployment, or runtime route mount. Its injected broadcaster
may submit the transaction only in explicitly confirmed apply mode, and its
injected durable guard may write its journal.

The proof uses a fixed ephemeral test wallet plus synthetic guard/broadcaster
dependencies. It performs no live RPC, transaction broadcast, deployment, or
funds movement.
