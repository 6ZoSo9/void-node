# USDC External Receipt Observation Public Reviewer Card Runtime Smoke v1

Marker: VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_RUNTIME_SMOKE_V1

Purpose: prove the USDC external receipt observation public reviewer card JSON and HTML routes serve at runtime after public node service restart.

Routes under smoke:

- /public-node/usdc-void-buy-pool/external-receipt-observation-public-reviewer-card-v1.json
- /public-node/usdc-void-buy-pool/external-receipt-observation-public-reviewer-card-v1

Runtime expectations:

- JSON route returns marker VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_PUBLIC_REVIEWER_CARD_V1.
- JSON route declares public_explanation_only=true.
- JSON route declares reviewer warning booleans true for not payment approval, not finality verification, not allocation ledger write, not inventory reserve, not automatic fulfillment, not VOID transfer, and operator review required.
- JSON route keeps all authority flags false.
- HTML route displays the same marker and warning copy.
- Smoke does not write ledgers, reserve inventory, approve payments, fulfill orders, or transfer VOID.

Non-activation statement: this smoke proof only reads public JSON/HTML routes. It does not run a queue, fetch live chain data now, verify finality, trust an external state root, verify a real payment for fulfillment, write the private allocation ledger, reserve inventory, fulfill automatically, expose public mutation, or transfer VOID.
