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
