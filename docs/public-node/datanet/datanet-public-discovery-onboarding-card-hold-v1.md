# DataNet Public Discovery Onboarding Card Hold v1

Marker: `VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_CARD_HOLD_V1`

## What changed

This brick creates a dedicated public-node DataNet discovery directory:

- `/public-node/datanet/index.json`

It also publishes a browser-visible static onboarding card:

- `/public-node/datanet/datanet-public-discovery-onboarding-card-hold-v1.html`

And JSON metadata:

- `/public-node/datanet/datanet-public-discovery-onboarding-card-hold-v1.json`

## Boundary

This is static public discovery/onboarding only.

It does not enable public intake.

It does not enable upload or object write.

It does not enable mirror commands.

It does not enable peer pin commands.

It does not enable WC claim, issuance, ledger write, or settlement.

It does not access a wallet or signer.

It does not enable a runtime mutation route or mutation handler.

Expected proof result:

`VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_CARD_HOLD_V1_GREEN`
