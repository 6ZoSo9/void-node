# DataNet Public Discovery Closeout Rollup Hold v1

Marker: `VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1`

## What changed

This brick publishes a reviewer-facing closeout rollup for rooted DataNet public discovery:

- `/public-node/datanet/datanet-public-discovery-closeout-rollup-hold-v1.json`

It binds:

- Root public-node DataNet route
- DataNet public-node index
- Onboarding HTML card
- Onboarding runtime visibility metadata
- Final seal JSON
- Final seal HTML card
- Final seal HTML runtime visibility metadata

## Boundary

This is a closeout rollup only.

It does not enable public intake.

It does not enable upload or object write.

It does not enable mirror commands.

It does not enable peer pin commands.

It does not enable WC claim, issuance, ledger write, or settlement.

It does not access a wallet or signer.

It does not enable a runtime mutation route or mutation handler.

Expected proof result:

`VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HOLD_V1_GREEN`
