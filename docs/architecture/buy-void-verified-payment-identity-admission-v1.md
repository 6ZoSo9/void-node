# Buy VOID verified-payment identity admission v1

Marker: `VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_V1_GREEN`

## Purpose

Enforce canonical payment-identity uniqueness at the same serialized boundary
where a verified USDC payment becomes a finite presale inventory obligation.

A request id is not a payment identity. The canonical key is:

```text
voidpay1:<source_chain>:<transaction_hash>:<log_index>
```

The source chain and transaction hash are normalized and the log index is
canonical uint32 decimal (`0..4294967295`), matching the reviewed
verified-payment/finality authority. The shared canonical helper itself now enforces
the same uint32 ceiling and pre-bounds textual indexes before `BigInt` parsing,
so auto-fulfillment, fulfillment-journal, duplicate-guard, and admission callers
cannot create a wider alternate payment-identity domain.

## Admission boundary

`writeBuyVoidOperatorEventWithCapacityAdmissionV1(...)` now passes the
candidate V2 verified-payment event and its request into
`withBuyVoidVerifiedPaymentCapacityAdmissionV1(...)`.

While the existing verified-payment capacity lock is held, the writer:

1. strictly parses the durable operator-event ledger;
2. requires every historical `payment_verified` row used as identity authority
   to be identity-complete. Reusable V2 verified-payment events and the live
   legacy operator mark are accepted only when they carry the explicit
   `payment_identity_input_complete=true` proof bit plus chain, transaction
   hash, and log index; older identity-incomplete rows fail closed;
3. derives every historical canonical payment identity;
4. fails closed if one identity is already bound to two request ids;
5. fails closed if one request id already has two different verified identities;
6. rejects a candidate identity already owned by another request;
7. treats only the exact same request + exact same canonical identity as
   idempotent;
8. continues through finite-capacity admission only after identity admission is
   green; and
9. revalidates the same identity against the durable post-append ledger before
   releasing the capacity lock.

There is no second payment-identity lock. Identity uniqueness and finite
inventory admission therefore share one serialization domain and cannot race
each other with conflicting lock order.

## Adversarial proof

`scripts/prove_buy_void_verified_payment_identity_admission_v1.ts` proves:

- two distinct requests racing the same canonical payment identity cannot both
  persist even when inventory is ample;
- exact re-verification of the winning request/identity is idempotent;
- the same request with a different canonical identity is rejected;
- the losing request may later use a different identity only while fresh
  capacity exists;
- the same transaction hash with a different log index is a different payment
  identity;
- malformed/incomplete historical verified-payment provenance fails closed;
- an already-corrupt history that reused one identity across requests fails
  closed; and
- a fresh invocation recounts the durable ledger before admitting remaining
  inventory.

The existing capacity proof is also upgraded to use the actual live
`void_buy_void_operator_mark_v1` verifier envelope with the explicit
identity-complete bit and canonical log index. It reports
`duplicate_payment_identity_guard_proven=true`.

## Source versus live authority

This lane makes the reviewed source writer enforce duplicate payment identity.
It does **not** prove that a currently deployed public verifier is running this
source, and it does not activate Buy VOID intake.

The public duplicate-payment status remains fail-closed until the normal
merge/deploy/requalification lifecycle proves the live runtime is on the
reviewed source.

The coupled launch readiness bit
`VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_READY_V1` also remains
false. The final append-only allocation-reservation record is a separate launch
gate.

## Authority

This is source/proof work only. It grants no wallet, signer, private-key,
transaction construction/signing/broadcast, Chain-2050 write, inventory
funding, token transfer, presale activation, market activation, or funds
movement authority.
