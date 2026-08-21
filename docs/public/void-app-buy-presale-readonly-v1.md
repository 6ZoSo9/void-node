# VOID App Buy presale read-only v1

Marker: `VOID_BUY_VOID_APP_READONLY_V1`

This source-only view replaces the generic Buy-route placeholder with honest,
fail-closed guidance for the current fixed-price presale.

The participant-visible policy price is mechanically bound to the canonical
`VOID_BUY_PRICE_USDC_PER_VOID` default in `src/index.ts`. The focused proof
compares exact decimal strings rather than floating-point values and fails if
any participant-visible dollar price in the bounded Buy view differs from the
canonical default. Until a separately reviewed adapter supplies validated
presale readiness, the view remains `HOLD` and does not claim that intake is
open, quote available inventory, publish a payment destination, identify a
request, report a chain observation, or claim fulfillment.

The view distinguishes:

- presale readiness from payment instructions;
- a payment observation from a fulfillment receipt;
- source-green code from live activation; and
- the fail-closed `OPEN`, `SOLD_OUT`, `CLOSED`, and `HOLD` lifecycle
  states established by the existing presale-exit readiness classifier.

## Price-policy dependency closure

`src/index.ts` is a focused-workflow dependency even though this PR does not
modify that file. The proof requires every canonical
`VOID_BUY_PRICE_USDC_PER_VOID` default present there to agree exactly, then
requires every dollar-denominated value in the bounded Buy view to equal that
same exact decimal representation.

The proof also performs an in-memory falsification: it increments the canonical
price by one least-significant decimal unit while leaving the Buy view
unchanged, then requires the price-alignment assertion to fail. This proves a
canonical price-policy change cannot leave a stale participant-visible price
with a green focused proof.

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

The focused workflow watches the Buy view, proof, documentation, workflow, and
canonical `src/index.ts` dependency. It checks JavaScript syntax and repeats the
deterministic proof on Node.js 22, 24, and 26.
