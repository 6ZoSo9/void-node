# Buy VOID Verified-Payment Duplicate Guard Runtime Integration v1

Marker:
`VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_RUNTIME_INTEGRATION_V1_GREEN`

## Purpose

Integrate the canonical source-only
`VOID_BUY_VOID_VERIFIED_PAYMENT_DUPLICATE_GUARD_V1` classifier into the same
serialized verification-time boundary that protects finite Buy VOID presale
capacity.

This lane does not introduce a second payment-identity scheme and does not
introduce a second lock.

## Canonical payment event

The live local-only payment verifier persists an identity-complete verified
payment event with:

- schema `void_buy_void_verified_payment_event_v2`;
- marker `VOID_BUY_VOID_VERIFIED_PAYMENT_V2`;
- `operator_status=payment_verified`;
- `payment_verified=true`;
- `payment_identity_input_complete=true`;
- source chain;
- receipt transaction hash;
- matched ERC-20 transfer log index in canonical unsigned decimal form; and
- the existing request/payment amount and delivery bindings.

The operator queue projection remains schema-neutral: it keys on
`request_id` and `operator_status`. Changing the verified-payment event
schema therefore does not change its effective-status projection.

## Serialization boundary

For a candidate `payment_verified` transition the runtime now holds the
existing verified-payment capacity bakery lock while it:

1. pins the request directory and authoritative request/operator ledgers;
2. performs the strict capacity census;
3. binds candidate request id, quote, source chain and transaction hash;
4. runs `classifyBuyVoidVerifiedPaymentDuplicateGuardV1(...)` against the
   strict durable event history;
5. requires duplicate-guard idempotence to agree with durable request-id
   idempotence;
6. performs the existing finite-capacity admission;
7. crosses launch-generation authority and the request closeout lock;
8. revalidates the exact preappend ledger snapshots;
9. fsyncs the V2 `payment_verified` event through the retained operator-ledger
   descriptor;
10. re-reads the same retained ledger and requires the duplicate guard to report
    exact idempotence for the just-appended identity;
11. completes the existing capacity conservation postcheck; and
12. only then publishes/recoverably exposes the orchestration sidecar.

The lock order remains:

```text
verified-payment capacity / duplicate identity
  -> launch-generation authority
     -> request closeout
```

## Adversarial proof

`scripts/prove_buy_void_verified_payment_duplicate_guard_runtime_integration_v1.ts`
uses ample inventory and races two distinct requests that present the same
canonical payment identity.

The proof requires:

- exactly one race participant to persist;
- the loser to fail for duplicate payment identity, not capacity exhaustion;
- at most one launch-authority mutation at a time;
- exact winner request + identity replay to be idempotent;
- the losing request to become admissible only with a distinct transfer-log
  identity;
- a later fresh invocation to reconstruct identity and capacity authority from
  durable history; and
- no allocation write, public activation or funds movement.

The existing verified-payment capacity proof remains responsible for inode/path
replacement, ledger growth, durable request binding, preappend snapshots,
near-sellout capacity serialization, fsync, post-state conservation and
sidecar recovery.

## Historical fail-closed boundary

The parent duplicate guard intentionally rejects historical
`payment_verified` rows that do not carry identity-complete V2 provenance.

This integration does not guess or backfill those identities. Any real legacy
history must be handled by a separate explicit migration/adjudication lane
before production admission can proceed.

## Remaining launch gates

This source integration does not close:

- the dedicated append-only `allocation_reserved` record/ledger;
- live deployment and requalification;
- coupled launch activation;
- signer or wallet activation;
- VOID transfer authority; or
- automatic fulfillment.

`VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_READY_V1` remains false.

## Authority

Source/proof work only. No wallet, signer, private key, transaction
construction/signing/broadcast, Chain-2050 write, inventory funding, token
transfer, market activation, public presale activation or funds movement is
authorized by this lane.
