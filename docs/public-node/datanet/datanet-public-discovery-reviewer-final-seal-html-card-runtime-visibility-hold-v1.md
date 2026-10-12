# DataNet Public Discovery Reviewer Final Seal HTML Card Runtime Visibility Hold v1

Marker: `VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1`

## What changed

This brick publishes runtime visibility hold metadata for the browser-visible DataNet public discovery reviewer final seal HTML card:

- `/public-node/datanet/datanet-public-discovery-reviewer-final-seal-html-card-runtime-visibility-hold-v1.json`

It checks the static HTML card:

- `/public-node/datanet/datanet-public-discovery-reviewer-final-seal-html-card-hold-v1.html`

And binds to the final seal JSON:

- `/public-node/datanet/datanet-public-discovery-reviewer-final-seal-hold-v1.json`

## Boundary

This is visibility-check-only.

Runtime fetch is optional.

Static HTML, card JSON, and final seal JSON presence are required.

It does not enable public intake.

It does not enable upload or object write.

It does not enable mirror commands.

It does not enable peer pin commands.

It does not enable WC claim, issuance, ledger write, or settlement.

It does not access a wallet or signer.

It does not enable a runtime mutation route or mutation handler.

Expected proof result:

`VOID_DATANET_PUBLIC_DISCOVERY_REVIEWER_FINAL_SEAL_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN`
