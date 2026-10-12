# USDC/VOID Automatic Payment Live-Path Public Status Card v1

Marker: VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_PUBLIC_STATUS_CARD_V1

This is a public read-only status card for the USDC/VOID automatic payment live path.

It does not enable automatic payment execution. It does not enable automatic fulfillment. It does not expose wallet, signer, receiver, treasury, buyer, inventory, or private rollup details.

Public status:

- automatic payment live path terminal readiness rollup exists as a private hold
- automatic payment execution remains disabled
- automatic fulfillment remains disabled
- wallet fulfillment remains disabled
- signer access remains disabled
- treasury transfer authority remains disabled
- buyer execution remains disabled
- public mutation remains disabled
- private details remain withheld

Linked private terminal marker:

- VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_LIVE_PATH_TERMINAL_READINESS_ROLLUP_HOLD_V1

This public card exists so reviewers and buyers can see the boundary clearly: the automatic payment stack is being prepared, but it is not live authority.
