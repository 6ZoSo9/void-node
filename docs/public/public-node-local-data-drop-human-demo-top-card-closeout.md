# Public Node Local Data Drop Human Demo Top Card Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_CLOSEOUT_V1`

## What closed

The Public Node page now shows the Local Data Drop human demo before the older Node intelligence metrics.

This fixes the confusing first impression where the page loaded successfully but the first visible metric cards showed `--`.

## Live UI

Top card:

- `publicNodeLocalDataDropHumanDemoTopCard`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_UI_V1`

Top status:

- `publicNodeLocalDataDropHumanDemoTopStatus`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_STATUS_UI_V1`

Jump links:

- `publicNodeLocalDataDropHumanDemoWeightedJump`
- `publicNodeLocalDataDropHumanDemoBrowserJump`
- `publicNodeLocalDataDropHumanDemoImportJump`

## Live behavior

The top card fetches:

- `/public-node/local-data-drop/weighted.json`

It reports the live weighted local object count and links users directly to:

- `#publicNodeLocalDataDropWeightedCard`
- `#publicNodeLocalDataDropObjectBrowserCard`
- `#publicNodeLocalDataDropImportOwnDataCard`

## Checkpoints

Source:

- commit `fc24cc59`
- tag `ckpt-public-node-local-data-drop-human-demo-top-card-source-green-20260612-081610`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_SOURCE_V1_GREEN`

Live:

- commit `379ca487`
- tag `ckpt-public-node-local-data-drop-human-demo-top-card-live-green-20260612-081923`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_HUMAN_DEMO_TOP_CARD_V1_GREEN`

## Why this matters

The public node now opens with the storage demo visible immediately.

A tester no longer has to scroll past older `--` intelligence panels to discover the real local storage proof flow.
