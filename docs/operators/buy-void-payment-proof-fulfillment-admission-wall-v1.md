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

## Coupled-checkout USDC policy binding

The fixed original native-USDC token contract is Base (8453)
`0x833589fcd6edb6e08f4c7c32d4f71b54bda02913` or Ethereum (1)
`0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`. The pure V2 receipt
verifier enters strict checkout binding when **any** original checkout/coupled
own-property is present: `payment_chain`, `payment_chain_id`,
`payment_instructions`, `usdc_contract`, or `launch_authority`. That path
requires a present, correctly shaped **native** USDC contract equal to the
verifier's configured contract. An environment-chosen arbitrary ERC-20 receipt
is not payment in the original native USDC.

The guard also binds the buyer-facing checkout instructions for any
checkout/coupled request. The original request must carry the selected
`payment_chain`, the exact numeric chain ID (Base `8453` or Ethereum `1`),
and a payment-instruction object whose `send_chain`, exact numeric
`send_chain_id`, native-USDC `token_contract`, exact numeric
`token_decimals=6`, `send_to`, and `send_from` all agree with the
server-selected rail, canonical request receive address, and request delivery
wallet. Numeric strings such as `"8453"` or `"6"` are not accepted as the
original checkout schema's numeric fields.

This prevents a real receipt on the configured rail from being treated as
proof of the buyer's original obligation when the durable request instructions
pointed at a different rail, token, receiver, sender, or decimal interpretation.

The proof covers canonical Base and Ethereum Transfer-log shapes, an arbitrary
configured Base ERC-20 that matches its fake receipt but not the original
request, absent and wrong original token, mixed-case address equality, and
negative cases for every bound payment-instruction field including wrong-type
chain IDs and token decimals.

**Not historical authority:** this is an in-memory guard, not proof that the
caller supplied the first durable accepted request snapshot. Generic legacy/
test requests retain earlier behavior only when they carry **none** of
`payment_chain`, `payment_chain_id`, `payment_instructions`,
`usdc_contract`, or `launch_authority`. Partial checkout evidence cannot
downgrade into the legacy path. The compatibility path must **not** be promoted
to production verification without separately authenticated original lineage.
Historical missing fields, anti-rollback custody, finality, capacity/duplicate
lock, allocation-reservation persistence and coupled launch remain HOLD.
Ethereum payment-log matching does not by itself establish Ethereum finality.

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
