# Buy VOID payment-keyed preparation coordinator v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_COORDINATOR_V1`

Status: source-only crash-consistent preparation coordinator. Broadcast remains
impossible from this module.

## Purpose

Compose the merged payment-keyed runtime preflight, wallet-scoped nonce
reservation, deterministic preparation custody, execution-attempt journal, and
crash-consistent saga into one prepared boundary.

The safety invariant is:

> no possible broadcast authority exists until the exact signed transaction
> hash is durable in both the execution-attempt journal and the saga
> `transaction_prepared` event.

## Sequence

Dry run performs only reviewed read-only preflight/planning.

Apply requires exact coordinator, policy, saga, custody, and pipeline
confirmations before the first mutation.

The apply sequence is:

1. run the server-derived payment-keyed runtime preflight;
2. reconstruct the same attempt, intent, inventory reservation, and saga;
3. revalidate source finality;
4. rebuild the canonical fulfillment-contract call;
5. perform read-only Chain-2050 planning;
6. reserve a wallet-scoped nonce using the pending nonce only as a floor;
7. build the canonical unsigned transaction for that reserved nonce;
8. build the canonical payment-keyed custodian request;
9. persist crash-safe preparation custody after deterministic signing;
10. project the prepared transaction hash into the execution-attempt journal;
11. append exactly one saga `transaction_prepared` event.

No broadcast-intent event is created by this lane.

## Two reservation domains

The existing merged runtime preflight defines:

`custodian_request.plan_reservation_id = inventory_reservation_id`

That remains unchanged.

The wallet nonce allocator has its own independent
`nonce_reservation.reservation_id`.

The coordinator binds the two domains through:

- the same saga ID;
- the same attempt ID;
- the same canonical payment-keyed fulfillment call; and
- the same canonical transaction-plan fingerprint.

Inventory authority and wallet-nonce authority therefore remain explicit rather
than overloading one identifier.

## EVM target versus economic recipient

The signed EVM transaction target is the payment-keyed fulfillment contract.

The execution-attempt journal's existing `delivery_address` field remains the
economic recipient: the buyer.

This is intentional. The fulfillment-contract target and exact calldata are
durably proven by the payment-keyed custody request. The attempt journal
continues to represent who receives the VOID economically.

The proof requires:

- custody request `transaction_to == fulfillment_contract`; and
- attempt journal `delivery_address == buyer`, not the contract.

## Restart behavior

A crash after nonce reservation recovers the immutable local nonce claim.

A crash after preparation custody reuses the same exact request and
deterministically re-signs it. The hash and raw-byte SHA-256 must match the
durable custody record.

A crash after execution-attempt preparation but before the saga append skips the
already-completed attempt mutation and appends the missing
`transaction_prepared` event.

Once both attempt and saga projections exist, retry returns a duplicate result
rather than producing another mutation.

## Explicit non-authority

This coordinator does not:

- create a saga broadcast-intent event;
- claim the durable submission guard;
- call a broadcaster;
- submit or rebroadcast a transaction;
- persist or return raw signed transaction bytes;
- wait for or accept a receipt;
- decrement inventory;
- mark a public Buy VOID request fulfilled;
- mount a runtime route;
- deploy or restart services; or
- move funds.

The next gate is payment-keyed crash-consistent broadcast intent + guarded
submission. It must recover the exact custody request, reproduce the exact
signed bytes, append the saga write-ahead broadcast intent, and only then enter
the merged durable submission guard/broadcaster boundary.
