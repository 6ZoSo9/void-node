# USDC External Payment Proof Pack Negative Fixture v1

Marker: VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_NEGATIVE_FIXTURE_V1

Purpose: add a deliberately malformed checked-in fixture that the USDC External Payment Proof Pack Static Verifier v1 must reject before any live RPC fetch, finality verification, real payment verification, allocation ledger write, inventory reserve, automatic fulfillment, or VOID transfer exists.

Parent verifier: VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_STATIC_VERIFIER_V1
Parent good fixture: VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_EXAMPLE_V1

The negative fixture is not live chain data.
The negative fixture is not a real payment.
The negative fixture keeps all authority flags false.
The negative fixture intentionally breaks canonical_payment_identity.
The verifier must pass the known-good example fixture and reject this known-bad negative fixture.

Fixture path: fixtures/public/usdc-external-payment-proof-pack-negative-fixture-v1.json

Public route: /public-node/usdc-void-buy-pool/external-payment-proof-pack-negative-fixture-v1.json
