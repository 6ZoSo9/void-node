# DataNet WC Available Work Packet Example Hold v1

Marker: `VOID_DATANET_WC_AVAILABLE_WORK_PACKET_EXAMPLE_HOLD_V1`

## What changed

This brick publishes a public-safe example packet for the DataNet Work Credits available-work packet template:

- `/public-node/work-credits/datanet-wc-available-work-packet-example-hold-v1.json`

It also indexes the example from:

- `/public-node/work-credits/index.json`

## Purpose

The Work Credits lane now has:

1. a public index,
2. a DataNet availability status card,
3. a packet template,
4. a public-safe example packet.

That makes the future earn/review lane understandable without activating it.

## Boundary

This is example-only.

It does not submit work.

It does not create a public submission endpoint.

It does not enable live earning.

It does not perform WC issuance.

It does not approve Work Credits.

It does not create or append a Work Credits ledger line.

It does not allocate or transfer VOID.

It does not handle USDC.

It does not activate USDC autofulfillment.

It does not expose private DataNet object material.

It does not expose participant, reviewer, or operator identifiers.

It does not access wallets or signers.

It does not create a runtime route.

It does not activate a mutation handler.

## Result

The DataNet Work Credits lane now includes a public-safe example work packet while all submission, earning, issuance, review approval, ledger, allocation, payment, signer, wallet, runtime, and mutation paths remain held.
