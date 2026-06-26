# Public Buyer / Earner Status Rollup After CI Recovery v1

Marker: `VOID_PUBLIC_BUYER_EARNER_STATUS_ROLLUP_AFTER_CI_RECOVERY_V1`

This rollup records the public-facing Buy VOID / Earn WC status after the PR #9-#14 CI recovery stack.

Scope:

- public read-only status only
- no buyer mutation
- no WC issuance
- no WC ledger write
- no wallet send
- no automatic fulfillment
- no validator mutation

Purpose:

- make it easier to summarize what public users can inspect right now
- keep Buy VOID and Earn WC visible without implying live public mutation or automatic payout
