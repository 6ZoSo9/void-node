# USDC/VOID automatic payment activation candidate gate v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_CANDIDATE_GATE_V1`

This private/operator-only brick records the decision to begin activation of the USDC/VOID automatic payment lane.

## Meaning

- Activation intent is now recorded.
- The automatic payment lane may proceed to activation-candidate preflight planning.
- This is not a live money-moving switch.
- This does not grant signer access.
- This does not authorize transfer, broadcast, or fulfilled-state mutation.

## Source chain

- Activation canary: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-canary-v1.json`
- Activation prerequisite gap matrix: `fixtures/private/usdc-void-buy-pool-automatic-payment-activation-prerequisite-gap-matrix-hold-v1.json`
- Operator activation packet: `fixtures/private/usdc-void-buy-pool-automatic-payment-operator-activation-packet-hold-v1.json`
- Fulfillment wallet policy: `fixtures/private/usdc-void-buy-pool-automatic-payment-fulfillment-wallet-policy-hold-v1.json`
- Public buyer evidence index: `public/public-node/usdc-void-buy-pool/automatic-payment-canary-separate-terminal-closeout-public-buyer-evidence-index-v1.json`
- Pool index: `public/public-node/usdc-void-buy-pool/index.json`

## Boundary

- Private/operator-only.
- Activation intent recorded: true.
- Activation scope: candidate gate only.
- Verified payment decisioning candidate: true.
- Public mutation route created: false.
- Automatic fulfillment enabled: false.
- Wallet fulfillment enabled: false.
- Signer access granted: false.
- Terminal execute authorized: false.
- Actual execute authorized: false.
- Execution performed: false.
- Signing performed: false.
- VOID transfer performed: false.
- Transaction broadcast: false.
- Fulfilled state written: false.

## Next required gate

`activation_candidate_preflight_execution_plan_v1`
