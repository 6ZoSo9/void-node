# Public Node Weighted Local Data Drop Status Card Closeout v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_CARD_CLOSEOUT_V1`

## What closed

The Public Node page now exposes a human-visible live status for Weighted Local Data Drop.

The page card includes:

- card id `publicNodeLocalDataDropWeightedCard`
- status element id `publicNodeLocalDataDropWeightedStatus`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_UI_V1`
- route fetch `/public-node/local-data-drop/weighted.json`
- live copy pattern: `Status: N weighted local object(s) live on this node.`

## Current live state

The node currently has one real local public object:

- object id `void-weighted-seed-v1.txt`
- SHA-256 `0b3b3284a47dd583f209008a9088c682c82af4609ee3dce222176b9617526a2d`

The weighted route reports:

- `object_count=1`
- `weighted_records_len=1`

The Public Node page includes the status card source and browser-side fetch wiring.

## Checkpoints

Source checkpoint:

- commit `b6bf0519`
- tag `ckpt-public-node-local-data-drop-weighted-status-card-source-green-20260612-004024`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_CARD_SOURCE_V1_GREEN`

Live checkpoint:

- commit `2211923e`
- tag `ckpt-public-node-local-data-drop-weighted-status-card-live-green-20260612-004627`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_STATUS_CARD_V1_GREEN`

One-object storage-to-weighting closeout:

- commit `9794551d`
- tag `ckpt-public-node-local-data-drop-weighted-one-object-closeout-green-20260612-003609`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_ONE_OBJECT_CLOSEOUT_V1_GREEN`

## Why this matters

The storage-to-weighting loop is now visible to humans, not only agents.

A tester can open `/public-node` and see that this node is carrying weighted local public data without manually reading JSON.
