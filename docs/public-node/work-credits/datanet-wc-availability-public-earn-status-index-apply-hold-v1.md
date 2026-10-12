# DataNet WC Availability Public Earn Status Index Apply Hold v1

Marker: `VOID_DATANET_WC_AVAILABILITY_PUBLIC_EARN_STATUS_INDEX_APPLY_HOLD_V1`

## What changed

This brick creates the public Work Credits discovery index:

- `/public-node/work-credits/index.json`

The index points to the existing DataNet Work Credits availability earn-status card:

- `/public-node/work-credits/datanet-wc-availability/earn-status-card-v1.json`

It also publishes this apply-hold seal:

- `/public-node/work-credits/datanet-wc-availability-public-earn-status-index-apply-hold-v1.json`

## Boundary

This is a public discovery/status mutation only.

It does not enable live earning.

It does not issue Work Credits.

It does not write the Work Credits ledger.

It does not append a ledger line.

It does not allocate VOID.

It does not transfer VOID.

It does not handle USDC.

It does not activate USDC autofulfillment.

It does not access wallets or signers.

It does not expose an operator execution path.

It does not create a runtime mutation route.

## Result

The DataNet Work Credits availability lane is now discoverable from the public Work Credits index while every earn, issuance, ledger, allocation, wallet, signer, payment, autofulfillment, and execution path remains held.
