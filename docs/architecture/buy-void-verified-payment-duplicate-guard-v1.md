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

## Required later integration

This module is not production admission by itself.

After the active finite-capacity lane clears, runtime integration must occur
inside the same verification-time serialization boundary that protects finite
presale capacity:

```text
generation authority
  -> verified-payment capacity / duplicate-identity admission
     -> request closeout
        -> finality-complete identity check
        -> duplicate guard
        -> capacity check
        -> durable payment_verified append/fsync
```

The exact lock topology must follow the reviewed current implementation at
integration time. There must be no schedule where two concurrent requests can
persist the same canonical payment identity.

For Ethereum, the candidate must also be downstream of the canonical
source-finality result tracked by issue #2393. Receipt/log matching alone is not
production finality authority.

## Remaining independent gates

This contract does not close:

- finite-capacity runtime integration in #2427/#2428;
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
