# VOID USDC/VOID Buy Pool Receipt Intake Readiness v1

Marker: `VOID_BUY_POOL_RECEIPT_INTAKE_READINESS_V1`

This patch adds receipt-preparation instructions directly to the existing USDC/VOID fixed-price buy-pool public page and JSON.

Purpose:

- Tell buyers what receipt facts to preserve before any manual review.
- Record that the Base USDC transaction hash is required.
- Record that the exact sending wallet address is required.
- Record that USDC amount, approximate send timestamp or block time, receiver address, and chain should be preserved.
- Clarify the delivery wallet rule: the sending wallet is the receipt identity and default fulfillment identity unless a separate operator-approved record explicitly says otherwise.
- Preserve manual review and no automatic fulfillment.
- Preserve no public receipt intake endpoint.

Safety boundary:

- No new route.
- No route-count increase.
- No route-stack wrapper.
- No public receipt mutation route.
- No public intake endpoint.
- No wallet send route.
- No automatic fulfillment.
- No private queue exposure.
- No secret exposure.
