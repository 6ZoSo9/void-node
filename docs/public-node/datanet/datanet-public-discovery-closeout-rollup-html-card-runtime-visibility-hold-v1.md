# DataNet Public Discovery Closeout Rollup HTML Card Runtime Visibility Hold v1

Marker: `VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1`

## What changed

This brick publishes runtime visibility hold metadata for the browser-visible DataNet public discovery closeout rollup HTML card:

- `/public-node/datanet/datanet-public-discovery-closeout-rollup-html-card-runtime-visibility-hold-v1.json`

It checks the static HTML card:

- `/public-node/datanet/datanet-public-discovery-closeout-rollup-html-card-hold-v1.html`

And binds to the closeout rollup JSON:

- `/public-node/datanet/datanet-public-discovery-closeout-rollup-hold-v1.json`

## Boundary

Visibility-check-only. Runtime fetch is optional.

No public intake, upload/object write, mirror command, peer pin command, WC claim/issuance/ledger write/settlement, wallet/signer access, runtime mutation route, or mutation handler is enabled.

Expected proof result:

`VOID_DATANET_PUBLIC_DISCOVERY_CLOSEOUT_ROLLUP_HTML_CARD_RUNTIME_VISIBILITY_HOLD_V1_GREEN`
