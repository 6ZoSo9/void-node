# VOID USDC/VOID Buy Pool Buyer Self-Custody Checklist v1

Marker: `VOID_BUY_POOL_BUYER_SELF_CUSTODY_CHECKLIST_V1`

This patch adds a buyer-facing checklist directly to the existing USDC/VOID fixed-price buy-pool public page and JSON.

Purpose:

- Make the self-custody-only rule impossible to miss.
- Warn against centralized exchange, pooled-custody, bridge, payment processor, or custodial sends.
- State that the sender wallet is the receipt and fulfillment identity.
- Tell buyers to save the transaction hash and exact sending wallet address.
- Preserve manual review and no automatic fulfillment.
- Preserve no investment-return, no yield, and no profit-promise boundaries.

Safety boundary:

- No new route.
- No route-count increase.
- No route-stack wrapper.
- No public mutation route.
- No wallet send route.
- No automatic fulfillment.
- No silent credit mutation.
