# Buy VOID payment-proof fulfillment admission wall v1

## Purpose

Require a fulfillment candidate to carry the exact provenance emitted by the
Buy VOID verified-payment v2 receipt verifier before the deterministic
fulfillment engine or fulfillment journal may admit it.

The protected boundary is:

`transaction receipt -> verified-payment v2 event -> fulfillment decision -> persisted claim`

## Required provenance

Every admitted payment event must contain all three values:

- `schema`: `void_buy_void_verified_payment_event_v2`
- `marker`: `VOID_BUY_VOID_VERIFIED_PAYMENT_V2`
- `payment_identity_input_complete`: `true`

A hand-built legacy `BuyVoidVerifiedPaymentEventV1` object is not sufficient,
even when its addresses, transaction hash, amount, confirmations, token
contract, and log index appear internally consistent.

## Failure behavior

Missing, altered, or incomplete provenance returns:

`untrusted_payment_verification_provenance`

The decision remains held and cannot create a new fulfillment claim.

## Defense in depth

The pure fulfillment engine checks the boundary. The crash-safe fulfillment
journal accepts the narrowed admission-event type and invokes the same engine,
so a direct journal caller cannot bypass provenance validation.

The normal pipeline coordinator remains composed correctly: it builds the
verified-payment v2 event from a receipt before calling fulfillment admission.

## Authority boundary

This wall does not:

- call payment RPC endpoints;
- access a wallet or private key;
- sign or broadcast a transaction;
- authorize automatic execution;
- mount a runtime route;
- restart a service;
- move USDC or VOID;
- modify production Buy VOID state.

The proof uses fixtures and a disposable temporary directory only.

## Regression proof

Run:

```bash
npx tsx scripts/prove_buy_void_payment_proof_fulfillment_admission_wall_v1.ts
```

Expected terminal marker:

`VOID_BUY_VOID_PAYMENT_PROOF_FULFILLMENT_ADMISSION_WALL_V1_PROOF_EXACT_GREEN`
