# DataNet Public Discovery Onboarding Runtime Visibility Hold v1

Marker: `VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_RUNTIME_VISIBILITY_HOLD_V1`

## What changed

This brick publishes a runtime visibility hold card for the DataNet public discovery onboarding card:

- `/public-node/datanet/datanet-public-discovery-onboarding-runtime-visibility-hold-v1.json`

It verifies the static source card path:

- `/public-node/datanet/datanet-public-discovery-onboarding-card-hold-v1.html`

## Boundary

This is visibility-check-only.

Runtime fetch is optional.

Static HTML and JSON presence are required.

It does not enable public intake.

It does not enable upload or object write.

It does not enable mirror commands.

It does not enable peer pin commands.

It does not enable WC claim, issuance, ledger write, or settlement.

It does not access a wallet or signer.

It does not enable a runtime mutation route or mutation handler.

Expected proof result:

`VOID_DATANET_PUBLIC_DISCOVERY_ONBOARDING_RUNTIME_VISIBILITY_HOLD_V1_GREEN`
