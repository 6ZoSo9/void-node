# Root Public Node DataNet Discovery Index Link Hold v1

Marker: `VOID_ROOT_PUBLIC_NODE_DATANET_DISCOVERY_INDEX_LINK_HOLD_V1`

## What changed

This brick links the dedicated DataNet public discovery index from the root public-node index.

Root index:

- `/public-node/index.json`

Added route:

- `/public-node/datanet/index.json`

## Boundary

This is a root-index discovery link only.

It does not enable public intake.

It does not enable upload or object write.

It does not enable mirror commands.

It does not enable peer pin commands.

It does not enable WC claim, issuance, ledger write, or settlement.

It does not access a wallet or signer.

It does not enable a runtime mutation route or mutation handler.

Expected proof result:

`VOID_ROOT_PUBLIC_NODE_DATANET_DISCOVERY_INDEX_LINK_HOLD_V1_GREEN`

## Linked sealed discovery card

- DataNet WC ledger append closeout public discovery card: `docs/datanet/datanet-wc-ledger-append-closeout-public-discovery-card-hold-v1.md`
- Discovery card marker: `VOID_DATANET_WC_LEDGER_APPEND_CLOSEOUT_PUBLIC_DISCOVERY_CARD_HOLD_V1_GREEN`

This link is discovery/index visibility only. It does not create or authorize operator decisions, signatures, approval execution, canonical ledger append, WC issuance, WC claim, wallet transfer, or mutation authority.
