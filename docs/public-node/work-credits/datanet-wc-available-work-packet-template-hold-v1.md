# DataNet WC Available Work Packet Template Hold v1

Marker: `VOID_DATANET_WC_AVAILABLE_WORK_PACKET_TEMPLATE_HOLD_V1`

## What changed

This brick publishes a public template for the future DataNet Work Credits available-work packet shape:

- `/public-node/work-credits/datanet-wc-available-work-packet-template-hold-v1.json`

It also adds that template to the public Work Credits discovery index:

- `/public-node/work-credits/index.json`

## Purpose

The public Work Credits index now has a concrete template for what a future DataNet availability work packet can look like.

This is the next layer after the Work Credits public index: discovery now points to a packet shape, not just a status card.

## Boundary

This is template-only.

It does not enable live earning.

It does not create a public submission endpoint.

It does not issue Work Credits.

It does not approve Work Credits.

It does not create a ledger line.

It does not append to a Work Credits ledger.

It does not allocate or transfer VOID.

It does not handle USDC.

It does not activate USDC autofulfillment.

It does not expose private DataNet object material.

It does not expose participant, reviewer, or operator identifiers.

It does not access wallets or signers.

It does not create a runtime route.

It does not activate a mutation handler.

## Result

The DataNet Work Credits earn lane now has a public, review-safe available-work packet template while all earning, issuance, ledger, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
