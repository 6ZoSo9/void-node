# Buy VOID verified-payment identity admission v1

Marker: `VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_V1_GREEN`

## Purpose

Prevent one observed USDC transfer from becoming more than one
`payment_verified` Buy VOID obligation.

The canonical payment identity is the existing fulfillment identity:

`voidpay1:<source_chain>:<transaction_hash>:<log_index>`

This lane reuses that identity rather than defining a parallel payment key.

## Admission boundary

The live manual verifier preserves the matched EVM transfer log index in the
payment-verifier evidence. The verified-payment capacity authority derives the
canonical identity with `canonicalBuyVoidPaymentIdentityV1(...)` while holding
the same serialized capacity-admission lock used for the finite-presale
transition.

Its strict recount reads every authoritative `payment_verified` event from
`operator-events.jsonl` and re-derives the identity from source chain,
transaction hash, and log index.

- one canonical payment identity cannot belong to two request IDs;
- one verified request cannot later bind to a different canonical payment
  identity;
- exact same-request/same-payment re-verification is idempotent;
- when a stored `canonical_payment_identity` exists it must equal the
  re-derived identity;
- historical verified rows without sufficient identity provenance fail closed
  instead of being silently ignored.

New verified events persist `canonical_payment_identity` directly.

## Lock order

Identity and finite-capacity admission are evaluated in the same outer lock:

`verified-payment capacity/identity -> launch-generation authority -> request closeout`

This prevents concurrent requests from separately passing duplicate-payment and
capacity checks before either append becomes visible.

## Remaining HOLD

This closes the canonical duplicate-payment identity gate only.

The coupled Buy VOID source-ready constant remains false until the separate
append-only allocation reservation record is reviewed and proven. This lane
does not enable public intake, activate the presale or WC/VOID market, fund
inventory, deliver VOID, sign transactions, broadcast transactions, or move
funds.

## Verification

```bash
npx tsx scripts/prove_buy_void_verified_payment_capacity_admission_v1.ts
node scripts/prove_void_buy_coupled_launch_runtime_integration_v1.mjs
```

The focused proof covers concurrent near-sellout capacity, cross-request reuse
of one payment identity, same-request identity conflict, exact retry
idempotency, persisted canonical identity shape, and fail-closed legacy verified
history lacking log-index provenance.
