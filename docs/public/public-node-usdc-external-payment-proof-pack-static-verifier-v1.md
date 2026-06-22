# USDC External Payment Proof Pack Static Verifier v1

Marker: VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_STATIC_VERIFIER_V1

Purpose: define and implement a local offline static verifier for the fake USDC external payment proof pack example fixture before any live RPC fetch, finality verification, allocation ledger write, inventory reserve, automatic fulfillment, or VOID transfer exists.

Parent fixture: VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_EXAMPLE_V1
Parent shape: VOID_USDC_EXTERNAL_PAYMENT_PROOF_PACK_V1
Parent boundary: VOID_USDC_TO_VOID_EXTERNAL_STATE_RELAY_VERIFICATION_BOUNDARY_V1

This verifier reads only the checked-in example fixture.
This verifier does not fetch live chain data.
This verifier does not verify Ethereum or Base finality.
This verifier does not trust an external state root.
This verifier does not verify a real payment.
This verifier does not reserve inventory.
This verifier does not write the private allocation ledger.
This verifier does not fulfill automatically.
This verifier does not transfer VOID.

Checks:
required root fields
required proof_pack fields
false authority flags
example fixture only flag
canonical payment identity construction
no live chain data
no real payment
no finality verification
no fulfillment authority

Verifier path: ops/mainnet0/usdc-external-payment-proof-pack-static-verifier-v1.py

Public route: /public-node/usdc-void-buy-pool/external-payment-proof-pack-static-verifier-v1.json
