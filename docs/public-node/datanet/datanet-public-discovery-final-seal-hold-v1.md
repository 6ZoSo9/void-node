# DataNet Public Discovery Final Seal Hold v1

Marker: `VOID_DATANET_PUBLIC_DISCOVERY_FINAL_SEAL_HOLD_V1`

## What changed

This brick publishes a final read-only seal for the rooted DataNet public discovery surface:

- `/public-node/datanet/datanet-public-discovery-final-seal-hold-v1.json`

It binds together:

- Root public-node route: `/public-node/index.json`
- DataNet public-node index: `/public-node/datanet/index.json`
- DataNet onboarding card HTML
- DataNet onboarding card JSON
- DataNet runtime visibility JSON

## Boundary

This is a final discovery seal only.

It does not enable public intake.

It does not enable upload or object write.

It does not enable mirror commands.

It does not enable peer pin commands.

It does not enable WC claim, issuance, ledger write, or settlement.

It does not access a wallet or signer.

It does not enable a runtime mutation route or mutation handler.

Expected proof result:

`VOID_DATANET_PUBLIC_DISCOVERY_FINAL_SEAL_HOLD_V1_GREEN`
