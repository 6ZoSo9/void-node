# VOID App Buy presale read-only v1

Marker: `VOID_BUY_VOID_APP_READONLY_V1`

This source-only view replaces the generic Buy-route placeholder with honest,
fail-closed guidance for the current fixed-price presale.

It shows the reviewed policy price of **$0.50 per VOID** while refusing to invent
or imply live evidence. Until a separately reviewed adapter supplies validated
presale readiness, the view remains `HOLD` and does not claim that intake is
open, quote available inventory, publish a payment destination, identify a
request, report a chain observation, or claim fulfillment.

The view distinguishes:

- presale readiness from payment instructions;
- a payment observation from a fulfillment receipt;
- source-green code from live activation; and
- the fail-closed `OPEN`, `SOLD_OUT`, `CLOSED`, and `HOLD` lifecycle
  states established by the existing presale-exit readiness classifier.

## Authority boundary

The view is static and read-only. It contains no form, input, action button,
network request, payment address, wallet or signer access, inventory mutation,
request intake, transaction signing or broadcast, automatic fulfillment,
deployment, or money movement. It does not prove live presale availability.

A verified readiness adapter, exact payment instructions, request lookup,
receipt presentation, fulfillment activation, and deployment remain separate
review and authorization gates.

## Proof

Run:

```sh
node scripts/prove_void_app_buy_presale_readonly_v1.mjs
```

The focused workflow checks JavaScript syntax and repeats the deterministic
proof on Node.js 22, 24, and 26.
