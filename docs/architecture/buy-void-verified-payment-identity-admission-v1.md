# Buy VOID verified-payment identity admission v1

Marker: `VOID_BUY_VOID_VERIFIED_PAYMENT_IDENTITY_ADMISSION_V1_GREEN`

## Purpose

Prevent one observed USDC transfer from becoming more than one
`payment_verified` Buy VOID obligation.

The canonical payment identity is the existing fulfillment identity:

`voidpay1:<source_chain>:<transaction_hash>:<log_index>`

This lane does not invent a second payment key.

## Admission boundary

The live manual verifier now preserves the matched EVM transfer log index in the
payment-verifier evidence. The verified-payment capacity writer derives the
canonical identity with `canonicalBuyVoidPaymentIdentityV1(...)` while holding
the same serialized capacity-admission lock used for the finite inventory
transition.

Before appending `payment_verified`, all existing verified events are checked.

- the same canonical payment identity on another request is rejected;
- the same request with a different canonical payment identity is rejected;
- an exact repeat of the same request/payment identity is idempotent;
- a historical verified event whose canonical identity cannot be reconstructed
  fails closed instead of being ignored;
- a stored `canonical_payment_identity`, when present, must equal the identity
  re-derived from chain, transaction hash, and log index.

New verified events persist the canonical identity directly in the operator
event so later readers do not need to guess it.

## Lock order

The duplicate-payment decision is made inside the existing verified-payment
capacity lock, before the launch-generation mutation boundary and per-request
closeout lock.

The effective order remains:

`verified-payment capacity/identity -> launch-generation authority -> request closeout`

This prevents two concurrent requests from both claiming the same transfer.

## Remaining HOLD

This closes the canonical duplicate-payment identity gate only.

The coupled Buy VOID source-ready constant remains false until the separate
append-only allocation reservation record is reviewed and proven. This lane does
not enable public intake, activate the presale or WC/VOID market, fund
inventory, deliver VOID, sign transactions, broadcast transactions, or move
funds.

## Verification

```bash
npx tsx scripts/prove_buy_void_verified_payment_capacity_admission_v1.ts
node scripts/prove_void_buy_coupled_launch_runtime_integration_v1.mjs
```

The focused proof covers concurrent near-sellout capacity, cross-request reuse of
one payment identity, same-request identity conflict, exact retry idempotency,
and persisted canonical identity shape.
