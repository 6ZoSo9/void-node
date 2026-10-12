# USDC External Receipt Observation Evidence Bundle Runtime Smoke v1

Marker: VOID_USDC_EXTERNAL_RECEIPT_OBSERVATION_EVIDENCE_BUNDLE_RUNTIME_SMOKE_V1

Purpose: prove the public evidence bundle JSON and HTML routes serve live at runtime.

Runtime routes under smoke:

- /public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1.json
- /public-node/usdc-void-buy-pool/external-receipt-observation-evidence-bundle-v1

Meaning:

- The public evidence bundle can be fetched by a reviewer.
- The bundle links the observation evidence surfaces.
- The smoke is runtime/public-route proof only.
- The smoke does not approve payment.
- The smoke does not verify finality.
- The smoke does not write ledgers.
- The smoke does not reserve inventory.
- The smoke does not fulfill automatically.
- The smoke does not transfer VOID.
