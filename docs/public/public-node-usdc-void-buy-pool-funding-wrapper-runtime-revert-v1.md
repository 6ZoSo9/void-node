# VOID USDC/VOID Buy Pool Funding Wrapper Runtime Revert v1

Marker: `VOID_USDC_VOID_BUY_POOL_FUNDING_WRAPPER_RUNTIME_REVERT_V1`

This is a runtime safety revert.

The previous funding route wrapper repair introduced a runtime crash-loop on Alienware after service restart. Static proofs and TypeScript build were green, but live `/version` failed and public routes returned 502.

This revert removes the funding route wrapper repair while preserving the earlier sealed work:

- USDC/VOID fixed-price buy pool public page v1 remains.
- Public link integration v1 remains.
- `/public-node`, `/public-node/money-engine-v1`, and `/buy-void` remain linked to the buy pool.
- `/public-node/funding` link integration remains deferred until a safer source-level or route-index-level repair is identified.

Safety boundary:

- Restore live runtime first.
- Remove crash-looping route-wrapper code.
- No new public route.
- No public mutation route.
- No route-count increase.
- No wallet send route.
- No automatic fulfillment.
