# Buy VOID Verified-Payment Duplicate Guard v1

Marker: `VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1`

## Purpose

Define the canonical duplicate-payment identity decision required before a new
Buy VOID `payment_verified` event can become a second inventory obligation.

This source contract is intentionally additive and non-integrated. It does not
write operator events, reserve inventory, write an allocation record, activate
public intake, access a wallet/signer, or move funds.

## Canonical identity

The guard reuses the existing repository primitive:

```text
canonicalBuyVoidPaymentIdentityV1(
  source_chain,
  payment_transaction_hash,
  payment_log_index
)

=> voidpay1:<chain>:<tx_hash>:<log_index>
```

No second payment-identity format is introduced.

A transaction hash alone is not enough. One EVM transaction may contain more
than one distinct transfer log, so the log index is part of the identity.

## Accepted payment provenance

Any event that already claims `payment_verified` authority must be an
identity-complete verified-payment v2 event:

- schema `void_buy_void_verified_payment_event_v2`;
- marker `VOID_BUY_VOID_VERIFIED_PAYMENT_V2`;
- `payment_identity_input_complete=true`;
- `operator_status=payment_verified`;
- `payment_verified=true`;
- valid request ID;
- payment-verifier source chain;
- payment-verifier transaction hash;
- payment-verifier transfer-log index; and
- outer event transaction hash matching the verifier transaction hash.

If an accepted historical `payment_verified` event lacks those fields, the
guard fails closed. A future migration/adjudication lane must resolve that
history explicitly; production admission must not guess a canonical identity.

## History invariants

Before classifying the candidate, the guard validates the accepted verified
history itself:

1. one canonical payment identity may map to only one request;
2. one request may map to only one canonical payment identity;
3. malformed payment-history rows fail closed;
4. history is explicitly bounded.

A pre-existing history conflict is a HOLD even when the new candidate uses an
unrelated payment identity.

## Candidate outcomes

- no prior request/payment claim: `available`;
- exact same request + same canonical payment identity: `idempotent`;
- same canonical payment identity + different request: HOLD;
- same request + different canonical payment identity: HOLD;
- same transaction hash + different transfer-log index: distinct identity;
- incomplete/malformed candidate identity: HOLD.

## Runtime integration layer

This module remains a pure in-memory classifier and therefore continues to
report `runtime_integration: false` in its own authority object.

The stacked runtime-integration lane applies it inside the existing
verified-payment capacity serialization boundary documented in
`buy-void-verified-payment-duplicate-guard-runtime-integration-v1.md`:

```text
verified-payment capacity / duplicate-identity admission
  -> launch-generation authority
     -> request closeout
        -> durable payment_verified append/fsync
        -> duplicate + capacity postcheck
```

The integration introduces no second duplicate-guard lock. A concurrency proof
requires two requests racing the same canonical identity to produce at most one
durable verified-payment obligation.

For Ethereum, the candidate must still be downstream of the canonical
source-finality result tracked by issue #2393. Receipt/log matching alone is not
production finality authority.

## Remaining independent gates

This contract does not close:

- live deployment/requalification of the capacity + duplicate integration;
- Ethereum source-finality runtime integration in #2393;
- the dedicated append-only `allocation_reserved` record/ledger;
- live coupled activation;
- production signing;
- payment acceptance; or
- automatic fulfillment.

## Authority

`VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_AUTHORITY_V1` reports the
source-only boundary explicitly. Runtime integration, filesystem I/O, payment
verification/writes, allocation writes, wallet/signer/key access, transaction
actions, activation and funds movement remain false.
