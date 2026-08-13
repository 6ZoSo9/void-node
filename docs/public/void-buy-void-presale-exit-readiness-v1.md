# Buy VOID presale exit readiness v1

Marker: `VOID_BUY_VOID_PRESALE_EXIT_READINESS_V1`

This source-only classifier makes the current fixed-price presale lifecycle
explicit before any future checkout integration. It consumes the existing
inventory aggregate contract plus reviewed `presale_open` and `intake_enabled`
policy booleans and returns exactly one fail-closed status:

- `OPEN`: inventory remains, the presale policy is open, and intake is enabled;
- `SOLD_OUT`: validated available inventory is zero;
- `CLOSED`: the reviewed presale policy is closed; or
- `HOLD`: intake is disabled or the snapshot is malformed, inconsistent, or
  contains unknown fields.

Only `OPEN` sets `accept_new_requests=true`. Accounting must satisfy
`committed + available = capacity`, and the supplied `sold_out` flag must agree
with exact integer arithmetic. Amounts are decimal strings, so the classifier
does not round or rely on JavaScript floating-point numbers.

## Authority boundary

This module classifies supplied source data only. It does not read live
inventory, close the presale, change checkout routing, accept or reject a real
request, reserve/decrement inventory, access credentials or wallets, sign or
broadcast a transaction, move funds, activate the post-presale BTC/VOID market,
deploy, or prove external acceptance. A caller/runtime composition and any
presale close decision remain separately reviewed gates.

## Proof

Run:

```sh
node scripts/prove_void_buy_void_presale_exit_readiness_v1.mjs
```

The focused workflow repeats that deterministic proof on Node.js 22, 24, and
26. Source-green is not deployment, activation, inventory truth, or economic
execution evidence.
