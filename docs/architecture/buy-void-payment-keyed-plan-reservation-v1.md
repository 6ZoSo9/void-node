# Buy VOID payment-keyed plan reservation v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_PLAN_RESERVATION_V1`

Status: source-only durable nonce/transaction-template reservation. No signing or
broadcast authority is present.

## Purpose

The payment-keyed transaction planner observes the Chain-2050 pending nonce, but
that observed value is only a floor. Two concurrent fulfillment attempts for the
same wallet must not both prepare nonce `N`.

This lane ports the existing wallet-scoped nonce-allocation model to the
payment-keyed calldata path without reusing the native-transfer transaction
template.

## Exact template binding

Every immutable reservation binds:

- saga ID;
- execution-attempt ID;
- fulfillment wallet;
- canonical payment-keyed fulfillment-call Ready object;
- fulfillment contract;
- canonical payment identity and payment key;
- buyer recipient and amount;
- exact `fulfill(bytes32,address,uint256)` calldata;
- gas limit and EIP-1559 fee envelope;
- server/runtime policy fingerprint; and
- transaction-preparation policy fingerprint.

The template fingerprint excludes nonce. The allocator then assigns one nonce
and computes the canonical payment-keyed transaction-plan fingerprint using the
same formula consumed by the merged unsigned-transaction builder:

```text
sha256(
  "chain_id=2050\n" +
  "nonce=<reserved>\n" +
  "gas_limit=<gas>\n" +
  "max_fee_per_gas_wei=<max>\n" +
  "max_priority_fee_per_gas_wei=<priority>"
)
```

## Wallet-scoped allocation

Allocation uses the existing filesystem bakery lock under a wallet-specific
namespace.

Inside the lock:

1. recover the same attempt if already reserved;
2. treat the observed pending nonce as a lower bound;
3. scan immutable local nonce records;
4. select the first nonce at or above both the pending floor and the highest
   local reservation;
5. publish the nonce record atomically;
6. publish an attempt index; and
7. recover a missing attempt index by scanning the unique nonce record.

A reservation is never released by this source lane.

If a retry observes a pending nonce above its already-reserved nonce, it fails
closed rather than silently changing the prepared transaction.

## Relationship to the custodian request

The merged payment-keyed runtime preflight defines the custodian request's
`plan_reservation_id` as the canonical inventory reservation ID. This lane does
not reinterpret that already-merged field.

Its own `reservation_id` is the local wallet-nonce reservation identity. A
later preparation coordinator must bind the two domains by requiring the same
saga ID, attempt ID, fulfillment call, and canonical
`transaction_plan_fingerprint_sha256`.

This keeps inventory authority and wallet-nonce authority explicit rather than
overloading one identifier with both meanings.

## Crash/concurrency boundary

The attempt index is not the source of nonce authority. If the process crashes
after nonce publication but before index publication, the unique nonce record
is recovered and the index is repaired.

Different attempts for the same wallet cannot intentionally receive the same
nonce through this allocator. The same attempt with a changed payment-keyed
template is rejected.

## Filesystem authority

This primitive performs local filesystem reads/writes when invoked. Its
directories are private and its immutable records/indexes are mode `0600`.

It performs no RPC call itself. The observed pending nonce and gas/fee template
must come from an independently reviewed server-controlled planning step.

## Explicit non-authority

This lane does not:

- release/reassign reserved nonces;
- access credentials or wallets;
- sign transactions;
- persist raw signed transactions;
- claim broadcast submission authority;
- broadcast;
- accept receipts;
- mutate the saga, execution-attempt, inventory, or public fulfillment state;
- mount a runtime route;
- deploy or restart services; or
- move funds.

The next composition gate pairs this reservation with the payment-keyed
preparation custody record so the exact reserved nonce/request can be signed
and durably projected before any broadcast.
